# Keymap, Modes & Command Palette

How a v2 TUI keeps its input surface small, discoverable, and drift-free. Three
constructs do all the work: a **keymap struct** (the only place a key code lives),
a **mode machine** (exclusive input lanes), and **sub-states** (orthogonal flags
inside a mode). Names are generic — adapt the kernel, drop the domain skin.

---

## The keymap is the single source of truth

Every binding the app reacts to lives in one struct built from
`charm.land/bubbles/v2/key`. Adding a binding means adding a **field** — never a
stray `case "x":` inline in the update switch. The struct carries both halves of a
binding: the key codes *and* the help text, so a hint can never drift from what the
key actually does.

```go
import "charm.land/bubbles/v2/key"

// KeyMap is the single source of truth for which key codes trigger which action
// and what help text describes them. Keep it FLAT (not nested by domain) while the
// app has one normal-mode lane — flat keeps cognitive load low.
type KeyMap struct {
	// Navigation (primary pane)
	MoveUp, MoveDown, GoTop, GoBottom, OpenEntry, GoUp key.Binding

	// Secondary-pane scroll. SAME key codes as the navigation bindings above;
	// dispatch routes by focus. These carry different help text ("scroll" vs
	// "move") — that is the whole reason they exist as separate fields.
	ScrollUp, ScrollDown, HalfPageUp, HalfPageDown, JumpTop, JumpBottom key.Binding

	// Modes
	FocusToggle    key.Binding // tab — pane A ↔ pane B
	Search         key.Binding // /
	CommandPalette key.Binding // ctrl+p
	FullHelp       key.Binding // ?
	Back           key.Binding // esc — one step back, mode-dependent
	Quit           key.Binding
}

// defaultKeyMap returns the ship default. CHANGE A KEY HERE, NOT IN updateNormal.
func defaultKeyMap() KeyMap {
	return KeyMap{
		MoveUp:    key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("↑/k", "move up")),
		MoveDown:  key.NewBinding(key.WithKeys("down", "j"), key.WithHelp("↓/j", "move down")),
		GoTop:     key.NewBinding(key.WithKeys("g"), key.WithHelp("g", "go top")),
		GoBottom:  key.NewBinding(key.WithKeys("G"), key.WithHelp("G", "go bottom")),
		OpenEntry: key.NewBinding(key.WithKeys("enter", "l", "right"), key.WithHelp("enter/l", "open")),
		GoUp:      key.NewBinding(key.WithKeys("h", "left", "backspace"), key.WithHelp("h/bksp", "go up")),

		ScrollUp:     key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("↑/k", "scroll up")),
		ScrollDown:   key.NewBinding(key.WithKeys("down", "j"), key.WithHelp("↓/j", "scroll down")),
		HalfPageUp:   key.NewBinding(key.WithKeys("ctrl+u"), key.WithHelp("ctrl+u", "half page up")),
		HalfPageDown: key.NewBinding(key.WithKeys("ctrl+d"), key.WithHelp("ctrl+d", "half page down")),

		FocusToggle:    key.NewBinding(key.WithKeys("tab"), key.WithHelp("tab", "switch focus")),
		Search:         key.NewBinding(key.WithKeys("/"), key.WithHelp("/", "search")),
		CommandPalette: key.NewBinding(key.WithKeys("ctrl+p"), key.WithHelp("ctrl+p", "commands")),
		FullHelp:       key.NewBinding(key.WithKeys("?"), key.WithHelp("?", "help")),
		Back:           key.NewBinding(key.WithKeys("esc"), key.WithHelp("esc", "back")),
		Quit:           key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
	}
}
```

The update switch then matches bindings, not literals:

```go
switch {
case key.Matches(msg, km.Quit):
	return m, tea.Quit
case key.Matches(msg, km.MoveDown):
	...
}
```

### Key-code sharing is a feature — document it as intentional

`key.Matches` compares **key codes only**; it ignores help text. So two bindings may
deliberately share codes (`MoveDown` ≡ `ScrollDown` = `down`/`j`) and a **single
case** matches either — the *dispatch lane* picks the behavior:

```go
case key.Matches(msg, km.MoveDown): // ≡ km.ScrollDown by key code
	if m.focusPane == focusPrimary {
		m.moveCursor(1)
	} else {
		m.scrollSecondary(1)
	}
```

A future reader will otherwise read the duplicate codes as a double-map bug and
"fix" it. **Write the collision down at the field, and again at the case.** The
same discipline covers a binding that shares a code with another *sub-state* lane
(e.g. `CopySelection` on `y`/`enter` shares with `Yank`/`OpenEntry`, but only fires
while a selection is alive): the gate is the lane, not the code.

### Help is derived, never re-typed

Two projections of the same struct — a **lean** bar and a **grouped** overlay.
Because both read `key.Binding.Help()`, a hint can never disagree with a binding.

```go
// shortHelp — the LEAN status-bar bindings for the current focus. The bottom bar
// is minimal chrome, so it carries only core motion plus the `?` gateway; the long
// tail lives one `?` away in fullHelp, the single full-keymap surface.
func (m model) shortHelp() []key.Binding {
	km := m.keymap
	if m.focusPane == focusPrimary {
		return []key.Binding{km.MoveDown, km.OpenEntry, km.FocusToggle, km.FullHelp, km.Quit}
	}
	// On the secondary pane esc subsumes the focus toggle, so tab is dropped.
	return []key.Binding{km.ScrollDown, km.Back, km.FullHelp, km.Quit}
}

// fullHelp returns bindings grouped for the help overlay; group order matches the
// titles the renderer prints.
func (m model) fullHelp() [][]key.Binding {
	km := m.keymap
	return [][]key.Binding{
		{km.MoveUp, km.MoveDown, km.GoTop, km.GoBottom, km.OpenEntry, km.GoUp},
		{km.ScrollUp, km.ScrollDown, km.HalfPageUp, km.HalfPageDown},
		{km.FocusToggle, km.Search, km.CommandPalette, km.FullHelp, km.Back},
		{km.Quit},
	}
}

func renderShortHelp(bs []key.Binding) string {
	parts := make([]string, 0, len(bs))
	for _, b := range bs {
		hb := b.Help()
		parts = append(parts, "["+hb.Key+"] "+hb.Desc)
	}
	return strings.Join(parts, "  ")
}
```

**Rules to keep verbatim:**
- *Adding a binding means adding a field, never a stray `case "x":` inline.*
- *CHANGE A KEY HERE, NOT IN THE UPDATE SWITCH.*
- *`key.Matches` compares key codes only — the dispatch lane, not the code, disambiguates a deliberate collision. Document it at both ends so it is not read as a bug.*
- *Hints come from the keymap so help text can never drift from the bindings.*
- *The status bar carries core motion + the `?` gateway; every other binding lives one `?` away.*

---

## Modes vs. sub-states

Two different axes, constantly conflated. Getting them apart is what keeps the
update function flat instead of a combinatorial mess.

| | **Mode** | **Sub-state** |
|---|---|---|
| What it is | An exclusive **input lane** | An orthogonal **flag inside a lane** |
| Examples | rename prompt, delete confirm, search, palette, help | which pane has focus, an active text selection |
| Key dispatch | `Update` routes to that mode's own closed `update*` func | Handled inside the mode's func, branching on the flag |
| Mouse | Typically **ignored** outside the normal mode | Fully live |
| Storage | one `mode` field | one flag each |

```go
type mode int

const (
	modeNormal mode = iota
	modeConfirmDelete
	modeRename
	modeSearch
	modeCommandPalette
	modeHelp
)

// focusPane is a SUB-STATE of modeNormal — orthogonal to mode (which owns the
// prompts) — so the "scroll-ish" keys and a left-click can route to either pane
// while the mode machinery stays untouched. Zero value = the primary pane, so a
// freshly-built model starts where the user picks things.
type focusPane int

const (
	focusPrimary focusPane = iota
	focusSecondary
)
```

### Dispatch: one closed lane per mode

```go
case tea.MouseMsg:
	if m.mode != modeNormal { // a prompt owns the screen — ignore the mouse
		return m, nil
	}
	var nm tea.Model
	nm, cmd = m.handleMouse(msg)
	m = nm.(model)

case tea.KeyPressMsg:
	var nm tea.Model
	switch m.mode {
	case modeConfirmDelete:
		nm, cmd = m.updateConfirmDelete(msg)
	case modeRename:
		nm, cmd = m.updateRename(msg)
	case modeSearch:
		nm, cmd = m.updateSearch(msg)
	case modeCommandPalette:
		nm, cmd = m.updateCommandPalette(msg)
	case modeHelp:
		nm, cmd = m.updateHelp(msg)
	default:
		nm, cmd = m.updateNormal(msg)
	}
	m = nm.(model)
```

### A sub-state lane must be a CLOSED switch

When a sub-state is alive (a live text selection, a drag), it owns **every** key —
the normal-mode switch never sees them. Otherwise a mutation key fires mid-gesture:

```go
func (m model) updateNormal(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	// Selection is a sub-state of focusSecondary. While it is active, the closed
	// updateSelecting switch owns every key — the normal-mode switch below never
	// sees them, so no mutation/navigation key fires mid-selection.
	if m.selecting {
		return m.updateSelecting(msg)
	}
	...
}
```

Inside that closed lane, re-map only what is meaningful; everything else is a
deliberate no-op. Note the escape hatches (`FocusToggle` cancels *then* switches).

```go
func (m model) updateSelecting(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	km := m.keymap
	switch {
	case key.Matches(msg, km.SelectMode), key.Matches(msg, km.Back):
		m.cancelSelection()
	case key.Matches(msg, km.FocusToggle):
		m.cancelSelection() // reset hygiene: a focus flip ends the sub-state
		m.focusPane = focusPrimary
	case key.Matches(msg, km.CopySelection): // y/enter — NOT OpenEntry
		m.copySelection()
	case key.Matches(msg, km.MoveDown):
		m.moveSelection(1)
	case key.Matches(msg, km.MoveUp):
		m.moveSelection(-1)
	}
	return m, nil
}
```

### Focus gating: which keys act, and where

Not every key should fire at every focus. Three tiers, decided per binding:

1. **Routed** — same code, different behavior per focus (`j` moves the cursor on the
   list, scrolls the viewport on the preview).
2. **Gated** — acts only at one focus, a no-op at the other. Mutation keys
   (`rename`, `delete`, `open-in-editor`) need a meaningful list selection: *pressing
   `d` while reading a preview is ambiguous, so it does nothing rather than guess.*
3. **Global** — a mode switch (`/`, `ctrl+p`, `?`) or an action whose target is
   unambiguous at both focuses. Example: "copy the whole previewed file" fires at
   **both** focuses — the previewed file is the cursor's selection whether the eye
   is on the list or the preview, and a no-op while reading it is the reflex trap.

Write the tier in a comment at each case. A silent no-op with no stated reason
reads as a bug to the next person.

**Rules to keep verbatim:**
- *A mode is an exclusive input lane; a sub-state is an orthogonal flag inside one. Never model a sub-state as a mode — it forces the mode machinery to grow combinatorially.*
- *Ignore the mouse entirely while a prompt mode is active.*
- *While a sub-state is alive its closed switch owns every key, so no mutation/navigation key can fire mid-gesture.*
- *A gated no-op needs a written reason at the case, or it reads as a bug.*

---

## Enter/exit hygiene for a mode that repurposes shared state

A search/filter/aggregate mode that reuses the *same* list slice, cursor, and scroll
offset must snapshot the pre-mode values on enter and restore them on exit. Reset
every mode-local field to zero on exit so a stale value can never mis-route the next
entry.

```go
// enterFlat snapshots the normal-mode listing so Esc restores it exactly, then
// swaps in the mode's own result list.
func (m *model) enterFlat() {
	m.savedEntries, m.savedCursor, m.savedTop = m.entries, m.cursor, m.listTop
	m.mode = modeSearch
	m.query = ""
	...
}

func (m *model) exitFlatRestore() {
	m.entries, m.cursor, m.listTop = m.savedEntries, m.savedCursor, m.savedTop
	m.savedEntries = nil // release the snapshot; a stale one would resurrect a dead listing
	m.mode = modeNormal
}
```

When **two** modes share one surface (a search result list and a "changed files"
list, both flat and both keyed relative to a root), centralize the predicate rather
than testing `m.mode == modeX || m.mode == modeY` in five renderers:

```go
// flatListMode reports whether the current mode repurposes m.entries as a FLAT
// list whose names are paths relative to the root. Centralizing the predicate keeps
// the renderers and the path resolution from drifting as a second flat mode is added.
func (m model) flatListMode() bool {
	return m.mode == modeSearch || m.mode == modeChanges
}
```

### The exit guard that saves you once and looks pointless forever

A palette command runs **while the mode is still the palette's**. If that command
transitions to another mode, a naive `exit()` that hard-sets `modeNormal` clobbers
it. Guard on the current value:

```go
// Mode returns to normal UNLESS the command that just ran transitioned into another
// mode: a command is run while mode is still modeCommandPalette, so if it is no
// longer modeCommandPalette here, the command has taken over and we must not clobber it.
func (m *model) exitCommandPalette() {
	if m.mode == modeCommandPalette {
		m.mode = modeNormal
	}
	m.paletteStage, m.paletteQuery, m.paletteCursor = 0, "", 0
	m.paletteFiltered = nil
}
```

---

## The command registry + discoverability twins

A palette is a **registry of `Command` values**, not a switch. One struct, one
`Run` closure, and a `NeedsArg` flag that sends the palette into a second stage.

```go
// Command is one row in the palette. Run is invoked on Enter when this Command is
// selected; it mutates m in place (status message, cwd, …) and returns a tea.Cmd
// that may be nil. The tagged signature lets a future Command dispatch async work
// without changing the palette dispatch site. NeedsArg=true sends the palette into
// a second stage that collects a text argument.
type Command struct {
	Name        string // displayed + filtered against (substring, case-insensitive)
	Description string // shown next to the name
	NeedsArg    bool
	Run         func(m *model, arg string) tea.Cmd
}

func defaultCommands() []Command {
	return []Command{
		{
			Name: "reload", Description: "re-read the current directory",
			Run: func(m *model, _ string) tea.Cmd { m.reload(); m.statusMsg = "reloaded"; return nil },
		},
		{
			Name: "copy relative path", Description: "copy the selection's path relative to the root",
			// Discoverability TWIN of the `y` key: BOTH route through yankRelPath, the
			// single code path that guards, computes the rel, copies, and records
			// telemetry exactly once — a split twin would double-count.
			Run: func(m *model, _ string) tea.Cmd { m.yankRelPath(); return nil },
		},
		{
			Name: "cd", Description: "change directory (guarded)", NeedsArg: true,
			Run: func(m *model, path string) tea.Cmd { ... },
		},
	}
}
```

**The twin rule.** A palette entry that duplicates a key binding must call the
**same function** the key calls — never a re-implementation. The shared function is
where the guards, the status message, and the telemetry live, so each of them
happens exactly once regardless of the entry point. A split twin double-counts
telemetry and drifts its guards within a release.

**The twin's guard is not optional.** A palette is a *second* entry point, so it
hits states the key path can't. Where the key path was pre-gated by focus ("only
fires on the list"), the palette entry must re-assert the guard itself — and it
should **say why it refused** rather than close silently, because the user explicitly
picked it:

```go
Run: func(m *model, _ string) tea.Cmd {
	if m.repoRoot == "" {
		m.statusMsg = "⚠ not a git repo — nothing to list"
		return nil
	}
	m.enterChanges()
	return nil
},
```

### Filtering: substring beats fuzzy at this size

```go
// applyFilter recomputes the visible commands from the query: substring,
// case-insensitive, over the name — a handful of commands doesn't warrant fuzzy
// ranking. Cursor resets to the top match.
func (m *model) applyPaletteFilter() {
	cmds := defaultCommands()
	if m.paletteQuery == "" {
		m.paletteFiltered = cmds
	} else {
		needle := strings.ToLower(m.paletteQuery)
		out := cmds[:0:0] // fresh slice — do NOT alias defaultCommands' backing array
		for _, c := range cmds {
			if strings.Contains(strings.ToLower(c.Name), needle) {
				out = append(out, c)
			}
		}
		m.paletteFiltered = out
	}
	m.paletteCursor = 0
}
```

`cmds[:0:0]` is load-bearing: `cmds[:0]` would append **into** the registry's
backing array and corrupt the next unfiltered listing.

**Rules to keep verbatim:**
- *A palette entry that duplicates a key binding routes through the SAME function — the shared function owns the guards, the status message, and the telemetry, so each happens exactly once per action.*
- *A second entry point re-asserts the guard the first one got from context, and says why it refused instead of closing silently.*
- *Filter into a fresh slice (`s[:0:0]`), never `s[:0]`, or the filter corrupts the registry.*

---

## Suspending the TUI for an external program

`tea.ExecProcess` releases the terminal, runs a blocking external command (editor,
pager, `git commit`), then resumes the program and delivers your message.
**Alt-screen and mouse reporting are restored automatically** — because in v2 they
are fields on `tea.View`, re-declared on the next frame.

```go
type editorFinishedMsg struct{ err error }

case key.Matches(msg, km.OpenInEditor):
	cmd, err := editorCommand(os.Getenv, m.selectedAbsPath())
	if err != nil {
		m.statusMsg = "⚠ " + err.Error()
		return m, nil
	}
	// Returned DIRECTLY (not folded into the tail reconcile) — the exec must be
	// the sole cmd this keypress yields.
	return m, tea.ExecProcess(cmd, func(err error) tea.Msg { return editorFinishedMsg{err} })
```

On resume, refresh eagerly rather than waiting for the next poll tick — and re-seek
the selection **by name**, because the external program may have created files that
sort above it:

```go
case editorFinishedMsg:
	if msg.err != nil {
		m.statusMsg = "⚠ editor: " + msg.err.Error()
		return m, nil
	}
	// Snapshot the NAME before reload(): reload clamps the cursor by INDEX only, so a
	// file the editor created that sorts above the edited one would silently re-point
	// the selection at the new neighbour.
	var editedName string
	if m.cursor >= 0 && m.cursor < len(m.entries) {
		editedName = m.entries[m.cursor].name
	}
	m.reload()
	for i, e := range m.entries {
		if e.name == editedName {
			m.cursor = i
			break
		}
	}
	return m, m.reconcile(nil)
```

Resolve the external command through an **injected `getenv`** so tests set the
environment without mutating process state, and split on whitespace so flags
survive while the path stays a separate argv token (no shell → a path with spaces
is injection-safe):

```go
func editorCommand(getenv func(string) string, absPath string) (*exec.Cmd, error) {
	for _, raw := range []string{getenv("VISUAL"), getenv("EDITOR")} {
		if fields := strings.Fields(raw); len(fields) > 0 {
			return exec.Command(fields[0], append(fields[1:], absPath)...), nil
		}
	}
	return nil, errNoEditor // refuse to guess: dropping a non-vi user into vi is the rage-quit
}
```

A whitespace-only var (`EDITOR="   "`) yields no fields and **falls through** to the
next candidate rather than panicking on `fields[0]`.

---

## Building an environment-dependent command without running it

Any "shell out to the host terminal" feature (split a pane, open a window, copy to
the clipboard) is a **detection registry** plus a **builder that returns the
`*exec.Cmd` without running it** — which is what makes the exact argv unit-testable
with no real terminal.

```go
type splitEnv struct {
	name     string
	detected func() bool
	buildCmd func(direction, root, self string) (*exec.Cmd, error)
}

// Tried IN ORDER. Multiplexers come BEFORE emulators: inside tmux/zellij the intent
// is to split that multiplexer's pane, and an emulator's own env var can still be
// set while nested. Append-only; the order is a load-bearing invariant.
var splitEnvs = []splitEnv{
	{name: "tmux", detected: detectedTmux, buildCmd: buildTmux},
	{name: "zellij", detected: detectedZellij, buildCmd: buildZellij},
	{name: "wezterm", detected: detectedWezterm, buildCmd: buildWezterm},
	{name: "kitty", detected: detectedKitty, buildCmd: buildKitty},
}
```

Fold the child's stderr into the returned error, so the user's warning explains
*why* it failed (remote control disabled, Accessibility permission missing) instead
of a bare `exit status 1`:

```go
func runSpawn(name string, cmd *exec.Cmd) error {
	var errBuf bytes.Buffer
	cmd.Stderr = &errBuf
	if err := cmd.Run(); err != nil {
		if msg := strings.TrimSpace(errBuf.String()); msg != "" {
			return fmt.Errorf("%s: %w: %s", name, err, msg)
		}
		return fmt.Errorf("%s: %w", name, err)
	}
	return nil
}
```

The same shape covers the clipboard with no CGo dependency — `pbcopy` on darwin,
`xclip` then `wl-copy` on linux, a typed `errClipboardUnsupported` otherwise. Keep
the *string builder* (what gets copied) a pure function tested independently of the
copy itself: the clipboard helper does not exist in CI, so the payload's correctness
must be provable without it.
