---
name: claude-manager
description: Enable/disable skills and agents based on project context. Use when user says manage skills, disable skills, enable skills, reduce skill clutter, analyze usage, or starting work on specific project type (frontend, backend, data, ai).
---

# Claude Manager

Manages skills, agents, and provides usage analytics to optimize Claude Code workflow.

## Script

```bash
~/.claude/skills/claude-manager/manage.sh [command] [args]
```

| Command          | Example                                    | Description                  |
| ---------------- | ------------------------------------------ | ---------------------------- |
| `status`         | `manage.sh status`                         | List all skills and agents   |
| `skills status`  | `manage.sh skills status`                  | List skills only             |
| `skills enable`  | `manage.sh skills enable youtube`          | Enable specific skills       |
| `skills disable` | `manage.sh skills disable shopify`         | Disable specific skills      |
| `agents status`  | `manage.sh agents status`                  | List agents only             |
| `agents enable`  | `manage.sh agents enable universe-thinker` | Enable specific agents       |
| `agents disable` | `manage.sh agents disable vue-lint-fixer`  | Disable specific agents      |
| `enable`         | `manage.sh enable youtube`                 | Enable skills (shortcut)     |
| `disable`        | `manage.sh disable shopify`                | Disable skills (shortcut)    |
| `preset`         | `manage.sh preset frontend`                | Apply a preset configuration |
| `detect`         | `manage.sh detect`                         | Auto-detect project type     |
| `usage`          | `manage.sh usage`                          | Full usage analytics report  |

## Usage Report

Run `manage.sh usage` for comprehensive analytics:

- **Skills usage**: Invocation count from `/skill-name` history
- **Agents usage**: Session count with agent invocations from transcripts
- **Top slash commands**: Most frequently used `/command` entries
- **Recommendations**: Suggestions to disable unused items

## Presets

| Preset     | Keeps Enabled                                                                            |
| ---------- | ---------------------------------------------------------------------------------------- |
| `minimal`  | Core skills only                                                                         |
| `frontend` | Core + frontend-design, neobrutalism                                                     |
| `backend`  | Core + pm2-dev, bun-fullstack-setup, cloudflare, socket-rpc                              |
| `ai`       | Core + agent-sdk-_, collaborating-with-_, triumvirate, prompt-engineering, mental-models |
| `data`     | Core + dagster-graphql, notebooklm                                                       |
| `all`      | Everything enabled                                                                       |

**Core skills (never disabled):** claude-manager, generate-skill, code-review, conventional-commit

## Workflow Examples

```bash
# Check current state
~/.claude/skills/claude-manager/manage.sh status

# Analyze actual usage patterns
~/.claude/skills/claude-manager/manage.sh usage

# Apply preset for frontend work
~/.claude/skills/claude-manager/manage.sh preset frontend

# Disable specific unused skills
~/.claude/skills/claude-manager/manage.sh disable shopify-listing epub-packing

# Disable specific agents
~/.claude/skills/claude-manager/manage.sh agents disable vue-lint-fixer

# Re-enable everything
~/.claude/skills/claude-manager/manage.sh preset all
```

**Note:** Restart Claude Code after changes to apply.

## Common Scenarios

### "Too many skills loading"

```bash
# Check what's actually being used
manage.sh usage

# Apply minimal preset
manage.sh preset minimal

# Enable only what you need
manage.sh enable youtube mental-models
```

### "Starting a new project type"

```bash
# Auto-detect and suggest preset
manage.sh detect

# Or manually apply
manage.sh preset backend
```

### "Want to see everything available"

```bash
manage.sh preset all
manage.sh status
```
