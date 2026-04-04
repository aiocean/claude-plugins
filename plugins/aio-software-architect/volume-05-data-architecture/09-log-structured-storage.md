# Log-Structured Storage — LSM Trees and SSTables

> "Log-structured storage engines are based on a simple idea: rather than updating existing data in place, always append new data to a log. The log is the truth; data structures are just efficient indexes into the log." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

Imagine you are building a storage engine. Your constraint is simple: make writes as fast as possible. You have users generating millions of writes per second — sensor readings, log entries, financial ticks — and you cannot afford to slow down for anything.

The naive approach is to update records in place: find the location of the record on disk, seek to it, and overwrite it. This works on a single machine where disk seeks are the bottleneck. But a random write to an SSD or HDD requires:
1. Finding the page that contains the record (one or more disk seeks or page cache misses)
2. Reading the page into memory (if not already cached)
3. Modifying the record in memory
4. Writing the page back to disk (one write, but to a random location)

On an SSD, random writes are slower than sequential writes by a factor of 3-10x. On an HDD, the mechanical seek adds 4-10ms of latency per operation, making random writes 100-1000x slower than sequential writes. For a workload that does millions of writes per second, this difference is the gap between a system that works and one that doesn't.

Log-Structured Merge-Trees (LSM trees) solve this by converting all writes into sequential writes — the fastest operation any storage medium can perform. Every write is an append to an in-memory buffer (the memtable) that is periodically flushed to disk as an immutable sorted file (an SSTable). No random writes ever occur. The cost is paid on reads — which may need to check multiple SSTables — and during background compaction — which merges SSTables to reclaim space and maintain read performance.

Understanding LSM trees is not academic. They are the storage engine behind Cassandra, RocksDB, LevelDB, HBase, ScyllaDB, and dozens of other databases. If you use any of these systems, you are using LSM trees, and understanding how they work explains the performance characteristics you observe in production.

## Core Concept

### The Append-Only Log — Starting Simple

Before LSM trees, consider the simplest possible "database": an append-only log file.

```
log.db:
  key=user_1, value={"name": "Alice", "email": "alice@example.com"}
  key=user_2, value={"name": "Bob", "email": "bob@example.com"}
  key=user_1, value={"name": "Alice", "email": "alice@corp.com"}  <- update
  key=user_3, value={"name": "Carol", "email": "carol@example.com"}
  key=user_2, value=TOMBSTONE  <- delete
```

Writes are blazing fast — you just append to the end of the file. But reads are terrible — to find the current value of `user_1`, you must scan the entire log from beginning to end and take the last entry for that key. For a log with billions of entries, this is unacceptable.

The solution to read performance is an **index**: a separate data structure that maps each key to the byte offset of its most recent entry in the log. With a hash index:

```python
index = {
    "user_1": 120,    # byte offset of last entry
    "user_3": 250,
}
# user_2 is deleted (no entry in index)
```

Now reads are O(1): look up the key in the hash index, get the byte offset, seek to that position in the file, read the entry. But this approach has two problems: the hash index must fit in memory (it maps every key), and range queries ("all users with ID between 100 and 200") are impossible with a hash index.

### SSTables — Sorted String Tables

The key innovation of LSM trees is replacing the unsorted append-only log with **SSTables** (Sorted String Tables). An SSTable is an immutable file where key-value pairs are stored in sorted order by key.

```
SSTable file (binary, sorted by key):
  key=product_001, value={...}
  key=product_002, value={...}
  key=product_003, value=TOMBSTONE
  key=product_007, value={...}
  key=user_001,    value={...}
  key=user_002,    value={...}
  ...

Sparse index (in memory, one entry per block):
  key=product_001 -> offset=0
  key=user_001    -> offset=1048576
```

Because the SSTable is sorted, you only need a **sparse index** in memory — one entry per data block (typically 4KB-64KB). To find `product_005`, you look up the sparse index to find the block containing keys in the `product_004`-`product_007` range, read that block, and binary-search within it. The in-memory index is much smaller than a full key-to-offset map.

Sorted order also enables efficient range scans: to find all keys between `product_001` and `product_099`, find the starting block using the sparse index and scan forward until you pass `product_099`.

**Writing SSTables:** You cannot directly append to an SSTable — it would break the sorted order. Instead, you write to a **memtable** (an in-memory sorted tree, typically a red-black tree or skip list) and flush it to an SSTable when it reaches a size threshold.

### The Full LSM Tree Architecture

```
Write path:
  Write(key, value)
    -> WAL (Write-Ahead Log, for crash recovery)
    -> Memtable (in-memory sorted tree)
    
  When memtable size > threshold (e.g., 64MB):
    Flush memtable to disk as a new SSTable (immutable, sorted)
    Clear memtable

Disk layout (newest to oldest):
  Level 0:  SST_12.sst  SST_11.sst  SST_10.sst  (recently flushed, may overlap)
  Level 1:  SST_09.sst  SST_08.sst  SST_07.sst  (compacted, no overlap within level)
  Level 2:  SST_06.sst  ...                      (larger, fewer files)
  ...

Read path:
  Read(key)
    -> Check memtable (most recent writes)
    -> Check L0 SSTables (newest first, use bloom filter to skip)
    -> Check L1 SSTables (use sparse index to find block)
    -> Check L2 SSTables...
    -> Return first found value (or "not found" if tombstone or absent)
```

The **Write-Ahead Log (WAL)** ensures durability: before writing to the memtable, the operation is appended to the WAL. If the process crashes before the memtable is flushed, the WAL is replayed on restart to recover the memtable contents.

### Compaction — The Background Maintenance Process

Without compaction, the number of SSTables grows unboundedly, and reads become slower as they must check more and more files. Compaction merges SSTables, removing obsolete entries (superseded updates, deleted keys) and maintaining the sorted, non-overlapping structure.

Two major compaction strategies:

**Size-Tiered Compaction (used by Cassandra by default):**

Group SSTables of similar size into "tiers." When a tier accumulates N SSTables (typically 4), merge them into one larger SSTable and move it to the next tier.

```
Tier 0 (small, ~10MB):   [A][B][C][D] -> merge -> [ABCD]
Tier 1 (medium, ~40MB):  [ABCD][EFGH][IJKL][MNOP] -> merge -> [ABCDEFGHIJKLMNOP]
Tier 2 (large, ~160MB):  [ABCDEFGHIJKLMNOP][...] -> merge -> ...
```

Size-tiered compaction has high write amplification (bytes written to disk / bytes written by user) for individual SSTables — each byte may be rewritten O(log N) times as it moves through tiers. It also has high space amplification — during a merge, you need both the input and output SSTables on disk simultaneously, temporarily doubling space usage.

**Leveled Compaction (used by LevelDB, RocksDB, Cassandra with compaction strategy configured):**

Maintain strict levels with size limits. Within a level, all SSTables are non-overlapping and together cover the entire key space. When a level exceeds its size limit, one SSTable is selected and merged with the overlapping SSTables in the next level.

```
Level 0 (any overlap, recently flushed):
  [user_1..user_500] [user_200..user_700]  <- overlap! triggers compaction

Level 1 (10MB limit, no overlap):
  [product_1..product_100]  [product_101..product_500]  [user_1..user_300]  [user_301..user_700]

Level 2 (100MB limit, no overlap):
  ... 10x larger key ranges ...
```

Leveled compaction has lower read amplification (a key exists in at most one SSTable per level, so you check at most L SSTables for an L-level tree) but higher write amplification (each byte is rewritten when it is compacted from level i to level i+1, for each level, so O(L) rewrites per byte). For RocksDB with 7 levels, a single byte may be rewritten up to 7 times before reaching the deepest level.

### Bloom Filters — Avoiding Unnecessary Disk Reads

Every SSTable has a **Bloom filter** — a probabilistic data structure that can answer "definitely not present" or "maybe present" for any key. Before reading an SSTable to look for a key, you query its Bloom filter. If the filter says "definitely not present," you skip the SSTable entirely without any disk I/O.

Bloom filters have a false positive rate (they may say "maybe present" for a key that isn't actually there) but no false negatives. A well-tuned Bloom filter with 1% false positive rate uses approximately 10 bits per key — for a 100 million key SSTable, that's ~125MB of Bloom filter data kept in memory or in a fast cache. The trade-off is always worth it: avoiding even one unnecessary SSTable read saves milliseconds of disk I/O.

### Read and Write Amplification Trade-offs

LSM trees introduce three types of amplification:

**Write Amplification (WA):** Bytes written to disk / bytes written by application. In leveled compaction, WA is typically 10-30x. A 1 byte user write becomes 10-30 bytes of actual disk writes over the lifetime of that data as it's compacted through levels. High WA reduces SSD lifespan (SSD cells wear out with each write).

**Read Amplification (RA):** Disk reads required / logical reads. In size-tiered compaction, RA can be 10-50x (must check many SSTables for a point lookup). In leveled compaction, RA is much lower — at most L (number of levels) reads for the worst case, often just 1-2 with Bloom filters.

**Space Amplification (SA):** Disk used / logical data size. Due to stale data (obsolete entries waiting for compaction), SA is typically 1.1-2x. During compaction, temporarily 2x.

```
Compaction Strategy Comparison:

                  Write Amp  Read Amp  Space Amp  Best For
Size-Tiered:      Low        High      High       Write-heavy workloads
Leveled:          High       Low       Low        Read-heavy workloads  
FIFO:             Very Low   Very High High       Time-series, auto-expiry
```

RocksDB added **Universal Compaction** as a middle ground: it aims for balanced WA and RA by selecting compaction targets based on a cost model, rather than strictly following tier or level rules. This is the default for many RocksDB-based systems.

## Deep Dive

The foundational insight behind LSM trees — converting random writes to sequential writes by buffering in memory — appears repeatedly across the history of storage systems, each time rediscovered for a specific medium. Log-structured file systems (Rosenblum and Ousterhout, 1992) applied the same principle to the filesystem layer: rather than updating files in place, always write to the tail of a log. The O'Neil et al. LSM tree paper (1996) formalized the approach for database indexes and proved the write amplification reduction analytically. The Bigtable paper (2006) demonstrated the approach at production scale on Google's infrastructure, and LevelDB (2011) made it accessible as an embeddable library. The key thread connecting all these is the observation that sequential I/O is consistently 10–100x faster than random I/O on any storage medium — HDDs (no mechanical seek), SSDs (optimal for flash programming), and even NVMe (higher queue depth utilization for sequential workloads). LSM trees systematically convert writes into the fast case.

The SSTable format's two-layer structure — a sparse in-memory index plus dense sorted on-disk data — is a careful engineering trade-off between memory consumption and read amplification. A full index (one entry per key) would enable O(1) lookup but consumes memory proportional to the number of keys. A sparse index (one entry per data block, typically 4KB–64KB) enables O(log(blocks)) lookup within the block after a binary search on the sparse index. For a 1GB SSTable with 64KB blocks, the sparse index has approximately 16,000 entries — perhaps 512KB in memory. This is the classical time-space trade-off: the sparse index wastes some reads (you may read a partial block to find a key) in exchange for dramatically lower memory consumption. Bloom filters complement the sparse index by answering a different question: before touching the index or the disk at all, "is this key definitely absent?" A well-tuned Bloom filter with 10 bits per key has a 1% false positive rate, meaning 99% of absent-key lookups skip the SSTable entirely with no disk I/O.

Compaction strategies reveal the write-read amplification trade-off most clearly. Size-tiered compaction (Cassandra's default) groups SSTables of similar size and merges them when a tier accumulates enough files. A byte written by the application is rewritten once per tier merge — roughly O(log N) times for a dataset that grows to N tiers. This minimizes write amplification but produces many overlapping SSTables at each tier, so a point lookup must check potentially all SSTables in all tiers (mitigated by Bloom filters, but not eliminated). Leveled compaction (RocksDB's default) maintains non-overlapping SSTables within each level and compacts one SSTable at a time down to the next level. A point lookup in a leveled structure checks at most one SSTable per level (plus Level 0, which allows overlap). The cost: each byte is rewritten when it is compacted from level i to level i+1, for each level — O(L) rewrites per byte for an L-level tree, higher write amplification than size-tiered. The trade-off is explicit: leveled compaction pays more write amplification to achieve lower read amplification. The correct choice depends on the workload's read/write ratio.

The write-ahead log in an LSM tree serves the same function as in a B-tree database: it provides durability for writes that have been acknowledged to the client but not yet flushed from memory to durable SSTable files. The WAL is the bridge between the in-memory memtable (fast but volatile) and the on-disk SSTables (slow to write but durable). What makes the LSM WAL simpler than the B-tree WAL is that it need only survive until the corresponding memtable is flushed — once the SSTable is written, the WAL entries for those keys can be discarded. This creates a natural compaction lifecycle for the WAL itself: write, flush, discard. In contrast, the B-tree WAL must survive until the dirty pages it covers have been checkpointed to their on-disk locations, which may happen on a different schedule driven by buffer pool pressure rather than write volume.

RocksDB's evolution from LevelDB (Facebook's fork, 2012) illustrates the gap between a research prototype and a production storage engine. LevelDB was designed for embedded use in a single-threaded environment. RocksDB added concurrent compaction (multiple background threads), column families (multiple independent key spaces within one database), range deletions (efficient bulk delete without writing one tombstone per key), prefix iterators (efficient range scans on keys with a shared prefix), and rate limiting (preventing compaction from saturating I/O and starving user operations). These are not theoretical improvements — each addresses a specific failure mode observed in production. The column family design is particularly significant for stream processing: Flink and RocksDB-backed Kafka Streams use separate column families for different operator states, so that compaction for one operator's state does not affect another operator's read performance.

## Implementation Guide

**Building a simple LSM tree from scratch:**

```python
import os
import json
import struct
import bisect
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from sortedcontainers import SortedDict

TOMBSTONE = "__DELETED__"

@dataclass
class SSTableWriter:
    filepath: str
    _entries: List = field(default_factory=list)
    _index: Dict = field(default_factory=dict)

    def add(self, key: str, value: str):
        self._entries.append((key, value))

    def flush(self) -> 'SSTableReader':
        self._entries.sort(key=lambda x: x[0])
        with open(self.filepath, 'wb') as f:
            offset = 0
            block = []
            block_start_key = None

            for key, value in self._entries:
                if block_start_key is None:
                    block_start_key = key
                entry = json.dumps({'k': key, 'v': value}).encode() + b'\n'
                block.append(entry)

                if sum(len(e) for e in block) >= 4096:  # 4KB blocks
                    block_data = b''.join(block)
                    f.write(block_data)
                    self._index[block_start_key] = offset
                    offset += len(block_data)
                    block = []
                    block_start_key = None

            if block:
                block_data = b''.join(block)
                f.write(block_data)
                if block_start_key:
                    self._index[block_start_key] = offset

        index_path = self.filepath + '.index'
        with open(index_path, 'w') as f:
            json.dump(self._index, f)

        return SSTableReader(self.filepath, self._index)


class SSTableReader:
    def __init__(self, filepath: str, index: Dict = None):
        self.filepath = filepath
        if index is None:
            with open(filepath + '.index') as f:
                index = json.load(f)
        self.index = {k: v for k, v in index.items()}
        self.sorted_keys = sorted(self.index.keys())

    def get(self, key: str) -> Optional[str]:
        if not self.sorted_keys:
            return None
        # Find the largest index key <= search key
        pos = bisect.bisect_right(self.sorted_keys, key) - 1
        if pos < 0:
            return None
        block_start_key = self.sorted_keys[pos]
        offset = self.index[block_start_key]

        with open(self.filepath, 'rb') as f:
            f.seek(offset)
            # Read up to the next block
            next_block_offset = None
            for i in range(pos + 1, len(self.sorted_keys)):
                next_block_offset = self.index[self.sorted_keys[i]]
                break
            block_size = (next_block_offset - offset) if next_block_offset else 4096 * 2
            block_data = f.read(block_size)

        for line in block_data.split(b'\n'):
            if not line:
                continue
            entry = json.loads(line)
            if entry['k'] == key:
                return entry['v'] if entry['v'] != TOMBSTONE else None

        return None


class LSMTree:
    def __init__(self, data_dir: str, memtable_size_limit: int = 1000):
        self.data_dir = data_dir
        self.memtable_size_limit = memtable_size_limit
        self.memtable = SortedDict()
        self.sstables: List[SSTableReader] = []
        self.wal_path = os.path.join(data_dir, 'wal.log')
        os.makedirs(data_dir, exist_ok=True)
        self._recover_from_wal()

    def _recover_from_wal(self):
        if os.path.exists(self.wal_path):
            with open(self.wal_path) as f:
                for line in f:
                    entry = json.loads(line)
                    self.memtable[entry['key']] = entry['value']

    def put(self, key: str, value: str):
        # Write to WAL first (durability)
        with open(self.wal_path, 'a') as f:
            f.write(json.dumps({'key': key, 'value': value}) + '\n')
        self.memtable[key] = value
        if len(self.memtable) >= self.memtable_size_limit:
            self._flush_memtable()

    def delete(self, key: str):
        self.put(key, TOMBSTONE)

    def get(self, key: str) -> Optional[str]:
        # Check memtable first (most recent)
        if key in self.memtable:
            val = self.memtable[key]
            return None if val == TOMBSTONE else val
        # Check SSTables newest to oldest
        for sstable in reversed(self.sstables):
            val = sstable.get(key)
            if val is not None:
                return val
        return None

    def _flush_memtable(self):
        sstable_path = os.path.join(self.data_dir, f'sst_{len(self.sstables):06d}.sst')
        writer = SSTableWriter(sstable_path)
        for key, value in self.memtable.items():
            writer.add(key, value)
        reader = writer.flush()
        self.sstables.append(reader)
        self.memtable.clear()
        # Truncate WAL after successful flush
        open(self.wal_path, 'w').close()
```

**Tuning RocksDB for write-heavy workloads:**

```python
import rocksdb

def open_write_optimized_db(path: str):
    opts = rocksdb.Options()
    opts.create_if_missing = True

    # Larger memtable = fewer flushes = less write amplification
    opts.write_buffer_size = 256 * 1024 * 1024  # 256MB memtable

    # More memtables in memory before blocking writes
    opts.max_write_buffer_number = 4

    # Slow down writes at this many L0 SSTable files (backpressure)
    opts.level0_slowdown_writes_trigger = 20

    # Stop writes at this many L0 files (hard limit)
    opts.level0_stop_writes_trigger = 36

    # Use level compaction for read-heavy; size-tiered for write-heavy
    opts.compaction_style = rocksdb.CompressionType.no_compression

    # Bloom filter with 10 bits per key (1% false positive rate)
    table_opts = rocksdb.BlockBasedTableFactory(
        filter_policy=rocksdb.BloomFilterPolicy(10),
        block_cache=rocksdb.LRUCache(512 * 1024 * 1024),  # 512MB block cache
    )
    opts.table_factory = table_opts

    # Background compaction threads
    opts.max_background_jobs = 4

    return rocksdb.DB(path, opts)
```

## When to Use / When NOT to Use

**Use LSM-tree storage engines (Cassandra, RocksDB, HBase) when:**
- Write throughput is the primary concern (time-series data, logging, IoT sensor data)
- Data is written once and rarely updated (append-heavy workloads)
- You need to handle sustained high write rates that would overwhelm B-tree engines
- You're storing large amounts of data where write amplification is acceptable
- Range scans within a partition are important (SSTable's sorted structure supports this)

**Use B-tree storage engines (PostgreSQL, MySQL InnoDB) when:**
- Read performance is the primary concern
- Data is frequently updated in place (OLTP with many updates)
- You need complex transactions with strong isolation
- You need efficient random-access point reads
- Write amplification is a concern (SSD longevity, cloud storage cost)

**Size-tiered compaction:** Use for write-heavy workloads (Cassandra's default, optimized for time-series and event logging). Accepts higher read amplification in exchange for lower write amplification.

**Leveled compaction:** Use for read-heavy or mixed workloads (RocksDB's default). Lower read amplification at the cost of higher write amplification.

## Common Mistakes

**Mistake 1: Not monitoring compaction lag in Cassandra.**
If writes come in faster than compaction can keep up, the number of SSTables grows unboundedly. Reads degrade logarithmically as each read must check more SSTables. Monitor `CompactionPendingTasks` and `SSTableCount` per table. If SSTable count is growing consistently, your compaction throughput is insufficient — increase background compaction threads or reduce write rate.

**Mistake 2: Using Cassandra for update-heavy workloads without understanding tombstone accumulation.**
Every delete in Cassandra creates a tombstone — a marker that the key was deleted. Tombstones are cleaned up during compaction. If your workload deletes many records and compaction is slow, tombstone accumulation degrades read performance severely. Cassandra's `tombstone_warn_threshold` and `tombstone_failure_threshold` exist to detect this. Use TTLs (time-to-live) instead of explicit deletes for time-bounded data.

**Mistake 3: Not allocating sufficient block cache for RocksDB.**
RocksDB's block cache holds recently read SSTable blocks in memory. Without a sufficiently large block cache, every read requires a disk I/O to read the SSTable block. Rule of thumb: allocate 30-50% of available memory to the block cache. Monitor `rocksdb.block-cache-hit` and `rocksdb.block-cache-miss` metrics.

**Mistake 4: Choosing size-tiered compaction for a read-heavy workload.**
Size-tiered compaction can have read amplification of 50x or more — every read must check all SSTables in every tier. For a workload with more reads than writes, this is catastrophic. Switch to leveled compaction (or TWCS — Time Window Compaction Strategy — for time-series data) to reduce read amplification.

**Mistake 5: Ignoring the WAL in crash recovery planning.**
The WAL ensures that memtable contents are durable — if the process crashes, the WAL is replayed to recover the memtable. But the WAL only covers the current memtable. Data that has been flushed to SSTables but not yet compacted may not be included in your backup if you only back up SSTables. Back up both SSTables AND the WAL for a consistent, recoverable snapshot.

## Connections

- **B-Tree Storage (10-btree-storage.md):** The direct comparison. LSM is write-optimized; B-trees are read-optimized. Understanding both helps you choose the right storage engine for your workload.
- **Log-Structured Storage:** The WAL used by LSM trees is the same concept as the write-ahead log used by B-tree databases for crash recovery.
- **Replication (01-replication.md):** The replication log in databases like Cassandra is distinct from the WAL, but similarly append-only and ordered. Understanding LSM trees helps you understand Cassandra's replication mechanics.
- **Stream Processing (06-stream-processing.md):** RocksDB is the state backend for Kafka Streams and is supported in Apache Flink. Stream processors use RocksDB (an LSM tree) to maintain aggregation state.

## Key Insights

The most important insight about LSM trees is that **they convert random writes into sequential writes by buffering writes in memory and flushing them in bulk**. This is the same trick used by every fast storage system: database write-ahead logs, Kafka's log segments, file system journals. Sequential I/O is always faster than random I/O on both HDDs (no mechanical seek) and SSDs (optimal for flash programming). LSM trees systematically exploit this by never allowing random writes at all.

The second insight is the **read-write amplification trade-off**. You cannot minimize both simultaneously. Every byte written must eventually be read back during compaction; every compaction reduces read amplification but adds write amplification. Leveled compaction shifts the cost toward writes (more compaction work) to reduce read cost. Size-tiered shifts the cost toward reads (more SSTables to check) to reduce write cost. Your workload's read/write ratio determines which trade-off is correct.

The third insight is that **LSM trees are particularly well-suited for time-series data**. Time-series writes are naturally ordered by time, which means data within a time window lands in the same SSTable. Queries for a time range can be answered by reading a small number of SSTables. Cassandra's TWCS (Time Window Compaction Strategy) and RocksDB's FIFO compaction both optimize for this pattern: compact SSTables within a time window, and expire old windows wholesale rather than compacting them.

Finally, understand that **the choice of storage engine is a write-vs-read trade-off that compounds over the lifetime of the system**. Switching storage engines in production is a major migration — you're not just changing a configuration file, you're rewriting every byte of stored data. Make the choice once, make it based on your actual read/write ratio, and monitor the amplification metrics (compaction throughput, SSTable count, block cache hit rate) to validate that your choice remains correct as the workload evolves.
