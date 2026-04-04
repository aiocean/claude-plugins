# Publisher-Subscriber Pattern

> "The producer of information should know nothing about its consumers. The consumer of information should know nothing about its producers. Everything else is coupling."

## The Problem

Your e-commerce system has an OrderService. When an order is placed, a lot of things need to happen: the inventory must be reserved, a confirmation email must be sent, the analytics system must record the event, the loyalty points must be calculated, the fraud detection system must check the transaction, and the warehouse management system must create a pick list. 

In a tightly coupled design, OrderService calls each of these systems directly: `inventoryService.reserve(order)`, `emailService.sendConfirmation(order)`, `analyticsService.record(order)`, and so on. This works. Until InventoryService is down, causing OrderService to fail. Or until the analytics team wants to start recording additional data and must coordinate a deployment with the order team. Or until a new WarehouseSystem team joins and needs OrderService to call their API — requiring yet another change to OrderService code.

The OrderService now has six dependencies. Every time a new consumer of order data emerges, OrderService must be modified. Every consumer's availability affects order placement. The system is tightly coupled in both the deployment and runtime dimensions. Deployments of any consumer must coordinate with the order team. An outage in any consumer cascades to the order placement flow.

Publisher-Subscriber decouples this. OrderService publishes an `OrderPlaced` event to a message bus and forgets about it. Any service that cares about orders subscribes to that event and processes it independently. OrderService has zero knowledge of its consumers. New consumers can be added by subscribing without any change to OrderService. Consumer failures are isolated — they don't affect order placement. Teams deploy independently.

## Core Concept

Pub/Sub introduces a message bus (broker) between producers and consumers. Producers publish messages to named topics. Consumers subscribe to topics. The broker delivers messages from publishers to all active subscribers.

```
TIGHT COUPLING (before):

OrderService ──> InventoryService
            ──> EmailService
            ──> AnalyticsService
            ──> LoyaltyService
            ──> FraudService
            ──> WarehouseService

6 dependencies. Every new consumer = code change in OrderService.
Any consumer failure can cascade.


PUBLISHER-SUBSCRIBER (after):

OrderService ──publish──> [orders.placed topic]
                                    │
                    ┌───────────────┼───────────────────┐
                    │               │                   │
                    v               v                   v
            InventoryService  EmailService      AnalyticsService
            (subscriber)      (subscriber)      (subscriber)
                    
                    │               │
                    v               v
            LoyaltyService    FraudService
            (subscriber)      (subscriber)

OrderService has ZERO knowledge of consumers.
New consumer = new subscription, zero changes to publisher.
Consumer failures are isolated.
```

### Topic-Based Routing

Pub/Sub systems use topics as the routing mechanism. Publishers write to topics; consumers subscribe to topics. Topics partition the event stream by domain or event type:

```
Topic naming patterns:

Domain-based:          orders, payments, inventory, users
Event-based:           order.placed, order.shipped, order.cancelled
Hierarchical:          orders/placed, orders/shipped, orders/cancelled
Entity-based:          entity.order.placed, entity.order.shipped

Recommendation: Use event-based naming with a domain prefix.
  <domain>.<entity>.<verb>
  Examples: order.created, payment.authorized, inventory.reserved
```

### Fan-Out

Fan-out is when a single published message is delivered to multiple subscribers. This is the core value of pub/sub: one event triggers N independent reactions.

```
SNS Topic: order.placed
  │
  ├──> SQS Queue: inventory-reservation-queue (InventoryService reads this)
  ├──> SQS Queue: email-notification-queue    (EmailService reads this)
  ├──> SQS Queue: analytics-ingestion-queue  (AnalyticsService reads this)
  └──> Lambda: fraud-check-function           (real-time, synchronous evaluation)
```

Fan-out enables additive behavior: new consumers subscribe without modifying the publisher. The publisher's blast radius is always one — it publishes one event. Downstream impact scales independently.

## Deep Dive

**The pattern's origin: decoupling producers from consumers.** Gregor Hohpe and Bobby Woolf's *Enterprise Integration Patterns* defines the Publish-Subscribe Channel as a fundamental messaging primitive: a sender broadcasts a message to a channel, and all receivers who have subscribed to the channel receive a copy. The critical distinction from the Message Channel (point-to-point) pattern is fan-out: in point-to-point, exactly one receiver gets the message; in pub/sub, all subscribers get it. Hohpe and Woolf's analysis of when each is appropriate: use point-to-point when the message represents work to be done by one processor (competing consumers for load distribution); use pub/sub when the message represents a fact that multiple interested parties need to know about (event notification for reactive downstream processing). The pattern's fundamental value is decoupling: the publisher does not know who is subscribed, how many subscribers exist, or what they do with the message. Adding a new subscriber requires no publisher change.

**The durable subscription problem.** Hohpe and Woolf identify a critical distinction between transient and durable subscriptions. A transient subscriber receives only messages published while it is connected — messages published when the subscriber is offline are lost. A durable subscriber has a persistent subscription that accumulates messages while offline and delivers them when the subscriber reconnects. For event-driven systems where every event must be processed (not just events that arrive while the consumer is running), durable subscriptions are mandatory. Kleppmann's *Designing Data-Intensive Applications* formalizes this as the log-based message broker model: rather than routing messages to registered subscribers, a log-based broker (such as Apache Kafka) retains all messages for a configurable retention period, and consumers maintain their own position (offset) in the log. This provides durable subscription semantics without requiring subscribers to be registered in advance — new subscribers can read from the beginning of the log and receive all historical messages.

**At-least-once delivery and idempotency as a system property.** Kleppmann's treatment of delivery guarantees in *DDIA* is precise: exactly-once delivery requires distributed transactions or end-to-end idempotency, and distributed transactions across a message broker and a consumer's database are expensive. All practical high-throughput pub/sub systems provide at-least-once delivery, which requires consumers to be idempotent — processing the same message twice must produce the same result as processing it once. This is not a property of the message broker; it is a property of the consumer's processing logic. Kleppmann identifies the correct implementation pattern: the consumer uses an idempotency key (derived from the message ID) to check whether the message has already been processed before performing any state-mutating operations. The idempotency check and the state mutation must be atomic (within the same transaction) to prevent a race condition where two concurrent deliveries of the same message both pass the idempotency check.

**Topic design and the subscriber's coupling to message schema.** Sam Newman's *Building Microservices* identifies a coupling risk in pub/sub systems that is often overlooked: subscribers are coupled to the message schema published on a topic. When a publisher changes the schema of events it publishes — adding fields, renaming fields, changing types — all subscribers must handle the change simultaneously or risk processing failures. Newman's guidance on schema evolution for event-based integration: use a schema registry that enforces compatibility rules (backward compatibility: new schema can read old events; forward compatibility: old schema can read new events). This is the same schema evolution challenge that Kleppmann identifies for any serialization format, but it is amplified in pub/sub by the fan-out — a single schema change potentially breaks all subscribers simultaneously.

**The event notification versus event-carried state transfer distinction.** Hohpe and Woolf identify two fundamentally different uses of pub/sub that look identical at the transport level but have very different design implications. In event notification, the message signals that something happened but contains minimal data — subscribers must query the publisher for current state if they need it. In event-carried state transfer, the message contains enough data for subscribers to update their own state without querying back. Hohpe and Woolf's analysis: event notification creates request-response coupling between subscribers and the publisher at processing time (subscribers must call back to get data); event-carried state transfer creates schema coupling (subscribers depend on the message schema) but enables autonomous processing. Newman's *Building Microservices* recommends event-carried state transfer for inter-service communication in microservice architectures: subscribers that must query back to the publisher on every event are not truly decoupled, because the subscriber's processing is blocked by the publisher's availability.

**Schema Registry:** Azure Event Grid and Azure Schema Registry enforce schema contracts on events. Publishers register their event schema; consumers validate incoming events against the schema. This catches schema evolution breaking changes before they reach consumers:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "title": "OrderPlaced",
  "properties": {
    "orderId": { "type": "string" },
    "customerId": { "type": "string" },
    "amount": { "type": "number" },
    "items": { "type": "array" }
  },
  "required": ["orderId", "customerId", "amount", "items"]
}
```

## Implementation Guide

### Step 1: Define Your Event Schema

Events are contracts between producers and consumers. Design them carefully:

```typescript
// Bad event: too thin, consumers must call back for data
interface OrderPlacedEvent {
  orderId: string;
  timestamp: string;
}

// Good event: carries enough data for consumers to act without callbacks
interface OrderPlacedEvent {
  eventId: string;         // unique event ID for idempotency
  eventType: 'order.placed';
  eventVersion: '1.0';     // for schema evolution
  timestamp: string;
  correlationId: string;   // for distributed tracing
  data: {
    orderId: string;
    customerId: string;
    customerEmail: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
    totalAmount: number;
    currency: string;
    shippingAddress: Address;
    region: string;
  };
}
```

**The fat event vs thin event debate:** Fat events carry complete data so consumers don't need to call back. Thin events carry only identifiers, requiring consumers to fetch data. Fat events increase coupling on event schema; thin events increase runtime coupling (calls back to publisher). For most cases, carry enough data for consumers to act without calling back, but don't embed data that changes frequently and would make events stale.

### Step 2: Set Up SNS + SQS Fan-Out (AWS)

```typescript
// AWS CDK
const ordersTopic = new sns.Topic(this, 'OrdersTopic', {
  topicName: 'order-events',
});

// Each consumer gets its own SQS queue
const inventoryQueue = new sqs.Queue(this, 'InventoryQueue');
const emailQueue = new sqs.Queue(this, 'EmailQueue');
const analyticsQueue = new sqs.Queue(this, 'AnalyticsQueue');

// Subscribe each queue to the topic
ordersTopic.addSubscription(new subscriptions.SqsSubscription(inventoryQueue));
ordersTopic.addSubscription(new subscriptions.SqsSubscription(emailQueue));
ordersTopic.addSubscription(new subscriptions.SqsSubscription(analyticsQueue));
```

### Step 3: Implement Idempotent Consumers

At-least-once delivery means your consumers will occasionally receive duplicate messages. Every consumer must be idempotent:

```typescript
class InventoryReservationConsumer {
  async process(event: OrderPlacedEvent): Promise<void> {
    // Check idempotency before processing
    const alreadyProcessed = await this.idempotencyStore.exists(event.eventId);
    if (alreadyProcessed) {
      logger.info('Duplicate event, skipping', { eventId: event.eventId });
      return; // Acknowledge and skip
    }
    
    // Process the event
    await this.inventoryService.reserve(event.data.items);
    
    // Record that we processed this event
    await this.idempotencyStore.mark(event.eventId, ttl: 7 * 24 * 60 * 60);
  }
}
```

### Step 4: Schema Registry and Evolution

Register event schemas. When evolving a schema:
- **Backward-compatible change** (add optional field): safe, consumers ignore unknown fields
- **Forward-compatible change** (add required field): consumers on old schema break — requires versioned migration
- **Breaking change** (remove or rename field): publish to a new topic version (`order.placed.v2`), run v1 and v2 topics in parallel during migration, deprecate v1

### Step 5: Observability

Every message needs a correlation ID for distributed tracing:

```typescript
// Publisher
const event = {
  eventId: uuid(),
  correlationId: context.correlationId ?? uuid(), // propagate from upstream
  // ...
};

// Consumer
logger.info('Processing event', {
  eventId: event.eventId,
  correlationId: event.correlationId,  // same ID traces across all consumers
  consumer: 'InventoryService',
});
```

## When to Use / When NOT to Use

**Use when:**
- Multiple systems need to react to the same event
- Publishers and consumers should deploy and fail independently
- New consumers will be added over time without publisher changes
- Eventual consistency between producer and consumers is acceptable

**Do NOT use when:**
- The publisher needs to know the result of the consumer's processing (use synchronous request/reply)
- Strict ordering of events is required across all consumers (use Kafka with partitions)
- Exactly-once delivery is required (most pub/sub systems guarantee at-least-once; exactly-once requires careful design)
- The consumer needs data in real-time with < 100ms end-to-end latency (pub/sub adds broker latency)

## Common Mistakes

**Mistake 1: Thin events that require callbacks.** Publishing `{ orderId: "123" }` forces every consumer to call back to OrderService to get the data they need. You've decoupled the event publishing but re-coupled every consumer to the publisher at runtime. Fat events carry enough context.

**Mistake 2: Non-idempotent consumers.** Pub/sub systems guarantee at-least-once delivery. Every consumer will process duplicate messages eventually. Non-idempotent consumers (that don't check if they've already processed a message) will create duplicate emails, double-charge customers, or double-reserve inventory.

**Mistake 3: No dead-letter queue.** When a consumer fails to process a message after N retries, the message must go somewhere. Without a DLQ, it's either silently dropped (data loss) or it blocks the queue forever. Always configure DLQs and monitor DLQ depth.

**Mistake 4: Schema evolution breaking consumers.** Adding a required field to an event schema immediately breaks all consumers that haven't been updated. Use versioned schemas, register schemas in a schema registry, and test schema changes against all subscriber schemas before deploying.

**Mistake 5: Treating pub/sub as RPC.** Adding a request/reply pattern on top of pub/sub (publish a request, wait for a reply event) recreates synchronous coupling with asynchronous overhead. If you need a response, use synchronous HTTP/gRPC. Pub/sub is for fire-and-forget scenarios.

## Connections

**Queue-Based Load Leveling** (Article 20): Pub/sub and load leveling work together. Pub/sub decouples producers from consumers; load leveling (via queues as subscribers) buffers the decoupled messages. SNS fan-out to SQS combines both patterns.

**Event Sourcing**: Event sourcing stores every state change as an immutable event. These events are often published via pub/sub so projections and other consumers can react. The event store is the publisher; materialized views are the subscribers.

**Saga Pattern** (Article 22): Choreography-based sagas use pub/sub as the coordination mechanism. Each service publishes events indicating what it completed; other services subscribe and react, creating a chain of loosely coupled steps.

**Materialized View** (Article 17): Materialized view refresh is often triggered by pub/sub events. The view refresh consumer subscribes to domain events and updates the view incrementally.

**Retry Pattern** (Article 21): Pub/sub consumers fail. Retry logic (with exponential backoff) should be part of every consumer's message processing loop. The DLQ catches messages that exhaust retries.

## Key Insights

1. **Pub/sub trades synchronous coupling for schema coupling.** You remove the runtime dependency between publisher and consumer. But you introduce a new dependency: the event schema. Invest in schema governance and versioning from day one.

2. **At-least-once delivery is the reality; exactly-once is the myth.** Every pub/sub system (SNS, Pub/Sub, EventBridge, Kafka) delivers messages at least once. Build idempotent consumers. Do not build systems that assume exactly-once delivery.

3. **The topic is a contract, not an implementation detail.** Topics should be named after domain events, not technical implementations (`order.placed` not `order-service-event-queue`). The topic name is part of the public API.

4. **Fan-out is the superpower.** The ability to add a new subscriber without changing the publisher is what makes pub/sub architecturally powerful. Preserve this by keeping publishers ignorant of subscribers. Any design where the publisher must be told about a new subscriber has defeated the purpose.

5. **Message ordering requires explicit design.** Default pub/sub delivery is unordered. For scenarios where order matters (events for the same entity should be processed in order), use partitioning by entity ID (Kafka partition key, SNS FIFO with message group ID).

6. **Schema registry is not optional at scale.** Without a schema registry, event schema evolution is a game of telephone — teams don't know what events look like, breaking changes are discovered at runtime, and debugging requires reading consumer code. Confluent Schema Registry, AWS Glue Schema Registry, and Azure Schema Registry all solve this.

7. **Pub/sub is not a substitute for a database.** Messages in a pub/sub system are transient — they exist to be consumed, not stored. If you need a persistent record of all events (for audit, replay, or recovery), use event sourcing or Kafka's log retention. Using pub/sub as your event store means lost events if consumers are down longer than the message retention period.
