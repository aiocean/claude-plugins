---
title: "CLAUDE.md is project memory, not documentation"
description: "Claude Code loads CLAUDE.md into the session prompt on every start. That makes it prompt content, not documentation. Categories of content that earn a line, format heuristics that make rules fire, with a companion page linking to a real-world example."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 10
tags: ["claude-md", "project-memory", "claude-code", "best-practices", "configuration"]
---

# CLAUDE.md is project memory, not documentation

Claude Code looks for `CLAUDE.md` in three places when a session starts:
the user's home directory (`~/.claude/CLAUDE.md`), the project root, and
the working subdirectory. Whatever it finds is concatenated into the
session prompt before the user's first message.

That's what makes it different from `README.md`. A README is documentation
written for a human reader who can scroll, skim, and reread. `CLAUDE.md`
is **prompt content**: every line stays in context for the duration of
the session and competes with the user's actual task for the model's
attention. A short, dense file gets read. A long one gets skimmed.

So the real question isn't *"what should I tell Claude about this
project?"* — that road leads to a CLAUDE.md the size of a wiki. The
question is *"what's the smallest set of lines that changes the model's
behavior in the directions my project actually needs?"*

This guide is about how to think about that question. It does not
prescribe the rules themselves — those depend on your team, your
codebase, and what you care about. It describes the *shape* of content
that fires reliably, and the failure modes that produce CLAUDE.md files
nobody benefits from. A full real-world example lives on a companion
page: [**My CLAUDE.md**](/guides/my-claude).

## What earns a line

Three broad categories of content earn space in CLAUDE.md. The mix
varies by project — most files lean heavily on one or two.

### 1. Facts the model can't derive from the code

The classic case. Conventions, tool preferences, and invariants that
don't show up in the source itself.

- **Tool preferences** — which package manager, which test runner, which
  formatter. The codebase doesn't say *"never use yarn"*; CLAUDE.md does.
- **Process conventions** — commit message style, branch naming, when
  to ask before pushing.
- **Hidden invariants with rationale** — a magic number with a reason
  (*"the retry count is 5 because the upstream API does its own retry on
  4s timeout"*), an ordering constraint that isn't enforced by types,
  a workaround whose context lives only in a slack thread.

The litmus test: *if I delete this rule, will Claude reliably do the
right thing anyway?* If yes, the rule is noise.

### 2. Behavioral defaults you want corrected

Claude ships with defaults tuned for a broad audience. Your project may
want different defaults. The categories of behavior teams most often
adjust:

- How the model balances **agreement vs. pushback** on the user's ideas.
- How the model handles **uncertainty** — silent guess vs. flagged
  hunch vs. refusal to claim until verified.
- How aggressively the model **roots-causes** vs. patches symptoms.
- How the model treats **proxies** — does *tests pass* mean *feature
  works*, or only *tests pass*?
- How the model **estimates effort** — by a single human, or by what an
  AI session can actually do.
- How **verbose** end-of-turn summaries should be, and what they must
  include.

You don't need an opinion on every dimension. Write down only the
corrections that actually matter for your project. A team shipping
critical infrastructure wants different defaults than a team prototyping
UX. The point of the section is to declare *where your defaults differ
from the model's*, not to recite every preference you have.

The shape that fires reliably:

> *"By default, do X. Reason: Y."*

A reason makes the rule durable across edge cases. A rule without one
gets deleted the first time it gets in the way.

### 3. Engineering principles you want held in attention mid-task

Principles you want Claude to apply *while writing code*, not just at
review time. These are the highest-stakes lines in the file because
they shape every commit, but also the easiest to over-include — every
team has favorite principles, and most of them are already in the
model's training.

A principle earns its line only when it changes the output. Usually
that's when it cuts against a default the model would otherwise make:
preferring co-located code over a deep package hierarchy, preferring
explicit error returns over panics, preferring duplication over a
shaky abstraction. If the principle is *"write good code,"* drop it.

## What lives elsewhere

Anything Claude can extract on demand belongs outside CLAUDE.md:

- **File layout** — the directory tree exists already.
- **Function signatures and APIs** — grep and read.
- **Recent git history** — `git log` is authoritative.
- **General programming practices** — already in the model's weights.
- **Ephemeral state** (current sprint, today's todo, in-progress
  feature) — lives in TodoWrite or per-task notes, not in a file every
  session loads.

When in doubt: *will the model reliably do this without the rule?* If
yes, drop it.

## Format heuristics

### Imperatives over narration

*"Use X."* beats *"We try to use X when appropriate."* Direct directives
fire as directives. Softeners — *sometimes*, *generally*, *try to* —
give the model permission to skip the rule under perceived pressure.

### Why before what, when the rule isn't obvious

*"Never use `--no-verify` on commits. Reason: a previous incident
bypassed a secret-scan hook and pushed a token to remote."*

A rule whose rationale lives in someone's head is one re-org away from
gone. The next contributor reads it, can't explain it, and deletes it.

### Group by concern

`## Code style`, `## Tools`, `## Workflow`, `## Behavior`. One block per
topic so the model can attend to the relevant section when that concern
is active. Long flat lists of mixed rules fade in attention.

### One example per rule with edge cases

A rule like *"prefer colocation"* without an example collapses under
interpretation. A single concrete *"e.g. handlers + their queries in
one file, not split into a Services/ folder"* anchors the intent.

### Replace, don't accumulate

When you change your mind on a rule, delete the old version completely.
Don't leave residue like *"we used to do X, now we do Y"* in the
forward-looking sections of the file. The old phrasing keeps the
discarded approach in attention, and the next contributor reads it as
still-relevant context.

Negative rules belong only where there was never a positive alternative
(*"never commit secrets"*). If you're tempted to write *"don't use the
old X"*, the cleaner move is to write *"use Y"* and let the old X
disappear from the file entirely.

History lives in `git log` or an ADR. The current rules file is
forward-looking only.

*(Research note: psychologists call this the ironic-process effect —
*don't think about X* still activates X in the reader's attention.
The same pattern shows up in prompts.)*

### State how uncertainty should be expressed

The model's default is uniform confident prose, which makes verified
facts and unverified hunches look identical. If you want them
distinguishable, say how — explicit confidence labels, a *"I'm
guessing"* prefix, a rule against claiming *"done"* without a
verification step. The mechanism matters less than declaring one.

## Length and discipline

A short CLAUDE.md is read with attention. A long one is skimmed. The
crossover point varies, but a file past a few hundred lines is almost
certainly past it.

Common shapes of bloat, and what to do about them:

- **Domain expansion** — the file accumulates rules for unrelated parts
  of the codebase. Split into subdirectory `CLAUDE.md` files, one per
  area. The model loads them based on the working directory.
- **Documentation creep** — content that's really product or onboarding
  documentation. Move to `docs/`, `CONTRIBUTING.md`, or a wiki.
- **Wishful rules** — things nobody enforces. Either bake into CI (lint
  rule, pre-commit hook, GitHub Action) or delete. CLAUDE.md is not a
  wish list.
- **Stale rules** — the old framework is gone but its rule remains.
  Prune.

The healthy long-term trajectory is *shorter over time*, not longer.
The team learns which rules the model actually needed and which were
noise; the noise gets cut.

## A starting skeleton

Project-specific content varies, but most useful files share a similar
backbone. Use this as a starting point — add the sections you need,
delete the ones you don't.

```markdown
# CLAUDE.md

## Tools and workflow

- [your package manager / test runner / formatter]
- [conditions for running which commands]
- [what counts as "ready to commit"]

## Code style

- [conventions not enforced by lint]
- [naming, file layout, test placement]
- [an example or two for anything genre-defining]

## Behavior

- [pushback vs. agreement preference]
- [how uncertainty should be flagged]
- [what counts as "done" — verification expectations]

## Architecture invariants

- [things that look optional but aren't]
- [why each invariant exists]

## Commit and PR

- [commit message style]
- [PR size / scope conventions]
```

A small project may only need the first two sections. A larger one may
split `Architecture invariants` into a per-subdirectory file. The
structure is a starting frame, not a target.

## Iterating on the file

Treat CLAUDE.md like code. Review it on PRs. Two failure modes to
watch for:

**Under-correction.** The same correction comes up twice in a week.
Add the rule. One line in the prompt costs less than repeated
interventions.

**Over-accumulation.** Rules pile up that haven't fired in months.
Remove them. The model's attention is finite; an unused rule consumes
attention the load-bearing rules need.

A mature CLAUDE.md is shorter than its first draft, not longer. The
rules that became muscle memory got promoted into automation. The
rules that turned out to be noise got cut. What's left is the small
set of things the model would otherwise get wrong on this codebase,
stated in the form most likely to fire.

## A real-world example

The author's own `~/.claude/CLAUDE.md` is published as a companion
page: [**My CLAUDE.md**](/guides/my-claude). It is one team's working
configuration, not a template — the voice is personal (Vietnamese–
English code-switching included), the specific rules reflect this
author's projects and tools, and the choices won't all transfer. Read
it as an artifact: a concrete instance of the categories described
above, sized and shaped for one engineer's actual work.

A few things worth noticing when you read it:

- **Where it differs from the model's defaults.** Sections like
  *Proactive Conviction*, *Confidence Labels*, *Goal-Driven Execution*,
  and *Positive Framing* are explicit corrections to behaviors the
  author wanted different from out-of-the-box Claude.
- **How each rule carries its reason.** Most non-obvious rules include
  a *"Reason:"* or a research citation. Rules that survive months of
  use almost always have one; rules that don't, don't.
- **What it leaves out.** No file tree, no API list, no recent commit
  history. Anything Claude can grep is missing on purpose.
- **The shape of bloat that's still there.** Even this file has lines
  the author would probably cut on the next pass. CLAUDE.md is never
  finished, only currently good enough.

→ Open the example: [**My CLAUDE.md**](/guides/my-claude)

## Related

- The [plugin catalog](/plugins) — `aio-claude-toolkit` includes a
  skill for auditing CLAUDE.md files against best practices.
- [Skills, agents, hooks](/guides/skills-agents-hooks) — the three
  primitives Claude Code exposes beyond plain prompts.
- [Anthropic's Claude Code docs](https://docs.anthropic.com/claude/docs/claude-code)
  for the authoritative reference on file loading and precedence.
