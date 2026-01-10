#!/bin/bash
# Spotlight: Bidirectional live sync between worktree and main repo
# Usage: worktree-spotlight.sh <worktree_path> <main_repo_path> [exclude_patterns...]
#
# Syncs changes in both directions:
#   - worktree → main: for hot reload preview
#   - main → worktree: edits made in main sync back
#
# On exit: main repo restored clean, worktree keeps all changes
#
# Uses fswatch if available, falls back to polling (1s interval)

set -e

WORKTREE_PATH="$1"
MAIN_REPO_PATH="$2"
shift 2 2>/dev/null || true
EXCLUDE_PATTERNS=("$@")

if [ -z "$WORKTREE_PATH" ] || [ -z "$MAIN_REPO_PATH" ]; then
    echo "Usage: worktree-spotlight.sh <worktree_path> <main_repo_path> [exclude_patterns...]"
    echo "Example: worktree-spotlight.sh ../myrepo--feature . node_modules dist .env"
    exit 1
fi

# Resolve to absolute paths
WORKTREE_PATH=$(cd "$WORKTREE_PATH" && pwd)
MAIN_REPO_PATH=$(cd "$MAIN_REPO_PATH" && pwd)

# Unique ID based on both paths
SPOTLIGHT_ID=$(echo "$MAIN_REPO_PATH:$WORKTREE_PATH" | md5 | cut -c1-8)
PID_FILE="/tmp/spotlight-$SPOTLIGHT_ID.pid"
LOCK_FILE="/tmp/spotlight-$SPOTLIGHT_ID.lock"
SYNC_LOCK="/tmp/spotlight-$SPOTLIGHT_ID.synclock"

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Error: Spotlight already running for this repo (PID: $OLD_PID)"
        echo "Kill it first: kill $OLD_PID"
        exit 1
    else
        rm -f "$PID_FILE" "$LOCK_FILE" "$SYNC_LOCK"
    fi
fi

# Check main repo is clean
if [ -n "$(git -C "$MAIN_REPO_PATH" status --porcelain)" ]; then
    echo "Error: Main repo has uncommitted changes."
    echo "Commit/stash first, or run: worktree-cleanup.sh $MAIN_REPO_PATH"
    exit 1
fi

echo $$ > "$PID_FILE"

SYNCED_FILES_LOG="/tmp/spotlight-synced-$$"
touch "$SYNCED_FILES_LOG"

# Prevent loops: track last sync
LAST_SYNC_FILE=""
LAST_SYNC_TIME=0

should_exclude() {
    local rel_path="$1"
    [[ "$rel_path" == .git* ]] && return 0
    [[ "$rel_path" == *.swp ]] && return 0
    [[ "$rel_path" == *~ ]] && return 0
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        [[ "$rel_path" == *"$pattern"* ]] && return 0
    done
    return 1
}

# Sync file with loop prevention
sync_file() {
    local rel_path="$1"
    local src_base="$2"
    local dest_base="$3"
    local label="$4"

    should_exclude "$rel_path" && return

    local src="$src_base/$rel_path"
    local dest="$dest_base/$rel_path"

    # Skip if files are identical
    if [ -f "$src" ] && [ -f "$dest" ]; then
        cmp -s "$src" "$dest" && return
    fi

    # Prevent sync loop: skip if we just synced this file
    local now=$(date +%s)
    if [ "$rel_path" = "$LAST_SYNC_FILE" ] && [ $((now - LAST_SYNC_TIME)) -lt 2 ]; then
        return
    fi

    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"
        echo "[$label] $rel_path"
        [ "$label" = "w→m" ] && echo "$rel_path" >> "$SYNCED_FILES_LOG"
    elif [ ! -f "$src" ] && [ -f "$dest" ]; then
        rm "$dest"
        echo "[del:$label] $rel_path"
    fi

    LAST_SYNC_FILE="$rel_path"
    LAST_SYNC_TIME=$now
}

sync_w2m() { sync_file "$1" "$WORKTREE_PATH" "$MAIN_REPO_PATH" "w→m"; }
sync_m2w() { sync_file "$1" "$MAIN_REPO_PATH" "$WORKTREE_PATH" "m→w"; }

get_changed_files() {
    local repo="$1"
    cd "$repo"
    { git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; } | sort -u
}

do_initial_sync() {
    get_changed_files "$WORKTREE_PATH" | while read -r f; do [ -n "$f" ] && sync_w2m "$f"; done
}

cleanup() {
    echo ""
    echo "Stopping spotlight..."

    # Final sync: main → worktree
    echo "Syncing main → worktree..."
    get_changed_files "$MAIN_REPO_PATH" | while read -r f; do [ -n "$f" ] && sync_m2w "$f"; done

    # Restore main
    cd "$MAIN_REPO_PATH"
    git checkout HEAD -- . 2>/dev/null || true
    git clean -fd 2>/dev/null || true

    rm -f "$SYNCED_FILES_LOG" "$PID_FILE" "$LOCK_FILE" "$SYNC_LOCK"
    rm -f /tmp/spotlight-*-$$ 2>/dev/null || true

    echo "Main repo: restored clean"
    echo "Worktree:  changes preserved at $WORKTREE_PATH"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "Bidirectional spotlight"
echo "  Worktree: $WORKTREE_PATH"
echo "  Main:     $MAIN_REPO_PATH"
echo "  Excludes: ${EXCLUDE_PATTERNS[*]:-none}"
echo "  PID:      $$"
echo ""
echo "Sync: worktree ↔ main (bidirectional)"
echo "Exit: Ctrl+C or kill $$"
echo ""

do_initial_sync
echo ""

if command -v fswatch &> /dev/null; then
    echo "Watching with fswatch..."

    EXCLUDES=("--exclude" ".git" "--exclude" ".swp" "--exclude" "~")
    for p in "${EXCLUDE_PATTERNS[@]}"; do EXCLUDES+=("--exclude" "$p"); done

    # Watch both, prefix with source identifier
    {
        fswatch -r "${EXCLUDES[@]}" "$WORKTREE_PATH" | sed 's/^/W:/' &
        fswatch -r "${EXCLUDES[@]}" "$MAIN_REPO_PATH" | sed 's/^/M:/' &
        wait
    } | while read -r event; do
        src="${event:0:1}"
        file="${event:2}"
        if [ "$src" = "W" ]; then
            rel="${file#$WORKTREE_PATH/}"
            [ "$rel" != "$file" ] && sync_w2m "$rel"
        elif [ "$src" = "M" ]; then
            rel="${file#$MAIN_REPO_PATH/}"
            [ "$rel" != "$file" ] && sync_m2w "$rel"
        fi
    done
else
    echo "Polling mode (1s)..."

    STATE_W="/tmp/spotlight-sw-$$"
    STATE_M="/tmp/spotlight-sm-$$"

    get_changed_files "$WORKTREE_PATH" > "$STATE_W"
    get_changed_files "$MAIN_REPO_PATH" > "$STATE_M"

    while true; do
        sleep 1

        # worktree → main
        CUR_W="/tmp/spotlight-cw-$$"
        get_changed_files "$WORKTREE_PATH" > "$CUR_W"
        comm -13 "$STATE_W" "$CUR_W" | while read -r f; do [ -n "$f" ] && sync_w2m "$f"; done
        mv "$CUR_W" "$STATE_W"

        # main → worktree
        CUR_M="/tmp/spotlight-cm-$$"
        get_changed_files "$MAIN_REPO_PATH" > "$CUR_M"
        comm -13 "$STATE_M" "$CUR_M" | while read -r f; do [ -n "$f" ] && sync_m2w "$f"; done
        mv "$CUR_M" "$STATE_M"
    done
fi
