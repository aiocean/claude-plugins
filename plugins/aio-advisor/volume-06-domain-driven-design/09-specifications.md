# Specifications & Domain Rules

> "A specification states a constraint on the state of another object, which may or may not be present. The specification can be used for validation, for selection from collections, and for specifying the creation of a new object to fit some need." — Eric Evans, Domain-Driven Design

## The Problem

A developer is building an order management system. Business rules accumulate: orders are eligible for expedited fulfillment if they were placed more than two days ago and have a total over $100 and the customer has a premium account. Later, the same eligibility rule is needed in three places: in the fulfillment batch job (to select which orders to process), in the API endpoint (to validate if a manual fulfillment request is valid), and in the customer portal (to show which orders can be expedited).

The developer copies the `if` statement to all three places. Three months later, the business changes the rule: the threshold drops to $50 for customers in the Pacific Northwest region. The developer must find all three places, update all three, and hope they didn't miss any. A year later, the rule has evolved five more times. The copies have drifted — some updated, some not. Nobody is sure which version is authoritative.

The second problem: the rule is not testable in isolation. To test whether an order is eligible for expedited fulfillment, you must create an application context, load an order from a database, run it through a service method, and observe the result. The rule itself — the predicate — is buried in conditional logic and cannot be extracted for direct testing.

The third problem: the rule cannot be combined. "Eligible for expedited fulfillment AND not yet assigned to a warehouse" requires nesting conditionals or creating yet another method that duplicates part of the first rule. Combinability requires explicit representation.

Specifications solve all three problems by encapsulating business rules as first-class domain objects.

## Core Concept

A Specification is a predicate — a boolean-valued function — encapsulated as an object. It captures a business rule in a named, testable, combinable, reusable form.

Eric Evans and Martin Fowler defined the Specification pattern in a joint paper in 1997, and Evans incorporated it into the DDD book. The pattern has three uses:

1. **Validation**: Does this object satisfy this rule? (`spec.isSatisfiedBy(order)`)
2. **Selection**: Filter a collection to objects satisfying the rule (used by repositories)
3. **Construction specification**: Describe what a new object should look like to satisfy the rule

The power of specifications comes from composition. Specifications can be combined with boolean operators:

- `spec1.and(spec2)` — both must be satisfied
- `spec1.or(spec2)` — either must be satisfied
- `spec1.not()` — the inverse of spec1

These combinators allow complex rules to be built from simple, individually testable pieces.

A specification is a domain object. It is named in the Ubiquitous Language. It lives in the domain layer. It has no infrastructure dependencies. It can be tested with plain unit tests, no database required. When the business rule changes, only the specification changes — all the places that use it pick up the new behavior automatically.

There are three flavors of specifications in practice:

**Pure in-memory specifications**: Evaluate against an in-memory object. Used for validation and selection from in-memory collections.

**Query specifications**: Translate into database queries (SQL predicates, JPA criteria, MongoDB filters). Used by repositories to execute domain-language queries against the database.

**Hybrid specifications**: Support both in-memory evaluation and query generation. The most powerful but also the most complex.

## Deep Dive

The Specification pattern was the first major pattern Evans co-developed with Martin Fowler and published as a standalone paper before it appeared in the DDD book. Their 1997 paper "Specifications" described a problem that had no clean solution in standard object-oriented patterns: how do you represent a business rule that needs to be evaluated in multiple contexts — validation, selection from a collection, and description of what a new object should look like — without duplicating the rule's logic across all three contexts? The solution they arrived at was to make the rule itself a first-class object, named after the business concept it expresses, with a single `isSatisfiedBy(object)` method and composability through boolean combinators.

The naming discipline for specifications is as important as for any other domain concept. Evans and Fowler insisted that a specification's name must be a statement about the domain, not a description of its predicate. `OrdersPlacedMoreThanTwoDaysAgoWithTotalOverOneHundredDollarsFromPremiumCustomers` is not a specification name — it is a predicate transcribed into a class name. `EligibleForExpeditedFulfillment` is a specification name — it expresses the business concept, leaving the precise predicate as an implementation detail that can change without affecting the name or the callers. When the business changes "more than two days ago" to "more than one day ago," the specification's name does not change; its implementation does. This stability of the concept name in the face of implementation change is the specification's primary value.

The three uses of a specification that Evans described — validation, selection, and construction specification — are genuinely different in their implementation even when they share the same predicate logic. Validation evaluates the predicate against a single in-memory object. Selection evaluates it against a collection, either by iterating in memory or by translating to a database query. Construction specification describes what a new object should look like, which requires not evaluating the predicate but expressing it as a set of desired properties. Evans was candid that the construction specification use case is the most difficult to implement cleanly and is sometimes better handled by a separate factory pattern. The validation and selection uses are the most commonly needed and the clearest to implement.

Vernon added precision in the Red Book around when specifications cross the infrastructure boundary. A pure in-memory specification has no infrastructure dependency and can be tested with plain unit tests — the ideal. A query specification must be translated into the query language of the underlying store, which requires some coupling to the infrastructure. Vernon recommended keeping this coupling confined to the repository implementation: the specification remains a pure domain object, and the repository contains the logic to translate it into a query. The domain code calls `repository.findAll(new EligibleForExpeditedFulfillment())` and the repository contains the SQL or NoSQL translation. The specification never knows that a database exists; the repository never exposes the database to the domain. This clean division maintains testability at the cost of requiring the repository to know about the specification's internal structure — a tension that Vernon acknowledged but considered the lesser of available evils.

The composability of specifications through boolean combinators (`and`, `or`, `not`) gives rise to a domain-level predicate algebra. Complex business rules can be expressed as compositions of simpler rules, each independently named and testable. `EligibleForExpeditedFulfillment` might be implemented as `new PlacedMoreThanOneDayAgo().and(new TotalAboveFiftyDollars()).and(new CustomerHasPremiumAccount())`. Each component specification is its own named domain concept. The composite specification is also a named domain concept. When a rule changes, the component that changes is isolated. When a new composite rule is needed, it is assembled from existing components without duplicating their logic. This composability is what makes specifications particularly well-suited to domains with many intersecting eligibility rules, compliance requirements, or classification criteria — domains where business rules are expected to change frequently and independently.

## Implementation Guide

**Step 1: Define the Specification Interface**

```java
public interface Specification<T> {
    boolean isSatisfiedBy(T candidate);
    
    default Specification<T> and(Specification<T> other) {
        return candidate -> this.isSatisfiedBy(candidate) && other.isSatisfiedBy(candidate);
    }
    
    default Specification<T> or(Specification<T> other) {
        return candidate -> this.isSatisfiedBy(candidate) || other.isSatisfiedBy(candidate);
    }
    
    default Specification<T> not() {
        return candidate -> !this.isSatisfiedBy(candidate);
    }
}
```

The default methods on the interface enable fluent composition without requiring subclasses.

**Step 2: Implement Named Specifications**

Each business rule becomes a named specification class:

```java
public class OrderEligibleForExpeditedFulfillment implements Specification<Order> {
    private static final Money MINIMUM_TOTAL = Money.ofDollars(100);
    private static final Duration MINIMUM_AGE = Duration.ofDays(2);
    
    @Override
    public boolean isSatisfiedBy(Order order) {
        return order.total().isGreaterThanOrEqualTo(MINIMUM_TOTAL)
            && order.age().compareTo(MINIMUM_AGE) >= 0
            && order.status() == OrderStatus.PLACED;
    }
}

public class OrderBelongsToPremiumCustomer implements Specification<Order> {
    private final CustomerRepository customerRepository;
    
    public OrderBelongsToPremiumCustomer(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }
    
    @Override
    public boolean isSatisfiedBy(Order order) {
        Customer customer = customerRepository.findById(order.customerId()).orElseThrow();
        return customer.tier() == CustomerTier.PREMIUM;
    }
}
```

**Step 3: Compose Specifications**

```java
// Building the composite rule from named pieces
Specification<Order> eligibleForExpediting = 
    new OrderEligibleForExpeditedFulfillment()
    .and(new OrderBelongsToPremiumCustomer(customerRepository));

// Validate against a single order
boolean canExpedite = eligibleForExpediting.isSatisfiedBy(order);

// Filter a collection
List<Order> expeditableOrders = allOrders.stream()
    .filter(eligibleForExpediting::isSatisfiedBy)
    .toList();

// Combine with another rule for a different use case
Specification<Order> eligibleForPrioritization = 
    eligibleForExpediting.or(new OrderOverdueForFulfillment());
```

The composition is expressed in domain language. Reading `new OrderEligibleForExpeditedFulfillment().and(new OrderBelongsToPremiumCustomer(...))` is closer to a business rule description than any `if` statement.

**Step 4: Query Specifications for Repositories**

Pure in-memory specifications work for validation and small collections. For repository queries against a database, specifications must translate to SQL, JPA Criteria, or the equivalent for your database.

One approach: extend the specification interface with a query generation method.

```java
public interface QuerySpecification<T> extends Specification<T> {
    Predicate toPredicate(Root<T> root, CriteriaBuilder cb);
}

public class OrderEligibleForExpeditedFulfillment implements QuerySpecification<Order> {
    
    @Override
    public boolean isSatisfiedBy(Order order) {
        // In-memory evaluation
        return order.total().isGreaterThanOrEqualTo(MINIMUM_TOTAL)
            && order.age().compareTo(MINIMUM_AGE) >= 0
            && order.status() == OrderStatus.PLACED;
    }
    
    @Override
    public Predicate toPredicate(Root<Order> root, CriteriaBuilder cb) {
        // JPA Criteria API translation
        return cb.and(
            cb.greaterThanOrEqualTo(root.get("totalAmountMinorUnits"), 10000L), // $100 in cents
            cb.lessThanOrEqualTo(root.get("placedAt"), 
                Instant.now().minus(MINIMUM_AGE)),
            cb.equal(root.get("status"), OrderStatus.PLACED)
        );
    }
}
```

The repository uses the `toPredicate` method to build efficient database queries:

```java
public class JpaOrderRepository implements OrderRepository {
    
    @Override
    public List<Order> findBy(QuerySpecification<Order> spec) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<OrderJpaEntity> query = cb.createQuery(OrderJpaEntity.class);
        Root<OrderJpaEntity> root = query.from(OrderJpaEntity.class);
        
        query.where(spec.toPredicate(root, cb));
        
        return em.createQuery(query).getResultList()
            .stream()
            .map(mapper::toDomain)
            .toList();
    }
}
```

Now the caller can express domain-language queries:

```java
List<Order> eligible = orderRepository.findBy(
    new OrderEligibleForExpeditedFulfillment()
        .and(new OrderNotYetAssignedToWarehouse())
);
```

This generates efficient SQL while keeping the query expressed in domain language.

**Step 5: Spring Data / Alternative Approach**

Spring Data JPA's `Specification<T>` interface (from spring-data-jpa) is a production implementation of this pattern. It supports JPA Criteria composition out of the box:

```java
// Spring Data JPA Specification
public class OrderSpecifications {
    
    public static Specification<Order> eligibleForExpeditedFulfillment() {
        return (root, query, cb) -> cb.and(
            cb.greaterThanOrEqualTo(root.get("totalAmountMinorUnits"), 10000L),
            cb.lessThanOrEqualTo(root.get("placedAt"), Instant.now().minusSeconds(172800)),
            cb.equal(root.get("status"), "PLACED")
        );
    }
    
    public static Specification<Order> belongsToPremiumCustomer(Set<CustomerId> premiumCustomerIds) {
        Set<String> ids = premiumCustomerIds.stream().map(CustomerId::toString).collect(toSet());
        return (root, query, cb) -> root.get("customerId").in(ids);
    }
}

// Repository extends JpaSpecificationExecutor
public interface OrderJpaRepository 
    extends JpaRepository<Order, String>, JpaSpecificationExecutor<Order> {}

// Usage
List<Order> results = orderRepository.findAll(
    OrderSpecifications.eligibleForExpeditedFulfillment()
        .and(OrderSpecifications.belongsToPremiumCustomer(premiumIds))
);
```

**Step 6: Testing Specifications in Isolation**

The primary benefit of specifications for testing: they can be tested without a database, without application context, without mocks.

```java
class OrderEligibleForExpeditedFulfillmentTest {
    private final Specification<Order> spec = new OrderEligibleForExpeditedFulfillment();
    
    @Test
    void shouldBeSatisfiedWhenAllConditionsMet() {
        Order order = Order.builder()
            .total(Money.ofDollars(150))
            .placedAt(Instant.now().minus(Duration.ofDays(3)))
            .status(OrderStatus.PLACED)
            .build();
        
        assertThat(spec.isSatisfiedBy(order)).isTrue();
    }
    
    @Test
    void shouldNotBeSatisfiedWhenTotalTooLow() {
        Order order = Order.builder()
            .total(Money.ofDollars(50))
            .placedAt(Instant.now().minus(Duration.ofDays(3)))
            .status(OrderStatus.PLACED)
            .build();
        
        assertThat(spec.isSatisfiedBy(order)).isFalse();
    }
    
    @Test
    void shouldNotBeSatisfiedWhenOrderTooRecent() {
        Order order = Order.builder()
            .total(Money.ofDollars(150))
            .placedAt(Instant.now().minus(Duration.ofHours(12)))
            .status(OrderStatus.PLACED)
            .build();
        
        assertThat(spec.isSatisfiedBy(order)).isFalse();
    }
}
```

Three tests, zero infrastructure dependencies. Each test exercises exactly one variant of the rule.

**Step 7: Specification for Domain Validation**

Specifications are an excellent mechanism for complex domain validation, particularly when validation rules are numerous, composable, or need to be explained to users.

```java
public class ProductListingValidationService {
    
    public ValidationResult validate(Product product) {
        Specification<Product> validForListing = 
            new ProductHasRequiredAttributes()
            .and(new ProductHasAtLeastOneImage())
            .and(new ProductPriceWithinAllowedRange())
            .and(new ProductCategoryIsEnabled());
        
        if (validForListing.isSatisfiedBy(product)) {
            return ValidationResult.valid();
        }
        
        // Collect all violations for user feedback
        List<String> violations = new ArrayList<>();
        if (!new ProductHasRequiredAttributes().isSatisfiedBy(product))
            violations.add("Missing required attributes");
        if (!new ProductHasAtLeastOneImage().isSatisfiedBy(product))
            violations.add("At least one image is required");
        // ...
        
        return ValidationResult.invalid(violations);
    }
}
```

## When to Use / When NOT to Use

**Use Specifications when**:
- The same business rule is needed in multiple places (validation + selection + construction)
- Business rules change frequently and you need a single point of change
- Rules need to be composed from simpler rules
- Rules need to be tested independently
- Rules need to be expressed in domain language that non-developers can understand

**Do NOT use Specifications when**:
- The rule is used in exactly one place and is unlikely to be reused
- The rule is simple enough that a method call is more readable than creating a class
- Performance is critical and the specification abstraction adds overhead that matters
- The domain has no complex business rules (simple CRUD applications)

The specification pattern adds classes and indirection. For a simple `if (order.total() > 100)`, a specification class is overkill. The pattern pays off when rules are reused, combined, or changed frequently.

## Common Mistakes

**Mistake 1: Infrastructure dependencies in specifications**

A specification that queries a database to evaluate its predicate has I/O dependencies. This makes it slow, non-deterministic, and hard to test. If a specification needs data from another aggregate, pass that data in at construction time (dependency injection) rather than querying from within the specification.

**Mistake 2: Specification explosion**

Creating a specification class for every single condition, no matter how simple. `OrderStatusIsPlaced`, `OrderTotalIsGreaterThanZero`, `OrderCustomerIdIsNotNull` — these are not meaningful domain concepts. They are trivial predicates that add more noise than clarity. Reserve specification classes for business rules that have domain names.

**Mistake 3: Not keeping in-memory and query implementations in sync**

A hybrid specification with both `isSatisfiedBy()` and `toPredicate()` implementations must produce consistent results. If the in-memory check uses `>=` but the SQL uses `>`, validation and database queries will disagree. Test both code paths.

**Mistake 4: Using specifications as query builders**

Specifications express domain rules. They are not a generic query builder framework for building arbitrary SQL. When you find yourself building specifications like `OrderSpecification.withStatusIn(List.of(...)).andCreatedAfter(date).andCustomerIdEquals(id)`, you've turned specifications into a fluent query API — which is a different concern.

## Connections

**Repositories**: Repositories accept specifications for domain-language queries. The specification translates between domain intent and database query syntax.

**Domain Services**: Domain services use specifications for validation before executing operations: "can this order be fulfilled?" is answered by a specification.

**Aggregates**: Aggregate methods can use specifications to enforce invariants: `if (!new ValidFulfillmentTarget().isSatisfiedBy(this))` — though simple rules are better expressed as direct conditionals within the entity.

**Ubiquitous Language**: Specification names come from the Ubiquitous Language. `OrderEligibleForExpeditedFulfillment` is a business concept with a name domain experts recognize.

## Key Insights

The central insight about the Specification pattern is that it treats business rules as first-class domain objects rather than as embedded logic. This single change — making a rule a named object rather than an inline conditional — produces three benefits simultaneously: the rule becomes testable in isolation, the rule becomes reusable across contexts, and the rule becomes composable with other rules.

The second insight is that specifications make the implicit explicit. When business rules are scattered as `if` statements, they are invisible — you cannot grep for them, you cannot list them, you cannot test them in isolation. When rules are specifications, they have names, they live in packages, they appear in test files. The domain's rule set becomes legible.

The third insight is about the relationship between specifications and repositories. Specifications allow you to push query logic — the "which objects match this rule" logic — into the domain layer, expressed in domain language. Without specifications, this logic lives in repositories as SQL strings or in application services as in-memory filtering. With specifications, the logic belongs to the domain, where it can evolve with the business rules rather than with the persistence technology.

Name your rules. Test your rules in isolation. Compose your rules from simpler rules. When you do these three things, your business logic becomes a catalog of named, testable, composable predicates — a domain model that accurately reflects the business's rule set and changes gracefully when the rules change.
