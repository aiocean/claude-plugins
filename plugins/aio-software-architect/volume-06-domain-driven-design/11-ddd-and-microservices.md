# DDD as Microservice Decomposition

> "If you can't deploy them independently, they're not microservices—they're a distributed monolith. The bounded context gives you the seam along which you can cut. Without it, you're guessing." — Sam Newman, Building Microservices

## The Problem

A company decides to migrate from a monolith to microservices. The architects gather, open the monolith's codebase, and start drawing service boundaries. Where do they draw them? By database table? By HTTP controller? By feature flag? By the org chart? By some notion of "business capability"?

Without a principled answer, teams make arbitrary choices. One team splits along technical layers: a "user service," a "product service," an "order service" — each modeled after a database table. Another team splits by feature: a "checkout service," a "cart service," a "wish list service" — each modeling a user workflow. A third team splits by deployment frequency: things that change often in one service, things that change rarely in another.

Three years later, the system has 47 microservices. Half of them are so tightly coupled that deploying one requires deploying five others simultaneously. The "order service" has 12 downstream dependencies and cannot place an order without synchronous calls to all 12. A "distributed monolith" has emerged — all the operational complexity of microservices with none of the independence benefits.

The root cause: decomposition without a domain model. Service boundaries were drawn based on technical structure, not on the natural seams of the business domain. DDD's bounded contexts provide exactly the principled basis for decomposition that was missing.

## Core Concept

The strongest heuristic for microservice decomposition is: **one bounded context = one microservice (at minimum)**. This alignment is not accidental — bounded contexts and microservices share the same fundamental property: they are independently deployable, independently evolvable units with explicit interface boundaries.

A bounded context defines:
- A domain model valid within explicit boundaries
- A Ubiquitous Language used consistently within those boundaries
- A team that owns the model and its evolution
- An explicit interface for integration with other contexts

A microservice defines:
- A deployable unit with independent lifecycle
- A service interface for communication with other services
- A team that owns deployment and evolution
- Data isolation (owns its data store)

The correspondence is precise. The bounded context gives the microservice its semantic identity — what it means and what it's responsible for. The microservice gives the bounded context its operational isolation — it can be deployed, scaled, and evolved independently.

Sam Newman, author of *Building Microservices*, has repeatedly cited bounded contexts as the primary decomposition technique. His guidance: when you don't know where to draw service boundaries, find the bounded contexts first. The boundaries will follow.

**When One Bounded Context Needs Multiple Microservices**

The relationship is not strictly 1:1. A large, complex bounded context might be deployed as multiple microservices for operational reasons: different scaling characteristics, different technology requirements, different deployment frequencies. A "Fulfillment" bounded context might have:
- A `fulfillment-coordinator` service (orchestrates fulfillment workflows)
- A `warehouse-management` service (warehouse operations, separate scaling)
- A `carrier-integration` service (calls external carrier APIs, separate failure domain)

These three services all share the Fulfillment bounded context's Ubiquitous Language. They might share internal domain types through a library (a shared kernel within the bounded context). But they deploy independently, scale independently, and can fail independently. The bounded context is the semantic unit; the microservices are the operational units.

**When One Microservice Spans Multiple Bounded Contexts**

This is a code smell. If a single microservice contains the User Management context AND the Billing context AND the Notification context, it will develop competing models of core concepts. The three teams (or sub-teams) will pull the service in different directions. Refactoring will be impossible without broad coordination. This is a mini-monolith that happened to be called a microservice.

The rule: if a microservice contains more than one bounded context, it is too large. Split it. The complexity of splitting early is much lower than the complexity of splitting after the code is deeply entangled.

**Conway's Law as a Design Tool**

Conway's Law: organizations produce systems that mirror their communication structures. For microservices, this means: the organizational structure of your engineering teams will inevitably shape the service structure, whether you plan it or not.

Use this deliberately. The "Inverse Conway Maneuver": design the organizational structure you want (one team per bounded context), and the system structure will follow. Before assigning bounded contexts to teams, ask: can this team be autonomous? Do they own their entire delivery pipeline? Do they control their data store? If a team needs to coordinate with three other teams to deploy a feature, the bounded context boundaries don't match the team boundaries, and Conway's Law will create coupling.

## Deep Dive

Sam Newman was the first practitioner to articulate clearly why Bounded Contexts and microservices are the same concept expressed in different vocabularies. In *Building Microservices*, he wrote that a Bounded Context defines the semantic boundary of a model — the scope within which a particular Ubiquitous Language is valid and consistent. A microservice defines an operational boundary — an independently deployable unit with its own process, its own data store, and its own deployment lifecycle. When the semantic boundary and the operational boundary align, you have a system that is both conceptually coherent and operationally independent. When they do not align — when a single microservice spans multiple bounded contexts, or when a single bounded context is split across microservices without a shared domain model — you get the distributed monolith: the worst of both worlds.

Newman's most practically influential insight was about the cost asymmetry of getting decomposition wrong in different directions. Splitting a microservice that is too coarse-grained requires breaking a running production system: you must separate data stores, establish new API contracts, migrate existing clients, and manage the operational complexity of the split under live traffic. Merging microservices that are too fine-grained requires reconciling two separate domain models and two separate data stores, which can require complex data migration. But the costs are not symmetric: splitting is generally safer and better understood than merging. This asymmetry is why Newman recommends starting with coarser boundaries — corresponding to the larger bounded contexts — and splitting only when a specific operational pressure requires it, rather than decomposing aggressively upfront.

Evans' treatment of Conway's Law in strategic DDD was brief but important. He observed that the organizational structure of teams and the structural structure of code tend to converge over time, whether you plan it or not. The "Inverse Conway Maneuver" — deliberately structuring teams to match the desired system architecture rather than letting the architecture follow the existing organization — is a strategic DDD move. If you want a clean Bounded Context boundary between Ordering and Fulfillment, you need a clean organizational boundary: one team owns Ordering, a different team owns Fulfillment, neither team has commit access to the other's codebase. Without this organizational enforcement, the boundary erodes: developers take shortcuts across the boundary when deadlines press, the contexts develop implicit coupling, and the "Bounded Context" becomes a label applied to code that doesn't actually respect the boundary.

The distributed monolith failure mode that Newman and others have documented extensively is, at its root, a Bounded Context failure. Services are split by technical layer (a "user service," a "product service," a "session service") rather than by domain boundary, so every meaningful business operation requires coordinated changes to multiple services. A single feature like "allow users to save items to a wish list" requires changing the user service, the product service, and a new wish list service simultaneously, with coordinated deployment. The services are not independent — they are pieces of a monolith that happen to communicate over HTTP instead of function calls. The coupling is still there; it has just been made slower, harder to debug, and more operationally complex. Newman's diagnostic: if deploying one service requires deploying other services, the Bounded Context boundaries are wrong.

The Microsoft .NET Microservices Architecture guide provides the most detailed worked example of the mapping between Bounded Contexts and microservices in its eShopOnContainers decomposition. The guide explicitly justifies each service boundary in domain terms: the Ordering service is a separate microservice not because orders are a large dataset but because the ordering domain has its own Ubiquitous Language, its own business rules (order validity, fulfillment eligibility, cancellation policies), and its own team ownership. The Catalog service is separate not for performance reasons but because catalog management (product listings, pricing, availability) has different domain rules and different domain experts from order management. Each service boundary reflects a genuine domain seam, not a technical convenience.

## Implementation Guide

**Step 1: Identify Bounded Contexts Before Drawing Service Boundaries**

Do not start decomposition by looking at your monolith's code. Start by understanding the domain.

Run an Event Storming session across the domain. Map all significant events. Identify the natural clusters of events that form coherent workflows. Each cluster is a candidate bounded context.

Then verify with the signals:
- Does the same term mean different things in different clusters?
- Do different organizational teams own different clusters?
- Do different clusters have different rates of change?
- Do different clusters have different scaling requirements?

Where you find these signals, you have a genuine bounded context boundary.

**Step 2: Map Bounded Contexts to Services**

With bounded contexts identified, the service mapping is usually straightforward:

```
Domain Sub-domain         → Bounded Context        → Service(s)
═══════════════════════════════════════════════════════════════
E-commerce
  Catalog                 → Product Catalog BC     → catalog-service
  Orders                  → Order Management BC    → order-service
  Fulfillment             → Fulfillment BC         → fulfillment-service
                                                   → warehouse-service (scale)
  Pricing                 → Pricing BC             → pricing-service
  Identity                → Identity BC            → identity-service
  Payments                → Payment BC             → payment-service (or Stripe)
```

Start with one service per bounded context. Only split a bounded context into multiple services when you have a specific operational reason: different scaling profiles, different technology requirements, different failure domain requirements.

**Step 3: Define Service Contracts as Published Language**

Each microservice publishes its API as a formal contract. Use Protocol Buffers, OpenAPI/Swagger, or Avro to define the Published Language explicitly.

```protobuf
// Order Service's Published Language (not the internal domain model)
service OrderService {
    rpc PlaceOrder(PlaceOrderRequest) returns (PlaceOrderResponse);
    rpc GetOrder(GetOrderRequest) returns (OrderSummary);
    rpc CancelOrder(CancelOrderRequest) returns (CancelOrderResponse);
}

message PlaceOrderRequest {
    string customer_id = 1;
    repeated OrderLineItem line_items = 2;
    ShippingAddress shipping_address = 3;
}

// Note: this is NOT the internal Order aggregate
// It's the public interface — the Published Language
message OrderSummary {
    string order_id = 1;
    string status = 2;
    Money total = 3;
    google.protobuf.Timestamp placed_at = 4;
}
```

The Published Language is the contract between the service and its consumers. It is designed for stability and backward compatibility. The internal domain model (the real `Order` aggregate with all its behavior) is hidden behind this contract.

**Step 4: Anti-Corruption Layers at Service Boundaries**

When service A calls service B, service A should never use service B's types directly in its domain logic. Use an Anti-Corruption Layer:

```java
// In the Order Service — ACL for the Catalog Service
public class CatalogServiceACL {
    private final CatalogServiceClient client;
    
    public ProductDetails getProductDetails(ProductId productId) {
        // Call Catalog Service (external)
        CatalogItemResponse response = client.getCatalogItem(productId.toString());
        
        // Translate from Catalog Service's types to Order domain types
        return new ProductDetails(
            ProductId.of(response.getItemId()),
            ProductName.of(response.getTitle()),
            Money.of(response.getBasePriceCents(), Currency.USD)
        );
    }
}
```

The `CatalogItemResponse` (Catalog Service's type) never leaks into the Order domain. The Order domain works with `ProductDetails` (its own type). When the Catalog Service changes its response format, only the ACL changes — the Order domain is insulated.

**Step 5: Event-Driven Integration Between Services**

Synchronous service calls create runtime coupling: if Service B is down, Service A cannot complete its operation. For operations that don't require immediate consistency, use domain events for cross-service integration.

```yaml
# Domain events published by Order Service
events:
  - OrderPlaced:
      schema: order-placed-v2.proto
      topic: orders.placed
  - OrderCancelled:
      schema: order-cancelled-v1.proto
      topic: orders.cancelled
  - OrderFulfilled:
      schema: order-fulfilled-v1.proto
      topic: orders.fulfilled

# Other services subscribe to these events
consumers:
  - inventory-service: subscribes to orders.placed (reserve stock)
  - notification-service: subscribes to orders.placed (send confirmation)
  - analytics-service: subscribes to orders.placed, orders.fulfilled
  - loyalty-service: subscribes to orders.fulfilled (award points)
```

The Order Service publishes events; downstream services react. The Order Service has no knowledge of who subscribes. Adding a new downstream consequence requires only adding a new subscriber — zero changes to the Order Service.

**Step 6: Migrating a Monolith Using DDD**

For teams migrating from a monolith to microservices, the strangler fig pattern aligned with bounded contexts is the safest approach:

1. Identify bounded contexts within the monolith (Event Storming helps)
2. Start with the bounded context that has the clearest boundary and least coupling
3. Extract it as a service, routing traffic to the new service gradually
4. Repeat for the next bounded context
5. The monolith shrinks; the services grow

The key discipline: never extract partial bounded contexts. Extract the entire context or nothing. Partial extractions produce distributed monoliths where the monolith and the new service share state or call each other synchronously.

```
Monolith Migration Sequence:
                                        
Week 1-4: Identify BCs in monolith via Event Storming
Week 5-8: Extract Identity BC (least coupled, clearest boundary)
Week 9-16: Extract Payment BC (3rd party integration, natural seam)
Week 17-28: Extract Catalog BC (high read traffic, scaling motivation)
...continuing until monolith is fully decomposed or a "nucleus" remains
```

## When to Use / When NOT to Use

**DDD-driven decomposition is appropriate when**:
- Migrating a monolith to microservices and needing principled decomposition
- Designing a new system that will be built and owned by multiple teams
- The domain is complex enough to have natural bounded context seams
- Teams are large enough that independent deployment provides real benefit

**DDD-driven decomposition is overkill when**:
- The system is genuinely simple — one team, one domain, no natural seams
- The team is small (fewer than 10 engineers) — microservices overhead exceeds independence benefit
- The domain is not yet understood — premature decomposition before domain understanding is dangerous
- You're building a proof of concept — get the domain right first, decompose later

## Common Mistakes

**Mistake 1: Microservice per aggregate**

Taking tactical DDD too literally: "one aggregate = one service." An `Order` aggregate becomes the `order-service`. A `Customer` aggregate becomes the `customer-service`. A `Product` aggregate becomes the `product-service`. Now a simple checkout requires synchronous calls to all three. Performance degrades. Any one service being down blocks the checkout flow.

Bounded context = service, not aggregate = service. Multiple aggregates can coexist within one bounded context and therefore within one service.

**Mistake 2: Sharing databases across services**

Two services sharing a database table are not independent. They share a schema as an implicit contract. One team's migration breaks the other team's queries. The database becomes the de facto integration layer. This is the most common path to a distributed monolith.

Each service must own its own data store. If two services need the same data, one publishes events and the other maintains its own copy (eventually consistent) — or one calls the other's API.

**Mistake 3: Synchronous calls for everything**

When every cross-service operation is a synchronous HTTP call, the system's availability is the product of every service's availability. If each service has 99.9% uptime, a flow requiring 10 synchronous calls has 99.0% uptime. Replace synchronous integration with event-driven integration wherever eventual consistency is acceptable.

**Mistake 4: No Anti-Corruption Layers**

Services that use each other's domain types directly are coupled to each other's domain evolution. When the upstream service refactors its model, every downstream service must change. ACLs prevent this contamination. Build ACLs at every service boundary.

**Mistake 5: Premature decomposition**

Decomposing before the domain is understood produces boundaries in the wrong places. Wrong boundaries are expensive to change once services are in production. Better to start with a modular monolith (well-bounded modules within a single deployment) and extract services when the boundaries are proven and the operational need is concrete.

## Connections

**Bounded Contexts**: The foundation. Bounded contexts are the unit of microservice decomposition. One bounded context = one service (at minimum).

**Context Mapping**: The context map becomes the service dependency map. Context map patterns (ACL, OHS, Published Language) become the API design patterns.

**Domain Events**: The primary mechanism for cross-service integration. Services publish domain events; other services subscribe. The event stream is the service's Published Language.

**Conway's Law**: Team structure should align with service structure, which aligns with bounded context structure. Use Conway's Law intentionally: design the org structure you want, and the system structure will follow.

**Anti-Corruption Layer**: Essential at every service boundary. Prevents upstream service model changes from cascading into downstream service domain models.

## Key Insights

The central insight is that microservice decomposition is fundamentally a domain modeling problem, not a technical problem. Teams that decompose based on technology (one service per database table) or workflow (one service per user flow) produce architectures that fight the domain's natural structure. Teams that decompose based on bounded contexts produce architectures that align with the domain — and therefore with the business — allowing both to evolve naturally.

The second insight is that the bounded context gives a microservice its identity. Without a bounded context grounding a microservice, the service has no principled reason to exist at this size and this scope. With a bounded context, the service has a clear answer to "what does this service do?" and "what does this service NOT do?"

The third insight is about the relationship between strategic design and microservice architecture. Microservices are a deployment pattern. Bounded contexts are a domain design pattern. The best microservice architectures align these two levels: each deployment unit (microservice) corresponds to a domain unit (bounded context). When they align, you get independent deployability, independent evolvability, and clear ownership. When they don't align, you get a distributed monolith with all the operational complexity and none of the independence.

Do the domain modeling first. Draw the bounded contexts. Then decompose into services. The tactical patterns will fall into place naturally within the service boundaries. Skip the domain modeling and your service boundaries will be arbitrary lines in the sand, constantly shifting as the system evolves.
