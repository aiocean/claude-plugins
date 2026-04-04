# Retry Pattern

> "The definition of insanity is doing the same thing over and over and expecting different results. The definition of distributed systems engineering is doing the same thing over and over because the network is unreliable."

## The Problem

You call a database. It returns a connection timeout. Was this a transient blip — a brief network hiccup that will self-resolve in 100ms — or a permanent failure indicating the database is down for the next hour? In most cases, it's the former. Databases, networks, and downstream services fail transiently all the time: a brief garbage collection pause, a TCP connection reset, a momentary routing glitch, a rate limit that clears in a second. If you surface every transient failure to the user as an error, you degrade the user experience unnecessarily.

The naive fix is to retry immediately: catch the exception, call again. This works for the simple transient case. But it introduces subtle problems at scale. If ten thousand clients all retry simultaneously after a shared dependency hiccups, the dependency — just recovering from its brief issue — is immediately hit with ten thousand simultaneous retries. This can push a momentarily overloaded service into complete failure. This is the thundering herd problem, and retries are one of its primary causes.

The problem deepens when you consider retry amplification. If Service A retries 3 times, and for each of those calls Service B retries 3 times, and Service B calls Service C which retries 3 times, a single user request can generate 3 × 3 × 3 = 27 calls to Service C. Add one more layer and it's 81. Five layers: 243 calls for one user request. During an incident, when services are slow and retries fire more often, this amplification can turn a partial degradation into a complete system meltdown.

The Retry pattern, done correctly, handles transient failures gracefully without amplifying load on struggling services.

## Core Concept

The retry pattern intercepts a failed operation and re-attempts it according to a retry policy. The policy defines three things: which failures are retryable, how many times to retry, and how long to wait between attempts.

### What Is Retryable?

Not all failures are worth retrying. The key question: will retrying this operation succeed if the underlying condition is transient?

```
RETRYABLE (transient failures):
  - Connection timeout / network timeout
  - HTTP 429 Too Many Requests (rate limited — wait and retry)
  - HTTP 503 Service Unavailable (transient overload)
  - HTTP 500 Internal Server Error (sometimes — depends on idempotency)
  - Database connection pool exhausted
  - Lock timeout (optimistic concurrency conflict)

NOT RETRYABLE (permanent failures):
  - HTTP 400 Bad Request (your request is malformed — retrying won't fix it)
  - HTTP 401 Unauthorized (no credentials — retrying won't fix it)
  - HTTP 403 Forbidden (wrong permissions — retrying won't fix it)
  - HTTP 404 Not Found (resource doesn't exist — retrying won't fix it)
  - Business logic validation failures
  - Disk full
```

### Retry Strategies

**Immediate retry:** Retry right away. Only appropriate if the failure is truly instantaneous (e.g., a thread that was briefly blocked). Almost always wrong.

**Fixed interval:** Wait a constant duration between retries (e.g., always wait 1 second). Simple but doesn't adapt to server recovery time.

**Exponential backoff:** Double the wait time with each retry. The most common correct implementation.

```
Attempt 1: wait 1s
Attempt 2: wait 2s
Attempt 3: wait 4s
Attempt 4: wait 8s
Attempt 5: give up (or wait 16s)
```

**Exponential backoff with jitter:** Add randomness to prevent synchronized retries from multiple clients (thundering herd):

```python
import random
import time

def exponential_backoff_with_jitter(attempt: int, base: float = 1.0, cap: float = 30.0) -> float:
    """
    Full jitter: random value between 0 and min(cap, base * 2^attempt)
    This is the AWS recommended strategy.
    """
    return random.uniform(0, min(cap, base * (2 ** attempt)))

# Usage:
for attempt in range(max_retries):
    try:
        result = call_service()
        break
    except TransientError:
        if attempt == max_retries - 1:
            raise
        delay = exponential_backoff_with_jitter(attempt)
        time.sleep(delay)
```

### Retry Amplification: The 3^5 Problem

This is the most dangerous failure mode in retry systems. Each layer of a call stack adds its own retry count:

```
User request
  -> Service A (retries 3x)
    -> Service B (retries 3x)
      -> Service C (retries 3x)
        -> Database (retries 3x)

When the database has a 5-second hiccup:
  1 user request generates: 3 × 3 × 3 × 3 = 81 database calls
  
With 1,000 concurrent users during the hiccup:
  81,000 database calls instead of 1,000
  The hiccup becomes a full outage.
```

The AWS Builder's Library article "Timeouts, retries, and backoff with jitter" by Marc Brooker makes this precise: in a 5-tier architecture where each tier retries 3 times, a single failing request generates 3^5 = 243 attempts at the bottom tier.

## Deep Dive

**The retry amplification problem.** Marc Brooker's AWS Builder's Library article "Timeouts, retries, and backoff with jitter" is the most rigorous public analysis of retry behavior in distributed systems. Brooker's central finding: retry amplification is exponential in multi-tier systems. In a 5-tier call chain where each tier retries 3 times, a single failing request at the bottom generates 3^5 = 243 attempts. This is not a theoretical concern — it is a documented production failure mode at Amazon and other large distributed systems operators. The failure scenario: a downstream service degrades slightly, causing increased latency; clients interpret the latency as timeouts and retry; the retries multiply the load on the degraded service; the increased load causes further degradation; the service fails completely under retry load rather than recovering. Brooker's prescription: retry at one layer only in a call chain, coordinate timeout and retry configuration across tiers, and use circuit breakers to stop retrying once failure rate exceeds a threshold.

**Jitter as a mathematical necessity.** Brooker's analysis identifies correlated retry storms as the mechanism of retry amplification. When a service becomes unavailable, all clients that were in-flight at that moment receive errors simultaneously. Without jitter, all clients compute the same exponential backoff — e.g., all retry after exactly 1 second, then 2 seconds, then 4 seconds. This synchronized retry pattern generates repeated load spikes at regular intervals, potentially preventing the service from recovering. Brooker's mathematical analysis shows that adding random jitter — uniformly distributed across the backoff interval — desynchronizes the retry pulses, spreading load smoothly over the interval. The result is that the recovering service sees a gradual ramp of retry traffic rather than a synchronized spike. Full jitter (sleep = random_between(0, base_delay × 2^attempt)) is the recommended implementation; "equal jitter" (sleep = base_delay × 2^attempt / 2 + random_between(0, base_delay × 2^attempt / 2)) provides a minimum wait time, which prevents retrying too quickly.

**Idempotency as a prerequisite for safe retries.** Martin Kleppmann's *Designing Data-Intensive Applications* frames idempotency as the fundamental safety property that makes retries correct. If an operation is idempotent — executing it multiple times has the same effect as executing it once — then retrying a failed request is always safe. If it is not idempotent — executing it multiple times charges the customer multiple times, sends multiple emails, creates duplicate records — then retrying on ambiguous failures (network timeout where the server may or may not have processed the request) can cause data corruption. Kleppmann's analysis of the "at-most-once vs at-least-once" delivery trade-off applies here: retries implement at-least-once semantics. The application layer must implement idempotency keys (a client-generated unique ID that the server uses to deduplicate requests) to achieve at-most-once semantics on top of an at-least-once retry mechanism. This is not an implementation detail — it is a correctness requirement for any retry-enabled system that modifies state.

**The retry budget and server-side perspective.** The Google SRE Book introduces the concept of the retry budget: a limit on the fraction of total requests that are retries. If retries are 10% of total traffic under normal conditions, the system is consuming 10% of its capacity processing work that has already been attempted. If retries rise to 50% of traffic, the system is spending half its capacity on remediation — a strong signal that something is systematically wrong and retrying is not the solution. The SRE Book's guidance: monitor the retry fraction as a key health signal; alert when it exceeds a threshold; treat a high retry fraction as equivalent to an error rate spike. This perspective shifts retry from a client-side concern to a system-level observable that is monitored and acted on.

**Non-retryable errors and the error classification problem.** Nygard's *Release It!* treatment of failure classification identifies the most important decision in retry implementation: which errors should be retried. The classification must be based on the semantic meaning of the error, not its HTTP status code alone. A 503 (Service Unavailable) with a `Retry-After` header means transient overload — retry after the specified delay. A 503 without `Retry-After` may mean the server is completely unavailable — retry with exponential backoff and circuit breaker. A 400 (Bad Request) means the request is malformed — retrying the same request will produce the same 400, and is wasteful. A 422 (Unprocessable Entity) means the request is syntactically valid but semantically invalid — the business logic rejected it; retrying will fail identically. Nygard's guidance: errors caused by the request itself (4xx) are not retryable; errors caused by the server's state (5xx, connection errors, timeouts) may be retryable. The distinction between "server said no" and "server could not respond" is the fundamental classification for retry eligibility.

var result = await retryPolicy.ExecuteAsync(() => 
    httpClient.GetStringAsync("https://api.example.com/data"));
```

Microsoft's Azure Architecture Center guidance on the Retry pattern explicitly defines the retry budget concept: track how many retries are occurring per time window. If retries exceed X% of total calls, open a circuit breaker rather than continuing to retry.

## Implementation Guide

### Step 1: Classify Failures Before Implementing Retry

Build a failure taxonomy for each dependency you call:

```typescript
function isRetryable(error: Error): boolean {
  if (error instanceof HttpError) {
    // Only retry specific HTTP status codes
    return [429, 500, 502, 503, 504].includes(error.statusCode);
  }
  if (error instanceof NetworkError) {
    // Retry connection and timeout errors
    return error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
  }
  if (error instanceof ValidationError) {
    return false; // Never retry validation failures
  }
  if (error instanceof AuthorizationError) {
    return false; // Never retry auth failures
  }
  return false; // Default: don't retry unknown errors
}
```

### Step 2: Implement Exponential Backoff with Full Jitter

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    isRetryable?: (error: Error) => boolean;
  }
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, isRetryable = () => true } = options;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLast = attempt === maxAttempts - 1;
      
      if (isLast || !isRetryable(error as Error)) {
        throw error;
      }
      
      // Full jitter: uniform random between 0 and min(maxDelay, base * 2^attempt)
      const ceiling = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const delay = Math.random() * ceiling;
      
      logger.warn('Retrying operation', { 
        attempt: attempt + 1, 
        delayMs: Math.round(delay),
        error: (error as Error).message 
      });
      
      await sleep(delay);
    }
  }
  
  throw new Error('Unreachable');
}
```

### Step 3: Implement Retry Budget (Token Bucket)

Prevent retry storms by limiting the total retry rate:

```typescript
class RetryBudget {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRatePerSecond: number;
  private lastRefill: number = Date.now();
  
  constructor(maxTokens: number = 100, refillRatePerSecond: number = 10) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRatePerSecond = refillRatePerSecond;
  }
  
  canRetry(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false; // Budget exhausted — stop retrying
  }
  
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerSecond);
    this.lastRefill = now;
  }
}
```

### Step 4: Retry at ONE Layer Only

In a microservices call chain, designate one layer as the retry layer:

```
API Gateway (client-facing) — RETRIES HERE
    |
    v (no retry)
Service A
    |
    v (no retry)
Service B
    |
    v (no retry)
Database
```

If Service A and Service B both retry, the amplification problem occurs. The client-facing layer retries with user experience in mind; internal layers propagate errors immediately.

### Step 5: Combine with Circuit Breaker

Retries and circuit breakers are complementary:

```typescript
// Circuit breaker + retry together
const circuitBreaker = new CircuitBreaker(callDatabase, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

// Retry wraps the circuit breaker
const result = await withRetry(
  () => circuitBreaker.fire(),
  { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 5000 }
);
```

The circuit breaker prevents retries to a known-broken service. When the circuit is open, retries fail immediately rather than waiting for timeout — fast failure is better than slow failure.

## When to Use / When NOT to Use

**Use when:**
- Failures are transient and self-resolving (network glitches, brief throttling, momentary overload)
- Operations are idempotent (retrying the same write produces the same result as one write)
- Retry delay can be tolerated by the caller (background jobs, async operations)

**Do NOT use when:**
- Operations are not idempotent (charging a credit card twice is not acceptable — use idempotency keys instead)
- Failures are permanent (wrong credentials, validation failures, resource not found)
- The dependency is known-broken — use a circuit breaker to fail fast
- You're in a deep call chain where each layer already retries — remove retries from intermediate layers

## Common Mistakes

**Mistake 1: Retry storms from synchronized clients.** Without jitter, all clients retry at the same time after a shared failure: 10,000 clients all wait exactly 1 second, then all retry simultaneously. The recovering service is hit with another 10,000 simultaneous requests. Full jitter desynchronizes clients. It is not optional.

**Mistake 2: Retrying non-idempotent operations.** Retrying a POST that creates a resource creates it twice. Retrying a payment deduction charges twice. Add idempotency keys to operations that must be safe to retry: the server stores the result keyed by the idempotency token and returns the same result for duplicate calls.

**Mistake 3: Retry amplification in deep call chains.** Each layer retries independently. A 5-layer stack with 3 retries per layer generates 3^5 = 243 calls to the bottom tier. Remove retries from intermediate layers. Only the client-facing layer or the final consumer retries.

**Mistake 4: Infinite retries.** Retrying forever against a permanently failed service. Set a maximum retry count and a maximum total retry duration. After exhausting retries, fail and let the caller handle the error appropriately.

**Mistake 5: Not logging retry attempts.** Silent retries mean you don't know how often your system is encountering transient failures. Every retry should be logged with the error, attempt number, and delay. High retry rates indicate a systemic problem, not a transient one.

## Connections

**Circuit Breaker**: Retry handles transient failures; circuit breaker handles sustained failures. When retries consistently fail (circuit opens), stop retrying. Combine the two: retry up to N times; if error rate exceeds threshold, open circuit.

**Queue-Based Load Leveling** (Article 20): Queue-based consumers implement their own retry via visibility timeout and DLQ. The queue returns unacknowledged messages for retry automatically. Configure maxReceiveCount and DLQ instead of implementing retry in consumer code.

**Saga Pattern** (Article 22): Sagas use compensating transactions to handle failures that persist beyond retry tolerance. Retry handles the transient case; saga compensation handles the permanent failure case.

**Priority Queue** (Article 18): Failed high-priority messages should be retried with shorter backoff than low-priority messages. Configure retry policy per queue.

## Key Insights

1. **Jitter is not optional.** Synchronized retries cause thundering herd. Full jitter (random between 0 and the backoff ceiling) desynchronizes clients and gives recovering services room to breathe.

2. **Retry at one layer only in a call chain.** Retries at every layer amplify exponentially. Designate one layer (typically the client-facing edge) as the retry point. Internal service-to-service calls propagate errors immediately.

3. **Idempotency is the prerequisite for safe retries.** An operation is only safely retryable if running it twice produces the same result as running it once. Add idempotency keys to any non-idempotent operation you want to retry.

4. **The retry budget is your system's retry conscience.** When retries exceed X% of total calls, something is persistently wrong. Don't keep retrying — alert and engage a circuit breaker. The retry budget enforces this discipline.

5. **Distinguish transient from permanent failures before retrying.** A 400 Bad Request will never succeed no matter how many times you retry. A 503 Service Unavailable often will. Classify failures explicitly; retry only transient ones.

6. **Retry adds latency.** Three retries with 1s/2s/4s backoff add up to 7 seconds of latency in the worst case. Evaluate whether this is acceptable for your SLA. For user-facing real-time operations, you may need shorter backoff and fewer retries than for background jobs.

7. **The AWS Builder's Library guidance is the field standard.** Marc Brooker's "Timeouts, retries, and backoff with jitter" is the definitive practical reference. It introduces the full-jitter recommendation and the retry amplification analysis that every distributed systems engineer should internalize.
