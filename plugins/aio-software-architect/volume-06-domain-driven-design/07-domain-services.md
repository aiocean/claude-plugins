# Domain Services — Stateless Operations

> "Sometimes, it just isn't a thing. Some concepts from the domain aren't natural to model as objects... When a significant process or transformation in the domain is not a natural responsibility of an entity or value object, add an operation to the model as a standalone interface declared as a service." — Eric Evans, Domain-Driven Design

## The Problem

A banking system needs to transfer funds between two accounts. `Account A` has a `debit()` method. `Account B` has a `credit()` method. But where does the transfer logic live?

Option 1: `accountA.transferTo(accountB, amount)`. Now `Account` knows about other `Account` objects. It can call `accountB.credit(amount)` directly. But this violates the rule that aggregates reference other aggregates only by ID. It also gives `Account` a responsibility that feels wrong — an account doesn't transfer funds to another account; a *transfer operation* moves funds between accounts. And what if the debit succeeds but the credit fails? The rollback logic belongs in `Account`?

Option 2: `accountB.receiveTransferFrom(accountA, amount)`. Same problems in reverse.

Option 3: Put it in the application service. The application service loads both accounts, calls `accountA.debit(amount)`, then `accountB.credit(amount)`. But the rule "are the accounts in the same currency?" is a domain rule, not an application concern. The idempotency checks, the overdraft protection, the transfer limit enforcement — these are domain rules. Putting them in the application service produces the Anemic Domain Model anti-pattern: domain objects with no behavior, all the logic in service classes.

The correct answer: a Domain Service called `FundsTransferService` (or `MoneyTransferService`, or whatever the Ubiquitous Language dictates). This service is stateless, named after a domain concept, and contains the domain logic that genuinely doesn't belong in a single entity.

## Core Concept

A Domain Service is a stateless operation that expresses a significant domain concept but doesn't naturally belong to any single entity or value object. Domain services are the right home for:

- **Operations that involve multiple aggregates**: When a business operation requires coordination across two or more aggregates, and the logic of that coordination is domain logic (not infrastructure or application concern), it belongs in a domain service.

- **Operations that don't naturally fit any entity**: Some domain operations are verbs without obvious noun ownership. "Calculate the optimal route" doesn't belong to a `Vehicle`, a `Route`, or a `Map` — it belongs to a `RouteCalculationService`. "Assess credit risk" doesn't belong to a `Customer` or an `Application` — it belongs to a `CreditRiskAssessor`.

- **Algorithms that involve external domain concepts**: When a calculation or rule requires input from multiple domain concepts but doesn't meaningfully "belong" to any of them, a domain service holds the logic.

Domain services are **not**:

- Application services (which orchestrate use cases, handle transactions, call repositories)
- Infrastructure services (which send emails, call external APIs, write to databases)
- Utility classes (which provide generic technical functionality)

The naming convention matters: domain services are typically named as verbs or verb phrases — `FundsTransfer`, `TaxCalculation`, `RouteOptimization`, `PriceNegotiation`. Or as nouns that describe a capability — `CreditRiskAssessor`, `ShippingCostCalculator`, `CurrencyConverter`. The name comes from the Ubiquitous Language, just like entity and value object names.

Domain services are stateless. They hold no state between calls. All input comes from parameters; all output comes from return values or side effects expressed through the aggregates passed in. This statelessness makes domain services easy to test (no setup, no teardown) and easy to scale (no shared state).

The most dangerous anti-pattern domain services enable is the **Anemic Domain Model**. This occurs when developers put *all* domain logic in services, leaving entities and value objects as nothing more than data containers. The result looks like DDD (there are domain services!) but isn't — the entities have no behavior, and the services grow into procedural God objects. Domain services should hold only the logic that genuinely doesn't belong in an entity. The default for domain logic should always be: put it in the entity or value object first. Only extract to a domain service when a specific reason justifies it.

## Deep Dive

Evans introduced domain services to resolve a specific tension in object-oriented domain modeling: not every operation in the domain is naturally the responsibility of an entity or value object, but the Anemic Domain Model anti-pattern warns against putting all logic in services. The domain service is the resolution: it is the right home for operations that genuinely do not belong on any entity, and the wrongness of using it as a default home for all operations.

The diagnostic question Evans provided for identifying when a domain service is appropriate is deceptively simple: "Does this operation feel forced on any entity or value object?" The word "forced" carries significant weight. If you can assign an operation to an entity and the assignment feels natural — the entity's invariants are protecting, the operation works with the entity's data, the name fits the entity's vocabulary — then it belongs there. If the assignment feels strained — the entity needs unusual dependencies, the name sounds wrong in the entity's context, the operation cuts across the entity's natural scope — then a domain service is likely correct. This judgment is qualitative, which is why Evans emphasized domain modeling as a skill that develops through practice and domain expert collaboration.

The Anemic Domain Model anti-pattern that Evans warned against — and which Martin Fowler articulated clearly in a 2003 article — is the failure mode that domain services enable when misused. Fowler described it as "domain objects which do little more than field accessors (getters and setters), with all the business logic in a set of service classes." The objects look like DDD entities but behave like data transfer objects. All behavior is in services. The domain layer becomes a procedural collection of service classes operating on passive data structures. Fowler noted that this anti-pattern is "all too common" precisely because it is the path of least resistance: it is easier to put new logic in a service than to figure out which entity it belongs to. Vernon built on this in the Red Book by establishing a default rule: when in doubt, put the behavior on the entity. The bar for creating a domain service should be high — the operation must genuinely have no good home on any entity or value object.

The statelessness requirement for domain services has a deeper motivation than thread safety. Evans argued that state in a domain service is almost always a sign that the service is doing something it shouldn't: either accumulating results that should be in an aggregate, or caching infrastructure concerns that should be in a repository, or managing workflow state that should be in an application service. A pure domain service is a function: inputs in, outputs out, no side effects beyond the aggregates it operates on. This purity makes domain services the easiest parts of the domain to test — no mocking required beyond the domain objects themselves, no setup of infrastructure state, no teardown of service state between tests.

Vernon added an important clarification on naming that Evans left implicit: domain service names should come from the Ubiquitous Language, and they should reflect a domain concept, not an implementation concept. `UserValidator` is not a domain service name — it is a technical role. `EligibilityAssessor`, `FundsTransfer`, `CreditRiskEvaluator` — these are domain service names because they name operations that domain experts recognize. The naming discipline forces the question: "Does this service correspond to a concept in the domain, or is it a technical convenience?" If it is a technical convenience, it is not a domain service — it is an application service or an infrastructure service dressed in domain service clothing. The Microsoft .NET Microservices Architecture guide enforces this boundary in the eShopOnContainers example by placing the `OrderingDomainService` in the domain layer with no infrastructure imports and ensuring its interface uses only domain types — no DTOs, no ORM types, no framework dependencies cross the boundary.

## Implementation Guide

**Step 1: Recognize When Domain Logic Needs a Service**

Before creating a domain service, always ask: can this logic live in an entity or value object? The default answer should be yes. Create a domain service only when:

1. The operation requires input from multiple aggregates that can't be combined without violating aggregate rules
2. The operation represents a domain concept that is a verb, not a noun (a process or transformation)
3. Putting the logic in an entity would give the entity knowledge it shouldn't have (e.g., `Account.transferTo(anotherAccount)` gives `Account` a reference to another aggregate)

If you can articulate which entity "owns" the logic — if the logic is most naturally expressed as behavior of a specific entity — keep it in the entity.

**Step 2: Define the Service Interface in the Domain Layer**

Domain services are part of the domain layer. Their interfaces are defined in the domain layer. Their implementations may be in the domain layer (for pure domain logic) or in the infrastructure layer (when the implementation requires I/O, external calls, or infrastructure concerns).

```java
// In the domain layer
public interface FundsTransferService {
    TransferResult transfer(TransferRequest request);
}

public record TransferRequest(
    AccountId fromAccountId,
    AccountId toAccountId,
    Money amount,
    TransferReference reference
) {}

public record TransferResult(
    TransferId transferId,
    Money amountTransferred,
    Instant transferredAt
) {}
```

The interface uses domain types exclusively — no database types, no HTTP types, no infrastructure concepts.

**Step 3: Implement the Service with Domain Logic**

```java
// Domain service implementation (pure domain logic, no I/O)
public class DefaultFundsTransferService implements FundsTransferService {
    
    @Override
    public TransferResult transfer(TransferRequest request) {
        // Note: accounts are passed in — the service doesn't load them
        // That's the application service's job
        Account fromAccount = request.fromAccount();
        Account toAccount = request.toAccount();
        Money amount = request.amount();
        
        // Domain rule: currency must match
        if (!fromAccount.currency().equals(toAccount.currency())) {
            throw new CurrencyMismatchException(
                fromAccount.currency(), toAccount.currency()
            );
        }
        
        // Domain rule: sufficient funds
        if (fromAccount.balance().isLessThan(amount)) {
            throw new InsufficientFundsException(fromAccount.id(), amount);
        }
        
        // Domain rule: transfer limits
        if (amount.isGreaterThan(fromAccount.dailyTransferLimit())) {
            throw new TransferLimitExceededException(fromAccount.id(), amount);
        }
        
        // Execute the transfer
        fromAccount.debit(amount, request.reference());
        toAccount.credit(amount, request.reference());
        
        return new TransferResult(
            TransferId.generate(),
            amount,
            Instant.now()
        );
    }
}
```

The domain service holds the transfer rules (currency matching, sufficient funds, transfer limits) but doesn't load accounts or save changes — that's the application service's job.

**Step 4: The Application Service Orchestrates**

The application service handles I/O: loading aggregates, calling the domain service, saving changes, publishing events. It is the orchestrator; the domain service is the domain logic.

```java
// Application service — orchestrates, doesn't hold domain logic
@Service
@Transactional
public class TransferApplicationService {
    private final AccountRepository accountRepository;
    private final FundsTransferService fundsTransferService;
    
    public TransferApplicationService(
        AccountRepository accountRepository,
        FundsTransferService fundsTransferService
    ) {
        this.accountRepository = accountRepository;
        this.fundsTransferService = fundsTransferService;
    }
    
    public void executeTransfer(ExecuteTransferCommand command) {
        // Load aggregates (I/O — not in domain service)
        Account fromAccount = accountRepository.findById(command.fromAccountId())
            .orElseThrow(() -> new AccountNotFoundException(command.fromAccountId()));
        Account toAccount = accountRepository.findById(command.toAccountId())
            .orElseThrow(() -> new AccountNotFoundException(command.toAccountId()));
        
        // Domain service handles the domain logic
        TransferResult result = fundsTransferService.transfer(
            new TransferRequest(fromAccount, toAccount, command.amount(), command.reference())
        );
        
        // Save changes (I/O — not in domain service)
        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);
        
        // Publish event (infrastructure — not in domain service)
        eventPublisher.publish(new FundsTransferred(
            result.transferId(),
            command.fromAccountId(),
            command.toAccountId(),
            result.amountTransferred(),
            result.transferredAt()
        ));
    }
}
```

The separation is clean: the domain service has no I/O dependencies. It can be tested in isolation with pure in-memory objects, no database, no mocks for repositories.

**Step 5: Stateless Means Testable**

Domain services, being stateless, are the most testable components in the domain model. Tests require no setup of persistent state and no database interaction.

```java
class FundsTransferServiceTest {
    private final FundsTransferService service = new DefaultFundsTransferService();
    
    @Test
    void shouldTransferFundsSuccessfully() {
        Account from = Account.withBalance(Money.ofDollars(1000));
        Account to = Account.withBalance(Money.ofDollars(500));
        
        TransferResult result = service.transfer(
            new TransferRequest(from, to, Money.ofDollars(200), TransferReference.generate())
        );
        
        assertThat(from.balance()).isEqualTo(Money.ofDollars(800));
        assertThat(to.balance()).isEqualTo(Money.ofDollars(700));
        assertThat(result.amountTransferred()).isEqualTo(Money.ofDollars(200));
    }
    
    @Test
    void shouldRejectTransferWithInsufficientFunds() {
        Account from = Account.withBalance(Money.ofDollars(100));
        Account to = Account.withBalance(Money.ofDollars(500));
        
        assertThrows(InsufficientFundsException.class, () ->
            service.transfer(
                new TransferRequest(from, to, Money.ofDollars(200), TransferReference.generate())
            )
        );
    }
    
    @Test
    void shouldRejectTransferWithCurrencyMismatch() {
        Account usdAccount = Account.withBalance(Money.ofDollars(1000));
        Account eurAccount = Account.withBalance(Money.ofEuros(500));
        
        assertThrows(CurrencyMismatchException.class, () ->
            service.transfer(
                new TransferRequest(usdAccount, eurAccount, Money.ofDollars(200), TransferReference.generate())
            )
        );
    }
}
```

No mocks, no database, no Spring context. Pure domain logic testing.

**Step 6: Avoid the Anemic Domain Model Trap**

The warning sign: your entities have only getters and setters, and all business logic is in service classes. This is the Anemic Domain Model. It looks like OOP (objects with fields) but behaves like procedural code (logic in procedures, data in structs).

```java
// Anemic Domain Model — WRONG
public class Account {
    private Money balance;
    public Money getBalance() { return balance; }
    public void setBalance(Money balance) { this.balance = balance; }
}

public class AccountService {
    public void debit(Account account, Money amount) {
        if (account.getBalance().isLessThan(amount)) {
            throw new InsufficientFundsException();
        }
        account.setBalance(account.getBalance().subtract(amount));
    }
}

// Rich Domain Model — RIGHT
public class Account {
    private Money balance;
    
    public void debit(Money amount) {
        if (balance.isLessThan(amount)) {
            throw new InsufficientFundsException(id, amount);
        }
        balance = balance.subtract(amount);
    }
    
    public void credit(Money amount) {
        balance = balance.add(amount);
    }
}

// Domain Service handles only what spans multiple aggregates
public class FundsTransferService {
    public void transfer(Account from, Account to, Money amount) {
        validateCurrencyCompatibility(from, to);
        validateTransferLimits(from, amount);
        from.debit(amount);   // Behavior in entity
        to.credit(amount);    // Behavior in entity
    }
}
```

The `Account` entity owns behavior that naturally belongs to it: `debit()` and `credit()` with their own validation. The domain service owns only the cross-aggregate coordination.

## When to Use / When NOT to Use

**Use Domain Services when**:
- The operation involves multiple aggregate roots
- The operation represents a domain concept that is inherently a process or transformation
- The operation requires domain knowledge from multiple sources that can't be combined in one entity without violating aggregate rules
- Putting the logic in an entity would give the entity inappropriate knowledge of other entities

**Do NOT use Domain Services when**:
- The logic naturally belongs to an entity or value object — keep it there
- The logic is an application concern (transaction management, authentication, authorization) — use application services
- The logic is an infrastructure concern (email sending, database access, external API calls) — use infrastructure services
- You're avoiding putting logic in entities out of habit (prefer rich entities)

**The smell that you're over-using domain services**: Every entity method just calls a service. Entities have no behavior. Domain services have methods named after entity methods (`AccountService.debit()`, `OrderService.addLineItem()`). This is the Anemic Domain Model.

## Common Mistakes

**Mistake 1: Transaction management in domain services**

Domain services should not manage transactions. They operate on in-memory objects passed to them. Transaction management is an application service concern. A domain service that opens database transactions has crossed the domain/infrastructure boundary.

**Mistake 2: Repository access in domain services**

Domain services should not call repositories. They operate on aggregates that the application service has already loaded. A domain service that calls `accountRepository.findById()` has I/O dependencies that prevent pure unit testing and blur the domain/application boundary.

**Mistake 3: One massive "domain service" per aggregate**

`OrderService`, `CustomerService`, `ProductService` — one service class per entity, containing every operation that touches that entity. This is the Anemic Domain Model pattern with extra steps. Domain services should be named after domain *operations*, not after domain *entities*.

**Mistake 4: Domain services with state**

A domain service that caches results, maintains counters, or stores data between calls is no longer a domain service — it is a stateful component with all the complexity that entails (thread safety, lifecycle management, cache invalidation). Keep domain services stateless.

**Mistake 5: Confusing domain services with application services**

Application services orchestrate: they load data, call domain objects, save results, publish events, send notifications. Domain services encapsulate domain logic. The distinction matters because application services can have infrastructure dependencies; domain services should not.

## Connections

**Aggregates**: Domain services coordinate operations across multiple aggregates. They receive aggregates as parameters, call methods on them, and the aggregates emit domain events.

**Entities and Value Objects**: Domain services supplement entity behavior — they hold logic that spans multiple entities. Entity behavior should always be the first home for domain logic; domain services are the fallback.

**Repositories**: Domain services do not call repositories. Application services load aggregates via repositories and pass them to domain services.

**Application Services**: Application services use domain services. Application services handle I/O; domain services handle domain logic.

**Ubiquitous Language**: Domain service names come from the Ubiquitous Language. `FundsTransfer`, `RouteCalculation`, `TaxAssessment` — these names represent domain concepts that domain experts would recognize.

## Key Insights

The central insight about domain services is that they exist to preserve the richness of the domain model, not to replace it. When logic genuinely doesn't fit in an entity — when it spans multiple aggregates, when it represents a process rather than state — a domain service gives it a proper home in the domain layer rather than letting it drift into the application layer.

The paradox of domain services: used correctly, they make the domain model richer. Used incorrectly (as dumping grounds for all logic), they produce the Anemic Domain Model — a model that looks rich but is actually a thin data layer under a fat service layer.

The test for correct domain service usage is simple: can you articulate which entity "should" own this logic, and the reason it can't is a genuine architectural constraint (aggregate boundary, multiple aggregates, no natural ownership)? If yes, the service is justified. If you're moving logic to a service because it "feels cleaner" or because entities "shouldn't have that much code," the motivation is wrong. Rich, behavioral entities are the goal. Domain services are the exception, not the rule.
