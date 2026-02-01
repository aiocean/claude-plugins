# Application Profiling

## Quick Reference

| Tool | Language | Type | When to Use |
|------|----------|------|-------------|
| **clinic.js** | Node.js | CPU, Event loop | Production bottlenecks |
| **Chrome DevTools** | Node.js | CPU, Memory | Development debugging |
| **cProfile** | Python | CPU | Function-level profiling |
| **py-spy** | Python | CPU (sampling) | Production profiling |
| **pprof** | Go | CPU, Memory, Goroutines | Go applications |
| **async-profiler** | Java | CPU, Allocation | JVM applications |

## Node.js Profiling

### clinic.js (Recommended)

```bash
# Install
npm install -g clinic

# CPU profiling - diagnose bottlenecks
clinic doctor -- node app.js

# Flame graph - visualize CPU time
clinic flame -- node app.js

# Event loop analysis
clinic bubbleprof -- node app.js
```

### Built-in Profiler

```bash
# Generate V8 profile
node --prof app.js

# Process the output
node --prof-process isolate-0x*.log > processed.txt

# Chrome DevTools (interactive)
node --inspect app.js
# Open chrome://inspect
```

### Memory Profiling

```javascript
import v8 from 'v8';

// Heap snapshot (for memory leak detection)
const snapshot = v8.writeHeapSnapshot();
console.log('Snapshot written to:', snapshot);

// Memory usage monitoring
function logMemory() {
  const usage = process.memoryUsage();
  console.log({
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
  });
}
```

### Performance Marks (Custom Timing)

```javascript
import { performance, PerformanceObserver } from 'perf_hooks';

performance.mark('operation-start');
await processOrder(orderId);
performance.mark('operation-end');

performance.measure('operation', 'operation-start', 'operation-end');

// Observer for automatic logging
const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});
obs.observe({ entryTypes: ['measure'] });
```

## Python Profiling

### cProfile (Built-in)

```python
import cProfile
import pstats

def main():
    process_data()

if __name__ == '__main__':
    profiler = cProfile.Profile()
    profiler.enable()

    main()

    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(20)  # Top 20 functions
```

### Line Profiler (Line-by-line)

```python
# pip install line_profiler

@profile
def expensive_function():
    result = []
    for i in range(10000):
        result.append(i ** 2)
    return result

# Run: kernprof -l -v script.py
```

### Memory Profiler

```python
# pip install memory_profiler

from memory_profiler import profile

@profile
def process_large_data():
    data = [i for i in range(1000000)]
    result = [x * 2 for x in data]
    return result

# Run: python -m memory_profiler script.py
```

### py-spy (Production Safe)

```bash
# CPU sampling (live process, no restart needed)
py-spy top --pid 12345

# Generate flame graph
py-spy record -o profile.svg --pid 12345

# Record for duration
py-spy record -o profile.svg --duration 60 -- python app.py
```

## Go Profiling

### pprof (Built-in)

```go
import (
    "net/http"
    _ "net/http/pprof"
)

func main() {
    // Enable profiling endpoint
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()

    // Your application code
}
```

```bash
# CPU profile (30 seconds)
curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof cpu.prof

# Memory profile
curl http://localhost:6060/debug/pprof/heap > heap.prof
go tool pprof heap.prof

# Goroutine profile
curl http://localhost:6060/debug/pprof/goroutine > goroutine.prof

# Web interface
go tool pprof -http=:8080 cpu.prof
```

## Java Profiling

### async-profiler (Low Overhead)

```bash
# CPU profiling
./profiler.sh -d 30 -f cpu.html <pid>

# Allocation profiling
./profiler.sh -d 30 -e alloc -f alloc.html <pid>

# Flame graph
./profiler.sh -d 30 -f flamegraph.svg <pid>
```

### JVM Options

```bash
java -Dcom.sun.management.jmxremote \
     -Dcom.sun.management.jmxremote.port=9010 \
     -Dcom.sun.management.jmxremote.authenticate=false \
     -jar app.jar
```

## Database Query Profiling

### PostgreSQL

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
SELECT pg_reload_conf();

-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 123
AND created_at > NOW() - INTERVAL '30 days';

-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### MySQL

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.1;  -- 100ms

-- Analyze query
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 123;

-- Performance schema
SELECT * FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

## Problem Identification

| Symptom | Likely Cause | Tool to Use |
|---------|--------------|-------------|
| High CPU, slow responses | CPU-bound code | Flame graph |
| Growing memory over time | Memory leak | Heap snapshots |
| Low CPU, high latency | I/O blocking | Event loop analysis |
| Poor scaling with threads | Lock contention | Thread profiler |
| Slow specific functions | Algorithm issue | Line profiler |

## APM Integration

### DataDog

```javascript
import tracer from 'dd-trace';
tracer.init();

const span = tracer.startSpan('process.order', {
  resource: orderId,
  tags: { 'order.total': orderTotal },
});

try {
  await processOrder(orderId);
  span.setTag('status', 'success');
} catch (err) {
  span.setTag('error', err);
} finally {
  span.finish();
}
```

### New Relic

```javascript
import newrelic from 'newrelic';

newrelic.startBackgroundTransaction('process-orders', async () => {
  await newrelic.startSegment('validate-orders', true, async () => {
    return validateOrders(orders);
  });
});

newrelic.recordMetric('Custom/OrderValue', orderTotal);
```

## Best Practices

1. **Profile in production-like environment** - Development doesn't reflect real load
2. **Use sampling profilers for production** - Lower overhead (py-spy, async-profiler)
3. **Profile under load** - Issues often only appear at scale
4. **Compare before/after** - Keep baseline profiles
5. **Focus on hot paths** - 80% of time is spent in 20% of code
