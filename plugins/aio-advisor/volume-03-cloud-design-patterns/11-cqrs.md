# CQRS — Command Query Responsibility Segregation

> "CQRS is simply the creation of two objects where there was previously only one. The separation occurs based upon whether the methods are a command or a query." — Greg Young

## The Problem

Your e-commerce application has a single `OrderService` class that does everything: place orders, cancel orders, fetch order by ID, list orders for a customer, generate order reports, show the order dashboard. It reads from and writes to the same `orders` table. This is the natural way to build things, and for most applications it works well.

Then you notice something: the read patterns and write patterns have completely different characteristics. Writes are transactional, carefully validated, low-volume relative to reads. Reads are high-volume, often need data from multiple joined tables, need to be fast, and have diverse shapes — the customer-facing "my orders" page needs different fields than the operations dashboard, which needs different fields than the analytics report. The single `orders` table optimized for writes (normalized, indexed for write performance) serves reads poorly. Adding indexes for every read pattern degrades write performance. Denormalizing for reads corrupts the normalized write model.

Beyond performance, there's a complexity problem. The same `OrderService` that handles the carefully validated `PlaceOrder` command also handles the `GetOrdersForDashboard` query that joins six tables and applies a complex set of filters. These two responsibilities have nothing to do with each other. They evolve independently, have different performance characteristics, and should be tested independently. But they're entangled in the same service and the same data model.

CQRS — Command Query Responsibility Segregation — separates these concerns at the model level. Commands (operations that change state) use a write model optimized for consistency and validation. Queries (operations that read state) use a read model optimized for the specific query patterns. They can use different storage technologies, scale independently, and evolve without affecting each other.

## Core Concept

CQRS separates the model used for reading data from the model used for updating data. At its simplest, this is just two classes in your application: one for commands, one for queries, sharing the same database. At its most complex, it's entirely separate databases, asynchronous synchronization via events, and specialized read stores (search engines, graph databases, caches) per read use case.

```
TRADITIONAL (single model):
         ┌──────────────────────────────┐
         │         OrderService         │
         │  placeOrder()               │
         │  cancelOrder()              │
         │  getOrder()                 │
         │  listOrdersForCustomer()    │
         │  getOrderDashboard()        │
         └───────────────┬─────────────┘
                         │ read/write
                         ▼
                  ┌────────────┐
                  │  Database  │
                  │ (one model)│
                  └────────────┘

CQRS (separated models):
  Commands                        Queries
     │                               │
     ▼                               ▼
┌──────────┐                  ┌──────────────┐
│ Command  │                  │ Query        │
│ Handler  │                  │ Handler      │
│          │                  │              │
│ Validate │                  │ Read-        │
│ Execute  │                  │ optimized    │
│ Events   │                  │ model        │
└────┬─────┘                  └──────┬───────┘
     │ write                         │ read
     ▼                               ▼
┌──────────┐   sync (sync or    ┌──────────────┐
│  Write   │   async via events)│  Read Store  │
│  Store   │──────────────────▶│  (denorm,    │
│ (normal) │                   │  projected)  │
└──────────┘                   └──────────────┘
```

### Two levels of CQRS

**Level 1: Same database, separated models in code.** This is the entry-level CQRS. One database, but the command side uses a normalized write model and the query side uses raw SQL or a separate read model class. No async sync needed. Most applications that "need CQRS" actually only need this level.

**Level 2: Separate databases, async synchronization.** The command side writes to the write database (PostgreSQL, normalized). Events are published. Event handlers update the read databases (Redis for fast lookups, Elasticsearch for full-text search, materialized views for reporting). Eventually consistent. Complex. Justified only when the scaling or query optimization requirements genuinely require separate stores.

The critical error is jumping straight to Level 2 without establishing whether Level 1 solves the problem. Most do.

## Deep Dive

**The origin of the pattern: Bertrand Meyer's CQS principle.** CQRS derives from Bertrand Meyer's Command-Query Separation (CQS) principle, formulated in *Object-Oriented Software Construction*: every method should either be a command that changes state or a query that returns state, but not both. Greg Young's contribution was to apply this principle at the architectural level — not just within a single object, but across the read and write paths of an entire service. Martin Fowler's essay on CQRS (2011) contextualizes this: the value of separation at the architectural level comes not from the principle itself but from the asymmetry it enables. Read models and write models have fundamentally different requirements — reads are typically much more frequent, tolerate eventual consistency, and benefit from denormalization; writes require transactional consistency and benefit from a normalized domain model. Separating them allows each to be optimized independently.

**The event sourcing connection and why it is optional.** A common misunderstanding documented by both Fowler and Kleppmann is treating CQRS as inseparable from event sourcing. They are independent patterns that compose well but do not require each other. Martin Kleppmann's *Designing Data-Intensive Applications* analysis of derived data shows why the combination is attractive: with event sourcing, the write model produces an immutable log of events; CQRS read models are derived by projecting that log into query-optimized representations. New read models can be built by replaying the log from the beginning — a powerful capability. But Level 1 CQRS (same database, separate code paths) provides substantial value without event sourcing: separate query handlers can bypass the domain model entirely, using raw SQL with denormalized joins to serve specific read use cases at full database speed. The complexity of event sourcing is only justified when the ability to rebuild projections or add new ones from historical events is a real requirement.

**The read model as a materialized view problem.** Kleppmann's treatment of derived data in *DDIA* provides a precise framing for Level 2 CQRS: the read model is a materialized view, continuously updated as the write model changes. This is exactly the materialized view problem — the same consistency and staleness trade-offs apply. Kleppmann identifies two update strategies: synchronous (the write transaction also updates the read model, providing strong consistency at the cost of write-path complexity and latency) and asynchronous (the read model is updated by consuming events from the write model, providing eventual consistency with independent scalability). The asynchronous approach is common in CQRS implementations, but it introduces a window of inconsistency between write and read that must be explicitly designed for. Kleppmann's analysis of read-your-writes consistency is directly applicable: a user who submits a command and immediately queries the read model may see stale data if the read model has not yet been updated.

**The synchronization lag and user experience implications.** Sam Newman's *Building Microservices* addresses the practical user experience challenge of eventual consistency between write and read models. When a user places an order (write) and immediately views their order history (read), they expect to see the new order. If the read model synchronization is asynchronous and currently lagging by 2 seconds, the user sees the old state and may believe their order was lost. Newman's guidance: the application must handle this explicitly, either by optimistic UI updates (show the expected state immediately while the read model catches up), by querying the write model for the confirmation view (defeating the read scalability benefit for that one query), or by making the eventual consistency visible to the user (e.g., "Your order is being processed and will appear in your history shortly"). None of these is free — the choice depends on the acceptable user experience trade-off.

**Write model complexity as a warning sign.** Greg Young and Udi Dahan's writings on CQRS both caution against using the pattern to paper over a poorly designed domain model. If the write model is complex — if commands require fetching many aggregates to validate, if business rules are unclear, if the domain is not well-understood — CQRS will not simplify it. Kleppmann's treatment of domain modeling complexity applies: the write model in CQRS is where business invariants live, and invariants that span multiple aggregates require explicit handling (sagas, process managers) regardless of whether CQRS is used. The pattern's value is in scaling read access and enabling independent read model optimization — it does not address domain complexity on the write side, and introducing it prematurely creates two complex systems instead of one.

## Implementation Guide

### Step 1: Start with Level 1 — same database, separated code

```typescript
// Command side: normalized write model
class OrderCommandHandler {
  async handle(command: PlaceOrderCommand): Promise<void> {
    // Full domain validation
    const customer = await this.customerRepo.findById(command.customerId);
    if (!customer.isActive()) throw new CustomerInactiveError(command.customerId);
    
    const items = await this.validateAndEnrichItems(command.items);
    const order = Order.create({ customerId: command.customerId, items });
    
    await this.orderRepo.save(order); // normalized write model
    await this.eventBus.publish(new OrderPlacedEvent(order));
  }
}

// Query side: read-optimized, no domain model, returns DTOs
class OrderQueryHandler {
  async getOrdersForCustomer(customerId: string, page: number): Promise<OrderSummaryDto[]> {
    // Raw SQL — bypass the domain model entirely for reads
    const rows = await this.db.query(`
      SELECT 
        o.id,
        o.status,
        o.created_at,
        o.total_amount,
        COUNT(oi.id) as item_count,
        STRING_AGG(p.name, ', ') as item_names
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.customer_id = $1
      ORDER BY o.created_at DESC
      LIMIT 20 OFFSET $2
    `, [customerId, page * 20]);
    
    return rows.map(row => new OrderSummaryDto(row));
  }
  
  // Different query, different shape — no problem
  async getOrderDashboard(filters: DashboardFilters): Promise<DashboardData> {
    const rows = await this.db.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY 1
      ORDER BY 1
    `, [filters.from, filters.to]);
    
    return new DashboardData(rows);
  }
}
```

This is CQRS. No separate database, no async events, no eventual consistency. Just separated concerns.

### Step 2: Define commands as explicit intent objects

```typescript
// Commands are named intentions — always imperative verbs
class PlaceOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly items: OrderItemRequest[],
    public readonly shippingAddress: Address,
    public readonly paymentMethodId: string,
  ) {}
}

class CancelOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly requestedBy: string,
    public readonly reason: CancellationReason,
  ) {}
}

// Command bus routes commands to handlers
interface CommandBus {
  dispatch<TResult>(command: unknown): Promise<TResult>;
}

// Handler registration
commandBus.register(PlaceOrderCommand, new PlaceOrderCommandHandler(deps));
commandBus.register(CancelOrderCommand, new CancelOrderCommandHandler(deps));
```

### Step 3: Define queries as explicit data request objects

```typescript
// Queries are named data requests — always nouns or questions
class GetOrderByIdQuery {
  constructor(public readonly orderId: string) {}
}

class GetCustomerOrderHistoryQuery {
  constructor(
    public readonly customerId: string,
    public readonly pagination: PaginationParams,
    public readonly filters: OrderFilters,
  ) {}
}

// Query bus routes queries to handlers
interface QueryBus {
  execute<TResult>(query: unknown): Promise<TResult>;
}

queryBus.register(GetOrderByIdQuery, new GetOrderByIdQueryHandler(db));
queryBus.register(GetCustomerOrderHistoryQuery, new GetCustomerOrderHistoryHandler(db));
```

### Step 4: Add Level 2 only when justified

When Level 1 is insufficient (typically because read queries are too slow against the write database, or you need different storage technologies for different read patterns):

```typescript
// Event handler that updates a read model when orders change
class OrderReadModelProjector {
  constructor(
    private readonly readDb: Redis, // different store for fast reads
    private readonly searchIndex: ElasticsearchClient,
  ) {}
  
  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    // Denormalized read model for "my orders" page
    await this.readDb.setex(
      `customer:${event.customerId}:orders`,
      3600,
      JSON.stringify(await this.buildOrderSummary(event)),
    );
    
    // Searchable order for operations dashboard
    await this.searchIndex.index({
      index: 'orders',
      id: event.orderId,
      body: await this.buildSearchDocument(event),
    });
  }
  
  async onOrderShipped(event: OrderShippedEvent): Promise<void> {
    // Update both read models
    await this.updateOrderSummary(event.orderId, { status: 'shipped' });
    await this.updateSearchDocument(event.orderId, { status: 'shipped' });
  }
}
```

### Step 5: Handle read model consistency

Level 2 CQRS introduces eventual consistency. Reads may see stale data between the write committing and the read model updating:

```typescript
// After a write, the UI might need the updated data immediately
// Option 1: Return the result from the command (break pure CQRS)
async placeOrder(command: PlaceOrderCommand): Promise<OrderId> {
  const order = await this.commandHandler.handle(command);
  return order.id; // return ID so client can display confirmation
}

// Option 2: Client polls until read model catches up (for async flows)
// Option 3: Command side updates a "pending" read model synchronously,
//           and the async projection updates it when events are processed

// Option 4: Accept the staleness and tell the user
// "Your order has been placed. It may take a moment to appear in your order history."
```

Decide explicitly which approach you will use. Don't let the eventual consistency surprise your users.

## When to Use

**Read and write performance requirements diverge significantly.** When you need different indexes, different data shapes, or different storage technologies for reads versus writes, Level 2 CQRS pays off. If your OLTP write patterns and OLAP read patterns are genuinely incompatible in one database, separate them.

**Read throughput vastly exceeds write throughput.** If you have 1,000 reads per second and 10 writes per second, the read model can be independently scaled and optimized without affecting write performance.

**Multiple read models needed for the same data.** When the same data must be presented in radically different shapes for different consumers (customer view vs operations view vs analytics view), separate read model projections per use case are cleaner than a single God query that tries to serve all of them.

**Complex domain logic on the write side that has nothing to do with reads.** When the write side has rich domain validation and business logic that is irrelevant to reads, separating them reduces cognitive load and makes the write side easier to test in isolation.

**Event Sourcing as the write store.** If you're using Event Sourcing (Volume 03, article 13), CQRS is a natural companion. The write side stores events; the read side projects events into query-optimized views.

## When NOT to Use

**For simple CRUD applications.** If your application is mostly create, read, update, delete — without complex domain logic — CQRS adds overhead without benefit. A single service with a single model is correct for simple data management.

**When eventual consistency creates business problems.** If your business requires that a user who just placed an order immediately sees it in their order history with no delay, Level 2 CQRS is the wrong choice. Either use Level 1 (same database) or accept and communicate the staleness.

**As an upfront architectural decision for a new system.** CQRS solves real scaling and complexity problems. Start with a simple model; extract CQRS when you hit those problems. Applying CQRS from day one adds complexity to a system that doesn't yet have the problems CQRS solves.

**Microsoft's explicit warning**: "Don't apply CQRS to a system as a top-level architecture unless you really need it. Applying it in the wrong situation adds unnecessary complexity." This warning is from the organization that popularized the pattern. Take it seriously.

**When the team isn't familiar with eventual consistency trade-offs.** Level 2 CQRS requires careful handling of eventual consistency: stale reads, compensation for read model failures, projection replay. If the team hasn't worked with these before, the operational burden is significant.

## Common Mistakes

**Mistake 1: Applying CQRS everywhere.** CQRS is an optimization for specific problems. Applying it to every service, every aggregate, every entity creates complexity without benefit. Use it selectively where the write and read patterns genuinely diverge.

**Mistake 2: Skipping Level 1 and going straight to Level 2.** The vast majority of applications that "need CQRS" only need Level 1 — separate classes, same database. The performance of a raw SQL query against a well-indexed PostgreSQL table is enormous. Exhaust Level 1 options before adding separate databases and async projections.

**Mistake 3: Commands that return domain objects.** A command should return minimal data — perhaps an ID, perhaps nothing. Returning a full domain object from a command mixes the write model into the read concern. If the caller needs to show the user the created entity, return the ID and let the UI issue a query.

**Mistake 4: Putting business logic in query handlers.** Query handlers retrieve and shape data. They do not apply business rules. If you find yourself writing validation logic in a query handler, that logic belongs in the write model.

**Mistake 5: Not planning for projection failures.** In Level 2 CQRS, the read model is updated by event handlers. Event handlers fail. Networks fail. The read model gets out of sync. You need a strategy for detecting sync failures, alerting, and replaying events to repair the read model.

## Connections

**Event Sourcing** (Volume 03, article 13): CQRS and Event Sourcing are frequently combined but are independent patterns. Event Sourcing stores the write side as an immutable event log. CQRS uses those events to build read models. Together they form a powerful but complex architecture — use both only when you need both.

**Choreography Pattern** (Volume 03, article 06): In Level 2 CQRS, events published by the command side drive the choreography that updates read models. Each read model projector subscribes to relevant events.

**Cache-Aside Pattern** (Volume 03, article 05): Read model results can be cached. A Level 1 CQRS query handler that runs an expensive SQL query can cache its result; the command side invalidates the cache on write.

**Compensating Transaction** (Volume 03, article 10): In saga workflows, CQRS read models provide the state visibility needed to determine which compensation steps are needed.

**Backends for Frontends** (Volume 03, article 03): BFF and CQRS are complementary. The BFF can use different CQRS query handlers optimized for each frontend's read patterns.

## Key Insights

1. **Level 1 CQRS solves most problems.** Separate command and query handlers against the same database. This alone gives you separated concerns, independently evolvable read and write models, and the ability to optimize reads without affecting writes. Go here first.

2. **CQRS is not an all-or-nothing architectural style.** Apply it to aggregates or bounded contexts that have the relevant problems. Leave the rest of the system simple. Microsoft's guidance is explicit: it's a pattern for parts of a system.

3. **Commands express intent; queries express data needs.** This semantic distinction guides design. A command like `CancelOrder` expresses a business intention. A query like `GetOrderDetails` expresses a data need. They have different validation, different error handling, and different performance characteristics.

4. **Eventual consistency is a feature when it's acceptable and a bug when it's not.** Be explicit about which read models are eventually consistent and what the staleness bound is. Communicate this to users. "May take a moment to appear" is acceptable for non-critical reads; not acceptable for data the user just wrote.

5. **Greg Young's original statement is the best summary.** "CQRS is simply the creation of two objects where there was previously only one." Don't over-complicate it. Two classes, separated responsibilities. Everything else is an optional extension.

6. **Read model projections are the operational burden of Level 2.** They fail, get out of sync, need replay, need monitoring. Budget for this operational overhead. It's not a one-time cost.

7. **Test commands and queries separately.** Command tests verify that state is changed correctly. Query tests verify that the right data is returned. They don't need to be tested together. This is one of the key practical benefits of separation.
