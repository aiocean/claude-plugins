# control/ — drive the patched claude binary from outside

The `INJECT@dirty_control_channel` patch in `tools/pipeline/patches.json`
boots a localhost HTTP + SSE server inside the patched `claude` binary when
the main REPL component mounts, and monkey-patches `globalThis.fetch` so every
`api.anthropic.com` response is teed:
- **Branch A** flows untouched to Claude's consumer (zero behavior change).
- **Branch B** drains per-chunk, broadcasts every chunk as `event: anthropic.chunk`
  to SSE subscribers in real time, and pushes the full body to `__dc_http_log`
  (ring buffer, cap 200) at response end.

This directory holds client code that drives that server.

## Protocol — see [docs/control-channel.md](../docs/control-channel.md)

Full endpoint reference, SSE event schema, env vars, and design rationale live
there. This README only covers the shell wrappers in `control/`.

**TL;DR endpoints:**
- `POST /v1/prompt` — blocking JSON (default) or streaming SSE (`Accept: text/event-stream`)
- `GET /v1/stream` — ambient SSE subscriber (receives all broadcast events)
- `GET /v1/state` — inspect dialog + Zustand store
- `POST /v1/answer` — dismiss / respond to open dialog
- `GET /v1/diag` — broadcast diagnostics (subscriber list, recent history)

## Client matrix

| Script | Mode | Output | Best for |
|---|---|---|---|
| [`simple-client.sh`](simple-client.sh) | POST blocking JSON | raw JSON (unformatted) | shell pipelines piping into `jq` |
| [`raw-client.sh`](raw-client.sh) | POST blocking JSON | pretty-printed JSON | reading full response by eye, debugging `httpResponses[].body` |
| [`stream-client.sh`](stream-client.sh) | POST SSE | raw SSE event stream | pipelines that want per-event handling |
| [`stream-text.sh`](stream-text.sh) | hybrid (ambient + blocking) | assistant text deltas only | watching the model reply live, like chat UX |
| [`stream-ambient.sh`](stream-ambient.sh) | GET /v1/stream | timestamped events (chunks truncated) | monitoring sessions, debugging cross-turn pollution |
| [`interactive-client.sh`](interactive-client.sh) | POST blocking (REPL) | Bun TUI | interactive debugging |

All scripts share `DC_PORT` (default `47291`) and `DC_TIMEOUT` (default `120`–`300`s depending on script) env vars.

---

## Blocking clients (full JSON returned in one shot)

### `simple-client.sh`

One-shot `curl` driver. Dumps the raw `/v1/prompt` JSON unformatted. For
pipelines or shell scripts that pipe into `jq`:

```sh
./control/simple-client.sh "what is 2+2?"
./control/simple-client.sh /status
DC_PORT=8080 ./control/simple-client.sh ...
```

### `raw-client.sh`

Same shape as `simple-client.sh` but pipes through `python3 -m json.tool` for
pretty output. Use when you want to **read** the full JSON (including
`httpResponses[].body` SSE) by eye, or pipe into `jq` for extraction:

```sh
./control/raw-client.sh "hi"
./control/raw-client.sh "hi" | jq -r '.httpResponses[0].body'
./control/raw-client.sh "hi" | jq -r '.httpResponses[].headers["anthropic-request-id"]'
./control/raw-client.sh "hi" | jq '.messages[] | select(.role=="assistant")'
DC_TIMEOUT=300 ./control/raw-client.sh "long agent prompt..."
```

Standalone CLI alternative to the REPL `:raw` toggle — no interactive
session needed.

### `interactive-client.sh`

Bun-driven REPL TUI (`control/client.ts`). Use when you want to drive Claude
by hand:

```sh
./control/interactive-client.sh             # connect to 127.0.0.1:47291
DC_PORT=8080 ./control/interactive-client.sh
```

REPL commands:
- `:help` — list commands
- `:state` — dump `/v1/state` JSON
- `:dialog` — inspect + answer the current dialog (no submit)
- `:raw` — dump next response as JSON (includes `httpResponses`)
- `:wait` — poll until state stabilizes
- `:quit` / Ctrl+D — exit

> **Note:** The interactive REPL currently uses only the blocking JSON path.
> Streaming consumption from the TUI is a follow-up.

---

## SSE streaming clients

### `stream-client.sh` — raw SSE event dump

One-shot `POST /v1/prompt` with `Accept: text/event-stream`. Streams the raw
SSE event sequence to stdout, line-buffered. Closes on `turn.end`.

```sh
# basic
./control/stream-client.sh "tell me a joke"

# slash command (no API call) — closes via DC_SLASH_GRACE_MS idle fallback
./control/stream-client.sh /clear

# pipe to filter only event names
./control/stream-client.sh "hi" | grep '^event:'

# extract only the data payloads
./control/stream-client.sh "hi" | awk '/^data:/ {print substr($0,6)}'

# pull the final stop_reason
./control/stream-client.sh "hi" | grep -A1 turn.end | tail -1 | jq .stop_reason

# env overrides
DC_PORT=8080 ./control/stream-client.sh "..."
DC_TIMEOUT=600 ./control/stream-client.sh "long agent prompt..."
```

**Output shape** (one stanza per event, separated by blank line):
```
event: turn.start
data: {"turn_uuid":"<uuid>","prompt":"tell me a joke"}

event: anthropic.request_start
data: {"url":"https://api.anthropic.com/v1/messages?beta=true"}

event: anthropic.chunk
data: {"url":"...","chunk":"event: message_start\ndata: {...}\n\n..."}

event: anthropic.chunk
data: {"url":"...","chunk":"event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Why\"}}\n\n"}

event: turn.end
data: {"stop_reason":"end_turn","source":"stop_reason","url":"..."}
```

**Caveat:** the server closes the connection on the FIRST `turn.end` it
emits. Under shared session OR multi-API-call submits (classifier + main
response), `stream-client.sh` will close on whichever Anthropic call
finishes first. See `docs/caveats.md#3a`. For a complete response use
`stream-text.sh` or `raw-client.sh` instead.

### `stream-text.sh` — assistant text deltas only ✨

The "chat UX" client: prints raw text characters as they stream, like
watching a person type. Strips all framing (outer SSE, inner Anthropic
SSE, JSON envelope), skips `tool_use` / `thinking` blocks.

Uses a **hybrid pattern**: opens a `GET /v1/stream` ambient subscriber in
the background, then fires the submit via blocking `POST /v1/prompt`. This
avoids the phase-1 cross-turn pollution caveat — the ambient stream stays
open through classifier + main response, and the blocking POST signals
"turn truly done" via its `messages.length` polling.

```sh
# basic — text streams to stdout, diagnostic to stderr
./control/stream-text.sh "tell me about postgres in 3 sentences"

# count example — verified to print "1\n2\n3\n4\n5\n"
./control/stream-text.sh "count from 1 to 5, one per line, nothing else"

# silence diagnostic (just the text)
./control/stream-text.sh "hi" 2>/dev/null

# capture text to a file
./control/stream-text.sh "long answer please" > reply.txt 2> events.log

# slash command — no text but shows lifecycle events on stderr
./control/stream-text.sh "/clear" 2>&1
```

**Output:**
```
$ ./control/stream-text.sh "count from 1 to 5, one per line"
[dc] api ↗
1
2
3
4
5
[dc] turn.end stop_reason=end_turn source=stop_reason
[dc] done
```

**Stderr diagnostic events** (always prefixed `[dc]`):
- `[dc] api ↗` — an Anthropic API call started
- `[dc] dialog.opened component=... id=...` — permission/elicitation modal opened
- `[dc] dialog.closed` — modal dismissed
- `[dc] turn.end stop_reason=...` — an Anthropic call returned terminal status
- `[dc] done` — blocking POST returned, script exits

**Limitations:**
- Only text deltas rendered — `tool_use` blocks, `thinking` blocks, and tool results are ignored.
- For dialog flows: the dialog still needs to be answered via a separate `POST /v1/answer` call. `stream-text.sh` just reports the open.
- Under shared session, ambient stream sees terminal-user activity too; text from foreign turns may interleave (rare in practice).

### `stream-ambient.sh` — tail GET /v1/stream

Subscribes to `GET /v1/stream` and tails every broadcast event until
Ctrl-C. Each event prefixed with HH:MM:SS.mmm timestamp; `anthropic.chunk`
payloads truncated to 200 chars for readability.

```sh
# tail until Ctrl-C
./control/stream-ambient.sh

# raw mode — don't truncate anthropic.chunk, dump full bytes
./control/stream-ambient.sh --raw

# pipe to filter only turn boundaries
./control/stream-ambient.sh | grep turn.end

# count chunks per minute (rough activity meter)
./control/stream-ambient.sh | grep anthropic.chunk | \
  awk -F: '{print $1":"$2}' | sort | uniq -c

# tee to log file while watching live
./control/stream-ambient.sh | tee /tmp/dc-session.log

# env override
DC_PORT=8080 ./control/stream-ambient.sh
```

**Output:**
```
$ ./control/stream-ambient.sh
[01:21:12.176] :connected
[01:21:12.944] anthropic.request_start {"url":"https://api.anthropic.com/v1/messages?beta=true"}
[01:21:14.652] anthropic.chunk url=https://api.anthropic.com/v1/messages?beta=true chunk=event: message_start\ndata: {"type":"message_start","message":{"model":"claude-opus-4-7","id":"msg_01CBJ...
[01:21:14.725] anthropic.chunk url=https://api.anthropic.com/v1/messages?beta=true chunk=event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn",...
[01:21:14.725] turn.end {"stop_reason":"end_turn","source":"stop_reason","url":"..."}
```

**Use cases:**
- Monitor a developer's REPL session in real time
- Debug cross-turn pollution (see foreign `turn.end` events fire mid-stream)
- Verify that submitted prompts actually reach Anthropic (check for `anthropic.request_start` after a submit)
- Capture session traffic to a log for post-mortem analysis

---

## Quick verification (end-to-end)

In one terminal:
```sh
./tools/build.sh && ./tools/run.sh
# claude starts; wait for "❯" prompt to appear in REPL
```

In another, run each client to verify:
```sh
# blocking JSON
curl -sS http://127.0.0.1:47291/v1/state | jq '.hasDialog'
./control/simple-client.sh "reply with exactly the word PONG" | jq -r '.messages[-1].content[-1].text'
./control/raw-client.sh "reply OK" | jq '.httpResponses[0].headers["anthropic-request-id"]'

# streaming
./control/stream-client.sh "reply PONG" | grep -c '^event:'   # expect ≥3
./control/stream-text.sh "say hello in 3 words"                # expect 3-word output
./control/stream-ambient.sh | head -20                         # leave running, then submit elsewhere

# slash command (no API call)
./control/stream-client.sh "/clear" | tail -2                  # expect turn.end with source=idle_fallback
```

## Singleton at the launcher

`tools/run.sh` enforces single-instance by default: before exec it runs
`pgrep -f "$BIN"`, sends SIGTERM to prior instances, waits up to ~1 s for
graceful shutdown, then escalates to SIGKILL. This prevents two patched
binaries from racing for port `47291`. Opt out with `DC_NO_SINGLETON=1` when
you want multiple instances on distinct `DC_PORT` values.

## Caveats — read [docs/caveats.md](../docs/caveats.md) before depending on this

Key items:
- Pinned to `claude 2.1.150`, darwin-arm64 (5 minified names hardcoded).
- No auth — `127.0.0.1` only.
- No subscriber filtering (phase 1) — SSE clients see ambient terminal-user activity.
- POST SSE closes on first `turn.end` broadcast — even from foreign Anthropic calls. Use `stream-text.sh` (hybrid ambient+blocking) for full responses; reserve `stream-client.sh` for known-isolated submits.
- Bun's `req.on("close")` fires shortly after `req.on("end")` for POST bodies — the
  SSE handler subscribes only to `rs.on("close")` to avoid premature cleanup.
