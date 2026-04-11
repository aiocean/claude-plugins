# aio-starrocks

StarRocks best practices and query tuning skills based on official documentation.

## Install

```bash
/plugin install aio-starrocks@aiocean-plugins
```

## Skills

### aio-starrocks-best-practices

Table design best practices — partitioning strategy, sort key selection, bucketing decisions, Primary Key table tuning, authentication/authorization, and resource group configuration.

**Use when:** designing new tables, optimizing existing schemas, reviewing DDL, choosing partition/bucket/sort strategies, configuring access control and resource isolation.

**Covers:**
- Partitioning (time-first, tenant isolation, composite keys, granularity decisions)
- Table clustering / sort keys (selection playbook, prefix index, 36-byte limit)
- Bucketing (hash vs random, colocated joins, tablet sizing, anti-patterns)
- Primary Key table tuning (index types, memory management, performance balance)
- Authentication & authorization (LDAP, OIDC, RBAC, Security Integration)
- Audit log & resource groups (CPU/memory/concurrency allocation from audit data)

### aio-starrocks-query-tuning

Query performance tuning — EXPLAIN plans, Query Profile analysis, operator metrics, tuning recipes, schema optimization, query hints, and text-based profile analysis.

**Use when:** diagnosing slow queries, reading EXPLAIN output, analyzing query profiles, optimizing joins/scans/aggregations, applying query hints, tuning StarRocks schema.

**Covers:**
- 5-step tuning methodology (identify, collect, locate, apply, validate)
- EXPLAIN variants (LOGICAL, VERBOSE, COSTS, ANALYZE)
- Query Profile configuration (enable_profile, big_query_profile_threshold, runtime profiles)
- Text-based profile analysis (ANALYZE PROFILE, SHOW PROFILELIST, bottleneck highlighting)
- Tuning recipes by operator (scan, aggregation, join, exchange, sort/window)
- Schema tuning (table types, indexes, materialized views, flat vs star)
- Query hints (SET_VAR, SET_USER_VARIABLE, join hints: SHUFFLE/BROADCAST/BUCKET/COLOCATE)
- Operator metrics reference (15+ operator types with all metrics and tuning signals)

## Sources

- [Best Practices Overview](https://docs.starrocks.io/docs/best_practices/overview/)
- [Partitioning](https://docs.starrocks.io/docs/best_practices/partitioning/)
- [Table Clustering](https://docs.starrocks.io/docs/best_practices/table_clustering/)
- [Bucketing](https://docs.starrocks.io/docs/best_practices/bucketing/)
- [Primary Key Table](https://docs.starrocks.io/docs/best_practices/primarykey_table/)
- [Authentication & Authorization](https://docs.starrocks.io/docs/best_practices/authentication_authorization/)
- [Audit Log & Resource Group](https://docs.starrocks.io/docs/best_practices/audit_log_resource_group/)
- [Query Plan Intro](https://docs.starrocks.io/docs/best_practices/query_tuning/query_plan_intro/)
- [Query Planning](https://docs.starrocks.io/docs/best_practices/query_tuning/query_planning/)
- [Query Profile Overview](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_overview/)
- [Query Profile Tuning Recipes](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_tuning_recipes/)
- [Schema Tuning](https://docs.starrocks.io/docs/best_practices/query_tuning/schema_tuning/)
- [Text-Based Analysis](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_text_based_analysis/)
- [Query Hints](https://docs.starrocks.io/docs/best_practices/query_tuning/query_hint/)
- [Operator Metrics](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_operator_metrics/)
