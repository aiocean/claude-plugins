# Patch & recompile Claude Code — pipeline docs

Reference docs for a project scaffolded by `/aio-claude-toolkit:aio-patch-setup`. Each page stands alone and is wiki-linked with `[[page-name]]`.

## What this pipeline does

You extract `cli.js` from an installed Claude Code binary (bun single-file executable), apply YOUR patches (defined in `tools/pipeline/patches.json`), then recompile to a standalone binary. The original use case shipped as a reference is a control-channel injection (HTTP+SSE server inside the running Claude binary — drive it programmatically from another process / machine), but patches can do anything: rewrite prompts, change tool descriptions, inject telemetry, etc.

The pipeline is **patch-agnostic**: it materializes the artifacts (cli.js + native `.node` modules), applies a JSON-defined patch table, and rebuilds. What the patches *do* is up to you.

## Index

### Architecture & design
- [[architecture]] — Core design decisions: recompile vs `bun run`, why patch `cli.js`
- [[control-channel]] — HTTP+SSE gateway protocol (the reference example) — `/v1/prompt`, `/v1/stream`, `/v1/state`, `/v1/answer`, `/v1/diag`
- [[versioning]] — Tested-against Claude version, what changes per release
- [[repatching-playbook]] — Step-by-step procedure when Claude bumps version: find new anchor, resolve minified names, smoke-test (copy-paste commands)

### Pipeline mechanics
- [[pipeline]] — End-to-end flow: `extract.sh` → `patches.json` → `build.sh` → `run.sh`
- [[patches]] — `patches.json` schema, anchor strategy, `new_source` workflow for big patch bodies
- [[symbol-resolver]] — Resolver-driven patches via stable anchors (`{{symbol}}` templates)
- [[native-modules]] — How `.node` files are extracted, staged, and required at runtime

### Reference
- [[glossary]] — Key terms: Bun SFA, anchor, wrapper, etc.
- [[caveats]] — Known limitations + edge cases (cross-turn pollution, signal-vs-heuristic turn-end, no auth, shared session)

## TL;DR workflow

```bash
./tools/extract.sh                    # 1. carve cli.js + .node → dist/<arch>/
$EDITOR tools/pipeline/patches.json   # 2. add/update your patches
./tools/build.sh                      # 3. patch + recompile (~1.2s) → dist/<arch>/claude
./tools/run.sh -p "hi"                # 4. exec the built binary
```

If your patches inject the reference HTTP control-channel pattern, drive the binary from another process:
```bash
curl -X POST :47291/v1/prompt -d '{"prompt":"hello"}'
bun control/client.ts                 # or use the TUI client (scaffold via /aio-patch-control)
```

See [[pipeline]] for step-by-step detail.

## Project layout

```
<project>/
├── tools/
│   ├── extract.sh / build.sh / run.sh     # 3-step pipeline (honor ARCH env for cross-arch)
│   ├── pipeline/                          # engine: extract_cli.py, patch_cli.py, ...
│   │   ├── patches.json                   # YOUR patches (starts empty — see patches.json.example)
│   │   ├── patches.json.example           # reference patch table (HTTP control-channel example)
│   │   ├── sources/                       # readable JS source for big patch bodies
│   │   │   ├── README.md                  # how source-inlining works
│   │   │   └── dirty_control_channel.js.example   # reference HTTP-channel patch body
│   │   ├── inline_sources.py              # syncs sources/*.js into patches.json's "new" field
│   │   ├── patch_cli.py                   # strip wrapper + apply patches + rewrite native requires
│   │   ├── resolve_symbols.py             # resolve minified names from stable anchors
│   │   └── helpers/<arch>/                # bfs/ugrep binaries staged next to claude
│   └── cli-nav/                           # acorn AST + string anchors to find hook points
│       ├── find-anchors.cjs               # index invariant content (OTel, prose, tool descs)
│       ├── navigate.cjs                   # AST nav (--find string | --fn name | --at offset)
│       ├── build-explorer.cjs             # emit single-file HTML explorer for cli.js
│       └── lib.cjs / lib-resolve.cjs      # shared AST + template-literal helpers
├── control/                               # OPTIONAL — only if you scaffolded the HTTP example
│   ├── client.ts                          # REPL TUI implementation (bun, blocking JSON only)
│   └── *.sh                               # curl-based clients for the HTTP+SSE channel
├── dist/<arch>/                           # extract cache + built binary (gitignored)
└── .aio-patch-setup                       # sentinel — sync metadata (Claude version, plugin version, sync date)
```

The `control/` directory is **opt-in** — scaffold it via `/aio-claude-toolkit:aio-patch-control scaffold` if your patches inject an HTTP server (the reference pattern). If your patches do something else (rewrite prompts, change tool descs, etc.), you don't need it.
