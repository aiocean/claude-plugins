#!/usr/bin/env bash
# Acceptance #7: aio-patch-anchor find returns hits in extracted cli.js.
set -euo pipefail

# Resolve "plugins/" dir by walking up 4 levels:
#   tests/ → aio-patch-anchor/ → skills/ → aio-claude-toolkit/ → plugins/
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT/aio-claude-toolkit"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-setup/scripts/setup.sh" "$TMP" >/dev/null
cd "$TMP"

# Need an extracted cli.js — run extract first (downloads claude from npm)
bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-extract/scripts/extract.sh"

# Pre-warm cli-nav acorn deps so subsequent anchor.sh call doesn't mix
# install-progress lines into stdout we're capturing for JSON parsing.
(cd "$TMP/tools/cli-nav" && (command -v bun >/dev/null && bun install --silent || npm install --silent)) >/dev/null 2>&1

# find-anchors.cjs takes the cli.js path as positional arg (see its usage:
# "find-anchors.cjs <cli.js> [--min N] [--kind K] [--json]"). The anchor wrapper
# passes args through, so we pass the freshly-extracted cli.js explicitly.
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)              ARCH=darwin-arm64 ;;
  Darwin-x86_64)             ARCH=darwin-amd64 ;;
  Linux-aarch64|Linux-arm64) ARCH=linux-arm64 ;;
  Linux-x86_64)              ARCH=linux-amd64 ;;
esac

# Test: produce a JSON anchor index for the extracted cli.js.
out="$(bash "$CLAUDE_PLUGIN_ROOT/skills/aio-patch-anchor/scripts/anchor.sh" find "dist/$ARCH/cli.js" --json 2>&1)" || {
  echo "FAIL: anchor find exited non-zero"; echo "$out" | tail -20; exit 1;
}

# find-anchors.cjs --json WRITES to ./anchors.json (in CWD); stdout prints
# "wrote anchors.json (N)" summary. Verify both: summary line + parseable file.
echo "$out" | grep -qE 'wrote anchors\.json \([0-9]+\)' || {
  echo "FAIL: expected 'wrote anchors.json (N)' summary; got:"; echo "$out" | tail -10; exit 1;
}
# find-anchors.cjs writes anchors.json to path.dirname(INPUT) = dist/$ARCH/.
ANCHORS_JSON="$TMP/dist/$ARCH/anchors.json"
[[ -f "$ANCHORS_JSON" ]] || { echo "FAIL: $ANCHORS_JSON not created"; exit 1; }

python3 - "$ANCHORS_JSON" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
# Structure: {"version": ..., "count": N, "anchors": [...]}
assert isinstance(data, dict), "expected JSON object, got " + type(data).__name__
anchors = data.get("anchors")
assert isinstance(anchors, list) and len(anchors) > 0, "anchors list empty or missing"
assert data.get("count") == len(anchors), "count field disagrees with anchors length"
sample_kind = anchors[0].get("kind_hint", "(unknown)")
print("PASS: anchor find produced " + str(data["count"]) + " anchor candidates (sample kind_hint: " + sample_kind + ")")
PYEOF
