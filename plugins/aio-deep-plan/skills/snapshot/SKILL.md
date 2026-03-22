---
name: aio-snapshot
description: PROACTIVE planning — baseline step in the aio-deep-plan pipeline. Use when the user wants change tracking: "create snapshot", "baseline", "before I start coding". Enables change detection in the review skill after coding. NOT for debugging — use aio-debug instead.
---

## Environment
- GitNexus: !`npx gitnexus status 2>/dev/null && echo "AVAILABLE" || echo "NOT INSTALLED"`

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
