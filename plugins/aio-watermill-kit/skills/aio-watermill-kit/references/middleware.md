# Watermill Middleware Reference

Complete reference for all built-in middleware in `github.com/ThreeDotsLabs/watermill/message/router/middleware`.

## Table of Contents

1. [Recoverer](#recoverer)
2. [Retry](#retry)
3. [CircuitBreaker](#circuitbreaker)
4. [Deduplicator](#deduplicator)
5. [CorrelationID](#correlationid)
6. [PoisonQueue](#poisonqueue)
7. [Throttle](#throttle)
8. [Timeout](#timeout)
9. [DelayOnError](#delayonerror)
10. [Duplicator](#duplicator)
11. [IgnoreErrors](#ignoreerrors)

---

## Recoverer

Catches panics in handlers and converts them to errors. Without this, a panic kills the entire Router.

```go
router.AddMiddleware(middleware.Recoverer)
```

On panic, returns `RecoveredPanicError` with full stack trace. Always place this first in your middleware chain so it wraps everything.

---

## Retry

Retries failed handler execution with exponential backoff. Uses `cenkalti/backoff` under the hood.

```go
retryMiddleware := middleware.Retry{
    MaxRetries:      3,                        // max attempts (0 = no retries)
    InitialInterval: 100 * time.Millisecond,   // first retry delay
    MaxInterval:     10 * time.Second,          // cap on backoff growth
    Multiplier:      2.0,                       // backoff multiplier
    MaxElapsedTime:  time.Minute,               // total retry window
    Logger:          logger,
}
router.AddMiddleware(retryMiddleware.Middleware)
```

### Advanced Options

```go
retryMiddleware := middleware.Retry{
    // ... base config ...

    // Custom retry decision — return false to skip retry for specific errors
    ShouldRetry: func(retryNum int, delay time.Duration) bool {
        return retryNum < 5
    },

    // Hook for observability (metrics, logging)
    OnRetryHook: func(retryNum int, delay time.Duration) {
        metrics.RetryCounter.Inc()
    },

    // Reset context deadline on each retry — useful when upstream sets tight deadlines
    // Disabled by default because it changes behavior
    ResetContextOnRetry: true,
}
```

**Gotcha:** Without `ResetContextOnRetry`, if the original context has a deadline, retries may immediately fail because the deadline already passed.

---

## CircuitBreaker

Wraps `sony/gobreaker`. Fast-fails when a handler has too many consecutive errors, preventing cascading failures.

```go
cb := middleware.NewCircuitBreaker(gobreaker.Settings{
    Name:        "order-handler",
    MaxRequests: 3,                    // requests allowed in half-open state
    Interval:    10 * time.Second,     // reset interval for counts
    Timeout:     30 * time.Second,     // time to wait before half-open
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures > 5
    },
})
router.AddMiddleware(cb.Middleware)
```

States: Closed (normal) → Open (fast-fail) → Half-Open (probe) → Closed.

---

## Deduplicator

Prevents duplicate message processing by hashing message content and tracking seen hashes.

```go
// Basic (in-memory, Adler-32 hash, 1 minute retention)
dedup, err := middleware.NewDeduplicator(middleware.NewMapExpiringKeyRepository(time.Minute))
if err != nil {
    panic(err)
}
router.AddMiddleware(dedup.Middleware)
```

### Custom Configuration

```go
dedup, _ := middleware.NewDeduplicator(
    myRedisKeyRepository,                    // implement ExpiringKeyRepository for distributed dedup
    middleware.DeduplicatorConfig{
        KeyFactory: middleware.NewSHA256Hasher(0), // SHA-256 for collision resistance (0 = read all)
        Timeout:    5 * time.Minute,
    },
)
```

### ExpiringKeyRepository Interface

Implement this for distributed deduplication (e.g., Redis, DynamoDB):

```go
type ExpiringKeyRepository interface {
    // IsDuplicate returns true if key was already seen.
    // If not seen, stores the key with the given expiration.
    IsDuplicate(ctx context.Context, key string, window time.Duration) (bool, error)
}
```

### Publisher Decorator Variant

Deduplicate at publish time instead of consume time:

```go
dedup := middleware.NewDeduplicatePublisherDecorator(publisher, config)
```

---

## CorrelationID

Propagates a correlation ID through the message chain. Set it on the first message, and all downstream messages automatically carry it.

```go
router.AddMiddleware(middleware.CorrelationID)

// Set on entry point
middleware.SetCorrelationID(watermill.NewUUID(), msg)

// Read in any handler downstream
corrID := middleware.MessageCorrelationID(msg)
```

Metadata key: `"correlation_id"`. The middleware copies it from incoming messages to all outgoing messages produced by the handler.

---

## PoisonQueue

Routes messages that consistently fail processing to a dead-letter topic. Saves the failure reason and original context as metadata.

```go
// Basic — all errors go to poison queue
poisonQueue, err := middleware.PoisonQueue(publisher, "dead_letters")
router.AddMiddleware(poisonQueue)

// With filter — only specific errors go to poison queue
poisonQueue, err := middleware.PoisonQueueWithFilter(publisher, "dead_letters",
    func(err error) bool {
        // Return true to send to poison queue, false to let retry handle it
        return errors.Is(err, ErrInvalidPayload)
    },
)
```

Metadata added to poison queue messages:
- `reason` — error message
- `poisonqueue_topic` — original topic
- `poisonqueue_handler_name` — handler that failed
- `poisonqueue_subscriber_name` — subscriber type

**Important:** PoisonQueue should be placed AFTER Retry in the middleware chain. This way, messages only go to the poison queue after all retries are exhausted.

---

## Throttle

Rate-limits message processing. Shared across all handlers using the same throttle instance.

```go
// 10 messages per second
throttle := middleware.NewThrottle(10, time.Second)
router.AddMiddleware(throttle.Middleware)

// 100 messages per minute
throttle := middleware.NewThrottle(100, time.Minute)
```

Uses a ticker internally. Messages queue up (block) when the rate limit is reached. Useful for protecting downstream services or APIs with rate limits.

---

## Timeout

Wraps the handler's context with a deadline. The handler must respect `msg.Context().Done()` for this to work.

```go
router.AddMiddleware(middleware.Timeout(5 * time.Second))
```

In your handler:
```go
func handler(msg *message.Message) ([]*message.Message, error) {
    ctx := msg.Context()
    select {
    case result := <-doWork(ctx):
        return formatResult(result), nil
    case <-ctx.Done():
        return nil, ctx.Err() // context.DeadlineExceeded
    }
}
```

---

## DelayOnError

Adds exponential backoff delays when handlers return errors. Works with the Delay component's metadata system.

```go
router.AddMiddleware(middleware.NewDelayOnError(
    100 * time.Millisecond, // initial delay
    5 * time.Second,        // max delay
    2.0,                    // multiplier
).Middleware)
```

Requires a PubSub implementation that supports delayed messages (or the Delay component). Sets `_watermill_delayed_for` metadata on error.

---

## Duplicator

Processes each message twice. Useful for testing idempotency — if your handler isn't idempotent, this middleware will expose it.

```go
// Use in test/staging environments
router.AddMiddleware(middleware.Duplicator)
```

Returns combined results from both executions. Only use for testing — never in production.

---

## IgnoreErrors

Suppresses specific errors, preventing them from triggering Nack/retry.

```go
ignoreErrors := middleware.IgnoreErrors{
    IgnoredErrors: []error{
        ErrOrderAlreadyProcessed,
        ErrCustomerNotFound,
    },
}
router.AddMiddleware(ignoreErrors.Middleware)
```

Matched errors are swallowed — the message is Acked as if the handler succeeded. Use sparingly and only for errors that are genuinely safe to ignore.

---

## Writing Custom Middleware

The signature is straightforward — wrap the handler and add behavior before/after:

```go
func MetricsMiddleware(next message.HandlerFunc) message.HandlerFunc {
    return func(msg *message.Message) ([]*message.Message, error) {
        // Before handler
        start := time.Now()
        handler := message.HandlerNameFromCtx(msg.Context())

        // Call handler
        msgs, err := next(msg)

        // After handler
        duration := time.Since(start)
        if err != nil {
            errorCounter.WithLabelValues(handler).Inc()
        }
        durationHistogram.WithLabelValues(handler).Observe(duration.Seconds())

        return msgs, err
    }
}
```

### Middleware Ordering

Middleware executes in the order added. Think of it as wrapping layers:

```
Recoverer → CorrelationID → Retry → PoisonQueue → [Handler]
```

A message passes through Recoverer first, then CorrelationID, etc. On the way back (after handler execution), the order reverses. Place:
1. **Recoverer** first (catches panics from everything)
2. **CorrelationID** early (so correlation is available in all subsequent middleware)
3. **Retry** before PoisonQueue (exhaust retries before dead-lettering)
4. **PoisonQueue** after Retry (last resort)
5. **Business middleware** (throttle, timeout, custom) closest to the handler
