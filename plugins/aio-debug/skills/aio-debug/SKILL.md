---
name: aio-debug
description: This skill should be used when the user asks to "debug", "fix bug", "fixbug", "investigate error", "troubleshoot", "why is this broken", "not working", "failing test", "unexpected behavior", or encounters any bug, error, or test failure. Orchestrates systematic debugging with codebase understanding, code review, and quality verification for maximum fix effectiveness.
context: fork
agent: aio-debugger
---

# DebugFix - Systematic Debug & Fix Orchestrator

Orchestrate four specialized skills in sequence to maximize debugging effectiveness. Each phase builds on the previous, ensuring root cause is found before any code changes, and all changes are reviewed before completion.

## Orchestration Flow

```
Phase 1: Understand Context (feature-dev exploration)
    |
Phase 2: Investigate Root Cause (systematic-debugging)
    |
Phase 3: Implement Fix (with verification)
    |
Phase 4: Review & Validate (code review)
```

## Phase 1: Understand Context

Before debugging, understand the surrounding codebase. Invoke the feature-dev skill's exploration capabilities:

1. Invoke `/feature-dev:feature-dev` with the bug description
2. Focus on **Phase 1 (Discovery)** and **Phase 2 (Codebase Exploration)** only
3. Skip architecture design and implementation phases - the goal is understanding, not building
4. Identify: affected files, data flow, dependencies, recent changes to the area
5. Map the execution path from input to where the bug manifests

**Exit criteria**: Clear understanding of the code area, its patterns, and its dependencies.

## Phase 2: Investigate Root Cause

With codebase context established, apply systematic debugging rigor:

1. Invoke `/systematic-debugging`
2. Follow its iron law: **NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**
3. Execute all four phases:
   - **Root Cause Investigation**: Read errors, reproduce, check recent changes, trace data flow
   - **Pattern Analysis**: Find working examples, compare against references, identify differences
   - **Hypothesis and Testing**: Form specific hypothesis, test minimally (one variable at a time)
   - **Implementation Planning**: Plan the single fix addressing root cause

**Critical constraints from systematic-debugging**:
- Never guess. Gather evidence first
- One change at a time. Never shotgun multiple fixes
- If 3+ fix attempts fail, question the architecture
- Compare broken code against working examples in the same codebase

**Exit criteria**: Confirmed root cause with evidence. Single, specific fix identified.

## Phase 3: Implement Fix

With root cause confirmed and fix identified:

1. Create a failing test that reproduces the bug (when testable)
2. Implement the single fix addressing the root cause
3. Verify the fix resolves the failing test
4. Run the full test suite to check for regressions
5. Type-check the changes (Swift: build, TS: `tsc --noEmit`, etc.)

**Constraints**:
- Fix only the root cause. Do not refactor surrounding code
- Do not add "while I'm here" improvements
- Keep the diff minimal and focused

## Phase 4: Review & Validate

After implementation, run code review to catch issues:

1. Invoke `/review` to launch parallel code-reviewer agents
2. Review checks for:
   - Bugs and logic errors in the fix
   - Security vulnerabilities introduced
   - Code quality and convention adherence
   - Regression risks
3. If reviewers find critical issues, loop back to Phase 3
4. If reviewers find minor issues, fix them inline

**Exit criteria**: All critical review findings addressed. Fix is clean, minimal, and correct.

## Completion Summary

After all phases complete, provide:
- **Root cause**: What caused the bug (one sentence)
- **Fix**: What was changed and why (one sentence)
- **Files modified**: List of changed files
- **Verification**: Test results, type-check results
- **Review status**: Clean or with noted minor items

## When to Abbreviate

Not every bug needs all four phases at full depth:

| Bug complexity | Phases to use |
|---|---|
| Typo / obvious one-liner | Phase 2 (quick) + Phase 3 |
| Logic error in single file | Phase 2 + Phase 3 + Phase 4 |
| Cross-file / architectural | All four phases, full depth |
| Intermittent / race condition | All four phases, extra Phase 2 depth |

Even for simple bugs, always investigate before fixing (Phase 2 minimum).

## Anti-Patterns

- **Skipping to Phase 3** without understanding root cause
- **Fixing symptoms** instead of root cause
- **Multiple unrelated changes** in the fix
- **Skipping review** for "obvious" fixes (obvious fixes have non-obvious side effects)
- **Not reproducing** the bug before attempting to fix it

## Additional Resources

### Reference Files

For detailed guidance on each phase, consult:
- **`references/orchestration-details.md`** - Detailed phase transitions, decision points, and edge cases
