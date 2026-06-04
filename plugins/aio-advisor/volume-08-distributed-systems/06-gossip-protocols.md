# Gossip Protocols

> "Three can keep a secret, if two of them are dead." — Benjamin Franklin. In distributed systems, we do the opposite: we tell everyone, repeatedly, until everyone knows.

## The Problem

You have a cluster of 1,000 nodes. One node detects that a configuration value has changed. How do you propagate this change to all other 999 nodes?

The naive approach is a central broadcast: the changed node sends the new value to all 999 others. This is O(N) messages from a single node — it becomes a bottleneck and a single point of failure. If the broadcasting node crashes mid-broadcast, some nodes get the update and some do not.

Alternatively, you could use a hierarchical fanout: the changed node tells 10 nodes, each of those tells 10 more, and so on. This reaches all 1,000 nodes in log(1000) / log(10) ≈ 3 rounds. But this requires pre-defining the tree topology, and if any node in the hierarchy fails, the subtree beneath it never receives the update.

What you want is a protocol that:
- Requires no central coordinator
- Tolerates arbitrary node failures
- Scales as the cluster grows
- Eventually guarantees every node receives every update

Gossip protocols, also called epidemic protocols, achieve all four properties. They work by having each node randomly select a small number of neighbors and share information with them. Recipients then share with their own random neighbors. The information spreads through the cluster the way a rumor spreads through a social network — exponentially fast, without any central coordination, and resilient to individual failures.

## Core Concept

### The Epidemic Model

Gossip protocols are modeled on the spread of infectious disease (hence "epidemic protocols"). Nodes can be in one of three states:

- **Susceptible**: Has not yet received the new information
- **Infected**: Has received the information and is actively gossiping it
- **Removed**: Has received the information and stopped gossiping (in some variants)

```
Round 0: Node A becomes infected (receives new config)

         A*
        / \
       B   C
      / \   \
     D   E   F
     (all susceptible)

Round 1: A gossips to 2 random nodes → B and E become infected

         A*
        / \
       B*  C
      / \   \
     D   E*  F

Round 2: B gossips to C and D; E gossips to F and C

         A*
        / \
       B*  C*
      / \   \
     D*  E*  F*

Round 3: All nodes infected. Further gossip is redundant
         but self-heals nodes that missed earlier rounds.
```

With fanout F (each node gossips to F peers per round), after k rounds the expected number of infected nodes is approximately N × (1 - (1 - 1/N)^(F×k)) — growing exponentially until saturation.

For a cluster of N=1,000 nodes with fanout F=3, full dissemination takes approximately log(1000) / log(3) ≈ 7 rounds. If each round is 1 second, all 1,000 nodes have the update in about 7 seconds.

### Push, Pull, and Push-Pull

**Push gossip**: Infected nodes actively send their information to randomly selected peers. Simple, fast initial spread.

**Pull gossip**: Nodes periodically ask random peers "do you have anything newer than what I have?" Efficient for convergence — susceptible nodes actively seek information rather than waiting.

**Push-pull gossip**: When node A contacts node B, they exchange both directions — A pushes its new information, B pushes its new information back. Both nodes end up with the union of what they each knew. This converges faster than either push or pull alone, and it is the most common variant in practice.

```
Push-pull gossip round between A and B:

A knows: {config_v2, member_list: [A,B,C,D]}
B knows: {config_v1, member_list: [A,B,C]}

After exchange:
A knows: {config_v2, member_list: [A,B,C,D]}
B knows: {config_v2, member_list: [A,B,C,D]}

B now has config_v2 and the updated member list.
A now knows that B is alive and has been updated.
```

### Failure Detection with Phi Accrual

Gossip protocols are not just for data dissemination — they are also used for failure detection. Each node maintains a heartbeat counter that it increments periodically and gossips to peers. When a node receives gossip about node X, it records the timestamp of the most recent heartbeat. If no heartbeat is received for a long time, the node is suspected to have failed.

The **phi accrual failure detector** (used by Cassandra and Akka) produces a continuously varying suspicion value φ rather than a binary alive/dead judgment. The φ value increases over time since the last heartbeat was received. Operators set a threshold φ_threshold — when φ exceeds the threshold, the node is declared dead.

```
Phi accrual formula:

φ(t) = -log10(1 - F(t_now - t_last))

where F is the cumulative distribution function of inter-arrival times
(typically modeled as a normal distribution with mean μ and stddev σ
estimated from recent heartbeat inter-arrival times)

If heartbeats typically arrive every 1 second (μ=1.0, σ=0.1):
  φ at 1.5s since last heartbeat ≈ 2.0  (suspicious but not certain)
  φ at 2.0s since last heartbeat ≈ 4.0  (likely failed)
  φ at 3.0s since last heartbeat ≈ 8.0  (almost certainly failed)

Threshold φ=8 means: declare dead after 3× typical interval
```

The phi accrual detector adapts to network conditions — if the network is slow, inter-arrival times are higher, and the distribution widens, preventing false positives.

### SWIM: Scalable Weakly-consistent Infection-style Membership

SWIM (2002) is a gossip-based membership protocol used by Consul, HashiCorp Serf, and others. It adds an indirect probe mechanism to improve failure detection accuracy.

```
SWIM failure detection:

1. Node A periodically selects random node B to probe (ping)
2. If B responds within timeout: B is alive
3. If B does not respond: A asks k random other nodes to probe B indirectly

   A → B (no response)
   A → C: "please probe B for me"
   A → D: "please probe B for me"
   C → B (response!) → C → A: "B is alive"

4. If indirect probes also fail → B is suspected
5. Suspicion is gossiped to all nodes
6. If B does not refute suspicion within a timeout → B declared dead
   and its removal is gossiped
```

Indirect probing distinguishes between "B is slow/GC paused" (indirect probes succeed) and "B is actually down or unreachable from A specifically" (all probes fail). This reduces false positives significantly.

## Deep Dive

### The Epidemic Model: Demers et al. (1987)

The epidemic model for distributed information dissemination was formalized by Demers, Greene, Hauser, Irish, Larson, Shenker, Sturgis, Swinehart, and Terry in their 1987 paper "Epidemic Algorithms for Replicated Database Maintenance." The paper's authors noticed that the spread of information through a distributed system followed the same mathematical dynamics as the spread of infectious disease — exponential growth to saturation, followed by a slow tail as the last susceptible nodes are reached.

The paper proved that even with a fanout of just 2 or 3 neighbors per round, a cluster of N nodes achieves full dissemination in O(log N) rounds with high probability. This is the fundamental result that makes gossip scale: unlike broadcast (O(N) messages per update from a single node) or tree-based dissemination (O(log N) messages but fragile to node failure), gossip achieves O(N log N) total messages with O(log N) latency and graceful degradation under arbitrary node failures.

The paper also introduced the distinction between push (infected nodes send to random susceptible nodes) and pull (susceptible nodes query random nodes for updates), and proved that pull gossip achieves better convergence for the "tail" of the dissemination — the last few nodes to receive an update. Push-pull gossip, which combines both directions in each exchange, dominates both in practice.

### SWIM: Scalable Weakly-consistent Infection-style Membership

The SWIM paper (Das, Gupta, Motivala — Cornell, 2002) addressed a specific failure in naive gossip-based membership: heartbeat-based failure detection scales poorly. If every node broadcasts heartbeats to all other nodes, the message count is O(N²). If every node only listens for heartbeats from a fixed set of peers, node failures in that set are undetectable.

SWIM's solution is the indirect probe: when node A fails to receive a response from node B within a timeout, A asks k random other nodes to probe B on its behalf. If none of the indirect probers can reach B either, then B is genuinely unreachable (not just unreachable from A due to a directional network fault) and is marked as suspected. Suspicion is gossipped to the cluster. If B does not refute the suspicion within a timeout, B is declared dead.

This indirect probe mechanism distinguishes between "B crashed" and "the link between A and B is down." In modern cloud environments, a VM can become isolated from one other VM while remaining reachable from the rest of the cluster. Without indirect probing, this one-directional isolation would cause false positives. The phi accrual failure detector (used in Cassandra and Akka) complements SWIM by making the suspicion threshold adaptive to observed network conditions rather than fixed.

### The Convergence Guarantee: Quantifying "Eventually"

A common criticism of gossip protocols is that "eventually consistent" is vague. The epidemic model quantifies it precisely. For a cluster of N nodes with fanout F and round interval T seconds, the expected number of rounds to infect all N nodes is approximately (ln N + ln ln N) / ln F. For N=1000, F=3, T=1s: this is about (6.9 + 1.9) / 1.1 ≈ 8 rounds, or 8 seconds.

More usefully, the probability that any given node has NOT received an update after k rounds decreases exponentially in k. After 3× the expected convergence time, the probability that any node is uninfected is negligible (less than 1/N²). This means gossip-based dissemination has a concrete, quantifiable SLA: for a 1,000-node cluster with 1-second rounds, you can state with high confidence that any update reaches all nodes within 30 seconds. That is not the same as "some indeterminate future time" — it is a bounded window that system designers can reason about.

## Implementation Guide

### Simple Push-Pull Gossip Node in Go

```go
package gossip

import (
    "encoding/json"
    "math/rand"
    "net/http"
    "sync"
    "time"
)

type State map[string]interface{}

type Node struct {
    mu       sync.RWMutex
    id       string
    peers    []string  // addresses of other nodes
    state    State     // local state (key-value)
    versions map[string]int64  // version per key for conflict detection
}

func NewNode(id string, peers []string) *Node {
    return &Node{
        id:       id,
        peers:    peers,
        state:    make(State),
        versions: make(map[string]int64),
    }
}

func (n *Node) Set(key string, value interface{}) {
    n.mu.Lock()
    defer n.mu.Unlock()
    n.state[key] = value
    n.versions[key]++
}

// GossipRound performs one push-pull gossip exchange with a random peer.
func (n *Node) GossipRound() {
    if len(n.peers) == 0 {
        return
    }

    peer := n.peers[rand.Intn(len(n.peers))]

    n.mu.RLock()
    localState := GossipMessage{
        NodeID:   n.id,
        State:    n.state,
        Versions: n.versions,
    }
    n.mu.RUnlock()

    body, _ := json.Marshal(localState)
    resp, err := http.Post(
        "http://"+peer+"/gossip",
        "application/json",
        bytes.NewReader(body),
    )
    if err != nil {
        // Peer is unreachable — note for failure detection
        return
    }
    defer resp.Body.Close()

    var peerState GossipMessage
    json.NewDecoder(resp.Body).Decode(&peerState)

    // Merge peer state: take higher version for each key
    n.mu.Lock()
    defer n.mu.Unlock()
    for key, peerVersion := range peerState.Versions {
        if peerVersion > n.versions[key] {
            n.state[key] = peerState.State[key]
            n.versions[key] = peerVersion
        }
    }
}

// HandleGossip handles incoming gossip from a peer.
// This is the HTTP handler for /gossip endpoint.
func (n *Node) HandleGossip(w http.ResponseWriter, r *http.Request) {
    var peerState GossipMessage
    json.NewDecoder(r.Body).Decode(&peerState)

    n.mu.Lock()
    for key, peerVersion := range peerState.Versions {
        if peerVersion > n.versions[key] {
            n.state[key] = peerState.State[key]
            n.versions[key] = peerVersion
        }
    }

    // Respond with our own state (push-pull)
    localState := GossipMessage{
        NodeID:   n.id,
        State:    n.state,
        Versions: n.versions,
    }
    n.mu.Unlock()

    json.NewEncoder(w).Encode(localState)
}

// Run starts the gossip loop — gossip every interval.
func (n *Node) Run(interval time.Duration) {
    for {
        time.Sleep(interval)
        n.GossipRound()
    }
}

type GossipMessage struct {
    NodeID   string                 `json:"node_id"`
    State    State                  `json:"state"`
    Versions map[string]int64       `json:"versions"`
}
```

### Anti-Entropy Gossip

Anti-entropy gossip is used specifically for ensuring replicated data consistency — not just metadata. Cassandra runs anti-entropy repair using Merkle trees transmitted via gossip-like pairwise exchanges.

```
Anti-entropy process:

1. Node A and Node B are replicas of the same data partition
2. A and B periodically exchange Merkle tree hashes of their data
3. If root hashes match → data is identical, no action needed
4. If root hashes differ → binary search the tree to find diverged ranges
5. Exchange only the diverged data (not full partition)
6. Both nodes end up with consistent data

Frequency: daily full anti-entropy repair in Cassandra
           continuous lightweight anti-entropy via read repair
```

### Tuning Gossip Parameters

```
Key parameters and their effects:

Fanout (F): nodes to gossip with per round
  Low (F=1): slower dissemination, fewer messages
  High (F=5): faster, but more bandwidth
  Typical: F=3 gives good balance

Round interval: how often each node gossips
  Low (100ms): fast propagation, high CPU/network
  High (5s): slow propagation, low overhead
  Typical: 1 second for metadata gossip

Message size limit: max bytes per gossip message
  Keep small: large messages slow down gossip rounds
  For large state: use version vectors, exchange only deltas

Suspicion timeout: how long before suspected node is declared dead
  Low (5s): fast detection, more false positives under GC pauses
  High (60s): slow detection, fewer false positives
  Typical: 10-30 seconds in production
```

## When to Use / When NOT to Use

**Use gossip when:**
- You need to disseminate metadata or configuration to all nodes in a large cluster
- You need failure detection without a central coordinator
- You can tolerate eventual consistency (gossip provides no ordering guarantees)
- Your cluster membership changes frequently (nodes joining and leaving)
- You need a protocol that scales linearly — gossip overhead per node is O(log N), not O(N)

**Do NOT use gossip when:**
- You need strong consistency guarantees — use Raft or Paxos
- You need to coordinate a decision (e.g., leader election) — gossip disseminates information but does not coordinate decisions
- You have strict timing requirements — gossip convergence is probabilistic and has no hard deadline
- Your messages have complex causal ordering requirements — gossip delivers messages out of order

**Gossip is ideal for:**
- Cluster membership (who is in the cluster, who is alive)
- Configuration propagation (new settings spreading to all nodes)
- Service discovery metadata (service health, endpoint addresses)
- Failure notifications (node X is down, spread the word)

**Gossip is not appropriate for:**
- Financial transactions (need ACID, not eventual consistency)
- Distributed lock management (need consensus, not eventual consistency)
- Sequenced event logs (need ordering, which gossip does not provide)

## Common Mistakes

**Mistake 1: Using gossip for large state**
Each gossip message has a size limit. Gossiping full database snapshots is impractical. Gossip is designed for small metadata — heartbeat counters, version numbers, service health status. For large state, gossip version vectors and sync only the diffs.

**Mistake 2: Assuming gossip delivers in order**
Gossip does not guarantee message ordering. Node C may learn about event B before event A, even if A happened first. If your application needs causal ordering, use vector clocks on top of gossip, or use a different dissemination mechanism.

**Mistake 3: Setting fanout too high**
A fanout of 10 in a 1,000-node cluster generates 10,000 messages per round — 10× more than needed. Gossip is efficient because low fanout (3-5) still achieves fast dissemination. High fanout wastes bandwidth without proportionally improving dissemination speed.

**Mistake 4: Not bounding message size**
If state accumulates unboundedly (e.g., gossip carries a log of all events ever), messages grow without bound. Use a fixed-size digest (bloom filter or vector clock) that summarizes state, and do full synchronization only when the digest indicates divergence.

**Mistake 5: Mixing gossip and consensus**
Gossip is for dissemination. Consensus (Raft/Paxos) is for coordination. Confusing the two leads to architectures where eventually-consistent gossip state is used to make strongly-consistent decisions — which produces subtle bugs. Keep them separate: use Raft for decisions, gossip for spreading the results of decisions.

## Connections

- **Consistent Hashing** (Article 02): Cluster membership changes (nodes joining/leaving the ring) are propagated via gossip. In Cassandra, gossip is how all nodes learn the current token ring state.
- **Quorum** (Article 03): Quorum operations require knowing which nodes are alive. Gossip-based failure detection provides the liveness information that quorum relies on. A node declared failed by phi accrual gossip is excluded from quorum calculations.
- **CRDTs** (Article 04): State-based CRDTs are naturally disseminated via gossip — the CRDT merge operation is exactly what gossip's push-pull exchange does. The CRDT convergence guarantee aligns perfectly with gossip's eventual consistency model.
- **Split Brain** (Article 12): If gossip-based failure detection incorrectly declares a node dead (false positive), that node may continue operating while the cluster considers it gone — a form of split brain. Phi accrual failure detectors minimize false positives, but the risk cannot be fully eliminated.

## Key Insights

**Insight 1: Gossip is robust by design, not by luck.** The epidemic model has been mathematically analyzed extensively. The convergence time and probability of reaching all nodes are well-understood. Unlike ad-hoc broadcast mechanisms, gossip has provable properties: with fanout F=3 and N nodes, every node receives an update within O(log N) rounds with probability approaching 1.

**Insight 2: Gossip sacrifices consistency for availability and partition tolerance.** Gossip is firmly AP (Availability + Partition Tolerance) in the CAP theorem sense. It continues working during network partitions — nodes on each side of the partition keep gossiping among themselves. But when the partition heals, convergence takes time. During the partition, nodes may have inconsistent views.

**Insight 3: The "eventually" in "eventually consistent" has a quantifiable bound.** Gossip convergence is not unbounded. For a cluster of N nodes with fanout F and round interval T, the expected time for full dissemination is O(log(N) / log(F)) × T. This gives you a concrete SLA for how quickly changes propagate.

**Insight 4: Gossip-based failure detection has a fundamental trade-off between speed and accuracy.** Faster detection (lower phi threshold) → more false positives (healthy nodes declared dead). Slower detection (higher threshold) → delayed response to actual failures. The phi accrual detector adapts to network conditions to find a good operating point, but the trade-off cannot be eliminated.

**Insight 5: Modern systems layer gossip and consensus.** The most robust distributed systems (Cassandra, Consul, etcd) use both gossip and consensus. Gossip handles high-volume, low-latency metadata dissemination — it scales beautifully and tolerates failures gracefully. Consensus handles coordination decisions that require strong guarantees. The architectures are complementary: gossip tells everyone what the consensus protocol decided.
