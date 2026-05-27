#!/usr/bin/env bash
# Acceptance #8: walk-up sentinel works from a deep subdirectory of a scaffolded project.
set -euo pipefail

# Resolve "plugins/" dir by walking up 4 levels.
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT/aio-claude-toolkit"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-setup/scripts/setup.sh" "$TMP" >/dev/null

# Create deep subdir tree under the scaffolded project
mkdir -p "$TMP/a/b/c/d/e"
cd "$TMP/a/b/c/d/e"

# walk-up.sh from 5 levels deep must find the project root (each non-setup
# wrapper relies on this same call, so this validates the contract for them all).
found="$(bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-setup/scripts/walk-up.sh")" || {
  echo "FAIL: walk-up returned non-zero from 5-level subdir"; exit 1;
}
# macOS mktemp -d may produce paths under /var/folders that are symlinks of /private/var.
# Resolve both sides via realpath to compare canonical paths.
if [[ "$(cd "$found" && pwd -P)" != "$(cd "$TMP" && pwd -P)" ]]; then
  echo "FAIL: walk-up found '$found', expected '$TMP'"
  exit 1
fi
echo "PASS: walk-up succeeds from 5-level subdir (resolves to project root)"
