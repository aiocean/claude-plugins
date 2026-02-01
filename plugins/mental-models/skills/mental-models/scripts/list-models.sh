#!/bin/bash
#
# Mental Models Listing Tool
#
# Usage:
#   list-models.sh                  # List all models grouped by volume
#   list-models.sh --volume 1       # List models from volume 1 only
#   list-models.sh --search "first" # Search for models by name
#   list-models.sh --count          # Just show count per volume
#
# Examples:
#   ./list-models.sh --volume 3
#   ./list-models.sh --search "thinking"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
VOLUME=""
SEARCH=""
COUNT_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --volume|-v)
      VOLUME="$2"
      shift 2
      ;;
    --search|-s)
      SEARCH="$2"
      shift 2
      ;;
    --count|-c)
      COUNT_ONLY=true
      shift
      ;;
    --help|-h)
      echo "Usage: list-models.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --volume, -v NUM    Filter by volume number (1-4)"
      echo "  --search, -s TEXT   Search models by name (case insensitive)"
      echo "  --count, -c         Show count only"
      echo "  --help, -h          Show this help"
      echo ""
      echo "Volumes:"
      echo "  1 - General Thinking (First Principles, Inversion, etc.)"
      echo "  2 - Physics, Chemistry & Biology (Leverage, Catalysts, etc.)"
      echo "  3 - Systems & Mathematics (Feedback Loops, Compounding, etc.)"
      echo "  4 - Economics & Art (Incentives, Opportunity Cost, etc.)"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

total=0

for vol_dir in "$SKILL_DIR"/volume-*; do
  [[ -d "$vol_dir" ]] || continue

  vol_name=$(basename "$vol_dir")
  vol_num=$(echo "$vol_name" | grep -oE '[0-9]+')

  # Apply volume filter
  if [[ -n "$VOLUME" && "$vol_num" != "$VOLUME" ]]; then
    continue
  fi

  # Format volume name nicely
  case $vol_num in
    1) vol_title="Volume 1: General Thinking" ;;
    2) vol_title="Volume 2: Physics, Chemistry & Biology" ;;
    3) vol_title="Volume 3: Systems & Mathematics" ;;
    4) vol_title="Volume 4: Economics & Art" ;;
    *) vol_title="Volume $vol_num" ;;
  esac

  vol_count=0
  models=""

  for file in "$vol_dir"/*.md; do
    [[ -f "$file" ]] || continue

    filename=$(basename "$file" .md)
    # Extract title from first # heading
    title=$(head -20 "$file" | grep -m1 "^# " | sed 's/^# //')
    [[ -z "$title" ]] && title="$filename"

    # Apply search filter
    if [[ -n "$SEARCH" ]]; then
      if ! echo "$title $filename" | grep -qi "$SEARCH"; then
        continue
      fi
    fi

    models+="  - $title\n"
    ((vol_count++))
    ((total++))
  done

  if [[ $vol_count -gt 0 ]]; then
    echo ""
    if $COUNT_ONLY; then
      echo "$vol_title: $vol_count models"
    else
      echo "## $vol_title ($vol_count models)"
      echo ""
      echo -e "$models"
    fi
  fi
done

echo ""
echo "---"
echo "Total: $total models"

if [[ -n "$SEARCH" ]]; then
  echo "Search: \"$SEARCH\""
fi
