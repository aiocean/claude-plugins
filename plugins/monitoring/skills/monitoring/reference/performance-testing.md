# Performance Testing

## Test Types Overview

| Test Type | Purpose | Duration | When to Use |
|-----------|---------|----------|-------------|
| **Load** | Validate normal capacity | 30m - 2h | Before releases |
| **Stress** | Find breaking point | 1h - 4h | Capacity planning |
| **Spike** | Test sudden traffic | 15m - 30m | Flash sale prep |
| **Soak** | Find memory leaks | 4h - 24h | Before major releases |

## k6 (Recommended for API Testing)

### Basic Load Test

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up
    { duration: '5m', target: 100 },  // Steady
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.1'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);
}
```

### Stress Test

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '5m', target: 300 },
    { duration: '5m', target: 400 },  // Push beyond capacity
    { duration: '2m', target: 0 },
  ],
};
```

### Spike Test

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '30s', target: 1000 },  // Sudden spike
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};
```

### Soak Test (Memory Leak Detection)

```javascript
export const options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '8h', target: 100 },  // Extended duration
    { duration: '5m', target: 0 },
  ],
};
```

### Custom Metrics

```javascript
import { Counter, Trend, Gauge } from 'k6/metrics';

const checkoutDuration = new Trend('checkout_duration');
const orderCounter = new Counter('orders_created');

export default function () {
  const startTime = Date.now();
  const res = http.post('https://api.example.com/checkout', payload);

  checkoutDuration.add(Date.now() - startTime);
  orderCounter.add(1);
}
```

### Realistic User Journey

```javascript
export const options = {
  scenarios: {
    browser_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
      ],
    },
    api_users: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '15m',
      preAllocatedVUs: 100,
    },
  },
};

export default function () {
  http.get('https://example.com/');
  sleep(Math.random() * 3);

  http.get('https://example.com/search?q=laptop');
  sleep(Math.random() * 5);

  http.get('https://example.com/products/123');
  sleep(Math.random() * 10);

  // 30% conversion
  if (Math.random() < 0.3) {
    http.post('https://example.com/cart', { productId: 123 });
  }
}
```

## Artillery.io (YAML-based)

```yaml
config:
  target: 'https://api.example.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"

scenarios:
  - name: "Product browsing"
    weight: 70
    flow:
      - get:
          url: "/products"
      - think: 2
      - get:
          url: "/products/{{ $randomNumber(1, 100) }}"

  - name: "Checkout"
    weight: 30
    flow:
      - post:
          url: "/cart"
          json:
            productId: "{{ $randomNumber(1, 100) }}"
      - post:
          url: "/checkout"
```

## Locust (Python)

```python
from locust import HttpUser, task, between
import random

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def view_products(self):
        self.client.get("/products")

    @task(1)
    def view_product(self):
        product_id = random.randint(1, 100)
        self.client.get(f"/products/{product_id}")

    @task(1)
    def create_order(self):
        self.client.post("/orders", json={
            "product_id": random.randint(1, 100),
            "quantity": random.randint(1, 5)
        })

    def on_start(self):
        self.client.post("/login", json={
            "username": "test",
            "password": "test"
        })
```

## Tool Selection Guide

| Tool | Language | Best For | CI/CD |
|------|----------|----------|-------|
| **k6** | JavaScript | API testing, complex scenarios | ✅ Excellent |
| **Artillery** | YAML/JS | Simple scenarios, quick setup | ✅ Good |
| **Locust** | Python | Python teams, complex logic | ✅ Good |
| **JMeter** | GUI/XML | Legacy systems, visual setup | ⚠️ Requires plugins |

## Performance Targets

| Metric | Baseline | Good | Excellent |
|--------|----------|------|-----------|
| p50 latency | < 200ms | < 100ms | < 50ms |
| p95 latency | < 500ms | < 300ms | < 150ms |
| p99 latency | < 1s | < 500ms | < 300ms |
| Error rate | < 1% | < 0.1% | < 0.01% |
| Throughput | 10x normal | 20x normal | 50x normal |

## CI/CD Integration

```yaml
# GitHub Actions
- name: Run k6 load test
  uses: grafana/k6-action@v0.3.1
  with:
    filename: tests/load-test.js
    flags: --out json=results.json

- name: Check thresholds
  run: |
    if grep -q '"thresholds":{".*":{"ok":false' results.json; then
      echo "Performance thresholds failed!"
      exit 1
    fi
```

## When to Run Each Test

| Test | Frequency | Trigger |
|------|-----------|---------|
| Load | Every release | CI/CD pipeline |
| Stress | Monthly | Capacity review |
| Spike | Before events | Marketing campaigns |
| Soak | Quarterly | Major releases |
