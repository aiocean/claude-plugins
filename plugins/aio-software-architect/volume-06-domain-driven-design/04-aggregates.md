# Aggregates — Consistency Boundaries

> "A cluster of associated objects that we treat as a unit for the purpose of data changes. Each aggregate has a root and a boundary. The boundary defines what is inside the aggregate. The root is a single, specific entity contained in the aggregate." — Eric Evans, Domain-Driven Design

## The Problem

A team is building an e-commerce platform. They model an `Order` with `LineItems`, each with a `Product` reference and a `Quantity`. They also model a `Customer` with a list of `Address` objects. The `Product` has a current `Price` and an `Inventory` count. At some point, a developer adds a shortcut: `lineItem.getProduct().getInventory().decrement()`. It's one line. It's convenient. It works in testing.

Three months later, two orders are placed simultaneously for the last unit of a product. Both read the inventory count. Both see `1`. Both decrement. Now the inventory shows `-1`. The system has sold something that doesn't exist.

The developer adds a database transaction around the entire operation. But the transaction spans `Order`, `LineItem`, `Product`, and `Inventory` — four separate tables, potentially locked for hundreds of milliseconds. Under load, the database becomes a bottleneck. Performance degrades. The solution: add optimistic locking everywhere. Now there are `OptimisticLockException` errors scattered throughout the codebase, and nobody is sure what to retry.

This is the Aggregate problem. The developer traversed object references across what should be separate consistency boundaries. The result is either data corruption (without transactions) or performance degradation (with transactions). Both outcomes stem from the same root cause: not understanding which objects belong together in a consistency unit.

## Core Concept

An Aggregate is a cluster of domain objects (entities and value objects) that are treated as a single unit for data changes. Every aggregate has:

**An Aggregate Root**: A single entity that serves as the entry point into the aggregate. All operations on objects within the aggregate go through the root. External objects can hold references to the aggregate root, but not to objects inside the aggregate.

**A Consistency Boundary**: All data within the aggregate must satisfy the aggregate's invariants at the end of every transaction. If you change something inside an aggregate, all the invariants of that aggregate must hold true before the transaction commits.

**Identity**: The aggregate root's identity is the identity of the entire aggregate. You find aggregates by their root's ID.

The aggregate boundary defines the scope of a single database transaction. This is the key rule: one transaction modifies one aggregate. Not "usually" — always. If you find yourself needing to modify two aggregates in one transaction, either your aggregate boundaries are wrong, or you need to use eventual consistency between the aggregates.

This rule has profound implications. It means that the size of your aggregate determines the granularity of your consistency guarantees and your transaction scope. Large aggregates provide strong consistency but create contention hotspots. Small aggregates allow high concurrency but require eventual consistency between them.

The most common mistake with aggregates is making them too large. Developers feel safer with larger aggregates because more invariants can be enforced within a single transaction. But a large aggregate that is contended by many concurrent operations becomes a bottleneck. The discipline of DDD pushes you toward smaller aggregates and explicit eventual consistency — which is the right tradeoff for most systems at scale.

**The Reference By ID Rule**

Aggregates should reference other aggregates by identity, not by object reference. Instead of holding a `Customer` object inside an `Order`, the `Order` holds a `CustomerId` value object. This rule enforces loose coupling between aggregates and makes the transaction boundary explicit: you cannot accidentally traverse into another aggregate's territory if you only have its ID.

```java
// WRONG: Order holds a direct reference to Customer
public class Order {
    private Customer customer; // This crosses aggregate boundaries!
    
    public void applyDiscount() {
        if (customer.getLoyaltyTier() == LoyaltyTier.PLATINUM) {
            // Now you need Customer loaded to make changes to Order
        }
    }
}

// RIGHT: Order holds CustomerId
public class Order {
    private CustomerId customerId;
    private LoyaltyDiscount appliedDiscount; // The result, not the reference
    
    public void applyLoyaltyDiscount(LoyaltyDiscount discount) {
        // Discount was calculated outside, passed in
        this.appliedDiscount = discount;
    }
}
```

The second version makes the boundary explicit. To apply a discount, the application service first loads the `Customer` (a separate aggregate lookup), calculates the discount, then passes the discount value into the `Order`. Two aggregate operations, clearly separated.

## Deep Dive

Evans' most counter-intuitive claim about aggregates was that the correct instinct — making aggregates larger to capture more invariants within a single transaction — is almost always wrong. He observed that developers consistently err toward large aggregates because they feel safer: if everything that could possibly be inconsistent is inside one boundary, you never have to reason about distributed consistency. But this reasoning confuses local safety with system-level correctness. A large aggregate that is frequently contended becomes a serialization bottleneck. Every operation that touches the aggregate must queue behind every other. The safety gained at the modeling level is paid for at the concurrency level.

The rule Evans established — one aggregate per transaction — was not a performance optimization. It was an ontological claim about the nature of business invariants. If a business rule requires that two separate aggregates be in a consistent state at all times, that rule is actually making a claim that the two aggregates should be a single aggregate. And if that claim is correct, the combined aggregate should be a single one. But in Evans' experience, most supposed cross-aggregate invariants were not actually invariants — they were business rules that could tolerate eventual consistency. "An order cannot be fulfilled if inventory is not available" sounds like an invariant, but it is actually a business rule that can be expressed as an eventual check with compensation. You accept the order, attempt to reserve inventory, and cancel with notification if inventory is unavailable. This is not a consistency failure — it is the correct business behavior in an eventually consistent world.

Vernon's most significant contribution on aggregates in the Red Book was his size heuristic: most aggregates should contain only the root entity and, at most, a small number of closely related value objects. He was explicit that this sounds extreme but is the right default. His reasoning: the pressure to make aggregates large comes from wanting to protect invariants, but most aggregants that are candidates for the same aggregate boundary are actually expressing a business process that should be modeled as a series of events and reactions, not a single transactional unit. Vernon gave the concrete example of an `Order` with embedded `Payment` — a tempting design because "an order should have a payment." But payment authorization involves an external call that can fail. Embedding the payment in the order aggregate means the order aggregate carries the payment state and the order state in a single transaction that coordinates across a network call. Vernon argued the payment should be a separate aggregate, coordinated through a domain event: `OrderPlaced` triggers `PaymentInitiated`, and `PaymentConfirmed` triggers `OrderConfirmed`. The eventual consistency is explicit, testable, and survivable.

The Microsoft .NET Microservices Architecture guide provides the most practically detailed treatment of aggregate sizing in their eShopOnContainers worked example. The guide shows the evolution of the `Order` aggregate through three design iterations. The first iteration embeds `Buyer`, `PaymentMethod`, and `Address` inside the `Order`. The second iteration extracts `Buyer` as a separate aggregate because the buyer concept crosses into the identity domain. The third iteration extracts `PaymentMethod` because payment lifecycle is independent from order lifecycle — a payment method can be added, modified, or removed independently of any specific order. The final design has `Order` containing only `OrderItems` (genuine members of the order's consistency boundary) plus immutable value objects like `Address` (a snapshot of the shipping address at order time, not a reference to a mutable address entity). The guide notes explicitly that this evolution was driven by asking, for each candidate member: "Can this change independently? Does it have its own lifecycle? If yes, it is a separate aggregate."

The reference-by-ID rule that Evans established — aggregates reference other aggregates only by identity, never by object reference — has an implication that practitioners frequently underestimate. When you can only navigate between aggregates via ID, you cannot accidentally execute a transaction that spans multiple aggregates. The type system prevents the mistake. This is why the rule is worth the inconvenience: it makes the correct behavior the path of least resistance. You cannot call `order.getCustomer().updateLoyaltyPoints()` if `order` holds only a `CustomerId`. You must explicitly load the customer aggregate in a separate operation, which forces you to confront the cross-aggregate nature of the operation and handle it correctly — whether through a domain service that coordinates the two operations or through an event-driven reaction.

## Implementation Guide

**Step 1: Find the True Invariants**

An aggregate's boundary is defined by its invariants — rules that must be true at all times. To find the right boundary, ask: "What must be simultaneously consistent for this data to be valid?"

For an `Order`:
- The sum of line item amounts must equal the order total (invariant)
- The number of line items cannot exceed the maximum order size (invariant)
- Each line item quantity must be positive (invariant)

For an `Order` and `Inventory`:
- When an order is placed, inventory must be decremented (cross-aggregate)

The first three invariants can be enforced within the `Order` aggregate alone. The fourth involves two aggregates — it requires eventual consistency or a saga/process manager.

The key question: does the business actually require *simultaneous* consistency? In most domains, there's a small window where inventory can show slightly stale data before an order is confirmed. The business accepts this (it handles overselling with backorders). If so, you don't need the Order and Inventory aggregates to be transactionally consistent — you need eventual consistency with compensating operations for edge cases.

**Step 2: Make Aggregates Small**

Start small and expand only when invariants require it. The default should be: every entity is its own aggregate. Only group entities together if they share invariants that cannot be enforced across aggregate boundaries.

Common aggregates in an order management system:

```
Order aggregate:
  - Order (root)
  - LineItem (child entity)
  - OrderTotal (value object, derived)
  - ShippingAddress (value object)
  - PaymentMethod (value object)

Customer aggregate:
  - Customer (root)
  - ContactInfo (value object)
  - LoyaltyPoints (value object)

Product aggregate:
  - Product (root)
  - ProductDescription (value object)
  - ProductCategory (value object)

Inventory aggregate:
  - InventoryItem (root, identified by SKU)
  - StockLevel (value object)
  - ReservationList (collection of Reservation value objects)
```

Note: `Order` and `Customer` are separate aggregates. `Order` holds `customerId`, not a `Customer` reference. `Product` and `Inventory` are separate aggregates — not because they couldn't be combined, but because they are updated at different rates by different operations and would create contention if combined.

**Step 3: Implement the Root as the Entry Point**

All modifications to objects inside the aggregate must go through the aggregate root. No external code should have a reference to `LineItem` and call `lineItem.setQuantity()` directly. All changes go through `order.changeLineItemQuantity(lineItemId, newQuantity)`.

```java
public class Order {
    private OrderId id;
    private CustomerId customerId;
    private List<LineItem> lineItems;
    private OrderStatus status;
    
    // All modifications go through the root
    public void addLineItem(ProductId productId, Quantity quantity, Money unitPrice) {
        if (status != OrderStatus.DRAFT) {
            throw new OrderNotModifiableException(id);
        }
        lineItems.add(new LineItem(productId, quantity, unitPrice));
        // Invariant check: line item limit
        if (lineItems.size() > MAX_LINE_ITEMS) {
            throw new OrderTooLargeException(id, MAX_LINE_ITEMS);
        }
    }
    
    public void removeLineItem(LineItemId lineItemId) {
        if (status != OrderStatus.DRAFT) {
            throw new OrderNotModifiableException(id);
        }
        lineItems.removeIf(li -> li.id().equals(lineItemId));
        if (lineItems.isEmpty()) {
            throw new OrderMustHaveAtLeastOneLineItemException(id);
        }
    }
    
    // Invariant: total is always consistent
    public Money total() {
        return lineItems.stream()
            .map(LineItem::subtotal)
            .reduce(Money.ZERO, Money::add);
    }
}
```

The `LineItem` class can exist inside the `Order` aggregate, but its constructor and mutation methods are package-private or inner-class scoped. Only `Order` can create or modify `LineItem` instances.

**Step 4: Enforce the Single Transaction Rule**

Use your persistence layer to enforce the single transaction rule. In JPA:

```java
@Service
public class OrderApplicationService {
    
    @Transactional
    public void addItemToOrder(AddItemCommand command) {
        Order order = orderRepository.findById(command.orderId())
            .orElseThrow(() -> new OrderNotFoundException(command.orderId()));
        
        // Product data was fetched before this transaction, or passed in
        Money unitPrice = pricingService.currentPrice(command.productId());
        
        order.addLineItem(command.productId(), command.quantity(), unitPrice);
        
        orderRepository.save(order);
        // Transaction commits here. Only Order aggregate was modified.
    }
}
```

If you find yourself loading two aggregate roots in the same `@Transactional` method and saving both, that's a red flag. Either the boundary is wrong, or you need eventual consistency.

**Step 5: Use Domain Events for Cross-Aggregate Consistency**

When an operation must eventually affect multiple aggregates, use domain events. The first aggregate emits an event; a separate handler processes the event and updates the second aggregate.

```java
public class Order {
    private List<DomainEvent> events = new ArrayList<>();
    
    public void confirm() {
        if (status != OrderStatus.DRAFT) {
            throw new OrderAlreadyConfirmedException(id);
        }
        this.status = OrderStatus.CONFIRMED;
        events.add(new OrderConfirmed(id, customerId, lineItems, confirmedAt()));
    }
    
    public List<DomainEvent> domainEvents() {
        return Collections.unmodifiableList(events);
    }
}

// Separate handler in the Inventory context
public class OrderConfirmedHandler {
    @EventHandler
    public void on(OrderConfirmed event) {
        for (LineItemSummary item : event.lineItems()) {
            InventoryItem inventory = inventoryRepository.findBySku(item.sku());
            inventory.reserve(item.quantity()); // Separate aggregate, separate transaction
            inventoryRepository.save(inventory);
        }
    }
}
```

The `Order` confirmation and the `Inventory` reservation happen in separate transactions. There is a brief window where the order is confirmed but inventory is not yet reserved — this is acceptable eventual consistency. If the reservation fails (inventory insufficient), a compensating action fires (order cancellation).

**Step 6: Handle Concurrency with Optimistic Locking**

Aggregates should use optimistic locking to detect concurrent modifications. The aggregate root carries a version number that is incremented on every save.

```java
@Entity
public class Order {
    @Version
    private Long version;
    // ...
}
```

If two concurrent transactions both load the same `Order` and try to save it, the second save will throw `OptimisticLockException`. The caller retries. This is correct behavior — it prevents lost updates without holding database locks.

Keep aggregates small to minimize the likelihood of concurrent modification conflicts. Large aggregates are contended by many operations, leading to frequent optimistic lock failures and retries. The "keep aggregates small" rule and the concurrency rule reinforce each other.

## When to Use / When NOT to Use

Aggregates are a modeling pattern for systems with complex business invariants that must be enforced consistently. They are the right tool when:

- Multiple related objects must satisfy shared business rules
- Concurrent access to shared data requires consistency guarantees
- The domain has clear "units" of work (placing an order, processing a payment)

Aggregates are less appropriate when:

- The domain has very simple invariants (CRUD operations on individual entities)
- Consistency is handled by the database (simple single-table operations)
- You're building a read-heavy system where write consistency is not the primary concern (consider CQRS patterns instead)

## Common Mistakes

**Mistake 1: Making the aggregate too large**

The most common mistake. Engineers want to bundle everything related into one aggregate: `Order` contains `Customer`, `Product`, `Inventory`, `Payment`. The result is a God Aggregate that is contended by every operation, has poor performance, and is difficult to evolve. Start small. Grow only when invariants require it.

**Mistake 2: Modeling "natural" relationships instead of consistency boundaries**

`Customer` has `Orders` — this is a natural one-to-many relationship. Does it follow that `Orders` should be inside the `Customer` aggregate? No. `Customer` invariants (contact info, loyalty status) don't depend on the list of orders. The list of orders can grow unboundedly. Separate aggregates, reference by ID.

**Mistake 3: Crossing aggregate boundaries within a transaction**

Loading two aggregates and modifying both in a single transaction is almost always a mistake. If you're doing this, ask: are these actually separate aggregates, or are they one aggregate that should be unified? Or should the operation be split into two eventual-consistency steps?

**Mistake 4: Using aggregates for read operations**

Aggregates enforce consistency for writes. For read operations, you often don't need the aggregate — you need a projection. CQRS addresses this: writes go through aggregates (for consistency enforcement), reads go through query models (for performance optimization). Don't load a full aggregate and all its children just to render a list view.

**Mistake 5: Not enforcing the root as the entry point**

If your `Order` aggregate's `LineItem` has public setters that external code can call directly, your aggregate boundary is theoretical, not real. Use access modifiers, package structure, or inner class patterns to enforce that all modifications go through the root.

## Connections

**Domain Events**: Domain events are the mechanism for achieving eventual consistency between aggregates. An aggregate emits events; other aggregates handle those events in separate transactions.

**Repositories**: There is one repository per aggregate root. The repository loads and saves complete aggregate graphs. It never loads a `LineItem` directly — only the `Order` root and its entire aggregate.

**Entities and Value Objects**: Aggregates are composed of entities and value objects. The root is always an entity (it has identity). Children can be entities (with identity within the aggregate) or value objects (identity-less, defined by their attributes).

**Specifications**: Business rules that validate aggregates before commands are executed can be expressed as Specification objects.

**Domain Services**: When an operation involves multiple aggregates, the operation often belongs in a Domain Service rather than in any single aggregate method.

## Key Insights

The deepest insight about aggregates is that they are not object clusters — they are consistency boundaries. The question to ask is not "what objects are related?" but "what must be consistent at the same moment in time?" Related objects that don't need simultaneous consistency should be separate aggregates, connected by eventual consistency.

The second insight is that the aggregate size decision is a tradeoff between consistency strength and concurrency. Large aggregates provide strong consistency within their boundary but create contention. Small aggregates allow high concurrency but require eventual consistency for cross-aggregate operations. Most domains at scale accept eventual consistency for most operations — the demand for strong consistency is narrower than it appears.

The third insight is that getting aggregate boundaries right is an iterative process. You will design boundaries that seem right, build the system, discover performance problems or consistency violations, and revise. This is not failure — it is the normal evolution of domain understanding. The discipline is to resist making aggregates larger to solve consistency problems, and instead to design explicit eventual consistency with compensating actions.

Keep them small. Enforce the boundary. Trust eventual consistency. These three rules, applied consistently, produce systems that scale well and model the domain faithfully.
