# The Myth of Exactly-Once Delivery

> "Exactly-once delivery is impossible. Exactly-once processing is achievable. Most engineers confuse the two, and that confusion is the source of a remarkable number of production bugs." — a distributed systems practitioner who has debugged one too many duplicate-charge incidents

## The Problem

You have a payment processing service. When a user clicks "Pay Now," your order service publishes a `PaymentRequested` event to Kafka. Your payment service consumes this event and charges the customer's card. Simple enough.

But the network is unreliable. After your payment service processes the message and charges the card, it crashes before committing the offset back to Kafka. Kafka, seeing no commit, re-delivers the message. Your payment service comes back online, receives the same `PaymentRequested` event again, and charges the card again. The customer is double-charged.

You add a fix: commit the offset *before* charging the card. Problem solved, right? Wrong. Now if the service crashes after committing the offset but before charging the card, the message is never processed. The customer never gets charged but thinks they did.

You are looking at the fundamental trade-off in distributed messaging: you can guarantee **at-most-once delivery** (fire and forget — may lose messages), or **at-least-once delivery** (retry until acknowledged — may duplicate messages). You cannot guarantee true **exactly-once delivery** — not in a distributed system, not across a network that can fail.

This is not a solvable engineering problem. It is a provable impossibility result, related to the Two Generals Problem. However, you can achieve **effectively-once processing** — idempotent consumers that produce the same result whether a message is delivered once or many times. Understanding the difference, and knowing how to implement effectively-once semantics, is essential for building reliable event-driven systems.

## Core Concept

### At-Most-Once Delivery

Send the message and forget. No retry. If the message is lost, it is lost.

```
Producer                    Broker                    Consumer
   │                           │                          │
   │── publish(msg) ──────────►│                          │
   │◄─ ack ────────────────────│                          │
   │                           │── deliver(msg) ─────────►│
   │                           │                          │── process
   │                           │                   crash! │
   │                           │   (no ack received)      │
   │                           │                          │
   │                           │  [msg is dropped]        │
   │                           │  consumer was            │
   │                           │  restarted but           │
   │                           │  message is gone         │
```

**Use cases**: Metrics collection, log aggregation, real-time analytics where a few lost data points are acceptable. Never for financial transactions or any operation that must complete exactly once.

**Implementation**: Fire-and-forget with no retry. In Kafka, setting `acks=0` on the producer. In HTTP, not retrying on network error.

### At-Least-Once Delivery

Retry until the broker acknowledges. Messages may be delivered multiple times if acknowledgment is lost.

```
Producer                    Broker                    Consumer
   │                           │                          │
   │── publish(msg) ──────────►│                          │
   │                           │── deliver(msg) ─────────►│
   │                           │                          │── process ✓
   │   (ack lost)              │◄─ ack ───────────────────│
   │                           │                     crash│
   │ (timeout, retry)          │                          │
   │── publish(msg) ──────────►│                          │
   │◄─ ack ────────────────────│                          │
   │                           │── deliver(msg) ─────────►│ ← DUPLICATE
   │                           │◄─ ack ───────────────────│
   │                           │                          │── process ← DUPLICATE
```

**Use cases**: Most messaging systems default to at-least-once. It is safe when combined with idempotent consumers (see below).

**Implementation**: Kafka with `acks=all` on producer, consumer commit offset *after* processing (not before).

### Why True Exactly-Once Is Impossible

The Two Generals Problem (Article 05) demonstrates that two parties communicating over an unreliable channel cannot coordinate atomically. Applied to messaging:

```
Scenario: exactly-once delivery requires atomically:
  1. Delivering the message to the consumer
  2. Removing the message from the broker's queue
  
  These two operations cannot be atomic across a network boundary.
  
  If we "deliver first, then remove":
    → Consumer may crash after receiving but broker retains message
    → Re-delivery on recovery → at-least-once (potential duplicates)
  
  If we "remove first, then deliver":
    → Message removed from broker before consumer receives it
    → Consumer crash → message lost → at-most-once (potential loss)
  
  If we "deliver and remove atomically":
    → Requires distributed transaction between broker and consumer
    → Distributed transactions have the same problem (coordinator failure)
    → 2PC doesn't solve this — it just moves the problem
```

The fundamental issue: acknowledging receipt and processing the message are two separate operations, and the acknowledgment can always be lost. If the acknowledgment is lost, the broker re-delivers. If you process before acknowledging, you may process twice. If you acknowledge before processing, you may lose the message.

### Effectively-Once via Idempotent Consumers

The practical solution: accept that messages may be delivered multiple times, but design your consumers so that processing a message multiple times produces the same result as processing it once.

An operation is **idempotent** if applying it multiple times has the same effect as applying it once: `f(f(x)) = f(x)`.

```
Non-idempotent operation:
  SQL: INSERT INTO charges (amount) VALUES (49.99)
  → First delivery: creates row, charge_id=1001
  → Second delivery: creates row, charge_id=1002 ← DUPLICATE CHARGE

Idempotent operation:
  SQL: INSERT INTO charges (idempotency_key, amount) VALUES ('event-123', 49.99)
       ON CONFLICT (idempotency_key) DO NOTHING
  → First delivery: creates row, charge_id=1001
  → Second delivery: duplicate key → no-op ✓
```

The idempotency key must uniquely identify the message. In Kafka, this is typically the combination of topic + partition + offset — a globally unique identifier for that specific message delivery.

```python
class PaymentConsumer:
    def process_message(self, message: KafkaMessage):
        # Idempotency key = unique identifier for this specific message
        idempotency_key = f"{message.topic}:{message.partition}:{message.offset}"
        
        with db.transaction():
            # Check if already processed
            if db.query("SELECT 1 FROM processed_messages WHERE key = %s", 
                       idempotency_key):
                logger.info(f"Message {idempotency_key} already processed, skipping")
                return  # Idempotent: skip duplicate
            
            # Process the payment
            charge_result = payment_gateway.charge(
                amount=message.value["amount"],
                card_token=message.value["card_token"],
                idempotency_key=idempotency_key  # Pass to payment gateway too!
            )
            
            # Record the charge
            db.execute("INSERT INTO charges (id, amount) VALUES (%s, %s)",
                      charge_result.id, message.value["amount"])
            
            # Mark message as processed (in same transaction!)
            db.execute("INSERT INTO processed_messages (key, processed_at) VALUES (%s, NOW())",
                      idempotency_key)
        
        # Commit offset AFTER the transaction succeeds
        consumer.commit()
```

The key insight: the `processed_messages` check and the business operation happen in the **same database transaction**. If the transaction rolls back, neither the business operation nor the processed_messages record are written. If the transaction commits, both are written. There is no window where one succeeds and the other does not.

### Kafka's "Exactly-Once" Semantics

Kafka 0.11 (2017) introduced what it calls "exactly-once semantics" (EOS). This is often misunderstood — Kafka does not provide exactly-once delivery in the theoretical sense. It provides:

1. **Idempotent producers**: Kafka brokers deduplicate messages from the same producer instance within a single session. If a producer retries due to a network error, the broker detects the duplicate and discards it.

2. **Transactional producers**: Producers can group multiple messages across multiple partitions into a single atomic transaction. Either all messages in the transaction are committed to all partitions, or none are.

3. **Read-committed consumers**: Consumers can be configured to only see messages from committed transactions — they will not see messages from in-progress or aborted transactions.

```
Kafka EOS for stream processing (Kafka Streams):

Input Topic     Kafka Streams App     Output Topic
    │                   │                  │
    │── msg A ─────────►│                  │
    │                   │── begin txn      │
    │                   │── process A      │
    │                   │── write result ─►│
    │                   │── commit offsets │
    │                   │── commit txn ───►│ (atomic: result + offset commit)
    │                   │                  │
    │── msg A ─────────►│ (duplicate due to crash)
    │                   │── begin txn      │
    │                   │── detect: offset already committed
    │                   │── abort txn      │
    │                   │                  │ (output topic: no duplicate)
```

Kafka EOS works within the Kafka ecosystem — input offsets and output messages committed atomically. It does **not** extend to external systems (databases, payment APIs). If your stream processing app writes to PostgreSQL, the Kafka-PostgreSQL write is not atomic, and you still need idempotent consumer logic on the PostgreSQL side.

### Deduplication Patterns

Beyond idempotency keys, several patterns support deduplication:

**Message-level deduplication**: The message broker deduplicates. AWS SQS with deduplication IDs: messages with the same deduplication ID within a 5-minute window are discarded. RabbitMQ can deduplicate via message IDs with the rabbitmq-message-deduplication plugin.

**Bloom filter deduplication**: For high-throughput consumers that process millions of messages, storing every processed message ID in a database is expensive. A Bloom filter provides probabilistic deduplication: it says "definitely not seen" or "probably seen" (with a tunable false positive rate). False positives cause rare legitimate messages to be skipped — acceptable in some use cases.

```python
from pybloom_live import ScalableBloomFilter

class BloomFilterDeduplicator:
    def __init__(self, error_rate=0.001):
        # 0.1% false positive rate
        self.seen = ScalableBloomFilter(error_rate=error_rate)
    
    def is_duplicate(self, message_id: str) -> bool:
        if message_id in self.seen:
            return True  # Probably seen (0.1% false positive rate)
        self.seen.add(message_id)
        return False
```

**Time-windowed deduplication**: For messages that can only be duplicates within a time window (e.g., a retry window of 5 minutes), store IDs with TTL in Redis:

```python
def deduplicate_redis(message_id: str, window_seconds: int = 300) -> bool:
    """Returns True if this message is a duplicate within the window."""
    key = f"dedup:{message_id}"
    # SET NX (only set if not exists) with TTL
    result = redis.set(key, "1", nx=True, ex=window_seconds)
    return result is None  # None means key already existed = duplicate
```

## Deep Dive

### Why True Exactly-Once Is Impossible Without End-to-End Design

"Exactly-once delivery" is commonly listed as a feature of messaging systems, but this framing obscures the real guarantee. A message broker can guarantee that a message is stored exactly once in its log. It cannot guarantee that the consumer processes the message exactly once — because "processing" means executing side effects (writing to a database, calling an API, sending an email), and those side effects are outside the broker's control.

The correct framing is exactly-once *semantics*, not exactly-once delivery. Exactly-once semantics means that the net effect of processing is as if each message were processed exactly once, even if the message is delivered and processed multiple times due to retries. This requires two things: at-least-once delivery from the broker, plus idempotent processing in the consumer. The idempotence requirement cannot be delegated to the messaging layer — it is an intrinsic property of the operation being performed.

The implication is that exactly-once semantics is always a system-level property, never a point-to-point guarantee. The Kafka documentation is unusually precise about this: "exactly-once semantics" in Kafka means that producer writes and consumer offset commits can be made atomic within Kafka's transaction log, eliminating duplicates within the Kafka-to-Kafka processing path. The moment a consumer writes to an external database, exactly-once semantics requires that the database write be idempotent. Kafka cannot provide that property; only the application design can.

### Kafka's Transactional API: How EOS Is Implemented

Kafka's exactly-once semantics (introduced in Kafka 0.11, 2017) solves the specific problem of stream processing: reading from input topics, transforming records, and writing to output topics, with at-most-once and at-least-once replaced by exactly-once within the Kafka cluster.

The implementation combines two mechanisms. Producer idempotence assigns each producer a persistent ID (PID) and a monotonically increasing sequence number per partition. The broker deduplicates writes by tracking the last sequence number received from each PID. Duplicate sends (from producer retries) are silently dropped. This guarantees at-most-once writes per send call.

Kafka transactions extend this by allowing a producer to atomically write to multiple partitions and commit consumer offsets in a single transaction. The transaction coordinator maintains a two-phase commit log: the producer writes all records across partitions, then commits or aborts the transaction. Consumers configured with `isolation.level=read_committed` see only committed records, never in-flight or aborted records. This is the broker-level mechanism that Kafka Streams' EOS mode builds on.

The limitation is explicit in the Kafka documentation: if a consumer reads a committed Kafka record and writes to an external database, the Kafka-to-database path has no EOS guarantee. A consumer crash after the database write but before the offset commit causes the record to be re-processed on restart. The only solutions are idempotent writes (the database operation is safe to repeat), or storing the offset in the same database as the output in a single transaction (the transactional outbox pattern extended across the database-broker boundary).

## Implementation Guide

### Complete Idempotent Consumer Pattern

```go
package consumer

import (
    "context"
    "database/sql"
    "fmt"
    
    "github.com/segmentio/kafka-go"
)

type PaymentConsumer struct {
    reader *kafka.Reader
    db     *sql.DB
}

func (c *PaymentConsumer) Run(ctx context.Context) error {
    for {
        msg, err := c.reader.FetchMessage(ctx)
        if err != nil {
            return fmt.Errorf("fetch: %w", err)
        }
        
        if err := c.processWithIdempotency(ctx, msg); err != nil {
            // Don't commit on error — message will be redelivered
            // Log the error and potentially send to dead letter queue
            // after N retries
            c.handleProcessingError(ctx, msg, err)
            continue
        }
        
        // Commit AFTER successful processing
        if err := c.reader.CommitMessages(ctx, msg); err != nil {
            // Commit failed — message will be redelivered
            // processWithIdempotency will handle the duplicate
            continue
        }
    }
}

func (c *PaymentConsumer) processWithIdempotency(
    ctx context.Context, 
    msg kafka.Message,
) error {
    // Globally unique key for this message
    msgKey := fmt.Sprintf("%s:%d:%d", msg.Topic, msg.Partition, msg.Offset)
    
    tx, err := c.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()  // No-op if committed
    
    // Check for duplicate (within the same transaction)
    var exists bool
    err = tx.QueryRowContext(ctx,
        "SELECT EXISTS(SELECT 1 FROM processed_messages WHERE msg_key = $1)",
        msgKey,
    ).Scan(&exists)
    if err != nil {
        return err
    }
    if exists {
        // Already processed — idempotent skip
        return tx.Commit()
    }
    
    // Parse and validate the message
    var payment PaymentRequest
    if err := json.Unmarshal(msg.Value, &payment); err != nil {
        // Bad message — send to dead letter queue, mark as processed
        c.sendToDLQ(ctx, msg, err)
        tx.QueryRowContext(ctx,
            "INSERT INTO processed_messages (msg_key, status) VALUES ($1, 'dlq')",
            msgKey,
        )
        return tx.Commit()
    }
    
    // Process the payment (idempotent: passes msgKey as external idempotency key)
    result, err := c.chargeCard(ctx, payment, msgKey)
    if err != nil {
        return err // Retry: don't mark as processed
    }
    
    // Write business result
    _, err = tx.ExecContext(ctx,
        "INSERT INTO charges (id, amount, status, order_id) VALUES ($1, $2, $3, $4)",
        result.ChargeID, payment.Amount, "succeeded", payment.OrderID,
    )
    if err != nil {
        return err
    }
    
    // Mark message as processed (in same transaction)
    _, err = tx.ExecContext(ctx,
        "INSERT INTO processed_messages (msg_key, status, created_at) VALUES ($1, 'ok', NOW())",
        msgKey,
    )
    if err != nil {
        return err
    }
    
    return tx.Commit()
    // If commit succeeds: payment charged, message marked processed
    // If commit fails: nothing persisted, message redelivered, retry is safe
}
```

### Dead Letter Queue for Unprocessable Messages

Not all failures are transient. A malformed message, a business rule violation, or a message for a non-existent resource will fail every retry. Without a dead letter queue (DLQ), these messages block the consumer indefinitely.

```python
class ResilientConsumer:
    MAX_RETRIES = 5
    
    def process_with_dlq(self, message):
        retry_count = int(message.headers.get("retry-count", 0))
        
        try:
            self.process(message)
            self.consumer.commit()
        except TransientError as e:
            # Retry: re-publish with incremented retry count
            if retry_count < self.MAX_RETRIES:
                self.retry_topic.publish(
                    message.value,
                    headers={"retry-count": str(retry_count + 1)},
                    delay_seconds=2 ** retry_count  # Exponential backoff
                )
            else:
                # Max retries exceeded: send to DLQ
                self.dlq.publish(
                    message.value,
                    headers={
                        "original-topic": message.topic,
                        "original-partition": str(message.partition),
                        "original-offset": str(message.offset),
                        "error": str(e),
                        "retry-count": str(retry_count),
                    }
                )
            self.consumer.commit()  # Commit to avoid reprocessing
        except PermanentError as e:
            # Non-retryable: send directly to DLQ
            self.dlq.publish(message.value, headers={"error": str(e)})
            self.consumer.commit()
```

## When to Use / When NOT to Use

**At-most-once** (fire and forget): metrics, analytics, logging. Any case where loss of individual messages is acceptable and low latency matters more than completeness.

**At-least-once with idempotent consumers**: the default choice for most event-driven systems. Use when you need reliable processing and can make your consumer idempotent. This covers most business logic: orders, payments, notifications, state updates.

**Kafka EOS (exactly-once within Kafka)**: stream-to-stream processing within Kafka Streams or Flink. When your entire processing pipeline lives within Kafka and you need to avoid duplicate writes to output topics. Does not help when writing to external systems.

**Transactional outbox + idempotent consumers**: the gold standard for event-driven sagas. Database write and event publish are atomic. Consumer processes idempotently. Provides effectively-once end-to-end.

**Do NOT chase true exactly-once**: it is impossible in the general case. Any system claiming true exactly-once delivery for external side effects (API calls, database writes to non-transactional stores) is either using idempotency under the hood or it is wrong.

## Common Mistakes

**Mistake 1: Committing offset before processing**
Commits the offset immediately after receiving the message, before any work is done. If the service crashes during processing, the message is lost. Always commit after successful processing.

**Mistake 2: Committing offset after processing but outside a transaction**
Processing completes, database is updated, then offset commit fails due to a network issue. Message is redelivered. Database write is duplicated. The only safe pattern: use idempotent writes with deduplication keys even when you commit after processing — because the commit itself can fail.

**Mistake 3: Using non-idempotent external APIs**
Calling a third-party API that does not support idempotency keys. If the call succeeds but the response is lost (network issue), retrying creates duplicates. Always use APIs with idempotency key support for critical operations, or implement your own deduplication wrapper.

**Mistake 4: Idempotency key collision**
Using a non-unique idempotency key (e.g., a sequential counter that wraps around, or a timestamp that two messages share). Idempotency key collisions cause legitimate messages to be silently dropped. Use UUIDs or event offset-based keys.

**Mistake 5: Not handling DLQ messages**
Messages end up in the DLQ and are never processed. DLQ is not a garbage bin — it is a queue of messages that need human attention. Set up alerts when DLQ depth increases, review DLQ messages regularly, and provide tooling to replay them after the root cause is fixed.

## Connections

- **Two-Phase Commit** (Article 05): 2PC attempts to provide exactly-once by atomically committing across multiple systems. It partially solves the problem but has its own failure modes. Idempotent consumers are the alternative to 2PC for event-driven architectures.
- **Distributed Transactions** (Article 08): The Outbox pattern is the bridge between exactly-once semantics and distributed transactions. It provides reliable event publishing (at-least-once) that, combined with idempotent consumers, achieves effectively-once.
- **Gossip Protocols** (Article 06): Gossip provides at-most-once semantics — it does not guarantee every node receives every message. Anti-entropy (Merkle tree comparison) compensates for lost gossip messages, but this is best-effort convergence, not exactly-once.
- **CRDTs** (Article 04): CRDTs are inherently idempotent — applying the same operation multiple times converges to the same result. Using CRDTs as your message processing targets gives you at-most-once safety for free, because duplicate messages produce the same result.

## Key Insights

**Insight 1: The distinction between delivery and processing is everything.** Exactly-once *delivery* is impossible. Exactly-once *processing* is achievable via idempotency. Almost every discussion of "exactly-once" in the context of message queues is actually about exactly-once processing, not delivery. Being precise about this distinction saves enormous confusion.

**Insight 2: Idempotency is a property of the consumer, not the broker.** No matter what your message broker promises (SQS FIFO deduplication, Kafka EOS), once you cross the boundary into your application code and external side effects, you are responsible for idempotency. Do not rely on the broker to protect your database writes or API calls.

**Insight 3: The transactional inbox is the dual of the outbox.** The outbox pattern ensures a database write and an event publish are atomic. The inbox pattern (also called "transactional inbox") ensures that receiving an event and processing it are atomic — by writing the incoming event to an inbox table in the same transaction as the business operation. Together, outbox + inbox provide end-to-end effectively-once semantics.

**Insight 4: Idempotency keys should be business-meaningful when possible.** Using `topic:partition:offset` as an idempotency key works technically, but it is opaque. Using `order-{order_id}-payment-attempt-{attempt_number}` as the key is debuggable — you can look up a payment by order ID and understand which attempts succeeded and which were deduplicated.

**Insight 5: The impossibility result is not discouraging — it is clarifying.** Understanding that exactly-once delivery is impossible shifts your thinking from "how do I make the infrastructure reliable enough?" to "how do I design my application to be correct under unreliable infrastructure?" The latter is always the right question. Idempotency is not a workaround for a flawed infrastructure — it is the correct mental model for distributed systems.
