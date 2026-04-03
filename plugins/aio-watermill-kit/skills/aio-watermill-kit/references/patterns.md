# Watermill Advanced Patterns Reference

Patterns and components for building production event-driven systems with Watermill.

## Table of Contents

1. [Outbox Pattern (Forwarder)](#outbox-pattern-forwarder)
2. [Fan-In](#fan-in)
3. [Fan-Out](#fan-out)
4. [Delayed Messages](#delayed-messages)
5. [Requeuer (Failed Message Reprocessing)](#requeuer)
6. [Request-Reply](#request-reply)
7. [Metrics & Observability](#metrics--observability)
8. [Saga / Process Manager](#saga--process-manager)
9. [Event Sourcing](#event-sourcing)
10. [Graceful Shutdown](#graceful-shutdown)
11. [Custom Publisher/Subscriber](#custom-publishersubscriber)

---

## Outbox Pattern (Forwarder)

**Problem:** You need to update a database AND publish an event atomically. Without the outbox pattern,
a crash between the DB write and the publish loses the event.

**Solution:** Publish to the database in the same transaction, then a background Forwarder forwards
messages to the real broker.

```go
import (
    "github.com/ThreeDotsLabs/watermill/components/forwarder"
    watersql "github.com/ThreeDotsLabs/watermill-sql/v4/pkg/sql"
)

// 1. In your handler: publish to SQL (same transaction as data update)
sqlPublisher, _ := watersql.NewPublisher(db, watersql.PublisherConfig{
    SchemaAdapter: watersql.DefaultPostgreSQLSchema{},
}, logger)

forwarderPublisher, _ := forwarder.NewPublisher(sqlPublisher, forwarder.PublisherConfig{
    ForwarderTopic: "outbox_topic", // intermediate topic in the database
})

// In handler (same DB transaction):
func handler(msg *message.Message) ([]*message.Message, error) {
    tx, _ := sql.TxFromContext(msg.Context())
    tx.Exec("INSERT INTO orders ...") // data update
    
    // This publishes to the DB table, NOT directly to Kafka
    forwarderPublisher.Publish("orders.created", outputMsg)
    return nil, nil // transaction commits both
}

// 2. Background: Forwarder reads from DB, publishes to Kafka
sqlSubscriber, _ := watersql.NewSubscriber(db, watersql.SubscriberConfig{...}, logger)
kafkaPublisher, _ := kafka.NewPublisher(kafkaConfig, logger)

fwd, _ := forwarder.NewForwarder(sqlSubscriber, kafkaPublisher, logger, forwarder.Config{
    ForwarderTopic: "outbox_topic",
})
go fwd.Run(ctx)
```

The Forwarder uses an envelope pattern — it wraps the original message with destination topic metadata,
then unwraps and forwards to the correct topic.

---

## Fan-In

**Problem:** You have multiple source topics and want to merge them into a single topic.

```go
import "github.com/ThreeDotsLabs/watermill/components/fanin"

fi, err := fanin.NewFanIn(subscriber, publisher, logger, fanin.Config{
    SourceTopics: []string{
        "orders.region-us",
        "orders.region-eu",
        "orders.region-asia",
    },
    TargetTopic:  "orders.all",
    CloseTimeout: 10 * time.Second,
})

go fi.Run(ctx)
```

The FanIn creates a Router internally with passthrough handlers for each source topic. Messages are
forwarded unchanged to the target topic.

---

## Fan-Out

**Problem:** You want multiple independent consumers to process the same messages.

Fan-out is naturally supported by most PubSub implementations:
- **Kafka:** Each consumer group gets all messages independently
- **AMQP:** Use fanout exchange — each queue gets a copy
- **GoChannel:** Multiple subscribers to the same topic each get all messages
- **Google Cloud Pub/Sub:** Each subscription gets all messages

```go
// Kafka: different consumer groups = independent processing
sub1, _ := kafka.NewSubscriber(kafka.SubscriberConfig{
    ConsumerGroup: "analytics-service",
    // ...
}, logger)

sub2, _ := kafka.NewSubscriber(kafka.SubscriberConfig{
    ConsumerGroup: "notification-service",
    // ...
}, logger)

// Both sub1 and sub2 receive ALL messages from the topic
router.AddConsumerHandler("analytics", "orders", sub1, analyticsHandler)
router.AddConsumerHandler("notifications", "orders", sub2, notificationHandler)
```

---

## Delayed Messages

**Problem:** You want to process a message after a delay (scheduled retry, reminder, etc.).

```go
import "github.com/ThreeDotsLabs/watermill/components/delay"

// Option 1: Set delay on a specific message
msg := message.NewMessage(watermill.NewUUID(), payload)
delay.Message(msg, delay.For(30 * time.Minute))  // process after 30 minutes
delay.Message(msg, delay.Until(time.Date(...)))   // process at specific time

// Option 2: Set delay via context (works with CQRS)
ctx = delay.WithContext(ctx, delay.For(time.Hour))
commandBus.Send(ctx, &SendReminder{UserID: "123"})
```

**Important:** Delay only works with PubSub implementations that support it (primarily SQL-based).
Check your PubSub's documentation. For Kafka, implement delay externally (e.g., with a Requeuer and
a delay topic).

### Metadata keys

- `_watermill_delayed_until` — absolute time (RFC3339)
- `_watermill_delayed_for` — duration string

---

## Requeuer

**Problem:** Failed messages in a poison queue need to be retried after a delay.

```go
import "github.com/ThreeDotsLabs/watermill/components/requeuer"

req, err := requeuer.NewRequeuer(requeuer.Config{
    Subscriber:           subscriber,
    SubscribeTopic:       "dead_letters",         // read from poison queue
    Publisher:            publisher,
    GeneratePublishTopic: func(topic string, msg *message.Message) (string, error) {
        // Requeue to original topic (stored by PoisonQueue middleware)
        return msg.Metadata.Get("poisonqueue_topic"), nil
    },
    Delay: 5 * time.Minute, // wait before requeuing
}, logger)

go req.Run(ctx)
```

---

## Request-Reply

**Problem:** You need synchronous request-response semantics over async messaging.

```go
import "github.com/ThreeDotsLabs/watermill/components/requestreply"

// Requester side
backend, _ := requestreply.NewPubSubBackend(requestreply.PubSubBackendConfig{
    Publisher:          publisher,
    Subscriber:         subscriber,
    GeneratePublishTopic: func(params requestreply.PubSubBackendPublishParams) (string, error) {
        return "requests.get-user", nil
    },
    GenerateSubscribeTopic: func(params requestreply.PubSubBackendSubscribeParams) (string, error) {
        return "replies." + params.OperationID, nil
    },
})

// Send request and wait for reply
reply, err := requestreply.SendWithReply[UserResponse](ctx, backend, requestMsg,
    requestreply.WithTimeout(5 * time.Second),
)

// Responder side (in a handler)
func handleGetUser(msg *message.Message) ([]*message.Message, error) {
    user := lookupUser(msg)
    replyMsg := createReply(user)
    // Reply topic is in message metadata — requestreply handles routing
    return []*message.Message{replyMsg}, nil
}
```

The component uses an operation ID to correlate requests with replies. The requester subscribes to a
reply topic specific to each operation.

---

## Metrics & Observability

```go
import "github.com/ThreeDotsLabs/watermill/components/metrics"

// Prometheus metrics
registry := prometheus.NewRegistry()
metricsBuilder := metrics.NewPrometheusMetricsBuilder(registry, "", "")

// Decorate router (adds handler execution metrics)
metricsBuilder.AddPrometheusRouterMetrics(router)

// Decorate individual publishers/subscribers
decoratedPub := metricsBuilder.DecoratePublisher(publisher)
decoratedSub := metricsBuilder.DecorateSubscriber(subscriber)

// Expose metrics endpoint
http.Handle("/metrics", promhttp.HandlerFor(registry, promhttp.HandlerOpts{}))
```

**Metrics exposed:**
- `subscriber_messages_received_total` — messages received per topic
- `handler_execution_time_seconds` — handler processing duration
- `publish_time_seconds` — publish latency

---

## Saga / Process Manager

**Pattern:** Orchestrate a multi-step distributed transaction using commands and events.

```go
// Saga: BookTrip = BookFlight + BookHotel + BookCar
// If any step fails, compensating commands undo previous steps

type BookTripSaga struct {
    commandBus *cqrs.CommandBus
    eventBus   *cqrs.EventBus
}

// Step 1: Start by booking flight
func (s *BookTripSaga) HandleBookTrip(ctx context.Context, cmd *BookTrip) error {
    return s.commandBus.Send(ctx, &BookFlight{TripID: cmd.TripID})
}

// Step 2: Flight booked → book hotel
func (s *BookTripSaga) HandleFlightBooked(ctx context.Context, event *FlightBooked) error {
    return s.commandBus.Send(ctx, &BookHotel{TripID: event.TripID})
}

// Compensation: Hotel booking failed → cancel flight
func (s *BookTripSaga) HandleHotelBookingFailed(ctx context.Context, event *HotelBookingFailed) error {
    return s.commandBus.Send(ctx, &CancelFlight{TripID: event.TripID})
}
```

Use correlation IDs to track the saga across all messages:
```go
middleware.SetCorrelationID(tripID, msg)
```

---

## Event Sourcing

**Pattern:** Store events as the source of truth, rebuild state from event history.

```go
// Store events
func (h *OrderHandler) Handle(ctx context.Context, cmd *PlaceOrder) error {
    event := &OrderPlaced{
        OrderID:   cmd.OrderID,
        Items:     cmd.Items,
        Timestamp: time.Now(),
    }
    
    // Publish event (stored in SQL for audit trail, forwarded to Kafka for consumers)
    return h.eventBus.Publish(ctx, event)
}

// Rebuild read model from events
func handleOrderPlaced(ctx context.Context, event *OrderPlaced) error {
    return readModelDB.Exec(
        "INSERT INTO orders_view (id, items, status, created_at) VALUES ($1, $2, 'placed', $3)",
        event.OrderID, event.Items, event.Timestamp,
    )
}

func handleOrderShipped(ctx context.Context, event *OrderShipped) error {
    return readModelDB.Exec(
        "UPDATE orders_view SET status = 'shipped', shipped_at = $2 WHERE id = $1",
        event.OrderID, event.ShippedAt,
    )
}
```

---

## Graceful Shutdown

```go
func main() {
    router, _ := message.NewRouter(message.RouterConfig{
        CloseTimeout: 30 * time.Second,
    }, logger)

    // Setup handlers...

    ctx, cancel := context.WithCancel(context.Background())

    // Handle OS signals
    go func() {
        sigCh := make(chan os.Signal, 1)
        signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
        <-sigCh
        logger.Info("Shutting down...", nil)
        cancel() // triggers router shutdown
    }()

    if err := router.Run(ctx); err != nil {
        logger.Error("Router error", err, nil)
    }
}
```

In handlers, respect context cancellation for long-running operations:
```go
func handler(msg *message.Message) ([]*message.Message, error) {
    select {
    case <-msg.Context().Done():
        return nil, msg.Context().Err()
    default:
        // proceed with processing
    }
}
```

---

## Custom Publisher/Subscriber

Implement the interfaces to integrate any message broker:

```go
type MyPublisher struct {
    client *mybroker.Client
}

func (p *MyPublisher) Publish(topic string, msgs ...*message.Message) error {
    for _, msg := range msgs {
        brokerMsg := &mybroker.Message{
            ID:      msg.UUID,
            Body:    msg.Payload,
            Headers: make(map[string]string),
        }
        // Copy metadata to broker headers
        for k, v := range msg.Metadata {
            brokerMsg.Headers[k] = v
        }
        if err := p.client.Send(topic, brokerMsg); err != nil {
            return fmt.Errorf("publish to %s: %w", topic, err)
        }
    }
    return nil
}

func (p *MyPublisher) Close() error {
    return p.client.Close()
}

type MySubscriber struct {
    client *mybroker.Client
}

func (s *MySubscriber) Subscribe(ctx context.Context, topic string) (<-chan *message.Message, error) {
    out := make(chan *message.Message)
    
    go func() {
        defer close(out)
        for {
            select {
            case <-ctx.Done():
                return
            default:
                brokerMsg, err := s.client.Receive(topic)
                if err != nil {
                    continue
                }
                
                msg := message.NewMessage(brokerMsg.ID, brokerMsg.Body)
                for k, v := range brokerMsg.Headers {
                    msg.Metadata.Set(k, v)
                }
                
                out <- msg
                
                // Wait for ack/nack
                select {
                case <-msg.Acked():
                    s.client.Ack(brokerMsg)
                case <-msg.Nacked():
                    s.client.Nack(brokerMsg)
                case <-ctx.Done():
                    return
                }
            }
        }
    }()
    
    return out, nil
}

func (s *MySubscriber) Close() error {
    return s.client.Close()
}
```

**Key implementation requirements:**
- Publisher must be safe for concurrent use
- Subscriber must close the output channel when context is canceled
- Subscriber must wait for Ack/Nack before delivering the next message (for at-least-once)
- Close() must be idempotent and safe to call multiple times
