# Tools Integration Reference

Detailed commands, comparison matrix, and usage guidelines for all four Oracle tools: CodeIndex, CocoIndex, Kai, and LSP.

## Tool Comparison — What Each Adds to Oracle

| Capability | CodeIndex | CocoIndex | Kai | LSP |
|---|---|---|---|---|
| **Community/module detection** | Yes (primary) | — | — | — |
| **Dependency graphs** | Yes (static) | — | Yes (file-level imports) | — |
| **Metrics & complexity** | Yes | — | — | — |
| **Semantic concept search** | — | Yes (best for "how does X work?") | — | — |
| **Symbol inventory** | tree-sitter based | — | Yes (fast, no file read) | Yes (type-aware) |
| **Caller/callee tracing** | — | — | Partial (TS only) | Yes (precise, all languages) |
| **Impact/blast radius** | Fan-in count | — | Transitive graph walk | Reference count per function |
| **Type information** | — | — | Signatures only | Full type resolution |
| **Snapshot diffing** | — | — | Yes (before/after) | — |
| **Cross-cutting patterns** | — | Yes ("retry pattern" across codebase) | — | — |
| **Diagnostics/errors** | — | — | — | Yes (type errors, warnings) |

## CocoIndex — Semantic Search

Best for: discovering related code by concept, finding cross-cutting patterns, tracing design intent when naming is inconsistent.

```bash
# Check availability
ls .cocoindex/query.py 2>/dev/null

# Semantic search
.venv-cocoindex/bin/python .cocoindex/query.py "authentication flow" --top-k 5

# Broader exploration
.venv-cocoindex/bin/python .cocoindex/query.py "error handling strategy" --top-k 10
```

**When to use during Oracle analysis:**

| Task | Use CocoIndex? |
|---|---|
| Find code by concept ("how does auth work?") | Yes |
| Discover undocumented design patterns | Yes — `"retry logic"`, `"caching strategy"` |
| Trace cross-module data flows (naming varies) | Yes |
| Find exact imports of a module | No — use Grep |
| Read a specific file | No — use Read |

**Setup:** CocoIndex is required. If missing, stop and instruct user to run `/aio-cocoindex:aio-cocoindex-setup`. Oracle will not proceed without it.

## Kai — Semantic Graph

Best for: fast symbol overview without reading files, file-level dependency tracking, impact analysis, and snapshot-based change tracking.

```
# Check availability
kai_status()  → shows if index exists and is fresh

# Symbol inventory (parallel for all files in a module)
kai_symbols(file, kind="function", signatures=true)

# Dependency tracking
kai_dependencies(file)  → what this file imports
kai_dependents(file)    → what imports this file

# Full context for hub files
kai_context(file, depth=2)  → symbols + deps + dependents + tests

# Blast radius analysis
kai_impact(file, max_depth=3)  → transitive downstream files + tests

# Snapshot for change tracking (before/after documentation updates)
kai_refresh()  → creates snapshot, returns snapshot_id
kai_diff(base="id1", head="id2")  → semantic diff between snapshots
```

**When to use during Oracle analysis:**

| Task | Use Kai? |
|---|---|
| Get all functions in a file without reading it | Yes — `kai_symbols` |
| Check what files import a module | Yes — `kai_dependents` |
| Assess blast radius of hub changes | Yes — `kai_impact` |
| Track what changed after doc updates | Yes — `kai_diff` |
| Precise caller tracing for a specific function | No — use LSP |
| Type information | No — use LSP |

**Setup:** Kai is required. If `.kai/` directory doesn't exist, run `kai_refresh()` to initialize. If Kai MCP server is not configured, stop and instruct user to add it to their MCP config. Oracle will not proceed without it.

**Limitations:** Kai's caller/callee tracking may return empty for some language combinations (e.g., Rust modules). Use LSP `lsp_find_references` for precise caller tracing in those cases.

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

**When to use during Oracle analysis:**

| Task | Use LSP? |
|---|---|
| Exact caller count for a hub function | Yes — `lsp_find_references` |
| Type information for interfaces/contracts | Yes — `lsp_hover` |
| Check for type errors across module | Yes — `lsp_diagnostics_directory` |
| Bulk symbol listing for many files | No — Kai handles this (faster, parallel) |
| Semantic concept search | No — use CocoIndex |

**Setup:** LSP is required. Language servers must be running. If `lsp_servers()` returns empty, stop and instruct user to configure a language server. Oracle will not proceed without it. Common setups:
- TypeScript: `typescript-language-server` (usually auto-started by editors)
- Rust: `rust-analyzer`
- Go: `gopls`
- Python: `pyright` or `pylsp`

## Phase 2 Detailed Tool Commands

### Kai Analysis Block

Run in parallel for all module files:

```
# Get symbol inventory for each file — fast overview without reading
kai_symbols(file, kind="function", signatures=true)

# Get file dependency graph
kai_dependencies(file)  → what this file imports
kai_dependents(file)    → what imports this file

# Get full context for hub files (high-connectivity)
kai_context(file, depth=2)  → symbols + deps + dependents + tests
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

### Supplementary Tools Block

Structure analyst prompt for module analysis:

```
You are the structure-analyst for module: {module_name}

Tools to use:
- Kai for symbol inventory and dependency tracking
- LSP for precise type-aware references and diagnostics
- scripts/tree-sitter-analyze.py for bulk AST analysis
- Read tool for source file reading
- Grep for quick symbol lookup

Data sources:
- codebase_map.json communities and edges for this module
- dependency_graphs/{module}.json for detailed dependencies
- Actual source files
```

### CocoIndex Commands

Pattern discovery for cross-cutting concerns:

```bash
.venv-cocoindex/bin/python .cocoindex/query.py "error handling strategy" --top-k 5
.venv-cocoindex/bin/python .cocoindex/query.py "retry and resilience pattern" --top-k 5
.venv-cocoindex/bin/python .cocoindex/query.py "authentication authorization flow" --top-k 5
```

### Enhanced Blast Radius

For hub files identified by CodeIndex (5+ importers), use Kai and LSP for precise impact data:

```
# Kai: transitive impact analysis (walks dependency graph)
kai_impact(file, max_depth=3)  → all affected files + tests

# LSP: precise reference count for specific exported functions
lsp_find_references(file, line, char)  → exact call sites with line numbers
```

This produces much richer blast radius documentation than CodeIndex alone:
- CodeIndex: "file X has 12 importers" (static count)
- Kai: "changing file X affects 18 files transitively, including 3 test files"
- LSP: "function `handleAuth` at line 42 is called from 7 specific locations"

## Unified Analysis Workflow (Phase 2)

When all tools are available, Oracle uses them in combination:

```
1. CodeIndex codebase_map.json    → identify communities, hubs, metrics
2. Kai kai_symbols (parallel)     → fast symbol inventory for all files
3. Kai kai_dependencies           → file-level import graph
4. CocoIndex semantic search      → discover cross-cutting patterns
5. LSP lsp_find_references        → precise caller tracing for hubs
6. LSP lsp_diagnostics            → catch type errors and warnings
7. Read + Grep                    → fill gaps, read actual implementations
```

All four tools work together to produce the richest possible documentation.
