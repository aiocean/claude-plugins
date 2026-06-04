# LINDDUN — Privacy Threat Modeling

> "STRIDE for privacy — but not just a rename. LINDDUN adds five categories STRIDE doesn't have."
> — KU Leuven DistriNet research group

## Core Concept

A **systematic privacy threat modeling methodology** analogous to Microsoft's STRIDE but focused on **privacy harms to data subjects** rather than security violations. Seven threat categories map to privacy properties and DFD elements. Running LINDDUN **in parallel with STRIDE** is best practice for any system processing personal data.

## Origin

**Mina Deng, Kim Wuyts, Riccardo Scandariato, Bart Preneel, Wouter Joosen** — KU Leuven (Belgium), 2011. Published in *Requirements Engineering* journal.

Website: https://linddun.org/

**Variants**:
- **LINDDUN GO (2020)** — lightweight card-based for agile teams (Wuyts & Scandariato); 54 privacy threat cards
- **LINDDUN MAESTRO (2022–2023)** — extension for multi-stakeholder sociotechnical systems; agent-based modeling

## The Seven Privacy Threat Categories

| Category | Threatens Privacy Property |
|---|---|
| **L**inkability | Data minimization / unlinkability |
| **I**dentifiability | Anonymity / pseudonymity |
| **N**on-repudiation | Plausible deniability (in privacy contexts, being able to deny actions) |
| **D**etectability | Undetectability / unobservability |
| **D**isclosure of information | Confidentiality |
| **U**nawareness | Transparency, consent, intervenability |
| **N**on-compliance | Legal compliance, accountability (GDPR, CCPA, HIPAA) |

## LINDDUN vs STRIDE — Key Differences

STRIDE's "Information Disclosure" overlaps LINDDUN's "Disclosure of Information," but LINDDUN adds **five categories with no STRIDE equivalent**:

- **Unawareness** — consent failures, dark patterns, lack of transparency
- **Non-compliance** — regulatory/policy violations
- **Linkability** — correlatable records even when anonymized
- **Identifiability** — re-identification attacks on anonymized data
- **Detectability** — inference of sensitive facts from observable metadata

**Non-repudiation** inverts: in security (STRIDE), non-repudiation is a *property to protect*. In privacy (LINDDUN), non-repudiation is a *threat* — the inability to deny an action violates privacy.

## Elicitation Process

1. Build a **DFD** (same as STRIDE) — or a Data Flow Diagram enriched with data subject information
2. For each DFD element (External Entity, Process, Data Store, Data Flow), walk through **elicitation trees** mapping applicable threats from each category
3. Generate concrete privacy threat scenarios
4. Map threats to **privacy requirements** (anonymity, unlinkability, etc.)
5. Select **privacy-enhancing technologies (PETs)** as mitigations

## LINDDUN GO — Lightweight Variant (2020)

Designed for agile teams unable to commit to full DFD-based LINDDUN. Uses a deck of **54 privacy threat cards**. Each card describes a concrete threat with examples and mitigations. Teams draw cards relevant to their system and discuss applicability in sprint ceremonies.

## When to Use

- **Any system processing personal data** (legal or ethical obligation)
- **GDPR Article 35 DPIA** preparation — LINDDUN is the technical artifact
- **Privacy-by-Design** (GDPR Article 25) compliance
- **Healthcare, finance, education** — regulated personal data contexts
- **AI/ML systems** — LINDDUN catches memorization-based PII disclosure that STRIDE misses
- **Consumer apps** — dark patterns, consent bypass, tracking threats

## Strengths

- **Privacy-native** — only mainstream framework designed for privacy, not repurposed from security
- **DFD-compatible** — same system representation as STRIDE; runs in parallel
- **Academically rigorous** — KU Leuven DistriNet peer-reviewed foundation
- **Privacy Engineering is codified** — LINDDUN is cornerstone of the discipline
- **GO variant** enables agile adoption

## Limitations

- **Smaller community** than STRIDE — fewer practitioners, fewer tools
- **Requires privacy domain knowledge** — threat categories unintuitive for security-only engineers
- **Tool support weaker** than STRIDE (Threat Dragon supports it; Microsoft TMT does not)
- **Elicitation trees are dense** — steep learning curve
- **MAESTRO citation** — verify via KU Leuven DistriNet publications

## Relation to Other Frameworks

- **STRIDE** — parallel framework; run both for PII systems
- **NIST Privacy Framework 1.0** (2020) — governance layer; LINDDUN is analytical layer
- **DPIA** (GDPR Article 35) — LINDDUN feeds technical Section 3 (risk) and Section 4 (mitigation)
- **PLOT4ai** — newer privacy framework for AI systems (Isabel Barberá); complementary
- **OWASP Top 10 Privacy Risks** — curated web-app-layer complement to LINDDUN

## References

- Deng, M., Wuyts, K., Scandariato, R., Preneel, B., Joosen, W. (2011). "A privacy threat analysis framework". *Requirements Engineering*.
- LINDDUN: https://linddun.org/
- LINDDUN GO: https://linddun.org/go/
- Wuyts, K., Scandariato, R. (2020). "LINDDUN GO: A Lightweight Approach to Privacy Threat Modeling".
- KU Leuven DistriNet: https://distrinet.cs.kuleuven.be/
