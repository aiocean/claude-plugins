#!/bin/bash
# kanban-monitor.sh — emit one stdout line each time .kanban/board.md changes.
# Designed to be consumed by Claude Code's Monitor tool (each stdout line = one notification).
#
# Usage: bash kanban-monitor.sh
# Run via: Monitor tool with persistent=true (the watch lives as long as the session).

set -u

BOARD=".kanban/board.md"

if [ ! -f "$BOARD" ]; then
  echo "[kanban-monitor] FATAL: $BOARD not found. Run 'kanban init' first." >&2
  exit 2
fi

if ! command -v fswatch >/dev/null 2>&1; then
  cat >&2 <<'EOF'
[kanban-monitor] FATAL: `fswatch` is required but not installed.

Install:
  macOS:   brew install fswatch
  Debian:  apt-get install fswatch
  Arch:    pacman -S fswatch

Then re-run the kanban-monitor skill.
EOF
  exit 3
fi

# Emit a synthetic "start" event so the consumer does an initial parse without
# waiting for the first real change.
echo "start"

# -o = one line per batch of events (we don't care which file/op, just "changed").
# -l 0.2 = at most one batch every 200ms (debounce against editor save-storms).
exec fswatch -o -l 0.2 "$BOARD"
