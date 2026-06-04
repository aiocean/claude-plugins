# Service-Based Architecture

> "The best architects I know solve the coordination problem, not the technology problem." — Mark Richards

## The Problem

The architecture conversation in most engineering organizations presents two options: the monolith you are trying to escape, and the microservices nirvana you are trying to reach. This framing is a false dichotomy, and it has led thousands of engineering teams to attempt microservices decomposition they were not ready for, suffering the operational overhead of distributed systems without gaining the independence benefits.

The microservices decision is often driven by the wrong motivations. Teams frustrated with the coordination problems of a shared monolith assume that decomposition into small services will fix this. Sometimes it does. More often, a team of eight engineers ends up managing twenty-three services, writing Kubernetes YAML on evenings and weekends, debugging distributed traces for what used to be a simple function call, and deploying each feature across six repositories. They traded one set of problems for a worse set of problems.

Service-based architecture occupies the space between these extremes. It asks a more pragmatic question: what is the smallest number of coarse-grained services that separates your major concerns, gives different teams autonomy over their domain, and can be deployed independently — without requiring the full microservices operational apparatus? The answer is usually somewhere between four and twelve services, each corresponding to a major business domain. It is less glamorous than microservices. It is also the architecture that most successful mid-size companies actually run on, even if they call it something else.

## Core Concept

Service-based architecture (SBA) decomposes a system into a small number of coarse-grained, independently deployable domain services — typically four to twelve — that share one or more databases. Unlike microservices, these services are larger, share database infrastructure (though not necessarily tables), and communicate primarily through synchronous API calls.

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway / BFF                      │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────────┐
    │   Catalog   │ │   Order    │ │   Customer    │
    │   Service   │ │  Service   │ │    Service    │
    │             │ │            │ │               │
    │  (catalog,  │ │  (orders,  │ │  (customers,  │
    │  products,  │ │  cart,     │ │  addresses,   │
    │  search)    │ │  checkout) │ │  preferences) │
    └──────┬──────┘ └─────┬──────┘ └───────┬───────┘
           │              │                │
           └──────────────┴────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Shared Database     │
              │ (separate schemas)    │
              │  catalog_schema       │
              │  orders_schema        │
              │  customers_schema     │
              └───────────────────────┘
```

The defining characteristics of service-based architecture:

**Coarse-grained services**: Each service represents an entire business domain, not a single function or entity. The Order Service handles everything order-related: cart, checkout, order lifecycle, fulfillment tracking. This contrasts with microservices where these might be four separate services.

**Shared database infrastructure** (with schema separation): Services typically share the same database server for operational simplicity — one database to back up, one to monitor, one to tune. But each service owns its own schema within that database. The Order Service writes to the `orders` schema; the Catalog Service writes to the `catalog` schema. Direct cross-schema joins are discouraged.

**Synchronous API communication**: Services call each other via REST or gRPC when they need data from another domain. This is simpler to reason about than asynchronous event-driven communication, at the cost of temporal coupling.

**Independent deployability**: Each service has its own deployment pipeline and can be deployed without coordinating with other services. This is the key operational benefit over a monolith.

**Small team ownership**: Each service is owned end-to-end by a team small enough to hold the entire service in their heads — typically three to eight engineers.

### How SBA Differs From Microservices

The distinction is not just size — it is the philosophy of the trade-offs:

| Dimension | Service-Based | Microservices |
|-----------|--------------|---------------|
| Number of services | 4–12 | Potentially hundreds |
| Service granularity | Business domain | Business capability or entity |
| Database sharing | Shared infrastructure, separate schemas | Fully independent databases |
| Communication | Primarily synchronous REST/gRPC | Mix of sync and async, event-driven |
| Operational overhead | Moderate (like managing 4–12 apps) | High (requires Kubernetes, service mesh, distributed tracing) |
| Team size | 3–8 per service | 2–5 per service |
| Deployment frequency | Per team, independently | Per service, independently |

The key insight from Mark Richards and Neal Ford's work: service-based architecture gives you **architectural modularity** without **microservices operational complexity**. The 80/20 rule applies — you get 80% of the benefit for 20% of the cost.

## Deep Dive

### The Pragmatic Middle Ground: What the Literature Actually Recommends

Mark Richards and Neal Ford's "Fundamentals of Software Architecture" is unusually direct about a reality that most architecture texts obscure: the overwhelming majority of real-world systems at mid-scale are neither monoliths nor microservices. They are collections of four to twelve coarse-grained services with shared database infrastructure, independently deployed, owned by small teams. Richards and Ford give this pattern the name "service-based architecture" precisely because naming it legitimizes it — teams operating this way had often been told they were doing microservices "wrong" because their services were too large and their databases too shared. The book's taxonomy establishes that this is not wrong microservices; it is a distinct and appropriate architectural style.

The intellectual foundation for why this works draws on the same organizational reasoning as microservices: Conway's Law predicts that software structure mirrors organizational structure, and the right service granularity is the one that aligns with how the organization is actually structured. The "Software Engineering at Google" book's analysis of team ownership applies directly: a team that owns more than they can hold in their heads will accumulate technical debt because they cannot reason about the whole. A team of six engineers can hold one coarse-grained service in their heads. They cannot hold twelve fine-grained microservices in their heads while also building features. The right granularity is determined by team cognitive capacity, not by some theoretical principle about service size.

### The AWS Well-Architected Framework on Blast Radius and Shared Infrastructure

The AWS Well-Architected Framework's reliability pillar articulates a trade-off that service-based architecture navigates deliberately: shared infrastructure reduces operational overhead but increases blast radius. A single PostgreSQL cluster serving four services is operationally simpler than four separate database clusters — one system to back up, monitor, tune, and upgrade. It is also a shared failure point: a database incident affects all four services simultaneously rather than one.

The Framework's guidance on "infrastructure protection" and "fault isolation" does not mandate separate databases per service. It mandates *understanding* the failure modes of shared infrastructure and designing for graceful degradation. A well-designed service-based architecture where services use separate database schemas (rather than separate database servers) achieves meaningful isolation at the application level — one service's runaway query cannot corrupt another service's data — while accepting the shared operational blast radius at the infrastructure level. This is a deliberate and defensible trade-off, not an architectural compromise.

The Builder's Library essay "Static stability using availability zones" contains a principle that generalizes to service-based architecture's shared database decision: the appropriate level of isolation depends on the failure mode you are protecting against. Protecting against data corruption between services requires schema isolation — achieved with separate schemas in a shared database. Protecting against a complete database failure affecting multiple services requires separate database servers. Most mid-size organizations need the former and can accept the risk of the latter, making shared database infrastructure with separate schemas the correct choice.

### The Microsoft .NET Architecture Guides on Service Decomposition Criteria

The Microsoft Azure Architecture Center's guidance on "Microservices architecture design" contains a section on service decomposition criteria that is directly applicable to service-based architecture decisions. The guidance distinguishes between decomposition by *business capability* (what the business does) and decomposition by *subdomain* (DDD's bounded context model). Both approaches are valid; the key is that decomposition should reflect meaningful business boundaries, not technical or organizational convenience.

The .NET Architecture guides' treatment of the "strangler fig" pattern for monolith decomposition provides practical wisdom for teams building service-based architectures from scratch or from monoliths: extract services when a distinct team is taking ownership of a distinct business domain, not when the code reaches a particular size. The guides observe that services extracted along technical boundaries (a "database service," a "validation service") create the chattiest, most tightly coupled distributed systems — while services extracted along business domain boundaries create systems that can evolve independently because the domain boundaries reflect where the business itself has independent concerns.

The Azure Architecture Center's anti-pattern catalogue documents the "distributed monolith" — services that are physically separate but logically coupled through shared databases, implicit deployment ordering, or synchronous call chains — as the most common failure mode in service decomposition. Service-based architecture avoids this by making the coupling explicit: services share database *infrastructure* deliberately, but maintain strict schema ownership boundaries. The coupling is a known design decision rather than an accidental coupling that emerges from undisciplined development.

### Independent Deployability Without Microservices Overhead

The "Software Engineering at Google" book's chapter on "Continuous Delivery" establishes that the goal of independent deployability is not small services for their own sake but the ability for teams to deliver value to users on their own schedule without coordinating with other teams. Service-based architecture achieves this goal at a fraction of the operational cost of microservices. Each service has its own deployment pipeline, its own containers, its own deployment schedule. A bug fix in the Payments service can be deployed within minutes of discovery without involving the Catalog team, the Orders team, or anyone else.

The Well-Architected Framework's operational excellence pillar's guidance on "perform operations as code" and "make frequent, small, reversible changes" applies equally to service-based and microservices architectures. The Framework does not prescribe a minimum or maximum service granularity. It prescribes the outcome: teams should be able to deploy changes safely and frequently. Service-based architecture achieves this outcome with four to twelve deployment units instead of potentially hundreds, with correspondingly simpler deployment infrastructure, simpler monitoring configuration, and simpler on-call runbooks. For organizations where the goal is deployment autonomy rather than fine-grained scaling independence, service-based architecture delivers the desired organizational outcome while keeping the operational complexity within the range that a normal engineering team can sustain.

## Implementation Guide

### Step 1: Identify your major business domains

Start with business capabilities, not technical concerns. In an e-commerce platform, the major domains are typically:

- **Catalog** (product management, search, categorization)
- **Commerce** (cart, checkout, promotions, pricing)
- **Fulfillment** (orders, shipping, returns, inventory)
- **Customer** (accounts, authentication, preferences, loyalty)
- **Finance** (billing, payments, accounting, reporting)

Each domain becomes a service. Resist the temptation to decompose further until you have a clear operational or scaling need.

### Step 2: Define service boundaries through data ownership

The most important decision is which data each service owns. Draw the line by asking: which team has the authority to say what the schema of this data should look like?

```
Catalog Service owns:
  catalog.products
  catalog.categories
  catalog.product_variants
  catalog.search_indexes

Commerce Service owns:
  commerce.carts
  commerce.promotions
  commerce.pricing_rules

Fulfillment Service owns:
  fulfillment.orders
  fulfillment.shipments
  fulfillment.returns
  fulfillment.inventory
```

The corollary: the Fulfillment Service should not query `catalog.products` directly. If it needs product data, it calls the Catalog Service API or maintains a local copy of the data it needs (via events or synchronization).

### Step 3: Design inter-service communication

For service-based architecture, synchronous REST or gRPC calls are the primary communication mechanism. Design these APIs carefully — they are the contracts between teams:

```typescript
// Catalog Service exposes:
GET /catalog/v1/products/{id}
GET /catalog/v1/products?ids=id1,id2,id3   // batch lookup for efficiency
GET /catalog/v1/search?q=...&category=...

// Commerce Service calls Catalog when building cart responses:
async buildCartResponse(cart: Cart): Promise<CartResponse> {
  const productIds = cart.items.map(i => i.productId);
  const products = await this.catalogClient.getProductsBatch(productIds);
  
  return {
    items: cart.items.map(item => ({
      ...item,
      product: products[item.productId],
    })),
    total: cart.calculateTotal(),
  };
}
```

Add asynchronous events for cross-domain reactions where temporal coupling would hurt:

```typescript
// Fulfillment Service publishes events:
eventBus.publish(new OrderShippedEvent(orderId, trackingNumber, estimatedDelivery));

// Customer Service subscribes to send shipping notifications:
eventBus.subscribe(OrderShippedEvent, this.sendShippingNotification.bind(this));
```

### Step 4: Set up independent deployment pipelines

Each service needs its own CI/CD pipeline. The pipeline for Service A should have no dependency on Service B. Deployment steps:

```yaml
# Example GitHub Actions pipeline per service
name: Catalog Service Deploy
on:
  push:
    branches: [main]
    paths: ['services/catalog/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run catalog tests
        run: cd services/catalog && npm test

  deploy:
    needs: test
    steps:
      - name: Deploy catalog service
        run: kubectl set image deployment/catalog catalog=registry/catalog:$SHA
```

The `paths` filter ensures this pipeline only runs when catalog service code changes. The Fulfillment Service can deploy simultaneously without any coordination.

### Step 5: Implement a shared services layer for cross-cutting concerns

In service-based architecture, some capabilities are genuinely shared: authentication, authorization, audit logging, feature flags. These can live in a shared library (for in-process efficiency) or a small dedicated service:

```
Auth Service (small, shared):
  POST /auth/token   — issue JWT
  POST /auth/verify  — validate JWT
  POST /auth/refresh — refresh token

All domain services validate tokens by calling Auth Service
OR by using a shared library that validates tokens locally
```

The key: the Auth Service is infrastructure, not a domain. Keep it small, keep it stable, and do not put business logic in it.

## Testing Strategy

Service-based architecture creates a natural testing pyramid that is simpler to maintain than microservices but more structured than a monolith.

**Within a service — unit and integration tests**: Each service is tested independently. Unit tests cover domain logic with mocked dependencies. Integration tests exercise the service against a real database (test containers work well here) and stub external service calls.

```typescript
// Integration test for the Order Service
describe('OrderService integration', () => {
  let db: TestDatabase;
  let orderService: OrderService;
  let mockCatalog: MockCatalogServiceClient;
  let mockPayments: MockPaymentServiceClient;

  beforeAll(async () => {
    db = await TestDatabase.create('orders_test');
    mockCatalog = new MockCatalogServiceClient();
    mockPayments = new MockPaymentServiceClient();
    orderService = new OrderService(db, mockCatalog, mockPayments);
  });

  it('places an order when products are available and payment succeeds', async () => {
    mockCatalog.stubProduct('prod-1', { name: 'Widget', price: 29.99, inStock: true });
    mockPayments.stubSuccess('txn-abc-123');

    const result = await orderService.placeOrder({
      customerId: 'cust-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      paymentMethodId: 'pm-visa',
    });

    expect(result.status).toBe('confirmed');
    const saved = await db.orders.findById(result.orderId);
    expect(saved.totalCents).toBe(5998);
  });
});
```

**Between services — contract tests**: When the Order Service calls the Catalog Service, a contract test verifies that the Catalog Service's API matches what the Order Service expects. Consumer-driven contract testing (Pact) is the standard approach: the Order Service (consumer) defines the contract; the Catalog Service (provider) runs the contract against its actual implementation.

This is dramatically simpler in SBA than in microservices because you have four to twelve contracts to maintain, not hundreds. One engineer can own all the contract tests for the entire system.

**End-to-end tests**: With a small number of services, spinning up the full system locally for end-to-end tests is feasible. Docker Compose with all four to eight services and a shared test database takes seconds. End-to-end tests cover the critical user journeys — place an order, cancel an order, process a refund — without requiring a full production environment.

## When to Use

**Service-based architecture is the right choice when:**

- **Your team is 20–100 engineers** split across four to eight teams, each owning a distinct business domain. Small enough that microservices overhead is unjustified; large enough that a single shared codebase creates coordination friction.

- **You need independent deployability** but lack the operational maturity for full microservices. SBA gives you independently deployable services without requiring Kubernetes, service mesh, distributed tracing infrastructure, and the associated expertise.

- **Your domains are well-understood and stable**. If you have been operating in this problem space for years and know where the business boundaries are, SBA lets you codify those boundaries into service architecture.

- **You want a clear migration path from a monolith**. Extracting a monolith into four to eight services is achievable in six to twelve months for most teams. Extracting into fifty microservices is a multi-year effort with high risk of creating a distributed monolith.

- **You want a realistic path toward microservices**. SBA is the intermediate step. Start with coarse-grained services. When a specific service needs to scale a component independently, or when a specific team needs to sub-decompose for autonomy, extract a microservice from the coarse-grained service. Do this incrementally, only where the need is concrete.

## When NOT to Use

**Service-based architecture is the wrong choice when:**

- **You genuinely need fine-grained independent scaling**. SBA services are coarse-grained. If your search capability needs 100x the compute of your checkout capability, you either extract search as a fine-grained microservice or you waste resources over-provisioning the entire Catalog Service.

- **Different parts of a service need radically different technology**. SBA services tend to be deployed as single runtime units. If the ML recommendation component of your Catalog Service needs GPU compute and the rest needs standard compute, SBA makes this awkward.

- **You are starting a new greenfield project with a very small team**. For a team of four engineers, a modular monolith is probably simpler and faster. Reach for SBA when the team grows.

- **Your operations team cannot support multiple deployment pipelines**. Each service in SBA has its own pipeline, its own containers, its own monitoring configuration. If your ops team is one person managing everything else, this multiplied operational surface may be more than they can handle.

## Common Mistakes

### 1. Shared Database Tables Between Services

The temptation in SBA is significant because services share the same database server. The fact that the Commerce Service can query `catalog.products` directly does not mean it should. When the Catalog team changes their schema, they need to coordinate with every service that queries their tables directly.

Enforce the rule: each service queries only its own schema. Cross-service data access goes through APIs. Tools like pgBouncer connection pooling can be configured to enforce this by routing connections to specific schemas.

### 2. Services That Are Too Thin

Partitioning a system into eight services when the natural domain boundary is three creates services with anemic domains. A service with one hundred lines of business logic is not a service — it is a function call dressed up in HTTP.

If two services are always deployed together, always change together, and the same team owns both, they should be the same service. Merge them and redraw the boundary.

### 3. Synchronous Call Chains Spanning Multiple Services

In SBA, the default communication is synchronous. When a user request requires Service A to call Service B which calls Service C which calls Service D, the latency of the request is additive and the failure of any service in the chain fails the entire request.

Keep synchronous call chains short (maximum two hops). For workflows that naturally span multiple services, introduce asynchronous event-driven steps to break the chain.

### 4. No API Versioning Strategy

Service APIs in SBA are internal interfaces, but they are still contracts between teams. Teams that assume they can change their API without versioning it will eventually break a consuming service at the wrong moment.

Version your APIs from the start. Run old and new versions in parallel during migration. Give consuming teams a migration window. Deprecate old versions with announcement and timeline.

### 5. Skipping the Service Chassis

Each new service in SBA tends to get built slightly differently as teams make their own choices about logging, health checks, metrics, and deployment configuration. Within two years, you have eight services each with different monitoring approaches, different log formats, and different deployment patterns.

Build a service chassis template — a starting point that all services inherit — that standardizes these cross-cutting concerns. The chassis handles logging, health endpoints, metrics export, and Dockerfile/Kubernetes templates. Teams focus on business logic; the chassis handles infrastructure boilerplate.

## Connections

Service-based architecture sits at the center of the architecture evolution path:

- **Modular Monolith** is the natural predecessor. A well-structured modular monolith with four to eight modules maps almost directly to four to eight SBA services. The module's public API becomes the service API; the module's database schema becomes the service's schema.
- **Microservices** is the natural successor for specific services that outgrow coarse-grained boundaries. SBA is the pragmatic middle ground and can coexist with individual microservices — extract fine-grained services only where there is concrete need.
- **Layered Architecture** is typically used within each service. The service itself is organized in layers internally: presentation (API handlers), business logic, data access.
- **Event-Driven Architecture** patterns are commonly applied between SBA services for loose coupling on write-side workflows, while synchronous APIs handle read operations.

## Key Insights

1. **Service-based architecture is the architecture most successful companies actually run.** It is underrepresented in conference talks and blog posts because "we have eight coarse-grained services" is not as exciting as "we have 500 microservices." But the operational reality of most successful 50–500 person engineering organizations is closer to SBA than to microservices.

2. **Coarse-grained services reduce inter-team coordination, not just system complexity.** When the Fulfillment Service is owned by one team, all fulfillment decisions — data model, API design, deployment schedule — are made within that team. No cross-team coordination needed. This is the organizational benefit that justifies the architecture.

3. **The shared database is a feature, not a compromise.** SBA explicitly accepts shared database infrastructure in exchange for operational simplicity. A single well-tuned PostgreSQL cluster is easier to operate, back up, and scale than eight separate database clusters. The discipline is in the schema boundaries, not the physical separation.

4. **SBA is the staging post, not the destination.** Architecture should evolve with organizational and technical needs. SBA is stable and appropriate for mid-size organizations. As specific services hit scale or autonomy limits, individual fine-grained services can be extracted. The architecture grows organically rather than all at once.

5. **Independent deployability without microservices overhead is the value proposition.** The primary benefit teams get from microservices is deploying their service on their own schedule. SBA delivers this benefit at significantly lower operational cost. If independent deployability is what you need, SBA may be sufficient.

6. **Four to twelve is the right range, and the lower end is safer.** Starting with twelve services is more risky than starting with four. Begin with the fewest services that cleanly separate your major domains. Add services as distinct needs emerge — a Notifications Service when notifications become complex enough, a Search Service when search requires its own scaling and technology choices.

7. **The Richards/Ford "pragmatic architecture" label is accurate.** Service-based architecture does not win architecture beauty contests. It does not appear on the cover of engineering books. It simply works reliably for the majority of software systems at mid-scale, and that pragmatic reliability is its distinguishing virtue.
