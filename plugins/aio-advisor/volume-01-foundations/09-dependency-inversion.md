# The Dependency Rule

> "The overriding rule that makes this architecture work is The Dependency Rule: source code dependencies must point only inward, toward higher-level policies." — Robert C. Martin, Clean Architecture

## The Problem

Imagine a well-intentioned codebase where the business logic layer imports from the database layer. This seems natural — business logic needs data, data lives in the database layer, so import it. The business logic layer also imports from the email service library, because when an order is placed, confirmation emails must be sent. And it imports from the payment gateway SDK, because payment processing is part of order fulfillment.

Now the team decides to switch from PostgreSQL to MongoDB. The database change requires modifying the business logic layer — not because the business rules changed, but because the business logic layer directly depends on PostgreSQL-specific APIs. The team also decides to switch email providers. Again, the business logic layer must change. When the payment gateway raises their rates and the company switches providers, the business logic layer must change again.

The business logic layer — the most valuable code the company has written, the code that encodes years of domain understanding — changes every time an infrastructure decision changes. This is the dependency problem: when high-level policy depends on low-level detail, the policy becomes as volatile as the detail. The most important code in the system becomes coupled to decisions that should be entirely beneath it.

Robert C. Martin's Dependency Inversion Principle (the D in SOLID) addresses this directly: high-level modules should not depend on low-level modules; both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions. This principle, applied at the architectural level as the Dependency Rule, is the structural foundation of Clean Architecture, Hexagonal Architecture, and Onion Architecture — three independently developed architectural patterns that converge on the same insight.

The dependency problem is not merely inconvenient. It is a deep structural error that compounds with time. Every time an infrastructure detail leaks into business logic, the business logic becomes harder to test (it requires the infrastructure to be available), harder to migrate (infrastructure changes cascade into business logic), and harder to understand (business logic contains infrastructure concerns). Over years, a codebase where dependencies are allowed to flow in any direction becomes one where no component can be understood or changed in isolation.

## Core Concept

The Dependency Rule has a simple statement: source code dependencies must point in one direction, and that direction is from low-level, mechanism-oriented code toward high-level, policy-oriented code.

To make this concrete: business rules do not depend on databases. They do not depend on web frameworks. They do not depend on email clients, payment SDKs, or message brokers. Business rules depend only on abstractions — interfaces that describe what they need — and the implementations of those abstractions depend on the business rules, not the other way around.

This inversion is counterintuitive because it inverts the typical mental model. Most developers think: "business logic needs data, so it depends on the database." The Dependency Rule says: "business logic describes what data access it needs (through an interface), and the database layer implements that interface." The business logic owns the interface; the database implements it. The dependency points from the database implementation toward the business logic interface definition, which is the opposite of the "natural" direction.

### Abstractions as the Inversion Point

The mechanism that enables dependency inversion is the abstraction — an interface or abstract type that sits at the boundary between a high-level policy and a low-level detail.

Consider the order placement scenario. Without dependency inversion, `OrderService.placeOrder()` calls `PostgreSQLOrderRepository.save(order)` directly. The dependency flows from `OrderService` to `PostgreSQLOrderRepository`.

With dependency inversion:
- `OrderService` depends on `OrderRepository` (an interface defined in the business logic layer)
- `PostgreSQLOrderRepository` implements `OrderRepository` (defined in the infrastructure layer)
- The dependency flows from `PostgreSQLOrderRepository` toward `OrderRepository` (toward business logic)
- `OrderService` has no dependency on `PostgreSQLOrderRepository`

The interface `OrderRepository` sits at the boundary between layers. Its definition lives in the business logic layer — the high-level layer that defines what data access the policy needs. Its implementation lives in the infrastructure layer — the low-level layer that knows how to interact with PostgreSQL. This is the inversion: the infrastructure depends on the business logic interface, not the reverse.

The practical consequence: replacing PostgreSQL with MongoDB requires creating a new `MongoDBOrderRepository` that implements `OrderRepository`. The business logic is untouched. The interface is untouched. Only the implementation changes, and the change is contained entirely within the infrastructure layer.

### Three Architectures, One Rule

Three major architectural patterns independently discovered and expressed the same dependency direction principle.

**Clean Architecture** (Martin, 2017) organizes the system into concentric circles: Entities at the center, then Use Cases, then Interface Adapters, then Frameworks and Drivers at the outermost ring. The Dependency Rule states that source code dependencies can only point inward — from the outer rings toward the inner rings. Nothing in the inner rings knows anything about the outer rings. The innermost layer — Entities — has no dependencies at all. It is the most stable code in the system.

**Hexagonal Architecture** (Cockburn, 2005), also called Ports and Adapters, divides the system into application core and adapters. The application core (business logic) defines ports — interfaces for what it needs to interact with the outside world. Adapters implement these ports — the database adapter implements the persistence port, the web adapter implements the HTTP port, the email adapter implements the notification port. All adapters depend on the application core's ports; the core knows nothing about the adapters. The metaphor of a hexagon emphasizes that there are many possible adapters (driving adapters that initiate the application, driven adapters that the application drives) and all interact through ports.

**Onion Architecture** (Palermo, 2008) uses onion layers with the domain model at the center, surrounded by domain services, then application services, then infrastructure at the outermost layer. Like Clean Architecture, dependencies point inward. The domain model at the center has no dependencies; it is the most isolated and most valuable code. Infrastructure at the periphery depends on everything inward; it is the most easily replaced.

All three patterns express the same insight: organize code so that the most important, stable, policy-defining code has no outward dependencies. Let mechanism-level code depend on policy-level code, not the reverse.

### The Stable Abstractions Principle

A companion principle from Martin's Package Principles adds nuance: stable components should be abstract, and unstable components should be concrete.

A stable component is one that many other components depend on — it is difficult to change because changing it affects many callers. Given that stability, a stable component should be abstract (an interface or abstract type) rather than concrete. Concrete implementations can be changed freely; abstract interfaces are the contracts that other components depend on.

An unstable component — one that depends on many others but that few others depend on — can be concrete, because changing it only affects itself.

Applied to the dependency rule: the innermost layers (most stable, most depended-upon) should be highly abstract — consisting largely of entity definitions, interface specifications, and abstract use case descriptions. The outermost layers (least stable, depending on much) can be fully concrete — specific database implementations, specific web framework handlers, specific third-party client wrappers.

This creates a system where the abstract interfaces (business logic layer) are stable and rarely change. The concrete implementations (infrastructure layer) can be swapped without affecting anything that depends on them, because what those things depend on are the interfaces, not the implementations.

## Deep Dive

The Dependency Rule is one of the most thoroughly documented architectural principles, because its violation produces consequences that are both common and expensive — and its application in large systems creates patterns that recur across very different contexts. Three bodies of engineering literature illuminate how the principle operates at scale and what makes it work in practice.

### The "Software Engineering at Google" Perspective: Dependency Inversion at Service and Library Boundaries

"Software Engineering at Google" and Google's published protocol documentation reveal how dependency inversion manifests at the service boundary level, where the stakes are highest and the enforcement mechanisms must be most robust.

Protocol Buffers represent dependency inversion applied to service communication. When two services need to communicate, the naive approach is for the consuming service to depend directly on the producing service's data types and client library. This creates a concrete dependency: the consumer's code must change whenever the producer's internal types change. Protocol Buffers introduce an abstraction at the boundary: both services depend on the `.proto` definition, not on each other. The proto definition is the stable interface; the producer's implementation and the consumer's client code are both implementations that depend on it. Changes to the producer's internal representation — how it stores data, what structures it uses internally — do not affect consumers as long as the proto contract is honored. The dependency points toward the abstraction, not toward the implementation.

Google's Abseil library design applies the Stable Abstractions Principle with unusual rigor. Public APIs are versioned and kept stable across years of active development; internal implementations are updated, optimized, and refactored frequently. Users depend on the stable interface contract, not on implementation details. Google can make the implementation substantially more efficient — changing data structures, algorithms, memory layouts — without requiring users to change their code. The dependency direction is correct: callers depend on the stable abstraction; the implementation depends on the specification of what the abstraction must provide.

The SRE book's treatment of service interfaces captures the organizational expression of dependency inversion. Every service exposes its behavior through a documented interface — an API contract paired with SLOs that specify reliability commitments. Other services depend on this interface; they know nothing about the implementation behind it. When a service's implementation changes — new storage backend, refactored internal architecture, different scaling approach — callers are unaffected if the interface contract is maintained. This is dependency inversion at the organizational level: callers depend on the interface, which the service team owns and maintains independently of implementation.

Bazel's build system enforces dependency direction mechanically. Every BUILD target declares its dependencies explicitly. A domain layer target that imports from an infrastructure layer target without a declared dependency fails to build. This transforms what is typically a code review concern — checking that dependencies flow the right direction — into a build system enforcement. Violations are impossible rather than merely discouraged.

### The AWS Builder's Library Perspective: Dependency Inversion as Organizational Policy

Amazon's most important contribution to dependency inversion thinking is demonstrating how the principle can be enforced as an organizational policy rather than relying on individual developer discipline. The API Mandate is the canonical example.

The mandate's core requirement — that all teams expose their data and functionality through service APIs, and that all access to a team's data go through those APIs — is a dependency inversion policy applied at organizational scale. Before the mandate, teams could create hidden dependencies by accessing each other's databases directly, sharing internal libraries, or calling each other's internal functions. These concrete dependencies meant that a team's internal implementation details were implicitly part of other teams' dependencies. A database schema change in one team could break another team's code with no API change at all.

The mandate eliminated this class of hidden dependency. After the mandate, the only dependencies between teams were through explicitly defined service APIs. The API is the abstraction; the service implementation is hidden behind it. Teams can change their implementations — refactor their databases, rewrite their internal logic, change their storage systems — without affecting other teams as long as the API contract is maintained. The dependency direction was enforced by policy: callers depend on the API (the abstraction), not on the implementation.

The practical consequence documented in Builder's Library essays is that this dependency inversion created the conditions for independent deployment and independent scaling. When dependencies between services are limited to API contracts, a service can be deployed independently: updating its implementation does not require coordinating with callers, because callers depend only on the API, which has not changed. This deployment independence was not the primary goal of the API Mandate — it was a consequence of getting the dependency direction right.

Event schema design in Amazon's event-driven architecture applies the same principle to asynchronous dependencies. Producers and consumers are decoupled by a shared schema that both depend on. The producer does not depend on the consumer — it publishes events conforming to the schema and does not know or care who consumes them. The consumer does not depend on the producer — it subscribes to events matching the schema and does not know or care who produces them. Both depend on the schema (the abstraction). When the producer's implementation changes in ways that do not affect the event schema, consumers are unaffected. When consumers are added or changed, producers are unaffected.

### The Microsoft .NET Architecture Perspective: Dependency Inversion Through Framework Design

Microsoft's .NET framework and ASP.NET Core represent the most thorough institutionalization of dependency inversion in mainstream application frameworks. The framework's design assumes that application code will depend on interfaces rather than on concrete implementations, and it provides the infrastructure — dependency injection containers, interface hierarchies, testability patterns — that makes this practical.

The .NET Base Class Library's interface design reflects the Stable Abstractions Principle throughout. Core interfaces — `IEnumerable<T>`, `IDisposable`, `ILogger<T>`, `IServiceProvider` — are stable across major framework versions. Implementations of these interfaces evolve significantly: memory allocation patterns change, performance improves, new capabilities are added internally. Code that depends on the interfaces remains valid across these changes. The framework's own components depend on these interfaces rather than on concrete implementations, which is why third-party implementations of `ILogger<T>` or `IServiceProvider` can be substituted seamlessly — the framework was designed to depend on the abstraction.

ASP.NET Core's dependency injection container is the runtime mechanism that makes dependency inversion practical in application code. Without a DI container, wiring up interface-to-implementation bindings requires either a manual composition root — code that creates concrete instances and passes them to constructors — or a factory pattern for each interface. The DI container automates this wiring: declare that `IOrderRepository` should be fulfilled by `PostgreSQLOrderRepository`, and the container injects the appropriate concrete type wherever `IOrderRepository` is declared as a dependency. Application code declares what it needs (interfaces); the composition root declares what provides it (implementations). The separation between declaration and fulfillment is the dependency inversion mechanism.

The MAUI framework's multi-platform support demonstrates dependency inversion as the foundation of platform abstraction. Application code depends on platform-independent abstractions: `INavigationService` for navigating between screens, `IAlertService` for showing dialogs, `IFilePicker` for accessing files. Platform-specific implementations provide the actual behavior: the iOS navigation service uses UINavigationController, the Android implementation uses FragmentManager, the Windows implementation uses Frame. The same application logic runs on all platforms because it depends on abstractions that are implemented per-platform. The application code owns the interface specification; the platform adapters implement it.

### The Convergent Insight: The Interface Belongs to the Caller

Across all three bodies of literature, the most practically important insight about dependency inversion is about ownership: the interface definition belongs to the higher-level component that defines what it needs, not to the lower-level component that satisfies it.

This ownership distinction determines whether the dependency is truly inverted. When an `OrderRepository` interface is defined in the infrastructure package — by the team that implements database access — the domain package must import from the infrastructure package to use it. The dependency points from domain to infrastructure: the natural, uninverted direction. When the `OrderRepository` interface is defined in the domain package — by the team that specifies what data access the domain needs — the infrastructure package must import from the domain package to implement it. The dependency points from infrastructure to domain: the inverted direction.

Google's proto definitions are owned by the services that define their contracts. Amazon's service APIs are owned by the teams whose services they describe. Microsoft's BCL interfaces are owned by the framework that specifies what the platform must provide. In each case, the abstraction is owned by the higher-level layer that defines the need, and the implementation is owned by the lower-level layer that satisfies it. Dependency direction follows ownership.

## Implementation Guide

**Start with the domain, not the infrastructure.** When building a new feature, begin by defining the domain model and use case logic without any infrastructure concerns. What does the domain need? Define that as an interface. Only after the domain logic is clear should you implement the infrastructure that satisfies the interface.

**Define interfaces where dependencies cross layer boundaries.** Every time a higher-level component needs to call a lower-level component, introduce an interface at the boundary. The interface is defined in the higher-level component's package, not the lower-level one. The higher-level component owns the abstraction; the lower-level component implements it.

**Package by architectural layer or by feature, not by type.** Grouping all interfaces in one package and all implementations in another package violates the Dependency Rule — interfaces should live with the layer that defines them, not with other interfaces. A domain layer that contains both `OrderRepository` (interface) and `PostgreSQLOrderRepository` (implementation) in the same package has collapsed the layer boundary.

**Use dependency injection to wire dependencies at application startup.** The composition root — the place where the system assembles its dependencies — is the only place where concrete implementations are named. All other code depends only on abstractions. The composition root ties everything together without creating dependencies between components.

**Test the dependency rule with fitness functions.** Tools like ArchUnit (Java), Dependency Cruiser (TypeScript/JavaScript), and custom build rules can verify that dependencies flow only inward. These should run in CI/CD to prevent violations from entering the codebase.

**Resist the temptation to put infrastructure convenience in domain code.** Database-specific annotations on domain entities, ORM-managed collections in aggregate types, HTTP-specific error types in use cases — these are all violations of the Dependency Rule. They are usually introduced for convenience and almost always cause pain during migrations.

## When to Use

The Dependency Rule is worth applying in any system that:
- Has a meaningful business domain with rules that are not trivially simple
- Uses infrastructure that might reasonably change (database, message broker, third-party APIs)
- Needs to be unit-tested at the domain logic level
- Will be maintained over a period of years

All of these conditions apply to most production software systems of meaningful complexity.

## When NOT to Use

For very small systems — a CLI tool, a simple data pipeline, a single-purpose script — the overhead of interfaces and dependency injection machinery may exceed the benefit. When a system is small enough to be rewritten in a few days and infrastructure changes are unlikely, the Dependency Rule's indirection costs more than it provides.

Also, strict application of the Dependency Rule to every detail produces over-engineering. Not every function needs an interface. Not every infrastructure call needs an abstraction. Apply the rule at significant architectural boundaries — layer crossings, external dependency crossings, team boundaries — not at every level of abstraction.

## Common Mistakes

**Mistake 1: Creating interfaces for every class regardless of whether they are needed.** Interfaces that have exactly one implementation and are never mocked are usually unnecessary. Interfaces add value when they enable swapping implementations (for testing or for production alternatives). Interfaces that exist only to satisfy a rule produce shallow modules and indirection without benefit.

**Mistake 2: Defining interfaces in the wrong layer.** An `OrderRepository` interface defined in the infrastructure package still creates a dependency from the domain to the infrastructure package (because the domain must import the infrastructure package to use the interface). Interfaces must live in the higher-level layer that defines the need, not the lower-level layer that satisfies it.

**Mistake 3: Bypassing the interface with type assertions.** Code that receives an `OrderRepository` interface and then type-asserts it to `PostgreSQLOrderRepository` to access PostgreSQL-specific methods has violated the dependency rule. The type assertion creates a compile-time dependency on the concrete type, bypassing the abstraction.

**Mistake 4: Leaking infrastructure types through abstractions.** An interface method like `GetOrders(ctx context.Context) (*sql.Rows, error)` returns an infrastructure type (`sql.Rows`) through the abstraction boundary, violating the dependency rule. The domain layer now depends on the `database/sql` package to handle the return value. Return domain types through interfaces, not infrastructure types.

**Mistake 5: Treating the Dependency Rule as an excuse for premature abstraction.** Some teams apply the Dependency Rule before they understand the domain well enough to define stable interfaces. Premature abstraction produces interfaces that need to change as domain understanding develops, and those changes cascade through all implementations. Understand the domain first; abstract when the interface is stable.

## Connections

- **Separation of Concerns** — The Dependency Rule is how separated concerns are connected without creating bidirectional coupling; dependencies flow in the direction that separates stable from volatile. See article 08.
- **Boundaries Are the Architecture** — Layer boundaries enforced by the Dependency Rule are the foundation of Clean Architecture, Hexagonal Architecture, and Onion Architecture. See article 03.
- **Deep Modules vs Shallow Modules** — Interfaces that define layer boundaries should be deep — they should provide substantial value and hide substantial implementation complexity. See article 07.
- **Fitness Functions** — Dependency direction analysis is a natural fitness function; tools that verify the Dependency Rule is maintained make it enforceable rather than aspirational. See article 06.
- **Complexity Is What Matters** — The Dependency Rule directly reduces change amplification: changes to infrastructure do not cascade into business logic when dependencies point the right way. See article 01.

## Key Insights

1. The most important code — business logic — should have the fewest dependencies. The most easily replaceable code — infrastructure — can have the most. This is the Dependency Rule's core organizing principle.

2. The interface does not belong to the implementation; it belongs to the caller. The domain layer owns `OrderRepository`; the infrastructure layer implements it. This ownership is what makes the inversion real.

3. Clean Architecture, Hexagonal Architecture, and Onion Architecture are the same pattern expressed in three different vocabularies. Understanding the underlying Dependency Rule makes all three comprehensible without memorizing any of them separately.

4. Dependency injection is the runtime mechanism for dependency inversion. Without DI, the composition root — where concrete implementations are named — would need to be in the domain code, reintroducing infrastructure dependencies. DI moves the naming of implementations to the application's startup code.

5. The Dependency Rule makes business logic independently testable. When domain code depends only on interfaces that tests can inject with mocks, every domain behavior can be tested without infrastructure. This is not a testing convenience — it is a structural correctness property.

6. Infrastructure should be a detail. The choice of PostgreSQL vs MongoDB, REST vs gRPC, Redis vs Memcached should be a configuration decision, not a structural dependency. The Dependency Rule enforces this by ensuring infrastructure knowledge cannot leak into business logic.

7. Stable abstractions enable long-lived systems. Code that depends on stable interfaces can survive multiple generations of infrastructure change. Code that depends on concrete implementations must change every time the implementation changes. Over a ten-year system lifetime, the value of stable abstractions is enormous.
