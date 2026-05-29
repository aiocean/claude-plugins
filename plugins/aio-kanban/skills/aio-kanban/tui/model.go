package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"
)

// pollInterval is how often the model re-stats board.md to pick up an external
// edit (an agent rewriting the board beside us). One second is responsive enough
// for a glance-beside-the-agent companion and costs one os.Stat per tick.
const pollInterval = time.Second

type tickMsg struct{}

func tickCmd() tea.Cmd {
	return tea.Tick(pollInterval, func(time.Time) tea.Msg { return tickMsg{} })
}

// uiMode is the active interaction lane. List is the default two-pane board;
// Input collects a single line of text (a blocked reason) via a floating modal;
// Confirm asks the user to approve an irreversible delete.
type uiMode int

const (
	modeList uiMode = iota
	modeInput
	modeConfirm
)

// focusPane selects which pane j/k and the wheel drive: the task list (left) or
// the markdown preview (right).
type focusPane int

const (
	focusList focusPane = iota
	focusPreview
)

// inputPurpose distinguishes what an Input-mode submission does.
type inputPurpose int

const (
	inputNone inputPurpose = iota
	inputBlockReason
)

// pos locates a card by lane + index within that lane.
type pos struct {
	col Column
	idx int
}

type model struct {
	board       *Board
	width       int
	height      int
	renderStyle string // glamour style hint: "dark" | "light" | "notty"

	sel   int // index into the flattened task list (lane order, top to bottom)
	focus focusPane

	previewLines  []string // rendered markdown of the selected task
	previewScroll int
	previewKey    string // cache key (task ID + width) so re-selecting skips a re-render

	mode         uiMode
	inputPurpose inputPurpose
	inputBuf     string
	status       string

	// confirmTarget is the card the delete-confirm modal is asking about. It is
	// captured by value when the modal opens so the delete commits against this
	// exact task (located by ID) even if a reload shifts the selection meanwhile.
	confirmTarget Task
}

func newModel(b *Board) model {
	m := model{board: b}
	m.clampSel()
	return m
}

func (m model) Init() tea.Cmd { return tickCmd() }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		m.previewKey = "" // width changed → markdown must re-wrap
		m.refreshPreview()
		return m, nil
	case tickMsg:
		m.maybeReload()
		return m, tickCmd()
	case tea.MouseMsg:
		return m.handleMouse(msg)
	case tea.KeyPressMsg:
		switch m.mode {
		case modeInput:
			return m.updateInput(msg)
		case modeConfirm:
			return m.updateConfirm(msg)
		default:
			return m.updateList(msg)
		}
	}
	return m, nil
}

// ---- list / board mode ----

func (m model) updateList(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "ctrl+c":
		return m, tea.Quit
	case "tab":
		if m.focus == focusList {
			m.focus = focusPreview
		} else {
			m.focus = focusList
		}
	case "down", "j":
		if m.focus == focusPreview {
			m.scrollPreview(1)
		} else {
			m.moveSel(1)
		}
	case "up", "k":
		if m.focus == focusPreview {
			m.scrollPreview(-1)
		} else {
			m.moveSel(-1)
		}
	case "ctrl+d":
		m.scrollPreview(m.bodyH() / 2)
	case "ctrl+u":
		m.scrollPreview(-m.bodyH() / 2)
	case "g":
		if m.focus == focusPreview {
			m.previewScroll = 0
		} else {
			m.sel = 0
			m.refreshPreview()
		}
	case "G":
		if m.focus == focusPreview {
			m.scrollPreview(len(m.previewLines))
		} else {
			m.sel = max(0, len(m.flatten())-1)
			m.refreshPreview()
		}
	case "shift+up":
		return m.shiftTask(-1), nil // move toward Backlog (up the stacked lanes)
	case "shift+down":
		return m.shiftTask(1), nil // move toward Blocked (down the stacked lanes)
	case "d":
		if p, ok := m.selectedPos(); ok {
			m.confirmTarget = m.board.Cols[p.col][p.idx]
			m.mode = modeConfirm
			m.status = ""
		}
	case "r":
		m.reload()
		m.status = "reloaded"
	}
	return m, nil
}

// moveSel steps the selection through the flattened task list, clamped, and
// re-renders the preview for the newly selected task.
func (m *model) moveSel(d int) {
	n := len(m.flatten())
	if n == 0 {
		m.sel = 0
		return
	}
	m.sel += d
	if m.sel < 0 {
		m.sel = 0
	}
	if m.sel > n-1 {
		m.sel = n - 1
	}
	m.refreshPreview()
}

func (m *model) scrollPreview(d int) {
	maxScroll := len(m.previewLines) - m.bodyH()
	if maxScroll < 0 {
		maxScroll = 0
	}
	s := m.previewScroll + d
	if s < 0 {
		s = 0
	}
	if s > maxScroll {
		s = maxScroll
	}
	m.previewScroll = s
}

// shiftTask moves the selected card one lane in direction d (-1 toward Backlog,
// +1 toward Blocked). A move into Blocked first collects a reason; a move into
// Done stamps the completion date. The selection follows the card into its lane.
func (m model) shiftTask(d int) model {
	p, ok := m.selectedPos()
	if !ok {
		return m
	}
	dest := p.col + Column(d)
	if dest < 0 || dest >= numColumns {
		return m
	}
	if dest == Blocked {
		m.mode = modeInput
		m.inputPurpose = inputBlockReason
		m.inputBuf = ""
		m.status = ""
		return m
	}
	return m.commitMove(p, dest)
}

// commitMove relocates the card at p to dest, applies the Done stamp, writes the
// board, and re-points the selection at the moved card. A stale board (external
// edit) aborts the move and reloads.
func (m model) commitMove(p pos, dest Column) model {
	t := m.board.Cols[p.col][p.idx]
	m.board.move(p.col, p.idx, dest)
	if dest == Done {
		if err := stampField(m.board.Dir, t.Rel, "completed", today()); err != nil {
			m.status = "⚠ completed stamp failed: " + err.Error()
		}
	}
	if err := m.board.save(); err != nil {
		if errors.Is(err, errStale) {
			m.reload()
			m.status = "⚠ board changed on disk — reloaded, move aborted"
			return m
		}
		m.status = "⚠ save failed: " + err.Error()
		return m
	}
	m.sel = m.flatIndexOf(dest, len(m.board.Cols[dest])-1)
	m.focus = focusList
	m.previewKey = ""
	m.refreshPreview()
	m.status = fmt.Sprintf("%s → %s", t.ID, dest)
	return m
}

// ---- input mode ----

func (m model) updateInput(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.mode = modeList
		m.inputPurpose = inputNone
		m.status = "cancelled"
	case "enter":
		return m.submitInput()
	case "backspace":
		if r := []rune(m.inputBuf); len(r) > 0 {
			m.inputBuf = string(r[:len(r)-1])
		}
	default:
		if msg.Text != "" {
			m.inputBuf += msg.Text
		}
	}
	return m, nil
}

func (m model) submitInput() (tea.Model, tea.Cmd) {
	purpose := m.inputPurpose
	text := strings.TrimSpace(m.inputBuf)
	m.mode = modeList
	m.inputPurpose = inputNone

	switch purpose {
	case inputBlockReason:
		if text == "" {
			m.status = "block cancelled (empty reason)"
			return m, nil
		}
		p, ok := m.selectedPos()
		if !ok {
			return m, nil
		}
		t := m.board.Cols[p.col][p.idx]
		if err := stampField(m.board.Dir, t.Rel, "blocked-by", text); err != nil {
			m.status = "⚠ blocked-by stamp failed: " + err.Error()
			return m, nil
		}
		return m.commitMove(p, Blocked), nil
	}
	return m, nil
}

// ---- confirm (delete) mode ----

// updateConfirm handles the delete-confirmation modal: y/enter commits the
// delete, n/esc cancels back to the board, ctrl+c still quits. Every other key
// is inert so a stray press cannot dismiss or confirm the irreversible op.
func (m model) updateConfirm(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "y", "enter":
		return m.commitDelete(), nil
	case "n", "esc":
		m.mode = modeList
		m.status = "delete cancelled"
	}
	return m, nil
}

// commitDelete removes confirmTarget from the board and deletes its task file.
// The card is located by ID — not by the live selection — so a reload between
// opening the modal and confirming cannot redirect the delete onto a different
// card; a vanished ID aborts. The file is unlinked only after the board write
// succeeds, so a stale-abort never orphans a delete.
func (m model) commitDelete() model {
	m.mode = modeList
	t := m.confirmTarget
	c, idx, ok := m.board.findByID(t.ID)
	if !ok {
		m.reload()
		m.status = "⚠ " + t.ID + " no longer on board — delete aborted"
		return m
	}
	m.board.removeCard(c, idx)
	if err := m.board.save(); err != nil {
		if errors.Is(err, errStale) {
			m.reload()
			m.status = "⚠ board changed on disk — reloaded, delete aborted"
			return m
		}
		m.status = "⚠ save failed: " + err.Error()
		return m
	}
	if err := os.Remove(filepath.Join(m.board.Dir, filepath.FromSlash(t.Rel))); err != nil && !os.IsNotExist(err) {
		m.status = "⚠ " + t.ID + " removed from board; file delete failed: " + err.Error()
	} else {
		m.status = "deleted " + t.ID
	}
	m.clampSel()
	m.previewKey = ""
	m.refreshPreview()
	return m
}

// ---- mouse ----

// handleMouse maps clicks and wheel events onto the two panes using the same
// geometry the renderer uses. In bubbletea v2 the action is the message type
// (click / wheel / motion), so we switch on the concrete type; e holds the
// shared cursor position. Only list mode reacts to the mouse.
func (m model) handleMouse(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	if m.mode != modeList {
		return m, nil
	}
	e := msg.Mouse()
	g := m.layout()
	overList := e.X < g.dividerStart

	switch msg.(type) {
	case tea.MouseWheelMsg:
		if overList {
			m.focus = focusList
			switch e.Button {
			case tea.MouseWheelUp:
				m.moveSel(-1)
			case tea.MouseWheelDown:
				m.moveSel(1)
			}
		} else {
			m.focus = focusPreview
			switch e.Button {
			case tea.MouseWheelUp:
				m.scrollPreview(-1)
			case tea.MouseWheelDown:
				m.scrollPreview(1)
			}
		}
	case tea.MouseClickMsg:
		if e.Button != tea.MouseLeft {
			return m, nil
		}
		if !overList {
			m.focus = focusPreview
			return m, nil
		}
		m.focus = focusList
		rows := m.buildLeftRows()
		off := m.leftScrollOffset(rows, g.bodyH)
		line := e.Y - g.bodyTop + off
		if line >= 0 && line < len(rows) && !rows[line].header {
			m.sel = rows[line].flatIdx
			m.refreshPreview()
		}
	}
	return m, nil
}

// ---- preview ----

// refreshPreview renders the selected task's markdown into previewLines, cached
// by (task ID + preview width) so re-selecting the same task at the same size is
// free. Width is unknown until the first WindowSizeMsg, so it no-ops until then.
func (m *model) refreshPreview() {
	if m.width == 0 {
		return
	}
	p, ok := m.selectedPos()
	if !ok {
		m.previewLines = nil
		m.previewScroll = 0
		m.previewKey = "none"
		return
	}
	t := m.board.Cols[p.col][p.idx]
	g := m.layout()
	key := t.ID + "|" + strconv.Itoa(g.rightW)
	if key == m.previewKey {
		return
	}
	data, err := os.ReadFile(filepath.Join(m.board.Dir, filepath.FromSlash(t.Rel)))
	if err != nil {
		m.previewLines = []string{"⚠ cannot read " + t.Rel, err.Error()}
	} else if lines, rerr := renderMarkdown(string(data), g.rightW, m.renderStyle); rerr == nil {
		m.previewLines = lines
	} else {
		m.previewLines = strings.Split(strings.TrimRight(string(data), "\n"), "\n")
	}
	m.previewScroll = 0
	m.previewKey = key
}

// ---- flattening + geometry ----

// flatten lists every card as a pos in lane order (Backlog→Blocked, top to
// bottom). The selection index addresses this list, so j/k walks across lanes.
func (m model) flatten() []pos {
	var out []pos
	for c := Column(0); c < numColumns; c++ {
		for i := range m.board.Cols[c] {
			out = append(out, pos{c, i})
		}
	}
	return out
}

func (m model) selectedPos() (pos, bool) {
	f := m.flatten()
	if m.sel < 0 || m.sel >= len(f) {
		return pos{}, false
	}
	return f[m.sel], true
}

// flatIndexOf maps a (lane, index) back to its position in the flattened list.
func (m model) flatIndexOf(col Column, idx int) int {
	n := 0
	for c := Column(0); c < col; c++ {
		n += len(m.board.Cols[c])
	}
	return n + idx
}

// geom is the resolved two-pane layout: a full-width title row, the body split
// into a left list pane + a 3-col divider + a right preview pane, and a
// status bar on the last row.
type geom struct {
	leftW        int
	dividerStart int
	dividerW     int
	rightW       int
	bodyTop      int
	bodyH        int
}

func (m model) layout() geom {
	g := geom{dividerW: 3, bodyTop: 1}
	g.bodyH = m.height - 2 // minus title row + status row
	if g.bodyH < 1 {
		g.bodyH = 1
	}
	g.leftW = m.width * 38 / 100
	if g.leftW < 20 {
		g.leftW = 20
	}
	if g.leftW > m.width-g.dividerW-10 {
		g.leftW = m.width - g.dividerW - 10
	}
	if g.leftW < 1 {
		g.leftW = 1
	}
	g.dividerStart = g.leftW
	g.rightW = m.width - g.leftW - g.dividerW
	if g.rightW < 1 {
		g.rightW = 1
	}
	return g
}

func (m model) bodyH() int { return m.layout().bodyH }

// taskCounts returns the total number of tasks and how many are in Done.
func (m model) taskCounts() (total, done int) {
	for c := range m.board.Cols {
		total += len(m.board.Cols[c])
	}
	return total, len(m.board.Cols[Done])
}

// shortenPath replaces the home-directory prefix with ~ for a compact header.
func shortenPath(p string) string {
	if home, err := os.UserHomeDir(); err == nil && home != "" && strings.HasPrefix(p, home) {
		return "~" + strings.TrimPrefix(p, home)
	}
	return p
}

// clampSel keeps the selection inside the flattened task list after a reload or
// a move shrinks the board.
func (m *model) clampSel() {
	n := len(m.flatten())
	if n == 0 {
		m.sel = 0
		return
	}
	if m.sel < 0 {
		m.sel = 0
	}
	if m.sel > n-1 {
		m.sel = n - 1
	}
}

// reload re-reads the board from disk unconditionally, preserving the selection
// (clamped). Used after an explicit 'r' and after a stale-write abort.
func (m *model) reload() {
	if b, err := loadBoard(m.board.Dir); err == nil {
		m.board = b
		m.clampSel()
		m.previewKey = ""
		m.refreshPreview()
	}
}

// maybeReload reloads only when board.md changed on disk since the last load —
// the poll-loop path that keeps the TUI in sync with an agent editing the board.
func (m *model) maybeReload() {
	info, err := os.Stat(filepath.Join(m.board.Dir, "board.md"))
	if err != nil {
		return
	}
	if info.ModTime().After(m.board.ModTime) {
		m.reload()
		m.status = "reloaded (external change)"
	}
}
