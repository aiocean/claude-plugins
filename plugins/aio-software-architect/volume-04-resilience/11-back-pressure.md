# Back Pressure — Slow Down Before You Break

> "Back pressure is the system telling you the truth about how fast it can actually go. Ignoring it is how you turn a performance problem into an outage." — Reactive Streams Specification

## The Problem

Every system has a maximum throughput — a rate at which it can process work given its current resources. Below that rate, the system handles load with headroom. Above that rate, work accumulates faster than it's processed. The work has to go somewhere: into queues, into memory, into thread pools, into connection pools. These buffers absorb the excess temporarily, but they are finite. When they fill, the system fails — slowly at first (increasing latency as queues back up), then catastrophically (OOM crashes, queue overflows, connection pool exhaustion).

The naive response to this is to add more buffer: bigger queues, more threads, more memory. This delays the failure without preventing it. A larger queue means the system can accumulate more excess work before failing, but it also means latency climbs higher before the failure occurs, and recovery takes longer because the queue must drain before the system returns to normal. Bigger buffers make failures larger and slower, not smaller and faster.

The correct response is back pressure: a mechanism by which the downstream consumer signals its processing capacity to the upstream producer, causing the producer to slow down when the consumer is near its limit. Rather than accumulating excess work, the producer and consumer reach an equilibrium at the consumer's actual throughput rate.

Back pressure is how TCP works at the network level. The TCP receive window — the amount of unacknowledged data allowed in flight — is sized to the receiver's buffer capacity. As the receiver's buffer fills, it advertises a smaller window. The sender slows down proportionally. This prevents any single fast sender from flooding a slow receiver. The system naturally equilibrates at the slower party's rate.

The absence of back pressure at the application level is one of the most common root causes of cascading failure in distributed systems. A producer that can generate work faster than a consumer can process it will overwhelm the consumer if no back pressure mechanism exists. If the consumer is a shared resource (a database, a message queue, a downstream service), overwhelm of that consumer cascades to all producers depending on it.

## Core Concept

Back pressure is a flow control mechanism where consumers signal their capacity to producers, causing producers to modulate their output rate to match the consumer's processing rate. It propagates upstream through a processing pipeline: if any stage slows down, all upstream stages slow down proportionally.

The signal can be explicit or implicit:

**Explicit back pressure**: The consumer directly tells the producer to slow down. TCP's receive window is explicit back pressure. HTTP/2's stream flow control is explicit back pressure. A queue consumer that stops pulling messages when its internal buffer is full is explicit back pressure.

**Implicit back pressure**: The producer observes slowdown (increasing latency, timeouts, connection failures) and infers that the consumer is overloaded. This is reactive rather than proactive — the signal arrives after the consumer is already under pressure.

Explicit back pressure is preferable because it signals capacity before it's exhausted rather than after. The producer slows down preemptively rather than reactively.

### Bounded Queues as the Mechanism

The most common application-level back pressure mechanism is a bounded queue between producer and consumer:

```
Producer → [Bounded Queue] → Consumer
```

The queue has a maximum capacity. When full, the producer's write attempt blocks (or fails with a "queue full" error). This is back pressure: the queue acts as the signal carrier, communicating the consumer's lag back to the producer.

The queue size determines how much burst capacity the system has. A queue of 100 items means the producer can get 100 items ahead of the consumer before experiencing back pressure. A queue of 10,000 items means the producer can get far ahead, accumulating significant latency in the pipeline before back pressure kicks in.

Bounded queues with appropriate sizes are the mechanism; the challenge is setting the size correctly. Too small: back pressure triggers unnecessarily, reducing throughput under normal variation. Too large: latency climbs significantly before back pressure kicks in, and queue drain time after overload is long.

### TCP Flow Control as the Reference Model

TCP's flow control is the best-understood implementation of back pressure in distributed systems. The mechanism:

1. Receiver advertises receive window size in every ACK packet
2. Sender tracks the window and never sends more unacknowledged data than the window allows
3. When the receiver's buffer fills, it advertises window = 0
4. The sender stops sending completely
5. As the receiver processes data from its buffer, it advertises a larger window
6. The sender resumes proportionally

This mechanism works continuously and automatically. There is never a "queue full" crash; there is never an OOM from buffer overflow. The producer simply slows to match the consumer's actual processing rate.

Application-level back pressure mechanisms should work the same way: continuous signaling, proportional modulation, automatic equilibration.

### Reactive Streams

The Reactive Streams specification (formalized in JVM libraries like RxJava, Project Reactor, and Akka Streams) provides a standardized back pressure protocol for asynchronous stream processing:

- **Publisher** produces items
- **Subscriber** requests N items at a time via `request(n)`
- **Publisher** sends at most N items
- **Subscriber** requests more when ready to process them

This is explicit, demand-driven back pressure. The subscriber never receives more items than it has explicitly requested. A slow subscriber simply doesn't request more, and a well-behaved publisher waits. No buffers overflow because the subscriber controls the rate.

Java's standard library adopted Reactive Streams in `java.util.concurrent.Flow` (Java 9+), and frameworks like Spring WebFlux, Vert.x, and Quarkus use it natively for non-blocking I/O pipelines.

## Deep Dive

The Reactive Streams specification, developed collaboratively by engineers from Netflix, Pivotal, Lightbend, and others, arose from a specific failure mode that reactive programming without back pressure reliably produces: fast publishers overwhelming slow subscribers. The specification's solution — demand-driven flow, where subscribers request N items and publishers send at most N items — is elegant but its implications took the community time to fully absorb. The key insight is that demand signaling inverts the traditional push model: instead of the publisher deciding when to send data, the subscriber decides when it is ready to receive it. This inversion eliminates buffer overflow by design; a subscriber that has not signaled demand simply receives nothing.

The TCP analogy deserves deeper examination than most discussions provide, because TCP's flow control design reflects decades of engineering on exactly this problem. TCP's receive window advertisement — a field in every ACK packet — continuously communicates the receiver's available buffer space. The sender tracks this window and never puts more unacknowledged bytes in flight than the window allows. When the receiver's buffer fills, it advertises window=0 and the sender stops transmitting immediately. This is not a coarse rate limit or a threshold-based trigger — it is a continuous, per-packet feedback loop that automatically equilibrates sender and receiver rates. Every application-level back pressure mechanism should be evaluated against this reference: does it provide continuous feedback or only threshold-triggered feedback? Does it respond to gradual pressure or only to exhaustion? TCP handles both gracefully because the window size is a continuous signal, not a binary.

The Builder's Library's treatment of back pressure in the context of distributed services extends the TCP model to application-level message flows. The article "Avoiding overload in distributed systems by putting the smaller service in control" identifies the same mechanism: each service must be the authority on its own capacity. A service that accepts more work than it can process — hoping that callers will eventually slow down — is abdicating control over its own resource allocation. The Builder's Library argues that server-side admission control (load shedding, Article 04) and back pressure are two expressions of the same principle applied at different points in the request lifecycle: admission control rejects at the boundary, back pressure signals upstream before the boundary is reached.

The Reactive Streams back pressure model reveals a subtle problem with certain producer types that the specification acknowledges but cannot solve within its own model: sources that cannot be slowed. A keyboard generates events at the user's pace. A sensor publishes at a fixed hardware rate. A Kafka partition delivers messages at the partition's publish rate regardless of consumer speed. For these "hot" sources, demand-driven back pressure cannot work because the producer is not under the subscriber's control. The Reactive Streams specification provides overflow strategies for this case — drop oldest, drop newest, error, buffer — each of which represents a different policy for handling the mismatch between producer rate and consumer capacity. Netflix's internal experience with RxJava, documented in several engineering blog posts, found that choosing the wrong overflow strategy was a common source of both data loss (drop strategies used where data integrity was required) and OOM crashes (buffer strategies used where the rate mismatch was sustained).

Kleppmann's *DDIA* frames back pressure as a flow control problem in its chapter on stream processing, connecting it to the broader question of how streaming systems handle the impedance mismatch between producers and consumers operating at different rates. DDIA observes that unbounded buffers are never the correct answer because they convert a flow control problem (producer faster than consumer) into a resource exhaustion problem (buffer grows until OOM). Bounded buffers with back pressure signaling or with explicit overflow policies are the correct approach. DDIA's analysis of the log compaction and retention policies in Kafka reflects the same principle at the storage level: a Kafka topic is a bounded buffer (by retention time or size), and producers that exceed the retention rate are implicitly losing data. The architectural choice is not whether to bound the buffer but where to bound it and what happens when the bound is reached.

The SRE Book's chapter on managing load discusses back pressure indirectly through its treatment of query queuing and admission control. The book observes that a service with an unbounded request queue is guaranteed to fail under sustained overload, not because it lacks capacity but because it lacks a mechanism to signal capacity exhaustion upstream. The SRE Book's recommendation — limit queue sizes explicitly, instrument queue depth as a first-class metric, and alert on queue fill rate rather than queue depth — reflects the same design principles as Reactive Streams: make capacity limits explicit, make capacity signals continuous rather than binary, and propagate capacity information to the producers who can act on it.

## Implementation Guide

### Step 1: Identify Unbounded Buffers

Audit your system for unbounded buffers:
- Unbounded in-memory queues (`make(chan Work)` without size in Go, `new ArrayDeque<>()` in Java)
- Thread pools with unbounded work queues
- Message queue consumers that buffer messages locally without limit
- HTTP connection pools with no maximum pending requests

Each unbounded buffer is a potential OOM crash under sustained overload. Replace with bounded equivalents.

### Step 2: Size Bounded Queues Correctly

The queue size should be proportional to the burst duration you want to absorb without back pressure:

```
queue_size = burst_duration_seconds × processing_rate_per_second
```

If your consumer processes 1,000 items/second and you want to absorb 5-second bursts:
`queue_size = 5 × 1,000 = 5,000`

This allows 5-second traffic spikes to queue without triggering back pressure, while ensuring the queue drains quickly once the spike ends.

```go
// Bounded channel as work queue with back pressure
workQueue := make(chan WorkItem, 5000)

// Producer: will block when queue is full (back pressure)
func produce(work WorkItem) error {
    select {
    case workQueue <- work:
        return nil
    default:
        // Non-blocking: return error immediately if full
        return ErrQueueFull
    }
}

// Consumer: processes at its own rate
func consume() {
    for work := range workQueue {
        process(work)
    }
}
```

### Step 3: Propagate Back Pressure Upstream

When your service receives back pressure (queue full, upstream slow), propagate it to your callers rather than absorbing it:

```go
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    work := parseRequest(r)
    
    select {
    case h.workQueue <- work:
        // Accepted, process asynchronously
        w.WriteHeader(http.StatusAccepted)
    default:
        // Queue full — propagate back pressure to caller
        w.Header().Set("Retry-After", "5")
        w.WriteHeader(http.StatusServiceUnavailable)
    }
}
```

This is the correct behavior: when you're overwhelmed, tell your callers you're overwhelmed (503) rather than accepting work you can't process. Combined with backoff/retry (Article 03), this creates a natural feedback loop where callers slow down when the service is under pressure.

### Step 4: Monitor Queue Depths

Queue depth is a leading indicator of overload. Alert before queues fill:

```
# Alert when queue is > 80% full
queue_depth_ratio{service="orders"} > 0.8
```

Also monitor:
- Queue drain time (time to process all queued items at current rate)
- Producer rate vs. consumer rate ratio
- Queue depth trend (growing → impending overload; shrinking → recovering)

### Step 5: Implement Reactive Streams for I/O Pipelines

For data processing pipelines with async I/O, use Reactive Streams for built-in back pressure:

```java
// Spring WebFlux (Project Reactor) example
Flux.fromIterable(itemIds)
    .flatMap(id -> webClient.get()  // Async HTTP call
        .uri("/items/{id}", id)
        .retrieve()
        .bodyToMono(Item.class),
        16  // max concurrency — back pressure parameter
    )
    .buffer(100)  // Batch downstream
    .flatMap(batch -> repository.saveAll(batch))  // Bounded write
    .subscribe();
```

The `flatMap` concurrency parameter (16) limits how many concurrent HTTP calls are in flight, preventing overwhelming the upstream service. The `buffer(100)` and bounded `saveAll` limit write pressure on the database.

### Step 6: Auto-Scaling as a Pressure Relief Valve

Back pressure prevents overload in the immediate term; auto-scaling relieves pressure over the medium term. Configure auto-scaling triggers on queue depth:

```yaml
# AWS Auto Scaling policy based on SQS queue depth
MetricName: ApproximateNumberOfMessagesVisible
QueueName: order-processing-queue
ScaleOutThreshold: 1000  # messages
ScaleInThreshold: 100    # messages
```

This creates a feedback loop: queue fills → back pressure to producers → auto-scaling adds consumers → queue drains → back pressure releases. The system self-regulates without human intervention.

## When to Use / When NOT to Use

**Back pressure is essential for:**
- Producer-consumer pipelines where producer and consumer rates may differ
- Any service that receives traffic from sources it doesn't control
- Stream processing systems with variable-rate data sources
- Services with known capacity limits that must not be exceeded

**Back pressure is less critical for:**
- Request-response services with fast, uniform processing (the timeout mechanism provides implicit back pressure)
- Batch systems where latency doesn't matter and queue overflow is acceptable to disk
- One-way fire-and-forget pipelines where some data loss is acceptable

**Common signals that you need back pressure:**
- Periodic OOM crashes during traffic spikes
- Queue sizes that grow unboundedly under load
- Consumer services that receive 10x their normal rate during upstream retries
- Thread pool queues that fill during dependency slowdowns

## Common Mistakes

**Unbounded queues masking the problem**: A very large queue absorbs overload temporarily, hiding the producer-consumer rate mismatch. The queue drains slowly, latency is high during the drain period, and the system is vulnerable to faster-growing overload that exceeds even the large queue.

**Back pressure that doesn't propagate**: A service that applies back pressure to its internal queues but still accepts all external requests has shifted the problem from queue overflow to internal buffer overflow. Propagate back pressure to external callers.

**Auto-scaling without back pressure**: Auto-scaling adds capacity over minutes. Without back pressure during the scaling window, the service can fail before new capacity arrives. Back pressure buys time for scaling to respond.

**Ignoring back pressure signals**: A producer that receives 503 responses and retries immediately (without backoff) is ignoring the back pressure signal. Back pressure only works when producers respect it.

**Queue depth as the only signal**: Queue depth is a lagging indicator on bounded queues. Monitor queue depth trend and producer/consumer rate delta as leading indicators.

## Connections

**Load shedding (Article 04)**: Load shedding is the server-side response to overload (reject requests). Back pressure is the upstream signal that triggers a producer to reduce rate. They work together: back pressure causes producers to slow; load shedding protects the server when producers don't slow fast enough.

**Timeout patterns (Article 02)**: Timeouts are implicit back pressure — when the consumer is too slow to respond within the timeout, the producer observes a failure signal. Explicit back pressure is better because it signals before the timeout fires.

**Backoff and jitter (Article 03)**: When back pressure signals arrive (503, 429), producers should respond with exponential backoff. The two patterns compose: back pressure is the signal; backoff is the response.

**Graceful degradation (Article 09)**: Under back pressure, non-critical work should be shed first. Priority-aware back pressure sheds Tier 3 work before Tier 1 work, maintaining core functionality while shedding enhancements.

**Correlated failures (Article 13)**: Synchronized producers responding to back pressure simultaneously (all backing off at the same time) can cause demand collapse followed by demand spike. Jitter (Article 03) breaks this synchronization.

## Key Insights

The TCP analogy is worth internalizing deeply: TCP has had back pressure built in since 1981, and every internet-scale data transfer relies on it. Every database connection, every HTTP download, every streaming video uses TCP's flow control to match sender and receiver rates. The application layer frequently ignores this lesson, building producer-consumer pipelines without equivalent flow control and then wondering why they crash under load.

The bounded queue is both the mechanism and the constraint. The mechanism: when full, it signals back pressure. The constraint: it limits the maximum latency that queued items experience. An item that enters a queue of depth 5,000 with a 1,000-item/second consumer will wait at most 5 seconds before processing. This latency bound is explicit and measurable, unlike unbounded queues where latency grows without limit.

The hardest part of implementing back pressure in distributed systems is that some producers can't be slowed down. User clicks happen at user pace. IoT sensor data arrives at sensor pace. Upstream services send at their rate regardless of your back pressure signals. The solutions for these cases — sampling, windowing, dropping — are all forms of accepting data loss in exchange for capacity preservation. Back pressure makes the choice explicit: either the producer slows, or data is dropped. Pretending neither is necessary by using an unbounded buffer just defers the choice until OOM makes it for you.

The fundamental principle: design systems where slowdowns are signals, not silent failures. When a consumer is slow, that information should propagate upstream immediately and cause producers to adjust. Systems that suppress this information — through large buffers, unbounded queues, or retry storms — make problems worse rather than better.
