---
title: "Three Claude Code primitives, three different jobs"
description: "Skill, agent, hook — the three plugin primitives Claude Code exposes. Most plugins reach for the wrong one. Agents get built where a skill would do, skills bloat into wiki articles, hooks become control flow. The decision tree, with real examples."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 20
tags: ["skills", "agents", "hooks", "claude-code", "architecture", "plugin-development"]
---

# Three Claude Code primitives, three different jobs

Three primitives, three different jobs — and from what you see in the wild,
most plugins reach for the wrong one. Agents get built where a skill would
do. Skills bloat into wiki articles. Hooks turn into control flow. Each of
those is a different way to waste effort, and each produces plugins that
feel sloppy to use.

The three primitives Claude Code exposes:

- **Skill** — auto-loaded knowledge and instructions, triggered by a fuzzy match against the user's message.
- **Agent** — a sub-thread with its own context window, spawned to do a focused task.
- **Hook** — a command that fires on a tool-call lifecycle event (`PreToolUse`, `PostToolUse`, `Stop`, etc.).

Pick the right one the first time and the plugin almost writes itself. Pick
wrong and you're rewriting it in three months.

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

If none of those questions fit cleanly, you may not need a plugin at all — a
well-crafted prompt or a short CLAUDE.md rule might do the same job with less
ceremony.

## Real examples from this marketplace

**Skill**: [`aio-claude-toolkit/aio-patch-claude`](/plugins/aio-claude-toolkit/aio-patch-claude).
Encodes the procedure for patching Claude Code's system prompts to remove
brevity bias. Auto-triggers on phrases like "patch claude" or "unbloat
prompts." Knowledge, not work — perfect skill fit.

**Skill**: [`aio-design-system/aio-uiux`](/plugins/aio-design-system/aio-uiux).
A 15-section reference catalog for visual design, typography, color, and
accessibility. Triggers on UI/UX-related messages. Pure knowledge-on-demand.

**Agent** territory: tasks like "review this PR independently" or "run TDD
cycle on this feature." These are handled by Claude's built-in `Agent` tool
combined with a specialized agent definition. Several plugins ship custom
agents (`oh-my-claudecode:executor`, `oh-my-claudecode:code-reviewer`) for
exactly these flows.

**Hook**: a PreToolUse hook on `Bash` that blocks `rm -rf /` or `:(){:|:&};:`
patterns. Defensive, runs silently, doesn't add a slash-command. The
[aio-claude-toolkit](/plugins/aio-claude-toolkit) plugin ships several
session-level hooks for this kind of guardrail.

## Combining them

The most powerful plugins compose all three:

1. A **skill** triggers on the user's request ("review my Go code for
   concurrency bugs").
2. The skill instructs Claude to spawn an **agent** with a specialized prompt
   for race-detection analysis.
3. A **hook** on `PostToolUse` for the `Bash` tool captures the test command's
   stderr and feeds it back to Claude.

The skill says *what*. The agent does the *work in isolation*. The hook
*reacts to events* that came out of the work. Each does its own job; none
should try to do another's.

## Anti-patterns

**Skill that's really documentation.** If your "skill" is a 2000-word essay
with no procedure and no triggering phrases, it's a wiki article, not a skill.
Skills should be *invokable* — clear steps that produce an outcome.

**Agent for trivial lookup.** If you're spawning a `general-purpose` agent to
read one file and report back, you've burned token overhead for nothing. Just
read the file in the main thread.

**Hook used as control flow.** Hooks are reactive — they shouldn't try to
restructure the user's workflow. If you find yourself writing a hook that
blocks 30% of bash calls to "force a better pattern," fix the workflow in a
skill or CLAUDE.md rule instead. Hooks become invisible friction; rules are
debuggable.

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
