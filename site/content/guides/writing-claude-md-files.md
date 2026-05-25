---
title: "CLAUDE.md is project memory, not documentation"
description: "Claude Code loads CLAUDE.md into the session prompt on every start. That makes it prompt content, not documentation. What to put in 50–200 lines, what to leave out, and why the file should shrink over time."
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
is prompt content: every line stays in context for the duration of the
session and competes with the user's actual task for the model's
attention. A 50-line file Claude can keep loaded. A 2000-line file Claude
reads once and effectively forgets — the rules at line 1500 don't fire
when they should.

So the question is what to put in 50–200 lines that change Claude's
behavior on this codebase, and what to leave out because Claude can read
it from the code itself.

## What belongs in CLAUDE.md

**Rules that aren't derivable from the code.**
"Use `bun` instead of `npm`." "Never run dev servers." "Commit messages
are imperative with no `feat:` prefix." Claude can't infer house rules
from grepping the codebase.

**Hidden invariants and rationale.**
"The retry loop in `worker.go:142` runs 5x, not 3x, because the upstream
API has a 4s connect-timeout-then-retry on its side — anything less than
5 and we miss the second-attempt window." Context that doesn't exist
anywhere else, not even in `git log`.

**Tool and runtime preferences.**
"Use `rg` for text search, `sg` for AST queries. Type-check with `bunx
vue-tsc --noEmit` before declaring done." Shapes *how* Claude works on
the code, not what it builds.

## What does NOT belong

Anything Claude can extract on demand:

- **File layout** — Claude can read the directory tree.
- **Function signatures or API shapes** — Claude can grep and read.
- **Recent git history** — Claude can run `git log`.
- **General programming practices** — already in the model's weights.
- **Ephemeral todo lists or current sprint state** — those belong in
  TodoWrite or per-task notes, not in the shared CLAUDE.md.

The litmus test for any candidate rule: *will Claude reliably do this
without it?* If yes, drop the rule.

## Format

**Imperatives, not narration.** "Use X." beats "We try to use X when
appropriate." Direct directives override softer language in the prompt.

**Group by concern.** `## Code Style`, `## Tools & Runtime`, `## Commit
Conventions`. One block per topic so Claude can attend to the whole
section when one concern is active.

**Why before what for non-obvious rules.** "Never use `--no-verify` on
git commits. Reason: a previous incident bypassed a pre-commit hook that
catches secret leakage; the hook fired but the secret already pushed to
remote." Without the *why*, the rule looks arbitrary the next time it
gets in the way, and the next contributor deletes it.

## Length and discipline

A 200-line CLAUDE.md is read with attention. A 2000-line one is skimmed.

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

Treat CLAUDE.md like code. Review it on PRs. When you find yourself
correcting Claude twice on the same thing, add the rule. When a rule
hasn't fired in three months, remove it. Mature CLAUDE.md files get
shorter over time, not longer — the team learns which rules the model
actually needed and which ones were noise.

## Related

- The [plugin catalog](/plugins) — `aio-claude-toolkit` includes a skill for
  auditing existing CLAUDE.md files against best practices.
- [Skills, agents, hooks](/guides/skills-agents-hooks) — the three primitives
  Claude Code exposes beyond plain prompts.
- [Anthropic's Claude Code docs](https://docs.anthropic.com/claude/docs/claude-code)
  for the authoritative reference.
