---
name: aio-dream
description: |
  Memory consolidation — review, merge, prune and re-index memory files so future sessions orient quickly.
when_to_use: dream, consolidate memory, clean up memories, organize memories, memory maintenance, prune memories, merge memories, memory review
context: fork
---

# Dream: Memory Consolidation

You are performing a **dream** — a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

## Environment

- Memory directory: !`echo "${CLAUDE_MEMORY_DIR:-$HOME/.claude/projects/$(pwd | sed 's|/|-|g')/memory}"`
- Session transcripts: !`echo "${CLAUDE_PROJECT_DIR:-$HOME/.claude/projects/$(pwd | sed 's|/|-|g')}"` (JSONL files — each file is one past session)

## Phase 1 — Orient

1. `ls` the memory directory to see what already exists
2. Read `MEMORY.md` to understand the current index
3. Skim existing topic files so you **improve them rather than creating duplicates**
4. If `logs/` or `sessions/` subdirectories exist (assistant-mode layout), review recent entries there

## Phase 2 — Gather recent signal

Look for new information worth persisting. Sources in rough priority order:

1. **Daily logs** (`logs/YYYY/MM/YYYY-MM-DD.md`) if present — these are the append-only stream
2. **Existing memories that drifted** — facts that contradict something you see in the codebase now
3. **Session transcripts** — the transcript directory contains JSONL files of past sessions. Grep them for relevant context:
   ```bash
   grep -rn "<narrow term>" <transcript-dir>/ --include="*.jsonl" | tail -50
   ```
   Use narrow, specific terms relevant to what you found in Phase 1 (e.g., a project name, a tool, a decision topic). Read surrounding lines when a match looks valuable.

## Phase 3 — Consolidate

For each thing worth remembering, write or update a memory file at the top level of the memory directory.

### Memory file format

```markdown
---
name: {{memory name}}
description: {{one-line description — used to decide relevance in future conversations, so be specific}}
type: {{user | feedback | project | reference}}
---

{{memory content}}
```

### Memory types

| Type | What to store | Scope |
|------|--------------|-------|
| **user** | Role, goals, preferences, knowledge | Always private |
| **feedback** | User's guidance on approach — corrections AND confirmations | Private or team |
| **project** | Ongoing work, goals, bugs, incidents — NOT derivable from code/git | Bias toward team |
| **reference** | Pointers to external systems (Linear, Grafana, Slack, etc.) | Usually team |

### What NOT to save

- Code patterns, architecture, file paths, project structure (derivable from code)
- Git history, recent changes (use `git log`)
- Debugging solutions (the fix is in the code)
- Anything already in CLAUDE.md
- Ephemeral task details

### Consolidation rules

- **Merge** new signal into existing topic files rather than creating near-duplicates
- **Convert** relative dates ("yesterday", "last week") to absolute dates so they remain interpretable
- **Delete** contradicted facts — if today's investigation disproves an old memory, fix it at the source
- For **feedback** and **project** types, structure as: rule/fact, then `**Why:**` and `**How to apply:**` lines

## Phase 4 — Prune and index

Update `MEMORY.md` so it stays under **200 lines** AND under **~25KB**.

`MEMORY.md` is an **index**, not a dump — each entry should be one line under ~150 characters:

```
- [Title](file.md) — one-line hook
```

Never write memory content directly into `MEMORY.md`.

### Pruning checklist

- [ ] Remove pointers to memories that are now stale, wrong, or superseded
- [ ] Demote verbose entries: if an index line is over ~200 chars, move detail to the topic file
- [ ] Add pointers to newly important memories
- [ ] Resolve contradictions — if two files disagree, fix the wrong one
- [ ] Remove empty or near-empty memory files

## Output

Return a brief summary of what you consolidated, updated, or pruned. If nothing changed (memories are already tight), say so.

Format:

```markdown
## Dream Summary

**Reviewed:** N memory files
**Updated:** file1.md, file2.md
**Created:** new-topic.md
**Pruned:** old-stale.md
**MEMORY.md:** added 2 entries, removed 1, now at X/200 lines

### Changes
- Merged feedback about X into existing feedback_testing.md
- Created project_migration.md for the ongoing DB migration context
- Removed user_old_role.md (outdated, user changed teams)
- Converted relative dates in 3 files to absolute dates
```
