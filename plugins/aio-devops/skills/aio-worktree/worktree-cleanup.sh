#!/bin/bash
# Emergency cleanup: restore main repo after crash/error
# Usage: worktree-cleanup.sh [repo_path]
#
# Run this if spotlight crashed or was killed unexpectedly
# and main repo is left in dirty state with synced files

set -e

REPO_PATH="${1:-.}"

# Resolve to absolute path
REPO_PATH=$(cd "$REPO_PATH" && pwd)

echo "Cleaning up repo: $REPO_PATH"
echo ""

cd "$REPO_PATH"

# Check if we're in a git repo
if ! git rev-parse --git-dir &> /dev/null; then
    echo "Error: Not a git repository"
    exit 1
fi

# Show current status
echo "Current status:"
git status --short
echo ""

# Confirm before proceeding
read -p "This will discard ALL uncommitted changes. Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Restoring tracked files to HEAD..."
git checkout HEAD -- .

echo "Removing untracked files..."
git clean -fd

# Clean up any leftover temp files from spotlight
rm -f /tmp/spotlight-state-* /tmp/spotlight-synced-* /tmp/spotlight-current-* 2>/dev/null || true

echo ""
echo "Cleanup complete!"
git status --short

if [ -z "$(git status --porcelain)" ]; then
    echo "(working tree clean)"
fi
