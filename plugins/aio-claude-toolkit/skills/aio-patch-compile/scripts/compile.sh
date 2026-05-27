#!/usr/bin/env bash
# compile.sh — multi-arch wrapper around tools/extract.sh + tools/build.sh.
#
# --target=current (default) | all | <csv>
# Transitively extracts if cli.js missing for a target arch.

set -euo pipefail

WALKUP="${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-setup/scripts/walk-up.sh"
PROJECT_ROOT="$(bash "$WALKUP")" || exit 1
cd "$PROJECT_ROOT"

# Parse args — only --target=X handled here; rest passed through to build.sh.
TARGETS=""
PASSTHRU=()
for arg in "$@"; do
  case "$arg" in
    --target=*) TARGETS="${arg#--target=}" ;;
    *)          PASSTHRU+=("$arg") ;;
  esac
done

# Default: current host arch.
if [[ -z "$TARGETS" ]]; then
  TARGETS=current
fi

# Expand keywords.
case "$TARGETS" in
  all)
    TARGETS="darwin-arm64,darwin-amd64,linux-arm64,linux-amd64"
    ;;
  current)
    case "$(uname -s)-$(uname -m)" in
      Darwin-arm64)              TARGETS=darwin-arm64 ;;
      Darwin-x86_64)             TARGETS=darwin-amd64 ;;
      Linux-aarch64|Linux-arm64) TARGETS=linux-arm64 ;;
      Linux-x86_64)              TARGETS=linux-amd64 ;;
      *) echo "[compile] ERROR: unknown host $(uname -s)-$(uname -m)" >&2; exit 1 ;;
    esac
    ;;
esac

echo "[compile] targets: $TARGETS"

# Validate each arch is one of the supported set.
for arch in $(echo "$TARGETS" | tr ',' ' '); do
  case "$arch" in
    darwin-arm64|darwin-amd64|linux-arm64|linux-amd64) : ;;
    *) echo "[compile] ERROR: unsupported arch '$arch' (expected darwin-arm64|darwin-amd64|linux-arm64|linux-amd64)" >&2; exit 1 ;;
  esac
done

# Loop per arch.
for arch in $(echo "$TARGETS" | tr ',' ' '); do
  echo ""
  echo "[compile] === $arch ==="
  if [[ ! -f "dist/$arch/cli.js" ]]; then
    echo "[compile] no cli.js for $arch yet — running extract first"
    ARCH="$arch" ./tools/extract.sh
  fi
  ARCH="$arch" ./tools/build.sh "${PASSTHRU[@]:-}"
done

echo ""
echo "[compile] DONE. Built binaries:"
for arch in $(echo "$TARGETS" | tr ',' ' '); do
  [[ -f "dist/$arch/claude" ]] && echo "  dist/$arch/claude ($(wc -c < "dist/$arch/claude" | tr -d ' ') bytes)"
done
