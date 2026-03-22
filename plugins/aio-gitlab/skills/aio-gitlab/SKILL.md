---
name: aio-gitlab
description: Manage GitLab MRs, pipelines, branches, and CI jobs via gitlab-mcp (auto-installs if missing). Triggers: "create MR", "accept MR", "trigger pipeline", "retry job", gitlab, merge request, gitlab CI.
---

# GitLab Skill

GitLab operations via [nguyenvanduocit/gitlab-mcp](https://github.com/nguyenvanduocit/gitlab-mcp).

## Environment

- Go: !`which go 2>/dev/null || echo "NOT INSTALLED"`
- gitlab-mcp: !`which gitlab-mcp 2>/dev/null || echo "NOT INSTALLED"`
- gitlab-cli: !`which gitlab-cli 2>/dev/null || echo "NOT INSTALLED"`
- GITLAB_TOKEN: !`[ -n "$GITLAB_TOKEN" ] && echo "SET" || echo "NOT SET"`
- GITLAB_URL: !`echo ${GITLAB_URL:-NOT SET}`
- MCP configured: !`cat .mcp.json 2>/dev/null | grep -q gitlab && echo "YES" || echo "NO"`

## Install (skip if already installed above)

```bash
go install github.com/nguyenvanduocit/gitlab-mcp@latest
go install github.com/nguyenvanduocit/gitlab-mcp/cmd/gitlab-cli@latest
```

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "gitlab-mcp",
      "env": {
        "GITLAB_TOKEN": "glpat-xxxxxxxxxxxxxxxxxxxx",
        "GITLAB_URL": "https://gitlab.com"
      }
    }
  }
}
```

Values needed: `GITLAB_TOKEN` from GitLab > Settings > Access Tokens, `GITLAB_URL` (e.g. `https://gitlab.com`). Restart Claude Code after configuring.

## MCP Tools (prefix: `gitlab_`)

### Project Operations

```
gitlab_list_projects()
gitlab_get_project(project_id: "group/project")
```

### Merge Request Management

| Tool | Usage |
|------|-------|
| `gitlab_list_mrs` | `(project_id, state: "opened")` |
| `gitlab_get_mr` | `(project_id, mr_iid: 42)` |
| `gitlab_create_mr` | `(project_id, title, source_branch, target_branch, description)` |
| `gitlab_accept_mr` | `(project_id, mr_iid: 42)` |
| `gitlab_rebase_mr` | `(project_id, mr_iid: 42)` |
| `gitlab_list_mr_comments` | `(project_id, mr_iid: 42)` |
| `gitlab_comment_mr` | `(project_id, mr_iid: 42, body: "LGTM")` |
| `gitlab_list_mr_pipelines` | `(project_id, mr_iid: 42)` |
| `gitlab_get_mr_commits` | `(project_id, mr_iid: 42)` |

### Repository Operations

```
gitlab_get_file(project_id: "group/project", file_path: "src/main.go", ref: "main")
gitlab_list_commits(project_id: "group/project", ref_name: "main")
gitlab_get_commit(project_id: "group/project", sha: "abc123")
```

### Pipeline & Jobs

```
gitlab_list_pipelines(project_id: "group/project", ref: "main")
gitlab_get_pipeline(project_id: "group/project", pipeline_id: 100)
gitlab_trigger_pipeline(project_id: "group/project", ref: "main")
gitlab_list_jobs(project_id: "group/project", pipeline_id: 100)
gitlab_get_job(project_id: "group/project", job_id: 200)
gitlab_cancel_job(project_id: "group/project", job_id: 200)
gitlab_retry_job(project_id: "group/project", job_id: 200)
```

### Branch Protection

```
gitlab_manage_branch_protection(project_id: "group/project", branch: "main", push_access_level: 40, merge_access_level: 30)
```

### Git Flow

```
gitlab_create_feature(project_id: "group/project", name: "user-auth")
gitlab_finish_feature(project_id: "group/project", name: "user-auth")
gitlab_create_release(project_id: "group/project", name: "1.2.0")
gitlab_finish_release(project_id: "group/project", name: "1.2.0")
gitlab_create_hotfix(project_id: "group/project", name: "fix-login")
gitlab_finish_hotfix(project_id: "group/project", name: "fix-login")
```

## CLI (fallback if MCP not configured)

```bash
gitlab-cli list-projects --env .env
gitlab-cli list-mrs --project-id group/project --state opened --env .env
gitlab-cli create-mr --project-id group/project --title "Feature" --source feature-x --target main --env .env
gitlab-cli accept-mr --project-id group/project --mr-iid 42 --env .env
gitlab-cli list-pipelines --project-id group/project --env .env
gitlab-cli trigger-pipeline --project-id group/project --ref main --env .env
gitlab-cli retry-job --project-id group/project --job-id 200 --env .env
gitlab-cli create-feature --project-id group/project --name user-auth --env .env
gitlab-cli finish-feature --project-id group/project --name user-auth --env .env
```

Flag: `--env` path to .env file with credentials.

## Workflows

### MR Review & Merge
1. `gitlab_list_mrs(project_id: "group/project", state: "opened")`
2. `gitlab_get_mr(project_id: "group/project", mr_iid: 42)`
3. `gitlab_list_mr_pipelines(project_id: "group/project", mr_iid: 42)` — verify CI passed
4. `gitlab_comment_mr(project_id: "group/project", mr_iid: 42, body: "Approved")`
5. `gitlab_accept_mr(project_id: "group/project", mr_iid: 42)`

### Pipeline Debugging
1. `gitlab_list_pipelines(project_id: "group/project")` — find failed pipeline
2. `gitlab_list_jobs(project_id: "group/project", pipeline_id: 100)` — find failed job
3. `gitlab_get_job(project_id: "group/project", job_id: 200)` — check logs
4. `gitlab_retry_job(project_id: "group/project", job_id: 200)` — retry
