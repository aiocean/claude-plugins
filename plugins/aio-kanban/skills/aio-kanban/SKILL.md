---
name: aio-kanban
description: |
  Markdown-based kanban board for AI agent task management.
  Use when: "kanban", "board", "tasks", "backlog", "show board",
  "what's next", "task status", "add task", "init kanban",
  "sprint", "todo list", "track progress", "prioritize tasks",
  "plan work", "move task", "archive done".
when_to_use: |
  kanban, board, tasks, backlog, show board, what's next, task status,
  add task, init kanban, sprint, todo list, track progress, move task,
  prioritize, plan work, archive, show tasks, current tasks
argument-hint: "init | status | add <title> | archive"
effort: medium
---

!`bash "${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban/scripts/kanban-status.sh" 2>/dev/null`

# Kanban — Markdown Task Management

Single-file kanban board (`BOARD.md`) designed for AI agents. No database, no build step — just markdown that any agent can read and write.

## Design Principles

1. **BOARD.md is the single source of truth** — one file, always in project root
2. **Tasks flow left to right**: Backlog -> Todo -> Doing -> Done
3. **WIP limit = 2** in Doing — focus over multitasking
4. **AI reads board first, updates board last** — every session

---

## Init

If the auto-status above shows "not initialized", create the board:

```bash
cat > BOARD.md << 'BOARD'
# Kanban Board

<!-- Updated: YYYY-MM-DD -->

## Backlog
<!-- Needs refinement. Not ready to start. -->

## Todo
<!-- Ready. Clear acceptance criteria. Pick from here. -->

## Doing
<!-- In progress. Max 2 tasks. -->

## Done
<!-- Completed. Archive monthly. -->

## Blocked
<!-- Waiting on external input. Review daily. -->
BOARD
```

Also create the archive directory for completed tasks:

```bash
mkdir -p .kanban/archive
```

---

## Task Format

Every task is an H3 block under a column. Minimal but parseable:

```markdown
### T-001: Implement auth middleware
> JWT-based auth for all API routes

- **priority**: high
- **effort**: M
- **depends**: T-000
- **branch**: feat/auth-middleware

#### Criteria
- [ ] Middleware intercepts all /api/* routes
- [ ] Token validation with proper error codes
- [ ] Unit tests cover expired/invalid/missing token
```

### Field Reference

| Field | Values | Required |
|-------|--------|----------|
| **priority** | `critical` / `high` / `medium` / `low` | yes |
| **effort** | `XS` (<30m) / `S` (1-2h) / `M` (half-day) / `L` (full-day) / `XL` (multi-day, break it down) | yes |
| **depends** | `T-NNN` (blocks until dependency is Done) | no |
| **branch** | git branch name, set when work starts | no |

### Task ID Rules

- Format: `T-NNN` (zero-padded, monotonic)
- Never reuse an ID — even after archiving
- To find next ID: `grep -oP 'T-\d+' BOARD.md | sort -t- -k2 -n | tail -1`

---

## Workflow

### Adding a Task

1. Add `### T-NNN: Title` block under **Backlog**
2. Fill in priority and effort at minimum
3. When acceptance criteria are clear, move to **Todo**

### Starting Work

1. Pick highest-priority from **Todo**
2. Cut-paste the entire block to **Doing**
3. Set `branch` field
4. Check WIP limit (max 2 in Doing)
5. Optionally create git worktree: `git worktree add .worktrees/T-NNN -b feat/task-name`

### Completing Work

1. Verify all criteria checkboxes are checked
2. Cut-paste block to **Done**
3. Add completion note: `- **completed**: YYYY-MM-DD`

### Blocked Tasks

1. Move to **Blocked** with reason: `- **blocked-by**: description of blocker`
2. Review daily — unblock or demote to Backlog

### Archiving

Monthly, move Done tasks to `.kanban/archive/YYYY-MM.md`:

```bash
# Extract Done section tasks, append to archive, clean from board
MONTH=$(date +%Y-%m)
awk '/^## Done/,/^## /' BOARD.md | grep -A999 "^### T-" >> ".kanban/archive/${MONTH}.md"
```

Then remove those tasks from BOARD.md Done section.

---

## Complex Tasks

When a task needs detailed planning (effort L or XL), create a detail file:

```
.kanban/
  tasks/
    T-005-payment-integration.md
  archive/
    2026-03.md
```

Reference from BOARD.md:

```markdown
### T-005: Payment integration -> [plan](.kanban/tasks/T-005-payment-integration.md)
> Stripe checkout for subscription tiers

- **priority**: high
- **effort**: XL
```

The detail file has full context: research notes, API docs, sub-tasks, decisions.

---

## Session Protocol

### At Session Start

The auto-execute script above already shows board status. Read the current Doing tasks to resume context:

```
Read BOARD.md, focus on Doing and Blocked sections.
What was I working on? Any blockers to resolve first?
```

### At Session End

Before ending, update BOARD.md:
- Move completed tasks to Done (check all criteria first)
- Note any new blockers
- Update the `<!-- Updated: -->` timestamp

### Between Sessions

BOARD.md is committed to git — full history, blame, and diff support.

---

## Auto-Context with Hooks

Add to **`.claude/settings.local.json`** for automatic board awareness:

```json
{
  "hooks": {
    "Stop": [
      {
        "hook": "prompt",
        "prompt": "Before ending: check BOARD.md. Move any completed tasks to Done (verify criteria first). Note blockers. Update the timestamp comment. If no changes needed, skip."
      }
    ]
  }
}
```

This reminds the agent to update the board before every session ends.

### Optional: CLAUDE.md Integration

Add to your project's `CLAUDE.md` for every-session awareness:

```markdown
## Task Tracking

This project uses BOARD.md as a kanban board.
- At session start: read BOARD.md, resume Doing tasks
- At session end: update BOARD.md with progress
- WIP limit: max 2 tasks in Doing
- Pick highest-priority from Todo when starting new work
```

---

## Quick Reference

| Action | How |
|--------|-----|
| Init board | `cat > BOARD.md` with template above |
| Add task | New `### T-NNN` block in Backlog |
| Start task | Move block to Doing, set branch |
| Complete | Check all criteria, move to Done |
| Block | Move to Blocked, add `blocked-by` |
| Next ID | `grep -oP 'T-\d+' BOARD.md \| sort -t- -k2 -n \| tail -1` |
| Stats | `!bash "${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban/scripts/kanban-status.sh"` |
| Archive | Move Done tasks to `.kanban/archive/YYYY-MM.md` |

---

## Anti-Patterns

- **No board, no work** — always init before starting a project
- **XL tasks** — break them down. If effort is XL, it's actually 3-5 smaller tasks
- **WIP > 2** — finish something before starting something new
- **Stale Doing** — if a task sits in Doing for 2+ sessions, it's blocked (move it)
- **Skipping criteria** — don't move to Done without checking every box
