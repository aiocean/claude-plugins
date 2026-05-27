---
name: aio-patch-run
description: |
  Exec the compiled patched Claude binary at dist/<arch>/claude. Pass-through args + env. Requires aio-patch-compile to have been run first (sentinel: dist/<host-arch>/claude exists).
when_to_use: aio patch run, run patched claude, exec built claude, run dist claude, test patched binary, run compiled claude
argument-hint: "[args...] (pass-through to dist/<arch>/claude)"
effort: low
---

# aio-patch-run — exec the compiled patched claude binary

## Goal

One-line invocation of the binary built by `aio-patch-compile`. Same args/env passthrough as `claude` itself.

## Usage

```
/aio-claude-toolkit:aio-patch-run --version
/aio-claude-toolkit:aio-patch-run -p "Explain X"
/aio-claude-toolkit:aio-patch-run [any-claude-args]
```

## Requires

- Walk-up must find a scaffolded project (`tools/pipeline/patch_cli.py` exists above CWD)
- `dist/<host-arch>/claude` must exist (produced by `aio-patch-compile`)

## Implementation

Invokes `${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-run/scripts/run.sh "$@"`.

It:
1. Walks up from CWD to find the project root
2. `cd` to project root
3. Exec `./tools/run.sh "$@"` (pass-through args, host-arch auto-detected)

`tools/run.sh` (scaffolded by aio-patch-setup) picks the right `dist/<host-arch>/claude` and exec's it with all arguments and environment passed through.
