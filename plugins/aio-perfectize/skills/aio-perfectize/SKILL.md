---
name: aio-perfectize
description: |
  Use when the user asks to make finished work perfect or take it from good to
  perfect — "make it perfect", "make <file> perfect", "perfectize", "final
  pass", "last 10%", "polish this", "best version", "raise the bar", "hoàn
  thiện lần cuối", "nâng chuẩn" — for code, prose, a plan, an analysis or a UI
  that already passes its own checks.
when_to_use: |
  perfectize, make it perfect, good to perfect, final pass, last 10%, polish,
  raise the bar, best version, masterpiece, refine finished work, hoàn thiện,
  nâng chuẩn, đánh bóng lần cuối
effort: medium
---

# Perfectize

## Overview

Perfect here is a verified fixed point: no further change survives checking
against the bar. The pass edits work that already passes its own checks, keeps
everything the author fixed in place, and reports what it changed and what it
could not verify. It never calls the result perfect.

## Freeze first

Before the first edit, write the frozen core in your reply and snapshot the
incumbent (a `cp` or a git commit) so any edit can be reverted:

- requirements, in the user's words
- public interface: exports, signatures, file formats, headings others link to
- behavior pinned by existing tests; the tests themselves are frozen
- facts and numbers
- the author's voice: the distinctive phrases and rhythm that make it theirs
- scope: only the files or sections the user named

## Pass

1. **Remove first.** List every element that can go without changing the frozen
   core: dead code, duplicated logic, unused parameters, repeated or hedging
   sentences, orphan steps. Remove those. Describe this to yourself as editing
   and removing, not improving.
2. **One named gap per edit.** Every further change is one small edit that names
   the observable gap it closes: a failing check, a measurable size or speed, a
   requirement not yet shown. No named gap, no edit.
3. **Accept or revert.** Run the checks for the type (tests, build, type check,
   link check, recomputed numbers). Keep the edit only if every earlier-passing
   check still passes and the frozen core is unchanged; otherwise revert it. If
   only taste can decide, have a fresh-context subagent compare the two versions
   blind, in both orders; a split or a tie keeps the incumbent. With no
   subagent, make only the changes a check or the frozen core decides.
4. **Raise the bar.** After a cycle, compare the result with one exemplar (the
   user's, the project's own best, or a canonical work) and turn each observable
   gap into the next cycle's named gaps. Stop after two consecutive cycles that
   accept nothing, or after three cycles.

## Report

End with this block. Nothing in it claims perfection.

```
Released at cycle N. Tried K, accepted M, rejected J (reason each).
Checks run: <each check and its result>.
Independence: <same context | fresh subagent>.
Leftovers: <rejected edits, taste-level items, unverified axes, checks unavailable>.
```

"No change" is a valid result: say what was checked and why nothing survived.
A remaining improvement that touches the interface or most of the artifact goes
in Leftovers as an option and is left for the user to decide.

## Boundaries

Approving a change is `aio-code-review`'s job; this pass runs after approval.
Removing AI tells from prose is `aio-anti-slop`'s job; run it last. Cleanup of
changed code alone is `/simplify`.
