# Testing Strategies — Pyramid, Diamond, and Trophy

> "The goal of testing is not to find bugs. It is to give you confidence to change code quickly." — Kent C. Dodds

## The Problem

Testing is the discipline with the widest gap between what teams say they do and what they actually do. Every engineering organization claims to take testing seriously. Most have a CI pipeline that runs tests. Many have code coverage targets. Very few have thought carefully about which tests to write, at which layer, with which tradeoffs, to achieve which goals — and the ones that haven't thought carefully about it pay the price in flaky test suites, slow CI pipelines, and a persistent inability to deploy with confidence despite having hundreds or thousands of tests.

The canonical testing mistakes are predictable. Teams write tests that test implementation details rather than behavior, so refactoring breaks dozens of tests without changing any functionality. Teams write unit tests for every private function, creating a test suite that is tightly coupled to code structure and breaks on every refactor. Teams write too few integration tests, discovering that individually-correct components compose incorrectly only in production. Teams write expensive end-to-end tests for every user journey, creating a test suite that takes 45 minutes to run and fails intermittently due to timing issues, making developers distrust the suite and skip running it.

The second problem is that testing models from the 2000s and 2010s were designed for different architectures. The test pyramid was designed for monoliths with clear layers. Distributed systems and microservices have different testing needs: service boundaries matter, inter-service contracts matter, the behavior of the system in partial-failure scenarios matters. Testing a microservices architecture with unit-test discipline designed for monoliths produces a well-tested collection of individually correct services that fail in production when they interact.

## Core Concept

The testing models — pyramid, diamond, trophy — are not competing truths. They are different perspectives on the same underlying question: given limited time for writing and running tests, where should you invest to maximize confidence in your system's correctness?

### The Test Pyramid

The test pyramid, articulated by Mike Cohn in 2009 and popularized by Martin Fowler, defines three layers of tests with different quantities and characteristics.

**Unit tests (base, most numerous)**: Test a single function, class, or module in isolation. Dependencies are mocked. Tests run in milliseconds. Tests are deterministic — given the same input, the same output, always. The base of the pyramid is wide because unit tests are cheap to write, cheap to run, and give fast feedback.

**Integration tests (middle)**: Test multiple components working together. May involve real databases, real message queues, real filesystems, but not external services. Tests run in seconds. The middle layer is narrower than the base because integration tests are more expensive to write and run.

**End-to-end tests (apex, fewest)**: Test the full system from the user's perspective. Use real infrastructure, real external services (or high-fidelity stubs), and simulate real user behavior. Tests run in minutes. The apex is narrow because E2E tests are the most expensive to write, maintain, and run.

Google's implementation is the most widely cited quantified example: roughly 80% unit tests, 15% integration tests, 5% end-to-end tests. The ratio is not a rule — it is the consequence of optimizing for fast feedback and low maintenance burden.

**Why the pyramid shape matters**: A test suite with many E2E tests and few unit tests (an "inverted pyramid" or "ice cream cone") is slow, flaky, and provides poor diagnostic information when failures occur. When an E2E test fails, you know something is wrong, but not where. When a unit test fails, you know exactly which function is wrong. The pyramid shape keeps the majority of tests where failure localization is precise and execution is fast.

### The Testing Trophy (Kent C. Dodds)

Kent C. Dodds proposed the testing trophy in 2018 as a correction to the pyramid for frontend and full-stack web applications. The trophy has four layers:

**Static analysis (bottom)**: TypeScript, ESLint, Prettier — tools that catch bugs before tests run. Zero runtime cost. This layer is unique to the trophy — the pyramid predates ubiquitous static typing.

**Unit tests**: Same as in the pyramid, but Dodds argues for fewer unit tests than the pyramid prescribes, particularly in UI code where unit tests are often testing implementation details.

**Integration tests (widest layer)**: The trophy emphasizes integration tests over unit tests. In a React application, an "integration test" means rendering a component tree with real child components (not mocked), interacting with it (clicking, typing), and asserting on what the user sees. This tests behavior, not implementation. In a backend service, it means testing a route handler with a real database.

**E2E tests (top, few)**: Same role as in the pyramid — high-confidence but expensive.

The trophy's key argument: integration tests at the component or service level give better ROI than unit tests at the function level because they test behavior that users care about, are less sensitive to refactoring, and still run fast enough to be part of the development loop.

```typescript
// Unit test: tests implementation detail, breaks on refactoring
test('formatPrice calls toCurrency with correct args', () => {
  const spy = jest.spyOn(utils, 'toCurrency');
  formatPrice(9.99, 'USD');
  expect(spy).toHaveBeenCalledWith(9.99, { currency: 'USD' });
});

// Integration test (trophy): tests behavior, survives refactoring
test('checkout page displays formatted price', async () => {
  render(<CheckoutPage product={{ price: 9.99, currency: 'USD' }} />);
  expect(screen.getByText('$9.99')).toBeInTheDocument();
});
```

### The Testing Diamond

The testing diamond (or honeycomb, as described by Spotify) is designed for microservices architectures. In a microservices system, the layers have different semantics:

**Unit tests (narrow at top and bottom)**: Fewer unit tests, focused on complex business logic and algorithmic code. Not every function needs a unit test.

**Integration tests (wide middle)**: The widest layer. Each service is tested against real implementations of its dependencies (real database, real cache) using in-process stubs for cross-service calls. This validates that the service works correctly with its immediate infrastructure.

**Contract tests (middle layer)**: Tests that verify the API contract between services. Consumer-driven contract tests (Pact) ensure that a service's API matches what its consumers expect, without requiring both services to be running simultaneously.

**End-to-end tests (narrow top)**: Only for the most critical user journeys. The diamond is narrower at the top than the pyramid because E2E tests in microservices are particularly expensive and fragile.

```
     /\
    /E2E\        (narrow: 3-5 critical journeys only)
   /------\
  /Contract \   (contract tests between services)
 /------------\
/ Integration  \ (wide: each service tested in isolation with real deps)
/--------------\
\   Unit       / (narrow: complex logic only)
 \____________/
```

### Google's Test Size Classification

Google uses a different taxonomy entirely: not "unit/integration/E2E" but "small/medium/large" tests, defined by their resource constraints rather than their architectural scope.

**Small tests** (what others call unit tests):
- Run in a single process, no network calls, no disk I/O
- No threads, no sleep(), no time-dependent behavior
- Must complete in under 1 minute
- Goal: deterministic, fast, cheap

**Medium tests** (most integration tests):
- Can use localhost network, can use the filesystem
- No calls to external services (but can use in-process fakes)
- Must complete in under 5 minutes
- Goal: test component interactions without external dependencies

**Large tests** (E2E and complex integration):
- Can call external services, can use real databases
- Can have non-deterministic behavior (timing-dependent)
- No time limit (but managed accordingly)
- Goal: validate full system behavior at realistic scale

The Google classification is valuable because it focuses on what makes tests slow and flaky: network calls, disk I/O, sleep(), and external service dependencies. A test that calls a real external API is a large test regardless of whether it tests "a unit" of business logic. A test that tests five components together but uses only in-memory data structures is a medium test.

### Hermetic Testing

Hermetic tests are tests that run in a fully controlled, isolated environment with no external dependencies. The concept, described in Google's SRE Book and engineering blog, is that a test with external dependencies is not a test — it is a probe of production. External dependencies introduce non-determinism, coupling between test runs, and failure modes that have nothing to do with the code under test.

Hermeticity is achieved through:

**Fakes**: Lightweight, in-memory implementations of services used as test dependencies. A fake database is an in-memory key-value store that implements the database API. A fake email service is an in-memory queue of email messages. Fakes are maintained by the team that owns the real service and are guaranteed to behave correctly (they are not stubs that return preset values).

**Test containers**: Docker containers running real databases (PostgreSQL, Redis, MongoDB) started at test time, used during the test, and destroyed afterward. TestContainers (Java), dockertest (Go), and similar libraries make this practical. Not fully hermetic (requires Docker) but much more controlled than using shared test databases.

```go
// Go: hermetic test with TestContainers
func TestOrderRepository(t *testing.T) {
    ctx := context.Background()
    
    // Start a real PostgreSQL container for this test
    postgres, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image:        "postgres:15",
            ExposedPorts: []string{"5432/tcp"},
            Env: map[string]string{
                "POSTGRES_PASSWORD": "password",
                "POSTGRES_DB":       "test",
            },
            WaitingFor: wait.ForLog("database system is ready to accept connections"),
        },
        Started: true,
    })
    defer postgres.Terminate(ctx)
    
    // Get connection string, create schema, run test
    host, _ := postgres.Host(ctx)
    port, _ := postgres.MappedPort(ctx, "5432")
    
    repo := NewOrderRepository(fmt.Sprintf("postgres://postgres:password@%s:%s/test", host, port.Port()))
    
    order := Order{ID: "ord_001", Amount: 99.99}
    err = repo.Create(ctx, order)
    assert.NoError(t, err)
    
    retrieved, err := repo.Get(ctx, "ord_001")
    assert.Equal(t, order, retrieved)
}
```

### Contract Testing

In a microservices architecture, each service depends on APIs provided by other services. Contract tests verify that the API a service consumes matches the API the provider actually serves — without requiring both services to run simultaneously.

**Consumer-driven contract tests (Pact)**: The consumer defines what it expects from the provider (the "contract"). The provider runs tests that verify it satisfies the contract. The contracts are stored in a broker (Pact Broker) and verified on both sides of the integration.

```javascript
// Payment service (consumer) defines what it expects from Order service
const { Pact } = require('@pact-foundation/pact');

const provider = new Pact({ consumer: 'PaymentService', provider: 'OrderService' });

describe('Order service contract', () => {
  before(() => provider.setup());
  after(() => provider.finalize());

  it('returns order details', async () => {
    await provider.addInteraction({
      state: 'order ord_001 exists',
      uponReceiving: 'a request for order ord_001',
      withRequest: { method: 'GET', path: '/orders/ord_001' },
      willRespondWith: {
        status: 200,
        body: { id: 'ord_001', amount: Matchers.decimal(99.99), status: 'confirmed' }
      }
    });

    const order = await orderClient.getOrder('ord_001');
    expect(order.id).toBe('ord_001');
    expect(order.amount).toBeCloseTo(99.99);
  });
});
```

Contract testing is particularly valuable when:
- Services are developed by different teams
- Services evolve independently
- You want to catch API breaking changes before deployment

### Testing in Production

Testing in production is not a sign of poor engineering — it is a recognition that production is the only environment that fully replicates production conditions. Several practices deliberately test in production:

**Canary deployments** (Article 04): Route a fraction of real traffic to the new version and measure its behavior. This is a form of production testing.

**Shadow testing**: Route production traffic to both the old and new service simultaneously. The new service's responses are logged but not returned to users. Differences between old and new responses are analyzed offline.

**Feature flags with monitoring**: Enable a feature for a small percentage of users and monitor SLIs in the enabled population vs. the disabled population. This is A/B testing as a testing strategy.

**Chaos engineering**: Deliberately inject failures into production and measure the system's response. Validates that resilience mechanisms (circuit breakers, graceful degradation, auto-healing) actually work.

### Flaky Test Management

Flaky tests — tests that pass and fail non-deterministically — are one of the most damaging patterns in a test suite. A test suite with 1% flakiness means that any given run has a 63% chance of at least one failure even when all code is correct (assuming 100 tests, each 1% flaky: 1 - 0.99^100 ≈ 0.63). Developers learn to retry failed tests without investigating, which defeats the purpose of the test suite.

Root causes of flaky tests:
- **Timing dependencies**: Tests that use `sleep()` or fixed timeouts rather than waiting for specific conditions
- **Shared state**: Tests that modify global state (database rows, in-memory caches) that other tests depend on
- **External service dependencies**: Tests that call real external services that may be temporarily unavailable
- **Race conditions**: Tests that make assumptions about goroutine or thread execution order
- **Order dependencies**: Tests that pass only when run in a specific order

Flaky test management:
1. **Track flakiness rate per test**: Every test has a historical pass/fail rate. Tests that fail more than 1% of the time when code is unchanged are flaky.
2. **Quarantine, don't ignore**: Move flaky tests to a separate suite that runs but does not block CI. Fix or delete within 2 weeks.
3. **Fix root causes**: Most flakiness is fixable. Timing-dependent tests become deterministic with proper async waiting. Shared-state tests become isolated with test data isolation.
4. **Measure and reduce the flakiness rate**: Track total flakiness rate across the suite over time. A target of < 0.1% flakiness rate means any given run has < 10% chance of a false failure.

## Deep Dive

### "Software Engineering at Google" on Test Size and the Testing Pyramid

The 2020 "Software Engineering at Google" book dedicates multiple chapters to testing, providing the most detailed public account of how a large engineering organization structures its test investment. The book's central contribution to testing theory is the "test size" taxonomy — small, medium, large — defined not by what the test tests but by what resources it uses.

A small test runs in a single process, uses no external dependencies (no network, no disk beyond in-memory filesystem, no real clocks), and completes in under a second. A medium test may use multiple processes, can use real databases on localhost (TestContainers pattern), and completes in under a minute. A large test may involve multiple services, real network calls, and external dependencies, and may take minutes to complete. The book enforces these definitions at the infrastructure level: Bazel's test framework rejects small tests that attempt network connections, making the classification verifiable rather than advisory.

The book reports Google's observed distribution as approximately 80% small, 15% medium, 5% large — not as a mandate but as an emergent property of a testing culture that values fast, reliable feedback. The key insight: the distribution is a consequence of the incentives, not a rule imposed on engineers. When small tests are fast and reliable and medium tests are slower, engineers naturally write small tests. When the build system enforces the constraints that make small tests trustworthy, engineers invest in making their tests small.

The book's treatment of flakiness is particularly actionable. Flaky tests — tests that sometimes pass and sometimes fail without code changes — erode trust in the entire test suite. Engineers learn to ignore flaky failures ("it'll pass on re-run") and eventually ignore all test failures. The book documents Google's practice of automatically quarantining flaky tests: tests that fail on consecutive runs without code changes are removed from the required pass set and assigned to their owners for investigation. This prevents flaky tests from poisoning the test signal without requiring manual intervention for each flaky failure.

### The Test Pyramid vs. the Testing Trophy

The test pyramid (Cohn, 2009: many unit tests, fewer integration tests, few E2E tests) and the testing trophy (Dodds, 2019: the largest investment in integration tests, fewer unit tests, few E2E tests) represent different empirical conclusions about where test investment provides the best reliability signal.

The pyramid's argument: unit tests are fast, deterministic, and provide granular failure localization. E2E tests are slow, flaky, and expensive to maintain. Invest heavily in unit tests. The trophy's counterargument: unit tests that mock all dependencies test implementation details rather than behavior. A codebase with 95% unit test coverage can have catastrophic integration failures. Integration tests that exercise the real behavior of components working together provide higher confidence per test.

"Software Engineering at Google" doesn't fully endorse either model. Its test size taxonomy is neutral about what tests test — it is about resource usage. The book's empirical observation (80/15/5 distribution) aligns more with the pyramid than the trophy, but the book is explicit that Google's specific distribution is an artifact of Google's specific technology choices and testing infrastructure investments, not a universal recommendation. The correct distribution for a given codebase depends on the nature of the software, the cost of flakiness, and the investment in testing infrastructure that makes small tests trustworthy.

## Implementation Guide

### Step 1: Audit Your Current Test Suite

Before adding more tests, understand what you have:
- How many tests at each layer (unit/integration/E2E)?
- How long does the full suite take to run?
- What is the flakiness rate?
- What is the code coverage by module?
- Which components have no tests?

The audit often reveals an inverted pyramid — many E2E tests, few unit tests — that explains slow CI and high flakiness.

### Step 2: Fix the Flaky Tests

Before adding new tests, fix or quarantine existing flaky tests. A test suite with 5% flakiness is worse than no tests because it trains developers to ignore test failures.

### Step 3: Define Your Testing Strategy by Layer

For a typical backend service:

```
Unit tests (small):
  - All functions with non-trivial logic (business rules, calculations, parsing)
  - Error handling paths
  - Edge cases that are hard to trigger in integration tests
  Target: runs in < 30 seconds

Integration tests (medium):
  - All HTTP routes against a real in-process database (TestContainers)
  - All message queue consumers against a real in-process queue
  - All critical external service integrations (with fakes, not mocks)
  Target: runs in < 5 minutes

E2E tests (large):
  - Top 3-5 user journeys only
  - Staging environment, real services
  Target: runs in < 15 minutes, not in the PR gate (post-merge only)
```

### Step 4: Add Contract Tests for Service Boundaries

For any service with more than one consumer, add Pact contract tests. The investment is modest (a few tests per integration point) but the payoff — detecting breaking API changes before deployment — is significant.

### Step 5: Implement CI Test Optimization

A test suite that takes 45 minutes to run will not be run on every commit. Optimize:
- Run unit tests on every PR (fast gate)
- Run integration tests on every PR (medium gate, parallelize aggressively)
- Run E2E tests only on merge to main (post-merge, not blocking)
- Cache test dependencies and build artifacts between runs

## When to Use / When NOT to Use

**Use unit tests for:**
- Complex business logic with many branches
- Pure functions with clear inputs and outputs
- Code that is difficult to exercise through higher-level tests

**Use integration tests for:**
- API route handlers (test the whole handler, not just the logic)
- Database repository layer (test against a real database)
- Message handling code (test against a real queue)

**Use E2E tests for:**
- The 3-5 most critical user journeys
- Smoke tests after deployment (verify the system is alive)
- Regression tests for bugs that slipped through lower-level tests

**Skip testing for:**
- Trivial code with no branches (getters, setters, simple wrappers)
- Generated code
- Third-party library internals (test your usage of the library, not the library itself)

## Common Mistakes

**Testing implementation, not behavior**: Tests that break every time you refactor are testing how the code works, not whether it works. Test public interfaces and observable behavior, not private implementation details.

**Mocking everything**: Heavy use of mocks creates tests that pass even when the real integration is broken. Mock at service boundaries, not within a service. If you're mocking your own database layer, you're testing too low.

**One assertion per test dogma**: Tests with one assertion per test file create noise and make failures less informative. Group related assertions that test one behavior together. One test per behavior, not one test per assertion.

**Ignoring test maintainability**: Tests are code. They require the same maintenance discipline as production code. Test helper code that is not maintained becomes a liability. Refactor tests when you refactor production code.

**Coverage as a goal**: 100% coverage of trivial code is worse than 80% coverage of complex code. Coverage measures execution, not correctness. A test that executes every line without making meaningful assertions provides false confidence.

**Not testing failure paths**: Unit tests often test the happy path. Integration tests almost always test the happy path. Production fails on error paths — invalid inputs, unavailable dependencies, disk full, network timeout. Test the failure paths explicitly.

## Connections

**Deployment Strategies (Article 04)**: Canary deployments and blue-green deployments are production testing strategies. The automated canary analysis that decides whether to advance or roll back a deployment is a production test comparing SLIs between populations.

**Feature Flags (Article 05)**: Feature flags enable testing in production — enabling a feature for a small population and measuring its effect is a form of production A/B testing.

**Observability (Article 03)**: Testing in production requires observability to measure results. The SLI comparison that drives automated canary analysis is observability data.

**Incident Management (Article 09)**: Incidents reveal gaps in the test suite. Every incident postmortem should ask: "What test would have caught this before production?" The answer becomes a new test.

## Key Insights

The purpose of tests is not to prevent all bugs — it is to give developers confidence to change code quickly. A test suite that gives high confidence with fast feedback enables rapid iteration. A test suite that gives false confidence or slow feedback does the opposite. Optimizing for test quality — tests that are fast, reliable, and test the right things — is more valuable than optimizing for test quantity.

The test pyramid is a consequence of optimizing for fast feedback and low maintenance burden, not a dogma to follow mechanically. In a microservices architecture, a testing diamond or honeycomb may be more appropriate. In a frontend-heavy application, the testing trophy may be more accurate. The model should match the architecture and the feedback you need.

Flakiness is the silent killer of test suite value. A flaky test is worse than no test because it trains developers to ignore test failures. Maintaining a flaky rate below 0.1% is the most important ongoing testing health metric. This requires active monitoring, root cause analysis, and prioritized fixing of flaky tests — not tolerance of "it usually passes."

Testing in production is not a failure of pre-production testing — it is a recognition that production is the only complete test environment. Practices like canary deployments, shadow testing, and chaos engineering are production testing disciplines that belong alongside unit and integration testing, not as replacements for them but as the final validation layer for a system that must be reliable in the only environment that matters.
