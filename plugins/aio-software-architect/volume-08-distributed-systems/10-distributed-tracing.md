# Distributed Tracing

> "A request enters your system. It touches twelve services, forty database queries, three cache lookups, and two external API calls. Something is slow. Good luck finding it." — the pre-tracing era

## The Problem

A user reports that checkout is slow. Your checkout service looks fine — its latency metrics are normal. But something in the call chain is adding 800ms. You have logs in each service, but they are siloed. Service A's log shows it called service B at 14:03:00.412. Service B's log shows it received a request at 14:03:00.415. But which request? Your payment service handles thousands of requests per second. How do you find the specific invocation that was slow?

Without distributed tracing, debugging cross-service latency requires:
1. Finding the request in service A's logs
2. Extracting some correlation ID
3. Searching service B's logs for that ID
4. Repeating for services C, D, E, F
5. Correlating timestamps manually across services with potentially skewed clocks
6. Building a mental model of the full call tree

This process takes hours for experienced engineers and is nearly impossible for complex call trees. The root cause is often found only after the next incident or never at all.

Distributed tracing solves this by instrumenting every service to emit structured timing data (spans) with a shared identifier (trace ID) that connects all spans belonging to one end-to-end request. A tracing system collects these spans, assembles the call tree, and presents the full request path as a single visualization — the Gantt chart of your distributed system.

## Core Concept

### Traces, Spans, and Context Propagation

A **trace** represents one end-to-end request through your system. A **span** represents one unit of work within that trace — typically one service's handling of the request, or one significant operation within a service.

```
Trace for a checkout request:

Trace ID: abc123

[Order Service          ───────────────────────────────────── 850ms]
  [Validate Cart        ── 12ms]
  [Auth Service Call    ──── 45ms]
    [Token Verify       ─── 40ms]
  [Payment Service Call                       ──────── 750ms]   ← SLOW
    [Fraud Check        ─── 30ms]
    [External Gateway   ──────────────────────────── 700ms]      ← ROOT CAUSE
    [DB Write           ─── 15ms]
  [Inventory Service    ───── 35ms]

Span structure for "External Gateway" span:

{
  "trace_id": "abc123",
  "span_id": "span789",
  "parent_span_id": "span456",  // "Payment Service" span
  "operation_name": "stripe.charges.create",
  "service_name": "payment-service",
  "start_time": "2024-01-15T14:03:00.612Z",
  "duration_ms": 700,
  "status": "OK",
  "tags": {
    "http.method": "POST",
    "http.url": "https://api.stripe.com/v1/charges",
    "http.status_code": 200
  },
  "events": [
    {"time": "2024-01-15T14:03:00.620Z", "message": "DNS resolved"},
    {"time": "2024-01-15T14:03:00.631Z", "message": "TLS handshake complete"}
  ]
}
```

**Context propagation** is the mechanism by which the trace ID flows from service to service through HTTP headers, gRPC metadata, or message queue headers.

```
Context propagation via HTTP headers (W3C Trace Context standard):

Order Service → Payment Service:
  traceparent: 00-abc123456789abcdef0123456789abcd-def456-01
               ^  ^────────────────────────────^  ^──────^ ^^
               |  trace-id (128-bit hex)           span-id  sampling flags
               version

Payment Service → External Gateway:
  traceparent: 00-abc123456789abcdef0123456789abcd-789abc-01
                  ^same trace ID^                  ^new span ID^
```

The W3C Trace Context (RFC 7230) standardizes the header format so that tracing data flows correctly even across organizational boundaries and different tracing backends.

### OpenTelemetry: The Standard

OpenTelemetry (OTel) is the CNCF standard for distributed tracing, metrics, and logs. It provides:
- **APIs**: language-specific interfaces for instrumentation (spans, metrics, logs)
- **SDKs**: implementations of the APIs with sampling, batching, and export
- **Collector**: a vendor-neutral agent that receives telemetry and routes it to backends
- **Auto-instrumentation**: zero-code instrumentation for popular frameworks

```
OpenTelemetry architecture:

┌───────────────────────────────────────────────────────┐
│  Your Application                                      │
│  ┌────────────────────────────────────────────────┐   │
│  │  OTel SDK                                       │   │
│  │  ├── Tracer (creates spans)                     │   │
│  │  ├── Propagator (injects/extracts trace context)│   │
│  │  ├── Sampler (decides which traces to keep)     │   │
│  │  └── Exporter (sends to collector or backend)   │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────┬─────────────────────────┘
                              │ OTLP (OpenTelemetry Protocol)
                              ▼
                   ┌─────────────────┐
                   │  OTel Collector  │
                   │  ├── Receivers   │
                   │  ├── Processors  │  (filter, enrich, batch)
                   │  └── Exporters   │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
           Jaeger        Zipkin       AWS X-Ray
       (open source)  (open source)  (managed)
```

### Sampling Strategies

A high-traffic service might handle 100,000 requests per second. Recording every span from every request would generate terabytes of data per day. Sampling selects a representative subset of requests to trace.

**Head-based sampling**: The decision to sample is made at the start of the request, before any spans are emitted. Simple and efficient — unsampled requests have zero overhead. Disadvantage: you cannot preferentially sample interesting (slow, erroneous) requests because you do not know they are interesting yet.

```
Head-based sampling configurations:

// Sample 10% of requests randomly
sampler: TraceIdRatioBased(0.10)

// Sample 100% in development, 1% in production
sampler: ParentBased(
  root: TraceIdRatioBased(env == "production" ? 0.01 : 1.0)
)

// Sample 100% of requests that have errors
sampler: AlwaysOnForErrors  // custom sampler
```

**Tail-based sampling**: Spans are buffered, and the sampling decision is made *after* the trace is complete. This allows you to preferentially sample slow traces (latency > P99) and error traces, which are exactly the ones you want to investigate.

```
Tail-based sampling rules (OTel Collector):

tail_sampling:
  decision_wait: 10s   # wait 10s for all spans to arrive
  policies:
    - name: errors-policy
      type: status_code
      status_code: {status_codes: [ERROR]}
    
    - name: slow-traces-policy
      type: latency
      latency: {threshold_ms: 500}  # sample if trace > 500ms
    
    - name: random-sample
      type: probabilistic
      probabilistic: {sampling_percentage: 1}  # 1% of remaining
```

Tail-based sampling is more expensive (spans must be buffered until the full trace is available) but produces much more actionable data — you sample exactly the traces you need to debug performance and reliability problems.

**Adaptive sampling**: Automatically adjusts sample rate based on traffic volume, targeting a fixed number of traces per second per service regardless of actual traffic.

### Trace Backends: Jaeger, Zipkin, AWS X-Ray

**Jaeger** (CNCF, originally from Uber): Open-source, designed for high scale. Stores traces in Cassandra or Elasticsearch. Provides a rich UI for trace visualization, service dependency graphs, and performance analysis. Native support for OpenTelemetry.

**Zipkin** (Twitter): Older, simpler. The original inspiration for the distributed tracing ecosystem. Still widely used. Simpler deployment model than Jaeger.

**AWS X-Ray**: Managed service. Deep integration with AWS services (Lambda, API Gateway, ECS, ALB) provides automatic instrumentation for AWS-native workloads. Less flexible than open-source alternatives but zero operational overhead.

**Honeycomb, Lightstep, Datadog APM**: Commercial platforms that combine distributed tracing with other observability signals. Provide advanced analytics (arbitrary queries over trace data), AI-assisted root cause analysis, and SLO tracking.

## Deep Dive

### Dapper (2010): The Paper That Defined the Model

Google's Dapper paper (Sigelman, Barroso, Burrows, Stephenson, Plakal, Beaver, Jaspan, Shanbhag — 2010) established the conceptual vocabulary and architecture that every modern tracing system uses. The paper's core contribution was not the implementation — it was the model: a trace is a tree of spans, each span represents a unit of work with a start time, end time, and metadata, and spans are connected by parent-child relationships that reflect the causal structure of the distributed computation.

Before Dapper, debugging distributed latency required correlating log lines across services by timestamp — an error-prone, manual process. Dapper's insight was that the causal structure of a distributed request is already implicit in the message flow: when service A calls service B, that call carries an identifier that makes the parent-child relationship explicit. By propagating a trace context (trace ID, span ID) in every RPC header, every service automatically generates a span that positions itself correctly in the causal tree without any global coordination.

The paper's treatment of sampling is particularly instructive. At Google's scale, tracing every request would generate petabytes of data daily. Dapper demonstrated that 1-in-1024 sampling (0.1%) captures sufficient statistical information for latency profiling and anomaly detection while adding negligible overhead. The paper proved this empirically: the latency percentile distributions computed from sampled traces matched full-trace measurements to within measurement error. This validated the central bet of production tracing systems — that sampled data is sufficient for most diagnostic purposes.

### The OpenTracing and OpenTelemetry Standardization Story

The proliferation of tracing systems after Dapper (Zipkin at Twitter 2012, Jaeger at Uber 2016, X-Ray at AWS, Lightstep, Honeycomb) created a fragmentation problem: instrumentation code was vendor-specific. Switching tracing backends required rewriting every service's instrumentation. The OpenTracing project (2016) addressed this with a vendor-neutral API specification, but it covered only tracing. OpenCensus (Google's open-source instrumentation library) covered both tracing and metrics but had a different API.

The OpenTelemetry project (2019, CNCF) merged OpenTracing and OpenCensus into a single standard covering traces, metrics, and logs under a unified data model and API. The OTLP (OpenTelemetry Protocol) wire format allows instrumented services to send telemetry to a collector that routes to any backend without service code changes. This convergence was significant: by 2023, OpenTelemetry became the second-most active CNCF project after Kubernetes, with every major cloud provider, APM vendor, and database adding native OTLP support.

### Sampling Strategies: Head-Based vs. Tail-Based

The Dapper model uses head-based sampling: at the root of each trace, a sampling decision is made and propagated through the entire trace tree. Every span in the sampled trace is collected; every span in an unsampled trace is discarded. This is simple and has zero coordination overhead, but it discards traces before knowing whether they are interesting.

Tail-based sampling inverts this: every span is buffered, and the sampling decision is made at the tail of the trace when the complete picture is available. A trace that completes quickly with no errors is sampled at 0.1%. A trace with an error, or a P99 latency, is sampled at 100%. Tail-based sampling concentrates the tracing budget on the traces that matter most for debugging.

The challenge is that tail-based sampling requires buffering all spans from a distributed trace in one place long enough to make the decision. At high throughput this requires significant memory and coordination. Honeycomb's Refinery and the OpenTelemetry Collector's tail sampling processor implement this at scale. The right choice between head-based and tail-based sampling depends on traffic volume and the nature of the problems being debugged: head-based is sufficient for latency profiling; tail-based is essential for error investigation in high-volume systems.

## Implementation Guide

### Instrumenting a Go Service with OpenTelemetry

```go
package main

import (
    "context"
    "net/http"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func initTracing(ctx context.Context, serviceName string) (*sdktrace.TracerProvider, error) {
    // Export to OTel Collector (which routes to Jaeger/etc)
    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint("otel-collector:4318"),
        otlptracehttp.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }
    
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithSampler(
            // Sample 100% in dev, 10% in prod
            sdktrace.TraceIDRatioBased(0.10),
        ),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
            attribute.String("environment", "production"),
        )),
    )
    
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},   // W3C Trace Context
        propagation.Baggage{},        // W3C Baggage
    ))
    
    return tp, nil
}

// HTTP handler with automatic span creation
func paymentHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tracer := otel.Tracer("payment-service")
    
    // Create a child span for the payment processing
    ctx, span := tracer.Start(ctx, "process-payment")
    defer span.End()
    
    // Add business context to the span
    span.SetAttributes(
        attribute.String("payment.method", "card"),
        attribute.Int("payment.amount_cents", 4999),
        attribute.String("payment.currency", "USD"),
    )
    
    // Call downstream service — trace context propagates automatically
    // via the http.Client wrapped with otelhttp
    result, err := callFraudService(ctx, r)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        http.Error(w, "fraud check failed", 500)
        return
    }
    
    span.AddEvent("fraud-check-passed", trace.WithAttributes(
        attribute.Float64("fraud.risk_score", result.RiskScore),
    ))
    
    // Process payment...
}

func main() {
    ctx := context.Background()
    
    tp, err := initTracing(ctx, "payment-service")
    if err != nil {
        panic(err)
    }
    defer tp.Shutdown(ctx)
    
    // Wrap HTTP handlers with OTel instrumentation
    // This automatically:
    // - Creates a span for each request
    // - Extracts trace context from incoming headers
    // - Sets standard HTTP semantic convention attributes
    handler := otelhttp.NewHandler(
        http.HandlerFunc(paymentHandler),
        "payment-service",
    )
    
    http.ListenAndServe(":8080", handler)
}
```

### Instrumenting Database Calls

```go
// Wrap database calls with spans
func (r *PaymentRepository) FindByID(ctx context.Context, id string) (*Payment, error) {
    tracer := otel.Tracer("payment-service")
    ctx, span := tracer.Start(ctx, "db.payments.find_by_id",
        trace.WithSpanKind(trace.SpanKindClient),
    )
    defer span.End()
    
    span.SetAttributes(
        semconv.DBSystemPostgreSQL,
        semconv.DBName("payments"),
        semconv.DBStatement("SELECT * FROM payments WHERE id = $1"),
    )
    
    var payment Payment
    err := r.db.QueryRowContext(ctx,
        "SELECT id, amount, status FROM payments WHERE id = $1",
        id,
    ).Scan(&payment.ID, &payment.Amount, &payment.Status)
    
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }
    
    return &payment, nil
}
```

### Structured Logging Correlated with Traces

Traces become even more valuable when logs include the trace ID, allowing you to correlate log lines with their trace context.

```go
import (
    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

func logWithTraceContext(ctx context.Context, logger *zap.Logger) *zap.Logger {
    span := trace.SpanFromContext(ctx)
    if !span.SpanContext().IsValid() {
        return logger
    }
    
    return logger.With(
        zap.String("trace_id", span.SpanContext().TraceID().String()),
        zap.String("span_id", span.SpanContext().SpanID().String()),
        zap.Bool("trace_sampled", span.SpanContext().IsSampled()),
    )
}

// Usage:
func processPayment(ctx context.Context, payment Payment) error {
    log := logWithTraceContext(ctx, globalLogger)
    log.Info("processing payment",
        zap.String("payment_id", payment.ID),
        zap.Int("amount", payment.AmountCents),
    )
    // This log line now includes trace_id and span_id,
    // so you can jump from log to trace in your observability platform
}
```

## When to Use / When NOT to Use

**Use distributed tracing when:**
- You have more than 3 services and debugging cross-service latency takes more than an hour
- You need to understand request flows in production
- You want to find which service causes tail latency (P99 or P999 slowdowns)
- You need to understand the impact of external dependencies (third-party APIs, databases) on end-to-end latency

**Invest in tail-based sampling when:**
- Your baseline traffic makes head-based sampling impractical (>10k req/s)
- Most problems manifest as latency outliers or errors (not average-case behavior)
- Storage cost of full traces is prohibitive

**Skip distributed tracing (initially) when:**
- You have fewer than 3 services — logs and metrics are sufficient
- Your services are so tightly coupled that a monolith is more appropriate
- You cannot afford the instrumentation time — logging trace IDs in structured logs is a good first step before full tracing

## Common Mistakes

**Mistake 1: Not propagating context**
The most common tracing bug. A developer calls a downstream service but forgets to pass the context (which carries the trace ID). The downstream span becomes a new, disconnected trace. Spans appear as orphaned traces. Use auto-instrumentation frameworks to avoid this — they propagate context automatically in HTTP clients, gRPC clients, database drivers.

**Mistake 2: Creating too many spans**
Tracing every database query, every cache lookup, every loop iteration generates enormous data and adds CPU overhead. Trace at meaningful boundaries: service calls, database transactions, significant internal operations. Not every function call.

**Mistake 3: Logging sensitive data in span attributes**
Span attributes (tags) are stored in the tracing backend and visible to anyone with tracing access. Never include passwords, credit card numbers, PII, or secrets in span attributes.

**Mistake 4: Ignoring sampling in production**
Tracing at 100% in high-traffic production services adds CPU overhead (serialization, network egress) and storage costs. Set a reasonable sample rate (1-10%) and use tail-based sampling to ensure problems are still captured even at low rates.

**Mistake 5: Tracing without a baseline**
Adding tracing without establishing a latency baseline makes it hard to know if performance is improving or degrading. Combine traces with percentile latency metrics (P50, P95, P99, P999) so you have a quantitative view alongside the qualitative trace view.

## Connections

- **Service Discovery** (Article 09): When a service call is routed to a different instance during failover, the trace should still connect — the trace ID propagates through the new instance. Tracing infrastructure must handle this correctly.
- **Distributed Transactions** (Article 08): Saga steps across multiple services are a perfect use case for tracing. Each saga step is a span; the full saga is a trace. Tracing makes it easy to see which step failed and how long each step took.
- **Clock Synchronization** (Article 07): Trace visualization depends on accurate timestamps across services. Clock skew between services makes waterfall charts misleading — spans appear to overlap in impossible ways. Use NTP or HLC to minimize clock skew in your tracing infrastructure.
- **The Fallacies** (Article 01): Tracing reveals violations of the fallacies in production. Slow spans reveal Fallacy 2 (latency is not zero). Dropped spans reveal Fallacy 1 (network is not reliable). Tracing is how you empirically discover which fallacies are most impacting your system.

## Key Insights

**Insight 1: Tracing is not just for debugging — it is for understanding.** The most valuable use of tracing is not finding the bug after an incident. It is building a mental model of how your system actually behaves under production traffic — which services talk to which, which paths are critical, where latency accumulates. This understanding prevents incidents.

**Insight 2: Sampling strategy determines what you can see.** Head-based sampling at 1% means you see 1% of your traffic. If a rare code path fires 10 times per hour, you might see it 0-1 times per hour in your traces. Tail-based sampling targeted at errors and slow traces gives you much better coverage of problems without increasing storage proportionally.

**Insight 3: OpenTelemetry is worth the investment in standardization.** Migrating from one tracing backend to another (Jaeger to Datadog, Zipkin to Honeycomb) without OpenTelemetry requires re-instrumenting every service. With OpenTelemetry, you change the exporter in the OTel Collector configuration — one file, not hundreds of services. The upfront cost of standardizing on OTel pays for itself the first time you change backends.

**Insight 4: Context propagation is the hard part.** The SDKs make creating spans easy. The hard part is ensuring trace context flows correctly through every code path: async tasks, background jobs, message queue consumers, database callbacks. Missing context breaks trace continuity and produces orphaned spans that are useless for debugging.

**Insight 5: Traces, metrics, and logs are the three pillars of observability — and they are most powerful together.** Metrics tell you something is wrong (error rate spiked). Logs tell you what happened (error messages). Traces tell you why it happened (which service and which operation caused the problem). Systems that correlate all three — linking log lines to trace spans, attaching metric annotations to trace data — provide dramatically faster time-to-diagnosis.
