---
name: aio-cocoindex-setup
description: This skill should be used when the user asks to "setup cocoindex", "create index for this project", "add semantic search", "index this codebase", "setup markdown indexing", "cocoindex init", or wants to set up CocoIndex-based document indexing for a project. Scaffolds a `.cocoindex/` directory with project-specific indexing code using boilerplate files.
---

# CocoIndex Setup

Scaffold a `.cocoindex/` directory for any project with semantic search capabilities.

## How It Works

1. **Copy boilerplate files** from this skill's `boilerplate/` directory
2. **Customize only `config.py`** for the target project
3. **Never edit `index.py` or `query.py`** — they are fixed interfaces

## Workflow

### Step 1: Resolve Boilerplate Path

```bash
BP="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-cocoindex/*/skills/aio-cocoindex-setup/boilerplate 2>/dev/null | sort -V | tail -1)"
ls $BP  # Should show: config.py  index.py  query.py  requirements.txt
```

### Step 2: Analyze Project

Before copying, understand the project:

```bash
# What files exist?
find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | sed 's|.*\.||' | sort | uniq -c | sort -rn | head -15

# What directories have content?
ls -d */ 2>/dev/null
```

Determine:
- **PROJECT_NAME**: Lowercase, no hyphens (e.g., `compass`, `trueprofitfns`, `webapp`)
- **COLLECTIONS**: Group files by purpose — docs, code, configs, etc.

### Step 3: Copy Boilerplate

```bash
mkdir -p .cocoindex
cp $BP/index.py $BP/query.py $BP/requirements.txt .cocoindex/
```

**Do NOT copy `config.py`** — write it fresh based on the project analysis.

### Step 4: Write `config.py`

Read the boilerplate `config.py` for the full template with comments:
```bash
cat $BP/config.py
```

Then write a customized version to `.cocoindex/config.py` with:
- Correct `PROJECT_NAME`
- Correct `DATABASE_URL` (ask user for their PostgreSQL host)
- Project-specific `COLLECTIONS`

**Chunking guidelines:**
| Content Type | chunk_size | chunk_overlap | language |
|-------------|-----------|--------------|----------|
| Markdown docs | 1500 | 300 | markdown |
| Source code | 1000 | 200 | (match language) |
| Configs (yaml/toml) | 500 | 100 | yaml/toml |
| Long-form docs (specs) | 2000 | 400 | markdown |

### Step 5: Create `.env`

```bash
cat > .cocoindex/.env << 'EOF'
COCOINDEX_DATABASE_URL=postgresql://cocoindex:cocoindex@<HOST>:5432/cocoindex
COCOINDEX_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EOF
```

Ask user for the PostgreSQL host. If they don't have one:

```bash
# Start PostgreSQL + pgvector via Docker
docker run -d \
  --name cocoindex-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=cocoindex \
  -e POSTGRES_PASSWORD=cocoindex \
  -e POSTGRES_DB=cocoindex \
  -p 5432:5432 \
  pgvector/pgvector:pg17

docker exec cocoindex-postgres psql -U cocoindex -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Step 6: Install & Index

```bash
# Create venv (MUST use venv — PEP 668 blocks global pip install on Python 3.12+)
python3 -m venv .venv-cocoindex
.venv-cocoindex/bin/pip install -r .cocoindex/requirements.txt

# Setup database schema
.venv-cocoindex/bin/cocoindex -e .cocoindex/.env setup .cocoindex/index.py -f

# Run indexing — processes all files and exits automatically
# -e flag MUST come BEFORE the subcommand
.venv-cocoindex/bin/cocoindex -e .cocoindex/.env update .cocoindex/index.py -f

# Verify
.venv-cocoindex/bin/python .cocoindex/query.py --status
```

### Step 7: Update .gitignore

Add to `.gitignore`:
```
.cocoindex/.env
.venv-cocoindex/
__pycache__/
```

## Gotchas (Learned From Experience)

| Gotcha | Solution |
|--------|----------|
| `cocoindex -e .env server ...` → "No such option: -e" | `-e` is a **global** flag — must come BEFORE the subcommand |
| Indexing runs but 0 rows in tables | Use `update` subcommand (not `server`). If using `server`, add `-L` flag |
| `pip install` fails with PEP 668 error | Use `python3 -m venv` — never install globally |
| Table name mismatch in query.py | CocoIndex names tables as `{flowname_lowercase}__{export_name}` — this is handled in the boilerplate |
| Closure captures wrong loop variable | `index.py` uses `_name=name` default arg — don't modify |
| "UNEXPECTED key: embeddings.position_ids" | Harmless warning from sentence-transformers — ignore it |

## File Roles

| File | Edit? | Purpose |
|------|-------|---------|
| `config.py` | **YES** | Project-specific: name, collections, DB URL |
| `index.py` | NO | CocoIndex flow registration (reads config.py) |
| `query.py` | NO | Semantic search CLI (reads config.py) |
| `requirements.txt` | NO | Python dependencies |
| `.env` | **YES** | DB connection string (gitignored) |
