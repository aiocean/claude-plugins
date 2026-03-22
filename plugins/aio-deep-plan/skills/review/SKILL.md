---
name: aio-review
description: PROACTIVE planning — post-implementation validation in the aio-deep-plan pipeline. Use when validating completed work: "check my changes", "before I commit", "did I miss anything", "review implementation". Run snapshot before coding, then review after. NOT for debugging — use aio-debug. For full code review use aio-code-review.
context: fork
---

## Environment
- GitNexus: !`npx gitnexus status 2>/dev/null && echo "AVAILABLE" || echo "NOT INSTALLED"`

# Review — Post-Implementation Check

Review completed work using change detection, duplication detection, and type checking.

## Prerequisites

- Baseline snapshot from `/snapshot`
- GitNexus indexed (`npx gitnexus analyze`) for duplication check
- LSP for diagnostics

## Workflow

### Step 1: Change detection (GitNexus)

```
detect_changes()
```

For each changed file, get symbol context:

```
context(file)
```

### Step 2: Duplication check (GitNexus)

For each new function or significant code block, use the GitNexus MCP `query` tool:

```
query("description of new code")
```

Flag if similarity >0.75 — potential duplication or missed reuse.

### Step 3: Convention check (GitNexus)

```
query("pattern used in new code")
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

### Changes (from detect_changes)
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

Skip change detection. Just run:
1. `lsp_diagnostics` on changed files
2. One GitNexus duplication search via `query`
3. Quick convention check

## Skill Graph — What to invoke next

After review completes:

| Result | Next skill |
|--------|-----------|
| Review clean, ready to merge | `/superpowers:verification-before-completion` → `/superpowers:finishing-a-development-branch` |
| Issues found, needs fixes | Fix issues → re-run `/review` |
| Needs full code review (security, architecture) | `/aio-code-review` — multi-agent review with OMC agents |
| Want to extract learnings | `/aio-reflect` — capture knowledge from this session |
