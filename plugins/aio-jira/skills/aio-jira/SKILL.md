---
name: aio-jira
description: Manage Jira issues, sprints, and time tracking via MCP (auto-installs jira-mcp if missing). Triggers: "create Jira issue", "search issues", "update issue status", "manage sprint", jira, JQL, epic.
---

# Jira Skill

Jira operations through MCP tools. Depends on [nguyenvanduocit/jira-mcp](https://github.com/nguyenvanduocit/jira-mcp).

## Environment

- Go: !`which go 2>/dev/null || echo "NOT INSTALLED"`
- jira-mcp: !`which jira-mcp 2>/dev/null || echo "NOT INSTALLED"`
- jira-cli: !`which jira-cli 2>/dev/null || echo "NOT INSTALLED"`
- ATLASSIAN_HOST: !`echo ${ATLASSIAN_HOST:-NOT SET}`
- ATLASSIAN_EMAIL: !`echo ${ATLASSIAN_EMAIL:-NOT SET}`
- ATLASSIAN_TOKEN: !`[ -n "$ATLASSIAN_TOKEN" ] && echo "SET" || echo "NOT SET"`
- MCP configured: !`cat .mcp.json 2>/dev/null | grep -q jira && echo "YES" || echo "NO"`

## Install (skip if already installed above)

```bash
go install github.com/nguyenvanduocit/jira-mcp@latest
go install github.com/nguyenvanduocit/jira-mcp/cmd/jira-cli@latest
```

Docker alternative (if Go not available):

```json
{
  "mcpServers": {
    "jira": {
      "command": "docker",
      "args": ["run", "--rm", "-i",
        "-e", "ATLASSIAN_HOST=https://your-company.atlassian.net",
        "-e", "ATLASSIAN_EMAIL=your-email@company.com",
        "-e", "ATLASSIAN_TOKEN=your-api-token",
        "ghcr.io/nguyenvanduocit/jira-mcp:latest"
      ]
    }
  }
}
```

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "jira-mcp",
      "env": {
        "ATLASSIAN_HOST": "https://your-company.atlassian.net",
        "ATLASSIAN_EMAIL": "your-email@company.com",
        "ATLASSIAN_TOKEN": "your-api-token"
      }
    }
  }
}
```

Values needed: `ATLASSIAN_HOST` (e.g. `https://company.atlassian.net`), `ATLASSIAN_EMAIL`, `ATLASSIAN_TOKEN` from https://id.atlassian.com/manage-profile/security/api-tokens. Restart Claude Code after configuring.

## MCP Tools (prefix: `jira_`)

### Issue Management

| Tool | Usage |
|------|-------|
| `jira_get_issue` | `(issue_key: "PROJ-123")` — returns status, assignee, description, subtasks, transitions |
| `jira_create_issue` | `(project_key, summary, description, issue_type)` — types: Bug, Task, Story, Epic |
| `jira_create_child_issue` | `(parent_issue_key: "PROJ-100", summary, description)` |
| `jira_update_issue` | `(issue_key, summary, description)` |
| `jira_delete_issue` | `(issue_key: "PROJ-123")` |
| `jira_list_issue_types` | `(project_key: "PROJ")` |

### Search (JQL)

```
jira_search_issue(jql: "project = PROJ AND status = 'In Progress'")
jira_search_issue(jql: "assignee = currentUser() AND sprint in openSprints()")
jira_search_issue(jql: "project = PROJ AND created >= -7d")
```

### Workflow Transitions

Two-step: get transitions via `jira_get_issue`, then apply:
```
jira_transition_issue(issue_key: "PROJ-123", transition_id: "31", comment: "Ready for QA")
```

### Sprint Management

```
jira_get_active_sprint(project_key: "PROJ")
jira_list_sprints(project_key: "PROJ")
jira_get_sprint(sprint_id: "42")
jira_search_sprint_by_name(name: "Sprint 23", project_key: "PROJ")
```

### Comments

```
jira_add_comment(issue_key: "PROJ-123", comment: "Fixed in PR #456")
jira_get_comments(issue_key: "PROJ-123")
```

### Issue Relationships

```
jira_link_issues(inward_issue_key: "PROJ-100", outward_issue_key: "PROJ-101", link_type: "blocks")
jira_get_related_issues(issue_key: "PROJ-100")
```

Common link types: `blocks`, `is blocked by`, `relates to`, `duplicates`

### Worklog

```
jira_add_worklog(issue_key: "PROJ-123", time_spent: "2h 30m", comment: "Code review and testing")
```

### Other Tools

```
jira_get_development_information(issue_key: "PROJ-123")  # linked PRs, branches, commits
jira_get_issue_history(issue_key: "PROJ-123")
jira_list_project_versions(project_key: "PROJ")
jira_get_version(version_id: "10042")
jira_list_statuses(project_key: "PROJ")
```

## CLI (fallback if MCP not configured)

```bash
jira-cli get-issue --issue-key PROJ-123 --env .env
jira-cli search-issues --jql "project = PROJ AND status = 'In Progress'" --env .env
jira-cli create-issue --project-key PROJ --summary "Bug title" --issue-type Bug --env .env
jira-cli create-child-issue --parent-issue-key PROJ-100 --summary "Subtask" --env .env
jira-cli update-issue --issue-key PROJ-123 --summary "Updated title" --env .env
jira-cli delete-issue --issue-key PROJ-123 --env .env
jira-cli list-issue-types --project-key PROJ --env .env
jira-cli get-active-sprint --project-key PROJ --env .env
jira-cli list-sprints --project-key PROJ --env .env
jira-cli search-sprint --name "Sprint 23" --project-key PROJ --env .env
jira-cli add-comment --issue-key PROJ-123 --comment "Fixed in PR #456" --env .env
jira-cli get-comments --issue-key PROJ-123 --env .env
jira-cli get-transitions --issue-key PROJ-123 --env .env
jira-cli transition-issue --issue-key PROJ-123 --transition-id 31 --env .env
jira-cli add-worklog --issue-key PROJ-123 --time-spent "2h 30m" --env .env
jira-cli link-issues --inward-issue-key PROJ-100 --outward-issue-key PROJ-101 --link-type blocks --env .env
jira-cli get-related-issues --issue-key PROJ-100 --env .env
jira-cli get-development-info --issue-key PROJ-123 --env .env
jira-cli get-issue-history --issue-key PROJ-123 --env .env
jira-cli list-project-versions --project-key PROJ --env .env
jira-cli list-statuses --project-key PROJ --env .env
jira-cli download-attachment --issue-key PROJ-123 --env .env
```

Flags: `--env` (path to .env with credentials), `--output text|json`

## Workflows

### Complete Bug Fix Flow
1. `jira_search_issue(jql: "status = 'In Progress' AND assignee = currentUser()")`
2. `jira_get_issue(issue_key: "PROJ-123")` → get transition_id
3. `jira_transition_issue(issue_key: "PROJ-123", transition_id: "31")`
4. `jira_add_comment(issue_key: "PROJ-123", comment: "Fixed in PR #X")`

### Sprint Planning
1. `jira_get_active_sprint(project_key: "PROJ")`
2. `jira_search_issue(jql: "sprint = 42 AND status != Done")`

### Create Story with Subtasks
1. `jira_create_issue(project_key: "PROJ", summary: "User auth", issue_type: "Story")`
2. `jira_create_child_issue(parent_issue_key: "PROJ-100", summary: "Backend")`
3. `jira_create_child_issue(parent_issue_key: "PROJ-100", summary: "Frontend")`
