# CAP Theorem — What It Really Means

> "The CAP theorem, as stated by Gilbert and Lynch, says that a distributed system cannot simultaneously provide all three of the following guarantees: Consistency, Availability, and Partition Tolerance. But almost everything about how this theorem is commonly understood and applied is wrong." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

In 2000, Eric Brewer gave a keynote at the Principles of Distributed Computing conference (PODC) where he conjectured that distributed systems must choose two of three properties: Consistency, Availability, and Partition Tolerance. Two years later, Seth Gilbert and Nancy Lynch published a formal proof. The CAP theorem was born — and with it, one of the most widely misunderstood concepts in software engineering.

Walk into any engineering meeting where a database is being chosen and you'll hear: "We need to be CA, so we'll use PostgreSQL" or "We're CP so Zookeeper makes sense" or "We chose Cassandra because we're AP." These statements range from imprecise to actively harmful. The "two of three" framing implies you make a single choice at system design time and live with it forever — but real distributed systems don't work that way. Partitions are not a design choice you can opt out of; they are a physical reality of any networked system. And "consistency" in CAP means something very specific (linearizability) that is often not what people mean when they say "consistent."

Understanding CAP correctly — what it actually says, what it doesn't say, and how to use it as a design tool rather than a labeling exercise — is essential for designing distributed systems that behave as intended under failure conditions. More importantly, understanding the PACELC theorem (an extension of CAP) gives you the vocabulary to reason about the trade-offs that exist even when there's no partition.

## Core Concept

### What CAP Actually Says

The CAP theorem is a statement about what happens during a **network partition** — when the network between nodes breaks, so some nodes cannot communicate with others.

The three properties:

**Consistency (C in CAP):** This specifically means **linearizability** — every read returns the most recent write, and all nodes see the same data at the same time. This is not "eventual consistency" or even "sequential consistency." It's the strongest form of consistency.

**Availability (A in CAP):** Every request to a non-failed node must receive a response — not a timeout, not an error, but an actual response. Note: this says nothing about whether the response contains current data.

**Partition Tolerance (P in CAP):** The system continues to operate despite arbitrary message loss or delay between nodes.

The theorem says: **during a network partition, you can have C or A, but not both.**

Here is why this is not "pick two of three" but rather "during a partition, pick one of two":

```
Normal operation (no partition):
  Both C and A are achievable simultaneously.
  The only question is latency and throughput.

During a partition:
  Node A ←---X---→ Node B
  (network link is broken)

  If Node A receives a write request:
  Option 1 (C, sacrifice A): Refuse the write (return error).
             Consistency preserved: no one reads stale data.
             Availability violated: the node rejected a request.

  Option 2 (A, sacrifice C): Accept the write, update locally.
             Availability preserved: request succeeded.
             Consistency violated: Node B doesn't know about the write.
             After partition heals, A and B have diverged.
```

Partition tolerance is not a choice. If you're building a system that runs on multiple machines connected by a network, partitions will happen. Network cables get cut. Switches fail. AWS availability zones lose connectivity. Partitions are a fact of life, not a design parameter. Therefore, the real choice is: **during a partition, do you prefer C (refuse requests, stay consistent) or A (accept requests, risk inconsistency)?**

### The "CA" Myth

When people say their system is "CA," they mean they don't expect partitions (so they don't bother with partition tolerance) and they want both consistency and availability. This is coherent only for single-node systems. A single PostgreSQL node with no replication is "CA" in the sense that, absent a partition (which can't happen if there's one node), it provides both consistency and availability.

The moment you add a second node — even just a read replica — you have a networked system, and partitions become possible. At that point, you must decide: during a partition, do you prefer C or A? There is no third option.

The "CA" category is not useless — it describes single-node RDBMS systems correctly. But calling a multi-node system "CA" is a category error.

### CP Systems: Choose Consistency

A CP system prioritizes consistency over availability during partitions. When a partition occurs, the system refuses to serve requests rather than risk returning or accepting inconsistent data.

```
Normal:                       During partition:
C1 → Leader → C2             C1 → [Leader]     [Follower] ← C2
   ↓       ↓                       |                  |
Follower  Follower           accepts writes      refuses requests
                             (quorum achieved)   (no quorum)
```

ZooKeeper is the canonical CP system. It requires a quorum (majority) of nodes to agree before committing any operation. During a partition, if a node cannot reach quorum, it stops serving requests. This means that if you partition ZooKeeper's 5-node cluster into groups of 2 and 3, the group of 2 stops responding, but the group of 3 continues with full consistency.

HBase, etcd, and Consul are also CP. They use ZooKeeper or Raft for coordination, which requires majority agreement before committing.

### AP Systems: Choose Availability

An AP system prioritizes availability over consistency during partitions. When a partition occurs, all nodes continue serving requests, potentially diverging from each other. After the partition heals, diverged data must be reconciled.

```
Normal:                       During partition:
C1 → Node A ←sync→ Node B ← C2    C1 → [Node A]   [Node B] ← C2
                                      accepts        accepts
                                      writes         writes
                                    (diverged state after partition heals)
```

Cassandra is the canonical AP system. During a partition, Cassandra nodes continue accepting reads and writes independently. After the partition heals, Cassandra uses read repair and anti-entropy to reconcile diverged data, with last-writer-wins (or application-defined merge) for conflicts.

CouchDB, Riak, and DynamoDB (with eventual consistency) are also AP.

### PACELC: The Theorem You Should Actually Use

CAP's limitation is that it only describes behavior during partitions, but partitions are rare in well-managed systems. The more common question is: what are the trade-offs in normal operation?

Daniel Abadi proposed the PACELC theorem in 2012:

> If there is a partition (P), a distributed system must choose between availability (A) and consistency (C); else (E), even in the absence of partitions, a distributed system must choose between latency (L) and consistency (C).

The key insight of PACELC: even without partitions, you cannot have both low latency and strong consistency simultaneously. Achieving linearizability requires coordination — waiting for a quorum to acknowledge a write, or routing reads to the leader. Coordination takes time. That time is the latency-consistency trade-off.

```
PACELC classification of major systems:

System          | PA/EL    | Notes
----------------|----------|------------------------------------------
DynamoDB        | PA/EL    | AP system; normal operation trades latency for consistency
Cassandra       | PA/EL    | Tunable; default is PA/EL
Spanner         | PC/EC    | CP system; strong consistency in normal op (using TrueTime)
HBase           | PC/EC    | CP system (uses ZooKeeper)
MongoDB         | PA/EC    | AP in partition, but EC (consistency over latency) normally
MySQL Cluster   | PC/EL    | CP, but optimized for low latency in normal operation
```

The PACELC classification gives you two pieces of information:
1. What does the system do during a partition? (PA vs PC)
2. What does the system prioritize in normal operation? (EL vs EC)

A system that is PC/EC (like Spanner) always prioritizes consistency, always. A system that is PA/EL (like Cassandra) always prioritizes availability and latency. Understanding this dual classification helps you choose the right tool for your workload.

## Deep Dive

The CAP theorem's formal statement by Gilbert and Lynch (2002) is narrower than its popular use suggests. The theorem applies only during a network partition — a scenario where messages between some nodes are lost or delayed indefinitely. It says nothing about normal operation. Yet in casual engineering conversation, CAP is treated as a permanent system classification: "we're CP" or "we're AP." This reification of a partition-time property into a system identity is what Kleppmann calls one of the most misused ideas in distributed systems. A system that is CP during partitions can provide excellent availability in normal operation. An AP system during partitions can provide strong consistency when there is no partition. The label collapses a dynamic behavior into a static attribute and obscures more than it reveals.

The more useful framework is PACELC, proposed by Abadi (2012). PACELC asks two questions: during a Partition, does the system choose Availability or Consistency? And Else (during normal operation), does the system trade Latency for Consistency? The second question is what matters for day-to-day performance. Linearizable reads require contacting the leader or a read quorum — adding at minimum one network round-trip. In a datacenter with 0.5ms intra-node latency, this is often tolerable. In a globally distributed system where the nearest quorum member is 60ms away, linearizable reads impose a 60ms floor on read latency. This is the EL/EC trade-off, and it governs every request during normal operation, not just the rare partition case.

The FLP impossibility result (Fischer, Lynch, Paterson, 1985) predates the CAP theorem and establishes a more fundamental limit: in a fully asynchronous system with even one potentially faulty process, it is impossible to guarantee that a consensus algorithm will always terminate. This is related to but distinct from CAP. CAP is about consistency vs availability during partitions. FLP is about the impossibility of guaranteed termination in any asynchronous system with failures. Practical consensus algorithms (Paxos, Raft) escape FLP by using timeouts to detect failure — but timeouts introduce a synchrony assumption (eventually, messages arrive). In practice, "eventually" is what network SLAs provide, which is why consensus works in production despite FLP's theoretical impossibility.

Partition tolerance deserves rehabilitation as a concept. The common complaint is that "you can't opt out of P, so there's really only a C/A choice." This is technically correct but misses the operational dimension. Not all partitions are equal. A brief network hiccup that delays messages by 200ms is a partition, but a system designed for CP can survive it by having a short timeout before declaring a leader election — the brief unavailability during re-election is measured in seconds. A sustained partition that separates two datacenters for 30 minutes forces a genuine C/A choice that lasts 30 minutes. The system's partition handling policy (how long to wait before declaring a partition, how to respond during one, how to reconcile after one heals) determines the practical availability impact of partitions, which vary enormously in duration and scope in real deployments.

Harvest and yield (Fox and Brewer, 1999) offer a more nuanced alternative to the binary C/A choice. Yield is the probability of completing a request (analogous to availability). Harvest is the fraction of the complete answer returned (analogous to consistency). A search engine during a partition can return results from the partitions it can reach rather than either returning nothing (CP behavior) or returning potentially stale full results (AP behavior). This partial-answer model — "here are 80% of the results I could find, the rest is unavailable" — is often the most user-friendly behavior during degraded conditions, and it fits neither the C nor the A bucket neatly. The harvest/yield model acknowledges that graceful degradation along a continuous axis is often preferable to a binary choice.

## Implementation Guide

**Making the CAP choice explicit in your service design:**

```python
from enum import Enum
from dataclasses import dataclass

class PartitionBehavior(Enum):
    CONSISTENCY = "CP"   # Refuse requests during partition
    AVAILABILITY = "AP"  # Accept requests, risk inconsistency

class NormalOperationPriority(Enum):
    LATENCY = "EL"       # Sacrifice consistency for lower latency
    CONSISTENCY = "EC"   # Sacrifice latency for stronger consistency

@dataclass
class DatabasePolicy:
    """
    Explicit documentation of consistency choices.
    This makes the trade-offs visible and reviewable.
    """
    partition_behavior: PartitionBehavior
    normal_operation: NormalOperationPriority
    rationale: str
    acceptable_stale_read_seconds: int  # 0 = linearizable
    acceptable_unavailability_seconds: int  # 0 = always available

# Define policies for different data types in your system
ACCOUNT_BALANCE_POLICY = DatabasePolicy(
    partition_behavior=PartitionBehavior.CONSISTENCY,
    normal_operation=NormalOperationPriority.CONSISTENCY,
    rationale="Double-spend and overdraft risk outweighs availability cost",
    acceptable_stale_read_seconds=0,
    acceptable_unavailability_seconds=30,  # Circuit breaker trips after 30s
)

RECOMMENDATION_POLICY = DatabasePolicy(
    partition_behavior=PartitionBehavior.AVAILABILITY,
    normal_operation=NormalOperationPriority.LATENCY,
    rationale="Stale recommendations are fine; showing none is bad UX",
    acceptable_stale_read_seconds=300,  # 5 minutes staleness is OK
    acceptable_unavailability_seconds=0,  # Must always return something
)
```

**Implementing a circuit breaker that enforces the CAP choice:**

```python
import time
from threading import Lock

class ConsistencyEnforcingCircuitBreaker:
    """
    For CP systems: if we can't confirm consistency (quorum unreachable),
    stop serving requests rather than return potentially stale data.
    """
    def __init__(self, quorum_checker, failure_threshold=3, recovery_timeout=30):
        self.quorum_checker = quorum_checker
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = None
        self.open = False
        self.lock = Lock()

    def can_serve_request(self) -> bool:
        with self.lock:
            if not self.open:
                return True
            # Check if recovery timeout has elapsed
            if time.time() - self.last_failure_time > self.recovery_timeout:
                if self.quorum_checker.has_quorum():
                    self.open = False
                    self.failures = 0
                    return True
            return False

    def record_success(self):
        with self.lock:
            self.failures = 0

    def record_failure(self):
        with self.lock:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.failure_threshold:
                self.open = True  # Circuit open: stop serving (CP behavior)

class AvailabilityFirstCircuitBreaker:
    """
    For AP systems: always serve requests, but flag when we might be inconsistent.
    """
    def serve_with_staleness_warning(self, read_fn, staleness_threshold_seconds: int):
        result = read_fn()  # Always execute, even if potentially stale
        if result.age_seconds > staleness_threshold_seconds:
            result.warnings.append(f"Data may be up to {result.age_seconds}s stale")
        return result  # Return anyway — availability > consistency
```

**Testing partition behavior:**

```python
import subprocess
import time

class PartitionSimulator:
    """
    Simulate network partition using iptables rules (Linux only).
    Use in integration tests to verify your system behaves correctly during partitions.
    """
    def __init__(self, node_ips: list):
        self.node_ips = node_ips

    def create_partition(self, group_a: list, group_b: list):
        """Block traffic between two groups of nodes."""
        for ip_a in group_a:
            for ip_b in group_b:
                subprocess.run(
                    f"iptables -A INPUT -s {ip_b} -d {ip_a} -j DROP",
                    shell=True, check=True
                )
        print(f"Partition created: {group_a} cannot communicate with {group_b}")

    def heal_partition(self, group_a: list, group_b: list):
        """Remove partition rules."""
        for ip_a in group_a:
            for ip_b in group_b:
                subprocess.run(
                    f"iptables -D INPUT -s {ip_b} -d {ip_a} -j DROP",
                    shell=True
                )
        print("Partition healed")

    def test_cp_behavior(self, database_client, group_a: list, group_b: list):
        """Verify that a CP system rejects requests from the minority partition."""
        self.create_partition(group_a, group_b)
        time.sleep(5)  # Wait for partition detection

        # Majority group should still work
        majority_client = database_client.connect(group_a[0])
        assert majority_client.write("key", "value") == "success"

        # Minority group should reject requests
        minority_client = database_client.connect(group_b[0])
        try:
            minority_client.write("key", "other_value")
            assert False, "CP system should have rejected this write"
        except UnavailableError:
            pass  # Correct CP behavior

        self.heal_partition(group_a, group_b)
```

## When to Use / When NOT to Use

**Choose CP (consistency over availability during partitions) when:**
- Data correctness has financial, legal, or safety consequences
- Double-spend, double-booking, or inventory oversell cannot happen
- Users will tolerate brief unavailability more than data corruption
- You're implementing distributed locking or leader election
- Compliance requirements mandate data integrity guarantees

**Choose AP (availability over consistency during partitions) when:**
- Showing potentially stale data is better than showing nothing
- The consequence of inconsistency is annoying but not catastrophic
- High availability is a hard requirement (SLAs with financial penalties)
- Your data model supports merge-able conflict resolution (like shopping carts)
- You're building CDNs, DNS, metrics aggregation, or similar eventually-consistent infrastructure

**Choose EL (latency over consistency in normal operation) when:**
- Response time is a direct business metric (e-commerce conversion rates, user engagement)
- Your users are globally distributed and you cannot afford coordination latency
- Approximate values are acceptable (like counts, analytics)

**Choose EC (consistency over latency in normal operation) when:**
- Users must see the result of their own actions immediately (read-your-writes)
- Data integrity is more important than response time
- You're processing financial transactions or inventory updates

## Common Mistakes

**Mistake 1: Treating CAP as a one-time system design choice.**
Teams choose a database, label it "CP" or "AP," and think the decision is made. In reality, different operations within the same system may need different trade-offs. DynamoDB lets you request strong consistency per read. PostgreSQL with a read replica is CP for reads from the primary but AP for reads from the replica. The choice is per operation, not per system.

**Mistake 2: Treating "partition tolerance" as optional.**
"We're building a CA system because we don't expect partitions" is a statement about your confidence in your network infrastructure. Networks fail. AWS has outages. Cloud regions lose connectivity. The question is not "will we have partitions?" but "how catastrophic will our behavior be when we do?" Designing for no partitions means you have no plan for when they inevitably occur.

**Mistake 3: Conflating CAP consistency with ACID consistency.**
"Consistent" in CAP means linearizable — every read sees the latest write. "Consistent" in ACID means the database moves from one valid state to another (foreign keys are maintained, constraints are satisfied). These are entirely different properties. An AP database that maintains foreign key constraints is not contradicting CAP — it's providing ACID C without CAP C.

**Mistake 4: Ignoring the E in PACELC.**
Most systems don't experience partitions most of the time. The trade-off that matters for day-to-day performance is the latency-consistency trade-off during normal operation (the "else" in PACELC). A system that is PC/EC may be exactly right for your use case even though it's "CP" — don't just optimize for partition behavior, optimize for normal operation too.

**Mistake 5: Choosing AP and not implementing conflict resolution.**
Many teams choose an AP database for availability, accept that writes can diverge during partitions, and then have no plan for resolving conflicts when the partition heals. The Dynamo paper describes several conflict resolution strategies, but they require upfront design. "Last-writer-wins" is the lazy default and loses data. Implement conflict resolution before you need it.

## Connections

- **Consistency Models (03-consistency-models.md):** CAP's "C" is linearizability, one point on the consistency spectrum. Understanding the full spectrum is necessary to choose the right consistency level for your use case.
- **Replication (01-replication.md):** Single-leader replication with synchronous followers is CP. Leaderless replication with eventual consistency is AP. The replication strategy determines the CAP classification.
- **Consensus Algorithms (05-consensus-algorithms.md):** Achieving CP behavior during partitions requires consensus — a majority must agree. Raft and Paxos are the algorithms that make CP possible.
- **Transactions (14-transactions.md):** ACID transactions across a distributed system require choosing C in CAP. Two-phase commit achieves this but at the cost of availability during coordinator failure.

## Key Insights

The most important insight is that **CAP is not a design choice — it's a description of behavior under failure**. You don't "choose CA" or "choose AP." You design your system, and then when a partition occurs, your system will either refuse requests (CP behavior) or continue accepting them (AP behavior). The choice you make during design is whether to implement quorum-based coordination (which produces CP behavior) or not (which produces AP behavior).

The second insight is that **partitions are rare but certain**. In AWS, a single-AZ network partition might occur once a year. A cross-AZ partition might occur once every several years. But you're running many services for many years, so you WILL experience partitions. Design for them.

The third insight is that **PACELC is more useful than CAP for everyday engineering decisions**. The consistency-latency trade-off in normal operation affects every request. The consistency-availability trade-off during partitions affects only a tiny fraction of requests. Optimize first for the normal case (EL vs EC), then decide how to handle the rare partition case (PA vs PC).

Finally, understand that **the "right" CAP choice depends on your data semantics, not on your engineering preferences**. Money, inventory, locks, and unique constraints require CP. User preferences, recommendations, analytics, and social content work fine with AP. Make the choice based on what your data means and what the consequences of inconsistency are — not based on which database is fashionable.
