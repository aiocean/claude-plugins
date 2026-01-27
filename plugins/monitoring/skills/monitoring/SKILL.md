---
name: monitoring
description: Monitoring, observability, alerting, and SRE practices. Use when designing monitoring systems, choosing metrics, setting up alerts, defining SLOs, debugging production issues, or when user mentions monitoring, observability, metrics, alerts, SLI, SLO, SLA, error budgets, on-call, or incident response.
---

# Monitoring & Observability

> "The fundamental question isn't 'what are the numbers?' but 'can I understand what's happening inside this system from the outside?'"

## Quick Framework Selector

| Question | Framework | Details |
|----------|-----------|---------|
| Are users happy? | RED or Golden Signals | [Frameworks](./reference/frameworks.md) |
| Is this machine healthy? | USE Method | [Frameworks](./reference/frameworks.md) |
| Where is the bottleneck? | USE Method | [Frameworks](./reference/frameworks.md) |
| What should our SLO measure? | Golden Signals | [SLI/SLO/SLA](./reference/slo-framework.md) |
| How do I set up alerts? | SLO-based with burn rates | [Alerting](./reference/alerting.md) |
| Monitoring vs Observability? | Depends on system complexity | [Observability](./reference/observability.md) |

## The Three Core Frameworks

### 1. Google's Four Golden Signals (Service Layer)
Measure what **users experience**:
- **Latency**: Time to service requests (separate success vs error latency)
- **Traffic**: Demand in domain-appropriate units (req/sec, transactions/sec)
- **Errors**: Rate of failed requests (explicit, implicit, policy-based)
- **Saturation**: How "full" the service is

### 2. Brendan Gregg's USE Method (Infrastructure Layer)
For **every resource** (CPU, memory, disk, network), check:
- **Utilization**: Average busy time (100% = bottleneck, 70%+ problematic for I/O)
- **Saturation**: Queued work (any non-zero value adds latency)
- **Errors**: Count of error events

### 3. Tom Wilkie's RED Method (Microservices)
For **every service**:
- **Rate**: Requests per second
- **Errors**: Failed requests per second
- **Duration**: Latency distribution

**When to use which:**
- RED at service layer for every microservice
- USE at infrastructure layer for capacity/debugging
- Golden Signals for comprehensive service health (RED + Saturation)

## SLI/SLO/SLA Essentials

**SLI** = Metric quantifying user experience: `(Good events / Total events) × 100%`

**SLO** = Target value for SLI (internal commitment, e.g., 99.9% availability)

**SLA** = External contract with consequences if missed

**Error Budget** = `100% - SLO` (e.g., 99.9% SLO = 0.1% error budget = 43 min/month downtime)

### The Nines Reality Check

| Availability | Monthly Downtime | Cost Factor |
|--------------|------------------|-------------|
| 99% | 7.31 hours | Baseline |
| 99.9% | 43.8 minutes | 10× harder |
| 99.99% | 4.38 minutes | 100× harder |
| 99.999% | 25.9 seconds | 1000× harder |

**Why 100% is wrong:** Impossible, imperceptible to users, prevents improvement.

## Alerting Principles

**The only test that matters:** Would I wake someone up for this?

### Symptom vs Cause-Based
- **Alert on symptoms** (errors, latency, availability) for paging
- **Monitor causes** (CPU, disk, etc.) for diagnostics

### SLO-Based Alerting with Burn Rates

| Burn Rate | Meaning | Action |
|-----------|---------|--------|
| 1.0× | Budget depletes at window end | Normal |
| 6× | Depletes in 1/6 time | Ticket today |
| 14.4× | Depletes in 1/14.4 time | Page immediately |

## Monitoring vs Observability

**Monitoring** = Known unknowns (predefined questions, dashboards)

**Observability** = Unknown unknowns (ask new questions without new code)

**When monitoring suffices:** Monoliths, simple architectures, predictable failures

**When you need observability:** Microservices, containers, high deployment velocity, complex interactions

## Anti-Patterns to Avoid

- **Tool obsession**: Requirements should drive tool selection
- **Checkbox monitoring**: CPU/memory without user impact context
- **Alert proliferation**: Adding alerts without pruning
- **Vanity metrics**: "Number of dashboards" vs actionable metrics
- **Cause-based alerting**: Enumerating every failure cause

## Reference Guides

- [Measurement Frameworks](./reference/frameworks.md) - Golden Signals, USE, RED in detail
- [SLI/SLO/SLA & Error Budgets](./reference/slo-framework.md) - Complete reliability framework
- [Monitoring vs Observability](./reference/observability.md) - When to use which
- [Alerting & On-Call](./reference/alerting.md) - Sustainable alerting practices

## Sources

- Site Reliability Engineering (Google, 2016) - sre.google
- Systems Performance 2nd Ed (Brendan Gregg, 2020)
- Observability Engineering (Majors, Fong-Jones, Miranda, 2022)
- brendangregg.com/usemethod.html
- charity.wtf
