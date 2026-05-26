# aio-tui

**The Bubbletea reference you need before the compiler tells you what you did wrong.**

Building a terminal UI with Bubbletea is not hard once you understand the Elm Architecture. The problem is that the framework's rules are strict and silent: return a new model from Update, never mutate state, never call Init on clients, never double-wrap a Cmd. Violating these rules produces compile errors that point at the wrong line, or runtime behavior that makes no sense until you understand the underlying model.

This plugin encodes those rules — and the non-obvious production patterns that follow from them — so Claude applies them correctly the first time rather than iterating through the common mistakes.

## Install

```bash
/plugin install aio-tui@aiocean-plugins
```

## Requirements

- Go (any recent version)

## The architecture

Every Bubbletea app is three functions and a state struct:

```
Model (state) → View (render) → Update (handle messages) → Model ...
```

`Init()` returns a command to run at startup. `Update()` receives messages and returns a new model plus an optional next command. `View()` is a pure function of model state — no side effects, no I/O. The skill includes a complete, runnable template that demonstrates all three correctly, including async data fetching, auto-refresh via tick, and keyboard handling.

## What the skill covers

**Architecture rules** — the four invariants that prevent the most common Bubbletea mistakes: where to initialize heavy clients, how KeyMsg type assertion works, the correct signature for functions used as `tea.Cmd`, and why Go has no `%,d` format verb.

**Layout patterns** — six composable patterns that produce consistent, professional-looking TUIs regardless of content: full-width header bar with left title and right status, footer status bar with keybinding hints, tab navigation, responsive card grid, section headers with dividers, and key-value rows with aligned labels.

**Mouse click handling** — Y coordinate calculation for click events is non-obvious because `\n\n` creates exactly one empty line (not two), and `lipgloss.RoundedBorder()` boxes occupy three lines (top border, content, bottom border). The skill documents the counting method and includes a debug technique for verifying coordinates during development.

**Color system** — a consistent seven-color palette for purple titles, gray labels, green/yellow/red status indicators, and blue highlights that works across common terminal themes.

**Production patterns** — column alignment with Unicode and emoji (using `lipgloss.Width` instead of `len`), parallel data fetching with a semaphore, filter and search mode, scroll and pagination, delta tracking for showing changes since last refresh, and error banners that preserve cached data rather than blanking the screen.

## The gotchas section

The skill contains a dedicated section of named, explained mistakes with working and broken code side by side. These are not hypothetical — each one corresponds to a real Bubbletea pitfall that produces misleading errors:

- Client initialization in `main()`, not `Init()`
- `tea.KeyMsg` vs `tea.Msg` type assertion
- `func() tea.Msg` vs `func() tea.Cmd` — the double-wrapping trap
- Integer comma formatting (Go has none built in)
- Mouse Y offset calculation and the `\n\n` = one empty line rule
- Variable shadowing against package names

## Trigger phrases

> "build a TUI", "Bubbletea", "terminal UI", "lipgloss", "Elm architecture", "Go terminal app", "interactive CLI", "charmbracelet", "TUI dashboard"
