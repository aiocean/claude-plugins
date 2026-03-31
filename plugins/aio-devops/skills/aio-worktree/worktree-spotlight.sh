#!/bin/bash
# Spotlight: Live sync changes from worktree to main repo (one-way)
# Usage: worktree-spotlight.sh <worktree_path> <main_repo_path> [exclude_patterns...]
#
# This script watches the worktree for file changes and copies them to main repo.
# On exit (SIGINT/SIGTERM), it restores main repo to clean state.
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

# PID file for tracking
PID_FILE="/tmp/spotlight-$(echo "$MAIN_REPO_PATH" | md5 | cut -c1-8).pid"
LOCK_FILE="/tmp/spotlight-$(echo "$MAIN_REPO_PATH" | md5 | cut -c1-8).lock"

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Error: Spotlight already running for this repo (PID: $OLD_PID)"
        echo "Kill it first: kill $OLD_PID"
        exit 1
    else
        rm -f "$PID_FILE" "$LOCK_FILE"
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

should_exclude() {
    local rel_path="$1"
    [[ "$rel_path" == .git* ]] && return 0
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        [[ "$rel_path" == *"$pattern"* ]] && return 0
    done
    return 1
}

sync_file() {
    local rel_path="$1"
    local src="$WORKTREE_PATH/$rel_path"
    local dest="$MAIN_REPO_PATH/$rel_path"

    should_exclude "$rel_path" && return

    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"
        echo "$rel_path" >> "$SYNCED_FILES_LOG"
        echo "[sync] $rel_path"
    elif [ -f "$dest" ]; then
        rm "$dest"
        echo "[delete] $rel_path"
    fi
}

do_full_sync() {
    cd "$WORKTREE_PATH"
    git diff --name-only HEAD 2>/dev/null | while read -r file; do
        [ -n "$file" ] && sync_file "$file"
    done
    git ls-files --others --exclude-standard 2>/dev/null | while read -r file; do
        [ -n "$file" ] && sync_file "$file"
    done
}

cleanup() {
    echo ""
    echo "Deactivating spotlight..."
    cd "$MAIN_REPO_PATH"
    git checkout HEAD -- . 2>/dev/null || true
    git clean -fd 2>/dev/null || true
    rm -f "$SYNCED_FILES_LOG" "$PID_FILE" "$LOCK_FILE"
    rm -f /tmp/spotlight-state-$$ /tmp/spotlight-current-$$ 2>/dev/null || true
    echo "Main repo restored to clean state."
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "Spotlight sync (worktree → main)"
echo "  Worktree: $WORKTREE_PATH"
echo "  Main:     $MAIN_REPO_PATH"
echo "  Excludes: ${EXCLUDE_PATTERNS[*]:-none}"
echo "  PID:      $$"
echo ""
echo "To stop: Ctrl+C or kill $$"
echo ""

echo "Initial sync..."
do_full_sync
echo ""

if command -v fswatch &> /dev/null; then
    echo "Watching with fswatch..."
    EXCLUDES=("--exclude" ".git")
    for p in "${EXCLUDE_PATTERNS[@]}"; do EXCLUDES+=("--exclude" "$p"); done

    fswatch -r "${EXCLUDES[@]}" "$WORKTREE_PATH" | while read -r file; do
        rel="${file#$WORKTREE_PATH/}"
        sync_file "$rel"
    done
else
    echo "Polling mode (1s)..."
    LAST_STATE="/tmp/spotlight-state-$$"

    get_state() {
        cd "$WORKTREE_PATH"
        { git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; } | sort -u
    }

    get_state > "$LAST_STATE"

    while true; do
        sleep 1
        CUR="/tmp/spotlight-current-$$"
        get_state > "$CUR"
        diff "$LAST_STATE" "$CUR" 2>/dev/null | grep "^[<>]" | sed 's/^[<>] //' | sort -u | while read -r f; do
            [ -n "$f" ] && sync_file "$f"
        done
        mv "$CUR" "$LAST_STATE"
    done
fi
