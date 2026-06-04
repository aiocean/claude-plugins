# STRIDE

> "Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege."
> — Loren Kohnfelder & Praerit Garg, 1999

## Core Concept

A **mnemonic of six threat categories**, each violating a specific security property. STRIDE is the oldest, most widely deployed, and best-tooled threat modeling framework in existence. It is **software-centric** — applied to DFD elements to systematically enumerate threats.

## Origin

Developed by **Loren Kohnfelder and Praerit Garg** at Microsoft in 1999, documented in the internal paper *"The Threats to Our Products"*. Adopted into Microsoft's Security Development Lifecycle (SDL) in 2002 following Bill Gates's *Trustworthy Computing* memo. Popularized via MSDN article "Uncover Security Flaws Using the STRIDE Approach" (2006).

## The Six Threat Categories

| STRIDE | Definition | Property Violated |
|---|---|---|
| **S**poofing | Illegally using another user's credentials | Authenticity |
| **T**ampering | Malicious modification of data (in-transit or at-rest) | Integrity |
| **R**epudiation | User performs an action and denies it; system cannot prove otherwise | Non-repudiability |
| **I**nformation Disclosure | Exposure of information to unauthorized parties | Confidentiality |
| **D**enial of Service | Making a service unavailable to legitimate users | Availability |
| **E**levation of Privilege | Unprivileged user gains privileged access | Authorization |

## Two Application Variants

**STRIDE-per-Interaction** (earlier): Apply all 6 categories to every data flow. Exhaustive but noisy.

**STRIDE-per-Element** (current SDL / TMT): Apply only contextually relevant categories per DFD element type. Current standard in Microsoft Threat Modeling Tool:
- External Entity → S, R
- Process → S, T, R, I, D, E (all 6)
- Data Store → T, R, I, D
- Data Flow → T, I, D

## When to Use

- **Default starting point** for software-centric threat modeling
- New system design, architecture review
- When tool support matters (Microsoft TMT, Threat Dragon, pytm)
- When team is learning threat modeling (easiest on-ramp)
- Regulated industries that expect STRIDE output format

## Strengths

- **Systematic coverage** — no category forgotten
- **Widely understood** — 25+ years of refinement, extensive tooling
- **Maps directly to security controls** (authentication mitigates S, integrity hashing mitigates T, etc.)
- **Learnable quickly** — 6 categories fit on a business card

## Limitations (Empirical Evidence)

- **High false-negative rate**: Scandariato, Wuyts, Joosen (2015, *Requirements Engineering* 20:163–180) found practitioners systematically miss valid threats — overlooked threats substantially exceed incorrect threats
- **Time-consuming**: moderate productivity, scalability challenge for large systems
- **No built-in prioritization** — historically paired with DREAD (deprecated), now with CVSS or bug bars
- **Category overlap** — Info Disclosure and Repudiation can blur
- **No privacy coverage** — this gap drove the creation of LINDDUN
- **Requires DFD upfront** — overhead for small teams
- Not ideal for **cyber-physical systems** (SEI 2018)

## Relation to Other Frameworks

- **DREAD** — historic companion for risk scoring (now deprecated)
- **LINDDUN** — parallel framework for privacy threats
- **PASTA** — Stage 3 (Application Decomposition) builds STRIDE-compatible DFDs
- **Microsoft TMT** — native STRIDE-per-Element implementation
- **Shostack 4Q** — STRIDE inhabits Q2 ("What can go wrong")

## References

- Kohnfelder, L., Garg, P. (1999). *The Threats to Our Products*. Microsoft internal paper.
- Scandariato, R., Wuyts, K., Joosen, W. (2015). "A descriptive study of Microsoft's threat modeling technique". *Requirements Engineering* 20:163–180. DOI: 10.1007/s00766-013-0195-2.
- Microsoft Learn, Threat Modeling Tool Threats. https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
- Shevchenko, N. (2018). *Threat Modeling: 12 Available Methods*. CMU/SEI blog.
