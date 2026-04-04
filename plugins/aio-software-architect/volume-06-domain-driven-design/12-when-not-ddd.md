# When NOT to Use DDD

> "DDD is not a silver bullet. It is a powerful tool for managing complexity in certain kinds of systems. The prerequisite is that the system actually has that kind of complexity. If it doesn't, DDD is overhead without benefit." — Eric Evans (paraphrased from interviews)

## The Problem

A team inherits a content management system for a marketing website. It has articles, authors, categories, and tags. Articles can be published or drafted. Authors can be assigned to articles. Categories can be nested. The system is used by a marketing team of 15 people who create and publish content.

The new technical lead, fresh from a DDD conference, decides this is the perfect opportunity to apply everything they've learned. They introduce bounded contexts (Content, Identity, Taxonomy), aggregates (Article aggregate with Comments inside, Author aggregate, Category aggregate), domain events (ArticlePublished, AuthorAssigned, CategoryCreated), repositories (ArticleRepository with interface in domain layer, JPA implementation in infrastructure layer), domain services (ContentPublicationService for the "complex" publication logic), and specifications (ArticleEligibleForPublication for the single publication rule: status must be DRAFT).

Six months later: the team has 40 domain classes for what is essentially 5 database tables. New feature requests take 3x as long because every change requires updating the aggregate, the repository interface, the repository implementation, the domain event, and the application service. A developer who wants to add a "featured" flag to articles has to modify 7 files. The marketing team cannot get simple features done. A quarter of the codebase is infrastructure for patterns that add no value in this context.

This is DDD misapplied. The problem is not that DDD is wrong — it is that DDD was applied to a domain that didn't need it, producing overhead without the corresponding benefit.

## Core Concept

Domain-Driven Design is a set of tools for managing complexity in systems where the business domain is the primary source of that complexity. The key word is *managing complexity* — DDD does not eliminate complexity, it provides structure for working with it. If the domain is not complex, DDD's structure is pure overhead.

Eric Evans wrote the DDD book for systems with "complex business logic." He was explicit: DDD is not for all systems. The investment in collaborative modeling, rich domain objects, bounded contexts, and the full tactical toolkit pays off only when the domain complexity is high enough to justify it.

The decision to use or not use DDD should be driven by an honest assessment of two factors:

**Domain complexity**: Does the business domain have complex rules, significant invariants, deep business knowledge that must be captured in code? Or is it primarily data storage and retrieval with simple validation?

**Domain expert availability**: Is there a domain expert whose knowledge you need to collaborate with to build the system correctly? Or is the domain common knowledge that any developer can understand without expert guidance?

When domain complexity is high AND domain expert collaboration is available, DDD provides enormous value. When either factor is absent — simple domain, or no expert collaboration — DDD's costs exceed its benefits.

**The Software Complexity Spectrum**

A useful mental model: think of software as existing on a spectrum from pure data management to pure domain complexity.

At the data management end: CRUD applications, data pipelines, ETL systems, admin interfaces. These are defined by data shape and storage, with minimal business rules. SQL and simple frameworks serve them well.

At the domain complexity end: financial systems, healthcare, legal, logistics, complex enterprise workflows. These are defined by business rules, processes, invariants, and deep domain knowledge. DDD is designed for this end.

Most software lives somewhere in the middle. The decision to apply DDD should be commensurate with where the system sits on this spectrum.

## Deep Dive

Evans was more candid about DDD's limitations than his followers have typically been. He described the DDD book as written for a specific class of problem — systems where the complexity is fundamentally domain complexity, where the business logic is the hard part, and where deep collaboration with domain experts is both possible and productive. He explicitly excluded from this category systems whose complexity is primarily technical: high-throughput data pipelines, distributed consensus algorithms, low-latency trading infrastructure. These systems are hard, but they are hard in a way that domain modeling does not address. Their complexity is algorithmic and architectural, not conceptual. No amount of Ubiquitous Language development will make consistent hashing easier to implement correctly.

Vernon, in DDD Distilled, added a practical heuristic that Evans left implicit: the presence of a domain expert is a prerequisite, not an optional enhancement. If there is no person in your organization whose primary job is to be an expert in the domain you are modeling — someone whose knowledge you need to elicit and encode, not merely someone who can validate your technical decisions — then DDD's core collaborative loop cannot function. Without that expert, you are guessing at domain concepts, naming things arbitrarily, and building a model that reflects the developers' understanding of the business rather than the business's actual structure. This is not domain-driven development; it is developer-driven modeling dressed in DDD vocabulary.

The Transaction Script and Table Module patterns from Martin Fowler's *Patterns of Enterprise Application Architecture* deserve explicit mention as the correct alternatives when DDD is inappropriate. Fowler described Transaction Scripts as procedures that organize business logic by procedure, each corresponding to a system operation (create order, process payment, generate report). For CRUD-heavy applications, Transaction Scripts are simpler, more direct, and easier to understand than a rich domain model. The complexity of maintaining aggregate boundaries, repository abstractions, and domain event publication is overhead that only pays off when the domain logic is rich enough to benefit from the structure. For a content management system, a simple transaction script that validates inputs, writes to the database, and returns a result is often the best implementation — not because the developer is unskilled, but because the problem does not require more.

The hardest DDD decision is recognizing when a system that currently doesn't need DDD is beginning to require it. Evans described this transition point as the moment when "the domain logic is becoming a competitive asset" — when the business rules encoded in the system are complex enough to differentiate the product and when getting them wrong has serious consequences. A system that starts as simple CRUD and grows to have complex eligibility rules, state machines, cross-domain invariants, and frequent collaboration with domain experts has crossed into DDD territory. The transition is painful because it requires retrofitting domain concepts onto a system that was built without them. The practical guidance from both Evans and Vernon is to watch for the signals: growing method complexity in service classes, increasing frequency of bugs that stem from business rule misunderstandings, domain experts struggling to recognize their concepts in the code. These signals indicate that the system has outgrown its simple architecture and needs the structure that DDD provides.

Sam Newman's perspective from *Building Microservices* adds a decomposition dimension to this decision. He notes that the overhead of DDD — particularly the strategic design work of identifying bounded contexts and context mapping — only pays off in systems with enough domain complexity to produce multiple distinct bounded contexts. A system with a single coherent domain that fits comfortably in one bounded context does not benefit from strategic DDD; it benefits from good tactical modeling of that single domain. The strategic overhead of context mapping, team topology alignment, and integration pattern selection is justified when the domain is genuinely large enough to require multiple models. For smaller systems, applying full strategic DDD is an investment in scaffolding for a building that does not need it.

## Implementation Guide

**Step 1: Assess Domain Complexity Honestly**

Before applying DDD, answer these questions honestly:

1. **Rule richness**: How many distinct business rules does this domain have? A domain with 5 simple validation rules is different from one with 50 interacting rules with exceptions.

2. **Expert knowledge**: Is there domain knowledge that developers don't naturally have? Would you need to spend significant time with a domain expert to understand the system correctly?

3. **Invariant complexity**: Are there non-trivial invariants — conditions that must always be true — that require careful enforcement? Or is the data relatively unconstrained?

4. **Conceptual richness**: Does the domain have a rich vocabulary of concepts that developers must learn? Or is it a thin data model over a familiar domain?

5. **Change driver**: Do changes to the system come primarily from changing business rules (domain-driven change), or from changing data requirements or technical requirements (data/tech-driven change)?

If most answers point to "simple" — few rules, common knowledge, weak invariants, thin vocabulary, data-driven change — DDD will add overhead without proportional benefit.

**Step 2: Know the Simpler Alternatives**

For simple domains, use simpler patterns. Martin Fowler's Patterns of Enterprise Application Architecture describes a progression:

**Transaction Script**: The simplest pattern. Each procedure (script) handles a single business transaction from top to bottom. No domain model, no objects. Just functions that do a complete piece of work.

```python
def place_order(customer_id, items, shipping_address):
    # Validate
    if not items:
        raise ValueError("Order must have items")
    
    # Calculate
    total = sum(item['price'] * item['quantity'] for item in items)
    
    # Store
    order_id = db.execute(
        "INSERT INTO orders (customer_id, total, status) VALUES (?, ?, 'PLACED')",
        customer_id, total
    )
    for item in items:
        db.execute(
            "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
            order_id, item['product_id'], item['quantity'], item['price']
        )
    
    return order_id
```

No classes, no repositories, no aggregates. This is perfectly appropriate for a simple CRUD workflow with no complex business rules.

**Table Module**: One class per database table, with methods that operate on sets. The `OrderModule` handles all operations on the orders table. Simple, data-centric, appropriate for reporting applications or data transformation pipelines.

**Active Record**: The pattern used by Rails, Django, and many web frameworks. The model IS the persistence layer. Appropriate for web applications with moderate business logic where development speed is paramount.

**Domain Model (DDD)**: Use when the domain is complex enough to justify it. The entities, value objects, aggregates, repositories, and services described in this volume.

The progression from Transaction Script to Domain Model is correlated with increasing domain complexity. Don't jump to Domain Model if Transaction Script or Active Record would serve.

**Step 3: Recognize CRUD-Heavy Domains**

A CRUD-heavy domain is one where:
- Most operations are Create, Read, Update, Delete on individual records
- Business rules are primarily data validation (required fields, format checking, range validation)
- There are few cross-entity invariants
- Changes rarely cascade across multiple entities
- There is no complex process or workflow logic

Examples of inherently CRUD-heavy domains:
- Content management systems (mostly storing and serving content)
- Admin interfaces (data entry and display)
- Configuration management (storing and serving configuration)
- User profile management (storing user preferences)
- Basic reporting systems (querying and displaying data)

For these systems, a well-designed relational database with a thin application layer is more appropriate than a DDD domain model. ORMs like ActiveRecord, Django ORM, or JPA with Active Record pattern provide everything needed. Adding DDD's repository pattern, aggregate modeling, and domain event infrastructure is engineering ceremony that produces no business value.

**Step 4: Recognize Data-Centric Systems**

Some systems are primarily data transformation and analysis pipelines, not business rule enforcement engines. Martin Kleppmann's "Designing Data-Intensive Applications" provides the appropriate framework for these systems: think in terms of data models, storage engines, query patterns, and data pipelines — not domain models.

Data-intensive systems include:
- ETL pipelines (extract, transform, load)
- Analytics platforms (aggregating and querying large datasets)
- Log processing systems
- Machine learning feature engineering pipelines
- Data warehouses and data lakes

In these systems, the "logic" is primarily data transformation logic, not business rule logic. SQL, stream processing frameworks (Kafka Streams, Apache Flink), and batch processing frameworks (Apache Spark) are the appropriate tools. DDD provides little value here.

**Step 5: The Infrastructure Code Rule**

Technical infrastructure systems — networking, storage, deployment automation, monitoring, testing frameworks — are not appropriate targets for DDD. These systems have domain complexity (distributed systems theory, consensus algorithms, network protocols), but it is technical domain complexity understood by engineers, not business domain complexity requiring collaboration with non-technical domain experts.

The DDD value proposition — bridging the communication gap between technical and domain experts — does not apply to pure engineering systems. Apply sound software engineering principles (clean interfaces, testability, separation of concerns) but not DDD domain modeling.

**Step 6: The Data-Rich, Logic-Poor Pattern**

A special case worth naming: systems that have rich data models but thin logic. A GIS (Geographic Information System) might have thousands of spatial data types, projections, and coordinate systems, but the "business logic" is primarily spatial algorithms that are mathematically defined. A genome sequencing analysis system might have complex data structures but the analysis is defined by scientific algorithms, not negotiated business rules.

These systems benefit from strong data modeling (precise types, good schemas) but not from DDD domain modeling. The distinction: DDD domain modeling is for business logic that changes because the business changes. Data-rich systems change because the underlying science or mathematics evolves — a different kind of change with different modeling implications.

## When to Use / When NOT to Use

**Use DDD when ALL of these are true**:
- The domain is the primary source of system complexity (not technology, not data volume)
- Domain experts exist and are available for collaboration
- The system is long-lived and will evolve based on changing business requirements
- The team is large enough that the modeling overhead is amortized across many developers
- There are genuine complex invariants and business rules to enforce

**Do NOT use DDD (or use selectively) when**:

**CRUD-heavy, thin logic**: The system is primarily data storage and retrieval. Business rules are simple validation. The domain model would be a thin wrapper over database tables. Use Active Record or Transaction Script.

**No domain experts**: If you cannot collaborate with a domain expert, you cannot build a Ubiquitous Language. Without Ubiquitous Language, the core value proposition of DDD is missing. You're imposing DDD ceremony on a system without the collaboration that makes it valuable.

**Technical infrastructure projects**: Build systems, deployment automation, networking tools, monitoring systems. Domain complexity is technical, not business. Standard software engineering practices suffice.

**Data-centric systems**: ETL, analytics, data warehouses. Logic is data transformation. Kleppmann's data-intensive application patterns are more appropriate.

**Short-lived or throwaway systems**: Prototypes, scripts, experiments. The investment in DDD modeling is not amortized over a long enough lifetime.

**Small, uniform domains**: A system with 10 entities, 20 simple business rules, and no complex workflows. The overhead of bounded contexts, aggregates, and repositories exceeds the benefit.

**Generic sub-domains**: Authentication, email sending, payment processing (off-the-shelf). Conform to the existing system's model; don't re-model it with DDD.

## Common Mistakes

**Mistake 1: DDD as cargo cult**

Applying DDD patterns because they are fashionable, not because the domain requires them. Teams that name their classes `Entity` and `ValueObject` and `Aggregate` without understanding why produce code that has DDD syntax but not DDD semantics. The patterns are there; the value is not.

**Mistake 2: Using DDD to avoid thinking about data**

Some developers use DDD as a way to avoid thinking carefully about data models. "We'll handle it in the domain model" becomes a way to defer database design decisions. For data-intensive systems, careful schema design and query planning are more important than domain modeling.

**Mistake 3: Full tactical DDD for every bounded context regardless of complexity**

Even in systems that benefit from DDD overall, not every bounded context deserves the full tactical toolkit. A "notifications" bounded context in a complex system might be supporting or generic — simple enough that Transaction Script within that context is the right choice. Calibrate tactical DDD to the complexity of each context, not to the system overall.

**Mistake 4: DDD theater**

Classes named `OrderRepository` that are just Spring Data JPA interfaces with no domain intent. Classes named `OrderAggregate` that are just JPA entities with no aggregate semantics. `DomainEvent` marker interfaces on plain data transfer objects. This is DDD as naming convention without DDD as modeling discipline. It adds naming overhead without adding value.

**Mistake 5: Refusing to simplify because "we're doing DDD"**

Teams sometimes over-complicate simple features because "DDD requires" a certain pattern. DDD does not require anything — it provides tools. If a simple feature can be implemented as a direct database operation without going through a rich aggregate, and the domain invariants don't require aggregate-level enforcement, use the simple approach.

**Mistake 6: Not recognizing when DDD has paid off its investment**

Early in a project, DDD patterns feel like overhead. The repository pattern, the aggregate modeling, the domain events — these take time to build. Teams sometimes abandon DDD before the investment pays off. The payoff comes when business requirements change and the existing model accommodates the change gracefully, or when a new developer joins and can read the domain model and understand the business. Measure the return on the investment before concluding it wasn't worth it.

## The Decision Framework

Use this checklist to assess whether DDD is appropriate:

```
Domain Complexity Assessment:
[ ] Complex interacting business rules (>20 significant rules)
[ ] Non-trivial invariants requiring aggregate enforcement
[ ] Multiple sub-domains with different vocabularies
[ ] Business processes that span multiple entities with complex state machines

Collaboration Prerequisites:
[ ] Domain experts available for ongoing collaboration
[ ] Team has capacity for collaborative modeling sessions
[ ] Organization values the investment in domain understanding

System Characteristics:
[ ] Long-lived system (>2 years expected lifetime)
[ ] Multiple teams will contribute to the system
[ ] Business requirements drive most changes (not technical/data requirements)
[ ] Core sub-domain provides competitive differentiation

If you checked fewer than 6 boxes: DDD will cost more than it provides.
If you checked 6-9 boxes: Selective DDD (strategic patterns + selective tactical).
If you checked 10-12 boxes: Full DDD investment is justified.
```

## Connections

**Strategic Design**: The core domain / supporting / generic classification is the strategic DDD tool for deciding where to invest DDD effort. Generic sub-domains never justify full DDD. Supporting sub-domains may justify selective DDD. Core domains justify full DDD.

**Tactical Patterns**: The individual tactical patterns (aggregates, repositories, domain events) can be used selectively without the full DDD commitment. Using the Repository pattern for persistence abstraction in a simple application is legitimate even without bounded contexts and aggregates.

**Transaction Script and Active Record**: The simpler patterns that DDD replaces in complex domains. Know when to use them; they are not inferior — they are appropriate for different levels of complexity.

## Key Insights

The most important insight in this article is the meta-insight: DDD is a tool, not a methodology. Tools are used when they fit the problem. Using a sledgehammer to hang a picture frame is not a sign of sophistication — it is a category error. DDD applied to a simple CRUD application is the same category error.

The second insight is that complexity assessment is an ongoing exercise, not a one-time decision. Systems that start simple can become complex as business requirements deepen. Systems that appear complex can turn out to be mostly data management with a small core of genuine domain complexity. Reassess periodically. Apply DDD where the domain has grown into genuine complexity. Simplify (even un-DDD-ify) areas that turned out to be simpler than expected.

The third insight is about intellectual honesty. The DDD community — conferences, books, articles — tends to share examples of DDD applied well to complex domains. This creates a selection bias: you see DDD working beautifully on complex financial systems and logistics platforms. You don't see the cautionary tales of DDD applied to simple content management systems and producing mountains of engineering overhead with no business benefit. Be honest about your domain's actual complexity. Apply the tools that fit.

Evans himself has said in interviews that if he could rewrite the DDD book, he would be more explicit about the applicability criteria — the conditions under which DDD is the right investment. The power of the approach sometimes obscures its appropriate scope. Use DDD deliberately, in the domains where it earns its keep, and use simpler approaches everywhere else. The measure of engineering maturity is not the sophistication of the patterns you apply — it is the accuracy of your judgment about which patterns serve each situation.
