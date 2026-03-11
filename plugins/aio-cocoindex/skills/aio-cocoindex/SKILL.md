---
name: aio-cocoindex
description: This skill should be used when the user asks to "search knowledge", "find in docs", "query index", "semantic search", "update index", "rebuild index", "check index status", "cocoindex query", "cocoindex update", or wants to search/maintain an existing CocoIndex. Requires a `.cocoindex/` directory in the project (created by aio-cocoindex-setup skill).
---

# CocoIndex — Search & Maintain

Use an existing `.cocoindex/` setup to search documents and maintain the index.

## Prerequisites

A `.cocoindex/` directory must exist in the project root (use `aio-cocoindex-setup` skill to create one).

Required files:
```
.cocoindex/
├── config.py           # Project-specific collections & embedding config
├── index.py            # CocoIndex flows
├── query.py            # Search interface
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
# Search all collections
.venv-cocoindex/bin/python .cocoindex/query.py "your question"

# Filter by collection
.venv-cocoindex/bin/python .cocoindex/query.py "your question" --collection docs

# More results
.venv-cocoindex/bin/python .cocoindex/query.py "your question" --top-k 10

# JSON output (for piping or programmatic use)
.venv-cocoindex/bin/python .cocoindex/query.py "your question" --json
```

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

## Embedding Modes

The setup supports two embedding backends (configured in `.cocoindex/config.py`):

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
| Connection refused | PostgreSQL container not running — check Docker |
| 0 chunks after update | Make sure to use `update` subcommand, not `server` |
| Slow first run (local) | Model download (~90MB) + bulk embedding — subsequent runs are incremental |
| Slow first run (Gemini) | API calls for all chunks — subsequent runs are incremental |
| venv missing | `python3 -m venv .venv-cocoindex && .venv-cocoindex/bin/pip install -r .cocoindex/requirements.txt` |
| `GEMINI_API_KEY` not set | Add to `.cocoindex/.env` — required for Gemini mode |
| Dimension mismatch error | Switched model without re-index — run `setup` then `update --full-reprocess` |

## Code Search (Tree-Sitter)

Code collections use **tree-sitter aware chunking** — splits at AST boundaries (functions, classes, methods) instead of naive character splitting. This means search results return complete, meaningful code units.

```bash
# Search code collections
.venv-cocoindex/bin/python .cocoindex/query.py "authentication middleware" --collection code_typescript

# Search across all collections (docs + code)
.venv-cocoindex/bin/python .cocoindex/query.py "how does user login work"
```

Supported tree-sitter languages: python, typescript, javascript, go, rust, java, c, cpp, c_sharp, ruby, php, swift, kotlin, scala, sql, bash.

## Adding New Collections

Edit `.cocoindex/config.py` to add new collections:

```python
COLLECTIONS = {
    "existing": { ... },
    # Add documentation collection
    "new_collection": {
        "dirs": ["new-directory/"],
        "patterns": ["**/*.md"],
        "chunk_size": 1500,
        "chunk_overlap": 300,
        "language": "markdown",
    },
    # Add code collections with tree-sitter chunking
    **generate_code_collections(
        ["src/", "lib/"],
        languages=["typescript", "python"],
    ),
}
```

Then re-run setup and index:
```bash
.venv-cocoindex/bin/cocoindex -e .cocoindex/.env setup .cocoindex/index.py -f
.venv-cocoindex/bin/cocoindex -e .cocoindex/.env update .cocoindex/index.py -f
```

## Direct Database Access

Read `config.py` to find the database URL and table naming convention (`{PROJECT_NAME}_{collection_name}`):

```bash
# Connect
docker exec -it cocoindex-postgres psql -U cocoindex

# Row counts
SELECT tablename, (SELECT count(*) FROM <tablename>) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '%tracking%' AND tablename != 'cocoindex_setup_metadata';
```
