# Idempotency in APIs

> "At-least-once delivery is the default. Idempotency is how you make at-least-once safe." — Pat Helland

## The Problem

Networks are unreliable. A client sends a payment request. The server receives it, processes the payment, charges the credit card, and is about to return a 200 response when the connection drops. The client receives a TCP timeout. It does not know whether the server processed the payment or not. The client's only safe option is to retry — but if it does, it might charge the customer twice.

This is not a theoretical concern. It is the most common source of financial errors in payment systems. It is why orders get duplicated. It is why emails get sent multiple times. It is why records get created twice in databases. Any operation that involves a non-idempotent API call over an unreliable network is vulnerable to this class of bug.

The problem compounds at scale. At 10,000 requests per second, a 0.1% network error rate generates 10 failures per second, each of which requires a retry decision. Without idempotency guarantees, retries are dangerous. With idempotency guarantees, retries are safe and can be automatic. The difference between "retry automatically on failure" and "alert on failure and require manual intervention" is the difference between a resilient system and a fragile one.

Most developers understand the problem in principle. The failure mode is in the implementation: adding idempotency as an afterthought, after the non-idempotent API is already in production and clients have built retry logic around it. Idempotency must be designed in from the beginning — it cannot be bolted on.

## Core Concept

An operation is **idempotent** if performing it multiple times produces the same result as performing it once. The state of the system after N calls equals the state after one call.

An operation is **safe** if it has no side effects. GET requests are safe: they read state without modifying it. Safe operations are also idempotent, but idempotent operations are not necessarily safe (DELETE changes state, but calling it twice leaves the system in the same final state — the resource is deleted).

### HTTP Method Idempotency

HTTP defines the idempotency semantics of each method:

| Method | Idempotent | Safe | Notes |
|--------|-----------|------|-------|
| GET | Yes | Yes | Reads only, no side effects |
| HEAD | Yes | Yes | Like GET, no body |
| PUT | Yes | No | Replace resource with given representation |
| DELETE | Yes | No | Resource deleted; second call returns 404 but state unchanged |
| OPTIONS | Yes | Yes | Metadata only |
| POST | No | No | Creates new resource; multiple calls = multiple creates |
| PATCH | No | No | Partial update; semantics depend on implementation |

The idempotency of PUT is often misunderstood. `PUT /users/123` is idempotent because sending the same request twice results in the same final state — the user has the representation you specified. The second PUT does not create a second user; it updates the same one to the same state. This is why `PUT /users/123/activate` is not idempotent despite using PUT — "activate" implies a state transition, not a representation replacement.

### Making POST Idempotent: Idempotency Keys

POST requests are not inherently idempotent — each POST creates a new resource. To make POST idempotent, clients generate a unique idempotency key for each logical operation and include it in the request. The server stores the result of the first request and returns the same result for subsequent requests with the same key.

This is Stripe's pattern, formalized in their API documentation:

```
POST /v1/charges HTTP/1.1
Idempotency-Key: <unique-uuid-per-request>
Content-Type: application/json

{
  "amount": 2000,
  "currency": "usd",
  "source": "tok_visa"
}
```

On first receipt: process the charge, store the result, return it.
On duplicate receipt (same `Idempotency-Key`): return the stored result without re-processing.

The idempotency key is client-generated, not server-generated. This is critical: if the server generated the key, the client would need to receive the key before knowing it could be used in a retry — defeating the purpose. The client must generate the key before making the first attempt, so any retry can use the same key.

### The Idempotency Key Lifecycle

```
Client                              Server
  |                                    |
  |-- [Generate key: uuid-abc123] ---> |
  |-- POST /charges                    |
  |   Idempotency-Key: uuid-abc123     |
  |   { amount: 2000, ... }            |
  |                                    |-- [Check: key uuid-abc123 exists? No]
  |                                    |-- [Lock key uuid-abc123]
  |                                    |-- [Process charge]
  |                                    |-- [Store: uuid-abc123 → {charge_id, result}]
  |                                    |-- [Unlock key uuid-abc123]
  |<-- 200 { charge_id: "ch_abc" } ----|
  |                                    |
  |  [Connection drops before ACK]     |
  |                                    |
  |-- POST /charges (RETRY)            |
  |   Idempotency-Key: uuid-abc123     |
  |   { amount: 2000, ... }            |
  |                                    |-- [Check: key uuid-abc123 exists? Yes]
  |<-- 200 { charge_id: "ch_abc" } ----|
  |  [Same response, no duplicate]     |
```

The server's implementation requires:
1. **Storage** for idempotency records: (key, result, expiry)
2. **Locking** to prevent race conditions when two requests with the same key arrive simultaneously
3. **Request fingerprinting** to detect misuse: if two requests have the same key but different bodies, return `422 Unprocessable Entity` — the client reused a key for a different operation
4. **TTL management**: idempotency records expire (typically 24 hours to 7 days)

### The Concurrent Request Problem

Two requests with the same idempotency key arrive simultaneously before the first is complete. Without locking, both proceed in parallel, both create a charge, and both attempt to store their result. This is the same double-charge problem the idempotency key was designed to prevent.

The solution is distributed locking on the idempotency key. Redis `SET NX PX` (set if not exists, with TTL) is the standard implementation:

```redis
SET idempotency:uuid-abc123 "PROCESSING" NX PX 30000
```

If the key already exists (NX fails), the second request waits or returns `409 Conflict` with a retry hint. When the first request completes, it updates the stored value from `"PROCESSING"` to the actual result.

```redis
SET idempotency:uuid-abc123 '{"status":200,"body":{"charge_id":"ch_abc"}}' XX PX 86400000
```

`XX` (only set if exists) prevents updating a key that expired between the initial lock and the result storage.

## Deep Dive

Pat Helland's phrase "at-least-once delivery is the default" captures a fundamental truth about distributed systems: reliable messaging over unreliable networks defaults to delivering messages at least once, because the only way to guarantee delivery is to retry until confirmation is received. The confirmation may never arrive even if the message was received, because the connection drops before the response reaches the sender. The sender cannot distinguish "the message was not delivered" from "the message was delivered but the acknowledgment was lost." The only safe response in the presence of this ambiguity is to retry. Idempotency is how you make this retry-safe behavior correct: if retrying the same operation multiple times produces the same outcome as executing it once, at-least-once delivery becomes functionally equivalent to exactly-once delivery from the perspective of the application.

Stripe's idempotency key design is the most studied public implementation of API-level idempotency, and it contains several design decisions that are worth understanding explicitly. The client generates the key, not the server. This is essential: if the server generated the key and returned it in the first response, a client whose first request timed out would never receive the key and could not use it for retries. The client must generate the key before making the first attempt so that every retry uses the same key. Stripe recommends UUID v4 for key generation, which provides sufficient uniqueness (2^122 possible values) to make collision probability negligible. The 24-hour storage window reflects a practical judgment about retry behavior: a client that has not retried within 24 hours is unlikely to retry at all, and storing idempotency records indefinitely would be unbounded storage growth.

The request fingerprinting check that Stripe performs — rejecting requests that use an existing idempotency key with a different request body — addresses a subtle bug class that idempotency keys create. Without this check, a developer could accidentally reuse a UUID they generated for a $50 charge to create a $500 charge, and the server would return the response from the $50 charge while actually processing neither or both. Stripe's implementation ties the idempotency key to a specific request signature, making accidental reuse fail loudly rather than silently returning stale results. This is an example of the principle that idempotency mechanisms should fail detectably on misuse rather than silently producing incorrect behavior.

The database implementation of idempotency keys follows a specific pattern that is straightforward to get wrong. The correct implementation stores the idempotency key and the response atomically in the same transaction as the operation being performed. If storing the idempotency record and executing the operation are separate operations, there is a race condition: two concurrent requests with the same key can both pass the "does this key exist?" check before either has stored the result. The correct implementation uses a unique constraint on the idempotency key column and relies on database transaction isolation to serialize concurrent requests with the same key — only one will succeed in inserting the key; the other will encounter a constraint violation and can then read the stored result.

Google's AIP-155 treatment of request identification takes a slightly different angle from Stripe's. Rather than framing idempotency primarily as a client retry mechanism, AIP-155 frames the `request_id` as a request identity mechanism that enables observability and debugging as well as idempotency. A request ID that is client-generated and logged by both client and server creates a traceable connection between client-side retry attempts and server-side processing records. This observability value is independent of the idempotency value: even if a request is not retried, the request ID allows correlation of client logs and server logs for debugging. The framing reflects Google's operational philosophy that APIs should be designed for debuggability as a primary concern, not as an afterthought.

## Implementation Guide

### Server-Side Idempotency Implementation

```go
type IdempotencyStore struct {
    redis *redis.Client
    ttl   time.Duration
}

type IdempotencyRecord struct {
    Status  int             `json:"status"`
    Headers map[string]string `json:"headers"`
    Body    json.RawMessage `json:"body"`
}

// ProcessIdempotentRequest handles the idempotency key lifecycle.
// Returns (record, isNew, error).
// If isNew=false, record contains the stored response — return it directly.
// If isNew=true, call your handler and then call StoreResult.
func (s *IdempotencyStore) ProcessRequest(
    ctx context.Context,
    key string,
    fingerprint string, // hash of request method + path + body
) (*IdempotencyRecord, bool, error) {
    // Attempt to acquire lock
    lockKey := "idempotency:lock:" + key
    acquired, err := s.redis.SetNX(ctx, lockKey, fingerprint, 30*time.Second).Result()
    if err != nil {
        return nil, false, fmt.Errorf("lock failed: %w", err)
    }

    resultKey := "idempotency:result:" + key

    if !acquired {
        // Another request has this key — check if it's the same fingerprint
        storedFingerprint, err := s.redis.Get(ctx, lockKey).Result()
        if err != nil {
            return nil, false, fmt.Errorf("get lock failed: %w", err)
        }
        if storedFingerprint != fingerprint {
            return nil, false, ErrIdempotencyKeyConflict
        }
        // Same fingerprint — wait for result or return conflict
        // In practice: poll or return 409 with Retry-After
        return nil, false, ErrIdempotencyKeyProcessing
    }

    // We hold the lock — check if result already exists (key reuse after expiry)
    existing, err := s.redis.Get(ctx, resultKey).Result()
    if err == nil {
        var record IdempotencyRecord
        if err := json.Unmarshal([]byte(existing), &record); err == nil {
            return &record, false, nil
        }
    }

    return nil, true, nil // New request — caller should process and store
}

func (s *IdempotencyStore) StoreResult(
    ctx context.Context,
    key string,
    record IdempotencyRecord,
) error {
    b, err := json.Marshal(record)
    if err != nil {
        return err
    }
    resultKey := "idempotency:result:" + key
    return s.redis.Set(ctx, resultKey, b, s.ttl).Err()
}

// HTTP middleware
func IdempotencyMiddleware(store *IdempotencyStore) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            key := r.Header.Get("Idempotency-Key")
            if key == "" || r.Method == http.MethodGet {
                next.ServeHTTP(w, r)
                return
            }

            fingerprint := computeFingerprint(r)
            record, isNew, err := store.ProcessRequest(r.Context(), key, fingerprint)
            if err != nil {
                if errors.Is(err, ErrIdempotencyKeyConflict) {
                    http.Error(w, "Idempotency key used with different request", 422)
                    return
                }
                if errors.Is(err, ErrIdempotencyKeyProcessing) {
                    w.Header().Set("Retry-After", "1")
                    http.Error(w, "Request in progress", 409)
                    return
                }
                http.Error(w, "Internal error", 500)
                return
            }

            if !isNew {
                // Return stored response
                for k, v := range record.Headers {
                    w.Header().Set(k, v)
                }
                w.WriteHeader(record.Status)
                w.Write(record.Body)
                return
            }

            // Capture response
            recorder := httptest.NewRecorder()
            next.ServeHTTP(recorder, r)

            // Store result
            store.StoreResult(r.Context(), key, IdempotencyRecord{
                Status:  recorder.Code,
                Headers: headersToMap(recorder.Header()),
                Body:    recorder.Body.Bytes(),
            })

            // Write actual response
            for k, v := range recorder.Header() {
                w.Header()[k] = v
            }
            w.WriteHeader(recorder.Code)
            w.Write(recorder.Body.Bytes())
        })
    }
}
```

### Client-Side Retry with Idempotency Keys

```go
func (c *Client) CreateCharge(ctx context.Context, req ChargeRequest) (*Charge, error) {
    // Generate key once, before first attempt
    idempotencyKey := uuid.New().String()

    var lastErr error
    for attempt := 0; attempt < 3; attempt++ {
        if attempt > 0 {
            // Exponential backoff: 1s, 2s, 4s
            time.Sleep(time.Duration(1<<attempt) * time.Second)
        }

        charge, err := c.createChargeOnce(ctx, req, idempotencyKey)
        if err == nil {
            return charge, nil
        }

        // Retry only on transient errors
        if isRetryable(err) {
            lastErr = err
            continue
        }

        // Non-retryable error (4xx) — do not retry
        return nil, err
    }

    return nil, fmt.Errorf("failed after 3 attempts: %w", lastErr)
}

func isRetryable(err error) bool {
    var apiErr *APIError
    if errors.As(err, &apiErr) {
        // Retry on 500, 502, 503, 504 — not on 4xx
        return apiErr.StatusCode >= 500
    }
    // Retry on network errors
    var netErr net.Error
    return errors.As(err, &netErr)
}
```

## When to Use / When NOT to Use

**Implement idempotency for:**
- Any POST endpoint that creates a resource (user creation, order placement, payment processing)
- Any endpoint with financial or irreversible consequences
- Any endpoint where duplicate execution causes user-visible harm
- Any endpoint in a system where retries are used for resilience

**Idempotency is already guaranteed for:**
- GET, HEAD, OPTIONS — safe methods, no side effects
- Well-implemented PUT — replace semantics are inherently idempotent
- DELETE — the resource is absent after the call, regardless of how many times it was called

**You may skip explicit idempotency when:**
- The operation is naturally idempotent (setting a status to the same value)
- Duplicate execution is harmless (logging, telemetry)
- The operation is in a fully controlled internal system with synchronous retry-or-fail semantics

## Common Mistakes

**Mistake 1: Generating the idempotency key inside the retry loop**

```go
// Wrong: new key on every attempt = no deduplication
for attempt := 0; attempt < 3; attempt++ {
    key := uuid.New().String()  // Different key each time!
    createCharge(req, key)
}

// Right: generate once before the loop
key := uuid.New().String()
for attempt := 0; attempt < 3; attempt++ {
    createCharge(req, key)  // Same key on every retry
}
```

**Mistake 2: Not validating request fingerprint**

If a client uses the same idempotency key for a different request body, they likely have a bug. Return an error (`422 Unprocessable Entity`) rather than silently executing the first request's result. The error forces the client to notice the bug.

**Mistake 3: Overly short TTL on idempotency records**

A 5-minute TTL means a client that retries after 6 minutes (due to circuit breaker cooldown) gets a new execution. Use at minimum 24 hours. Stripe uses 24 hours. For financial operations, longer is safer.

**Mistake 4: Storing idempotency records in the application database with the main transaction**

If the database transaction rolls back, the idempotency record disappears too, and the next retry re-executes the rolled-back operation. Idempotency records and application data must be stored together in the same transaction, or the idempotency record must be stored atomically after the successful commit.

**Mistake 5: Confusing idempotency with exactly-once semantics**

Idempotency guarantees that retrying a successful request returns the same result without re-executing. It does not guarantee exactly-once execution in the presence of failures during processing. If the server fails between "processing complete" and "store idempotency record," the next retry re-executes. True exactly-once semantics require distributed transactions, which are far more expensive.

## Connections

**Async API Patterns** (Article 09): Webhooks and async callbacks face the same duplicate delivery problem. Webhook consumers should treat every incoming event as potentially delivered multiple times and implement idempotency at the consumer level.

**API Design Principles** (Article 10): Idempotency keys are a first-class citizen in Stripe's API design philosophy. Every payment API that takes developer experience seriously documents idempotency prominently.

**Resilience Patterns** (Volume 04): Retry with exponential backoff + idempotency keys is the standard recipe for resilient API calls. The retry policy is meaningless without the idempotency guarantee; the idempotency key is useless without a retry policy.

## Key Insights

The idempotency key is not a server-side feature — it is a protocol between client and server for safely handling retries. The client commits to using the same key for retries of the same logical operation. The server commits to returning the same result for the same key. Both sides must honor the contract.

The most common failure mode in idempotency implementation is partial writes: the server processes the operation but fails to store the idempotency record. The next retry re-executes the operation, defeating the idempotency guarantee. The solution is transactional storage: write the idempotency record and the operation result atomically. In practice, this means storing the idempotency record in Redis with a sufficient TTL and accepting that a narrow failure window exists between "operation complete" and "record stored." For payment systems, this window should be minimized through careful transaction design.

Idempotency is ultimately a product decision, not just an engineering one. Every POST endpoint that creates resources should ask: "What is the user experience if this executes twice?" If the answer is "they get charged twice" or "they receive two emails" or "two records appear in the database," idempotency is not optional — it is required for correctness. The engineering investment in idempotency is small compared to the cost of duplicate charges, duplicate records, or the support burden of cleaning up duplicate data.
