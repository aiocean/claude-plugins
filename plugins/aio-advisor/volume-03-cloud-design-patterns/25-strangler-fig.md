# Strangler Fig Pattern

> "You cannot jump a chasm in two leaps. But you can build a bridge across it, plank by plank, while still crossing the old bridge."

## The Problem

Your company's core business runs on a monolith — a million-line Java application deployed on WebLogic, last touched in 2009. It handles everything: order management, inventory, invoicing, customer data, reporting. Every developer on the team is afraid to change it. There are no tests. The original architects left years ago. The codebase has accumulated 15 years of workarounds, undocumented business logic, and tribal knowledge that exists only in the heads of three people who are planning to retire.

Leadership wants to modernize. The new CTO has a mandate to migrate to microservices, deploy to AWS, and "break up the monolith." The team is excited in the abstract. Then someone asks: "How do we do it without a two-year rewrite while the business still runs?"

The Big Bang rewrite is the obvious but catastrophically risky answer: freeze the monolith, rewrite everything in new technology, deploy the replacement on day one. Amazon tried this in the late 1990s and it nearly destroyed the company. Netscape tried it with Mozilla and lost the browser war to Internet Explorer. Joel Spolsky called it "the single worst strategic mistake a software company can make." The new system never quite matches the behavior of the old. The old system keeps running in parallel, receiving changes, while the new system is perpetually "almost ready." Three years later, you have two systems to maintain instead of one.

The Strangler Fig pattern is the alternative: replace the monolith incrementally, one piece at a time, routing some traffic to the new implementation while the rest still goes to the old. Each piece that moves to the new system permanently is a piece the monolith no longer needs to handle. Over time, the new system handles everything; the monolith handles nothing; the monolith is shut down. The business never stops. The risk is bounded at each step.

The name comes from the strangler fig tree — a tropical plant that grows around a host tree, eventually replacing it entirely while the host slowly dies. Martin Fowler named the pattern in 2004.

## Core Concept

The Strangler Fig pattern works by placing a facade (often an API gateway or reverse proxy) in front of the existing system. New requests are routed to the new implementation; unimplemented requests fall through to the legacy system. As new functionality is implemented, more routes migrate to the new system. Eventually all routes point to the new system and the legacy can be decommissioned.

```
Phase 1: All traffic to legacy

Client -> [Strangler Facade] -> Legacy Monolith
                                 (handles everything)

Phase 2: Partial migration

Client -> [Strangler Facade] -+-> New: UserService (migrated)
                               +-> New: OrderService (migrated)
                               +-> Legacy Monolith (everything else)

Phase 3: Complete migration

Client -> [Strangler Facade] -+-> New: UserService
                               +-> New: OrderService
                               +-> New: InventoryService
                               +-> New: InvoicingService
                               +-> New: ReportingService
                               (Legacy Monolith: decommissioned)
```

The facade is permanent during the migration and eventually becomes the API gateway for the new system. It is not a temporary hack — it is the routing layer that makes incremental migration possible.

### Key Properties

**Incremental:** Each migration step is small and bounded. One endpoint, one domain, one capability at a time.

**Reversible at each step:** If the new implementation has a bug, traffic can be routed back to the legacy system at the facade. The legacy code is untouched and still works.

**Business continuity:** The system is always operational. Users experience no interruption during migration.

**Risk isolation:** A bug in the new UserService doesn't affect the old OrderService code still running in the monolith.

**Testable:** Each migrated piece can be compared against the legacy behavior (traffic shadowing, dual-running) before full cutover.

## Deep Dive

**The pattern's origin: Martin Fowler and the strangler fig metaphor.** Martin Fowler introduced the Strangler Fig Application pattern in a 2004 blog post, taking the name from the strangler fig tree — a plant that grows around an existing tree, eventually replacing it entirely while using the original tree as scaffolding. Fowler's architectural insight: when migrating a legacy system, the safest approach is to grow the replacement incrementally around the existing system, routing traffic from the old to the new piece by piece. At no point is there a risky cutover of the entire system — each migration step is small, testable, and reversible. The key enabler is the strangler facade: a routing layer in front of both systems that transparently directs traffic to the appropriate backend based on whether a feature has been migrated. Fowler's framing emphasizes the facade as the central mechanism, not just a convenience — without it, callers must be updated for each migration step, which defeats the incremental approach.

**Domain-Driven Design and identifying seams.** Eric Evans' *Domain-Driven Design* provides the vocabulary for the hardest part of the Strangler Fig pattern: identifying where to cut. A monolith that has evolved organically over years has no obvious boundaries — functionality is interleaved, data is shared across conceptual domains, and dependencies between components are often implicit. Evans' concept of the Bounded Context is the cutting tool: identify the subdomains within the monolith, find the linguistic boundaries (where the same word means different things in different parts of the codebase), and use those linguistic boundaries as the seams for extraction. Sam Newman's *Building Microservices* applies this directly to the Strangler Fig: the extraction order should follow domain value and coupling risk. Start with domains that have few dependencies on other parts of the monolith — they can be extracted cleanly. Leave highly-coupled central domains for last or accept that some parts of the monolith may never be worth extracting.

**The strangler facade and routing as a migration control plane.** Newman's *Building Microservices* identifies the strangler facade as the migration's control plane. The facade (an API gateway, a load balancer with routing rules, or a purpose-built proxy) routes each request to either the legacy system or the replacement service based on the current migration state. As each feature is migrated, the routing rule is updated to point to the new service. This means the migration state is explicit and auditable — the routing table is the migration progress report. Newman's guidance on facade design: the facade must be transparent to clients (same URL structure, same response format), must support gradual traffic shifting (route 1% to new, verify, increase to 10%, 50%, 100%), and must be capable of fast rollback (route back to legacy if the new service has issues). The facade is a shared piece of infrastructure owned by the migration team, not by individual feature teams.

**Traffic shadowing and dark launching.** The Google SRE Book's treatment of progressive rollouts describes a technique that is particularly valuable in strangler fig migrations: traffic shadowing (also called "dark launching"). The shadow mode routes production traffic to both the legacy system and the new service simultaneously, but only the legacy system's response is returned to the client. The new service's response is discarded, but its behavior is logged and compared against the legacy response. This allows the new service to be tested under real production traffic without impacting clients. Discrepancies between legacy and new responses reveal bugs, missing functionality, or behavioral differences before the new service handles live traffic. Newman's *Building Microservices* endorses this approach as the safest validation technique: shadowing proves correctness under real load, not just synthetic test scenarios.

**The data migration problem: the hardest part.** Kleppmann's *Designing Data-Intensive Applications* identifies data migration as the most challenging aspect of any system modernization. A new service that shares the monolith's database is not truly independent — it is coupled through the data layer even if decoupled through the API layer. The correct target state is service-owned data: each new service has its own database, and the monolith's database is no longer shared. But getting there requires migrating data from the shared database to the new service's database while both systems are running. Kleppmann's analysis of online schema migrations applies: the data migration must be performed live, without downtime, with both the old and new systems reading and writing simultaneously. The standard approach — write to both databases during the transition period, read from the new database after verification, then stop writing to the old — requires careful coordination and a verified consistency check before the old database is abandoned. Newman's guidance: do not underestimate the data migration work; it is often larger than the service extraction work itself.
</inbound>
```

Microsoft's Martin Fowler (who coined the pattern) published his detailed description of it based on observations of real migrations at large enterprises. His key insight: the strangler facade must be in place from day one, even if it initially routes 100% of traffic to the legacy system. The facade's presence is what makes incremental migration possible.

## Implementation Guide

### Step 1: Identify the Migration Seams

This is the hardest step. The monolith has no obvious boundaries. Find them by:

```
Techniques for identifying seams:
  
  1. Domain analysis: What are the business capabilities?
     - User management, order processing, inventory, billing, reporting
     - Each capability becomes a migration candidate
  
  2. Change frequency analysis: Which code changes together?
     git log --follow -p -- src/orders/ (find frequently changed files)
     Code that changes together should migrate together.
  
  3. Database table grouping: Which tables are accessed by which code?
     Tables accessed only by user code -> UserService
     Tables accessed only by order code -> OrderService
     Tables accessed by both -> migration complexity, solve last
  
  4. API surface analysis: Which external endpoints map to which domain?
     /api/users/** -> UserService candidate
     /api/orders/** -> OrderService candidate
```

Start with a domain that:
- Has clear, limited scope
- Has few dependencies on other parts of the monolith
- Has high business value or development velocity need
- Has a team that is motivated to own the migration

### Step 2: Place the Strangler Facade

Before writing a single line of new code, deploy the facade. Initially it routes 100% of traffic to the legacy system:

```nginx
# NGINX as strangler facade (initial state: everything goes to legacy)
server {
    listen 443 ssl;
    server_name api.example.com;
    
    # Everything routes to legacy (for now)
    location / {
        proxy_pass http://legacy-monolith:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

This is ready to route selectively as soon as the first piece is migrated.

### Step 3: Build the New Service in Isolation

Build the first migrated service without touching the monolith. It runs independently, has its own database, its own deployment pipeline.

Critical: **do not modify the monolith during the migration**. If the monolith still needs to change (for bug fixes, urgent features), that's fine — but keep migration changes separate from feature changes. Two parallel workstreams: monolith maintenance, and strangler migration.

### Step 4: Traffic Shadowing (Optional but Recommended)

Before routing production traffic to the new service, shadow it: send real production traffic to both systems, compare responses, don't actually return the new response to users.

```
Shadow traffic architecture:

Client -> Facade -> Legacy Monolith (response returned to client)
               -> New Service (response compared against legacy, discarded)

Comparison service logs:
  - Response status code match? 
  - Response body match?
  - Response latency comparison
  
Run shadow for 1 week. Investigate all discrepancies.
Only then: switch primary/shadow roles.
```

AWS Lambda@Edge, Envoy's shadow traffic, and Nginx's `mirror` directive all support traffic shadowing.

### Step 5: Gradual Traffic Cutover

Start small. Route 1% of traffic to the new service. Monitor. Increase to 10%. Monitor. 50%. 100%.

```
AWS API Gateway canary deployment:
  Stage: production
  Canary:
    percentTraffic: 5
    stageVariableOverrides:
      serviceVersion: new
    useStageCache: false
```

If any issue arises, roll back by setting percentage back to 0.

### Step 6: Data Migration

This is often the most complex part. The monolith and new service may initially share the legacy database. The goal is to migrate the new service to its own database.

```
Database migration sequence (Parallel Run pattern):
  
  Phase 1: New service reads from and writes to legacy DB
           (same data, no migration risk)
  
  Phase 2: New service writes to BOTH legacy DB and new DB
           (data stays in sync; legacy DB still authoritative)
  
  Phase 3: New service reads from new DB, writes to both
           (validate new DB data matches legacy)
  
  Phase 4: New service reads/writes new DB only
           (legacy DB no longer involved for this domain)
  
  Phase 5: Remove legacy DB tables owned by migrated domain
           (cleanup)
```

### Step 7: Decommission

Once all traffic routes to new services and no legacy DB tables remain:
1. Set monolith traffic to 0% at the facade
2. Run for 2-4 weeks at 0% (monitor for any missed callers)
3. Shut down monolith instances
4. Archive the monolith codebase
5. Delete legacy infrastructure

## When to Use / When NOT to Use

**Use when:**
- An existing system must be replaced but cannot be taken offline
- The system is too large to rewrite all at once
- Business functionality must continue uninterrupted during migration
- You want to validate the new system in production before full cutover
- Risk must be bounded at each step with rollback capability

**Do NOT use when:**
- The monolith is small enough that a complete rewrite is faster and lower risk
- The monolith has no external API or routing layer — adding a facade itself would require extensive changes
- The entire system must be replaced simultaneously (regulatory compliance, security isolation requiring hard cutover)

## Common Mistakes

**Mistake 1: Starting with the hardest domain.** Teams pick the most complex, most deeply integrated part of the monolith for the first migration because "that's where the value is." The first migration should be the easiest — something with few dependencies, clear boundaries, and limited risk. Save the hard parts for when the team has migration experience.

**Mistake 2: Bypassing the facade.** Existing internal callers still call the monolith directly, bypassing the facade. The facade doesn't know about these. When the domain is migrated, internal callers break. Inventory all callers before migration. Route all traffic through the facade.

**Mistake 3: Modifying the monolith to support the migration.** Adding APIs to the monolith specifically to support the new service creates bidirectional dependency. The new service needs the monolith; the monolith needs the new service. The goal is to make the new service independent. If temporary coupling is unavoidable, plan its removal explicitly.

**Mistake 4: Not handling the shared database.** New service and monolith both write to the same database tables. The "migration" is only at the API level, not the data level. The services are still coupled via the database. Data ownership must migrate with the service — each service must eventually own its own data.

**Mistake 5: No rollback plan.** The facade routes 100% to the new service. Issues emerge. The only option is emergency rollback. Always keep the routing rules reversible and test the rollback procedure before you need it.

**Mistake 6: Migration without tests.** The new service is built without comprehensive tests, verified only by manual QA. Six months into the migration, a subtle behavioral difference between old and new is discovered in production. Traffic shadowing and behavior comparison tests should run throughout the migration.

## Connections

**Gateway Routing & Offloading** (Article 15): The strangler facade is an API gateway. Once migration is complete, the facade becomes the permanent production gateway. The routing patterns are the same.

**Sidecar Pattern** (Article 24): During migration, a sidecar can act as a protocol adapter — translating from the new service's protocol to the legacy protocol when the new service must call legacy functionality not yet migrated.

**CQRS**: Strangler migrations often naturally evolve toward CQRS: the new service uses a modern write model (event-sourced, with domain events); the read side is served by materialized views built from those events. The migration is a path from a monolithic CRUD model to a CQRS model.

**Saga Pattern** (Article 22): When migrating transactional flows that span both the legacy system and new services, sagas manage the distributed transaction. The saga orchestrator knows which steps go to legacy and which go to new services.

**Feature Flags**: Feature flags complement the strangler pattern for code-level gradual migration. The facade handles request-level routing; feature flags handle code-path-level gradual rollout within services.

## Key Insights

1. **The facade must come before the first migration, not after.** You need the routing infrastructure in place before you have anything to route to. The first version of the facade routes everything to legacy. That's fine. It's there for when you need it.

2. **Start with the leaf nodes, not the roots.** Migrate capabilities that have few dependencies first. The deeply coupled core domain is the last thing you migrate, not the first. This gives you migration experience, infrastructure confidence, and time to understand the hard dependencies before you face them.

3. **Database decoupling is harder than API decoupling.** Routing traffic to a new service is straightforward. Getting the new service off the shared database is the real work. Plan the data migration strategy early, execute it carefully, and never consider the migration "done" until the new service has its own database.

4. **Traffic shadowing is the most underused migration technique.** Running the new service in shadow mode against real production traffic catches behavioral discrepancies before they affect users. It is expensive to set up but far cheaper than discovering differences in production after full cutover.

5. **The Big Bang rewrite fails because it creates two things to maintain.** During a multi-year rewrite, the legacy system keeps changing. Every change to legacy must be replicated in the new system. You never catch up. The strangler pattern avoids this by migrating functionality permanently — each piece leaves the monolith once and never goes back.

6. **Rollback must be tested before you need it.** During a migration with traffic routing, the rollback procedure is "change a routing rule." Test this in staging. Test this in production at 1% traffic. Know exactly what you'll do if you need to roll back at 50% traffic at 2 AM. Untested rollback procedures fail when you need them most.

7. **The strangler fig becomes the new architecture.** When migration is complete, the facade is the API gateway, the new services are the fleet, and the patterns you used during migration (routing rules, traffic splitting, canary deployment) are the production operational patterns. The strangler migration is not a one-time project — it is how you will evolve software for the life of the system.
