# Cache-Aside Pattern

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

## The Problem

Your product catalog service queries PostgreSQL for every product detail page. At modest traffic, this works fine — the database handles it, query times are acceptable, everyone is happy. Then your Black Friday traffic arrives. Ten thousand concurrent users hitting the product page for the same popular item. Each request fires an identical SQL query: `SELECT * FROM products WHERE id = 'SKU-12345'`. The database — which is excellent at many things — was not designed to execute the same query ten thousand times per second. Response times climb. Connection pools exhaust. The database CPU maxes out. The product page goes down, along with your revenue.

The naive fix is to add more database replicas and distribute reads. This works up to a point, but it's expensive and still doesn't address the fundamental inefficiency: you're doing expensive computation (disk I/O, query parsing, row fetching) for data that almost certainly hasn't changed since the last request. The product description for SKU-12345 is the same for all ten thousand users. You computed it once; why are you computing it nine thousand nine hundred and ninety-nine more times?

Caching is the answer. But caching brings its own complexity. How do you populate the cache? When does data expire? What happens when the database changes — how does the cache know? What happens when a hundred concurrent requests all miss the cache at the same time and all hit the database simultaneously? The Cache-Aside pattern answers these questions with a specific strategy: the application is responsible for loading data into the cache on demand, and the cache is explicitly managed alongside (not integrated into) the data store.

## Core Concept

Cache-Aside (also called Lazy Loading) is the most widely-used caching strategy. The application is in full control of the cache. When the application needs data:

1. Check the cache first (cache hit → return data, done)
2. On cache miss, query the data store
3. Store the result in the cache
4. Return the data

On write:
1. Write to the data store
2. Invalidate (or update) the cache entry

```
READ PATH:
┌──────────┐    1. Check cache    ┌──────────┐
│   App    │──────────────────────▶│  Cache   │
│          │◀─ HIT: return data ───│  (Redis) │
│          │                      └──────────┘
│          │    2. Cache miss      ┌──────────┐
│          │──────────────────────▶│    DB    │
│          │◀─ data ───────────────│(Postgres)│
│          │                      └──────────┘
│          │    3. Populate cache  ┌──────────┐
│          │──────────────────────▶│  Cache   │
│          │    4. Return data     │  (Redis) │
└──────────┘                      └──────────┘

WRITE PATH:
┌──────────┐    1. Write to DB    ┌──────────┐
│   App    │──────────────────────▶│    DB    │
│          │                      └──────────┘
│          │    2. Invalidate      ┌──────────┐
│          │──────────────────────▶│  Cache   │
└──────────┘                      └──────────┘
```

The "aside" in Cache-Aside means the cache sits beside the data store — the application explicitly manages both. This contrasts with Read-Through, Write-Through, and Write-Behind caching, where the cache library or a caching proxy handles the population and synchronization automatically.

### Variants

**Read-Through**: The cache handles the miss automatically. On a miss, the cache itself calls the data store and populates. The application only ever talks to the cache. Good for simplicity, but you lose fine-grained control over what gets cached.

**Write-Through**: Every write goes to the cache first, then synchronously to the database. Cache is always populated. Trades write latency for read cache hit rates. Good when you have high read:write ratios.

**Write-Behind (Write-Back)**: Writes go to cache, return immediately, and the cache asynchronously flushes to the database. Excellent write performance. Risk: data loss if cache crashes before flush. Reserved for high-write workloads that can tolerate some data loss.

**Write-Around**: Writes bypass the cache entirely and go straight to the data store. Cache is only populated on read misses. Good for write-once data that is rarely re-read.

Cache-Aside is the default because it gives the application explicit control, works with any caching layer, and handles the cache being unavailable gracefully (application falls back to the database directly).

## Deep Dive

Cache-aside is the most fundamental caching pattern because it makes the application the explicit owner of cache policy. Understanding why this ownership matters — and the failure modes that arise from neglecting it — requires examining what caches actually guarantee and what they don't.

**The Facebook Memcached paper** ("Scaling Memcache at Facebook," NSDI 2013) is the most detailed public account of cache-aside at scale. The paper's central finding is that the cache miss storm — what they call a "thundering herd" — is not a theoretical concern but a routine production event. When a popular cache key expires, hundreds or thousands of concurrent requests miss simultaneously and all attempt to populate the cache from the database. The database, suddenly receiving the load that the cache had been absorbing, experiences a spike that can exceed its capacity. The paper documents two mitigations: lease tokens (a client that triggers a cache miss receives a lease token; other clients that miss must wait until the lease is fulfilled before querying the database) and probabilistic early expiration (recompute the cache slightly before expiry, based on observed computation time, to avoid synchronized expiration). Both require the application to own the cache — a transparent caching layer cannot implement these policies without application context.

**The Google SRE Book's treatment of caching** establishes the most important operational principle: the system must remain correct — not just available, but *correct* — when the cache is unavailable. If a cache outage exposes a bug (race condition, stale state assumption, incorrect fallback logic) that was previously hidden by the cache always being populated, you do not have a cache. You have a correctness dependency masquerading as a performance optimization. The SRE discipline is to test cache-unavailable behavior explicitly and regularly. Cache-aside makes this natural: the miss path is the same code path that runs on cold start, and correctness of that path is verifiable independently of the cache.

**Kleppmann's analysis in *Designing Data-Intensive Applications*** addresses the consistency model that cache-aside implies. Cache-aside with TTL-based expiration is *read-your-writes inconsistent*: a client that writes a value and then immediately reads it may see the old cached value until the TTL expires. This is a known consistency trade-off that must be explicitly accepted by the application design. For many use cases (product catalog, user preferences, public content), this bounded staleness is acceptable. For use cases where a user must immediately see the result of their own write (shopping cart, profile update, financial balance), the application must either invalidate the cache on write (not just let it expire) or use read-your-writes-consistent access patterns that bypass the cache immediately after a write.

**The cache key design problem** is underappreciated in most cache-aside implementations. A cache key that is too broad (keyed on user ID when the cached value includes permissions that can change) creates stale reads that are difficult to invalidate. A cache key that is too narrow (including query parameters that vary widely) creates a cache with a very low hit rate — most requests miss and the cache adds overhead without benefit. The correct granularity is the smallest unit that changes atomically. If a user's profile and their permissions change independently, cache them separately with separate keys. This allows precise invalidation when either changes.

**The write strategy choice** — invalidate on write vs update on write — has different failure mode profiles. Invalidation on write (delete the cache entry) is simpler and always correct: the next read will fetch fresh data. Update on write (write the new value to the cache at write time) requires the write to cache and the write to the database to be atomic, or you risk having the cache contain a value newer than the database. In distributed systems, this atomicity is expensive to guarantee. The recommended default is invalidate on write — accept the cache miss on the first read after a write, and rely on subsequent reads being served from cache.

## Implementation Guide

### Step 1: Basic cache-aside implementation

```typescript
class ProductRepository {
  constructor(
    private readonly redis: Redis,
    private readonly db: Database,
  ) {}

  async getProduct(productId: string): Promise<Product> {
    const cacheKey = `product:${productId}`;
    
    // 1. Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Product;
    }
    
    // 2. Cache miss — fetch from database
    const product = await this.db.query(
      'SELECT * FROM products WHERE id = $1',
      [productId],
    );
    
    if (!product) {
      // Don't cache null — or cache it briefly to prevent stampedes
      return null;
    }
    
    // 3. Populate cache with TTL
    await this.redis.setex(cacheKey, 300, JSON.stringify(product)); // 5 min TTL
    
    // 4. Return data
    return product;
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    // 1. Write to database
    await this.db.query(
      'UPDATE products SET ... WHERE id = $1',
      [productId, ...updates],
    );
    
    // 2. Invalidate cache
    await this.redis.del(`product:${productId}`);
  }
}
```

### Step 2: Handle the thundering herd / cache stampede

When a popular cache entry expires, hundreds of concurrent requests all miss the cache simultaneously and all hit the database. This is the "thundering herd" or "cache stampede" problem. Solutions:

**Approach 1: Probabilistic early expiration (PER)**

Re-compute the cache slightly before it expires, based on the computation time:

```typescript
async getProductWithPER(productId: string): Promise<Product> {
  const cacheKey = `product:${productId}`;
  const cacheEntry = await this.redis.get(`${cacheKey}:meta`);
  
  if (cacheEntry) {
    const { data, expiresAt, computeTime } = JSON.parse(cacheEntry);
    const ttlRemaining = expiresAt - Date.now();
    
    // PER formula: recompute if ttl < computeTime * beta * -ln(random())
    const beta = 1.0; // tune this
    const shouldRecompute = ttlRemaining < computeTime * beta * -Math.log(Math.random());
    
    if (!shouldRecompute) {
      return data;
    }
    // Fall through to recompute
  }
  
  const start = Date.now();
  const product = await this.db.fetchProduct(productId);
  const computeTime = Date.now() - start;
  
  await this.redis.setex(
    `${cacheKey}:meta`,
    300,
    JSON.stringify({ data: product, expiresAt: Date.now() + 300000, computeTime }),
  );
  
  return product;
}
```

**Approach 2: Lock-based recomputation (mutex)**

Only one request recomputes; others wait:

```typescript
async getProductWithMutex(productId: string): Promise<Product> {
  const cacheKey = `product:${productId}`;
  const lockKey = `lock:${cacheKey}`;
  
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Try to acquire lock (NX = only set if not exists, PX = expiry in ms)
  const acquired = await this.redis.set(lockKey, '1', 'NX', 'PX', 5000);
  
  if (acquired) {
    // We got the lock — fetch and populate
    try {
      const product = await this.db.fetchProduct(productId);
      await this.redis.setex(cacheKey, 300, JSON.stringify(product));
      return product;
    } finally {
      await this.redis.del(lockKey);
    }
  } else {
    // Another request is populating — wait briefly and retry
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.getProductWithMutex(productId); // retry
  }
}
```

### Step 3: Cache negative results

If `getProduct('nonexistent')` misses the cache and goes to the database, and you have many requests for nonexistent products, each one hits the database. Cache the negative result:

```typescript
const CACHE_NULL = '__NULL__';

async getProduct(productId: string): Promise<Product | null> {
  const cached = await this.redis.get(`product:${productId}`);
  
  if (cached === CACHE_NULL) return null;
  if (cached) return JSON.parse(cached);
  
  const product = await this.db.fetchProduct(productId);
  
  if (!product) {
    // Cache null result with shorter TTL (product might be created soon)
    await this.redis.setex(`product:${productId}`, 60, CACHE_NULL);
    return null;
  }
  
  await this.redis.setex(`product:${productId}`, 300, JSON.stringify(product));
  return product;
}
```

### Step 4: TTL strategy

TTL is the primary cache invalidation mechanism. Setting it requires understanding your data's characteristics:

```
Data type             Change frequency    Recommended TTL
──────────────────────────────────────────────────────────
Product price         Multiple times/day   60-300 seconds
Product description   Weekly              1-24 hours
User session          Per-login           Session duration
Exchange rates        Every minute        30-60 seconds
Static content        Rarely              24 hours - 7 days
User preferences      On user action      Until explicitly invalidated
```

Add jitter to prevent synchronized expiration:
```typescript
const baseTTL = 300; // 5 minutes
const jitter = Math.floor(Math.random() * 60); // 0-60 seconds
await redis.setex(key, baseTTL + jitter, value);
```

### Step 5: Handle cache unavailability gracefully

```typescript
async getProduct(productId: string): Promise<Product> {
  try {
    const cached = await this.redis.get(`product:${productId}`);
    if (cached) return JSON.parse(cached);
  } catch (cacheError) {
    // Cache is unavailable — log and fall through to database
    this.logger.warn('Cache unavailable, falling back to database', { cacheError });
    this.metrics.increment('cache.fallback');
  }
  
  const product = await this.db.fetchProduct(productId);
  
  try {
    await this.redis.setex(`product:${productId}`, 300, JSON.stringify(product));
  } catch (cacheError) {
    // Failed to populate cache — acceptable, just log
    this.logger.warn('Failed to populate cache', { cacheError });
  }
  
  return product;
}
```

The database is the source of truth. Cache is a performance optimization. The system degrades (becomes slower) when the cache is unavailable, but remains correct.

## When to Use

**Read-heavy workloads with relatively stable data.** Product catalogs, user profiles, configuration data — anything that is read orders of magnitude more often than it changes. The cache hit rate is high, so the miss path (database query) is rare.

**Expensive computation that is repeatedly needed.** Database queries with joins, aggregate computations, external API calls — anything where the cost of computation significantly exceeds the cost of cache lookup.

**When you need fine-grained control over what is cached.** Cache-aside lets you cache different types of data with different TTLs, skip caching for certain data, and control exactly when invalidation happens. Read-through caching does this automatically but with less control.

**When the cache being unavailable should degrade gracefully.** Cache-aside naturally degrades — the application falls back to the database. Read-through caching often fails if the cache is unavailable.

**Multi-layer caching scenarios.** Cache-aside works naturally with local (in-process) caches plus distributed caches. Check L1 (in-process), miss → check L2 (Redis), miss → check L3 (database). Each layer populates on miss.

## When NOT to Use

**When data changes very frequently.** If cache entries expire faster than they're read, you get poor hit rates and the overhead of cache management with none of the benefit. A product price that changes every second and is read once every five seconds has a 0% effective hit rate.

**When consistency is paramount.** Cache-aside with TTL-based expiration has a consistency window: data in the cache may be stale for up to TTL seconds after the database is updated. If stale reads are unacceptable, caching requires explicit invalidation on every write — which is complex and error-prone.

**When the data set is small enough to fit entirely in memory.** Some databases (Redis itself, H2, SQLite) can keep all data in memory. If your data fits in memory, the database is already essentially a cache. Adding another caching layer is redundant complexity.

**Write-heavy workloads.** If every request writes, cache entries are invalidated before they're read. Cache-aside only helps read performance. Write-through or write-around patterns are more relevant for write-heavy scenarios.

## Common Mistakes

**Mistake 1: Not adding TTL.** Caching without TTL means stale data lives forever. Always set a TTL. The question is how long, not whether.

**Mistake 2: Caching at the wrong granularity.** Caching a full "user dashboard" object (which includes data from five different sources) means invalidating it when any of the five change. Cache at finer granularity (cache user profile separately from user orders) so invalidation is precise.

**Mistake 3: Not handling the thundering herd.** High-traffic systems without stampede protection will hit the database hard on every cache expiration of popular entries. This is especially dangerous for entries with synchronized TTLs — add jitter.

**Mistake 4: Inconsistent serialization.** If you serialize objects to JSON for caching, ensure your deserialization handles schema evolution. A cached object from yesterday may have a different shape than what your current code expects. Version your cache keys when schemas change.

**Mistake 5: Using the cache as the source of truth.** The database is the source of truth. The cache is a copy. If the cache has data that the database doesn't (because you wrote to cache but then the database write failed), you have a consistency problem. Always write-database-first, then invalidate cache.

## Connections

**Circuit Breaker Pattern** (Volume 03, article 07): The cache and the circuit breaker complement each other. When the downstream service trips the circuit breaker, the cache can serve stale data rather than returning errors — a graceful degradation strategy.

**Bulkhead Pattern** (Volume 03, article 04): Cache the responses from bulkheaded dependencies. When the dependency is slow, the cached responses prevent the bulkhead from filling.

**Competing Consumers** (Volume 03, article 09): When processing messages that require fetching shared reference data (product catalog, user data), caching that reference data avoids redundant database queries across all consumer instances.

**CQRS** (Volume 03, article 11): The read side of CQRS is often implemented with a cache layer. Read models are pre-computed views optimized for reads — essentially materialized cache entries that are updated when the underlying events change.

**Event Sourcing** (Volume 03, article 13): Current state derived from event replay is expensive to compute on every read. Caching snapshots of current state (which are periodically updated by replaying new events) is a standard Event Sourcing optimization.

## Key Insights

1. **TTL-based expiration is eventual consistency.** Cache-aside with TTL means your system is eventually consistent with a bounded staleness window equal to the TTL. Design your application to accept this trade-off explicitly.

2. **Cache invalidation on write is stronger than TTL alone.** Explicitly invalidating cache entries on write reduces the staleness window from TTL seconds to milliseconds. Combine both: TTL as a safety net, explicit invalidation as the primary mechanism.

3. **The thundering herd is not theoretical.** Any high-traffic system with cache expiration will experience thundering herd. Add jitter to TTLs and implement mutex-based or probabilistic recomputation for high-traffic keys.

4. **Your cache must be a performance layer, not a correctness layer.** If your system is incorrect without the cache, you have a bug in your caching design. The database is always the source of truth.

5. **Negative result caching is often forgotten and often important.** If you serve 404 responses for nonexistent resources, and attackers or misbehaving clients request many nonexistent resources, each one hits the database without negative caching.

6. **Measure hit rates.** A cache with a 30% hit rate is adding complexity without much benefit. Aim for 90%+ hit rates for cache-aside to be worthwhile. If you can't achieve it, examine your TTL and invalidation strategy.

7. **Multi-layer caching compounds hit rates.** An L1 (in-process, 1ms) cache with 70% hit rate, plus an L2 (Redis, 5ms) cache with 80% hit rate on L1 misses, means only 6% of requests reach the database. Each layer multiplies the benefit.
