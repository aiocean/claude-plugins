---
name: aio-rag-kit
description: This skill should be used when the user asks to create vector collection, index content, semantic search, search embeddings, RAG setup, vector database, or mentions qdrant, vector search, embeddings, retrieval augmented generation, rag-kit. Auto-installs rag-kit if missing.
---

# RAG Kit Skill

Vector database operations (Qdrant) for Retrieval-Augmented Generation via [nguyenvanduocit/rag-kit](https://github.com/nguyenvanduocit/rag-kit).

## Step 1: Check Availability

1. Use `ToolSearch("rag")` to look for tools prefixed with `rag_` (e.g. `rag_search`, `rag_create_collection`)
2. If tools are found → skip to **Step 3: Use Tools**
3. If no tools found → check: `which rag-cli`
4. If CLI exists → skip to **Step 4: Use CLI**
5. If neither → proceed to **Step 2: Install**

## Step 2: Install

### 2a. Prerequisites

- **Qdrant** vector database running (local or cloud)
- **OpenAI API key** for embedding generation

```bash
# Run Qdrant locally with Docker
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

Or use Qdrant Cloud: https://cloud.qdrant.io/

### 2b. Install via Go

```bash
go install github.com/nguyenvanduocit/rag-kit@latest
go install github.com/nguyenvanduocit/rag-kit/cmd/rag-cli@latest
```

### 2c. Environment Variables

**Ask the user for:**

- `QDRANT_HOST` — Qdrant server host (e.g. `localhost` or cloud URL)
- `QDRANT_PORT` — Qdrant port (default: `6333`)
- `QDRANT_API_KEY` — Qdrant API key (required for cloud, optional for local)
- `OPENAI_API_KEY` — OpenAI API key for embeddings

```bash
export QDRANT_HOST="localhost"
export QDRANT_PORT="6333"
export QDRANT_API_KEY=""
export OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxx"
```

### 2d. Configure as MCP Server (optional)

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

Optional: `ENABLE_TOOLS` — comma-separated list to restrict available tool groups.

## Step 3: Use MCP Tools

### Collection Management

```
# Create a new collection
rag_create_collection(collection_name: "docs", vector_size: 1536)

# List all collections
rag_list_collections()

# Delete collection
rag_delete_collection(collection_name: "docs")
```

**Note:** `vector_size` should match the embedding model dimension. OpenAI `text-embedding-3-small` = 1536.

### Content Indexing

```
# Index text content
rag_index_content(
  collection_name: "docs",
  content: "This is the document text to index...",
  metadata: {"source": "readme.md", "section": "introduction"}
)

# Delete indexed content
rag_delete_index(collection_name: "docs", point_id: "abc123")
```

### Semantic Search

```
# Search for relevant content
rag_search(
  collection_name: "docs",
  query: "How does the authentication system work?",
  limit: 5
)
```

Returns ranked results with content, metadata, and similarity scores.

## Step 4: Use CLI

```bash
# Create collection
rag-cli create-collection --name docs --vector-size 1536 --env .env

# List collections
rag-cli list-collections --env .env

# Delete collection
rag-cli delete-collection --name docs --env .env

# Index content
rag-cli index-content --collection docs --content "Text to index" --env .env

# Semantic search
rag-cli search --collection docs --query "authentication system" --limit 5 --env .env

# Delete index
rag-cli delete-index --collection docs --point-id abc123 --env .env
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--env` | Path to .env file with credentials |

## Common Workflows

### Index a Codebase

1. `rag_create_collection(collection_name: "codebase", vector_size: 1536)`
2. Read source files and index each:
   ```
   rag_index_content(collection_name: "codebase", content: "file content...", metadata: {"file": "src/auth.go"})
   ```
3. Search: `rag_search(collection_name: "codebase", query: "error handling pattern", limit: 5)`

### Knowledge Base

1. `rag_create_collection(collection_name: "kb", vector_size: 1536)`
2. Index documentation, FAQs, runbooks
3. Query: `rag_search(collection_name: "kb", query: "how to deploy to production")`
