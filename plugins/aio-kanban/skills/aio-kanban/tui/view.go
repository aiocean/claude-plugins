package main

import (
	"fmt"
	"strings"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/nguyenvanduocit/glamour/v2"
	glamourstyles "github.com/nguyenvanduocit/glamour/v2/styles"
)

// View renders the whole screen. In bubbletea v2 the alt-screen and mouse modes
// are declared on the returned View (not as program options), so every return
// path sets them — including the initial pre-size frame.
func (m model) View() tea.View {
	content := "loading…"
	if m.width > 0 && m.height > 0 {
		content = m.renderBoard()
		if m.mode == modeInput {
			content = overlayCentered(content, m.renderInputModal(), m.width, m.height)
		}
	}
	v := tea.NewView(content)
	v.AltScreen = true
	v.MouseMode = tea.MouseModeCellMotion
	return v
}

// renderBoard draws the two-pane board: a title row, a left task list grouped by
// status, a divider, a right markdown preview of the selected task, and a status
// bar.
func (m model) renderBoard() string {
	g := m.layout()
	title := fitLine(appTitleStyle.Render("aio-kanban")+cardDimStyle.Render("  "+m.board.Dir), m.width)
	body := lipgloss.JoinHorizontal(lipgloss.Top, m.renderLeft(g), m.renderDivider(g), m.renderRight(g))
	return strings.Join([]string{title, body, m.renderStatus()}, "\n")
}

// leftRow is one rendered line of the left pane: a status group header or a task.
type leftRow struct {
	header  bool
	col     Column
	taskIdx int
	flatIdx int // selection index, for tasks only
}

// buildLeftRows lays the board out as a single vertical list: each status as a
// header followed by its tasks. The flatIdx on a task row matches flatten()'s
// ordering, so the mouse and the renderer agree on what each line selects.
func (m model) buildLeftRows() []leftRow {
	var rows []leftRow
	flat := 0
	for c := Column(0); c < numColumns; c++ {
		rows = append(rows, leftRow{header: true, col: c})
		for i := range m.board.Cols[c] {
			rows = append(rows, leftRow{col: c, taskIdx: i, flatIdx: flat})
			flat++
		}
	}
	return rows
}

// leftScrollOffset returns the first visible row so the selected task stays on
// screen within bodyH rendered rows.
func (m model) leftScrollOffset(rows []leftRow, bodyH int) int {
	if len(rows) <= bodyH || bodyH <= 0 {
		return 0
	}
	selLine := 0
	for i, r := range rows {
		if !r.header && r.flatIdx == m.sel {
			selLine = i
			break
		}
	}
	off := selLine - bodyH/2
	if off < 0 {
		off = 0
	}
	if off > len(rows)-bodyH {
		off = len(rows) - bodyH
	}
	return off
}

func (m model) renderLeft(g geom) string {
	rows := m.buildLeftRows()
	off := m.leftScrollOffset(rows, g.bodyH)
	out := make([]string, 0, g.bodyH)
	for i := 0; i < g.bodyH; i++ {
		idx := off + i
		if idx >= len(rows) {
			out = append(out, strings.Repeat(" ", g.leftW))
			continue
		}
		out = append(out, m.renderLeftRow(rows[idx], g.leftW))
	}
	return strings.Join(out, "\n")
}

// renderLeftRow draws one left-pane line: a tinted group header, or an indented
// task (priority dot + ID + title). The selected task fills the pane width — in
// accent when the list is focused, dimmed when the preview is.
func (m model) renderLeftRow(r leftRow, w int) string {
	if r.header {
		txt := fmt.Sprintf("%s (%d)", r.col.String(), len(m.board.Cols[r.col]))
		head := lipgloss.NewStyle().Bold(true).Foreground(columnColor[r.col]).Render(fitLine(txt, w))
		return padLine(head, w)
	}
	t := m.board.Cols[r.col][r.taskIdx]
	label := fmt.Sprintf("%s %s", t.ID, t.Title)
	if r.flatIdx == m.sel {
		style := cardSelStyle
		if m.focus == focusPreview {
			style = cardSelBlurStyle
		}
		return style.Render(fitLine("  "+label, w))
	}
	dot := lipgloss.NewStyle().Foreground(priorityColor(t.Priority)).Render("●")
	text := cardStyle.Render(fitLine(label, w-4))
	return padLine("  "+dot+" "+text, w)
}

// renderDivider draws bodyH rows of a dim " │ " strip between the panes.
func (m model) renderDivider(g geom) string {
	row := dividerStyle.Render(" │ ")
	return strings.TrimRight(strings.Repeat(row+"\n", g.bodyH), "\n")
}

// renderRight draws the scrolled markdown preview, every line padded to rightW so
// the panes stay aligned under JoinHorizontal.
func (m model) renderRight(g geom) string {
	out := make([]string, 0, g.bodyH)
	for i := 0; i < g.bodyH; i++ {
		idx := m.previewScroll + i
		if idx >= len(m.previewLines) {
			out = append(out, strings.Repeat(" ", g.rightW))
			continue
		}
		out = append(out, padLine(fitLine(m.previewLines[idx], g.rightW), g.rightW))
	}
	return strings.Join(out, "\n")
}

// renderStatus draws the bottom bar: mode help (focus-aware), a text-input
// prompt, or the last transient status message.
func (m model) renderStatus() string {
	var left string
	switch m.mode {
	case modeInput:
		// The prompt itself lives in the floating modal; the bar just carries help.
		left = addHelp
		if m.inputPurpose == inputBlockReason {
			left = reasonHelp
		}
	default:
		help := listHelp
		if m.focus == focusPreview {
			help = previewHelp
		}
		if m.status != "" {
			left = m.status + "  ·  " + help
		} else {
			left = help
		}
	}
	return statusBarStyle.Width(m.width).Render(fitLine(left, m.width-2))
}

// renderInputModal builds the floating input box (add-task title or blocked
// reason): a titled, bordered box with the live input + caret over the board.
func (m model) renderInputModal() string {
	title := "Add task"
	help := addHelp
	if m.inputPurpose == inputBlockReason {
		title = "Block reason"
		help = reasonHelp
	}
	innerW := 48
	if innerW > m.width-8 {
		innerW = m.width - 8
	}
	if innerW < 16 {
		innerW = 16
	}
	body := strings.Join([]string{
		modalTitleStyle.Render(title),
		"",
		fitLine(m.inputBuf+promptStyle.Render("▏"), innerW),
		"",
		cardDimStyle.Render(fitLine(help, innerW)),
	}, "\n")
	return modalStyle.Width(innerW + modalStyle.GetHorizontalFrameSize()).Render(body)
}

// overlayCentered composites box centered over bg on a w×h canvas (the last row
// is reserved for the status bar, so the box centers in the area above it).
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

// renderMarkdown renders task-file markdown to a width with glamour, tightened to
// read densely in the preview pane. style is the resolved hint ("dark"/"light"/
// "notty"); an unknown style degrades to the plain no-TTY style.
func renderMarkdown(raw string, width int, style string) ([]string, error) {
	if width < 1 {
		width = 1
	}
	if style == "" {
		style = glamourstyles.NoTTYStyle
	}
	cfg, ok := glamourstyles.DefaultStyles[style]
	if !ok {
		cfg = glamourstyles.DefaultStyles[glamourstyles.NoTTYStyle]
	}
	styleCfg := *cfg
	styleCfg.Document.BlockPrefix = ""
	styleCfg.Document.BlockSuffix = ""
	styleCfg.Heading.BlockSuffix = ""
	zero := uint(0)
	styleCfg.Document.Margin = &zero

	r, err := glamour.NewTermRenderer(glamour.WithStyles(styleCfg), glamour.WithWordWrap(width))
	if err != nil {
		return nil, err
	}
	out, err := r.Render(raw)
	if err != nil {
		return nil, err
	}
	lines := strings.Split(out, "\n")
	for len(lines) > 0 && strings.TrimSpace(lines[len(lines)-1]) == "" {
		lines = lines[:len(lines)-1]
	}
	return lines, nil
}

// fitLine truncates s (ANSI-aware) to w display cells with an ellipsis.
func fitLine(s string, w int) string {
	if w <= 0 {
		return ""
	}
	if lipgloss.Width(s) <= w {
		return s
	}
	r := []rune(s)
	for len(r) > 0 && lipgloss.Width(string(r)) > w-1 {
		r = r[:len(r)-1]
	}
	return string(r) + "…"
}

// padLine right-pads an ANSI string with spaces to exactly w display cells.
func padLine(s string, w int) string {
	gap := w - lipgloss.Width(s)
	if gap <= 0 {
		return s
	}
	return s + strings.Repeat(" ", gap)
}
