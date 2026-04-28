---
name: aio-starrocks-query-tuning
description: |
  StarRocks query performance tuning — EXPLAIN plans, Query Profile analysis, operator metrics, tuning recipes, schema optimization, query hints, and text-based profile analysis.
when_to_use: StarRocks query tuning, EXPLAIN plan, Query Profile, slow queries, operator metrics, query hints, schema optimization, diagnosing slow queries, reading EXPLAIN output, analyzing query profiles, optimizing joins, optimizing scans, optimizing aggregations, StarRocks performance, StarRocks EXPLAIN
---

# StarRocks Query Tuning

Complete reference from [docs.starrocks.io/docs/best_practices/query_tuning/](https://docs.starrocks.io/docs/best_practices/query_tuning/query_plan_intro/).

## Related Skills

- `/aio-starrocks-best-practices` — Table design: partitioning, bucketing, sort keys, PK tuning
- `/starrocks` — Query syntax, cluster connections, Grafana integration
- `/starrocks-expert` — General table types, data loading, materialized views

---

## 1. Tuning Methodology — Top-Down Diagnostic

Five-step process, always in order:

1. **Identify** — Use monitoring, query history, audit logs to detect slow queries or resource bottlenecks
2. **Collect & Analyze** — `EXPLAIN` / `EXPLAIN ANALYZE` + Query Profile for detailed metrics
3. **Locate Root Cause** — Pinpoint problematic operators: join order, missing indexes, data distribution, SQL inefficiencies
4. **Apply Tuning** — SQL rewriting, schema optimization, query hints, session variables
5. **Validate & Iterate** — Rerun, compare metrics, review plans, continue optimizing

---

## 2. Query Plans — EXPLAIN Variants

### Commands

| Command | What It Shows | When to Use |
|---------|--------------|-------------|
| `EXPLAIN LOGICAL` | Simplified logical plan | Quick overview |
| `EXPLAIN` | Basic physical plan | Standard analysis |
| `EXPLAIN VERBOSE` | Detailed physical plan with extensive info | Deep investigation |
| `EXPLAIN COSTS` | Physical plan + cost estimates per operation | Cost comparison |
| `EXPLAIN ANALYZE` | Executes query + actual runtime statistics | Production diagnosis |

```sql
-- Quick check
EXPLAIN SELECT shop_id, SUM(net_sales) FROM sales WHERE shop_id = 123 GROUP BY shop_id;

-- Deep investigation
EXPLAIN VERBOSE SELECT ...;

-- Actual execution stats (runs the query!)
EXPLAIN ANALYZE SELECT ...;
```

### Plan Hierarchy

Plans are structured in 3 levels — read **bottom-up** starting from scan nodes:

1. **Fragment** — Top-level work units distributed to BEs. Spawn FragmentInstances.
2. **Pipeline** — Chain of operators within a fragment. Concurrent PipelineDrivers.
3. **Operator** — Atomic execution steps: scan, join, aggregate, sort, exchange, etc.

### What to Look For

- **Total runtime** and memory/CPU ratios
- **Filter pushdown** — are predicates pushed to scan level?
- **Data skew** — uneven row counts across fragments
- **Join strategy** — Broadcast vs Shuffle vs Colocate vs Bucket Shuffle
- **Exchange nodes** — data movement costs between BEs
- **Aggregation/sorting** — are they expensive relative to total?

### Execution Phases

1. **Planning** (FE) — Parse → Analyze → Optimize → Generate plan
2. **Scheduling** (FE) — Distribute plan to BEs
3. **Execution** (BE) — Pipeline engine processes the plan

---

## 3. Query Profile — Enabling & Accessing

### Enable Profiling

```sql
-- Per session
SET enable_profile = true;

-- Global
SET GLOBAL enable_profile = true;
```

### Slow Query Profiling (production-safe)

Avoid overhead by only profiling slow queries:

```sql
-- Only profile queries > 30 seconds
SET GLOBAL big_query_profile_threshold = '30s';

-- Supports: ms, s, m
SET GLOBAL big_query_profile_threshold = '500ms';
```

### Runtime Profile (v3.1+, for long-running queries)

Collects data at fixed intervals during execution:

```sql
-- Default: 10 seconds. Adjust:
SET runtime_profile_report_interval = 30;
```

### Configuration Reference

| Parameter | Scope | Default | Purpose |
|-----------|-------|---------|---------|
| `enable_profile` | Session | false | Activate profiling |
| `pipeline_profile_level` | Session | 1 | 1=merged metrics, 2=retain structure |
| `runtime_profile_report_interval` | Session | 10 | Seconds between runtime reports |
| `big_query_profile_threshold` | Session | 0s | Duration threshold for auto-profiling |
| `enable_statistics_collect_profile` | FE Dynamic | false | Profile statistics collection queries |

### Accessing Profiles

```sql
-- Get last query ID
SELECT last_query_id();

-- List recent queries
SHOW PROFILELIST;

-- Detailed profile for specific query
SELECT get_query_profile('<query_id>');

-- Full analysis with bottleneck highlighting
ANALYZE PROFILE FROM '<query_id>';
```

**Web UI:** `http://<fe_ip>:<fe_http_port>` -> Queries -> Finished Queries

---

## 4. Text-Based Profile Analysis

### ANALYZE PROFILE

```sql
-- List all queries (finished, failed, or running 10+ seconds)
SHOW PROFILELIST;

-- Detailed analysis
ANALYZE PROFILE FROM '<query_id>';
```

**Summary section shows:**
- QueryID, version, status, total time
- Memory usage
- **Top 10 CPU consuming nodes**
- **Top 10 memory consuming nodes**
- Non-default session variables

**Fragments section shows per-node:**
- Time, memory, cost estimates, output rows
- **Red highlighting**: nodes exceeding 30% of total time
- **Pink highlighting**: nodes in 15-30% range

### EXPLAIN ANALYZE

```sql
-- Executes and profiles simultaneously
EXPLAIN ANALYZE SELECT ...;

-- Also works for INSERT (aborts transaction to prevent data changes)
EXPLAIN ANALYZE INSERT INTO ... SELECT ...;
```

**Limitation:** INSERT ANALYZE only supported for default catalog tables.

### Runtime Profile Indicators

- `?` (not started)
- (executing)
- (completed)

Progress: `operators finished / total operators` and per-operator `rows processed / total rows`

**Tip:** Use MyCLI instead of mysql client for proper ANSI color rendering.

---

## 5. Tuning Recipes — Symptom-to-Fix Playbook

### Fast Diagnosis Workflow

1. **Initial scan** — Check execution overview:
   - Memory usage > 80%?
   - Spill bytes > 1GB?
2. **Identify bottleneck** — Sort operators by time percentage, find the slowest
3. **Match signature** — Confirm the specific bottleneck type, then apply fix

### Recipe: Scan Bottleneck

**Symptoms:**
- High `BytesRead`, `IOTaskExecTime` — cold/slow storage
- Low `PushdownPredicates`, high `ExprFilterRows` — missing filter pushdown
- Elevated `IOTaskWaitTime` — thread-pool saturation
- Uneven tablet row counts — data skew
- Many small segments — segment fragmentation

**Fixes:**
- Enable **Data Cache** for cold storage
- Simplify predicates to enable pushdown (avoid functions on partition/sort columns)
- Add **bloom filter** or **bitmap indexes**
- Rebalance bucketing (increase buckets or change hash key)
- Trigger manual compaction: `ALTER TABLE ... COMPACT;`

### Recipe: Aggregation Bottleneck

**Symptoms:**
- High-cardinality GROUP BY causing hash table bloat
- Shuffle skew across fragments
- State-heavy functions (HLL, BITMAP, COUNT DISTINCT)
- Degraded partial aggregation (`PassThroughRowCount` high in auto-mode)

**Fixes:**
- Enable **sorted streaming aggregation** (align GROUP BY with sort key)
- Create **roll-up materialized views** for common aggregations
- Cast wide keys to integers
- Pre-compute sketches (HLL, BITMAP) at ingestion

### Recipe: Join Bottleneck

**Symptoms:**
- Oversized build side exceeding memory
- Cache-inefficient probe operations
- Shuffle skew on join keys
- Accidental broadcast of large tables
- Missing runtime filters

**Fixes:**
- Swap probe/build tables (smaller table on build side)
- Pre-filter data before join
- Enable hash spilling (`SET enable_spill = true;`)
- Adjust broadcast threshold or force shuffle via hint
- Check runtime filter effectiveness in profile

### Recipe: Network Exchange Bottleneck

**Symptoms:**
- `NetworkTime` > 30% of total with large `BytesSent`
- Receiver backlog (thread pool constraints)

**Fixes:**
```sql
-- Enable network compression
SET transmission_compression_type = 'zstd';
```
- Reduce data volume before exchange (filter earlier, pre-aggregate)
- Check for unnecessary shuffles — use colocate joins where possible

### Recipe: Sort/Merge/Window Bottleneck

**Symptoms:**
- Spilling when `MaxBufferedBytes` > 2GB
- High merge time relative to total

**Fixes:**
- Add `LIMIT` clause when possible
- Pre-aggregate data before sorting
- Increase `sort_spill_threshold`
- Align window PARTITION BY with table sort key

### Memory Quick Reference

| Threshold | Metric | Action |
|-----------|--------|--------|
| > 80% BE memory | `QueryPeakMemoryUsagePerNode` | Lower `exec_mem_limit` or add RAM |
| `SpillBytes` > 0 | `QuerySpillBytes` | Upgrade to SR 3.2+ or increase memory |

### Post-Mortem Template

Document every tuning: **symptom -> root cause -> fix applied -> quantified outcome**

---

## 6. Schema Tuning

### Table Type Selection

| Type | When to Use | Key Property |
|------|------------|-------------|
| DUPLICATE KEY | Raw data logging, no pre-aggregation | Allows duplicate rows |
| AGGREGATE KEY | Pre-aggregated analytics (SUM, MIN, MAX, REPLACE) | Aggregates on load |
| UNIQUE KEY | Frequently updated datasets | New overwrites old |
| PRIMARY KEY | Real-time updates with ACID semantics | Strongest uniqueness guarantee |

### Flat Table vs Star Schema

| Approach | Pros | Cons |
|----------|------|------|
| **Flat (denormalized)** | Extreme query concurrency, lowest latency | Expensive dimension maintenance, high storage, sorting overhead during load |
| **Star schema** | Flexible multi-table queries, easier maintenance | Join overhead at query time |

**Rule:** Use flat tables for extreme concurrency/latency requirements. Star schema for flexibility.

### Colocate Tables

```sql
CREATE TABLE ... PROPERTIES ("colocate_with" = "group_name");
```
Groups tables by bucketing column for **local joins without network transfer**. Matching key + bucket count required.

### Partition Strategy

Time-based RANGE partitions provide:
- Clear hot/cold data distinction
- Tiered storage optimization (SSD + SATA with `storage_cooldown_time`)
- Efficient partition-based deletion

### Bucket Strategy

- Use **high-cardinality** columns to prevent skew
- Target: **100MB-1GB compressed** per bucket
- Always explicitly specify columns — avoid random bucketing for analytical tables

### Index Optimization

#### Sparse Index (Prefix Index)
- **Granularity:** 1024 rows
- **Fixed prefix size:** 36 bytes
- Place high-frequency filter fields **first** in schema
- **Critical:** VARCHAR field truncates the index — always place VARCHAR **last** in sparse index

#### Bloom Filter Index
```sql
PROPERTIES ("bloom_filter_columns" = "column1, column2")
```
- Best for **high-cardinality** columns
- Enables placing VARCHAR fields earlier when needed (compensates for sparse index limitation)

#### Bitmap Index
```sql
CREATE INDEX idx_status ON table(status) USING BITMAP;
```
- Best for **low-cardinality** columns (gender, city, status)
- Applicable to: Duplicate Key tables and key columns of Aggregate/Unique Key tables

### Materialized Views (Rollups)

Use cases:
- Aggregate specific column combinations different from base table sort key
- Optimize prefix index coverage for different query patterns
- Reorder columns to match common WHERE clause patterns

### Schema Change Types

| Type | Operation | Data Impact |
|------|-----------|-------------|
| **Sorted** | Drop columns, reorder data | Full data rewrite |
| **Direct** | Modify column types | Data transformation, no reorder |
| **Linked** | Add columns | Structure-only, no data transformation |

**Anti-pattern:** Minimize sorted schema changes through careful initial design.

---

## 7. Query Hints

### SET_VAR — Session Variable Hints

Override session variables for a single query:

```sql
SELECT /*+ SET_VAR(key=value [, key=value]) */ ...
```

**Common uses:**
```sql
-- Force streaming preaggregation
SELECT /*+ SET_VAR(streaming_preaggregation_mode='force_streaming') */
  shop_id, SUM(net_sales) FROM sales GROUP BY shop_id;

-- Set query timeout
SELECT /*+ SET_VAR(query_timeout=60) */ ...;

-- Enable spill
SELECT /*+ SET_VAR(enable_spill=true) */ ...;
```

**Limitation:** SET_VAR in CTE's SELECT clause does NOT take effect.

### SET_USER_VARIABLE — Cache Subquery Results (v3.2.4+)

Avoid repeated scalar subquery execution:

```sql
SELECT /*+ SET_USER_VARIABLE(@threshold = (SELECT AVG(amount) FROM orders)) */
  * FROM orders WHERE amount > @threshold;
```

**Limitation:** Cannot be used in CREATE MATERIALIZED VIEW or CREATE VIEW.

### Join Hints

Force specific join strategies:

```sql
-- Force shuffle join (avoid accidental broadcast of large table)
SELECT * FROM large_table a JOIN [SHUFFLE] medium_table b ON a.id = b.id;

-- Force broadcast (small dimension table)
SELECT * FROM fact_table a JOIN [BROADCAST] dim_table b ON a.dim_id = b.id;

-- Force bucket shuffle (when bucketing key matches join key)
SELECT * FROM sales a JOIN [BUCKET] customers b ON a.customer_id = b.customer_id;

-- Force colocate join (pre-distributed colocated tables)
SELECT * FROM sales a JOIN [COLOCATE] customers b ON a.customer_id = b.customer_id;

-- Preserve original join order (disable reorder)
SELECT * FROM a JOIN [UNREORDER] b ON a.id = b.id;
```

**Critical:** When a Join hint is used, the optimizer **does NOT perform Join Reorder**. You take full control.

**Verify hint effectiveness:**
```sql
EXPLAIN SELECT * FROM a JOIN [SHUFFLE] b ON a.id = b.id;
-- Check DistributionMode in output
```

---

## 8. Operator Metrics Reference

### Summary-Level Metrics

| Metric | What It Tells You |
|--------|-------------------|
| Total duration | End-to-end query time |
| Query State | Success/failure/running |
| Default DB, SQL, Session vars | Query context |

### Planner Metrics

Covers parsing, analyzing, transforming, optimizing phases.

**Concern threshold:** Planner time > 10ms warrants investigation. Common causes:
- Complex queries with many joins
- Numerous materialized views to evaluate
- External table metadata fetching

### Execution Overview Metrics

| Category | Key Metric | Normal Threshold |
|----------|-----------|-----------------|
| **Memory** | Peak consumption | < 80% BE capacity |
| **CPU** | Cumulative CPU time | Relative to query complexity |
| **Network** | Exchange network time | Low relative to total |
| **Scan** | IO time aggregated | Depends on data volume |
| **Disk Spill** | SpillBytes | < 1GB |
| **Schedule** | Schedule time | < 1s for simple queries |

### Pipeline-Level Metrics

**Core relationship:**
```
DriverTotalTime = ActiveTime + PendingTime + ScheduleTime
```

| Metric | Meaning |
|--------|---------|
| `ActiveTime` | Actual operator execution time |
| `PendingTime` | Blocking time (InputEmpty, OutputFull, PreconditionBlock, PendingFinish) |
| `ScheduleTime` | Queue-to-execution wait |

**Diagnosis:** If `PendingTime` dominates, check which sub-reason:
- `InputEmpty` — upstream operator is slow
- `OutputFull` — downstream operator is blocked
- `PreconditionBlock` — waiting for dependency (e.g., build side of hash join)
- `PendingFinish` — waiting for other pipelines to complete

### OLAP Scan Operator Metrics

| Metric | Meaning | Tuning Signal |
|--------|---------|---------------|
| `Table` / `Rollup` | Which table/MV is scanned | Verify correct MV selection |
| `TabletCount` | Number of tablets scanned | High = missing partition pruning |
| `BytesRead` | Total bytes read | High = missing filter pushdown |
| `CompressedBytesRead` | Compressed bytes from storage | Storage I/O indicator |
| `RowsRead` | Rows after filtering | Compare with `RawRowsRead` |
| `RawRowsRead` | Rows before filtering | High ratio to `RowsRead` = filter not pushed down |
| `CachedPagesNum` | Pages from cache | Low = cold data, enable Data Cache |
| `ReadPagesNum` | Total pages read | Baseline for cache hit ratio |
| `ScanTime` | Total scan duration | Primary scan bottleneck metric |
| `IOTaskExecTime` | I/O execution time | High = slow storage |
| `IOTaskWaitTime` | I/O queue wait time | High = thread-pool saturation |
| `PeakIOTasks` | Max concurrent I/O tasks | Thread pool capacity |
| `PeakChunkBufferSize` | Max chunk buffer | Memory pressure indicator |

**Key ratios:**
- `RawRowsRead / RowsRead` — Filter efficiency. High ratio = predicates not pushed down
- `CachedPagesNum / ReadPagesNum` — Cache hit ratio. Low = enable Data Cache

### Connector Scan Operator (External Tables)

Same metrics as OLAP Scan, plus:
- `DataSourceType` — Identifies source (Iceberg, Hive, Hudi, Delta)

### Exchange Sink Metrics

| Metric | Meaning |
|--------|---------|
| Serialization time | Encoding overhead |
| Hash time | Shuffle key computation |
| Compression metrics | Network compression efficiency |
| RPC counts | Number of network calls |
| Network bandwidth | Data transfer rate |
| Throughput | Messages per second |

**Passthrough optimization:** When data is colocated, "short-circuit logic" skips network transfer entirely.

### Exchange Source Metrics

| Metric | Meaning |
|--------|---------|
| Decompression time | Decoding overhead |
| Deserialization time | Message parsing |
| Lock waiting time | Contention indicator |

**Bottleneck patterns:**
- Broadcast joins with suboptimal plans — large table broadcast
- Shuffle aggregation/join with large tables — excessive network transfer

### Aggregate Operator Metrics

| Metric | Meaning | Tuning Signal |
|--------|---------|---------------|
| Hash table size | Number of groups | High = high-cardinality GROUP BY |
| Hash table memory | Memory consumed | Approaching limits = consider MV |
| `PassThroughRowCount` | Rows in streaming mode | High = auto-mode degraded to streaming, partial agg ineffective |
| Result construction time | Final result build | Usually not bottleneck |

### Join Operator Metrics

| Metric | Meaning | Tuning Signal |
|--------|---------|---------------|
| `DistributionMode` | BROADCAST / PARTITIONED / COLOCATE | Verify expected strategy |
| `JoinType` | INNER / LEFT / RIGHT / etc. | |
| Hash table bucket stats | Distribution quality | Skew = hot buckets |
| Build phase time | Hash table construction | High = large build side |
| Probe phase time | Hash table lookups | High = cache-inefficient |
| Conjunct evaluation time | Join predicate compute | High = complex predicates |
| Runtime filter construction | Filter build time | Missing = add hint |

### Sort Operator Metrics

| Metric | Meaning | Tuning Signal |
|--------|---------|---------------|
| `SortType` | Full sort vs top-N | top-N is much cheaper |
| `MaxBufferedBytes` | Peak memory | > 2GB = spilling likely |
| `MaxBufferedRows` | Peak rows buffered | |
| Sorted run count | Number of sorted runs | High = many merge passes |
| Building / Merging / Sorting / Output times | Stage breakdown | Identify dominant stage |

### Window Function Operator Metrics

| Metric | Meaning |
|--------|---------|
| `ProcessMode` | Materializing/Streaming x Cumulative/RemovableCumulative/ByDefinition |
| Partition/peer group boundary searches | Partitioning overhead |
| Peak buffered rows | Memory pressure |
| Unused row removal count | Efficiency of streaming mode |

### Merge Operator Stages

Execution progresses through: Init -> Prepare -> Process -> SplitChunk -> FetchChunk -> Pending -> Finished

Each stage has per-stage counts and times. Late materialization buffering metrics available.

### OlapTableSink (INSERT) Metrics

| Metric | Meaning | Tuning Signal |
|--------|---------|---------------|
| `RowsRead` | Input rows | |
| `RowsFiltered` | Rejected rows | High = data quality issue |
| `RowsReturned` | Successfully written | |
| `PushChunkNum` per node | Chunks sent to each BE | **Large differences = data skew** |
| `RpcClientSideTime` vs `RpcServerSideTime` | Network overhead | Client >> Server = enable compression |

### Project Operator

Computes expressions (calculations, casts, etc.). If expensive expressions exist, this can take significant time. Check:
- Expression computation time
- Common sub-expression timing

### LocalExchange Operator

Types: Passthrough, Partition, or Broadcast. Metrics:
- Peak memory, buffer size, chunk counts, per-chunk metrics

---

