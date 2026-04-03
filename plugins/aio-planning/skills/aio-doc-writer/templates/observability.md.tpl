# Observability & Monitoring

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the infra-analyst.
Only generated when logging, metrics, tracing, or health check patterns are found.

Tools to use:
- Grep: find logging — "log\.", "logger\.", "console\.log", "logging\.", "slog\.", "zap\.", "winston", "pino"
- Grep: find metrics — "prometheus", "datadog", "opentelemetry", "statsd", "metrics\.", "counter", "histogram", "gauge"
- Grep: find tracing — "trace", "span", "opentelemetry", "jaeger", "zipkin", "otel"
- Grep: find health checks — "health", "readiness", "liveness", "ping", "/healthz"
- Grep: find error handling — "catch", "error", "panic", "recover", "try", "except"
- Glob: find observability config — "**/prometheus*", "**/grafana*", "**/datadog*", "**/*otel*"
- Read: observability config files and middleware

Discovery commands:
```bash
# Find logging usage
grep -r "log\.\|logger\.\|console\.log\|logging\." --include="*.go" --include="*.py" --include="*.ts" --include="*.js" -l
# Find metrics/tracing
grep -r "prometheus\|datadog\|opentelemetry\|statsd\|metrics\." -l
# Find health checks
grep -r "health\|readiness\|liveness\|ping" --include="*.go" --include="*.py" --include="*.ts" -l
```
-->

## Observability Overview

<!-- ORACLE:OVERVIEW
Provide a high-level summary of what is instrumented and what is not.

Assessment criteria:
- Logging: present/absent, structured/unstructured
- Metrics: present/absent, what's measured
- Tracing: present/absent, distributed or local
- Health checks: present/absent
- Alerting: present/absent

```bash
# Quick observability inventory
echo "=== Logging ==="
grep -rl "log\.\|logger\.\|console\.log\|logging\." --include="*.go" --include="*.py" --include="*.ts" --include="*.js" | wc -l
echo "=== Metrics ==="
grep -rl "prometheus\|datadog\|opentelemetry\|statsd\|metrics\." | wc -l
echo "=== Tracing ==="
grep -rl "trace\|span\|otel" --include="*.go" --include="*.py" --include="*.ts" | wc -l
echo "=== Health ==="
grep -rl "health\|readiness\|liveness" --include="*.go" --include="*.py" --include="*.ts" | wc -l
```
-->

| Pillar | Status | Details |
|--------|--------|---------|
| Logging | REPLACE | REPLACE |
| Metrics | REPLACE | REPLACE |
| Tracing | REPLACE | REPLACE |
| Health checks | REPLACE | REPLACE |
| Alerting | REPLACE | REPLACE |

## Logging Strategy

<!-- ORACLE:LOGGING
Document the logging approach:
- Framework/library used (zap, slog, winston, pino, logrus, stdlib)
- Structured vs unstructured logging
- Log levels used and what each means in this codebase
- Log output format (JSON, text, custom)
- Log aggregation target (stdout, file, external service)
- Sensitive data handling (are secrets/PII ever logged?)

Tools:
- Grep for logger initialization patterns
- Read logger config/setup files
- Grep for log level usage — "debug", "info", "warn", "error", "fatal"

```bash
# Find logger setup
grep -r "NewLogger\|createLogger\|getLogger\|winston\.create\|pino(\|zap\.New\|slog\.New" -l
# Find log levels used
grep -rn "\.Debug\|\.Info\|\.Warn\|\.Error\|\.Fatal\|log\.debug\|log\.info\|log\.warn\|log\.error" --include="*.go" --include="*.py" --include="*.ts" | head -20
```
-->

REPLACE: logging strategy description

## Metrics & Tracing

<!-- ORACLE:METRICS
Document what is measured and traced:
- Metrics library/framework (Prometheus client, Datadog SDK, OpenTelemetry)
- Key metrics defined (counters, histograms, gauges)
- What business/system events are tracked
- Dashboard locations if referenced in code
- SLIs/SLOs if defined
- Distributed tracing setup if present

Tools:
- Grep for metric definitions — "NewCounter", "NewHistogram", "NewGauge", "metrics.register"
- Read metrics initialization files
- Grep for SLO/SLI references

```bash
# Find metric definitions
grep -rn "counter\|histogram\|gauge\|summary" --include="*.go" --include="*.py" --include="*.ts" | grep -i "new\|create\|register"
# Find tracing setup
grep -rn "tracer\|TracerProvider\|initTracing\|startSpan" --include="*.go" --include="*.py" --include="*.ts" | head -20
```
-->

REPLACE: metrics and tracing description

## Health Checks & Readiness Probes

<!-- ORACLE:HEALTH
Document health check endpoints and probes:
- Health check endpoint path and what it checks
- Readiness probe (is the service ready to accept traffic?)
- Liveness probe (is the service alive?)
- Dependency checks (DB connectivity, external service availability)

Tools:
- Grep for health endpoint definitions
- Read health check handler code
- Grep for readiness/liveness in k8s manifests or docker-compose

```bash
# Find health check implementations
grep -rn "health\|readiness\|liveness\|/healthz\|/ready\|/live" --include="*.go" --include="*.py" --include="*.ts" --include="*.yml" --include="*.yaml" | head -20
```
-->

REPLACE: health check description

## Alerting Rules

<!-- ORACLE:ALERTING
Document alerting configuration:
- What triggers alerts (error rate, latency, resource usage)
- Alert destinations (Slack, PagerDuty, email, OpsGenie)
- Escalation policy if defined
- Alert thresholds

Tools:
- Glob: find alert config — "**/alerts*", "**/rules*", "**/*alert*"
- Read: alerting config files
- Grep: find alert references in code — "alert", "notify", "pager", "oncall"

```bash
# Find alerting configuration
find . -name "*alert*" -o -name "*rules*" -o -name "*monitor*" | grep -v node_modules | grep -v .git
# Find notification integrations
grep -r "slack\|pagerduty\|opsgenie\|webhook.*notify" -l 2>/dev/null
```
-->

REPLACE: alerting rules description

<!-- ORACLE:NO_ALERTING
If no alerting configuration detected, replace with:
"No alerting configuration detected. Consider adding alerts for error rates, latency percentiles, and resource exhaustion."
Delete this comment when done.
-->

## Error Taxonomy

<!-- ORACLE:ERRORS
Document error handling patterns:
- Error types/classes defined in the codebase
- Error categorization (transient vs permanent, user vs system)
- Retry strategies (exponential backoff, circuit breaker)
- Error propagation patterns (wrapping, sentinels, error codes)
- Panic/crash recovery mechanisms

Tools:
- Grep for custom error types — "type.*Error struct", "class.*Error extends", "class.*Exception"
- Grep for retry patterns — "retry", "backoff", "circuit.?breaker", "attempt"
- Read error handling middleware or utility files

```bash
# Find custom error types
grep -rn "type.*Error struct\|class.*Error extends\|class.*Exception" --include="*.go" --include="*.py" --include="*.ts"
# Find retry patterns
grep -rn "retry\|backoff\|circuit.breaker\|attempts" --include="*.go" --include="*.py" --include="*.ts" -l
```
-->

REPLACE: error taxonomy and handling patterns

## Observability Gaps & Recommendations

<!-- ORACLE:RECOMMENDATIONS
Based on the analysis above, identify gaps and provide recommendations:
- Missing pillars (no metrics? no tracing? no structured logging?)
- Blind spots (unmonitored critical paths, missing error tracking)
- Quick wins (add structured logging, add health endpoint, add basic metrics)
- Best practices not followed (no request ID propagation, no correlation IDs)

Prioritize by impact on incident response and debugging capability.
Delete this comment when done.
-->

REPLACE: prioritized observability recommendations
