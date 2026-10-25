---
name: aio-agent-threats-reference
description: |
  Lookup over the AI-agent attack-vector encyclopedia (8 volumes, ~45 articles on prompt injection, tool/MCP poisoning, memory poisoning, multi-agent attacks, jailbreaks, coding-agent supply-chain, and defenses). Use when you need to read the full article on a specific AI-agent attack or defense technique, look up a named vector/CVE/paper (TPA, MINJA, AgentPoison, Crescendo, Echo Chamber, CaMeL, Nx s1ngularity, CamoLeak, Policy Puppetry), browse a whole volume, or confirm a fact and its source. Use the sibling aio-agent-threats skill instead when you need the guided red/blue workflow for a specific target.
when_to_use: look up agent attack vector, read full article, find paper on prompt injection, what is MINJA, what is tool poisoning, CVE for MCP, jailbreak technique reference, browse attack vectors, agent security encyclopedia, cite source for agent attack
argument-hint: "Technique, vector, CVE, paper, or volume to look up"
effort: medium
---

# AI-Agent Attack-Vector Reference

Semantic-search lookup over the `aio-agent-threats` corpus. This skill retrieves and reads; for a guided engagement workflow use the sibling **aio-agent-threats** advisor skill.

The corpus lives in the sibling skill folder `${CLAUDE_PLUGIN_ROOT}/skills/aio-agent-threats/`: `volume-NN-*/` directories, with search scripts in `scripts/`.

## Lookup Workflow

### 1. Search by meaning

```bash
cd "${CLAUDE_PLUGIN_ROOT}/skills/aio-agent-threats/scripts" && npx tsx search-vectors.ts "<what you're looking for>" --top 6 --json
# first run only, if embeddings.json is missing: npx tsx build-embeddings.ts
```

Returns ranked `{title, volume, file, score}`. Read the full file for the top hits — the `file` field is the path under `${CLAUDE_PLUGIN_ROOT}/skills/aio-agent-threats/`.

### 2. Browse a volume

List and read articles directly:

```bash
ls "${CLAUDE_PLUGIN_ROOT}/skills/aio-agent-threats/volume-03-tool-and-mcp/"
```

| Vol | Focus |
|---|---|
| 01 foundations | attack-surface taxonomy, instruction/data channel, kill chain, OWASP/NIST crosswalk, trust boundaries |
| 02 prompt-injection | direct, indirect, cross-modal, system-prompt leakage, obfuscation, delivery |
| 03 tool-and-mcp | tool poisoning, rug-pull, shadowing, line-jumping, excessive agency, MCP CVEs |
| 04 memory-and-context | MINJA, AgentPoison, RAG poisoning, persistent false beliefs, cross-session, misattribution gap |
| 05 multi-agent | contagious poisoning/worms, A2A trust, orchestrator hijack, cascading failures, protocol attacks |
| 06 jailbreak-evasion | Crescendo/STAC, Echo Chamber, roleplay/DAN, encoding/GCG, many-shot, policy puppetry |
| 07 supply-chain-exfil | coding-agent weaponization, repo poisoning, exfil channels, real incidents, espionage case, model supply chain |
| 08 defense-hardening | detection, spotlighting, dual-LLM/CaMeL, least-privilege, provenance/attestation, defense-in-depth |

### 3. Read the article

Each article carries: Core Concept · Origin/First Seen · How It Works · Attack Surface · Weaponization (lab) · Real-World Instances · Detection · Mitigations · Related Vectors · References. Every factual claim carries a source URL and a HIGH/MEDIUM/LOW confidence label — **carry that label through** into whatever you report.

## Common Mistakes

- Answering from the title/snippet alone — read the full article; the nuance and confidence labels are in the body.
- Dropping confidence labels — many figures are preprint/vendor-reported; preserve the article's label.
- Using this for a live engagement — switch to the **aio-agent-threats** advisor skill for the ASK→SEARCH→APPLY→COMPOSE→STRESS-TEST workflow.
