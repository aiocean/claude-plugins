# Context Mapping — Relationships Between Boundaries

> "The context map is not primarily a technical artifact. It is an acknowledgment that the world is messy, that teams are different, and that models are multiple. It is the honest map of where you are." — Vaughn Vernon, Implementing Domain-Driven Design

## The Problem

Two teams are building adjacent systems. Team A owns the Order Management context. Team B owns the Inventory context. At some point, Order Management needs to check inventory availability before confirming an order. The teams need to integrate.

The naive approach: share a library. Team B publishes a JAR containing their domain objects. Team A imports it. Order Management now calls `inventory.getProduct(id)` and works with Team B's `Product` class directly.

Six months later, Team B decides to restructure their `Product` model. They rename `availableQuantity` to `stockLevel`, split `Product` into `Product` and `StockKeepingUnit`, and add a new required field. When they release the new version, Team A's code breaks. Team A must stop their work, understand Team B's new model, and adapt their code. The coupling that seemed convenient has become a source of friction and risk.

But the problem is worse than broken compilation. Team A's domain logic is now written in Team B's vocabulary. Team A's order fulfillment code reasons about `StockKeepingUnits` instead of `Products`. The Order Management context has been contaminated by Inventory's model. When Team A's domain experts talk about "products," they mean something slightly different than what Team B's `Product` class represents — but the code doesn't reflect that difference, so bugs arise from the mismatch.

This is the core problem that Context Mapping solves. It gives teams explicit patterns for managing the relationships between bounded contexts, so that integration happens on known terms, with understood tradeoffs, and with clear ownership of the translation burden.

## Core Concept

A Context Map is a document (often visual) that shows all the bounded contexts in a system and the relationships between them. More importantly, the map uses a specific vocabulary of relationship patterns — each with different implications for team autonomy, model integrity, and integration complexity.

Eric Evans defined nine context relationship patterns. Understanding when to use each pattern is one of the most practical skills in strategic DDD. The pattern you choose is not just a technical decision — it determines the power dynamics between teams, the maintenance burden on each side, and the long-term evolvability of the integration.

The nine patterns are:

1. **Shared Kernel** — Two contexts share a carefully defined subset of the domain model.
2. **Customer/Supplier** — One context (downstream) depends on another (upstream). The upstream team is the supplier; the downstream team is the customer.
3. **Conformist** — The downstream context adopts the upstream context's model wholesale, without translation.
4. **Anti-Corruption Layer (ACL)** — The downstream context translates the upstream model into its own model.
5. **Open Host Service (OHS)** — The upstream context provides a well-defined, stable API for multiple downstream consumers.
6. **Published Language (PL)** — The upstream context uses a well-documented, shared language (often a standard format like JSON Schema or Protocol Buffers) in its API.
7. **Separate Ways** — Two contexts have no integration; teams work entirely independently.
8. **Partnership** — Two teams coordinate closely, planning releases together and handling integration collaboratively.
9. **Big Ball of Mud** — A legacy pattern for systems with no clear boundaries (acknowledged, not endorsed).

## Deep Dive

The most important thing Evans communicated about Context Mapping is that the patterns are not purely technical choices — they are descriptions of team relationships and power dynamics expressed through code structure. The Anti-Corruption Layer is not just an architectural pattern; it is a statement that the downstream team refuses to let the upstream team's model colonize their domain. The Conformist pattern is not just a design decision; it is an acknowledgment that the upstream team has enough power or authority that fighting their model costs more than accepting it. Evans insisted that naming these dynamics explicitly — drawing them on the context map — was essential to clear thinking about integration strategy.

The nine patterns Evans catalogued exist on a spectrum of translation cost versus model integrity. At one end, Conformist requires no translation code but sacrifices the downstream context's conceptual independence. At the other end, the Anti-Corruption Layer preserves the downstream context's model completely but requires a translation layer that must be built and maintained. Vernon added to this analysis by noting that the choice of pattern encodes an assumption about the stability of the upstream model. If the upstream model is stable, a Conformist relationship is low risk. If the upstream model changes frequently — as legacy systems often do during modernization — a Conformist relationship transfers every upstream change directly into the downstream context's codebase, creating cascading change effects. The ACL contains those changes at the boundary.

Vernon's treatment of the Anti-Corruption Layer in the Red Book is the most complete analysis available of that pattern. He identified three structural components: a Facade (which presents the upstream system in terms the ACL can work with), a Translator (which does the actual concept mapping), and a Service (which the downstream context calls). The downstream context never knows the Facade or Translator exist — it only sees the Service, which speaks the downstream context's Ubiquitous Language. Vernon's concrete insight was that the ACL is not a one-time translation but a living component: every time the upstream model changes, the Translator must be updated, and this update stays entirely within the ACL, invisible to the rest of the downstream context. This containment is the ACL's entire value proposition.

The Customer/Supplier pattern contains an insight about team dynamics that Evans considered underappreciated. He observed that in practice, many supposed Customer/Supplier relationships are actually Conformist relationships in disguise. The downstream team believes they are a customer with influence over the upstream supplier's roadmap, but the upstream team has no real obligation to them. When the downstream team discovers a needed API change will not be prioritized for six months, they are not in a Customer/Supplier relationship — they are in a Conformist relationship with false expectations. Evans recommended making this political reality explicit in the context map. A context map that shows a Customer/Supplier relationship where a Conformist relationship actually exists is a dishonest map that produces confused planning.

The Shared Kernel pattern deserves more caution than Evans' original description suggests, and Vernon was direct about this in the Red Book. Every concept in the Shared Kernel must be identical in both contexts — not similar, not compatible, but identical. Any change to a shared concept requires coordination between both teams and simultaneous updates to both codebases. This coordination cost is the reason Vernon recommended minimizing the Shared Kernel to the smallest viable set of concepts. In his experience, teams consistently overestimate how much they need to share and underestimate the coordination cost of sharing it. His practical rule: if you can duplicate the concept and synchronize it via events rather than shared code, duplication is often the better choice.

The Microsoft .NET Microservices Architecture guide provides the most pedagogically clear example of context mapping with explicit pattern assignments. The guide maps the eShopOnContainers reference application and labels each integration with its pattern: the Ordering context uses an ACL when consuming the Catalog context, because Order should not reason about catalog concepts directly; the Basket context uses a Conformist relationship with the Identity context, because the Basket simply needs to identify who owns the basket and the Identity context's user model is authoritative. The guide explicitly notes that each pattern assignment requires a conscious team discussion, not a default: "these are not implementation details — they are agreements between teams about how they will evolve their models over time."

## Implementation Guide

**Shared Kernel**

Use when: Two closely related contexts share concepts that genuinely must be identical — often because they serve the same aggregate root or because they represent a genuinely shared business concept.

The Shared Kernel is a small, carefully curated subset of the domain model that both contexts share. The key discipline is that any change to the shared kernel requires coordination between both teams. This makes the shared kernel a high-friction zone — keep it small.

```
shared-kernel/
    src/
        Money.java          # Shared value object
        Currency.java       # Shared value object
        CustomerId.java     # Shared identifier
```

Both the Billing context and the Order context might share `Money` and `CustomerId`. But `Order` stays in the Order context, and `Invoice` stays in the Billing context. Only the smallest set of concepts that must be identical goes in the shared kernel.

Warning: Shared Kernel is often used as a justification for sharing far too much. When the "shared kernel" grows to contain half the domain model, it has become a God Package. Be aggressive about keeping it minimal. When in doubt, duplicate and then see if the duplication actually hurts.

**Customer/Supplier**

Use when: One context clearly depends on another, the dependency direction is one-way, and the upstream team has significant autonomy but also responsibility to serve downstream needs.

In the Customer/Supplier pattern, the downstream team (customer) specifies what they need in terms of acceptance tests. The upstream team (supplier) is responsible for satisfying those tests. This gives the upstream team freedom to evolve their model while guaranteeing that the downstream team's needs are met.

```
// Downstream team writes acceptance tests
@Test
public void orderContextShouldBeAbleToCheckInventory() {
    // This test specifies what Order Management needs from Inventory
    InventoryStatus status = inventoryClient.checkAvailability(
        ProductId.of("SKU-123"), 
        Quantity.of(5)
    );
    assertNotNull(status);
    assertThat(status.isAvailable()).isIn(true, false);
}
```

The upstream Inventory team runs these tests as part of their CI pipeline. If they break the contract, the tests fail, and they must fix their implementation before releasing.

**Conformist**

Use when: The upstream context is a large, dominant system (often third-party or a platform team) whose model cannot be influenced, and the cost of building a translation layer exceeds the cost of adapting your model to theirs.

Conformist is often the right choice when integrating with external SaaS systems, payment gateways, or dominant platform services. You don't fight Stripe's model — you conform to it. Your internal "Payment" concept is expressed in Stripe's vocabulary: `PaymentIntent`, `Charge`, `Customer`. The cost of building an ACL for Stripe is higher than the cost of having Stripe's vocabulary in your code.

The risk of Conformist is model contamination. When you conform to an external model, that external model's concepts appear in your domain code. If Stripe changes their model significantly, your domain code changes with it. Accept this tradeoff consciously.

**Anti-Corruption Layer**

Use when: You need to integrate with an upstream context whose model differs significantly from yours, and you want to protect your model's integrity from the upstream model's influence.

The ACL is the most important pattern for protecting a well-designed context from external model pollution. It is also the most work. An ACL is a translation layer that:

1. Receives data from the upstream context in the upstream's model
2. Translates it into the downstream context's model
3. Returns the downstream context's model to callers

```java
// Anti-corruption layer in the Order context, adapting from legacy ERP
public class ERPInventoryAdapter implements InventoryService {
    private final LegacyERPClient erpClient;
    
    @Override
    public StockStatus checkAvailability(Sku sku, Quantity needed) {
        // Call legacy ERP (which uses its own terminology)
        ERPStockRecord record = erpClient.queryMaterialStock(
            sku.toMaterialNumber(),  // ERP calls it "material number"
            needed.toBaseUnits()     // ERP uses base units, not our Quantity
        );
        
        // Translate from ERP's model to our model
        return StockStatus.fromAvailableUnits(
            Quantity.ofBaseUnits(record.getUnrestrictedStock())
        );
    }
}
```

The `ERPStockRecord` never crosses the ACL boundary. The Order context's code only sees `StockStatus` and `Quantity` — its own vocabulary.

Build ACLs at every boundary with third-party systems, legacy systems, or upstream contexts with poor model alignment. The ACL is the most valuable pattern for long-term maintainability.

**Open Host Service**

Use when: Your context is consumed by many different downstream contexts, and you want to provide a stable, well-defined integration point.

An Open Host Service defines a protocol (usually an API) that any downstream context can use. The protocol is explicitly designed for external consumption — it is not just your internal model exposed. It hides implementation details, provides versioning, and is documented.

```java
// Open Host Service for the Inventory context
// This is designed for multiple downstream consumers
@RestController
@RequestMapping("/inventory/v2")
public class InventoryOpenHostService {
    
    @GetMapping("/availability")
    public AvailabilityResponse checkAvailability(
        @RequestParam String sku,
        @RequestParam int quantity
    ) {
        // Internal model operations...
        // Returns a stable DTO, not internal domain objects
        return new AvailabilityResponse(sku, available, estimatedDate);
    }
}
```

The `AvailabilityResponse` is a DTO designed for the public interface, not the internal domain model. When the internal model changes, the OHS can translate to maintain backward compatibility in the public contract.

**Published Language**

Often used in conjunction with OHS. A Published Language is a formal, well-documented format for data exchange. It is typically expressed in a schema language (JSON Schema, Protocol Buffers, Avro) and is versioned explicitly.

```protobuf
// Published Language for Inventory events
// Version 2 of the InventoryUpdated event
syntax = "proto3";
message InventoryUpdatedV2 {
    string sku = 1;
    int32 available_quantity = 2;
    string warehouse_id = 3;
    google.protobuf.Timestamp updated_at = 4;
}
```

The Published Language is the contract. Both producer and consumer are bound by it. Changes to the Published Language are versioned and backward-compatible (or version-bumped when breaking).

**Separate Ways**

Use when: Two contexts have no meaningful integration, or when the cost of integration exceeds the benefit.

Separate Ways is often the right choice when domain experts in one area have no need for concepts from another area. Sometimes teams feel they should integrate "in case it's useful later." Resist this. Integration has a cost: it creates coupling, requires maintenance, and can propagate failures. If there's no current, concrete reason to integrate, don't.

**Partnership**

Use when: Two teams are building features that are deeply intertwined, where both need to evolve their models together, and neither can make progress independently.

Partnership is high-coordination, high-alignment. It requires frequent communication, shared planning, and mutual commitment to each other's timelines. It should be used sparingly — most cross-context integrations should be Customer/Supplier or ACL, not Partnership.

Partnership is appropriate during initial system construction when two foundational contexts are being built simultaneously. It is also appropriate when a major architectural shift requires coordinated evolution across multiple contexts. It is not appropriate as a permanent ongoing relationship — that level of coordination does not scale.

## When to Use / When NOT to Use

Context Mapping should be applied in any system with multiple bounded contexts. If you have only one bounded context, there is nothing to map.

The discipline of choosing the right relationship pattern is most critical in large organizations with multiple teams. In a small team with 3-5 engineers, the overhead of formal context mapping may exceed its benefit — though even small teams benefit from thinking about their integration patterns explicitly.

Do not skip context mapping because "we'll figure out integration later." The relationship pattern you choose (even implicitly) has long-term consequences. Discovering that you accidentally built a Conformist relationship when you should have built an ACL — after two years of integration code using the upstream model's vocabulary — is an expensive mistake to correct.

## Common Mistakes

**Mistake 1: No explicit map**

The most common mistake is having implicit context relationships — teams just integrate however seems convenient, without naming the pattern. The result is that every team is unsure about who is responsible for the translation, what the integration contract is, and how to handle upstream changes.

**Mistake 2: Treating all relationships as Conformist by default**

The path of least resistance when integrating with any system is to use the upstream system's model directly. This is the Conformist pattern applied unconsciously. Over time, the downstream context's model is contaminated by every upstream context it integrates with. Build ACLs deliberately, even when it feels like overkill.

**Mistake 3: Making the Shared Kernel too large**

Teams often start with a small shared kernel and gradually add to it because "these concepts are closely related." The shared kernel becomes a dumping ground. Any change requires coordination with multiple teams. The shared kernel has become a ball of mud shared by multiple contexts.

**Mistake 4: Treating Context Map as a one-time artifact**

The context map is a living document. As systems evolve, relationships change. What was Customer/Supplier may become ACL when the upstream team becomes an external vendor. What was Separate Ways may need integration as the business changes. Review and update the context map quarterly.

**Mistake 5: Ignoring power dynamics**

Context mapping is partly a political exercise. The upstream context has power over the downstream context. If the upstream team is unresponsive to downstream needs, the downstream team may need to switch from Customer/Supplier to Conformist (accept what they get) or ACL (translate and be insulated). Acknowledge these dynamics in the map.

## Connections

**Bounded Contexts**: Context mapping is the discipline that manages the relationships between bounded contexts. You cannot do context mapping without bounded contexts.

**Anti-Corruption Layer**: The ACL is one of the most important context mapping patterns. It protects domain model integrity at bounded context boundaries.

**Ubiquitous Language**: Different bounded contexts have different Ubiquitous Languages. Context mapping patterns determine how translations between those languages are handled.

**Microservices**: When bounded contexts are deployed as microservices, the context map becomes the service dependency map. The integration patterns (ACL, OHS, Published Language) become the API design patterns.

**Domain Events**: Events published across context boundaries should be expressed in a Published Language format — not in the producing context's internal domain model format.

## Key Insights

The most important insight about context mapping is that it names the power dynamics and responsibilities that already exist in your organization. Teams already have relationships — some teams drive decisions and others adapt; some teams provide platforms and others consume them. The context map vocabulary makes these relationships explicit so that they can be managed deliberately rather than stumbled into accidentally.

The second insight is that no single pattern is "best." The right pattern depends on the team relationship, the model alignment, the frequency of change, and the organizational politics. An ACL is more work than Conformist, but it protects your model's integrity. A Shared Kernel requires coordination but avoids duplication. Partnership enables fast co-evolution but doesn't scale to many teams. Use the pattern that matches your actual situation.

The third insight is that context map patterns are social contracts as much as technical patterns. When you document that the relationship between two contexts is Customer/Supplier, you're documenting that the upstream team has accepted responsibility for running the downstream team's acceptance tests. When you document an ACL, you're documenting that the downstream team owns the translation burden. The map creates accountability.

Draw the map honestly. Include the Big Ball of Mud if you have one. Include the Conformist relationships you're embarrassed about. A context map that only shows the ideal state is fiction. A context map that shows the actual state is a tool for improvement.
