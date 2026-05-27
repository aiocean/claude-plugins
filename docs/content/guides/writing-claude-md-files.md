---
title: "Writing CLAUDE.md: the sections that actually help"
description: "Claude Code loads CLAUDE.md into every session. What goes in it — Commands, Architecture, Gotchas — with concrete examples, a quality rubric, file-type comparisons, and the `#` shortcut for editing mid-session."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 10
tags: ["claude-md", "project-memory", "claude-code", "best-practices", "configuration"]
---

# Writing CLAUDE.md: the sections that actually help

Claude Code reads `CLAUDE.md` into every session as prompt context. A
tight, useful one changes how Claude works on your code. A bloated,
generic one wastes attention. This guide covers the practical
sections that earn their space, with concrete examples.

## The four file types

Claude auto-discovers `CLAUDE.md` at session start. Each location serves
a different purpose — confusing them is the most common mistake.

| File | Location | Purpose | In git? |
|---|---|---|---|
| **Project root** | `./CLAUDE.md` | Build commands, architecture, gotchas for *this codebase* | Yes — shared with team |
| **Local override** | `./.claude.local.md` | Personal per-project settings | No — `.gitignore` |
| **Subdirectory** | `./<area>/CLAUDE.md` | Module / package context in monorepos | Usually yes |
| **User-level** | `~/.claude/CLAUDE.md` | Cross-project preferences (voice, behavior, principles) | No — personal |

The rest of this guide is mostly about **project root** — the file you
commit to a repo. For the user-level kind, jump to the
[example user-level file](/guides/my-claude) at the end.

## What belongs in a project CLAUDE.md

The project file should answer: *"What does Claude (or a new
contributor) need that isn't obvious from reading the code?"* Six
sections cover most of it. Use only the ones that earn their space.

### Commands

Copy-paste ready scripts for build, test, dev, lint. The single most
useful section — Claude reaches for these every session.

```sh
# install
bun install

# dev server (port 3000)
bun run dev

# tests (CI mode, no watch)
bun test --run

# what CI runs before merge
bun run check
```

Commands that don't work are worse than missing commands — they
actively mislead. When a script changes, the file changes.

### Architecture

Directory layout plus the constraints Claude can't infer from `ls`.
Skip if your project has 5 files. Essential if it has 500.

```
src/
  api/        # ConnectRPC handlers — thin, delegate to domain/
  domain/     # business logic, no I/O, no external deps
  storage/    # SQLite + S3 adapters
  cli/        # Cobra commands, entry points in cmd/
proto/        # service definitions, generate with `bun run buf`
```

> Constraint: `domain/` imports nothing from `api/` or `storage/`.

The constraint line is what's load-bearing — the tree alone Claude can
re-derive any time.

### Key files

Entry points and config files Claude should know about before searching.

- `src/index.ts` — server entry, wires the DI container
- `src/config.ts` — env var loading + validation (Zod schema)
- `proto/*.proto` — service contracts, regenerate after edits with
  `bun run buf generate`
- `migrations/*.sql` — applied in filename order at startup

### Environment

Required env vars and setup steps that aren't in the README.

- Copy `.env.example` to `.env`
- `DATABASE_URL` — Postgres connection string
- `STRIPE_KEY` — leave empty for local dev; CI sets it from GH secrets
- `LOG_LEVEL` — `debug` locally, `info` in prod
- Fresh clone requires `bun run migrate` before `bun run dev`

### Gotchas

Non-obvious things that have bitten people. The section that pays for
itself fastest.

- Tailwind config picked up from project root only — subdirectory
  `tailwind.config.js` files are silently ignored.
- The auth middleware caches JWT keys in-memory for 10 min. Restart the
  server after rotating keys; SIGHUP alone is not enough.
- `bun test` runs in watch mode by default. Use `bun test --run` in CI
  or you'll hang the job.
- Migration files must end in `.sql`, not `.psql` — the migrator
  silently skips other extensions.

Each line should trace to a real incident or surprise. If the answer
to *"how did we learn this hurt?"* is *"we haven't, it's hypothetical"*,
drop the line.

### Workflow

Steps Claude should know about your dev loop.

- Before commit: `bun run check` (lint + types + tests, ~30s)
- PR titles: `feat(scope): summary` — enforced by commitlint
- Don't `git push --force` to `main`. Force-push to feature branches OK.
- Releases tagged via `bun run release` — bumps version, generates
  changelog from conventional commits.

## Quality rubric

Score the file with these checks before merging changes to it. The
`aio-claude-toolkit` plugin ships a [skill that audits CLAUDE.md
files](/plugins/aio-claude-toolkit) against these criteria
automatically.

| Criterion | Weight | What to check |
|---|---|---|
| Commands work | High | Every documented command runs and succeeds today |
| Architecture current | High | Tree matches the actual `src/` layout today |
| Gotchas earned | Medium | Each one traces to a real incident or surprise |
| Concise | Medium | No restating what code or README already covers |
| Up to date | High | No references to removed files, deps, or scripts |
| Actionable | High | Commands are copy-paste ready, no `# fill in your X` |

Grade ranges:

- **A (90–100)** — comprehensive, current, actionable
- **B (70–89)** — good coverage, minor gaps
- **C (50–69)** — basic info, missing key sections
- **D (30–49)** — sparse or outdated
- **F (0–29)** — missing or severely outdated

A common A-grade file is 50–150 lines. Past 300 lines usually means the
file is being used as documentation; move content to `docs/` or split
into subdirectory files.

## Format rules

These apply to all four file types.

### Imperatives over narration

*"Use bun, not npm."* beats *"We generally prefer bun when
appropriate."* Soft phrasings — *sometimes*, *generally*, *try to* —
give the model permission to skip the rule under perceived pressure.

### Why before what, when the rule isn't obvious

> Never use `--no-verify` on commits.
> Reason: a previous incident bypassed a secret-scan hook and pushed a
> token to remote.

A rule whose rationale lives only in someone's head is one re-org away
from being deleted by the next contributor.

### Replace, don't accumulate

When you change your mind on a rule, delete the old version completely.
*"We used to do X, now we do Y"* keeps the discarded approach in
attention. Affirmative phrasing only — `git log` and ADRs are where
history lives.

Exception: rules where the negative never had a positive alternative
(*"never commit secrets"*) can stay phrased as prohibitions.

### One example per non-obvious rule

A rule like *"prefer colocation"* without an example collapses under
interpretation. A concrete *"e.g. handlers + their queries in one file,
not split into a `Services/` folder"* anchors the intent.

## Useful tips

**Press `#` mid-session.** During a Claude session, press `#` and
Claude writes the current learning directly into `CLAUDE.md`. The
fastest way to capture gotchas as you discover them.

**Use `.claude.local.md` for personal preferences.** Anything you
don't want pushed to the team — your tmux layout, your local DB
connection string, *"explain things to me at level X"* — goes in
`.claude.local.md`. Add it to `.gitignore`.

**Subdirectory files for monorepos.** Each package gets its own
`CLAUDE.md` with package-specific commands and conventions. The root
file covers what's shared.

**Audit on every PR that touches it.** Treat `CLAUDE.md` like code.
Stale commands and outdated architecture are bugs that mislead Claude
on every session until fixed.

## Common issues to flag

When auditing an existing file, watch for:

- **Stale commands** — scripts in `package.json` that no longer exist
- **Outdated architecture** — directory tree that doesn't match `ls src/`
- **Missing dependencies** — required tools (Bun, Docker, gcloud) not
  mentioned in setup
- **Wishful rules** — things nobody enforces (*"always write tests"*)
  with no CI gate behind them
- **Documentation creep** — product or onboarding content that belongs
  in `docs/`, not in every session prompt
- **Verbose explanations** — a section with 200 words where 30 would do

## A starting template

Drop this into `./CLAUDE.md` in a fresh project, then trim and expand.

````markdown
# CLAUDE.md

## Commands

```sh
bun install
bun run dev
bun test --run
bun run check
```

## Architecture

```
src/
  ...
```

## Key files

- `src/index.ts` — entry point
- ...

## Environment

Copy `.env.example` to `.env`. Required vars: ...

## Gotchas

- ...

## Workflow

- Before commit: `bun run check`
- PR convention: ...
````

A small library may need only Commands and Gotchas. A complex app
splits Architecture into per-subdirectory files. The template is a
starting point, not a target.

## A real-world example (user-level)

The companion page [**My CLAUDE.md**](/guides/my-claude) reproduces the
author's own `~/.claude/CLAUDE.md` — a **user-level** file applied to
every project on the machine. It's heavily philosophy and behavior
corrections, not commands.

A project-level file looks nothing like that. Read the example as a
category instance for the user-level slot in the [four file
types](#the-four-file-types) table, not as a template for the
project-root file this guide is mostly about.

## Related

- [**My CLAUDE.md**](/guides/my-claude) — the author's user-level example
- [Plugin catalog](/plugins) — `aio-claude-toolkit` includes a CLAUDE.md
  audit skill
- [Skills, agents, hooks](/guides/skills-agents-hooks) — the three
  primitives Claude Code exposes
- [Anthropic Claude Code docs](https://docs.anthropic.com/claude/docs/claude-code)
  for the authoritative reference on file loading and precedence
