---
name: plan
description: This skill should be used when the user asks to "plan implementation", "how should I implement", "approach", "strategy", or needs a concrete implementation plan with files, changes, and risks. Third step in the aio-deep-plan pipeline — run discover and map first. Uses aio-cocoindex to check for duplicates and conventions.
---

# Plan — Implementation Planning

Synthesize discovery and mapping results into a concrete, actionable implementation plan.

## Prerequisites

- Run `/discover` and `/map` first (or have equivalent understanding)
- CocoIndex available for convention/duplication checks
- Kai available for context enrichment

## Workflow

### Step 1: Duplication check (CocoIndex)

Search if similar features already exist:

```bash
.venv-cocoindex/bin/python .cocoindex/query.py "similar feature or pattern" --top-k 3
```

Prevents building what already exists.

### Step 2: Convention check (CocoIndex)

Search for existing patterns to follow:

```bash
.venv-cocoindex/bin/python .cocoindex/query.py "how are [similar things] implemented" --top-k 3
```

Examples: "tauri command structure", "hook cleanup pattern", "error handling in rust"

### Step 3: Context enrichment (Kai)

For each file you plan to modify, get full context:

```
kai_context(file, depth=2)
```

This reveals dependencies, dependents, and all symbols — helps identify:
- Functions that will be affected by your changes
- Files that import the file you're changing (blast radius)
- Existing symbols you can reuse instead of creating new ones

For the most critical change, check impact:

```
kai_impact(file, max_depth=3)
```

### Step 4: Write the plan

```
## Plan: [Feature/Fix Name]

### Goal
[One sentence: what and why]

### Discovery Summary
[Key findings from /discover]

### Approach
[High-level strategy: which layer handles what]

### Changes

#### 1. `file path` — [what changes]
- [ ] Add/modify function `X` to do Y
- [ ] Update type `Z`
- Reason: [why this file]

#### 2. `file path` — [what changes]
- [ ] ...

### Risks
- **[Risk]**: [Mitigation]

### Convention Check
- Follows: [existing pattern found]
- Deviates: [if any, with justification]

### NOT Doing
[Explicitly list out-of-scope items]
```

### Step 5: Create baseline

Run `/snapshot` before starting implementation.

## Principles

- Each business logic exists in ONE place only (SSOT)
- Logic that doesn't need UI goes in backend
- No workarounds — find root cause
- Every change must be easy to iterate on
- Don't add what isn't needed
