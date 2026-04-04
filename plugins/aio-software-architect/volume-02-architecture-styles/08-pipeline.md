# Pipeline (Pipes and Filters) Architecture

> "This is the Unix philosophy: Write programs that do one thing and do it well. Write programs to work together. Write programs to handle text streams, because that is a universal interface." — Doug McIlroy

## The Problem

Data transformation is a universal problem in software. Raw data arrives in one form and must be produced in another. A log file needs to be parsed, filtered, enriched with geographic data, aggregated by time window, and loaded into a analytics database. An image upload needs to be validated, resized to multiple dimensions, converted to WebP format, watermarked, and stored in object storage. A financial transaction needs to be decoded, validated against compliance rules, enriched with customer profile data, checked against fraud models, and either approved or flagged.

The naive approach to these transformation problems is to write a single function or class that does everything. The "process image" function validates, resizes, converts, watermarks, and stores. This works for simple cases. It fails as complexity grows. The function becomes a tangled mass of mixed concerns — validation logic next to image processing logic next to file I/O. Testing requires setting up all the dependencies at once. Adding a new step means modifying a function that already works. Reusing the "resize" step for a different workflow is impossible without copy-paste.

The pipeline pattern — pipes and filters — addresses this by decomposing the transformation into a sequence of independent, single-purpose processing steps connected by data conduits. Each step does one thing. Each step is testable in isolation. Steps can be composed into different pipelines for different workflows. The structure is so intuitive that it predates computers: assembly lines, conveyor belts, and industrial processes all follow the same pattern.

## Core Concept

A pipeline architecture organizes a system as a directed sequence of processing stages (filters) connected by data conduits (pipes). Data enters at one end, is transformed by each filter in sequence, and exits at the other end in its final form.

```
                Pipeline: Image Processing

Input ──► [ Validate ] ──► [ Resize ] ──► [ Convert ] ──► [ Watermark ] ──► [ Store ] ──► Output
           Format,          Multiple        JPEG→WebP       Company          S3 Object
           Size,            Dimensions      PNG→WebP         Logo             Storage
           Type checks      (thumb, med,
                            large)
```

The components:

**Pipes**: The conduits that carry data between filters. In different implementations, a pipe may be:
- A direct function call (in-process pipeline)
- A channel or queue (concurrent pipeline)
- A message broker topic (distributed pipeline)
- A Unix pipe (shell pipeline)
- A stream (Kafka Streams, Flink, Spark Streaming)

**Filters**: The processing stages. Each filter:
- Receives data from its input pipe
- Performs a single, well-defined transformation
- Passes the result to its output pipe
- Is stateless (ideally) — its output depends only on its current input, not on history

The critical constraint: **filters should be stateless**. A filter that maintains state between invocations creates hidden coupling between invocations. Stateless filters can be run in parallel (multiple instances processing different data concurrently), reordered, and tested trivially.

### Pipeline Topologies

**Linear pipeline**: The classic form. Data flows through filters in a fixed sequence.

```
Source → F1 → F2 → F3 → Sink
```

**Branching pipeline**: Data splits at a decision point and follows different paths based on content.

```
Source → F1 → [Route] → F2a → F4 → Sink
                      → F2b → F4 → Sink
```

**Merging pipeline**: Multiple streams of data converge before processing.

```
Source1 → F1 ─┐
               ├→ [Merge] → F3 → Sink
Source2 → F2 ─┘
```

**Feedback pipeline**: Output from a late stage feeds back into an earlier stage. Used in iterative processing (machine learning training loops, retry workflows).

```
Source → F1 → F2 → F3 → [Decision] → Sink
                             │
                             └→ F2 (feedback on failure)
```

### The Unix Heritage

The Unix shell pipeline is the original and purest implementation of this pattern, and understanding it illuminates why the pattern works so well.

```bash
# Find the ten most common words in a file
cat essay.txt \
  | tr -cs '[:alpha:]' '\n' \    # replace non-alpha with newlines
  | tr '[:upper:]' '[:lower:]' \ # lowercase
  | sort \                        # sort alphabetically
  | uniq -c \                     # count occurrences
  | sort -rn \                    # sort by count descending
  | head -10                      # take top 10
```

Each command (`tr`, `sort`, `uniq`, `head`) is a filter. The `|` operator is the pipe. Each command:
- Reads from stdin (the pipe)
- Performs one transformation
- Writes to stdout (the next pipe)
- Is entirely unaware of what came before it or after it

This composability is profound. `sort` can be used in any pipeline that needs sorting. `head` can be used in any pipeline that needs the first N items. The combination of simple, well-defined filters with a universal interface (text streams) creates enormous expressive power from a small set of building blocks.

## Deep Dive

### The Unix Heritage and Its Architectural Lesson

The pipeline pattern's deepest intellectual roots are in the Unix philosophy articulated by Doug McIlroy: write programs that do one thing well, write programs that work together, and use text streams as the universal interface. The "Software Engineering at Google" book's discussion of "simplicity" as an engineering virtue points to Unix pipelines as one of the clearest demonstrations of the principle in practice. Unix's success as a platform is inseparable from the pipeline's composability: `sort`, `grep`, `awk`, `sed`, `wc` are each individually modest tools. Their combination through the pipe operator produces a data processing capability that rivals dedicated applications. The architectural lesson is that the interface between components (the pipe, the text stream, the queue message) is as important as the components themselves. Design the interface correctly and simple components compose into powerful systems.

The "Software Engineering at Google" book's analysis of "modularity at scale" observes that pipelines achieve a specific form of modularity that layered architectures do not: each filter's correctness can be verified independently of every other filter. A layered architecture has components that interact in complex ways — a bug in the business layer may produce incorrect inputs to the persistence layer, producing incorrect database state that was not the persistence layer's fault. In a pipeline, each filter receives its input from the pipe and produces its output to the pipe. If the output is wrong, the filter is wrong — full stop. This makes pipeline systems unusually amenable to isolated testing and incremental debugging.

### What Google's Dataflow Research Reveals About Unified Batch and Stream Processing

Google's research paper "The Dataflow Model: A Practical Approach to Balancing Correctness, Latency, and Cost in Massive-Scale, Unbounded, Out-of-Order Data Processing" is one of the most consequential published contributions to data engineering. The paper, which became the foundation for Apache Beam and influenced Apache Flink, addresses a problem that had plagued data pipeline engineering for years: batch pipelines and streaming pipelines were treated as fundamentally different systems requiring different codebases, different expertise, and different operational tooling.

The Dataflow paper's key insight — that batch processing is a special case of stream processing where the stream happens to be bounded — unified the two models. The practical consequence is that a pipeline expressed in the Dataflow/Beam model can run as a batch job over historical data and as a streaming job over live data using the same code. This matters architecturally because it eliminates the "lambda architecture" anti-pattern, where teams maintain separate batch and streaming pipelines that must produce consistent results but inevitably diverge. The Google SRE Book's emphasis on "eliminating toil" — repetitive manual work that scales with system complexity — applies directly: maintaining two parallel pipeline implementations to serve the same business function is toil that the Dataflow model eliminates.

The paper's treatment of "windowing" — how to aggregate events that arrive out of order across time windows — provides insights that apply to any pipeline dealing with temporal data. The key distinction between "event time" (when an event actually occurred) and "processing time" (when the pipeline processes the event) is fundamental to understanding pipeline correctness for real-world data. Data arrives late. Networks introduce variable delay. Processing nodes fail and recover, replaying events. A pipeline that conflates event time and processing time will produce incorrect aggregations whenever the real world does not cooperate with its assumptions. The Dataflow model's explicit handling of this distinction, through watermarks and triggers, is the approach that production pipelines at Google's scale have validated.

### The AWS Well-Architected Framework on Data Pipeline Reliability

The AWS Builder's Library essay "Avoiding insurmountable queue backlogs" was written specifically about the failure mode that pipeline architectures are most susceptible to: a slow or failed consumer stage allows the queue between stages to grow unboundedly. When the consumer recovers, it faces a backlog that it cannot process fast enough to catch up while also keeping pace with new arrivals. The queue grows until it is full, at which point producers begin blocking, and the failure propagates upstream.

The Builder's Library's prescription is a set of design principles that production pipeline engineers learn through painful experience. First, consumer throughput must exceed producer throughput under normal operating conditions — there must be headroom. Second, the queue must have a bounded maximum depth, and producers must have a defined behavior (backpressure, dropping, alerting) when the queue is full. Third, monitoring must treat queue depth as a leading indicator of trouble, not a lagging indicator. When the queue begins growing, something is wrong — even if no alerts have fired yet.

The AWS Well-Architected Framework's performance efficiency pillar adds the recommendation of "adaptive capacity" — the ability to scale consumer instances in response to queue depth increases. This is the operational pattern that makes distributed pipelines resilient: automatic scaling ensures that transient increases in producer throughput (a traffic spike, a batch job completing) trigger proportional increases in consumer capacity before the queue becomes unmanageable. The Microsoft Azure Architecture Center's guidance on "competing consumers pattern" describes the same principle for Azure's message queue infrastructure: multiple consumer instances reading from the same queue provide both throughput and resilience, with each instance processing messages independently and the queue providing the coordination without requiring consumer instances to know about each other. This is the pipeline pattern operating at its cleanest: stateless consumers, a queue as the coordination mechanism, and horizontal scaling as the operational lever.

## Implementation Guide

### Step 1: Identify the transformation stages

Break your transformation process into atomic, single-purpose steps. For each step, ask:
- What is the input type?
- What is the output type?
- Does this step depend on any external state, or only on its input?
- Can this step fail, and how should failure be handled?

For an order processing pipeline:

```
1. Deserialize:    bytes → OrderRequest
2. Validate:       OrderRequest → ValidatedOrder (or ValidationError)
3. EnrichCustomer: ValidatedOrder → EnrichedOrder (adds customer data)
4. CheckInventory: EnrichedOrder → InventoryCheckedOrder (or OutOfStockError)
5. CalculatePrice: InventoryCheckedOrder → PricedOrder
6. ApplyDiscounts: PricedOrder → DiscountedOrder
7. Reserve:        DiscountedOrder → ReservedOrder
8. Persist:        ReservedOrder → ConfirmedOrder
9. Notify:         ConfirmedOrder → void (side effect: email sent)
```

### Step 2: Define the pipe contract

In a typed language, the pipe contract is the data type passed between filters. Define explicit types for each stage's output:

```typescript
// Each stage has a clear input and output type
type OrderRequest = { customerId: string; items: OrderItem[]; };
type ValidatedOrder = OrderRequest & { validatedAt: Date; };
type EnrichedOrder = ValidatedOrder & { customer: CustomerProfile; };
type PricedOrder = EnrichedOrder & { lineItems: PricedLineItem[]; subtotal: Money; };
type ConfirmedOrder = PricedOrder & { orderId: string; confirmedAt: Date; };

// Each filter is a function from one type to the next
type Filter<In, Out> = (input: In) => Promise<Out>;

const validateOrder: Filter<OrderRequest, ValidatedOrder> = async (order) => {
  if (!order.items.length) throw new ValidationError('Order must have at least one item');
  return { ...order, validatedAt: new Date() };
};
```

### Step 3: Build the pipeline executor

The pipeline executor connects filters and handles the data flow:

```typescript
class Pipeline<TInput, TOutput> {
  private filters: Filter<unknown, unknown>[] = [];
  
  pipe<TNext>(filter: Filter<TOutput, TNext>): Pipeline<TInput, TNext> {
    const newPipeline = new Pipeline<TInput, TNext>();
    newPipeline.filters = [...this.filters, filter as Filter<unknown, unknown>];
    return newPipeline;
  }
  
  async execute(input: TInput): Promise<TOutput> {
    let current: unknown = input;
    for (const filter of this.filters) {
      current = await filter(current);
    }
    return current as TOutput;
  }
}

// Compose the order processing pipeline
const orderPipeline = new Pipeline<OrderRequest, ConfirmedOrder>()
  .pipe(validateOrder)
  .pipe(enrichWithCustomer)
  .pipe(checkInventory)
  .pipe(calculatePrice)
  .pipe(applyDiscounts)
  .pipe(reserveInventory)
  .pipe(persistOrder)
  .pipe(sendConfirmationEmail);

// Execute
const confirmed = await orderPipeline.execute(incomingOrderRequest);
```

### Step 4: Add error handling and observability

Each filter can fail. The pipeline executor should handle failures gracefully:

```typescript
async execute(input: TInput): Promise<Result<TOutput, PipelineError>> {
  let current: unknown = input;
  
  for (const [index, filter] of this.filters.entries()) {
    const stepName = this.filterNames[index];
    const startTime = Date.now();
    
    try {
      current = await filter(current);
      metrics.recordFilterSuccess(stepName, Date.now() - startTime);
    } catch (error) {
      metrics.recordFilterFailure(stepName, error);
      logger.error(`Pipeline failed at step: ${stepName}`, { error, input: current });
      return Result.failure(new PipelineError(stepName, error));
    }
  }
  
  return Result.success(current as TOutput);
}
```

### Step 5: For distributed pipelines, use message queues between stages

When stages need to run at different scales, at different speeds, or in different processes:

```
Stage 1: Image Upload Handler
  → publishes to: images.uploaded (Kafka topic)

Stage 2: Image Validator (3 instances)
  → consumes from: images.uploaded
  → publishes to: images.validated

Stage 3: Image Resizer (10 instances — most compute-intensive)
  → consumes from: images.validated
  → publishes to: images.resized

Stage 4: Image Converter (5 instances)
  → consumes from: images.resized
  → publishes to: images.converted

Stage 5: CDN Uploader (3 instances)
  → consumes from: images.converted
  → publishes to: images.distributed
```

Each stage can scale independently based on its processing time and load. The Kafka topic acts as a buffer and checkpoint between stages.

## When to Use

**Pipeline architecture is the right choice when:**

- **Your processing is naturally sequential with distinct stages**: Data transformation, ETL (Extract, Transform, Load), document processing, media encoding, order fulfillment workflows — any sequence of steps where each step has a clear single responsibility.

- **You need to add, remove, or reorder processing steps frequently**: Business rules change. New compliance requirements add new validation steps. New output formats require new encoding steps. The pipeline pattern makes these changes additive — add a new filter, do not modify existing filters.

- **Different stages have different resource requirements**: CPU-intensive image resizing needs more cores; I/O-intensive database lookups need more connections. Distributing stages across separate processes or containers lets you scale each stage independently.

- **You need retry and partial failure recovery**: In a pipeline with Kafka between stages, if stage 3 fails, it can retry from its last checkpoint without reprocessing stages 1 and 2. This is much harder to implement in a monolithic transformation function.

- **You are building data streaming or analytics infrastructure**: ETL pipelines, log processing, metrics aggregation, real-time analytics — all of these are naturally expressed as pipelines.

## When NOT to Use

**Pipeline architecture is the wrong choice when:**

- **Your transformations are tightly interdependent**: If step 5 needs to pass information back to step 2 to influence its reprocessing, you have a feedback loop that fights the linear pipeline model. Consider a different approach (state machine, recursive processing).

- **You need low latency for simple operations**: The overhead of a multi-stage pipeline — type checking, error handling, metrics collection at each stage — adds up. For simple, low-latency operations that a single function handles in microseconds, a pipeline is over-engineering.

- **Your data does not flow linearly**: Some problems are inherently graph-structured rather than pipeline-structured. A recommendation engine that jointly processes user history, item features, and context signals is not naturally a pipeline.

- **Your transformations require significant shared state between records**: If processing record N depends heavily on records N-1 through N-100, the stateless filter model is a poor fit. Stateful stream processing frameworks (Flink, Kafka Streams) handle this case with explicit state management, but they add significant complexity.

## Common Mistakes

### 1. Filters That Do Too Much

The most common mistake is filters that violate the single responsibility principle. An "EnrichAndValidate" filter that does both enrichment and validation is two filters disguised as one. When you need to change the validation logic, you risk breaking the enrichment logic. When you want to reuse the enrichment logic in a different pipeline, you cannot extract it cleanly.

Name each filter with a verb that describes exactly one action. If you find yourself using "and" in the filter's name, split it.

### 2. Stateful Filters That Hide Dependencies

A filter that maintains state between invocations creates implicit dependencies between what should be independent processing steps. The worst form: a filter that reads from a cache that another filter writes to. The pipeline now has hidden data dependencies that are not expressed in the pipe structure.

Make state explicit. If a filter needs context from previous processing, pass that context through the data being piped, not through shared external state.

### 3. No Dead Letter Queue for Failures

In a distributed pipeline, messages that cannot be processed (due to bad data, downstream service failures, or bugs) need somewhere to go. Without a dead letter queue (DLQ), they either block the pipeline (blocking the whole queue) or are silently dropped (data loss).

Every stage in a distributed pipeline should have a DLQ configured. Failed messages go to the DLQ with error metadata. Operational tooling monitors the DLQ. Teams process DLQ messages when the root cause is fixed.

### 4. Overusing Synchronous Pipelines for Long-Running Stages

If a pipeline stage takes 30 seconds (video transcoding, large document processing), synchronous pipeline execution means the calling thread is blocked for 30 seconds. This is fine for a background job; it is terrible for a user-facing API response.

Use asynchronous pipelines (message queues between stages) for any stage with latency measured in seconds. Use synchronous pipelines only when every stage completes in milliseconds.

### 5. No Backpressure Mechanism

In a distributed pipeline where producers are faster than consumers, without backpressure, the in-flight data accumulates in the queues between stages. Eventually the queues overflow or the system runs out of memory.

Configure backpressure at every stage: maximum queue depth, flow control signals back to producers, consumer scaling policies. Kafka's consumer lag metrics, combined with autoscaling policies, provide a practical implementation.

## Connections

The pipeline pattern connects broadly across the architecture landscape:

- **Event-Driven Architecture** uses pipelines for stream processing. Kafka Streams and Apache Flink implement EDA + pipeline together: events flow through a pipeline of transformations, with the Kafka topic infrastructure providing the pipes.
- **Microservices** can be organized as a pipeline where each service is a filter and the API calls or message queues are the pipes. This is the "choreography" variant of event-driven microservices.
- **Hexagonal Architecture** frequently wraps pipeline stages — each filter is implemented as a domain service with input and output ports, keeping the transformation logic independent of the pipe infrastructure.
- **ETL (Extract, Transform, Load)** is the data engineering application of the pipeline pattern. Modern ETL tools (dbt, Apache Airflow, Prefect) all implement some variant of directed acyclic graph (DAG) execution — a generalization of linear pipelines.

## Key Insights

1. **The Unix pipe is the most successful implementation of this pattern in history.** The reason Unix became the foundation of modern computing is largely because the pipe operator enabled composition of simple tools into powerful workflows. The same principle applies at every scale: small, composable transformations beat large, monolithic ones.

2. **Statelessness in filters is the key to scalability.** A stateless filter can run as ten parallel instances without coordination. A stateful filter requires careful partitioning, distributed state management, and coordination overhead. Design filters to be stateless; isolate state to explicit, well-managed components.

3. **The pipe between stages is as important as the stages themselves.** In a distributed pipeline, the queue or stream between stages provides buffering, backpressure, replay capability, and isolation of failure. Invest as much thought in the pipes as in the filters.

4. **Pipelines are naturally observable.** Each filter is a measurement point: how many records entered, how many exited, what was the processing latency, what was the error rate. This observability is far easier to achieve in a pipeline than in a monolithic transformation function. Use it.

5. **The pipeline pattern scales from shell scripts to petabyte-scale data infrastructure.** The same conceptual pattern applies whether you are writing `cat file | grep pattern | sort | uniq` in a shell script or building a distributed streaming pipeline that processes billions of events per day in Flink. The pattern's universality is evidence of its fundamental correctness.

6. **Reordering filters is a powerful optimization technique.** Place filters that reduce data volume early in the pipeline (filtering, sampling) and filters that are computationally expensive late. This reduces the amount of data processed by expensive stages.

7. **Idempotent filters make distributed pipelines recoverable.** If a filter processes the same record twice (due to retry), the output should be the same as processing it once. Design filters for idempotency from the start — it dramatically simplifies failure recovery in distributed pipelines.
