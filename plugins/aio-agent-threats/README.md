# aio-agent-threats

Curated attack-first reference for AI-agent security — how current AI agents (LLM apps, tool-calling agents, MCP servers, RAG/memory agents, multi-agent systems, autonomous coding agents) are manipulated and attacked, and how each vector is detected and mitigated. Built for an authorized red/blue lab.

Mirrors the `aio-advisor` knowledge-base pattern: a semantic-search shell over a volume-organized corpus, fronted by two skills (a guided advisor + a lookup reference).

## Skills (the network)

| Skill | Role | Use when |
|-------|------|----------|
| **aio-agent-threats** | Advisor workflow (ASK → SEARCH → APPLY → COMPOSE → STRESS-TEST) | Red-teaming or hardening a specific target agent; building an attack chain + its defense |
| **aio-agent-threats-reference** | Encyclopedia lookup | Reading the full article on one technique, a named CVE/paper, or browsing a volume |

Both skills share the `scripts/` + `volume-NN-*/` corpus inside `skills/aio-agent-threats/`.

## Corpus — 8 volumes

| Vol | Focus |
|-----|-------|
| 01 foundations | attack-surface taxonomy · instruction/data channel problem · agent kill chain · OWASP LLM + Agentic Top 10 / NIST crosswalk · trust-boundary threat modeling |
| 02 prompt-injection | direct · indirect · cross-modal · system-prompt extraction/leakage · obfuscation/encoding · delivery & persistence |
| 03 tool-and-mcp | tool poisoning (TPA) · MCP rug-pull & integrity gap · shadowing/parasitic toolchain · line-jumping/confused-deputy · excessive agency · MCP CVEs & exposure |
| 04 memory-and-context | MINJA · AgentPoison · RAG/retrieval poisoning · persistent false beliefs · cross-session environment injection · misattribution gap |
| 05 multi-agent | contagious poisoning (ARCJ) & LLM worms · agent-to-agent trust abuse · orchestrator hijack · cascading failures · A2A/transport protocol attacks |
| 06 jailbreak-evasion | multi-turn (Crescendo/STAC) · Echo Chamber · roleplay/DAN · encoding/cipher/GCG · many-shot · policy puppetry & automated jailbreaks |
| 07 supply-chain-exfiltration | coding-agent weaponization (Nx s1ngularity) · repository poisoning · data-exfil channels · real incidents (Devin, Copilot CVEs) · Anthropic espionage case · model/dependency supply chain |
| 08 defense-hardening | detection & monitoring · input isolation/spotlighting · dual-LLM & CaMeL · least-privilege & sandboxing · provenance & tool attestation · defense-in-depth & frameworks |

Each article follows one schema: Core Concept · Origin/First Seen · How It Works · Attack Surface & Preconditions · Weaponization (Authorized Lab) · Real-World Instances · Detection Signals · Mitigations/Hardening · Related Vectors · References. Every factual claim carries a source URL and a HIGH/MEDIUM/LOW confidence label.

## Semantic search

```bash
cd ~/projects/learnSecurity/knowledges/aio-agent-threats/skills/aio-agent-threats/scripts
npx tsx build-embeddings.ts          # once, builds embeddings.json (gitignored node_modules auto-install)
npx tsx search-vectors.ts "indirect injection via a poisoned GitHub issue" --top 6
```

Uses `snowflake-arctic-embed-xs` (384-dim, local, no API key) over a prebuilt `embeddings.json`.

## Authorization

This is offensive + defensive content for authorized security research in a lab the operator owns. Apply only to systems you are authorized to test.
