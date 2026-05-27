#!/usr/bin/env bash
# anchor.sh — route into tools/cli-nav/*.cjs scripts.
set -euo pipefail

WALKUP="${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-setup/scripts/walk-up.sh"
PROJECT_ROOT="$(bash "$WALKUP")" || exit 1
cd "$PROJECT_ROOT"

CLI_NAV="$PROJECT_ROOT/tools/cli-nav"
if [[ ! -d "$CLI_NAV" ]]; then
  echo "ERROR: $CLI_NAV missing. Run /aio-claude-toolkit:aio-patch-setup (re-scaffold)." >&2
  exit 1
fi

# Auto-install acorn deps if missing (one-time)
if [[ ! -d "$CLI_NAV/node_modules" ]]; then
  echo "[anchor] cli-nav node_modules missing — installing acorn deps..."
  cd "$CLI_NAV"
  if command -v bun >/dev/null 2>&1; then
    bun install --silent
  elif command -v npm >/dev/null 2>&1; then
    npm install --silent
  else
    echo "ERROR: neither bun nor npm available to install acorn deps." >&2
    exit 1
  fi
  cd "$PROJECT_ROOT"
fi

# Sub-command routing.
SUB="${1:-find}"
shift || true
case "$SUB" in
  find)           exec node "$CLI_NAV/find-anchors.cjs" "$@" ;;
  navigate|nav)   exec node "$CLI_NAV/navigate.cjs" "$@" ;;
  explorer)       exec node "$CLI_NAV/build-explorer.cjs" "$@" ;;
  *)              cat >&2 <<EOF
Usage: /aio-claude-toolkit:aio-patch-anchor <subcommand> [args...]

Subcommands:
  find <pattern>           Find anchor candidates by string/AST proximity
  navigate --fn <name>     Walk AST around a function
  navigate --at <line>     Show AST context at a line
  explorer                 Build single-file HTML browser of cli.js
EOF
    exit 1
    ;;
esac
