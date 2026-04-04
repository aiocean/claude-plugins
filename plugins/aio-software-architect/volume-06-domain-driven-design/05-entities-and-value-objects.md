# Entities vs Value Objects

> "Some objects are not defined primarily by their attributes. They represent a thread of identity that runs through time and often across distinct representations. Sometimes such an object must be matched with another object even though attributes differ. An object defined primarily by its identity is called an Entity." — Eric Evans, Domain-Driven Design

## The Problem

A developer is modeling a banking system. She creates a `Money` class with `amount` and `currency` fields. She makes it an entity — gives it a database ID, a created timestamp, a version field for optimistic locking. After all, money objects persist in the database. They have a lifecycle. They need to be tracked.

Two weeks later, she has a `Money` entity with ID `#4872` representing $50.00 USD and a `Money` entity with ID `#4873` also representing $50.00 USD. Are these the same? No — they have different IDs. Can she add them? Only if she writes code to create a third `Money` entity with ID `#4874` representing $100.00 USD. Is $50 + $50 really a database operation that creates a new persisted record?

Her colleague is modeling the same system and makes the opposite mistake: he models `BankAccount` as a value object, defined entirely by its balance and account number. Two accounts with the same balance and same account number would be "equal." But if you change the balance of one account, are they now different accounts? No — they're the same account in a different state. The account has identity that persists through state changes.

These mistakes — treating value objects as entities and entities as value objects — are among the most common modeling errors in object-oriented systems. They produce incorrect equality semantics, unnecessary database records, broken domain logic, and systems that don't reflect how the domain actually works.

## Core Concept

The distinction between entities and value objects is one of the fundamental building blocks of domain modeling. Getting this distinction right is not pedantic — it changes the implementation, the persistence strategy, the equality semantics, and the domain model's accuracy.

**Entities** are objects defined by their identity. An entity has a continuous thread of identity that persists through state changes. A `Customer` who changes their name, address, and phone number is still the same customer. A `BankAccount` whose balance changes from $1,000 to $500 is still the same account. What makes them "the same" is not their attributes — it is their identity, typically represented by an ID.

Entity characteristics:
- Has a unique identifier (usually a UUID or database-generated ID)
- Identity persists through attribute changes
- Equality is based on identity, not attributes
- Has a lifecycle: created, modified, potentially deleted
- Has mutable state (attributes can change)

**Value Objects** are objects defined entirely by their attributes. A value object has no identity beyond its value. Two value objects with the same attributes are not just "equal" — they are the same thing. `Money(50, USD)` is the same as another `Money(50, USD)`. There is no sense in which they are "different copies."

Value object characteristics:
- No identifier (no ID field, no database surrogate key)
- Equality is based on all attributes
- Immutable — changing an attribute creates a new value object
- Can be freely copied, shared, or replaced
- Simpler to reason about (no lifecycle, no identity)

The critical insight: **prefer value objects over entities**. Most things that developers model as entities are actually value objects. The discipline of asking "does this thing have identity that persists through change?" before defaulting to an entity produces simpler, more accurate models.

Money is a value object. Address is a value object. Temperature is a value object. Color is a value object. DateRange is a value object. Duration is a value object. These concepts have no identity — they are defined entirely by their values. Two instances representing the same value are interchangeable.

## Deep Dive

Evans' framing of the entity vs. value object distinction was philosophical before it was technical. He argued that most of the objects developers create are not things — they are measurements, descriptions, or amounts. Money is not a thing; it is a measurement of value. Address is not a thing; it is a description of a location. Temperature is not a thing; it is a measurement of thermal energy. Things have identity. Measurements and descriptions do not. The mistake Evans observed repeatedly was that developers, trained to think in terms of database rows with primary keys, would reach for an entity for every concept, even concepts that are definitionally valueless without their context.

The immutability requirement for value objects is more than a performance hint — it is a semantic constraint that falls directly from the definition. If a value object is defined entirely by its attributes, then changing one of its attributes produces a different value, not a modified version of the same value. Fifty dollars in a different currency is not "the fifty dollar value object that had its currency updated" — it is a different value. This is why value objects must be replaced, not mutated: mutation implies that the same conceptual thing has a different state, but value objects by definition have no identity separate from their state. Vernon made this point forcefully in the Red Book: an `Address` value object that has a `setCity()` method is not a value object — it is an entity missing its identity field. The mutability is the tell.

The practical implication of treating value objects as immutable and replaceable has significant consequences for how aggregates are designed. Evans noted that value objects can be freely shared between aggregates (since they carry no identity that could be confused), freely copied (since copies are indistinguishable from originals), and freely discarded and recreated (since recreation produces the same thing). This sharability and replaceability is what makes value objects safe to use as the internal state of aggregates without risking aliasing bugs or unexpected shared mutable state. A `Money` value can be passed between methods, stored in multiple places, and used as a map key — none of which would be safe with a mutable entity.

Vernon introduced the concept of "whole value" to describe when to model something as a value object versus simply a primitive. A raw `int` representing a quantity is technically a value, but it carries no domain meaning and allows nonsensical operations: you can add a quantity to a price, multiply a user ID by a tax rate. A `Quantity` value object wraps the int but makes the domain concept explicit, restricts the operations to those that make domain sense (`add(Quantity)`, `subtract(Quantity)`) and rejects operations that don't (`multiply(Price)`). This "whole value" discipline — wrapping primitives in domain-meaningful value objects — is one of the highest-leverage practices in tactical DDD. It eliminates an entire class of type errors that normally only manifest at runtime, and it gives the domain's concepts first-class representation in the type system.

The Microsoft .NET Microservices Architecture guide uses C# records to illustrate value object implementation, a choice that encodes the semantics in the language itself. C# records provide structural equality by default — two records with the same field values are equal — and they are immutable by default when using init-only properties. The guide's `Address` record, `Money` record, and `OrderStatus` record all use this pattern, noting that the choice of `record` over `class` is not stylistic but semantic: it communicates to every reader that this type has no identity beyond its value. The guide also demonstrates the distinction in persistence: value objects are persisted as owned entity types in Entity Framework Core (no separate table, no surrogate key), while entities have their own tables with primary keys. The persistence strategy is a consequence of the domain model decision, not a separate infrastructure choice.

## Implementation Guide

**Step 1: The Identity Test**

Before creating any domain object, ask: "Does this thing have an identity that persists through changes to its attributes?"

If yes: Entity. If no: Value Object.

Worked examples:
- Customer: yes (changing name doesn't make it a different customer) → Entity
- Money: no (there is no $50 "object" — there are just amounts) → Value Object
- Order: yes (modifying line items doesn't create a new order) → Entity
- Address: no (two addresses with the same street/city/zip are the same address) → Value Object
- BankAccount: yes (changing balance doesn't create a new account) → Entity
- DateRange: no (two date ranges with the same start and end are the same range) → Value Object
- Transaction: yes (a transaction has an ID; it happened at a specific moment) → Entity
- Currency: no (USD is USD; there isn't one "copy" of USD) → Value Object

**Step 2: Implement Value Objects as Immutable**

Value objects must be immutable. Every operation that "changes" a value object should return a new value object.

```java
public final class Money {
    private final long amountMinorUnits; // e.g., 5000 = $50.00
    private final Currency currency;
    
    public Money(long amountMinorUnits, Currency currency) {
        if (amountMinorUnits < 0) throw new IllegalArgumentException("Amount cannot be negative");
        Objects.requireNonNull(currency);
        this.amountMinorUnits = amountMinorUnits;
        this.currency = currency;
    }
    
    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new CurrencyMismatchException(this.currency, other.currency);
        }
        return new Money(this.amountMinorUnits + other.amountMinorUnits, this.currency);
    }
    
    public Money multiply(int factor) {
        return new Money(this.amountMinorUnits * factor, this.currency);
    }
    
    public boolean isGreaterThan(Money other) {
        assertSameCurrency(other);
        return this.amountMinorUnits > other.amountMinorUnits;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money m)) return false;
        return amountMinorUnits == m.amountMinorUnits && currency == m.currency;
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(amountMinorUnits, currency);
    }
}
```

Note: no ID field, no `setAmount()`, no mutable state. `add()` returns a new `Money` — the original is unchanged.

In Kotlin, this is more concise using `data class`:

```kotlin
data class Money(val amountMinorUnits: Long, val currency: Currency) {
    init {
        require(amountMinorUnits >= 0) { "Amount cannot be negative" }
    }
    
    operator fun plus(other: Money): Money {
        require(currency == other.currency) { "Currency mismatch: $currency vs ${other.currency}" }
        return Money(amountMinorUnits + other.amountMinorUnits, currency)
    }
    
    operator fun times(factor: Int): Money = Money(amountMinorUnits * factor, currency)
    
    companion object {
        val ZERO_USD = Money(0, Currency.USD)
        fun ofDollars(dollars: Int) = Money(dollars * 100L, Currency.USD)
    }
}
```

In Go, value objects are naturally expressed as structs with value receivers:

```go
type Money struct {
    AmountMinorUnits int64
    Currency         Currency
}

func (m Money) Add(other Money) (Money, error) {
    if m.Currency != other.Currency {
        return Money{}, fmt.Errorf("currency mismatch: %s vs %s", m.Currency, other.Currency)
    }
    return Money{AmountMinorUnits: m.AmountMinorUnits + other.AmountMinorUnits, Currency: m.Currency}, nil
}

func (m Money) Multiply(factor int) Money {
    return Money{AmountMinorUnits: m.AmountMinorUnits * int64(factor), Currency: m.Currency}
}
```

Go's value semantics make value objects natural — passing a `Money` struct copies it, so mutation is impossible through ordinary code.

**Step 3: Implement Entities with Identity**

Entities need explicit identity management. Use UUID generation (or domain-specific ID generation) at creation time, not at persistence time.

```java
public class Order {
    private final OrderId id;
    private CustomerId customerId;
    private List<LineItem> lineItems;
    private OrderStatus status;
    private Money total;
    
    // Factory method — identity is established at creation
    public static Order create(CustomerId customerId) {
        return new Order(
            OrderId.generate(), // UUID generated here
            customerId,
            new ArrayList<>(),
            OrderStatus.DRAFT
        );
    }
    
    // Equality based on identity only
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order order)) return false;
        return id.equals(order.id); // ONLY compare IDs
    }
    
    @Override
    public int hashCode() {
        return id.hashCode(); // ONLY hash the ID
    }
}
```

The `equals` method for an entity compares only identity. Two `Order` objects with the same ID are the same order, regardless of whether they have different line items (one might be a stale in-memory copy).

**Step 4: Rich Value Objects for Domain Concepts**

Value objects are not just containers for primitive data — they encode domain concepts and rules. A `DateRange` value object enforces that start is before end. A `PhoneNumber` value object validates format. A `Percentage` value object enforces the range 0-100.

```java
public final class DateRange {
    private final LocalDate start;
    private final LocalDate end;
    
    public DateRange(LocalDate start, LocalDate end) {
        Objects.requireNonNull(start, "Start date required");
        Objects.requireNonNull(end, "End date required");
        if (end.isBefore(start)) {
            throw new InvalidDateRangeException(start, end);
        }
        this.start = start;
        this.end = end;
    }
    
    public long durationInDays() {
        return ChronoUnit.DAYS.between(start, end);
    }
    
    public boolean contains(LocalDate date) {
        return !date.isBefore(start) && !date.isAfter(end);
    }
    
    public boolean overlaps(DateRange other) {
        return !this.end.isBefore(other.start) && !other.end.isBefore(this.start);
    }
    
    public DateRange extendTo(LocalDate newEnd) {
        return new DateRange(this.start, newEnd); // returns new instance
    }
}
```

This `DateRange` is more than a pair of dates. It enforces the invariant (start before end), provides domain-meaningful operations (`overlaps`, `contains`, `durationInDays`), and is completely safe to share and pass around.

**Step 5: Persisting Value Objects**

Value objects are typically persisted as embedded records within an entity's row, not as separate database rows. In JPA:

```java
@Entity
public class Order {
    @Id
    private String id;
    
    @Embedded
    private ShippingAddress shippingAddress; // Value object embedded in Order's table
    
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "amountMinorUnits", column = @Column(name = "total_amount")),
        @AttributeOverride(name = "currency", column = @Column(name = "total_currency"))
    })
    private Money total; // Value object embedded in Order's table
}

@Embeddable
public class ShippingAddress {
    private String street;
    private String city;
    private String postalCode;
    private String country;
}
```

No separate `shipping_addresses` table. No foreign key. `ShippingAddress` columns are just columns in the `orders` table. This is correct — the address is not an independent entity; it is data that belongs to the order.

When a customer changes their shipping address on an order, you don't "update the address entity." You replace the `ShippingAddress` value object on the `Order` entity with a new one.

**Step 6: Typed Identifiers as Value Objects**

Entity identifiers should be value objects, not raw primitives. Instead of `String orderId`, use `OrderId orderId`. This prevents passing a `CustomerId` where an `OrderId` is expected.

```java
public final class OrderId {
    private final UUID value;
    
    private OrderId(UUID value) {
        this.value = Objects.requireNonNull(value);
    }
    
    public static OrderId generate() {
        return new OrderId(UUID.randomUUID());
    }
    
    public static OrderId of(String value) {
        return new OrderId(UUID.fromString(value));
    }
    
    public String toString() { return value.toString(); }
    
    @Override
    public boolean equals(Object o) {
        if (!(o instanceof OrderId oid)) return false;
        return value.equals(oid.value);
    }
    
    @Override
    public int hashCode() { return value.hashCode(); }
}
```

Now `order.changeCustomer(customerId)` won't compile if you pass an `OrderId` by mistake. The type system enforces domain semantics.

## When to Use / When NOT to Use

**Use Value Objects for**:
- Measurements: Money, Temperature, Weight, Distance, Duration
- Descriptions: Address, ContactInfo, Description, Specification
- Identifiers: OrderId, CustomerId, SKU (the identifier value, not the entity)
- Ranges: DateRange, PriceRange, QuantityRange
- Collections of attributes: RGB Color, Coordinates (Latitude/Longitude), Version number

**Use Entities for**:
- Anything with a lifecycle: Customer, Order, Product, Account, Invoice
- Anything that can be referenced by other objects across time
- Anything whose identity persists through state changes
- Anything that is tracked in audit logs by identity

**The deciding test**: "If I have two instances with identical attributes, can I always treat them as interchangeable?" If yes: value object. If no: entity.

## Common Mistakes

**Mistake 1: Making everything an entity**

The default in many object-relational systems is "every class maps to a table, every table row has an ID." This makes every concept an entity by default. Fight this default. Most concepts in a rich domain model are value objects that should be embedded within entity rows, not promoted to separate tables.

**Mistake 2: Mutable value objects**

A value object with a setter is not a value object — it's an anemic entity masquerading as a value object. If you can call `address.setCity("London")`, you can create aliasing bugs: two entities holding a reference to the "same" address object, where changing one accidentally changes the other. Immutability is not optional for value objects.

**Mistake 3: Value objects with database IDs**

Adding an `id` field to a value object (usually to satisfy ORM requirements) converts it semantically into an entity. Two `Address` records with different IDs but the same fields are now "different" by the ORM's equality semantics. This is incorrect domain modeling. Use `@Embeddable` or document-style persistence to avoid this.

**Mistake 4: Primitive obsession**

Using `String customerId` instead of `CustomerId`, `double amount` instead of `Money`, `String[] phoneNumbers` instead of `List<PhoneNumber>`. Primitive obsession leads to validation scattered throughout the codebase, no domain operations on the value, and no type safety. Wrap domain concepts in value objects.

**Mistake 5: Treating entity children as value objects**

A `LineItem` inside an `Order` has identity within the aggregate (you need to reference "line item #3" to change its quantity). `LineItem` might be an entity within the aggregate, even though it doesn't have an ID outside the aggregate. The entity/value object distinction applies within aggregates, not just at the aggregate root level.

## Connections

**Aggregates**: Aggregates are composed of entities and value objects. The root is always an entity. Children can be either entities (with intra-aggregate identity) or value objects (defined by their attributes).

**Ubiquitous Language**: Entity and value object names come from the Ubiquitous Language. `Money`, `DateRange`, `Address` — these names should be recognizable to domain experts.

**Repositories**: Repositories persist and load entities (specifically aggregate roots). Value objects are persisted as part of their containing entity, not independently.

**Domain Events**: Events often carry value objects as their payload — the state at the time the event occurred. An `OrderConfirmed` event carries the order total as a `Money` value object, the shipping address as an `Address` value object.

## Key Insights

The central insight about value objects is that they represent concepts where *what* something is matters, not *which one* it is. Fifty dollars is fifty dollars. There is no "this fifty dollars" versus "that fifty dollars." When a domain concept is like this — when instances with the same value are interchangeable — it should be a value object.

The second insight is that value objects are safer than entities. They cannot be corrupted by aliasing. They cannot cause unexpected side effects. They can be freely shared across threads. They are simpler to test (no state, no lifecycle). Preferring value objects over entities is not just a modeling preference — it is a software safety preference.

The third insight is that value objects carry domain logic, not just data. `Money.add()` enforces currency matching. `DateRange.overlaps()` implements a non-trivial algorithm. `PhoneNumber.normalize()` applies formatting rules. Putting this logic in the value object — where it belongs — removes it from service layers and application code, where it tends to be duplicated and drift.

If you find yourself asking "should this be a value object or an entity?" the answer is almost always: value object. Make it a value object, and only promote it to an entity if you discover a specific, concrete need for identity-based tracking. The cost of making something a value object when it should be an entity is low. The cost of making something an entity when it should be a value object — unnecessary database tables, broken equality semantics, unnecessary lifecycle management — is high.
