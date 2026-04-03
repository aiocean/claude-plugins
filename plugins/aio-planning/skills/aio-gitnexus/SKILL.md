---
name: aio-gitnexus
description: Install, configure, and manage the GitNexus code intelligence engine — index codebase, setup MCP, check status, troubleshoot, and document local git-hook auto-refresh for master-only workflows. Triggers: "setup gitnexus", "index codebase", "gitnexus status", "rebuild index", "setup code intelligence".
when_to_use: Use when setting up GitNexus, indexing a codebase, checking GitNexus status, rebuilding a stale index, troubleshooting GitNexus, or documenting how to keep a GitNexus index fresh with local git hooks on the master branch.
effort: medium
---

# GitNexus Manager

## Environment
- node: !`node --version 2>/dev/null || echo "NOT INSTALLED (requires >= 18)"`
- npx: !`which npx 2>/dev/null || echo "NOT INSTALLED"`
- gitnexus: !`npx gitnexus --version 2>/dev/null || echo "NOT INSTALLED (will be fetched via npx)"`
- .mcp.json: !`[ -f ".mcp.json" ] && echo "present" || echo "NOT FOUND"`

Manages the GitNexus zero-server code intelligence engine — install, setup MCP, run analysis, check status, troubleshoot, and document local git-hook refresh workflows.

GitNexus turns any codebase into a knowledge graph (nodes, edges, clusters, flows) with hybrid search (BM25 + semantic). Zero infrastructure — no databases, no Docker, no API keys required.

## Commands

### Check Status

```bash
# Check if GitNexus is installed
npx gitnexus --version 2>/dev/null && echo "installed" || echo "not installed"

# Check index status for current repo
npx gitnexus status

# List all indexed repos
npx gitnexus list
```

### Install GitNexus

```bash
# Option 1: Use via npx (no install needed — recommended)
npx gitnexus analyze

# Option 2: Install globally
npm install -g gitnexus

# Verify
gitnexus --version
```

**Requirements:** Node.js >= 18

### Setup MCP Server (Claude Code)

Run the automated setup which auto-detects editors:

```bash
npx gitnexus setup
```

Or manually add to Claude Code:

```bash
claude mcp add gitnexus -- npx -y gitnexus@latest mcp
```

This exposes 7 MCP tools:

| Tool | Purpose |
|------|---------|
| `list_repos` | Discover all indexed repos |
| `query` | Hybrid search (BM25 + semantic + RRF) |
| `context` | 360-degree symbol view with categorized references |
| `impact` | Blast radius analysis with depth grouping |
| `detect_changes` | Git-diff impact mapping |
| `rename` | Multi-file coordinated rename |
| `cypher` | Raw Cypher graph queries |

MCP Resources available via `gitnexus://` URI scheme:

| Resource | Description |
|----------|-------------|
| `gitnexus://repos` | All indexed repos |
| `gitnexus://repo/{name}/context` | Codebase stats, staleness |
| `gitnexus://repo/{name}/clusters` | Functional clusters with cohesion |
| `gitnexus://repo/{name}/processes` | Execution flows |
| `gitnexus://repo/{name}/schema` | Graph schema for Cypher queries |

### Analyze Codebase

```bash
# Standard analysis with embeddings (skips if git commit unchanged)
npx gitnexus analyze --embeddings

# Force full re-index with embeddings
npx gitnexus analyze --embeddings --force

# With generated skill files (Leiden clustering)
npx gitnexus analyze --embeddings --skills

# Full analysis: embeddings + skills + verbose
npx gitnexus analyze --embeddings --skills --verbose

# Analyze a specific path
npx gitnexus analyze --embeddings /path/to/repo
```

**IMPORTANT:** Always use `--embeddings`. Semantic search is essential for meaningful results — BM25-only mode misses concept-level matches.

**Flags explained:**
- `--embeddings`: **(always use)** Generate 384-dim vectors via snowflake-arctic-embed-xs (local, no API key). Enables semantic search in hybrid mode
- `--force`: Force full re-index, ignoring commit check
- `--skills`: Generate repo-specific skill files via Leiden clustering to `.claude/skills/generated/`
- `--verbose`: Show skipped files during analysis

**Smart skip:** GitNexus checks `.gitnexus/meta.json` for the current git commit hash. If unchanged, it skips re-indexing. Use `--force` to override.

### Update Index (After Code Changes)

```bash
# Re-analyze with embeddings (auto-detects changes via git commit hash)
npx gitnexus analyze --embeddings

# Force full rebuild with embeddings
npx gitnexus analyze --embeddings --force
```

### Keep the Index Fresh with Local Git Hooks

Use this only when the user explicitly wants automatic GitNexus refresh tied to git operations.

#### Rules
- Use **git hooks only** for this workflow.
- Do **not** use Claude `PostToolUse` hooks for this auto-refresh workflow.
- Restrict automatic refresh to the `master` branch only.
- Run refresh asynchronously so git operations stay responsive.
- Use a lock directory and a log file so concurrent triggers do not pile up silently.

#### Recommended hooks
- `post-commit`
- `post-merge`
- `post-checkout`

#### Recommended behavior
1. Resolve `repo_root` with `git rev-parse --show-toplevel`
2. Resolve current branch with `git rev-parse --abbrev-ref HEAD`
3. Skip unless branch is exactly `master`
4. Start `npx gitnexus analyze --embeddings` in background
5. Use a lockdir such as `.git/gitnexus-refresh.lock`
6. Append output to a log such as `.git/gitnexus-hooks.log`

#### Example pattern
```bash
repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ "$branch" = "master" ] && [ -n "$repo_root" ] && command -v npx >/dev/null 2>&1; then
    nohup sh -c '
        cd "$1" || exit 1
        lockdir=".git/gitnexus-refresh.lock"
        if mkdir "$lockdir" 2>/dev/null; then
            trap "rmdir \"$lockdir\"" EXIT
            npx gitnexus analyze --embeddings >> .git/gitnexus-hooks.log 2>&1
        fi
    ' sh "$repo_root" >/dev/null 2>&1 &
fi
```

#### Verification
- On a non-`master` branch, triggering the hook should **not** create `.git/gitnexus-hooks.log`
- On `master`, the hook should create or append to the log
- Hook files must be executable (`chmod +x`)

#### Gotchas
- This workflow is **master-only**
- Git hooks are local to `.git/hooks/` and are not shared by commit unless separately distributed

### Clean / Delete Index

```bash
# Delete index for current repo
npx gitnexus clean

# Delete ALL indexes
npx gitnexus clean --all --force
```

### Generate Wiki Docs

```bash
# Generate LLM-powered docs from the knowledge graph
npx gitnexus wiki

# With custom model
npx gitnexus wiki --model gpt-4o-mini

# With local LLM (e.g., Ollama)
npx gitnexus wiki --base-url http://localhost:11434/v1
```

## What GitNexus Produces

### 6-Phase Pipeline

1. **Structure** — File tree and folder relationships
2. **Parsing** — Tree-sitter AST: functions, classes, methods, interfaces (13 languages)
3. **Resolution** — Cross-file import/call resolution with language-aware logic
4. **Clustering** — Leiden algorithm community detection with cohesion scoring
5. **Flow Tracing** — Execution paths from entry points
6. **Indexing** — Hybrid search (BM25 + semantic HNSW + RRF fusion)

### Output Files

```
.gitnexus/                  # Per-repo index (auto-added to .gitignore)
├── kuzu/                   # KuzuDB property graph database
└── meta.json               # Commit hash, timestamp, node/edge counts

~/.gitnexus/
└── registry.json           # Maps repo names to index paths

# Generated context files (in repo root):
AGENTS.md                   # Agent context file
CLAUDE.md                   # Claude-specific context

# With --skills flag:
.claude/skills/generated/   # One SKILL.md per functional area
```

### Embedding Details

- **Model**: snowflake-arctic-embed-xs (384-dimensional vectors)
- **Runtime**: ONNX via @huggingface/transformers (local, no API key)
- **GPU support**: CUDA/Metal acceleration when available
- **Storage**: Stored in KuzuDB with HNSW index for approximate nearest-neighbor search

Embeddings are entirely local. No cloud service, no API key needed.

**Always use `--embeddings`** — semantic search is the primary value of GitNexus. Without embeddings, you lose concept-level search ("find auth patterns", "error handling strategy") and hybrid ranking quality degrades significantly.

### Supported Languages

TypeScript, JavaScript, Python, Rust, Go, Java, C, C++, C#, Ruby, PHP, Swift, Kotlin (13 languages via tree-sitter).

## Integration with Codebase Oracle

After running `npx gitnexus analyze --embeddings`, use the doc-writer skill to write documentation:

1. `npx gitnexus analyze --embeddings` — builds knowledge graph (always with embeddings)
2. `/aio-codebase-oracle:doc-writer` — Oracle reads the graph and writes all docs

GitNexus provides the **knowledge graph** (structure, dependencies, clusters, flows, search). Oracle provides the **qualitative analysis** (design rationale, failure modes, decision guidance).

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npx gitnexus: command not found` | Ensure Node.js >= 18 is installed |
| Analysis seems stuck | Large codebases take time. GitNexus auto-allocates 8GB heap. Use `--verbose` to monitor progress |
| `gitnexus status` shows stale | Run `npx gitnexus analyze` to re-index |
| MCP tools not showing up | Re-run `npx gitnexus setup` or manually add MCP server |
| Embedding generation slow | Normal for first run; subsequent runs are faster. Do not skip embeddings |
| Want to start fresh | `npx gitnexus clean` then `npx gitnexus analyze --embeddings` |
| Index exists but queries empty | Git commit unchanged — use `--force` to rebuild |
| `.gitnexus/` in git | GitNexus auto-adds to `.gitignore`. If not, add it manually |
| Multiple repos, single MCP | GitNexus MCP server auto-routes to all indexed repos via `~/.gitnexus/registry.json` |
| Auto-refresh not running | Confirm you are on `master`, hooks are executable, and check `.git/gitnexus-hooks.log` |
