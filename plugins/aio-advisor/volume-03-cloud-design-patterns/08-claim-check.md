# Claim Check Pattern

> "A message bus is not a file system. When you start routing megabyte payloads through it, you are using the wrong tool for the job." — Gregor Hohpe, Enterprise Integration Patterns

## The Problem

Your order fulfillment system publishes events when orders are placed. Each event includes the complete order details: customer information, line items, shipping address, product descriptions, tax calculations, and attached documents. In the beginning, each event is a few kilobytes. Over time, product descriptions get richer, customers attach notes and images, and regulatory requirements add more data to each order record. Events grow to 50KB, then 200KB, then occasionally 2MB when a customer attaches scanned documents.

Message brokers are designed for high-throughput message routing, not bulk data transfer. AWS SQS has a maximum message size of 256KB. Azure Service Bus tops out at 256KB for standard tier, 1MB for premium. Kafka's default maximum message size is 1MB, and while this is configurable, large messages degrade broker performance significantly — replication is slower, partition leadership transfers are slower, consumer fetch times increase. Your event bus, designed to handle millions of small messages per second, starts straining under the weight of large payloads.

Beyond the size limits, there are security concerns. An event might contain personally identifiable information, payment card data, or medical records. Multiple services subscribe to this event — the warehouse service, the logistics service, the analytics service, the customer service platform. Not all of them need the sensitive fields. But because the full payload is in the message, every subscriber receives sensitive data whether they need it or not, complicating your data governance and regulatory compliance.

The Claim Check pattern solves both problems. Large or sensitive data is extracted from the message, stored in a dedicated data store, and replaced with a reference — a "claim check," like a coat check ticket. Subscribers receive the lightweight reference and fetch only the data they need, when they need it.

## Core Concept

The Claim Check pattern splits a large message into two parts: a lightweight reference message that flows through the message bus, and a large payload stored separately in object storage or a database. The reference is the "claim check" — like a cloakroom ticket that lets you retrieve your coat.

```
WITHOUT CLAIM CHECK:
Producer ──[2MB event]──▶ Message Bus ──[2MB event]──▶ All Subscribers
                         (struggling)

WITH CLAIM CHECK:
         ┌─────────────────────────────────────────────┐
         │              Object Storage                  │
         │              (S3 / Blob / GCS)               │
         └──────────────────┬──────────────────────────┘
                            │ 2. store payload
                            │         3. return reference
Producer ──────────────────▶│◀──────────────────────────
    │                        │
    │  1. split              │
    │  ─────────────────────▶
    │
    │  4. publish lightweight event
    │  { eventId, orderId, payloadRef: "s3://bucket/events/abc123" }
    ▼
Message Bus ──[tiny event]──▶ Subscribers
                              │
                              │ 5. fetch only if needed
                              ▼
                         Object Storage
                              │
                              │ 6. return payload
                              ▼
                         Subscriber processes data
```

The pattern has two key operations:

**Publish (check in)**: Before publishing to the message bus, the producer stores the large payload in object storage and records the storage reference. The message published to the bus contains the reference and any small metadata needed for routing decisions.

**Consume (check out)**: The subscriber receives the lightweight message. It uses the reference to fetch the full payload from object storage — only if it needs it. Subscribers that don't need the full payload process the message without the expensive fetch.

### When to split

A useful heuristic: if the payload is larger than 64KB, consider the Claim Check pattern. AWS SQS Extended Client Library uses this automatically for messages exceeding 256KB. The right threshold depends on your message bus's characteristics and the scale of your system.

## Deep Dive

**The pattern's origin in enterprise integration.** Gregor Hohpe and Bobby Woolf's *Enterprise Integration Patterns* catalog this as the "Claim Check" pattern (also called "Store in Library"). Their framing is architectural: a messaging system is a transport infrastructure optimized for routing, not storage. Pushing large payloads through a message bus conflates two concerns — notification and data transfer — that have different scalability and durability requirements. Hohpe and Woolf's core argument is that message buses are designed for small, rapidly-moving envelopes. Embedding large payloads in those envelopes degrades throughput, increases memory pressure on brokers, and slows consumers that must deserialize the full payload even when they only need metadata to decide how to route the message. The solution is architectural separation: the message bus carries the reference; a content store carries the data.

**Why size limits are not the only motivation.** *Enterprise Integration Patterns* identifies two distinct motivations for Claim Check that are often conflated. The first is size: message brokers have payload limits, and large messages must be externalized to comply. The second is selective consumption: in a competing consumer scenario, many consumers receive the same message but only one needs to act on the full payload. If the payload is embedded in the message, every consumer deserializes it during routing. If the payload is externalized, only the consumer that takes ownership fetches the full content. This selective consumption property is the deeper motivation, and it applies even when payloads are well within size limits — the pattern improves efficiency whenever payload access is conditional on routing logic.

**Message schema evolution and the reference as a stable contract.** Martin Kleppmann's *Designing Data-Intensive Applications* analyzes the challenge of schema evolution in message-passing systems. When payload formats evolve, all consumers must upgrade in lockstep or the system must maintain compatibility across versions simultaneously. Kleppmann's analysis of forward and backward compatibility applies directly here: the Claim Check pattern provides a natural decoupling point. The message envelope (containing the reference and metadata) can be versioned and evolved independently of the payload format. The claim check reference itself is stable — it is an opaque identifier. Consumers that understand the new payload format can process it; consumers that have not yet upgraded can still consume the message envelope and either delegate or skip the payload fetch. This makes the Claim Check pattern a useful tool for managing schema evolution in heterogeneous consumer environments.

**Content store durability and consistency guarantees.** *Designing Data-Intensive Applications* also addresses the durability requirements for external storage. When a message arrives referencing a payload in a content store, the consumer must trust that the payload is durable and accessible. If the content store is eventually consistent (object storage with replication lag) and the consumer processes the message immediately after the producer writes, a race condition exists: the consumer fetches the reference and gets a 404 because the object has not yet propagated. This is not a theoretical concern — it is a real production failure mode in high-throughput pipelines. Kleppmann's treatment of read-after-write consistency applies: either the producer waits for acknowledgment of durability before publishing the message, or the consumer implements a retry with backoff on fetch failure. The message bus and the content store have independent consistency models; the application must bridge them.

**Cleanup and lifecycle management — the operational blind spot.** Hohpe and Woolf's treatment of the Claim Check pattern notes an operational concern that is frequently overlooked during design: stored payloads must be deleted after processing, or the content store becomes a growing, unbounded archive. The pattern creates an implicit lifecycle contract: the consumer that processes the claim check is responsible for deleting the payload, or a separate cleanup process must do it. In practice, lifecycle management is often forgotten until the content store becomes expensive or hits storage limits. The correct design defines retention policy as part of the pattern implementation — not as a cleanup job added later. Object lifecycle rules (expire after N days, move to cold storage after M days) should be configured when the content store is provisioned, not after the first billing surprise.

**The fetch-on-consume model and back-pressure.** *Enterprise Integration Patterns* observes that the Claim Check pattern shifts the load profile of the system. Without it, the message bus absorbs large payload bandwidth during send and during fan-out to all consumers. With it, the content store absorbs a fetch request per consumer per message. In a high-fan-out system (one message, many consumers), this can be a significant increase in content store read requests. The content store becomes a shared resource under load, and its performance characteristics bound the effective throughput of the consumer pool. This is the correct trade-off for most systems — object storage is designed for high-throughput reads — but it must be analyzed, not assumed. The system that moves from embedded payloads to Claim Check is not eliminating load, it is redistributing it from the message broker to the content store.

## Implementation Guide

### Step 1: Implement the claim check store

```typescript
interface ClaimCheckStore {
  store(data: Buffer | string, metadata: ClaimCheckMetadata): Promise<string>; // returns reference
  fetch(reference: string): Promise<Buffer>;
  delete(reference: string): Promise<void>;
}

class S3ClaimCheckStore implements ClaimCheckStore {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket: string,
  ) {}

  async store(data: Buffer | string, metadata: ClaimCheckMetadata): Promise<string> {
    const key = `claim-checks/${metadata.eventType}/${metadata.eventId}`;
    
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: typeof data === 'string' ? Buffer.from(data) : data,
      ContentType: metadata.contentType ?? 'application/json',
      // Store metadata for debugging and lifecycle management
      Metadata: {
        'event-id': metadata.eventId,
        'event-type': metadata.eventType,
        'producer': metadata.producer,
        'stored-at': new Date().toISOString(),
      },
      // Auto-delete after 7 days (adjust based on max processing time)
      Expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }));
    
    return `s3://${this.bucket}/${key}`;
  }

  async fetch(reference: string): Promise<Buffer> {
    const { bucket, key } = this.parseReference(reference);
    
    const response = await this.s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    
    return Buffer.from(await response.Body!.transformToByteArray());
  }

  private parseReference(reference: string): { bucket: string; key: string } {
    const url = new URL(reference);
    return { bucket: url.hostname, key: url.pathname.slice(1) };
  }
}
```

### Step 2: Implement the producer

```typescript
class OrderEventPublisher {
  constructor(
    private readonly messageBus: MessageBus,
    private readonly claimCheckStore: ClaimCheckStore,
    private readonly sizeThresholdBytes: number = 64 * 1024, // 64KB
  ) {}

  async publishOrderPlaced(order: Order): Promise<void> {
    const fullPayload = JSON.stringify(this.toOrderEvent(order));
    
    const message: Message = {
      eventId: crypto.randomUUID(),
      eventType: 'order.placed',
      aggregateId: order.id,
      occurredAt: new Date().toISOString(),
      // Always include fields needed for routing without fetching the full payload
      customerId: order.customerId,
      totalAmount: order.total.amount,
      currency: order.total.currency,
      itemCount: order.items.length,
    };

    // Only use claim check if payload exceeds threshold
    if (Buffer.byteLength(fullPayload) > this.sizeThresholdBytes) {
      const reference = await this.claimCheckStore.store(
        fullPayload,
        { eventId: message.eventId, eventType: message.eventType, producer: 'order-service' },
      );
      message.payloadRef = reference;
      // Don't include full payload in message
    } else {
      // Small enough to include directly
      message.payload = JSON.parse(fullPayload);
    }

    await this.messageBus.publish(message);
  }
}
```

### Step 3: Implement the consumer

```typescript
class WarehouseEventConsumer {
  async handleOrderPlaced(message: Message): Promise<void> {
    // Use routing metadata from the lightweight message
    const { customerId, itemCount } = message;
    
    // Fetch full payload only if this consumer needs it
    const orderDetails = message.payload
      ? message.payload as OrderEvent
      : await this.fetchPayload(message.payloadRef!);
    
    await this.createPickingOrder(orderDetails);
  }

  private async fetchPayload(reference: string): Promise<OrderEvent> {
    const raw = await this.claimCheckStore.fetch(reference);
    return JSON.parse(raw.toString()) as OrderEvent;
  }
}

// Analytics consumer — only needs summary data, doesn't fetch full payload
class AnalyticsEventConsumer {
  async handleOrderPlaced(message: Message): Promise<void> {
    // Only uses lightweight metadata — never fetches the full payload
    await this.analytics.recordOrderEvent({
      orderId: message.aggregateId,
      customerId: message.customerId,
      total: message.totalAmount,
      currency: message.currency,
      itemCount: message.itemCount,
      timestamp: message.occurredAt,
    });
    // payloadRef ignored — analytics doesn't need full order details
  }
}
```

### Step 4: Set appropriate lifecycle policies

Claim check objects in storage should not live forever:

```typescript
// S3 lifecycle policy via CloudFormation/CDK
const bucket = new s3.Bucket(this, 'ClaimCheckBucket', {
  lifecycleRules: [
    {
      id: 'delete-old-claim-checks',
      enabled: true,
      expiration: Duration.days(7),  // delete after 7 days
      prefix: 'claim-checks/',
    },
    {
      id: 'move-to-ia-after-1-day',
      enabled: true,
      transitions: [{
        storageClass: s3.StorageClass.INFREQUENT_ACCESS,
        transitionAfter: Duration.days(1),
      }],
    },
  ],
});
```

The lifecycle should be longer than your maximum processing time (including retries and DLQ processing) but not indefinitely long — storage costs add up.

### Step 5: Handle partial failures

What happens if the payload is stored in S3 but publishing to the message bus fails?

```typescript
async publishOrderPlaced(order: Order): Promise<void> {
  let payloadRef: string | undefined;
  
  try {
    const fullPayload = JSON.stringify(this.toOrderEvent(order));
    
    if (Buffer.byteLength(fullPayload) > this.sizeThresholdBytes) {
      payloadRef = await this.claimCheckStore.store(fullPayload, { ... });
    }
    
    await this.messageBus.publish({ ..., payloadRef });
    
  } catch (error) {
    // If message bus publish failed, clean up the stored payload
    // (it will never be consumed)
    if (payloadRef) {
      await this.claimCheckStore.delete(payloadRef).catch(deleteError => {
        // Log but don't throw — the lifecycle policy will clean it up
        this.logger.warn('Failed to clean up orphaned claim check', { payloadRef, deleteError });
      });
    }
    throw error;
  }
}
```

## When to Use

**Message payload exceeds broker limits.** AWS SQS (256KB), Azure Service Bus (256KB standard / 100MB premium), Kafka (1MB default) — when your payloads approach these limits, the Claim Check pattern is the standard solution.

**Messages contain sensitive data that not all consumers need.** When an event contains PII, PHI, or PCI data and some subscribers don't need it, Claim Check allows those subscribers to skip the sensitive data entirely. This reduces the blast radius for data breaches and simplifies compliance.

**High-throughput message buses with variable payload sizes.** Large messages slow down Kafka replication, increase consumer fetch latency, and reduce effective throughput. Keeping Kafka messages small and storing large payloads in S3 maintains broker performance.

**When you need storage tiering for payloads.** Message buses store everything the same way. Object storage allows lifecycle policies: move to infrequent access after a day, to Glacier after a week, delete after a month. This cost optimization isn't possible when payloads are embedded in messages.

**Payload sharing across multiple consumers.** If 10 consumers all need the same large payload, embedding it in the message means 10 copies traveling through the bus. With Claim Check, one copy is stored in S3 and 10 consumers fetch it independently. At scale, this is significant cost and bandwidth savings.

## When NOT to Use

**When messages are small.** If your average message is 5KB and your broker's limit is 256KB, Claim Check adds overhead (S3 call on publish, S3 call on consume) for no benefit. Profile your actual message sizes before adding complexity.

**When latency is critical.** The Claim Check pattern adds at minimum two network round trips: one to store the payload before publishing, one to fetch it before processing. For latency-sensitive operations (real-time bidding, game state synchronization), this overhead may be unacceptable.

**When the message bus itself is the right tool for the data.** Sometimes what you're doing is really bulk data transfer, and a message bus is the wrong tool entirely. If you're moving files between systems, use object storage directly with file-transfer tooling. Don't build a claim check system on top of a message bus to work around fundamental tool mismatch.

**When consumers always need the full payload.** If every consumer fetches the full payload for every message, you've doubled the I/O without any benefit. The pattern shines when some consumers don't need the payload, or when the payload is only needed conditionally.

## Common Mistakes

**Mistake 1: Deleting claim check objects too early.** If a consumer processes a message after retries and DLQ delays, the claim check object may have already been deleted. The consumer fetches a reference that no longer exists and fails. Set lifecycle policies conservatively — much longer than your maximum processing time including DLQ retention.

**Mistake 2: Not including routing metadata in the lightweight message.** Consumers that need to make routing decisions (should this consumer process this message?) must be able to do so without fetching the full payload. Include all routing-relevant fields in the message itself.

**Mistake 3: Orphaned claim check objects.** If publishing to the message bus fails after storing the payload, the payload is orphaned in object storage. It will never be consumed. Handle this with cleanup on failure and rely on lifecycle policies as a backstop.

**Mistake 4: Storing the reference as an opaque string without format documentation.** If the reference format changes (different storage backend, different key structure), consumers break silently. Document the reference format and version it.

**Mistake 5: Ignoring storage costs.** Claim checks in S3 accumulate. At high event rates, even small payloads add up. Set lifecycle rules for every claim check bucket — never leave them without expiration policies.

## Connections

**Competing Consumers** (Volume 03, article 09): Claim Check and competing consumers work naturally together. Multiple consumer instances can independently fetch the same claim check object from S3 — the storage is shared, not per-consumer.

**Choreography Pattern** (Volume 03, article 06): In choreographed architectures with large event payloads, Claim Check keeps the event bus performant while still allowing rich event data.

**Event Sourcing** (Volume 03, article 13): Event Sourcing stores domain events in an append-only log. When events contain large payloads (documents, images), Claim Check keeps the event store lean — the event log contains references, the object store contains data.

**Cache-Aside Pattern** (Volume 03, article 05): Claim check objects in S3 can be cached locally by consumers that process the same event type repeatedly. Cache the payload keyed by reference to avoid redundant S3 fetches.

## Key Insights

1. **The message bus is for coordination, not data transfer.** This is the fundamental insight behind the pattern. Message brokers excel at routing, ordering, and delivery guarantees for small messages. Object storage excels at bulk data storage. Use each for what it's designed for.

2. **Routing metadata in the lightweight message is the design lever.** The design question is: what must be in the message versus what can be in the payload? Get this right and consumers that don't need the payload won't fetch it. Get it wrong and every consumer fetches the payload.

3. **Lifecycle policies are mandatory, not optional.** Claim check objects without expiry policies become an unbounded storage cost. Set expiry at the time you create the bucket, not later.

4. **The reference format is a contract.** Changing the reference format (different S3 bucket, different key structure, different storage backend) breaks all consumers. Treat it as a versioned API.

5. **Security of claim check objects needs attention.** If the reference is guessable (sequential IDs, predictable keys), an attacker who intercepts a message can guess other objects. Use random UUIDs in the key. Apply appropriate S3 bucket policies and IAM permissions.

6. **The pattern is invisible when done well.** A well-implemented Claim Check system (like the AWS SQS Extended Client) is transparent to application code. Producers and consumers work with normal message objects; the splitting and fetching is handled by the library layer.

7. **Consider pre-signed URLs for consumer access control.** Rather than giving all consumers direct S3 access, the claim check reference can be a pre-signed URL with a short expiry. This limits which services can access which payloads and for how long.
