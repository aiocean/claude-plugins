---
name: map
description: Use after /discover to build a structural map of relevant files — symbols, dependencies, and references. Combines Kai semantic graph with LSP for precise caller/reference tracing. Trigger words — "map", "structure", "dependencies", "who calls", "blast radius".
---

# Map — Structural Analysis

Build a dependency and symbol map for files identified by `/discover`. Uses Kai for overview, LSP for precision.

## Prerequisites

- Kai initialized in project (`.kai/` directory) — run `kai_refresh()` if needed
- LSP servers running (TypeScript/Rust)

## Workflow

### Step 1: Symbol inventory (Kai) — run in parallel

For each relevant file from discovery:

```
kai_symbols(file, kind="function", signatures=true)
```

Fast overview without reading the file.

### Step 2: File dependencies (Kai) — run in parallel

```
kai_dependencies(file)  → what does this file import?
kai_dependents(file)    → what imports this file?
```

**Note:** Kai tracks TS imports well. For Rust modules, fall back to LSP.

### Step 3: Precise references (LSP)

For key functions that will be modified:

```
lsp_find_references(file, line, character)  → all call sites
lsp_goto_definition(file, line, character)  → where defined
lsp_hover(file, line, character)            → type info
```

LSP is authoritative — always trust LSP over Kai for caller/callee data.

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

1. **Kai `kai_symbols`** — fast file overview (always works)
2. **Kai `kai_dependencies`** — file-level imports (TS only)
3. **LSP `lsp_find_references`** — precise function-level tracing
4. **LSP `lsp_hover`** — type information when needed
