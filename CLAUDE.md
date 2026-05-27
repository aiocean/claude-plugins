# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin marketplace (`aiocean/claude-plugins`) containing 35+ independent plugins. Users install via:
```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install <plugin-name>@aiocean-plugins
```

## Plugin Structure

Every plugin follows this layout:
```
plugins/{plugin-name}/
├── .claude-plugin/
│   └── plugin.json        # name, description, version, author
├── skills/
│   └── {skill-name}/
│       ├── SKILL.md        # Frontmatter (name + description with trigger words) + documentation
│       ├── *.sh / *.py / *.ts   # Scripts (optional)
│       └── references/          # Reference docs (optional)
└── README.md               # Optional
```

**Critical conventions:**
- Plugin folder name MUST match `name` in `plugin.json`
- Skill folder name typically matches plugin name
- SKILL.md frontmatter requires `name` and `description` fields — description must include trigger words/phrases for skill discovery
- **Script path**: Use `${CLAUDE_PLUGIN_ROOT}` — the official Claude variable that resolves to the plugin's root directory at runtime.
- Every SKILL.md with scripts MUST use `${CLAUDE_PLUGIN_ROOT}` to locate scripts/references:
  ```bash
  SCRIPTS="${CLAUDE_PLUGIN_ROOT}/skills/{skill-name}/scripts"
  ```
  Then reference scripts as `$SCRIPTS/script-name`. NEVER use `~/.claude/skills/` or hardcoded cache paths.
- Script naming: prefix with skill name (e.g., `worktree-create.sh`, `worktree-sync.sh`)
- Any change inside `plugins/{plugin-name}/` MUST include a version bump in `plugins/{plugin-name}/.claude-plugin/plugin.json`
  - Use semantic versioning:
  - `patch` for fixes/docs/internal script updates
  - `minor` for backward-compatible new capabilities
  - `major` for breaking behavior changes

## Marketplace Registry

`.claude-plugin/marketplace.json` at root is the central registry. When adding a new plugin, it must be registered here with `name`, `source` (relative path), `description`, `version`, and `author`.

## Plugin Categories

- **Script-based** (worktree, ios-device-debug, youtube, claude-manager, install, feedback): Shell/Python/TS scripts that execute actions
- **Knowledge/Reference** (mental-models, monitoring, neobrutalism, react-minimal-effects, gherkin-refine, xstate, tui, golang-mastery): Documentation-only skills that provide frameworks and patterns
- **Hybrid** (reflect, epub-packing, bun-fullstack-setup, codebase-oracle, deep-plan, debug, code-review): Scripts + documentation
- **MCP Integration** (jira, github, gitlab, confluence, google-workspace, x, tanca, rag-kit, research-kit, browser-cookie): Thin wrappers around MCP servers

## Adding a New Plugin

1. Create `plugins/{name}/.claude-plugin/plugin.json`
2. Create `plugins/{name}/skills/{name}/SKILL.md` with frontmatter
3. Add scripts/references as needed
4. Register in `.claude-plugin/marketplace.json`
5. Add description to `README.md`
6. Run `bash scripts/validate-marketplace.sh` to verify everything is correct

**Note:** The public marketplace site at https://claude-plugins.aiocean.dev/ regenerates itself on every push to `main` via the `Deploy to Cloudflare Pages` workflow (`.github/workflows/pages.yml`). `scripts/sync-content.py` walks the marketplace + per-plugin SKILL.md frontmatter into `docs/content/plugins/**.md`, then `bun run generate` in `docs/` produces static HTML. No manual docs edits needed when adding a plugin — see `docs/CLAUDE.md` for the data-flow diagram and Nuxt-layer details.

## SKILL.md Frontmatter Format

```yaml
---
name: skill-name
description: |
  What it does. Use when [trigger phrase 1], [trigger phrase 2],
  or user mentions [keyword]. Include all synonyms and variations
  for fuzzy-match discovery.
when_to_use: |
  raw keywords and phrases for AI matching, comma-separated.
  Example: cdp relay, browser automation, chrome devtools, capture network
argument-hint: "brief hint shown in UI (e.g. 'URL or issue key')"
effort: medium
---
```

### Field roles:
- **`description`** (required): Long-form text with trigger words/phrases — used for **fuzzy-match** skill discovery. Keep it verbose with synonyms and variations.
- **`when_to_use`** (recommended): Raw keywords/phrases for **AI model** to decide when to invoke. No need for full sentences — comma-separated keywords are fine.
- **`argument-hint`** (optional): Short hint displayed in UI so users know what arguments the skill accepts.
- **`effort`** (optional): Thinking effort level — `low` for knowledge-only skills, `medium` for standard, `high`/`max` for complex reasoning skills.
- **`model`** (optional): Force a specific model — `haiku` for lightweight lookups, `sonnet` for standard, `opus` for deep analysis.

## Build system

The **plugins themselves** have no build step — each plugin is a standalone directory of markdown and scripts (shell scripts use `#!/bin/bash`, TS scripts run via `bun`).

The **marketplace site** at `docs/` is a Nuxt 4 app that extends the `andy-note-nuxt` layer. `bun run generate` in `docs/` produces the static site to `docs/.output/public`. Full guidance: `docs/CLAUDE.md`. CI runs this on every push to `main` and deploys to Cloudflare Pages.

## Commit Conventions

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:` prefixes (e.g., `feat: add aio-new-plugin`).

## Validation

Run `bash scripts/validate-marketplace.sh` before considering any plugin work done. It checks plugin.json fields, folder naming, SKILL.md frontmatter, script existence, marketplace registration, and version sync.

The **`validate.yml` GitHub Action** runs this same script on every push to `main` and every pull request that touches `plugins/` or `.claude-plugin/` — version drift between `plugin.json` and `marketplace.json` will fail CI.
