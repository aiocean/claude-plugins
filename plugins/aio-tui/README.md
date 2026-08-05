::install-command
/plugin install aio-tui@aiocean-plugins
::

# aio-tui

**The Bubbletea v2 reference you need before the compiler tells you what you did wrong.**

Building a terminal UI with Bubbletea is not hard once you understand the Elm Architecture. The problem is that the framework's rules are strict and silent: return a new model from Update, never mutate state, never build heavy clients in Init, never double-wrap a Cmd. Violating these rules produces compile errors that point at the wrong line, or runtime behavior that makes no sense until you understand the underlying model.

This plugin encodes those rules — and the non-obvious production patterns that follow from them — against the **v2 API** (`charm.land/bubbletea/v2`, `charm.land/lipgloss/v2`), so Claude applies them correctly the first time rather than iterating through the common mistakes.

## Install

```bash
/plugin install aio-tui@aiocean-plugins
```

## Requirements

- Go (any recent version)

## The architecture

Every Bubbletea app is three functions and a state struct:

```
Model (state) → Update (handle messages) → Model → View (render) ...
```

`Init()` returns a command to run at startup. `Update()` receives messages and returns a new model plus an optional next command. `View()` is a pure function of model state — it returns a `tea.View` struct (v2: the frame string lives in `.Content`, and alt-screen/mouse modes are fields on that struct). The skill includes a complete, runnable v2 skeleton that demonstrates all three correctly, including async data fetching, auto-refresh via tick, and keyboard handling.

## What the skill covers

**v2 API differences** — the changes that bite: `View()` returns a `tea.View` struct (not a string); alt-screen and mouse mode are fields on that struct, not `tea.NewProgram` options; key messages are `tea.KeyPressMsg` with printable input in `.Text` and named keys via `.String()`; mouse is an interface whose concrete type is the action (`tea.MouseClickMsg`, `tea.MouseReleaseMsg`, `tea.MouseWheelMsg`, `tea.MouseMotionMsg`).

**Architecture rules** — the invariants that prevent the most common Bubbletea mistakes: where to initialize heavy clients (in `main()`, not `Init()`), how to build text input by appending `msg.Text`, the correct `func() tea.Msg` signature for Cmds, and why `tea.Batch` is the right way to fan out multiple commands.

**Restrained styling** — one accent color reused for active borders, cursor rows, focus glows, and spinners. Everything else is a small fixed set: `dim` for muted/inactive, `danger`/`warn` for destructive vs cautionary. A status-code-to-color mapping keeps this discipline even for multi-state badges.

**Layout gotchas** — `.Width(n)` is the outer width (border + padding included, not content width); floating boxes need no `Background` fill because canvas layers are opaque at the cell level; color-profile detection must happen in `main()` before `tea.NewProgram` takes over the terminal to avoid race conditions.

**Mouse hit-testing** — click location is geometry, not line-counting. The skill teaches the `layout()` reverse-mapping approach: derive a layout struct from terminal size and scroll offset, render into it, then reverse-map click coordinates through the same struct. Counting `\n` characters to find a click's row drifts the moment chrome changes and is explicitly the anti-pattern the skill warns against.

**Keymaps and mode machines** — every binding in one `key.Binding` struct, so help text can never drift from the key it describes; deliberate key-code collisions disambiguated by dispatch lane rather than by inventing new keys; and the distinction that keeps an update function flat — a *mode* is an exclusive input lane, a *sub-state* is an orthogonal flag inside one.

**Mouse beyond the click** — mouse modes (and why hover needs a different one that fires per cell crossed); no-pane zones that must return before touching state; focus-follows-click; the arm → commit → apply drag gesture that keeps a plain click distinct from a drag; wheel semantics including shift-pan and the trackpad's native horizontal wheel; and divider-drag resizing stored as a ratio so a split survives terminal resizes.

**Floating modals and command palettes** — chrome-aware sizing with a floor, compositing that needs no dim layer because canvas layers are already opaque, the status-bar handoff while a modal owns the prompt, multi-stage palettes that keep a failed submit open, and scroll-clamp parity between the renderer and its line counter.

**Testing — four layers, cheapest first** — unit-testing `Update`/`View` without a terminal; golden snapshots of `View().Content` for layout regression; `teatest/v2` (the v2-correct import path) for multi-step interaction tests; and render-to-image + agent verdict for visual assertions that string comparisons cannot make. Plus the harness that makes layer 1 cheap, the two oracles (rendered string vs. model field), frame invariants that survive redesigns, byte-identity pins, and a dogfood harness that measures keystrokes instead of asserting.

**Deep patterns reference** — for full generalized v2 code, the skill points to five reference files: `patterns.md` (async render with a gen-counter stale guard, layout geometry as a single source of truth, per-row performance caching, graceful degradation by width, horizontal scroll and soft wrap with ANSI-aware slicing), `keymap-and-modes.md`, `mouse.md`, `modals.md`, and `testing.md` — plus `gold-monitor.md` with the complete `examples/gold-monitor/` working example.

## The gotchas section

The skill contains a dedicated section of named, explained mistakes with working and broken code side by side:

- Heavy client initialization in `main()`, not `Init()`
- `tea.KeyPressMsg` with `.Text` for printable input — not the v1 `tea.KeyMsg{Runes}`
- `func() tea.Msg` vs double-wrapping a Cmd
- Mouse location via geometry, not `\n`-counting
- `MouseModeCellMotion` delivers motion only while a button is held — hover is a different mode with a real cost
- `.Width(n)` is the outer width: pass `inner + frame`, or a bordered box silently wraps its widest row
- A press is not the action — arm, commit on motion, apply on release
- Chrome rows are one constant threaded through every Y origin, never a bare `+1` at four call sites
- Color-profile detection before `tea.NewProgram` to avoid races
- `teatest/v2` import path (not the v1 path, which compiles against the wrong `tea.Model`/`View` shapes)

## Trigger phrases

> "build a TUI", "Bubbletea", "Bubbletea v2", "terminal UI", "lipgloss", "lipgloss v2", "Elm architecture", "Go terminal app", "interactive CLI", "charmbracelet", "charm.land", "TUI dashboard", "two-pane layout", "terminal mouse", "mouse drag", "resize sidebar", "draggable divider", "keybindings", "command palette", "modal overlay", "responsive TUI", "horizontal scroll", "async render", "TUI testing", "visual verdict"
