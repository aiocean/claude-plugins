---
name: snapshot
description: Use before starting implementation to create a Kai baseline snapshot. Enables semantic diffing after coding to see what changed at the symbol level. Trigger words — "snapshot", "baseline", "before I start coding".
---

# Snapshot — Create Baseline

Create a Kai snapshot before coding so you can diff after to see what changed.

## Prerequisites

- Kai initialized (`.kai/` directory)

## Workflow

### Step 1: Check freshness

```
kai_status()
```

If stale, refresh. If fresh and recent (<5 min), skip to step 2.

### Step 2: Create snapshot

```
kai_refresh(scope="all")
```

Record the returned `snapshot_id`.

### Step 3: Announce

```
Baseline snapshot: [snapshot_id]
Ready to start implementation. Run `/review` after coding to diff against this baseline.
```

## Notes

- Snapshots are lightweight — just indexes current state
- Use `scope="staged"` to only capture git-staged files
- Save the snapshot ID — you need it for `/review`
- Create multiple snapshots during long work sessions to track progress
