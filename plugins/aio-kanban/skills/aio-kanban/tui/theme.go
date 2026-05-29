package main

import (
	"image/color"
	"strings"

	"charm.land/lipgloss/v2"
)

// Palette — restrained, one accent for focus (mirrors the lazyexplorer house style).
var (
	colAccent = lipgloss.Color("#7D56F4") // focused lane, selected card
	colFg     = lipgloss.Color("#E6E6E6")
	colDim    = lipgloss.Color("#6C757D")
	colSelFg  = lipgloss.Color("#FFFFFF")
	colChrome = lipgloss.Color("#1E1E2E") // status-bar background

	colCritical = lipgloss.Color("#DC3545")
	colHigh     = lipgloss.Color("#FF8C00")
	colMedium   = lipgloss.Color("#FFC107")
	colLow      = lipgloss.Color("#3FB950")
)

// columnColor gives each lane a glanceable identity in its header.
var columnColor = [numColumns]color.Color{
	colDim,                    // Backlog
	lipgloss.Color("#56B6F4"), // Todo
	colAccent,                 // Doing
	colLow,                    // Done
	colCritical,               // Blocked
}

var (
	appTitleStyle = lipgloss.NewStyle().Bold(true).Foreground(colAccent)

	statusBarStyle = lipgloss.NewStyle().
			Background(colChrome).
			Foreground(lipgloss.Color("#ADB5BD")).
			Padding(0, 1)

	colHeaderStyle    = lipgloss.NewStyle().Bold(true)
	colHeaderSelStyle = lipgloss.NewStyle().Bold(true).Underline(true)

	cardSelStyle     = lipgloss.NewStyle().Background(colAccent).Foreground(colSelFg).Bold(true)
	cardSelBlurStyle = lipgloss.NewStyle().Background(lipgloss.Color("#3A3A4A")).Foreground(colFg)
	cardStyle        = lipgloss.NewStyle().Foreground(colFg)
	cardDimStyle     = lipgloss.NewStyle().Foreground(colDim)

	previewTitleStyle = lipgloss.NewStyle().Bold(true).Foreground(colAccent)
	promptStyle       = lipgloss.NewStyle().Foreground(colAccent).Bold(true)

	dividerStyle      = lipgloss.NewStyle().Foreground(colDim)
	dividerFocusStyle = lipgloss.NewStyle().Foreground(colAccent)

	// modalStyle is the floating input box: a rounded accent border over the board.
	modalStyle      = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(colAccent).Foreground(colFg).Padding(0, 1)
	modalTitleStyle = lipgloss.NewStyle().Foreground(colAccent).Bold(true)
)

// priorityColor maps a task priority to its dot color. Unknown → dim.
func priorityColor(p string) color.Color {
	switch strings.ToLower(p) {
	case "critical":
		return colCritical
	case "high":
		return colHigh
	case "medium":
		return colMedium
	case "low":
		return colLow
	default:
		return colDim
	}
}
