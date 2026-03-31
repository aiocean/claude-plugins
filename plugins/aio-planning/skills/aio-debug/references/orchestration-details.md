# DebugFix Orchestration Details

## Phase Transitions

### Phase 1 → Phase 2 Transition

Phase 1 (context understanding) is complete when:
- The execution path from input to bug manifestation is mapped
- All relevant files and their relationships are identified
- Recent changes to the affected area are reviewed
- The "normal" behavior (what should happen) is understood

Carry forward into Phase 2:
- List of affected files and their roles
- Data flow diagram (mental or written)
- Recent commits touching the area
- Expected vs actual behavior description

### Phase 2 → Phase 3 Transition

Phase 2 (root cause investigation) is complete when:
- A specific, falsifiable hypothesis exists
- Evidence supports the hypothesis (not just absence of alternatives)
- The hypothesis explains ALL observed symptoms, not just some
- A single, targeted fix is designed

Red flags that Phase 2 is not complete:
- "It might be X or Y" - still investigating, not ready to fix
- "I think it's probably..." - need more evidence
- "Let's try this and see" - this is guessing, not debugging
- The fix addresses a symptom rather than the cause

### Phase 3 → Phase 4 Transition

Phase 3 (implementation) is complete when:
- The fix is implemented (single change addressing root cause)
- Tests pass (both new test and existing suite)
- Type checking passes
- The diff is minimal and focused

### Phase 4 → Completion

Phase 4 (review) is complete when:
- Code reviewers found no critical issues, OR
- All critical issues from review are addressed
- The fix is verified to not introduce new problems

## Circuit Breaker — Detailed Protocol

The circuit breaker is the most important safety mechanism in debugging. It prevents the "just one more try" trap that leads to hours of wasted effort and regression-introducing patches.

### How to Track Attempts

Maintain an explicit counter. After each failed Phase 3 attempt:

```
Attempt 1/3: [What was tried] → [Why it failed]
Attempt 2/3: [What was tried] → [Why it failed]
Attempt 3/3: [What was tried] → [Why it failed]
⚡ CIRCUIT BREAKER TRIGGERED
```

A "failed attempt" means:
- The fix didn't resolve the original bug
- The fix resolved the bug but introduced new failures
- The fix resolved some symptoms but not all
- The fix required additional "patches on patches" to work

A "failed attempt" does NOT mean:
- A test that was supposed to fail did fail (that's TDD RED phase, not a fix attempt)
- You discovered more information and refined your hypothesis (that's still Phase 2)

### Re-anchor After Circuit Breaker

When the circuit breaker triggers, perform a full context reset:

1. **Re-read the original bug report** — what did the user actually say? Not your interpretation.
2. **Re-read Phase 1 evidence** — what files, what data flow, what dependencies?
3. **Re-read Phase 2 evidence** — what hypotheses were tested, what was ruled out?
4. **List what you know for certain** (observed facts, not interpretations)
5. **List what you assumed** — challenge each assumption

This fresh-eyes review often reveals the root cause was misidentified. The fix attempts failed not because the fix was wrong, but because the diagnosis was wrong.

### Architecture Questions Checklist

When questioning the architecture after circuit breaker:

- [ ] Is the bug in the right layer? (e.g., fixing frontend when the issue is backend validation)
- [ ] Is the abstraction appropriate? (e.g., fighting a framework's design instead of using its intended pattern)
- [ ] Is there a simpler design? (e.g., the component does too much and should be split)
- [ ] Is there a known pattern for this? (search codebase for similar solved problems)
- [ ] Would a different approach sidestep the problem entirely?

## Edge Cases

### Bug Cannot Be Reproduced

If the bug cannot be reproduced after Phase 2 investigation:
1. Document what was investigated and what was ruled out
2. Add logging or monitoring to capture the bug next time it occurs
3. Present findings to the user - do not guess at a fix
4. A non-reproducible bug with a guessed fix is worse than a documented investigation

### Root Cause Is in a Dependency

If Phase 2 reveals the root cause is in an external dependency:
1. Verify with a minimal reproduction that isolates the dependency
2. Check if the dependency has a known issue or fix
3. Options: update dependency, work around it, or fork/patch
4. Present options to the user with trade-offs

### Fix Causes Test Failures

If Phase 3 fix causes other tests to fail:
1. Do NOT modify the failing tests to make them pass
2. Investigate whether the tests are correct or the fix is wrong
3. If tests are correct, the fix is wrong - go back to Phase 2
4. If tests are outdated/wrong, fix the tests AND document why

### Multiple Bugs Discovered

If Phase 2 reveals multiple bugs:
1. Focus on the bug the user reported first
2. Document other bugs found during investigation
3. Fix one bug at a time, each through the full Phase 2-4 cycle
4. Never bundle multiple bug fixes into one change

## Skill Invocation Patterns

### Invoking feature-dev for context (Phase 1)

Use feature-dev's exploration capabilities without entering its full workflow:
- Launch code-explorer agents to understand the affected area
- Map file relationships and data flow
- Identify patterns and conventions in the codebase
- Do NOT proceed to architecture design or implementation phases

### Invoking systematic-debugging (Phase 2)

Follow the systematic-debugging skill exactly as written:
- Iron law: no fixes without investigation
- One variable at a time
- Evidence over assumptions
- Compare against working examples

### Invoking review (Phase 4)

Use the review skill to launch parallel code-reviewer agents:
- Reviewers check for bugs, security, quality, conventions
- Critical findings require fixes before completion
- Minor findings can be noted but don't block completion

## Severity-Based Depth Guide

### Critical Production Bug
- Full Phase 1-4 with maximum depth
- Extra focus on Phase 2 pattern analysis
- Phase 4 must include security review
- Document the incident for future reference

### Development Bug (Test Failure)
- Phase 1 can be lighter (codebase usually familiar)
- Phase 2 full depth
- Phase 3 must include test fix
- Phase 4 standard review

### UI/Visual Bug
- Phase 1: understand component hierarchy and styling
- Phase 2: compare against design specs or working components
- Phase 3: minimal CSS/layout fix
- Phase 4: visual verification (screenshot if possible)

### Performance Bug
- Phase 1: understand the performance-critical path
- Phase 2: profile and measure before hypothesizing
- Phase 3: implement fix with before/after benchmarks
- Phase 4: review for unintended performance impacts
