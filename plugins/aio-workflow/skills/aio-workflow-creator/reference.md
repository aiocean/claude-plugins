# aio-workflow-creator — engine mechanics reference

The mechanism behind every rule in `SKILL.md`. Each row states the *behavior* the rule is derived from, so you can reason about *why* a rule holds rather than just obey it. These describe the Workflow engine's observable contract; the *shape* of the rules is stable, but specific constants can drift between CLI builds — re-confirm a number against the live Workflow tool description if it ever looks off.

The architecture in one line: **receipt → gate → parse (read `meta` off the AST, never eval) → compile → persist (script to disk) → sandbox (determinism ban + frozen context) → run body raced against abort → `agent()` funnels through one FIFO semaphore → results surface asynchronously.**

---

## 1. Trigger — getting Workflow to fire on purpose

| Fact | Mechanic |
|---|---|
| Bare word `workflow`/`workflows` opts in | word-boundary detector (not a naive `\bworkflows?\b`) |
| Backtick/quote/angle-bracket the word → no trigger | delimiter skip-range state machine over a delimiter-pair map |
| `sub-workflow`, `workflow/run`, `workflow.json` → no trigger | post-match guards reject `/ \ -` neighbours and `.word` |
| A `/`-prefixed string (slash-command / skill pre-expansion) never triggers | leading-`/` short-circuit returns no match |
| Ultracode = standing opt-in: highest effort tier + "author and run a workflow for every substantive task… token cost is not a constraint" | session flag bound to the effort tier |

**Actionable:** say `workflow` bare to opt in; backtick it to discuss without firing. Leave ultracode off for cheap single-agent answers — with it on you're instructed to fan out even when one agent would do.

---

## 2. Authoring gates — rejected before any agent spawns

| Gate | Rule |
|---|---|
| `meta` first-statement | must be `export const meta = {ObjectExpression}` as the first body statement |
| pure-literal walker | only literals allowed; **template literal w/o interpolation** and **negative-number literal** are the only non-trivial forms; variables/calls/spreads/binary → throw |
| plain-JS | TS annotations/interfaces/generics fail the parse (plain-JS parser) |
| reserved meta keys | `__proto__`, `constructor`, `prototype` rejected (proto-pollution guard; meta built on a null-proto object) |
| `description`/`title` on the tool call are **ignored** | declared inert; authoritative source is the script's `meta` |
| `model` override belongs on a **phase entry**, not top-level | documented convention; a top-level `model` is not rejected, it just has no meaning |
| `args` reaches the script as the parsed JSON value verbatim | pass real arrays/objects, not a JSON string |

---

## 3. Determinism ban (why resume is stable)

| Throws | OK (no clock read) |
|---|---|
| `Date.now()`, bare `Date()`, argless `new Date()`, `Math.random()` | `new Date(ts)`, `Date.parse(s)`, `Date.UTC(...)` |

The throw message *is* the workaround: stamp timestamps after the workflow returns or pass via `args`; for N samples, **encode the index into the prompt** (the prompt is in the cache key; the label is not). The body runs in a frozen context; the execution timeout caps **synchronous CPU only**, not awaited agent time.

---

## 4. Concurrency & caps

| Constant | Value | Meaning |
|---|---|---|
| concurrency cap | `min(16, max(2, cores−2))` | concurrent `agent()` cap (computed once). **The floor of 2 matters** — the naive `min(16, cores−2)` would deadlock ≤2-core hosts |
| semaphore | — | FIFO p-limit; release **hands the slot directly to the next waiter** (count stays exact — a hard invariant, not a tendency) |
| acquire site | per `agent()` call | the cap is enforced **per `agent()` call**, so nested `parallel`/`pipeline` share ONE pool |
| lifetime cap | `1000` | runaway backstop; the counter is bumped **eagerly at dispatch** (counts intent-to-run); the **1001st** throws a `WorkflowAgentCapError` |
| internal runner limiter | `50` | limiter for an internal runner — **not on the `agent()` dispatch path**; ignore for authoring |
| preview cap | `400` | preview-text cap |
| default stall watchdog | `180000` (180 s) | default per-agent `stallMs`; override per-agent for slow silent work |
| stall-retry budget | `5` | stall retries before the agent is killed |
| throttle detector | — | not stalled/skipped, no stopReason, no structured output, `<50` output tokens, yet `>half stallMs` → one **45 s** backoff + one retry (disjoint from the 5 stall retries) |

Caps are network-politeness, not CPU sizing — agents are I/O-bound LLM calls. Design throughput by **item count**; the pool serializes the rest.

---

## 5. Combinators

### `pipeline(items, ...stages)` — per-item independent chains, NO inter-stage barrier
- Launches one chain per item at once; stages await **within** an item only. Wall-clock = **slowest single end-to-end chain**, not sum-of-slowest-per-stage.
- Stage signature `(prevResult, originalItem, index)`. A stage returning `null` short-circuits **that item's** remaining stages only.

### `parallel(thunks)` — barrier (awaits all, settle semantics)
- Entry guards **throw synchronously**: non-array arg, non-function element ("not promises — wrap each: `() => agent(...)`"). Empty array → `[]`.
- Awaits all; a thrown thunk does **not** reject the call — it surfaces as `null`.

### error → null, two tiers
- **Budget tier**: a budget-exceeded rejection → counted, **silent**, one aggregate "N slots dropped — token budget exceeded".
- **Generic tier**: any other (threw / agent error / user skip) → `parallel[i] failed: <msg>`, logged, nulled.
- ⇒ `null` is overloaded (threw | skipped | stage-null | budget-dropped). **Always `.filter(Boolean)`**; inspect the failure log to disambiguate.

**Default to `pipeline()`.** A barrier is correct ONLY for: dedup/merge across the full set, a zero-count early-exit, or a stage prompt referencing "the other findings." NOT for flatten/map/filter (do it in a stage) or "cleaner code."

---

## 6. `agent(prompt, opts)`

| Behavior | Detail |
|---|---|
| `schema` → forced StructuredOutput tool | validated at the tool-call layer; model retries on mismatch; returns the validated object |
| return is deep-cloned | the script can't mutate engine-internal state through the result |
| `null` return | user-skipped, threw, or budget-dropped |
| `opts.model` | **default omit** — inherit the resolved session model ("almost always correct"); set only when highly confident |
| `opts.label` | display only; default = prompt sliced to 60 chars; **not in cache key** |
| `opts.phase` | display only; **not in cache key**; set it inside stages to avoid racing the single mutable phase pointer |
| `opts.isolation:'worktree'` | fresh git worktree, **expensive** (~200–500 ms + disk); only when agents mutate files in parallel |
| `opts.agentType` | custom subagent type from the same registry as the Agent tool; composes with `schema` |
| nested `workflow()` | one level only; child shares the concurrency cap, agent counter, abort signal, token budget |

---

## 7. Resume — the cache key dictates everything

| Rule | Mechanic |
|---|---|
| key = rolling SHA-256 chain over `(prevKey, prompt, canonicalOpts)` | each agent's key feeds the next |
| **append, don't insert** | editing/inserting rewrites that key + the whole suffix → suffix re-runs; an appended tail leaves the prefix replayable from the journal |
| **relabel/regroup is free** | the opts allowlist is `schema`, `model`, `isolation`, `agentType` only; `label`/`phase` excluded; object keys sorted recursively (cosmetic JSON churn survives) |
| cache-busting edits | changing `schema`/`model`/`isolation`/`agentType` (they change what the agent does) |
| precedence | `scriptPath` > `script` > `name` |
| resume handle | `resumeFromRunId` matches `/^wf_[a-z0-9-]{6,}$/`; unchanged `(prompt,opts)` replay instantly; **stop the prior run first; same-session only** |
| allowlistable identity | only `name` is stable; ad-hoc `script`/`scriptPath` always re-prompt |

---

## 8. Token budget

| Field | Value |
|---|---|
| `budget` | a frozen object exposing `total`, `spent()`, `remaining()` |
| `total` | `null` when no "+500k"-style target was set |
| `remaining()` | `total==null ? Infinity : max(0, total − spent())` ⇒ **`while (budget.remaining() > N)` never ends with no target** |
| correct guard | `while (budget.total && budget.remaining() > 50_000)`; static `budget.total ? Math.floor(budget.total/100_000) : 5` |
| ceiling | **hard throw** once `spent() ≥ total`; a null/≤0 total disarms the check |
| pool | `spent()` is shared across the main loop and all (nested) workflows this turn |

---

## 9. Quality patterns (the HOW-MUCH vocabulary)

| Pattern | Failure it prevents |
|---|---|
| Adversarial verify | plausible-but-wrong survives a single confirming pass — N skeptics prompted to refute, "default refuted=true if uncertain", kill on majority |
| Perspective-diverse verify | N identical refuters share blind spots — give each a distinct lens |
| Judge panel | one-attempt-iterated under-explores — N angles → score → synthesize from winner |
| Loop-until-dry | fixed `count<N` misses the tail — loop until K empty rounds; **dedup vs `seen`, NOT `confirmed`** else never converges |
| Multi-modal sweep | one search angle misses things — parallel finders by container/content/entity/time |
| Completeness critic | "done" is self-asserted — a final agent asks what's missing |
| No silent caps | a bounded run reads as full coverage — `log()` what was dropped |
| Scale to ask | "find any bugs" → minimal; "thorough/audit" → maximal |

---

## 10. The prose layer (why this skill exists)

The large Workflow tool description is a **behavior-shaping prompt**, not documentation: the runtime enforces what it mechanically can (caps, throws, determinism — stated in one flat sentence each), and the prose carries exactly what the runtime **cannot** check — *when* to fan out (the opt-in gate and its negative shadow), *whether a barrier was necessary*, *how much effort*, and *coverage honesty*. A workflow that under-delivers passes every runtime check; **no guard fails it for you** — which is why a skill at this layer is the right surface.

Companion idiom in a second tool: `ScheduleWakeup`'s pacing block derives an entire schema from the **300 s prompt-cache TTL** — "don't pick 300s, it's the worst-of-both; drop to 270s or commit to 1200s+." Same shape: the runtime accepts any delay; the prose supplies the cost geometry the engine never will.
