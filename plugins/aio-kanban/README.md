::install-command
/plugin install aio-kanban@aiocean-plugins
::

# aio-kanban

**A Markdown kanban board that lives in your repository and survives every session.**

Most AI agents lose track of what they were doing between sessions. They restart with no memory of what is in progress, what is blocked, or what was finished last week. This plugin solves that with a single, version-controlled file — `.kanban/board.md` — that Claude reads at the start of every session and writes at the end.

The board is plain Markdown. You can read and edit it without Claude. Git tracks its history. No external tools, no database, no sync service.

## Install

```bash
/plugin install aio-kanban@aiocean-plugins
```

## How it works

The board lives at `.kanban/board.md` with five columns: Backlog, Todo, Doing, Done, and Blocked. Tasks follow a strict format with ID, description, priority, effort estimate, and acceptance criteria. The format is fixed by design — consistency makes every session start identically.

```markdown
### T-001: Add authentication
> Implement JWT-based login flow

- **priority**: high
- **effort**: M

#### Criteria
- [ ] Login endpoint returns token
- [ ] Token validated on protected routes
```

IDs are monotonic and never reused. The board enforces a WIP limit of two tasks in Doing at any time. When tasks grow large, a detail file at `.kanban/tasks/T-NNN-slug.md` holds the full spec while the board keeps the summary.

## Session protocol

Every session opens with reading the board. Every session ends with writing it back — moving completed tasks, adding blockers, updating the timestamp. This discipline is what makes the board useful: it reflects actual state, not aspirational state.

At the start of a session, Claude will:
- Resume any Doing tasks
- Check Blocked tasks for resolved blockers
- Pull the next Todo into Doing if capacity allows

## Archive

Completed tasks accumulate in Done until you run an archive operation, which moves them to `.kanban/archive/YYYY-MM.md`. The board stays short; the history is preserved.

## Trigger phrases

> "kanban", "show board", "what's next", "add task", "init kanban", "task status", "move task", "archive done", "track progress", "prioritize"
