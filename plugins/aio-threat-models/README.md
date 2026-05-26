::install-command
/plugin install aio-threat-models@aiocean-plugins
::

# aio-threat-models

**A structured advisor for selecting, applying, and composing threat modeling frameworks.**

Security reviews without a framework are conversations. They surface the threats the participants already know and miss the ones they don't. Threat modeling frameworks exist to make the unknown systematic — to force questions about spoofing, data flows, privacy leakage, and adversary goals that intuition skips. This plugin gives Claude a working knowledge of 27 frameworks across 7 domains, a structured workflow for applying them, and the intellectual honesty to say when STRIDE alone is not enough.

## Why this plugin?

The failure mode of most security reviews is not malice — it is incomplete coverage. STRIDE misses privacy threats. LINDDUN misses infrastructure-layer attacks. No single framework covers AI/ML adversarial patterns, Kubernetes-specific threats, and GDPR compliance simultaneously. Real systems require composition, and composition requires knowing what each framework actually covers versus where it has documented blind spots.

This plugin treats framework selection as a decision, not a default. It asks about the system, the domain, the regulatory context, and the team's expertise before recommending anything. Then it applies the selected frameworks directly to the user's situation — not as a catalog dump, but as a structured analysis that produces actionable findings.

## Install

```bash
/plugin install aio-threat-models@aiocean-plugins
```

## Skills

### aio-threat-models

The skill follows a five-step workflow for every threat modeling engagement:

1. **ASK** — gather context: system type, security vs privacy vs both, domain, lifecycle phase, regulatory environment, team expertise
2. **SEARCH** — run semantic search across all 27 frameworks to find the most relevant ones for this specific situation
3. **APPLY** — walk through each selected framework directly against the user's system, identifying concrete threats
4. **COMPOSE** — synthesize across frameworks: outer loop (Shostack 4Q), system representation (DFD + trust boundaries), threat enumeration (STRIDE + LINDDUN), creative breadth (Security Cards), attack depth (Attack Trees), TTP knowledge bases (ATT&CK / ATLAS)
5. **CHALLENGE** — stress-test the approach: what does this composition likely miss? Is the depth justified? Does the team have the skills to execute it?

## Coverage

**7 volumes, 27 frameworks.** Each framework has its own markdown file covering origin, structure, when to use it, strengths, limitations, relationship to other frameworks, and primary-source references.

| Volume | Frameworks |
|--------|-----------|
| Foundations | Shostack 4Q, DFD + Trust Boundaries, Threat Modeling Manifesto |
| Core | STRIDE, PASTA, OCTAVE Allegro, Trike, VAST (DREAD included as historical reference) |
| Attacker-centric | Attack Trees, Persona non Grata, Security Cards, hTMM |
| Attack Patterns | Cyber Kill Chain, Unified Kill Chain, MITRE ATT&CK, Diamond Model, CAPEC |
| Privacy | LINDDUN, GDPR DPIA |
| AI/ML | OWASP LLM Top 10, MITRE ATLAS, NIST AI RMF, NIST AI 100-2 |
| Cloud & DevSecOps | Cloud Threat Modeling, Kubernetes Threat Matrix, Continuous Threat Modeling |

## Empirical grounding

The plugin acknowledges what the research actually shows. Scandariato et al. (2015) demonstrated that STRIDE has a high false-negative rate — practitioners miss threats systematically even when following the methodology correctly. Tuma et al. (2018) found no objective definition of completeness in threat analysis. The plugin reflects these findings: it pairs STRIDE with creative methods, flags where automation cannot replace judgment, and resists the anti-pattern of "admiration for the problem" — endless framework application without actionable findings.

DREAD is included only as a historical reference. Do not use it. CVSS and bug bars are the current standard for scoring.

## Requirements

- Node.js with `npx tsx` available (for semantic search scripts)
- No external API key required — embeddings run locally using snowflake-arctic-embed-xs

## Acknowledgment

Content synthesized from primary sources: NIST, CMU/SEI, OWASP, MITRE, Microsoft SDL, Threat Modeling Manifesto (2020), and peer-reviewed literature (Scandariato 2015, Tuma 2018, Xiong 2019).
