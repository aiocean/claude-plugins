::install-command
/plugin install aio-starrocks@aiocean-plugins
::

# aio-starrocks

StarRocks performance is not primarily a query problem — it is a design problem. A table with the wrong partition key, a misaligned sort key, or undersized buckets will be slow regardless of how well the query is written. Conversely, a table designed correctly makes most queries fast without any tuning at all.

This plugin covers both sides: how to design tables so queries are fast by construction, and how to diagnose queries that are still slow. The content is drawn directly from the official StarRocks best practices documentation and reflects the physical-design decisions that compound across the life of a cluster.

## Installation

```bash
/plugin install aio-starrocks@aiocean-plugins
```

## Skills

### aio-starrocks-best-practices

> "design a StarRocks table", "partition strategy", "sort key selection", "bucketing decision", "hash vs random bucketing", "Primary Key table tuning", "colocated joins", "resource group", "StarRocks DDL", "access control LDAP"

Physical table design is the highest-leverage decision in StarRocks. This skill covers the six areas where design choices have lasting consequences:

**Partitioning** — when to use daily vs hourly vs monthly granularity, how to model multi-tenant composite partition keys, how to keep total partition count below the 100K FE memory limit, and when partitioning is a lifecycle management tool (DROP PARTITION for TTL/GDPR) versus a query pruning tool.

**Sort keys** — the highest-leverage physical design knob in StarRocks. Covers the selection playbook (equality columns first, range columns second, aggregation helpers third), the 36-byte prefix-index limit and what it means for column ordering, how sorted data enables streaming aggregation 2-3x faster than hash aggregation, and the anti-patterns that silently waste the index.

**Bucketing** — hash vs random, when each is appropriate, how to size tablets (target 1-10 GB), the cardinality rule for hash keys (>= 1000x BE node count to prevent skew), colocated join setup, and random bucketing's auto-split behavior (`bucket_size`).

**Primary Key table tuning** — index type selection (cloud-native persistent is recommended for shared-data deployments), memory management formulas, the `l0_max_mem_usage` / worker count knobs for import overhead, and compaction configuration for freshness vs latency balance.

**Authentication and authorization** — native users vs Security Integration (LDAP, OIDC, OAuth 2.0, JWT), Group Provider setup, Apache Ranger integration, and the critical constraint that user IDs and group names must match exactly across auth, group provider, and authorization systems.

**Resource groups** — data-driven allocation from the audit log (`starrocks_audit_db__`), CPU weight vs exclusive cores, memory and concurrency sizing with the 1.5x peak headroom rule, and isolating async materialized view refreshes from interactive workload.

### aio-starrocks-query-tuning

> "slow query", "EXPLAIN plan", "Query Profile", "ANALYZE PROFILE", "join bottleneck", "scan bottleneck", "aggregation slow", "query hints", "SHUFFLE join", "BROADCAST join", "enable_profile"

When a query is slow, the diagnosis follows a fixed order: identify the slow query, collect the EXPLAIN plan and Query Profile, locate the bottleneck operator, apply the appropriate fix, then validate with fresh metrics. Skipping steps wastes time on the wrong problem.

This skill covers the full diagnostic toolkit:

**EXPLAIN variants** — LOGICAL (overview), standard (physical plan), VERBOSE (detailed), COSTS (cost estimates), and ANALYZE (executes and collects actual runtime stats). Plans read bottom-up from scan nodes.

**Query Profile** — enabling per-session or globally, `big_query_profile_threshold` for production-safe slow-query profiling, `SHOW PROFILELIST`, `ANALYZE PROFILE` with its red/pink bottleneck highlighting, and runtime profiles for long-running queries.

**Tuning recipes by operator** — concrete symptom-to-fix mappings for scan bottlenecks (missing filter pushdown, cold data cache, tablet skew), aggregation bottlenecks (high-cardinality GROUP BY, HLL/BITMAP sketch pre-computation), join bottlenecks (build-side size, broadcast vs shuffle, runtime filter gaps), network exchange bottlenecks (zstd compression, colocated joins), and sort/window bottlenecks (spill threshold, LIMIT, PARTITION BY alignment).

**Query hints** — `SET_VAR` to override session variables per-query, `SET_USER_VARIABLE` to cache scalar subquery results (v3.2.4+), and join hints (`SHUFFLE`, `BROADCAST`, `BUCKET`, `COLOCATE`, `UNREORDER`) with their trade-off: when a join hint is active, the optimizer disables join reorder entirely.

**Operator metrics reference** — 15+ operator types with every metric, its meaning, and its tuning signal. Covers OLAP scan, exchange sink/source, aggregate, join, sort, window function, merge, OlapTableSink, project, and LocalExchange operators.

## Sources

- [Best Practices Overview](https://docs.starrocks.io/docs/best_practices/overview/)
- [Partitioning](https://docs.starrocks.io/docs/best_practices/partitioning/)
- [Table Clustering](https://docs.starrocks.io/docs/best_practices/table_clustering/)
- [Bucketing](https://docs.starrocks.io/docs/best_practices/bucketing/)
- [Primary Key Table](https://docs.starrocks.io/docs/best_practices/primarykey_table/)
- [Authentication & Authorization](https://docs.starrocks.io/docs/best_practices/authentication_authorization/)
- [Audit Log & Resource Group](https://docs.starrocks.io/docs/best_practices/audit_log_resource_group/)
- [Query Tuning](https://docs.starrocks.io/docs/best_practices/query_tuning/query_plan_intro/)
