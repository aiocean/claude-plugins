::install-command
/plugin install aio-claude-toolkit@aiocean-plugins
::

# aio-claude-toolkit

**Meta-tools for shaping Claude Code itself.**

Most Claude Code plugins extend what Claude can do inside your project. This plugin is different: it operates on Claude Code as a system — its binary behavior, its memory, its reusable knowledge, and its feedback loop back to the marketplace. Install it once and every future session benefits.

The unifying idea: a Claude Code instance that improves itself over time, starting with you.

## Installation

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-claude-toolkit@aiocean-plugins
```

## Skills

### The patch pipeline — recompile Claude's binary for custom behavior

Six skills form a pipeline that extracts, patches, and recompiles Claude Code's `cli.js`, so you can change how the binary itself behaves: rebalanced system prompts, an HTTP control channel, agent-as-a-service, or custom tooling. They share one `tools/pipeline/patches.json` as the source of truth.

| Skill | Role |
|-------|------|
| `aio-patch-setup` | Scaffold a new patching project at CWD — copies the pipeline tools, docs, and an empty `patches.json` with a reference example beside it. |
| `aio-patch-extract` | Extract `cli.js` + native `.node` modules from an installed claude binary into `dist/<arch>/`. |
| `aio-patch-compile` | Apply `patches.json` + `bun build --compile` → a patched binary at `dist/<arch>/claude`. Host arch by default; opt into cross-compile (`--target=all` or a CSV list). |
| `aio-patch-anchor` | acorn-based AST navigator for `cli.js` — find and navigate anchor points, used for drift recovery when a Claude version bump moves them. |
| `aio-patch-control` | Scaffold a reference HTTP control-channel gateway (Claude-as-a-service) or print the control-channel protocol docs. |
| `aio-patch-run` | Exec the compiled patched binary at `dist/<arch>/claude` with pass-through args + env. |

Typical first run: `aio-patch-setup` → fill in `patches.json` → `aio-patch-extract` → `aio-patch-compile` → `aio-patch-run`.

> Note: patches are lost on Claude Code auto-update. Re-run `aio-patch-compile` after every `claude` upgrade.

---

### aio-skillify — Turn this session's workflow into a reusable skill

After you finish something worth repeating — a deploy flow, a PR review process, a debugging methodology — `aio-skillify` interviews you about what just happened and produces a structured `SKILL.md` file ready to commit.

It reads session memory and the current conversation, identifies the repeatable steps, then guides a short interview: naming, success criteria, arguments, save location (this repo, personal `~/.claude`, or a plugin directory), and trigger phrases. No prompt engineering required — you describe the intent, the skill handles structure.

> "skillify", "capture this workflow", "save this as a skill", "turn this into a skill", "make a skill from this session"

---

### aio-dream — Consolidate memory so future sessions orient quickly

Claude Code's per-project memory accumulates across sessions. Over time, files contradict each other, dates go stale, and the index grows unwieldy. `aio-dream` does a reflective pass: it reviews existing memory files, gathers signal from daily logs and session transcripts, merges updates into the right topic files, and prunes the index to stay under 200 lines.

Think of it as a maintenance pass you run at the end of a long session or sprint. The result: the next session loads context faster and with fewer stale facts.

> "dream", "consolidate memory", "clean up memories", "prune memories", "memory review"

What it writes to and what it skips:
- Writes: user context, feedback, ongoing project state, external system pointers
- Skips: code patterns, git history, architecture (derivable from the codebase)

---

### aio-feedback — File bugs and feature requests without leaving Claude Code

Found a broken skill? Want a new plugin? `aio-feedback` collects the details and submits a GitHub Issue to `aiocean/claude-plugins` directly from Claude Code using the `gh` CLI.

> "report bug", "request feature", "request plugin", "file issue"

It handles three issue types with structured templates: bug reports (plugin + what happened + steps to reproduce), feature requests (plugin + what + why), and plugin requests (proposed name + use cases). After submission, it returns the issue URL so you can track it.

## Workflow pattern

A productive meta-loop looks like this:

```
run the patch pipeline      →  recompile Claude with the behavior you want
work on your project        →  session produces a repeatable process
run aio-skillify            →  that process becomes a reusable skill
end of sprint               →  run aio-dream to consolidate memory
encounter a skill gap       →  run aio-feedback to request a new plugin
```

Each skill feeds forward into better future sessions.
