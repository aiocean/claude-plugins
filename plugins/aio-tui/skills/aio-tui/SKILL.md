---
name: aio-tui
description: Build interactive terminal UIs with Go Bubbletea and lipgloss — architecture, styling, and patterns. Triggers: "build a TUI", "create terminal UI", "Bubbletea app", "interactive dashboard", TUI, lipgloss.
---

## Environment
- go: !`go version 2>/dev/null || echo "NOT INSTALLED"`

```bash
REFS="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-tui/*/skills/aio-tui/references 2>/dev/null | sort -V | tail -1)"
```

# Bubbletea TUI Development Guide

Build interactive terminal UIs with [Bubbletea](https://github.com/charmbracelet/bubbletea) and [lipgloss](https://github.com/charmbracelet/lipgloss).

## Architecture: The Elm Architecture (TEA)

Every Bubbletea app has three parts:

```
Model (state) → View (render) → Update (handle messages) → Model ...
```

```go
type model struct {
    data      []Item
    loading   bool
    err       error
    width     int
    height    int
}

func (m model) Init() tea.Cmd    { return m.fetchData }       // initial command
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) { … } // state transitions
func (m model) View() string     { … }                        // render to string
```

**Key rules:**
- `Init()` returns a `tea.Cmd`, NOT a modified model — don't init clients here
- `Update()` returns a NEW model (value receiver), never mutates in place
- `View()` is a pure function of model state — no side effects
- Messages are the ONLY way to communicate async results back to the model

## Quick Start Template

```go
package main

import (
    "fmt"
    "time"

    tea "github.com/charmbracelet/bubbletea"
    "github.com/charmbracelet/lipgloss"
)

// --- Messages ---
type dataMsg struct {
    items []string
    err   error
}
type tickMsg time.Time

// --- Model ---
type model struct {
    items   []string
    loading bool
    err     error
    width   int
    height  int
}

func newModel() model {
    return model{loading: true}
}

func (m model) Init() tea.Cmd {
    return tea.Batch(fetchData, tickCmd())
}

func tickCmd() tea.Cmd {
    return tea.Tick(30*time.Second, func(t time.Time) tea.Msg { return tickMsg(t) })
}

// --- Fetch (runs in goroutine automatically) ---
func fetchData() tea.Msg {
    // Replace with real data fetching
    items := []string{"item-1", "item-2", "item-3"}
    return dataMsg{items: items}
}

// --- Update ---
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "q", "ctrl+c":
            return m, tea.Quit
        case "r":
            m.loading = true
            return m, fetchData
        }
    case tea.WindowSizeMsg:
        m.width, m.height = msg.Width, msg.Height
    case dataMsg:
        m.loading = false
        m.items = msg.items
        m.err = msg.err
    case tickMsg:
        m.loading = true
        return m, tea.Batch(fetchData, tickCmd())
    }
    return m, nil
}

// --- View ---
var (
    titleStyle = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#7D56F4"))
    dimStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("#6C757D"))
)

func (m model) View() string {
    if m.loading {
        return titleStyle.Render("Loading...")
    }
    if m.err != nil {
        return fmt.Sprintf("Error: %v\n\n[R]etry [Q]uit", m.err)
    }

    var s string
    s += titleStyle.Render("MY DASHBOARD") + "\n\n"
    for _, item := range m.items {
        s += "  • " + item + "\n"
    }
    s += "\n" + dimStyle.Render("[R]efresh [Q]uit")
    return s
}

// --- Main ---
func main() {
    p := tea.NewProgram(newModel(), tea.WithAltScreen())
    if _, err := p.Run(); err != nil {
        fmt.Println(err)
    }
}
```

## Color Scheme

```go
var (
    Primary   = lipgloss.Color("#7D56F4") // Purple — titles, primary values
    Secondary = lipgloss.Color("#6C757D") // Gray — headers, labels
    Success   = lipgloss.Color("#28A745") // Green — healthy, decreasing
    Warning   = lipgloss.Color("#FFC107") // Yellow — warnings
    Danger    = lipgloss.Color("#DC3545") // Red — errors, increasing
    Info      = lipgloss.Color("#17A2B8") // Blue — info highlights
    Dim       = lipgloss.Color("#6C757D") // Gray — muted text
    Muted     = lipgloss.Color("#ADB5BD") // Light gray — borders
)
```

## Critical Gotchas

### 1. Client Initialization — Do It in `main()`

Create heavy clients (AWS, MongoDB, K8s) in `main()`, pass into model.
`Init()` returns `tea.Cmd`, not a modified model — you can't store clients there.

```go
func main() {
    client := createClient() // create ONCE
    m := newModel(client)    // pass by reference
    tea.NewProgram(m, tea.WithAltScreen()).Run()
}
```

### 2. KeyMsg Handling — Type Assert Correctly

`handleKeyPress` must take `tea.KeyMsg`, not `tea.Msg`. Only `tea.KeyMsg` has `.String()`.

```go
// ✅ CORRECT
case tea.KeyMsg:
    switch msg.String() { // msg is already tea.KeyMsg
    case "q": return m, tea.Quit
    }

// ❌ WRONG — tea.Msg doesn't have .String()
func (m model) handleKeyPress(msg tea.Msg) {
    switch msg.String() { // COMPILE ERROR
```

### 3. fetchData Must Return `tea.Msg`, Not `tea.Cmd`

A function used as `tea.Cmd` has signature `func() tea.Msg`. Don't double-wrap:

```go
// ✅ CORRECT — fetchData IS a tea.Cmd (func() tea.Msg)
func fetchData() tea.Msg {
    result := doWork()
    return dataMsg{result: result}
}
return m, fetchData // pass the function itself

// ❌ WRONG — double-wrapping
func (m model) fetchData() tea.Cmd {
    return func() tea.Msg { ... } // method returns tea.Cmd, but Init/Update expect tea.Cmd
}
return m, m.fetchData() // calling it returns tea.Cmd, correct
return m, m.fetchData   // NOT calling it — wrong signature (func() tea.Cmd ≠ func() tea.Msg)
```

### 4. Integer Formatting — Go Has No `%,d`

```go
// ❌ WRONG — Go doesn't support comma formatting
fmt.Sprintf("%,d", n)

// ✅ CORRECT — manual formatting
func fmtInt(n int) string {
    s := strconv.Itoa(n)
    if len(s) <= 3 { return s }
    var groups []string
    for i := len(s); i > 0; i -= 3 {
        groups = append([]string{s[max(0, i-3):i]}, groups...)
    }
    return strings.Join(groups, ",")
}
```

### 5. Mouse Click Support — Y Offset Calculation Is Non-Obvious

Enable mouse with `tea.WithMouseCellMotion()` and handle `tea.MouseMsg`:

```go
// main():
p := tea.NewProgram(newModel(), tea.WithAltScreen(), tea.WithMouseCellMotion())

// Update():
case tea.MouseMsg:
    if msg.Action != tea.MouseActionPress || msg.Button != tea.MouseButtonLeft {
        break
    }
    // dispatch on msg.Y / msg.X
```

**Critical: Y coordinates must be calculated precisely.** The mental model:

| Element | Height | Rule |
|---------|--------|------|
| `lipgloss.RoundedBorder()` box | **3 lines** | top-border + content + bottom-border |
| `b.WriteString("\n\n")` gap | **1 empty line** | first `\n` ends current line, second `\n` creates 1 empty line |
| Single-line render | **1 line** | lipgloss.Render() does NOT add trailing newline |

**Example layout calculation** for a standard header → filter-tabs → table layout:
```
View() output:
  renderHeader()      → 3 lines  (rows 0-2)   ← lipgloss RoundedBorder
  "\n\n"              → 1 gap    (row 3 empty) ← \n ends row2, \n = row3 empty
  renderFilterRow()   → 1 line   (row 4)       ← filterRowY = 4
  "\n\n"              → 1 gap    (row 5 empty)
  table header        → 1 line   (row 6)
  table divider       → 1 line   (row 7)
  first skill row     → row 8                  ← firstSkillY = 8
```

**Common mistake:** assuming `\n\n` = 2 empty lines → off-by-2 errors. It's only 1 empty line.

**Debug tip:** During development, show last mouse coordinates in the status bar to verify:
```go
m.statusMsg = fmt.Sprintf("click: (%d, %d)", msg.X, msg.Y)
```

**X coordinate for column clicks:** Count character widths manually using fixed column widths:
```go
// cursor(2) + name(22) + space(1) + scope(10) + space(1) + source(20) + space(1) = 57
const statusColX = 57
if msg.X >= statusColX { /* clicked status column */ }
```

### 6. Variable Shadowing — Don't Name Vars After Packages

```go
// ❌ WRONG — shadows the `time` package
var time time.Time // can't use time.Format() after this

// ✅ CORRECT
var ts time.Time
```

## Layout Patterns That Always Look Good

These patterns compose well regardless of content — copy them as-is.

### Header Bar (full width, title left + status right)

```go
const maxWidth = 120

func renderHeader(termWidth int, loading bool, updatedAt time.Time) string {
    ew := termWidth
    if ew > maxWidth { ew = maxWidth }

    left := "● MY APP"
    right := "Updated " + updatedAt.Format("15:04:05") + "  |  Next in 59s"
    if loading { right = "↻ Fetching…" }

    gap := ew - lipgloss.Width(left) - lipgloss.Width(right) - 4
    if gap < 1 { gap = 1 }

    return lipgloss.NewStyle().
        Background(lipgloss.Color("#7D56F4")).
        Foreground(lipgloss.Color("#FFFFFF")).
        Bold(true).Padding(0, 2).
        Width(ew).
        Render(left + strings.Repeat(" ", gap) + right)
}
```

### Status Bar (footer, full width)

```go
func renderStatusBar(termWidth int, keys ...string) string {
    return lipgloss.NewStyle().
        Background(lipgloss.Color("#1E1E2E")).
        Foreground(lipgloss.Color("#ADB5BD")).
        Padding(0, 2).
        Width(termWidth).
        Render(strings.Join(keys, "  "))
}

// Usage:
renderStatusBar(m.width, "[R]efresh", "[/] Filter", "[↑/↓] Scroll", "[Q]uit")
```

### Navigation Tabs

```go
func renderTabs(tabs []string, active int) string {
    var rendered []string
    for i, name := range tabs {
        if i == active {
            rendered = append(rendered, lipgloss.NewStyle().
                Bold(true).
                Foreground(lipgloss.Color("#7D56F4")).
                Border(lipgloss.NormalBorder(), false, false, true, false).
                BorderForeground(lipgloss.Color("#7D56F4")).
                Padding(0, 2).
                Render(name))
        } else {
            rendered = append(rendered, lipgloss.NewStyle().
                Foreground(lipgloss.Color("#6C757D")).
                Padding(0, 2).
                Render(name))
        }
    }
    return lipgloss.JoinHorizontal(lipgloss.Top, rendered...)
}

// In Update:
case "tab", "right": m.activeTab = (m.activeTab + 1) % len(m.tabs)
case "shift+tab", "left": m.activeTab = (m.activeTab - 1 + len(m.tabs)) % len(m.tabs)
```

### Card Grid (responsive, N cards per row)

```go
// 3 cards per row, fills terminal width exactly.
// Each card: border(2) + padding(4) = 6 overhead.
cardInner := (ew / 3) - 6
if cardInner < 14 { cardInner = 14 }

mkCard := func(label, value string, primary bool) string {
    var val string
    if primary {
        val = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#7D56F4")).Render(value)
    } else {
        val = lipgloss.NewStyle().Bold(true).Render(value)
    }
    return lipgloss.NewStyle().
        Border(lipgloss.RoundedBorder()).
        BorderForeground(lipgloss.Color("#4A4A6A")).
        Padding(0, 2).Width(cardInner).
        Render(lipgloss.NewStyle().Foreground(lipgloss.Color("#6C757D")).Render(label) + "\n" + val)
}

row := lipgloss.JoinHorizontal(lipgloss.Top,
    mkCard("LABEL A", "Value 1", true),
    mkCard("LABEL B", "Value 2", false),
    mkCard("LABEL C", "Value 3", false),
)
```

### Section Header

```go
sectionStyle := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#7D56F4"))
dimStyle     := lipgloss.NewStyle().Foreground(lipgloss.Color("#ADB5BD"))
dividerStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#6C757D"))

// Plain section
"  " + sectionStyle.Render("MY SECTION")

// Section with subtitle
"  " + sectionStyle.Render("HISTORY  ") + dimStyle.Render("(newest first)")

// Section with divider
"  " + sectionStyle.Render("TABLE")
"  " + dividerStyle.Render(strings.Repeat("─", width))
```

### Max-Width Centering

```go
const maxWidth = 120

func (m model) View() string {
    ew := m.width
    if ew > maxWidth { ew = maxWidth }

    // ... build content using ew for all width math ...
    content := strings.Join(lines, "\n")

    if m.width > maxWidth {
        return lipgloss.PlaceHorizontal(m.width, lipgloss.Center, content)
    }
    return content
}
```

### Key-Value Rows

```go
func keyValue(label, value string, labelWidth int) string {
    return lipgloss.NewStyle().Width(labelWidth).Foreground(lipgloss.Color("#6C757D")).Render(label+":") +
        " " + lipgloss.NewStyle().Bold(true).Render(value)
}

// Usage:
keyValue("Status",   "healthy",     16)
keyValue("Uptime",   "14d 3h 22m",  16)
keyValue("Requests", "1,240,392",   16)
```

### Error Banner (non-fatal, keeps old data visible)

```go
// Show error inline without clearing the screen
if m.err != nil {
    banner := lipgloss.NewStyle().
        Background(lipgloss.Color("#3D1A1A")).
        Foreground(lipgloss.Color("#FF6B6B")).
        Padding(0, 2).Width(ew).
        Render("⚠  " + m.err.Error() + "  —  showing cached data")
    lines = append(lines, banner)
}
```

## Patterns Reference

For detailed patterns with full code examples, read `$REFS/patterns.md`:
- Column alignment with Unicode/emoji (lipgloss.Width vs fmt byte-counting)
- ANSI-aware colored columns
- Column layout with constant widths
- Parallel data fetching with semaphore
- Tab navigation
- Auto-refresh with configurable interval
- Filter/search mode
- Table abstraction
- Scroll/pagination
- Mouse hover support
- Delta/change tracking
- Severity classification

For a complete gold price monitor example (freegoldapi.com + exchangerate-api.com, no API key needed), read `$REFS/gold-monitor.md`.

## Project Setup

```bash
mkdir my-tui && cd my-tui
go mod init my-tui
go get github.com/charmbracelet/bubbletea@latest
go get github.com/charmbracelet/lipgloss@latest
# Add data source deps as needed:
# go get github.com/aws/aws-sdk-go-v2/...
# go get go.mongodb.org/mongo-driver/mongo@latest
```
