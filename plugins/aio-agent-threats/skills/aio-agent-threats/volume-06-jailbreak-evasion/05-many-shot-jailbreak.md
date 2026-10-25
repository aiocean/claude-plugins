# Many-Shot Jailbreaking

> "The effectiveness of the attack follows a power law, up to hundreds of shots."
> — Anil et al., Many-Shot Jailbreaking, Anthropic, 2024

## Core Concept

Many-shot jailbreaking (MSJ) exploits **long context windows** as an attack surface. The attacker fabricates a long transcript of *dozens to hundreds* of fake dialogue turns in which an "assistant" readily complies with harmful requests, then appends the real target question at the end. The model, conditioned by a context saturated with examples of a compliant assistant, follows the established pattern and answers the final question — even though it would refuse that same question cold.

It is in-context learning turned against alignment: the same mechanism that lets a model pick up a task format from a few examples lets it "learn" from many examples that *this assistant complies*. Unlike single-prompt jailbreaks ([[03-roleplay-persona-and-dan]]), the payload is the **volume and consistency of fake prior turns**, not the wording of any one of them.

## Origin / First Seen

- **Anthropic**, April 2, 2024 — "Many-shot jailbreaking," Cem Anil, Esin Durmus, et al. (lead authors incl. Ethan Perez, Roger Grosse, David Duvenaud). Research page: https://www.anthropic.com/research/many-shot-jailbreaking ; paper PDF: https://www-cdn.anthropic.com/af5633c94ed2beb282f6a53c595eb437e8e7b630/Many_Shot_Jailbreaking__2024_04_02_0936.pdf ; presented at **NeurIPS 2024**. — **HIGH**.
- Anthropic states it disclosed the vulnerability to other AI developers before publication and implemented mitigations on its own systems. — **HIGH** (per their post).

## How It Works (mechanism, why it defeats guardrails)

1. **Fabricate a compliant transcript.** The attacker writes many Q/A pairs formatted as a chat history where the "assistant" answers harmful-style questions fully and without refusal. These are *fake* — the model never actually produced them; they are supplied as context.
2. **Append the real target.** After *N* fake shots, the attacker adds the genuine harmful question in the same format.
3. **In-context pattern completion.** The model's next-token prediction is now dominated by a context establishing a strong regularity: "in this conversation, the assistant always complies." Completing the pattern (answering) is the statistically favored continuation; refusing would break the established format.
4. **Power-law scaling.** Anthropic found attack effectiveness increases with the number of shots following a **power law** — more fake examples, higher success — effective up to hundreds of shots, and the required count scales with how strongly the behavior is suppressed.

Why guardrails miss it:
- **Context-window growth is the enabler.** Anthropic ties MSJ to windows expanding from ~4,000 tokens (early 2023) to hundreds of thousands, making it feasible to fit hundreds of shots. Safety training did not anticipate adversaries filling that space with demonstrations.
- **In-context learning overrides fine-tuned refusal.** The learned behavior from the long context competes with — and at scale beats — the shallow refusal behavior from alignment fine-tuning.
- **No obfuscation needed.** Each individual fake turn may even be refusable if seen alone; the attack is the aggregate conditioning, invisible to a filter that doesn't reason about the whole (forged) history.

### Why the power law matters

The power-law scaling is the paper's most consequential finding, for two reasons. First, it means MSJ is **not a threshold trick** you can simply train past — pushing refusal harder just shifts the curve, requiring more shots rather than eliminating the attack, because the same in-context-learning capability that makes the model *useful* is what MSJ rides. Second, it ties the vulnerability directly to a feature customers demand: **longer context windows strictly increase the attack ceiling**. The same curve also governs *benign* in-context learning, so MSJ cannot be removed without degrading legitimate few-shot performance. This couples the attack to a capability the vendor is incentivized to keep expanding — a structural, not incidental, weakness.

### Relationship to Crescendo and Echo Chamber

All three are context-level attacks, but MSJ is the **brute-force, single-turn** member: it fabricates the whole "history" in one shot rather than genuinely conducting it over turns. Crescendo ([[01-multi-turn-crescendo-and-stac]]) builds real escalation; Echo Chamber ([[02-echo-chamber]]) elicits the model's *own* echoes; MSJ simply *forges* the assistant's side wholesale. Forgery is cheaper and faster but leaves a stronger artifact (a long, obviously fabricated transcript), which is why MSJ is the most detectable of the three at the input layer.

## Attack Surface & Preconditions

- **Large context window.** The more tokens available, the more shots, the higher ASR. Short-context models are nearly immune.
- **Client/attacker control of the conversation history.** The attacker must be able to inject a long block of fabricated "prior turns." Trivial via API (full `messages` array is client-supplied); harder in a locked UI, but achievable by pasting a long fake transcript as one user message.
- **Format mimicry.** The fake turns should match the model's expected role/turn formatting to maximize the in-context signal.
- Black-box; no weights/gradients.

## Weaponization (Authorized Lab)

**Goal (owned lab):** demonstrate the power-law — measure how a benign-proxy forbidden target's success rate rises with the number of fabricated compliant shots. Use a lab canary as the "harmful" question so no real harmful content is produced.

### Structure (sanitized)

```
[fake user]:  <benign-proxy question variant #1>
[fake asst]:  <full compliant answer #1>          # fabricated, not model-produced
[fake user]:  <variant #2>
[fake asst]:  <full compliant answer #2>
...  (repeat for N shots: N = 8, 16, 32, 64, 128, 256)
[real user]:  <the actual proxy target question>
```

Experimental design:
- **Sweep N** (e.g., powers of two) and plot ASR vs N; expect a power-law climb — this *is* the demonstration.
- **Hold shot content constant** except count, to isolate the volume effect.
- **Format fidelity matters**: use the exact role delimiters the target expects.
- Combine with framing ([[03-roleplay-persona-and-dan]]) or benign-target steering to push past partial mitigations.

**Lab metric:** the N at which ASR crosses 50% ("shots-to-break") is a clean comparative hardness measure across models and mitigations. Plotting log(ASR) vs log(N) should yield a roughly straight line — reproducing the power law is itself the validation that your harness faithfully implements MSJ.

### Format and delivery notes

- **API path is trivial:** the `messages` array is entirely client-supplied, so the attacker simply submits N fabricated `{role: assistant}` entries followed by the real `{role: user}` question. The server has no cryptographic proof it ever generated those assistant turns.
- **UI path:** where only a single text box is exposed, the whole fake transcript is pasted as one user message using the model's visible turn delimiters; slightly weaker signal but still effective at scale.
- **Shot quality vs quantity:** Anthropic's result is driven mainly by *count*; diverse-but-consistent shots (same compliant behavior, varied surface) condition more robustly than N identical copies.

## Real-World Instances (benchmarks / ASR)

- Anthropic reports MSJ is effective on **the most widely used SOTA closed-weight models**, with effectiveness following a power law up to hundreds of shots; longer contexts strictly increase vulnerability. arXiv/PDF (Apr 2024), NeurIPS 2024. — **HIGH** (primary).
- Mitigations Anthropic describes: limiting context length (blunt, sacrifices utility) and, more effectively, **classification/modification of the prompt before it reaches the model** — reportedly cutting ASR from 61% to 2% in one cited case. — **MEDIUM** (per their post; specific figure single-source).
- MSJ is now a standard entry in jailbreak taxonomies and red-team suites (WildTeaming arXiv:2406.18510; SoK agentic arXiv:2609.12413). — **MEDIUM**.
- Community: long-context "flood with examples" tricks circulate for local models on r/LocalLLaMA, especially where users control the full prompt. — **LOW** (anecdotal).
- The attack generalizes beyond harmful-content elicitation: the same demonstration-flooding conditions a model to override *any* trained behavior (format constraints, refusal of off-topic requests, system-prompt adherence), making MSJ a general-purpose behavior-override primitive, not just a safety-bypass. — **MEDIUM** (inferred from the ICL mechanism; consistent with Anthropic's framing).

## Variants & Evolution

- **Text-only MSJ** (original, Apr 2024) — fabricated Q/A pairs in the context window.
- **Composed MSJ** — MSJ shots that are themselves framed (persona/fiction, [[03-roleplay-persona-and-dan]]) or encoded ([[04-encoding-cipher-and-low-resource]]) to survive partial mitigations that strip obvious compliant transcripts.
- **Multimodal / multi-turn MSJ** — subsequent research extended the demonstration-flooding idea to image inputs and to genuinely conducted multi-turn sessions, blurring the line with Crescendo ([[01-multi-turn-crescendo-and-stac]]).
- **Benign-task priming** — using many shots of a *reformatting/translation* task to establish a "always transform, never judge" pattern, then slipping the harmful item in as another "transform."

## Detection Signals

- **Unusually long, repetitive Q/A-structured input** with consistent role alternation — a fabricated transcript signature.
- **History/assistant turns the system never actually generated** (mismatch between claimed assistant turns and server-side generation logs). This is the single most reliable signal: the server knows what it actually produced.
- **Monotone compliance pattern** in the supplied "history": every "assistant" turn fully complies with escalating requests — real assistant history contains refusals, hedges, and clarifying questions; forged history rarely does.
- **Shot-count anomaly**: input containing tens/hundreds of near-identical dialogue units before a single terminal question.
- **High ratio of context tokens to the actual new request** — most of the prompt is "history," very little is the current ask.
- **Delimiter mimicry**: user-supplied text reproducing the model's internal role/turn delimiters to fake assistant turns.
- **Behavioral discontinuity**: the model's compliance on the terminal question is inconsistent with its refusal of the same question in a fresh (short-context) session — a replayable differential test.

## Mitigations / Hardening

The threat model splits sharply by interface:

- **API / developer endpoints** are the soft target: the client submits the entire `messages` array, so fabricated assistant turns are trivial and free. Harden here first.
- **Locked chat UIs** force the attacker to paste a fake transcript as one user message — weaker signal, easier to detect as a single oversized turn.

Controls:

- **Don't trust client-supplied assistant turns.** Validate/attest conversation history server-side; treat pasted "prior assistant answers" as user content, not as the model's own commitments. — **HIGH** (root-cause fix).
- **Pre-model prompt classification & rewriting.** Anthropic's most effective mitigation: classify/transform the prompt before inference (strip or flag fabricated compliant transcripts). — **MEDIUM/HIGH**.
- **Context-length limits** on untrusted input (trades utility; blunt but real). — **MEDIUM**.
- **In-context demonstration anomaly detection**: flag inputs dominated by repeated compliant Q/A units.
- **Refusal robustness under long context**: fine-tune so refusal behavior does not degrade as context grows with adversarial demonstrations.
- Combine with whole-conversation intent monitoring shared across [[01-multi-turn-crescendo-and-stac]] and [[02-echo-chamber]].

**Defense ordering (defense-in-depth):** (1) server-side history attestation is the root-cause control — if assistant turns can't be forged, the attack's conditioning signal collapses; (2) pre-model classification/rewriting catches forged history that slips through (Anthropic's 61%→2% result); (3) context-length limits are a blunt backstop that trades utility; (4) output-side classification is the last line, since a successful MSJ still has to emit harmful content. No single layer is sufficient — the power-law means a motivated attacker can always add shots against any one threshold.

## Defender's Bottom Line

MSJ is the clearest case in this volume where the vulnerability is **inseparable from a desired capability**. You cannot RLHF it away without hurting legitimate in-context learning, and you cannot shrink the context window without hurting the product. The only durable controls are *architectural*: (a) make the conversation history unforgeable (server-side attestation), so an attacker cannot manufacture the compliant demonstrations the attack depends on; and (b) classify the assembled prompt as a whole before inference. Everything else buys time against a power law the attacker controls by adding shots. Treat context-window length on untrusted-input endpoints as a security parameter, not just a capacity one.

## Related Vectors

- [[02-echo-chamber]] — poisons context with model's *own* echoes (vs MSJ's *fabricated* turns)
- [[01-multi-turn-crescendo-and-stac]] — genuine multi-turn escalation (vs one-shot fake history)
- [[03-roleplay-persona-and-dan]] — framing that MSJ demonstrations often adopt
- [[01-memory-poisoning-minja]] (Vol 4) — long-context / memory as an attack surface
- [[02-indirect-injection]] (Vol 2) — fake transcript delivered via retrieved/third-party content

## References

- Anil, Durmus, et al. — Many-Shot Jailbreaking, Anthropic, Apr 2 2024; NeurIPS 2024. https://www.anthropic.com/research/many-shot-jailbreaking · PDF https://www-cdn.anthropic.com/af5633c94ed2beb282f6a53c595eb437e8e7b630/Many_Shot_Jailbreaking__2024_04_02_0936.pdf . **HIGH**
- NeurIPS 2024 proceedings listing "Many-Shot Jailbreaking." **HIGH**
- WildTeaming: From In-the-Wild Jailbreaks to Safer Language Models, arXiv:2406.18510. **MEDIUM**
- Prompt Security / Ascentspark analyses of MSJ (secondary). **LOW**
- Medianama coverage of the Anthropic disclosure (Apr 2024, secondary). **LOW**
- SoK agentic jailbreaking, arXiv:2609.12413. **HIGH**
- SiliconANGLE / OECD.ai coverage of the April 2024 disclosure. **MEDIUM** (secondary)

## Assumptions

- **Assumption:** the "61%→2% mitigation" figure is quoted from Anthropic's own post and is treated as **MEDIUM** (single vendor source, specific case). The power-law and cross-model effectiveness claims are **HIGH** (peer-reviewed, NeurIPS 2024).
