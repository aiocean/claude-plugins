# Capacity Planning

> "Running out of capacity in production is not a technical failure — it is a planning failure. The system did exactly what it was designed to do. You just didn't design it for what happened." — Google SRE Book

## The Problem

Capacity planning failures come in two flavors, and both are expensive. Under-provisioned systems collapse under load at the worst possible moment — peak traffic, product launch, Black Friday — when the business impact of downtime is highest and the engineering team is least available to respond. Over-provisioned systems waste capital on idle infrastructure, sometimes at staggering scale: organizations routinely discover that 30-40% of their cloud spend is on resources operating below 10% utilization.

The tragedy of most capacity planning failures is that they were predictable. The traffic that overwhelmed a payment system on Black Friday was not mysterious — it followed a pattern visible in the previous year's data. The database that ran out of connections during a product launch was not surprising — the connection pool size was a configuration constant that had not been reviewed since the service was first deployed at one-tenth of its current scale. The disk that filled up and crashed a logging service was growing at a measurable rate for months before it hit the limit. Capacity planning is fundamentally a forecasting problem, and forecasting is solvable with data.

The second problem is that capacity planning requires different thinking than most engineering work. Engineers optimize for correctness and performance. Capacity planning requires optimizing for cost efficiency, headroom adequacy, and forecast accuracy. These are not natural engineering intuitions. An engineer who builds a system that handles 10x peak load is doing great engineering; an engineer who realizes that 10x headroom costs 10x more than 2x headroom, and that 2x is almost certainly sufficient, is doing great capacity planning. The discipline of not over-engineering requires a different kind of rigor than the discipline of making things work.

## Core Concept

Capacity planning is the practice of ensuring that a system has sufficient resources to handle its expected load, with appropriate headroom for uncertainty, at the minimum cost that meets the reliability requirement. It is not a one-time activity — it is a continuous cycle of measurement, forecasting, validation, and adjustment.

The capacity planning cycle has four phases:

**Measure**: What does the system currently consume? What does it currently handle? What is the relationship between load (requests per second, jobs per hour, data volume) and resource consumption (CPU, memory, network, storage, database connections)?

**Forecast**: What will the load be in the future? What drives the load (user growth, seasonal patterns, product launches)? What are the confidence intervals on the forecast?

**Validate**: Does the system behave as the forecast predicts under simulated future load? Load testing validates both the forecast and the system's capacity limits.

**Adjust**: Based on measurement and validation, make provisioning decisions: how much capacity to add, when to add it, and how to do so with minimum cost and operational risk.

### Resource Taxonomy

Capacity planning requires thinking about multiple resource types simultaneously. Each has different characteristics, different failure modes, and different lead times for remediation.

**Compute (CPU and memory)**: The most commonly monitored resources. CPU saturation causes request queuing and latency degradation. Memory saturation causes OOM kills, swap thrashing, or application crashes. Both respond quickly to auto-scaling in cloud environments.

**Network bandwidth**: Often ignored until it becomes the bottleneck. Especially relevant for services that transfer large payloads (media, binary files, large JSON responses). Network egress costs are a significant cloud cost driver for data-intensive services.

**Storage (disk I/O and capacity)**: Database storage, log volume, and static asset storage all grow with usage. Unlike compute, storage growth is often predictable from a simple linear trend. Disk I/O saturation is distinct from disk capacity saturation — a fast-growing SSD can still have saturated I/O before it runs out of space.

**Database connections**: Connection pools are finite resources. The maximum connections for a PostgreSQL instance is a hard limit that cannot be exceeded; requests beyond the limit fail immediately. Connection pool exhaustion is a common incident root cause that is entirely predictable with basic capacity analysis.

**Service-specific limits**: API rate limits (third-party APIs), queue throughput limits, cache memory limits. Each service has its own resource envelope that must be modeled.

### The Headroom Principle

Headroom is the buffer between current utilization and maximum capacity. The correct amount of headroom depends on three factors:

**Growth rate**: A service growing at 10% per month needs more headroom than one growing at 1% per month. If you are at 70% capacity with 10% monthly growth, you hit 100% in about 3 months. With 1% monthly growth, you have 30 months.

**Lead time for scaling**: How long does it take to provision additional capacity? For auto-scaling cloud resources: minutes. For managed database services: hours. For hardware ordering and racking: weeks to months. Headroom must cover the time to scale plus a safety margin.

**Cost of failure**: A payment processing service hitting capacity during a transaction should have more headroom than an internal analytics dashboard. The business cost of running out sets the appropriate safety margin.

A practical headroom target for most services:
- **Current utilization < 60%**: Comfortable, no immediate action needed
- **Current utilization 60-75%**: Planning phase — forecast when you'll hit 80%, start scaling preparation
- **Current utilization 75-85%**: Action required — begin scaling
- **Current utilization > 85%**: Urgent — you are close to the cliff

These numbers assume cloud infrastructure where scaling takes minutes. For infrastructure with longer lead times, start acting earlier.

### Forecasting Demand

Demand forecasting combines historical data analysis with business input:

**Historical trends**: Plot your key metrics (requests per second, daily active users, data volume) over the past 6-12 months. Fit a trend line. Project forward. This gives you the baseline forecast.

**Seasonal patterns**: Most consumer-facing services have strong seasonal patterns. E-commerce sees 3-5x traffic on Black Friday. News services spike on major events. B2B SaaS sees Monday-morning traffic peaks and summer slowdowns. The seasonal pattern must be layered on the trend.

**Planned growth drivers**: Upcoming product launches, marketing campaigns, new customer segments, geographic expansion. Business stakeholders know about these; capacity planners need to extract the traffic implication.

**Elasticity**: How does your traffic respond to growth? A platform with network effects may see superlinear growth as adoption accelerates. A service sold per-seat to enterprise customers may grow linearly with contract signings.

```python
# Simple capacity forecast: decompose trend + seasonality
import pandas as pd
from prophet import Prophet

# Load historical traffic data
df = pd.DataFrame({
    'ds': pd.date_range('2023-01-01', periods=365),
    'y': historical_rps_data
})

model = Prophet(yearly_seasonality=True, weekly_seasonality=True)
model.fit(df)

# Forecast 90 days ahead
future = model.make_future_dataframe(periods=90)
forecast = model.predict(future)

# Add headroom multiplier (1.5x = 50% headroom)
forecast['capacity_needed'] = forecast['yhat_upper'] * 1.5
```

### Load Testing

Forecasting tells you what load to expect. Load testing tells you whether your system can handle it. Load testing should validate two things: the system behaves correctly under expected peak load, and the system degrades gracefully (not catastrophically) beyond that load.

**Load testing tools**:
- **k6** (Grafana): JavaScript-based, developer-friendly, excellent for API load testing
- **Locust** (Python): Python-scriptable, good for complex user journey simulation
- **Gatling** (Scala/JVM): High performance, good for very high load scenarios
- **Artillery**: JavaScript/YAML, easy CI integration

A basic k6 load test:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },   // ramp up to 100 users
    { duration: '10m', target: 100 },  // hold at 100 users (baseline)
    { duration: '5m', target: 500 },   // ramp up to 500 users (peak)
    { duration: '10m', target: 500 },  // hold at peak
    { duration: '5m', target: 1000 },  // stress test: 2x peak
    { duration: '5m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],  // 99% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // error rate under 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

**Load testing in production vs. staging**: Load testing in staging is useful but limited — staging rarely has the same data volume, same cache hit rates, or same third-party API behavior as production. Production load testing (using traffic shadowing or dark launch techniques) provides more accurate results at higher risk. The compromise: test in staging with production-equivalent data volumes and realistic query patterns, not with synthetic data.

**Finding the breaking point**: Load tests that only test at expected peak miss the question "how far above peak before things break?" Gradually increase load until you observe degradation (latency spike, error rate increase). The load at which degradation begins is your effective capacity limit. The headroom calculation is: capacity limit / expected peak load.

### Right-Sizing

Right-sizing is the practice of ensuring that provisioned resources match actual utilization — eliminating both under-provisioning (which causes incidents) and over-provisioning (which wastes money).

In cloud environments, right-sizing is a continuous activity because workloads change and cloud providers introduce new instance types. AWS Compute Optimizer, Google Cloud Recommender, and Azure Advisor provide automated right-sizing recommendations based on utilization data.

The typical right-sizing cycle:
1. Collect 30 days of CPU and memory utilization metrics at 1-minute resolution
2. Identify instances where p99 utilization < 40% (candidates for downsizing)
3. Identify instances where average utilization > 70% (candidates for upsizing)
4. Model the cost impact of recommended changes
5. Execute changes during low-traffic windows
6. Validate that performance SLOs are maintained after changes

The financial impact of right-sizing is often surprising. Organizations running cloud workloads without active right-sizing typically find 20-30% cost reduction opportunities in their first right-sizing audit.

### Auto-Scaling Policies

Auto-scaling extends the capacity planning conversation from "how much capacity do I need?" to "how does capacity adjust dynamically to match demand?" Modern cloud platforms support multiple auto-scaling dimensions:

**Horizontal pod autoscaling (Kubernetes HPA)**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
```

**Scale-out lead time**: Auto-scaling does not help if scaling takes longer than the traffic spike. A Black Friday traffic ramp that goes from 1x to 10x in 5 minutes will overwhelm a system that takes 10 minutes to provision new instances. For predictable peak events, pre-scale before the event rather than relying on auto-scaling during it.

**Scale-in aggressiveness**: Scaling down too aggressively (removing instances immediately when utilization drops) causes oscillation and wastes warmup time. Standard practice: scale out aggressively (trigger at 60% utilization), scale in conservatively (trigger after 30 minutes below 40% utilization).

**Vertical scaling**: For databases and other stateful services that cannot scale horizontally, vertical scaling (upgrading to a larger instance type) is often the only option. Vertical scaling typically requires a maintenance window and has hard limits. Plan vertical scaling headroom more conservatively.

### Black Friday Planning

Seasonal peak planning is a specialization of capacity planning with additional urgency: you have a specific, known date with a specific, forecast load, and the cost of failure on that date is much higher than on a typical day.

**Google's approach to traffic peak planning**: Run a scaled traffic test 2-4 weeks before the peak. Google calls these "DiRT" (Disaster Recovery Testing) exercises. The goal is to validate that the system handles peak load with margin, to identify bottlenecks before they matter, and to give teams time to address issues found.

**The pre-scale decision**: For services that cannot auto-scale fast enough, pre-scale to 150% of forecast peak capacity before the event. The cost of the over-provisioning for one day is much less than the cost of an outage during the event.

**Runbook for peak traffic events**: Document the specific actions that will be taken if traffic exceeds forecast at various thresholds. 125% of forecast: monitor closely. 150%: enable manual traffic throttling for non-critical features. 200%: execute prepared playbook for emergency capacity addition.

**Post-peak review**: After every significant peak event, run a capacity review. What did the forecast say? What actually happened? Where were the bottlenecks? What needs to be different for next year?

## Deep Dive

### The SRE Book on Managing Load: Utilization Targets and Load Testing

The SRE Book's chapter on "Managing Load" provides the most systematic published treatment of capacity planning as a reliability practice. The book's central argument: capacity planning is not a finance exercise (how much infrastructure can we afford?) but a reliability exercise (how much capacity is required to meet our SLOs under peak load?). These two framings produce different answers and different organizational behaviors.

The book introduces "utilization targets" — the concept that running at 100% utilization is a reliability failure waiting to happen, because there is no headroom for traffic spikes, slow queries, or degraded dependencies. The SRE Book recommends targeting 40-60% average utilization for most services, with the specific target depending on the burstiness of the traffic pattern and the cost of latency spikes. A service with highly bursty traffic (sharp spikes 10x the average) needs more headroom than a service with flat traffic. The headroom calculation is not arbitrary — it is derived from the traffic distribution: if your P99 peak is 3x your P50 average, you need at least 3x your P50 capacity to serve the P99 peak without degradation.

The book's treatment of load testing is equally precise. Load tests must simulate the actual traffic distribution, not just average load. A load test that generates a steady 1,000 RPS for 30 minutes does not test how the service behaves during a traffic spike that hits 3,000 RPS for 2 minutes. The SRE Book recommends testing at 2x expected peak as a minimum baseline, with separate tests for the spike patterns that are known risks (product launches, marketing events, end-of-month batch processing).

### The SRE Book on Capacity Planning Process: Quarterly Reviews and Demand Forecasting

The SRE Book's chapter on capacity planning documents a quarterly review process that connects business growth projections to infrastructure investment decisions. The process has three inputs: historical growth rates (measured from actual traffic data), forward-looking business projections (new feature launches, marketing campaigns, seasonal patterns), and efficiency improvements (optimization work that reduces the resource cost per request).

The quarterly cadence is intentional. Annual capacity planning is too infrequent for fast-growing services — a service that doubles in six months needs mid-year reforecasting. Monthly planning is too frequent to justify the organizational overhead of formal reviews. Quarterly reviews provide enough lead time for infrastructure provisioning while remaining responsive to actual growth patterns.

The book emphasizes that capacity planning accuracy improves over time as services mature and traffic patterns become predictable. A new service with three months of traffic history cannot produce accurate 12-month projections. A service with three years of history can identify seasonal patterns, correlate traffic with business metrics, and produce forecasts accurate to within 20-30%. Building this forecasting capability is an investment in the operational maturity of the service — it moves capacity decisions from reactive (add more when it breaks) to proactive (add capacity before it becomes a constraint).

## Implementation Guide

### Step 1: Establish Utilization Baselines

For every production service, collect 30-day baseline metrics:
- CPU utilization (p50, p90, p99, max)
- Memory utilization (same percentiles)
- Request rate and latency (p50, p95, p99)
- Database connection pool utilization
- Storage growth rate (for persistent data)

Most monitoring platforms (Datadog, Prometheus + Grafana) can generate these baselines from existing metrics in under an hour.

### Step 2: Build the Capacity Model

A simple capacity model answers: at what request rate does each resource (CPU, memory, connections) saturate?

```python
# Simple capacity model: find the saturation point
import numpy as np
from sklearn.linear_model import LinearRegression

# Fit resource consumption as a function of request rate
# data from load testing at different traffic levels
rps = np.array([100, 200, 500, 1000, 2000]).reshape(-1, 1)
cpu_pct = np.array([10, 20, 48, 93, None])  # None = saturated, test stopped

# Fit linear model to non-saturated data
model = LinearRegression()
model.fit(rps[:4], cpu_pct[:4])

# Predict saturation point (100% CPU)
saturation_rps = (100 - model.intercept_) / model.coef_[0]
print(f"CPU saturates at approximately {saturation_rps:.0f} RPS")
# Output: CPU saturates at approximately 1075 RPS

# With current peak of 800 RPS, headroom = 1075/800 = 1.34x (too tight)
# Recommendation: scale to 3 replicas for 2x headroom at current peak
```

### Step 3: Define and Automate Scaling Policies

For each auto-scalable resource, define:
- Scale-out trigger (at what utilization threshold)
- Scale-in trigger (at what utilization threshold, with what stabilization window)
- Minimum and maximum replica counts
- Scale-out step size

Test the auto-scaling behavior in staging under simulated ramp-up traffic before relying on it in production.

### Step 4: Quarterly Capacity Reviews

Run a quarterly capacity review with the following agenda:
- Review current utilization vs. targets
- Review growth vs. forecast (how accurate were last quarter's projections?)
- Update growth forecasts based on business plans
- Identify resources approaching headroom limits
- Approve capacity addition requests
- Review cloud spend and right-sizing opportunities

### Step 5: Annual Load Test

Run a full load test annually at minimum, more frequently for rapidly growing services. The annual load test should simulate 1.5-2x expected peak load and run long enough to surface memory leaks, connection pool exhaustion, and other issues that only appear under sustained load.

## When to Use / When NOT to Use

**Full capacity planning discipline is required for:**
- Services with predictable seasonal peaks (retail, events, news)
- Services supporting business-critical operations where capacity failure is unacceptable
- Services growing faster than 20% per quarter
- Services with hard capacity limits (database connection pools, API rate limits)

**Simplified capacity planning is sufficient for:**
- Auto-scaling cloud services with no hard limits, growing at predictable rates
- Internal tools with predictable, bounded usage
- Services behind CDNs where origin traffic is a small fraction of user traffic

**Don't bother with formal capacity planning when:**
- The service is in early development phase with no production traffic
- The service has negligible traffic (< 10 RPS) and abundant headroom

## Common Mistakes

**Planning for average load, not peak load**: Average utilization of 30% sounds comfortable until you realize that peak utilization is 90% and every Tuesday morning triggers a latency alert. Capacity planning must model peak, not average.

**Ignoring slow-growing resources**: CPU is easy to watch. Storage growth is easy to ignore until a disk fills and crashes a service. Slow-growing resources (disk, database tables, log volumes) need trend alerts, not just threshold alerts.

**Not load testing before scaling down**: Right-sizing to reduce cost without load testing first has caused more than one production incident. Always validate that the smaller instance type still meets performance SLOs before deploying it.

**Over-relying on auto-scaling without testing it**: Auto-scaling configuration can be wrong in subtle ways (scale-out not triggered until too late, scale-in too aggressive). Test the auto-scaling behavior explicitly under realistic traffic patterns.

**Not accounting for cold start time**: New instances take time to warm up. An auto-scaling policy that triggers at 80% utilization and takes 5 minutes to provision new instances will see 5 minutes of overload during rapid traffic growth. Either set lower trigger thresholds or implement predictive scaling.

**Treating cost and reliability as equally weighted**: They are not. The cost of a production outage during peak traffic typically exceeds weeks of over-provisioning costs. When in doubt, provision more capacity.

## Connections

**SLOs (Article 02)**: Capacity is required to meet SLOs. The relationship between load and SLI values — how does latency change as utilization increases? — is the core of capacity planning. Your SLO determines your minimum headroom requirement.

**Observability (Article 03)**: Capacity planning requires utilization metrics. Without good metrics for CPU, memory, network, and application-specific resources, capacity planning is guesswork.

**Load Testing**: Load testing is the validation step in capacity planning. It is how you measure actual capacity limits rather than estimating them.

**Incident Management (Article 09)**: Capacity failures are a common incident cause. Postmortems from capacity-related incidents should produce capacity planning improvements: better headroom targets, better auto-scaling policies, better forecasting.

## Key Insights

The most important insight in capacity planning is that running out of capacity is almost always predictable. The data was available. The trend was visible. The seasonal pattern had occurred before. Capacity failures happen because organizations do not have a systematic process for looking at that data regularly and acting on what it shows.

The distinction between average utilization and peak utilization is not just academic — it determines whether your system works or fails during the moments that matter most. Capacity planning for average load is a category error. The system must work at peak. Design for peak.

Cost optimization and capacity planning are not in conflict — they are the same discipline approached from opposite directions. Under-provisioning wastes money on incidents and customer loss. Over-provisioning wastes money on idle resources. The goal is the minimum capacity that meets the reliability requirement, which requires understanding both the demand forecast and the system's capacity characteristics. Organizations that do this well achieve both higher reliability and lower costs than organizations that treat them as tradeoffs.

Load testing is the only way to know your system's capacity limits. Every other approach — calculation, modeling, extrapolation from monitoring — has systematic blind spots. A system that has never been tested under peak load has an unknown capacity limit, and unknown limits always reveal themselves at the worst possible time.
