// gold-monitor — a lazygit-flavored gold price monitor on the charmbracelet v2
// stack (charm.land/bubbletea/v2 + charm.land/lipgloss/v2). It is the reference
// example for the aio-tui skill: it shows the v2 API end-to-end (View() tea.View,
// the mouse interface, tea.KeyPressMsg) plus the project's elite patterns —
// async fetch off the Update goroutine with a gen-counter stale guard, a
// fixed-width reserved spinner slot, a restrained one-accent palette, and a
// single layout() shared by render and mouse hit-testing (no hardcoded row math).
package main

import (
	"encoding/json"
	"fmt"
	"image/color"
	"math"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"
)

const (
	troyOunceGrams  = 31.1035
	taelGrams       = 37.5
	refreshInterval = 60 * time.Second
	spinnerInterval = 100 * time.Millisecond
	goldURL         = "https://freegoldapi.com/data/latest.json"
	exchangeURL     = "https://api.exchangerate-api.com/v4/latest/USD"
	maxWidth        = 110 // cap layout width; centered on wider terminals
)

// Table column widths.
const (
	colDate    = 12
	colUSDOz   = 12
	colUSDG    = 10
	colVNDTael = 18
	colChange  = 10
)

// ---------------------------------------------------------------------------
// Palette — restrained, one accent (lazygit/crush flavor)
// ---------------------------------------------------------------------------

var (
	colAccent  = lipgloss.Color("#7D56F4") // primary value, active, spinner
	colDim     = lipgloss.Color("#6C757D") // muted text, inactive borders
	colSuccess = lipgloss.Color("#3FB950") // price up
	colDanger  = lipgloss.Color("#DC3545") // price down, errors
	colFg      = lipgloss.Color("#E6E6E6")
	colBorder  = lipgloss.Color("#3A3A52")
	colHoverBg = lipgloss.Color("#2A2A3A")
)

var (
	titleStyle   = lipgloss.NewStyle().Bold(true).Foreground(colAccent)
	labelStyle   = lipgloss.NewStyle().Foreground(colDim)
	valStyle     = lipgloss.NewStyle().Bold(true).Foreground(colFg)
	bigValStyle  = lipgloss.NewStyle().Bold(true).Foreground(colAccent)
	dimStyle     = lipgloss.NewStyle().Foreground(colDim)
	sectionStyle = lipgloss.NewStyle().Bold(true).Foreground(colAccent)
	errorStyle   = lipgloss.NewStyle().Foreground(colDanger)
	successStyle = lipgloss.NewStyle().Foreground(colSuccess)
	dangerStyle  = lipgloss.NewStyle().Foreground(colDanger)

	// Cards float on the terminal: border only, no Background (v2 overlays/cells
	// are opaque, so a bordered box needs no fill — matches crush's Dialog.View).
	cardStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colBorder).
			Padding(0, 2)

	statusBarStyle = lipgloss.NewStyle().Foreground(colDim).Padding(0, 1)

	// renderingStyle tints the transient fetch spinner; the one accent, reused.
	renderingStyle = lipgloss.NewStyle().Foreground(colAccent).Bold(true)

	dividerStyle = lipgloss.NewStyle().Foreground(colBorder)
)

// spinnerFrames is the braille spinner cycled one frame per ~100ms while a fetch
// is in flight. Each glyph is one display column, so the reserved status-bar slot
// never changes width.
var spinnerFrames = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

// ---------------------------------------------------------------------------
// Section heights — single source for both render and layout()/hit-testing
// ---------------------------------------------------------------------------

const (
	hHeader    = 1 // title row
	hGap       = 1 // a blank separator row
	hCardRow   = 4 // a row of bordered cards: top border + label + value + bottom border
	hSectTitle = 1 // a "SECTION" label row
	hSpark     = 1 // sparkline row
	hSparkRng  = 1 // sparkline range/change row
	hTableHead = 1 // table header row
	hTableDiv  = 1 // table divider row
)

// ---------------------------------------------------------------------------
// API + domain types
// ---------------------------------------------------------------------------

type goldRecord struct {
	Date   string  `json:"date"`
	Price  float64 `json:"price"`
	Source string  `json:"source"`
}

type exchangeRateResp struct {
	Rates map[string]float64 `json:"rates"`
}

type histPoint struct {
	date       string
	usdPerOz   float64
	usdPerGram float64
	vndPerGram float64
	vndPerTael float64
}

type priceData struct {
	usdPerOz   float64
	usdPerGram float64
	vndPerGram float64
	vndPerTael float64
	usdVnd     float64
	fetchedAt  time.Time
	history    []histPoint // newest first
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

// fetchDoneMsg carries a completed fetch. gen identifies which dispatch produced
// it — a slow fetch that lands after a newer one is dropped (stale guard).
type fetchDoneMsg struct {
	gen  uint64
	data *priceData
	err  error
}

type refreshTickMsg struct{}
type secondTickMsg struct{}
type spinnerTickMsg struct{}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

type model struct {
	data    *priceData
	err     error
	loading bool

	width, height int
	renderStyle   string // resolved ONCE at startup; "notty" → no color

	offset   int // scroll offset into the history table
	hoverRow int // -1 = none; index into m.data.history

	fetchGen     uint64 // tags each fetch dispatch; stale results are dropped
	spinnerFrame int
	spinning     bool
}

func newModel(renderStyle string) model {
	return model{loading: true, hoverRow: -1, renderStyle: renderStyle}
}

func (m model) Init() tea.Cmd {
	return tea.Batch(m.fetchCmd(), refreshTickCmd(), secondTickCmd())
}

func refreshTickCmd() tea.Cmd {
	return tea.Tick(refreshInterval, func(time.Time) tea.Msg { return refreshTickMsg{} })
}

func secondTickCmd() tea.Cmd {
	return tea.Tick(time.Second, func(time.Time) tea.Msg { return secondTickMsg{} })
}

func spinnerTickCmd() tea.Cmd {
	return tea.Tick(spinnerInterval, func(time.Time) tea.Msg { return spinnerTickMsg{} })
}

// ---------------------------------------------------------------------------
// Fetch — runs off the Update goroutine; carries a generation number
// ---------------------------------------------------------------------------

// fetchCmd snapshots the next generation number and returns a tea.Cmd. The heavy
// HTTP work runs inside the closure (off the Update loop); the result carries gen
// so applyFetch can drop it if a newer fetch was dispatched meanwhile.
func (m *model) fetchCmd() tea.Cmd {
	m.fetchGen++
	m.loading = true
	gen := m.fetchGen
	return func() tea.Msg {
		data, err := fetchPrices()
		return fetchDoneMsg{gen: gen, data: data, err: err}
	}
}

func fetchPrices() (*priceData, error) {
	client := &http.Client{Timeout: 15 * time.Second}

	type goldResult struct {
		records []goldRecord
		err     error
	}
	type rateResult struct {
		vndRate float64
		err     error
	}

	goldCh := make(chan goldResult, 1)
	rateCh := make(chan rateResult, 1)

	go func() {
		resp, err := client.Get(goldURL)
		if err != nil {
			goldCh <- goldResult{err: err}
			return
		}
		defer resp.Body.Close()
		var records []goldRecord
		if err := json.NewDecoder(resp.Body).Decode(&records); err != nil {
			goldCh <- goldResult{err: err}
			return
		}
		goldCh <- goldResult{records: records}
	}()

	go func() {
		resp, err := client.Get(exchangeURL)
		if err != nil {
			rateCh <- rateResult{err: err}
			return
		}
		defer resp.Body.Close()
		var ex exchangeRateResp
		if err := json.NewDecoder(resp.Body).Decode(&ex); err != nil {
			rateCh <- rateResult{err: err}
			return
		}
		rateCh <- rateResult{vndRate: ex.Rates["VND"]}
	}()

	gr := <-goldCh
	rr := <-rateCh

	if gr.err != nil {
		return nil, fmt.Errorf("gold API: %w", gr.err)
	}
	if rr.err != nil {
		return nil, fmt.Errorf("exchange rate API: %w", rr.err)
	}

	yahoo := filterSource(gr.records, "yahoo_finance")
	src := gr.records
	if len(yahoo) > 0 {
		src = yahoo
	}
	if len(src) == 0 {
		return nil, fmt.Errorf("no price data")
	}

	vndRate := rr.vndRate
	latest := src[len(src)-1]
	usdPerOz := latest.Price
	usdPerGram := usdPerOz / troyOunceGrams

	sort.Slice(yahoo, func(i, j int) bool { return yahoo[i].Date < yahoo[j].Date })
	cutoff := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	var hist []histPoint
	for _, r := range yahoo {
		if r.Date >= cutoff {
			g := r.Price / troyOunceGrams
			hist = append(hist, histPoint{
				date:       r.Date,
				usdPerOz:   r.Price,
				usdPerGram: g,
				vndPerGram: g * vndRate,
				vndPerTael: g * vndRate * taelGrams,
			})
		}
	}
	// Reverse: newest first for the table.
	for i, j := 0, len(hist)-1; i < j; i, j = i+1, j-1 {
		hist[i], hist[j] = hist[j], hist[i]
	}

	return &priceData{
		usdPerOz:   usdPerOz,
		usdPerGram: usdPerGram,
		vndPerGram: usdPerGram * vndRate,
		vndPerTael: usdPerGram * vndRate * taelGrams,
		usdVnd:     vndRate,
		fetchedAt:  time.Now(),
		history:    hist,
	}, nil
}

func filterSource(records []goldRecord, source string) []goldRecord {
	var out []goldRecord
	for _, r := range records {
		if r.Source == source {
			out = append(out, r)
		}
	}
	return out
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height

	case tea.KeyPressMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "r", "R":
			return m, m.startFetch()
		case "up", "k":
			if m.offset > 0 {
				m.offset--
			}
		case "down", "j":
			if m.offset < m.maxOffset() {
				m.offset++
			}
		}

	case tea.MouseMsg:
		var nm tea.Model
		var cmd tea.Cmd
		nm, cmd = m.handleMouse(msg)
		return nm, cmd

	case fetchDoneMsg:
		m.applyFetch(msg)

	case refreshTickMsg:
		return m, tea.Batch(m.startFetch(), refreshTickCmd())

	case secondTickMsg:
		return m, secondTickCmd() // keep the "next refresh in Ns" countdown live

	case spinnerTickMsg:
		// Advance only while a fetch is in flight; otherwise let the loop die so
		// an idle UI is never woken at 10Hz.
		if m.loading {
			m.spinnerFrame++
			return m, spinnerTickCmd()
		}
		m.spinning, m.spinnerFrame = false, 0
		return m, nil
	}
	return m, nil
}

// startFetch dispatches a fetch and (re)starts the spinner loop if it isn't
// already running, so the spinner Cmd is never stacked.
func (m *model) startFetch() tea.Cmd {
	cmd := m.fetchCmd()
	if !m.spinning {
		m.spinning = true
		return tea.Batch(cmd, spinnerTickCmd())
	}
	return cmd
}

// applyFetch applies a completed fetch, dropping a stale result (one whose gen no
// longer matches — a newer fetch was dispatched since). Without this, a slow
// fetch landing after a fast one would overwrite fresher data.
func (m *model) applyFetch(msg fetchDoneMsg) {
	if msg.gen != m.fetchGen {
		return // stale: superseded by a newer dispatch
	}
	m.loading = false
	if msg.err != nil {
		m.err = msg.err
		return
	}
	m.err = nil
	m.data = msg.data
	m.offset = 0
	m.hoverRow = -1
}

// ---------------------------------------------------------------------------
// Mouse — hit-testing through the SAME layout() the renderer uses
// ---------------------------------------------------------------------------

func (m model) handleMouse(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	e := msg.Mouse()
	switch msg.(type) {
	case tea.MouseWheelMsg:
		switch e.Button {
		case tea.MouseWheelUp:
			if m.offset > 0 {
				m.offset--
			}
		case tea.MouseWheelDown:
			if m.offset < m.maxOffset() {
				m.offset++
			}
		}
	case tea.MouseMotionMsg:
		// Reverse-map screen Y → history index through layout(): the inverse of
		// what the renderer did. No hardcoded "table starts at row 18".
		g := m.layout()
		row := e.Y - g.tableTopY
		if m.data != nil && row >= 0 && row < g.visibleRows {
			idx := m.offset + row
			if idx < len(m.data.history) {
				m.hoverRow = idx
			} else {
				m.hoverRow = -1
			}
		} else {
			m.hoverRow = -1
		}
	}
	return m, nil
}

// ---------------------------------------------------------------------------
// Layout — derived purely from state; shared by View() and the mouse handler
// ---------------------------------------------------------------------------

type layout struct {
	tableTopY   int // screen Y of the first history-table data row
	visibleRows int // how many data rows fit
	hasSpark    bool
}

// layout computes the dashboard geometry from model state ALONE so View() (which
// renders into it) and handleMouse() (which reverse-maps clicks through it) can
// never disagree about where the table sits. The section order/heights here MUST
// match the order View() appends them in.
func (m model) layout() layout {
	hasSpark := m.data != nil && len(m.data.history) >= 2

	y := hHeader + hGap // header + blank
	if m.data != nil {
		y += hCardRow + hCardRow + hGap // two card rows + blank
		if hasSpark {
			y += hSectTitle + hGap + hSpark + hSparkRng + hGap
		}
		y += hSectTitle + hGap // history title + blank
		y += hTableHead + hTableDiv
	}

	// Body height minus the footer (blank + status row) and the rows above.
	visible := m.height - y - 2
	if visible < 1 {
		visible = 1
	}
	return layout{tableTopY: y, visibleRows: visible, hasSpark: hasSpark}
}

func (m model) maxOffset() int {
	if m.data == nil {
		return 0
	}
	o := len(m.data.history) - m.layout().visibleRows
	if o < 0 {
		return 0
	}
	return o
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

func (m model) View() tea.View {
	content := "loading…"
	if m.width != 0 && m.height != 0 {
		content = m.render()
	}
	v := tea.NewView(content)
	v.AltScreen = true
	v.MouseMode = tea.MouseModeCellMotion
	return v
}

func (m model) render() string {
	ew := m.width
	if ew > maxWidth {
		ew = maxWidth
	}
	g := m.layout()

	var lines []string

	// ── Header ──────────────────────────────────────────────────────────────
	left := titleStyle.Render("● GOLD MONITOR")
	var right string
	switch {
	case m.loading:
		right = dimStyle.Render("fetching…")
	case m.data != nil:
		remaining := refreshInterval - time.Since(m.data.fetchedAt)
		if remaining < 0 {
			remaining = 0
		}
		right = dimStyle.Render(fmt.Sprintf("updated %s · next in %ds",
			m.data.fetchedAt.Format("15:04:05"), int(remaining.Seconds())))
	}
	gap := ew - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	lines = append(lines, left+strings.Repeat(" ", gap)+right)
	lines = append(lines, "")

	// ── Error with no cached data ─────────────────────────────────────────────
	if m.err != nil && m.data == nil {
		lines = append(lines, errorStyle.Render("Error: "+m.err.Error()))
		lines = append(lines, "")
		lines = append(lines, dimStyle.Render("[R]etry  [Q]uit"))
		return m.place(strings.Join(lines, "\n"))
	}
	if m.data == nil {
		lines = append(lines, dimStyle.Render("fetching prices…"))
		return m.place(strings.Join(lines, "\n"))
	}

	d := m.data
	cardInner := (ew / 3) - cardStyle.GetHorizontalFrameSize()
	if cardInner < 14 {
		cardInner = 14
	}
	mkCard := func(label, value string, primary bool) string {
		v := valStyle.Render(value)
		if primary {
			v = bigValStyle.Render(value)
		}
		// .Width is the OUTER width in lipgloss v2 (border+padding included), so
		// pass cardInner + the frame to leave exactly cardInner content columns.
		ow := cardInner + cardStyle.GetHorizontalFrameSize()
		return cardStyle.Width(ow).Render(labelStyle.Render(label) + "\n" + v)
	}

	lines = append(lines, lipgloss.JoinHorizontal(lipgloss.Top,
		mkCard("XAU/USD", "$"+fmtFloat(d.usdPerOz, 2)+" /oz", true),
		mkCard("USD/GRAM", "$"+fmtFloat(d.usdPerGram, 2), false),
		mkCard("USD→VND", fmtFloat(d.usdVnd, 0), false),
	))
	lines = append(lines, lipgloss.JoinHorizontal(lipgloss.Top,
		mkCard("VND/TAEL", fmtFloat(d.vndPerTael, 0), true),
		mkCard("VND/GRAM", fmtFloat(d.vndPerGram, 0), false),
	))
	lines = append(lines, "")

	// ── 30-day sparkline ──────────────────────────────────────────────────────
	if g.hasSpark {
		lines = append(lines, sectionStyle.Render("30-DAY TREND"))
		lines = append(lines, "")
		hist := d.history
		prices := make([]float64, len(hist))
		for i, h := range hist {
			prices[len(hist)-1-i] = h.usdPerOz // oldest→newest
		}
		lines = append(lines, m.sparkline(prices, ew))
		oldest, newest := hist[len(hist)-1], hist[0]
		change := (newest.usdPerOz - oldest.usdPerOz) / oldest.usdPerOz * 100
		lines = append(lines, dimStyle.Render("$"+fmtFloat(oldest.usdPerOz, 0))+
			"  "+m.changeStr(change)+"  "+dimStyle.Render("$"+fmtFloat(newest.usdPerOz, 0)))
		lines = append(lines, "")
	}

	// ── History table ─────────────────────────────────────────────────────────
	lines = append(lines, sectionStyle.Render("HISTORY  ")+dimStyle.Render("(newest first)"))
	lines = append(lines, "")
	lines = append(lines, tableHeader([]string{"DATE", "USD/OZ", "USD/G", "VND/TAEL", "CHANGE"}))
	divWidth := colDate + colUSDOz + colUSDG + colVNDTael + colChange
	lines = append(lines, dividerStyle.Render(strings.Repeat("─", divWidth)))

	end := m.offset + g.visibleRows
	if end > len(d.history) {
		end = len(d.history)
	}
	for i := m.offset; i < end; i++ {
		lines = append(lines, m.tableRow(d.history, i, i == m.hoverRow))
	}

	// ── Footer with a fixed-width reserved spinner slot ────────────────────────
	lines = append(lines, "")
	lines = append(lines, m.footer(ew))

	return m.place(strings.Join(lines, "\n"))
}

// place centers the content on terminals wider than maxWidth.
func (m model) place(content string) string {
	if m.width > maxWidth {
		return lipgloss.PlaceHorizontal(m.width, lipgloss.Center, content)
	}
	return content
}

// footer keeps the hints flush-left and reserves a fixed 2-col slot at the right
// edge for the spinner — a glyph while fetching, two spaces when idle — so the
// indicator never reflows the bar (the classic footer-flicker fix).
func (m model) footer(ew int) string {
	hints := "[R]efresh  [↑/↓ / wheel] Scroll  [Q]uit"
	slot := "  "
	if m.loading {
		slot = " " + renderingStyle.Render(spinnerFrames[m.spinnerFrame%len(spinnerFrames)])
	}
	contentW := ew - statusBarStyle.GetHorizontalFrameSize()
	pad := contentW - lipgloss.Width(hints) - lipgloss.Width(slot)
	if pad < 1 {
		pad = 1
	}
	return statusBarStyle.Render(hints + strings.Repeat(" ", pad) + slot)
}

func (m model) changeStr(change float64) string {
	s := fmt.Sprintf("%+.2f%%", change)
	if m.renderStyle == "notty" {
		return s
	}
	if change >= 0 {
		return successStyle.Render(s)
	}
	return dangerStyle.Render(s)
}

func (m model) tableRow(history []histPoint, i int, hover bool) string {
	h := history[i]
	bg := func(s lipgloss.Style) lipgloss.Style {
		if hover {
			return s.Background(colHoverBg)
		}
		return s
	}
	cell := func(w int, right bool) lipgloss.Style {
		s := lipgloss.NewStyle().Width(w)
		if right {
			s = s.Align(lipgloss.Right)
		}
		return bg(s)
	}

	// Change vs the next-older entry (history is newest-first → i+1 is older).
	var changeCell string
	if i+1 < len(history) {
		prev := history[i+1].usdPerOz
		chg := (h.usdPerOz - prev) / prev * 100
		var fg color.Color = colSuccess
		if chg < 0 {
			fg = colDanger
		}
		if m.renderStyle == "notty" {
			fg = colFg
		}
		changeCell = bg(lipgloss.NewStyle().Width(colChange).Align(lipgloss.Right).Foreground(fg)).
			Render(fmt.Sprintf("%+.2f%%", chg))
	} else {
		changeCell = cell(colChange, true).Foreground(colDim).Render("—")
	}

	return cell(colDate, false).Render(h.date) +
		cell(colUSDOz, true).Render("$"+fmtFloat(h.usdPerOz, 2)) +
		cell(colUSDG, true).Render("$"+fmtFloat(h.usdPerGram, 2)) +
		cell(colVNDTael, true).Render(fmtFloat(h.vndPerTael, 0)) +
		changeCell
}

func tableHeader(cells []string) string {
	widths := []int{colDate, colUSDOz, colUSDG, colVNDTael, colChange}
	var parts []string
	for i, c := range cells {
		s := lipgloss.NewStyle().Width(widths[i]).Foreground(colDim)
		if i > 0 {
			s = s.Align(lipgloss.Right)
		}
		parts = append(parts, s.Render(c))
	}
	return lipgloss.JoinHorizontal(lipgloss.Top, parts...)
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

var sparkBars = []rune{'▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'}

func (m model) sparkline(prices []float64, width int) string {
	if len(prices) > width {
		prices = downsample(prices, width)
	}
	minP, maxP := prices[0], prices[0]
	for _, p := range prices {
		if p < minP {
			minP = p
		}
		if p > maxP {
			maxP = p
		}
	}
	mid := (minP + maxP) / 2
	var sb strings.Builder
	for _, p := range prices {
		var idx int
		if maxP > minP {
			idx = int(math.Round((p - minP) / (maxP - minP) * float64(len(sparkBars)-1)))
		}
		glyph := string(sparkBars[idx])
		if m.renderStyle == "notty" {
			sb.WriteString(glyph)
			continue
		}
		if p >= mid {
			sb.WriteString(successStyle.Render(glyph))
		} else {
			sb.WriteString(dangerStyle.Render(glyph))
		}
	}
	return sb.String()
}

func downsample(data []float64, target int) []float64 {
	out := make([]float64, target)
	for i := range out {
		lo := i * len(data) / target
		hi := (i + 1) * len(data) / target
		if hi <= lo {
			hi = lo + 1
		}
		sum := 0.0
		for _, v := range data[lo:hi] {
			sum += v
		}
		out[i] = sum / float64(hi-lo)
	}
	return out
}

// ---------------------------------------------------------------------------
// Number formatting (Go has no %,d)
// ---------------------------------------------------------------------------

func fmtFloat(f float64, decimals int) string {
	s := fmt.Sprintf("%.*f", decimals, f)
	parts := strings.SplitN(s, ".", 2)
	result := addCommas(parts[0])
	if len(parts) == 2 {
		return result + "." + parts[1]
	}
	return result
}

func addCommas(s string) string {
	neg := strings.HasPrefix(s, "-")
	if neg {
		s = s[1:]
	}
	var groups []string
	for len(s) > 3 {
		groups = append([]string{s[len(s)-3:]}, groups...)
		s = s[:len(s)-3]
	}
	groups = append([]string{s}, groups...)
	result := strings.Join(groups, ",")
	if neg {
		return "-" + result
	}
	return result
}

// ---------------------------------------------------------------------------
// main — resolve the color profile ONCE here, before tea takes the terminal
// ---------------------------------------------------------------------------

func detectRenderStyle() string {
	switch colorprofile.Detect(os.Stdout, os.Environ()) {
	case colorprofile.NoTTY, colorprofile.Ascii:
		return "notty" // piped / not a color terminal — render plain
	}
	return "color"
}

func main() {
	m := newModel(detectRenderStyle())
	if _, err := tea.NewProgram(m).Run(); err != nil {
		fmt.Fprintln(os.Stderr, "gold-monitor:", err)
		os.Exit(1)
	}
}
