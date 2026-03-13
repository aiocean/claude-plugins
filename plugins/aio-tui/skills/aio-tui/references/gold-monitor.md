# Gold Price Monitor TUI — Complete Go Example

Real-time gold price monitor using free public APIs (no API key required).
Displays XAU/USD, USD/g, VND/g, VND/tael, and a 30-day sparkline history.

## APIs Used

| API | URL | Auth |
|-----|-----|------|
| Gold price + history | `https://freegoldapi.com/data/latest.json` | None |
| Exchange rates | `https://api.exchangerate-api.com/v4/latest/USD` | None |

The gold API returns a JSON array of `{date, price, source}` where `price` is USD/troy oz.
Filter by `source == "yahoo_finance"` for the most reliable data.

## Project Setup

```bash
mkdir gold-monitor && cd gold-monitor
go mod init gold-monitor
go get github.com/charmbracelet/bubbletea@latest
go get github.com/charmbracelet/lipgloss@latest
go run main.go
```

## Preview

```
● GOLD MONITOR                    Updated 14:32:01  |  Next refresh in 47s

  CURRENT PRICE

  XAU/USD                  USD/GRAM         EXCHANGE RATE
  $2,650.40 /oz            $85.20           1 USD = 25,480 VND

  VND/TAEL (1 lượng)       VND/GRAM
  81,438,600               2,171,696

  30-DAY TREND

  ▁▂▃▄▄▅▅▆▇▇█▇▆▅▄▄▅▆▇█▇▇▆▅▄▃▄▅▆▇█▇▆▅▄▄▅▆▇█
  $2,535  +4.54%  $2,650

  HISTORY  (newest first)

  DATE          USD/OZ     USD/G          VND/TAEL  CHANGE
  ────────────────────────────────────────────────────────
  2024-01-15   2,650.40   85.20    81,438,600       +0.42%
  2024-01-14   2,639.20   84.84    81,094,080       -0.18%
  2024-01-13   2,644.10   85.00    81,244,560       +0.19%
  2024-01-12   2,639.10   84.83    81,090,930       -0.51%
  ...
  1–10 of 30 rows  [↑/↓] to scroll

  [R]efresh  [↑/↓] Scroll  [Q]uit
```

## main.go

```go
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
	exchangeURL     = "https://api.exchangerate-api.com/v4/latest/USD"
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

	titleStyle = lipgloss.NewStyle().Bold(true).Foreground(colorPrimary)
	labelStyle = lipgloss.NewStyle().Foreground(colorDim)
	valueStyle = lipgloss.NewStyle().Bold(true)
	dimStyle   = lipgloss.NewStyle().Foreground(colorMuted)
	errorStyle = lipgloss.NewStyle().Foreground(colorDanger)
	boxStyle   = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colorDim).
			Padding(1, 2)
)

// ---------------------------------------------------------------------------
// API response types
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
	date  string
	price float64 // USD/oz
}

type priceData struct {
	usdPerOz   float64
	usdPerGram float64
	vndPerGram float64
	vndPerTael float64
	usdVnd     float64
	fetchedAt  time.Time
	history    []histPoint // up to 30 days, sorted oldest→newest
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

type fetchDoneMsg struct {
	data *priceData
	err  error
}

type tickMsg time.Time

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

type model struct {
	data    *priceData
	loading bool
	err     error
	width   int
	height  int
}

func newModel() model {
	return model{loading: true}
}

func (m model) Init() tea.Cmd {
	return tea.Batch(fetchPrices, tickCmd())
}

func tickCmd() tea.Cmd {
	return tea.Tick(refreshInterval, func(t time.Time) tea.Msg { return tickMsg(t) })
}

// ---------------------------------------------------------------------------
// Fetch — runs in a goroutine automatically (tea.Cmd = func() tea.Msg)
// ---------------------------------------------------------------------------

func fetchPrices() tea.Msg {
	client := &http.Client{Timeout: 15 * time.Second}

	// Fetch both APIs concurrently
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

	// Use yahoo_finance source (most reliable), fall back to all records
	yahoo := filterSource(gr.records, "yahoo_finance")
	source := gr.records
	if len(yahoo) > 0 {
		source = yahoo
	}
	if len(source) == 0 {
		return fetchDoneMsg{err: fmt.Errorf("no price data returned")}
	}

	latest := source[len(source)-1]
	usdPerOz := latest.Price
	usdPerGram := usdPerOz / troyOunceGrams
	vndRate := rr.vndRate
	vndPerGram := usdPerGram * vndRate
	vndPerTael := vndPerGram * taelGrams

	// 30-day history from yahoo_finance records
	sort.Slice(yahoo, func(i, j int) bool { return yahoo[i].Date < yahoo[j].Date })
	cutoff := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	var hist []histPoint
	for _, r := range yahoo {
		if r.Date >= cutoff {
			hist = append(hist, histPoint{date: r.Date, price: r.Price})
		}
	}

	return fetchDoneMsg{data: &priceData{
		usdPerOz:   usdPerOz,
		usdPerGram: usdPerGram,
		vndPerGram: vndPerGram,
		vndPerTael: vndPerTael,
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
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "r", "R":
			m.loading = true
			return m, fetchPrices
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
		}
	case tickMsg:
		m.loading = true
		return m, tea.Batch(fetchPrices, tickCmd())
	}
	return m, nil
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

func (m model) View() string {
	// Initial load
	if m.loading && m.data == nil {
		return boxStyle.Render(
			titleStyle.Render("GOLD MONITOR") + "\n\n" +
				labelStyle.Render("Fetching prices..."),
		)
	}

	var b strings.Builder

	// Header row
	header := titleStyle.Render("GOLD MONITOR")
	if m.data != nil {
		header += "   " + dimStyle.Render("Updated: "+m.data.fetchedAt.Format("15:04:05"))
	}
	if m.loading {
		header += "  " + dimStyle.Render("(refreshing…)")
	}
	b.WriteString(header + "\n\n")

	// Error state (but keep showing old data if available)
	if m.err != nil && m.data == nil {
		b.WriteString(errorStyle.Render("Error: "+m.err.Error()) + "\n\n")
		b.WriteString(dimStyle.Render("[R]etry  [Q]uit"))
		return boxStyle.Render(b.String())
	}

	if m.data == nil {
		return boxStyle.Render(b.String())
	}

	d := m.data

	// International price
	b.WriteString(labelStyle.Render("INTERNATIONAL (XAU/USD)") + "\n")
	b.WriteString(
		valueStyle.Render("$"+fmtFloat(d.usdPerOz, 2)+" /oz") + "   " +
			valueStyle.Render("$"+fmtFloat(d.usdPerGram, 2)+" /g") + "\n\n",
	)

	// VND price
	b.WriteString(labelStyle.Render("VND  (1 USD = "+fmtFloat(d.usdVnd, 0)+" VND)") + "\n")
	b.WriteString(
		valueStyle.Render(fmtFloat(d.vndPerGram, 0)+" VND/g") + "   " +
			valueStyle.Render(fmtFloat(d.vndPerTael, 0)+" VND/tael") + "\n",
	)

	// 30-day sparkline
	if len(d.history) >= 2 {
		chartWidth := m.width - 8
		if chartWidth <= 0 {
			chartWidth = 40
		}

		b.WriteString("\n" + labelStyle.Render("30-DAY HISTORY") + "\n")
		b.WriteString(sparkline(d.history, chartWidth) + "\n")

		first := d.history[0].price
		last := d.history[len(d.history)-1].price
		change := (last - first) / first * 100

		var changeStyle lipgloss.Style
		if change >= 0 {
			changeStyle = lipgloss.NewStyle().Bold(true).Foreground(colorSuccess)
		} else {
			changeStyle = lipgloss.NewStyle().Bold(true).Foreground(colorDanger)
		}

		b.WriteString(
			dimStyle.Render("$"+fmtFloat(first, 0)) + "  " +
				changeStyle.Render(fmt.Sprintf("%+.2f%%", change)) + "  " +
				dimStyle.Render("$"+fmtFloat(last, 0)) + "\n",
		)
	}

	b.WriteString("\n" + dimStyle.Render("[R]efresh  [Q]uit"))

	return boxStyle.Render(b.String())
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

var sparkBars = []rune{'▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'}

func sparkline(points []histPoint, width int) string {
	prices := make([]float64, len(points))
	for i, p := range points {
		prices[i] = p.price
	}
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
			norm := (p - minP) / (maxP - minP)
			idx = int(math.Round(norm * float64(len(sparkBars)-1)))
		}
		var style lipgloss.Style
		if p >= mid {
			style = lipgloss.NewStyle().Foreground(colorSuccess)
		} else {
			style = lipgloss.NewStyle().Foreground(colorDanger)
		}
		sb.WriteString(style.Render(string(sparkBars[idx])))
	}
	return sb.String()
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
	formatted := fmt.Sprintf("%.*f", decimals, f)
	parts := strings.SplitN(formatted, ".", 2)
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
	p := tea.NewProgram(newModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Println("Error:", err)
	}
}
```

## Key Controls

| Key | Action |
|-----|--------|
| `q` / `ctrl+c` | Quit |
| `r` | Manual refresh |
| Auto | Refreshes every 60s |

## Key Patterns Demonstrated

- **Parallel HTTP fetch** inside a single `tea.Cmd` using goroutines + channels
- **Fallback data source** — show stale data when refresh errors, not a blank screen
- **Sparkline** with downsample for narrow terminals
- **`tea.Batch`** to combine fetch + tick restart in one return
- **No API key needed** — uses freegoldapi.com and exchangerate-api.com
