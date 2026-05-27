#!/usr/bin/env bash
# simple-client.sh — one-shot curl driver for the patched claude HTTP API.
# For pipelines/scripts. Pair with interactive-client.sh when you want a REPL.
#
# Usage:
#   ./control/simple-client.sh "what is 2+2?"
#   ./control/simple-client.sh /status            # slash command
#   DC_PORT=47291 ./control/simple-client.sh ...  # override port

set -eo pipefail

PORT="${DC_PORT:-47291}"
PROMPT="${1:-?}"

if [[ "$PROMPT" == "?" ]]; then
  echo "usage: $0 <prompt-text-or-/slash>" >&2
  exit 1
fi

# JSON-escape prompt (basic — won't handle backslash heroics).
ESCAPED=$(printf '%s' "$PROMPT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

curl -sS --max-time 120 \
  -X POST "http://127.0.0.1:${PORT}/v1/prompt" \
  -H 'content-type: application/json' \
  -d "{\"prompt\": ${ESCAPED}}"
echo
