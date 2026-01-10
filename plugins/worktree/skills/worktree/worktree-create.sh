#!/bin/bash
# Create a new git worktree with proper naming convention
# Usage: worktree-create.sh <name> [source_ref]
# Example: worktree-create.sh feature-login main
#          worktree-create.sh hotfix-bug abc123

set -e

NAME="$1"
SOURCE_REF="${2:-HEAD}"

if [ -z "$NAME" ]; then
    echo "Usage: worktree-create.sh <name> [source_ref]"
    echo "  name: Name for the new worktree/branch"
    echo "  source_ref: Branch, commit, or tag to base from (default: HEAD)"
    exit 1
fi

# Get repo info
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")
PARENT_DIR=$(dirname "$REPO_ROOT")

# Worktree path: sibling to main repo
WORKTREE_PATH="$PARENT_DIR/${REPO_NAME}--${NAME}"

# Check if already exists
if [ -d "$WORKTREE_PATH" ]; then
    echo "Error: Worktree already exists at $WORKTREE_PATH"
    exit 1
fi

# Prune stale worktrees first
git worktree prune

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$NAME"; then
    # Branch exists, checkout
    echo "Branch '$NAME' exists, checking out..."
    git worktree add "$WORKTREE_PATH" "$NAME"
else
    # Create new branch from source ref
    echo "Creating new branch '$NAME' from '$SOURCE_REF'..."
    git worktree add -b "$NAME" "$WORKTREE_PATH" "$SOURCE_REF"
fi

echo ""
echo "Worktree created successfully!"
echo "Path: $WORKTREE_PATH"
echo "Branch: $NAME"
echo ""
echo "To start working:"
echo "  cd $WORKTREE_PATH"
