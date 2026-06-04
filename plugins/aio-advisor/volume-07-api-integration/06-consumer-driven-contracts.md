# Consumer-Driven Contract Testing

> "The consumer knows what it needs. The provider knows what it offers. Contract testing makes that agreement explicit and machine-verifiable." — Martin Fowler

## The Problem

In a microservices architecture, integration testing is the most expensive and least reliable part of the test suite. End-to-end tests require every service to be running, properly configured, and in a known state simultaneously. This is operationally complex, environmentally fragile, and slow — a full E2E test suite for a mature microservices system routinely takes 30-60 minutes. Teams run them infrequently. By the time an integration failure is discovered in the E2E suite, the change that caused it was committed days ago. Root cause analysis requires cross-team coordination.

The alternative — testing services in isolation with mocked dependencies — creates a different problem: mock drift. The payment service has a mock for the order service. The mock reflects how the order service behaved in January. In March, the order service team renamed `orderId` to `order_id`. They updated their unit tests and OpenAPI spec. Their service passes all tests. The payment service mock was not updated because the payment service team was not notified. The payment service's tests pass against the old mock. In production, the payment service cannot parse order service responses. This failure is only discovered during a release — or worse, by customers.

Mock drift is endemic in microservices teams without contract testing. It is not a discipline problem — teams are busy, cross-service communication is noisy, and remembering to update every consumer's mock for every provider change is simply not sustainable manually. The solution is to automate the contract between consumer and provider as a machine-verifiable artifact.

Consumer-driven contract testing (CDCT) inverts the testing model. Instead of the provider defining the API and consumers adapting, the consumers define exactly what they need from the provider. The provider verifies it can satisfy all consumers' needs. The contract is the artifact: a documented, version-controlled specification of the consumer's expectations against the provider's API. Any provider change that breaks a consumer's contract fails the CI build — before the change reaches production, before cross-team communication is required, and with an exact description of what broke.

## Core Concept

A **contract** in CDCT is a specification of interactions between a consumer and a provider. Each interaction consists of:
- A **request** the consumer will make (method, path, headers, body)
- The **expected response** the consumer needs (status, body structure, headers)

The consumer writes the contract. The provider verifies against it. Neither side is responsible for knowing the other's full implementation.

**Consumer-driven** means the consumer defines the minimum interface they require. The contract does not describe every field the provider returns — only the fields the consumer actually uses. If the provider returns 20 fields and the consumer only uses 3, the contract specifies those 3 fields. The provider can change, rename, or add any of the other 17 fields freely. This is the key insight: consumers define requirements, not the full interface.

### Pact

[Pact](https://pact.io) is the most widely adopted CDCT framework. It supports HTTP (REST) and message-based interactions. Pact implementations exist for every major language: Go, Java, .NET, Python, Ruby, JavaScript, Swift, and more.

The Pact workflow:

**1. Consumer writes the test and generates the pact file:**

```javascript
// consumer/src/__tests__/order.pact.spec.js
const { Pact } = require('@pact-foundation/pact');
const { OrderClient } = require('../order-client');

const provider = new Pact({
  consumer: 'PaymentService',
  provider: 'OrderService',
  port: 8080,
});

describe('OrderService contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('GET /orders/:id', () => {
    beforeEach(() => {
      return provider.addInteraction({
        state: 'order ord_123 exists',
        uponReceiving: 'a request for order ord_123',
        withRequest: {
          method: 'GET',
          path: '/orders/ord_123',
          headers: { Accept: 'application/json' },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: like('ord_123'),               // any string
            status: like('CONFIRMED'),          // any string
            totalAmount: {
              value: like('49.99'),             // any string
              currency: like('USD'),            // any string
            },
            // We do NOT specify userId, createdAt, or other fields
            // we don't need — provider is free to change those
          },
        },
      });
    });

    it('returns the order fields the payment service needs', async () => {
      const client = new OrderClient('http://localhost:8080');
      const order = await client.getOrder('ord_123');
      
      expect(order.id).toBeDefined();
      expect(order.status).toBeDefined();
      expect(order.totalAmount.value).toBeDefined();
    });
  });
});
```

Running this test starts a Pact mock server, runs the consumer test against it, and — if the test passes — writes a pact file:

```json
// pacts/PaymentService-OrderService.json
{
  "consumer": { "name": "PaymentService" },
  "provider": { "name": "OrderService" },
  "interactions": [
    {
      "description": "a request for order ord_123",
      "providerState": "order ord_123 exists",
      "request": {
        "method": "GET",
        "path": "/orders/ord_123",
        "headers": { "Accept": "application/json" }
      },
      "response": {
        "status": 200,
        "body": {
          "id": "ord_123",
          "status": "CONFIRMED",
          "totalAmount": { "value": "49.99", "currency": "USD" }
        },
        "matchingRules": {
          "body": {
            "$.id": { "matchers": [{ "match": "type" }] },
            "$.status": { "matchers": [{ "match": "type" }] },
            "$.totalAmount.value": { "matchers": [{ "match": "type" }] },
            "$.totalAmount.currency": { "matchers": [{ "match": "type" }] }
          }
        }
      }
    }
  ]
}
```

**2. Publish the pact to Pact Broker:**

```bash
pact-broker publish ./pacts \
  --broker-base-url https://broker.example.com \
  --consumer-app-version $(git rev-parse HEAD) \
  --tag main
```

**3. Provider verifies the pact:**

```go
// provider/order_test.go
func TestOrderServicePactProvider(t *testing.T) {
    // Start the actual order service
    server := startTestServer()
    defer server.Close()

    verifier := provider.NewVerifier()
    err := verifier.VerifyProvider(t, provider.VerifyRequest{
        ProviderBaseURL:            server.URL,
        BrokerURL:                  "https://broker.example.com",
        Provider:                   "OrderService",
        ProviderVersion:            os.Getenv("GIT_COMMIT"),
        PublishVerificationResults: true,
        
        // State handlers set up data needed by consumer state definitions
        StateHandlers: provider.StateHandlers{
            "order ord_123 exists": func(setup bool, s provider.ProviderState) (provider.ProviderStateResponse, error) {
                if setup {
                    // Insert test order into database
                    db.InsertOrder(Order{ID: "ord_123", Status: "CONFIRMED", ...})
                }
                return provider.ProviderStateResponse{}, nil
            },
        },
        
        AfterEach: func() error {
            db.CleanupTestData()
            return nil
        },
    })
    
    assert.NoError(t, err)
}
```

If the order service renames `totalAmount.value` to `amount`, the provider verification fails. The CI pipeline stops. The order service team gets a clear error: "Consumer 'PaymentService' interaction 'a request for order ord_123' failed: $.totalAmount.value - could not find key." No production breakage. No cross-team debugging after the fact.

### Bi-Directional Contract Testing

Traditional Pact requires both sides to use the Pact library. For APIs with OpenAPI specs, **bi-directional contract testing** (BDCT) is simpler: the consumer generates a Pact file from their tests, and the provider uploads their OpenAPI spec. Pact Broker compares them automatically.

```
Consumer Tests → Pact File → Pact Broker ← OpenAPI Spec ← Provider
                                  |
                      [Automated compatibility check]
```

This is particularly valuable when integrating with third-party providers who cannot run Pact verification themselves.

### Spring Cloud Contract

In the Java/Spring ecosystem, [Spring Cloud Contract](https://spring.io/projects/spring-cloud-contract) is the primary CDCT tool. Unlike Pact, Spring Cloud Contract is provider-first in its default workflow:

1. Provider defines contracts as Groovy DSL or YAML
2. Spring Cloud Contract generates tests from contracts and runs them against the provider
3. Spring Cloud Contract generates stubs (WireMock mappings) from contracts
4. Consumer uses the published stubs in their tests

This inverts the "consumer-driven" principle but provides stronger guarantees on the provider side. In practice, both tools support both directions.

## Deep Dive

Martin Fowler articulated the mock drift problem — the central problem that consumer-driven contract testing solves — in his writing on testing strategies for microservices. He observed that in a system with N services, each service maintains mocks of the services it depends on. These mocks are typically created once, when the integration is first built, and then forgotten. As the provider services evolve, the mocks do not update automatically. The mocks accumulate drift. At some point — often discovered during a production incident — a mock is so far from the actual provider behavior that tests passing against the mock have no predictive value for production behavior. Fowler described this as "the false confidence of green tests," and he identified it as one of the most damaging patterns in microservices testing.

Consumer-driven contracts invert the mock creation responsibility. Rather than each consumer team maintaining their own mock of each provider, the consumer team publishes their expectations about the provider as a machine-readable contract. The provider team runs verification against all published contracts from all consumers as part of their CI pipeline. When a provider change would break a consumer's contract, the CI pipeline fails immediately — before the change is merged, before the consumer team is involved, before a shared environment needs to be provisioned. The discovery of the incompatibility happens at the point of introduction, not at the point of integration.

The "consumer-driven" framing contains an important design principle about who has the authority to define interface requirements. In a conventional provider-driven approach, the provider team defines the API, and consumer teams adapt. If a consumer team needs a field that the provider does not currently expose, they file a request and wait. Consumer-driven contracts reverse this: each consumer team specifies exactly what they need from the provider, and the provider is responsible for satisfying all consumers' needs. The provider team can see, from the contract files, exactly which consumers depend on which fields. When the provider considers removing a field, they can check immediately whether any consumer's contract includes that field. The contract file transforms a communication problem (who depends on this field?) into a verification problem (do any contracts reference this field?).

The Pact workflow introduces a subtle but important concept: provider states. A provider state is a precondition that must be satisfied for a specific interaction to make sense. The consumer's contract specifies "given order ord_123 exists, when I GET /orders/ord_123, I expect a 200 response with these fields." The "given order ord_123 exists" is the provider state. The provider's verification setup must include code that creates this precondition before running the interaction verification. This provider state mechanism solves a test setup problem: contract verification runs against the actual provider service, which needs to be in a specific state to respond correctly. Without provider states, contract tests would either require a complex shared database setup or return incorrect results because the required data does not exist.

Sam Newman's *Building Microservices* treats consumer-driven contract testing as a key enabler of the independent deployability that makes microservices valuable. His argument: independent deployability requires confidence that deploying service A will not break service B. Without contract testing, this confidence requires either a shared integration environment (which creates coupling between deployment pipelines) or manual coordination between teams (which does not scale). Consumer-driven contracts provide the confidence mechanically: if the contract verification passes in CI, the deployment is safe from the perspective of API compatibility. Newman acknowledges that contract testing does not cover semantic correctness (the provider might return the right fields with the wrong values) or performance (the provider might satisfy the contract but be too slow), but it covers the class of failures that cause the most production incidents in microservices teams: structural API incompatibility introduced by uncoordinated changes.

## Implementation Guide

### Choosing What to Contract-Test

Not everything needs contract testing. Apply it where:
- The consumer and provider are owned by different teams
- The API changes frequently
- Integration failures would be discovered late (in staging or production)
- The cost of a production API incompatibility is high

Skip contract testing for:
- APIs with a single consumer that is co-located (same repo or same team)
- Highly stable external APIs (a contract test against Stripe's API is redundant — Stripe has its own stability guarantees)
- Simple CRUD APIs that are covered by OpenAPI schema validation

### Writing Good Consumer Tests

**Test only what you use:**
```javascript
// Bad: contract specifies the full response schema
willRespondWith: {
  body: {
    id: 'ord_123',
    userId: 'usr_456',
    status: 'CONFIRMED',
    items: [...],     // Specifying items the payment service never reads
    addresses: {...}, // Specifying addresses the payment service never uses
  }
}

// Good: contract specifies only required fields
willRespondWith: {
  body: {
    id: like('ord_123'),
    status: like('CONFIRMED'),
    totalAmount: {
      value: like('49.99'),
      currency: like('USD'),
    }
  }
}
```

**Use matchers, not literal values:**

Pact matchers express type and shape requirements without requiring specific values:
- `like(value)` — match any value of the same type
- `eachLike(item)` — match an array where each item matches `item`'s structure
- `regex(pattern, example)` — match a string against a regex
- `integer(example)` — match any integer
- `decimal(example)` — match any decimal number
- `datetime(format, example)` — match a datetime string in the given format

**Write meaningful provider states:**

Provider state names are the communication mechanism between consumer tests and provider setup code. They should be human-readable and unambiguous:

```javascript
// Bad
state: 'state1'

// Bad  
state: 'order exists'  // Which order? In what state?

// Good
state: 'order ord_123 exists with status CONFIRMED and total $49.99'
```

### Schema-First vs. Test-First

The debate: should the provider define the schema (OpenAPI) and consumers test against it, or should consumers define their expectations and providers verify?

**Schema-first (provider-driven):**
- Provider publishes OpenAPI spec
- Consumer tests against schema using validation libraries
- Bi-directional contracts (BDCT) automate the compatibility check

**Test-first (consumer-driven):**
- Consumer writes Pact tests expressing what they need
- Provider verifies it can satisfy all consumers
- True consumer-driven: consumers drive API design decisions

Schema-first is operationally simpler and works well with existing OpenAPI tooling. Test-first is philosophically purer and catches more edge cases. Most teams doing CDCT at scale use a hybrid: schema-first for stable, published APIs; test-first for actively evolving internal APIs.

## When to Use / When NOT to Use

**Use consumer-driven contract testing when:**
- You have multiple teams each owning services that call each other
- Your E2E test suite is slow, flaky, or expensive to run
- You have experienced production incidents caused by API incompatibilities between services
- You are deploying services independently and need confidence that deployments are safe
- Your teams practice continuous deployment

**Skip contract testing when:**
- All consumers are in the same repository (monorepo) — instead use integration tests with the real service
- Services are deployed together as a unit — incompatibilities would be caught before release
- The API is external and stable — contract tests add overhead without value
- The team is small and cross-service communication is trivial
- You do not have a Pact Broker or equivalent contract storage

## Common Mistakes

**Mistake 1: Testing too much in the consumer contract**

Over-specifying contracts makes them brittle. If your contract includes every field the provider returns, any provider extension breaks the contract. Contract tests should test the consumer's actual requirements, not the full provider schema.

**Mistake 2: Not integrating "can-i-deploy" into the deployment pipeline**

Generating pact files and publishing to a broker is useless if deployments do not check compatibility. The `can-i-deploy` command is the payoff — it queries the broker to verify that the version being deployed is compatible with all deployed consumer/provider versions.

**Mistake 3: Writing provider state setup that is too clever**

Provider state setup code that inserts complex test data, calls external services, or has side effects makes the provider test suite fragile and slow. Keep state handlers simple: insert minimal data into the local test database, nothing else.

**Mistake 4: Letting contracts become stale**

Contracts are only useful if they are run against current consumer and provider code. Consumer tests that are never executed, pact files that are never published, provider verifications that run only in release pipelines — all create false confidence. Run contract tests on every commit in CI.

**Mistake 5: Using contract tests as integration tests**

Contract tests verify API compatibility — not business logic, not end-to-end flows, not performance characteristics. A passing contract test means "the consumer's structural expectations match the provider's responses." It does not mean "the payment flow works correctly end to end." You still need integration tests for the latter.

## Connections

**API Versioning** (Article 03): Contract testing is the enforcement mechanism for the "no breaking changes" policy. When a provider change would break a consumer's contract, the CI build fails before the change reaches production. This makes versioning decisions explicit: if you need to break a contract, you must create a new API version.

**gRPC and Protobuf** (Article 02): Protobuf's wire compatibility rules (no changing field numbers, no removing fields) are a form of automated contract enforcement built into the serialization format. `buf breaking` performs the same role as Pact's contract verification, but at the schema level rather than the behavioral level.

**API Design Principles** (Article 10): Consumer-driven contract testing influences API design: APIs designed with known consumers in mind tend to be more minimal and focused than APIs designed speculatively. The discipline of writing consumer tests first — before the provider is implemented — is a powerful forcing function for building only what consumers need.

## Key Insights

Consumer-driven contract testing is fundamentally about making implicit assumptions explicit. Every consumer service has implicit assumptions about every provider it calls: "this field exists," "this status code means success," "this array will not be empty." These assumptions live in the consumer's code and are verified only in production. Contract testing externalizes these assumptions as executable specifications that the provider must satisfy.

The organizational benefit of CDCT is as important as the technical benefit. When teams publish their pact files, they are communicating their requirements to other teams in a machine-readable format. Provider teams can see exactly which consumers depend on which API fields. When a provider wants to remove a field, they can query the broker to find every consumer that uses it, contact those teams, and coordinate the migration. Without contract testing, this visibility does not exist.

The adoption path is incremental. You do not need to add contract tests for every service simultaneously. Start with the most painful integration points — the ones where you have experienced production incidents or where teams frequently break each other. Demonstrate value there, then expand. The infrastructure investment (Pact Broker, CI integration) has a fixed cost that amortizes across every additional pair of services you add.

Finally, contract testing changes the conversation between teams. Without it, the conversation is "I deployed a change and your service broke." With it, the conversation is "your contract says you need field X, and I need to remove it — can we agree on a migration plan?" That shift — from reactive debugging to proactive coordination — is the highest-value outcome of a successful contract testing program.
