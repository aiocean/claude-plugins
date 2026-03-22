---
name: aio-install
description: Install, enable, disable, and list aiocean plugins for the current project. Triggers: "install plugin", "add plugin", "enable plugin", "disable plugin", "list plugins", "available plugins".
---

# Plugin Installer (aiocean-plugins)

Install, enable, disable, and list aiocean plugins for the current project.

## How It Works

Plugins are managed via `settings.local.json` in the project's `.claude/` directory.
Each plugin is identified by `name@aiocean-plugins` format.

## Step 1: Parse User Request

Determine the action:
- **list** — show available plugins and which are enabled
- **install/enable** — add plugin(s) to `enabledPlugins`
- **disable/remove** — set plugin(s) to `false` or remove from `enabledPlugins`
- **search** — filter plugins by keyword

## Environment

- Marketplace: !`cat ~/.claude/plugins/marketplaces/aiocean-plugins/.claude-plugin/marketplace.json 2>/dev/null | head -1 || echo "NOT FOUND"`

## Step 2: Get Available Plugins

Read the marketplace manifest to get all available plugins:

```bash
cat ~/.claude/plugins/marketplaces/aiocean-plugins/.claude-plugin/marketplace.json
```

Extract the `plugins` array — each entry has `name`, `description`, `version`.

## Step 3: Get Current Project Settings

Read the project's local settings:

```bash
cat .claude/settings.local.json
```

Look at the `enabledPlugins` object for entries matching `*@aiocean-plugins`.

## Step 4: Execute Action

### List Plugins

Display a table showing all available plugins with their status:

```
| Plugin                | Version | Status    | Description                          |
|-----------------------|---------|-----------|--------------------------------------|
| aio-google-workspace  | 1.0.0   | enabled   | Google Workspace via gws CLI...      |
| aio-gitlab            | 1.0.0   | disabled  | GitLab CLI/MCP...                    |
```

### Install/Enable Plugin(s)

1. Read `.claude/settings.local.json`
2. Add `"plugin-name@aiocean-plugins": true` to `enabledPlugins`
3. Write the updated JSON back
4. Confirm: "Enabled `plugin-name`. Restart Claude Code to activate."

If the user gives a partial name, fuzzy-match against available plugins and confirm before installing.

### Disable/Remove Plugin(s)

1. Read `.claude/settings.local.json`
2. Remove the plugin entry from `enabledPlugins` (or set to `false`)
3. Write the updated JSON back
4. Confirm: "Disabled `plugin-name`."

### Search

Filter the plugin list by keyword matching against name and description.

## Step 5: Post-Action

After any install/disable action, remind the user:
> Restart Claude Code (or start a new session) for changes to take effect.

## Notes

- Always preserve existing non-aiocean entries in `enabledPlugins`
- If `.claude/settings.local.json` doesn't exist, create it with the proper structure
- If `enabledPlugins` key doesn't exist, create it
- Plugin names are case-sensitive — use exact names from the marketplace manifest
