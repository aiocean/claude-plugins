# Observability — Logs, Metrics, Traces

> "Monitoring tells you whether a system is working. Observability lets you ask why it isn't." — Charity Majors, CTO of Honeycomb

## The Problem

Traditional monitoring is built around a fundamental assumption that does not hold for modern distributed systems: that you know in advance what will go wrong. Traditional monitoring works by setting thresholds on known metrics — CPU above 90%, error rate above 1%, disk space below 10% — and alerting when those thresholds are crossed. This works well for simple systems with predictable failure modes. It fails catastrophically for complex distributed systems where the interesting failures are the ones nobody anticipated.

The failure mode of threshold-based monitoring is not that it alerts too rarely — it is that it alerts on the wrong things and misses the right things simultaneously. You get pages about CPU spikes that have no user impact, while a subtle data corruption in a rarely-exercised code path goes undetected for weeks. You alert on the metrics you thought to measure but not on the emergent behaviors that actually matter. Every time you add a new threshold, you add a new source of false positives. The more thresholds you add, the more alert fatigue sets in, and alert fatigue is itself a reliability risk.

The second problem is the debuggability gap in distributed systems. In a monolith, a user complaint about slowness leads you to a profiler. In a microservices architecture, a slow user request might pass through 15 services, with latency accumulating at each hop and the root cause buried three services deep in a database query that no monitoring dashboard was watching. Without the ability to trace a single request across service boundaries, debugging production issues in distributed systems requires detective work that would make Sherlock Holmes weep.

The third problem is that monitoring and debugging are treated as separate activities when they should be unified. Monitoring tells you something is wrong. Debugging tells you why. The gap between them — the time between "something is wrong" and "I understand what and why" — is where organizations lose hours or days during major incidents. Observability is the discipline of closing that gap.

## Core Concept

Observability is a property of a system, not a tool. A system is observable if, from its outputs alone, you can understand its internal state. In control theory, this is a formal mathematical property. In software engineering, it means: when something goes wrong in production, can you figure out what and why using the data the system emits, without deploying new code or accessing the system directly?

The three pillars of observability — logs, metrics, and traces — are not alternatives. They are complementary. Each answers different questions and provides different granularity. Understanding when to reach for each pillar, and how they connect, is the core of operational observability practice.

### Logs

A log is a time-stamped record of a discrete event. Logs are the oldest and most universal form of operational data. Every application generates them. Most generate them badly.

The cardinal sin of logging is unstructured logs: free-form text strings that cannot be parsed reliably.

```
# Bad: unstructured log
2024-01-15 14:23:45 ERROR Failed to process payment for user 12345: timeout after 30000ms

# Good: structured log (JSON)
{
  "timestamp": "2024-01-15T14:23:45.123Z",
  "level": "error",
  "service": "payment-service",
  "trace_id": "abc123def456",
  "user_id": "12345",
  "event": "payment_processing_failed",
  "error_type": "timeout",
  "timeout_ms": 30000,
  "upstream_service": "stripe-api",
  "request_id": "req_789xyz"
}
```

The structured version can be queried. You can ask: "How many payment timeouts in the last hour, grouped by upstream service?" You cannot ask that question of the unstructured string.

Structured logging is the single most high-leverage observability improvement most organizations can make. It requires no new infrastructure, just discipline in what you write to stdout. Every major language has structured logging libraries: `zap` or `zerolog` in Go, `structlog` in Python, `pino` in Node.js, `log4j2` with JSON layout in Java.

**What to log:**
- Every request: timestamp, method, path, status, duration, user/account identifier, trace ID
- Every significant business event: payment processed, user created, order shipped
- Every error with full context: error type, affected resource, relevant identifiers
- Every external call: which service, what request, what response, how long

**What not to log:**
- Secrets, passwords, tokens, PII (GDPR/CCPA compliance requires this)
- High-frequency, low-signal events (every database row read in a bulk operation)
- Redundant information (don't log both the request and the parsed request body if they contain the same data)

#### Log Aggregation at Scale

A service generating 10,000 requests per second generates millions of log lines per hour. Managing this requires a log aggregation pipeline:

- **Collection**: Fluentd, Fluent Bit, or Logstash running as sidecars or daemonsets, shipping logs to a central store
- **Storage**: Elasticsearch, Loki, Splunk, or a cloud-native service (CloudWatch Logs, Google Cloud Logging, Azure Monitor Logs)
- **Query**: Kibana (Elasticsearch), Grafana (Loki), Splunk Search Processing Language
- **Retention policies**: Hot tier (fast, expensive, last 7 days), warm tier (slower, cheaper, last 90 days), cold tier (object storage, years)

Log volume at scale becomes a significant cost driver. A 100-service architecture generating 1MB/s per service produces 8.6TB of logs per day. At $0.10/GB for hot storage, that is $860/day. Careful sampling, retention tiering, and selective indexing are required to make log costs manageable.

### Metrics

A metric is a numeric measurement aggregated over time. Metrics are the right tool for tracking trends, capacity planning, and alerting on known failure modes.

The distinction from logs is critical: a log records what happened. A metric measures how much or how often. Logs are high-fidelity but expensive to query at scale. Metrics are low-fidelity but extremely cheap to query — because they are pre-aggregated.

#### The RED Method

For request-driven services (APIs, microservices), the RED method defines the three most important metrics:

**Rate**: How many requests per second is the service receiving?
**Errors**: What fraction of those requests are failing?
**Duration**: How long are requests taking? (expressed as histogram, not average)

```
# Prometheus example
# Rate
http_requests_total{service="payment-api", status="200"}
# Errors  
http_requests_total{service="payment-api", status=~"5.."}
# Duration histogram
http_request_duration_seconds_bucket{service="payment-api", le="0.5"}
```

These three metrics answer the user experience question: Are users getting responses? Are they getting correct responses? Are they getting them fast enough?

#### The USE Method

For resource-driven components (databases, queues, caches), the USE method is more appropriate:

**Utilization**: What fraction of capacity is being used? (CPU %, disk I/O %, connection pool %)
**Saturation**: Is the component queuing work it cannot keep up with? (queue depth, wait time)
**Errors**: Is the component producing errors? (disk errors, network errors, lock timeouts)

The USE method identifies bottlenecks and capacity issues before they become user-visible problems.

#### High Cardinality: The Critical Distinction

The most important conceptual distinction in metrics is cardinality — the number of unique label combinations a metric has.

Low-cardinality metrics are cheap and fast: `http_requests_total{service="payment", status="200"}` has maybe 20 label combinations (5 services × 4 status classes).

High-cardinality metrics are expensive and slow: `http_requests_total{user_id="12345"}` has millions of label combinations — one per user. Most metrics systems cannot handle this efficiently. Prometheus, for example, degrades significantly above a few million time series.

The solution: high-cardinality data belongs in logs and traces, not metrics. Put the user ID in the log entry and the trace span. Put the aggregate error count by service in the metric. The architectural principle: metrics for aggregates, traces for individuals.

### Traces

A distributed trace is a record of a single request's journey through a distributed system. It connects the dots between the dozens of services, databases, and external APIs that may participate in handling a single user request.

A trace is composed of spans. Each span represents one unit of work — an HTTP call, a database query, a cache lookup. Spans have:

- A trace ID that links all spans from the same request
- A span ID and parent span ID that define the call tree
- A start time and duration
- Tags (key-value pairs describing the operation)
- Events (timestamped annotations within the span)
- Status (success or error)

```json
{
  "trace_id": "abc123def456",
  "span_id": "span001",
  "parent_span_id": null,
  "name": "POST /checkout",
  "service": "api-gateway",
  "start_time": "2024-01-15T14:23:45.000Z",
  "duration_ms": 847,
  "status": "ok",
  "tags": {
    "user_id": "12345",
    "order_id": "ord_789"
  }
}
```

A waterfall visualization of a trace shows exactly where time is spent in a request: 50ms in the API gateway, 200ms in the cart service, 400ms waiting for a database query, 100ms in the payment service, 97ms in network overhead. The bottleneck is immediately visible.

Traces are indispensable for:
- Debugging latency problems in distributed systems
- Understanding which services are in the critical path of a user request
- Identifying N+1 query problems (database queries that multiply with request complexity)
- Root cause analysis during incidents affecting multiple services

#### Sampling

At scale, storing every trace is prohibitively expensive. A service handling 10,000 rps generates 10,000 traces per second — billions per day. Sampling strategies:

**Head-based sampling**: Decide at the start of a request whether to trace it. Simple and cheap but misses rare events. A 1% sample rate misses 99% of requests, including most errors.

**Tail-based sampling**: Collect all spans, decide at the end of a request whether to keep them. More expensive (requires buffering all spans) but can prioritize keeping error traces and slow traces. Most production systems keep 100% of error traces, 10% of slow traces, and 0.1% of fast successful traces.

**Adaptive sampling**: Adjust sampling rates dynamically based on trace characteristics, service load, and budget. Honeycomb and Lightstep implement this. More complex but most cost-effective at scale.

### OpenTelemetry: The Unified Standard

Before 2019, the observability ecosystem was fragmented: Jaeger for tracing, Prometheus for metrics, multiple competing log formats, vendor-specific SDKs for Datadog, New Relic, Splunk. Migrating between vendors required rewriting instrumentation code.

OpenTelemetry (OTel) is the CNCF project that unified this ecosystem. It provides:

- **A standard API** for generating telemetry data in any language
- **A standard SDK** that implements the API with configurable exporters
- **The OTLP protocol** for transmitting telemetry to any compatible backend
- **Auto-instrumentation** for common frameworks (Express, Django, Spring, etc.) that adds telemetry without code changes

```go
// Go OpenTelemetry instrumentation
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

tracer := otel.Tracer("payment-service")

func ProcessPayment(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "process-payment",
        trace.WithAttributes(
            attribute.String("order.id", order.ID),
            attribute.Float64("order.amount", order.Amount),
        ),
    )
    defer span.End()
    
    // ... payment processing logic
    
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }
    return nil
}
```

The value of OTel is vendor neutrality. Instrument once with OTel, send to any backend: Jaeger, Zipkin, Honeycomb, Datadog, Grafana Tempo, AWS X-Ray. Change vendors without changing application code.

As of 2024, OTel is the de facto standard for new instrumentation. Any organization building new services should use OTel from day one.

## Deep Dive

### The Four Golden Signals: Distillation from the SRE Book

Google's SRE Book chapter on monitoring distills observability into four signals that, together, provide a complete picture of service health from the user's perspective. The four golden signals — latency, traffic, errors, and saturation — were chosen not because they are the only important metrics, but because they are the minimum set that can detect any user-visible problem.

The book's reasoning is precise: a service that has healthy latency, manageable traffic, low errors, and is not saturated is, by definition, serving its users well. Conversely, any user-visible problem will manifest as degraded latency, elevated errors, or will be caused by approaching saturation. Traffic is included not because high traffic is a problem but because it provides context for interpreting the others — high errors at low traffic indicate a different problem than high errors at high traffic.

The SRE Book draws a sharp distinction between symptom-based alerting (alerting on the four golden signals) and cause-based alerting (alerting on CPU utilization, memory pressure, disk I/O). The book argues that cause-based alerts generate noise: a machine can have 90% CPU utilization with healthy latency and errors, because the workload is legitimately compute-intensive. Paging on CPU is a false positive. Cause-based metrics are valuable for diagnosis after an alert fires, not for triggering the alert itself. This insight — the separation of "symptoms for alerting" from "causes for debugging" — is one of the SRE Book's most practically useful contributions.

### The Observability Engineering Perspective: Beyond Metrics

The 2022 "Observability Engineering" book (Majors, Fong-Jones, Miranda) articulates a perspective that extends the SRE Book's monitoring model. The core argument: traditional metrics-based monitoring is pre-aggregated, which means the dimensions of analysis are fixed at instrumentation time. If you don't know in advance which combination of service version, user cohort, geographic region, and feature flag state is causing elevated errors, you cannot ask that question after the fact with aggregated metrics.

High-cardinality events — structured log records containing all contextual attributes, kept as raw events rather than aggregated — allow arbitrary post-hoc analysis. Rather than deciding at instrumentation time which dimensions to aggregate, you record all dimensions and aggregate at query time. This is the observability model that Honeycomb, Datadog's APM, and similar systems provide: an interface for asking questions you didn't anticipate before an incident, using data you recorded as complete event records.

The book is explicit that this is not a replacement for the four golden signals — it is a complement. SLO-based alerting on latency and error rate tells you that something is wrong. High-cardinality event analysis tells you which users, which versions, and which service paths are experiencing the problem. The combination of structured alerting and exploratory analysis is what the SRE Book calls "white-box monitoring" — not just observing that something is broken, but having the data to understand precisely what is broken and why.

## Implementation Guide

### Step 1: Structured Logging First

Before any other observability investment, implement structured logging in every service. This requires:

1. Agree on a standard log schema across all services (timestamp, level, service name, trace ID, request ID, user ID, event name)
2. Choose a structured logger library for each language in your stack
3. Add request-scoped logging middleware that injects the standard fields automatically
4. Deploy a log aggregation pipeline (Fluentd → Elasticsearch or Loki)
5. Build a basic log dashboard in Kibana or Grafana

This investment pays immediate returns: every log line is queryable, every incident investigation benefits, and the trace ID field prepares you for distributed tracing.

### Step 2: Instrument the RED Metrics

Add request rate, error rate, and duration metrics to every service. With auto-instrumentation, this is often zero application code:

```yaml
# Kubernetes: auto-instrument with OpenTelemetry Operator
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: auto-instrumentation
spec:
  exporter:
    endpoint: http://otel-collector:4317
  propagators:
    - tracecontext
    - baggage
  sampler:
    type: parentbased_traceidratio
    argument: "0.1"
  python:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:latest
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
```

### Step 3: Deploy Distributed Tracing

Install an OTel collector as a sidecar or daemonset. Configure trace propagation (W3C TraceContext headers or B3). Deploy a trace backend (Jaeger for self-hosted, Honeycomb or Datadog for managed).

The minimum viable trace shows: service name, operation name, duration, parent/child relationships, error flag. Add custom attributes incrementally as you identify diagnostic gaps.

### Step 4: Build the Alert Hierarchy

Layer your alerts:

1. **Symptom alerts** (page on-call): User-facing SLI violations, burn rate alerts
2. **Cause alerts** (create ticket): Individual service error rate elevated, single service latency degraded
3. **Capacity alerts** (dashboard only): Resource utilization trends, growth projections

Most alerts should be in tier 2 and 3. Tier 1 alerts should be rare — 2-3 per month at most for a healthy service. If tier 1 alerts are firing weekly, the SLO is too tight or the service needs reliability work.

### Step 5: Cost Management

Observability costs scale with traffic. Establish cost controls before they become a problem:

```
Log retention: 
  - Hot (indexed, queryable): 7 days
  - Warm (compressed, queryable with lag): 90 days
  - Cold (object storage, restore required): 1 year

Metrics retention:
  - Raw (15s resolution): 15 days
  - Downsampled (1m resolution): 1 year
  - Downsampled (1h resolution): 5 years

Traces:
  - 100% of error traces: 30 days
  - 10% of slow traces (> p95): 30 days
  - 0.1% of successful traces: 7 days
```

## When to Use / When NOT to Use

**Invest in observability when:**
- You are running distributed services in production
- Incident debugging takes more than 30 minutes because you cannot see what happened
- You are building new services — instrument from day one, not after the first incident
- You have SLOs to measure — observability is the measurement infrastructure

**Defer observability investment when:**
- Your service handles fewer than 100 requests per second and runs as a single instance — simpler tools suffice
- You are in pre-production prototype phase — get to production first, then invest in observability

**High-cardinality data (user IDs, request IDs, order IDs) belongs in:**
- Logs: always
- Traces: always (as span attributes)
- Metrics: never (use logs and traces for individual-level queries)

## Common Mistakes

**Unstructured logs**: The most common and most costly mistake. You can fix it at any time, but every day you delay is a day of logs you cannot effectively query.

**Average latency as SLI**: Average latency hides the tail. A service with p50 = 50ms and p99 = 5000ms has an average around 100ms but 1% of users are waiting 5 seconds. Always track latency as histograms, not averages.

**Treating observability as optional**: "We'll add monitoring when we have time" means you will add it during your first major incident, under pressure, with users affected. Instrument before you go to production.

**Logging everything at DEBUG level in production**: High-volume debug logging increases costs, increases noise, and can overwhelm log aggregation pipelines during incidents — precisely when you need them most. Use sampling for high-frequency events, and reserve DEBUG for temporary diagnostic sessions.

**Metrics without labels**: A single `http_requests_total` counter tells you total traffic. Add `service`, `endpoint`, `method`, `status` labels and it becomes actionable. Labels are cheap; queries without them are useless.

**Not correlating signals**: Logs, metrics, and traces have maximum value when they share identifiers. The trace ID in a log line lets you jump from a log entry to the full trace. The span ID in a metric label lets you correlate a latency spike with a specific operation. Without these correlations, the three pillars work independently instead of together.

**Alert without runbook**: An alert that fires but has no documented response procedure creates a page that tells on-call "something is wrong" but not "here is what to do." Every alert should have a linked runbook with triage steps.

## Connections

**SLOs (Article 02)**: SLIs are computed from observability data. Without structured metrics and logs, you cannot calculate SLIs. Observability is the measurement infrastructure that makes SLOs operational.

**Incident Management (Article 09)**: Observability data is the primary tool for incident investigation. The quality of your observability directly determines your MTTR. Teams with good observability resolve incidents in minutes; teams with poor observability take hours.

**Feature Flags (Article 05)**: Progressive rollouts and A/B tests require observability to measure their effect. "Did this feature flag change improve latency?" is answerable only if you have the latency metrics to compare before and after.

**Platform Engineering (Article 07)**: A mature platform team provides observability as a service — pre-configured OTel collectors, standard dashboards, centralized log aggregation — so application teams get good observability without building it themselves.

## Key Insights

The difference between monitoring and observability is not a technology difference — it is an epistemological difference. Monitoring is built on the assumption that failures are known in advance and can be detected by checking known conditions. Observability is built on the assumption that interesting failures are always surprising, and the system needs to emit enough data that you can investigate any question you might ask, even questions you haven't thought of yet.

Structured logging is the highest-leverage observability investment for most organizations. It requires no new infrastructure, just discipline. A service with excellent structured logs and no traces will be more debuggable than a service with poor logs and excellent traces. Get the logs right first.

The three pillars are complementary, not interchangeable. Metrics answer "how much and how often." Logs answer "what happened in detail." Traces answer "where did the time go across service boundaries." An organization that invests heavily in one pillar while neglecting the others has systematic blindspots.

OpenTelemetry has solved the instrumentation fragmentation problem. Use it for all new services. The vendor lock-in risk of custom instrumentation is real and significant — changing observability vendors while migrating custom SDKs is a months-long project. With OTel, it is a configuration change.

The purpose of observability is not to generate data. It is to answer questions. The right amount of observability is the minimum that lets you answer any question about your production system within 10 minutes. That standard, not volume of data collected, is the right success criterion.
