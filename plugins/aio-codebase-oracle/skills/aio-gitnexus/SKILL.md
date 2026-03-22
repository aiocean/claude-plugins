---
name: aio-gitnexus
description: Install, configure, and manage the GitNexus code intelligence engine — index codebase, setup MCP, check status, troubleshoot. Triggers: "setup gitnexus", "index codebase", "gitnexus status", "rebuild index", "setup code intelligence".
---

# GitNexus Manager

## Environment
- node: !`node --version 2>/dev/null || echo "NOT INSTALLED (requires >= 18)"`
- npx: !`which npx 2>/dev/null || echo "NOT INSTALLED"`
- gitnexus: !`npx gitnexus --version 2>/dev/null || echo "NOT INSTALLED (will be fetched via npx)"`
- .mcp.json: !`[ -f ".mcp.json" ] && echo "present" || echo "NOT FOUND"`

Manages the GitNexus zero-server code intelligence engine — install, setup MCP, run analysis, check status, and troubleshoot.

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
# Standard analysis (skips if git commit unchanged)
npx gitnexus analyze

# Force full re-index
npx gitnexus analyze --force

# With embeddings (slower, better semantic search)
npx gitnexus analyze --embeddings

# Skip embeddings (faster, BM25 search still works)
npx gitnexus analyze --skip-embeddings

# With generated skill files (Leiden clustering)
npx gitnexus analyze --skills

# Full analysis: embeddings + skills + verbose
npx gitnexus analyze --embeddings --skills --verbose

# Analyze a specific path
npx gitnexus analyze /path/to/repo
```

**Flags explained:**
- `--force`: Force full re-index, ignoring commit check
- `--embeddings`: Generate 384-dim vectors via snowflake-arctic-embed-xs (local, no API key). Enables semantic search in hybrid mode
- `--skip-embeddings`: Skip embedding generation. BM25 full-text search still works
- `--skills`: Generate repo-specific skill files via Leiden clustering to `.claude/skills/generated/`
- `--verbose`: Show skipped files during analysis

**Smart skip:** GitNexus checks `.gitnexus/meta.json` for the current git commit hash. If unchanged, it skips re-indexing. Use `--force` to override.

### Update Index (After Code Changes)

```bash
# Re-analyze (auto-detects changes via git commit hash)
npx gitnexus analyze

# Force full rebuild
npx gitnexus analyze --force
```

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

**When to use `--embeddings`:**
- First analysis of a new codebase (for full semantic search quality)
- When you need concept-level search ("find auth patterns", "error handling strategy")

**When to skip embeddings:**
- Quick re-index after small changes (BM25 still works)
- Large codebases where speed matters more than search quality

### Supported Languages

TypeScript, JavaScript, Python, Rust, Go, Java, C, C++, C#, Ruby, PHP, Swift, Kotlin (13 languages via tree-sitter).

## Integration with Codebase Oracle

After running GitNexus, use the doc-writer skill to write documentation:

1. `npx gitnexus analyze --embeddings` — builds knowledge graph
2. `/aio-codebase-oracle:doc-writer` — Oracle reads the graph and writes all docs

GitNexus provides the **knowledge graph** (structure, dependencies, clusters, flows, search). Oracle provides the **qualitative analysis** (design rationale, failure modes, decision guidance).

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npx gitnexus: command not found` | Ensure Node.js >= 18 is installed |
| Analysis seems stuck | Large codebases take time. GitNexus auto-allocates 8GB heap. Use `--verbose` to monitor progress |
| `gitnexus status` shows stale | Run `npx gitnexus analyze` to re-index |
| MCP tools not showing up | Re-run `npx gitnexus setup` or manually add MCP server |
| Embedding generation slow | Skip with `--skip-embeddings` for faster analysis. BM25 search still works |
| Want to start fresh | `npx gitnexus clean` then `npx gitnexus analyze --embeddings` |
| Index exists but queries empty | Git commit unchanged — use `--force` to rebuild |
| `.gitnexus/` in git | GitNexus auto-adds to `.gitignore`. If not, add it manually |
| Multiple repos, single MCP | GitNexus MCP server auto-routes to all indexed repos via `~/.gitnexus/registry.json` |
