---
name: review
description: Use after implementation to review changes — semantic diff via Kai, duplication check via CocoIndex, type safety via LSP. Catches issues before committing. Trigger words — "review", "check my changes", "before I commit", "did I miss anything".
---

# Review — Post-Implementation Check

Review completed work using semantic diff, duplication detection, and type checking.

## Prerequisites

- Baseline snapshot from `/snapshot` (snapshot_id)
- CocoIndex available for duplication check
- LSP for diagnostics

## Workflow

### Step 1: Semantic diff (Kai)

```
kai_refresh()  → new_snapshot_id
kai_diff(base="[baseline_id]", head="[new_snapshot_id]")
```

For each changed file, get symbol changes:

```
kai_symbols(file, kind="function", signatures=true)
```

### Step 2: Duplication check (CocoIndex)

For each new function or significant code block:

```bash
.venv-cocoindex/bin/python .cocoindex/query.py "description of new code" --top-k 3
```

Flag if similarity >0.75 — potential duplication or missed reuse.

### Step 3: Convention check (CocoIndex)

```bash
.venv-cocoindex/bin/python .cocoindex/query.py "pattern used in new code" --top-k 3
```

Verify new code follows existing conventions.

### Step 4: Type safety (LSP)

```
lsp_diagnostics(file)           → errors in changed files
lsp_diagnostics_directory(dir)  → broader check
```

### Step 5: Output review report

```
## Review: [what was implemented]

### Changes (from kai_diff)
- `file-a.ts`: Added `fnX`, modified `fnY`
- `file-b.rs`: Added struct `Z`, new command `cmd`

### Duplication Check
- OK: No similar code found for `fnX`
- WARNING: `fnY` is 78% similar to `existingFn` in `other.ts`

### Convention Check
- OK: Follows pattern from `similar-file.ts`
- NOTE: [any deviations]

### Type Safety
- N errors, M warnings

### Checklist
- [ ] Logic in correct layer? (backend vs frontend)
- [ ] No duplicated business logic? (SSOT)
- [ ] Proper fix, not a workaround?
- [ ] Easy to change tomorrow? (iteration-first)
```

## Quick Review (small changes, <3 files)

Skip Kai diff. Just run:
1. `lsp_diagnostics` on changed files
2. One CocoIndex duplication search
3. Quick convention check
