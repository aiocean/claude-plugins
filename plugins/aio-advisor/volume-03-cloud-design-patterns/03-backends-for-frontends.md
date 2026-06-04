# Backends for Frontends

> "The BFF pattern solves a real problem: different frontend teams need to move at different speeds, and a shared API becomes a negotiation bottleneck." — Sam Newman, Building Microservices

## The Problem

Your API team has spent six months building a beautiful, general-purpose API. It is RESTful, well-documented, and follows all the standards. It returns complete Customer objects with 47 fields. It serves the web dashboard, the iOS app, the Android app, the third-party partner portal, and the internal admin tool. Everyone agreed at the start that sharing one API was the efficient approach.

Then the iOS team needs to fetch the customer profile plus their last five orders plus their active subscription status — all in one request, because mobile networks are expensive and round trips kill battery. The API team says the data is in three separate endpoints and that's how it should be. The iOS team wraps the three calls in their mobile app and now they're making three sequential network requests on a 4G connection in a tunnel.

Meanwhile, the web dashboard team wants pagination on the orders list, but the iOS app wants infinite scroll, and the pagination model doesn't translate well between them. The partner portal needs a subset of fields to be GDPR-compliant with customer data. The admin tool needs fields that are too sensitive to expose through the same endpoint the mobile apps use. Each consumer has different needs, and the one-size-fits-all API serves none of them particularly well while serving all of them adequately.

The BFF pattern, popularized by Sam Newman and documented in detail by Phil Calçado (who named and described it at SoundCloud), addresses this tension. Instead of one general-purpose backend API, you have one backend per frontend type. Each BFF is owned by the frontend team that uses it, shaped exactly to that frontend's needs, and can evolve independently.

## Core Concept

Backends for Frontends (BFF) is a pattern where you create a separate backend service for each distinct frontend client or client type. The BFF aggregates data from downstream services, transforms it into the shape the frontend needs, and handles concerns specific to that client type (authentication flows, caching strategies, response compression).

```
                    ┌──────────────────────────────┐
                    │       Downstream Services     │
                    │                              │
                    │  ┌──────────┐  ┌──────────┐  │
                    │  │ Orders   │  │ Products │  │
                    │  │ Service  │  │ Service  │  │
                    │  └────┬─────┘  └────┬─────┘  │
                    │       │             │        │
                    │  ┌────┴──────────────┴─────┐  │
                    │  │      User Service       │  │
                    │  └────────────────────────┘  │
                    └───┬──────────┬──────────┬────┘
                        │          │          │
              ┌─────────┴──┐  ┌───┴────┐  ┌──┴────────┐
              │ Web BFF    │  │iOS BFF │  │Partner BFF│
              │            │  │        │  │           │
              │ - rich data│  │- slim  │  │ - filtered│
              │ - pagination│ │- combo │  │ - GDPR    │
              │ - sessions │  │- JWT   │  │ - API keys│
              └─────┬──────┘  └──┬─────┘  └────┬──────┘
                    │            │              │
              ┌─────┴──┐    ┌───┴───┐    ┌─────┴───┐
              │  Web   │    │  iOS  │    │ Partner │
              │  App   │    │  App  │    │  Portal │
              └────────┘    └───────┘    └─────────┘
```

Each BFF is essentially a purpose-built API gateway that sits between one class of frontend and the downstream services. It performs aggregation (fetching from multiple services and composing the response), transformation (shaping data to what the frontend needs), and protocol adaptation (REST to GraphQL, HTTP/1.1 to HTTP/2, WebSocket management).

The key insight is ownership. In the classic BFF model, the team that owns the frontend also owns the BFF. The iOS team owns the iOS BFF. This eliminates the coordination overhead that kills shared API teams — the iOS team can add a new aggregated endpoint without filing a ticket, waiting for prioritization, and hoping another team implements it correctly.

### BFF vs API Gateway

An API Gateway handles cross-cutting concerns: authentication, rate limiting, SSL termination, request routing. It's an infrastructure component, not a domain component. A BFF is a purpose-built application that knows about business domains and shapes responses.

You often have both: an API Gateway in front of your BFFs for infrastructure concerns, and BFFs behind it for application-level aggregation and transformation.

```
Client → [API Gateway (auth, rate limit, SSL)] → [BFF (aggregate, transform)] → [Services]
```

### BFF vs GraphQL

GraphQL is sometimes proposed as an alternative to BFF: give clients a flexible query language and let them request exactly what they need. This works well for internal APIs where client developers are sophisticated. For mobile clients on constrained networks, you still want the BFF to perform the query, aggregate the data server-side, and return a single optimized response — even if that BFF uses GraphQL internally to query downstream services.

## Deep Dive

The BFF pattern was named and documented by Phil Calçado at SoundCloud in 2015, but the underlying insight had been rediscovered independently by multiple teams facing the same structural pressure: a single general-purpose API cannot efficiently serve clients with fundamentally different network characteristics, interaction patterns, and data needs.

**Sam Newman's articulation in *Building Microservices*** frames the problem as a team topology question as much as a technical one. Newman observed that a shared API team becomes a coordination bottleneck in direct proportion to the number of consuming client teams. Each client team that needs a new aggregated endpoint must file a request, wait for prioritization, explain their requirements to a team that doesn't fully understand their UX constraints, and then accept what the API team delivers — which is inevitably a compromise shaped by the API team's preferences rather than the client team's needs. BFF resolves this by making the client team the owner of the API layer. The bottleneck disappears because there is no longer a shared owner of the client-specific API surface.

**The mobile network constraint** is the most quantifiable argument for BFF. Each additional round trip on a mobile connection adds 100-300ms of latency on a 4G connection, more on 3G or congested networks. Battery consumption increases with each connection. A client that makes 5 sequential API calls to assemble a home screen is paying 500-1500ms of avoidable latency plus 5x connection setup costs. Server-side aggregation in a BFF — which runs on a low-latency internal network — reduces this to a single client round trip. The AWS Builder's Library analysis of connection costs makes this quantitative: internal service-to-service calls within a datacenter are typically 1-5ms; client-to-server calls over the public internet are 50-300ms. Moving aggregation to a server-side BFF replaces N slow hops with 1 slow hop plus N fast hops.

**Newman's warning about BFF drift** is the most important operational insight. The BFF pattern creates a strong organizational pull toward re-centralization. When iOS and Android BFFs evolve independently and begin to look similar, teams propose merging them. When a "small" business rule is faster to implement in the BFF than in the domain service, it gets added there. Over months, a BFF that started as a thin aggregation layer accumulates business logic, shared code, and multiple team contributors. The original problem — shared ownership creating coordination overhead — re-emerges at the BFF layer. Newman's prescription is strict: the BFF is owned by exactly one team, serves exactly one class of client, and contains no business logic. Violation of any of these is the first step toward recreating the original bottleneck.

**The *Release It!* resilience argument** applies directly to BFF design. A BFF that aggregates 5 downstream services and has no timeout, retry, or circuit breaking logic will experience cascading failures proportional to the number of dependencies it holds open. When the recommendation service degrades, it holds BFF threads, exhausting the thread pool for requests that don't touch recommendations at all. Nygard's bulkhead principle — isolate resources per dependency — applies inside the BFF itself. Each downstream call in the BFF should have an independent timeout. Optional fields (recommendations, loyalty points) should degrade to null rather than blocking the response. Required fields (user profile, core order data) should trigger a fast circuit-open error rather than hanging. The BFF is a microservice and requires all the resilience engineering that microservices require.

**The GraphQL relationship** is clarified by understanding what problem each pattern solves. GraphQL federation solves the *query composition* problem: let clients express exactly what data they need in a structured query language. BFF solves the *optimization and ownership* problem: let the team that understands the client's constraints own the server-side layer that serves it. These are orthogonal. A BFF can use GraphQL internally to query downstream services. A BFF can expose a GraphQL API to its client. GraphQL does not eliminate the need for BFF when the primary drivers are team ownership and mobile optimization rather than query flexibility.

## Implementation Guide

### Step 1: Identify client boundaries

Not every client needs its own BFF. Group clients by their genuinely different requirements:

```
Client Group 1: Web dashboard
  - Needs: full data, pagination, session-based auth, WebSocket for real-time
  - Network: reliable, high bandwidth
  - Team: web team

Client Group 2: iOS + Android (unified mobile BFF often works)
  - Needs: aggregated responses, minimal data, JWT auth, offline-first support
  - Network: variable, expensive
  - Team: mobile team

Client Group 3: Partner API
  - Needs: filtered data (GDPR), API key auth, rate-limited, versioned
  - Network: reliable (server-to-server)
  - Team: partnerships team
```

If iOS and Android have genuinely different needs, split them. If they're similar enough, one mobile BFF is simpler.

### Step 2: Define BFF boundaries

Each BFF should:
- Be owned by one team
- Have one primary consumer (or one class of consumer)
- Not be shared between fundamentally different client types
- Be deployable independently

### Step 3: Implement aggregation

A BFF endpoint often aggregates multiple downstream calls:

```typescript
// iOS BFF: /v1/home-screen
async function getHomeScreen(userId: string): Promise<HomeScreenResponse> {
  // Fetch in parallel where possible
  const [profile, recentOrders, recommendations] = await Promise.all([
    userService.getProfile(userId),
    orderService.getRecentOrders(userId, { limit: 5 }),
    recommendationService.getRecommendations(userId, { limit: 10 }),
  ]);

  // Shape response for iOS home screen needs
  return {
    user: {
      name: profile.displayName,
      avatarUrl: profile.avatarUrl,
      // intentionally omitting 40+ other fields iOS doesn't need
    },
    recentOrders: recentOrders.map(order => ({
      id: order.id,
      status: order.status,
      summary: order.items[0]?.name ?? 'Order',
      total: formatCurrency(order.total, profile.currency),
    })),
    recommendations: recommendations.map(r => ({
      id: r.productId,
      title: r.title,
      imageUrl: r.thumbnailUrl,  // iOS-sized thumbnail, not full image URL
      price: formatCurrency(r.price, profile.currency),
    })),
  };
}
```

The iOS home screen gets exactly what it needs in one request. No over-fetching, no under-fetching.

### Step 4: Handle client-specific authentication

Mobile apps typically use JWT (short-lived access tokens + refresh tokens). Web apps often use session cookies. Partner APIs use API keys. Each BFF handles the auth mechanism appropriate for its client:

```typescript
// Mobile BFF middleware
function mobileAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  
  try {
    const claims = verifyJWT(token, process.env.JWT_SECRET);
    req.userId = claims.sub;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      // iOS client knows to use refresh token when it sees TOKEN_EXPIRED
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

The web BFF uses session middleware. Same downstream services — completely different auth handling.

### Step 5: Optimize for the client's network characteristics

Mobile BFF: compress responses aggressively, minimize payload size, avoid optional fields.

```typescript
// Mobile BFF response: 847 bytes
{
  "user": { "name": "Alice", "avatarUrl": "https://cdn.example.com/a/64.jpg" },
  "orders": [{ "id": "ord-123", "status": "shipped", "total": "$42.00" }]
}

// Web BFF response: same data, more complete
{
  "user": {
    "id": "usr-456",
    "name": "Alice Chen",
    "email": "alice@example.com",
    "avatarUrl": "https://cdn.example.com/a/256.jpg",
    "memberSince": "2023-01-15",
    "tier": "gold"
  },
  "orders": [{
    "id": "ord-123",
    "status": "shipped",
    "trackingNumber": "1Z999AA1...",
    "estimatedDelivery": "2026-04-06",
    "items": [...],
    "total": { "amount": 42.00, "currency": "USD" }
  }]
}
```

### Step 6: Don't put business logic in the BFF

BFFs aggregate and transform. They should not contain business logic. If you find yourself writing `if (order.total > 100) { apply_discount() }` in a BFF, that logic belongs in a downstream service.

This is the hardest discipline to maintain. The BFF is owned by the frontend team, and frontend teams are tempted to put "small" business logic in the BFF for speed. Resist. Business logic in BFFs creates a new category of monolith.

## When to Use

**Multiple client types with genuinely different needs.** If your web app, mobile app, and partner API need substantially different response shapes, security models, or aggregation patterns, BFF delivers real value.

**Frontend teams blocked by a shared API team.** This is often the trigger. When the iOS team spends three weeks waiting for a new endpoint because the API team's backlog is full, a BFF gives them autonomy.

**Mobile clients on constrained networks.** Aggregating multiple service calls server-side (in the BFF) rather than client-side (in the mobile app) dramatically reduces latency and data usage for mobile clients.

**GDPR or compliance requirements vary by client type.** A partner-facing API might need to omit personal data fields that the internal web dashboard shows. A BFF per client type lets you enforce these policies precisely.

**When different clients need fundamentally different protocols.** WebSocket for the web dashboard, long polling for partners, REST for mobile — a shared API struggles to serve all three cleanly.

## When NOT to Use

**When you have one client or very similar clients.** If your only client is a web app and a simple mobile app with nearly identical needs, a single well-designed API with optional fields is simpler. Add BFFs when the divergence is real and painful, not preemptively.

**When the BFF becomes a shared backend again.** Teams drift toward sharing. "The iOS and Android BFFs are almost identical, let's merge them." The moment you have multiple frontend teams contributing to one BFF, you've recreated the original problem. If merging makes sense, do it, but be honest: you're back to a shared API.

**When business logic belongs in domain services.** If your BFF is becoming where business rules live, the architecture is wrong. BFFs aggregate and shape; they don't own domain logic.

**When you don't have the team structure to support multiple BFFs.** BFF works best when each BFF has an owning team. If you're a small startup with two engineers, multiple independently deployed BFFs is operational overhead without proportional benefit. A shared API or a thin API Gateway is more appropriate.

**When GraphQL federation already handles the composition.** For sophisticated single-page applications where the client is doing the query composition, a well-designed GraphQL API may eliminate the need for BFF. BFF and GraphQL federation solve overlapping problems — understand both before committing.

## Common Mistakes

**Mistake 1: Putting business logic in the BFF.** The hardest mistake to avoid. BFFs are owned by frontend teams, and frontend teams move fast. The temptation to add "just this one business rule" in the BFF is constant. Once you start, the BFF becomes a backend monolith. Define a hard rule: the BFF may only call downstream service APIs, aggregate results, and transform shapes. No business logic.

**Mistake 2: Too many BFFs.** One per device type (tablet vs phone vs watch) is usually overkill. Group clients by their genuinely common requirements. If iOS and Android need the same data in the same shape, one mobile BFF is right. Split only when the needs genuinely diverge.

**Mistake 3: Forgetting the BFF in the security model.** The BFF is a backend service. It needs the same security rigor as any other service: proper authentication, secrets management, logging, vulnerability scanning. Teams sometimes treat BFFs as "frontend code deployed on the backend" and skip security reviews.

**Mistake 4: Inadequate BFF resilience.** When downstream services are slow or unavailable, the BFF should have timeout, retry, and circuit breaking. A mobile BFF that makes three downstream calls with no timeout handling will block mobile requests for 30+ seconds when any downstream service degrades. BFFs need the same resilience patterns as any microservice.

**Mistake 5: Duplicating downstream logic across BFFs.** If three BFFs all need to calculate a formatted price string, that logic should live downstream, not be duplicated in each BFF. Shared transformation logic that involves business rules belongs in domain services. BFFs should be thin.

## Connections

**API Gateway**: API Gateway and BFF serve different roles. The API Gateway handles infrastructure concerns (auth, rate limiting, SSL, routing). The BFF handles application concerns (aggregation, transformation). Combine them: API Gateway → BFF → Services.

**Ambassador Pattern** (Volume 03, article 01): Within a BFF, calls to downstream services can use the Ambassador pattern for retry, circuit breaking, and observability.

**Anti-Corruption Layer** (Volume 03, article 02): When a BFF calls a legacy service, the ACL pattern protects the BFF from the legacy system's domain model.

**Circuit Breaker Pattern** (Volume 03, article 07): BFFs aggregate multiple downstream calls. Circuit breakers in the BFF prevent a slow downstream service from causing the entire BFF to time out.

**CQRS** (Volume 03, article 11): A BFF often reads from multiple downstream read models. This is a natural fit with CQRS architecture, where the BFF composes read-optimized views from multiple query services.

**Strangler Fig Pattern**: BFF is sometimes used as the new surface for a Strangler Fig migration. The BFF calls the new services for some functionality and the legacy for the rest, allowing gradual migration while presenting a unified API to the frontend.

## Key Insights

1. **Ownership is the point.** The BFF pattern is primarily about team autonomy, not technical architecture. Giving the frontend team ownership of its backend adapter eliminates coordination overhead and lets teams move at their own speed.

2. **BFF does not mean "put everything in the BFF."** It is an aggregation and transformation layer. Domain logic, validation, business rules — these belong in downstream services. BFF is thin by design.

3. **Mobile and web almost always justify separate BFFs.** Mobile network constraints and battery life create genuinely different optimization targets. Aggregating three service calls into one round trip matters far more for mobile than for web.

4. **GraphQL federation and BFF are complementary, not competing.** GraphQL federation solves the composition problem differently — by letting clients define their queries. BFF solves the aggregation and optimization problem. You can use both.

5. **BFF drift is real.** Without discipline, BFFs become shared backends. Enforce the ownership rule: one team, one BFF. When you catch yourself saying "let's reuse the BFF across teams," step back and examine why.

6. **The number of BFFs should match the number of distinct client experiences, not the number of clients.** Six different web pages don't need six BFFs. One web experience usually needs one BFF, even if the web app has dozens of screens.

7. **BFF is often where you discover that your downstream services have the wrong granularity.** When you're repeatedly aggregating the same three services in every BFF, that aggregation might belong in a new domain service. Let BFF patterns inform your service boundaries.
