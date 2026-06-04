# Shostack's 4-Question Framework

> "What are we working on? What can go wrong? What are we going to do about it? Did we do a good job?"
> — Adam Shostack, *Threat Modeling: Designing for Security* (Wiley, 2014)

## Core Concept

A **methodology-agnostic scaffold** for threat modeling, distilled to four organizing questions. Shostack designed it so that any threat enumeration method (STRIDE, LINDDUN, Attack Trees) can inhabit Question 2 — the framework provides structure without prescribing content.

## Origin

**Adam Shostack**, formerly Principal Security Program Manager at Microsoft, was the primary architect of the SDL Threat Modeling process and the Microsoft Threat Modeling Tool. The 4-question framework was formalized in his 2014 book *Threat Modeling: Designing for Security* (Wiley, ISBN 978-1-118-80999-0). The Threat Modeling Manifesto (2020) adopted these four questions verbatim.

## The Four Questions

### Q1 — What are we working on?

Build a shared model of the system. Artifacts: **Data Flow Diagram (DFD)** with trust boundaries, component inventory, external dependencies, data classifications.

### Q2 — What can go wrong?

Enumerate threats. Choose one or more methodologies — STRIDE (software-centric), LINDDUN (privacy), Attack Trees (attacker goals), Security Cards (creative brainstorm). Output: threat catalog.

### Q3 — What are we going to do about it?

For each threat, pick one of four responses:
- **Mitigate** — add controls (authentication, encryption, rate-limiting)
- **Transfer** — shift risk (insurance, outsource, contract SLA)
- **Eliminate** — redesign to remove the attack surface
- **Accept** — document residual risk with business sign-off

Output: mitigation plan / security requirements.

### Q4 — Did we do a good job?

Retrospective. Did the process find real issues? Were mitigations implemented? Is the model still accurate after architecture changes? Was effort proportional to risk?

## When to Use

- **Always** as the outer loop, regardless of methodology chosen for Q2
- Onboarding new teams to threat modeling (low activation energy)
- When evaluating whether a threat modeling exercise was valuable
- Cross-methodology composition (e.g., STRIDE + LINDDUN + Attack Trees for different aspects of same system)

## Strengths

- **Methodology-agnostic** — works with any threat enumeration technique
- Minimal prerequisites; learnable in minutes
- Addresses the full lifecycle, not just threat identification
- Forces Q4 (retrospection) — which most frameworks skip entirely

## Limitations

- Provides structure, not content — teams still need to choose methods for Q2 and Q3
- Novice teams may struggle to operationalize without additional guidance
- No prescribed artifact format — outputs vary wildly across teams

## Relation to Other Frameworks

- **Threat Modeling Manifesto (2020)** — adopts all four questions verbatim as community consensus
- **SDL (Microsoft)** — STRIDE fits inside Q2 of this framework
- **PASTA** — the 7-stage PASTA methodology is an elaborate instantiation of Q1→Q4
- **hTMM** — combines Security Cards + PnG + SQUARE inside Q2

## References

- Shostack, A. (2014). *Threat Modeling: Designing for Security*. Wiley. ISBN 978-1-118-80999-0.
- Threat Modeling Manifesto (2020). https://www.threatmodelingmanifesto.org/
- Shostack's resources: https://shostack.org/resources/threat-modeling
