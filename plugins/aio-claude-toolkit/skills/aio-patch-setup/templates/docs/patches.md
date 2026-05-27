# Patches contract

`tools/pipeline/patches.json` — the single canonical patch table. `patch_cli.py` reads nó, apply entries vào `cli.js` body.

## Schema

```json
{
  "_description": "...",
  "_source": "...",
  "_versioning": "...",
  "_anchor_strategy": "...",
  "patches": [
    { "id": "...", "old": "...", "new": "..." },
    { "id": "INJECT@my_hook", "old": "...", "new": "..." },
    { "id": "...", "resolve": true, "anchor_template": "...", "replacement_template": "..." }
  ]
}
```

Top-level `_*` keys = doc comments, ignored by `patch_cli.py` (`patch_cli.py:247` reads only `.patches`).

## Three patch directives

### 1. Replace (default)

```json
{ "id": "A1", "old": "<exact text in cli.js>", "new": "<replacement text>" }
```

`patch_cli.py:206-213` — `body.replace(old, new)`. `count` of occurrences logged. `count == 0` → entry added to `missing[]`. `--strict` mode exits với error.

### 2. INJECT@ — anchor injection

Prefix `id` với `INJECT@`. `new` được inserted **BEFORE** `old`. Anchor preserved.

```json
{ "id": "INJECT@boot_my_thing", "old": "<anchor>", "new": "<code to inject>" }
```

`patch_cli.py:191-203` — `body.replace(old, new + old)`. Multiple occurrences → injected before each (warning logged).

**Use case:** code injection mà không thay thế bất kỳ logic nào — boot hooks, useEffect bổ sung, init code. Đây là cách [[control-channel]] được wire.

### 3. Resolver-driven

```json
{
  "id": "P1",
  "resolve": true,
  "anchor_template": "<{{symbol1}}={{symbol2}}(<arg>)>",
  "replacement_template": "<{{symbol1}}={{symbol2}}({{arg}})>"
}
```

`{{key}}` placeholders → resolved at build time từ stable anchors. Xem [[symbol-resolver]] cho full list of resolvable symbols + how each is anchored.

## Anchor strategy — the only rule

**Anchor on invariant content. Never on minified names.**

Invariant = Anthropic không thể rename mà không break their own contract.

| Type | Why stable | Example |
|---|---|---|
| OTel event names | Dashboards query bằng tên | `body:\`claude_code.${...}\`` |
| API field names | Server-side schema | `status:"allowed"`, `unifiedRateLimitFallbackAvailable:` |
| Dispatch literals | Maps API field → API header | `[["five_hour","5h"],["seven_day","7d"]]` |
| Prompt prose | User-visible behavior | English sentences in system prompts |
| Shell syntax | Bash semantics | `"$@"`, `.join(" ")` |

| Type | Why fragile | Example |
|---|---|---|
| Minified names | Renamed every release | `dA5`, `w1`, `kCH` |
| Variable positions | Reordered by minifier | `let A=...,B=...,C=...` |
| Formatting | Whitespace stripped/added | indentation |

## Current entries (1)

### `INJECT@dirty_control_channel`

The only patch ships in this repo. Boots HTTP server inside Ink REPL. Wired ở `patches.json:7-14`.

**Anchor:** `let I1=f6.useCallback(async(v_,z6)=>{` — start of useCallback declaration in main REPL component, right after `X74({executeQueuedInput:kCH,...})`.

**Why this anchor:** by this point, `kCH` (submit fn) và `R4` (messages state setter) đã declared, no TDZ. Anchor stays unique on minify.

**What gets injected:** a `useEffect` that fires on mount:
- Captures `kCH` / `R4` / `l6` / `j6` / `AH.getState` vào `globalThis.__dc_*`
- Snapshots open dialogs into `__dc_dialog_cache` (keyed by `dialog_id`) for race-free `/v1/answer`
- Monkey-patches `globalThis.fetch` once (`__dc_fetch_wrapped` guard) — every `api.anthropic.com` response is tee'd via `ReadableStream.tee()` and the body decoded into `__dc_http_log` (ring buffer, cap 200)
- Boots `node:http` server on `$DC_PORT` (default `47291`), bound to `127.0.0.1`
- Implements `/v1/prompt`, `/v1/state`, `/v1/answer` (xem [[control-channel]])
- Idempotent on both server (`__dc_server`) and fetch wrap (`__dc_fetch_wrapped`)

**Caveats** (documented in `patches.json:11`):
1. Single-process, localhost-only (singleton enforced at `tools/run.sh` level via `pgrep` + SIGTERM/SIGKILL; opt out with `DC_NO_SINGLETON=1`)
2. Best-effort turn correlation — stable-ms polling for message settle; `httpResponses` sliced by `__dc_http_log.length` since submit
3. Slash commands without model call return `httpResponses=[]` but `added>0`
4. No auth
5. HTTP submits go through `kCH` queue-drainer path, not typed-prompt path — both converge in `j74` but surrounding state differs slightly
6. Fetch wrap decodes body as UTF-8 — fine for Anthropic JSON/SSE; hypothetical binary responses would be lossy
7. `__dc_http_log` ring buffer capped at 200 entries — long sessions evict oldest (harmless: `/v1/prompt` slices fresh per turn)

**Version sensitivity:** anchor + 3 minified names (`kCH`, `R4`, `l6/j6`) pinned to `2.1.150`. Fail-closed nếu rename → re-paste manually. Xem [[versioning]].

## Tooling

| Tool | Purpose |
|---|---|
| `tools/cli-nav/` | Find anchors. acorn AST traversal + string anchor search. Needs `acorn acorn-walk eslint-scope`. |
| `.claude/skills/cli-semantic-map/` | Skill: method for reading cli.js by semantic role (OTel emitter, rate-limit state, etc.) |
| `tools/pipeline/resolve_symbols.py` | Resolver — used by `resolve: true` patches |
| `tools/pipeline/test_resolve_symbols.py` | Unit tests (`python3 -m pytest`) |
| `tools/pipeline/inline_sources.py` | Inlines `sources/<basename>.js` into the `new` field of any patch carrying `"new_source": "<basename>.js"`. Called by `build.sh` before `patch_cli.py`. Idempotent (`--check` mode for CI). |
| `tools/pipeline/sources/` | Readable JS source-of-truth files for big patch bodies. Inlined into `patches.json` at build time. |

### The `new_source` field

When a patch body grows past ~30 lines, stuffing it into a JSON string field destroys readability (no syntax highlighting, awkward escaping, hard to diff). Replace `"new": "<huge string>"` with:

```json
{
  "id": "INJECT@dirty_control_channel",
  "old": "let I1=f6.useCallback(async(v_,z6)=>{",
  "new_source": "dirty_control_channel.js",
  "new": ""
}
```

`inline_sources.py` reads `tools/pipeline/sources/dirty_control_channel.js`, sets `"new"` to its full text, and writes patches.json back. Idempotent (re-run = no-op if source unchanged).

Edit the `.js` file as normal source code — `node --check` for parse-check, normal lint/format. `build.sh` re-inlines before each `patch_cli.py` run.

## Failure semantics

`patch_cli.py:215-226` — at end of `apply_patches`:

```python
report = {
  "applied":  [...],   # successful replaces
  "injected": [...],   # successful INJECT@s
  "missing":  [...],   # didn't find anchor
  "resolved": [...],   # symbol resolution results
}

if missing and strict:
    sys.exit(f"ERROR: --strict: {len(missing)} patches missing: {missing}")
```

→ `build.sh` runs with `--strict` (default). Build fails loud nếu anchor nào không match. Đây là anti-silent-drift guarantee.

## Adding a new patch — checklist

1. **Find anchor** trong cli.js current version. Dùng `tools/cli-nav/` hoặc grep cho invariant content.
2. **Verify uniqueness** — anchor phải match exactly once (hoặc INJECT@ phải tolerate multiple).
3. **Verify stability** — anchor có phải minifier-resistant? Nếu reference minified name, document trong `_caveats`.
4. **Draft patch entry** với clear `_what` / `_anchor_strategy` / `_caveats` doc comments (mọi `_*` field bị ignore but human-readable).
5. **Test apply** — `./tools/build.sh` should report `[id] ×1 delta=+N bytes` cho patch mới.
6. **Verify behavior** — `./tools/run.sh` + integration test.

## Related

- [[architecture]] — Decision 4 (anchor strategy)
- [[symbol-resolver]] — resolver-driven patches in depth
- [[pipeline]] — build flow context
- [[control-channel]] — the current patch in detail
- [[versioning]] — anchor durability across releases
