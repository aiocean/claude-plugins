# API Gateway Patterns

> "An API gateway is not just a reverse proxy. It is the surface area of your entire backend — the place where cross-cutting concerns crystallize." — Sam Newman

## The Problem

A mobile application calls a product detail page. To render that page, it needs data from five services: product catalog, pricing, inventory, user reviews, and personalized recommendations. Without an API gateway, the mobile client makes five separate HTTP requests to five different service endpoints, each with its own URL, authentication scheme, and error format. The mobile app is coupled directly to the internal service topology. When you split the recommendations service into two, the app requires an update. When you add rate limiting, you must add it to all five services. When a client makes 300 requests per second during a flash sale, every service must implement its own throttling. Cross-cutting concerns — authentication, rate limiting, caching, logging, tracing, response transformation — are duplicated across dozens of services.

The API gateway pattern centralizes the entry point to a system. All external traffic flows through a single (or small set of) gateways. The gateway handles cross-cutting concerns once, uniformly, regardless of which backend service is called. Backend services are hidden behind the gateway — clients never address them directly. The gateway routes requests, aggregates responses, transforms protocols, enforces policies, and provides a single point of observability.

This is not a new idea. The mainframe era called it a message broker. The SOA era called it an ESB (Enterprise Service Bus). The microservices era calls it an API gateway. The function is the same: mediate between external clients and internal services. The difference from an ESB is scope and ambition: a gateway is deliberately narrow, focused on HTTP routing and policy enforcement, not business logic orchestration.

## Core Concept

An API gateway sits between clients (mobile apps, web frontends, third-party integrations) and backend services. At minimum, it performs:

**Routing**: Map incoming requests to upstream services. `GET /api/products/{id}` routes to the catalog service. `POST /api/orders` routes to the order service. Routing can be based on path, method, headers, or request content.

**Authentication and Authorization**: Verify identity (who is the caller?) and authorization (are they permitted to do this?). The gateway validates tokens (JWT, API keys, OAuth) and rejects unauthorized requests before they reach backend services. Backend services can trust that requests reaching them are authenticated.

**Rate Limiting**: Control how many requests a client can make in a time window. This protects backend services from overload, prevents abuse, and enforces tiered usage plans. Rate limiting at the gateway is far more efficient than at individual services.

**Load Balancing**: Distribute requests across multiple instances of a service. The gateway knows about all service instances and applies balancing algorithms (round-robin, least connections, consistent hashing).

**SSL Termination**: Handle TLS at the gateway. Backend services operate over plain HTTP internally, reducing CPU overhead on every service and simplifying certificate management.

**Observability**: Log every request, emit metrics (latency, error rates, throughput by endpoint), and inject trace context headers. Centralized at the gateway, this is "observability for free" — you get full visibility without instrumentation in every backend service.

**Response Transformation**: Modify responses from backend services before returning to clients. Add CORS headers, rewrite response bodies, aggregate errors into a standard format.

Beyond these fundamentals, gateways enable advanced patterns:

**Request Aggregation / Backend for Frontend (BFF)**: The gateway calls multiple backend services and aggregates results into a single response for the client. The mobile product page example: the gateway calls catalog, pricing, inventory, reviews, and recommendations, then returns a unified response. The client makes one call; the gateway makes five.

**Protocol Translation**: Accept REST from external clients, route to gRPC backends. The gateway handles the REST-to-gRPC transcoding transparently.

**Canary Releases**: Route 5% of traffic to the new service version, 95% to the old. Traffic splitting at the gateway is simpler than at the service level.

**Circuit Breaking**: The gateway tracks upstream service health. If a service is consistently failing, the gateway short-circuits requests to it, returning cached responses or errors, rather than waiting for timeouts.

### Gateway vs. Service Mesh

The distinction is often confused:

| | API Gateway | Service Mesh |
|---|---|---|
| Traffic direction | North-South (external → internal) | East-West (service → service) |
| Concerns | Authentication, rate limiting, routing | mTLS, observability, retry, circuit breaking |
| Layer | Application (L7) | Network/Application (L4/L7) |
| Examples | Kong, AWS API Gateway, NGINX | Istio, Linkerd, Cilium |
| Operated by | Platform / API team | Platform / SRE team |

Gateways and service meshes are complementary, not alternatives. The gateway handles external traffic; the mesh handles internal traffic. Both are L7 proxies, but they solve different problems. You can have both (common in mature microservices deployments), either, or neither (common in early-stage monoliths).

## Deep Dive

Sam Newman's characterization of the API gateway as "the surface area of your entire backend" identifies the fundamental reason why gateway design decisions have outsized impact. Every external request to the system passes through the gateway, making it simultaneously the most critical component for reliability and the most dangerous place to put complex business logic. The recurring anti-pattern Newman identified — "the smart gateway, dumb services" failure mode — occurs when teams gradually migrate business logic into the gateway because it is a convenient centralization point. Request routing becomes request transformation becomes domain logic becomes a new monolith, but one that is implemented in gateway configuration rather than application code and is therefore harder to test, version, and reason about. Newman's prescription is deliberate and explicit: gateways should be "dumb pipes" — they should route, authenticate, rate-limit, and transform protocol, but they should contain no business logic. Business logic belongs in services.

The Backend for Frontend (BFF) pattern, described by Sam Newman in 2015 and since widely adopted, resolves a tension that generic gateways create for teams with diverse client types. A mobile application and a web application often need different response shapes from the same underlying services: the mobile app needs a compact response optimized for bandwidth and battery, the web app needs a richer response with more detail for a larger screen. A generic gateway can aggregate responses from multiple services, but it cannot easily serve both formats efficiently. The BFF pattern creates purpose-specific gateway layers: one BFF for mobile clients, one for web clients, one for third-party integrations. Each BFF is responsible for aggregating and shaping responses for its specific client type. The BFFs share common backend services. This decomposition gives each client type its own optimized API without forcing the backend services to accommodate every client's specific needs.

The circuit breaker pattern at the gateway level — distinct from circuit breaking within individual services — addresses a specific failure mode in service-oriented architectures: when a backend service becomes slow or unavailable, requests pile up at the gateway waiting for responses that will eventually timeout. These in-flight requests consume gateway memory and connections. If the backend service is severely degraded, the gateway can accumulate enough in-flight requests to exhaust its own resources, causing the gateway itself to fail and taking down every service behind it. Gateway-level circuit breaking detects when a backend service is failing and short-circuits requests to it immediately, returning cached responses or error responses without waiting for timeouts. This protects the gateway from cascading failure and gives the backend service time to recover without being hammered by continued traffic during recovery.

The Google API Design Guide addresses gateway concerns through its treatment of service configuration — the mechanism by which cross-cutting policies (authentication, rate limiting, quota enforcement, logging) are defined separately from service implementation. Google's approach is to express these policies in a service configuration file that is applied by the infrastructure layer (effectively the gateway layer) without requiring each service to implement them. The service implementation handles business logic; the service configuration handles cross-cutting concerns. This clean separation is harder to achieve in practice than it sounds, because some cross-cutting concerns require service-specific configuration (different rate limits for different endpoints, different authentication requirements for public vs. internal endpoints), but the principle of separating policy definition from service implementation is sound and worth pursuing.

The distinction between an API gateway and a service mesh — frequently confused — matters for understanding what each tool is responsible for. A gateway handles north-south traffic: requests from external clients entering the system boundary. A mesh handles east-west traffic: requests between services within the system boundary. The concerns are different: a gateway is primarily concerned with authentication (who is this external caller?), rate limiting (how many requests should this caller be allowed?), and routing (which service handles this request?). A mesh is primarily concerned with reliability (retry, circuit break, timeout), security (mutual TLS between services), and observability (distributed tracing across service calls). Both are reverse proxies, both operate at Layer 7, but they address different problems and should be operated independently. Many mature microservices deployments use both: an API gateway for external traffic and a service mesh for internal traffic.

## Implementation Guide

### Choosing a Gateway

| Gateway | Best For | Avoid If |
|---|---|---|
| AWS API Gateway | AWS-native, serverless, Lambda integration | High volume (cost), need custom plugins |
| Kong | Plugin ecosystem, on-prem/multi-cloud, declarative config | Lua expertise gap, enterprise support needs |
| Envoy | Service mesh integration, high performance, Kubernetes | Configuration complexity, YAML verbosity |
| Nginx + OpenResty | Maximum performance, Lua expertise on team | Configuration complexity, no built-in API management |
| Azure APIM | Enterprise API programs, Azure ecosystem, developer portal | Cost, operational overhead for small teams |
| Traefik | Kubernetes-native, automatic discovery, simple setup | Advanced traffic management, complex routing rules |

### Implementing the BFF Pattern

The Backend for Frontend (BFF) pattern creates a dedicated gateway layer for each client type. Rather than one general-purpose gateway, you have:
- A mobile BFF (optimized for mobile constraints: reduced payload, batched requests)
- A web BFF (optimized for web frontend patterns)
- A partner API gateway (optimized for third-party integrations)

```
Mobile App    → Mobile BFF Gateway  → Services
Web App       → Web BFF Gateway     → Services
Partner APIs  → Partner Gateway     → Services
```

Each BFF is owned by the team responsible for the corresponding client. The mobile team owns the Mobile BFF, which means they control the API contract, the aggregation logic, and the response format. Backend services remain generic; BFF adapts them for each client.

```javascript
// mobile-bff/routes/product-detail.js
// Aggregates 5 backend calls into 1 mobile-optimized response
router.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  
  const [product, pricing, inventory, reviews, recommendations] = await Promise.all([
    catalogService.getProduct(productId),
    pricingService.getPrice(productId, req.user.tier),
    inventoryService.getAvailability(productId),
    reviewService.getTopReviews(productId, { limit: 3 }),
    recommendationService.getSimilar(productId, req.user.id, { limit: 5 }),
  ]);
  
  // Return mobile-optimized payload (smaller than desktop, no rich HTML)
  res.json({
    id: product.id,
    name: product.name,
    price: pricing.displayPrice,
    inStock: inventory.available,
    rating: reviews.averageRating,
    reviewCount: reviews.total,
    topReview: reviews.items[0]?.summary,
    similarProducts: recommendations.items.map(r => ({
      id: r.id,
      name: r.name,
      imageUrl: r.thumbnailUrl,  // Mobile uses thumbnail, not full image
    })),
  });
});
```

### Rate Limiting Design

Rate limiting at the gateway requires decisions on:
- **Dimension**: Per IP, per API key, per user, per endpoint, per plan tier
- **Algorithm**: Fixed window, sliding window, token bucket, leaky bucket
- **Response**: 429 Too Many Requests with `Retry-After` header
- **Limit tiers**: Different limits for free, paid, enterprise plans

```yaml
# Kong rate limiting by subscription tier
plugins:
  - name: rate-limiting-advanced
    config:
      identifier: consumer
      limit: ["100", "1000", "10000"]    # free, paid, enterprise
      window_size: [60, 60, 60]           # per minute
      sync_rate: 10                       # sync to Redis every 10 requests
      strategy: redis
      redis:
        host: redis
        port: 6379
```

Always include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers in responses so clients can self-throttle:

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1704067260
```

## When to Use / When NOT to Use

**Use an API gateway when:**
- Multiple client types (mobile, web, partners) need different API surfaces
- You have 5+ backend services that external clients need to call
- Cross-cutting concerns (auth, rate limiting, logging) are duplicated across services
- You need API versioning, canary releases, or A/B traffic splitting at the infrastructure level
- You are building a public API program with developer portals, usage plans, and API keys

**Skip an API gateway (or delay adding one) when:**
- You have a monolith or a small number of services — a gateway adds complexity without value
- All clients are internal (mobile app and backend are the same team, same organization)
- You already have a service mesh handling all your cross-cutting concerns
- The operational overhead of running a gateway exceeds the benefit

## Common Mistakes

**Mistake 1: Gateway bloat — putting business logic in the gateway**

Gateways should handle infrastructure concerns, not business logic. If your gateway is transforming payment amounts, validating business rules, or making decisions based on application data, you have moved the application into the gateway. This creates a maintenance nightmare: logic that should be tested, versioned, and deployed like application code is buried in gateway configuration.

**Mistake 2: Authentication without authorization**

Validating a JWT at the gateway proves identity but not permission. A valid token for a free-tier user should not grant access to enterprise endpoints. Authorization logic — checking user roles, subscription tiers, resource ownership — belongs either in the gateway (for coarse-grained checks based on claims in the JWT) or in the backend service (for fine-grained business permission checks). Most teams use both: the gateway enforces tier-level access control; services enforce resource-level authorization.

**Mistake 3: Single gateway as a single point of failure**

Run gateways in a redundant, load-balanced configuration. Gateway processes fail, certificates expire, and configuration changes introduce bugs. A single gateway instance failing should not take down your entire API surface. Deploy at least two gateway instances behind a load balancer.

**Mistake 4: Not logging request bodies for debugging**

Logging request headers and paths is easy. Logging request bodies is sensitive (may contain PII or credentials) but essential for debugging. Implement structured logging with field masking for sensitive fields, and ensure log retention is sufficient to debug incidents that are discovered days after they occur.

**Mistake 5: Ignoring gateway latency overhead**

Every gateway hop adds latency. NGINX with Kong adds 1-5ms in the best case; AWS API Gateway adds 5-15ms. For latency-sensitive APIs, this matters. Measure gateway overhead in your specific environment and compare it against the value the gateway provides. If the gateway is adding 20ms to a 10ms backend call, that may not be acceptable.

## Connections

**Service Mesh** (Article 08): Gateways handle north-south traffic; meshes handle east-west. In a mature deployment, both coexist: the gateway is the public face, the mesh governs internal communication.

**gRPC and Protobuf** (Article 02): Gateways like Envoy and Kong support gRPC natively, including REST-to-gRPC transcoding. This enables the ideal architecture: REST externally for developer ergonomics, gRPC internally for performance.

**API Versioning** (Article 03): Gateways implement version routing — `/v1/` routes to one set of backends, `/v2/` routes to another. Canary releases for API versions are a gateway concern, not a service concern.

**Async API Patterns** (Article 09): Gateways can handle WebSocket upgrades and SSE connections. Cloudflare Workers and edge gateways enable server-sent events at massive scale by keeping persistent connections at the edge rather than at the origin.

## Key Insights

The API gateway is infrastructure, not product. The best gateway is the one your platform team can operate reliably and your development teams can configure without becoming gateway experts. An impressive gateway with poor operational practices is worse than a simple NGINX reverse proxy with solid monitoring and clear runbooks.

The BFF pattern is underused. Teams building generic gateway configurations that serve mobile, web, and partner clients simultaneously end up with over-complex configurations that serve all three poorly. Creating dedicated BFF layers for each client type — owned by the client teams — distributes the complexity and puts control in the hands of the people who best understand each client's needs.

Gateway configuration is code. Treat it as such: version control all configuration, code review all changes, run integration tests that verify routing and policy behavior, and deploy configuration changes through the same CI/CD pipeline as application code. Configuration drift — where the gateway configuration in production differs from what is in version control — is as dangerous as code drift.

Finally, resist the temptation to use the gateway as the solution to every cross-cutting problem. Authentication, rate limiting, and routing belong in the gateway. Business logic, complex transformations, and workflow orchestration do not. The gateway is a precision tool; using it as a general-purpose integration bus recreates the ESB anti-pattern in new clothing.
