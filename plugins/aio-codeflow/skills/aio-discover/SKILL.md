---
name: aio-discover
description: |
  Find code, locate implementations, and understand how features work via parallel Explore agents. Step 1 of the codeflow discover → map → plan trio used before implementation.
when_to_use: discover, find code, how does X work, where is, what handles, understand codebase, explore code, search codebase, locate, find implementation, code discovery
effort: medium
argument-hint: "Feature, component, or concept to discover in the codebase"
context: fork
agent: oh-my-claudecode:explore
---

# Discover — Find Relevant Code

## Environment
- GitNexus: !`npx gitnexus status 2>/dev/null && echo "AVAILABLE" || echo "NOT INSTALLED"`

Hybrid search across the entire codebase using GitNexus. Use BEFORE planning or coding to understand what exists.

## Prerequisites

- GitNexus indexed in project — run `npx gitnexus analyze` if not yet indexed
  - Verify with `npx gitnexus status`

## Workflow

### Step 1: Formulate 3-5 search queries

From the user's request, generate diverse queries covering different angles:

- **Functional**: "how does [feature] work"
- **Structural**: "[component type] for [domain]"
- **Cross-cutting**: "[pattern] across frontend and backend"
- **Vietnamese OK**: GitNexus hybrid search handles multilingual

### Step 2: Run searches in parallel

Use the GitNexus MCP `query` tool for each search:

```
query("query here")
```

Run 3-5 searches as separate parallel MCP tool calls. Alternatively use the CLI:

```bash
npx gitnexus analyze
```

### Step 3: Score and filter

| Similarity | Relevance |
|---|---|
| >0.65 | Highly relevant — must read |
| 0.55–0.65 | Related — worth knowing |
| <0.55 | Tangential — skip unless desperate |

### Step 4: Enrich with GitNexus context (parallel)

For each highly relevant file found, get symbol overview:

```
context(file)
```

This adds function names and signatures without reading the full file. Run in parallel for all relevant files.

Optionally, get full context for the most important symbol:

```
context(file, symbol="main_function")
```

### Step 5: Output discovery map

```
## Discovery: [topic]

### Highly Relevant (>0.65)
- `path/file.ts` — [what it does]
  Functions: fn1, fn2, fn3 (from GitNexus context)
- `path/file.rs` — [what it does]
  Functions: fn1, fn2 (from GitNexus context)

### Related (0.55–0.65)
- `path/file.tsx` — [tangential but worth knowing]

### Key Insight
[What the search reveals about how the codebase handles this area]

### Next Step
Run `/map` on the highly relevant files for structural analysis.
```

## Skill Graph — What to invoke next

| Need | Next skill |
|------|-----------|
| Structural analysis (dependencies, blast radius) | `/map` — Step 2 in the discover → map → plan trio |
| Deeper understanding, need to interview user | `/oh-my-claudecode:deep-interview` — Socratic questioning to clarify requirements |
| Want architecture-level understanding | `/oh-my-claudecode:deep-dive` — comprehensive analysis |
| Ready to plan implementation | `/plan` — Step 3 in the discover → map → plan trio |

## Tips

- If results are weak (<0.55), rephrase with more technical terms
- Search for patterns too: "error handling pattern", "event emit listen"
- After discovery, hand off to `/map` for structural analysis
