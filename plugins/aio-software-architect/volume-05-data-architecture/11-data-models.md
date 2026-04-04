# Relational vs Document vs Graph

> "The limits of my language mean the limits of my world. The choice of data model is the choice of which questions you can ask efficiently, which constraints you can express declarably, and which relationships are first-class citizens of your system." — paraphrasing Wittgenstein, applied to databases

## The Problem

Every application that stores data must answer a deceptively simple question: what shape should that data take? The answer determines which queries are fast and which are slow, which constraints the database can enforce automatically and which must be enforced by application code, and how difficult it will be to evolve the schema as requirements change.

In 1970, Edgar Codd published "A Relational Model of Data for Large Shared Data Banks," proposing that all data be represented as relations (tables) and accessed through a declarative query language. For thirty years, this model dominated. Then the web changed everything. Social networks had users following users — a graph structure that relational databases modeled awkwardly with join tables. Content management systems had posts with arbitrary metadata — a document structure that relational databases modeled with sparse tables or catch-all JSONB columns. Mobile applications needed schemas that could evolve without migrations. The NoSQL movement was not a rejection of relational databases — it was an acknowledgment that the relational model, however powerful, was not the right fit for every problem.

Today engineers have three primary data model families to choose from: relational (tables, schemas, SQL), document (hierarchical, schema-flexible, JSON/BSON), and graph (nodes, edges, traversal). Each has specific strengths and specific weaknesses. Each is right for some problems and wrong for others. The convergence trend — relational databases adding JSON, document databases adding SQL, graph databases gaining traction — makes the boundaries increasingly blurry, but the fundamental trade-offs remain.

## Core Concept

### The Relational Model

The relational model represents data as tables (relations) of rows (tuples) with defined columns (attributes). Relationships between tables are expressed through foreign keys and resolved through joins.

```sql
-- Normalized relational schema for an e-commerce system
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    status      TEXT NOT NULL CHECK (status IN ('pending','confirmed','shipped','delivered')),
    total_cents BIGINT NOT NULL CHECK (total_cents > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id),
    product_id  BIGINT NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL CHECK (quantity > 0),
    price_cents BIGINT NOT NULL CHECK (price_cents > 0)
);
```

**The power of the relational model:**

**Joins:** Any two tables can be joined on any compatible columns. You can ask questions the original schema designer never anticipated:

```sql
-- "Show me the top 10 products by revenue in the last 30 days for users in Germany"
-- The schema designer may not have anticipated this exact query, but the relational
-- model handles it naturally through joins and aggregations.
SELECT p.name, SUM(oi.quantity * oi.price_cents) / 100.0 AS revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN users u ON o.user_id = u.id
JOIN products p ON oi.product_id = p.id
WHERE u.country = 'DE'
  AND o.created_at > NOW() - INTERVAL '30 days'
  AND o.status = 'delivered'
GROUP BY p.id, p.name
ORDER BY revenue DESC
LIMIT 10;
```

**Constraints:** The database enforces referential integrity (you cannot have an order_item that references a non-existent order), domain constraints (`CHECK (quantity > 0)`), and uniqueness. These constraints are enforced at write time, making invalid states impossible to represent.

**Schema enforcement:** Every row in a table has the same columns. This makes the data model explicit and discoverable. New developers can read the schema and understand the data structure without reading application code.

**Normalization:** Storing each fact once (the user's email in one place, not duplicated across every order) prevents update anomalies: if Alice changes her email, you update one row, not thousands.

**The impedance mismatch:** The relational model's weakness is that application objects don't map cleanly to flat tables. An order has a collection of items. In code, this is a nested object: `{id: 1, items: [{product_id: 2, quantity: 3}, ...]}`. In the relational model, it requires three tables and two joins to retrieve. This translation between the application's object model and the relational schema is the "impedance mismatch," and it is the persistent friction of relational databases in object-oriented applications.

### The Document Model

The document model stores self-contained documents — typically JSON or BSON — where each document represents one application entity with all its nested data.

```json
// MongoDB document — no joins needed for typical order retrieval
{
  "_id": "ord_123",
  "userId": "usr_456",
  "status": "shipped",
  "totalCents": 4999,
  "createdAt": "2024-01-15T14:23:45Z",
  "items": [
    {"productId": "prod_789", "name": "Widget Pro", "quantity": 2, "priceCents": 1999},
    {"productId": "prod_456", "name": "Gadget Plus", "quantity": 1, "priceCents": 1001}
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102"
  }
}
```

**The power of the document model:**

**Data locality:** When you fetch an order, you get the entire order — items, address, status — in one read. No joins required. This is the document model's killer advantage for entities that are naturally hierarchical and usually accessed together.

**Schema flexibility:** Documents in the same collection can have different fields. Adding a new field to some documents doesn't require migrating all documents. This is valuable during rapid development when the schema evolves frequently.

**Denormalization:** Embedding data (like item names inside the order document) avoids joins but requires managing consistency: if a product's name changes, you must update all orders that embedded it. This is a deliberate trade-off — you're accepting some data duplication for better read performance.

**The document model's weaknesses:**

**Poor joins:** MongoDB added `$lookup` for joins in 2015, but joins across collections are fundamentally more expensive than in relational databases (because the optimizer has less information and document collections are not normalized). If your queries frequently join data across entities, the document model's advantage disappears.

**No referential integrity:** You can store a `userId` in an order document, but MongoDB won't stop you from deleting the user and leaving orphaned orders. Referential integrity must be enforced in application code.

**Schema is implicit:** The flexibility that enables rapid development also enables inconsistency. Without a schema registry or application-level validation, documents in the same collection may have incompatible structures. New developers must read application code to understand the data model.

**Duplication:** Embedding data avoids joins but creates copies. If a product's description is embedded in every order that contains it, updating the product description requires finding and updating every matching order. For rarely-changed reference data, this is acceptable; for frequently-changing data, it's a maintenance nightmare.

### The Graph Model

The graph model represents data as nodes (entities) and edges (relationships), where relationships are first-class citizens with their own properties.

```cypher
// Neo4j Cypher — social network graph
CREATE (alice:User {id: "usr_1", name: "Alice"})
CREATE (bob:User {id: "usr_2", name: "Bob"})
CREATE (carol:User {id: "usr_3", name: "Carol"})
CREATE (techco:Company {id: "co_1", name: "TechCo"})

CREATE (alice)-[:FOLLOWS {since: "2020-01-01"}]->(bob)
CREATE (bob)-[:FOLLOWS {since: "2021-06-15"}]->(carol)
CREATE (carol)-[:FOLLOWS {since: "2019-03-10"}]->(alice)
CREATE (alice)-[:WORKS_AT {role: "Engineer", since: "2022-01-01"}]->(techco)
CREATE (bob)-[:WORKS_AT {role: "Manager", since: "2020-06-01"}]->(techco)

// Query: "Find all people Alice follows who work at the same company as her"
MATCH (alice:User {name: "Alice"})
      -[:FOLLOWS]->(friend:User)
      -[:WORKS_AT]->(company:Company)
      <-[:WORKS_AT]-(alice)
RETURN friend.name, company.name

// Query: "Find Alice's followers' followers (2 hops)"
MATCH (alice:User {name: "Alice"})<-[:FOLLOWS*2]-(person:User)
RETURN person.name
```

**The power of the graph model:**

**Relationship traversal:** Queries that follow chains of relationships (friends of friends, supply chain upstream, shortest path between two nodes) are expressed naturally and executed efficiently. In a relational database, a variable-depth traversal requires recursive CTEs (`WITH RECURSIVE`) which are cumbersome and often slow because the query optimizer cannot reason about the depth.

**Heterogeneous relationships:** Nodes of different types (User, Company, Product, Event) can be connected by edges. The same query language navigates all relationship types. A relational model would need separate join tables for each relationship pair.

**Schema flexibility for relationships:** Edges can be added between any two nodes without schema changes. Adding a new relationship type (`:ATTENDED_EVENT`) doesn't require a migration.

**The graph model's weaknesses:**

**No aggregations:** Graph databases are optimized for traversal queries, not aggregation queries ("total sales by country," "average order value by customer segment"). Running analytics over a graph database is painful. Most graph workloads need a separate OLAP store for analytics.

**Limited ecosystem:** Neo4j, Amazon Neptune, and ArangoDB are the primary graph databases. The tooling ecosystem is much smaller than the relational ecosystem. Finding engineers with graph database expertise is harder.

**Not appropriate for most data:** Most application data is not a graph. User profiles, orders, products, invoices — these are hierarchical (document) or tabular (relational) entities. Forcing them into a graph model adds complexity without benefit.

### The Convergence Trend

The boundaries between data models are blurring:

**PostgreSQL with JSONB:** PostgreSQL's `jsonb` column type stores JSON data with full indexing support. You can store semi-structured document data inside a relational database, query it with SQL, and join it with structured relational data.

```sql
-- Relational + document in PostgreSQL
CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    price_cents BIGINT NOT NULL,
    attributes  JSONB          -- flexible document for product-type-specific data
);

-- Index a specific JSON field
CREATE INDEX ON products((attributes->>'color'));

-- Query both structured and document fields
SELECT id, name, price_cents, attributes->>'color' AS color
FROM products
WHERE price_cents BETWEEN 1000 AND 5000
  AND attributes->>'category' = 'electronics'
  AND attributes->'specs'->>'ram_gb' IS NOT NULL;
```

**MongoDB with transactions and schema validation:** Modern MongoDB supports multi-document ACID transactions and JSON Schema validation, addressing the consistency concerns of the document model.

**PostgreSQL with recursive CTEs for graph queries:** Simple graph traversals can be expressed in SQL using recursive CTEs:

```sql
-- Find all reports of employee 1 (graph traversal in SQL)
WITH RECURSIVE org_chart AS (
    SELECT id, name, manager_id, 1 AS depth
    FROM employees WHERE manager_id = 1
    UNION ALL
    SELECT e.id, e.name, e.manager_id, oc.depth + 1
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
    WHERE oc.depth < 10  -- prevent infinite recursion
)
SELECT * FROM org_chart ORDER BY depth, name;
```

This convergence means the choice of data model is becoming less about which database you use and more about which data model you apply within your chosen database.

## Deep Dive

Codd's 1970 paper "A Relational Model of Data for Large Shared Data Banks" was a critique of the navigational databases that preceded it — IMS (IBM's hierarchical database) and CODASYL (the network/graph model). In navigational databases, queries described a traversal path through the data structure: "follow this pointer from this record to get that record." Codd's radical proposal was to separate the logical data model (what data exists and what relationships it has) from the physical storage (how it is organized on disk). The relational model expresses data as sets of tuples, and queries are declarative specifications of what you want — not instructions for how to navigate to it. The database optimizer chooses the traversal path. This separation is what made the relational model so durable: application code specifies requirements, the database chooses implementation. When indexes are added or data layout changes, application code does not need to change because it never described a physical traversal.

The document model's resurgence in the NoSQL era was not a rejection of the relational model's principles but a pragmatic response to two specific pressures: schema rigidity and impedance mismatch. Relational schema changes require migrations — `ALTER TABLE` commands that lock tables, require coordination across services, and cannot be applied incrementally. For rapidly evolving applications where the data model changes weekly, the migration overhead was a genuine productivity cost. The document model's schema flexibility (different documents in the same collection can have different fields) allows the application to evolve its data model without a migration step. The impedance mismatch is the other pressure: retrieving a hierarchical object (an order with its items, address, and status) from a normalized relational schema requires joining three tables. The same object stored as a document is retrieved in one read. For entities that are always accessed as a whole unit, the document model eliminates a class of join complexity that the relational model handles through SQL.

The graph model solves a problem that both the relational and document models handle poorly: variable-depth traversal. In a relational schema, a query like "find all employees who report to this manager, directly or indirectly" requires a recursive CTE (`WITH RECURSIVE`). For a shallow hierarchy (2–3 levels), this works. For an arbitrary-depth social graph ("find everyone connected to Alice within 4 hops") or a supply chain ("what upstream suppliers are affected by this component shortage?"), recursive CTEs become slow and syntactically unwieldy. A graph database's traversal primitives — the Cypher `MATCH (a)-[:FOLLOWS*1..4]->(b)` pattern — express variable-depth traversal naturally and can execute it using index-free adjacency: each node stores direct pointers to its neighbors, so traversal is O(hops × average degree) rather than requiring repeated index lookups. The relational model can model any graph, but the query language and execution engine are not optimized for traversal — which is why graph databases exist.

The impedance mismatch problem — the friction between object-oriented application code and relational tables — has spawned an entire industry of ORMs (Object-Relational Mappers). Kleppmann's analysis of ORMs is precise: they solve the mechanical problem (translating between objects and tables in boilerplate code) while leaving the semantic problem (the N+1 query problem, eager vs lazy loading, the difficulty of expressing complex joins through an object API) to the application developer. The N+1 problem is the canonical ORM failure mode: iterating over a list of orders and, for each order, loading the customer via the ORM generates N+1 queries (1 to fetch the orders, N to fetch each customer) instead of 1 query with a join. ORMs that default to lazy loading produce this pattern silently; developers discover it in production through slow query logs. The impedance mismatch is a real problem, but ORMs often trade visible SQL complexity for hidden query performance problems.

The convergence trend — relational databases adding JSON, document databases adding SQL, graph databases gaining traction in analytics — reflects a market correction toward the insight that most applications have mixed data requirements. A JSONB column in PostgreSQL with a GIN index gives you the schema flexibility of a document store for truly variable-attribute data, while the rest of the table retains relational integrity constraints, foreign key enforcement, and SQL join capability. This is the pragmatic answer to "relational vs document": use the relational model as your foundation, and reach for JSONB when genuinely polymorphic attributes require it. The document-first approach (MongoDB as the primary store) forces you to implement joins and referential integrity in application code — work that the relational model provides for free. The cases where a pure document store is genuinely better than PostgreSQL with JSONB are narrower than the NoSQL era suggested.

## Implementation Guide

**Choosing the right model — a decision framework:**

```
1. Primary access pattern?
   - Fetch one entity and all its nested data -> Document model
   - Complex queries joining multiple entity types -> Relational model
   - Traverse relationships of variable depth -> Graph model

2. Relationship complexity?
   - Mostly one-to-many (user has orders, order has items) -> Document or Relational
   - Many-to-many with relationship properties -> Relational (join tables) or Graph
   - Variable-depth traversal (social graph, supply chain, org chart) -> Graph

3. Schema stability?
   - Schema changes frequently, different entities have different attributes -> Document
   - Schema is stable, all entities of same type are uniform -> Relational
   - Entities and relationship types evolve continuously -> Graph

4. Consistency requirements?
   - Multi-entity transactions with foreign key integrity -> Relational
   - Single-entity operations, eventual consistency acceptable -> Document
   - Relationship integrity important but not foreign-key style -> Graph with constraints
```

**Relational schema design — avoiding common modeling mistakes:**

```sql
-- WRONG: Storing multiple values in a single column (violates 1NF)
CREATE TABLE orders_bad (
    id       BIGINT PRIMARY KEY,
    products TEXT  -- "prod_1,prod_2,prod_3" <- never do this
);

-- RIGHT: Separate table for the many side of one-to-many
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL
);
CREATE TABLE order_items (
    order_id    BIGINT NOT NULL REFERENCES orders(id),
    product_id  BIGINT NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

-- WRONG: Catching all attributes in a generic key-value table (Entity-Attribute-Value)
CREATE TABLE attributes_bad (
    entity_id   BIGINT,
    attr_name   TEXT,
    attr_value  TEXT
);
-- This loses type safety, makes queries complex, and is slow

-- RIGHT: Use JSONB for genuinely flexible attributes, typed columns for required fields
CREATE TABLE products (
    id              BIGINT PRIMARY KEY,
    name            TEXT NOT NULL,
    price_cents     BIGINT NOT NULL,
    category        TEXT NOT NULL,
    -- Flexible attributes with JSONB, indexed for common queries
    attributes      JSONB,
    -- GIN index enables efficient querying of any JSON field
    CONSTRAINT check_positive_price CHECK (price_cents > 0)
);
CREATE INDEX ON products USING GIN (attributes);
```

**Document model — when to embed vs reference:**

```javascript
// Embed when:
// - Data is always read together with the parent
// - Data has one owner and is not shared
// - Cardinality is small and bounded (< 100 items)

// GOOD: Embed order items (always read with order, one owner, bounded count)
{
  "_id": "ord_123",
  "items": [  // Embedded: one read gets everything
    {"productId": "prod_1", "qty": 2},
    {"productId": "prod_2", "qty": 1}
  ]
}

// Reference when:
// - Data is shared across multiple parents
// - Data has independent lifecycle
// - Cardinality is large or unbounded

// GOOD: Reference user (shared, independent lifecycle, not ownership)
{
  "_id": "ord_123",
  "userId": "usr_456",  // Reference: user has independent lifecycle
  "items": [...]
}

// BAD: Embed user in every order (duplicates data, update anomalies)
// DON'T DO THIS:
{
  "_id": "ord_123",
  "user": {  // Embedded: creates copies, must update all orders if email changes
    "id": "usr_456",
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

## When to Use / When NOT to Use

**Relational model — use when:**
- Data has well-defined structure that changes infrequently
- Queries are complex (multi-table joins, aggregations, subqueries)
- Data integrity constraints (foreign keys, uniqueness, check constraints) are important
- You need ACID transactions spanning multiple entity types
- Your team has SQL expertise (which most teams do)

**Document model — use when:**
- Entities are hierarchical and almost always accessed as a whole unit
- Different entities of the same logical type have different attributes
- Schema evolves rapidly during development
- Write throughput is more important than complex query flexibility
- You're building an API-first system where JSON is the primary data exchange format

**Graph model — use when:**
- Relationship traversal is the primary query pattern
- Relationships between entities have their own properties
- The depth of traversal is variable and unknown at query time (friends of friends of friends)
- You're modeling social networks, recommendation graphs, supply chains, fraud detection networks, knowledge graphs

**Avoid relational when:**
- Data is truly hierarchical with no cross-entity joins needed
- Schema must change extremely frequently (every week)
- Horizontal write scaling beyond one machine is required (sharding a relational DB is complex)

**Avoid document when:**
- Data has many-to-many relationships requiring joins
- Data integrity across documents is critical
- Your queries aggregate across many documents (better suited to relational or columnar)

**Avoid graph when:**
- Your data is primarily tabular or hierarchical
- Aggregation and analytics are primary use cases
- You need transactions spanning many nodes (graph transactions are complex)

## Common Mistakes

**Mistake 1: Choosing MongoDB because you "don't know the schema yet."**
This is the most common document database mistake. Not knowing your schema today does not mean your schema will be flexible forever — it means you haven't thought about it yet. Document databases don't eliminate the need for schema design; they delay the pain until later, when inconsistent documents have accumulated and you need to query them. Spend time on schema design upfront. The flexibility of JSONB in PostgreSQL often gives you enough schema flexibility without abandoning relational integrity.

**Mistake 2: Normalizing everything in a document database.**
If every document just holds foreign keys to other documents (like a relational schema expressed as JSON), you've lost the document model's primary benefit (data locality) and gained only its weaknesses (no joins, no referential integrity). Documents should embed related data that belongs together. If you find yourself writing many cross-collection `$lookup` queries, consider whether PostgreSQL is a better fit.

**Mistake 3: Using a graph database for every "connected" dataset.**
Every dataset has relationships between entities — that doesn't mean it's best modeled as a graph. An e-commerce system has users who buy products — that's a relationship, but it's a simple one-to-many relationship better modeled relationally. Use a graph database when the primary query pattern is traversal (following chains of relationships to arbitrary depth), not when you merely have relationships.

**Mistake 4: Not indexing JSONB fields in PostgreSQL.**
PostgreSQL's JSONB is powerful but slow if you query unindexed JSON fields. `WHERE attributes->>'color' = 'red'` performs a full table scan unless you have `CREATE INDEX ON products((attributes->>'color'))` or a GIN index. The flexibility of JSONB is not a reason to skip index design.

**Mistake 5: Treating the data model as fixed once chosen.**
The convergence trend means you don't have to choose exactly one data model for your entire application. Use relational for your core business entities (users, orders, products), document columns (JSONB) for flexible metadata, and a graph database if and when you develop a traversal-heavy workload. Start with the simplest model that meets your needs and evolve.

## Connections

- **Partitioning (02-partitioning.md):** Document databases (MongoDB, DynamoDB) require careful partition key design. The document model affects what fields are available as partition keys.
- **Consistency Models (03-consistency-models.md):** Relational databases provide strong consistency within a node. Document databases typically provide eventual consistency across replicas. Graph databases vary.
- **Transactions (14-transactions.md):** ACID transactions are native to relational databases. Document databases added multi-document transactions later (MongoDB 4.0, 2018). Graph databases have varying transaction support.
- **Schema Evolution (13-schema-evolution.md):** Relational schemas require migrations for structural changes. Document schemas evolve more freely but require application-level management.

## Key Insights

The most important insight about data models is that **the data model you choose determines which questions you can ask efficiently and which constraints you can enforce automatically**. A relational model makes aggregate analytics easy and referential integrity free. A document model makes hierarchical retrieval fast and schema evolution cheap. A graph model makes traversal queries natural and relationship properties first-class. You are not just choosing a storage format — you are choosing the query language, the performance characteristics, and the consistency guarantees of your data layer.

The second insight is that **the impedance mismatch is real but manageable**. The friction between object-oriented application code and relational databases has driven decades of ORM development, NoSQL adoption, and hybrid approaches. The honest assessment is that most applications have mixed data — some hierarchical, some relational, some graph. PostgreSQL with JSONB columns handles this mix more gracefully than most people realize.

The third insight is that **normalization is a tool, not a religion**. The relational model's normalization rules (1NF, 2NF, 3NF, BCNF) exist to prevent update anomalies and ensure consistency. They are correct for data that is updated frequently. For data that is written once and read many times (event logs, archives, analytics snapshots), denormalization (duplication for read performance) is often the right choice. Know why you're normalizing before you do it.

Finally, **the graph model solves a genuinely hard problem that other models handle poorly**. Variable-depth relationship traversal in a relational database requires recursive CTEs that are both syntactically awkward and often slow. If your application has a genuine traversal problem — social graph, fraud ring detection, knowledge graph, supply chain analysis — a graph database is worth the adoption cost. The mistake is using it for everything else.
