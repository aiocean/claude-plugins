# Data Flow Diagrams & Trust Boundaries

> "If your DFD doesn't show trust boundaries, you're not threat modeling yet."
> — Threat modeling practitioner folklore

## Core Concept

A **Data Flow Diagram (DFD)** is the canonical system representation used in software-centric threat modeling. It captures how data moves between components. A **trust boundary** marks where data crosses between zones with different privilege or trust assumptions — these crossings are the highest-priority focus for threat analysis.

## Origin

DFDs originated in structured analysis in the mid-1970s (Larry Constantine, Edward Yourdon, Tom DeMarco, Chris Gane, Trish Sarson). They were adopted into threat modeling by Microsoft's SDL in the early 2000s, formalized in Swiderski & Snyder's *Threat Modeling* (Microsoft Press, 2004) and Shostack's 2014 book.

## The Five DFD Elements

| Element | Notation | Role |
|---|---|---|
| **External Entity** | Rectangle | Actor outside the system (user, third-party service) |
| **Process** | Circle / oval | Transforms, processes, or routes data |
| **Data Store** | Two parallel horizontal lines | Persistent storage (DB, file, cache, registry) |
| **Data Flow** | Directed arrow | Data movement between elements |
| **Trust Boundary** | Red dashed line | Demarcates zones of different trust levels |

## The Golden Rule

**Every data flow that crosses a trust boundary is a priority candidate for threat analysis.** The trust boundary crossing represents the adversarial opportunity — data leaves a zone with one set of assumptions and enters another.

Common trust boundaries:
- Internet ↔ DMZ
- DMZ ↔ Internal network
- User-space ↔ Kernel-space
- Browser ↔ Server
- Unauthenticated ↔ Authenticated
- Customer tenant ↔ Customer tenant (multi-tenant SaaS)
- Third-party API ↔ Your application

## STRIDE-per-Element Mapping

When applying STRIDE to a DFD, only certain threat categories apply to each element type:

| Element | Applicable STRIDE |
|---|---|
| External Entity | Spoofing, Repudiation |
| Process | Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege (all 6) |
| Data Store | Tampering, Repudiation, Info Disclosure, DoS |
| Data Flow | Tampering, Info Disclosure, DoS |

**Rationale:** External Entities can't be Tampered with (outside system scope); Data Stores have no identity to Spoof; Processes are active transformers subject to all six.

## When to Use DFDs

- **Always** for software-centric threat modeling (Q1 of Shostack framework)
- When onboarding new team members to the system
- Before API/architecture review
- When scoping a security assessment or pentest
- As input to Microsoft TMT, OWASP Threat Dragon, pytm, Threagile

## Common Pitfalls

- **Too much detail** — a 200-node DFD is unanalyzable. Decompose hierarchically: Level 0 (context), Level 1 (subsystems), Level 2 (components).
- **Missing trust boundaries** — a DFD without boundaries is a flow chart, not a threat model.
- **Stale DFDs** — diagrams diverge from code within weeks. Use **threat-model-as-code** (pytm, Threagile) to version-control them.
- **Confusing DFD with UML sequence diagrams** — DFDs show *data flow*, not *call order*.

## Relation to Other Frameworks

- **STRIDE** — applied per DFD element; STRIDE-per-Element is the current SDL standard
- **LINDDUN** — same DFD structure, different threat categories (privacy-focused)
- **PASTA Stage 3** — "Application Decomposition" produces a DFD
- **VAST** — operational track uses DFDs; application track uses *process flow diagrams* (subtle distinction)

## References

- Swiderski, F., Snyder, W. (2004). *Threat Modeling*. Microsoft Press.
- Shostack, A. (2014). *Threat Modeling: Designing for Security*. Wiley.
- Microsoft Learn: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool
- OWASP Threat Modeling Process: https://owasp.org/www-community/Threat_Modeling_Process
