# Priority Queue Pattern

> "Not all messages are created equal. Treating them as if they are is how you lose your best customers during an outage."

## The Problem

Your payment processing system handles two types of messages: real-time payment authorizations (a customer is standing at a checkout, card in hand, waiting for approval) and end-of-day reconciliation jobs (batch reports that don't need to complete for another six hours). Under normal load, both move through your queue in milliseconds. During a traffic spike — say, Black Friday — the queue fills up. You have 50,000 messages waiting. The batch reconciliation jobs got queued first, so they're at the front. The payment authorizations, which arrived later, are stuck behind them. Customers at checkout terminals are getting timeouts. Your SLA requires 99.9% of payment authorizations to complete within 2 seconds. You're failing it catastrophically.

The root problem is a single FIFO queue that treats every message identically. First-in-first-out makes no distinction between a real-time customer-facing request and a background batch job. When the queue fills, the most valuable work is delayed by the least urgent work.

Priority Queue is the solution: a queueing mechanism where messages carry a priority level, and consumers always process higher-priority messages before lower-priority ones, regardless of arrival order. A payment authorization jumps the queue past a thousand reconciliation jobs. The customer gets their approval. The batch report runs whenever capacity allows.

## Core Concept

The priority queue pattern assigns each message a priority level and ensures that consumers drain higher-priority messages first. The naive mental model is a sorted data structure — a heap — where the highest-priority item is always at the front. The practical cloud implementation is almost always multiple queues with priority routing.

```
SINGLE FIFO QUEUE (problem):

Producer:  P3  P1  P2  P1  P3  P3  P2  --> [Q: P3 P1 P2 P1 P3 P3 P2] --> Consumer
           (P1=high, P2=medium, P3=low)
           
Consumed in order: P3, P1, P2, P1, P3, P3, P2
High-priority P1 messages wait behind P3 (low priority).


PRIORITY QUEUE (solution):

                   ┌──────────────────┐
High priority (P1) │ P1  P1           │──┐
                   └──────────────────┘  │
                   ┌──────────────────┐  ├──> Consumer (always drains
Medium priority(P2)│ P2  P2           │──┤         high before low)
                   └──────────────────┘  │
                   ┌──────────────────┐  │
Low priority (P3)  │ P3  P3  P3  P3   │──┘
                   └──────────────────┘
```

### Multiple Queues vs Single Prioritized Queue

There are two physical implementations:

**Multiple physical queues:** One queue per priority level. Consumers poll queues in priority order — check high queue first; if empty, check medium; if empty, check low. This is the most common cloud implementation because most managed queue services (SQS, Service Bus) don't natively support per-message priority.

**Single queue with priority field:** Messages carry a priority field. The queue service sorts by priority and exposes the highest-priority message to consumers first. Native priority queues: RabbitMQ (priority queue plugin, max 255 levels), Redis sorted sets (ZADD with score as priority), Azure Service Bus (session-based workaround).

Multiple queues is almost always the right choice for cloud systems:
- Works with any queue service
- Each queue has independent scaling, retention, and DLQ configuration
- Consumer allocation is explicit and tunable
- Priority semantics are simple and debuggable

### Consumer Allocation

With multiple queues, you must decide how to allocate consumers:

```
Approach 1: Dedicated consumers per queue
  High queue:   5 consumers (always available for urgent work)
  Medium queue: 3 consumers
  Low queue:    2 consumers
  
  Pros: Guaranteed capacity for high priority
  Cons: Wasted capacity when high queue is empty

Approach 2: Polling consumers (priority waterfall)
  All consumers poll: high queue first -> medium -> low
  
  Pros: No wasted capacity
  Cons: Low queue starvation when high queue is perpetually full
  
Approach 3: Weighted consumers
  Each consumer spends time across queues proportional to weight:
  High: 60%, Medium: 30%, Low: 10%
  
  Pros: Balances utilization with guaranteed progress on all queues
  Cons: More complex to implement
```

### Starvation Prevention

With polling consumers (approach 2), low-priority messages can starve indefinitely if high-priority messages keep arriving. The solution is aging: after a message has been waiting for a defined period, its effective priority is elevated.

```
Aging rule:
  Low priority message waiting > 30 minutes -> promote to medium
  Medium priority message waiting > 60 minutes -> promote to high
  
Implementation: store enqueue_time with message; 
  consumer checks age and overrides priority if threshold exceeded.
```

## Deep Dive

**Load shedding and priority as a survival mechanism.** The Google SRE Book dedicates a chapter to load shedding — the practice of deliberately dropping low-value work when a system is under excessive load in order to protect high-value work. The SRE Book's framing is direct: a system under overload that attempts to serve all requests equally will serve all of them poorly. A system under overload that sheds low-priority requests will serve high-priority requests at full quality. Priority queuing is the mechanism that makes load shedding deterministic: low-priority work is already labeled, and when shedding is required, the queue boundary is where the work is dropped. The SRE Book's treatment of serving capacity and request classification maps directly to queue tiers: define the tiers, assign requests to tiers at intake, and shed the lowest tier first when capacity is constrained.

**Starvation and the low-priority work debt problem.** Hohpe and Woolf's *Enterprise Integration Patterns* identify message starvation as the primary failure mode of naive priority queue implementations. If high-priority messages arrive at a rate that consumes all consumer capacity, low-priority messages never make progress — they accumulate indefinitely, creating an unbounded backlog that eventually exhausts memory or causes message expiration. The standard solution is aging: low-priority messages gain priority as they age in the queue, preventing indefinite starvation. A message that has waited 60 minutes in the low-priority queue is promoted to medium priority; after 4 hours, it is promoted to high priority. This bounds the maximum wait time for any message regardless of priority, at the cost of reducing the effective priority separation during sustained overload. The correct design must specify both the priority classification logic and the aging policy explicitly — they are two separate design decisions that interact.

**The multiple-queue implementation and consumer polling strategy.** The AWS Builder's Library article "Avoiding insurmountable queue backlogs" by David Yanacek analyzes the operational dynamics of queue-based processing. The key insight for priority queue implementations: a consumer that polls multiple queues must implement a strict polling order (check high-priority queue first, process if messages present, only check lower queues when higher queues are empty) rather than round-robin polling. Round-robin polling gives equal throughput to all queues regardless of queue depth, defeating the priority mechanism entirely. Strict priority polling ensures that when high-priority messages exist, consumer capacity is fully directed at them. The implementation risk is that strict priority polling can cause starvation — which the aging mechanism above addresses. Yanacek's treatment of auto-scaling based on queue depth applies per-queue: the high-priority queue has an aggressive scale-out policy (scale out at depth 10), the low-priority queue has a conservative one (scale out at depth 1000), ensuring capacity is allocated proportionally to priority.

**Priority inversion and dependency chains.** Michael Nygard's *Release It!* identifies a failure mode in priority systems called priority inversion: a high-priority task is blocked waiting for a resource held by a low-priority task, which cannot progress because the consumer is busy with other high-priority tasks. In a priority queue system, this manifests when high-priority messages depend on the results of low-priority messages. If the low-priority queue is consistently starved, high-priority tasks that depend on its output will eventually fail or time out. The correct design avoids priority inversion by ensuring that no high-priority work depends on low-priority work being complete. When dependencies across priority levels exist, they must be mapped explicitly, and the dependent task's priority must be elevated to match the priority of its dependents.

**The Kleppmann treatment of fairness and weighted fair queuing.** Kleppmann's *Designing Data-Intensive Applications* analysis of resource scheduling applies to priority queue design. Strict priority queuing is optimal for throughput of high-priority work but unfair to low-priority producers. In multi-tenant systems, where different tenants' work competes for the same processing capacity, strict priority can lead to one tenant's low-priority work monopolizing capacity while another tenant's high-priority work waits. Weighted fair queuing (WFQ) — allocating capacity in proportion to assigned weights rather than strictly by priority — provides a bounded-fairness guarantee: a tenant assigned weight 10 gets at least 10% of capacity even if other tenants have higher-priority work. The choice between strict priority and weighted fair queuing depends on the multi-tenancy requirements: strict priority for single-tenant SLA differentiation; weighted fair queuing for multi-tenant fairness guarantees.
    private readonly ServiceBusReceiver _lowPriority;

    public async Task ProcessNextAsync(CancellationToken ct)
    {
        // Try high priority first (short timeout)
        var msg = await _highPriority.ReceiveMessageAsync(
            maxWaitTime: TimeSpan.FromMilliseconds(100), ct);
        
        if (msg == null) {
            msg = await _mediumPriority.ReceiveMessageAsync(
                maxWaitTime: TimeSpan.FromMilliseconds(100), ct);
        }
        
        if (msg == null) {
            // Long poll on low priority when higher queues empty
            msg = await _lowPriority.ReceiveMessageAsync(
                maxWaitTime: TimeSpan.FromSeconds(5), ct);
        }
        
        if (msg != null) await ProcessAndCompleteAsync(msg, ct);
    }
}
```

## Implementation Guide

### Step 1: Define Priority Levels

Resist the urge to create many priority levels. Three is almost always sufficient:

```
HIGH:   User-facing, real-time, SLA-bound
        Examples: payment auth, checkout, login, search
        
MEDIUM: User-facing but can tolerate seconds of delay
        Examples: order confirmation email, profile update, cart save
        
LOW:    Background, batch, no user waiting
        Examples: analytics, report generation, data migration, cleanup
```

More than three levels creates maintenance complexity without meaningful benefit. If you find yourself needing five levels, consider whether you actually have two independent priority dimensions (urgency × importance) that should be modeled differently.

### Step 2: Create Queues and DLQs

```typescript
// AWS CDK example
const highQueue = new sqs.Queue(this, 'HighPriorityQueue', {
  visibilityTimeout: Duration.seconds(30),
  deadLetterQueue: {
    queue: new sqs.Queue(this, 'HighPriorityDLQ'),
    maxReceiveCount: 3,
  },
});

const mediumQueue = new sqs.Queue(this, 'MediumPriorityQueue', {
  visibilityTimeout: Duration.seconds(60),
  deadLetterQueue: {
    queue: new sqs.Queue(this, 'MediumPriorityDLQ'),
    maxReceiveCount: 5,
  },
});

const lowQueue = new sqs.Queue(this, 'LowPriorityQueue', {
  visibilityTimeout: Duration.seconds(300),
  messageRetentionPeriod: Duration.days(4),
  deadLetterQueue: {
    queue: new sqs.Queue(this, 'LowPriorityDLQ'),
    maxReceiveCount: 10,
  },
});
```

Notice the different configurations: high priority gets fewer retries (fail fast and alert), low priority gets more retries and longer retention.

### Step 3: Implement Priority Assignment at Enqueue

Priority must be assigned by the producer based on business context:

```typescript
class MessageRouter {
  async enqueue(message: WorkItem): Promise<void> {
    const queue = this.selectQueue(message);
    await queue.sendMessage({ MessageBody: JSON.stringify(message) });
  }
  
  private selectQueue(message: WorkItem): SQSQueue {
    if (message.type === 'payment_authorization') return this.highQueue;
    if (message.type === 'order_confirmation') return this.mediumQueue;
    if (message.type === 'analytics_event') return this.lowQueue;
    
    // Default: medium for unknown types (fail safe, not fail open)
    return this.mediumQueue;
  }
}
```

### Step 4: Monitor Queue Depths and Latency

The most important metrics for a priority queue system:

```
Queue depth per priority level (CloudWatch Metric: ApproximateNumberOfMessagesVisible)
Message age per priority level (CloudWatch Metric: ApproximateAgeOfOldestMessage)
Processing latency per priority level (custom metric: enqueue_time to process_time)
Starvation indicator: low priority message age > threshold
```

Alert when:
- High priority queue depth > 100 (processing can't keep up)
- High priority message age > 5 seconds (SLA breach approaching)
- Low priority message age > 4 hours (starvation starting)

### Step 5: Auto-Scale Based on Queue Depth

```yaml
# Kubernetes HPA for priority queue workers
# Scale more aggressively for high-priority queue
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: high-priority-worker
spec:
  minReplicas: 2
  maxReplicas: 50
  metrics:
    - type: External
      external:
        metric:
          name: sqs_queue_depth
          selector:
            matchLabels:
              queue: high-priority
        target:
          type: AverageValue
          averageValue: "5"  # Scale up when avg depth > 5 messages per replica
```

## When to Use / When NOT to Use

**Use when:**
- Different message types have different SLAs (milliseconds vs hours)
- System occasionally exceeds capacity — you need degradation to be graceful
- Business logic distinguishes premium vs standard users/operations
- Load shedding is part of your resilience strategy

**Do NOT use when:**
- All messages have the same urgency and SLA — complexity without benefit
- Priority cannot be determined at enqueue time (you'd need to re-prioritize mid-queue)
- Starvation of low-priority messages is unacceptable (use rate limiting instead)
- Message ordering within a priority level is critical (FIFO within each queue satisfies this, but cross-queue ordering is not guaranteed)

## Common Mistakes

**Mistake 1: Priority inflation.** Over time, every team marks their messages as high priority because they don't want to be deprioritized. Eventually everything is "high" and you're back to a single effective queue. Enforce priority assignment governance — high priority requires explicit justification and SLA evidence.

**Mistake 2: Ignoring starvation.** Low-priority queues grow without bound during sustained high load. Messages from days ago are still waiting. Implement aging (auto-promotion after threshold) and monitor queue depth and age independently per priority level.

**Mistake 3: Not sizing consumers for peak high-priority load.** During a traffic spike, high-priority messages arrive faster than consumers can process them. If you sized consumers for average load, even high-priority SLAs will breach. Size consumers for peak high-priority throughput, and treat low-priority capacity as whatever remains.

**Mistake 4: Shared dead-letter queue.** Routing all DLQ messages to a single DLQ loses priority information. You can't tell whether failed messages were high-priority (needs immediate alert) or low-priority (can wait for batch review). Use separate DLQs per priority level with different alerting thresholds.

**Mistake 5: Priority assignment in the wrong place.** Letting consumers re-prioritize messages after dequeue. Priority must be assigned at enqueue by producers that understand business context. Consumers should be priority-agnostic — they receive a message from the appropriate queue and process it.

## Connections

**Queue-Based Load Leveling** (Article 20): Priority queue and load leveling are complementary. Load leveling buffers traffic spikes; priority queue ensures the right work is processed first during those spikes. Most production systems use both.

**Retry Pattern** (Article 21): Failed high-priority messages need aggressive retry with short backoff. Failed low-priority messages can have long backoff without impact. Configure retry policies per queue independently.

**Load Shedding**: Priority queue is the mechanism that makes load shedding graceful. When the system is overwhelmed, you shed low-priority work (drain the low queue slowly or not at all) while maintaining high-priority processing.

**Circuit Breaker**: When a downstream dependency fails, a circuit breaker stops processing messages that require that dependency. Priority-aware circuit breaking can continue processing high-priority messages that don't need the broken dependency while stopping low-priority messages that do.

## Key Insights

1. **Three priority levels are almost always sufficient.** High/Medium/Low covers 99% of real cases. More levels add operational complexity without proportional value. The goal is graceful degradation under load, not fine-grained scheduling.

2. **Multiple queues beat a single prioritized queue in cloud environments.** Most cloud queue services don't support per-message priority natively, and multiple queues give you independent scaling, monitoring, and configuration per priority tier. This is a feature, not a workaround.

3. **Starvation is the primary operational risk.** A priority queue that never processes low-priority messages is a memory leak with extra steps. Monitor message age by priority level. Implement aging or scheduled maintenance windows for low-priority queues.

4. **Priority assignment is a business decision, not a technical one.** Engineers should not unilaterally decide what is high priority. Priority levels should be defined against business SLAs: what is the user impact if this message is delayed by 5 seconds? By 5 minutes? By 5 hours?

5. **Size consumer capacity for high-priority peak, not average load.** Your SLA is measured at peak. If you size for average, you breach SLAs during the traffic spikes that are the most visible to customers.

6. **Priority queues and load shedding are siblings.** Priority queuing is how you decide which work gets done when capacity is limited. Load shedding is the decision to not do work at all when capacity is completely exhausted. Design them together.

7. **The DLQ is your forensic record.** Failed messages in the DLQ tell you about your system's failure modes. Keep DLQs per priority level, retain messages long enough to investigate, and alert differently on DLQ depth by priority.
