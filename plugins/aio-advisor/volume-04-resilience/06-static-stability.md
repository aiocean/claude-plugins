# Static Stability — Survive Without the Control Plane

> "Your data plane should be able to run forever on what it already knows. The control plane updates the world; the data plane serves it." — AWS Builder's Library

## The Problem

Modern distributed systems are layered. There's a data plane — the code that actually handles user requests, processes transactions, serves content — and a control plane — the code that configures the data plane, manages resources, updates routing tables, and coordinates system state. In healthy operation, the control plane and data plane work in concert. The control plane updates configuration; the data plane picks it up and adjusts behavior. This separation is clean, elegant, and standard.

The failure mode that most architects don't plan for: what happens when the control plane becomes unavailable while the data plane is running? In many systems, the answer is "the data plane stops working correctly." Load balancers can't get updated routing tables. Auto-scaling groups can't get new instance configurations. Service discovery clients can't find healthy endpoints. Feature flag systems can't evaluate rules. The control plane, which is supposed to be management infrastructure, becomes a dependency for every user request.

This pattern — where the data plane requires constant communication with the control plane to function — is called control plane coupling. It's extremely common and extremely dangerous because it means that the management infrastructure for your production system is also a production dependency. The system designed to make your services more reliable is itself a point of failure that can take down those services.

The problem compounds during the exact moments you need your data plane most. Control plane failures often happen during high-traffic events, major deployments, or partial infrastructure failures — precisely the circumstances where the data plane needs to be maximally available. A control plane that goes down during Black Friday, taking configuration management and auto-scaling with it, is not a theoretical scenario. It's a documented failure pattern at multiple major organizations.

The second dimension of this problem is what happens when a control plane recovers from a failure. The recovering control plane may attempt to "restore" state that was actually fine — scaling down resources that the data plane was relying on, pushing configuration updates that cause mass restarts, or clearing cache entries that were providing blast radius containment. A naively implemented control plane recovery can cause a secondary outage worse than the original.

## Core Concept

Static stability is the property of a data plane that can continue operating correctly using only the resources and configuration it already has, without requiring any communication with the control plane.

A statically stable data plane:
- Serves requests using its current configuration, even if that configuration is stale
- Does not stop working when configuration management is unavailable
- Does not continuously poll for configuration that may not be available
- Preserves its current resource allocation rather than aggressively scaling down

The key insight: the data plane should be designed assuming the control plane is always temporarily unavailable. Not permanently, but at any moment. Configuration should be read at startup and cached; the system should run on that cache indefinitely if necessary. Resource allocation should be pre-provisioned rather than dynamically requested. Routing tables should be pre-loaded, not looked up on demand.

### Bimodal Behavior — The Anti-Pattern

The opposite of static stability is bimodal behavior: a system that works normally when the control plane is healthy but fails in a completely different way when it's not. Bimodal systems are dangerous because the failure mode is exercised rarely (control plane failures are uncommon), making it easy to miss in testing and hard to diagnose in incidents.

A common example: a service that does service discovery via a central registry. When the registry is healthy, the service discovers endpoints and routes requests. When the registry is unavailable, the service... does what? If the service has no fallback, it fails to start or returns errors for all requests. If it has a stale cache, it might work for a while. If the cache expires, it fails. The behavior differs dramatically between the normal path and the failure path, making the system bimodal.

Static stability eliminates bimodal behavior by making the failure path identical to the normal path: both use cached, pre-provisioned, locally available configuration. The system doesn't "know" whether the control plane is available because it doesn't need to.

### Pre-Provisioning vs. Just-in-Time

The defining operational practice of static stability is pre-provisioning: allocating resources before they're needed rather than requesting them when they're needed.

Consider AWS Availability Zones. A typical auto-scaling group might start with 2 instances in each of 3 AZs, with a minimum of 1 per AZ. Under normal operation, the auto-scaling group dynamically adds and removes instances based on demand. This works well when the control plane is healthy.

Now simulate an AZ failure. Traffic fails over to the remaining 2 AZs. Demand doubles in those AZs. The auto-scaling group controller needs to scale up... but the auto-scaling service itself is experiencing issues because it runs partly in the failed AZ. The controller is delayed. Traffic is arriving 2x faster than normal. The existing instances are getting overloaded.

The static stability approach: pre-provision each AZ to handle 100% of expected traffic, not 33%. Yes, this costs 3x more to run. But when an AZ fails, the remaining AZs can handle the full load without any control plane action. The data plane is statically stable — it continues operating correctly on resources it already has.

This is the AWS model for AZ design: each AZ is provisioned to handle the full service load, not one-third of it. The cost is higher baseline resource usage. The benefit is that AZ failures do not require control plane intervention to handle.

## Deep Dive

The Builder's Library article "Static stability using Availability Zones" opens with a principle that initially reads as obvious but carries significant operational weight: "avoid making changes during impaired conditions." The deeper meaning emerges when you consider what "changes" includes. When an AZ fails and traffic must shift to the remaining AZs, the instinctive response is to take action — invoke auto-scaling, update routing tables, trigger runbooks. The Builder's Library argues that this instinct is wrong. The control plane mechanisms required to take those actions are themselves likely to be degraded during an AZ failure. A recovery action that requires a healthy control plane will fail or partially execute during the exact conditions that triggered it. The better design pre-positions the system to handle failures without control plane assistance, so that the correct response to an AZ failure is to do nothing — the data plane continues serving from pre-provisioned capacity, and the control plane's job is limited to restoring steady-state after the incident is resolved.

The pre-provisioning cost arithmetic from the Builder's Library deserves scrutiny because it is frequently cited but rarely fully internalized. Pre-provisioning each AZ to handle 100% of traffic in a three-AZ deployment means running at approximately 33% utilization during normal operation — you are paying for three times the capacity needed to handle current traffic. This sounds wasteful, and in a narrow accounting it is. The correct framing compares this cost not against "no redundancy" but against the alternative: dynamic scaling that relies on the control plane during AZ failure. The dynamic alternative runs at 100% utilization normally but requires 2-10 minutes of auto-scaling during a failover — 2-10 minutes during which the service is running at 150-200% of the remaining AZs' capacity. The pre-provisioning approach trades ongoing infrastructure cost for instant, zero-action-required failover. For services with strict SLOs, this trade is almost always correct.

The SRE Book's discussion of the data plane / control plane separation is grounded in a specific historical observation: several large Google outages were caused not by data plane failures but by control plane failures that disrupted data planes that should have been independent. The failure mode is subtle. A configuration management service that goes down doesn't immediately break user-facing requests — it breaks user-facing requests after the configuration cache expires on data plane nodes. The latent coupling only reveals itself when the cache TTL is reached during the control plane outage. This is why the SRE Book recommends setting cache TTLs based on "how stale can this configuration be without harming users?" rather than "how fresh do we want configuration to be?" A feature flag cache with a 24-hour TTL can survive a 24-hour configuration service outage. One with a 5-minute TTL cannot. The SRE Book frames this as a conscious reliability investment: pay in configuration freshness, gain in control plane independence.

Kleppmann's *Designing Data-Intensive Applications* provides the theoretical grounding for static stability in its chapter on replication and consistency. The CAP theorem's partition tolerance dimension describes exactly the static stability property: in the presence of network partitions (which include control plane failures that sever the data plane from its configuration source), a system must choose between consistency (requiring the control plane to be available for every data plane decision) and availability (continuing to serve with potentially stale configuration). Static stability chooses availability. DDIA extends this to the PACELC model, which acknowledges that even without partitions, there are latency-consistency tradeoffs. A data plane that fetches fresh configuration on every request has lower configuration latency but higher request latency. One that caches configuration locally has higher configuration latency but lower request latency. DDIA's framing makes explicit what static stability implicitly accepts: stale configuration is a deliberate engineering choice, not a failure to achieve freshness.

The bimodal behavior antipattern discussed in the Core Concept section maps directly to what Nygard calls "integration point" failures in *Release It!*. A service that behaves differently depending on whether a configuration service is reachable is an integration point in disguise: the configuration service is a runtime dependency masquerading as management infrastructure. Nygard's prescription — test integration points under failure conditions — applies directly: the only way to know whether a data plane is truly statically stable is to test it with the control plane blocked. Services that have never been tested under control plane failure almost invariably reveal hidden dependencies during that test. The value of the test is not just validation but discovery: finding the implicit control plane dependencies that were never intended to be in the critical path but crept in over time as the simplest way to solve immediate problems.

## Implementation Guide

### Step 1: Identify Control Plane Dependencies

Audit your data path for control plane dependencies. For every request your service handles, ask: what external services does this request touch, and which of those are control plane vs. data plane?

Common control plane dependencies hiding in data paths:
- **Service discovery**: Looking up service addresses per request
- **Configuration management**: Fetching feature flags or config per request
- **Secrets management**: Fetching credentials on each use
- **Authorization services**: Checking permissions per request
- **Rate limit counters**: Consulting a central counter per request

Each of these should be audited: can it be cached? Pre-loaded at startup? Computed locally without network calls?

### Step 2: Move Configuration to Startup

If your service fetches configuration on each request, move it to startup with periodic refresh:

```go
type ConfigCache struct {
    mu      sync.RWMutex
    config  *ServiceConfig
    updated time.Time
}

func (cc *ConfigCache) Start(ctx context.Context, source ConfigSource) {
    // Load at startup — fail if unavailable at start
    if err := cc.refresh(source); err != nil {
        log.Fatalf("failed to load initial config: %v", err)
    }
    
    // Refresh periodically in background
    go func() {
        ticker := time.NewTicker(30 * time.Second)
        for {
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
                if err := cc.refresh(source); err != nil {
                    // Log but continue using cached config
                    log.Warnf("config refresh failed, using cached: %v", err)
                }
            }
        }
    }()
}

func (cc *ConfigCache) Get() *ServiceConfig {
    cc.mu.RLock()
    defer cc.mu.RUnlock()
    return cc.config // Always returns something, even if stale
}
```

### Step 3: Pre-Provision Capacity

Design your scaling policy to pre-provision based on worst-case demand, not current demand:

For AZ-based deployments:
- Target capacity: 100% of expected peak per AZ
- Minimum instances per AZ: enough to handle 100% of expected traffic
- Don't rely on auto-scaling to handle AZ failover — pre-provision that capacity

For time-based load patterns:
- If traffic peaks at 9am daily, start scaling at 8:30am — before the load arrives
- Don't wait for load to arrive and then scale — scale in anticipation

### Step 4: Design Graceful Stale Configuration Handling

Define what "stale configuration is acceptable" means for each configuration type:

```go
type ConfigAge struct {
    MaxAcceptableAge time.Duration
    WarnAge          time.Duration
}

var configAges = map[string]ConfigAge{
    "feature_flags":  {MaxAcceptableAge: 24 * time.Hour, WarnAge: 1 * time.Hour},
    "routing_rules":  {MaxAcceptableAge: 1 * time.Hour, WarnAge: 10 * time.Minute},
    "rate_limits":    {MaxAcceptableAge: 5 * time.Minute, WarnAge: 1 * time.Minute},
    "tls_certs":      {MaxAcceptableAge: 7 * 24 * time.Hour, WarnAge: 24 * time.Hour},
}
```

For configuration that becomes dangerous if stale (like TLS certificates about to expire), implement proactive renewal rather than on-demand refresh.

### Step 5: Test Without the Control Plane

Write tests and run drills that verify data plane operation with control plane unavailability:

```bash
# Chaos test: take down configuration service
# Verify: requests continue to be served
# Verify: configuration from before outage is used
# Verify: alerts fire for stale configuration
# Verify: when control plane recovers, configuration updates correctly

# Capacity test: simulate AZ failure
# Verify: traffic routes to remaining AZs without manual intervention
# Verify: pre-provisioned capacity handles full load
# Verify: no control plane action is required
```

Include static stability tests in your chaos engineering program (Article 08). The control plane should be one of the first things your chaos experiments target.

## When to Use / When NOT to Use

**Static stability is essential for:**
- Any service with hard availability requirements (payment, auth, core API)
- Services deployed across multiple AZs where AZ failover must be automatic
- Services that depend on other AWS/cloud managed services (which can themselves have control plane issues)
- Services in multi-region deployments where cross-region control plane communication introduces latency and failure risk

**Static stability adds complexity without benefit when:**
- The service is a true batch/offline workload where brief unavailability is acceptable
- Control plane and data plane are the same process (no separation to maintain)
- The deployment is single-AZ/single-region and regional availability is not a requirement

**Common design smell indicating control plane coupling:**
- Service fails health checks immediately when configuration service is unreachable
- Service cannot start when configuration service is unreachable at startup
- All instances restart simultaneously when configuration is updated
- AZ failover requires manual intervention

## Common Mistakes

**Caching configuration but expiring it too aggressively**: A 5-minute TTL means a 5-minute configuration service outage will affect 100% of requests after 5 minutes. Set TTLs based on how stale the configuration can be, not on how fresh you want it.

**Failing fast on configuration refresh failure**: When the control plane is unavailable, the correct response is to use cached configuration, not to start returning errors. Log a warning, increment a metric, but continue serving.

**Auto-scaling as the only capacity buffer**: If your only protection against an AZ failure is auto-scaling, you're relying on the control plane to handle the failure. Pre-provision capacity.

**Recovery that makes things worse**: A control plane recovering from an outage may try to "fix" the state it sees, which might mean terminating instances that the data plane spun up to handle the load. Implement recovery policies that are additive (add resources) rather than corrective (fix to desired state) during failure windows.

**Not testing the failure path**: The static stability failure path (control plane unavailable) is rarely tested because it's rarely triggered. Include it explicitly in load tests and game days.

## Connections

**Graceful degradation (Article 09)**: Static stability is a specific form of graceful degradation — the service degrades gracefully (uses stale config) rather than failing completely when the control plane is unavailable.

**Cell-based architecture (Article 07)**: Cells are statically provisioned failure domains. The cell sizing decision (how large each cell should be) is directly related to static stability — each cell should be sized to handle load without relying on cross-cell coordination.

**Safe deployments (Article 14)**: Deployment pipelines are control plane components. A deployment pipeline outage shouldn't affect running services. Static stability ensures deployed services keep running even if the deployment system is down.

**Chaos engineering (Article 08)**: Control plane failure is one of the most valuable chaos experiments precisely because it's rarely tested. GameDays should regularly include "take down the control plane, verify data plane continues."

**Health endpoint monitoring (Article 15)**: Health checks should verify data plane health, not control plane reachability. A health check that fails because the configuration service is unreachable is conflating data plane health with control plane health.

## Key Insights

Static stability requires a fundamental shift in how you think about system design. The natural tendency is to minimize resource usage by making everything dynamic and on-demand. Static stability says: for critical paths, pre-provision and pre-load. Accept the cost of pre-provisioning in exchange for the resilience of not needing runtime coordination.

The AZ pre-provisioning pattern from AWS is the clearest illustration of this tradeoff. Pre-provisioning each AZ to handle 100% of traffic costs 3x the resources of provisioning each for 33%. In exchange, any single-AZ failure is handled automatically, immediately, without any control plane action. The cost is mechanical; the benefit is resilience under exactly the conditions (AZ failure + elevated load) where control plane reliability is most suspect.

The principle extends beyond AZs. Every configuration fetch can be pre-loaded. Every credential can be cached with proactive renewal. Every routing table can be baked in at startup. Every secret can be loaded once and held in memory rather than fetched on use.

The operational test for static stability: can your service run for 24 hours with all control plane communication blocked? If the answer is "no" or "maybe" or "it depends on the configuration TTL", you have control plane coupling to fix. The data plane should be able to run indefinitely on what it already has.
