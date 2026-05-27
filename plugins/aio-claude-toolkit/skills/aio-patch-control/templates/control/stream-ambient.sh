#!/usr/bin/env bash
# stream-ambient.sh — subscribe to GET /v1/stream and tail events.
#
# Ambient SSE subscriber. Receives EVERY broadcast event for the lifetime of
# the connection (until you Ctrl-C). Use for:
#   - Monitoring a session as a developer drives the REPL
#   - Correlating events across multiple POST /v1/prompt calls
#   - Debugging cross-turn pollution (see docs/caveats.md#3a)
#   - Tailing during a stuck turn to see if Anthropic is still streaming
#
# Output: raw SSE events one per stanza, prefixed with timestamp. Auto-decodes
# `anthropic.chunk` data's inner JSON `chunk` field truncated to 200 chars for
# readability (use stream-client.sh / curl directly for full bytes).
#
# Usage:
#   ./control/stream-ambient.sh                    # tail until Ctrl-C
#   ./control/stream-ambient.sh | grep turn.end    # only turn boundaries
#   ./control/stream-ambient.sh --raw              # don't decode chunks, pass through raw
#   DC_PORT=47291 ./control/stream-ambient.sh

set -eo pipefail

PORT="${DC_PORT:-47291}"
RAW=0
if [[ "${1:-}" == "--raw" ]]; then
  RAW=1
fi

FORMATTER=$(cat <<'PYEOF'
import sys, json, time, os

RAW = os.environ.get("DC_AMBIENT_RAW") == "1"

event = None
data_lines = []

def hms():
    t = time.time()
    ms = int((t - int(t)) * 1000)
    return time.strftime("%H:%M:%S") + f".{ms:03d}"

def emit(event, data_text):
    if event == "anthropic.chunk" and not RAW:
        try:
            obj = json.loads(data_text)
            url = obj.get("url", "")
            chunk = obj.get("chunk", "")
            # Truncate inner chunk for readability
            preview = chunk.replace("\n", "\\n")
            if len(preview) > 200:
                preview = preview[:197] + "..."
            print(f"[{hms()}] anthropic.chunk url={url[-50:]} chunk={preview}")
        except Exception:
            print(f"[{hms()}] anthropic.chunk {data_text[:200]}")
    elif event:
        # Just dump JSON for everything else (turn.start, turn.end, dialog.*, request_start)
        print(f"[{hms()}] {event} {data_text[:300]}")
    sys.stdout.flush()

for raw in sys.stdin:
    line = raw.rstrip("\n").rstrip("\r")
    if line == "":
        if event:
            emit(event, "\n".join(data_lines))
        event, data_lines = None, []
        continue
    if line.startswith(":"):
        # SSE comment — typically :connected or :ping
        print(f"[{hms()}] {line}")
        sys.stdout.flush()
        continue
    if line.startswith("event:"):
        event = line[6:].strip()
    elif line.startswith("data:"):
        data_lines.append(line[5:].lstrip())
PYEOF
)

# curl --max-time 0 means no timeout. -N: no buffering. -s: silent progress.
DC_AMBIENT_RAW="$RAW" exec curl -sNS --max-time 0 "http://127.0.0.1:${PORT}/v1/stream" \
  | DC_AMBIENT_RAW="$RAW" python3 -u -c "$FORMATTER"
