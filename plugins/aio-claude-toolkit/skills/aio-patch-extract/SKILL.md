---
name: aio-patch-extract
description: |
  Extract Claude Code's cli.js + native .node modules from an installed claude binary (or a binary you pass as positional arg). Output lands in dist/<arch>/. Required before aio-patch-compile. Default arch detected from host; ARCH env var overrides for cross-arch extraction.
when_to_use: aio patch extract, extract claude binary, extract cli.js, carve cli.js, get cli.js, download claude source, extract native modules
argument-hint: "[<binary-path>] (positional, pass-through to tools/extract.sh)"
effort: medium
---

# aio-patch-extract — extract cli.js + native modules from a claude binary

## Goal

Materialize `dist/<arch>/cli.js` + `dist/<arch>/native/*.node` from an installed claude binary so subsequent `aio-patch-compile` can apply patches and recompile.

## Usage

```
/aio-claude-toolkit:aio-patch-extract                          # download latest claude from npm for HOST arch
/aio-claude-toolkit:aio-patch-extract /path/to/claude          # extract from a local binary (positional arg)
ARCH=linux-arm64 /aio-claude-toolkit:aio-patch-extract         # cross-arch (downloads target-arch npm pkg)
CLAUDE_VERSION=2.1.150 /aio-claude-toolkit:aio-patch-extract   # pin a specific upstream version
```

Argument and env precedence (`tools/extract.sh`):
- Positional arg 1: path to a claude binary you already have
- Otherwise: `claude-src/claude` at project root if present
- Otherwise: download `@anthropic-ai/claude-code-<arch>` from npm (CLAUDE_VERSION env pins, default: latest)
- `ARCH` env: override host-detected platform (cross-arch). Supported: `darwin-arm64`, `darwin-amd64`, `linux-arm64`, `linux-amd64`.

## Requires

- Walk-up must find a scaffolded project (`tools/pipeline/patch_cli.py` exists above CWD)
- `python3` (for `extract_cli.py` + `extract_native_modules.py`)
- `npm` (only if downloading a fresh claude — passing a positional binary path skips this)

## Implementation

The skill body invokes `${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-extract/scripts/extract.sh "$@"`.

It:
1. Walks up from CWD to find the project root
2. `cd` to project root
3. Exec `./tools/extract.sh "$@"` (pass-through args, honors `ARCH` env)

`tools/extract.sh` handles binary resolution, npm download fallback, arch detection (or `ARCH` override after sync patch), and pipeline invocation.
