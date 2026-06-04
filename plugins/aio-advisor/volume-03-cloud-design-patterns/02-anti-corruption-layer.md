# Anti-Corruption Layer

> "When you are integrating with a legacy system, you need a translation layer that prevents the legacy concepts from bleeding into your new model." — Eric Evans, Domain-Driven Design

## The Problem

You are building a new order management system. Clean domain model. Proper aggregate boundaries. Rich domain events. The works. But there is one problem: you need to integrate with a fifteen-year-old ERP system that your company has depended on since before most of your current engineers were in college. That ERP system thinks about orders in terms of "sales documents," customers are "business partners," and products are "material numbers." It stores amounts in a custom fixed-point format, uses YYYYMMDD date strings everywhere, and has a concept called "delivery group" that maps awkwardly to your notion of fulfillment.

If you call the ERP API directly from your new service — and most teams do — the ERP's concepts start leaking into your code. You write an `Order` entity that has a `salesDocumentNumber` field because the ERP returns one and you need to store it. You write a function that converts your `Product` to the ERP's `MaterialNumber` format scattered through your business logic. You find yourself talking about "business partners" in sprint planning. Six months later, your beautiful domain model has been colonized by the ERP's worldview. The new system has become a thin wrapper around the legacy, inheriting all its conceptual weight.

The Anti-Corruption Layer (ACL) is Eric Evans' answer to this problem, articulated in Domain-Driven Design (2003). It is a translation layer — a boundary — between your bounded context and an external system. The ACL translates external concepts into your domain's language and back. It ensures that your domain model stays pure, that the language of your domain isn't corrupted by the language of the system you're integrating with.

## Core Concept

The Anti-Corruption Layer sits at the boundary between two systems with different domain models. It performs three functions: translation of data formats and types, mapping of concepts across domain vocabularies, and protocol adaptation. Everything that crosses the boundary goes through the ACL, and the ACL ensures that what enters your domain is expressed in your domain's language.

```
┌─────────────────────────────────────────┐
│           Your Bounded Context           │
│                                         │
│   Order, Customer, Product, Money       │
│   (your domain language)               │
│                                         │
│         ┌──────────────────┐           │
│         │ Anti-Corruption  │           │
│         │     Layer        │           │
│         │                  │           │
│         │  Translates:     │           │
│         │  - types         │           │
│         │  - concepts      │           │
│         │  - protocols     │           │
│         └────────┬─────────┘           │
└──────────────────┼──────────────────────┘
                   │
┌──────────────────┼──────────────────────┐
│                  │   Legacy ERP         │
│   SalesDocument, BusinessPartner,       │
│   MaterialNumber, DeliveryGroup         │
│   (legacy domain language)             │
└─────────────────────────────────────────┘
```

The ACL is not just a data mapper. Data mappers convert fields from one format to another. The ACL translates between conceptual models that may not even be structurally equivalent. An ERP "DeliveryGroup" might decompose into a `ShippingAddress` plus `FulfillmentWindow` in your model. A "BusinessPartner" might need to be split into a `Customer` and a `Vendor` depending on context. The ACL handles these structural transformations, not just field renaming.

The pattern has three main components:

**Facade**: Simplifies the interface to the external system. The legacy ERP might have a SOAP API with 47 operations. Your ACL facade exposes exactly the 5 operations your domain needs, in terms your domain understands.

**Translator**: Converts between domain models. This is where the conceptual work happens — deciding how legacy concepts map to yours, handling the cases where the mapping isn't 1:1.

**Adapter**: Handles protocol differences. The ERP speaks SOAP; your service speaks REST. The ERP uses synchronous batch calls; your service expects async events. The adapter bridges these.

## Deep Dive

The Anti-Corruption Layer is Eric Evans' solution to a problem that is fundamentally linguistic, not technical. In *Domain-Driven Design* (2003), Evans argues that every domain model is expressed in a *ubiquitous language* — the vocabulary that domain experts and developers share when discussing the system. When two systems with different ubiquitous languages are integrated directly, the vocabulary of the more powerful or more entrenched system bleeds into the other. Developers start using "sales documents" when they mean "orders," not because they chose to, but because the ERP API uses that term and it propagated through every variable name and database column.

**Evans' original framing** distinguishes this from a mere data mapping problem. A mapper converts field formats — a string date to a `LocalDate`, a fixed-point decimal to a `Money` value. An ACL translates *concepts* — a `BusinessPartner` that is simultaneously a customer and a supplier becomes two separate domain objects, each in the appropriate bounded context. The translator must understand both domain models deeply enough to navigate cases where a 1:1 conceptual mapping does not exist. This is design work, not plumbing.

**Sam Newman's *Building Microservices*** reinforces this with its analysis of coupling modes. Newman distinguishes temporal coupling (services must be available simultaneously), behavioral coupling (a change in one service forces a change in another), and semantic coupling (services share a domain vocabulary). The ACL specifically attacks semantic coupling. Without it, when the external system's domain model evolves — when the ERP vendor renames "SalesDocument" to "SalesOrder" in version 12 — every service that adopted ERP terminology must change. With a proper ACL, only the translator changes; the internal domain model is untouched.

**The AWS Builder's Library article on dependency isolation** describes a practical consequence of skipping the ACL: when teams migrate from a legacy system, they often discover they cannot change the internal model without breaking compatibility with the legacy, because the legacy's concepts are baked into every entity in the internal codebase. The ACL creates an explicit seam. Behind the seam, the internal model can evolve freely. The seam absorbs the cost of compatibility during migration. When the legacy is finally decommissioned, only the ACL is deleted — the internal model is untouched.

**Martin Fowler's analysis of integration patterns** surfaces an important asymmetry: the ACL pattern assumes you cannot or will not change the external system. This is the typical condition with legacy systems, third-party software, and acquired company systems. When you *can* change both systems, the right answer is to align the domain models — not to build a translation layer between two misaligned models you control. Evans called this the *Partnership* or *Shared Kernel* relationship in his Context Map vocabulary. The ACL is for *Conformist* or *Customer-Supplier* relationships where one side dictates terms.

**The *Release It!* perspective on failure modes** adds another dimension: the ACL should translate error conditions as well as success paths. A legacy ERP returns error code `E_MATERIAL_NOT_FOUND` — this should become `ProductNotFoundException` in your domain, not `ERPException(code: "E_MATERIAL_NOT_FOUND")`. If ERP error codes leak through the ACL, any code that catches errors must know ERP vocabulary. Errors are part of the domain model. The ACL translates them too.

**Kleppmann's treatment of data encoding in *Designing Data-Intensive Applications*** is directly relevant when the external system's data schema evolves. If the ERP upgrades and changes a field type, the ACL's translator is the only code that must be updated to handle both the old and new formats simultaneously during a migration window. This is the blast shield function of the ACL — schema volatility in the external system is absorbed at the boundary rather than propagating through every downstream consumer.

## Implementation Guide

### Step 1: Map the conceptual differences

Before writing code, document the conceptual mapping between domains. This is the hardest part.

```
ERP Concept          → Your Domain Concept
──────────────────────────────────────────
SalesDocument        → Order
BusinessPartner      → Customer (when buying) | Supplier (when selling)
MaterialNumber       → ProductId (GTIN or internal SKU)
DeliveryGroup        → ShippingAddress + DeliveryWindow
NetAmount            → Money{amount: Decimal, currency: Currency}
YYYYMMDD date string → LocalDate
```

Document where the mapping is lossy or ambiguous. A `BusinessPartner` might be both a customer and supplier. How does your domain model handle this? The ACL must handle it too.

### Step 2: Define the facade interface

Define the interface your domain code will use to access the external system. Write it entirely in your domain's language:

```typescript
interface OrderFulfillmentService {
  submitOrder(order: Order): Promise<OrderConfirmation>;
  getDeliveryStatus(orderId: OrderId): Promise<DeliveryStatus>;
  cancelOrder(orderId: OrderId, reason: CancellationReason): Promise<void>;
}
```

No ERP terminology. No SalesDocument, no BusinessPartner. This interface is what your domain sees. The ACL implements it.

### Step 3: Implement the translator

```typescript
class ERPOrderFulfillmentACL implements OrderFulfillmentService {
  constructor(private readonly erpClient: ERPClient) {}

  async submitOrder(order: Order): Promise<OrderConfirmation> {
    // Translate your domain Order to ERP's SalesDocument
    const salesDocument = this.toSalesDocument(order);
    
    // Call ERP using ERP language
    const erpResponse = await this.erpClient.createSalesDocument(salesDocument);
    
    // Translate ERP response back to your domain
    return this.toOrderConfirmation(erpResponse);
  }

  private toSalesDocument(order: Order): ERPSalesDocument {
    return {
      businessPartner: order.customer.erpId,  // stored during customer sync
      materialPositions: order.items.map(item => ({
        materialNumber: item.product.erpMaterialNumber,
        quantity: item.quantity.value,
        netAmount: item.price.amount.toFixed(2),  // ERP uses string decimal
        currency: item.price.currency.isoCode,
      })),
      requestedDeliveryDate: this.toERPDate(order.requestedDelivery.date),
      deliveryGroup: this.resolveDeliveryGroup(order.shippingAddress),
    };
  }

  private toOrderConfirmation(erpResponse: ERPSalesDocumentResponse): OrderConfirmation {
    return new OrderConfirmation({
      confirmationNumber: erpResponse.salesDocumentNumber,
      confirmedDeliveryDate: this.fromERPDate(erpResponse.confirmedDeliveryDate),
      status: this.mapStatus(erpResponse.documentStatus),
    });
  }

  private toERPDate(date: LocalDate): string {
    return date.format('YYYYMMDD');  // ERP expects date as YYYYMMDD string
  }

  private fromERPDate(erpDate: string): LocalDate {
    return LocalDate.parse(erpDate, 'YYYYMMDD');
  }

  private mapStatus(erpStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'A': OrderStatus.OPEN,
      'B': OrderStatus.IN_PROCESS,
      'C': OrderStatus.DELIVERED,
      'D': OrderStatus.CANCELLED,
    };
    return statusMap[erpStatus] ?? OrderStatus.UNKNOWN;
  }
}
```

### Step 4: Handle structural mismatches

When one external concept maps to multiple domain concepts:

```typescript
private splitBusinessPartner(bp: ERPBusinessPartner): Customer | Supplier | CustomerAndSupplier {
  const isCustomer = bp.roles.includes('SOLD_TO');
  const isSupplier = bp.roles.includes('VENDOR');
  
  if (isCustomer && isSupplier) {
    return new CustomerAndSupplier({
      customer: this.toCustomer(bp),
      supplier: this.toSupplier(bp),
    });
  }
  if (isCustomer) return this.toCustomer(bp);
  if (isSupplier) return this.toSupplier(bp);
  
  throw new UnknownPartnerRoleError(bp.id, bp.roles);
}
```

### Step 5: Handle failures in terms your domain understands

Don't let ERP error codes leak into your domain:

```typescript
async submitOrder(order: Order): Promise<OrderConfirmation> {
  try {
    const salesDocument = this.toSalesDocument(order);
    const erpResponse = await this.erpClient.createSalesDocument(salesDocument);
    return this.toOrderConfirmation(erpResponse);
  } catch (error) {
    if (error instanceof ERPValidationError) {
      throw new OrderValidationError(
        this.translateERPValidationError(error),
        order.id,
      );
    }
    if (error instanceof ERPConnectionError) {
      throw new FulfillmentSystemUnavailableError(error);
    }
    throw error;
  }
}
```

Your domain throws `OrderValidationError`, not `ERPValidationError`. The ACL handles the translation.

### Step 6: Test the ACL independently

The ACL is a first-class unit of code. Test it with contract tests:

```typescript
describe('ERPOrderFulfillmentACL', () => {
  it('translates Order to SalesDocument correctly', () => {
    const order = OrderBuilder.aValidOrder()
      .withCustomer(CustomerBuilder.withERPId('BP-12345'))
      .withItem(ProductBuilder.withMaterialNumber('MAT-001'), quantity(2))
      .withShippingAddress(Address.of('Berlin', 'DE'))
      .withRequestedDelivery(LocalDate.of(2026, 3, 15))
      .build();

    const salesDocument = acl.toSalesDocument(order);  // test internal method

    expect(salesDocument.businessPartner).toBe('BP-12345');
    expect(salesDocument.materialPositions[0].materialNumber).toBe('MAT-001');
    expect(salesDocument.requestedDeliveryDate).toBe('20260315');
  });
});
```

## When to Use

**Integrating with legacy systems** is the canonical use case. When the legacy system has a conceptual model significantly different from yours, and you cannot change the legacy system, the ACL protects your model from contamination.

**Third-party system integration.** Salesforce, SAP, Oracle, Workday — every enterprise SaaS has its own domain model and terminology. Your domain model should not be shaped by Salesforce's entity model. Put an ACL between them.

**Acquiring companies' systems.** Post-acquisition integrations often need to connect two systems built by different organizations with different domain vocabularies. The ACL creates a translation layer without forcing either system to adopt the other's language.

**Preventing bounded context coupling.** Even between your own internal services, when two bounded contexts have genuinely different models of the same concept, the ACL prevents tight coupling. The ordering context's view of a Product is different from the catalog context's view — they shouldn't share the same class.

**During incremental legacy migration.** When migrating from legacy to new, the new system can develop its own domain model from the start. The ACL handles compatibility with the legacy system during the transition period, and you remove the ACL when the legacy is fully decommissioned.

## When NOT to Use

**When the external system's model is actually good.** If the external system's domain model is well-designed and aligns with how you naturally think about the domain, adopting its concepts isn't corruption — it's pragmatism. Not every integration needs an ACL.

**When the cost of translation exceeds the benefit.** If the two systems have nearly identical models, the ACL is bureaucratic overhead. A simple data mapper or even direct integration is more appropriate.

**When you control both systems.** If you own both the calling service and the called service, align the domain models rather than building a translation layer. The ACL is for when you can't change the external system's model.

**As a substitute for good design in your own model.** Some teams use "we have an ACL" as an excuse to avoid thinking carefully about their domain model. The ACL protects your model — but you still need to design your model well.

## Common Mistakes

**Mistake 1: Letting ERP field names into your domain model.** The most common failure mode: your domain's `Order` entity grows a field called `salesDocumentNumber` because you need to store the ERP's reference. Better: store it as `externalReference` with a `source` field, or create a separate `ERPOrderReference` value object that lives at the boundary. Don't put ERP terminology in your core domain.

**Mistake 2: Putting business logic in the ACL.** The ACL should be a translator, not a decision-maker. If you're writing `if (order.amount > 10000) { use ERP's 'large order' workflow }`, that business logic belongs in your domain, not in the ACL. The ACL translates what to do, not decides what to do.

**Mistake 3: Making the ACL too thin — letting external types through.** A facade that just wraps the ERP client and returns ERP types is not an ACL. The ERP types must not cross the boundary. Every type that exits the ACL toward your domain must be a type from your domain.

**Mistake 4: Synchronous ACL for high-latency external systems.** If the ERP is slow (and legacy ERPs usually are), a synchronous ACL creates latency problems. Consider an async ACL: your domain submits a command, the ACL calls the ERP asynchronously, and reports back via an event. This decouples your domain's performance from the legacy system's performance.

**Mistake 5: Not handling the ACL as a first-class architectural component.** ACLs are often written as "temporary" glue code without proper testing, logging, or error handling. They end up being fragile. Treat the ACL as a proper service boundary: test it, document it, monitor it, and design it to handle failures gracefully.

## Connections

**Strangler Fig Pattern**: The ACL is the foundation of the Strangler Fig migration strategy. You build the ACL first, route traffic through it to the legacy, then incrementally replace the legacy implementation behind the ACL. The ACL stays stable while the backend changes.

**Facade Pattern (GoF)**: The ACL's facade component is an application of the classic GoF Facade pattern — simplifying a complex interface. The ACL extends this with semantic translation.

**Bounded Context (DDD)**: The ACL is the implementation mechanism for Bounded Context integration. The Context Map in DDD shows ACLs as a specific integration relationship type (denoted by the abbreviation ACL in context maps).

**Ambassador Pattern** (Volume 03, article 01): The Ambassador can implement protocol-level aspects of ACL. If the legacy system uses SOAP and your service uses REST, the Ambassador can handle the protocol translation while the ACL handles the conceptual translation.

**Adapter Pattern (GoF)**: The ACL's adapter component uses the Adapter pattern for protocol bridging. The distinction is that the ACL is domain-driven — it translates concepts — while the Adapter is purely structural.

## Key Insights

1. **The corruption is conceptual, not technical.** When ERP terminology enters your codebase, it shapes how developers think about the domain. Engineers start using "SalesDocument" in conversations that should be about "Orders." The ACL prevents conceptual contamination, not just technical dependency.

2. **The ACL must be owned, tested, and maintained.** It is not glue code. It is a critical boundary in your architecture. When the ERP changes its API, the ACL is your only blast shield. If it's poorly tested, that blast shield has holes.

3. **ACLs accumulate debt if the migration never completes.** The ACL exists to allow you to develop independently while maintaining compatibility with the legacy. If the migration never completes, you end up maintaining both the ACL and the legacy indefinitely. Set a decommission date for the legacy as part of your ACL adoption.

4. **A well-designed ACL makes migration possible.** When you finally decommission the legacy, you remove the ACL and replace it with a direct implementation. Your domain code doesn't change. This is the payoff of keeping your domain model clean.

5. **The ACL reveals where the external model is genuinely confusing.** Writing the translator forces you to understand exactly how the external system's concepts map to yours. Often you discover that the external system's concepts are genuinely ambiguous or inconsistent. The ACL code documents these ambiguities explicitly.

6. **Async ACLs are often better than sync ACLs.** Legacy systems are often slow, unreliable, and have maintenance windows. An async ACL — command in, event out — decouples your domain from these failures. Consider this from the start rather than adding it as an afterthought.

7. **Not every external system needs an ACL.** Some external APIs have well-designed domain models. The test: would a new team member think the external system's terminology sounds natural in a domain discussion? If yes, adopt the terminology. If no, add the ACL.
