#!/usr/bin/env bash
# stream-text.sh — submit a prompt and print ONLY the assistant's text
# deltas as they stream. No event framing, no JSON envelope — just raw
# characters, like watching a person type.
#
# Design: opens GET /v1/stream (ambient subscriber) in the background and
# fires the actual submit through POST /v1/prompt (blocking JSON). This
# avoids the phase-1 cross-turn pollution caveat (POST SSE's closeOnTurnEnd
# would yank the connection on the first terminal stop_reason — often the
# classifier API call — and you'd miss the main reply).
#
# Diagnostic (stderr, prefixed [dc]):
#   [dc] api ↗                    — Anthropic call started
#   [dc] dialog.opened ...        — permission/elicitation dialog opened
#   [dc] turn.end ...             — an Anthropic call returned terminal stop_reason
#   [dc] done                     — blocking POST returned, exiting
#
# Skips tool_use blocks (only text_delta is rendered). For full event stream
# including all framing, use stream-client.sh. For ambient cross-session
# tailing, use stream-ambient.sh.
#
# Usage:
#   ./control/stream-text.sh "tell me about postgres in 3 sentences"
#   ./control/stream-text.sh "count from 1 to 5, one per line"
#   DC_PORT=47291 DC_TIMEOUT=300 ./control/stream-text.sh ...

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

# Parser reads /v1/stream events and emits text_deltas only.
PARSER=$(cat <<'PYEOF'
import sys, json, re

text_delta_re = re.compile(r'"type"\s*:\s*"text_delta"\s*,\s*"text"\s*:\s*("(?:\\.|[^"\\])*")')

event = None
data_lines = []

def handle(event, data_text):
    if event == "anthropic.request_start":
        sys.stderr.write("[dc] api ↗\n"); sys.stderr.flush()
    elif event == "anthropic.chunk":
        try:
            obj = json.loads(data_text)
        except Exception:
            return
        chunk = obj.get("chunk", "")
        for m in text_delta_re.finditer(chunk):
            try:
                text = json.loads(m.group(1))
                sys.stdout.write(text); sys.stdout.flush()
            except Exception:
                pass
    elif event == "dialog.opened":
        try:
            obj = json.loads(data_text)
            sys.stderr.write(f"\n[dc] dialog.opened component={obj.get('component','?')} id={obj.get('dialog_id','?')}\n")
        except Exception:
            sys.stderr.write("\n[dc] dialog.opened\n")
        sys.stderr.flush()
    elif event == "dialog.closed":
        sys.stderr.write("\n[dc] dialog.closed\n"); sys.stderr.flush()
    elif event == "turn.end":
        # Just log to stderr; the blocking POST will tell us when the turn truly ends.
        try:
            obj = json.loads(data_text)
            sys.stderr.write(f"\n[dc] turn.end stop_reason={obj.get('stop_reason')} source={obj.get('source','?')}\n")
        except Exception:
            sys.stderr.write("\n[dc] turn.end\n")
        sys.stderr.flush()

for raw in sys.stdin:
    line = raw.rstrip("\n").rstrip("\r")
    if line == "":
        if event:
            handle(event, "\n".join(data_lines))
        event, data_lines = None, []
        continue
    if line.startswith(":"):
        continue  # SSE comment / :ping
    if line.startswith("event:"):
        event = line[6:].strip()
    elif line.startswith("data:"):
        data_lines.append(line[5:].lstrip())
PYEOF
)

# Start ambient stream subscriber in background, piping through parser.
# Use a FIFO so we can kill the curl side cleanly when the blocking POST returns.
TMPDIR=$(mktemp -d)
# Single-quoted trap body so $(jobs -p) defers to signal time, not set time.
# shellcheck disable=SC2064
trap 'rm -rf "$TMPDIR"; kill $(jobs -p) 2>/dev/null || true' EXIT INT TERM

FIFO="$TMPDIR/stream.fifo"
mkfifo "$FIFO"

# Subscribe to /v1/stream → FIFO. Background curl, file-redirected for clean kill.
curl -sNS --max-time 0 "http://127.0.0.1:${PORT}/v1/stream" > "$FIFO" 2>/dev/null &
STREAM_PID=$!

# Parser reads FIFO, prints text_deltas. Backgrounded so blocking POST can run.
python3 -u -c "$PARSER" < "$FIFO" &
PARSER_PID=$!

# Brief sleep so subscriber lands in the server's Set BEFORE we POST (avoids
# race where the very first request_start fires before subscription).
sleep 0.2

# Fire the actual submit — blocking JSON path, full turn awaited.
# Stdout discarded (the parser handles printing). stderr surfaces curl errors.
curl -sS --max-time "$TIMEOUT" \
  -X POST "http://127.0.0.1:${PORT}/v1/prompt" \
  -H 'content-type: application/json' \
  -d "{\"prompt\": ${ESCAPED}}" \
  > /dev/null

# Blocking POST returned ⇒ turn complete (per server's stable-ms polling).
# Give the FIFO a beat to drain any tail bytes, then tear down.
sleep 0.3
kill "$STREAM_PID" 2>/dev/null || true
# Closing the FIFO write end via kill makes parser hit EOF and exit naturally.
wait "$PARSER_PID" 2>/dev/null || true

printf '[dc] done\n' >&2
