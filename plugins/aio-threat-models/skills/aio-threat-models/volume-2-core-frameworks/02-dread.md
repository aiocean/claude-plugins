# DREAD (Deprecated)

> "Don't use DREAD. Use CVSS, bug bars, or PASTA risk analysis instead."
> — Current community consensus

## Core Concept

A **risk scoring framework** designed to prioritize threats identified by STRIDE. DREAD assigns 1–10 scores on five dimensions; the sum (5–50) is the risk rating. **Microsoft deprecated DREAD** due to subjectivity and inconsistency. It is included here for historical context and to understand why its successors (CVSS, bug bars) exist.

## Origin

Microsoft, publicly documented in **David LeBlanc & Michael Howard, *Writing Secure Code*, 2nd ed. (Microsoft Press, 2002)**. Used alongside STRIDE in early SDL. Internal origin predates the book.

## The Five Components

| Component | Measures | Scale |
|---|---|---|
| **D**amage | Severity of impact if exploited | 1–10 |
| **R**eproducibility | How easily the attack can be repeated | 1–10 |
| **E**xploitability | Effort required (lower effort = higher score) | 1–10 |
| **A**ffected users | Number of users impacted | 1–10 |
| **D**iscoverability | How easily attackers find the vulnerability | 1–10 |

**Final score = sum of 5 components**, range 5–50.

## Why Microsoft Deprecated DREAD

Documented by multiple Microsoft SDL practitioners; Wikipedia confirms: *"Microsoft stopped using DREAD due to inconsistency and subjectivity."*

### Three core problems

1. **Subjectivity** — two analysts score the same threat very differently. "Damage: 7" to one person is "Damage: 4" to another. No anchor to objective data.

2. **Discoverability incentivizes security-through-obscurity** — if an organization keeps a vulnerability secret, Discoverability drops, total score drops, threat appears lower-priority. This contradicts responsible disclosure norms. Some teams adopted **DREAD-D** (DREAD minus Discoverability) to patch this.

3. **Not calibrated to real-world data** — DREAD scores are opinions expressed as numbers, not evidence-based measurements.

## What Replaced DREAD

- **Bug bars** (Microsoft current practice) — categorical severity: Critical / Important / Moderate / Low, aligned with Security Response Center criteria
- **CVSS (Common Vulnerability Scoring System)** — industry-standard scoring for **vulnerabilities**, though not a pure threat scoring framework
- **PASTA Stage 7 (Risk & Impact Analysis)** — structured business-impact-based prioritization
- **FAIR (Factor Analysis of Information Risk)** — quantitative risk framework from the Open Group

## When (Not) to Use DREAD

- **Don't** — for new threat modeling exercises. Use CVSS or bug bars instead.
- **Historical audit** — only if reviewing legacy threat models from pre-2010 SDL era.
- **Educational example** — demonstrating why subjectivity in scoring is harmful.

## Limitations

Beyond the three reasons above:
- **Linear summation** treats dimensions as equally important (they aren't)
- **No business context** — same technical score can have wildly different business impact
- **No threat-agent modeling** — ignores adversary capability and motivation

## Relation to Other Frameworks

- **STRIDE** — DREAD was the original companion scoring; now orphaned
- **CVSS** — current de-facto standard for vulnerability scoring; does not score threats
- **PASTA** — risk-centric alternative that avoids DREAD's pitfalls
- **FAIR** — quantitative risk analysis framework for mature organizations

## References

- LeBlanc, D., Howard, M. (2002). *Writing Secure Code*, 2nd ed. Microsoft Press.
- Wikipedia, "DREAD (risk assessment model)". https://en.wikipedia.org/wiki/DREAD_(risk_assessment_model)
- Microsoft SDL documentation on current bug bar practice.
- FIRST.org CVSS specification. https://www.first.org/cvss/
