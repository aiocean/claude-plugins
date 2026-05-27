#!/usr/bin/env bash
# build.sh — patch + recompile a claude binary for THIS OS.
#
# Reads the cli.js that ./tools/extract.sh cached; it does NOT download. Loop:
#   1. ./tools/extract.sh    (once, or again for a newer Claude)
#   2. edit tools/pipeline/patches.json   (your control-channel patches)
#   3. ./tools/build.sh      (re-patch + recompile, ~1.2s)
#   4. ./tools/run.sh [args] (exec the built binary) — repeat 2-4
#
# Output: dist/<arch>/claude (ready to ship; no Node/node_modules on target).
# Native .node addons + helper tools are staged alongside the binary to match
# the deployed tarball layout (features needing them resolve at runtime).
#
# nounset (-u) OFF — macOS bash 3.2 chokes on empty-array expansion.
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PIPE="$SCRIPT_DIR/pipeline"
WORK_ROOT="$PROJECT_ROOT/dist"

# Arch key (matches dist layout) + bun --target triple. Honor explicit
# ARCH env override (for cross-arch builds via aio-patch-compile --target=...).
ARCH="${ARCH:-}"
if [[ -z "$ARCH" ]]; then
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64)              ARCH=darwin-arm64 ;;
    Darwin-x86_64)             ARCH=darwin-amd64 ;;
    Linux-aarch64|Linux-arm64) ARCH=linux-arm64 ;;
    Linux-x86_64)              ARCH=linux-amd64 ;;
    *) echo "[build] ERROR: unsupported host $(uname -s)-$(uname -m); set ARCH=darwin-arm64|darwin-amd64|linux-arm64|linux-amd64" >&2; exit 1 ;;
  esac
fi
case "$ARCH" in
  darwin-arm64) BUN_TARGET=bun-darwin-arm64 ;;
  darwin-amd64) BUN_TARGET=bun-darwin-x64 ;;
  linux-arm64)  BUN_TARGET=bun-linux-arm64 ;;
  linux-amd64)  BUN_TARGET=bun-linux-x64 ;;
  *) echo "[build] ERROR: unknown ARCH=$ARCH (expected darwin-arm64|darwin-amd64|linux-arm64|linux-amd64)" >&2; exit 1 ;;
esac
PLAT="$ARCH"

WORK="$WORK_ROOT/$PLAT"
RAW_CLI="$WORK/cli.js"
if [[ ! -f "$RAW_CLI" ]]; then
  echo "[build] ERROR: no extracted cli.js for $PLAT. Run ./tools/extract.sh first." >&2
  exit 1
fi

# 1a. Inline any sources/<basename>.js referenced by patches.json (idempotent).
#     Big patch bodies live as readable .js files; inline_sources.py syncs them
#     into the "new" field that patch_cli.py reads.
echo "[build] inlining sources/" >&2
python3 "$PIPE/inline_sources.py"

# 1b. Apply patches.json (your control-channel patches) → strip wrapper + rewrite native requires.
echo "[build] patching (patches.json)" >&2
python3 "$PIPE/patch_cli.py" --strict "$RAW_CLI" "$PIPE/patches.json" "$WORK/cli-body.js"

# 2. bun build --compile for THIS host only (~1.2s).
echo "[build] bun build --compile --target=$BUN_TARGET" >&2
cd "$WORK"
bun build cli-body.js --compile --target="$BUN_TARGET" \
  --external '/$bunfs/*' --external '*.node' --outfile claude 2>&1 | tail -2
[[ -f "$WORK/claude" ]] || { echo "[build] ERROR: bun build produced no binary" >&2; exit 1; }

# 3. Stage native .node siblings + helper tools next to the binary so runtime
#    requires resolve, exactly like the deployed tarball layout.
cp "$WORK/native/"*.node "$WORK/" 2>/dev/null || true
if [[ -d "$PIPE/helpers/$PLAT" ]]; then
  cp "$PIPE/helpers/$PLAT/"* "$WORK/" 2>/dev/null || true
  chmod +x "$WORK/"* 2>/dev/null || true
fi

echo "[build] READY: $WORK/claude" >&2
echo "[build] next: ./tools/run.sh [args]" >&2
