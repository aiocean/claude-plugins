# Competing Consumers Pattern

> "The competing consumers pattern enables multiple concurrent consumers to process messages received on the same messaging channel." — Microsoft Azure Architecture Center

## The Problem

Your email notification service processes messages from a queue. Orders are being placed, and each order triggers a notification: order confirmation, shipping update, delivery confirmation. On normal days, the queue has a few hundred messages and your single consumer processes them comfortably in real time. Then your marketing team runs a flash sale. Fifty thousand orders in an hour. Your single consumer processes 500 messages per minute — nowhere near enough. The queue depth climbs to 40,000. Customers who placed orders two hours ago still haven't received their confirmation email. Some cancel their orders, thinking the purchase failed.

The single-consumer model is a bottleneck by design. One process, one connection, one message at a time (or a small batch). When throughput requirements exceed what one consumer can provide, you must scale. The question is how.

You could scale vertically — give the consumer more CPU and memory. This works, but has a ceiling and a single point of failure. The consumer process dies, and processing stops entirely. Vertical scaling also cannot respond dynamically to load: you scale up for peak load and overprovision during normal load.

Competing Consumers is the horizontal scaling answer. Run multiple instances of the consumer, all reading from the same queue. Each instance grabs a message, processes it independently, and moves on. Scaling is as simple as adding more consumer instances. When load drops, remove instances. When one instance fails, the others continue. The queue coordinates work distribution; the consumers compete for messages.

## Core Concept

In the Competing Consumers pattern, multiple consumer instances read from a single message queue. The queue acts as a work distributor. When a consumer is ready for work, it pulls the next available message. Multiple consumers run simultaneously, processing different messages in parallel.

```
┌──────────────┐
│              │───Message 1──▶ Consumer Instance 1
│    Queue     │───Message 2──▶ Consumer Instance 2
│              │───Message 3──▶ Consumer Instance 3
│  [MSG][MSG]  │
│  [MSG][MSG]  │  Consumer Instance 4 (processing, not fetching)
│  [MSG][MSG]  │
└──────────────┘

Scale up: add Consumer Instance 5, 6, 7...
Scale down: remove instances when queue depth drops
```

The pattern is simple. Its implementation details are where the complexity lives: message visibility, ordering guarantees, duplicate handling, poison message management, and backpressure.

### Message visibility timeout (SQS model)

When Consumer 1 fetches a message from SQS, the message becomes invisible to other consumers for the duration of the visibility timeout (e.g., 30 seconds). If Consumer 1 processes and deletes the message within 30 seconds, it's gone. If Consumer 1 crashes or takes longer than 30 seconds, the message reappears in the queue and another consumer picks it up. This ensures at-least-once delivery without a central coordinator tracking which messages are being processed.

```
Consumer 1 fetches message:
  Queue: [MSG_B][MSG_C][MSG_D]  (MSG_A invisible for 30s)
  Consumer 1: processing MSG_A

Consumer 1 crashes before deleting:
  After 30s: [MSG_A][MSG_B][MSG_C][MSG_D]  (MSG_A reappears)
  Consumer 2 fetches MSG_A and reprocesses it
```

### Kafka consumer groups

Kafka's model is different. Partitions are the unit of parallelism. Each partition is consumed by exactly one consumer within a consumer group. To process with N parallel consumers, you need at least N partitions. Kafka guarantees ordering within a partition; messages on different partitions are processed in parallel with no ordering guarantee between them.

```
Topic: order-events (4 partitions)
Consumer Group: email-notification-service (3 consumers)

Partition 0 ──▶ Consumer A
Partition 1 ──▶ Consumer B
Partition 2 ──▶ Consumer C
Partition 3 ──▶ Consumer A  (A gets 2 partitions; 4 partitions, 3 consumers)
```

Adding a 4th consumer triggers a rebalance: each consumer gets exactly one partition. Adding a 5th consumer means one consumer is idle (no partition to claim).

## Deep Dive

**The pattern in Enterprise Integration Patterns.** Gregor Hohpe and Bobby Woolf's *Enterprise Integration Patterns* describes the Competing Consumers pattern as the standard solution for scaling message processing horizontally. Their canonical form: a message channel (queue) holds pending work; multiple consumer instances pull from the channel concurrently; each message is delivered to exactly one consumer. The pattern's elegance is in what it does not require — no central coordinator, no work assignment logic, no consumer registry. The queue itself provides the coordination: a consumer that pulls a message owns it for the duration of the visibility timeout. Other consumers are unaware of it. This is coordination by exclusion rather than coordination by assignment, and it scales without a coordinator bottleneck.

**Idempotency as a mandatory design constraint.** Hohpe and Woolf are explicit: competing consumers work only when message processing is idempotent. With at-least-once delivery (the delivery guarantee of virtually all message brokers), a message may be delivered more than once — when a consumer crashes after processing but before acknowledging, when a visibility timeout expires before acknowledgment, or during broker failover. Martin Kleppmann's *Designing Data-Intensive Applications* formalizes this: at-least-once delivery is the only guarantee that is safe to provide in a distributed system without expensive coordination. Exactly-once delivery requires distributed transactions or idempotency keys with deduplication at the consumer. Kleppmann's treatment of end-to-end idempotency shows that even with "exactly-once" broker semantics, the consumer must still be idempotent end-to-end, because the consumer itself may fail after processing and before committing its own state changes. The competing consumers pattern surfaces this requirement unavoidably — build it in from the start.

**Consumer group semantics and partition assignment.** Kleppmann's analysis of log-based message brokers in *DDIA* — specifically the Apache Kafka consumer group model — reveals an important constraint that is specific to partition-based systems. In a queue model (classic competing consumers), any consumer can take any message. In a partition-based log model, each partition is assigned to exactly one consumer in a group at a time. This provides ordering within a partition at the cost of flexibility: adding consumers beyond the number of partitions yields no additional parallelism — the extra consumers sit idle. Kleppmann's treatment shows that this is a deliberate design choice: partition assignment enables per-key ordering (all messages for customer X go to the same consumer) while still providing parallel processing across different keys. This is a more constrained form of competing consumers, and it requires partition count to be set with anticipated scale in mind — changing partition count after data is in flight is operationally disruptive.

**Consumer pool sizing and the queue depth signal.** *Enterprise Integration Patterns* addresses the dynamic scaling question: how many consumers are appropriate? The answer is a function of queue depth (backlog) and per-message processing time. The Google SRE Book's treatment of capacity planning provides the quantitative framework: at steady state, consumer count should match throughput divided by per-message processing rate. During backlog drain, consumer count must exceed steady-state throughput to drain faster than messages arrive. This implies a two-phase scaling policy: scale out aggressively when queue depth exceeds a threshold (backlog exists), scale in slowly when queue depth returns to near-zero (avoid thrashing). Queue depth is the correct signal for scaling competing consumers — not CPU, not memory, not request rate, but the direct measure of unprocessed work.

**Poison message handling and the dead letter queue.** Hohpe and Woolf devote significant attention to poison messages — messages that cause consumer crashes on every processing attempt. Without explicit handling, a poison message cycles: consumer picks it up, crashes, message becomes visible again, next consumer picks it up, crashes. This can take down an entire consumer pool. The standard defense is a delivery count threshold: after N failed deliveries (typically 3-5), move the message to a dead letter queue for manual inspection. *Release It!* by Michael Nygard frames this more broadly as the need for a circuit breaker within the consumer itself: if a consumer observes N consecutive failures, it should pause and alert rather than continue consuming messages that may all be problematic. The two mechanisms are complementary — per-message delivery counting handles individual bad messages; consumer-level circuit breaking handles systemic issues where the consumer itself or a downstream dependency is failing.

**Ordering and consumer affinity as competing concerns.** Sam Newman's *Building Microservices* observes that competing consumers and message ordering are in fundamental tension. Competing consumers process messages in parallel with no coordination between consumers. If two messages for the same entity (same order ID, same user ID) are in the queue simultaneously and are picked up by different consumers, they may be processed out of order — the second arrives at the consumer before the first, or the first takes longer to process. Newman's guidance: if ordering matters for a key, use a partition-based system with partition-by-key, or design the consumer logic to be order-independent (idempotent and commutative). Attempting to enforce ordering across competing consumers with application-level locking creates the same serialization bottleneck that the pattern was designed to eliminate. The pattern is not appropriate when processing order is a hard requirement for the same key without a partition-based system.

## Implementation Guide

### Step 1: Design for idempotency (non-negotiable)

With at-least-once delivery, the same message may be processed by multiple consumers. Design processors to be safe to run multiple times:

```typescript
async function processOrderNotification(message: OrderNotificationMessage): Promise<void> {
  const { orderId, customerId, notificationType } = message;
  
  // Idempotency check: has this notification already been sent?
  const existing = await db.query(
    `SELECT id FROM sent_notifications 
     WHERE order_id = $1 AND notification_type = $2`,
    [orderId, notificationType],
  );
  
  if (existing.rows.length > 0) {
    logger.info('Notification already sent, skipping', { orderId, notificationType });
    return; // safe to acknowledge — already done
  }
  
  // Send notification
  await emailService.send({
    to: await customerService.getEmail(customerId),
    template: notificationType,
    variables: { orderId },
  });
  
  // Record that we sent it
  await db.query(
    `INSERT INTO sent_notifications (order_id, notification_type, sent_at)
     VALUES ($1, $2, NOW())`,
    [orderId, notificationType],
  );
}
```

The idempotency check and the send should ideally be in a transaction — or the idempotency key should be written before the send and the send should be safe to retry if the key exists.

### Step 2: Configure visibility timeout correctly

The visibility timeout must be longer than your maximum processing time. If processing takes 45 seconds and visibility timeout is 30 seconds, messages will be reprocessed while still being processed:

```typescript
// SQS consumer: extend visibility timeout while processing
class SQSConsumer {
  async processWithHeartbeat(message: SQSMessage, handler: MessageHandler): Promise<void> {
    const visibilityExtender = setInterval(async () => {
      try {
        await sqs.changeMessageVisibility({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle!,
          VisibilityTimeout: 30, // reset to 30 more seconds
        });
      } catch (error) {
        logger.warn('Failed to extend visibility', { error });
      }
    }, 20_000); // extend every 20 seconds

    try {
      await handler(message);
      
      // Delete message on success
      await sqs.deleteMessage({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle!,
      });
    } finally {
      clearInterval(visibilityExtender);
    }
  }
}
```

### Step 3: Handle ordering requirements

If messages must be processed in order (e.g., customer events must be processed in the order they occurred), competing consumers require a partitioning strategy:

**SQS FIFO with message group IDs**: Messages in the same group are processed in order, by a single consumer at a time. Different groups are processed in parallel.

```typescript
await sqs.sendMessage({
  QueueUrl: fifoQueueUrl,
  MessageBody: JSON.stringify(event),
  MessageGroupId: customerId, // same customer = same group = ordered
  MessageDeduplicationId: eventId, // deduplication within 5 minutes
});
```

**Kafka**: Use the partition key to route messages for the same entity to the same partition. Within a partition, messages are strictly ordered.

```typescript
await producer.send({
  topic: 'customer-events',
  messages: [{
    key: customerId,  // same customer → same partition → ordered
    value: JSON.stringify(event),
  }],
});
```

### Step 4: Handle poison messages

A message that consistently causes consumer failures (malformed data, unsupported format, triggers a bug) is a "poison message." Without protection, it cycles through consumers indefinitely, blocking processing and potentially crashing consumer instances.

```typescript
// SQS: configure dead-letter queue with maxReceiveCount
// After 3 failures, move to DLQ automatically

// Kafka: manual poison message handling
async function handleMessage(message: KafkaMessage): Promise<void> {
  try {
    await processMessage(message);
  } catch (error) {
    if (isPermanentError(error)) {
      // Don't retry — move to error topic
      await producer.send({
        topic: 'order-events-errors',
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            'error': error.message,
            'original-offset': message.offset,
            'failed-at': new Date().toISOString(),
          },
        }],
      });
      // Commit offset to move past the poison message
      return;
    }
    throw error; // transient error — let retry handle it
  }
}

function isPermanentError(error: Error): boolean {
  return error instanceof ValidationError
    || error instanceof DeserializationError
    || error instanceof SchemaError;
}
```

### Step 5: Right-size consumer concurrency

Each consumer instance typically processes messages sequentially. For I/O-bound processing, you can process multiple messages concurrently within a single consumer instance:

```typescript
class ConcurrentSQSConsumer {
  constructor(
    private readonly concurrency: number = 10, // process 10 messages simultaneously
  ) {}

  async start(): Promise<void> {
    while (true) {
      const messages = await sqs.receiveMessage({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.concurrency, // fetch up to 10 at once
        WaitTimeSeconds: 20, // long polling
      });

      if (messages.Messages?.length) {
        // Process all fetched messages concurrently
        await Promise.allSettled(
          messages.Messages.map(msg => this.processWithHeartbeat(msg, this.handler)),
        );
      }
    }
  }
}
```

### Step 6: Monitor consumer health

Key metrics for competing consumers:

```
Queue depth (ApproximateNumberOfMessagesVisible): primary scaling signal
Message age (ApproximateAgeOfOldestMessage): consumer lag indicator  
Consumer processing rate: throughput per consumer instance
Error rate / DLQ depth: processing failures
Consumer count: number of active consumers
```

Alert when:
- Queue depth > N messages (N based on acceptable processing latency)
- Oldest message age > acceptable processing delay
- DLQ depth > 0 (poison messages or persistent failures)
- Consumer count drops to 0 (no consumers running)

## When to Use

**Any background processing workload with variable throughput.** Email sending, report generation, image processing, data transformation — if the work is discretely packaged and can be parallelized, competing consumers scale it horizontally.

**Decoupling producer throughput from consumer throughput.** Producers can burst (flash sale → 50,000 orders in an hour) while consumers scale up gradually. The queue absorbs the burst; consumers drain it as capacity allows.

**High-availability message processing.** Consumer instances fail independently. One instance dying doesn't stop processing — other instances continue, and the failed instance's in-flight messages reappear after the visibility timeout for reprocessing.

**When processing time is unpredictable.** Some messages process in 100ms; others take 30 seconds. Competing consumers handle this naturally — fast-processing consumers pick up more messages; slow ones don't block others.

**Elastic scaling on cloud infrastructure.** Competing consumers combined with auto-scaling (ECS, Kubernetes HPA, Lambda) creates fully elastic processing capacity that tracks queue depth automatically.

## When NOT to Use

**When message ordering must be strictly preserved globally.** If you need global ordering (message 1 before message 2 before message 3, always), competing consumers with a single queue breaks this. Use Kafka with a single partition (sacrificing parallelism) or SQS FIFO with message groups.

**When processing is stateful across messages.** If processing message N requires knowing the outcome of message N-1 (beyond simple idempotency), competing consumers require careful design. Session-based queuing (SQS FIFO with MessageGroupId) assigns all messages for one entity to the same consumer at a time.

**When the message processing rate must exactly match the publish rate with no buffering.** If you need real-time, synchronous, zero-lag processing, a queue-and-consumer model introduces inherent latency. Direct synchronous calls or streaming with no consumer lag (Kafka with committed offsets near head) may be more appropriate.

**When the work is inherently sequential for a specific resource.** Database migrations, sequential state machine transitions, ordered financial transaction logs — these have ordering requirements that competing consumers complicate.

## Common Mistakes

**Mistake 1: Non-idempotent consumers.** With at-least-once delivery, duplicates are inevitable. A non-idempotent consumer sends duplicate emails, double-charges customers, or creates duplicate records. Idempotency is the first design requirement, not an afterthought.

**Mistake 2: Visibility timeout shorter than processing time.** Messages processed slowly appear as "available" and are picked up by other consumers. Now two consumers are processing the same message simultaneously. Set visibility timeout to 2-3x your P99 processing time.

**Mistake 3: No dead-letter queue.** Without a DLQ, poison messages cycle indefinitely. They consume consumer capacity, create noise in logs, and may exhaust retry limits. Every queue needs a DLQ with alerting on depth.

**Mistake 4: Scaling consumers without scaling the downstream.** You scale from 5 to 50 consumers, each hitting your database. The database goes from 100 connections to 1000. The database becomes the new bottleneck. Scale the entire pipeline, not just the consumers.

**Mistake 5: Ignoring consumer lag in Kafka.** Kafka's consumer group lag (committed offset vs latest offset) is the critical health metric. Teams monitor queue depth for SQS but forget consumer lag for Kafka. Alert on consumer lag growing, not just on absolute lag size.

## Connections

**Bulkhead Pattern** (Volume 03, article 04): Consumer pools are natural bulkhead boundaries. A high-priority notification queue and a low-priority analytics queue should have separate consumer pools so analytics processing doesn't starve notifications.

**Claim Check Pattern** (Volume 03, article 08): Competing consumers work with claim check naturally — multiple consumers independently fetch large payloads from object storage. No coordination needed between consumer instances for payload access.

**Compensating Transaction** (Volume 03, article 10): In saga patterns, saga steps are often implemented as competing consumers processing command messages. Compensation commands follow the same pattern.

**Choreography Pattern** (Volume 03, article 06): Choreography's event consumers are typically implemented as competing consumers — multiple instances of each service consuming from the same event stream.

**Cache-Aside Pattern** (Volume 03, article 05): Consumers that need shared reference data (product catalog, user data) should cache it. All consumer instances can share the same cache (Redis), dramatically reducing database load from a large consumer pool.

## Key Insights

1. **Idempotency is the contract between the queue and the consumer.** At-least-once delivery is the standard guarantee. Exactly-once processing is achieved by making the consumer idempotent, not by relying on the queue to deliver exactly once.

2. **The queue is the scaling buffer, not the processing layer.** Queues don't process work; they buffer it. The consumer pool is the processing layer. Scale the consumer pool based on queue depth; the queue handles the mismatch between production and consumption rates.

3. **Visibility timeout is the most commonly misconfigured parameter.** It must be longer than your P99 processing time. If processing can occasionally take minutes (database locks, external API calls), set the timeout in minutes. Use heartbeating for very long jobs.

4. **Kafka partitions are the parallelism ceiling.** You cannot have more active Kafka consumers in a group than partitions. Over-partition (more partitions than you currently need) to allow future scaling without repartitioning.

5. **Dead-letter queues are your safety net and your diagnostic tool.** DLQ messages tell you what failed and why. Treat DLQ depth as an alert. Investigate DLQ messages promptly — they represent real business events that weren't processed.

6. **Consumer pool size should be a configuration value, not code.** The right number of consumers changes with load. Design consumer pools to be driven by configuration or auto-scaling policies, not hardcoded.

7. **Test failure scenarios explicitly.** Kill a consumer instance mid-processing. Verify the message reappears and is processed by another consumer. Verify it's processed exactly once (idempotency). This is the core resilience guarantee of the pattern — validate it, don't assume it.
