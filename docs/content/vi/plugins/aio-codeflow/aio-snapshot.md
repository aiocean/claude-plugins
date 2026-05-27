---
title: "aio-snapshot"
description: "Capture a GitNexus baseline of the codebase before coding so aio-review-quick can detect what changed afterwards."
document_type: "skill"
plugin: "aio-codeflow"
install: "/plugin install aio-codeflow@aiocean-plugins"
---

> From plugin [**aio-codeflow**](/vi/plugins/aio-codeflow) · `v2.0.0` · **Install:** `/plugin install aio-codeflow@aiocean-plugins`

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
