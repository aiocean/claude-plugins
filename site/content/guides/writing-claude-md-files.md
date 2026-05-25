---
title: "Writing a CLAUDE.md file Claude actually uses"
description: "CLAUDE.md is project memory loaded on every session. What belongs in it, what doesn't, and the patterns that survive months of iteration without bloating."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 10
tags: ["claude-md", "project-memory", "claude-code", "best-practices", "configuration"]
---

# Writing a CLAUDE.md file Claude actually uses

`CLAUDE.md` is the file Claude Code reads at the top of every session — once
for the user's home directory, once for your project root, and once for the
working subdirectory. It's project memory: rules and conventions that don't
belong in code comments but that Claude needs to follow consistently.

A good `CLAUDE.md` makes Claude predictable across sessions. A bad one bloats
context, confuses the model, and gets ignored.

## What belongs in CLAUDE.md

Three categories are durable:

**1. Rules that aren't derivable from reading the code.**
"Use `bun` instead of `npm`," "Never run dev servers," "Commit messages are
imperative with no `feat:` prefix." Claude can't infer these from grepping the
codebase. They're house rules.

**2. Hidden invariants and rationale.**
"The retry loop in `worker.go:142` runs 5x, not 3x, because the upstream API
has a 4s connect-timeout-then-retry on its side — anything less than 5 and we
miss the second-attempt window." This kind of context is gold; nobody can
extract it from `git log`.

**3. Tool and runtime preferences.**
"Use `rg` for text search, `sg` for AST queries. Type-check with `bunx vue-tsc
--noEmit` before declaring done." These shape *how* Claude works, not *what*
it builds.

## What does NOT belong

Avoid putting things into CLAUDE.md that Claude can extract on demand:

- **File layout** — Claude can read the directory tree.
- **Function signatures or API shapes** — Claude can grep / read.
- **Recent git history** — Claude can run `git log`.
- **General programming practices** — Claude already knows them.
- **Ephemeral todo lists or current sprint state** — those belong in
  TodoWrite / project memory files, not in the shared CLAUDE.md.

Every line in CLAUDE.md consumes the model's attention budget on every
session. Adding something duplicate trades a quiet capability for forced
recall. The litmus test: *will Claude reliably do this without the rule?* If
yes, drop the rule.

## Format

Three patterns that work:

**Imperatives, not narration.** "Use X." beats "We try to use X when
appropriate." The model latches onto the imperative form harder.

**Group by concern.** Sections like `## Code Style`, `## Tools & Runtime`, `##
Commit Conventions`. Don't interleave — group so the model can pull a coherent
block when one concern matters.

**Why before what for non-obvious rules.** "Never use `--no-verify` on git
commits. Reason: a previous incident bypassed a pre-commit hook that catches
secret leakage; the hook fired but the secret already pushed to remote."
Without the why, Claude (or a teammate skimming the file) will quietly remove
the rule the first time it inconveniences them.

## Length and discipline

Long `CLAUDE.md` files lose the model the same way long meetings lose a
listener. A 200-line CLAUDE.md is read with attention. A 2000-line one is
skimmed.

If yours is growing past a few hundred lines, look for:

- **Domain expansion** — split into multiple subdirectory `CLAUDE.md` files.
  Each one applies only to its subtree.
- **Documentation creep** — content that's really product documentation, not
  project memory. Move to `docs/` or a wiki.
- **Wishful rules** — things nobody actually enforces. Either bake them into
  CI or delete them.

## A useful skeleton

```markdown
# CLAUDE.md

## Tone

- Push back when you disagree with evidence. Don't perform agreement.
- Surface uncertainty explicitly. "I'm guessing" beats confident wrong.

## Code style

- 4-space indent in Python, tabs in Go.
- Tests next to implementation, not in /tests.
- Public APIs documented with one sentence + an example.

## Tools

- bun, never npm. rg for search, sg for AST.
- `bunx vue-tsc --noEmit` before declaring done.

## Commit / PR

- Imperative sentence-case subjects. No type prefix.
- One concern per commit. Atomic.
- Co-author Claude when it contributed.
```

That's it for a small project. For a larger one, add `## Architecture` (the
invariants Claude must respect) and `## Workflows` (how multi-step tasks are
expected to chain).

## Iterating on it

Treat CLAUDE.md like code. Review it. Delete lines that didn't earn their
keep. When you correct Claude twice on the same thing, add the rule. When a
rule causes friction without changing behavior, remove it.

The best `CLAUDE.md` files I've seen shrank between sprint 1 and sprint 10.
The model didn't get worse — the team learned what was actually load-bearing.

## Related

- The [plugin catalog](/plugins) — `aio-claude-toolkit` includes a skill for
  auditing existing CLAUDE.md files against best practices.
- [Skills, agents, hooks](/guides/skills-agents-hooks) — the three primitives
  Claude Code exposes beyond plain prompts.
- [Anthropic's Claude Code docs](https://docs.anthropic.com/claude/docs/claude-code)
  for the authoritative reference.
