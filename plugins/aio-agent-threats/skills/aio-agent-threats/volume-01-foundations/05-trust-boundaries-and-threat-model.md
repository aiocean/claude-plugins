# Trust Boundaries and Threat-Modeling an Agent

> "Authorization has to bind the requester, target, operation, and context before the privileged action runs."
> — Aurascape, on the confused-deputy problem, 2025

## Core Concept

Threat-modeling an agent means answering one question for every input it reads: *who controls this text, and what can the agent do because of it?* The method has three moves — enumerate **trust boundaries** (where control changes hands), tag **data provenance** (which source each token came from), and inventory **tool capabilities** (what each action can touch). Then apply a classic structuring technique — STRIDE per boundary, or an attack tree per objective — to find where untrusted provenance meets dangerous capability. That intersection is the vulnerability; everything else is noise.

## Core Concept — why the usual threat model breaks

In a classic app, trust boundaries are visible: the network edge, the auth layer, the DB connection. In an agent, the critical boundary is **inside the context window** and is invisible to the architecture, because the model gives trusted and untrusted tokens the same standing ([[02-instruction-data-channel-problem]]). So the first job is to make the invisible boundary explicit: draw the line between content the operator controls and content an attacker can influence, even though both end up in the same prompt.

## Origin / First Seen

- **STRIDE** — Microsoft's threat-modeling mnemonic (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege), 1999; still the standard per-boundary analysis and applied to LLM apps in the reference KB's OWASP↔STRIDE mapping. — **HIGH** (established method).
- **Attack trees** — Bruce Schneier, 1999; the standard per-objective decomposition.
- **Confused deputy** — Norm Hardy, 1988; the exact pattern agents reinstantiate (a privileged component acts for a less-privileged caller without checking whether the caller should trigger the action). Applied to agents by Quarkslab and others, 2025-2026. https://blog.quarkslab.com/agentic-ai-the-confused-deputy-problem.html — **MEDIUM**.
- **Lethal trifecta** — Willison's agent-specific threat-model heuristic, 16 June 2025. https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ — **HIGH**.

## How It Works — the method, step by step

### Step 1: Enumerate trust boundaries

A trust boundary is any point where control of content changes hands. For a typical agent:

| Boundary | Trusted side | Untrusted side |
|---|---|---|
| System prompt vs. user turn | operator-authored prompt | the end user |
| User turn vs. ingested content | user request | web pages, docs, emails, RAG chunks |
| Agent vs. tool output | agent's own reasoning | data a tool returned (attacker may control the data source) |
| Agent vs. memory | this session's intent | anything ever written to durable memory |
| Agent vs. peer agent | self | another agent's messages (vol 5) |
| Model vs. weights/config | runtime | supply chain (vol 7) |

### Step 2: Tag data provenance

For every channel, label the *source* and the *controller*. The question is never "is this data safe?" but "who could have written this, and would I let them issue a command?" Provenance is binary for threat-modeling: **operator-controlled** or **attacker-influenceable**. If an attacker can place a single token in a channel, treat the whole channel as attacker-controlled. This is the discipline that makes the invisible context-window boundary concrete.

### Step 3: Inventory tool capabilities

List every tool and classify it on two axes:

- **Reads sensitive data?** (private repos, PII, secrets, other tenants' data)
- **Causes side effects / external communication?** (HTTP, email, file write, code exec, payment, PR)

A tool that does neither is low-risk. A tool that reads sensitive data *and* a separate tool that communicates externally together form the lethal trifecta when the agent is also exposed to untrusted content. Each integration accepts arguments the agent constructs; if those arguments derive from attacker-influenced provenance, the downstream system inherits the attack. https://aurascape.ai/answers/confused-deputy-ai-agents/ — **MEDIUM**.

### Step 4: STRIDE per boundary

Walk each boundary against STRIDE. The agent-specific instances:

| STRIDE | Agent instance |
|---|---|
| **S**poofing | Injected content spoofs the *source of instructions* — data impersonates a trusted command |
| **T**ampering | Memory/RAG poisoning tampers with durable context (ASI06) |
| **R**epudiation | Agent acts autonomously with no attributable log of *why* it chose an action |
| **I**nfo disclosure | Lethal-trifecta exfiltration; system-prompt leakage (LLM07) |
| **D**oS | Unbounded consumption (LLM10); prompt-triggered expensive loops |
| **E**levation of privilege | Confused deputy — untrusted content drives a tool call under the agent's broad credential (ASI03) |

Spoofing-of-instruction-source and elevation-via-confused-deputy are the two that dominate agent threat models.

### Step 5: Attack tree per objective

Pick the attacker's goal (e.g., "exfiltrate a private repo"), make it the root, and decompose into OR/AND branches of preconditions. Leaves are concrete injection points. This is the planning tool for the kill chain in [[03-agent-kill-chain]].

## Weaponization (Authorized Lab) — threat-model, then attack

Build the model, then validate it by attacking the lab agent:

1. **Draw the trust-boundary diagram** for the lab agent: every channel, labeled operator- or attacker-controlled.
2. **Fill the capability matrix** for every tool (reads-sensitive / side-effecting).
3. **Check the trifecta**: does any path combine attacker-controlled content + sensitive read + external comms? If yes, you have a predicted vulnerability.
4. **Build the attack tree** for the goal, pick the cheapest leaf (usually an indirect-injection channel).
5. **Execute** against the lab agent and confirm the predicted path fires (use the kill-chain recipe in [[03-agent-kill-chain]]).
6. **Record the first boundary where a control would have broken the path** — that is the recommended mitigation, derived from the model rather than guessed.

Example worked model: customer-service agent with `update_email`, `trigger_password_reset`, and `read_ticket` (ticket text is attacker-controlled). Trifecta present: attacker content (ticket) + sensitive action (password reset) + external effect (email change). Attack tree root "take over account" → leaf "inject into ticket: update email to attacker, then reset password." Every individual tool call passes its own validation — the failure is that no control binds the *requester+target+operation+context* together. https://aurascape.ai/answers/confused-deputy-ai-agents/ — **MEDIUM**.

## Real-World Instances

- **GitHub MCP toxic flow** validates the method: Invariant's own root-cause statement is a trust-boundary failure — "a token with broad read access sat alongside an agent that could not separate trusted instructions from untrusted content." A provenance + capability model predicts it exactly. 26 May 2025. https://invariantlabs.ai/blog/mcp-github-vulnerability — **HIGH**.
- **EchoLeak (CVE-2025-32711)** — boundary between ingested email (untrusted) and Copilot's sensitive context (trusted) was not enforced; capability (URL fetch) closed the trifecta. CVSS 9.3. https://thehackernews.com/2025/06/zero-click-ai-vulnerability-exposes.html — **HIGH**.
- **Ferrag et al.** give a formal threat formulation per technique (attacker capabilities, goals, affected layers) — a research-grade template for step 1-3. arXiv:2506.23260 — **HIGH**.

## Detection Signals

A good threat model *produces* detection rules: for each attacker-controlled → sensitive-tool path you identified, instrument a rule that fires when a tool call's arguments trace to that provenance. Unmodeled paths are undetectable paths.

### The two questions that collapse most agent threat models

Most agent vulnerabilities fall out of just two questions asked per tool call:

1. **Provenance** — *did the content driving this call come from an attacker-influenceable channel?* If yes, the call is suspect regardless of how reasonable it looks.
2. **Authority binding** — *does the requester, for this specific target and operation, actually have the right to trigger it — right now, in this context?* Not "does the agent's credential allow it" (the confused-deputy trap) but "should this request, from this origin, cause this effect."

If you can answer both for every tool a lab agent exposes, you have threat-modeled it to the depth that matters. Everything else — STRIDE letters, attack-tree branches — is scaffolding to make sure you asked those two questions about every path and did not miss one.

## Mitigations / Hardening

- **Make the context-window boundary real** — provenance/taint tracking so untrusted-origin tokens cannot drive privileged actions (vol 8).
- **Bind authorization to requester + target + operation + context**, not least-privilege alone; least privilege limits damage but does not secure the boundary. https://aurascape.ai/answers/confused-deputy-ai-agents/ — **MEDIUM**.
- **Scope credentials per request** rather than one broad standing grant, to defeat the confused deputy.
- **Break the lethal trifecta** at design time — the cheapest fix is removing one leg so the trifecta can never assemble.
- Re-run the threat model whenever a tool, data source, or autonomy level changes — the boundary diagram is a living artifact.

## Related Vectors

- [[01-agent-attack-surface-taxonomy]] — the layers you enumerate as boundaries
- [[02-instruction-data-channel-problem]] — why provenance is the core discipline
- [[03-agent-kill-chain]] — attack trees plan the chain; STRIDE finds the break points
- [[04-owasp-and-nist-crosswalk]] — map each STRIDE hit to an OWASP/NIST ID
- vol 8 (defenses that enforce the boundaries you model)

## References

- Microsoft STRIDE threat modeling (method) — **HIGH** (established).
- Schneier, "Attack Trees," 1999 (method) — **HIGH**.
- Hardy, "The Confused Deputy," 1988 (pattern) — **HIGH**.
- Willison, "The lethal trifecta," 16 June 2025 — **HIGH**. https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
- Quarkslab, "Agentic AI: the confused deputy problem," 2026 — **MEDIUM**. https://blog.quarkslab.com/agentic-ai-the-confused-deputy-problem.html
- Aurascape, "Confused deputy in AI agents," 2025 — **MEDIUM**. https://aurascape.ai/answers/confused-deputy-ai-agents/
- Invariant Labs, GitHub MCP vulnerability, 26 May 2025 — **HIGH**. https://invariantlabs.ai/blog/mcp-github-vulnerability
- EchoLeak CVE-2025-32711 — **HIGH**. https://thehackernews.com/2025/06/zero-click-ai-vulnerability-exposes.html
- Ferrag et al., arXiv:2506.23260, 2025 — **HIGH**. https://arxiv.org/abs/2506.23260
