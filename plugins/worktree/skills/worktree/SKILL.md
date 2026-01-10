---
name: worktree
description: Manage git worktrees for parallel development. Create worktrees, sync commits bidirectionally, preview with spotlight, merge branches, and cleanup. Use when user wants to work on multiple features simultaneously.
triggers:
  - worktree
  - create worktree
  - new worktree
  - spotlight
  - sync changes
  - sync commits
  - merge worktree
  - parallel development
---

# Git Worktree Management

You help users manage git worktrees for parallel development workflows.

## Available Scripts

All scripts are in `~/.claude/skills/worktree/`:

| Script                         | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `worktree-create.sh`           | Create new worktree with branch            |
| `worktree-list.sh`             | List all worktrees and their status        |
| `worktree-sync.sh`             | Bidirectional commit sync (push/pull/both) |
| `worktree-spotlight.sh`        | Live file sync for hot reload (temporary)  |
| `worktree-spotlight-status.sh` | Check if spotlight is running              |
| `worktree-merge.sh`            | Merge worktree branch to/from parent       |
| `worktree-remove.sh`           | Remove worktree and delete branch          |
| `worktree-cleanup.sh`          | Emergency cleanup after crash              |

## Workflow

### 1. Create Worktree

```bash
~/.claude/skills/worktree/worktree-create.sh <name> [source_ref]

# Examples:
worktree-create.sh feature-login          # from HEAD
worktree-create.sh hotfix-bug main        # from main branch
worktree-create.sh experiment abc123      # from specific commit

# Creates:
#   Folder: {repo}--wtr-{name}  (e.g., myrepo--wtr-feature-login)
#   Branch: wtr-{name}          (e.g., wtr-feature-login)
```

### 2. Sync (Bidirectional Commit Sync)

Sync commits between worktree and parent branch.

```bash
# From within worktree directory
~/.claude/skills/worktree/worktree-sync.sh [direction]

# direction: "push" | "pull" | "both" (default: both)
```

**Directions:**

- `pull`: Rebase parent commits into worktree (get latest from main)
- `push`: Cherry-pick worktree commits to parent (send your work to main)
- `both`: Pull first, then push (full sync)

**Example workflow:**

```bash
# In worktree: make changes, commit
git add . && git commit -m "feat: new feature"

# Sync commits to parent
worktree-sync.sh push

# Or get latest from parent
worktree-sync.sh pull

# Or do both
worktree-sync.sh
```

### 3. Spotlight (Temporary File Sync)

Preview worktree changes in main repo with hot reload. One-way sync, temporary.

```bash
# Run in background from MAIN repo
~/.claude/skills/worktree/worktree-spotlight.sh <worktree_path> . [excludes...]

# Example:
worktree-spotlight.sh ../myrepo--wtr-feature . node_modules dist .env
```

**How it works:**

- Watches worktree for file changes
- Copies changed files to main repo (for hot reload preview)
- On exit: main repo restored to clean state
- **Does NOT commit anything** - purely temporary

**Important:**

- Run with `run_in_background: true`
- Main repo must be clean before starting

**To stop:** Ctrl+C or `kill <PID>`. Cleanup is automatic.

### 4. Merge

```bash
# From within the worktree directory
~/.claude/skills/worktree/worktree-merge.sh [direction]

# direction: "to-parent" (default) or "from-parent"
```

### 5. Remove Worktree

```bash
~/.claude/skills/worktree/worktree-remove.sh <path_or_name>

# Examples:
worktree-remove.sh ../myrepo--wtr-feature  # by path
worktree-remove.sh feature                 # by name (auto-resolves path)
```

## Common Scenarios

### "I want to work on a feature and sync changes with main"

1. Create worktree: `worktree-create.sh feature-x`
2. Work in worktree, commit as usual
3. Sync commits: `worktree-sync.sh` (pulls latest from main, pushes your commits)
4. When done: `worktree-remove.sh feature-x`

### "I want hot reload preview while working in worktree"

1. Ensure main repo is clean
2. Run spotlight: `worktree-spotlight.sh <worktree> . node_modules`
3. Edit in worktree → changes appear in main for hot reload
4. Stop spotlight → main restored clean
5. Commit in worktree, then sync: `worktree-sync.sh push`

### "I need to get latest changes from main into my worktree"

```bash
worktree-sync.sh pull
```

### "I want to send my worktree commits to main"

```bash
worktree-sync.sh push
```

## Error Recovery

### "Spotlight crashed"

```bash
worktree-cleanup.sh .
```

### "Sync has conflicts"

Script will stop and show instructions. Resolve conflicts, then:

```bash
git rebase --continue   # for pull conflicts
git cherry-pick --continue  # for push conflicts
```

## Key Points

- **Naming convention:** `wtr-` prefix for easy identification
  - Folder: `{repo}--wtr-{name}` (e.g., `myrepo--wtr-feature`)
  - Branch: `wtr-{name}` (e.g., `wtr-feature`)
- **Sync = commit-based:** Actual git operations (cherry-pick, rebase)
- **Spotlight = file-based:** Temporary file copying for preview, no commits
- **Sync is bidirectional:** Push your commits to parent, pull parent commits to you
- **Spotlight is one-way:** Worktree → main only, restored on exit
- **Always commit before sync:** Sync works with commits, not uncommitted changes
- **Spotlight fallback:** Uses polling if fswatch not installed (`brew install fswatch` for better perf)
- **Always clean before spotlight:** Main repo must have no uncommitted changes
- **Graceful shutdown:** Ctrl+C, kill, or terminal close all trigger cleanup + final sync
- **PID tracking:** Spotlight writes PID file to prevent double-run
