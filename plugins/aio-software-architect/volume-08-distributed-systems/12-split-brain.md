# Split Brain and Network Partitions

> "A split-brain is when two parts of a cluster each believe they are the authoritative, healthy part — and both are right from their own perspective. The network is the liar." — practitioner description

## The Problem

It is 2:00 AM. Your PostgreSQL primary and its standby are humming along. A network switch in your datacenter fails. The primary can no longer reach the standby, and the standby can no longer reach the primary. Both nodes are fully healthy — they can accept connections, execute queries, and write to disk. The problem is they cannot talk to each other.

Your high-availability system detects that the primary has gone silent from the standby's perspective. It promotes the standby to primary. Now you have two PostgreSQL primaries, both accepting writes, both believing they are the authoritative source of truth. When the network switch is repaired and the two nodes can communicate again, you discover that both have accepted conflicting writes for the same rows. The data is corrupted. You cannot automatically reconcile them. You need to choose a winner — which means losing some of the other's writes.

This scenario is called split brain. It is one of the most dangerous failure modes in distributed systems because it violates the most fundamental assumption: there is one authoritative copy of the data. Split brain creates two authoritative copies that diverge silently, often for minutes or hours, before anyone notices.

Split brain is not exotic. It happens in any high-availability system that uses automatic failover, and it happens most frequently when network infrastructure fails — the scenario where you most need your HA system to work correctly.

## Core Concept

### What Causes Split Brain

A network partition divides a cluster into two or more groups that cannot communicate with each other. Within each group, nodes can see each other but not nodes in other groups.

```
Normal operation:

   Node A ──────── Node B
      │               │
      └──── Node C ───┘

All nodes connected, leader election has chosen A as leader.

Network partition:

   Node A   ╳   Node B
      │               │
      └── Node C ──╳──┘

   Group 1: {A}        Group 2: {B, C}
   A can see no one    B and C can see each other

   Group 2 detects A is unreachable.
   Group 2 elects a new leader (B or C).
   
   Now:
   - A thinks it is still the leader (it can still accept client connections)
   - B (or C) thinks it is the new leader
   - Both accept writes
   - Writes diverge
   - Split brain!
```

The deceptive part: from inside each partition, everything looks healthy. Node A is processing requests normally. Node B is processing requests normally. Neither observes any errors from its own perspective. The failure is in the relationship between them — which neither can observe directly.

### Why Automatic Failover Is Dangerous Without Quorum

Automatic failover without quorum protection is a split-brain factory. Consider:

```
3-node cluster with naive automatic failover:

Scenario: Node A is the leader, network partition isolates it from B and C

Node A: "I can't reach B or C. They must have failed. I remain leader."
Node B: "I can't reach A. It must have failed. I'll become leader."
Node C: "I can't reach A. I'll vote for B as new leader."

Result: A is leader in partition 1, B is leader in partition 2.
```

The fundamental problem: a node cannot distinguish "the other nodes are down" from "I cannot reach the other nodes." From A's perspective, network failure and node failure look identical.

### Quorum: The Defense

The solution: require that a leader can only act as leader if it has the agreement of a **majority** of nodes. A majority (quorum) of an N-node cluster is ⌊N/2⌋ + 1 nodes.

```
3-node cluster with quorum protection:

Quorum = ⌊3/2⌋ + 1 = 2 nodes

Network partition: A isolated from B and C.

Partition 1: {A}  — 1 node, less than quorum (2) → A steps down
Partition 2: {B, C} — 2 nodes, meets quorum → B or C becomes leader

Result: Only one partition has quorum. Only one leader. No split brain.
```

This is why 3 nodes is the minimum for a fault-tolerant cluster, not 2. A 2-node cluster with one failure produces two single-node partitions — neither has majority, and the cluster is stuck. A 3-node cluster with one failure leaves a 2-node partition that has majority.

```
Why 2 nodes is wrong for HA:

2-node cluster: A and B
Network partition: A from B

Partition 1: {A} — 1 node, half of 2 (not majority)
Partition 2: {B} — 1 node, half of 2 (not majority)

Neither partition has quorum.
Neither can safely become leader.
Cluster is unavailable.

Alternative: allow a 1-node majority of 2 (first to declare wins)
→ Split brain, because both declare simultaneously.

There is no good option with 2 nodes.
```

### Raft's Approach to Split Brain Prevention

Raft (Ongaro and Ousterhout, 2014) is the consensus algorithm that explicitly addresses split brain. Its core guarantee: at most one leader can be elected per term.

Raft uses **terms** (monotonically increasing epoch numbers) as a logical clock for leadership. A new leader can only be elected in a new term, and only by receiving votes from a majority of nodes. A leader that cannot maintain quorum acknowledges it is no longer valid.

```
Raft split brain scenario:

Term 1: Node A is leader (has quorum: A + B + C)

Network partition: A from B and C

Term 1, Partition 1: {A}
  A still receives client requests
  A tries to commit log entries (needs majority acknowledgment)
  A sends AppendEntries to B and C → no response
  A cannot commit any new entries (no quorum)
  A becomes effectively read-only (it can still serve reads, not writes)
  [In strict Raft, A steps down after election timeout without quorum responses]

Term 2, Partition 2: {B, C}
  B and C detect leader absence (no heartbeats from A)
  B calls an election for Term 2
  B gets votes from B and C (majority of 3) → B is leader in Term 2

Term 2 has one leader (B). Term 1's leader (A) has no quorum and cannot commit.
No divergence occurs.

When partition heals:
  A receives Term 2 AppendEntries from B
  A sees Term 2 > Term 1 → A acknowledges B's leadership
  A reverts any uncommitted entries to match B's log
  Cluster is consistent.
```

The critical Raft property: **writes require quorum acknowledgment before commit**. A partitioned leader can continue receiving requests but cannot commit any writes without quorum. When the partition heals, uncommitted writes on the isolated leader are discarded in favor of the quorum's state.

### Fencing Tokens: Preventing Stale Leaders from Causing Harm

Even with quorum-based leader election, there is a window of danger: a slow or GC-paused leader may not immediately realize it has been deposed. If it continues serving requests during this window — acting as leader when it has been superseded — it can corrupt data.

Fencing tokens solve this. When a client acquires a lease from a distributed lock or coordination service, it receives a **fencing token** — a monotonically increasing number. The client includes this token in every request to storage systems. Storage systems reject requests with old tokens.

```
Fencing token flow:

Time T1: Client 1 acquires lease from ZooKeeper, receives token=33
Time T2: Client 1 starts write operation with token=33
Time T3: Client 1 pauses (GC pause, network delay)
Time T4: Client 1's lease expires
Time T5: Client 2 acquires lease, receives token=34
Time T6: Client 2 writes to storage with token=34 → accepted
Time T7: Client 1 resumes, writes to storage with token=33 → REJECTED
                                                    (33 < 34, stale token)

Storage server logic:
  if request.fencing_token < current_max_token:
      reject("stale token: you are not the current leader")
  else:
      current_max_token = request.fencing_token
      accept_write()
```

Fencing tokens require storage system cooperation. The storage must track the maximum seen token and reject lower ones. This is why distributed locks often pair with storage systems that natively support conditional writes (CAS — compare and swap).

### STONITH: Shoot The Other Node In The Head

STONITH (Shoot The Other Node In The Head) is a fencing technique used in traditional high-availability clusters (Pacemaker, Corosync, DRBD). When the cluster cannot determine if a node is dead (it might just be unreachable), STONITH forcibly kills the suspicious node before promoting a replacement.

```
STONITH flow:

Primary A and Standby B lose contact.
B cannot determine: is A dead, or is the network between us dead?

B has a STONITH resource configured:
  - IPMI/DRAC access to A's server hardware
  - Power Distribution Unit (PDU) control
  - VMware/cloud instance stop API

B sends STONITH command: "Power off server A"
STONITH confirms: A is powered off.
B is now safe to promote itself to primary.
No split brain possible — A is physically off.
```

STONITH is brutal but effective. It guarantees no split brain by ensuring the old primary cannot possibly accept writes — it is dead. The cost: STONITH adds time to failover (need to confirm A is dead before B can proceed) and requires out-of-band management access to nodes.

In cloud environments, STONITH is implemented via instance stop/terminate APIs (AWS EC2 `terminate-instances`, GCP `compute.instances.stop`). The cluster can terminate a suspected failed instance and immediately start a replacement.

## Deep Dive

### The Raft Consensus Algorithm: Making Quorum Explicit

The Raft paper (Ongaro and Ousterhout, 2014) — "In Search of an Understandable Consensus Algorithm" — was explicitly motivated by Paxos being difficult to understand and implement correctly. Split brain is exactly the failure mode that consensus algorithms prevent: Raft's safety property guarantees that at most one leader exists at any time, and the leader is the only node that can commit log entries.

Raft prevents split brain through the combination of term numbers and majority quorum. Each leadership term is monotonically increasing. A candidate can only become leader if it receives votes from a majority of cluster nodes. If two partitions each attempt to elect a leader, only the partition with a majority of nodes can succeed — the minority partition cannot gather enough votes. The candidate with the higher term wins any conflict, and nodes with stale terms step down immediately upon seeing a higher term.

The lease-based optimization (used in etcd and CockroachDB) extends this for read performance: the leader can serve reads without a round-trip to followers if it holds a "leader lease" — proof that no other leader has been elected since the lease was granted. The lease duration is bounded by the election timeout, ensuring that if the leader is partitioned and loses its lease, it stops serving reads before a new leader is elected elsewhere. This is the mechanism by which single-leader systems avoid serving stale reads without requiring quorum on every read.

### The STONITH Mechanism: Fencing the Former Primary

In database high-availability systems, preventing split brain requires not just electing a new primary, but definitively stopping the old one. Even after a new primary is elected, the old primary may still be running — it just cannot reach the consensus service to renew its lease. If the old primary continues accepting writes during this window, two primaries exist simultaneously: a split brain.

STONITH ("Shoot The Other Node In The Head") is the fencing mechanism that guarantees the old primary stops before the new primary starts accepting writes. STONITH implementations use out-of-band channels — IPMI/BMC interfaces, PDU power control, cloud provider instance stop APIs — to forcibly terminate or power-cycle the old primary node. The new primary does not become active until it confirms (via the same out-of-band channel) that the old primary is terminated.

The Paxos Lease paper (Chandra, Griesemer, Redstone — 2007) introduced the concept of lease-based leadership that underlies most modern implementations. The key insight: if a leader holds a lease of duration L, and the lease was granted at time T, then no other leader can be elected until at least time T+L (because the lease holder would have voted against it). Waiting for the lease to expire before stepping down ensures the old leader is "dead" from the perspective of the consensus protocol, even without explicit STONITH. This is the mechanism etcd uses: a leader that cannot renew its lease simply stops processing writes after the TTL expires, self-fencing without external intervention.

## Implementation Guide

### Detecting and Preventing Split Brain

```go
package ha

import (
    "context"
    "sync"
    "time"
    
    clientv3 "go.etcd.io/etcd/client/v3"
    "go.etcd.io/etcd/client/v3/concurrency"
)

// LeaderElector uses etcd to prevent split-brain leader election.
type LeaderElector struct {
    client     *clientv3.Client
    session    *concurrency.Session
    election   *concurrency.Election
    nodeID     string
    isLeader   bool
    mu         sync.RWMutex
    onPromote  func()
    onDemote   func()
}

func NewLeaderElector(etcdAddrs []string, nodeID string) (*LeaderElector, error) {
    client, err := clientv3.New(clientv3.Config{
        Endpoints:   etcdAddrs,
        DialTimeout: 5 * time.Second,
    })
    if err != nil {
        return nil, err
    }
    
    // Session TTL = 15 seconds: if node cannot reach etcd for 15s,
    // its lease expires and it loses leadership
    session, err := concurrency.NewSession(client, concurrency.WithTTL(15))
    if err != nil {
        return nil, err
    }
    
    return &LeaderElector{
        client:   client,
        session:  session,
        election: concurrency.NewElection(session, "/service/leader"),
        nodeID:   nodeID,
    }, nil
}

func (e *LeaderElector) Run(ctx context.Context) {
    for {
        // Campaign for leadership (blocks until elected or ctx cancelled)
        if err := e.election.Campaign(ctx, e.nodeID); err != nil {
            if ctx.Err() != nil {
                return
            }
            time.Sleep(5 * time.Second)
            continue
        }
        
        // We are now the leader
        e.mu.Lock()
        e.isLeader = true
        e.mu.Unlock()
        
        if e.onPromote != nil {
            e.onPromote()
        }
        
        // Watch for session expiry — if etcd connectivity is lost,
        // our lease will expire and we must step down
        select {
        case <-e.session.Done():
            // Session expired — we lost etcd connectivity
            // MUST step down to prevent split brain
            e.mu.Lock()
            e.isLeader = false
            e.mu.Unlock()
            
            if e.onDemote != nil {
                e.onDemote()
            }
            
            // Recreate session and try again
            e.session, _ = concurrency.NewSession(e.client, concurrency.WithTTL(15))
            e.election = concurrency.NewElection(e.session, "/service/leader")
            
        case <-ctx.Done():
            e.resign(context.Background())
            return
        }
    }
}

func (e *LeaderElector) IsLeader() bool {
    e.mu.RLock()
    defer e.mu.RUnlock()
    return e.isLeader
}

// SafeOperation executes fn only if this node is the current leader.
// Includes fencing: checks leadership immediately before executing.
func (e *LeaderElector) SafeOperation(ctx context.Context, fn func() error) error {
    if !e.IsLeader() {
        return ErrNotLeader
    }
    
    // Double-check with etcd to prevent TOCTOU race
    // (we might have lost leadership between IsLeader() and here)
    leader, err := e.election.Leader(ctx)
    if err != nil || string(leader.Kvs[0].Value) != e.nodeID {
        e.mu.Lock()
        e.isLeader = false
        e.mu.Unlock()
        return ErrNotLeader
    }
    
    return fn()
}

func (e *LeaderElector) resign(ctx context.Context) {
    e.election.Resign(ctx)
    e.mu.Lock()
    e.isLeader = false
    e.mu.Unlock()
}
```

### Monitoring for Split Brain Indicators

```python
# Prometheus metrics and alerts for split brain detection

# Metric: number of leaders in the cluster (should always be exactly 1)
LEADER_COUNT = Gauge('cluster_leader_count', 
                     'Number of nodes believing they are leader')

# Alert: split brain detected
"""
alert: SplitBrainDetected
expr: cluster_leader_count != 1
for: 1m
labels:
  severity: critical
  page: true
annotations:
  summary: "SPLIT BRAIN: {{ $value }} leaders detected"
  runbook: "https://wiki.internal/runbooks/split-brain"
"""

# Metric: etcd/ZooKeeper connectivity (leading indicator)
COORDINATION_SERVICE_REACHABLE = Gauge(
    'coordination_service_reachable',
    '1 if node can reach coordination service (etcd/ZooKeeper), 0 otherwise'
)

# Alert: node losing coordination service connectivity (pre-split-brain)
"""
alert: CoordinationServiceUnreachable
expr: coordination_service_reachable == 0
for: 30s
labels:
  severity: warning
annotations:
  summary: "Node {{ $labels.instance }} cannot reach coordination service"
  description: "This node may lose leadership and trigger a failover"
"""

# Metric: replication lag (stale standby may cause data loss after split brain)
REPLICATION_LAG_SECONDS = Gauge(
    'replication_lag_seconds',
    'Seconds of data replication lag for this standby'
)

"""
alert: HighReplicationLag
expr: replication_lag_seconds > 10
for: 5m
labels:
  severity: warning
annotations:
  summary: "Standby {{ $labels.instance }} is {{ $value }}s behind primary"
  description: "High lag increases data loss risk if primary fails and failover occurs"
"""
```

### Post-Partition Healing Checklist

When a network partition heals, you need a systematic approach to recovery:

```
1. Identify the timeline:
   - When did the partition start?
   - When did each partition's leader accept the last write?
   - What is the divergence window?

2. Determine the authoritative state:
   - Which partition had quorum (majority)? Its state is authoritative.
   - If both had equal node counts (even-size cluster split 50/50):
     → check which had the latest commit timestamp
     → if using Raft: the higher term is authoritative

3. Identify conflicting writes:
   - Query both sides for writes in the divergence window
   - Example (PostgreSQL with Patroni):
     SELECT * FROM table WHERE created_at BETWEEN partition_start AND partition_end;
     (run on both former primaries and compare)

4. Reconciliation:
   - If using Raft/Paxos: automatic — minority discards uncommitted entries
   - If using async replication (MySQL, PostgreSQL streaming):
     → manual: apply missing transactions from authoritative side
     → or: point-in-time recovery to before the divergence
     → or: accept data loss (last resort)

5. Prevent recurrence:
   - Was quorum configured? If not, configure it.
   - Was the partition detected quickly? If not, tune failure detection.
   - Was STONITH available? Consider adding it.
   - Review network redundancy: single switch? Single uplink? Fix it.
```

## When to Use / When NOT to Use

**Always use quorum-based leader election** when:
- You run a primary-secondary (leader-follower) architecture
- Automatic failover is required
- Data correctness is non-negotiable

**Always use fencing tokens** when:
- Your storage system supports conditional writes
- Clients use distributed locks and then access shared storage
- You cannot use STONITH (cloud environments without hard power control)

**STONITH is appropriate when:**
- You run a traditional datacenter HA cluster (Pacemaker, Corosync)
- You have IPMI/DRAC management access to your servers
- You need maximum safety and can tolerate the extra failover time

**Accept the availability trade-off consciously**: A cluster that loses quorum (e.g., 2 of 5 nodes fail) must stop accepting writes to prevent split brain. This is a correctness choice that sacrifices availability. If you need higher availability, you need more nodes or you need to accept weaker consistency (eventual consistency systems like Cassandra use quorum per-operation, not for leadership).

## Common Mistakes

**Mistake 1: Using an even number of nodes**
A 2-node or 4-node cluster creates the possibility of an even partition split (1+1 or 2+2). Neither partition has strict majority. Use odd-numbered clusters: 3, 5, or 7 nodes.

**Mistake 2: Skipping fencing tokens because "quorum is enough"**
Quorum prevents two nodes from simultaneously *believing* they are leader. But a slow leader (GC pause, network jitter) may continue serving for seconds after a new leader has been elected. Fencing tokens prevent the stale leader's requests from corrupting state during this window.

**Mistake 3: Not testing partition recovery**
Partition scenarios are rare in production but critical to handle correctly. Use chaos engineering tools (Chaos Monkey, tc netem, iptables rules) to simulate partitions in staging and verify that:
- The correct partition achieves quorum
- The isolated partition steps down within the expected time
- Data divergence during the partition is bounded and reconcilable
- Recovery after partition healing completes without manual intervention

**Mistake 4: Long etcd/ZooKeeper lease TTLs**
A lease TTL of 60 seconds means a partitioned leader serves incorrect state for up to 60 seconds before stepping down. Use TTLs of 10-30 seconds as a balance between fast failover and resilience to brief network hiccups.

**Mistake 5: No alerting on coordination service connectivity**
Losing access to etcd or ZooKeeper is a precursor to split brain. Alerting on this condition — before it causes a split brain — allows operators to investigate and potentially prevent the split. Add monitoring for coordination service health as a leading indicator.

## Connections

- **Quorum** (Article 03): Quorum is the mathematical foundation of split brain prevention. A partition with quorum is the authoritative partition. Without quorum-based protocols, split brain is inevitable in automatic failover scenarios.
- **Gossip Protocols** (Article 06): Gossip-based failure detection (phi accrual, SWIM) determines when nodes declare each other failed. The speed and accuracy of failure detection affects how quickly a partition is detected and how quickly split brain prevention kicks in.
- **Two-Phase Commit** (Article 05): 2PC's coordinator failure problem is related to split brain: a coordinator that is partitioned from participants creates a situation analogous to split brain in the transaction protocol. Raft/Paxos-backed coordinators prevent this.
- **Service Discovery** (Article 09): Service discovery systems (Consul, etcd) must themselves be split-brain resistant. Consul's use of Raft for its key-value store means Consul can prevent split brain in services that use it for leader election.
- **The Fallacies** (Article 01): Split brain is the ultimate manifestation of Fallacy 1 (the network is reliable). A healthy, correctly-configured cluster with perfectly-written software can still experience split brain because the network that connects its nodes is not reliable.

## Key Insights

**Insight 1: Split brain is not a bug — it is the natural result of a network partition.** Two healthy nodes, separated by a failed network, behaving exactly as designed will both try to become the leader. Split brain is not a failure of the nodes. It is a failure of the design to account for partition behavior. The fix is not better nodes — it is a protocol that handles partitions correctly.

**Insight 2: Availability and consistency cannot both be preserved during a partition (CAP theorem).** When a partition occurs, you must choose: stop serving writes (sacrifice availability, preserve consistency) or continue serving writes on both sides (sacrifice consistency, preserve availability). Quorum-based systems choose consistency by stopping the minority partition. Dynamo-style systems choose availability by continuing on both sides and reconciling later.

**Insight 3: The "split-brain" metaphor is apt but incomplete.** A brain split can (in some interpretations) be healed if the two halves can be reconnected. A database split brain is harder to heal — the divergent state may be irreconcilable without data loss. CRDT data types are the only data structures that can survive a split brain and heal without data loss, because their merge operation is mathematically guaranteed to converge.

**Insight 4: Automation makes split brain more dangerous, not less.** Manual failover gives operators time to assess the situation. Automatic failover happens in seconds, before anyone can intervene. An automatic failover triggered by a false positive (slow network, GC pause) can cause split brain in an otherwise healthy cluster. Tune failure detection conservatively — it is better to fail over a few seconds slower than to trigger split brain.

**Insight 5: Cloud environments have unique split brain challenges.** In a datacenter, STONITH via IPMI or PDU is reliable. In AWS or GCP, "STONITH" is an instance stop API call — which itself goes through the network. If the network is partitioned, the STONITH call might not reach the target. Cloud-native HA systems (RDS Multi-AZ, Aurora, Cloud Spanner) handle this by building partition tolerance into the storage layer, so that the application-level failover is always safe regardless of network state.

The bottom line: split brain is the boogeyman of distributed systems. It hides until the worst possible moment, causes the most confusing failures, and requires the most careful recovery. The defense is not complicated — quorum, fencing tokens, and battle-tested coordination services — but it must be built in from the start. Retrofitting split brain prevention into an existing system is far harder than designing it correctly from the beginning.
