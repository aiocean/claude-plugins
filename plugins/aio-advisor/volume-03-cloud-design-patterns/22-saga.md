# Saga Pattern

> "A distributed transaction is just a local transaction that hasn't realized yet how many things can go wrong."

## The Problem

You run an e-commerce platform. When a customer places an order, you need to: deduct the payment, reserve inventory, create the shipment record, and send the confirmation email. Each of these lives in a separate microservice with its own database. You need all four to succeed, or the entire operation must be undone. Partial success — payment taken but inventory not reserved — leaves the system in an inconsistent state that is extremely difficult to detect and repair.

In a monolithic system with a shared relational database, this is trivially solved with ACID transactions: wrap all four operations in `BEGIN TRANSACTION; ...; COMMIT;`. If anything fails, `ROLLBACK` undoes everything atomically. But in a microservices architecture, each service owns its data. There is no shared database to wrap in a transaction. The standard distributed transaction protocol — Two-Phase Commit (2PC) — exists precisely for this purpose, but it has severe problems at scale: it is slow (two network round-trips required for every transaction), it holds locks across services for the duration, and it requires a transaction coordinator that becomes a single point of failure. Google, Amazon, and Netflix all rejected 2PC for their high-scale microservices systems.

The Saga pattern is the alternative. A saga is a sequence of local transactions, each of which publishes events or sends messages to trigger the next. If any step fails, the saga executes compensating transactions to undo the work already done. There is no global lock, no coordinator blocking all participants, and no two-phase commit protocol. The trade-off: you don't get atomicity — the saga is eventually consistent rather than immediately consistent, and you must explicitly design the compensation logic for every step.

## Core Concept

A saga is a sequence of transactions T1, T2, ..., Tn where each Ti has a corresponding compensating transaction Ci that semantically undoes Ti. If Tk fails, the saga executes Ck-1, Ck-2, ..., C1 to undo all previously completed transactions.

```
Happy path:
  T1 (deduct payment) -> T2 (reserve inventory) -> T3 (create shipment) -> T4 (send email)
  
Failure at T3:
  T1 ✓ -> T2 ✓ -> T3 ✗
               -> C2 (release inventory) -> C1 (refund payment)
  
The compensating transactions restore consistency.
Note: C4 is not needed because T4 never ran.
```

### Transaction Types

Not all saga steps are created equal. The Saga pattern distinguishes three transaction types:

**Compensable transactions:** Can be undone by a compensating transaction. Example: reserving inventory can be undone by releasing the reservation. These are steps T1 through Tk-1 before the pivot.

**Pivot transaction:** The transaction that is either the last step before irreversible work begins, or the step that determines success/failure of the whole saga. After the pivot succeeds, the saga will complete. Before it succeeds, the saga can be rolled back. Example: charging the credit card is often the pivot — it's the point of no return.

**Retryable transactions:** Steps after the pivot that are guaranteed to succeed eventually (possibly with retries). They are not rolled back; they are retried until successful. Example: sending a confirmation email — if the email service is temporarily down, retry. Don't roll back the whole order because of a temporary email outage.

```
Saga structure with transaction types:

[Compensable] -> [Compensable] -> [PIVOT] -> [Retryable] -> [Retryable]
    T1              T2             T3           T4             T5
(reserve inv)   (auth payment) (capture)   (create ship)  (send email)

If T1 or T2 fails: rollback with C2, C1
If T3 (pivot) fails: rollback with C2, C1
After T3 succeeds: T4 and T5 are retried until success (never rolled back)
```

### Choreography vs Orchestration

There are two ways to coordinate saga participants:

**Choreography (event-driven):** Each service publishes events when it completes its transaction. Other services subscribe to those events and execute their own transactions. No central coordinator. The saga's state is distributed across all participants.

```
OrderService publishes: OrderCreated
  -> PaymentService subscribes, executes payment, publishes: PaymentAuthorized
    -> InventoryService subscribes, reserves stock, publishes: InventoryReserved
      -> ShipmentService subscribes, creates shipment, publishes: ShipmentCreated
        -> NotificationService subscribes, sends email, publishes: OrderConfirmed

Failure:
  InventoryService publishes: InventoryReservationFailed
    -> PaymentService subscribes, refunds payment, publishes: PaymentRefunded
      -> OrderService subscribes, cancels order, publishes: OrderCancelled
```

**Orchestration (state machine):** A central orchestrator service knows all the steps and explicitly tells each participant what to do. The orchestrator drives the saga forward and handles failures.

```
SagaOrchestrator:
  1. Call PaymentService.authorize(order)
     Success -> step 2
     Failure -> abort (no compensation needed yet)
  
  2. Call InventoryService.reserve(order)
     Success -> step 3
     Failure -> call PaymentService.refund(order), abort
  
  3. Call ShipmentService.create(order)
     Success -> step 4
     Failure -> call InventoryService.release(order),
                call PaymentService.refund(order), abort
  
  4. Call NotificationService.sendConfirmation(order)
     Retry until success (retryable)
```

| Dimension | Choreography | Orchestration |
|-----------|-------------|---------------|
| Coupling | Loose (event-based) | Tighter (orchestrator knows all) |
| Visibility | Hard to see overall saga state | Centralized state in orchestrator |
| Complexity | Distributed, hard to reason | Centralized, easier to reason |
| Cyclic deps | Risk of event cycles | Orchestrator owns the graph |
| Testing | Harder (must simulate events) | Easier (test orchestrator directly) |
| Scale | Better (no coordinator bottleneck) | Coordinator can be bottleneck |

For complex sagas (5+ steps, conditional branches), orchestration is almost always preferable for its debuggability. For simple 2-3 step flows, choreography works well.

## Deep Dive

**The theoretical origin: Garcia-Molina and Salem's 1987 paper.** The saga pattern was formally defined by Hector Garcia-Molina and Kenneth Salem in their 1987 paper "Sagas," published in the ACM SIGMOD Record. Their original context was long-lived database transactions — transactions that span hours or days and hold locks for their entire duration, blocking other transactions and reducing throughput. Their solution: break the long transaction into a sequence of shorter transactions, each of which commits independently, with a corresponding compensating transaction for each step to be executed if the overall saga cannot complete. Martin Kleppmann's *Designing Data-Intensive Applications* contextualizes this in modern distributed systems: the saga pattern is the standard approach for maintaining consistency across independent services that each have their own ACID databases, where a distributed transaction spanning all services is unavailable or impractical.

**Orchestration versus choreography: the coordination topology decision.** Chris Richardson's work on microservices patterns (documented at microservices.io) formalizes the distinction between orchestration-based and choreography-based sagas. In an orchestration-based saga, a central coordinator (the orchestrator) explicitly invokes each participant and handles failures. In a choreography-based saga, each participant publishes events and reacts to events published by others — there is no central coordinator. Hohpe and Woolf's *Enterprise Integration Patterns* provides the deeper analysis: orchestration concentrates workflow logic in one place (easier to understand, harder to scale); choreography distributes workflow logic across participants (easier to scale, harder to observe). The practical consequence documented by Sam Newman in *Building Microservices*: choreography-based sagas are harder to debug because understanding the current state of a saga instance requires correlating events across multiple services. Newman's guidance: for simple 2-3 step flows, choreography works well; for complex multi-step flows with branching and compensation, orchestration provides necessary visibility.

**Durable execution and the coordinator crash problem.** Kleppmann's *Designing Data-Intensive Applications* identifies the most dangerous failure mode in saga orchestration: the coordinator crashes mid-execution. If the coordinator crashes after invoking step 3 but before recording that step 3 succeeded, it may re-invoke step 3 on recovery — making step 3 idempotency critical. If the coordinator crashes after recording step 3 but before invoking step 4, recovery must resume from step 4, not restart the saga. This requires durable state persistence for the orchestrator: the coordinator's current position in the saga must be persisted durably after each step. The Google SRE Book's treatment of data durability applies: the coordinator's state store must have the same availability and durability requirements as the most critical service in the saga, because coordinator failure means the entire saga is stalled.

**The isolation problem: dirty reads in saga execution.** Kleppmann's analysis of transaction isolation levels applies to sagas in a way that is often overlooked. In a traditional ACID transaction, intermediate states are not visible to other transactions — the isolation property. In a saga, each step commits independently, making intermediate states visible. If a customer's order is in the middle of a saga (payment authorized but inventory not yet reserved), another saga or query can observe this partially-committed state. The classic anomaly: a report of "revenue from authorized payments" includes payments for orders that will ultimately fail and be refunded. Kleppmann's guidance: applications using sagas must be designed to tolerate dirty reads at the saga level, either by using semantic locks (marking records as "in-progress" during saga execution), commutative updates (designing steps to be order-independent), or pessimistic approaches (reading only committed saga results). The saga pattern does not provide isolation — it must be designed for.

**Process manager versus saga.** Hohpe and Woolf's *Enterprise Integration Patterns* distinguish between two related patterns: the Saga (compensating transactions for distributed consistency) and the Process Manager (long-running workflow coordination). The process manager is a more general concept: it maintains state for a business process, receives events, and decides which action to take next — it is not limited to the compensation model of a saga. In practice, production implementations of saga-like patterns are often process managers: they handle branching logic, human approval steps, timeout handling, and retry policies that go beyond the linear compensation model of the original saga definition. Understanding the distinction helps in tooling selection: a saga orchestrator (designed for compensation patterns) may be the wrong tool for a general workflow manager, and a general workflow engine may be over-engineered for a simple 3-step compensation saga.
        payment = await context.CallActivityAsync<PaymentResult>(
            "AuthorizePayment", order);
        
        inventory = await context.CallActivityAsync<InventoryResult>(
            "ReserveInventory", order);
        
        // Pivot: after this, we retry rather than compensate
        await context.CallActivityAsync("CapturePayment", payment);
        
        // Retryable transactions
        await context.CallActivityWithRetryAsync("CreateShipment", 
            new RetryOptions(TimeSpan.FromSeconds(5), 3), order);
        
        await context.CallActivityWithRetryAsync("SendConfirmation",
            new RetryOptions(TimeSpan.FromSeconds(10), 5), order);
    }
    catch (Exception) {
        // Compensate in reverse order
        if (inventory != null)
            await context.CallActivityAsync("ReleaseInventory", inventory);
        if (payment != null)
            await context.CallActivityAsync("RefundPayment", payment);
        throw;
    }
}
```

Durable Functions persists orchestration state in Azure Storage automatically. Replays from checkpoints handle crashes and restarts transparently.

**Temporal and Cadence:** Uber's Cadence (and its open-source fork, Temporal) is increasingly the framework of choice for saga orchestration outside of cloud-specific managed services. Temporal lets you write saga orchestration as ordinary code (Go, Java, TypeScript) with built-in durability:

```go
func OrderSaga(ctx workflow.Context, order Order) error {
    var paymentID string
    var inventoryID string
    
    // Compensable: authorize payment
    if err := workflow.ExecuteActivity(ctx, AuthorizePayment, order).Get(ctx, &paymentID); err != nil {
        return err
    }
    defer func() {
        if err != nil {
            workflow.ExecuteActivity(ctx, RefundPayment, paymentID)
        }
    }()
    
    // Compensable: reserve inventory
    if err := workflow.ExecuteActivity(ctx, ReserveInventory, order).Get(ctx, &inventoryID); err != nil {
        return err
    }
    defer func() {
        if err != nil {
            workflow.ExecuteActivity(ctx, ReleaseInventory, inventoryID)
        }
    }()
    
    // Pivot: capture payment (point of no return)
    if err := workflow.ExecuteActivity(ctx, CapturePayment, paymentID).Get(ctx, nil); err != nil {
        return err
    }
    
    // Retryable: create shipment (retry until success)
    ao := workflow.ActivityOptions{RetryPolicy: &temporal.RetryPolicy{MaximumAttempts: 10}}
    workflow.ExecuteActivity(workflow.WithActivityOptions(ctx, ao), CreateShipment, order).Get(ctx, nil)
    
    return nil
}
```

Temporal handles durability, retries, timeouts, and saga state persistence automatically. Workflows survive process crashes, deployments, and infrastructure failures.

## Implementation Guide

### Step 1: Identify Saga Boundaries

A saga should encompass exactly the operations that must be atomically consistent from a business perspective. Not every multi-service operation needs a saga:

- If operations are genuinely independent (each can succeed or fail independently): no saga needed
- If eventual consistency is acceptable (one succeeds now, others catch up): no saga needed  
- If all-or-nothing semantics are required: saga needed

### Step 2: Design Compensating Transactions

For every compensable step, design its compensation before writing the happy path:

```
Step: AuthorizePayment(order)
  Compensation: VoidAuthorization(paymentAuthId)
  Note: Voids an auth that hasn't been captured. NOT a refund.
  
Step: ReserveInventory(order)
  Compensation: ReleaseReservation(reservationId)
  
Step: CapturePayment(paymentAuthId)
  This is the PIVOT. After this, no compensation possible.
  Subsequent failures use refunds (business process), not saga compensations.
```

Key: compensating transactions must be idempotent. The orchestrator may call them multiple times during failure recovery.

### Step 3: Handle Saga Data Anomalies

Microsoft's documentation on sagas identifies six data anomalies that sagas must address because they lack isolation:

1. **Lost updates**: Two sagas update the same record; one overwrites the other's changes. Use optimistic locking (version fields).

2. **Dirty reads**: One saga reads uncommitted changes from another. Use semantic locks or countermeasures.

3. **Fuzzy/non-repeatable reads**: A saga reads a value that changes mid-saga. Use snapshots.

The key countermeasures:
- **Semantic locks**: Flag records being modified by a saga (`status: PENDING`). Other sagas refuse to modify locked records.
- **Commutative updates**: Design updates to be order-independent (increment balance rather than set balance).
- **Pessimistic views**: In compensable transactions, use the worst-case value.

### Step 4: Choose Orchestration Framework

| Framework | Cloud | Language | When to Use |
|-----------|-------|----------|-------------|
| AWS Step Functions | AWS | JSON (ASL) | AWS-native, managed, no ops |
| Azure Durable Functions | Azure | C#, Python, JS | Azure-native, serverless |
| Google Cloud Workflows | GCP | YAML | GCP-native |
| Temporal | Any | Go, Java, TS, Python | Complex workflows, multi-cloud |
| Cadence | Any | Go, Java | Uber heritage, large community |
| MassTransit (Automatonymous) | Any | C# | .NET microservices |

## When to Use / When NOT to Use

**Use when:**
- Multiple microservices must participate in a logically atomic operation
- 2PC is unacceptable due to lock contention, coordinator failure risk, or performance
- Services own separate databases and cannot share a transaction
- Eventual consistency between services is acceptable during the saga's execution

**When 2PC is actually better:**
- Few services involved (2-3), all under same team control
- Data must never be visible in an intermediate state
- Transaction duration is extremely short (milliseconds)
- Infrastructure supports 2PC natively (some databases and XA-compatible resources)
- Business absolutely cannot tolerate the complexity of designing compensating transactions

## Common Mistakes

**Mistake 1: Missing idempotency in compensating transactions.** The orchestrator may call compensations multiple times (network failure after the compensation runs but before acknowledgment). A compensation that isn't idempotent will double-refund, double-release, or otherwise corrupt state.

**Mistake 2: Compensating pivot transactions.** After the payment is captured, it cannot be "undone" in the same way as an authorization void. Trying to roll back the pivot creates a refund (a new business operation), not an undone transaction. Design your saga so that true rollback stops at the pivot; post-pivot failures are handled by forward-recovery or business refund processes.

**Mistake 3: Ignoring data anomalies.** Saga steps run concurrently with other sagas. Without semantic locks or other countermeasures, two sagas can update the same inventory record simultaneously, producing incorrect results. Design isolation mechanisms explicitly.

**Mistake 4: Choreography for complex flows.** A 7-step saga with conditional branches, parallel paths, and timeout handling implemented via event choreography becomes a distributed state machine that is almost impossible to debug. Use orchestration when the logic is complex.

**Mistake 5: No saga observability.** A saga running across five services with no centralized view of its state. When a customer calls asking where their order is stuck, you have no way to find it. Always instrument saga state (step, status, correlation ID) in a queryable store. Step Functions and Temporal provide this out of the box.

## Connections

**Publisher-Subscriber** (Article 19): Choreography-based sagas use pub/sub as the coordination backbone. Each service publishes completion events; others subscribe and react.

**Retry Pattern** (Article 21): Retryable saga steps (after the pivot) implement the Retry pattern. The orchestrator retries until success. Temporal and Step Functions handle this declaratively.

**Event Sourcing**: Sagas and event sourcing complement each other naturally. The saga's steps are events in an event log; compensation is a new compensating event appended to the log. The current state is always derivable from the event history.

**Queue-Based Load Leveling** (Article 20): Saga steps in a choreography-based saga are often mediated by queues. Each service subscribes to a queue, processes the event, and publishes to the next queue. Load leveling protects each service from event storms.

## Key Insights

1. **Sagas are eventual consistency, not distributed atomicity.** During a saga's execution, intermediate states are visible to other transactions. This is the fundamental trade-off. Design your system to tolerate these intermediate states or use semantic locks to prevent anomalies.

2. **Compensating transactions are not rollbacks.** A database rollback undoes changes as if they never happened. A saga compensation is a new business operation that semantically undoes a completed transaction. The original transaction happened. The compensation is a new event. This distinction matters for audit logs and data integrity.

3. **The pivot transaction is the point of no return.** Identify it explicitly. Before the pivot: the saga can be safely aborted and compensated. After the pivot: forward recovery (retry until success) is the only option. Designing the right pivot point is the most important saga design decision.

4. **Orchestration beats choreography for complexity.** Choreography distributes state across all participants, making the overall saga flow invisible. When something goes wrong, you reconstruct saga state by correlating events across multiple service logs. Orchestration centralizes state, making debugging trivial.

5. **Temporal/Step Functions solve the hard problems.** Durability, retries, timeouts, crash recovery — these are solved problems in modern saga frameworks. Don't build a homegrown saga orchestrator. The infrastructure complexity is substantial.

6. **When 2PC is actually the right answer.** Saga pattern advocates sometimes dismiss 2PC entirely. But for 2-3 services, short transactions, and co-located infrastructure, 2PC is simpler and provides stronger consistency guarantees. The saga pattern's complexity is justified at scale; below that scale, it's overengineering.

7. **Idempotency is the bedrock.** Every saga step, and every compensating transaction, must be idempotent. The orchestrator will retry. The message broker will duplicate. The saga will replay from checkpoints. If your steps aren't idempotent, retries cause corruption. Design idempotency before designing the saga.
