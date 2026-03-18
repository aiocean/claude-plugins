# Tools Integration Reference

Detailed commands, comparison matrix, and usage guidelines for Oracle tools: GitNexus and LSP.

## Tool Comparison — What Each Adds to Oracle

| Capability | GitNexus | LSP |
|---|---|---|
| **Community/cluster detection** | Yes (primary, with cohesion scores) | — |
| **Dependency graphs** | Yes (imports, calls, inheritance, type usage) | — |
| **Symbol inventory** | Yes (tree-sitter AST: functions, classes, methods) | Yes (type-aware) |
| **Caller/callee tracing** | Yes (call edges in graph) | Yes (precise, all languages) |
| **Impact/blast radius** | Yes (transitive graph walk, flow tracing) | Reference count per function |
| **Type information** | — | Full type resolution |
| **Execution flow tracing** | Yes (entry point to leaf) | — |
| **Hybrid search (BM25 + semantic)** | Yes | — |
| **Cross-cutting pattern discovery** | Yes (semantic search) | — |
| **Diagnostics/errors** | — | Yes (type errors, warnings) |
| **Snapshot diffing** | — | — |

## GitNexus — Knowledge Graph Engine

Best for: structural analysis, dependency tracking, cluster detection, flow tracing, and semantic search across the codebase.

### Setup

```bash
# Install globally
npm install -g gitnexus

# Or use via npx (no install needed)
npx gitnexus analyze

# Configure as MCP server for Claude Code integration
# Add to .mcp.json or settings
```

### Commands

```bash
# Build the knowledge graph
npx gitnexus analyze

# The graph is then queryable via MCP tools or JSON output
```

### What GitNexus Produces (6-Phase Pipeline)

1. **Structure** — File tree, folder relationships
2. **Parsing** — Tree-sitter AST: every function, class, method, interface with file:line
3. **Resolution** — Cross-file import/call resolution with language-aware logic
4. **Clustering** — Functional community detection with cohesion scoring
5. **Flow Tracing** — Execution paths from entry points
6. **Indexing** — Hybrid search (BM25 + semantic) over the graph

### When to Use During Oracle Analysis

| Task | Use GitNexus? |
|---|---|
| Get all functions/classes in a file | Yes — graph nodes |
| Check what files import a module | Yes — graph edges |
| Find functional communities/clusters | Yes — clustering phase |
| Trace execution flow from entry point | Yes — flow tracing |
| Discover cross-cutting patterns | Yes — hybrid search |
| Assess blast radius of changes | Yes — transitive graph walk |
| Precise type information | No — use LSP |
| Exact reference count for a function | No — use LSP |
| Type error detection | No — use LSP |

## LSP — Language Server Protocol

Best for: precise type-aware analysis, exact reference counting, diagnostics, and hover information. The most accurate tool for caller/callee tracing.

```
# Check availability
lsp_servers()  → list running language servers

# Symbol list with hierarchy
lsp_document_symbols(file)

# Precise references (all call sites)
lsp_find_references(file, line, character)

# Type information on hover
lsp_hover(file, line, character)

# Navigate to definition
lsp_goto_definition(file, line, character)

# Errors and warnings
lsp_diagnostics(file)
lsp_diagnostics_directory(directory)
```

### When to Use During Oracle Analysis

| Task | Use LSP? |
|---|---|
| Exact caller count for a hub function | Yes — `lsp_find_references` |
| Type information for interfaces/contracts | Yes — `lsp_hover` |
| Check for type errors across module | Yes — `lsp_diagnostics_directory` |
| Bulk symbol listing for many files | No — GitNexus handles this faster |
| Semantic concept search | No — use GitNexus hybrid search |
| Dependency graph | No — use GitNexus edges |

**Setup:** LSP is required. Language servers must be running. If `lsp_servers()` returns empty, stop and instruct user to configure a language server. Common setups:
- TypeScript: `typescript-language-server`
- Rust: `rust-analyzer`
- Go: `gopls`
- Python: `pyright` or `pylsp`

## Phase 2 Detailed Tool Commands

### GitNexus Analysis Block

Query the knowledge graph for each cluster:

```
# Get all nodes (functions, classes) in a cluster
# → Graph query for nodes matching cluster ID

# Get edges (imports, calls, inheritance) for cluster files
# → Graph query for edges where source or target is in cluster

# Get execution flows through this cluster
# → Flow tracing from entry points that pass through cluster

# Hybrid search for cross-cutting patterns
# → "error handling strategy", "retry pattern", "caching"
```

### LSP Analysis Block

Use for precision on key components:

```
# Type-aware symbol list with full hierarchy
lsp_document_symbols(file)

# Precise reference tracing for hub functions
lsp_find_references(file, line, character)

# Type information for understanding interfaces
lsp_hover(file, line, character)

# Check for errors/warnings
lsp_diagnostics(file)
```

### Enhanced Blast Radius

For hub nodes (5+ dependents), use GitNexus + LSP for precise impact data:

```
# GitNexus: transitive impact via graph walk
# Query edges transitively from hub node → all affected nodes + test files

# LSP: precise reference count for specific exported functions
lsp_find_references(file, line, char)  → exact call sites with line numbers
```

This produces rich blast radius documentation:
- GitNexus: "Changing file X affects 18 files transitively, including 3 test files"
- LSP: "Function `handleAuth` at line 42 is called from 7 specific locations"

## Unified Analysis Workflow (Phase 2)

When both tools are available, Oracle uses them in combination:

```
1. GitNexus knowledge graph      → identify clusters, hubs, flows, dependencies
2. GitNexus hybrid search        → discover cross-cutting patterns
3. LSP lsp_find_references       → precise caller tracing for hubs
4. LSP lsp_diagnostics           → catch type errors and warnings
5. Read + Grep                   → fill gaps, read actual implementations
```

Both tools work together to produce the richest possible documentation.
