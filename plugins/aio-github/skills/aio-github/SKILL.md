---
name: aio-github
description: Manage GitHub repos, PRs, and issues via github-mcp (auto-installs if missing). Triggers: "list repos", "create PR", "review PR", "get issue", "comment on issue", github repository, pull request.
---

# GitHub Skill

GitHub operations via [nguyenvanduocit/github-mcp](https://github.com/nguyenvanduocit/github-mcp).

**Important:** This is `github-mcp`, NOT the official `gh` CLI. Do not confuse them.

## Environment

- Go: !`which go 2>/dev/null || echo "NOT INSTALLED"`
- github-mcp: !`which github-mcp 2>/dev/null || echo "NOT INSTALLED"`
- github-cli: !`which github-cli 2>/dev/null || echo "NOT INSTALLED"`
- GITHUB_TOKEN: !`[ -n "$GITHUB_TOKEN" ] && echo "SET" || echo "NOT SET"`
- MCP configured: !`cat .mcp.json 2>/dev/null | grep -q github && echo "YES" || echo "NO"`

## Install (skip if already installed above)

```bash
go install github.com/nguyenvanduocit/github-mcp@latest
go install github.com/nguyenvanduocit/github-mcp/cmd/github-cli@latest
```

Add to `.mcp.json`:

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

`GITHUB_TOKEN` — Personal access token from https://github.com/settings/tokens. Restart Claude Code after configuring.

## MCP Tools (prefix: `github_`)

### Repository Operations

```
github_list_repos(owner: "orgname")
github_get_repo(owner: "orgname", repo: "project")
```

### Pull Request Management

| Tool | Usage |
|------|-------|
| `github_list_prs` | `(owner, repo, state: "open")` |
| `github_get_pr` | `(owner, repo, pr_number: 42)` |
| `github_create_pr` | `(owner, repo, title, body, head, base)` |
| `github_create_pr_comment` | `(owner, repo, pr_number, body)` |
| `github_approve_pr` | `(owner, repo, pr_number: 42)` |

### Issue Management

| Tool | Usage |
|------|-------|
| `github_list_issues` | `(owner, repo, state: "open")` |
| `github_get_issue` | `(owner, repo, issue_number: 10)` |
| `github_comment_issue` | `(owner, repo, issue_number, body)` |
| `github_issue_action` | `(owner, repo, issue_number, action: "close"\|"reopen")` |

### File Operations

```
github_get_file(owner: "org", repo: "project", path: "src/main.go", ref: "main")
```

## CLI (fallback if MCP not configured)

```bash
github-cli list-repos --owner orgname --env .env
github-cli get-pr --owner org --repo project --pr-number 42 --env .env
github-cli create-pr --owner org --repo project --title "Feature" --head feature --base main --env .env
github-cli approve-pr --owner org --repo project --pr-number 42 --env .env
github-cli list-issues --owner org --repo project --state open --env .env
github-cli comment-issue --owner org --repo project --issue-number 10 --body "Done" --env .env
github-cli issue-action --owner org --repo project --issue-number 10 --action close --env .env
github-cli get-file --owner org --repo project --path src/main.go --ref main --env .env
```

Flags: `--env` (path to .env with credentials), `--output text|json`

## Workflows

### PR Review Flow
1. `github_list_prs(owner: "org", repo: "project", state: "open")`
2. `github_get_pr(owner: "org", repo: "project", pr_number: 42)`
3. `github_create_pr_comment(owner: "org", repo: "project", pr_number: 42, body: "Feedback...")`
4. `github_approve_pr(owner: "org", repo: "project", pr_number: 42)`

### Issue Triage
1. `github_list_issues(owner: "org", repo: "project", state: "open")`
2. `github_get_issue(owner: "org", repo: "project", issue_number: 10)`
3. `github_comment_issue(owner: "org", repo: "project", issue_number: 10, body: "Triaged")`
