# Circuit Breaker Pattern

> "The circuit breaker pattern prevents an application from repeatedly trying to execute an operation that is likely to fail, allowing it to continue without waiting for the fault to be fixed." — Michael Nygard, Release It!

## The Problem

In November 2012, Amazon's Elastic Load Balancing service had a latency issue. Calls that normally returned in milliseconds started taking tens of seconds. Services across AWS that depended on ELB continued faithfully retrying these slow calls. Thread pools filled with requests waiting for responses that were slow to arrive. Connection pools exhausted. Memory climbed as request queues backed up. Within minutes, dozens of services that had nothing inherently wrong with them were failing — not because of their own bugs, but because they were stuck waiting on a dependency that was responding slowly.

This is the cascading failure. One slow or failing dependency causes resource exhaustion upstream. The upstream service becomes unavailable. Its consumers experience the same thing. The failure propagates up the call chain until the entire system is down. The most dangerous aspect: retrying a failing dependency amplifies the load on that dependency exactly when it is least able to handle load, making recovery harder.

The Circuit Breaker pattern, named after the electrical component that breaks a circuit when current exceeds a safe threshold, prevents this cascade. When a dependency starts failing, the circuit breaker trips. Subsequent calls fail immediately without touching the dependency, giving it time to recover. The circuit periodically probes the dependency and closes again when it recovers. Cascading failures are stopped at the source.

Michael Nygard described the pattern in his 2007 book "Release It!" — one of the most important books in distributed systems engineering. It has since become standard practice in any production distributed system.

## Core Concept

The circuit breaker is a stateful proxy that wraps calls to a dependency. It transitions through three states based on observed failure rates:

```
                    ┌──────────────────────┐
                    │       CLOSED         │
                    │   (normal operation) │
                    │                      │
                    │  Calls pass through  │
                    │  Track failure rate  │
                    └──────────┬───────────┘
                               │
                    failure threshold exceeded
                               │
                               ▼
                    ┌──────────────────────┐
                    │        OPEN          │◀─────────────────┐
                    │    (fast failing)    │                   │
                    │                      │                   │
                    │  All calls fail fast │                   │
                    │  No dependency calls │    probe fails    │
                    └──────────┬───────────┘                   │
                               │                               │
                    timeout expires (e.g. 30s)                 │
                               │                               │
                               ▼                               │
                    ┌──────────────────────┐                   │
                    │      HALF-OPEN       │───────────────────┘
                    │  (testing recovery)  │
                    │                      │
                    │  Allow limited calls │
                    │  through as probes   │
                    └──────────┬───────────┘
                               │
                    probe succeeds
                               │
                               ▼
                    ┌──────────────────────┐
                    │       CLOSED         │
                    │   (recovered)        │
                    └──────────────────────┘
```

**Closed state**: Normal operation. Calls pass through to the dependency. The breaker tracks successes and failures over a sliding window. When the failure rate or failure count exceeds the threshold, the circuit opens.

**Open state**: Fast failing. All calls fail immediately without reaching the dependency. This gives the dependency time to recover without amplifying its load with retries. After a configured timeout (the "sleep window"), the circuit moves to Half-Open.

**Half-Open state**: Cautious testing. A limited number of test calls are allowed through. If they succeed, the circuit closes and normal operation resumes. If they fail, the circuit opens again and the sleep window resets.

### Count-based vs Rate-based breakers

**Count-based**: Open after N consecutive failures. Simple but sensitive to bursts — N failures in quick succession from a transient network issue opens the circuit unnecessarily.

**Rate-based** (sliding window): Open when the failure rate exceeds X% over the last N seconds or last N requests. More sophisticated. Resilience4j uses this approach.

### Amazon's token bucket alternative

Amazon uses a variant called "token bucket" for some internal circuit breaking. Instead of binary open/closed states, the breaker drains tokens on failures and adds tokens on successes. When tokens run out, requests are rejected. This provides smoother throttling rather than the binary state machine. It handles partial degradation better — you can pass 20% of traffic when the bucket is low, rather than flipping between full pass-through and full rejection.

## Deep Dive

**The origin of the pattern and why it matters.** Michael Nygard's *Release It!* introduced the circuit breaker pattern to software architecture by drawing an explicit analogy to electrical engineering. In Nygard's original framing, the problem is not that a downstream service fails — that is expected — but that failure propagates through thread pools and connection pools to take down callers that have nothing to do with the failed dependency. The circuit breaker breaks that propagation mechanically: once failure rate crosses a threshold, the proxy stops forwarding calls and returns an error immediately. The key Nygard insight is that a fast failure is always preferable to a slow one. A caller that gets an immediate error can degrade gracefully — return a cached result, show a fallback, shed load. A caller that waits for a timeout (30 seconds, 60 seconds) ties up a thread for the full duration, which cascades into resource exhaustion in the caller itself.

**The three-state machine and its subtleties.** *Release It!* defines three states: closed (normal operation), open (failing fast), and half-open (probe state). The half-open state is where most implementation errors occur. A circuit in half-open state allows a small number of requests through to test whether the dependency has recovered. If those probe requests succeed, the circuit closes. If they fail, it opens again and the sleep window resets. The critical design question is: how many probe requests, and what constitutes success? Nygard's guidance is conservative — allow one or a few probes, not a full traffic load. A recovering service that receives its normal traffic volume the moment the circuit opens will immediately fail again. The half-open state must throttle aggressively.

**Token buckets as an alternative to binary state.** The AWS Builder's Library article "Using load shedding to avoid overload" by David Yanacek describes a more nuanced approach than binary open/closed. Rather than flipping from full pass-through to full rejection, a token bucket allows gradual throttling. Tokens are consumed on each request; tokens are replenished at a controlled rate; failures drain additional tokens. When the bucket is near-empty, only a fraction of requests proceed. This provides smoother degradation — the system can operate at 20% capacity during a partial outage rather than cycling between 100% and 0%. Marc Brooker's analysis of retry amplification in the same library shows why this matters: a binary circuit breaker that opens and closes on the recovery probe cycle can create traffic storms. A gradual ramp is safer.

**The retry interaction and amplification risk.** Marc Brooker's AWS Builder's Library article "Timeouts, retries, and backoff with jitter" analyzes a failure mode that is specific to circuit breakers combined with retries. When a dependency degrades and multiple callers begin retrying simultaneously, the total request volume to the dependency can multiply by the retry count — 3x if each caller retries twice. If the circuit breaker has not yet opened (still within the minimum request threshold), this amplified load hits the degraded dependency and makes recovery harder. The correct defense is coordinated: circuit breaker state shared across instances (or at least per-instance state with conservative thresholds), combined with exponential backoff with full jitter on retries to desynchronize the retry pulses from different callers.

**The half-open state and split-brain risk.** Martin Kleppmann's *Designing Data-Intensive Applications* analyzes the general problem of detecting whether a remote system is healthy or not. The core challenge: network partitions make it impossible to distinguish a slow response from a dead one within a finite timeout. A circuit breaker's half-open probe can return a false positive — the probe succeeds but subsequent requests fail, because the dependency is in an unstable partial-recovery state. Kleppmann's analysis of distributed consensus problems applies here: a circuit breaker with no shared state operates independently on each service instance. Instance A may have an open circuit; instance B may have a closed circuit; they are seeing different windows of the same dependency's failure. In distributed systems, circuit breaker state should either be considered per-instance (each instance protects itself) or explicitly coordinated, with the understanding that coordination introduces its own failure modes.

**Per-dependency configuration is mandatory.** Sam Newman's *Building Microservices* documents a practical failure mode from real deployments: teams configure a single circuit breaker policy for all downstream dependencies. A payment service and a recommendation service share the same thresholds — 50% failure rate, 30-second sleep window. The recommendation service (low criticality, high variance latency) triggers the circuit frequently. The payment service (high criticality, normally reliable) shares the same threshold tuning and either opens too readily or not readily enough. Newman's guidance is explicit: each downstream dependency deserves its own circuit breaker configuration, calibrated to that dependency's normal latency distribution, its criticality, and the acceptable failure rate before the caller should stop trying. A recommendation service circuit might open at 30% failures with a 10-second window; a payment service circuit might require 70% failures over a 30-second window before opening, because false positives on payment are costly.

## Implementation Guide

### Step 1: Implement with Resilience4j (Java/Kotlin)

```java
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)              // open at 50% failure rate
    .slowCallRateThreshold(80)             // also open if 80% of calls are slow
    .slowCallDurationThreshold(Duration.ofSeconds(2))  // "slow" = >2s
    .waitDurationInOpenState(Duration.ofSeconds(30))   // sleep window
    .permittedNumberOfCallsInHalfOpenState(5)          // 5 probe calls
    .slidingWindowType(SlidingWindowType.COUNT_BASED)
    .slidingWindowSize(10)                 // evaluate last 10 calls
    .minimumNumberOfCalls(5)               // need at least 5 calls before evaluating
    .build();

CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(config);
CircuitBreaker breaker = registry.circuitBreaker("payment-service");

// Usage
try {
    PaymentResult result = breaker.executeSupplier(
        () -> paymentClient.charge(request)
    );
    return result;
} catch (CallNotPermittedException e) {
    // Circuit is OPEN — fail fast
    throw new PaymentServiceUnavailableException("Payment service circuit open");
}
```

### Step 2: Add fallback behavior

When the circuit is open, return a sensible fallback rather than an error when possible:

```java
// For recommendations: return empty list (not an error)
try {
    return breaker.executeSupplier(() -> recommendationService.get(userId));
} catch (CallNotPermittedException | RecommendationException e) {
    return Collections.emptyList();  // graceful degradation
}

// For payment: cannot fall back — must fail
try {
    return breaker.executeSupplier(() -> paymentService.charge(request));
} catch (CallNotPermittedException e) {
    throw new CheckoutUnavailableException("Payment system temporarily unavailable");
}
```

Not everything has a meaningful fallback. For critical operations, fast failure with a clear error is better than silently returning wrong data.

### Step 3: Monitor circuit state

```java
CircuitBreaker.Metrics metrics = breaker.getMetrics();

// Expose via Micrometer/Prometheus
registry.getAllCircuitBreakers().forEach(cb -> {
    Gauge.builder("circuit_breaker_state", cb, c -> c.getState().getOrder())
        .tag("name", cb.getName())
        .description("0=CLOSED, 1=OPEN, 2=HALF_OPEN, 3=DISABLED, 4=FORCED_OPEN")
        .register(meterRegistry);
    
    Gauge.builder("circuit_breaker_failure_rate", cb, c -> c.getMetrics().getFailureRate())
        .tag("name", cb.getName())
        .register(meterRegistry);
    
    Counter.builder("circuit_breaker_calls_not_permitted")
        .tag("name", cb.getName())
        .register(meterRegistry);
});
```

Alert when:
- Any circuit breaker state != CLOSED (circuit has opened)
- Failure rate > 30% (approaching threshold)
- `calls_not_permitted` > 0 (circuit is rejecting calls right now)

### Step 4: Configure per-dependency, not globally

Different dependencies warrant different thresholds:

```yaml
resilience4j:
  circuitbreaker:
    instances:
      payment-service:
        failure-rate-threshold: 20     # payment: strict — open at 20% failures
        wait-duration-in-open-state: 60s
        slow-call-duration-threshold: 1s
      
      recommendation-service:
        failure-rate-threshold: 60     # recommendations: lenient — tolerate more failures
        wait-duration-in-open-state: 10s
        slow-call-duration-threshold: 3s
      
      audit-log:
        failure-rate-threshold: 80     # audit: very lenient — best effort only
        wait-duration-in-open-state: 5s
```

### Step 5: Test circuit breaker behavior explicitly

```java
@Test
void circuit_opens_after_threshold_failures() {
    // Force 10 failures
    when(paymentClient.charge(any())).thenThrow(new RuntimeException("Service unavailable"));
    
    // Trigger failures to exceed threshold
    IntStream.range(0, 10).forEach(i -> {
        assertThrows(Exception.class, () -> paymentService.charge(request));
    });
    
    // Circuit should now be OPEN
    assertEquals(CircuitBreaker.State.OPEN, breaker.getState());
    
    // Next call should fail immediately without calling the client
    assertThrows(CallNotPermittedException.class, () -> paymentService.charge(request));
    verify(paymentClient, times(10)).charge(any()); // not called an 11th time
}

@Test
void circuit_closes_after_successful_probes() {
    // Open the circuit
    breaker.transitionToOpenState();
    
    // Simulate time passing (sleep window)
    breaker.transitionToHalfOpenState();
    
    // Successful probes
    when(paymentClient.charge(any())).thenReturn(successResult);
    IntStream.range(0, 5).forEach(i -> paymentService.charge(request));
    
    // Circuit should close
    assertEquals(CircuitBreaker.State.CLOSED, breaker.getState());
}
```

## When to Use

**Any synchronous call to a remote dependency.** If a service makes synchronous HTTP calls, gRPC calls, or database queries to an external system, wrap them in circuit breakers. The latency of remote calls means slow dependencies directly consume threads.

**When cascading failures are a risk.** If your service is in a call chain (A calls B calls C), a circuit breaker on B protects A from C's failures. Without it, C's slowness propagates to B to A.

**High-throughput services with shared thread pools.** The faster your service processes requests, the faster thread pools exhaust when a dependency is slow. High-throughput services are actually more vulnerable to cascading failures.

**When you need observable dependency health.** Circuit breaker metrics give you real-time visibility into downstream dependency health. The circuit state is a leading indicator — it opens before your SLO is breached.

**External third-party services.** Payment processors, SMS gateways, mapping APIs — services outside your control that can have maintenance windows, rate limits, or outages. Circuit breakers isolate their failures.

## When NOT to Use

**Idempotent, low-cost retry operations.** For operations where retry is cheap and the operation is idempotent (like reading from a cache), a simple retry with backoff may be sufficient. Circuit breakers add complexity; use them where the protection is worth the overhead.

**In-process calls.** Circuit breakers protect against network and remote service failures. In-process function calls don't have the same failure mode. Don't add circuit breakers to local function calls.

**When you own and can fix the dependency.** If the "dependency" is another service your team owns and you can fix it, fix it. Circuit breakers are defense against failures you can't control. They're not a substitute for engineering.

**When the fallback is misleading.** If opening the circuit causes you to return incorrect data (not just empty data), the circuit breaker may silently hide a problem that should be visible. For correctness-critical operations, fast failure is better than wrong answers.

## Common Mistakes

**Mistake 1: Setting the threshold too low.** A 1% failure rate threshold means any brief network hiccup opens the circuit. The circuit should open when the dependency is genuinely degraded, not on every transient error. Start with 50% failure rate as a baseline and tune down from there.

**Mistake 2: Not distinguishing failure types.** A 404 Not Found is not the same as a 503 Service Unavailable. A circuit breaker should open for connection failures, timeouts, and 5xx errors — not for 4xx client errors. Configure what counts as a "failure" explicitly.

**Mistake 3: Circuit breaker without monitoring.** If you don't know when circuits are open, you don't know when dependencies are degraded. An open circuit in production that no one knows about is a silent outage. Alert on circuit opens.

**Mistake 4: Wrapping the circuit breaker but ignoring `CallNotPermittedException`.** The circuit breaker throws `CallNotPermittedException` when the circuit is open. If your code doesn't catch this specifically and handle it differently from an actual service failure, callers get confusing errors. Catch it, log it differently, and return an appropriate response.

**Mistake 5: Shared circuit breaker across different operations.** One `paymentService` circuit breaker that covers both charge and refund operations means a failure in charge opens the circuit for refunds too. Per-operation circuit breakers give more precise isolation.

## Connections

**Bulkhead Pattern** (Volume 03, article 04): Bulkhead and circuit breaker are the two primary resilience patterns. Bulkhead limits resource consumption; circuit breaker stops calling failing dependencies. Use both.

**Retry Pattern**: Retry and circuit breaker must be coordinated. Retries inside a circuit breaker consume the sliding window. When the circuit is open, retrying is pointless. Implement retry with circuit breaker awareness: stop retrying when the circuit is open.

**Ambassador Pattern** (Volume 03, article 01): The Ambassador is the natural host for circuit breakers. Envoy proxy implements circuit breaking via its `outlier_detection` and `circuit_breakers` configuration.

**Cache-Aside Pattern** (Volume 03, article 05): When a circuit is open, serving stale cached data (rather than an error) is an effective degradation strategy. Cache + circuit breaker = graceful degradation.

**Compensating Transaction** (Volume 03, article 10): In saga workflows, circuit breakers prevent saga steps from hanging when a participant is unavailable. The circuit opens, the saga coordinator gets a fast failure, and compensation can begin immediately.

## Key Insights

1. **The circuit breaker is an availability pattern, not a correctness pattern.** It does not fix the underlying problem. It contains the blast radius while the underlying problem is fixed. Mean Time To Recovery (MTTR) depends on fixing the dependency; the circuit breaker reduces impact during the outage.

2. **Fail fast is a feature.** Callers of a service with open circuit breakers get immediate errors rather than hanging for 30 seconds. Callers can fail over, return degraded responses, or alert users quickly. Fast failure enables fast recovery.

3. **The sleep window is critical and underappreciated.** If the sleep window is too short, the circuit probes the dependency before it has recovered and immediately opens again. Too long, and recovery is delayed unnecessarily. Tune the sleep window based on the dependency's typical recovery time.

4. **Different dependencies need different configurations.** A payment processor warrants a strict breaker (opens at 10% failures, 60-second sleep). A recommendation service warrants a lenient breaker (opens at 50% failures, 10-second sleep). One configuration fits no one well.

5. **Monitor circuit state as a dependency health signal.** The circuit breaker state is the best real-time indicator of dependency health you have. Open = degraded. Feed this into your observability platform and dashboards.

6. **Circuit breakers expose what you were previously hiding.** When you add circuit breakers and start monitoring, you often discover dependencies that were silently failing at low rates. This is a feature — you're now seeing what was always happening.

7. **Half-open is the most dangerous state.** During half-open, the system is in recovery. A burst of traffic during half-open that fails will immediately open the circuit again and reset the sleep window. Be conservative about traffic volume in half-open.
