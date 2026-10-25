# Detection Signals & Monitoring for Agent Attacks

> "You can't debug what you can't see."
> — Microsoft Foundry / OpenTelemetry AI observability guidance, 2025

## Core Concept

Detection is the **first layer that assumes the other layers failed**. Prevention (spotlighting, dual-LLM, least privilege) reduces attack success rate but never reaches zero (see [[06-defense-in-depth-and-frameworks]]). Detection turns an agent from an opaque black box into an instrumented process whose every decision — which tool, with what arguments, under whose authority, on whose data — is logged, traced, and scored for anomaly.

The decisive framing for agents comes from the **Misattribution Gap** (see [[06-misattribution-gap]] in Volume 01): an LLM cannot reliably tell *where* an instruction came from, so by the time a malicious instruction reaches the model's reasoning it looks identical to a legitimate one. The consequence for defenders is concrete: **you cannot detect most attacks at the prompt text alone** — you must instrument the **data layer** (what was retrieved/remembered) and the **action layer** (what tool got called, with what effect), because that is where the attack's *effect* becomes observable even when its *text* is invisible. Watch outputs and side effects, not just inputs.

Detection does not stop an attack mid-flight unless wired to a kill-switch; its primary value is **fast incident response, forensics, and feedback into prevention tuning**. Treat it as the telemetry that makes the rest of the program improvable.

## Origin / First Seen (URLs)

- OpenTelemetry **GenAI semantic conventions** — standard span names `invoke_agent`, `chat`, `execute_tool` — https://nango.dev/blog/opentelemetry-ai-agent-observability (MEDIUM, vendor guide, 2025)
- Microsoft Foundry + OTel AI observability — https://itnext.io/you-cant-debug-what-you-can-t-see-ai-observability-with-opentelemetry-microsoft-foundry-f90407b90e17 (MEDIUM, 2025)
- Runtime monitoring as "treat the agent as an untrusted process" — https://hol.org/blog/prompt-injection-defense-2026-what-works (LOW, blog, 2026)
- Instruction-in-data classifiers benchmarked — IBM "Adversarial Prompt Evaluation", arXiv:2502.15427 (HIGH, 2025)

## How It Works (the defense mechanism)

Detection is organised **per attack class**, each with its own telemetry source and signal. The core discipline: log the decision context, not just the text.

### 1. Anomalous tool-call detection (action layer)
The richest signal. For every tool invocation, emit a structured span (`execute_tool`) capturing: tool name, full argument set, the agent/session identity, the authorization decision, the data sources in context when the call was decided, and the result size. Signals worth alerting on:
- **Tool never-before-called by this agent role**, or called outside its normal sequence.
- **Argument anomaly**: a recipient, URL, file path, or amount outside the historical distribution — e.g. an email tool suddenly addressing an external domain, or a shell tool with `curl | sh`.
- **Egress to a new destination** (see §4).
- **Call rate / loop detection**: the same tool firing in a tight loop (a sign of goal-hijack or runaway). Gravitee's pattern explicitly kills "runaway runs" on loop signals (MEDIUM, vendor).
- **Authorization-decision mismatch**: a call that *would have been* denied, or that followed a failed human-approval step.

### 2. Memory-write anomaly detection (data layer)
Directly targets memory poisoning ([[01-memory-poisoning-minja]]). The MINJA class works precisely because the poisoning is written to persistent memory in one session and triggers in a later one — so prompt-time inspection misses it entirely. Instrument the **memory store**, not the prompt:
- Log every memory *write*: who wrote it, source utterance, whether the source was trusted or untrusted-retrieved content.
- Flag writes that contain **imperative/instruction-like text** ("always...", "from now on...", "when you see X, do Y") — a memory record should hold facts, not standing orders.
- Diff stored records against their write-time provenance; alert on records whose provenance is untrusted but whose content reads as a directive.
- Alert on cross-session retrieval of a record that was written by a *different, lower-trust* principal.

### 3. Instruction-in-data classifiers (input layer, advisory only)
Run a classifier over all retrieved/tool-returned content *before* it enters context, scoring "does this data contain embedded instructions aimed at the model?" This is the detection analogue of spotlighting ([[02-input-isolation-and-spotlighting]]).
- Benchmarked tools: a fine-tuned **DeBERTa** prompt-injection classifier reached **0.97 F1**; **Llama Guard 2** reached 0.826 F1 / 0.733 recall; a NeMo-style input-moderation rail only 0.455 F1 (IBM arXiv:2502.15427, HIGH).
- **Treat as advisory, never as a gate.** Recall well below 1.0 means a meaningful fraction of injections pass. OWASP's MCP control explicitly labels description scanning an "advisory chip," not an enforced block.

### 4. Egress monitoring (exfiltration layer)
The last chokepoint before data leaves. Targets data-exfiltration ([[03-data-exfiltration-channels]] class).
- Maintain an **egress allowlist** of permitted destinations (domains, API hosts, recipient domains); every outbound call to a non-allowlisted destination is an alert and ideally a block (see [[04-least-privilege-and-sandboxing]]).
- Watch for **data-in-URL** patterns: secrets, base64 blobs, or long opaque query strings appended to image/markdown URLs (classic zero-click markdown-image exfil).
- Correlate egress with recently-ingested untrusted content: an outbound call shortly after a web-page read is higher risk.

### 5. Trace review (forensic layer)
End-to-end traces linking `invoke_agent` → `chat` → `execute_tool` let a responder reconstruct *why* a bad action was taken: which retrieved chunk introduced the instruction, which model turn adopted it, which tool executed it. Capture model id, token counts, latency, retry count, tool name, **authorization decision**, and **escalation status** — while keeping sensitive content out of the trace body (Gravitee, MEDIUM).

### 6. Provenance-mismatch detection (cross-layer)
The sharpest single signal derived from the Misattribution Gap: tag every context span with its source (system / user / retrieved / tool / memory), then alert whenever an **action's justification traces back to an untrusted span**. Example: the agent sends email to `attacker@evil.com`; the trace shows that recipient value originated from a retrieved web page, not the user turn. No classifier is needed — the *data-flow* itself is the anomaly. This is the detection shadow of CaMeL's capability tracking ([[03-dual-llm-and-camel]]): even without enforcing policies, logging the provenance of each action's inputs surfaces the attack.

### What to log — per attack class

| Attack class | Log source | Fields that matter | Alert trigger |
|---|---|---|---|
| [[01-tool-poisoning-attack-tpa]] | tool-call span | tool, args, tool-description hash | arg outside distribution; hash change |
| [[01-memory-poisoning-minja]] | memory-write audit | writer, source provenance, record text | imperative text from untrusted source |
| [[02-indirect-injection]] | retrieval span + classifier | chunk source, PI-score | high PI-score chunk that then drove an action |
| [[03-data-exfiltration-channels]] | egress span | destination, payload size, recency of ingest | non-allowlisted destination; secret-in-URL |
| goal hijack / runaway | agent-loop counter | tool-call rate, repeat count | tight loop; plan diverges from user goal |
| [[02-agent-to-agent-trust-abuse]] | inter-agent message span | sender, receiver, instruction content | one agent instructing another to escalate |

A worked example: an agent summarising a shared document suddenly calls the `http_get` tool with a URL ending `?d=<base64>`. The egress span fires (non-allowlisted host), the provenance-mismatch check shows the URL was assembled from retrieved document text, and the trace links it to a chunk the advisory classifier had already flagged PI-score 0.8. Three independent signals converge on one zero-click markdown-exfil attempt — any one alone might be noise; together they are a high-confidence incident.

## What It Defends Against (attack classes / links)

| Signal | Primary attack class |
|---|---|
| Anomalous tool-call | [[01-tool-poisoning-attack-tpa]], tool misuse, excessive agency, goal hijack |
| Memory-write anomaly | [[01-memory-poisoning-minja]] |
| Instruction-in-data classifier | indirect [[02-indirect-injection]], RAG poisoning |
| Egress monitoring | [[03-data-exfiltration-channels]], credential theft |
| Trace review | all classes — forensics and root-cause |
| Loop / rate anomaly | runaway agents, [[02-agent-to-agent-trust-abuse]] cascades |

### Why the memory/tool layers, not the prompt (the Misattribution corollary)
The Misattribution Gap says the model cannot tell a planted instruction from a real one *at read time*. The corollary for detection is structural, not incidental: **inspecting the prompt for "is this an injection?" is the one place you are guaranteed to be at a disadvantage**, because the attack's whole design is to look native there. But the attack must eventually *do* something — write a directive to memory, call a tool with an attacker-chosen argument, open an egress channel — and those effects live in layers the attacker does not control the rendering of. Instrument where the attack is forced to materialise, not where it is designed to hide. This is why memory-write audits and tool-call anomaly detection outperform prompt classifiers for agentic attacks, and why a classifier is only ever an advisory supplement.

### Baselining and anomaly thresholds
Anomaly detection needs a normal to compare against. For each agent role, collect 1–2 weeks of clean traffic and learn the per-role distribution of: tool-call sequences, argument shapes (recipient domains, path roots, amount ranges), egress destinations, call rate, and context-size. Set alert thresholds at the tail of the observed distribution, not at a fixed global value — a value that is routine for a bulk-email agent is a red flag for a code-review agent. Re-baseline after any legitimate behaviour change (new tool, new workflow) so drift does not silently erode the signal or flood the queue with false positives.

## Deployment (Authorized Lab)

In an owned agent stack:
1. **Instrument with OTel GenAI conventions.** Emit `invoke_agent`, `chat`, `execute_tool` spans. Use a standard schema so the same signals work across model providers.
2. **Structured tool-call log.** For each call: `{timestamp, agent_role, session_id, tool, args_hash, args_redacted, data_sources_in_context, authz_decision, egress_destination, result_bytes}`. Ship to a SIEM or OpenObserve/SigNoz-style backend.
3. **Memory-write audit table.** Separate append-only log of every memory mutation with provenance; run a nightly job flagging imperative-text records from untrusted provenance.
4. **Egress allowlist enforced at the sandbox boundary** (not in the model): deny-by-default network egress, alert on every denied attempt.
5. **Advisory classifier** on retrieved content; attach a risk score to each chunk, surface in the trace, do not block on it alone.
6. **Live guardrail hooks**: on loop detection, token-budget breach, or egress-to-unknown, kill the run and page a human. Postmortem agent explains the failed run afterward.
7. **Baseline then alert.** Collect 1–2 weeks of normal traffic to establish per-role tool/argument/egress distributions before turning on anomaly alerts.
8. **Wire high-confidence signals to enforcement.** A detection that only logs is a completed attack; route the convergent-signal cases (e.g. non-allowlisted egress + untrusted-provenance argument) to an automatic block or run-kill, not just an alert queue.

### Sampling and retention
Full-fidelity traces on every run are expensive and themselves a disclosure surface. A workable policy: structured metadata (tool, args-hash, provenance tags, authz decision, egress destination) on **100%** of runs — cheap and the load-bearing security signal; full prompt/output bodies sampled or captured only on **flagged** runs (anomaly, denied egress, approval-override) for forensics, with sensitive fields redacted and short retention. Never gate security alerting on the sampled bodies — alert on the always-on metadata.

### Feedback loop into prevention
Detection earns its cost only if it changes the other layers. Every confirmed incident should produce: a new or tuned anomaly rule, a tightened allowlist or egress rule ([[04-least-privilege-and-sandboxing]]), a new instruction-in-data training example for the classifier, and — if the attack rode a tool — a tool-description review ([[05-provenance-tool-attestation-and-mcp-hardening]]). In NIST AI RMF terms this is the MEASURE→MANAGE loop ([[06-defense-in-depth-and-frameworks]]); a detection program with no feedback edge is just expensive logging.

## Limitations & Bypass

- **Classifiers miss.** No prompt-injection classifier reaches full recall; attackers iterate against the public ones (Llama Guard, Lakera) until they find a passing phrasing. Detection narrows the gap, never closes it (IBM arXiv:2502.15427, HIGH).
- **Low-and-slow evasion.** An attacker who keeps tool arguments and egress destinations inside the learned normal distribution produces no anomaly. Memory poisoning that mimics legitimate fact-writes evades the imperative-text filter.
- **Alert fatigue.** Too-sensitive anomaly thresholds drown responders; too-loose miss attacks. Same tradeoff as human-approval gates (see [[04-least-privilege-and-sandboxing]]).
- **Detection is not prevention.** Unless wired to an enforced kill-switch/block, a logged attack is a *completed* attack. Egress and authz must be enforced in the imperative shell, not merely observed.
- **Instrumentation gaps.** OTel traces usually miss upstream tool failures (OAuth, rate-limit) unless each integration is hand-instrumented (Nango, MEDIUM) — blind spots become evasion paths.
- **Content-in-trace risk.** Logging full prompts/outputs for forensics can itself become a data-disclosure surface; redact.

## Evidence / Effectiveness

- Instruction-in-data classifier benchmark — fine-tuned DeBERTa 0.97 F1, Llama Guard 2 0.826 F1 / 0.733 recall, NeMo input rail 0.455 F1 (IBM, arXiv:2502.15427) — **HIGH** (independent, peer-style benchmark; early-2025 model versions, numbers may drift).
- OTel GenAI semantic conventions as the telemetry base — **MEDIUM** (vendor/community guides, consistent across multiple sources).
- Memory-layer instrumentation as the only reliable vantage on MINJA-class attacks — derived from the Misattribution Gap thesis (see [[06-misattribution-gap]]) — **MEDIUM** (sound by construction; no large deployed-detection study yet published).
- Live-guardrail kill-on-loop and egress gating — **MEDIUM/LOW** (vendor blogs: Gravitee, OpenObserve, SigNoz; plausible, not independently benchmarked).
- OTel GenAI span model (`invoke_agent` / `chat` / `execute_tool`) as a provider-agnostic schema — Nango, multiple vendors — **MEDIUM** (emerging standard; integration-side spans must be hand-instrumented, a known blind spot).

### Detection as the layer that makes the others improvable
The other five layers are static: once deployed, they catch what they catch. Detection is the only layer that *learns* — every incident it surfaces becomes a tuning signal for prevention, a new test case for the red team, and evidence for whether a given control is actually pulling its weight in production. A defense-in-depth program without detection is flying blind: it cannot tell which layers are load-bearing, cannot measure its own attack success rate, and cannot prove to an auditor that the controls work. That is the deeper reason detection maps to NIST AI RMF's MEASURE function ([[06-defense-in-depth-and-frameworks]]) — not because logging is compliance theatre, but because you cannot MANAGE what you do not MEASURE.

## Related Defenses

- [[02-input-isolation-and-spotlighting]] — the prevention analogue of the instruction-in-data classifier
- [[04-least-privilege-and-sandboxing]] — egress allowlists and authz decisions become the signals logged here
- [[05-provenance-tool-attestation-and-mcp-hardening]] — tool-description fingerprinting is both a control and a detection signal
- [[06-defense-in-depth-and-frameworks]] — where detection sits in the layered model and maps to NIST AI RMF MEASURE/MANAGE

## References

- IBM, "Adversarial Prompt Evaluation: Systematic Benchmarking of Guardrails Against Prompt Input Attacks", arXiv:2502.15427, 2025 — https://arxiv.org/pdf/2502.15427 — **HIGH**
- OpenTelemetry GenAI agent observability — https://nango.dev/blog/opentelemetry-ai-agent-observability — **MEDIUM**
- Microsoft Foundry + OTel observability — https://itnext.io/you-cant-debug-what-you-can-t-see-ai-observability-with-opentelemetry-microsoft-foundry-f90407b90e17 — **MEDIUM**
- Gravitee, AI agent OTel telemetry & guardrails — https://gravitee.io/corpus/gen-1308/ (observability-on-the-trail) — **LOW/MEDIUM** (vendor)
- "Prompt Injection Defense in 2026: What Works When Detection Is Impossible" — https://hol.org/blog/prompt-injection-defense-2026-what-works — **LOW** (blog)
- "Agent black box: teaching an AI agent to explain its own failures" (postmortem-agent pattern) — https://dev.to/manibhargava4/agent-black-box-teaching-an-ai-agent-to-explain-its-own-failures-2c38 — **LOW**

*Note: detection numbers here are classifier benchmarks; no large-scale study yet measures end-to-end agentic-attack detection in production, so the operational effectiveness of the memory/tool-layer signals is MEDIUM-confidence by construction rather than by measurement.*
