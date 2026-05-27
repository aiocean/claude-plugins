#!/usr/bin/env bash
# extract.sh — materialize cli.js + native modules for THIS OS into dist/<arch>/.
#
# Gets the claude binary from, in order:
#   1. the path you pass as arg 1
#   2. claude-src/claude       (conventional local drop spot at project root)
#   3. npm download            (latest, or CLAUDE_VERSION) — so `./tools/extract.sh`
#      with no args and nothing dropped just works
# then carves cli.js (raw, wrapper intact) + native .node modules out of it.
#
# No patch, no build — that's ./tools/build.sh (patch + recompile) and
# ./tools/run.sh (exec).
#
# Usage:
#   ./tools/extract.sh                      # download latest claude → dist/<arch>/
#   CLAUDE_VERSION=2.1.150 ./tools/extract.sh
#   ./tools/extract.sh ~/path/to/claude     # extract a binary you already have
#
# Output in dist/<arch>/: cli.js, cli.meta.json, native/*.node, .version
#
# nounset (-u) OFF — macOS bash 3.2 chokes on empty-array expansion.
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PIPE="$SCRIPT_DIR/pipeline"

# Arch key (dist layout) + npm package. Honor explicit ARCH env override
# for cross-arch extraction (see aio-patch-* plugin multi-arch flow).
# Default: detect from host.
ARCH="${ARCH:-}"
if [[ -z "$ARCH" ]]; then
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64)              ARCH=darwin-arm64 ;;
    Darwin-x86_64)             ARCH=darwin-amd64 ;;
    Linux-aarch64|Linux-arm64) ARCH=linux-arm64 ;;
    Linux-x86_64)              ARCH=linux-amd64 ;;
    *) echo "[extract] ERROR: unsupported host $(uname -s)-$(uname -m); set ARCH=darwin-arm64|darwin-amd64|linux-arm64|linux-amd64" >&2; exit 1 ;;
  esac
fi
case "$ARCH" in
  darwin-arm64) NPM_PKG=@anthropic-ai/claude-code-darwin-arm64 ;;
  darwin-amd64) NPM_PKG=@anthropic-ai/claude-code-darwin-x64 ;;
  linux-arm64)  NPM_PKG=@anthropic-ai/claude-code-linux-arm64 ;;
  linux-amd64)  NPM_PKG=@anthropic-ai/claude-code-linux-x64 ;;
  *) echo "[extract] ERROR: unknown ARCH=$ARCH (expected darwin-arm64|darwin-amd64|linux-arm64|linux-amd64)" >&2; exit 1 ;;
esac
PLAT="$ARCH"

OUT="$PROJECT_ROOT/dist/$PLAT"
mkdir -p "$OUT/upstream" "$OUT/native"

# Resolve the binary.
BIN="${1:-}"
VERSION=""
if [[ -z "$BIN" && -f "$PROJECT_ROOT/claude-src/claude" ]]; then
  BIN="$PROJECT_ROOT/claude-src/claude"
fi
if [[ -z "$BIN" ]]; then
  VERSION="${CLAUDE_VERSION:-}"
  if [[ -z "$VERSION" ]]; then
    echo "[extract] resolving latest @anthropic-ai/claude-code from npm..." >&2
    VERSION="$(npm view @anthropic-ai/claude-code version 2>/dev/null)"
  fi
  [[ -n "$VERSION" ]] || { echo "[extract] ERROR: couldn't resolve a version; set CLAUDE_VERSION or pass a binary" >&2; exit 1; }
  echo "[extract] downloading $NPM_PKG@$VERSION" >&2
  url="$(npm view "$NPM_PKG@$VERSION" dist.tarball)"
  curl -sL "$url" -o "$OUT/upstream/pkg.tgz"
  tar xzf "$OUT/upstream/pkg.tgz" -C "$OUT/upstream"
  BIN="$OUT/upstream/package/claude"
fi
if [[ ! -f "$BIN" ]]; then
  echo "[extract] ERROR: no claude binary at $BIN" >&2
  exit 1
fi

echo "[extract] platform: $PLAT | binary: $BIN" >&2
python3 "$PIPE/extract_cli.py" "$BIN" "$OUT/cli.js" "$OUT/cli.meta.json"
python3 "$PIPE/extract_native_modules.py" --strict "$BIN" "$OUT/native"

# Record version if known (from download or meta), for build.sh/run.sh reference.
[[ -z "$VERSION" ]] && VERSION="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("claude_version",""))' "$OUT/cli.meta.json" 2>/dev/null || true)"
[[ -n "$VERSION" ]] && echo "$VERSION" > "$OUT/.version"

echo "[extract] READY: cli.js ($(wc -c < "$OUT/cli.js" | tr -d ' ') bytes) + native → $OUT" >&2
echo "[extract] next: edit tools/pipeline/patches.json, then ./tools/build.sh && ./tools/run.sh [args]" >&2
