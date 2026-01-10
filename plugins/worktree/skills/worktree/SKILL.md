---
name: worktree
description: Manage git worktrees for parallel development. Create worktrees, sync changes (spotlight), merge branches, and cleanup. Use when user wants to work on multiple features simultaneously or preview changes in main repo.
triggers:
  - worktree
  - create worktree
  - new worktree
  - spotlight
  - sync changes
  - merge worktree
  - parallel development
---

# Git Worktree Management

You help users manage git worktrees for parallel development workflows.

## Available Scripts

All scripts are in `~/.claude/skills/worktree/`:

| Script                         | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `worktree-create.sh`           | Create new worktree with branch           |
| `worktree-list.sh`             | List all worktrees and their status       |
| `worktree-spotlight.sh`        | Bidirectional live sync (worktree ↔ main) |
| `worktree-spotlight-status.sh` | Check if spotlight is running             |
| `worktree-merge.sh`            | Merge worktree branch to/from parent      |
| `worktree-remove.sh`           | Remove worktree and delete branch         |
| `worktree-cleanup.sh`          | Emergency cleanup after crash             |

## Workflow

### 1. Create Worktree

```bash
# From main repo
~/.claude/skills/worktree/worktree-create.sh <name> [source_ref]

# Examples:
worktree-create.sh feature-login          # from HEAD
worktree-create.sh hotfix-bug main        # from main branch
worktree-create.sh experiment abc123      # from specific commit

# Creates:
#   Folder: {repo}--wtr-{name}  (e.g., myrepo--wtr-feature-login)
#   Branch: wtr-{name}          (e.g., wtr-feature-login)
```

**Output:** Path to new worktree. User should `cd` to that path in a new terminal.

### 2. Spotlight (Bidirectional Live Sync)

Preview worktree changes in main repo with hot reload. Edits in main sync back to worktree.

```bash
# Run in background from MAIN repo
~/.claude/skills/worktree/worktree-spotlight.sh <worktree_path> . [excludes...]

# Example:
worktree-spotlight.sh ../myrepo--wtr-feature . node_modules dist .env
```

**How it works:**

- **worktree → main:** Changes in worktree sync to main for hot reload preview
- **main → worktree:** Edits made in main (e.g., via IDE) sync back to worktree
- **On exit:** Main repo restored clean, worktree keeps ALL changes (both directions)

**Important:**

- Run with `run_in_background: true`
- Main repo must be clean before starting
- Loop prevention: identical files and rapid re-syncs are skipped

**To stop:** Ctrl+C or `kill <PID>`. Cleanup is automatic.

### 3. Merge

```bash
# From within the worktree directory
~/.claude/skills/worktree/worktree-merge.sh [direction]

# direction: "to-parent" (default) or "from-parent"
```

- `to-parent`: Merge current branch into parent branch
- `from-parent`: Pull parent branch changes into current

**Conflict handling:** Script aborts merge on conflict. User/Claude must resolve manually.

### 4. Remove Worktree

```bash
# From main repo
~/.claude/skills/worktree/worktree-remove.sh <path_or_name>

# Examples:
worktree-remove.sh ../myrepo--wtr-feature  # by path
worktree-remove.sh feature                 # by name (auto-resolves path)
```

Removes worktree directory and deletes the branch.

## Common Scenarios

### "I want to work on a new feature without affecting main"

1. Create worktree: `worktree-create.sh feature-x`
2. Tell user the path to open in new terminal
3. User works in worktree, commits normally

### "I want to see my worktree changes with hot reload in main"

1. Ensure main repo is clean (commit/stash changes)
2. Run spotlight in background: `worktree-spotlight.sh <worktree> . node_modules`
3. Changes sync bidirectionally:
   - Worktree edits appear in main (hot reload works)
   - Main edits sync back to worktree (nothing lost)
4. When done, kill spotlight. Main restored clean, worktree has all changes.

### "I'm done with this feature, merge it back"

1. From worktree: `worktree-merge.sh to-parent`
2. If successful, remove worktree: `worktree-remove.sh <name>`

### "I need parent's latest changes in my worktree"

1. From worktree: `worktree-merge.sh from-parent`

## Error Recovery

### "Spotlight crashed / terminal closed unexpectedly"

Main repo may be left dirty with synced files. Fix:

```bash
# Check status first
worktree-spotlight-status.sh .

# If stale or dirty, run cleanup
worktree-cleanup.sh .
```

### "Main repo says 'has uncommitted changes' but I didn't change anything"

Leftover from previous spotlight crash:

```bash
worktree-cleanup.sh .
```

### "Spotlight says already running but it's not"

Stale PID file. Script auto-cleans this, but if not:

```bash
rm /tmp/spotlight-*.pid
worktree-cleanup.sh .
```

## Key Points

- **Naming convention:** `wtr-` prefix for easy identification
  - Folder: `{repo}--wtr-{name}` (e.g., `myrepo--wtr-feature`)
  - Branch: `wtr-{name}` (e.g., `wtr-feature`)
- **Bidirectional sync:** Spotlight syncs worktree ↔ main in both directions
- **No work lost:** On exit, main is restored clean but worktree keeps all changes from both sides
- **Loop prevention:** Identical files skipped, rapid re-syncs debounced
- **Spotlight fallback:** Uses polling if fswatch not installed (`brew install fswatch` for better perf)
- **Always clean before spotlight:** Main repo must have no uncommitted changes
- **Graceful shutdown:** Ctrl+C, kill, or terminal close all trigger cleanup + final sync
- **PID tracking:** Spotlight writes PID file to prevent double-run
- **Merge handles conflicts gracefully:** Aborts and reports, doesn't leave mess
