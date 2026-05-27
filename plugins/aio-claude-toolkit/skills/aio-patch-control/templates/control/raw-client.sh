#!/usr/bin/env bash
# raw-client.sh — one-shot curl driver returning the FULL pretty-printed JSON
# from POST /v1/prompt. Includes httpResponses[] (raw Anthropic HTTP bodies),
# messages[], pending, meta — nothing filtered, nothing collapsed to text.
#
# Counterpart to simple-client.sh (which dumps unformatted JSON). Use this
# when you want to inspect the raw model traffic, debug streaming events,
# extract usage tokens, or pipe a stable JSON shape into jq downstream.
#
# Usage:
#   ./control/raw-client.sh "what is 2+2?"
#   ./control/raw-client.sh /status                  # slash command
#   DC_PORT=47291 ./control/raw-client.sh ...        # override port
#   DC_TIMEOUT=300 ./control/raw-client.sh ...       # override curl --max-time
#
# Pipe-friendly:
#   ./control/raw-client.sh "hi" | jq '.httpResponses[0].body'
#   ./control/raw-client.sh "hi" | jq '.httpResponses[].headers["anthropic-request-id"]'
#   ./control/raw-client.sh "hi" | jq '.messages[] | select(.role=="assistant")'

set -eo pipefail

PORT="${DC_PORT:-47291}"
TIMEOUT="${DC_TIMEOUT:-120}"
PROMPT="${1:-?}"

if [[ "$PROMPT" == "?" ]]; then
  echo "usage: $0 <prompt-text-or-/slash>" >&2
  echo "       env: DC_PORT (default 47291), DC_TIMEOUT (default 120)" >&2
  exit 1
fi

# JSON-escape prompt via python3 (handles quotes, backslashes, control chars).
# python3 is the single hard dep of this script — used for both escape and
# pretty-print. If you want jq output, pipe this script through `| jq .`.
ESCAPED=$(printf '%s' "$PROMPT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

curl -sS --max-time "$TIMEOUT" \
  -X POST "http://127.0.0.1:${PORT}/v1/prompt" \
  -H 'content-type: application/json' \
  -d "{\"prompt\": ${ESCAPED}}" \
  | python3 -m json.tool
