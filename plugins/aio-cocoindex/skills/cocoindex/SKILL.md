---
name: cocoindex
description: This skill should be used when the user asks to "search knowledge", "find in docs", "query index", "semantic search", "update index", "rebuild index", "check index status", "cocoindex query", "cocoindex update", or wants to search/maintain an existing CocoIndex. Requires a `.cocoindex/` directory in the project (created by cocoindex-setup skill).
---

# CocoIndex — Search & Maintain

Use an existing `.cocoindex/` setup to search documents and maintain the index.

## Prerequisites

A `.cocoindex/` directory must exist in the project root (use `cocoindex-setup` skill to create one).

Required files:
```
.cocoindex/
├── config.py           # Project-specific collections
├── index.py            # CocoIndex flows
├── query.py            # Search interface
├── requirements.txt
└── .env
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

Incremental — only reprocesses changed files:

```bash
.venv-cocoindex/bin/cocoindex server .cocoindex/index.py -f -L
```

Wait for progress bars to finish, then Ctrl+C. Or run in background.

### Rebuild Index (Full Reprocess)

```bash
.venv-cocoindex/bin/cocoindex -e .cocoindex/.env server .cocoindex/index.py -f -L --full-reprocess
```

### List Flows

```bash
.venv-cocoindex/bin/cocoindex ls .cocoindex/index.py
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `.cocoindex/` not found | Run `cocoindex-setup` skill first |
| Connection refused | PostgreSQL container not running — check Docker |
| 0 chunks after update | Server needs `-L` flag to trigger processing |
| Slow first run | Model download (~90MB) + bulk embedding — subsequent runs are incremental |
| venv missing | `python3 -m venv .venv-cocoindex && .venv-cocoindex/bin/pip install -r .cocoindex/requirements.txt` |

## Adding New Collections

Edit `.cocoindex/config.py` to add new collections:

```python
COLLECTIONS = {
    "existing": { ... },
    "new_collection": {
        "dirs": ["new-directory/"],
        "patterns": ["**/*.md"],
        "chunk_size": 1500,
        "chunk_overlap": 300,
        "language": "markdown",
    },
}
```

Then re-run setup and index:
```bash
.venv-cocoindex/bin/cocoindex setup .cocoindex/index.py -f
.venv-cocoindex/bin/cocoindex server .cocoindex/index.py -f -L
```

## Direct Database Access

Read `config.py` to find the database URL and table naming convention (`{PROJECT_NAME}_{collection_name}`):

```bash
# Connect
docker exec -it cocoindex-postgres psql -U cocoindex

# Row counts
SELECT tablename, (SELECT count(*) FROM <tablename>) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '%tracking%' AND tablename != 'cocoindex_setup_metadata';
```
