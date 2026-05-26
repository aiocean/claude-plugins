::install-command
/plugin install aio-devops@aiocean-plugins
::

# aio-devops

**GitHub, GitLab, and git worktree workflows — unified in one plugin.**

Developer workflows routinely span three surfaces: a remote repository host (GitHub or GitLab), a local git history, and multiple in-progress branches. Switching between them means switching tools: `gh`, `glab`, raw `git`, and whatever CI dashboard you have open. This plugin collapses those into Claude Code so you can describe what you need and have it done.

The three skills are independently useful but designed to compose: create a worktree for a feature branch, push a PR or MR from it, then trigger or observe the CI pipeline — all without leaving the session.

## Installation

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-devops@aiocean-plugins
```

## Skills

### aio-github — GitHub operations via MCP

Read and manage GitHub repositories, pull requests, issues, releases, and files. The skill uses `github-mcp` (auto-installs if missing) rather than the official `gh` CLI — these are different tools with different APIs.

> "list repos", "create PR", "review PR", "get issue", "comment on issue", "merge", "branch", "release", "github"

What it covers:

| Area | Operations |
|---|---|
| Pull requests | List, get, create, comment, approve |
| Issues | List, get, comment, close, reopen |
| Repositories | List, get metadata |
| Files | Get file content at any ref |

Setup requires a personal access token from `github.com/settings/tokens` added to `.mcp.json`. The skill walks through this if `github-mcp` is not yet configured.

A CLI fallback (`github-cli`) is available for environments where MCP is not configured.

---

### aio-gitlab — GitLab operations via MCP

The GitLab counterpart to aio-github. Manages merge requests, pipelines, CI jobs, repository files, commits, and branch protection. Also includes Git Flow support: create and finish feature branches, releases, and hotfixes as atomic MCP calls.

> "create MR", "accept MR", "trigger pipeline", "retry job", "gitlab", "merge request", "CI/CD", "pipeline status"

What it covers beyond basic MR management:

| Area | Operations |
|---|---|
| Pipelines | List, get, trigger, cancel |
| Jobs | List, get, cancel, retry |
| Branch protection | Set push/merge access levels |
| Git Flow | create-feature, finish-feature, create-release, finish-release, create-hotfix, finish-hotfix |

Setup requires `GITLAB_TOKEN` and `GITLAB_URL` in `.mcp.json`. Self-hosted GitLab instances are supported via the `GITLAB_URL` variable.

---

### aio-worktree — Git worktrees for parallel development

Git worktrees let you check out multiple branches simultaneously into separate directories. This is especially valuable when running parallel AI agents — each agent gets its own filesystem, eliminating file conflicts during concurrent work.

> "create worktree", "sync worktree", "parallel development", "worktree", "branch isolation", "spotlight preview", "worktree merge"

The skill provides eight scripts:

| Script | What it does |
|---|---|
| `worktree-create.sh` | Create a new worktree with a `wtr-` prefixed branch |
| `worktree-list.sh` | List all worktrees and their status |
| `worktree-sync.sh` | Rebase worktree onto parent, then fast-forward parent (same hash, no duplicates) |
| `worktree-spotlight.sh` | One-way file sync to main repo for hot-reload preview |
| `worktree-spotlight-status.sh` | Check if spotlight is running |
| `worktree-merge.sh` | Merge worktree branch to/from parent |
| `worktree-remove.sh` | Remove worktree and delete its branch |
| `worktree-cleanup.sh` | Emergency cleanup after a crash |

The sync mechanism uses rebase + fast-forward, not cherry-pick, so both branches end at the same commit hash with clean linear history.

**Agent team pattern:** When using Claude Code's experimental agent teams, assign each agent its own worktree at startup. Agents commit independently, message the lead when done, and the lead syncs in order. Later syncs automatically include earlier agents' work — all worktrees converge to the same history.

## Typical workflow

```
Create a worktree for the feature:
  aio-worktree → worktree-create.sh feature-auth

Work and commit in the worktree, then open a PR:
  aio-github  → github_create_pr(head: "wtr-feature-auth", base: "main")

Check CI and retry a failed job:
  aio-gitlab  → gitlab_retry_job(project_id: "org/repo", job_id: 200)

Sync and clean up when the PR merges:
  aio-worktree → worktree-sync.sh, then worktree-remove.sh feature-auth
```
