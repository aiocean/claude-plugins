# Serverless Architecture Patterns

> "Serverless doesn't mean no servers. It means you don't have to think about servers — until you do." — Werner Vogels, AWS CTO

## The Problem

Server management has always been the tax on building software. Provision capacity, patch operating systems, scale clusters up and down, manage deployment pipelines for long-running processes, configure load balancers, think about availability zones. Even as containerization and Kubernetes abstracted away some of this complexity, operating a production Kubernetes cluster requires specialized expertise, ongoing maintenance, and perpetual vigilance. The cognitive overhead of infrastructure management is real and it competes directly with time spent on the business logic that actually creates value.

The serverless model emerged as a different answer to this problem. Instead of asking developers to manage servers, containers, or even clusters — let them write functions, define their triggers, and let the cloud handle the rest. AWS Lambda launched in 2014 and introduced a model so different from everything that preceded it that it took the industry several years to understand both its power and its limitations.

But serverless is not magic. It introduces a different set of trade-offs — cold starts that create latency spikes, vendor lock-in that limits portability, per-invocation pricing that can exceed always-on costs for high-throughput workloads, and debugging complexity in distributed, ephemeral execution environments. The architects who use serverless effectively understand both when it is the right tool and how to compose serverless primitives into reliable, observable, cost-efficient systems. The architects who have been burned by serverless typically adopted it as a universal hammer without understanding when alternatives are better.

This article covers the canonical serverless patterns, when they work, when they don't, and how to build production-grade serverless systems that you can actually operate.

## Core Concept

**The Canonical Serverless Stack**

AWS offers the most mature and widely adopted serverless ecosystem. The canonical production stack consists of:

- **AWS Lambda**: The compute primitive. Functions invoked by events (HTTP, queue message, schedule, stream record, S3 event). Scales from zero to thousands of concurrent executions automatically. Billed per invocation and per GB-second of compute.
- **AWS Step Functions**: Workflow orchestration for multi-step processes. Visual state machine definitions with built-in error handling, retry logic, parallel execution, and human approval steps. The orchestration layer that makes complex serverless workflows manageable.
- **Amazon DynamoDB**: The serverless database. Fully managed NoSQL with automatic scaling, multi-region replication (Global Tables), point-in-time recovery, and on-demand pricing. No cluster to manage, no connection pool to configure.
- **Amazon API Gateway**: HTTP endpoint management. Routes HTTP requests to Lambda functions, handles auth (JWT via Cognito, API keys, Lambda authorizers), rate limiting, and request/response transformation.
- **Amazon EventBridge**: Event bus for event-driven architectures. Routes events from AWS services, your applications, and SaaS providers to Lambda functions, Step Functions, SQS queues, or other targets.
- **Amazon SQS**: Message queue for decoupled, reliable event processing. Lambda polls SQS queues and processes messages in batches, providing backpressure and retry semantics automatically.

**The Serverless Execution Model**

Lambda functions are stateless, ephemeral, single-invocation compute units. The execution lifecycle:

1. **Cold start**: Lambda initializes the execution environment (runtime + code + dependencies). Duration: 100ms-10s depending on runtime (Node.js ~100ms, JVM ~2-5s, Python ~200ms) and initialization code.
2. **Warm invocation**: A previously initialized execution environment handles a subsequent request without re-initialization. Duration: your function's actual execution time only.
3. **Scale-out**: Lambda creates new execution environments in parallel as concurrent invocations increase. Each environment handles one invocation at a time.
4. **Freeze/thaw**: Execution environments are frozen between invocations and thawed on reuse. In-memory state persists within an execution environment but is not shared across environments.

The cold start problem is real but manageable. For user-facing APIs, provisioned concurrency (pre-warming a fixed number of execution environments) eliminates cold starts at the cost of per-hour provisioning charges. For asynchronous workloads (queue processing, scheduled tasks), cold starts are acceptable because they don't directly affect user experience.

## Deep Dive

### The Berkeley View on Serverless Computing: A Research Synthesis

The most comprehensive academic treatment of serverless computing is "Cloud Programming Simplified: A Berkeley View on Serverless Computing" (Hellerstein, Faleiro, Gonzalez, Hellerstein, Kannan, Keerthi, Shenker, Stoica, Tumanov, Zhang — UC Berkeley, 2019). The paper synthesizes the programming model, performance characteristics, and fundamental limitations of Function-as-a-Service systems, providing an analytical framework that goes beyond vendor documentation.

The Berkeley paper identifies five defining properties of serverless: fine-grained automatic scaling (including scale-to-zero), no server management by the application developer, pay-per-use pricing at function invocation granularity, high-level event-driven programming model, and stateless execution. The statelessness property is both the source of serverless's scalability and its primary limitation: because function instances carry no state across invocations, they can be instantiated freely on any available compute node — but any state required by the function must be externalized to a storage service on every invocation, adding latency.

The paper quantifies the cold start problem with empirical measurements: container-based function runtimes (as opposed to isolate-based) incur 100ms-500ms of cold start latency when an execution environment must be provisioned. For invocation rates above roughly 1 per minute, the function stays warm and cold starts are rare. For infrequent invocations (scheduled jobs, rarely-triggered webhooks), cold starts dominate the latency profile. The Berkeley paper proposes "keep-alive" caching as the primary mitigation — the function runtime keeps execution environments alive for a time window after last use — but notes this creates a tension with scale-to-zero pricing since kept-alive environments consume resources.

The paper's most technically significant contribution is the identification of "straggler" problems in serverless compositions. When a workflow involves parallel fanout to N function invocations and waits for all N to complete, the tail latency of the composition is bounded by the slowest invocation — which may include a cold start while other invocations are warm. At scale, the probability that at least one of N parallel invocations experiences a cold start approaches 1 as N grows. This creates a counterintuitive performance pathology: high-parallelism serverless workloads have worse tail latency than low-parallelism equivalents because the probability of at least one slow path increases with fan-out width.

### The Cold Start Anatomy: What Actually Happens

The cold start latency breaks down into three phases that the AWS Lambda team documented in their 2019 re:Invent talk and subsequent builder posts. Phase 1 is **environment provisioning**: the FaaS platform allocates a microVM (Firecracker in Lambda's case, gVisor in Cloud Run) or isolate on a host machine and loads the function's deployment package. Firecracker microVM boot takes approximately 125ms for a minimal runtime; container-based runtimes take longer depending on image size. Phase 2 is **runtime initialization**: the language runtime starts (JVM initialization is the notorious worst case at 200-500ms; Node.js and Python are typically 10-50ms; compiled Go and Rust binaries are under 10ms). Phase 3 is **function initialization**: the handler module loads and executes top-level initialization code — database connection pool creation, SDK client initialization, configuration loading. This phase is entirely under the developer's control and is the most commonly misunderstood contributor to cold start latency.

The AWS Firecracker paper (Agache, Brooker, Iordache, Liguori, Neugebauer, Piwonka, Popa — Amazon, 2020, NSDI) describes the architectural innovation that enabled Lambda's scale: Firecracker is a lightweight Virtual Machine Monitor (VMM) using Linux KVM, with a deliberately minimized device model. A Firecracker microVM exposes only virtio-net, virtio-block, serial, and keyboard — omitting all the legacy hardware emulation of QEMU. The result is a guest boot time under 125ms and a VMM memory overhead under 5MB per instance, enabling thousands of microVMs per host with strong security isolation between tenants. The paper notes that Firecracker's design was specifically shaped by the serverless constraint that cold start latency must be acceptable to customers: every design decision that reduced microVM boot time was valued above QEMU compatibility.

### The Durable Execution Pattern: Stateful Workflows in Stateless Functions

The fundamental tension in serverless — stateless execution for scalability, stateful workflows for business logic — is resolved by the durable execution pattern, formalized in the Temporal open-source project (originally developed at Uber) and independently in the Azure Durable Functions framework. Both implement the same core idea: the execution state of a long-running workflow is persisted as an event log, and the function is replayed from the beginning of the log on each invocation to reconstruct the in-memory state.

This approach draws directly from event sourcing (covered in Volume 5): the event log is the source of truth, and the current state is a projection over the log. For workflows, this means a multi-step process (place order → charge payment → allocate inventory → dispatch shipping → send confirmation) can be implemented as a single function that calls sub-activities and awaits their results. If the workflow function is interrupted at any point — process crash, scale-in event, timeout — the runtime replays the event log on the next invocation, skipping already-completed activities by returning their recorded results instead of re-executing them. The function code is written as if it executes sequentially; the durable execution runtime handles the persistence and replay transparently.

The replay model requires that workflow functions be deterministic: the same log must always produce the same execution path. Non-deterministic operations (random numbers, current time, direct I/O) must be performed through the durable execution runtime's activity wrapper so their results can be recorded in the log and replayed consistently. This constraint is the primary source of durable execution bugs: developers who call `Date.now()` directly in workflow code get non-deterministic replay failures when the recorded time and the replay time differ.

## Implementation Guide

**Pattern 1: Event-Driven Fan-Out / Fan-In**

Decompose a large task into parallel subtasks, process them concurrently, and aggregate results:

```javascript
// Fan-out: distribute work to parallel processors
// EventBridge rule triggers this function with a batch of items
exports.fanOutHandler = async (event) => {
  const items = event.detail.items;
  
  // Dispatch each item as an independent event
  const dispatches = items.map(item => 
    eventbridge.putEvents({
      Entries: [{
        Source: 'myapp.processor',
        DetailType: 'ProcessItem',
        Detail: JSON.stringify({ itemId: item.id }),
        EventBusName: process.env.EVENT_BUS_NAME
      }]
    }).promise()
  );
  
  await Promise.all(dispatches);
  
  // Record fan-out job for aggregation
  await dynamodb.putItem({
    TableName: process.env.JOBS_TABLE,
    Item: {
      jobId: { S: event.detail.jobId },
      totalItems: { N: String(items.length) },
      completedItems: { N: '0' },
      status: { S: 'PROCESSING' }
    }
  }).promise();
};

// Fan-in: each processor increments completed count
// when all complete, job status → DONE
exports.itemProcessorHandler = async (event) => {
  await processItem(event.detail.itemId);
  
  const result = await dynamodb.updateItem({
    TableName: process.env.JOBS_TABLE,
    Key: { jobId: { S: event.detail.jobId } },
    UpdateExpression: 'ADD completedItems :inc',
    ExpressionAttributeValues: { ':inc': { N: '1' } },
    ReturnValues: 'ALL_NEW'
  }).promise();
  
  const attrs = result.Attributes;
  if (attrs.completedItems.N === attrs.totalItems.N) {
    await markJobComplete(event.detail.jobId);
  }
};
```

**Pattern 2: Saga with Step Functions**

Orchestrate a distributed transaction across multiple services with compensating transactions on failure:

```json
{
  "Comment": "Order fulfillment saga",
  "StartAt": "ReserveInventory",
  "States": {
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:reserve-inventory",
      "Catch": [{ "ErrorEquals": ["InsufficientInventory"], "Next": "OrderFailed" }],
      "Next": "ChargePayment"
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:charge-payment",
      "Catch": [{ "ErrorEquals": ["PaymentDeclined"], "Next": "ReleaseInventory" }],
      "Next": "CreateShipment"
    },
    "ReleaseInventory": {
      "Type": "Task",
      "Comment": "Compensating transaction",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:release-inventory",
      "Next": "OrderFailed"
    },
    "CreateShipment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:create-shipment",
      "Next": "OrderComplete"
    },
    "OrderComplete": { "Type": "Succeed" },
    "OrderFailed": { "Type": "Fail" }
  }
}
```

**Pattern 3: Strangler Fig via API Gateway**

Migrate a monolith to serverless incrementally by routing paths to Lambda while keeping others on the legacy application:

```yaml
# SAM template
ApiGateway:
  Type: AWS::Serverless::Api
  Properties:
    DefinitionBody:
      paths:
        /api/v2/users:       # New serverless endpoint
          x-amazon-apigateway-any-method:
            x-amazon-apigateway-integration:
              type: aws_proxy
              uri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/functions/${UsersFunction.Arn}/invocations
        /{proxy+}:           # Everything else → legacy origin
          x-amazon-apigateway-any-method:
            x-amazon-apigateway-integration:
              type: http_proxy
              uri: !Sub https://legacy.internal.example.com/{proxy}
```

**Pattern 4: Event Sourcing + CQRS**

Use DynamoDB Streams as the event source and Lambda for read model projection:

```javascript
// DynamoDB Stream → Lambda → read model projections
exports.orderProjectionHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') continue;
    
    const newImage = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
    
    switch (newImage.eventType) {
      case 'ORDER_PLACED':
        await updateOrderSummaryReadModel(newImage);
        await updateCustomerOrderCountReadModel(newImage);
        break;
      case 'ORDER_SHIPPED':
        await updateOrderStatusReadModel(newImage);
        await sendShippingNotification(newImage);
        break;
    }
  }
};
```

**Pattern 5: Cost-Aware Lambda Configuration**

```javascript
// Right-size memory: more memory = more CPU = faster execution
// Optimal memory = point where cost (memory × duration) is minimized
// Use AWS Lambda Power Tuning to find the sweet spot

// Lambda Power Tuning result example:
// 128MB: 2000ms execution = 0.000000208 USD per invocation
// 512MB: 600ms execution  = 0.000000250 USD per invocation  
// 1024MB: 320ms execution = 0.000000267 USD per invocation
// 256MB: 900ms execution  = 0.000000187 USD per invocation ← optimal

// For this function, 256MB minimizes cost while keeping latency acceptable

// Minimize cold start impact: keep initialization outside handler
const dbClient = new DynamoDBClient({}); // initialized once per cold start
const cache = new Map();                  // in-memory cache, per execution env

exports.handler = async (event) => {
  // handler uses pre-initialized clients
  const item = await dbClient.send(new GetItemCommand({...}));
  return item;
};
```

## When to Use / When NOT to Use

**Serverless excels when:**
- Traffic is bursty or unpredictable — serverless scales from zero to peak without pre-provisioning
- Event-driven processing — S3 uploads, SQS messages, DynamoDB streams are natural Lambda triggers
- Scheduled batch jobs — cron-triggered Lambda replaces cron servers entirely
- Lightweight API backends — for APIs with < 1M requests/day and moderate complexity, serverless is operationally simple and often cheaper
- Microservices with low sustained throughput — services that handle hundreds of requests/hour not thousands/second

**Serverless is wrong when:**
- **Sustained high throughput**: A Lambda processing 10,000 requests/second costs significantly more than an EC2 fleet or ECS service at the same throughput. The per-invocation pricing model inverts above approximately 1-2M invocations/day for most workload profiles.
- **Long-running processes**: Lambda max execution time is 15 minutes. Workloads that run for hours (video encoding, ML training, large data processing) need containers or EC2.
- **WebSocket / long-lived connections**: Lambda's stateless model does not handle persistent connections natively. Use API Gateway WebSocket APIs with DynamoDB for connection state, but recognize the architectural complexity this introduces.
- **Latency-critical paths where cold starts are intolerable**: Even with provisioned concurrency, the Lambda execution model adds overhead compared to an always-warm container. If your p99 latency SLO is under 20ms, serverless is the wrong choice.
- **When vendor lock-in is unacceptable**: Lambda functions can be migrated, but Step Functions workflows, DynamoDB-specific features (streams, transactions), and API Gateway integrations create strong coupling to AWS. Evaluate portability requirements before committing to the full serverless stack.

**When serverless costs MORE than alternatives:**
Calculate your break-even point. For Lambda:
- At $0.0000002 per 128MB-second invocation
- 1M invocations/day at 200ms each = $0.20/day = $73/year
- 10M invocations/day at 200ms each = $2/day = $730/year  
- 100M invocations/day at 200ms each = $20/day = $7,300/year

A t3.medium EC2 instance ($30/month) serving the same 100M invocations/day (with horizontal scaling) costs significantly less. The crossover point varies by workload; calculate it before assuming serverless is cheaper at scale.

## Common Mistakes

**Mistake 1: One monolithic Lambda function**
Packaging your entire application into a single Lambda function defeats the purpose. You lose independent scaling, independent deployment, and the ability to right-size memory/timeout per function. Keep functions small, single-purpose, and independently deployable.

**Mistake 2: Synchronous chains of Lambda functions**
Calling Lambda A which synchronously calls Lambda B which calls Lambda C creates cascading latency (cold start × N) and cascading failure (if C fails, A and B fail). Use event-driven choreography (EventBridge, SQS) or orchestrated workflows (Step Functions) instead of direct synchronous chaining.

**Mistake 3: No dead-letter queues**
When a Lambda function fails to process an SQS message or event, what happens to it? Without DLQs, messages are silently dropped after the retry limit. Always configure DLQs on every event source and monitor DLQ message counts as an operational alert.

**Mistake 4: Ignoring connection pool exhaustion**
Lambda scales to thousands of concurrent executions. Each execution that opens a database connection can exhaust your RDS connection pool instantly. Use RDS Proxy (connection pooling for Lambda → RDS) or DynamoDB (no connection pool concept) for database access from Lambda.

**Mistake 5: No distributed tracing**
Serverless architectures are distributed by nature — a single user request may trigger 5-10 Lambda invocations, SQS messages, DynamoDB operations, and Step Functions state transitions. Without distributed tracing (AWS X-Ray, OpenTelemetry), debugging production issues is essentially impossible. Instrument every function from day one.

**Mistake 6: Treating Step Functions as an orchestrator for simple pipelines**
Step Functions Express Workflows cost $0.00001 per state transition. A high-throughput pipeline that runs 10 million workflows/day with 10 states each costs $1,000/day in Step Functions alone. Evaluate whether a simple Lambda that sequentially calls other Lambdas is sufficient before adopting Step Functions orchestration.

## Connections

- **Sustainable Architecture (Article 5, this volume)**: Scale-to-zero serverless is the most energy-efficient compute model for bursty workloads. Lambda functions consuming zero energy when idle is the sustainable architecture argument for serverless.
- **Edge Computing (Article 3, this volume)**: Lambda@Edge and CloudFront Functions are specialized serverless runtimes optimized for edge execution. The serverless model applies at the CDN tier with tighter execution constraints.
- **Actor Model (Article 7, this volume)**: Lambda functions are conceptually similar to actors — stateless, message-driven, single-invocation computation. The difference is that actors maintain state across messages while Lambda functions are stateless between invocations.
- **Reactive Systems (Article 8, this volume)**: Serverless architectures built on SQS and EventBridge implement reactive principles naturally — message-driven communication, backpressure through queue depth, elastic scaling through Lambda concurrency.

## Key Insights

1. **Serverless is an operational model, not a technology choice.** The value of serverless is eliminating operational overhead — no servers to patch, no clusters to scale, no on-call for infrastructure failures. If you adopt Lambda but still manage deployment infrastructure, VPC configurations, and autoscaling policies manually, you have not captured the operational value.

2. **Step Functions is the missing piece.** Lambda functions in isolation can implement simple single-step logic. Step Functions transforms them into reliable, observable, business-logic-bearing workflows. The combination of Lambda (compute) + Step Functions (orchestration) + DynamoDB (state) can implement arbitrarily complex business processes without managing any servers.

3. **Cold starts are a solvable problem with cost trade-offs.** Provisioned concurrency eliminates cold starts by pre-warming execution environments at per-hour cost. For user-facing APIs, the cost of provisioned concurrency is usually justified. For async workloads, cold starts are acceptable. Don't let cold start fear prevent appropriate serverless adoption; don't ignore cold start reality in latency-sensitive contexts.

4. **The cost model inverts at scale.** Serverless is almost always the right cost model for < 1M daily invocations. Above 10M daily invocations, the math tilts toward always-on compute. Calculate your break-even before committing to serverless for high-throughput workloads.

5. **Observability is harder, not easier.** Ephemeral execution environments, distributed invocations, and asynchronous processing make serverless systems harder to debug than monoliths. Invest in distributed tracing, structured logging, and DLQ monitoring from the beginning. Observability is not optional in serverless.

6. **The strangler fig pattern makes serverless migration tractable.** You do not need to rewrite your entire application to adopt serverless. API Gateway as a routing layer enables incremental migration: route new endpoints to Lambda while existing endpoints continue serving from the legacy application. The migration can proceed at your own pace without a big-bang rewrite.
