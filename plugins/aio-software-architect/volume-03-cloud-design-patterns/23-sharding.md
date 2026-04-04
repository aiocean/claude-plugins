# Sharding Pattern

> "A single database that handles everything is like a single road that leads everywhere. Convenient until traffic starts."

## The Problem

Your social network has grown to 500 million users. Your single PostgreSQL database holds all user data — profiles, posts, followers, messages. For the first few years, you added more RAM, faster SSDs, and read replicas. But you've hit the ceiling: the largest available instance can't hold your working set in memory. Writes are serialized through one primary. Your heaviest tables have more rows than a single node can index efficiently. You're spending more time on database maintenance (vacuuming, reindexing, backup windows) than on product development. Vertical scaling has reached its physical limit.

Horizontal scaling — adding more machines — is the only path forward. But a relational database doesn't naturally distribute across machines. You can't just "add more database servers" the way you add more web servers. Data has relationships; queries join across tables; transactions span multiple rows. Distributing a relational database requires a fundamental change in how data is organized: sharding.

Sharding is horizontal partitioning — splitting data across multiple independent database nodes (shards) so that each node holds a subset of the total data. A query for user ID 12345 goes to exactly one shard; that shard handles the query in isolation. The total capacity of the system is the sum of all shards. Adding shards increases capacity linearly. This is how Google Spanner scales to petabytes, how Facebook's MySQL sharding handles billions of users, and how Discord handles billions of messages.

## Core Concept

Sharding answers a single question: given a piece of data, which shard does it live on? The answer is determined by a sharding key and a routing strategy.

```
UNSHARDED (all data on one node):

[Node A]
├── users 1-500,000,000
├── posts 1-2,000,000,000
└── messages 1-10,000,000,000
    
    ^ This node is the bottleneck for everything.


SHARDED (data distributed across nodes):

[Shard 0]          [Shard 1]          [Shard 2]          [Shard 3]
users 0-124M       users 125-249M     users 250-374M     users 375-500M
posts (user 0-124M) posts (125-249M)  posts (250-374M)   posts (375-500M)

Query for user 200M -> Shard 1 (only)
Query for user 400M -> Shard 3 (only)

Each shard handles 1/4 of the load.
Add 4 more shards -> each handles 1/8.
```

### Sharding Strategies

**Hash-based sharding:** Apply a hash function to the sharding key, take modulo number of shards.

```
shard = hash(user_id) % num_shards

user_id=1000 -> hash=7823456 -> 7823456 % 4 = 0 -> Shard 0
user_id=1001 -> hash=9234567 -> 9234567 % 4 = 3 -> Shard 3
```

Pros: Uniform distribution, simple to implement.
Cons: Resharding requires moving nearly all data (when num_shards changes, shard = hash % new_num changes for most keys).

**Range-based sharding:** Assign contiguous ranges of key values to each shard.

```
Shard 0: user_id 1 - 100,000,000
Shard 1: user_id 100,000,001 - 200,000,000
Shard 2: user_id 200,000,001 - 300,000,000
```

Pros: Efficient range queries (all users in a range are on the same shard). Easy to understand and debug.
Cons: Hotspots when data is not uniformly distributed (new users concentrate on the highest shard), sequential writes create write hotspots.

**Directory-based sharding:** A lookup table (the directory) maps each key to its shard.

```
Directory service:
  user_id=1000 -> Shard 2
  user_id=1001 -> Shard 0
  user_id=1002 -> Shard 2
```

Pros: Complete flexibility — any key can be on any shard. Easy to rebalance (just update the directory).
Cons: The directory is a single point of failure and a bottleneck. Every read requires a directory lookup. Must cache the directory aggressively.

**Consistent hashing:** A more sophisticated hash-based approach that minimizes data movement during resharding. Keys and nodes are both placed on a virtual ring. Each key maps to the nearest node clockwise on the ring. Adding or removing a node only moves the keys adjacent to that node — not all keys.

```
Virtual ring (0-360 degrees):
  Shard A: 0-90
  Shard B: 90-180
  Shard C: 180-270
  Shard D: 270-360

key hash 45  -> Shard A
key hash 150 -> Shard B
key hash 300 -> Shard D

Add Shard E at position 220:
  Only keys hashing 180-220 move from Shard C to Shard E.
  ~25% of data moves, not 100% (vs simple modulo).
```

Consistent hashing is used by Amazon DynamoDB, Apache Cassandra, and Riak. It is the standard approach for systems that need to add or remove shards without full data movement.

## Deep Dive

**The Dynamo paper and consistent hashing.** Amazon's 2007 Dynamo paper (DeCandia et al., published at SOSP 2007) is the canonical reference for consistent hashing as a sharding mechanism. The paper introduced the consistent hashing ring as a solution to the resharding problem with static hash-based sharding: when the number of shards changes, all data must be redistributed. On a consistent hashing ring, each shard occupies a segment of the ring; when a shard is added, only the data on the adjacent ring segment must move. The paper further introduced virtual nodes (vnodes) — each physical shard is assigned multiple positions on the ring — to improve load balancing when physical nodes have heterogeneous capacity. Kleppmann's *Designing Data-Intensive Applications* builds on the Dynamo paper's analysis: consistent hashing is the correct mechanism for sharded systems that need to add or remove shards without full data movement, but virtual nodes add operational complexity (a failed node's data is distributed across many receiving nodes rather than one).

**Partition key design and hotspot prevention.** The Dynamo paper's analysis of workload distribution identifies hotspot prevention as the primary design challenge in sharded systems. A partition key that concentrates write traffic on a single shard — a trending user ID in a social network, a popular product ID in a catalog, a high-volume customer ID in a billing system — exhausts that shard's capacity regardless of how many shards exist. Kleppmann's *DDIA* provides the vocabulary: a hot key creates a "hot partition" that is disproportionately loaded relative to other partitions. The solutions — key salting (appending a random suffix and scatter-gathering on read), time-based sharding (distributing time-series data across shards by time range), or application-level load-balancing (detecting hot keys and routing to multiple shards) — all trade read complexity for write distribution. The correct solution depends on whether the workload is read-heavy or write-heavy for the hot key.

**The Google Bigtable tablet model and automatic resharding.** The Google Bigtable paper (Chang et al., OSDI 2006) describes a sharding model that differs from consistent hashing: range-based partitioning. Bigtable divides the key space into contiguous ranges called tablets. Each tablet is served by exactly one tablet server. When a tablet grows beyond a threshold (configurable, default 100-200MB), Bigtable automatically splits it. When a tablet server is overloaded, tablets are migrated to less-loaded servers. This is transparent, automatic resharding — the application sees no shard boundaries. Kleppmann's analysis of range-based partitioning's advantage over hash-based: range scans are efficient (all keys in a range are on the same shard), whereas hash-based sharding distributes range scans across all shards. The trade-off: range-based partitioning requires careful key design to avoid sequential write hotspots (monotonically increasing keys, like timestamps, concentrate writes on the last shard).

**Cross-shard queries and the scatter-gather cost.** Kleppmann's *DDIA* analyzes the fundamental constraint of sharding: queries that span multiple shards require scatter-gather — sending the query to all shards and merging the results. The cost is proportional to the number of shards: a query that requires touching all N shards takes at least as long as the slowest shard's response and generates N times the backend load of an equivalent single-shard query. The Google Spanner paper (Corbett et al., OSDI 2012) addresses this for cross-shard transactions specifically: Spanner's TrueTime mechanism enables external consistency across shards without traditional two-phase commit, but at the cost of committing at the TrueTime uncertainty interval (typically 1-7ms). Kleppmann's conclusion: sharding optimizes for single-shard queries and writes; it imposes a fundamental penalty on cross-shard operations. The data model must be designed to minimize cross-shard operations, which requires understanding the access patterns before choosing the shard key.

**Resharding and the data migration problem.** Kleppmann's *DDIA* treatment of rebalancing partitions addresses the operational challenge of resharding a live production system. Adding shards requires moving data from existing shards to new shards without downtime. The naive approach — stop writes, move data, restart — is unacceptable for production systems. The correct approach involves online rebalancing: the new shard begins receiving a copy of data from the old shard while the old shard continues serving traffic; once the copy is consistent, traffic is cut over to the new shard, and the old shard drains. This requires the rebalancing mechanism to handle writes that arrive during the copy (applying them to both old and new shards) and to detect when the copy is complete and consistent. Kleppmann's analysis: the complexity of online resharding is why systems like Bigtable and Spanner manage it automatically — application-managed resharding is operationally complex and error-prone, and should be avoided when a database with automatic resharding is available and appropriate.

## Implementation Guide

### Step 1: Choose the Sharding Key

The sharding key determines data distribution and query patterns. The ideal key:

```
Criteria for a good sharding key:
  1. High cardinality (many distinct values)
     Bad: status (3 values: pending/active/inactive)
     Good: user_id (millions of values)
  
  2. Even distribution (no hotspots)
     Bad: created_at (all new data hits latest shard)
     Good: user_id (randomly distributed)
  
  3. Aligns with query patterns (queries hit one shard, not all)
     If queries are "all orders for user X": shard by user_id
     If queries are "all orders on day X": shard by date
     (Often you can't optimize for both simultaneously)
  
  4. Immutable (never changes per entity)
     Bad: email (users change email)
     Good: user_id (assigned at creation, never changes)
```

### Step 2: Implement Routing Logic

For application-level sharding:

```typescript
class ShardRouter {
  private readonly numShards: number;
  private readonly shards: DatabaseConnection[];
  
  // Hash-based routing
  getShardForKey(key: string): DatabaseConnection {
    const hash = this.fnv1aHash(key);
    const shardIndex = hash % this.numShards;
    return this.shards[shardIndex];
  }
  
  // Consistent hashing for dynamic shard sets
  getShardConsistent(key: string): DatabaseConnection {
    const hash = this.fnv1aHash(key);
    // Binary search for nearest node on the ring
    return this.ring.findNearest(hash);
  }
  
  private fnv1aHash(key: string): number {
    let hash = 2166136261;
    for (const char of key) {
      hash ^= char.charCodeAt(0);
      hash = (hash * 16777619) >>> 0; // FNV prime
    }
    return hash;
  }
}
```

### Step 3: Handle Cross-Shard Queries

Cross-shard queries require scatter-gather: query all shards in parallel, merge results:

```typescript
async function findTopUsersBySpend(
  limit: number
): Promise<User[]> {
  // Scatter: query all shards in parallel
  const shardResults = await Promise.all(
    this.shards.map(shard =>
      shard.query(
        `SELECT user_id, total_spend 
         FROM users 
         ORDER BY total_spend DESC 
         LIMIT ?`,
        [limit]
      )
    )
  );
  
  // Gather: merge and re-sort
  const allResults = shardResults.flat();
  allResults.sort((a, b) => b.total_spend - a.total_spend);
  return allResults.slice(0, limit);
}
```

Cross-shard queries are expensive. Design your sharding key to avoid them for your most common access patterns.

### Step 4: Plan for Resharding

Resharding — moving data between shards — is the most operationally challenging aspect of sharding. The options:

**Double-write migration:** Write to both old and new shard layout during migration. Read from both, old takes precedence. Once migration complete, read from new only. Then stop writing to old.

**Online resharding with consistent hashing:** Add a new shard to the ring. Only the adjacent key ranges migrate. Use a background job to migrate data while the system remains live. Update routing after migration.

**Vitess-style resharding:** Copy data to new shards, track changes via binlog, apply changes to new shards, switch routing, verify, then drop old shards.

### Step 5: Handle Hotspots

For hotspot sharding keys, add a suffix to spread load:

```python
# Hotspot: game_id="popular_game" -> all traffic to one shard
# Solution: shard suffix

SUFFIX_COUNT = 64

def get_shard_key(game_id: str, write: bool = False) -> str:
    if write:
        # Random suffix on write: spreads writes across 64 shards
        suffix = random.randint(0, SUFFIX_COUNT - 1)
        return f"{game_id}_{suffix}"
    else:
        # Fixed suffix on targeted read
        suffix = hash(game_id) % SUFFIX_COUNT  # or random for scatter-gather
        return f"{game_id}_{suffix}"
```

## When to Use / When NOT to Use

**Use when:**
- Vertical scaling has reached its limit (largest available instance is insufficient)
- Write throughput exceeds single-node capacity
- Data volume exceeds single-node storage capacity
- Geographic distribution requires data locality (data sovereignty, latency)

**Do NOT use when:**
- Vertical scaling still has headroom — sharding adds enormous complexity
- Your access patterns require frequent cross-shard queries (sharding makes these expensive)
- Your data has many relational joins across entities that would end up on different shards
- Read replicas solve your problem — scaling reads is far simpler than sharding

## Common Mistakes

**Mistake 1: Choosing a low-cardinality sharding key.** Sharding by `status` (3 values) creates 3 shards max. Sharding by `country` creates 200 shards but distributes unevenly (US gets 80% of traffic). Choose high-cardinality, evenly-distributed keys.

**Mistake 2: Ignoring hotspots.** Sequential keys (auto-increment IDs, timestamps) create range-based hotspots: all new data lands on the same shard. Popular entities (trending topics, viral content) create hash-based hotspots. Analyze your write patterns before choosing a sharding key.

**Mistake 3: Cross-shard transactions.** Trying to maintain ACID transactions across multiple shards via application-level 2PC or sagas. This is extremely complex and usually indicates the wrong sharding key. Redesign so that logically atomic operations touch a single shard.

**Mistake 4: Not planning for resharding.** Choosing a sharding strategy (especially simple modulo hashing) without considering what happens when you need to add more shards. Simple modulo requires moving all data when shard count changes. Consistent hashing or directory-based sharding handles growth much better.

**Mistake 5: Overlooking the operational burden.** Sharding multiplies your operational surface area. Schema changes must be applied to every shard. Backup and restore procedures become N times more complex. Monitoring requires aggregating metrics across all shards. Budget significant operational time for sharding maintenance.

## Connections

**Leader Election** (Article 16): Sharded databases that use primary-replica replication per shard need leader election within each shard. Each shard independently elects its primary.

**Materialized View** (Article 17): Cross-shard aggregation queries are expensive. Pre-computing cross-shard aggregates as materialized views (maintained by a background job that queries all shards and writes to a summary table) is a common optimization.

**Consistent Hashing**: Consistent hashing is the sharding algorithm that minimizes data movement during resharding. It is the foundation of DynamoDB, Cassandra, and Riak's partition strategies.

**CQRS**: Read replicas per shard plus a cross-shard aggregation layer on the read side is a natural CQRS implementation for sharded systems.

## Key Insights

1. **Sharding is a last resort, not a first choice.** Read replicas, caching, vertical scaling, and query optimization all come before sharding. Sharding multiplies operational complexity by the number of shards. Exhaust simpler options first.

2. **The sharding key is the most important design decision.** It determines distribution, hotspot behavior, query efficiency, and resharding difficulty. Changing it later requires rewriting all data. Think carefully before choosing.

3. **Consistent hashing solves the resharding problem.** Simple modulo hashing requires moving all data when shard count changes. Consistent hashing moves only the adjacent key ranges. For any system that will grow, consistent hashing or directory-based sharding is the right foundation.

4. **Cross-shard operations are expensive by design.** Sharding optimizes for single-shard operations. Cross-shard queries, joins, and transactions are the price you pay for horizontal scale. If your most common queries are cross-shard, you have the wrong sharding key.

5. **Hotspots are the most common operational failure mode.** A perfectly designed sharding scheme becomes imbalanced when a viral event creates a hotspot key. Monitor per-shard load continuously and design hotspot mitigation (suffix randomization, read replicas for hot shards) before you need it.

6. **Managed sharding services (DynamoDB, Cosmos DB, Spanner) are almost always worth it.** The operational complexity of maintaining a sharded MySQL or PostgreSQL cluster is enormous. Managed services handle partition splitting, rebalancing, replication, and failover automatically. The only reason to build your own sharding layer is if managed services can't meet your specific requirements.

7. **Vitess and CockroachDB bridge the relational-sharded gap.** If you need SQL semantics with horizontal scale, Vitess (MySQL-compatible sharding) and CockroachDB (distributed PostgreSQL-compatible) provide both. They're not simple, but they're far simpler than building your own sharding layer on top of MySQL or PostgreSQL.
