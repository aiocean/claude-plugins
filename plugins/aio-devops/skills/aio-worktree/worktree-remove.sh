#!/bin/bash
# Remove a worktree and its branch
# Usage: worktree-remove.sh <worktree_path_or_name> [--force]
# Example: worktree-remove.sh ../myrepo--feature
#          worktree-remove.sh feature  (if in main repo)
#          worktree-remove.sh feature --force  (skip dirty check)

set -e

TARGET="$1"
FORCE="$2"

if [ -z "$TARGET" ]; then
    echo "Usage: worktree-remove.sh <worktree_path_or_name> [--force]"
    exit 1
fi

# Resolve target to worktree path
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")
PARENT_DIR=$(dirname "$REPO_ROOT")
SHORT_NAME=""

if [ -d "$TARGET" ]; then
    WORKTREE_PATH=$(cd "$TARGET" && pwd)
    # Extract short name from folder: {repo}--wtr-{name} -> {name}
    FOLDER_NAME=$(basename "$WORKTREE_PATH")
    SHORT_NAME="${FOLDER_NAME#*--wtr-}"
else
    SHORT_NAME="$TARGET"
    # Folder: {repo}--wtr-{name}
    WORKTREE_PATH="$PARENT_DIR/${REPO_NAME}--wtr-${TARGET}"

    if [ ! -d "$WORKTREE_PATH" ]; then
        echo "Error: Cannot find worktree '$TARGET'"
        echo "Tried: $WORKTREE_PATH"
        exit 1
    fi
fi

# Branch: wtr-{name}
BRANCH_NAME="wtr-${SHORT_NAME}"

# Check for uncommitted changes
if [ "$FORCE" != "--force" ]; then
    if [ -n "$(git -C "$WORKTREE_PATH" status --porcelain 2>/dev/null)" ]; then
        echo "Error: Worktree has uncommitted changes!"
        echo ""
        git -C "$WORKTREE_PATH" status --short
        echo ""
        echo "Options:"
        echo "  1. Commit or stash changes first"
        echo "  2. Use --force to discard: worktree-remove.sh $TARGET --force"
        exit 1
    fi
fi

# Get main branch name to prevent deletion
MAIN_BRANCH=""
if git show-ref --verify --quiet refs/heads/main; then
    MAIN_BRANCH="main"
elif git show-ref --verify --quiet refs/heads/master; then
    MAIN_BRANCH="master"
fi

echo "Removing worktree: $WORKTREE_PATH"
[ -n "$BRANCH_NAME" ] && echo "Branch: $BRANCH_NAME"
echo ""

# Remove worktree
if ! git worktree remove --force "$WORKTREE_PATH" 2>/dev/null; then
    echo "Warning: git worktree remove failed, force deleting directory..."
    rm -rf "$WORKTREE_PATH"
fi

# Prune worktree records
git worktree prune

# Delete branch (unless it's main/master)
if [ -n "$BRANCH_NAME" ] && [ "$BRANCH_NAME" != "$MAIN_BRANCH" ]; then
    echo "Deleting branch '$BRANCH_NAME'..."
    git branch -D "$BRANCH_NAME" 2>/dev/null || echo "Warning: Could not delete branch"
fi

echo ""
echo "Worktree removed successfully!"
