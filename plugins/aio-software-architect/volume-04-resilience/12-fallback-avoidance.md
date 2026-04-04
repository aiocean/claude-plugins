# Why You Should Avoid Fallback Code

> "Fallback code is a hypothesis that is almost never tested. And the one time you need it — during an outage, under pressure — is exactly when untested code fails." — AWS Builder's Library

## The Problem

Fallback code feels like responsible engineering. Something might fail, so you write a secondary path to handle the failure. The primary service is slow? Fall back to a secondary service. The primary data source is unavailable? Fall back to cached data. The recommended content can't load? Fall back to a generic list. The intent is sound: instead of failing completely, degrade gracefully.

The problem is that fallback code is almost never exercised during normal operation. In a healthy system, the primary path always works, and the fallback path sits dormant, accumulating bit rot. Dependencies change. APIs evolve. The fallback's assumptions about the secondary service — its API contract, its authentication mechanism, its response format — become stale without anyone noticing because no tests exercise the fallback under realistic conditions.

Then the primary service fails. This is, by definition, an unusual event — if primary failures were routine, they'd be caught in testing. The fallback activates for the first time in production, under load, during an incident. It immediately fails because it's calling a secondary service whose API changed three months ago. Or it fails because the credentials for the fallback service expired. Or it fails because the fallback service is in the same AWS region as the primary service and the regional event that took down the primary also took down the fallback.

The AWS Builder's Library makes this point directly: fallback code "can make the impact of an outage much worse." You arrive at the incident with two systems failing instead of one. The on-call engineer who expected a contained failure now has to diagnose why the primary failed and why the fallback is also failing, under time pressure, in the middle of an outage.

The second dimension of the problem is that fallback code often creates hidden dependencies. The primary service depends on Service A. The fallback calls Service B. Service B is now an indirect dependency of the primary service — but it's not documented, not monitored as a dependency, not included in capacity planning, and not represented in the dependency graph that your incident response team uses when diagnosing failures. When Service B has an outage, nobody immediately looks at it as the cause of primary service degradation.

The third dimension: fallback complexity. Dual-path code is harder to understand and maintain than single-path code. Every time the primary path changes (new API fields, new response formats, new error codes), the fallback path may also need to change. Often it doesn't get updated, because the fallback is rarely tested and the change isn't obviously necessary. Over time, the fallback diverges from the primary, becoming an increasingly unreliable safety net.

## Core Concept

The AWS Builder's Library article "Avoiding fallback in distributed systems" argues for a different investment strategy: instead of building fallback paths for when the primary fails, invest in making the primary path more reliable so that fallbacks are rarely needed.

This is not an argument against graceful degradation (Article 09) or static stability (Article 06). Those patterns have their place. It is an argument against a specific pattern: dynamic fallback code that calls a secondary service when the primary is unavailable. The distinction matters:

**What to avoid**: Code that says "if the recommendation service fails, call the backup recommendation service." Two dynamic services, two potential failure points, one almost-never-tested code path.

**What to prefer instead**:
1. Make the primary service reliable enough that fallback is rare
2. Use pre-computed static content as fallback (not another live service)
3. Use static stability (pre-loaded configuration) rather than dynamic fallback configuration services
4. Design for omission (if the feature fails, omit it) rather than substitution (replace it with something else)

### The Reliability Investment Argument

The core of the argument is resource allocation. Time spent building and maintaining fallback code is time not spent improving the reliability of the primary path. If the primary service has 99.9% availability and you invest two engineer-weeks in a fallback system, you might achieve equivalent user experience as 99.95% primary reliability. But two engineer-weeks improving the primary path might get you to 99.99% — one-tenth the failure rate. The same investment produces a better outcome when directed at primary reliability rather than fallback complexity.

This doesn't mean never having fallbacks. It means questioning every fallback: is this the right investment, or would the same effort in primary reliability be more valuable?

### When Fallback IS Appropriate

The argument against fallback is not absolute. There are cases where fallback is genuinely the right design:

**Static content fallbacks**: A fallback to pre-computed, pre-cached static content is not a live code path. It requires no network calls, has no new dependencies, and doesn't rot because static content doesn't change. This is appropriate and recommended (see Article 09 on graceful degradation).

**Omission as fallback**: "If this feature fails, return null/empty and the UI renders without it" is a valid fallback. It introduces no new dependency, has no logic to maintain, and has a predictable behavior.

**Geographically isolated fallback**: If primary is in us-east-1 and fallback is in eu-west-1, they cannot fail together due to a regional event. The fallback is genuinely independent. The maintenance burden is real, but the isolation argument holds.

**Business-critical operations with genuine backup infrastructure**: For payment processing, the business might have a contractual backup payment processor. The integration must be maintained, tested regularly, and the cost is justified by the criticality.

**Security controls**: Failing open vs. failing closed is a security decision that shouldn't be made at runtime. Some security checks must be fail-closed (if the auth service is unavailable, block the request). This is a policy decision, not a fallback in the traditional sense.

### Static Stability vs. Dynamic Fallback

The distinction between static stability (Article 06) and dynamic fallback deserves emphasis because it clarifies when fallback is acceptable:

**Static stability**: The system operates using resources it already has — cached configuration, pre-loaded data, pre-provisioned capacity. No new network calls during the failure. The "fallback" is already in memory.

**Dynamic fallback**: When the primary fails, call a different service. This requires the different service to be available, to have an unchanged API, to have valid credentials, and to respond quickly. All of these can fail independently.

Static stability is robust because it has no additional network dependencies during a failure. Dynamic fallback is fragile because it introduces new network dependencies exactly when the system is already under stress.

## Deep Dive

The Builder's Library article "Avoiding fallback in distributed systems" by David Yanacek is one of the more intellectually honest pieces of reliability engineering documentation available because it explicitly describes patterns that Amazon built, deployed, and then concluded were mistakes. The central case study is a configuration fallback system: a service whose primary configuration source failed would fall back to a secondary configuration service. This sounds prudent. In practice, the fallback service was in the same region as the primary, shared the same network infrastructure, and was maintained by the same team. When a regional event took down the primary, the same event degraded the fallback. The team arrived at an incident with two failing configuration systems instead of one. Yanacek's conclusion — invest in making the primary reliable rather than building fallbacks that share failure modes — emerged from this specific experience, not from abstract reasoning.

The reliability investment argument in the article is worth examining quantitatively. If a primary service runs at 99.5% availability and you invest two engineer-weeks in a fallback system, the combined availability depends on whether the failures are independent. If the fallback has 99.0% availability and failures are perfectly independent, the combined system has 0.5% × 1.0% = 0.005% failure rate — significantly better than 0.5%. But if failures are correlated (same region, same infrastructure, same team) and the correlation coefficient is 0.8, the combined failure rate is approximately 0.5% × (0.8 × 0.5% + 0.2% × 1.0%) ≈ 0.4% — barely better than the primary alone. The same two engineer-weeks spent improving the primary from 99.5% to 99.9% reduces the failure rate by 5x without the correlation risk.

Nygard's *Release It!* approaches fallback avoidance from a different direction, through his analysis of the "integration point" failure mode. Nygard observes that integration points — places where one system calls another — are the most common source of stability failures, and that fallback code adds integration points rather than removing them. A primary service with a fallback to a secondary service is not one integration point but two, with the second one less tested, less monitored, and more likely to fail in unexpected ways. Nygard's stability patterns — circuit breaker, bulkhead, timeout — are all about making the primary integration point more resilient rather than adding secondary ones. His circuit breaker pattern, in particular, is an explicit argument against certain forms of fallback: when a dependency has been failing for long enough to trip the circuit breaker, retrying immediately (or falling back to an equally unreliable secondary) is less effective than failing fast and letting the caller degrade gracefully or try again later.

The SRE Book's treatment of error budgets connects to fallback avoidance through the allocation of engineering time. The book is explicit that error budget depletion should redirect engineering capacity toward reliability work on the primary path. Teams that have built complex fallback systems often find that the fallback maintenance work consumes the engineering time that could instead be spent improving primary reliability. The fallback becomes a form of technical debt that prevents investment in the primary path: it requires constant maintenance to keep current with API changes, credential rotations, and dependency updates, while consuming the same engineering hours that would reduce primary failure rates. The SRE Book's prescription — let error budget depletion trigger primary reliability investment — creates a forcing function that makes the opportunity cost of fallback maintenance visible.

The Netflix Hystrix experience illustrates the difference between a useful pattern and a pattern applied everywhere. Hystrix's `getFallback()` method was designed to handle the case where a service is genuinely unreachable and there exists a meaningful degraded response — show cached recommendations rather than nothing. Netflix's engineering retrospectives found that developers interpreted the presence of the getFallback() API as an expectation that every service call should have a fallback. The result: fallbacks written for services that didn't need them, returning stale data that was sometimes more confusing than an error, and making network calls inside the fallback that introduced new failure points. Netflix's eventual guidance — treat fallback as a last resort, not a standard pattern, and prefer static pre-computed content over dynamic secondary calls — is consistent with the Builder's Library's position and with Nygard's stability patterns. The convergence of three independent sources on the same conclusion is a signal that the underlying principle is sound.

## Implementation Guide

### Step 1: Audit Existing Fallback Code

Inventory your current fallback paths:

```python
# Where is fallback code in your codebase?
# grep -r "fallback\|backup_service\|secondary_endpoint\|on_error.*call" src/

# For each fallback found, answer:
# 1. When was this fallback last exercised in production?
# 2. When was this fallback last exercised in tests?
# 3. What service does it call, and has that service's API changed recently?
# 4. What are the credentials for the fallback service, and are they current?
# 5. Can the fallback service handle the full traffic load if the primary fails?
```

For each fallback, classify as:
- **Safe to keep**: Pre-computed static content, genuine omission fallbacks
- **Needs testing**: Live-service fallbacks that haven't been exercised recently
- **Candidate for removal**: Fallbacks whose primary service has high reliability and whose fallback adds maintenance burden without meaningful benefit

### Step 2: Replace Dynamic Fallbacks with Static Content

For each dynamic fallback (calls another live service), ask: can this be replaced with pre-computed static content?

```python
# Before: Dynamic fallback
def get_recommendations(user_id):
    try:
        return primary_recommendation_service.get(user_id)
    except ServiceError:
        return backup_recommendation_service.get(user_id)  # AVOID

# After: Static fallback
def get_recommendations(user_id):
    try:
        return primary_recommendation_service.get(user_id)
    except ServiceError:
        # Return pre-computed bestsellers, no network call
        return cache.get("static:bestsellers") or []  # PREFER
```

The static fallback has no new dependencies, no new failure modes, and is always exercised (the cache read path is tested with the rest of the code).

### Step 3: Replace Fallback with Omission Where Appropriate

For Tier 2/3 features (see Article 09), the fallback should often be to omit the feature entirely:

```go
// Before: fallback to secondary service
func (h *Handler) GetPageData(userID string) PageData {
    recs, err := h.primaryRecs.Get(userID)
    if err != nil {
        recs, _ = h.secondaryRecs.Get(userID)  // AVOID: untested code path
    }
    return PageData{Recommendations: recs}
}

// After: omission on failure
func (h *Handler) GetPageData(userID string) PageData {
    recs, err := h.primaryRecs.Get(userID)
    if err != nil {
        // PREFER: omit, no secondary call
        return PageData{Recommendations: nil}
    }
    return PageData{Recommendations: recs}
}
```

### Step 4: Invest in Primary Path Reliability

Time saved from removing fallback code should be reinvested in making the primary path more reliable:

- Add read replicas to reduce the blast radius of primary database failures
- Implement caching at the service level to reduce the impact of dependency slowdowns
- Improve health checks so load balancers route away from degraded instances faster
- Add circuit breakers to stop calling dependencies that are already failing
- Improve deployment processes to reduce deployment-related failures

A reliability investment roadmap:

```
Current state: Primary at 99.5%, fallback at 99.0% (both can fail)
→ Remove fallback, invest in primary
Target: Primary at 99.9%, no fallback
Better than: Primary at 99.5% + fallback at 99.0% (compound reliability)
```

### Step 5: Test Fallback Paths You Keep

For fallbacks you decide to retain (geographically isolated, business-critical), treat them as first-class code:

```python
# Schedule monthly chaos tests that activate the fallback:
def test_fallback_path_monthly():
    # Take down primary service (or block its traffic)
    primary_service.disable()
    
    # Verify fallback activates and serves correctly
    response = client.get("/api/recommendations")
    assert response.status_code == 200
    assert len(response.json()["recommendations"]) > 0
    
    # Verify fallback can handle production-level load
    with load_generator(requests_per_second=1000) as load:
        error_rate = load.run_for(60)
    assert error_rate < 0.01
    
    primary_service.enable()
```

Document the fallback test results. If the fallback fails these tests, fix it or remove it.

## When to Use / When NOT to Use

**Retain fallback code when:**
- The fallback is static pre-computed content (no live dependency)
- The fallback is geographically or infrastructure-isolated from the primary
- The fallback is regularly tested under production-level load
- The business risk of primary failure is high enough to justify maintenance cost

**Remove fallback code when:**
- The fallback calls a live service that shares infrastructure with the primary
- The fallback has not been tested in the past 6 months
- The primary path reliability (>99.9%) makes the fallback rarely useful
- The fallback adds complexity that makes the codebase harder to understand

**Never use fallback for:**
- Security and authorization checks (fail closed, not to a backup auth service)
- Financial operations without explicit business approval for backup processors
- Operations where eventual consistency could cause data corruption

## Common Mistakes

**Building fallbacks before improving the primary**: Fallback-first design treats reliability as a property of the system as a whole rather than the primary path. Invest in primary path reliability first.

**Untested fallbacks**: A fallback that's never exercised in production-like conditions is a hypothesis, not a guarantee. Test it or remove it.

**Fallbacks with shared failure modes**: A fallback to a service in the same region as the primary does not protect against regional failures. Understand the failure independence of your fallback.

**Circular fallbacks**: Service A falls back to B, B falls back to A. When both are degraded, they cascade failures to each other infinitely.

**Fallback code that's more complex than the primary**: If the fallback has 200 lines of logic vs. the primary's 50, the fallback is harder to maintain and more likely to be wrong. Simpler fallbacks are better.

**Not tracking fallback activation rate**: If you keep fallback code, measure how often it activates. A fallback that never activates is wasted code. A fallback that activates frequently means the primary needs improvement.

## Connections

**Graceful degradation (Article 09)**: Graceful degradation focuses on feature omission and static content fallbacks — the forms of fallback this article endorses. Dynamic service substitution is what this article argues against.

**Static stability (Article 06)**: Static stability is the preferred alternative to dynamic fallback configuration. Pre-load configuration at startup; don't fall back to a secondary configuration service.

**Chaos engineering (Article 08)**: Any fallback code you keep must be regularly chaos-tested. If chaos engineering reveals that the fallback doesn't work, you face a choice: fix it or remove it.

**Error budgets (Article 01)**: The decision to invest in primary path reliability vs. fallback maintenance should be informed by error budget consumption. If primary failures are consuming significant budget, invest in the primary. If they're rare, the investment case for fallbacks weakens.

**Correlated failures (Article 13)**: Dynamic fallbacks that share infrastructure with the primary are subject to correlated failures. The same event that degrades the primary often degrades the fallback.

## Key Insights

The central insight is that fallback code is a bet that the secondary path is more reliable than improving the primary path by the same investment. This bet is almost always wrong. The primary path is continuously exercised, continuously tested, and continuously improved. The fallback path is dormant, accumulating drift, tested rarely and under unrealistic conditions.

The AWS Builder's Library observation — that fallback code can make outages worse rather than better — should be taken seriously. The scenario is not exotic: primary fails → fallback activates → fallback fails (due to bit rot, credential expiry, API drift) → on-call engineer has to diagnose two systems simultaneously instead of one. This is a predictable failure mode of the fallback pattern.

The discipline required is honesty about what a fallback provides vs. what it costs. If you write fallback code, you have committed to maintaining it, testing it, and keeping it current with both the primary and the fallback service's APIs. If you're not willing to make that commitment, the fallback provides false comfort rather than real protection.

The alternative — investing in primary path reliability — is unglamorous but reliable. A primary service at 99.99% availability needs no fallback. Getting from 99.9% to 99.99% (10x fewer failures) through infrastructure hardening, better testing, caching, and circuit breakers is more valuable than building a fallback that adds complexity without proportional reliability gain.
