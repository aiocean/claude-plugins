---
name: aio-patch-compile
description: |
  Apply tools/pipeline/patches.json + bun build --compile → patched claude binary at dist/<arch>/claude. Default: current host arch only (fast inner-loop ~1.2s). Opt-in --target=all (4 platforms) or csv list (e.g. --target=darwin-arm64,linux-amd64). If cli.js for a target arch is not yet extracted, transitively calls extract first. Strict by default (fails fast on MISSING patches).
when_to_use: aio patch compile, build patched claude, recompile claude, bun build claude, apply patches build, build claude binary, cross-compile claude
argument-hint: "[--target current|all|<csv>] (STRICT=1 default)"
effort: high
---

# aio-patch-compile — apply patches + bun build

## Goal

Produce one or more patched claude binaries at `dist/<arch>/claude`. Inner loop after editing `tools/pipeline/patches.json` or any `tools/pipeline/sources/*.js` file.

## Usage

```
/aio-claude-toolkit:aio-patch-compile                                   # current host arch only (default)
/aio-claude-toolkit:aio-patch-compile --target=all                       # all 4 platforms
/aio-claude-toolkit:aio-patch-compile --target=darwin-arm64,linux-amd64  # csv list
STRICT=0 /aio-claude-toolkit:aio-patch-compile                           # ALLOW missing patches (NOT recommended)
```

## Behavior

For each target arch in the list:
1. If `dist/<arch>/cli.js` does NOT exist → transitively run `ARCH=<arch> ./tools/extract.sh` first
2. Run `ARCH=<arch> ./tools/build.sh` which: inlines `sources/*.js`, applies `patches.json` (strict by default), bun-compiles → `dist/<arch>/claude`

## Requires

- Walk-up must find a scaffolded project
- `bun` (>= 1.3 for stable cross-compile)
- `python3` (for patch + inline scripts)
- `tools/pipeline/patches.json` populated (NOT empty) — compile fails fast on empty patches

## Drift recovery

If compile reports MISSING patches (anchors not found in cli.js), Claude version likely shifted:
- Read `.aio-patch-setup` to see the tested-against Claude version
- Use `/aio-claude-toolkit:aio-patch-anchor find <fragment>` to locate new anchor
- Update `tools/pipeline/patches.json` `old` field with new anchor text
- Re-run compile

See `docs/drift-recovery.md`.

## Implementation

Invokes `${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-compile/scripts/compile.sh "$@"`.
