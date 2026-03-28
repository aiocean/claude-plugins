# aio-rag-kit

RAG Kit CLI for vector database operations with Qdrant. Create collections, index content, and perform semantic search via rag-kit.

## Install

```bash
/plugin install aio-rag-kit@aiocean-plugins
```

## What It Does

- Create and manage vector collections in Qdrant
- Index files, directories, or text content for semantic retrieval
- Perform semantic search queries against indexed collections
- Supports chunking strategies and embedding configuration

## Requirements

- Go
- [rag-kit](https://github.com/nguyenvanduoc/rag-kit) installed and on PATH
- [Qdrant](https://qdrant.tech/) running (local or remote)
- `OPENAI_API_KEY` environment variable set
