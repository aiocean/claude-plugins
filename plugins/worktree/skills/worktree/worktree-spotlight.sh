#!/bin/bash
# Spotlight: Live sync changes from worktree to main repo
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
        echo "Or run cleanup: worktree-cleanup.sh $MAIN_REPO_PATH"
        exit 1
    else
        echo "Warning: Found stale PID file, cleaning up..."
        rm -f "$PID_FILE" "$LOCK_FILE"
    fi
fi

# Check main repo is clean
if [ -n "$(git -C "$MAIN_REPO_PATH" status --porcelain)" ]; then
    echo "Error: Main repo has uncommitted changes."
    echo ""
    echo "Options:"
    echo "  1. Commit or stash your changes first"
    echo "  2. Run cleanup if this is leftover from crash: worktree-cleanup.sh $MAIN_REPO_PATH"
    exit 1
fi

# Write PID file
echo $$ > "$PID_FILE"

# Track synced files for cleanup
SYNCED_FILES_LOG="/tmp/spotlight-synced-$$"
touch "$SYNCED_FILES_LOG"

# Function to check if path should be excluded
should_exclude() {
    local rel_path="$1"
    [[ "$rel_path" == .git* ]] && return 0
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        [[ "$rel_path" == *"$pattern"* ]] && return 0
    done
    return 1
}

# Function to sync a single file
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

# Full sync: copy all changed/untracked files
do_full_sync() {
    cd "$WORKTREE_PATH"

    # Changed files
    git diff --name-only HEAD 2>/dev/null | while read -r file; do
        [ -n "$file" ] && sync_file "$file"
    done

    # Untracked files
    git ls-files --others --exclude-standard 2>/dev/null | while read -r file; do
        [ -n "$file" ] && sync_file "$file"
    done
}

# Cleanup: restore main repo to clean state
cleanup() {
    local exit_code=$?

    echo ""
    echo "Deactivating spotlight..."

    cd "$MAIN_REPO_PATH"

    # Restore all tracked files
    git checkout HEAD -- . 2>/dev/null || true

    # Clean untracked files
    git clean -fd 2>/dev/null || true

    # Remove temp/pid files
    rm -f "$SYNCED_FILES_LOG" "$PID_FILE" "$LOCK_FILE"
    rm -f /tmp/spotlight-state-$$ /tmp/spotlight-current-$$ 2>/dev/null || true

    echo "Main repo restored to clean state."
    exit $exit_code
}

# Set up signal handlers - catch everything
trap cleanup EXIT
trap 'exit 130' INT      # Ctrl+C
trap 'exit 143' TERM     # kill
trap 'exit 131' QUIT     # Ctrl+\
trap 'exit 129' HUP      # terminal closed

echo "Starting spotlight sync..."
echo "  Worktree: $WORKTREE_PATH"
echo "  Main repo: $MAIN_REPO_PATH"
echo "  Excludes: ${EXCLUDE_PATTERNS[*]:-none}"
echo "  PID: $$"
echo "  PID file: $PID_FILE"
echo ""
echo "To stop: Ctrl+C, or: kill $$"
echo ""

# Initial sync
echo "Initial sync..."
do_full_sync
echo "Initial sync complete."
echo ""

# Check for fswatch
if command -v fswatch &> /dev/null; then
    echo "Watching with fswatch..."
    FSWATCH_EXCLUDES=("--exclude" ".git")
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        FSWATCH_EXCLUDES+=("--exclude" "$pattern")
    done

    fswatch -r "${FSWATCH_EXCLUDES[@]}" "$WORKTREE_PATH" | while read -r changed_file; do
        rel_path="${changed_file#$WORKTREE_PATH/}"
        sync_file "$rel_path"
    done
else
    echo "Watching with polling (1s interval)..."
    echo "(Install fswatch for better performance: brew install fswatch)"
    echo ""

    # Store initial state
    LAST_STATE="/tmp/spotlight-state-$$"

    get_file_state() {
        cd "$WORKTREE_PATH"
        {
            git diff --name-only HEAD 2>/dev/null
            git ls-files --others --exclude-standard 2>/dev/null
        } | sort | uniq
    }

    get_file_state > "$LAST_STATE"

    while true; do
        sleep 1

        CURRENT_STATE="/tmp/spotlight-current-$$"
        get_file_state > "$CURRENT_STATE"

        # Find changed files
        diff "$LAST_STATE" "$CURRENT_STATE" 2>/dev/null | grep "^[<>]" | sed 's/^[<>] //' | sort | uniq | while read -r file; do
            [ -n "$file" ] && sync_file "$file"
        done

        mv "$CURRENT_STATE" "$LAST_STATE"
    done
fi
