# Batch Processing — MapReduce and Beyond

> "The Unix philosophy — write programs that do one thing and do it well, write programs to work together, write programs that handle text streams because that is a universal interface — turns out to be a good guide for designing batch processing systems." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

In September 2003, Google engineers Jeffrey Dean and Sanjay Ghemawat faced a problem that would define the next decade of large-scale computing. They needed to rebuild Google's entire web index — a computation that required processing petabytes of crawled web data, performing complex transformations, and producing a sorted, inverted index that could be served to billions of search queries. The computation was too large for any single machine. It needed to run across thousands of machines in parallel. And it needed to be fault-tolerant: any individual machine could fail at any point, and the computation needed to continue.

Their solution was MapReduce. The paper they published in 2004 — "MapReduce: Simplified Data Processing on Large Clusters" — described a programming model so simple that it could be learned in an afternoon, yet so powerful that it could express nearly any large-scale data processing task. Within a decade, MapReduce and its successors (Hadoop, Spark, Flink's batch mode) had become the foundation of the data engineering profession.

But MapReduce is old, slow, and largely superseded. Understanding it is not about using it — it's about understanding the principles it embodies: the Unix philosophy of composability, the power of functional transformations over immutable data, the use of derived data as a first-class concept. These principles extend beyond MapReduce to Spark, Flink, dbt, and every modern data engineering tool. And understanding the limitations of MapReduce — its disk I/O overhead, its rigid two-phase model — explains why Spark was built and why the industry moved from Lambda architecture to Kappa architecture.

## Core Concept

### The Unix Philosophy — The Right Mental Model

Before diving into MapReduce, internalize the Unix philosophy, because it's the best mental model for all batch processing:

1. **Write programs that do one thing and do it well.** Each Unix command — `sort`, `grep`, `awk`, `sed`, `wc` — does one thing. No command tries to be a general-purpose computation engine.

2. **Write programs to work together.** Unix commands compose via pipes. The output of one command is the input of the next.

3. **Write programs that handle text streams.** Text streams are a universal interface. Any program can communicate with any other program as long as they agree on the format of the text stream.

```bash
# Count the top 10 most common words in a corpus
# Each command does one thing; pipes compose them
cat corpus.txt \
  | tr -cs 'A-Za-z' '\n' \   # tokenize: one word per line
  | tr 'A-Z' 'a-z' \          # lowercase
  | sort \                     # group identical words
  | uniq -c \                  # count occurrences
  | sort -rn \                 # sort by count descending
  | head -10                   # take top 10
```

This pipeline processes gigabytes of text efficiently. Each stage reads from stdin, writes to stdout. You can swap any stage for a different implementation. You can insert debugging stages. You can parallelize each stage independently (with GNU parallel, for example).

MapReduce is this idea at dataenter scale. Replace "stdin/stdout" with "distributed file system." Replace "pipe" with "shuffle." Replace "command" with "user-defined function." The structure is identical.

### MapReduce: Map → Shuffle → Reduce

MapReduce breaks every computation into three phases:

**Map phase:** Apply a user-defined function to each input record, producing zero or more key-value pairs.

```
Input record: "the quick brown fox jumps over the lazy dog"
Map function: emit (word, 1) for each word

Output:
  ("the", 1)
  ("quick", 1)
  ("brown", 1)
  ("fox", 1)
  ("jumps", 1)
  ("over", 1)
  ("the", 1)
  ("lazy", 1)
  ("dog", 1)
```

**Shuffle phase:** All key-value pairs with the same key are collected together and sent to the same reducer. This is the most expensive phase — it requires reading the output of all mappers, partitioning by key, sorting, and transferring data across the network.

```
After shuffle (all records with same key on same reducer):
  Reducer 1: [("brown", 1), ("dog", 1), ("fox", 1), ("jumps", 1)]
  Reducer 2: [("lazy", 1), ("over", 1), ("quick", 1), ("the", [1,1])]
```

**Reduce phase:** Apply a user-defined function to each group of values with the same key, producing zero or more output records.

```
Reduce function: sum all values for a key

Output:
  ("brown", 1)
  ("dog", 1)
  ("fox", 1)
  ("jumps", 1)
  ("lazy", 1)
  ("over", 1)
  ("quick", 1)
  ("the", 2)
```

The elegance of MapReduce is that the framework handles everything else: distributing the input across mappers, fault-tolerance (if a mapper fails, its input is re-processed by another mapper), the shuffle network transfer, and writing output to the distributed filesystem.

**Fault tolerance model:** MapReduce materializes intermediate results to disk. After each map task completes, its output is written to local disk. After each reduce task completes, its output is written to HDFS (Hadoop Distributed File System). This materialization means any task can be retried on any node — just re-read the input from HDFS (or, for reduce tasks, re-read the map output that was written to mappers' local disks).

The cost of this fault tolerance is massive disk I/O. A multi-step computation (map → reduce → map → reduce → ...) writes its intermediate results to disk between every step. For computations with many steps, this can result in 10x more disk I/O than the actual computation requires.

### Hadoop: MapReduce at Open Source Scale

Hadoop (2006) is the open-source implementation of MapReduce. Its core components:

- **HDFS (Hadoop Distributed File System):** Stores input and output data. Files are split into 128MB blocks and replicated across three nodes. The NameNode maintains the block map; DataNodes store the blocks.
- **YARN (Yet Another Resource Negotiator):** Resource management and job scheduling. Replaced the original JobTracker/TaskTracker model.
- **MapReduce:** The computation framework that runs on top of HDFS and YARN.

Hadoop was the first platform that made petabyte-scale computation accessible to any company with commodity hardware. A cluster of 1000 commodity servers, each with 2TB disk, could store and process 2 petabytes of data for less than the cost of a single high-end enterprise server.

The Hadoop ecosystem grew to include: Hive (SQL over MapReduce), Pig (dataflow language over MapReduce), HBase (real-time key-value store on HDFS), Oozie (workflow scheduler), and dozens of other tools. For a decade, this ecosystem was the dominant data engineering platform.

### Apache Spark: In-Memory Batch Processing

Spark (2009, open-sourced 2010) addressed MapReduce's fundamental performance bottleneck: disk materialization between stages. Spark keeps intermediate data in memory, writing to disk only when memory is insufficient or explicitly requested.

The key abstraction is the **RDD (Resilient Distributed Dataset)** — a fault-tolerant, immutable, distributed collection of objects. Operations on RDDs are **lazy**: they don't execute immediately but build a DAG (directed acyclic graph) of transformations. When you call an action (like `collect()` or `count()`), Spark executes the entire DAG in a single pass, pipelining transformations that can be fused and materializing only when necessary (e.g., for a shuffle).

```python
# Spark word count — compares to the Unix pipeline example above
from pyspark import SparkContext

sc = SparkContext()
word_counts = (
    sc.textFile("hdfs://corpus/*.txt")  # Read input (lazy)
    .flatMap(lambda line: line.split())  # Tokenize (lazy)
    .map(lambda word: (word.lower(), 1)) # Normalize + emit pairs (lazy)
    .reduceByKey(lambda a, b: a + b)     # Count (triggers shuffle + execute)
    .sortBy(lambda kv: -kv[1])           # Sort by count descending (lazy)
    .take(10)                            # Top 10 (triggers execute)
)
```

For iterative algorithms (machine learning, graph algorithms) that require many passes over the same data, Spark is dramatically faster than MapReduce — up to 100x for algorithms like logistic regression that iterate over training data hundreds of times. The data is loaded into memory once and the iterations happen in-memory rather than reading from disk on each iteration.

**Spark's fault tolerance:** RDDs maintain the lineage of transformations that produced them. If a partition is lost (due to node failure), Spark can recompute it by replaying the lineage. For datasets that are expensive to recompute (because the lineage is long or the source is slow), you can explicitly `persist()` or `cache()` an RDD, writing it to memory or disk.

**Spark's evolution:** Spark SQL (DataFrames and Datasets) replaced raw RDDs as the primary API. DataFrames allow the Catalyst optimizer to optimize execution plans — performing predicate pushdown, column pruning, and join reordering that are not possible with opaque user-defined functions on RDDs. For most workloads, DataFrame operations are significantly faster than equivalent RDD operations because the optimizer can reason about the structure of the data.

### Lambda Architecture: Batch + Speed Layer

Lambda architecture (Nathan Marz, 2011) was the dominant pattern for combining real-time and historical analytics:

```
Raw Data
   |
   +---> Batch Layer (Hadoop/Spark)
   |     - Recomputes all views from scratch periodically
   |     - Authoritative, accurate, slow
   |
   +---> Speed Layer (Storm/Kafka Streams)
         - Processes recent data in real time
         - Approximate, fast, covers the gap since last batch

Query Layer: merges batch and speed layer results
```

The query layer merges results from the batch layer (accurate, covers all historical data) with results from the speed layer (approximate, covers recent data not yet in the batch layer).

Lambda architecture's problems:
- **Two codebases:** You write every computation twice — once for batch, once for streaming. They must produce identical results, but subtle differences in semantics (floating-point rounding, handling of late events) cause divergence.
- **Operational complexity:** Running both a batch cluster and a streaming cluster, keeping them in sync, debugging divergence between them.
- **Data freshness:** The batch layer is always N hours behind (where N is the batch frequency), and users see different results depending on whether their query hits the batch or speed layer.

### Kappa Architecture: Stream Only

Jay Kreps (one of Kafka's creators) proposed Kappa architecture in 2014 as an alternative: **eliminate the batch layer entirely**. Process everything as a stream. For historical reprocessing, replay the stream from the beginning with new processing logic.

```
Raw Events (Kafka with long retention)
   |
   +---> Stream Processing (Flink/Kafka Streams)
         - Processes all data as a stream
         - Historical reprocessing: replay from offset 0
         - Single codebase for real-time and historical

Query Layer: reads from materialized views maintained by stream processor
```

Kappa architecture works when:
- Your stream processing system is powerful enough to handle the full historical dataset
- Your Kafka retention is long enough to retain all historical data (or you have a "cold storage" backup that can be replayed)
- Your computation is expressible as a streaming computation (most are, with appropriate state management)

Kappa is simpler operationally (one system instead of two) but more complex in stream processor state management (the stream processor must maintain all derived state, not just recent state).

### Derived Data: The Core Concept

The most important conceptual shift in modern data engineering is treating all secondary representations as **derived data** — data that is computed from a source of truth and can be recomputed if lost.

```
Source of Truth (immutable event log):
  [order_placed, user_123, product_456, $49.99, 2024-01-15]
  [order_shipped, order_789, carrier_fedex, 2024-01-16]
  [order_delivered, order_789, 2024-01-18]
  ...

Derived Data (recomputable from source):
  - orders_by_user table (derived from order_placed events)
  - revenue_by_day table (derived from order_placed events)
  - fulfillment_SLA_report (derived from all three event types)
  - user_lifetime_value_model (derived from all purchase history)
```

The source of truth is the event log. Everything else is derived. If a derived table has a bug, you fix the derivation logic and reprocess the source. You never need to "fix" the source of truth — it's immutable history.

This framing unifies batch processing, stream processing, and database indexing: they are all different ways of deriving secondary representations from a primary source of truth.

## Deep Dive

The MapReduce paper (Dean and Ghemawat, 2004) is worth reading as a systems paper rather than a historical artifact. The insight that made MapReduce powerful was not the map-shuffle-reduce model per se — that model was already known from functional programming — but the observation that the model was expressive enough to encode nearly all large-scale data transformations while admitting an efficient, fault-tolerant distributed execution. The execution model's elegance: map tasks can run on any node that holds the input data (data locality), reducers are completely independent of each other (no inter-reducer communication), and any failed task can be re-executed on any other node because all inputs are immutable and idempotent functions produce the same output from the same input. The fault tolerance is essentially free, a consequence of functional purity applied to distributed execution.

The Dremel paper (Melnik et al., 2010) introduced the columnar storage format that underlies Parquet, ORC, and all modern analytical storage. The key insight is that analytical queries typically access a small subset of columns from a wide table. If the table is stored row-by-row (as in PostgreSQL or CSV), a query that reads 3 of 100 columns must still read all 100 columns' data for each row, wasting 97% of I/O. Columnar storage groups all values of each column together, so a query reading 3 columns reads only 3% of the raw bytes. Combined with column-level compression (values within a column have higher correlation and compress better than values within a row), modern columnar formats achieve 5–20x compression ratios on typical analytical data. Dremel added a hierarchical record shredding scheme to handle nested structures (protocol buffers) in columnar format — representing a nested record without converting it to a flat table — which became the basis for the Parquet format's definition levels and repetition levels.

Spark's key architectural improvement over MapReduce was not simply "in-memory processing" but the RDD lineage graph. In MapReduce, intermediate results are always materialized to HDFS between stages, making fault recovery trivial (re-read from HDFS) but adding enormous I/O overhead for multi-stage pipelines. Spark tracks the DAG of transformations that produced each RDD. If a partition is lost, Spark recomputes only that partition by replaying the relevant lineage — it does not recompute the entire pipeline. The I/O cost is paid only for explicit materializations (checkpoints, `persist()`) and shuffles, not between every pair of consecutive transformations. For iterative algorithms (machine learning training, graph processing) that loop over the same data many times, this difference compounds: each iteration in MapReduce reads from and writes to disk; in Spark, after the first read, each iteration operates on the cached RDD in memory.

The Lambda architecture's fundamental problem — maintaining two codebases that compute the same function over different representations of the same data — is a violation of the DRY principle applied to distributed systems. Kleppmann (building on Jay Kreps's critique) argues that the Lambda architecture was a workaround for the limitations of early stream processing systems: they couldn't handle long windows, couldn't reprocess historical data efficiently, and couldn't guarantee exactly-once semantics. Modern stream processors (Flink, Kafka Streams) address all three limitations: Flink's state backends support windows of arbitrary length backed by RocksDB, Kafka's retained log enables replay from any offset for historical reprocessing, and Kafka's EOS provides exactly-once within the pipeline. The Kappa architecture eliminates the batch layer not by making batch unnecessary but by recognizing that a replay of a retained stream is a batch job — you get both the real-time and historical capabilities from a single system.

The shuffle operation — partitioning and sorting the output of all map tasks and distributing it to reducers — is the most expensive component of MapReduce and Spark jobs, and understanding why reveals the fundamental constraint of any distributed join or groupBy. A groupBy operation requires that all records with the same key end up on the same reducer. In a cluster with N mappers and M reducers, this requires N*M data transfers: each mapper sends a portion of its output to each reducer. The total data transferred is O(data_size), but the number of individual transfers is O(N*M), each potentially crossing a network boundary. At scale (thousands of mappers, hundreds of reducers), the shuffle becomes a massive fan-in/fan-out operation that saturates network bandwidth. This is why minimizing shuffles — through broadcast joins for small tables, pre-partitioning data on join keys, and using reduce-side combiners for associative aggregations — is the primary performance optimization in any MapReduce or Spark job.

## Implementation Guide

**PySpark batch job with DataFrame API:**

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType

def create_daily_revenue_report(input_path: str, output_path: str):
    spark = SparkSession.builder \
        .appName("DailyRevenueReport") \
        .config("spark.sql.adaptive.enabled", "true") \
        .getOrCreate()

    # Schema inference is convenient but slow for large datasets
    # Explicit schema is always better for production jobs
    schema = StructType([
        StructField("order_id", StringType(), False),
        StructField("user_id", StringType(), False),
        StructField("amount", DoubleType(), False),
        StructField("currency", StringType(), False),
        StructField("event_time", TimestampType(), False),
        StructField("status", StringType(), False),
    ])

    orders = spark.read.schema(schema).parquet(input_path)

    # Filter → project → aggregate: pushdown happens automatically
    daily_revenue = (
        orders
        .filter(F.col("status") == "completed")
        .filter(F.col("currency") == "USD")
        .withColumn("date", F.to_date("event_time"))
        .groupBy("date")
        .agg(
            F.sum("amount").alias("total_revenue"),
            F.count("order_id").alias("order_count"),
            F.avg("amount").alias("avg_order_value"),
            F.countDistinct("user_id").alias("unique_customers"),
        )
        .orderBy("date")
    )

    # Write as Parquet with date partitioning for efficient downstream queries
    daily_revenue.write \
        .partitionBy("date") \
        .mode("overwrite") \
        .parquet(output_path)

    spark.stop()

if __name__ == "__main__":
    create_daily_revenue_report(
        input_path="s3://data-lake/orders/",
        output_path="s3://data-warehouse/daily_revenue/"
    )
```

**Implementing the Combiner optimization (local pre-aggregation before shuffle):**

```python
# Without combiner: ALL (word, 1) pairs go across the network
# With combiner: local pre-aggregation reduces shuffle data significantly

from pyspark.sql import SparkSession
import re

spark = SparkSession.builder.appName("WordCount").getOrCreate()

# Without combiner (naive)
naive_count = (
    spark.sparkContext.textFile("hdfs://text/*.txt")
    .flatMap(lambda line: re.findall(r'\w+', line.lower()))
    .map(lambda word: (word, 1))
    .groupByKey()                       # Full shuffle — all (word,1) pairs
    .mapValues(sum)
)

# With combiner (reduceByKey pre-aggregates locally before shuffle)
optimized_count = (
    spark.sparkContext.textFile("hdfs://text/*.txt")
    .flatMap(lambda line: re.findall(r'\w+', line.lower()))
    .map(lambda word: (word, 1))
    .reduceByKey(lambda a, b: a + b)   # Local pre-aggregation, then shuffle
)
# reduceByKey is almost always better than groupByKey + map for associative operations
```

## When to Use / When NOT to Use

**Use batch processing when:**
- You're processing historical data (backfills, retroactive computation)
- Your computation has complex joins that don't fit stream processing's state model
- Query latency of minutes to hours is acceptable
- You're training machine learning models on large datasets
- You need repeatable, auditable computation (compliance reporting, billing reconciliation)

**Use stream processing instead when:**
- Results must be available within seconds
- You're responding to events in real time
- The computation can be expressed as continuous aggregations or event transformations

**Use Spark over Hadoop MapReduce when:**
- Iterative algorithms (always — Spark's in-memory model is orders of magnitude faster)
- Multi-step transformations (fewer disk writes between steps)
- You need SQL semantics (Spark SQL with Catalyst optimizer)
- Your team is familiar with Python or Scala (better APIs)

**Use a columnar query engine (Presto, BigQuery, Athena) over Spark when:**
- Queries are ad-hoc and analytical (scan-heavy, filter-heavy)
- Data is already in columnar format (Parquet, ORC)
- You want serverless/managed scale without cluster management

## Common Mistakes

**Mistake 1: Using groupByKey instead of reduceByKey in Spark.**
`groupByKey` shuffles all values for each key across the network, collecting them on the reducer. `reduceByKey` performs local pre-aggregation before the shuffle, reducing network traffic by the aggregation ratio. For word count over a 1TB corpus, this can be the difference between a 10-minute job and a 1-hour job. Always use `reduceByKey`, `aggregateByKey`, or DataFrame GroupBy for aggregations — never `groupByKey`.

**Mistake 2: Not persisting shared DataFrames in iterative computations.**
If you compute an expensive DataFrame and use it multiple times, Spark will recompute it each time unless you call `.cache()` or `.persist()`. This is the most common performance bug in Spark jobs. Profile your job's DAG (via the Spark UI) and cache any DataFrame that has expensive upstream transformations and multiple downstream uses.

**Mistake 3: Running batch jobs directly on production databases.**
Batch analytics that run directly against an OLTP database (a PostgreSQL or MySQL instance serving your application) will compete with production traffic for I/O resources. Even a read-only analytical query can lock rows, saturate the disk, and cause production latency spikes. Always replicate data to a dedicated analytical store before running batch jobs.

**Mistake 4: Not testing with representative data volumes.**
Batch jobs that work perfectly on 1GB of test data often fail on 1TB of production data due to skew (one key has billions of records), memory pressure (running out of heap during aggregation), or performance (the job takes 10 hours when you expected 1 hour). Always test with a random sample at 10% of production volume before running on full production data.

**Mistake 5: Building Lambda architecture when Kappa would suffice.**
Lambda architecture is operationally complex — maintaining two codebases that must produce identical results is harder than it sounds. Unless your stream processing system genuinely cannot handle historical reprocessing at the scale and speed required, prefer Kappa architecture and eliminate the batch layer.

## Connections

- **Stream Processing (06-stream-processing.md):** Batch and stream processing are complementary. Lambda architecture uses both; Kappa architecture unifies them. Understanding both helps you choose when each is appropriate.
- **Derived Data (12-derived-data.md):** Batch processing is one mechanism for creating derived data. All batch outputs — reports, aggregations, ML models — are derived from the source of truth.
- **Log-Structured Storage (09-log-structured-storage.md):** HDFS and object storage (S3, GCS) are the natural storage layers for batch processing. Understanding how data is stored affects how efficiently it can be processed.
- **Change Data Capture (08-change-data-capture.md):** CDC feeds batch pipelines with database changes. Most data warehouse ETL starts with CDC from operational databases.

## Key Insights

The most profound insight in batch processing is that **MapReduce is the Unix pipeline, scaled to a datacenter**. The same principles — small composable programs, immutable data, text streams as a universal interface — apply at every scale. When you're debugging a Spark job, think of it as a Unix pipeline where each transformation is a command and the shuffle is a pipe. The same intuitions apply.

The second insight is that **batch processing and stream processing are converging**. Apache Beam's unified model treats batch as bounded streams and streaming as unbounded streams. Flink's unified API handles both. The distinction is becoming operational (how you deploy and manage) rather than conceptual (how you think about data transformations).

The third insight is that **the shuffle is the bottleneck**. In MapReduce and Spark, the expensive step is always the shuffle — reading all mapper outputs, partitioning them by key, sorting them, and sending them across the network to reducers. Minimizing shuffles (by fusing transformations, pre-aggregating, partitioning data correctly) is the primary performance optimization in batch jobs. Everything else is secondary.

Finally, the most important architectural insight: **treat all batch outputs as derived data**. If your daily revenue report has a bug, you don't patch the report — you fix the derivation logic and reprocess the source event log. This mindset (immutable source, recomputable derivatives) makes batch data systems correct, auditable, and operationally simple. You can always recover from any bug by replaying the source.
