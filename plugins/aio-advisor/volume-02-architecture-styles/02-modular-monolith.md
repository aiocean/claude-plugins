# The Modular Monolith

> "Don't start with microservices. Monoliths are not the problem. Unstructured monoliths are the problem." — Sam Newman

## The Problem

The software industry spent the 2010s collectively convincing itself that microservices were the inevitable future and monoliths were the embarrassing past. Teams that built microservices from day one were praised for forward thinking. Teams still running monoliths apologized for their technical debt. The message was clear: decompose your system into small, independent services, or be left behind.

The hangover from this decade of microservices evangelism has been severe. Teams with five developers managing thirty-seven microservices. Distributed tracing systems more complex than the business logic they monitored. Engineers spending more time on inter-service communication, eventual consistency, and deployment pipelines than on features that actually serve customers. The dirty secret of the microservices revolution is that most teams adopted the operational complexity without gaining the scale benefits — because they never had the scale problem to begin with.

The modular monolith is the comeback story. It is what disciplined engineering looks like when you resist the hype and actually think about what your team needs. A single deployable unit — one process, one deployment pipeline, one debugging session — combined with strict internal boundaries that give you the modularity benefits without the distributed systems tax. Companies like Shopify, Stack Overflow, and Basecamp have run their businesses on modular monoliths at serious scale, and they do not apologize for it. They optimized for shipping features, not for architecture awards.

## Core Concept

A modular monolith is a single-process application with explicit, enforced module boundaries. Each module owns its business domain entirely: its code, its data schema, its business rules. Modules communicate with each other through defined public interfaces. No module reaches into another module's internals.

```
┌──────────────────────────────────────────────────────────┐
│                    Single Process                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Catalog    │  │    Orders    │  │   Payments   │   │
│  │   Module     │  │    Module    │  │    Module    │   │
│  │              │  │              │  │              │   │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │   │
│  │ │  Domain  │ │  │ │  Domain  │ │  │ │  Domain  │ │   │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │   │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │   │
│  │ │   Data   │ │  │ │   Data   │ │  │ │   Data   │ │   │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │   │
│  │              │  │              │  │              │   │
│  │  Public API  │  │  Public API  │  │  Public API  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │           │
│         └─────────────────┴─────────────────┘           │
│                    Internal Bus                          │
└──────────────────────────────────────────────────────────┘
         ↓                  ↓                  ↓
    Catalog DB          Orders DB          Payments DB
    (schema)            (schema)           (schema)
```

The critical word is "enforced." Anyone can create folders named after modules and call the result a modular monolith. The discipline that makes it real is that crossing a module boundary requires going through the public interface — never importing internal types, never querying another module's database tables, never calling private functions directly.

### The Three Rules of Module Boundaries

**Rule 1: High cohesion within.** Everything related to a bounded context lives inside that module. The Order module contains order entities, order services, order repositories, order events, and order API handlers. Nothing about orders leaks outside; nothing about other domains leaks inside.

**Rule 2: Loose coupling between.** Modules communicate only through their public interfaces. These interfaces are stable contracts. They change infrequently. They are versioned. Other modules depend on the contract, never on the implementation.

**Rule 3: Independent data ownership.** Each module owns its database schema. No module queries another module's tables directly. If the Orders module needs customer information from the Customers module, it calls the Customers module's API or subscribes to Customers module events. This is the hardest rule to enforce and the most important.

### Module Communication Patterns

Modules in a modular monolith communicate through three mechanisms:

**Direct method calls via public interface**: The Orders module calls `CustomerService.getCustomer(id)` — a method on the public interface of the Customers module. This is synchronous, simple, and appropriate when you need a response immediately.

```typescript
// Public interface (owned by Customers module)
export interface CustomerService {
  getCustomer(id: CustomerId): Promise<CustomerSummary>;
  getCustomerShippingAddress(id: CustomerId): Promise<Address>;
}

// Orders module uses this interface
class OrderCreationService {
  constructor(private customers: CustomerService) {}
  
  async createOrder(customerId: string, items: OrderItem[]): Promise<Order> {
    const customer = await this.customers.getCustomer(new CustomerId(customerId));
    // create order using customer data
  }
}
```

**Domain events via internal event bus**: The Orders module publishes an `OrderCompleted` event. The Inventory module subscribes and decrements stock. The Notifications module subscribes and sends a confirmation email. No module knows who is listening. This is the pattern to reach for when you want to add behavior without modifying existing modules.

```typescript
// Orders module publishes
eventBus.publish(new OrderCompletedEvent(order.id, order.customerId, order.items));

// Inventory module subscribes (independently)
eventBus.subscribe(OrderCompletedEvent, async (event) => {
  await this.decrementStock(event.items);
});

// Notifications module subscribes (independently)
eventBus.subscribe(OrderCompletedEvent, async (event) => {
  await this.sendConfirmationEmail(event.customerId, event.orderId);
});
```

**Shared kernel**: A small set of truly shared concepts — value objects like `Money`, `Address`, `CustomerId` — can live in a shared module. This should be kept minimal. Every addition to the shared kernel creates coupling between all modules that use it.

## Deep Dive

### The Intellectual Case Against Premature Decomposition

Domain-Driven Design, as articulated by Eric Evans in his foundational text and elaborated by Vaughn Vernon in "Implementing Domain-Driven Design," provides the conceptual framework that explains why modular monoliths work and why premature microservices decomposition so often fails. The core DDD insight is that software boundaries should follow *domain boundaries* — the lines where the business itself has distinct concepts, distinct vocabularies, and distinct teams of people. When developers decompose services before those domain boundaries are well understood, they draw lines through the middle of concepts that the business treats as coherent, and the resulting services are forced to communicate constantly because they share domain concerns.

The modular monolith is the DDD-native architecture precisely because modules can be refactored as domain understanding deepens. The "Software Engineering at Google" book addresses this as a general principle about code organization: the right unit of modularity is determined by the problem domain, not by the deployment topology. Modules in a monolith can be merged, split, and renamed as understanding evolves. Services in a distributed system carry migration costs — data ownership, API versioning, deployment coordination — that make boundary corrections expensive and therefore rare. Teams that choose the modular monolith are, in effect, preserving their option value: they are not committing to service boundaries until those boundaries have proven stable.

### What the AWS Well-Architected Framework Says About Coupling

The AWS Well-Architected Framework's operational excellence pillar contains a principle that applies directly to the modular monolith vs. microservices question: "annotate and document" and "make frequent, small, reversible changes." The Framework observes that systems with high coupling between components have the property that changes become large and irreversible — a change to a shared database schema is large (affects every service that queries it) and irreversible (cannot be rolled back without coordinating all services). The modular monolith addresses this by localizing coupling to module boundaries that are explicit, enforced, and documented.

The Builder's Library essay "Avoiding insurmountable queue backlogs" makes a point that generalizes beyond its specific topic: operational problems are always easier to diagnose and resolve when the unit of failure is small and its boundaries are well-defined. In a modular monolith, a crash is a crash of one process, with one stack trace, in one log stream. The diagnostic surface is small. The Well-Architected Framework's reliability pillar's emphasis on "understanding failure modes" is much easier to satisfy in a single-process system with clear module boundaries than in a distributed system where failures can cascade across service boundaries in ways that are difficult to trace.

### Domain-Driven Design and the Bounded Context as the Unit of Modularity

Evans's concept of the bounded context — the context within which a particular domain model is defined and applicable — maps with near-perfect correspondence to the module in a modular monolith. Within a bounded context, words have unambiguous meanings: "order" means one specific thing, "customer" means one specific thing. Across bounded context boundaries, the same word may mean different things to different contexts, and translation is required. This translation layer is exactly what a module's public API provides: it converts from one bounded context's vocabulary to another's, ensuring that each module can evolve its internal model independently.

The "Software Engineering at Google" book's chapter on "Code Organization" articulates a principle that reinforces this: code should be organized to minimize the cognitive load of working within it. When a developer is working on the Orders module, they should be able to understand the relevant code without needing to understand the Payments module or the Catalog module. This locality of understanding — what Kent C. Dodds calls "locality of behavior" — is what bounded context boundaries provide, and what a well-structured modular monolith enforces through its module contracts.

The Microsoft .NET Architecture guides, particularly the guidance on "Domain-Driven Design: Tackling Complexity in the Heart of Software," make the practical connection explicit: bounded contexts implemented as modules within a monolith give teams the domain isolation of microservices without requiring the operational infrastructure of a distributed system. The guides note that this is not a compromise or a temporary state on the path to microservices — it is an appropriate permanent architecture for systems where the scale and team autonomy requirements do not justify distributed deployment.

### The Reversibility Principle and Future Optionality

The "Software Engineering at Google" book devotes a chapter to "Sustainability and the Beyoncé Rule" — the principle that changes to a shared codebase must not break things that other teams depend on. The parallel to modular monolith architecture is direct: a module's public interface is a shared dependency. Teams that change their module's public interface break consumers. Teams that discipline themselves to maintain stable public interfaces and evolve only internal implementation details preserve the independent evolvability that makes the modular monolith productive.

This discipline also preserves optionality. The AWS Well-Architected Framework's guidance on architecture evolution emphasizes "design for change" — making decisions reversible wherever possible. A modular monolith with rigorous module boundaries is maximally reversible: each module can be extracted to a microservice when there is a genuine operational or scaling reason to do so, because the module already has the characteristics of a service (independent data ownership, stable public API, event-based communication for side effects). The extraction becomes a deployment topology change rather than an architectural redesign. Teams that go directly to microservices before understanding their domain lose this optionality — bad service boundaries are expensive to correct, and the sunk cost of the distributed infrastructure makes consolidation psychologically difficult even when it would be the right technical decision.

## Implementation Guide

### Step 1: Define module boundaries by business domain

Do not start with technical layers. Start with the business. Identify the bounded contexts — the areas of the business that have their own vocabulary, their own rules, and their own lifecycle. In an e-commerce system:

- **Catalog**: Products, categories, pricing, search
- **Orders**: Cart, checkout, order lifecycle, fulfillment
- **Customers**: Registration, profiles, addresses, preferences
- **Payments**: Payment methods, transactions, refunds
- **Inventory**: Stock levels, warehouse locations, reservations
- **Notifications**: Email, SMS, push notification dispatch

Each of these becomes a module. The boundaries are not arbitrary — they reflect where the business actually has distinct concepts and distinct teams of people who own those concepts.

### Step 2: Create the folder structure and enforce it

```
src/
├── modules/
│   ├── catalog/
│   │   ├── public/          ← only this is visible outside the module
│   │   │   ├── CatalogService.ts
│   │   │   ├── ProductSummary.ts
│   │   │   └── index.ts
│   │   ├── internal/        ← private to the module
│   │   │   ├── domain/
│   │   │   ├── persistence/
│   │   │   └── api/
│   │   └── catalog.module.ts
│   ├── orders/
│   │   ├── public/
│   │   ├── internal/
│   │   └── orders.module.ts
│   └── payments/
│       ├── public/
│       ├── internal/
│       └── payments.module.ts
├── shared/                  ← minimal shared kernel
│   ├── Money.ts
│   ├── Address.ts
│   └── events/
└── app.ts
```

Add linting rules to enforce that imports from `internal/` are only allowed from within the same module. In TypeScript, eslint-plugin-boundaries does this. In Java, ArchUnit. In Go, depguard.

### Step 3: Design the public API for each module

Every module's public interface should be:
- **Minimal**: Expose only what other modules genuinely need
- **Stable**: Changes to the public API require coordination; internal changes are free
- **Domain-language**: Return types should be business concepts, not database entities

```typescript
// catalog/public/index.ts
export interface CatalogService {
  getProduct(id: ProductId): Promise<ProductSummary | null>;
  searchProducts(query: SearchQuery): Promise<PaginatedResult<ProductSummary>>;
  checkProductAvailability(id: ProductId, quantity: number): Promise<boolean>;
}

export interface ProductSummary {
  id: string;
  name: string;
  price: Money;
  category: string;
  imageUrl: string;
}

// NOT exported: ProductEntity, CatalogRepository, internal events
```

### Step 4: Implement database isolation

This is where most teams fail. The temptation is to have the Orders module join directly against the Catalog module's products table. Resist this.

Each module should own its database schema. Use schema-per-module in a shared database, or separate databases if you want stronger isolation:

```sql
-- catalog schema (owned by Catalog module)
catalog.products (id, name, price, category_id, ...)
catalog.categories (id, name, parent_id, ...)

-- orders schema (owned by Orders module)
orders.orders (id, customer_id, status, created_at, ...)
orders.order_items (id, order_id, product_id, product_name, unit_price, quantity)
-- Note: product_name and unit_price are COPIED from catalog at order time
-- The Orders module does NOT query catalog.products
```

The `product_name` and `unit_price` in `orders.order_items` look like duplication. They are. This duplication is intentional — it captures the state of the product at the time of the order, not the current state. It also removes the cross-module join dependency.

### Step 5: Use events for cross-module reactions

When one module needs to react to something that happened in another module, use events:

```typescript
// In orders module, after order is confirmed:
await this.eventBus.publish(new OrderConfirmedEvent({
  orderId: order.id,
  customerId: order.customerId,
  items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
  totalAmount: order.total,
}));

// In inventory module (separate file, separate team):
@Subscribe(OrderConfirmedEvent)
async handleOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
  for (const item of event.items) {
    await this.inventory.decrementStock(item.productId, item.quantity);
  }
}

// In notifications module (separate file, separate team):
@Subscribe(OrderConfirmedEvent)
async handleOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
  await this.emailService.sendOrderConfirmation(event.customerId, event.orderId);
}
```

### Step 6: Test at module boundaries

Write integration tests that test each module through its public interface:

```typescript
describe('CatalogModule', () => {
  let catalogService: CatalogService;
  
  beforeEach(async () => {
    // Bootstrap only the catalog module with a real test database
    const module = await CatalogModule.createForTesting();
    catalogService = module.get(CatalogService);
  });
  
  it('returns product summary by id', async () => {
    const product = await catalogService.getProduct(new ProductId('prod-123'));
    expect(product).toMatchObject({ name: 'Widget', price: Money.of(9.99, 'USD') });
  });
});
```

## When to Use

**The modular monolith is the right choice when:**

- **Your team is 5-50 developers**. Below five, a simple layered monolith is probably enough. Above fifty, the modularization discipline may not be enough to prevent coordination bottlenecks and you may need independent deployability.

- **You are building a greenfield system** where the domain boundaries are not yet fully understood. Modules are much cheaper to refactor than microservice boundaries. You can move code between modules freely; you cannot move code between services without a data migration strategy.

- **You want microservices architecture benefits without microservices operational overhead**. If you design your modules with the discipline of microservices (independent data, public APIs, event-driven communication), you get 80% of the architectural benefits at 20% of the operational cost.

- **Your team lacks distributed systems expertise**. Microservices require deep knowledge of distributed tracing, eventual consistency, circuit breakers, and service mesh. A modular monolith can be operated by developers who understand only standard application development.

- **You need fast development iteration**. End-to-end testing, debugging, and local development are dramatically simpler in a single process than across distributed services.

## When NOT to Use

**The modular monolith struggles when:**

- **Different modules need to scale independently**. If your Search module needs 100x more compute than your Orders module, you cannot scale them independently in a single process.

- **Modules need different technology stacks**. If your recommendations engine needs Python (for ML libraries) and your order management needs Go (for throughput), you cannot share a process.

- **Your deployment cadence demands independent releases**. If the Payments team needs to deploy every hour and the Catalog team deploys weekly, shared deployment coupling is painful even with good modular discipline.

- **Your regulatory or security requirements demand process isolation**. Some compliance requirements mandate that payment processing code runs in an isolated process with no shared memory. A modular monolith cannot satisfy this.

- **You have already built successful microservices and want to consolidate**. Going from microservices to modular monolith (a "monolith first" reversal) is counterproductive if the microservices are working well. The migration cost is high and the benefit is only operational simplicity.

## Common Mistakes

### 1. Module Boundaries That Follow Technical Layers, Not Business Domains

The most common mistake is creating modules that look like technical layers rather than business domains:

```
// WRONG: Technical modules
modules/
├── controllers/
├── services/
└── repositories/

// RIGHT: Business domain modules
modules/
├── catalog/
├── orders/
└── payments/
```

The first structure is just a layered architecture with a different folder name. The second structure reflects the actual structure of the business and creates boundaries that are meaningful to the domain experts.

### 2. Sharing Database Tables Across Modules

This is the boundary violation that hurts most. When two modules share a database table, you have created invisible coupling that is as strong as a direct code dependency — stronger, because it is hidden. Schema changes become cross-team events. Indexing decisions affect multiple modules. One module's query patterns can degrade another module's performance.

The discipline required is this: if two modules seem to need the same data, decide which module owns it and have the other module request it through the API.

### 3. Leaking Internal Types Through the Public API

Exposing your ORM entity or internal domain object through the public interface ties other modules to your internal implementation. When you refactor the internal type, other modules break.

Return simple data transfer objects from your public interfaces. They should be dumb data containers with no methods, no framework annotations, and no dependencies on your internal libraries.

### 4. Premature Module Extraction

Teams sometimes create modules before the domain boundaries are well understood. The result is modules that are too fine-grained, modules that share concepts without a clear home, and constant cross-module communication that suggests the boundary was drawn in the wrong place.

Wait until you understand the domain well enough to see where the natural seams are. If you are unsure, keep things in a larger module and split later. Splitting is easy; merging is hard.

### 5. No Enforcement Mechanism

Many teams declare they have a modular monolith because they organized code into module folders. Without automated enforcement of the boundary rules, the modules will erode. A developer under deadline pressure will add a direct database query across module boundaries. Another developer will import an internal type directly. Within months, the modules are fiction.

Automation is non-negotiable: lint rules, architecture tests, CI checks. The boundaries must be enforced by machines, not by code review alone.

## Connections

The modular monolith sits at a critical juncture in the architecture evolution path:

- **Layered Architecture** is the natural predecessor. Most modular monoliths start as layered monoliths that get refactored once the domain boundaries become clear.
- **Microservices** is the natural successor for teams that outgrow the modular monolith. The key insight is that a well-designed modular monolith is "microservices-ready" — each module can be extracted to a service without redesigning its interfaces, because the interfaces were already designed for independence.
- **Domain-Driven Design** provides the conceptual foundation for module boundaries. Bounded contexts map directly to modules. The shared kernel pattern maps to the shared kernel module. Ubiquitous language guides the naming of public interfaces.
- **Event-Driven Architecture** patterns (particularly domain events and the outbox pattern) are commonly used within modular monoliths to achieve loose coupling between modules, and they transfer naturally when you extract a module to a microservice.

## Key Insights

1. **The modular monolith is not a compromise — it is a conscious choice.** Shopify serving millions of merchants, Stack Overflow serving hundreds of millions of users, Basecamp serving thousands of businesses: these are not teams that "couldn't figure out microservices." They made a deliberate bet on operational simplicity and won.

2. **Boundary enforcement is the product.** A modular monolith without enforcement is just a monolith with aspirational folder names. The value of the pattern comes entirely from the discipline of the boundaries, and that discipline must be automated.

3. **Independent data ownership is harder than independent code.** Any team can put code in separate folders. Maintaining separate database schemas for each module and resisting cross-module joins requires sustained organizational discipline. This is where most modular monolith attempts fail.

4. **The ten-developer threshold is real.** Below about ten developers, the coordination overhead of a modular monolith (public API design, module boundary reviews, event schema management) may outweigh the benefits. Simple layered architecture is fine. Above ten developers, the coordination overhead of shared code without module boundaries starts to outweigh the cost of imposing them.

5. **Microservices is not an upgrade, it's a trade.** Going from a modular monolith to microservices trades simplicity for independent deployability and independent scalability. Make this trade only when you genuinely need what you are trading for.

6. **A modular monolith is easier to extract than an unstructured monolith.** When the time does come to extract a module as a service, well-designed module boundaries make the extraction straightforward: the public API becomes the service API, the module's database schema becomes the service's database, and the event subscriptions become message queue subscriptions.

7. **Event-driven communication between modules is the secret to staying loosely coupled.** Direct method calls are appropriate for synchronous queries. For reactions and side effects, events let modules evolve independently. Adding new behavior on `OrderCompleted` requires no changes to the Orders module — only the new subscriber.
