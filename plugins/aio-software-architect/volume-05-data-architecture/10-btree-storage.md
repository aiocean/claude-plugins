# B-Tree Storage Engines

> "B-trees have been around since 1970 and have stood the test of time very well. They remain the standard index implementation in almost all relational databases, and many nonrelational databases use them too." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

In 1970, Rudolf Bayer and Edward McCreight at Boeing Research Labs faced a problem that would define database storage for the next fifty years: how do you efficiently store and retrieve sorted data from a disk where random access is expensive and pages are read in fixed-size blocks?

The constraint was physical. Disks of 1970 stored data on spinning platters. Reading data required moving a mechanical arm to the right track (seek time: 5-20ms) and waiting for the platter to rotate to the right position (rotational latency: 0-8ms). Once the arm was positioned, reading sequential data was fast — but every time you needed to jump to a different location on disk, you paid the full seek cost again.

The key insight Bayer and McCreight had was this: if you must pay a fixed cost to fetch a page from disk, make each page as useful as possible. Each page should hold many keys and pointers. The tree should be wide (large fan-out) and shallow (few levels), so that finding any key requires reading the minimum number of pages.

The B-tree they invented solved this so elegantly that it is still the dominant index structure in PostgreSQL, MySQL (InnoDB), SQLite, Oracle, SQL Server, and MongoDB. Five decades of relentless optimization have not found a better general-purpose index structure for disk-based, random-access workloads. Understanding how B-trees work — the page layout, the write-ahead log, the buffer pool, the trade-offs against LSM trees — is fundamental to understanding how nearly every major database works.

## Core Concept

### B-Tree Structure

A B-tree (specifically a B+ tree, which is what all database implementations use) is a balanced tree where:

- All data is stored in **leaf nodes** at the bottom level
- **Internal nodes** contain only keys and pointers to child nodes
- All leaves are at the same depth (the tree is always balanced)
- Each node corresponds to a fixed-size disk **page** (typically 4KB-16KB)
- Each node (except the root) contains between `t-1` and `2t-1` keys (where `t` is the minimum degree), ensuring high occupancy

```
B+ Tree (branching factor = 4, simplified):

Internal nodes (keys only, pointers to children):
                    [50 | 100]
                   /    |     \
          [20|35]    [60|80]   [120|150]
         /  |   \   /  |   \   /  |   \

Leaf nodes (keys + values, linked list for range scans):
[10|15|20] -> [25|30|35] -> [40|45|50] -> [55|60|65] -> ... (linked)
```

With a page size of 4KB and 8-byte keys + 8-byte pointers, an internal node can hold approximately 250 key-pointer pairs. A 4-level tree can hold 250^3 ≈ 15 million records while requiring at most 4 page reads to find any record. A 5-level tree can hold 4 billion records with at most 5 page reads.

This is the core advantage of B-trees: they provide **O(log N) point lookups with very low constants**, and the constants are bounded by the physical page size and disk I/O cost.

### Reading a Value — The Lookup Path

```
Find record with key = 75:

1. Read root page from disk (or buffer pool):
   Root: [50 | 100]  -> key 75 is between 50 and 100, follow middle pointer

2. Read internal page:
   [60|80]  -> key 75 is between 60 and 80, follow middle pointer

3. Read leaf page:
   [70|75|80] -> key 75 found! Return associated value.

Total disk reads: 3 (for a 3-level tree with millions of records)
```

In practice, the root page is almost always in the **buffer pool** (in-memory page cache) because it is accessed on every query. Internal nodes near the root are also frequently cached. Only leaf pages near the "cold" part of the key space require actual disk reads. For a well-tuned database with sufficient buffer pool memory, the effective number of disk reads per lookup is often 1 (just the leaf).

### Writing a Value — In-Place Updates

Unlike LSM trees, B-trees update data **in place**. Writing a new value for an existing key:

1. Navigate the tree to find the leaf page containing the key (exactly as for a read)
2. Modify the value in the leaf page in the buffer pool
3. Mark the page "dirty" — it will be written back to its original location on disk

Writing a new key that doesn't yet exist:

1. Navigate to the leaf page where the key should go
2. If the leaf has room, insert the key in sorted order and mark dirty
3. If the leaf is full, **split the page**: create a new page, move half the keys to it, and insert the new middle key into the parent page
4. If the parent is also full, split the parent too (this can cascade up to the root)

```
Before insert of key 45:
Leaf: [40 | 50 | 60 | 70]  <- full (4 keys, max = 4)

After split:
Left leaf:  [40 | 45 | 50]
Right leaf: [60 | 70]
Parent gets new key 60 pointing to right leaf.
```

Page splits are the expensive part of B-tree writes: they require writing multiple pages and updating parent pages. But splits are infrequent — a leaf page of 4KB holding 100 records is only split once per 100 insertions into that page range. The amortized cost per insert is low.

### The Write-Ahead Log — Crash Recovery

B-tree page writes are not atomic at the disk level. Writing a 4KB page to an SSD involves multiple internal flash operations. If power fails mid-write, you can have a half-written page — a page that is neither the old state nor the new state. This is called a **torn write**, and it corrupts the database.

The solution is the **Write-Ahead Log (WAL)**, also called the redo log or transaction log:

1. Before modifying any page in the buffer pool, write a description of the change to the WAL — an append to a sequential log file.
2. The WAL entry is fsync'd to disk (guaranteed durable).
3. Now modify the page in the buffer pool.
4. The dirty page is written to its location on disk (possibly asynchronously).

If the database crashes after step 2 but before step 4, the dirty page in the buffer pool is lost. On restart, the database replays the WAL from the last checkpoint, reapplying all changes described in the log. This restores the database to a consistent state.

```
WAL sequence:
  LSN 1000: BEGIN transaction 42
  LSN 1001: UPDATE page 5, offset 128, old_value=X, new_value=Y
  LSN 1002: UPDATE page 7, offset 256, old_value=A, new_value=B
  LSN 1003: COMMIT transaction 42

Crash recovery:
  If crash after LSN 1003: replay LSN 1001 and 1002, commit transaction 42
  If crash before LSN 1003: do not apply LSN 1001 and 1002 (transaction not committed)
```

The WAL also serves a secondary purpose: **replication**. PostgreSQL's streaming replication sends the WAL stream to replicas, which replay it to stay in sync with the primary. MySQL's binary log is conceptually similar. Understanding the WAL as both a crash recovery mechanism and a replication stream is key to understanding how databases provide both durability and high availability.

### Buffer Pool Management

The buffer pool is the database's in-memory page cache — typically 25-75% of available RAM is allocated to it. All B-tree operations go through the buffer pool: pages are read into memory on first access and written back to disk when evicted or when a checkpoint occurs.

Buffer pool management involves:

**Page eviction policy:** When the buffer pool is full and a new page must be loaded, which existing page is evicted? The standard policy is LRU (Least Recently Used) with a "clock" approximation for efficiency. But naively LRU is problematic for sequential scans — reading a 100GB table sequentially evicts all hot pages from the buffer pool. Most databases use "clock-sweep" or "2Q" (a two-queue variant) to protect hot pages from sequential scan eviction.

**Dirty page flushing:** Dirty pages (modified but not yet written to disk) must be periodically flushed to make room for new pages and to advance the WAL checkpoint (so old WAL entries can be discarded). PostgreSQL's `bgwriter` and `checkpointer` processes handle this asynchronously to avoid stalling user queries.

**Latching:** Multiple threads may access the same page simultaneously. Modifying a page requires a write latch (exclusive lock on the page). Reading a page requires a read latch (shared lock). B-tree latching is complex — a split requires latching the child, then the parent, then potentially the grandparent. Deadlocks are prevented by always acquiring latches top-down.

### Copy-on-Write Variants — LMDB and Btrfs

A variation of B-tree storage avoids the WAL entirely using **copy-on-write (CoW)**:

Instead of modifying a page in place, create a new copy of the page with the modification, and update the parent page to point to the new copy. The parent must also be copied (since it changed), which cascades up to the root. After the write, atomically swap the root pointer to point to the new root.

```
Original tree root: R1 -> [internal pages] -> [leaf pages]

Write: copy and modify leaf L -> L'
       copy and modify its parent P -> P'
       copy and modify root R1 -> R2 (points to P' instead of P)

Atomic root swap: database root pointer = R2

Old pages (R1, P, L) are still readable by concurrent readers — no lock needed.
They are freed after all readers using them have finished.
```

LMDB (Lightning Memory-Mapped Database), used in OpenLDAP and various embedded applications, uses CoW B-trees. The advantage: no WAL, no buffer pool management, excellent read concurrency (readers never block writers, writers never block readers). The disadvantage: writes are slower (must copy and rewrite entire path from leaf to root) and only one writer can run at a time.

## Deep Dive

The B-tree paper (Bayer and McCreight, 1970) was motivated by a physical constraint that shapes everything about the data structure's design: disk pages are read and written in fixed-size blocks, and each block access has a fixed overhead (the seek time or, for SSDs, the per-operation latency floor). The optimization target is therefore to minimize the number of block accesses per operation, not the total bytes read. A binary search tree minimizes comparisons but not block accesses — a tree with N nodes has O(log₂ N) height, meaning O(log₂ N) block accesses if each node is a block. A B-tree with branching factor k has O(logₖ N) height. With a 4KB page storing 250 key-pointer pairs, a 4-level B-tree can index 250³ ≈ 15 million records with at most 4 block accesses. The branching factor is the key insight: make each page as useful as possible by packing it with keys and pointers.

MVCC (Multi-Version Concurrency Control) is the mechanism that makes PostgreSQL's B-tree support concurrent readers and writers without read-write locks at the row level. Rather than overwriting a row, PostgreSQL stores multiple versions: the old version remains readable to transactions that started before the update, and the new version is visible only to transactions that started after it committed. Each row version carries `xmin` (the transaction ID that created it) and `xmax` (the transaction ID that deleted or superseded it). A transaction with ID T sees all rows where `xmin ≤ T` and (`xmax` is null or `xmax > T`). This means reads never block writes and writes never block reads — two operations that would conflict in a lock-based system proceed concurrently. The cost is space: dead row versions accumulate until `VACUUM` removes them. The VACUUM process is not optional maintenance — without it, tables grow with dead tuples, the buffer pool fills with stale pages, and query performance degrades. This is why MVCC databases have mandatory background cleanup that lock-based databases do not require.

The write-ahead log's role in B-tree crash recovery is more subtle than "log before write." The WAL must be written and fsynced to disk before the corresponding dirty page is written to its on-disk location. If a dirty page is written before its WAL entry (a condition called a "torn write" or "steal without force"), and the system crashes between the page write and the WAL entry, the page contains a change that the WAL cannot undo — a corrupted state. This ordering constraint (WAL entry must precede page write) is enforced by the page's LSN (Log Sequence Number): before writing a dirty page, the database confirms that the WAL has been flushed at least through the LSN of the last change to that page. PostgreSQL's `pg_flushes_buffers()`, InnoDB's `innodb_flush_log_at_trx_commit`, and SQL Server's write-ahead logging all implement this invariant. The WAL is not just a log — it is the durability contract.

The buffer pool is the most important performance parameter in any B-tree database, and the intuition behind its importance is straightforward: if all frequently accessed pages fit in memory, a B-tree database operates like an in-memory database with persistence as a background concern. The working set for most OLTP workloads is much smaller than the total data size: indexes for hot tables, recently accessed rows, and the upper levels of all B-trees (which are accessed on every query and thus are nearly always in the buffer pool). PostgreSQL's `shared_buffers` parameter controls the buffer pool size; the standard recommendation is 25–40% of available RAM, with the OS page cache handling additional caching. The buffer pool hit rate (`blks_hit / (blks_hit + blks_read)`) is the key metric: below 99% on an OLTP workload indicates that the buffer pool is undersized for the working set, and adding RAM will directly improve query latency.

Copy-on-write B-trees (implemented in LMDB and the btrfs filesystem) take a different approach to crash consistency: instead of a write-ahead log, modifications copy the affected page, update the copy, copy the parent (which now points to the new child), and propagate up to the root. The root pointer is updated atomically as the final step. Because the old pages are never overwritten, readers can continue using the old root (and old pages) without any locking — readers get a consistent snapshot of the tree as it existed when they started. The cost is that every write must copy the entire path from the modified leaf to the root: a write that modifies one leaf in a 4-level tree must copy 4 pages. For a write-heavy workload, this is significantly more expensive than in-place B-tree writes. For a read-heavy workload with many concurrent readers, the absence of read-write conflicts makes CoW B-trees attractive — this is why LMDB, which targets the embedded read-mostly use case, chose CoW over WAL.

## Implementation Guide

**Understanding PostgreSQL's buffer pool and checkpoint behavior:**

```sql
-- Check buffer pool hit rate (should be > 99% for OLTP)
SELECT
    sum(blks_hit) AS buffer_hits,
    sum(blks_read) AS disk_reads,
    round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) AS hit_rate_pct
FROM pg_stat_database
WHERE datname = current_database();

-- Check which tables have the lowest hit rates (candidates for more shared_buffers)
SELECT
    schemaname,
    tablename,
    heap_blks_hit,
    heap_blks_read,
    round(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) AS hit_rate
FROM pg_statio_user_tables
ORDER BY heap_blks_read DESC
LIMIT 20;

-- Check index usage (unused indexes waste buffer pool and slow writes)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

**Tuning B-tree performance in PostgreSQL:**

```sql
-- postgresql.conf settings for a write-heavy OLTP database (16GB RAM example)

-- Buffer pool: 25-40% of RAM
shared_buffers = 4GB

-- WAL settings: balance durability vs performance
wal_level = replica              -- Minimum for replication
synchronous_commit = on          -- Wait for WAL write before ACK (safe)
-- For higher throughput at slightly reduced durability:
-- synchronous_commit = off      -- 30ms risk window, 2-3x write throughput

-- Checkpoint settings: larger = fewer checkpoints = faster writes
max_wal_size = 4GB               -- WAL before forced checkpoint
checkpoint_completion_target = 0.9  -- Spread checkpoint writes over 90% of interval

-- For SSD storage (reduce fsync overhead with group commit)
wal_compression = on             -- Compress WAL for network and disk
```

**Monitoring B-tree index bloat:**

```sql
-- B-tree pages become bloated when rows are deleted (empty space not reclaimed)
-- VACUUM reclaims space but doesn't always return it to OS; VACUUM FULL does.
SELECT
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Estimate index bloat (requires pgstattuple extension)
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstattuple('my_index_name');
-- Look at dead_leaf_percent — above 30% warrants REINDEX
```

**Copy-on-write B-tree with LMDB (Python):**

```python
import lmdb

# LMDB: CoW B-tree, memory-mapped, single-writer/multiple-readers
env = lmdb.open('/tmp/mydb', map_size=10 * 1024 * 1024 * 1024)  # 10GB max

# Write transaction: CoW ensures durability without WAL
with env.begin(write=True) as txn:
    txn.put(b'user:1', b'{"name": "Alice"}')
    txn.put(b'user:2', b'{"name": "Bob"}')
    # If Python crashes here, neither write is visible (transaction not committed)
    # commit happens automatically when context manager exits without exception

# Read transaction: snapshot isolation, never blocks writers
with env.begin() as txn:
    value = txn.get(b'user:1')
    print(value)  # b'{"name": "Alice"}'

# Range scan: B+ tree leaf nodes are linked, enabling efficient range iteration
with env.begin() as txn:
    cursor = txn.cursor()
    cursor.set_range(b'user:')  # Seek to first key >= 'user:'
    for key, value in cursor.iternext_dup():
        if not key.startswith(b'user:'):
            break
        print(key, value)
```

## When to Use / When NOT to Use

**Use B-tree storage engines (PostgreSQL, MySQL InnoDB, SQLite) when:**
- Your workload is read-heavy (B-trees have lower read amplification than LSM trees)
- You need complex transactions with multiple operations on multiple rows
- You need SQL with complex joins, aggregations, and subqueries
- Your data is frequently updated in place (updates are efficient — modify one leaf page)
- You need strong consistency and ACID guarantees with serializability
- Your write rate is not extreme (under ~100K writes/second on a single node)

**Prefer LSM trees (Cassandra, RocksDB, HBase) when:**
- Write throughput is the dominant concern and exceeds B-tree capacity
- Data is mostly append-only (writes are rare updates, mostly new keys)
- You need to handle write bursts by absorbing them in the memtable
- SSD write amplification is a concern (B-trees have lower WA than LSM for random updates)
- You're doing time-series or log data ingestion at very high rates

**Prefer copy-on-write B-trees (LMDB) when:**
- Read concurrency is critical and you cannot afford read-write lock contention
- Embedded use case (single process, no network server)
- You need crash safety without the WAL overhead

## Common Mistakes

**Mistake 1: Setting shared_buffers too small.**
The most common PostgreSQL performance mistake. The default `shared_buffers = 128MB` is appropriate for a development laptop, not a production server. On a server with 32GB RAM, set `shared_buffers = 8GB`. The buffer pool hit rate (from `pg_stat_database`) should be above 99% for OLTP workloads. If it's below 95%, increase `shared_buffers` and measure again.

**Mistake 2: Not running VACUUM regularly on high-churn tables.**
PostgreSQL's MVCC (Multi-Version Concurrency Control) keeps old versions of rows for concurrent readers. VACUUM removes these dead rows and reclaims space in B-tree pages. Without regular VACUUM, tables and indexes grow with dead tuples, buffer pool hit rate drops, and queries slow down. Autovacuum handles this automatically for most tables, but heavy-churn tables (millions of updates/deletes per day) may need manual VACUUM ANALYZE.

**Mistake 3: Creating too many indexes on write-heavy tables.**
Every B-tree index on a table must be updated on every insert, update, and delete. A table with 10 indexes requires 10 index page updates per row write. For tables receiving millions of writes per day, index overhead is significant. Audit indexes with `pg_stat_user_indexes` — any index with `idx_scan = 0` after weeks of production traffic is unused and should be dropped.

**Mistake 4: Not understanding sequential vs random I/O patterns for B-trees.**
A full table scan (sequential read) is much faster than many random point lookups. PostgreSQL's query planner switches from index scan (random I/O, good for selective queries) to sequential scan (sequential I/O, good for large fraction of table) based on estimated selectivity. If your query plans are wrong (index scan when sequential would be better, or vice versa), run `ANALYZE` to update table statistics.

**Mistake 5: Using synchronous_commit = off without understanding the risk.**
`synchronous_commit = off` in PostgreSQL improves write throughput by not waiting for WAL to be flushed before acknowledging a transaction. In exchange, up to `wal_writer_delay` (default 200ms) of committed transactions can be lost if the server crashes. This is acceptable for many workloads (metrics, logs, recommendations) but catastrophic for financial data. Know your durability requirements before turning this off.

## Connections

- **Log-Structured Storage (09-log-structured-storage.md):** The direct comparison. B-trees are read-optimized with in-place updates; LSM trees are write-optimized with append-only writes. The WAL used by B-trees is conceptually similar to LSM trees' append-only log.
- **Transactions (14-transactions.md):** B-tree storage engines are the foundation for ACID transactions in relational databases. MVCC (Multi-Version Concurrency Control) builds on the B-tree page structure to provide snapshot isolation.
- **Replication (01-replication.md):** PostgreSQL's streaming replication sends the WAL stream to replicas. Understanding the WAL's role in B-tree crash recovery is prerequisite to understanding how replication works.
- **Derived Data (12-derived-data.md):** B-tree indexes are the canonical example of derived data — a secondary structure derived from the primary table data, maintained in sync by the storage engine.

## Key Insights

The most important insight about B-trees is that **they were designed for a world where disk seeks are expensive and page reads are the fundamental unit of I/O**. This design assumption remains valid for SSDs (random I/O is still more expensive than sequential I/O) and even for cloud storage (fetching a page from EBS or S3 has a fixed cost). The B-tree's high branching factor (hundreds of children per node) is the direct consequence of minimizing page reads, and it remains the right design.

The second insight is that **the buffer pool is the most important performance parameter in a B-tree database**. A hot database where frequently accessed pages fit in the buffer pool performs like an in-memory database — sub-millisecond queries, nearly zero disk I/O. The same database with an undersized buffer pool performs like a database from 1990 — every query requires multiple disk seeks. Allocating sufficient memory to the buffer pool is the highest-return optimization in B-tree databases.

The third insight is the **WAL's dual role: crash recovery and replication**. These are not coincidentally the same mechanism — they are the same mechanism because they solve the same problem: propagating a sequence of changes to a storage state (whether the local disk after a crash or a remote replica). Understanding the WAL as a change stream explains why database replication is fundamentally a streaming problem, and why CDC (Change Data Capture) reads the WAL.

Finally, B-trees' longevity reveals a deep truth: **simple, well-understood data structures tuned for physical storage characteristics beat clever alternatives in most cases**. Redis's skip lists, RocksDB's LSM trees, and LMDB's copy-on-write B-trees all outperform B-trees in their specific niches. But for the general OLTP workload — mixed reads and writes, SQL queries, transactions — the B-tree has not been beaten in 50 years of trying. When you choose PostgreSQL, you inherit five decades of B-tree optimization. That's worth something.
