# Idempotency — Making Retries Safe

> "A system that cannot be safely retried is a system that cannot be safely operated. Retries are not optional; idempotency is the price of admission." — AWS Builder's Library

## The Problem

Distributed systems fail in the middle of operations. A network call to create a payment charge might succeed on the server side — the charge is created, the database is updated — but the response never arrives at the client due to a network blip. From the client's perspective, the operation failed. From the server's perspective, it succeeded. The client's retry logic, seeing no response, retries the operation. Now the charge has been created twice.

This is the fundamental problem that idempotency solves: the disconnect between the client's perception of an operation's outcome and the server's actual execution. In distributed systems, this disconnect is not an edge case — it is a normal operating condition. Network partitions happen. Servers timeout. Load balancers close connections mid-response. Clients retry. Without idempotency, every retry is a potential duplicate operation with unpredictable consequences.

The financial implications make this concrete. A customer who clicks "Complete Purchase" and sees a loading spinner that times out has two mental models: either the purchase failed (so they should try again) or it succeeded (so they shouldn't). Without idempotency, the server has no way to distinguish a retry from a new request. The customer might be charged twice, or the customer might never be charged at all — both are terrible outcomes.

The problem extends beyond payments. Double-sending an email notification. Creating duplicate user accounts. Sending a message twice in a chat system. Debiting inventory twice in a warehouse system. Any mutation operation — any operation that changes state — has this same property: if it can be retried without safety guarantees, it can be executed multiple times when it should execute once.

The naive solution — "just don't retry" — fails immediately on inspection. Not retrying means that every network error, every timeout, every transient failure results in a user-visible failure. Modern applications have retry logic built into SDKs, HTTP clients, load balancers, and service meshes. Explicitly disabling all retries is both impractical and counterproductive. The correct solution is to make operations safe to retry by implementing idempotency.

## Core Concept

An operation is idempotent if executing it multiple times produces the same result as executing it once. In database terms: `DELETE WHERE id = 5` is idempotent (deleting something that's already deleted leaves the database in the same state). `INSERT INTO orders VALUES (...)` is not idempotent (inserting the same row twice creates two rows, or errors on a unique constraint).

For distributed systems, the goal is not just mathematical idempotency but operational idempotency: the system produces the same observable outcome regardless of how many times the operation is attempted, even if previous attempts partially executed.

### Idempotency Keys

The standard mechanism for client-controlled idempotency is the idempotency key: a unique identifier attached to each operation by the client that the server uses to deduplicate requests.

The client generates a unique key for each logical operation (typically a UUID or a hash of relevant parameters), attaches it to the request (usually as an HTTP header or request body field), and retries with the same key if the operation fails. The server stores the outcome of the first execution keyed by this identifier. When a retry arrives with the same key, the server returns the stored outcome without re-executing the operation.

From the client's perspective: "here is my idempotency key; if you've already processed this key, return the previous result; if not, process it now and remember the result for this key."

From the server's perspective: "has this idempotency key been processed? If yes, return the stored result. If no, process it now and store the result."

The client is responsible for:
- Generating unique keys per logical operation (not per request — retries use the same key)
- Using UUIDs or other collision-resistant identifiers
- Not reusing keys across different operations

The server is responsible for:
- Storing the result of each operation keyed by idempotency key
- Returning the stored result for repeated keys without re-executing
- Defining the storage TTL (usually 24 hours to a week)
- Handling the case where two concurrent requests arrive with the same key (locking/serialization)

### Database-Level Idempotency

For operations that map cleanly to database writes, idempotency can often be implemented at the database level using unique constraints.

**INSERT with unique constraint**:
```sql
INSERT INTO payments (idempotency_key, amount, status, created_at)
VALUES ($1, $2, 'pending', NOW())
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING *;
```

If the same idempotency key is inserted twice, the second insert does nothing and returns the existing row. The client gets the same payment record both times. This is simple, correct, and requires no application-level locking.

**UPSERT for idempotent updates**:
```sql
INSERT INTO user_preferences (user_id, preference_key, preference_value, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, preference_key)
DO UPDATE SET preference_value = EXCLUDED.preference_value, updated_at = NOW();
```

Setting a preference is idempotent: doing it twice results in the same final state as doing it once.

**Conditional writes**:
```sql
UPDATE orders SET status = 'shipped', shipped_at = NOW()
WHERE order_id = $1 AND status = 'processing';
```

This update only executes if the order is in the expected previous state. If it's already been marked as shipped, the update affects zero rows (idempotent). If the status is something unexpected, the lack of update is a signal that something unusual happened.

### Stripe's Idempotency Key Model

Stripe's implementation is the industry reference for payment idempotency. Their approach, documented in their API documentation and engineering blog:

Clients send an `Idempotency-Key` header with every mutating API call:
```
POST /v1/charges
Idempotency-Key: <client-generated UUID>
Content-Type: application/json

{"amount": 2000, "currency": "usd", "source": "tok_visa"}
```

Stripe stores the result of the charge creation keyed by the idempotency key. The key is scoped to the API key (tenant) to prevent cross-tenant pollution. If the same idempotency key arrives again within 24 hours, Stripe returns the original response verbatim — not a new response, but the exact original response including the same charge ID, timestamp, and all metadata.

Stripe also handles the concurrent request case: if two requests arrive simultaneously with the same idempotency key, one waits until the first completes, then receives the stored result. There is never a case where both requests execute the operation.

The 24-hour window is Stripe's balance between storage cost and retry window. Most retry logic operates over seconds to minutes; 24 hours provides generous coverage for delayed retries or manual retries while bounding the storage requirements.

## Deep Dive

The Builder's Library article "Making retries safe with idempotent APIs" begins with an observation that reframes idempotency from an optional API nicety to a safety requirement: in distributed systems, the question "did the server execute my request?" has no reliable answer when the network fails between the execution and the response. The client cannot distinguish between "the server failed before executing" and "the server executed successfully but the response was lost." Without idempotency, these two cases require different client behavior — but the client cannot determine which case occurred. Idempotency dissolves this distinction: if the server executes idempotently, retrying is always correct regardless of which case occurred.

The DynamoDB conditional write approach documented in the Builder's Library is architecturally elegant because it leverages the same atomicity guarantees that make database writes reliable for a completely different purpose. The condition `attribute_not_exists(idempotency_key)` evaluates to true if and only if no previous write for this key exists. DynamoDB evaluates this condition and performs the write atomically — there is no window between "check if key exists" and "write the result" during which a concurrent request could slip through. This is the standard solution to the check-then-act race condition that naive idempotency implementations suffer from. The Builder's Library article is specific about this: storing failures alongside successes is equally important, because a client that receives an error response may retry, and the server must return the same error rather than re-executing an operation that previously failed for a deterministic reason.

Stripe's idempotency implementation, documented extensively in their engineering blog and API documentation, contributes a design decision that looks small but has significant downstream implications: the server returns the exact original response, not a freshly computed one. This distinction matters because the original response includes data — the charge ID, the timestamp, the authorization code — that the client may have already acted on. A client that received a successful charge response and then had the connection drop before saving the charge ID needs to retry and receive the same charge ID. If the server returns a new charge response with a new ID, the client ends up in a worse state than before: it has a charge it cannot reference. Stripe's choice to return the stored original response ensures the retry produces exactly the same observable outcome as the original successful execution.

Kleppmann's *Designing Data-Intensive Applications* provides the theoretical framework that explains why idempotency is fundamentally about delivery semantics rather than API design. DDIA distinguishes between at-most-once delivery (the operation may not execute, but will never execute twice), at-least-once delivery (the operation will execute at least once, but may execute multiple times), and exactly-once delivery (the operation executes exactly once regardless of retries). DDIA observes that exactly-once delivery is impossible at the network level — the network cannot guarantee that a message is delivered precisely once — but can be achieved at the application level through idempotency. The idempotency key is the application-level mechanism that converts at-least-once delivery into exactly-once semantics. DDIA's analysis of the Kafka exactly-once producer follows the same pattern: the producer assigns sequence numbers to messages, and the broker uses those sequence numbers to deduplicate retries.

The at-least-once delivery property of SQS, documented in the Builder's Library, creates an inescapable requirement for consumer idempotency. SQS guarantees that messages will be delivered at least once but explicitly does not guarantee that they will be delivered exactly once. A Lambda function or queue consumer that processes payments, sends emails, or updates inventory must therefore be idempotent — not as a best practice but as a correctness requirement. The Builder's Library article on "Reliable queueing in distributed systems" describes the pattern: the consumer checks a deduplication store (keyed by message ID or content hash) before processing, and only processes if this message ID has not been seen. This converts the at-least-once SQS guarantee into exactly-once processing at the application level.

The Saga pattern, referenced briefly in the implementation guide, addresses the hardest extension of idempotency: distributed transactions across multiple services. Nygard's *Release It!* and DDIA both discuss why two-phase commit — the traditional solution to distributed transaction atomicity — is impractical for high-throughput microservice architectures. The Saga pattern replaces atomic transactions with a sequence of compensating transactions: if step N fails, execute the compensating transactions for steps 1 through N-1 to undo their effects. Each step and each compensating transaction must be idempotent independently, because either can be retried. This composability of idempotency — the property that a sequence of idempotent operations is itself idempotent if each compensating operation is also idempotent — is what makes the Saga pattern work at scale.

## Implementation Guide

### Step 1: Identify Non-Idempotent Operations

Audit your API for operations that change state and are not naturally idempotent:
- Create operations (POST /orders, POST /payments, POST /users)
- Non-idempotent updates (increment a counter, append to a list)
- Send operations (send email, send SMS, dispatch event)

These are candidates for idempotency key support. Read operations (GET, HEAD) and naturally idempotent operations (SET a specific value) do not need idempotency keys.

### Step 2: Choose Storage Backend

The idempotency store must be:
- Durable (survives server restarts)
- Fast (checked on every mutating request)
- Atomic (prevents races between concurrent identical requests)

Options:
- **Relational database**: Use a unique index on the idempotency key column. Simple, transactional, same database as your application data.
- **DynamoDB/Redis**: Faster for high-throughput services. DynamoDB's conditional writes are excellent for idempotency. Redis with `SET NX EX` works for lower-durability use cases.
- **In-memory**: Only appropriate for testing. Not durable.

### Step 3: Implement the Idempotency Check

```go
type IdempotencyStore struct {
    db *sql.DB
}

type StoredResult struct {
    Key        string
    Response   json.RawMessage
    StatusCode int
    CreatedAt  time.Time
}

func (s *IdempotencyStore) GetOrCreate(
    ctx context.Context,
    key string,
    execute func() (interface{}, int, error),
) (interface{}, int, error) {
    // Check for existing result
    existing, err := s.get(ctx, key)
    if err == nil {
        return existing.Response, existing.StatusCode, nil
    }
    if !errors.Is(err, sql.ErrNoRows) {
        return nil, 0, fmt.Errorf("idempotency store get: %w", err)
    }
    
    // Execute the operation
    result, statusCode, execErr := execute()
    
    // Store the result (even failures are stored to prevent retry storms)
    if err := s.store(ctx, key, result, statusCode, execErr); err != nil {
        log.Warnf("failed to store idempotency result for key %s: %v", key, err)
        // Continue — the operation succeeded, best effort storage
    }
    
    return result, statusCode, execErr
}
```

### Step 4: Handle Concurrent Requests

Two concurrent requests with the same idempotency key must not execute the operation twice. Use advisory locks, SELECT FOR UPDATE, or distributed locks:

```go
func (s *IdempotencyStore) GetOrCreateWithLock(
    ctx context.Context,
    key string,
    execute func() (interface{}, int, error),
) (interface{}, int, error) {
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return nil, 0, err
    }
    defer tx.Rollback()
    
    // Lock the row (or create a placeholder)
    var existing StoredResult
    err = tx.QueryRowContext(ctx,
        `INSERT INTO idempotency_keys (key, status, created_at)
         VALUES ($1, 'in_progress', NOW())
         ON CONFLICT (key) DO UPDATE SET status = idempotency_keys.status
         RETURNING key, response, status_code, status`,
        key,
    ).Scan(&existing.Key, &existing.Response, &existing.StatusCode)
    
    if existing.Status == "complete" {
        return existing.Response, existing.StatusCode, nil
    }
    
    // We own the lock — execute
    result, statusCode, execErr := execute()
    
    // Update with result
    tx.ExecContext(ctx,
        `UPDATE idempotency_keys SET response = $1, status_code = $2, status = 'complete'
         WHERE key = $3`,
        toJSON(result), statusCode, key,
    )
    
    tx.Commit()
    return result, statusCode, execErr
}
```

### Step 5: Set Appropriate TTL

Idempotency keys should expire after a period that covers your retry window plus margin:
- For interactive user operations: 24 hours
- For async/batch operations: 7 days
- For payment operations: 30 days (to handle delayed reconciliation)

Clean up expired keys with a background job to prevent unbounded table growth.

### Step 6: Client-Side Key Generation

Clients must generate idempotency keys correctly:

```python
import uuid

class PaymentClient:
    def charge(self, amount: int, source: str) -> dict:
        # Generate once per logical operation
        idempotency_key = str(uuid.uuid4())
        
        for attempt in range(3):
            try:
                response = self.http_client.post(
                    "/charges",
                    headers={"Idempotency-Key": idempotency_key},  # Same key each retry
                    json={"amount": amount, "source": source},
                    timeout=5
                )
                return response.json()
            except (TimeoutError, ConnectionError):
                if attempt == 2:
                    raise
                time.sleep(backoff(attempt))
        # idempotency_key is the SAME across all three attempts
```

The critical mistake to avoid: generating a new key on each retry attempt. That defeats the purpose entirely.

## When to Use / When NOT to Use

**Implement idempotency for:**
- Payment and financial operations (always)
- User account creation
- Email and notification sending
- Any operation triggered by a webhook or queue consumer
- Any operation that can be retried by the client

**Idempotency is unnecessary for:**
- Read operations (GET requests) — inherently idempotent
- Operations that are naturally idempotent (set a field to a specific value)
- Append-only log writes where duplicates are acceptable (some analytics pipelines)

**Special consideration for queue consumers**: SQS, Kafka, and most message queues provide at-least-once delivery. Queue consumers should always be idempotent or check a deduplication store before processing.

## Common Mistakes

**Generating a new key per retry**: The idempotency key must be generated once per logical operation and reused for all retries. Generating a new key on each retry attempt is functionally equivalent to having no idempotency at all.

**Not storing failure results**: If the operation fails, store the failure. If you don't store failures, a retry after a failed operation will re-execute, which may cause the original error to repeat in unexpected ways. Storing failures allows clients to observe a consistent "this operation failed" response.

**Key scope too broad**: Using the same key for different operations (e.g., using a session ID as the idempotency key) can cause unrelated operations to be deduplicated against each other.

**Key scope too narrow**: Using a key that's specific to one server's execution (like a server-generated request ID) rather than client-generated means retries to different servers use different keys and don't benefit from deduplication.

**Race condition on first execution**: Without proper locking, two concurrent requests with the same key can both pass the "key not found" check and both execute the operation. Use database transactions with appropriate locking to prevent this.

**Idempotency for distributed transactions**: When an operation spans multiple services (charge payment AND update inventory AND send confirmation email), idempotency for the composite operation is much harder than for a single-service operation. Consider the Saga pattern for multi-service idempotency.

## Connections

**Timeout patterns (Article 02)**: Timeouts create the most common trigger for retries. Every timed-out request is a potential retry, and every retry needs idempotency to be safe.

**Backoff and jitter (Article 03)**: Backoff determines when retries happen. Idempotency determines whether retries are safe. Both are required for correct retry behavior.

**Chaos engineering (Article 08)**: Chaos experiments that inject network failures mid-operation are the best way to validate idempotency implementation. Run the experiment: inject a failure at the moment of charge creation, observe the retry, verify no duplicate charge was created.

**Safe deployments (Article 14)**: During rolling deployments, requests may be handled by different versions of the service. Idempotency keys stored by an old version should be readable by a new version. Version your idempotency store schema carefully.

**Correlated failures (Article 13)**: Large-scale failures cause large-scale retries. Without idempotency, recovery from a large-scale failure causes a tsunami of duplicate operations. Idempotency makes recovery safe.

## Key Insights

The fundamental insight is that "did this operation execute?" is unanswerable in a distributed system from the client's perspective when network failures occur. The client sent the request; the server may or may not have received it; if received, may or may not have processed it; if processed, the response may or may not have been received by the client. This uncertainty is irreducible. Idempotency is how you make the uncertainty not matter: regardless of what actually happened, retrying with the same key produces the right answer.

The Stripe model — store the full response, not just success/failure — is the right level of detail. Clients don't just need to know "was this operation performed?" They need to know "what was the result?" If a charge was created with charge ID ch_abc123, a retry should return ch_abc123, not a new charge. The client's downstream logic (saving the charge ID, sending a confirmation email) needs the original charge ID to be idempotent itself.

The database unique constraint approach deserves emphasis for its simplicity. Rather than implementing a separate idempotency store, model your data so that idempotency is expressed as a unique constraint at the database level. `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE` with appropriate semantics is the most correct and simplest idempotency implementation when your data model supports it.

Idempotency is ultimately about making systems honest about their failure modes. A non-idempotent system that retries on failure is lying to itself — asserting that operations can be safely retried when they can't. Making operations idempotent is the work of making that assertion true.
