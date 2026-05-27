# Pipeline

End-to-end flow từ upstream claude binary → patched standalone binary của bạn.

## Three scripts, three concerns

```
┌──────────────────┐    ┌──────────────┐    ┌──────────┐
│ tools/extract.sh │ →  │ tools/build.sh│ → │tools/run.sh│
│  (once per ver) │    │ (per change) │    │  (exec)   │
└──────────────────┘    └──────────────┘    └──────────┘
       │                       │                   │
       ↓                       ↓                   ↓
   dist/<arch>/             dist/<arch>/      exec binary
   cli.js + native          claude            forward args
```

## Step 1 — `./tools/extract.sh`

**Purpose:** Materialize `cli.js` + native `.node` modules cho host platform vào `dist/<arch>/`.

**Binary resolution order** (`extract.sh:41-58`):
1. Path passed as `$1`
2. `claude-src/claude` (conventional local drop spot)
3. npm download — latest, hoặc `CLAUDE_VERSION=2.1.150 ./tools/extract.sh`

**Per-platform output** (`extract.sh:29-35`):
- `Darwin-arm64` → `dist/darwin-arm64/`, npm pkg `@anthropic-ai/claude-code-darwin-arm64`
- `Darwin-x86_64` → `dist/darwin-amd64/`, ...
- `Linux-{arm64,amd64}` → tương ứng

**What gets written:**
```
dist/<arch>/
├── cli.js              # raw, wrapper intact (14 MB plain JS)
├── cli.meta.json       # extraction metadata (offsets, version)
├── native/*.node       # extracted native modules
├── .version            # claude version string
└── upstream/           # npm download cache (if downloaded)
```

**Algorithm:** delegated to `tools/pipeline/extract_cli.py` + `extract_native_modules.py`. Chi tiết format ở [[architecture]] Decision 3 và [[native-modules]].

## Step 2 — Edit `tools/pipeline/patches.json`

**This is your work.** Pipeline mechanics dừng ở đây — content patches là của bạn.

Schema + anchor strategy ở [[patches]]. Resolver-driven patches (survive version bumps) ở [[symbol-resolver]].

**Finding anchors:** dùng `tools/cli-nav/` (acorn AST + string anchors) + skill `.claude/skills/cli-semantic-map/`.

## Step 3 — `./tools/build.sh`

**Purpose:** Patch + recompile. Idempotent, ~1.2s per run.

**Inner steps** (`build.sh:38-55`):

1. **Apply patches** — `python3 patch_cli.py --strict cli.js patches.json cli-body.js`
   - Strip Bun-cjs wrapper (87-byte prefix + `})\n` suffix)
   - Apply each patch entry (replace, INJECT@, or resolver-driven)
   - Rewrite native requires to sibling lookup
   - Write body-only file to `cli-body.js`

2. **Recompile** — `bun build cli-body.js --compile --target=$BUN_TARGET --external '/$bunfs/*' --external '*.node' --outfile claude`
   - Bun bundler + compiler path (NOT runtime — runtime chokes; xem [[architecture]] Decision 2)
   - `--external '*.node'` tells bundler không inline native modules (they're staged as siblings)
   - `--external '/$bunfs/*'` tells bundler không resolve virtual paths at compile time

3. **Stage siblings** — copy native `.node` + helper binaries (`bfs`, `ugrep`) cạnh `claude`
   - From `dist/<arch>/native/` + `tools/pipeline/helpers/<arch>/`
   - Match deployed tarball layout

**Strict mode:** `--strict` flag (default in `build.sh`) → fail loud nếu bất kỳ patch anchor nào không match. Anti-silent-drift guarantee khi Claude version bump.

## Step 4 — `./tools/run.sh [args]`

**Purpose:** `exec` the built binary, forwarding args.

**Does NOT build.** If bạn edited `patches.json` hoặc `cli.js`, chain:
```bash
./tools/build.sh && ./tools/run.sh [args]
```

**Args handling** (`run.sh:21-24`):
```bash
./tools/run.sh                  # interactive REPL
./tools/run.sh --version
./tools/run.sh -p "hi"          # one-shot prompt
./tools/run.sh -- --version     # explicit `--` separator (also accepted)
```

## The Recompile-IS-the-inner-loop principle

Vì `build.sh` chạy ~1.2s, treat nó như normal compile cycle. Workflow:

```
edit patches.json
  ↓
./tools/build.sh
  ↓ (~1.2s)
./tools/run.sh -p "test"
  ↓
inspect output
  ↓
loop
```

Không có hot-reload. Không có live patching. Đơn giản và predictable.

## Failure modes

| Failure | Where | Fix |
|---|---|---|
| `cli.js doesn't start with expected wrapper` | `patch_cli.py:68-72` | Claude version bump changed wrapper format → check `extract_cli.py:23-34` layout |
| `--strict: N patches missing` | `patch_cli.py:222` | Patch anchor không match — re-find anchor (cli-nav), update `patches.json` |
| `bun build produced no binary` | `build.sh:47` | `bun --version` check, inspect last 2 lines of bun output |
| `no binary at dist/<arch>/claude` (run.sh) | `run.sh:37` | Run `./tools/build.sh` first |
| `cli.js content marker not found` (extract) | `extract_cli.py:95-99` | Upstream Bun SFA layout changed → inspect payload manually |

## Related

- [[patches]] — patches.json contract
- [[symbol-resolver]] — resolver-driven patches
- [[native-modules]] — .node handling
- [[control-channel]] — what the current patch installs
- [[versioning]] — when Claude bumps
