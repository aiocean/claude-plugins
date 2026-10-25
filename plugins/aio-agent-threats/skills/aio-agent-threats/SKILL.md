---
name: aio-agent-threats
description: |
  AI-agent attack-vector advisor — selects the relevant manipulation/attack vectors for a target agent (LLM app, tool-calling agent, MCP server, RAG/memory agent, multi-agent system, coding agent), walks through how each is weaponized in an authorized lab, and pairs every vector with its detection + mitigation. Use when red-teaming or threat-modeling an AI agent, assessing an agent's attack surface, building an attack chain against an owned agent, reviewing an MCP/tool integration for abuse, hardening an agent against prompt injection / tool poisoning / memory poisoning / jailbreaks, or triaging an AI-agent security incident.
when_to_use: AI agent attack, prompt injection, indirect injection, cross-modal injection, system prompt leakage, tool poisoning, MCP security, rug pull, shadowing, excessive agency, memory poisoning, MINJA, AgentPoison, RAG poisoning, context poisoning, multi-agent attack, contagious poisoning, agent worm, Morris II, orchestrator hijack, jailbreak, Crescendo, Echo Chamber, many-shot, policy puppetry, GCG, coding agent weaponization, Nx s1ngularity, repository poisoning, data exfiltration, CamoLeak, YOLO mode, agent kill chain, red team AI agent, agent threat model, spotlighting, dual LLM, CaMeL, guardrail, agent hardening
argument-hint: "Target agent, system, or attack/defense question"
effort: high
---

# AI-Agent Attack-Vector Advisor

> "Agents chain tool calls and act with reduced oversight — the autonomy is the exploit primitive."

This skill routes an AI-agent security problem to the right attack vectors in the `aio-agent-threats` corpus (8 volumes, ~45 articles), shows how each is weaponized in an **authorized lab the operator owns**, and pairs every vector with detection + mitigation. It is attack-first but complete: offense drives the analysis, defense closes it.

## Scope & Authorization

This corpus is for authorized security research — the operator owns the target agents, networks, and tooling. Content is written for a red/blue lab: mechanisms, sanitized example payloads, PoC recipes, and the defenses that stop them. Apply it only to systems you are authorized to test.

## Workflow: How to Use This Skill

When triggered, follow these five steps. Do NOT just dump vector descriptions — guide the user through their specific target.

### Step 1: ASK — Understand the Target Agent

Gather context (if not already clear):

- **What kind of agent?** Plain LLM app · tool-calling agent · MCP client/server · RAG / long-term-memory agent · multi-agent system · autonomous coding agent · browser/computer-use agent.
- **What does it ingest?** User prompts only, or also web pages, emails, PDFs, repo/issue content, tool outputs, retrieved documents, images/audio.
- **What can it DO?** Tool/capability inventory, shell/file/network access, auto-approve vs human-in-the-loop, egress allowed.
- **Does it persist state?** Conversation memory, long-term memory store, RAG index, shared multi-agent memory.
- **Goal of this engagement?** Red-team / build an attack chain · threat-model the attack surface · harden/defend · triage an incident.

If the message already has enough context, go to Step 2.

### Step 2: SEARCH — Find Relevant Vectors

**Run semantic search** with the user's problem as the query, then cross-reference the routing table.

```bash
SCRIPTS="${CLAUDE_PLUGIN_ROOT}/skills/aio-agent-threats/scripts"
cd "$SCRIPTS" && npx tsx search-vectors.ts "<the user's agent security problem>" --top 6 --json
# first run only, if embeddings.json is missing: npx tsx build-embeddings.ts
```

Read the full markdown for each top hit before proceeding. Routing table (secondary guide):

| Target / situation | Start with (volume) |
|---|---|
| Agent reads untrusted external content (web/email/PDF/repo) | Vol 02 prompt-injection — esp. `[[02-indirect-injection]]` |
| Agent renders images / does OCR / takes screenshots | Vol 02 `[[03-cross-modal-injection]]` |
| Agent uses MCP servers / third-party tools | Vol 03 tool-and-mcp — `[[01-tool-poisoning-attack-tpa]]`, `[[02-mcp-rug-pull-and-integrity-gap]]` |
| Agent has broad capabilities / auto-approve | Vol 03 `[[05-excessive-agency-and-permission-abuse]]` |
| Agent has long-term memory / RAG | Vol 04 memory-and-context — `[[01-memory-poisoning-minja]]`, `[[03-rag-retrieval-poisoning]]` |
| Multi-agent / orchestrator / swarm | Vol 05 multi-agent |
| Need to defeat model safety / guardrails | Vol 06 jailbreak-evasion |
| Autonomous coding agent / CI / repo automation | Vol 07 `[[01-coding-agent-weaponization-nx]]`, `[[02-repository-poisoning]]` |
| "How do I defend / harden this?" | Vol 08 defense-hardening |
| Framing the whole engagement | Vol 01 foundations — `[[03-agent-kill-chain]]`, `[[05-trust-boundaries-and-threat-model]]` |

State which vectors you selected and **why they fit this target**.

### Step 3: APPLY — Walk Through Each Vector

For each selected vector, applied to the user's specific target:

- Name it + its core mechanism (one sentence).
- Which **trust boundary / ingested channel / capability** of THIS target it abuses.
- The **weaponization** step for an owned lab (payload shape, delivery, chaining).
- Its **detection signals** and **mitigations**.
- Confidence label (HIGH/MEDIUM/LOW) on efficacy against this target.

### Step 4: COMPOSE — Build the Chain (and the Defense)

Real engagements chain vectors along the agent kill chain (`[[03-agent-kill-chain]]`):

- **Delivery**: how the payload reaches the agent (indirect injection, poisoned tool, poisoned memory record).
- **Execution**: which tool/capability it triggers.
- **Escalation**: excessive agency / confused deputy / self-granted permission.
- **Persistence**: memory poisoning for cross-session survival.
- **Exfiltration/C2**: egress channel (image render, DNS, tool call).

Then map the **matching defense** for each stage from Vol 08 (spotlighting, dual-LLM/CaMeL, least-privilege, provenance, egress allowlist, monitoring).

### Step 5: STRESS-TEST — Counter-frame

Before finishing, red-team your own analysis:

- What would make this attack FAIL against this target (a guardrail, a sandbox, a human gate)?
- What is the single highest-leverage defense that breaks the whole chain?
- Which claims rest on vendor/preprint sources — label them and say what to verify.

## Corpus Map

| Vol | Focus |
|---|---|
| 01 foundations | attack-surface taxonomy, instruction/data channel, agent kill chain, OWASP/NIST crosswalk, trust-boundary threat modeling |
| 02 prompt-injection | direct, indirect, cross-modal, system-prompt leakage, obfuscation, delivery/persistence |
| 03 tool-and-mcp | tool poisoning (TPA), rug-pull, shadowing, line-jumping/confused-deputy, excessive agency, MCP CVEs |
| 04 memory-and-context | MINJA, AgentPoison, RAG poisoning, persistent false beliefs, cross-session injection, misattribution gap |
| 05 multi-agent | contagious poisoning/worms, A2A trust abuse, orchestrator hijack, cascading failures, protocol attacks |
| 06 jailbreak-evasion | multi-turn/Crescendo/STAC, Echo Chamber, roleplay/DAN, encoding/cipher/GCG, many-shot, policy puppetry |
| 07 supply-chain-exfil | coding-agent weaponization (Nx), repo poisoning, exfil channels, real incidents, Anthropic espionage case, model supply chain |
| 08 defense-hardening | detection/monitoring, spotlighting, dual-LLM/CaMeL, least-privilege/sandboxing, provenance/attestation, defense-in-depth |

## Semantic Search Setup

The search runs over a prebuilt `scripts/embeddings.json` using `snowflake-arctic-embed-xs` (local, no API key). If the file is missing, build it once: `cd "${CLAUDE_PLUGIN_ROOT}/skills/aio-agent-threats/scripts" && npx tsx build-embeddings.ts`. Dependencies auto-install on first run.

## Common Mistakes

- **Dumping all vectors.** Route to the ones that match the target's actual ingested channels and capabilities.
- **Attack without defense.** Every composed chain must end with the Vol 08 defense that breaks it (user chose attack-first *and* defensive).
- **Trusting vendor numbers.** Many success-rate figures are preprint/vendor-reported — carry the article's confidence label through to your answer.
- **Ignoring preconditions.** A vector that needs memory enabled or a specific tool is moot if the target lacks it — check Step 1 inventory first.
