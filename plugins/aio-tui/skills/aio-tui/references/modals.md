# Floating Modals & Overlays

A modal in a TUI is a box composited **over** the rendered screen. Everything hard
about it is arithmetic: sizing against chrome, centering without eating the status
row, and keeping a scroll clamp in step with what the renderer actually drew. All
v2-correct (`charm.land/lipgloss/v2` `Canvas`/`Compositor`).

---

## Sizing: outer vs. inner, clamped with a floor

`.Width(n)` in lipgloss v2 is the **OUTER** width — border + padding included. So a
modal has two dimensions at every moment and you must be explicit about which one
you are holding.

Compute the **inner** (text) dimensions in one place, subtract the frame there — not
at the call site — so a bordered + padded box still fits on a 60-col terminal:

```go
// Modal sizing — OUTER box dims; inner content = outer − frame (subtracted at
// runtime in modalSize). Clamped to fit narrow/short terminals.
const (
	modalMargin     = 2  // min screen cols/rows kept around the box
	modalTargetCols = 56 // preferred outer width
	modalTargetRows = 16 // preferred outer height
	modalMinCols    = 24 // floor outer width (degenerate terminal)
	modalMinRows    = 6  // floor outer height
)

// modalSize returns the INNER content dimensions handed to the body renderers. The
// OUTER box (inner + frame) is clamped to fit the screen minus a margin each side,
// with a floor — best-effort discipline: a narrow or short terminal shrinks the box
// but it never overflows.
func (m model) modalSize() (innerW, innerH int) {
	fw := modalBoxStyle.GetHorizontalFrameSize()
	fh := modalBoxStyle.GetVerticalFrameSize()
	outerW := min(modalTargetCols, m.width-modalMargin*2)
	outerH := min(modalTargetRows, (m.height-1)-modalMargin*2) // -1: the status row
	outerW = min(max(outerW, modalMinCols), m.width)           // floor, THEN never exceed screen
	outerH = min(max(outerH, modalMinRows), m.height-1)
	return max(1, outerW-fw), max(1, outerH-fh)
}
```

The clamp order is load-bearing: **floor first, then never-exceed-screen.** Reversed,
a degenerate terminal gets a box wider than the screen (the floor wins and nothing
trims it). And the final `max(1, …)` means the renderer is handed a sane width even
at absurd sizes rather than a negative one that panics a `strings.Repeat`.

Then the render site adds the frame back:

```go
// renderModal returns the styled box for the active overlay mode and ok=true; in
// normal mode it returns ok=false. The box is sized to bw+fw because .Width is the
// TOTAL outer width, so the inner text area it leaves is exactly bw — what the body
// renderers fit their lines to. Passing bw alone would shrink the text area by fw
// and silently wrap the widest rows.
func (m model) renderModal() (string, bool) {
	bw, bh := m.modalSize()
	ow := bw + modalBoxStyle.GetHorizontalFrameSize()
	switch m.mode {
	case modeCommandPalette:
		return modalBoxStyle.Width(ow).Render(m.renderPaletteBody(bw, bh)), true
	case modeHelp:
		return modalBoxStyle.Width(ow).Render(m.renderHelpBody(bw, bh)), true
	default:
		return "", false
	}
}
```

Returning `(string, bool)` instead of `""`-means-none keeps `View()` honest: an
empty body is a legitimate box, and `ok` is the only signal that says "no overlay".

---

## Compositing: the background needs no dim layer

Canvas layers are **opaque at the cell level** — a top layer's cells, *even space
cells with no background*, overwrite the layer below. Two consequences:

1. A floating box needs **no `Background` fill** to hide what is behind it.
2. The background shows through everywhere the box does **not** cover, for free —
   no manual dim pass, no scrim layer.

```go
// overlayCentered draws box centered over bg (a full w×h rendered screen). The box
// is centered within the BODY region (rows [0, h-1)) so the status row at h-1 —
// which carries the modal's hints — stays visible. The bg layer at z=0 paints every
// cell; the box layer at z=1 paints only the cells it occupies.
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

`(h-1)` is the whole trick for the vertical center: centering over the full height
would push the box down over the status row on odd heights, hiding exactly the hints
the modal needs to show.

`View()` composites **last**, after the full screen string is assembled:

```go
content = strings.Join([]string{m.renderHeader(m.width), body, m.renderStatus()}, "\n")

// Floating modal overlay drawn OVER the screen.
if box, ok := m.renderModal(); ok {
	content = overlayCentered(content, box, m.width, m.height)
}
```

### Box chrome: border only, no background

An opaque fill only sets the box's *color*. A fill that differs from the
terminal/pane background reads as a distinct panel inside the border — it looks
"double-framed". For a box that floats cleanly on the app, use **border only**:

```go
// modalBoxStyle floats directly on the panes behind it — no background fill,
// border only. One accent, the same colAccent as the cursor row.
var modalBoxStyle = lipgloss.NewStyle().
	Border(lipgloss.RoundedBorder()).
	BorderForeground(colAccent).
	Foreground(colFg).
	Padding(0, 1)
```

---

## The status bar hands off while a modal is open

The modal owns the input prompt (it lives **in the box**, at the top — the
Raycast/crush shape), so the status bar stops carrying the app's normal hints and
carries the **modal's** short-help instead. One `switch m.mode` in the status
renderer:

```go
func (m model) renderStatus() string {
	switch m.mode {
	case modeCommandPalette:
		// The prompt + command list + any submit error live in the modal box now;
		// the status bar just carries the modal short-help.
		return statusBarStyle.Width(m.width).Render(fitWidth(
			"[enter] run   [esc] close   "+dimStyle.Render("[↑↓] move"), m.width-2))
	case modeHelp:
		return statusBarStyle.Width(m.width).Render(fitWidth(
			"[j/k] scroll   [esc] close", m.width-2))
	default:
		...
	}
}
```

### Modal chrome: title rule + plain input

```go
// modalTitle renders a header line: a bold accent label followed by a ╱ rule that
// fades accent→dim and fills the row to width w. The rule is sized at its exact
// PLAIN width before coloring, so it needs no fitWidth — fitWidth is not
// ANSI-aware, and the gradient emits per-rune SGR.
func modalTitle(label string, w int) string {
	head := modalAccentStyle.Render(label)
	ruleW := w - lipgloss.Width(label) - 1 // 1 space between label and rule
	if ruleW < 1 {
		return fitWidth(label, w) // too narrow for a rule; bare label
	}
	return head + " " + gradientLine(strings.Repeat("╱", ruleW), colAccent, colDim)
}

// modalInput renders the "› query▏" prompt: accent caret, default query text, no
// background bar. "› " (2) + the ▏ caret (1) reserve 3 cols, so the query is
// truncated and never wraps.
func modalInput(query string, w int) string {
	q := fileStyle.Render(fitWidth(query, max(0, w-3)))
	return modalAccentStyle.Render("›") + " " + q + modalAccentStyle.Render("▏")
}

// gradientLine paints each rune with a foreground linearly interpolated from→to
// across its length — one accent dissolving into the muted border.
func gradientLine(s string, from, to color.Color) string {
	rs := []rune(s)
	n := len(rs)
	if n == 0 {
		return ""
	}
	fr, fg, fb, _ := from.RGBA()
	tr, tg, tb, _ := to.RGBA()
	var b strings.Builder
	for i, r := range rs {
		t := 0.0
		if n > 1 {
			t = float64(i) / float64(n-1)
		}
		col := lipgloss.Color(fmt.Sprintf("#%02X%02X%02X",
			lerp8(fr, tr, t), lerp8(fg, tg, t), lerp8(fb, tb, t)))
		b.WriteString(lipgloss.NewStyle().Foreground(col).Render(string(r)))
	}
	return b.String()
}

// lerp8 interpolates two channels (16-bit color.Color.RGBA range) at t∈[0,1] and
// returns the 8-bit result.
func lerp8(a, b uint32, t float64) uint8 {
	av, bv := float64(a>>8), float64(b>>8)
	return uint8(av + (bv-av)*t)
}
```

**Sizing a rule before coloring it** is the reusable lesson: any per-rune-styled
string must be measured and cut as **plain text first**, because the width helpers
that pad/truncate are not ANSI-aware.

---

## Body: rows that fit the box, cursor row as a full-width bar

The body renderer receives the **inner** dims and must emit at most `h` lines, each
at most `w` display columns. Reserve the header lines out of the row budget rather
than assuming:

```go
func (m model) renderPaletteBody(w, h int) string {
	var lines []string
	lines = append(lines, modalTitle("Commands", w), modalInput(m.paletteQuery, w))
	lines = append(lines, "") // blank between header and body

	if len(m.paletteFiltered) == 0 {
		return strings.Join(append(lines, dimStyle.Render(fitWidth("(no matching commands)", w))), "\n")
	}

	// Name column sized to the widest name, so descriptions align.
	nameCol := 0
	for _, c := range m.paletteFiltered {
		if n := lipgloss.Width(c.Name); n > nameCol {
			nameCol = n
		}
	}
	nameCol += 2 // gap between the name column and its description

	bodyRows := h - len(lines) // whatever the header did NOT consume
	for i, c := range m.paletteFiltered {
		if i >= bodyRows {
			break
		}
		row := fmt.Sprintf(" %-*s%s", nameCol, c.Name, c.Description)
		if i == m.paletteCursor {
			lines = append(lines, cursorActiveStyle.Width(w).Render(fitWidth(row, w)))
		} else {
			lines = append(lines, dimStyle.Render(fitWidth(row, w)))
		}
	}
	return strings.Join(lines, "\n")
}
```

`cursorActiveStyle.Width(w)` pads the highlight to the full inner width so the
selection is a clean bar, not a ragged one as wide as its text.

> `%-*s` is safe **only** for ASCII command names. The moment a row can contain
> emoji or CJK, switch to `lipgloss.NewStyle().Width(n).Render(...)` — `%s` counts
> bytes, not display columns. See `patterns.md` → *Column alignment*.

---

## A multi-stage modal

A command that needs an argument turns the modal into a two-stage machine. Keep
**one** mode and a `stage` field — not two modes — so open/close/reset stay in one
place.

| Stage | Shows | Enter does | Esc does |
|---|---|---|---|
| 0 — pick | title + query + filtered rows | run, or advance to stage 1 if `NeedsArg` | close the modal |
| 1 — argument | command name + arg input + description | run with the arg | step **back to stage 0**, modal stays open |

```go
func (m model) updateCommandPalette(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	km := m.keymap

	if m.paletteStage == 1 {
		switch {
		case key.Matches(msg, km.Back):
			m.paletteStage = 0 // step back to the list, keep the palette open
			m.paletteSecondaryInput = ""
			return m, nil
		case msg.String() == "enter":
			sel := m.paletteFiltered[m.paletteCursor]
			cmd := sel.Run(&m, m.paletteSecondaryInput)
			ok := !strings.HasPrefix(m.statusMsg, "⚠")
			if ok {
				m.exitCommandPalette()
			}
			// On FAILURE keep stage 1 open so the user can fix the path.
			return m, cmd
		case msg.String() == "backspace":
			r := []rune(m.paletteSecondaryInput)
			if len(r) > 0 {
				m.paletteSecondaryInput = string(r[:len(r)-1])
			}
			return m, nil
		default:
			if msg.Text != "" { // printable only — empty for arrows/fn keys
				m.paletteSecondaryInput += msg.Text
			}
			return m, nil
		}
	}

	switch {
	case key.Matches(msg, km.Back), key.Matches(msg, km.CommandPalette):
		m.exitCommandPalette() // the opening chord also closes — a toggle
		return m, nil
	case key.Matches(msg, km.MoveDown):
		if m.paletteCursor < len(m.paletteFiltered)-1 {
			m.paletteCursor++
		}
		return m, nil
	case key.Matches(msg, km.MoveUp):
		if m.paletteCursor > 0 {
			m.paletteCursor--
		}
		return m, nil
	case msg.String() == "enter":
		if len(m.paletteFiltered) == 0 {
			return m, nil
		}
		sel := m.paletteFiltered[m.paletteCursor]
		if sel.NeedsArg {
			m.paletteStage = 1
			return m, nil
		}
		cmd := sel.Run(&m, "")
		m.exitCommandPalette()
		return m, cmd
	case msg.String() == "backspace":
		if m.paletteQuery == "" {
			m.exitCommandPalette() // backspace on an empty query closes
			return m, nil
		}
		r := []rune(m.paletteQuery)
		m.paletteQuery = string(r[:len(r)-1])
		m.applyPaletteFilter()
		return m, nil
	default:
		if msg.Text != "" {
			m.paletteQuery += msg.Text
			m.applyPaletteFilter()
		}
	}
	return m, nil
}
```

Three affordances people expect and forget to build:
- **The opening chord closes it** (`ctrl+p` is a toggle, not one-way).
- **Backspace on an empty query closes** — one key retreats out of a mistyped open.
- **A failed submit keeps the stage open** with the error rendered *inside the box*,
  next to the input the user is correcting. Closing on failure throws away what they
  typed.

Error text belongs in the body, beside the input:

```go
if m.paletteStage == 1 {
	sel := m.paletteFiltered[m.paletteCursor]
	lines = append(lines, dimStyle.Render(fitWidth(sel.Description, w)))
	if m.statusMsg != "" {
		lines = append(lines, "", dimStyle.Render(fitWidth(m.statusMsg, w)))
	}
	return strings.Join(lines, "\n")
}
```

---

## Scroll-clamp parity: count exactly what you render

A scrollable modal (help, a long list) has two functions that must agree: the one
that **renders** a slice of lines, and the one that **clamps** the offset. If they
disagree, the last lines become unreachable or `j`-spam grows the offset unbounded
and `k` then feels laggy while it counts back.

Make the counter mirror the renderer line-for-line, and share every sub-list between
them:

```go
func (m model) renderHelpBody(w, h int) string {
	titles := []string{"Navigation", "Preview", "Modes", "Misc"}
	var lines []string
	for gi, group := range m.fullHelp() {
		title := ""
		if gi < len(titles) {
			title = titles[gi]
		}
		lines = append(lines, sectionStyle.Render(title))
		for _, b := range group {
			hb := b.Help()
			lines = append(lines, fitWidth(fmt.Sprintf("  %-12s  %s", hb.Key, hb.Desc), w))
		}
		lines = append(lines, "") // blank separator between groups
	}
	lines = append(lines, helpNoteLines(w)...) // SHARED with the counter below
	start := min(max(0, m.helpTop), len(lines))
	end := min(start+h, len(lines))
	return strings.Join(lines[start:end], "\n")
}

// helpLineCount is the rendered line count (group title + rows + one blank
// separator per group, then the footnote) — the SAME number renderHelpBody
// produces, so the clamp here and the slice there never disagree and the footnote
// is reachable by scroll rather than clamped off-screen.
func (m model) helpLineCount() int {
	n := 0
	for _, group := range m.fullHelp() {
		n += 1 + len(group) + 1 // title + rows + blank separator
	}
	return n + len(helpNoteLines(0)) // the footnote is width-independent, so 0 is safe
}

case key.Matches(msg, km.MoveDown):
	_, bodyH := m.bodyRows()
	maxTop := max(0, m.helpLineCount()-bodyH)
	m.helpTop = min(m.helpTop+1, maxTop) // clamp on the way DOWN, not just at 0
```

A static block that appears in the body (a footnote, a legend) must be a **shared
function** returning `[]string` — rendered by one, counted by the other. Inline it
in the renderer and the counter drifts on the next edit.

**Rules to keep verbatim:**
- *`modalSize` returns INNER dims and subtracts the frame itself; the render site passes `inner + frame` to `.Width`.*
- *Clamp order: floor first, then never-exceed-screen.*
- *Center within the body region `(h-1)`, so the status row carrying the modal's hints stays visible.*
- *A floating box uses border only, no `Background` — compositor layers are already opaque.*
- *A per-rune-styled string is measured and cut as PLAIN text before coloring.*
- *The line counter mirrors the renderer line-for-line and shares every sub-list with it.*

---

## Testing a modal

Four cheap tests catch every modal bug worth catching (see `testing.md` for the
harness patterns):

```go
// 1. The frame constants are what the sizing math assumes.
func TestModalBoxStyleFrame(t *testing.T) {
	if got := modalBoxStyle.GetHorizontalFrameSize(); got != 4 {
		t.Errorf("horizontal frame = %d, want 4 (border 2 + padding 2)", got)
	}
	if got := modalBoxStyle.GetVerticalFrameSize(); got != 2 {
		t.Errorf("vertical frame = %d, want 2 (border only)", got)
	}
}

// 2. modalSize clamps — table-driven, with the OUTER-fits-screen invariant asserted
//    on every case, not just the ones you thought about.
func TestModalSizeClamps(t *testing.T) {
	fw, fh := modalBoxStyle.GetHorizontalFrameSize(), modalBoxStyle.GetVerticalFrameSize()
	for _, c := range []struct {
		name             string
		w, h             int
		wantInW, wantInH int
	}{
		{"wide", 120, 40, modalTargetCols - fw, modalTargetRows - fh},
		{"narrow60", 60, 24, 56 - fw, modalTargetRows - fh},
		{"tiny", 20, 10, 20 - fw, 6 - fh}, // floor, then never-exceed-screen
	} {
		m := model{width: c.w, height: c.h}
		gotW, gotH := m.modalSize()
		if gotW != c.wantInW || gotH != c.wantInH {
			t.Errorf("%s: inner = %dx%d, want %dx%d", c.name, gotW, gotH, c.wantInW, c.wantInH)
		}
		if gotW+fw > c.w {
			t.Errorf("%s: outerW %d exceeds width %d", c.name, gotW+fw, c.w)
		}
		if gotH+fh > c.h-1 {
			t.Errorf("%s: outerH %d exceeds body rows %d", c.name, gotH+fh, c.h-1)
		}
	}
}
```

3. **A no-overflow frame snapshot at two sizes** (80×24 and 60×24): open the modal,
   render `View().Content`, and assert every line's `lipgloss.Width` ≤ `m.width` and
   the line count == `m.height`. This is what catches the `.Width(inner)` mistake —
   the box silently wraps its widest row instead of erroring.
4. **Scroll to the bottom** and assert the last rendered line is the footnote's last
   line — the parity check that `helpLineCount` and `renderHelpBody` still agree.
