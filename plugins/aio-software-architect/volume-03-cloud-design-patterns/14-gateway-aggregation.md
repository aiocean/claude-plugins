# Gateway Aggregation

> "The network is the computer — and the gateway is its operating system."

## The Problem

In a microservices architecture, a single user-facing operation often requires data from multiple backend services. A mobile app's home screen might need the user's profile, their recent orders, their notification count, their loyalty points balance, and personalized recommendations — all at once. In a monolithic world, one database query or one service call could fetch all of this. In the microservices world, each piece of data lives in a separate service: UserService, OrderService, NotificationService, LoyaltyService, RecommendationService.

The naive approach is to let the client call each service directly. The client makes five network requests, waits for each response, and assembles the final view. On a low-latency corporate LAN this is tolerable. On a mobile device over a 4G connection in rural Vietnam — with each round trip adding 100-200ms of latency — those five sequential calls add a second of waiting before the user sees anything. Even parallel calls don't fully solve the problem: you still pay connection setup overhead multiplied by five, battery drain from five separate TCP connections, and the complexity of error handling across five independently-failing services.

The Gateway Aggregation pattern solves this by placing an intermediary — the gateway — between clients and services. The gateway accepts a single request from the client, fans it out to the relevant backend services in parallel, waits for all responses, combines them into a single payload, and returns one response to the client. The client pays one round-trip cost. The backend services are called over a fast internal network. The user sees their home screen render immediately.

## Core Concept

Gateway Aggregation is fundamentally about moving the fan-out logic from the client to a server-side component that has low-latency access to all backend services.

```
WITHOUT AGGREGATION:

Client                Services
  |
  |----> UserService       (100ms RTT)
  |<----
  |
  |----> OrderService      (100ms RTT)
  |<----
  |
  |----> LoyaltyService    (100ms RTT)
  |<----
  
  Total: 300ms minimum (sequential)
  Or: 100ms minimum (parallel) + 5x connection overhead


WITH GATEWAY AGGREGATION:

Client         Gateway              Services
  |               |
  |---(1 req)---> |
                  |---> UserService     (10ms internal)
                  |---> OrderService    (10ms internal)
                  |---> LoyaltyService  (10ms internal)
                  |<--- (all responses)
                  |
  |<--(1 resp)--- |

  Total: 10ms internal + 1x client RTT
```

The key insight is that internal service-to-service calls over a datacenter network are orders of magnitude faster than client-to-server calls over the public internet. By moving the aggregation to the gateway, you replace N slow network hops with 1 slow hop plus N fast hops.

### What Makes a Good Aggregation Gateway

A well-designed aggregation gateway has several characteristics:

**Parallel execution by default.** Independent service calls must be made concurrently. A gateway that calls services sequentially defeats the purpose entirely.

**Partial failure handling.** If LoyaltyService is down, should the entire request fail? Usually not. The gateway should apply a fallback — return a cached value, a default, or null — and still return the other fields. The client should specify which fields are required vs optional.

**Timeout management.** Each upstream call needs an independent timeout. The overall request timeout must be shorter than the sum of individual timeouts. A single slow service should not hold the entire response hostage.

**Response transformation.** The gateway often needs to reshape the data from each service into the schema the client expects. This is legitimate aggregation work, not feature leakage.

**Caching.** Some upstream responses (user profile, product catalog) can be cached at the gateway. This dramatically reduces load on upstream services and further reduces latency.

## Deep Dive

**The chatty interface anti-pattern and its cost.** Sam Newman's *Building Microservices* identifies the chatty interface problem as one of the primary operational costs of microservice decomposition. When a frontend must call 10 services to render a single page, each call is a separate network round trip. On a mobile network with 100-300ms RTT, 10 sequential calls add 1-3 seconds of latency before the page begins rendering. Even with parallel calls, the total latency is bounded by the slowest dependency. Newman's analysis shows that microservice decomposition, without a corresponding aggregation layer, shifts complexity from internal service coupling to external network call complexity. The aggregation gateway exists to absorb that network complexity on behalf of clients.

**Parallel fan-out and failure handling.** The Google SRE Book's treatment of dependency management under load identifies a critical design decision in gateway aggregation: which upstream failures should propagate to the client and which should be absorbed with degraded responses. A page that requires user profile (critical), recent orders (critical), and product recommendations (optional) has different failure semantics for each. If user profile fails, the page cannot render — fail the request. If recommendations fail, the page can render without them — return a partial response. This degradation logic is the aggregation gateway's primary intellectual content. It requires explicit per-dependency decision-making: is this dependency required or optional? What is the fallback value when it is unavailable? What timeout is acceptable before declaring it unavailable? The Google SRE Book's treatment of error budgets provides the framing: optional dependencies have their own error budgets; exhausting an optional dependency's budget should not exhaust the aggregation endpoint's budget.

**The scatter-gather pattern and timeout coordination.** Martin Kleppmann's *Designing Data-Intensive Applications* analyzes the scatter-gather problem — sending a request to multiple recipients and waiting for all responses — with precision. The key insight is that in a scatter-gather fan-out, the total response time is the maximum of all individual response times, not the average. A single slow dependency makes the entire aggregation slow. Kleppmann's treatment of timeout coordination applies: the gateway must set an overall deadline for the aggregated response, then set per-dependency timeouts that are strictly less than the overall deadline, leaving time for aggregation logic. If the gateway's overall timeout is 2 seconds and there are 5 dependencies, each dependency gets at most 1.5 seconds (leaving 500ms for aggregation), not 2 seconds. A dependency that times out individually must return a fallback value, not block the aggregation indefinitely. This requires deadline propagation — passing the remaining time budget into each downstream call.

**GraphQL as a structured aggregation protocol.** Hohpe and Woolf's *Enterprise Integration Patterns* describes aggregation as a fundamental integration pattern. GraphQL can be understood as a formalization of gateway aggregation at the protocol level: a single query describes exactly which fields from which underlying sources are needed, the execution engine resolves each field independently (with batching via DataLoader), and the response is assembled from the resolved fields. The advantage over ad-hoc aggregation code is declarative composition — adding a new field to the aggregated response does not require modifying aggregation logic, only adding a resolver. The disadvantage is that GraphQL is a protocol commitment, not just an implementation detail — changing it requires versioning coordination with all clients. Newman's guidance on avoiding tight coupling between clients and services applies: the aggregation interface is a contract, and its evolution must be managed as carefully as any other service interface.

**The N+1 query problem in aggregation.** The Google SRE Book's treatment of load amplification identifies a failure mode specific to aggregation gateways: the N+1 query problem. If the aggregation gateway fetches a list of 20 orders and then makes one call per order to fetch order details, it generates 1 + 20 = 21 calls instead of 2. At scale, this fan-out amplifies load dramatically. Kleppmann's treatment of batch APIs provides the solution: downstream services must expose batch endpoints that accept multiple IDs and return multiple results in a single call. The gateway aggregator must use these batch endpoints rather than looping over individual calls. This is an interface design requirement that propagates upstream — services owned by other teams must implement batch APIs to support efficient aggregation. This cross-team coordination is a non-trivial organizational cost of the aggregation gateway pattern.

## Implementation Guide

### Step 1: Identify Aggregation Candidates

Not every API endpoint benefits from aggregation. Look for:
- Operations that require data from 3+ services
- Operations called frequently by latency-sensitive clients (mobile, real-time UIs)
- Operations where the client makes multiple calls that could be combined

### Step 2: Design the Aggregation Contract

Define what the aggregated endpoint looks like to the client:

```typescript
// Aggregated response contract
interface HomeScreenData {
  user: UserProfile;           // required — from UserService
  recentOrders: Order[];       // required — from OrderService
  notifications: {
    count: number;             // optional — from NotificationService
    items: Notification[];
  } | null;                    // null if NotificationService unavailable
  loyaltyPoints: number | null; // optional — from LoyaltyService
  recommendations: Product[];  // optional — from RecommendationService
}
```

Mark each field as required or optional. The gateway uses this to determine whether a downstream failure causes the entire request to fail or just degrades the response.

### Step 3: Implement Parallel Fan-Out

```typescript
async function aggregateHomeScreen(userId: string): Promise<HomeScreenData> {
  const timeout = 500; // ms — overall budget

  // Fan out in parallel
  const [user, orders, notifications, loyalty, recommendations] =
    await Promise.allSettled([
      withTimeout(userService.getProfile(userId), timeout),
      withTimeout(orderService.getRecentOrders(userId, 5), timeout),
      withTimeout(notificationService.getUnread(userId), timeout),
      withTimeout(loyaltyService.getPoints(userId), timeout),
      withTimeout(recommendationService.getForUser(userId, 10), timeout),
    ]);

  // Required fields — throw if unavailable
  if (user.status === 'rejected') throw new UpstreamError('UserService', user.reason);
  if (orders.status === 'rejected') throw new UpstreamError('OrderService', orders.reason);

  // Optional fields — degrade gracefully
  return {
    user: user.value,
    recentOrders: orders.value,
    notifications: notifications.status === 'fulfilled' ? notifications.value : null,
    loyaltyPoints: loyalty.status === 'fulfilled' ? loyalty.value.points : null,
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
  };
}
```

### Step 4: Add Caching

Cache responses from services that change infrequently:

```typescript
const CACHE_TTL = {
  userProfile: 300,       // 5 minutes
  loyaltyPoints: 60,      // 1 minute
  recommendations: 120,   // 2 minutes
  recentOrders: 30,       // 30 seconds
  notifications: 10,      // 10 seconds — near-real-time
};
```

### Step 5: Instrument and Monitor

Track per-upstream latency and error rates. Aggregation gateways can mask upstream problems because partial failures are handled gracefully. You need visibility into which services are failing and how often.

```
Metrics to track:
- gateway_request_duration_ms (histogram, p50/p95/p99)
- upstream_call_duration_ms{service="..."} (per-service latency)
- upstream_call_errors_total{service="...", error_type="..."}
- partial_response_rate (how often optional fields were null/default)
```

## When to Use / When NOT to Use

**Use when:**
- Clients make 3+ calls that can be parallelized
- Client-to-server latency is high (mobile, cross-region)
- Multiple client types need similar but slightly different data combinations
- You want to reduce the number of network connections from mobile clients

**Do NOT use when:**
- Services have strong ordering dependencies (output of A feeds input of B)
- You only need data from 1-2 services — direct calls are simpler
- Aggregation logic is complex enough to become a bottleneck itself
- The gateway starts containing business logic beyond data assembly

**The coupling warning:** Gateway aggregation creates coupling between the gateway and all the services it aggregates. When a service changes its response schema, the gateway must be updated. When a new service is added to a flow, the gateway must be updated. Keep aggregation gateways thin — their job is to fetch and combine, not to apply business rules.

## Common Mistakes

**Mistake 1: Sequential fan-out.** Calling services one by one in a loop instead of in parallel. This turns the aggregation gateway into a bottleneck that's slower than direct client calls. Always use `Promise.all` or equivalent concurrent execution.

**Mistake 2: Treating all fields as required.** If any upstream failure causes the entire aggregated response to fail, you've achieved nothing — clients still see errors as often as before. Classify fields explicitly as required vs optional, and implement fallbacks for optional fields.

**Mistake 3: Letting the gateway accumulate business logic.** The aggregation gateway starts taking on validation, calculation, business rules. It becomes a new monolith — the "gateway monolith." Keep it to: fan-out, wait, merge, transform. Business logic belongs in domain services.

**Mistake 4: Ignoring the N+1 query problem at the service level.** If you aggregate 10 orders and each order requires a separate ProductService call to get the product name, you've traded 1 client-side N+1 problem for a gateway-side N+1 problem. Design upstream services to support bulk operations. One `getProductsBatch([id1, id2, ...])` call is far better than N individual `getProduct(id)` calls.

**Mistake 5: Missing timeout budgets.** Each upstream call needs its own timeout. The overall request timeout should be equal to the longest individual timeout (since calls are parallel) plus a small buffer for processing. Without timeouts, a single slow service holds all responses hostage.

## Connections

**Backend for Frontend (BFF)**: BFF is a specialization of Gateway Aggregation where each client type gets its own dedicated gateway. BFF is the "why" and aggregation is the "how."

**GraphQL**: GraphQL is an aggregation query language. A GraphQL server implements aggregation by resolving each field in a query from potentially different data sources. The resolver model is a formalized version of the parallel fan-out pattern. Apollo Federation extends this to federated aggregation across multiple GraphQL services.

**Gateway Routing & Offloading** (Article 15): Routing and aggregation often coexist in the same gateway. Routing directs requests to services; aggregation combines responses from multiple services. Understand which concern you're addressing.

**Materialized View** (Article 17): When aggregation queries are very frequent and the data changes infrequently, pre-computing the aggregate (materialized view) is more efficient than re-computing it on every request.

**CQRS**: The read side of CQRS often uses materialized views that are themselves aggregated projections from multiple event streams — a form of persistent aggregation.

## Key Insights

1. **The fundamental trade-off is coupling for latency.** Aggregation gateways reduce client latency at the cost of coupling the gateway to multiple upstream services. This trade-off is almost always worth it for mobile clients; it's worth scrutinizing for server-to-server calls.

2. **Parallel execution is non-negotiable.** An aggregation gateway that calls services sequentially is strictly worse than having the client call services directly — it adds a network hop without adding value.

3. **GraphQL is an aggregation pattern, not just a query language.** When teams adopt GraphQL, they are often solving the aggregation problem without naming it as such. Recognizing this helps you understand when GraphQL is appropriate (aggregation needed) vs overkill (simple CRUD).

4. **The N+1 problem migrates, not disappears.** Aggregation moves the N+1 problem from client to gateway. If your gateway is making N calls where it should make 1 batch call, you've just moved the problem. Design upstream services with batch APIs specifically for aggregation use cases.

5. **Partial failures are the normal case, not an edge case.** In a system with 10 aggregated services, if each has 99.9% availability, the probability of all 10 being available simultaneously is 99% — meaning 1 in 100 requests will have at least one service unavailable. Design for partial failure as the default, not the exception.

6. **Cache at the gateway, not just the edge.** CDN caching works for public content. Gateway-level caching (Redis, in-memory) works for per-user aggregated data. The gateway is often the best place to cache because it understands which parts of the aggregated response can be cached independently.

7. **The BFF pattern is Gateway Aggregation plus client-specific optimization.** A single aggregation gateway for all clients becomes a compromise — it aggregates too much for simple clients and too little for complex ones. BFF resolves this by giving each client type its own gateway that aggregates exactly what that client needs.
