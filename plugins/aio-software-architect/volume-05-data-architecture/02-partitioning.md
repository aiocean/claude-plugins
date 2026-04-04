# Partitioning — Hash, Range, and Secondary Indexes

> "The main reason for wanting to partition data is scalability. Different partitions can be placed on different nodes in a shared-nothing cluster. Thus, a large dataset can be distributed across many disks, and the query load can be distributed across many processors." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

There comes a point in every system's growth where a single machine simply cannot hold all the data. Not because hard drives aren't big enough — you can buy a server with 100TB of storage — but because the bottleneck isn't storage, it's throughput. A single disk can sustain roughly 100-200 MB/s of sequential reads. A single CPU can process a finite number of queries per second. A single network card has a maximum bandwidth. No amount of money spent on a bigger single machine changes these fundamental physical limits.

Consider a social media platform with 500 million users, each with a profile, a follower list, and a timeline. The user table alone might contain 50 billion rows when you include all historical data and audit records. Even with compression, this is multiple terabytes of data that must be scanned for certain queries. The follower graph contains hundreds of billions of edges. A single database server handling all of this would be running every disk and CPU at maximum capacity permanently.

Partitioning — also called sharding in many contexts — is the solution. You split the dataset into smaller subsets called partitions, and each partition lives on a separate node. A query that needs data from partition 3 goes only to the node holding partition 3. The work is distributed. But the moment you distribute data across multiple nodes, you introduce a cascade of problems: how do you decide which data goes to which partition? What happens when a partition gets too much traffic? How do you query data when the matching records might be scattered across dozens of partitions? These are the questions this article answers.

## Core Concept

### Key Range Partitioning

The simplest conceptual model: sort all your data by some key, then divide the sorted key space into contiguous ranges. Each range is a partition.

```
Key space: A ... Z (alphabetical by last name)

Partition 1: A - F  (Node 1)
Partition 2: G - L  (Node 2)
Partition 3: M - R  (Node 3)
Partition 4: S - Z  (Node 4)
```

The killer advantage of range partitioning is **efficient range scans**. If you want all users whose last name starts with "Kl" through "Kn", you go only to partition 2. No need to touch the other three nodes. For time-series data, this is particularly powerful: partition by timestamp, and a query for "all events between 2:00 PM and 3:00 PM yesterday" touches exactly the partitions covering that time window.

HBase, BigTable, and early versions of MongoDB use range partitioning. Within each partition, keys are stored in sorted order, allowing efficient range scans within the partition.

The danger is **hotspots**. If your data access pattern correlates with the key you're partitioning by, you'll get uneven load. Time-series data is the classic example: if you partition by timestamp, every write goes to the partition holding the current time — "today's" partition. All other partitions are idle while the current partition is hammered. This is called a "hot partition" or "hotspot."

The mitigation is to prefix the timestamp key with something that distributes the writes. For sensor data, you might use `(sensor_id, timestamp)` as the compound key, and partition by sensor_id range. Now writes for different sensors go to different partitions, even though they all have the same timestamp. But now a query for "all sensor readings between 2:00 PM and 3:00 PM" must query all partitions containing any sensor and then filter by timestamp — you've traded write distribution for read scatter.

### Hash Partitioning

Assign each key to a partition by computing a hash of the key and taking the result modulo the number of partitions.

```
partition = hash(key) % num_partitions

key="user_12345" -> hash=8a3f... -> 8a3f % 4 = 2 -> Partition 2
key="user_67890" -> hash=3d7c... -> 3d7c % 4 = 1 -> Partition 1
key="user_11111" -> hash=f2b1... -> f2b1 % 4 = 3 -> Partition 3
```

Hash partitioning distributes data uniformly across partitions (assuming a good hash function), eliminating hotspots for random-access workloads. Any key is equally likely to land on any partition.

The cost is **loss of ordering**. Adjacent keys in the hash space are not adjacent in the real-world key space. A range scan on "all users created between January and March" cannot be answered by scanning a single partition — it requires scanning all partitions. This is called a scatter-gather query and is typically much more expensive than a range scan.

Cassandra uses a clever hybrid called a **compound partition key**. The first column of the key is hashed to determine the partition. The remaining columns are used as a clustering key within the partition, stored in sorted order. This gives you hash-based distribution (no hotspots) for partition selection, and range-scan capability within a partition.

```
CREATE TABLE sensor_readings (
    sensor_id   UUID,      -- partition key (hashed)
    timestamp   TIMESTAMP, -- clustering key (sorted within partition)
    value       DOUBLE,
    PRIMARY KEY (sensor_id, timestamp)
);

-- This query is efficient: one partition, range scan within partition
SELECT * FROM sensor_readings
WHERE sensor_id = ?
  AND timestamp BETWEEN ? AND ?;

-- This query is expensive: scatter-gather across all partitions
SELECT * FROM sensor_readings
WHERE timestamp BETWEEN ? AND ?;
```

### Consistent Hashing

A problem with simple modulo hashing: if you add or remove a partition, almost every key needs to be remapped. If you go from 4 to 5 partitions, `hash(key) % 4` and `hash(key) % 5` give different results for most keys, requiring a massive data migration.

Consistent hashing (introduced by Karger et al. in 1997) solves this. Imagine the hash space arranged in a ring from 0 to 2^128. Each partition is assigned a position on the ring. Each key is mapped to the ring, and belongs to the first partition clockwise from it.

```
          0
        / | \
      /   |   \
P4  /     |     \ P1
   |      |      |
   |      |      |
P3  \     |     / P2
      \   |   /
        \ | /
         2^128
```

When you add a partition, it takes over responsibility for only the keys between its new position and the previous partition clockwise from it. Only those keys need to be moved. When you remove a partition, its keys are taken over by the next partition clockwise. On average, only `K/N` keys need to be moved when the number of partitions changes (K = total keys, N = number of partitions), compared to nearly all keys with simple modulo hashing.

DynamoDB and Cassandra both use variants of consistent hashing with **virtual nodes (vnodes)**. Rather than assigning each physical node one position on the ring, each node gets many positions (typically 100-200 virtual nodes). This makes the key distribution more uniform and makes adding/removing nodes more gradual — you move a few vnodes at a time.

### Secondary Indexes

Primary key partitioning handles lookups by the primary key efficiently. But most real-world queries don't look up by primary key — they filter by user_country, status, category, price range. This requires secondary indexes.

Secondary indexes and partitioning interact in two fundamentally different ways:

**Local secondary indexes (document-partitioned indexes):**

Each partition maintains its own secondary index, covering only the data in that partition.

```
Partition 1 (cars with id 1-100):
  Data: {id:1, color:red, make:Toyota}, {id:2, color:blue, make:Honda}, ...
  Local index on color:
    red -> [1, 5, 8, ...]
    blue -> [2, 6, 9, ...]

Partition 2 (cars with id 101-200):
  Data: {id:101, color:red, make:Ford}, {id:102, color:red, make:BMW}, ...
  Local index on color:
    red -> [101, 102, 107, ...]
    blue -> [103, 109, ...]
```

Writing is simple: you update the data and the local index on the same partition in a single operation. No cross-partition coordination needed.

But reading is expensive. A query for "all red cars" cannot be answered by any single partition — the red cars are scattered across all partitions. You must query all partitions in parallel (scatter), then merge the results (gather). This scatter-gather pattern adds latency proportional to the slowest partition's response time, not the average.

MongoDB, Cassandra, Riak, and Elasticsearch all use local secondary indexes by default.

**Global secondary indexes (term-partitioned indexes):**

A global secondary index is itself partitioned — but by the indexed term, not by the primary key.

```
Global index on color (partitioned by color term):
  Index Partition A (colors a-m):
    blue -> [partition_1: id 2,6,9; partition_2: id 103,109; ...]
    green -> [partition_1: id 3; partition_3: id 205, ...]

  Index Partition B (colors n-z):
    red -> [partition_1: id 1,5,8; partition_2: id 101,102,107; ...]
    white -> [partition_1: id 4; partition_3: id 201, ...]
```

Reading is now efficient for index lookups: a query for "all red cars" goes only to the index partition for "red" and finds all matching car IDs with their partition locations. No scatter-gather needed.

But writing is expensive. When you write a new red car to data partition 1, you must also update the global index partition that holds the "red" entry. These two partitions are on different nodes. If you want this update to be atomic (which you typically do), you need a distributed transaction. In practice, global secondary index updates are often asynchronous — you write the data, and the index update follows eventually. This means global indexes may lag behind the data.

DynamoDB supports global secondary indexes with asynchronous updates. Amazon's documentation explicitly states that global secondary indexes are eventually consistent with the base table.

## Deep Dive

Consistent hashing, introduced by Karger et al. in 1997 in the context of web caching, solved a specific and painful problem: when you add or remove a node from a cluster using simple modulo hashing, almost every key needs to be remapped. Going from 4 to 5 nodes changes `hash(key) % 4` to `hash(key) % 5`, producing a different result for roughly 80% of keys. The consistent hashing insight is to arrange the hash space as a ring and assign each node a position; a key belongs to the first node clockwise from it. Adding a node only displaces the keys between its new position and the previous clockwise neighbor — on average `K/N` keys move, where K is the total key count and N is the node count. This makes cluster membership changes cheap. The Dynamo paper (2007) refined this with virtual nodes: each physical node occupies multiple positions on the ring (typically 100–200), which smooths out the distribution and allows node heterogeneity — a more powerful machine can hold more virtual nodes and thus a proportionally larger share of the keyspace.

The hotspot problem is intrinsic to any partitioning scheme because it reflects the access pattern of the data, not a failure of the scheme. Kleppmann identifies three classes of hotspots. The first is time-series write concentration: if you partition by timestamp, all current writes land on the "now" partition while historical partitions sit idle. The fix is a compound key — `(entity_id, timestamp)` — that distributes writes across entities while preserving time-order within each entity's range. The second class is celebrity skew: a single key (a celebrity's user ID, a trending product's ID) receives orders of magnitude more traffic than average keys. No static partitioning scheme handles this; the mitigation is application-level fanout — replicating the hot key across many synthetic partition keys (e.g., `user_12345_0` through `user_12345_99`) and reading from all of them with aggregation. The third class is partition imbalance over time: data grows unevenly, and what was a balanced partition scheme at launch becomes severely unbalanced after two years of organic growth. Range-partitioned systems handle this better than hash-partitioned ones because they support surgical splits: a hot range can be bisected without affecting other ranges.

The secondary index problem in a distributed system has no free solution, and this is one of DDIA's sharpest observations. Local secondary indexes (document-partitioned, used by Cassandra and MongoDB by default) make writes cheap — the index lives on the same node as the data, so a single write updates both atomically. But reads that use the index must scatter to every partition and gather results, paying both the latency of the slowest partition and the coordination overhead of merging N result sets. Global secondary indexes (term-partitioned, used by DynamoDB's GSI feature) make reads efficient — a query goes to the single index partition covering the sought term. But writes become expensive: a write to the data partition must also update the index partition, which is on a different node, requiring either a distributed transaction (strong consistency) or an asynchronous update (eventual consistency). DynamoDB chose eventual consistency for GSIs explicitly, documenting that the index may lag behind the base table. This is not a bug — it is the honest acknowledgment that strong consistency for global secondary index updates requires coordination that would harm write throughput.

The Bigtable paper (2006) introduced a key insight about range partitioning that influenced an entire generation of distributed databases: the metadata about which range lives on which server is itself a hierarchical structure. Bigtable uses three levels — the root tablet (location hardcoded in Chubby), the METADATA table tablets, and the user data tablets. A client looking up a key walks this three-level hierarchy, caching results at each level. The critical observation is that the metadata at each level can itself be partitioned and replicated, so the lookup hierarchy scales independently of the data. This is the same insight behind B-tree internal nodes: you need an efficient index over your index. Any partitioned system beyond trivial scale requires thinking about how the partition metadata itself is stored, replicated, and kept consistent — a problem that most introductory treatments of sharding ignore entirely.

## Implementation Guide

**Designing partition keys — the most important decision:**

```python
# BAD: Partition by timestamp for time-series writes
# Every write goes to the "current time" partition — massive hotspot
CREATE TABLE events (
    event_time TIMESTAMP,  # BAD partition key for write-heavy workloads
    event_id   UUID,
    payload    JSONB
);

# BETTER: Partition by a high-cardinality identifier, use time as sort key
CREATE TABLE events (
    user_id    UUID,       # Good partition key: high cardinality, distributes writes
    event_time TIMESTAMP,  # Sort key: enables range scans per user
    event_id   UUID,
    payload    JSONB,
    PRIMARY KEY (user_id, event_time)
);
```

**Detecting and mitigating hotspots:**

```python
# Hot key detection: track request rates per partition key
from collections import defaultdict
import time

class HotKeyDetector:
    def __init__(self, window_seconds=60, hot_threshold=1000):
        self.window = window_seconds
        self.threshold = hot_threshold
        self.counts = defaultdict(list)

    def record_access(self, partition_key: str):
        now = time.time()
        self.counts[partition_key].append(now)
        # Clean old entries
        self.counts[partition_key] = [
            t for t in self.counts[partition_key]
            if now - t < self.window
        ]

    def get_hot_keys(self):
        return {
            key: len(times)
            for key, times in self.counts.items()
            if len(times) > self.threshold
        }

# Mitigation: add random suffix to distribute hot keys
import random

def write_with_hot_key_mitigation(db, hot_key: str, value: dict, fanout: int = 10):
    """Spread a hot key across multiple partitions by appending a random suffix."""
    suffix = random.randint(0, fanout - 1)
    partition_key = f"{hot_key}_{suffix}"
    db.put(partition_key, value)

def read_with_hot_key_mitigation(db, hot_key: str, fanout: int = 10):
    """Read from all suffixed partitions and merge results."""
    results = []
    for suffix in range(fanout):
        partition_key = f"{hot_key}_{suffix}"
        result = db.get(partition_key)
        if result:
            results.append(result)
    return merge_results(results)
```

**Implementing consistent hashing for a simple cache:**

```python
import hashlib
from bisect import bisect, insort

class ConsistentHashRing:
    def __init__(self, virtual_nodes=150):
        self.virtual_nodes = virtual_nodes
        self.ring = []       # sorted list of hash positions
        self.node_map = {}   # hash position -> node name

    def add_node(self, node: str):
        for i in range(self.virtual_nodes):
            key = f"{node}:{i}"
            h = int(hashlib.md5(key.encode()).hexdigest(), 16)
            insort(self.ring, h)
            self.node_map[h] = node

    def remove_node(self, node: str):
        for i in range(self.virtual_nodes):
            key = f"{node}:{i}"
            h = int(hashlib.md5(key.encode()).hexdigest(), 16)
            self.ring.remove(h)
            del self.node_map[h]

    def get_node(self, key: str) -> str:
        if not self.ring:
            raise Exception("No nodes in ring")
        h = int(hashlib.md5(key.encode()).hexdigest(), 16)
        # Find first position >= h (wrap around if past the end)
        idx = bisect(self.ring, h) % len(self.ring)
        return self.node_map[self.ring[idx]]
```

**Monitoring partition balance:**

```sql
-- PostgreSQL: check table size distribution across partitions
SELECT
    child.relname AS partition_name,
    pg_size_pretty(pg_relation_size(child.oid)) AS size,
    pg_relation_size(child.oid) AS size_bytes
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'your_partitioned_table'
ORDER BY size_bytes DESC;
```

## When to Use / When NOT to Use

**Range partitioning — use when:**
- Your primary access pattern is range scans (time-series, geospatial, alphabetical lookups)
- You have low-cardinality or naturally ordered data
- You need to co-locate related records (all events for a given day in one partition)

**Range partitioning — avoid when:**
- Your writes are heavily concentrated on a specific range (like the current timestamp)
- Your key distribution is highly skewed
- You need uniform distribution more than you need range scan efficiency

**Hash partitioning — use when:**
- You primarily do point lookups (lookup by exact key)
- Write distribution is more important than range scan capability
- You have high-cardinality keys (UUIDs, user IDs, random identifiers)
- You need to avoid hotspots

**Hash partitioning — avoid when:**
- Your workload is dominated by range scans
- You need to maintain sorted order for reporting queries
- You're building a system where data locality matters (all a user's data in one place)

**Local secondary indexes — use when:**
- Writes are frequent and must be fast
- You can tolerate scatter-gather reads for secondary index queries
- Each partition is a reasonable size for parallel scatter-gather

**Global secondary indexes — use when:**
- Secondary index reads are frequent and latency-sensitive
- You can tolerate eventual consistency on index updates
- You're using a managed service (like DynamoDB) that handles the complexity

## Common Mistakes

**Mistake 1: Choosing a low-cardinality partition key.**
Partitioning a user table by `country` when 80% of your users are in the US means 80% of your traffic hits the US partition. Partition keys must have sufficient cardinality to distribute data and load evenly. Rule of thumb: a good partition key should have at least 10x more distinct values than you have partitions.

**Mistake 2: Monotonically increasing keys with hash partitioning.**
UUIDs v4 (random) distribute well with hash partitioning. UUIDs v7 (time-ordered) concentrate writes in one partition. Auto-incrementing integer IDs always write to the "last" partition. If you use hash partitioning and need auto-incrementing keys, you must generate IDs centrally (coordination cost) or use globally unique random IDs.

**Mistake 3: Not planning for partition rebalancing.**
Many teams choose a partition count at the start and never change it. As data grows, partitions become unequally sized. Over time, some partitions become hotspots while others are underutilized. Build operational runbooks for partition splitting before you need them. Test the split process in staging regularly.

**Mistake 4: Scatter-gather queries that hit all partitions.**
A scatter-gather query that touches all N partitions is N times more expensive than a single-partition query, not just in terms of the final compute but in terms of coordination overhead and tail latency. One slow partition makes the entire query slow. If your most common query pattern is scatter-gather, reconsider your partitioning strategy.

**Mistake 5: Ignoring compound partition key semantics.**
In Cassandra, the partition key determines which partition holds the data. The clustering key determines order within the partition. A query without a partition key clause is a full-cluster scan — extremely expensive. Teams that don't understand this design compound keys that make their most common queries into full-cluster scans.

## Connections

- **Replication (01-replication.md):** In practice, each partition is replicated. Partitioning determines how data is divided; replication determines how each piece is kept available. Most systems combine both.
- **Consistent Hashing:** The algorithmic foundation for hash partitioning with dynamic node membership. Also used in CDN cache routing and load balancing.
- **Log-Structured Storage (09-log-structured-storage.md):** LSM trees and SSTables are the storage engines most commonly used inside partitions in distributed databases (Cassandra, RocksDB-based systems).
- **Consensus Algorithms (05-consensus-algorithms.md):** When a partition splits, the cluster must agree on which node owns the new partition. This is a consensus problem.
- **Stream Processing (06-stream-processing.md):** Kafka's topic partitioning uses the same concepts. Partition keys in Kafka determine which partition a message goes to, enabling ordered processing within a partition.

## Key Insights

The single most important insight about partitioning is that **the partition key determines your access patterns as much as your access patterns should determine your partition key**. This is circular, but it's real: once you partition by X, queries that filter by X are efficient; queries that don't are expensive. You're encoding your access patterns into your data model. Changing the partition key later requires rewriting the entire table — a massive operational undertaking. Choose carefully.

The second insight is that **hotspots are inevitable for popular content**. No partitioning scheme can prevent a single celebrity's Twitter post from overwhelming a single partition if every read for that post goes to the same key. The solutions are application-level: caching (serving popular content from memory rather than from the database partition), or read fanout (creating multiple copies of hot content, distributed across partitions). These are architectural solutions, not storage solutions.

The third insight is about the trade-off between local and global secondary indexes: **there is no free secondary index in a distributed system**. Local indexes make writes cheap and reads expensive (scatter-gather). Global indexes make reads cheap and writes expensive (distributed update). The right choice depends on your read/write ratio for index-based queries. Most OLTP systems are read-heavy, which argues for global indexes — but only if you can tolerate eventual consistency on index updates.

Finally, understand that **consistent hashing's elegance comes with operational complexity**. The uniform distribution depends on having many virtual nodes per physical node. Tracking which physical node owns which virtual nodes requires a metadata store that must itself be replicated and consistent. The systems that use consistent hashing (Cassandra, Riak, original DynamoDB) have substantial infrastructure just to manage the ring. Newer systems (CockroachDB, Spanner) use range-based partitioning with automatic splitting and rebalancing, accepting the rebalancing cost in exchange for simpler range scan semantics.
