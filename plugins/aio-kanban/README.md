::install-command
/plugin install aio-kanban@aiocean-plugins
::

# aio-kanban

**A Markdown kanban board that lives in your repository and survives every session — now with auto-dispatch.**

Most AI agents lose track of what they were doing between sessions. They restart with no memory of what is in progress, what is blocked, or what was finished last week. This plugin solves that with a single, version-controlled index file — `.kanban/board.md` — plus per-task files at `.kanban/tasks/T-NNN-slug.md` that hold the full body of each task.

The board is plain Markdown. You can read and edit it without Claude. Git tracks its history. No external tools, no database, no sync service.

> **v3.0.0 is a breaking change.** Tasks no longer live inline in `board.md`; each task is its own file. v2 boards will not work with the new tooling — back up `.kanban/` and re-init.

## Install

```bash
/plugin install aio-kanban@aiocean-plugins
```

## How it works

The board (`.kanban/board.md`) has five columns — Backlog, Todo, Doing, Done, Blocked — and is a pure **index**: one line per task pointing at the task's own file.

```markdown
# Kanban Board
<!-- Updated: 2026-05-26 -->

## Doing
- [T-042](tasks/T-042-add-auth.md) Add JWT authentication — high/M

## Todo
- [T-052](tasks/T-052-rate-limit.md) Rate limit per endpoint — high/S
```

Each task file (`.kanban/tasks/T-NNN-slug.md`) holds the full body — description, acceptance criteria, optional dependencies, notes, design sketches:

```markdown
# T-052: Rate limit per endpoint
> Per-IP rate limiting on /api/* with admin bypass

- **priority**: high
- **effort**: S

## Criteria
- [ ] /api/* rate-limited at 100/min
- [ ] 429 response includes retry-after header
- [ ] Tests cover limit + bypass

## Notes
…
```

IDs are monotonic and never reused. The board enforces a WIP limit of two tasks in Doing at any time. The board stays short and scannable; each task grows freely in its own file.

## Session protocol

Every session opens with reading the board. Every session ends with writing it back — moving completed task lines, adding blockers, updating the timestamp. This discipline is what makes the board useful: it reflects actual state, not aspirational state.

At the start of a session, Claude will:
- Resume any Doing tasks (opening their task files)
- Check Blocked tasks for resolved blockers
- Pull the next Todo into Doing if capacity allows

## Auto-dispatch (companion skill `aio-kanban-monitor`)

Once your board is populated, the bundled **`aio-kanban-monitor`** skill turns one Claude session into a headless executor:

```
/aio-kanban-monitor Todo "ship v2 release"
```

This watches `.kanban/board.md` via `fswatch`. For every task in the Todo column whose content matches the free-text goal `"ship v2 release"` (judged inline by the monitor), it spawns a sub-agent with a fully self-contained prompt — task body, mission, kanban protocol, lifecycle steps. The sub-agent owns the task's move through Doing → Done.

The typical two-session workflow:
- **Session A** runs `/aio-kanban-monitor` and quietly executes Todo tasks as they appear.
- **Session B** is you, triaging — reading GitHub issues, Slack threads, etc. — and writing new task files into Todo.

Both sessions coordinate via `.kanban/board.md` alone. No locks, no queue, no extra service.

`fswatch` is required for the monitor: `brew install fswatch` (or `apt-get install fswatch` / `pacman -S fswatch`).

## Archive

Completed tasks accumulate in Done until you run an archive operation, which moves both their board lines and their task files to `.kanban/archive/YYYY-MM/`. The board stays short; the history is preserved.

## Trigger phrases

> "kanban", "show board", "what's next", "add task", "init kanban", "task status", "move task", "archive done", "track progress", "prioritize", "monitor kanban", "watch board", "auto dispatch tasks", "kanban worker"
