#!/bin/bash
# Merge worktree branch to its parent branch
# Usage: worktree-merge.sh [direction]
#   direction: "to-parent" (default) or "from-parent"
#
# Must be run from within a worktree directory

set -e

DIRECTION="${1:-to-parent}"

# Verify we're in a git worktree
if ! git rev-parse --git-dir &> /dev/null; then
    echo "Error: Not in a git repository"
    exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
REPO_ROOT=$(git rev-parse --show-toplevel)

# Find parent branch using merge-base
find_parent_branch() {
    local current="$1"
    local main_branch

    # Try to find main/master branch
    if git show-ref --verify --quiet refs/heads/main; then
        main_branch="main"
    elif git show-ref --verify --quiet refs/heads/master; then
        main_branch="master"
    else
        main_branch=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | cut -d: -f2 | xargs)
    fi

    # If current is main, no parent
    if [ "$current" = "$main_branch" ]; then
        echo ""
        return
    fi

    # Check if fully merged into main
    local merge_base_main=$(git merge-base "$current" "$main_branch" 2>/dev/null || echo "")
    local current_head=$(git rev-parse "$current")

    if [ "$merge_base_main" = "$current_head" ]; then
        echo "$main_branch"
        return
    fi

    # Find closest ancestor among other branches
    local best_parent="$main_branch"
    local best_distance=999999

    for branch in $(git for-each-ref --format='%(refname:short)' refs/heads/); do
        [ "$branch" = "$current" ] && continue

        local merge_base=$(git merge-base "$current" "$branch" 2>/dev/null || echo "")
        [ -z "$merge_base" ] && continue

        local branch_head=$(git rev-parse "$branch")

        # If merge_base equals branch head, this branch is an ancestor
        if [ "$merge_base" = "$branch_head" ]; then
            local distance=$(git rev-list --count "$merge_base".."$current" 2>/dev/null || echo 999999)
            if [ "$distance" -lt "$best_distance" ]; then
                best_distance=$distance
                best_parent=$branch
            fi
        fi
    done

    echo "$best_parent"
}

# Check if working directory is clean
check_clean() {
    local path="$1"
    if [ -n "$(git -C "$path" status --porcelain)" ]; then
        echo "Error: Working directory has uncommitted changes at $path"
        echo "Commit or stash changes before merging."
        exit 1
    fi
}

PARENT_BRANCH=$(find_parent_branch "$CURRENT_BRANCH")

if [ -z "$PARENT_BRANCH" ]; then
    echo "Error: Cannot find parent branch for '$CURRENT_BRANCH'"
    exit 1
fi

echo "Current branch: $CURRENT_BRANCH"
echo "Parent branch: $PARENT_BRANCH"
echo "Direction: $DIRECTION"
echo ""

if [ "$DIRECTION" = "to-parent" ]; then
    # Merge current branch into parent
    # Need to find parent's worktree or use main repo

    PARENT_WORKTREE=$(git worktree list --porcelain | grep -B2 "branch refs/heads/$PARENT_BRANCH" | grep "worktree" | cut -d' ' -f2 || echo "")

    if [ -z "$PARENT_WORKTREE" ]; then
        echo "Error: Parent branch '$PARENT_BRANCH' has no worktree."
        echo "Create a worktree for it first, or merge manually."
        exit 1
    fi

    check_clean "$PARENT_WORKTREE"

    echo "Merging '$CURRENT_BRANCH' into '$PARENT_BRANCH'..."
    cd "$PARENT_WORKTREE"

    if git merge --no-edit "$CURRENT_BRANCH"; then
        echo ""
        echo "Merge successful!"
        echo "Parent worktree updated at: $PARENT_WORKTREE"
    else
        echo ""
        echo "Merge conflict detected. Resolve conflicts in: $PARENT_WORKTREE"
        git merge --abort
        exit 1
    fi

elif [ "$DIRECTION" = "from-parent" ]; then
    # Merge parent into current branch
    check_clean "$REPO_ROOT"

    echo "Merging '$PARENT_BRANCH' into '$CURRENT_BRANCH'..."

    if git merge --no-edit "$PARENT_BRANCH"; then
        echo ""
        echo "Merge successful!"
    else
        echo ""
        echo "Merge conflict detected. Resolve conflicts manually."
        git merge --abort
        exit 1
    fi
else
    echo "Error: Invalid direction '$DIRECTION'. Use 'to-parent' or 'from-parent'"
    exit 1
fi
