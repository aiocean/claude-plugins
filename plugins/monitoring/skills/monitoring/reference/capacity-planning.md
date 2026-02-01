# Capacity Planning

## Quick Reference

| Planning Horizon | Update Frequency | Data Source |
|------------------|------------------|-------------|
| 3 months | Weekly | Real-time metrics |
| 6 months | Bi-weekly | Trend analysis |
| 12 months | Monthly | Business projections |

| Resource | Safety Buffer | Why |
|----------|---------------|-----|
| CPU | 30% | Spike headroom |
| Memory | 20% | GC + OS overhead |
| Connections | 25% | Connection churn |
| Storage | 40% | Growth + snapshots |

## Growth Projection

### Linear Projection (Simple)

```python
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

# Historical data
data = pd.DataFrame({
    'month': range(1, 13),
    'requests_per_second': [100, 120, 145, 160, 180, 200, 220, 245, 270, 290, 310, 330]
})

# Train model
model = LinearRegression()
model.fit(data[['month']], data['requests_per_second'])

# Forecast next 6 months
future_months = np.array([[13], [14], [15], [16], [17], [18]])
predictions = model.predict(future_months)

print(f"Projected RPS in 6 months: {predictions[-1]:.0f}")
```

### Prometheus Queries for Trends

```promql
# Monthly growth rate
(
  rate(http_requests_total[30d])
  /
  rate(http_requests_total[30d] offset 30d)
) - 1

# Predict resource exhaustion (30 days ahead)
predict_linear(
  node_memory_MemAvailable_bytes[1h],
  3600 * 24 * 30
)

# Storage growth prediction (90 days)
predict_linear(
  node_filesystem_avail_bytes[7d],
  3600 * 24 * 90
)
```

## Resource Forecasting

### CPU Requirements

```javascript
// Current state
const currentRPS = 1000;
const currentCPU = 0.65;  // 65% utilization
const targetCPU = 0.70;   // Target max 70%

// Projected load
const projectedRPS = 2500;

// Required capacity
const cpuScalingFactor = projectedRPS / currentRPS;
const requiredCPU = (currentCPU * cpuScalingFactor) / targetCPU;

console.log(`Need ${requiredCPU.toFixed(2)}x current CPU capacity`);
```

### Memory Requirements

```javascript
const avgMemoryPerRequest = 2048;  // bytes
const concurrentRequests = 500;
const overhead = 1.3;  // 30% for GC, OS

const requiredMemoryGB = (avgMemoryPerRequest * concurrentRequests * overhead) / (1024 ** 3);
console.log(`Required memory: ${requiredMemoryGB.toFixed(2)} GB`);
```

### Database Connections

```javascript
const connectionsPerInstance = 100;
const instances = 5;
const utilizationTarget = 0.75;

const effectiveConnections = connectionsPerInstance * instances * utilizationTarget;
const avgRequestsPerConnection = 10;
const maxRPS = effectiveConnections * avgRequestsPerConnection;

console.log(`Max sustainable RPS: ${maxRPS}`);
```

## Horizontal Scaling Calculator

```javascript
function calculateInstances(targetRPS, instanceCapacity, bufferPercent = 20) {
  const effectiveCapacity = instanceCapacity * (1 - bufferPercent / 100);
  const requiredInstances = Math.ceil(targetRPS / effectiveCapacity);

  // Multi-AZ minimum (2 per zone, 3 zones)
  const minTotal = 2 * 3;

  return Math.max(requiredInstances, minTotal);
}

console.log(calculateInstances(5000, 1000));  // 7 instances
```

## Auto-scaling Configuration

### Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
```

### AWS Auto Scaling

```json
{
  "AutoScalingGroupName": "app-asg",
  "MinSize": 3,
  "MaxSize": 20,
  "DesiredCapacity": 5,
  "TargetTrackingScalingPolicies": [
    {
      "TargetValue": 70.0,
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ASGAverageCPUUtilization"
      },
      "ScaleInCooldown": 300,
      "ScaleOutCooldown": 60
    }
  ]
}
```

## Performance Budgets

```javascript
const performanceBudget = {
  // Response time
  apiP50: 100,   // 50th percentile (ms)
  apiP95: 500,   // 95th percentile (ms)
  apiP99: 1000,  // 99th percentile (ms)

  // Infrastructure
  cpuUtilization: 70,     // Max % normal load
  memoryUtilization: 80,  // Max % normal load
  errorRate: 0.01,        // Max 1%
};
```

## Capacity Alerts (Prometheus)

```yaml
groups:
  - name: capacity
    rules:
      - alert: CPUExhaustionPredicted
        expr: |
          predict_linear(
            node_cpu_seconds_total{mode="idle"}[1h],
            3600 * 24 * 7
          ) < 0.2
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: CPU capacity will be exhausted in 7 days

      - alert: DiskSpaceProjection
        expr: |
          predict_linear(
            node_filesystem_avail_bytes[7d],
            3600 * 24 * 30
          ) < 1e9
        annotations:
          summary: Disk space will run out in 30 days

      - alert: DatabaseConnectionsNearLimit
        expr: |
          pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Database connections at 80% capacity

      - alert: ScalingRecommendation
        expr: |
          avg(rate(http_requests_total[5m])) >
          (instance_capacity * count(up{job="app"}) * 0.7)
        annotations:
          summary: Consider scaling - traffic approaching capacity
```

## Cost Optimization

### Instance Sizing

```javascript
function optimizeInstanceSize(workload) {
  const instances = [
    { type: 't3.small', vcpu: 2, memory: 2, cost: 0.0208 },
    { type: 't3.medium', vcpu: 2, memory: 4, cost: 0.0416 },
    { type: 't3.large', vcpu: 2, memory: 8, cost: 0.0832 },
    { type: 'm5.large', vcpu: 2, memory: 8, cost: 0.096 },
    { type: 'm5.xlarge', vcpu: 4, memory: 16, cost: 0.192 },
  ];

  const filtered = instances.filter(i =>
    i.vcpu >= workload.requiredVCPU &&
    i.memory >= workload.requiredMemory
  );

  // Sort by cost efficiency (resources / cost)
  return filtered.sort((a, b) => {
    const scoreA = (a.vcpu * a.memory) / a.cost;
    const scoreB = (b.vcpu * b.memory) / b.cost;
    return scoreB - scoreA;
  })[0];
}
```

## Scaling Decision Matrix

| Trigger | Action | Urgency |
|---------|--------|---------|
| 70% CPU sustained | Start planning | Low |
| 80% CPU sustained | Scale up | Medium |
| 90% CPU | Emergency scaling | High |
| 60% CPU for 24h | Scale down | Low |
| Error rate > 1% | Investigate + scale | High |
| P99 > SLO | Investigate | Medium |

## Capacity Review Checklist

- [ ] Review current utilization trends
- [ ] Compare actual vs projected growth
- [ ] Check scaling headroom (can scale 2x in 1 hour?)
- [ ] Verify auto-scaling policies working
- [ ] Review cost efficiency
- [ ] Update forecasts with new data
- [ ] Document capacity decisions
