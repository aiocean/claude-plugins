---
name: aio-atlassian
description: |
  Read, create, and update Jira issues, sprints, and workflows plus Confluence pages via the Atlassian CLI. Use when the user mentions a Jira ticket key (e.g. PROJ-123), asks for a JQL/CQL search, wants to transition an issue, manage a sprint/backlog, or read/write a Confluence page.
when_to_use: jira, confluence, create issue, search issues, update issue status, manage sprint, JQL, CQL, epic, wiki, board, backlog, atlassian, ticket, story, subtask, page, space, create page, update page
effort: low
argument-hint: "Jira issue key, JQL query, or Confluence page title"
---

# Atlassian CLI

Jira and Confluence operations via CLI tools from [nguyenvanduocit/jira-mcp](https://github.com/nguyenvanduocit/jira-mcp) and [nguyenvanduocit/confluence-mcp](https://github.com/nguyenvanduocit/confluence-mcp).

## Environment

- Go: !`which go 2>/dev/null || echo "NOT INSTALLED"`
- jira-cli: !`which jira-cli 2>/dev/null || echo "NOT INSTALLED"`
- confluence-cli: !`which confluence-cli 2>/dev/null || echo "NOT INSTALLED"`
- ATLASSIAN_HOST: !`echo ${ATLASSIAN_HOST:-NOT SET}`
- ATLASSIAN_EMAIL: !`echo ${ATLASSIAN_EMAIL:-NOT SET}`
- ATLASSIAN_TOKEN: !`[ -n "$ATLASSIAN_TOKEN" ] && echo "SET" || echo "NOT SET"`

## Install

```bash
go install github.com/nguyenvanduocit/jira-mcp/cmd/jira-cli@latest
go install github.com/nguyenvanduocit/confluence-mcp/cmd/confluence-cli@latest
```

Or via Homebrew (confluence-cli only):
```bash
brew install nguyenvanduocit/tap/confluence-mcp
```

**Credentials** (get token from https://id.atlassian.com/manage-profile/security/api-tokens):

Create a `.env` file:
```
ATLASSIAN_HOST=https://your-company.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_TOKEN=your-api-token
```

All CLI commands accept `--env .env` to load credentials from this file.

**Global flags:** `--env <path>` (load .env file), `--output text|json` (output format, default: text)

---

## Jira CLI

### Issues

```bash
# Get issue (full details with transitions, changelog, subtasks, description)
jira-cli get-issue --issue-key PROJ-123 --env .env
jira-cli get-issue --issue-key PROJ-123 --fields summary,status --output json
jira-cli get-issue --issue-key PROJ-123 --expand transitions,changelog

# Search issues with JQL
jira-cli search-issues --jql "project = PROJ AND status = 'In Progress'" --env .env
jira-cli search-issues --jql "assignee = currentUser() AND sprint in openSprints()" --max-results 10 --env .env
jira-cli search-issues --jql "project = PROJ AND created >= -7d" --fields summary,status --env .env

# Create issue
jira-cli create-issue --project PROJ --summary "Bug title" --type Bug --env .env
jira-cli create-issue --project PROJ --summary "New feature" --type Story \
  --description "## Overview\nA new feature" --priority High --env .env
jira-cli create-issue --project PROJ --summary "Task" --type Task \
  --assignee 5a1234b --priority Medium --env .env

# Create child issue (subtask)
jira-cli create-child-issue --parent-key PROJ-100 --summary "Subtask 1" --env .env
jira-cli create-child-issue --parent-key PROJ-100 --summary "Subtask" \
  --description "Details here" --type Subtask --env .env

# Update issue
jira-cli update-issue --issue-key PROJ-123 --summary "Updated title" --env .env
jira-cli update-issue --issue-key PROJ-123 --priority High --assignee 5a1234b --env .env
jira-cli update-issue --issue-key PROJ-123 --description "## New description" --env .env

# Delete issue (cannot be undone)
jira-cli delete-issue --issue-key PROJ-123 --env .env

# List available issue types
jira-cli list-issue-types --env .env
```

**Issue types:** Bug, Task, Story, Epic, Subtask
**Priorities:** Highest, High, Medium, Low, Lowest

### Workflow (Status & Transitions)

```bash
# Step 1: see available transitions
jira-cli get-transitions --issue-key PROJ-123 --env .env
# Step 2: apply transition
jira-cli transition-issue --issue-key PROJ-123 --transition-id 31 --env .env

# List all statuses for a project
jira-cli list-statuses --project-key PROJ --env .env
```

### Sprints

```bash
# List sprints for a project
jira-cli list-sprints --project-key PROJ --env .env
jira-cli list-sprints --board-id 42 --env .env

# Get active sprint
jira-cli get-active-sprint --project-key PROJ --env .env

# Get specific sprint by ID
jira-cli get-sprint --sprint-id 42 --env .env

# Search sprints by name (substring match by default)
jira-cli search-sprint --name "Sprint 23" --project-key PROJ --env .env
jira-cli search-sprint --name "Sprint 23" --project-key PROJ --exact-match --env .env
```

### Comments

```bash
jira-cli add-comment --issue-key PROJ-123 --comment "Fixed in PR #456" --env .env
jira-cli get-comments --issue-key PROJ-123 --env .env
```

### Worklogs

```bash
# Log time spent
jira-cli add-worklog --issue-key PROJ-123 --time-spent 2h30m --env .env
jira-cli add-worklog --issue-key PROJ-123 --time-spent 1h \
  --comment "Code review" --started "2025-01-15T09:00:00.000+0700" --env .env
```

**Time format:** `1h30m`, `3h`, `30m`, or seconds. No spaces between units.

#### Rich Formatting — Markdown Supported

`jira-cli` automatically converts **Markdown to ADF** (Atlassian Document Format) for all text fields — comments, descriptions, and issue updates. Just write standard Markdown:

```bash
jira-cli add-comment --issue-key PROJ-123 --comment "## Investigation Results

Found **3 issues** across all shops.

- Shop A: $1,234.56
- Shop B: $2,345.67

\`\`\`go
func main() { fmt.Println(\"hello\") }
\`\`\`" --env .env
```

> **NEVER use Jira wiki markup** (`h2.`, `||header||`, `{code}`, `*bold*`, `#` lists).
> It will appear as **literal ugly text**. Always use Markdown — jira-cli handles conversion.

**Supported Markdown elements:** headings, bold, italic, inline code, code blocks (with language), bullet lists, ordered lists, links, strikethrough, blockquotes, horizontal rules.

**Text Marks (for REST API direct usage):**

| Mark | Example |
|------|---------|
| Bold | `"marks": [{"type": "strong"}]` |
| Italic | `"marks": [{"type": "em"}]` |
| Code | `"marks": [{"type": "code"}]` |
| Color | `"marks": [{"type": "textColor", "attrs": {"color": "#bf2600"}}]` |
| Link | `"marks": [{"type": "link", "attrs": {"href": "https://..."}}]` |

**When to use which:**
- All comments (simple or rich) → `jira-cli add-comment --comment "markdown text"` (auto-converts to ADF)
- Issue description → `jira-cli create-issue --description "markdown"` or `jira-cli update-issue --description "markdown"`
- Deleting a comment → `curl -X DELETE .../rest/api/3/issue/PROJ-123/comment/{commentId}`

### Relationships & Links

```bash
jira-cli link-issues --inward-issue PROJ-100 --outward-issue PROJ-101 --link-type Blocks --env .env
jira-cli link-issues --inward-issue PROJ-1 --outward-issue PROJ-2 --link-type Relates --comment "Related work" --env .env
jira-cli get-related-issues --issue-key PROJ-100 --env .env
```

Common link types: `Blocks`, `Duplicate`, `Relates` (capitalized)

### Versions

```bash
jira-cli get-version --version-id 10001 --env .env
jira-cli list-project-versions --project-key PROJ --env .env
```

### Development Info

```bash
# Get linked PRs, branches, commits, builds for an issue
jira-cli get-development-info --issue-key PROJ-123 --env .env
jira-cli get-development-info --issue-key PROJ-123 \
  --include-branches true --include-pull-requests true \
  --include-commits true --include-builds true --env .env
```

### History & Attachments

```bash
jira-cli get-issue-history --issue-key PROJ-123 --env .env
jira-cli download-attachment --attachment-id 10500 --env .env
```

---

## Confluence CLI

```bash
confluence-cli search-page --query "type = page AND space = DEV AND text ~ 'deploy'" --env .env
confluence-cli get-page --page-id 12345 --env .env
confluence-cli create-page --space-key DEV --title "Title" --content "<p>HTML</p>" --env .env
confluence-cli update-page --page-id 12345 --title "Title" --content "<p>HTML</p>" --version 2 --env .env
confluence-cli get-comments --page-id 12345 --env .env
confluence-cli list-spaces --env .env
```

Note: `update-page` requires `--version` = current version + 1. Get current version via `get-page` first.

Flags: `--env` (path to .env), `--output text|json`

---

## Workflows

### Fix a Bug
1. `jira-cli search-issues --jql "status = 'In Progress' AND assignee = currentUser()" --env .env`
2. `jira-cli get-transitions --issue-key PROJ-123 --env .env`
3. `jira-cli transition-issue --issue-key PROJ-123 --transition-id 31 --env .env`
4. `jira-cli add-comment --issue-key PROJ-123 --comment "Fixed in PR #X" --env .env`

### Sprint Planning
1. `jira-cli get-active-sprint --project-key PROJ --env .env`
2. `jira-cli search-issues --jql "sprint = 42 AND status != Done" --max-results 50 --env .env`

### Story with Subtasks
1. `jira-cli create-issue --project PROJ --summary "User auth" --type Story --env .env`
2. `jira-cli create-child-issue --parent-key PROJ-100 --summary "Backend" --env .env`
3. `jira-cli create-child-issue --parent-key PROJ-100 --summary "Frontend" --env .env`

### Find and Update Confluence Page
1. `confluence-cli search-page --query "space = DEV AND text ~ 'deploy'" --env .env`
2. `confluence-cli get-page --page-id 12345 --env .env`  ← note the version number
3. `confluence-cli update-page --page-id 12345 --title "Title" --content "<p>Updated</p>" --version 3 --env .env`

### Build Doc Hierarchy in Confluence
1. `confluence-cli create-page --space-key DEV --title "Parent Doc" --content "<p>Overview</p>" --env .env`
2. `confluence-cli create-page --space-key DEV --title "Child Doc" --content "<p>Details</p>" --parent-id <parent-page-id> --env .env`
