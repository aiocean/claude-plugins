# Blue-Green, Canary, Rolling, and Progressive Delivery

> "The goal of continuous delivery is to make deployments — whether of a large-scale distributed system, a complex production environment, or an embedded system — low-risk, frequent, cheap, fast, and predictable." — Jez Humble & David Farley, Continuous Delivery

## The Problem

Deployment is the moment of maximum risk in software engineering. You have a working system and a new version of that system, and you need to replace one with the other without your users noticing. This sounds straightforward but is not. The new version might have bugs that testing did not catch. The database schema migration might be incompatible with the old code in ways that create data corruption. The new service might behave correctly in isolation but fail under production load patterns that staging never replicates. The deployment infrastructure itself might fail mid-deployment, leaving you with a half-migrated system in an undefined state.

The traditional solution — the "big bang" deployment — addresses none of these risks. You schedule a maintenance window, stop traffic, deploy the new version, run database migrations, restart services, and restore traffic. If something goes wrong, you roll back. In practice, this sequence fails in ways that are difficult to predict: rollbacks that fail because the database migration is not reversible, deployments that succeed in isolation but fail under traffic, and maintenance windows that expand from 30 minutes to 4 hours while engineering teams debug issues live.

The second problem is that deployment frequency and deployment risk have a counterintuitive relationship. Teams that deploy rarely accumulate large changes between deployments, which makes each deployment higher risk, which justifies deploying rarely. This feedback loop creates organizations that deploy monthly or quarterly, where each deployment is a multi-day operation requiring war rooms and executive sign-off. The correct intervention is to deploy more frequently with smaller changes — but this requires deployment infrastructure that makes small, frequent deployments safe, which is exactly what most organizations lack.

The third problem is user impact asymmetry. A deployment that fails affects 100% of your users. A rollback that takes 30 minutes affects 100% of your users for 30 minutes. Modern deployment strategies break this asymmetry: a canary deployment that fails only affects the 1% of users on the canary, and rollback means redirecting 1% of traffic back to the stable version. The mathematical difference in user impact is enormous.

## Core Concept

Modern deployment strategies share a core principle: replace all-or-nothing deployments with gradual, observable, reversible transitions. Rather than replacing version A with version B in a single operation, you introduce B gradually, measure its behavior, and complete the transition only when you are confident B is safe.

The strategies exist on a spectrum from simplest to most sophisticated. Each has different infrastructure requirements, different risk profiles, and different appropriate use cases. Understanding the tradeoffs — not just the mechanics — is what allows you to choose the right strategy for a given deployment.

### Blue-Green Deployment

Blue-green deployment maintains two identical production environments: "blue" (currently serving traffic) and "green" (the new version, not yet serving traffic). Deployment means:

1. Deploy the new version to the green environment
2. Run smoke tests and validation on green while blue continues serving users
3. Switch all traffic from blue to green — typically by updating a load balancer rule or DNS
4. Blue remains running as the instant rollback target
5. After a confidence period (hours to days), decommission or repurpose blue

The switchover from blue to green is atomic — all traffic moves at once. This is blue-green's primary advantage and primary disadvantage.

**Advantages:**
- Zero-downtime deployment: traffic switches in milliseconds
- Instant rollback: revert the load balancer rule if green fails
- Full testing of green in production-equivalent environment before traffic switch
- No partial state: at any moment, all users are on the same version

**Disadvantages:**
- 2x infrastructure cost during the transition period
- Database migrations must be forward and backward compatible — both blue and green may run simultaneously against the same database, so the schema must work with both code versions
- Stateful services (anything with in-memory session state, connection pools, long-lived connections) require careful handling during the switch
- The instant switchover means that if green has a bug that blue's validation did not catch, 100% of users are affected simultaneously

**Database migration compatibility** is the most underappreciated challenge in blue-green deployments. The pattern requires multi-phase migrations:

Phase 1 (deploy to green): Schema change must be backward compatible. Add a column, but the old code (blue) ignores it. New code (green) uses it.
Phase 2 (after blue is retired): Remove backward compatibility shims. Now the schema can be cleaned up.

This "expand-contract" migration pattern is required for any schema change that blue and green need to survive simultaneously. It doubles the number of migration steps but eliminates the class of incidents caused by running new code against old schema during deployment.

**When to use blue-green**: Services where instant rollback is more important than gradual rollout. Large monoliths. Batch systems with scheduled invocations. Services where partial version coexistence would create data consistency problems.

### Canary Deployment

Canary deployment routes a small percentage of traffic — typically 1-5% initially — to the new version while the majority of traffic continues to the stable version. The canary serves as an early warning system: if the new version has problems, only canary users are affected.

The name comes from the mining practice of bringing canaries into mines to detect carbon monoxide — the canary's distress serves as early warning before miners are affected. The deployment canary is a small population of users whose experience with the new version gives you signal about its safety before exposing everyone else.

The canary traffic split can be implemented at multiple levels:
- Load balancer: route X% of requests to new instances
- Service mesh (Istio, Linkerd): traffic splitting with fine-grained control
- Feature flags: serve new code to X% of users, regardless of which instance handles the request
- DNS-based: route X% of DNS queries to new infrastructure

**Progressive canary analysis**: Manual monitoring of a canary is not scalable. Progressive delivery tools (Argo Rollouts, Flagger, Spinnaker) automate canary analysis by comparing SLIs between canary and stable populations:

```yaml
# Argo Rollouts canary configuration
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5      # 5% of traffic to canary
        - pause: {duration: 10m}
        - setWeight: 20
        - pause: {duration: 10m}
        - analysis:          # automated canary analysis
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: payment-service
        - setWeight: 50
        - pause: {duration: 10m}
        - setWeight: 100
```

Automated canary analysis compares metrics between canary and baseline: error rate, latency percentiles, business metrics (conversion rate, revenue per request). If the canary's error rate is statistically significantly higher than the baseline, the rollout halts and alerts fire. If the canary passes all checks, the rollout proceeds to the next weight.

**Canary population selection**: Random traffic assignment works for most services. For some services, you want deliberate selection: internal employees first, then beta users, then a random sample of paying customers. Feature flags provide more control over population selection than load-balancer-level traffic splitting.

**When to use canary**: Services where gradual exposure reduces risk more than instant switchover. User-facing features where user behavior needs to be validated. Risky changes where you want early signal before full rollout. Services where 1-5% user impact is acceptable as the "canary cost."

### Rolling Deployment

Rolling deployment gradually replaces old instances with new ones, one or a few at a time. Kubernetes does this natively:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # allow 1 extra pod during rollout
      maxUnavailable: 0  # never remove a pod before replacement is ready
```

With these settings, a 10-pod deployment upgrades by:
1. Creating 1 new pod (now 11 total: 10 old, 1 new)
2. Waiting for new pod to become ready
3. Terminating 1 old pod (now 10 total: 9 old, 1 new)
4. Repeating until all 10 are new

The rollout takes time proportional to the pod startup time multiplied by the number of replicas. For 10 pods with 60-second startup time, the rollout takes approximately 10 minutes.

**Advantages**: No extra infrastructure cost (unlike blue-green). Gradual, like canary. Native support in Kubernetes.

**Disadvantages**: During the rollout, both old and new code run simultaneously, handling requests. This creates the same database compatibility requirement as blue-green. There is no "clean" moment when the old version is still running and the new version is not yet receiving traffic — they overlap throughout.

Rolling deployments also have a subtle readiness problem: Kubernetes considers a pod "ready" when its readiness probe returns healthy. But the readiness probe may pass before the application has fully warmed up (caches loaded, JIT compiled, connection pools established). Traffic routed to a technically-ready but not-yet-warm pod may see elevated latency. `minReadySeconds` helps but does not eliminate this entirely.

**When to use rolling**: Stateless services with fast startup. Services where infrastructure cost efficiency matters more than deployment speed. Kubernetes-native workloads where the built-in rolling update behavior is acceptable.

### Progressive Delivery

Progressive delivery is the umbrella term for deployment practices that combine gradual rollout with automated measurement and decision-making. It is the combination of canary deployment, automated canary analysis, and feature flags working together.

The key distinction from simple canary: progressive delivery is automated. The system does not just route traffic to the canary — it measures the canary, compares it to the baseline, and makes the advance-or-abort decision without human intervention. Human intervention is required only for exceptional cases — when the canary fails dramatically, or when the system cannot reach statistical significance and needs a judgment call.

The full progressive delivery lifecycle:

1. **Deploy**: New version deployed alongside old version, receiving 0% of traffic
2. **Observe baseline**: Collect metrics from the stable version over a baseline period
3. **Expose canary**: Route a small percentage of traffic to the new version
4. **Analyze**: Compare canary metrics to baseline; check for regressions in error rate, latency, business metrics
5. **Advance or abort**: If metrics are healthy, increase canary percentage; if degraded, roll back automatically
6. **Complete**: When canary reaches 100%, decommission the old version

**Feature Flags Integration**: Feature flags (covered in Article 05) extend progressive delivery beyond infrastructure. With infrastructure-level progressive delivery, you can route 10% of requests to new code. With feature flags, you can enable a specific new feature for 10% of users regardless of which code instance handles their request. The combination is powerful: deploy new code to all instances, enable new features progressively via flags, and roll back individual features by toggling flags without redeployment.

**Dark launches**: A technique where new code runs in production and processes real traffic but does not return its results to users. The results are logged for comparison against the production code. Dark launches validate that new code behaves correctly on real traffic patterns before it affects users at all.

## Deep Dive

### The DORA Research: Deployment Frequency as a Reliability Predictor

The DORA (DevOps Research and Assessment) program, conducted by Nicole Forsgren, Jez Humble, and Gene Kim and published in "Accelerate" (2018), overturned a widely held assumption: that deployment frequency and stability trade off against each other. The research found the opposite — elite-performing teams deploy far more frequently than low-performing teams *and* have lower change failure rates and faster recovery times.

The mechanism is not counterintuitive once examined: frequent, small deployments are inherently lower risk than infrequent, large deployments. A deployment that changes 50 lines is easier to reason about, easier to roll back, and faster to diagnose than one that changes 5,000 lines. The accumulated risk from 100 small deployments is lower than the concentrated risk of one large deployment, because each small deployment validates only a small behavior change in isolation.

"Accelerate" reports that elite performers (the top quartile) deploy multiple times per day with change failure rates under 15%, while low performers deploy monthly or less with change failure rates of 46-60%. This data, drawn from surveys of thousands of organizations over multiple years, established deployment frequency as a leading indicator of organizational reliability — not a trade-off against it. This finding directly motivates the investment in deployment automation, canary infrastructure, and progressive delivery tooling covered in this article.

### The Expand-Contract Pattern for Zero-Downtime Database Migrations

The most underappreciated deployment strategy challenge is schema changes. Application code can be deployed with zero downtime using blue-green or rolling deployments. Database schemas cannot — an ALTER TABLE that adds a NOT NULL column or renames a column will break old application versions that don't know about the change.

The expand-contract pattern (also called parallel change or evolutionary database design) solves this by making schema changes in three phases. In the expand phase, additive changes are made: a new column is added as nullable, a new index is created, a new table is created. Old application code is unaffected by additive changes. In the parallel phase, both the old and new code paths coexist: new application code writes to both old and new columns, a background migration backfills the new column for existing rows. In the contract phase, once all application code has migrated to the new column and the old column is no longer written, the old column can be dropped.

Each phase can be deployed and validated independently. A migration that would have required a maintenance window with the naive approach becomes a multi-week sequence of zero-downtime deployments. The cost is that migrations take longer in calendar time, but they are fully reversible at every phase and carry no availability risk. Martin Fowler's "Refactoring Databases" (2006, with Pramod Sadalage) documented this pattern in detail, and it remains the authoritative reference for database migration strategy in continuously deployed systems.

## Implementation Guide

### Choosing a Strategy

| Factor | Blue-Green | Canary | Rolling |
|--------|-----------|--------|---------|
| Infrastructure cost | 2x during rollout | Minimal extra | None |
| Rollback speed | Instant | Minutes | Minutes |
| Database compatibility required | Yes | Yes | Yes |
| Partial version coexistence | No | Yes | Yes |
| Traffic control granularity | All-or-nothing | Fine-grained | Per-instance |
| Complexity | Medium | High | Low |
| Best for | Stateful apps, quick rollback priority | User-facing features, risk reduction | Stateless k8s workloads |

### Implementing Canary in Kubernetes with Argo Rollouts

```bash
# Install Argo Rollouts
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Convert a Deployment to a Rollout
kubectl argo rollouts get rollout payment-service --watch
kubectl argo rollouts set image payment-service payment-service=payment-service:v2
```

### Database Migration Pattern

Always use expand-contract for schema migrations:

```sql
-- Step 1: Expand (backward compatible)
ALTER TABLE orders ADD COLUMN new_status_v2 VARCHAR(50);

-- Deploy new code that writes to both old and new columns
-- Wait for deployment to complete and validate

-- Step 2: Backfill
UPDATE orders SET new_status_v2 = old_status WHERE new_status_v2 IS NULL;

-- Step 3: Migrate reads (code now reads from new_status_v2)
-- Deploy code update, validate

-- Step 4: Contract (after old code version is fully retired)
ALTER TABLE orders DROP COLUMN old_status;
```

### Rollback Checklist

Before any deployment, document:
- How to roll back (exact commands, who executes)
- What state is preserved vs. lost in rollback (database changes, cache entries)
- Who has authority to call a rollback
- What metrics trigger automatic rollback vs. human judgment

## When to Use / When NOT to Use

**Blue-green is right when:** You need instant rollback capability. Your service is a stateful monolith. Your team is new to progressive delivery and needs the simplicity of all-or-nothing switching.

**Canary is right when:** User-facing risk reduction matters more than infrastructure cost. You have SLI monitoring mature enough to detect canary degradation. Your service is stateless or you have handled database compatibility.

**Rolling updates are right when:** Infrastructure cost efficiency matters. Your service is a stateless Kubernetes workload. You don't need fine-grained traffic control.

**Do not use canary when:** Your change is all-or-nothing (a breaking API change that every client must migrate simultaneously). Your user population is too small for statistical significance (< 1,000 requests per hour makes canary analysis unreliable). Your service has no SLI monitoring — you need something to compare the canary against.

## Common Mistakes

**Not handling database migration compatibility**: The most common cause of deployment failure. New code runs against old schema, or vice versa, causing 500 errors. Always use expand-contract migrations.

**Treating rollback as a failsafe instead of a plan**: "We'll roll back if something goes wrong" is not a rollback plan. Define the triggers (which metrics at what thresholds), the procedure (exact commands), and the decision authority before deployment.

**Canary with no automated analysis**: A canary that requires humans to watch dashboards for 30 minutes for every deployment does not scale. Automate the analysis so canary advancement is decision-free for healthy rollouts.

**Ignoring warm-up time**: New instances often take time to warm up (cache loading, JIT compilation, connection pool establishment). Traffic routing to cold instances causes transient latency spikes that look like deployment failures but are actually normal startup behavior. Configure appropriate `minReadySeconds` and readiness probes.

**Not testing rollback**: Teams practice deployments but not rollbacks. The rollback is the emergency procedure and it should be exercised regularly enough that the on-call team can execute it without consulting documentation.

## Connections

**Feature Flags (Article 05)**: Feature flags are the software-layer complement to infrastructure-layer progressive delivery. Together they enable dark launches and gradual feature rollouts independent of deployment timing.

**SLOs (Article 02)**: SLI degradation is the primary trigger for canary rollback. Without SLOs, automated canary analysis has nothing to measure against.

**Observability (Article 03)**: Canary analysis requires observability infrastructure to compare metrics between canary and baseline. Without good metrics, canary analysis is guesswork.

**GitOps (Article 08)**: Progressive delivery pipelines are typically managed as GitOps workflows — the rollout configuration is version-controlled, and deployment state changes are driven by Git commits.

## Key Insights

The central insight of progressive delivery is that deployment risk is proportional to blast radius. If a deployment can affect 100% of users, it carries the risk of a 100%-impact incident. If a deployment can affect only 1% of users, the worst case is a 1%-impact incident. Reducing blast radius reduces risk. The deployment strategies in this article are all, fundamentally, blast radius reduction techniques.

The database migration compatibility requirement is non-negotiable. Every team that skips expand-contract migrations eventually has a deployment that corrupts data or causes extended downtime because they ran incompatible code and schema simultaneously. The expand-contract pattern is more work, but it is the only way to make deployments safely reversible.

Automated canary analysis is the difference between canary deployment as a practice and canary deployment as a process. Manual monitoring of canaries does not scale to more than a few deployments per day. Automated analysis — with statistical comparison, configurable thresholds, and automatic rollback — makes it possible to deploy dozens of times per day with confidence.

The goal is not zero-downtime deployment for its own sake. The goal is confident, frequent deployment that treats production as the only environment that matters. Every improvement to your deployment pipeline that lets you ship smaller changes more often is a reliability improvement, because smaller changes are easier to reason about, easier to validate, and easier to roll back.
