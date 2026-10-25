# OWASP + NIST Crosswalk for AI-Agent Threats

> "No silver bullet exists against adversarial machine learning attacks."
> — NIST, on AI 100-2, 2024/2025

## Core Concept

Three standards bodies now publish taxonomies that overlap on AI-agent threats from different angles: **OWASP Top 10 for LLM Applications 2025** (application-security view of LLM apps), **OWASP Top 10 for Agentic Applications** (2026 edition, the agent-specific view), and **NIST AI 100-2 E2025** (the academic adversarial-ML taxonomy). They use different names for the same phenomena. This article is the lookup table: what each list contains, and how a given threat appears in all three. Use it so a finding written against one framework can be reported against the others.

## Origin / First Seen

- **OWASP Top 10 for LLM Applications 2025** — published 18 November 2024 by the OWASP GenAI Security Project (OWASP Foundation). https://genai.owasp.org/2024/11/17/owasp-reveals-updated-2025-top-10-risks-for-llms/ — **HIGH** (official announcement).
- **OWASP Top 10 for Agentic Applications** — 2026 edition, published December 2025 by the OWASP GenAI Security Project. https://genai.owasp.org/ — **MEDIUM** (list and edition confirmed via multiple secondary sources: Giskard, F5, Fidelis, BleepingComputer).
- **NIST AI 100-2 E2025**, "Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations" — March 2025, DOI 10.6028/NIST.AI.100-2e2025. https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-2e2025.pdf — **HIGH** (primary PDF).
- **Ferrag et al. unified model** (arXiv:2506.23260) cross-maps its 30+ techniques to CVE/NVD and validates by expert review — useful as the research-side bridge. — **HIGH**.

## How It Works — the three lists

### OWASP Top 10 for LLM Applications 2025

Full list (names confirmed across HCL, Confident AI, Coralogix, Invicti). — **HIGH** for names.

| ID | Name | Note vs. 2023 |
|---|---|---|
| **LLM01** | Prompt Injection | #1 for the second consecutive edition; **2025 split direct vs indirect** |
| **LLM02** | Sensitive Information Disclosure | moved up |
| **LLM03** | Supply Chain | renamed/broadened |
| **LLM04** | Data and Model Poisoning | merged training-data poisoning |
| **LLM05** | Improper Output Handling | was Insecure Output Handling |
| **LLM06** | Excessive Agency | moved up — central to agents |
| **LLM07** | System Prompt Leakage | **new in 2025**; replaced Insecure Plugin Design |
| **LLM08** | Vector and Embedding Weaknesses | **new**; RAG/embedding attacks (retrieval poisoning, embedding collision) |
| **LLM09** | Misinformation | **new**; replaced Overreliance |
| **LLM10** | Unbounded Consumption | expands Model DoS → resource mgmt + unexpected cost |

Key 2025 deltas for agents: LLM01 explicitly names **indirect** injection; **LLM07 System Prompt Leakage** is new (OWASP's reasoning: developers cannot assume system-prompt contents stay secret — internal prompts, policies, and tool schemas get extracted); **LLM08 Vector & Embedding Weaknesses** is new because most deployments now use RAG/agentic pipelines rather than fine-tuning. https://www.confident-ai.com/blog/owasp-top-10-2025-for-llm-applications-risks-and-mitigation-techniques — **MEDIUM** (vendor breakdown). https://www.invicti.com/blog/web-security/owasp-top-10-risks-llm-security-2025 — **MEDIUM**.

### OWASP Top 10 for Agentic Applications (2026)

Full list (confirmed across F5, Fidelis, Giskard, BleepingComputer; paraphrased). — **MEDIUM** for names/wording.

| ID | Name | One-line |
|---|---|---|
| **ASI01** | Agent Goal Hijack | attacker steers the agent's objectives/decision path to unintended outcomes |
| **ASI02** | Tool Misuse and Exploitation | agent uses tools unsafely, or attacker abuses tool interfaces |
| **ASI03** | Identity and Privilege Abuse | agent misuses credentials/tokens/inherited permissions beyond intent |
| **ASI04** | Agentic Supply Chain Vulnerabilities | risk from third-party tools, plugins, registries, MCP servers |
| **ASI05** | Unexpected Code Execution | agent generates/runs code or commands that create risk |
| **ASI06** | **Memory and Context Poisoning** | adversarial content written to persistent stores; **persists across sessions** |
| **ASI07** | Insecure Inter-Agent Communication | agent-to-agent messages lack auth/integrity/policy |
| **ASI08** | Cascading Failures | one fault/compromise spreads across connected agents and workflows |
| **ASI09** | Human-Agent Trust Exploitation | persuasive/misleading outputs push users into unsafe approvals |
| **ASI10** | Rogue Agents | compromised, misaligned, or drifting agents keep operating |

ASI06 naming varies by source ("Memory & Context Poisoning" vs "Context Management and Retrieval Manipulation"). Its defining property per sources: a successful poison influences not just the current session but **every subsequent session** that retrieves the corrupted memory/context, and standard prompt-injection controls do not catch it. https://vectorize.io/articles/owasp-asi06 — **MEDIUM**. https://www.giskard.ai/knowledge/owasp-top-10-for-agentic-application-2026 — **MEDIUM**. Three categories (ASI07, ASI08, ASI10) have **no counterpart** in the LLM or web Top 10 — they are genuinely agent-native.

### NIST AI 100-2 E2025

An academic taxonomy, not a Top 10. It spans the whole ML lifecycle and both PredAI (predictive) and GenAI. Top-level attack classes:

- **Evasion** — perturb inputs at inference to cause misclassification.
- **Poisoning** — corrupt training data or model (availability, targeted, backdoor).
- **Privacy** — membership inference, model/data extraction, reconstruction.
- **Abuse / GenAI-specific** — misuse and **prompt injection**; NIST classes **jailbreaking as a direct-prompting attack / subclass of prompt injection**. https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-2e2025.pdf — **HIGH** (pub.); jailbreak-as-subclass framing **MEDIUM** (reported via PurpleSec glossary, not yet re-verified line-by-line in the PDF). https://purplesec.us/resources/ai-security-glossary/jailbreaking/ — **LOW** (vendor glossary).

NIST organizes by *attacker capability, knowledge, and goal* — orthogonal to OWASP's by-symptom list, which is why the two are complementary rather than redundant.

## Why It Matters for Attackers

A red teamer uses the crosswalk to be exhaustive: OWASP LLM 2025 covers the app surface, OWASP ASI 2026 covers the agent-native surface (inter-agent, cascading, rogue agents) that the LLM list misses, and NIST adds the training-time and privacy attacks (poisoning, extraction) that neither OWASP list emphasizes. Mapping a single finding across all three also lets an attacker predict which detections a defender who only adopted one framework will miss — e.g., a team that threat-models with OWASP LLM 2025 alone has no category for ASI07 inter-agent spoofing or ASI08 cascading failure.

## Real-World Instances (anchoring each list to incidents)

- **EchoLeak (CVE-2025-32711)** → OWASP LLM01 (indirect injection) + LLM02 (disclosure) + ASI01 (goal hijack). CVSS 9.3. https://thehackernews.com/2025/06/zero-click-ai-vulnerability-exposes.html — **HIGH**.
- **GitHub MCP toxic flow** → ASI02/ASI04 + LLM01 + LLM06 (excessive agency). Invariant, 26 May 2025. https://invariantlabs.ai/blog/mcp-github-vulnerability — **HIGH**.
- Vendor write-ups state OWASP built the ASI 2026 list from documented production incidents (EchoLeak cited for ASI01, GitHub MCP for ASI04). https://bleepingcomputer.com/news/security/the-real-world-attacks-behind-owasp-agentic-ai-top-10 — **MEDIUM**.

## The crosswalk (consolidated)

| Phenomenon | OWASP LLM 2025 | OWASP ASI 2026 | NIST AI 100-2 E2025 |
|---|---|---|---|
| Direct prompt injection / jailbreak | LLM01 | ASI01 | Abuse → prompt injection (jailbreak subclass) |
| Indirect prompt injection | LLM01 (indirect) | ASI01 / ASI02 | Abuse → prompt injection |
| Tool/plugin abuse | LLM06 (excessive agency) | ASI02 | — (no direct class) |
| Credential/privilege abuse | LLM06 | ASI03 | Privacy/Abuse (context-dependent) |
| Supply chain (models, MCP, plugins) | LLM03 | ASI04 | Poisoning (supply-chain) |
| Code execution by agent | LLM05 (output handling) | ASI05 | — |
| Memory / context / RAG poisoning | LLM04 + LLM08 | **ASI06** | Poisoning |
| System-prompt / config extraction | LLM07 | ASI03-adjacent | Privacy → extraction |
| Inter-agent message attack | — | ASI07 | — |
| Cascading multi-agent failure | — | ASI08 | — |
| Human manipulation / over-approval | LLM09 (misinfo) | ASI09 | Abuse |
| Rogue/misaligned agent | — | ASI10 | — |
| Data exfiltration / disclosure | LLM02 | (via ASI01/02) | Privacy → extraction |
| Resource exhaustion / cost | LLM10 | (via ASI02) | Evasion/Abuse (availability) |

## Detection Signals

Framework coverage gaps *are* the detection gaps: if your SIEM rules derive only from OWASP LLM 2025, you have no signal for ASI07/ASI08/ASI10 — treat those three as blind spots to instrument separately.

## Mitigations / Hardening

- Adopt all three as a **union**, not alternatives — each covers what the others miss.
- Map every control you deploy to the crosswalk rows it addresses; empty rows are unmitigated classes.
- NIST's own conclusion: there is **no silver bullet** — layer controls, assume partial failure. https://www.securityweek.com/nist-no-silver-bullet-against-adversarial-machine-learning-attacks/ — **MEDIUM**.

## Related Vectors

- [[01-agent-attack-surface-taxonomy]] — the layers these IDs annotate
- [[03-agent-kill-chain]] — each stage cites its OWASP/ATLAS ID
- [[05-trust-boundaries-and-threat-model]] — turn crosswalk rows into a threat model
- vol 4 (ASI06 deep dive), vol 5 (ASI07/ASI08), vol 6 (jailbreak/NIST abuse)

## References

- OWASP Top 10 for LLM Applications 2025 — **HIGH** (names). https://genai.owasp.org/2024/11/17/owasp-reveals-updated-2025-top-10-risks-for-llms/
- OWASP Top 10 for Agentic Applications 2026 — **MEDIUM**. https://genai.owasp.org/ ; https://www.f5.com/glossary/owasp-top-10-for-agentic-ai-applications ; https://www.giskard.ai/knowledge/owasp-top-10-for-agentic-application-2026
- NIST AI 100-2 E2025, March 2025 — **HIGH**. https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-2e2025.pdf
- SecurityWeek, "NIST: no silver bullet," 2024/2025 — **MEDIUM**. https://www.securityweek.com/nist-no-silver-bullet-against-adversarial-machine-learning-attacks/
- Confident AI, OWASP Top 10 2025 breakdown — **MEDIUM**. https://www.confident-ai.com/blog/owasp-top-10-2025-for-llm-applications-risks-and-mitigation-techniques
- BleepingComputer, "The real-world attacks behind OWASP Agentic AI Top 10" — **MEDIUM**. https://bleepingcomputer.com/news/security/the-real-world-attacks-behind-owasp-agentic-ai-top-10
- Ferrag et al., arXiv:2506.23260 — **HIGH**. https://arxiv.org/abs/2506.23260
