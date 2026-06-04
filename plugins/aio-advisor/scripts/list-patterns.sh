#!/bin/bash
# List all architecture patterns, optionally filtered by volume or keyword
# Usage:
#   list-patterns.sh                     # List all patterns grouped by volume
#   list-patterns.sh --volume 3          # Filter by volume number (1-10)
#   list-patterns.sh --search "circuit"  # Search by keyword in title
#   list-patterns.sh --count             # Quick count

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

VOLUME_NAMES=(
  ""
  "Foundations"
  "Architecture Styles"
  "Cloud Design Patterns"
  "Resilience & Reliability"
  "Data Architecture"
  "Domain-Driven Design"
  "API & Integration"
  "Distributed Systems"
  "Operations & Delivery"
  "Modern Paradigms"
)

FILTER_VOLUME=""
SEARCH_TERM=""
COUNT_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --volume|-v) FILTER_VOLUME="$2"; shift 2 ;;
    --search|-s) SEARCH_TERM="$2"; shift 2 ;;
    --count|-c) COUNT_ONLY=true; shift ;;
    *) SEARCH_TERM="$1"; shift ;;
  esac
done

total=0

for vol_dir in "$PLUGIN_ROOT"/volume-*/; do
  [ -d "$vol_dir" ] || continue

  dir_name=$(basename "$vol_dir")
  vol_num=$(echo "$dir_name" | grep -oE '[0-9]+' | head -1)
  vol_num_int=$((10#$vol_num))

  if [ -n "$FILTER_VOLUME" ] && [ "$vol_num_int" != "$FILTER_VOLUME" ]; then
    continue
  fi

  vol_label="${VOLUME_NAMES[$vol_num_int]:-$dir_name}"
  entries=()

  for f in "$vol_dir"*.md; do
    [ -f "$f" ] || continue
    title=$(head -5 "$f" | grep '^# ' | head -1 | sed 's/^# //')
    [ -z "$title" ] && title=$(basename "$f" .md)

    if [ -n "$SEARCH_TERM" ]; then
      if ! echo "$title" | grep -qi "$SEARCH_TERM"; then
        continue
      fi
    fi

    entries+=("$title")
  done

  count=${#entries[@]}
  total=$((total + count))

  if [ "$COUNT_ONLY" = false ] && [ $count -gt 0 ]; then
    echo ""
    echo "━━━ Volume $vol_num_int: $vol_label ($count) ━━━"
    for entry in "${entries[@]}"; do
      echo "  • $entry"
    done
  fi
done

echo ""
echo "Total: $total patterns"
