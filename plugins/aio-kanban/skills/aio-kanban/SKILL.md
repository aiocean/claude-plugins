---
name: aio-kanban
description: |
  Markdown-based kanban board for AI agent task management. Board is a pure index
  (`.kanban/board.md`), every task lives in its own file (`.kanban/tasks/T-NNN-slug.md`).
  Use to init the board, add tasks, move them across Backlog/Todo/Doing/Done/Blocked,
  or archive completed work.
when_to_use: kanban, board, tasks, backlog, show board, what's next, task status, add task, init kanban, sprint, todo list, track progress, move task, prioritize, plan work, archive, show tasks, current tasks, prioritize tasks, archive done
effort: low
argument-hint: "init | status | add <title> | archive"
---

!`bash "${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban/scripts/kanban-status.sh" 2>/dev/null`

# Kanban Protocol (v3 — index + per-task files)

**Board** is a flat index at `.kanban/board.md`. Each line points to a task file.
**Tasks** live at `.kanban/tasks/T-NNN-slug.md` with full body (description, criteria, notes).

Follow this protocol exactly. Do NOT adapt or invent your own format.

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

Then inject the kanban guide into CLAUDE.md:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban/scripts/kanban-inject.sh"
```

---

## Formats — MUST use verbatim

### Board line (one per task)

```
- [T-NNN](tasks/T-NNN-slug.md) Title — priority/effort
```

Example:
```
- [T-052](tasks/T-052-rate-limit.md) Rate limit per endpoint — high/S
```

### Task file (`.kanban/tasks/T-NNN-slug.md`)

```markdown
# T-NNN: Title
> One-line description

- **priority**: critical | high | medium | low
- **effort**: XS | S | M | L

## Criteria
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

## Notes
(free-form section — design sketches, links, discussion)
```

Optional fields (add below `- **effort**`):
- `- **depends**: T-NNN`
- `- **branch**: feat/branch-name`
- `- **completed**: YYYY-MM-DD` (added when moved to Done)
- `- **blocked-by**: reason` (added when moved to Blocked)

**ID rule**: `T-NNN`, zero-padded, monotonic. NEVER reuse.
**Slug rule**: kebab-case from title, lowercase, alphanumeric+hyphen only, max 40 chars.

---

## Workflow Rules

1. **Add a task**:
   - Pick next ID: highest existing T-NNN + 1.
   - Generate slug from title (kebab-case, ≤40 chars).
   - Create file `.kanban/tasks/T-NNN-slug.md` with format above.
   - Insert board line under **## Backlog** in `.kanban/board.md`.
2. **Refine**: move the board line to **## Todo** when criteria are defined.
3. **Start**: move the board line to **## Doing**, add `- **branch**: ...` to the task file. NEVER exceed 2 in Doing.
4. **Complete**: ALL criteria checkboxes checked → move board line to **## Done**, add `- **completed**: YYYY-MM-DD` to task file.
5. **Block**: move to **## Blocked**, add `- **blocked-by**: ...` to task file. Review daily.
6. **Archive**: monthly, cut Done lines AND their task files to `.kanban/archive/YYYY-MM/` (board lines into `archive/YYYY-MM/board.md`, task files into `archive/YYYY-MM/tasks/`).
7. **Update timestamp**: every board write updates `<!-- Updated: YYYY-MM-DD -->`.

---

## Why index + per-task files

A flat board grows unbounded — task notes, design sketches, discussion all pile into one file. The index split keeps the board scannable (one line per task) while letting each task grow freely in its own file. Sub-agents and the `aio-kanban-monitor` skill rely on this split.

---

## Session Protocol

- **Start**: Read `.kanban/board.md`. For tasks in Doing, open their task files. Check Blocked.
- **End**: Update `.kanban/board.md` — move completed task lines, note blockers, update `<!-- Updated: -->` timestamp.

---

## Companion: auto-dispatch

The `aio-kanban-monitor` skill watches `.kanban/board.md` and auto-spawns a sub-agent for any task in a chosen column whose content matches a free-text goal. See its SKILL.md for details.

---

## Companion: `aiokan` terminal UI (optional)

This plugin ships a Go TUI at `${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban/tui/` so a human can watch and steer the same board beside the agent — vim keys + mouse, in any terminal pane.

**Two panes**: the left lists every task grouped by status (Backlog → Blocked); the right renders the selected task's markdown body live (glamour). It reads and writes the **exact** `.kanban/` format above (board lines relocated verbatim, Done stamps `completed`, Blocked stamps `blocked-by`, timestamp refreshed), with atomic writes and a staleness guard so it never clobbers an edit the agent makes while it is open.

Install it globally once:

```bash
cd "${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban/tui" && go install .
```

Then run `aiokan` from any repo with a `.kanban/board.md`. Keys: `j/k` select · `shift+↑/↓` move status · `tab` focus preview · `d` delete (confirm modal, removes card + file) · `r` reload · `q` quit; mouse click selects, wheel scrolls the focused pane. Full docs in that folder's `README.md`. Requires Go 1.26+; the board protocol works fully without it.
