# Choreography Pattern

> "In choreography, each service knows what to do and when to do it. There is no conductor telling them — they react to what they observe happening around them." — Gregor Hohpe, Enterprise Integration Patterns

## The Problem

You have an order processing workflow: receive order, validate payment, reserve inventory, notify warehouse, send confirmation email. The simple approach is an orchestrator service that calls each step in sequence. This works. But over time you notice the orchestrator has become a liability. Every time you add a new step — say, notifying a loyalty points service — you must modify the orchestrator. Every service in the workflow now has a compile-time or configuration-time dependency on the orchestrator. The orchestrator becomes the integration point for every concern that touches order processing: tax calculation, fraud detection, A/B experiment tracking, audit logging. What started as a simple workflow coordinator has become a distributed monolith's nerve center.

The orchestrator approach couples all participants through a central coordinator. Change the orchestrator, and you risk breaking every service it coordinates. Deploy a new consumer of order events, and you must update the orchestrator to call it. The orchestrator knows about every participant; every participant is known to the orchestrator. This creates organizational coupling: the team that owns the orchestrator becomes a bottleneck for every team that wants to participate in order processing.

Choreography inverts this relationship. Instead of an orchestrator that calls participants, participants react to events. The order service publishes "OrderPlaced." The payment service, which subscribes to "OrderPlaced," processes payment and publishes "PaymentProcessed." The inventory service, which subscribes to "PaymentProcessed," reserves stock and publishes "InventoryReserved." Each participant knows its own responsibility and the events that trigger it. No central coordinator. No single point of change.

## Core Concept

In choreography, services coordinate through events without a central coordinator. Each service:
1. Subscribes to events it cares about
2. Reacts by performing its work
3. Publishes events describing what it did
4. Has no knowledge of what other services do with those events

```
ORCHESTRATION (centralized control):
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                          │
│                                                         │
│  1. call PaymentService                                 │
│  2. call InventoryService                               │
│  3. call WarehouseService                               │
│  4. call NotificationService                            │
└─────┬──────────────┬──────────────┬──────────────┬──────┘
      │              │              │              │
┌─────▼───┐    ┌─────▼───┐   ┌─────▼──┐   ┌──────▼──┐
│Payment  │    │Inventory│   │Warehouse│   │Notif.   │
│Service  │    │Service  │   │Service  │   │Service  │
└─────────┘    └─────────┘   └─────────┘   └─────────┘

CHOREOGRAPHY (distributed coordination):
                    ┌───────────────────┐
                    │   Event Bus       │
                    │ (Kafka/SNS/etc.)  │
                    └──┬────────────────┘
                       │ OrderPlaced
          ┌────────────┴──────────────────────────┐
          │                                       │
    ┌─────▼────┐                           ┌──────▼────┐
    │ Payment  │──PaymentProcessed──────────▶ Inventory │
    │ Service  │                           │ Service   │
    └──────────┘                           └──────┬────┘
                                                  │ InventoryReserved
                                           ┌──────▼────┐
                                           │ Warehouse │──PickingOrderCreated──▶ ...
                                           │ Service   │
                                           └───────────┘
```

The choreography creates a chain of cause and effect: each event causes the next action, which causes the next event. The workflow emerges from the interactions of the participants, not from a central script.

### Pub/Sub as the coordination mechanism

The event bus is the infrastructure that makes choreography possible. Each service publishes to topics and subscribes to topics. The bus decouples producers from consumers — the payment service doesn't know who subscribes to "PaymentProcessed," and new subscribers can be added without changing the payment service.

Common event bus choices:
- **Apache Kafka**: High throughput, durable, replay-capable, ordered within partition
- **AWS SNS + SQS**: Managed, fan-out via SNS, durable queuing via SQS
- **Google Pub/Sub**: Managed, at-least-once, global
- **Azure Service Bus**: Managed, supports topics and queues, dead-letter queues
- **RabbitMQ**: AMQP-based, flexible routing, lower latency than Kafka for simple use cases

## Deep Dive

The choreography vs orchestration distinction is one of the most consequential architectural choices in event-driven system design, and it is frequently made by default rather than deliberately. Understanding what each approach optimizes and what it costs requires examining the trade-offs that both practitioners and researchers have documented explicitly.

**Gregor Hohpe and Bobby Woolf's *Enterprise Integration Patterns*** establishes the vocabulary. An orchestration is a *process manager* — a component that knows the workflow, maintains its state, and explicitly directs each participant. A choreography relies only on *event notification* — each participant knows only its own responsibility and what events trigger it. The workflow "emerges" from the interactions of the participants rather than being scripted. Hohpe's observation is that orchestration is easier to reason about because the workflow is in one place, but it creates tight coupling between the orchestrator and all participants. Choreography is looser coupled but harder to observe — the workflow is a property of the system's behavior, not an artifact you can read.

**Sam Newman's analysis of choreography in *Building Microservices*** adds the team ownership dimension. In a choreographed system, adding a new participant (a loyalty points service that wants to react to orders) requires no coordination with existing services — just subscribe to the `order.placed` event. The order service team does not need to know the loyalty service exists. In an orchestrated system, the orchestrator owner must be informed of every new participant and must modify the orchestrator to call the new service. For organizations where different teams own different services, choreography removes an entire category of cross-team coordination.

**The idempotency requirement** in choreographed systems is absolute, and the reasoning is precise. Message brokers — Kafka, SQS, Pub/Sub — guarantee *at-least-once* delivery, not exactly-once. A consumer will process the same message more than once with non-zero probability, even in well-functioning systems. The reason is fundamental: to guarantee exactly-once delivery, the broker and the consumer must agree atomically on whether a message was processed. This requires a distributed transaction between the broker and the consumer's storage, which is either expensive or unavailable. At-least-once delivery is the correct engineering choice given these constraints, and idempotent consumers are the application-level response to it.

**The observability challenge** of choreography is documented in Hohpe's later writing on event-driven architectures. In an orchestrated system, the workflow state is centralized in the orchestrator — you can query it directly. In a choreographed system, the state of a business transaction is distributed across all participants. To answer "what is the status of order 12345?" you must correlate events from the order service, payment service, inventory service, and warehouse service — all of which have independent event logs. The correlation ID pattern (every event in a business transaction carries the same correlation ID) makes this correlation possible, but it requires the observability infrastructure (distributed tracing, event stream correlation) to be built from the start. Teams that adopt choreography without building this infrastructure find themselves unable to diagnose production incidents because they have no way to reconstruct the state of an individual business transaction.

**The event cycle problem** is less commonly discussed but critically important. In a choreographed system, if Service A subscribes to events from Service B and Service B subscribes to events from Service A, you have a potential infinite loop. Service A processes event E1 from B and publishes E2. Service B processes E2 from A and publishes E1. The cycle fires indefinitely, consuming resources and potentially causing downstream data corruption. There is no compiler warning for this. Auditing event subscriptions for cycles must be a deliberate practice in any team that adopts choreography.

## Implementation Guide

### Step 1: Define your event vocabulary

Events should be named in the past tense (something happened):

```typescript
// Well-named events
interface OrderPlaced {
  type: 'order.placed';
  orderId: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: Money;
  placedAt: string; // ISO 8601
}

interface PaymentProcessed {
  type: 'payment.processed';
  orderId: string;
  paymentId: string;
  amount: Money;
  processedAt: string;
}

interface PaymentFailed {
  type: 'payment.failed';
  orderId: string;
  reason: string;
  failedAt: string;
}

// Event envelope
interface DomainEvent<T> {
  eventId: string;       // globally unique event ID
  eventType: string;     // 'order.placed', etc.
  aggregateId: string;   // the entity this event describes
  sequenceNumber: number; // for ordering within aggregate
  occurredAt: string;
  payload: T;
}
```

### Step 2: Implement producers (thin — just publish)

```typescript
class OrderService {
  constructor(
    private readonly db: Database,
    private readonly eventBus: EventBus,
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<string> {
    // Domain logic
    const order = Order.create(command);
    
    // Persist
    await this.db.save(order);
    
    // Publish event — don't call downstream services
    await this.eventBus.publish({
      eventId: crypto.randomUUID(),
      eventType: 'order.placed',
      aggregateId: order.id,
      sequenceNumber: order.version,
      occurredAt: new Date().toISOString(),
      payload: {
        orderId: order.id,
        customerId: order.customerId,
        items: order.items,
        totalAmount: order.total,
        placedAt: order.placedAt.toISOString(),
      },
    });
    
    return order.id;
  }
}
```

### Step 3: Implement consumers (subscribe and react)

```typescript
class PaymentService {
  constructor(
    private readonly eventBus: EventBus,
    private readonly paymentGateway: PaymentGateway,
  ) {
    // Subscribe to events this service cares about
    this.eventBus.subscribe('order.placed', this.handleOrderPlaced.bind(this));
  }

  private async handleOrderPlaced(event: DomainEvent<OrderPlaced>): Promise<void> {
    const { orderId, customerId, totalAmount } = event.payload;
    
    try {
      const payment = await this.paymentGateway.charge({
        customerId,
        amount: totalAmount,
        reference: orderId,
      });
      
      // Publish success event
      await this.eventBus.publish({
        eventId: crypto.randomUUID(),
        eventType: 'payment.processed',
        aggregateId: orderId,
        sequenceNumber: 1,
        occurredAt: new Date().toISOString(),
        payload: { orderId, paymentId: payment.id, amount: totalAmount },
      });
    } catch (error) {
      // Publish failure event — don't silently fail
      await this.eventBus.publish({
        eventId: crypto.randomUUID(),
        eventType: 'payment.failed',
        aggregateId: orderId,
        sequenceNumber: 1,
        occurredAt: new Date().toISOString(),
        payload: { orderId, reason: error.message },
      });
    }
  }
}
```

### Step 4: Ensure idempotency in all consumers

Events may be delivered more than once (at-least-once delivery). Consumers must handle duplicates:

```typescript
class InventoryService {
  private async handlePaymentProcessed(event: DomainEvent<PaymentProcessed>): Promise<void> {
    const { orderId } = event.payload;
    
    // Idempotency check: has this event already been processed?
    const alreadyProcessed = await this.db.query(
      'SELECT 1 FROM processed_events WHERE event_id = $1',
      [event.eventId],
    );
    
    if (alreadyProcessed.rows.length > 0) {
      return; // Already processed this exact event — safe to ignore
    }
    
    // Process the event
    await this.db.transaction(async (tx) => {
      await this.reserveInventory(tx, orderId);
      
      // Record that we've processed this event (within the same transaction)
      await tx.query(
        'INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW())',
        [event.eventId],
      );
    });
    
    // Publish next event
    await this.eventBus.publish({ /* ... */ });
  }
}
```

### Step 5: Handle dead-letter queues

Events that fail processing repeatedly go to a dead-letter queue (DLQ):

```typescript
// SQS consumer with DLQ
const consumer = new SQSConsumer({
  queueUrl: process.env.PAYMENT_EVENTS_QUEUE_URL,
  handler: async (message) => {
    const event = JSON.parse(message.Body);
    await paymentService.handleOrderPlaced(event);
  },
  // SQS moves to DLQ after maxReceiveCount failures
  // Configure on the queue: redrive policy with maxReceiveCount: 3
});

// DLQ processor (run separately, with human alert)
const dlqConsumer = new SQSConsumer({
  queueUrl: process.env.PAYMENT_EVENTS_DLQ_URL,
  handler: async (message) => {
    // Alert on-call, log for investigation
    await alerting.sendAlert({
      severity: 'HIGH',
      title: 'Payment event in DLQ',
      body: message.Body,
    });
  },
});
```

### Step 6: Add correlation IDs for tracing

Without an orchestrator to trace through, distributed tracing requires explicit correlation:

```typescript
// Every event carries the original correlation ID
interface DomainEvent<T> {
  eventId: string;
  correlationId: string; // same for all events in one business transaction
  causationId: string;   // the event that caused this event
  // ...
}

// When publishing a caused event:
await this.eventBus.publish({
  eventId: crypto.randomUUID(),
  correlationId: triggeringEvent.correlationId, // propagate
  causationId: triggeringEvent.eventId,          // point to cause
  // ...
});
```

## When to Use

**Loosely coupled services that evolve independently.** When teams should be able to add new capabilities (new event consumers) without coordinating with existing teams, choreography enables this. The payment service doesn't need to be updated when you add a loyalty points service.

**Simple, linear workflows without complex branching.** Choreography works beautifully for: A happens → B reacts → C reacts → D reacts. Linear chains of cause and effect are easy to implement and reason about with choreography.

**When adding new consumers should be a single-team operation.** If adding a new step to a workflow requires modifying a central orchestrator owned by another team, choreography eliminates that coupling.

**High-throughput event processing.** Kafka-based choreography scales to millions of events per second. There is no orchestrator to become a bottleneck.

**Audit trail as a natural artifact.** The event log is a complete record of everything that happened and in what order. Choreography produces this naturally.

## When NOT to Use

**Complex workflows with many branches and compensations.** When you need "if payment fails, cancel the order, restock inventory, notify the customer, and trigger fraud review" — tracking this multi-step compensation across a choreographed system is very difficult. Orchestration (or the Saga pattern with a saga orchestrator) is better.

**When you need to know the current state of a business transaction.** "What is the status of order 12345 right now?" In choreography, the answer requires correlating events across multiple services. An orchestrator maintains explicit state. Choreography requires building a separate query model.

**When cyclic dependencies are likely.** If Service A publishes events that Service B consumes, and Service B publishes events that Service A consumes, you have a cycle. Cycles in choreography are extremely hard to debug and can cause infinite event loops.

**When teams are not disciplined about event schema evolution.** Choreography depends on services agreeing on event schemas. Without careful schema governance, breaking schema changes in one service silently break all consumers.

**Small, simple workflows.** A three-step workflow with a simple happy path is much easier to understand as an explicit orchestration. Choreography adds asynchronous complexity that isn't justified for simple cases.

## Common Mistakes

**Mistake 1: Creating cyclic event dependencies.** Service A listens to events from Service B; Service B listens to events from Service A. Cycles are invisible at design time and catastrophic at runtime. Audit your event subscriptions for cycles before deployment.

**Mistake 2: Not handling consumer failures.** If a consumer fails processing an event and there's no retry + DLQ, the event is silently lost. Every consumer needs retry logic, DLQ configuration, and alerting on DLQ depth.

**Mistake 3: Using choreography without idempotency.** At-least-once delivery means your consumer will process the same event multiple times eventually. Non-idempotent consumers charge customers twice, reserve inventory twice, send duplicate emails. Every consumer must be idempotent.

**Mistake 4: Losing visibility into workflow state.** With choreography, there's no single place to ask "what is the status of order 12345?" You need to build a read model (projection) that consumes all events and maintains current state. Don't deploy choreography without this read model.

**Mistake 5: Mixing orchestration and choreography randomly.** Some workflows are orchestrated; some are choreographed; and it's unclear why. Define a clear principle for when to use each, and apply it consistently. Mixed architectures without clear principles create confusion about who is responsible for what.

## Connections

**Competing Consumers** (Volume 03, article 09): Choreography consumers typically run as competing consumers — multiple instances processing from the same queue for horizontal scaling.

**Event Sourcing** (Volume 03, article 13): Event Sourcing and Choreography are natural companions. Events from Event Sourcing are the events that drive choreography.

**Compensating Transaction** (Volume 03, article 10): When a choreographed workflow fails partway through, compensating transactions undo the completed steps. This is the Saga pattern's choreography variant.

**Claim Check Pattern** (Volume 03, article 08): When choreography events carry large payloads, the Claim Check pattern stores the payload separately and passes a reference in the event.

**CQRS** (Volume 03, article 11): Choreography produces events that update read models. The read side of CQRS consumes domain events to maintain query-optimized views.

## Key Insights

1. **Choreography decouples teams, not just services.** The architectural benefit is organizational: teams can add new event consumers without coordinating with event producers. This is the primary reason to choose choreography over orchestration.

2. **Traceability is the hardest part.** Without an orchestrator, understanding "what happened to order 12345?" requires correlating events across services. Invest in correlation IDs, distributed tracing, and read models from the start.

3. **Choreography and orchestration are not mutually exclusive.** Many systems use orchestration for complex, branching workflows (sagas) and choreography for simple cause-and-effect chains. Choose per workflow, not per system.

4. **Idempotency is non-negotiable.** At-least-once delivery is the default in every message system. Design every consumer to be idempotent before anything else.

5. **Cyclic dependencies are a design smell.** If you find two services listening to each other's events, something is wrong with your service boundaries. Fix the boundaries rather than managing the cycle.

6. **Dead-letter queues are not optional.** Events in the DLQ represent failed business operations. Alert on DLQ depth, investigate quickly, and have a reprocessing strategy ready.

7. **The event log is a first-class artifact.** The sequence of events in Kafka or Pub/Sub is the true system state. Treat it as such: monitor it, back it up, and design for event replay from the beginning.
