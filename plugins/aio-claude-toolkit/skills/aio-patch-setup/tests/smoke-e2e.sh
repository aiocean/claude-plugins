#!/usr/bin/env bash
# smoke-e2e.sh — Acceptance criterion #5: setup → extract → edit patches → compile → run
# Returns Claude's version banner from a patched binary.
set -euo pipefail

# Resolve "plugins/" directory by walking up 4 levels:
#   tests/ → aio-patch-setup/ → skills/ → aio-claude-toolkit/ → plugins/
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT/aio-claude-toolkit"

echo "=== Step 1: Setup ==="
bash "$PLUGIN_ROOT/aio-claude-toolkit/skills/aio-patch-setup/scripts/setup.sh" "$TMP"
[[ -f "$TMP/tools/pipeline/patch_cli.py" ]] || { echo "FAIL: setup did not populate pipeline"; exit 1; }
[[ -f "$TMP/.aio-patch-setup" ]] || { echo "FAIL: setup did not write VERSION sentinel"; exit 1; }
echo "PASS: setup"

echo ""
echo "=== Step 2: Inject a no-op patch into patches.json ==="
cat > "$TMP/tools/pipeline/patches.json" <<'EOF'
{
  "_description": "Smoke test — single no-op patch",
  "patches": [
    {"_comment": "no-op: replace 'use strict' with itself", "id": "smoke_noop", "old": "\"use strict\"", "new": "\"use strict\""}
  ]
}
EOF

echo ""
echo "=== Step 3: Extract ==="
cd "$TMP"
bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-extract/scripts/extract.sh"
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)              ARCH=darwin-arm64 ;;
  Darwin-x86_64)             ARCH=darwin-amd64 ;;
  Linux-aarch64|Linux-arm64) ARCH=linux-arm64 ;;
  Linux-x86_64)              ARCH=linux-amd64 ;;
esac
[[ -f "$TMP/dist/$ARCH/cli.js" ]] || { echo "FAIL: extract did not produce cli.js"; exit 1; }
echo "PASS: extract ($ARCH)"

echo ""
echo "=== Step 4: Compile ==="
bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-compile/scripts/compile.sh" || {
  echo "FAIL: compile errored. Inspect $TMP/dist/$ARCH/"; exit 1;
}
[[ -f "$TMP/dist/$ARCH/claude" ]] || { echo "FAIL: compile did not produce binary"; exit 1; }
echo "PASS: compile (binary: $(wc -c < "$TMP/dist/$ARCH/claude" | tr -d ' ') bytes)"

echo ""
echo "=== Step 5: Run --version ==="
out="$(bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-run/scripts/run.sh" --version 2>&1)" || {
  echo "FAIL: run errored. Output:"; echo "$out"; exit 1;
}
echo "$out" | grep -qE '[0-9]+\.[0-9]+\.[0-9]+' || { echo "FAIL: --version output had no version: $out"; exit 1; }
echo "PASS: run (version output: $out)"

echo ""
echo "=== ALL E2E SMOKE TESTS PASSED ==="
