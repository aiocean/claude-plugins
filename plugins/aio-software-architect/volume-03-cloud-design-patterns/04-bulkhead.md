# Bulkhead Pattern

> "If you look at the hull of a ship, you'll see that it's divided into watertight compartments. If any one section is breached, only that section floods — the ship stays afloat. We need to apply the same thinking to software systems." — Michael Nygard, Release It!

## The Problem

Imagine a payment service that handles three types of requests: credit card processing, refunds, and fraud checks. Under normal load, all three share the same thread pool of 200 threads. One Tuesday afternoon, a fraud check query hits a pathological database index, causing each fraud check thread to block for 45 seconds instead of 200ms. Fraud check requests queue up. Within two minutes, all 200 threads are blocked waiting on fraud checks. Credit card processing requests arrive and find no available threads. The payment service appears completely down — not just fraud checking, but the entire service including the critical credit card processing path. Your payment system failed not because credit card processing broke, but because it shared resources with something that did.

This is the failure mode the Bulkhead pattern prevents. In naval architecture, a bulkhead is a watertight partition in a ship's hull. When a section of hull is breached, water floods only that section. The other sections remain intact. The ship stays afloat because failure in one compartment cannot propagate to others.

Applied to software, the Bulkhead pattern partitions service resources — thread pools, connection pools, semaphores, processes — so that excessive load or failure in one area cannot consume resources needed by another. When the fraud check thread pool is exhausted, credit card processing has its own separate thread pool and is completely unaffected. Failure is contained to the compartment where it originates.

The Bulkhead pattern is a foundational resilience pattern. It doesn't prevent failures from happening. It prevents failures from spreading.

## Core Concept

The Bulkhead pattern isolates elements of an application into pools so that if one fails, the others continue to function. The isolation can happen at several levels:

**Thread pool isolation**: Each downstream dependency or service category gets its own fixed-size thread pool. Calls to service A use pool A; calls to service B use pool B. If service B is slow, its thread pool fills up, but pool A is unaffected.

**Connection pool isolation**: Each downstream database or service gets its own connection pool. One service consuming all available database connections doesn't starve other services.

**Process isolation**: Different concerns run in separate OS processes or containers. A crash in one process cannot take down another.

**Semaphore isolation**: Instead of thread pools, use semaphores to limit concurrent calls to a dependency. Lighter weight than thread pool isolation but provides less isolation (still uses the caller's thread).

```
WITHOUT BULKHEAD:
┌─────────────────────────────────────────┐
│           Shared Thread Pool (200)       │
│                                         │
│  Credit Card [████████] 8 threads       │
│  Fraud Check [████████████████] slow!   │
│  Refunds     [████] 4 threads           │
│                                         │
│  FRAUD CHECK GROWS:                     │
│  Credit Card [████████] 8 threads       │
│  Fraud Check [██████████████████████████│
│              ██████████████████████████]│
│  Refunds: QUEUED (no threads available) │
│  Credit Card: QUEUED (no threads!)      │
└─────────────────────────────────────────┘

WITH BULKHEAD:
┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│  Credit Card│  │ Fraud Check │  │   Refunds    │
│  Pool (50)  │  │  Pool (100) │  │   Pool (50)  │
│             │  │             │  │              │
│  HEALTHY    │  │  FULL/SLOW  │  │   HEALTHY    │
│  (40 avail) │  │  (0 avail)  │  │  (45 avail)  │
└─────────────┘  └─────────────┘  └──────────────┘
     OK               FAIL              OK
```

The key design decision is where to draw the bulkhead boundaries. You want to isolate:
- High-priority paths from low-priority paths
- Critical revenue paths from non-critical operations
- Fast operations from operations with unpredictable latency
- External dependency calls from each other

## Deep Dive

The bulkhead metaphor comes from naval architecture, and Michael Nygard's treatment in *Release It!* uses it to make a precise point: the goal is not to prevent failure but to ensure that failure in one compartment cannot flood adjacent compartments. This physical intuition maps directly to thread pools, connection pools, and process isolation in software systems.

**Nygard's original analysis** identifies the root mechanism of cascading failure without bulkheads. A slow dependency occupies threads. Threads are finite. As more threads block on the slow dependency, fewer threads are available for other work. Eventually the thread pool exhausts and the service becomes unresponsive to all calls — including calls that have nothing to do with the slow dependency. The bulkhead pattern breaks this causal chain by giving each dependency a separate, bounded thread pool. The slow dependency can exhaust its own pool without touching pools allocated to other dependencies.

**Little's Law** provides the quantitative foundation for pool sizing. If a system processes requests at rate λ (throughput) and each request spends an average time W in the system, the average number of requests in the system N = λW. For a bulkhead pool serving calls to a specific dependency: if the normal call rate is 100 calls/second and each call takes 50ms, the steady-state concurrency is 5. A pool of 10-15 provides headroom for latency spikes without starving other pools. This calculation must be redone independently for each bulkheaded dependency, because different dependencies have different latency profiles and different call rates.

**The AWS Builder's Library's shuffle sharding article** extends bulkhead thinking from the thread pool level to the infrastructure level. The insight is that standard load balancing assigns each request to any available server. A pathological request pattern from one customer can exhaust all servers in the fleet, affecting every other customer. Shuffle sharding assigns each customer to a random subset of servers — their "shard." A customer exhausting their shard affects only the other customers who share that shard, not the entire fleet. The mathematical argument is compelling: with 8 servers and shards of 2, the overlap between any two customers' shards is at most 1 server. The blast radius of the worst customer is bounded to roughly 25% of the fleet rather than 100%.

**The interaction between bulkheads and retries** is a failure mode that Nygard documents explicitly. Retries inside a bulkheaded pool consume pool capacity. If a dependency is slow and each call to it retries 3 times, each logical request occupies 3 pool slots sequentially. A pool sized for the normal call rate will exhaust 3x faster when the dependency is degraded — exactly when you least want it to. The correct interaction is: bulkhead limits concurrency, circuit breaker stops calls once failure rate exceeds threshold, and retry operates *outside* the bulkhead in the calling code. The bulkhead should not see retries; it should see only the final attempts after the circuit breaker has decided the operation is worth attempting.

**Semaphore isolation versus thread pool isolation** is a distinction that matters at high throughput. Thread pool isolation creates a separate OS thread pool per dependency. The cost: thread context switching and the memory overhead of maintaining separate pools. For services handling thousands of requests per second, this overhead is measurable. Semaphore isolation uses a counter to limit concurrent calls without dispatching to a separate thread — lighter weight, but with reduced isolation guarantees. The key difference: with thread pool isolation, a thread blocked in the dependency cannot affect the calling thread's pool at all. With semaphore isolation, the calling thread itself is occupied during the blocked call. For I/O-bound dependencies on non-blocking runtimes (Node.js, reactive Java), semaphore isolation is often sufficient and meaningfully cheaper.

## Implementation Guide

### Step 1: Identify your dependencies and their risk profiles

Map out every external dependency your service calls:

```
Dependency           Risk Level    Typical Latency    Importance
──────────────────────────────────────────────────────────────
Payment processor    HIGH          200-500ms          CRITICAL
User profile DB      MEDIUM        5-20ms             HIGH
Recommendation svc   LOW           50-200ms           LOW
Audit log            LOW           10-50ms            MEDIUM
Email notification   MEDIUM        variable           LOW
```

High-risk, variable-latency dependencies are prime candidates for bulkhead isolation. Critical paths should be protected from sharing resources with low-importance operations.

### Step 2: Implement thread pool isolation with Resilience4j

```java
ThreadPoolBulkheadConfig creditCardConfig = ThreadPoolBulkheadConfig.custom()
    .maxThreadPoolSize(20)
    .coreThreadPoolSize(10)
    .queueCapacity(5)
    .keepAliveDuration(Duration.ofMillis(500))
    .build();

ThreadPoolBulkheadConfig fraudCheckConfig = ThreadPoolBulkheadConfig.custom()
    .maxThreadPoolSize(50)    // fraud check can use more threads
    .coreThreadPoolSize(20)
    .queueCapacity(10)
    .keepAliveDuration(Duration.ofMillis(500))
    .build();

ThreadPoolBulkheadRegistry registry = ThreadPoolBulkheadRegistry.of(
    Map.of(
        "credit-card", creditCardConfig,
        "fraud-check", fraudCheckConfig,
        "refunds", ThreadPoolBulkheadConfig.ofDefaults()
    )
);

// Usage
ThreadPoolBulkhead creditCardBulkhead = registry.bulkhead("credit-card");

CompletableFuture<PaymentResult> result = creditCardBulkhead
    .executeSupplier(() -> paymentProcessor.charge(request));
```

### Step 3: Implement connection pool isolation

For database connections, use separate datasources per concern:

```yaml
# Spring Boot datasource configuration
spring:
  datasource:
    primary:
      url: jdbc:postgresql://db/orders
      hikari:
        maximum-pool-size: 20
        minimum-idle: 5
    reporting:
      url: jdbc:postgresql://db/orders  # same DB, separate pool
      hikari:
        maximum-pool-size: 5   # reporting gets fewer connections
        minimum-idle: 1
```

Reporting queries (which can be slow and unpredictable) share the same database but use a completely separate connection pool. A runaway reporting query cannot exhaust connections for transactional operations.

### Step 4: Set queue depth limits (and reject fast)

The bulkhead should reject requests when the pool is full and the queue is full. Rejecting fast is critical — queuing indefinitely just delays the failure and wastes memory.

```java
// When bulkhead is full, fail fast
try {
    return bulkhead.executeSupplier(() -> callExternalService(request));
} catch (BulkheadFullException e) {
    // Return 503 immediately — don't queue, don't wait
    throw new ServiceUnavailableException("Service capacity exceeded, try later");
}
```

### Step 5: Size the pools correctly

Pool sizing is empirical. Start with Little's Law as a baseline:

```
Pool Size = Average Concurrency = Throughput × Average Latency
```

If you process 100 requests/second and each takes 50ms average:
```
Pool Size = 100 req/s × 0.05s = 5 concurrent requests
```

Add headroom for latency spikes (2-3x the baseline). Then load test and observe.

Too small: unnecessary rejections under normal load.
Too large: bulkhead doesn't actually prevent resource exhaustion (all pools can fill simultaneously).

### Step 6: Monitor bulkhead metrics

```java
// Expose metrics for monitoring
MeterRegistry meterRegistry = // your metrics registry

registry.getAllBulkheads().forEach(bulkhead -> {
    ThreadPoolBulkhead.Metrics metrics = bulkhead.getMetrics();
    
    Gauge.builder("bulkhead.active.threads", metrics, ThreadPoolBulkhead.Metrics::getActiveThreadCount)
        .tag("bulkhead", bulkhead.getName())
        .register(meterRegistry);
    
    Gauge.builder("bulkhead.queue.depth", metrics, ThreadPoolBulkhead.Metrics::getQueueDepth)
        .tag("bulkhead", bulkhead.getName())
        .register(meterRegistry);
    
    Counter.builder("bulkhead.rejections")
        .tag("bulkhead", bulkhead.getName())
        .register(meterRegistry);
});
```

Alert on:
- Queue depth > 50% of max (approaching saturation)
- Rejection rate > 0 (currently rejecting — immediate attention)
- Active thread count sustained near max (pool undersized or dependency degraded)

## When to Use

**When a slow downstream service can affect unrelated functionality.** The classic case: if your service calls both a critical path (payment) and a non-critical path (recommendations), and they share thread pools, a slow recommendation service can kill payment processing. Bulkhead separates them.

**When you need to protect high-priority traffic from low-priority traffic.** Paying customers' requests should not be starved by batch jobs or analytics queries. Separate pools enforce the priority.

**Multi-tenant systems.** One tenant's high-volume usage should not degrade other tenants' experience. Shuffle sharding (a bulkhead variant) assigns each tenant to a subset of the fleet.

**When you have high-variance latency dependencies.** If one dependency normally takes 10ms but occasionally takes 10 seconds, sharing its thread pool with other dependencies is risky. Isolate it.

**When failure blast radius reduction is a requirement.** In regulated industries (finance, healthcare), demonstrating that a failure in one component cannot cascade to critical components may be a compliance requirement. Bulkhead provides the isolation.

## When NOT to Use

**When you have very few dependencies and resources to spare.** If your service calls one database and one other service, and you have a 200-thread pool, creating two pools of 100 each is fine but may be overkill. The pattern adds operational complexity — justify it with real risk.

**When the blast radius you're protecting against is already small.** If your service is small, single-purpose, and unlikely to have cross-cutting resource exhaustion, bulkhead adds complexity without protection.

**As a substitute for fixing slow dependencies.** Bulkhead contains the damage from a slow dependency. It doesn't fix the dependency. If the fraud check is slow because of a bad database query, fix the query. Bulkhead is defense in depth, not an excuse for slow dependencies.

**When semaphore isolation is sufficient.** Thread pool isolation is heavier weight — it involves thread context switching and thread pool management. For many cases, semaphore-based bulkhead (limiting concurrent calls without a separate thread pool) provides adequate isolation with less overhead. Know which tool fits your situation.

## Common Mistakes

**Mistake 1: Over-partitioning.** Creating 20 thread pools for 20 different downstream calls, each with 10 threads, uses 200 threads — the same as the shared pool you started with. Now you have no isolation benefit (any single pool is small) and you've added complexity. Group dependencies by risk profile, not by identity.

**Mistake 2: Setting queue depth too high.** A queue depth of 10,000 requests means a bulkhead doesn't actually reject until you have 10,000 queued requests, by which time response times are already catastrophic. Keep queue depths low (single digits to low tens). The point is to reject fast when the pool is saturated.

**Mistake 3: Not monitoring bulkhead metrics.** If you're not observing thread pool utilization and rejection rates, you don't know if your bulkheads are sized correctly or whether they're actually triggering. Bulkhead metrics are leading indicators of dependency degradation.

**Mistake 4: Bulkhead without circuit breaker.** Bulkhead limits the damage from a slow dependency by capping the resources it can consume. Circuit breaker stops calling a failing dependency altogether. These patterns are complementary. Use both: circuit breaker prevents the calls, bulkhead limits the damage during the time before the circuit opens.

**Mistake 5: Ignoring semaphore isolation as an option.** Thread pool isolation is often presented as the canonical bulkhead implementation, but it has overhead: context switching between thread pools, the cost of maintaining separate pools. Semaphore isolation is simpler and lighter — it doesn't use a separate thread, it just limits concurrent calls. For high-throughput services, the semaphore approach is often more appropriate.

## Connections

**Circuit Breaker Pattern** (Volume 03, article 07): Bulkhead limits resource consumption by a failing dependency. Circuit breaker stops calls to a failing dependency. They are complementary. Most production resilience implementations combine both.

**Retry Pattern**: Bulkhead and retry interact carefully. Retries inside a bulkhead count against the bulkhead's capacity. A retry storm (many concurrent clients retrying) can exhaust a bulkhead faster than the original requests would have. Size pools with retry multiplier in mind.

**Competing Consumers** (Volume 03, article 09): Competing consumers scale message processing horizontally. Bulkhead limits the resources any one consumer group can use. Together they enable safe horizontal scaling with isolation.

**Ambassador Pattern** (Volume 03, article 01): The ambassador is a natural place to implement bulkhead — each upstream dependency gets its own connection pool in the ambassador, isolating their resource consumption.

**Timeout Pattern**: Bulkhead prevents resource exhaustion from slow calls. Timeouts ensure calls don't stay slow indefinitely. Both are required: timeout releases the bulkhead's resources when a call hangs; bulkhead limits the damage during the timeout window.

## Key Insights

1. **Isolation, not prevention.** Bulkhead does not prevent failures. It contains them. A dependency can still fail — the bulkhead ensures that failure stays inside its compartment and doesn't flood the rest of the ship.

2. **Pool sizing is an empirical exercise.** There is no formula that gives you the right pool sizes without measurement. Instrument your bulkheads, observe utilization under realistic load, and size based on data.

3. **Bulkhead and circuit breaker are a pair.** Bulkhead alone limits damage but doesn't stop the damage. Circuit breaker stops calling a failing dependency. Use both.

4. **Shuffle sharding is bulkhead at the infrastructure level.** AWS's shuffle sharding, Netflix's zone isolation — these are all bulkhead thinking applied to server fleets and availability zones rather than thread pools.

5. **Queue depth matters as much as pool size.** A large pool with a large queue just delays failure. Reject fast. The queue depth should be small enough that rejection happens before response times become catastrophic.

6. **Rejecting requests fast is a feature.** When the bulkhead rejects a request immediately (503, fast), the caller can fail over, retry elsewhere, or return a degraded response — all within a reasonable time frame. Queuing forever means callers time out, retry, queue more, and amplify the failure.

7. **The boundaries should reflect your actual risk topology.** Group dependencies by their failure mode, not by their name. Two dependencies that always fail together should share a bulkhead (or you should be aware that they're correlated). Two dependencies with independent failure modes should be isolated.
