# Stream Processing & Stream-Table Duality

> "A stream is a sequence of events over time. A table is a snapshot of the current state of the world. These two representations are dual: a stream can be derived from a table by logging every change, and a table can be derived from a stream by accumulating all events." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

Traditional data processing systems draw a sharp distinction between "live" operational data (stored in databases, updated in real time) and "analytical" data (dumped into a data warehouse nightly, processed in batch). This architecture worked when decisions could wait for the overnight batch run. It doesn't work when your fraud detection system needs to flag a transaction within 50 milliseconds of it occurring, or when your recommendation engine needs to incorporate a user's last click into the next page load.

But even outside real-time requirements, batch processing has a fundamental problem: it processes data that is already old. By the time your nightly batch job finishes aggregating yesterday's sales data, the numbers are already irrelevant to decisions you need to make today. You're always working with yesterday's picture of the world, never today's.

Stream processing is the answer: instead of periodically processing batches of accumulated data, you process each event as it arrives. Each click, each transaction, each sensor reading, each user action flows through your processing pipeline as a continuous stream. Aggregations are maintained incrementally. Alerts fire the moment conditions are met. The world you're operating on is the current world, not yesterday's snapshot.

But stream processing introduces its own profound complexity. Events arrive out of order (network delays mean a sensor reading from 10 seconds ago might arrive after a reading from 2 seconds ago). Events have two timestamps — when they happened (event time) and when the processing system saw them (processing time) — and the gap between them is unpredictable. "Exactly once" processing (ensuring each event affects the output exactly once, even if the system crashes and restarts) is surprisingly hard. And aggregating events over time windows requires deciding when a window is "done" — which is philosophically difficult when late events are always possible.

Understanding stream processing deeply means understanding the stream-table duality, the mechanics of windowing, the semantics of exactly-once, and the trade-offs between event time and processing time.

## Core Concept

### Events as First-Class Citizens

In batch processing, data is a static artifact — a file, a database snapshot. In stream processing, data is a sequence of immutable, ordered events. An event is a record that something happened at a specific time:

```
Event: {
  event_id:   "evt_123abc",
  event_type: "user.purchase",
  user_id:    "usr_456",
  product_id: "prod_789",
  amount:     49.99,
  currency:   "USD",
  event_time: "2024-01-15T14:23:45.123Z",  // When it happened
  kafka_offset: 1234567,                    // Position in the stream
}
```

Events are immutable. You don't update an event; you append new events. This immutability is crucial — it makes streams replayable. If your processing logic has a bug, you can fix the bug and replay the stream from the beginning to regenerate correct output.

### The Stream-Table Duality

This is the most profound insight in stream processing: **a stream and a table are two different views of the same underlying truth**.

A **table** is a snapshot of the current state. It answers "what is the current value of X?" Tables are mutable — you update them in place.

A **stream** is the changelog of a table — a log of every change ever made. It answers "what happened to X over time?" Streams are append-only and immutable.

```
Stream (changelog):
  t=1: {user_id: 1, action: "signup"}
  t=2: {user_id: 1, action: "set_email", email: "alice@example.com"}
  t=3: {user_id: 2, action: "signup"}
  t=4: {user_id: 1, action: "set_email", email: "alice@corp.com"}
  t=5: {user_id: 1, action: "set_name", name: "Alice"}

Table (materialized view of stream at t=5):
  user_id | email             | name
  --------|-------------------|-------
  1       | alice@corp.com    | Alice
  2       | NULL              | NULL
```

You can convert a stream to a table by replaying all events and materializing the final state. You can convert a table to a stream by emitting all current rows as events (a "snapshot") and then emitting a change event for every subsequent update (Change Data Capture).

This duality has a practical consequence: **every database is a stream processing system in disguise**, and every stream processing system maintains internal state that is equivalent to tables. Kafka topics are streams. Kafka consumer group offsets are tables (the current position of each consumer group in each partition). Flink's state backends are tables (the accumulated state of stream aggregations).

### Kafka: The Universal Message Bus

Apache Kafka, originally built at LinkedIn to serve as a unified log, has become the dominant stream processing platform. Kafka's design is based on a simple insight: make the log the primary data structure, and build everything else on top of it.

A Kafka **topic** is a distributed, replicated, ordered log. Messages are appended to the tail and are immutable once written. Consumers read from any position in the log — they maintain a cursor (offset) and advance it as they read. Because the log is retained for a configurable period (days, weeks, or indefinitely with tiered storage), consumers can replay past messages, multiple consumers can independently read the same stream, and new consumers can be added at any time and catch up from the beginning.

```
Topic "user-events" with 3 partitions:

Partition 0:  [msg0][msg1][msg2][msg3][msg4] -> appending
Partition 1:  [msg0][msg1][msg2]             -> appending
Partition 2:  [msg0][msg1][msg2][msg3]       -> appending

Consumer Group A (real-time analytics):
  P0 offset: 4 (reading msg4)
  P1 offset: 2 (reading msg2)
  P2 offset: 3 (reading msg3)

Consumer Group B (audit log archiver):
  P0 offset: 1 (2 messages behind, catching up)
  P1 offset: 1
  P2 offset: 2
```

Kafka's retention means consumer groups can independently fall behind and catch up without affecting each other. This decoupling is fundamental to event-driven architectures.

### Windowing: Aggregating Events Over Time

Most stream processing involves aggregations over a time window — "total sales in the last 5 minutes," "unique users in the last hour," "average sensor reading over the last 10 readings."

**Tumbling Windows:** Fixed-size, non-overlapping windows. Every event belongs to exactly one window.

```
Events:  e1(t=1) e2(t=3) e3(t=6) e4(t=8) e5(t=11)
Window size: 5 seconds

Window [0,5):  e1, e2
Window [5,10): e3, e4
Window [10,15): e5
```

**Sliding Windows:** Fixed size, sliding by a step smaller than the window size. Events can belong to multiple windows.

```
Window size: 10 seconds, slide: 5 seconds

Window [0,10):  e1, e2, e3, e4
Window [5,15):  e3, e4, e5
Window [10,20): e5
```

**Session Windows:** Variable-size windows based on activity gaps. A new window starts when an event arrives after a gap longer than the session timeout.

```
Events: e1(t=1) e2(t=3) e3(t=15) e4(t=17)
Session gap: 10 seconds

Session 1 [1,3]:  e1, e2  (gap > 10s after e2)
Session 2 [15,17]: e3, e4
```

### Event Time vs Processing Time

Every event has two timestamps that are often different:

- **Event time:** When the event actually occurred in the real world (recorded by the originating system)
- **Processing time:** When the processing system received and processed the event

The gap between them is called **processing lag** and can range from milliseconds (real-time systems with fast networks) to hours or days (mobile apps that batch events while offline).

```
Event time:      09:00:00  09:00:01  09:00:05  09:00:02  09:00:08
Processing time: 09:00:01  09:00:02  09:00:06  09:00:09  09:00:10
                                               ^^^^^^^^^
                                               4 seconds late!
                                               (network delay)
```

**Processing-time windows** are easy: the window is defined by when events arrive. No late event problem — events arrive in order (by definition). But they don't reflect the true event-time distribution — a processing-time window might include events from wildly different event times.

**Event-time windows** reflect the true temporal distribution of events. But they require waiting for late events. How long do you wait? If you wait forever, your results are never finalized. If you wait a fixed time, you'll still miss very late events.

**Watermarks** are the solution. A watermark is a declaration: "I have seen all events up to event time T." When the watermark for a window passes the window's end time, the window is considered complete and its result is emitted. Late events (events with event time before the watermark) are either discarded or trigger a result update (with explicit late-data handling).

```
Events arriving: e(t=5) e(t=8) e(t=6) e(t=12) e(t=9) e(t=15)
Watermark (max event time - 3s):   2     5     3     9     6    12

Window [0, 10) completes when watermark >= 10.
At watermark=12 (after e(t=12) arrives): window [0,10) is finalized.
Events in window: all events with event time in [0,10) = e(t=5), e(t=8), e(t=6), e(t=9)
```

### Exactly-Once Semantics: The Myth and Reality

Stream processing systems fail. Machines crash mid-computation. Networks drop packets. Kafka consumers crash after processing a message but before committing their offset. How do you ensure each event affects the output exactly once?

Three delivery semantics:

**At-most-once:** Events may be lost but never processed twice. Simplest implementation: commit offset before processing. If the processor crashes after committing but before processing, the event is lost.

**At-least-once:** Events are never lost but may be processed multiple times. Common implementation: process first, then commit offset. If the processor crashes after processing but before committing, the event is re-processed.

**Exactly-once:** Events are never lost and never processed twice. The hardest guarantee. Requires either:
1. **Idempotent producers + transactional consumers:** Kafka's Exactly Once Semantics (EOS) feature uses producer IDs and sequence numbers to deduplicate retried writes, and transactional reads/writes to atomically update consumer offsets and produce output.
2. **Two-phase commit between input and output systems:** Atomically commit "I read these messages and wrote these output records." Requires the output system to participate in the protocol.

The critical nuance: "exactly-once" in Kafka's EOS means each message's effect on Kafka topics is applied exactly once. If your processing also involves external systems (writing to a database, calling an API), those external effects may still happen multiple times during failure recovery. True end-to-end exactly-once requires every system in the pipeline to support idempotent or transactional writes.

## Deep Dive

The stream-table duality, which Kleppmann elevates to a foundational insight in DDIA, has a precise mathematical basis in the theory of change data capture and materialized views. A table at time T is the fold (reduce) of the stream of all changes up to T over an initially empty state. Conversely, any mutation-log-enabled database implicitly produces a stream — the WAL or binlog — that is the exact change stream needed to reconstruct any past state. This is not an analogy; it is an identity. Kafka Streams makes it executable: a KTable is a materialized aggregation of a KStream; a KStream can be derived from a KTable via a changelog. The duality means that stream processors and database query engines are solving the same problem with different latency profiles: both maintain state derived from an input log, one incrementally as events arrive, the other in batch at query time.

Watermarks — the mechanism for handling out-of-order events in event-time processing — were the central contribution of the Dataflow model paper (Akidau et al., 2015). The paper distinguished three dimensions that previous systems had conflated: the event time (when the event occurred), the processing time (when the system processed it), and the ingestion time (when the event entered the pipeline). Most streaming systems before Dataflow used processing time as a proxy for event time, which produces correct results only when the pipeline has no lag — exactly when correctness matters least. The Dataflow model's watermark is a heuristic estimate of the event-time progress: "I believe I have received all events with event time earlier than W." When the watermark passes a window's end, the window result is emitted. The heuristic is necessarily imperfect — some late events will arrive after the watermark — which is why the model defines explicit late-data policies: discard late events, accumulate them in a correction result, or restate the window result with each late arrival.

Exactly-once processing is one of the most misunderstood guarantees in distributed systems. Kafka's EOS (Exactly Once Semantics), introduced in version 0.11 (2017), achieves idempotent producer delivery (no duplicate messages from retries) and transactional writes (atomically write to multiple partitions and advance consumer offsets). This means within the Kafka pipeline, each message's effect on output topics is applied exactly once. But this does not compose automatically with external systems. If a Flink job reads from Kafka, processes messages, and writes to PostgreSQL, the PostgreSQL writes are governed by PostgreSQL's semantics, not Kafka's. If the Flink job checkpoints after processing but before the PostgreSQL write commits, and then crashes, the PostgreSQL write happens twice on recovery. True end-to-end exactly-once requires every sink to support either idempotent writes (writing the same record twice has the same effect as writing it once) or transactional writes that can be atomically committed alongside the checkpoint. Most practitioners achieve "effectively exactly-once" through idempotent sinks rather than true distributed transactions.

The window semantics problem reveals a philosophical tension in stream processing: when is a result "done"? In batch processing, a query over a bounded dataset has a definitive answer — you process all the data and emit the result. In stream processing over unbounded data, a window over the last hour of events is never definitively done, because an event with a timestamp one hour ago might arrive one hour and one second from now. The Dataflow model resolves this with a pragmatic three-trigger pattern: an early trigger fires a speculative result before the watermark (low latency, potentially incomplete), an on-time trigger fires the official result when the watermark passes the window end (correct for all timely events), and a late trigger fires a correction when late events arrive (complete, but after a delay). This is the "speculation vs correctness" trade-off made explicit: applications that need low latency use the early trigger and accept approximation; applications that need correctness use the late trigger and accept delay. The system supports both simultaneously on the same window.

Kafka's design as a distributed commit log — rather than a message queue — was the architectural insight that enabled the stream-table duality to be practically useful at scale. The key difference: a message queue discards messages after they are consumed; a log retains messages for a configurable period. Retention means consumer groups can independently replay the log from any offset, new consumers can be added and catch up from the beginning, and failed jobs can restart from their last committed checkpoint. The log is the single source of truth; consumer positions are just cursors into it. Jay Kreps's essay "The Log: What every software engineer should know about real-time data's unifying abstraction" (2013) articulated this: the log is the foundational primitive of distributed data systems, and the stream-table duality is one expression of that principle.

## Implementation Guide

**Basic Kafka consumer with exactly-once semantics:**

```python
from confluent_kafka import Consumer, Producer, KafkaError
import json

class ExactlyOnceProcessor:
    """
    Process Kafka messages with exactly-once semantics using transactions.
    Reads from input topic, processes, writes to output topic.
    Offsets are committed atomically with output writes.
    """
    def __init__(self, input_topic: str, output_topic: str,
                 consumer_group: str, bootstrap_servers: str):
        self.consumer = Consumer({
            'bootstrap.servers': bootstrap_servers,
            'group.id': consumer_group,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': False,    # Manual offset management
            'isolation.level': 'read_committed',  # Only read committed transactions
        })
        self.producer = Producer({
            'bootstrap.servers': bootstrap_servers,
            'transactional.id': f'{consumer_group}-{input_topic}',  # Unique per processor
            'enable.idempotence': True,
        })
        self.input_topic = input_topic
        self.output_topic = output_topic
        self.producer.init_transactions()

    def process(self, message: dict) -> dict:
        """Your business logic here. Must be deterministic."""
        return {'processed': True, 'original': message, 'count': message.get('value', 0) * 2}

    def run(self):
        self.consumer.subscribe([self.input_topic])
        while True:
            messages = self.consumer.consume(num_messages=100, timeout=1.0)
            if not messages:
                continue

            self.producer.begin_transaction()
            try:
                for msg in messages:
                    if msg.error():
                        continue
                    result = self.process(json.loads(msg.value()))
                    self.producer.produce(
                        self.output_topic,
                        value=json.dumps(result).encode()
                    )

                # Atomically commit offsets with the produced messages
                self.producer.send_offsets_to_transaction(
                    self.consumer.position(self.consumer.assignment()),
                    self.consumer.consumer_group_metadata()
                )
                self.producer.commit_transaction()

            except Exception as e:
                self.producer.abort_transaction()
                print(f"Transaction aborted: {e}")
```

**Tumbling window aggregation with event-time watermarks (using Flink-style pseudocode):**

```python
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import time

@dataclass
class WindowState:
    window_start: float
    window_end: float
    events: List = field(default_factory=list)
    finalized: bool = False

class EventTimeWindowAggregator:
    """
    Tumbling window aggregation using event time with watermarks.
    Watermark = max(event_time) - max_out_of_orderness
    """
    def __init__(self, window_size_seconds: float, max_out_of_orderness_seconds: float):
        self.window_size = window_size_seconds
        self.max_lateness = max_out_of_orderness_seconds
        self.windows: Dict[float, WindowState] = {}  # window_start -> state
        self.watermark: float = 0.0

    def _get_window_start(self, event_time: float) -> float:
        return (event_time // self.window_size) * self.window_size

    def process_event(self, event_time: float, value) -> List[dict]:
        """Returns list of finalized window results."""
        # Update watermark
        self.watermark = max(self.watermark, event_time - self.max_lateness)

        # Assign event to its window
        window_start = self._get_window_start(event_time)
        window_end = window_start + self.window_size

        if window_start not in self.windows:
            self.windows[window_start] = WindowState(window_start, window_end)

        window = self.windows[window_start]
        if not window.finalized:
            window.events.append({'time': event_time, 'value': value})
        else:
            print(f"Late event at {event_time} for already-finalized window [{window_start}, {window_end})")

        # Check if any windows can be finalized (watermark passed window end)
        results = []
        for ws, w in list(self.windows.items()):
            if not w.finalized and self.watermark >= w.window_end:
                w.finalized = True
                results.append({
                    'window_start': w.window_start,
                    'window_end': w.window_end,
                    'count': len(w.events),
                    'sum': sum(e['value'] for e in w.events),
                })
        return results
```

## When to Use / When NOT to Use

**Use stream processing when:**
- You need real-time or near-real-time results (fraud detection, alerting, live dashboards)
- Events need to trigger immediate actions (sending notifications, updating recommendations)
- Your data volume makes batch processing too slow to be useful
- You're building event-driven microservices that react to state changes

**Use batch processing instead when:**
- Your analytics queries are ad-hoc and don't have latency requirements
- You need complex joins or aggregations that don't fit in stream processing's state model
- Historical reprocessing is a primary use case
- Your data volume is manageable within a batch window

**Use event time (not processing time) when:**
- Events can arrive out of order (mobile apps, IoT sensors, distributed systems)
- Your windows must reflect when events actually occurred, not when they arrived
- You're building any system where data freshness or event timing matters

**Use processing time when:**
- Events arrive in order (guaranteed by your pipeline architecture)
- "Right now" is what matters, not "when the event happened"
- You're building real-time monitoring where processing-time windows are the correct semantic

## Common Mistakes

**Mistake 1: Ignoring late data.**
Setting a watermark and never handling late events means late events are silently dropped. Always instrument late event rates and decide explicitly: discard, emit a correction, or reprocess the window. Late event rates above 0.1% indicate a watermark setting that's too aggressive.

**Mistake 2: Using processing time for event-time semantics.**
A common shortcut: use the system clock as the event timestamp. This works fine until your consumers fall behind (during a deployment, a traffic spike, or a failure). Then your "event time" aggregations reflect when the backlog was processed, not when events occurred — making your analytics meaningless.

**Mistake 3: Assuming Kafka's at-least-once delivery means your consumers are at-least-once.**
Kafka provides at-least-once delivery from the broker to the consumer. But if your consumer processes a message and then crashes before committing the offset, that message will be re-delivered. If your processing has side effects (writing to a database, calling an API), those side effects will happen twice. Exactly-once requires either idempotent processing or transactional commits.

**Mistake 4: Building stateful stream processing without understanding state backend limits.**
Flink's state backend stores all aggregation state. For a window counting unique users over a 24-hour window, the state must hold every unique user seen in the last 24 hours — potentially billions of entries. Failing to bound state size causes out-of-memory errors that are hard to debug in production. Always size your state backend and use approximate data structures (HyperLogLog for cardinality, Count-Min Sketch for frequency) when exact counts aren't required.

**Mistake 5: Not testing with out-of-order events.**
Stream processing code that passes all tests with in-order events often fails with out-of-order events. Include out-of-order event scenarios in your test suite, with configurable ordering delays. Test with events that arrive after the watermark has passed their window — ensure your late-data handling is correct.

## Connections

- **Batch Processing (07-batch-processing.md):** Stream processing and batch processing are complementary. Lambda architecture uses both; Kappa architecture replaces batch with stream reprocessing. Understanding both helps you choose the right model.
- **Change Data Capture (08-change-data-capture.md):** CDC turns database changes into a stream. Most stream processing pipelines are fed by CDC streams from operational databases.
- **Partitioning (02-partitioning.md):** Kafka's topic partitioning uses the same concepts as database partitioning. Partition keys determine ordering guarantees within a stream.
- **Consistency Models (03-consistency-models.md):** Exactly-once processing is a form of consistency guarantee. Stream processing's consistency model is more complex than database consistency because it spans multiple systems.

## Key Insights

The deepest insight in stream processing is the **stream-table duality**: every table is the accumulated result of a stream of changes, and every stream is the changelog of a table. This duality means that stream processing and database query processing are not fundamentally different — they are different views of the same underlying computation. Kafka Streams and Flink's Table API make this duality explicit and programmable.

The second insight is that **event time is ground truth; processing time is an approximation**. A processing-time window for "sales in the last hour" is really "sales processed in the last hour." These are the same when your pipeline is healthy. They diverge when your pipeline has lag — which is exactly when you most need correct numbers (during a traffic spike or incident). Always prefer event time for any aggregation that represents real-world occurrences.

The third insight is that **exactly-once is a spectrum, not a binary**. Kafka's EOS provides exactly-once within the Kafka pipeline. End-to-end exactly-once — from the originating system through all processing stages to all output systems — requires every link in the chain to support it. In practice, "at-least-once with idempotent writes" is often the pragmatic exactly-once, because idempotent writes are much easier to achieve than true distributed transactions.

Finally, understand that **stream processing's statefulness is its power and its operational burden**. The ability to maintain running aggregations, session state, and join results in memory is what makes stream processing fast. But that state must survive failures, be checkpointed durably, be resharded when the cluster scales, and be migrated when you upgrade your processing logic. Treat stream processing state like database state — it's production data that must be managed, backed up, and evolved carefully.
