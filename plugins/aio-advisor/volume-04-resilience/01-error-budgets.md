# Error Budgets & SLOs

> "Hope is not a strategy. Uptime is not a goal. Reliability is a feature you build and budget for." — Niall Murphy, Google SRE

## The Problem

For most of software engineering history, the relationship between development teams and operations teams has been defined by conflict. Developers want to ship features fast; operations wants systems to stay stable. Every deployment is a risk. Every change is a potential outage. The faster the development team moves, the more the operations team resists. This tension is structural, not personal, and it has no solution within the traditional framework because both sides are optimizing for legitimate but contradictory goals.

The second problem is measurement. When someone asks "how reliable is this service?", the answer is typically vague. "Pretty reliable." "We had an outage last month." "We're at five-nines." Five-nines sounds impressive until you realize 99.999% availability means 5.26 minutes of downtime per year — which sounds great unless your service is a payment processor and those 5 minutes all happened on Black Friday. Availability as a raw number obscures everything interesting: when the downtime happened, what user impact it caused, whether it was getting better or worse.

The third problem is that reliability has no budget. Teams treat it as a binary property — either you're up or you're down — rather than as a continuous resource that can be spent, saved, and planned around. This creates perverse incentives: if there's no cost to downtime beyond the immediate incident, there's no reason to invest in reliability until something catastrophic happens. By then, the investment is reactive, expensive, and driven by panic rather than engineering judgment.

## Core Concept

The error budget framework, developed by Google's Site Reliability Engineering organization and documented in the 2016 SRE Book, solves all three problems with a single elegant inversion: instead of asking "how much reliability do we need?", ask "how much unreliability can we afford?"

The math is simple. If your Service Level Objective (SLO) is 99.9% availability, then your error budget is 0.1% — the portion of time the service is allowed to be unavailable. Over a 30-day month with 43,200 minutes, that's 43.2 minutes of allowed downtime. This budget is real. It's finite. It can be spent, and it can run out.

The operational model flows directly from the budget:

**Budget available**: The service is running well. Reliability is ahead of target. Development teams have permission to ship aggressively. This is the correct time to take risks, run experiments, and deploy changes.

**Budget depleted**: The service has consumed its allowed unreliability. Development is frozen until the budget replenishes. The team's focus shifts entirely to reliability work: reducing error rates, improving monitoring, fixing the root causes of the incidents that consumed the budget.

This framework eliminates the structural tension between development and operations because both teams now optimize for the same resource. The operations team doesn't need to resist deployments as a matter of principle — they just enforce the budget policy. The development team doesn't resent the operations team for blocking releases — they understand that their own incidents consumed the budget that would have allowed shipping. The incentive alignment is automatic.

### Defining Service Level Indicators

Before you can set an SLO, you need to measure something worth measuring. A Service Level Indicator (SLI) is the quantitative measure of service behavior that the SLO is defined in terms of.

Good SLIs share several properties:

**They measure what users actually experience.** "CPU utilization below 80%" is not a good SLI. Users don't experience CPU utilization. They experience request latency and error rates. Measure those instead. "The proportion of HTTP requests that complete in under 300ms" is an SLI. "The proportion of requests that return a non-5xx status code" is an SLI.

**They are aggregable over time windows.** An SLI needs to support statements like "over the past 28 days, 99.7% of requests were successful." Point-in-time measurements don't work.

**They have clear good/bad definitions.** Every request either completed in under 300ms or it didn't. Every response either returned 2xx or it didn't. Ambiguity in the SLI definition creates disputes about whether incidents count against the budget.

Common SLI categories:

- **Availability**: Proportion of valid requests served successfully
- **Latency**: Proportion of requests faster than some threshold (often multiple thresholds: p50, p95, p99)
- **Quality**: Proportion of responses that contain correct data (harder to measure, but critical for data services)
- **Freshness**: Proportion of data updated within some time window (for batch systems and caches)
- **Throughput**: Proportion of time the service handles at least X requests per second

### Setting SLOs

The most common mistake in SLO setting is aspirational target-setting. Teams set 99.99% because it sounds good, not because they've analyzed what their users actually need or what their system actually achieves.

A better approach starts from measurement. What does your service actually deliver today? If you've been running at 99.7% availability for the past six months with no user complaints, your users probably don't need 99.9%. Starting at 99.5% or 99.7% gives you headroom, establishes a baseline, and creates room to improve.

The second approach starts from user needs. What level of reliability do your users actually require? This sounds obvious but is often skipped. A real-time trading platform has different requirements than an internal developer tool. An emergency response system has different requirements than a social media feed. Interview users. Look at churn data correlated with outages. Set the SLO at the level that actually matters to users, not at a round number that sounds professional.

Google recommends that SLOs be set slightly lower than what the system actually achieves. If the system runs at 99.95%, set the SLO at 99.9%. This creates a buffer that allows engineering work to happen without triggering budget alerts, and it acknowledges that perfect measurement is impossible.

The number of SLOs should be small. Three to five SLOs per service is usually right. More than that creates cognitive overload and budget management complexity. If you have ten SLOs, you'll spend more time managing SLO dashboards than improving reliability.

## Deep Dive

The error budget framework emerged from a specific intellectual problem that Google's SRE organization formalized in the mid-2000s and published in the 2016 SRE Book: the eternal tension between development velocity and operational stability had no resolution within the traditional organizational model because both sides were optimizing for legitimate but structurally incompatible goals. The SRE Book's contribution was to reframe the problem entirely. Rather than asking "how do we prevent development from breaking things?", it asked "how much unreliability is acceptable, and who gets to spend it?" That reframing converted a social conflict into an engineering resource allocation problem.

The budget mechanics described in the SRE Book are precise in ways that matter. The book distinguishes between error budget policy — the rules governing what happens when budget is depleted — and error budget itself, the quantitative measure. Teams that implement the measurement without the policy have instrumentation without consequence. The policy is what creates the incentive alignment. Without it, an error budget dashboard is just another dashboard that nobody acts on. The book's recommendation is that the policy be negotiated between product and SRE during planning cycles, not improvised during incidents. Agreements made under pressure tend to favor whoever is more panicked.

Multi-window burn rate alerting, developed and documented by the SRE Book's chapter on practical alerting, addresses a subtle mathematical problem with single-threshold approaches. If you alert when budget consumption in the past hour exceeds some threshold, you will generate false positives during brief spikes that don't actually threaten the monthly budget. If you alert when cumulative budget consumption crosses a percentage, you will miss slow-moving degradations that will exhaust the budget before anyone notices. The multi-window approach — alert on burn rate over 1 hour AND over 6 hours, at different severity levels — captures both fast burns and slow bleeds without conflating them.

The specific burn rate thresholds from the SRE Book derive from a single constraint: the alert should fire early enough to leave time for response, but not so early that it fires on noise. At a burn rate of 14.4x, a service consumes its entire monthly budget in 2 hours. Paging the on-call engineer at that rate gives roughly 2 hours to diagnose and mitigate before budget exhaustion. At 6x burn rate over 6 hours, budget exhaustion takes 5 days — not an emergency, but worth a ticket. These numbers are not arbitrary; they encode a specific theory of how quickly human response can occur and what level of degradation is tolerable during that response window.

The Builder's Library's treatment of load shedding connects directly to error budgets in a way that reveals the framework's deeper architecture. A service approaching its error budget limit is already in a degraded state relative to its SLO. The economically rational response is not to absorb more load and consume remaining budget faster, but to shed lower-priority requests to protect budget for higher-priority ones. This is budget-aware admission control: the admission decision depends not just on current capacity but on remaining error budget. A service with abundant budget can accept borderline requests; one near depletion should shed them. The SRE Book describes this as "using the error budget to make deployment decisions," but the same logic applies to real-time admission decisions.

Michael Nygard's *Release It!* approaches the same problem from a different angle. Nygard's concept of the "stability antipatterns" — cascades, integration points, chain reactions — is implicitly a theory of how error budget gets consumed. A cascade failure is not merely an outage; it's a rapid and uncontrolled budget consumption event that can exhaust months of budget in an afternoon. Nygard's prescriptions — bulkheads, circuit breakers, timeouts — are mechanisms for slowing the rate of budget consumption when things go wrong, keeping the burn rate manageable rather than catastrophic.

Martin Kleppmann's *Designing Data-Intensive Applications* contributes a crucial observation about SLI measurement: the aggregation level at which you measure determines what you can see. Measuring availability as "fraction of minutes with no errors" misses cases where errors are distributed such that each minute has some errors but no minute is entirely errored. Measuring as "fraction of requests that succeed" captures user experience more accurately. DDIA's chapter on reliability formalizes the distinction between hardware faults, software errors, and human errors — each of which contributes to error budget consumption through different mechanisms and requires different mitigations. Understanding which class of fault is consuming budget is necessary for knowing where to invest.

The SRE Book's discussion of toil — repetitive, manual, automatable operational work — connects to error budgets through time allocation. When error budget is depleted and a feature freeze is imposed, the redirected engineering time should not be spent on unrelated work. The book prescribes that SRE teams maintain a 50% ceiling on toil: at least half of engineering time goes to project work, including reliability improvements. The error budget mechanism is the forcing function that ensures reliability work happens before the next deployment cycle, rather than being perpetually deferred in favor of features.

One underappreciated aspect of the error budget framework is its treatment of planned downtime. Maintenance windows, database migrations, and controlled failovers all consume error budget. Teams that run maintenance windows without accounting for their budget cost systematically undercount their actual reliability cost. The SRE Book's recommendation is to include all sources of user-visible impact in SLI measurement — the source of the impact (intentional or not) is irrelevant to the user experiencing it. This disciplines teams to minimize maintenance windows just as they would minimize unplanned outages.

## Implementation Guide

### Step 1: Instrument Before You Set Targets

Before setting any SLOs, deploy measurement infrastructure. You need to be able to answer "what percentage of requests succeeded last week?" and "what was the 99th percentile latency yesterday?" without manual log analysis.

For web services, this typically means:
- Structured logging with request duration and status code on every request
- A time-series metrics system (Prometheus, DataDog, CloudWatch) that aggregates these logs
- A dashboard showing request success rate and latency percentiles over rolling windows

Run this instrumentation for 4-8 weeks before setting SLOs. You need historical data to make informed decisions.

### Step 2: Define SLIs Precisely

Write down the exact mathematical definition of each SLI. "Availability" is too vague. The correct form:

```
Availability SLI = (count of requests with HTTP status < 500) / (count of all requests)
```

Specify:
- What counts as a "good" event
- What counts as a "valid" request (you might exclude health checks, or only count authenticated requests)
- The time window for aggregation (rolling 28 days is common)
- The measurement point (at the load balancer, at the application, at a synthetic probe)

### Step 3: Set SLOs Conservatively

Start at the 25th percentile of your historical performance. If you've been running at 99.7-99.9% availability, set the SLO at 99.7%. You can always tighten it later. A loose SLO that gets tightened over time is healthier than a tight SLO that gets violated immediately.

For latency, use the 99th percentile as the SLI (proportion of requests faster than threshold), and set the threshold at roughly 2x your current p99. If your p99 is currently 150ms, set the threshold at 300ms. This gives you room to improve the tail without immediately violating the budget.

### Step 4: Build the Budget Dashboard

A minimal error budget dashboard shows:
- Current budget remaining (as a percentage and as absolute time)
- Budget burn rate over the past 1 hour, 6 hours, 24 hours
- Projected budget exhaustion date at current burn rate
- Historical budget consumption by week

Teams should review this dashboard in weekly reliability reviews, not just during incidents.

### Step 5: Write the Budget Policy

Before the first budget is consumed, write down the policy for what happens when it's depleted. The policy should specify:
- Who has authority to declare a feature freeze
- What types of changes are blocked vs. allowed (bug fixes? security patches? config changes?)
- What the criteria are for lifting the freeze
- How the team escalates if they disagree with the freeze decision

The policy needs to be agreed on by both the development team lead and the platform/SRE team lead. Getting this agreement before an incident prevents the policy from being litigated under pressure during one.

### Step 6: Multi-Window Alerting

Implement alerts at multiple burn rates:

```yaml
# Fast burn: will exhaust monthly budget in < 2 hours
alert: ErrorBudgetFastBurn
condition: burn_rate_1h > 14.4
severity: critical
action: page on-call

# Slow burn: will exhaust monthly budget in < 5 days  
alert: ErrorBudgetSlowBurn
condition: burn_rate_6h > 6
severity: warning
action: create ticket

# Background: will exhaust monthly budget before month ends
alert: ErrorBudgetBackgroundBurn
condition: burn_rate_3d > 2
severity: info
action: dashboard indicator
```

## When to Use / When NOT to Use

**Use error budgets when:**
- You have multiple teams sharing responsibility for a service (product + platform, frontend + backend)
- You're trying to accelerate deployment velocity without sacrificing reliability
- You have recurring conflicts between "move fast" and "stay stable" pressures
- You have well-defined user-facing services with clear success/failure semantics

**Do not use error budgets when:**
- You have no monitoring infrastructure. You cannot manage a budget you cannot measure.
- Your service is so new that you have no historical data to set baselines from
- Your service has inherently ambiguous success criteria (what is a "successful" recommendation?)
- Your organization lacks the authority structure to enforce budget policies (if feature freezes can always be overridden by executives, the policy has no teeth)

**Be cautious when:**
- The service is safety-critical (medical, financial, infrastructure). SLOs are useful here but the consequences of budget depletion need careful thought.
- Multiple teams contribute to a shared error budget but have different deployment cadences. The team that deploys rarely can consume a disproportionate share of the budget in a single incident.

## Common Mistakes

**Vanity SLOs**: Setting 99.999% because it sounds impressive, not because users need it or the system can achieve it. Vanity SLOs create budget crises on day one and erode trust in the entire framework when they're immediately violated.

**Too many SLOs**: If you define fifteen SLOs for one service, you'll spend more time in budget review meetings than building features. Pick the three to five dimensions that actually matter to users and ignore the rest.

**SLOs that don't reflect user experience**: Measuring server-side success rate when users experience client-side failures. A request that times out at the client after 30 seconds and is then "successfully retried" by the server shows as 100% successful in server metrics but as a 30-second stall in user experience. Measure what users experience.

**Ignoring budget in sprint planning**: Error budget management only works if the budget state influences engineering priorities. Teams that set SLOs but never change behavior based on budget consumption are doing performance theater.

**Not maintaining SLOs as the system evolves**: An SLO set eighteen months ago may be irrelevant to the current system architecture or user population. SLOs need annual review and adjustment.

**Using SLOs to punish teams**: Error budgets are a coordination mechanism, not a performance management tool. Using budget depletion events as evidence in performance reviews destroys the psychological safety necessary for honest incident reporting.

**Setting the error budget window too short**: Daily error budgets are too sensitive — a single bad hour can trigger a freeze. Monthly windows are standard. Quarterly windows are appropriate for very small budgets (99.99%).

## Connections

Error budgets connect directly to several other reliability patterns:

**Load shedding (Article 04)**: When budget burn rate is high, the correct response is often to shed load to protect the remaining budget, rather than allowing the overload to continue consuming it.

**Chaos engineering (Article 08)**: Planned chaos experiments deliberately consume error budget. Teams must schedule chaos experiments during periods of high budget availability.

**Safe deployments (Article 14)**: Deployment pipelines can be gated on error budget state. A deployment that would be approved at 50% budget remaining might be blocked at 10% remaining.

**Graceful degradation (Article 09)**: Features can be prioritized by their SLO contribution. Features that directly contribute to the availability SLI should degrade last.

**Correlated failures (Article 13)**: A single correlated failure event (like an AZ outage) can consume a disproportionate share of the monthly budget. Budget policies need to account for the possibility of large single-event consumption.

## Key Insights

Error budgets work because they convert an abstract engineering goal (reliability) into a concrete resource with scarcity. Scarcity forces tradeoffs, and explicit tradeoffs are always better than implicit ones.

The most important property of the error budget framework is that it makes the cost of unreliability visible to the people making deployment decisions. Before error budgets, a developer shipping a risky feature bore no direct cost when it caused an outage. After error budgets, that outage consumes shared budget that limits everyone's ability to ship. The incentives align automatically.

The hardest part of implementing error budgets is not the measurement — it's writing and enforcing the budget policy. The policy only has value if it actually stops feature releases when the budget is depleted. An organization that treats the policy as advisory rather than mandatory will never get the coordination benefits.

Start simpler than you think you need to. One SLO per service is enough to begin. Measure it for a quarter. Let the team build intuition for what budget depletion feels like. Expand from there. The goal is a cultural shift in how teams think about reliability, not a perfectly designed metrics system.

The enduring insight from Google SRE is that 100% reliability is not a reasonable goal for any system composed of unreliable components. Embracing that reality — building it into the planning process, budgeting for it explicitly — is more honest and more effective than pretending it isn't true.
