package main

// Help text per mode — the single source of truth for the status-bar hints.
// Keys are matched inline in update*; this file only documents them.
const (
	listHelp    = "j/k select · shift+↑/↓ move status · tab preview · a add · g/G top/bot · r reload · q quit"
	previewHelp = "j/k scroll · ctrl+d/u page · g/G top/bot · tab list · q quit"
	addHelp     = "type a title · enter create · esc cancel"
	reasonHelp  = "type a reason · enter block · esc cancel"
)
