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

# Kanban Protocol

Board location: `.kanban/board.md`. Follow this protocol exactly. Do NOT adapt or invent your own format.

---

## Init

If auto-status above shows "not initialized":

```bash
mkdir -p .kanban/archive .kanban/tasks
cat > .kanban/board.md << 'BOARD'
# Kanban Board
<!-- Updated: YYYY-MM-DD -->

## Backlog

## Todo

## Doing

## Done

## Blocked
BOARD
```

Then inject kanban guide into CLAUDE.md:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban/scripts/kanban-inject.sh"
```

---

## Task Format — MUST use verbatim

```markdown
### T-NNN: Title
> One-line description

- **priority**: critical | high | medium | low
- **effort**: XS | S | M | L

#### Criteria
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```

Optional fields (add below effort):
- `- **depends**: T-NNN`
- `- **branch**: feat/branch-name`
- `- **completed**: YYYY-MM-DD` (when moved to Done)
- `- **blocked-by**: reason` (when moved to Blocked)

**ID rule**: `T-NNN`, zero-padded, monotonic. NEVER reuse.

---

## Workflow Rules

1. **Add**: new `### T-NNN` under **Backlog**. MUST include priority + effort.
2. **Refine**: move to **Todo** when criteria are defined.
3. **Start**: move to **Doing**, set branch. NEVER exceed 2 in Doing.
4. **Complete**: ALL criteria checkboxes checked → move to **Done**, add `completed` date.
5. **Block**: move to **Blocked**, add `blocked-by`. Review daily.
6. **Archive**: monthly, cut Done tasks to `.kanban/archive/YYYY-MM.md`.
7. **Next ID**: find highest T-NNN in board, increment by 1.
8. **XL tasks**: create detail file at `.kanban/tasks/T-NNN-slug.md`, link from board title.

---

## Session Protocol

- **Start**: Read `.kanban/board.md`. Resume Doing tasks. Check Blocked.
- **End**: Update `.kanban/board.md` — move completed, note blockers, update `<!-- Updated: -->` timestamp.
