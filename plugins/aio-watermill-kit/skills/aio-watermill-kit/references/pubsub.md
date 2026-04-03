# Watermill PubSub Implementations Reference

Guide for choosing, configuring, and using PubSub implementations with Watermill.

## Table of Contents

1. [GoChannel (In-Memory)](#gochannel-in-memory)
2. [Kafka](#kafka)
3. [AMQP / RabbitMQ](#amqp--rabbitmq)
4. [Redis Streams](#redis-streams)
5. [NATS JetStream](#nats-jetstream)
6. [SQL (PostgreSQL / MySQL)](#sql-postgresql--mysql)
7. [Google Cloud Pub/Sub](#google-cloud-pubsub)
8. [HTTP Subscriber](#http-subscriber)
9. [Decision Matrix](#decision-matrix)
10. [Performance Benchmarks](#performance-benchmarks)

---

## GoChannel (In-Memory)

**Package:** `github.com/ThreeDotsLabs/watermill/pubsub/gochannel`

The only PubSub built into the core library. For testing and intra-process messaging only.

```go
pubSub := gochannel.NewGoChannel(gochannel.Config{
    OutputChannelBuffer:            0,     // 0 = unbuffered (synchronous delivery)
    Persistent:                     false, // true = retain messages for late subscribers
    BlockPublishUntilSubscriberAck: false, // true = Publish blocks until all subs Ack
    PreserveContext:                false, // true = propagate Go context through messages
}, logger)
```

**When to use:** Tests, prototyping, in-process event bus.
**Never use for:** Production (no persistence, no distribution, single-process only).

**Behavior notes:**
- Without `Persistent`, messages are lost if no subscriber is listening
- `BlockPublishUntilSubscriberAck` makes Publish synchronous — useful for testing but blocks the publisher
- Each subscriber gets its own goroutine per message delivery

---

## Kafka

**Package:** `github.com/ThreeDotsLabs/watermill-kafka/v3`

High-throughput, distributed, partitioned messaging. The most common production choice for Watermill.

```go
import "github.com/ThreeDotsLabs/watermill-kafka/v3/pkg/kafka"

publisher, err := kafka.NewPublisher(kafka.PublisherConfig{
    Brokers:   []string{"localhost:9092"},
    Marshaler: kafka.DefaultMarshaler{},
}, logger)

subscriber, err := kafka.NewSubscriber(kafka.SubscriberConfig{
    Brokers:               []string{"localhost:9092"},
    Unmarshaler:           kafka.DefaultMarshaler{},
    ConsumerGroup:         "my-service",
    NackResendSleep:       time.Second,        // delay before redelivery on Nack
    ReconnectRetrySleep:   time.Second,        // delay between reconnect attempts
    InitializeTopicDetails: &sarama.TopicDetail{
        NumPartitions:     8,
        ReplicationFactor: 3,
    },
}, logger)
```

**Key behaviors:**
- Ordering guaranteed per partition (use `Metadata.Set("kafka_partition_key", key)` for entity-level ordering)
- Consumer groups enable horizontal scaling — each partition assigned to one consumer in the group
- At-least-once delivery — idempotent handlers required
- Topic auto-creation via `InitializeTopicDetails` (or pre-create topics)

**Partition key pattern:**
```go
msg := message.NewMessage(watermill.NewUUID(), payload)
msg.Metadata.Set("kafka_partition_key", shopID) // all messages for same shop go to same partition
```

---

## AMQP / RabbitMQ

**Package:** `github.com/ThreeDotsLabs/watermill-amqp/v3`

Flexible routing with exchanges, queues, and bindings. Good for complex routing topologies.

```go
import "github.com/ThreeDotsLabs/watermill-amqp/v3/pkg/amqp"

// Default durable queue config
amqpConfig := amqp.NewDurableQueueConfig("amqp://guest:guest@localhost:5672/")

publisher, err := amqp.NewPublisher(amqpConfig, logger)
subscriber, err := amqp.NewSubscriber(amqpConfig, logger)
```

**Pre-built configurations:**
- `NewDurableQueueConfig()` — persistent queues, survives broker restart
- `NewDurablePubSubConfig()` — fanout exchange, each subscriber gets own queue
- `NewNonDurableQueueConfig()` — ephemeral queues, auto-delete

**Key behaviors:**
- Durable queues persist messages to disk
- Fanout exchanges enable true pub/sub (multiple consumers per message)
- No ordering guarantees across consumers
- Prefetch count controls concurrency

---

## Redis Streams

**Package:** `github.com/ThreeDotsLabs/watermill-redisstream`

Simple setup with Redis, good for medium-scale applications already using Redis.

```go
import "github.com/ThreeDotsLabs/watermill-redisstream/pkg/redisstream"

client := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

publisher, err := redisstream.NewPublisher(redisstream.PublisherConfig{
    Client: client,
}, logger)

subscriber, err := redisstream.NewSubscriber(redisstream.SubscriberConfig{
    Client:        client,
    ConsumerGroup: "my-service",
}, logger)
```

**Key behaviors:**
- Ordered within a stream
- Consumer groups for horizontal scaling
- Built-in message acknowledgement
- Lower operational overhead than Kafka (just Redis)

---

## NATS JetStream

**Package:** `github.com/ThreeDotsLabs/watermill-nats/v2`

Cloud-native messaging with low latency and strong ordering guarantees.

```go
import "github.com/ThreeDotsLabs/watermill-nats/v2/pkg/nats"

publisher, err := nats.NewPublisher(nats.PublisherConfig{
    URL:         "nats://localhost:4222",
    Marshaler:   &nats.GobMarshaler{},
    JetStream: nats.JetStreamConfig{
        AutoProvision: true,
    },
}, logger)

subscriber, err := nats.NewSubscriber(nats.SubscriberConfig{
    URL:          "nats://localhost:4222",
    Unmarshaler:  &nats.GobMarshaler{},
    QueueGroupPrefix: "my-service",
    JetStream: nats.JetStreamConfig{
        AutoProvision: true,
        DurablePrefix: "my-service",
    },
}, logger)
```

**Key behaviors:**
- JetStream provides persistence and exactly-once delivery semantics
- Subject-based addressing with wildcards
- Queue groups for load balancing
- Low latency (~ms)

---

## SQL (PostgreSQL / MySQL)

**Package:** `github.com/ThreeDotsLabs/watermill-sql/v4`

Uses database tables as message queues. The only option for exactly-once processing.

```go
import "github.com/ThreeDotsLabs/watermill-sql/v4/pkg/sql"

publisher, err := sql.NewPublisher(db, sql.PublisherConfig{
    SchemaAdapter:        sql.DefaultPostgreSQLSchema{},
    AutoInitializeSchema: true,
}, logger)

subscriber, err := sql.NewSubscriber(db, sql.SubscriberConfig{
    SchemaAdapter:    sql.DefaultPostgreSQLSchema{},
    OffsetsAdapter:   sql.DefaultPostgreSQLOffsetsAdapter{},
    InitializeSchema: true,
}, logger)
```

**Exactly-once pattern (same transaction for processing + publishing):**
```go
func handler(msg *message.Message) ([]*message.Message, error) {
    tx, ok := sql.TxFromContext(msg.Context())
    if !ok {
        return nil, errors.New("no transaction in context")
    }

    // Use the same transaction for data update AND event publishing
    _, err := tx.Exec("UPDATE orders SET status = 'processed' WHERE id = $1", orderID)
    if err != nil {
        return nil, err // transaction rolls back, message Nacked
    }

    // This message will be published in the same transaction
    return []*message.Message{outputMsg}, nil
}
```

**Key behaviors:**
- Atomicity: process + publish in one DB transaction
- Ordering guaranteed
- Lower throughput than dedicated message brokers
- Great for the Outbox pattern (publish to DB, forward to broker)

**Schema adapters:**
- `DefaultPostgreSQLSchema{}` — PostgreSQL
- `DefaultMySQLSchema{}` — MySQL

---

## Google Cloud Pub/Sub

**Package:** `github.com/ThreeDotsLabs/watermill-googlecloud`

Fully managed, auto-scaling messaging on GCP.

```go
import "github.com/ThreeDotsLabs/watermill-googlecloud/pkg/googlecloud"

publisher, err := googlecloud.NewPublisher(googlecloud.PublisherConfig{
    ProjectID: "my-project",
}, logger)

subscriber, err := googlecloud.NewSubscriber(googlecloud.SubscriberConfig{
    ProjectID:      "my-project",
    GenerateSubscriptionName: func(topic string) string {
        return "my-service_" + topic
    },
}, logger)
```

**Key behaviors:**
- Auto-scaling, no broker management
- At-least-once delivery
- No ordering guarantees by default (can enable ordering keys)
- Subscription-based model (each subscription gets all messages)

---

## HTTP Subscriber

**Package:** `github.com/ThreeDotsLabs/watermill-http/v2`

Receives HTTP requests (webhooks) and converts them to Watermill messages.

```go
import "github.com/ThreeDotsLabs/watermill-http/v2/pkg/http"

subscriber, err := http.NewSubscriber(":8080", http.SubscriberConfig{
    UnmarshalMessageFunc: http.DefaultUnmarshalMessageFunc,
}, logger)

// Each topic maps to an HTTP endpoint path
router.AddConsumerHandler("webhook", "/webhooks/orders", subscriber, handleWebhook)
```

Useful for ingesting webhooks into your event-driven pipeline.

---

## Decision Matrix

| Requirement | Recommended PubSub |
|------------|-------------------|
| Testing / prototyping | GoChannel |
| High throughput + ordering | Kafka (partition by entity key) |
| Exactly-once processing | SQL (same DB transaction) |
| Complex routing patterns | AMQP/RabbitMQ (exchanges + bindings) |
| Simple setup, already using Redis | Redis Streams |
| Cloud-native, low latency | NATS JetStream |
| Managed service on GCP | Google Cloud Pub/Sub |
| Webhook ingestion | HTTP Subscriber |
| Transactional outbox pattern | SQL publisher → Forwarder → Kafka/AMQP |

---

## Performance Benchmarks

Approximate throughput for 16-byte payloads on standard hardware:

| PubSub | Publish (msg/s) | Subscribe (msg/s) |
|--------|---------------:|------------------:|
| GoChannel | 315,776 | 138,743 |
| Redis Streams | 59,158 | 12,134 |
| NATS JetStream (16 subs) | 50,668 | 34,713 |
| Kafka | 41,492 | 101,669 |
| SQL MySQL (batch 100) | 6,371 | 2,794 |
| Google Cloud Pub/Sub | 3,027 | 28,589 |
| SQL PostgreSQL (batch 1) | 2,831 | 9,460 |
| AMQP (RabbitMQ) | 2,770 | 14,604 |

**Notes:**
- Real-world throughput depends on payload size, network, hardware, and configuration
- Kafka subscribe throughput scales linearly with partitions
- SQL throughput improves significantly with batching
- GoChannel numbers are synthetic (no I/O, single process)
