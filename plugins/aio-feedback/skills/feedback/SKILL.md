---
name: aio-feedback
description: Submit bug reports, feature requests, and plugin requests to aiocean/claude-plugins via GitHub Issues. Triggers: "submit feedback", "report bug", "request feature", "request plugin", "file issue".
---

# Feedback — Submit Issues for aiocean Plugins

## Environment
- gh: !`which gh 2>/dev/null || echo "NOT INSTALLED — brew install gh"`
- gh auth: !`gh auth status 2>/dev/null | grep -q "Logged in" && echo "authenticated" || echo "NOT AUTHENTICATED — run: gh auth login"`
- Scripts: !`ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-feedback/*/skills/feedback/scripts 2>/dev/null | sort -V | tail -1 || echo "NOT FOUND"`

Submit bug reports, feature requests, and plugin requests directly to the aiocean/claude-plugins repository without leaving Claude Code.

```bash
SCRIPTS="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-feedback/*/skills/feedback/scripts 2>/dev/null | sort -V | tail -1)"
```

## Workflow

### Step 1: Determine Feedback Type

Ask the user what kind of feedback they want to submit:

| Type | Label | Use for |
|------|-------|---------|
| `bug` | bug | Something broken or not working as expected |
| `feature` | enhancement | Improvement to an existing plugin |
| `plugin-request` | plugin-request | Request for a new plugin to be added |

### Step 2: Collect Details

Gather from the user:

**For bug reports:**
- Which plugin is affected
- What happened vs what was expected
- Steps to reproduce (if possible)

**For feature requests:**
- Which plugin (or general marketplace)
- What they want and why

**For plugin requests:**
- What the plugin should do
- Example use cases

### Step 3: Format and Submit

Build a markdown body and submit using the script:

```bash
bash "$SCRIPTS/feedback-submit.sh" "<type>" "<title>" "<body>"
```

**Bug report body template:**
```markdown
## Plugin
<plugin-name>

## What happened
<description>

## Expected behavior
<expected>

## Steps to reproduce
<steps or "N/A">
```

**Feature request body template:**
```markdown
## Plugin
<plugin-name or "marketplace">

## What I'd like
<description>

## Why
<motivation>
```

**Plugin request body template:**
```markdown
## Proposed plugin
<name>

## What it should do
<description>

## Use cases
<examples>
```

### Step 4: Confirm

The script outputs the created issue URL. Share it with the user so they can track their feedback.
