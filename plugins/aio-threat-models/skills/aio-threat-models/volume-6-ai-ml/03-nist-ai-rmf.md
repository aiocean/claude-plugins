# NIST AI RMF — AI Risk Management Framework

> "Govern, Map, Measure, Manage — the four functions for managing AI risk across the lifecycle."
> — NIST AI 100-1 (2023)

## Core Concept

A **voluntary governance framework** for managing risks of AI systems, released by the US National Institute of Standards and Technology (NIST). AI RMF provides organizational structure for AI risk identification, measurement, and management — it is the **governance layer** under which technical frameworks like MITRE ATLAS and OWASP LLM Top 10 operate.

## Origin

**NIST**, *Artificial Intelligence Risk Management Framework 1.0*, **NIST AI 100-1**, January 2023.

DOI: https://doi.org/10.6028/NIST.AI.100-1
Website: https://www.nist.gov/itl/ai-risk-management-framework

Developed through multi-stakeholder process with industry, academia, civil society, and government contributions.

## Four Core Functions

| Function | Purpose |
|---|---|
| **GOVERN** | Policies, accountability structures, organizational practices for AI risk culture |
| **MAP** | Categorize AI risks in context — intended use, affected populations, risk tolerance |
| **MEASURE** | Analyze, assess, and track AI risks — quantitative and qualitative methods |
| **MANAGE** | Prioritize and address identified risks; response plans and continuous improvement |

Functions operate continuously and interdependently — not sequential phases.

## Seven Trustworthiness Characteristics

AI RMF identifies characteristics of trustworthy AI systems. Threat modeling connects to risks against these:

1. **Valid and reliable**
2. **Safe**
3. **Secure and resilient**
4. **Accountable and transparent**
5. **Explainable and interpretable**
6. **Privacy-enhanced**
7. **Fair — with harmful bias managed**

Each characteristic has its own threats and mitigations. Threat modeling in the MEASURE function must address all seven.

## Relationship to Technical Threat Modeling

AI RMF is **governance scaffold**; technical threat modeling populates its functions:

| AI RMF Function | Threat Modeling Contribution |
|---|---|
| GOVERN | Organizational threat modeling policies, review cadence |
| MAP | LINDDUN-style data flow + AI-specific assets identification |
| MEASURE | MITRE ATLAS + NIST AI 100-2 + OWASP LLM Top 10 threat enumeration |
| MANAGE | Mitigation plans, residual risk acceptance, incident response |

## AI RMF Playbook & Companion Documents

- **NIST AI RMF Playbook** — practical implementation guidance
- **AI RMF Generative AI Profile** (2024) — specific adaptations for GenAI/LLM systems
- **AI RMF Use Case Studies** — sector-specific applications

## When to Use

- **Organizational AI governance** — establishing AI risk culture
- **Board / executive reporting** — explaining AI risk posture
- **Compliance alignment** — EU AI Act, sectoral regulations
- **Vendor risk assessment** — evaluating AI product suppliers
- **Large-scale AI deployment** — enterprise-wide AI risk management
- **Public sector** — US federal agencies increasingly adopt voluntarily

## Strengths

- **Voluntary, consensus-based** — broad applicability without regulatory burden
- **Four-function structure** is intuitive and adaptable
- **Seven trustworthiness characteristics** provide complete coverage scope
- **NIST pedigree** — credibility with regulators and enterprise
- **Maps to regulatory frameworks** — EU AI Act alignment emerging

## Limitations

- **Voluntary** — no enforcement mechanism
- **High-level** — provides *what* not *how* for technical implementation
- **US-centric** — EU AI Act and ISO/IEC 42001 are competing/complementary
- **Rapidly evolving** — foundational frameworks for a moving field
- **Needs technical layer** — alone, AI RMF doesn't produce threat models

## Relation to Other Frameworks

- **MITRE ATLAS** — technical TTP layer under MEASURE
- **NIST AI 100-2** — adversarial ML taxonomy deep-dive under MEASURE
- **OWASP Top 10 for LLM** — curated threat list populating MAP and MEASURE
- **NIST Cybersecurity Framework (CSF) 2.0** — parallel governance structure for cybersecurity
- **NIST Privacy Framework** — parallel governance for privacy
- **ISO/IEC 42001** (2023) — international management system standard for AI
- **EU AI Act** (2024) — regulatory counterpart with conformity assessment requirements

## References

- NIST AI 100-1 (2023): https://doi.org/10.6028/NIST.AI.100-1
- NIST AI RMF Playbook: https://airc.nist.gov/AI_RMF_Knowledge_Base/Playbook
- NIST AI RMF Generative AI Profile (2024): https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
- NIST AI 100-2 (2024) — adversarial ML: https://doi.org/10.6028/NIST.AI.100-2
