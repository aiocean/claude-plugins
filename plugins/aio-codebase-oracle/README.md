# Codebase Oracle

Comprehensive codebase analysis and visualization powered by GitNexus knowledge graph.

**Skills included:**

1. **doc-writer** — Produces a full `docs/` directory with multi-document architecture docs (C4 diagrams, ERD, API maps, sequence diagrams, dependency graphs, and more)

## How It Works

Oracle uses **GitNexus** to build a knowledge graph of the codebase, then combines it with **LSP** for type-aware precision analysis. GitNexus handles structure parsing, dependency resolution, clustering, flow tracing, and hybrid search — all in one tool with zero infrastructure requirements.

### Tool Stack

| Tool | Role | Infrastructure |
|------|------|---------------|
| **GitNexus** (MCP) | Knowledge graph: structure, dependencies, clustering, flow tracing, hybrid search | Zero — runs via `npx gitnexus analyze` |
| **LSP** | Type-aware references, caller tracing, diagnostics | Language servers |

### What GitNexus Provides (6-Phase Pipeline)

1. **Structure** — File tree and folder relationships
2. **Parsing** — Tree-sitter AST: functions, classes, methods, interfaces
3. **Resolution** — Cross-file import/call resolution
4. **Clustering** — Functional community detection with cohesion scoring
5. **Flow Tracing** — Execution paths from entry points
6. **Indexing** — Hybrid search (BM25 + semantic)

## Output

| Document | Content | Generated When |
|----------|---------|---------------|
| `CODEBASE_MAP.md` | Index + system overview + hub files + module guide | Always |
| `c4-architecture.md` | C4 Context, Container, Component diagrams | Always |
| `data-model.md` | ERD, database schema, entity relationships | Models/schemas/migrations found |
| `api-surface.md` | Routes, endpoints, schemas, auth | HTTP/gRPC/GraphQL/CLI found |
| `key-flows.md` | Sequence diagrams for critical paths | Always |
| `dependency-graph.md` | Module dependencies, hub analysis, blast radius | Always |
| `product-requirements.md` | Reverse-engineered features, mindmap | README or user-facing code found |
| `infrastructure.md` | Deployment topology, CI/CD, env config | Docker/CI/k8s config found |
| `graph.html` | Interactive D3 force-directed graph viewer | Always |

## Installation

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-codebase-oracle@aiocean-plugins
```

### Prerequisites

- **GitNexus**: `npm install -g gitnexus` or use via `npx gitnexus analyze`
- **GitNexus MCP server**: Configure in your MCP settings for Claude Code integration

## Usage

- "map this codebase"
- "analyze the architecture"
- "document this project"
- "what would break if I change X?"
- "how does authentication work?"

## Language Support

12+ languages via tree-sitter: TypeScript, Python, Rust, Go, Java, C++, and more.
