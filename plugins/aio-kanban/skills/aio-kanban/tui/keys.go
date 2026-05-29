package main

// Help text per mode — the single source of truth for the status-bar hints.
// Keys are matched inline in update*; this file only documents them.
const (
	listHelp    = "j/k select · shift+↑/↓ move status · tab preview · d delete · g/G top/bot · r reload · q quit"
	previewHelp = "j/k scroll · ctrl+d/u page · g/G top/bot · tab list · q quit"
	reasonHelp  = "type a reason · enter block · esc cancel"
	confirmHelp = "y/enter delete · n/esc cancel"
)
