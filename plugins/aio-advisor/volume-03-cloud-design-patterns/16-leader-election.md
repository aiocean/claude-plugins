# Leader Election Pattern

> "A distributed system is one in which the failure of a computer you didn't even know existed can render your own computer unusable." — Leslie Lamport

## The Problem

You have three instances of a service running for high availability. But one of those instances has a job that must only run once: processing the scheduled payment batch at midnight, cleaning up expired sessions, syncing a cache with the source of truth, or acting as the primary node for replication. If all three instances try to do this job simultaneously, you get duplicate work — double charges, inconsistent state, race conditions. If none of them do it because each is waiting for the others, you get a deadlock or a missed operation.

This is the coordination problem in distributed systems. You have multiple identical processes, and you need exactly one of them to act as the "leader" responsible for a specific task at any given time. The others become followers, standing by to take over if the leader fails. The challenge: how do you elect a leader without a centralized oracle? How do you prevent two instances from simultaneously believing they are the leader — the "split-brain" problem? How do you ensure the old leader stops acting as leader before the new one starts?

These questions are not academic. In 2012, GitHub experienced an outage caused by a split-brain scenario in their MySQL replication setup: two MySQL instances simultaneously believed they were the primary, leading to divergent data writes that required manual reconciliation. Similar incidents have affected Redis Sentinel, Elasticsearch, and virtually every distributed database at some point. Leader election done wrong is not just a bug — it is a data corruption event.

## Core Concept

Leader election is the process by which a set of distributed processes agree on which single process is the current leader. The leader holds a lease — a time-limited claim to leadership — and must continuously renew it to retain the role. If the leader fails to renew (because it crashed, lost network connectivity, or became too slow), the lease expires and another process can acquire it.

```
Normal Operation:
  ┌─────────────────────────────────────────────┐
  │  Instance A (LEADER)                        │
  │  - Holds lease, renewing every 10s          │
  │  - Executing leader-only work               │
  └─────────────────────────────────────────────┘
  ┌──────────────┐  ┌──────────────┐
  │ Instance B   │  │ Instance C   │
  │ (FOLLOWER)   │  │ (FOLLOWER)   │
  │ - Watching   │  │ - Watching   │
  │   for lease  │  │   for lease  │
  │   expiry     │  │   expiry     │
  └──────────────┘  └──────────────┘

Leader Failure:
  ┌─────────────────────────────────────────────┐
  │  Instance A (CRASHED)                       │
  │  - Lease expires after TTL                  │
  └─────────────────────────────────────────────┘
  ┌──────────────┐  ┌──────────────┐
  │ Instance B   │  │ Instance C   │
  │ (CANDIDATE)  │  │ (CANDIDATE)  │
  │              │  │              │
  └──────┬───────┘  └───────┬──────┘
         │   race to        │
         │   acquire        │
         └──────────────────┘
                │
                v
  ┌─────────────────────────────────────────────┐
  │  Instance B (NEW LEADER)                    │
  │  - Won the race, acquired lease             │
  └─────────────────────────────────────────────┘
```

The critical property: at most one leader at any time. This is called the "safety" property. A secondary property is "liveness": a leader will eventually be elected after a failure. The tension between safety and liveness is fundamental to distributed consensus.

### Lease-Based Election

The most practical implementation for cloud systems uses a distributed lock with a time-to-live (TTL). The lock is stored in a strongly consistent external store (etcd, ZooKeeper, Redis with appropriate configuration, a relational database with appropriate isolation).

```
Algorithm:
1. All instances attempt to write a lock record: 
   key="leader", value=instance_id, TTL=30s
   
2. The instance that successfully writes first becomes leader.

3. Leader must renew the lock every (TTL/3) seconds.
   Renewal: update TTL timestamp while value=my_instance_id

4. If renewal fails (e.g., lease lost), instance must 
   immediately stop leader-only work.

5. Followers watch the lock. When TTL expires or value 
   changes, they race to acquire.
```

### Fencing Tokens — The Critical Safety Mechanism

Here is the subtle problem: a leader that believes it is the leader may not actually be the current leader. Consider this scenario:

```
Time 0: Leader A holds lease (TTL=30s)
Time 5: Leader A is hit by a long GC pause (stop-the-world, 45 seconds)
Time 30: Lease expires. Instance B acquires lease, becomes new leader.
Time 50: Leader A's GC pause ends. It resumes, still believes it is leader.
         Now BOTH A and B believe they are the leader.
```

This is the split-brain scenario. The solution is fencing tokens:

```
When a lease is acquired, the store returns a monotonically 
increasing integer: the fencing token.

Token 1: Instance A acquires lease
Token 2: Instance B acquires lease (after A's lease expired)

When A (with token 1) tries to write to the protected resource,
the resource rejects it because token 1 < current token (2).

When B (with token 2) writes, the resource accepts it.
```

Fencing tokens require the protected resource to also participate in the safety protocol. This is the design described by Martin Kleppmann in "Designing Data-Intensive Applications" and is the only correct way to prevent split-brain in a lease-based system.

## Deep Dive

**The Chubby paper and coarse-grained locking.** The canonical academic foundation for distributed leader election in production systems is Mike Burrows' 2006 paper "Chubby: A Lock Service for Loosely-Coupled Distributed Systems." Chubby underpins leader election for the Google File System, Bigtable, and numerous other Google infrastructure components. The paper's central design insight — which runs counter to intuition — is that the lock service should be optimized for coarse-grained locking (leases held for seconds to minutes) rather than fine-grained locking (locks held for milliseconds). Coarse-grained locking dramatically reduces the load on the lock service: a leader that holds a lease for 30 seconds requires one renewal per 30 seconds rather than thousands of lock acquisitions per second. The paper explicitly rejects the alternative of a high-throughput, low-latency lock service: Chubby's availability and consistency requirements are better served by a design that minimizes the frequency of coordination operations.

**Fencing tokens and the split-brain problem.** Martin Kleppmann's *Designing Data-Intensive Applications* provides the clearest analysis of the fundamental safety problem in lease-based leader election: the leader may believe it holds the lease while the lease has actually expired. A leader that experiences a garbage collection pause, a network partition, or a system clock jump may pause for longer than the lease TTL. When it resumes, it still believes it is the leader — but a new leader has already been elected and is operating. Without additional protection, both instances write to shared state simultaneously, producing corruption. Kleppmann's solution is the fencing token: a monotonically increasing integer that increments each time a lease is acquired. The leader includes its fencing token in every write to the protected resource. The protected resource rejects writes with a fencing token lower than the highest it has seen. A stale leader's writes are rejected even if it believes it holds the lease. Kleppmann's point is that correctness requires the protected resource to participate — the lock service alone cannot guarantee safety.

**The Raft and Paxos consensus algorithms.** The Raft consensus algorithm, described in Diego Ongaro and John Ousterhout's 2014 paper "In Search of an Understandable Consensus Algorithm," provides a formally correct mechanism for leader election as a component of distributed consensus. Raft's leader election is term-based: each election cycle increments the term number; a candidate that receives a majority of votes becomes the leader for that term; any message from a previous term is rejected. This provides the same fencing property as Kleppmann's fencing token, but at the consensus protocol level. Kleppmann's *DDIA* treats Raft (along with Paxos and Viewstamped Replication) as the correct foundation for distributed systems that require leader election with strong consistency guarantees. The practical implication: systems that require correct leader election under network partitions should use a purpose-built consensus service (etcd, ZooKeeper) rather than implementing election from scratch with TTL-based locks.

**The Kleppmann-Antirez debate and Redlock.** The most important practical controversy in distributed locking is the 2016 debate between Martin Kleppmann and Redis creator Salvatore Sanfilippo (Antirez) over the correctness of the Redlock algorithm. Redlock is an algorithm for distributed locking across multiple independent Redis nodes, designed to provide safety even when individual Redis nodes fail. Kleppmann's analysis identified a fundamental flaw: Redlock relies on timing assumptions (locks expire after a wall-clock TTL) that are violated by process pauses and clock drift in real systems. A process that pauses during lock hold can wake up after the lock has expired, believing it still holds the lock, and proceed to take exclusive action while another process has acquired the lock. Antirez contested this analysis, arguing that the practical probability is low. The debate was never fully resolved, but Kleppmann's conclusion stands: for systems where correctness under all failure conditions is mandatory (financial transactions, data integrity operations), Redlock and TTL-based locking are insufficient. Consensus-based systems (etcd, ZooKeeper) provide the correct guarantees.

**Lease duration as a trade-off between availability and recovery time.** The Google SRE Book's treatment of availability targets provides the framework for the lease duration choice. A short lease (5 seconds) means a failed leader is detected and replaced within 5 seconds — minimizing unavailability during leader failure. But it also means the renewal rate is high (every 2-3 seconds to maintain a safety margin), and a brief network hiccup can cause the lease to expire and trigger an unnecessary re-election. A long lease (60 seconds) tolerates network hiccups but means up to 60 seconds of leader failure before a new leader is elected. The correct choice depends on the specific availability requirements: if the protected operation must recover within 10 seconds, leases must be 10 seconds or shorter; if a 60-second recovery window is acceptable, longer leases reduce coordination overhead. The SRE Book's analysis of error budgets applies: the recovery time from leader failure contributes to the service's error budget, and the lease duration must be sized to keep that contribution within the budget.

// Renewal loop (run every 10 seconds)
await leaseClient.RenewAsync(conditions: new BlobLeaseRequestConditions {
    LeaseId = _currentLeaseId
});
```

Azure Blob leases are backed by Azure Storage's strong consistency guarantees. The lease ID (a GUID) serves as the fencing token — operations on the blob must include the lease ID to succeed.

Microsoft's guidance recommends this pattern for scenarios like: singleton background workers in AKS, single-writer cache synchronization, and distributed cron job scheduling.

## Implementation Guide

### Step 1: Choose Your Coordination Store

| Store | Consistency | TTL Support | Notes |
|-------|-------------|-------------|-------|
| etcd | Strong (Raft) | Yes | Purpose-built for coordination |
| ZooKeeper | Strong (ZAB) | Session-based | Battle-tested, heavier |
| Redis (single) | Strong on single node | Yes (SETNX) | Not safe in cluster mode without Redlock |
| DynamoDB | Strong (conditional write) | Manual (TTL attribute) | Good for AWS workloads |
| Azure Blob | Strong | Lease-based (15-60s) | Good for Azure workloads |
| PostgreSQL | Strong (MVCC) | Manual | Works, but adds DB load |

### Step 2: Implement with the client library

For most teams using Kubernetes, use the built-in leader election client rather than rolling your own:

```go
// Go: Using k8s.io/client-go leader election
import "k8s.io/client-go/tools/leaderelection"

leaderelection.RunOrDie(ctx, leaderelection.LeaderElectionConfig{
    Lock:            resourceLock,
    ReleaseOnCancel: true,
    LeaseDuration:   15 * time.Second,
    RenewDeadline:   10 * time.Second,
    RetryPeriod:     2 * time.Second,
    Callbacks: leaderelection.LeaderCallbacks{
        OnStartedLeading: func(ctx context.Context) {
            // Run leader-only work here
            runLeaderWork(ctx)
        },
        OnStoppedLeading: func() {
            // Immediately stop all leader work
            log.Fatal("lost leader election, terminating")
        },
        OnNewLeader: func(identity string) {
            log.Printf("new leader: %s", identity)
        },
    },
})
```

Note `OnStoppedLeading` calls `log.Fatal` — this is intentional. The safest response to losing the lease is to terminate immediately. This ensures the process cannot continue doing leader work after lease loss.

### Step 3: Design for Lease Loss

When a process loses the lease (fails to renew before TTL expires), it must:

1. **Stop all leader-only work immediately.** No finishing the current batch, no cleanup — stop.
2. **Crash or restart.** This is the safest approach. A process that "knows" it lost the lease but tries to finish is dangerous.
3. **Use fencing tokens on all writes to shared resources.** Even after stopping, in-flight writes may still reach the resource. The resource must reject writes with stale fencing tokens.

### Step 4: Tune Lease Duration

```
TTL too short: Frequent unnecessary failovers during transient network 
               hiccups. Leader constantly churning.

TTL too long:  Long gap between leader failure and new leader election.
               Impact duration of leader-only work interruptions.

Recommendation:
  LeaseDuration = 15-30 seconds
  RenewDeadline = 10-20 seconds (must be < LeaseDuration)
  RetryPeriod   = 2-5 seconds
  
  A leader must renew before RenewDeadline.
  If it cannot, it assumes lease loss and stops.
  TTL ensures old lease expires before new leader acquires.
```

## When to Use / When NOT to Use

**Use when:**
- A task must run on exactly one instance at a time (scheduled jobs, singleton workers)
- You have stateful replication and need a single primary writer
- You need to coordinate cache invalidation or refresh across instances
- You have a distributed system that makes decisions with global state (sharding assignment, partition assignment)

**Do NOT use when:**
- The task is idempotent and running it multiple times is safe — just let all instances run it and use idempotency keys to deduplicate results
- The coordination overhead exceeds the value — for tasks that run in milliseconds, the election latency may dominate
- **You actually need consensus, not just a leader** — if you need agreement on a value across all nodes (not just a designated executor), use Raft or Paxos consensus, not just leader election
- **A simpler alternative exists** — AWS EventBridge Scheduler, cron on a single dedicated worker, or database-level locking may be simpler and sufficient

## Common Mistakes

**Mistake 1: Ignoring fencing tokens.** Implementing a lease-based leader election but not implementing fencing on the protected resource. This makes the leader election theater — split-brain can still cause data corruption.

**Mistake 2: "Graceful" shutdown on lease loss.** A leader that loses the lease tries to "finish cleanly" before stopping. During the finish, it is writing to shared resources as a now-illegitimate leader while the real new leader is also writing. This causes corruption. Stop immediately on lease loss.

**Mistake 3: Using Redis Cluster for election.** Redis Cluster uses asynchronous replication. A leader can write a lock to a Redis primary, the primary can fail before replicating to the replica, the replica becomes primary, and a second instance can acquire the "same" lock. Redlock attempts to address this but has contested correctness. Use etcd or ZooKeeper for strong-consistency election.

**Mistake 4: Not considering clock skew.** Some lease implementations use wall clock timestamps. A leader with a clock that runs fast will think its TTL hasn't expired when it actually has; one with a slow clock will give up leadership prematurely. Use monotonic clocks for renewal intervals, not wall clocks.

**Mistake 5: Leader as bottleneck.** All clients route through the leader for reads and writes because "the leader has the latest data." This eliminates the scalability benefit of having multiple instances. Leaders should coordinate, not serve. Followers should serve reads where consistency allows.

## Connections

**Saga Pattern** (Article 22): Distributed sagas may use leader election to ensure a single saga orchestrator is running at any time, preventing duplicate transaction coordination.

**Sharding Pattern** (Article 23): Sharding assignment — deciding which node owns which shard — often requires a leader to make the assignment decision and distribute it. Consistent hashing reduces how often this decision must change.

**Queue-Based Load Leveling** (Article 20): Leader election is often used to elect a single consumer for a poison-pill queue (one where ordering matters and only one consumer should process at a time).

**Retry Pattern** (Article 21): Lease renewal implements its own retry logic. Understanding exponential backoff and jitter applies to designing the retry behavior of lease renewal attempts.

## Key Insights

1. **The lease expiry is not the leader's decision.** The coordination store decides when the lease expires based on time-to-live. The leader cannot extend its own lease by declaring it still valid — it can only renew before expiry. This is what makes leases safe.

2. **Fencing tokens are the only correct defense against split-brain.** Process pauses (GC, VM suspension, network partition) can cause a leader to act as leader after losing the lease. Fencing tokens at the protected resource are the only defense. Relying solely on the leader "knowing" it lost the lease is not safe.

3. **Crash on lease loss.** The simplest and safest response to lease loss is to terminate the process. This guarantees no further leader-only work. Restart managers (Kubernetes, systemd) will restart the process, which will re-enter the follower pool. "Sophisticated" graceful shutdown is often the source of split-brain bugs.

4. **You might not need leader election.** If your task is idempotent, you don't need a leader — any instance can run it. If your task runs on a single dedicated worker, you don't need election — just deploy one. Leader election is the right tool for a specific problem: multiple identical instances where exactly one must act at any given time.

5. **Raft and Paxos are consensus protocols, not just election algorithms.** Raft elects a leader as part of achieving distributed consensus on a log of values. If you're using etcd or ZooKeeper, you're using Raft or ZAB consensus under the hood. Understanding this matters when reasoning about failure scenarios.

6. **Lease duration determines failover time.** A 30-second lease means up to 30 seconds of leader-only work interruption after a leader failure. This is the fundamental latency of leader election. Tune it based on the acceptable interruption window for your use case.

7. **Leadership is a role, not an identity.** Any instance can become leader. The leader identity should be stored in shared state (the lease), not hard-coded or configuration-based. Instances should behave identically except for what they do when they hold the lease.
