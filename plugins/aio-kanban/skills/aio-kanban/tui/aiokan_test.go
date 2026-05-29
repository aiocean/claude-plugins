package main

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"

	tea "charm.land/bubbletea/v2"
)

// pinDate freezes today() so timestamp stamps are deterministic in assertions.
func pinDate(t *testing.T) {
	t.Helper()
	prev := now
	now = func() time.Time { return time.Date(2026, 5, 29, 0, 0, 0, 0, time.UTC) }
	t.Cleanup(func() { now = prev })
}

const fixtureBoard = `# Kanban Board
<!-- Updated: 2026-01-01 -->

## Backlog

- [T-001](tasks/T-001-alpha.md) Alpha task — high/S

## Todo

- [T-002](tasks/T-002-beta.md) Beta task — medium/M

## Doing

## Done

## Blocked
`

func taskFile(id, title, prio, effort string) string {
	return "# " + id + ": " + title + "\n> " + title + "\n\n- **priority**: " + prio +
		"\n- **effort**: " + effort + "\n\n## Criteria\n- [ ] do it\n\n## Notes\n"
}

// setupBoard writes a fixture .kanban/ and returns the .kanban dir path.
func setupBoard(t *testing.T) string {
	t.Helper()
	kdir := filepath.Join(t.TempDir(), ".kanban")
	tasks := filepath.Join(kdir, "tasks")
	if err := os.MkdirAll(tasks, 0o755); err != nil {
		t.Fatal(err)
	}
	write := func(p, c string) {
		if err := os.WriteFile(p, []byte(c), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write(filepath.Join(kdir, "board.md"), fixtureBoard)
	write(filepath.Join(tasks, "T-001-alpha.md"), taskFile("T-001", "Alpha task", "high", "S"))
	write(filepath.Join(tasks, "T-002-beta.md"), taskFile("T-002", "Beta task", "medium", "M"))
	return kdir
}

func sizedModel(t *testing.T, kdir string) model {
	t.Helper()
	b, err := loadBoard(kdir)
	if err != nil {
		t.Fatal(err)
	}
	m := newModel(b)
	m.width, m.height = 120, 30
	m.renderStyle = "notty" // deterministic markdown render in tests (no TTY color probe)
	m.refreshPreview()
	return m
}

func step(m model, msg tea.Msg) model {
	nm, _ := m.Update(msg)
	return nm.(model)
}

func keyRune(r rune) tea.KeyPressMsg { return tea.KeyPressMsg{Code: r, Text: string(r)} }

// shiftDown is the "move status one lane toward Blocked" key.
func shiftDown() tea.KeyPressMsg { return tea.KeyPressMsg{Code: tea.KeyDown, Mod: tea.ModShift} }

// selCol returns the lane of the currently selected task (fatal if none).
func selCol(t *testing.T, m model) Column {
	t.Helper()
	p, ok := m.selectedPos()
	if !ok {
		t.Fatal("no task selected")
	}
	return p.col
}

// selID returns the ID of the currently selected task ("" if none).
func selID(m model) string {
	p, ok := m.selectedPos()
	if !ok {
		return ""
	}
	return m.board.Cols[p.col][p.idx].ID
}

var ansiRe = regexp.MustCompile(`\x1b\[[0-9;]*m`)

// ansiStrip removes SGR color/style escapes so assertions match the visible text.
func ansiStrip(s string) string { return ansiRe.ReplaceAllString(s, "") }

func readBoard(t *testing.T, kdir string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(kdir, "board.md"))
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

// sectionOf returns the column heading a board line currently sits under.
func sectionOf(board, taskID string) string {
	cur := ""
	for _, ln := range strings.Split(board, "\n") {
		if strings.HasPrefix(ln, "## ") {
			cur = strings.TrimSpace(ln[3:])
		} else if strings.Contains(ln, "["+taskID+"]") {
			return cur
		}
	}
	return ""
}

func TestLoadParsesColumns(t *testing.T) {
	kdir := setupBoard(t)
	b, err := loadBoard(kdir)
	if err != nil {
		t.Fatal(err)
	}
	if got := len(b.Cols[Backlog]); got != 1 {
		t.Fatalf("Backlog: want 1 task, got %d", got)
	}
	if got := len(b.Cols[Todo]); got != 1 {
		t.Fatalf("Todo: want 1 task, got %d", got)
	}
	a := b.Cols[Backlog][0]
	if a.ID != "T-001" || a.Title != "Alpha task" || a.Priority != "high" || a.Effort != "S" {
		t.Fatalf("parsed T-001 wrong: %+v", a)
	}
}

func TestRenderRoundTrip(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	b, _ := loadBoard(kdir)
	if err := b.save(); err != nil {
		t.Fatal(err)
	}
	b2, err := loadBoard(kdir)
	if err != nil {
		t.Fatal(err)
	}
	for c := Column(0); c < numColumns; c++ {
		if len(b.Cols[c]) != len(b2.Cols[c]) {
			t.Fatalf("%s: round-trip changed count %d→%d", c, len(b.Cols[c]), len(b2.Cols[c]))
		}
		for i := range b.Cols[c] {
			if b.Cols[c][i].Raw != b2.Cols[c][i].Raw {
				t.Fatalf("%s[%d]: raw changed %q→%q", c, i, b.Cols[c][i].Raw, b2.Cols[c][i].Raw)
			}
		}
	}
}

func TestMoveViaKeysRewritesBoard(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	m := sizedModel(t, kdir)
	// Default selection is the first task (T-001 in Backlog); shift it into Todo.
	m = step(m, shiftDown())

	if c := selCol(t, m); c != Todo {
		t.Fatalf("selection should follow card into Todo, got %s", c)
	}
	if id := selID(m); id != "T-001" {
		t.Fatalf("selection should stay on the moved card T-001, got %s", id)
	}
	board := readBoard(t, kdir)
	if s := sectionOf(board, "T-001"); s != "Todo" {
		t.Fatalf("T-001 should be under Todo on disk, got %q", s)
	}
	// Timestamp refreshed to the pinned date.
	if !strings.Contains(board, "<!-- Updated: 2026-05-29 -->") {
		t.Fatalf("board timestamp not refreshed:\n%s", board)
	}
}

func TestMoveToDoneStampsCompleted(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	m := sizedModel(t, kdir)
	// T-002 starts in Todo (flat index 1). Todo→Doing→Done with two right-shifts.
	m.sel = 1
	m = step(m, shiftDown()) // Todo → Doing
	m = step(m, shiftDown()) // Doing → Done

	if c := selCol(t, m); c != Done {
		t.Fatalf("expected selection in Done, got %s", c)
	}
	if id := selID(m); id != "T-002" {
		t.Fatalf("expected T-002 selected, got %s", id)
	}
	data, err := os.ReadFile(filepath.Join(kdir, "tasks", "T-002-beta.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "- **completed**: 2026-05-29") {
		t.Fatalf("Done move should stamp completed date:\n%s", data)
	}
}

func TestAddTaskCreatesFileAndLine(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	m := sizedModel(t, kdir)

	m = step(m, keyRune('a')) // enter add-task input
	if m.mode != modeInput || m.inputPurpose != inputAddTask {
		t.Fatalf("'a' should open add-task input, mode=%v purpose=%v", m.mode, m.inputPurpose)
	}
	for _, r := range "New Feature" {
		m = step(m, keyRune(r))
	}
	m = step(m, tea.KeyPressMsg{Code: tea.KeyEnter})

	if m.mode != modeList {
		t.Fatalf("submit should return to list mode, got %v", m.mode)
	}
	want := filepath.Join(kdir, "tasks", "T-003-new-feature.md")
	if _, err := os.Stat(want); err != nil {
		t.Fatalf("expected new task file %s: %v", want, err)
	}
	board := readBoard(t, kdir)
	if s := sectionOf(board, "T-003"); s != "Backlog" {
		t.Fatalf("new task should land in Backlog, got %q", s)
	}
}

func TestBlockedFlowStampsReason(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	m := sizedModel(t, kdir)
	// Put T-001 in Done first, then shift Done→Blocked to trigger the reason prompt.
	m.board.move(Backlog, 0, Done)
	if err := m.board.save(); err != nil {
		t.Fatal(err)
	}
	m.sel = m.flatIndexOf(Done, 0)

	m = step(m, shiftDown()) // Done → Blocked: should open reason input, not move yet
	if m.mode != modeInput || m.inputPurpose != inputBlockReason {
		t.Fatalf("shift into Blocked should prompt for a reason, mode=%v purpose=%v", m.mode, m.inputPurpose)
	}
	if s := sectionOf(readBoard(t, kdir), "T-001"); s != "Done" {
		t.Fatalf("card must not move before reason is given, got %q", s)
	}
	for _, r := range "waiting on API" {
		m = step(m, keyRune(r))
	}
	m = step(m, tea.KeyPressMsg{Code: tea.KeyEnter})

	if s := sectionOf(readBoard(t, kdir), "T-001"); s != "Blocked" {
		t.Fatalf("after reason, T-001 should be Blocked, got %q", s)
	}
	data, _ := os.ReadFile(filepath.Join(kdir, "tasks", "T-001-alpha.md"))
	if !strings.Contains(string(data), "- **blocked-by**: waiting on API") {
		t.Fatalf("blocked-by reason not stamped:\n%s", data)
	}
}

func TestViewNoPanic(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	m := sizedModel(t, kdir)

	_ = m.View() // list mode
	m = step(m, tea.KeyPressMsg{Code: tea.KeyTab})
	_ = m.View() // preview focused
	m = step(m, tea.KeyPressMsg{Code: tea.KeyTab})
	m = step(m, keyRune('a'))
	_ = m.View() // input mode
	m = step(m, tea.KeyPressMsg{Code: tea.KeyEsc})

	// Degenerate tiny terminal must not panic either.
	m.width, m.height = 1, 1
	m.refreshPreview()
	_ = m.View()
}

func TestRenderContainsLanesAndCard(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	m := sizedModel(t, kdir)

	frame := ansiStrip(m.renderBoard())
	// Left pane: all five status groups + the task list. Right pane: the selected
	// task's rendered markdown body (default selection is T-001). Status bar: help.
	for _, want := range []string{"aio-kanban", "Backlog", "Todo", "Doing", "Done", "Blocked", "T-001", "Alpha task", "Criteria", "quit"} {
		if !strings.Contains(frame, want) {
			t.Fatalf("rendered board missing %q\n---\n%s", want, frame)
		}
	}
	t.Logf("rendered board frame:\n%s", frame)
}

func TestMouseClickSelects(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	m := sizedModel(t, kdir)
	// Left pane rows (bodyTop=1): y1 "Backlog" header, y2 T-001, y3 "Todo" header,
	// y4 T-002. Click the left pane (x < dividerStart) on y4 to select T-002.
	m = step(m, tea.MouseClickMsg{X: 5, Y: 4, Button: tea.MouseLeft})
	if c := selCol(t, m); c != Todo {
		t.Fatalf("click on the Todo task row should select a Todo task, got lane %s", c)
	}
	if id := selID(m); id != "T-002" {
		t.Fatalf("click should select T-002, got %s", id)
	}
	if m.focus != focusList {
		t.Fatalf("a left-pane click should focus the list, got %v", m.focus)
	}
}

func TestStaleGuardAborts(t *testing.T) {
	pinDate(t)
	kdir := setupBoard(t)
	m := sizedModel(t, kdir)

	// Simulate an external agent rewriting board.md AFTER we loaded it: add T-099
	// to Backlog and bump the file's mtime past our load time.
	external := strings.Replace(fixtureBoard,
		"- [T-001](tasks/T-001-alpha.md) Alpha task — high/S",
		"- [T-001](tasks/T-001-alpha.md) Alpha task — high/S\n- [T-099](tasks/T-099-ext.md) External — low/S",
		1)
	bp := filepath.Join(kdir, "board.md")
	if err := os.WriteFile(bp, []byte(external), 0o644); err != nil {
		t.Fatal(err)
	}
	future := m.board.ModTime.Add(2 * time.Second)
	if err := os.Chtimes(bp, future, future); err != nil {
		t.Fatal(err)
	}

	// Attempt a move: save() must detect the stale board, abort, and reload.
	m = step(m, shiftDown())

	if !strings.Contains(m.status, "changed on disk") {
		t.Fatalf("expected stale-abort status, got %q", m.status)
	}
	if len(m.board.Cols[Backlog]) != 2 {
		t.Fatalf("after reload Backlog should hold the external T-099 too, got %d cards", len(m.board.Cols[Backlog]))
	}
	if len(m.board.Cols[Todo]) != 1 {
		t.Fatalf("aborted move must not land T-001 in Todo (Todo should still be just T-002), got %d", len(m.board.Cols[Todo]))
	}
}
