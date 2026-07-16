# The adaptive review workflow

This is the harness the skill runs when there's actual code to review. It turns the
Google eng-practices rubric (the rest of this skill) into an executable, project-aware
review instead of a static checklist.

## Shape — why these phases

A naive review runs one linter and eyeballs the diff. This one adapts to the project
first, then reviews on two independent tracks, then kills its own false positives before
it dares to give a verdict.

```
Profile  ── 3 agents in parallel ──▶  understand · detect tooling · extract conventions
   │                                    (barrier: the whole review depends on the profile)
   ▼
Mechanical  ── run the tools the profile actually found  (lint / type-check / test)
Semantic    ── multi-lens sweep applying the 8-dimension rubric + house conventions
   │            (loop-until-dry, bounded by tier)
   ▼
Consolidate ── dedup both tracks → adversarially verify each → severity-rank → LGTM verdict
```

Key design decisions (this is the "better workflow" over a flat 1→5 pipeline):

- **Profile is parallel, not three sequential steps.** Understanding the project, detecting
  lint tools, and extracting conventions are independent discovery tasks — they fan out.
- **"Run it" is two tracks, not one.** *Mechanical* runs the linters/type-checkers/tests the
  profile detected. *Semantic* applies human review judgment (the eng-practices 8 dimensions)
  against the diff **and the house conventions** — so the review enforces *this* codebase's
  style, per "prefer consistency with surrounding code," not generic best practice.
- **Consolidate verifies before it reports.** Linters emit noise; LLM reviewers hallucinate
  plausible-but-wrong findings. Each candidate finding is adversarially re-checked against the
  real file and dropped if it can't be confirmed. Only survivors reach the verdict.
- **The output speaks eng-practices.** Severity labels (`blocking` / `nit` / `optional` / `fyi`),
  an LGTM verdict against **The Standard** (approve iff it improves overall code health), kind
  comments about the code (not the author), and it calls out what's *good*, not only defects.

## How the skill invokes it

Scope the diff **inline first** (before calling the Workflow tool), then pass the scope into `args`:

```
args = {
  scope: "working tree vs HEAD"            // or "PR #123", "origin/main...HEAD", etc.
  base:  "HEAD",                            // ref the review agents diff against
  files: ["path/a.ts", "path/b.go"],        // changed files (from git diff --name-only)
  tier:  "standard"                          // lean | standard | maximal
}
```

Pick the tier from the user's signal (see `aio-workflow-creator` §0):
`lean` for a quick spot-check, `standard` by default, `maximal` for "thorough / audit / spare no cost."
For a trivial one-file diff, skip the workflow entirely and use a single reviewer agent — the
multi-agent machinery is dead weight on a change with one obvious answer.

Pass the script **inline** via the Workflow tool's `script` parameter, adapting the knobs to the
detected project. Do not write it to a file first.

## The script

```js
export const meta = {
  name: 'adaptive-code-review',
  description: 'Profile project → run mechanical + semantic review → consolidate into an LGTM verdict',
  phases: [
    { title: 'Profile' },
    { title: 'Mechanical' },
    { title: 'Semantic' },
    { title: 'Consolidate' },
  ],
}

// --- inputs (scoped inline before the workflow ran) ---
const TIER  = (args && args.tier)  || 'standard'
const SCOPE = (args && args.scope) || 'working tree vs HEAD'
const BASE  = (args && args.base)  || 'HEAD'
const FILES = (args && args.files) || []
const FILELIST = FILES.length ? FILES.join('\n') : '(discover changed files with `git diff --name-only ' + BASE + '`)'

// --- schemas: every consumed result is typed data, not prose ---
const PROFILE = { type:'object', properties:{
  languages:{type:'array', items:{type:'string'}},
  frameworks:{type:'array', items:{type:'string'}},
  architecture:{type:'string'},
  purpose:{type:'string'},
}, required:['languages','architecture','purpose'] }

const TOOLING = { type:'object', properties:{
  commands:{type:'array', items:{ type:'object', properties:{
    name:{type:'string'}, cmd:{type:'string'}, kind:{type:'string'}, // lint|format|typecheck|test|security
  }, required:['name','cmd','kind'] }},
  notes:{type:'string'},
}, required:['commands'] }

const CONVENTIONS = { type:'object', properties:{
  patterns:{type:'array', items:{type:'string'}},
  naming:{type:'string'},
  errorHandling:{type:'string'},
  layering:{type:'string'},
  houseRules:{type:'array', items:{type:'string'}},
}, required:['patterns','houseRules'] }

const FINDINGS = { type:'object', properties:{ findings:{ type:'array', items:{
  type:'object', properties:{
    title:{type:'string'},
    file:{type:'string'},
    line:{type:'integer'},
    dimension:{type:'string'},   // design|functionality|complexity|tests|naming|comments|style|docs|lint
    severity:{type:'string'},    // blocking|nit|optional|fyi
    evidence:{type:'string'},    // file:line + what's wrong
    suggestion:{type:'string'},  // concrete fix
    source:{type:'string'},      // mechanical:<tool> | semantic:<lens>
  }, required:['title','file','severity','evidence','source'] } } }, required:['findings'] }

const VERDICT = { type:'object', properties:{
  refuted:{type:'boolean'}, why:{type:'string'}, severity:{type:'string'},
}, required:['refuted','why'] }

const REPORT = { type:'object', properties:{
  lgtm:{type:'string'},        // approve | approve-with-comments | request-changes
  codeHealth:{type:'string'},  // improves | neutral | worsens
  summary:{type:'string'},
  blocking:{type:'array', items:{type:'object'}},
  nits:{type:'array', items:{type:'object'}},
  praise:{type:'array', items:{type:'string'}},
}, required:['lgtm','codeHealth','summary'] }

// ============================ PHASE 1 — PROFILE ============================
// Barrier: understand + tooling + conventions run concurrently; everything downstream needs all three.
phase('Profile')
const [profile, tooling, conventions] = (await parallel([
  () => agent(
    `Understand this project so a reviewer can judge whether a change fits.\n` +
    `Review scope: ${SCOPE}. Changed files:\n${FILELIST}\n` +
    `Read entry points, README, and the surroundings of the changed files. ` +
    `Report languages, frameworks, architecture, and what this module does.`,
    { label:'profile:understand', phase:'Profile', schema: PROFILE }),
  () => agent(
    `Detect the lint / static-analysis / type-check / test tooling actually configured in THIS repo. ` +
    `Read: package.json scripts, eslint/biome/prettier config, golangci.yml, ruff/pyproject/mypy, ` +
    `Makefile, .pre-commit-config, and CI workflows. Return ONLY commands that exist here, each with ` +
    `the exact shell command to run it and its kind. Do NOT invent tools the repo does not configure.`,
    { label:'profile:tooling', phase:'Profile', schema: TOOLING }),
  () => agent(
    `Extract the conventions THIS codebase actually follows (not generic best practice): design ` +
    `patterns in use, naming style, error-handling idiom, layering, and any house rules a reviewer ` +
    `must respect so the change stays consistent with surrounding code. Cite files.`,
    { label:'profile:conventions', phase:'Profile', schema: CONVENTIONS }),
])).map(r => r || {})
log(`profile: ${(tooling.commands||[]).length} tool commands, ${(conventions.houseRules||[]).length} house rules`)

// ============================ PHASE 2 — MECHANICAL ============================
// Run the tools the profile found; parse their output into findings scoped to the diff.
phase('Mechanical')
const mechFindings = (await parallel((tooling.commands || []).map(c => () =>
  agent(
    `Run this command in the repo and turn its output into review findings scoped to the changed files.\n` +
    `Command (${c.kind}): \`${c.cmd}\`\n` +
    `Run it via Bash. Parse real diagnostics into findings with file:line, a fitting severity ` +
    `(a lint style nit → 'nit'; a real bug → 'blocking'), and source='mechanical:${c.name}'. ` +
    `Only include diagnostics touching the changed files:\n${FILELIST}\n` +
    `If the command cannot run, return a single 'fyi' finding saying so.`,
    { label:`lint:${c.name}`, phase:'Mechanical', schema: FINDINGS })
))).filter(Boolean).flatMap(r => r.findings || [])
log(`mechanical: ${mechFindings.length} findings from ${(tooling.commands||[]).length} tools`)

// ============================ PHASE 3 — SEMANTIC ============================
// Multi-lens sweep applying the eng-practices 8 dimensions + the house conventions.
// Loop-until-dry, bounded by tier, deduped vs `seen`.
phase('Semantic')
const LENSES = [
  { key:'design',          ask:'Does this change belong here and fit the system design? Over-engineering / speculative generality?' },
  { key:'functionality',   ask:'Does it do what was intended, safely? Edge cases, concurrency, error paths, user-visible impact.' },
  { key:'complexity',      ask:'Could it be simpler? Cognitive load for the next reader. Prefer the obvious solution.' },
  { key:'tests',           ask:'Are tests present for this behavior change, correct, and useful (not just green)? Tests are code too.' },
  { key:'naming-comments', ask:'Do names communicate intent? Do comments explain WHY not WHAT? Docs updated if behavior changed?' },
  { key:'consistency',     ask:'Does it match the house conventions? Flag drift from surrounding code. Style guide is authority; taste → nit.' },
]
if (TIER === 'maximal') LENSES.push(
  { key:'security', ask:'Injection, authz, secrets, unsafe deserialization, SSRF, path traversal, unvalidated input.' })

const ROUNDS_MAX = TIER === 'maximal' ? 3 : TIER === 'lean' ? 1 : 2
const key = f => `${f.file || '?'}:${f.line || 0}:${(f.title || '').slice(0, 60)}`
const seen = new Set()
const semFindings = []
let round = 0, dry = 0
while (dry < 1 && round < ROUNDS_MAX) {
  round++
  const batch = (await parallel(LENSES.map(l => () =>
    agent(
      `Code review — round ${round}, lens: ${l.key}. ${l.ask}\n` +
      `Scope: ${SCOPE}. Get the diff yourself (\`git diff ${BASE}\`) and read the surrounding code.\n` +
      `Apply The Standard: flag anything that WORSENS overall code health; do not rubber-stamp, do not chase perfection.\n` +
      `Severity: blocking (bug / worsens health) | nit (minor polish) | optional | fyi.\n` +
      `House conventions to respect:\n${JSON.stringify(conventions)}\n` +
      `Return findings with file:line, dimension='${l.key}', severity, evidence, a concrete suggestion, ` +
      `and source='semantic:${l.key}'.`,
      { label:`review:${l.key}#${round}`, phase:'Semantic', schema: FINDINGS })
  ))).filter(Boolean).flatMap(r => r.findings || [])
  const fresh = batch.filter(f => !seen.has(key(f)))
  if (fresh.length === 0) { dry++; log(`semantic round ${round}: dry`); continue }
  fresh.forEach(f => seen.add(key(f)))
  semFindings.push(...fresh)
  log(`semantic round ${round}: +${fresh.length} fresh (${seen.size} total)`)
}

// ============================ PHASE 4 — CONSOLIDATE ============================
// Dedup both tracks → adversarially verify each finding → synthesize the verdict.
phase('Consolidate')
const all = [...mechFindings, ...semFindings]
const unique = [...new Map(all.map(f => [key(f), f])).values()]
log(`consolidate: ${all.length} raw → ${unique.length} unique`)

const VOTES = TIER === 'maximal' ? 3 : TIER === 'lean' ? 0 : 1
const confirmed = VOTES === 0 ? unique : (await parallel(unique.map(f => () =>
  parallel(Array.from({ length: VOTES }, (_, i) => () =>
    agent(
      `Adversarially verify this review finding against the actual code (angle ${i + 1}). ` +
      `Try to REFUTE it; set refuted=true if you cannot confirm it from the real file. ` +
      `A false positive shipped in a review erodes trust more than a missed nit.\n` +
      `${JSON.stringify(f)}\nScope: ${SCOPE}. Read the file to check.`,
      { label:`verify:${key(f)}#${i + 1}`, phase:'Consolidate', schema: VERDICT })
  )).then(vs => {
    const ok = vs.filter(Boolean)
    return ok.filter(v => !v.refuted).length > ok.length / 2 ? f : null
  })
))).filter(Boolean)
log(`consolidate: ${unique.length} unique → ${confirmed.length} confirmed after ${VOTES}-vote verify`)

const report = await agent(
  `Synthesize the final code review as a senior reviewer applying The Standard: approve iff the change ` +
  `definitely improves the overall code health of the system, even if imperfect; never approve something ` +
  `that worsens it.\n` +
  `Project: ${JSON.stringify(profile)}\n` +
  `Confirmed findings: ${JSON.stringify(confirmed)}\n` +
  `Give an LGTM verdict (approve | approve-with-comments | request-changes) with reasoning, group ` +
  `findings by severity (blocking vs nits), call out what is GOOD, and write every comment kindly — ` +
  `about the code, not the author — each with a concrete suggestion.`,
  { phase:'Consolidate', schema: REPORT })

return {
  profile, tooling, conventions, report, confirmed,
  stats: { raw: all.length, unique: unique.length, confirmed: confirmed.length, semanticRounds: round },
}
```

## Tuning knobs

- **`TIER`** scales lenses (6 → 7 with a security lens), semantic rounds (1 / 2 / 3), and verify
  votes (0 / 1 / 3). Set it from the user's thoroughness signal.
- **Mechanical vs Semantic** run as separate phases here for readability. If the linters are slow
  and you want the two tracks overlapping, wrap both in one `parallel([...])` — the consolidate
  barrier still waits for both.
- **Verify votes** default to a single skeptic (`standard`). Raise to 3 perspective-diverse votes
  for `maximal` when false positives are costly; drop to 0 for `lean` throwaway checks.
- Loop-until-dry stops after the first round that surfaces nothing new (bounded by `ROUNDS_MAX`).
  Raise the dry target if you want more insistence on the long tail.

The mechanics behind every rule above (pure-literal `meta`, barrier vs pipeline, cache-safe resume,
the budget guard) live in the `aio-workflow-creator` skill's `reference.md`.
