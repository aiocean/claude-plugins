---
name: aio-cocoindex-setup
description: This skill should be used when the user asks to "setup cocoindex", "create index for this project", "add semantic search", "index this codebase", "setup markdown indexing", "cocoindex init", or wants to set up CocoIndex-based document indexing for a project. Scaffolds a `.cocoindex/` directory with project-specific indexing code using boilerplate files.
---

# CocoIndex Setup

Scaffold a `.cocoindex/` directory for any project with semantic search capabilities.
Auto-detects all file types and uses **tree-sitter aware chunking** for code files (splits at AST boundaries: functions, classes, methods).

## How It Works

1. **Copy boilerplate files** from this skill's `boilerplate/` directory
2. **Customize only `config.py`** — set `PROJECT_NAME` and `SOURCE_DIRS`
3. **Never edit `index.py` or `query.py`** — they auto-detect languages and handle everything

No manual collection configuration needed. One project = one unified index.

## Workflow

### Step 1: Resolve Boilerplate Path

```bash
BP="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-cocoindex/*/skills/aio-cocoindex-setup/boilerplate 2>/dev/null | sort -V | tail -1)"
ls $BP  # Should show: config.py  index.py  query.py  requirements.txt
```

### Step 2: Analyze Project

```bash
# What file types exist?
find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | sed 's|.*\.||' | sort | uniq -c | sort -rn | head -15

# What directories have content?
ls -d */ 2>/dev/null
```

Determine:
- **PROJECT_NAME**: Lowercase, no hyphens (e.g., `compass`, `trueprofitfns`, `webapp`)
- **SOURCE_DIRS**: Which directories to index (default: `["."]` for everything)

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
- Correct `DATABASE_URL` (ask user for their PostgreSQL host — used for CocoIndex metadata only)
- Correct `QDRANT_URL` (ask user for their Qdrant endpoint — used for vector storage)
- Correct `EMBEDDING_API_TYPE` — `"local"` or `"gemini"` based on user choice
- Correct `SOURCE_DIRS` — directories to index

Languages are auto-detected from file extensions. No need to configure collections.

**Tree-sitter chunking** is automatic — code files are split at AST boundaries
(functions, classes, methods). Chunk sizes vary by category:

| Category | chunk_size | chunk_overlap | File types |
|----------|-----------|--------------|------------|
| Code | 1000 | 200 | .py, .ts, .js, .go, .rs, .java, etc. |
| Docs | 1500 | 300 | .md, .mdx, .rst, .txt, .html |
| Config | 500 | 100 | .yaml, .yml, .toml, .json |

### Step 6: Create `.env`

**For local embedding (default):**
```bash
cat > .cocoindex/.env << 'EOF'
COCOINDEX_DATABASE_URL=postgresql://cocoindex:cocoindex@<HOST>:5432/cocoindex
COCOINDEX_QDRANT_URL=http://localhost:6334
COCOINDEX_EMBEDDING_API_TYPE=local
COCOINDEX_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EOF
```

**For Gemini embedding:**
```bash
cat > .cocoindex/.env << 'EOF'
COCOINDEX_DATABASE_URL=postgresql://cocoindex:cocoindex@<HOST>:5432/cocoindex
COCOINDEX_QDRANT_URL=http://localhost:6334
COCOINDEX_EMBEDDING_API_TYPE=gemini
COCOINDEX_EMBEDDING_MODEL=gemini-embedding-2-preview
GEMINI_API_KEY=<user's API key>
EOF
```

**For Qdrant Cloud** (instead of local), set:
```
COCOINDEX_QDRANT_URL=https://xyz-example.cloud-region.cloud.qdrant.io:6334
COCOINDEX_QDRANT_API_KEY=<your-qdrant-api-key>
```

Ask user for the PostgreSQL host (needed for CocoIndex metadata tracking) and Qdrant endpoint.

If they don't have PostgreSQL:
```bash
# Start PostgreSQL via Docker (metadata only — no pgvector needed)
docker run -d \
  --name cocoindex-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=cocoindex \
  -e POSTGRES_PASSWORD=cocoindex \
  -e POSTGRES_DB=cocoindex \
  -p 5432:5432 \
  postgres:17
```

If they don't have Qdrant:
```bash
# Start Qdrant via Docker
docker run -d \
  --name cocoindex-qdrant \
  --restart unless-stopped \
  -p 6333:6333 \
  -p 6334:6334 \
  qdrant/qdrant
```

### Step 7: Install & Index

```bash
# Create venv (MUST use venv — PEP 668 blocks global pip install on Python 3.12+)
python3 -m venv .venv-cocoindex
.venv-cocoindex/bin/pip install -r .cocoindex/requirements.txt

# Setup database schema
.venv-cocoindex/bin/cocoindex -e .cocoindex/.env setup .cocoindex/index.py -f

# Run indexing — auto-detects languages, processes all files, exits automatically
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

## How It Works Internally

Languages are auto-detected by scanning `SOURCE_DIRS` for known file extensions.
Each detected language gets its own CocoIndex flow with the correct tree-sitter
parser for AST-aware chunking. All results are unified in search — a query for
"authentication" returns matching docs, code, and configs ranked by relevance.

Supported tree-sitter languages: python, typescript, javascript, go, rust, java,
c, cpp, c_sharp, ruby, php, swift, kotlin, scala, sql, bash, markdown, yaml,
toml, json, html, css.

## Embedding Comparison

| | Local (MiniLM-L6-v2) | Gemini (embedding-2-preview) |
|---|---|---|
| Dimension | 384 | 1536 (reduced from 3072 for efficiency) |
| Quality | Good (English) | Excellent (multilingual) |
| Cost | Free | ~$0.00025/1K tokens |
| Speed | Fast (no network) | Slower (API calls) |
| Task types | Symmetric | Asymmetric (doc vs query) |
| Vietnamese | Weak | Strong |
| Storage | ~15KB/1K chunks | ~120KB/1K chunks |

## Gotchas (Learned From Experience)

| Gotcha | Solution |
|--------|----------|
| `cocoindex -e .env server ...` -> "No such option: -e" | `-e` is a **global** flag — must come BEFORE the subcommand |
| Indexing runs but 0 rows in tables | Use `update` subcommand (not `server`). If using `server`, add `-L` flag |
| `pip install` fails with PEP 668 error | Use `python3 -m venv` — never install globally |
| Closure captures wrong loop variable | `index.py` uses `_lang=lang` default arg — don't modify |
| "UNEXPECTED key: embeddings.position_ids" | Harmless warning from sentence-transformers — ignore it |
| Switching embedding model | Must re-index everything — vector dimensions are incompatible. Delete Qdrant collections and re-run setup + update |
| Gemini rate limits on large indexes | CocoIndex handles batching internally, but very large indexes (50K+ chunks) may need patience |
| Qdrant connection refused | Qdrant container not running — check Docker. Default gRPC port is 6334 |
| `GEMINI_API_KEY` from shell overrides `.env` | Boilerplate uses `load_dotenv(override=True)` to ensure `.env` takes precedence over shell env vars |
| No languages detected | Check SOURCE_DIRS points to directories with supported file types |

## File Roles

| File | Edit? | Purpose |
|------|-------|---------|
| `config.py` | **YES** | Project-specific: name, source dirs, embedding choice |
| `index.py` | NO | Auto-detects languages, creates tree-sitter flows |
| `query.py` | NO | Unified search across all languages |
| `requirements.txt` | NO | Python dependencies |
| `.env` | **YES** | DB connection, API keys (gitignored) |
