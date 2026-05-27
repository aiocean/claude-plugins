#!/usr/bin/env bash
# Test check-deps.sh — must exit 0 even when tools missing, print MISSING/OK lines.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="$SCRIPT_DIR/../scripts/check-deps.sh"

# Run it — should exit 0 unconditionally
out="$(bash "$CHECK" 2>&1)" || { echo "FAIL: check-deps.sh exited non-zero"; exit 1; }

# Should print 4 lines (one per checked tool), each starting with OK: or MISSING:
lines="$(echo "$out" | grep -cE '^(OK|MISSING):')"
[[ "$lines" -eq 4 ]] || { echo "FAIL: expected 4 OK/MISSING lines, got $lines"; echo "$out"; exit 1; }

echo "PASS: check-deps.sh exits 0, prints 4 status lines"
echo "ALL TESTS PASSED"
