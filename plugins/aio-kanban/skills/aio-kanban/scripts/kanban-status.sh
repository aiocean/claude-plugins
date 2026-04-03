#!/bin/bash
# Kanban board status — auto-executed when skill loads
BOARD="BOARD.md"
[ ! -f "$BOARD" ] && echo "[kanban] not initialized — no BOARD.md found" && exit 0

echo "[kanban] BOARD.md"

# Count tasks per column
for col in "Backlog" "Todo" "Doing" "Done" "Blocked"; do
  count=$(awk "/^## .*${col}/,/^## /" "$BOARD" | grep -c "^### T-" 2>/dev/null)
  printf "  %-10s %d\n" "$col" "$count"
done

# Show current work
doing=$(awk '/^## .*Doing/,/^## /' "$BOARD" | grep "^### T-")
if [ -n "$doing" ]; then
  echo ""
  echo "  Current:"
  echo "$doing" | sed 's/^### /    /'
fi

# Warn blocked
blocked=$(awk '/^## .*Blocked/,/^## /' "$BOARD" | grep "^### T-")
if [ -n "$blocked" ]; then
  echo ""
  echo "  Blocked:"
  echo "$blocked" | sed 's/^### /    /'
fi

# WIP check
doing_count=$(awk '/^## .*Doing/,/^## /' "$BOARD" | grep -c "^### T-" 2>/dev/null)
if [ "$doing_count" -gt 2 ]; then
  echo ""
  echo "  !! WIP limit exceeded ($doing_count/2)"
fi
