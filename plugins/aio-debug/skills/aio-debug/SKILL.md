---
name: aio-debug
description: REACTIVE debugging — use when something is broken and needs fixing. Triggers: "debug", "fix bug", "fixbug", "investigate error", "troubleshoot", "why is this broken", "not working", "failing test", "unexpected behavior", runtime error, stack trace, crash, regression, or any bug/error/test failure to investigate and fix. NOT for planning new features — use aio-deep-plan instead. Orchestrates codebase context → root cause investigation → minimal fix → code review validation.
context: fork
agent: oh-my-claudecode:debugger
---

## Environment
- git: !`git --version 2>/dev/null || echo "NOT INSTALLED"`

# DebugFix - Systematic Debug & Fix Orchestrator

Orchestrate four specialized skills in sequence to maximize debugging effectiveness. Each phase builds on the previous, ensuring root cause is found before any code changes, and all changes are reviewed before completion.

## Orchestration Flow — Skill Graph

```
Phase 1: Understand Context
    /discover (AIO) + /deep-dive (OMC)
         |
Phase 2: Investigate Root Cause
    /superpowers:systematic-debugging + /oh-my-claudecode:trace
         |
Phase 3: Implement Fix
    /superpowers:test-driven-development (TDD)
         |
Phase 4: Verify & Review
    /superpowers:verification-before-completion → /aio-code-review
```

## Phase 1: Understand Context

Before debugging, understand the surrounding codebase using discovery skills:

1. Invoke `/discover` with the bug description — finds relevant files via GitNexus
2. For complex bugs spanning multiple modules, also invoke `/oh-my-claudecode:deep-dive` for deeper analysis
3. Identify: affected files, data flow, dependencies, recent changes to the area
4. Map the execution path from input to where the bug manifests

**Exit criteria**: Clear understanding of the code area, its patterns, and its dependencies.

## Phase 2: Investigate Root Cause

With codebase context established, apply systematic debugging rigor:

1. Invoke `/superpowers:systematic-debugging` — the gold standard 4-phase debugging methodology
2. Follow its iron law: **NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**
3. Execute all four phases:
   - **Root Cause Investigation**: Read errors, reproduce, check recent changes, trace data flow
   - **Pattern Analysis**: Find working examples, compare against references, identify differences
   - **Hypothesis and Testing**: Form specific hypothesis, test minimally (one variable at a time)
   - **Implementation Planning**: Plan the single fix addressing root cause

4. For complex causal chains, additionally invoke `/oh-my-claudecode:trace` — evidence-driven causal analysis with hypothesis ranking and disconfirmation

**Critical constraints**:
- Never guess. Gather evidence first
- One change at a time. Never shotgun multiple fixes
- Compare broken code against working examples in the same codebase

### Circuit Breaker — 3 Strikes Rule

Track each fix attempt explicitly (attempt 1, attempt 2, attempt 3). After **3 failed fix attempts**, STOP and escalate:

1. **Declare circuit breaker** — announce: "Circuit breaker triggered: 3 fix attempts failed. Stopping to reassess."
2. **Summarize all 3 attempts**: what was tried, what evidence was gathered, why each failed
3. **Re-anchor** — re-read the original bug report and all Phase 1-2 evidence from scratch. Fresh eyes after reset.
4. **Question the architecture**:
   - Is the root cause actually in this layer, or is it a design flaw one level up?
   - Are we fighting the framework/library instead of working with it?
   - Is there a simpler approach that sidesteps the problem entirely?
   - Should this component be restructured rather than patched?
5. **Present options to the user**:
   - Option A: Redesign the affected component (describe the approach)
   - Option B: Work around with explicit trade-offs (describe them)
   - Option C: Escalate to a human domain expert
6. **Do NOT attempt a 4th fix** without user approval of a fundamentally different approach

A circuit breaker is not failure — it prevents wasted time and regression-inducing guesses. The best debuggers know when to stop patching and start rethinking.

**Exit criteria**: Confirmed root cause with evidence. Single, specific fix identified.

## Phase 3: Implement Fix

With root cause confirmed and fix identified:

1. Follow `/superpowers:test-driven-development` — RED-GREEN-REFACTOR:
   - **RED**: Create a failing test that reproduces the bug
   - **GREEN**: Implement the single fix addressing root cause
   - **REFACTOR**: Clean up only what the fix touched
2. Run the full test suite to check for regressions
3. Type-check the changes (Swift: build, TS: `tsc --noEmit`, etc.)

**Constraints**:
- Fix only the root cause. Do not refactor surrounding code
- Do not add "while I'm here" improvements
- Keep the diff minimal and focused

## Phase 4: Verify & Review

After implementation, verify with evidence then review:

1. Invoke `/superpowers:verification-before-completion` — NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
   - Run tests, type-check, build — capture actual output
   - No hedging language ("should work", "probably fixed")
2. Then invoke `/aio-code-review` to launch parallel review agents
   - Security, quality, architecture checks via OMC agents
   - Critic meta-review with confidence scoring
3. If reviewers find critical issues, loop back to Phase 3
4. If reviewers find minor issues, fix them inline

**Exit criteria**: All verification passes with fresh evidence. All critical review findings addressed.

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
