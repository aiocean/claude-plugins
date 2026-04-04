# Repositories — The Persistence Illusion

> "A repository represents all objects of a certain type as a conceptual set. It acts like a collection, except with more elaborate querying capability... For each type of object that needs global access, create an object that can provide the illusion of an in-memory collection of all objects of that type." — Eric Evans, Domain-Driven Design

## The Problem

A team building an order management system has a perfectly designed domain model: rich `Order` aggregates with behavioral methods, well-defined value objects, clean entity boundaries. Then they start connecting it to a database. The domain logic in `Order.fulfill()` suddenly becomes entangled with JDBC calls. JPA annotations invade the domain classes. A `@OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)` annotation appears on the `lineItems` field — leaking ORM concerns directly into the domain model.

Worse, developers start writing SQL queries anywhere they need data: in controllers, in service classes, in batch jobs. Each query makes assumptions about the database schema. When the schema changes, queries break across the codebase. When business rules about which orders are "fulfillable" change, the filtering logic is scattered across a dozen `WHERE` clauses in a dozen files.

The domain model's job is to express business concepts and rules. When persistence concerns intrude into the domain model, the model's expressive clarity degrades. When query logic is scattered, business rules encoded in queries become impossible to find, maintain, or test.

The Repository pattern solves this by creating a clean separation: the domain model works with in-memory objects, pretending that persistence doesn't exist. The repository provides the illusion that all objects of a given type are in memory, while internally handling all the messy details of loading from and saving to a database.

## Core Concept

A Repository provides a mechanism for encapsulating storage, retrieval, and search behavior which emulates a collection of objects. From the domain model's perspective, a repository is a collection — you add objects to it, remove objects from it, and query it for objects that match certain criteria. The fact that the collection is backed by a relational database, a document store, or an in-memory hash map is an implementation detail hidden by the repository.

Three principles define a proper repository:

**One repository per aggregate root**: Repositories work at the aggregate level, not at the entity level. There is one `OrderRepository`, not an `OrderRepository` plus a `LineItemRepository` plus a `ShippingAddressRepository`. The repository loads and saves the entire aggregate — root plus all children — as a unit. This enforces the aggregate's consistency boundary in the persistence layer.

**Interface in the domain, implementation in the infrastructure**: The repository interface belongs to the domain layer. It is defined using domain types: `findById(OrderId id)`, `findByCustomer(CustomerId customerId)`, `findPendingFulfillment()`. The implementation — which uses JPA, JDBC, MongoDB, or whatever storage technology — belongs to the infrastructure layer. The domain model depends on the interface, not the implementation.

**Collection semantics**: A repository should feel like a collection. `add(order)` stores an order. `remove(orderId)` deletes it. `findById(id)` retrieves it. The repository hides whether storage is in-memory or on-disk. This makes the domain model testable without a database: substitute an in-memory repository implementation in tests.

Repositories are **not** the same as DAOs (Data Access Objects). A DAO is a thin wrapper around database operations — it maps objects to SQL. A repository is a domain-level abstraction — it provides collection semantics and knows nothing about SQL, tables, or columns. A DAO exposes `findByLastName(String lastName)` (database column perspective). A repository exposes `findCustomersInArrears()` (domain concept perspective).

## Deep Dive

Evans' description of the repository as providing "the illusion of an in-memory collection" is one of the most useful framings in the DDD canon because it gives a concrete testability criterion. If a repository is correctly implemented, you should be able to substitute an in-memory implementation — a simple map from IDs to objects — and have all domain logic tests pass unchanged. The domain logic should have no awareness that persistence exists. If your domain tests require a real database or a complex mock of database-specific behavior, the domain logic has leaked infrastructure concerns, and the repository abstraction is failing.

The distinction Evans drew between a repository and a DAO (Data Access Object) is worth dwelling on because it is routinely collapsed in practice. A DAO is a thin persistence layer: it translates between objects and rows, but the interface it presents is shaped by the database. `findByLastName(String name)` is a DAO method — it names a database column, not a domain concept. A repository presents a collection interface shaped by the domain. `findCustomersWithOverduePayments()` is a repository method — it names a business concept that happens to translate into a database query. The difference is where the abstraction lives: the DAO abstracts the database technology; the repository abstracts the existence of a database entirely. Evans was clear that the repository interface belongs in the domain layer and should have no technical vocabulary in it.

The "one repository per aggregate root" rule has an important corollary that is easy to miss: you do not create repositories for non-root entities within an aggregate. If `Order` is an aggregate root and `OrderItem` is an entity inside the aggregate, there is `OrderRepository` but no `OrderItemRepository`. This is not an oversight — it enforces the aggregate boundary. If you can load an `OrderItem` independently via a repository, you can also modify it independently, which violates the aggregate's consistency guarantees. The aggregate root is the only entry point into the aggregate, and the repository enforces this by being the only path to any object within the aggregate boundary.

Vernon extended Evans' treatment by addressing the query method naming problem more systematically in the Red Book. He argued that repository query methods should be named in the domain's Ubiquitous Language, not in terms of the database predicates they implement. The difference between `findByStatus(OrderStatus.PENDING)` and `findPendingFulfillment()` is not just stylistic: the first encodes a database filter; the second encodes a business concept. If the definition of "pending fulfillment" changes — say, orders that have been placed for more than 24 hours and have cleared payment checks — you change the query inside `findPendingFulfillment()` without changing the method signature. With `findByStatus()`, you must either change the caller or add a new query method, because the caller has encoded the business rule by choosing which status value to pass. The method name is part of the Ubiquitous Language and should express intent, not implementation.

The Microsoft .NET Microservices Architecture guide provides the fullest treatment of the repository pattern's relationship to Unit of Work in the eShopOnContainers application. The guide shows `IOrderRepository` defined in the domain layer with methods named in domain terms, implemented in the infrastructure layer using Entity Framework Core, and coordinated through a Unit of Work that ensures multiple repository operations within a single use case commit atomically. The guide explicitly cautions against a common misuse pattern: creating a "generic repository" that exposes `IQueryable<T>` to callers. An `IQueryable<T>` repository is not a repository — it is a transparent database access layer that leaks the ORM into the domain. The whole point of the repository is to hide the query mechanism. When callers can compose arbitrary LINQ queries against the repository, they are bypassing the abstraction and writing database queries in the application layer, which is precisely what the pattern was designed to prevent. The guide recommends specific query methods with domain names over any form of generic query composition.

## Implementation Guide

**Step 1: Define the Repository Interface in the Domain Layer**

The repository interface is a domain concept. It uses domain language: domain types, domain query concepts.

```java
// In the domain layer — no persistence dependencies
public interface OrderRepository {
    void add(Order order);
    void remove(OrderId orderId);
    Optional<Order> findById(OrderId orderId);
    List<Order> findByCustomer(CustomerId customerId);
    List<Order> findPendingFulfillment(); // domain concept, not SQL
    List<Order> findPlacedAfter(Instant timestamp);
}
```

Note the naming: `findPendingFulfillment()` not `findByStatusAndFulfillmentDateIsNull()`. The repository method name is a domain concept. The implementation translates this into whatever SQL or NoSQL query is appropriate.

**Step 2: Implement in the Infrastructure Layer**

The implementation has all the messy persistence details:

```java
// In the infrastructure layer — JPA/JDBC/whatever
public class JpaOrderRepository implements OrderRepository {
    private final EntityManager em;
    private final OrderMapper mapper;
    
    @Override
    public void add(Order order) {
        OrderJpaEntity entity = mapper.toJpa(order);
        em.persist(entity);
    }
    
    @Override
    public Optional<Order> findById(OrderId orderId) {
        OrderJpaEntity entity = em.find(OrderJpaEntity.class, orderId.toString());
        return Optional.ofNullable(entity).map(mapper::toDomain);
    }
    
    @Override
    public List<Order> findPendingFulfillment() {
        // The SQL is here, not in the domain
        return em.createQuery(
            "SELECT o FROM OrderJpaEntity o WHERE o.status = 'PLACED' " +
            "AND o.fulfillmentDate IS NULL ORDER BY o.placedAt ASC",
            OrderJpaEntity.class
        )
        .getResultList()
        .stream()
        .map(mapper::toDomain)
        .toList();
    }
}
```

The domain model only sees the interface. The SQL, the JPA entity mapping, the eager/lazy loading decisions — all isolated in the infrastructure layer.

**Step 3: Separate JPA Entities from Domain Entities**

A critical decision: should the domain model's `Order` class be the same class that JPA persists? The answer is usually no. JPA annotations (or Hibernate configurations) introduce infrastructure concerns into the domain class. Separate them.

```java
// Domain entity — pure domain logic
public class Order {
    private final OrderId id;
    private CustomerId customerId;
    private List<LineItem> lineItems;
    private OrderStatus status;
    
    // Behavioral methods, domain logic, domain events
    public void addLineItem(ProductId productId, Quantity qty, Money price) { ... }
    public void fulfill() { ... }
}

// JPA entity — persistence concern
@Entity
@Table(name = "orders")
public class OrderJpaEntity {
    @Id
    private String id;
    
    @Column(name = "customer_id")
    private String customerId;
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LineItemJpaEntity> lineItems;
    
    @Enumerated(EnumType.STRING)
    private OrderStatus status;
}

// Mapper — translates between the two
public class OrderMapper {
    public Order toDomain(OrderJpaEntity entity) {
        return Order.reconstitute(
            OrderId.of(entity.getId()),
            CustomerId.of(entity.getCustomerId()),
            entity.getLineItems().stream().map(this::lineItemToDomain).toList(),
            entity.getStatus()
        );
    }
    
    public OrderJpaEntity toJpa(Order order) {
        // ...
    }
}
```

This dual-model approach adds mapping code but achieves a clean separation: the domain class can be refactored freely without touching the database schema. The database schema can be changed without touching the domain class. The mapper is the explicit translation boundary.

**Step 4: In-Memory Repository for Testing**

One of the biggest benefits of the repository pattern is testability. Implement an in-memory version for tests:

```java
public class InMemoryOrderRepository implements OrderRepository {
    private final Map<OrderId, Order> store = new HashMap<>();
    
    @Override
    public void add(Order order) {
        store.put(order.id(), order);
    }
    
    @Override
    public void remove(OrderId orderId) {
        store.remove(orderId);
    }
    
    @Override
    public Optional<Order> findById(OrderId orderId) {
        return Optional.ofNullable(store.get(orderId));
    }
    
    @Override
    public List<Order> findPendingFulfillment() {
        return store.values().stream()
            .filter(order -> order.status() == OrderStatus.PLACED)
            .filter(order -> order.fulfillmentDate().isEmpty())
            .sorted(Comparator.comparing(Order::placedAt))
            .toList();
    }
}
```

Domain logic tests use `InMemoryOrderRepository`. No database, no transactions, no JPA. Tests run in milliseconds.

```java
class OrderFulfillmentServiceTest {
    private final OrderRepository repository = new InMemoryOrderRepository();
    private final FulfillmentService service = new FulfillmentService(repository);
    
    @Test
    void shouldFulfillPendingOrders() {
        Order order = Order.create(customerId, items);
        order.place();
        repository.add(order);
        
        service.fulfillPendingOrders();
        
        Order fulfilled = repository.findById(order.id()).orElseThrow();
        assertThat(fulfilled.status()).isEqualTo(OrderStatus.FULFILLED);
    }
}
```

**Step 5: Query Specifications**

When query logic is complex or reusable, extract it into Specification objects (covered in the next article). The repository can accept specifications:

```java
public interface OrderRepository {
    List<Order> findBy(OrderSpecification specification);
}

// Usage
List<Order> overdueOrders = orderRepository.findBy(
    OrderSpecification.placed().and(OrderSpecification.olderThan(Duration.ofDays(7)))
);
```

This keeps complex query logic in the domain layer (as specification objects) while keeping the implementation in the repository.

**Step 6: Avoid Generic Repository Anti-Pattern**

Generic repositories — `Repository<T>` with methods like `findAll()`, `save(T entity)`, `deleteById(ID id)` — are a popular abstraction but a DDD anti-pattern. They focus on technical CRUD operations, not on domain query concepts. They expose `findAll()` to callers who should never load all entities. They don't provide named domain query methods like `findPendingFulfillment()`.

```java
// ANTI-PATTERN: Generic repository
public interface Repository<T, ID> {
    T findById(ID id);
    List<T> findAll();
    T save(T entity);
    void delete(ID id);
}

// Spring Data JpaRepository is a popular form of this anti-pattern
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Fine for simple cases; loses domain semantics for complex ones
}
```

The generic repository is not inherently evil for simple CRUD applications. But for rich domain models, it puts query concerns in the wrong place — callers use `findAll()` and filter in memory, or write ad-hoc queries scattered across the application. The domain-specific repository with named methods is more expressive and more maintainable.

## When to Use / When NOT to Use

**Use Repositories when**:
- You have a rich domain model with aggregates
- You want to test domain logic without a database
- Multiple parts of the application need to query the same aggregates
- You want to change the persistence technology without affecting the domain model

**The Repository pattern is less valuable when**:
- Your application is essentially CRUD — the "domain model" is just data containers
- You're using an active record pattern (Rails, Django) where the model IS the persistence layer
- The query requirements are so simple that the abstraction overhead exceeds the benefit
- You're building a reporting/analytics system where queries are inherently SQL-heavy (use CQRS read models instead)

## Common Mistakes

**Mistake 1: Repository per entity, not per aggregate root**

`OrderRepository`, `LineItemRepository`, `ShippingAddressRepository`. Now callers can load a `LineItem` independently of its `Order`, bypassing the aggregate boundary. There must be no `LineItemRepository`. `LineItem` is loaded only as part of the `Order` aggregate.

**Mistake 2: Exposing persistence types through the repository**

A repository that returns `ResultSet`, `Cursor`, `QueryResult`, or JPA `Page<T>` has leaked persistence concerns into the domain. All return types should be domain types.

**Mistake 3: Putting query logic in callers**

```java
// Caller filtering — wrong
List<Order> allOrders = orderRepository.findAll();
List<Order> pending = allOrders.stream()
    .filter(o -> o.status() == PLACED && o.fulfillmentDate().isEmpty())
    .toList();
```

This loads all orders from the database, then filters in memory. For any non-trivial dataset, this is catastrophic for performance. The filtering logic should be in the repository method `findPendingFulfillment()`, translated to an efficient database query.

**Mistake 4: Repository as a catch-all for data access**

Some teams use the repository for reporting queries, bulk operations, and cross-aggregate joins. The repository is the home for aggregate retrieval, not for complex analytical queries. Complex queries belong in CQRS read models or dedicated query services.

**Mistake 5: Not having an in-memory implementation**

If you never build the in-memory repository, you never test your domain logic independently of the database. Your "unit tests" become integration tests that require a running database. The entire point of the repository's abstraction is to enable fast, isolated domain logic testing.

## Connections

**Aggregates**: One repository per aggregate root. The repository enforces aggregate boundaries by only loading and saving complete aggregates.

**Domain Services**: Domain services receive aggregates as parameters — they don't call repositories. The application service loads via repository, passes to domain service, saves via repository.

**Specifications**: Specification objects express domain query concepts. Repositories can accept specifications as query parameters, keeping complex query logic in the domain layer.

**CQRS**: For complex read-side queries, the repository pattern may be too restrictive. CQRS separates the read model (arbitrary queries against database views) from the write model (aggregate repositories). The repository pattern applies to the write side; query models or query services handle the read side.

**Value Objects**: Repositories use domain value objects as parameters and return types: `findById(OrderId id)` not `findById(String id)`. This type safety prevents programming errors and keeps the repository interface in domain language.

## Key Insights

The deepest insight about repositories is that they represent a deliberate choice about where persistence belongs in your architecture. By making the repository an interface defined in the domain layer, you declare that the domain model is primary and persistence is secondary. The domain model doesn't adapt to the database; the database implementation adapts to the domain model.

The second insight is that the in-memory illusion is not just a convenience — it is the repository's fundamental contract. From the domain model's perspective, all objects of a type exist in memory simultaneously. You don't "open connections" or "begin queries" — you ask the collection for objects that match criteria. This mental model makes domain code cleaner, more expressive, and more testable.

The third insight is about what the repository does NOT do. It does not provide reporting queries. It does not support bulk operations. It does not join across aggregates. It does not expose raw SQL. These limitations are features, not bugs — they force you to design explicitly for these access patterns (using CQRS read models, batch processors, or event projections) rather than using the aggregate repository as a general-purpose database access layer.

Treat the repository as a collection. Define its interface in domain language. Implement it in the infrastructure layer. Test the domain with the in-memory version. These four practices, applied consistently, produce domain models that are genuinely decoupled from their persistence mechanism — free to evolve, free to be tested, and free to be refactored.
