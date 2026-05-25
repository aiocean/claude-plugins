---
title: "Install Claude Code plugins in two commands"
description: "Add the aiocean marketplace to Claude Code and install plugins on demand. Two commands, what happens after install, and the most common first-time pitfalls."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 0
tags: ["installation", "onboarding", "claude-code", "plugins", "getting-started"]
---

# Install Claude Code plugins in two commands

A Claude Code plugin is a folder of skills, agents, hooks, and commands that
Claude can pull into any future session on demand. This marketplace ships 28+
of them. You install in two steps — once for the marketplace, once per plugin.

## Prerequisites

You need [Claude Code](https://claude.com/claude-code) installed. Plugin support
landed in v2.0+; check yours with:

```sh
claude --version
```

If you're below 2.0, upgrade before continuing. The plugin commands don't exist
on older versions.

## Step 1 — add the marketplace

In any Claude Code session, run:

```
/plugin marketplace add aiocean/claude-plugins
```

This tells Claude to fetch the plugin index from this repo's
`.claude-plugin/marketplace.json`. The fetch is one-time per marketplace —
subsequent installs hit the cached index.

You can verify with:

```
/plugin marketplace list
```

`aiocean-plugins` should appear in the output.

## Step 2 — install a plugin

Pick a plugin from the [catalog](/plugins) and install it by name:

```
/plugin install aio-epub-translate@aiocean-plugins
```

The `@aiocean-plugins` suffix disambiguates which marketplace the plugin comes
from — useful when you have multiple marketplaces installed and there's a name
collision. With only this marketplace installed, the suffix is optional but
explicit is safer.

After install, Claude downloads the plugin's files into your local plugin
cache, indexes any skills inside, registers hooks, and exposes commands. None
of this requires a restart.

## What happens next

The plugin is *installed* but most of its contents don't activate until needed:

- **Skills auto-trigger** when your message contains a description match.
  Example: installing `aio-debug` doesn't slow anything down, but the next time
  you say "this test is failing", the skill loads its debugging workflow into
  context.
- **Hooks fire** on tool calls (`PreToolUse`, `PostToolUse`, etc.) the plugin
  declared. These run silently in the background.
- **Commands** show up as `/<command-name>` autocompletes.
- **Agents** become available to spawn via the `Agent` tool when Claude
  decides one fits the task.

The plugin manifest at `plugins/{name}/.claude-plugin/plugin.json` declares
which surfaces each plugin uses, so installing a "knowledge-only" plugin (just
skills) costs nothing until a relevant message comes in.

## Updating and uninstalling

```
/plugin update aio-epub-translate@aiocean-plugins
/plugin uninstall aio-epub-translate@aiocean-plugins
```

`update` re-fetches against the marketplace's latest manifest. Each plugin
follows semantic versioning — patch bumps for fixes, minor for new
capabilities, major for breaking behavior. Watch the changelog if you depend
on specific skill behavior.

## Common pitfalls

**"Plugin not found"** — double-check the plugin name matches what's in the
[catalog](/plugins). Names are case-sensitive and dash-separated. `aio_epub` ≠
`aio-epub-translate`.

**Stale marketplace index** — if a plugin was added recently and you don't see
it, refresh the marketplace:

```
/plugin marketplace update aiocean-plugins
```

**Skills don't trigger** — skills load on fuzzy-match against your message, not
on plugin install. If the skill exists but doesn't fire, the description in
its `SKILL.md` frontmatter doesn't match your phrasing. Try keywords from the
[plugin page](/plugins) — those are the trigger words.

**Permission prompts on first run** — plugins can ship hooks that run shell
commands or modify files. Claude prompts before each action the first time;
approve once and the permission persists for the session. To set permanent
permissions, edit `.claude/settings.json` in your project.

## Next steps

- Browse the [plugin catalog](/plugins) and install one that fits today's work.
- Read about [writing CLAUDE.md](/guides/writing-claude-md-files) — the
  per-project file that tunes Claude's behavior independent of plugins.
- Understand the [skill / agent / hook split](/guides/skills-agents-hooks) so
  you know which surface a future plugin should target.
