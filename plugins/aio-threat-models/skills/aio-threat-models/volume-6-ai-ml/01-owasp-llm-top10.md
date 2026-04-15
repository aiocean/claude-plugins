# OWASP Top 10 for LLM Applications

> "The first institutional codification of LLM-specific threats."
> — OWASP LLM AI Security Working Group, 2023

## Core Concept

A **curated list of the ten most critical security risks** for applications built on Large Language Models. Structured like OWASP's canonical web app Top 10 but scoped to LLM-specific attack surfaces: prompt injection, training data poisoning, model theft, excessive agency, etc. The 2025 v2.0 revision reflects operational experience with deployed LLM systems including agentic AI.

## Origin

**OWASP LLM AI Security & Governance Working Group**. v1.0 released August 2023. v2.0 released 2025.

Primary resource: https://owasp.org/www-project-top-10-for-large-language-model-applications/

## Top 10 (v1.0, 2023)

| ID | Threat | Description |
|---|---|---|
| **LLM01** | Prompt Injection | Crafted inputs override instructions or leak data |
| **LLM02** | Insecure Output Handling | Downstream components interpret LLM output unsanitized (XSS/SSRF/RCE) |
| **LLM03** | Training Data Poisoning | Adversarial manipulation of training data (backdoors, biases) |
| **LLM04** | Model Denial of Service | Resource exhaustion via expensive prompts |
| **LLM05** | Supply Chain Vulnerabilities | Compromised model weights, datasets, or plugins |
| **LLM06** | Sensitive Information Disclosure | LLM reveals PII, credentials, proprietary data |
| **LLM07** | Insecure Plugin Design | Plugins with excessive permissions or weak validation |
| **LLM08** | Excessive Agency | LLM granted capabilities beyond necessity |
| **LLM09** | Overreliance | Over-trusting LLM output without validation |
| **LLM10** | Model Theft | Exfiltration of weights or functional replication via queries |

## v2.0 (2025) Changes

Reflects **agentic AI** attack surface evolution:

- **LLM01 Prompt Injection** distinguishes **direct** (attacker types into prompt) vs **indirect** (attacker plants content in retrieved documents, tool outputs, or web pages that LLM then processes)
- **Vector and Embedding Weaknesses** — new category for RAG-specific attacks (retrieval poisoning, embedding collision)
- **System Prompt Leakage** — refined category for extracting system prompts
- **Refinement of LLM07** — plugin design covering modern tool-calling and MCP-style architectures

*(Verify exact v2.0 category names at owasp.org as they may have evolved post-knowledge-cutoff.)*

## Mapping to Classic Frameworks

| LLM Threat | STRIDE | LINDDUN |
|---|---|---|
| LLM01 Prompt Injection | Spoofing (instruction source), Tampering | Non-compliance |
| LLM02 Insecure Output | Elevation of Privilege | — |
| LLM03 Training Poisoning | Tampering | Identifiability (via memorization) |
| LLM04 Model DoS | Denial of Service | — |
| LLM05 Supply Chain | Tampering | Non-compliance |
| LLM06 Info Disclosure | Information Disclosure | Disclosure of Information |
| LLM07 Insecure Plugin | Elevation of Privilege | — |
| LLM08 Excessive Agency | Elevation of Privilege | — |
| LLM09 Overreliance | — (human factor) | — |
| LLM10 Model Theft | Information Disclosure | — |

## When to Use

- **LLM-powered application design review** — default starting checklist
- **Pen testing AI systems** — populate test cases
- **Vendor assessment** of LLM-based products
- **Security training** for teams new to AI/LLM
- **Board reporting** on AI security posture (similar familiarity as OWASP web Top 10)

## Strengths

- **Community-maintained** — multi-organization consensus
- **Accessible language** — usable by non-AI-specialists
- **Maps to known risk categories** — security teams can adopt quickly
- **Regular updates** — v1 → v2 within 2 years reflects field velocity
- **Cross-referenced** with CWE, MITRE ATLAS, NIST AI 100-2

## Limitations

- **Still evolving** — "Top 10" may miss novel threats (e.g., agent collusion, emergent deception)
- **Not comprehensive** — curated subset; need ATLAS + NIST AI 100-2 for completeness
- **v1.0 rapidly outdated** — 2023 to 2025 saw major capability shifts (agentic, multimodal)
- **Overlap between categories** — LLM01/LLM02/LLM07 boundaries fuzzy in agentic contexts
- **Mitigation guidance varies** — some categories well-covered, others light

## Relation to Other Frameworks

- **MITRE ATLAS** — systematic TTP catalog for ML; complementary breadth
- **NIST AI RMF 1.0** — governance framework; LLM Top 10 fits inside MEASURE function
- **NIST AI 100-2** — adversarial ML taxonomy; deeper technical taxonomy than LLM Top 10
- **STRIDE / LINDDUN** — classic frameworks still apply to LLM apps (mapping above)
- **OWASP Top 10 Privacy Risks** — sister list for web apps with AI data collection

## References

- OWASP Top 10 for LLM: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OWASP LLM AI Security & Governance Checklist
- MITRE ATLAS (complementary): https://atlas.mitre.org/
- NIST AI 100-2 (deeper taxonomy): https://doi.org/10.6028/NIST.AI.100-2
