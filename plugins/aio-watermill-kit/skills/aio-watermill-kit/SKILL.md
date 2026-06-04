---
name: aio-watermill-kit
description: |
  Build event-driven Go apps with Watermill (ThreeDotsLabs) — Router, middleware chains, pub/sub Go patterns, CQRS, and broker integrations (Kafka, AMQP, NATS, Redis Streams, SQL). Use for async messaging, message queue design, message bus architecture, event sourcing, and Go event broker setup.
when_to_use: watermill, event-driven Go, message router, pub/sub Go, CQRS Go, event bus Go, message handler, watermill middleware, watermill kafka, Kafka, AMQP, Redis Streams, NATS, SQL pub/sub, ThreeDotsLabs, async messaging, message queue, message bus, event sourcing, Go event broker
effort: medium
---

# Watermill — Event-Driven Go Applications

Watermill is a Go library for building event-driven applications. It provides a clean abstraction over
message brokers with a **three-tier API**: low-level Publisher/Subscriber interfaces, a mid-level Router
with middleware support, and a high-level CQRS component.

The library's core philosophy: **at-least-once delivery** with **idempotent handlers**. Every handler
you write should safely handle receiving the same message twice.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  CQRS (High-level)                              │
│  CommandBus, EventBus, Processors, Marshalers   │
├─────────────────────────────────────────────────┤
│  Router (Mid-level)                             │
│  Handlers, Middleware chains, Lifecycle mgmt    │
├─────────────────────────────────────────────────┤
│  Publisher / Subscriber (Low-level)             │
│  Kafka, AMQP, Redis, NATS, SQL, GoChannel...   │
└─────────────────────────────────────────────────┘
```

Choose the right tier:
- **Publisher/Subscriber** — when you need raw control or simple publish/consume
- **Router** — when you need middleware, multiple handlers, or message transformation (most common)
- **CQRS** — when you want typed commands/events with automatic marshaling

## Core Types

### Message

The fundamental data unit. Immutable after publishing.

```go
msg := message.NewMessage(watermill.NewUUID(), payload)
msg.Metadata.Set("correlation_id", corrID)

// Lifecycle: created → published → acked/nacked
// Router handles Ack/Nack automatically — don't call them manually in handlers
```

Fields:
- `UUID` (string) — unique ID for tracing/dedup, use `watermill.NewUUID()` or `watermill.NewULID()`
- `Payload` ([]byte) — message body, any format (JSON, Protobuf, etc.)
- `Metadata` (message.Metadata) — key-value headers, correlation IDs, partition keys
- `Context` — standard `context.Context` for cancellation and deadlines

### Publisher & Subscriber

```go
type Publisher interface {
    Publish(topic string, messages ...*Message) error
    Close() error
}

type Subscriber interface {
    Subscribe(ctx context.Context, topic string) (<-chan *Message, error)
    Close() error
}
```

These interfaces decouple your code from specific brokers. Write business logic against the interfaces,
swap implementations at configuration time.

## Router — The Heart of Watermill

The Router is where most Watermill applications live. It manages handler lifecycle, middleware chains,
and message flow.

### Setup

```go
router, err := message.NewRouter(message.RouterConfig{
    CloseTimeout: 30 * time.Second, // grace period for shutdown
}, logger)
if err != nil {
    panic(err)
}

// Add global middleware (applied to ALL handlers)
router.AddMiddleware(
    middleware.Recoverer,                    // catch panics
    middleware.CorrelationID,                // propagate correlation IDs
    middleware.Retry{MaxRetries: 3}.Middleware,
)
```

### Handler Types

**1. Full handler** — consumes from one topic, produces to another:
```go
router.AddHandler(
    "order_processor",       // unique name
    "orders.created",        // subscribe topic
    subscriber,              // Subscriber impl
    "orders.processed",      // publish topic
    publisher,               // Publisher impl
    func(msg *message.Message) ([]*message.Message, error) {
        // Process incoming message
        var order Order
        if err := json.Unmarshal(msg.Payload, &order); err != nil {
            return nil, err // triggers Nack + retry
        }

        // Return messages to publish (or nil/empty to publish nothing)
        result, _ := json.Marshal(ProcessedOrder{ID: order.ID})
        return []*message.Message{
            message.NewMessage(watermill.NewUUID(), result),
        }, nil
    },
)
```

**2. Consumer handler** — consumes only, no automatic publishing:
```go
router.AddConsumerHandler(
    "order_logger",
    "orders.created",
    subscriber,
    func(msg *message.Message) error {
        log.Printf("Order received: %s", msg.UUID)
        return nil // success → auto-Ack
    },
)
```

### Handler-Level Middleware

```go
handler := router.AddHandler("name", inTopic, sub, outTopic, pub, handlerFn)
handler.AddMiddleware(specificMiddleware) // only this handler
```

### Router Lifecycle

```go
// Start (blocking — run in goroutine if needed)
go func() {
    if err := router.Run(ctx); err != nil {
        log.Fatal(err)
    }
}()

// Wait until running
<-router.Running()

// Graceful shutdown
router.Close()
```

Handlers can be added dynamically even after `Run()` — call `router.RunHandlers()` to start them.

### Context Values in Handlers

```go
func handler(msg *message.Message) ([]*message.Message, error) {
    handlerName := message.HandlerNameFromCtx(msg.Context())
    subscribeTopic := message.SubscribeTopicFromCtx(msg.Context())
    publishTopic := message.PublishTopicFromCtx(msg.Context())
    // Also: PublisherNameFromCtx, SubscriberNameFromCtx
}
```

## Middleware

Middleware wraps handlers with cross-cutting concerns. The signature is simple:

```go
type HandlerMiddleware func(HandlerFunc) HandlerFunc

// Example: logging middleware
func LoggingMiddleware(next message.HandlerFunc) message.HandlerFunc {
    return func(msg *message.Message) ([]*message.Message, error) {
        start := time.Now()
        msgs, err := next(msg)
        log.Printf("handler took %v, err=%v", time.Since(start), err)
        return msgs, err
    }
}
```

### Essential Middleware Stack

For production, start with this baseline and adjust:

```go
router.AddMiddleware(
    middleware.Recoverer,                           // 1. catch panics (always first)
    middleware.CorrelationID,                        // 2. trace correlation
    middleware.Retry{                                // 3. retry on transient errors
        MaxRetries:      3,
        InitialInterval: 100 * time.Millisecond,
        MaxInterval:     5 * time.Second,
        Multiplier:      2,
    }.Middleware,
    middleware.PoisonQueue(publisher, "dead_letters"), // 4. DLQ for persistent failures
)
```

For the full middleware reference (Deduplicator, CircuitBreaker, Throttle, Timeout, DelayOnError,
Duplicator, IgnoreErrors), read `${CLAUDE_PLUGIN_ROOT}/skills/aio-watermill-kit/references/middleware.md`.

## Publisher/Subscriber Decorators

Wrap publishers/subscribers with cross-cutting behavior:

```go
// Transform all outgoing messages
decorated := message.MessageTransformPublisherDecorator(func(msg *message.Message) {
    msg.Metadata.Set("service", "order-processor")
})
decoratedPub := decorated(publisher)

// Router-level decorators
router.AddPublisherDecorators(decoratorFunc)
router.AddSubscriberDecorators(decoratorFunc)
```

## Choosing a PubSub Implementation

| PubSub | Best for | Throughput | Exactly-once |
|--------|----------|-----------|--------------|
| **GoChannel** | Tests only | ~315K/s | Yes (single process) |
| **Kafka** | High throughput, ordering per partition | ~100K/s sub | No |
| **NATS JetStream** | Cloud-native, low latency | ~50K/s | No |
| **Redis Streams** | Simple setup, medium scale | ~59K/s pub | No |
| **AMQP (RabbitMQ)** | Flexible routing, durable queues | ~15K/s sub | No |
| **SQL (Postgres/MySQL)** | Transactional consistency | ~3-9K/s | Yes (same DB tx) |
| **Google Cloud Pub/Sub** | GCP ecosystem, auto-scaling | ~29K/s sub | No |

Decision guide:
- Need exactly-once? → **SQL** (process + DB update in same transaction)
- Need high throughput with ordering? → **Kafka** (partition by entity key)
- Need flexible routing patterns? → **AMQP/RabbitMQ**
- Testing? → **GoChannel** (always, never in production)

For detailed PubSub configuration and setup, read `${CLAUDE_PLUGIN_ROOT}/skills/aio-watermill-kit/references/pubsub.md`.

## CQRS Component

The CQRS layer adds typed commands and events on top of the Router. Instead of raw `[]byte` payloads,
you work with Go structs.

```go
// Define command
type PlaceOrder struct {
    OrderID string
    Amount  float64
}

// Command handler
func handlePlaceOrder(ctx context.Context, cmd *PlaceOrder) error {
    // Process command, optionally emit events via EventBus
    return eventBus.Publish(ctx, &OrderPlaced{OrderID: cmd.OrderID})
}

// Wire it up
commandBus, _ := cqrs.NewCommandBusWithConfig(cqrs.CommandBusConfig{
    GeneratePublishTopic: func(params cqrs.CommandBusGeneratePublishTopicParams) (string, error) {
        return "commands." + params.CommandName, nil
    },
    Marshaler: cqrs.JSONMarshaler{GenerateName: cqrs.StructName},
})

commandProcessor, _ := cqrs.NewCommandProcessorWithConfig(router, cqrs.CommandProcessorConfig{
    GenerateSubscribeTopic: func(params cqrs.CommandProcessorGenerateSubscribeTopicParams) (string, error) {
        return "commands." + params.CommandName, nil
    },
    SubscriberConstructor: func(params cqrs.CommandProcessorSubscriberConstructorParams) (message.Subscriber, error) {
        return subscriber, nil
    },
    Marshaler: cqrs.JSONMarshaler{GenerateName: cqrs.StructName},
})

commandProcessor.AddHandlers(
    cqrs.NewCommandHandler("PlaceOrder", handlePlaceOrder),
)
```

For complete CQRS setup (EventBus, EventProcessor, EventProcessorGroup, Marshalers), read `${CLAUDE_PLUGIN_ROOT}/skills/aio-watermill-kit/references/cqrs.md`.

## Components

Watermill ships several reusable components:

| Component | Purpose | When to use |
|-----------|---------|------------|
| **Forwarder** | Outbox pattern — publish to DB, forward to broker | Transactional consistency with eventual pub |
| **FanIn** | Merge N topics → 1 topic | Aggregate from multiple sources |
| **Delay** | Deferred message processing | Scheduled retries, delayed notifications |
| **Requeuer** | Move messages between topics with delay | Failed message reprocessing |
| **RequestReply** | Request-response over async messaging | Sync-style calls over async infra |
| **Metrics** | Prometheus Publisher/Subscriber decorators | Production observability |

For detailed component usage and examples, read `${CLAUDE_PLUGIN_ROOT}/skills/aio-watermill-kit/references/patterns.md`.

## Logging

Watermill uses its own `LoggerAdapter` interface. Two built-in options:

```go
// Standard library slog (Go 1.21+, recommended)
logger := watermill.NewSlogLogger(slog.Default())

// Standard writer
logger := watermill.NewStdLogger(debug, trace)

// No logging
logger := watermill.NopLogger{}
```

The logger supports structured fields via `With(LogFields)` for contextual logging.

## Configuration Pattern

All Watermill types follow this pattern — understand it once, use it everywhere:

```go
type SomeConfig struct {
    Field1 string
    Field2 int
    // ...
}

func (c *SomeConfig) setDefaults() {
    if c.Field2 == 0 { c.Field2 = 10 }
}

func (c SomeConfig) Validate() error {
    if c.Field1 == "" { return errors.New("field1 required") }
    return nil
}

instance, err := NewSomething(config, logger)
```

## Testing with Watermill

Use GoChannel for all tests — it's fast, in-memory, and single-process.

```go
func TestOrderHandler(t *testing.T) {
    logger := watermill.NewStdLogger(false, false)
    pubSub := gochannel.NewGoChannel(gochannel.Config{}, logger)

    router, _ := message.NewRouter(message.RouterConfig{}, logger)
    router.AddHandler("test", "in", pubSub, "out", pubSub, orderHandler)

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    go router.Run(ctx)
    <-router.Running()

    // Publish test message
    payload, _ := json.Marshal(Order{ID: "123"})
    pubSub.Publish("in", message.NewMessage(watermill.NewUUID(), payload))

    // Read output
    msgs, _ := pubSub.Subscribe(ctx, "out")
    select {
    case msg := <-msgs:
        assert.Contains(t, string(msg.Payload), "123")
        msg.Ack()
    case <-time.After(time.Second):
        t.Fatal("timeout")
    }
}
```

For chaos testing: `middleware.RandomFail(0.1)` (10% failure) and `middleware.RandomPanic(0.1)`.

For log assertions: `watermill.CaptureLoggerAdapter` captures all log entries for inspection.

## Best Practices

**Always do:**
- Use `Recoverer` middleware — panics in handlers will crash the Router without it
- Generate unique UUIDs for every published message (`watermill.NewUUID()`)
- Design idempotent handlers — at-least-once delivery means messages can repeat
- Return errors from handlers to trigger Nack + retry (don't silently swallow)
- Use correlation IDs for distributed tracing across services
- Close Router, Publishers, and Subscribers properly on shutdown
- Use Prometheus metrics in production (`components/metrics`)
- Test with GoChannel, deploy with your production PubSub

**Never do:**
- Call `msg.Ack()` or `msg.Nack()` manually when using Router (it handles this)
- Use GoChannel in production (no persistence, no distribution)
- Block a handler indefinitely (use `Timeout` middleware)
- Couple business logic to a specific PubSub implementation
- Publish very large payloads (use object storage + reference in message)
- Ignore handler errors (unhandled errors = lost messages)

## Common Pitfalls

1. **"Messages disappear"** — GoChannel without `Persistent: true` drops messages if no subscriber is
   listening. In production PubSubs, check consumer group configuration.

2. **"Handler processes forever"** — Missing `Timeout` middleware. Add context deadlines.

3. **"Duplicate processing"** — Expected with at-least-once delivery. Either use Deduplicator middleware
   or make handlers naturally idempotent (upsert, not insert).

4. **"Router won't shut down"** — Handlers blocking on external calls. Use context cancellation and
   check `msg.Context().Done()` in long-running handlers.

5. **"Middleware not working"** — Check ordering. Router-level middleware applies to all handlers.
   Handler-level middleware applies only to that handler. Middlewares added first execute first.

## Reference Files

| File | Contents |
|------|----------|
| `${CLAUDE_PLUGIN_ROOT}/skills/aio-watermill-kit/references/middleware.md` | Full middleware catalog with configuration examples |
| `${CLAUDE_PLUGIN_ROOT}/skills/aio-watermill-kit/references/cqrs.md` | CQRS setup: CommandBus, EventBus, Processors, Marshalers |
| `${CLAUDE_PLUGIN_ROOT}/skills/aio-watermill-kit/references/pubsub.md` | PubSub implementation details, configs, and trade-offs |
| `${CLAUDE_PLUGIN_ROOT}/skills/aio-watermill-kit/references/patterns.md` | Advanced patterns: Outbox, Saga, Fan-in/out, Forwarder, Delay |
