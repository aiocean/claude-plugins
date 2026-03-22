---
name: aio-worktree
description: Manage git worktrees for parallel development workflows — create, sync, and spotlight preview. Triggers: "create worktree", "sync worktree", "manage worktrees", "parallel development", worktree.
---

# Git Worktree Management

Manages git worktrees for parallel development workflows.

## Environment

- git: !`which git 2>/dev/null || echo "NOT INSTALLED"`
- Scripts: !`ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-worktree/*/skills/aio-worktree 2>/dev/null | sort -V | tail -1 || echo "NOT FOUND"`

Set `WT` to the Scripts path shown above. Then call scripts as `$WT/script-name`.

## Available Scripts

| Script                         | Purpose                              |
| ------------------------------ | ------------------------------------ |
| `worktree-create.sh`           | Create new worktree with branch      |
| `worktree-list.sh`             | List all worktrees and their status  |
| `worktree-sync.sh`             | Sync worktree ↔ main (rebase + ff)   |
| `worktree-spotlight.sh`        | Live file sync for hot reload        |
| `worktree-spotlight-status.sh` | Check if spotlight is running        |
| `worktree-merge.sh`            | Merge worktree branch to/from parent |
| `worktree-remove.sh`           | Remove worktree and delete branch    |
| `worktree-cleanup.sh`          | Emergency cleanup after crash        |

## Workflow

### 1. Create Worktree

```bash
$WT/worktree-create.sh <name> [source_ref]

# Examples:
worktree-create.sh feature-login          # from HEAD
worktree-create.sh hotfix-bug main        # from main branch
worktree-create.sh experiment abc123      # from specific commit

# Creates:
#   Folder: {repo}--wtr-{name}  (e.g., myrepo--wtr-feature-login)
#   Branch: wtr-{name}          (e.g., wtr-feature-login)
```

### 2. Sync (Rebase + Fast-Forward)

Sync worktree with parent branch. Both end up at the same commit with same hash.

```bash
# From within worktree directory
$WT/worktree-sync.sh
```

**How it works:**

1. **Rebase** worktree onto parent (get latest from main, put your commits on top)
2. **Fast-forward** parent to worktree (now both identical)

**Result:** Both branches at same commit, same hash. No duplicates.

**Example workflow:**

```bash
# In worktree: make changes, commit
git add . && git commit -m "feat: new feature"

# Sync with main
worktree-sync.sh

# Output:
# Syncing: wtr-feature ↔ main
# Status: worktree +2 commits, parent +1 commits
# === Step 1: Rebase onto main ===
# === Step 2: Fast-forward main ===
# Sync complete!
# Both branches at: abc1234
```

### 3. Spotlight (Temporary File Sync)

Preview worktree changes in main repo with hot reload. One-way sync, temporary.

```bash
# Run in background from MAIN repo
$WT/worktree-spotlight.sh <worktree_path> . [excludes...]

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

### 4. Remove Worktree

```bash
$WT/worktree-remove.sh <path_or_name>

# Examples:
worktree-remove.sh ../myrepo--wtr-feature  # by path
worktree-remove.sh feature                 # by name (auto-resolves path)
```

## Common Scenarios

### "Multiple AI agents working in parallel"

```bash
# Agent A creates worktree
worktree-create.sh agent-a-task

# Agent B creates worktree
worktree-create.sh agent-b-task

# Both work and commit independently...

# Agent A syncs first
cd ../repo--wtr-agent-a-task
worktree-sync.sh
# main now has Agent A's commits

# Agent B syncs (gets A's work + pushes B's work)
cd ../repo--wtr-agent-b-task
worktree-sync.sh
# main now has both A and B's commits
# Agent B's worktree also has A's commits

# Agent A syncs again to get B's work
cd ../repo--wtr-agent-a-task
worktree-sync.sh
# All three (main, worktree-a, worktree-b) now identical
```

### "I want hot reload preview while working in worktree"

1. Ensure main repo is clean
2. Run spotlight: `worktree-spotlight.sh <worktree> . node_modules`
3. Edit in worktree → changes appear in main for hot reload
4. Stop spotlight → main restored clean
5. Commit in worktree, then sync: `worktree-sync.sh`

### "I want to work on a feature and sync with main"

1. Create worktree: `worktree-create.sh feature-x`
2. Work in worktree, commit as usual
3. Sync anytime: `worktree-sync.sh`
4. When done: `worktree-remove.sh feature-x`

## Error Recovery

### "Spotlight crashed"

```bash
worktree-cleanup.sh .
```

### "Sync has conflicts"

Script will stop at rebase conflict. Resolve conflicts, then:

```bash
git rebase --continue
# Then run sync again
worktree-sync.sh
```

## Worktrees + Agent Teams

When using **Agent Teams** (experimental, requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), combine worktrees with agent teams for maximum parallel safety.

**Pattern: Each teammate gets their own worktree**

```bash
# Lead creates worktrees for each teammate
worktree-create.sh teammate-frontend
worktree-create.sh teammate-backend
worktree-create.sh teammate-tests

# Each teammate works in their own worktree (no file conflicts)
# Teammate messages via SendMessage when ready to sync
# Lead coordinates sync order to avoid conflicts
```

**Why:** Agent teams let multiple Claude instances work in parallel. Worktrees give each instance an isolated filesystem. Combined = true parallel development without merge conflicts.

**Sync strategy with teams:**
1. Teammates work and commit independently in their worktrees
2. When a teammate finishes, they message the lead
3. Lead runs `worktree-sync.sh` in order (first-done-first-synced)
4. Later teammates get earlier teammates' work when they sync
5. All worktrees converge to the same history

**When NOT to combine:** If tasks are small and touch different files anyway, agent teams alone (without worktrees) work fine. Use worktrees when there's ANY risk of file overlap.

## Key Points

- **Naming convention:** `wtr-` prefix for easy identification
  - Folder: `{repo}--wtr-{name}` (e.g., `myrepo--wtr-feature`)
  - Branch: `wtr-{name}` (e.g., `wtr-feature`)
- **Sync keeps same hash:** Rebase + fast-forward = identical commits
- **No duplicate commits:** Unlike cherry-pick, sync keeps history clean
- **Parallel-friendly:** Multiple worktrees can sync independently
- **Spotlight = file-based:** Temporary file copying for preview, no commits
- **Always commit before sync:** Sync works with commits, not uncommitted changes
- **Spotlight fallback:** Uses polling if fswatch not installed (`brew install fswatch`)
