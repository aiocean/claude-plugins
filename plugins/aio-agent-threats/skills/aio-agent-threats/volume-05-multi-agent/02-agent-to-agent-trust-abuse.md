# Agent-to-Agent Trust Abuse

> "The agents calling those tools have no cryptographic identity either."
> — field report, r/cybersecurity, 2026 (second-paper author on MCP/agent identity)

## Core Concept

A multi-agent system runs on **implicit trust**. When the researcher agent hands a finding to
the writer agent, the writer treats that finding as ground truth. When a planner delegates to a
worker, the worker assumes the task description came from the planner. None of these handoffs
are usually *authenticated* — there is no cryptographic agent identity, no signature on the
message, no check that the "peer" is the peer it claims to be. The swarm behaves like a flat
network where everyone is on the trusted LAN.

That implicit trust is the attack surface. Once an adversary controls **one** agent (via prompt
injection, a poisoned tool, a poisoned memory — see [[01-contagious-poisoning-arcj]]), that
agent becomes a **lateral-movement pivot**: it issues instructions to peers, impersonates other
agents, or forges messages, and the peers comply because the trust was never verified in the
first place. This is the agentic analogue of a compromised host on a flat corporate network —
the single breach matters because of what it can reach, not what it is.

Three sub-abuses:
1. **Transitive trust exploitation** — ride existing trust edges to reach agents the attacker
   can't touch directly.
2. **Peer impersonation / spoofing** — claim to be a privileged agent (the orchestrator, an
   approved tool-runner) to get a privileged action performed.
3. **Confused-deputy relay** — feed adversarial content *through* a trusted agent so the target
   executes it under the trusted agent's authority.

## Origin / First Seen (URLs/arXiv)

- **CSA — "MITRE ATT&CK/ATLAS Agentic Gap Analysis"** (Cloud Security Alliance, 2026-03):
  proposes a candidate technique where a compromised agent uses existing trust relationships to
  instruct or impersonate peer agents, and notes **no adequate ATLAS entry exists** for it yet.
  https://labs.cloudsecurityalliance.org/agentic/csa-research-note-atlas-agentic-gap-analysis-20260327/
  (MEDIUM — vendor/working-group research note)
- **Promptfoo LM-Security DB — "Agent System Orchestration Hijack"** frames the relay as a
  classic **confused-deputy** attack in LLM swarms.
  https://promptfoo.dev/lm-security-db/vuln/agent-system-orchestration-hijack-11cbc618 (MEDIUM)
- **"From Prompt Injections to Protocol Exploits"** (journal, arXiv:2506.23260) — threat model
  for inter-agent workflows; reports a measured inter-agent injection success rate. (MEDIUM)
- **Guard0 — "Agent Threat Landscape 2026"** — many MAS do not verify peer legitimacy,
  enabling task injection and data interception. https://guard0.ai/blog/agent-threat-landscape-2026
  (LOW — vendor blog)

## How It Works (mechanism, propagation model, root cause)

### The trust model that fails

A typical swarm message is just text: `{"from": "orchestrator", "task": "..."}`. The `from`
field is **self-asserted**. The receiving agent has no key to verify it, so an attacker who can
emit messages onto the bus can set `from` to anything. Even without touching the bus, an
attacker who controls one agent's *output* can write prose that reads like a directive from a
higher-authority agent, and the next LLM in the chain cannot distinguish an authentic order
from a forged one — the same data-vs-control confusion that powers prompt injection, now applied
to *inter-agent* messages.

### Lateral movement

The kill chain mirrors network intrusion:

1. **Initial foothold** — compromise agent A (indirect injection via a document A reads, a
   poisoned tool A calls, poisoned memory A retrieves).
2. **Trust enumeration** — A observes which peers it can message and what they will do for it
   (which is often *everything*, because trust is implicit).
3. **Pivot** — A sends crafted instructions to peer B. Because B trusts messages from A, B
   performs actions A is not itself authorized to perform. The **confused deputy**: B's
   privileges, A's intent.
4. **Privilege aggregation** — in a swarm each agent holds a *different* slice of capability
   (one can email, one can run code, one can touch the database). By pivoting A→B→C the attacker
   assembles a capability set no single agent was trusted with. The CSA confused-deputy note
   makes this point: one injection into a shared node can reach every agent in the graph, each
   with its own permissions.

### Impersonation / spoofing

- **Role impersonation** — the attacker's text mimics system formatting ("SYSTEM: orchestrator
  override —") so a worker treats it as a control-plane instruction. The protocol-exploits
  threat model tests exactly this.
- **Agent-card spoofing** — in A2A, a forged Agent Card lets an attacker *be* a trusted agent
  from the discovery layer up. Detailed in [[05-protocol-attacks-a2a-and-mcp-transport]].
- **Identity vacuum** — field research (r/cybersecurity) found production agents have **no
  cryptographic identity**, so "who sent this" is unanswerable by design.

**Root cause (one sentence):** inter-agent messages carry *authority* but no *authentication*,
so any agent that can speak on the bus inherits the trust of whoever it claims to be.

## Attack Surface & Preconditions

- A multi-agent topology where agents accept and act on peer messages.
- **No per-message authentication** (no signed messages, no agent identity, self-asserted `from`).
- **No separation of data and control channels** — peer content and peer *instructions* arrive
  on the same channel and are fed into the LLM together.
- Heterogeneous privileges across agents (makes pivoting worthwhile).
- An initial foothold: one agent that will ingest attacker-controlled content.

## Weaponization (Authorized Lab)

On an **owned** swarm:

1. **Map trust edges.** Instrument the message bus. Log every `from`/`to`/`task`. Build the
   directed trust graph: who obeys whom, and what capability each node holds (email, code, DB).
2. **Get a foothold.** Compromise the most-connected low-privilege agent via indirect injection
   (plant the payload in a document or ticket it will read).
3. **Forge a peer.** From the foothold, emit a message with `from: "orchestrator"` (or inline
   `SYSTEM:`-style text) instructing a high-privilege peer to perform a target action. Confirm
   the peer complies without verifying identity.
4. **Chain the pivot.** Script A→B→C so the final action requires capabilities spread across
   all three. Demonstrate that no single agent would have performed it alone.
5. **Impersonate for exfil.** Have the foothold pose as the aggregator agent and request that
   peers "report their results here" — collecting data to an attacker-chosen sink.
6. **Measure.** Record pivot success rate per edge, privileges aggregated, and whether any
   control detected the forged identity. Compare against the protocol-exploits paper's reported
   inter-agent injection success rate (one paper measured ~31% for its setup — MEDIUM).
7. **Harden and re-test.** Add signed messages / per-agent identity and re-run step 3 — forged
   `from` should now be rejected.

## Real-World Instances

- **Protocol-exploits threat model (arXiv:2506.23260)** reports a measured inter-agent injection
  success rate (~31% in its test setup) and catalogs role impersonation and delegation-path
  manipulation. (MEDIUM — single study, self-reported)
- **Promptfoo orchestration-hijack entry** documents the confused-deputy relay against AutoGen,
  CrewAI, and MetaGPT configurations; see [[03-orchestrator-hijack]]. (MEDIUM)
- **CSA Agentic Gap Analysis** names agent-to-agent lateral movement as an *unmapped* technique
  (no ATLAS ID), i.e., a recognized gap rather than a catalogued in-the-wild campaign. (MEDIUM)
- **Agentic red-teaming study (arXiv:2511.15998)** shows an agent passing harvested credentials
  to another agent that then used them on a different host — lateral movement across an agent
  boundary. (MEDIUM — research demonstration)
- **Field report (r/cybersecurity, 2026-03):** live prompt-injection tests across Claude Code's
  multi-agent system and other frameworks; prior work found 3,143 findings across 159 production
  MCP servers, and the follow-up argues agents lack cryptographic identity. No per-agent auth
  observed in the wild. https://reddit.com/r/cybersecurity/comments/1s8uses/ (LOW — field report)

No confirmed, attributed, real-world agent-to-agent lateral-movement breach is public as of
2026-10; the evidence is lab demonstrations plus production-config audits showing the
precondition (missing identity) is widespread.

## Detection Signals

- **Identity mismatches** — a message claiming `from: orchestrator` arriving on an edge the
  orchestrator never uses, or out of the expected turn order.
- **Capability-use out of role** — an agent triggering actions outside its normal capability
  profile (a research agent suddenly invoking the email tool).
- **Trust-graph deviations** — edges activating that the normal workflow never exercises
  (A talking directly to C when the design routes A→B→C).
- **Instruction-shaped peer content** — peer messages containing imperative/`SYSTEM:`-style
  spans rather than data.
- **Fan-out spikes** — one agent suddenly messaging many peers (impersonating an aggregator).

## Mitigations / Hardening

- **Cryptographic agent identity** — sign every inter-agent message; verify `from` against a
  known key. Kills forged-peer and impersonation attacks at the channel.
- **Separate data and control channels** — peer *content* must never be interpretable as peer
  *instructions*. Tag and sandbox it.
- **Least privilege per agent** — scope each agent's tools/credentials to its job; use
  short-lived, narrowly scoped tokens so a pivot aggregates as little as possible.
- **Zero-trust between agents** — treat every peer message as untrusted input; authorize by
  capability tied to the resource, not by who is asking (defeats confused deputy).
- **Delegation allow-lists** — enforce the intended trust graph; reject off-graph edges.
- **Human-in-the-loop** on high-impact cross-agent actions (payments, deletes, code execution).

Full defense treatment is **Volume 8** — see [[01-detection-signals-and-monitoring]].

## Related Vectors

- [[01-contagious-poisoning-arcj]] — how a foothold becomes self-propagating across the trust graph.
- [[03-orchestrator-hijack]] — abusing trust in the *specific* agent that controls the others.
- [[04-cascading-failures]] — what forged/poisoned handoffs do to downstream decisions.
- [[05-protocol-attacks-a2a-and-mcp-transport]] — Agent Card spoofing: impersonation at the
  protocol layer.
- [[01-tool-poisoning-attack-tpa]] — a common way to get the initial foothold (Volume 3).

## References

- CSA, "ATLAS Agentic Gap Analysis," 2026 —
  https://labs.cloudsecurityalliance.org/agentic/csa-research-note-atlas-agentic-gap-analysis-20260327/ (MEDIUM)
- CSA, "Confused Deputy Attacks on Autonomous AI Agents" —
  https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-agent-confused-deputy-prompt-injection/ (MEDIUM)
- Promptfoo, "Agent System Orchestration Hijack" —
  https://promptfoo.dev/lm-security-db/vuln/agent-system-orchestration-hijack-11cbc618 (MEDIUM)
- "From Prompt Injections to Protocol Exploits," arXiv:2506.23260 (also ScienceDirect
  S2405959525001997) — https://arxiv.org/pdf/2506.23260 (MEDIUM)
- "Hiding in the AI Traffic: Abusing MCP for LLM-Powered Agentic Red Teaming," arXiv:2511.15998
  (MEDIUM)
- Guard0, "Agent Threat Landscape 2026" — https://guard0.ai/blog/agent-threat-landscape-2026 (LOW)
- r/cybersecurity field report — https://reddit.com/r/cybersecurity/comments/1s8uses/ (LOW)
