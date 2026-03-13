# Bubbletea Patterns Reference

Detailed code patterns extracted from production TUI tools (`tools/sqs-tui/`, `.claude/skills/dagster/tui/`).

## Column Alignment with Unicode/Emoji

**NEVER** use `fmt.Sprintf("%-*s")` for columns containing emoji or Unicode.
Go's `%s` counts **bytes**, not visual width. Emoji `🔴` = 4 bytes but 2 visual columns → alignment breaks.

```go
// ❌ WRONG — byte-counting breaks alignment
row := fmt.Sprintf("%-40s %-9s %9s", "🔴 "+queueName, severity, count)

// ✅ CORRECT — lipgloss.Width() uses go-runewidth for visual width
icon := q.Sev.Icon() + " " // fixed 3 visual chars
nameCol := lipgloss.NewStyle().Width(nameW).Render(queueName)
sevCol := lipgloss.NewStyle().Width(9).Render(severity)
numCol := lipgloss.NewStyle().Width(9).Align(lipgloss.Right).Render(count)
line := icon + nameCol + " " + sevCol + " " + numCol
```

## ANSI-Aware Column Alignment (Colored Numbers)

When a column has per-cell colors (e.g., red for positive delta, green for negative),
pad to fixed width **inside** the style call — `lipgloss.Width()` ignores ANSI escapes:

```go
// ❌ WRONG — ANSI codes make string length != visual width
deltaStr = redStyle.Render("+" + fmtInt(d)) // variable visual width

// ✅ CORRECT — lipgloss pads based on visible chars, then wraps with ANSI
deltaCol = redStyle.Width(colDelta).Align(lipgloss.Right).Render("+" + fmtInt(d))
```

## Column Layout Pattern

Define column widths as constants. Use lipgloss for both header and data rows to guarantee alignment.

From `tools/sqs-tui/main.go`:

```go
const (
    colIcon  = 3   // emoji(2) + space(1)
    colSev   = 9
    colVis   = 9
    colTot   = 9
    colDelta = 8
    colGaps  = 7   // spaces between columns
)
nameW := max(20, termWidth - colIcon - colSev - colVis - colTot - colDelta - colGaps)

lCol := func(s string, w int) string {
    return lipgloss.NewStyle().Width(w).Render(s)
}
rCol := func(s string, w int) string {
    return lipgloss.NewStyle().Width(w).Align(lipgloss.Right).Render(s)
}

// Header and data rows use identical lCol/rCol → guaranteed alignment
hdr := "   " + lCol("NAME", nameW) + " " + rCol("TOTAL", colTot) + " " + rCol("DELTA", colDelta)
row := icon + lCol(name, nameW) + " " + style.Width(colTot).Align(lipgloss.Right).Render(total) + " " + deltaCol
```

## Table Abstraction

From `.claude/skills/dagster/tui/internal/ui/table.go` — reusable table with typed columns:

```go
type Column struct {
    Width int
    Align lipgloss.Position
}

type Table struct {
    columns []Column
}

func NewTable(columns []Column) *Table {
    return &Table{columns: columns}
}

func (t *Table) Row(cells ...string) string {
    var rendered []string
    for i, cell := range cells {
        if i >= len(t.columns) { break }
        col := t.columns[i]
        style := lipgloss.NewStyle().Width(col.Width)
        if col.Align == lipgloss.Right {
            style = style.Align(lipgloss.Right)
        }
        rendered = append(rendered, style.Render(cell))
    }
    return lipgloss.JoinHorizontal(lipgloss.Top, rendered...)
}

func (t *Table) Header(cells ...string) string {
    var rendered []string
    for i, cell := range cells {
        if i >= len(t.columns) { break }
        col := t.columns[i]
        style := lipgloss.NewStyle().Width(col.Width).Foreground(lipgloss.Color("#6C757D"))
        if col.Align == lipgloss.Right {
            style = style.Align(lipgloss.Right)
        }
        rendered = append(rendered, style.Render(cell))
    }
    return lipgloss.JoinHorizontal(lipgloss.Top, rendered...)
}
```

Usage:

```go
table := NewTable([]Column{
    {Width: 3},          // icon
    {Width: 36},         // name
    {Width: 12},         // value
    {Width: 12, Align: lipgloss.Right}, // number
})

lines = append(lines, table.Header("", "NAME", "STATUS", "COUNT"))
lines = append(lines, table.Row(icon, name, status, count))
```

## Parallel Data Fetching (Semaphore Pattern)

For TUIs that query many resources (AWS queues, K8s pods, MongoDB collections),
use bounded goroutines to avoid rate limits.

From `tools/sqs-tui/main.go`:

```go
func (m model) fetchQueues() tea.Cmd {
    client := m.client // capture before closure
    return func() tea.Msg {
        start := time.Now()
        ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
        defer cancel()

        // List all URLs (paginated)
        var urls []string
        paginator := sqs.NewListQueuesPaginator(client, &sqs.ListQueuesInput{})
        for paginator.HasMorePages() {
            page, err := paginator.NextPage(ctx)
            if err != nil {
                return fetchDoneMsg{err: err, dur: time.Since(start)}
            }
            urls = append(urls, page.QueueUrls...)
        }

        // Fetch concurrently with bounded semaphore
        results := make([]queueInfo, len(urls))
        var wg sync.WaitGroup
        sem := make(chan struct{}, 20) // max 20 concurrent

        for i, u := range urls {
            wg.Add(1)
            go func(idx int, qURL string) {
                defer wg.Done()
                sem <- struct{}{}        // acquire
                defer func() { <-sem }() // release
                results[idx] = fetch(ctx, client, qURL)
            }(i, u)
        }
        wg.Wait()
        return fetchDoneMsg{queues: results, dur: time.Since(start)}
    }
}
```

## Auto-Refresh with Configurable Interval

```go
type tickMsg time.Time

func tickCmd(interval time.Duration) tea.Cmd {
    return tea.Tick(interval, func(t time.Time) tea.Msg { return tickMsg(t) })
}

func (m model) Init() tea.Cmd {
    return tea.Batch(m.fetchData(), tickCmd(m.interval))
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tickMsg:
        if m.autoRefresh && !m.loading {
            m.loading = true
            return m, tea.Batch(m.fetchData(), tickCmd(m.interval))
        }
        return m, tickCmd(m.interval) // keep ticking even when loading
    // ...
    case tea.KeyMsg:
        switch msg.String() {
        case "p":
            m.autoRefresh = !m.autoRefresh
            if m.autoRefresh {
                return m, tickCmd(m.interval)
            }
        case "+", "=":
            if m.interval < 60*time.Second { m.interval += time.Second }
        case "-", "_":
            if m.interval > time.Second { m.interval -= time.Second }
        }
    }
    return m, nil
}
```

## Tab Navigation

```go
type model struct {
    tabs      []string
    activeTab int
    // per-tab models...
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "tab", "right":
            m.activeTab = (m.activeTab + 1) % len(m.tabs)
        case "shift+tab", "left":
            m.activeTab = (m.activeTab - 1 + len(m.tabs)) % len(m.tabs)
        }
    }
    return m, nil
}

func (m model) renderTabs() string {
    var tabs []string
    for i, name := range m.tabs {
        style := lipgloss.NewStyle().Padding(0, 2)
        if i == m.activeTab {
            style = style.Bold(true).Foreground(lipgloss.Color("#7D56F4")).
                Border(lipgloss.NormalBorder(), false, false, true, false).
                BorderForeground(lipgloss.Color("#7D56F4"))
        } else {
            style = style.Foreground(lipgloss.Color("#6C757D"))
        }
        tabs = append(tabs, style.Render(name))
    }
    return lipgloss.JoinHorizontal(lipgloss.Top, tabs...)
}
```

## Filter/Search Mode

From `tools/sqs-tui/main.go`:

```go
type model struct {
    filter    string
    filtering bool // true = typing in filter box
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        if m.filtering {
            return m.updateFilter(msg)
        }
        switch msg.String() {
        case "/":
            m.filtering = true
            m.filter = ""
        case "esc":
            m.filter = ""
            m.applyFilterSort()
        }
    }
    return m, nil
}

func (m model) updateFilter(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
    switch msg.String() {
    case "enter":
        m.filtering = false
        m.applyFilterSort()
    case "esc":
        m.filtering = false
        m.filter = ""
        m.applyFilterSort()
    case "backspace":
        if len(m.filter) > 0 {
            m.filter = m.filter[:len(m.filter)-1]
            m.applyFilterSort()
        }
    default:
        if len(msg.String()) == 1 {
            m.filter += msg.String()
            m.applyFilterSort()
        }
    }
    return m, nil
}

func (m *model) applyFilterSort() {
    var out []Item
    for _, item := range m.items {
        if m.filter != "" && !strings.Contains(
            strings.ToLower(item.Name),
            strings.ToLower(m.filter),
        ) {
            continue
        }
        out = append(out, item)
    }
    // Sort...
    m.filtered = out
}

// In View():
if m.filtering {
    filterBar = filterStyle.Render(fmt.Sprintf(" / %s█", m.filter))
} else if m.filter != "" {
    filterBar = dimStyle.Render(fmt.Sprintf(" filter: %s  (Esc clear)", m.filter))
}
```

## Scroll / Pagination

```go
func (m model) visibleRows() int {
    return max(1, m.height - 7) // header + footer chrome
}

// In Update:
case "up", "k":
    if m.offset > 0 { m.offset-- }
case "down", "j":
    maxOffset := max(0, len(m.filtered) - m.visibleRows())
    if m.offset < maxOffset { m.offset++ }

// In View:
rows := m.visibleRows()
end := min(m.offset+rows, len(m.filtered))
for i := m.offset; i < end; i++ {
    // render m.filtered[i]
}
```

## Mouse Hover

From `tools/sqs-tui/main.go`:

```go
type model struct {
    hoverRow int // -1 = no hover
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    case tea.MouseMsg:
        if msg.Action == tea.MouseActionMotion || msg.Action == tea.MouseActionPress {
            tableStartY := 4 // rows of chrome above table
            row := msg.Y - tableStartY + m.offset
            if row >= 0 && row < len(m.filtered) {
                m.hoverRow = row
            } else {
                m.hoverRow = -1
            }
        }
}

// In View — apply hover background per column:
hoverBg := lipgloss.Color("#2A2A3A")
if isHover {
    sty = sty.Background(hoverBg)
}

// Enable in main():
tea.NewProgram(m, tea.WithAltScreen(), tea.WithMouseAllMotion())
```

## Delta / Change Tracking

Track snapshots over time to show deltas:

```go
type snapshot struct {
    ts     time.Time
    totals map[string]int
}

type model struct {
    snapshots []snapshot
}

// On each fetch:
now := time.Now()
cur := make(map[string]int, len(items))
for _, item := range items {
    cur[item.Name] = item.Total
}
m.snapshots = append(m.snapshots, snapshot{ts: now, totals: cur})

// Find baseline snapshot closest to deltaInterval ago
target := now.Add(-deltaInterval)
var base map[string]int
for _, s := range m.snapshots {
    if !s.ts.After(target) {
        base = s.totals
    }
}

// Compute deltas
if base != nil {
    for i := range items {
        if prev, ok := base[items[i].Name]; ok {
            d := items[i].Total - prev
            items[i].Delta = &d
        }
    }
}

// Prune old snapshots
cutoff := now.Add(-2 * deltaInterval)
pruned := m.snapshots[:0]
for _, s := range m.snapshots {
    if !s.ts.Before(cutoff) {
        pruned = append(pruned, s)
    }
}
m.snapshots = pruned
```

## Integer Formatting (with commas)

Go has no `%,d`. Manual implementation:

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
        start := max(0, i-3)
        groups = append([]string{s[start:i]}, groups...)
    }
    return strings.Join(groups, ",")
}
```

## Severity Classification

Pattern for color-coding items by severity:

```go
type severity int

const (
    sevOK severity = iota
    sevInfo
    sevWarn
    sevCrit
)

func (s severity) Icon() string {
    return [...]string{"  ", "🔵", "🟡", "🔴"}[s]
}

func sevStyle(s severity) lipgloss.Style {
    switch s {
    case sevCrit:
        return lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#DC3545"))
    case sevWarn:
        return lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#FFC107"))
    default:
        return lipgloss.NewStyle().Foreground(lipgloss.Color("#ADB5BD"))
    }
}

// Classify based on thresholds
func classify(total int) severity {
    switch {
    case total >= 10000: return sevCrit
    case total >= 1000:  return sevWarn
    default:             return sevOK
    }
}
```
