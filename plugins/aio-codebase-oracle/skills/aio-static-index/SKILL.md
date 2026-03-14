---
name: aio-static-index
description: Manage the CodeIndex static analysis tool — install, update, run, and check status. Use when user says "install codeindex", "setup codeindex", "update codeindex", "check codeindex", "codeindex status", "run codeindex", "index codebase", "generate codebase index", "static analysis", or mentions "codeindex".
---

# CodeIndex Manager

Manages the bundled CodeIndex static analysis tool — install, update, run, and troubleshoot.

**IMPORTANT:** CodeIndex MUST be installed into a project-local `.codeindex/` virtual environment. Never use a globally installed codeindex. This prevents version conflicts between projects and ensures each project uses the correct codeindex version.

## Source Location

The CodeIndex Python package is bundled in this plugin at:

- `codeindex/` — the Python package (relative to plugin root)
- `pyproject.toml` — package metadata and dependencies (relative to plugin root)

When installing, **copy** these into the target project. Do NOT use `pip install -e` (editable/link mode) — the project must have its own independent copy so plugin updates don't affect existing installs.

## Commands

### Install CodeIndex

1. Copy `codeindex/` and `pyproject.toml` from the plugin root into the target project as `.codeindex-src/`
2. Create a Python venv and install from the local copy:

```bash
python3 -m venv .codeindex
.codeindex/bin/pip install .codeindex-src
.codeindex/bin/codeindex --version
```

**If pip install fails with dependency errors:**
```bash
uv venv .codeindex
uv pip install .codeindex-src --python .codeindex/bin/python
```

**Requirements:** Python >= 3.12

### Check Status

```bash
.codeindex/bin/codeindex --version 2>/dev/null && echo "installed" || echo "not installed"
.codeindex/bin/pip show codeindex 2>/dev/null
```

### Run Static Analysis

Always use the project-local binary:

```bash
.codeindex/bin/codeindex generate --verbose
.codeindex/bin/codeindex generate --verbose -o docs/
```

**Output produced:**
- `docs/codebase_map.json` — components, edges, metrics, communities, hubs
- `docs/dependency_graphs/*.json` — per-module dependency data
- `docs/templates/*.tpl` — doc structure templates

### Update CodeIndex

Re-copy source from the plugin root and reinstall:

1. Remove old `.codeindex-src/`, copy fresh `codeindex/` and `pyproject.toml` from plugin root
2. Reinstall:

```bash
.codeindex/bin/pip install .codeindex-src --force-reinstall --no-deps
.codeindex/bin/codeindex --version
```

### Uninstall

```bash
rm -rf .codeindex .codeindex-src
```

## Troubleshooting

### `codeindex: command not found` or wrong version

Do NOT install globally. Re-copy from plugin root and create the project-local venv:
```bash
python3 -m venv .codeindex
.codeindex/bin/pip install .codeindex-src
```

### `ModuleNotFoundError: No module named 'codeindex'`

The venv may be corrupted. Recreate it:
```bash
rm -rf .codeindex
python3 -m venv .codeindex
.codeindex/bin/pip install .codeindex-src
```

### `tree-sitter` build errors

```bash
.codeindex/bin/pip install --upgrade tree-sitter tree-sitter-language-pack
```

### Slow analysis on large codebases

```bash
.codeindex/bin/codeindex generate --verbose --exclude "**/node_modules/**,**/vendor/**,**/.git/**"
```

### Output directory issues

CodeIndex defaults to `docs/` in the current directory. Specify explicitly:
```bash
.codeindex/bin/codeindex generate --verbose -o ./docs
```

## Integration with Codebase Oracle

After running CodeIndex, use the Codebase Oracle skill to write documentation:

1. `.codeindex/bin/codeindex generate --verbose` — produces static analysis data
2. `/aio-codebase-oracle` — Oracle reads the data and writes all docs

CodeIndex provides the **quantitative foundation** (metrics, dependencies, communities). Oracle provides the **qualitative analysis** (design rationale, failure modes, decision guidance).
