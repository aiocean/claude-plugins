# Building Evolutionary Architectures

> "Architecture is not about making the right decisions early — it is about preserving the ability to make decisions later." — Neal Ford, Rebecca Parsons, Patrick Kua, Evolutionary Architecture

## The Problem

In 2007, a mid-size financial services company made a carefully considered architectural decision to build their new trading platform as a monolith with a relational database. The team was experienced, the domain was well-understood, and the decision was defensible. Three years later, regulatory requirements changed, demanding audit logs for every trade state transition. Two years after that, mobile clients required a new API surface. Then high-frequency trading clients needed sub-millisecond latency paths that bypassed the standard authorization stack. Then machine learning models needed bulk access to historical trade data in a format incompatible with the operational schema.

Each of these changes was handled as a project: a team, a timeline, a migration, a deployment freeze. Each change was harder than the previous one because each migration left the system in a more complex state. By 2015, the codebase had accumulated eight years of feature additions, four schema migration frameworks, two partially-completed rewrites, and a test suite that nobody trusted. The original "carefully considered decision" was not wrong in 2007. It became wrong as the world changed around it — and the system had no capacity to change with it.

This is the failure mode that evolutionary architecture addresses. Not bad decisions, but the inability to adapt when circumstances change. Every architectural decision made today is made with incomplete information about future requirements, future scale, future team composition, and future technology options. An architecture that assumes it has captured the correct design for all time is an architecture that will eventually be replaced in a painful, expensive big-bang rewrite. An architecture designed to evolve can adapt incrementally, preserving investments while accommodating change.

The big-bang rewrite is the most common symptom of evolutionary architecture failure. When a system's structure has drifted so far from what it needs to be that incremental change is no longer possible, teams conclude that the only solution is to rebuild from scratch. Big-bang rewrites almost universally fail or massively underdeliver: they take longer than expected, cost more than expected, replicate the original system's subtle behaviors imperfectly, and arrive at a codebase that begins accumulating its own structural debt immediately. The cure is as bad as the disease.

## Core Concept

Neal Ford, Rebecca Parsons, and Patrick Kua define an evolutionary architecture as one that "supports guided, incremental change across multiple dimensions." The three key terms are "guided," "incremental," and "multiple dimensions."

**Guided** means the change is directed by explicit criteria — fitness functions that capture what properties the architecture must preserve as it evolves. Without guidance, an architecture that can change freely will change in ways that degrade the properties it was designed to provide. Guidance is the mechanism that ensures evolution improves the architecture rather than just changing it.

**Incremental** means change happens in small steps, each of which can be validated before proceeding. Incremental change allows mistakes to be caught early, when they are small and cheap to fix. It allows new directions to be tested before full commitment. It prevents the accumulation of unreleased changes that creates the high-risk "big deployment" scenario.

**Multiple dimensions** acknowledges that an architecture has many aspects — technical architecture, data architecture, security posture, operational model, team structure — and all must evolve together. An architecture that evolves technically but not organizationally, or that evolves its service boundaries but not its data model, will be blocked by the dimensions that lag behind.

### Architecture Quantum

Ford, Parsons, and Kua introduce the concept of an "architecture quantum" as the smallest deployable unit that has high functional cohesion and includes all the structural elements required for the system to function correctly. In a monolith, the entire system is one architecture quantum. In a microservices system, each independently deployable service is an architecture quantum.

The architecture quantum concept matters for evolutionary architecture because it defines the unit of independent change. A system with a single large quantum can change, but every change requires coordinating the entire system. A system with many small, independent quanta can change any one quantum without affecting the others.

The target number of architecture quanta is not always "many" — it depends on the rate and pattern of change. If the entire system always changes together (a common pattern in early-stage products), a single quantum provides simplicity without constraining evolution. When different parts of the system begin changing at different rates — the mobile API changing weekly, the billing system changing monthly, the core accounting engine changing annually — splitting into multiple quanta that can evolve independently becomes valuable.

### Fitness Functions

The "guided" element of evolutionary architecture is implemented through fitness functions — automated checks that verify the architecture preserves its desired properties as it evolves. A fitness function is any mechanism that provides an objective assessment of some architectural characteristic.

Fitness functions can be atomic (testing a single property, like cyclic dependency detection) or holistic (testing emergent properties, like system performance under load). They can be triggered (running in CI/CD as part of every deployment) or continuous (running as monitors in production). They can be static (testing source code properties) or dynamic (testing runtime behavior).

The key insight is that fitness functions transform architecture governance from a periodic, manual review process into a continuous, automated one. Instead of "we review the architecture quarterly to check if coupling has increased," you have "every pull request fails if it introduces a new circular dependency." The discipline is mechanical, not social.

Fitness functions are covered in depth in article 06. Here we focus on how they enable evolutionary architecture rather than how they are implemented.

### The Expand-Contract Pattern

One of the most important techniques for evolutionary change is the expand-contract (or parallel change) pattern. This addresses the problem of changing a boundary — an API, a database schema, a message format — when both the producer and all consumers cannot be changed simultaneously.

**Expand phase**: The producer adds the new capability alongside the old one. If adding a new field to an API, the API now returns both the old field and the new field. Both work simultaneously. Consumers can begin migrating to the new field at their own pace.

**Migrate phase**: Consumers are migrated to use the new field. This can happen incrementally, consumer by consumer, without any coordination between them or with the producer.

**Contract phase**: Once all consumers have migrated, the old field is removed. The API now only returns the new field.

This pattern makes schema migrations, API version transitions, and protocol changes incremental and reversible at each phase. The cost is temporary duplication — both old and new behaviors exist simultaneously during the migration phase. The benefit is that changes can be validated in production, consumers can migrate at their own pace, and rollback at any phase is straightforward.

### Why Big-Bang Rewrites Fail

The alternative to evolutionary change — the big-bang rewrite — fails for reasons that are well-understood but repeatedly ignored.

The new system is compared to the old system's current behavior, not its specified behavior. Over years of operation, a system accumulates behavior that is not documented anywhere: edge case handling, implicit business rules encoded in data, performance characteristics that callers have come to depend on. The rewrite team discovers these behaviors one by one, in production, as failures.

The rewrite is estimated as if it is a new project, but it is actually a migration project. New project estimates are notoriously optimistic even for novel systems. Migration projects are worse because the scope is defined by the system being replaced — and that scope is never fully understood until the migration is attempted.

The existing system cannot stop evolving while the rewrite is in progress. New features, bug fixes, and regulatory changes must be implemented in both the old system (because it is still in production) and the new system (because it must match current behavior at cutover). This doubles the engineering cost and ensures the new system is perpetually behind.

The rewrite produces a new system that has none of the battle-testing the old system acquired. Subtle reliability behaviors, edge case handling, and operational knowledge are lost. The new system starts fresh with fresh bugs.

The correct answer to "this system needs significant architectural change" is almost always "make the changes incrementally, using the strangler fig pattern." The strangler fig — building new functionality alongside old, gradually migrating traffic — is slower than a rewrite but arrives at a functioning system rather than an aspirational one.

## Deep Dive

Evolutionary architecture is one of the areas where engineering literature most directly confronts the gap between theory and practice. The theory is appealing: design systems that can change. The practice is documented in the specific, hard-won mechanisms that make incremental change tractable at scale, and in the failure cases that reveal what happens when systems cannot adapt.

### The "Software Engineering at Google" Perspective: Making Large-Scale Change Tractable

"Software Engineering at Google" contains the most detailed account available of how a large organization maintains the ability to evolve its architecture continuously. The core challenge Google faced is one that any sufficiently large codebase eventually encounters: how do you make a breaking change — renaming a widely-used API, deprecating a library, migrating to a new pattern — when that change affects tens of thousands of files across hundreds of teams?

The naive answer is that you cannot, which is why large codebases accumulate legacy APIs and deprecated patterns indefinitely. Google's answer is tooling: the Rosie system and related infrastructure can generate, test, and submit code changes at codebase scale, operating in automated batches while human reviewers validate the generated changes. This makes architectural evolution tractable that would otherwise be effectively impossible.

The insight behind this investment is that evolutionary architecture requires that the cost of migration be manageable. If migrating from API version 1 to API version 2 requires manually updating 50,000 call sites, the migration will not happen — the old API will persist alongside the new one indefinitely, creating exactly the kind of accumulated complexity that evolutionary architecture is meant to prevent. If the migration can be automated, the cost drops to writing the migration script plus reviewing the generated changes, which is feasible. The tooling investment pays for itself in the architectural evolution it makes possible.

Google's deprecation culture documents the governance mechanism that guides this evolution. Deprecated APIs continue to function — existing callers are not immediately broken — but new code cannot use them, enforced by static analysis. A defined migration timeline is established, and automated tooling generates the migration changes for existing callers. Eventually, when all callers have migrated, the deprecated API is removed. This is the expand-contract pattern applied at library scale, with automation handling the migration phase that would otherwise require coordinating thousands of manual changes.

"Software Engineering at Google" is explicit about the cultural requirements for this to work: evolution requires organizational permission. In environments where stability is the only valued property, any change that touches existing code is suspect. At Google, the expectation is that code will be continuously improved as it is encountered, and the tooling exists to make that expectation achievable. The cultural permission and the technical capability reinforce each other.

### The AWS Builder's Library Perspective: The Strangler Fig as Operating Model

Amazon's evolution from a monolithic store to a service-oriented architecture is documented across multiple Builder's Library essays and has become one of the canonical case studies in evolutionary architecture. The most important lesson is not that the migration happened — many organizations have attempted service decomposition — but how it happened: incrementally, through the strangler fig pattern, over years.

The key constraint that shaped Amazon's approach was continuity. The store could not be taken offline during the migration. Feature development could not stop. Customer experience could not degrade. These constraints ruled out the big-bang rewrite approach entirely. The only viable path was incremental extraction: identify a capability, build its service interface alongside the existing monolith, migrate traffic gradually, remove the monolith code path once migration was complete. Repeat for the next capability.

The Builder's Library essays document what made this approach work in practice. Each extraction was treated as an independent project with clear success criteria: the new service handles its traffic with equivalent or better reliability and performance compared to the monolith. Until those criteria were met, the monolith code path remained active. This created a validation mechanism that prevented premature migration — teams could not declare success based on code being written, only on traffic being served correctly.

AWS's API versioning strategy represents evolutionary architecture applied to external interfaces. The constraint is even stricter than internal evolution: AWS cannot break customers who have built systems against published API contracts. The solution is additive versioning — when behavior must change, the new behavior is introduced as a new API version alongside the existing one. Customers migrate at their own pace, and the old version is maintained for a compatibility period measured in years. This approach makes API evolution possible without forcing simultaneous migration across all customers. The cost is maintaining multiple API versions; the benefit is preserving the ability to evolve without breaking the ecosystem.

The Bezos API Mandate, discussed in the Builder's Library context, is relevant here as a governance mechanism for evolutionary architecture. By requiring all services to expose proper API boundaries, the mandate ensured that each service could be evolved independently. A service with a clean API boundary can be reimplemented, migrated, or replaced without requiring its callers to change. A service that exposes its internal implementation — through shared databases, shared libraries, or informal direct access — cannot be evolved without coordinating with every caller. The mandate created the precondition for independent evolution.

### The Microsoft .NET Architecture Perspective: Platform Evolution at Ecosystem Scale

Microsoft's evolution of the .NET platform from .NET Framework to the unified modern .NET is the largest-scale example in the literature of evolutionary architecture applied to a platform with millions of dependent applications. The constraints were severe: existing .NET Framework applications must continue to work; the migration path must be gradual; the new platform must eventually supersede the old one.

The approach Microsoft took is a direct application of the expand-contract pattern at ecosystem scale. Rather than replacing .NET Framework, Microsoft introduced .NET Core as a parallel platform. The .NET Standard compatibility layer allowed libraries to target both platforms simultaneously during the transition. Applications could migrate component by component — moving a library to .NET Standard first, then migrating the application to .NET Core once its dependencies supported it. The migration is still ongoing years after it began, which is exactly what evolutionary architecture at this scale requires.

The Bicep infrastructure language demonstrates a different evolutionary architecture technique: building a new interface on top of an existing implementation rather than replacing the implementation. ARM templates — the original Azure infrastructure-as-code format — are expressive but verbose, with a JSON syntax that is difficult to author and maintain. Rather than replacing ARM with a new execution engine, Microsoft built Bicep as a higher-level language that compiles to ARM. The existing ARM infrastructure continues to work; existing ARM templates continue to be valid; the new tool provides a better authoring experience without requiring migration of the execution layer. This is the strangler fig applied to tooling: new capability on top of old implementation, gradual adoption at the authoring layer while the underlying implementation remains stable.

The .NET team's public RFC process — used extensively for significant platform changes — documents evolutionary governance in practice. Before major API or behavior changes are finalized, they go through a public proposal and comment period. This creates a feedback mechanism that shapes the direction of evolution before incompatible changes are introduced. The RFC history is also a record of considered alternatives and rejected approaches, making the reasoning behind platform decisions traceable over time.

### The Convergent Insight: Evolution Requires Investment in Migration Infrastructure

Across all three bodies of literature, the consistent finding is that evolutionary architecture is not free. The ability to change a large system incrementally — without big-bang cutovers, without simultaneous coordination across thousands of teams — requires investment in the mechanisms that make incremental change tractable.

Google invested in large-scale change tooling. Amazon invested in strangler fig execution capabilities and API versioning discipline. Microsoft invested in compatibility layers and RFC processes. In each case, the investment paid for itself in architectural flexibility that would otherwise have been impossible.

The failure mode documented in all three contexts is the same: when migration infrastructure is not invested in, evolution stalls. Old APIs accumulate alongside new ones. Legacy patterns persist indefinitely. The desire to evolve exists but the mechanism to execute it does not. The result is not a stable system — it is a system that grows more complex over time because the only affordable change is addition, and nothing can be removed.

## Implementation Guide

**Define fitness functions before starting any significant evolution.** Before beginning a migration or refactoring, identify what properties must be preserved. Performance? Security posture? API compatibility? Module coupling levels? Write automated tests that verify these properties. These tests are your safety net during evolution and your signal that the evolution is going in the right direction.

**Use the strangler fig pattern for all significant migrations.** Do not attempt to migrate a significant system in a single cutover. Build the new implementation alongside the old. Route a small percentage of traffic to the new implementation. Validate behavior. Increase the percentage. Monitor. When the new implementation is handling all traffic and the old implementation has been idle for an appropriate period, remove it.

**Identify your architecture quantum and optimize it.** Understand what the unit of independent change is in your system. If it is too large (the entire system must be deployed to make any change), consider extracting components that change at different rates. If it is too small (dozens of services must change together for any user-facing feature), consider whether the boundaries are in the right places.

**Practice expand-contract at all boundaries.** Any time you need to change an interface — a public API, a database schema, a message format — use expand-contract rather than a coordinated cutover. This applies to internal APIs as much as external ones. The discipline of making changes backward-compatible until all consumers have migrated prevents the coordination overhead that slows evolutionary change.

**Treat architectural changes as first-class work, not technical debt paydown.** Evolutionary architecture requires ongoing investment. If architectural evolution is only funded when there is a crisis, the system will oscillate between crisis states. Regular, small investments in architectural improvement — extracted into a service, improved a coupling metric, removed a deprecated API — prevent the accumulation of structural debt that makes future evolution harder.

## When to Use

Evolutionary architecture is appropriate for any system that is expected to have a long operational lifetime and that faces uncertain future requirements. This is almost every production system.

It is especially important for systems where the business domain is actively evolving, where the technology landscape is changing, or where the team itself is growing and changing. These are the conditions under which an architecture that resists change becomes an existential risk.

## When NOT to Use

Short-lived systems — proofs of concept, event-specific systems, tools with defined end-of-life — do not benefit from the investment in evolutionary architecture. If the system will not need to evolve, designing it to do so is waste.

Also, not all systems are worth evolving. Sometimes a system has accumulated so much structural debt that evolutionary improvement is slower than replacement. The key question is not "can this be evolved?" but "is the cost of evolution less than the cost of replacement?" Sometimes the answer is no, and a targeted rewrite is the right choice — but it should be a conscious choice based on analysis, not a reflexive response to complexity.

## Common Mistakes

**Mistake 1: Evolving architecture without fitness functions.** An architecture that can change freely but has no objective checks will drift toward complexity rather than away from it. Fitness functions are not optional decoration — they are the guidance mechanism that makes evolution directed rather than random.

**Mistake 2: Attempting big-bang rewrites.** This is the most common and most expensive mistake in evolutionary architecture. There is almost always a strangler fig approach that is safer and more likely to succeed. Before committing to a rewrite, ask: is there any way to achieve the desired architectural state incrementally? Usually the answer is yes.

**Mistake 3: Treating all components as having the same rate of change.** Different components change at different rates. Forcing fast-changing components into the same quantum as slow-changing components creates unnecessary coupling. Treating slow-changing components with the same process overhead as fast-changing ones creates unnecessary bureaucracy. Match your architecture to your actual rate-of-change patterns.

**Mistake 4: Evolving technical architecture without evolving team structure.** Conway's Law (see article 10) means team structure and system architecture are coupled. Evolving the system's service boundaries without evolving how teams are organized around those boundaries produces misalignment: teams that must coordinate across service boundaries because the services are maintained by a single team, or services whose interfaces are poorly designed because the teams that use them have no input into their design.

**Mistake 5: Confusing incremental delivery with evolutionary architecture.** Shipping features incrementally is agile delivery. Evolving architecture incrementally is evolutionary architecture. They are complementary but distinct. A team can ship features incrementally while architecture degrades, and a team can make deliberate architectural improvements without shipping user-visible features.

## Connections

- **Fitness Functions** — The implementation of "guided" in evolutionary architecture; fitness functions provide the automated governance that makes evolution directed rather than chaotic. See article 06.
- **Architecture Decision Records** — The record of what was decided and why; essential for understanding the intended direction of evolution and what constraints must be preserved. See article 11.
- **Boundaries Are the Architecture** — The architecture quantum concept is a boundary concept; identifying the right boundaries enables independent evolution. See article 03.
- **Everything Is a Trade-Off** — Evolutionary architecture requires constant trade-off analysis as context changes; what was the right trade-off initially may not be the right trade-off after evolution. See article 02.
- **Conway's Law** — Organizational structure constrains architectural evolution; evolving architecture requires understanding and potentially evolving team structure. See article 10.

## Key Insights

1. Architecture debt is not the same as technical debt. Technical debt is messy code that slows feature development. Architecture debt is structural rigidity that prevents the system from evolving to meet new requirements. Both require investment to address; architecture debt is harder to see and more expensive to ignore.

2. The strangler fig pattern is not just a migration technique — it is a philosophy. Always build new capabilities alongside old ones, migrate incrementally, and remove old capabilities only after migration is complete. This applies at every scale, from function renaming to platform migration.

3. Fitness functions transform architecture governance from social enforcement to technical enforcement. A rule that "no cycles in dependencies" is enforced by a linter is infinitely more reliable than one enforced by code reviewers.

4. Big-bang rewrites fail at a rate that should permanently discredit the approach. They fail not because teams are incompetent but because the problem — reproducing all of an existing system's behavior while adding new capabilities — is harder than it appears, always.

5. The architecture quantum is the practical unit of evolutionary change. Identifying the right granularity for independent evolution — not too large, not too small — is one of the most consequential architectural decisions.

6. Architecture must evolve faster than the system accumulates debt. Teams that invest in architectural evolution continuously stay ahead of entropy. Teams that treat architecture as settled and investment as discretionary fall behind it.

7. Evolutionary architecture is not about having no architecture. It is about having an architecture that can change. The difference is intentionality: an architecture designed to evolve makes its fitness functions explicit, its boundaries clear, and its change patterns predictable.
