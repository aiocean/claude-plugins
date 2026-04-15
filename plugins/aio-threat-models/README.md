# aio-threat-models

Threat modeling knowledge advisor with semantic search across 27 frameworks — STRIDE, LINDDUN, PASTA, OCTAVE, Attack Trees, MITRE ATT&CK/ATLAS, Kill Chain, NIST AI RMF, OWASP LLM Top 10, and more.

## What This Is

A **knowledge skill** (à la `aio-mental-models`) that:

1. **Catalogs 27 threat modeling frameworks** across 7 volumes — each with its own markdown file covering origin, structure, when-to-use, strengths, limitations, cross-framework relations, and primary-source citations.
2. **Embeds semantic search** via pre-computed embeddings (snowflake-arctic-embed-xs, runs locally, no API key).
3. **Guides framework selection, application, and cross-framework composition** through a 5-step workflow (ASK → SEARCH → APPLY → COMPOSE → CHALLENGE).

## Coverage (7 Volumes, 27 Frameworks)

| Volume | Frameworks |
|---|---|
| 1. Foundations | Shostack 4Q, DFD + Trust Boundaries, Threat Modeling Manifesto |
| 2. Core Frameworks | STRIDE, DREAD, PASTA, OCTAVE Allegro, Trike, VAST |
| 3. Attacker-centric | Attack Trees, Persona non Grata, Security Cards, hTMM |
| 4. Attack Patterns | Lockheed Martin Kill Chain, Unified Kill Chain, MITRE ATT&CK, Diamond Model, CAPEC |
| 5. Privacy | LINDDUN, GDPR DPIA |
| 6. AI/ML | OWASP Top 10 for LLM, MITRE ATLAS, NIST AI RMF, NIST AI 100-2 |
| 7. Cloud & DevSecOps | Cloud Threat Modeling, Kubernetes Threat Matrix, Continuous Threat Modeling |

## Triggers

"threat model", "STRIDE", "LINDDUN", "PASTA", "MITRE ATT&CK", "attack surface", "privacy review", "DPIA", "adversarial ML", "secure architecture review", "which framework", "threat modeling for AI", etc.

## Scripts

- `list-models.sh` — list all 27 frameworks, filter by volume, search by keyword
- `search-models.ts` — semantic search (cosine similarity against pre-computed embeddings)
- `build-embeddings.ts` — rebuild `embeddings.json` after content changes

## Acknowledgment

Structure and semantic search pattern adapted from `aio-mental-models`. Content synthesized from primary sources: NIST, CMU/SEI, OWASP, MITRE, Microsoft SDL, Threat Modeling Manifesto, peer-reviewed papers (Scandariato 2015, Tuma 2018, Xiong 2019).
