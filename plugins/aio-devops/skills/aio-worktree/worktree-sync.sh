#!/bin/bash
# Sync worktree with parent branch using rebase + fast-forward
# Usage: worktree-sync.sh
#
# This keeps both branches at the same commits with same hashes.
# Workflow:
#   1. Rebase worktree onto parent (get latest + put your commits on top)
#   2. Fast-forward parent to worktree (now both identical)
#
# Must be run from within a worktree directory

set -e

if ! git rev-parse --git-dir &> /dev/null; then
    echo "Error: Not in a git repository"
    exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
REPO_ROOT=$(git rev-parse --show-toplevel)

# Find parent branch
find_parent_branch() {
    if git show-ref --verify --quiet refs/heads/main; then
        echo "main"
    elif git show-ref --verify --quiet refs/heads/master; then
        echo "master"
    else
        git remote show origin 2>/dev/null | grep 'HEAD branch' | cut -d: -f2 | xargs
    fi
}

PARENT_BRANCH=$(find_parent_branch)

if [ -z "$PARENT_BRANCH" ] || [ "$CURRENT_BRANCH" = "$PARENT_BRANCH" ]; then
    echo "Error: Cannot sync - already on parent branch or no parent found"
    exit 1
fi

# Find parent worktree path
PARENT_WORKTREE=$(git worktree list --porcelain | grep -B2 "branch refs/heads/$PARENT_BRANCH" | grep "worktree" | cut -d' ' -f2 || echo "")

if [ -z "$PARENT_WORKTREE" ]; then
    echo "Error: Parent branch '$PARENT_BRANCH' has no worktree"
    exit 1
fi

# Check for uncommitted changes
check_clean() {
    local path="$1"
    local name="$2"
    if [ -n "$(git -C "$path" status --porcelain)" ]; then
        echo "Error: $name has uncommitted changes"
        echo "Commit or stash changes first"
        exit 1
    fi
}

check_clean "$REPO_ROOT" "Worktree"
check_clean "$PARENT_WORKTREE" "Parent"

echo "Syncing: $CURRENT_BRANCH ↔ $PARENT_BRANCH"
echo "Worktree: $REPO_ROOT"
echo "Parent:   $PARENT_WORKTREE"
echo ""

# Check if there's anything to sync
WORKTREE_AHEAD=$(git rev-list --count "$PARENT_BRANCH".."$CURRENT_BRANCH" 2>/dev/null || echo "0")
PARENT_AHEAD=$(git rev-list --count "$CURRENT_BRANCH".."$PARENT_BRANCH" 2>/dev/null || echo "0")

if [ "$WORKTREE_AHEAD" = "0" ] && [ "$PARENT_AHEAD" = "0" ]; then
    echo "Already in sync!"
    exit 0
fi

echo "Status: worktree +$WORKTREE_AHEAD commits, parent +$PARENT_AHEAD commits"
echo ""

# Step 1: Rebase worktree onto parent
if [ "$PARENT_AHEAD" != "0" ]; then
    echo "=== Step 1: Rebase onto $PARENT_BRANCH ==="
    echo "Getting $PARENT_AHEAD commit(s) from parent..."

    if ! git rebase "$PARENT_BRANCH"; then
        echo ""
        echo "Rebase conflict! Resolve conflicts, then:"
        echo "  git rebase --continue"
        echo "  git rebase --abort (to cancel)"
        echo ""
        echo "After resolving, run worktree-sync.sh again."
        exit 1
    fi
    echo "Rebase complete!"
    echo ""
fi

# Step 2: Fast-forward parent to worktree
WORKTREE_AHEAD=$(git rev-list --count "$PARENT_BRANCH".."$CURRENT_BRANCH" 2>/dev/null || echo "0")

if [ "$WORKTREE_AHEAD" != "0" ]; then
    echo "=== Step 2: Fast-forward $PARENT_BRANCH ==="
    echo "Pushing $WORKTREE_AHEAD commit(s) to parent..."

    # Show commits being synced
    git log --oneline "$PARENT_BRANCH".."$CURRENT_BRANCH"
    echo ""

    if ! git -C "$PARENT_WORKTREE" merge --ff-only "$CURRENT_BRANCH"; then
        echo ""
        echo "Fast-forward failed! This shouldn't happen after rebase."
        echo "Try: git -C '$PARENT_WORKTREE' merge '$CURRENT_BRANCH'"
        exit 1
    fi
    echo "Fast-forward complete!"
    echo ""
fi

# Verify sync
FINAL_WORKTREE=$(git rev-parse HEAD)
FINAL_PARENT=$(git -C "$PARENT_WORKTREE" rev-parse HEAD)

if [ "$FINAL_WORKTREE" = "$FINAL_PARENT" ]; then
    echo "Sync complete!"
    echo "Both branches at: $(git rev-parse --short HEAD)"
else
    echo "Warning: Branches not aligned"
    echo "Worktree: $FINAL_WORKTREE"
    echo "Parent:   $FINAL_PARENT"
fi
