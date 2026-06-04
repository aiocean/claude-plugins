# Transactions — ACID, Isolation Levels, and Distributed

> "Transactions are an abstraction layer that allows an application to pretend that certain concurrency problems and certain kinds of hardware and software faults don't exist. A large class of errors is reduced down to a simple transaction abort, and the application just needs to retry." — Martin Kleppmann, Designing Data-Intensive Applications

## The Problem

It's Black Friday. Your e-commerce platform is processing 50,000 orders per minute. Two customers simultaneously try to buy the last unit of a limited-edition product. Your application:

1. Reads the inventory: 1 unit available
2. Checks: is quantity > 0? Yes.
3. Decrements inventory: quantity = 0
4. Creates the order

Both customers execute these steps simultaneously. Both read 1 unit available. Both check quantity > 0. Both decrement. Both create orders. You've sold the same item twice and have -1 in inventory. This is a **lost update** — a classic concurrency bug that has cost companies millions of dollars in oversold inventory, double-charged payments, and duplicate resource allocations.

Transactions are the database's mechanism for making concurrent operations safe. A transaction groups multiple reads and writes into a single atomic unit: either all of them succeed together, or none of them do. Transactions also provide isolation: each transaction behaves as if it were the only one running, with no interference from concurrent transactions. Together, these properties let applications reason about complex multi-step operations without worrying about all the ways that concurrency and partial failures can corrupt state.

But transactions are not simple. The ACID acronym is well-known but poorly understood — "consistency" in ACID means something different from "consistency" in CAP, and "isolation" comes in four distinct levels, each providing different guarantees and having different performance characteristics. In distributed systems, transactions that span multiple nodes or databases are notoriously difficult to implement correctly, and the standard solution (two-phase commit) has failure modes that make it inappropriate for many use cases. Understanding transactions deeply means understanding exactly which anomalies each isolation level prevents, when to use distributed transactions versus sagas, and how Google Spanner achieved globally consistent transactions at scale.

## Core Concept

### ACID Explained Properly

**Atomicity:** All operations in a transaction either all commit or all roll back. There is no partial commit. If your transaction reads inventory, decrements it, and creates an order, and the order creation fails, the inventory decrement is also rolled back. Atomicity is implemented via the write-ahead log: uncommitted changes are tracked in the log, and if the transaction aborts, the changes are undone by replaying the log in reverse.

The key point: atomicity is about failure handling, not concurrency. It says "if something goes wrong, undo everything." It does not say anything about what concurrent transactions can see while the transaction is in progress.

**Consistency:** The database moves from one valid state to another. All constraints (foreign keys, unique indexes, check constraints) are satisfied after the transaction commits. Note: this "C" is the application's responsibility, not the database's — the database enforces constraints that the application defines, but the application must define meaningful constraints. Kleppmann argues that C in ACID is a bit of a stretch; the real guarantees are AID.

**Isolation:** Transactions appear to execute serially — as if one transaction fully completes before the next begins. In practice, transactions run concurrently, but isolation prevents them from seeing each other's intermediate state in ways that cause anomalies.

**Durability:** Once a transaction commits, its effects are permanent. The database will not lose committed data even if the server crashes immediately after the commit. Durability is implemented by writing the WAL to disk (fsync) before acknowledging the commit to the client.

### Read-Write Anomalies and Isolation Levels

Isolation is not binary. The SQL standard defines four isolation levels, each preventing progressively more anomalies at progressively higher performance cost:

**Read Uncommitted (Level 1):** Transactions can read uncommitted changes from other transactions — so-called "dirty reads." Almost never used in practice because dirty reads make no transactional guarantee at all.

**Read Committed (Level 2):** Transactions only see committed data. No dirty reads. But you can still have **non-repeatable reads**: reading the same row twice within a transaction and getting different values because another transaction committed a change between the two reads.

```
Transaction A (isolation: read committed):
  t=1: Read balance of account X -> $100
  
  Meanwhile, Transaction B:
    t=2: UPDATE account X SET balance = $50; COMMIT;

  t=3: Read balance of account X again -> $50
  
  Non-repeatable read: same row, same transaction, different values.
```

**Repeatable Read (Level 3):** The database guarantees that if a transaction reads a row, it will see the same value for that row for the duration of the transaction. No non-repeatable reads. But you can still have **phantom reads**: a query returns different rows on second execution because another transaction inserted or deleted rows matching the query's WHERE clause.

```
Transaction A (isolation: repeatable read):
  t=1: SELECT COUNT(*) FROM orders WHERE status = 'pending' -> 5
  
  Meanwhile, Transaction B:
    t=2: INSERT INTO orders (status) VALUES ('pending'); COMMIT;

  t=3: SELECT COUNT(*) FROM orders WHERE status = 'pending' -> 6
  
  Phantom read: same query, same transaction, different result set.
```

**Serializable (Level 4):** The strongest isolation level. Transactions execute as if they were serialized — one at a time. No dirty reads, no non-repeatable reads, no phantom reads. All anomalies are prevented.

The SQL standard's four levels and the anomalies they prevent:

```
Isolation Level    | Dirty Read | Non-Repeatable | Phantom Read
-------------------|------------|----------------|-------------
Read Uncommitted   | Possible   | Possible       | Possible
Read Committed     | Prevented  | Possible       | Possible
Repeatable Read    | Prevented  | Prevented      | Possible
Serializable       | Prevented  | Prevented      | Prevented
```

**Snapshot Isolation:** Not in the SQL standard but used by most major databases (PostgreSQL calls it "Repeatable Read," Oracle calls it "Serializable"). Each transaction reads from a consistent snapshot of the database as of its start time. Writes from concurrent transactions are invisible. Most databases implement snapshot isolation via MVCC (Multi-Version Concurrency Control): rather than overwriting rows, they create new versions of rows, and each transaction reads the version that was current at its start time.

Snapshot isolation prevents most anomalies but not all. It specifically allows **write skew**: two concurrent transactions read the same data, make a decision based on what they read, and write to different objects — creating a state that could not have occurred if the transactions had run serially.

```
Example: On-call scheduling system (at least one doctor must be on call)

Initial state: Alice on-call = true, Bob on-call = true

Transaction A (Alice requests time off):
  t=1: SELECT COUNT(*) FROM doctors WHERE on_call = true -> 2
  t=2: # Count > 1, so it's safe for Alice to go off-call
  t=3: UPDATE doctors SET on_call = false WHERE name = 'Alice'; COMMIT;

Transaction B (Bob requests time off, concurrent):
  t=1: SELECT COUNT(*) FROM doctors WHERE on_call = true -> 2 (snapshot: before A commits)
  t=2: # Count > 1, so it's safe for Bob to go off-call
  t=3: UPDATE doctors SET on_call = false WHERE name = 'Bob'; COMMIT;

Final state: Alice on_call = false, Bob on_call = false — NOBODY IS ON CALL!
```

Write skew occurs because each transaction read the same rows but wrote to different rows. Serializable isolation (not just snapshot isolation) prevents this.

### Lost Updates — The Most Common Concurrency Bug

Lost updates occur when two transactions read-modify-write the same object concurrently. The classic pattern: both transactions read the value, both modify it, both write back — but one write overwrites the other.

```
Counter increment (lost update):
  Initial: counter = 5
  
  Transaction A: Read counter = 5; Write counter = 6; COMMIT;
  Transaction B: Read counter = 5; Write counter = 6; COMMIT;
  
  Expected: counter = 7 (both increments applied)
  Actual:   counter = 6 (one increment lost)
```

Solutions to lost updates:

**Atomic write operations:** Most databases support `UPDATE counter SET value = value + 1 WHERE id = X`, which the database executes atomically (not as a read-modify-write). Always prefer atomic operations over read-modify-write in application code.

**Explicit locking with SELECT FOR UPDATE:**
```sql
BEGIN;
SELECT * FROM products WHERE id = 123 FOR UPDATE;  -- Acquires row lock
-- No concurrent transaction can modify this row until we commit
UPDATE products SET quantity = quantity - 1 WHERE id = 123 AND quantity > 0;
COMMIT;
```

**Compare-and-swap:**
```sql
UPDATE products
SET quantity = quantity - 1
WHERE id = 123 AND quantity = $expected_quantity;
-- Check rows_affected: if 0, quantity changed since we read it -> retry
```

**Serializable isolation:** Using serializable isolation prevents lost updates as a side effect, but has higher performance overhead.

### Distributed Transactions: Two-Phase Commit

When a transaction spans multiple nodes (two database shards, or two different databases), ensuring atomicity requires a coordination protocol. The standard protocol is **Two-Phase Commit (2PC)**.

```
Coordinator (transaction manager)
        |
    +---+---+
    |       |
Participant  Participant
(Shard A)    (Shard B)

Phase 1 - Prepare:
  Coordinator -> Participant A: "Can you commit transaction T?"
  Coordinator -> Participant B: "Can you commit transaction T?"
  
  Participant A: Writes to WAL, acquires locks, responds "YES" (or "NO")
  Participant B: Writes to WAL, acquires locks, responds "YES" (or "NO")

Phase 2 - Commit (if all said YES):
  Coordinator -> Participant A: "Commit transaction T"
  Coordinator -> Participant B: "Commit transaction T"
  
  Participants commit and release locks.

Phase 2 - Abort (if any said NO):
  Coordinator -> All participants: "Abort transaction T"
```

2PC's fundamental problem: the **coordinator can fail** between Phase 1 and Phase 2. After participants have said "YES" (and written their "yes vote" to their WAL), they are in an uncertain state — they cannot commit or abort unilaterally; they must wait for the coordinator's decision. If the coordinator crashes, participants are stuck holding locks indefinitely, blocking all other transactions that need those locks.

This is called an **in-doubt transaction**. In-doubt transactions are the nightmare of 2PC systems:
- Participants hold row locks until the coordinator recovers (minutes, hours, potentially indefinitely)
- Database operations requiring those rows are blocked
- Manual intervention may be required if the coordinator's log is unrecoverable

2PC is used by:
- JTA (Java Transaction API) across multiple databases
- PostgreSQL's distributed transaction protocol (using PREPARE TRANSACTION and COMMIT PREPARED)
- Oracle's XA transactions
- Many enterprise systems

The consensus is that 2PC's failure modes make it unsuitable for high-availability distributed systems. The latency overhead (multiple round trips for coordination) and the in-doubt transaction risk are too high for most modern architectures.

### Saga — Distributed Transactions Without 2PC

Sagas (Hector Garcia-Molina and Kenneth Salem, 1987) solve distributed transactions differently: instead of requiring all participants to commit atomically, break the transaction into a sequence of local transactions, each with a **compensating transaction** that undoes its effect if a later step fails.

```
Order Saga:
  Step 1: Reserve inventory       -- local tx on Inventory service
  Step 2: Charge payment          -- local tx on Payment service
  Step 3: Create order record     -- local tx on Order service
  Step 4: Send confirmation email -- local tx on Notification service

Compensating transactions (run if later steps fail):
  Step 1C: Release inventory reservation
  Step 2C: Refund payment
  Step 3C: Cancel order record
```

If Step 3 fails, execute Step 2C (refund) and Step 1C (release inventory). If Step 2 fails, execute Step 1C (release inventory). The saga is idempotent by design — compensating transactions can be retried safely.

**Choreography-based saga:** Each service publishes events, and subsequent steps are triggered by event subscriptions. No central coordinator.

```
OrderService publishes: OrderCreated
  -> InventoryService listens: on OrderCreated, reserve inventory
     -> publishes: InventoryReserved
        -> PaymentService listens: on InventoryReserved, charge payment
           -> publishes: PaymentCharged
              -> ... or PaymentFailed
                 -> InventoryService listens: on PaymentFailed, release reservation
```

**Orchestration-based saga:** A central saga orchestrator sends commands to services and reacts to their responses. More explicit control flow, easier to monitor and debug.

```python
class OrderSagaOrchestrator:
    def execute(self, order_id: str, user_id: str, items: list, amount: int):
        saga_state = SagaState(order_id)
        
        try:
            # Step 1: Reserve inventory
            saga_state.log("reserving_inventory")
            reservation_id = self.inventory_service.reserve(items)
            saga_state.log("inventory_reserved", reservation_id=reservation_id)
            
            # Step 2: Charge payment
            saga_state.log("charging_payment")
            payment_id = self.payment_service.charge(user_id, amount)
            saga_state.log("payment_charged", payment_id=payment_id)
            
            # Step 3: Create order
            saga_state.log("creating_order")
            self.order_service.create(order_id, user_id, items, payment_id)
            saga_state.log("order_created")
            
        except InventoryUnavailable:
            # No compensation needed — inventory was never reserved
            saga_state.log("failed", reason="inventory_unavailable")
            raise
            
        except PaymentFailed:
            # Compensate: release inventory reservation
            saga_state.log("compensating")
            self.inventory_service.release(reservation_id)
            saga_state.log("compensated")
            raise
            
        except OrderCreationFailed:
            # Compensate: refund payment, release inventory
            saga_state.log("compensating")
            self.payment_service.refund(payment_id)
            self.inventory_service.release(reservation_id)
            saga_state.log("compensated")
            raise
```

Sagas are eventually consistent by design — between steps, intermediate states are visible (inventory is reserved but payment not yet charged). This is the trade-off: sagas sacrifice atomicity within the window between steps, but avoid 2PC's distributed locking and coordinator failure modes.

### Google Spanner's Approach

Google Spanner achieves globally distributed linearizable transactions through two innovations:

**TrueTime:** GPS receivers and atomic clocks in every Google datacenter. TrueTime exposes an API that returns a time interval `[earliest, latest]` — the true current time is guaranteed to fall within this interval. The interval is typically < 10ms.

**External Consistency:** Spanner guarantees that if transaction T1 commits before T2 starts (in real time), T2 will see T1's writes. This requires that T2's snapshot timestamp is after T1's commit timestamp.

Spanner's commit protocol uses TrueTime to assign commit timestamps:
1. Coordinate a 2PC-like protocol across Paxos groups (each shard has a Paxos group)
2. Before committing, wait until the current time is guaranteed to be after the intended commit timestamp (the "commit wait")
3. Commit with a timestamp that is guaranteed to be in the past

The commit wait makes Spanner's transactions slightly slower (by the TrueTime uncertainty, typically 4-7ms), but it ensures the commit timestamp ordering matches real-world ordering — enabling external consistency without any centralized clock.

## Deep Dive

The ACID acronym, coined by Haerder and Reuter (1983), is more pedagogically useful than technically precise. The four properties are not independent: durability is implemented via the write-ahead log, atomicity is implemented via the same log's undo capability, and isolation is implemented via MVCC or lock-based concurrency control. "Consistency" is the odd one out — it describes a correctness property that the database enforces on behalf of the application (foreign keys, check constraints, unique indexes) rather than a property of the storage mechanism. Kleppmann notes that the "C" in ACID is arguably not a database property at all: the database can only enforce constraints the application defines, and many real-world consistency requirements (business rules, invariants across services) cannot be expressed as database constraints. The database gives you AID; you are responsible for defining what "C" means in your domain.

PostgreSQL's Serializable Snapshot Isolation (SSI), introduced in version 9.1 (2011) and based on the research of Cahill et al. (2008), is a significant advance over earlier serializable implementations that used two-phase locking. Traditional serializable isolation with 2PL (two-phase locking) acquires read locks on every row read, preventing any concurrent modification — which produces correct results but severely limits concurrency. SSI tracks read/write dependencies between transactions at the level of predicates (not individual rows) and detects dangerous dependency cycles that would produce serialization anomalies. It only aborts a transaction when a dangerous cycle is detected, not when a concurrent write occurs. For workloads with low write-skew probability, SSI has transaction abort rates of less than 1% — providing serializable correctness at near-snapshot-isolation performance. This demolishes the assumption that serializable isolation is too expensive for production OLTP workloads.

Two-phase commit's in-doubt transaction problem is more fundamental than an engineering challenge — it reflects a mathematical impossibility. When a coordinator sends `PREPARE` to all participants and then crashes before sending `COMMIT`, each participant has voted "yes" and locked its resources, but cannot commit unilaterally (the decision might have been `ABORT`). The participants must wait for the coordinator to recover. This is a variant of the Two Generals Problem: you cannot achieve atomic commitment with guaranteed termination in an asynchronous system in the presence of failures. 3PC (Three-Phase Commit) attempts to address this by adding a pre-commit phase that allows participants to commit without the coordinator under certain conditions, but it introduces new vulnerabilities to network partitions. In practice, the industry has moved away from 2PC for cross-service transactions and toward Sagas precisely because 2PC's termination guarantee requires the coordinator to be highly available — which reintroduces a single point of failure the distributed architecture was meant to eliminate.

The Saga pattern (Garcia-Molina and Salem, 1987) was originally proposed for long-lived transactions — database transactions that might span minutes or hours, like an airline reservation that requires coordinating flights, hotels, and car rentals. Traditional 2PC holds locks for the entire duration, which is unacceptable for long-running processes. The Saga breaks the long transaction into a sequence of short local transactions, each of which releases its locks immediately. If a later step fails, compensating transactions undo the earlier steps' effects. The key insight is that compensation is different from undo: a compensating transaction is a new forward-moving transaction that reverses the business effect of the original (cancel the reservation, refund the payment), not a database-level rollback. This means compensation can fail, can be retried, and must be idempotent. The saga pattern is not a weaker version of 2PC — it is a different model that accepts eventual consistency within the saga's execution window in exchange for high availability and no distributed locking.

Spanner's external consistency — achieved via TrueTime and commit-wait — is the most ambitious distributed transaction implementation in production and the most instructive. The commit-wait protocol works as follows: before committing a write transaction, Spanner assigns it a commit timestamp `s`. The commit is not made visible until the real time is guaranteed to be greater than `s`. Because TrueTime provides a bounded uncertainty interval `[earliest, latest]`, the commit wait is `latest - now()`. This ensures that any transaction that starts after this one commits (in real time) will have a start timestamp greater than `s`, and will therefore see this transaction's writes. The result is external consistency: the commit order matches the real-time order of transactions, across all shards, globally. The cost is 4–14ms of commit wait per write transaction — the price of GPS-grade clock synchronization. For Google's financial and advertising systems, this cost was judged acceptable in exchange for eliminating the entire class of distributed transaction anomalies that plague systems without global ordering.

## Implementation Guide

**Implementing serializable isolation correctly in PostgreSQL:**

```sql
-- Use SERIALIZABLE isolation for write skew prevention
BEGIN ISOLATION LEVEL SERIALIZABLE;

-- The on-call example from above — now correctly handled
SELECT COUNT(*) FROM doctors WHERE on_call = true;
-- Count > 1, safe to go off-call

UPDATE doctors SET on_call = false WHERE name = 'Alice';
COMMIT;
-- PostgreSQL's Serializable Snapshot Isolation (SSI) detects the write skew
-- and aborts one of the concurrent transactions with:
-- ERROR: could not serialize access due to read/write dependencies among transactions
-- The application must retry the aborted transaction.
```

```python
import psycopg2
from psycopg2 import errors

def update_oncall_with_retry(db_dsn: str, doctor_name: str, max_retries: int = 3):
    """Serializable transactions may be aborted and require retry."""
    for attempt in range(max_retries):
        conn = psycopg2.connect(db_dsn)
        try:
            conn.set_isolation_level(
                psycopg2.extensions.ISOLATION_LEVEL_SERIALIZABLE
            )
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM doctors WHERE on_call = true")
                count = cur.fetchone()[0]
                if count <= 1:
                    raise Exception("Cannot go off-call: no other doctor available")
                cur.execute(
                    "UPDATE doctors SET on_call = false WHERE name = %s",
                    (doctor_name,)
                )
            conn.commit()
            return  # Success
        except errors.SerializationFailure:
            conn.rollback()
            if attempt == max_retries - 1:
                raise
            time.sleep(0.1 * (2 ** attempt))  # Exponential backoff
        finally:
            conn.close()
```

**Implementing the Outbox pattern for saga step atomicity:**

```python
class SagaStep:
    """
    Atomic saga step: business operation + outbox event in one transaction.
    Ensures the next saga step is triggered if and only if this step succeeds.
    """
    def reserve_inventory(self, db, order_id: str, items: list) -> str:
        with db.transaction():
            # Business operation: reserve items
            for item in items:
                db.execute("""
                    UPDATE inventory SET reserved = reserved + %s
                    WHERE product_id = %s AND (available - reserved) >= %s
                """, (item['qty'], item['product_id'], item['qty']))
                if db.rowcount == 0:
                    raise InsufficientInventory(item['product_id'])

            reservation_id = str(uuid.uuid4())
            db.execute("""
                INSERT INTO reservations (id, order_id, items, status)
                VALUES (%s, %s, %s, 'reserved')
            """, (reservation_id, order_id, json.dumps(items)))

            # Outbox: atomically record the event to trigger next saga step
            db.execute("""
                INSERT INTO outbox (id, aggregate_id, event_type, payload)
                VALUES (%s, %s, 'InventoryReserved', %s)
            """, (str(uuid.uuid4()), order_id, json.dumps({
                'order_id': order_id,
                'reservation_id': reservation_id,
                'items': items,
            })))

        return reservation_id
        # If any of the above fails, the entire transaction rolls back.
        # No partial state: no reservation without the outbox event.
```

## When to Use / When NOT to Use

**Use serializable isolation when:**
- Write skew must be prevented (banking, inventory, scheduling systems with invariants)
- Correctness matters more than maximum throughput
- The transaction logic is complex enough that you cannot identify and prevent all anomalies manually

**Use snapshot isolation (repeatable read) when:**
- Write skew is not a concern (your transactions don't make decisions based on reads that affect different rows)
- You need high read throughput without dirty reads or non-repeatable reads

**Use 2PC when:**
- You need truly atomic transactions across multiple databases or services
- You're in an environment where the operational complexity of 2PC is manageable (enterprise ETL, batch processing)
- The participants are well-managed and coordinator failure can be handled operationally

**Use Sagas when:**
- You need distributed coordination across microservices
- Long-running business processes require compensation on failure
- High availability is required (2PC's locking would be unacceptable)
- Intermediate states being visible is acceptable

**Accept eventual consistency when:**
- The business process can tolerate brief inconsistency
- The compensation mechanism is well-defined and rare
- The cost of distributed coordination outweighs the value of atomicity

## Common Mistakes

**Mistake 1: Assuming "ACID" means full serializability.**
Most databases default to Read Committed isolation, which prevents dirty reads but allows non-repeatable reads, lost updates, and write skew. PostgreSQL defaults to Read Committed. MySQL InnoDB defaults to Repeatable Read. Neither of these defaults is Serializable. If you need the strongest guarantees, you must explicitly request `ISOLATION LEVEL SERIALIZABLE`.

**Mistake 2: Using 2PC for high-availability microservices.**
2PC was designed for tightly coupled systems (multiple databases in a data center under one team's control). For microservices across independent services with independent deployment cycles, 2PC creates tight coupling, lock contention across service boundaries, and in-doubt transaction risk during the inevitable coordinator failures. Use Sagas instead.

**Mistake 3: Not handling serialization failures in application code.**
Serializable transactions can be aborted with `ERROR: could not serialize access due to read/write dependencies`. Applications that don't retry on serialization failures will return 500 errors to users when the database does exactly what it's supposed to do. Every application that uses serializable isolation must handle serialization failures with retry logic.

**Mistake 4: Using SELECT FOR UPDATE everywhere "to be safe."**
`SELECT FOR UPDATE` acquires an exclusive row lock for the duration of the transaction. If the transaction is long-running (making network calls, doing complex computation), it holds those locks for a long time, blocking all concurrent writers. Use explicit locking only for the specific rows you know will be written, and keep locked transactions short. Prefer optimistic concurrency (compare-and-swap) over pessimistic locking for most use cases.

**Mistake 5: Not designing saga compensating transactions to be idempotent.**
Compensating transactions are retried on failure. If your compensation for "refund payment" charges the customer twice when called twice, your retry mechanism turns a single failure into a double charge. Every compensating transaction must be idempotent — calling it multiple times has the same effect as calling it once.

## Connections

- **Consistency Models (03-consistency-models.md):** Isolation levels in transactions correspond to consistency models in distributed systems. Serializable = linearizable. Snapshot isolation ≈ causal consistency.
- **Consensus Algorithms (05-consensus-algorithms.md):** Distributed transactions (2PC across Paxos groups) are how Spanner achieves globally consistent transactions. Understanding consensus explains how Spanner's commit protocol works.
- **Replication (01-replication.md):** Distributed transactions must be coordinated across all replicas of all participating partitions. The interaction between replication and distributed transactions is one of the most complex areas of distributed systems.
- **CAP Theorem (04-cap-theorem.md):** Serializable distributed transactions are CP — they sacrifice availability during partitions to maintain consistency. Sagas are AP — each local transaction commits independently, accepting eventual consistency.

## Key Insights

The most important insight about transactions is that **isolation is not binary — it's a spectrum, and the default level is rarely what you think it is**. Most databases default to Read Committed, which allows lost updates, non-repeatable reads, and write skew. Engineers who don't understand this write application code that assumes serializable semantics and wonder why they get race conditions in production. Know your database's default isolation level, know what anomalies it allows, and use a higher level when your business logic requires it.

The second insight is that **the Saga pattern is not a compromise — it's the correct model for most distributed business processes**. Human business processes are naturally compensable: you book a flight, book a hotel, book a car — and if the car is unavailable, you cancel the hotel and flight. This is a saga. Two-phase commit is an engineering solution to a database problem; Sagas model how business processes actually work.

The third insight is that **serializable isolation is more available than engineers assume**. PostgreSQL's Serializable Snapshot Isolation (SSI) detects most write skew without acquiring read locks — it tracks read/write dependencies and aborts one of the conflicting transactions only when a conflict is detected. For workloads without heavy write skew, SSI has very low abort rates and provides the strongest isolation guarantee at near-snapshot-isolation performance. Use it more.

Finally, understand that **Spanner's external consistency is what "ACID in a distributed system" actually means**. Before Spanner, "distributed transactions" meant 2PC with all its operational nightmares. Spanner proved that globally consistent transactions are achievable at scale, at the cost of hardware (TrueTime's GPS clocks and atomic oscillators) and a few milliseconds of additional latency. The distributed systems community's long-held belief that strong consistency required sacrificing availability or performance has been significantly qualified by Spanner's production success.
