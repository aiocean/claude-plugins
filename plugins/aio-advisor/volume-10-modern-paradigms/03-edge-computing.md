# Edge Computing Architecture

> "The network is the computer — but the edge is where computation meets reality." — adapted from Sun Microsystems

## The Problem

The cloud-centric architecture model that dominated the 2010s operates on a fundamental assumption: latency is acceptable. Send a request to a data center somewhere, wait for the round trip, receive a response. For most web applications, this works. Users tolerate 200-500ms for a page load. APIs can absorb the overhead. The assumption holds.

Until it doesn't. A financial trading system where milliseconds determine profitability cannot tolerate transatlantic round trips. An autonomous vehicle making lane-change decisions cannot wait for a cloud response. A retail website where every 100ms of additional latency reduces conversion by 1% cannot afford unnecessary hops. Real-time multiplayer games where 50ms of latency determines whether a player's action registers or rubber-bands cannot route through centralized data centers.

Beyond latency, centralized cloud architectures face a second category of problems: data gravity and regulation. The GDPR requires that EU citizen data be processed within the EU. Healthcare data in many jurisdictions cannot leave the country. Financial transaction records in Singapore must remain in Singapore. A pure cloud model that centralizes compute in a handful of AWS or Azure regions cannot satisfy these requirements without replicating infrastructure at enormous cost.

Edge computing addresses both problems by moving compute closer to where data originates and users live. The definition of "edge" spans a spectrum: from IoT sensors and mobile devices (far edge) to carrier network nodes (near edge) to CDN Points of Presence distributed globally (CDN edge). The architectural patterns in this article focus primarily on the CDN edge tier — where platforms like Cloudflare Workers, Vercel Edge Functions, and Deno Deploy have made globally distributed compute accessible to application developers.

## Core Concept

Edge computing at the CDN tier works by deploying application code to dozens or hundreds of Points of Presence (PoPs) distributed across the globe. When a user makes a request, it is routed to the nearest PoP — not to a central origin server — and processed there. The reduction in network distance directly reduces latency. A user in Tokyo hitting a Cloudflare PoP in Tokyo experiences single-digit millisecond network latency; the same user routing to an AWS us-east-1 origin experiences 150-200ms.

**V8 Isolates: The Runtime Model**

Cloudflare Workers, the most mature CDN edge platform, uses V8 isolates as the execution model. V8 isolates are lightweight, isolated JavaScript execution contexts that share a V8 engine process but have no shared memory or state. They start in approximately 5 microseconds — effectively zero cold start time compared to AWS Lambda's 100-500ms (or more for JVM-based runtimes).

The key constraint of V8 isolates is their execution model: no filesystem access, no arbitrary networking (only fetch and WebSocket APIs), limited CPU time per invocation (10-50ms depending on the plan), and no long-running processes. These constraints are not bugs — they are what makes the isolation model safe and the startup time near-zero. The constraint forces a stateless, request-response execution model that is inherently scalable.

**Tiered Edge Processing**

Production edge architectures are not binary (edge vs. origin). They use a tiered model:

```
User Request
    ↓
CDN Edge PoP (Tier 1)
├── Static asset serving (cache hit → immediate response)
├── Auth token validation (JWT verification without origin call)
├── A/B testing assignment (based on cookie/header)
├── Geo-routing (redirect to regional origin)
└── Cache miss → Tier 2

Regional Edge (Tier 2 — regional hub PoPs)
├── Server-side rendering (edge SSR)
├── API aggregation (fanout to multiple origins)
├── Edge database reads (D1, KV, Turso)
└── Origin shield

Central Origin (Tier 3)
├── Write operations
├── Complex business logic
├── Database writes
└── Heavy compute
```

The goal is to resolve as many requests as possible at Tier 1 (microseconds of additional latency), push more complex operations to Tier 2 (single-digit milliseconds), and minimize Tier 3 origin calls to writes and genuinely complex operations.

**Edge-Compatible Data Stores**

Stateless edge compute requires edge-compatible data stores for operations that require state:

- **Key-Value stores**: Cloudflare KV (eventually consistent, high read performance, global replication), Vercel KV (Redis-compatible), Deno KV (ACID transactions at edge)
- **Edge relational databases**: Cloudflare D1 (SQLite-based, per-region replicas), Turso (libSQL with regional replication), PlanetScale (MySQL-compatible with global read replicas)
- **Edge caches**: Cloudflare Cache API (programmatic cache control from edge workers), Vercel Data Cache
- **Distributed object storage**: R2 (Cloudflare, S3-compatible, zero egress fees), accessed from edge workers

The critical insight: edge databases optimize for read performance at the edge, with writes routed to a primary region. This works well for read-heavy workloads (most web applications) and poorly for write-heavy workloads (transaction systems, high-frequency event logging).

## Deep Dive

### The Akamai CDN Architecture: The Original Edge Computing Blueprint

The intellectual foundations of edge computing trace back to Tom Leighton and Daniel Lewin's 1998 work at MIT that became Akamai Technologies. Lewin's thesis proposed solving the "hot spot problem" — when a popular web server becomes overwhelmed by demand — through consistent hashing across a geographically distributed set of surrogate servers. The algorithm placed content replicas at nodes chosen to minimize network distance to end users, measured in routing hops and latency rather than physical geography.

The key theoretical contribution was proving that distributing content to O(log N) servers out of a network of N nodes provides near-optimal load distribution while maintaining manageable replication overhead. Akamai's deployment of this theory across thousands of edge nodes — mapping DNS responses to the topologically closest node for each requesting client — established the architecture that every modern CDN follows: anycast routing (advertising the same IP prefix from multiple geographic locations, letting BGP route clients to the nearest announcement), origin shielding (a tiered cache layer that protects the origin from direct traffic), and edge-side includes (assembling page fragments at the edge to allow partial caching of otherwise dynamic pages).

The 2001 Akamai paper "Consistent Hashing and Random Trees" (Karger, Lewin et al.) formalized the mathematical properties: minimal disruption to key-to-node mappings when nodes join or leave the ring, bounded load per node regardless of key distribution. This same consistent hashing scheme later appeared in Amazon Dynamo (2007) for partitioning key-value data — demonstrating how CDN-era distributed systems research crossed cleanly into the database layer.

### WebAssembly and the V8 Isolate Model: Compute at the Edge

Modern edge compute (Cloudflare Workers, Fastly Compute@Edge) rests on a different foundation than the CDN era: instead of distributing static content, it distributes executable code. The enabling technology is the WebAssembly System Interface (WASI) and the V8 JavaScript engine's isolate model.

The Cloudflare Workers architecture, described in their 2018 engineering blog, uses V8 isolates rather than containers as the isolation unit. A V8 isolate is a lightweight execution context for JavaScript/WebAssembly — it has its own heap and garbage collector but shares the V8 engine process with thousands of other isolates running on the same machine. Isolate startup time is approximately 5 milliseconds versus 50-500 milliseconds for a container cold start, which makes per-request isolation economically viable at edge. Cloudflare's architecture runs hundreds of thousands of isolates per machine across their global network, each processing requests for a different customer's Worker script.

The WASI specification (first proposed in 2019 by Mozilla, Fastly, Intel, and Red Hat) extends WebAssembly beyond the browser by defining a portable system interface — a set of capability-based syscalls for file I/O, networking, and environment access. WASI's security model is capability-based: a WASM module can only access resources explicitly passed to it as capabilities at instantiation time, preventing a module from accessing the filesystem or network without explicit authorization. This property makes WASM modules safer to run at edge than traditional executables: a compromised module cannot exfiltrate data it was not explicitly granted access to.

The 2019 Lin Clark paper "Standardizing WASI: A system interface to run WebAssembly outside the web" articulates the design goal: portability and security through capability-based isolation. The same WASM binary can run in a browser, a server, a CDN edge node, or an embedded device — the host environment controls what capabilities it exposes. This portability is why WASM emerged as the preferred runtime for edge-native plugin systems: Envoy's filter chains, Open Policy Agent's Rego evaluator, and Shopify's Script Editor all run WASM modules embedded in their respective runtimes.

### The Jamstack Architecture: Static Distribution as an Architectural Principle

The term "Jamstack" (JavaScript, APIs, Markup) was popularized by Netlify founder Matt Biilmann in 2016, but the underlying architectural principle is a direct application of Lewin's original observation: pre-computed, cacheable content can be served from globally distributed edge nodes with orders-of-magnitude better performance than origin-served dynamic content. The insight is that most web content changes on human timescales (hours, days) rather than request timescales (milliseconds) — for this content, building at deploy time and serving from edge is strictly better than building at request time and serving from origin.

The critical architectural implication is the decoupling of the build pipeline from the serving infrastructure. In a traditional server-rendered architecture, the application server must be available and healthy for every user request. In a Jamstack architecture, the application server runs only during builds; the serving infrastructure is a globally distributed file store with no business logic. This changes the failure mode: origin failures in a traditional architecture take down the user-facing application; origin failures in a Jamstack architecture are invisible to users until the next deploy attempt.

Stale-while-revalidate (SWR), the HTTP caching pattern (RFC 5861, 2010), formalizes the tradeoff between freshness and latency that edge serving requires. An edge node serving a stale cached response while asynchronously fetching a fresh version from origin achieves near-zero latency for the majority of requests — at the cost of serving data that may be seconds or minutes old. For most content, this staleness is acceptable. The architectural discipline is identifying which content has strict freshness requirements (account balances, inventory levels) and routing those requests to origin, while pushing everything else to edge.

## Implementation Guide

**Pattern 1: Edge Authentication**

Move JWT validation to the edge to eliminate authentication round-trips. The edge worker validates the token signature, checks expiration, and extracts claims — all without touching origin infrastructure. Invalid requests are rejected at the PoP nearest the attacker, never reaching your application servers.

```typescript
// Cloudflare Worker — edge auth middleware
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token, env.JWT_PUBLIC_KEY);

    if (!payload) {
      return new Response('Invalid token', { status: 401 });
    }

    // Add verified claims to origin request
    const originRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers),
        'X-User-Id': payload.sub,
        'X-User-Roles': payload.roles.join(','),
      }
    });

    return fetch(originRequest);
  }
};
```

**Pattern 2: Edge SSR with Streaming**

Server-side rendering at the edge eliminates the latency of a round-trip to an origin SSR server. Combined with streaming (React's renderToReadableStream), the first byte of HTML is delivered from the nearest PoP within milliseconds.

```typescript
// Edge SSR with React streaming
import { renderToReadableStream } from 'react-dom/server';
import { App } from './app';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Fetch data in parallel (edge KV + edge DB)
    const [user, content] = await Promise.all([
      getUser(request),
      getContent(url.pathname)
    ]);

    const stream = await renderToReadableStream(
      <App user={user} content={content} />,
      { bootstrapScripts: ['/static/client.js'] }
    );

    return new Response(stream, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
```

**Pattern 3: Geo-Aware Routing**

Edge workers have access to request geolocation metadata (country, region, city, ASN). Use this for compliance routing, content localization, and regional failover without touching origin.

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const country = request.cf?.country as string;

    // EU data residency compliance
    const EU_COUNTRIES = new Set(['DE', 'FR', 'IT', 'ES', /* ... */]);
    if (EU_COUNTRIES.has(country)) {
      // Route to EU origin
      const euUrl = new URL(request.url);
      euUrl.hostname = 'eu.api.example.com';
      return fetch(new Request(euUrl, request));
    }

    // Default origin
    return fetch(request);
  }
};
```

**Pattern 4: Edge Caching with Programmatic Invalidation**

Use the Cache API for fine-grained, programmatic cache control at the edge. Cache responses with custom TTLs based on content type and invalidate specific cache entries on data mutation.

```typescript
async function cachedFetch(
  request: Request,
  ttl: number
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url);

  // Check cache
  let response = await cache.match(cacheKey);
  if (response) return response;

  // Fetch from origin
  response = await fetch(request);

  // Cache with TTL
  const responseToCache = new Response(response.body, response);
  responseToCache.headers.set(
    'Cache-Control',
    `public, max-age=${ttl}`
  );
  await cache.put(cacheKey, responseToCache);

  return response;
}
```

## When to Use / When NOT to Use

**Use edge computing when:**
- Global latency reduction is a primary product requirement (e-commerce, gaming, media)
- You need to enforce data residency rules without replicating full origin infrastructure
- Authentication, routing, or A/B testing adds unnecessary round-trips to your origin
- Your request volume is high and you need horizontal scale without managing server fleets
- Static or semi-static content can be cached and served without origin computation

**Do NOT use edge computing when:**
- Your computation requires more than 50-100ms CPU time (use serverless functions or containers)
- Your application is write-heavy (edge databases have strong consistency limitations)
- You need access to the local filesystem, specific runtimes (Java, Python native), or arbitrary system resources
- Your origin compute is already in the same region as your primary user base (edge adds complexity without proportional latency benefit)
- Your team lacks the expertise to manage a stateless, distributed execution model

**When centralized cloud is better:**
- Batch processing and analytics workloads that are not latency-sensitive
- Stateful, long-running computation (ML training, video encoding, scientific simulation)
- Applications where consistency is more important than latency (financial ledgers, inventory management)
- Teams with limited operational capacity — edge architectures add observability and debugging complexity

## Common Mistakes

**Mistake 1: Ignoring cold start vs. always-warm semantics**
V8 isolate cold starts are near-zero, but this is misleading. The first request to a PoP that hasn't served traffic recently still incurs initialization overhead. Warm PoPs handle requests in microseconds; cold PoPs may take 50-100ms on first request. Design for this variability in your latency SLOs.

**Mistake 2: Attempting stateful operations at edge**
Edge workers are stateless. Trying to maintain session state in worker memory across requests fails because the worker may run on a different PoP instance for each request. Use edge KV or edge databases for any state that must persist between requests.

**Mistake 3: Underestimating egress costs**
Edge computing reduces latency but does not eliminate egress costs. Data transferred from edge nodes to users is billed per GB. For media-heavy applications, edge caching reduces origin egress but the edge-to-user egress remains. Model costs carefully before committing to edge delivery for large payloads.

**Mistake 4: Debugging and observability neglect**
Edge workers run in distributed environments with limited logging infrastructure. Standard logging pipelines (write to disk, aggregate with Fluentd) do not apply. Use structured logging to a centralized sink (Cloudflare Logpush, Vercel Log Drains) from the start. Distributed traces are essential for understanding multi-tier edge + origin request flows.

**Mistake 5: Vendor lock-in underestimation**
Cloudflare Workers and Vercel Edge Functions are similar but not identical. The Workers API (fetch, cache, KV) is different from the Vercel runtime. WinterCG (Web-interoperable Runtimes Community Group) is working on standards, but portability today requires abstraction layers that add complexity. Evaluate lock-in risk before committing deeply to a single edge platform.

## Connections

- **Zero Trust Architecture (Article 4, this volume)**: Edge authentication is a natural zero trust enforcement point — validate identity and authorization at the network perimeter (the PoP) before any request touches internal infrastructure.
- **Serverless Architecture (Article 6, this volume)**: Edge functions are a form of serverless compute with stronger geographic distribution and lower cold start times. The operational model (no server management, per-invocation billing) is shared.
- **WebAssembly (Article 10, this volume)**: WASM is emerging as an alternative runtime for edge computing, enabling non-JavaScript code (Rust, C++, Go compiled to WASM) to run in edge worker environments with near-native performance.
- **Sustainable Architecture (Article 5, this volume)**: Edge computing reduces network transit distance, which reduces energy consumption per request. Serving static content from edge caches is more energy-efficient than round-tripping to origin for every request.

## Key Insights

1. **Edge is not a replacement for origin — it is a filter.** Well-architected edge layers eliminate unnecessary origin calls, not all origin calls. The goal is to serve the maximum percentage of requests at edge without sacrificing correctness or consistency. Writes and complex stateful operations still belong at origin.

2. **Zero cold start changes the economics.** Traditional serverless cold starts make sub-100ms latency SLOs difficult to guarantee. V8 isolate cold starts at the edge eliminate this problem. This changes the economic calculation for latency-sensitive applications that previously required always-on server infrastructure.

3. **Data gravity follows computation.** When you move computation to the edge, you discover that data gravity becomes the next constraint. Edge databases like D1, Turso, and Deno KV are the ecosystem's response — bringing data closer to edge compute. This trend will accelerate as edge databases mature.

4. **32.2% annual market growth reflects a genuine shift.** Edge computing's growth rate reflects the intersection of three trends: user expectations for sub-100ms experiences, regulatory pressure for data residency, and the maturation of edge platforms that make distributed compute operationally manageable. This is not a hype cycle — it is a structural change in where computation lives.

5. **The V8 isolate constraint is a feature.** Developers initially experience the stateless, resource-constrained V8 isolate execution model as a limitation. In practice, it enforces architectural discipline — stateless, fast, horizontally scalable code. Applications built to these constraints tend to be more reliable and cheaper to operate than those that fight them.

6. **Tiered architecture is the mature pattern.** Pure edge (everything at Tier 1) and pure origin (nothing at edge) are both suboptimal. The mature pattern — cache at Tier 1, light compute at Tier 2 regional hubs, writes and complex compute at Tier 3 origin — captures the latency benefits of edge while preserving the consistency and capability of centralized compute.
