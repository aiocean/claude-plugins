#!/usr/bin/env bash
# extract.sh — thin wrapper that walks up to project root and execs ./tools/extract.sh.
set -euo pipefail

WALKUP="${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-setup/scripts/walk-up.sh"
PROJECT_ROOT="$(bash "$WALKUP")" || exit 1

cd "$PROJECT_ROOT"
exec ./tools/extract.sh "$@"
