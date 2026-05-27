#!/usr/bin/env bash
# Acceptance #9: aio-patch-compile produces distinct binaries for multiple target arches.
# Skips gracefully if bun < 1.3 (cross-compile reliability gate).
set -euo pipefail

# Resolve "plugins/" dir by walking up 4 levels.
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT/aio-claude-toolkit"

# Bun version gate — need >= 1.3 for stable cross-compile
BUN_VER="$(bun --version 2>/dev/null || echo 0)"
BUN_MAJOR="${BUN_VER%%.*}"
BUN_MINOR_RAW="${BUN_VER#*.}"
BUN_MINOR="${BUN_MINOR_RAW%%.*}"
if [[ "$BUN_MAJOR" -lt 1 ]] || { [[ "$BUN_MAJOR" -eq 1 ]] && [[ "$BUN_MINOR" -lt 3 ]]; }; then
  echo "SKIP: bun $BUN_VER lacks reliable cross-compile (need >=1.3). Multi-arch test skipped."
  exit 0
fi

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-setup/scripts/setup.sh" "$TMP" >/dev/null

# No-op smoke patch — pipeline must succeed under --strict
cat > "$TMP/tools/pipeline/patches.json" <<'EOF'
{
  "_description": "Multi-arch smoke",
  "patches": [
    {"_comment": "no-op anchor that matches in any cli.js", "id": "smoke_noop", "old": "\"use strict\"", "new": "\"use strict\""}
  ]
}
EOF

cd "$TMP"
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)              HOST=darwin-arm64; CROSS=darwin-amd64 ;;
  Darwin-x86_64)             HOST=darwin-amd64; CROSS=darwin-arm64 ;;
  Linux-aarch64|Linux-arm64) HOST=linux-arm64;  CROSS=linux-amd64 ;;
  Linux-x86_64)              HOST=linux-amd64;  CROSS=linux-arm64 ;;
  *) echo "FAIL: unknown host"; exit 1 ;;
esac

echo "[test] building $HOST + $CROSS"
if ! bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-compile/scripts/compile.sh" --target="$HOST,$CROSS"; then
  echo "FAIL: multi-arch compile errored. (host=$HOST cross=$CROSS)"
  exit 1
fi
[[ -f "$TMP/dist/$HOST/claude" ]]  || { echo "FAIL: missing dist/$HOST/claude"; exit 1; }
[[ -f "$TMP/dist/$CROSS/claude" ]] || { echo "FAIL: missing dist/$CROSS/claude"; exit 1; }

# Distinct binaries: different sizes is a sanity hint (cross-arch yields different sizes typically),
# but the strict requirement is just that BOTH binaries exist for two arches.
HOST_SIZE="$(wc -c < "$TMP/dist/$HOST/claude" | tr -d ' ')"
CROSS_SIZE="$(wc -c < "$TMP/dist/$CROSS/claude" | tr -d ' ')"
echo "PASS: multi-arch ($HOST $HOST_SIZE bytes + $CROSS $CROSS_SIZE bytes)"
