# SLOs, SLIs, and SLAs — Measuring Reliability

> "If you can't measure it, you can't improve it. If you can't define it, you can't measure it. Most reliability failures begin with the inability to define what reliable means." — Google SRE Book

## The Problem

Ask a room of engineers whether their service is reliable, and most will say yes. Ask them to prove it, and the conversation falls apart immediately. "We had an outage last month, but it was only 20 minutes." "Our latency is usually pretty good." "We're better than we were a year ago." These answers feel like progress — they contain real observations about real systems — but they are operationally useless. You cannot set a target you cannot measure. You cannot alert on a threshold you have not defined. You cannot have a rational conversation about reliability investment when "reliable" means different things to every person in the room.

The second problem is that the people making reliability decisions and the people experiencing reliability consequences are almost never the same people. Engineering leadership decides how much infrastructure to invest in. Product managers decide what to build next. On-call engineers experience the 3am incidents. Users experience the 500 errors and the slow page loads. Each group has a different and incomplete picture of reliability. The product manager sees the quarterly roadmap. The on-call engineer sees the incident dashboard. The user sees a broken checkout button. None of them see the same service.

The third problem is contractual ambiguity. When your service degrades, who is accountable? To whom? Under what conditions? What is the customer entitled to do when you fail? These questions should have written, legally reviewed answers before a customer signs a contract — but in practice they are often resolved through ad-hoc negotiations during outages, by customer success teams trying to prevent churn, in ways that are inconsistent, undocumented, and impossible to engineer for. If you do not define your reliability commitments precisely, your customers will define them for you, under the worst possible conditions.

## Core Concept

The SLI/SLO/SLA framework provides a three-layer model for reliability measurement and commitment. Each layer serves a distinct purpose, and understanding the distinctions between them is as important as understanding each individually.

### Service Level Indicators (SLIs)

An SLI is a quantitative measurement of some aspect of service behavior. It is a ratio: the number of good events divided by the total number of events, expressed as a percentage or proportion.

The canonical form of an SLI:

```
SLI = (count of good events) / (count of total events)
```

Every word in this definition matters:

**Count** — not average, not maximum, not minimum. A count that can be aggregated over a time window and compared to a target.

**Good events** — precisely defined. A "good" HTTP request is one that returns a non-5xx status code within 500ms. A "good" database query is one that returns a correct result within 100ms. The definition of "good" must be written down, unambiguous, and agreed upon before you start measuring.

**Total events** — the denominator also needs definition. Do you include health check requests? Requests from internal services? Requests that were rejected at the load balancer before reaching your code? Malformed requests that your API correctly rejected with 400? Excluding the wrong things from the denominator can make your SLI look much better than reality.

#### The Four SLI Categories

**Availability**: The proportion of valid requests served successfully. This is the most commonly used SLI and the easiest to measure. "Valid" and "successfully" both require definition.

```
Availability SLI = (requests returning HTTP 2xx or 3xx) / (all requests excluding health checks)
```

**Latency**: The proportion of requests completed within a threshold. This is almost always more meaningful than average or median latency, because the tail defines user experience for a significant fraction of your users.

```
Latency SLI = (requests completing in < 500ms) / (all requests)
```

Note that you often want multiple latency SLIs at different thresholds: p50, p95, p99, sometimes p99.9. Each reveals different things about your service behavior.

**Quality**: The proportion of responses that contain correct, useful data. This is significantly harder to measure than availability or latency but often more important for data-intensive services.

```
Quality SLI = (search results returning at least 5 relevant results) / (all search requests)
```

Quality SLIs often require domain-specific definitions and sampling-based validation rather than exhaustive checking.

**Freshness**: The proportion of data that was updated within a recency threshold. Critical for caches, data pipelines, and any service where staleness matters to users.

```
Freshness SLI = (records updated within past 60 minutes) / (all records in the dataset)
```

#### What Makes a Good SLI

A well-designed SLI has four properties:

**User-correlated**: It measures something users actually experience. CPU utilization, memory usage, queue depth — these are operational metrics that may correlate with user experience, but they are not SLIs. Users experience latency and errors. Measure those.

**Aggregable**: It can be meaningfully combined over a time window. "The service was available for the last 5 minutes" is not aggregable. "99.95% of requests in the last 28 days returned non-5xx responses" is aggregable and comparable to a target.

**Binary per event**: Each individual event is either good or bad. Not "mostly good" or "good enough." The binary classification is what enables the ratio calculation that makes SLIs tractable.

**Directly measurable**: The data is available from your existing observability infrastructure, or can be collected with reasonable instrumentation effort. An SLI that requires a 6-month engineering project to measure accurately is not actionable in the near term.

### Service Level Objectives (SLOs)

An SLO is a target value for an SLI over a specific time window. Where the SLI says "here is what we measure," the SLO says "here is what we aim for."

```
SLO: Availability SLI >= 99.9% over rolling 28-day window
SLO: Latency SLI (< 500ms) >= 95% over rolling 28-day window
SLO: Latency SLI (< 2000ms) >= 99.9% over rolling 28-day window
```

The SLO creates the error budget: the allowed quantity of bad events. A 99.9% availability SLO over 30 days (43,200 minutes) gives you a budget of 43.2 minutes of downtime. This is the single most important number in your reliability planning.

#### Setting SLOs: The Critical Decisions

**Start from measurement, not aspiration.** Look at your historical data for the past 90 days. What did you actually deliver? If you delivered 99.7% availability, do not set the SLO at 99.99% because it sounds better. Set it at 99.5% — below historical performance — to give yourself headroom before violations occur. You can tighten the SLO later as the system improves.

**Set the SLO below what your system can achieve.** Google explicitly recommends this. A 99.95% system should have a 99.9% SLO. The gap — 0.05% — is not wasted tolerance. It is the margin that allows engineering work to happen without triggering continuous budget alerts. If every week of normal operation comes close to budget exhaustion, the SLO is miscalibrated.

**Consider the consequence of SLO violation.** What happens when you miss your SLO? If the answer is "nothing" because there is no budget policy, the SLO is decorative. If the answer is "features freeze until reliability improves," the SLO must be set carefully enough to not trigger that freeze constantly. If the answer is "we owe customers service credits," the SLO has legal implications and must be set conservatively.

**Account for maintenance windows and planned downtime.** Your SLI measurement should either exclude planned maintenance windows or factor them into your SLO target. If you take 4 hours of planned downtime per month for patching, you cannot maintain a 99.99% availability SLO (which allows only 4.3 minutes of downtime per month).

**Use the right time window.** Rolling 28-day windows are standard. They smooth out weekly patterns, respond to month-scale trends, and align naturally with monthly capacity planning. Weekly windows are too noisy. Quarterly windows hide month-scale problems. Annual windows are appropriate for very tight SLOs (99.99% or higher) where a monthly window has too little total error budget to be meaningful.

#### Multi-Threshold SLOs

A single availability SLO misses important nuance. Consider this more complete picture:

```
Availability SLO:    >= 99.9% over 28 days
Fast latency SLO:    >= 95% of requests complete in < 200ms (interactive experience)
Normal latency SLO:  >= 99% of requests complete in < 2000ms (acceptable)
Timeout SLO:         >= 99.99% of requests complete in < 10000ms (not timing out)
```

Each threshold captures a different tier of user experience. The fast threshold defines the experience for users on good connections. The normal threshold defines acceptable experience under load. The timeout threshold defines the hard floor below which users abandon sessions.

### Service Level Agreements (SLAs)

An SLA is a business contract between a service provider and a customer that specifies the expected level of service and the consequences of failing to deliver it. SLAs are legal documents negotiated with customers, not internal engineering targets.

The critical distinction: SLOs are internal engineering targets. SLAs are external contractual commitments. The SLO should always be more stringent than the SLA.

If your internal SLO is 99.95% and your SLA commits to 99.9%, you have 0.05% of additional violations you can absorb before breaching your contract. That gap is your safety margin. If you set the SLA equal to your SLO, any SLO violation is a contractual breach.

SLAs typically include:

**Measurement methodology**: How downtime is calculated, what counts as an outage, who does the measuring. This is frequently a source of dispute. "Our monitoring says we were up; their monitoring says we were down" — this argument needs resolution before the SLA is signed.

**Exclusions**: Events that do not count against the SLA. Force majeure events, scheduled maintenance, customer-caused outages, third-party dependency failures.

**Service credits**: The remedy for SLA breach. Typically expressed as a percentage of the monthly bill, on a sliding scale: 10% credit for 99.5-99.9% availability, 25% for 99.0-99.5%, 50% below 99.0%.

**Escalation procedures**: How customers report SLA violations, the timeline for acknowledgment and resolution, the process for disputing the measurement.

**Termination rights**: Whether persistent SLA violations allow the customer to exit the contract without penalty.

## Deep Dive

### The SRE Workbook: From Theory to Alerting Implementation

The 2018 "The Site Reliability Workbook" (Beyer, Murphy, Rensin, Kawahara, Thorne) is the operational companion to the original SRE Book. Where the SRE Book describes the philosophy, the Workbook provides implementation guidance — including the most precise published treatment of alert design based on error budget burn rates.

The Workbook's chapter on alerting on SLOs introduces the multi-window burn rate model that has become the industry standard. The core insight: a single burn rate threshold produces either too many false positives (if set low, it fires on short transient spikes that do not threaten the budget) or too much alert latency (if set high, slow burns are not detected until significant budget has been consumed). The solution is to require two conditions simultaneously: a short window confirms the burn is happening right now, and a long window confirms it is not just a brief spike.

The Workbook provides the arithmetic to calculate appropriate thresholds. For a service with a 30-day SLO window: a burn rate of 14.4x in a 1-hour window will exhaust the entire monthly budget if sustained. Alerting at 5% budget consumption in 1 hour (burn rate ≥ 14.4x) catches fast burns within minutes. A separate alert at 2% budget consumption in 6 hours catches slow burns that would be invisible to the fast alert. Together, these two alerts provide high sensitivity with low false-positive rates — a direct, quantitative improvement over threshold-based alerting on individual metrics.

### The SRE Book's Error Budget Policy: Making the Abstraction Operational

The error budget concept only changes organizational behavior if the policy consequences are clearly defined and enforced. The SRE Book specifies that when a service exhausts its error budget, a concrete policy takes effect: feature releases pause and all engineering effort shifts to reliability improvement until the budget recovers. This policy must be agreed upon before the first budget exhaustion, not negotiated under pressure during an outage.

The book documents three categories of what triggers an error budget policy: a natural exhaustion (the service was genuinely unreliable), an incident-caused exhaustion (a major outage consumed significant budget), and a trend-based exhaustion (burn rate indicates budget will be exhausted before the window ends). Each requires a different response. Natural exhaustion over multiple windows indicates systematic underinvestment in reliability. A single-incident exhaustion may indicate a gap in a specific operational area. Trend-based triggers allow proactive intervention before the budget is actually spent.

The SRE Workbook also addresses the question of who sets SLO targets — a practical challenge the original book glosses over. The answer is that SLOs should be set by measuring what users actually need (user research, support tickets, conversion data) rather than what the system currently delivers. Setting an SLO at your current average performance creates no incentive to improve. Setting it at what users actually need creates the gap that drives engineering investment.

## Implementation Guide

### Step 1: Identify What to Measure

Before writing an SLI definition, identify the "critical user journeys" for your service — the 3-5 most important things users do with your service. For an e-commerce API: placing an order, searching products, viewing product details, checking out, tracking an order. For each critical user journey, define what "success" means for that journey from the user's perspective.

### Step 2: Write Precise SLI Definitions

For each critical user journey, write the SLI formula. Be specific about inclusions and exclusions:

```
SLI Name: Checkout Availability
Numerator: HTTP requests to POST /checkout returning 200-299 within 3000ms
Denominator: All HTTP requests to POST /checkout
Exclusions: Requests with invalid authentication tokens
           Requests during scheduled maintenance windows
           Requests failing input validation (400 errors)
Measurement point: Application load balancer access logs
```

Writing this level of specificity forces you to make decisions that would otherwise cause disputes later.

### Step 3: Collect Baseline Data

Deploy SLI measurement and collect data for 30-90 days before setting targets. You need to understand:

- What is your average SLI value over normal periods?
- What is your worst week? Worst month?
- What does SLI degradation look like before an incident becomes user-impacting?
- Are there seasonal patterns? (Higher error rates on Mondays, slower during peak hours?)

```yaml
# Prometheus recording rules for SLI measurement
- record: job:sli_availability:ratio_rate5m
  expr: |
    sum(rate(http_requests_total{status=~"[23][0-9][0-9]"}[5m]))
    /
    sum(rate(http_requests_total{status!~"[45]0[0-4]"}[5m]))

- record: job:sli_latency_300ms:ratio_rate5m
  expr: |
    sum(rate(http_request_duration_seconds_bucket{le="0.3"}[5m]))
    /
    sum(rate(http_request_duration_seconds_count[5m]))
```

### Step 4: Set Initial SLOs Conservatively

Take the 10th percentile of your baseline performance — the value you achieve 90% of the time under normal conditions — and set that as the initial SLO. This is conservative enough that you will rarely breach it under normal conditions, which gives you time to build the organizational muscle of budget tracking before you face the first genuine budget crisis.

### Step 5: Configure Burn Rate Alerts

Two-window burn rate alerting catches both fast burns and slow burns:

```yaml
groups:
  - name: slo_burn_rates
    rules:
      # Fast burn: exhausts monthly budget in < 2 hours
      - alert: SLOFastBurnCritical
        expr: |
          (
            job:sli_availability:ratio_rate1h < (1 - 0.999 * 14.4)
          ) and (
            job:sli_availability:ratio_rate5m < (1 - 0.999 * 14.4)
          )
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Fast burn: monthly error budget exhausted in < 2 hours"
      
      # Slow burn: exhausts monthly budget in < 5 days
      - alert: SLOSlowBurnWarning
        expr: |
          (
            job:sli_availability:ratio_rate6h < (1 - 0.999 * 6)
          ) and (
            job:sli_availability:ratio_rate30m < (1 - 0.999 * 6)
          )
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Slow burn: monthly error budget exhausted in < 5 days"
```

### Step 6: Build the Error Budget Dashboard

Every team responsible for an SLO needs a dashboard showing:

- Current SLI value (last 5 minutes, last 1 hour, last 24 hours)
- Error budget remaining as percentage and absolute time
- Budget burn rate (current vs. sustainable)
- Budget projection: days until exhaustion at current burn rate
- Historical SLI trend over the rolling 28-day window

Datadog, Grafana, New Relic, and Honeycomb all have native SLO dashboards that implement this pattern with minimal configuration.

### Step 7: Define the Budget Policy

Before you have a budget crisis, write the policy for what happens when the budget is depleted. Minimum required elements:

- At what burn rate do you page on-call? (typically 14.4x)
- At what burn rate do you create a ticket? (typically 3-6x)
- What triggers a feature freeze? (budget < 10%? < 5%?)
- What is allowed during a feature freeze? (security patches, rollbacks, bug fixes?)
- Who has authority to override the freeze? (and under what conditions?)
- How is the policy reviewed? (quarterly, annually)

Get this policy reviewed and acknowledged by both engineering and product leadership before it is triggered by an actual event.

## When to Use / When NOT to Use

**SLIs and SLOs are appropriate for:**
- Any user-facing service where you need to communicate reliability expectations to other teams
- Services with multiple development teams contributing — SLOs create shared objective criteria
- Services with SLA obligations to customers — internal SLOs must precede external SLAs
- Services where reliability investment decisions need justification — error budget data makes the case

**SLIs and SLOs are premature when:**
- The service is in active prototype or exploratory phase — reliability targets before architecture stability are noise
- You have no observability infrastructure — you cannot measure SLIs you cannot observe
- The success criteria for the service are genuinely unclear — SLI definition requires knowing what "good" means, which requires knowing what the service is supposed to do

**Common SLA traps:**
- Setting external SLA equal to internal SLO — no safety margin
- SLAs with ambiguous measurement methodology — who measures, from where, at what granularity?
- SLAs without exclusion clauses — every customer-caused incident becomes your liability
- SLAs with service credits but no enforcement mechanism — credits customers will not claim are not real commitments

## Common Mistakes

**Measuring the wrong thing**: Measuring server-side success rate when users experience client-side failures. A request that succeeds at the server but times out at the client — because the network dropped the response — shows as 100% available in server metrics and 0% available in user experience. Wherever possible, measure from as close to the user as you can get: synthetic probes, real user monitoring, or edge-level logging.

**Aspirational SLOs**: 99.999% because it sounds impressive. If your system delivers 99.8% today, an SLO of 99.999% will be in permanent violation. Violations that are never addressed erode trust in the entire measurement framework.

**Too many SLOs**: Fifteen SLOs for one service is fifteen separate dashboards, fifteen separate budget policies, fifteen separate burn rate alerts. Cognitive overload is the enemy of reliability management. Start with two or three, add more only when you have specific reasons.

**Conflating percentile metrics with SLI ratios**: "p99 latency is 300ms" is not an SLI. "99% of requests complete in < 300ms" is an SLI. They measure the same thing but the second form is directly usable as a budget. Do not confuse them.

**Ignoring the denominator**: An SLI of 99.99% availability sounds excellent. What if the denominator is only 100 requests because you excluded retries, internal traffic, and health checks? The denominator defines what you're actually committing to. Inspect it.

**Setting window lengths that don't match your budget policy**: A daily error budget sounds responsive but creates constant noise from normal daily variance. A rolling 28-day window is standard for good reasons — it has enough total budget to make the math meaningful and enough history to distinguish signal from noise.

**Not reviewing SLOs annually**: A service that grew 10x in a year has different reliability requirements and capabilities than it did a year ago. SLOs that were appropriate at one scale may be completely wrong at another.

## Connections

**Error Budgets (Volume 04, Article 01)**: The entire error budget framework presupposes a defined SLO. Without an SLO, there is no budget. The mathematics of error budget management — burn rates, budget windows, multi-window alerting — are all operations on the SLO value.

**Observability (Article 03 in this volume)**: SLIs require observability infrastructure to measure. Structured logs, metrics pipelines, and distributed traces are the raw material from which SLIs are computed.

**Incident Management (Article 09)**: SLO violations are a primary incident trigger. The incident management process determines how quickly violations are detected, escalated, and resolved, which directly determines error budget consumption.

**Capacity Planning (Article 10)**: SLOs constrain capacity planning decisions. If your latency SLO requires p99 < 500ms, your capacity planning must ensure that you have enough infrastructure to maintain that latency under peak load with appropriate headroom.

**Feature Flags (Article 05)**: Feature flag-based rollouts can be gated on SLI health. If the current availability SLI is degraded, a progressive rollout should pause automatically before consuming more budget.

## Key Insights

The most valuable property of the SLI/SLO framework is that it makes reliability a conversation with a shared vocabulary. Before SLOs, "is the service reliable?" had as many answers as there were people in the room. After SLOs, the question has an objective answer grounded in data. This does not eliminate disagreement — people will still debate whether the right SLO target was chosen — but it grounds the disagreement in facts rather than intuitions.

The SLA/SLO distinction is not bureaucratic hair-splitting. It reflects a real difference between what you commit to customers and what you hold yourselves to internally. The gap between them is your safety margin. Eliminate that gap and every operational hiccup becomes a customer crisis and a contractual dispute.

The hardest part of SLO implementation is not the measurement — modern observability tools make that tractable — it is getting organizational agreement on what "good enough" means. The SLO-setting process is fundamentally a negotiation between what is technically achievable, what users actually need, what the business can afford, and what engineering is willing to commit to. That negotiation is valuable in itself, independent of the resulting numbers.

The error budget is the SLO's most powerful operational implication. The moment you define a target, you define the space of acceptable failures. That space can be spent deliberately — on risky deployments, on chaos experiments, on aggressive feature launches — or it can be squandered on preventable incidents. The choice is now visible, and visible choices are better than invisible ones.
