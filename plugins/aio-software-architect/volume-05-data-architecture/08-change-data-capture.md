# Change Data Capture (CDC)

> "The database's replication log is a stream of every change made to the database. Change data capture is the process of observing all data changes written to a database and extracting them in a form in which they can be replicated to other systems." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

Every organization eventually reaches the same uncomfortable realization: their operational database is doing too many jobs. It serves the application — handling transactions, enforcing constraints, answering user-facing queries. It's also expected to serve analytics — feeding dashboards, reports, and machine learning pipelines. And it's supposed to keep caches, search indexes, and downstream microservices in sync with current state.

The naive approach to this multi-master problem is dual writes: when the application writes to the database, it also writes to Elasticsearch for search, to Redis for caching, to Kafka for downstream services. This works until it doesn't — which is the moment any one of those writes fails. Now your database has the new record, but Elasticsearch has the old version. Or the application crashes after writing to the database but before writing to Kafka. Your systems are inconsistent, and you don't know which one is the source of truth.

The fundamental problem is that dual writes cannot be made atomic across multiple systems without a distributed transaction — and distributed transactions across heterogeneous systems (PostgreSQL + Redis + Elasticsearch) are not practical. The moment you have two writes that must both succeed or both fail, but you're writing to two different systems without a shared transaction protocol, you have a consistency problem waiting to happen.

Change Data Capture (CDC) solves this at the source. Instead of writing to multiple systems simultaneously (and hoping all writes succeed), you write only to your primary database. CDC then reads the database's internal replication log — the ground-truth record of every committed change — and publishes those changes as an event stream. Every downstream system consumes that event stream independently. The database is the single source of truth; everything else is eventually consistent with it.

## Core Concept

### What CDC Does

Every relational database internally maintains a write-ahead log (WAL) or transaction log — a sequential record of every change applied to the database, used for crash recovery and replication. CDC reads this log and transforms each change into a structured event:

```
Database Change (PostgreSQL WAL entry):
  LSN: 0/16B3748
  XID: 497
  Operation: UPDATE
  Table: orders
  Old: {id: 123, status: "pending", updated_at: "2024-01-15T10:00:00Z"}
  New: {id: 123, status: "shipped", updated_at: "2024-01-15T14:23:45Z"}

CDC Event (published to Kafka):
  {
    "op": "u",                    // update
    "ts_ms": 1705325025000,       // when the change was committed
    "source": {
      "db": "ecommerce",
      "table": "orders",
      "lsn": "0/16B3748",
      "txId": 497
    },
    "before": {
      "id": 123,
      "status": "pending",
      "updated_at": "2024-01-15T10:00:00Z"
    },
    "after": {
      "id": 123,
      "status": "shipped",
      "updated_at": "2024-01-15T14:23:45Z"
    }
  }
```

The CDC event contains the full before/after state, the operation type (insert/update/delete), and metadata (database, table, transaction ID, LSN). Downstream systems can react to this event however they need: update a cache, index the new state in Elasticsearch, trigger a notification, update a read model.

### Debezium: The Dominant CDC Tool

Debezium is the most widely used open-source CDC tool. It supports PostgreSQL, MySQL, MongoDB, SQL Server, Oracle, and others. Debezium runs as a Kafka Connect connector — it reads the database's replication log and publishes events to Kafka topics.

**PostgreSQL CDC setup:**

PostgreSQL uses logical replication to expose its WAL as a structured stream. You must configure PostgreSQL with `wal_level = logical` and create a replication slot. The replication slot is a cursor in the WAL — Debezium advances it as it reads events, and PostgreSQL retains WAL entries until they've been consumed by the slot.

```sql
-- Enable logical replication (requires restart)
-- postgresql.conf: wal_level = logical

-- Create a publication (what tables to capture)
CREATE PUBLICATION debezium_pub FOR TABLE orders, users, products;

-- Debezium will create the replication slot automatically, but you can create manually:
SELECT pg_create_logical_replication_slot('debezium_slot', 'pgoutput');
```

```json
// Kafka Connect Debezium connector configuration
{
  "name": "postgres-cdc-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "secret",
    "database.dbname": "ecommerce",
    "database.server.name": "ecommerce",
    "plugin.name": "pgoutput",
    "publication.name": "debezium_pub",
    "slot.name": "debezium_slot",
    "table.include.list": "public.orders,public.users,public.products",
    "topic.prefix": "cdc",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.add.fields": "op,table,lsn",
    "key.converter": "io.confluent.kafka.serializers.KafkaAvroSerializer",
    "value.converter": "io.confluent.kafka.serializers.KafkaAvroSerializer",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "value.converter.schema.registry.url": "http://schema-registry:8081"
  }
}
```

Each table gets its own Kafka topic: `cdc.ecommerce.public.orders`, `cdc.ecommerce.public.users`, etc. The topic is partitioned by the primary key of the table, ensuring that all changes to a given row arrive in order.

### DynamoDB Streams

DynamoDB Streams is AWS's built-in CDC for DynamoDB. When enabled, every change to a DynamoDB table is captured and written to a stream that retains the last 24 hours of changes. Each stream record contains the item's primary key and, depending on the stream view type, the before/after images of the item.

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Orders')

# Enable streams on the table
client = boto3.client('dynamodb')
client.update_table(
    TableName='Orders',
    StreamSpecification={
        'StreamEnabled': True,
        'StreamViewType': 'NEW_AND_OLD_IMAGES'  # Capture full before/after
    }
)

# Lambda function triggered by DynamoDB Streams
def lambda_handler(event, context):
    for record in event['Records']:
        if record['eventName'] == 'MODIFY':
            old_image = record['dynamodb'].get('OldImage', {})
            new_image = record['dynamodb']['NewImage']
            # React to the change
            if old_image.get('status', {}).get('S') != new_image.get('status', {}).get('S'):
                handle_status_change(
                    order_id=new_image['orderId']['S'],
                    old_status=old_image.get('status', {}).get('S'),
                    new_status=new_image['status']['S']
                )
```

### The Outbox Pattern

CDC solves the dual-write problem for keeping external systems in sync with your database. But what if you need to publish events to Kafka as part of a business transaction, ensuring that the event is published if and only if the transaction commits?

The **Outbox Pattern** solves this:

1. Within the same database transaction that performs the business operation, write a record to an "outbox" table.
2. CDC captures changes to the outbox table and publishes them to Kafka.
3. After successful publication, the outbox record is deleted (or marked as processed).

```sql
-- Business transaction: update order status AND record the event atomically
BEGIN;

UPDATE orders SET status = 'shipped', updated_at = NOW() WHERE id = 123;

INSERT INTO outbox (
  id, aggregate_type, aggregate_id, event_type, payload, created_at
) VALUES (
  gen_random_uuid(),
  'Order',
  123,
  'OrderShipped',
  '{"orderId": 123, "shippedAt": "2024-01-15T14:23:45Z"}',
  NOW()
);

COMMIT;
-- If the commit succeeds, BOTH the order update AND the outbox record exist.
-- CDC will pick up the outbox record and publish the event.
-- If the commit fails, neither change persists.
```

```python
# CDC consumer processes outbox events and publishes to downstream Kafka topics
class OutboxRelay:
    def __init__(self, kafka_producer, target_topic_map):
        self.producer = kafka_producer
        self.topic_map = target_topic_map  # event_type -> kafka_topic

    def process_outbox_event(self, cdc_event: dict):
        if cdc_event['op'] != 'c':  # Only process INSERT operations
            return

        outbox_record = cdc_event['after']
        event_type = outbox_record['event_type']
        target_topic = self.topic_map.get(event_type)

        if not target_topic:
            raise ValueError(f"No topic configured for event type: {event_type}")

        self.producer.produce(
            topic=target_topic,
            key=outbox_record['aggregate_id'],
            value=outbox_record['payload'],
            headers={'event-type': event_type},
        )
        self.producer.flush()
        # Optionally: delete the outbox record to keep the table small
        # This can also be done by the CDC consumer via a database write
```

The outbox pattern guarantees exactly-once event publication (assuming the outbox relay is idempotent and uses Kafka's exactly-once semantics) by making event publication a consequence of database change, not a separate write.

### Event Sourcing vs CDC

Event sourcing and CDC are related but distinct patterns:

**Event Sourcing:** The application explicitly writes events as its primary data model. The events are the source of truth. Current state is derived by replaying events.

```
Event store (primary):
  OrderPlaced {orderId: 123, userId: 456, items: [...], total: 49.99}
  OrderConfirmed {orderId: 123, confirmedAt: "2024-01-15T10:01:00Z"}
  OrderShipped {orderId: 123, trackingNumber: "FX123456"}

Current state (derived by replaying events):
  {id: 123, status: "shipped", tracking: "FX123456", ...}
```

**CDC:** The application writes to a conventional database (tables, rows, SQL). CDC captures the changes to those tables as events for downstream systems. The tables are the source of truth; the events are derived from them.

```
Database (primary):
  orders table: {id: 123, status: "shipped", tracking: "FX123456"}

CDC events (derived from database changes):
  {op: "u", before: {status: "confirmed"}, after: {status: "shipped", tracking: "FX123456"}}
```

Event sourcing is a design choice that affects your entire application architecture. CDC is an operational pattern that you can apply to an existing database-centric application without changing application code. Both result in an event stream that downstream systems can consume.

The trade-off: event sourcing gives you rich, business-meaningful events (OrderShipped contains exactly what the business cares about). CDC gives you database-level events (row inserted/updated/deleted) which may not align with business semantics and may expose internal database structure.

### Schema Evolution in CDC

CDC events are consumed by multiple downstream systems. When you change your database schema (add a column, rename a column, change a data type), you must ensure downstream consumers are not broken. This requires careful schema evolution management.

**Confluent Schema Registry with Avro** is the standard solution for Kafka-based CDC pipelines. Each topic has a schema registered in the Schema Registry. Producers validate their messages against the schema before publishing; consumers validate on read. The Schema Registry enforces compatibility rules:

- **Backward compatible:** New schema can read data written with old schema (adding optional fields with defaults is backward compatible)
- **Forward compatible:** Old schema can read data written with new schema (removing fields is forward compatible)
- **Full compatible:** Both backward and forward compatible (the safest, most restrictive)

```json
// Avro schema v1
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "id", "type": "long"},
    {"name": "status", "type": "string"},
    {"name": "amount", "type": "double"}
  ]
}

// Avro schema v2 (backward compatible: added optional field with default)
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "id", "type": "long"},
    {"name": "status", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "currency", "type": "string", "default": "USD"}  // Safe addition
  ]
}
```

## Deep Dive

The replication log is the most underappreciated data structure in most organizations' infrastructure. Every relational database maintains a write-ahead log (WAL) or equivalent — PostgreSQL's WAL, MySQL's binlog, SQL Server's transaction log — as an internal mechanism for crash recovery and standby replication. This log is a complete, ordered, durable record of every committed change to the database since the last backup. Yet most organizations treat this log as an internal implementation detail, allowing it to be overwritten after the replication slot no longer needs it. CDC's fundamental insight, which Kleppmann emphasizes, is that this log is the most valuable stream your database produces, and throwing it away is a mistake.

The dual-write problem is one of the most insidious sources of data inconsistency in distributed systems, and it arises from a simple observation: you cannot atomically write to two different systems without a distributed transaction spanning both systems. When an application writes to PostgreSQL and then publishes to Kafka, two failures are possible: the write commits but the Kafka publish fails (Kafka has the old state), or the publish succeeds but the database write crashes before the commit (Kafka has a change that the database never applied). The outbox pattern resolves this by making the second write a write to the same database: the business record and the outbox event are committed in a single ACID transaction. CDC then reads the outbox table from the WAL — a single read from the single source of truth — and publishes to Kafka. The database's transactional guarantees become the event publication guarantees.

PostgreSQL's logical replication — the mechanism Debezium uses to read the WAL — deserves deeper examination than it usually receives. The WAL at the physical level records page-level changes: "page 47 at offset 128 was modified." This is useful for streaming to a physical standby (which has an identical copy of the storage layout) but not for external consumers who care about table rows. Logical replication adds a decoding layer that interprets the physical WAL in terms of the relational model: "row with id=123 in table orders had column status change from 'pending' to 'shipped'." The `pgoutput` plugin (PostgreSQL's native logical replication output) and `wal2json` (third-party) both implement this decoding. A replication slot is a cursor into the WAL that PostgreSQL retains for the consumer; it guarantees that no WAL segment is discarded until the slot has consumed it. This is both the mechanism and the hazard: an idle or slow consumer causes WAL retention to grow without bound, potentially filling the disk.

The outbox table accumulates a permanent record of every event ever published, which raises the question of cleanup. Two patterns exist. The first — delete the outbox row after publishing — keeps the table small but loses the history. The second — keep all outbox rows with a "published" flag — preserves history for auditing but requires periodic archival. Debezium's "outbox event router" transform handles the former: it consumes INSERT events from the outbox CDC stream and routes them to the appropriate Kafka topic, then the application deletes the row (or relies on a background cleanup process). The key invariant is that the CDC event for the outbox INSERT is the trigger for publication; once Kafka acknowledges the message, the outbox row is safe to delete.

Schema evolution in CDC pipelines is particularly treacherous because the WAL carries only the new value (and optionally the old value via `REPLICA IDENTITY FULL` in PostgreSQL) — it does not carry the schema at the time of the change. When you add a column to a table, new rows will include the new column, but old WAL entries for that table will not. Debezium handles this using the Confluent Schema Registry: every CDC event is tagged with a schema ID that describes the shape of the event. When the schema changes, a new schema version is registered. Consumers use the schema ID to deserialize each event against the correct schema version. The Schema Registry's compatibility rules (BACKWARD, FORWARD, FULL) determine which schema changes are allowed without explicit consumer updates. This is the same mechanism used for application-level Kafka events, applied automatically to database change events — a significant operational benefit of building on Kafka's schema management infrastructure.

## Implementation Guide

**End-to-end CDC pipeline: PostgreSQL → Debezium → Kafka → Elasticsearch:**

```yaml
# docker-compose.yml for local development
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    command: postgres -c wal_level=logical -c max_replication_slots=4 -c max_wal_senders=4
    ports:
      - "5432:5432"

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on: [zookeeper]
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    ports:
      - "9092:9092"

  schema-registry:
    image: confluentinc/cp-schema-registry:7.4.0
    depends_on: [kafka]
    environment:
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
    ports:
      - "8081:8081"

  kafka-connect:
    image: debezium/connect:2.4
    depends_on: [kafka, postgres]
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: debezium-connect
      CONFIG_STORAGE_TOPIC: debezium-configs
      OFFSET_STORAGE_TOPIC: debezium-offsets
      STATUS_STORAGE_TOPIC: debezium-statuses
    ports:
      - "8083:8083"
```

**Consumer that updates Elasticsearch from CDC events:**

```python
from confluent_kafka import Consumer
from elasticsearch import Elasticsearch
import json

class CDCElasticsearchSyncer:
    def __init__(self, kafka_config: dict, es_host: str, index_name: str):
        self.consumer = Consumer({
            **kafka_config,
            'group.id': f'es-syncer-{index_name}',
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': False,
        })
        self.es = Elasticsearch([es_host])
        self.index_name = index_name

    def sync(self, topic: str):
        self.consumer.subscribe([topic])
        batch = []

        while True:
            msg = self.consumer.poll(timeout=1.0)
            if msg is None:
                if batch:
                    self._flush_batch(batch)
                    batch = []
                continue

            if msg.error():
                print(f"Consumer error: {msg.error()}")
                continue

            event = json.loads(msg.value())
            op = event.get('op')
            doc_id = event['after']['id'] if op in ('c', 'u') else event['before']['id']

            if op == 'c' or op == 'u':
                batch.append({
                    'action': {'index': {'_index': self.index_name, '_id': doc_id}},
                    'document': event['after'],
                })
            elif op == 'd':
                batch.append({
                    'action': {'delete': {'_index': self.index_name, '_id': doc_id}},
                })

            if len(batch) >= 100:
                self._flush_batch(batch)
                batch = []
                self.consumer.commit()  # Only commit after successful ES write

    def _flush_batch(self, batch: list):
        body = []
        for item in batch:
            body.append(item['action'])
            if 'document' in item:
                body.append(item['document'])
        self.es.bulk(body=body, refresh=False)
        print(f"Synced {len(batch)} documents to Elasticsearch")
```

**Monitoring CDC pipeline health:**

```python
from prometheus_client import Gauge, Counter
import psycopg2

# Key metrics to track for CDC health
cdc_lag_bytes = Gauge('cdc_replication_lag_bytes', 'WAL bytes behind current position')
cdc_lag_seconds = Gauge('cdc_replication_lag_seconds', 'Seconds behind current WAL')
cdc_events_processed = Counter('cdc_events_total', 'Total CDC events processed', ['table', 'operation'])

def check_replication_slot_lag(conn):
    """Alert if CDC is falling behind — indicates consumer is slow or stuck."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT slot_name,
                   pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes,
                   extract(epoch FROM now() - pg_postmaster_start_time()) AS uptime_seconds
            FROM pg_replication_slots
            WHERE slot_name = 'debezium_slot'
        """)
        row = cur.fetchone()
        if row:
            slot_name, lag_bytes, _ = row
            cdc_lag_bytes.set(lag_bytes)
            # Alert if lag exceeds 100MB (indicates consumer is stuck)
            if lag_bytes > 100 * 1024 * 1024:
                send_alert(f"CDC slot {slot_name} is {lag_bytes / 1024 / 1024:.1f}MB behind")
```

## When to Use / When NOT to Use

**Use CDC when:**
- You need to keep multiple systems in sync with a primary database (cache, search index, analytics)
- You're migrating from a monolith to microservices and need to propagate state changes
- You're implementing the Outbox Pattern for reliable event publishing
- You need an audit trail of all database changes
- You're building a data warehouse or data lake from operational data

**Use Event Sourcing instead when:**
- Events are the primary data model, not a derived representation
- You need rich, business-meaningful events (not database row changes)
- Temporal queries (what was the state of X at time T?) are a primary use case

**Avoid CDC when:**
- Your database cannot support logical replication (very old versions, or hosted databases with restricted access)
- You need sub-millisecond propagation (CDC has inherent lag)
- Your schema changes too frequently for the schema evolution overhead to be manageable
- You have no downstream systems that need the change stream

## Common Mistakes

**Mistake 1: Not managing WAL retention when CDC falls behind.**
PostgreSQL's replication slot prevents the WAL from being cleaned up until the slot's consumer advances its position. If your CDC consumer is stopped for days, the WAL can grow to fill the entire disk, crashing the database. Always monitor replication slot lag and set `max_slot_wal_keep_size` to prevent unbounded WAL growth (at the cost of potentially losing the slot position if it falls too far behind).

**Mistake 2: Ignoring the initial snapshot.**
When you first set up CDC, you need to capture the current state of the database before you start streaming changes. Debezium handles this with an initial snapshot — it takes a consistent snapshot of the table and publishes each row as an INSERT event. This snapshot can take hours for large tables and must be handled carefully (the snapshot must be consistent with the change stream that follows).

**Mistake 3: Not making CDC consumers idempotent.**
CDC provides at-least-once delivery. Your consumer may process the same event twice (due to consumer restart, rebalancing, or Kafka retry). If updating Elasticsearch, use the document ID from the event as the Elasticsearch `_id` — upserts are naturally idempotent. If calling an API, ensure the API is idempotent or use a deduplication mechanism.

**Mistake 4: Treating CDC events as the application event model.**
CDC events reflect database changes: rows inserted, updated, deleted. These are not the same as application events: OrderPlaced, UserRegistered, PaymentProcessed. Downstream consumers that consume CDC events directly couple themselves to your database schema. Use the Outbox Pattern with explicit event schemas to decouple consumers from your database internals.

**Mistake 5: Running Debezium on a replica.**
Debezium can read from a PostgreSQL replica (using logical replication from the replica), but this is complex to configure and maintain. If the replica is promoted to primary, the Debezium connection must be reconfigured. For simplicity, read from the primary and accept the slight additional read load that the replication slot adds.

## Connections

- **Replication (01-replication.md):** CDC reads the database's replication log — the same log used for replication to read replicas. CDC is replication for external systems.
- **Stream Processing (06-stream-processing.md):** CDC feeds stream processing pipelines. The CDC stream from a database is the source for Flink or Kafka Streams jobs that transform and derive data.
- **Outbox Pattern:** The Outbox Pattern combines CDC with transactional consistency. Understanding both is necessary to implement reliable event-driven architectures.
- **Derived Data (12-derived-data.md):** All CDC consumers maintain derived data — views, caches, search indexes — that are derived from the primary database's state.
- **Schema Evolution (13-schema-evolution.md):** Schema changes in the source database must be propagated carefully through the CDC pipeline without breaking consumers.

## Key Insights

The most important insight about CDC is that it **solves the dual-write consistency problem by making database changes the single source of event truth**. Instead of two writes (database + Kafka) that can partially fail, you make one write (database) and derive the Kafka event from it. The database's ACID transaction guarantees that the outbox record and the business data either both commit or both roll back. This is transactional event publishing without a distributed transaction.

The second insight is that **the replication log is the most valuable data your database produces**. It's the complete, ordered, durable history of every change ever made. Most organizations discard this log (it's cleaned up by the database after it's no longer needed for replication) and then struggle to reconstruct history from query logs, application logs, or point-in-time backups. CDC makes the replication log a first-class data product.

The third insight is that **CDC enables strangler fig migrations at the data layer**. You can build a new microservice that reads the CDC stream from a legacy database, maintaining its own read model, without touching the legacy application code. As the new service matures, you can redirect writes to it and stop reading from the legacy stream. This is the safest way to migrate from a monolith to microservices — the legacy system continues to operate while the migration proceeds incrementally.

Finally, understand that **CDC lag is a fact of life, not a bug**. CDC events arrive after the database commit, with a delay that depends on network speed, Debezium throughput, and Kafka consumer throughput. Design your downstream systems to be eventually consistent with the primary database. If a consumer needs to read data immediately after a write (to verify it before displaying it to the user), read from the primary database, not from the CDC-derived store.
