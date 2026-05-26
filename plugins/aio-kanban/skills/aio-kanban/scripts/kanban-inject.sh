#!/bin/bash
# Inject kanban protocol block into project CLAUDE.md (v3: index + per-task files)
# Also copies status script to .kanban/ for CLAUDE.md dynamic execution
# Usage: kanban-inject.sh [path-to-claude-md]

CLAUDE_MD="${1:-CLAUDE.md}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
START_MARKER="<!-- kanban:start -->"

# Copy status script into project's .kanban/ so CLAUDE.md can reference it
mkdir -p .kanban
cp "$SCRIPT_DIR/kanban-status.sh" .kanban/status.sh
chmod +x .kanban/status.sh

INJECT_BLOCK='<!-- kanban:start -->
## Task Board

!`bash .kanban/status.sh 2>/dev/null`

Board: `.kanban/board.md` (index) | Tasks: `.kanban/tasks/T-NNN-slug.md` | Archive: `.kanban/archive/`

**Session start:** Read `.kanban/board.md`. For Doing tasks, open their task files.
**Session end:** Update `.kanban/board.md` — move completed task lines to Done, note blockers, update timestamp.

**Board line format** (one per task):
```
- [T-NNN](tasks/T-NNN-slug.md) Title — priority/effort
```

**Task file format** (`.kanban/tasks/T-NNN-slug.md`):
```
# T-NNN: Title
> One-line description
- **priority**: critical|high|medium|low
- **effort**: XS|S|M|L

## Criteria
- [ ] Acceptance criterion
```

**Rules:** WIP limit = 2 in Doing. Pick highest-priority from Todo. Never skip criteria checkboxes. Slug is kebab-case from title, ≤40 chars.
<!-- kanban:end -->'

if [ ! -f "$CLAUDE_MD" ]; then
  echo "[kanban] No $CLAUDE_MD found — create one first."
  exit 1
fi

# Write inject block to temp file for awk to read
BLOCK_TMP=$(mktemp)
echo "$INJECT_BLOCK" > "$BLOCK_TMP"

if grep -q "$START_MARKER" "$CLAUDE_MD"; then
  awk -v blockfile="$BLOCK_TMP" '
    /<!-- kanban:start -->/ {
      while ((getline line < blockfile) > 0) print line
      close(blockfile)
      skip=1; next
    }
    /<!-- kanban:end -->/ && skip { skip=0; next }
    !skip { print }
  ' "$CLAUDE_MD" > "${CLAUDE_MD}.tmp" && mv "${CLAUDE_MD}.tmp" "$CLAUDE_MD"
  echo "[kanban] Updated kanban block in $CLAUDE_MD"
else
  printf '\n%s\n' "$INJECT_BLOCK" >> "$CLAUDE_MD"
  echo "[kanban] Injected kanban block into $CLAUDE_MD"
fi

rm -f "$BLOCK_TMP"
