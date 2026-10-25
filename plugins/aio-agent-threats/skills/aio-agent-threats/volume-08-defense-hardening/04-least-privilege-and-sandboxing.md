# Least Privilege & Sandboxing

> "An agent should satisfy no more than two of: processing untrusted input, accessing sensitive data, and changing state or communicating externally."
> — Meta AI Security, "Agents Rule of Two" / "Practical AI Agent Security", Oct 31 2025

## Core Concept

Prevention and isolation reduce how often an injection *succeeds*; least privilege and sandboxing reduce how much *damage* a successful injection can do. The premise: **assume the model will eventually be compromised, and ensure that when it is, it cannot reach anything that matters.** This is the containment layer — it does not care whether the bad instruction came from the user, a web page, memory, or a poisoned tool.

Two complementary framings have become the practitioner consensus in 2025:
- **Lethal Trifecta** (Willison) — danger arises when an agent combines (1) access to private data, (2) exposure to untrusted content, and (3) ability to externally communicate/exfiltrate. Any one alone is safe; all three is exploitable.
- **Agents Rule of Two** (Meta) — the same three properties framed as a design rule: an autonomous agent session should hold **at most two** of {untrusted input, sensitive data/systems, state-change/external-comms}. A task needing all three "should not run autonomously" and "at a minimum requires supervision — via human-in-the-loop approval."

Sandboxing (containers/VMs, egress allowlists, scoped capabilities) is how you *enforce* that an agent only holds two. Human-approval gates are how you handle the unavoidable all-three cases. The consensus is explicit that this is **not a silver bullet** — Meta itself says the rule "should not be viewed as a finish line" (see [[06-defense-in-depth-and-frameworks]]).

## Origin / First Seen (URLs)

- **Agents Rule of Two** — Meta AI Security, Oct 31 2025 — summarised at https://www.osohq.com/learn/agents-rule-of-two-a-practical-approach-to-ai-agent-security and https://kenhuangus.substack.com/p/the-rule-of-two-vs-reality (MEDIUM — secondary; Meta's original post not fetched)
- **Lethal Trifecta** — Simon Willison, 2025 — referenced via https://www.databricks.com/blog/mitigating-risk-prompt-injection-ai-agents-databricks (MEDIUM)
- Sandbox-protects-host-not-targets argument — https://hol.org/blog/prompt-injection-defense-2026-what-works (LOW, blog)
- Least-privilege / per-action authz as consensus — https://www.fiddler.ai/blog/prompt-injection-prevention-coding-agents, https://dzone.com/articles/prevent-prompt-injection-allowlists-tools (MEDIUM)

## How It Works (the defense mechanism)

### 1. Capability scoping
Grant each agent (or agent role) the **minimum** tool set and data scope for its job — not the union of everything it might ever need. A summariser gets read-only retrieval; it does not get the email-send tool "just in case." Scope by role, not by convenience. In CaMeL ([[03-dual-llm-and-camel]]) this is expressed as capabilities on values; without CaMeL it is expressed as which tools are registered for which agent.

### 2. Allowlists (tools, destinations, arguments)
Deny-by-default everywhere:
- **Tool allowlist** per agent role (OWASP MCP risk-gating assigns each tool an L0–L5 risk level and refuses anything above a configured ceiling — "the model never sees a tool above the ceiling", see [[05-provenance-tool-attestation-and-mcp-hardening]]).
- **Egress allowlist** — the agent's sandbox may reach only a named set of destinations; everything else is blocked and logged. This directly breaks the exfiltration leg of the lethal trifecta ([[03-data-exfiltration-channels]]).
- **Argument constraints** — recipient domains, file-path roots, shell-command allowlists.

### 3. Human-approval gates
For irreversible or high-risk actions (send external email, spend money, delete, deploy, write to prod), require a human to approve the *specific* action with its *specific* arguments. This is the Rule-of-Two escape hatch for all-three tasks and CaMeL's "ask the user" policy branch. Critically: approve the concrete action, not a blanket "yes to everything" (**no-auto-approve**).

### 4. Container / VM sandboxing
Run the agent's tool execution (code interpreter, shell, file access) inside a container or micro-VM with: no ambient cloud credentials, a read-only base filesystem, a scratch writable mount, no host network except the egress allowlist, and resource/time limits. A compromised agent can thrash inside the box but cannot pivot to the host or the wider network.

### 5. No-auto-approve / default-deny posture
Never ship an agent that auto-confirms tool calls, auto-accepts new MCP tools, or runs with standing admin credentials. Every elevation is explicit.

### 6. Scoped, short-lived credentials
The agent's environment should never hold a long-lived superuser key. Issue **per-session, narrowly-scoped, short-TTL tokens** bound to exactly the resources the task needs. A hijacked agent then inherits only a token that expires soon and can touch little — compromise of the agent is not compromise of the account.

### Worked trifecta examples
- **Safe (two legs):** A research agent reads untrusted web pages (untrusted input) and writes a summary to a scratch file (state-change) but has *no* access to private data and *no* external send. An injection can corrupt the summary — annoying, not dangerous.
- **Dangerous (all three):** A personal assistant reads your email (sensitive data), browses linked pages (untrusted input), and can send email (external comms). This is the lethal trifecta; an indirect injection in a linked page can exfiltrate your inbox. Rule of Two says: don't run this autonomously — gate the send behind human approval, or split it (a quarantined reader that never holds send capability — see [[03-dual-llm-and-camel]]).
- **Refactored:** Replace the all-three assistant with a reader agent (untrusted input + sensitive data, no send) that returns symbolic handles to a privileged agent (send capability, trusted input only). Neither agent holds all three.

### Approval-gate design that resists fatigue
A gate that fires on every action trains humans to click "approve" reflexively, which is worse than no gate — it manufactures consent. Design gates to fire **only on the consequential, irreversible minority**: external sends, spend, delete, deploy, cross-boundary data movement. Make each prompt show the *concrete* action and arguments (recipient, amount, file) so the human reviews a decision, not a category. Rate-limit and batch low-risk approvals; escalate only anomalies. The goal is a small number of high-signal decisions a human can actually reason about — approval quality, not approval volume.

## What It Defends Against (attack classes / links)

- **All injection classes** — containment is attack-agnostic ([[02-indirect-injection]], [[01-tool-poisoning-attack-tpa]]).
- **Data exfiltration** ([[03-data-exfiltration-channels]]) — egress allowlists remove the exfil leg.
- **Excessive agency / unintended actions** — capability scoping + approval gates.
- **Rug-pull / newly-added tools** — risk ceiling + no-auto-approve keep a redefined or newly-exposed tool out of reach (see [[05-provenance-tool-attestation-and-mcp-hardening]]).
- **Multi-agent blast-radius** ([[02-agent-to-agent-trust-abuse]]) — scoping limits how far one compromised agent's authority spreads.

## Deployment (Authorized Lab)

In an owned agent stack:
1. **Inventory the trifecta per agent.** For each agent role, list which of {untrusted input, sensitive data, external action} it holds. Any role with all three is redesigned (split into two agents, or gated).
2. **Deny-by-default tool registry.** Each role gets an explicit tool allowlist; assign risk levels; set a per-role ceiling; mark high-risk tools as approval-required.
3. **Egress allowlist at the sandbox network layer** — not in the model, not in the prompt. Enforce with firewall/proxy rules; log every denied destination (feeds [[01-detection-signals-and-monitoring]]).
4. **Container/micro-VM per session** with ephemeral scratch, no standing credentials, resource/time caps.
5. **Human-in-the-loop for irreversible actions** — approve the exact action + arguments; rate-limit approvals to avoid fatigue-driven rubber-stamping.
6. **Scope credentials to the task** — short-lived, narrowly-scoped tokens issued per session, never a long-lived superuser key in the agent's environment.

### Concrete sandbox profile (worked)
A defensible per-session tool-execution sandbox for an owned stack:
- **Compute**: ephemeral container or micro-VM, one per session, destroyed on completion.
- **Filesystem**: read-only base image; a single writable `/scratch` mount, wiped per session; no mount of host home, SSH keys, or cloud config.
- **Network**: default-deny egress; an explicit allowlist of destination hosts/ports enforced by an egress proxy, not the model. Every denied connection logged to the detection layer ([[01-detection-signals-and-monitoring]]).
- **Credentials**: no ambient cloud role; a single short-TTL token scoped to the task, injected at start, expired at end.
- **Limits**: CPU/memory caps, wall-clock timeout, max tool-calls per run (loop guard).
- **Identity**: the agent runs as an unprivileged user; no `sudo`, no Docker socket, no access to the orchestrator's own credentials.

### TOCTOU worked example
At approval time the operator approves the `fetch_url` tool pointing at `https://docs.corp/`. Between approval and use, DNS for `docs.corp` is poisoned to an attacker host, or the MCP server backing `fetch_url` is rug-pulled ([[05-provenance-tool-attestation-and-mcp-hardening]]). The approved decision is now stale. Mitigation: re-resolve and re-verify the destination and the tool fingerprint **at the moment of use**, pin to the IP/cert seen at approval, and treat any change as a fresh approval event — never cache "approved" as a permanent fact.

## Limitations & Bypass

- **Sandbox protects the host, not the targets.** A sandbox stops host pivot but "does not protect the external systems the agent is authorized to modify" (hol.org, LOW). If the agent is *allowed* to email customers, a hijacked agent emails customers from inside the sandbox. Per-action authz is still required.
- **TOCTOU (time-of-check/time-of-use).** A tool or destination checked as safe at approval time can change before use — a rug-pulled MCP tool, a redirect, a DNS change. Pin and re-verify at *use* time, not only at registration (see [[05-provenance-tool-attestation-and-mcp-hardening]]).
- **Approval fatigue.** Too many gates and humans rubber-stamp; too few and attacks slip through. The gate's value decays with volume.
- **Rule of Two is single-agent-centric.** Critics note it "focuses predominantly on prompt injection on a single agent" and misses multi-agent and memory risks; satisfying it "can still be prone to failure" (Meta's own caveat; kenhuangus critique, MEDIUM). A false sense of security is a real failure mode.
- **Scoping gaps.** Over-broad allowlists (wildcard egress, a tool that itself wraps many capabilities) silently reintroduce the trifecta.
- **Lethal trifecta is unavoidable for some products** (a personal assistant *needs* all three) — those must lean on isolation ([[03-dual-llm-and-camel]]) + gates, accepting residual risk.
- **Confused-deputy via allowed tools.** Even a correctly-scoped agent can be tricked into misusing a tool it *is* allowed to use — the scope limits reach, not intent. Per-action authz and provenance-aware policies ([[03-dual-llm-and-camel]]) are needed on top of scoping.
- **Secrets laundering through allowed sinks.** An agent with no "send" tool but a "write to shared log" tool can still exfiltrate by writing secrets where an attacker later reads them. Enumerate *every* data path out, not just the obvious egress tools.

### Rule-of-Two decision table
For each agent, mark which legs it holds, then act:

| Untrusted input | Sensitive data | External action | Verdict |
|:---:|:---:|:---:|---|
| ✓ | ✓ | ✓ | Do not run autonomously — gate the external action behind human approval, or split the agent |
| ✓ | ✓ | ✗ | OK — can read secrets from untrusted context but cannot leak them (watch egress anyway) |
| ✓ | ✗ | ✓ | OK — can be hijacked but has no sensitive data to exfiltrate; still scope the action |
| ✗ | ✓ | ✓ | OK — trusted input only; standard least-privilege applies |
| any two or fewer | | | Generally acceptable with scoping + monitoring |

The table is a *screening* tool, not a proof — a "✓✓✗" agent that writes secrets into a log the attacker can later read has effectively reconstructed the third leg. Trace every data path, not just the declared tools.

### Degrade-safe defaults
When a control is uncertain — approval times out, egress destination can't be verified, a tool's fingerprint changed — the safe default is **deny/pause**, never proceed. Fail-open on an authorization decision converts a reliability incident into a security incident. Build the agent so that a missing answer blocks the consequential action rather than waving it through.

## Evidence / Effectiveness

- Rule of Two as practical single-agent prompt-injection containment — Meta, Oct 2025 — **MEDIUM** (widely adopted; Meta itself calls it not a finish line; original post unverified here).
- Lethal trifecta as a correct characterisation of exploitable combinations — Willison, 2025 — **HIGH** (broad independent agreement).
- Egress allowlist + sandbox limiting blast radius — practitioner consensus, multiple sources — **MEDIUM** (sound by construction; no single controlled benchmark of blast-radius reduction).
- Sandbox does not cover authorized external targets; per-action authz still needed — **MEDIUM** (logically necessary, echoed across sources).
- Human-approval fatigue tradeoff — noted in multiple papers incl. CaMeL — **MEDIUM**.
- Confused-deputy and secrets-laundering defeating naive scoping — practitioner consensus (DZone allowlists, hol.org runtime monitoring) — **MEDIUM** (well-understood class; specific to each deployment's data paths).
- "Sandbox protects the host, not the authorized targets" — hol.org — **LOW** (blog, but logically sound and widely echoed).

### The decisive layer, and the most neglected
Of all the layers in this volume, containment is the one that works *regardless of whether the attack was even detected*. Spotlighting can be bypassed, isolation policies can have gaps, detection can miss — but if the agent simply cannot reach the account, the data, or the network destination that would cause harm, the bypass is inert. This is why the field consensus treats least privilege as the floor every program must have before anything else. It is also the most neglected in practice, because it is invisible when it works and it costs capability up front. The rule of thumb: an agent you would be comfortable running fully compromised is an agent that is correctly scoped. If a compromised version of your agent could do real damage, you have granted it too much.

## Related Defenses

- [[03-dual-llm-and-camel]] — CaMeL's capabilities/policies are least privilege as enforced data-flow rules
- [[05-provenance-tool-attestation-and-mcp-hardening]] — tool risk-gating and TOCTOU re-verification
- [[01-detection-signals-and-monitoring]] — denied egress/authz decisions are the logged signals
- [[06-defense-in-depth-and-frameworks]] — least privilege maps to NIST AI RMF MANAGE and OWASP excessive-agency mitigations

## References

- Meta, "Agents Rule of Two" / "Practical AI Agent Security", 2025 — https://www.osohq.com/learn/agents-rule-of-two-a-practical-approach-to-ai-agent-security — **MEDIUM**
- Ken Huang, "The Rule of Two vs. Reality" — https://kenhuangus.substack.com/p/the-rule-of-two-vs-reality — **MEDIUM**
- Databricks, "Mitigating Risk of Prompt Injection in AI Agents" (lethal trifecta) — https://www.databricks.com/blog/mitigating-risk-prompt-injection-ai-agents-databricks — **MEDIUM**
- Fiddler, "Prompt Injection Prevention for Coding Agents" — https://www.fiddler.ai/blog/prompt-injection-prevention-coding-agents — **MEDIUM**
- "Prompt Injection Defense in 2026" — https://hol.org/blog/prompt-injection-defense-2026-what-works — **LOW**
- DZone, "Prevent Prompt Injection with Allowlists" (model proposes, separate layer decides) — https://dzone.com/articles/prevent-prompt-injection-allowlists-tools — **LOW**
- Oso, "Agents Rule of Two: A Practical Approach to AI Agent Security" — https://www.osohq.com/learn/agents-rule-of-two-a-practical-approach-to-ai-agent-security — **MEDIUM**

*Note: Meta's original "Practical AI Agent Security" post was not fetched directly; Rule-of-Two wording and date are from secondary write-ups (osohq, kenhuangus, databricks) and should be verified against Meta's publication before quoting verbatim.*
