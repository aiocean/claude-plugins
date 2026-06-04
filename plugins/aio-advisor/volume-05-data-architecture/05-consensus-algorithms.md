# Consensus — Paxos, Raft, and Zab

> "Consensus is one of the most important and fundamental problems in distributed computing. On the surface, it seems simple: several nodes need to agree on a value. But it turns out to be surprisingly tricky to get right, especially in the face of failures." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

Imagine five database nodes that must elect a leader. Each node is running an election algorithm. Node 1 thinks it should be the leader. Node 3 thinks it should be the leader. Node 5 thinks it should be the leader. If all three are simultaneously elected leader, all three start accepting writes. The cluster now has three sources of truth. The data diverges catastrophically.

Or imagine a distributed lock service. Two application servers simultaneously request the lock on the same resource. The lock service has three replica nodes. Each application server is communicating with a different subset of the lock service nodes. If the lock service doesn't coordinate correctly, both application servers might receive "lock granted." Now both think they have exclusive access to a resource and proceed to update it simultaneously.

Or imagine a configuration management system where you need to atomically update the configuration of 100 services: either all see the new configuration or none do. If you update them one by one, some services are running with the new configuration while others are running with the old. During the transition window, your system is in an inconsistent state.

All three of these problems — leader election, distributed locking, atomic configuration updates — are instances of the **consensus problem**: getting multiple nodes in a distributed system to agree on a single value. Consensus sounds trivially easy until you add the constraint that makes it hard: **some nodes might fail or be unreachable during the agreement process, but the protocol must still terminate with all surviving nodes agreeing on the same value.**

The FLP impossibility result (Fischer, Lynch, Paterson, 1985) proved that it is impossible to guarantee consensus in a fully asynchronous system if even one node can fail. This doesn't mean consensus is useless — it means consensus algorithms must make assumptions about timing or use probabilistic arguments. In practice, consensus algorithms assume that messages are eventually delivered (even if arbitrarily delayed) and that nodes fail by crashing (not by sending arbitrary corrupt messages — the "Byzantine fault" model).

## Core Concept

### The Consensus Problem Formally

A consensus algorithm must satisfy three properties:

1. **Agreement:** All non-faulty nodes decide on the same value.
2. **Validity:** The decided value must have been proposed by some node.
3. **Termination:** All non-faulty nodes eventually decide on a value.

Additionally, consensus algorithms for replicated state machines (like Raft) must preserve **linearizability**: the agreed-upon sequence of operations must be equivalent to some sequential execution.

The key insight of all practical consensus algorithms: a **majority quorum** (more than n/2 nodes) can make progress even when a minority of nodes have failed. Because any two majorities overlap in at least one node, any two decisions must have at least one node in common — which ensures they cannot have decided on different values.

```
5 nodes: [N1, N2, N3, N4, N5]
Majority quorum: any 3 of 5

Quorum A: {N1, N2, N3}
Quorum B: {N3, N4, N5}
Overlap:  {N3}  -- At least one node is in both quorums
```

### Paxos — The Original and Notoriously Hard to Understand

Leslie Lamport introduced Paxos in 1989 (circulated as a technical report; published in 1998 after Lamport famously complained that reviewers found it too unconventional). Paxos is provably correct and remains the theoretical foundation for most consensus work.

**Basic Paxos** (single-value consensus) has two phases:

**Phase 1 (Prepare/Promise):**
A **proposer** chooses a proposal number `n` (monotonically increasing) and sends `Prepare(n)` to a majority of **acceptors**. Each acceptor responds with a **promise**: "I will not accept any proposal numbered less than n." The response also includes the highest-numbered proposal the acceptor has already accepted (if any).

```
Proposer                    Acceptors
  |-- Prepare(n=5) -------> A1, A2, A3
  |<- Promise(n=5,          A1: "I promise. Highest accepted: (n=3, v=foo)"
  |           highest=3,v=foo)  A2: "I promise. Highest accepted: none"
  |<- Promise(n=5, none)    A3: "I promise. Highest accepted: (n=2, v=bar)"
```

**Phase 2 (Accept/Accepted):**
The proposer picks a value (if any acceptor returned an already-accepted value, the proposer must use the highest-numbered one; otherwise it can propose any value) and sends `Accept(n, v)`. Acceptors that haven't promised to ignore n accept the proposal and respond `Accepted`. If a majority accepts, consensus is reached.

```
Proposer                    Acceptors
  |-- Accept(n=5, v=foo) -> A1, A2, A3  (v=foo because highest prior was n=3, v=foo)
  |<- Accepted(n=5, v=foo)  A1: "Accepted"
  |<- Accepted(n=5, v=foo)  A2: "Accepted"
  |<- Accepted(n=5, v=foo)  A3: "Accepted"

Consensus reached: v=foo
```

**Multi-Paxos** extends Basic Paxos for a sequence of values (a replicated log). A single leader is elected through Phase 1 and then skips Phase 1 for subsequent values (using the same proposal number for all). This is how databases use Paxos: to agree on a sequence of log entries.

Paxos's weakness is that the paper doesn't specify how to handle the many practical details: leader election, handling concurrent proposers, log compaction, membership changes. Each implementation has filled these gaps differently, leading to implementations that are "like Paxos" but not strictly Paxos. Google's Chubby uses Multi-Paxos but has extensive undocumented extensions. The "Paxos is easy to implement" claim is not validated by production experience.

### Raft — Consensus Designed for Understandability

Diego Ongaro and John Ousterhout designed Raft (2013) with a single explicit goal: be understandable. They decomposed consensus into three relatively independent subproblems:

1. **Leader election:** At any time, exactly one server is the leader.
2. **Log replication:** The leader accepts log entries from clients and replicates them across the cluster.
3. **Safety:** If any server has applied a log entry at a given index, no other server will ever apply a different command for that index.

**Terms:** Raft divides time into terms, numbered with consecutive integers. Each term begins with a leader election. If a candidate wins the election, it serves as leader for the rest of the term. If no winner, a new term begins.

```
Time: --[Term 1]----[Term 2]--[Term 3]--------[Term 4]----------->
           |            |         |                |
         Leader 1    Election  Leader 3          Leader 4
                      (split    elected           elected
                       vote,
                       no winner)
```

**Leader Election:**

When a follower node doesn't hear from a leader within an **election timeout** (typically 150-300ms, randomized per node to reduce split votes), it becomes a candidate, increments the term counter, and sends `RequestVote` RPCs to other nodes. A node grants its vote to the first candidate it hears from in a given term (as long as the candidate's log is at least as up-to-date as the voter's log). A candidate that receives votes from a majority becomes the new leader.

```
Follower timeout -> Candidate:
  Increment term to T+1
  Vote for self
  Send RequestVote(term=T+1, candidateId=self, lastLogIndex, lastLogTerm) to all

On receiving RequestVote:
  If term >= my term AND I haven't voted this term AND candidate log >= my log:
    Vote granted
    Reset election timeout
```

**Log Replication:**

The leader appends client commands to its log and sends `AppendEntries` RPCs to all followers. Followers append the entries and acknowledge. Once a majority of nodes have written an entry, the leader commits it (applies it to the state machine) and informs followers of the commit in the next `AppendEntries`.

```
Leader log: [1:x=3] [2:y=7] [3:z=1] (committed) [4:w=9] (not yet committed)
                                                   ^
                                                   Waiting for majority ack

Follower 1: [1:x=3] [2:y=7] [3:z=1] [4:w=9]  <- Acked
Follower 2: [1:x=3] [2:y=7] [3:z=1]            <- Behind
Follower 3: [1:x=3] [2:y=7] [3:z=1] [4:w=9]  <- Acked

Majority (3 of 5 including leader) have [4:w=9] -> Commit!
```

**Raft's safety guarantee:** A leader is never allowed to overwrite its own log. This, combined with the election restriction (only nodes with up-to-date logs can win elections), ensures that committed entries are never lost.

Raft is used by etcd (Kubernetes' backing store), CockroachDB, TiKV, InfluxDB, and many other systems.

### Zab — ZooKeeper's Atomic Broadcast

Apache ZooKeeper uses Zab (ZooKeeper Atomic Broadcast), designed specifically for the primary-backup model. Like Raft, Zab elects a single leader (called the "primary" in Zab) and has the primary broadcast all writes to followers.

Zab's key distinction from Raft is that it provides **total order broadcast** as a first-class primitive, rather than deriving it from single-value consensus. Total order broadcast means: all non-faulty nodes deliver all messages in the same order. This is the fundamental primitive needed for replicated state machines.

Zab has three phases:
1. **Discovery:** A new leader discovers the latest state from a quorum of followers.
2. **Synchronization:** The leader ensures all followers have the same history before accepting new writes.
3. **Broadcast:** Normal operation — the leader broadcasts writes, followers acknowledge.

ZooKeeper uses Zab to implement its coordination primitives: ephemeral nodes (which exist only while the creating client is connected), watches (notifications when a node changes), and sequential nodes (for distributed queues and leader election).

### The Equivalence of Consensus Primitives

A deep insight from distributed systems theory: **consensus, total order broadcast, linearizable read/write registers, and atomic transactions are all equivalent in expressive power**. A system that can implement any one of them can implement all the others.

This explains why ZooKeeper (which implements total order broadcast via Zab) can be used as a building block for distributed locks, leader election, configuration management, and service discovery — all of which are consensus problems in disguise.

## Deep Dive

The FLP impossibility result (Fischer, Lynch, Paterson, 1985) is the foundational constraint on consensus algorithms, and it is worth stating precisely. In a fully asynchronous system — one where message delays are unbounded and no process can distinguish a crashed peer from a very slow one — it is impossible to design a deterministic algorithm that is guaranteed to reach consensus even if only one process may fail. The proof is elegant: any algorithm that always terminates must have a configuration where a single process failure can cause it to remain undecided indefinitely. Practical systems escape this impossibility by introducing timeouts: a process that does not hear from the leader within a bounded time assumes failure and starts an election. The timeout assumption is a synchrony assumption — it says the system is not fully asynchronous. But in practice, real networks and real hardware do behave synchronously enough for timeouts to work reliably. Raft's randomized election timeouts (150–300ms, randomly chosen per node) reduce the probability of split votes on each election attempt; while two nodes may time out simultaneously on the first attempt, the probability of this repeating indefinitely decreases exponentially.

Paxos's notorious difficulty is not in its correctness proof — that is elegant — but in the gap between the single-decree Paxos described in Lamport's paper and a production-ready replicated state machine. The paper describes how to agree on a single value. A database needs to agree on a sequence of values (log entries). Multi-Paxos handles this by electing a stable leader who can skip Phase 1 for subsequent log entries (using the same proposal number for the entire term), reducing the normal-case commit to a single round trip. But Multi-Paxos says nothing about leader election itself, log compaction, membership changes (adding or removing nodes), or handling the case where a candidate has an incomplete log. Each production Paxos implementation (Chubby, Zookeeper's Zab, Spanner's per-shard Paxos) filled these gaps differently, accumulating undocumented complexity. Ongaro and Ousterhout (2014) designed Raft specifically to address this: they decomposed the problem into leader election, log replication, and safety (the restriction that only up-to-date nodes can become leaders), and specified each component completely. Raft's contribution is not efficiency — it can be less efficient than optimized Multi-Paxos — but full specification of all the cases a production implementation must handle.

Raft's log safety guarantee rests on a single rule: a candidate can only win an election if its log is at least as up-to-date as the majority's log. "Up-to-date" means: higher term in the last entry, or equal term with equal or longer log. This rule ensures that any elected leader has all committed entries. Combined with the commit rule — an entry is committed only after a majority acknowledges it — this ensures committed entries are never lost even through leader failures. The formal safety proof in the Raft paper uses induction on terms: if the invariant holds for all terms before T, it holds for term T as well. This proof structure is what makes Raft debuggable: the state machine has a small number of clearly defined states (follower, candidate, leader), and each transition is specified with explicit preconditions.

The equivalence of consensus primitives is a deep theoretical result that explains why consensus systems are so powerful as building blocks. Herlihy (1991) proved that a linearizable read/write register, an atomic commit (transaction), and a consensus object are all equivalent in terms of what problems they can solve. If you can implement any one of them, you can implement all the others. This is why etcd (a Raft consensus system) can serve as a distributed lock, a leader election service, a configuration store, and a service registry — all four are just consensus problems in different dressing. Kleppmann extends this observation: total order broadcast (delivering messages to all nodes in the same order) is equivalent to consensus, and linearizable storage is equivalent to consensus. Every system that needs linearizability, somewhere in its implementation, runs consensus. The question is whether that consensus is explicit (Raft, Paxos) or hidden (the single-leader in a single-leader replication scheme is implicitly the consensus outcome).

Performance in consensus systems is dominated by two factors: the number of network round trips per commit and disk fsync latency. A standard Raft commit requires one round trip: the leader sends AppendEntries, waits for majority acknowledgment, then commits. At 1ms intra-datacenter latency, this limits throughput to roughly 500 commits per second per log. Batching — appending multiple entries per round trip — allows a single Raft group to achieve tens of thousands of commits per second in a datacenter. The Physalia approach ("Millions of Tiny Databases," 2020) inverts the scaling strategy: rather than one large consensus group handling everything, run millions of independent 7-node consensus groups each responsible for a tiny slice of metadata. Quorum decisions within each group are local and fast; the groups are isolated so a slow group does not affect others. This is a profound architecture insight: the scalability of consensus is often better achieved by proliferating small groups than by optimizing large ones.

## Implementation Guide

**Raft leader election in pseudocode:**

```python
import random
import time
import threading
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, List

class NodeState(Enum):
    FOLLOWER = "follower"
    CANDIDATE = "candidate"
    LEADER = "leader"

@dataclass
class RaftNode:
    node_id: int
    peers: List  # List of peer RaftNode references
    state: NodeState = NodeState.FOLLOWER
    current_term: int = 0
    voted_for: Optional[int] = None
    log: List = field(default_factory=list)
    commit_index: int = -1
    last_applied: int = -1
    votes_received: int = 0
    election_timeout: float = 0.0
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def reset_election_timeout(self):
        # Randomized timeout between 150ms and 300ms
        self.election_timeout = time.time() + random.uniform(0.15, 0.30)

    def start_election(self):
        with self._lock:
            self.state = NodeState.CANDIDATE
            self.current_term += 1
            self.voted_for = self.node_id  # Vote for self
            self.votes_received = 1
            term = self.current_term
            last_log_index = len(self.log) - 1
            last_log_term = self.log[-1]['term'] if self.log else -1

        # Send RequestVote to all peers
        for peer in self.peers:
            threading.Thread(
                target=self._send_request_vote,
                args=(peer, term, last_log_index, last_log_term)
            ).start()

        self.reset_election_timeout()

    def _send_request_vote(self, peer, term, last_log_index, last_log_term):
        try:
            vote_granted = peer.handle_request_vote(
                term=term,
                candidate_id=self.node_id,
                last_log_index=last_log_index,
                last_log_term=last_log_term
            )
            if vote_granted:
                with self._lock:
                    if self.state == NodeState.CANDIDATE and self.current_term == term:
                        self.votes_received += 1
                        if self.votes_received > (len(self.peers) + 1) / 2:
                            self._become_leader()
        except Exception:
            pass  # Network failure — ignore

    def handle_request_vote(self, term: int, candidate_id: int,
                            last_log_index: int, last_log_term: int) -> bool:
        with self._lock:
            if term < self.current_term:
                return False  # Stale term — reject

            if term > self.current_term:
                self.current_term = term
                self.state = NodeState.FOLLOWER
                self.voted_for = None

            # Check if candidate's log is at least as up-to-date as ours
            my_last_log_index = len(self.log) - 1
            my_last_log_term = self.log[-1]['term'] if self.log else -1

            log_ok = (last_log_term > my_last_log_term or
                      (last_log_term == my_last_log_term and
                       last_log_index >= my_last_log_index))

            if (self.voted_for is None or self.voted_for == candidate_id) and log_ok:
                self.voted_for = candidate_id
                self.reset_election_timeout()
                return True

            return False

    def _become_leader(self):
        self.state = NodeState.LEADER
        print(f"Node {self.node_id} became leader for term {self.current_term}")
        # Initialize nextIndex and matchIndex for each peer
        # Start sending heartbeat AppendEntries
```

**Using etcd for distributed lock (Raft-based consensus in practice):**

```python
import etcd3
import time
from contextlib import contextmanager

class DistributedLock:
    """
    Distributed lock backed by etcd (Raft consensus).
    Guarantees exactly-once lock ownership across the cluster.
    """
    def __init__(self, etcd_client: etcd3.Etcd3Client, lock_name: str, ttl: int = 30):
        self.client = etcd_client
        self.lock_name = f"/locks/{lock_name}"
        self.ttl = ttl
        self._lease = None

    @contextmanager
    def acquire(self, timeout: float = 10.0):
        """Acquire the lock using etcd's lease mechanism."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            # Create a lease (auto-released if client disconnects)
            lease = self.client.lease(self.ttl)
            # Try to put our lease ID as the lock value, only if key doesn't exist
            # This is an atomic compare-and-swap operation via etcd's Raft consensus
            success, _ = self.client.transaction(
                compare=[self.client.transactions.version(self.lock_name) == 0],
                success=[self.client.transactions.put(
                    self.lock_name, str(lease.id), lease=lease
                )],
                failure=[]
            )
            if success:
                self._lease = lease
                try:
                    yield self  # Lock acquired
                    return
                finally:
                    self._release()

            # Lock not acquired — wait for it to be released
            events, _ = self.client.watch(self.lock_name, timeout=deadline - time.time())
            for event in events:
                if hasattr(event, 'type') and event.type == 'DELETE':
                    break  # Lock released, retry

        raise TimeoutError(f"Could not acquire lock '{self.lock_name}' within {timeout}s")

    def _release(self):
        if self._lease:
            self._lease.revoke()  # Releasing the lease deletes the lock key
            self._lease = None
```

## When to Use / When NOT to Use

**Use consensus (via ZooKeeper, etcd, or Consul) when:**
- You need distributed leader election with exactly-one-leader guarantee
- You need distributed locks with automatic release on failure (ephemeral leases)
- You need strongly consistent configuration storage (all services see the same config atomically)
- You need service discovery with health checking and consistent registration

**Avoid consensus when:**
- You're using it for data storage at scale — consensus systems are designed for coordination metadata, not large datasets. ZooKeeper's data limit per node is 1MB. etcd is not a general-purpose database.
- Your throughput requirement exceeds what a consensus group can handle — a 3-node Raft group typically handles 10,000-100,000 operations per second. If you need millions per second, consensus is not the path.
- You're building an eventually consistent system — consensus is expensive, and many use cases (shopping carts, timelines, analytics) don't need it.

**Choose Raft over Paxos when:**
- You're implementing consensus from scratch — Raft is significantly easier to implement correctly
- You need a well-understood algorithm that your team can reason about and debug
- You want an active open-source ecosystem (etcd, CockroachDB, TiKV)

**Choose Paxos when:**
- You're building on an existing Paxos implementation (Chubby, Zookeeper's Zab is Paxos-like)
- You need Multi-Paxos's pipeline optimizations for maximum throughput
- You have the expertise — Google and Amazon use Paxos variants precisely because their teams have deep expertise

## Common Mistakes

**Mistake 1: Using ZooKeeper or etcd as a general-purpose database.**
ZooKeeper is for coordination metadata — locks, leader election, configuration. Using it to store application data causes performance issues (consensus has overhead), capacity issues (ZooKeeper limits node size), and operational complexity. Store data in a database; use ZooKeeper/etcd only for coordination.

**Mistake 2: Forgetting that even with consensus, a "leader" can be stale during a partition.**
Raft guarantees that at most one leader exists per term. But there is a brief period after a network partition where the old leader may not know it has been deposed. During this window, the old leader may respond to reads with stale data. Linearizable reads require either routing reads through the Raft log (expensive) or confirming with a quorum before responding.

**Mistake 3: Underestimating the impact of disk I/O on consensus performance.**
Raft and Paxos require that log entries be durably written to disk before acknowledging them. This means consensus performance is bounded by disk fsync latency — typically 1-10ms for SSDs, much more for spinning disks. A 5ms fsync allows at most 200 commits per second per log. This is why high-performance consensus systems (like Spanner) use locally attached NVMe SSDs and stripe across multiple disks.

**Mistake 4: Not handling the two-generals problem in network code.**
When a leader sends an AppendEntries request and doesn't receive a response, it doesn't know whether the request was received or not. The follower may have appended the entry and the ACK was lost, or the request itself was lost. Leaders must be prepared to retry idempotently, and followers must handle duplicate entries gracefully. Not handling this correctly causes entries to be applied twice.

**Mistake 5: Running a consensus cluster with an even number of nodes.**
A 4-node cluster requires 3 nodes for a quorum — just like a 5-node cluster. But if the 4-node cluster splits 2-2, neither half has a quorum and the whole cluster stops. A 5-node cluster splitting 3-2 still has one functional half. Run 3, 5, or 7 nodes — never 4 or 6.

## Connections

- **Replication (01-replication.md):** Consensus is the mechanism by which single-leader replication elects and agrees on the leader. Without consensus, you have split-brain risk during failover.
- **Consistency Models (03-consistency-models.md):** Consensus enables linearizability. Without a consensus protocol, linearizable reads require routing to a single node, which is a single point of failure.
- **CAP Theorem (04-cap-theorem.md):** CP systems use consensus to ensure that during a partition, a quorum decision is made. The minority side stops responding — the price of consistency.
- **Transactions (14-transactions.md):** Distributed transactions (2PC) require agreement between transaction participants, which is a consensus problem. Raft/Paxos are used for each shard's replication; 2PC is used for cross-shard transactions.

## Key Insights

The most important insight about consensus is that **it is a building block, not an end goal**. You don't run Raft so you can have Raft — you run Raft so you can have a replicated state machine that behaves like a single node. Raft gives you distributed locks, leader election, and configuration storage because all of these reduce to maintaining consistent replicated state.

The second insight is that **Raft's "understandability" is not just pedagogical — it's operational**. When your etcd cluster loses its leader at 3 AM and your Kubernetes cluster stops scheduling pods, you need to be able to understand what's happening and intervene. Raft's clear state machine (Follower → Candidate → Leader) with well-defined transitions makes it debuggable in ways that multi-Paxos is not.

The third insight is that **consensus performance is dominated by network round-trips, not computation**. A Raft commit requires one round trip (leader → majority of followers → leader). At 1ms network latency, this limits you to ~1000 commits per second. At 100μs network latency (within a datacenter), you can achieve ~10,000 commits per second. This is why consensus groups must be geographically co-located, and why global consensus (across data centers) is so expensive.

Finally, understand that **the FLP impossibility result is not a barrier in practice**. FLP says you cannot guarantee consensus in a fully asynchronous system with even one failure. Real systems are not fully asynchronous — they have timeouts, and network messages are eventually delivered. Raft uses randomized election timeouts to break symmetry and ensure liveness. The impossibility is theoretical; practical consensus algorithms work reliably in real networks.
