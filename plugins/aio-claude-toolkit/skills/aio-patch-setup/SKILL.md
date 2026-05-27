---
name: aio-patch-setup
description: |
  Scaffold a new Claude-binary-patching project at CWD (or [target_dir]). Copies generic pipeline tools (extract/build/run, Python pipeline scripts, cli-nav AST navigator) + generic docs/guides into the target. Patches.json starts EMPTY — user fills it in; a reference example from the dirty-claude project is shipped beside it.
when_to_use: aio patch setup, scaffold patching project, init claude patch project, setup dirty-claude, new claude patching project, copy patch pipeline, scaffold tools/pipeline
argument-hint: "[target_dir] (default CWD); FORCE=1 to overwrite an existing scaffold"
effort: medium
---

# aio-patch-setup — scaffold a new Claude-binary-patching project

## Goal

Drop a complete, runnable patching pipeline into the target directory so the user can immediately:
1. Edit `tools/pipeline/patches.json` (start from empty schema or copy from `patches.json.example`)
2. Run `/aio-claude-toolkit:aio-patch-extract` to extract cli.js + natives from their installed claude
3. Run `/aio-claude-toolkit:aio-patch-compile` to apply patches + recompile a custom claude binary
4. Run `/aio-claude-toolkit:aio-patch-run` to exec the patched binary

## What gets copied

| Path | Source | User-owned? |
|------|--------|-------------|
| `tools/extract.sh` | templates/tools/extract.sh (synced from dirty-claude + ARCH patch) | No — generic |
| `tools/build.sh` | templates/tools/build.sh | No — generic |
| `tools/run.sh` | templates/tools/run.sh | No — generic |
| `tools/pipeline/*.py` | dirty-claude pipeline (extract_cli, patch_cli, resolve_symbols, inline_sources, extract_native_modules) | No — generic |
| `tools/pipeline/patches.json` | **EMPTY schema template** | **YES — user content** |
| `tools/pipeline/patches.json.example` | dirty-claude pinned reference | No — reference |
| `tools/pipeline/sources/*.example` | dirty-claude reference patch body | No — reference |
| `tools/cli-nav/*.cjs` | AST navigator (acorn-based) | No — generic |
| `docs/*.md` | curated generic guides (anchor strategy, drift recovery, etc.) | No — generic |
| `.gitignore` | sensible defaults (dist/, *.backup, __pycache__/) | No — generic |
| `CLAUDE.md.example` | template for your project's CLAUDE.md | No — template |
| `README.md.example` | template for your project's README | No — template |
| `.aio-patch-setup` (hidden) | sync metadata (VERSION) | No — generated |

**NOT copied** (opt-in via sibling skill): `control/` — call `/aio-claude-toolkit:aio-patch-control scaffold` to install the reference HTTP control-channel sample.

## Usage

```
/aio-claude-toolkit:aio-patch-setup [target_dir]
```

- `target_dir` defaults to CWD.
- `FORCE=1` env var: overwrite generic scripts in an existing scaffold. **Does NOT overwrite** `tools/pipeline/patches.json` or `tools/pipeline/sources/*.js` (your patch content).

## Next steps printed at end

After scaffold, prints:
1. Edit `tools/pipeline/patches.json` (start from `patches.json.example` if you want the dirty-claude HTTP control-channel patch body).
2. `/aio-claude-toolkit:aio-patch-extract` to extract cli.js.
3. `/aio-claude-toolkit:aio-patch-compile` to apply + build.
4. `/aio-claude-toolkit:aio-patch-run` to exec.

## Implementation

The skill body invokes `${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-setup/scripts/setup.sh "$@"`.

When invoked:
1. Resolves `TARGET = $1 ?? $PWD`
2. Guard: if `$TARGET/tools/pipeline/` exists and `FORCE` is unset → exit 1 with hint
3. `cp -r templates/tools` + `cp -r templates/docs` + copy ancillary files into `$TARGET/`
4. Copy `templates/VERSION` → `$TARGET/.aio-patch-setup` (hidden — sync metadata for drift recovery)
5. Run `check-deps.sh` (warn-only)
6. Print "Next steps" hint
