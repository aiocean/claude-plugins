---
name: jira
description: This skill should be used when the user asks to "create a Jira issue", "search issues", "update issue status", "add comment", "manage sprint", "link issues", "track time", or mentions jira, jql, sprint, story, epic, bug. Provides Jira operations through MCP tools for issue lifecycle management. Auto-installs the jira-mcp server if not configured.
---

# Jira Skill

Jira operations through MCP tools. Depends on [nguyenvanduocit/jira-mcp](https://github.com/nguyenvanduocit/jira-mcp).

## Step 1: Check MCP Availability

Before any Jira operation, check if the jira MCP tools are available:

1. Use `ToolSearch("jira")` to look for tools prefixed with `jira_` (e.g. `jira_get_issue`, `jira_search_issue`)
2. If jira tools are found → skip to **Step 3: Use Jira Tools**
3. If no jira tools found → proceed to **Step 2: Auto-Install**

## Step 2: Auto-Install jira-mcp Server

If jira MCP tools are not available, install automatically:

### 2a. Install the binary

```bash
go install github.com/nguyenvanduocit/jira-mcp@latest
```

If `go` is not available, use Docker instead (see 2c below).

### 2b. Configure MCP in project settings

Add the jira MCP server to `.mcp.json` in the project root:

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

**Ask the user for these three values:**
- `ATLASSIAN_HOST` — their Atlassian URL (e.g. `https://company.atlassian.net`)
- `ATLASSIAN_EMAIL` — their Atlassian account email
- `ATLASSIAN_TOKEN` — API token from https://id.atlassian.com/manage-profile/security/api-tokens

### 2c. Docker alternative (if Go not available)

```json
{
  "mcpServers": {
    "jira": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ATLASSIAN_HOST=https://your-company.atlassian.net",
        "-e", "ATLASSIAN_EMAIL=your-email@company.com",
        "-e", "ATLASSIAN_TOKEN=your-api-token",
        "ghcr.io/nguyenvanduocit/jira-mcp:latest"
      ]
    }
  }
}
```

### 2d. After configuration

Tell the user to restart Claude Code for the MCP server to be picked up, then retry the Jira operation.

## Step 3: Use Jira Tools

All tools are prefixed with `jira_`.

### Issue Management

#### Get Issue Details
```
jira_get_issue(issue_key: "PROJ-123")
```
Returns: status, assignee, description, subtasks, and **available transitions** (required for transitioning).

#### Create Issue
```
jira_create_issue(
  project_key: "PROJ",
  summary: "Fix login bug",
  description: "Users cannot login on Safari",
  issue_type: "Bug"
)
```
Common issue types: `Bug`, `Task`, `Story`, `Epic`

#### Create Subtask
```
jira_create_child_issue(
  parent_issue_key: "PROJ-100",
  summary: "Write unit tests",
  description: "Cover edge cases for login flow"
)
```

#### Update Issue
```
jira_update_issue(
  issue_key: "PROJ-123",
  summary: "Updated title",
  description: "Updated description"
)
```

#### Delete Issue
```
jira_delete_issue(issue_key: "PROJ-123")
```

#### List Issue Types
```
jira_list_issue_types(project_key: "PROJ")
```

### Search (JQL)

```
jira_search_issue(jql: "project = PROJ AND status = 'In Progress'")
jira_search_issue(jql: "assignee = currentUser() AND sprint in openSprints()")
jira_search_issue(jql: "project = PROJ AND created >= -7d")
```

### Workflow Transitions

**Two-step process:**

1. Get available transitions:
   ```
   jira_get_issue(issue_key: "PROJ-123")  # Returns transitions list
   ```

2. Apply transition:
   ```
   jira_transition_issue(
     issue_key: "PROJ-123",
     transition_id: "31",
     comment: "Ready for QA"
   )
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
jira_link_issues(
  inward_issue_key: "PROJ-100",
  outward_issue_key: "PROJ-101",
  link_type: "blocks"
)
jira_get_related_issues(issue_key: "PROJ-100")
```

Common link types: `blocks`, `is blocked by`, `relates to`, `duplicates`

### Worklog (Time Tracking)

```
jira_add_worklog(
  issue_key: "PROJ-123",
  time_spent: "2h 30m",
  comment: "Code review and testing"
)
```

### Development Information

Get linked PRs, branches, and commits:
```
jira_get_development_information(issue_key: "PROJ-123")
```

### History & Audit

```
jira_get_issue_history(issue_key: "PROJ-123")
```

### Version Management

```
jira_list_project_versions(project_key: "PROJ")
jira_get_version(version_id: "10042")
```

### Status List

```
jira_list_statuses(project_key: "PROJ")
```

## Common Workflows

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
