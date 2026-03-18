---
name: aio-gitlab
description: This skill should be used when the user asks to list merge requests, create MR, accept MR, rebase MR, trigger pipeline, manage branches, git flow, list pipelines, retry job, or mentions gitlab, merge request, gitlab pipeline, gitlab CI, gitlab project. Auto-installs gitlab-mcp if missing.
---

# GitLab Skill

GitLab operations via [nguyenvanduocit/gitlab-mcp](https://github.com/nguyenvanduocit/gitlab-mcp).

## Step 1: Check Availability

1. Use `ToolSearch("gitlab")` to look for tools prefixed with `gitlab_`
2. If gitlab tools are found → skip to **Step 3: Use Tools**
3. If no tools found → check: `which gitlab-cli`
4. If CLI exists → skip to **Step 4: Use CLI**
5. If neither → proceed to **Step 2: Install**

## Step 2: Install

### 2a. Install via Go

```bash
go install github.com/nguyenvanduocit/gitlab-mcp@latest
go install github.com/nguyenvanduocit/gitlab-mcp/cmd/gitlab-cli@latest
```

### 2b. Environment Variables

**Ask the user for:**

- `GITLAB_TOKEN` — Personal access token from GitLab > Settings > Access Tokens
- `GITLAB_URL` — GitLab instance URL (e.g. `https://gitlab.com`)

```bash
export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
export GITLAB_URL="https://gitlab.com"
```

### 2c. Configure as MCP Server (optional)

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

## Step 3: Use MCP Tools

All tools are prefixed with `gitlab_`.

### Project Operations

```
gitlab_list_projects()
gitlab_get_project(project_id: "group/project")
```

### Merge Request Management

```
# List MRs
gitlab_list_mrs(project_id: "group/project", state: "opened")

# Get MR details
gitlab_get_mr(project_id: "group/project", mr_iid: 42)

# Create MR
gitlab_create_mr(
  project_id: "group/project",
  title: "Add feature",
  source_branch: "feature-x",
  target_branch: "main",
  description: "Feature description"
)

# Accept (merge) MR
gitlab_accept_mr(project_id: "group/project", mr_iid: 42)

# Rebase MR
gitlab_rebase_mr(project_id: "group/project", mr_iid: 42)

# Comments
gitlab_list_mr_comments(project_id: "group/project", mr_iid: 42)
gitlab_comment_mr(project_id: "group/project", mr_iid: 42, body: "LGTM")

# MR pipelines
gitlab_list_mr_pipelines(project_id: "group/project", mr_iid: 42)

# MR commits
gitlab_get_mr_commits(project_id: "group/project", mr_iid: 42)
```

### Repository Operations

```
gitlab_get_file(project_id: "group/project", file_path: "src/main.go", ref: "main")
gitlab_list_commits(project_id: "group/project", ref_name: "main")
gitlab_get_commit(project_id: "group/project", sha: "abc123")
```

### Pipeline & Jobs

```
# Pipelines
gitlab_list_pipelines(project_id: "group/project", ref: "main")
gitlab_get_pipeline(project_id: "group/project", pipeline_id: 100)
gitlab_trigger_pipeline(project_id: "group/project", ref: "main")

# Jobs
gitlab_list_jobs(project_id: "group/project", pipeline_id: 100)
gitlab_get_job(project_id: "group/project", job_id: 200)
gitlab_cancel_job(project_id: "group/project", job_id: 200)
gitlab_retry_job(project_id: "group/project", job_id: 200)
```

### Branch Protection

```
gitlab_manage_branch_protection(
  project_id: "group/project",
  branch: "main",
  push_access_level: 40,
  merge_access_level: 30
)
```

### Git Flow

```
# Feature branches
gitlab_create_feature(project_id: "group/project", name: "user-auth")
gitlab_finish_feature(project_id: "group/project", name: "user-auth")

# Release branches
gitlab_create_release(project_id: "group/project", name: "1.2.0")
gitlab_finish_release(project_id: "group/project", name: "1.2.0")

# Hotfix branches
gitlab_create_hotfix(project_id: "group/project", name: "fix-login")
gitlab_finish_hotfix(project_id: "group/project", name: "fix-login")
```

## Step 4: Use CLI

```bash
# List projects
gitlab-cli list-projects --env .env

# List MRs
gitlab-cli list-mrs --project-id group/project --state opened --env .env

# Create MR
gitlab-cli create-mr --project-id group/project --title "Feature" --source feature-x --target main --env .env

# Accept MR
gitlab-cli accept-mr --project-id group/project --mr-iid 42 --env .env

# List pipelines
gitlab-cli list-pipelines --project-id group/project --env .env

# Trigger pipeline
gitlab-cli trigger-pipeline --project-id group/project --ref main --env .env

# Retry job
gitlab-cli retry-job --project-id group/project --job-id 200 --env .env

# Git flow
gitlab-cli create-feature --project-id group/project --name user-auth --env .env
gitlab-cli finish-feature --project-id group/project --name user-auth --env .env
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--env` | Path to .env file with credentials |

## Common Workflows

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
