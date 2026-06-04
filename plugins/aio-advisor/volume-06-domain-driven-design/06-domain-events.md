# Domain Events — Things That Happened

> "A domain event is a full-fledged part of the domain model, a representation of something that happened in the domain. The event is part of the ubiquitous language; the occurrence of a significant event in the domain should be expressed in the language of the domain model." — Vaughn Vernon, Implementing Domain-Driven Design

## The Problem

A team is building an e-commerce system. When an order is placed, five things need to happen: the inventory must be reserved, a confirmation email must be sent, the customer's loyalty points must be credited, a fraud check must be initiated, and the analytics system must record the event. The first developer puts all five in the `placeOrder()` method. It works. Then the marketing team wants a sixth thing to happen — a push notification for certain customer segments. The developer adds it to `placeOrder()`. Then compliance needs a seventh. Then the A/B testing framework needs a conditional eighth.

The `placeOrder()` method now has eight responsibilities and twelve dependencies. It calls the inventory service, the email service, the loyalty service, the fraud service, the analytics service, the notification service, the compliance service, and the A/B testing service. Testing requires mocking all eight dependencies. Adding a new side effect requires modifying a method that has nothing to do with the new concern. The method is a coordination hub masquerading as a domain operation.

The root cause is temporal coupling: the side effects of placing an order are executed in the same moment as the act of placing the order, in the same code, by the same method. This coupling makes the system rigid and the code complex. The business reality — that an order being placed is an event with many downstream consequences — is not reflected in the model.

Domain Events are the solution. They acknowledge that significant things happen in the domain, give those happenings first-class representation in the model, and decouple the act from its consequences.

## Core Concept

A Domain Event is an immutable record of something significant that happened in the domain. Several properties make domain events distinctive:

**Past tense naming**: Domain events are named in the past tense because they represent things that *have happened*, not commands or requests. `OrderPlaced` (not `PlaceOrder`), `PaymentReceived` (not `ReceivePayment`), `InventoryReserved` (not `ReserveInventory`). The past tense is not a stylistic preference — it is a semantic statement: this event records a fact, and facts cannot be undone or refused.

**Immutability**: An event represents something that happened. It cannot be changed. It can be reacted to, but the event itself is fixed. This immutability makes events reliable as a historical record.

**Domain language**: Events are named in the Ubiquitous Language of their bounded context. They carry the vocabulary that domain experts would recognize. An `OrderFulfilled` event speaks the fulfillment domain's language; a `CustomerChurnRiskIdentified` event speaks the customer analytics domain's language.

**Timestamp**: Every domain event captures when it occurred. The timestamp is part of the event's identity — it anchors the event in time.

**Causal identity**: Domain events should carry enough context to be meaningful without requiring a database lookup. An `OrderPlaced` event should carry the order ID, the customer ID, the line items, and the total — not just the order ID. This "fat event" approach makes events self-contained and allows handlers to process them without additional I/O.

Domain events serve multiple purposes in a DDD system:

1. **Inter-aggregate communication**: Aggregates communicate through domain events. When one aggregate changes state, it publishes an event; other aggregates react to the event in separate transactions.

2. **Bounded context integration**: Events published at the boundary of a bounded context notify other contexts of significant state changes.

3. **Audit log / event log**: Domain events provide a complete history of what happened in the domain — the raw material for audit trails, debugging, and temporal queries.

4. **Event sourcing**: When aggregates are event-sourced, domain events are the primary storage mechanism — the aggregate's state is the sum of its events.

5. **CQRS read model updates**: Read models (query sides) are updated by processing domain events emitted from the write side.

## Deep Dive

Vernon's treatment of domain events in the Red Book was more comprehensive than Evans' original blue book coverage, and it resolved an ambiguity that Evans left open: the distinction between a domain event and a technical message. Evans introduced domain events as a modeling concept — a first-class representation of something significant that happened in the domain. Vernon clarified the implementation pathway: a domain event first exists as a domain object, raised by an aggregate method, and only subsequently becomes a message that crosses a process boundary. This two-phase existence matters for implementation. The aggregate raises the event synchronously as part of its state transition. Whether that event is published to a message broker, dispatched to local handlers, or stored in an event store is an infrastructure concern separate from the domain model.

The past-tense naming discipline that both Evans and Vernon insisted on is not aesthetic — it encodes a fundamental ontological distinction. `OrderPlaced` is a fact. `PlaceOrder` is a command. Facts cannot be refused, cannot fail, and cannot be rolled back. Once you name an event in the past tense, you are forced to confront its immutability: whatever happened, happened. The system's job is to react, not to negotiate. This discipline catches model errors early. If a team names an "event" `OrderSubmitted` but also has logic that can "reject the submission," they have misclassified a command outcome as an event. The naming forces the question: is this something that definitely happened, or something that might happen? If it might not happen, it is not a domain event — it is the success case of a command.

The "fat event" pattern that Vernon advocated — events carrying enough data to be processed without additional lookups — is a deliberate trade-off between event size and handler independence. A thin event carries only the aggregate ID (`{ "orderId": "ord-123" }`). Handlers must look up the current state of the order to process the event. A fat event carries all relevant context (`{ "orderId": "ord-123", "customerId": "cus-456", "lineItems": [...], "totalAmount": {...} }`). Handlers can process the event without a database call. Vernon argued for fat events on the grounds of handler independence: if every handler must query the source aggregate to process an event, the handlers are still coupled to the aggregate's current state. If the aggregate is modified between the event being published and the handler querying it, the handler may be reacting to a state that did not exist when the event was raised. The fat event preserves the state at the moment of occurrence, making the handler's behavior deterministic regardless of subsequent aggregate changes.

The outbox pattern — which Evans did not cover but which Vernon and subsequent practitioners identified as essential for reliable event publication — solves what is otherwise an intractable problem: how do you ensure that an event is published if and only if the aggregate state change commits? If you publish to a message broker inside a database transaction, you cannot include the broker publish in the transaction — the broker is not a transactional participant. If you publish after the transaction commits, you can crash between commit and publish, losing the event. The outbox pattern resolves this by persisting the event to an outbox table in the same database transaction as the aggregate state change. A separate process reads the outbox and publishes to the broker. The aggregate state change and the event record are atomic; the broker publication is eventually consistent but guaranteed. Sam Newman, in *Building Microservices*, identifies this pattern as one of the most important practical advances in distributed DDD implementation — not because it is clever, but because it makes the "raise domain event on state change" pattern safe in production environments where processes crash.

The Microsoft .NET Microservices Architecture guide provides the most complete production-oriented treatment of domain event publication in their eShopOnContainers application. The guide shows domain events being raised inside aggregate methods, collected by the unit of work, and dispatched after the database transaction commits. The dispatch mechanism uses MediatR (an in-process mediator) for local handlers and integration events (translated from domain events) for cross-service publication via Service Bus. The guide is explicit about the translation step: domain events carry the aggregate's internal model and are appropriate for in-process handlers within the same bounded context; integration events carry a published-language representation appropriate for cross-context publication. This distinction — domain event versus integration event — is one of the guide's most practically important contributions to the literature.

## Implementation Guide

**Step 1: Define Events in Domain Language**

Domain events belong to the domain layer. They are named with the Ubiquitous Language and carry domain concepts (value objects, entity identifiers) rather than technical types.

```java
// In the Order bounded context
public final class OrderPlaced {
    private final OrderId orderId;
    private final CustomerId customerId;
    private final List<OrderedItem> items;
    private final Money total;
    private final ShippingAddress shippingAddress;
    private final Instant occurredAt;
    
    public OrderPlaced(
        OrderId orderId,
        CustomerId customerId,
        List<OrderedItem> items,
        Money total,
        ShippingAddress shippingAddress
    ) {
        this.orderId = Objects.requireNonNull(orderId);
        this.customerId = Objects.requireNonNull(customerId);
        this.items = List.copyOf(items); // immutable copy
        this.total = Objects.requireNonNull(total);
        this.shippingAddress = Objects.requireNonNull(shippingAddress);
        this.occurredAt = Instant.now();
    }
    
    // Only getters — no setters, immutable
    public OrderId orderId() { return orderId; }
    public CustomerId customerId() { return customerId; }
    public List<OrderedItem> items() { return items; }
    public Money total() { return total; }
    public ShippingAddress shippingAddress() { return shippingAddress; }
    public Instant occurredAt() { return occurredAt; }
}
```

Note: the event carries the full context (items, total, shipping address) — not just the order ID. Handlers can process this event without loading the order from the database.

**Step 2: Aggregate Emits Events**

Domain events are emitted by aggregates as part of their state transitions. The aggregate collects events internally; the infrastructure publishes them after the transaction commits.

```java
public class Order {
    private final OrderId id;
    private final List<DomainEvent> domainEvents = new ArrayList<>();
    
    public void place(CustomerId customerId, List<LineItem> lineItems, ShippingAddress address) {
        // Validate business rules
        if (lineItems.isEmpty()) throw new OrderMustHaveItemsException();
        
        // Update state
        this.status = OrderStatus.PLACED;
        this.placedAt = Instant.now();
        
        // Record event
        domainEvents.add(new OrderPlaced(
            id,
            customerId,
            lineItems.stream().map(OrderedItem::from).toList(),
            calculateTotal(lineItems),
            address
        ));
    }
    
    // Infrastructure reads and clears events after publishing
    public List<DomainEvent> pullDomainEvents() {
        List<DomainEvent> events = List.copyOf(domainEvents);
        domainEvents.clear();
        return events;
    }
}
```

The aggregate does not publish events directly — it only records them. The infrastructure layer (repository, application service) is responsible for publishing after the aggregate's state change is persisted.

**Step 3: The Outbox Pattern for Reliable Publishing**

The most common mistake with domain events is publishing them directly from the application service after saving the aggregate. If the save succeeds but the event publishing fails, events are lost. The outbox pattern solves this.

```java
@Transactional
public void placeOrder(PlaceOrderCommand command) {
    Order order = Order.create(command.customerId(), command.items(), command.address());
    
    // Save aggregate
    orderRepository.save(order);
    
    // Save events to outbox table — same transaction
    List<DomainEvent> events = order.pullDomainEvents();
    outbox.store(events);
    
    // Transaction commits: both the order row AND the outbox rows are saved atomically
}

// Separate background process
@Scheduled(fixedDelay = 100)
public void processOutbox() {
    List<StoredEvent> pendingEvents = outbox.findPending();
    for (StoredEvent event : pendingEvents) {
        eventPublisher.publish(event);
        outbox.markPublished(event.id());
    }
}
```

The outbox process runs asynchronously, retrying failed publications with exponential backoff. Events are delivered at-least-once — handlers must be idempotent.

**Step 4: Fat Events vs Thin Events**

Domain events can carry full context (fat events) or just an identifier (thin events). Each has tradeoffs.

**Fat events** carry all the data a handler needs:
- Handlers don't need to load data from the source aggregate — lower I/O
- Events are self-contained — useful for event sourcing and audit logs
- Events capture the state at the time of occurrence — correct historical record
- Larger payloads — higher storage and network costs

**Thin events** carry only an identifier:
- Handlers load current state from the source — always gets latest data
- Smaller payloads — lower storage and network costs
- Handlers may load stale state if the source changes between event and handling
- Cannot reconstruct history from events alone

For domain events used within a bounded context (inter-aggregate communication), fat events are generally preferred — they carry the state at the moment of occurrence, which is the historically accurate record.

For domain events published across context boundaries, the choice depends on the receiving context's needs. If the receiving context only needs the fact that something happened (to trigger its own state transition), a thin event with just an identifier is sufficient. If the receiving context needs data about the occurrence, include the relevant data.

```java
// Fat event — self-contained
public final class OrderShipped {
    private final OrderId orderId;
    private final CustomerId customerId;
    private final TrackingNumber trackingNumber;
    private final Carrier carrier;
    private final Address destination;
    private final List<ShippedItem> items;
    private final Instant shippedAt;
    // ...
}

// Thin event — just the fact
public final class OrderShipped {
    private final OrderId orderId;
    private final Instant occurredAt;
}
```

**Step 5: Idempotent Handlers**

Event handlers must be idempotent — processing the same event twice should produce the same result as processing it once. This is essential because at-least-once delivery guarantees duplicate events.

```java
public class LoyaltyPointsHandler {
    @EventHandler
    public void on(OrderPlaced event) {
        // Idempotency check: have we already processed this event?
        if (loyaltyRepository.hasProcessedEvent(event.orderId())) {
            return; // Already processed — skip
        }
        
        Customer customer = customerRepository.findById(event.customerId());
        LoyaltyPoints points = LoyaltyPoints.forOrderTotal(event.total());
        customer.creditPoints(points);
        
        customerRepository.save(customer);
        loyaltyRepository.markEventProcessed(event.orderId());
    }
}
```

The idempotency check can be a separate table tracking processed event IDs, or it can be a natural idempotency in the operation (e.g., "set balance to X" is idempotent; "increment balance by X" is not).

**Step 6: Event Versioning**

Domain events are published language — other contexts and handlers depend on their schema. When the schema changes, versioning is required.

Strategy 1: **Additive changes only** — only add optional fields, never remove or rename. Existing handlers ignore unknown fields.

Strategy 2: **Version in event name** — `OrderPlacedV1`, `OrderPlacedV2`. Handlers subscribe to specific versions. Both versions are published during migration.

Strategy 3: **Schema registry** — publish event schemas to a registry (e.g., AWS Glue Schema Registry, Confluent Schema Registry). Producers and consumers use the registry to negotiate compatibility.

```java
// Versioned event with migration support
public final class OrderPlacedV2 {
    // All V1 fields
    private final OrderId orderId;
    private final CustomerId customerId;
    private final List<OrderedItem> items;
    private final Money total;
    
    // New in V2
    private final PromotionCode appliedPromotion; // nullable for backward compat
    private final Instant occurredAt;
    
    // V1-compatible factory for backward compatibility testing
    public static OrderPlacedV2 fromV1(OrderPlacedV1 v1) {
        return new OrderPlacedV2(v1.orderId(), v1.customerId(), v1.items(), v1.total(), null, v1.occurredAt());
    }
}
```

## When to Use / When NOT to Use

**Use Domain Events when**:
- An aggregate state change has consequences in other aggregates or bounded contexts
- You need decoupling between the act (placing an order) and its side effects (email, inventory, analytics)
- You need an audit log of what happened in the domain
- You are implementing Event Sourcing or CQRS
- Multiple teams own different downstream consequences of the same domain event

**Do NOT use Domain Events when**:
- The consequence is part of the same transaction as the state change (e.g., enforcing an invariant within an aggregate — that's just a method call)
- The coupling is intentional and the consequence is a core part of the operation (e.g., storing the aggregate root and its children in one transaction — no events needed)
- You're building simple CRUD with no downstream side effects
- The event-driven overhead exceeds the complexity of the alternative (simple synchronous calls)

Domain events add operational complexity: event brokers, idempotency, at-least-once delivery, schema versioning. This overhead is justified by the decoupling benefits only when the system is complex enough to benefit from that decoupling.

## Common Mistakes

**Mistake 1: Events named as commands**

`ProcessOrder`, `SendEmail`, `UpdateInventory` — these are commands, not events. Commands are requests; events are facts. An event named as a command invites confusion about what it represents and whether it can be refused. Use past tense: `OrderPlaced`, `EmailSent`, `InventoryUpdated`.

**Mistake 2: Events leaking internal aggregate structure**

An event should carry domain-meaningful data, not internal aggregate implementation details. Don't publish an event that carries a complete serialized aggregate object — that leaks the aggregate's internal representation and couples all handlers to the aggregate's structure.

**Mistake 3: Publishing events before the transaction commits**

Publishing an event before the aggregate's state change is persisted creates a race condition: handlers may react to an event for a state change that was then rolled back. Always use the outbox pattern or transaction-scoped event collection.

**Mistake 4: Not handling event ordering**

In a distributed system, events from the same aggregate can arrive out of order. An `OrderShipped` event might arrive before the `OrderPlaced` event for the same order (if published through different channels with different latencies). Handlers must handle ordering — either by using a sequence number in events, or by being robust to out-of-order processing.

**Mistake 5: Too many events, too fine-grained**

Not every state change deserves a domain event. A domain event represents something *significant* in the domain — something domain experts would recognize as a meaningful occurrence. Changing an order's internal sort order, incrementing a retry counter, or updating a cache timestamp are not domain events. Reserve domain events for domain-meaningful occurrences.

## Connections

**Aggregates**: Domain events are the mechanism for cross-aggregate communication. Aggregates emit events; other aggregates handle events in separate transactions.

**Bounded Contexts**: Domain events published at bounded context boundaries are the mechanism for inter-context integration. They are expressed in the Publishing Language of the emitting context.

**Event Sourcing**: When using event sourcing, domain events are the primary persistence mechanism. The aggregate's state is reconstructed by replaying its event stream.

**CQRS**: Domain events from the write side update the read side's projections. The read model is built by processing the stream of domain events from the write model.

**Repositories**: The outbox pattern requires the repository and the outbox to share a transaction. The infrastructure layer coordinates event collection from aggregates and storage in the outbox.

## Key Insights

The first key insight about domain events is that they shift the mental model from "operations" to "facts." When you name things `OrderPlaced` instead of `placeOrder`, you're acknowledging that the event represents something that happened in the world — something that is now history. This shift has profound implications: history is immutable, history can be replayed, history can be analyzed. Domain events are the raw material for audit trails, temporal queries, event sourcing, and machine learning feature engineering.

The second insight is that domain events are the correct mechanism for decoupling. When an aggregate emits an event and handlers react, the aggregate has no knowledge of the handlers. Adding a new downstream consequence requires adding a new handler — zero changes to the aggregate. This is the Open/Closed Principle applied to domain operations: open for extension (new handlers), closed for modification (existing aggregate code unchanged).

The third insight is that domain events make the domain model's causal structure explicit. In a system where everything calls everything, causality is hidden in the call graph. In an event-driven system, causality is explicit: `OrderPlaced` caused `InventoryReserved` caused `FulfillmentScheduled`. This explicit causality makes debugging, monitoring, and reasoning about the system dramatically easier.

Model significant domain occurrences as events. Name them in the past tense. Make them immutable. Carry enough context. Publish after commit. Handle idempotently. These five disciplines, applied consistently, produce systems that are decoupled, auditable, and evolvable.
