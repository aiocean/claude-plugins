# OCTAVE & OCTAVE Allegro

> "Information assets drive the analysis — not perimeter, not compliance checklists."
> — Carnegie Mellon SEI OCTAVE philosophy

## Core Concept

**OCTAVE** (Operationally Critical Threat, Asset, and Vulnerability Evaluation) is an **asset-centric**, **organizational** risk management framework from CMU/SEI. It is *self-directed* — using internal staff, not outside consultants — emphasizing institutional knowledge. **OCTAVE Allegro** is the streamlined 2007 variant focused exclusively on information assets.

## Origin

- **OCTAVE (2001)**: Christopher Alberts & Audrey Dorofee, CMU/SEI. *CMU/SEI-2001-TR-016* (Criteria) and *CMU/SEI-2001-TR-020* (Catalog of Practices).
- **OCTAVE-S (2005)**: simplified variant for small-medium businesses (<100 employees).
- **OCTAVE Allegro (2007)**: R.A. Caralli, J.F. Stevens, L.A. Young, W.R. Wilson. *CMU/SEI-2007-TR-012*. https://resources.sei.cmu.edu/library/asset-view.cfm?assetid=8419

## OCTAVE (Original) — 3 Phases

1. **Build Asset-Based Threat Profiles** — cross-functional workshops identify critical information assets and threats from the inside out
2. **Identify Infrastructure Vulnerabilities** — examine infrastructure supporting critical assets
3. **Develop Security Strategy and Plans** — protection strategy + mitigation plans aligned with mission

## OCTAVE Allegro — 8 Steps in 4 Phases

| Phase | Step | Activity |
|---|---|---|
| Establish Drivers | 1 | Establish risk measurement criteria |
| Profile Assets | 2 | Develop information asset profile (boundaries, security requirements) |
|  | 3 | Identify information asset containers (storage, transport, processing) |
| Identify Threats | 4 | Identify areas of concern |
|  | 5 | Identify threat scenarios |
|  | 6 | Identify risks |
| Mitigate Risks | 7 | Analyze risks (qualitative scoring) |
|  | 8 | Select mitigation approaches |

## Key Differentiators (Allegro vs OCTAVE)

- **Information-asset focused only** (not infrastructure or people)
- **Achievable by one person** or small team
- No large cross-functional team required
- **Significantly faster** — weeks instead of months

## When to Use

- **Organizational risk assessment** (not application-specific threat modeling)
- **SMB with no dedicated security team** — Allegro's single-person workflow fits
- **Periodic audit cycles** — quarterly/annual risk reassessment
- **Information asset inventory** is the organizing question
- Compliance frameworks requiring formal risk analysis (HIPAA §164.308, ISO/IEC 27005 alignment)

## Strengths

- **Self-directed** — internal staff own the process
- **Institutional knowledge integration** — not outsourced thinking
- **Allegro is lightweight** — accessible without security expertise
- **SEI-backed** — academic rigor; CMU/SEI technical reports free and authoritative
- Well-suited to **compliance contexts**

## Limitations

- **Not software-centric** — OCTAVE does not produce DFDs or threat-per-element analysis
- **Qualitative scoring only** — limits cross-assessment comparability
- **Allegro's information-only focus** misses system-level attack chains
- **Insufficient for complex multi-system** environments (Allegro)
- **Not agile-friendly** — waterfall cadence

## Relation to Other Frameworks

- **STRIDE/LINDDUN** — software-centric, applied to a specific system; OCTAVE is organizational
- **PASTA** — both risk-centric; PASTA is app-focused, OCTAVE is org-focused
- **NIST SP 800-37 RMF** — OCTAVE can feed the "Categorize" step
- **ISO/IEC 27005** — conceptually aligned; different vocabulary
- **FAIR** — complementary quantitative layer for Allegro Step 7

## References

- Alberts, C., Dorofee, A. (2001). *OCTAVE Criteria, Version 2.0*. CMU/SEI-2001-TR-016.
- Caralli, R.A. et al. (2007). *Introducing OCTAVE Allegro*. CMU/SEI-2007-TR-012. https://resources.sei.cmu.edu/library/asset-view.cfm?assetid=8419
- SEI library: https://resources.sei.cmu.edu/
