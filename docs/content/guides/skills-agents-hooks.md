---
title: "Three Claude Code primitives, three different jobs"
description: "Skill, agent, hook — the three plugin primitives Claude Code exposes. Each maps to a different runtime mechanism. A decision tree for choosing between them, with real examples from the aiocean marketplace."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 20
tags: ["skills", "agents", "hooks", "claude-code", "architecture", "plugin-development"]
---

# Three Claude Code primitives, three different jobs

A Claude Code plugin can ship three kinds of extension. They map to three
different mechanisms in the Claude Code runtime:

- **Skill** — a Markdown file with frontmatter (`name`, `description`,
  optional `when_to_use`). Claude loads its body into the session context
  when the user's message fuzzy-matches the description.
- **Agent** — a separate Claude invocation with its own context window
  and tool budget. Spawned when Claude calls the `Agent` tool with a
  matching `subagent_type`. Returns a single result string to the parent.
- **Hook** — a shell command Claude Code runs on a lifecycle event
  (`PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit`, etc.). Can
  inspect or block the event before it proceeds.

The primitives are not interchangeable. Each one trades off differently on
context cost, isolation, and where in the session lifecycle it runs. The
rest of this page is the decision tree.

## One-line summaries

| Primitive | What it does | When it activates |
|---|---|---|
| Skill | Loads procedural knowledge into the current context | On message-content match (fuzzy) |
| Agent | Runs work in an isolated context window | When Claude calls the `Agent` tool |
| Hook | Inspects or mutates tool calls / lifecycle events | On the registered event |

## The decision tree

Ask three questions, in order:

**1. Am I teaching Claude how to do something?**

If you're handing Claude a procedure ("when reviewing Go code, run these
linters in order"), a recipe ("here's the exact prompt that produces good
literary translations"), or domain knowledge ("here's what each StarRocks
EXPLAIN operator means"), the answer is a **skill**. Skills are cheap — they
load on demand, sit dormant otherwise.

**2. Am I parallelizing or isolating work?**

If a single task needs a fresh context window — fan-out research, long
investigation that would bloat the main thread, multi-file refactor in
isolation, code review that shouldn't pollute the implementer's context — that
points at an **agent**. Agents return a single summary to the parent; they're
not for "do X repeatedly," they're for "do X *separately*."

**3. Am I reacting to a tool call?**

If you want to validate, log, modify, or block a tool invocation, you need a
**hook**. PreToolUse hooks fire before the tool runs (good for input
validation or blocking dangerous commands), PostToolUse hooks fire after (good
for derived actions, formatters). Hooks see the tool name and args; they can
modify or reject.

If none of the three fit, the right answer may not be a plugin. A
short CLAUDE.md rule or a focused custom command often covers the same
ground with less plumbing.

## Real examples from this marketplace

**Skill**: [`aio-claude-toolkit/aio-patch-claude`](/plugins/aio-claude-toolkit/aio-patch-claude).
Encodes the procedure for patching Claude Code's system prompts to remove
brevity bias. Auto-triggers on phrases like "patch claude" or "unbloat
prompts." Pure procedural knowledge, no work — skill is the right shape.

**Skill**: [`aio-design-system/aio-uiux`](/plugins/aio-design-system/aio-uiux).
A 15-section reference catalog for visual design, typography, color, and
accessibility. Triggers on UI/UX-related messages.

**Agent**: tasks like "review this PR independently" or "run a TDD cycle
on this feature." Handled by Claude's built-in `Agent` tool plus a
specialized agent definition. Several plugins ship custom agents
(`oh-my-claudecode:executor`, `oh-my-claudecode:code-reviewer`) for
exactly these isolation requirements.

**Hook**: a `PreToolUse` hook on `Bash` that blocks `rm -rf /` or
`:(){:|:&};:` patterns. Runs silently, doesn't add a slash-command. The
[aio-claude-toolkit](/plugins/aio-claude-toolkit) plugin ships several
session-level hooks for this kind of guardrail.

## Combining them

The three primitives compose well when each handles its own job:

1. A **skill** triggers on the user's request ("review my Go code for
   concurrency bugs") and tells Claude what procedure to follow.
2. Claude spawns an **agent** with a specialized prompt for
   race-detection analysis, isolating the long investigation from the
   main thread.
3. A **hook** on `PostToolUse` for the `Bash` tool captures the test
   command's stderr and surfaces it back to Claude.

The skill carries the *what*. The agent does the work in isolation. The
hook reacts to events the work produced. Don't try to collapse two roles
into one primitive.

## Anti-patterns

**Skill that's really documentation.** If your "skill" is a 2000-word essay
with no procedure and no triggering phrases, it's a wiki article, not a skill.
Skills should be *invokable* — clear steps that produce an outcome.

**Agent for trivial lookup.** If you're spawning a `general-purpose` agent to
read one file and report back, you've burned token overhead for nothing. Just
read the file in the main thread.

**Hook used as control flow.** Hooks are reactive — they fire on an
event, they don't structure the workflow. If a hook blocks 30% of bash
calls to "force a better pattern," the right fix is upstream: a skill
that teaches the pattern or a CLAUDE.md rule that forbids the
alternative. A rule the user can read beats a silent block they have to
debug.

**Plugin without a primitive.** Sometimes the right answer is a short
addition to your project's `CLAUDE.md`. Plugins are heavier — they install
across all of someone's projects, ship versions, and have to be uninstalled
later. If a rule is project-scoped, keep it project-scoped.

## Related

- [Install Claude Code plugins](/guides/install-claude-plugins) — the
  marketplace install flow these primitives ship through.
- [Writing CLAUDE.md](/guides/writing-claude-md-files) — for the rules that
  belong in project memory rather than a plugin.
- The [full plugin catalog](/plugins) — concrete examples of each primitive in
  the wild.
