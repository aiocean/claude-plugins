# Gateway Routing & Offloading

> "Don't repeat yourself — and don't repeat your infrastructure concerns in every service either."

## The Problem

Imagine you have twenty microservices. Each one needs to handle SSL termination, verify JWT tokens, enforce rate limits, log requests, add correlation IDs, compress responses, handle CORS, and check IP allowlists. You could implement all of this in each service. Most teams do exactly that, at first. They copy a middleware stack from one service to the next, slightly modified each time. Six months later, service A uses library version 2.1 for JWT validation, service B uses 2.3, service C rolled their own because someone didn't find the shared library. A security vulnerability is discovered in the JWT library. You now have to patch twenty services, each with its own slightly different implementation, owned by different teams with different deployment schedules.

The cross-cutting infrastructure concerns — authentication, authorization, rate limiting, SSL, logging, tracing, CORS — do not belong in your domain services. They are not business logic. They are infrastructure. Mixing them into your services violates separation of concerns, creates inconsistency, multiplies maintenance burden, and makes it impossible to enforce policies uniformly across your fleet.

The Gateway Routing & Offloading pattern addresses this by placing a single entry point in front of all services. This gateway handles routing (directing requests to the right backend) and offloading (handling cross-cutting concerns so services don't have to). Services focus on business logic. The gateway focuses on infrastructure. Each concern lives in exactly one place.

## Core Concept

A gateway in this pattern performs two distinct functions:

**Routing** — accepting a request and forwarding it to the appropriate backend service based on rules (path, headers, hostname, method, query parameters).

**Offloading** — intercepting requests and responses to handle cross-cutting concerns before passing them through.

```
Client Request
      |
      v
+------------------+
|     GATEWAY      |
|                  |
| [SSL Termination]|
| [Auth/AuthZ]     |   <-- offloading: applies to ALL services
| [Rate Limiting]  |
| [Logging/Tracing]|
| [CORS]           |
| [Compression]    |
+------------------+
      |
   Routing
   Rules
   /   |   \
  v    v    v
SvcA SvcB SvcC    <-- pure business logic, no infrastructure concerns
```

The gateway is not the only place these concerns can live, but it is a centralized, consistent place for concerns that must apply uniformly across services.

### Routing Rules in Practice

Routing decisions are typically made on:

```
Path-based routing:
  /api/users/**     -> UserService:8080
  /api/orders/**    -> OrderService:8081
  /api/products/**  -> ProductService:8082

Host-based routing (multi-tenant):
  tenant-a.api.example.com -> TenantACluster
  tenant-b.api.example.com -> TenantBCluster

Header-based routing (canary/A-B testing):
  X-Beta-User: true -> NewServiceV2
  (default)         -> NewServiceV1

Method-based routing:
  GET /items/**     -> ReadReplicaService
  POST/PUT /items/** -> PrimaryService
```

### What to Offload

Not everything belongs at the gateway. The decision rule: offload a concern if it must apply consistently across all (or most) services and if moving it to the service level creates duplication or inconsistency.

**Definitely offload:**
- SSL/TLS termination — certificates managed in one place
- Request authentication (verify token, identify caller)
- Rate limiting by API key or IP
- Request/response logging with correlation IDs
- DDoS protection and IP blocking

**Sometimes offload (evaluate per-case):**
- Authorization (coarse-grained: is this user allowed to call this service at all) — fine-grained authorization belongs in services
- Request transformation (header injection, API versioning translation)
- Response caching for public endpoints
- Circuit breaking per upstream

**Do not offload:**
- Business logic
- Fine-grained authorization ("can user X see order Y?")
- Domain-specific validation

## Deep Dive

**The strangler fig migration use case.** Martin Fowler's Strangler Fig Application pattern, discussed in *Patterns of Enterprise Application Architecture*, uses the gateway routing layer as its central mechanism. When migrating a monolith to microservices, the gateway sits in front of both the monolith and the new services. Each feature migrated from the monolith to a new service is followed by a routing rule update: requests for the migrated feature are now directed to the new service; all other requests still go to the monolith. This incremental migration requires no client changes — the gateway absorbs the routing complexity. The monolith shrinks as features are extracted; the gateway routing table grows correspondingly. Sam Newman's *Building Microservices* endorses this approach explicitly: the gateway is the seam that makes incremental extraction possible without a risky big-bang cutover. The routing layer is not just infrastructure — it is the operational mechanism for controlled migration.

**Content-based routing and its coupling risk.** Gregor Hohpe and Bobby Woolf's *Enterprise Integration Patterns* catalog content-based routing as a core integration pattern, but they also document its risk. A content-based router that inspects message content to make routing decisions creates a coupling between the router and the message schema. When the message schema changes, the routing rules may need to change. At scale, a gateway with hundreds of content-based routing rules becomes a complex, fragile component that requires careful change management. Hohpe and Woolf's guidance: prefer routing on stable metadata (URL path, HTTP method, service identity) over routing on volatile content (request body fields, computed values). Where content-based routing is necessary, encapsulate the routing logic explicitly and test it independently. The router that inspects JSON body fields to decide which backend to call is a hidden dependency on every schema change in those fields.

**The gateway as a cross-cutting concerns platform.** The Google SRE Book's treatment of defense in depth identifies the gateway as the appropriate layer for cross-cutting security and reliability concerns: authentication, rate limiting, circuit breaking at the network edge, TLS termination, observability injection. The argument is not that these concerns cannot be implemented in each backend service individually — they can — but that implementing them in each service creates inconsistency, duplication, and the risk that any new service fails to implement them. The gateway provides a single enforcement point that applies uniformly. Nygard's *Release It!* makes the same argument for resilience: a rate limiter at the gateway prevents a misbehaving client from overwhelming any backend service, regardless of whether that service has its own rate limiting. Defense in depth means the gateway provides the first line, and services provide additional lines — but the gateway line must be present and comprehensive.

**Versioning and the routing table as API contract.** Kleppmann's *Designing Data-Intensive Applications* analysis of API versioning applies directly to gateway routing. The gateway's routing table is an implicit contract: v1 of an API routes to service A; v2 routes to service B. Clients that pin to v1 expect the gateway to continue honoring that routing indefinitely. As services are retired or replaced, the routing table becomes a long-lived dependency that must be managed with the same rigor as any public API. Newman's guidance on service versioning applies: define a deprecation policy for routing rules, communicate it to clients, and enforce it. The routing table that was created during a migration and never cleaned up becomes a liability — routes to services that no longer exist, routes with undocumented semantics, routes that bypass security policies applied to newer routes. The routing table is infrastructure code and must be maintained as such.

**The single point of failure risk.** Nygard's *Release It!* dedicates extensive analysis to the single point of failure (SPOF) risk. A gateway that sits in front of all traffic is, by definition, a potential SPOF. If the gateway fails, all clients are affected simultaneously. This changes the failure profile of the system significantly: individual service failures are bounded (one service's clients affected); gateway failures are unbounded (all clients affected). Nygard's prescriptions apply: the gateway must be deployed with redundancy (at least three instances across independent failure zones), must have health checks that detect degraded performance — not just outright failure — and must fail open for routing (pass requests through to backends) rather than fail closed (drop requests) when in a degraded state. The operational cost of the gateway pattern is proportional to the criticality of the availability requirement for the routing layer itself.

## Implementation Guide

### Step 1: Choose Your Gateway

| Option | Best For | Trade-offs |
|--------|----------|------------|
| NGINX | High performance, simple routing | Config-file based, limited dynamic routing |
| Kong | API management, plugin ecosystem | Heavier than pure proxy |
| Envoy | Service mesh integration, L7 intelligence | Complex config |
| AWS API Gateway | AWS-native workloads | Vendor lock-in, per-request pricing |
| Azure APIM | Enterprise API management | Heavy, expensive |
| Traefik | Kubernetes-native, dynamic config | Less enterprise features |
| Istio Gateway | Service mesh environments | Significant operational complexity |

### Step 2: Configure Routing Rules

In Kong (declarative config):

```yaml
services:
  - name: user-service
    url: http://user-service:8080
    routes:
      - name: user-routes
        paths: ["/api/users"]
        strip_path: false

  - name: order-service
    url: http://order-service:8081
    routes:
      - name: order-routes
        paths: ["/api/orders"]
        strip_path: false
```

In Traefik (Kubernetes IngressRoute):

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: api-routes
spec:
  entryPoints: [websecure]
  routes:
    - match: PathPrefix(`/api/users`)
      kind: Rule
      services:
        - name: user-service
          port: 8080
    - match: PathPrefix(`/api/orders`)
      kind: Rule
      services:
        - name: order-service
          port: 8081
```

### Step 3: Configure Offloading

Rate limiting in Kong:

```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 60
      hour: 1000
      policy: redis
      redis_host: redis
      redis_port: 6379
```

JWT validation in Kong:

```yaml
plugins:
  - name: jwt
    config:
      secret_is_base64: false
      claims_to_verify: [exp]
```

### Step 4: Thin vs Fat Gateway — Draw the Line

The primary risk with gateways is gateway bloat. Start with this heuristic:

- **Thin gateway**: Routes requests, terminates SSL, injects headers, enforces rate limits. Changes rarely. Owned by infrastructure team.
- **Fat gateway**: Contains business routing logic, data transformation, orchestration. Changes frequently. Creates bottleneck.

Fat gateways become the new monolith. Every new feature requires a gateway deployment. Every team blocks on the gateway team. If you find yourself writing business logic in Lua scripts (Kong), Lambda@Edge handlers, or APIM policies, ask whether that logic belongs in a service instead.

### Step 5: Plan for Gateway Failure

The gateway is a single point of failure. Mitigation:

```
- Deploy multiple gateway instances behind a load balancer
- Use health checks to route around failed instances
- Implement circuit breakers for upstream services
- Keep gateway configuration in version control (GitOps)
- Test gateway config changes in staging before production
- Document bypass procedures for catastrophic gateway failure
```

## When to Use / When NOT to Use

**Use when:**
- You have multiple services that need consistent cross-cutting behavior (auth, rate limiting, logging)
- You want to expose a unified API to clients while decomposing internally
- You need to route different client types (mobile, web, partners) to different backends
- You're implementing API versioning and need transparent routing between old and new

**Do NOT use when:**
- You have a single service — adding a gateway adds latency and operational complexity for no benefit
- Your services already have a service mesh handling east-west concerns — adding a north-south gateway risks duplicating concerns at both layers
- Your throughput requirements make the gateway a bottleneck (evaluate whether a more performant gateway or direct routing is better)

## Common Mistakes

**Mistake 1: The fat gateway anti-pattern.** Putting business logic, data transformation, or orchestration in the gateway. This recreates the monolith at the gateway layer. The gateway becomes a bottleneck that every team must change for every feature. Keep it to infrastructure concerns only.

**Mistake 2: Duplicating gateway concerns in services.** Teams distrust the gateway and re-implement JWT validation, rate limiting, or logging in each service "just to be safe." Now you have two layers of the same concern. Establish the gateway as the authoritative policy enforcement point. Services behind the gateway can trust that requests are already authenticated.

**Mistake 3: Single gateway instance.** The gateway handles all traffic. It has no redundancy. One instance failure takes down every service. Always deploy the gateway in HA configuration with multiple instances.

**Mistake 4: Missing observability.** The gateway handles all traffic but emits no metrics. You can't tell if rate limiting is triggering on legitimate users, which routes have the highest latency, or which upstream services are returning errors. The gateway should be your richest source of traffic observability.

**Mistake 5: Conflating gateway with service mesh.** A gateway handles north-south traffic (client to service). A service mesh handles east-west (service to service). They solve different problems. Using a gateway to manage service-to-service communication couples every service to the gateway and creates a network bottleneck. Use a service mesh for east-west; gateway for north-south.

## Connections

**Gateway Aggregation** (Article 14): Routing and aggregation often coexist in the same gateway product. Routing directs one request to one service; aggregation combines responses from multiple services. Both are gateway responsibilities but serve different purposes.

**Backend for Frontend**: BFF is a pattern where different client types get dedicated backends. The gateway can implement BFF routing by directing requests from different client types to different backend stacks.

**Retry Pattern** (Article 21): Gateways can implement retry logic for transient failures. Be careful: gateway-level retries plus service-level retries can create retry storms. Configure retries at one layer only.

**Circuit Breaker**: Gateways commonly implement circuit breakers per upstream service. When an upstream fails consistently, the gateway opens the circuit and returns a fast error rather than queuing requests to a dead service.

**Sidecar Pattern** (Article 24): In a service mesh, the sidecar (Envoy) handles per-service proxy concerns (mTLS, circuit breaking, retries). The gateway handles fleet-wide concerns (auth, rate limiting, external routing). The two patterns are complementary, not competing.

## Key Insights

1. **Offloading is about eliminating duplication of infrastructure concerns.** The gateway is the correct place for concerns that must be uniform across all services. Domain logic is never a gateway concern.

2. **Thin gateways age well; fat gateways become monoliths.** The gateway should change only when infrastructure policy changes. If it changes for every new feature, it has accumulated too much business logic.

3. **The gateway is a policy enforcement point, not a processing pipeline.** It validates, routes, and transforms minimally. It does not compute or orchestrate.

4. **HA is not optional.** A single gateway instance is a single point of failure for your entire service fleet. Gateway HA is infrastructure basics, not a nice-to-have.

5. **Metrics from the gateway are your best source of traffic truth.** Because every request passes through the gateway, gateway metrics are the most complete picture of your system's traffic patterns. Invest in rich gateway observability.

6. **Gateway and service mesh solve different scopes.** North-south vs east-west. External traffic vs internal traffic. Don't use one to do the job of the other.

7. **Gateway-as-code is essential.** Configuration drift between staging and production gateway config causes production incidents. Store all gateway configuration in version control. Use GitOps pipelines to apply it. Treat gateway config changes as code changes, with code review and staged rollout.
