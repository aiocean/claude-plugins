# Control channel

Localhost HTTP server injected vào patched claude binary. Drives input + reads output từ another process / machine. Captures raw Anthropic API responses and **streams them back to subscribers in real time** via SSE.

## How it wires up

```
external client                            claude (patched, Ink REPL)
    │                                         │
    │ POST /v1/prompt (JSON)                  │  node:http server on $DC_PORT
    ├────────────────────────────────────────►│  (default 127.0.0.1:47291)
    │                                         │
    │ POST /v1/prompt (SSE)                   │  globalThis.__dc_submit(item) ─►
    ├═══════════════════════════════════════►─│      kCH ─► jy6 ─► j74
    │                                         │      (UserPromptSubmit hooks +
    │ GET  /v1/stream (ambient SSE)           │       slash parser + model query)
    ├═══════════════════════════════════════►─│
    │                                         │  fetch wrap tee's every api.anthropic.com
    │                                         │  response → branch A: untouched to Claude
    │                                         │                branch B: per-chunk broadcast
    │                                         │                       to all SSE subscribers
    │                                         │                       + append to __dc_http_log
    │                                         │
    │  ◄═══ event: anthropic.chunk × N ══════ │  fetch wrap broadcast per chunk read
    │  ◄═══ event: turn.end ═════════════════ │  stop_reason scan → terminal value detected
    │       (closeOnTurnEnd auto-closes)      │  OR slash-fallback idle window expires
    │                                         │
    │ {"httpResponses":[...],                 │
    │  "messages":[...],"uuid","added",       │  blocking JSON path unchanged for
    │  "waitedMs","pending":?}                │  backward-compat (Accept: application/json)
    ◄─────────────────────────────────────────┤
```

**Two submit paths in cli.js, both converge in `j74`:**
- Typed-into-prompt-bar path → through prompt-bar state
- Queue-drainer `kCH` path → bypass prompt-bar, enqueue directly

Control channel uses the **queue-drainer path**. Hooks, slash commands, MCP tools, agents — all work the same vì they live in `j74`.

## Globals exported by the patch

Injected qua `tools/pipeline/sources/dirty_control_channel.js` → inlined to `patches.json` by `inline_sources.py`:

| Global | Source | Purpose |
|---|---|---|
| `globalThis.__dc_submit` | `kCH` | Submit function — accepts `[{value, preExpansionValue, mode, pastedContents, skipSlashCommands, uuid}]` |
| `globalThis.__dc_msgs` | trick via `R4` | `() => Promise<messages[]>` — read current React state snapshot |
| `globalThis.__dc_toolJSX` | `l6` | Current dialog JSX wrapper hoặc null |
| `globalThis.__dc_setToolJSX` | `j6` | Setter for above |
| `globalThis.__dc_appstate` | `AH.getState` | Live Zustand store reader |
| `globalThis.__dc_server` | own server | Self-reference (idempotency guard) |
| `globalThis.__dc_fetch_wrapped` | boolean flag | True once `globalThis.fetch` is monkey-patched |
| `globalThis.__dc_http_log` | array (cap 200) | Ring buffer of `{ts,url,status,headers,body}` cho mọi `api.anthropic.com` response |
| `globalThis.__dc_subscribers` | `Set<sub>` | All currently-connected SSE subscribers. Broadcast iterates this. |
| `globalThis.__dc_broadcast` | function | `(name, data) => void` — writes SSE event to every subscriber |
| `globalThis.__dc_TURN_END_REASONS` | `Set<string>` | `{end_turn, max_tokens, stop_sequence, refusal}` — stop_reasons that terminate a turn |
| `globalThis.__dc_dialog_cache` | `Map<id, {component, callbacks, createdAt}>` | Pinned dialog snapshots for race-free `/v1/answer` |
| `globalThis.__dc_diag` | object | Broadcast counters + recent history (cap 50). Exposed via `GET /v1/diag`. |

**The R4 trick** — messages state có setter `R4` nhưng không getter. Pattern dùng:
```js
new Promise(r => R4(p => { r(p); return p }))
```
→ pass identity function as updater, capture `p` (current state) qua resolver, return `p` (no change). Side-effect-free read.

## HTTP response capture + per-chunk broadcast (fetch wrap)

Same `useEffect` that boots the server also monkey-patches `globalThis.fetch` once (idempotent via `__dc_fetch_wrapped`).

**At request start** (before awaiting upstream) → broadcast `anthropic.request_start` event. Subscribers see API activity has begun before any byte returns. Critical for the SSE POST handler's slash-command-vs-API discriminator.

**At response time** — every response whose URL contains `api.anthropic.com` has its body teed via `ReadableStream.tee()`:

- Branch **A** flows untouched into a fresh `Response` returned to Claude's original consumer — zero behavior change.
- Branch **B** drains in the background through `TextDecoder` and, per chunk, does TWO things:
  1. **Broadcast `event: anthropic.chunk`** to all SSE subscribers (real-time, raw passthrough)
  2. Scan the accumulated stream for `"stop_reason":"..."` and update `lastStopReason` (per-fetch-call scope to avoid concurrent-call clobber; scan uses a 30-byte overlap window so chunk-boundary splits don't miss the field)
- At `reader.done`: push the full body to `__dc_http_log` (ring, cap 200) AND if `lastStopReason ∈ TURN_END_REASONS`, broadcast `event: turn.end {stop_reason, source: "stop_reason"}`. `tool_use` / `pause_turn` keep the stream open — the next API call's response is expected.

**Why fetch, not undici/http**: Claude Code's API client wraps `globalThis.fetch` (the proxy-aware shape). Hooking the global guarantees coverage without depending on minified internal names. Only `api.anthropic.com` is intercepted; telemetry, OAuth refresh, MCP HTTP, GitHub, etc. pass through untouched.

## SSE event schema

Every SSE subscriber (POST `/v1/prompt` Accept=text/event-stream **and** GET `/v1/stream`) receives the same broadcast events, with semantics below. Plus POST handler-injected lifecycle events.

| Event | Source | Data shape | When |
|---|---|---|---|
| `turn.start` | POST SSE handler | `{turn_uuid, prompt}` | One-shot at handler start. Not from broadcast — POST-SSE only. |
| `anthropic.request_start` | fetch wrap | `{url}` | Fired synchronously when `fetch(api.anthropic.com)` is intercepted, before response. |
| `anthropic.chunk` | fetch wrap branch B | `{url, chunk}` | Per chunk read. `chunk` is raw SSE bytes Anthropic sent (parse client-side). |
| `dialog.opened` | useEffect l6 transition | `{dialog_id, component, propKeys}` | When `__dc_toolJSX` transitions from null → non-null. |
| `dialog.closed` | useEffect l6 transition | `{dialog_id}` | When `__dc_toolJSX` transitions from non-null → null. `dialog_id` = previous dialog. |
| `turn.end` | fetch wrap stop_reason scan, OR POST SSE fallback timer | `{stop_reason, source, url?}` or `{turn_uuid, stop_reason, source}` | Terminal stop_reason detected, OR `idle_fallback` (no API call within `DC_SLASH_GRACE_MS`), OR `max_timeout` (DC_MAX_MS exceeded). |

Plus keep-alive: `:ping` comment every 15 seconds.

**Subscriber `closeOnTurnEnd` flag** — POST SSE subscriber sets `closeOnTurnEnd: true`; the broadcast helper schedules `sub.end()` 10ms after writing `turn.end`. GET `/v1/stream` subscribers set `closeOnTurnEnd: false` and stay open across turns (ambient observer).

**No subscriber filtering in phase 1.** All SSE subscribers receive ALL broadcast events — including ambient terminal-user activity. Client filters by `turn_uuid` (in `turn.start` POST handler events) or just consumes everything. Promote to server-side filter-by-turn_uuid if real pain emerges.

## Endpoints

### `POST /v1/prompt` — submit a prompt (blocking JSON or SSE)

**Request:**
```json
{
  "prompt": "your text",
  "mode": "prompt",
  "skipSlashCommands": false
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `prompt` | string | **required** | May start with `/` for slash command |
| `mode` | string | `"prompt"` | Matches Ink prompt-bar enum |
| `skipSlashCommands` | boolean | `false` | Force-disable slash parsing |

**Response shape depends on `Accept` request header:**

#### `Accept: application/json` (default) — blocking JSON

```json
{
  "httpResponses": [
    {
      "ts": 1716826543210,
      "url": "https://api.anthropic.com/v1/messages?beta=...",
      "status": 200,
      "headers": {
        "anthropic-request-id": "req_011...",
        "content-type": "text/event-stream",
        "anthropic-organization-id": "...",
        "...": "..."
      },
      "body": "event: message_start\ndata: {\"type\":\"message_start\",...}\n\nevent: content_block_start\n..."
    }
  ],
  "uuid": "<submit uuid>",
  "added": 14,
  "waitedMs": 812,
  "messages": [ /* raw React-state diff */ ],
  "pending": null
}
```

Field meanings:
- `httpResponses` — **raw Anthropic HTTP responses** captured during this turn via the patched-fetch interceptor. One entry per `api.anthropic.com` call (multiple when a `tool_use` chains follow-up turns). Body is the exact text the server sent — SSE for streaming, JSON otherwise. Use this when you need usage tokens, `anthropic-request-id` for support, raw thinking deltas, or full model output without React-state post-processing.
- `messages` — raw React-state diff: assistant text, thinking, tool_use, tool_result, progress, attachment, system meta.
- `added` — số message entries React state grew by
- `waitedMs` — wall-clock polling time
- `pending` — null normally; non-null nếu dialog opened during turn

**Error responses:**
- `400 {"error":"missing prompt"}` — bad input
- `503 {"error":"submit not ready"}` — component still mounting
- `500 {"error":"..."}` — exception in handler

**Dialog interrupt** (blocking only): handler returns early với `pending` field shaped like `GET /v1/state`'s `dialog`. Caller must POST `/v1/answer` để dismiss.

#### `Accept: text/event-stream` — streaming SSE

Server holds the connection open and emits events per the SSE event schema (above). On `turn.end` the connection closes (~10ms after the event is written).

```
event: turn.start
data: {"turn_uuid":"...","prompt":"reply PONG"}

event: anthropic.request_start
data: {"url":"https://api.anthropic.com/v1/messages?beta=true"}

event: anthropic.chunk
data: {"url":"https://...","chunk":"event: message_start\ndata: {...}\n\nevent: content_block_delta\n..."}

event: anthropic.chunk
data: {"url":"https://...","chunk":"event: message_delta\ndata: {\"...stop_reason\":\"end_turn\"...}\n\nevent: message_stop\n..."}

event: turn.end
data: {"stop_reason":"end_turn","source":"stop_reason","url":"https://..."}
```

For slash commands without an Anthropic call (e.g. `/clear`, `/status`):
```
event: turn.start
data: {"turn_uuid":"...","prompt":"/clear"}

event: turn.end
data: {"turn_uuid":"...","stop_reason":null,"source":"idle_fallback"}
```

`source` field values:
- `stop_reason` — terminal stop_reason detected in Anthropic SSE
- `idle_fallback` — slash-command path, no Anthropic call within `DC_SLASH_GRACE_MS` after submit settled
- `max_timeout` — `DC_MAX_MS` ceiling hit

### `GET /v1/stream` — ambient SSE subscriber

Opens an SSE stream that receives ALL broadcast events for the lifetime of the connection. Never closes server-side (except on `:ping` keep-alive failure). Use this to observe terminal-user activity, monitor a long-running session, or correlate events across multiple POST `/v1/prompt` calls.

```bash
curl -sN http://127.0.0.1:47291/v1/stream
# → :connected
# → event: anthropic.request_start
# → event: anthropic.chunk
# → event: turn.end
# → ... (forever until client disconnects)
```

### `GET /v1/state` — inspect current state

```json
{
  "hasDialog": true,
  "dialog": { /* same shape as `pending` */ },
  "appState": {
    "elicitation":               { "queue": [] },
    "toolPermissionContext":     { "mode": "auto", "...": "..." },
    "activeOverlays":            {},
    "pendingWorkerRequest":      null,
    "pendingSandboxRequest":     null,
    "pendingMemoryUpdates":      [],
    "classifierApprovals":       { "approvals": {}, "checking": {} },
    "channelPermissionCallbacks":{ "onResponse": "[fn]", "resolve": "[fn]" },
    "notifications":             { "current": {}, "queue": [] }
  }
}
```

`appState` = live Zustand store (`AH.getState()`) qua safe serializer:
- Functions → `"[fn:name]"`
- Depth limited (6)
- Arrays sliced to 30
- Object keys sliced to 60
- Cycles broken

### `POST /v1/answer` — respond to open dialog

**Request:**
```json
{
  "callback": "onAllow",
  "args": [{"allow": true}],
  "dialog_id": "dlg_..."
}
```

| Field | Type | Notes |
|---|---|---|
| `callback` | string **required** | Name from `pending.jsx.propKeys` |
| `args` | array (optional) | Spread into `callback.apply(null, args)`, default `[]` |
| `dialog_id` | string (optional) | When set, invokes from the pinned `__dc_dialog_cache` snapshot — race-free even if `toolJSX` has since churned |

**Response:** `{"ok":true,"returned":"<stringified, ≤200 chars>","dialog_id":"dlg_..."}`

**Errors:**
- `409 {"error":"no dialog open"}` — nothing to answer and no `dialog_id` given
- `410 {"error":"dialog_id not in cache",...}` — cache evicted (>10 dialogs since)
- `400 {"error":"callback not found","available":[...]}` — typo
- `500 {"error":"callback threw","detail":"..."}` — callback raised

**Example: `/permissions` modal flow:**
```bash
# 1. open modal via API
curl -sS -X POST http://127.0.0.1:47291/v1/prompt -d '{"prompt":"/permissions"}'
# → { ..., "pending": { "dialog_id":"dlg_...", "jsx": { "component":"CuK", "propKeys":["onExit","onRetryDenials"] } } }

# 2. dismiss it (pass dialog_id for race-free dispatch)
curl -sS -X POST http://127.0.0.1:47291/v1/answer -d '{"callback":"onExit","dialog_id":"dlg_..."}'
# → {"ok":true,"returned":null,"dialog_id":"dlg_..."}

# 3. confirm closed
curl -sS http://127.0.0.1:47291/v1/state | jq .hasDialog
# → false
```

### `GET /v1/diag` — broadcast diagnostics

Returns subscriber list + recent broadcast history. Pure introspection — no side effects. Useful when debugging "why didn't my subscriber receive event X".

```json
{
  "diag": {
    "broadcasts": 42,
    "writes": 84,
    "writeErrs": 0,
    "lastErr": null,
    "history": [
      {
        "ts": 1716826543210,
        "event": "anthropic.chunk",
        "subs": [
          {"i": 0, "tag": "ambient", "ok": true, "ret": true},
          {"i": 1, "tag": "post-sse:3828145d", "ok": true, "ret": true}
        ]
      }
      /* ...last 50 broadcast events... */
    ]
  },
  "subscribers": [
    {"tag": "ambient", "closeOnTurnEnd": false},
    {"tag": "post-sse:3828145d", "closeOnTurnEnd": true}
  ],
  "subCount": 2
}
```

## Env vars

| Var | Default | Effect |
|---|---|---|
| `DC_PORT` | `47291` | Port to bind. Always `127.0.0.1`. |
| `DC_STABLE_MS` | `800` | Blocking `/v1/prompt` (Accept=application/json): turn considered "done" when `messages.length` stable for this long. |
| `DC_SLASH_GRACE_MS` | `1500` | SSE `/v1/prompt`: if submit settled AND no `anthropic.request_start` fired within this window, emit `turn.end {source:"idle_fallback"}` and close (slash-command path). |
| `DC_MAX_MS` | `120000` | Absolute timeout cap per turn (both modes). |
| `DC_NO_SINGLETON` | unset | When `1`, `tools/run.sh` skips its kill-prior-instance pass (use to run multiple binaries on distinct `DC_PORT` values) |
| `DC_TIMEOUT` | `120` | Client-side curl timeout for `raw-client.sh` (server-side caps live in `DC_MAX_MS`) |

**Tuning `DC_STABLE_MS`:**
- Lower → snappier reply, may truncate slow streams
- Higher → safer for slow tools / agents pause-resume

**Tuning `DC_SLASH_GRACE_MS`:**
- Lower → slash commands close faster, but races against late-starting API calls (e.g., MCP-augmented prompts)
- Higher → safer cushion, slash commands hold longer

## Quick test

Terminal A:
```bash
./tools/build.sh && ./tools/run.sh
# wait for "❯" prompt to appear
```

Terminal B — **blocking JSON** (backward compat):
```bash
curl -sS -X POST http://127.0.0.1:47291/v1/prompt \
  -H 'content-type: application/json' \
  -d '{"prompt":"reply with exactly the word PONG and nothing else"}'
# → {"httpResponses":[{...}],"messages":[...],"uuid":"...","added":18,"waitedMs":4298,"pending":null}
```

Terminal B — **SSE streaming**:
```bash
curl -sN -H "Accept: text/event-stream" -X POST http://127.0.0.1:47291/v1/prompt \
  -H 'content-type: application/json' \
  -d '{"prompt":"reply PONG"}'
# event: turn.start
# data: {"turn_uuid":"...","prompt":"reply PONG"}
#
# event: anthropic.request_start
# data: {"url":"https://api.anthropic.com/v1/messages?beta=true"}
#
# event: anthropic.chunk
# data: {"url":"...","chunk":"event: message_start\n..."}
#
# event: turn.end
# data: {"stop_reason":"end_turn","source":"stop_reason","url":"..."}
```

Terminal B — **ambient stream**:
```bash
curl -sN http://127.0.0.1:47291/v1/stream
# :connected
# (waits — emits events as the patched claude makes Anthropic calls / opens dialogs)
```

Slash commands (SSE):
```bash
curl -sN -H "Accept: text/event-stream" -X POST http://127.0.0.1:47291/v1/prompt -d '{"prompt":"/clear"}'
# event: turn.start ...
# event: turn.end ... source: "idle_fallback"
```

## Clients

See [control/README.md](../control/README.md) for the full client matrix and per-script examples. Brief summary:

| Script | Mode | Best for |
|---|---|---|
| `simple-client.sh` | POST blocking JSON | shell pipelines piping into `jq` |
| `raw-client.sh` | POST blocking JSON | reading full response, debugging `httpResponses[].body` |
| `stream-client.sh` | POST SSE | per-event handling, raw event stream |
| `stream-text.sh` | hybrid (ambient + blocking) | chat UX — text deltas live as they stream |
| `stream-ambient.sh` | GET /v1/stream | session monitoring, cross-turn debugging |
| `interactive-client.sh` | POST blocking (REPL) | interactive debugging via Bun TUI |

Quick examples:
```bash
# blocking — full JSON
./control/raw-client.sh "what is 2+2?" | jq -r '.messages[-1].content[-1].text'

# raw SSE event stream
./control/stream-client.sh "reply PONG" | grep '^event:'

# text deltas only (chat UX)
./control/stream-text.sh "count from 1 to 5, one per line"

# ambient session monitoring
./control/stream-ambient.sh | grep turn.end
```

> **Note:** `control/client.ts` (the interactive Bun TUI) currently uses only the blocking JSON path. SSE consumption from the TUI is a follow-up.

## Caveats — read [[caveats]] before depending on this

Summary:
1. **Pinned to claude 2.1.150, darwin-arm64.** Anchor + 5 minified names hard-coded (`kCH`, `R4`, `l6`, `j6`, `AH`).
2. **SSE turn.end is signal-based** (stop_reason scan from Anthropic SSE) with a `DC_SLASH_GRACE_MS` idle fallback for slash-command paths.
3. **Shared session.** API submits show up in live REPL. No isolation.
4. **⚠️ Cross-turn pollution on POST SSE (phase 1).** Broadcast events carry no `turn_uuid`, so any `turn.end` (from any Anthropic call) closes ALL POST SSE subscribers via `closeOnTurnEnd`. Under shared session, a terminal-user turn ending mid-flight will truncate your POST SSE stream. **Mitigation: dedicate a headless instance for SSE consumption; or use blocking JSON path; or consume `GET /v1/stream` (no auto-close) and filter client-side.** See [[caveats#3a]].
5. **No auth.** Localhost-only enforcement is the only barrier.
6. **Queue-drainer path.** Slash commands depending on prompt-bar state may differ slightly.
7. **Fetch wrap decodes body as UTF-8.** Anthropic responses are JSON/SSE so this is fine; hypothetical binary responses would be lossy.
8. **`__dc_http_log` ring buffer (200 entries).** Long sessions don't OOM but oldest entries evict.
9. **bun node:http `req.on("close")` quirk.** Fires soon after `req.on("end")` for POST requests with bodies (not only on client disconnect). The SSE POST handler subscribes ONLY to `rs.on("close")` for cleanup — `rq.on("close")` would yank the subscriber 10–15ms after add, before any broadcast.

## Related

- [[architecture]] — Decision 1 (why patch cli.js)
- [[patches]] — the INJECT@dirty_control_channel entry + `new_source` / `inline_sources.py` workflow
- [[caveats]] — known limitations
- [[glossary]] — kCH, R4, jy6, j74, l6/j6, AH terms
