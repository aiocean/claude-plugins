---
title: "aio-starrocks"
description: "Thiết kế bảng StarRocks và tune các query chậm — partitioning, bucketing, sort key, PK tuning, cộng với đọc EXPLAIN/Query Profile và các tuning recipe cụ thể."
document_type: "plugin"
version: "1.0.2"
install: "/plugin install aio-starrocks@aiocean-plugins"
skills_count: 2
---

> **Cài đặt:** `/plugin install aio-starrocks@aiocean-plugins` · `v1.0.2`

# aio-starrocks

Skills về StarRocks best practices và query tuning dựa trên tài liệu chính thức.

## Cài đặt

```bash
/plugin install aio-starrocks@aiocean-plugins
```

## Skills

### aio-starrocks-best-practices

Best practices thiết kế bảng — partitioning strategy, chọn sort key, quyết định bucketing, tuning Primary Key table, authentication/authorization, và cấu hình resource group.

**Dùng khi:** thiết kế bảng mới, tối ưu schema hiện có, review DDL, chọn chiến lược partition/bucket/sort, cấu hình access control và resource isolation.

**Bao gồm:**
- Partitioning (time-first, tenant isolation, composite keys, quyết định granularity)
- Table clustering / sort keys (playbook chọn key, prefix index, giới hạn 36-byte)
- Bucketing (hash vs random, colocated joins, sizing tablet, anti-patterns)
- Tuning Primary Key table (loại index, quản lý memory, cân bằng performance)
- Authentication & authorization (LDAP, OIDC, RBAC, Security Integration)
- Audit log & resource group (phân bổ CPU/memory/concurrency từ dữ liệu audit)

### aio-starrocks-query-tuning

Tuning query performance — EXPLAIN plans, phân tích Query Profile, operator metrics, tuning recipes, tối ưu schema, query hints, và phân tích profile dạng text.

**Dùng khi:** chẩn đoán query chậm, đọc output EXPLAIN, phân tích query profile, tối ưu joins/scans/aggregations, áp dụng query hints, tune schema StarRocks.

**Bao gồm:**
- Phương pháp tuning 5 bước (identify, collect, locate, apply, validate)
- Các biến thể EXPLAIN (LOGICAL, VERBOSE, COSTS, ANALYZE)
- Cấu hình Query Profile (enable_profile, big_query_profile_threshold, runtime profiles)
- Phân tích profile dạng text (ANALYZE PROFILE, SHOW PROFILELIST, highlight bottleneck)
- Tuning recipes theo operator (scan, aggregation, join, exchange, sort/window)
- Schema tuning (loại bảng, index, materialized view, flat vs star)
- Query hints (SET_VAR, SET_USER_VARIABLE, join hints: SHUFFLE/BROADCAST/BUCKET/COLOCATE)
- Tham chiếu operator metrics (15+ loại operator với toàn bộ metric và tuning signal)

## Nguồn

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

## Skills (2)

- [**aio-starrocks-best-practices**](/vi/plugins/aio-starrocks/aio-starrocks-best-practices) — Best practices thiết kế bảng StarRocks — partitioning strategy, chọn sort key, quyết định bucketing, tuning Primary Key table, authentication/authorization,…
- [**aio-starrocks-query-tuning**](/vi/plugins/aio-starrocks/aio-starrocks-query-tuning) — Tuning query performance StarRocks — EXPLAIN plans, phân tích Query Profile, operator metrics, tuning recipes, tối ưu schema, query hints, và text-based p…
