#!/bin/bash
#
# UI/UX Knowledge Base Topic Listing Tool
#
# Usage:
#   list-topics.sh                       # List all topics grouped by category
#   list-topics.sh --category visual     # Filter by category
#   list-topics.sh --search "color"      # Search topics by name
#   list-topics.sh --count               # Show count per category
#
# Examples:
#   ./list-topics.sh --category accessibility
#   ./list-topics.sh --search "typography"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
REFS_DIR="$SKILL_DIR/references"

# Parse arguments
CATEGORY=""
SEARCH=""
COUNT_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --category|-cat)
      CATEGORY="$2"
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
      echo "Usage: list-topics.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --category, -cat NAME   Filter by category name (partial match)"
      echo "  --search, -s TEXT       Search topics by name (case insensitive)"
      echo "  --count, -c             Show count only"
      echo "  --help, -h              Show this help"
      echo ""
      echo "Categories:"
      echo "  01-visual-design         Visual design foundations & Gestalt principles"
      echo "  02-typography            Type systems, font pairing, vertical rhythm"
      echo "  03-color-science         Color theory, spaces, palettes, contrast"
      echo "  04-layout-spacing        Grid systems, spacing, responsive layout"
      echo "  05-accessibility         WCAG 2.2, ARIA, keyboard, screen readers"
      echo "  06-ux-psychology         Cognitive psychology, behavioral design"
      echo "  07-ux-laws              Fitts, Hick, Jakob, 30+ UX laws"
      echo "  08-interaction-design    Forms, navigation, states, micro-interactions"
      echo "  09-motion-animation      Animation principles, CSS transitions, scroll"
      echo "  10-component-patterns    Buttons, forms, modals, tables, complex widgets"
      echo "  11-design-systems        Tokens, atomic design, popular systems"
      echo "  12-ux-writing            Microcopy, content design, inclusive writing"
      echo "  13-performance-ux        Core Web Vitals, perceived performance"
      echo "  14-modern-css            Custom properties, container queries, :has()"
      echo "  15-responsive-design     Mobile-first, fluid design, touch targets"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

if [[ ! -d "$REFS_DIR" ]]; then
  echo "Error: references directory not found at $REFS_DIR"
  exit 1
fi

total=0

for cat_dir in "$REFS_DIR"/*/; do
  [[ -d "$cat_dir" ]] || continue

  cat_name=$(basename "$cat_dir")

  # Apply category filter
  if [[ -n "$CATEGORY" ]]; then
    if ! echo "$cat_name" | grep -qi "$CATEGORY"; then
      continue
    fi
  fi

  # Format category name nicely
  cat_title=$(echo "$cat_name" | sed 's/^[0-9]*-//' | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')

  cat_count=0
  topics=""

  for file in "$cat_dir"*.md; do
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

    topics+="  - $title\n"
    cat_count=$((cat_count + 1))
    total=$((total + 1))
  done

  if [[ $cat_count -gt 0 ]]; then
    echo ""
    if $COUNT_ONLY; then
      echo "$cat_title: $cat_count topics"
    else
      echo "## $cat_title ($cat_count topics)"
      echo ""
      echo -e "$topics"
    fi
  fi
done

echo ""
echo "---"
echo "Total: $total topics"

if [[ -n "$SEARCH" ]]; then
  echo "Search: \"$SEARCH\""
fi
if [[ -n "$CATEGORY" ]]; then
  echo "Category: \"$CATEGORY\""
fi
