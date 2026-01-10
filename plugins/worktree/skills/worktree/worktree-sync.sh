#!/bin/bash
# Bidirectional sync commits between worktree and parent branch
# Usage: worktree-sync.sh [direction]
#   direction: "push" | "pull" | "both" (default: both)
#
# push: Cherry-pick worktree commits to parent
# pull: Rebase/merge parent commits into worktree
# both: Pull first, then push
#
# Must be run from within a worktree directory

set -e

DIRECTION="${1:-both}"

if ! git rev-parse --git-dir &> /dev/null; then
    echo "Error: Not in a git repository"
    exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
REPO_ROOT=$(git rev-parse --show-toplevel)

# Find parent branch
find_parent_branch() {
    local current="$1"

    if git show-ref --verify --quiet refs/heads/main; then
        echo "main"
    elif git show-ref --verify --quiet refs/heads/master; then
        echo "master"
    else
        git remote show origin 2>/dev/null | grep 'HEAD branch' | cut -d: -f2 | xargs
    fi
}

PARENT_BRANCH=$(find_parent_branch "$CURRENT_BRANCH")

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

echo "Worktree:  $CURRENT_BRANCH @ $REPO_ROOT"
echo "Parent:    $PARENT_BRANCH @ $PARENT_WORKTREE"
echo "Direction: $DIRECTION"
echo ""

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

# Get commits unique to a branch since merge-base
get_unique_commits() {
    local branch="$1"
    local other="$2"
    git log --oneline "$other".."$branch" 2>/dev/null
}

# Pull: get parent commits into worktree
do_pull() {
    echo "=== PULL: $PARENT_BRANCH → $CURRENT_BRANCH ==="

    check_clean "$REPO_ROOT" "Worktree"

    # Fetch latest
    git fetch origin "$PARENT_BRANCH" 2>/dev/null || true

    # Get commits to pull
    local commits=$(get_unique_commits "$PARENT_BRANCH" "$CURRENT_BRANCH")

    if [ -z "$commits" ]; then
        echo "No new commits to pull from $PARENT_BRANCH"
        return 0
    fi

    echo "Commits to pull:"
    echo "$commits"
    echo ""

    # Rebase onto parent
    if git rebase "$PARENT_BRANCH"; then
        echo "Pull complete!"
    else
        echo "Rebase conflict. Resolve with:"
        echo "  git rebase --continue  (after fixing conflicts)"
        echo "  git rebase --abort     (to cancel)"
        exit 1
    fi
}

# Push: send worktree commits to parent
do_push() {
    echo "=== PUSH: $CURRENT_BRANCH → $PARENT_BRANCH ==="

    check_clean "$REPO_ROOT" "Worktree"
    check_clean "$PARENT_WORKTREE" "Parent"

    # Get commits to push
    local commits=$(get_unique_commits "$CURRENT_BRANCH" "$PARENT_BRANCH")

    if [ -z "$commits" ]; then
        echo "No new commits to push to $PARENT_BRANCH"
        return 0
    fi

    echo "Commits to push:"
    echo "$commits"
    echo ""

    # Get commit hashes (oldest first for cherry-pick)
    local commit_hashes=$(git log --reverse --format="%H" "$PARENT_BRANCH".."$CURRENT_BRANCH")

    # Cherry-pick to parent
    cd "$PARENT_WORKTREE"

    for hash in $commit_hashes; do
        local msg=$(git log -1 --format="%s" "$hash")
        echo "Cherry-picking: $msg"

        if ! git cherry-pick "$hash"; then
            echo ""
            echo "Cherry-pick conflict for: $msg"
            echo "Resolve in $PARENT_WORKTREE, then:"
            echo "  git cherry-pick --continue"
            echo "  git cherry-pick --abort (to cancel)"
            exit 1
        fi
    done

    cd "$REPO_ROOT"
    echo "Push complete! Commits now in $PARENT_BRANCH"
}

case "$DIRECTION" in
    pull)
        do_pull
        ;;
    push)
        do_push
        ;;
    both)
        do_pull
        echo ""
        do_push
        ;;
    *)
        echo "Error: Invalid direction '$DIRECTION'"
        echo "Use: push | pull | both"
        exit 1
        ;;
esac

echo ""
echo "Sync complete!"
