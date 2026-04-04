# Derived Data — Views, Indexes, Caches as Projections

> "In a large application you often need to be able to access your data in several different ways. There is no one data store that is equally good at serving all the different access patterns that arise in practice. You therefore need to translate and transform data from one representation to another." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

A product catalog has 50 million items. The full-text search box needs items indexed by name, description, and tags in Elasticsearch. The category browse page needs items sorted by popularity within each category, available from Redis. The analytics dashboard needs daily item view counts from a columnar store. The recommendation engine needs co-purchase relationships in a graph database. And the canonical source of truth — the authoritative record of what each item actually is — lives in PostgreSQL.

You have one dataset and five representations of it. How do you keep all five in sync? How do you reason about which one is authoritative? What happens when a product is updated in PostgreSQL but the update hasn't yet propagated to Elasticsearch? How do you rebuild the Elasticsearch index from scratch after a schema change?

These questions are answered by thinking clearly about **derived data**: secondary representations of data that are computed from a source of truth and can be recomputed if they become stale or corrupted. Indexes, caches, materialized views, search indexes, read models in CQRS — all of these are derived data. They have different query characteristics than the source of truth, which is why they exist. But they must ultimately reflect the source of truth, which is why keeping them in sync is one of the central challenges of data-intensive systems.

The key insight is this: **there is no such thing as a secondary representation that maintains itself**. Every cache entry, every index row, every materialized view must be updated when the source data changes. The question is not whether to update them, but how: synchronously (as part of the write transaction), asynchronously (via events or CDC), or lazily (the first time they're read after invalidation). Each approach has different consistency guarantees and different operational characteristics.

## Core Concept

### The Source of Truth

Every data system needs a single source of truth — the authoritative record of what the data actually is. Everything else is derived from it.

```
Source of Truth:
  PostgreSQL orders table
  {id: 123, user_id: 456, status: "shipped", total_cents: 4999, created_at: "2024-01-15"}

Derived Representations:
  Redis cache:      order:123 -> {status: "shipped", total_cents: 4999}
  Elasticsearch:    index orders, doc 123 -> {user_id: 456, status: "shipped"}
  DynamoDB:         user:456/orders -> [{id: 123, status: "shipped", ...}]
  Analytics store:  daily_orders table -> {date: "2024-01-15", count: 1, revenue: 49.99}
  Search index:     inverted index on status -> "shipped": [123, 456, ...]
```

The source of truth is authoritative. When a derived representation disagrees with the source of truth (a cache hit returns a stale value, an index row points to a deleted record), the source of truth wins. The derived representation must be updated or invalidated.

What makes a good source of truth?

1. **Single writer:** Only one process (or transaction) can modify it at a time. This prevents concurrent conflicting updates.
2. **Durable:** Changes are persisted before being acknowledged. You never lose committed writes.
3. **Ordered:** Changes can be observed in a consistent order. This is necessary for deriving secondary representations correctly.
4. **Complete:** Contains all the information needed to reconstruct any derived representation.

An immutable event log (like Kafka with infinite retention) makes an excellent source of truth: it is append-only (single writer per partition), durable, ordered (within a partition), and complete (every historical state can be reconstructed by replaying events).

A relational database also works well as a source of truth for most applications: single writer via ACID transactions, durable via WAL, and complete by definition. The challenge is extracting changes from it (via CDC or polling) to feed derived systems.

### Materialized Views

A materialized view is a precomputed query result stored as a table. It is the canonical example of derived data in relational databases.

```sql
-- Source tables (source of truth):
CREATE TABLE order_items (
    order_id    BIGINT REFERENCES orders(id),
    product_id  BIGINT REFERENCES products(id),
    quantity    INT NOT NULL,
    price_cents BIGINT NOT NULL
);

-- Materialized view (derived, updated on demand):
CREATE MATERIALIZED VIEW product_revenue_summary AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.price_cents) AS total_revenue_cents,
    COUNT(DISTINCT oi.order_id) AS order_count
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name;

-- Index on the materialized view for fast lookups
CREATE UNIQUE INDEX ON product_revenue_summary(product_id);

-- Refresh the materialized view (regenerates from source tables)
REFRESH MATERIALIZED VIEW CONCURRENTLY product_revenue_summary;
```

The materialized view is derived from `products` and `order_items`. Whenever those tables change, the view becomes stale. `REFRESH MATERIALIZED VIEW CONCURRENTLY` recomputes the view without locking reads, but still requires scanning and recomputing the entire aggregation — which may take minutes for large tables.

For scenarios where incremental refresh is needed (not full recomputation), most relational databases don't support it natively. The solution is to maintain the aggregation incrementally via application logic or triggers, or to use a streaming aggregation system (Flink, Kafka Streams) that maintains the aggregation in a separate store.

### Search Indexes

Search indexes are derived data that trade write cost for query expressiveness. Elasticsearch maintains an inverted index — a map from each term to the list of documents containing it — as its primary data structure.

```
Source (PostgreSQL):
  products table: {id: 1, name: "Red Widget Pro", description: "A professional-grade widget"}

Derived (Elasticsearch inverted index):
  "red"         -> [doc_id: 1, position: 0]
  "widget"      -> [doc_id: 1, position: 1]
  "pro"         -> [doc_id: 1, position: 2]
  "professional" -> [doc_id: 1, position: 4]
  "grade"       -> [doc_id: 1, position: 5]
  ...
```

The Elasticsearch index is a derived representation optimized for text search queries that would be slow or impossible with a B-tree index in PostgreSQL. Building this index requires indexing every term in every document — a significant write amplification over the source data. But the index enables millisecond-latency full-text search across millions of documents.

Keeping the Elasticsearch index in sync with PostgreSQL is a classic derived data synchronization problem. The solutions:

1. **Dual write:** Application writes to both PostgreSQL and Elasticsearch atomically. Fails if Elasticsearch write fails (data diverges).
2. **CDC pipeline:** Debezium reads PostgreSQL WAL, publishes to Kafka, Elasticsearch consumer indexes from Kafka. Eventually consistent, but resilient.
3. **Polling:** Background job periodically queries PostgreSQL for recently modified records and reindexes them. Simple but has latency and may miss deletes.

### Caches as Derived Data

A cache is derived data optimized for access speed. Cache entries are projections of source data, pre-fetched and stored in fast memory (typically Redis or Memcached) to avoid repeated computation or database reads.

The critical insight: **every cache entry has an implicit "valid as of" timestamp**. It was valid when it was populated, and it remains valid until either the source data changes or the TTL expires. Cache invalidation — removing or updating cache entries when source data changes — is the hardest part of caching.

```python
from functools import wraps
import json
import redis

r = redis.Redis()

class DerivedDataCache:
    """
    Cache that treats cache entries as derived data with explicit versioning.
    Cache key includes the source data's version to enable precise invalidation.
    """

    def get_product(self, product_id: int) -> dict:
        # Cache key includes a "generation" that increments on any product change
        generation_key = f"product:{product_id}:generation"
        cache_key = f"product:{product_id}:data"

        generation = r.get(generation_key) or b"0"
        versioned_cache_key = f"{cache_key}:{generation.decode()}"

        cached = r.get(versioned_cache_key)
        if cached:
            return json.loads(cached)

        # Cache miss: fetch from source of truth
        product = db.fetchone("SELECT * FROM products WHERE id = %s", (product_id,))
        # Store with current generation
        r.setex(versioned_cache_key, 3600, json.dumps(product))
        return product

    def invalidate_product(self, product_id: int):
        # Increment generation — all existing cache entries become "stale" automatically
        # (their versioned keys no longer match the current generation)
        r.incr(f"product:{product_id}:generation")
        # Old versioned keys will naturally expire via TTL
        # New reads will use the new generation key and miss the cache, fetching fresh data
```

This pattern — versioned cache keys tied to the source data's version — enables O(1) cache invalidation without needing to track all cache keys for an entity. When the source changes, increment the version; old cache entries are immediately "stale" (the next read will miss the cache and fetch fresh data) without requiring explicit deletion.

### Read Models in CQRS

Command Query Responsibility Segregation (CQRS) is an architectural pattern that explicitly separates the write model (commands) from the read model (queries). The read model is derived data — a projection of the write model optimized for specific query patterns.

```
Write Side (Command Model):
  PostgreSQL with normalized relational schema
  Handles: create_order, confirm_order, ship_order, cancel_order
  ACID transactions, referential integrity, constraints

Read Side (Query Models — derived):
  Redis:          user_orders:{user_id} -> [recent orders list]
  Elasticsearch:  orders index -> searchable order details
  DynamoDB:       order_details:{order_id} -> full order with items
  Reporting DB:   daily_orders materialized view -> analytics aggregates

Event Bus (the bridge):
  OrderPlaced -> update all read models
  OrderShipped -> update all read models
  OrderCancelled -> update all read models
```

Each read model is optimized for its specific access pattern. The user's order list page reads from Redis (fast list). The full order detail page reads from DynamoDB (efficient key-value lookup). Search reads from Elasticsearch. Analytics reads from the reporting DB.

The event bus (Kafka, in practice) ensures all read models are updated when the write model changes. Each read model consumer processes events independently and maintains its own derived state. If a read model consumer fails, it can be restarted and replayed from the last committed offset.

### The Derivation Pipeline

The flow of data from source of truth to derived representations forms a derivation pipeline:

```
Source of Truth (PostgreSQL)
    |
    v
Change Data Capture (Debezium → Kafka)
    |
    +---> Stream Processor (Flink)
    |         - Enrichment (join with reference data)
    |         - Aggregation (compute summaries)
    |         - Filtering (route to correct consumers)
    |
    +---> Search Indexer (Elasticsearch consumer)
    |         - Index documents for full-text search
    |
    +---> Cache Invalidator (Redis consumer)
    |         - Invalidate or update cache entries
    |
    +---> Analytics Warehouse (Snowflake/BigQuery consumer)
              - Append to fact tables for analytics
```

This pipeline is event-driven: every change to the source of truth generates an event that propagates to all derived representations. The pipeline is **idempotent by design**: each consumer can process the same event multiple times without incorrect results (Kafka's at-least-once delivery means this is required).

## Deep Dive

The concept of derived data unifies what appear to be distinct engineering concerns — database indexing, caching, materialized views, search indexes, stream processing outputs, and data warehouse tables — under a single principle: every secondary representation is computed from a primary source of truth and can be recomputed if lost. Kleppmann develops this idea as one of DDIA's organizing themes, and its practical implication is powerful: if you always know which system is authoritative, recovery from any corruption or bug is straightforward. Fix the derivation logic, replay the source, regenerate the derived representation. The systems that lack this clarity — where both the operational database and the data warehouse have been independently modified, or where the cache is sometimes written directly rather than always derived from the database — cannot be recovered cleanly because there is no single authoritative source to replay.

The stream-table duality from stream processing theory has a direct application to derived data architecture. Every database table can be viewed as the fold of a stream of changes: the current state is the accumulated result of all inserts, updates, and deletes ever applied. Conversely, any mutation-enabled database produces a stream (the WAL) from which any past state can be reconstructed. This means the derivation pipeline from source-of-truth database to downstream representations is not architecturally special — it is just a specific instance of stream processing. A Flink job that reads Kafka CDC events and maintains a Redis read model is implementing the same computation as a database's internal index maintenance, just as a separate process with explicit latency. The practical consequences: the same correctness properties apply (idempotence, at-least-once vs exactly-once), the same failure modes exist (consumer lag, processing order), and the same testing techniques work (replay from offset 0 to rebuild).

CQRS (Command Query Responsibility Segregation) is the architectural pattern that makes derived data a first-class design concern rather than an operational afterthought. Fowler and Young introduced the pattern (building on Meyer's command-query separation principle) to address a specific problem: the write model and the read model of a domain often have radically different shapes. The write model is normalized, transactionally consistent, and optimized for constraint enforcement. The read model is denormalized, eventually consistent, and optimized for the specific query patterns of the UI. Attempting to use a single schema for both forces compromises: the schema is too normalized for fast reads (requiring joins) or too denormalized for safe writes (risking update anomalies). CQRS accepts this impedance mismatch as fundamental and builds separate models for each side, connected by a derivation pipeline. The write side is the source of truth; the read side is derived from it via events.

Materialized view maintenance — keeping a precomputed query result in sync with its source tables — comes in two forms with very different performance profiles. Full refresh recomputes the entire view from scratch: scan all source rows, apply all aggregations, write the result. For large tables, a full refresh may take minutes and locks the view during computation (or requires CONCURRENTLY, which runs two scans). Incremental refresh applies only the changes since the last refresh: given that 100 rows were inserted into `order_items`, update the 100 corresponding rows in the `product_revenue_summary` view. Incremental refresh is faster and produces lower latency, but it requires that the derivation function supports incremental computation — which is true for sums and counts (add the new values) but not for some aggregations (computing a new percentile requires seeing all values, not just the new ones). This is why stream processing frameworks like Flink and Kafka Streams support a subset of aggregation functions as "incrementally maintainable" and require special handling for others.

The replayability of a derivation pipeline is its most operationally important property, and it depends entirely on the source of truth retaining full history. An immutable event log with indefinite retention (Kafka with log compaction or archival to S3) enables replaying any derived representation from any point in history. A mutable database without CDC provides only the current state — if a downstream derived representation has a bug, you can recompute from the current state, but you cannot reconstruct what the state was three months ago when the bug was introduced. This is why data-intensive systems increasingly treat the event log as the primary source of truth rather than a side effect of the database, and the mutable database state as a derived representation of the log. Log-as-primary-truth allows any derived representation to be rebuilt correctly, not just to its current state but to any historical state needed for debugging or auditing.

## Implementation Guide

**Event-driven derived data synchronization:**

```python
from kafka import KafkaConsumer
from elasticsearch import Elasticsearch, helpers
import json
import logging

class ElasticsearchDerivedDataSyncer:
    """
    Consumes CDC events from Kafka and maintains Elasticsearch as a derived index.
    Exactly-once semantics: idempotent upserts using document ID from source.
    """
    def __init__(self, kafka_config: dict, es_host: str):
        self.consumer = KafkaConsumer(
            'cdc.ecommerce.public.products',
            **kafka_config,
            group_id='es-products-syncer',
            value_deserializer=lambda v: json.loads(v.decode()),
            enable_auto_commit=False,
        )
        self.es = Elasticsearch([es_host])
        self.batch_size = 100

    def run(self):
        batch = []
        for message in self.consumer:
            event = message.value
            action = self._build_es_action(event)
            if action:
                batch.append(action)

            if len(batch) >= self.batch_size:
                self._flush(batch)
                batch = []
                self.consumer.commit()  # Commit only after successful ES write

    def _build_es_action(self, event: dict) -> dict | None:
        op = event.get('op')
        if op in ('c', 'u', 'r'):  # create, update, read (snapshot)
            doc = event['after']
            return {
                '_op_type': 'index',
                '_index': 'products',
                '_id': str(doc['id']),  # Idempotent: same source ID = same ES doc
                '_source': {
                    'name': doc['name'],
                    'description': doc.get('description', ''),
                    'category': doc['category'],
                    'price_cents': doc['price_cents'],
                    'tags': doc.get('tags', []),
                    'updated_at': doc['updated_at'],
                },
            }
        elif op == 'd':  # delete
            return {
                '_op_type': 'delete',
                '_index': 'products',
                '_id': str(event['before']['id']),
            }
        return None

    def _flush(self, batch: list):
        successes, errors = helpers.bulk(self.es, batch, stats_only=False, raise_on_error=False)
        if errors:
            logging.error(f"ES bulk errors: {errors}")
            raise Exception(f"Failed to index {len(errors)} documents")
        logging.info(f"Indexed {successes} documents to Elasticsearch")


class IncrementalMaterializedView:
    """
    Maintains a derived aggregate table incrementally via event processing.
    Avoids full recomputation on each update (unlike REFRESH MATERIALIZED VIEW).
    """
    def __init__(self, db_conn):
        self.db = db_conn
        # Initialize the derived table if not exists
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS product_revenue_realtime (
                product_id    BIGINT PRIMARY KEY,
                units_sold    BIGINT NOT NULL DEFAULT 0,
                total_revenue BIGINT NOT NULL DEFAULT 0,
                order_count   BIGINT NOT NULL DEFAULT 0,
                last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

    def handle_order_item_created(self, product_id: int, quantity: int, price_cents: int):
        """Incrementally update the derived aggregate when a new order item is created."""
        self.db.execute("""
            INSERT INTO product_revenue_realtime (product_id, units_sold, total_revenue, order_count, last_updated)
            VALUES (%s, %s, %s, 1, NOW())
            ON CONFLICT (product_id) DO UPDATE SET
                units_sold    = product_revenue_realtime.units_sold + EXCLUDED.units_sold,
                total_revenue = product_revenue_realtime.total_revenue + EXCLUDED.total_revenue,
                order_count   = product_revenue_realtime.order_count + EXCLUDED.order_count,
                last_updated  = NOW()
        """, (product_id, quantity, quantity * price_cents))

    def handle_order_item_deleted(self, product_id: int, quantity: int, price_cents: int):
        """Reverse a previously counted order item (e.g., order cancelled)."""
        self.db.execute("""
            UPDATE product_revenue_realtime SET
                units_sold    = units_sold - %s,
                total_revenue = total_revenue - %s,
                order_count   = order_count - 1,
                last_updated  = NOW()
            WHERE product_id = %s
        """, (quantity, quantity * price_cents, product_id))
```

**Rebuilding derived data from scratch:**

```python
class DerivedDataRebuilder:
    """
    Rebuilds a derived representation from scratch by replaying all source events.
    Used when derived data is corrupted, after logic changes, or for new consumers.
    """
    def __init__(self, kafka_admin, consumer_factory):
        self.kafka_admin = kafka_admin
        self.consumer_factory = consumer_factory

    def rebuild_from_beginning(self, topic: str, sink_factory):
        """Replay all events from offset 0 to rebuild derived data."""
        # Create a fresh sink (new ES index, empty Redis namespace, truncated table)
        sink = sink_factory.create_fresh_sink()

        # Create a dedicated consumer that starts from the beginning
        consumer = self.consumer_factory.create(
            topic=topic,
            group_id=f'rebuild-{topic}-{int(time.time())}',  # Unique group = no offset tracking
            auto_offset_reset='earliest',
        )

        # Process all historical events
        last_message_time = time.time()
        for message in consumer:
            sink.process(message.value)
            last_message_time = time.time()

            # Detect end of stream: no new messages for 30 seconds
            # (More sophisticated: check that all partition offsets are caught up)
            if time.time() - last_message_time > 30:
                break

        # Atomically switch traffic to the new sink
        sink.promote_to_production()
        logging.info(f"Rebuild of {topic} complete. New sink is live.")
```

## When to Use / When NOT to Use

**Use materialized views when:**
- A query is expensive to compute (multi-table joins, aggregations) but the result is read frequently
- You need precomputed read performance for dashboards and reports
- The source data changes infrequently enough that periodic refresh is acceptable
- The view definition is stable (infrequent changes to the derivation logic)

**Use caches when:**
- A read is repeated many times with the same key and the result is expensive to compute
- Latency matters more than consistency (a few seconds of staleness is acceptable)
- The cache can be invalidated quickly when the source changes

**Use event-driven derived data when:**
- Multiple systems need to stay in sync with a source of truth
- You need near-real-time propagation (seconds, not minutes)
- You need the ability to replay events to rebuild derived representations

**Avoid all derived data when:**
- The source data changes so frequently that derived data is always stale
- The consistency requirement is strict (you cannot show stale data to the user)
- The derivation logic is so complex that maintaining it is harder than querying the source directly

## Common Mistakes

**Mistake 1: Not having a clear source of truth.**
Teams that use dual writes (writing to both PostgreSQL and Elasticsearch simultaneously) without designating one as the source of truth end up with two competing sources of truth. When they diverge (and they will), nobody knows which one is correct. Always designate one system as authoritative and treat all others as derived.

**Mistake 2: Rebuilding derived data by querying the derived system.**
If your Elasticsearch index is corrupted, do not rebuild it by reading from Elasticsearch — read from PostgreSQL (the source of truth). If your Redis cache is cold after a restart, do not rebuild it by reading from another cache — read from the database. Always rebuild derived data from the source, never from another derived representation.

**Mistake 3: Making cache invalidation eventual when strong consistency is required.**
A cache that reflects "what the product's price was 5 seconds ago" is appropriate for a search result page. It is catastrophic for a checkout page where the user is about to be charged. Know which operations require strong consistency and either skip the cache or use synchronous invalidation for those operations.

**Mistake 4: Not testing derived data rebuilds.**
Derived data systems need to be rebuilt when bugs are fixed, logic changes, or data is corrupted. If you've never tested the rebuild process, it will fail at the worst possible time. Include "rebuild from scratch" as a regular operational exercise. Time it, document it, and automate it.

**Mistake 5: Building too many derived representations.**
More derived representations means more systems to keep in sync, more failure modes, and more operational complexity. Each derived representation should be justified by a clear access pattern that cannot be efficiently served by the source of truth. Start with the minimum number of derived representations and add more only when you have evidence that the source cannot serve the required access pattern.

## Connections

- **Change Data Capture (08-change-data-capture.md):** CDC is the mechanism by which changes to the source of truth are propagated to derived representations. Understanding CDC is prerequisite to implementing event-driven derived data synchronization.
- **Stream Processing (06-stream-processing.md):** Stream processing maintains derived aggregations (like the incremental materialized view example) in real time. Kafka Streams and Flink are the standard tools for this.
- **Replication (01-replication.md):** Database read replicas are derived data — copies of the primary database optimized for read throughput. The same synchronization principles apply.
- **Batch Processing (07-batch-processing.md):** Batch jobs are one way to rebuild or refresh derived data. The Lambda architecture is an explicit recognition that derived data needs both real-time and batch layers.

## Key Insights

The most important insight is that **all secondary representations are derived data — even the ones you don't think of as derived**. Your database's B-tree indexes are derived from the table data. Your read replicas are derived from the primary. Your Redis cache is derived from your database. Your analytics warehouse is derived from your operational database. The moment you recognize this, you can apply the same principles to all of them: there is a source of truth; derived representations are kept in sync by a derivation pipeline; and if a derived representation is corrupted, it can be rebuilt from the source.

The second insight is that **the freshness of derived data is a consistency spectrum, not a binary**. Synchronous derivation (update the cache in the same transaction as the source write) provides the strongest consistency but adds latency and coupling. Asynchronous derivation (update the cache via an event after the source write) provides eventual consistency with lower latency and coupling. The right point on this spectrum depends on your use case: checkout flows need strong consistency; product recommendations can tolerate minutes of staleness.

The third insight is that **making derivation pipelines replayable is the most important operational property**. When a derived representation is wrong — whether due to a bug, a failed consumer, or corrupted state — the only reliable recovery path is to rebuild from the source. If your source of truth retains full history (an immutable event log with indefinite retention, or a database with time-travel capabilities), you can always rebuild. If the source discards history, recovery becomes partial or impossible.

Finally, understand that **the more derived representations you maintain, the more complex your system becomes**. Each derived representation is a system boundary — it must be kept in sync, monitored for lag, rebuilt when corrupted, and evolved when the data model changes. The best derived representations are the ones you don't need to build because you designed the source of truth to efficiently serve all required access patterns. Before building a derived representation, exhaust the options for making the source serve the access pattern — better indexes, materialized views, read replicas — before adding a new system.
