# CAPEC — Common Attack Pattern Enumeration and Classification

> "If ATT&CK is *how adversaries behave post-compromise*, CAPEC is *how they break in.*"
> — Framework distinction

## Core Concept

A **publicly-available catalog of known cyber attack patterns** — attributes, methods, and context of adversary exploitation behaviors. CAPEC is structured hierarchically from abstract meta-patterns down to highly specific attack mechanisms. It is **application-security focused** and complements MITRE ATT&CK's network-defense orientation.

## Origin

**MITRE Corporation**, ongoing development since early 2000s (CAPEC list launched 2007 as part of the Making Security Measurable initiative).

Primary resource: https://capec.mitre.org/

## Structure — Hierarchical Attack Patterns

CAPEC organizes attack patterns at three levels of abstraction:

| Level | Description | Example |
|---|---|---|
| **Meta** | Abstract attack classes | CAPEC-1000: Mechanisms of Attack |
| **Standard** | Specific attack categories | CAPEC-66: SQL Injection |
| **Detailed** | Implementation-level techniques | CAPEC-108: Command Line Execution through SQL Injection |

Each entry includes:
- Description
- Likelihood of attack
- Typical severity
- Prerequisites
- Required resources and skills
- Example instances
- Related weaknesses (CWEs)
- Related ATT&CK techniques
- Mitigations

## Primary Categories (Domain Taxonomy)

Attack patterns organized by mechanism:

- **Collect and Analyze Information** (reconnaissance)
- **Injection** (SQL, command, XSS)
- **Deceptive Interactions** (phishing, pretexting)
- **Manipulate System Resources** (resource depletion, privilege abuse)
- **Manipulate Timing and State** (race conditions, TOCTOU)
- **Abuse of Existing Functionality** (functionality misuse)
- **Subvert Access Control** (authentication/authorization bypass)
- **Probabilistic Techniques** (brute force, statistical attacks)
- **Engage in Deceptive Interactions** (social engineering)

## Relationship to Adjacent Frameworks

CAPEC sits at the **exploitation mechanics** layer:

| Layer | Framework | Focus |
|---|---|---|
| Adversary behavior (post-exploit) | **MITRE ATT&CK** | Tactics × techniques |
| Attack pattern mechanics | **CAPEC** | How exploits are crafted |
| Software weakness classes | **CWE** | What flaw types enable the attack |
| Specific vulnerable products | **CVE/CPE** | Instances in production code |

**Example chain**: ATT&CK T1190 (Exploit Public-Facing Application) → CAPEC-66 (SQL Injection) → CWE-89 (Improper Neutralization of Special Elements in SQL) → CVE-2023-XXXXX (specific product).

## When to Use

- **Penetration testing** — reference catalog of attack techniques
- **Secure coding training** — map patterns to code review checklists
- **Threat modeling Q2 ("What can go wrong")** — enumerate known application attacks
- **Requirements engineering** — derive misuse cases from CAPEC patterns
- **Vulnerability management** — link CVEs to higher-level attack patterns
- **Red team playbook** construction

## Strengths

- **Hierarchical organization** — meta-patterns for strategy, detailed for tactics
- **Cross-referenced** with CWE, CVE, ATT&CK
- **Application-security focus** — complements ATT&CK's network focus
- **Free, open** (MITRE license)
- **Well-curated** — subject-matter expert review
- **Mitigation-rich** — each pattern carries countermeasure guidance

## Limitations

- **Retrospective** — catalogs *known* patterns; novel patterns absent
- **Less tool integration** than ATT&CK or CVE
- **Abstraction level mismatches** — some patterns overlap or nest confusingly
- **Update cadence slower** than ATT&CK
- **Not a methodology** — reference catalog only; needs process wrapper

## Relation to Other Frameworks

- **MITRE ATT&CK** — CAPEC = exploitation layer; ATT&CK = post-exploit lifecycle
- **CWE** — weakness classes CAPEC attacks exploit
- **CVE/CPE** — specific products with CWE instances
- **STRIDE** — CAPEC patterns populate Q2 threat enumeration
- **OWASP Top 10** — curated subset of high-impact CAPEC patterns
- **SAMM / BSIMM** — security maturity models using CAPEC-derived checks

## References

- MITRE CAPEC: https://capec.mitre.org/
- CAPEC vs ATT&CK comparison: https://capec.mitre.org/about/attack_comparison.html
- CAPEC list: https://capec.mitre.org/data/index.html
- Making Security Measurable initiative: https://msm.mitre.org/
