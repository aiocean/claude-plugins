---
name: discover
description: Use when starting a new feature, investigating a bug, or needing to understand how something works. Runs CocoIndex semantic search across the codebase to find all relevant code before planning or coding. Trigger words — "discover", "find code", "how does X work", "where is", "what handles".
---

# Discover — Find Relevant Code

Semantic search across the entire codebase using CocoIndex. Use BEFORE planning or coding to understand what exists.

## Prerequisites

- CocoIndex set up in project (`.cocoindex/` directory + `.venv-cocoindex/`)
  - If missing, tell user to run `/aio-cocoindex:aio-cocoindex-setup` first
- Kai MCP server configured (`.kai/` directory)
  - If missing, run `kai_refresh()` to initialize

## Workflow

### Step 1: Formulate 3-5 search queries

From the user's request, generate diverse queries covering different angles:

- **Functional**: "how does [feature] work"
- **Structural**: "[component type] for [domain]"
- **Cross-cutting**: "[pattern] across frontend and backend"
- **Vietnamese OK**: Gemini embeddings handle multilingual

### Step 2: Run searches in parallel

```bash
.venv-cocoindex/bin/python .cocoindex/query.py "query here" --top-k 5
```

Run 3-5 searches as separate parallel Bash calls. Use `--top-k 3` for focused, `--top-k 7` for broad.

### Step 3: Score and filter

| Similarity | Relevance |
|---|---|
| >0.65 | Highly relevant — must read |
| 0.55–0.65 | Related — worth knowing |
| <0.55 | Tangential — skip unless desperate |

### Step 4: Enrich with Kai (parallel)

For each highly relevant file found, get symbol overview:

```
kai_symbols(file, kind="function", signatures=true)
```

This adds function names and signatures without reading the full file. Run in parallel for all relevant files.

Optionally, get full context for the most important file:

```
kai_context(file, symbol="main_function", depth=2)
```

### Step 5: Output discovery map

```
## Discovery: [topic]

### Highly Relevant (>0.65)
- `path/file.ts` — [what it does]
  Functions: fn1, fn2, fn3 (from Kai)
- `path/file.rs` — [what it does]
  Functions: fn1, fn2 (from Kai)

### Related (0.55–0.65)
- `path/file.tsx` — [tangential but worth knowing]

### Key Insight
[What the search reveals about how the codebase handles this area]

### Next Step
Run `/map` on the highly relevant files for structural analysis.
```

## Tips

- If results are weak (<0.55), rephrase with more technical terms
- Search for patterns too: "error handling pattern", "event emit listen"
- After discovery, hand off to `/map` for structural analysis
