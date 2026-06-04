# Two-Phase Commit and Its Limitations

> "Two-phase commit is a blocking protocol that turns the distributed systems problem into a coordination problem, and then makes you pay for coordination at the worst possible time." — Pat Helland

## The Problem

You are building an e-commerce checkout. When a customer completes a purchase, three things must happen atomically: the inventory count decreases by 1, the customer's payment is charged, and the order record is created. These three operations happen in three different services, potentially on three different databases. Either all three succeed together, or none of them should happen at all. A partial completion — inventory decremented but payment failed, or payment charged but order not created — leaves the system in an inconsistent state that requires painful manual correction.

This is the distributed atomicity problem: how do you make multiple operations across multiple independent systems appear to happen as a single atomic unit? Within a single database, this is what transactions are for. Across multiple systems, there is no built-in transaction manager. You need a protocol.

Two-Phase Commit (2PC) is the classical answer. It is decades old, well-understood, and widely implemented. It is also problematic in ways that are not obvious until you operate a distributed system at scale. Understanding both why 2PC works and why it fails is essential knowledge for every distributed systems practitioner.

## Core Concept

### The Protocol

2PC involves two roles: a **coordinator** (usually the service initiating the transaction) and **participants** (the services/databases being updated). The protocol runs in two phases:

```
Phase 1: Prepare (Voting)

Coordinator → Participant A: "Prepare: decrement inventory for SKU-123"
Coordinator → Participant B: "Prepare: charge $49.99 to card ending 4242"
Coordinator → Participant C: "Prepare: create order record OID-789"

Participant A → Coordinator: "YES — I can commit this"
Participant B → Coordinator: "YES — I can commit this"  
Participant C → Coordinator: "YES — I can commit this"

Phase 2: Commit (or Abort)

Coordinator → Participant A: "COMMIT"
Coordinator → Participant B: "COMMIT"
Coordinator → Participant C: "COMMIT"

All participants execute the prepared operation and release locks.
```

If any participant votes NO in Phase 1 (or fails to respond), the coordinator sends ABORT to all participants, and everyone rolls back.

```
Phase 1 with failure:

Coordinator → A: "Prepare"  → A: "YES"
Coordinator → B: "Prepare"  → B: "NO — insufficient funds"
Coordinator → C: "Prepare"  → C: "YES"

Phase 2 (Abort):

Coordinator → A: "ABORT"  → A: rolls back
Coordinator → B: "ABORT"  → B: rolls back (nothing to roll back)
Coordinator → C: "ABORT"  → C: rolls back
```

The critical guarantee: a participant that votes YES has made a **durable promise** to commit if asked. It has written the prepared state to persistent storage (a write-ahead log). It cannot unilaterally abort after voting YES.

### The Blocking Problem

Here is where 2PC breaks down. What happens if the coordinator crashes after participants have voted YES but before it sends the commit or abort decision?

```
Phase 1 complete — all participants voted YES

Coordinator CRASHES HERE ←────────────────

Participants A, B, C are now in an uncertain state:
  - They voted YES (promised to commit)
  - They cannot unilaterally abort (might leave data inconsistent if others commit)
  - They cannot unilaterally commit (coordinator might have decided to abort for a reason
    they do not know about)
  - They hold locks on the prepared data
  - They must WAIT for the coordinator to recover

This is the "in-doubt" or "uncertain" state.
```

The participants are **blocked** — they cannot make progress, and they hold locks. Other transactions that need those same rows or records are also blocked. In a high-throughput system, this blocking can cascade into a significant outage.

The only resolution: the coordinator recovers and re-sends its decision. If the coordinator's disk is corrupted or it is a long time before it comes back, the block is indefinite.

### The Coordinator as Single Point of Failure

2PC has a single point of failure: the coordinator. If the coordinator is unavailable between Phase 1 and Phase 2, the entire transaction is stuck. This contradicts the distributed systems goal of building systems that tolerate individual node failures.

```
Failure scenarios and outcomes:

Coordinator fails before Phase 1: 
  → No harm — participants never received Prepare, no locks held
  → Transaction is simply not attempted

Coordinator fails during Phase 1 (before all votes received):
  → Coordinator recovers, resends Prepare to non-responding participants
  → If timeout: coordinator sends Abort to all
  → Participants that voted YES must honor the Abort

Coordinator fails after Phase 1, before Phase 2:  ← THE PROBLEM
  → Participants are stuck in-doubt with locks held
  → Must wait for coordinator recovery
  → Coordinator must persist its decision to durable log before sending Phase 2
  → Recovery: coordinator reads log, resends Phase 2 decision

Participant fails during Phase 2:
  → Coordinator retries the commit/abort to the failed participant
  → Participant recovers, checks its own log: "Did I commit this?"
  → If YES in log: apply commit. If NO: apply abort.
  → Coordinator keeps retrying until all participants acknowledge
```

### Three-Phase Commit: Solving the Blocking Problem

Three-Phase Commit (3PC) adds a third phase to eliminate the blocking problem:

```
Phase 1: CanCommit (voting)
Phase 2: PreCommit (coordinator announces its decision before executing)
Phase 3: DoCommit (actual commit)

The key addition: after Phase 1 votes YES, if the coordinator crashes,
participants know the coordinator was going to commit (they received PreCommit).
They can elect a new coordinator and proceed to commit.

BUT: 3PC assumes a synchronous network (no network partitions).
In an asynchronous network (real-world), a "crashed coordinator" is
indistinguishable from a "slow coordinator" — and proceeding in the
ambiguous case can lead to split-brain.
```

3PC is rarely used in practice. The assumption of a synchronous network is unrealistic, and the added complexity is significant. Most systems that need to go beyond 2PC use consensus protocols (Paxos, Raft) or the Saga pattern instead.

## Deep Dive

### The FLP Impossibility Result and What It Means for 2PC

The blocking problem in 2PC is not an engineering failure — it is a mathematical consequence. Fischer, Lynch, and Paterson proved in 1985 (the FLP impossibility result) that no deterministic consensus protocol can guarantee both safety and liveness in an asynchronous system where even a single process can fail. The proof is elegant and brutal: in any execution, there exists a "bivalent" configuration where the system has not yet committed to either committing or aborting. A well-timed failure can keep the system in this bivalent state indefinitely.

2PC resolves the bivalent state by having the coordinator make the commit/abort decision and persist it durably before sending Phase 2 messages. This is the "coordinator as single decider" design. But it creates a window — after participants vote YES and before they receive the coordinator's Phase 2 message — where participants hold locks and cannot safely proceed unilaterally. If the coordinator crashes in this window, the participants are stuck waiting for it to recover. This is not a design flaw; it is FLP playing out in practice.

Three-Phase Commit (3PC) was designed to eliminate this blocking by adding a pre-commit phase in which the coordinator broadcasts its decision before executing it. But 3PC assumes a synchronous network — one where message delivery is bounded. In an asynchronous network (which is what all real networks are), a "coordinator is slow to respond" is indistinguishable from "coordinator has crashed," and 3PC's recovery protocol can cause split-brain under network partitions. This is why 3PC is almost never used in production: it trades one failure mode for another.

### Spanner: 2PC Over Paxos Groups

The Spanner paper (Corbett et al., 2012) is the production proof that 2PC can be made highly available by replacing individual participants with consensus groups. In Spanner, each shard of data is managed by a Paxos group — a set of replicas that collectively agree on the state of that shard using the Paxos protocol. The Paxos leader for each group acts as the 2PC participant.

The critical difference from naive 2PC: if a Paxos leader fails, the group elects a new leader without losing progress. The new leader inherits the prepared-but-not-yet-committed transaction state from the durable Paxos log. The coordinator can re-send Phase 2 to the new leader and the transaction completes. The coordinator can still fail and block, but Spanner also runs coordinators in Paxos groups, eliminating that failure mode too.

The result is ACID transactions with external consistency across globally distributed shards. But the cost is significant: every shard must run Paxos replication, every cross-shard transaction requires 2PC coordination, and the commit wait imposed by TrueTime (1–7ms to bound clock uncertainty) is baked into every write. Spanner makes 2PC work at global scale, but the price is infrastructure complexity and latency that only Google's operational requirements justify.

### The Saga Pattern: Garcia-Molina and Salem (1987)

The Saga pattern predates microservices by decades. Hector Garcia-Molina and Kenneth Salem proposed it in 1987 as a solution to long-lived transactions in traditional databases. A "saga" is a sequence of transactions T₁, T₂, ..., Tₙ where each Tᵢ has a compensating transaction Cᵢ that semantically undoes its effects. If Tₖ fails, the saga executes Cₖ₋₁, Cₖ₋₂, ..., C₁ to restore the system to a consistent state.

The 1987 paper's insight was that many "long transactions" in practice are actually sequences of shorter transactions with natural compensation. A hotel booking can be cancelled; an airline reservation can be refunded. Forcing these into a single ACID transaction holds database locks for the duration of a multi-step business process — minutes or hours — which is incompatible with high throughput.

The microservices community rediscovered sagas in the 2010s because 2PC across independent service databases is impractical (different databases, no shared coordinator) while sagas only require local transactions plus event publishing. The Outbox pattern — writing events to a database table in the same transaction as the state change, then publishing from that table — solves the atomic write-and-publish problem that makes saga steps reliable.

## Implementation Guide

### When 2PC Is Appropriate: Same-Database XA

```sql
-- PostgreSQL: prepared transactions (2PC within one database)
-- Use case: application must survive crash between prepare and commit

-- Phase 1: Prepare
BEGIN;
UPDATE inventory SET count = count - 1 WHERE sku = 'SKU-123';
UPDATE orders SET status = 'confirmed' WHERE order_id = 'OID-789';
PREPARE TRANSACTION 'txn-checkout-OID-789';
-- Transaction is now prepared and durable on disk
-- Even if application crashes, the prepared transaction persists

-- Phase 2: Commit (can be done after crash recovery)
COMMIT PREPARED 'txn-checkout-OID-789';

-- Or rollback if something went wrong:
ROLLBACK PREPARED 'txn-checkout-OID-789';

-- Recover in-doubt transactions after crash:
SELECT * FROM pg_prepared_xacts;
-- Shows all prepared-but-not-yet-committed transactions
-- Application must decide: commit or rollback each one
```

### The Saga Pattern: The Modern Alternative

For microservices, the Saga pattern is the recommended alternative to 2PC. Instead of distributed locking, Sagas use compensating transactions.

```
Saga for e-commerce checkout:

Step 1: Reserve inventory (can be compensated)
  → On success: continue to Step 2
  → On failure: done (nothing to compensate)

Step 2: Charge payment (can be compensated)
  → On success: continue to Step 3
  → On failure: compensate Step 1 (release reservation)

Step 3: Create order record (final step)
  → On success: saga complete
  → On failure: compensate Step 2 (refund payment)
              compensate Step 1 (release reservation)

Compensating transactions:
  Inventory reservation → release_reservation(SKU-123)
  Payment charge       → refund_payment(payment_id)
  Order creation       → cancel_order(order_id) [if partially created]
```

Sagas do NOT provide isolation — between Step 1 and Step 3, other transactions can see the intermediate state (reserved inventory, charged payment, no order). This is acceptable if:
1. The saga completes quickly (seconds)
2. The business can tolerate brief inconsistency
3. Compensating transactions are truly reversible

```python
class CheckoutSaga:
    def execute(self, order_data: dict) -> SagaResult:
        completed_steps = []
        
        try:
            # Step 1: Reserve inventory
            reservation = inventory_service.reserve(order_data["sku"])
            completed_steps.append(("inventory", reservation.id))
            
            # Step 2: Charge payment
            payment = payment_service.charge(
                amount=order_data["amount"],
                card_token=order_data["card_token"]
            )
            completed_steps.append(("payment", payment.id))
            
            # Step 3: Create order
            order = order_service.create(
                reservation_id=reservation.id,
                payment_id=payment.id,
                **order_data
            )
            completed_steps.append(("order", order.id))
            
            return SagaResult(success=True, order_id=order.id)
            
        except Exception as e:
            # Compensate in reverse order
            for step_name, step_id in reversed(completed_steps):
                try:
                    self._compensate(step_name, step_id)
                except Exception as comp_error:
                    # Compensation failure: alert ops, manual intervention needed
                    alert_on_call(f"Saga compensation failed: {step_name}:{step_id}")
            
            return SagaResult(success=False, error=str(e))
    
    def _compensate(self, step_name: str, step_id: str):
        match step_name:
            case "inventory":
                inventory_service.release_reservation(step_id)
            case "payment":
                payment_service.refund(step_id)
            case "order":
                order_service.cancel(step_id)
```

### The Outbox Pattern: Making Sagas Reliable

The Outbox pattern ensures that a database write and an event publication happen atomically, which is the building block for reliable saga steps.

```
Problem: After writing to DB, publishing an event can fail.
         DB has new state, but downstream services are not notified.

Solution: Write event to an "outbox" table in the SAME database transaction.
          A separate process reads the outbox and publishes to the message broker.

-- Application code:
BEGIN;
  UPDATE orders SET status = 'confirmed' WHERE id = :order_id;
  INSERT INTO outbox (event_type, payload, status)
    VALUES ('OrderConfirmed', :payload, 'pending');
COMMIT;

-- Outbox processor (separate service):
LOOP:
  SELECT * FROM outbox WHERE status = 'pending' LIMIT 100;
  FOR each event:
    publish to message broker (idempotently)
    UPDATE outbox SET status = 'published' WHERE id = :id;
```

The outbox pattern guarantees at-least-once delivery (with idempotent consumers, this is effectively-once). It is the standard pattern for reliable event-driven saga coordination.

## When to Use / When NOT to Use

**Use 2PC when:**
- You are working within a single database that supports prepared transactions
- You have a small, controlled set of participants (2-3 databases) on a reliable internal network
- You need strong ACID guarantees and can tolerate the blocking risk
- You are in an enterprise environment with Microsoft-stack technologies and MSDTC
- The transaction is short-lived (milliseconds, not seconds)

**Use Saga instead when:**
- You have more than 3 participants (2PC blocking risk becomes unacceptable)
- Participants are independent microservices with their own databases
- You need high availability (cannot tolerate coordinator failure blocking transactions)
- Transactions can take a long time (human approval workflows, delayed processing)
- The business domain has natural compensating actions (refunds, cancellations)

**Use consensus (Raft/Paxos) when:**
- You need linearizable transactions with no blocking on node failure
- You are building a database or coordination service from scratch
- You need to go beyond 2PC's limitations without the eventual consistency of Sagas

## Common Mistakes

**Mistake 1: Using 2PC across the internet**
2PC requires reliable, low-latency communication between coordinator and participants. Across the internet, with variable latency and packet loss, the in-doubt window is long and frequent. Never use 2PC for cross-organizational transactions.

**Mistake 2: Long-lived prepared transactions**
Prepared transactions hold locks. A prepared transaction that waits hours or days for a coordinator to recover (or for manual intervention) holds locks for hours or days, blocking other work. Set aggressive timeouts on prepared transactions.

**Mistake 3: Not handling saga compensation failures**
Saga compensating transactions can also fail. A failed refund leaves the customer charged with no order. Every saga must have a "dead letter" mechanism: alert operations, log the failure state, and provide a manual resolution path.

**Mistake 4: Making compensating transactions non-idempotent**
The compensation step may be called multiple times due to retries. A `refund(payment_id)` that charges the refund twice because it was called twice is worse than no refund. Compensating transactions must be idempotent — applying them multiple times produces the same result as applying them once.

**Mistake 5: Treating Saga as equivalent to 2PC**
Saga does not provide isolation. Other services see intermediate state during saga execution. If your business logic depends on isolation (e.g., a concurrent saga for the same product cannot see a "reserved but not ordered" state), you need either 2PC with locking or a semantic lock pattern.

## Connections

- **Distributed Transactions** (Article 08): This article covers the mechanism (2PC). Article 08 covers the broader landscape of distributed transaction patterns, including Saga, Outbox, and Calvin — when to use each.
- **Exactly-Once Delivery** (Article 11): The Outbox pattern relies on at-least-once delivery with idempotent consumers to achieve effectively-once semantics. The interaction between Saga steps and message delivery semantics is critical.
- **Clock Synchronization** (Article 07): Spanner's 2PC implementation relies on TrueTime for external consistency. Google's innovation was using GPS-backed atomic clocks to provide bounded clock uncertainty, enabling commit timestamp ordering without blocking.
- **Quorum** (Article 03): Spanner replaces individual 2PC participants with Paxos groups (which use quorum internally). This makes 2PC highly available by ensuring each "participant" can survive individual node failures.

## Key Insights

**Insight 1: 2PC solves the wrong problem for microservices.** 2PC was designed for tightly coupled, homogeneous database systems (like multiple tables in related Oracle databases). It assumes reliable network, similar database technology, and short-lived transactions. Microservices violate all three assumptions. Using 2PC for microservices is fighting the architecture.

**Insight 2: The blocking problem is fundamental, not accidental.** The FLP impossibility result (Fischer, Lynch, Paterson, 1985) proves that no asynchronous consensus protocol can be both safe and live in the presence of even one faulty process. 2PC's blocking behavior is not a design flaw — it is a consequence of a mathematical impossibility. You can work around it (with Paxos/Raft), but you cannot eliminate the trade-off.

**Insight 3: Sagas push complexity to the business layer.** 2PC pushes the atomicity problem into the database protocol layer. Sagas push it into the application and business logic layer. Sagas require compensating transactions that must be designed, implemented, and tested. This is work — but it is work that can be done incrementally and independently by different teams.

**Insight 4: "Exactly-once" processing is related to 2PC.** Many "exactly-once" messaging guarantees are implemented using 2PC under the hood — coordinating between the message broker and the application database in a single transaction. Understanding 2PC's limitations helps you understand why exactly-once is expensive and rare.

**Insight 5: The right answer often involves not needing distributed transactions.** The best way to handle the e-commerce checkout example at the beginning of this article is often to design the system so that the three operations can be eventually consistent. Use a saga. Use an outbox. Accept that for a few milliseconds, the inventory is decremented but the order is not yet created. Design your business logic to handle that intermediate state gracefully, and you have eliminated the need for distributed transactions entirely.
