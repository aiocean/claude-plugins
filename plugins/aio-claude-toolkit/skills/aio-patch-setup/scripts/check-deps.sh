#!/usr/bin/env bash
# check-deps.sh — verify required tools are installed; warn (don't fail) if missing.
#
# Required: bun (>=1.3), python3 (>=3.10), node (>=18, for cli-nav acorn scripts).
# Optional: npm (only needed if extract.sh has to download claude from npm).
#
# Exit 0 always — this is a soft check. Prints "MISSING:" lines to stderr for any tool not found.

set -uo pipefail   # NOTE: no -e, we want to keep checking after a missing tool

missing=0

check() {
  local name="$1"; local cmd="$2"; local hint="$3"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "MISSING: $name ($cmd) — install: $hint" >&2
    missing=$((missing + 1))
  else
    local ver
    ver="$("$cmd" --version 2>&1 | head -1)"
    echo "OK: $name — $ver"
  fi
}

check "bun"     "bun"     "curl -fsSL https://bun.sh/install | bash"
check "python3" "python3" "brew install python@3 (macOS) | apt install python3 (Debian)"
check "node"    "node"    "brew install node (macOS) | nvm install --lts (cross-platform)"
check "npm"     "npm"     "(comes with node)"

if [[ "$missing" -gt 0 ]]; then
  echo "" >&2
  echo "WARN: $missing required tool(s) missing. Install them before running aio-patch-extract/compile." >&2
  echo "Continuing — check-deps does not fail-fast." >&2
fi

exit 0
