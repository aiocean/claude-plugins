# aio-advisor

Curated decision-support reference for Claude Code — three independently-triggered knowledge bases behind one semantic-search shell. Each routes a problem to the most relevant entries, applies them, synthesizes an answer, and stress-tests it with a counter-frame.

## Skills

| Skill | What it covers | Corpus |
|-------|----------------|--------|
| **aio-mental-models** | General reasoning & decision-making — first principles, inversion, second-order thinking, opportunity cost, probabilistic thinking, … | 54 models in 4 volumes |
| **aio-threat-models** | Security, privacy & AI/ML threat modeling — STRIDE, LINDDUN, PASTA, OCTAVE, Attack Trees, MITRE ATT&CK/ATLAS, Kill Chain, NIST AI RMF, OWASP LLM Top 10, K8s Threat Matrix | 27 frameworks in 7 volumes |
| **aio-architect-advisor** | Architecture *decisions* — a 5-step workflow that picks, applies, and stress-tests patterns for a system you're designing | — |
| **aio-architect-reference** | Architecture *lookup* — semantic search over the pattern encyclopedia; read full articles, compare patterns, browse by volume | 137 patterns in 10 volumes |

The `aio-architect-*` skills share the plugin-root `scripts/` + `volume-*/` corpus; `aio-mental-models` and `aio-threat-models` each carry their own self-contained `scripts/` + `volume-*/` inside their skill folder.

## Install

```bash
/plugin install aio-advisor@aiocean-plugins
# or
npx skills add aiocean/claude-plugins -s aio-advisor
```

## Semantic search setup

Each knowledge base ships a `search-*.ts` script that runs over a prebuilt `embeddings.json`. Where an embeddings file is gitignored, build it once with the skill's `build-embeddings.ts` before first search (see the individual SKILL.md).
