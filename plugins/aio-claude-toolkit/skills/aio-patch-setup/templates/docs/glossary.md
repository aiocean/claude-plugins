# Glossary

Key terms used across the wiki. Sort alphabetical.

## Bun SFA (Single File Application)

Bun's standalone binary format. Pack JS source + runtime + assets vào single executable. Layout (Bun 1.3.14+):
- Trailer: `\n---- Bun! ----\n` + 32-byte offsets struct
- Payload: NUL-delimited modules, each prefixed with `/$bunfs/root/<path>\\0`
- Module body: `// @bun @bytecode @bun-cjs\\n(function(...){...})\\n`

Anthropic ships Claude Code as Bun SFA. `extract_cli.py` parses this format.

## Bun-cjs wrapper

Each module wrapped in:
```js
(function(exports, require, module, __filename, __dirname) {
  // ... module body ...
})
```

Prefixed with `// @bun @bytecode @bun-cjs\n`. Patch pipeline strips this (`patch_cli.py:66-81`) before bun re-bundles.

**Why strip:** feeding wrapped source to `bun build --compile` would double-wrap.

## kCH (in 2.1.150)

Submit function — minified name. Captured trong patch as `globalThis.__dc_submit`. Accepts `[{value, preExpansionValue, mode, pastedContents, skipSlashCommands, uuid}]`. Triggers `jy6 → j74` pipeline (hooks + slash parser + model query).

Found in cli.js as `X74({executeQueuedInput:kCH,...})`. Renamed every Claude release.

## R4 (in 2.1.150)

Messages state setter — minified name. React `useState` setter for messages array. No direct getter; pattern used:
```js
new Promise(r => R4(p => { r(p); return p }))
```
→ identity update, side-effect-free read.

Captured trong patch as `globalThis.__dc_msgs`.

## l6 / j6 (in 2.1.150)

Tool JSX state + setter — minified names. Holds current dialog wrapper `{jsx, isLocalJSXCommand, shouldHidePromptInput, showSpinner, ...}` hoặc null.

Captured as `globalThis.__dc_toolJSX` + `__dc_setToolJSX`. Used by `/v1/answer` to read available callbacks và invoke them.

## jy6 (in 2.1.150)

Queue manager — minified name. Sits between `kCH` and `j74`. Manages submission queue khi REPL busy.

## j74 (in 2.1.150)

Submit pipeline — minified name. Where both queue-drainer and typed-submit paths converge. Runs UserPromptSubmit hooks, slash command parser, MCP tools, agents, model query.

## AH (in 2.1.150)

Zustand store binding — minified name. `AH.getState()` returns live app state. Slices include:
- `elicitation` — AskUserQuestion-style requests queue
- `toolPermissionContext` — mode (`auto`/`default`), allow rules
- `activeOverlays` — open overlay panels
- `pendingWorkerRequest` / `pendingSandboxRequest` — pending IPC
- `pendingMemoryUpdates` — in-flight memory writes
- `classifierApprovals` — auto-classify results
- `channelPermissionCallbacks` — async permission resolvers
- `notifications` — UI notification queue

## Anchor

Text fragment trong cli.js used to locate code for patching. Two qualities:
- **Unique** — matches exactly once (or INJECT@ tolerates multiple)
- **Invariant** — survives minification + version bumps

See [[patches]] for full anchor strategy.

## Anchor injection (INJECT@)

Patch directive that **inserts** `new` BEFORE `old` (anchor preserved). Implemented `patch_cli.py:191-203`:
```python
body.replace(old, new + old)
```

Used cho adding code (useEffect, init hooks) without replacing existing logic. ID prefix: `INJECT@<name>`.

## Resolver-driven patch

Patch directive that uses `{{symbol}}` placeholders in `anchor_template` và `replacement_template`. At build time, `resolve_symbols.py` derives minified names từ stable anchors, then `_resolve_template` substitutes. Survives version bumps automatically when anchors hold.

Marked với `"resolve": true` in `patches.json` entry. Xem [[symbol-resolver]].

## OTel event

OpenTelemetry trace event. Claude Code emits events like `claude_code.api_request`, `claude_code.tool_use`. Body format `body:\`claude_code.${...}\`` is stable anchor used by `resolve_symbols.py` to find emit helper function.

## Stable anchor

Anchor content that Anthropic cannot rename without breaking external contract:
- Customer dashboards (OTel)
- API consumers (rate-limit headers)
- Generated shell (`"$@"`, `.join(" ")`)
- User-facing prompts (English prose)

Contrast với minified names (renamed freely each build).

## Symbol (in resolver context)

A minified identifier name that resolver derives. Currently 8: `emit_helper`, `state`, `parser`, `buckets`, `arg`, `shadow_cmd`, `shadow_tool`, `shadow_args`. Each tied to specific stable anchor in `resolve_symbols.py:56-155`.

## Wrapper prefix / suffix

Bun-cjs wrapper byte boundaries.

**Prefix** (`patch_cli.py:61`):
```
// @bun @bytecode @bun-cjs\n(function(exports, require, module, __filename, __dirname) {
```
87 bytes.

**Suffix** (`patch_cli.py:63`):
```
})\n   or just })
```
2-3 bytes.

`strip_wrapper` removes both. `patch_cli.py:68-72` fails loud if either missing.

## /$bunfs/root/

Bun virtual filesystem prefix. Hard-coded trong Bun source (StandaloneModuleGraph.zig). Used in:
- Native require strings: `require("/$bunfs/root/X.node")`
- Module path prefixes in SFA payload

`patch_cli.py` rewrites these to `process.execPath`-relative paths at build time.

POSIX form: `/$bunfs/root/`. Windows form: `B:\\~BUN\\root\\` (or `B:/~BUN/root/` in serialized URLs).

## Sibling lookup

Runtime path resolution pattern:
```js
require(path.join(path.dirname(process.execPath), "X.node"))
```

Resolves to `<binary_dir>/X.node`. Used by `patch_cli.py` rewrite của native requires. See [[native-modules]].

## DC_PORT / DC_STABLE_MS / DC_MAX_MS

Env vars consumed by control channel:
- `DC_PORT` — HTTP server bind port (default 47291, always 127.0.0.1)
- `DC_STABLE_MS` — messages-array stable threshold for turn-end heuristic (default 800)
- `DC_MAX_MS` — absolute turn timeout (default 120000)

See [[control-channel]] for tuning guidance.

## Related

- [[architecture]] — design context for terms
- [[control-channel]] — protocol where kCH/R4/l6/AH live
- [[patches]] — anchor + INJECT@ usage
- [[symbol-resolver]] — resolver + symbol mechanics
