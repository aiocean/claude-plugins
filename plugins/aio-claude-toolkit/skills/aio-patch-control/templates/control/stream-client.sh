#!/usr/bin/env bash
# stream-client.sh — POST /v1/prompt with Accept: text/event-stream.
# Streams the raw SSE event sequence to stdout, line-buffered.
#
# Counterpart to simple-client.sh (blocking JSON). Use this when you want
# every event as it arrives — pipe through awk/jq/grep for filtering.
#
# Each turn ends with `event: turn.end`, after which the server closes the
# connection. For slash commands that don't hit Anthropic, the server emits
# `event: turn.end` with `source: "idle_fallback"` after `DC_SLASH_GRACE_MS`.
#
# Usage:
#   ./control/stream-client.sh "tell me a joke"
#   ./control/stream-client.sh "reply PONG"
#   ./control/stream-client.sh /clear
#   DC_PORT=47291 ./control/stream-client.sh ...
#   DC_TIMEOUT=300 ./control/stream-client.sh ...
#
# Pipe-friendly:
#   ./control/stream-client.sh "hi" | grep '^event:'                      # event names only
#   ./control/stream-client.sh "hi" | awk '/^data:/ {print substr($0,6)}' # data payloads
#   ./control/stream-client.sh "hi" | grep -A1 turn.end                   # final stop_reason

set -eo pipefail

PORT="${DC_PORT:-47291}"
TIMEOUT="${DC_TIMEOUT:-300}"
PROMPT="${1:-?}"

if [[ "$PROMPT" == "?" ]]; then
  echo "usage: $0 <prompt-text-or-/slash>" >&2
  echo "       env: DC_PORT (default 47291), DC_TIMEOUT (default 300)" >&2
  exit 1
fi

ESCAPED=$(printf '%s' "$PROMPT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

# -N: no curl buffering. -sS: silent but show errors. Accept header triggers SSE branch.
exec curl -sNS --max-time "$TIMEOUT" \
  -X POST "http://127.0.0.1:${PORT}/v1/prompt" \
  -H 'content-type: application/json' \
  -H 'Accept: text/event-stream' \
  -d "{\"prompt\": ${ESCAPED}}"
