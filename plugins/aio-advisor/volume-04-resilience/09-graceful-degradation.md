# Graceful Degradation

> "A system that fails completely under partial failure is not more reliable — it is less honest. Graceful degradation is the system's way of telling the truth about what it can and cannot do." — from Netflix Engineering Blog

## The Problem

Software systems are collections of features layered on top of each other. A modern e-commerce page might include personalized product recommendations, real-time inventory counts, dynamic pricing, user-specific promotions, recently viewed items, and social proof indicators — all composited around a core browse and purchase experience. Each of these features depends on a different service: the recommendation engine, the inventory service, the pricing engine, the promotions system, the user history service, the review aggregation service.

When all dependencies are healthy, the composite experience is complete. But dependencies fail individually, unpredictably, and at inconvenient times. If the response to any single dependency failure is to return an error for the entire page, the user experience is a binary choice: perfect or broken. This binary model is both fragile and dishonest about how resilient the system actually is.

The deeper problem is that not all features have equal importance. A user who cannot see personalized recommendations is inconvenienced. A user who cannot add items to their cart or complete checkout is blocked. These are qualitatively different failures, and a system that treats them identically — failing completely when the recommendation service is down — is poorly designed regardless of the technical sophistication of its individual components.

The third problem is operational: when teams treat all features as equally critical, every dependency failure becomes a high-priority incident regardless of user impact. This creates alert fatigue, encourages heroes-and-firefighting culture, and burns out on-call engineers who are paged for recommendation service slowdowns at 3am. A system with explicit feature importance hierarchies can automate degradation of non-critical features without human intervention, reserving human attention for failures that actually block users.

## Core Concept

Graceful degradation is the design principle that systems should reduce functionality progressively when components fail, rather than failing completely when any component fails. The goal is to maintain the most important functionality even when some dependencies are unavailable, at the cost of reduced completeness or quality.

Three distinct mechanisms implement graceful degradation:

**Feature disabling**: When a non-critical feature's dependency fails, disable the feature entirely and serve the page without it. The recommendation widget is simply absent when the recommendation service is unavailable. Users don't see an error; they see a page without recommendations.

**Fallback content**: When a feature's primary data source fails, serve substitute content from a secondary source. Show cached recommendations from the previous day instead of real-time ones. Show generic promotions instead of user-specific ones. Show "check availability in store" instead of real-time inventory counts.

**Read-only mode**: When write operations are unavailable but reads work, serve the read-only experience rather than returning errors. Users can browse, search, and view product details even when the checkout service is degraded. This is particularly useful during planned maintenance or database failover.

### Feature Importance Hierarchy

Graceful degradation requires explicit decisions about feature importance. These decisions cannot be made in the moment of an incident — they must be pre-decided and implemented before the failure occurs.

A common framework: rank features by their relationship to the core user value proposition.

**Tier 0 — Core**: Without this, the product has no value. For an e-commerce site: browse catalog, view product details, add to cart, checkout, payment. For a messaging app: send and receive messages. These features should not degrade gracefully — they should be made as reliable as possible because their failure represents product failure.

**Tier 1 — Important**: These features significantly improve the experience but the product is still usable without them. Real-time inventory counts, user-specific pricing, order history. When Tier 1 features fail, show degraded versions (cached data, estimated availability) with clear indication of potential staleness.

**Tier 2 — Enhancement**: These improve engagement but their absence is not noticed by most users. Personalized recommendations, social proof ("other people bought"), suggested related items. When Tier 2 features fail, simply omit them from the page.

**Tier 3 — Analytics and Instrumentation**: Click tracking, A/B experiment exposure logging, behavioral analytics. When these fail, continue serving the experience without capturing the data. Users are unaffected; you lose some data.

### Static Fallbacks

The most reliable fallback is content that requires no real-time computation — static content cached before the failure occurred. When a dynamic service fails:

- Serve yesterday's personalized recommendations (cached from last successful computation)
- Serve the bestseller list (computed hourly, cached, available regardless of recommendation service health)
- Serve the most recently cached version of a user's cart
- Serve a static "service temporarily unavailable" message for the specific feature, not the entire page

Static fallbacks must be pre-computed and pre-cached before they're needed. A fallback that requires calling another service to generate degrades into a dependency on that service, often with worse failure behavior than the original dependency.

## Deep Dive

Nygard's *Release It!* introduces the concept of graceful degradation through the lens of stability patterns, and the framing is precise: a system that fails completely when any dependency fails is not more reliable than a system that fails partially — it is less honest about its actual reliability profile. The composite page problem, which Nygard identifies as one of the most common sources of unnecessary total failures, arises when a page assembled from N services is modeled as having only two states: all N services healthy (page renders) or any service unhealthy (page fails). The honest model has 2^N states, most of which correspond to a page that is partially degraded but still functional. Designing for the honest model rather than the convenient binary is what graceful degradation means in practice.

The SRE Book's treatment of feature prioritization provides the organizational scaffolding that makes graceful degradation operational. The book observes that implicit priority hierarchies — where everyone assumes certain features are more important than others without ever writing it down — fail during incidents because assumptions diverge under pressure. The SRE team may believe the recommendation engine is Tier 2 (degradable), while the product team believes it is Tier 1 (critical). This disagreement, unresolved in advance, becomes a conflict during an outage. The SRE Book recommends explicitly documenting feature tiers in service runbooks and making degradation decisions during architecture review rather than incident response. The decision of what to degrade is too important and too subtle to make correctly under time pressure.

The Hystrix library's design reflects a specific set of lessons from Netflix's experience with microservice dependencies. The library's core abstraction — the HystrixCommand, which wraps every remote call and provides a getFallback() method — was designed to make the failure handling visible in the code rather than implicit in error handling scattered across the codebase. Netflix's engineering blog documented the reasoning: when a remote call fails silently (the exception is caught, nothing happens), the failure is invisible. When it fails through a Hystrix command with a fallback, the fallback behavior is explicit, tested, and observable. The architectural insight embedded in Hystrix is that fallback paths should be treated as first-class code, not afterthoughts.

The SRE Book's discussion of "optional results" in the context of search infrastructure formalizes a design pattern that is broadly applicable beyond search. The pattern: assign each result type a latency budget — a maximum time it is allowed to take before being omitted from the response. If the result type completes within budget, include it. If not, omit it and return whatever has completed. This is not timeout handling in the traditional sense; it is a design decision that the response is better when delivered promptly with some results omitted than when delivered late with all results present. The latency budget converts latency into a quality dimension: you trade result completeness for response time, and you do so according to a pre-decided policy rather than an ad hoc decision made at request time.

Kleppmann's *Designing Data-Intensive Applications* addresses graceful degradation through its analysis of availability and consistency tradeoffs. DDIA's discussion of read-your-writes consistency versus eventual consistency maps directly onto the Tier 1 vs. Tier 2 feature classification: operations where users expect their own writes to be immediately visible (reading a message you just sent) require strong consistency guarantees and should not be gracefully degraded to eventual reads. Operations where slight staleness is acceptable (seeing how many people liked a post) can use eventually consistent replicas that remain available even when the primary is unavailable. DDIA's framework makes explicit the consistency requirements that determine which degradation modes are acceptable for each feature tier.

The fail-open versus fail-closed decision documented in the Builder's Library is one of the most consequential design choices in graceful degradation, and it is rarely made explicitly. Fail-open means: when the authorization or validation service is unavailable, proceed as if the check passed. Fail-closed means: block the operation. The correct choice depends on the relative cost of false positives versus false negatives under service unavailability. For fraud detection, fail-open may occasionally allow fraudulent transactions but ensures legitimate customers are never blocked by a fraud service outage. For access control to sensitive data, fail-closed is almost always correct — better to temporarily block access than to expose data during an auth service outage. The Builder's Library's argument is not that either choice is always right, but that the choice must be made explicitly and documented, because the default behavior of most frameworks under dependency failure is neither consistently open nor consistently closed.

## Implementation Guide

### Step 1: Map Feature Dependencies

For each user-facing feature in your system, list its dependencies and classify the feature's tier:

```yaml
features:
  checkout:
    tier: 0  # Core — never degrade
    dependencies:
      - payment-service: required
      - inventory-service: required
      - cart-service: required
  
  product-recommendations:
    tier: 2  # Enhancement — omit on failure
    dependencies:
      - recommendation-engine: fallback_to_cache
    fallback: show_bestsellers
  
  real-time-inventory:
    tier: 1  # Important — degrade to cached
    dependencies:
      - inventory-service: fallback_to_cache
    fallback: show_estimated_availability
    fallback_message: "Availability may vary"
  
  click-tracking:
    tier: 3  # Analytics — fail silently
    dependencies:
      - analytics-service: fail_open
```

### Step 2: Implement Circuit Breakers with Fallbacks

Wrap each non-core dependency call with a circuit breaker that executes a fallback:

```go
type RecommendationService struct {
    client  *http.Client
    cache   *Cache
    breaker *CircuitBreaker
}

func (rs *RecommendationService) GetRecommendations(userID string) ([]Product, error) {
    result, err := rs.breaker.Execute(func() (interface{}, error) {
        return rs.client.FetchRecommendations(userID)
    })
    
    if err != nil {
        // Fallback: return cached recommendations
        cached, cacheErr := rs.cache.GetRecommendations(userID)
        if cacheErr == nil {
            return cached, nil
        }
        // Second fallback: return bestsellers (always available)
        return rs.cache.GetBestsellers(), nil
    }
    
    return result.([]Product), nil
}
```

For Tier 2/3 features, the fallback can simply return nil/empty and the template renders nothing:

```go
func (rs *RecommendationService) GetRecommendations(userID string) []Product {
    result, err := rs.breaker.Execute(func() (interface{}, error) {
        return rs.client.FetchRecommendations(userID)
    })
    if err != nil {
        return nil // Tier 2: omit the widget entirely
    }
    return result.([]Product)
}
```

### Step 3: Design Templates for Absent Features

Your UI templates must handle absent feature data gracefully. A template that fails to render when recommendation data is nil creates a hard dependency on a soft feature:

```html
<!-- BAD: Will error if recommendations is nil -->
<div class="recommendations">
  {{range .Recommendations}}
  <product-card>{{.Name}}</product-card>
  {{end}}
</div>

<!-- GOOD: Conditional rendering, omits section if no data -->
{{if .Recommendations}}
<div class="recommendations">
  {{range .Recommendations}}
  <product-card>{{.Name}}</product-card>
  {{end}}
</div>
{{end}}
```

For fallback content, use distinct visual treatment to indicate degraded quality:

```html
{{if .RecommendationsFromCache}}
<div class="recommendations recommendations--cached">
  <span class="label">Recommendations may not reflect recent activity</span>
  {{range .RecommendationsFromCache}}
  <product-card>{{.Name}}</product-card>
  {{end}}
</div>
{{end}}
```

### Step 4: Pre-Warm Static Fallbacks

Static fallback content must be computed before it's needed:

```go
// Run every hour, independent of request traffic
func (j *FallbackRefreshJob) Run() {
    // Compute and cache bestseller list
    bestsellers, err := j.catalogService.GetBestsellers(100)
    if err != nil {
        log.Errorf("failed to refresh bestsellers fallback: %v", err)
        return // Keep previous cache
    }
    j.cache.Set("fallback:bestsellers", bestsellers, 25*time.Hour)
    
    // Compute and cache trending content
    trending, err := j.analyticsService.GetTrending(50)
    if err != nil {
        log.Errorf("failed to refresh trending fallback: %v", err)
        return
    }
    j.cache.Set("fallback:trending", trending, 25*time.Hour)
}
```

Cache TTL should exceed the refresh interval with margin (25 hours for a hourly job) to ensure the fallback is always available even if a few refresh cycles fail.

### Step 5: Implement Feature Flags for Emergency Degradation

Beyond automatic fallbacks, implement manual feature flags that allow operators to disable features immediately during incidents:

```go
func (h *HomePageHandler) Handle(w http.ResponseWriter, r *http.Request) {
    page := &HomePage{
        Products: h.getProducts(),
    }
    
    if !h.flags.IsDisabled("recommendations") {
        page.Recommendations = h.recommendations.Get(userID)
    }
    
    if !h.flags.IsDisabled("real-time-inventory") {
        page.InventoryStatus = h.inventory.Get(productIDs)
    }
    
    render(w, page)
}
```

Feature flags for degradation should be:
- Changeable without deployment (via a config service or feature flag system)
- Documented with their expected user impact
- Reviewed quarterly to remove stale flags

### Step 6: Monitor Degradation Events

Track how often each feature degrades as a metric:

```
feature_degradation_total{feature="recommendations", reason="circuit_open"} 1234
feature_degradation_total{feature="recommendations", reason="timeout"} 56
feature_degradation_total{feature="inventory", reason="cache_hit"} 789
```

Alert on unexpected degradation rates. A sustained increase in recommendation degradation events predicts an upcoming recommendation service outage and is worth investigating proactively.

## When to Use / When NOT to Use

**Graceful degradation is essential for:**
- Composite pages or responses that aggregate data from multiple services
- Any service with clear core vs. enhancement feature boundaries
- User-facing services where complete failure is unacceptable
- Services that depend on third-party APIs (which have their own independent failure modes)

**Graceful degradation adds unnecessary complexity when:**
- The service has a single well-defined function with no optional components (a pure data store, a payment processor)
- All dependencies are equally critical and there is no meaningful fallback
- The service is internal and consumers can handle failures directly

**Critical distinction**: Graceful degradation for user experience vs. graceful degradation for data correctness are different problems. Never degrade financial transactions, inventory writes, or other operations where correctness is critical. Degrade presentation and analytics; preserve data integrity.

## Common Mistakes

**Degrading core features**: Graceful degradation is for enhancement-tier features. The checkout flow, authentication, and core data operations must be made reliable — they should not be designed with fallbacks that accept lower correctness.

**Fallbacks that are also fragile**: A fallback that calls another service creates a chain of dependencies. If the fallback itself fails, you have no fallback for the fallback. Static pre-computed content is the most reliable fallback.

**Not testing fallback paths**: Fallback code is rarely exercised in testing because dependencies usually work. Write explicit tests for fallback behavior. Periodically chaos-test by disabling specific services and verifying fallbacks activate correctly.

**Silent degradation without monitoring**: If features degrade silently and you don't measure it, you may not know the recommendation service has been down for a week. Track degradation as a metric and alert on sustained degradation.

**Inconsistent degradation across pages**: If some pages have fallbacks for recommendation failure and others don't, the user experience is inconsistent. Standardize the fallback policy across all pages that include the same feature.

**Stale fallback content that's embarrassing**: Fallback content that's months old (showing last year's bestsellers, or product-specific recommendations for products that have been discontinued) may be worse than no content. Set appropriate TTLs on fallback caches and test the staleness experience.

## Connections

**Load shedding (Article 04)**: Load shedding decides which requests to serve; graceful degradation decides what to include in the requests that are served. They're complementary: shed non-critical background traffic while serving core user requests with graceful degradation of optional features.

**Fallback avoidance (Article 12)**: This article argues for avoiding fallback code in many cases, focusing instead on making primary paths reliable. The tension is real: fallback code adds complexity and is rarely tested. The resolution: use fallbacks only for well-tested, static, pre-computed content — not for dynamic fallback logic that calls other services.

**Static stability (Article 06)**: Static stability uses pre-cached configuration to remain stable when the control plane fails. Graceful degradation uses pre-cached content to remain useful when feature dependencies fail. Both patterns rely on pre-computation and caching.

**Feature flags and safe deployments (Article 14)**: Feature flags that decouple deployment from feature activation also enable emergency degradation: disable a feature flag to immediately degrade a failing feature across all users, without a redeployment.

**Error budgets (Article 01)**: Feature degradation events should count differently in error budgets than complete failures. A degraded recommendation widget is less severe than a checkout failure. Consider multi-tier error budgets that track degradation events separately from blocking failures.

## Key Insights

The core insight of graceful degradation is that composite systems have composite failure modes. A page with ten features and ten independent dependencies doesn't have two states (up and down) — it has eleven states (fully functional, and ten variations with one feature missing). Designing for all eleven states rather than just two produces a dramatically better user experience.

The feature importance hierarchy is the design decision that everything else flows from. Without explicit tier assignments, all features are implicitly equally critical — and when anything fails, everything fails. Explicit tiers create the space for automatic degradation and allow engineering teams to size their reliability investments proportionally to user impact.

Netflix's Hystrix contribution was architectural clarity as much as technology: wrapping each external call in a circuit breaker with an explicit fallback method makes the degradation behavior visible and testable. The fallback method is documentation of what happens when the dependency fails — concrete and verifiable rather than assumed and unknown.

The discipline required is pre-computation of fallbacks. A fallback that itself requires a network call to generate is not a reliable fallback — it's a new dependency on a different service. The most resilient fallbacks are static: pre-computed, cached locally, and served from memory. This requires investing engineering time in fallback content generation before failures occur, which is a form of reliability investment that's easy to defer and hard to prioritize without explicit architectural commitment.
