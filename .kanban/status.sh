#!/bin/bash
# Kanban board status — auto-executed when skill loads (v3: index + per-task files)
BOARD=".kanban/board.md"
[ ! -f "$BOARD" ] && echo "[kanban] not initialized — no .kanban/board.md found. Run: kanban init" && exit 0

echo "[kanban] .kanban/board.md (index format)"

# Count tasks per column. v3 board lines look like:
#   - [T-NNN](tasks/T-NNN-slug.md) Title — priority/effort
for col in Backlog Todo Doing Done Blocked; do
  count=$(awk -v col="$col" '
    $0 ~ "^## " col "[[:space:]]*$" { found=1; next }
    found && /^## / { found=0 }
    found && /^- \[T-[0-9]+\]/ { count++ }
    END { print count+0 }
  ' "$BOARD")
  printf "  %-10s %d\n" "$col" "$count"
done

# Show current work (Doing column lines)
doing=$(awk '/^## Doing[[:space:]]*$/{ found=1; next } found && /^## /{ found=0 } found && /^- \[T-/' "$BOARD")
if [ -n "$doing" ]; then
  echo ""
  echo "  Current:"
  echo "$doing" | sed 's/^- /    /'
fi

# Warn blocked
blocked=$(awk '/^## Blocked[[:space:]]*$/{ found=1; next } found && /^## /{ found=0 } found && /^- \[T-/' "$BOARD")
if [ -n "$blocked" ]; then
  echo ""
  echo "  Blocked:"
  echo "$blocked" | sed 's/^- /    /'
fi

# WIP check
doing_count=$(awk '/^## Doing[[:space:]]*$/{ found=1; next } found && /^## /{ found=0 } found && /^- \[T-/{ c++ } END { print c+0 }' "$BOARD")
if [ "$doing_count" -gt 2 ]; then
  echo ""
  echo "  !! WIP limit exceeded ($doing_count/2)"
fi
