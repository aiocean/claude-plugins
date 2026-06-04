# Materialized View Pattern

> "The fastest query is the one you never have to run."

## The Problem

The product manager wants a dashboard: total revenue by region, by product category, by customer segment — updated every 5 minutes. Simple enough. You write the SQL: GROUP BY on orders, JOIN to products, JOIN to customers, SUM the amounts. On a small dataset it runs in 200 milliseconds. A year later, the orders table has 500 million rows. The same query now takes 4 minutes and kills the database for everything else running concurrently. You add an index. It helps somewhat. You add more indexes. The writes slow down. You add read replicas and route the query there. The replicas fall behind under load. The dashboard shows data that's 20 minutes stale.

This is the read performance problem that almost every data-intensive system eventually faces. The normalized relational model is excellent for writes — no redundancy, no anomalies, easy updates. But it is terrible for complex reads that require joining, aggregating, and filtering across millions of rows. The database must do the same expensive computation every single time the query runs, even when the underlying data hasn't changed.

The Materialized View pattern solves this by pre-computing expensive queries and storing their results. Instead of running the aggregation query at read time, you run it once (or periodically) and store the result in a dedicated table or object optimized for the read access pattern. Reads become trivial lookups. The cost of computation is paid at write time, not read time. You trade write complexity for read simplicity and speed.

## Core Concept

A materialized view is a stored query result. Unlike a regular database view (which is just a saved query that runs on demand), a materialized view pre-computes and physically stores the results.

```
NORMALIZED MODEL (optimized for writes):

orders table:          order_items table:       products table:
┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│ order_id     │      │ order_item_id   │      │ product_id   │
│ customer_id  │      │ order_id (FK)   │      │ category     │
│ created_at   │      │ product_id (FK) │      │ name         │
│ region       │      │ quantity        │      │ ...          │
└──────────────┘      │ unit_price      │      └──────────────┘
                      └─────────────────┘

Query: SELECT region, category, SUM(quantity * unit_price) AS revenue
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       JOIN products p ON oi.product_id = p.product_id
       GROUP BY region, category
       
Cost: Full scan + 2 joins + aggregation on every read.
With 500M rows: minutes of compute, heavy I/O.


MATERIALIZED VIEW (optimized for reads):

revenue_by_region_category:
┌─────────────────────────────────────────────┐
│ region    │ category    │ revenue  │ updated │
├─────────────────────────────────────────────┤
│ APAC      │ Electronics │ 4,200,000│ 10:05   │
│ APAC      │ Clothing    │ 1,100,000│ 10:05   │
│ EMEA      │ Electronics │ 7,300,000│ 10:05   │
│ ...                                         │
└─────────────────────────────────────────────┘

Query: SELECT revenue FROM revenue_by_region_category
       WHERE region = 'APAC' AND category = 'Electronics'

Cost: Single index lookup. Sub-millisecond.
```

### Refresh Strategies

The core trade-off in materialized views is freshness vs cost:

**Eager (synchronous) refresh:** The view is updated immediately when underlying data changes. Data is always current. Cost: every write triggers a view update, which can be expensive and slow down writes.

**Lazy (on-demand) refresh:** The view is refreshed when a read arrives and the view is stale. First read after a change is slow; subsequent reads are fast. Useful when reads are infrequent.

**Periodic (scheduled) refresh:** A background job refreshes the view on a schedule (every 5 minutes, hourly, nightly). Freshness is bounded by the schedule interval. Most common for analytics dashboards.

**Incremental refresh:** Only the changed portions of the view are recomputed, not the entire view. Requires tracking which source rows changed and knowing how to apply delta updates to the aggregation. The most complex to implement but the most efficient for large views.

```
Refresh Strategy Comparison:

Strategy     | Freshness      | Write Cost | Read Cost | Complexity
-------------|----------------|------------|-----------|----------
Eager        | Real-time      | High       | Very Low  | Medium
Lazy         | On-demand      | None       | Variable  | Low
Periodic     | Bounded (ttl)  | None       | Very Low  | Low
Incremental  | Near real-time | Medium     | Very Low  | High
```

## Deep Dive

**The derived data principle.** Martin Kleppmann's *Designing Data-Intensive Applications* frames materialized views as a specific instance of derived data — data that can be reconstructed from a primary source but is pre-computed for query efficiency. Kleppmann's central argument: in a data-intensive system, most data is derived. The question is not whether to create derived representations, but which ones to create and how to keep them consistent with the source. A materialized view is a derived dataset with a specific property: it is persisted, indexed, and queryable independently of the source. The source of truth is the primary data; the materialized view is a serving layer optimized for a specific read pattern. Kleppmann's treatment of batch and stream processing as tools for maintaining derived data provides the vocabulary: batch recomputation is simpler but provides stale results; stream processing provides near-real-time freshness but is more complex to operate.

**Incremental maintenance and the changelog.** The Google Bigtable paper and the subsequent Google Dataflow (Apache Beam) paper describe the technical mechanism for keeping materialized views fresh: the change feed. When a record in the source table is inserted, updated, or deleted, the change is published as an event. A stream processor subscribes to the change feed and applies the change to all downstream materialized views that incorporate the affected data. Kleppmann's treatment of stream processing in *DDIA* formalizes this as the "database inside-out" model: the write-ahead log (WAL) of the source database, when externalized as a change feed, becomes the integration backbone for maintaining all derived data. This model — change data capture (CDC) from the source, stream processing to maintain derived views — is the architecturally correct foundation for materialized view maintenance in a distributed system.

**The consistency window and stale reads.** Kleppmann's analysis of eventual consistency directly addresses the materialized view staleness problem. In a synchronous update model (the source database updates the materialized view within the same transaction), the view is always consistent — but this couples the write path to view update latency and creates cross-system transactions if the view is in a different store. In an asynchronous update model (change feed consumer updates the view after commit), the view is eventually consistent — there is always a window during which the view reflects an older state than the source. Kleppmann's treatment of bounded staleness and read-your-writes consistency provides the framework for reasoning about this window: how long can it be? What happens if a user reads the view immediately after writing to the source? Applications that use materialized views must explicitly account for this window, either by tolerating stale reads, by routing confirmation queries to the source (not the view), or by implementing optimistic UI updates.

**View invalidation versus incremental update.** The choice between full refresh and incremental update is not just a performance question — it is a correctness question. The AWS Builder's Library article "Avoiding insurmountable queue backlogs" provides the general principle: in a queue-based processing system, the processor must be able to catch up with the source faster than events arrive. For materialized views, this means the incremental update processor must be able to process change events faster than they are generated, or the view falls permanently behind. A full refresh avoids this problem (the view is rebuilt from scratch on a schedule) but at the cost of staleness proportional to the refresh interval. Kleppmann's analysis of stream processing fault tolerance applies: incremental processors must handle reprocessing (duplicate events, out-of-order events) correctly, or a processor restart causes incorrect view state. Idempotency of view update operations is not optional — it is a correctness requirement.

**Multiple views from the same source.** Greg Young's writings on CQRS (which the Materialized View pattern formally supports) identify the key operational advantage of the approach: multiple read models can be maintained from the same source, each optimized for a specific query pattern, without modifying the source. Sam Newman's *Building Microservices* extends this to the cross-service dimension: a single service's event stream can power materialized views owned by multiple downstream services. The order service publishes order events; the inventory service maintains a view of unfulfilled orders by product; the analytics service maintains a view of order revenue by region; the recommendation service maintains a view of co-purchased products. All three views are derived from the same event stream, owned by different teams, updated independently. This is the architectural pattern that enables true service autonomy — each service owns its read model and builds it from events, without requiring synchronous access to other services' data stores.
    }
}
```

## Implementation Guide

### Step 1: Identify Materialization Candidates

A good candidate for materialization:
- Runs frequently (dashboard queries, API endpoints called >100x/min)
- Is expensive (joins multiple large tables, aggregates millions of rows)
- Accesses data that changes much less frequently than it is read
- Has bounded acceptable staleness (5 minutes is often fine for analytics)

Poor candidates:
- Queries that need real-time data (stock prices, live sensor feeds)
- Queries with many distinct filter combinations (you'd need a view per combination)
- Queries against small datasets (the view overhead exceeds the benefit)

### Step 2: Design the Materialized Schema

Design the view schema around the read access pattern, not the source schema:

```sql
-- Source: normalized, write-optimized
CREATE TABLE orders (order_id, customer_id, region, created_at, ...);
CREATE TABLE order_items (item_id, order_id, product_id, qty, price, ...);
CREATE TABLE products (product_id, category, name, ...);

-- Materialized: denormalized, read-optimized
CREATE TABLE mv_daily_revenue (
  date        DATE,
  region      VARCHAR(50),
  category    VARCHAR(100),
  order_count INT,
  item_count  INT,
  revenue     DECIMAL(15,2),
  refreshed_at TIMESTAMP,
  PRIMARY KEY (date, region, category)
);
-- Index matches the query access pattern exactly
CREATE INDEX idx_mv_daily_revenue_region ON mv_daily_revenue(region, date);
```

### Step 3: Implement Refresh Logic

For periodic refresh (most common for analytics):

```sql
-- Full refresh procedure
CREATE OR REPLACE PROCEDURE refresh_daily_revenue()
LANGUAGE plpgsql AS $$
BEGIN
  -- Swap approach: compute into temp table, then atomic swap
  CREATE TABLE mv_daily_revenue_new AS
    SELECT 
      DATE(o.created_at) AS date,
      o.region,
      p.category,
      COUNT(DISTINCT o.order_id) AS order_count,
      SUM(oi.quantity) AS item_count,
      SUM(oi.quantity * oi.unit_price) AS revenue,
      NOW() AS refreshed_at
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    GROUP BY DATE(o.created_at), o.region, p.category;
    
  -- Atomic swap
  ALTER TABLE mv_daily_revenue RENAME TO mv_daily_revenue_old;
  ALTER TABLE mv_daily_revenue_new RENAME TO mv_daily_revenue;
  DROP TABLE mv_daily_revenue_old;
END;
$$;

-- Schedule with pg_cron or external scheduler
SELECT cron.schedule('0 */5 * * * *', 'CALL refresh_daily_revenue()');
```

### Step 4: Handle Eventual Consistency

Expose the view's freshness to consumers:

```typescript
interface RevenueView {
  data: RevenueByRegion[];
  refreshedAt: Date;
  isStale: boolean; // true if refreshedAt > staleness threshold
}

// API response includes staleness metadata
GET /api/analytics/revenue?region=APAC
Response:
{
  "data": [...],
  "meta": {
    "refreshed_at": "2024-01-15T10:05:00Z",
    "next_refresh_at": "2024-01-15T10:10:00Z",
    "is_stale": false
  }
}
```

### Step 5: CQRS Read Side

In CQRS architectures, the read side is entirely composed of materialized views. Each view is optimized for a specific query:

```
Write Side:                Read Side (materialized views):
  OrderService               order_summary_view (for order list)
  (writes to orders table)   order_detail_view (for order detail)
                             customer_order_history_view
                             revenue_dashboard_view
```

Event sourcing + materialized views: the event log is the source of truth; materialized views are computed projections from events:

```
Event: OrderPlaced { orderId, customerId, items, region, total }
  -> updates order_summary_view (add row)
  -> updates customer_order_history_view (prepend to customer's list)
  -> updates revenue_dashboard_view (increment region totals)
```

## When to Use / When NOT to Use

**Use when:**
- Read performance of aggregation queries is unacceptable on normalized data
- The same expensive query runs frequently with the same or similar parameters
- Acceptable staleness exists (even 1 minute is usually enough for analytics)
- CQRS read side needs optimized per-query schemas

**Do NOT use when:**
- Data must be real-time (financial transactions, live monitoring alerts)
- Write throughput is already constrained and eager refresh would worsen it
- The query has too many filter dimensions for pre-computation to be practical
- Data changes extremely frequently relative to read frequency (the view would be perpetually refreshing)

## Common Mistakes

**Mistake 1: Materializing too broadly.** Building one massive materialized view that satisfies every possible query. The view becomes almost as expensive to query as the original, and the refresh is prohibitively expensive. Build focused views for specific high-traffic access patterns.

**Mistake 2: Forgetting to expose staleness.** Consumers assume materialized view data is current. When the refresh job fails or is delayed, they make decisions on stale data without knowing it. Always expose `refreshed_at` and implement alerting when views are more stale than their SLA.

**Mistake 3: Synchronous refresh in the write path.** Updating the materialized view synchronously as part of the write transaction. This slows every write by the cost of the view update and creates a coupling between write and read concerns. Use asynchronous refresh (event-driven, scheduled) for all but the smallest views.

**Mistake 4: Not building indexes on the materialized view.** Pre-computing the data is only half the work. Without proper indexes on the view's access columns, reads on the view still do table scans. Design indexes based on how the view will be queried, not how the source data is indexed.

**Mistake 5: Treating materialized views as the source of truth.** Materialized views are derived data — projections of source data. Never write to them directly. Never use them as the authoritative record. They can always be reconstructed from the source. If you can't reconstruct the view from source data, you've used it as a source of truth.

## Connections

**CQRS**: The read side of CQRS is almost always implemented as materialized views. Events written on the command side are projected into views optimized for the query side.

**Event Sourcing**: The event log is the source of truth; materialized views are computed projections. Rebuilding views from the event log is a standard operation (replaying events).

**Gateway Aggregation** (Article 14): Gateway aggregation computes results at read time; materialized views pre-compute them at write time. When aggregation is expensive and the data is not real-time, materialized views are more efficient.

**Publisher-Subscriber** (Article 19): Materialized view refresh is often triggered by events published to a message bus. The view refresh logic subscribes to relevant domain events and updates the view incrementally.

**Sharding** (Article 23): Materialized views in sharded databases need careful placement. The view may need to aggregate across shards, which requires a dedicated shard or a scatter-gather query during refresh.

## Key Insights

1. **Materialized views are an explicit trade-off: write complexity for read simplicity.** You pay the cost of computation once at write time so every read is free. This trade-off makes sense when reads vastly outnumber writes and the computation is expensive.

2. **Derived data can always be rebuilt.** This is the fundamental safety property of materialized views: they are never the source of truth. You can always drop them and rebuild from source data. This makes them safe to experiment with, safe to change, and resilient to corruption.

3. **Staleness is a feature, not a bug.** For analytics dashboards, a 5-minute-stale view is almost always acceptable and dramatically simpler than real-time updates. Fight the impulse toward false precision — does the business actually need up-to-the-second revenue numbers, or does up-to-the-minute suffice?

4. **Database materialized views have synchronous refresh overhead.** Most relational database materialized views with synchronous refresh add overhead to every INSERT, UPDATE, and DELETE on the base tables. This is acceptable for small views but can be catastrophic for large ones. Measure the write overhead before committing to synchronous refresh.

5. **CQRS is the architecture-level version of materialized views.** Separating the read model from the write model is applying the materialized view insight at system architecture scale: write to a normalized model optimized for writes; read from denormalized projections optimized for specific queries.

6. **The view's schema should match the query, not the source.** Design materialized views backward from the query access pattern. If the dashboard queries by region and date, the view's primary key should be (region, date). Designing views that mimic the source schema misses the point.

7. **Incremental refresh is hard to implement correctly.** Full refreshes are simple but expensive; incremental refreshes are efficient but complex (you must correctly handle inserts, updates, and deletes to derived aggregations). Start with full refreshes. Migrate to incremental only when refresh cost becomes a bottleneck.
