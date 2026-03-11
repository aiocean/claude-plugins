---
name: aio-codebase-index
description: Manage the CodeIndex static analysis tool — install, update, run, and check status. Use when user says "install codeindex", "setup codeindex", "update codeindex", "check codeindex", "codeindex status", "run codeindex", "index codebase", "generate codebase index", "static analysis", or mentions "codeindex".
---

# CodeIndex Manager

Manages the bundled CodeIndex static analysis tool — install, update, run, and troubleshoot.

**IMPORTANT:** CodeIndex MUST be installed into a project-local `.codeindex/` virtual environment. Never use a globally installed codeindex. This prevents version conflicts between projects and ensures each project uses the correct codeindex version.

## Path Resolution

```bash
PLUGIN_DIR="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-codebase-oracle/*/codeindex 2>/dev/null | sort -V | tail -1)"
```

If `$PLUGIN_DIR` is empty, CodeIndex is not available. The plugin may not be installed correctly.

## Commands

### Install CodeIndex

```bash
# Resolve the plugin path
PLUGIN_DIR="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-codebase-oracle/*/codeindex 2>/dev/null | sort -V | tail -1)"

# Create project-local venv
python3 -m venv .codeindex

# Install into project-local venv
.codeindex/bin/pip install -e "$(dirname "$PLUGIN_DIR")"

# Verify installation
.codeindex/bin/codeindex --version
```

**If pip install fails with dependency errors:**
```bash
# Try with uv (faster, better dependency resolution)
uv venv .codeindex
uv pip install -e "$(dirname "$PLUGIN_DIR")" --python .codeindex/bin/python
```

**Requirements:** Python >= 3.12

### Check Status

```bash
# Check if project-local codeindex exists
.codeindex/bin/codeindex --version 2>/dev/null && echo "installed" || echo "not installed"

# Check installation details
.codeindex/bin/pip show codeindex 2>/dev/null
```

### Run Static Analysis

Always use the project-local binary:

```bash
# Run analysis
.codeindex/bin/codeindex generate --verbose

# Custom output directory
.codeindex/bin/codeindex generate --verbose -o docs/
```

**Output produced:**
- `docs/codebase_map.json` — components, edges, metrics, communities, hubs
- `docs/dependency_graphs/*.json` — per-module dependency data
- `docs/templates/*.tpl` — doc structure templates

### Update CodeIndex

When the plugin is updated, reinstall into the project-local venv:

```bash
PLUGIN_DIR="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-codebase-oracle/*/codeindex 2>/dev/null | sort -V | tail -1)"
.codeindex/bin/pip install -e "$(dirname "$PLUGIN_DIR")" --force-reinstall --no-deps
.codeindex/bin/codeindex --version
```

### Uninstall

```bash
rm -rf .codeindex
```

## Troubleshooting

### `codeindex: command not found` or wrong version

Do NOT install globally. Create the project-local venv:
```bash
python3 -m venv .codeindex
PLUGIN_DIR="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-codebase-oracle/*/codeindex 2>/dev/null | sort -V | tail -1)"
.codeindex/bin/pip install -e "$(dirname "$PLUGIN_DIR")"
```

### `ModuleNotFoundError: No module named 'codeindex'`

The venv may be corrupted or missing. Recreate it:
```bash
rm -rf .codeindex
python3 -m venv .codeindex
PLUGIN_DIR="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-codebase-oracle/*/codeindex 2>/dev/null | sort -V | tail -1)"
.codeindex/bin/pip install -e "$(dirname "$PLUGIN_DIR")"
```

### `tree-sitter` build errors

Some tree-sitter grammars need compilation. Try:
```bash
.codeindex/bin/pip install --upgrade tree-sitter tree-sitter-language-pack
```

### Slow analysis on large codebases

Use file filters:
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
