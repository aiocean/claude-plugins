# GDPR DPIA — Data Protection Impact Assessment

> "Threat modeling is the primary engineering mechanism to operationalize GDPR Article 25."
> — Privacy engineering consensus

## Core Concept

A **legally-mandated risk assessment** under **GDPR Article 35**, required for processing "likely to result in a high risk" to natural persons. DPIAs are the regulatory counterpart to technical privacy threat modeling — they bridge engineering artifacts (LINDDUN output) and legal/compliance documentation. A completed **LINDDUN threat model** provides the technical substrate feeding DPIA sections on risk identification and mitigation.

## Origin

**EU General Data Protection Regulation (GDPR)**, effective May 25, 2018.

- **Article 25** — Data Protection by Design and by Default (mandates threat modeling indirectly)
- **Article 35** — Data Protection Impact Assessment (explicit DPIA requirement)

**European Data Protection Board (EDPB)** guidelines elaborate methodology. National DPAs publish templates (CNIL in France, ICO in UK).

## When a DPIA is Required (Article 35)

Mandatory when processing is "likely to result in a high risk," especially:

1. **Systematic and extensive profiling** with legal or significant effects on individuals
2. **Large-scale processing** of special categories of data (health, biometrics, political opinions, etc.) or data on criminal convictions
3. **Systematic monitoring of publicly accessible areas on a large scale** (CCTV, tracking)

DPAs publish supplementary lists (e.g., EDPB WP248, national DPA criteria).

## DPIA Structure (Per EDPB Guidelines)

A compliant DPIA must document:

### Section 1 — Description of Processing
- Nature, scope, context, purposes
- Data subjects, categories of personal data
- Data flows, recipients, international transfers
- Retention periods

### Section 2 — Necessity and Proportionality Assessment
- Is processing necessary for stated purpose?
- Could less-invasive alternatives achieve same outcome?
- Lawful basis (Article 6)
- Special category lawful basis (Article 9)
- Rights compliance (access, rectification, erasure, portability)

### Section 3 — Risks to Rights and Freedoms
- Likelihood × severity of harm to data subjects
- **This is where LINDDUN threat model feeds in** — each LINDDUN threat is a candidate DPIA risk
- Sources of risk, affected populations

### Section 4 — Measures to Address Risk
- Technical controls (encryption, pseudonymization, access control)
- Organizational controls (policies, training, DPO oversight)
- **LINDDUN mitigations directly populate this section**
- Residual risk acceptance and justification

## Threat Modeling ↔ DPIA Mapping

| Threat Modeling Activity | DPIA Section |
|---|---|
| DFD + trust boundaries | Section 1 (data flows) |
| Necessity review | Section 2 (proportionality) |
| LINDDUN threat elicitation | Section 3 (risk identification) |
| Privacy-enhancing technology selection | Section 4 (mitigations) |
| Risk scoring | Section 3 (severity/likelihood) |
| Residual risk register | Section 4 (acceptance) |

## When to Use

- **Before launching** any high-risk processing operation (Article 35 obligation)
- **Major changes** to existing processing (scope, volume, purposes, third parties)
- **AI/ML deployments** involving personal data
- **Automated decision-making** with legal effects (Article 22)
- **New data sharing agreements** with processors or third countries
- **Incident post-mortem** — gap analysis for future DPIAs

## Strengths

- **Legal mandate** — compliance forcing function for privacy engineering
- **Structures stakeholder conversation** — forces legal + engineering + product alignment
- **Documents accountability** — audit trail for regulators
- **Threat-modeling integration** — LINDDUN produces technical content naturally

## Limitations

- **Legal complexity** — requires DPO or privacy counsel involvement
- **Can be performative** — checkbox exercise if not engineering-grounded
- **"High risk" threshold is fuzzy** — organizations disagree on triggers
- **Regulatory fragmentation** — EDPB general, national DPAs add criteria
- **Prior consultation requirement** (Article 36) when residual risks remain high — slows deployment

## Relation to Other Frameworks

- **LINDDUN** — primary technical engine feeding DPIA
- **NIST Privacy Framework 1.0** — alternative US-oriented governance (non-regulatory)
- **ISO/IEC 29134** — international standard for PIAs
- **CCPA / CPRA (California)** — US state-level analog; simpler than GDPR DPIA
- **EU AI Act (2024)** — Article 27 Fundamental Rights Impact Assessment for high-risk AI systems parallels DPIA structure

## References

- GDPR Articles 25, 35, 36: https://gdpr-info.eu/
- EDPB WP248 "Guidelines on Data Protection Impact Assessment": https://edpb.europa.eu/
- CNIL DPIA methodology and tool (PIA): https://www.cnil.fr/en/privacy-impact-assessment-pia
- UK ICO DPIA guidance: https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/data-protection-impact-assessments-dpias/
- ISO/IEC 29134:2017 "Guidelines for privacy impact assessment"
