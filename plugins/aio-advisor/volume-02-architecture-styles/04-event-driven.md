# Event-Driven Architecture

> "Events are facts. They happened. You can't undo them. That's what makes them so powerful." — Greg Young

## The Problem

Traditional request-response architecture is synchronous by nature. Service A calls Service B and waits. If Service B is slow, Service A is slow. If Service B is down, Service A fails. If Service B needs to do something that takes ten seconds, Service A's caller waits ten seconds. The entire system's responsiveness is bounded by the slowest component in any given call chain.

This synchronous coupling also creates brittleness in organizational terms. When the Product team wants to add a new behavior every time an order is placed — say, awarding loyalty points — they have to modify the Order Service. The Order Service team has to review the change, merge it, test it, and coordinate deployment. The Order Service codebase grows with responsibilities that are not its own. Over time, the Order Service becomes a god service that every team depends on and nobody wants to touch.

Event-driven architecture (EDA) inverts this relationship. Instead of Service A calling Service B directly, Service A announces what happened: "An order was placed." Service B, Service C, and Service D each listen for this announcement and react independently, in their own time, in their own way. The Order Service does not know who is listening. It does not care. Its job is to process orders and announce events. The Loyalty Service, the Notification Service, and the Analytics Service each own their own reactions. Adding a new reaction requires no change to the Order Service at all.

## Core Concept

An event-driven architecture is a system where components communicate primarily by producing and consuming events. An event is an immutable record that something happened — a fact about the world at a point in time. Events flow through the system asynchronously, decoupling producers from consumers in both time and space.

The fundamental shift is from "call this service to make something happen" to "announce what happened and let others react."

```
         Synchronous (Request-Response)
         
         ┌────────────┐   HTTP call   ┌────────────┐
         │   Orders   │ ──────────→  │   Loyalty  │
         │  Service   │ ←──────────  │   Service  │
         └────────────┘   response   └────────────┘
         
                  ↓  ↓  ↓  tight coupling  ↓  ↓  ↓
         Orders must know about Loyalty
         Orders fails if Loyalty is slow
         New reactions require modifying Orders


         Asynchronous (Event-Driven)
         
         ┌────────────┐   OrderPlaced  ┌────────────┐
         │   Orders   │ ─────────────→ │  Loyalty   │
         │  Service   │                │  Service   │
         └────────────┘                └────────────┘
                │                      
                │        OrderPlaced  ┌────────────┐
                └─────────────────→  │Notification│
                │                    │  Service   │
                │                    └────────────┘
                │        OrderPlaced  ┌────────────┐
                └─────────────────→  │ Analytics  │
                                     │  Service   │
                                     └────────────┘
```

### Broker vs. Mediator Topology

Mark Richards identifies two primary topologies for event-driven architecture:

**Broker topology**: Events flow directly between producers and consumers through a message broker (Kafka, RabbitMQ, AWS SQS/SNS). The broker routes events to subscribers. There is no central coordinator. Each consumer decides independently what to do with events it receives.

```
Producer → Broker → Consumer A
                 → Consumer B
                 → Consumer C
```

Broker topology is highly decoupled and resilient. It is appropriate when the event processing workflow is simple or when consumers operate independently.

**Mediator topology**: A central mediator (orchestrator) receives the initial event and coordinates the processing workflow by sending commands to specific services in a defined sequence. The mediator knows the workflow; consumers know only their individual step.

```
Initial Event → Mediator → Step 1 Service
                        → Step 2 Service (after Step 1)
                        → Step 3 Service (after Step 2)
```

Mediator topology provides better visibility into workflow state and easier error recovery. It is appropriate for complex business processes with ordered steps, compensating transactions, and long-running workflows. The cost is that the mediator becomes a coordination bottleneck.

### Choreography vs. Orchestration

These terms are often used interchangeably with broker/mediator but describe the coordination logic, not the infrastructure:

**Choreography**: Services coordinate by reacting to each other's events. No service knows the full workflow. The Order Service emits `OrderCreated`. The Inventory Service listens, reserves stock, and emits `InventoryReserved`. The Payments Service listens to `InventoryReserved`, charges the card, and emits `PaymentProcessed`. The workflow emerges from the chain of reactions without any single service knowing the whole picture.

```
OrderCreated
    ↓
[Inventory reacts] → InventoryReserved
                          ↓
              [Payments reacts] → PaymentProcessed
                                        ↓
                          [Fulfillment reacts] → OrderFulfillmentStarted
```

Choreography is highly decoupled but hard to reason about. When something goes wrong, finding where in the implicit workflow the failure occurred requires distributed tracing across multiple services.

**Orchestration**: A central orchestrator (saga orchestrator, workflow engine) explicitly sequences the steps. The orchestrator sends commands to individual services and tracks the state of the overall workflow.

```
Order Orchestrator:
  1. Send ReserveInventory to Inventory Service
  2. Wait for InventoryReserved event
  3. Send ChargeCard to Payments Service  
  4. Wait for PaymentProcessed event
  5. Send StartFulfillment to Fulfillment Service
```

Orchestration makes the workflow explicit and observable but concentrates coordination logic in the orchestrator. Modern tools like AWS Step Functions, Temporal, and Conductor implement orchestration as a first-class concern.

### Event Sourcing and CQRS

Event-driven architecture frequently appears alongside two related patterns:

**Event Sourcing**: Instead of storing current state in a database, store the sequence of events that led to the current state. The current state is derived by replaying events.

```
Traditional: users table { id, email, subscriptionTier }
Event Sourced: user_events { UserRegistered, EmailChanged, UpgradedToPremium, ... }
Current state = replay all events for user ID
```

Event sourcing gives you a complete audit trail, the ability to time-travel to any past state, and the ability to add new projections from historical events. The cost is higher complexity in reads (projection management) and the need for snapshot strategies for entities with long event histories.

**CQRS (Command Query Responsibility Segregation)**: Separate the write model (commands that change state) from the read model (queries that read state). The write side handles commands and produces events. The read side subscribes to events and maintains denormalized, optimized read models.

```
Write side:                     Read side:
PlaceOrder command              OrderConfirmed event
   ↓                               ↓
Order aggregate                 Order Summary projection
   ↓                               ↓
OrderPlaced event               orders_summary table
                                   (denormalized for UI)
```

CQRS lets each side scale independently and be optimized for its specific workload. The write side can be optimized for consistency and transactional integrity. The read side can use denormalized tables or search indexes optimized for specific query patterns.

## Deep Dive

### The Organizational Decoupling Argument

The "Software Engineering at Google" book's treatment of large-scale codebase evolution contains a principle that illuminates why event-driven architecture is not merely a technical choice but an organizational one: the cost of a change is proportional to the number of teams that must coordinate to make it. In a synchronous call graph, adding behavior to a system requires modifying the caller — the team that owns the caller must be consulted, their code must be reviewed and tested, and the deployment must be coordinated. In an event-driven system, adding behavior requires only a new subscriber — the team building the new behavior can work entirely independently.

The Google book documents this as a property they call "independence" — the ability for teams to make changes without requiring coordination with other teams. Event-driven architecture is one of the primary structural mechanisms for achieving independence at the service level. The paper trail of Google's own infrastructure evolution, documented in research papers like "Spanner," "Bigtable," and "Borg," shows a consistent pattern: components communicate through events and streams when they want to achieve loose coupling, and through direct calls when they want strict consistency and need to pay the coordination cost explicitly.

The Microsoft Azure Architecture Center's guidance on event-driven patterns draws the organizational lesson more explicitly: event-driven systems are maintainable at scale because each subscriber can be developed, deployed, and evolved by a different team without requiring that team to understand anything about the event producer beyond the event schema. The Azure guidance's observation that "producers and consumers are loosely coupled and can be deployed independently" is not a technical description — it is an organizational capability statement. The architecture enables a team structure where the Order team, the Loyalty team, and the Analytics team each own their reactions to order events, and none of them needs to coordinate with the others or with the Order team.

### Event Sourcing and the Audit Problem

The AWS Well-Architected Framework's operational excellence pillar contains a requirement that is easy to state and expensive to satisfy: "understand what happened." In a traditional stateful system, the current state is stored but the history of how that state was reached is typically lost. When a user's account balance is wrong, or an order's status is incorrect, or a permission was granted that should not have been, diagnosing the root cause requires reconstructing history from logs — which are often incomplete, unstructured, or have been rotated.

Event sourcing, as described in Greg Young's foundational writings and elaborated in Vaughn Vernon's "Implementing Domain-Driven Design," addresses this directly: the state *is* the event history, and current state is a derived projection. The AWS Builder's Library essay "Avoiding insurmountable queue backlogs" observes a related principle: systems designed around event streams naturally produce audit trails because every state change is represented as a discrete, immutable event with a timestamp and a cause. The Builder's Library essay on "Reliability and durable execution" notes that event streams provide durability guarantees that in-memory state transitions do not — if a processing node crashes mid-computation, the event stream provides the recovery point.

The Microsoft .NET Architecture guides on CQRS and event sourcing make the practical tradeoff explicit: event sourcing is appropriate when the history of how state was reached is as important as the current state. Financial systems, compliance-sensitive workflows, collaborative editing systems — these domains benefit from event sourcing because the business itself cares about history, not just current state. CRUD applications where only the current state matters do not benefit from event sourcing and should not use it. The guides' candid acknowledgment that event sourcing adds significant complexity — snapshot management, projection maintenance, eventual consistency in read models — is a valuable corrective to the enthusiasm with which the pattern is sometimes adopted.

### The Consistency Spectrum and Its Implications

The AWS Well-Architected Framework's reliability pillar introduces a concept that event-driven architects must internalize: "recovery time objective" and "recovery point objective" are not properties of the system as a whole but of each component and each consumer. In an event-driven system, the "recovery point" for a consumer is its last committed event offset — how far behind it can fall without losing data. The "recovery time" is how long it takes to replay events from that offset to the current position.

This framing reveals a property of event-driven systems that is often misunderstood: eventual consistency is not a weakness to be minimized but a characteristic to be managed. The AWS Builder's Library essay "Timeouts, retries, and backoff with jitter" generalizes to a principle for event-driven systems: consumer lag is the primary operational metric, not producer throughput. A system that produces a million events per second but whose consumers are hours behind has not solved the business problem — users taking actions based on stale state will have a degraded experience. The Framework's guidance on "monitoring" applied to event-driven systems means monitoring consumer lag as a first-class SLO, not treating it as a secondary infrastructure metric.

The Google SRE Book's treatment of "error budgets" applies with particular force to event-driven systems. The SRE Book observes that reliability is not binary — it is a spectrum, and the appropriate point on that spectrum depends on user impact. For an event-driven system, this means characterizing each consumer's acceptable lag: how stale can the loyalty points balance be before users notice? How quickly must inventory counts update before double-sells become a business problem? These are the SLOs that matter, and they are consumer-specific, not system-wide. The architecture's value is that it makes these trade-offs explicit and independently negotiable per consumer, rather than forcing all components to share the consistency properties of the most demanding one.

### Schema Evolution as the Hidden Governance Problem

The "Software Engineering at Google" book devotes substantial attention to API design and evolution, with a key insight: APIs that are consumed by many clients accumulate compatibility constraints that eventually make evolution nearly impossible. Hyrum's Law — that all observable behaviors of an API will be depended upon by someone — applies with particular force to event schemas because event consumers are typically not visible to event producers. A producer cannot enumerate its consumers, cannot test changes against all of them, and cannot negotiate migration timelines with teams it does not know about.

This is not merely a technical problem; it is a governance problem. The Google book's guidance on "API design" applies directly: event schemas should be designed for extension (new optional fields can be added without breaking consumers) and should treat field removal or renaming as breaking changes that require a major version increment and a migration period. The Microsoft Azure Architecture Center's guidance on event schema management recommends schema registries and compatibility checking as first-class infrastructure — not an afterthought. The AWS Builder's Library essay on "Implementing graceful degradation" observes that consumers should be designed to handle schema evolution gracefully: ignoring unknown fields, providing defaults for missing optional fields, and failing explicitly rather than silently when required fields are absent. The combination of schema registries, compatibility rules, and defensive consumer design is the governance infrastructure that makes large-scale event-driven systems evolvable rather than brittle.

## Implementation Guide

### Step 1: Define your event taxonomy

Events fall into two broad categories:

**Domain events**: Something happened in the business domain. `OrderPlaced`, `PaymentFailed`, `CustomerRegistered`, `ProductStockDepleted`. These are facts about the business that other parts of the system may care about.

**Integration events**: Cross-boundary notifications published to external systems. These require more careful versioning and stability than internal domain events.

For each event, define:
- Name (past tense verb: what happened)
- Schema (what data does it carry)
- Producer (who publishes it)
- Consumers (who subscribes to it)
- Retention (how long is it kept)
- Ordering requirements (does order matter within a partition)

### Step 2: Choose fat or thin events

**Thin events** carry only the identifier of what changed. Consumers query for current state when they need details.

```json
// Thin event
{
  "eventType": "OrderPlaced",
  "orderId": "ord-12345",
  "timestamp": "2025-03-15T10:00:00Z"
}
// Consumer calls GET /orders/ord-12345 to get details
```

**Fat events** carry all the data consumers might need. Consumers do not need to make follow-up calls.

```json
// Fat event
{
  "eventType": "OrderPlaced",
  "orderId": "ord-12345",
  "customerId": "cust-789",
  "items": [
    { "productId": "prod-1", "quantity": 2, "unitPrice": 29.99 }
  ],
  "totalAmount": 59.98,
  "shippingAddress": { ... },
  "timestamp": "2025-03-15T10:00:00Z"
}
```

**The tradeoff**: Fat events reduce consumer coupling (no callback needed) and improve performance (no follow-up API call). They increase event payload size and couple consumers to the event schema. The preferred approach in modern EDA is fat events for domain events, with careful schema versioning.

### Step 3: Implement the Outbox Pattern for reliable event publishing

The naive implementation of event publishing has a critical flaw: if the database transaction succeeds but the message broker publish fails, you have state changes without corresponding events (or vice versa).

The Outbox pattern solves this:

```
1. In the same database transaction:
   - Update the business entity
   - Insert the event into an outbox table

2. A separate process (outbox relay):
   - Reads unpublished events from the outbox table
   - Publishes them to the message broker
   - Marks them as published

3. Result: exactly-once event publishing guaranteed
```

```sql
-- Outbox table
CREATE TABLE event_outbox (
  id          UUID PRIMARY KEY,
  event_type  VARCHAR(100),
  aggregate_id VARCHAR(100),
  payload     JSONB,
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- In the order placement transaction:
BEGIN;
  INSERT INTO orders (...) VALUES (...);
  INSERT INTO event_outbox (event_type, aggregate_id, payload)
  VALUES ('OrderPlaced', 'ord-12345', '{"orderId": "ord-12345", ...}');
COMMIT;
```

Debezium (CDC-based) and Transactional Outbox are the two standard implementations of this pattern.

### Step 4: Handle idempotency in consumers

Events may be delivered more than once (at-least-once delivery is the norm). Consumers must be idempotent — processing the same event twice should produce the same result as processing it once.

```typescript
async function handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  // Idempotency check: have we already processed this event?
  const alreadyProcessed = await this.processedEvents.exists(event.eventId);
  if (alreadyProcessed) {
    logger.info('Duplicate event, skipping', { eventId: event.eventId });
    return;
  }
  
  // Process the event
  await this.loyaltyService.awardPoints(event.customerId, event.totalAmount);
  
  // Record that we processed this event
  await this.processedEvents.record(event.eventId);
}
```

### Step 5: Design for event ordering

Kafka and most message systems provide ordering within a partition, not across partitions. If you need events for a specific entity to be processed in order (all events for order-123 in sequence), use the entity ID as the partition key:

```typescript
kafka.produce({
  topic: 'orders',
  key: order.id,      // same key → same partition → ordered delivery
  value: JSON.stringify(event),
});
```

If cross-entity ordering is required, you need stronger guarantees and must carefully design your topic partitioning strategy.

## When to Use

**Event-driven architecture fits well when:**

- **You need to decouple producers from consumers** at organizational and technical levels. Different teams can independently add reactions to events without touching the event producer.

- **You have workflows with natural async steps**. Order fulfillment, user onboarding, document processing — these are sequences of steps where each step can proceed independently and asynchronously.

- **You need to fan out to multiple consumers**. A single event (payment processed) needs to trigger reactions in five different systems. EDA handles fan-out cleanly; request-response requires the producer to call all five systems.

- **You need an audit trail or event replay capability**. Event sourcing + event streaming gives you a permanent, replayable history of everything that happened in your system. This is invaluable for debugging, compliance, and adding new features that need to process historical data.

- **You need to integrate with external systems or third-party services** that operate on different schedules and with different reliability characteristics. A message queue absorbs the impedance mismatch.

## When NOT to Use

**Event-driven architecture adds unwanted complexity when:**

- **You need immediate consistency**. EDA is inherently eventually consistent. If a user updates their profile and immediately needs to see the update reflected everywhere, eventual consistency is a poor user experience.

- **Your operations are simple request-response queries**. CRUD applications that display data from a database do not benefit from asynchronous events. The complexity added exceeds the value gained.

- **Your team lacks distributed systems experience**. EDA introduces failure modes that are harder to reason about than synchronous calls: duplicate delivery, out-of-order events, poison messages, consumer lag. Teams unfamiliar with these patterns will spend significant time debugging mysterious behavior.

- **You need transactional integrity across the entire workflow**. Sagas and choreography can approximate distributed transactions, but they are complex. If your business requires strict ACID guarantees across multiple entities, consider whether a shared database with a modular monolith is actually the right choice.

## Common Mistakes

### 1. Events as Commands in Disguise

An event is a fact: `OrderPlaced`. A command is an instruction: `PlaceOrder`. Events should not imply a specific reaction. When your events are named `SendConfirmationEmail` or `UpdateInventoryCount`, you have disguised commands as events. The producer is dictating what consumers should do, reintroducing coupling through the event name.

Name events as past-tense facts. Let consumers decide what to do with the fact.

### 2. No Schema Registry or Versioning Strategy

Events are published by one team and consumed by many. Without a schema registry (Confluent Schema Registry, AWS Glue Schema Registry), it is easy for a producer to change their event schema in a way that breaks all consumers. 

Use a schema registry with compatibility checking. Enforce that new event versions are backward compatible (add fields, never remove or rename). Maintain the old version alongside the new version during migration periods.

### 3. Ignoring Consumer Lag

In Kafka and similar systems, consumers process events at their own pace. When a consumer falls behind — because it is slow, or was offline, or had a bug — it accumulates a backlog of unprocessed events. This backlog can represent minutes, hours, or days of delayed reactions.

Monitor consumer lag as a first-class metric. Alert when lag exceeds your SLO. Have a plan for what happens when the Notifications service is 2 hours behind — are customers getting emails about events that are already resolved?

### 4. Fat Events with Sensitive Data

Putting sensitive data (PII, payment card data, credentials) in event payloads creates compliance and security problems. Every consumer that subscribes to the event potentially has access to sensitive data they may not be authorized to see.

Use the Claim Check pattern: store sensitive data in a secure store and put only a reference token in the event. Consumers with authorization can retrieve the data; consumers without authorization cannot.

### 5. Choreography Without Visibility

Pure choreography produces workflows that are impossible to observe. When the order placement workflow spans five services connected by events, there is no single place that shows "this order is currently at step 3 of 5, waiting for payment confirmation."

Either use orchestration for complex workflows, or implement a workflow tracking read model: subscribe to all relevant events and maintain a projection that represents the current state of the workflow.

## Connections

Event-driven architecture integrates deeply with the broader architecture landscape:

- **Microservices** and EDA are natural partners. Microservices need loose coupling between services; EDA provides the communication backbone that achieves it. The combination — microservices communicating via events through Kafka or similar — is the dominant architecture pattern for high-scale internet systems.
- **Event Sourcing** takes EDA principles to their logical conclusion: not just communicating via events, but storing state as events. The two are complementary but independent.
- **CQRS** almost always appears alongside Event Sourcing but can be used independently. The event stream from the write side feeds the projections on the read side.
- **Saga Pattern** is the distributed transaction pattern for event-driven microservices. Temporal, AWS Step Functions, and Conductor are the current generation of saga orchestration tools.
- **Space-Based Architecture** uses in-memory event processing and data grids to achieve extreme throughput — it is EDA taken to its architectural extreme.

## Key Insights

1. **Events are facts, not commands.** The naming discipline matters. `OrderPlaced` is a fact. `SendConfirmationEmail` is a command. Events communicate what happened; they do not dictate reactions. This distinction is the difference between truly decoupled components and a synchronous call disguised as async.

2. **The Outbox pattern is not optional.** Any system that publishes events must handle the dual-write problem (database update + event publish) atomically. The Outbox pattern is the standard solution. Without it, you will have events that do not correspond to actual state changes, or state changes with no corresponding events.

3. **Eventual consistency is a feature, not a compromise.** The user placed an order. They do not need their loyalty points balance updated in the same millisecond. They need their order confirmed. Embracing eventual consistency where the business allows it dramatically simplifies architecture and improves resilience.

4. **Consumer lag is your SLO, not throughput.** In EDA, the question is not how many events per second can be published — Kafka can handle millions. The question is how far behind can your consumers get before users notice? Design your monitoring around consumer lag, not just producer throughput.

5. **Choreography scales; orchestration observes.** Choreography is more resilient and decoupled but harder to reason about. Orchestration is more observable and easier to debug but is a coordination bottleneck. For workflows with clear, ordered steps and failure recovery requirements, orchestration is often the right choice despite the coupling cost.

6. **Schema evolution is your governance problem.** In a system with twenty consumers of a single event type, changing the event schema is a cross-team coordination event. Invest early in schema registries, compatibility rules, and migration procedures. The teams that do not do this spend years managing mysterious consumer failures.

7. **EDA does not eliminate the need for synchronous APIs.** Read operations — queries that need an immediate consistent response — are still best served by synchronous APIs. EDA is for write-side workflows and reactions. A hybrid architecture (EDA for writes, REST/gRPC for reads) is common and appropriate.
