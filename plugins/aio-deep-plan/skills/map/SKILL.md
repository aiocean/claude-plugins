---
name: aio-map
description: PROACTIVE planning — second step in the aio-deep-plan pipeline. Use when the user needs structural analysis: "map dependencies", "show structure", "who calls this", "blast radius", "trace references", "impact analysis". Run discover first, then follow with plan. NOT for debugging — use aio-debug instead.
context: fork
agent: oh-my-claudecode:explore
---

## Environment
- GitNexus: !`npx gitnexus status 2>/dev/null && echo "AVAILABLE" || echo "NOT INSTALLED"`

# Map — Structural Analysis

Build a dependency and symbol map for files identified by `/discover`. Uses GitNexus for overview, LSP for precision.

## Prerequisites

- GitNexus indexed (`npx gitnexus analyze`) — verify with `npx gitnexus status`
- LSP servers running (TypeScript/Rust)

## Workflow

### Step 1: Symbol inventory (GitNexus) — run in parallel

For each relevant file from discovery, use the GitNexus MCP `context` tool:

```
context(file)
```

Fast overview of symbols and dependencies without reading the full file.

### Step 2: File dependencies (GitNexus) — run in parallel

```
context(file)  → imports and dependents for the file
impact(file)   → what does changing this file affect?
```

**Note:** GitNexus tracks TS imports well. For Rust modules, fall back to LSP.

### Step 3: Precise references (LSP)

For key functions that will be modified:

```
lsp_find_references(file, line, character)  → all call sites
lsp_goto_definition(file, line, character)  → where defined
lsp_hover(file, line, character)            → type info
```

LSP is authoritative — always trust LSP over GitNexus for caller/callee data.

### Step 4: Output structural map

```
## Map: [feature area]

### File: `path/file.ts` (N functions)
**Key functions:** fn1, fn2, fn3
**Imports:** file-a.ts, file-b.ts
**Imported by:** file-c.tsx, file-d.tsx
**References:**
- `fn1` called from: file-c.tsx:42, file-d.tsx:88

### Dependency Graph
file-a → file-b → file-c
                 ↘ file-d

### Blast Radius
Changing `fn1` affects: [list of downstream files]

### Next Step
Run `/plan` to synthesize into implementation plan.
```

## Tool priority

1. **GitNexus `context`** — fast file overview (always works)
2. **GitNexus `impact`** — blast radius / downstream effects
3. **LSP `lsp_find_references`** — precise function-level tracing
4. **LSP `lsp_hover`** — type information when needed
