# Distributed Transactions — Why They're Hard

> "Distributed transactions are like a three-legged race: you can finish, but someone's going to fall down, and when they do, everyone falls." — attributed to various practitioners

## The Problem

You run an airline reservation system. A customer books a round-trip: outbound flight on carrier A's database, return flight on carrier B's database. The booking must be atomic — either both legs are reserved or neither is. A partial booking where the customer has an outbound flight but no return is not acceptable.

This is a distributed transaction: multiple independent systems must agree to change their state together, atomically, with no partial success. The challenge is not the happy path — both systems confirm the booking, everyone is happy. The challenge is every other path: carrier A confirms but carrier B rejects, carrier A confirms but the network to carrier B fails, carrier A confirms but crashes before hearing carrier B's answer, carrier A and carrier B both confirm but the coordinator crashes before recording that fact.

Each failure mode requires a different recovery strategy, and the recovery strategies themselves can fail. You can keep adding layers of protocols to handle failures, but at some point you hit the CAP theorem wall: you cannot have perfect atomicity, perfect availability, and perfect partition tolerance simultaneously. You must choose which property to weaken.

This article covers the landscape of distributed transaction approaches — what they guarantee, what they cost, and when to reach for each. The answer is often: design your system so you do not need distributed transactions at all.

## Core Concept

### The Impossibility Result

The FLP impossibility theorem (Fischer, Lynch, Paterson, 1985) proves that in a purely asynchronous distributed system — one where messages can be arbitrarily delayed but not lost — no deterministic algorithm can achieve consensus even with a single faulty process.

This means: you cannot build a distributed transaction system that is simultaneously safe (never commits a transaction incorrectly), live (always eventually commits or aborts), and fault-tolerant (tolerates any crash). You must relax one of these.

Real systems relax liveness: they use timeouts (which are not strictly asynchronous — they assume messages are eventually delivered) and retry mechanisms. But timeouts introduce their own problems: if a coordinator times out waiting for a participant, should it abort? The participant might have committed already.

### The Two Generals Problem

The Two Generals Problem (1975) is a thought experiment that illustrates why coordination over an unreliable channel is impossible. Two armies need to coordinate an attack: General A sends a messenger to General B agreeing to attack at dawn. But the messenger might be captured. So A waits for B's acknowledgment. But the acknowledgment might be captured. And A's acknowledgment of B's acknowledgment might be captured. No finite number of message exchanges can guarantee that both generals will attack simultaneously — because the last message can always be lost.

```
General A ──m1──► General B: "Attack at dawn, confirm"
General A ◄──m2── General B: "Confirmed, attack at dawn"
General A ──m3──► General B: "Got your confirmation"
General A ◄──m4── General B: "Got your got-my-confirmation"
... (infinitely)

Last message can always be lost.
Both sides can never be 100% certain.
```

Distributed transactions face the same problem. The coordinator can never be 100% certain that all participants have committed without an infinite chain of confirmations. Real protocols (2PC, 3PC, Paxos) accept this and design for "certain enough" — sufficient for practical systems even if not mathematically perfect.

### Approaches to Distributed Transactions

```
Spectrum from strongest to most available:

Linearizable (strongest)
  └── Spanner (TrueTime + Paxos-backed 2PC)
       └── Strong consistency across global partitions
           Cost: GPS+atomic clock infrastructure, commit wait latency

ACID across nodes
  └── XA / 2PC (see Article 05)
       └── Atomic across heterogeneous systems
           Cost: blocking on coordinator failure, poor scalability

Serializable (weaker than linearizable)
  └── Calvin (deterministic ordering)
       └── No locking, deterministic execution
           Cost: requires deterministic transactions, centralish sequencer

Read committed + Saga (eventual consistency)
  └── Saga pattern
       └── No distributed locks, highly available
           Cost: no isolation, compensating transactions

Eventual consistency (weakest)
  └── CRDTs + async replication
       └── Always available, no coordination
           Cost: limited expressiveness, eventual (not immediate) consistency
```

### Saga Pattern: The Practical Alternative

The Saga pattern (Hector Garcia-Molina, Kenneth Salem, 1987) was proposed for long-lived transactions in traditional databases. It was rediscovered as the practical alternative to 2PC in microservices architectures.

A Saga is a sequence of local transactions, each of which updates one service. If a step fails, compensating transactions undo the previous steps.

**Choreography-based Saga**: Services communicate via events. Each service listens for events from previous steps and publishes events for subsequent steps. No central coordinator.

```
Choreography Saga for flight booking:

1. BookingService: creates booking in PENDING state
   → publishes BookingCreated event

2. InventoryService: listens for BookingCreated
   → reserves seat on outbound flight
   → publishes OutboundReserved event
   OR → publishes OutboundReservationFailed event

3. InventoryService: listens for OutboundReserved
   → reserves seat on return flight
   → publishes ReturnReserved event
   OR → publishes ReturnReservationFailed event

4. BookingService: listens for ReturnReserved
   → marks booking as CONFIRMED
   → publishes BookingConfirmed event

Failure path (ReturnReservationFailed):
5. InventoryService: listens for ReturnReservationFailed
   → releases outbound reservation (compensating transaction)
   → publishes OutboundReleased event

6. BookingService: listens for OutboundReleased
   → marks booking as FAILED
```

**Orchestration-based Saga**: A central orchestrator (saga coordinator) tells each participant what to do and handles failures.

```python
class FlightBookingSaga:
    """Orchestration-based saga with explicit state machine."""
    
    def __init__(self, booking_id: str):
        self.booking_id = booking_id
        self.state = "STARTED"
        self.outbound_reservation = None
        self.return_reservation = None
    
    def execute(self, outbound: FlightSpec, return_flight: FlightSpec):
        """Execute the saga, compensating on failure."""
        
        # Step 1: Reserve outbound
        try:
            self.outbound_reservation = inventory.reserve(outbound)
            self.state = "OUTBOUND_RESERVED"
            self._save_state()  # Persist saga state for crash recovery
        except ReservationFailed as e:
            self.state = "FAILED"
            self._save_state()
            raise SagaFailed("Outbound reservation failed") from e
        
        # Step 2: Reserve return
        try:
            self.return_reservation = inventory.reserve(return_flight)
            self.state = "RETURN_RESERVED"
            self._save_state()
        except ReservationFailed as e:
            # Compensate: release outbound
            self._compensate_outbound()
            self.state = "FAILED"
            self._save_state()
            raise SagaFailed("Return reservation failed, outbound released") from e
        
        # Step 3: Confirm booking
        try:
            booking.confirm(self.booking_id)
            self.state = "CONFIRMED"
            self._save_state()
        except BookingFailed as e:
            # Compensate: release both reservations
            self._compensate_return()
            self._compensate_outbound()
            self.state = "FAILED"
            self._save_state()
            raise SagaFailed("Booking confirmation failed") from e
    
    def _compensate_outbound(self):
        if self.outbound_reservation:
            for attempt in range(3):
                try:
                    inventory.release(self.outbound_reservation)
                    return
                except Exception:
                    if attempt == 2:
                        # Compensation failed — alert ops, store for manual processing
                        alert_ops(f"Saga {self.booking_id}: outbound compensation failed")
                        dead_letter_queue.publish(
                            "saga_compensation_failed",
                            {"saga_id": self.booking_id, "step": "outbound"}
                        )
    
    def _save_state(self):
        """Persist saga state — allows crash recovery."""
        saga_store.save(self.booking_id, {
            "state": self.state,
            "outbound_reservation": self.outbound_reservation,
            "return_reservation": self.return_reservation,
        })
    
    @classmethod
    def recover(cls, booking_id: str) -> "FlightBookingSaga":
        """Resume a saga after coordinator crash."""
        stored = saga_store.load(booking_id)
        saga = cls(booking_id)
        saga.state = stored["state"]
        saga.outbound_reservation = stored["outbound_reservation"]
        saga.return_reservation = stored["return_reservation"]
        # Re-execute from current state...
        return saga
```

### The Outbox Pattern: Reliable Event Publishing

Every saga step publishes an event. But publishing to a message broker and updating the database must be atomic — you cannot allow "database updated but event not published" (saga gets stuck) or "event published but database not updated" (saga proceeds on false premise).

The Outbox pattern solves this by writing events into the same database transaction as the state change, then having a separate process publish them:

```sql
-- In a single database transaction:
BEGIN;
  -- Business logic update
  UPDATE flights SET reserved_seats = reserved_seats + 1 
  WHERE flight_id = 'UA123' AND available_seats > 0;
  
  -- Check the update actually happened
  -- (optimistic concurrency check)
  
  -- Write event to outbox in same transaction
  INSERT INTO outbox (id, event_type, payload, created_at, status)
  VALUES (
    gen_random_uuid(),
    'SeatReserved',
    '{"flight_id": "UA123", "booking_id": "BK456"}',
    NOW(),
    'PENDING'
  );
COMMIT;

-- Separate outbox processor (runs continuously):
SELECT id, event_type, payload FROM outbox 
WHERE status = 'PENDING' 
ORDER BY created_at
LIMIT 100;

FOR EACH event:
  publish_to_message_broker(event);  -- idempotent publish
  UPDATE outbox SET status = 'PUBLISHED' WHERE id = event.id;
```

The outbox processor provides at-least-once delivery. With idempotent message consumers (deduplicating by event ID), this achieves effectively-once semantics.

### Calvin: Deterministic Distributed Transactions

Calvin (Thomson, Diamond, Weng, Ren, Shao, Abadi — Yale, 2012) takes a radically different approach. Instead of coordinating transactions at commit time (as 2PC does), Calvin coordinates at the *input* stage — before any transaction executes.

The key insight: if all nodes agree on the order in which transactions will execute *before* executing them, they can all execute the transactions independently and produce the same result. No locking, no 2PC voting.

```
Calvin architecture:

1. Sequencer (replicated via Paxos):
   - Receives transaction requests
   - Assigns each transaction a global sequence number
   - Batches transactions into epochs (10ms windows)
   - Replicates the ordered batch to all schedulers

2. Schedulers (one per partition):
   - Receive the same ordered batch from the sequencer
   - Each partition executes only the transactions that touch its data
   - Since all schedulers agree on the order, they produce consistent results
   - No locking needed — order is predetermined

3. Execution:
   - Deterministic — same input always produces same output
   - No blocking — no waiting for coordinator decisions
   - Reads must be declared upfront (so the scheduler can lock the right keys)
```

Calvin's limitation: transactions must declare all data they will read and write before execution. This is fine for many workloads but impossible for transactions that make decisions based on read results (e.g., "read the balance, then decide whether to allow the withdrawal").

FaunaDB (now Fauna) uses a Calvin-inspired architecture. It is the right choice for workloads with predictable access patterns and high write throughput.

### Event-Driven State Machines

For complex business workflows (order fulfillment, insurance claims processing, loan approval), the Saga pattern becomes an event-driven state machine. Each state transition is a local database update plus an outbox event.

```
Order fulfillment state machine:

CREATED → PAYMENT_PENDING → PAYMENT_CONFIRMED → 
INVENTORY_RESERVED → SHIPPED → DELIVERED

PAYMENT_PENDING → PAYMENT_FAILED → CANCELLED
INVENTORY_RESERVED → OUT_OF_STOCK → CANCELLED (with payment refund)
SHIPPED → LOST → RESHIPMENT_PENDING (with investigation)

Each state transition:
1. Check current state (optimistic lock or state machine guard)
2. Apply business logic
3. Update state in database
4. Publish transition event to outbox
5. Outbox processor publishes event
6. Downstream services react to event and trigger next step
```

This pattern is implemented in:
- **Temporal** (Go/TypeScript): durable execution with automatic state persistence and retry
- **AWS Step Functions**: visual state machine with managed infrastructure
- **Spring State Machine** (Java): in-process state machine
- **XState** (TypeScript): primarily frontend but applicable to backend sagas

## Deep Dive

### The Two Generals Problem and Why Perfect Coordination Is Impossible

The Two Generals Problem, first formalized in the distributed systems literature in 1975, proves that it is impossible to achieve guaranteed coordination over an unreliable channel using any finite message exchange. The setup: two generals must coordinate an attack, but their messengers may be captured. No matter how many confirmation messages are exchanged, the last message can always be lost, leaving one general uncertain about the other's commitment.

This is not a solvable engineering problem — it is a mathematical impossibility. Every practical coordination protocol (2PC, 3PC, Paxos, Raft) works around this impossibility by accepting some form of residual uncertainty and designing systems to handle it gracefully. 2PC accepts that a coordinator failure leaves participants blocked. Paxos accepts that the system may be unavailable during leader election. Sagas accept that intermediate states are visible. The question is never "which protocol eliminates uncertainty?" but "which residual uncertainty is acceptable for this use case?"

The FLP impossibility result (Fischer, Lynch, Paterson, 1985) tightens this: even without message loss (only process crashes), no deterministic asynchronous consensus protocol can guarantee both safety (never committing inconsistently) and liveness (always eventually deciding). This is why every production consensus system uses timeouts — timeouts are what convert the asynchronous model to a partially synchronous one, restoring liveness at the cost of potential false-positive failure detection.

### Calvin: Deterministic Ordering as the Alternative to Locking

The Calvin paper (Thomson, Diamond, Weng, Ren, Shao, Abadi — Yale, 2012) proposed a genuinely different approach to distributed transactions. Rather than coordinating at commit time through 2PC locking, Calvin coordinates at *input time* — before any execution begins. A sequencer (replicated via Paxos for fault tolerance) assigns each incoming transaction a global sequence number and batches transactions into 10-millisecond epochs. All schedulers receive the identical ordered batch and execute transactions in the same sequence independently.

The insight: if all partitions agree on the order of transactions before executing them, they can execute independently and still produce consistent results. No locking is required because the execution order is predetermined. Calvin reports throughput of over 500,000 distributed ACID transactions per second on commodity hardware — roughly 100x what 2PC-based systems achieve at the time.

Calvin's limitation is that transactions must pre-declare all data they will read and write. This is fine for transactions with known access patterns (financial transfers, inventory updates) but impossible for transactions that make decisions based on read results. FaunaDB adopted a Calvin-inspired approach for this reason: it targets workloads with predictable access patterns where predeclaration is natural.

### The Saga Pattern's Original Context

Garcia-Molina and Salem's 1987 saga paper is worth revisiting because the original context was different from how sagas are used today. The 1987 paper addressed "long-lived transactions" in a single database — transactions that held locks for minutes or hours, blocking other users. The saga decomposed a long transaction into a sequence of shorter sub-transactions that each committed independently, with compensating transactions for rollback.

The key semantic difference: a saga does not provide isolation. Between sub-transaction T₁ committing and sub-transaction T₂ committing, other transactions can read the intermediate state. The 1987 paper acknowledged this explicitly and proposed "semantic atomicity" — the saga's final state appears atomic even if intermediate states are visible, because compensating transactions restore the initial state on failure. This is weaker than ACID atomicity, but sufficient for many business workflows where the intermediate state has a natural interpretation (a "pending" booking, a "processing" payment).

## Implementation Guide

### Choosing the Right Approach

```
Decision flowchart for distributed transactions:

Can you avoid distributed transactions?
├── YES (most cases): 
│   Redesign to colocate related data in one service/database
│   Use event-driven architecture with idempotent consumers
│   Accept eventual consistency with compensation
│   
└── NO (truly need atomicity across services):
    
    Are all services under your control and using relational databases?
    ├── YES: Consider XA/2PC for small (2-3) service sets
    │        Understand the blocking risk and set timeouts
    │        
    └── NO (microservices, heterogeneous systems):
        
        Are transactions short-lived (< 1 second)?
        ├── YES: Saga with orchestration (simpler to debug than choreography)
        │        Use Temporal/Conductor for complex workflows
        │
        └── NO (human-in-the-loop, multi-day workflows):
                 Use workflow engine (Temporal, Step Functions)
                 Each step must be idempotent and have a compensation
```

### Idempotency: The Foundation of Reliable Sagas

Every saga step must be idempotent. If the step is retried (due to timeout, crash recovery, or at-least-once delivery), it must produce the same result.

```python
class IdempotentPaymentProcessor:
    def charge(self, idempotency_key: str, amount: int, card_token: str) -> ChargeResult:
        """
        Idempotent payment charge.
        
        If called twice with the same idempotency_key, returns the same result
        without charging the customer twice.
        """
        # Check if already processed
        existing = self.db.query(
            "SELECT * FROM payment_charges WHERE idempotency_key = ?",
            idempotency_key
        )
        if existing:
            return ChargeResult(
                charge_id=existing.charge_id,
                status=existing.status,
                idempotent=True  # Signal that this was a duplicate
            )
        
        # Process new charge
        try:
            charge = self.payment_gateway.charge(amount, card_token)
            self.db.execute(
                """INSERT INTO payment_charges 
                   (idempotency_key, charge_id, amount, status) 
                   VALUES (?, ?, ?, 'success')""",
                idempotency_key, charge.id, amount
            )
            return ChargeResult(charge_id=charge.id, status="success")
        except PaymentError as e:
            self.db.execute(
                """INSERT INTO payment_charges 
                   (idempotency_key, charge_id, amount, status, error) 
                   VALUES (?, NULL, ?, 'failed', ?)""",
                idempotency_key, amount, str(e)
            )
            raise
```

## When to Use / When NOT to Use

**Use distributed transactions (2PC/XA) when:**
- Two databases must be updated atomically within the same organization
- The network is reliable and controlled (internal LAN)
- Transactions are short-lived (milliseconds)
- You can tolerate occasional blocking on coordinator failure

**Use Sagas when:**
- Microservices with independent databases
- Transactions may take a long time (seconds to days)
- High availability is critical
- Business domain has natural compensating actions (refunds, cancellations)

**Use Temporal/workflow engines when:**
- Sagas are complex with many steps and branching logic
- Human approval is part of the workflow
- You need detailed visibility into workflow progress
- You cannot afford to lose workflow state on crash

**Embrace eventual consistency and avoid distributed transactions when:**
- The business can tolerate brief inconsistency
- Operations are independent and can be applied in any order
- You have natural compensation (returns, refunds, corrections)
- The cost of coordination exceeds the cost of inconsistency

## Common Mistakes

**Mistake 1: Not persisting saga state**
A saga that loses its state on crash must restart from the beginning. Restarting may re-charge a customer's card or re-reserve inventory. Always persist saga state after every step, and use idempotency keys to make re-execution safe.

**Mistake 2: Saga without compensation**
Designing a saga where some steps have no compensating transaction. If step 3 has no compensation, a failure at step 4 leaves the saga in a partially-executed state forever. Every step that modifies state must have a compensation.

**Mistake 3: Synchronous compensation**
Compensation should usually be async and retried. A synchronous compensation that fails leaves the system in an inconsistent state. Write compensations to a durable queue and retry until they succeed.

**Mistake 4: Business logic in the message consumer**
"On OrderCreated event, charge payment" puts business logic in the consumer. If the payment service changes, every consumer must change. Use orchestration (saga coordinator) for complex workflows to centralize the business logic.

**Mistake 5: Ignoring the isolation gap**
Sagas do not provide isolation. Between step 1 and step 5, other sagas can see the partial state. Design your business logic to handle intermediate states. Use "semantic locks" — marking records as in-flight — to prevent concurrent sagas from operating on the same data.

## Connections

- **Two-Phase Commit** (Article 05): 2PC is the distributed transaction mechanism that Sagas replace. Understanding 2PC's limitations (blocking, single coordinator, scalability) motivates the Saga pattern.
- **Exactly-Once Delivery** (Article 11): Saga steps rely on at-least-once delivery from the message broker. Idempotent consumers make this effectively-once. The interaction between delivery guarantees and idempotency is fundamental.
- **Clock Synchronization** (Article 07): Spanner's external consistency (the strongest distributed transaction guarantee) depends on TrueTime. The relationship between clock synchronization and transaction ordering is direct.
- **Gossip Protocols** (Article 06): In choreography-based sagas, services communicate via events. The reliability of event delivery affects saga correctness. Outbox pattern combined with reliable message delivery (not gossip — message brokers) is the standard approach.

## Key Insights

**Insight 1: The goal is not to eliminate inconsistency but to make it visible and bounded.** You cannot have perfect consistency and high availability simultaneously (CAP theorem). The mature approach is to accept eventual consistency and make the inconsistency window explicit: "after a failed saga step, the system will be compensated within X seconds." This is a service-level agreement, not a hope.

**Insight 2: Temporal and workflow engines are the mature answer to complex sagas.** Writing sagas by hand — with all their error handling, retry logic, state persistence, and compensation — is complex and error-prone. Workflow engines (Temporal, Conductor, Step Functions) encode the hard parts as platform features, letting you write business logic without worrying about crash recovery or retry semantics.

**Insight 3: The outbox pattern is not optional.** Without the outbox pattern, your saga steps can silently lose events when the broker is temporarily unavailable. "Fire and forget" event publishing in a saga is a reliability bug waiting to manifest in production. The outbox pattern is the minimum viable reliability infrastructure for event-driven sagas.

**Insight 4: The best distributed transaction is no distributed transaction.** The most powerful architectural move is to design your data model so that related data lives in the same service. An order service that owns both the order and the inventory for that order does not need a distributed transaction to reserve inventory when creating an order. Service boundaries should align with transaction boundaries — not the other way around.

**Insight 5: Consistency is a spectrum, not a binary.** There is no sharp line between "consistent" and "inconsistent." Spanner provides linearizability — the strongest guarantee. Saga + outbox provides eventual consistency — weaker but highly available. Most systems operate between these extremes, providing causal consistency, read-your-writes, or monotonic reads. Know which guarantee your system provides and design your application accordingly.
