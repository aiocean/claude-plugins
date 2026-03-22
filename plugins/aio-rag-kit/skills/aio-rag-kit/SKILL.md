---
name: aio-rag-kit
description: Set up vector search and RAG pipelines using Qdrant via rag-kit (auto-installs if missing). Triggers: "create vector collection", "index content", "semantic search", "RAG setup", qdrant, embeddings.
---

# RAG Kit Skill

Vector database operations (Qdrant) for Retrieval-Augmented Generation via [nguyenvanduocit/rag-kit](https://github.com/nguyenvanduocit/rag-kit).

## Environment

- Go: !`which go 2>/dev/null || echo "NOT INSTALLED"`
- rag-kit: !`which rag-kit 2>/dev/null || echo "NOT INSTALLED"`
- rag-cli: !`which rag-cli 2>/dev/null || echo "NOT INSTALLED"`
- QDRANT_HOST: !`echo ${QDRANT_HOST:-NOT SET}`
- QDRANT_PORT: !`echo ${QDRANT_PORT:-NOT SET}`
- QDRANT_API_KEY: !`[ -n "$QDRANT_API_KEY" ] && echo "SET" || echo "NOT SET"`
- OPENAI_API_KEY: !`[ -n "$OPENAI_API_KEY" ] && echo "SET" || echo "NOT SET"`
- MCP configured: !`cat .mcp.json 2>/dev/null | grep -q rag && echo "YES" || echo "NO"`

## Install (skip if already installed above)

Prerequisites: Qdrant running (local or cloud) + OpenAI API key for embeddings.

```bash
# Run Qdrant locally
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Install binaries
go install github.com/nguyenvanduocit/rag-kit@latest
go install github.com/nguyenvanduocit/rag-kit/cmd/rag-cli@latest
```

Or use Qdrant Cloud: https://cloud.qdrant.io/

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "rag": {
      "command": "rag-kit",
      "env": {
        "QDRANT_HOST": "localhost",
        "QDRANT_PORT": "6333",
        "QDRANT_API_KEY": "",
        "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Optional: `ENABLE_TOOLS` — comma-separated list to restrict available tool groups. Restart Claude Code after configuring.

## MCP Tools (prefix: `rag_`)

### Collection Management

| Tool | Usage |
|------|-------|
| `rag_create_collection` | `(collection_name: "docs", vector_size: 1536)` — use 1536 for OpenAI `text-embedding-3-small` |
| `rag_list_collections` | `()` |
| `rag_delete_collection` | `(collection_name: "docs")` |

### Content Indexing

```
rag_index_content(
  collection_name: "docs",
  content: "Document text to index...",
  metadata: {"source": "readme.md", "section": "introduction"}
)
rag_delete_index(collection_name: "docs", point_id: "abc123")
```

### Semantic Search

```
rag_search(
  collection_name: "docs",
  query: "How does the authentication system work?",
  limit: 5
)
```

Returns ranked results with content, metadata, and similarity scores.

## CLI (fallback if MCP not configured)

```bash
rag-cli create-collection --name docs --vector-size 1536 --env .env
rag-cli list-collections --env .env
rag-cli delete-collection --name docs --env .env
rag-cli index-content --collection docs --content "Text to index" --env .env
rag-cli search --collection docs --query "authentication system" --limit 5 --env .env
rag-cli delete-index --collection docs --point-id abc123 --env .env
```

Flag: `--env` path to .env file with credentials.

## Workflows

### Index a Codebase
1. `rag_create_collection(collection_name: "codebase", vector_size: 1536)`
2. Read source files and index each: `rag_index_content(collection_name: "codebase", content: "file content...", metadata: {"file": "src/auth.go"})`
3. `rag_search(collection_name: "codebase", query: "error handling pattern", limit: 5)`

### Knowledge Base
1. `rag_create_collection(collection_name: "kb", vector_size: 1536)`
2. Index documentation, FAQs, runbooks
3. `rag_search(collection_name: "kb", query: "how to deploy to production")`
