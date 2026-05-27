# dirty-claude wiki

Project knowledge base. Mỗi page tự đứng một mình — link với nhau bằng `[[page-name]]`.

## What this project is

dirty-claude **extract** `cli.js` từ binary Claude Code đã compile bằng bun, **patch** nó để expose một control channel (localhost HTTP server), rồi **recompile** thành standalone binary. Mục đích: drive Claude từ một process / machine khác — agent-as-a-service controllable programmatically.

**KHÔNG phải prompt-patching.** Không rewrite system prompt / anti-slop. Đó là việc của godClaude (`update-claude`). Project này dùng cùng pipeline (`extract → patch → bun build --compile`), nhưng `patches.json` chứa **control-channel patches** thay vì prompt patches.

## Index

### Architecture & design
- [[architecture]] — Core design decisions: recompile vs `bun run`, why patch cli.js
- [[control-channel]] — HTTP + SSE gateway protocol: `/v1/prompt`, `/v1/stream`, `/v1/state`, `/v1/answer`, `/v1/diag`
- [[versioning]] — Current pin (`2.1.150`, darwin-arm64), what changes per release
- [[repatching-playbook]] — Step-by-step procedure when Claude bumps version: find new anchor, resolve 5 minified names, smoke-test (copy-paste commands)

### Pipeline mechanics
- [[pipeline]] — End-to-end flow: `extract.sh` → `patches.json` → `build.sh` → `run.sh`
- [[patches]] — `patches.json` schema, anchor strategy, `new_source` workflow for big patch bodies
- [[symbol-resolver]] — Resolver-driven patches via stable anchors (`{{symbol}}` templates)
- [[native-modules]] — How `.node` files are extracted, staged, and required at runtime

### Reference
- [[glossary]] — Key terms: Bun SFA, kCH/R4/jy6, anchor, wrapper, etc.
- [[caveats]] — Known limitations + edge cases (cross-turn pollution, signal-vs-heuristic turn-end, no auth, shared session)

## Workflow ở mức TL;DR

```bash
./tools/extract.sh                    # 1. carve cli.js + .node → dist/<arch>/
# edit tools/pipeline/patches.json    # 2. add/update control-channel patches
./tools/build.sh                      # 3. patch + recompile (~1.2s) → dist/<arch>/claude
./tools/run.sh -p "hi"                # 4. exec the built binary

# 5. drive it from another process
curl -X POST :47291/v1/prompt -d '{"prompt":"hello"}'
bun control/client.ts                 # or use the TUI client
```

Chi tiết từng bước ở [[pipeline]].

## Project layout

```
dirty-claude/
├── tools/
│   ├── extract.sh / build.sh / run.sh     # the 3-step pipeline (host-only)
│   ├── pipeline/                          # engine: extract_cli.py, patch_cli.py, ...
│   │   ├── patches.json                   # CONTROL-CHANNEL patches (canonical)
│   │   ├── sources/                       # readable JS source for big patch bodies
│   │   │   └── dirty_control_channel.js   # the INJECT@dirty_control_channel body
│   │   ├── inline_sources.py              # syncs sources/*.js into patches.json's "new" field
│   │   ├── patch_cli.py                   # strip wrapper + apply patches + rewrite natives
│   │   ├── resolve_symbols.py             # resolve minified names from stable anchors
│   │   └── helpers/<arch>/                # bfs/ugrep binaries staged next to claude
│   └── cli-nav/                           # acorn AST + string anchors to find hook points
│       ├── find-anchors.cjs               # index invariant content (OTel, prose, tool descs)
│       ├── navigate.cjs                   # AST nav (--find string | --fn name | --at offset)
│       ├── build-explorer.cjs             # emit single-file HTML explorer for cli.js
│       └── lib.cjs / lib-resolve.cjs      # shared AST + template-literal helpers
├── control/                               # client code that drives the HTTP/SSE channel
│   ├── client.ts                          # REPL TUI implementation (bun, blocking JSON only)
│   ├── interactive-client.sh              # wrapper → bun client.ts (REPL)
│   ├── simple-client.sh                   # POST blocking, raw JSON (jq pipelines)
│   ├── raw-client.sh                      # POST blocking, pretty-printed JSON (reading)
│   ├── stream-client.sh                   # POST SSE, raw event stream
│   ├── stream-text.sh                     # hybrid ambient+blocking, text deltas (chat UX)
│   └── stream-ambient.sh                  # GET /v1/stream, timestamped tail
├── claude-src/                            # optional drop spot for a claude binary (gitignored)
├── dist/<arch>/                           # extract cache + built binary (gitignored)
└── .claude/skills/cli-semantic-map/       # method for reading cli.js by semantic role
```
