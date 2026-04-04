# The Consistency Spectrum — Linearizable to Eventual

> "Consistency is not a binary property. There is a whole spectrum of consistency models, each offering different guarantees about what a client can observe when reading and writing data in a distributed system." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

Here is a scenario that every distributed systems engineer has encountered: a user updates their password, immediately tries to log in with the new password, and gets an authentication failure. The user is furious. The bug report says "passwords don't save." But the passwords do save — the database committed the write successfully. The problem is that the read that verified the password went to a replica that hadn't yet received the update.

This is a consistency violation, and it's just one of many subtle ways that distributed systems can behave unexpectedly. The challenge is not that consistency violations are rare — they happen constantly in any system with replication or caching. The challenge is that most engineers don't have a precise vocabulary for the specific guarantees their system provides or requires, so they can't reason about when violations will and won't occur.

Consistency models are that vocabulary. They are formal specifications of the guarantees a storage system makes about the order and visibility of operations. Each model on the spectrum represents a different trade-off between the strength of guarantees (which is good for application correctness) and the cost of those guarantees in terms of latency, availability, and implementation complexity (which is bad for performance). Understanding the spectrum — from the absolute guarantee of linearizability down to the minimal guarantee of eventual consistency — is what separates engineers who can design correct distributed systems from those who rely on luck.

## Core Concept

### Linearizability — The Strongest Useful Guarantee

Linearizability (also called atomic consistency or external consistency) provides the illusion that there is only one copy of the data, and all operations on it are instantaneous. More precisely: once a write completes, all subsequent reads (from any client, on any replica) must return the new value.

```
Time: ----->

Client A: |--Write(x=1)--|
Client B:                    |--Read(x)--> must return 1

If Client A's write completed before Client B's read started,
linearizability guarantees Client B sees x=1.
```

Linearizability makes a distributed system behave like a single-threaded, single-machine system from the outside. This is enormously powerful for application developers — they can reason about their system the same way they reason about a local database.

The cost is high. To achieve linearizability in a replicated system, a read must either go to the leader and get the definitive latest value, or use a quorum read that guarantees intersection with any quorum write. In geographically distributed systems, this means a read in Tokyo might need to consult the leader in Virginia — adding hundreds of milliseconds of latency. During a network partition, you must choose: stop accepting reads (sacrificing availability) or accept stale reads (sacrificing linearizability). You cannot have both.

Linearizability is required for:
- Distributed locks (if two nodes both think they hold the lock, you have a disaster)
- Leader election (there must be exactly one leader at any time)
- Uniqueness constraints across partitions (e.g., two users cannot register the same username)
- Incrementing a counter that drives monotonic sequence numbers

### Sequential Consistency — Slightly Relaxed

Sequential consistency is weaker than linearizability in one crucial way: it doesn't require that the global ordering of operations match real time. All operations appear to happen in some total order, and each client's operations appear in that total order in the order the client issued them. But two clients' operations may interleave in any order, even if one operation completed before another started.

```
Client A: Write(x=1) -- Write(y=1)
Client B: Read(y)=1 -- Read(x)=0  -- This is allowed in sequential consistency!

Even though Client A wrote x=1 before y=1, Client B can observe y=1 but x=0
because sequential consistency doesn't require the global order to match real time.
```

Sequential consistency is what Java's volatile keyword provides, and what many CPU memory models approximate. It's strong enough for many synchronization use cases but weaker than linearizability.

### Causal Consistency — The Practical Sweet Spot

Causal consistency tracks the causal relationships between operations. If operation B was causally influenced by operation A (i.e., B happened after A and the process that did B knew about A), then every process must observe B after A. Operations with no causal relationship can be observed in any order.

```
Client A: Write(post="hello")
Client B: Read(post="hello") -- causally depends on A's write
          Write(reply="world!") -- causally depends on B's read
Client C: Must see post="hello" before reply="world!" (causally ordered)
          But might see neither, or just post="hello" -- depends on propagation
```

Causal consistency is strictly weaker than linearizability (not all linearizable operations are causal, but all causal operations are consistent with linearizability) but much easier to implement without coordination. You can achieve causal consistency using vector clocks or logical timestamps without requiring a global coordinator.

The appeal of causal consistency is that it handles the most common real-world consistency requirements:

- Comments appear after the posts they reply to
- A user sees their own writes reflected immediately (read-your-writes)
- Replies are ordered after questions in a conversation thread

Causal consistency does NOT require a single global order of all operations, so it can be implemented without a centralized coordinator. This makes it available across network partitions, unlike linearizability.

COPS (Cluster of Order-Preserving Servers) and Bolt-on Causal Consistency are research systems that implement causal consistency in eventually consistent stores. MongoDB's sessions provide causal consistency guarantees within a session.

### Read-Your-Writes Consistency

A specific, practical guarantee that is weaker than full causal consistency: after a client writes a value, that same client will always read that value or a more recent one. Other clients may still see stale data.

```
Client A:
  Write(profile_picture=new_photo) -> success
  Read(profile_picture) -> must return new_photo (or something newer)

Client B (concurrently):
  Read(profile_picture) -> might still return old_photo (no guarantee)
```

This is what users typically expect when they update their own data. The password update scenario at the start of this article is a read-your-writes violation. The fix is to route the user's own reads to the leader after they write, or to track the LSN (log sequence number) of their last write and only serve reads from replicas that have caught up to that LSN.

Read-your-writes is a client-visible property, which means it can sometimes be implemented at the application layer without requiring the database to provide it natively (as shown in the implementation guide below).

### Monotonic Reads

Another specific guarantee: if a client reads a value at time T, all subsequent reads by that client will see a value at least as recent as T. Clients never "go back in time" — seeing a newer value followed by an older value.

```
Client A at time T1: Read(x) -> returns x=5 (written by someone at time T1)
Client A at time T2: Read(x) -> must return x >= 5 (might be 5, might be 6, never 3)
```

Monotonic reads is violated when a client's requests are routed to different replicas, and those replicas are at different points in the replication stream. The user sees version 5 (from a replica that has caught up), then sees version 3 (from a replica that's behind). This is deeply confusing to users.

The fix is typically session stickiness: route all requests from a given session to the same replica. If that replica fails, the client may experience a brief "time travel" to an older state.

### Eventual Consistency — The Weakest Useful Guarantee

The weakest guarantee that is still useful: if no new writes occur, all replicas will eventually converge to the same value. The word "eventually" is deliberately vague — it might mean milliseconds or days, depending on network conditions.

Eventual consistency makes no guarantees about what you read at any given moment. You might read stale data. You might read data that was overwritten. You might see operations in a different order than they occurred. The only promise is convergence: given time and no new writes, all replicas end up with the same data.

```
Write(x=1) happens on Replica A at time T
Read(x) on Replica B at time T+100ms might return x=0 (old value)
Read(x) on Replica B at time T+5000ms will return x=1 (converged)
```

Eventual consistency is appropriate for:
- DNS (propagation takes time, eventual consistency is fine)
- CDN caches (stale content for a few minutes is acceptable)
- Shopping carts (merge both carts if they diverge)
- Social media likes/view counts (approximate is fine)
- Any counter or aggregate where exact real-time accuracy is not required

Eventual consistency is NOT appropriate for:
- Account balances
- Inventory counts (overselling is a real problem)
- Distributed locks
- Any scenario where reading stale data causes incorrect decisions with material consequences

## Deep Dive

Linearizability — the strongest useful consistency guarantee — has a precise formal definition that is worth unpacking. Herlihy and Wing (1990) defined a history of operations as linearizable if there exists a legal sequential history that is equivalent to it, where each operation appears to take effect atomically at some point between its invocation and its response. The key word is "appears": from the outside, there must be a single instant at which the operation happened, even though the operation took time. This is what gives linearizability its intuitive property: once a write completes, every subsequent read (from any client, any replica) must see the new value. Violating this — returning a stale value after a write has completed — is a linearizability failure, and it happens constantly in systems with replication lag.

The cost of linearizability is not merely latency; it is, more fundamentally, availability. The CAP theorem (formalized by Gilbert and Lynch, 2002) proves that no system can guarantee linearizability and availability simultaneously during a network partition. When a partition occurs, a linearizable system must either stop accepting operations on the minority side or risk returning stale reads. This is not a quality-of-implementation concern — it is a mathematical impossibility. Systems like Spanner achieve linearizability at global scale not by violating CAP but by accepting the availability cost on the minority side of any partition, and by using hardware (GPS-synchronized atomic clocks) to minimize the coordination latency that linearizability demands.

Causal consistency occupies the most interesting position on the spectrum. It is strictly weaker than linearizability — it does not impose a total order on all operations, only a partial order respecting causal dependencies. But it is the strongest consistency model achievable without coordination during network partitions. The COPS system (Clusters of Order-Preserving Servers, Lloyd et al. 2011) demonstrated that causal consistency can be implemented in a geographically distributed system with no cross-datacenter coordination for reads or writes — a remarkable result. The key mechanism is causal metadata: each operation carries a dependency list of operations it has observed, and a replica delays serving a read until all causally prior writes have been applied. This is expensive in metadata overhead but eliminates the latency penalty of linearizability.

The session-level consistency guarantees — read-your-writes, monotonic reads, monotonic writes, writes-follow-reads — are often more practically important than the global guarantees because they govern what individual users experience. Vogels (2009) catalogued these in "Eventually Consistent" and argued that many applications need only session-level guarantees, not global ones. The password-change scenario is the canonical example of read-your-writes: a user changes their password, immediately tries to log in, and the authentication service reads from a lagging replica that still has the old password hash. The fix is not global linearizability — it is ensuring that the user's own subsequent reads are routed to a replica that has caught up past the LSN of their last write. This is tractable without the full coordination cost of linearizability.

Eventual consistency deserves a more precise characterization than "replicas converge eventually." Vogels's original definition specifies that if no new updates are made to a data item, eventually all accesses to that item will return the last updated value. The "eventually" is unbounded — in the presence of continuous writes, replicas may never converge. What practitioners usually need is not eventual consistency per se but a bound on staleness: "reads are never more than 500ms stale" is a useful operational guarantee; "reads are eventually consistent" is not. This is why the PACELC framework (Abadi, 2012) adds the E-L dimension: even absent partitions, systems trade latency for consistency in normal operation, and naming that trade-off explicitly is more useful than the partition-only framing of CAP.

## Implementation Guide

**Implementing read-your-writes at the application layer:**

```python
import threading
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class SessionConsistencyToken:
    """Track the minimum LSN a session must read to maintain read-your-writes."""
    min_lsn: Optional[str] = None
    lock: threading.Lock = field(default_factory=threading.Lock)

    def update(self, lsn: str):
        with self.lock:
            # LSNs are comparable: keep the maximum seen
            if self.min_lsn is None or lsn > self.min_lsn:
                self.min_lsn = lsn

class ConsistentSessionRepository:
    def __init__(self, primary_db, replica_pool, session_token: SessionConsistencyToken):
        self.primary = primary_db
        self.replicas = replica_pool
        self.token = session_token

    def write(self, query: str, params: tuple):
        result = self.primary.execute(query, params)
        # Track the LSN after write so future reads are consistent
        lsn = self.primary.fetchone("SELECT pg_current_wal_lsn()::text")[0]
        self.token.update(lsn)
        return result

    def read(self, query: str, params: tuple):
        if self.token.min_lsn is not None:
            # Find a replica that has caught up enough
            for replica in self.replicas:
                replica_lsn = replica.fetchone(
                    "SELECT pg_last_wal_replay_lsn()::text"
                )[0]
                if replica_lsn >= self.token.min_lsn:
                    return replica.fetchone(query, params)
            # No replica is caught up — fall back to primary
            return self.primary.fetchone(query, params)
        else:
            # No write in this session — any replica is fine
            return self.replicas[0].fetchone(query, params)
```

**Implementing monotonic reads with replica affinity:**

```python
import hashlib
from typing import List

class MonotonicReadRouter:
    """Route reads for the same session to the same replica for monotonic reads."""

    def __init__(self, replicas: List):
        self.replicas = replicas

    def get_replica_for_session(self, session_id: str):
        """Deterministically pick a replica for a session using consistent hashing."""
        h = int(hashlib.md5(session_id.encode()).hexdigest(), 16)
        idx = h % len(self.replicas)
        return self.replicas[idx]

    def read(self, session_id: str, query: str, params: tuple):
        replica = self.get_replica_for_session(session_id)
        try:
            return replica.fetchone(query, params)
        except ConnectionError:
            # Replica failed — monotonic reads may be briefly violated
            # during failover; acceptable trade-off
            for r in self.replicas:
                if r != replica:
                    try:
                        return r.fetchone(query, params)
                    except ConnectionError:
                        continue
            raise Exception("All replicas unavailable")
```

**Testing consistency guarantees with a linearizability checker:**

```python
from dataclasses import dataclass
from typing import Any, Optional
import time

@dataclass
class Operation:
    op_type: str        # "write" or "read"
    key: str
    value: Any
    start_time: float
    end_time: float
    result: Optional[Any] = None

def check_linearizability(operations: list[Operation]) -> bool:
    """
    Simplified linearizability check: for each read, verify that
    if the read starts after a write completes, it returns the written value.
    This is a simplified version of the full Herlihy linearizability check.
    """
    writes = [op for op in operations if op.op_type == "write"]
    reads = [op for op in operations if op.op_type == "read"]

    for read in reads:
        # Find all writes that completed before this read started
        completed_writes = [
            w for w in writes
            if w.key == read.key and w.end_time < read.start_time
        ]
        if not completed_writes:
            continue  # No writes completed before this read — any value is valid

        # The most recent completed write determines what we should see
        latest_write = max(completed_writes, key=lambda w: w.end_time)
        if read.result != latest_write.value:
            print(f"Linearizability violation: read {read.result} but expected {latest_write.value}")
            print(f"  Write completed at {latest_write.end_time}, read started at {read.start_time}")
            return False

    return True
```

## When to Use / When NOT to Use

**Linearizability — use when:**
- Distributed locking, leader election, or constraint enforcement (unique usernames, one leader)
- Financial transactions where double-spending or double-booking cannot occur
- Any operation where a user must immediately see the result of their own mutation

**Linearizability — avoid when:**
- Your system spans multiple geographic regions (the latency cost is prohibitive)
- You can tolerate any form of stale reads
- High throughput is more important than strict consistency

**Causal consistency — use when:**
- You need conversation threads, comment trees, or any causally ordered content
- You're building collaborative editing features where order of operations matters
- You want consistency stronger than eventual but cannot afford linearizability's latency

**Eventual consistency — use when:**
- Approximate values are acceptable (view counts, like counts, metrics)
- The system must be available even during network partitions
- Data naturally converges without conflict (e.g., append-only logs)
- You're building CDN caching, DNS, or other infrastructure where staleness has time bounds

**Read-your-writes — use almost always for user-facing mutations.** Users universally expect to see the result of their own actions immediately. This is the most commonly needed consistency guarantee and the most commonly violated one in systems that route reads to replicas without tracking write LSNs.

## Common Mistakes

**Mistake 1: Assuming your database is linearizable when it isn't.**
PostgreSQL with synchronous_commit=on provides linearizable single-node behavior. PostgreSQL with read replicas does NOT provide linearizability — reads from replicas may see stale data. Many engineers assume that because their database "is ACID," reads from replicas are consistent. ACID applies to single-node transactions; it says nothing about replica reads.

**Mistake 2: Conflating "eventual consistency" with "usually consistent."**
In practice, replication lag in well-managed systems is often under 100ms, which feels like "it's basically always consistent." But "eventual" means you have no upper bound guarantee. During a network partition, replication can stop for minutes or hours. Your application must be correct when the lag is 10 minutes, not just 100ms.

**Mistake 3: Not thinking about monotonic reads when load balancing across replicas.**
Round-robin load balancing across read replicas is a common pattern that violates monotonic reads. Users can see their timeline jump back in time if one replica is ahead and another is behind. The fix is session stickiness or LSN-aware replica routing.

**Mistake 4: Choosing "strong consistency" as a default without understanding the cost.**
In DynamoDB, strongly consistent reads are 2x the cost and have higher latency. In geographically distributed systems, strong consistency may require a round trip to a different continent. Don't default to strong consistency because it's "safer" — understand what consistency level your application actually needs and choose accordingly.

**Mistake 5: Thinking that transactions give you linearizability across a distributed system.**
A transaction within a single database node gives you serializable isolation. A transaction that spans multiple database nodes (e.g., two different shards) requires a distributed transaction protocol (2PC) and may not provide linearizability unless the system explicitly implements it. Know whether your distributed transaction implementation guarantees linearizability or just consistency within each shard.

## Connections

- **Replication (01-replication.md):** Consistency models are the formal description of what you get from a given replication strategy. Async replication → eventual consistency at best. Sync replication to a quorum → possible linearizability.
- **CAP Theorem (04-cap-theorem.md):** CAP directly constrains what consistency you can provide during partitions. Understanding consistency models is prerequisite to understanding CAP.
- **Consensus Algorithms (05-consensus-algorithms.md):** Linearizability requires consensus. Raft and Paxos implement consensus, which is the building block for linearizable systems.
- **Transactions (14-transactions.md):** Isolation levels (read committed, snapshot isolation, serializable) are a parallel taxonomy that intersects with consistency models. Serializable isolation implies sequential consistency for concurrent transactions.
- **Vector Clocks (15-vector-clocks.md):** Causal consistency is implemented using causal tracking mechanisms — version vectors and vector clocks.

## Key Insights

The most important insight is that **consistency is not a single dial — it's a spectrum with multiple dimensions**. Read-your-writes and monotonic reads are orthogonal to linearizability. A system can provide read-your-writes (a property about a single client's reads) without providing linearizability (a property about all clients' reads globally). Understanding which dimension of consistency your application actually needs is the key to making correct trade-offs.

The second insight is that **consistency is ultimately about time and ordering**. Linearizability says operations happen at a single instant in real time, and that instant is visible to all observers immediately. Eventual consistency says operations eventually happen in some order, and all replicas will eventually agree on that order. Every consistency model between them is a different way of constraining what "time" and "order" mean in the distributed context.

The third insight is that **the right consistency level depends on your data semantics, not your comfort level**. Choosing linearizability because it's "safer" is a mistake if your application can tolerate staleness — you're paying a latency and availability tax unnecessarily. Choosing eventual consistency because it's "faster" is a mistake if your application's correctness requires read-your-writes — you'll have bugs that only appear under replication lag conditions, which are often correlated with high traffic events (the worst possible time to discover a consistency bug).

Finally, understand that **most databases don't advertise their exact consistency model clearly**. "ACID" does not mean linearizability across replicas. "Eventual consistency" does not specify the convergence bound. "Strong consistency" means different things to different vendors. Read the documentation carefully — especially the sections about replication, replica reads, and failover behavior — and test your assumptions against the actual system behavior, not the marketing description.
