# Strategic Design vs Tactical Design

> "The tactical patterns of DDD—entities, value objects, aggregates, domain events—are building blocks. But without strategic design, you're building the right blocks in the wrong rooms of the wrong house. Strategic design is the architecture of the house itself." — Vaughn Vernon

## The Problem

A team reads the Domain-Driven Design book and comes away excited. They immediately start applying the tactical patterns: refactoring their `User` class to be an entity with proper identity, extracting `Money` as a value object, drawing aggregate boundaries, adding domain events. The code quality improves. The domain model becomes richer and more expressive.

Six months later, the system has grown. New features require collaboration between the "user" concept in three different parts of the system: authentication, billing, and customer support. Each part has a slightly different model of a "user." The team tries to unify them — after all, they have a `User` entity that should represent "the user." The unified model grows unwieldy. Migrations become complex. Teams block each other. The richly modeled entities are now entangled across the codebase.

The team applied tactical DDD correctly — the individual patterns were well-implemented. But they skipped strategic DDD entirely. They never asked: where are the natural boundaries in this system? What are the distinct contexts? Who owns what? They built rich building blocks without a blueprint for the house.

This is the most common DDD failure mode: tactical without strategic. Teams learn about aggregates and events and start applying them immediately, skipping the harder and more important work of bounded contexts, context maps, and core domain identification. The result is a system with excellent local pattern application and poor global structure.

## Core Concept

DDD has two distinct levels of design, and they serve completely different purposes.

**Strategic Design** is the big picture. It answers the questions: What are the natural boundaries in this domain? Which parts of the domain are core to the business? How do the different parts of the system relate to each other? Strategic design produces:

- **Bounded Contexts**: The explicit boundaries within which a domain model is defined and consistent
- **Context Maps**: The relationships and integration patterns between bounded contexts
- **Core Domain identification**: Which sub-domains are the source of competitive advantage
- **Supporting and Generic Sub-domains**: Which sub-domains support the core but aren't differentiating

**Tactical Design** is the detailed implementation within a bounded context. It answers: How do we structure the code within this context? What are the right domain objects? Tactical design produces:

- **Entities**: Objects with persistent identity
- **Value Objects**: Objects defined by their attributes
- **Aggregates**: Consistency boundaries
- **Domain Events**: Records of significant occurrences
- **Domain Services**: Stateless domain operations
- **Repositories**: Persistence abstraction
- **Specifications**: Composable business rules

The critical sequencing: **strategic design comes first**. You identify bounded contexts before you design entities. You draw context boundaries before you define aggregates. You understand the domain's structure before you implement it.

The three sub-domain types deserve emphasis because they determine where you invest your design effort:

**Core Domain**: The central competitive advantage. This is what makes the business unique — the part that would be catastrophic to outsource or buy off the shelf. Core domains deserve the full DDD treatment: deep collaboration with domain experts, rich domain models, the most senior developers.

**Supporting Sub-domain**: Necessary for the business but not differentiating. A custom solution is built, but it doesn't need to be exceptional — good enough is sufficient. Less rigorous DDD application is acceptable.

**Generic Sub-domain**: Common, solved problems. Email sending, authentication, payment processing, logging. These should be bought or adopted, not built. Applying DDD to a generic sub-domain is wasted investment.

## Deep Dive

Evans structured the DDD book with strategic design at the front and tactical design at the back, but he lamented that readers consistently skipped to the tactical patterns and applied them without the strategic foundation. He identified this inversion — tactical without strategic — as the most common DDD failure mode. The tactical patterns are concrete and immediately applicable; they feel like progress. The strategic patterns are abstract and require organizational conversations; they feel like overhead. But the tactical patterns are tools for solving problems that strategic design first identifies. Without strategic design, tactical DDD produces well-crafted bricks arranged without a blueprint.

The core domain concept is Evans' most practically actionable contribution to software strategy. His argument was that the decision about where to invest in deep domain modeling should be driven by where the business's competitive advantage lives — not by where the code is most complex, not by where the users are most numerous, and not by the preferences of individual development teams. Core domains are the subdomains where excellent modeling produces competitive outcomes unavailable through off-the-shelf software. Supporting subdomains require custom development but not excellence. Generic subdomains should be bought or adopted from open source because they represent solved problems where building custom solutions consumes resources without producing differentiation.

Vernon's contribution to the strategic/tactical distinction in the Red Book was to make the sequencing explicit and prescriptive. He described a "DDD Distilled" approach (later expanded into its own book) where teams begin with context mapping to understand the strategic landscape, then apply the tactical patterns only to the contexts identified as core or high-value. Vernon's observation was that applying tactical DDD to a supporting subdomain — complete with aggregates, domain events, specifications, and repositories — is a form of gold-plating that adds complexity without proportional value. A supporting subdomain that is simple enough for CRUD should be implemented as CRUD, even if the team is skilled in tactical DDD. The discipline of restraint is itself a form of strategic design.

The sub-domain classification — core, supporting, generic — has direct implications for team assignment that Evans was explicit about. Core domains should have the most senior, most experienced engineers. They are where the intellectual investment pays the highest return. Supporting subdomains can be handled by mid-level engineers following clear patterns. Generic subdomains should not be staffed with engineers at all — they should be delegated to off-the-shelf software or services. When a team of senior engineers is building a bespoke authentication system or a custom email delivery service, that is a strategic misallocation: they are investing core-domain-level effort in generic-domain problems. Vernon extended this to team topology: the team structure should mirror the subdomain classification. A small, stable, expert team owns the core domain. Larger, more fluid teams handle supporting domains. Generic domains are handled by procurement and integration, not development.

Sam Newman's *Building Microservices* applies this strategic/tactical distinction directly to decomposition decisions. His advice for microservice boundary drawing is precisely calibrated to subdomain type. Core domains warrant dedicated microservices with careful boundary design because they will evolve most rapidly and carry the most business-critical logic. Supporting subdomains may be consolidated with related supporting domains if their independent evolution is not required. Generic subdomains should be third-party services invoked through thin integration layers, not microservices at all. Newman's concrete observation is that teams routinely overdecompose generic subdomains — building elaborate microservice architectures for authentication, logging, and metrics collection — while underinvesting in the decomposition of core domains where the complexity actually resides. Strategic design, properly applied, should invert this pattern.

## Implementation Guide

**Step 1: Start with Domain Discovery, Not Object Modeling**

The first activity in a DDD project is not drawing class diagrams. It is understanding the business domain through collaborative discovery.

Techniques:
- **Domain storytelling**: Ask domain experts to tell you stories about how the business works. What happens when a customer places an order? What happens when inventory runs low? What happens when a payment fails?
- **Event Storming** (large-scale): Run an Event Storming workshop across the entire domain to discover events, commands, aggregates, and bounded contexts simultaneously.
- **Impact mapping**: Identify business goals, actors, impacts, and deliverables. This connects technical design to business strategy.

The output of domain discovery is not code. It is understanding: a shared vocabulary, a map of domain events, and a preliminary view of domain boundaries.

**Step 2: Identify Sub-Domains**

With domain understanding, classify every area of the business into core, supporting, or generic:

Ask for each sub-domain:
- "If we outsourced this, would we lose our competitive advantage?" → Core if yes
- "Do we need a custom solution, but could it be 'good enough'?" → Supporting if yes
- "Is this a solved problem that many companies solve the same way?" → Generic if yes

Document the classification explicitly. This becomes the investment guide: core domains get the best engineers, the deepest design, the most domain expert collaboration. Generic domains get bought or adopted.

**Step 3: Identify Bounded Contexts Strategically**

With sub-domain classification done, identify bounded contexts. A bounded context is not the same as a sub-domain (though they often align). A single sub-domain might have multiple bounded contexts. Multiple supporting sub-domains might share a bounded context.

The signals for bounded context boundaries:
- Different teams own different parts of the domain
- The same term (e.g., "account") means different things in different parts
- Different lifecycle and consistency requirements
- Natural seams in the business process (ordering → fulfillment → shipping → delivery)

**Step 4: Draw the Context Map**

Before writing any tactical code, draw the context map. Show every bounded context and every relationship. Choose relationship types deliberately (Customer/Supplier, ACL, Shared Kernel — see the Context Mapping article).

The context map is the architectural document that governs all tactical design. When a developer asks "can I put this logic here?" the context map provides the answer.

**Step 5: Apply Tactical Design Selectively**

With bounded contexts defined, apply tactical design within each context — but with investment calibrated to the sub-domain type:

**Core domain**: Full tactical DDD. Rich aggregates, domain events, domain services, specifications. Deep collaboration with domain experts. Ubiquitous Language maintained rigorously. The most senior developers own the core domain.

**Supporting sub-domain**: Selective tactical DDD. Aggregates and repositories make sense. Domain events for significant occurrences. But not every concept needs to be a rich entity — pragmatism over purity.

**Generic sub-domain**: Don't apply tactical DDD. Use the framework or library as-is. If you're using Stripe for payments, use Stripe's model, not a DDD-wrapped version of Stripe's model.

**Step 6: Run Strategic Design Workshops**

Strategic design is a team activity. The tools:

**Domain Expert Interviews**: One-on-one sessions with domain experts in each sub-domain. Ask about the vocabulary, the rules, the edge cases, the history. Look for where their vocabulary diverges from each other's — that's a bounded context signal.

**Event Storming (Big Picture)**: A half-day to full-day workshop with all stakeholders. Map all domain events across the entire domain. The natural clusters of events reveal sub-domains. The points where one team's events trigger another team's events reveal context boundaries.

**Context Mapping Workshop**: With bounded contexts identified, bring teams together to draw the context map collaboratively. Assign relationship types. Identify integration points. Document ownership.

These workshops are investments. They take days. They require executive sponsorship to get domain experts in the room. They are worth it because they prevent months of rework caused by wrong boundaries.

## When to Use / When NOT to Use

**Apply Strategic Design when**:
- The system will be built by multiple teams
- The domain is complex enough to have distinct sub-domains
- The organization is large enough that Conway's Law will shape the system
- The system is long-lived and will evolve over years
- The business has clear differentiation in some parts of the domain (core)

**Skip or simplify Strategic Design when**:
- Single team, single developer
- Short-lived project or prototype
- Domain is simple and uniform (no natural sub-domain boundaries)
- The system is entirely in a generic sub-domain (building a logger, a test framework, etc.)

**Apply Tactical Design when**:
- You are in a core or complex supporting domain
- The domain has complex business rules
- The domain has multiple collaborating domain experts
- You are inside a well-defined bounded context

**Skip Tactical Design when**:
- The domain is generic (use the framework as-is)
- The context is CRUD-heavy with minimal logic
- The team is small and the overhead of full tactical DDD exceeds the benefit

## Common Mistakes

**Mistake 1: Tactical without strategic**

The most common failure. Teams apply entities, value objects, and aggregates everywhere without ever defining bounded contexts. The rich domain objects gradually entangle because there are no explicit boundaries keeping them separate.

**Mistake 2: Strategic without tactical**

Less common but real: teams spend months in architecture workshops, drawing beautiful context maps, writing extensive Ubiquitous Language glossaries — and never implement anything. Strategic design must lead to tactical implementation. The map is not the territory.

**Mistake 3: Applying full tactical DDD to generic sub-domains**

Building a custom, richly modeled authentication system when you should be using Auth0 or Cognito. Modeling payment processing with DDD aggregates when you should be calling Stripe. The investment in tactical design is wasted on generic problems.

**Mistake 4: Not revisiting strategic design**

A context map drawn at project inception reflects the understanding at that time. As the system evolves and the business changes, boundaries that were right initially may need to split or merge. Teams that treat the initial context map as permanent miss the opportunity to refine the architecture as understanding deepens.

**Mistake 5: Confusing organizational structure with strategic design**

Teams sometimes draw bounded context boundaries that match the current org chart without asking whether those boundaries reflect natural domain seams. An org chart-driven context map reproduces Conway's Law passively rather than using it actively. The question is not "what does the current org structure look like?" but "what boundaries would allow each team to work most autonomously?"

**Mistake 6: Skipping core domain identification**

Without identifying the core domain, investment is spread evenly. The result: the core domain (where competitive advantage lives) receives the same shallow treatment as generic sub-domains (where competitive advantage does not live). Core domain identification focuses engineering excellence where it matters.

## Connections

**Bounded Contexts**: The primary output of strategic design. Bounded contexts provide the stage on which tactical design plays out.

**Context Mapping**: The documentation of strategic relationships. The context map is strategic design made explicit.

**Ubiquitous Language**: Ubiquitous Language is a strategic artifact — it is defined per bounded context and reflects the strategic importance of getting the language right in core domains.

**All Tactical Patterns**: Entities, value objects, aggregates, domain events, domain services, repositories, specifications — all tactical patterns are applied within bounded contexts identified by strategic design.

## Key Insights

The deepest insight about the strategic/tactical distinction is that they answer different questions at different levels of abstraction. Strategic design answers "what are we building and where are the boundaries?" Tactical design answers "how do we build it well?" You cannot do tactical design well without strategic design first, any more than you can build a room well without a blueprint for the house.

The second insight is that strategic design is primarily an organizational tool, not a technical one. Bounded contexts align with teams. Core domain identification aligns engineering investment with business strategy. Context mapping documents the relationships between teams. Strategic DDD is as much management consulting as it is software architecture.

The third insight is about investment calibration. Not all sub-domains deserve the same design investment. Applying full tactical DDD to a generic sub-domain is waste. Skimping on tactical design in the core domain is risk. The discipline of identifying core, supporting, and generic sub-domains — and calibrating design investment accordingly — produces systems where effort is concentrated where it creates the most value.

Start strategic. Always. Draw the context map before you write the first entity. Identify the core domain before you write the first aggregate. Know the boundaries before you model what's inside them. The tactical patterns are powerful, but they require a strategic foundation to deliver their full value.
