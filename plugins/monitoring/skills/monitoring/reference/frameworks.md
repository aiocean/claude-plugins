# Measurement Frameworks

## Google's Four Golden Signals

Introduced in Google's 2016 SRE book. The insight: **if you can only measure four things about a user-facing system, measure these**.

| Signal | What it measures | Critical nuance |
|--------|------------------|-----------------|
| **Latency** | Time to service a request | Separate successful from failed latency—a fast error differs from a slow success |
| **Traffic** | Demand on the system | Measure in domain-appropriate units: HTTP req/sec, transactions/sec, sessions |
| **Errors** | Rate of failed requests | Include explicit (500s), implicit (wrong content), and policy-based (too slow) |
| **Saturation** | How "full" the service is | Latency increases often indicate approaching saturation |

Philosophy: **user-centric simplicity**. Focus on symptoms users experience rather than enumerating every possible failure cause. This sidesteps the "streetlight anti-method"—measuring what's easy rather than what matters.

## Brendan Gregg's USE Method

Published in 2012 in ACM Queue. For **every resource**, check Utilization, Saturation, and Errors.

| Component | Definition | Key interpretation |
|-----------|------------|-------------------|
| **Utilization** | Average time the resource was busy | 100% = bottleneck; **70%+ is often problematic for I/O** |
| **Saturation** | Extra work the resource can't service (queued) | Any non-zero value adds latency—always problematic |
| **Errors** | Count of error events | Non-zero and increasing warrants investigation |

Designed as an "emergency checklist in a flight manual"—systematic, complete, fast. Converts unknown unknowns into known unknowns by generating specific questions for each resource: CPUs, memory, network interfaces, storage devices, interconnects.

**Claimed efficiency:** Solves ~80% of server performance issues with 5% of the effort.

### Resource Checklist Example (Linux)

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| CPU | `mpstat`, `vmstat`, `top` | Run queue length | `perf`, MCE logs |
| Memory | `free -m`, `vmstat` | Swap activity, OOM | `dmesg` |
| Network | `sar -n DEV`, `ip -s link` | `ifconfig` (overruns/drops) | `ifconfig`, `netstat -s` |
| Storage I/O | `iostat -x` | `avgqu-sz` | Device error logs |

## Tom Wilkie's RED Method

Created in 2015 at Weaveworks. USE applies to hardware, but **microservices need something designed for request-driven services**.

| Signal | What it measures | Why it matters |
|--------|------------------|----------------|
| **Rate** | Requests per second | Baseline for load and anomaly detection |
| **Errors** | Failed requests per second | Direct indicator of service health |
| **Duration** | Time those requests take | Proxy for user experience |

Power is **standardization at scale**. When every service exposes the same three metrics, engineers can be on-call for code they didn't write.

## When to Use Which

| Question | Framework | Why |
|----------|-----------|-----|
| Are users happy? | RED or Golden Signals | Service-level, user-experience focused |
| Is this machine healthy? | USE Method | Resource-level, capacity focused |
| Where is the bottleneck? | USE Method | Systematic resource iteration |
| Which service is failing? | RED Method | Consistent service-level view |
| What should our SLO measure? | Golden Signals | Comprehensive service health |

**The synthesis:**
- **RED** at the service layer for every microservice
- **USE** at the infrastructure layer for capacity and debugging
- **Golden Signals** bridges both (RED + Saturation)

## The Three Tiers of Metrics

### Infrastructure Metrics (Foundation)
CPU utilization, memory usage, disk I/O, network throughput, container resources, connection pools. Auto-collected by agents, lower cardinality, foundation for capacity planning.

### Application Metrics (User Experience Layer)
Latency distributions, throughput, error rates, queue lengths, cache hit rates. Require instrumentation, higher cardinality potential, directly relate to user experience. Golden Signals and RED operate here.

### Business Metrics (Outcome Layer)
Conversion rates, revenue, engagement, cart abandonment. Answer the "so what?" question.

### The Cascade
```
Infrastructure problem (disk latency spike)
        ↓
Application impact (database queries slow)
        ↓
Business impact (checkout abandonment increases)
```

Alert on business impact (symptoms), investigate through application metrics, identify root causes in infrastructure metrics.
