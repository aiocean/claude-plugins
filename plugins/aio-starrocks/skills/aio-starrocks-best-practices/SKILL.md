---
name: aio-starrocks-best-practices
description: |
  StarRocks table design best practices — partitioning strategy, sort key selection, bucketing decisions, Primary Key table tuning, authentication/authorization, and resource group configuration. Use when designing a StarRocks table, reviewing DDL, choosing partition granularity, sizing tablets (tablet sizing), setting up colocated joins, configuring LDAP or OIDC authentication, tuning Primary Key compaction, adjusting FE memory limits for large partition counts, or isolating workloads with resource group isolation.
when_to_use: StarRocks table design, partitioning strategy, sort key selection, bucketing, Primary Key table tuning, designing new tables, optimizing schemas, reviewing DDL, partition strategy, bucket strategy, sort strategy, access control, resource isolation, resource group, StarRocks DDL, StarRocks best practices, colocated join, tablet sizing, LDAP, OIDC, compaction, FE memory limit, resource group isolation, DDL review
argument-hint: "Table DDL or design question"
effort: low
---

# StarRocks Best Practices

Official best practices from [docs.starrocks.io/docs/best_practices/](https://docs.starrocks.io/docs/best_practices/overview/).

**Core design philosophy:** "Designing for efficiency does more than improve query speed — it decreases costs by reducing storage, CPU, and object storage API costs."

## Related Skills

- `/aio-starrocks-query-tuning` — Query performance tuning, EXPLAIN plans, operator metrics, hints
- `/starrocks` — Query syntax, cluster connections, Grafana integration *(external skill, not part of this plugin)*
- `/starrocks-expert` — General table types, data loading, query optimization *(external skill, not part of this plugin)*

---

## 1. Partitioning

Partitioning enables **coarse-grain data pruning** via partition elimination AND **metadata-only lifecycle operations** (TTL, GDPR deletes, tenant isolation).

### Partition Key Selection

1. **Time-first** — If 80%+ of queries filter by time, lead with `date_trunc('day', dt)`
2. **Tenant isolation** — Include `tenant_id` when managing data per-tenant
3. **Retention alignment** — Include columns you'll purge via `DROP PARTITION`
4. **Composite keys** — Creates `#tenants x #days` partitions — keep total **below ~100K** to avoid FE memory strain

### Granularity Decision

| Granularity | Best For | Advantage | Limitation |
|-------------|----------|-----------|------------|
| Daily | BI/reporting | 365 partitions/year; simple TTL | Coarse for sub-day queries |
| Hourly | IoT/burst workloads | Hot-spot isolation | 8,700 partitions/year |
| Weekly/Monthly | Historical archive | Minimal metadata | Less precise pruning |

### Sizing Rule

- Each partition <= 100GB
- <= 20K tablets per partition (across replicas)
- Total partitions < 100K (FE memory constraint)
- Tablets per BE < 200K

### DDL Templates

**Single-tenant clickstream:**
```sql
CREATE TABLE click_stream (
  user_id BIGINT, event_time DATETIME, url STRING, ...)
DUPLICATE KEY(user_id, event_time)
PARTITION BY date_trunc('day', event_time)
DISTRIBUTED BY HASH(user_id) BUCKETS xxx;
```

**Multi-tenant SaaS (recommended for sales-engine pattern):**
```sql
CREATE TABLE metrics (
  tenant_id INT, dt DATETIME, metric_name STRING, v DOUBLE)
PRIMARY KEY(tenant_id, dt, metric_name)
PARTITION BY date_trunc('DAY', dt)
DISTRIBUTED BY HASH(tenant_id) BUCKETS xxx;
```

**Large-tenant composite (when single tenant > 100GB/partition):**
```sql
CREATE TABLE activity (
  tenant_id INT, dt DATETIME, id BIGINT, ....)
DUPLICATE KEY(dt, id)
PARTITION BY tenant_id, date_trunc('MONTH', dt)
DISTRIBUTED BY HASH(id) BUCKETS xxx;
```

### Partitioning vs Bucketing

- **Partitions** = lifecycle management tools (TTL, DROP PARTITION, GDPR). Enable query-time **partition pruning** — skip entire data blocks.
- **Buckets** = parallelism levers. Distribute data within partitions for parallel scan/ingest.

---

## 2. Table Clustering (Sort Keys)

> "A thoughtful sort-key is the **highest-leverage physical-design knob** in StarRocks."

### Why Sort Keys Matter

Sort keys deliver **compounding benefits** across write, storage, and read:

1. **I/O elimination** — Segment and page pruning via min/max metadata skips irrelevant data blocks
2. **Point lookups** — Sparse prefix index enables millisecond queries on leading sort columns
3. **Sorted aggregation** — Streaming aggregation (2-3x faster) when GROUP BY aligns with sort key
4. **Compression & caching** — Sorted data improves encoding efficiency and CPU cache locality

### Sort Key Selection Playbook

**Decision hierarchy:**
1. **Equality columns first** — High-cardinality columns with frequent `=` / `IN` filters
2. **Range columns second** — Timestamps or numeric ranges for temporal/value windows
3. **Aggregation helpers third** — GROUP BY columns that enable sorted aggregation

### Configuration Rules

| Rule | Guidance |
|------|----------|
| **Width** | 3-5 columns max. Wider keys degrade ingest and exhaust the **36-byte prefix-index limit** |
| **Cardinality order** | Low-cardinality before high-cardinality enhances compression |
| **String columns** | Long strings consume prefix-index bytes, blocking subsequent columns from indexing |

### Reference Templates

| Scenario | Partition | Sort Key | Why |
|----------|-----------|----------|-----|
| B2C Orders | `date_trunc('day', order_ts)` | `(user_id, order_ts)` | User-first filters; then temporal ranges |
| IoT Telemetry | `date_trunc('day', ts)` | `(device_id, ts)` | Device time-series dominates |
| SaaS Multi-Tenant | `tenant_id` | `(dt, event_id)` | Tenant isolation; dashboard time clustering |
| Dimension Lookup | none | `(dim_id)` | Point lookups only |

### DDL Example

```sql
CREATE TABLE telemetry (
  device_id VARCHAR,
  ts DATETIME,
  value DOUBLE
)
ENGINE=OLAP
PRIMARY KEY(device_id, ts)
PARTITION BY date_trunc('day', ts)
DISTRIBUTED BY HASH(device_id) BUCKETS 16
ORDER BY (device_id, ts);
```

### Anti-Patterns

- Placing long string columns at the sort-key head (wastes prefix-index bytes)
- Overly wide sort keys (>5 columns)
- Misaligning partition and sort keys (defeating logical pruning order)

---

## 3. Bucketing (Distribution Strategy)

### Quick Decision Framework

| Scenario | Choice | Rationale |
|----------|--------|-----------|
| Stable join/filter keys, high cardinality | **Hash** | Enables pruning, colocated joins, local aggregation |
| Write-heavy logs/events; multi-tenant | **Random** | Prevents skew, uniform throughput, elastic growth |
| Aggregate/Primary Key tables | **Hash** | Only option for these table types |
| Duplicate Key tables needing elasticity | **Random** | Auto-splits when `bucket_size` set |

### Hash Bucketing

```sql
DISTRIBUTED BY HASH(column1, column2) BUCKETS n
PROPERTIES ("colocate_with" = "group_name")
```

**Key requirements:**
- Key must be stable, evenly distributed, high-cardinality
- **Cardinality rule:** >= 1000x the number of BE nodes to prevent skew
- **Tablet sizing:** Target 1-10 GB per tablet initially
- Tablets > 10GB = compaction efficiency degradation

**Query optimizations enabled:**
```sql
-- Tablet pruning: single tablet accessed
SELECT sum(amount) FROM sales WHERE customer_id = 123;

-- Local aggregation: no shuffle phase
SELECT customer_id, sum(amount) FROM sales GROUP BY customer_id;

-- Colocated join: no network shuffle between BEs
SELECT c.region, sum(s.amount)
FROM sales s JOIN customers c USING (customer_id)
WHERE s.sale_date BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY c.region;
```

**Colocated join setup** (matching key + bucket count required):
```sql
CREATE TABLE sales (
  sale_id BIGINT, customer_id INT, sale_date DATE, amount DECIMAL(10,2))
DISTRIBUTED BY HASH(customer_id) BUCKETS 48
PARTITION BY date_trunc('DAY', sale_date)
PROPERTIES ("colocate_with" = "group1");

CREATE TABLE customers (
  customer_id INT, region VARCHAR(32), status TINYINT)
DISTRIBUTED BY HASH(customer_id) BUCKETS 48
PROPERTIES ("colocate_with" = "group1");
```

### Random Bucketing

```sql
DISTRIBUTED BY RANDOM
PROPERTIES ("bucket_size" = "1GB")  -- Enables auto-split (v3.2+)
```

- Round-robin row assignment (no hash key)
- Auto tablet splitting when partition grows (requires `bucket_size`)
- Growth-only — no shrinking
- **Limitation:** Duplicate Key tables only
- **Trade-off:** No bucket pruning; every query scans all tablets in a partition; no colocated joins

### Operational Maintenance

- **Random:** Always set `bucket_size` (e.g., 1GB) for auto-split
- **Hash:** Monitor tablet size; re-shard before tablets exceed 5-10 GB (`ALTER TABLE ... BUCKETS n`)
- **Both:** Watch for metadata bloat with excessive tablet counts

### Anti-Patterns

1. **Low-cardinality hash keys** — Creates hot tablets and imbalanced writes
2. **Undersizing initial buckets** — Hampers ingestion parallelism and compaction
3. **Random bucketing for dimensional joins** — Eliminates locality optimizations
4. **Ignoring `bucket_size` in Random mode** — Tablets never split; metadata grows unbounded

---

## 4. Primary Key Table Tuning

### Primary Key Index Types

| Type | Recommendation | Notes |
|------|---------------|-------|
| Full in-memory | NOT recommended | Excessive memory waste |
| Local disk persistent | Standard option | Good for shared-nothing |
| Cloud-native persistent | Recommended for shared-data | Avoids disk capacity constraints, eliminates index rebuilds after rebalancing |

### Key Design Principles

- Focus on **uniqueness requirements** during import/updates, NOT query acceleration
- Minimize column count and size (default max: 128 bytes)
- Use `ORDER BY` clause separately for query optimization via sort keys

### Resource Consumption Formula

- **Storage:** `(key_size + 8 bytes) x row_count x 50%`
- **Memory:** `min(l0_max_mem_usage x tablet_count, update_memory_limit_percent x BE_memory)`

### Memory Management

**Monitor:** `http://be_ip:be_http_port/mem_tracker?type=update`

**Reduce import memory overhead:**
```
l0_max_mem_usage = <value < 104857600>    # Default 104857600 (100MB)
skip_pk_preload = true
transaction_apply_worker_count = <cpu_cores - n>
transaction_publish_version_worker_count = <cpu_cores - n>
```
*Trade-off: Reduced memory increases I/O; fewer worker threads slow ingestion*

### Performance Balance

| Goal | Configuration |
|------|---------------|
| High freshness + low query latency | Increase `compact_threads`; decrease `update_compaction_per_tablet_min_interval_seconds` |
| Good freshness, limited resources | Raise `lake_ingest_slowdown_threshold` and `lake_compaction_score_upper_bound` |
| Good latency, limited resources | Reduce write frequency; batch larger data loads |

### Monitoring

- **Shared-data:** `SHOW PROC '/transactions/{db}/running'` for compaction slowdown messages
- **Shared-nothing:** Monitor `tablet_max_versions` threshold before ingestion failures

---

## 5. Authentication & Authorization

### Three-Layer Access Control

1. **Identity Authentication** — "I am who I claim to be" (user verification)
2. **Access Authentication** — Group/role-based login eligibility to the cluster
3. **Operation Authorization** — Query execution and data access permissions

### Authentication Methods

| Method | User Storage | Setup | Best For |
|--------|-------------|-------|----------|
| Native User | In-cluster | Manual creation | Small user bases |
| Security Integration | External system | Configuration-driven | Large enterprises |

### Configuration Examples

**Native user with external auth (LDAP):**
```sql
CREATE USER <username> IDENTIFIED WITH authentication_ldap_simple
AS 'uid=tom,ou=company,dc=example,dc=com';
```

**Security integration (LDAP):**
```sql
CREATE SECURITY INTEGRATION <name> PROPERTIES (
    "type" = "authentication_ldap_simple",
    "authentication_ldap_simple_server_host" = "",
    "authentication_ldap_simple_server_port" = "",
    "authentication_ldap_simple_bind_base_dn" = "",
    "authentication_ldap_simple_user_search_attr" = ""
);

ADMIN SET FRONTEND CONFIG (
    "authentication_chain" = "<security_integration_name>"
);
```

**Group provider + role grants:**
```sql
CREATE GROUP PROVIDER <name> PROPERTIES (
    "type" = "ldap",
    "ldap_conn_url" = "",
    "ldap_bind_root_dn" = "",
    "ldap_bind_base_dn" = ""
);

GRANT <role> TO EXTERNAL GROUP <group_name>;
```

### Solution Selection

- **Full external control** — Security Integration + Apache Ranger
- **Minimal setup, native control** — Security Integration + Internal RBAC
- **Legacy** — Native users with GRANT statements

**Supported protocols:** LDAP, OIDC, OAuth 2.0, JWT, native passwords

**Critical:** User IDs and group names **must match** across auth, group provider, and authorization systems. Mismatches cause permission failures.

---

## 6. Audit Log & Resource Groups

**Core principle:** Use **data-driven resource allocation** by analyzing `starrocks_audit_db__.starrocks_audit_tbl__` rather than guesswork.

### CPU Resource Allocation

Analyze per-user CPU consumption, allocate proportionally:

```sql
-- Aggregate cpuCostNs per user, last 30 days
SELECT user, SUM(cpuCostNs) / 1e9 AS cpu_seconds
FROM starrocks_audit_db__.starrocks_audit_tbl__
WHERE state IN ('EOF', 'OK')
  AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY user
ORDER BY cpu_seconds DESC;
```

**Configuration:**
- `exclusive_cpu_cores` — Cannot exceed single BE core count; sum across all groups <= BE total
- `cpu_weight` — For soft-isolation groups; determines relative share on remaining cores

**Rule of thumb:** If a user is 16% of CPU on a 64-core BE, allocate ~11 cores.

### Memory Management

```sql
-- Peak single-query memory per user
SELECT user, MAX(memCostBytes) / (1024 * 1024) AS peak_mem_mb
FROM starrocks_audit_db__.starrocks_audit_tbl__
WHERE state IN ('EOF', 'OK')
  AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY user;
```

- `big_query_mem_limit` — Set high to avoid false-positive termination of legitimate large queries
- `mem_limit` — Set high (e.g., `0.9` for 90%)
- Per-BE usage ~= `total_max_mem_mb / number_of_BEs`

### Concurrency Control

```sql
-- Peak concurrent queries per user per minute
SELECT user, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i') AS minute_bucket,
       COUNT(*) AS concurrent_queries
FROM starrocks_audit_db__.starrocks_audit_tbl__
WHERE queryType = 'query' AND state IN ('EOF', 'OK')
  AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY user, minute_bucket
ORDER BY concurrent_queries DESC;
```

- `concurrency_limit` — Set to **1.5x observed peak** for headroom
- For extreme spikes: enable **Query Queues** for load smoothing
- Minute-level analysis may underestimate per-second spikes

### Materialized View Resource Isolation

Prevent async MV refreshes from degrading interactive queries:

```sql
CREATE RESOURCE GROUP rg_mv (
    user = 'mv_user',
    query_type IN ('insert', 'select')
)
WITH (
    'cpu_weight' = '32',
    'mem_limit' = '0.9',
    'concurrency_limit' = '10',
    'spill_mem_limit_threshold' = '0.5'
);

-- Assign to MV at creation
CREATE MATERIALIZED VIEW ... PROPERTIES ('resource_group' = 'rg_mv');

-- Or existing MV
ALTER MATERIALIZED VIEW ... SET ("resource_group" = "rg_mv");
```

### Anti-Patterns

- Relying on guesswork instead of audit log analysis
- Setting `exclusive_cpu_cores` sum to exceed available BE cores
- Using low `concurrency_limit` without headroom buffer
- Applying low `mem_limit` that terminates legitimate queries
- Allowing MV refreshes to share resources with interactive workloads

---

## Decision Matrix — Table Design by Use Case

| Decision | Single-Tenant Fact | Multi-Tenant SaaS | IoT/Events | Dimension Lookup |
|----------|-------------------|------------------|-----------|------------------|
| **Partition** | `date_trunc('day', ts)` | `date_trunc('DAY', dt)` | `date_trunc('day', ts)` | None |
| **Sort Key** | `(user_id, ts)` | `(tenant_id, dt)` | `(device_id, ts)` | `(dim_id)` |
| **Distribution** | HASH(user_id) | HASH(tenant_id) | RANDOM w/ bucket_size | HASH(dim_id) |
| **Bucket Type** | Hash (colocate joins) | Hash (tenant filter pruning) | Random (prevent skew) | Hash |
| **PK Index** | Local disk persistent | Cloud-native (elastic) | Cloud-native | Local disk |
| **Achievement** | Query on user; streaming agg | Tenant isolation; fast TTL | Write throughput; device clustering | Millisecond lookups |

