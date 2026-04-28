---
name: aio-threat-models
description: |
  Threat modeling framework advisor for analyzing security or privacy risks, designing secure architecture, reviewing attack surface, or selecting frameworks. Actively guides through framework selection, application, and cross-framework composition.
when_to_use: threat model, threat modeling, STRIDE, LINDDUN, PASTA, OCTAVE, Attack Tree, MITRE ATT&CK, ATLAS, Kill Chain, Diamond Model, DREAD, CAPEC, Trike, VAST, hTMM, Persona non Grata, Security Cards, DPIA, GDPR Article 35, OWASP LLM Top 10, NIST AI RMF, adversarial ML, Kubernetes threat, cloud threat modeling, continuous threat modeling, shared responsibility, DFD, trust boundary, security risk analysis, privacy risk, attack surface, secure design, security architecture review, privacy engineering, data protection impact assessment, search threat models, find framework, which framework, security review, privacy review, risk analysis, secure architecture, Kubernetes security, cloud security, threat model as code, pytm, Threagile, Threat Dragon, Microsoft TMT
---

# Threat Modeling Framework Advisor

> "Threat modeling is analyzing representations of a system to highlight concerns about security and privacy characteristics."
> — Threat Modeling Manifesto (2020)

## Workflow: How to Use This Skill

When this skill is triggered, follow these five steps. Do NOT just dump framework descriptions — actively guide the user through their specific threat modeling task.

### Step 1: ASK — Understand the System

Before selecting frameworks, gather essential context (if not already clear):

- What system is being threat modeled? (new design, existing system, specific feature)
- Is it primarily a **security**, **privacy**, or **both** concern?
- What domain? (web app, mobile, cloud-native, microservices, AI/ML, IoT, cyber-physical)
- Who processes the output? (developers, SOC, compliance, regulators, executives)
- What lifecycle phase? (requirements, design, implementation, operations, incident review)
- Regulatory context? (GDPR, HIPAA, PCI DSS, EU AI Act, SOC 2, etc.)
- Team expertise level? (beginners, security-experienced, dedicated security team)

If the user's message already contains enough context, proceed directly to Step 2.

### Step 2: SEARCH — Find Relevant Frameworks

**First, run semantic search** with the user's problem as the query to find the most relevant frameworks. Then cross-reference with the routing table below.

```bash
TM="${CLAUDE_PLUGIN_ROOT}/skills/aio-threat-models/scripts"
npx tsx "$TM/search-models.ts" "<user's threat modeling problem>" --top 5 --json
```

Read the full markdown file for each top result before proceeding. Use the routing table as a secondary guide:

| Context | Start With |
|---|---|
| **Starting fresh, new web/app system** | Shostack 4Q + STRIDE + DFD |
| **Privacy-sensitive system (PII/PHI)** | LINDDUN (parallel to STRIDE) + DPIA |
| **Regulated finance/healthcare** | PASTA + STRIDE + DPIA (if PII) |
| **Enterprise DevSecOps at scale** | VAST (or IriusRisk) + Continuous TM |
| **Organizational risk assessment** | OCTAVE Allegro |
| **High-value attack scenario** | Attack Trees |
| **Creative threat discovery, diverse team** | Security Cards + PnG (consider hTMM) |
| **Requirements-phase threat modeling** | hTMM (Cards + PnG + SQUARE) |
| **ML/AI system** | OWASP LLM Top 10 + MITRE ATLAS + NIST AI RMF + NIST AI 100-2 |
| **Cloud-native / K8s** | Shared Responsibility + CNCF 4-layer + K8s Threat Matrix |
| **CTI / incident analysis** | Diamond Model + Kill Chain / UKC + MITRE ATT&CK |
| **Agile sprint integration** | Threat Model as Code (pytm / Threagile) + Continuous TM |
| **Access control system** | Trike (requirements matrix) |
| **Scoring identified threats** | CVSS or bug bars (DO NOT use DREAD — deprecated) |
| **AI-phase adversarial ML rigor** | NIST AI 100-2 taxonomy |

State which frameworks you selected and **why they fit this situation**.

### Step 3: APPLY — Walk Through Each Framework

For each selected framework, apply it directly to the user's situation:

- Name the framework and its core concept (one sentence)
- State its origin and primary use case
- Show what it reveals about the user's specific problem
- Identify the concrete threats, properties, or steps relevant

### Step 4: COMPOSE — Cross-Framework Synthesis

Real-world threat modeling rarely uses one framework in isolation. Compose:

- **Outer loop**: Shostack 4Q (what are we working on / what can go wrong / what to do / did we do a good job)
- **System representation**: DFD with trust boundaries
- **Threat enumeration**: STRIDE (security) + LINDDUN (privacy, if applicable)
- **Creative brainstorm**: Security Cards or PnG (for blind spots)
- **Attack depth**: Attack Trees for high-value scenarios
- **Knowledge bases**: MITRE ATT&CK / ATLAS / CAPEC for known TTPs
- **Risk scoring**: CVSS for vulnerabilities, PASTA risk analysis for threats
- **Compliance mapping**: DPIA for GDPR; AI RMF Playbook for AI governance

State the composition you recommend and how the frameworks interact.

### Step 5: CHALLENGE — Stress-Test the Approach

Pick one dimension and challenge honestly:

- **Coverage**: What threats does this composition likely miss? (Privacy? Insider threats? Novel ML attacks?)
- **Effort vs value**: Is the proposed depth justified? Could a lighter approach suffice?
- **Empirical limits**: Remember Scandariato 2015 — STRIDE misses threats systematically. Consider pairing with creative methods.
- **Tool reality**: Does the team have skills/tools for this? Or will it degrade to "admiration for the problem" (Manifesto anti-pattern)?

State final confidence level and any caveats.

---

## Scripts

Before calling any script, resolve the scripts directory:

```bash
TM="${CLAUDE_PLUGIN_ROOT}/skills/aio-threat-models/scripts"
```

### List all frameworks

```bash
$TM/list-models.sh                      # List all 27 frameworks by volume
$TM/list-models.sh --volume 2           # Filter by volume (1-7)
$TM/list-models.sh --search "mitre"     # Search by keyword
$TM/list-models.sh --count              # Quick count per volume
```

### Semantic Search

Find relevant frameworks by meaning, not just keywords. Uses pre-computed embeddings (snowflake-arctic-embed-xs, 384-dim, runs locally).

```bash
npx tsx "$TM/search-models.ts" "how to model privacy threats in an ML system"
npx tsx "$TM/search-models.ts" "framework for kubernetes security review" --top 3
npx tsx "$TM/search-models.ts" "enterprise threat modeling at scale" --json
```

Options:
- `--top N` — Number of results (default: 5)
- `--json` — Output as JSON

**Always run semantic search first before selecting frameworks.** The search uses embeddings to find the most relevant frameworks for the user's specific problem — more reliable than guessing from memory.

### Rebuild embeddings (after adding or editing content)

```bash
npx tsx "$TM/build-embeddings.ts"
```

---

## Framework Catalog

**7 Volumes, 27 frameworks total.** Each framework has its own markdown file with: core concept, origin, structure, when-to-use, strengths, limitations, relation to other frameworks, and primary-source references.

### Volume 1: Foundations

_Methodology-agnostic scaffolds and common artifacts_

| Framework | Core Idea |
|---|---|
| [Shostack's 4-Question Framework](./volume-1-foundations/01-shostack-4-questions.md) | Methodology-agnostic scaffold for any TM process |
| [DFD & Trust Boundaries](./volume-1-foundations/02-dfd-trust-boundaries.md) | Canonical system representation for software-centric TM |
| [Threat Modeling Manifesto (2020)](./volume-1-foundations/03-threat-modeling-manifesto.md) | Community consensus on values and anti-patterns |

### Volume 2: Core Frameworks

_The six most widely-deployed threat modeling frameworks_

| Framework | Core Idea | Best For |
|---|---|---|
| [STRIDE](./volume-2-core-frameworks/01-stride.md) | 6 threat categories for software-centric TM | Default web/app starting point |
| [DREAD](./volume-2-core-frameworks/02-dread.md) | Risk scoring (deprecated) | Historical reference; don't use |
| [PASTA](./volume-2-core-frameworks/03-pasta.md) | 7-stage risk-centric methodology | Regulated industries |
| [OCTAVE Allegro](./volume-2-core-frameworks/04-octave-allegro.md) | Asset-centric organizational risk | SMB / periodic audit |
| [Trike](./volume-2-core-frameworks/05-trike.md) | Requirements-based actor-asset-action matrix | Formal access control |
| [VAST](./volume-2-core-frameworks/06-vast.md) | Enterprise DevSecOps (dual-track) | Large organizations |

### Volume 3: Attacker-centric

_Frameworks grounded in adversary modeling_

| Framework | Core Idea |
|---|---|
| [Attack Trees](./volume-3-attacker-centric/01-attack-trees.md) | Hierarchical AND/OR attack goal decomposition with cost/probability |
| [Persona non Grata](./volume-3-attacker-centric/02-persona-non-grata.md) | Attacker personas for requirements-phase TM |
| [Security Cards](./volume-3-attacker-centric/03-security-cards.md) | 42-card creativity tool, unique Human Impact dimension |
| [hTMM (Hybrid)](./volume-3-attacker-centric/04-htmm.md) | SQUARE + Security Cards + PnG composition |

### Volume 4: Attack Patterns

_Knowledge bases of real-world adversary behaviors_

| Framework | Core Idea |
|---|---|
| [Lockheed Martin Cyber Kill Chain](./volume-4-attack-patterns/01-cyber-kill-chain.md) | 7-phase APT intrusion model |
| [Unified Kill Chain](./volume-4-attack-patterns/02-unified-kill-chain.md) | 18-stage extension with ATT&CK integration |
| [MITRE ATT&CK](./volume-4-attack-patterns/03-mitre-attack.md) | Tactics × Techniques knowledge base (691 methods) |
| [Diamond Model](./volume-4-attack-patterns/04-diamond-model.md) | Event-centric intrusion analysis (Adversary-Capability-Infrastructure-Victim) |
| [CAPEC](./volume-4-attack-patterns/05-capec.md) | Attack pattern catalog at exploitation-mechanics layer |

### Volume 5: Privacy

_Privacy-specific frameworks and regulatory counterparts_

| Framework | Core Idea |
|---|---|
| [LINDDUN](./volume-5-privacy/01-linddun.md) | 7 privacy threat categories + GO (card) + MAESTRO |
| [GDPR DPIA](./volume-5-privacy/02-gdpr-dpia.md) | Article 35 Data Protection Impact Assessment structure |

### Volume 6: AI/ML Threat Modeling

_Frameworks for LLM, ML, and AI systems_

| Framework | Core Idea |
|---|---|
| [OWASP Top 10 for LLM](./volume-6-ai-ml/01-owasp-llm-top10.md) | Curated LLM threat list (v1.0 2023, v2.0 2025) |
| [MITRE ATLAS](./volume-6-ai-ml/02-mitre-atlas.md) | ATT&CK-parallel knowledge base for ML |
| [NIST AI RMF](./volume-6-ai-ml/03-nist-ai-rmf.md) | GOVERN-MAP-MEASURE-MANAGE governance framework |
| [NIST AI 100-2](./volume-6-ai-ml/04-nist-ai-100-2.md) | Adversarial ML taxonomy (Evasion/Poisoning/Privacy/Abuse) |

### Volume 7: Cloud & DevSecOps

_Cloud-native, microservices, and continuous threat modeling_

| Framework | Core Idea |
|---|---|
| [Cloud Threat Modeling](./volume-7-cloud-devsecops/01-cloud-threat-modeling.md) | Shared responsibility + AWS/Azure/GCP frameworks + CSA Egregious 11 |
| [Kubernetes Threat Matrix](./volume-7-cloud-devsecops/02-kubernetes-threat-matrix.md) | CNCF 4-layer + Microsoft K8s Threat Matrix |
| [Continuous Threat Modeling](./volume-7-cloud-devsecops/03-continuous-threat-modeling.md) | Threat Model as Code (pytm, Threagile) + agile integration |

---

## Quick Reference — Framework Selection Matrix

### By Orientation

- **Software-centric**: STRIDE, LINDDUN
- **Asset-centric**: OCTAVE Allegro
- **Attacker-centric**: Attack Trees, PnG, Security Cards, Kill Chain, UKC, ATT&CK
- **Risk-centric**: PASTA, Trike
- **Hybrid**: hTMM, VAST (dual-track)
- **Analyst-centric**: Diamond Model

### By Lifecycle Phase

- **Requirements**: hTMM, PnG, Misuse Cases
- **Design / Architecture**: STRIDE, LINDDUN, Attack Trees, PASTA
- **Implementation**: Threat Model as Code (pytm, Threagile)
- **Operations / SOC**: MITRE ATT&CK, Kill Chain, UKC, Diamond Model
- **Incident Analysis**: Diamond Model, ATT&CK, CAPEC

### By Scope

- **Security only**: STRIDE, PASTA, Attack Trees, Kill Chain
- **Privacy only**: LINDDUN, DPIA
- **Security + Privacy**: STRIDE + LINDDUN in parallel (best practice)
- **AI/ML**: OWASP LLM Top 10 + ATLAS + NIST AI RMF + NIST AI 100-2
- **Cloud**: Shared Responsibility + CSA + cloud-provider-specific
- **Organizational**: OCTAVE Allegro

---

## Top 10 Most-Used Frameworks

1. **STRIDE** — default software-centric starting point
2. **LINDDUN** — privacy-native parallel to STRIDE (mandatory for PII systems)
3. **Shostack 4-Questions** — methodology-agnostic scaffold wrapping everything
4. **DFD + Trust Boundaries** — system representation for STRIDE/LINDDUN/PASTA
5. **Attack Trees** — quantitative analysis of high-value attack scenarios
6. **MITRE ATT&CK** — de-facto standard TTP catalog
7. **PASTA** — risk-centric methodology for regulated industries
8. **MITRE ATLAS** — ML-system TTP catalog
9. **OWASP Top 10 for LLM** — curated LLM threat checklist
10. **Continuous Threat Modeling** — modern DevSecOps practice

---

## Empirical Reminders

From the literature (Scandariato 2015, Tuma 2018, Xiong 2019):

- **STRIDE has a high false-negative rate** — practitioners miss threats systematically. Pair with Security Cards or PnG for creative breadth.
- **No framework optimizes all properties** (SEI 2018). Composition > choosing one.
- **No Definition of Done** exists in threat analysis (Tuma 2018). Completeness cannot be objectively measured.
- **Most validation is by illustration**, not controlled empirical evaluation.
- **Manual analysis dominates** — automation nascent but improving.

---

## Anti-Patterns to Avoid

From Threat Modeling Manifesto (2020):

- **Hero Threat Modeler** — one expert bottlenecks everything
- **Admiration for the Problem** — endless analysis without action
- **Tendency to Overfocus** — over-analyzing one area, ignoring others
- **Perfect Representation** — weeks perfecting a DFD that's outdated by next sprint

Plus community-derived:

- **Using DREAD** — subjective, deprecated; use CVSS or bug bars
- **STRIDE-only for PII systems** — misses 5 privacy threat categories; always pair with LINDDUN
- **One-time threat modeling** — Manifesto value: "Continuous refinement over single delivery"
- **Automation theater** — generating reports no one reads

---

## Sources & Further Reading

### Canonical Books

- Shostack, A. (2014). *Threat Modeling: Designing for Security*. Wiley.
- UcedaVélez, T., Morana, M.M. (2015). *Risk Centric Threat Modeling*. Wiley.
- Tarandach, I., Coles, M. (2020). *Threat Modeling: A Practical Guide for Development Teams*. O'Reilly.
- Swiderski, F., Snyder, W. (2004). *Threat Modeling*. Microsoft Press.

### Systematic Literature Reviews

- Scandariato, R., Wuyts, K., Joosen, W. (2015). "A descriptive study of Microsoft's threat modeling technique". *Requirements Engineering* 20:163–180.
- Tuma, K., Calikli, G., Scandariato, R. (2018). "Threat analysis of software systems: A systematic literature review". *Journal of Systems and Software* 144:275–294.
- Xiong, W., Lagerström, R. (2019). "Threat modeling — A systematic literature review". *Computers & Security* 84:53–69.

### Online Resources

- Threat Modeling Manifesto: https://www.threatmodelingmanifesto.org/
- Adam Shostack's site: https://shostack.org/resources/threat-modeling
- OWASP Threat Modeling: https://owasp.org/www-community/Threat_Modeling
- CMU SEI Threat Modeling: https://www.sei.cmu.edu/blog/threat-modeling-12-available-methods/
- LINDDUN: https://linddun.org/
- MITRE ATT&CK: https://attack.mitre.org/
- MITRE ATLAS: https://atlas.mitre.org/
- NIST AI Resource Center: https://airc.nist.gov/

---

_"Threat modeling is a journey of understanding — not a snapshot."_
— Threat Modeling Manifesto (2020)
