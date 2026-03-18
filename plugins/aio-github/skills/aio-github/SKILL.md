---
name: aio-github
description: This skill should be used when the user asks to list repos, create PR, review PR, approve PR, get issue, comment on issue, close issue, get file from github, or mentions github repository, pull request, github issue management via github-mcp. Auto-installs github-mcp if missing.
---

# GitHub Skill

GitHub operations via [nguyenvanduocit/github-mcp](https://github.com/nguyenvanduocit/github-mcp).

## Step 1: Check Availability

1. Use `ToolSearch("github")` to look for tools prefixed with `github_` (e.g. `github_list_repos`, `github_get_pr`)
2. If github tools are found → skip to **Step 3: Use Tools**
3. If no tools found → check if `github-cli` binary exists: `which github-cli`
4. If CLI exists → skip to **Step 4: Use CLI**
5. If neither found → proceed to **Step 2: Install**

**Important:** This is `github-mcp`, NOT the official `gh` CLI. Do not confuse them.

## Step 2: Install

### 2a. Install via Go

```bash
# MCP server
go install github.com/nguyenvanduocit/github-mcp@latest

# CLI
go install github.com/nguyenvanduocit/github-mcp/cmd/github-cli@latest
```

### 2b. Environment Variables

**Ask the user for:**

- `GITHUB_TOKEN` — Personal access token from https://github.com/settings/tokens

```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

### 2c. Configure as MCP Server (optional)

```json
{
  "mcpServers": {
    "github": {
      "command": "github-mcp",
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## Step 3: Use MCP Tools

All tools are prefixed with `github_`.

### Repository Operations

```
github_list_repos(owner: "orgname")
github_get_repo(owner: "orgname", repo: "project")
```

### Pull Request Management

```
# List PRs
github_list_prs(owner: "org", repo: "project", state: "open")

# Get PR details
github_get_pr(owner: "org", repo: "project", pr_number: 42)

# Create PR
github_create_pr(
  owner: "org",
  repo: "project",
  title: "Add feature X",
  body: "Description of changes",
  head: "feature-branch",
  base: "main"
)

# Comment on PR
github_create_pr_comment(
  owner: "org",
  repo: "project",
  pr_number: 42,
  body: "LGTM!"
)

# Approve PR
github_approve_pr(owner: "org", repo: "project", pr_number: 42)
```

### Issue Management

```
# List issues
github_list_issues(owner: "org", repo: "project", state: "open")

# Get issue details
github_get_issue(owner: "org", repo: "project", issue_number: 10)

# Comment on issue
github_comment_issue(
  owner: "org",
  repo: "project",
  issue_number: 10,
  body: "Working on this"
)

# Close/reopen issue
github_issue_action(owner: "org", repo: "project", issue_number: 10, action: "close")
github_issue_action(owner: "org", repo: "project", issue_number: 10, action: "reopen")
```

### File Operations

```
github_get_file(owner: "org", repo: "project", path: "src/main.go", ref: "main")
```

## Step 4: Use CLI

```bash
# List repos
github-cli list-repos --owner orgname --env .env

# Get PR details
github-cli get-pr --owner org --repo project --pr-number 42 --env .env

# Create PR
github-cli create-pr --owner org --repo project --title "Feature" --head feature --base main --env .env

# Approve PR
github-cli approve-pr --owner org --repo project --pr-number 42 --env .env

# List issues
github-cli list-issues --owner org --repo project --state open --env .env

# Comment on issue
github-cli comment-issue --owner org --repo project --issue-number 10 --body "Done" --env .env

# Close/reopen issue
github-cli issue-action --owner org --repo project --issue-number 10 --action close --env .env

# Get file content
github-cli get-file --owner org --repo project --path src/main.go --ref main --env .env
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--env` | Path to .env file with credentials |
| `--output` | Output format: `text` (default) or `json` |

## Common Workflows

### PR Review Flow

1. `github_list_prs(owner: "org", repo: "project", state: "open")`
2. `github_get_pr(owner: "org", repo: "project", pr_number: 42)`
3. `github_create_pr_comment(owner: "org", repo: "project", pr_number: 42, body: "Feedback...")`
4. `github_approve_pr(owner: "org", repo: "project", pr_number: 42)`

### Issue Triage

1. `github_list_issues(owner: "org", repo: "project", state: "open")`
2. `github_get_issue(owner: "org", repo: "project", issue_number: 10)`
3. `github_comment_issue(owner: "org", repo: "project", issue_number: 10, body: "Triaged")`
