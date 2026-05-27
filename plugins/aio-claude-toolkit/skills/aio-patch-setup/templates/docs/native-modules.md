# Native modules

`.node` files mà cli.js dynamically requires. Pipeline extract chúng từ binary, stage cạnh recompiled binary, rewrite require strings để runtime resolve via sibling lookup.

## Modules in 2.1.150 darwin-arm64

`dist/darwin-arm64/native/`:
```
audio-capture.node       # voice input
image-processor.node     # image attachments  
url-handler.node         # OS URL open
```

(Also: `computer-use-*.node` on darwin-x64 / linux when applicable.)

## Extraction algorithm

`tools/pipeline/extract_native_modules.py` — string-anchor + magic-byte heuristic.

**Pattern:** `<path>\\0<binary_dylib>`

For each path prefix variant in `PATH_VARIANTS`:
- POSIX: `/$bunfs/root/<name>.node\\0`
- Windows: `B:\\~BUN\\root\\<name>.node\\0` (or forward-slash `B:/~BUN/root/...`)

**Magic bytes** (filter out string refs in cli.js source):
- Mach-O 64 LE (darwin): `cffaedfe`
- Mach-O 64 BE: `feedfacf`
- ELF (linux): `\\x7fELF`
- PE (windows): `MZ`

**Content length:** each dylib extends until start of next matching entry (next `\\0/$bunfs/...`). Single binary uses only one path variant, so trailing separator = whichever form matched.

**Why string-anchor + magic, not Bun StringPointer format:**
- Bun's StandaloneModuleGraph.zig format shifted across versions
- String anchor is **hard-coded in Bun source** (`/$bunfs/root/`) — won't change
- Magic bytes verify body is a real dylib, không phải string ref in cli.js

→ False positives auto-filtered.

## Require rewriting at build time

cli.js originally:
```js
require("/$bunfs/root/image-processor.node")
```

After `tools/build.sh`, `patch_cli.py:88-110` rewrites to:
```js
require(require("path").join(
  require("path").dirname(process.execPath),
  "image-processor.node"
))
```

**Why inline `require("path")` twice:**
- Don't rely on cli.js import order — patch runs early, `path` module may not have a binding yet
- Each require is independent; no shared state

**Regex pattern** (`patch_cli.py:88-90`):
```python
_NATIVE_REQUIRE = re.compile(
    rb'require\("(?:/\$bunfs/root|B:[\\/]~BUN[\\/]root)[\\/]([a-zA-Z0-9_\-]+)\.node"\)'
)
```

→ Accepts both POSIX and Windows variants. Captures module name. Reported back as `list_of_replaced_names` so `build.sh` can verify all expected modules were rewritten.

**Why `--external '*.node'` in bun build** (`build.sh:46`): bundler không inline native modules. Required vì native files cannot be embedded in bun SFA — they must remain as siblings.

**Why `--external '/$bunfs/*'`**: bundler không try to resolve virtual paths at compile time. The rewritten requires happen at runtime against `process.execPath`.

## Staging step

`build.sh:51`:
```bash
cp "$WORK/native/"*.node "$WORK/" 2>/dev/null || true
```

→ copy all `.node` files từ `dist/<arch>/native/` cạnh `dist/<arch>/claude`. Match deployed tarball layout. Runtime require resolves to siblings.

**Helper binaries** (`build.sh:52-55`):
```bash
if [[ -d "$PIPE/helpers/$PLAT" ]]; then
  cp "$PIPE/helpers/$PLAT/"* "$WORK/"
  chmod +x "$WORK/"*
fi
```

→ `bfs` (find replacement) + `ugrep` (grep replacement) — used by claude for shell shadow features. Staged cùng `.node` files. Per-arch directory at `tools/pipeline/helpers/darwin-arm64/`, etc.

## Runtime resolution

When patched binary runs:
1. `cli.js` reaches a require statement
2. Rewritten: `require(path.join(path.dirname(process.execPath), "X.node"))`
3. `process.execPath` = absolute path to running binary
4. `path.dirname` strips filename → binary's directory
5. `path.join` appends `.node` filename
6. Final path: `<bin_dir>/X.node` → loaded from sibling

→ Works từ bất kỳ install location. No hard-coded paths.

## What breaks if native missing

Native module features resolve at runtime. **Other features unaffected.**

| Module | Feature gated | Fallback |
|---|---|---|
| `image-processor.node` | Image attachments, OCR | Reject image inputs at upload |
| `audio-capture.node` | Voice input | Voice commands unavailable |
| `url-handler.node` | `open ./file` shell shadow | URL/file open fails |
| `computer-use-*.node` | Computer-use beta tools | Tools error at invocation |

→ Most prompt/conversation flows work fine without natives. Useful cho minimal recompile testing.

## Verification

After build, list dist:
```bash
ls dist/darwin-arm64/
# claude  cli-body.js  cli.js  cli.meta.json  audio-capture.node  bfs  
# image-processor.node  native/  ugrep  upstream/  url-handler.node
```

→ `.node` files should be at top level cạnh `claude` (not just in `native/`).

Runtime smoke test:
```bash
./tools/run.sh -p "test" 2>&1 | head
# Should boot without "module not found" errors
```

## Related

- [[architecture]] — Decision 5 (natives as siblings)
- [[pipeline]] — extract + build context
- [[patches]] — `patch_cli.py` rewrites natives
- [[caveats]] — feature gates on missing natives
