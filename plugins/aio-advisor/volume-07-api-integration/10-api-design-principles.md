# Google, Microsoft, and Stripe API Design Principles

> "A great API is not just correct. It is obvious. The developer should be able to guess the right call before reading the documentation." — Unknown, paraphrased from Stripe's API design philosophy

## The Problem

API design is where architecture meets developer experience. A technically correct API that is difficult to use will be used incorrectly. An easy-to-use API that is inconsistent will be used inconsistently. An inconsistent API that is incomplete will require workarounds. The cumulative effect of poor API design decisions compounds across every integration, every client library, every tutorial, and every support ticket.

The cost is not abstract. Stripe estimates that a developer's first successful payment integration takes 30 minutes on their platform. Before Stripe, the equivalent integration with traditional payment processors took 1-2 weeks. That 30-minute vs 2-week difference is largely a product of API design: clear naming, obvious semantics, sensible defaults, comprehensive error messages, and documentation that shows real code rather than abstract schemas. Stripe grew from zero to the dominant developer payment platform in a decade, and the quality of their API is a first-order reason.

Google handles over 5 billion API calls per day to their Cloud APIs. Microsoft's Graph API serves the entire Office 365 ecosystem. Both have learned, through scale and through painful experience, what makes APIs maintainable, evolvable, and developer-friendly at scale. They have codified those learnings into formal guidelines — Google's API Improvement Proposals (AIPs) and Microsoft's REST API Guidelines — that are publicly available and represent decades of accumulated knowledge.

This article synthesizes the core principles from these three organizations. Not every principle applies to every team — a startup building their first API has different constraints than Google Cloud — but understanding why these principles exist enables you to apply them appropriately to your context.

## Core Concept

### Google API Improvement Proposals (AIPs)

Google's AIPs are a set of numbered design guidelines for Google APIs. They cover resource naming, standard methods, custom methods, pagination, errors, versioning, long-running operations, and dozens of other topics. AIPs are publicly available at [aip.dev](https://aip.dev).

The AIPs exist because Google has hundreds of API teams building independently. Without common guidelines, each team makes different choices: some use `camelCase` for resource IDs, others use `snake_case`; some use `200` for success, others use `201`; some paginate with `page_token`, others with `cursor`, others with `offset`. Developers working across multiple Google APIs face a learning curve on each one. The AIPs reduce this by establishing a shared vocabulary that all Google APIs speak.

Key AIPs:
- **AIP-121**: Resource orientation — APIs should be built around resources, not actions
- **AIP-131/132/133/134/135**: Standard methods — Get, List, Create, Update, Delete semantics
- **AIP-136**: Custom methods — when and how to use them
- **AIP-148**: Field masks for partial updates
- **AIP-158**: Pagination — `page_size`, `page_token`, `next_page_token`
- **AIP-193**: Errors — error format, status codes, error details
- **AIP-211**: Authorization checks — how to handle permission errors

### Microsoft REST API Guidelines

Microsoft's REST API Guidelines (published on GitHub) are similarly comprehensive. They specify resource naming, HTTP method semantics, header conventions, pagination, error responses, versioning, and long-running operations. The guidelines are enforced across Azure, Microsoft 365, and Dynamics APIs.

Microsoft's guidelines are notable for their specificity: they do not just say "use appropriate status codes" — they enumerate which status codes to use for which scenarios. They do not just say "document your errors" — they specify the exact JSON structure of an error response (`error.code`, `error.message`, `error.target`, `error.details`, `error.innererror`).

### Stripe's Developer Experience Philosophy

Stripe does not publish a formal API design guide in the way Google and Microsoft do. Their principles are expressed in their API itself, their documentation, their developer blog, and conference talks by their founders and API team.

The core of Stripe's philosophy: **treat the API as a product**. The API is not a technical interface — it is the primary product that developers buy. Every decision about naming, structure, error messages, and documentation is a product decision that affects developer happiness and integration success. Stripe measures the time-to-first-successful-payment as a core product metric.

## Deep Dive

The fundamental insight behind treating an API as a product — Stripe's core design philosophy — is that the developer using the API is the customer, and their time and cognitive load are the resource being spent. An API that requires extensive documentation reading before a developer can make their first successful call is an API that charges a high entry tax. An API with inconsistent naming that requires memorization of special cases charges a recurring cognitive tax. An API with cryptic error messages charges a debugging tax that is paid every time something goes wrong. Stripe's argument is that these taxes are not inevitable properties of APIs — they are design choices. Investing in clear naming, consistent patterns, informative errors, and good documentation reduces these taxes, and the reduction compounds across every developer who integrates the API.

Google's AIP process reflects a different but compatible insight: at sufficient scale, inconsistency across an API surface creates a maintenance cost that compounds across teams and client library implementations. The AIPs exist not because Google found the objectively correct way to design APIs but because Google found that consistent APIs are vastly cheaper to support than inconsistent ones. When all Google Cloud APIs use `page_token`/`next_page_token` for pagination, the Go client library team implements pagination handling once and it works for every API. When all Google Cloud APIs return errors in the same JSON structure, the error handling code in every client library is the same. When all custom methods use the colon syntax, API reviewers can check compliance in seconds rather than minutes. The AIPs encode the institutional knowledge that consistency is worth the constraint, even when individual teams believe their specific case justifies deviation.

The error message design philosophy that Stripe exemplifies — and that the Google AIP guidance on errors reinforces from a different angle — is grounded in a specific claim about what error messages are for. A machine-readable error code serves monitoring systems that alert on specific error types. A human-readable error message serves the developer who receives an unexpected error while building or debugging. These two audiences have different needs: monitoring systems need stable, parseable codes; developers need actionable guidance. Stripe's error format serves both: `code: "amount_too_small"` for monitoring, `message: "Amount must be at least 50 cents. Try passing amount: 50 to create a $0.50 charge"` for developers. The Google AIP error format (derived from the Google Cloud Error Model) serves the same two audiences: `status: "INVALID_ARGUMENT"` for monitoring, `message` for developers, and an extensible `details` array for structured additional context. The Microsoft REST guidelines go further by specifying that error messages must include the `target` field identifying which input caused the error, which transforms error messages from generic failure notices into precise debugging information.

The naming consistency principles that all three organizations' guidelines emphasize — Google's AIP-122 on resource names, Microsoft's camelCase conventions, Stripe's snake_case throughout — are less important in their specific choices than in their uniformity. A developer integrating an API that uses `snake_case` for all fields will adapt to that convention within minutes. A developer integrating an API that uses `camelCase` for most fields but `snake_case` for legacy fields and `PascalCase` for enum values must maintain a mental lookup table throughout the integration. The cognitive cost of inconsistency accumulates invisibly: each inconsistency is small, but the total cognitive load of remembering dozens of inconsistencies is significant. This is the basis for the principle that the best naming convention is the one applied most consistently, not the one that is objectively most correct by some abstract standard.

The Google API Design Guide's treatment of the "API surface" as a long-lived commitment — rather than as implementation code that can be refactored — underlies many of its specific prescriptions. Fielding's dissertation noted that REST's constraints are designed to support system evolution, not just current functionality. The Google AIP treatment of breaking vs. non-breaking changes, the Microsoft REST guidelines' backward compatibility requirements, and Stripe's version pinning all reflect the same recognition: an API's public surface is a promise to an unknown population of clients whose code you do not control. Unlike application code, where you can refactor with confidence because you control all callers, an API cannot be refactored without risk. Hyrum's Law ensures that every observable behavior will have dependents. The design principles that seem most conservative when building the initial API — the ones that say "don't expose implementation details," "use opaque identifiers," "keep the interface stable even at the cost of some flexibility" — are the ones that allow the API to evolve safely over years. The implementation can change as often as needed; the contract changes only when unavoidable.

## Implementation Guide

### Building an API Review Process

Even without Google's scale, a lightweight API review process prevents the most common design mistakes:

```markdown
## API Review Checklist

### Resource Design
- [ ] Resources are nouns, not verbs
- [ ] Resource hierarchy reflects ownership (parent/child)
- [ ] Collections use consistent plural naming
- [ ] IDs are stable, URL-safe strings

### HTTP Semantics
- [ ] GET never modifies state
- [ ] POST creates resources or executes custom methods
- [ ] PATCH (not PUT) for partial updates
- [ ] DELETE returns 204 (no body) or 200 with the deleted resource
- [ ] Correct 2xx status codes (200 OK, 201 Created, 202 Accepted, 204 No Content)

### Naming Consistency
- [ ] Field names: camelCase (JSON) or snake_case (proto)
- [ ] Timestamp fields: createTime, updateTime, deleteTime
- [ ] Boolean fields: prefixed with is/has/can
- [ ] Enum values: consistent case across the API

### Error Responses
- [ ] Error format is consistent across all endpoints
- [ ] code field is machine-readable string
- [ ] message field is human-readable (not a code)
- [ ] target field identifies the specific field/parameter at fault
- [ ] HTTP status code is meaningful (400 vs 422 vs 409)

### Pagination
- [ ] All list endpoints support pagination
- [ ] Consistent pagination parameters (page_size, page_token)
- [ ] next_page_token empty/absent means last page

### Versioning
- [ ] API version is in the URL path (/v1/)
- [ ] Non-breaking changes do not increment the version
- [ ] Deprecated fields/endpoints have sunset dates
```

### Standard Error Format

Define your error format once and use it everywhere:

```typescript
// Shared error types
interface APIError {
  error: {
    code: string;           // Machine-readable: "INVALID_ARGUMENT"
    message: string;        // Human-readable: "The quantity must be between 1 and 100"
    status: number;         // HTTP status code mirror: 400
    target?: string;        // Field/parameter: "items[0].quantity"
    details?: ErrorDetail[];
    requestId: string;      // For support correlation
    docUrl?: string;        // Link to relevant documentation
  }
}

interface ErrorDetail {
  code: string;
  message: string;
  target?: string;
}

// Error codes by HTTP status
const ErrorCodes = {
  // 400 Bad Request
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // 401 Unauthorized
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // 403 Forbidden
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  
  // 409 Conflict
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  
  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // 500 Internal Server Error
  INTERNAL: 'INTERNAL',
} as const;
```

### Naming Conventions Reference

Consistent naming is the single highest-value consistency investment. Define it early and enforce it in code review:

```markdown
## Field Naming Guide

### Timestamps
- createTime — when the resource was created
- updateTime — when the resource was last modified
- deleteTime — when the resource was soft-deleted
- expireTime — when the resource expires
- startTime / endTime — for time-bounded operations
- publishTime — when content was published

### Identifiers
- name — the full resource name (Google style): "orders/ord_123"
- id — the short unique identifier: "ord_123"
- {resource}Id — reference to another resource: "userId", "orderId"
- uid — opaque unique identifier (use sparingly)

### State and Status
- state — for resources with a defined lifecycle (ACTIVE, DELETED, etc.)
- status — for operational status (RUNNING, FAILED, etc.)
- phase — Kubernetes convention for multi-stage lifecycle

### Boolean Fields
- Prefer is-prefix: isDeleted, isEnabled, isVerified
- Or has-prefix: hasChildren, hasPendingChanges
- Never: deleted, enabled (ambiguous — noun or adjective?)

### Collections
- items — generic child collection
- entries — for map-like collections
- results — for search/query results
- members — for group membership

### Quantities
- count — integer count of items
- size — byte size of content
- limit — maximum allowed value
- total — sum of values
- amount — monetary amount (with currency)
```

### Building Excellent API Documentation

Documentation is part of the API product. The minimum standard:

**1. Getting Started in under 5 minutes**: The first page of your docs should take a developer from zero to a working API call in under 5 minutes. Code in their language. Copy-pasteable. No prerequisites beyond having the language installed.

**2. Every endpoint has a request example and a response example**: Not just the schema — actual JSON with real-looking values. Developers copy examples; they skim schemas.

**3. Error codes are documented**: Every error code your API returns should have a documentation page explaining what it means, why it occurs, and how to fix it. Link to this page from the error response (`doc_url` field).

**4. Changelog is up to date**: Every API change — breaking or non-breaking — is documented with date and description. Developers who upgrade should be able to read the changelog and understand what changed.

**5. Interactive API explorer**: Let developers make real API calls from the documentation. Stripe's dashboard, Google's API Explorer, and GitHub's API explorer all reduce the friction of "let me try this" from 5 minutes to 30 seconds.

## When to Use / When NOT to Use

**Follow these guidelines strictly when:**
- Building a public API that external developers integrate with
- Building APIs consumed by multiple internal teams
- API stability matters over months or years
- You are building an API-first product where developer experience is a differentiator

**Apply selectively when:**
- Building internal APIs consumed by a single team
- Prototyping or exploring a new domain
- Performance requirements conflict with guideline recommendations (e.g., field masks add overhead for simple updates)

**Accept violations when:**
- Following the guideline would break existing clients (backward compatibility wins)
- Domain requirements genuinely conflict with general guidelines (e.g., a streaming API that cannot fit into request-response semantics)
- The team lacks the capacity to implement the full guideline (do the most valuable parts first)

## Common Mistakes

**Mistake 1: Designing APIs from the implementation, not the domain**

APIs that reflect their database schema (`users`, `user_profiles`, `user_preferences` as separate resources) force clients to understand implementation details. Design from the client's perspective: what does the client need to accomplish, and what is the simplest API that enables that? Then implement the API against whatever backing data model makes sense.

**Mistake 2: Inconsistency within a single API**

Mixed conventions are worse than uniformly wrong conventions. An API that uses `camelCase` for some fields and `snake_case` for others, `userId` in some resources and `user_id` in others, forces developers to check the documentation for every field. Pick a convention and enforce it without exceptions.

**Mistake 3: Opaque error messages**

```json
// Bad — what does "Error code 4" mean?
{ "error": 4 }

// Bad — what should the developer do?
{ "error": "Validation failed" }

// Good — actionable, specific, links to docs
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "The 'email' field must be a valid email address. Got: 'not-an-email'",
    "target": "email",
    "docUrl": "https://docs.example.com/errors/invalid-argument"
  }
}
```

**Mistake 4: Not designing for filtering and sorting on list endpoints**

Every list endpoint will eventually need filtering. Add `filter` and `order_by` parameters to list endpoints from day one — retrofitting them later is a breaking change if you need to add required parameters.

```
GET /orders?filter=status=PENDING&orderBy=createTime desc&pageSize=50
```

Use a simple expression language for filters: Google uses CEL (Common Expression Language), Microsoft uses OData `$filter`, Stripe uses an object of filter parameters. Whichever you choose, be consistent across all list endpoints.

**Mistake 5: Forgetting that APIs are forever**

The Hyrum's Law corollary: once published, every aspect of your API is depended upon. Response field order, error message wording, undocumented fields, timing behavior — all become load-bearing the moment clients build on them. Design deliberately from the start, because removing or changing anything after publication is a breaking change to some client, somewhere.

## Connections

**Resource-Oriented Design** (Article 01): The AIPs are the formalization of resource-oriented design principles for Google's API fleet. The AIP framework and the resource-oriented model are inseparable — AIPs are how Google operationalizes resource orientation at scale.

**API Versioning** (Article 03): API design guidelines determine what constitutes a breaking change. If the guidelines specify that error codes are stable identifiers (strings, not integers), then changing an error code from `400` to `INVALID_ARGUMENT` is a breaking change requiring a version increment. Guidelines make breaking change identification deterministic.

**Consumer-Driven Contracts** (Article 06): Consistent API design makes contract testing more valuable. When all APIs share the same error format, pagination pattern, and resource naming conventions, contract tests can reuse common patterns instead of specifying them per-endpoint.

**gRPC and Protobuf** (Article 02): Google's proto-first API design is the implementation of AIPs in the gRPC world. The AIP guidelines specify the proto schema conventions, the service definition conventions, and the annotation conventions for REST transcoding. Proto + AIPs = Google's API platform.

## Key Insights

The most valuable API design principle is the one you actually enforce. A perfect API design guide that sits on a wiki page and is ignored in code review is worth nothing. An imperfect but consistently enforced convention is worth everything. Start with the highest-value conventions — error format, resource naming, pagination — and add more over time as the team builds the review muscle.

Consistency over creativity. The temptation to design a clever API — one that perfectly models the domain's nuances with unique naming conventions and bespoke response structures — almost always produces an API that is harder to learn than a conventional one. Developer brains are pattern-matching engines. When an API looks like APIs they have used before, the learning curve is nearly flat. When it looks unique, every endpoint requires fresh documentation reading. Be boring. Be consistent. Be predictable.

The best APIs are the ones that developers can figure out before reading the documentation. This is not a low bar — it requires deep investment in naming, structure, and conventions. But when a developer can correctly guess `GET /orders/{orderId}/items` returns the items for an order, and `POST /orders/{orderId}/items` adds an item, and `DELETE /orders/{orderId}/items/{itemId}` removes a specific item — all before consulting documentation — you have built something valuable. That predictability is the cumulative effect of every good API design decision you made.

Stripe's 30-minute first integration is not a benchmark to copy — it is a north star to reason from. What are the steps between "I just got my API key" and "I successfully completed my first integration"? How many of those steps involve reading documentation? How many involve confusion? How many involve debugging an error message that does not tell you what went wrong? Each answer to those questions is an API design decision that either adds or removes friction. The best API teams measure time-to-first-success as a product metric and treat it with the same rigor they apply to reliability metrics. Developer experience is not soft — it is measurable, improvable, and worth optimizing.
