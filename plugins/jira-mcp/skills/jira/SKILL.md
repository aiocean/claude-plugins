---
name: jira
description: Interact with Jira through MCP tools for issue lifecycle management. Use when user mentions jira, issue, sprint, bug, story, task, transition, jql, or asks to create/update/search issues, add comments, manage sprints, link issues, or track time.
---

# Jira MCP Integration

Comprehensive Jira operations through MCP tools. All tools are prefixed with `jira_`.

## Issue Management

### Get Issue Details
```
jira_get_issue(issue_key: "PROJ-123")
```
Returns: status, assignee, description, subtasks, and **available transitions** (required for transitioning).

### Create Issue
```
jira_create_issue(
  project_key: "PROJ",
  summary: "Fix login bug",
  description: "Users cannot login on Safari",
  issue_type: "Bug"
)
```
Common issue types: `Bug`, `Task`, `Story`, `Epic`

### Create Subtask
```
jira_create_child_issue(
  parent_issue_key: "PROJ-100",
  summary: "Write unit tests",
  description: "Cover edge cases for login flow"
)
```

### Update Issue
```
jira_update_issue(
  issue_key: "PROJ-123",
  summary: "Updated title",
  description: "Updated description"
)
```

### Delete Issue
```
jira_delete_issue(issue_key: "PROJ-123")
```

## Search (JQL)

```
jira_search_issue(jql: "project = PROJ AND status = 'In Progress'")
jira_search_issue(jql: "assignee = currentUser() AND sprint in openSprints()")
jira_search_issue(jql: "project = PROJ AND created >= -7d")
```

## Workflow Transitions

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

## Sprint Management

```
jira_get_active_sprint(project_key: "PROJ")
jira_list_sprints(project_key: "PROJ")
jira_get_sprint(sprint_id: "42")
jira_search_sprint_by_name(name: "Sprint 23", project_key: "PROJ")
```

## Comments

```
jira_add_comment(issue_key: "PROJ-123", comment: "Fixed in PR #456")
jira_get_comments(issue_key: "PROJ-123")
```

## Issue Relationships

```
jira_link_issues(
  inward_issue_key: "PROJ-100",
  outward_issue_key: "PROJ-101",
  link_type: "blocks"
)
jira_get_related_issues(issue_key: "PROJ-100")
```

Common link types: `blocks`, `is blocked by`, `relates to`, `duplicates`

## Worklog (Time Tracking)

```
jira_add_worklog(
  issue_key: "PROJ-123",
  time_spent: "2h 30m",
  comment: "Code review and testing"
)
```

## Development Information

Get linked PRs, branches, and commits:
```
jira_get_development_information(issue_key: "PROJ-123")
```

## History & Audit

```
jira_get_issue_history(issue_key: "PROJ-123")
```

## Version Management

```
jira_list_project_versions(project_key: "PROJ")
jira_get_version(version_id: "10042")
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
