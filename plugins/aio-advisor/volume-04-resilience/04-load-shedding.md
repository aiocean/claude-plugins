# Load Shedding — Reject to Survive

> "The most important thing a server can do when it's overloaded is stop accepting more work. Serving everyone poorly serves no one well." — from Google SRE Book

## The Problem

Every service has a capacity limit. Under normal conditions, that limit is invisible — requests arrive, get processed, and return results without anyone thinking about headroom. But distributed systems regularly encounter traffic spikes, dependency slowdowns, and cascading load increases that push services past their comfortable operating range. What happens then determines the difference between a partial service degradation and a total outage.

The instinctive response to overload is to try harder: spin up more goroutines, queue more requests, hold connections longer in hope that capacity frees up. This is exactly wrong. A server that's at 110% capacity and accepts more requests is not becoming more helpful — it's becoming less helpful to everyone. As queues fill and threads multiply, latency climbs for all requests, not just the excess ones. At 150% capacity, nothing is completing fast enough to be useful. At 200% capacity, the server may OOM and crash, taking all in-flight work with it and causing a complete outage when a partial one would have sufficed.

The correct response to overload is the opposite of instinct: accept less work. Explicitly reject excess requests with a fast 503 error rather than accepting them into a queue where they'll wait so long that they time out anyway. This is load shedding, and it is the difference between a server that degrades gracefully under pressure and one that collapses.

The counterintuitive insight is that a server rejecting 20% of requests is serving more total useful work than a server accepting all requests and serving none of them well. The 80% that gets through receives fast, correct responses. The 20% that's rejected gets a fast error, which allows the caller to try alternatives (a different region, a fallback, a user-visible error) immediately rather than waiting 30 seconds for a timeout. Fast rejection is a form of service, not a failure.

The second part of the problem is that load shedding must be discriminating, not random. Not all requests have equal value. A payment processing request should not be shed in favor of a click-tracking event. A premium customer's request should not be shed before a free tier user's request. Effective load shedding requires a priority model — a way to rank incoming work so that the most important work is the last to be shed.

## Core Concept

Load shedding is the practice of proactively rejecting requests when a service is approaching its capacity limits, in order to maintain acceptable response quality for the requests that are accepted.

The core mechanism is an admission control system: a component that evaluates each incoming request against the current load state and decides whether to process it or reject it immediately. The admission controller needs two things: a signal of current load state, and a policy for which requests to reject.

### Load Signals

Common signals used to trigger load shedding:

**Queue depth**: The number of requests waiting to be processed. A queue of 0-10 is healthy. A queue of 1000 means requests are waiting far longer than acceptable. Queue depth is a leading indicator — it starts growing before latency spikes.

**CPU utilization**: When the server's CPU is above ~80% sustained, adding more work increases latency non-linearly due to context switching and resource contention. CPU-based shedding prevents the non-linear degradation zone.

**Latency of recent requests**: If the p99 latency of recently completed requests exceeds the SLO threshold, the server is already overloaded for the most expensive work. Shedding new requests prevents the latency distribution from widening further.

**Active request count**: The number of requests currently being processed. Above a configured limit, new requests are rejected. This is simple to implement and effective for CPU-bound workloads.

**Thread/goroutine pool saturation**: When the worker pool is full, queueing more work will only increase wait times. Reject at the pool boundary rather than queuing.

### Prioritization Models

Load shedding without prioritization is random deletion. Under slight overload, random shedding may be acceptable. Under sustained overload, you need a policy that protects high-value work.

**Static priority tiers**: Requests are classified into priority classes at ingestion (by endpoint, user tier, request type, etc.). Under load, the lowest priority tier is shed first. As load increases, progressively higher tiers are shed.

Example tiers:
1. Health checks and internal monitoring (never shed)
2. Critical user operations (payment, checkout, auth) — shed last
3. Standard user operations (browse, search, view)
4. Background analytics and tracking — shed first

**Request cost-based shedding**: Some requests are more expensive than others. A complex search query costs 10x a simple ID lookup. Cost-based admission control limits total compute expenditure rather than request count, which more accurately models the actual load.

**Customer tier-based shedding**: In multi-tenant systems, premium customers' requests are protected while free-tier requests are shed. This is politically charged but technically straightforward, and it aligns with the business model in many SaaS products.

**Dynamic priority based on timeout budget**: Requests that are about to time out (have very little deadline remaining) can be shed because completing them won't satisfy the caller anyway. This improves the work ratio — time spent completing requests that return useful results vs. time spent completing requests that are already abandoned.

### Admission Control vs. Queue Management

There are two places to implement load shedding: at the front door (admission control) and at the work queue (queue management).

Admission control rejects at ingestion — the request never enters the system. This is the most efficient form of shedding because no resources are allocated to the rejected request. The challenge is accurately estimating current load at ingestion time.

Queue management sheds from the waiting queue — requests that have been accepted but not yet started processing are dropped if the queue grows too large. This is easier to implement but wastes the resources already spent on accepting the request. For stateless HTTP requests, the difference is minimal. For work with expensive setup (database connection acquisition, authentication validation), admitting and then shedding is meaningfully wasteful.

The best implementations use both: admission control prevents unbounded growth, and queue management handles bursts that slip through.

## Deep Dive

The SRE Book's chapter on handling overload contains one of the most counterintuitive but empirically grounded observations in distributed systems engineering: a server that is at 110% capacity and continues accepting requests does less useful work per unit time than one that rejects the excess 10% and serves the remainder at full quality. The mechanism behind this is queueing theory's nonlinear relationship between utilization and latency. At 80% utilization, average queue time is modest. At 95% utilization, average queue time grows rapidly. At 100%+, the queue grows without bound and latency becomes unlimited. The server that is "helping everyone" at 110% is delivering infinite latency — which is mathematically equivalent to serving no one. Load shedding breaks this by sacrificing the marginal requests to preserve quality for the infra-marginal ones.

The criticality propagation mechanism documented in the SRE Book represents a significant architectural insight about multi-tier service systems. In a deep call graph, a user-facing request labeled "interactive/critical" generates downstream RPC calls that carry that criticality annotation in their gRPC metadata. When a downstream service is under load and must shed requests, it consults the criticality field to decide which to reject: batch/background requests first, then best-effort, then critical only as a last resort. The critical insight is that a downstream service operating on behalf of a critical request should make different admission decisions than one operating on behalf of a background job, even if the downstream service itself doesn't know the end-to-end context. The criticality field makes that context explicit and propagatable.

The Builder's Library's principle "the smaller service controls its own rate" encodes a specific theory about where admission control should live in a distributed architecture. The alternative — relying on callers to reduce their rate when downstream services are struggling — depends on all callers behaving cooperatively and on feedback signals reaching them quickly. In practice, callers are heterogeneous (some implement backoff, some don't), feedback signals are delayed (callers observe 503s only after the service is already overwhelmed), and new callers may join the fleet without knowing to moderate their rate. Server-side admission control that operates independently of caller behavior is robust to all three failure modes.

The token bucket algorithm's mathematical properties make it particularly well-suited for admission control under varying load. Unlike leaky bucket, which smooths output to a constant rate and therefore queues bursts (delaying rather than shedding), token bucket with immediate rejection converts instantaneous bursts into fast failures rather than slow ones. The SRE Book's discussion of overload handling observes that fast rejection is a form of service to the caller: a 503 returned in 1 millisecond allows the caller to try alternatives, fail fast, or return a useful error to the user. A 503 returned after a 30-second timeout delivers the same outcome after holding resources for 30,000 milliseconds of additional cost. From a systems perspective, the token bucket's fast rejection behavior is load shedding done correctly.

Nygard's *Release It!* frames the overload problem in terms of bulkheads — the shipbuilding practice of compartmentalizing hull sections so a single leak cannot sink the vessel. Nygard's application of this metaphor to software is that thread pools and connection pools should be partitioned by criticality, not shared globally. A single global thread pool means that expensive requests (batch processing, complex queries) compete for threads with cheap requests (health checks, simple lookups). When expensive requests fill the pool, cheap requests queue alongside them, degrading the service for all callers equally. Priority-partitioned thread pools — a small pool for health checks that is never shared, a larger pool for interactive requests, a separate pool for batch work — implement hardware-level bulkheads that prevent one request class from starving another.

The timing relationship between load shedding and auto-scaling reveals why shedding is not merely a stopgap but a necessary component of any scaling strategy. Auto-scaling typically requires 2-10 minutes to provision, configure, and warm up new instances. A service that begins degrading linearly under load will spend those 2-10 minutes in a progressively worsening state unless admission control limits the damage. With load shedding, the service maintains SLO for the requests it accepts during the scaling window, at the cost of rejecting some fraction of requests. Without it, the service degrades for all requests simultaneously. The tradeoff is not between perfect service and imperfect service; it is between imperfect service for some callers and imperfect service for all callers.

## Implementation Guide

### Step 1: Define Your Load Signals

Choose the signals that best represent load for your workload:

```go
type LoadState struct {
    QueueDepth    int
    ActiveWorkers int
    MaxWorkers    int
    CPUPercent    float64
    P99LatencyMs  float64
}

func (ls LoadState) LoadFactor() float64 {
    // Composite load factor: 0.0 = idle, 1.0 = at capacity
    queueFactor := float64(ls.QueueDepth) / float64(ls.MaxWorkers * 2)
    workerFactor := float64(ls.ActiveWorkers) / float64(ls.MaxWorkers)
    cpuFactor := ls.CPUPercent / 80.0 // Start shedding at 80% CPU
    
    return math.Max(math.Max(queueFactor, workerFactor), cpuFactor)
}
```

### Step 2: Implement Priority Classification

Map requests to priority levels at ingestion:

```go
type Priority int

const (
    PriorityHealthCheck Priority = 0 // Never shed
    PriorityCritical    Priority = 1 // Shed last
    PriorityStandard    Priority = 2 // Normal work
    PriorityBackground  Priority = 3 // Shed first
)

func classifyRequest(r *http.Request) Priority {
    if r.URL.Path == "/health" || r.URL.Path == "/metrics" {
        return PriorityHealthCheck
    }
    if r.URL.Path == "/checkout" || r.URL.Path == "/payment" {
        return PriorityCritical
    }
    if r.Header.Get("X-Background-Task") == "true" {
        return PriorityBackground
    }
    return PriorityStandard
}
```

### Step 3: Implement the Admission Controller

```go
type AdmissionController struct {
    loadState func() LoadState
}

func (ac *AdmissionController) Admit(priority Priority) bool {
    ls := ac.loadState()
    loadFactor := ls.LoadFactor()
    
    switch priority {
    case PriorityHealthCheck:
        return true // Always admit
    case PriorityCritical:
        return loadFactor < 0.95 // Shed only at near-collapse
    case PriorityStandard:
        return loadFactor < 0.80 // Shed when approaching capacity
    case PriorityBackground:
        return loadFactor < 0.50 // Shed when half capacity used
    }
    return false
}

func LoadSheddingMiddleware(ac *AdmissionController) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            priority := classifyRequest(r)
            if !ac.Admit(priority) {
                w.Header().Set("Retry-After", "5")
                w.WriteHeader(http.StatusServiceUnavailable)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

### Step 4: Return Meaningful Error Responses

A rejected request should receive a response that:
- Uses HTTP 503 (Service Unavailable) or 429 (Too Many Requests)
- Includes a `Retry-After` header with an estimated recovery time
- Includes enough information for the caller to decide whether to retry, fail fast, or try an alternative

```go
w.Header().Set("Retry-After", "10")
w.Header().Set("X-Shed-Reason", "server-overload")
w.WriteHeader(http.StatusServiceUnavailable)
json.NewEncoder(w).Encode(map[string]string{
    "error": "service temporarily overloaded",
    "retry_after_seconds": "10",
})
```

### Step 5: Instrument Load Shedding Events

Track shedding as a first-class metric:

```
http_requests_shed_total{priority="background", reason="queue_depth"} 1234
http_requests_shed_total{priority="standard", reason="cpu_high"} 56
load_factor_current 0.87
```

Alert when shedding rates are elevated:
- Background shedding at >10% is expected; track as informational
- Standard shedding at >5% warrants a ticket
- Critical shedding at >0% warrants a page

## When to Use / When NOT to Use

**Use load shedding for:**
- User-facing services with strict latency SLOs
- Services processing work of varying importance
- Services that cannot scale fast enough to handle traffic spikes
- Any service that must protect critical functionality under partial overload

**Load shedding is less effective when:**
- All requests are equally important (no prioritization benefit)
- The workload is batch/async with no real-time latency requirement
- Traffic is always below capacity (shedding logic adds overhead with no benefit)

**Combine load shedding with:**
- Auto-scaling (shedding buys time while new instances start)
- Circuit breakers (stop calling failing dependencies, reducing internal load)
- Back pressure (signal to upstream services to slow down)

**Do not use load shedding as:**
- A substitute for capacity planning (if you're always shedding, you need more capacity)
- A security mechanism (it doesn't distinguish malicious from legitimate traffic)

## Common Mistakes

**Shedding at the wrong threshold**: Setting the shed threshold too high means you start shedding after performance has already degraded. Set thresholds to trigger before the non-linear degradation zone (typically 75-80% capacity).

**No priority model**: Random shedding under load is better than no shedding, but priority-based shedding maintains the most important work under pressure. Define priorities before the first incident, not during one.

**Not testing shedding behavior**: Load shedding logic is critical path code that is never exercised during normal operation. Write load tests that deliberately exceed capacity and verify the shedding behavior is correct.

**Shedding without feedback to callers**: A 503 with no guidance is unhelpful. Include Retry-After. Include enough context for the caller to decide whether to retry, fail fast, or use an alternative.

**Forgetting health checks**: Health checks must never be shed. If a load balancer can't reach the health check endpoint, it will stop sending traffic — exactly when you need traffic to keep coming.

**Static thresholds that don't account for workload variability**: A CPU threshold appropriate for normal request mix may be wrong during a write-heavy spike. Consider dynamic thresholds or workload-aware admission control.

## Connections

**Back pressure (Article 11)**: Load shedding is the server-side mechanism; back pressure is the signal that propagates the overload state upstream. Together they create a feedback loop that stabilizes load.

**Graceful degradation (Article 09)**: When shedding, choose which features to disable rather than which requests to drop. Shedding background analytics while serving full functionality to core requests is graceful degradation.

**Error budgets (Article 01)**: Shedding requests consumes error budget (shed requests are failures). Monitor shedding rates against budget consumption.

**Shuffle sharding (Article 05)**: In multi-tenant systems, load shedding per shard prevents a single tenant's traffic spike from triggering global shedding.

**Health endpoint monitoring (Article 15)**: The load state used for admission control decisions should be exposed via health endpoints so external systems (load balancers, orchestrators) can route around overloaded instances.

## Key Insights

The hardest mental model shift in load shedding is from "serve everyone" to "serve the most important requests well." A service under pressure wants to help everyone; the correct behavior is to help fewer requests reliably. Fast rejection of low-priority work is not failure — it's a protective measure that preserves quality for high-priority work.

The temporal argument is equally important: a 503 returned in 1 millisecond is infinitely more useful to a caller than a 503 returned after a 30-second timeout. The caller can immediately try an alternative, degrade gracefully, or surface an error to the user. A caller waiting 30 seconds for a timeout can do nothing useful in that window.

Load shedding is also honest. A service that claims to handle all requests but delivers degraded results to all of them is being dishonest about its capacity. A service that admits it's overloaded, tells some callers to come back later, and delivers full-quality results to the requests it accepts is being honest about its capacity and maximizing the value it delivers.

Set up load shedding before you need it. Like a circuit breaker on a house, it's useless to install after the fire. The time to define priority models, configure thresholds, and test shedding behavior is during the calm before the incident, not during the incident itself.
