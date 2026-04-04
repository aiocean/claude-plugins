# Clocks — Logical, Lamport, and TrueTime

> "Time is what prevents everything from happening at once." — John Wheeler. In distributed systems, the problem is that there is no such thing as "at once."

## The Problem

It is 14:00:00.000 UTC on Node A. An event happens — a database write. It is also 14:00:00.000 UTC on Node B. A different database write happens. Which came first?

You cannot know. Even though both wall clocks show the same time, they are different physical clocks on different machines. Clock A might be running 3ms fast. Clock B might be running 7ms slow. The "same time" on both machines could represent a real-world difference of up to 10ms. In high-throughput systems processing millions of events per second, 10ms is an eternity — thousands of events could have occurred in between.

The deeper problem: even if you could synchronize clocks perfectly at one moment, they would immediately begin drifting apart. Quartz oscillators in commodity computers drift by up to 200 parts per million — about 17 seconds per day. NTP (Network Time Protocol) corrects this drift, but NTP introduces its own uncertainty: the correction is only as accurate as the network round-trip time measurement, which can vary by tens of milliseconds.

This means that in a distributed system, you cannot use wall clock timestamps to determine the order of events across machines. Two events with timestamps t1 < t2 on different machines might have actually occurred in the opposite order in physical reality.

Distributed systems researchers solved this problem in two fundamentally different ways. Leslie Lamport's 1978 paper "Time, Clocks, and the Ordering of Events in a Distributed System" provided the first clean solution: logical clocks that give events a consistent ordering without relying on physical time. Decades later, Google built TrueTime — a system that uses GPS receivers and atomic clocks to bound physical clock uncertainty to a known, small interval, enabling global transactions across datacenters.

## Core Concept

### Why Wall Clocks Fail: NTP Drift and Discontinuities

NTP synchronizes clocks by measuring round-trip time to a time server and adjusting the local clock. The precision is bounded by network variance — if the round trip takes 10ms but the outbound and return legs take unequal times, the estimate has error proportional to that asymmetry.

Worse: NTP corrects large clock errors by slewing (gradually adjusting the clock rate) rather than jumping. A clock that is 100ms behind will be artificially sped up until it catches up. During this period, the clock is running faster than real time — which can cause event A (wall clock t=100ms) to appear to occur after event B (wall clock t=99ms) even though A actually happened first in physical time.

```
NTP correction via slewing:

Real time:    0  100ms  200ms  300ms  400ms  500ms
Local clock:  0   88ms  176ms  264ms  300ms  400ms  
              ← clock is 24ms behind at 300ms real time
              
NTP detects the drift and speeds up the clock:
              
Real time:    300ms  350ms  400ms  450ms
Local clock:  264ms  330ms  400ms  450ms  ← slewing to catch up

Event X at real time 295ms: local clock reads 261ms
Event Y at real time 305ms: local clock reads 285ms

X happens before Y in real time.
X appears before Y in local clock time. ✓ (correct in this case)

But: Event Z at real time 295ms on a *different* machine (local clock = 296ms)
     appears to happen after Y (285ms) even though Y happened after Z.
```

### Happens-Before Relationship

Lamport introduced the **happens-before** (→) relationship as a rigorous way to define causality in distributed systems without relying on physical clocks:

1. If events A and B are on the same process, and A occurs before B in that process, then A → B.
2. If A is the sending of a message and B is the receipt of that message, then A → B.
3. If A → B and B → C, then A → C (transitivity).

If neither A → B nor B → A holds, then A and B are **concurrent** — neither caused the other. No ordering between them can be determined.

```
Process P1:    A ─── B ────────── C
               |                   |
               send(m1)           recv(m2)
                    |         |
Process P2:         D ─── E ──F─── G
                          |
                         send(m2)
                         recv of m1 is at D

Happens-before relationships:
A → B (same process, A before B)
A → D (A sent m1, D received it)
A → B → C, A → D → E → F → G (transitivity)
D → G (same process)

B and D are concurrent: B does not send to D, D does not send to B, no chain
E and C are concurrent
```

### Lamport Timestamps

Lamport timestamps assign a monotonically increasing integer counter to each event such that if A → B, then timestamp(A) < timestamp(B). The rules:

1. Each process maintains a counter, initialized to 0.
2. On every local event, increment the counter: `counter++`
3. When sending a message, include the current counter value.
4. When receiving a message with timestamp T, set `counter = max(counter, T) + 1`

```
Process P1 (counter starts at 0):
  Event A: counter = 1, timestamp = 1
  Send m1 with timestamp = 1
  
  Event C: counter = 4, timestamp = 4

Process P2 (counter starts at 0):
  Receive m1 (timestamp=1): counter = max(0, 1) + 1 = 2
  Event D: counter = 2, timestamp = 2
  
  Event E: counter = 3, timestamp = 3
  Send m2 with timestamp = 3
  
  P1 receives m2 (timestamp=3): counter = max(3, 3) + 1 = 4
  Event C: counter = 4

Timestamps: A=1, D=2, E=3, C=4

Is A → C? timestamp(A)=1 < timestamp(C)=4 ✓
Is D → E? timestamp(D)=2 < timestamp(E)=3 ✓

But: timestamp(A) < timestamp(D) does NOT mean A → D
     (though in this case it happens to be true because A sent m1 to D)
     
Lamport: if A → B then ts(A) < ts(B)
         BUT: if ts(A) < ts(B), we CANNOT conclude A → B
```

Lamport timestamps provide a **total order** (every event has a unique number, no ties after breaking on process ID) but they do not capture causality precisely. Two concurrent events get ordered by Lamport timestamps even though no causal relationship exists.

### Vector Clocks: Capturing Causality

Vector clocks fix Lamport's limitation by using a vector of counters — one per process — instead of a single counter. A vector clock V[i] represents "how many events in process i I know about."

Rules:
1. Each process Pi maintains vector V where V[i] is Pi's event count.
2. On local event: V[i]++
3. On send: include current vector V with message.
4. On receive message with vector W: V[j] = max(V[j], W[j]) for all j; then V[i]++

```
3 processes: P1, P2, P3

Initial: P1=[0,0,0], P2=[0,0,0], P3=[0,0,0]

P1 does event A:  P1=[1,0,0]
P2 does event B:  P2=[0,1,0]
P1 sends m1 to P3 with [1,0,0]:
  P3 receives: V3 = max([0,0,0],[1,0,0]) = [1,0,0], then P3++ → P3=[1,0,1]
P2 sends m2 to P3 with [0,1,0]:
  P3 receives: V3 = max([1,0,1],[0,1,0]) = [1,1,1], then P3++ → P3=[1,1,2]

Now compare A=[1,0,0] and B=[0,1,0]:
  A ≤ B? [1,0,0] ≤ [0,1,0]? No (1 > 0 in first component)
  B ≤ A? [0,1,0] ≤ [1,0,0]? No (1 > 0 in second component)
  → A and B are CONCURRENT ✓ (correct: they happened independently)

Compare A=[1,0,0] and P3's last event [1,1,2]:
  A ≤ [1,1,2]? [1,0,0] ≤ [1,1,2]? Yes (component-wise)
  → A happened-before P3's last event ✓
```

Vector clocks capture causality precisely: V1 ≤ V2 iff V1[i] ≤ V2[i] for all i. This means you can determine whether two events are concurrent, causally related, or identical.

The cost: vector size grows with the number of processes. For N processes, each event carries N integers. This is fine for small clusters but expensive for systems with thousands of nodes. **Dotted version vectors** and **version vectors** (applied per key, not per event) are practical optimizations.

### Google TrueTime: Bounded Physical Clock Uncertainty

Google took a different approach in Spanner (2012). Instead of abandoning physical clocks, they made physical clocks accurate enough to be useful — by using GPS receivers and atomic clocks in every datacenter.

TrueTime exposes a simple API:

```
TrueTime API:

TT.now() → [earliest, latest]
  Returns a time interval guaranteed to contain the actual current time.
  The uncertainty ε = latest - earliest is typically 1-7ms.

TT.after(t) → bool
  Returns true if t is definitely in the past (now().earliest > t)

TT.before(t) → bool  
  Returns true if t is definitely in the future (now().latest < t)
```

Spanner uses TrueTime to assign commit timestamps to transactions. When a transaction commits, it calls `TT.now()` to get interval [t_earliest, t_latest]. It then waits until `TT.after(t_latest)` is true — meaning the commit timestamp is guaranteed to be in the past on all nodes — before acknowledging the commit.

```
Spanner commit with TrueTime:

Transaction T1 starts at real time 100ms
T1 reads data, acquires locks

T1 is ready to commit at real time 150ms:
  TT.now() returns [149ms, 153ms]  (uncertainty ε = 4ms)
  Assign commit timestamp = 153ms (the latest possible time)
  
  Wait until TT.after(153ms) is true:
    TT.now() → [154ms, 158ms]  → 154ms > 153ms ✓
  
  Now commit. The commit timestamp 153ms is guaranteed to be:
    - In the past for all nodes (all clocks show ≥154ms now)
    - Greater than all timestamps assigned before real time 149ms

The "commit wait" takes ε time (1-7ms typically).
This is the price of external consistency.
```

This protocol guarantees **external consistency**: if transaction T1 commits before transaction T2 starts (in physical time), then T1's timestamp is less than T2's timestamp. This is the strongest possible consistency guarantee for a distributed system.

### Hybrid Logical Clocks (HLC)

HLC (Kulkarni, Demirbas, Madeppa, Avva, Leone, 2014) combines physical clocks and logical clocks. The goal: capture causality like a vector clock, while staying close to physical time like a wall clock.

HLC timestamp: `(wall_clock, logical_counter)` — a pair where the wall clock component is the node's NTP-synchronized time, and the logical counter breaks ties.

```
HLC rules:
  On local event:
    l = max(l, wall_clock)
    if l == wall_clock: c++ else c=0
    event.timestamp = (l, c)

  On send:
    same as local event, include (l, c) in message

  On receive message (ml, mc):
    l = max(l, ml, wall_clock)
    if l == ml == wall_clock: c = max(c, mc) + 1
    else if l == ml: c = max(c, mc) + 1  
    else if l == wall_clock: c = 0
    else: c = 0
    event.timestamp = (l, c)
```

HLC guarantees:
1. If A → B, then HLC(A) < HLC(B) (causality preserved, like Lamport)
2. HLC.l is always close to wall clock time (within NTP error bounds)
3. HLC(e).l ≥ physical_time(e) (HLC never goes into the past)

HLC is used in CockroachDB, YugabyteDB, and MongoDB. It provides causality tracking without vector clock overhead, while enabling useful time-based queries (e.g., "give me all events in the last hour").

## Deep Dive

### Lamport's 1978 Paper: Abandoning Physical Time

Leslie Lamport's "Time, Clocks, and the Ordering of Events in a Distributed System" (1978) is one of the most cited papers in computer science. Its core argument is radical: in a distributed system, physical time is the wrong primitive for reasoning about event ordering. What matters is causality — whether event A could have influenced event B — and causality can be captured precisely without any physical clocks.

The paper defines the happens-before relation (→) from first principles: same-process ordering, message sending causality, and transitivity. It then proves that this relation is a strict partial order, which means some pairs of events are incomparable — truly concurrent, with no causal relationship. Lamport timestamps extend this partial order to a total order by assigning integer counters that respect happens-before, but they over-commit: events that are concurrent get assigned an arbitrary order, which is fine for some uses (determining which replica's state is "newer") but misleading for others.

The paper's actual proposal — Lamport clocks for mutual exclusion and state machine replication — is less often implemented than its conceptual framework. But the framework itself became the foundation for everything that followed: vector clocks (which distinguish concurrency from causality), distributed snapshots (Chandy-Lamport algorithm, 1985), and the entire field of consistency models in distributed databases.

### Vector Clocks: Capturing Concurrency Precisely

Fidge (1988) and Mattern (1989) independently proposed vector clocks to fix Lamport's key limitation: Lamport timestamps can tell you that A happened before B, but they cannot tell you that A and B are concurrent. Vector clocks represent the causal history of an event as a vector of per-process counters. Two events are concurrent if and only if neither vector dominates the other component-wise.

This matters for conflict detection in distributed databases. The Amazon Dynamo paper uses vector clocks (called "version vectors" in that context) to detect whether two writes to the same key are causally related or concurrent. If causally related, the later write supersedes the earlier. If concurrent, both writes produced a genuine conflict that requires resolution — either by a domain-specific merge function or by presenting both values to the application (the MV-Register approach).

The limitation of vector clocks is space: the vector grows linearly with the number of processes. Dotted version vectors and interval tree clocks (Almeida, Baquero, Fonte, 2008) address this with more compact representations, but the fundamental trade-off between causal tracking granularity and message overhead remains.

### TrueTime: Hardware as the Solution

The Spanner paper's (Corbett et al., 2012) most audacious design choice is TrueTime: rather than abandoning physical clocks or accepting large uncertainty, Google deployed GPS receivers and atomic clocks in every datacenter. GPS provides absolute time synchronized to within microseconds globally; atomic clocks maintain accuracy between GPS updates and during GPS signal outages. The combination bounds clock uncertainty to 1–7 milliseconds.

TrueTime exposes this as an API: `TT.now()` returns an interval `[earliest, latest]` guaranteed to contain the true current time. The commit wait protocol — a transaction waits until `TT.after(commit_timestamp)` is true before acknowledging — ensures that the commit timestamp is definitively in the past from every node's perspective by the time clients see the commit.

This converts the unbounded clock uncertainty of commodity NTP into a deterministic latency cost. The key insight is that the commit wait cost equals the uncertainty interval ε, which is bounded by hardware. For most organizations, this tradeoff — 1–7ms added latency per write in exchange for external consistency — is excellent. The infrastructure cost (GPS antennas, atomic oscillators) is the barrier, not the latency. Hybrid Logical Clocks (Kulkarni et al., 2014) provide a software-only approximation: causality tracking like vector clocks, with physical time proximity like NTP, at the cost of needing occasional transaction retries when clock uncertainty would violate ordering guarantees.

## Implementation Guide

### Vector Clock Implementation

```python
from copy import deepcopy
from typing import Optional

class VectorClock:
    def __init__(self, node_id: str, nodes: list[str]):
        self.node_id = node_id
        self.clock = {n: 0 for n in nodes}
    
    def increment(self):
        """Increment on local event."""
        self.clock[self.node_id] += 1
        return deepcopy(self.clock)
    
    def send(self) -> dict:
        """Get clock to attach to outgoing message."""
        self.increment()
        return deepcopy(self.clock)
    
    def receive(self, remote_clock: dict):
        """Update on receiving message with remote_clock."""
        for node, ts in remote_clock.items():
            self.clock[node] = max(self.clock.get(node, 0), ts)
        self.clock[self.node_id] += 1
    
    def happens_before(self, other: dict) -> bool:
        """Returns True if self happened-before other (self → other)."""
        # self ≤ other component-wise AND self ≠ other
        return (
            all(self.clock.get(n, 0) <= other.get(n, 0) for n in set(self.clock) | set(other))
            and any(self.clock.get(n, 0) < other.get(n, 0) for n in set(self.clock) | set(other))
        )
    
    def concurrent_with(self, other: dict) -> bool:
        """Returns True if self and other are concurrent (no causal relationship)."""
        return not self.happens_before(other) and not VectorClock._leq(other, self.clock)
    
    @staticmethod
    def _leq(a: dict, b: dict) -> bool:
        return all(a.get(n, 0) <= b.get(n, 0) for n in set(a) | set(b))


# Usage: distributed counter with causal consistency
class CausalCounter:
    def __init__(self, node_id: str, all_nodes: list[str]):
        self.vc = VectorClock(node_id, all_nodes)
        self.value = 0
        self.pending = []  # operations waiting for causal dependencies
    
    def increment(self) -> tuple[int, dict]:
        """Returns (new_value, vector_clock) to send to peers."""
        self.value += 1
        clock = self.vc.send()
        return self.value, clock
    
    def receive_increment(self, delta: int, remote_clock: dict):
        """Apply increment received from peer."""
        self.vc.receive(remote_clock)
        self.value += delta
```

### Hybrid Logical Clock Implementation

```go
package hlc

import (
    "sync"
    "time"
)

// HLCTimestamp is a (wall_ns, logical) pair.
type HLCTimestamp struct {
    WallNs  int64 // nanoseconds since epoch
    Logical uint32
}

func (a HLCTimestamp) Before(b HLCTimestamp) bool {
    if a.WallNs != b.WallNs {
        return a.WallNs < b.WallNs
    }
    return a.Logical < b.Logical
}

type HLC struct {
    mu sync.Mutex
    ts HLCTimestamp
}

func (h *HLC) Now() HLCTimestamp {
    h.mu.Lock()
    defer h.mu.Unlock()

    wall := time.Now().UnixNano()
    if wall > h.ts.WallNs {
        h.ts = HLCTimestamp{WallNs: wall, Logical: 0}
    } else {
        h.ts.Logical++
    }
    return h.ts
}

func (h *HLC) Update(received HLCTimestamp) HLCTimestamp {
    h.mu.Lock()
    defer h.mu.Unlock()

    wall := time.Now().UnixNano()
    maxWall := max3(wall, h.ts.WallNs, received.WallNs)

    switch {
    case maxWall == h.ts.WallNs && maxWall == received.WallNs:
        h.ts.Logical = maxUint32(h.ts.Logical, received.Logical) + 1
    case maxWall == h.ts.WallNs:
        h.ts.Logical++
    case maxWall == received.WallNs:
        h.ts = HLCTimestamp{WallNs: maxWall, Logical: received.Logical + 1}
    default:
        h.ts = HLCTimestamp{WallNs: maxWall, Logical: 0}
    }

    return h.ts
}

func max3(a, b, c int64) int64 {
    if a >= b && a >= c { return a }
    if b >= c { return b }
    return c
}

func maxUint32(a, b uint32) uint32 {
    if a > b { return a }
    return b
}
```

## When to Use / When NOT to Use

**Use Lamport timestamps when:**
- You need a total order over all events for debugging or audit logging
- You want simplicity — Lamport timestamps are trivial to implement
- Causality tracking is not required (you just need some consistent ordering)

**Use vector clocks when:**
- You need to track causality precisely (e.g., detecting concurrent writes in a distributed database)
- You need to determine if two events are concurrent or one caused the other
- The number of nodes is small and bounded (vector size = number of nodes)

**Use HLC when:**
- You need causality tracking AND correlation with physical time
- You want to support time-based queries alongside causal consistency
- You are building a distributed database (CockroachDB, YugabyteDB use HLC)

**Use TrueTime (or equivalent) when:**
- You have the infrastructure (GPS + atomic clocks)
- You need external consistency — the strongest possible guarantee
- You are Google and you have Google's infrastructure budget

**Do NOT use wall clock timestamps for:**
- Ordering events across machines — clocks drift and NTP corrections introduce discontinuities
- Conflict resolution in distributed databases — use vector clocks or HLC instead
- Anything requiring sub-millisecond precision across nodes — NTP's best case is ~1ms accuracy

## Common Mistakes

**Mistake 1: Using `time.now()` for distributed event ordering**
The most common clock mistake. Wall clocks on different machines are not synchronized precisely enough for event ordering. Use Lamport timestamps, vector clocks, or HLC instead.

**Mistake 2: Treating NTP-synchronized clocks as perfectly synchronized**
NTP reduces drift but does not eliminate it. Two NTP-synchronized servers can still differ by 10-100ms. Never assume that t1 < t2 on different machines means event t1 happened first.

**Mistake 3: Not incrementing Lamport clock on receive**
The rule is `max(local, received) + 1` — the +1 is essential. Forgetting it means the receiving event has the same timestamp as the event that caused it, breaking the happens-before relationship.

**Mistake 4: Using vector clocks in large clusters**
Vector clocks scale as O(N) per message. For a 10,000-node cluster, every event carries a 10,000-element vector. This is impractical. Use version vectors (per-key, not per-event), dotted version vectors, or interval tree clocks for large-scale systems.

**Mistake 5: Assuming HLC is as strong as TrueTime**
HLC provides causality tracking and approximate physical time. But HLC does not provide a bounded uncertainty interval — it relies on NTP, which can drift significantly. HLC cannot provide Spanner's external consistency guarantee without TrueTime's GPS+atomic clock infrastructure.

## Connections

- **CRDTs** (Article 04): LWW-Register CRDTs use timestamps for conflict resolution. HLC timestamps are the right choice — they provide causality tracking that pure wall clocks lack, enabling correct LWW semantics even under clock skew.
- **Quorum** (Article 03): When quorum reads return multiple versions from different replicas, version comparison requires a consistent ordering. Lamport timestamps or vector clocks provide this ordering.
- **Distributed Transactions** (Article 08): Spanner's implementation of external consistency for global transactions depends entirely on TrueTime. Clock synchronization is the enabling technology for Spanner's unique consistency guarantees.
- **Split Brain** (Article 12): Clock skew can contribute to split-brain scenarios. If a node's clock is significantly ahead, it might receive messages that appear to be from the future, or its own messages might appear to precede messages from before it was started.

## Key Insights

**Insight 1: There is no global "now" in distributed systems.** Special relativity and the finite speed of light make simultaneity relative — two events that are simultaneous in one frame of reference are sequential in another. In practice, the speed of network communication (not light, but still finite) means "at the same time" is always approximate. Lamport's insight was to abandon the idea of global time and work with causality instead.

**Insight 2: Vector clocks capture what Lamport timestamps cannot.** Lamport timestamps give total order but cannot distinguish concurrent events from causal ones. Vector clocks give you both: total order (with tie-breaking) AND the ability to detect concurrency. This matters for conflict detection in distributed databases.

**Insight 3: Google solved the clock problem with hardware, not software.** The elegant theoretical solution (vector clocks) works but has scaling costs. Google's TrueTime is a pragmatic engineering solution: throw hardware at the problem until the uncertainty is small enough to be manageable. The commit wait of 1-7ms is a direct translation of hardware investment into consistency guarantees.

**Insight 4: HLC is the practical sweet spot for most systems.** Pure logical clocks (Lamport, vector) lose physical time information. TrueTime requires expensive infrastructure. HLC threads the needle: causality tracking at no overhead beyond a counter, plus correlation with physical time within NTP error bounds. This is why CockroachDB, YugabyteDB, and MongoDB use it.

**Insight 5: Timestamp monotonicity is not free.** A single machine can guarantee monotonically increasing timestamps trivially. Across machines, guaranteeing monotonicity requires either coordination (expensive) or a safety margin (commit wait, retry on timestamp collision). Every distributed system that needs timestamp ordering is implicitly paying this cost — the question is whether the cost is explicit and understood, or hidden and surprising.
