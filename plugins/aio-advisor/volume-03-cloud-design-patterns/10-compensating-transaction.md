# Compensating Transaction Pattern

> "In a distributed system, you cannot have a global transaction. What you can have is a sequence of local transactions with compensation logic to undo them if something goes wrong." — Pat Helland, Microsoft Research

## The Problem

You are building a hotel booking system. A customer books a hotel, a flight, and a rental car — three separate services, three separate databases, three separate teams. In a monolith with a shared database, this is trivial: wrap all three in a transaction, and if any fails, the database rolls everything back atomically. Either all three are booked, or none are.

In a distributed microservices world, you cannot do this. There is no distributed ACID transaction that spans three independent services with three independent databases. The two-phase commit protocol (2PC) theoretically enables this, but it requires all participants to hold locks during the coordination phase, which kills performance and availability. When the coordinator crashes mid-commit, participants are left in an uncertain state. 2PC is rarely the right answer at internet scale.

So you proceed without 2PC. You book the hotel successfully. You book the flight successfully. Then the car rental service returns an error — no cars available for those dates. The hotel is booked. The flight is booked. But the overall booking failed because the car rental failed. The customer expects either a complete booking or no booking. You have given them a partial booking, which is worse than either.

The Compensating Transaction pattern addresses this. When a step in a distributed workflow fails, you don't roll back (you can't — the transactions have already committed in their respective databases). Instead, you execute compensating transactions: operations that semantically undo the effects of the completed steps. Cancel the hotel booking. Cancel the flight. The customer ends up in their original state.

This is the foundation of the Saga pattern, though compensating transactions are a broader concept that appears wherever eventually consistent workflows run across independent systems.

## Core Concept

A compensating transaction is an operation that semantically reverses the effect of a previously completed transaction. It is not a database rollback — the original transaction has committed and its effects are permanent. The compensating transaction creates a new transaction whose effect is the inverse of the original.

```
NORMAL FLOW (all succeed):
Step 1: Book Hotel ──▶ [COMMITTED: Hotel Reserved]
Step 2: Book Flight ──▶ [COMMITTED: Flight Reserved]
Step 3: Book Car ──▶ [COMMITTED: Car Reserved]
Result: ✓ Complete booking

FAILURE AND COMPENSATION:
Step 1: Book Hotel ──▶ [COMMITTED: Hotel Reserved]
Step 2: Book Flight ──▶ [COMMITTED: Flight Reserved]
Step 3: Book Car ──▶ FAILED: No cars available
                              │
                    ┌─────────▼──────────┐
                    │   Compensation     │
                    │   (run backward)   │
                    └─────────┬──────────┘
                              │
Compensate Step 2: Cancel Flight ──▶ [COMMITTED: Flight Cancelled]
Compensate Step 1: Cancel Hotel ──▶ [COMMITTED: Hotel Cancelled]
Result: Customer back to original state
```

### Three transaction types in a Saga

Not all steps in a saga are equal. Hector Garcia-Molina and Kenneth Salem's original Saga paper (1987) defined three types:

**Compensable transactions**: Can be semantically undone. Book hotel → can be cancelled. Reserve inventory → can be released. These are the steps that need corresponding compensation logic.

**Pivot transaction**: The point of no return. Once this commits, the saga will complete forward (no compensation). In the booking example, charging the customer's card might be the pivot — after charging, you're committed to completing the booking.

**Retryable transactions**: After the pivot, these steps must eventually succeed. They may be retried indefinitely. Sending the confirmation email, updating the inventory count, notifying the warehouse — these happen after the commitment and must complete.

```
[Compensable] → [Compensable] → [PIVOT] → [Retryable] → [Retryable]
     ↑                ↑                        ↓               ↓
  Can undo         Can undo              Must succeed    Must succeed
```

Understanding which category each step falls into is critical for designing the compensation logic correctly.

### Compensation is not simple undo

This is the most important distinction. A database rollback returns the system to exactly its prior state — as if the transaction never happened. A compensating transaction cannot do this. The world has moved on.

Consider: you sent a confirmation email as part of step 2. The hotel received the reservation and may have blocked the room for other customers. The customer may have made downstream plans based on the hotel confirmation. A compensation that "cancels the hotel" creates a new transaction with new effects. The email has already been sent. The hotel's system shows the room as occupied until the cancellation processes. The world is aware of the original transaction.

This means compensating transactions must be designed as first-class business operations, not as technical rollbacks. "Cancel hotel booking" is a real business operation with its own logic: it may trigger a cancellation fee, it needs to send a cancellation notification, it needs to update the hotel's availability calendar.

## Deep Dive

**The theoretical foundation: why distributed transactions fail.** Martin Kleppmann's *Designing Data-Intensive Applications* provides the clearest analysis of why traditional distributed transactions — two-phase commit, XA transactions — are unsuitable for microservices and cloud-native systems. 2PC requires a coordinator that holds locks across all participants for the duration of the transaction. In a distributed system, a coordinator crash or a slow participant causes all participants to block indefinitely with locks held. Kleppmann documents the practical consequence: 2PC is a source of latency, deadlocks, and single-point-of-failure risk that scales inversely with the number of participants. The compensating transaction pattern abandons the goal of atomic cross-system commits and instead accepts that partial execution is inevitable, designing explicit business operations to reverse already-committed steps when the overall workflow cannot complete.

**Compensations are not rollbacks.** Michael Nygard's *Release It!* draws a crucial distinction between database rollbacks and compensating transactions. A database rollback is a technical operation that restores state as if the transaction never happened — it is invisible to the business domain. A compensating transaction is a business operation that acknowledges something happened and explicitly reverses it. "Cancel hotel booking" is not a technical undo — it may trigger a cancellation fee, it notifies the hotel's inventory system, it sends a confirmation email to the customer. Nygard's framing: compensations must be treated as first-class domain operations with their own error handling, retry logic, and observable outcomes. The temptation to treat compensation as a technical rollback leads to compensation logic that is untested, undocumented, and fails silently in production.

**The saga pattern as a structured compensation framework.** Kleppmann's analysis of sagas — and the earlier formalization by Hector Garcia-Molina and Kenneth Salem in their 1987 paper — provides the mathematical structure: a saga is a sequence of transactions T1, T2, ..., Tn, each with a compensating transaction C1, C2, ..., Cn. If Ti fails, the system executes Ci-1, Ci-2, ..., C1 in reverse order. Kleppmann extends this with the distinction between backward recovery (compensate everything, return to initial state) and forward recovery (retry the failed step until it succeeds). The choice between them depends on whether the failed step has a meaningful retry possibility: transient network errors warrant forward recovery; business constraint violations (no seats available, payment declined) warrant backward recovery.

**The pivot transaction and the compensation boundary.** Sam Newman's *Building Microservices* identifies the concept of the pivot transaction — the step in a saga after which compensation is no longer possible or no longer makes business sense. Once a payment is captured (not just authorized), "cancellation" means a refund, not a void. Once a warehouse picks an order, cancellation requires a physical recall operation. Newman's guidance is to identify the pivot explicitly during design and to accept that steps before the pivot are compensable while steps after the pivot must be retried or handled through forward recovery. Misidentifying the pivot — or failing to identify it at all — leads to compensation logic that attempts to reverse irrevocable business operations, which either fails technically or creates customer-visible inconsistencies.

**Compensation idempotency and the crash-during-compensation problem.** Kleppmann's treatment of fault tolerance in distributed workflows highlights a failure mode specific to compensation: the compensating transaction itself may fail partway through execution. If the saga coordinator crashes after executing C2 but before executing C1, the system is in a partially-compensated state — worse than the original failure because C2's effects are already applied. Nygard's *Release It!* treatment of retries applies here: every compensating transaction must be idempotent and retryable. The coordinator must persist its compensation state durably so that it can resume the compensation workflow from the point of failure, not from the beginning. This requires the same durable execution semantics for compensation workflows that are required for forward workflows — compensation is not simpler than forward execution, it is equally complex.

**Observability and compensation audit trails.** The Google SRE Book's treatment of incident response emphasizes the importance of understanding the causal chain of system state changes. In a system using compensating transactions, understanding the current state of any saga instance requires reconstructing the sequence of forward and compensating operations applied. Hohpe and Woolf's *Enterprise Integration Patterns* recommends maintaining an explicit audit log for every saga step and every compensation executed, with timestamps, success/failure status, and idempotency keys. This audit log serves two purposes: it enables the compensation coordinator to resume after crashes without re-executing already-completed steps, and it provides the operational visibility needed to diagnose partial failures. Without this log, debugging a production saga failure requires reconstructing state from multiple independent service logs, which is operationally intractable at scale.

## Implementation Guide

### Step 1: Map your saga steps and their compensations

Before writing code, document the saga:

```
Step                  Compensation              Notes
──────────────────────────────────────────────────────────────────
1. Reserve inventory  Release inventory         No fee
2. Authorize payment  Void authorization        Within 72h window
3. Create order       Cancel order              Sends cancellation email
4. [PIVOT] Capture    Issue refund              Fee may apply
5. Notify warehouse   Recall picking order      Only if not yet picked
6. Send confirmation  (no compensation needed)  Retryable — email already sent
```

Note the pivot clearly. Steps before pivot are compensable. Steps after pivot are retryable.

### Step 2: Implement compensations as first-class operations

```typescript
class InventoryService {
  async reserveInventory(orderId: string, items: OrderItem[]): Promise<ReservationId> {
    // Reserve stock
    const reservation = await this.db.transaction(async (tx) => {
      for (const item of items) {
        await tx.query(
          `UPDATE inventory SET reserved = reserved + $1 
           WHERE sku = $2 AND (available - reserved) >= $1`,
          [item.quantity, item.sku],
        );
      }
      return await tx.query(
        `INSERT INTO reservations (order_id, items, status) VALUES ($1, $2, 'active')
         RETURNING id`,
        [orderId, JSON.stringify(items)],
      );
    });
    return reservation.rows[0].id;
  }

  // Compensation: release the reservation
  async releaseReservation(reservationId: ReservationId): Promise<void> {
    await this.db.transaction(async (tx) => {
      const reservation = await tx.query(
        'SELECT * FROM reservations WHERE id = $1 AND status = $2',
        [reservationId, 'active'],
      );
      
      if (!reservation.rows[0]) {
        // Already released or never existed — idempotent
        return;
      }
      
      const items = JSON.parse(reservation.rows[0].items);
      
      for (const item of items) {
        await tx.query(
          `UPDATE inventory SET reserved = reserved - $1 WHERE sku = $2`,
          [item.quantity, item.sku],
        );
      }
      
      await tx.query(
        `UPDATE reservations SET status = 'released', released_at = NOW() WHERE id = $1`,
        [reservationId],
      );
    });
  }
}
```

Compensations must be idempotent. The compensation coordinator may call them multiple times.

### Step 3: Implement saga coordinator with state persistence

```typescript
interface SagaState {
  sagaId: string;
  status: 'running' | 'compensating' | 'completed' | 'failed';
  completedSteps: Array<{ step: string; result: unknown }>;
  failedStep: string | null;
  createdAt: string;
  updatedAt: string;
}

class OrderSagaCoordinator {
  async execute(command: PlaceOrderCommand): Promise<void> {
    const sagaId = crypto.randomUUID();
    const saga = await this.persistSaga({ sagaId, status: 'running', completedSteps: [] });

    let reservationId: string | null = null;
    let authorizationId: string | null = null;

    try {
      // Step 1: Reserve inventory
      reservationId = await this.inventoryService.reserveInventory(
        command.orderId, command.items,
      );
      await this.recordStep(sagaId, 'reserveInventory', { reservationId });

      // Step 2: Authorize payment
      authorizationId = await this.paymentService.authorizePayment(
        command.customerId, command.totalAmount,
      );
      await this.recordStep(sagaId, 'authorizePayment', { authorizationId });

      // Step 3: Create order record
      await this.orderService.createOrder(command);
      await this.recordStep(sagaId, 'createOrder', { orderId: command.orderId });

      // PIVOT: Capture payment
      await this.paymentService.capturePayment(authorizationId);
      await this.recordStep(sagaId, 'capturePayment', {});

      // Retryable steps (after pivot — must eventually succeed)
      await this.retryUntilSuccess(() =>
        this.warehouseService.notifyWarehouse(command.orderId)
      );
      await this.retryUntilSuccess(() =>
        this.notificationService.sendConfirmation(command.customerId, command.orderId)
      );

      await this.completeSaga(sagaId);

    } catch (error) {
      // Compensation — run backward
      await this.updateSagaStatus(sagaId, 'compensating');

      try {
        if (authorizationId) {
          await this.paymentService.voidAuthorization(authorizationId);
        }
        if (reservationId) {
          await this.inventoryService.releaseReservation(reservationId);
        }
      } catch (compensationError) {
        // Compensation failed — needs manual intervention
        await this.alertOps('Saga compensation failed', { sagaId, compensationError });
      }

      await this.failSaga(sagaId, error.message);
      throw error;
    }
  }

  private async retryUntilSuccess(fn: () => Promise<void>, maxAttempts = 10): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await fn();
        return;
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await sleep(Math.min(1000 * Math.pow(2, attempt), 30000)); // exponential backoff
      }
    }
  }
}
```

### Step 4: Handle compensation failures

Compensation can fail too. The hotel's cancellation API might be down. The payment void might timeout. You need a strategy:

```typescript
async compensateWithFallback(step: CompensationStep): Promise<void> {
  try {
    await step.execute();
  } catch (error) {
    // Log and queue for manual review
    await this.compensationRetryQueue.push({
      step: step.name,
      params: step.params,
      failedAt: new Date().toISOString(),
      error: error.message,
      retryCount: 0,
    });
    
    // Alert operations team
    await this.alerting.critical(
      `Saga compensation failed: ${step.name}`,
      { sagaId: step.sagaId, error },
    );
  }
}
```

Failed compensations that cannot be automated require manual intervention. Build a compensation dashboard for operations teams.

### Step 5: Make compensation idempotent and safe to replay

```typescript
async releaseReservation(reservationId: string): Promise<void> {
  // Idempotent: check current state before acting
  const reservation = await this.db.findReservation(reservationId);
  
  if (!reservation) {
    logger.info('Reservation not found — may have never been created', { reservationId });
    return; // Nothing to compensate
  }
  
  if (reservation.status === 'released') {
    logger.info('Reservation already released', { reservationId });
    return; // Already compensated — idempotent
  }
  
  if (reservation.status === 'fulfilled') {
    // This shouldn't happen — we're compensating a fulfilled reservation
    throw new Error(`Cannot compensate fulfilled reservation ${reservationId}`);
  }
  
  await this.performRelease(reservation);
}
```

## When to Use

**Multi-step workflows spanning multiple services.** Any time you need to perform a sequence of operations across independent services — each with their own database — and the operations must be atomically committed or fully reversed, compensating transactions are the answer.

**Long-running processes.** 2PC holds locks for the duration of the transaction. For workflows that take seconds, minutes, or hours (travel booking, loan approval, supply chain operations), locks are impractical. Saga with compensation enables long-running consistency without locks.

**When rollback is impossible but semantic undo is possible.** You cannot unsend an email. You cannot undo a payment that has already settled. But you can send a cancellation email. You can issue a refund. Compensation creates a new forward state that achieves the semantic equivalent of rollback.

**Regulatory or business process workflows.** Insurance claims, loan approvals, compliance workflows — these inherently involve multiple steps with well-defined reversal procedures. The compensation logic maps directly to the business reversal process.

## When NOT to Use

**When a single-service transaction handles everything.** If all the data for your workflow lives in one database, use a database transaction. Simple, reliable, no compensation logic needed.

**When the workflow has no meaningful compensation.** Some operations genuinely cannot be compensated: you've already shipped the physical goods. The compensation strategy here is a new forward operation (return merchandise authorization), not a semantic undo. Design for this explicitly.

**When eventual consistency is acceptable without compensation.** Some failures in long workflows are acceptable to leave partially completed if the business can tolerate it. Not every failure requires compensation. Understand the business requirements before over-engineering.

**When two-phase commit is actually viable.** For short-lived transactions across a small number of participants that all support 2PC (most relational databases do), 2PC may be simpler than saga with compensation. The tradeoff: 2PC is fragile under coordinator failure; sagas are more complex to implement but more resilient.

## Common Mistakes

**Mistake 1: Treating compensation as database rollback.** Developers often write compensation code that tries to exactly reverse the original transaction — deleting the record, decrementing the counter back. This breaks when concurrent operations have occurred between the original transaction and the compensation. Design compensations as forward business operations, not rollbacks.

**Mistake 2: Non-idempotent compensations.** If the compensation coordinator crashes mid-compensation and retries, compensations run twice. A double void of a payment authorization, a double release of inventory — these cause real problems. Every compensation must be idempotent.

**Mistake 3: Not designing for compensation failure.** Compensation can fail. The hotel cancellation API may be down. The payment gateway may timeout. You need a strategy for compensation failures: retry queue, manual intervention workflow, operations alerting. "Compensation will always succeed" is not a valid assumption.

**Mistake 4: Compensating retryable steps.** Steps after the pivot must succeed — they should be retried, not compensated. Compensating a step that has already been flagged as "must complete" creates confusion about the intended final state.

**Mistake 5: No saga state persistence.** If the saga coordinator crashes mid-execution, it needs to know where it was. Without persisted saga state, crashed sagas leave the system in an unknown partial state with no way to recover. Always persist saga state before each step.

## Connections

**Choreography Pattern** (Volume 03, article 06): Compensation can be implemented via choreography (each service publishes a compensation event when it receives a failure event) or via orchestration (a saga coordinator calls compensation endpoints). Orchestration is generally easier to reason about for compensation.

**Competing Consumers** (Volume 03, article 09): Compensation commands are often implemented as messages processed by competing consumers — multiple instances of the saga coordinator process compensation commands from a queue.

**Circuit Breaker Pattern** (Volume 03, article 07): During saga execution, circuit breakers protect individual steps. When a step's circuit is open, the saga fails fast to the compensation phase rather than hanging indefinitely.

**Event Sourcing** (Volume 03, article 13): In event-sourced systems, compensation events are appended to the event log. The compensation event, not a deletion of prior events, is how the reversal is recorded. The audit trail remains complete.

**Idempotency**: Every compensation step must be idempotent. This is not a pattern but a property — build it in from the start.

## Key Insights

1. **Compensation is a business operation, not a technical rollback.** The world has moved on since the original transaction committed. Compensation creates a new transaction whose effect is semantically equivalent to undoing the original. Design it as a business process.

2. **The pivot transaction is your design anchor.** Identify it first. Everything before the pivot can be compensated. Everything after the pivot must succeed. The pivot is typically the moment of irrevocable commitment — payment capture, physical shipment, external notification.

3. **Idempotency of compensations is non-negotiable.** The compensation coordinator will call your compensation endpoint multiple times. If your compensation isn't idempotent, you will double-void authorizations, double-release inventory, double-cancel bookings. This is worse than the original failure.

4. **Compensation failure needs a human escape hatch.** Automated compensation is the goal; manual resolution is the backstop. Build the operations tooling for manual compensation from day one. You will need it.

5. **Saga state persistence is the compensation coordinator's memory.** If the coordinator crashes, persisted state tells it what has been completed, what needs compensation, and what compensation has been performed. Without this, crashed sagas are irrecoverable by software.

6. **Test your compensation paths as rigorously as your happy paths.** Compensation code is often untested because failures are rare in development. Production failures are where you discover that your compensation logic is broken. Chaos engineering — deliberately failing individual saga steps — surfaces compensation bugs before they affect customers.

7. **Long-running sagas need timeout compensation.** A saga that starts but never finishes (participant disappears, message lost) needs a timeout-triggered compensation path. Design a saga reaper that identifies stalled sagas and triggers compensation after a configurable timeout.
