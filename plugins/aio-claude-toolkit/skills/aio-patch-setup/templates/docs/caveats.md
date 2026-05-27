# Caveats

Known limitations và edge cases. Read before depending on this in production.

## Control channel caveats

### 1. Pinned to claude `2.1.150`, darwin-arm64

Injection anchor (`let I1=f6.useCallback(async(v_,z6)=>{`) và 5 minified names trong patch body (`kCH`, `R4`, `l6`, `j6`, `AH`) match THIS extraction only.

**Mitigation:**
- `patch_cli.py --strict` fails loud on anchor miss
- Re-paste manually per version bump — chi tiết [[versioning]]
- Future: migrate to resolver-driven via [[symbol-resolver]]

### 2. Two completion-detection paths

Two different gating mechanisms for "turn done", depending on response shape:

**SSE path (`POST /v1/prompt` Accept=text/event-stream and `GET /v1/stream`)** — signal-based:
- Primary: scan Anthropic SSE chunk stream for `"stop_reason":"..."`. When a value in `{end_turn, max_tokens, stop_sequence, refusal}` is seen, emit `turn.end` and (for POST handler) close the connection. `tool_use` and `pause_turn` keep the stream open — a follow-up Anthropic call is expected.
- Fallback for slash commands (no Anthropic call): if `__dc_submit` settles AND no `anthropic.request_start` broadcast fired within `DC_SLASH_GRACE_MS` (default 1500 ms), emit `turn.end {source: "idle_fallback"}` and close.
- Ceiling: `DC_MAX_MS` (default 120 s).

**Blocking JSON path (`POST /v1/prompt` Accept=application/json)** — heuristic:
- Polls `messages.length` every 100 ms. Considered "done" after stable for `DC_STABLE_MS` (default 800 ms) AND submit promise settled.
- Catches reliably: simple text replies, most tool roundtrips.
- Edge cases that fool it: long tool call where binary thinks silently >800 ms; multi-turn agents that pause >800 ms then resume.

**Mitigation:**
- Prefer SSE path when you need stream timing — signal-based, not polling.
- For blocking path edge cases: bump `DC_STABLE_MS=2000` for safety.

### 3. Shared session with terminal user

API submits show up in live REPL exactly như user typed. **No isolation.**

If terminal user is busy with a turn khi API call arrives:
- `jy6` enqueues → `__dc_submit` await returns at **enqueue time**, not turn-end
- Diff sees no new assistant message
- API caller observes `added:0` while busy

**Mitigation:**
- Document `added:0` semantics — client should poll `/v1/state` for completion
- Or: don't share session; spin up dedicated headless instance

#### 3a. ⚠️ Cross-turn pollution on POST SSE under shared session (phase 1)

**Symptom:** A `POST /v1/prompt` with `Accept: text/event-stream` closes mid-stream with a `turn.end` event carrying a `url` field — i.e. the `turn.end` came from a DIFFERENT turn's Anthropic call, not yours.

**Cause:** Broadcast events have no `turn_uuid` tagging in phase 1. Any `turn.end` broadcast (from any Anthropic API call's terminal `stop_reason`) triggers `closeOnTurnEnd` for every POST SSE subscriber currently connected. If the terminal user (or a concurrent submit) finishes a turn while your POST SSE is waiting for chunks, the foreign `turn.end` closes you early.

**Concrete reproducer:**
1. Run `tools/run.sh` interactively (you're "the terminal user").
2. From another terminal: `curl -sN -H "Accept: text/event-stream" -X POST :47291/v1/prompt -d '{"prompt":"reply ABC"}'`
3. Immediately after `curl` returns, fire another POST SSE for a slow prompt while a delayed classifier or follow-up call from the prior turn is still draining → the late `turn.end` closes the new connection prematurely.

**Mitigation (phase 1):**
- Run the patched binary as a **dedicated headless instance** for SSE consumption. No terminal user activity = no foreign turns = no pollution.
- Or use the blocking JSON path (`Accept: application/json`) for SSE-style consumption with full per-turn `httpResponses[]` capture — slower (waits for `DC_STABLE_MS`) but immune to cross-turn pollution because it slices `__dc_http_log` by index.
- Or consume `GET /v1/stream` (ambient, `closeOnTurnEnd: false`) and filter events client-side; don't trust auto-close.

**Planned fix (phase 2):** thread `turn_uuid` through fetch wrap so broadcast events carry the originating submit's uuid; POST SSE subscriber filters `closeOnTurnEnd` to its own uuid only.

### 4. No auth

Binds `127.0.0.1` only. Sole barrier = localhost-only.

If tunneled (SSH port forward, etc.) → port becomes routable on remote machines.

**Mitigation:**
- Add bearer token check trong patch body trước JSON parse
- Or: never tunnel without TLS + auth proxy

### 5. Slash commands route through queue-drainer

`kCH` is the queue-drainer fn, not the typed-into-prompt-bar path. Cả hai converge in `j74` (hooks + slash parsing run normally), nhưng surrounding state differs:
- Queue array position
- Focus state
- Prompt-bar value

If a custom slash command depends on prompt-bar state, behavior may differ slightly từ typed submission.

**Mitigation:**
- Custom slash commands should be stateless về prompt-bar
- For state-dependent ones: file bug + work around via `/v1/answer` semantics

## Pipeline caveats

### Bun SFA layout pinned to 1.3.14+

`extract_cli.py` only supports Bun 1.3.14+ NUL-delimited format. Older Bun 1.3.13 used per-blob `[u64 tag][u32 flags][u32 len]` headers.

Older Claude Code (2.1.131 hoặc earlier) shipped with older Bun → won't extract với current pipeline.

**Mitigation:**
- Keep current pin updated to latest Claude
- If you need to extract from an older Claude (e.g., for regression bisection), check out a matching `extract_cli.py` from your project's git history (older parser may be needed if Bun SFA layout shifted)

### `bun build --compile` only — `bun run` doesn't work

Documented at [[architecture]] Decision 2.

`bun run dist/<arch>/cli.js`:
```
Expected CommonJS module to have a function wrapper
```

→ Bun runtime SFA CJS instantiator wants bytecode wrapper, không phải plain source. Only `bun build --compile` packs source into a fresh SFA.

**Mitigation:** none needed — pipeline uses `--compile` path.

### Native modules feature-gated

If native `.node` files missing from `dist/<arch>/`, features fail at runtime. Doesn't crash boot.

| Missing | Effect |
|---|---|
| `image-processor.node` | Image attachments fail |
| `audio-capture.node` | Voice unavailable |
| `url-handler.node` | `open` shell shadow fails |

**Mitigation:**
- `tools/extract.sh` always carves natives → automatic
- Verify `ls dist/<arch>/*.node` after build

### Helper binaries staged from `tools/pipeline/helpers/<arch>/`

`bfs` (find replacement) + `ugrep` (grep replacement) needed for shell shadow features. Staged by `build.sh:52-55`.

If `helpers/<arch>/` directory missing → shell shadow may fall back to system `find`/`grep`. Behavior usually OK but inconsistent across platforms.

**Mitigation:** check `ls tools/pipeline/helpers/$(uname -s)-$(uname -m | sed 's/x86_64/amd64/' | tr '[:upper:]' '[:lower:]')-*/`

## Operational caveats

### Single port (47291), single instance

Patch boots HTTP server on `$DC_PORT`. Two patched instances on same machine would collide on port:
```js
}).listen(Number(process.env.DC_PORT||47291),"127.0.0.1")
```

Try-catch in patch ensures non-fatal:
```js
} catch (e) { globalThis.__dc_server = null }
```

→ Second instance silently has no server.

**Mitigation (default — enforced by `tools/run.sh`):**
- Singleton at launcher level: `pgrep -f "$BIN"` finds prior instances, SIGTERM, wait up to ~1 s, escalate to SIGKILL if not graceful. New instance binds cleanly.
- Opt out: `DC_NO_SINGLETON=1 ./tools/run.sh ...` when running multiple instances on distinct `DC_PORT` values.

**Mitigation for non-`run.sh` launches:**
- Set `DC_PORT` per instance when running multiple
- Check `globalThis.__dc_server` to detect failure

### `messages` snapshot diffs vs live updates

`/v1/prompt` returns `messages` = diff slice từ `before` to `after`:
```js
let bf = (await globalThis.__dc_msgs()).length;  // before submit
// ... submit + poll ...
let af = await globalThis.__dc_msgs();
let ad = af.slice(bf);                            // diff
```

Race: if `messages` grows from other source (terminal user, hook) between `bf` capture và submit, those entries appear in `ad`. Rare in practice (single-process timing).

### `appState` is best-effort serialization

`/v1/state` projects Zustand store qua safe serializer:
- Functions → `"[fn:name]"`
- Cycles broken
- Depth limited (6)
- Arrays sliced (30)
- Object keys sliced (60)

→ Deep state structures may be truncated. Don't depend on exhaustive enumeration.

**Mitigation:** read specific known fields (xem [[control-channel]] for known keys). Don't iterate appState blindly.

### SSE streaming — real-time per-chunk

`POST /v1/prompt` with `Accept: text/event-stream` (and `GET /v1/stream`) forwards every Anthropic SSE chunk to subscribers within ~ms of arrival via `globalThis.__dc_broadcast`. Per-chunk granularity, no buffering.

**Implications for callers:**
- Long-running turns deliver progress incrementally — no need to wait for completion.
- `httpResponses[]` in the blocking JSON path is still the **canonical post-hoc record** (full body, captured headers). SSE event `anthropic.chunk` carries the same body bytes split per network chunk.
- No subscriber filtering in phase 1: SSE clients see ambient terminal-user events too. Filter by `turn_uuid` client-side.

**Bun's `req.on("close")` quirk** — under bun's node:http compat layer, `req.on("close")` fires shortly after `req.on("end")` for POST requests with bodies, NOT only on client disconnect. The SSE POST handler subscribes ONLY to `rs.on("close")` for cleanup; subscribing to `rq.on("close")` would yank the subscriber 10–15 ms after add (before any broadcast had a chance to fire), which manifested as "POST SSE receives turn.start but zero anthropic.chunk events". This is now correctly handled.

## Development caveats

### `dist/` is regenerable, gitignored

`.gitignore` excludes `dist/`. Every fresh checkout requires `./tools/extract.sh` before first build.

**Sane default:** extract once per Claude version, persistent until version bump.

### Pipeline scripts host-only

`extract.sh` / `build.sh` / `run.sh` target host platform only. No cross-compile.

→ To build for `linux-amd64` từ darwin-arm64: dùng Docker hoặc native Linux machine.

### Symbols cache busted per build

`resolve_symbols.py` runs at every `--strict` build encountering resolver-driven patch. ~1 sec resolution cost. Built into the 1.2s rebuild number.

→ Not a problem in practice. Could cache to disk if needed, but adds invalidation complexity.

## Related

- [[control-channel]] — fully documented protocol
- [[versioning]] — version-specific failure modes
- [[architecture]] — design decisions behind these caveats
- [[pipeline]] — failure modes table
