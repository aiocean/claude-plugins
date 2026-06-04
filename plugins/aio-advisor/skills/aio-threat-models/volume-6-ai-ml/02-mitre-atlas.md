# MITRE ATLAS

> "ATT&CK for machine learning systems — structured by real-world adversarial incidents."
> — MITRE ATLAS description

## Core Concept

**Adversarial Threat Landscape for AI Systems** — a knowledge base structured identically to MITRE ATT&CK but scoped to the **machine learning lifecycle** as attack surface. ATT&CK covers enterprise IT post-compromise tactics; ATLAS extends this to ML-specific adversarial behaviors: adversarial examples, data poisoning, model extraction, membership inference.

## Origin

**MITRE Corporation**, launched 2021, in collaboration with the AI/ML security community (Microsoft, IBM, NVIDIA, Bosch, Airbus, and others).

Primary resource: https://atlas.mitre.org/

## Structure — Tactics × Techniques × Case Studies

Same matrix structure as ATT&CK. Tactic categories include (selected):

- **Reconnaissance** — gathering info about ML models, training data, APIs
- **Resource Development** — acquiring infrastructure for ML attacks
- **Initial Access** — gaining first foothold in ML pipeline
- **ML Model Access** — black-box query, white-box access, physical access
- **ML Attack Staging** — crafting adversarial examples, poisoning payloads
- **Execution** — running ML attack against target
- **Defense Evasion** — bypassing ML-based detection/defenses
- **Exfiltration** — model theft, membership inference
- **Impact** — corrupting model behavior, degrading availability, manipulating decisions

## Key ML-Specific Techniques

| Technique Category | Examples |
|---|---|
| **Evasion attacks** | Adversarial perturbations, universal patches |
| **Poisoning attacks** | Label flipping, backdoor triggers, data injection |
| **Model extraction** | Query-based replication, functional cloning |
| **Membership inference** | Determining if a record was in training set |
| **Model inversion** | Reconstructing training inputs from outputs |
| **Data extraction** | Recovering verbatim training data (esp. generative models) |

## Integration with ATT&CK

ATLAS techniques **chain into ATT&CK** post-compromise sequences. Example attack chain:

1. **ATLAS**: Recon ML system → access training pipeline (supply chain)
2. **ATLAS**: Craft poisoned fine-tuning dataset
3. **ATLAS**: Deploy backdoor via poisoning
4. **ATT&CK**: Standard lateral movement after compromising ML pipeline infrastructure
5. **ATT&CK**: Actions on objectives leveraging ML backdoor

## Case Studies

ATLAS includes real-world incident case studies. Documented examples:

- **Tay chatbot manipulation** (Microsoft, 2016) — coordinated prompt manipulation
- **Tesla Autopilot adversarial patches** (academic research)
- **Facial recognition evasion** (GAN-generated glasses, makeup)
- **Computer vision evasion** — multiple academic and real-world cases

Case count and specifics updated at https://atlas.mitre.org/studies.

## When to Use

- **ML system threat modeling** — ATLAS is the standard TTP catalog
- **Red team for AI** — populate test cases from ATLAS techniques
- **Secure ML pipeline design** — enumerate attack surfaces at each lifecycle stage
- **CTI for AI** — attribute adversary campaigns targeting ML infrastructure
- **Vendor evaluation** — ask ML platform vendors about ATLAS coverage

## Strengths

- **ATT&CK-parallel structure** — familiar to security teams
- **Real-world grounded** — case studies from incidents
- **Multi-vendor consortium** — not single-company perspective
- **Complements OWASP LLM Top 10** — ATLAS is systematic, LLM Top 10 is curated
- **Free and open** (MITRE license)

## Limitations

- **Retrospective** — observation-driven; novel attacks absent until observed
- **Smaller than ATT&CK** — fewer techniques, less mature tooling
- **Academic heavy** — some techniques are research-only, not operational threats
- **Defense guidance lighter** than ATT&CK (D3FEND parallel for ML not yet mature)
- **Generative AI coverage** still catching up to rapidly-evolving LLM threat landscape

## Relation to Other Frameworks

- **MITRE ATT&CK** — companion knowledge base; ATLAS chains into ATT&CK
- **OWASP Top 10 LLM** — curated subset of high-priority LLM threats; ATLAS is systematic
- **NIST AI 100-2** (2024) — taxonomic adversarial ML companion with academic rigor
- **NIST AI RMF** — governance layer; ATLAS is tactical layer
- **STRIDE/LINDDUN** — classic frameworks for ML app-layer threats (API, data handling)

## References

- MITRE ATLAS: https://atlas.mitre.org/
- ATLAS case studies: https://atlas.mitre.org/studies
- ATLAS Navigator: https://atlas.mitre.org/navigator
- MITRE ATT&CK (for chain integration): https://attack.mitre.org/
