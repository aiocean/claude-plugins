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

### Step 3: Ask About Embedding Model

**IMPORTANT:** Ask the user which embedding approach they want:

> **Embedding Model Choice:**
>
> 1. **Local (default)** — `sentence-transformers/all-MiniLM-L6-v2` (384-dim)
>    - Free, no API key needed
>    - Good for English content
>    - Runs locally, faster indexing
>
> 2. **Gemini** — `gemini-embedding-2-preview` (3072-dim)
>    - Much better quality, especially for **multilingual content** (Vietnamese, etc.)
>    - Uses asymmetric embedding (RETRIEVAL_DOCUMENT for indexing, RETRIEVAL_QUERY for search)
>    - Requires Google API key (very cheap: ~$0.00025/1K tokens)
>
> Which do you prefer?

If user chooses **Gemini**, ask for their `GEMINI_API_KEY`.

### Step 4: Copy Boilerplate

```bash
mkdir -p .cocoindex
cp $BP/index.py $BP/query.py $BP/requirements.txt .cocoindex/
```

**Do NOT copy `config.py`** — write it fresh based on the project analysis.

### Step 5: Write `config.py`

Read the boilerplate `config.py` for the full template with comments:
```bash
cat $BP/config.py
```

Then write a customized version to `.cocoindex/config.py` with:
- Correct `PROJECT_NAME`
- Correct `DATABASE_URL` (ask user for their PostgreSQL host)
- Correct `EMBEDDING_API_TYPE` — `"local"` or `"gemini"` based on user choice
- Project-specific `COLLECTIONS`

**Chunking guidelines:**
| Content Type | chunk_size | chunk_overlap | language |
|-------------|-----------|--------------|----------|
| Markdown docs | 1500 | 300 | markdown |
| Source code | 1000 | 200 | (use tree-sitter language) |
| Configs (yaml/toml) | 500 | 100 | yaml/toml |
| Long-form docs (specs) | 2000 | 400 | markdown |

**For code collections:** Use `generate_code_collections()` helper to auto-create per-language
collections with tree-sitter aware chunking. This splits code at AST boundaries (functions,
classes, methods) instead of naive character splitting:

```python
COLLECTIONS = {
    "docs": { ... },
    # Auto-generates code_typescript, code_python, etc. with tree-sitter chunking
    **generate_code_collections(
        ["src/", "lib/"],
        languages=["typescript", "python"],  # omit for all 16 supported languages
    ),
}
```

Tree-sitter ensures chunks respect code structure — a function body stays together,
imports are grouped, class definitions aren't split mid-method. This dramatically
improves semantic search quality for code vs naive text chunking.

### Step 6: Create `.env`

**For local embedding (default):**
```bash
cat > .cocoindex/.env << 'EOF'
COCOINDEX_DATABASE_URL=postgresql://cocoindex:cocoindex@<HOST>:5432/cocoindex
COCOINDEX_EMBEDDING_API_TYPE=local
COCOINDEX_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EOF
```

**For Gemini embedding:**
```bash
cat > .cocoindex/.env << 'EOF'
COCOINDEX_DATABASE_URL=postgresql://cocoindex:cocoindex@<HOST>:5432/cocoindex
COCOINDEX_EMBEDDING_API_TYPE=gemini
COCOINDEX_EMBEDDING_MODEL=gemini-embedding-2-preview
GEMINI_API_KEY=<user's API key>
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

### Step 7: Install & Index

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

### Step 8: Update .gitignore

Add to `.gitignore`:
```
.cocoindex/.env
.venv-cocoindex/
__pycache__/
```

## Embedding Comparison

| | Local (MiniLM-L6-v2) | Gemini (embedding-2-preview) |
|---|---|---|
| Dimension | 384 | 3072 |
| Quality | Good (English) | Excellent (multilingual) |
| Cost | Free | ~$0.00025/1K tokens |
| Speed | Fast (no network) | Slower (API calls) |
| Task types | Symmetric | Asymmetric (doc vs query) |
| Vietnamese | Weak | Strong |
| Storage | ~15KB/1K chunks | ~120KB/1K chunks |

## Gotchas (Learned From Experience)

| Gotcha | Solution |
|--------|----------|
| `cocoindex -e .env server ...` → "No such option: -e" | `-e` is a **global** flag — must come BEFORE the subcommand |
| Indexing runs but 0 rows in tables | Use `update` subcommand (not `server`). If using `server`, add `-L` flag |
| `pip install` fails with PEP 668 error | Use `python3 -m venv` — never install globally |
| Table name mismatch in query.py | CocoIndex names tables as `{flowname_lowercase}__{export_name}` — this is handled in the boilerplate |
| Closure captures wrong loop variable | `index.py` uses `_name=name` default arg — don't modify |
| "UNEXPECTED key: embeddings.position_ids" | Harmless warning from sentence-transformers — ignore it |
| Switching embedding model | Must re-index everything — vector dimensions and space are incompatible |
| Gemini rate limits on large indexes | CocoIndex handles batching internally, but very large indexes (50K+ chunks) may need patience |
| `GEMINI_API_KEY` from shell overrides `.env` | Boilerplate uses `load_dotenv(override=True)` to ensure `.env` takes precedence over shell env vars |

## File Roles

| File | Edit? | Purpose |
|------|-------|---------|
| `config.py` | **YES** | Project-specific: name, collections, DB URL, embedding choice |
| `index.py` | NO | CocoIndex flow registration (reads config.py) |
| `query.py` | NO | Semantic search CLI (reads config.py) |
| `requirements.txt` | NO | Python dependencies |
| `.env` | **YES** | DB connection, API keys (gitignored) |
