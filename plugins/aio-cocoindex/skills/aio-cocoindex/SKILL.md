---
name: aio-cocoindex
description: This skill should be used when the user asks to "search knowledge", "find in docs", "query index", "semantic search", "update index", "rebuild index", "check index status", "cocoindex query", "cocoindex update", or wants to search/maintain an existing CocoIndex. Requires a `.cocoindex/` directory in the project (created by aio-cocoindex-setup skill).
---

# CocoIndex — Search & Maintain

Use an existing `.cocoindex/` setup to search documents and maintain the index.
Searches across all file types (code, docs, configs) in one unified query.

## Prerequisites

A `.cocoindex/` directory must exist in the project root (use `aio-cocoindex-setup` skill to create one).

Required files:
```
.cocoindex/
├── config.py           # Project name, excluded dirs, embedding config
├── index.py            # Auto-detects languages, creates tree-sitter flows
├── query.py            # Unified search across all languages
├── requirements.txt
└── .env                # DB connection + optional GEMINI_API_KEY
```

## Operations

### Check Status

```bash
.venv-cocoindex/bin/python .cocoindex/query.py --status
```

If venv doesn't exist:
```bash
python3 -m venv .venv-cocoindex
.venv-cocoindex/bin/pip install -r .cocoindex/requirements.txt
```

### Search

```bash
# Search everything (docs + code + configs unified)
.venv-cocoindex/bin/python .cocoindex/query.py "your question"

# More results
.venv-cocoindex/bin/python .cocoindex/query.py "your question" --top-k 10

# JSON output (for piping or programmatic use)
.venv-cocoindex/bin/python .cocoindex/query.py "your question" --json
```

Results include the language and filename, ranked by similarity across all file types.

### Update Index (After Files Change)

Incremental — only reprocesses changed files, then exits automatically:

```bash
.venv-cocoindex/bin/cocoindex -e .cocoindex/.env update .cocoindex/index.py -f
```

### Rebuild Index (Full Reprocess)

```bash
.venv-cocoindex/bin/cocoindex -e .cocoindex/.env update .cocoindex/index.py -f --full-reprocess
```

### List Flows

```bash
.venv-cocoindex/bin/cocoindex ls .cocoindex/index.py
```

## Tree-Sitter Code Chunking

Code files are split at **AST boundaries** (functions, classes, methods) instead of naive character splitting. This means search results return complete, meaningful code units.

Supported languages: python, typescript, javascript, go, rust, java, c, cpp, c_sharp, ruby, php, swift, kotlin, scala, sql, bash.

Doc/config files use appropriate chunking too (markdown headers, yaml blocks, etc.).

## Embedding Modes

Two embedding backends (configured in `.cocoindex/config.py`):

| Mode | `EMBEDDING_API_TYPE` | Model | Quality |
|------|---------------------|-------|---------|
| Local | `"local"` | `sentence-transformers/all-MiniLM-L6-v2` | Good (English) |
| Gemini | `"gemini"` | `gemini-embedding-2-preview` | Excellent (multilingual) |

Check current mode:
```bash
grep EMBEDDING_API_TYPE .cocoindex/config.py .cocoindex/.env
```

### Switching Embedding Mode

**WARNING:** Switching embedding model requires a full re-index (vectors are incompatible).

1. Update `.cocoindex/.env`:
   ```bash
   # For Gemini
   COCOINDEX_EMBEDDING_API_TYPE=gemini
   COCOINDEX_EMBEDDING_MODEL=gemini-embedding-2-preview
   GEMINI_API_KEY=<key>
   ```

2. Update `config.py` `EMBEDDING_API_TYPE` if hardcoded

3. Re-setup and re-index:
   ```bash
   .venv-cocoindex/bin/cocoindex -e .cocoindex/.env setup .cocoindex/index.py -f
   .venv-cocoindex/bin/cocoindex -e .cocoindex/.env update .cocoindex/index.py -f --full-reprocess
   ```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `.cocoindex/` not found | Run `aio-cocoindex-setup` skill first |
| Connection refused (Postgres) | PostgreSQL container not running — needed for CocoIndex metadata |
| Connection refused (Qdrant) | Qdrant container not running — check Docker (gRPC port 6334) |
| 0 chunks after update | Make sure to use `update` subcommand, not `server` |
| Slow first run (local) | Model download (~90MB) + bulk embedding — subsequent runs are incremental |
| Slow first run (Gemini) | API calls for all chunks — subsequent runs are incremental |
| venv missing | `python3 -m venv .venv-cocoindex && .venv-cocoindex/bin/pip install -r .cocoindex/requirements.txt` |
| `GEMINI_API_KEY` not set | Add to `.cocoindex/.env` — required for Gemini mode |
| Dimension mismatch error | Switched model without re-index — delete Qdrant collections, run `setup` then `update --full-reprocess` |
| No languages detected | Check `EXCLUDED_DIRS` in config.py isn't excluding your source directories |

## Excluding Directories

Edit `EXCLUDED_DIRS` in `.cocoindex/config.py` to skip directories you don't want indexed. The index always scans from `PROJECT_ROOT` and uses `EXCLUDED_DIRS` to filter.

## Direct Qdrant Access

Read `config.py` to find the Qdrant URL and project name. Collections are named `{project}_{language}`:

```bash
# List collections via REST API
curl http://localhost:6333/collections

# Get collection info
curl http://localhost:6333/collections/{project}_{language}

# Or use Qdrant Web UI at http://localhost:6333/dashboard
```
