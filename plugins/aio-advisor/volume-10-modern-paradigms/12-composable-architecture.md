# Composable Architecture & MACH

> "The future of enterprise software is not one platform to rule them all. It is the best-of-breed components, composably assembled, with your business logic at the center." — Jasmin Guthmann, MACH Alliance

## The Problem

Enterprise software has long operated on a gravitational pull toward monolithic platforms. SAP runs your ERP. Salesforce runs your CRM. Magento or Shopify runs your e-commerce. Adobe Experience Manager runs your content. Each platform is comprehensive by design — it wants to be the system of record for its domain, and it wants to expand into adjacent domains. The result is a suite of heavyweight, deeply integrated platforms where customization requires working within the platform's extension model, and where changing any component requires negotiating with the platform's data model and integration layer.

This model served organizations well when digital experiences were simpler and change was slower. A Magento installation with a decade of customizations works — but upgrading it is a multi-year, multi-million-dollar project. Adding a new sales channel requires building within the platform's constraints. Personalizing the user experience requires using the platform's personalization engine, not a best-of-breed alternative. The platform's release cadence, its technology choices, and its architectural constraints become your constraints.

Meanwhile, customer expectations for digital experiences have accelerated dramatically. The companies winning in digital — Amazon, Netflix, Spotify — are not running off-the-shelf platforms. They are assembling best-of-breed components and building custom logic on top. The gap between what platform-constrained enterprises can deliver and what native digital companies can deliver is widening.

Composable architecture is the enterprise response to this gap: decompose the monolithic platform into independently replaceable, best-of-breed components connected through APIs, and compose them into experiences through a custom orchestration layer that embodies your specific business logic. MACH (Microservices, API-first, Cloud-native, Headless) is the architectural philosophy that makes this composability possible.

## Core Concept

**MACH: The Four Principles**

*Microservices*: Each business capability is a separately deployable service. Commerce, content, search, personalization, payments, loyalty, and reviews are independent services — each with its own codebase, deployment pipeline, and scaling characteristics. No shared database between services. Loose coupling through APIs.

*API-first*: Every service exposes its functionality through well-defined APIs (REST, GraphQL, gRPC) before any UI is built. The API is the product; the UI is one consumer of the API. This ensures that services are reusable across channels (web, mobile, kiosk, voice, partner integrations) without code duplication.

*Cloud-native*: Services are designed for cloud deployment — stateless, horizontally scalable, infrastructure-agnostic. They use cloud-native services (managed databases, CDN, serverless functions) rather than managing their own infrastructure. They are delivered through CI/CD pipelines with automated testing.

*Headless*: The presentation layer (the "head") is decoupled from the data and logic layer (the "body"). A headless commerce platform provides APIs for product catalog, cart, checkout, and order management — but no storefront. The storefront is built separately, consuming those APIs, using whatever frontend framework is appropriate.

**Packaged Business Capabilities (PBCs)**

The MACH Alliance introduced the concept of Packaged Business Capabilities (PBCs) — autonomous, independently deployable services that encapsulate a specific business capability with its own data, logic, and API. PBCs are the building blocks of composable commerce.

Examples of PBCs in commerce:
- **Product catalog**: Manage products, variants, attributes, categories. API: search, filter, get product details.
- **Inventory**: Real-time inventory levels, reservations, multi-warehouse. API: check availability, reserve, release.
- **Pricing**: Price rules, promotions, customer-tier pricing. API: calculate price for product+customer+quantity.
- **Cart**: Session-based cart with persistent storage. API: add/remove items, apply promotions, calculate totals.
- **Checkout**: Payment processing, address validation, order creation. API: initiate checkout, submit order.
- **Order management**: Order lifecycle, fulfillment routing, returns. API: get order status, initiate return.

Each PBC can be a commercial product (Commercetools for catalog/cart, Stripe for payments, Algolia for search) or a custom-built service. The composable architecture enables mixing commercial and custom PBCs based on where build-vs-buy analysis favors each.

**The Composable Commerce Stack**

The canonical composable commerce technology stack:

| Layer | Purpose | Leaders |
|-------|---------|---------|
| CMS (Content) | Content management, personalization | Contentful, Sanity, Storyblok |
| Commerce | Catalog, cart, checkout, orders | Commercetools, Elastic Path, SFCC |
| Search | Product discovery, faceted search | Algolia, Elasticsearch, Constructor.io |
| Personalization | Recommendations, A/B testing | Dynamic Yield, Bloomreach |
| Payments | Payment processing, fraud | Stripe, Adyen, Braintree |
| Frontend | SSR/SSG web storefront | Next.js, Nuxt, Remix |
| BFF/Orchestration | API composition, business logic | Custom Node.js/Go/GraphQL mesh |

The "BFF" (Backend for Frontend) or orchestration layer is the custom code that composes PBCs into experiences. This is where your business differentiators live: the specific combination of products, promotions, and personalization logic that defines your brand's experience.

## Deep Dive

### MACH Alliance and the Packaged Business Capability: Formalization of Composable Commerce

The MACH Alliance (Microservices, API-first, Cloud-native, Headless), founded in 2020 by Contentful, commercetools, and EPAM, formalized the composable architecture principles that had been emerging in digital commerce through the previous decade. The MACH principles are less a technical specification and more an organizational commitment: vendors and integrators who achieve MACH certification have demonstrated that their products expose functionality exclusively through APIs (no proprietary integration bus), run on cloud-native infrastructure (containerized, scalable independently), and do not impose rendering or presentation logic on consumers (headless).

The Packaged Business Capability (PBC) concept, which the MACH Alliance adopted from Gartner analyst research, is the composable architecture's unit of composition. A PBC is a self-contained software component that encapsulates a bounded business domain — search, checkout, customer identity, payment, content — and exposes it through a versioned API contract. The PBC boundary is a business boundary, not a technical boundary: a PBC can be implemented as a single microservice, a set of microservices, or a third-party SaaS product. What matters is that it presents a stable business API to consumers and manages its own data.

The architectural discipline of PBC design is direct-domain alignment: a PBC must have a clear business owner (the team accountable for search relevance, the team accountable for checkout conversion), a clear API contract (what operations does it expose, what SLAs does it commit to), and clear data ownership (what business entities does it own, what events does it publish). These are the same requirements as the Data Mesh's "data as a product" pillar applied to functionality. A PBC that exposes business capability through an API is the runtime complement to a data mesh that exposes domain data through a product interface — both patterns share the domain-oriented ownership model.

### API Composition Patterns: The BFF and the GraphQL Federation Trade-off

Composable architectures face a systematic integration challenge: each PBC owns a slice of the business domain, but user experiences require data from multiple PBCs composed into a coherent response. An e-commerce product detail page requires product data (from the catalog PBC), pricing data (from the pricing PBC), inventory data (from the inventory PBC), and personalization data (from the recommendations PBC). A naive implementation makes four sequential API calls from the frontend; each adds network latency and increases coupling between the frontend and the backend topology.

The Backend for Frontend (BFF) pattern, described by Sam Newman in "Building Microservices" (2015), resolves this through a dedicated aggregation layer per client type. A web BFF makes the four calls in parallel, merges the results, and returns a single response shaped for the web frontend's consumption model. A mobile BFF returns a reduced payload shaped for mobile bandwidth and screen constraints. The BFF has no business logic — it is a pure composition layer that shields the frontend from the topology of the backend PBCs.

GraphQL federation (Apollo Federation specification, 2019) is an alternative composition mechanism that distributes the aggregation across the PBCs themselves. Each PBC exposes a federated GraphQL subgraph that declares its types and which fields it resolves. A gateway composes the subgraphs into a unified schema. A query that spans multiple PBCs is automatically decomposed into subgraph queries by the gateway and reassembled. The architectural trade-off: GraphQL federation couples PBCs to a shared type system (changes to shared types require coordinated updates across PBCs), while the BFF pattern decouples PBCs from each other at the cost of maintaining a separate aggregation layer per client type. Teams with many client types benefit from federation's schema-based composition; teams with few client types but high PBC autonomy requirements benefit from BFFs.

### Conway's Law and the Composable Organization

The composable architecture pattern has an organizational prerequisite that its technical descriptions often understate: the team structure must mirror the PBC boundaries, or Conway's Law will prevent the architecture from functioning as intended. If the search PBC and the checkout PBC are owned by the same team, they will inevitably share deployment pipelines, data stores, and codebase — eroding the independence that makes them composable. If the frontend team and the checkout PBC team are organized under the same product manager, decisions about the checkout API will be driven by frontend convenience rather than business domain purity.

The organizational model that enables composable architecture is Amazon's "two-pizza team" model applied to PBCs: each PBC is owned by a team small enough to be fed by two pizzas (6-10 people), with full accountability for its API contract, operational health, and business metrics. This team owns the PBC from design through deployment through monitoring — there is no handoff to a separate operations team. The API contract is the team's external interface; what happens inside the PBC is the team's decision.

This organizational requirement is why composable architecture succeeds at large enterprises and fails at small ones: the overhead of maintaining independent teams with independent PBCs only pays off when the organization is large enough that the coordination costs of monolithic development exceed the overhead of autonomous PBC teams. Below roughly 30-50 engineers, composable architecture introduces more coordination overhead than it eliminates — the same threshold that applies to microservices generally.

## Implementation Guide

**Step 1: Capability Mapping**

Before selecting any technology, map your business capabilities to PBC categories:

```
Business Capabilities → PBC Categories → Build vs Buy Decision

Product Discovery:
  ├── Search and filtering      → Buy (Algolia, Constructor.io)
  ├── Recommendations           → Buy (Dynamic Yield, Recombee)
  └── Merchandising rules       → Custom (your business logic)

Commerce:
  ├── Product catalog           → Buy (Commercetools, Elastic Path)
  ├── Pricing and promotions    → Buy (Commercetools) or Custom if complex
  ├── Cart and checkout         → Buy (Commercetools + Stripe)
  └── Order management          → Buy or Custom if complex fulfillment

Content:
  ├── CMS                       → Buy (Contentful, Sanity)
  ├── Personalization           → Buy (Dynamic Yield, Optimizely)
  └── A/B testing               → Buy (LaunchDarkly, Optimizely)

Custom (your differentiators):
  ├── Loyalty program logic     → Build
  ├── Subscription management   → Build or buy (Recurly, Chargebee)
  └── Domain-specific pricing   → Build
```

**Step 2: BFF / Orchestration Layer**

The BFF (Backend for Frontend) is the custom code that composes PBC APIs into frontend-ready responses. This is typically a GraphQL gateway or REST aggregation service:

```typescript
// GraphQL BFF composing multiple PBCs
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';

// Compose schemas from multiple PBC GraphQL APIs
const composedSchema = stitchSchemas({
  subschemas: [
    {
      schema: commercetoolsSchema,     // product, cart, checkout
      endpoint: 'https://api.commercetools.com/graphql',
    },
    {
      schema: contentfulSchema,        // editorial content, banners
      endpoint: 'https://graphql.contentful.com/spaces/{space}/environments/master',
    },
    {
      schema: loyaltySchema,           // custom loyalty service
      endpoint: 'https://loyalty.internal/graphql',
    },
  ],
});

// Custom resolver that composes PBCs
const resolvers = {
  ProductPage: {
    // Enrich product data with CMS editorial content
    editorialContent: async (product, _, context) => {
      return context.contentful.getEntryBySlug(product.slug, 'productEditorial');
    },
    // Add real-time inventory from commerce service
    inventory: async (product, _, context) => {
      return context.commercetools.getInventory(product.sku);
    },
    // Add loyalty points earned per product
    loyaltyPoints: async (product, _, context) => {
      return context.loyalty.getPointsForProduct(product.id, context.customerId);
    },
  },
};
```

**Step 3: Event-Driven PBC Integration**

PBCs that need to react to each other's state changes use event-driven integration rather than synchronous API calls:

```typescript
// Event bridge between PBCs
// When an order is placed in Commerce → notify Loyalty service
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

// Commerce service publishes order events
async function onOrderPlaced(order: Order): Promise<void> {
  const client = new EventBridgeClient({});
  await client.send(new PutEventsCommand({
    Entries: [{
      Source: 'commerce.orders',
      DetailType: 'OrderPlaced',
      Detail: JSON.stringify({
        orderId: order.id,
        customerId: order.customerId,
        total: order.total,
        items: order.items.map(i => ({ sku: i.sku, quantity: i.quantity }))
      }),
      EventBusName: 'composable-platform'
    }]
  }));
}

// Loyalty service subscribes to order events
// (EventBridge rule routes OrderPlaced → loyalty Lambda)
export const handleOrderPlaced = async (event: EventBridgeEvent) => {
  const order = event.detail;
  const pointsEarned = calculateLoyaltyPoints(order);
  await loyaltyDb.creditPoints(order.customerId, pointsEarned, order.orderId);
  await notifications.sendPointsEarnedEmail(order.customerId, pointsEarned);
};
```

**Step 4: Frontend Composition (Next.js + Multiple PBCs)**

```typescript
// Next.js page composing data from multiple PBCs
// Product Detail Page: commerce data + CMS content + personalization
export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
  const slug = params?.slug as string;
  const customerId = getCustomerIdFromCookie(req);

  // Fetch from multiple PBCs in parallel
  const [product, editorial, recommendations, inventory] = await Promise.all([
    commercetools.getProductBySlug(slug),
    contentful.getProductEditorial(slug),
    algolia.getRecommendations(slug, customerId),
    commercetools.getInventory(slug),
  ]);

  return {
    props: {
      product,
      editorial,
      recommendations,
      inventory,
    }
  };
};

export default function ProductPage({ product, editorial, recommendations, inventory }) {
  return (
    <Layout>
      <ProductHero product={product} editorial={editorial} inventory={inventory} />
      <ProductDescription content={editorial?.description} />
      <ProductRecommendations items={recommendations} />
    </Layout>
  );
}
```

## When to Use / When NOT to Use

**Composable architecture is appropriate when:**
- You have complex, multi-channel digital experiences (web, mobile, in-store, partner)
- Your existing platform is blocking business requirements and customization is prohibitively expensive
- You have the engineering maturity to manage multiple integrated services
- Your business requirements differ from what platform vendors prioritize
- You need to move faster than your current platform's release cadence allows

**Composable architecture is NOT appropriate when:**
- Your team is small (< 10 engineers) — the operational overhead of managing multiple SaaS contracts and integrations exceeds the benefit
- Your e-commerce requirements are standard — if Shopify does what you need, don't build a composable stack
- You are in the early stages of product-market fit — the complexity of composable architecture will slow you down when you need speed
- Your team lacks API integration expertise — composable architectures live and die by integration quality

**When monolithic platforms are actually better:**
- Shopify for standard e-commerce up to significant GMV — the platform's ecosystem, reliability, and developer experience are outstanding for standard requirements
- Salesforce for CRM — the ecosystem of AppExchange integrations, the standard data model, and the shared customer success platform are genuinely valuable for most CRM needs
- ServiceNow for IT service management — the platform's workflow engine and integration ecosystem are difficult to replicate with composable alternatives
- The rule: use platforms when your requirements align with the platform's opinionated model. Use composable when your requirements diverge from it.

## Common Mistakes

**Mistake 1: Composing before you have complexity that justifies it**
Composable commerce stacks have 5-10 SaaS contracts, 3-5 custom services, and significant integration complexity. This is appropriate for enterprises with complex requirements. It is overkill for a $1M GMV DTC brand. Right-size the architecture to the complexity of the problem.

**Mistake 2: No central orchestration layer**
PBCs connected directly to frontends produce a "spaghetti integration" architecture — the frontend becomes the integration layer, duplicating data fetching and transformation logic across every page and component. Always build a BFF or orchestration layer that owns PBC composition.

**Mistake 3: Synchronous coupling between PBCs**
PBCs that call each other synchronously at runtime create tight coupling — if the loyalty service is down, the checkout flow fails. Use event-driven integration for cross-PBC state propagation; use synchronous APIs only when you genuinely need real-time data.

**Mistake 4: Underestimating integration complexity**
Each PBC integration requires: authentication, error handling, data model mapping, caching strategy, monitoring, and a fallback plan. Multiply this by 8-10 PBCs and you have significant integration engineering work. Budget accordingly — composable architecture is not "cheaper" than platform architecture, it trades vendor lock-in for integration complexity.

**Mistake 5: Vendor lock-in in the composable stack**
The promise of composable is component replaceability. If your BFF is written against Contentful's proprietary query language rather than an abstracted content interface, you are locked into Contentful. Build abstraction layers in your BFF that isolate PBC-specific APIs behind domain interfaces. Swapping a PBC should require changing the adapter, not the business logic.

## Connections

- **Microservices (Volume 2)**: Composable architecture is the application of microservices thinking to the enterprise SaaS layer. PBCs are microservices, whether they are SaaS products or custom-built services.
- **API Design (Volume 7)**: The "API-first" pillar of MACH requires disciplined API design — versioning, schema design, backward compatibility, documentation. API design excellence is a prerequisite for composable architecture.
- **Event-Driven Architecture (Volume 5)**: Event-driven integration between PBCs is the pattern that prevents synchronous coupling. The domain events from one PBC drive state changes in others without tight coupling.
- **Edge Computing (Article 3, this volume)**: Composable frontends (Next.js, Nuxt) deploy on edge runtimes (Vercel, Netlify Edge) to minimize latency. The BFF layer can also run at edge for performance-sensitive compositions.

## Key Insights

1. **Composable architecture trades vendor lock-in for integration complexity.** This is a trade-off, not an elimination of trade-offs. Monolithic platforms lock you into one vendor's roadmap, pricing, and technical decisions. Composable architecture gives you freedom at the cost of owning the integration layer. Evaluate which form of lock-in is more dangerous for your specific business.

2. **The BFF is where your business logic lives.** PBCs are commodity capabilities — your product catalog, search, and checkout are not your competitive differentiation. The BFF — the orchestration layer that composes PBCs into your specific customer experience — is where your business logic, your personalization rules, your brand experience, and your competitive differentiation live. Invest in it accordingly.

3. **Best-of-breed is only best for your requirements.** "Best" is context-dependent. Algolia is best-of-breed for most e-commerce search requirements. A specialized scientific data search might need Elasticsearch's aggregation capabilities. Evaluate PBCs against your requirements, not industry analyst quadrants.

4. **The MACH Alliance exists because vendor interests align with composability.** MACH PBC vendors benefit when enterprises adopt composable architecture — it expands the market for specialized tools. Understand this incentive structure when reading MACH-affiliated research. The architectural principles are sound; the vendors promoting them have commercial interests.

5. **Composable is a destination, not a starting point.** Very few organizations successfully start with a fully composable architecture. Most successful composable transformations start with a specific pain point (CMS flexibility, search quality, personalization capability), replace that component with a best-of-breed PBC, and expand composability incrementally. Strangler fig, not big-bang rewrite.

6. **The operational model matters as much as the architecture.** 10 SaaS contracts, each with their own SLAs, support processes, billing cycles, and API versioning schedules, creates significant operational overhead. Ensure your organization has the vendor management, integration engineering, and operational capacity to run a composable stack before committing to the model.
