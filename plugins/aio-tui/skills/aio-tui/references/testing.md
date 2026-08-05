# Testing a v2 TUI: Design, Harnesses & Visual Verdict

SKILL.md gives the four-layer ladder. This is how you actually build each rung: the
harness helpers that make layer 1 cheap, what deserves a test at all, the ANSI-dump
pipeline that feeds a **visual verdict**, and the two kept artifacts (a byte-identity
pin and a dogfood harness) that catch what assertions cannot.

---

## The harness: three helpers carry the whole suite

Almost every TUI test starts the same way — a model at a known size with known
content. Build that once.

```go
// modelAt returns a model rooted at dir, sized, with the keymap wired and telemetry
// off — the state a real program reaches after its first WindowSizeMsg. Tests that
// need the real Update edge send messages instead; this is for the many that just
// need a sane starting frame.
func modelAt(t *testing.T, dir string, width, height int) model {
	t.Helper()
	m := model{
		root: dir, cwd: dir,
		leftRatio: 0.38, topRatio: 0.33,
		keymap: defaultKeyMap(),
		width:  width, height: height,
		tel: noopRecorder{},
	}
	m.reload()
	return m
}

// renderNow drives the async render pipeline to completion SYNCHRONOUSLY, the way
// the Bubbletea event loop eventually would: dispatch the Cmd, run it inline, apply
// the result. This lets a unit test assert the styled output without spinning the
// real program (and its 1s poll loop). No-op when nothing needs rendering.
func (m *model) renderNow() {
	if cmd := m.syncPreview(); cmd != nil {
		if msg, ok := cmd().(previewRenderedMsg); ok {
			m.applyPreview(msg)
		}
	}
}

// seeContent returns the ansi-stripped rendered screen — what the user's eye reads.
func seeContent(m model) string { return ansi.Strip(m.View().Content) }
```

`renderNow` is the single most valuable helper in an async TUI: it collapses
dispatch → goroutine → message → apply into one call, so a test can assert the
*final* state without a scheduler.

### Two oracles, used for different questions

| Question | Oracle |
|---|---|
| What does the user **see**? (names, badges, rows, status text, alignment) | `ansi.Strip(m.View().Content)` |
| Did the **transition** happen correctly? (focus, scroll offset, cursor, mode) | model fields (`m.focusPane`, `m.previewTop`, `m.cursor`) |

Mixing them is how tests become both brittle and blind: asserting a scroll offset
through the rendered string breaks on every chrome change, and asserting focus
*only* through a field lets a broken focus indicator ship.

### Key construction, probe-verified

v2 key messages are structs, not runes-in-a-slice. Build them once and verify they
stringify to what `key.Matches` expects:

```go
func keyRune(r rune) tea.KeyPressMsg { return tea.KeyPressMsg{Code: r, Text: string(r)} }
func keyCtrl(r rune) tea.KeyPressMsg { return tea.KeyPressMsg{Code: r, Mod: tea.ModCtrl} }
func keyEnter() tea.KeyPressMsg      { return tea.KeyPressMsg{Code: tea.KeyEnter} }
func keyEsc() tea.KeyPressMsg        { return tea.KeyPressMsg{Code: tea.KeyEscape} }
func keyTab() tea.KeyPressMsg        { return tea.KeyPressMsg{Code: tea.KeyTab} }
func keyDown() tea.KeyPressMsg       { return tea.KeyPressMsg{Code: tea.KeyDown} }

// press feeds one key through the LIVE Update path and returns the next state.
func press(t *testing.T, m model, k tea.KeyPressMsg) model {
	t.Helper()
	var tm tea.Model = m
	tm, _ = tm.Update(k)
	return tm.(model)
}
```

**Drive keys through `Update`, never by calling `enterSearch()`/`exitHelp()`
directly.** A test that calls the internal function proves the function works; it
proves nothing about whether the key reaches it. The binding, the dispatch lane, and
the mode guard are exactly where the bugs live.

---

## What to test: the invariant, not the appearance

A layer-1 test earns its place when it pins something that would otherwise drift
silently. Four categories cover most of a TUI.

### 1. Geometry math — table-driven, including the degenerate cases

Every clamp function gets a table whose rows are named after the *reason* they exist,
and which explicitly includes the sizes nobody designs for:

```go
func TestLeftInnerWidthClamp(t *testing.T) {
	cases := []struct {
		name  string
		width int
		ratio float64
		want  int
	}{
		{"normal split", 100, 0.38, 37},
		{"clamp too small", 100, 0.05, minPanelInnerCols},
		{"clamp too large", 100, 0.95, 100 - dividerWidth - minPanelInnerCols},
		{"at floor", 100, 0.15, minPanelInnerCols},
		{"rounds to nearest", 100, 0.380, 37},
		{"min total width", 31, 0.55, minPanelInnerCols},   // exactly 14 + 3 + 14
		{"degenerate tiny", 20, 0.50, minPanelInnerCols},   // below minimum: no panic
	}
	for _, c := range cases {
		m := model{width: c.width, leftRatio: c.ratio}
		if got := m.leftInnerWidth(); got != c.want {
			t.Errorf("%s: leftInnerWidth(width=%d, ratio=%.3f) = %d, want %d",
				c.name, c.width, c.ratio, got, c.want)
		}
	}
}
```

Write the arithmetic **into the case comment** (`round(29*0.33)=10 → no clamp`) so a
failure tells you whether the code or the expectation moved.

Pin a responsive threshold to the exact comparison — `<` vs `≤` is a real bug:

```go
// Pins the trigger to the constant: width < widthBreakpoint → vertical;
// width >= widthBreakpoint → horizontal. Confirms `<`, not `≤`.
func TestLayoutBoundariesAroundBreakpoint(t *testing.T) {
	for _, c := range []struct {
		width        int
		wantVertical bool
	}{
		{widthBreakpoint - 1, true},
		{widthBreakpoint, false},
		{widthBreakpoint + 1, false},
	} { ... }
}
```

### 2. Frame invariants — the properties, not the pixels

Cheaper than a golden file and far more durable, because they survive intentional
redesigns:

```go
// TestViewFillsHeight locks the invariant that View renders exactly m.height rows —
// no blank "spare" line at the bottom, so the UI sits flush against the terminal
// floor. Regression guard for a layout() that subtracted an extra row.
func TestViewFillsHeight(t *testing.T) {
	for _, h := range []int{10, 20, 30, 50} {
		m := newModel(".", noopRecorder{})
		nm, _ := m.Update(tea.WindowSizeMsg{Width: 120, Height: h})
		lines := strings.Count(nm.(model).View().Content, "\n") + 1
		if lines != h {
			t.Errorf("height=%d: View rendered %d lines, want %d (gap=%d)", h, lines, h, h-lines)
		}
	}
}
```

The invariant family worth writing for any TUI:

- **Height**: the frame is exactly `m.height` lines at every size.
- **Width**: no rendered line's `lipgloss.Width` exceeds `m.width` (run it at 80×24
  *and* a narrow 60×24 — overflow only shows up when something is tight).
- **Orientation parity**: the same interaction reaches the same state in both
  layouts — drive it at width 100 and width 60.
- **Two renderers, one row**: when a row format is shared by two panes, assert the
  same entry renders **byte-identically** in both.

### 3. Async correctness — prove the work left the Update goroutine

The headline contract of an async pipeline is *"the synchronous step must not do the
heavy work"*. Assert the negative:

```go
// Selecting a markdown file must NOT run the renderer inline in refreshPreview
// (that blocks the single Update goroutine → the UI freezes with no feedback).
// refreshPreview shows the raw source instantly as a placeholder, and syncPreview
// hands back a Cmd that does the heavy render off-loop.
func TestRenderIsAsync(t *testing.T) {
	m := modelAt(t, dir, 100, 30)
	if m.previewPreStyled {
		t.Fatal("rendered synchronously in refreshPreview — that blocks Update and freezes the UI")
	}
	m.renderNow() // now drive the Cmd
	if !m.previewPreStyled {
		t.Fatal("async render did not land")
	}
}
```

Then pin the **stale guard** directly, because it is the one piece that only
misbehaves under a race you cannot reproduce by hand: dispatch a render, bump the
generation (simulating navigation), deliver the old result, and assert it was
dropped.

### 4. State machines — the transitions AND the refusals

For every mode/sub-state, test both directions and the no-ops you deliberately
built. A gated no-op with no test is indistinguishable from a bug:

- `/` enters search; `esc` restores the **exact** pre-search listing, cursor, and offset.
- A mutation key under the wrong focus changes nothing.
- While a selection sub-state is alive, a navigation key moves the *selection*, not the cursor.
- `backspace` on an empty palette query closes it.

---

## The dump harness: ANSI frames for a visual verdict

String assertions catch *byte changed*; they never catch *looks wrong* — alignment,
color, spacing, a box that reads as double-framed. For that, render real frames and
have an agent judge them.

Keep the dumper **in the test suite** (it has the fixtures and the model builders
already) and **gate it on an env var**, so a normal `go test` never writes outside
its temp dirs:

```go
// TestDumpFrames is the Level-4 (visual) harness: it writes raw-ANSI frames of
// View() to $APP_DUMP_DIR so they can be rendered to images and judged against the
// design intent. Gated on the env var.
//
//	APP_DUMP_DIR=/tmp/ui-visual go test -run TestDumpFrames .
func TestDumpFrames(t *testing.T) {
	outDir := os.Getenv("APP_DUMP_DIR")
	if outDir == "" {
		t.Skip("set APP_DUMP_DIR to dump View() frames for visual inspection")
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}

	// In lipgloss v2 a style always renders full truecolor ANSI; downsampling
	// happens only at the program's output writer, not at render time. So the dumped
	// frames carry the REAL colors even though go test's stdout is not a TTY — no
	// global color-profile override is needed.
	m := modelAt(t, dir, 90, 24)
	m.renderStyle = "dark" // the style main() would resolve on a dark terminal

	// Frame 1: render in flight — placeholder + the "rendering" chip.
	m.pendingWidth = m.previewBodyWidth()
	write(t, outDir, "01-rendering.ansi", m.View().Content)

	// Frame 2: render landed — styled output, chip gone.
	m.pendingWidth = 0
	m.renderNow()
	write(t, outDir, "02-rendered.ansi", m.View().Content)
}
```

### Choosing frames: one per *decision*, not one per feature

A dump set is only useful if each frame isolates something a reviewer can rule on.
The pattern that works: **pair frames that differ in exactly one variable.**

- state on / state off (spinner in flight vs. idle);
- focus on pane A vs. pane B (does the glow read at the boundary?);
- 2-col wide vs. 1-col narrow (does the responsive flip preserve the design?);
- 80×24 vs. 60×24 with an overlay open (does anything overflow or wrap?).

Name them with a numeric prefix (`01-…`, `02-…`) so the reviewer sees them in the
intended order, and write the *design intent* for each frame in the test's doc
comment — that comment is the rubric the verdict is graded against.

### The pipeline

```bash
# 1. Dump raw ANSI frames from the test suite.
APP_DUMP_DIR=/tmp/ui-visual go test -run TestDumpFrames .

# 2. ANSI → PNG. freeze renders a static frame; vhs drives a .tape for motion.
for f in /tmp/ui-visual/*.ansi; do
  freeze "$f" -o "${f%.ansi}.png"
done

# 3. Hand each PNG to an agent with the design intent as the rubric, and get back a
#    structured pass/fail + reasons (e.g. the oh-my-claudecode:visual-verdict skill).
```

**Treat a failed visual verdict exactly like a failed assertion**: fix → re-dump →
re-judge. Do not "note it for later" — a visual regression that survives one commit
becomes the new baseline.

### What the verdict can see that a string cannot

Write the rubric in these terms, because they are the failures strings miss:

- **Chrome shape** — border present/absent, rounded vs. square, and crucially *no
  background fill* (an opaque panel inside a border reads as double-framed).
- **Color semantics** — one accent used consistently; added/removed/warning colors
  distinguishable; the muted tier actually muted.
- **Alignment** — columns line up across rows, including rows with emoji/CJK.
- **Weight** — the focus indicator draws the eye without dominating; a spinner does
  not shift its neighbours.
- **Overflow** — nothing wraps, clips a trailing hint, or spills past the pane edge.

Record the verdict **and its date** in the PRD/ADR next to the decision it validates.
A verdict is evidence with a shelf life: it certifies the frame you rendered that
day, not the design forever.

---

## Two kept artifacts

### A byte-identity pin

When a cross-cutting feature must be **invisible** in the UI (telemetry, a metrics
counter, a debug hook), one test pins that invariant harder than any prose can:
capture the frame under every configuration and assert they are byte-identical.

```go
// The rendered TUI must be byte-for-byte identical to a build with the feature off.
// View() never touches the recorder; render goroutines never block on it; the only
// field it writes is internal and never surfaced in the frame. This pins the
// invariant against drift — any change that makes it visible fails here.
func TestFrameByteIdenticalAcrossModes(t *testing.T) {
	captureFrame := func(tel Recorder) string {
		var m tea.Model = newModel(dir, tel)
		m, _ = m.Update(tea.WindowSizeMsg{Width: 80, Height: 24})
		// One nav step so the frame reflects a real interaction, not just construction.
		m, _ = m.Update(tea.KeyPressMsg{Code: 'j', Text: "j"})
		return m.(model).View().Content
	}

	frameOff := captureFrame(noopRecorder{})            // baseline: explicitly off
	frameDisabled := captureFrame(InitTelemetry())      // enabled-but-unconfigured path
	frameOn := captureFrame(newRealRecorder(offlineTransport{})) // fully wired, blocked transport

	if frameOff != frameDisabled || frameOff != frameOn {
		t.Error("the feature leaked into the rendered frame")
	}
}
```

The third mode is the one that matters: a **fully-wired recorder with a blocked
transport** proves the active path's syscalls, atomics, and channel sends leave
`View()` untouched. Testing only the disabled path proves nothing.

The generalization: **any "must not be observable" claim deserves a comparison test,
not a comment.**

### A dogfood harness that measures instead of asserting

The highest-value test in a UI suite is often not pass/fail at all. Drive the model
the way a real user would through the app's actual jobs-to-be-done, and record the
friction:

```go
// TestDogfoodBesideAgent DRIVES the model the way a real user would and quantifies
// the friction of the recurring tasks the app exists for.
//
// This is a KEPT artifact — the bookend against which future capability changes are
// re-measured. It does NOT assert pass/fail on whether a task is achievable: an
// UNREACHABLE goal is DATA, not a test failure. Every task uses t.Logf to record
// (achievable? · keystrokes · friction · evidence). The test fails only if the
// harness cannot drive the model — a real bug.
//
// Conventions:
//   - One chord = one keystroke (ctrl+p counts as 1, not 5).
//   - Keys go through the LIVE Update path, the same edge a real keypress takes.
//   - View().Content (ansi-stripped) is the oracle for what the user SEES; model
//     fields are the oracle for transition correctness not visible in the string.
func TestDogfoodBesideAgent(t *testing.T) {
	t.Run("T1_find_changed_file", t1FindChangedFile)
	t.Run("T2_copy_path", t2CopyPath)
	t.Run("T3_deep_navigate", t3DeepNavigate)
	...
}
```

Why this is worth keeping: a suite full of green unit tests tells you the parts
work. A keystroke count tells you the *product* works. When a redesign drops a task
from 7 keystrokes to 3, that is the evidence the redesign was worth shipping — and
when it silently goes from 3 to 6, nothing else in the suite notices.

---

## Determinism, fixtures, and the traps

**Color profile.** There is nothing to pin — lipgloss v2 removed `SetColorProfile`.
A style always renders full truecolor ANSI; downsampling happens only at the output
writer. Golden and dumped frames therefore carry the real colors and are stable
across machines **even though `go test`'s stdout is not a TTY**. What you *do* pin is
the palette *decision* your app made at startup: set the field directly
(`m.renderStyle = "dark"`).

**Shelling out.** Give the external tool a deterministic identity and fail loudly
with its combined output:

```go
func gitExec(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", append([]string{"-C", dir}, args...)...)
	// Deterministic identity so `commit` works in CI without a global config.
	cmd.Env = append(os.Environ(),
		"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@t",
		"GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@t",
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
	}
}
```

**Environment.** Inject `getenv` into anything that reads it (`editorCommand(getenv,
…)`), or use `t.Setenv`. Never mutate process env by hand — it leaks across tests.

**Effects that don't exist in CI.** The clipboard has no helper in CI, the editor
does not exist. So split every such feature into a **pure builder** (the string to
copy, the `*exec.Cmd` to run) and a **thin effect** (the write, the spawn). Test the
builder exhaustively; the effect gets one smoke test at most.

**A fake that records payloads**, not just counts, so a test can assert the exact
event shape:

```go
// fieldRecorder captures every Record call with its fields so a test can assert the
// exact payload (not just a count). Active() stays false to keep the model on its
// production-off hot path.
type fieldRecorder struct{ events []recEvent }

func (r *fieldRecorder) Record(name string, fields map[string]any) {
	r.events = append(r.events, recEvent{name: name, fields: fields})
}
func (r *fieldRecorder) Active() bool { return false }
```

**teatest, the import-path footgun.** On a bubbletea **v2** project teatest is
`github.com/charmbracelet/x/exp/teatest/v2` — not the v1 path, which compiles
against the wrong `tea.Model`/`View` shapes. And if `Init()` returns a recurring
tick, you **must** `tm.Quit()` early or the test hangs to the timeout.

---

## The gate

Nothing is "done" until this passes — plus a visual verdict whenever the change
touched rendering:

```bash
go build -o app . && go vet ./... && go test ./... && go test -race ./...
```

Reach for teatest only for genuinely multi-step interaction flows. Layers 1 and 2
cover the overwhelming majority of a TUI, run in milliseconds, and never hang.
