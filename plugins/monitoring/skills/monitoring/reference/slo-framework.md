# SLI/SLO/SLA & Error Budgets

## The Hierarchy

**Service Level Indicators (SLIs)** are carefully chosen metrics quantifying user experience.

Canonical formula: `SLI = (Good events / Total events) × 100%`

**Service Level Objectives (SLOs)** are target values for SLIs—internal commitments defining "reliable enough."

**Service Level Agreements (SLAs)** are external contracts with consequences.

**Test:** If there's no explicit consequence for missing it, it's an SLO, not an SLA.

## Choosing Meaningful SLIs

**Principle:** Measure what users care about, not what's easy to measure.

CPU utilization makes a poor SLI because users don't see your CPUs—they see slow responses or errors.

Good SLIs:
- Have **predictable relationship with user happiness**
- Are **measured close to the user** (client-side > server logs)
- Are **expressed as percentiles, not averages** (a service with 90% of requests at 50ms but 10% at 10s has a "good" average but unhappy users)

### SLI Patterns by System Type

| System Type | Typical SLIs |
|-------------|--------------|
| User-facing services | Availability, latency percentiles (p50, p95, p99), response quality |
| Storage systems | Availability, durability, latency |
| Data pipelines | Freshness, correctness, coverage, throughput |

## Error Budgets

`Error Budget = 100% - SLO`

With 99.9% SLO: 0.1% error budget = **43 minutes of allowed downtime per month**.

### Philosophy Shift

| Traditional | Error Budget Thinking |
|-------------|----------------------|
| 100% uptime is the goal | 100% is explicitly wrong |
| All outages are bad | Some unreliability is expected |
| Ops says "no" to risky deploys | Data says whether you have budget |
| Reliability vs velocity is conflict | Reliability is currency to invest |

**Why 100% is wrong:**
- **Impossible**: Redundant components still have non-zero simultaneous failure probability
- **Imperceptible**: Users on 99% reliable smartphones can't distinguish 99.99% from 99.999%
- **Prevents improvement**: You can never update a 100%-reliable service

### The Self-Regulating Loop

When budget remains → Ship features, take risks
When budget depletes → Freeze releases, focus on stability

This transforms reliability from political battle into data-driven process.

## The Nines and Their Cost

| Availability | Annual Downtime | Monthly Downtime | Order of Magnitude |
|--------------|-----------------|------------------|--------------------|
| 99% (two nines) | 3.65 days | 7.31 hours | Baseline |
| 99.9% (three nines) | 8.76 hours | 43.8 minutes | 10× harder |
| 99.99% (four nines) | 52.56 minutes | 4.38 minutes | 100× harder |
| 99.999% (five nines) | 5.26 minutes | 25.9 seconds | 1000× harder |

**Diminishing returns:** Each additional nine requires reducing remaining failures by 90%. The cost curve isn't linear—incremental improvement may cost 100× more than the previous.

If your users' ISPs have 0.01-1% background error rates, exceeding their reliability delivers no perceptible benefit.

## Setting SLOs

### Step 1: Choose SLIs
Pick metrics that reflect user experience:
- Availability: `successful requests / total requests`
- Latency: `requests < threshold / total requests`
- Quality: `valid responses / total responses`

### Step 2: Analyze Current Performance
Look at historical data to understand baseline.

### Step 3: Set Realistic Targets
- Higher than current performance = improvement required
- Lower than 100% = room for innovation
- Consider downstream dependencies (you can't be more reliable than your dependencies)

### Step 4: Calculate Error Budget
`Budget = (1 - SLO) × time_window`

### Step 5: Define Budget Policies
What happens when budget is exhausted:
- Release freeze
- Mandatory reliability work
- Escalation procedures

## Common Mistakes

- Setting SLOs based on what you can achieve rather than what users need
- Using averages instead of percentiles
- Not separating success latency from error latency
- Measuring at wrong point (server-side when client-side matters)
- No consequences for missing SLO (makes it meaningless)
- SLO too high (no room for error budget)
- SLO not aligned with business objectives
