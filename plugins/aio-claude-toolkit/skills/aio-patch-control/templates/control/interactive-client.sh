#!/usr/bin/env bash
# interactive-client.sh — REPL TUI for the patched claude HTTP API.
# Wraps control/client.ts. For one-shot calls use simple-client.sh instead.
#
# Usage:
#   ./control/interactive-client.sh             # connect to 127.0.0.1:47291
#   DC_PORT=8080 ./control/interactive-client.sh
#
# REPL commands: :help :state :dialog :raw :wait :quit  (or Ctrl+D)

set -eo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun not found in PATH" >&2
  echo "  install: curl -fsSL https://bun.sh/install | bash" >&2
  exit 127
fi

exec bun "${HERE}/client.ts" "$@"
