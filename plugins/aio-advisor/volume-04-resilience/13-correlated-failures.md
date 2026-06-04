# Minimizing Correlated Failures

> "A single failure is an incident. Correlated failures are a catastrophe. The difference between them is architecture." — AWS Builder's Library

## The Problem

When engineers think about system reliability, they typically reason about individual component failure rates. A server with 99.9% availability will be unavailable for roughly 44 minutes per month. Run two servers and the probability of both failing simultaneously, if failures are independent, is 0.001 × 0.001 = 0.000001 — one-millionth chance. Three servers with independent failures gives you a probability of simultaneous failure so small it's essentially zero. Add redundancy, eliminate single points of failure, problem solved.

This reasoning is sound but contains a critical assumption: that failures are independent. In practice, many failures are correlated — caused by the same underlying event, triggered by the same stimulus, or made more likely by the same conditions. When failures are correlated, redundancy provides far less protection than the independent-failure math suggests.

Consider: three application servers, each with 99.9% availability from hardware failures. But all three are deployed with the same code, deployed simultaneously. When a bug in the new deployment causes a memory leak, all three servers run out of memory within minutes of each other. The probability of the triple-server failure is not (0.001)^3 — it's the probability of the deployment having a bug, which might be 5% for a complex change. Three servers with independent hardware failure rates of 0.001 but correlated deployment failure rate of 0.05 provide much less redundancy than the hardware math suggests.

Real-world correlated failure causes:
- **Shared code**: The same bug affects all replicas simultaneously when triggered
- **Shared dependencies**: All replicas depend on the same database; database failure affects all simultaneously
- **Synchronized deployments**: All replicas deploy the same change at the same time
- **Thundering herd**: All replicas restart simultaneously (after a deployment, an update, an auto-scaling event) and simultaneously flood dependencies with requests
- **Shared hardware**: All replicas are in the same rack, same availability zone, same physical datacenter
- **Correlated load**: All replicas receive traffic from the same set of clients; a client spike affects all replicas equally
- **Shared configuration**: All replicas use the same configuration service; a bad config push hits all replicas simultaneously
- **Time-based correlation**: Cron jobs on all replicas fire at the same second; cache TTLs expire simultaneously across all replicas

The insidious property of correlated failures is that they often occur during changes — deployments, configuration updates, scaling events. These are the moments when operators are watching but also the moments when the system is most vulnerable. A correlated failure during a deployment can make the deployment look like the cause when the real cause is the correlation mechanism that made a single bug affect all replicas.

## Core Concept

Minimizing correlated failures means deliberately breaking the causal links that would cause multiple components to fail simultaneously. The strategies are:

1. **Fault isolation boundaries**: Deploy components into failure domains that cannot share failures (AZs, cells, shuffle shards)
2. **Staggered deployments**: Don't deploy changes to all replicas simultaneously; deploy progressively with health validation between waves
3. **Jittered timers**: Don't let time-synchronized events (cron jobs, cache refreshes, heartbeats) fire simultaneously across all instances
4. **Dependency diversification**: Different replicas use different dependency instances where possible, so one dependency failure doesn't affect all replicas
5. **State partitioning**: Distribute state across multiple independent stores, so a single store failure affects only a fraction of users
6. **Chaos testing for correlated failures**: Explicitly test scenarios where multiple components fail simultaneously

### The Independence Requirement

For redundancy to provide the mathematical protection it promises, failures must be truly independent. Independence means:
- Different physical hardware (no shared chassis, power, network)
- Different software versions or deployment windows
- Different configuration sources or configuration applied at different times
- Different dependency instances or different network paths to the same dependency
- Different timing for periodic operations

Perfect independence is impossible — at some level, all components in a system share something (the same IP block, the same cloud provider, the same codebase). The goal is not perfect independence but reducing correlation enough that simultaneous failure of multiple components requires multiple independent unlikely events rather than one common cause.

### The AZ Model

AWS Availability Zones are the primary infrastructure tool for reducing correlated hardware failures. Each AZ has:
- Independent power (separate power grids, separate UPS, separate generators)
- Independent networking (separate network equipment, separate internet connections)
- Independent physical location (physically separated buildings, often kilometers apart)
- Independent failure domains (a flood, fire, or power outage that affects one AZ does not affect others)

Deploying replicas across AZs breaks the correlation for hardware, power, and network failures. It does not break correlation for software failures (all AZs run the same code) or configuration failures (a bad config push goes to all AZs simultaneously).

The AZ model must be combined with other techniques to address software and configuration correlation.

## Deep Dive

The Builder's Library article "Minimizing correlated failures in distributed systems" introduces a distinction that has significant practical consequences: the difference between independent failure probability and correlated failure probability. The standard reliability calculation for N replicas with individual failure rate p assumes independent failures, giving a joint failure probability of p^N. This calculation is correct for hardware failures, which are genuinely independent (one server's disk failing does not cause another server's disk to fail). It is wrong for software failures, which are almost perfectly correlated: a bug deployed to all replicas simultaneously produces a joint failure probability approximately equal to the probability of the deployment containing the bug — not p^N but p^1. Three replicas of a service with a 1% hardware failure rate have a joint hardware failure probability of 0.000001. Three replicas of the same service running the same software version have a joint software failure probability of roughly 1% if any deployment has a 1% chance of containing a critical bug. The redundancy that hardware diversity provides is real; the redundancy that software diversity should provide is rarely implemented.

The correlated cache expiry problem, documented in the Builder's Library with the specific mitigation of jittered TTLs, is a canonical example of how operational correctness requires analyzing the second-order effects of distributed system design. The first-order analysis: caches should expire to ensure data freshness. The second-order analysis: if all instances cache the same data at the same time (because they all started at the same time during a deployment), all instances' caches expire at the same time. The first cache miss after expiry triggers a query to the origin. If 500 instances simultaneously experience this miss, 500 concurrent queries hit the origin at once — the "thundering herd" or "cache stampede" pattern. The mitigation — adding random jitter to TTLs — has no cost in terms of data freshness (the jitter is small relative to the TTL) but distributes the cache miss load over a window rather than concentrating it at a single moment.

The SRE Book's chapter on software reliability addresses code correlation through the concept of version diversity in production. The book documents a practice where rolling deployments deliberately leave some fraction of the fleet on the previous version throughout the deployment window. This is not a temporary state — it is a policy that ensures there is always a healthy population of instances at the previous version that can serve traffic if the new version introduces a correlated failure. The SRE Book's specific recommendation is to maintain at least 10% of instances on the previous version for a period after deployment completes — a "bake time" during which the new version is considered provisional. This practice transforms deployment failures from "all instances fail simultaneously" to "new version instances fail, previous version instances continue serving."

Kleppmann's *Designing Data-Intensive Applications* provides the theoretical framework for understanding correlated failures through its analysis of fault models. DDIA distinguishes between independent faults (hardware failures, isolated process crashes) and correlated faults (software bugs, configuration errors, power outages). DDIA's observation that most high-availability designs handle independent faults well but correlated faults poorly is the key insight: RAID protects against individual disk failure but not against bugs in the RAID controller firmware; database replication protects against single-server hardware failure but not against bugs in the database software that affect all replicas simultaneously. The practical implication is that availability calculations based on independent fault models are systematically optimistic for software systems, where the dominant failure mode is correlated bugs rather than independent hardware.

The deployment ring model, documented in the Azure Well-Architected Framework and used by multiple major software organizations, addresses code correlation through explicit time sequencing. Rather than deploying to all instances simultaneously or rolling out uniformly, ring deployment defines an ordered sequence of deployment targets with health validation between rings. Ring 0 (internal or canary users) receives the change first. If Ring 0 health checks pass, Ring 1 (a small fraction of production traffic) receives it next. The progression continues through rings of increasing size, with automated rollback if any ring fails validation. The key property: at any moment during a ring deployment, most of the fleet is still on the previous version. A bug that produces correlated failures in the newly deployed ring is caught while the blast radius is bounded to that ring's traffic fraction. The ring model is the organizational implementation of the same principle that jittered TTLs implement technically: break the simultaneity of changes to prevent correlated impact.

## Implementation Guide

### Step 1: Map Your Correlation Sources

For your service, identify every axis along which failures could be correlated:

```
Failure correlation audit for service X:

Hardware correlation:
- Are replicas distributed across AZs? YES / NO
- Are replicas in the same rack/datacenter within an AZ? YES / NO

Software correlation:
- Are all replicas running the same code version? YES / NO (if YES: deployment correlation)
- Are all replicas using the same configuration? YES / NO (if YES: config correlation)

Dependency correlation:
- Do all replicas use the same database endpoint? YES / NO
- Do all replicas use the same cache cluster? YES / NO
- Do all replicas call the same external service endpoint? YES / NO

Time-based correlation:
- Are there cron jobs running at the same time on all replicas? YES / NO
- Are cache TTLs fixed (not jittered)? YES / NO
- Do replicas restart simultaneously (during deployments)? YES / NO
```

Each "YES" is a correlation source to address.

### Step 2: Add Jitter to All Timers

Every fixed-interval timer is a potential correlation point:

```go
// BEFORE: All instances refresh at exactly the same time
func (c *ConfigCache) StartRefresh() {
    ticker := time.NewTicker(5 * time.Minute)
    for range ticker.C {
        c.refresh()
    }
}

// AFTER: Refresh interval jittered ±20% across instances
func (c *ConfigCache) StartRefresh() {
    base := 5 * time.Minute
    jitter := time.Duration(rand.Int63n(int64(base / 5))) // ±20%
    ticker := time.NewTicker(base + jitter - base/10)
    for range ticker.C {
        c.refresh()
    }
}
```

Apply jitter to:
- Cache TTLs: `ttl = base + rand.Int63n(base/5)` (jitter up to 20%)
- Retry delays: (covered in Article 03)
- Health check intervals
- Connection keepalive intervals
- Cron job schedules (use a small random offset, not exactly :00 of each hour)
- Startup initialization delays (prevents thundering herd on mass restart)

### Step 3: Stagger Deployments

Never deploy to all replicas simultaneously. Implement rolling deployments with health validation:

```yaml
# Kubernetes rolling deployment strategy
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Only 1 new pod at a time
    maxUnavailable: 0  # Never take pods down before replacement is healthy

# AWS CodeDeploy configuration
deploymentConfig:
  type: Linear
  linearParams:
    interval: 5         # Every 5 minutes
    percentage: 10      # Deploy to 10% of instances at a time
    # With 10 instances: takes 50 minutes, but any failure is caught at 10% blast radius
```

Between each deployment wave:
- Wait for health checks to pass
- Wait for error rate to stabilize
- Check latency percentiles against baseline
- Only proceed if all checks pass

### Step 4: Break Dependency Correlation

When all replicas depend on the same single endpoint for a critical dependency, that dependency is a correlated failure source:

```python
# BEFORE: All replicas connect to the same primary DB
DB_HOST = "prod-db-primary.internal"

# AFTER: Each AZ's replicas connect to a local read replica
# Write traffic still goes to primary; read traffic is distributed
import os

AZ = os.environ.get("AWS_AVAILABILITY_ZONE")
DB_READ_HOST = {
    "us-east-1a": "prod-db-replica-1a.internal",
    "us-east-1b": "prod-db-replica-1b.internal",
    "us-east-1c": "prod-db-replica-1c.internal",
}.get(AZ, "prod-db-primary.internal")
```

For cache clusters, use consistent hashing with per-AZ nodes so a single node failure affects a bounded fraction of keys rather than all keys for that node:

```python
from consistent_hash import ConsistentHash

# Different hash ring per AZ — AZ failure affects only that AZ's cache
cache_ring = ConsistentHash(
    nodes=cache_nodes_for_current_az(),
    replicas=150  # Consistent hashing replicas for even distribution
)
```

### Step 5: Test Correlated Failure Scenarios

Your chaos engineering program (Article 08) should explicitly include correlated failure scenarios:

```python
def test_simultaneous_az_failure_and_bad_deployment():
    """
    Test that a bad deployment affecting 50% of replicas
    combined with an AZ failure doesn't cause total outage
    """
    # Fail AZ-A
    block_traffic_to_az("us-east-1a")
    
    # Simultaneously trigger a high-error-rate deployment to AZ-B
    deploy_bad_version(az="us-east-1b", error_rate=0.5)
    
    # Verify AZ-C alone can handle full traffic
    assert_service_availability(min_availability=0.99)
    assert_latency_within_slo(p99_ms=500)
    
    # Clean up
    restore_az_traffic("us-east-1a")
    rollback_deployment(az="us-east-1b")
```

Common correlated failure scenarios to test:
- AZ failure + deployment in progress
- Configuration update + dependency failure
- Mass instance restart + cache miss storm
- Retry storm + dependency recovery

## When to Use / When NOT to Use

**Correlated failure mitigation is essential for:**
- Any service with availability SLOs above 99.9%
- Services where full outage (vs. partial degradation) is unacceptable
- Services with synchronized periodic operations
- Services deployed into multi-AZ environments

**May not justify the complexity when:**
- Service availability requirements are modest (internal tools, non-critical analytics)
- The service is single-AZ by design and AZ correlation is already accepted
- The deployment cadence is very low (monthly releases) making deployment correlation rare
- The service is small enough that all replicas can be on the same hardware without meaningful risk

## Common Mistakes

**AZ diversity without software diversity**: Spreading replicas across AZs protects against hardware failures but not against software bugs. A bad deployment still hits all AZs. AZ diversity must be combined with staggered deployments.

**Fixed cache TTLs causing miss storms**: Uniform TTLs cause uniform expiry. A cache that was populated during a mass restart expires at a uniform time, causing a mass miss. Always jitter TTLs.

**Synchronized cron jobs**: Every instance firing a cron job at exactly :00 floods dependencies simultaneously. Add per-instance random offsets (e.g., `start_second = hash(instance_id) % 60`).

**Ignoring control plane correlation**: Configuration management systems, service discovery, and deployment pipelines are shared by all instances. A bad configuration push to the config service can cause correlated failures across all services using it. Apply the same staggered deployment and validation principles to configuration changes.

**Not testing correlated scenarios**: Testing individual component failures is necessary but insufficient. Explicitly test scenarios where multiple components fail simultaneously.

**Thundering herd on startup**: When all instances restart simultaneously (during a mass deployment or an orchestrator restart), all simultaneously attempt to warm caches, load configuration, and establish connections. This floods dependencies. Add a random startup delay (0-30 seconds) to spread the startup load.

## Connections

**Backoff and jitter (Article 03)**: Jitter breaks time-based correlation in retry storms. It's the primary tool for breaking the "all fail simultaneously, all retry simultaneously" pattern.

**Cell-based architecture (Article 07)**: Cells are the architectural-level tool for breaking software-level correlation. Different cells can run different versions; a bad deployment in one cell doesn't correlate with others.

**Shuffle sharding (Article 05)**: Shuffle sharding breaks tenant-level correlation. A bug triggered by tenant A's traffic affects only shards containing tenant A's servers, not the full fleet.

**Safe deployments (Article 14)**: Staggered deployments are the primary tool for breaking deployment-time correlation. Progressive deployment with health validation catches correlated failures while they affect a small fraction of the fleet.

**Chaos engineering (Article 08)**: Correlated failure scenarios — simultaneous failures, mass restarts, synchronized cache expiry — must be explicitly included in chaos engineering exercises.

**Static stability (Article 06)**: Static stability reduces dependency on control plane synchronization. When replicas don't need to periodically re-fetch configuration, there's no synchronized fetch storm to worry about.

## Key Insights

The most dangerous assumption in reliability engineering is that redundancy provides protection proportional to the number of replicas. This math is only correct when failures are independent. When failures are correlated — shared code, shared dependencies, synchronized deployments, synchronized timers — multiple replicas provide much less protection than the raw numbers suggest.

The best test for correlation: when something goes wrong, do all your replicas fail within seconds of each other, or do they fail at different times? If it's simultaneously, you have correlation to break. A replica that fails 5 minutes after the others is infinitely more valuable than three replicas that all fail at once — that 5-minute offset is the window for detection, diagnosis, and mitigation.

Jitter deserves special attention because its value is consistently underestimated. Adding `random.uniform(0, 0.2) * base_interval` to every timer costs nothing and breaks time-based correlation across the board. It's one of the highest-leverage reliability techniques: free to implement, effective across many failure modes, and easy to reason about.

The AWS multi-AZ model is the infrastructure answer to hardware correlation; staggered deployments are the software answer to code correlation; jittered timers are the answer to time correlation; and dependency distribution is the answer to shared-dependency correlation. Together, these form a comprehensive defense against the correlated failures that turn single-component incidents into total outages.
