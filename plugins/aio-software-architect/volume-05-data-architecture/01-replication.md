# Replication — Single-Leader, Multi-Leader, Leaderless

> "Replication means keeping a copy of the same data on multiple machines that are connected via a network. As with most things in distributed systems, it sounds simple — until you start thinking about what can go wrong." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

Every serious database system eventually confronts the same uncomfortable reality: a single machine is not enough. Not because the data won't fit — though that's a separate problem addressed by partitioning — but because a single machine represents a single point of failure, a single bottleneck for reads and writes, and a single geographic location that may be thousands of miles from your users.

Imagine you're running a financial application. Your database server handles 50,000 reads per second and 5,000 writes per second. Then the server's network card fails. Your entire application goes dark. Or imagine you're serving users in both New York and Tokyo from a single database in Virginia. Every read request from Tokyo incurs 150 milliseconds of network latency before your application even begins processing — an eternity in modern user experience terms.

Replication is the answer to all three problems simultaneously: availability (if one node fails, others continue serving requests), throughput (multiple nodes can serve reads in parallel), and latency (nodes can be placed geographically close to users). But replication introduces the hardest problem in distributed systems: what happens when two nodes disagree about the current state of the data? This question — the consistency problem — has no perfect answer. Every replication strategy is a trade-off between consistency guarantees and availability. Understanding those trade-offs in depth is what separates engineers who merely use databases from engineers who can reason about why their systems behave the way they do under pressure.

## Core Concept

Replication comes in three fundamental flavors, each with dramatically different consistency properties and operational characteristics.

### Single-Leader Replication

The simplest and most widely deployed model. One node is designated the leader (also called primary or master). All writes go to the leader. The leader processes the write, records it in its write-ahead log or replication log, and sends a stream of change events to all follower nodes (also called replicas, secondaries, or slaves).

```
        Write
         |
         v
    +----------+
    |  Leader  |  <-- All writes land here
    +----------+
    |          |
    v          v
+----------+ +----------+
| Follower | | Follower |  <-- Reads can go to followers
+----------+ +----------+
```

Reads can be served by any node — leader or follower. This is what makes single-leader replication so attractive: you get read scalability essentially for free. Add more followers, point your read traffic at them, and you've multiplied your read capacity.

But here's the catch: replication lag. When the leader processes a write, it takes some finite time for that write to propagate to all followers. In synchronous replication, the leader waits for at least one follower to confirm receipt before acknowledging the write to the client. This guarantees that if the leader fails, at least one follower has the latest data — but it adds latency to every write and means that if the synchronous follower is slow or unreachable, writes are blocked.

In asynchronous replication, the leader acknowledges writes immediately and sends the replication log to followers as a background process. This makes writes fast, but means followers may be behind by seconds, minutes, or — in a network partition — indefinitely. If the leader fails and you promote an asynchronous follower, you may lose recent writes.

Most production systems use a hybrid: one synchronous follower (the semi-synchronous follower) and the rest asynchronous. If the synchronous follower falls behind, a different follower is promoted to synchronous. This ensures there are always at least two nodes with up-to-date data.

**Failover: the hard part.** When the leader fails, one of the followers must be promoted to leader. This process is fraught with subtle failure modes:

- If asynchronous replication was used, the new leader may not have all writes from the old leader. The old leader's writes may conflict with what clients have been told was committed.
- Split-brain: two nodes both believe they are the leader. Both accept writes. The writes diverge. When the network partition heals, you have two conflicting versions of your data.
- Choosing the right new leader: you want the follower most up-to-date with the old leader, but determining this under network uncertainty is non-trivial.

These aren't theoretical concerns. They have caused data loss and corruption at major companies. GitHub had a famous 2012 incident where a failover resulted in a MySQL follower being promoted that was missing some transactions, which caused data inconsistency between MySQL and a Redis cache that had been set based on the MySQL data.

### Multi-Leader Replication

What if you have data centers in multiple geographic regions? With single-leader replication, all writes must go through the one leader — even if that leader is on the other side of the planet. The inter-datacenter write latency is often unacceptable.

Multi-leader replication (also called master-master or active-active replication) allows multiple nodes to accept writes. Each leader replicates its writes to all other leaders.

```
   DC-West                    DC-East
  +--------+    <-------->   +--------+
  | Leader |    Replication  | Leader |
  +--------+                 +--------+
  |        |                 |        |
  v        v                 v        v
Follower Follower         Follower Follower
```

The benefit is clear: writes in DC-West go to the local leader and are acknowledged with local latency. The replication to DC-East happens asynchronously in the background.

But multi-leader replication introduces the fundamental problem: **write conflicts**. If a user in DC-West and a user in DC-East simultaneously update the same record, both updates will be accepted by their respective leaders. When the replication streams from each datacenter converge, you have two conflicting writes.

How do you resolve them?

**Last-writer-wins (LWW):** Each write is stamped with a timestamp. The write with the later timestamp wins. Simple, but deeply problematic. Clocks across distributed systems are not synchronized to the precision required. Network Time Protocol (NTP) synchronizes clocks to within tens of milliseconds at best — and NTP can experience clock skew of hundreds of milliseconds or more. Two writes that are "simultaneous" from a user perspective may have different timestamps due to clock skew, and the "losing" write may contain data the user cares about.

**Per-record conflict detection:** Track the version of each record on each replica. When a conflict is detected, surface it to the application and let the application merge. This is correct but requires application logic for every record type that might conflict.

**CRDTs (Conflict-free Replicated Data Types):** Special data structures that can be merged deterministically regardless of the order of operations. Counters, sets, and registers with specific semantics can be designed as CRDTs. But CRDTs are complex and only applicable to data with specific mathematical properties.

Multi-leader replication is used by:
- CouchDB (designed from the ground up for multi-master)
- MySQL Cluster (with careful conflict handling)
- Some calendar apps (multiple devices as leaders, conflict resolution when syncing)

It is notoriously difficult to get right. Kleppmann devotes significant attention to it specifically to warn engineers about the subtleties. Unless you have a compelling reason (offline operation, geographic distribution), prefer single-leader.

### Leaderless Replication

Inspired by Amazon's Dynamo paper (2007), leaderless replication abandons the concept of a designated leader entirely. Any replica can accept writes. The client (or a coordinator node) sends writes to multiple replicas simultaneously.

```
         Write
          |
     +----+----+
     |    |    |
     v    v    v
  +---+ +---+ +---+
  | R | | R | | R |   (R = Replica)
  +---+ +---+ +---+
   ACK   ACK        <-- Only 2 of 3 needed (quorum)
```

The key insight is **quorum reads and writes**. If you have `n` replicas, and you require `w` replicas to acknowledge a write, and you require `r` replicas to respond to a read, then as long as `w + r > n`, you are guaranteed to read a value that includes the most recent write.

Classic configuration with 3 replicas: `w = 2`, `r = 2`. You write to 2 replicas, you read from 2 replicas. At least one of the replicas you read from must have the latest write.

```
n=3, w=2, r=2

Write goes to R1, R2:
R1: value=v2 (latest)
R2: value=v2 (latest)
R3: value=v1 (stale, missed the write)

Read goes to R2, R3:
R2: value=v2 (latest)  <-- This one wins
R3: value=v1 (stale)

Because w + r = 4 > n = 3, we're guaranteed to overlap.
```

But what if a replica misses writes? Dynamo uses two mechanisms:

**Read repair:** When a client reads from multiple replicas and gets different values, it detects the stale replica and sends a repair write to update it.

**Anti-entropy:** A background process constantly compares replicas and copies missing data. Unlike replication logs in leader-based systems, anti-entropy may copy data in any order — there is no guarantee of replicating writes in the order they were applied.

**Sloppy quorums and hinted handoff:** What if several replicas are unavailable during a write? Rather than refusing the write (which would harm availability), Dynamo accepts the write on any available replica — even one outside the "home" set for that key. This is a "sloppy" quorum. The replica that temporarily holds the write stores a "hint" that the data really belongs elsewhere. Once the home replica comes back online, the hint is used to forward the write. This dramatically increases write availability at the cost of weakening the consistency guarantee.

## Deep Dive

The Dynamo paper (2007) remains the most influential single document on leaderless replication. Its authors at Amazon faced a concrete problem: the shopping cart had to be writable even when nodes were unavailable. Their radical departure was the "sloppy quorum" — rather than requiring writes to land on the mathematically "correct" N nodes in the consistent-hash ring, a sloppy quorum uses the first N healthy nodes encountered, even if they are not the key's home nodes. Once the home nodes recover, hinted handoff transfers the data back. This means `w + r > n` no longer guarantees reading the latest write, because the write may reside on nodes outside the read quorum. The paper is explicit: sloppy quorums trade consistency for availability, and the shopping cart's merge semantics (union of items) made this trade tolerable. Most data does not have such clean merge semantics.

The replication lag problem — the gap between a write being acknowledged by the leader and appearing on followers — is not merely an operational annoyance. Kleppmann's DDIA frames it as a fundamental consistency issue with three distinct failure modes. Read-your-writes violations occur when a user's own writes aren't visible on the replica serving their next request. Monotonic read violations occur when a user sees a newer value and then a stale one in successive requests, appearing to travel backward in time. Consistent prefix violations occur when an observer sees replies before they see the questions those replies answer — causality is broken. Each requires a different mitigation: LSN-based routing for read-your-writes, session affinity for monotonic reads, and causal tracking (vector clocks or logical timestamps) for consistent prefix.

Single-leader replication's most dangerous failure mode is not the ordinary follower lag but split-brain during failover. When a leader fails and a new one is elected, the old leader may not know it has been deposed — particularly if the failure was a network partition rather than a crash. Two leaders accepting writes simultaneously will diverge. The standard mitigation is STONITH ("Shoot The Other Node In The Head"): the cluster management layer forcibly fences the old leader from storage before promoting the new one. This is why high-availability PostgreSQL deployments use tools like Patroni with watchdog timers, not just streaming replication alone. GitHub's 2012 incident — where a promoted MySQL follower was missing recent transactions, creating inconsistency between MySQL and a Redis cache built from that data — illustrates that the danger is not theoretical.

Multi-leader replication's write-conflict problem has no universally correct solution, and Kleppmann is emphatic on this point. Last-writer-wins (LWW) is deceptively appealing: just keep the write with the larger timestamp. But NTP synchronizes clocks to within tens of milliseconds, and Lamport's 1978 paper established that wall-clock timestamps cannot reliably order events across machines. A write that arrives "later" by wall-clock time may have been causally earlier. LWW silently discards data. CRDTs (Conflict-free Replicated Data Types) offer deterministic merge for specific algebraic structures — G-counters, OR-sets, LWW-registers — but they only apply to data whose operations are commutative and associative. Most relational data does not satisfy these constraints. The honest assessment is that multi-leader replication is appropriate for a narrow class of applications: offline-capable mobile apps where each device is a leader, and multi-datacenter active-active setups where the data model was explicitly designed for convergence.

Quorum mathematics deserves closer attention than it usually receives. The condition `w + r > n` guarantees that the read quorum and write quorum overlap by at least one node. With n=3, w=2, r=2: the write touches two of three nodes, the read touches two of three nodes, and by the pigeonhole principle at least one node is in both sets — so the most recent write is visible. But this guarantee degrades in two situations. First, with sloppy quorums (Dynamo's default for availability), writes may be on different nodes than the read quorum consults. Second, even with strict quorums, concurrent writes can create a situation where the "latest" value according to node timestamps is not the causally latest value. Dynamo's solution — version vectors that detect concurrent writes and surface them as siblings for application-level resolution — is the theoretically correct approach, though it demands that every data type have a well-defined merge function.

## Implementation Guide

**Starting with single-leader replication in PostgreSQL:**

```sql
-- On the primary (leader)
-- postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB

-- pg_hba.conf - allow replication connections
host replication replicator 10.0.0.0/8 md5

-- Create replication user
CREATE USER replicator REPLICATION LOGIN ENCRYPTED PASSWORD 'secure_password';
```

```bash
# On each follower - take a base backup
pg_basebackup -h primary_host -U replicator -D /var/lib/postgresql/data -P -Xs -R

# The -R flag creates standby.signal and postgresql.auto.conf with recovery settings
# Follower will start streaming from primary automatically
```

```sql
-- Monitor replication lag on primary
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    (sent_lsn - replay_lsn) AS replication_lag_bytes,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;
```

**Handling read-your-writes consistency when using followers for reads:**

```python
class UserProfileService:
    def __init__(self, primary_db, replica_db):
        self.primary = primary_db
        self.replica = replica_db

    def update_profile(self, user_id, data):
        # Always write to primary
        self.primary.execute(
            "UPDATE profiles SET data = %s WHERE user_id = %s",
            (data, user_id)
        )
        # Store the LSN (log sequence number) after the write
        lsn = self.primary.fetchone("SELECT pg_current_wal_lsn()")[0]
        # Store in session/cache: this user's profile was updated at this LSN
        cache.set(f"profile_lsn:{user_id}", lsn, ttl=60)
        return lsn

    def get_profile(self, user_id, requesting_user_id=None):
        # If the requesting user just updated their own profile,
        # route to primary to avoid reading stale data
        if requesting_user_id == user_id:
            lsn_key = f"profile_lsn:{user_id}"
            required_lsn = cache.get(lsn_key)
            if required_lsn:
                # Check if replica is caught up enough
                replica_lsn = self.replica.fetchone(
                    "SELECT pg_last_wal_replay_lsn()"
                )[0]
                if replica_lsn < required_lsn:
                    return self.primary.fetchone(
                        "SELECT data FROM profiles WHERE user_id = %s",
                        (user_id,)
                    )
        # For other users' profiles, replica is fine
        return self.replica.fetchone(
            "SELECT data FROM profiles WHERE user_id = %s",
            (user_id,)
        )
```

**Implementing a simple leaderless write with quorum:**

```python
import asyncio
from typing import List, Any

class LeaderlessReplicaClient:
    def __init__(self, replicas: List[str], w: int = 2, r: int = 2):
        self.replicas = replicas
        self.n = len(replicas)
        self.w = w  # write quorum
        self.r = r  # read quorum
        assert w + r > self.n, "Quorum condition w + r > n must hold"

    async def write(self, key: str, value: Any, version: int) -> bool:
        """Write to w replicas, return True if quorum achieved."""
        tasks = [
            self._write_to_replica(replica, key, value, version)
            for replica in self.replicas
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        successes = sum(1 for r in results if r is True)
        return successes >= self.w

    async def read(self, key: str) -> Any:
        """Read from r replicas, return the value with highest version."""
        tasks = [
            self._read_from_replica(replica, key)
            for replica in self.replicas
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid_results = [r for r in results if isinstance(r, dict)]
        if len(valid_results) < self.r:
            raise Exception("Read quorum not achieved")
        # Return value with highest version (last-writer-wins)
        best = max(valid_results, key=lambda x: x['version'])
        # Async read repair: update stale replicas
        self._repair_stale_replicas(key, best, results)
        return best['value']
```

## When to Use / When NOT to Use

**Single-leader replication — use when:**
- You need strong consistency guarantees for writes
- Your write volume fits on one machine
- You want simple operational model with clear leader
- You're building an OLTP system where writes are complex transactions

**Single-leader replication — avoid when:**
- You need writes to be geographically distributed (multi-datacenter active-active)
- Your single leader is a latency bottleneck for globally distributed users
- You need zero-downtime failover (leader election takes time)

**Multi-leader replication — use when:**
- You absolutely must accept writes in multiple geographic regions simultaneously
- You're building an offline-capable application where each device is a "leader"
- You have a clear, implementable conflict resolution strategy

**Multi-leader replication — avoid when:**
- You have data types that don't merge cleanly (most relational data)
- You cannot afford the operational complexity of conflict resolution
- Consistency errors would be costly (financial transactions, inventory counts)

**Leaderless replication — use when:**
- You need the highest possible write availability (accepting writes even during partial failures)
- Your data model is simple (key-value, simple documents)
- You can accept eventual consistency for reads
- You're building a high-scale, high-availability system where Dynamo-style trade-offs make sense

**Leaderless replication — avoid when:**
- You need linearizable consistency (leaderless systems cannot provide this without coordination)
- You have complex transactions that span multiple keys
- You need predictable conflict resolution for complex data types

## Common Mistakes

**Mistake 1: Assuming asynchronous replication is safe for failover.**
Many teams configure asynchronous replication (for performance) and then discover during a failover drill that the promoted follower is missing the last few seconds of writes. In financial systems, this is catastrophic. Always configure synchronous replication for at least one follower when you need zero data loss.

**Mistake 2: Routing all reads to followers without handling replication lag.**
The classic symptom: a user updates their profile picture, immediately refreshes the page, and sees the old picture. This is a read-your-writes violation caused by reading from a lagging follower right after writing to the leader. The fix is either routing the user's own reads to the leader for a brief window after a write, or using session-level consistency tokens (LSN tracking as shown in the implementation guide).

**Mistake 3: Underestimating the complexity of multi-leader conflict resolution.**
Teams often start with multi-leader for the geographic distribution benefits and only discover the conflict resolution complexity when their first real conflict occurs in production. By then, millions of records may have been written. The conflict resolution logic that seemed simple in theory becomes a nightmare when applied to years of accumulated data.

**Mistake 4: Confusing sloppy quorum availability with consistency.**
In Dynamo-style systems with sloppy quorums enabled, `w + r > n` does NOT guarantee reading the latest write, because the write may have gone to "wrong" replicas that aren't included in the read quorum. Sloppy quorums sacrifice consistency for availability. Know which mode your system is in.

**Mistake 5: Not monitoring replication lag.**
In production systems, replication lag is often the first indicator of an overloaded leader or a slow follower. Teams that don't alert on replication lag discover the problem only when followers are hours behind — by which point the catch-up process can take so long it affects the maintenance window.

## Connections

- **Partitioning (02-partitioning.md):** Replication and partitioning are typically used together. Each partition has multiple replicas. Understanding both is necessary to reason about the full system.
- **Consistency Models (03-consistency-models.md):** Replication lag is the direct cause of consistency violations. Consistency models describe the guarantees you get — or don't get — from your replication strategy.
- **Consensus Algorithms (05-consensus-algorithms.md):** Leader election in single-leader systems is a consensus problem. Understanding Raft and Paxos explains how databases reliably elect new leaders during failover.
- **Transactions (14-transactions.md):** Distributed transactions across replicated systems require coordination protocols. Understanding replication is a prerequisite for understanding distributed transactions.
- **Vector Clocks (15-vector-clocks.md):** Multi-leader and leaderless systems use version vectors to detect conflicts. Vector clocks are the theoretical foundation.

## Key Insights

The most important insight about replication is that the choice of replication model is inseparable from the choice of consistency model. You cannot have strong consistency with fully asynchronous replication — if a follower hasn't received the latest writes and the leader fails, you've lost data. Synchronous replication gives you durability and consistency but adds latency and availability risk (if the synchronous follower is unreachable, writes block).

The second insight is that replication lag is not a bug — it is a fundamental consequence of physics and asynchrony. Light takes 67 milliseconds to travel from New York to London. Even if your replication protocol were instantaneous at the application level, the minimum replication lag for a transatlantic replica is 67ms. Design your applications to handle stale reads gracefully, or choose a consistency model and routing strategy that provides the guarantees you need.

The third insight is that multi-leader replication does not eliminate the need to choose a consistency model — it makes the choice harder. With single-leader replication, the leader is the arbiter of truth. With multi-leader, there is no single arbiter. Every conflict requires a resolution strategy that is correct for your domain. In many domains, no correct automatic resolution strategy exists, and the right answer is to not use multi-leader at all.

Finally, understand that Dynamo-style leaderless systems achieve their remarkable availability properties by shifting responsibility to the application layer. The database says "here are the versions we have — you figure out which one is correct." This is powerful but demanding. It works brilliantly for Amazon's shopping cart (merging is well-defined: add items from both carts) and fails badly for bank account balances (there is no correct merge of two conflicting account states).
