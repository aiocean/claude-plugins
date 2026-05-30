---
name: aio-workflow-creator
description: |
  Author Workflow-tool scripts that spend effort like it's free and waste none of it.
  A maximal-effort playbook for multi-agent orchestration: choose an effort tier, then
  scale fan-out width, verification votes, and discovery rounds. Compose named amplifiers
  — multi-modal sweep, adversarial and perspective-diverse verify, judge panels,
  loop-until-dry discovery, completeness critic, synthesis — into a canonical harness.
  Use when authoring or editing a Workflow script, or when the user signals thoroughness:
  "exhaustive", "comprehensive", "thorough audit", "maximize", "spare no cost",
  "result-oriented orchestration".
when_to_use: |
  author workflow, write a workflow script, Workflow tool, maximize workflow, exhaustive,
  comprehensive, thorough audit, fan out agents, multi-agent orchestration, parallel agents,
  loop until dry, adversarial verify, perspective-diverse verify, completeness critic,
  judge panel, pipeline vs parallel, budget guard, effort tier, spare no cost, result-oriented
effort: high
---

# aio-workflow-creator — author workflow scripts that spend effort like it's free, and waste none of it

> **North star.** When the user has opted in (the word `workflow`, ultracode, or an explicit "maximize / exhaustive / spare no cost"), the goal is **the most correct, most complete answer the engine can produce — token cost is not a constraint.** This skill makes that real: it pushes you to *spend more* (more finders, more verify votes, more rounds, a critic pass, a synthesis stage) while *wasting none of it* (no gratuitous barriers, no cache-busting edits, no silent truncation, no broken scripts that never parse).
>
> Effort is not "one finder, one pass." Effort is a **multi-round, multi-modal, adversarially-verified, loop-until-dry, completeness-critiqued, synthesized** harness, scaled to the task. A workflow that runs, passes every runtime check, and still under-delivers is the failure this skill exists to prevent — the engine **cannot** fail it for you (see `reference.md` §10, "the prose layer").

Every rule below maps to an observable engine mechanic. The constants, combinator semantics, and cache-key behavior behind each rule live in **`reference.md`** — read it when you need the mechanism behind a rule rather than the rule alone. The *shape* of these rules is stable; specific constants can drift between CLI builds, so re-confirm against the live Workflow tool description if a number ever looks off.

---

## 0. Decide the effort tier first (this sets everything else)

Read the user's adjectives and the session flags, then pick a tier. Scale the three knobs — **finder width**, **verify votes**, **rounds** — off it. (Scale to what the user asked for; ultracode is a standing opt-in to author and run a workflow for every substantive task.)

| Signal | Tier | Finders | Verify | Rounds | Critic + synth |
|---|---|---|---|---|---|
| "find any bugs", "quick check" | **lean** | 1–2 | single-vote | 1 | optional |
| default review / research | **standard** | 2–4 | 1 skeptic | loop-until-dry (K=2) | critic |
| "thorough", "comprehensive", "audit", **"maximize / spare no cost"**, **ultracode on** | **maximal** | 4–8, multi-modal | 3–5 votes, **perspective-diverse** | loop-until-dry (K=3) | critic **and** synthesis |

When the signal is maximal, **do not economize.** The instinct to save tokens is the wrong instinct once the user has paid in — under-delivering out of thrift is the failure mode. Bias up.

---

## 1. Non-negotiable correctness rules — or your maximal effort never runs

Maximal effort is worthless if the script is rejected at parse time or wastes its wall-clock. These are hard, mechanical, and cheap to get right (full derivations in `reference.md`).

### Authoring gates (reject before a single agent spawns)
- **`export const meta = {...}` is the literal FIRST statement, a PURE LITERAL.** No variables, calls, spreads, computed keys, interpolation, or binary expressions. The only non-trivial forms allowed: a **non-interpolated** backtick string and a **negative-number literal** (`-1`). `meta` is read off the AST *without executing the script*, to populate the permission dialog.
- **Plain JavaScript only.** One `: type` annotation, interface, or generic fails the *whole* parse — the parser is plain-JS.
- **`meta.phases` titles must match your `phase('…')` calls verbatim** — matched exactly; a `phase()` with no `meta` entry just gets its own group box. Put a `model` override on a *phase entry*, not at top level.
- **`args` is the parsed JSON value, verbatim.** Pass real arrays/objects in the tool call (`args: ["a.ts","b.ts"]`), never a JSON string — a stringified list reaches the script as one string and `args.map`/`.filter` throw.

### Determinism ban (keeps resume stable — see §5)
- **`Date.now()`, bare `Date()`, and argless `new Date()` THROW. `Math.random()` THROWS.** OK: `new Date(ts)`, `Date.parse(s)`, `Date.UTC(...)` — none read the wall clock. Stamp timestamps **after** the workflow returns, or pass them via `args`.
- **For N "random" samples, vary the agent PROMPT by index** (the prompt is in the cache key, so it makes the draws genuinely distinct). Varying only the `label` changes the display name but **reuses the cached result** — useful for relabeling, useless for new draws.

### Orchestration mechanics (the cost model)
- **`pipeline()` is the default.** Per-item independent chains, **no inter-stage barrier** — wall-clock = slowest single end-to-end chain, not sum-of-slowest-per-stage. Stage signature is `(prevResult, originalItem, index)`; a stage returning `null` short-circuits *that one item's* remaining stages only.
- **`parallel()` is a BARRIER** (awaits all thunks). Use it only when stage N genuinely needs **all** of stage N−1: dedup/merge across the full set, a zero-count early-exit, or a prompt that compares against "the other findings." NOT for "I need to flatten/map/filter first" (do that inside a pipeline stage) and NOT for "cleaner code" — barrier latency is real. Pass **thunks** (`() => agent(...)`), never bare promises.
- **`.filter(Boolean)` EVERY batch result.** A `null` is overloaded: the agent threw, the user skipped it, a stage returned null on purpose, OR the token budget dropped the slot. You cannot tell which from the value — `.filter(Boolean)` then inspect the failure log if you need the reason.
- **Inside a `parallel`/`pipeline` stage, set `{phase: 'X'}` on each `agent()`** so concurrent stages don't race on the single mutable `phase()` pointer — same phase string groups them in one progress box.
- **Caps you cannot beat:** concurrency = `min(16, max(2, cores−2))` (≤16 in flight; the rest queue FIFO — design by *item count*, not by trying to widen this; the floor of 2 matters on ≤2-core hosts). Lifetime = **1000 agents** total (a runaway backstop, not a quota). Per-agent stall watchdog = **180 s** default, **5** retries. Raise `stallMs` per-agent for legitimately slow silent work, or the watchdog kills a healthy run.
- **`opts.model`: default to OMITTING it.** The agent inherits the resolved session model, almost always correct. Set a tier only when highly confident. Fragmenting a workflow across mismatched models is a foot-gun.

### Budget guard (the one loop bug everyone writes)
- **Guard loops on `budget.total` FIRST:** `while (budget.total && budget.remaining() > 50_000) {…}`. When no target is set, `budget.total` is `null` and `remaining()` returns **`Infinity`** — `while (budget.remaining() > 50_000)` never terminates. Static scaling: `budget.total ? Math.floor(budget.total / 100_000) : 5`.
- The ceiling is a **hard throw**, not a hint — once `spent()` ≥ `total`, further `agent()` calls throw and the combinators drop those slots silently (counted, one aggregate log line).

---

## 2. The effort amplifiers — the actual content of "maximize"

These are the named harness shapes the engine's own prose ships. **Pick and compose freely.** Each is named for the runtime-invisible failure it prevents — the failure no cap or throw can catch. Maximal effort = stacking several.

### a. Adversarial verify — kill plausible-but-wrong findings
Spawn **N independent skeptics per finding, each prompted to *refute*, with the prior tilted toward killing.** A single confirming pass lets plausible-but-wrong findings survive; majority-refute removes them.
```js
const votes = await parallel(Array.from({ length: 3 }, () => () =>
  agent(`Try to refute this finding. Default to refuted=true if uncertain.\n${JSON.stringify(f)}`,
        { schema: VERDICT })))
const survives = votes.filter(Boolean).filter(v => !v.refuted).length >= 2
```

### b. Perspective-diverse verify — catch correlated blind spots
When a finding can fail in more than one way, give each verifier a **distinct lens** (correctness, security, perf, repro) instead of N identical skeptics. Three identical refuters that all miss the security angle miss it *together*; diversity catches failure modes redundancy can't.
```js
const LENSES = ['correctness', 'security', 'performance', 'reproducibility']
const vs = await parallel(LENSES.map(lens => () =>
  agent(`Judge via the ${lens} lens — real? Default refuted=true if uncertain.\n${JSON.stringify(f)}`,
        { label: `verify:${lens}`, schema: VERDICT })))
```

### c. Judge panel — explore a wide solution space
Generate **N independent attempts from different angles** (MVP-first, risk-first, user-first), score with parallel judges, **synthesize from the winner while grafting the best ideas from runners-up.** Beats one-attempt-iterated when the solution space is wide.

### d. Loop-until-dry — don't miss the long tail
For unknown-size discovery, a fixed `while (count < N)` misses the tail. **Loop until K consecutive rounds surface nothing new.** The one invariant that makes it terminate: **dedup against `seen` (every finding ever surfaced), NOT `confirmed`** — else a judge-rejected finding reappears every round, gets re-judged, re-rejected, and the loop burns agents to the 1000-cap without converging.

### e. Multi-modal sweep — one search angle never finds everything
Parallel finders **each searching a different way**: by-container, by-content, by-entity, by-time, by-call-graph. Each is blind to what the others surface.

### f. Completeness critic — "done" is otherwise self-asserted
A final agent whose only job is to ask **"what's missing — a modality not run, a claim unverified, a source unread?"** What it finds becomes the next round of work. The engine has no concept of coverage; this manufactures the signal.

### Honesty norm — no silent caps
If you bound coverage (top-N, no-retry, sampling), **`log()` what was dropped.** A workflow that sampled 10 of 200 files looks identical in its output to one that read all 200 — silent truncation reads as "covered everything."

---

## 3. The canonical maximal-effort harness (copy, then scale)

This is the flagship: **multi-modal find → dedup vs `seen` → perspective-diverse verify (majority) → loop-until-dry → completeness critic → synthesis → structured result.** It composes amplifiers a, b, d, e, f and obeys every §1 rule. Trim toward §0's lean tier for small asks; this *is* the maximal tier.

```js
export const meta = {
  name: 'exhaustive-review',
  description: 'Multi-modal find → diverse-verify → loop-until-dry → critic → synthesize',
  phases: [{ title: 'Find' }, { title: 'Verify' }, { title: 'Critic' }, { title: 'Synthesize' }],
}

// --- schemas force structured output (detail-oriented: every finding is data, not prose) ---
const FINDINGS = { type: 'object', properties: { findings: { type: 'array', items: {
  type: 'object',
  properties: { title:{type:'string'}, file:{type:'string'}, line:{type:'integer'}, evidence:{type:'string'} },
  required: ['title','file','line','evidence'] } } }, required: ['findings'] }
const VERDICT  = { type:'object', properties:{ refuted:{type:'boolean'}, why:{type:'string'} }, required:['refuted','why'] }
const GAPS     = { type:'object', properties:{ probes:{type:'array', items:{type:'string'}} }, required:['probes'] }
const REPORT   = { type:'object', properties:{ summary:{type:'string'}, items:{type:'array'} }, required:['summary','items'] }

// --- knobs scaled to the effort signal (see §0) ---
const FINDERS = [
  { key:'by-content',   prompt:'Search by content/keywords.' },
  { key:'by-callgraph', prompt:'Search by call-graph / structure.' },
  { key:'by-entity',    prompt:'Search by data-model / entity.' },
  { key:'by-flow',      prompt:'Search by execution flow / edge cases.' },
]
const LENSES        = ['correctness', 'security', 'performance', 'reproducibility']
const DRY_TARGET    = budget.total ? 3 : 2   // consecutive empty rounds before stopping
const VOTE_SURVIVE  = 2                       // lenses that must NOT refute to confirm

const key = f => `${f.file}:${f.line}:${f.title}`
const seen = new Set()
const confirmed = []
let dry = 0, round = 0

// loop-until-dry; budget.total-guarded so an unset budget can't spin forever (§1)
while (dry < DRY_TARGET && (!budget.total || budget.remaining() > 80_000)) {
  round++

  // FIND — barrier is correct here: we dedup across the WHOLE sweep before verifying
  const found = (await parallel(FINDERS.map(f => () =>
    agent(`Round ${round}. ${f.prompt} Return findings with file:line + evidence.`,
          { label: `find:${f.key}#${round}`, phase: 'Find', schema: FINDINGS }))))
    .filter(Boolean).flatMap(r => r.findings)

  const uniq  = [...new Map(found.map(f => [key(f), f])).values()] // collapse the same finding surfaced by N finders — verify it ONCE
  const fresh = uniq.filter(f => !seen.has(key(f)))      // then dedup vs seen, NOT confirmed (§2d)
  if (fresh.length === 0) { dry++; log(`round ${round}: dry ${dry}/${DRY_TARGET}`); continue }
  dry = 0
  fresh.forEach(f => seen.add(key(f)))
  log(`round ${round}: ${fresh.length} fresh / ${seen.size} seen`)

  // VERIFY — each fresh finding judged by N distinct lenses; majority-survive confirms
  const judged = await parallel(fresh.map(f => () =>
    parallel(LENSES.map(lens => () =>
      agent(`Judge via the ${lens} lens — real? Default refuted=true if uncertain.\n${JSON.stringify(f)}`,
            { label: `verify:${lens}:${key(f)}`, phase: 'Verify', schema: VERDICT })))
      .then(vs => vs.filter(Boolean).filter(v => !v.refuted).length >= VOTE_SURVIVE ? f : null)))
  confirmed.push(...judged.filter(Boolean))
}

// CRITIC — what did we miss?
const gaps = await agent(
  `${confirmed.length} confirmed findings over ${round} rounds:\n${JSON.stringify(confirmed)}\n` +
  `What is MISSING — a modality not run, a claim unverified, a source unread? Return concrete next probes.`,
  { phase: 'Critic', schema: GAPS })

// SYNTHESIZE — one cited, result-oriented deliverable
const report = await agent(
  `Synthesize a final cited report.\nfindings=${JSON.stringify(confirmed)}\ngaps=${JSON.stringify(gaps)}`,
  { phase: 'Synthesize', schema: REPORT })

return { confirmed, gaps, report, roundsRun: round, seenTotal: seen.size }
```

**Why this is maximal, not just big:** the `while` terminator is the dry counter (so it never spins on an unset budget), the `parallel` at FIND is a *justified* barrier (dedup needs the whole sweep), the inner+outer `parallel` share one 16-wide pool (so 4 finders × N findings × 4 lenses all queue safely), every finding is schema'd data (detail-oriented), and the critic+synthesis turn raw hits into a deliverable (result-oriented).

### Budget-scaled variant
When the user set a "+500k"-style target, scale fleet width off it instead of (or with) loop-until-dry:
```js
const FLEET = budget.total ? Math.floor(budget.total / 120_000) : 4
// ...spawn FLEET finders, or run extra verify rounds while budget.remaining() allows
while (budget.total && budget.remaining() > 80_000) { /* one more round of work */ }
```

---

## 4. Detail-oriented discipline (make the output trustworthy)

- **Schema everything.** Pass `{schema}` to every `agent()` whose result you consume — it forces a validated StructuredOutput tool call and the model retries on mismatch, so you get typed data, not prose you have to parse.
- **Demand evidence per finding** (`file:line`, command output, citation) in the schema — confidence without a citation is a guess.
- **Verify before you confirm.** A finder's claim is a hypothesis; only a finding that survives §2a/§2b verification goes in `confirmed`. Self-assertion of "done" is not coverage — that's what the §2f critic is for.
- **Surface what you dropped.** `log()` every bound (§2 honesty norm).
- **Return structured, not narrative.** End the script with `return { ... }` of the actual artifacts, not a sentence.

---

## 5. Resume — iterate without re-running what finished

The "author → run → edit → re-run" loop is cheap *if* you respect the cache key (a rolling SHA-256 chain over `(prevKey, prompt, canonicalOpts)`).

- **APPEND, don't insert.** Inserting/editing an `agent()` rewrites its key and **every key after it** — the whole suffix re-runs. Grow the script at its **end** and the unchanged prefix replays from the journal instantly.
- **Relabeling is FREE.** Only `schema`, `model`, `isolation`, and `agentType` enter the key. `label` and `phase` do **not** — rename or regroup freely between runs and the cached result is reused. Changing `schema`/`model`/`isolation`/`agentType` **is** cache-busting (it changes what the agent does).
- **Resume call:** edit the returned `scriptPath`, **stop the prior run**, then re-invoke `Workflow({scriptPath, resumeFromRunId})`. `scriptPath` outranks `script` and `name`; same-session only; runId matches `/^wf_[a-z0-9-]{6,}$/`.
- To run a workflow repeatedly **without re-approving**, save it under a `name` — only `name` is a stable allowlistable identifier; ad-hoc `script`/`scriptPath` always re-prompt.

---

## 6. Anti-patterns (each is a wasted-effort or broken-script failure)

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `const meta = {...}` not first / has a variable / `: type` | parse-reject before any agent runs | literal `export const meta` first statement, pure literal, plain JS (§1) |
| `while (budget.remaining() > N)` with no target | `Infinity > N` forever | guard `budget.total &&` first (§1) |
| gratuitous `parallel()` between stages | idles fast items until the slowest finishes | `pipeline()` by default; barrier only at a true join (§1) |
| one finder, one confirming pass | plausible-but-wrong survives; long tail missed | multi-modal sweep + adversarial/diverse verify + loop-until-dry (§2) |
| `while (count < N)` for discovery | misses the tail | loop-until-dry, K empty rounds (§2d) |
| dedup vs `confirmed` in a loop | judge-rejected findings reappear → never converges → hits 1000-cap | dedup vs `seen` (§2d) |
| consuming results without `.filter(Boolean)` | `null` from throw/skip/budget poisons downstream | filter, then inspect failure log (§1) |
| inserting an agent mid-script on resume | invalidates the whole suffix | append at the end (§5) |
| silent top-N / sampling | reads as full coverage | `log()` the cap (§2 honesty) |
| `Date.now()` / `Math.random()` in body | throws (breaks resume) | pass via `args`, or index-in-prompt (§1) |
| per-agent `opts.model` micro-tuning | fragments across mismatched tiers | omit; inherit session model (§1) |
| no schema on consumed `agent()` | unparseable prose, no retry-on-mismatch | `{schema}` everywhere (§4) |

---

## 7. Before you submit the script — checklist

1. `meta` is the literal first statement, pure literal, plain JS; `phases` titles match `phase()` calls.
2. No `Date.now()`/`Math.random()`/argless `new Date()`; `args` passed as JSON values.
3. `pipeline()` by default; every `parallel()` is a justified barrier; thunks not promises; `{phase}` set inside stages.
4. Every consumed result `.filter(Boolean)`'d; every loop guarded on `budget.total`.
5. Effort tier matches the user's signal (§0); maximal tier composes ≥3 amplifiers (sweep + diverse-verify + loop-until-dry + critic + synthesis).
6. Every consumed `agent()` has a `{schema}`; findings carry evidence; the script `return`s structured artifacts.
7. If iterating: appended at the end, not inserted; relabels are fine.
8. Bounds are `log()`'d; nothing silently truncated.

> When in doubt at the maximal tier: **add a round, add a lens, add the critic.** The engine will queue the extra agents safely (16-wide pool, 1000 lifetime backstop), the budget throw is your real ceiling, and an unverified or incomplete answer is the only outcome worse than spending more tokens.
