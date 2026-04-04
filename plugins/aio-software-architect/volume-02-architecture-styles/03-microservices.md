# Microservices Architecture

> "The microservice architectural style is an approach to developing a single application as a suite of small services, each running in its own process and communicating with lightweight mechanisms." — Martin Fowler & James Lewis (2014)

## The Problem

In 2006, Amazon's retail website was a single Java application known internally as "Obidos." It was one of the largest codebases in the world, and it was killing them. Deploying a bug fix to the checkout flow required coordinating with the teams responsible for search, recommendations, catalog management, and account management. Every deployment was a company-wide event. A failure in one component could bring down the entire site. Engineers working on personalization had to understand how the catalog team had structured their data, because they shared it directly.

The problem was not that the system was large. The problem was that the deployment unit did not match the organizational unit. Amazon had hundreds of teams, each responsible for a specific business capability. But they all had to deploy together. The coordination cost was enormous, and it grew superlinearly with team count. Adding a new team did not add linear capacity — it added coordination overhead that slowed down everyone.

Amazon's answer was radical: decompose the application so that each team owns a service that deploys independently, scales independently, and fails independently. If the recommendations service goes down, checkout keeps working. If the catalog team needs to deploy at 2 AM, they don't need to coordinate with anyone else. This insight — that independent deployability is the core value proposition of microservices — is what Sam Newman later codified as the defining characteristic of the style.

## Core Concept

A microservices architecture decomposes a system into a collection of small, independently deployable services, each responsible for a specific business capability. The canonical definition from Sam Newman's "Building Microservices" centers on one principle above all others: **independent deployability**.

You can have small services. You can have services that communicate over HTTP. You can have services with their own databases. None of these are sufficient to call an architecture microservices. Independent deployability — the ability to deploy any one service without coordinating with or deploying any other service — is what makes the difference.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Catalog   │     │   Orders    │     │  Payments   │
│   Service   │     │   Service   │     │   Service   │
│             │     │             │     │             │
│  /products  │     │  /orders    │     │  /payments  │
│  /search    │     │  /cart      │     │  /refunds   │
│             │     │             │     │             │
│  Catalog DB │     │  Orders DB  │     │ Payments DB │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                    API Gateway / Mesh
                           │
                     Client Applications
```

Each service:
- Has its own process (container, VM, or serverless function)
- Has its own database or data store (no shared database)
- Communicates via network protocols (HTTP/REST, gRPC, message queues)
- Is independently deployable (CI/CD pipeline per service)
- Is owned end-to-end by one team

### The Types of Coupling — Why Most "Microservices" Aren't

Sam Newman's taxonomy of coupling in distributed systems explains why so many microservices deployments fail to achieve independent deployability:

**Domain coupling** (acceptable): Service A calls Service B because A needs to know something that B knows. The Orders service calls the Customer service to get a shipping address. This coupling is unavoidable and acceptable. The key is minimizing what is passed.

**Pass-through coupling** (dangerous): Service A receives data from a client and passes it unchanged to Service C via Service B. Service A now has knowledge of what Service C needs. If Service C's API changes, Service A must change even though it doesn't use the data directly. This is the sign of incorrect service decomposition.

**Common coupling** (very dangerous): Multiple services share the same mutable data. Two services write to the same database table. This is microservices in name only — the shared state creates the same deployment coordination problems as a monolith.

**Content coupling** (worst): Service A directly accesses another service's internal data — queries another service's database, accesses another service's internal API that was not intended to be public. This is a boundary violation that makes independent evolution impossible.

```
                 Common Coupling (Avoid)
                        ↓
Service A ──→ Shared DB ←── Service B   ← Both can deploy?
                                           NO. Schema changes
                                           require both to deploy.

                 Domain Coupling (OK)
                        
Service A ──→ API ──→ Service B         ← Both can deploy?
                                           YES. API contract
                                           is the boundary.
```

### Decomposition Strategies

The hardest problem in microservices is deciding where to draw service boundaries. Two primary decomposition strategies:

**Decompose by business capability**: Each service represents a business capability — something the business does. Product Catalog is a capability. Order Management is a capability. Payment Processing is a capability. This aligns services with organizational structure (Conway's Law) and with how the business communicates about its domain.

**Decompose by subdomain (DDD)**: Use Domain-Driven Design's bounded context concept. Each bounded context becomes a service. The advantage is that DDD gives you a rigorous methodology for finding the boundaries — you look for where the ubiquitous language changes, where the same word means different things to different teams.

The wrong way to decompose: by technical function (a "database service," a "validation service," an "authentication service"). These create chatty networks of fine-grained services with high coordination overhead and no correspondence to business structure.

## Deep Dive

### Conway's Law as Architectural Force

The "Software Engineering at Google" book's treatment of organizational structure and software architecture is one of the most rigorous published analyses of what practitioners call Conway's Law — Melvin Conway's 1968 observation that "organizations which design systems are constrained to produce designs which are copies of the communication structures of these organizations." The book documents how Google's large engineering teams inevitably produce systems whose internal structure mirrors the organizational chart, and how this is not a failure but a phenomenon to be designed around deliberately.

Microservices architecture is, at its core, an attempt to make Conway's Law work for you rather than against you. The "Software Engineering at Google" book's chapter on "Modularity" observes that when a codebase is owned by a single team, the natural coupling that develops over time reflects that team's internal communication patterns — which is generally fine. When a codebase is shared across many teams, the coupling that develops reflects the intersection of all those teams' communication patterns, which creates coordination overhead that grows superlinearly with team count. The microservices insight is to align the deployment boundary with the team boundary so that each team's communication overhead is contained within their service.

The practical implication the book draws is sobering: microservices are justified by organizational scale, not system complexity. A hundred-engineer organization deploying a monolith will spend disproportionate engineering time on coordination — merge conflicts, deployment scheduling, "who owns this?" questions, cross-team code reviews. A ten-engineer organization deploying microservices will spend disproportionate engineering time on infrastructure — distributed tracing, service mesh configuration, deployment pipelines per service. The correct architecture is the one that minimizes the dominant cost for your specific scale.

### The AWS Builder's Library on Distributed Systems Fundamentals

The AWS Builder's Library contains several essays that collectively describe what Amazon learned building microservices at scale — insights earned through painful production failures. The essay "Avoiding fallback in distributed systems" articulates a principle that surprises many architects: the failure modes you design against in a monolith (exceptions, null returns, slow queries) are fundamentally different from the failure modes you design against in microservices (network timeouts, partial failures, inconsistent state between services). Building a microservices system while thinking in monolith failure modes produces systems that fail in ways the team is not equipped to diagnose.

The essay "Implementing health checks" documents how even something as simple as "is this service healthy?" becomes non-trivial in a distributed system. A service can be healthy from a process perspective — its threads are running, it is accepting connections — while being unhealthy from a business perspective because a downstream dependency it relies on is degraded. The monolith equivalent of this problem simply does not exist: a slow database query is observable directly in the application's execution context. In microservices, the slowness may be three hops away and detectable only through careful distributed tracing.

The Builder's Library essay "Timeouts, retries, and backoff with jitter" is required reading for any team considering microservices. The essay documents how retry logic that seems obviously correct in isolation creates catastrophic thundering herd problems in production. A microservice that retries failed requests immediately, without jitter, synchronizes its retry storms with all other services retrying the same downstream dependency simultaneously. This insight — that local correctness does not guarantee global correctness in distributed systems — is the fundamental challenge that the "Software Engineering at Google" book identifies as the defining characteristic of distributed system engineering.

### The Well-Architected Framework and Blast Radius Thinking

The AWS Well-Architected Framework introduces the concept of "blast radius" — the scope of impact when a component fails. The Framework's reliability pillar observes that one of the primary benefits of microservices over monoliths is blast radius reduction: when the recommendations service fails, only recommendations are degraded; checkout, catalog, and customer service continue operating. This is the core reliability justification for microservices, and it is genuine.

However, the Framework is careful to note that blast radius reduction has a prerequisite: services must be genuinely independent. The Framework's guidance on "loose coupling" describes the characteristics of truly independent services — they do not share databases, they do not have synchronous call chains where one service's availability depends on another's, they are designed to degrade gracefully when their dependencies are unavailable. Services that share state, even through separate databases that are expected to be consistent with each other, do not achieve blast radius reduction. They achieve blast radius *relabeling* — the failure still propagates, it is just harder to trace because the coupling is implicit rather than explicit.

The Microsoft Azure Architecture Center's guidance on microservices elaborates on this with the concept of "bulkheads" — the practice of isolating failures so they cannot cascade. The Azure guidance observes that bulkheads are one of the most important and least understood properties of a microservices system. A service that holds a thread pool open for each downstream dependency, with appropriately sized pools and timeouts per dependency, ensures that a slow dependency degrades only the operations that depend on it, not the entire service. Without bulkheads, a single slow downstream service can exhaust the thread pool of its caller, which then appears slow to its callers, propagating the failure upstream across the entire call chain — defeating the blast radius benefit that motivated the microservices investment in the first place.

### Independent Deployability as the Defining Constraint

Sam Newman's "Building Microservices" — the most thorough practitioner treatment of the architecture — makes a point that the "Software Engineering at Google" book supports from the other direction: independent deployability is not a feature of microservices, it is the *definition*. A system where services can only be deployed in coordinated groups, where a schema change requires simultaneous deployment of three services, where deployment schedules are negotiated across teams — that system is a distributed monolith regardless of how many processes it runs in. The distributed monolith is the failure mode that both Newman and the Google book identify as worse than either a well-structured monolith or genuine microservices.

The Google book's chapter on "Large-Scale Changes" documents the engineering infrastructure Google has built specifically to enable safe, independent changes across their service boundaries — automated testing, canary deployments, feature flags that can gate behavior without deployment. This infrastructure investment is the hidden cost of microservices that is rarely discussed in architectural discourse. The benefit (independent deployability) is visible and desirable. The cost (the engineering infrastructure required to make independent deployment safe rather than just possible) is invisible until you try to build it. Teams that adopt microservices without investing in this infrastructure end up with services that are independently deployable in theory but deployed together in practice — paying the distributed systems tax without collecting the deployment autonomy benefit.

## Implementation Guide

### Step 1: Start with a monolith, modularize it, then extract

The most reliable path to microservices goes through a modular monolith. Build the system as a well-structured monolith with clear module boundaries first. When you understand the domain well enough and have an operational need for independent deployability (the scale need, the team autonomy need), extract a module as a service.

The strangler fig pattern is the standard extraction technique:
1. Build the new service alongside the monolith
2. Route new traffic to the new service
3. Gradually migrate existing traffic
4. Remove the old code from the monolith once traffic is fully migrated

This is safer than a big-bang decomposition, which risks drawing boundaries in the wrong places.

### Step 2: Implement the service chassis pattern

Every service needs the same set of cross-cutting concerns: logging, distributed tracing, health checks, configuration, circuit breakers. The service chassis pattern provides a template that handles all of these, so service developers focus on business logic.

```typescript
// Every service starts from this chassis
class ServiceChassis {
  private readonly tracer: Tracer;
  private readonly logger: Logger;
  private readonly healthChecks: HealthCheck[];
  private readonly circuitBreakers: Map<string, CircuitBreaker>;
  
  async startService(serviceConfig: ServiceConfig): Promise<void> {
    await this.configureTracing(serviceConfig.serviceName);
    await this.configureLogging(serviceConfig.logLevel);
    await this.registerHealthEndpoints();
    await this.startMetricsExporter(serviceConfig.metricsPort);
  }
}
```

In practice, this is usually a Docker base image + Kubernetes deployment template + shared library. Teams fork from the template rather than building from scratch.

### Step 3: Design your inter-service API contracts as public contracts

Unlike module interfaces in a modular monolith, service APIs must be treated as public contracts — because changing them requires deployment coordination across service teams.

Use semantic versioning for APIs. Run multiple versions in parallel during transitions. Never break a contract without a deprecation period.

```
GET /v1/products/{id}   ← still in use by old clients
GET /v2/products/{id}   ← new version with different response shape
```

Consider using API description formats (OpenAPI for REST, Protobuf for gRPC) as the source of truth for contracts, with contract testing (Pact) to verify that consumers and providers stay in sync.

### Step 4: Implement the saga pattern for distributed transactions

Microservices cannot use database transactions across service boundaries. When a business operation spans multiple services (creating an order requires reserving inventory, charging a card, and creating a fulfillment record), you need a distributed coordination pattern.

The saga pattern breaks the distributed transaction into a sequence of local transactions, each publishing an event that triggers the next step:

```
Order Placement Saga:
1. Orders Service: Create order (PENDING)
   → Publish OrderCreated event
2. Inventory Service: Reserve inventory
   → Publish InventoryReserved event (success)
   → OR publish InventoryReservationFailed event (failure)
3. Payments Service: Charge card
   → Publish PaymentCharged event (success)
   → OR publish PaymentFailed event (failure)
4. Orders Service: Confirm order (CONFIRMED)

Compensating transactions for rollback:
PaymentFailed → Inventory Service: Release reservation
InventoryReservationFailed → Orders Service: Cancel order
```

The complexity of saga management — tracking state, handling partial failures, implementing compensating transactions — is why microservices require significantly more engineering effort than monoliths for operations that span service boundaries.

### Step 5: Build for observability from day one

In a monolith, debugging is a local operation: attach a debugger, add a log line, reproduce locally. In microservices, a user's request touches ten services, and the failure might be a timeout in service seven of ten on only 0.1% of requests.

Observability is non-negotiable in microservices:

- **Distributed tracing**: Every request gets a trace ID that follows it across all service calls. OpenTelemetry is the current standard.
- **Structured logging**: JSON logs with trace ID, service name, and request context on every line. Feed into Datadog, Splunk, or Elasticsearch.
- **Metrics**: Service-level indicators (error rate, latency percentiles, throughput) per service. Prometheus + Grafana is the common stack.
- **Alerting**: Per-service SLO alerts, not just infrastructure alerts.

If you cannot answer "which service is responsible for this user-facing error?" within five minutes of an incident, your observability is insufficient for microservices.

## When to Use

**Microservices are the right choice when:**

- **You have independent scaling requirements** across different parts of your system. The payment processing service needs 10x the compute during holiday peaks while the analytics service can scale down. Independent scaling is one of the concrete, measurable benefits of microservices.

- **You have organizational scale requiring independent deployability**. When you have ten or more distinct product teams who need to deploy on their own schedules without coordinating with each other, the shared deployment pipeline of a monolith becomes the bottleneck.

- **You have polyglot technology requirements**. The ML recommendation team needs Python. The high-throughput API team needs Go. The mobile backend team needs Node.js. Microservices allow each team to use the right tool for their problem.

- **You need fault isolation**. In a monolith, a memory leak in the recommendations feature can bring down the entire site. In microservices, it takes down only the recommendations service while everything else keeps running.

- **Your operational maturity supports it**. You have automated CI/CD pipelines, container orchestration (Kubernetes), distributed tracing, and engineers experienced with distributed systems. Without this foundation, microservices are a liability.

## When NOT to Use

**Microservices are the wrong choice when:**

- **Your team is small** (under 20 engineers). The operational overhead of managing multiple services — deployment pipelines, monitoring per service, distributed tracing, service discovery — consumes a disproportionate amount of a small team's engineering capacity.

- **You do not yet understand the domain**. Wrong service boundaries are far more expensive to fix than wrong module boundaries. If you are building in a new domain and learning as you go, start with a monolith. Extract services only when the boundaries have proven stable.

- **You lack the operational infrastructure**. Microservices require Kubernetes (or equivalent), CI/CD per service, distributed tracing, structured logging aggregation, and on-call procedures that account for inter-service failures. Building this infrastructure takes engineering months. Factor this into your decision.

- **Most of your operations require cross-service coordination**. If 60% of your business operations require orchestrating three or more services, you have the network overhead of microservices without the independence benefits. Your service boundaries are wrong.

- **You are building an MVP or exploring a new product**. Speed of iteration is paramount in early product development. A monolith lets you move fast and refactor freely. Microservices slow you down when the product direction is still changing.

## Common Mistakes

### 1. The Distributed Monolith

The most common microservices failure: services that are physically separate but logically coupled. They share a database. They are always deployed together. A change to one requires changes to several others. This is a monolith with network latency added — strictly worse than a real monolith.

The diagnostic: can you deploy Service A without any concern for whether Services B, C, and D are also being deployed? If the answer is "we always deploy them together," you have a distributed monolith.

### 2. Decomposing Too Early and Too Fine

Decomposing before you understand the domain produces service boundaries in the wrong places. Fine-grained decomposition (a service per database entity, a service per function) produces chatty services that make constant network calls to each other.

The rule of thumb: a microservice should be "micro" in terms of team size, not necessarily code size. If one team cannot own a service entirely (understand it, modify it, deploy it, operate it), it may need to be split. If two services are always developed and deployed together by the same team, they should probably be merged.

### 3. Neglecting the Data Problem

Teams focus on service decomposition and forget about data. Services that share a database have not actually achieved independence. Services that need to query data across boundaries need a strategy — and "just query both databases from the calling service" is not that strategy.

Patterns for the data problem:
- **API composition**: Call multiple services and merge results in memory (appropriate for queries)
- **CQRS with read models**: Maintain denormalized read models that aggregate data from multiple services' events
- **Event-driven data replication**: Services subscribe to events from other services and maintain local copies of the data they need

### 4. Ignoring Network Failure Modes

In a monolith, a method call either returns or throws. In microservices, there are new failure modes: the network call hangs indefinitely, the called service returns a 503, the response arrives but is malformed, the call succeeds but the downstream service is processing in a degraded state.

Every inter-service call needs timeout and retry configuration. Every service that calls others needs circuit breakers. Without these, failures cascade: Service A hangs waiting for Service B, exhausting Service A's thread pool, causing Service A to fail for all requests, causing Service C which calls Service A to also degrade.

### 5. Not Versioning APIs

Service APIs must be treated as public contracts with the same versioning discipline as a public SDK. When Service A changes its API, all services that depend on it must be updated. If those services are deployed by different teams, coordination is required.

The solution is to never make breaking changes to an existing API version. Add a new version alongside the old one. Deprecate the old version with a long notice period. Maintain both versions until all consumers have migrated. This is operationally expensive but far less expensive than the alternative (breaking dependent services without notice).

## Connections

Microservices exist in a web of related patterns:

- **Modular Monolith** is both the predecessor and the alternative. A well-designed modular monolith is microservices-ready; its modules can be extracted as services when needed. For many teams, the modular monolith is the destination, not a waypoint.
- **Event-Driven Architecture** is the communication backbone for loosely coupled microservices. The combination of microservices + event-driven architecture addresses the common coupling problem: instead of sharing a database, services communicate through events.
- **CQRS and Event Sourcing** frequently appear in microservices architectures as solutions to the distributed data problem.
- **Service Mesh** (Istio, Linkerd, Consul Connect) is the infrastructure pattern for managing service-to-service communication at scale — handling service discovery, mTLS encryption, circuit breaking, and traffic management at the platform level rather than in application code.
- **API Gateway** pattern provides the single entry point that routes client requests to the appropriate services, handles authentication, and aggregates responses.

## Key Insights

1. **Independent deployability is the definition, not the consequence.** If you cannot deploy any single service without coordinating with any other service, you do not have microservices. You have a distributed monolith. Everything else — small services, separate databases, polyglot technology — is in service of this one property.

2. **Conway's Law is a force, not a suggestion.** Your service architecture will mirror your organizational structure whether you want it to or not. Design your organization first, then let service boundaries follow. Amazon did not decompose their software and then reorganize; they reorganized into two-pizza teams and the service decomposition followed naturally.

3. **The operational cost is real and large.** A microservices system requires significant ongoing investment in tooling, infrastructure, and expertise that a monolith does not. This is not a one-time cost — it is an ongoing tax on every engineering decision. Before choosing microservices, calculate whether the scale and autonomy benefits justify this tax for your specific situation.

4. **Most microservices problems are data problems.** The hardest challenges — consistency, querying across service boundaries, distributed transactions, data duplication — all come from the constraint that services own their own data. Get the data ownership right and the rest becomes manageable.

5. **You cannot have microservices without a strong platform team.** The teams building business features cannot also maintain Kubernetes clusters, distributed tracing infrastructure, CI/CD pipelines, and service mesh configuration. A dedicated platform team that makes infrastructure invisible to product teams is a prerequisite for microservices at scale.

6. **The distributed monolith is worse than the monolith.** If you end up with services that are coupled — through shared databases, implicit deployment ordering, synchronous dependency chains — you have the worst of both worlds: the operational complexity of microservices with none of the independence benefits. Merging back into a monolith and starting over may be the right decision.

7. **Right-size services to teams, not to functions.** A microservice should be small enough for one team to own entirely, but large enough to represent a meaningful business capability. The question to ask is not "what is the smallest unit I can decompose to?" but "what is the largest service a single team can own with full autonomy?"
