# aiokan — terminal kanban for the aio-kanban board

A small Go + Bubbletea v2 TUI that reads the same `.kanban/board.md` + per-task
files the `aio-kanban` skill writes, and lets a human glance at and steer the
board beside their coding agent — all with vim keys or the mouse.

**Two panes:** the left lists every task grouped by status (Backlog → Blocked);
the right renders the selected task's markdown body live with glamour. Move the
selection and the preview follows.

It is a **read/write companion**, not a separate data store: every change is
written straight back to `.kanban/` in the exact markdown the skill protocol
defines, so the agent and the human share one source of truth.

## Install (global)

```bash
cd "${CLAUDE_PLUGIN_ROOT}/skills/aio-kanban/tui"   # or wherever this plugin is installed
go install .
```

`go install .` builds `aiokan` into `$(go env GOBIN)` (or `~/go/bin`). Make sure
that directory is on your `PATH`, then run `aiokan` from any project that has a
`.kanban/board.md`.

No Go toolchain? Build a standalone binary and copy it onto your `PATH`:

```bash
go build -o aiokan .
sudo mv aiokan /usr/local/bin/
```

## Use

```bash
aiokan            # finds .kanban/board.md in the current dir or a parent (like git)
aiokan ./service  # start the search from ./service
aiokan --help
```

| Action | Keys | Mouse |
|--------|------|-------|
| Select a task (across status groups) | `j` / `k` (`↑` / `↓`) | left-click a task · wheel over left pane |
| Jump top / bottom | `g` / `G` | — |
| **Change status** (move task toward Backlog / Blocked) | `shift+↑` / `shift+↓` | — |
| Focus the preview / list | `tab` | click a pane |
| Scroll the preview | `j` / `k`, `ctrl+d` / `ctrl+u` (when preview focused) | wheel over right pane |
| **Delete a task** (confirm modal; removes the card and its task file) | `d` then `y` | — |
| Reload from disk | `r` | — |
| Quit | `q` / `ctrl+c` | — |

The right pane always previews the selected task, so there is no separate
"open" step — moving the selection re-renders it.

Moving a card into **Done** stamps `- **completed**: YYYY-MM-DD` into its task
file; moving into **Blocked** prompts for a reason and stamps `- **blocked-by**:`.
Every write refreshes the board's `<!-- Updated: -->` timestamp.

## Safety

- **Atomic writes** — the board is written to a temp file and renamed, so a
  crash never truncates `board.md`.
- **Staleness guard** — if an agent edits `board.md` while the TUI is open, a
  conflicting write is refused and the board reloads instead of clobbering the
  agent's edit. The TUI also polls once a second and reloads on external change.

## Develop

```bash
go test ./...   # headless: parsing, board write-back, move/delete/block flows, render
go vet ./...
```

Build: Go 1.26+, `charm.land/bubbletea/v2` + `charm.land/lipgloss/v2` +
`glamour/v2` (markdown preview), pinned in `go.mod`. Source layout: `kanban.go`
is the pure parse/serialize core, `model.go` the Bubbletea state machine (flat
selection + focus + preview cache), `view.go` the two-pane renderer + glamour,
`theme.go` the palette, `keys.go` the help text.
