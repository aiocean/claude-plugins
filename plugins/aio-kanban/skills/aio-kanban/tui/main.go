package main

import (
	"fmt"
	"os"
	"strings"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"
)

// buildVersion is stamped at release time via -ldflags "-X main.buildVersion=…".
var buildVersion = "dev"

// detectRenderStyle resolves the glamour palette ONCE at startup, while we still
// own the terminal — before tea.NewProgram takes it over. The hint ("dark"/
// "light"/"notty") is handed to the model and reused by every preview render.
func detectRenderStyle() string {
	switch colorprofile.Detect(os.Stdout, os.Environ()) {
	case colorprofile.NoTTY, colorprofile.Ascii:
		return "notty"
	}
	if lipgloss.HasDarkBackground(os.Stdin, os.Stdout) {
		return "dark"
	}
	return "light"
}

func printHelp() {
	fmt.Println("aiokan — terminal kanban for the aio-kanban markdown board")
	fmt.Println()
	fmt.Println("Usage: aiokan [DIR]")
	fmt.Println("  DIR          directory to search for .kanban/board.md (default: current dir,")
	fmt.Println("               walking up to a parent — same as how git finds .git)")
	fmt.Println("  --version    print version and exit")
	fmt.Println("  --help       print this help and exit")
	fmt.Println()
	fmt.Println("Two panes: left = tasks grouped by status, right = markdown preview of the selection.")
	fmt.Println("Keys: j/k select · shift+up/down move status · tab focus preview · d delete · r reload · q quit")
	fmt.Println("Mouse: click a task to select · wheel to scroll the focused pane")
}

func main() {
	start := "."
	for _, a := range os.Args[1:] {
		switch {
		case a == "--version" || a == "-v" || a == "version":
			fmt.Println("aiokan", buildVersion)
			return
		case a == "--help" || a == "-h" || a == "help":
			printHelp()
			return
		case strings.HasPrefix(a, "-"):
			fmt.Fprintln(os.Stderr, "aiokan: unknown flag:", a)
			os.Exit(2)
		default:
			start = a
		}
	}

	dir, err := findKanban(start)
	if err != nil {
		fmt.Fprintln(os.Stderr, "aiokan:", err)
		fmt.Fprintln(os.Stderr, "  initialize a board first via the aio-kanban skill, or create .kanban/board.md")
		os.Exit(1)
	}
	board, err := loadBoard(dir)
	if err != nil {
		fmt.Fprintln(os.Stderr, "aiokan:", err)
		os.Exit(1)
	}

	m := newModel(board)
	m.renderStyle = detectRenderStyle()

	if _, err := tea.NewProgram(m).Run(); err != nil {
		fmt.Fprintln(os.Stderr, "aiokan:", err)
		os.Exit(1)
	}
}
