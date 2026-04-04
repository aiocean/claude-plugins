#!/bin/bash
# Compare two or more architecture patterns side by side
# Usage:
#   compare-patterns.sh "circuit-breaker" "bulkhead"
#   compare-patterns.sh "microservices" "modular-monolith" "service-based"

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

if [ $# -lt 2 ]; then
  echo "Usage: compare-patterns.sh <pattern1> <pattern2> [pattern3...]"
  echo "Example: compare-patterns.sh circuit-breaker bulkhead"
  exit 1
fi

find_pattern() {
  local query="$1"
  local found=""
  for f in "$PLUGIN_ROOT"/volume-*/"$query".md; do
    [ -f "$f" ] && found="$f" && break
  done
  if [ -z "$found" ]; then
    for f in "$PLUGIN_ROOT"/volume-*/*"$query"*.md; do
      [ -f "$f" ] && found="$f" && break
    done
  fi
  echo "$found"
}

extract_section() {
  local file="$1"
  local section="$2"
  awk -v sec="$section" '
    /^## / { if (found) exit; if (index($0, sec)) found=1; next }
    found { print }
  ' "$file"
}

echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃         ARCHITECTURE PATTERN COMPARISON           ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo ""

for pattern in "$@"; do
  file=$(find_pattern "$pattern")
  if [ -z "$file" ]; then
    echo "⚠ Pattern not found: $pattern"
    echo ""
    continue
  fi

  title=$(head -5 "$file" | grep '^# ' | head -1 | sed 's/^# //')
  volume=$(basename "$(dirname "$file")")

  echo "━━━ $title ━━━"
  echo "Volume: $volume"
  echo "File: $file"
  echo ""

  for section in "Core Concept" "When to Use" "When NOT" "Common Mistakes" "Key Insights"; do
    content=$(extract_section "$file" "$section")
    if [ -n "$content" ]; then
      echo "## $section"
      echo "$content" | head -20
      echo ""
    fi
  done

  echo "─────────────────────────────────────────────────"
  echo ""
done
