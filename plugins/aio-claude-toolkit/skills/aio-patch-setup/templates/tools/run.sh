#!/usr/bin/env bash
# run.sh — exec the patched claude binary built by ./tools/build.sh, forwarding args.
#
# Usage:
#   ./tools/run.sh --version
#   ./tools/run.sh -p "hi"
#   ./tools/run.sh                  # interactive
#   ./tools/run.sh -- --version     # explicit arg separator
#
# Does NOT build. If you edited tools/pipeline/patches.json or cli.js, run
# ./tools/build.sh first (or chain: ./tools/build.sh && ./tools/run.sh [args]).
#
# nounset (-u) OFF — macOS bash 3.2 chokes on empty-array expansion.
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Args after an optional `--` (or all args) go to the binary.
RUN_ARGS=()
if [[ $# -gt 0 ]]; then
  [[ "$1" == "--" ]] && shift
  RUN_ARGS=("$@")
fi

# Host platform → arch key (matches dist layout written by ./tools/build.sh).
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)              PLAT=darwin-arm64 ;;
  Darwin-x86_64)             PLAT=darwin-amd64 ;;
  Linux-aarch64|Linux-arm64) PLAT=linux-arm64 ;;
  Linux-x86_64)              PLAT=linux-amd64 ;;
  *) echo "[run] ERROR: unsupported platform $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

BIN="$PROJECT_ROOT/dist/$PLAT/claude"
if [[ ! -x "$BIN" ]]; then
  echo "[run] ERROR: no binary at $BIN. Run ./tools/build.sh first." >&2
  exit 1
fi

# Singleton enforcement: kill prior instances of THIS exact binary path so the
# patched control-channel HTTP server (default :47291) can bind cleanly. We
# target by $BIN path via pgrep -f, NOT by port — killing whatever holds
# 47291 would be too aggressive (could nuke an unrelated user process).
# Opt out with DC_NO_SINGLETON=1 (useful when running parallel instances on
# distinct DC_PORT values).
if [[ "${DC_NO_SINGLETON:-0}" != "1" ]] && command -v pgrep >/dev/null 2>&1; then
  # Exclude our own PID and our parent shell so concurrent run.sh invocations
  # don't kill each other's wrappers before they exec.
  PRIOR=$(pgrep -f "$BIN" 2>/dev/null | grep -vE "^($$|$PPID)$" || true)
  if [[ -n "$PRIOR" ]]; then
    COUNT=$(echo "$PRIOR" | wc -l | tr -d ' ')
    echo "[run] singleton: SIGTERM $COUNT prior instance(s) (PIDs: ${PRIOR//$'\n'/ })" >&2
    echo "$PRIOR" | xargs kill -TERM 2>/dev/null || true
    # Wait up to ~1s for graceful shutdown (HTTP server close, port release).
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      sleep 0.1
      STILL=$(pgrep -f "$BIN" 2>/dev/null | grep -vE "^($$|$PPID)$" || true)
      [[ -z "$STILL" ]] && break
    done
    if [[ -n "$STILL" ]]; then
      echo "[run] singleton: SIGKILL stragglers (PIDs: ${STILL//$'\n'/ })" >&2
      echo "$STILL" | xargs kill -KILL 2>/dev/null || true
      sleep 0.1
    fi
  fi
fi

echo "[run] $BIN ${RUN_ARGS[*]:-}" >&2
exec "$BIN" ${RUN_ARGS[@]+"${RUN_ARGS[@]}"}
