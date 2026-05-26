# aio-monitoring-observability

**Monitoring that starts from principles, not from copying dashboards.**

Most teams add monitoring reactively: an outage happens, someone adds an alert, the dashboard grows by one more panel. Over time the system becomes a sprawl of metrics nobody trusts, alerts that fire constantly, and dashboards that show everything except what matters in the moment the service is down.

This plugin encodes the opposite approach. Start with the Four Golden Signals. Design alerts that tie to user experience, not internal component state. Define error budgets before an incident forces the conversation. Every capability in this plugin — from PromQL query templates to SLO calculators to Datadog cost analysis — serves a coherent observability philosophy, not a collection of recipes.

## Install

```bash
/plugin install aio-monitoring-observability@aiocean-plugins
```

## Requirements

- python3 (for automation scripts)

## What it covers

### Metrics strategy

The skill walks through Four Golden Signals (latency, traffic, errors, saturation), RED method for request-driven services, and USE method for infrastructure resources. It includes ready-to-use PromQL for each signal and guidance on metric types, cardinality discipline, and naming conventions that stay maintainable.

### Alerting

Every alert must be actionable — if you can't do something specific when it fires, it should not exist. The skill covers multi-window burn rate alerting tied to SLO error budgets, severity levels, annotation best practices, and runbook structure. An `alert_quality_checker.py` script audits existing Prometheus rule files against these principles automatically.

### SLOs and error budgets

SLI, SLO, SLA, and error budget are often used interchangeably in ways that cause real confusion. The skill defines them precisely, provides an `slo_calculator.py` for computing compliance and burn rates, and includes reference tables for common availability targets and their actual downtime allowances.

### Distributed tracing

OpenTelemetry instrumentation examples for Python, Node.js, Go, and Java. Sampling strategies by environment. A production-ready OTel Collector configuration with tail sampling, batching, and multiple exporters (Tempo, Jaeger, Loki, Prometheus, CloudWatch, Datadog).

### Dashboards

Layout principles that hold up under pressure: top-down hierarchy, 8-12 panels maximum, consistent time windows, color coding by severity. A `dashboard_generator.py` script produces Grafana JSON for web applications, Kubernetes, and database services from a single command.

### Datadog cost optimization and migration

Two separate workflows: finding waste in an existing Datadog deployment (custom metrics cardinality, log sampling gaps, APM oversampling), and migrating to an open-source stack. The migration guide covers a phased Datadog → Prometheus + Grafana + Loki + Tempo path with DQL-to-PromQL query translation and realistic cost comparisons.

## Automation scripts

Seven Python scripts cover the tasks that are tedious to do manually:

| Script | What it does |
|--------|-------------|
| `analyze_metrics.py` | Detect anomalies in Prometheus or CloudWatch metrics |
| `alert_quality_checker.py` | Audit Prometheus rule files against best practices |
| `slo_calculator.py` | Compute SLO compliance, error budgets, burn rates |
| `log_analyzer.py` | Parse log files for errors, patterns, and stack traces |
| `dashboard_generator.py` | Generate Grafana dashboard JSON from templates |
| `health_check_validator.py` | Validate health check endpoints against a checklist |
| `datadog_cost_analyzer.py` | Find cost waste in Datadog usage via API |

## Trigger phrases

> "set up monitoring", "design metrics", "calculate SLO", "build dashboard", "OpenTelemetry", "distributed tracing", "alerting strategy", "error budget", "Four Golden Signals", "RED method", "USE method", "Datadog costs", "migrate from Datadog", "Prometheus", "Grafana"
