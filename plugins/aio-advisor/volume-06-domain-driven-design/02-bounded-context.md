# Bounded Contexts — Drawing the Lines

> "Explicitly define the context within which a model applies. Explicitly set boundaries in terms of team organization, usage within specific parts of the application, and physical manifestations such as code bases and database schemas. Keep the model strictly consistent within these bounds, but don't be distracted or confused by issues outside." — Eric Evans, Domain-Driven Design

## The Problem

A large insurance company decides to modernize its platform. Architects gather all stakeholders — underwriting, claims, billing, customer service, compliance — and begin designing the unified domain model. They want one model for everything: one `Policy` class, one `Customer` class, one `Claim` class. One true model to rule them all.

Three months into the modeling effort, the meetings are becoming exercises in philosophical debate. The underwriting team says a `Customer` is someone who has been assessed for risk. The billing team says a `Customer` is someone who has a payment relationship with the company. The claims team says a `Customer` is someone who has suffered a loss. The customer service team says a `Customer` is anyone who contacts them, whether they're a policyholder, a claimant, or just someone calling to ask a question. All four definitions are correct. All four are incompatible.

This is not a problem with the stakeholders. It is a fundamental property of large, complex domains: the same word means genuinely different things in different parts of the business. These differences are not oversights or inconsistencies — they reflect real conceptual differences that arise from different concerns, different operations, and different invariants. Any attempt to unify them into a single model produces a model that serves everyone poorly.

The catastrophic response to this problem — the "God Model" approach — produces a `Customer` class with 47 fields, most of which are null for any given use case, with complex conditional logic that says "if this is a billing customer, then these fields matter; if this is a claims customer, then those fields matter." The model becomes unmaintainable within years. Adding a field for one team breaks the model for another. Performance degrades because every query loads data that most callers don't need.

## Core Concept

A Bounded Context is a boundary within which a particular domain model is defined and applicable. Inside the boundary, every term in the Ubiquitous Language has a precise, unambiguous meaning. Outside the boundary, the same term may mean something different, and that's fine — the boundary makes the difference explicit rather than hiding it.

The Bounded Context is the most important strategic pattern in Domain-Driven Design. Evans placed it in the Strategic Design section of his book precisely because it operates at a higher level than classes and aggregates. You design Bounded Contexts before you design object models. The shape of your contexts determines everything downstream — your team structure, your deployment architecture, your data model, your integration patterns.

A Bounded Context is defined by three things:

**A ubiquitous language**: Every term used within the context has a single, precise meaning understood by all members of the team.

**An explicit boundary**: The boundary is not just a conceptual line — it is enforced. In code, this means the context is a separate module, package, or service. Its internal model does not leak out. External models do not penetrate in. The boundary is physical, not just logical.

**A team**: Conway's Law is real. A bounded context should be owned by a single team. When multiple teams share ownership of a context, the boundary erodes because different teams have different vocabularies and different pressures. One team per context is not always achievable, but it is the ideal.

The size of a Bounded Context is a judgment call that depends on the domain. There is no formula. But there are signals:

**Too large**: If domain experts from different sub-domains in the context disagree about terminology, the context is probably too large. If the model has many concepts that only apply in some sub-scenarios (and are null or ignored in others), the context is too large.

**Too small**: If you're constantly reaching across context boundaries to get data for basic operations, the context may be too small. If the overhead of translating between contexts exceeds the benefit of separation, reconsider the boundary.

The sweet spot is a context that corresponds to a natural seam in the domain — a place where the business already has a department, a team, or a distinct process boundary.

## Deep Dive

Evans described the Bounded Context as his most important strategic pattern, and he was candid about why it took him so long to articulate it clearly. The insight came not from theory but from watching teams fail in a specific, recurring way: the attempt to build a single unified model for a large, complex domain. He called this the "Big Model" trap. Teams would spend months building an ever-more-elaborate object hierarchy trying to satisfy every stakeholder's requirements, and the result was always the same — a model so overloaded with conditional logic and context-specific behavior that it satisfied no one well.

The theoretical foundation for why unified models fail comes from what Evans called the "seams of the domain." A large organization does not have one conceptual model of its business — it has several, loosely connected. The insurance underwriter's model of a "policy" is genuinely different from the claims adjuster's model. Not because one is wrong and the other right, but because they serve different purposes, encode different invariants, and require different operations. Forcing them into a single class produces a `Policy` that is simultaneously trying to serve two masters, with each master's requirements creating friction against the other's.

Vernon, in the Red Book, extended Evans' treatment of Bounded Contexts in two important directions. First, he connected Bounded Context size directly to cognitive load. A context whose Ubiquitous Language requires a 50-page glossary to maintain is too large — no team can hold it coherently in their heads. Vernon's rule of thumb was that a Bounded Context's model should be small enough that a single team could describe it completely in a two-hour whiteboard session. Not superficially — in detail, including invariants, state transitions, and edge cases. This is a deliberately human-scale constraint: the limit is cognitive, not technical.

Second, Vernon argued that Conway's Law is not a warning — it is a design tool. Organizations inevitably produce systems that mirror their communication structures. Rather than fighting this tendency, Vernon advocated deliberately aligning team boundaries with context boundaries. If you want a Bounded Context to evolve coherently, give it to a single team that owns it entirely. The moment two teams share ownership of a context, the context begins to fracture because the teams have different pressures, different vocabularies, and different incentives. Vernon called this alignment "team topology matching context topology," and he argued it was as important as the technical boundary enforcement.

The Microsoft .NET Microservices Architecture guide provides one of the most concrete worked examples of Bounded Context identification in the eShopOnContainers reference application. The guide identifies the following contexts in a single e-commerce application: Ordering, Catalog, Basket, Identity, Payment, Marketing, and Location. Critically, the guide shows that `Buyer` means something different in the Ordering context (an entity with a payment method) than in the Identity context (an authenticated user account). Rather than creating a unified `User` that serves both, the guide explicitly advocates for two separate models linked only by a shared identifier — the `buyerId` in Ordering maps to the `userId` in Identity, but the two concepts are otherwise independent. This is the anti-unification principle in practice.

The enforcement of context boundaries in code is more important than teams typically realize. Evans was adamant that a Bounded Context is not just a conceptual boundary — it must be a physical boundary, enforced by the module system or service boundary or, at minimum, strict package access rules. When boundaries are only conceptual ("we agreed not to use each other's internals"), they erode within months under the pressure of deadlines. A developer reaches for a convenient shortcut, accesses an internal class across the boundary, and the boundary begins to collapse. The physical enforcement — separate packages with restricted visibility, separate services with HTTP interfaces, separate deployments — is what makes the boundary durable.

Sam Newman, in *Building Microservices*, built directly on the Bounded Context concept when describing how to decompose systems. His observation was that the most common mistake in microservice decomposition is choosing boundaries based on technical layers (a "database service," a "UI service") rather than domain seams. Technical layering produces services that are tightly coupled at the domain level even when they appear decoupled at the deployment level. The checkout flow still needs to coordinate the cart, pricing, inventory, and payment in a synchronized way — nothing is actually independent. Domain seams based on Bounded Contexts produce services that have genuine independence because the domain concerns they encapsulate are genuinely separable. Newman's canonical heuristic — look for the natural seams in the business, not the natural seams in the technology — is a direct application of Evans' Bounded Context thinking.

The consequence was that Amazon discovered its natural Bounded Contexts by forcing teams to define explicit interfaces. The inventory management context, the pricing context, the fulfillment context, the customer account context, the recommendations context — each developed its own model, its own vocabulary, its own team, and its own service interface. When these contexts needed to integrate, they used explicit translation (anti-corruption layers) rather than sharing a model.

Amazon's retail platform today has hundreds of these contexts. The fact that Amazon.com's product page loads data from dozens of different services — pricing, reviews, inventory, seller information, media content, recommendations — reflects this Bounded Context architecture. Each service owns its piece of the model completely and independently.

### At Microsoft

Microsoft's transformation from a product company to a cloud company required rebuilding organizational boundaries that reflected new bounded contexts. The old Microsoft had contexts organized around products: Windows, Office, SQL Server, Azure. The new Microsoft has contexts organized around capabilities: identity (Azure Active Directory), compute (virtual machines, containers), data (Cosmos DB, Azure SQL), developer tools (GitHub, Azure DevOps).

The most instructive example is Microsoft's treatment of identity. "Identity" could mean many things: Windows user accounts, Azure Active Directory accounts, Microsoft personal accounts (formerly Live), Xbox gamertags, GitHub accounts. These are not the same model. A Windows user account has a SID, domain membership, and local group policies. An Azure AD account has a tenant, service principals, and OAuth2 tokens. A GitHub account has repositories, organizations, and SSH keys.

Microsoft's approach was to define explicit boundaries and explicit integration points. Azure AD is the canonical identity system for enterprise scenarios. Microsoft accounts are the canonical identity for consumer scenarios. GitHub has its own identity model. Where integration is needed (GitHub Enterprise with Azure AD), explicit federation protocols are used — not model merging.

## Implementation Guide

**Step 1: Map Your Domain Before Drawing Boundaries**

Before defining contexts, map the domain. Use Event Storming (see the Ubiquitous Language article) across the entire domain to discover what concepts exist and how they relate. During Event Storming, pay attention to:

- Where do domain experts from different departments start talking past each other?
- Where does the same noun get used with subtly different meanings?
- Where are there naturally distinct workflows that could be isolated?
- Where do organizational boundaries already exist?

These are your context boundaries candidates.

**Step 2: Look for Semantic Discontinuities**

A semantic discontinuity is a place where the same term means different things. To find them, ask domain experts from different parts of the business to define key terms. When their definitions conflict, you've found a potential context boundary.

The insurance example above illustrates this: four different definitions of `Customer` from four different teams = four candidate Bounded Contexts, each with its own `Customer` model tailored to its needs.

**Step 3: Align Contexts with Team Boundaries**

Conway's Law states that organizations produce systems that mirror their communication structures. Use this to your advantage. Draw context boundaries where team boundaries already exist, or where you want team boundaries to exist.

A context owned by a single team will maintain its integrity over time. A context owned by multiple teams will see its boundary erode as each team extends it in their own direction. When you identify a natural Bounded Context but have it owned by multiple teams, that's a signal to either merge the teams (create a platform team) or split the context further.

**Step 4: Enforce Boundaries in Code**

A Bounded Context is only real if its boundary is enforced in code. Enforcement mechanisms:

**Package structure**: In a monolith, the context boundary is a package or namespace. The internal model types are package-private. Nothing from outside the package can reference them directly.

```
com.company.fulfillment/          ← Fulfillment BC
    domain/
        Order.java                ← package-private
        FulfillmentService.java   ← package-private
    api/
        FulfillmentRequest.java   ← public: the boundary
        FulfillmentResult.java    ← public: the boundary
        FulfillmentPort.java      ← public: the boundary
```

**Microservice deployment**: In a microservice architecture, the context boundary is the service boundary. Services communicate through APIs, not through shared databases or shared libraries.

**Module system**: In Java 9+, the module system provides compile-time enforcement of context boundaries. In Go, package visibility and interface-based access enforce the same discipline.

**Step 5: Define the Anti-Corruption Layer at Every Boundary**

Every place where one context depends on another context requires a translation layer. DDD calls this the Anti-Corruption Layer (ACL). The ACL's job is to translate between the two contexts' models, so that neither context's internal model is polluted by the other's concepts.

```java
// In the Fulfillment context
// The ACL translates from the Inventory context's model
public class InventoryServiceACL {
    private final InventoryService inventoryService; // external dependency
    
    public StockAvailability checkStock(ProductSku sku, Quantity quantity) {
        // Translate from Fulfillment's vocabulary to Inventory's vocabulary
        InventoryItem item = inventoryService.getItem(sku.value());
        
        // Translate from Inventory's response back to Fulfillment's vocabulary
        if (item.getAvailableUnits() >= quantity.value()) {
            return StockAvailability.AVAILABLE;
        } else {
            return StockAvailability.INSUFFICIENT;
        }
    }
}
```

The ACL prevents the `InventoryItem` type from leaking into the Fulfillment domain. The Fulfillment context works with `StockAvailability`, which is its own concept, not Inventory's concept.

**Step 6: Document the Context Map**

Create a visual diagram of your Bounded Contexts and the relationships between them. This is the Context Map (covered in detail in the next article). At minimum, the map should show:

- Each bounded context as a labeled shape
- The teams that own each context
- The integration relationships between contexts
- The type of relationship (upstream/downstream, shared kernel, etc.)

The Context Map is a strategic document. It should be visible to all teams. It should be updated when context boundaries change. It is the architectural truth of your system.

## When to Use / When NOT to Use

**When to use Bounded Contexts**:

- **Large teams**: When you have more than one team working on a system, Bounded Contexts provide the autonomy boundaries that allow teams to work independently.

- **Complex domains**: When the domain has multiple distinct sub-domains with different vocabularies, Bounded Contexts make those distinctions explicit.

- **Long-lived systems**: Systems that will evolve over years benefit from bounded contexts because the explicit boundaries make it possible to evolve one part of the system without cascading changes everywhere.

- **Multiple integration points**: When your system integrates with many external systems, Bounded Contexts let you contain the impact of external model changes.

**When NOT to use**:

- **Small, simple domains**: A single developer building a small application with simple domain logic doesn't need the overhead of Bounded Context discipline.

- **Strong shared concepts**: Sometimes a concept truly is shared across the entire domain, and splitting it into contexts creates more problems than it solves. Be cautious about splitting core concepts unnecessarily.

- **Tight real-time coupling**: When two areas of the domain need to make decisions together in real time, with strong consistency requirements, putting them in separate contexts creates coordination complexity that may not be worth it.

## Common Mistakes

**Mistake 1: Bounded Context = Microservice (1:1 mapping)**

Many teams believe "bounded context" and "microservice" are synonyms. They are not. A bounded context is a conceptual boundary around a domain model. A microservice is a deployment unit. One bounded context can be deployed as multiple microservices. One microservice can contain multiple bounded contexts (though this is usually a code smell). The relationship is flexible. See the "DDD and Microservices" article for the full treatment.

**Mistake 2: Technical layering as context boundaries**

Some teams draw context boundaries around technical concerns: "the presentation context," "the data access context," "the messaging context." These are not bounded contexts — they are architectural layers. Bounded contexts are defined by domain concepts, not technical concerns.

**Mistake 3: Shared database across contexts**

Perhaps the most common violation: two contexts sharing a database schema. When contexts share a database, the boundary is theoretical. In practice, one team's schema migration breaks the other team's queries. The database becomes the de facto shared model, and it becomes the most coupled, least maintainable part of the system. Each context must own its own data storage.

**Mistake 4: Context boundaries that don't match team boundaries**

If the boundary cuts through the middle of a team's responsibility, it will erode. Teams will reach across the boundary because "it's faster." After a year, the boundary is a fiction maintained in architecture diagrams but violated everywhere in code. Draw boundaries where teams already are, or reorganize teams to match where boundaries should be.

**Mistake 5: Not revisiting boundaries as the domain evolves**

The right context boundaries for a startup with 10 engineers are not the right boundaries for a company with 1000 engineers. As the domain understanding deepens and the organization grows, context boundaries must be revisited. What started as one context may need to split. What seemed like two contexts may turn out to be one. This is expected evolution, not failure.

**Mistake 6: Making contexts too fine-grained**

The microservices hype pushed many teams toward micro-contexts: one context per use case, one service per aggregate. This creates an explosion of cross-context calls for any meaningful operation. A customer registration might require calls to 7 different "micro-contexts." The overhead of translation, coordination, and distributed transactions exceeds any modularity benefit. Start with larger contexts and split only when there's a clear reason.

## Connections

**Ubiquitous Language**: Every Bounded Context has its own Ubiquitous Language. The language is bounded — consistent within the context, potentially different between contexts. The discipline of maintaining a precise vocabulary requires knowing which context you're in.

**Context Mapping**: The discipline of documenting and managing the relationships between bounded contexts. The Context Map is the strategic view of your system.

**Aggregates**: Aggregates are defined within bounded contexts. They should not reference aggregates from other contexts by object reference — only by identifier.

**Conway's Law**: The organizational structure of teams tends to mirror the communication structure of the systems they build. Use this deliberately: design your bounded context boundaries to match the team structure you want.

**Microservices**: Bounded contexts are the strongest heuristic for microservice decomposition. "One microservice per bounded context" is a reasonable starting point, though the relationship is more nuanced in practice.

## Key Insights

The first key insight about Bounded Contexts is that they acknowledge a fundamental truth about complex domains: there is no single correct model of a large domain. Different parts of the business have legitimately different models of the same concepts, and those differences are features, not bugs. The Bounded Context doesn't eliminate these differences — it makes them explicit and manageable.

The second insight is that the boundary is more important than the model. A well-bounded imperfect model is more maintainable than a perfectly designed model with leaky boundaries. The discipline of the boundary — enforcing it in code, in team organization, in data ownership — is what gives the model its integrity over time.

The third insight is that Bounded Contexts are the foundation of organizational architecture, not just technical architecture. When you draw context boundaries, you're drawing team boundaries, responsibility boundaries, and deployment boundaries simultaneously. This is why strategic DDD is fundamentally a conversation about organization and not just about code.

Evans called Bounded Contexts the most important pattern in DDD because getting them right makes everything else tractable. Getting them wrong — making them too large, or failing to enforce the boundaries — means that every other DDD pattern you apply is building on sand. Start with the strategic design. Draw the lines first. Then build inside them.
