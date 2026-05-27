# Architecture

Core design decisions, locked. Every decision below has a falsifiable reason — *"we tried X, X broke for reason Y, so Z"*.

## Decision 1 — Patch cli.js, không phải SDK / stream-json

Claude Code đã expose stream-json boundary:

```bash
claude -p --input-format stream-json --output-format stream-json
```

→ đó là IO ở **process boundary**.

Patch cli.js khi cần tap **inside the agent loop** hoặc giữ full interactive surface (Ink REPL, dialog, slash command, MCP) trong khi remote-control. Stream-json không cho phép điều này.

Cụ thể: control channel hiện tại expose `kCH` (submit function), `R4` (messages state reader), `l6/j6` (current dialog JSX) — tất cả đều là internal React state mà stream-json không touch tới. Xem [[control-channel]].

## Decision 2 — Recompile với `bun build --compile`, KHÔNG `bun run`

`bun run cli.js` **không chạy được** với extracted source:

```
Expected CommonJS module to have a function wrapper
```

Lý do: bun runtime SFA CJS instantiator expect một **bytecode function wrapper**, không phải plain JS source. Wrapper khi extract ra là plain text — runtime không nhận.

`bun build --compile` đi qua code path khác: bundler + compiler. Nó pack 14 MB plain-JS file **fresh** thành SFA mới — ~1.2s. Real bun runtime: native `Bun` global, `bun:ffi`, JSC, no Node, no polyfills.

→ Recompile faithful, không phải Node polyfill.

Implementation: `tools/build.sh:45` invokes `bun build cli-body.js --compile --target=$BUN_TARGET`.

## Decision 3 — cli.js source = bun-compiled binary

Anthropic ship **no plain source**. Mọi distribution channel (npm tarball, install scripts) đều chứa bun-compiled binary.

→ `tools/extract.sh` carve cli.js **raw** (wrapper intact) ra khỏi binary. Algorithm chi tiết ở `tools/pipeline/extract_cli.py:23-34`:

1. Find Bun trailer `\n---- Bun! ----\n` (last occurrence)
2. Parse payload offsets từ 32-byte struct trước trailer
3. Trong payload, find marker `// @bun @bytecode @bun-cjs\n(function(exports, require, module` whose preceding bytes contain `/$bunfs/root/src/entrypoints/cli.js\x00`
4. Content end = next `\x00/$bunfs/` separator
5. Sanity: body ends with `})\n` hoặc `})`

`patch_cli.py` **strip wrapper at build time** (`extract_cli.py:61` defines `WRAPPER_PREFIX`). Không strip lúc extract vì raw form dùng cho debugging / inspection.

## Decision 4 — cli.js is minified — anchor on invariant content

Bun's minifier rename mọi internal identifier giữa các release: `dA5`, `w1`, `kCH`, `jy6` — không stable.

→ Anchor patches trên **invariant content**:
- OTel event names (`body:\`claude_code.${...}\``)
- API field names (`status:"allowed"`, `unifiedRateLimitFallbackAvailable:`)
- Dispatch literals (`[["five_hour","5h"],...]`)
- Prompt prose
- Shell syntax (`"$@"`, `.join(" ")`)

KHÔNG anchor trên minified names. Khi bắt buộc reference minified name (như `kCH`, `R4` trong control-channel injection), document rõ ở `patches.json._caveats` và chấp nhận re-paste manually mỗi version bump.

Resolver-driven patches: dùng stable anchors để resolve minified names runtime, sau đó substitute vào `anchor_template` / `replacement_template`. Xem [[symbol-resolver]].

## Decision 5 — Native modules → siblings of binary

cli.js requires native `.node` files via virtual path:

```js
require("/$bunfs/root/image-processor.node")
require("B:/~BUN/root/image-processor.node")   // Windows
```

Khi recompile bằng `bun build --external '*.node' --external '/$bunfs/*'`, virtual path không resolve runtime.

→ `patch_cli.py:88-110` rewrite require strings thành sibling lookup:

```js
require(require("path").join(
  require("path").dirname(process.execPath),
  "image-processor.node"
))
```

→ runtime resolve thành `<bin_dir>/image-processor.node`. `tools/build.sh:51` copy native files cạnh binary. Match deployed tarball layout. Xem [[native-modules]].

## Decision 6 — Recompile IS the inner loop

~1.2s rebuild → fast enough để treat như normal compile cycle. Không cần hot-reload, không cần patching live process. Edit `patches.json` → `./tools/build.sh && ./tools/run.sh` → test → repeat.

→ Pipeline được optimize cho iteration speed:
- Extract once per Claude version (heavy)
- Patch + bun build per change (~1.2s)
- Run = exec, no startup overhead

Xem [[pipeline]] cho full flow.

## Non-decisions (deliberately deferred)

- **No SSE streaming.** Block-only response từ `/v1/prompt`. Streaming sẽ thêm sau khi có Stop hook integration. [[caveats]]
- **No auth.** Bind `127.0.0.1` only. Đủ cho local dev. Production cần tunneling → caller phải add token check.
- **No turn-end signal.** Heuristic polling với `DC_STABLE_MS=800`. TODO: replace bằng Claude's Stop event hook.

## Related

- [[pipeline]] — implementation flow
- [[patches]] — patch contract
- [[control-channel]] — gateway protocol
- [[versioning]] — version pin policy
