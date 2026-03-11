---
name: aio-codebase-index
description: Manage the CodeIndex static analysis tool — install, update, run, and check status. Use when user says "install codeindex", "setup codeindex", "update codeindex", "check codeindex", "codeindex status", "run codeindex", "index codebase", "generate codebase index", "static analysis", or mentions "codeindex".
---

# CodeIndex Manager

Manages the bundled CodeIndex static analysis tool — install, update, run, and troubleshoot.

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

# Install in editable mode (development) — changes to plugin auto-apply
pip install -e "$(dirname "$PLUGIN_DIR")"

# Verify installation
codeindex --version
```

**If pip install fails with dependency errors:**
```bash
# Try with uv (faster, better dependency resolution)
uv pip install -e "$(dirname "$PLUGIN_DIR")"

# Or install in a venv
python3 -m venv ~/.codeindex-venv
~/.codeindex-venv/bin/pip install -e "$(dirname "$PLUGIN_DIR")"
# Then use: ~/.codeindex-venv/bin/codeindex generate --verbose
```

**Requirements:** Python >= 3.12

### Check Status

```bash
# Check if codeindex is installed and which version
codeindex --version 2>/dev/null && echo "installed" || echo "not installed"

# Check if it's the bundled version
which codeindex
pip show codeindex 2>/dev/null
```

### Run Static Analysis

```bash
# Run analysis
codeindex generate --verbose

# Custom output directory
codeindex generate --verbose -o docs/
```

**Output produced:**
- `docs/codebase_map.json` — components, edges, metrics, communities, hubs
- `docs/dependency_graphs/*.json` — per-module dependency data
- `docs/templates/*.tpl` — doc structure templates

### Update CodeIndex

When the plugin is updated, CodeIndex is updated automatically. To force reinstall:

```bash
PLUGIN_DIR="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-codebase-oracle/*/codeindex 2>/dev/null | sort -V | tail -1)"
pip install -e "$(dirname "$PLUGIN_DIR")" --force-reinstall --no-deps
codeindex --version
```

### Uninstall

```bash
pip uninstall codeindex -y
```

## Troubleshooting

### `codeindex: command not found`

CodeIndex is not installed. Run the install command above.

### `ModuleNotFoundError: No module named 'codeindex'`

The package is not in the Python path. Check:
```bash
python3 -c "import codeindex; print(codeindex.__file__)"
```

If this fails, reinstall with `pip install -e`.

### `tree-sitter` build errors

Some tree-sitter grammars need compilation. Try:
```bash
pip install --upgrade tree-sitter tree-sitter-language-pack
```

### Slow analysis on large codebases

Use file filters:
```bash
codeindex generate --verbose --exclude "**/node_modules/**,**/vendor/**,**/.git/**"
```

### Output directory issues

CodeIndex defaults to `docs/` in the current directory. Specify explicitly:
```bash
codeindex generate --verbose -o ./docs
```

## Integration with Codebase Oracle

After running CodeIndex, use the Codebase Oracle skill to write documentation:

1. `codeindex generate --verbose` — produces static analysis data
2. `/aio-codebase-oracle` — Oracle reads the data and writes all docs

CodeIndex provides the **quantitative foundation** (metrics, dependencies, communities). Oracle provides the **qualitative analysis** (design rationale, failure modes, decision guidance).
