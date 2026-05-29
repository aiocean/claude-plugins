# Gold Price Monitor — a v2 worked example

A lazygit-flavored gold price monitor on the charmbracelet **v2** stack. It is the
end-to-end reference for this skill: the full, compiling source lives at
[`examples/gold-monitor/main.go`](../../../examples/gold-monitor/main.go) — read it
there (it is the source of truth and is kept building), this doc is the tour.

Displays XAU/USD, USD/g, VND/g, VND/tael, a 30-day sparkline, and a scrollable
history table — using free public APIs, no key required.

## APIs Used

| API | URL | Auth |
|-----|-----|------|
| Gold price + history | `https://freegoldapi.com/data/latest.json` | None |
| Exchange rates | `https://api.exchangerate-api.com/v4/latest/USD` | None |

The gold API returns a JSON array of `{date, price, source}` where `price` is
USD/troy oz. Filter by `source == "yahoo_finance"` for the most reliable data.

## Run it

```bash
cd examples/gold-monitor
go run .          # q quit · r refresh · ↑/↓ or wheel scroll · auto-refresh 60s
go build -o gold-monitor . && go vet ./...   # the gate
```

## Preview

```
● GOLD MONITOR                              updated 14:32:01 · next in 47s

╭ XAU/USD ─────────╮ ╭ USD/GRAM ────────╮ ╭ USD→VND ─────────╮
│ $2,650.40 /oz    │ │ $85.20           │ │ 25,480           │
╰──────────────────╯ ╰──────────────────╯ ╰──────────────────╯
╭ VND/TAEL ────────╮ ╭ VND/GRAM ────────╮
│ 81,438,600       │ │ 2,171,696        │
╰──────────────────╯ ╰──────────────────╯

30-DAY TREND

▁▂▃▄▄▅▅▆▇▇█▇▆▅▄▄▅▆▇█▇▇▆▅▄▃▄▅▆▇█▇▆▅▄▄▅▆▇█
$2,535  +4.54%  $2,650

HISTORY  (newest first)

DATE          USD/OZ     USD/G          VND/TAEL  CHANGE
────────────────────────────────────────────────────────
2024-01-15   2,650.40   85.20    81,438,600       +0.42%
2024-01-14   2,639.20   84.84    81,094,080       -0.18%
...

[R]efresh  [↑/↓ / wheel] Scroll  [Q]uit                  ⠹
```

The chrome is restrained: one accent (the `XAU/USD` and `VND/TAEL` values, the
spinner) on an otherwise dim/neutral surface; cards are **border-only, no
background** so they float on the terminal (v2 cells are opaque — no fill needed).

## Elite patterns it demonstrates

Each maps to a section of `$REFS/patterns.md` (or SKILL.md) — see there for the
generalized kernel.

### v2 API end-to-end
`View() tea.View` with `v.AltScreen` / `v.MouseMode` as fields; `tea.KeyPressMsg`
via `.String()`; the mouse interface (type-switch `tea.MouseWheelMsg` /
`MouseMotionMsg`, `.Mouse()` → `{X,Y,Button}`); `lipgloss.Color` truecolor.

### Color profile resolved ONCE at startup
`detectRenderStyle()` runs in `main()` before `tea.NewProgram` takes the terminal,
and the hint is carried in the model (`m.renderStyle`) — every render reuses it
(`"notty"` → plain output for pipes), no goroutine ever re-queries the terminal.

### Async fetch + gen-counter stale guard
`fetchCmd` bumps `m.fetchGen`, captures it into the closure, and runs the HTTP work
off the `Update` goroutine. `applyFetch` drops a result whose `gen` no longer
matches — so hammering `r` never lets a slow fetch overwrite a newer one:

```go
func (m *model) fetchCmd() tea.Cmd {
	m.fetchGen++
	m.loading = true
	gen := m.fetchGen
	return func() tea.Msg {
		data, err := fetchPrices()
		return fetchDoneMsg{gen: gen, data: data, err: err}
	}
}

func (m *model) applyFetch(msg fetchDoneMsg) {
	if msg.gen != m.fetchGen {
		return // stale: superseded by a newer dispatch
	}
	// ...apply...
}
```

### Layout as a single source of truth (no hardcoded row math)
`layout()` derives the table's first screen row from model state alone. `View()`
appends sections in that exact order; `handleMouse` reverse-maps a hover Y through
the *same* `layout()`. The original v1 hardcoded `tableStartY := 18` and broke
whenever the sparkline was absent — this can't drift:

```go
func (m model) layout() layout {
	hasSpark := m.data != nil && len(m.data.history) >= 2
	y := hHeader + hGap
	if m.data != nil {
		y += hCardRow + hCardRow + hGap
		if hasSpark {
			y += hSectTitle + hGap + hSpark + hSparkRng + hGap
		}
		y += hSectTitle + hGap + hTableHead + hTableDiv
	}
	// ...visibleRows from m.height...
}
```

### Fixed-width reserved spinner slot
The footer reserves a 2-col slot at the **right edge** — a braille glyph while
fetching, two spaces when idle — so toggling it never reflows the hints (the
footer-flicker fix). The spinner tick is self-terminating: it only reschedules
while `m.loading`.

### `.Width(n)` is the OUTER width
`mkCard` sizes each card to `cardInner + cardStyle.GetHorizontalFrameSize()` so the
border+padding leave exactly `cardInner` content columns — passing `cardInner`
alone would wrap the widest value.

## Key Controls

| Key | Action |
|-----|--------|
| `q` / `ctrl+c` | Quit |
| `r` | Manual refresh (gen-counter drops stale in-flight results) |
| `↑`/`↓`, `k`/`j`, wheel | Scroll history |
| Auto | Refreshes every 60s |
