# API Versioning Strategies

> "Your API is a promise. Versioning is how you keep that promise while still being able to change." — Unknown, widely attributed in API design circles

## The Problem

Every API will change. Business requirements evolve, security vulnerabilities demand fixes, better designs emerge as usage patterns become clear. The question is not whether your API will change — it is whether those changes will break the clients that depend on it.

Breaking an API is easy. Rename a field. Change a field's type. Remove an endpoint. Add a required parameter. Make a previously optional field required. Modify the semantics of a status code. Any of these changes, without warning or migration path, silently breaks client applications. In a consumer API powering mobile apps, third-party integrations, and partner systems, a breaking change can knock out hundreds of applications simultaneously. The Fitbit API v1 deprecation in 2017 broke thousands of third-party apps overnight. Twitter's API v1.0 retirement created a graveyard of popular clients. The pattern is consistent: when breaking changes are sudden, developers get burned, trust erodes, and integration work is abandoned.

The difficulty is that preventing all breaking changes forever is impossible. Backwards compatibility constraints eventually become architectural ceilings that prevent any meaningful improvement. The AWS S3 API, backward compatible since 2006, carries substantial legacy complexity that costs every client author who reads the documentation. The goal is not to never break clients — it is to break them intentionally, with sufficient notice, clear migration paths, and a versioning strategy that gives them time to adapt.

Versioning is the mechanism. But versioning strategies vary dramatically in their cost, flexibility, and developer experience. Choosing the wrong strategy creates as many problems as it solves.

## Core Concept

A breaking change is any change that causes a correctly implemented client to stop functioning. Non-breaking changes are additive changes that do not affect existing clients.

**Breaking changes include:**
- Removing or renaming a field, parameter, or endpoint
- Changing a field's type (string → integer, optional → required)
- Changing HTTP method (GET → POST)
- Changing HTTP status codes returned by an endpoint
- Modifying authentication or authorization requirements
- Changing pagination behavior or response envelope structure
- Adding required request parameters

**Non-breaking (additive) changes:**
- Adding a new endpoint
- Adding new optional fields to a response
- Adding new optional parameters to a request
- Adding new enum values (with care — see Hyrum's Law)
- Adding new error codes
- Relaxing validation constraints (making a required field optional)

### The Three Versioning Approaches

**1. URL Path Versioning**: The version is embedded in the URL path.

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

This is the most common approach and for good reason: it is explicit, debuggable, cacheable, and tooling-friendly. Every HTTP proxy, load balancer, and CDN can route based on URL path. Log analysis is trivial. Links are bookmarkable and shareable. The version is visible without inspecting headers.

The downside is URL pollution: technically, the same logical resource has different URLs at different versions. Purists argue this violates REST's resource-oriented model. In practice, the operational benefits outweigh this theoretical concern for most teams.

**2. Header Versioning**: The version is specified in a request header.

```
GET /users HTTP/1.1
Host: api.example.com
API-Version: 2024-01-15
```

This keeps URLs clean and is considered "more RESTful" by some. Microsoft's Azure Resource Manager API uses header versioning. The `api-version` query parameter is common in Azure APIs (`?api-version=2023-11-01`).

The operational cost is significant: caching requires `Vary: API-Version` headers; load balancers cannot route by version without reading headers; debugging with curl requires extra flags; logs do not show the version without custom parsing.

**3. Accept Header Versioning (Content Negotiation)**: The version is embedded in the `Accept` header using content type versioning.

```
GET /users HTTP/1.1
Accept: application/vnd.example.v2+json
```

This is the most REST-pure approach — technically correct content negotiation. In practice, it is the least ergonomic. Almost no developer correctly formats versioned Accept headers from memory. Tooling support is inconsistent. This approach is rarely seen outside academic examples and certain hypermedia APIs.

### Stripe's Date-Based Versioning

Stripe has the most sophisticated versioning strategy in production. Rather than incrementing version numbers (v1, v2, v3), Stripe versions by date:

```
Stripe-Version: 2024-04-10
```

Each Stripe account has a default API version set at the time of API key creation. When Stripe introduces a breaking change, they create a new versioned behavior toggle. Clients that do not specify a version get the behavior from their account creation date. Clients can opt into newer behavior by specifying a newer date.

The implementation is a chain of version transforms: a request comes in for version `2022-08-01`, passes through all transforms defined between the current version and `2022-08-01`, and produces the response the client expects. New behavior is the current state; old behavior is reconstructed by applying reverse transforms.

This approach has several advantages:
- Clients are never broken by default — they always get the behavior they were built against
- Clients can upgrade incrementally, testing each version date in isolation
- The API changelog maps directly to version dates — you can read the changelog for `2024-04-10` and know exactly what changed

The implementation cost is substantial. Every breaking change requires writing a versioned transform function that translates between the new internal behavior and the expected old behavior. This is engineering investment that only makes sense at Stripe's scale and with Stripe's commitment to developer experience.

## Deep Dive

Hyrum's Law — "with a sufficient number of users of an API, it does not matter what you promise in the contract; all observable behaviors of your system will be depended on by somebody" — is the theoretical foundation for why API versioning is hard. The law, articulated by Google's Hyrum Wright from observations at Google scale, states that the set of breaking changes is not just the changes documented in your API contract but every observable behavior that clients have discovered and relied upon. The order of fields in a JSON response, the specific wording of error messages, the latency of particular endpoints, the cardinality of results in edge cases — all of these become load-bearing for some client once the API has enough users. Google's internal experience, documented in the Google API Design Guide and various engineering blog posts, is that even changes they considered purely additive or innocuous broke clients who had taken undocumented dependencies.

This insight has a practical implication for versioning strategy: the best versioning strategy is to minimize the need for breaking changes by designing the initial API carefully. Google's AIP-180 (Backwards Compatibility) categorizes changes explicitly — "safe changes," "changes that require care," and "breaking changes" — to help API designers understand the impact of each choice before making it. The list of breaking changes is longer than most developers expect: removing an enum value is breaking (clients may fail to parse responses containing the removed value), making a previously ignored field required is breaking, changing the semantics of an existing status code is breaking. Designing with this full list in mind from the start reduces the frequency at which major version bumps are needed.

The Stripe versioning philosophy — date-based versions with per-account pinning — is one of the most studied approaches to managing API evolution at scale. Stripe introduced a new API version whenever they needed to make a breaking change. Each Stripe account is pinned to a specific API version. Existing integrations continue to receive responses in the version they were built against. When a developer explicitly opts into a new version, they get the updated behavior. Stripe runs compatibility shims for every version still in use: a request to `POST /v1/charges` with an account pinned to the 2019-09-09 version receives a response shaped to that version's contract, even though the underlying implementation has changed. The operational cost of maintaining these shims across multiple active versions is substantial, but Stripe made the judgment that backward compatibility is a product feature worth paying for — it is a large part of why Stripe integrations are known for stability.

The Google AIP approach to versioning takes a different trade-off. Rather than per-account pinning, Google uses major URL versioning (`v1`, `v2`) with explicit long-term stability guarantees for stable versions. A `v1` API is supported for a minimum of 12 months after a `v2` is published. All breaking changes require a major version increment. Non-breaking (additive) changes can be made to a `v1` API without incrementing the version — adding new fields, new optional parameters, new enum values (with appropriate forward-compatibility handling). The discipline of distinguishing breaking from non-breaking changes is encoded in the AIP review process: every proposed API change is classified before it is implemented. This up-front classification creates a forcing function for careful API design.

The Microsoft REST API Guidelines address a versioning scenario that Google and Stripe do not cover in depth: APIs that must support gradual migration without a flag day. Microsoft's approach — versioning individual resource types within a single API surface rather than versioning the entire API — allows different parts of the API to evolve at different rates. The Azure Resource Manager API uses date-based version parameters per resource type: `api-version=2023-07-01` for Compute resources may be a different date from `api-version=2023-11-01` for Storage resources, because the resource types evolve independently. This granularity reduces the pressure to synchronize breaking changes across unrelated parts of the API, which at Microsoft's scale (hundreds of Azure resource types) would be logistically impossible.

## Implementation Guide

### Choosing a Strategy

For most teams building APIs, the decision matrix is straightforward:

| Scenario | Recommended Approach |
|---|---|
| Public API, many integrators | URL path versioning (/v1/, /v2/) |
| Internal microservices | gRPC + protobuf (versioning via field addition) |
| Azure-style cloud APIs | Query parameter versioning (?api-version=...) |
| Developer-experience-first (Stripe-like) | Date-based header versioning |
| Simple internal API | No versioning, additive-only changes |

### Implementing URL Path Versioning

```go
// Go with chi router
r := chi.NewRouter()

// Mount versioned routes
r.Mount("/v1", v1Router())
r.Mount("/v2", v2Router())

// Version routing middleware
func versionRouter() http.Handler {
    r := chi.NewRouter()
    r.Get("/users", listUsersV1)
    r.Get("/users/{id}", getUserV1)
    return r
}

// Redirect unversioned paths to latest stable version
r.Get("/users*", func(w http.ResponseWriter, r *http.Request) {
    http.Redirect(w, r, "/v2"+r.URL.Path, http.StatusMovedPermanently)
})
```

### Implementing an Additive-Only Change Policy

The safest versioning strategy is to never break clients — enforce additive-only changes through code review and automated checks:

```yaml
# buf.yaml — enforces no breaking changes in proto files
version: v1
breaking:
  use:
    - FILE
  ignore_unstable_packages: true
```

```bash
# Check for breaking changes against the main branch
buf breaking --against '.git#branch=main'

# Output on breaking change:
# FIELD_SAME_TYPE: Field "user_id" with tag 2 on message "Order"
# changed type from "string" to "int64".
```

For REST APIs, use OpenAPI diff tools:

```bash
# openapi-diff detects breaking changes
openapi-diff old-spec.yaml new-spec.yaml --fail-on-incompatible
```

### Expand-Contract Pattern for Migrations

When you must make a breaking change, use the expand-contract pattern:

**Phase 1 — Expand**: Add the new field/behavior alongside the old one.
```json
// v1 response with both old and new field
{
  "userId": "123",           // old field — keep for backward compat
  "user_id": "usr_123"       // new field — clients can start using this
}
```

**Phase 2 — Migrate**: Communicate the change. Monitor adoption. Wait for clients to migrate to the new field.

**Phase 3 — Contract**: Remove the old field. This is now a planned breaking change with full client notification.

### Sunset Headers

RFC 8594 defines the `Sunset` header for communicating deprecation:

```
HTTP/1.1 200 OK
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Deprecation: Mon, 01 Jan 2024 00:00:00 GMT
Link: <https://docs.example.com/api/v2-migration>; rel="successor-version"
```

Include these headers in all responses from deprecated endpoints. Build monitoring that alerts when production traffic is still hitting deprecated endpoints near the sunset date.

## When to Use / When NOT to Use

**URL versioning is appropriate when:**
- You have external developers who cannot control headers they send
- You use CDNs that cache API responses (CDNs route on URL, not headers)
- You need clean routing in load balancers and API gateways
- Your API has a predictable, infrequent major version cadence

**Date-based versioning is appropriate when:**
- Developer experience is a primary product concern (you are an API-as-a-product company)
- You have the engineering capacity to maintain version transforms
- You make frequent incremental breaking changes rather than infrequent major versions
- You want clients to upgrade incrementally rather than all-at-once

**Avoid versioning entirely when:**
- The API is internal with a single, owned client (a monorepo frontend + backend)
- You can coordinate changes across all consumers in a single deployment
- The API is experimental and consumers accept breaking changes

## Common Mistakes

**Mistake 1: Starting at v1 and never incrementing**

Teams release `v1`, accumulate breaking changes for years without a `v2`, then face a massive cliff migration. Incremental versioning is healthier: `v2` can be a modest improvement over `v1`, not a full rewrite.

**Mistake 2: Maintaining too many versions simultaneously**

Each active version is a maintenance burden: bugs must be fixed in all versions, security patches must be backported, documentation must cover all versions. Two active versions (current + one previous) is the sustainable maximum for most teams. More than two is a sign that the sunset policy is not being enforced.

**Mistake 3: Violating Hyrum's Law by only versioning intentional changes**

Hyrum's Law: "With a sufficient number of users, all observable behaviors of your system will be depended on by somebody." Response field ordering, error message wording, undocumented fields, timing windows — all will be depended upon. Auditing an API for all observable behaviors before making any change is the only safe approach, but it is impractical. The mitigation is a rich test suite that validates client behavior against the actual API, combined with a canary deployment strategy that exposes changes to a small percentage of traffic before full rollout.

**Mistake 4: Not communicating breaking changes proactively**

Sunset headers in HTTP responses are not sufficient. Proactive communication via email to registered developers, changelog RSS feeds, dashboard notifications, and API usage analytics dashboards (so you can see who is still using deprecated endpoints) are all necessary.

**Mistake 5: Versioning at the wrong granularity**

Versioning individual endpoints (`/v2/users` while `/v1/orders` still exists) creates an incoherent API where different resources have different versions. Version the entire API surface at once: `/v2/` covers all resources. Individual endpoint versioning is an anti-pattern.

## Connections

**Resource-Oriented Design** (Article 01): Resource hierarchies make versioning cleaner. Version at the API root, not at individual resources. Google's AIP-191 specifies that version numbers are part of the API package name, not individual resource paths.

**Consumer-Driven Contracts** (Article 06): Contract testing is the automated enforcement mechanism for "no breaking changes." A Pact contract test that passes on every CI run is a stronger guarantee than code review alone.

**Hyrum's Law in API Design** (Article 10): Hyrum's Law is the reason versioning exists. No matter how careful your API design, observable behaviors become dependencies. Versioning acknowledges this reality and provides a structured way to evolve past it.

**API Gateway** (Article 07): API Gateways can route traffic based on API version in URLs or headers, making version-based routing an operational concern separate from service implementation. The gateway can route `/v1/users` to the v1 service and `/v2/users` to the v2 service without either service needing to know about the other's existence.

## Key Insights

The best versioning strategy is the one your team will actually maintain. A perfectly designed date-based versioning scheme that your team cannot operationalize is worse than simple URL versioning with clear sunset policies. Choose the approach that matches your team's operational capabilities and your users' sophistication.

Breaking changes are not failures of design — they are the cost of learning. Every API that has been in production for years carries the scars of decisions made before the domain was fully understood. Versioning is the mechanism for paying those debts responsibly, without punishing the clients who trusted you enough to build on your API.

The single most important thing you can do for API versioning health is to instrument usage. Know exactly which clients are calling which version of which endpoint. Without that data, sunset decisions are guesses. With it, you can contact the two teams still using `/v1/orders` three months before sunset and help them migrate, instead of breaking them in production.

Additive-only changes should be your first reflex. Before creating a new API version, ask: can this change be made backward-compatibly? New optional fields, new optional parameters, new endpoints — these are free. They cost nothing in versioning overhead and nothing in client migration effort. New API versions should be reserved for genuinely incompatible changes that cannot be expressed additively.
