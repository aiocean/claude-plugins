# Schema Evolution & Compatibility

> "Schema changes are one of the most disruptive things you can do to a running system. The goal of schema evolution is to make those changes as smooth and transparent as possible — ideally invisible to running code that wasn't specifically updated to handle the change." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

You deploy version 1 of your application on a Tuesday. On Wednesday, you need to add a `phone_number` field to the users table. Simple enough: `ALTER TABLE users ADD COLUMN phone_number TEXT`. You deploy version 2. The migration runs. Done.

Except it's not done. Your Kafka topics contain user events that were serialized with version 1's schema — no `phone_number` field. Your data warehouse has a users table with version 1's schema. Your mobile app is still running version 1 (App Store review takes a week). Your analytics service reads user events from Kafka and deserializes them using version 1's schema — it works fine until a version 2 event arrives and blows up because the serialization code doesn't know what to do with a `phone_number` field.

This is the schema evolution problem: data at rest and data in motion has a schema, and that schema must change as your application evolves. But data doesn't all change simultaneously. You have events in Kafka written months ago. You have mobile clients that haven't been updated. You have services with different deployment cadences. Some code reads new schemas; some reads old schemas. The serialization layer must bridge all of these.

The problem is worse than it seems. In a microservices architecture with dozens of services, each service may be at a different version of a shared schema. In a Kafka-based event system, events from years ago must remain readable. In a database migration, you may have millions of rows that need to be updated (or not updated, if you can make the migration schema-compatible). Getting schema evolution wrong causes service outages, data corruption, and incidents at the worst possible times — during high-traffic periods when you're deploying a new feature.

## Core Concept

### Forward and Backward Compatibility

Two directions of compatibility matter:

**Backward compatibility:** New code can read data written by old code. If you add a field to your schema, old data (without that field) must still be readable by new code.

**Forward compatibility:** Old code can read data written by new code. If you add a field to your schema, new data (with that field) must still be readable by old code.

```
Timeline:

Code v1 writes: {id: 1, name: "Alice"}
Code v2 writes: {id: 2, name: "Bob", email: "bob@example.com"}

Backward compatibility: v2 can read v1's data (no email -> use null/default)
Forward compatibility:  v1 can read v2's data (ignore unknown email field)

Full compatibility: Both hold simultaneously.
```

In a rolling deployment, you always have a window where both v1 and v2 code is running simultaneously. During this window:
- v2 producers write new-format data
- v1 consumers must read new-format data (forward compatibility required)
- v2 consumers must read old-format data still in queues (backward compatibility required)

Full compatibility (both forward and backward) is the safest requirement. But not all schema changes can achieve full compatibility — breaking changes require careful migration strategies.

### Safe Schema Changes (Compatible)

These changes are safe to make without coordination:

**Adding an optional field with a default value:**
```
Before: {id: int, name: string}
After:  {id: int, name: string, email: string = null}

Old code: ignores the email field (forward compatible)
New code: provides null for email when reading old data (backward compatible)
```

**Removing a field that old code ignores:**
```
Before: {id: int, name: string, legacy_field: string}
After:  {id: int, name: string}

Old code: provides null for legacy_field (forward compatible — field doesn't exist)
New code: ignores legacy_field in old data (backward compatible)
```

**Renaming a type alias (not a field name):**

Safe in some formats (Avro with aliases) but requires care.

### Breaking Schema Changes (Incompatible)

These changes break compatibility and require migration strategies:

**Removing a required field:**
```
Before: {id: int, name: string, email: string}  # email is required
After:  {id: int, name: string}

Old code writing new data: leaves out email.
New code reading old data: where's email? (backward incompatible)
```

**Renaming a field:**
```
Before: {id: int, user_name: string}
After:  {id: int, name: string}

Old code reading new data: looks for user_name, finds name instead (forward incompatible)
New code reading old data: looks for name, finds user_name instead (backward incompatible)
```

**Changing a field's type in an incompatible way:**
```
Before: {id: int, amount: integer}
After:  {id: int, amount: string}  # Changed type!

Old code reading new data: tries to parse string as integer (forward incompatible)
```

### Avro — Schema Evolution Done Right

Apache Avro is a binary serialization format designed specifically for schema evolution. Avro schemas are defined in JSON:

```json
// Schema v1 (writer schema)
{
  "type": "record",
  "name": "User",
  "namespace": "com.example",
  "fields": [
    {"name": "id", "type": "long"},
    {"name": "name", "type": "string"}
  ]
}

// Schema v2 (writer schema — adds optional email with default)
{
  "type": "record",
  "name": "User",
  "namespace": "com.example",
  "fields": [
    {"name": "id", "type": "long"},
    {"name": "name", "type": "string"},
    {"name": "email", "type": ["null", "string"], "default": null}
  ]
}
```

Avro's key innovation: **schema resolution at read time**. When reading data, Avro applies both the writer schema (what schema was used to write the data) and the reader schema (what schema the reading code expects). Avro resolves the differences:

```
Reading v1 data with v2 reader schema:
  v1 data has: {id: 1, name: "Alice"}
  v2 reader expects: {id, name, email}
  Resolution: email is missing in v1 data -> use default (null)
  Result: {id: 1, name: "Alice", email: null}

Reading v2 data with v1 reader schema:
  v2 data has: {id: 2, name: "Bob", email: "bob@example.com"}
  v1 reader expects: {id, name}
  Resolution: email is unknown in v1 schema -> ignore it
  Result: {id: 2, name: "Bob"}
```

Avro handles field reordering, optional fields with defaults, and type promotions (int to long, float to double). It does not handle field renaming or required field removal without explicit aliases.

**Avro aliases for field renaming:**
```json
{
  "name": "name",
  "type": "string",
  "aliases": ["user_name"]  // Old name -> new name mapping
}
```

When reading data written with `user_name`, Avro's schema resolution uses the alias to map it to `name`. This allows field renaming without breaking backward compatibility.

### Protocol Buffers — Tagged Fields for Evolution

Protocol Buffers (Protobuf), Google's binary serialization format, handles schema evolution through **field numbers** (tags). Each field in a Protobuf message has a unique integer tag. The binary format uses these tags to identify fields, not field names.

```protobuf
// user.proto v1
message User {
  int64 id = 1;
  string name = 2;
}

// user.proto v2 — added email
message User {
  int64 id = 1;
  string name = 2;
  string email = 3;  // New field, new tag number (3)
}
```

**Safe Protobuf changes:**
- Add optional fields with new tag numbers (unknown tags are ignored by old code)
- Remove optional fields (missing fields are treated as default values)
- Rename fields (names are irrelevant in binary format — only tag numbers matter)

**Unsafe Protobuf changes:**
- Reuse tag numbers (catastrophic: old data's field is reinterpreted as new field's type)
- Change a field's type (if wire types are incompatible)
- Remove required fields (old code will reject messages without required fields)

The golden rule of Protobuf evolution: **never reuse a tag number**. If you remove a field, mark its tag as `reserved` to prevent future misuse:

```protobuf
message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  reserved 4;  // old_phone_number was here — never reuse tag 4
  reserved "old_phone_number";
}
```

### JSON Schema Evolution

JSON has no native binary format, and field names are preserved in the wire format. JSON Schema can validate JSON documents but doesn't provide automatic schema resolution like Avro.

JSON's evolution rules are looser:
- Adding fields: safe (old code ignores unknown fields if written to do so)
- Removing fields: safe only if no consumer requires the field
- Renaming fields: always breaking
- Changing types: breaking if the new type is incompatible

The challenge with JSON schema evolution is enforcement: without a schema registry and validation at the producer, producers can write invalid JSON that breaks consumers in unexpected ways. JSON Schema validation at the producer side is the minimum discipline required.

### The Schema Registry

In a Kafka-based system with many producers and consumers, managing schema evolution across dozens of services requires a **Schema Registry** — a centralized repository of schemas with compatibility checking.

Confluent Schema Registry is the standard implementation. Every Avro (or Protobuf or JSON Schema) message produced to Kafka includes a schema ID. Before producing, the producer registers the schema with the registry (or verifies the schema is already registered). Before consuming, the consumer fetches the schema for the schema ID in the message.

```
Producer flow:
  1. Serialize data using current schema (v2)
  2. Register schema v2 with Schema Registry (or verify it's registered)
     -> Registry checks compatibility: is v2 backward compatible with v1?
     -> If not: reject registration, throw error, deployment fails before any data is written
  3. Include schema_id=42 in message header
  4. Publish to Kafka

Consumer flow:
  1. Read message from Kafka
  2. Extract schema_id=42 from header
  3. Fetch schema v2 from Schema Registry (cached after first fetch)
  4. Deserialize message using schema v2 + consumer's current schema (v1 or v2)
  5. Process
```

The Schema Registry enforces compatibility rules at registration time. If a new schema is incompatible with the existing schema for that subject, registration fails — before any data is written. This shifts the detection of schema evolution errors from runtime (service outage) to deploy time (blocked deployment).

Compatibility modes in Confluent Schema Registry:
- **BACKWARD:** New schema can read old data (default)
- **FORWARD:** Old schema can read new data
- **FULL:** Both BACKWARD and FORWARD (most restrictive, safest)
- **BACKWARD_TRANSITIVE:** New schema can read all previous schemas (not just previous one)
- **NONE:** No compatibility checking (dangerous, only for development)

### Database Migrations — Expand-Contract Pattern

Relational databases require schema migrations for structural changes. The naive approach is to run an ALTER TABLE that adds, removes, or modifies columns. For small tables, this is fine. For large tables (hundreds of millions of rows), it can lock the table for minutes or hours and cause production outages.

The **expand-contract pattern** (also called parallel change or double-write migration) makes database schema changes without downtime:

**Phase 1 — Expand:** Add the new schema element (column, table, index) without removing the old one. Both old and new schemas coexist. All code writes to both and reads from the old.

```sql
-- Phase 1: Add new column (non-breaking, instant for most databases)
ALTER TABLE users ADD COLUMN full_name TEXT;
```

**Phase 2 — Migrate:** Backfill the new column with data derived from the old columns. Run this in batches to avoid locking.

```python
# Batch backfill: update 1000 rows at a time to avoid lock contention
def backfill_full_name(db, batch_size=1000):
    last_id = 0
    while True:
        rows_updated = db.execute("""
            UPDATE users SET full_name = first_name || ' ' || last_name
            WHERE id > %s AND full_name IS NULL
            LIMIT %s
        """, (last_id, batch_size))
        if rows_updated == 0:
            break
        last_id = db.fetchone("SELECT MAX(id) FROM users WHERE full_name IS NOT NULL")[0]
        time.sleep(0.1)  # Reduce lock contention
```

**Phase 3 — Deploy new code:** Deploy application code that reads from the new column (full_name) and writes to both old (first_name + last_name) and new (full_name) columns.

**Phase 4 — Contract:** Once all code uses the new column and all rows are backfilled, remove the old columns. This is safe because no code reads from them anymore.

```sql
-- Phase 4: Remove old columns (safe — no code uses them)
ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
```

The total elapsed time for this migration may be weeks (from expand to contract). But at no point is there a production outage or a compatibility break.

## Deep Dive

Avro's schema resolution at read time — applying both the writer schema (used when the data was written) and the reader schema (expected by the current reading code) simultaneously — is the mechanism that makes it uniquely suited for long-lived event streams. When you read an Avro-serialized record, the Avro library compares the writer schema (retrieved from the Schema Registry using the schema ID embedded in the message) with the reader schema (the code's current expected structure) and builds a translation table: for each field in the reader schema, either find it in the writer schema (use the value), or apply the reader schema's default (if the field is new and the writer schema lacks it), or ignore it (if the writer schema has extra fields the reader doesn't need). This bidirectional resolution is what makes adding an optional field backward-compatible without any coordination: old readers receive the new field and ignore it; new readers receive old data without the field and use the default. No deployment coordination required — the schema registry's compatibility check is the coordination.

Protocol Buffers' tag-based wire format achieves a similar goal through a different mechanism. Field names do not appear in the binary encoding; only tag numbers (small integers) and wire types (varint, fixed64, etc.) are transmitted. When a new field is added with a new tag number, old code sees it as an unknown field and ignores it (proto3 silently drops unknown fields; proto2 preserves them in an "unknown fields" set). When a field is removed, old data still has the bytes for that tag; new code ignores them as unknown fields. The critical safety rule — never reuse a tag number — exists because reusing a tag would cause the new field's bytes to be interpreted with the old field's type, producing silent data corruption. The `reserved` keyword in proto syntax prevents accidental reuse by making removed tags permanently off-limits. Protobuf's field-renaming safety (names are irrelevant to binary encoding) is a practical advantage over Avro for large codebases with many refactors — you can rename `user_name` to `name` in the .proto file and in generated code without breaking binary compatibility.

The expand-contract (parallel change) pattern applies a general principle from database refactoring (Ambler and Sadalage, 2006) to any schema change: never perform a breaking change in a single step. Instead, expand the schema to support both old and new structures simultaneously, migrate data and code to use the new structure, then contract by removing the old structure. For a database column rename, the expansion adds the new column, the migration backfills it and deploys code that writes to both columns, and the contraction removes the old column only after verifying no code reads it. The key insight is that the expansion and contraction deployments can happen weeks apart, with normal deployments in between. At no point is there a deployment that simultaneously changes schema and changes code, which is the source of most schema-evolution-related outages. The pattern requires patience — you deploy more times — but each deployment is smaller and safer.

The Schema Registry's compatibility check at registration time is an instance of shifting error detection left in the development lifecycle. A schema change that breaks a consumer is either discovered when a producer registers an incompatible schema (build-time failure, no data yet written), when a consumer fails to deserialize a message (runtime failure, already in production), or never (if the consumer silently corrupts data). The Schema Registry catches it at the first point, before any incompatible data reaches Kafka. This is analogous to type checking in a statically typed language: the type checker rejects incompatible operations at compile time rather than at runtime. The Schema Registry is a type checker for your event stream's schema, and like type checking, it is most valuable in systems with many producers and consumers that evolve independently.

The rolling deployment problem is the most underappreciated source of schema evolution bugs. During a deployment from v1 to v2, both v1 and v2 application instances are running simultaneously. If v2 introduces a new required field — a field that v2 always writes and always reads — then any v1 instance writing records that v2 instances read will produce records without the required field. v2's deserialization fails. The fix is never to make a field required in a single deployment; instead, first deploy v2 that treats the field as optional (reads it if present, provides a default if absent), then after all v1 instances are drained, deploy v3 that treats the field as required. This is the expand-contract pattern applied to field presence: expand by making the field optional in the new code, contract by making it required only after the old code is gone. Two deployments where one seems like it should suffice — but the rolling deployment window makes the two-step approach mandatory for correctness.

## Implementation Guide

**Setting up Confluent Schema Registry with Avro:**

```python
from confluent_kafka.avro import AvroProducer, AvroConsumer
from confluent_kafka.avro.cached_schema_registry_client import CachedSchemaRegistryClient
import fastavro
import io

# Producer: registers schema and validates before publishing
def create_avro_producer(bootstrap_servers: str, schema_registry_url: str):
    schema_registry_conf = {'url': schema_registry_url}
    return AvroProducer(
        {
            'bootstrap.servers': bootstrap_servers,
            'schema.registry.url': schema_registry_url,
        },
        default_value_schema=USER_SCHEMA_V2
    )

USER_SCHEMA_V2 = {
    "type": "record",
    "name": "User",
    "fields": [
        {"name": "id", "type": "long"},
        {"name": "name", "type": "string"},
        {"name": "email", "type": ["null", "string"], "default": None}
    ]
}

def produce_user(producer: AvroProducer, user: dict):
    # Schema Registry validates compatibility before allowing this schema to be used
    producer.produce(topic='users', value=user)
    producer.flush()

# Consumer: reads with its own (potentially older) schema
def create_avro_consumer(bootstrap_servers: str, schema_registry_url: str):
    return AvroConsumer({
        'bootstrap.servers': bootstrap_servers,
        'group.id': 'user-processor',
        'schema.registry.url': schema_registry_url,
        'auto.offset.reset': 'earliest',
    })
```

**Enforce compatibility rules programmatically:**

```python
import requests

class SchemaCompatibilityChecker:
    def __init__(self, registry_url: str):
        self.base_url = registry_url

    def check_compatibility(self, subject: str, new_schema: dict) -> bool:
        """Returns True if new_schema is compatible with the latest registered schema."""
        response = requests.post(
            f"{self.base_url}/compatibility/subjects/{subject}/versions/latest",
            json={"schema": str(new_schema)},
            headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
        )
        if response.status_code == 404:
            return True  # No previous schema — always compatible
        response.raise_for_status()
        return response.json().get("is_compatible", False)

    def set_compatibility_mode(self, subject: str, mode: str):
        """Set compatibility mode: BACKWARD, FORWARD, FULL, NONE"""
        requests.put(
            f"{self.base_url}/config/{subject}",
            json={"compatibility": mode},
            headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
        ).raise_for_status()

# Integrate into CI/CD pipeline
def ci_schema_check(schema_file: str, subject: str, registry_url: str):
    import json
    with open(schema_file) as f:
        new_schema = json.load(f)

    checker = SchemaCompatibilityChecker(registry_url)
    if not checker.check_compatibility(subject, new_schema):
        print(f"ERROR: Schema change in {schema_file} is incompatible with {subject}")
        print("Run backward/forward compatibility analysis before merging.")
        exit(1)
    print(f"Schema {schema_file} is compatible with {subject}. Proceeding.")
```

**Safe database migration with zero downtime:**

```python
import psycopg2
import time
import logging

class ZeroDowntimeMigration:
    def __init__(self, db_dsn: str):
        self.dsn = db_dsn

    def add_column_with_default(self, table: str, column: str, col_type: str, default):
        """Add a column with a server-side default without locking the table."""
        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor() as cur:
                # In PostgreSQL 11+, ADD COLUMN with a non-volatile default
                # does NOT rewrite the table — it's instant.
                # For older versions or computed defaults, use the two-step approach below.
                cur.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN IF NOT EXISTS {column} {col_type} DEFAULT %s
                """, (default,))
            conn.commit()
        logging.info(f"Added column {column} to {table}")

    def backfill_column(self, table: str, id_column: str, set_clause: str,
                        batch_size: int = 5000):
        """Backfill a column in batches to avoid lock contention."""
        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(f"SELECT MAX({id_column}) FROM {table}")
                max_id = cur.fetchone()[0]
                if not max_id:
                    return

            batch_start = 0
            total_updated = 0
            while batch_start <= max_id:
                with conn.cursor() as cur:
                    cur.execute(f"""
                        UPDATE {table} SET {set_clause}
                        WHERE {id_column} > %s AND {id_column} <= %s
                    """, (batch_start, batch_start + batch_size))
                    rows_updated = cur.rowcount
                conn.commit()
                total_updated += rows_updated
                batch_start += batch_size
                logging.info(f"Backfilled {total_updated} rows (up to id {batch_start})")
                time.sleep(0.05)  # Brief pause to reduce I/O pressure

        logging.info(f"Backfill complete: {total_updated} total rows updated")
```

## When to Use / When NOT to Use

**Use Avro when:**
- You're building a Kafka-based event pipeline with multiple producers and consumers
- Schema evolution is expected and must be managed over a long period
- You need compact binary serialization with full schema evolution support
- You're using Confluent's ecosystem (Kafka, Schema Registry, Kafka Connect)

**Use Protobuf when:**
- You're building gRPC services (Protobuf is gRPC's native format)
- You need very compact binary serialization
- You're in a polyglot environment (Protobuf has excellent code generation for all major languages)
- Schema evolution is frequent but controlled (single team owns the proto files)

**Use JSON Schema when:**
- Your consumers are REST APIs or browsers that need human-readable format
- You need schema validation but not binary serialization
- Your team is more comfortable with JSON tooling than binary formats

**Use expand-contract for database migrations when:**
- The table has more than a few million rows
- You cannot afford downtime
- The change involves renaming or restructuring columns

**Use simple ALTER TABLE when:**
- The table is small (under a million rows)
- The change is additive only (adding a nullable column with a default)
- You're in a development environment where downtime is acceptable

## Common Mistakes

**Mistake 1: Using NONE compatibility mode in Schema Registry "just for now."**
Disabling compatibility checking to ship quickly seems reasonable. It never gets re-enabled. Six months later, producers are writing schemas that break consumers, consumers are crashing in production, and nobody knows which schema version is correct. Start with BACKWARD or FULL compatibility from day one and never disable it.

**Mistake 2: Renaming fields in Protobuf thinking it's safe because names don't matter.**
In the binary format, Protobuf uses tag numbers, not names. Renaming a field in the .proto file is safe for the binary format — but the generated code uses the new field name, and all code that references the old field name by the proto-generated accessor must be updated. If the protobuf is also used for JSON serialization (proto3's JSON mapping uses field names), renaming breaks JSON consumers. Test all serialization formats your service uses before renaming.

**Mistake 3: Running large ALTER TABLE in production without testing the lock duration.**
`ALTER TABLE users ADD COLUMN phone_number TEXT NOT NULL DEFAULT ''` in PostgreSQL on a 100 million row table rewrites the entire table (because it needs to set the default for all existing rows). In PostgreSQL 11+, volatile defaults require a rewrite; non-volatile defaults (literal values, not function calls) don't. Test your migration on a production-sized staging database and measure the lock duration before running in production.

**Mistake 4: Not versioning event schemas from day one.**
Teams that start with "we'll add versioning later" always regret it. By the time schema versioning is needed, there are terabytes of unversioned events in Kafka and the source schema for each event is unknown. Include a schema version field in every event from the first event you publish. When the schema changes, increment the version. Old and new consumers can handle both versions independently.

**Mistake 5: Breaking schema changes during a rolling deployment.**
A rolling deployment means you have both old and new code running simultaneously. A breaking schema change (renaming a field, removing a required field) applied during this window means old code can't read data written by new code or vice versa. Always deploy schema changes as two separate deployments: first deploy the expand (add the new field), then deploy the contract (remove the old field) only after all code has been migrated.

## Connections

- **Stream Processing (06-stream-processing.md):** Stream processing pipelines read serialized data from Kafka. Schema evolution affects how stream processors deserialize events. The Schema Registry is the contract between producers and stream processing consumers.
- **Change Data Capture (08-change-data-capture.md):** CDC events have schemas (Debezium's event format). Database schema changes must be propagated through CDC event schemas without breaking consumers.
- **Derived Data (12-derived-data.md):** Derived representations (search indexes, read models) are coupled to the schema of the source data. When the source schema evolves, derived representations must evolve too.
- **Data Models (11-data-models.md):** Document databases offer more schema flexibility than relational databases, but that flexibility doesn't eliminate the schema evolution problem — it defers it to the application layer.

## Key Insights

The deepest insight about schema evolution is that **it is fundamentally a distributed systems problem, not a data modeling problem**. A schema change in a single-machine system is trivial: stop the service, migrate the data, restart with the new code. Schema evolution is hard because data outlives code — events in Kafka exist for months, rows in databases persist for years, and mobile apps run for weeks without updating. The schema must bridge all versions of the code simultaneously.

The second insight is that **compatibility is directional and both directions matter during a rolling deployment**. Engineers often think only about backward compatibility (new code reads old data). But during a rolling deployment, old code must also read new data (forward compatibility). Full compatibility — both forward and backward — is the only safe choice for production systems where multiple code versions coexist.

The third insight is that **Schema Registry compatibility checking at registration time is far better than compatibility checking at runtime**. A runtime deserialization failure causes service downtime, corrupted data, and on-call pages at 3 AM. A Schema Registry compatibility check failure blocks a deployment pipeline with a clear error message: "this schema change is incompatible, here's why." Shift the detection left, to before data is written.

Finally, understand that **the expand-contract pattern applies beyond databases — it applies to any schema change in any system**. Adding a new event field, deprecating an API response field, migrating a Kafka topic to a new schema — all follow the same three-phase pattern: expand (add the new thing without removing the old), migrate (update all producers and consumers), contract (remove the old thing). This pattern makes any schema change safe and reversible, at the cost of taking longer.
