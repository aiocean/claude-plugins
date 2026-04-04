# Quorum — Read, Write, and Sloppy

> "A quorum is the minimum number of members that must be present at any of its meetings to make the proceedings of that meeting valid." — Parliamentary procedure definition, adapted by distributed systems engineers to mean something subtler and more treacherous.

## The Problem

You have a key-value store replicated across five nodes for fault tolerance. A client writes a value — say, the balance in a bank account is updated from $100 to $150. The write reaches three of the five nodes before two of them become temporarily unreachable due to a network hiccup. Now a read comes in. It also reaches three nodes — but which three? If it happens to hit the two nodes that did not receive the write, it reads the stale value $100. The account balance appears to be $100 when it should be $150.

This is the fundamental tension in replicated storage: the more nodes you replicate to for durability, the more nodes you might read from stale data. Quorum is the mathematical solution to this tension. It gives you a precise formula for choosing how many nodes you must write to and how many you must read from to guarantee you always see the most recent write.

But quorum is not a single setting — it is a dial. Turn it one way and you get strong consistency at the cost of availability. Turn it the other way and you get high availability at the cost of consistency. The art is knowing where to set it for your use case, and understanding what guarantees you are actually getting at each setting.

## Core Concept

### The Basic Quorum Formula

For a cluster of N replicas, with W nodes required for a write to succeed and R nodes required for a read to succeed:

**R + W > N guarantees that at least one node in every read set overlaps with every write set.**

If at least one node in the read set participated in the most recent write, it holds the most recent data, and a read repair or version comparison can return the correct value.

```
N = 5 replicas

Example: W=3, R=3  →  R+W = 6 > 5 ✓ (strong consistency)

Write reaches: [N1, N2, N3]     (W=3 nodes)
Read  reaches: [N3, N4, N5]     (R=3 nodes)
Overlap:       [N3]             ← at least one node has the latest value

Example: W=2, R=2  →  R+W = 4 < 5 ✗ (no consistency guarantee)

Write reaches: [N1, N2]
Read  reaches: [N3, N4]
Overlap:       []               ← no overlap possible, stale read likely
```

### Common Quorum Configurations

```
N=3 cluster:

W=2, R=2 → R+W=4 > 3  Strong consistency, tolerates 1 failure per operation
W=1, R=3 → R+W=4 > 3  Writes fast, reads must check all (read-heavy workloads)
W=3, R=1 → R+W=4 > 3  Writes slow (all must ack), reads fast (write-heavy with fast reads)
W=1, R=1 → R+W=2 < 3  Maximum throughput, no consistency guarantee

N=5 cluster (Dynamo default):

W=3, R=3 → R+W=6 > 5  Strong consistency
W=2, R=3 → R+W=5 = 5  Borderline (need R+W > N, not >=, for strict guarantee)
W=1, R=1 → R+W=2 < 5  Eventual consistency (Dynamo's default for high availability)
```

### What R+W > N Actually Gives You

The overlap guarantee means: *if no writes happen between a write and a subsequent read, the read will see the written value*. This is **read-your-writes consistency** (if the same client reads after writing) and **monotonic read consistency** (subsequent reads never go backward in time).

However, quorum alone does not give you **linearizability** (the strongest consistency model). For linearizability, you need quorum plus version vectors or timestamps to resolve conflicts when reads see multiple versions from overlapping nodes, plus a protocol that ensures the latest version is returned even when reads and writes race.

### Sloppy Quorum: Trading Consistency for Availability

Classic quorum is "strict" — writes must reach W of the N nodes designated for the key. If fewer than W of those N nodes are available, the write fails. This maintains consistency but sacrifices availability.

**Sloppy quorum** relaxes this: if the designated nodes are unavailable, write to any W nodes in the cluster. The data will be delivered to the correct nodes later via **hinted handoff**.

```
Strict quorum (N=5, W=3):

Key K is owned by [N1, N2, N3, N4, N5] (the "preference list")
N1, N2 are down → only N3, N4, N5 available → write succeeds (W=3 met)
N1, N2, N3 are down → only N4, N5 available → write FAILS (cannot reach W=3)

Sloppy quorum (N=5, W=3):

N1, N2, N3 are down → N4, N5, N6 available (N6 is outside preference list)
Write to N4, N5, N6 with a hint: "deliver to N1 when it recovers"
Write SUCCEEDS
When N1 recovers, N6 sends the hinted data to N1, then deletes its copy
```

Sloppy quorum dramatically improves write availability during partial outages. The cost: reads during the outage may not find the latest value, because it was written to hint holders outside the preference list. Sloppy quorum provides **eventual consistency** — after hinted handoff completes, the data converges to consistency.

### Read Repair and Anti-Entropy

Quorum reads often receive multiple versions of a value from different replicas. What do you do with them?

**Read repair**: When a read returns values from R replicas and detects that some replicas have stale data (via version vectors or timestamps), it proactively updates the stale replicas with the latest value. This is done synchronously (before returning to the client) or asynchronously (after returning).

```
Read from [N1, N2, N3]:

N1 → value=150, version=2   ← latest
N2 → value=150, version=2   ← same
N3 → value=100, version=1   ← stale

Client receives: 150 (latest version)
Background read repair: write version=2 (value=150) to N3
```

**Anti-entropy with Merkle trees**: Read repair only fixes replicas that happen to be read. Replicas that are never read can diverge indefinitely. Anti-entropy is a background process that periodically compares all replicas and synchronizes diverged data.

Comparing full replicas is expensive — you would need to transmit all the data. **Merkle trees** make this efficient. A Merkle tree hashes data hierarchically: leaf nodes hash individual records, parent nodes hash their children, root hashes the entire dataset. Two replicas with identical data have identical Merkle tree roots. If roots differ, you binary-search the tree to find exactly which key ranges differ, transmitting only the hashes (not the data) until you identify the inconsistencies.

```
Merkle Tree comparison:

Node A root:    hash(ABCD)
Node B root:    hash(ABcD)  ← lowercase c = different
                                ↓ roots differ, recurse
Node A left:    hash(AB)
Node B left:    hash(AB)    ← same, skip this subtree
                                ↓ left branch is identical
Node A right:   hash(CD)
Node B right:   hash(cD)    ← differ, recurse
                                ↓
Node A leaf C:  hash(record_c_v2)
Node B leaf c:  hash(record_c_v1)  ← stale!

Only synchronize: record C
```

Cassandra, Riak, and DynamoDB all use Merkle trees for anti-entropy.

## Deep Dive

### Quorum in the Dynamo Paper: Choosing Availability Over Consistency

The Dynamo paper's treatment of quorum is one of the most instructive examples of principled trade-off reasoning in the distributed systems literature. The paper does not present quorum as a fixed setting — it presents it as a dial, and then explains *why* Amazon set the dial where they did for the shopping cart.

The shopping cart use case has an asymmetric failure cost: a failed write (customer adds an item, the write doesn't persist) means a lost customer action — directly bad. A stale read (customer briefly sees an item they removed) is annoying but correctable. Given this asymmetry, Dynamo set W=1 (any single node accepting the write counts as success) and used sloppy quorum to ensure writes almost never fail. Consistency was a secondary concern.

The paper introduces several mechanisms that work together with quorum. Sloppy quorum allows writes to reach "hint holders" outside the preference list when designated nodes are unavailable, with hinted handoff delivering the data when the preferred nodes recover. Read repair, triggered by quorum reads that discover replicas with different versions, propagates the latest value to stale replicas as a side effect of normal reads. Anti-entropy using Merkle trees handles the remaining divergence — Merkle trees allow two replicas to compare their entire key space by exchanging only O(log N) hashes, then synchronizing only the diverged subsets.

The key insight from Dynamo: the R+W > N formula is a necessary condition for the "at least one overlap" guarantee, not a sufficient condition for linearizability. Two concurrent writes can still produce conflicting values at the same version number, and Dynamo explicitly accepts this by using vector clocks and multi-value registers rather than preventing concurrent writes entirely.

### Quorum and Tail Latency: The Hidden Cost

The Dynamo paper includes a critical observation that is frequently overlooked: waiting for a quorum of responses means waiting for the *R-th fastest* responder out of N nodes. With N=3 and R=2, every quorum read waits for the 2nd-fastest response. If one replica is experiencing a garbage collection pause or transient network congestion, the read latency spikes to match that slow replica's response time.

This is why production systems that prioritize latency often configure R=1 and W=2 (writes are durable, reads are fast but potentially stale), or use hedged requests — sending the read to all N replicas and returning the first response, with a background check for consistency. The tail latency problem with quorum is not a configuration bug; it is a fundamental consequence of waiting for multiple independent systems to respond.

Martin Kleppmann's *Designing Data-Intensive Applications* (2017) provides the clearest published treatment of why quorum with R+W > N does not give linearizability. Even with the overlap guarantee, a read that sees a value at version V does not prevent another read from seeing version V-1 if it contacts a different (but still overlapping) set of replicas. Linearizability requires that reads see the latest write in real time, which requires coordination beyond simple overlap counts — specifically, a leader-based protocol like Raft, or read repair that completes synchronously before returning to the client.

## Implementation Guide

### Implementing Quorum Read with Version Vectors

```python
from dataclasses import dataclass
from typing import Optional
import asyncio

@dataclass
class VersionedValue:
    value: any
    version: int  # Lamport timestamp or vector clock

class QuorumStore:
    def __init__(self, nodes: list, n: int, w: int, r: int):
        self.nodes = nodes  # All replica nodes
        self.n = n          # Replication factor
        self.w = w          # Write quorum
        self.r = r          # Read quorum
    
    async def write(self, key: str, value: any) -> bool:
        """
        Write to W replicas. Returns True if quorum reached.
        """
        # Determine which N nodes own this key (via consistent hash)
        replica_nodes = self._get_replicas(key)
        
        # Get current version to increment
        current = await self._read_any(key, replica_nodes)
        new_version = (current.version + 1) if current else 1
        
        versioned = VersionedValue(value=value, version=new_version)
        
        # Write to all N replicas concurrently
        tasks = [node.write(key, versioned) for node in replica_nodes]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successes
        successes = sum(1 for r in results if r is True)
        
        if successes >= self.w:
            return True  # Quorum reached
        
        # Quorum not reached — write failed
        # In a real system, you might attempt rollback or compensating actions
        raise QuorumNotReachedError(
            f"Write quorum {self.w} not reached: only {successes}/{self.n} succeeded"
        )
    
    async def read(self, key: str) -> Optional[any]:
        """
        Read from R replicas, return latest version, repair stale replicas.
        """
        replica_nodes = self._get_replicas(key)
        
        # Read from all N replicas concurrently
        tasks = [node.read(key) for node in replica_nodes]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Collect successful responses
        responses = [
            (node, result)
            for node, result in zip(replica_nodes, results)
            if isinstance(result, VersionedValue)
        ]
        
        if len(responses) < self.r:
            raise QuorumNotReachedError(
                f"Read quorum {self.r} not reached: only {len(responses)} responded"
            )
        
        # Find the latest version
        latest = max(responses, key=lambda x: x[1].version)
        latest_node, latest_value = latest
        
        # Async read repair: update stale replicas in background
        stale_nodes = [
            node for node, result in responses
            if result.version < latest_value.version
        ]
        if stale_nodes:
            asyncio.create_task(
                self._repair(key, latest_value, stale_nodes)
            )
        
        return latest_value.value
    
    async def _repair(self, key: str, value: VersionedValue, nodes: list):
        """Background read repair — write latest value to stale replicas."""
        tasks = [node.write(key, value) for node in nodes]
        await asyncio.gather(*tasks, return_exceptions=True)
        # Failures during repair are acceptable — anti-entropy will catch them
    
    def _get_replicas(self, key: str) -> list:
        """Return the N nodes responsible for this key via consistent hashing."""
        # Implementation uses the consistent hash ring from Article 02
        return consistent_hash_ring.get_nodes(key, self.n)
```

### Choosing Your Quorum Settings

```
Decision tree for N=3 cluster:

Does your use case require reading the latest value always?
├── YES → Use W=2, R=2 (strong consistency)
│         Tolerates 1 node failure for both reads and writes
│         
└── NO → Can you tolerate occasional stale reads?
         ├── YES, reads >> writes → Use W=3, R=1
         │   (all nodes get writes, reads are fast, writes slow)
         │   
         ├── YES, writes >> reads → Use W=1, R=3  
         │   (writes fast, reads check all replicas)
         │   
         └── YES, need max availability → Use W=1, R=1 with sloppy quorum
             (highest availability, eventual consistency only)
```

## When to Use / When NOT to Use

**Use quorum-based replication when:**
- You need tunable consistency — different operations can have different consistency levels
- You are building a horizontally scalable key-value or document store
- You need high write availability (sloppy quorum) during partial outages
- Your use case can tolerate eventual consistency with occasional stale reads

**Do NOT rely on quorum for:**
- Linearizable (ACID) transactions across multiple keys — quorum gives you per-key consistency, not multi-key atomicity
- Counter increments or other non-idempotent operations where duplicate writes from retries corrupt state — use conditional writes (compare-and-swap) instead
- Use cases requiring strict serializability — you need consensus protocols (Paxos/Raft) for that, not quorum

**The key insight**: Quorum with R+W > N gives you a *probabilistic* strong consistency in practice, but not *linearizability*. For linearizability, you need a coordination protocol like Paxos or Raft. Quorum is weaker but more available and simpler.

## Common Mistakes

**Mistake 1: Assuming R+W > N gives linearizability**
It does not. Concurrent writes can still produce conflicts. You need versioning (vector clocks, Lamport timestamps) plus conflict resolution to handle concurrent writes correctly.

**Mistake 2: Setting W=1 for all writes "for performance"**
W=1 means a write is acknowledged after a single replica stores it. If that single replica fails before replicating, the write is lost. For any data with durability requirements, W ≥ 2.

**Mistake 3: Forgetting that sloppy quorum breaks the overlap guarantee**
When you use sloppy quorum, W nodes may not be from the original preference list. A subsequent strict quorum read (R nodes from the preference list) may not overlap with the sloppy write set. The data is eventually consistent only after hinted handoff completes.

**Mistake 4: Not monitoring hint handoff completion**
Hinted handoff accumulates unreachable data. If a node is down for a long time, hint holders accumulate a large backlog. When the node comes back, it receives a flood of hints that can overload it. Monitor hint backlog size and set TTLs on hints to bound the recovery storm.

**Mistake 5: Ignoring read repair failure rate**
If read repair fails consistently (due to network issues or node overload), stale replicas accumulate. Anti-entropy repairs this eventually, but Merkle tree comparison is expensive. Monitor read repair success rate and anti-entropy execution time.

## Connections

- **Consistent Hashing** (Article 02): Determines which N nodes form the preference list for quorum operations. Quorum and consistent hashing are used together in every practical implementation.
- **CRDTs** (Article 04): When quorum reads detect conflicting concurrent writes, you need a strategy to resolve them. CRDTs are mathematically convergent data types — they resolve conflicts automatically. Using CRDTs as your value type makes conflict resolution trivial.
- **Gossip Protocols** (Article 06): Node membership changes (used to update the consistent hash ring and quorum groups) are disseminated via gossip. Quorum decisions depend on knowing which nodes are alive — gossip-based failure detection provides this.
- **Distributed Transactions** (Article 08): Quorum provides per-key consistency. For multi-key atomic operations, you need distributed transactions on top of quorum. This is why Dynamo's "add to cart" uses quorum but checkout uses a separate transactional system.

## Key Insights

**Insight 1: Quorum is a spectrum, not a binary.** The textbook framing is "quorum = strong consistency." But quorum is actually a sliding scale from W=1/R=1 (effectively no replication consistency) to W=N/R=N (every node must participate). Between these extremes, you tune the balance between consistency, availability, and latency.

**Insight 2: The real cost of quorum is tail latency.** A quorum read waits for R responses — which means waiting for the *slowest* of R responses. With R=3 and N=5, you wait for the 3rd-fastest node out of 5. If one node is slow (GC pause, network congestion), every read that happens to include it in its R set is slowed. This is why Dynamo and Cassandra often use R=1 in practice despite having stronger consistency available.

**Insight 3: Sloppy quorum is a different guarantee than strict quorum.** Sloppy quorum optimizes for availability: writes rarely fail. But the consistency guarantee after a sloppy write is weaker — you are relying on hinted handoff to eventually deliver the data. If a hint holder also fails before delivering its hint, data is lost despite W=3.

**Insight 4: Read repair is a negative feedback loop.** More reads → more opportunities for read repair → fewer stale replicas → fewer repairs needed. This self-healing property means that hot data (frequently accessed) stays more consistent than cold data (rarely accessed). Anti-entropy compensates by ensuring cold data eventually syncs too.

**Insight 5: Quorum is not about majority.** The formula R+W > N does not require R or W to be a majority. With N=10, W=7 and R=4 satisfies R+W > N. The overlap guarantee only requires that some node in the read set participated in the last write — not that most nodes did. This allows asymmetric configurations tuned to read-heavy or write-heavy workloads.
