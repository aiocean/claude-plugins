# Exponential Backoff with Jitter

> "When everyone retries at the same time, you don't have a retry — you have a coordinated attack on your own infrastructure." — from AWS Architecture Blog

## The Problem

Retries seem like a straightforward resilience mechanism: if a request fails, try again. The intent is sound — transient failures are common in distributed systems, and a retry often succeeds where the first attempt failed. But naive retry implementation is one of the most reliable ways to turn a partial outage into a total one.

Consider what happens when a service experiences a brief overload and starts returning errors. Every caller gets an error. Every caller immediately retries. The retries arrive at nearly the same time as the original requests — the service is now handling roughly 2x its normal traffic at exactly the moment it's already struggling. The retries fail too. The callers retry again. Now the service is handling 3x traffic. This is the thundering herd problem applied to retries, and it can take a service that might have recovered in 30 seconds and keep it in a failure state for minutes or hours.

The mathematical reality is stark. With 1,000 callers each retrying up to 5 times with no delay, a transient spike can produce 5,000 requests within seconds. If the original spike was 1,000 requests and the service can handle 800, the service was at 125% capacity. The retry storm drives it to 625% capacity — not a partial overload but catastrophic total failure.

The naive solution — add a fixed delay between retries — helps somewhat but introduces a new problem. If the fixed delay is 1 second and all 1,000 clients fail at the same moment, they all retry at T+1 second, then again at T+2 seconds. The thundering herd is slightly spread out, but still highly synchronized. At any retry interval, there's a spike.

Exponential backoff reduces the spike magnitude by increasing delays, but the synchronization problem persists. All callers started failing at nearly the same time, so they're all backing off by similar amounts. After enough retries, they're still arriving in waves. The solution is jitter — randomness deliberately introduced to desynchronize retries and flatten the arrival distribution.

## Core Concept

Exponential backoff with jitter is a retry strategy where the delay between retries grows exponentially (preventing thundering herds) and is randomized (preventing synchronization). The combination ensures that under load, retry traffic is spread smoothly over time rather than concentrated in spikes.

The base formula for exponential backoff:

```
delay = min(cap, base * 2^attempt)
```

Where:
- `base` is the initial delay (often 100-500ms)
- `attempt` is the retry count (0-indexed)
- `cap` is the maximum delay (often 20-60 seconds)
- `2^attempt` causes the delay to double with each attempt

Without jitter, 1,000 clients all retrying their 3rd attempt would all wait exactly `min(60s, 500ms * 8) = 4000ms`. All 1,000 requests would arrive simultaneously at T+4 seconds.

### Jitter Variants

AWS published a mathematical analysis of jitter strategies in their architecture blog that has become the canonical reference on this topic. They analyzed four approaches:

**No jitter (pure exponential backoff)**:
```
sleep = min(cap, base * 2^attempt)
```
Predictable but still creates synchronized spikes when multiple callers failed simultaneously.

**Full jitter**:
```
sleep = random_between(0, min(cap, base * 2^attempt))
```
The delay is uniformly random between zero and the exponential maximum. This produces the most even distribution of retry traffic over time. AWS analysis shows this minimizes completed requests during recovery — some retries happen very early (possibly still failing), but it avoids synchronized spikes.

**Equal jitter**:
```
half = min(cap, base * 2^attempt) / 2
sleep = half + random_between(0, half)
```
The delay is between half and the full exponential value. This ensures a minimum wait time while still adding randomness. AWS analysis shows it performs similarly to full jitter but with a guaranteed minimum delay.

**Decorrelated jitter**:
```
sleep = min(cap, random_between(base, previous_sleep * 3))
```
The delay is correlated with the previous delay, ranging from base to 3x the previous delay. AWS found this produces the best throughput recovery — it allows some requests to retry quickly after brief delays while still spreading the load.

The AWS recommendation: use decorrelated jitter for most cases. Full jitter is appropriate when you want maximum spread. Equal jitter is a reasonable middle ground. No jitter is almost always wrong.

### The 3^5 = 243x Amplification Problem

Here's the math that makes retry amplification concrete. Consider a call graph where Service A calls B, B calls C, and C calls D. Each service retries failed calls up to 5 times.

- Service A makes 1 call to B
- If B's call to C fails, B retries up to 5 times: up to 5 calls to C
- If C's call to D fails, C retries up to 5 times: up to 5 calls to D per C call
- B makes up to 5 calls to C, each of which makes up to 5 calls to D: 5×5 = 25 calls to D
- A makes up to 5 calls to B, each triggering up to 25 calls to D: 5×5×5 = 125 calls to D

With 4 layers and 3 retries each: 3^4 = 81x amplification at the leaf. With 5 retries: 5^4 = 625x. A single user-facing request can generate hundreds or thousands of calls to a leaf service during a partial failure.

The correct approach to this problem has two components. First, retries should only occur at the layer that has context about whether a retry is appropriate (usually the outer layer, not every intermediate service). Second, retry counts should be small — 2-3 retries maximum for most cases, not 5 or 10. The combination of both reduces amplification dramatically: a 3-layer graph with 2 retries each produces 2^3 = 8x amplification — unpleasant but manageable.

### Token Buckets vs Per-Request Retries

The per-request retry approach (each request retries independently up to N times) is simple but has the thundering herd problem described above. A more sophisticated approach uses a token bucket to rate-limit the overall retry rate across all concurrent requests.

The service maintains a token bucket refilling at a rate proportional to normal request rate. Each retry attempt consumes a token. When the bucket is empty, retries stop — the request fails immediately rather than waiting. This caps the total retry amplification regardless of how many concurrent requests are failing simultaneously.

AWS uses this model internally for services under high retry pressure. The token bucket approach ensures the service doesn't amplify its own failures through synchronized retries, but it requires a shared data structure (even in-memory) to track the token count across concurrent requests.

## Deep Dive

The AWS Engineering team's 2015 blog post "Exponential Backoff And Jitter" is one of the most practically influential pieces of systems engineering writing published in the last decade. Its contribution was not the concept of backoff — that was well-understood — but a rigorous mathematical comparison of jitter strategies that resolved a debate that had previously been settled by intuition. The key finding: full jitter, which randomizes the delay uniformly between zero and the exponential ceiling, produces remarkably smooth aggregate retry traffic compared to pure exponential backoff even when thousands of clients synchronize on the same failure event. The intuitive explanation is that clients who all failed at time T=0 all share the same exponential backoff sequence, so without jitter they remain synchronized through every retry wave. Jitter breaks this synchronization at the cost of some individual retries happening earlier than optimal.

The decorrelated jitter variant the AWS post recommends differs from full jitter in a subtle but important way: rather than randomizing within a range determined by the attempt number, decorrelated jitter randomizes between the base delay and three times the previous actual delay. This produces a slowly widening distribution over successive retry attempts, which the post's simulation data shows achieves better average completion time — more requests complete successfully within the overall retry window because the early retries (when the service is recovering) are spaced more aggressively than pure exponential backoff would allow, while later retries (if the service is still down) are spread wide enough not to pile on.

The retry budget concept — bounding retries as a fraction of total traffic rather than as an absolute count per request — addresses an amplification problem that per-request retry limits cannot solve. Consider a service processing 10,000 requests per second with a 5% failure rate and a per-request limit of 3 retries. In steady state, failed requests generate 500 retries per second — manageable. But during a 30-second partial outage affecting 50% of traffic, that same limit generates 5,000 retries per second against a service that is already handling 5,000 real requests per second — immediate doubling of load at the worst moment. A retry budget that caps retries at 10% of total traffic limits retries to 1,000 per second regardless of the failure rate, protecting the service from its own retry behavior. The SRE Book documents this as a production safety mechanism used at services handling sustained high traffic.

Nygard's *Release It!* provides the systems dynamics perspective that explains why retry amplification is often underappreciated until it causes an outage. The book describes the "cascading failure" pattern as a nonlinear system dynamic: the first failure increases load, which causes more failures, which cause more retries, which increase load further. The positive feedback loop can take a service from 110% load to total failure in seconds. Nygard's prescriptions — bulkheads, timeouts, circuit breakers — are all mechanisms for interrupting this feedback loop before it reaches the nonlinear failure regime. Backoff with jitter addresses the same feedback loop at the client side by reducing the rate at which retries amplify load.

The token bucket approach to retry rate limiting, discussed in both the AWS Builder's Library and various engineering blog posts, is architecturally different from per-request retry counts in a way that matters at scale. A token bucket shared across all concurrent requests limits the total retry rate regardless of how many requests are failing simultaneously. This means the retry burden on a downstream service is bounded absolutely rather than relative to the current failure rate. The implementation challenge is the shared state — in a multi-threaded or multi-process environment, the token bucket needs to be accessible to all request handlers. In-process atomic integers work for single-host services; distributed rate limiting with Redis or similar works for multi-host fleets.

Kleppmann's treatment of distributed systems in *DDIA* connects retry behavior to the fundamental uncertainty of distributed operations. The question "did the server process my request?" cannot be answered definitively when the response is lost. Kleppmann formalizes this as a question about the durability of distributed operations: at-most-once, at-least-once, and exactly-once semantics represent different answers to how retries interact with server-side execution. Exponential backoff with jitter addresses the at-least-once problem — how to retry safely when you don't know if the first attempt succeeded — but cannot by itself provide exactly-once semantics. That requires idempotency keys (Article 10), which close the loop: backoff determines when to retry, idempotency determines whether re-execution is safe, and the combination provides exactly-once behavior in the presence of arbitrary network failures.

## Implementation Guide

### Step 1: Choose the Right Jitter Strategy

For most services, start with decorrelated jitter:

```python
import random
import time

def retry_with_backoff(fn, max_attempts=3, base_delay=0.5, cap=30.0):
    last_delay = base_delay
    for attempt in range(max_attempts):
        try:
            return fn()
        except TransientError as e:
            if attempt == max_attempts - 1:
                raise
            # Decorrelated jitter
            delay = min(cap, random.uniform(base_delay, last_delay * 3))
            last_delay = delay
            time.sleep(delay)
```

For Go:

```go
func RetryWithBackoff(ctx context.Context, fn func() error, maxAttempts int) error {
    baseDelay := 500 * time.Millisecond
    cap := 30 * time.Second
    lastDelay := baseDelay
    
    for attempt := 0; attempt < maxAttempts; attempt++ {
        err := fn()
        if err == nil {
            return nil
        }
        if !isTransient(err) || attempt == maxAttempts-1 {
            return err
        }
        
        // Decorrelated jitter
        minDelay := float64(baseDelay)
        maxDelay := math.Min(float64(cap), float64(lastDelay)*3)
        delay := time.Duration(minDelay + rand.Float64()*(maxDelay-minDelay))
        lastDelay = delay
        
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(delay):
        }
    }
    return errors.New("max retries exceeded")
}
```

### Step 2: Classify Errors Before Retrying

Not all errors should be retried. Retrying a 400 Bad Request is pointless — the request is malformed and will fail every time. Only retry errors that are:
- Transient by nature (network blip, temporary overload)
- Idempotent (safe to repeat)

```python
def is_retryable(error):
    if isinstance(error, HTTPError):
        # 429: Too Many Requests — retryable, but respect Retry-After header
        # 500, 502, 503, 504: Server errors — retryable
        # 400, 401, 403, 404: Client errors — NOT retryable
        return error.status_code in {429, 500, 502, 503, 504}
    if isinstance(error, (ConnectionError, TimeoutError)):
        return True  # Network-level transient errors
    return False
```

### Step 3: Respect Retry-After Headers

HTTP 429 and 503 responses often include a `Retry-After` header specifying how long to wait. Honor this header — it's the server telling you its current recovery estimate. Ignoring it means your client continues hammering a service that explicitly asked for a pause.

```python
def get_retry_delay(response, attempt, base_delay, cap):
    retry_after = response.headers.get('Retry-After')
    if retry_after:
        try:
            return float(retry_after)  # seconds
        except ValueError:
            pass  # date format, parse if needed
    # Fall back to jittered backoff
    return decorrelated_jitter(attempt, base_delay, cap)
```

### Step 4: Implement Token Bucket for High-Volume Services

For services making many concurrent requests, add a token bucket to limit total retry rate:

```go
type RetryBudget struct {
    tokens    atomic.Int64
    maxTokens int64
    ticker    *time.Ticker
}

func NewRetryBudget(ratePerSecond int) *RetryBudget {
    rb := &RetryBudget{maxTokens: int64(ratePerSecond)}
    rb.tokens.Store(rb.maxTokens)
    go rb.refill(ratePerSecond)
    return rb
}

func (rb *RetryBudget) Allow() bool {
    for {
        current := rb.tokens.Load()
        if current <= 0 {
            return false // Budget exhausted, don't retry
        }
        if rb.tokens.CompareAndSwap(current, current-1) {
            return true
        }
    }
}
```

### Step 5: Limit Retry Layers

Decide where retries happen in your call graph and enforce it. A common pattern: only retry at the edge (user-facing service or async job), not at each internal hop. Interior services should propagate errors up rather than retrying independently.

Annotate your service interfaces to make this explicit:

```go
// RetryableClient wraps calls with retry logic — use at service edges only
type RetryableClient struct { ... }

// DirectClient makes single attempts — use for internal service-to-service calls
// Retries handled by the caller
type DirectClient struct { ... }
```

## When to Use / When NOT to Use

**Use exponential backoff with jitter for:**
- Client-to-service calls over the network
- Database connection acquisition under contention
- Distributed lock acquisition
- Any operation subject to transient failures

**Do not use retries for:**
- Non-idempotent operations unless you have idempotency keys (Article 10)
- Operations where the error is deterministic (wrong credentials, malformed input)
- Operations with very low latency tolerance (retrying a 10ms call with 500ms backoff violates user SLOs)
- Deep call graphs without coordinated retry policy (amplification risk)

**Consider circuit breakers instead of pure retries when:**
- A dependency has been failing for more than a few seconds (retrying a broken dependency wastes resources)
- The failure rate exceeds a threshold (suggests systemic issue, not transient blip)
- You need fast failure for the user rather than slow retry

## Common Mistakes

**Fixed delay without jitter**: The original thundering herd problem. Even 5 seconds is wrong if 1,000 clients are synchronized.

**Too many retry attempts**: Five or more retries per request creates unacceptable amplification in deep service graphs. Two or three attempts is usually the right limit.

**Retrying at every layer**: Each service in a call chain independently retries, creating exponential amplification. Decide where retries live and enforce it.

**Not cancelling retries on context cancellation**: If the caller gave up (deadline exceeded), continuing to retry is wasted work. Always check context cancellation before each retry.

**Retrying non-transient errors**: Retrying a 400 Bad Request exactly as many times as a 503. Classify errors before retrying.

**Ignoring Retry-After headers**: A server sending 429 with `Retry-After: 30` is asking you to wait 30 seconds. Honoring this is the cooperative behavior that allows the server to recover.

**No maximum cap on delay**: Without a cap, exponential backoff produces infinite delays. Set a reasonable maximum (20-60 seconds for most cases).

## Connections

**Timeout patterns (Article 02)**: Timeouts and retries must be coordinated. Retrying after a timeout is only safe for idempotent operations.

**Idempotency (Article 10)**: Retries are only safe if the operation is idempotent. Use idempotency keys for operations that must not execute twice.

**Load shedding (Article 04)**: When a service is shedding load, it should send 503 with Retry-After to guide callers' backoff behavior.

**Back pressure (Article 11)**: High retry rates are a signal that the service is under pressure. Back pressure mechanisms can reduce load before retries are needed.

**Correlated failures (Article 13)**: Synchronized retries are a form of correlated behavior that amplifies failures. Jitter breaks this correlation.

## Key Insights

The fundamental insight of backoff with jitter is that the naive retry strategy — retry immediately — is not a safety net but a multiplier of failure. When a service has a partial failure, it's usually resource-constrained (too many requests, too little CPU, exhausted connection pool). Immediate retries increase the request load at exactly the moment the service can least handle it.

Jitter deserves more respect than it typically gets. The mathematical analysis from AWS quantifies something architects have intuited for years: coordinated behavior in distributed systems is dangerous even when that coordination is accidental. Clients that all started their first request at T=0 will all retry at T+backoff, creating a synchronized wave. Jitter breaks this accidental coordination.

The amplification analysis — 3 layers × 5 retries = 125x — should inform your retry count decisions. Every time someone proposes increasing the retry count "because sometimes the dependency is slow", ask them to run the math on how many leaf-service calls a single user request could generate. The number is almost always a surprise.

The best retry policy is one you never need: a dependency that's reliable enough that retries are rare. Invest in dependency reliability, use circuit breakers to stop retrying broken dependencies, and treat high retry rates as a bug signal rather than a feature. Backoff with jitter is your safety net for when those investments aren't enough — not a substitute for them.
