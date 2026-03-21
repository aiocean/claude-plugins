---
name: aio-plan
description: This skill should be used when the user asks to "plan implementation", "how should I implement", "approach", "strategy", or needs a concrete implementation plan with files, changes, and risks. Third step in the aio-deep-plan pipeline — run discover and map first. Uses GitNexus to check for duplicates and conventions.
context: fork
agent: oh-my-claudecode:planner
---

# Plan — Implementation Planning

Synthesize discovery and mapping results into a concrete, actionable implementation plan.

## Prerequisites

- Run `/discover` and `/map` first (or have equivalent understanding)
- GitNexus indexed (`npx gitnexus analyze`) for convention/duplication checks

## Workflow

### Step 1: Duplication check (GitNexus)

Search if similar features already exist using the GitNexus MCP `query` tool:

```
query("similar feature or pattern")
```

Prevents building what already exists.

### Step 2: Convention check (GitNexus)

Search for existing patterns to follow:

```
query("how are [similar things] implemented")
```

Examples: "tauri command structure", "hook cleanup pattern", "error handling in rust"

### Step 3: Context enrichment (GitNexus)

For each file you plan to modify, get full context:

```
context(file)
```

This reveals dependencies, dependents, and all symbols — helps identify:
- Functions that will be affected by your changes
- Files that import the file you're changing (blast radius)
- Existing symbols you can reuse instead of creating new ones

For the most critical change, check impact:

```
impact(file)
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

### Step 6: Execution handoff

After the plan is approved, choose an execution strategy:

| Strategy | When | Skill to invoke |
|----------|------|----------------|
| **Subagent-driven** (recommended for complex) | Multi-file, 5+ steps | `/superpowers:subagent-driven-development` — fresh agent per task with inter-task reviews |
| **Inline execution** | Simple, 2-4 steps | `/superpowers:executing-plans` — batched tasks in current session |
| **Manual** | User wants control | Hand the plan to the user |

For both automated strategies, the plan transitions through:
```
/plan → /superpowers:writing-plans (detailed plan)
      → /superpowers:subagent-driven-development (execute)
      → /superpowers:verification-before-completion (verify)
      → /superpowers:finishing-a-development-branch (wrap up)
```

## Principles

- Each business logic exists in ONE place only (SSOT)
- Logic that doesn't need UI goes in backend
- No workarounds — find root cause
- Every change must be easy to iterate on
- Don't add what isn't needed
