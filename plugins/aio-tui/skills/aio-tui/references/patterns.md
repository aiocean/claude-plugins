# Bubbletea v2 Patterns Reference

Deep, generalized, v2-correct patterns. Every snippet targets the charmbracelet v2
stack (`charm.land/bubbletea/v2`, `charm.land/lipgloss/v2`). Names are generic —
adapt the kernel, drop the domain skin.

---

## Async render off the `Update` goroutine

Bubbletea processes **every** message on a single goroutine. A slow render called
directly inside `Update` blocks the whole loop — no keystroke, no tick, no frame is
handled until it returns. The fix: `Update` returns a `tea.Cmd` whose closure does
the heavy render on its own goroutine and returns a result `tea.Msg`. `Update`
itself never blocks, so a slow renderer never freezes the UI.

```go
// resultMsg carries the output of an async worker back to the Update loop.
// gen identifies which dispatch produced it (stale results are dropped); width
// is the size it was rendered at; lines are the output (valid only when err is nil).
type resultMsg struct {
	gen       uint64
	width     int
	lines     []string
	preStyled bool
	err       error
}

// loadAsync is the single reconciliation point. Called once at the tail of Update,
// it returns a render Cmd when — and only when — the displayed output is out of
// date at the current width. The heavy work runs inside the returned closure, off
// the Update goroutine — this is what keeps the UI responsive.
func (m *model) loadAsync() tea.Cmd {
	if m.srcPath == "" {
		return nil // selection has no renderer
	}
	w := m.bodyWidth()
	if w <= 0 {
		return nil // width not known yet (initial load before first WindowSizeMsg)
	}
	if m.srcWidth == w {
		return nil // already rendered this source at this width (cache hit)
	}
	if m.pendingWidth == w {
		return nil // a render for this exact width is already in flight
	}
	r, ok := rendererFor(filepath.Base(m.srcPath))
	if !ok {
		return nil
	}

	m.renderGen++
	m.pendingWidth = w
	// Snapshot everything the closure needs into locals — never read m.* from
	// inside the goroutine (data race with the Update goroutine).
	gen, path, raw, style := m.renderGen, m.srcPath, m.srcRaw, m.renderStyle
	return func() tea.Msg {
		lines, preStyled, err := r.render(path, raw, w, style)
		return resultMsg{gen: gen, width: w, lines: lines, preStyled: preStyled, err: err}
	}
}
```

The result is matched in `Update` by message **type** (v2: the type *is* the
action — there is no `.Action` field):

```go
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case resultMsg:
		m.applyAsync(msg)
		return m, nil
	// ...
	}
}
```

A `pendingWidth` field (the in-flight size, `0` = none) does double duty:
`loadAsync` reads it to skip re-dispatching work already running, and it drives the
"loading…" spinner chip.

### The gen-counter stale guard (load-bearing correctness)

Fast navigation spawns many overlapping renders; their results land out of order.
Each dispatch carries a **generation number** (`renderGen++` before launching the
closure, captured into the closure's `gen` local). When a result arrives, if its
`gen` no longer matches the current `renderGen`, **discard it** — the user already
moved on and a newer render now owns the output. Without this, a slow render of an
old selection lands last and shows the wrong file's content.

```go
// applyAsync applies a completed render. It drops a stale result — one whose gen
// no longer matches, meaning the user navigated (or resized) and a newer render
// now owns the output — so fast scrolling never shows the wrong file's content.
func (m *model) applyAsync(msg resultMsg) {
	if msg.gen != m.renderGen {
		return // stale: a newer render was dispatched since; it owns pendingWidth
	}
	m.pendingWidth = 0

	if msg.err != nil {
		m.output = plainLines(m.srcRaw) // fall back to raw source as plain text
		m.preStyled = false
		m.srcWidth = 0
		return
	}
	m.output = msg.lines
	m.preStyled = msg.preStyled
	m.srcWidth = msg.width // cache key: marks this source rendered at this width
}
```

The struct fields the guard relies on:

```go
renderGen    uint64 // tags each dispatch; result applied only if its gen still matches
pendingWidth int    // body width of the in-flight render (0 = none)
srcWidth     int    // width m.output was rendered at (cache key); 0 = not yet rendered
```

The same `gen`-counter discipline applies verbatim to *any* async producer keyed to
a selection that can change mid-flight (e.g. an async directory walk: bump a
`walkGen`, drop the `walkedMsg` if `msg.gen != m.walkGen`). **One counter per
independent async stream.**

### The renderer registry: add a content kind = one entry

Dispatch is type-specific but the async machinery (`loadAsync`/`applyAsync`) is
entirely type-agnostic. A registry of `{name, matches, render}` is the *only*
type-specific piece, so supporting a new content kind means registering one entry —
nothing else changes. The renderer **is** the dispatch; the caller never branches
on kind.

```go
type contentRenderer struct {
	name    string
	matches func(name string) bool
	// binary is false for renderers that need decoded UTF-8 text (e.g. markdown,
	// source): they are skipped on a binary file. It is true for renderers that
	// work on raw bytes / the path itself (e.g. image), which run regardless.
	binary  bool
	render  func(path string, content []byte, width int, style string) (lines []string, preStyled bool, err error)
}

// rendererRegistry is tried in order. A more specific renderer goes before a
// broader one so the broad one doesn't shadow it (here: a rich-doc renderer must
// precede a generic source-highlighter that would also match the same files).
// Append-only at init; never mutated at runtime, so looking a renderer up by
// filename each render is the source of truth (no stored pointer — a pointer into
// the slice is unsafe if the slice ever grows).
var rendererRegistry = []contentRenderer{
	{name: "richdoc", matches: isRichDoc, render: renderRichDoc},
	{name: "source", matches: isSource, render: renderSource},
	{name: "image", matches: isImage, binary: true, render: renderImage},
}

// rendererFor returns the first registered renderer that matches name.
func rendererFor(name string) (contentRenderer, bool) {
	for _, r := range rendererRegistry {
		if r.matches(name) {
			return r, true
		}
	}
	return contentRenderer{}, false
}
```

The `preStyled` return is the renderer's contract, not the caller's: a renderer
that emits verbatim ANSI / output already pre-fit to width returns `true`, and the
view then **skips** its width-fitting pass; a plain-text or placeholder renderer
returns `false`. `applyAsync` copies `msg.preStyled` straight through — the caller
never hardcodes per-kind behavior. Registry order matters when two `matches`
overlap; keep it append-only with a comment so the ordering invariant is visible.

---

## Layout geometry as a single source of truth

The naive way to locate a mouse click — render the body, then count `\n` lines to
figure out which row the click landed on — is brittle: it drifts the instant chrome
changes (off-by-one/off-by-two bugs every time you add a border row, a divider, or
a status line). Replace it with a single `layout()` function that derives all
rectangles/offsets purely from terminal size + scroll state. `View()` renders *into*
those rects; the mouse handler reverse-maps a click coordinate *through the same
rects*. The two can never disagree because they read the identical geometry.

The geometry struct holds offsets, not strings. `firstRow` is kept as a *named
field* (even though it is always 0) so the render path and the click path read the
same name rather than one hard-coding a literal the other forgets to update.

```go
// geometry holds the screen layout derived purely from terminal size + cursor.
// Both View (for rendering) and the mouse handler (for hit-testing) call layout()
// so the two can never disagree about where a row or column lives.
type geometry struct {
	vertical bool // true → 1-col stacked layout; false → 2-col side-by-side

	leftInner    int // content columns of the first pane
	rightInner   int // content columns of the second pane (horizontal only)
	dividerStart int // first column of the vertical divider strip (horizontal only)

	topInner      int // content rows of the first pane (vertical only)
	bottomInner   int // content rows of the second pane (vertical only)
	dividerYStart int // first row of the horizontal divider strip (vertical only)

	bodyH           int // body rows (excludes the 1 status row at m.height-1)
	listTop         int // index of the first visible row entry
	firstRow        int // screen Y of the first body row — always 0 (no top border)
	previewFirstRow int // screen Y of the first second-pane content row
}

// layout picks 2-col or 1-col purely from m.width — `vertical` is NEVER stored on
// the model, so View() and the mouse handler can never read a stale value.
func (m model) layout() geometry {
	bodyH := max(m.height-1, 3) // status(1); body fills the rest

	if m.width < widthBreakpoint {
		topInner := topInnerHeight(bodyH, m.topRatio)
		return geometry{
			vertical:        true,
			leftInner:       m.width, // both panes use full width
			bodyH:           bodyH,
			topInner:        topInner,
			bottomInner:     bodyH - topInner - dividerHeight,
			dividerYStart:   topInner, // glyph row Y (0-indexed)
			listTop:         m.listTopFor(topInner),
			firstRow:        0,
			previewFirstRow: topInner + dividerHeight,
		}
	}

	leftInner := m.leftInnerWidth()
	return geometry{
		vertical:        false,
		leftInner:       leftInner,
		rightInner:      m.width - leftInner - dividerWidth,
		dividerStart:    leftInner,
		bodyH:           bodyH,
		listTop:         m.listTopFor(bodyH),
		firstRow:        0,
		previewFirstRow: 0,
	}
}
```

`View()` calls `layout()` and renders each pane into a plain `lipgloss` Style sized
to the geometry's inner dimensions, then joins them. The mouse modes live on the
returned `tea.View` struct — set `AltScreen`/`MouseMode` on *every* return path,
including the early "loading…" frame, or the program toggles out of the alt screen
and drops mouse reporting before the size message arrives.

```go
func (m model) View() tea.View {
	content := "loading…"
	if m.width != 0 && m.height != 0 {
		g := m.layout() // SAME geometry the mouse handler will read

		var body string
		if g.vertical {
			list := lipgloss.NewStyle().Width(g.leftInner).Height(g.topInner).
				Render(m.renderList(g.leftInner, g.topInner))
			preview := lipgloss.NewStyle().Width(g.leftInner).Height(g.bottomInner).
				Render(m.renderPreview(g.leftInner))
			body = lipgloss.JoinVertical(lipgloss.Left, list, divider, preview)
		} else {
			left := lipgloss.NewStyle().Width(g.leftInner).Height(g.bodyH).
				Render(m.renderList(g.leftInner, g.bodyH))
			right := lipgloss.NewStyle().Width(g.rightInner).Height(g.bodyH).
				Render(m.renderPreview(g.rightInner))
			body = lipgloss.JoinHorizontal(lipgloss.Top, left, divider, right)
		}
		content = strings.Join([]string{body, m.renderStatus()}, "\n")
	}

	v := tea.NewView(content)
	v.AltScreen = true
	v.MouseMode = tea.MouseModeCellMotion
	return v
}
```

The mouse handler is the reverse map. It calls the same `layout()`, decides which
pane the coordinate fell in by comparing against the divider offset, then converts
screen-Y to a list index by subtracting `firstRow` and adding `listTop` — the
inverse of what the renderer did. No `\n` counting anywhere.

```go
func (m model) handleMouse(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	g := m.layout() // identical geometry to View()
	e := msg.Mouse()

	// overDivider: the divider's hit-zone in the current orientation.
	var overDivider bool
	if g.vertical {
		overDivider = e.Y >= g.dividerYStart-dividerHitRowsAbove &&
			e.Y <= g.dividerYStart+dividerHeight-1+dividerHitRowsBelow
	} else {
		overDivider = e.X >= g.dividerStart && e.X < g.dividerStart+dividerWidth
	}

	switch msg.(type) {
	case tea.MouseClickMsg:
		if e.Button != tea.MouseLeft {
			return m, nil
		}
		if overDivider {
			return m, nil // divider is a "no-pane" zone — never route to a pane
		}
		overList := false
		listH := g.bodyH
		if g.vertical {
			overList = e.Y < g.dividerYStart
			listH = g.topInner
		} else {
			overList = e.X < g.dividerStart
		}
		if !overList {
			m.previewClick(e.Y, g) // reverse-map within the other pane
			return m, nil
		}
		// Reverse-map screen Y → list index. This is the inverse of the renderer:
		// render drew entry (listTop+row) at screen row (firstRow+row); here we
		// recover row, then the index. Counting \n in the rendered string would
		// drift the moment chrome changes — this can't.
		row := e.Y - g.firstRow
		if row < 0 || row >= listH {
			return m, nil
		}
		idx := g.listTop + row
		if idx < 0 || idx >= len(m.entries) {
			return m, nil
		}
		m.cursor = idx
	}
	return m, nil
}
```

**Rules to keep verbatim:**
- *Both `View()` and the mouse handler call `layout()` so the two can never disagree about where a row or column lives.*
- *`firstRow` stays a named field (always 0) so the render path and the click path read the same name rather than hard-coding a literal one of them forgets to update.*
- *The orientation flag is NEVER stored on the model — it is recomputed in `layout()` every call, so `View()` and the mouse handler can never read a stale value.*
- *The clicked row indexes into the SAME slice the renderer drew, so render and click can never disagree about which entry sits on which row.*

### The two-pane split geometry kernel

A `ratio` in `[0,1]` represents the **column (or row) of the divider glyph itself** —
not the right edge of the first pane — so the same value drives both the geometry
and the drag snap. The divider is a fixed-width strip (here 3 cols:
`[pad-left][glyph][pad-right]`; the pad columns widen the drag hit-zone without
painting a heavier line). Each pane's inner size is the ratio-derived center minus
the strip's own width, then clamped so neither pane shrinks below a usable floor —
degrade best-effort (return the floor) on a terminal too small, rather than
panicking.

```go
const (
	minPanelInnerCols = 14 // floor: a pane never shrinks below this many content cols
	widthBreakpoint   = 80 // m.width < this → flip to 1-col stacked (single threshold)

	// Divider strip — 3 cols total: [pad-left][glyph][pad-right]. The pad cols
	// widen the drag hit-zone without painting a heavier separator.
	dividerPadLeft  = 1
	dividerPadRight = 1
	dividerWidth    = dividerPadLeft + 1 + dividerPadRight // = 3

	// 1-col stacked mirror on the Y axis.
	minPanelInnerRows = 4
	dividerHeight     = 1
)

// leftInnerWidth turns the drag-adjustable ratio into the first pane's content
// column count. ratio represents the COLUMN OF THE DIVIDER GLYPH (not the right
// edge of the pane), so dividerCenter = round(m.width*ratio) and
// leftInner = dividerCenter - dividerPadLeft. Clamping keeps each pane ≥
// minPanelInnerCols while reserving dividerWidth for the strip. On a terminal too
// narrow to fit both panes plus the divider, degrade best-effort (return the floor).
func (m model) leftInnerWidth() int {
	dividerCenter := int(float64(m.width)*m.leftRatio + 0.5)
	li := dividerCenter - dividerPadLeft

	hi := m.width - dividerWidth - minPanelInnerCols // leave room for the second pane
	if hi < minPanelInnerCols {
		hi = minPanelInnerCols
	}
	if li < minPanelInnerCols {
		li = minPanelInnerCols
	}
	if li > hi {
		li = hi
	}
	return li
}
```

Once you have the inner sizes, the second pane fills what's left after the strip:
`rightInner = m.width - leftInner - dividerWidth` and `dividerStart = leftInner`
(the strip begins exactly where the first pane's content ends). The Y-axis (stacked)
variant is the exact mirror — same clamp discipline, `dividerHeight` reserved
instead of `dividerWidth`.

**Rules to keep verbatim:**
- *The ratio represents the COLUMN (or ROW) OF THE DIVIDER GLYPH, not the right edge of the pane — so the same value drives both the geometry and the drag snap.*
- *On a terminal too small to fit both panes plus the strip, degrade best-effort (return the floor) instead of panicking.*
- *The pad columns widen the drag hit-zone without painting a heavier separator.*

---

## Per-row / per-frame performance

These keep a TUI cheap and jitter-free when something refreshes on a timer (a poll
loop, an agent writing files beside you) and each visible row carries a value
expensive to compute. The throughline: **decouple the expensive compute from the
render path, key it by stable identity, and only re-render when the underlying data
actually changed.**

### Cache expensive per-row compute

When every visible row needs a costly value, do **not** compute it lazily during
render and do **not** recompute per viewport. Compute the whole set once per refresh
cycle into a map keyed by stable identity, and let the render do an O(1) lookup per
row. A render that triggers compute couples cost to frame rate; a viewport-keyed
cache flickers values "into existence" as you scroll and breaks any roll-up that
needs the full set.

```go
// itemStat caches one item's expensive value keyed by its on-disk identity
// (mtime+size). On the next refresh a cache hit skips re-computing it: the
// steady-state cost drops from a full read to a single stat. ok=false caches
// "unreadable/binary" so such an item is not re-read every tick either.
type itemStat struct {
	mtime int64
	size  int64
	value int
	ok    bool
}

type statCache map[string]itemStat

// computeSet fills per-item values, returns the refreshed cache. Each item is
// stat'd; on a cache hit (same mtime+size as `prev`) the cached value is reused
// without re-reading. Only a fresh read (new or changed item) counts against
// `limit`, so steady-state refreshes do near-zero I/O. An over-limit fresh item is
// left uncounted (and uncached) so a later tick under the limit can still pick it up.
func computeSet(items map[string]item, prev statCache, limit int) statCache {
	next := statCache{}
	reads := 0
	for key, it := range items {
		info, err := os.Stat(it.path)
		if err != nil || info.IsDir() {
			continue
		}
		mt, sz := info.ModTime().UnixNano(), info.Size()
		if c, hit := prev[key]; hit && c.mtime == mt && c.size == sz {
			next[key] = c // unchanged since last refresh → reuse, skip the read
			continue
		}
		if reads >= limit {
			continue // over the read budget this tick: retry next tick
		}
		reads++
		v, ok := expensiveCompute(it.path)
		next[key] = itemStat{mtime: mt, size: sz, value: v, ok: ok}
	}
	return next
}
```

Two load-bearing details that die in naive generalization — keep both: cache hits do
**not** count against `limit` (only fresh reads do); an over-limit fresh item is
left uncounted **and uncached** so a later tick picks it up. And `ok=false` caches
"unreadable/binary" so an unprocessable item isn't re-read every tick.

**Invalidate by identity, not by clock:** the key is `(mtime, size)`. To adapt to a
non-filesystem domain, replace it with whatever pair cheaply proves the item is
unchanged. **Race-free by construction, no lock:** the async goroutine only *reads*
`prev` and builds a fresh `next`; the main loop only *reassigns* the cache field
when the result lands, gated by a generation counter.

```go
case statRefreshedMsg:
	// Async snapshot landed. Clear the in-flight guard so the next tick can
	// dispatch again, and apply only if this is still the latest dispatch (a
	// stale result from an earlier, slower refresh is dropped).
	m.inFlight = false
	if msg.gen == m.gen { // gen-counter DISCARDS stale results
		m.state = msg.state
		m.cache = msg.cache
	}
```

### Poll/refresh without re-rendering the world

Drive a background refresh with a self-rescheduling `tea.Tick`. The trap: a naive
poll rebuilds and re-renders **every** tick. Two-tier gating fixes it — a cheap
content fingerprint decides whether to rebuild the list at all, and a per-item check
decides whether the (expensive) detail view re-renders.

```go
type tickMsg struct{}

func tickCmd() tea.Cmd {
	return tea.Tick(pollInterval, func(time.Time) tea.Msg { return tickMsg{} })
}
```

**Tier 1 — content fingerprint gate.** Fold the whole listing into one cheap hash;
an unchanged set costs one read + a hash compare, then returns early.

```go
// dirSig is a cheap content-fingerprint of a listing: it folds each entry's
// identity into one hash. The poll loop compares it tick-to-tick and rebuilds only
// when it changes, so an unchanged set costs one read and nothing else. mtime is
// what lets it notice an in-place edit that keeps the size unchanged.
func dirSig(entries []entry) uint64 {
	h := fnv.New64a()
	var num [8]byte
	for _, e := range entries {
		h.Write([]byte(e.name))
		binary.LittleEndian.PutUint64(num[:], uint64(e.size))
		h.Write(num[:])
		binary.LittleEndian.PutUint64(num[:], uint64(e.modTime.UnixNano()))
		h.Write(num[:])
	}
	return h.Sum64()
}
```

**Tier 2 — per-item gate.** Root cause of the classic bug: the change-detection gate
is at the directory level, but the detail view depends on a single item's content —
the two concepts "listing changed" and "selected item changed" get conflated, so any
sibling change drags the selected item into a needless re-render. The fix snapshots
the selected item before the swap and compares the same fields the fingerprint folds;
only re-render the detail view when *that one item* actually changed.

```go
sig := dirSig(entries)
if sig == m.fsSig {
	return // nothing changed on disk
}
m.fsSig = sig

// Snapshot the selected entry (by value) before the swap. dirSig fired because
// SOMETHING changed, but the detail view depends only on the selected item —
// comparing this snapshot against the post-swap selection tells us whether that one
// item changed, distinct from "a sibling changed".
var oldSel entry
hadSel := m.cursor < len(m.entries)
if hadSel {
	oldSel = m.entries[m.cursor]
}
// ... swap in the new listing, keep cursor on the same NAME (not index) ...

// Selected item unchanged? The list already reflects the sibling churn — so leave
// the detail view alone. Re-rendering would reset state and stamp a placeholder,
// forcing a re-render of an identical item: pure CPU churn plus a one-frame flash
// every poll tick while an agent writes files beside us.
if foundSameName && m.cursor < len(m.entries) {
	newSel := m.entries[m.cursor]
	if oldSel.isDir == newSel.isDir &&
		oldSel.size == newSel.size &&
		oldSel.modTime.Equal(newSel.modTime) {
		return // list updated; selected item is byte-identical — detail view stays
	}
}
m.refreshPreview() // selected item changed: re-read + re-render
```

A refresh whose state is invisible to the fingerprint (e.g. a `git` stage/commit
changes status without touching any file's mtime/size) must be polled
**independently** of the fingerprint gate, guarded by an in-flight flag plus a gen
counter so a slow refresh never stacks and a stale result is dropped on arrival:

```go
case tickMsg:
	if m.mode == modeNormal && !m.dragging {
		m.syncFromDisk()
	}
	cmd = tickCmd()
	if m.state.active && !m.inFlight {
		m.inFlight = true
		m.gen++ // tag this dispatch; stale results are dropped on arrival
		cmd = tea.Batch(tickCmd(), refreshCmd(m.gen, m.cache))
	}
```

### Fixed-width reserved slot for a transient spinner

A transient activity indicator (an async render in flight) must occupy a
**fixed-width reserved slot**, never be prepended into the status string. The
spinner is a braille cycle advanced one frame per ~100ms by its own tick Cmd, where
**each glyph is one display column, so the reserved status-bar slot never changes
width** — no layout jitter.

```go
// spinnerFrames is the braille spinner cycled one frame per ~100ms while work is
// in flight. Each glyph is one display column, so the reserved status-bar slot
// never changes width.
var spinnerFrames = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
```

The slot is a fixed 2 columns at the **right edge** — glyph while active, blank when
idle — so the hints stay flush-left at a constant width:

```go
// The spinner lives in a fixed 2-col slot at the RIGHT edge: a reserved slot (space
// + glyph while active, two spaces when idle) keeps the hints flush-left at a
// constant width, so in-flight work never shifts or clips them. Prepending the
// indicator used to reflow the whole bar — that was the footer flicker.
contentW := m.width - 2 // statusBarStyle Padding(0,1) eats one col each side
slot := "  "
if m.pendingWidth > 0 {
	slot = " " + renderingStyle.Render(spinnerFrames[m.spinnerFrame%len(spinnerFrames)])
}
left := fitWidth(status, contentW-2)
pad := strings.Repeat(" ", max(0, contentW-2-lipgloss.Width(left)))
return statusBarStyle.Width(m.width).Render(left + pad + slot)
```

The spinner loop is **self-terminating** — it only reschedules while work is
pending, so an idle UI is never woken at 10Hz:

```go
case spinnerTickMsg:
	if m.pendingWidth > 0 {
		m.spinnerFrame++
		return m, spinnerTickCmd()
	}
	m.spinning, m.spinnerFrame = false, 0
	return m, nil
```

**Footer-flicker root cause + fix:** the indicator was originally *prepended* to the
status string, so toggling it on/off shifted everything after it sideways — the chip
plus all hints jumped right by the prefix's display width, and because the
now-longer string was clipped to `width-2`, the trailing hints were truncated at the
same instant; the indicator meant to reassure "still working" read as a glitch. The
fix keeps the signal but kills the reflow: a **fixed-width slot at the right edge**
holds a glyph while active and equal-width blanks when idle, so the slot's presence
never changes the position or width of anything else. A right-edge reserved slot —
not a left prefix — is the load-bearing structural choice; any transient indicator
in a fixed-width bar should reserve its space, never push neighbors.

---

## Column alignment with Unicode/emoji

**NEVER** use `fmt.Sprintf("%-*s")` for columns containing emoji or Unicode. Go's
`%s` counts **bytes**, not visual width. `🔴` = 4 bytes but 2 visual columns →
alignment breaks. Use `lipgloss.Width()` (go-runewidth under the hood) for visual
width, and pad with a sized style:

```go
// ❌ WRONG — byte-counting breaks alignment
row := fmt.Sprintf("%-40s %-9s %9s", "🔴 "+name, status, count)

// ✅ CORRECT — lipgloss pads on visual width
icon := statusIcon(s) + " "
nameCol := lipgloss.NewStyle().Width(nameW).Render(name)
statCol := lipgloss.NewStyle().Width(9).Render(status)
numCol := lipgloss.NewStyle().Width(9).Align(lipgloss.Right).Render(count)
line := icon + nameCol + " " + statCol + " " + numCol
```

### ANSI-aware columns (colored cells)

When a column has per-cell colors, pad to fixed width **inside** the style call —
`lipgloss.Width()` ignores ANSI escapes, so padding outside the style breaks:

```go
// ✅ lipgloss pads based on visible chars, then wraps with ANSI
deltaCol := redStyle.Width(colDelta).Align(lipgloss.Right).Render("+" + fmtInt(d))
```

### Column layout with constant widths

Define column widths as constants; use lipgloss for both header and data rows to
guarantee alignment.

```go
const (
	colIcon  = 3 // emoji(2) + space(1)
	colStat  = 9
	colTot   = 9
	colDelta = 8
	colGaps  = 4 // spaces between columns
)
nameW := max(20, termWidth-colIcon-colStat-colTot-colDelta-colGaps)

lCol := func(s string, w int) string { return lipgloss.NewStyle().Width(w).Render(s) }
rCol := func(s string, w int) string {
	return lipgloss.NewStyle().Width(w).Align(lipgloss.Right).Render(s)
}

hdr := "   " + lCol("NAME", nameW) + " " + rCol("TOTAL", colTot) + " " + rCol("DELTA", colDelta)
row := icon + lCol(name, nameW) + " " + rCol(total, colTot) + " " + deltaCol
```

### Table abstraction

```go
type Column struct {
	Width int
	Align lipgloss.Position
}

type Table struct{ columns []Column }

func NewTable(columns []Column) *Table { return &Table{columns: columns} }

func (t *Table) row(cells []string, fg color.Color) string {
	var rendered []string
	for i, cell := range cells {
		if i >= len(t.columns) {
			break
		}
		c := t.columns[i]
		style := lipgloss.NewStyle().Width(c.Width)
		if c.Align == lipgloss.Right {
			style = style.Align(lipgloss.Right)
		}
		if fg != nil {
			style = style.Foreground(fg)
		}
		rendered = append(rendered, style.Render(cell))
	}
	return lipgloss.JoinHorizontal(lipgloss.Top, rendered...)
}

func (t *Table) Row(cells ...string) string    { return t.row(cells, nil) }
func (t *Table) Header(cells ...string) string  { return t.row(cells, colDim) }
```

---

## Filter / search mode

A `mode` field gates text input from navigation keys. In v2, printable input is in
`msg.Text`; named keys via `msg.String()`.

```go
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyPressMsg:
		if m.mode == modeSearch {
			return m.updateSearch(msg)
		}
		switch msg.String() {
		case "/":
			m.mode = modeSearch
			m.query = ""
		case "esc":
			m.query = ""
			m.applyFilter()
		}
	}
	return m, nil
}

func (m model) updateSearch(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		m.mode = modeNormal
		m.applyFilter()
	case "esc":
		m.mode = modeNormal
		m.query = ""
		m.applyFilter()
	case "backspace":
		if m.query != "" {
			r := []rune(m.query)
			m.query = string(r[:len(r)-1])
			m.applyFilter()
		}
	default:
		if msg.Text != "" { // printable chars only — empty for arrows/fn keys
			m.query += msg.Text
			m.applyFilter()
		}
	}
	return m, nil
}

func (m *model) applyFilter() {
	if m.query == "" {
		m.filtered = m.items
		return
	}
	var out []Item
	q := strings.ToLower(m.query)
	for _, it := range m.items {
		if strings.Contains(strings.ToLower(it.Name), q) {
			out = append(out, it)
		}
	}
	m.filtered = out
}
```

---

## Scroll / pagination

```go
func (m model) visibleRows() int { return max(1, m.height-2) } // status + 1 chrome row

// In Update (named keys via .String()):
case "up", "k":
	if m.cursor > 0 {
		m.cursor--
	}
case "down", "j":
	if m.cursor < len(m.filtered)-1 {
		m.cursor++
	}

// listTop keeps the cursor visible without storing a separate offset:
func (m model) listTopFor(rows int) int {
	if m.cursor < rows {
		return 0
	}
	return m.cursor - rows + 1
}
```

---

## Integer formatting (with commas)

Go has no `%,d`:

```go
func fmtInt(n int) string {
	if n < 0 {
		return "-" + fmtInt(-n)
	}
	s := strconv.Itoa(n)
	if len(s) <= 3 {
		return s
	}
	var groups []string
	for i := len(s); i > 0; i -= 3 {
		groups = append([]string{s[max(0, i-3):i]}, groups...)
	}
	return strings.Join(groups, ",")
}
```

---

## Severity / status classification

One accent per family — never a rainbow:

```go
type severity int

const (
	sevOK severity = iota
	sevInfo
	sevWarn
	sevCrit
)

func (s severity) Icon() string { return [...]string{"  ", "🔵", "🟡", "🔴"}[s] }

func sevStyle(s severity) lipgloss.Style {
	switch s {
	case sevCrit:
		return lipgloss.NewStyle().Bold(true).Foreground(colDanger)
	case sevWarn:
		return lipgloss.NewStyle().Bold(true).Foreground(colWarn)
	default:
		return lipgloss.NewStyle().Foreground(colDim)
	}
}

func classify(total int) severity {
	switch {
	case total >= 10000:
		return sevCrit
	case total >= 1000:
		return sevWarn
	default:
		return sevOK
	}
}
```
