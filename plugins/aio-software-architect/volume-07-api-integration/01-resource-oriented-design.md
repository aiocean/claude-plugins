# Resource-Oriented API Design

> "A REST API should spend almost all of its descriptive effort in defining the media types used for representing resources and driving application state." — Roy Fielding

## The Problem

Most APIs are built by developers who think in terms of operations. They want to expose what their system *does*: `createUser`, `deleteAccount`, `sendEmail`, `processPayment`. The result is a collection of remote procedure calls dressed in HTTP clothing — verbs masquerading as endpoints. You end up with `/api/sendWelcomeEmail`, `/api/getUserData`, `/api/updateUserProfile`, `/api/deactivateAccount`. Each endpoint is an island. Navigation is impossible. Clients must consult documentation for every operation because there is no discoverable structure.

The cognitive overhead is enormous. Teams maintain sprawling documentation just to explain what endpoints exist. Every new feature requires a new endpoint. Clients hardcode URLs. When URLs change, integrations break silently. Caching is nearly impossible because every endpoint is semantically unique. Rate limiting requires per-endpoint configuration because there is no shared taxonomy.

Resource-oriented design solves this by flipping the mental model. Instead of asking "what does my system do?", you ask "what are the things my system manages?" Resources are the nouns: users, orders, invoices, products, sessions. Once you have the resources, the operations follow naturally from a small, uniform set of standard methods. The API becomes navigable, predictable, and cacheable. Clients that understand the pattern can explore the API without reading documentation for every endpoint.

## Core Concept

Resource-oriented design is the architectural approach underlying REST, popularized and codified by Google's API Design Guide (AIP — API Improvement Proposals). The central insight is that HTTP was designed as a document transfer protocol, not an RPC protocol. HTTP already has a rich set of methods, status codes, and headers designed around the concept of *resources* — addressable things with state that can be retrieved, modified, and deleted.

A **resource** is any entity with a unique identity and a meaningful lifecycle. Resources are named with URLs, and their names follow a hierarchical structure that reflects ownership and containment. A user resource lives at `/users/{userId}`. A post authored by that user lives at `/users/{userId}/posts/{postId}`. A comment on that post lives at `/users/{userId}/posts/{postId}/comments/{commentId}`. The hierarchy is not arbitrary — it encodes semantics. It tells you that deleting a post implies deleting its comments. It tells you that access to a comment requires access to its parent post.

The **standard methods** are five operations that apply uniformly to every resource:

- `GET /resources` — List a collection
- `GET /resources/{id}` — Get a single resource
- `POST /resources` — Create a resource in a collection
- `PUT /resources/{id}` or `PATCH /resources/{id}` — Update a resource
- `DELETE /resources/{id}` — Delete a resource

These five methods cover the vast majority of API operations. When a developer encounters an unfamiliar resource in a resource-oriented API, they already know how to interact with it. The learning curve for each new resource approaches zero.

But not all operations fit neatly into CRUD. Approving an invoice, canceling an order, pausing a subscription — these are *actions* that don't map cleanly to Create, Read, Update, or Delete. Google's AIP specification handles these with **custom methods**, using the colon syntax: `POST /invoices/{invoiceId}:approve`, `POST /orders/{orderId}:cancel`. The custom method is attached to a resource but signals that it is a non-standard operation. This preserves the resource-oriented structure while acknowledging that some operations are fundamentally action-oriented.

### The Richardson Maturity Model

Leonard Richardson described a maturity model for REST APIs in 2008 that remains the most useful framework for understanding where an API sits on the resource-oriented spectrum.

**Level 0 — The Swamp of POX**: All requests go to a single URL. Usually `/api/endpoint`. Everything is a `POST`. The body contains an action and parameters. This is RPC over HTTP. XML-RPC, early SOAP, and most internal "REST APIs" at Level 0 companies look like this.

**Level 1 — Resources**: Different URLs for different resources. Still using POST for everything, but `/users` and `/orders` are separate endpoints. Structure exists, but HTTP semantics are ignored.

**Level 2 — HTTP Verbs**: Correct use of GET, POST, PUT, DELETE. Status codes are meaningful (201 for created, 404 for not found, 400 for bad request). This is what most people mean when they say "REST API." The majority of production APIs target Level 2. Caching works because GET requests are idempotent.

**Level 3 — Hypermedia (HATEOAS)**: Responses include links to related resources and available actions. The client does not need to construct URLs — it follows links. A `GET /orders/123` response includes a `cancel` link if the order can be canceled, and omits it if not. The API is self-describing.

Level 3 is the theoretical ideal but rarely practical. Building full HATEOAS requires clients that can interpret hypermedia formats (HAL, Siren, JSON:API), which most don't. The maintenance burden is high: every response must include accurate, up-to-date links. In practice, Level 2 with good documentation achieves most of the benefits with a fraction of the complexity. The pragmatic standard for production APIs is Level 2, with selective use of Level 3 concepts (like pagination cursors) where they provide concrete value.

## Deep Dive

Roy Fielding's 2000 dissertation introduced REST not as a set of best practices but as an architectural style — a set of constraints that, when applied together, produce systems with specific properties: scalability, visibility, portability, reliability, and modifiability. The constraints Fielding defined were: client-server separation, statelessness, cacheability, layered system, uniform interface, and code-on-demand (optional). The uniform interface constraint is the one most relevant to resource-oriented design, and it contains four sub-constraints: identification of resources, manipulation of resources through representations, self-descriptive messages, and hypermedia as the engine of application state (HATEOAS).

Fielding was explicit in subsequent writing that most APIs called "REST" are not REST — they violate one or more of these constraints, typically statelessness (storing session state server-side) or the uniform interface (using RPC-style URLs that identify operations rather than resources). He regarded this confusion as harmful because it prevented practitioners from understanding the actual trade-offs they were making. An API that uses HTTP as a transport for RPC is not "less RESTful" — it is a different architecture with different properties. The resource-oriented design that Google's API Design Guide and similar documents describe is a pragmatic subset of Fielding's constraints, aimed at the uniform interface property specifically: resources are named with URLs, manipulated through a small set of standard operations, and represented in standard formats.

Google's API Improvement Proposals (AIPs) represent the most systematic codification of resource-oriented design published by any organization. The AIPs are numbered and versioned, covering everything from resource naming (AIP-122) to standard methods (AIP-131 through AIP-135) to custom methods (AIP-136) to long-running operations (AIP-151). The rigor of the AIP system reflects Google's scale: with hundreds of API teams building independently, inconsistency is the default outcome. The AIPs exist not to impose uniformity for its own sake but because inconsistency has a measurable cost in developer experience. A developer who has learned the Google Cloud Storage API should be able to form a correct hypothesis about the Google Cloud Pub/Sub API without reading its documentation. The AIPs make this inter-API transfer of knowledge possible by ensuring that the same concepts (listing resources, paginating results, handling errors) work the same way everywhere.

The custom method pattern — `POST /resource/{id}:verb` — solves a real tension in resource-oriented design that simpler treatments ignore. Some operations in a domain are genuinely action-oriented: approving an invoice, canceling an order, publishing a document. These operations do not map cleanly to Create, Read, Update, or Delete. The naive response is to model them as state updates (`PATCH /orders/{id}` with `{ "status": "CANCELLED" }`), but this conflates the representation of state with the operation that causes the state change. Canceling an order has preconditions, business rules, and side effects that are not captured by a status field update. The custom method makes the action explicit while keeping the resource as the first-class noun: the operation is attached to the resource it acts upon, uses POST to signal that it has side effects, and uses the colon syntax to distinguish it from standard CRUD operations.

The Richardson Maturity Model, while widely cited as a progression toward better API design, is more useful as a diagnostic tool than as a goal. Level 2 — correct use of HTTP verbs and status codes — is the pragmatic target for production APIs because it unlocks the most valuable properties: GET requests are cacheable by default, POST requests are understood as non-idempotent, status codes convey meaningful information to generic HTTP infrastructure. Level 3 (HATEOAS) is theoretically elegant but requires investment in hypermedia client libraries that most teams are unwilling to make. The Stripe API design philosophy, documented through their developer blog and conference talks, takes a deliberately non-HATEOAS approach: the API is well-documented, URLs are stable and predictable, and clients construct URLs from known patterns rather than following links. Stripe's argument is that HATEOAS solves a discoverability problem that good documentation also solves, and that the implementation complexity of HATEOAS is not justified by the discoverability gain for developer-facing APIs.

## Implementation Guide

### Step 1: Identify Your Resources

Start by listing the entities your system manages. Resources are typically nouns: users, products, orders, payments, sessions, subscriptions. Avoid action-oriented thinking at this stage. If you find yourself writing verbs, you are identifying operations, not resources.

Classify resources by their relationships:
- **Top-level resources**: Stand alone. `/users`, `/products`, `/organizations`
- **Sub-resources**: Exist within a parent. `/organizations/{orgId}/members`, `/orders/{orderId}/items`
- **Singleton resources**: Only one exists per parent. `/users/{userId}/profile`, `/organizations/{orgId}/settings`

```
Resources for an e-commerce API:

/products                          # Product catalog
/products/{productId}
/products/{productId}/reviews
/products/{productId}/reviews/{reviewId}

/orders                            # Order management  
/orders/{orderId}
/orders/{orderId}/items
/orders/{orderId}/items/{itemId}

/users                             # User management
/users/{userId}
/users/{userId}/addresses
/users/{userId}/payment-methods
```

### Step 2: Define Standard Methods

Map CRUD operations to HTTP methods. The mapping is mechanical once you have your resources:

```
# Collection operations
GET    /orders              → List orders (with filtering, sorting, pagination)
POST   /orders              → Create a new order

# Resource operations  
GET    /orders/{orderId}    → Get a specific order
PATCH  /orders/{orderId}    → Update specific fields of an order
PUT    /orders/{orderId}    → Replace an order entirely (use rarely)
DELETE /orders/{orderId}    → Delete an order
```

Use `PATCH` by default for updates, not `PUT`. PUT requires sending the complete resource, which causes lost update problems when multiple clients update simultaneously. PATCH with JSON Merge Patch (RFC 7396) or JSON Patch (RFC 6902) is safer and more efficient.

### Step 3: Design Custom Methods for Non-CRUD Operations

When an operation cannot be expressed as CRUD, use a custom method:

```
# State transitions
POST /orders/{orderId}:cancel
POST /orders/{orderId}:fulfill
POST /orders/{orderId}:refund

# Bulk operations
POST /orders:batchCreate
POST /orders:batchDelete

# Special operations
POST /products/{productId}:duplicate
POST /users/{userId}:resetPassword
POST /users/{userId}:sendVerificationEmail
```

Custom methods are always `POST` (they have side effects). They are attached to a specific resource, not floating as standalone endpoints. They use camelCase verbs after the colon.

### Step 4: Design Your Resource Representations

JSON field naming conventions matter for consistency:

```json
{
  "name": "orders/ord_1234",
  "displayName": "Order #1234",
  "userId": "users/usr_5678",
  "status": "PENDING",
  "totalAmount": {
    "value": "49.99",
    "currency": "USD"
  },
  "items": [
    {
      "name": "orders/ord_1234/items/item_001",
      "productId": "products/prod_9012",
      "quantity": 2,
      "unitPrice": {
        "value": "24.99",
        "currency": "USD"
      }
    }
  ],
  "createTime": "2024-01-15T10:30:00Z",
  "updateTime": "2024-01-15T10:30:00Z"
}
```

Key conventions:
- Use `camelCase` for field names (JSON convention)
- Use `snake_case` for URL parameters (URL convention)
- Use strings for monetary values to avoid floating-point precision errors
- Use RFC 3339 timestamps (ISO 8601 with timezone)
- Include `createTime` and `updateTime` on all mutable resources
- Use enums in SCREAMING_SNAKE_CASE for status fields

### Step 5: Design Your Error Responses

Consistent error responses are as important as consistent success responses:

```json
{
  "error": {
    "code": 400,
    "status": "INVALID_ARGUMENT",
    "message": "The order quantity must be between 1 and 100.",
    "details": [
      {
        "type": "FieldViolation",
        "field": "items[0].quantity",
        "description": "Quantity 150 exceeds maximum of 100."
      }
    ]
  }
}
```

Use HTTP status codes correctly:
- `200` — Success
- `201` — Created (include `Location` header pointing to new resource)
- `204` — No content (for DELETE and some custom methods)
- `400` — Bad request (client error, invalid input)
- `401` — Unauthorized (not authenticated)
- `403` — Forbidden (authenticated but not authorized)
- `404` — Not found
- `409` — Conflict (resource already exists, concurrent modification)
- `422` — Unprocessable entity (validation errors on valid JSON)
- `429` — Too many requests (rate limiting)
- `500` — Internal server error

## When to Use / When NOT to Use

**Use resource-oriented design when:**

- You are building a public-facing API that external developers will integrate with
- Multiple teams or clients will consume the API
- The domain is naturally entity-centric (users, products, orders, accounts)
- You need cacheability, since GET requests on resources are cacheable
- The API needs to evolve over time while maintaining backward compatibility
- You want the API to be self-documenting and explorable

**Do NOT use resource-oriented design when:**

- The domain is fundamentally action-oriented with no persistent state. A transcription service, an encryption endpoint, a currency converter — these are computations, not resource management. RPC or simple POST endpoints are cleaner.
- You need extreme performance and the HTTP overhead matters. Internal microservice-to-microservice communication often uses gRPC or message queues instead.
- Real-time bidirectional communication is the primary use case. WebSockets or gRPC streaming are better fits than REST.
- The API is purely internal with a single client. If a React frontend is the only consumer, tighter coupling is acceptable and GraphQL or tRPC may be more ergonomic.
- The operation involves streaming large datasets. HTTP streaming or chunked transfer encoding can work, but streaming APIs have different design considerations.

## Common Mistakes

**Mistake 1: Verbs in resource names**

```
# Wrong
GET /getUser
POST /createOrder
DELETE /removeProduct

# Right
GET /users/{userId}
POST /orders
DELETE /products/{productId}
```

**Mistake 2: Overusing PUT instead of PATCH**

PUT requires the complete resource representation. Clients must first GET the resource, modify it in memory, then PUT the entire thing back. This creates race conditions and wastes bandwidth. PATCH updates only specified fields.

```
# Wrong: Client must know all fields to update one
PUT /users/123
{ "name": "Alice", "email": "new@example.com", "address": "...", "phone": "..." }

# Right: Send only what changes
PATCH /users/123
{ "email": "new@example.com" }
```

**Mistake 3: Status as a verb disguised as a state change**

Updating `status` to trigger state transitions conflates resource representation with operations. State transitions have preconditions, side effects, and business rules. Model them as custom methods.

```
# Wrong: Magic status updates with hidden side effects
PATCH /orders/123
{ "status": "CANCELLED" }  // triggers refund, inventory update, email...

# Right: Explicit operation with clear semantics
POST /orders/123:cancel
{ "reason": "Customer requested", "refundMethod": "ORIGINAL_PAYMENT" }
```

**Mistake 4: Deeply nested resource hierarchies**

Nesting beyond three levels creates URLs that are unwieldy and hard to cache. If you need `/organizations/{orgId}/departments/{deptId}/teams/{teamId}/members/{memberId}/tasks/{taskId}`, reconsider your resource model. Tasks may be better as a top-level resource with filter parameters.

**Mistake 5: Inconsistent naming**

Mixed conventions within the same API create confusion:
```
# Inconsistent — don't do this
GET /users/123        # singular
GET /products         # plural collection
POST /create_order    # underscore + verb
DELETE /remove-user   # hyphen + verb
```

Pick a convention and apply it everywhere. Google uses `camelCase` for field names and `kebab-case` for URL segments. Microsoft uses `camelCase` for both. Stripe uses `snake_case` for everything. The choice matters less than consistency.

**Mistake 6: Ignoring Hyrum's Law**

Hyrum's Law states: "With a sufficient number of users of an API, it does not matter what you promise in the contract — all observable behaviors of your system will be depended on by somebody." This means the response body order, undocumented fields, error message strings, and timing behaviors will all become dependencies once enough clients consume your API. Design deliberately from the start, because everything you expose becomes load-bearing.

## Connections

Resource-oriented design connects to several other architectural patterns:

**API Versioning** (Article 03): Resource hierarchies make versioning cleaner. Versioning at the root (`/v1/resources`) is common. Google AIPs recommend versioning at the service root, not on individual resources, so `/v2/users` implies all resources in the v2 API changed, not just users.

**Pagination** (Article 04): Collections require pagination. Resource-oriented collection endpoints (`GET /resources`) are where cursor-based pagination lives. The collection endpoint's response envelope needs consistent pagination fields.

**Idempotency** (Article 05): Standard methods have defined idempotency semantics. GET, PUT, and DELETE are idempotent. POST is not. Custom methods default to non-idempotent but can be made idempotent with idempotency keys.

**API Gateway** (Article 07): API Gateways implement resource-level policies — rate limiting per resource, caching for GET resources, authentication enforcement. Resource-oriented design makes these policies expressible at a meaningful level of granularity.

**Consumer-Driven Contracts** (Article 06): Contract testing tools like Pact operate at the resource and method level. Resource-oriented APIs map naturally to contract expectations: "when I GET /orders/123, I expect these fields."

## Key Insights

Resource-oriented design is a discipline, not a checkbox. The difference between an API that developers love and one they dread is rarely the technology stack — it is whether the API reflects a coherent, navigable model of the domain or an ad-hoc collection of endpoints that reflects the implementation details of the server.

The five standard methods — List, Get, Create, Update, Delete — cover roughly 80% of API operations. Custom methods handle the remaining 20%. When you find yourself creating many custom methods, it is often a signal that you have not yet found the right resource model. A billing system that needs `startSubscription`, `pauseSubscription`, `resumeSubscription`, `cancelSubscription`, and `updateSubscriptionPlan` might actually have a `Subscription` resource with a `status` field and clean state transitions, plus a `SubscriptionPlan` sub-resource.

The Richardson Maturity Model's Level 2 is the pragmatic target. Full HATEOAS is theoretically elegant but practically costly. The value of Level 3 is in forcing you to think about the state machine of your resources — what operations are available in what states — even if you do not implement hypermedia links in every response.

Finally, resource-oriented design is not a constraint on expressiveness — it is a vocabulary. Shared vocabulary between API producers and consumers reduces the cognitive cost of integration. When a developer sees `GET /v1/projects/{project}/topics`, they know how to subscribe, how to publish, and how to delete, before reading a single line of documentation. That recognition — the moment a developer realizes an unfamiliar API "works like the others" — is the highest achievement of consistent API design.
