# MITRE ATT&CK

> "A globally accessible knowledge base of adversary tactics and techniques based on real-world observations."
> — MITRE Corporation

## Core Concept

A **knowledge base** (not a methodology) of adversary behaviors documented from real-world observations. ATT&CK structures Tactics (the *why* — 14 adversary goals) × Techniques (the *how* — hundreds of methods) × Sub-Techniques (granular specificity). Unlike Kill Chain (campaign-level abstraction), ATT&CK operates at **technique-level**, enabling detection engineering, threat hunting, and red/blue team operations.

## Origin

**MITRE Corporation**. Internal development began 2013 (FMX — Fort Meade Experiment research project). Publicly released May 2015.

Primary architects: Blake E. Strom, Andy Applebaum, Doug P. Miller, Kathryn C. Nickels, Adam G. Pennington, Cody B. Thomas.

Design reference: Strom et al. (2020), *MITRE ATT&CK: Design and Philosophy*. https://attack.mitre.org/docs/ATTACK_Design_and_Philosophy_March_2020.pdf

Main resource: https://attack.mitre.org/

## Current Scale (v18.1, October 2025)

- **Enterprise Matrix**: 14 Tactics, 216 Techniques, 475 Sub-Techniques (691 total distinct attack methods)
- **172 documented threat groups**, **784 software entries**, **52 campaigns**, **44 mitigations**
- **1,739 detection analytics** across **106 data components**

## Three Matrices (Domains)

- **Enterprise** — Windows, macOS, Linux, cloud (AWS/Azure/GCP/O365), network, containers
- **Mobile** — Android, iOS
- **ICS** — Industrial Control Systems

## The 14 Enterprise Tactics

1. Reconnaissance
2. Resource Development
3. Initial Access
4. Execution
5. Persistence
6. Privilege Escalation
7. Defense Evasion
8. Credential Access
9. Discovery
10. Lateral Movement
11. Collection
12. Command and Control
13. Exfiltration
14. Impact

## Relationship to Other Knowledge Bases

ATT&CK sits within a multi-layer adversary knowledge stack:

| Layer | Framework | Focus |
|---|---|---|
| Strategic campaign | Kill Chain / UKC | Phases of adversary lifecycle |
| Tactics × Techniques | **MITRE ATT&CK** | Post-exploit adversary behavior |
| Attack pattern mechanics | **CAPEC** | Exploitation techniques |
| Weakness classes | **CWE** | Software flaw categories |
| Specific vulnerabilities | **CVE/CPE** | Product instances |

Chain: ATT&CK → CAPEC → CWE → CVE (full stack threat traceability).

## When to Use

- **Threat hunting** — specific TTPs to search for in telemetry
- **Detection engineering** — map detections to techniques
- **Red team exercises** — plan campaigns using ATT&CK chains
- **Purple team** — align offensive and defensive capability matrices
- **SOC maturity assessment** — coverage gap analysis
- **Threat intelligence** — attribute campaigns to known groups
- **Procurement evaluation** — does this EDR cover techniques X, Y, Z?

## Strengths

- **Real-world grounded** — techniques from observed incidents
- **Rich tooling** — ATT&CK Navigator, CALDERA (automated adversary), Atomic Red Team
- **Continuous updates** — quarterly releases
- **Industry standard** — integrated with most EDR/SIEM products
- **Open** — all content CC BY 4.0

## Critiques and Limitations

- **Coverage paradox** — comprehensive coverage is expensive; full matrix overwhelms most orgs
- **Retrospective bias** — observation-driven; novel techniques underrepresented until observed
- **Not a methodology** — knowledge base, not process; needs Shostack 4Q or Kill Chain wrapper
- **Detection ≠ prevention** — ATT&CK emphasizes detection; prevention mitigations exist but are lighter
- **Scale unwieldy** — 691 attack methods in Enterprise alone is hard to operationalize
- **ICS and Mobile matrices** smaller and less mature than Enterprise

## Relation to Other Frameworks

- **Kill Chain / UKC** — Kill Chain is strategic, ATT&CK is tactical; UKC stages map to ATT&CK tactics
- **Diamond Model** — analyst framework for intrusion analysis; ATT&CK populates Capability vertex
- **CAPEC** — attack pattern mechanics complement ATT&CK behaviors
- **CWE/CVE** — weakness and vulnerability layers under ATT&CK
- **D3FEND** (MITRE) — sister framework for defensive countermeasures

## References

- MITRE ATT&CK: https://attack.mitre.org/
- Strom, B.E. et al. (2020). *MITRE ATT&CK: Design and Philosophy*. https://attack.mitre.org/docs/ATTACK_Design_and_Philosophy_March_2020.pdf
- ATT&CK Navigator: https://mitre-attack.github.io/attack-navigator/
- MITRE Engenuity CTID: https://ctid.mitre-engenuity.org/
