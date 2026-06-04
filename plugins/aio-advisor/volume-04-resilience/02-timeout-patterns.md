# Timeout Patterns — Never Wait Forever

> "A slow system is worse than a broken one. A broken system fails fast and lets you recover. A slow system holds your resources hostage indefinitely." — from AWS Builder's Library

## The Problem

Every distributed system call has three possible outcomes: success, failure, or silence. The first two are manageable — you handle the result or the error and move on. The third is catastrophic because you don't know when it ends. A thread waiting on a call that will never return is a thread not serving other requests. A hundred such threads means your service is down even though technically none of its components have "failed."

This is the pathology of slow dependencies. When a downstream service starts responding slowly — not erroring, just slow — it creates a resource leak at every caller. Connection pools fill with waiting connections. Thread pools fill with blocked threads. Request queues back up. Memory climbs as in-flight requests accumulate state. The upstream service experiences a traffic slowdown and starts responding slowly to its callers, who experience the same resource exhaustion. This is the classic cascading failure pattern, and its root cause is not the slow dependency — it's the callers failing to bound how long they'll wait.

A service that returns an error in 10 milliseconds is a better neighbor than a service that returns an error in 10 seconds. The former lets you fail fast, release resources, and try an alternative. The latter holds your resources for 10 seconds per request, limiting you to roughly 100 concurrent in-flight requests per thread before you're fully blocked. At modern traffic volumes, that's an outage.

The problem is compounded in deep service graphs. If Service A calls Service B which calls Service C, and C starts responding slowly, B fills up waiting for C. A fills up waiting for B. The blast radius of C's slowness is not limited to C's direct callers — it propagates up the entire dependency tree. Systems that are otherwise completely unrelated to C can fail because they share Service B with a caller that uses C. Timeouts at every layer, with careful propagation of remaining time budgets, are the only defense.

## Core Concept

A timeout is a commitment: "I will not wait longer than X time for this operation." Timeouts transform silent failure into fast failure, which makes recovery possible. They are one of the most fundamental resilience mechanisms in distributed systems, and they are also one of the most frequently misconfigured.

There are three distinct types of timeouts that serve different purposes:

**Connection timeout**: How long to wait for a connection to be established. This bounds the time spent waiting for the TCP handshake (or TLS negotiation) to complete. Connection failures usually happen fast — within a few hundred milliseconds — if the host is unreachable. But if the host is reachable but overloaded, it may accept the connection slowly. Connection timeouts should be short: 1-5 seconds is typical.

**Read timeout** (also called socket timeout or response timeout): How long to wait for data to arrive after the connection is established. This bounds the time between sending a request and receiving the response. This is the timeout most commonly relevant to slow dependency problems. Read timeouts need to be set based on the expected latency of the operation — a fast key-value lookup should have a timeout measured in tens of milliseconds; a complex database query might need seconds.

**Overall request timeout** (also called deadline): The total time budget for an entire operation, from start to finish, including retries. This is the most important timeout for preventing cascading failures because it bounds the total resource holding time regardless of how many retries or connection attempts are made.

These three types are not mutually exclusive. A well-configured HTTP client sets all three: a connection timeout of 2 seconds, a read timeout of 5 seconds, and an overall deadline of 10 seconds. Even with retries, the total time spent on any single logical request is bounded at 10 seconds.

### Why "No Timeout" Is Not a Configuration Choice

Many HTTP clients and database drivers have default configurations with no timeout, or with very long timeouts (minutes or hours). This is a configuration that makes sense for batch jobs and long-running operations but is catastrophically wrong for synchronous service-to-service calls. Check your HTTP client's documentation. If it says "default: no timeout" or "default: 30 minutes", you need to configure explicit timeouts for every client your service uses.

The same applies to database connections, message queue operations, cache lookups, and any other I/O operation. The "no timeout" default exists because the library authors could not know what timeout is appropriate for your use case — so they left it unset rather than guessing. This is the correct library design decision and the wrong operational assumption.

### Deadline Propagation

In a service graph where A calls B calls C, the timeout story gets more complex. If A has a 5-second overall timeout for a request that ultimately requires C to do work, B needs to pass some portion of that 5-second budget to C. If B sets its own fixed 10-second timeout for calls to C, then C can take up to 10 seconds even though A will give up after 5. The work C does between second 5 and second 10 is wasted: A has already timed out and returned an error to its caller.

Deadline propagation solves this. Instead of each service setting independent timeouts, each service tracks a deadline — a specific point in time by which the work must be complete — and passes that deadline downstream. When calling C, B computes "I have 4 seconds remaining before A's deadline; I'll set C's timeout to 4 seconds minus my own overhead." C returns early (or is cancelled) if it cannot complete within the remaining budget.

gRPC implements deadline propagation natively. Every gRPC call can carry a deadline in the request metadata, and the gRPC framework propagates that deadline through the call chain. If the deadline expires at any point in the chain, all downstream RPCs are cancelled immediately. HTTP/1.1 has no native deadline propagation, so it must be implemented in application code — typically by passing a request-scoped context (Go's `context.Context`, Java's gRPC metadata, Python's asyncio context) through the call chain.

The practical implication: services in the middle of a call chain should not set timeouts independently. They should extract the remaining deadline from the incoming request and use that as the timeout for outgoing calls. Services at the top of the chain (user-facing APIs) set the initial deadline; everything downstream inherits and enforces it.

## Deep Dive

The foundational insight about timeouts in distributed systems is not about the mechanism but about the failure mode they prevent. Michael Nygard's *Release It!* identifies the "integration point" as the single most common source of cascading failures, and the mechanism is almost always the same: a slow downstream service holds threads at the upstream caller, which holds threads at its caller, propagating resource exhaustion up the call chain until the originating service is unresponsive despite every component technically still running. Nygard's term for this is the "blocked thread" antipattern, and timeouts are its primary antidote.

The distinction between connection timeout and read timeout, while technically obvious, is operationally important in a way that often gets missed. A service can refuse connections quickly (triggering the connection timeout and failing fast) or accept connections and then respond slowly (only caught by the read timeout). These two failure modes have very different causes — the former often indicates the service is down or unreachable, the latter that it is overloaded or performing expensive work. Treating them with the same timeout value conflates two different signals. The Builder's Library's article "Timeouts, retries, and backoff with jitter" makes this distinction explicit: connection failures at the TCP layer happen in milliseconds or not at all, while slow responses are the dangerous failure mode requiring calibrated read timeouts.

The p99.9 calibration principle from the Builder's Library deserves examination. Setting a read timeout at 2-3x the p99.9 latency has a precise meaning: it means that under normal conditions, approximately 1 in 1000 requests will timeout even when the dependency is healthy. This is an acceptable false positive rate for most systems, but it implies that at high request volumes, timeout errors will appear in dashboards constantly. Teams that have not internalized this principle often interpret the timeout noise as a sign that something is wrong and either raise the timeout (defeating the purpose) or ignore the alerts (missing real degradations). The baseline timeout rate — what percentage of requests time out when the dependency is completely healthy — is a metric worth computing and documenting explicitly.

The gRPC specification's treatment of deadlines represents a qualitative advance over per-call timeouts. A deadline is a point in absolute time, not a relative duration. This means that when a deadline is propagated across service boundaries, each downstream service receives the same deadline, not a recalculated duration. The practical consequence: if Service A sets a 5-second deadline and spends 1 second on local processing before calling Service B, B's deadline is already 4 seconds from now — not 5 seconds from when B receives the call. This subtlety matters because duration-based timeouts in multi-hop chains can accidentally grant downstream services more time than the upstream caller has remaining, causing work to continue after the user-facing request has already timed out. The SRE Book describes this wasted work as a significant source of unnecessary load during cascading failures.

The SRE Book's discussion of cascading failures treats timeout misconfiguration as a second-order failure mode: the original failure is the slow dependency, but the cascade is caused by callers that didn't bound their wait time. This framing is important for organizational reasons. Teams often resist aggressive timeout settings because they fear false failures — legitimate requests that take longer than the timeout under unusual but valid conditions. The SRE Book's response is to make this tradeoff explicit through error budgets: if aggressive timeouts cause 0.01% of requests to fail that would have succeeded with a longer timeout, that cost should be weighed against the cascade risk of a slow dependency propagating through the entire service graph. In most cases, the cascade risk dwarfs the false failure cost.

Kleppmann's *Designing Data-Intensive Applications* adds a systems-level perspective on timeouts that goes beyond per-call configuration. DDIA's analysis of consensus protocols and distributed coordination observes that many distributed systems implicitly assume synchrony — that messages will be delivered within some bounded time. Real networks violate this assumption. A timeout is essentially an acknowledgment that the synchrony assumption has been violated for this particular call. DDIA recommends treating timeout failures as "unknown outcome" rather than "failure": when a write times out, the operation may have committed on the server even though the client never received the response. This observation — that a timeout is epistemically different from an error — motivates the entire design of idempotency keys described in Article 10.

The Builder's Library treatment of the "cascading timeout reduction" pattern formalizes what gRPC's deadline mechanism achieves automatically for non-gRPC systems. In HTTP-based service meshes, each service must read the incoming deadline from a request header, compute its own processing overhead, and propagate the reduced deadline to its dependencies. Teams that implement this pattern report a significant reduction in wasted work during partial failures: when the originating request times out, work cancellation propagates through the tree within milliseconds rather than waiting for each layer's independent timeout to expire. The reduction in wasted compute during incidents is substantial at scale — a 10-layer call graph where each layer has a 30-second independent timeout wastes up to 300 seconds of compute per timed-out user request, versus near-zero with deadline propagation.

## Implementation Guide

### Step 1: Audit Your Current Timeout Configuration

Before setting timeouts, know what you currently have. For every external dependency your service calls:

```bash
# For HTTP clients in Java, check default settings
# For Go's http.Client, the zero value has no timeout
# For Python's requests library, default is no timeout
# For database drivers, check connection pool settings
```

Create a dependency inventory:
- What dependencies does your service call?
- What timeout is currently configured for each?
- Is there any I/O with no timeout configured?

### Step 2: Profile Dependency Latency

Set timeouts based on data, not intuition. For each dependency:

1. Collect p50, p95, p99, p99.9 latency over a representative traffic period
2. Identify the latency distribution shape (is there a long tail? bimodal distribution?)
3. Consider the acceptable failure rate under timeout (a p99.9 timeout means 1 in 1000 requests will time out even under normal conditions)

A reasonable starting point: set read timeouts at 3-5x the p99 latency. This tolerates significant latency spikes while bounding worst-case resource holding time.

### Step 3: Implement Deadline Propagation

In Go, use `context.WithTimeout` at the top of the call chain and pass the context through:

```go
// At the API handler (top of chain)
ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
defer cancel()

// In downstream calls, the context carries the deadline
result, err := b.CallServiceB(ctx, request)
// ServiceB passes ctx to its downstream calls
// The deadline propagates automatically
```

In Java with gRPC, use deadline propagation:

```java
// Extract deadline from incoming context, subtract overhead
Deadline incoming = Context.current().getDeadline();
Deadline outgoing = incoming.offset(-10, TimeUnit.MILLISECONDS); // 10ms overhead

stub.withDeadline(outgoing).callMethod(request);
```

For HTTP-based services without native deadline propagation, use a request-scoped header:

```
X-Request-Deadline: 2024-01-15T10:30:05.123Z
```

Each service reads this header, computes remaining time, and uses it as the timeout for its downstream HTTP calls.

### Step 4: Handle Timeout Errors Distinctly

Timeout errors are different from other errors. A connection refused error means the dependency is unavailable. A timeout error might mean the dependency is slow but working, which has implications for retries (see Article 03 on backoff and jitter) and for idempotency (see Article 10).

```go
if errors.Is(err, context.DeadlineExceeded) {
    // Don't retry non-idempotent operations
    // Do retry idempotent operations with exponential backoff
    // Increment a "timeout" metric distinct from "error" metric
    metrics.IncrementTimeout("dependency_name")
} else if isConnectionError(err) {
    // Connection failed fast; retry is safe
    metrics.IncrementConnectionError("dependency_name")
}
```

### Step 5: Test Your Timeouts

Timeouts are frequently configured but rarely tested. Write tests that:
- Verify the service returns an error within the configured timeout when a dependency is slow
- Verify resources (connections, goroutines, threads) are released after a timeout
- Verify deadline propagation actually cancels downstream work

Use a test double that introduces artificial latency:

```go
func TestServiceTimesOutAfterFiveSeconds(t *testing.T) {
    slowDep := &SlowDependency{delay: 10 * time.Second}
    svc := NewService(slowDep, timeout: 5*time.Second)
    
    start := time.Now()
    _, err := svc.DoWork(context.Background(), request)
    elapsed := time.Since(start)
    
    assert.Error(t, err)
    assert.Less(t, elapsed, 6*time.Second) // should fail within ~5s, not 10s
}
```

## When to Use / When NOT to Use

**Always use timeouts for:**
- Synchronous service-to-service HTTP/RPC calls
- Database queries
- Cache lookups (Redis, Memcached)
- Lock acquisitions
- Any network I/O

**Use more generous timeouts for:**
- Batch processing jobs where throughput matters more than latency
- Background tasks with no direct user impact
- Long-running operations with explicit progress tracking (streaming, webhooks)

**Be careful with timeouts for:**
- Write operations with non-idempotent effects. A database write that times out may have committed on the server even though the client received an error. Cancelling the timeout doesn't undo the write. Handle this with idempotency keys (Article 10).
- Operations that can be safely retried if not idempotent (article 03 discusses when retries are safe)

**Never configure:**
- "No timeout" for synchronous user-facing request paths
- Timeouts longer than your user-facing SLO (if your API SLO is 5 seconds, downstream calls should have timeouts shorter than 5 seconds)

## Common Mistakes

**Configuring connection timeout but not read timeout**: The connection succeeds quickly but the service then waits indefinitely for a response. Connection timeouts alone don't prevent resource exhaustion from slow dependencies.

**Setting timeouts too generously**: A 60-second read timeout sounds safe but means each slow request holds a thread for 60 seconds. At 100 concurrent requests per second, you can accumulate 6,000 blocked threads before any release. Set timeouts at the p99.9 latency level, not at "I'll never wait this long."

**Not testing timeout behavior**: Teams configure timeouts and assume they work. In practice, timeout libraries are often misconfigured — the timeout is set on the wrong layer, or the library ignores the configured value in certain error paths. Test explicitly.

**Ignoring deadline propagation**: Setting independent timeouts at each layer wastes compute on work that has already been abandoned by the caller. Propagate deadlines.

**Uniform timeouts across all dependencies**: A p99 latency of 10ms (Redis) should have a very different timeout than a p99 latency of 500ms (complex SQL query). Calibrate each dependency independently.

**Not monitoring timeout rates**: Timeouts are a leading indicator of dependency health. Track the timeout rate per dependency and alert when it exceeds the expected baseline. An increasing timeout rate on a dependency often predicts an outage 5-10 minutes before the dependency starts returning errors.

**Forgetting SDK defaults**: The HTTP client bundled with your language runtime may have a different default timeout than the HTTP client you're using. Audit every client library, not just the ones you wrote.

## Connections

**Backoff and jitter (Article 03)**: Timeouts trigger retries, and retries need backoff to avoid thundering herds. The two patterns work together.

**Load shedding (Article 04)**: When a service detects its response times are approaching user-facing SLO limits, it should start shedding incoming load. Monitoring internal timeout rates is one signal for this decision.

**Back pressure (Article 11)**: When a downstream service starts experiencing high timeout rates, that's a signal to apply back pressure upstream — reduce the rate of calls to the struggling dependency.

**Idempotency (Article 10)**: Timeout errors on write operations require careful handling. Without idempotency, retrying after a timeout can cause duplicate writes.

**Health endpoint monitoring (Article 15)**: Deep health checks should verify that dependencies respond within timeout thresholds, not just that they respond at all.

## Key Insights

The single most important thing to understand about timeouts is that a slow dependency is a more dangerous failure mode than a fast one. A dependency that returns errors immediately lets you fail fast, release resources, and serve other requests. A dependency that responds slowly holds your resources indefinitely — threads, connections, file descriptors — and eventually causes your service to fail even though it's technically "up."

Timeouts convert slow failure into fast failure. This is not about giving up on the operation — it's about returning resources to serve other work while the slow operation eventually completes (or fails) in the background.

The discipline required is: every I/O boundary must have a timeout. No exceptions. The default configuration of most I/O libraries is "no timeout" because the library author cannot know your latency requirements. The operational implication is that every time you add a new I/O dependency, you must explicitly configure the timeout. This is not automatic.

Deadline propagation is the difference between "timeouts that prevent some cascading failures" and "timeouts that prevent all cascading failures from slow dependencies." Without propagation, a slow leaf service can still cascade up the call tree, just at the latency of the most generous timeout in the chain rather than indefinitely. With propagation, cancellation is immediate and simultaneous across the entire downstream tree.

Finally: instrument your timeout rates. A 0.1% timeout rate on a normally 0.001% timeout dependency is a five-minute warning before an outage. Teams that monitor and alert on timeout rates see the problems coming. Teams that only look at error rates see the problems after they've cascaded.
