# Mouse Engineering in Bubbletea v2

Everything past "handle a click": mouse **modes** (and why hover is a different
mode), **zone maps**, focus-follows-click, the three-phase drag gesture, divider
drag as a resizable sidebar, wheel semantics, and how to test all of it without a
terminal. Every snippet is v2-correct.

---

## The v2 mouse API in one screen

Mouse is an **interface**: the message TYPE is the action. There is no `.Action`
field. `.Mouse()` returns the shared cursor payload.

```go
type Mouse struct {
	X, Y   int
	Button MouseButton
	Mod    KeyMod // ModShift / ModAlt / ModCtrl — test with e.Mod.Contains(tea.ModShift)
}
```

| Message type | Fires when |
|---|---|
| `tea.MouseClickMsg` | a button goes **down** |
| `tea.MouseReleaseMsg` | a button comes **up** |
| `tea.MouseWheelMsg` | a wheel notch; direction is in `.Button` |
| `tea.MouseMotionMsg` | the pointer moves (see mode table below) |

Wheel buttons: `tea.MouseWheelUp`, `MouseWheelDown`, **`MouseWheelLeft`,
`MouseWheelRight`** (a trackpad's two-finger sideways swipe — most apps forget
these). Also available: `tea.MouseBackward` / `tea.MouseForward` (thumb buttons).

### Mouse mode decides whether you get hover at all

`v.MouseMode` on the returned `tea.View`:

| Mode | Click / release / wheel | Motion **with** a button held (drag) | Motion with **no** button (hover) |
|---|---|---|---|
| `tea.MouseModeNone` | ✗ | ✗ | ✗ |
| `tea.MouseModeCellMotion` | ✓ | ✓ | **✗** |
| `tea.MouseModeAllMotion` | ✓ | ✓ | ✓ |

**This is the hover gotcha.** Under `MouseModeCellMotion` — the sane default —
`tea.MouseMotionMsg` arrives **only while a button is held**, so every motion event
is a *drag*, never a hover. A hover highlight (row lights up under the bare pointer)
requires `MouseModeAllMotion`, and that has a real cost: the terminal emits a motion
event **per cell crossed**, so every pointer sweep floods the `Update` goroutine and
re-renders the frame. Bubbletea's own docs note cell-motion mode is the
better-supported of the two.

So decide deliberately:

- **Default to `MouseModeCellMotion`.** Click, wheel, and drag cover the vast
  majority of TUI interaction, at a fraction of the event rate.
- **Only opt into `MouseModeAllMotion`** when hover carries information a click
  cannot (a tooltip, a link underline, a chart crosshair). Then treat a hover as a
  *render-only* state: store `hoverRow` and let `View` read it — never let a hover
  trigger I/O, an async dispatch, or a selection change. Guard it with the same
  zone map clicks use, and skip the state write when the row is unchanged so an
  identical frame is not re-rendered per cell:

  ```go
  case tea.MouseMotionMsg:
      if m.dragging || m.dragArmed {
          break // a held button means drag, not hover — handled below
      }
      row, ok := m.rowAt(e.X, e.Y, g)
      if !ok {
          row = -1 // outside any pane: clear the highlight
      }
      if row == m.hoverRow {
          return m, nil // identical state — do not churn a frame per cell crossed
      }
      m.hoverRow = row
  ```

  A hover state must also be **cleared** when the pointer leaves the pane, when a
  mode opens, and on `WindowSizeMsg` — a stale highlight parked on a row that no
  longer exists is the classic all-motion bug.

Set the mode on **every** `View()` return path (including the early "loading…"
frame), or the program drops mouse reporting before the first size message:

```go
v := tea.NewView(content)
v.AltScreen = true
v.MouseMode = tea.MouseModeCellMotion
return v
```

---

## The zone map: hit-testing is geometry, never line-counting

Both `View()` and the mouse handler call the same `layout()` (see
`patterns.md` → *Layout geometry as a single source of truth*), so they can never
disagree about where a row lives. On top of that geometry, classify the coordinate
into a **zone** before doing anything with it.

Three zone families in a typical two-pane app:

1. **Panes** — the primary list, the secondary/preview pane.
2. **No-pane chrome** — the header row, the divider strip, the status row. These
   must **never** route into a pane.
3. **Overlay** — while a modal is open, the mouse is usually ignored wholesale
   (`if m.mode != modeNormal { return m, nil }` at the `Update` call site).

```go
func (m model) handleMouse(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	g := m.layout() // identical geometry to View()
	e := msg.Mouse()

	// overDivider: the divider's hit-zone band in the current orientation. In the
	// 2-col layout the band coincides exactly with the visible 3 cols. In the
	// stacked layout the visible strip is 1 row, and the hit-zone may widen to
	// ±dividerHitRows{Above,Below} — the same affordance without spending screen
	// rows on a painted pad row.
	var overDivider bool
	if g.vertical {
		overDivider = e.Y >= g.dividerYStart-dividerHitRowsAbove &&
			e.Y <= g.dividerYStart+dividerHeight-1+dividerHitRowsBelow
	} else {
		overDivider = e.X >= g.dividerStart && e.X < g.dividerStart+dividerWidth
	}
	...
}
```

### Order of the early returns is load-bearing

Every no-pane guard must return **before** any state mutation — in particular
before the focus assignment, because a click on chrome must not flip focus:

```go
case tea.MouseClickMsg:
	// 1. Divider drag start — a left-press anywhere in the hit-zone. The Y bounds
	//    exclude BOTH the header and the status row: in the 2-col layout
	//    overDivider is X-only, so without the header guard a header-row click in a
	//    divider column would wrongly start a drag.
	if e.Button == tea.MouseLeft && e.Y >= g.firstRow && e.Y < m.height-1 && overDivider {
		m.dragging = true
		if g.vertical { m.setTopFromY(e.Y) } else { m.setLeftFromX(e.X) }
		return m, nil
	}
	// 2. Non-left buttons: nothing to do.
	if e.Button != tea.MouseLeft {
		return m, nil
	}
	// 3. A left-click in the divider zone that was NOT a drag start (status row) is
	//    a no-op — the divider is a "no-pane" zone and must never route to a pane.
	//    It also must not change focus, so this returns BEFORE the focus-set below.
	if overDivider {
		return m, nil
	}
	// 4. The header row is passive chrome — same treatment, same reason.
	if e.Y < g.firstRow {
		return m, nil
	}

	// 5. Now, and only now, the click belongs to a pane.
	overList := false
	listH := g.bodyH
	if g.vertical {
		overList = e.Y < g.dividerYStart
		listH = g.topInner
	} else {
		overList = e.X < g.dividerStart
	}
	...
```

**Rules to keep verbatim:**
- *The divider, the header, and the status row are "no-pane" zones: a click there never routes to a pane and never flips focus.*
- *Every no-pane early-return must come BEFORE the focus assignment, or chrome clicks silently steal focus.*
- *The orientation flag is never stored on the model — it is recomputed in `layout()` each call, so `View()` and the handler can never read a stale value.*

---

## Focus follows the click

A committed click sets focus to the pane it landed in, in sync with the wheel's
mental model: *the pane you just interacted with is the pane the keyboard now acts
on.* Set it after the no-pane returns and before routing the click into the pane's
own handling. `overList` is axis-aware, so focus follows correctly in either
orientation.

```go
if overList {
	m.focusPane = focusList
} else {
	m.focusPane = focusPreview
}
```

### Re-clicking the current selection must be idempotent

The trap: a click handler that unconditionally calls `refreshSelection()` will, on a
re-click of the already-selected row, reset the scroll position and re-dispatch an
async render for **identical** content. Mirror the keyboard's `target == cursor →
return` guard so mouse and keyboard agree:

```go
if idx == m.cursor {
	// Re-clicking the row that is already selected: a folder opens (click-to-open,
	// the one intentional action), a file is a NO-OP. The preview already shows this
	// exact file, so re-running refresh would only reset the scroll and re-dispatch
	// the async render for identical content — a wasted render plus a lost position.
	if m.entries[idx].isDir {
		m.descend()
	} else {
		// The click still moved focus to the list, and an in-pane selection is a
		// focusPreview sub-state — so end it explicitly. The refresh used to cancel
		// it as a side effect; the no-op path must do it itself.
		m.cancelSelection()
	}
} else {
	m.cursor = idx
	m.refreshPreview()
}
```

That last comment is the general lesson: **when you add a no-op fast path, audit
what the slow path was doing as a side effect.** Cancelling a sub-state, clearing a
status message, and resetting a scroll are the usual casualties.

---

## Wheel semantics

Four decisions, each of which users notice when you get it wrong.

**1. A wheel scroll pans the viewport; it does NOT move the selection.** The cursor
may scroll out of view — that is correct. The *next keyboard nav* brings it back.

```go
// scrollList pans the viewport by delta rows WITHOUT moving the cursor — a wheel
// scroll scrolls the list, it does not change the selected item.
func (m *model) scrollList(delta int) {
	maxTop := max(0, len(m.entries)-m.listRows())
	m.listTop = min(max(0, m.listTop+delta), maxTop)
}

// revealCursor slides the offset the minimum needed to bring the cursor back into
// view. Called after a cursor MOVE (keyboard nav, a by-name landing) — never after
// a wheel scroll, which deliberately pans away from the cursor. A no-op when the
// cursor is already visible, so it is safe to call defensively.
func (m *model) revealCursor() {
	h := m.listRows()
	if h <= 0 {
		return
	}
	if m.cursor < m.listTop {
		m.listTop = m.cursor
	} else if m.cursor >= m.listTop+h {
		m.listTop = m.cursor - h + 1
	}
	m.listTop = min(max(0, m.listTop), max(0, len(m.entries)-h))
}
```

The scroll offset is then the single source of truth for what is visible, and the
render path clamps it rather than chasing the cursor:

```go
// listTopFor clamps the stored offset to a valid window top for a pane of h rows.
// It never chases the cursor, so a wheel scroll can park the selection off-screen.
// Render (geometry.listTop) and hit-testing both read this, so they always agree.
func (m model) listTopFor(h int) int {
	return min(max(0, m.listTop), max(0, len(m.entries)-h))
}
```

**2. A wheel over a no-pane zone is a no-op.** Without the guard, the axis-aware
`overList` split routes a header/divider wheel into a pane.

```go
if e.Y < g.firstRow || overDivider {
	return m, nil
}
```

**3. Shift remaps a vertical wheel into a horizontal pan** — mirroring the `h`/`l`
keys — but only over a pane that *has* a horizontal axis. Over the list, Shift is
ignored and the wheel stays a vertical scroll.

```go
// scrollPreviewH itself no-ops in wrap mode or on non-scrollable content, so this
// branch needs no extra gating.
shiftPan := e.Mod.Contains(tea.ModShift) && !overList
```

**4. Handle the native horizontal wheel too.**

```go
switch e.Button {
case tea.MouseWheelUp:
	switch {
	case shiftPan:  m.scrollPreviewH(-previewColStep)
	case overList:  m.scrollList(-listWheelStep)
	default:        m.scrollPreview(-previewLineStep)
	}
case tea.MouseWheelDown:
	switch {
	case shiftPan:  m.scrollPreviewH(previewColStep)
	case overList:  m.scrollList(listWheelStep)
	default:        m.scrollPreview(previewLineStep)
	}
case tea.MouseWheelLeft:
	// Trackpad two-finger sideways swipe. Only the preview has a horizontal axis;
	// over the list this is a no-op.
	if !overList { m.scrollPreviewH(-previewColStep) }
case tea.MouseWheelRight:
	if !overList { m.scrollPreviewH(previewColStep) }
}
```

Keep the wheel step equal to the keyboard's line step (`listWheelStep ==
previewLineStep == 1`) so both panes scroll at the same familiar granularity.

---

## The three-phase drag gesture: arm → commit → apply

A press must not *be* the action, because a plain click (press + release, no
motion) has to mean something different from a drag. Split the gesture:

| Phase | Message | What happens |
|---|---|---|
| **Arm** | `MouseClickMsg` | record the anchor, set `dragArmed`; **do not** enter the drag state |
| **Commit** | first `MouseMotionMsg` | `dragArmed` → the gesture is real; enter it and start tracking |
| **Apply** | `MouseReleaseMsg` | if committed, perform the action; **always** disarm |

```go
// ARM — a left-press inside a drag-capable pane anchors but does NOT commit: a
// plain click (press+release, no motion) must not perform the action.
if m.previewScrollable && !m.previewIsDir {
	m.mouseDragArmed = true
	m.selecting = false
	m.selAnchor = m.srcLineAtRow(e.Y, g)
	m.selCursor = m.selAnchor
	return m, nil
}

// COMMIT — the first motion after an armed press commits the gesture and moves the
// cursor to the line under the pointer. Motion past a pane edge edge-scrolls one
// line, so a drag can extend past the viewport with no keyboard.
case tea.MouseMotionMsg:
	if m.dragging { /* divider drag — see below */ }
	if m.mouseDragArmed {
		_, bodyH := m.previewScroll()
		if e.Y < g.previewFirstRow {
			m.scrollPreview(-previewLineStep)
		} else if e.Y >= g.previewFirstRow+bodyH {
			m.scrollPreview(previewLineStep)
		}
		m.selecting = true
		m.selCursor = m.srcLineAtRow(e.Y, g)
	}
	return m, nil

// APPLY — release-is-commit: one gesture for the mouse crowd. A press+release with
// no motion left selecting=false, so it applies nothing. ALWAYS disarm.
case tea.MouseReleaseMsg:
	m.dragging = false
	if m.mouseDragArmed {
		if m.selecting {
			m.copySelection()
		}
		m.mouseDragArmed = false
	}
	return m, nil
```

The mouse lane must reuse the **same** anchor/cursor fields and the same
apply-function as the keyboard lane — otherwise the two drift and the highlight
stops matching what gets copied.

### Clamp for a drag, reject for a click

The two reverse-map helpers look almost identical and must differ in exactly one
way. A **click** outside the pane is ignored; a **drag** past the pane edge pins to
the boundary line so edge-scroll can extend from it.

```go
// srcLineAtRow — the DRAG mapper. CLAMPS out-of-bounds rows into the visible body.
func (m model) srcLineAtRow(y int, g geometry) int {
	top, bodyH := m.previewScroll()
	off := min(max(0, y-g.previewFirstRow), max(0, bodyH-1))
	src := m.sourceLineAt(top + off)
	return min(max(0, src), max(0, len(m.preview)-1))
}

// previewClick — the CLICK mapper. REJECTS out-of-bounds rows.
func (m *model) previewClick(y int, g geometry) {
	top, bodyH := m.previewScroll()
	row := y - g.previewFirstRow
	if row < 0 || row >= bodyH {
		return // outside the pane (status row, divider, or the other pane)
	}
	// The rendered rows map 1:1, in order, to the SAME slice the renderer drew, so
	// resolve the clicked item straight from it: render + click can never disagree
	// about which entry sits on which row.
	lineIdx := top + row
	if lineIdx >= len(m.previewEntries) {
		return
	}
	...
}
```

---

## Divider drag = a resizable sidebar

The split is stored as a **ratio**, not a column count, so it stays proportional
across terminal resizes. The ratio represents the **column (or row) of the divider
glyph itself** — not the right edge of the first pane — so one value drives both the
geometry and the drag snap.

```go
// setLeftFromX pins the divider glyph under the cursor: column x becomes the
// divider center, so leftRatio = x / m.width. Clicking either pad column snaps the
// glyph to that col — a one-col visual jump that matches click-to-snap. The value
// is stored as a ratio and only clamped at render time (leftInnerWidth), keeping
// the split proportional across terminal resizes.
func (m *model) setLeftFromX(x int) {
	if m.width <= 0 {
		return
	}
	m.leftRatio = float64(x) / float64(m.width)
}

// setTopFromY is the Y-axis mirror for the stacked layout. Both terms carry the
// header offset — this is the exact INVERSE of layout's dividerYStart = headerH +
// topInner: the header shifts the body down, so a screen-Y drag must subtract
// headerH to recover the body-relative row, and bodyH must equal layout's bodyH or
// the divider jumps under the user's finger.
func (m *model) setTopFromY(y int) {
	bodyH := max(m.height-1-headerH, 3)
	if bodyH <= 0 {
		return
	}
	m.topRatio = float64(y-headerH) / float64(bodyH)
}
```

Four things make a divider drag feel right:

**1. Press anywhere in the hit-zone starts the drag AND snaps.** The pad columns
exist purely to widen the target — they paint nothing heavier.

**2. Motion continues on the axis chosen at press time.** The drag-start branch
picked the axis from `g.vertical`; motion just keeps going on it.

**3. Defer expensive work until release.** A reflow/re-render per motion event is
what makes a drag feel like sludge. Gate the async reconciliation on `!m.dragging`
and let the release trigger it:

```go
func (m *model) syncPreview() tea.Cmd {
	if m.dragging {
		return nil // defer the reflow until the divider settles — avoid a render per motion
	}
	...
}
```

The same flag should suspend the background poll loop, so a refresh never churns
the layout mid-drag:

```go
case tickMsg:
	if m.mode == modeNormal && !m.dragging && !m.selecting {
		m.syncFromDisk()
	}
	cmd = tickCmd() // always reschedule regardless
```

**4. Cancel an in-flight drag when a resize flips the orientation.** Otherwise the
drag's axis swaps under the user's finger. Clear `dragging` **before** updating the
cached orientation, so the tail reconcile sees the cleaned state on this very tick
— not one frame late:

```go
case tea.WindowSizeMsg:
	m.width, m.height = msg.Width, msg.Height
	newVertical := m.width < widthBreakpoint
	if newVertical != m.lastVertical {
		m.dragging = false
	}
	m.lastVertical = newVertical
```

`lastVertical` exists for this one purpose — detecting the flip — and is **not**
hysteresis state. Say so at the field, or someone will "improve" it into a second
threshold.

**Rules to keep verbatim:**
- *The ratio represents the COLUMN (or ROW) OF THE DIVIDER GLYPH, not the pane's edge — so the same value drives both the geometry and the drag snap.*
- *Store the split as a ratio; clamp only at render time, so the split stays proportional across resizes.*
- *The pad columns widen the drag hit-zone without painting a heavier separator.*
- *Defer reflow/re-render and suspend the poll loop while `dragging` — the release triggers the settle.*
- *Clear `dragging` when the responsive flip changes the axis, BEFORE caching the new orientation.*

---

## Focus feedback without a chip

Once click and wheel move focus, the user needs to see where focus is — and a
status-bar chip is the lazy answer that costs a row. Cheaper: tint the divider
toward the focused pane, plus dim the inactive pane's cursor row.

```go
// 2-col: the pad column hugging the focused pane carries a half-block accent
// (▐ from the left side, ▌ from the right); the other pad stays blank — still the
// wider drag hit-target, no heavier line painted.
padL := strings.Repeat(" ", dividerPadLeft)
padR := strings.Repeat(" ", dividerPadRight)
if m.focusPane == focusList {
	padL = strings.Repeat(" ", dividerPadLeft-1) + dividerFocusStyle.Render("▐")
} else {
	padR = dividerFocusStyle.Render("▌") + strings.Repeat(" ", dividerPadRight-1)
}
dividerLine := padL + dimStyle.Render(dividerGlyph) + padR

// Stacked: ▔ rides the top edge (hugging the pane above) when the top pane is
// focused, ▁ rides the bottom — the same construct rotated, sized as an
// eighth-block so its visual weight matches the 2-col half-block.
glyph := "▔"
if m.focusPane == focusPreview {
	glyph = "▁"
}
```

The glow style is **foreground only — no background** — so the un-inked half of the
glyph blends into the borderless pane. A background fill paints a colored cell that
no longer matches the surrounding pane.

And the cursor row carries the second signal:

```go
if active {
	st := cursorActiveStyle
	if !listFocused {
		st = cursorActiveStyle.Background(colDim) // returns a COPY; the original is untouched
	}
	...
}
```

---

## Testing mouse without a terminal

Mouse handling is pure model logic, so it unit-tests at layer 1 (see SKILL.md's
testing table). Construct the model at a fixed size, send a typed message, assert
on state:

```go
m := newModel()
m.width, m.height = 100, 30

var tm tea.Model = m
tm, _ = tm.Update(tea.MouseClickMsg{X: 5, Y: 3, Button: tea.MouseLeft})
m = tm.(model)
if m.cursor != 3-headerH {
	t.Fatalf("click did not land on the expected row: got %d", m.cursor)
}
```

Cases worth a test each, because each is a real bug someone shipped:

- a click on the **header row** and on the **status row** changes neither cursor nor focus;
- a click in a **divider column** starts a drag, and a click on the divider's status-row cell does not;
- **press → release with no motion** performs no action, while **press → motion → release** does;
- a **wheel** over the list pans without moving the cursor, and over a no-pane zone does nothing;
- `tea.MouseWheelLeft/Right` pans horizontally only in the pane that has a horizontal axis;
- `e.Mod.Contains(tea.ModShift)` + wheel pans horizontally over the preview and scrolls vertically over the list;
- a **re-click on the selected row** leaves the scroll offset untouched;
- a `WindowSizeMsg` that crosses the breakpoint mid-drag clears `dragging`;
- the same click resolves to the same item in **both** orientations (drive it at width 100 and width 60).
