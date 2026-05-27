#!/usr/bin/env bash
# Acceptance #6: aio-patch-control scaffold copies 8 sample files into project's control/.
set -euo pipefail
# Resolve "plugins/" dir by walking up 4 levels:
#   tests/ → aio-patch-control/ → skills/ → aio-claude-toolkit/ → plugins/
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT/aio-claude-toolkit"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-setup/scripts/setup.sh" "$TMP" >/dev/null
cd "$TMP"
bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-control/scripts/control.sh" scaffold

# Verify expected files exist
n="$(ls "$TMP/control/" | wc -l | tr -d ' ')"
[[ "$n" -ge 7 ]] || { echo "FAIL: expected >=7 files in control/, got $n"; exit 1; }
[[ -f "$TMP/control/client.ts" ]] || { echo "FAIL: client.ts missing"; exit 1; }
[[ -x "$TMP/control/simple-client.sh" ]] || { echo "FAIL: simple-client.sh not executable"; exit 1; }
echo "PASS: control scaffold ($n files)"
