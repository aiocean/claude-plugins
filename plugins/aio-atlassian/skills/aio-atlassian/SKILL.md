---
name: aio-atlassian
description: Manage Jira issues, sprints, workflows, and Confluence pages via CLI. Triggers: "create Jira issue", "search issues", "update issue status", "manage sprint", "search confluence", "create page", "update page", jira, confluence, JQL, CQL, epic, wiki.
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

---

## Jira CLI

### Issues

```bash
jira-cli get-issue --issue-key PROJ-123 --env .env
jira-cli search-issues --jql "project = PROJ AND status = 'In Progress'" --env .env
jira-cli search-issues --jql "assignee = currentUser() AND sprint in openSprints()" --env .env
jira-cli search-issues --jql "project = PROJ AND created >= -7d" --env .env
jira-cli create-issue --project-key PROJ --summary "Bug title" --issue-type Bug --env .env
jira-cli create-child-issue --parent-issue-key PROJ-100 --summary "Subtask" --env .env
jira-cli update-issue --issue-key PROJ-123 --summary "Updated title" --env .env
jira-cli delete-issue --issue-key PROJ-123 --env .env
jira-cli list-issue-types --project-key PROJ --env .env
```

### Workflow

```bash
# Step 1: see available transitions
jira-cli get-transitions --issue-key PROJ-123 --env .env
# Step 2: apply transition
jira-cli transition-issue --issue-key PROJ-123 --transition-id 31 --env .env
```

### Sprints

```bash
jira-cli get-active-sprint --project-key PROJ --env .env
jira-cli list-sprints --project-key PROJ --env .env
jira-cli search-sprint --name "Sprint 23" --project-key PROJ --env .env
```

### Comments & Worklog

```bash
jira-cli add-comment --issue-key PROJ-123 --comment "Fixed in PR #456" --env .env
jira-cli get-comments --issue-key PROJ-123 --env .env
jira-cli add-worklog --issue-key PROJ-123 --time-spent "2h 30m" --env .env
```

### Relationships & Links

```bash
jira-cli link-issues --inward-issue-key PROJ-100 --outward-issue-key PROJ-101 --link-type blocks --env .env
jira-cli get-related-issues --issue-key PROJ-100 --env .env
```

Common link types: `blocks`, `is blocked by`, `relates to`, `duplicates`

### Other

```bash
jira-cli get-development-info --issue-key PROJ-123 --env .env   # linked PRs, branches, commits
jira-cli get-issue-history --issue-key PROJ-123 --env .env
jira-cli list-project-versions --project-key PROJ --env .env
jira-cli list-statuses --project-key PROJ --env .env
jira-cli download-attachment --issue-key PROJ-123 --env .env
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
2. `jira-cli search-issues --jql "sprint = 42 AND status != Done" --env .env`

### Story with Subtasks
1. `jira-cli create-issue --project-key PROJ --summary "User auth" --issue-type Story --env .env`
2. `jira-cli create-child-issue --parent-issue-key PROJ-100 --summary "Backend" --env .env`
3. `jira-cli create-child-issue --parent-issue-key PROJ-100 --summary "Frontend" --env .env`

### Find and Update Confluence Page
1. `confluence-cli search-page --query "space = DEV AND text ~ 'deploy'" --env .env`
2. `confluence-cli get-page --page-id 12345 --env .env`  ← note the version number
3. `confluence-cli update-page --page-id 12345 --title "Title" --content "<p>Updated</p>" --version 3 --env .env`

### Build Doc Hierarchy in Confluence
1. `confluence-cli create-page --space-key DEV --title "Parent Doc" --content "<p>Overview</p>" --env .env`
2. `confluence-cli create-page --space-key DEV --title "Child Doc" --content "<p>Details</p>" --parent-id <parent-page-id> --env .env`
