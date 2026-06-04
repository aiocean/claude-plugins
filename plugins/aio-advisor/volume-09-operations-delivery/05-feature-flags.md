# Feature Flags and Toggles

> "Continuous delivery is not about deploying faster. It's about decoupling the act of deploying from the act of releasing." — Martin Fowler

## The Problem

The traditional software release model conflates two distinct events: deployment and release. Deployment is the technical act of installing new code on production servers. Release is the business act of making new functionality available to users. For most of software history, these two events happened simultaneously — deploying new code meant users got new features — because there was no infrastructure to deploy code without exposing it.

This coupling creates a class of problems that organizations learn to live with but never solve. Features that are "almost ready" block deployments of unrelated changes. Business stakeholders request specific release dates that engineering cannot guarantee because release requires a deployment. Marketing campaigns are planned around feature launches that slip because of last-minute bugs. When a feature ships and causes production problems, the only options are rollback (reverting everything, including unrelated changes) or hotfix (deploying a targeted fix under pressure). The coupling between deployment and release makes every deployment a business event rather than a technical routine.

The second problem is that "ready for production" is not a binary state. A feature might be ready for internal employees but not for beta users. Ready for 5% of paying customers but not for enterprise accounts. Ready for users in one region but not another. Ready at midnight on a Tuesday but not at 9am on Monday when support teams are at capacity. The binary deploy/don't-deploy model cannot express this nuance, so teams resort to workarounds: separate deployment environments, customer-specific builds, manual access toggles in databases. These workarounds compound into operational complexity that eventually becomes unmanageable.

The third problem is that experimentation requires a way to show different behavior to different users, measure the difference, and make a decision. A/B testing is one of the most valuable tools in product development — it replaces "we think this will help" with "we measured and it did." But A/B testing requires exactly the kind of controlled, observable, reversible traffic splitting that feature flags provide. Organizations without feature flag infrastructure cannot do principled A/B testing at scale.

## Core Concept

A feature flag (also called a feature toggle) is a conditional in code that controls whether a feature is active. In its simplest form:

```python
if feature_flags.is_enabled("new-checkout-flow", user=current_user):
    return new_checkout_handler(request)
else:
    return old_checkout_handler(request)
```

The flag evaluation — the decision of whether to return `True` or `False` for a given user — can be controlled dynamically, without code deployment. This is the key capability: flags separate the code that implements a feature from the configuration that controls whether it is active.

Pete Hodgson's 2017 taxonomy of feature flags by intended lifespan and dynamism is the most complete mental model for understanding what feature flags are and are not.

### Release Toggles

**Purpose**: Deploy code before it is ready to be released. The feature is in production but inactive.

**Lifespan**: Days to weeks. Should be removed once the feature is fully released.

**Dynamism**: Changes are planned and infrequent. The flag is flipped once per release cycle.

```yaml
# LaunchDarkly flag configuration
flag: new-payment-processor
default-variation: false
rules:
  - when: user.internal == true
    serve: true   # internal employees see it
  # All external users get default (false)
```

Release toggles are the simplest and most common type of feature flag. They solve the "feature is not ready" deployment blocker. The new payment processor code is deployed to production but disabled. The old code continues to run. When the new processor is validated and the business is ready to launch, the flag is toggled — no deployment required.

### Experiment Toggles

**Purpose**: A/B test a feature to measure its effect on user behavior.

**Lifespan**: Days to weeks. Should be removed once the experiment reaches statistical significance.

**Dynamism**: Changes frequently — the system may update the assignment multiple times per day as it collects data.

```yaml
flag: new-recommendation-algorithm
variations:
  - control: { algorithm: "collaborative-filtering" }
  - treatment: { algorithm: "neural-embedding" }
rollout:
  - percentage: 50
    variation: control
  - percentage: 50
    variation: treatment
tracking:
  metric: "click-through-rate"
  metric: "time-to-purchase"
```

Experiment toggles require more infrastructure than release toggles. The system must:
1. Consistently assign users to the same variation across sessions (sticky bucketing)
2. Log which variation a user received for each event
3. Compute statistical significance between variations
4. Provide a decision interface for analyzing results

### Operational Toggles

**Purpose**: Control system behavior in response to operational conditions. Think of them as software circuit breakers.

**Lifespan**: Can be long-lived — months to years if they provide ongoing operational flexibility.

**Dynamism**: Changed by on-call engineers during incidents, sometimes automated based on metrics.

```yaml
flag: recommendations-service
default-variation: enabled
rules:
  - when: recommendations_latency_p99 > 2000ms
    serve: degraded   # show popular items instead of personalized recommendations
  - when: recommendations_error_rate > 5%
    serve: disabled   # show no recommendations, remove the UI element entirely
```

Operational toggles are the feature flag version of circuit breakers. When the recommendations service is unhealthy, the flag switches to a degraded mode that removes the dependency on that service. This is implemented in the calling code, not in the recommendations service itself — which means you can reduce its load even if it is not responding.

### Permission Toggles

**Purpose**: Enable features for specific users, accounts, or segments. Beta programs, enterprise features, internal tools.

**Lifespan**: Potentially permanent. An "enterprise-only" feature may have a permanent permission toggle.

**Dynamism**: Changes on user/account provisioning events, not operational events.

```yaml
flag: advanced-analytics-dashboard
rules:
  - when: user.plan == "enterprise"
    serve: true
  - when: user.beta_tester == true
    serve: true
  - default: false
```

Permission toggles are straightforward but require integration with your identity and authorization system. The flag evaluation needs to know who the user is, what plan they are on, and what groups they belong to.

### Flag Architecture: In-Process vs. Remote Evaluation

**In-process flags**: Flag rules are bundled with the application. Evaluation is a local function call with no network dependency. Changes require redeployment.

**Remote-evaluated flags**: An SDK makes a network call to a flag service to evaluate flags. Changes take effect immediately without redeployment. Adds a network dependency; the flag service must be highly available.

**SDK with local caching**: The best of both worlds for most production use cases. The SDK caches flag values locally, refreshing from the remote service every few seconds. Flag evaluations use the local cache (no network latency, no network dependency in the hot path). Changes propagate within the cache TTL.

```go
// LaunchDarkly Go SDK with local caching
client, _ := ld.MakeClient(sdkKey, 5*time.Second)

// This evaluation is local — no network call
enabled, _ := client.BoolVariation("new-checkout-flow", user, false)
```

The cache TTL is typically 30-60 seconds. This means flag changes take up to 60 seconds to propagate globally — acceptable for most use cases, but not for operational toggles that need immediate effect. For operational toggles, configure shorter TTLs or use streaming SDKs that receive flag changes via server-sent events.

### Targeting Rules and Bucketing

The power of a feature flag system is in its targeting rules. The flag decision is not just on/off — it is "on for this user under these conditions."

Stable bucketing is critical for experiment integrity. A user assigned to the "treatment" group in an A/B test must stay in the treatment group across sessions, devices, and time. Without stable bucketing, the same user gets different experiences in different sessions, which contaminates the experiment data.

Standard bucketing: Hash(user_id + flag_key) % 100 gives a deterministic percentage between 0-99 for each user/flag combination. Users in percentile 0-49 get the control; users in 50-99 get the treatment. The assignment is stable as long as the user ID does not change.

```python
import hashlib

def get_bucket(user_id: str, flag_key: str) -> int:
    hash_input = f"{user_id}:{flag_key}"
    hash_value = int(hashlib.sha1(hash_input.encode()).hexdigest(), 16)
    return hash_value % 100

def is_in_rollout(user_id: str, flag_key: str, percentage: int) -> bool:
    return get_bucket(user_id, flag_key) < percentage
```

### Flag Debt: The Hidden Cost

Feature flags that are never cleaned up are technical debt. Every live flag is a conditional branch in code that must be tested, maintained, and reasoned about. A codebase with 500 live flags is a codebase with 500 conditional paths, many of which interact. Testing all combinations is exponentially expensive. Reading code with many flags is cognitively expensive.

The half-life of a feature flag should be defined when it is created:

- Release toggles: 2-4 weeks (remove after feature is fully deployed)
- Experiment toggles: 2-6 weeks (remove after experiment decision)
- Operational toggles: Indefinite (but document and review quarterly)
- Permission toggles: Indefinite (but own them in the entitlements system, not code)

Flag cleanup is an ongoing discipline, not a periodic event. Many organizations add flag removal to the "definition of done" for a feature: the feature is not done until the flag that controlled its rollout has been removed.

## Deep Dive

### Martin Fowler's Flag Taxonomy: Why Classification Matters

Martin Fowler's 2017 article "Feature Toggles (aka Feature Flags)" on martinfowler.com provides the most widely cited taxonomy of feature flags in the industry. Fowler's key contribution is distinguishing flags by two dimensions: how long they live and how dynamic they need to be. The combination produces four archetypes with fundamentally different operational properties.

Release toggles are short-lived (days to weeks) and relatively static — they are set per deployment to hide incomplete features, and they are removed once the feature launches to all users. Experiment toggles are dynamic (the system needs to evaluate them per user request to run A/B tests) and medium-lived. Ops toggles are long-lived but rarely changed — circuit breakers, kill switches for expensive features, regional rollback controls. Permission toggles are long-lived and per-user — they implement feature access control based on subscription tier or user attributes.

The practical importance of this taxonomy: different flag types require different implementation approaches and different lifecycle management. Release toggles that live forever become permanent dead code paths — the flag taxonomy makes "cleanup this release toggle after launch" an explicit engineering practice rather than something that gets forgotten. Ops toggles that are implemented like experiment toggles (evaluated dynamically per request) add unnecessary latency to the hot path. Mixing these types without a taxonomy leads to what Fowler calls "toggle debt" — a system where nobody knows which flags are safe to remove and every flag change requires careful analysis.

### The Overlapping Experiment Infrastructure Paper (2010)

Google's "Overlapping Experiment Infrastructure: More, Better, Faster Experimentation" (Tang, Agarwal, O'Brien, Meyer — 2010) solved a practical constraint in large-scale A/B testing: if you can only run one experiment at a time, the experimentation throughput is limited by experiment duration. For a 2-week experiment, you can run at most 26 per year. Google needed to run thousands per year.

The paper's solution is the "experiment layer" — an orthogonal partition of the user space where experiments in different layers do not interact. A user's assignment to layer 1 (search ranking experiments) is independent of their assignment to layer 2 (UI experiments). Multiple experiments can run simultaneously across the same users without their effects confounding each other, as long as the experiments are in different layers and the layers are designed to capture non-overlapping dimensions of user behavior.

This infrastructure architecture is why modern experimentation platforms (Optimizely, LaunchDarkly, Split.io) have the concept of "experiment namespaces" or "mutually exclusive groups" — they are implementations of the layer concept from this paper. The statistical implication is that each experiment needs fewer users to achieve significance because the population is not diluted by other concurrent experiments affecting the same behavior dimension. Running experiments in layers is not just an engineering convenience; it is a statistical efficiency improvement that directly increases the rate of learning from experimentation.

## Implementation Guide

### Step 1: Choose Your Tool

Self-hosted options:
- **Unleash**: Open source, full-featured, self-hosted. Good for organizations with data residency requirements.
- **Flagsmith**: Open source with hosted option. Simpler than Unleash.
- **Flipt**: Go-based, lightweight, gRPC API.

Managed options:
- **LaunchDarkly**: The category leader. Sophisticated targeting, experimentation, A/B testing, analytics. Expensive at scale.
- **Split.io**: Strong experimentation features. Good integration with data warehouses.
- **Statsig**: Built-in experimentation platform. Good for teams that want flags and A/B testing from the same tool.
- **Growthbook**: Open source A/B testing with feature flags. Good for data-driven teams.

For most teams starting out: LaunchDarkly or Unleash (depending on budget and hosting preference).

### Step 2: Wrap the SDK

Do not call the flag SDK directly from business logic. Create a thin wrapper that provides type safety, documents the expected values, and makes testing easier:

```typescript
// flags.ts — centralized flag definitions
export const Flags = {
  NEW_CHECKOUT_FLOW: 'new-checkout-flow',
  RECOMMENDATIONS_ENABLED: 'recommendations-enabled',
  PAYMENT_PROCESSOR_V2: 'payment-processor-v2',
} as const;

export class FeatureFlags {
  constructor(private client: LDClient) {}
  
  isNewCheckoutEnabled(user: User): boolean {
    return this.client.variation(Flags.NEW_CHECKOUT_FLOW, 
      { key: user.id, custom: { plan: user.plan } }, 
      false
    );
  }
  
  getPaymentProcessor(user: User): 'v1' | 'v2' {
    return this.client.variation(Flags.PAYMENT_PROCESSOR_V2,
      { key: user.id },
      'v1'
    );
  }
}
```

### Step 3: Test Flag Branches

Every flag creates branches that must be tested. Your test suite must exercise both the enabled and disabled paths:

```typescript
describe('checkout handler', () => {
  it('uses new checkout when flag enabled', async () => {
    const flags = new MockFeatureFlags({ 'new-checkout-flow': true });
    const result = await checkout(request, flags);
    expect(result.handler).toBe('new-checkout-handler');
  });

  it('uses old checkout when flag disabled', async () => {
    const flags = new MockFeatureFlags({ 'new-checkout-flow': false });
    const result = await checkout(request, flags);
    expect(result.handler).toBe('old-checkout-handler');
  });
});
```

The MockFeatureFlags class is a simple in-memory implementation of the flag interface that returns preset values. It eliminates the network dependency in tests.

### Step 4: Instrument Flag Evaluations

Every flag evaluation should emit an event to your analytics system:

```python
# Log every flag evaluation for analysis
flag_value = client.variation('new-checkout-flow', user, False)
analytics.track('flag_evaluated', {
    'flag_key': 'new-checkout-flow',
    'flag_value': flag_value,
    'user_id': user.key,
    'context': 'checkout_page'
})
```

This instrumentation powers two things: experiment analysis (comparing metrics between flag variations) and flag audit logs (who saw which version of a feature and when).

### Step 5: Build Flag Lifecycle Management

Implement a process for flag cleanup:
- Track flag creation date and intended removal date in the flag management system
- Alert when a release toggle has been live for more than 30 days
- Require a "flag removal PR" as a definition-of-done criterion for feature work
- Run a quarterly flag audit to identify stale flags

## When to Use / When NOT to Use

**Use feature flags for:**
- High-risk feature rollouts where you want to control exposure
- A/B experiments on user-facing behavior
- Beta programs and early access features
- Operational circuit breakers for non-critical features
- Dark launches to validate new code against production traffic

**Do not use feature flags for:**
- Permanent configuration (use environment variables or config files)
- Authorization logic (use a proper authorization system)
- Long-lived branches in business logic (every flag is technical debt; permanent behavioral divergence should be modeled in data, not code)
- Security-critical decisions (flag systems can be misconfigured; security controls should not depend on flag availability)

**Flag debt warning signs:**
- More than 100 live flags in a codebase
- Flags that have been live for more than 6 months with no documented removal plan
- Flag names that reference historical events ("black-friday-2022-optimization")
- Code paths that are only reachable with specific flag combinations that no one can enumerate

## Common Mistakes

**Flags without ownership**: Every flag should have an owner — the team responsible for removing it when it is no longer needed. Ownerless flags persist forever because no one has the context to safely remove them.

**Not testing the disabled path**: Teams often test only the enabled path (the new feature) and assume the disabled path (old behavior) still works. A refactoring that accidentally breaks the disabled path — which only users on the old code path see — is a regression that tests do not catch.

**Using flags for configuration**: A flag that controls the timeout value for an external API call is configuration, not a feature toggle. Configuration belongs in environment-specific config files, not a feature flag system. Feature flags are for controlling behavior that is defined by the code, not by environment parameters.

**Flag explosion**: Adding a new flag for every small feature until the codebase has hundreds of flags. Flags are expensive to maintain. Use them for features with genuine rollout risk, not for every change.

**Evaluating flags in tight loops**: Evaluating a flag inside a loop that runs 10,000 times per request is a performance problem even with local caching. Evaluate flags at the boundary of a request, store the result in a request-scoped variable, and use that variable throughout the request lifecycle.

**Not handling the flag service being unavailable**: Every SDK call has a default value parameter for exactly this reason. If the flag service is unreachable, the SDK returns the default. Your defaults should be the safe, conservative choice — typically the existing behavior, not the new one.

## Connections

**Deployment Strategies (Article 04)**: Feature flags are the application-layer complement to infrastructure-layer progressive delivery. Together they enable releases that are independent of deployments.

**Observability (Article 03)**: Experiment analysis requires observability data correlated with flag variation assignments. Without logging which variation a user received alongside their behavior, you cannot measure the effect of an experiment.

**SLOs (Article 02)**: Operational toggles can be driven by SLI data — automatically disabling a non-critical feature when a dependent service's error rate exceeds its SLO budget.

**Testing Strategies (Article 11)**: Feature flags require branching test coverage. Every flag adds paths that must be tested; discipline around test coverage of both flag states is required to prevent regressions.

## Key Insights

The most important capability that feature flags provide is not risk reduction — it is the decoupling of technical and business timelines. When deployment and release are the same event, engineering schedules and business schedules must align precisely. When they are decoupled by feature flags, engineering can ship code continuously while business controls release timing. This alignment overhead, which is invisible in small organizations, is a significant coordination cost in large ones.

The taxonomy of flag types matters in practice. Teams that treat all flags the same way — using release toggles as permanent operational switches, or using experiment toggles as long-lived release toggles — accumulate flag debt that eventually becomes a maintenance burden. The type of a flag determines its expected lifespan and cleanup discipline.

Flag cleanup is as important as flag creation. The total value of a feature flag program is not the value of the flags created minus zero; it is the value of the flags created minus the maintenance cost of every flag that was not cleaned up. Teams that create flags without lifecycle management eventually have codebases where the flag system itself becomes a reliability risk.

The power of feature flags multiplies with experimentation infrastructure. A flag that is just "on or off" has limited value beyond release decoupling. A flag that is "on for 50% of users, with metrics comparing behavior between the 50% populations" is an A/B test that drives product decisions with data. The same infrastructure supports both; the difference is whether you build the analytics layer on top of it.
