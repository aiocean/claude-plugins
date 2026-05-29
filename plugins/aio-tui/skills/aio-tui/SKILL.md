---
name: aio-tui
description: |
  Build interactive terminal UIs with Go + the charmbracelet v2 stack
  (charm.land/bubbletea/v2, charm.land/lipgloss/v2) — Elm architecture,
  restrained styling, and production-grade patterns for async rendering,
  layout geometry, mouse hit-testing, and live refresh. Use when building
  a TUI, terminal UI, Bubbletea app, interactive dashboard, file explorer,
  monitor, or CLI UI in Go.
when_to_use: |
  build a TUI, create terminal UI, Bubbletea app, bubbletea v2, lipgloss v2,
  interactive dashboard, terminal app, CLI UI, Go terminal, Elm architecture,
  charmbracelet, charm.land, two-pane layout, terminal mouse, async render,
  TUI performance, TUI styling
effort: low
---

## Environment
- go: !`go version 2>/dev/null || echo "NOT INSTALLED"`

```bash
REFS="${CLAUDE_PLUGIN_ROOT}/skills/aio-tui/references"
```

# Bubbletea v2 TUI Development Guide

Build interactive terminal UIs on the charmbracelet **v2** ecosystem:
[`charm.land/bubbletea/v2`](https://github.com/charmbracelet/bubbletea) +
[`charm.land/lipgloss/v2`](https://github.com/charmbracelet/lipgloss). The v2 API
differs from v1 in load-bearing ways — every snippet here is v2-correct.

## Architecture: The Elm Architecture (TEA)

```
Model (state) → Update (handle messages) → Model → View (render) ...
```

```go
func (m model) Init() tea.Cmd                            // initial command(s)
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd)  // state transitions
func (m model) View() tea.View                           // render → tea.View struct
```

**Key rules:**
- The model is a **value** receiver. `Update` returns a **NEW** model — never mutates in place.
- `View()` is a pure function of model state — no side effects, reads `m` only.
- `Init()` returns a `tea.Cmd`, NOT a modified model — create heavy clients in `main()` and pass them in.
- Messages are the ONLY way to communicate async results back to the model.
- A `tea.Cmd` is `func() tea.Msg`. Don't double-wrap (a Cmd that returns a Cmd); use `tea.Batch(c1, c2)` to run several.

## v2 API — the differences that bite

| Concern | v2 (correct) |
|---|---|
| `View()` return | `tea.View` **struct** — frame string is in `.Content` |
| Alt-screen / mouse | **Fields on the `tea.View`**: `v.AltScreen = true`, `v.MouseMode = tea.MouseModeCellMotion` — NOT `tea.NewProgram` options |
| Keys | `tea.KeyPressMsg{Code rune, Text string}` — printable input in `.Text`, named keys via `.String()`. No `.Runes`. |
| Mouse | An **interface**: the message TYPE is the action — `tea.MouseClickMsg` / `MouseReleaseMsg` / `MouseWheelMsg` / `MouseMotionMsg`. No `.Action` field. Each has `.Mouse()` → `tea.Mouse{X, Y, Button}`. |
| Color | `lipgloss.Color("#RRGGBB")` is a `color.Color`, full truecolor. No `SetColorProfile` — downsampling happens at the output writer. |
| Background detect | `lipgloss.HasDarkBackground(os.Stdin, os.Stdout)` |
| `.Width(n)` | **OUTER** width — border + padding **included** (see Layout gotchas) |

## The canonical v2 program

The single most-copied skeleton — get every v2 difference right.

```go
package main

import (
	"fmt"
	"os"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"
)

type model struct {
	width, height int
	renderStyle   string // resolved ONCE at startup (see below)
	// ... your state ...
}

func newModel() model { return model{} }

func (m model) Init() tea.Cmd {
	// Kick off initial work. tea.Batch fans several Cmds out; nil = nothing to do.
	return tickCmd()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
	case tea.KeyPressMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		}
	case tea.MouseMsg:
		var nm tea.Model
		nm, cmd = m.handleMouse(msg)
		m = nm.(model)
	}
	return m, cmd
}

func (m model) View() tea.View {
	content := "loading…"
	if m.width != 0 && m.height != 0 {
		content = m.render() // your pure render
	}
	// v2: View() returns a struct; content lives in .Content, and the
	// alt-screen / mouse decisions are FIELDS on that struct — set them on
	// EVERY return path (including the loading frame), or the program toggles
	// out of the alt screen and drops mouse reporting before the first size msg.
	v := tea.NewView(content)
	v.AltScreen = true
	v.MouseMode = tea.MouseModeCellMotion
	return v
}

func main() {
	// Resolve the color profile / dark-bg ONCE here, then hand it to the model.
	// Create any heavy clients (DB, HTTP, telemetry) in main() too and pass them
	// into the model — never build them inside Update/View.
	m := newModel()
	m.renderStyle = detectRenderStyle()

	p := tea.NewProgram(m)
	if _, err := p.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "app:", err)
		os.Exit(1)
	}
}
```

A self-sustaining poll loop reschedules itself on each tick — `Init` kicks off the
first, every handler calls `tickCmd()` again, so the loop self-sustains:

```go
type tickMsg struct{}

func tickCmd() tea.Cmd {
	return tea.Tick(pollInterval, func(time.Time) tea.Msg { return tickMsg{} })
}
```

### Resolve color profile / dark-bg ONCE at startup

Detect the terminal's profile and background **once, in `main()`, before
`tea.NewProgram` takes over the terminal** — while you still own it in normal mode.
Hand the resolved hint to the model and reuse it from every render.

```go
// detectRenderStyle resolves the palette ONCE at startup while we still own the
// terminal — before tea.NewProgram takes it over. The chosen hint ("dark"/
// "light"/"notty") is handed to the model and reused by every async render, so a
// renderer never re-queries the terminal background from a render goroutine
// (which would race Bubbletea's stdin reader and frame writer, corrupting output).
func detectRenderStyle() string {
	switch colorprofile.Detect(os.Stdout, os.Environ()) {
	case colorprofile.NoTTY, colorprofile.Ascii:
		return "notty" // not a color terminal (e.g. piped) — use a plain style
	}
	if lipgloss.HasDarkBackground(os.Stdin, os.Stdout) {
		return "dark"
	}
	return "light"
}
```

The reason a render goroutine must never re-query the terminal background: doing
so **would race Bubbletea's stdin reader and frame writer, corrupting output.**
Same discipline applies to any expensive per-cell decision — resolve it where you
own the terminal, then carry the answer in the model. (In tests, set the field
directly — `m.renderStyle = "dark"` — for a deterministic palette.)

### v2 key handling

Printable input is in `msg.Text` (empty for named/function keys); named keys match
via `msg.String()`. Building a text buffer means appending `msg.Text` per key:

```go
func (m model) updateInput(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		return m, tea.Quit
	case "enter":
		m.submit()
		return m, nil
	case "backspace":
		if m.query != "" {
			r := []rune(m.query)
			m.query = string(r[:len(r)-1])
		}
	default:
		// msg.Text holds the printable chars (empty for arrows / function keys).
		if msg.Text != "" {
			m.query += msg.Text
		}
	}
	return m, nil
}
```

### v2 mouse handling

Mouse is an interface — the message TYPE is the action. Type-switch the concrete
message; `.Mouse()` returns `tea.Mouse{X, Y, Button}`; buttons are constants
(`tea.MouseLeft`, `tea.MouseWheelUp`, `tea.MouseWheelDown`).

```go
func (m model) handleMouse(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	e := msg.Mouse() // tea.Mouse{X, Y, Button}
	switch msg.(type) {
	case tea.MouseMotionMsg:
		if m.dragging {
			m.setFromXY(e.X, e.Y)
		}
	case tea.MouseReleaseMsg:
		m.dragging = false
	case tea.MouseWheelMsg:
		switch e.Button {
		case tea.MouseWheelUp:
			m.scroll(-1)
		case tea.MouseWheelDown:
			m.scroll(+1)
		}
	case tea.MouseClickMsg:
		if e.Button == tea.MouseLeft {
			m.handleClickAt(e.X, e.Y)
		}
	}
	return m, nil
}
```

**Locating a click is geometry, not line-counting.** Don't render the body and
count `\n` to find which row a click hit — that drifts the instant chrome changes.
Derive a `layout()` from terminal size + scroll, render *into* it, and reverse-map
clicks *through the same geometry*. See `$REFS/patterns.md` → "Layout geometry as a
single source of truth".

## Restrained styling — one accent

Run the whole UI on **one accent color**, reused everywhere the eye needs to be
drawn (active border, cursor row, focus glow, in-flight spinner). Everything else
is a small fixed set: `dim` for muted/inactive, semantic `danger`/`warn` for
destructive vs. cautionary. "Should we add a color?" defaults to **no**.

```go
import (
	"image/color"

	"charm.land/lipgloss/v2"
)

// Palette — restrained, one accent for focus.
var (
	colAccent = lipgloss.Color("#7D56F4") // active border, cursor, focus glow, spinner
	colDim    = lipgloss.Color("#6C757D") // muted text, inactive borders
	colDanger = lipgloss.Color("#DC3545") // destructive confirm; error badge
	colWarn   = lipgloss.Color("#FFC107") // cautionary action; warn badge
	colFg     = lipgloss.Color("#E6E6E6")
	colSelFg  = lipgloss.Color("#FFFFFF")
)

// Cursor row in the active list — the accent as a full-width bar.
var cursorActiveStyle = lipgloss.NewStyle().
	Background(colAccent).Foreground(colSelFg).Bold(true)

var dimStyle = lipgloss.NewStyle().Foreground(colDim)
```

A status-code → color mapping keeps **one-accent-per-family** even for multi-state
badges (the generic kernel of any per-row status indicator — git/lint/test state):

```go
func statusColor(c statusCode) color.Color {
	switch c {
	case statusOK, statusAdded:
		return colOK
	case statusBad, statusConflict:
		return colDanger
	default: // statusChanged, statusMoved
		return colWarn
	}
}
```

**Focus glow — the load-bearing gotcha.** When a glyph (a divider, a separator
block) tints toward the focused pane, set **FOREGROUND only — no background — so
the un-inked half blends into the borderless pane.** A background fill paints a
colored cell that no longer matches the surrounding pane.

```go
var dividerFocusStyle = lipgloss.NewStyle().Foreground(colAccent)
```

## lipgloss v2 layout gotchas

### `.Width(n)` is the OUTER width — border + padding included

`.Width(n)` sets the **total outer width** of a styled block — border + padding
**included**, not the content width. A bordered/padded box's usable text area is
`n - GetHorizontalFrameSize()`. When sizing a box from an inner (text) width, pass
`inner + frame` to `.Width()`; **passing the inner width alone shrinks the text
area by the frame and silently WRAPS the widest rows** (and the box ends up `frame`
cols too narrow).

Probe before guessing — `lipgloss.Width(style.Width(n).Render("x"))` tells you
exactly what `n` maps to.

```go
bw, bh := m.boxSize()                         // INNER content dims
ow := bw + boxStyle.GetHorizontalFrameSize()  // OUTER width for .Width
box := boxStyle.Width(ow).Render(m.renderBody(bw, bh))
```

### Canvas/Compositor overlays are OPAQUE at the cell level

A top layer's cells — **even space cells with no background** — overwrite the layer
below, so the background does **not** bleed through a box's interior.

Consequence: a floating box needs **NO `Background` fill** to hide what's behind it.
An opaque fill only sets the box's *color*; a fill that differs from the
terminal/pane background reads as a distinct panel inside the border (looks
"double-framed"). For a box that floats cleanly on the app (crush's look), use
**border only, no `Background`** — the interior then matches the terminal.

```go
// modalBoxStyle floats directly on the panes behind it — no background fill,
// border only. One accent, the same colAccent as the cursor row.
var modalBoxStyle = lipgloss.NewStyle().
	Border(lipgloss.RoundedBorder()).
	BorderForeground(colAccent).
	Foreground(colFg).
	Padding(0, 1)

// overlayCentered draws box centered over a full w×h rendered screen. The bg
// layer at z=0 paints every cell; the box layer at z=1 paints only the cells it
// occupies — so the background shows through everywhere the box does not cover,
// no manual dim/fill required.
func overlayCentered(bg, box string, w, h int) string {
	boxW, boxH := lipgloss.Width(box), lipgloss.Height(box)
	cx := max(0, (w-boxW)/2)
	cy := max(0, ((h-1)-boxH)/2)
	canvas := lipgloss.NewCanvas(w, h)
	return canvas.Compose(lipgloss.NewCompositor(
		lipgloss.NewLayer(bg).Z(0),
		lipgloss.NewLayer(box).X(cx).Y(cy).Z(1),
	)).Render()
}
```

## Testing a v2 TUI — four layers, cheapest first

The model is near-pure, so most of it tests **without a real terminal**. Climb from
the cheapest layer that proves the thing.

| What you're testing | Layer | Why |
|---|---|---|
| Pure logic: layout math, navigation, mouse hit-test, one-row render | **1 — unit `Update`/`View`** | fastest, deterministic |
| A whole frame at fixed sizes (layout regression) | **2 — golden snapshot of `View().Content`** | "photograph" a frame, still in `go test` |
| Multi-step interaction (key → update → assert) | **3 — teatest** | runs the program on a simulated terminal |
| Visual: alignment, color, spacing, truncation | **4 — render-to-image + agent verdict** | string assertions can't *see* it |

**Layer 1 — unit-test `Update`/`View`.** Construct the model, send a typed message,
type-assert the returned `tea.Model` back, assert on state:

```go
var tm tea.Model = m
tm, _ = tm.Update(tea.KeyPressMsg{Code: '/', Text: "/"})
m = tm.(model)
if m.mode != modeSearch {
	t.Fatalf("'/' did not enter search mode")
}
```

**Layer 2 — golden snapshot.** Render `View().Content` (v2: the frame string is in
`.Content`) and compare against a checked-in golden, refreshed with `-update`:

```go
got := m.View().Content
golden := filepath.Join("testdata", t.Name()+".golden")
if *update {
	os.WriteFile(golden, []byte(got), 0o644)
	return
}
want, _ := os.ReadFile(golden)
if got != string(want) {
	t.Errorf("View diverged from golden:\n%s", got)
}
```

**Layer 3 — teatest, the import-path footgun.** On a **bubbletea v2** project
teatest is `github.com/charmbracelet/x/exp/teatest/v2` — **NOT** the v1 path
`github.com/charmbracelet/x/exp/teatest` (importing v1 against a v2 model compiles
against the wrong `tea.Model`/`View` shapes). If `Init()` returns a recurring tick,
you **must `tm.Quit()` early** or the test hangs to the timeout.

```go
import (
	tea "charm.land/bubbletea/v2"
	teatest "github.com/charmbracelet/x/exp/teatest/v2" // v2 path
)

tm := teatest.NewTestModel(t, newModel(), teatest.WithInitialTermSize(80, 24))
tm.Send(tea.KeyPressMsg{Code: 'j', Text: "j"}) // v2 key, not tea.KeyMsg{Runes}
tm.Quit()
teatest.RequireEqualOutput(t, []byte(tm.FinalModel(t).View().Content))
```

**Color-profile determinism:** there is **no color profile to pin** in lipgloss v2
(`SetColorProfile` was removed). A style always renders full truecolor ANSI;
downsampling happens only at the output writer. So golden/dumped frames carry the
real colors and are stable across machines **even though `go test`'s stdout is not
a TTY — no global override needed.** What you pin is the palette decision
(`m.renderStyle`), set directly in the test.

**Layer 4 — render-to-image + agent verdict.** String/golden assertions catch
*byte changed*, never *looks wrong*. Dump a frame to ANSI, convert to PNG (e.g.
`freeze /tmp/app.ansi -o /tmp/app.png`), hand the image to an agent that returns a
structured pass/fail against the design intent; treat a failed verdict like a
failed assertion (fix → re-dump → re-judge).

## Deep patterns reference

For full, generalized, v2-correct code, read `$REFS/patterns.md`:

- **Async render off the `Update` goroutine** — slow work via `tea.Cmd`, the
  **gen-counter stale guard**, and the **renderer registry** (add a content kind = one entry)
- **Layout geometry as a single source of truth** — one `layout()` shared by render
  and mouse hit-testing; the two-pane split kernel with a draggable divider
- **Per-row / per-frame performance** — cache expensive per-row compute by identity;
  poll/refresh without re-rendering the world; fixed-width reserved spinner slot
- **Column alignment** with Unicode/emoji (`lipgloss.Width` vs byte-counting), ANSI-aware columns, the table abstraction
- **Filter/search mode**, scroll/pagination, integer formatting, severity/status classification

For a complete v2 example styled like a lazygit-flavored companion (no API key
needed), read `$REFS/gold-monitor.md` and `examples/gold-monitor/`.

## Project setup

```bash
mkdir my-tui && cd my-tui
go mod init my-tui
go get charm.land/bubbletea/v2@latest
go get charm.land/lipgloss/v2@latest
go get github.com/charmbracelet/colorprofile@latest
# For multi-step interaction tests (match the v2 path):
# go get github.com/charmbracelet/x/exp/teatest/v2@latest
```
