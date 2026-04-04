# Hexagonal Architecture (Ports and Adapters)

> "Allow an application to equally be driven by users, programs, automated test or batch scripts, and to be developed and tested in isolation from its eventual run-time devices and databases." — Alistair Cockburn, 2005

## The Problem

The most persistent bug in software architecture is not a code bug — it is a structural bug. It is the assumption, encoded in physical file structure and import statements, that your business logic is fundamentally connected to your web framework, your database library, your message broker client. When the business logic imports `express` types, when your domain objects extend ORM entities, when your service classes import AWS SDK clients directly — the application domain has been colonized by infrastructure.

The consequences are familiar. You cannot test a business rule without spinning up a database. You cannot run your unit tests without environment variables pointing to external services. Switching from REST to gRPC means touching business logic files. Migrating from PostgreSQL to MongoDB means rewriting domain code. Upgrading the HTTP framework version breaks service tests that have nothing to do with HTTP. The domain logic, which should be the stable center of your application, has become the most fragile part — because it is entangled with infrastructure that changes for reasons entirely unrelated to the business.

Alistair Cockburn identified this pattern in 2005 and proposed a simple structural rule to fix it: the application should have an inside and an outside. The inside is the domain — the business rules, the domain objects, the application logic. The outside is the infrastructure — databases, HTTP servers, message queues, external APIs. The inside never imports the outside. The outside adapts to the interfaces defined by the inside. This simple inversion of dependency direction is the entirety of hexagonal architecture.

## Core Concept

Hexagonal architecture organizes an application around its domain, with a layer of ports (interfaces) separating the domain from the infrastructure adapters that implement those ports. The domain defines what it needs; the infrastructure provides it.

```
                    ┌─────────────────────────────┐
   HTTP Request ──► │     HTTP Adapter (Driving)   │
                    └──────────────┬──────────────┘
                                   │ calls
                    ┌──────────────▼──────────────┐
   CLI Command ──►  │   Driving Port (Interface)   │
                    │   OrderService               │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │                             │
                    │      Application Domain     │
                    │                             │
                    │  ┌────────────────────────┐ │
                    │  │   Business Logic        │ │
                    │  │   Domain Objects        │ │
                    │  │   Domain Events         │ │
                    │  └────────────────────────┘ │
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Driven Port (Interface)    │
                    │   OrderRepository            │
                    └──────────────┬──────────────┘
                                   │ implemented by
                    ┌──────────────▼──────────────┐
                    │   Database Adapter (Driven)  │ ──► PostgreSQL
                    └─────────────────────────────┘

                    ┌─────────────────────────────┐
                    │   Email Adapter (Driven)     │ ──► SendGrid API
                    └─────────────────────────────┘
```

The hexagon shape is symbolic — it has no special meaning beyond "here are multiple sides through which the application can be driven or can drive." The number of ports is not six; it is however many your application needs.

### Driving Ports vs. Driven Ports

**Driving ports** (also called primary ports, or inbound ports): These are how the outside world uses the application. The HTTP controller calls the application through a driving port. The CLI command calls through a driving port. The test harness calls through a driving port. The driving port is an interface that the application domain exposes — it defines the operations that can be performed on the application.

```typescript
// Driving port — defined in the application domain
export interface OrderApplicationService {
  placeOrder(command: PlaceOrderCommand): Promise<OrderConfirmation>;
  cancelOrder(orderId: string, reason: string): Promise<void>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
}
```

**Driven ports** (also called secondary ports, or outbound ports): These are how the application domain reaches out to infrastructure. The domain needs to persist data — it defines a `OrderRepository` port. The domain needs to send emails — it defines a `NotificationService` port. The domain does not know or care how these ports are implemented. It only knows the interface.

```typescript
// Driven port — defined in the application domain
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomer(customerId: CustomerId): Promise<Order[]>;
}

// Driven port — defined in the application domain
export interface NotificationService {
  sendOrderConfirmation(order: Order): Promise<void>;
  sendOrderCancellationNotice(order: Order, reason: string): Promise<void>;
}
```

**Adapters**: Concrete implementations that live in the infrastructure layer (outside the hexagon). A `PostgresOrderRepository` implements `OrderRepository`. A `SendGridNotificationService` implements `NotificationService`. An `HttpOrderController` calls `OrderApplicationService`. An `InMemoryOrderRepository` implements `OrderRepository` for tests.

The dependency direction: adapters depend on the domain (they implement domain interfaces or call domain ports). The domain never depends on adapters.

### The Dependency Rule

The one rule that defines hexagonal architecture: **dependencies point inward**. The domain has no imports from infrastructure. No framework imports. No ORM imports. No HTTP library imports. No cloud SDK imports.

```typescript
// WRONG — domain importing infrastructure
import { Repository } from 'typeorm';  // ORM framework
import { Injectable } from '@nestjs/common';  // HTTP framework

@Injectable()  // framework annotation
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)  // ORM-specific injection
    private repo: Repository<OrderEntity>
  ) {}
}

// RIGHT — domain defining its own interface
// No framework imports. No infrastructure imports.
export class OrderApplicationServiceImpl implements OrderApplicationService {
  constructor(
    private readonly orders: OrderRepository,  // domain interface
    private readonly notifications: NotificationService  // domain interface
  ) {}
  
  async placeOrder(command: PlaceOrderCommand): Promise<OrderConfirmation> {
    const order = Order.create(command.customerId, command.items);
    await this.orders.save(order);
    await this.notifications.sendOrderConfirmation(order);
    return new OrderConfirmation(order.id);
  }
}
```

### Hexagonal vs. Clean Architecture vs. Onion Architecture

These three architecture patterns encode the same fundamental principle — domain at the center, infrastructure at the outside, dependencies pointing inward — with different levels of ceremony and slightly different structural conventions.

**Hexagonal Architecture** (Cockburn, 2005): The original. Two zones (inside/outside) connected by ports and adapters. Simple, elegant, minimal vocabulary.

**Onion Architecture** (Jeffrey Palermo, 2008): Adds concentric rings within the domain — Domain Model at the center, Domain Services around it, Application Services around that, Infrastructure at the outside. More prescriptive about internal domain structure.

**Clean Architecture** (Robert Martin, 2012): The most widely taught version. Four rings: Entities, Use Cases, Interface Adapters, Frameworks & Drivers. The Dependency Rule ("source code dependencies can only point inward") is the explicit governing law. Adds the concept of Use Cases as a distinct layer.

In practice, the 2025 consensus among practitioners is that these are the same pattern with different vocabulary. The implementation differs in naming conventions and how many internal rings you define, not in the fundamental structural idea. Pick the vocabulary your team understands and be consistent.

## Deep Dive

### The Dependency Inversion Principle as Architectural Foundation

The "Software Engineering at Google" book's treatment of "design for testability" contains the core insight that Alistair Cockburn formalized as hexagonal architecture: code that depends on infrastructure is not testable in isolation, and code that is not testable in isolation accumulates bugs that cannot be caught until integration. The book documents how Google's most reliable systems are built around the principle that business logic should be expressible as pure functions or as logic whose external dependencies are injected — never imported directly. This is not merely a testing convenience; it is a structural discipline that keeps the code's behavior comprehensible and its correctness verifiable.

Robert Martin's articulation of the Dependency Inversion Principle — that high-level modules should not depend on low-level modules; both should depend on abstractions — is the theoretical foundation that hexagonal architecture applies systematically at the system level. The "Software Engineering at Google" book's empirical observation reinforces this: systems where business logic imports infrastructure directly accumulate a property the book calls "brittleness" — the tendency for unrelated changes to break things unexpectedly. A schema migration breaks business logic tests. An HTTP framework upgrade breaks domain validation. The coupling that causes this brittleness is always an inward dependency from business logic to infrastructure, and hexagonal architecture's single rule — dependencies point inward, never outward from the domain — eliminates it structurally.

The Microsoft .NET Architecture guides' treatment of the "Clean Architecture" pattern — which the guides treat as a variant of hexagonal architecture — provide the most detailed published guidance on how to apply this principle in practice. The guides are notable for their candor about when the pattern is appropriate: the overhead of defining ports and implementing adapters is justified when the domain logic is complex enough to warrant isolation. For simple CRUD applications, the guides explicitly recommend skipping the port/adapter ceremony and using the framework directly. This calibrated guidance is more useful than blanket advocacy: the principle is always correct, but the implementation overhead should be proportional to the complexity of the logic being protected.

### Domain Purity and the Testing Multiplier

The AWS Builder's Library essay "Avoiding complex failure modes" documents one of the most valuable properties of a well-isolated domain: when business logic depends only on pure domain types and port interfaces, every possible behavior of the business logic can be exercised in tests without any infrastructure. This is not merely faster tests — it is a qualitatively different testing capability. Infrastructure-dependent tests are constrained by what states the infrastructure can be put into. In-memory adapter tests are constrained only by what states you can construct in code. The space of test cases the in-memory approach can cover is orders of magnitude larger.

The "Software Engineering at Google" book's chapter on "Testing" establishes the engineering economics of this property: fast, reliable unit tests that can be run thousands of times per day in CI are fundamentally different from slow, flaky integration tests that can be run a few times per day. The book documents Google's investment in "hermetic tests" — tests that are completely isolated from external state and produce identical results on every run. Hexagonal architecture's in-memory adapters make hermetic testing of business logic trivially achievable, whereas infrastructure-dependent architectures require significant engineering investment to achieve the same property.

The Microsoft Azure Architecture Center's guidance on "testing strategies" for domain-driven systems makes this concrete for financial and compliance-sensitive domains. When domain logic implements complex regulatory rules — what constitutes a valid transaction, what disclosures are required for specific products, what constitutes a suspicious activity pattern — the correctness of that logic matters enormously and the space of edge cases is large. In-memory adapter tests can exercise hundreds of edge cases in seconds. Infrastructure-dependent tests can exercise dozens of edge cases in minutes. Over a development lifecycle measured in years, this testing multiplier compounds into a substantial difference in the number of bugs caught before production.

### Infrastructure Independence and the Adapter Swap Property

The AWS Well-Architected Framework's operational excellence pillar documents "cloud-native architecture" as a property that enables infrastructure choices to be made and revised without redesigning applications. The Framework's guidance on "avoiding unnecessary coupling to specific services" — recommending abstractions over direct AWS service clients in application code — is exactly the hexagonal architecture pattern applied to cloud infrastructure. An application that imports `aws-sdk` directly throughout its business logic becomes coupled to AWS in the same way that an application importing `pg` directly becomes coupled to PostgreSQL. When either changes — an AWS SDK version upgrade, a PostgreSQL-to-Aurora migration — the coupling forces changes in business logic code that has nothing to do with infrastructure.

The Builder's Library essay "Evolving AWS" — which documents how Amazon's own engineering teams manage infrastructure migrations — observes that the most painful migrations are those where infrastructure choices are embedded in application code rather than isolated behind interfaces. When an application uses PostgreSQL through a port interface, migrating to Aurora PostgreSQL requires changing one adapter class. When it uses PostgreSQL through direct imports scattered through business logic, migration requires auditing every file that touches the database. The hexagonal architecture pattern is the structural discipline that makes the first scenario the default.

The Google SRE Book's treatment of "change management" reinforces this from the reliability perspective. The SRE Book observes that changes are the primary source of outages — configuration changes, deployment changes, dependency changes. The book's recommendation is to make changes as small and isolated as possible. Hexagonal architecture makes infrastructure changes isolated by construction: swapping an adapter is a change contained within one class that implements one interface. No business logic changes. No domain tests need updating. The blast radius of the infrastructure change is minimized to the adapter and its infrastructure-specific tests. This is not an accidental property of the architecture — it is the explicit goal that Cockburn articulated in 2005 and that decades of production experience have validated.

## Implementation Guide

### Step 1: Identify your domain boundary

The domain boundary is the line that separates "business logic that would exist even if we had no computers" from "infrastructure we use to run the software." A good test: can a domain expert who knows nothing about software read your domain code and recognize the business rules?

Domain side:
- Business rules (an order cannot be placed with an empty cart)
- Domain entities (Order, Customer, Product)
- Domain events (OrderPlaced, OrderCancelled)
- Application use cases (PlaceOrder, CancelOrder, GetOrderStatus)
- Port interfaces (OrderRepository, NotificationService)

Infrastructure side:
- Database queries and ORM mappings
- HTTP controllers and response serialization
- Message queue producers and consumers
- External API clients
- File system operations

### Step 2: Define your ports before your adapters

Write the port interfaces based on what the domain needs, using domain vocabulary:

```typescript
// The domain needs to store orders — what operations does it actually need?
export interface OrderRepository {
  // Not findAll(), not findWithFilters() — just what the domain actually uses:
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findActiveOrdersByCustomer(customerId: CustomerId): Promise<Order[]>;
  findOrdersAwaitingFulfillment(): Promise<Order[]>;
}
```

Write these interfaces without looking at your database schema. The schema should conform to what the domain needs, not the other way around.

### Step 3: Implement the domain without infrastructure imports

The application service (use case) orchestrates domain objects and ports:

```typescript
// No framework imports. No infrastructure imports. Pure domain logic.
export class PlaceOrderUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly catalog: ProductCatalog,
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
    private readonly notifications: NotificationService,
  ) {}
  
  async execute(command: PlaceOrderCommand): Promise<OrderConfirmation> {
    const customer = await this.customers.findById(command.customerId);
    if (!customer) throw new CustomerNotFoundError(command.customerId);
    if (!customer.canPlaceOrders()) throw new CustomerNotEligibleError();
    
    const products = await this.catalog.findProducts(command.items.map(i => i.productId));
    const order = Order.create(customer, command.items, products);
    
    const paymentResult = await this.payments.charge(order.total, command.paymentMethod);
    if (!paymentResult.succeeded) throw new PaymentFailedError(paymentResult.reason);
    
    order.confirmPayment(paymentResult.transactionId);
    await this.orders.save(order);
    await this.notifications.sendOrderConfirmation(order, customer.email);
    
    return new OrderConfirmation(order.id, order.estimatedDelivery);
  }
}
```

### Step 4: Implement adapters in the infrastructure layer

Adapters translate between the domain's vocabulary and the infrastructure's vocabulary:

```typescript
// PostgreSQL adapter — lives in infrastructure layer
import { Pool } from 'pg';
import { OrderRepository } from '../../domain/ports/OrderRepository';
import { Order } from '../../domain/Order';
import { OrderId } from '../../domain/OrderId';

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly pool: Pool) {}
  
  async save(order: Order): Promise<void> {
    await this.pool.query(
      `INSERT INTO orders (id, customer_id, status, total_cents, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET status = $3, total_cents = $4`,
      [order.id.value, order.customerId.value, order.status, order.total.cents, order.createdAt]
    );
    // persist order items too...
  }
  
  async findById(id: OrderId): Promise<Order | null> {
    const result = await this.pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id.value]
    );
    if (!result.rows.length) return null;
    return this.mapToOrder(result.rows[0]);
  }
  
  private mapToOrder(row: Record<string, unknown>): Order {
    // map database row to domain object
    return Order.reconstitute({
      id: new OrderId(row.id as string),
      // ...
    });
  }
}
```

### Step 5: Wire everything together in the composition root

The dependency injection container (or manual wiring) connects adapters to ports to use cases:

```typescript
// Composition root — the only place that knows about everything
import { Pool } from 'pg';
import { PostgresOrderRepository } from './infrastructure/PostgresOrderRepository';
import { SendGridNotificationService } from './infrastructure/SendGridNotificationService';
import { StripePaymentGateway } from './infrastructure/StripePaymentGateway';
import { PlaceOrderUseCase } from './application/PlaceOrderUseCase';
import { HttpOrderController } from './infrastructure/http/HttpOrderController';

const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
const orderRepo = new PostgresOrderRepository(dbPool);
const notifications = new SendGridNotificationService(process.env.SENDGRID_API_KEY);
const payments = new StripePaymentGateway(process.env.STRIPE_SECRET_KEY);

const placeOrderUseCase = new PlaceOrderUseCase(
  customerRepo, catalogService, orderRepo, payments, notifications
);

const controller = new HttpOrderController(placeOrderUseCase);
```

### Step 6: Test using in-memory adapters

The payoff: testing domain logic without any infrastructure:

```typescript
// In-memory adapter for tests — no database needed
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();
  
  async save(order: Order): Promise<void> {
    this.orders.set(order.id.value, order);
  }
  
  async findById(id: OrderId): Promise<Order | null> {
    return this.orders.get(id.value) ?? null;
  }
}

describe('PlaceOrderUseCase', () => {
  it('confirms an order when payment succeeds', async () => {
    const useCase = new PlaceOrderUseCase(
      new InMemoryCustomerRepository([testCustomer]),
      new InMemoryCatalog([testProduct]),
      new InMemoryOrderRepository(),
      new AlwaysSucceedingPaymentGateway(),
      new SpyNotificationService(),
    );
    
    const confirmation = await useCase.execute({
      customerId: testCustomer.id,
      items: [{ productId: testProduct.id, quantity: 1 }],
      paymentMethod: testPaymentMethod,
    });
    
    expect(confirmation.orderId).toBeDefined();
  });
});
```

No database setup. No HTTP server. No environment variables. This test runs in milliseconds and tests the actual business logic.

## When to Use

**Hexagonal architecture is well-suited when:**

- **Your business logic is complex and valuable enough to protect**. If most of your application is CRUD with minimal logic, the port/adapter overhead may not be justified. When you have meaningful domain logic — pricing algorithms, compliance rules, workflow orchestration — the isolation is worth it.

- **You anticipate infrastructure changes**. Migrating from one database to another, from one email provider to another, from REST to gRPC — these become adapter swaps that do not touch domain code.

- **You want fast, isolated unit tests for business logic**. The ability to test all your use cases with in-memory adapters is a significant productivity multiplier.

- **Your team is practicing Domain-Driven Design**. Hexagonal architecture is the natural structural complement to DDD. Bounded contexts map to hexagons; aggregates and domain services live inside the hexagon.

- **You are building a long-lived system** that will evolve over years. The infrastructure independence makes the system easier to evolve as technology choices change.

## When NOT to Use

**Hexagonal architecture adds friction when:**

- **Your application is primarily a thin CRUD wrapper over a database**. Admin dashboards, reporting tools, simple content management systems — when the domain logic is minimal, the port/adapter ceremony is overhead without benefit.

- **Your team is small and the system is simple**. For a team of three maintaining a straightforward service, the additional abstractions slow down development without providing commensurate value.

- **You are prototyping**. Speed of iteration matters most in early-stage exploration. Add the hexagonal structure when you understand the domain well enough for the structure to be correct.

- **Performance is paramount and the indirection is measurable**. The additional interface dispatch and object mapping adds overhead. In hot paths measured in microseconds, this matters. In most applications, it does not.

## Common Mistakes

### 1. Anemic Domain, Fat Use Cases

When developers place all logic in use case classes and leave domain objects as data holders, they have not actually achieved hexagonal architecture — they have created a service layer with nicer vocabulary. The domain should contain business rules, invariants, and behavior. The use case orchestrates domain objects; it does not implement business logic itself.

If your `Order` class has no methods and all the logic is in `PlaceOrderUseCase`, move the logic back to the domain objects.

### 2. Domain Objects That Import Infrastructure Types

The most common violation: an entity class that extends the ORM's base entity class, or a domain service that imports an HTTP library type. Once infrastructure types enter the domain, the isolation is broken. Tests require infrastructure. Infrastructure changes break domain code.

Run a dependency audit regularly: scan the domain layer for any import that originates outside the domain layer. Each one is a violation.

### 3. Ports That Expose Infrastructure Concepts

A port designed around infrastructure capabilities rather than domain needs is an infrastructure interface wearing domain clothing. `execute(sql: string): Promise<Row[]>` is not a domain port — it is a database client. `findActiveOrdersByCustomer(customerId: CustomerId): Promise<Order[]>` is a domain port.

Design ports from the domain's perspective. If a port method requires knowledge of infrastructure concepts (SQL, HTTP status codes, message queue offsets) to use correctly, redesign it.

### 4. Too Many Layers Within the Domain

Some teams read about Clean Architecture's four rings and implement five or six sub-layers within the domain: entities, value objects, aggregates, domain services, application services, use cases, command handlers... Each layer adds indirection. Each crossing requires mapping. The cognitive overhead exceeds the benefit.

Start with the minimum: domain objects and use cases (application services). Add sub-layers only when a concrete need arises. Simplicity inside the hexagon is as important as isolation from infrastructure.

### 5. Forgetting the Composition Root

The composition root — where all the wiring happens — is critical. Without careful management, it becomes a maze of dependency injection configuration that obscures the architecture. Either use a dependency injection container (NestJS, Spring, Guice) with clear module boundaries, or use explicit manual wiring in a single `bootstrap.ts` file. Never allow wiring logic to leak into domain or adapter code.

## Connections

Hexagonal architecture does not exist in isolation:

- **Domain-Driven Design** provides the content for the hexagon — bounded contexts, aggregates, domain events, value objects. Hexagonal architecture provides the structure that protects the DDD model from infrastructure contamination.
- **Vertical Slice Architecture** is frequently combined with hexagonal architecture. Each vertical slice is itself a hexagon — the use case at the center, with its own ports and adapters.
- **Microservices** boundaries often align with hexagonal boundaries. Each microservice is a hexagon with its own domain, ports, and adapters. The service API is the driving port exposed to other services.
- **Clean Architecture** and **Onion Architecture** are cousins — the same dependency inversion principle expressed with different structural vocabulary. In practice, the implementations converge.
- **Layered Architecture** differs in dependency direction: in a layered architecture, dependencies typically flow downward and the business layer imports from the persistence layer. Hexagonal architecture inverts this — the domain defines interfaces and the infrastructure layer implements them.

## Key Insights

1. **The central insight is the inversion of dependency direction.** Traditional layered architecture has the domain import from the persistence layer. Hexagonal architecture has the persistence layer implement interfaces defined by the domain. This single reversal — the Dependency Inversion Principle applied consistently — is what provides infrastructure independence.

2. **Ports are requirements, not capabilities.** A port is the domain saying "I need this." It is not the database saying "here is what I can do." The distinction matters: ports designed from infrastructure capabilities leak infrastructure concerns into the domain; ports designed from domain requirements keep the domain pure.

3. **In-memory adapters are the test strategy, not an afterthought.** The ability to replace all infrastructure with in-memory implementations is what makes hexagonal architecture's testing benefits concrete. Designing for testability from the start produces better port interfaces — ports that are too broad or too infrastructure-specific are hard to implement in-memory.

4. **The hexagon boundary is not the module boundary.** It is tempting to create a `domain/` folder and an `infrastructure/` folder and call it hexagonal architecture. The real test is whether any file in `domain/` imports anything from `infrastructure/`. If it does, the boundary is a fiction.

5. **Clean Architecture, Onion Architecture, and Hexagonal Architecture are the same pattern.** They differ in ceremony and vocabulary, not in substance. The 2025 consensus is to use the vocabulary your team is most familiar with and apply the principle consistently. Do not mix vocabularies — pick one and use it throughout.

6. **The pattern does not prescribe how to organize within the hexagon.** You can organize the domain by feature (vertical slices), by type (entities in one folder, services in another), or by bounded context. The hexagonal pattern only constrains the relationship between domain and infrastructure, not the internal structure of the domain.

7. **Hexagonal architecture is not about hexagons.** The geometry is incidental — Cockburn chose a hexagon to suggest "multiple sides." The architecture is about the principle: application independent of infrastructure, infrastructure dependent on application interfaces. If remembering the principle is easier without the geometry, forget the shape.
