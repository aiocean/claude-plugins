#!/bin/bash
#
# Threat Models Listing Tool
#
# Usage:
#   list-models.sh                  # List all frameworks grouped by volume
#   list-models.sh --volume 1       # List frameworks from volume 1 only
#   list-models.sh --search "stride" # Search by name
#   list-models.sh --count          # Just show count per volume

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

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
      echo "  --volume, -v NUM    Filter by volume number (1-7)"
      echo "  --search, -s TEXT   Search frameworks by name (case insensitive)"
      echo "  --count, -c         Show count only"
      echo "  --help, -h          Show this help"
      echo ""
      echo "Volumes:"
      echo "  1 - Foundations (Shostack 4Q, DFD, Manifesto)"
      echo "  2 - Core Frameworks (STRIDE, DREAD, PASTA, OCTAVE, Trike, VAST)"
      echo "  3 - Attacker-centric (Attack Trees, PnG, Security Cards, hTMM)"
      echo "  4 - Attack Patterns (Kill Chain, UKC, ATT&CK, Diamond, CAPEC)"
      echo "  5 - Privacy (LINDDUN, GDPR/DPIA)"
      echo "  6 - AI/ML (OWASP LLM, ATLAS, NIST AI RMF, AI 100-2)"
      echo "  7 - Cloud & DevSecOps (Cloud TM, K8s, Continuous TM)"
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
  vol_num=$(echo "$vol_name" | grep -oE '[0-9]+' | head -1)

  if [[ -n "$VOLUME" && "$vol_num" != "$VOLUME" ]]; then
    continue
  fi

  case $vol_num in
    1) vol_title="Volume 1: Foundations" ;;
    2) vol_title="Volume 2: Core Frameworks" ;;
    3) vol_title="Volume 3: Attacker-centric" ;;
    4) vol_title="Volume 4: Attack Patterns" ;;
    5) vol_title="Volume 5: Privacy" ;;
    6) vol_title="Volume 6: AI/ML Threat Modeling" ;;
    7) vol_title="Volume 7: Cloud & DevSecOps" ;;
    *) vol_title="Volume $vol_num" ;;
  esac

  vol_count=0
  models=""

  for file in "$vol_dir"/*.md; do
    [[ -f "$file" ]] || continue

    filename=$(basename "$file" .md)
    title=$(head -20 "$file" | grep -m1 "^# " | sed 's/^# //')
    [[ -z "$title" ]] && title="$filename"

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
      echo "$vol_title: $vol_count frameworks"
    else
      echo "## $vol_title ($vol_count frameworks)"
      echo ""
      echo -e "$models"
    fi
  fi
done

echo ""
echo "---"
echo "Total: $total frameworks"

if [[ -n "$SEARCH" ]]; then
  echo "Search: \"$SEARCH\""
fi
