# aio-gitlab

GitLab CLI for project management, merge requests, pipelines, jobs, and git flow operations via gitlab-mcp.

## Install

```bash
/plugin install aio-gitlab@aiocean-plugins
```

## What It Does

- Create, review, and merge merge requests
- Trigger and monitor pipelines
- Retry failed jobs
- Manage branches and git flow operations
- Query project issues and milestones

## Requirements

- Go
- [gitlab-mcp](https://github.com/nguyenvanduoc/gitlab-mcp) installed and on PATH
- `GITLAB_TOKEN` environment variable set
- `GITLAB_URL` environment variable set (e.g. `https://gitlab.com`)
