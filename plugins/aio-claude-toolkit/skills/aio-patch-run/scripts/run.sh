#!/usr/bin/env bash
# run.sh — thin wrapper exec'ing the scaffolded tools/run.sh.
set -euo pipefail

WALKUP="${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-setup/scripts/walk-up.sh"
PROJECT_ROOT="$(bash "$WALKUP")" || exit 1

cd "$PROJECT_ROOT"
exec ./tools/run.sh "$@"
