# Queue-Based Load Leveling

> "A queue is a promise: I will get to this. A synchronous call is a demand: you must handle this right now."

## The Problem

Your image processing service receives upload requests at wildly uneven rates. During business hours, 10 uploads per minute arrive and each takes 3 seconds to process — totally manageable. Then a major customer runs a batch import during lunch: 5,000 images uploaded in 90 seconds. Your service is designed to handle 10 concurrent requests. It receives 5,000 simultaneously. Most requests time out. The service runs out of memory trying to hold 5,000 in-flight requests. It crashes. Recovery takes 5 minutes. During those 5 minutes, even normal single-image uploads fail. A single burst event took down the entire service.

The root cause is synchronous, unbuffered coupling between producer and consumer. When the producer's rate exceeds the consumer's capacity, requests fail immediately rather than waiting. The consumer has no way to signal "slow down" to the producer. The producer has no place to put requests when the consumer is saturated.

This is not an unusual problem. Traffic spikes are normal. Marketing campaigns, batch imports, end-of-day processing, viral moments — every production system experiences load that exceeds steady-state capacity. The question is not whether spikes will happen but how your system behaves when they do.

Queue-Based Load Leveling solves this by introducing a durable queue between producer and consumer. The producer writes to the queue at whatever rate requests arrive. The consumer reads from the queue at its own sustainable pace. The queue absorbs the difference. Spikes are smoothed into steady, manageable load. The consumer never sees more requests than it can handle.

## Core Concept

The fundamental insight: producers and consumers don't need to work at the same rate if there's a buffer between them.

```
WITHOUT LOAD LEVELING:

Producer  --[10x burst]--> Consumer
              ^^^^^^
              Consumer capacity: 10 req/s
              Burst: 100 req/s
              
              Result: 90 req/s dropped, timeouts, crashes.


WITH LOAD LEVELING:

Producer --[100 req/s]--> [Queue] --[10 req/s]--> Consumer
                          ^^^^^^
                          Queue absorbs the burst.
                          Queue depth: grows during burst,
                          shrinks as consumer catches up.
                          Consumer never sees >10 req/s.

Queue depth over time:
                    /\
burst starts ------/  \------ burst ends
                              queue draining
                   ____________
steady state -----/            \----- recovered
```

The queue is not just a buffer — it is a communication channel. Queue depth is information. A growing queue tells you the consumer is falling behind. A stable queue tells you producer and consumer are balanced. A shrinking queue tells you consumers have spare capacity. This information drives auto-scaling decisions.

### Properties of a Good Load-Leveling Queue

**Durability:** Messages must survive process restarts and infrastructure failures. An in-memory queue defeats the purpose — if the service restarts, queued work is lost.

**At-least-once delivery:** A queued message must be delivered to a consumer at least once. Messages must not be silently dropped.

**Visibility timeout:** When a consumer receives a message, the queue hides it from other consumers for a period (the visibility timeout). If the consumer fails to acknowledge processing within that period, the message becomes visible again for another consumer to process. This handles consumer crashes mid-processing.

**Dead letter queue (DLQ):** Messages that fail processing N times are moved to a DLQ rather than blocking the main queue forever. This handles poison-pill messages — malformed messages that will always fail.

**Backpressure:** The queue communicates pressure back to producers through queue depth monitoring. When the queue is deep (consumers falling behind), producers can slow down, reject new requests, or alert operations.

## Deep Dive

**The fundamental asymmetry: burst versus sustained capacity.** Michael Nygard's *Release It!* identifies the core problem that queue-based load leveling solves: the difference between peak arrival rate and sustainable processing rate. In most systems, peak arrival rate significantly exceeds the economically justified sustainable processing rate. Provisioning capacity for the peak means paying for resources that sit idle 95% of the time. Queue-based load leveling separates arrival from processing: the queue absorbs the peak, and the consumer processes at the sustainable rate. Nygard's framing is architectural: the queue is not just a buffer — it is the mechanism that allows the system to be sized for sustained load rather than peak load, reducing both cost and operational risk (a smaller, well-sized system is more reliable than an over-provisioned one that must auto-scale aggressively).

**The insurmountable backlog failure mode.** The AWS Builder's Library article "Avoiding insurmountable queue backlogs" by David Yanacek documents the most dangerous failure mode of queue-based load leveling: when the producer generates messages faster than the consumer can process them, the queue grows without bound. If a queue accumulates a 10-hour backlog and the queue's message TTL is 4 days, the consumer has time to drain it. But if demand spikes for a sustained period and processing rate never catches up, the queue becomes an unbounded liability — messages expire before processing, and the system appears to accept work it can never complete. Yanacek's analysis leads to a critical design principle: the queue must have a bounded depth, and the system must monitor the ratio of enqueue rate to processing rate continuously. When this ratio exceeds 1.0 for more than a brief period, it is not a spike — it is a sustained overload that requires intervention, not queuing.

**Little's Law and queue-based capacity planning.** Martin Kleppmann's *Designing Data-Intensive Applications* applies Little's Law — N = λW — to queue-based systems. If messages arrive at rate λ and each takes time W to process, the steady-state queue depth N = λW. This gives the minimum consumer count: ceil(λ × W) consumers are needed to maintain queue depth near zero. For example, if 100 messages arrive per second and each takes 200ms to process, the minimum consumer count is 20 (20 × 5 messages/second = 100 messages/second). Any fewer consumers and the queue grows. Auto-scaling policies based on queue depth are implementing Little's Law empirically: scale out to maintain a target message-per-consumer ratio that keeps queue depth bounded. Kleppmann's treatment of backpressure provides the complement: when the queue is deep, the system can reject new enqueue requests (shed load at the ingress) rather than accepting work that will be processed with unacceptable latency.

**Message ordering and FIFO constraints.** Hohpe and Woolf's *Enterprise Integration Patterns* analyze the ordering guarantees of queue-based systems. A simple queue (not FIFO) provides no ordering guarantee — messages may be delivered out of order due to variable processing time and visibility timeout behavior. FIFO queues guarantee ordering but at a throughput cost: strict ordering requires a coordination mechanism that limits parallelism. The design choice has significant implications for the consumer implementation: if ordering is not guaranteed, consumers must be designed to handle out-of-order messages correctly (idempotent, commutative processing). If ordering is guaranteed, consumer parallelism is bounded by the number of independent ordered streams (message groups in FIFO queue terminology). Hohpe and Woolf's guidance: require strict ordering only when the business logic genuinely depends on it — the throughput cost is real, and many apparent ordering requirements can be relaxed with careful consumer design.

**The two-phase processing pattern.** Nygard's *Release It!* treatment of work queues describes a refinement of basic load leveling called two-phase processing: the first phase is fast and cheap (validate the request, store it, acknowledge to the caller); the second phase is slow and expensive (process the stored request asynchronously). The queue separates the phases. This enables the system to acknowledge work immediately — improving client experience — while processing it at sustainable rate. The critical design constraint: once work is acknowledged (phase 1 complete), it must be processed (phase 2) to completion. The queue must be durable, the consumers must implement retry with idempotency, and the system must provide a mechanism for the client to check processing status. This is queue-based load leveling as an explicit user experience decision, not just an internal implementation detail.
    ILogger log)
{
    var request = JsonSerializer.Deserialize<ImageRequest>(messageBody);
    await ProcessImageAsync(request);
}
```

Azure Functions automatically scales the number of function instances based on queue depth. Microsoft publishes target scale guidelines: by default, one instance per 16 messages in queue. This is configurable via `host.json`.

Azure's guidance on load leveling explicitly notes the back-pressure consideration: when a queue grows without bound, something is wrong. Either consumers are too slow (add more), the queue is being used as a permanent storage layer (wrong use), or a bug is causing messages to not be acknowledged (DLQ investigation needed).

## Implementation Guide

### Step 1: Choose Queue Type

```
Decision tree:
  Need ordering guarantees?
    Yes -> SQS FIFO / Service Bus sessions / Cloud Tasks (ordered)
    No  -> SQS Standard / Service Bus Standard / Cloud Tasks
  
  Need message size > 256KB?
    Yes -> Store payload in S3/Blob, queue the reference
    No  -> Queue the full message
    
  Need deduplication?
    Yes -> SQS FIFO (5-minute dedup window) / custom idempotency key
    No  -> Standard queue
    
  Need scheduling (deliver at specific time)?
    Yes -> Cloud Tasks / SQS (message delay up to 15 min) / Service Bus scheduled
    No  -> Standard queue
```

### Step 2: Configure Visibility Timeout

The visibility timeout must be longer than the maximum expected processing time:

```
processing_time_p99: 30 seconds
buffer: 2x
visibility_timeout: 60 seconds

If processing exceeds 60s, the message becomes visible again.
Consumer must extend visibility during long-running processing:

# AWS SDK - extend visibility during processing
while processing:
    sqs.change_message_visibility(
        QueueUrl=queue_url,
        ReceiptHandle=receipt_handle,
        VisibilityTimeout=60  # reset the clock
    )
    do_processing_chunk()
```

### Step 3: Configure DLQ

```python
# Terraform: SQS with DLQ
resource "aws_sqs_queue" "main" {
  name                       = "image-processing"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400  # 1 day
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3  # after 3 failures, move to DLQ
  })
}

resource "aws_sqs_queue" "dlq" {
  name                       = "image-processing-dlq"
  message_retention_seconds  = 1209600  # 14 days - keep for investigation
}

# Alert on DLQ depth
resource "aws_cloudwatch_metric_alarm" "dlq_depth" {
  alarm_name  = "image-processing-dlq-depth"
  metric_name = "ApproximateNumberOfMessagesVisible"
  namespace   = "AWS/SQS"
  period      = 60
  statistic   = "Sum"
  threshold   = 1  # alert on ANY DLQ message
  comparison_operator = "GreaterThanOrEqualToThreshold"
  dimensions = { QueueName = aws_sqs_queue.dlq.name }
  alarm_actions = [var.pagerduty_sns_topic]
}
```

### Step 4: Implement Back-Pressure

Queue-based load leveling protects the consumer. You also need to protect the queue from infinite growth:

```typescript
class ImageUploadController {
  async handleUpload(req: Request, res: Response) {
    // Check queue depth before accepting new work
    const queueDepth = await this.getQueueDepth();
    
    if (queueDepth > MAX_QUEUE_DEPTH) {
      // Back-pressure: reject new work with 503
      return res.status(503).json({
        error: 'Service temporarily at capacity',
        retryAfter: 30,
      });
    }
    
    // Enqueue the work
    await this.queue.sendMessage({ imageId: req.body.imageId });
    res.status(202).json({ status: 'queued', imageId: req.body.imageId });
  }
}
```

### Step 5: Monitor the Key Metrics

```
ApproximateNumberOfMessagesVisible   - queue depth (primary indicator)
ApproximateAgeOfOldestMessage        - staleness (how far behind are consumers?)
NumberOfMessagesSent                 - producer rate
NumberOfMessagesDeleted              - consumer rate (success)
NumberOfMessagesNotVisible           - in-flight (currently being processed)
DLQ: ApproximateNumberOfMessagesVisible - failure rate
```

Create a dashboard showing producer rate, consumer rate, and queue depth on the same graph. When queue depth grows, you're producing faster than consuming. When it shrinks, you're consuming faster than producing.

## When to Use / When NOT to Use

**Use when:**
- Producer rate is bursty and consumer rate is steady
- Consumer needs protection from overload
- Tasks can tolerate delay (processing doesn't need to be synchronous)
- You want to decouple producer and consumer deployment/scaling

**Do NOT use when:**
- The response must be synchronous (user is waiting for the result — use async with polling or WebSocket instead)
- Message ordering is critical across all messages (FIFO queues help within bounds, but true global ordering is expensive)
- Latency SLA is < 1 second end-to-end (queue adds latency; measure it against your SLA)
- The consumer can never catch up with the producer (queue growth without bound — fix the producer/consumer rate mismatch first)

## Common Mistakes

**Mistake 1: Unbounded queue growth without alerting.** The queue grows indefinitely during a sustained overload. No alert fires. Days later, the queue has 10 million messages. Consumers will take weeks to catch up. The "tail" of that queue represents work that is days stale — probably invalid by now. Always alert on both queue depth and message age.

**Mistake 2: Visibility timeout shorter than processing time.** Consumer receives a message, starts processing (which takes 90 seconds), but the visibility timeout is 30 seconds. At 30 seconds, the message becomes visible again. A second consumer picks it up. Now two consumers are processing the same message. When the first finishes, it tries to delete a message it no longer holds. Result: duplicate processing. Set visibility timeout to 2-3x the p99 processing time.

**Mistake 3: Not handling poison-pill messages.** A malformed message causes the consumer to throw an exception. The message returns to the queue (visibility timeout expires). Another consumer picks it up. Same exception. The message cycles through all consumers, blocking processing of valid messages behind it. Without a DLQ configured, this never resolves. Always configure DLQs with maxReceiveCount.

**Mistake 4: Using queue depth as the only scaling signal.** Queue depth tells you how far behind consumers are, but not why. A queue depth of 1,000 at 10 AM is different from the same depth at 3 AM. Use queue depth combined with message age and producer/consumer rate differential to make accurate scaling decisions.

**Mistake 5: Forgetting the cost of queue size on Lambda.** When using Lambda with SQS event source mapping, Lambda scales based on queue depth — potentially spawning hundreds of concurrent Lambda functions. If your downstream (database, external API) can't handle that concurrency, you've moved the overload from the queue to the downstream. Set `ReservedConcurrency` on Lambda functions that call rate-limited downstreams.

## Connections

**Priority Queue** (Article 18): Load leveling and priority queuing are complementary. Load leveling protects consumers from overload; priority queuing ensures the right work is processed first during overload. Use multiple queues: one per priority level, each acting as a load-leveling buffer.

**Publisher-Subscriber** (Article 19): Pub/sub decouples publishers from subscribers. Adding SQS queues as pub/sub subscribers adds load leveling to the decoupling — the SNS-to-SQS fan-out pattern combines both.

**Retry Pattern** (Article 21): Failed messages return to the queue for retry. The visibility timeout is the retry delay. The DLQ is the exhaust valve for messages that exceed maxReceiveCount.

**Circuit Breaker**: When a downstream dependency fails, consumers should stop processing messages that require that dependency rather than failing every message and filling the DLQ. A circuit breaker on the downstream prevents this — consumers pause processing when the circuit is open.

**Auto-Scaling**: Queue depth is one of the best auto-scaling signals available. It directly measures demand vs capacity. Queue-based auto-scaling (KEDA, CloudWatch + ASG, Cloud Tasks dispatch rate) is the natural partner of queue-based load leveling.

## Key Insights

1. **The queue is a shock absorber, not a storage layer.** Queues should be transiently populated — messages flow through them, not accumulate in them. A perpetually growing queue means producers consistently outrun consumers. Treat unbounded queue growth as a critical alert.

2. **Queue depth is the most honest measure of capacity gap.** It directly measures "how much work is waiting." Unlike CPU or memory metrics, queue depth tells you exactly how far behind you are and how long recovery will take (depth / drain rate).

3. **Visibility timeout is the heartbeat of queue-based processing.** Too short: duplicate processing. Too long: slow recovery from consumer crashes. Set it to 2-3x the p99 processing time and extend it during long-running tasks.

4. **DLQs are your forensic log.** Every message in the DLQ is a processing failure. Alert on any DLQ depth > 0 for critical queues. The DLQ tells you about bugs, malformed data, and capacity issues before they become widespread.

5. **Load leveling solves the burst problem; auto-scaling solves the sustained-overload problem.** A queue buffers a 10-minute spike perfectly. A queue cannot buffer a week of sustained overload — eventually it exceeds retention period. Auto-scaling closes the sustained gap.

6. **Synchronous acknowledgment vs asynchronous processing is a UX decision.** Returning HTTP 202 Accepted (queued) instead of 200 OK (processed) requires your clients to poll for results or accept eventual consistency. This is the right trade-off for long-running tasks but requires explicit design of the status-check API.

7. **The consumer's processing speed is your system's true throughput.** The queue can absorb any burst. But the steady-state throughput of your system is limited by consumer processing rate. Optimize consumer processing — reduce per-message latency, increase parallelism, batch processing where appropriate — before adding more queue capacity.
