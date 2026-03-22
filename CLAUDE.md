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
- **Script path for marketplace plugins**: `~/.claude/plugins/cache/aiocean-plugins/{plugin-name}/*/skills/{skill-name}/scripts/` (version directory varies)
- Every SKILL.md with scripts MUST start with a resolver block:
  ```bash
  SCRIPTS="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/{plugin-name}/*/skills/{skill-name}/scripts 2>/dev/null | sort -V | tail -1)"
  ```
  Then reference scripts as `$SCRIPTS/script-name`. NEVER use `~/.claude/skills/` — that path does not exist for marketplace plugins.
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
6. Update `docs/index.html` to include the new plugin
7. Run `bash scripts/validate-marketplace.sh` to verify everything is correct

## SKILL.md Frontmatter Format

```yaml
---
name: skill-name
description: |
  What it does. Use when [trigger phrase 1], [trigger phrase 2],
  or user mentions [keyword].
---
```

The `description` field is how Claude discovers and triggers the skill — include all relevant trigger words and use cases.

## No Build System

No package.json, no build step, no tests. Plugins are standalone directories of markdown and scripts. Shell scripts use `#!/bin/bash`. TypeScript scripts run via `bun`.

## Commit Conventions

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:` prefixes (e.g., `feat: add aio-new-plugin`).

## Validation

Run `bash scripts/validate-marketplace.sh` before considering any plugin work done. It checks plugin.json fields, folder naming, SKILL.md frontmatter, script existence, marketplace registration, and version sync.
