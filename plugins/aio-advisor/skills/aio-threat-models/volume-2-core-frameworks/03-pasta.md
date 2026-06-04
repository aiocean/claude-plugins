# PASTA — Process for Attack Simulation and Threat Analysis

> "Risk-centric threat modeling — every technical finding must map to business impact."
> — Tony UcedaVélez & Marco M. Morana

## Core Concept

A **7-stage, risk-centric threat modeling methodology** that anchors all technical analysis to **business objectives**. PASTA's distinctive premise: security findings only matter if expressed as business risk. This forces cross-functional collaboration between developers, business analysts, risk managers, and pentesters.

## Origin

**Tony UcedaVélez** (CEO, VerSprite) and **Marco M. Morana**. Developed through consulting circa 2012; canonical book: *Risk Centric Threat Modeling: Process for Attack Simulation and Threat Analysis* (Wiley, 2015, ISBN 978-0-470-50096-5).

## The Seven Stages

| Stage | Name | Key Activity |
|---|---|---|
| 1 | Define Business Objectives | Compliance mandates, data classifications, risk tolerance |
| 2 | Define Technical Scope | Map full attack surface (apps, DBs, cloud, OS, crypto, SaaS, vendors) |
| 3 | Application Decomposition | Build DFD, trust boundaries, roles, permissions, existing controls |
| 4 | Threat Analysis | Use threat intel, historical incidents, attack-vector analysis |
| 5 | Vulnerability & Weakness Analysis | Correlate threat → vulnerability via code review, pentest, vuln mgmt |
| 6 | Attack Modeling | Build Attack Trees to simulate attacker behavior, quantify likelihood |
| 7 | Risk & Impact Analysis | Translate technical findings → business impact; countermeasure priority |

## Key Philosophy

**Risk-centric ≠ threat-centric**. A threat enumerated but not mapped to business impact is noise. PASTA's Stage 7 produces a **risk-ranked remediation roadmap** aligned to business priorities — actionable for executives, not just engineers.

## When to Use

- **Regulated industries** (finance, healthcare, critical infra) — PCI DSS, SOC 2, HIPAA compliance
- High-stakes systems where threat modeling outputs drive resource allocation
- Organizations with **mature** security programs and cross-functional teams
- When stakeholder communication matters more than threat enumeration completeness
- Post-incident strategic threat modeling (attack tree from Stage 6 excellent for this)

## Strengths

- **End-to-end**: includes countermeasure definition, not just threat ID
- **Business-aligned** — outputs in language of risk managers and executives
- **Attack Trees at Stage 6** — rigorous attack simulation
- **Inherently collaborative** — forces dev + business + risk + pentest alignment
- Integrates **threat intelligence feeds** — grounded in real-world exploitation evidence

## Limitations

- **High complexity** — significantly more steps and documentation than STRIDE
- **Long engagement time** — unsuitable for agile sprints without adaptation
- **Cross-functional coordination** is hard to sustain
- **Stage 4 quality depends on threat intel** — weak intel = weak model
- Requires **skilled facilitators** (UcedaVélez/Morana-trained consultants are a small pool)

## Relation to Other Frameworks

- **Shostack 4Q** — PASTA is an elaborate instantiation of Q1→Q4
- **STRIDE** — PASTA can use STRIDE inside Stage 4 threat enumeration
- **Attack Trees** — embedded as Stage 6 attack modeling technique
- **OCTAVE** — both are risk-centric; OCTAVE is organizational/asset-centric, PASTA is app/attack-centric
- **FAIR** — complementary quantitative risk framework for Stage 7

## References

- UcedaVélez, T., Morana, M.M. (2015). *Risk Centric Threat Modeling: Process for Attack Simulation and Threat Analysis*. Wiley. ISBN 978-0-470-50096-5.
- O'Reilly catalog: https://www.oreilly.com/library/view/risk-centric-threat/9780470500965/
- VerSprite: https://versprite.com/security-offerings/pasta-threat-modeling/
