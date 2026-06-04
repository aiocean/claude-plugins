# Event Sourcing Pattern

> "Instead of storing just the current state of the data in a domain, use an append-only store to record the full series of actions taken on that data. The store acts as the system of record and can be used to materialize the domain objects." — Microsoft Azure Architecture Center

## The Problem

Your banking application stores account balances. The `accounts` table has a `balance` column. Simple. Reliable. When a customer calls and says "I had $500 yesterday but now I have $200, what happened?" — you have no answer. The current balance is $200. That's all you know. The history is gone.

This is the default state model: you store current state and overwrite it when it changes. It's how most databases work, how most applications are written, and how most data is lost. You know where you are. You don't know how you got there.

The audit log is the usual band-aid: add a separate `account_transactions` table that records what happened. Now you have two sources of truth. They drift. The balance doesn't match the sum of transactions because a bug in the balance update code skipped a transaction, or a migration script updated balances without recording transactions, or a production hotfix wrote directly to the balance column. Consistency between current state and history requires you to keep them synchronized — and synchronization is a perennial source of bugs.

Event Sourcing inverts the model. Instead of storing current state (and losing history), you store the sequence of events that caused the state. Current state is a derived view — you compute it by replaying the events. The events are the source of truth. Current state is a materialized view of that truth.

This gives you something extraordinarily valuable: complete, immutable history as the primary data model, not as an afterthought.

## Core Concept

In Event Sourcing, the state of an entity is not stored directly. Instead, every change to the entity's state is captured as an event — an immutable record of what happened. Current state is derived by replaying all events for an entity from the beginning.

```
TRADITIONAL STATE MODEL:
Account { id: "acct-1", balance: $200 }
(history lost)

EVENT SOURCED MODEL:
Event Log for acct-1:
  1. AccountOpened    { accountId: "acct-1", initialBalance: $0,   at: 2024-01-01 }
  2. MoneyDeposited   { accountId: "acct-1", amount: $500,         at: 2024-01-15 }
  3. MoneyWithdrawn   { accountId: "acct-1", amount: $300,         at: 2024-01-20 }

Current State (derived):
  balance = $0 + $500 - $300 = $200

History (available):
  "You deposited $500 on Jan 15, withdrew $300 on Jan 20"
```

The event log is append-only. Events are never deleted or modified. They are immutable facts about what happened. This makes the event log the most reliable data you have — facts don't change after they're recorded.

### Event Store structure

```
events table:
─────────────────────────────────────────────────────────────
stream_id     | sequence | event_type          | payload       | recorded_at
─────────────────────────────────────────────────────────────
acct-1        | 1        | AccountOpened       | {...}         | 2024-01-01
acct-1        | 2        | MoneyDeposited      | {amount:500}  | 2024-01-15
acct-1        | 3        | MoneyWithdrawn      | {amount:300}  | 2024-01-20
acct-2        | 1        | AccountOpened       | {...}         | 2024-01-05
acct-2        | 2        | MoneyDeposited      | {amount:1000} | 2024-01-10
```

Each row is one event for one entity (stream). The `sequence` is a monotonically increasing counter per stream. Replaying events for `acct-1` means fetching all rows where `stream_id = 'acct-1'` ordered by `sequence`.

### Snapshots

For long-lived entities with thousands of events, replaying from event 1 on every read is slow. Snapshots solve this: periodically record the current state as a snapshot. On replay, load the most recent snapshot, then replay only events after the snapshot's sequence number.

```
Snapshot at sequence 5000:
  { accountId: "acct-1", balance: $42,350, at_sequence: 5000 }

On next read:
  Load snapshot (balance=$42,350 at seq 5000)
  Replay events from seq 5001 onwards (fast — only recent events)
  Apply delta
```

Snapshots are a performance optimization, not a replacement for the event log. The event log is still the source of truth; snapshots are derived.

## Deep Dive

**The origin: domain state as a sequence of facts.** Greg Young's formalization of Event Sourcing in the context of Domain-Driven Design (2010) draws on an insight from accounting: a bank account's balance is not stored — it is computed by replaying the sequence of transactions against the account. The ledger is the truth; the balance is a derived view. Young's architectural generalization: any domain entity's current state can be reconstructed by replaying the sequence of events that affected it. This is not merely an implementation technique — it is a fundamentally different ontology for domain state. In a CRUD system, state is a mutable fact that loses history when updated. In an event-sourced system, state is the accumulated result of immutable facts, and history is never lost. Martin Kleppmann's *Designing Data-Intensive Applications* reinforces this framing: the event log is the source of truth; all other representations are derived views that can be rebuilt from it.

**The event log as the integration backbone.** Kleppmann's treatment of event streams in *DDIA* extends Event Sourcing beyond a single service to an integration mechanism. When the event log is externalized — made available to other services as a subscribable stream — it becomes the integration backbone of the system. Downstream services consume the event stream and project it into their own read models, optimized for their own query patterns. This is the same principle as the Materialized View pattern, but applied to inter-service integration. Kleppmann identifies this as "unbundling the database": the event log is the write-ahead log (WAL) of the business domain, and consumers are analogous to database read replicas that maintain their own indexes. The advantage over point-to-point integration: new consumers can be added without modifying the event producer, and they can replay from any point in history to bootstrap their read models.

**Schema evolution: the hardest operational problem.** Kleppmann devotes significant analysis in *DDIA* to the schema evolution problem in event-sourced systems, which is qualitatively harder than schema evolution in mutable database systems. In a mutable database, you migrate the schema and the data changes in place. In an event-sourced system, old events are immutable and must be readable by new code. A field added to an event type in version 2 is absent from all version-1 events in the log. Code that processes the log must handle both versions simultaneously. Kleppmann's treatment of forward and backward compatibility in serialization formats (Avro, Protocol Buffers, Thrift) applies here: the schema registry and the event versioning strategy must be designed from the start, not retrofitted. The common approaches — upcasting (transform old events to new format on read), versioned event types (OrderPlacedV1, OrderPlacedV2), and schema-first design with mandatory compatibility rules — all have trade-offs that must be evaluated before the first production event is written.

**Snapshots and the aggregate load performance problem.** For long-lived aggregates — a bank account open for 20 years with thousands of transactions — replaying the full event history on every command is prohibitively expensive. The snapshot optimization (periodically persist the current aggregate state as a snapshot, then replay only events after the snapshot) is well-understood but introduces its own complexity. The Google SRE Book's treatment of operational complexity applies: snapshots are a caching layer for the event store, and caching always introduces consistency risk. A snapshot that is out of date, corrupted, or from a different schema version can cause silent state corruption when replayed events are applied on top of it. The snapshot store and the event store must be kept consistent, and the system must be able to fall back to full replay when snapshot validity cannot be confirmed.

**The GDPR right-to-erasure problem.** Event Sourcing's immutability property creates a direct conflict with GDPR's "right to be forgotten" requirement. If personal data appears in domain events — a customer's name in an OrderPlaced event, a user's email in a UserRegistered event — those events cannot be deleted without breaking the event log's integrity. Kleppmann's treatment of data management in distributed systems identifies two practical approaches: crypto-shredding (encrypt personal data in events with a per-user key, then delete the key to render the data unreadable) and event log compaction (replace events containing personal data with redacted versions, breaking the strict append-only property but satisfying the erasure requirement). Both are complex and must be designed for before personal data enters the event log. This is a design constraint that must be surfaced during initial Event Sourcing adoption, not after the first data subject access request arrives.

## Implementation Guide

### Step 1: Model your domain as events

```typescript
// Events are past-tense, immutable facts
interface DomainEvent {
  eventId: string;
  streamId: string;      // aggregate ID (e.g., accountId)
  eventType: string;
  sequence: number;      // position in the stream
  occurredAt: string;    // ISO 8601
  payload: unknown;
}

// Specific event types
interface AccountOpened {
  accountId: string;
  customerId: string;
  accountType: 'checking' | 'savings';
  initialBalance: number;
  currency: string;
}

interface MoneyDeposited {
  accountId: string;
  amount: number;
  currency: string;
  reference: string;
  source: string;
}

interface MoneyWithdrawn {
  accountId: string;
  amount: number;
  currency: string;
  reference: string;
  destination: string;
}

interface TransferFailed {
  accountId: string;
  attemptedAmount: number;
  reason: 'insufficient_funds' | 'account_suspended' | 'daily_limit_exceeded';
}
```

### Step 2: Implement the aggregate

The aggregate loads its state by replaying events and applies commands:

```typescript
class BankAccount {
  private balance: number = 0;
  private status: 'active' | 'suspended' | 'closed' = 'active';
  private pendingEvents: DomainEvent[] = [];
  private sequence: number = 0;

  // Reconstruct state by replaying events (called on load)
  static rehydrate(events: DomainEvent[]): BankAccount {
    const account = new BankAccount();
    for (const event of events) {
      account.apply(event);
    }
    return account;
  }

  // Command: deposit money
  deposit(amount: number, currency: string, reference: string): void {
    if (this.status !== 'active') throw new AccountNotActiveError();
    if (amount <= 0) throw new InvalidAmountError(amount);

    this.raise({
      eventType: 'MoneyDeposited',
      payload: { amount, currency, reference },
    });
  }

  // Command: withdraw money
  withdraw(amount: number, currency: string, reference: string): void {
    if (this.status !== 'active') throw new AccountNotActiveError();
    if (amount <= 0) throw new InvalidAmountError(amount);

    if (this.balance < amount) {
      this.raise({
        eventType: 'TransferFailed',
        payload: { attemptedAmount: amount, reason: 'insufficient_funds' },
      });
      throw new InsufficientFundsError(this.balance, amount);
    }

    this.raise({
      eventType: 'MoneyWithdrawn',
      payload: { amount, currency, reference },
    });
  }

  // Apply events to update internal state
  private apply(event: DomainEvent): void {
    this.sequence = event.sequence;

    switch (event.eventType) {
      case 'AccountOpened': {
        const p = event.payload as AccountOpened;
        this.balance = p.initialBalance;
        this.status = 'active';
        break;
      }
      case 'MoneyDeposited': {
        const p = event.payload as MoneyDeposited;
        this.balance += p.amount;
        break;
      }
      case 'MoneyWithdrawn': {
        const p = event.payload as MoneyWithdrawn;
        this.balance -= p.amount;
        break;
      }
      case 'AccountSuspended': {
        this.status = 'suspended';
        break;
      }
    }
  }

  private raise(partial: Partial<DomainEvent>): void {
    const event: DomainEvent = {
      eventId: crypto.randomUUID(),
      streamId: this.accountId,
      eventType: partial.eventType!,
      sequence: this.sequence + 1 + this.pendingEvents.length,
      occurredAt: new Date().toISOString(),
      payload: partial.payload,
    };
    this.apply(event);
    this.pendingEvents.push(event);
  }

  getPendingEvents(): DomainEvent[] { return [...this.pendingEvents]; }
  clearPendingEvents(): void { this.pendingEvents = []; }
}
```

### Step 3: Implement the event store

```typescript
class EventStore {
  constructor(private readonly db: Database) {}

  async appendEvents(
    streamId: string,
    events: DomainEvent[],
    expectedSequence: number, // optimistic concurrency
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Optimistic concurrency check
      const current = await tx.query(
        'SELECT MAX(sequence) as max_seq FROM events WHERE stream_id = $1',
        [streamId],
      );
      const currentSeq = current.rows[0]?.max_seq ?? 0;

      if (currentSeq !== expectedSequence) {
        throw new ConcurrencyConflictError(streamId, expectedSequence, currentSeq);
      }

      // Append events
      for (const event of events) {
        await tx.query(
          `INSERT INTO events (event_id, stream_id, sequence, event_type, payload, occurred_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [event.eventId, event.streamId, event.sequence,
           event.eventType, JSON.stringify(event.payload), event.occurredAt],
        );
      }
    });
  }

  async loadStream(streamId: string, fromSequence = 0): Promise<DomainEvent[]> {
    const rows = await this.db.query(
      `SELECT * FROM events 
       WHERE stream_id = $1 AND sequence > $2
       ORDER BY sequence ASC`,
      [streamId, fromSequence],
    );
    return rows.map(this.rowToEvent);
  }

  async loadStreamWithSnapshot(
    streamId: string,
  ): Promise<{ snapshot: Snapshot | null; events: DomainEvent[] }> {
    const snapshot = await this.loadLatestSnapshot(streamId);
    const events = await this.loadStream(streamId, snapshot?.sequence ?? 0);
    return { snapshot, events };
  }
}
```

### Step 4: Handle schema evolution

Events are immutable — you cannot change past events. When your event schema changes, you handle it via toleration and upcasting:

**Toleration**: Write consumers that handle both the old and new event shapes:

```typescript
function applyMoneyDeposited(state: AccountState, payload: unknown): AccountState {
  // Handle both v1 (no currency field) and v2 (with currency field)
  const p = payload as any;
  return {
    ...state,
    balance: state.balance + p.amount,
    currency: p.currency ?? state.currency ?? 'USD', // default for old events
  };
}
```

**Upcasting**: Transform old events to new format at read time:

```typescript
class EventUpcaster {
  upcast(event: DomainEvent): DomainEvent {
    if (event.eventType === 'MoneyDeposited' && !('currency' in (event.payload as any))) {
      return {
        ...event,
        payload: {
          ...event.payload as object,
          currency: 'USD', // add missing field with default
        },
      };
    }
    return event;
  }
}
```

Never change the stored events. Transform at read time.

### Step 5: GDPR "right to erasure" — crypto-shredding

GDPR gives individuals the right to have their data erased. But Event Sourcing stores immutable history. How do you erase data from an immutable log?

**Crypto-shredding**: Encrypt personal data in events with a per-customer key. To "erase" a customer's data, delete their encryption key. Their events remain in the log but become unreadable — effectively erased.

```typescript
class EncryptedEventStore {
  async appendEvent(streamId: string, event: DomainEvent, customerId: string): Promise<void> {
    const key = await this.keyStore.getOrCreateKey(customerId);
    const encryptedPayload = await this.encrypt(JSON.stringify(event.payload), key);

    await this.db.query(
      `INSERT INTO events (stream_id, sequence, event_type, encrypted_payload, customer_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [streamId, event.sequence, event.eventType, encryptedPayload, customerId],
    );
  }

  // GDPR erasure: delete the encryption key
  async eraseCustomerData(customerId: string): Promise<void> {
    await this.keyStore.deleteKey(customerId);
    // Events remain but payload is now unreadable (crypto-shredded)
  }
}
```

This approach is accepted by most data protection authorities as satisfying the "right to erasure" requirement, since the personal data is effectively inaccessible without the key.

## When to Use

**Regulated industries requiring immutable audit trails.** Banking, insurance, healthcare, financial trading — these industries have regulatory requirements for complete transaction history. Event Sourcing makes the audit trail the primary data model, not an afterthought.

**Complex domain behavior requiring temporal queries.** "What was the state of this account at 2:47 PM on March 15?" Event Sourcing makes this trivial: replay events up to that timestamp. Traditional state models cannot answer this question.

**Root cause analysis of complex domain behavior.** When something goes wrong in a complex domain process, the complete event history lets you reconstruct exactly what happened and in what sequence. Invaluable for debugging production incidents in financial or healthcare systems.

**Event-driven architectures where events are the natural integration mechanism.** If your system already publishes domain events for downstream systems to consume, Event Sourcing makes the event log authoritative. The events you publish are the same events you store.

**Systems that need to rebuild read models from scratch.** New read model requirements emerge. With Event Sourcing, you build the new projection by replaying the event log. Without Event Sourcing, you need a full data migration.

## When NOT to Use

**Most applications.** This is not sarcasm. The vast majority of applications — CRUD applications, standard web services, typical microservices — do not need Event Sourcing. The pattern adds significant complexity in schema evolution, snapshot management, projection maintenance, and eventual consistency. These costs are justified only when the pattern's unique capabilities (complete history, temporal queries, event-driven integration) are genuinely needed.

**Simple CRUD entities with no behavioral complexity.** A `User` table with name, email, and preferences is not a good candidate for Event Sourcing. The events would be `NameChanged`, `EmailChanged`, `PreferenceChanged` — there's no domain behavior here, just property mutations. A standard update operation is simpler.

**When the team is not prepared for eventual consistency.** CQRS + Event Sourcing introduces eventual consistency between the event store and read models. If the team's experience is with ACID databases and synchronous queries, the debugging and operational burden of eventual consistency is significant. Ramp up gradually.

**Microsoft's 2026 warning**: Updated Azure Architecture Center documentation explicitly states: "Event Sourcing is not a general-purpose pattern. Apply it in areas where the complete history of changes is a functional requirement, not as a default architecture for all new services. Teams frequently over-apply this pattern and pay a long-term complexity cost that exceeds the benefit."

**When GDPR or data deletion requirements are complex.** Crypto-shredding works for many cases, but systems with complex erasure requirements (erase a person's data across many different event types and streams) may find the encryption key management burden prohibitive.

## Common Mistakes

**Mistake 1: Using Event Sourcing everywhere.** The most common mistake. Teams excited about Event Sourcing apply it to every entity, every aggregate, every service. Most entities are better served by traditional state storage. Use Event Sourcing selectively for aggregates where the pattern's capabilities are genuinely needed.

**Mistake 2: Storing commands instead of events.** Events describe what happened (`MoneyDeposited`), not what was requested (`DepositMoney`). Storing commands conflates intent with fact. Commands may fail or be rejected; events are facts that have occurred. Store events.

**Mistake 3: Making events too granular or too coarse.** Events that are too granular (`FirstNameChanged`, `LastNameChanged` separately) create noise. Events that are too coarse (`CustomerDataUpdated` with a diff payload) lose semantic meaning. The right granularity is at the level of meaningful domain facts.

**Mistake 4: Not planning for schema evolution from day one.** Event schemas will change. New fields will be needed. Old fields will be deprecated. You will have millions of old events in the store with the old schema. Design your event consumers to tolerate missing fields and implement upcasters before you need them.

**Mistake 5: Forgetting that projections can fail and get out of sync.** Event projectors that update read models are software with bugs. They fail. They get behind. They produce incorrect data. You need monitoring for projector lag, alerting for projector failures, and a process for replaying projectors to rebuild read models from scratch.

**Mistake 6: Treating the snapshot as the source of truth.** Snapshots are a performance optimization. The event log is the truth. If a snapshot is corrupted or incorrect, it must be discardable and rebuildable from the events. Never write to snapshots without also writing the corresponding events.

## Connections

**CQRS** (Volume 03, article 11): CQRS and Event Sourcing are frequently combined but are independent patterns. Event Sourcing provides the event log that CQRS read models are built from. CQRS provides the read/write separation that makes Event Sourcing practical at scale. Together they form a powerful architecture — understand each independently before combining.

**Choreography Pattern** (Volume 03, article 06): Events stored in the event store are often the same events that drive downstream choreography. The event store becomes the source for event-driven integration.

**Compensating Transaction** (Volume 03, article 10): In event-sourced systems, compensation is modeled as new events (compensating events) appended to the event log, not as deletion of prior events. The complete history — including the compensation — is preserved.

**Cache-Aside Pattern** (Volume 03, article 05): Aggregate state derived from event replay is expensive to compute. Caching snapshots and current state (keyed by stream ID) reduces replay cost for frequently accessed aggregates.

**Claim Check Pattern** (Volume 03, article 08): When events contain large payloads (attached documents, binary data), the Claim Check pattern stores the payload in object storage and records only the reference in the event. The event log stays lean; large data is stored separately.

## Key Insights

1. **Events are facts; state is a projection.** This inversion — making history primary and current state derived — is the fundamental shift of Event Sourcing. It is powerful and correct for certain domains. For most domains, it is unnecessary complexity.

2. **The event log is the most trustworthy data you have.** Appended facts that cannot be modified are more reliable than state that can be updated in place. In financial and audit contexts, this reliability is the primary value.

3. **Schema evolution is the hardest operational challenge.** Events live forever (or for a very long time). Schemas change. Managing the evolution of event schemas across millions of stored events, while maintaining backward compatibility in all consumers, is the primary long-term operational cost of Event Sourcing.

4. **Snapshots are an optimization, not a feature.** Add snapshots when replay performance is a measured problem, not preemptively. Every snapshot strategy adds complexity (when to snapshot, how to invalidate, how to rebuild). Defer until needed.

5. **GDPR and immutability are not fundamentally incompatible.** Crypto-shredding resolves the apparent conflict. But it requires key management infrastructure and careful design. Plan for it before you have millions of events, not after.

6. **Most systems that think they need Event Sourcing actually need a good audit log.** An append-only audit log table that records what changed, when, and by whom satisfies most "we need history" requirements without the full complexity of Event Sourcing. Evaluate whether a simpler solution meets the actual requirement.

7. **Start with CQRS (Level 1) before adding Event Sourcing.** If you think you need Event Sourcing, start by separating your command and query models (CQRS Level 1). Many teams discover that this alone solves their problems, and they never need Event Sourcing. If you still need the full event log after applying Level 1 CQRS, then Event Sourcing is justified.
