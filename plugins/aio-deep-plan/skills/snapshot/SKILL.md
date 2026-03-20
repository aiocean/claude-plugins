---
name: aio-snapshot
description: This skill should be used when the user asks to "create snapshot", "baseline", "before I start coding", or needs a GitNexus baseline before implementation. Enables change detection in the review skill after coding to see what changed at the symbol level. Part of the aio-deep-plan pipeline.
---

# Snapshot — Create Baseline

Create a GitNexus baseline before coding so you can detect changes after.

## Prerequisites

- GitNexus indexed (`npx gitnexus analyze`)

## Workflow

### Step 1: Check freshness

```bash
npx gitnexus status
```

If stale, re-index. If fresh and recent (<5 min), skip to step 2.

### Step 2: Create baseline

```bash
npx gitnexus analyze
```

Note the current git HEAD or timestamp as your baseline reference.

### Step 3: Announce

```
Baseline recorded.
Ready to start implementation. Run `/review` after coding to detect changes against this baseline.
```

## Notes

- Re-run `npx gitnexus analyze` after large changes to keep the index fresh
- Save the baseline git ref (commit hash or branch) — useful for `/review`
- Create multiple baselines during long work sessions to track progress
