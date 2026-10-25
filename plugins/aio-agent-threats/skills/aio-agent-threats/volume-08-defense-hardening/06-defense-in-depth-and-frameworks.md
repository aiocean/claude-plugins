# Defense-in-Depth & Frameworks

> "Model-level defenses are bypassable, so prevention has to be layered."
> — Fiddler AI, "Prompt Injection Prevention for Coding Agents", 2025

## Core Concept

No single control stops prompt injection. The spotlighting authors leave residual attack success; CaMeL's authors say injection is "not fully solved"; every classifier benchmarked misses. The field consensus — Willison, Meta, Google DeepMind, OWASP, NIST — is **defense-in-depth plus least privilege**: stack independent layers so that an attack must defeat *all* of them, and ensure that even total prompt-level failure is *contained* by the layers below.

This article does two things: (1) lay out the **layered model** — which defense sits where and what it assumes about the layers around it — and (2) **map those defenses onto the governance frameworks** operators are measured against: OWASP (LLM Top 10 + Agentic Top 10), NIST AI RMF, MITRE ATLAS. The frameworks are not themselves defenses; they are the scaffolding that tells you which layers you are missing and gives your program a shared vocabulary with auditors and vendors.

The honest bottom line, repeated across every source: **this is risk reduction, not elimination.** Meta's own Rule of Two "should not be viewed as a finish line." Treat any claim of a complete fix — especially a single guardrail product — as marketing.

## Origin / First Seen (URLs)

- OWASP Top 10 for LLM Applications (v1 2023, v2 2025) — https://genai.owasp.org/ (HIGH)
- OWASP Top 10 for **Agentic** Applications (ASI01–ASI10), Dec 10 2025 — https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications (HIGH)
- NIST AI RMF 1.0 (AI 100-1), Jan 2023 + Generative AI Profile (AI 600-1), Jul 26 2024 — https://www.nist.gov/itl/ai-risk-management-framework (HIGH)
- MITRE ATLAS (mitigations AML.M series; Oct 2025 added 14 agentic techniques w/ Zenity Labs) — https://atlas.mitre.org/ (MEDIUM — official site not fetched; secondary + MISP mirror)
- Guardrail benchmark — IBM arXiv:2502.15427 (HIGH)

## How It Works (the layered model)

Layers, outermost (attacker-facing) to innermost (last resort). Each assumes the one before it will sometimes fail.

| Layer | Control | Volume | Assumes |
|---|---|---|---|
| 1. Input | Spotlighting, provenance tagging, instruction-in-data classifier | [[02-input-isolation-and-spotlighting]] | Some injections pass → rely on L2+ |
| 2. Architecture | Dual-LLM / CaMeL isolation, capabilities | [[03-dual-llm-and-camel]] | Model may adopt a bad instruction → deny it actions |
| 3. Authorization | Least privilege, allowlists, human-approval, Rule of Two | [[04-least-privilege-and-sandboxing]] | A tool call may be malicious → scope its blast radius |
| 4. Tool integrity | Signing, fingerprint pinning, MCP gateway | [[05-provenance-tool-attestation-and-mcp-hardening]] | Tool metadata is adversary-controlled → bind trust to identity |
| 5. Containment | Container/VM sandbox, egress allowlist | [[04-least-privilege-and-sandboxing]] | The agent is compromised → it still can't reach anything that matters |
| 6. Detection | Telemetry, anomaly detection, trace review | [[01-detection-signals-and-monitoring]] | Everything above failed → see it fast, respond, feed back |

The **Misattribution Gap** ([[06-misattribution-gap]]) dictates the shape: because the model cannot reliably attribute instruction provenance, you cannot put all your trust in any model-level layer (L1 input, or the model's own judgment). The load-bearing layers are the *non-model* ones — architecture, authorization, tool integrity, containment, detection — enforced in code, not in prompts.

### Guardrail products — what they are and their limits
Guardrails sit mostly at L1 (and some output filtering). They are useful, bounded, bypassable:
- **Llama Guard** (Meta) — fine-tuned classifier over a hazard taxonomy; built for unsafe content, *not specifically* prompt injection. Llama Guard 2: 0.826 F1, 0.733 recall (IBM).
- **NeMo Guardrails** (NVIDIA) — programmable rails; input intent-classification + output filtering. Default PI rail scored only 0.455 F1 in the IBM study; adds a model call per rail (latency 0.91s → 1.44s with several rails).
- **Lakera Guard** — commercial PI detector; tops its own PINT benchmark at 95.22% (vendor, May 2025); ~100ms p95; no independent head-to-head confirms vendor numbers.
- A fine-tuned **DeBERTa** classifier beat all named products at 0.97 F1 (IBM).
**Limit (critical):** recall < 1.0 means injections pass; attackers iterate against public guardrails until one phrasing slips; vendor numbers far exceed independent numbers. A guardrail is an L1 *advisory/filter*, never the whole defense. "Buy the detector, not the platform" — but don't mistake the detector for safety.

## Mapping Defenses to Frameworks

### OWASP
- **LLM Top 10 (v2 2025)**: LLM01 Prompt Injection → L1 spotlighting + L2 isolation; LLM06 Sensitive Info Disclosure → L5 egress allowlist; LLM07 Insecure Plugin/Tool → L4 tool integrity; LLM08 Excessive Agency → L3 least privilege + approval gates.
- **Agentic Top 10 (ASI01–ASI10, Dec 2025)**: goal/behavior hijacking → L2+L3; tool misuse → L3+L4; identity & privilege abuse → L3 scoped identity; memory poisoning → L6 memory-write monitoring ([[01-memory-poisoning-minja]]); insecure agent-to-agent comms & cascading failures → L3 scoping + L6 ([[02-agent-to-agent-trust-abuse]]); human-trust exploitation → approval-gate design; rogue agents → L5 containment. OWASP's own summary: mitigations "center on scoping agent identity and permissions tightly, and limiting how far one bad decision can spread before a human notices."

### NIST AI RMF (four functions)
- **GOVERN** — policies, roles, risk tolerance, approval-gate policy, who owns incident response.
- **MAP** — context + threat modeling: inventory the lethal-trifecta exposure per agent ([[04-least-privilege-and-sandboxing]]), map to OWASP/ATLAS.
- **MEASURE** — the detection/telemetry layer ([[01-detection-signals-and-monitoring]]); benchmark guardrails; track ASR, egress-denial rate, approval-override rate.
- **MANAGE** — prioritise and act: deploy least privilege, isolation, containment; incident response; rollback. The **Generative AI Profile (AI 600-1, Jul 2024)** adds GenAI-specific actions on top. (AI RMF is voluntary; being revised under the White House AI Action Plan.)

### MITRE ATLAS
Technique catalogue (tactics → techniques AML.T####) with paired **mitigations (AML.M####)** — e.g. AML.M0005 "access controls on model registries and training data." The Oct 2025 update added **14 agentic techniques** (with Zenity Labs) covering prompt injection, tool misuse, agent credential theft. Use ATLAS to enumerate concrete TTPs each layer must cover and to map case studies to controls. (Counts vary by source — ~15 tactics / 60–170 techniques / ~35 mitigations depending on version; verify at atlas.mitre.org.)

### Guardrail products — side by side

| Product | Layer / role | Independent score | Overhead | Honest limit |
|---|---|---|---|---|
| Llama Guard 2 | L1 content/hazard classifier | 0.826 F1, 0.733 recall (IBM) | one model call | not built for prompt injection specifically |
| NeMo Guardrails | L1 input intent + L-output filter | 0.455 F1 PI rail (IBM) | 0.91s→1.44s w/ several rails | programmable but weak default PI rail |
| Lakera Guard | L1 commercial PI detector | 95.22% own PINT (vendor) | ~100ms p95 | no independent head-to-head confirms it |
| Fine-tuned DeBERTa | L1 PI classifier | 0.97 F1 (IBM) | lightweight | needs your own training/maintenance |

The pattern across the row: **independent numbers trail vendor numbers**, recall is always < 1.0, and the best performer is a self-maintained classifier, not a platform. A guardrail buys you an advisory L1 filter and nothing more — wire its verdict into MEASURE and keep the load-bearing defenses at L2–L5.

## What It Defends Against (attack classes / links)

All classes, by construction — the point of layering is attack-agnostic coverage: [[02-indirect-injection]], [[01-tool-poisoning-attack-tpa]], [[01-memory-poisoning-minja]], [[03-data-exfiltration-channels]], [[02-agent-to-agent-trust-abuse]], [[01-multi-turn-crescendo-and-stac]]. Frameworks ensure no class is silently un-covered.

### Framework selection — which backbone
- **Shipping a product, need an auditable risk register** → OWASP (LLM + Agentic Top 10) as the checklist; it maps cleanly to engineering layers and is the vocabulary vendors and auditors already use.
- **Enterprise governance, board reporting, regulatory posture** → NIST AI RMF as the backbone; its GOVERN/MAP/MEASURE/MANAGE functions wrap the OWASP checklist in an accountability structure.
- **Red-team / detection engineering, concrete test cases** → MITRE ATLAS; its TTP granularity turns "defend against prompt injection" into specific techniques to simulate.
Most mature programs use all three in those distinct roles — ATLAS for tests, OWASP for the risk list, NIST for governance — rather than treating them as interchangeable.

### Why independent layers matter (the AND-gate)
Defense-in-depth only works if the layers fail *independently*. Two L1 classifiers that share a base model are correlated — one evasive phrasing may beat both, so stacking them barely raises the bar. An L1 classifier and an L5 egress allowlist are uncorrelated — the injection and the exfiltration channel are different mechanisms, so an attacker must defeat both, and the combined bypass probability is the *product*, not the sum, of the individual ones. This is the whole mathematical case for the layered model, and it is why the recommended stack mixes model-level (L1), architecture (L2), and code-enforced (L3–L5) controls rather than piling up more of the same kind. The corollary: adding a third guardrail product is near-worthless; adding an egress allowlist to a stack that has none is transformative.

## Deployment (Authorized Lab)

In an owned agent stack:
1. **Adopt one framework as the backbone** — NIST AI RMF for governance, OWASP Agentic Top 10 as the risk checklist, ATLAS for TTP-level test cases. Don't pick zero; don't pick all three as equals.
2. **Build the coverage matrix** (the table above) and mark which layers are actually deployed vs aspirational. Empty rows are your gaps.
3. **Deploy bottom-up when resources are limited**: containment (L5) + least privilege (L3) first — they bound damage regardless of attack — then architecture (L2), then input (L1), then detection (L6) to measure.
4. **Guardrails as L1 advisory only**, benchmarked on *your* traffic, never as the sole control; log their verdicts into MEASURE.
5. **Close the loop**: detection (MEASURE) feeds back into tuning prevention (MANAGE); re-threat-model (MAP) when a new attack class appears.
6. **Document residual risk** explicitly in GOVERN — which all-three tasks remain, what gates cover them, what you accept.

### Rollout maturity model
A practical sequence for an owned stack, from nothing to mature:
1. **Level 0 — contain blast radius.** Sandbox + default-deny egress allowlist + no standing credentials ([[04-least-privilege-and-sandboxing]]). Deployable in days; bounds damage regardless of attack. Do this first.
2. **Level 1 — scope authority.** Per-role tool allowlists, risk ceilings, human-approval on irreversible actions, Rule-of-Two audit of every agent.
3. **Level 2 — harden inputs and tools.** Spotlighting/datamarking on untrusted spans ([[02-input-isolation-and-spotlighting]]); MCP fingerprint pinning + signing ([[05-provenance-tool-attestation-and-mcp-hardening]]).
4. **Level 3 — isolate architecture.** Dual-LLM/CaMeL for trifecta agents ([[03-dual-llm-and-camel]]).
5. **Level 4 — measure and close the loop.** Full telemetry, anomaly detection, trace review ([[01-detection-signals-and-monitoring]]) feeding back into MANAGE.

Most teams over-invest in Level 2 guardrails (visible, easy to buy) and under-invest in Level 0 (unglamorous, decisive). Reverse that instinct.

## Limitations & Bypass

- **Layers are not independent in practice.** If several layers share the same base model's judgment, one injection can defeat them together — a reason the load-bearing layers must be non-model (code-enforced).
- **Frameworks lag the field.** OWASP v1 (2023) was outdated by 2025; ATLAS counts shift between updates; NIST RMF is under revision. A checklist is a floor, not a guarantee (see [[04-owasp-and-nist-crosswalk]] limitations in the advisor volume).
- **Compliance ≠ security (Goodhart).** Passing a framework checklist is a proxy; an auditor-green program can still be exploitable. Verify against real attack simulation, not box-ticking.
- **Guardrail over-trust.** The single most common failure: treating a bought detector as "done." Independent recall is far below vendor claims.
- **Cost/utility tax compounds.** Each layer adds latency, complexity, and capability loss; teams silently disable layers under pressure, reopening gaps.
- **Novel classes** (emergent multi-agent collusion, deception) may fall outside every current framework — the matrix only covers known classes.

## Evidence / Effectiveness

- Guardrail benchmark (Llama Guard 0.826 F1, NeMo PI rail 0.455 F1, DeBERTa 0.97 F1; Lakera vendor 95.22%) — IBM arXiv:2502.15427 + vendor — **HIGH** for IBM numbers, **LOW** for vendor self-benchmarks.
- Defense-in-depth + least privilege as consensus, not silver bullet — Meta, Google DeepMind, Fiddler, OWASP — **HIGH** (strong cross-source agreement).
- OWASP Agentic Top 10 released Dec 2025 (ASI01–ASI10), 100+ contributors — genai.owasp.org — **HIGH** (official).
- NIST AI RMF four functions (GOVERN/MAP/MEASURE/MANAGE) + GenAI Profile Jul 2024 — NIST — **MEDIUM** (functions are well-established; the nist.gov landing page itself didn't restate them — see AI 100-1 PDF for authoritative text).
- ATLAS mitigation IDs (AML.M series) + Oct 2025 agentic additions — secondary + MISP mirror — **MEDIUM** (official site not fetched; counts vary, verify at atlas.mitre.org).

### The one-sentence version
If you remember nothing else from this volume: **assume every model-level defense will be bypassed, and make sure that when it is, the agent still cannot reach anything that matters — then instrument it so you find out.** Input marking and guardrails thin the attack volume; architecture isolation removes the model's ability to act on what slips through; least privilege and containment bound the damage of what still gets through that; tool attestation keeps the supply chain honest; detection tells you it all happened and feeds the next iteration. No layer is a silver bullet; the stack is the defense.

## Related Defenses

- [[01-detection-signals-and-monitoring]] — the MEASURE layer
- [[02-input-isolation-and-spotlighting]] — L1 input
- [[03-dual-llm-and-camel]] — L2 architecture
- [[04-least-privilege-and-sandboxing]] — L3 authorization + L5 containment
- [[05-provenance-tool-attestation-and-mcp-hardening]] — L4 tool integrity

## References

- OWASP GenAI Security Project (LLM + Agentic Top 10) — https://genai.owasp.org/ — **HIGH**
- OWASP Top 10 for Agentic Applications, Dec 2025 — https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications — **HIGH**
- NIST AI RMF 1.0 + Generative AI Profile — https://www.nist.gov/itl/ai-risk-management-framework — **HIGH** (landing); AI 100-1 / AI 600-1 PDFs for function text — **HIGH**
- MITRE ATLAS — https://atlas.mitre.org/ — **MEDIUM** (via secondary; verify counts/mitigations on-site)
- IBM, "Adversarial Prompt Evaluation", arXiv:2502.15427 — https://arxiv.org/pdf/2502.15427 — **HIGH**
- "NeMo Guardrails vs Guardrails AI vs Lakera" — https://www.beri.net/article/nemo-guardrails-vs-guardrails-ai-vs-lakera-runtime-prompt-injection-2026 — **LOW** (vendor-skeptical secondary)
- Fiddler, "Prompt Injection Prevention for Coding Agents" — https://www.fiddler.ai/blog/prompt-injection-prevention-coding-agents — **MEDIUM**
