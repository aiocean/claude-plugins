# Consistent Hashing

> "The best distributed systems paper you can read in an afternoon is the Dynamo paper. The second best is the consistent hashing paper. Read them both." — Werner Vogels

## The Problem

Imagine you are building a caching layer for a web application. You have 10 cache servers. When a request arrives for user profile 12345, you need to decide which cache server holds (or should hold) that profile. The obvious solution is modular hashing: `server = hash(user_id) % 10`. Server 3 holds user 12345, server 7 holds user 67890, and so on. Every client can compute the server assignment independently — no central coordinator needed.

This works beautifully until your traffic grows and you need to add an 11th server. Now the formula changes: `server = hash(user_id) % 11`. User 12345 now maps to a different server. In fact, nearly every key maps to a different server. You have just invalidated your entire cache. Every request misses until the new cache warms up. Under high traffic, this cache miss storm can crash your backend database — the thing the cache existed to protect.

The same problem plagues distributed storage systems, load balancers, and any system where work is partitioned across a set of nodes. When the set changes, you want to minimize disruption. You want the key insight that consistent hashing provides: when a node is added or removed, only the keys that were assigned to that specific node need to be redistributed. All other assignments remain stable.

This is the problem consistent hashing solves. It was introduced by David Karger, Eric Lehman, Tom Leighton, Rina Panigrahy, Matthew Levine, and Daniel Lewin at MIT in a 1997 paper. It became the foundation of Amazon's Dynamo, Apache Cassandra, Riak, and dozens of other distributed systems.

## Core Concept

### The Hash Ring

Consistent hashing works by mapping both nodes and keys onto a circular hash space — a ring. The ring spans the output range of a hash function, typically 0 to 2^32 - 1 (for a 32-bit hash) or 0 to 2^128 - 1 (for a 128-bit hash like MD5 or SHA).

```
                    0 (= 2^32)
                   /
        315°      /    45°
          \      /    /
    270°   \    /   / 90°
      ----  (ring)  ----
    225°   /    \   \ 135°
          /      \    \
        180°      \    
                  (more nodes)
```

Each node is assigned a position on the ring by hashing its identifier (IP address, hostname, or node ID). To find which node owns a key, you hash the key, find its position on the ring, and walk clockwise until you reach the first node.

```
Hash Ring with 4 nodes (A, B, C, D):

         0
         |
    D    |    A
   350   |   90
         |
 270 ----+---- 100
         |
    C    |    B
   220   |   150
         |
        180

Key hash = 120 → walk clockwise → hits B at 150
Key hash = 80  → walk clockwise → hits A at 90
Key hash = 300 → walk clockwise → hits D at 350
```

**Adding a node**: When node E is added at position 200, only keys between 150 (B's position) and 200 need to move from C to E. All other key assignments are unchanged.

**Removing a node**: When node B is removed, only keys assigned to B (those between 90 and 150) need to be reassigned to C (the next node clockwise). All other assignments are unchanged.

With N nodes and K keys, adding or removing one node requires remapping only K/N keys. Modular hashing requires remapping nearly all K keys.

### The Problem with Naive Consistent Hashing: Uneven Distribution

If you hash four node identifiers onto the ring, they will not land at evenly-spaced positions. One node might own 40% of the ring while another owns 5%. This causes uneven load — some nodes receive far more requests than others.

The solution is **virtual nodes** (vnodes), introduced in the Dynamo paper. Instead of placing each physical node once on the ring, you place it many times — each physical node has V virtual node positions on the ring. The virtual nodes are distributed more evenly, so each physical node owns approximately 1/N of the ring in aggregate.

```
Physical nodes: A, B, C
Virtual nodes per physical node: 3

Ring with virtual nodes:
  0°:   A1
  40°:  B1  
  80°:  C1
  120°: A2
  160°: B2
  200°: C2
  240°: A3
  280°: B3
  320°: C3

Physical node A owns: [320°→40°], [80°→160°], [200°→280°]
                   ≈ 33% of the ring
```

With enough virtual nodes (typically 100-200 per physical node), the distribution becomes acceptably uniform. Virtual nodes also allow heterogeneous hardware: a node with twice the capacity can be given twice as many virtual node positions, receiving twice the load.

## Deep Dive

### The 1997 Paper: Hashing Without Complete Remapping

The consistent hashing paper (Karger, Lehman, Leighton, Panigrahy, Levine, Lewin — MIT, 1997) solved a specific problem that had no satisfying answer in the web caching literature: how do you add or remove caches from a cluster without invalidating the entire working set?

The paper's central insight is deceptively simple. If you project both the hash space and the nodes onto a circle, each node "owns" the arc of the circle between itself and the previous node. Adding a node splits one arc; removing a node merges two arcs. Only the keys in the affected arc move. The proof that at most K/N keys need remapping when a node is added to an N-node cluster follows directly from the geometry.

What the 1997 paper did not address was load distribution: with N nodes placed by hashing their identifiers, the arc sizes follow an exponential distribution. The expected size of the largest arc grows as O(log N / N), meaning some nodes could receive O(log N) times the average load. The virtual node technique — placing each physical node at multiple ring positions — was the practical response, but it emerged from operational experience rather than the original paper.

### The Dynamo Paper: Virtual Nodes and Token Assignment

The Amazon Dynamo paper (DeCandia et al., 2007) is the paper that took consistent hashing from a theoretical data structure to a production system design. Dynamo's contribution was not the ring itself but the complete system around it: virtual nodes for load balancing, quorum for consistency, sloppy quorum for availability, hinted handoff for durability, and vector clocks for conflict resolution.

The virtual node insight from Dynamo: instead of each physical node claiming one arc, it claims V small arcs distributed around the ring. With V = 100–200, the actual load on each physical node converges to 1/N of total load even with heterogeneous key distributions. Dynamo also observed that virtual nodes simplify failure recovery: when node X fails, its V arcs are each covered by a different neighbor, so the recovery read load is distributed across V nodes rather than concentrated on one.

The Dynamo paper also introduced "token assignment" — tracking which ring positions (tokens) each node holds. When a new node joins, it takes a subset of tokens from existing holders, enabling fine-grained control over how much data migrates. This is the mechanism by which Dynamo achieved incremental scale-out without large migration storms.

A nuance often missed: Dynamo's default configuration (N=3, W=1, R=1, sloppy quorum) was chosen for the shopping cart use case, where availability mattered more than strong consistency. The ring determines where data lives; quorum determines how many replicas must respond. Consistent hashing and quorum are separable decisions — the ring is indifferent to the consistency model layered on top.

### Jump Consistent Hashing: The Minimal Alternative

Google's 2014 paper "A Fast, Minimal Memory, Consistent Hash Algorithm" (Lamping and Veach) demonstrated that for the special case of mapping a key to one of N buckets where all buckets are equivalent and N only increases, a 5-line algorithm using only integer arithmetic suffices — no ring data structure, no virtual nodes, no memory allocations.

The algorithm works by simulating a sequence of random bucket assignments as N grows and returning the last stable assignment. It is O(ln N) time, O(1) memory, and significantly more cache-friendly than a ring lookup. The catch: it only supports adding buckets at the end, not arbitrary addition or removal. For read-through caches or shard assignment in databases where the topology grows monotonically, this is a perfect fit.

The existence of jump consistent hash illustrates an important principle: consistent hashing is a family of solutions to the same mathematical problem, not a single algorithm. The right variant depends on whether you need arbitrary node removal (ring with vnodes), heterogeneous weights (ring with weighted vnodes), or just monotonic growth with zero memory (jump hash).

## Implementation Guide

### Basic Consistent Hashing in Go

```go
package consistenthash

import (
    "crypto/sha256"
    "encoding/binary"
    "fmt"
    "sort"
    "sync"
)

type Ring struct {
    mu           sync.RWMutex
    virtualNodes int
    ring         []uint32          // sorted ring positions
    nodeMap      map[uint32]string // position → node name
}

func New(virtualNodes int) *Ring {
    return &Ring{
        virtualNodes: virtualNodes,
        nodeMap:      make(map[uint32]string),
    }
}

func (r *Ring) hash(key string) uint32 {
    h := sha256.Sum256([]byte(key))
    return binary.BigEndian.Uint32(h[:4])
}

func (r *Ring) AddNode(node string) {
    r.mu.Lock()
    defer r.mu.Unlock()

    for i := 0; i < r.virtualNodes; i++ {
        vkey := fmt.Sprintf("%s#%d", node, i)
        pos := r.hash(vkey)
        r.ring = append(r.ring, pos)
        r.nodeMap[pos] = node
    }
    sort.Slice(r.ring, func(i, j int) bool {
        return r.ring[i] < r.ring[j]
    })
}

func (r *Ring) RemoveNode(node string) {
    r.mu.Lock()
    defer r.mu.Unlock()

    for i := 0; i < r.virtualNodes; i++ {
        vkey := fmt.Sprintf("%s#%d", node, i)
        pos := r.hash(vkey)
        delete(r.nodeMap, pos)
    }

    // Rebuild ring slice without removed positions
    newRing := make([]uint32, 0, len(r.ring))
    for _, pos := range r.ring {
        if _, exists := r.nodeMap[pos]; exists {
            newRing = append(newRing, pos)
        }
    }
    r.ring = newRing
}

func (r *Ring) GetNode(key string) string {
    r.mu.RLock()
    defer r.mu.RUnlock()

    if len(r.ring) == 0 {
        return ""
    }

    pos := r.hash(key)

    // Binary search for first position >= pos
    idx := sort.Search(len(r.ring), func(i int) bool {
        return r.ring[i] >= pos
    })

    // Wrap around to start of ring if past the end
    if idx == len(r.ring) {
        idx = 0
    }

    return r.nodeMap[r.ring[idx]]
}

// GetNodes returns the N nodes responsible for a key (for replication)
func (r *Ring) GetNodes(key string, n int) []string {
    r.mu.RLock()
    defer r.mu.RUnlock()

    if len(r.ring) == 0 {
        return nil
    }

    pos := r.hash(key)
    idx := sort.Search(len(r.ring), func(i int) bool {
        return r.ring[i] >= pos
    })

    seen := make(map[string]bool)
    nodes := make([]string, 0, n)

    for i := 0; i < len(r.ring) && len(nodes) < n; i++ {
        ringIdx := (idx + i) % len(r.ring)
        node := r.nodeMap[r.ring[ringIdx]]
        if !seen[node] {
            seen[node] = true
            nodes = append(nodes, node)
        }
    }
    return nodes
}
```

### Jump Consistent Hashing

Jump consistent hashing (Google, 2014) is a simpler, faster alternative for cases where you only need to know which of N buckets a key maps to and all buckets are equivalent (no heterogeneous weighting).

```go
// Jump consistent hash - maps key to bucket in [0, numBuckets)
// O(ln N) time, zero memory, extremely cache-friendly
func JumpHash(key uint64, numBuckets int) int {
    var b, j int64 = -1, 0
    for j < int64(numBuckets) {
        b = j
        key = key*2862933555777941757 + 1
        j = int64(float64(b+1) * (float64(int64(1)<<31) / float64((key>>33)+1)))
    }
    return int(b)
}
```

Jump consistent hash has one limitation: it only supports adding buckets at the end (no arbitrary addition or removal). It is ideal for shard assignment in databases where you control the cluster topology and scale up incrementally.

### Rendezvous Hashing (Highest Random Weight)

Rendezvous hashing is another alternative. For each key, each node computes `hash(key, node_id)` and the key is assigned to the node with the highest hash value. No ring data structure needed — any client with the list of nodes can compute the assignment independently.

```python
import hashlib

def rendezvous_hash(key: str, nodes: list[str]) -> str:
    """Assign key to node with highest hash(key + node_id)."""
    best_node = None
    best_score = -1
    
    for node in nodes:
        combined = f"{key}:{node}".encode()
        score = int(hashlib.sha256(combined).hexdigest(), 16)
        if score > best_score:
            best_score = score
            best_node = node
    
    return best_node
```

Rendezvous hashing has better load distribution than basic consistent hashing (no vnodes needed) and handles node removal cleanly. Its downside is O(N) computation per key — for a large node set, this is expensive. Consistent hashing with vnodes is faster for lookup.

## When to Use / When NOT to Use

**Use consistent hashing when:**
- You have a cluster of nodes whose membership changes over time
- You need to minimize key remapping when nodes are added or removed
- You want stateless routing — any client can determine the target node without a coordinator
- You are building distributed caches, distributed hash tables, or sharded databases

**Use simple modular hashing when:**
- Your cluster never changes (fixed number of shards, never rebalanced)
- You can tolerate full cache invalidation during scaling events
- Your data is easily recomputed (so cache miss storms are acceptable)
- The implementation simplicity of `hash(key) % N` is worth more than stability

**Do NOT use consistent hashing when:**
- You need ACID transactions across keys (consistent hashing distributes keys, which makes cross-key transactions hard)
- Your key distribution is extremely skewed and virtual nodes do not help (hotspots require different treatment — explicit key splitting, not ring distribution)
- You need range queries across adjacent keys (consistent hashing destroys key order; range-partitioned systems like HBase or Bigtable use ordered partitioning instead)

## Common Mistakes

**Mistake 1: Too few virtual nodes**
Using 1 or 2 virtual nodes per physical node. With few virtual nodes, the ring is sparse and load distribution is highly uneven. Use at least 100 virtual nodes per physical node in production. Cassandra defaults to 256.

**Mistake 2: Ignoring hot keys**
Consistent hashing distributes keys evenly by hash value, but if 80% of requests go to 0.1% of keys (power law distribution), a small number of physical nodes will receive the majority of load regardless of ring distribution. Consistent hashing does not solve hotspot problems — you need key splitting or read replicas for that.

**Mistake 3: Not handling empty ring**
If all nodes are removed (or if the ring is initialized but empty), key lookups should return a clear error, not panic. Always handle the empty ring case.

**Mistake 4: Deterministic but wrong hash functions**
Using a non-deterministic hash function (one that varies across process restarts or machines) means different clients compute different ring positions. Always use a stable hash function — MurmurHash3, SHA256, or FNV. Do not use Go's `map` or Python's `hash()` — they are randomized in modern runtimes.

**Mistake 5: Not considering data migration cost**
When adding a node, the data that needs to move to the new node must be transferred. If you add many nodes at once, this migration load can overwhelm the cluster. Add nodes incrementally and monitor migration progress.

## Connections

- **Quorum** (Article 03): Consistent hashing determines which nodes hold a given key. Quorum determines how many of those nodes must respond for a read or write to succeed. They are used together in Dynamo and Cassandra.
- **Gossip Protocols** (Article 06): Cluster membership changes (the list of nodes on the ring) are disseminated via gossip. Cassandra uses gossip to propagate ring topology to all nodes.
- **Two-Phase Commit** (Article 05): When resharding (moving keys from one shard to another), you need to ensure the migration is atomic. This is often done with techniques related to 2PC.
- **The Fallacies** (Article 01): Consistent hashing exists because of Fallacy 5 (topology doesn't change). The whole innovation is "topology WILL change — here's how to handle it gracefully."

## Key Insights

**Insight 1: The ring is a coordination-free data structure.** Every client can independently compute which node owns a key, given only the list of nodes. There is no central coordinator, no lookup table, no single point of failure. This is why consistent hashing scales — the routing logic is purely local computation.

**Insight 2: Virtual nodes trade memory for uniformity.** More virtual nodes = better distribution = more memory for the ring data structure. In practice, 100-256 virtual nodes is a good default. The memory cost is negligible (a few MB) compared to the distribution benefits.

**Insight 3: Consistent hashing is a spectrum, not a binary.** Traditional modular hashing remaps 100% of keys on topology change. Consistent hashing remaps K/N keys. Jump consistent hash remaps K/N keys with zero memory. Rendezvous hashing remaps K/N keys with O(N) computation. There is no universally best choice — each makes different trade-offs.

**Insight 4: The real innovation of Dynamo was combining consistent hashing with quorum and hinted handoff.** Consistent hashing alone determines where data lives. The Dynamo paper's contribution was the full system: consistent hashing for partitioning, virtual nodes for load distribution, quorum for consistency, hinted handoff for availability during failures. No single mechanism is responsible for Dynamo's properties — it is the combination.

**Insight 5: Ordered partitioning and range partitioning are alternatives worth knowing.** Google's Bigtable and Apache HBase use ordered key partitioning — keys are sorted lexicographically and tablets hold contiguous key ranges. This enables efficient range scans but makes load balancing harder (popular key ranges become hot). Consistent hashing and ordered partitioning optimize for different access patterns.
