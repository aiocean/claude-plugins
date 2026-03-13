package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

const (
	troyOunceGrams  = 31.1035
	taelGrams       = 37.5
	refreshInterval = 60 * time.Second
	goldURL         = "https://freegoldapi.com/data/latest.json"
	maxWidth        = 120 // cap layout width; content is centered on wider terminals
	exchangeURL     = "https://api.exchangerate-api.com/v4/latest/USD"
)

// Table column widths
const (
	colDate    = 12
	colUSDOz   = 12
	colUSDG    = 10
	colVNDTael = 18
	colChange  = 10
)

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

var (
	colorPrimary = lipgloss.Color("#7D56F4")
	colorSuccess = lipgloss.Color("#28A745")
	colorDanger  = lipgloss.Color("#DC3545")
	colorDim     = lipgloss.Color("#6C757D")
	colorMuted   = lipgloss.Color("#ADB5BD")

	titleStyle   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#FFFFFF"))
	labelStyle   = lipgloss.NewStyle().Foreground(colorDim)
	bigValStyle  = lipgloss.NewStyle().Bold(true).Foreground(colorPrimary)
	valStyle     = lipgloss.NewStyle().Bold(true)
	dimStyle     = lipgloss.NewStyle().Foreground(colorMuted)
	sectionStyle = lipgloss.NewStyle().Bold(true).Foreground(colorPrimary)
	errorStyle   = lipgloss.NewStyle().Foreground(colorDanger)
	successStyle = lipgloss.NewStyle().Foreground(colorSuccess)
	dangerStyle  = lipgloss.NewStyle().Foreground(colorDanger)

	headerStyle = lipgloss.NewStyle().
			Background(colorPrimary).
			Foreground(lipgloss.Color("#FFFFFF")).
			Bold(true).
			Padding(0, 2)

	dividerStyle = lipgloss.NewStyle().Foreground(colorDim)
)

// ---------------------------------------------------------------------------
// Table helper (from patterns.md)
// ---------------------------------------------------------------------------

type col struct {
	width int
	align lipgloss.Position
}

func lCol(s string, w int) string {
	return lipgloss.NewStyle().Width(w).Render(s)
}

func rCol(s string, w int) string {
	return lipgloss.NewStyle().Width(w).Align(lipgloss.Right).Render(s)
}

func tableHeader(cols []col, cells []string) string {
	var parts []string
	for i, cell := range cells {
		if i >= len(cols) {
			break
		}
		style := lipgloss.NewStyle().Width(cols[i].width).Foreground(colorDim)
		if cols[i].align == lipgloss.Right {
			style = style.Align(lipgloss.Right)
		}
		parts = append(parts, style.Render(cell))
	}
	return lipgloss.JoinHorizontal(lipgloss.Top, parts...)
}

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

type goldRecord struct {
	Date   string  `json:"date"`
	Price  float64 `json:"price"`
	Source string  `json:"source"`
}

type exchangeRateResp struct {
	Rates map[string]float64 `json:"rates"`
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

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

type fetchDoneMsg struct {
	data *priceData
	err  error
}
type refreshTickMsg time.Time
type secondTickMsg time.Time

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

type model struct {
	data      *priceData
	loading   bool
	err       error
	width     int
	height    int
	offset    int // scroll offset for history table
	hoverRow  int // -1 = no hover; index into visible rows
	filter    string
	filtering bool // true = typing in filter box
	filtered  []histPoint
}

func newModel() model {
	return model{loading: true, hoverRow: -1}
}

func (m model) Init() tea.Cmd {
	return tea.Batch(fetchPrices, refreshTickCmd(), secondTickCmd())
}

func refreshTickCmd() tea.Cmd {
	return tea.Tick(refreshInterval, func(t time.Time) tea.Msg { return refreshTickMsg(t) })
}

func secondTickCmd() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg { return secondTickMsg(t) })
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

func fetchPrices() tea.Msg {
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
		return fetchDoneMsg{err: fmt.Errorf("gold API: %w", gr.err)}
	}
	if rr.err != nil {
		return fetchDoneMsg{err: fmt.Errorf("exchange rate API: %w", rr.err)}
	}

	yahoo := filterSource(gr.records, "yahoo_finance")
	src := gr.records
	if len(yahoo) > 0 {
		src = yahoo
	}
	if len(src) == 0 {
		return fetchDoneMsg{err: fmt.Errorf("no price data")}
	}

	vndRate := rr.vndRate
	latest := src[len(src)-1]
	usdPerOz := latest.Price
	usdPerGram := usdPerOz / troyOunceGrams

	// 30-day history, sorted oldest→newest for sparkline, then reversed for table
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
	// Reverse: newest first for table display
	for i, j := 0, len(hist)-1; i < j; i, j = i+1, j-1 {
		hist[i], hist[j] = hist[j], hist[i]
	}

	return fetchDoneMsg{data: &priceData{
		usdPerOz:   usdPerOz,
		usdPerGram: usdPerGram,
		vndPerGram: usdPerGram * vndRate,
		vndPerTael: usdPerGram * vndRate * taelGrams,
		usdVnd:     vndRate,
		fetchedAt:  time.Now(),
		history:    hist,
	}}
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
	case tea.KeyMsg:
		if m.filtering {
			return m.updateFilter(msg)
		}
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "r", "R":
			m.loading = true
			return m, fetchPrices
		case "up", "k":
			if m.offset > 0 {
				m.offset--
			}
		case "down", "j":
			max := len(m.filtered) - 1
			if m.offset < max {
				m.offset++
			}
		case "/":
			m.filtering = true
			m.filter = ""
			m.applyFilter()
		case "esc":
			m.filter = ""
			m.offset = 0
			m.applyFilter()
		}

	case tea.MouseMsg:
		if msg.Action == tea.MouseActionMotion || msg.Action == tea.MouseActionPress {
			// Table starts after: header(1) + blank(1) + section(1) + blank(1) +
			// price rows(2) + blank(1) + price rows(2) + sparkline section(3) +
			// sparkline rows(2) + history section(1) + blank(1) + header(1) + divider(1) = ~18
			tableStartY := 18
			row := msg.Y - tableStartY + m.offset
			if row >= 0 && row < len(m.filtered) {
				m.hoverRow = row
			} else {
				m.hoverRow = -1
			}
		}

	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height

	case fetchDoneMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
		} else {
			m.err = nil
			m.data = msg.data
			m.offset = 0
			m.hoverRow = -1
			m.applyFilter()
		}

	case refreshTickMsg:
		m.loading = true
		return m, tea.Batch(fetchPrices, refreshTickCmd())

	case secondTickMsg:
		return m, secondTickCmd()
	}
	return m, nil
}

func (m model) updateFilter(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		m.filtering = false
		m.offset = 0
	case "esc":
		m.filtering = false
		m.filter = ""
		m.offset = 0
		m.applyFilter()
	case "backspace":
		if len(m.filter) > 0 {
			m.filter = m.filter[:len(m.filter)-1]
			m.applyFilter()
		}
	default:
		if len(msg.String()) == 1 {
			m.filter += msg.String()
			m.applyFilter()
		}
	}
	return m, nil
}

func (m *model) applyFilter() {
	if m.data == nil {
		m.filtered = nil
		return
	}
	if m.filter == "" {
		m.filtered = m.data.history
		return
	}
	var out []histPoint
	for _, h := range m.data.history {
		if strings.Contains(h.date, m.filter) {
			out = append(out, h)
		}
	}
	m.filtered = out
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

func (m model) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	// Effective width: capped at maxWidth, centered when terminal is wider
	ew := m.width
	if ew > maxWidth {
		ew = maxWidth
	}

	var lines []string

	// ── Header bar (effective width) ────────────────────────────────────────
	left := "● GOLD MONITOR"
	var right string
	if m.loading {
		right = "↻ Fetching…"
	} else if m.data != nil {
		remaining := refreshInterval - time.Since(m.data.fetchedAt)
		if remaining < 0 {
			remaining = 0
		}
		right = fmt.Sprintf("Updated %s  |  Next refresh in %ds",
			m.data.fetchedAt.Format("15:04:05"),
			int(remaining.Seconds()),
		)
	}
	gap := ew - lipgloss.Width(left) - lipgloss.Width(right) - 4
	if gap < 1 {
		gap = 1
	}
	header := left + strings.Repeat(" ", gap) + right
	lines = append(lines, headerStyle.Width(ew).Render(header))

	// ── Error (no cached data) ───────────────────────────────────────────────
	if m.err != nil && m.data == nil {
		lines = append(lines, "")
		lines = append(lines, "  "+errorStyle.Render("Error: "+m.err.Error()))
		lines = append(lines, "")
		lines = append(lines, "  "+dimStyle.Render("[R]etry  [Q]uit"))
		return strings.Join(lines, "\n")
	}

	if m.data == nil {
		lines = append(lines, "")
		lines = append(lines, "  "+dimStyle.Render("Fetching prices…"))
		return strings.Join(lines, "\n")
	}

	d := m.data
	w := ew - 4 // usable width (2-char indent each side)

	// ── Current prices (cards) ───────────────────────────────────────────────
	lines = append(lines, "")

	// Cards fill full terminal width exactly.
	// Each card outer width = cardInner + padding(2+2) + border(1+1) = cardInner + 6
	// 3 cards: 3 * (cardInner + 6) = m.width  →  cardInner = (m.width / 3) - 6
	cardInner := (ew / 3) - 6
	if cardInner < 14 {
		cardInner = 14
	}

	mkCard := func(label, value string, highlight bool) string {
		var val string
		if highlight {
			val = bigValStyle.Render(value)
		} else {
			val = valStyle.Render(value)
		}
		return lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#4A4A6A")).
			Padding(0, 2).
			Width(cardInner).
			Render(labelStyle.Render(label) + "\n" + val)
	}

	priceRow1 := lipgloss.JoinHorizontal(lipgloss.Top,
		mkCard("XAU/USD", "$"+fmtFloat(d.usdPerOz, 2)+" /oz", true),
		mkCard("USD/GRAM", "$"+fmtFloat(d.usdPerGram, 2), false),
		mkCard("EXCHANGE RATE", "1 USD = "+fmtFloat(d.usdVnd, 0)+" VND", false),
	)
	priceRow2 := lipgloss.JoinHorizontal(lipgloss.Top,
		mkCard("VND/TAEL (1 lượng)", fmtFloat(d.vndPerTael, 0), true),
		mkCard("VND/GRAM", fmtFloat(d.vndPerGram, 0), false),
	)

	lines = append(lines, priceRow1)
	lines = append(lines, priceRow2)

	// ── 30-day sparkline ─────────────────────────────────────────────────────
	if len(d.history) >= 2 {
		lines = append(lines, "")
		lines = append(lines, "  "+sectionStyle.Render("30-DAY TREND"))
		lines = append(lines, "")

		// history is newest-first; reverse for sparkline (oldest→newest)
		hist := d.history
		prices := make([]float64, len(hist))
		for i, h := range hist {
			prices[len(hist)-1-i] = h.usdPerOz
		}

		lines = append(lines, "  "+sparkline(prices, w))

		oldest := hist[len(hist)-1]
		newest := hist[0]
		change := (newest.usdPerOz - oldest.usdPerOz) / oldest.usdPerOz * 100
		var changeStr string
		if change >= 0 {
			changeStr = successStyle.Render(fmt.Sprintf("%+.2f%%", change))
		} else {
			changeStr = dangerStyle.Render(fmt.Sprintf("%+.2f%%", change))
		}
		lines = append(lines,
			"  "+dimStyle.Render("$"+fmtFloat(oldest.usdPerOz, 0))+"  "+changeStr+"  "+dimStyle.Render("$"+fmtFloat(newest.usdPerOz, 0)),
		)
	}

	// ── History table ─────────────────────────────────────────────────────────
	if len(d.history) > 0 {
		lines = append(lines, "")

		// Filter bar
		var filterBar string
		if m.filtering {
			filterBar = lipgloss.NewStyle().Foreground(colorPrimary).Render(fmt.Sprintf(" / %s█", m.filter))
		} else if m.filter != "" {
			filterBar = dimStyle.Render(fmt.Sprintf(" filter: %s  [Esc] clear", m.filter))
		}
		histTitle := "  " + sectionStyle.Render("HISTORY  ") + dimStyle.Render("(newest first)")
		if filterBar != "" {
			histTitle += "   " + filterBar
		}
		lines = append(lines, histTitle)
		lines = append(lines, "")

		cols := []col{
			{width: colDate},
			{width: colUSDOz, align: lipgloss.Right},
			{width: colUSDG, align: lipgloss.Right},
			{width: colVNDTael, align: lipgloss.Right},
			{width: colChange, align: lipgloss.Right},
		}
		divWidth := colDate + colUSDOz + colUSDG + colVNDTael + colChange

		lines = append(lines, "  "+tableHeader(cols, []string{"DATE", "USD/OZ", "USD/G", "VND/TAEL", "CHANGE"}))
		lines = append(lines, "  "+dividerStyle.Render(strings.Repeat("─", divWidth)))

		tableHeaderLine := len(lines) // Y offset of first data row

		// Calculate visible rows
		usedLines := tableHeaderLine + 3 // footer lines
		visibleRows := m.height - usedLines
		if visibleRows < 3 {
			visibleRows = 3
		}

		end := m.offset + visibleRows
		if end > len(m.filtered) {
			end = len(m.filtered)
		}

		hoverBg := lipgloss.Color("#2A2A3A")

		for i := m.offset; i < end; i++ {
			h := m.filtered[i]
			isHover := i == m.hoverRow

			// Find change vs next older entry in full history
			var changeCell string
			origIdx := findInHistory(d.history, h.date)
			if origIdx >= 0 && origIdx+1 < len(d.history) {
				prev := d.history[origIdx+1].usdPerOz
				chg := (h.usdPerOz - prev) / prev * 100
				chgStr := fmt.Sprintf("%+.2f%%", chg)
				var fg lipgloss.Color
				if chg >= 0 {
					fg = colorSuccess
				} else {
					fg = colorDanger
				}
				sty := lipgloss.NewStyle().Width(colChange).Align(lipgloss.Right).Foreground(fg)
				if isHover {
					sty = sty.Background(hoverBg)
				}
				changeCell = sty.Render(chgStr)
			} else {
				sty := lipgloss.NewStyle().Width(colChange).Align(lipgloss.Right).Foreground(colorDim)
				if isHover {
					sty = sty.Background(hoverBg)
				}
				changeCell = sty.Render("—")
			}

			cellStyle := func(w int, align lipgloss.Position) lipgloss.Style {
				s := lipgloss.NewStyle().Width(w)
				if align == lipgloss.Right {
					s = s.Align(lipgloss.Right)
				}
				if isHover {
					s = s.Background(hoverBg)
				}
				return s
			}

			row := cellStyle(colDate, lipgloss.Left).Render(h.date) +
				cellStyle(colUSDOz, lipgloss.Right).Render("$"+fmtFloat(h.usdPerOz, 2)) +
				cellStyle(colUSDG, lipgloss.Right).Render("$"+fmtFloat(h.usdPerGram, 2)) +
				cellStyle(colVNDTael, lipgloss.Right).Render(fmtFloat(h.vndPerTael, 0)) +
				changeCell

			lines = append(lines, "  "+row)
		}

		if len(m.filtered) == 0 && m.filter != "" {
			lines = append(lines, "  "+dimStyle.Render("  No results for \""+m.filter+"\""))
		} else if len(m.filtered) > visibleRows {
			lines = append(lines, "  "+dimStyle.Render(
				fmt.Sprintf("  %d–%d of %d rows  [↑/↓] scroll", m.offset+1, end, len(m.filtered)),
			))
		}
	}

	// ── Footer ────────────────────────────────────────────────────────────────
	lines = append(lines, "")
	lines = append(lines, "  "+dimStyle.Render("[R]efresh  [/] Filter  [↑/↓] Scroll  [Q]uit"))

	content := strings.Join(lines, "\n")
	if m.width > maxWidth {
		return lipgloss.PlaceHorizontal(m.width, lipgloss.Center, content)
	}
	return content
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

var sparkBars = []rune{'▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'}

func sparkline(prices []float64, width int) string {
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
		if p >= mid {
			sb.WriteString(successStyle.Render(string(sparkBars[idx])))
		} else {
			sb.WriteString(dangerStyle.Render(string(sparkBars[idx])))
		}
	}
	return sb.String()
}

func findInHistory(history []histPoint, date string) int {
	for i, h := range history {
		if h.date == date {
			return i
		}
	}
	return -1
}

func downsample(data []float64, target int) []float64 {
	out := make([]float64, target)
	for i := range out {
		lo := i * len(data) / target
		hi := (i + 1) * len(data) / target
		sum := 0.0
		for _, v := range data[lo:hi] {
			sum += v
		}
		out[i] = sum / float64(hi-lo)
	}
	return out
}

// ---------------------------------------------------------------------------
// Number formatting
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
// Main
// ---------------------------------------------------------------------------

func main() {
	p := tea.NewProgram(newModel(), tea.WithAltScreen(), tea.WithMouseAllMotion())
	if _, err := p.Run(); err != nil {
		fmt.Println("Error:", err)
	}
}
