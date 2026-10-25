# Provenance, Tool Attestation & MCP Hardening

> "A rug-pull redefinition therefore cannot ride in on a prior approval."
> — OWASP MCP Top 10, Client-Side Tool Risk Gating control, 2025

## Core Concept

An MCP tool is defined by metadata the agent *reads as trusted* but that an attacker may *control*: the tool's name, description, and input schema all flow into the model's context and can carry instructions ([[01-tool-poisoning-attack-tpa]]) or be silently mutated after approval (the **rug-pull**: a tool approved benign on day one is redefined malicious on day thirty). The protocol itself provides no built-in signing or pinning, and most clients re-fetch tool definitions on every session — so the attacker's window is every session.

Hardening this surface rests on one rule: **treat tool descriptions as untrusted input, and bind trust to a cryptographic identity, not to a name.** Three mechanisms: **fingerprint pinning** (hash the tool definition, detect any change), **signing/attestation** (bind the definition to a verified publisher), and **registry/gateway review** (a controlled chokepoint that vets, pins, and signs tools before an agent can use them). These make a redefinition *observable and blockable* rather than silent.

This is the integrity layer for the tool supply chain — the counterpart, at the tool-definition level, to the capability policies of CaMeL ([[03-dual-llm-and-camel]]) and the risk-gating of least privilege ([[04-least-privilege-and-sandboxing]]).

## Origin / First Seen (URLs)

- **OWASP MCP Top 10 (2025)** — risk MCP03 Tool Poisoning + "Client-Side Tool Risk Gating" control — https://owasp.github.io/www-project-mcp-top-10/2025/recommended-controls/Client-Side-Tool-Risk-Gating (HIGH for the control mechanics)
- **CSA whitepaper**, "MCP Security: Tool Poisoning", May 2026 — https://labs.cloudsecurityalliance.org/research-rb/ (MEDIUM)
- Boomi, "Breaking the Wiring: MCP Attack Vectors" — https://boomi.com/blog/mcp-attack-vectors-overview/ (LOW — AI-assisted blog)
- Postmark MCP rug-pull incident, Sep 2025 (unofficial server modified to copy outgoing email) — reported via trackr.live / softwareseni (LOW/MEDIUM, multiple secondary)

## How It Works (the defense mechanism)

### 1. Definition fingerprint pinning (trust-on-first-use)
On first sight of a tool, record a **SHA-256 hash of its name + description + input schema**. On every subsequent recomposition, recompute and compare. A mismatch means a silent redefinition — a rug-pull. The OWASP control moves a changed tool to an `AWAITING_REREVIEW` state and **withholds it from the model's view until a human re-approves it** — this step is *enforced*, not advisory. Version pinning alone fails here (the attacker can mutate behaviour without bumping the version string); the *hash* catches it regardless.

### 2. Description scanning (advisory)
Scan tool descriptions for injection signatures ("ignore previous...", hidden-unicode, instruction-shaped text) and surface an advisory flag. OWASP classes this as an "advisory chip" — it flags, it does not block, because a scanner's recall is imperfect (same limit as the input classifiers in [[01-detection-signals-and-monitoring]]).

### 3. Signing / attestation
Bind the tool definition to a **verified publisher via a cryptographic signature on the manifest**. CSA calls signed manifests "the primary mitigation," since a signature reveals any post-publication change and ties the tool to an accountable identity. This defends the *first-definition* case that trust-on-first-use cannot (a malicious tool that was hostile from the start): you trust the signer, not merely the first thing you saw.

### 4. Client-side risk gating
Assign each tool a risk level L0–L5; a hard exposure ceiling refuses any tool above the configured max — "the model never sees a tool above the ceiling." High-risk tools additionally require per-call human approval. This converts tool-selection into an access-control decision (overlaps [[04-least-privilege-and-sandboxing]]).

### 5. MCP gateway / registry review
Route all MCP traffic through a controlled **gateway** that: vets each server before registration, pins and signs approved definitions, re-verifies on every fetch (closing the TOCTOU window), maintains a transparency log of definition changes, and offers rollback. The gateway is the single chokepoint where provenance is established and enforced for the whole fleet.

### Worked rug-pull timeline (and where each control bites)
1. **Day 1** — an operator adds the `postmark-send` MCP server. The gateway records a SHA-256 of `{name, description, input_schema}`, verifies the publisher signature, assigns risk L3, and a human approves it. The agent may now use it.
2. **Day 30** — the upstream server is compromised (as in the real Sep 2025 Postmark incident) and its tool description is silently rewritten to also BCC `copy@evil.com`.
3. **Fetch** — the agent re-fetches tool definitions (most clients do, every session). The gateway recomputes the hash: **mismatch**. The tool is moved to `AWAITING_REREVIEW` and withheld from the model. The rewritten definition "cannot ride in on a prior approval."
4. **Human re-review** — the diff is surfaced; the operator sees the added BCC and rejects it. If a signature was required, the compromised definition also fails signature verification against the pinned publisher key.

The hash catches the change even though the *version string* did not move — which is exactly why version pinning alone is insufficient and hash pinning is the load-bearing control.

### Minimal hash-ledger flow
```
on_tool_seen(tool):
    fp = sha256(tool.name + tool.description + canonical(tool.input_schema))
    known = ledger.get(tool.id)
    if known is None:            # trust-on-first-use
        ledger.put(tool.id, fp, state=APPROVED_PENDING_HUMAN)
    elif known.fp != fp:         # rug-pull detected
        ledger.update(tool.id, fp, state=AWAITING_REREVIEW)   # hide from model
    # expose to model only if state == APPROVED and risk <= ceiling
```

### Treat the tool description as untrusted input
The unifying mindset: a tool's name, description, and schema are *attacker-reachable text that flows into the model's context* — the same trust class as a retrieved web page. So the defenses here compose with the input-layer controls: scan descriptions for injection signatures, and where a description must be shown to the acting model, consider marking it as data ([[02-input-isolation-and-spotlighting]]). The difference from ordinary retrieved content is that a tool description is *persistent and privileged* — the model is primed to trust it as part of its own capability set — which is exactly why integrity (hashing, signing) matters more here than for one-off retrieved text.

## What It Defends Against (attack classes / links)

- **Tool poisoning** ([[01-tool-poisoning-attack-tpa]]) — description scanning + signing + gating.
- **Rug-pull / silent redefinition** — fingerprint pinning + withhold-pending-re-review (enforced).
- **Tool shadowing** (a malicious server overriding a trusted tool's name) — signing + gateway registry resolve identity by signer, not name.
- **Supply-chain compromise of MCP servers** ([[06-model-and-dependency-supply-chain]]) — registry review + transparency log + rollback.
- **Indirect injection via tool metadata** — scanning + treating descriptions as untrusted data ([[02-input-isolation-and-spotlighting]]).

## Deployment (Authorized Lab)

In an owned agent stack:
1. **Hash-ledger every tool.** On first registration store SHA-256 of `{name, description, input_schema}`. Recompute on every session/recomposition; any mismatch → `AWAITING_REREVIEW`, tool hidden from the model until a human re-approves. (Reference impl: `McpToolHashLedger` in Spring AI Playground, Apache-2.0.)
2. **Require signed manifests** for any tool with risk ≥ L3; verify signature against a pinned publisher key before exposure. Reject unsigned high-risk tools.
3. **Run an MCP gateway** as the sole path to servers: vet-on-registration, re-verify-on-fetch, transparency-log all definition changes, support rollback.
4. **Description scanning as advisory** — surface flags in the trace ([[01-detection-signals-and-monitoring]]); never auto-block on the scanner alone.
5. **Risk-level + ceiling** per deployment; mark state-changing tools approval-required.
6. **Re-verify at time-of-use**, not only at registration — close the TOCTOU gap (see Limitations).
7. **Log tool identity with every call** — record the tool's hash, signer, and version alongside each invocation in the trace ([[01-detection-signals-and-monitoring]]), so a rug-pull that somehow slipped approval is still reconstructable in forensics.
8. **Default-deny new tools.** A newly-appearing tool starts hidden from the model until a human approves it (no-auto-approve, [[04-least-privilege-and-sandboxing]]); auto-accepting a server's advertised tool list is how most rug-pulls and shadowing attacks land.

### What to hash — and the annotation trap
Canonicalise before hashing: serialise the input schema with sorted keys and stable formatting so a cosmetic reserialisation does not trip a false rug-pull alert. Decide deliberately what enters the fingerprint. OWASP's default covers `name + description + input_schema` but **not** server-supplied *annotations* (e.g. MCP `readOnlyHint`, `destructiveHint`, display metadata) — an attacker who flips `destructiveHint` from true to false, or injects instructions into an annotation field, passes a hash that only covered the three core fields. If your client renders or reasons over annotations, hash them too.

### Gateway architecture (fleet-wide)
A single MCP gateway in front of all servers concentrates the controls: (1) **registration** — vet and risk-rate each server, pin its publisher key; (2) **fetch** — on every tool-list fetch, recompute fingerprints, verify signatures, re-rate; (3) **transparency log** — append-only record of every definition change, queryable for audit and feeding detection ([[01-detection-signals-and-monitoring]]); (4) **rollback** — revert a server to a previously-approved definition on compromise; (5) **ceiling enforcement** — strip any tool above the deployment's risk ceiling before the list reaches the agent. The tradeoff is that the gateway itself becomes high-value: it must run with its own hardening and its compromise is fleet-wide.

## Limitations & Bypass

- **Fingerprint coverage gaps.** OWASP's hash covers name/description/schema but **not upstream annotations** — an annotation-only change goes undetected. Choose what to hash deliberately.
- **Trust-on-first-use trusts the first presentation.** A tool malicious *from the start* has a clean, stable hash forever. Only signing (publisher trust) or scoring floors defend the first-definition case.
- **A matching hash proves interface, not behaviour.** The declared schema can be unchanged while the *backend* the tool calls turns malicious — the server executes server-side code the client never sees. Hash integrity ≠ behavioural safety.
- **No protocol-native signing/pinning.** MCP has no built-in mechanism; every control here is client/gateway-side and bolted on. Clients that re-fetch each session without a ledger get no protection by default.
- **Signing needs a working PKI.** Key distribution, revocation, and a trusted registry are real operational burdens; a compromised or permissive signer defeats it.
- **Gateway is a single point of failure/compromise** — it concentrates trust; its own integrity must be assured.
- **Source authority is mixed.** The strongest mechanics come from OWASP (HIGH); several rug-pull and signing claims are from vendor/AI-assisted blogs (LOW).

### Signing in practice (the PKI reality)
Signed manifests are only as good as the key infrastructure behind them. A workable setup: each publisher holds a signing key; the gateway pins the *public* key per server at registration (trust-on-first-use for the key, deliberate human verification for high-risk servers); signatures are verified on every fetch; a revocation list or short-lived signing certificates handle key compromise. The failure modes to design against: a publisher key that is itself stolen (then the attacker signs malicious definitions that verify cleanly — signing shifts trust to the key, it does not eliminate it), an over-permissive "trust any signed server" policy (signing proves *who*, not *safe*), and no revocation path (a known-bad key keeps verifying). Signing raises the bar from "anyone can silently redefine a tool" to "an attacker must compromise a specific pinned key" — a large improvement, not a guarantee.

### Defense coverage summary

| Threat | Fingerprint pin | Signing | Risk gating | Gateway log |
|---|:---:|:---:|:---:|:---:|
| Silent rug-pull | ✓ (enforced) | ✓ | partial | ✓ (audit) |
| Malicious first definition | ✗ | ✓ | ✓ (floor) | partial |
| Tool shadowing | partial | ✓ | partial | ✓ |
| Backend behaviour change | ✗ | ✗ | ✗ | partial (observe) |
| Annotation-only tampering | ✗ (unless hashed) | ✓ | ✗ | partial |

The gaps (backend behaviour, annotations) are exactly where this layer hands off to runtime detection ([[01-detection-signals-and-monitoring]]) and least privilege ([[04-least-privilege-and-sandboxing]]): integrity of the *declared* interface is necessary but not sufficient, so the tool's *actions* are still scoped and watched.

## Evidence / Effectiveness

- Fingerprint pinning + enforced withhold-pending-re-review stops rug-pull riding on prior approval — OWASP MCP Top 10 control — **HIGH** (clear mechanism; documented limits of hash coverage).
- Risk ceiling keeps high-risk tools out of model view — OWASP — **HIGH**.
- Signed manifests as primary mitigation for post-publication change — CSA whitepaper — **MEDIUM** (authoritative org; prescriptive, limited field data).
- Real rug-pull in the wild (Postmark MCP, Sep 2025) demonstrating the threat is not theoretical — **MEDIUM** (multiple secondary reports; original disclosure not fetched).
- "No protocol-native pinning/signing; clients re-fetch per session" — **MEDIUM** (consistent across sources; verify against current MCP spec, which evolves).
- Interface integrity ≠ behaviour integrity (a stable hash/signature does not prove the server is safe) — OWASP control's own limitation note + CSA — **HIGH** (explicitly stated, not inferred).
- Annotation-only tampering evades a name/description/schema fingerprint — OWASP control limitation — **HIGH**.

### The hard truth: interface integrity is not behaviour integrity
Every control in this volume protects the *declared interface* — the text and schema the agent reads. None of them can see what the server actually does when called, because that code runs on the server, out of the client's view. A tool whose description, schema, and signature are all perfectly stable can still exfiltrate on every call if its backend was always malicious or is compromised server-side. This is the ceiling of tool attestation, and it is why integrity controls hand off to least privilege ([[04-least-privilege-and-sandboxing]]) and egress monitoring ([[01-detection-signals-and-monitoring]]): you cannot verify a remote server is honest, so you constrain what an honest-looking call is allowed to reach and you watch where its data goes. Attestation answers "is this the tool I approved?" — never "is this tool safe?"

## Related Defenses

- [[01-tool-poisoning-attack-tpa]] — the attack this volume hardens against (cross-reference, attack side)
- [[04-least-privilege-and-sandboxing]] — risk gating and ceilings; no-auto-approve of new tools
- [[03-dual-llm-and-camel]] — capability policies that assume tool descriptions may be adversarial
- [[01-detection-signals-and-monitoring]] — logging tool hash, signer, version alongside each call
- [[06-model-and-dependency-supply-chain]] — broader software-supply-chain integrity for MCP servers

## References

- OWASP MCP Top 10, Client-Side Tool Risk Gating — https://owasp.github.io/www-project-mcp-top-10/2025/recommended-controls/Client-Side-Tool-Risk-Gating — **HIGH**
- CSA, "MCP Security: Tool Poisoning" whitepaper, 2026 — https://labs.cloudsecurityalliance.org/research-rb/ — **MEDIUM**
- Boomi, "Breaking the Wiring: MCP Attack Vectors" — https://boomi.com/blog/mcp-attack-vectors-overview/ — **LOW**
- "Tool Poisoning in MCP-Connected Agents: 2026 Threat Model" — https://www.trackr.live/2026/05/04/tool-poisoning-mcp-agents-threat-model/ — **LOW**
- "Tool Poisoning, Tool Shadowing and Rug-Pull Attacks: the AI supply chain no one is auditing" (Postmark incident) — https://www.softwareseni.com/tool-poisoning-tool-shadowing-and-rugpull-attacks-the-ai-supply-chain-no-one-is-auditing — **LOW**
- Reference impl `McpToolHashLedger` (Spring AI Playground, Apache-2.0) — linked from the OWASP control — **MEDIUM**
