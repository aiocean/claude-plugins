# CRDTs — Conflict-Free Replicated Data Types

> "A CRDT is a data structure that can be replicated across multiple computers in a network, where the replicas can be updated independently and concurrently without coordination between the replicas, and where it is always mathematically certain that the replicas will eventually converge." — Marc Shapiro, Nuno Preguiça, Carlos Baquero, Marek Zawirski (2011)

## The Problem

Two users are collaborating on a shared document. User A is in San Francisco. User B is in London. The network between them has 150ms latency. Both users are typing simultaneously. A changes the title from "Draft" to "Proposal". B changes the title from "Draft" to "Outline".

If you try to serialize these operations through a central coordinator — a server that receives both changes and decides which one wins — you get predictable behavior but you also get latency: every keystroke must round-trip to the server and back before it is confirmed. At 150ms round-trip, that means at least 150ms of perceived lag for every character typed. Users will hate it.

Alternatively, you let both users edit locally and synchronize later. But now you have a conflict: both users changed the title from "Draft" to something different. What do you do? "Last writer wins" means one user's work is silently discarded. Manual conflict resolution (like Git merge conflicts) interrupts the user's flow. Either approach is unsatisfying.

CRDTs solve this problem by designing data structures where all concurrent operations are mathematically guaranteed to converge to the same result — without requiring coordination, without conflicts, and without discarding any user's input. The trick is that the data structure's semantics are chosen such that the order in which operations are applied does not affect the final result.

This is not magic — it is mathematics. CRDTs work by restricting what operations you can express. Not every data structure can be made conflict-free. But for a surprisingly large set of practical use cases, CRDT variants exist.

## Core Concept

### The Mathematical Foundation

A CRDT relies on one of two mathematical properties:

**State-based CRDTs (CvRDTs — Convergent Replicated Data Types)**: The entire state is periodically transmitted between replicas. The merge operation must form a **join-semilattice** — it must be commutative (A merge B = B merge A), associative ((A merge B) merge C = A merge (B merge C)), and idempotent (A merge A = A). If these three properties hold, any two replicas will converge to the same state regardless of the order they receive updates.

**Operation-based CRDTs (CmRDTs — Commutative Replicated Data Types)**: Only operations are transmitted, not full state. Operations must be **commutative** — applying them in any order produces the same result. The delivery mechanism must guarantee that each operation is delivered exactly once (at-least-once with deduplication) but can deliver in any order.

```
State-based: replicas share full state snapshots
  A: {x:1, y:2}    B: {x:3, y:1}
  Merge: {x:max(1,3), y:max(2,1)} = {x:3, y:2}
  Both converge to {x:3, y:2} regardless of merge order ✓

Operation-based: replicas share operations
  A: increment(x), increment(x)
  B: increment(x), decrement(y)
  
  Apply in any order → same result if increment/decrement commute ✓
```

### G-Counter (Grow-only Counter)

The simplest CRDT. A counter that can only be incremented. Each node maintains its own increment count, and the total value is the sum of all nodes' counts.

```
3-node cluster: N1, N2, N3

State: {N1: 5, N2: 3, N3: 2}
Value: 5 + 3 + 2 = 10

N1 increments twice: {N1: 7, N2: 3, N3: 2} → value = 12
N2 increments once:  {N1: 5, N2: 4, N3: 2} → value = 11

Merge: {N1: max(7,5)=7, N2: max(3,4)=4, N3: max(2,2)=2}
Value: 7 + 4 + 2 = 13 ✓ (correct: 10 + 2 + 1 = 13)
```

The merge function is `max` per node, which is commutative, associative, and idempotent. Regardless of merge order, the result is always correct.

### PN-Counter (Positive-Negative Counter)

A counter that can be incremented and decremented. Implemented as two G-Counters: P (increments) and N (decrements). Value = sum(P) - sum(N).

```
State: P={N1:5, N2:3}, N={N1:2, N2:1}
Value: (5+3) - (2+1) = 5

N1 increments: P.N1 += 1 → P={N1:6, N2:3}, value = (6+3)-(2+1) = 6
N2 decrements: N.N2 += 1 → N={N1:2, N2:2}, value = (5+3)-(2+2) = 4

Merge: P={N1:max=6, N2:max=3}, N={N1:max=2, N2:max=2}
Value: (6+3) - (2+2) = 5 ✓ (correct: 5 + 1 - 1 = 5)
```

### OR-Set (Observed-Remove Set)

A set that supports both add and remove. This is where CRDTs get interesting — naive sets have a conflict between concurrent add and remove.

The OR-Set uses **unique tags**: every time you add an element, it gets a unique tag. Removing an element removes only the specific tags that were observed at removal time. If another replica adds the same element with a new tag concurrently, the removal does not affect the new tag.

```
Initial state: {} (empty set)

N1: add("apple") → {("apple", tag1)}
N2: add("apple") → {("apple", tag2)}  [concurrent on N2]

N1: remove("apple") → removes tag1 → {} on N1

Merge N1 and N2:
  N1 has: {} (tag1 removed)
  N2 has: {("apple", tag2)} (tag2 still present)
  
  Merge: {("apple", tag2)} ← apple survives because tag2 was not removed

Value: {"apple"} ← correct: N2's add happened concurrently with N1's remove
                   so N2's add "wins"
```

The semantic interpretation: "add wins over concurrent remove." This is a reasonable semantic for shopping carts (if you remove an item and someone adds it back concurrently, keep it) but wrong for others (if you revoke a permission and someone grants it concurrently, which wins?). CRDT design requires choosing semantics that match your use case.

### LWW-Register (Last-Write-Wins Register)

A register (single value) where the last write wins, determined by timestamp. Simple but requires clock synchronization — using wall clock timestamps introduces the risk of clock skew causing incorrect ordering.

```
N1 writes "Alice" at t=100
N2 writes "Bob"   at t=99

Merge: max(100, 99) = 100 → "Alice" wins

But if N2's clock is ahead: N2 writes "Bob" at t=101
Merge: max(100, 101) = 101 → "Bob" wins

Same logical scenario, different result depending on clock accuracy
```

LWW-Register requires hybrid logical clocks (HLC) or vector clocks to avoid clock skew issues. In practice, it is used where last-write-wins is the desired semantic and approximate timestamp ordering is acceptable.

### MV-Register (Multi-Value Register)

Instead of choosing a winner, keep all concurrent values and let the application resolve the conflict.

```
N1 writes "Alice" (version {N1:1})
N2 writes "Bob"   (version {N2:1})  [concurrent]

Merge: {"Alice" @ {N1:1}, "Bob" @ {N2:1}}  ← both values kept

Application sees both values and must resolve (e.g., prompt user to choose)
```

Amazon's Dynamo uses MV-Register for its shopping cart: concurrent cart modifications produce multiple cart versions. The client (application layer) receives all versions and must merge them, typically by taking the union of all items.

## Deep Dive

### The Foundational Paper: Shapiro et al. (2011)

The CRDT formalism was established by Marc Shapiro, Nuno Preguiça, Carlos Baquero, and Marek Zawirski in their 2011 technical report "A Comprehensive Study of Convergent and Commutative Replicated Data Types." This paper did two things that changed how distributed systems researchers thought about consistency: it gave a precise mathematical definition of what it means for a distributed data structure to converge without coordination, and it provided a catalog of proven CRDTs covering the most practically useful cases.

The paper's central contribution is the proof strategy. Rather than arguing informally that a particular merge function "ought to" converge, Shapiro et al. require that the merge function form a join-semilattice — a partial order where every two elements have a least upper bound. This algebraic structure guarantees convergence by construction. When you prove your merge function is a join-semilattice, you have mathematically proven that any two replicas that receive the same set of operations will converge to the same state, regardless of the order in which they receive them. No testing can provide this guarantee; only the algebraic proof can.

The paper's catalog reveals the design space. G-Counter and PN-Counter are trivially semilattice-based. G-Set (grow-only set) is simply set union, which is the canonical semilattice operation. OR-Set introduces the unique-tag technique that makes concurrent add-and-remove semantically unambiguous. The 2P-Set (two-phase set) models the constraint that once removed, an element cannot be re-added — a useful model for some domains. The MV-Register explicitly represents all concurrent values rather than choosing a winner, deferring conflict resolution to the application layer.

### The Sequence CRDT Problem: From OT to WOOT and RGA

The hardest CRDT to design correctly is the sequence — an ordered list supporting concurrent insertion and deletion, which is what collaborative text editors require. Before CRDTs, collaborative editing required Operational Transformation (OT): a centralized server serialized all operations and transformed each operation to account for previously applied concurrent operations. OT is notoriously difficult to implement correctly, and every correct implementation required a central sequencing server, defeating the goal of peer-to-peer collaboration.

WOOT (Without Operational Transformation, Oster et al., 2006) and RGA (Replicated Growable Array, Roh et al., 2011) solved this by giving each character a unique, stable identifier. In RGA, each character's identifier is a (timestamp, nodeId) pair. The ordering of characters is determined by their identifiers, not their physical position — when two clients concurrently insert characters at the same position, the identifier ordering deterministically resolves which character appears first without any coordination.

This property — that the final document state is fully determined by the set of insert/delete operations regardless of application order — is what makes these sequence CRDTs usable in peer-to-peer editors like Yjs and Automerge. The Yjs library uses a variant of RGA; Automerge uses a log-based CRDT with operation-based semantics. Both produce identical final states whether operations are applied in send order, receive order, or any other permutation.

### Delta-CRDTs: Reducing Synchronization Cost

A practical limitation of state-based CRDTs is that merging requires transmitting the entire state. A G-Counter with 1,000 nodes requires transmitting a 1,000-element vector to share a single increment. The delta-CRDT paper (Almeida, Shoker, Baquero, 2016) addressed this by observing that most state updates affect only a small portion of the state — the "delta" of the operation. Delta-CRDTs transmit only the delta (what changed) while maintaining the join-semilattice guarantee. The receiver merges the delta into its current state exactly as it would merge a full state snapshot.

This brings state-based CRDTs close to the efficiency of operation-based CRDTs while retaining the simplicity of state-based semantics. Modern implementations of Yjs, Automerge, and the Redis Active-Active architecture all use delta-based synchronization for this reason.

## Implementation Guide

### G-Counter in Go

```go
package crdt

import "sync"

// GCounter is a grow-only distributed counter.
// Each node has its own increment-only slot.
type GCounter struct {
    mu     sync.RWMutex
    nodeID string
    counts map[string]int64
}

func NewGCounter(nodeID string) *GCounter {
    return &GCounter{
        nodeID: nodeID,
        counts: map[string]int64{nodeID: 0},
    }
}

func (c *GCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.counts[c.nodeID]++
}

func (c *GCounter) Value() int64 {
    c.mu.RLock()
    defer c.mu.RUnlock()
    var total int64
    for _, v := range c.counts {
        total += v
    }
    return total
}

// Merge combines two GCounters. Takes max per node.
// Commutative, associative, idempotent — valid CRDT merge.
func (c *GCounter) Merge(other *GCounter) {
    c.mu.Lock()
    defer c.mu.Unlock()
    other.mu.RLock()
    defer other.mu.RUnlock()

    for nodeID, count := range other.counts {
        if existing, ok := c.counts[nodeID]; !ok || count > existing {
            c.counts[nodeID] = count
        }
    }
}

// State returns a copy of internal state for transmission.
func (c *GCounter) State() map[string]int64 {
    c.mu.RLock()
    defer c.mu.RUnlock()
    copy := make(map[string]int64, len(c.counts))
    for k, v := range c.counts {
        copy[k] = v
    }
    return copy
}
```

### OR-Set in Go

```go
package crdt

import (
    "fmt"
    "sync"
    "github.com/google/uuid"
)

// ORSet is an Observed-Remove Set.
// Add wins over concurrent remove.
type ORSet struct {
    mu      sync.RWMutex
    nodeID  string
    // element → set of unique tags (tags that have not been removed)
    entries map[string]map[string]bool
}

func NewORSet(nodeID string) *ORSet {
    return &ORSet{
        nodeID:  nodeID,
        entries: make(map[string]map[string]bool),
    }
}

func (s *ORSet) Add(element string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if s.entries[element] == nil {
        s.entries[element] = make(map[string]bool)
    }
    tag := fmt.Sprintf("%s:%s", s.nodeID, uuid.New().String())
    s.entries[element][tag] = true
}

func (s *ORSet) Remove(element string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    // Remove all currently observed tags for this element.
    // Tags added concurrently on other nodes are NOT removed.
    delete(s.entries, element)
}

func (s *ORSet) Contains(element string) bool {
    s.mu.RLock()
    defer s.mu.RUnlock()
    tags, ok := s.entries[element]
    return ok && len(tags) > 0
}

func (s *ORSet) Elements() []string {
    s.mu.RLock()
    defer s.mu.RUnlock()
    result := make([]string, 0)
    for elem, tags := range s.entries {
        if len(tags) > 0 {
            result = append(result, elem)
        }
    }
    return result
}

// Merge combines two OR-Sets.
// Union of all tags per element.
func (s *ORSet) Merge(other *ORSet) {
    s.mu.Lock()
    defer s.mu.Unlock()
    other.mu.RLock()
    defer other.mu.RUnlock()

    for elem, tags := range other.entries {
        if s.entries[elem] == nil {
            s.entries[elem] = make(map[string]bool)
        }
        for tag := range tags {
            s.entries[elem][tag] = true
        }
    }
}
```

### Choosing the Right CRDT

```
Decision flowchart:

What kind of data do you need?

Numeric counter
├── Only increments? → G-Counter
└── Increments + decrements? → PN-Counter
    └── Warning: value can go negative; if that's wrong, use a min-0 wrapper

Single value
├── Last write should win? → LWW-Register (need good clocks or HLC)
└── All concurrent values matter? → MV-Register (app must resolve conflicts)

Collection (set)
├── Only add, never remove? → G-Set (trivial: union is merge)
├── Add and remove, add-wins semantics? → OR-Set
└── Add and remove, remove-wins semantics? → 2P-Set (two G-Sets: add and remove)
    └── 2P-Set caveat: once removed, element can never be re-added

Sequence (ordered list, text)
├── Tree-based? → RGA (Replicated Growable Array) or LSEQ
└── Fractional indexing? → Logoot / WOOT
    └── These are complex; prefer a library like Yjs or Automerge

Composite (multiple fields)
└── CRDT Map → each field has its own CRDT type
    (Riak Maps, Automerge documents)
```

## When to Use / When NOT to Use

**Use CRDTs when:**
- Multiple replicas need to accept writes independently (no synchronous coordination)
- You need availability over consistency (AP in CAP theorem terms)
- Your data fits naturally into CRDT semantics (counters, sets, registers)
- You are building real-time collaborative applications where merge conflicts must be invisible to users
- You are building geo-distributed systems where inter-region coordination is too slow

**Do NOT use CRDTs when:**
- You need strong consistency (ACID transactions, financial balances) — CRDTs are eventually consistent, not immediately consistent
- Your operations are not commutative and cannot be made so — some business logic is inherently order-dependent (e.g., "apply a 10% discount only if total > $100")
- Your data structures are complex hierarchies with referential integrity constraints — CRDTs handle individual data types, not relational schemas
- The semantic trade-offs (add-wins vs remove-wins) do not match your domain logic — bad CRDT semantics can produce correct-looking but semantically wrong results

**The hard truth**: CRDTs are not a general conflict resolution mechanism. They work by restricting the operations you can express. If your business logic requires ordering or constraints, CRDTs cannot help. Use consensus (Paxos/Raft) or distributed transactions instead.

## Common Mistakes

**Mistake 1: Using wall clock timestamps in LWW-Register**
Wall clocks can go backward (NTP correction) or be ahead of reality (clock drift). Two writes at "the same time" have undefined order. Use hybrid logical clocks (HLC) or Lamport timestamps instead.

**Mistake 2: Treating CRDT convergence as immediate consistency**
CRDTs converge *eventually* — after all replicas have received all updates. During the convergence window, different replicas show different values. If your application assumes it sees consistent state, CRDTs will surprise you.

**Mistake 3: Growing tombstone sets**
OR-Sets keep tombstones for removed elements indefinitely. Long-lived sets with frequent add/remove operations accumulate garbage. Implement periodic garbage collection (requires coordination to ensure all replicas have seen the tombstoned operations).

**Mistake 4: Assuming CRDT = no coordination ever**
Some CRDT operations do require occasional coordination: garbage collection of tombstones, compacting G-Counter state when nodes join/leave, maintaining the node registry. CRDTs minimize coordination but do not eliminate it entirely.

**Mistake 5: Building your own sequence CRDT**
Text editing CRDTs (for collaborative document editing) are notoriously hard to implement correctly. Edge cases in interleaving insertions, handling deletions within insertions, and maintaining intention preservation are subtle. Use a battle-tested library: Yjs, Automerge, or ShareDB.

## Connections

- **Quorum** (Article 03): CRDTs and quorum are complementary. Quorum handles *when* writes are considered durable. CRDTs handle *what happens when* concurrent writes produce conflicting values. Amazon's Dynamo uses quorum for durability and MV-Register (a CRDT) for conflict representation.
- **Clock Synchronization** (Article 07): LWW-Register CRDTs depend on timestamps for ordering. Hybrid Logical Clocks (HLC) were designed specifically to provide CRDT-compatible timestamps that are both causally ordered and correlated with real time.
- **Gossip Protocols** (Article 06): State-based CRDTs disseminate their state via gossip — periodic exchange of state between random pairs of nodes. The CRDT merge function ensures convergence regardless of gossip order.
- **Distributed Transactions** (Article 08): CRDTs are the alternative to distributed transactions for maintaining consistency across replicas. When transactions are too expensive (due to coordination cost), CRDTs provide a path to consistency without coordination.

## Key Insights

**Insight 1: CRDTs trade expressiveness for coordination-freedom.** Not all operations can be made conflict-free. CRDTs work by choosing semantics (add-wins, last-write-wins) that make all operations composable. This constrains what you can express. The benefit is that you never need to coordinate.

**Insight 2: The CAP theorem constrains CRDTs too.** CRDTs maximize availability (A) and partition tolerance (P) at the cost of consistency (C). Specifically, they provide *eventual consistency* — all replicas converge when communication is restored. If you need *strong consistency* (linearizability), CRDTs cannot provide it.

**Insight 3: Semantic correctness is the hard problem.** Getting the CRDT merge math right is the easy part — the properties are well-defined and verifiable. The hard part is choosing semantics that match user intent. Does "add wins over remove" make sense for your data? Or should delete always win? The wrong choice produces correct-looking but semantically wrong behavior that is hard to debug.

**Insight 4: CRDTs have changed text editing.** Before CRDTs, real-time collaborative editing required Operational Transformation (OT) — a complex system that required a central server to serialize operations. CRDTs (specifically RGA and Logoot for sequences) enabled peer-to-peer collaborative editing without a coordinator. This is how Yjs and Automerge work, and it is why CRDTs have seen a renaissance in the last decade.

**Insight 5: The future is delta-CRDTs.** State-based CRDTs transmit their entire state to merge. For large data structures, this is expensive. Delta-CRDTs transmit only the *delta* — the changes since the last synchronization. This brings state-based CRDTs closer to the efficiency of operation-based CRDTs while retaining the simplicity of state-based merge. Most modern CRDT implementations use delta-CRDTs.
