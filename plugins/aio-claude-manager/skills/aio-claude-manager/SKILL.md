---
name: aio-claude-manager
description: Manage and optimize Claude Code skills — enable, disable, analyze usage, and apply project-type presets. Triggers: "manage skills", "disable skills", "reduce clutter", "apply preset", "too many skills", switching project types (frontend, backend, data, ai).
---

# Claude Manager

Manages skills, agents, and provides usage analytics to optimize Claude Code workflow.

## Environment

- Scripts: !`ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-claude-manager/*/skills/aio-claude-manager 2>/dev/null | sort -V | tail -1 || echo "NOT FOUND"`

Set `CM` to the Scripts path shown above.

## Script

```bash
$CM/manage.sh [command] [args]
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
| `detect`         | `$CM/manage.sh detect`                         | Auto-detect project type     |
| `usage`          | `$CM/manage.sh usage`                          | Full usage analytics report  |

## Usage Report

Run `$CM/manage.sh usage` for comprehensive analytics:

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
$CM/manage.sh status

# Analyze actual usage patterns
$CM/manage.sh usage

# Apply preset for frontend work
$CM/manage.sh preset frontend

# Disable specific unused skills
$CM/manage.sh disable shopify-listing epub-packing

# Disable specific agents
$CM/manage.sh agents disable vue-lint-fixer

# Re-enable everything
$CM/manage.sh preset all
```

**Note:** Restart Claude Code after changes to apply.

## Common Scenarios

### "Too many skills loading"

```bash
# Check what's actually being used
$CM/manage.sh usage

# Apply minimal preset
$CM/manage.sh preset minimal

# Enable only what you need
$CM/manage.sh enable youtube mental-models
```

### "Starting a new project type"

```bash
# Auto-detect and suggest preset
$CM/manage.sh detect

# Or manually apply
$CM/manage.sh preset backend
```

### "Want to see everything available"

```bash
$CM/manage.sh preset all
$CM/manage.sh status
```
