#!/bin/bash
# List all worktrees with their branch and status
# Usage: worktree-list.sh

set -e

echo "Worktrees:"
echo ""

git worktree list --porcelain | while read -r line; do
    case "$line" in
        "worktree "*)
            path="${line#worktree }"
            ;;
        "HEAD "*)
            head="${line#HEAD }"
            head_short="${head:0:7}"
            ;;
        "branch "*)
            branch="${line#branch refs/heads/}"
            # Get status
            if [ -n "$(git -C "$path" status --porcelain 2>/dev/null)" ]; then
                status="[dirty]"
            else
                status="[clean]"
            fi
            echo "  $branch $status"
            echo "    Path: $path"
            echo "    HEAD: $head_short"
            echo ""
            ;;
        "detached")
            echo "  (detached) at $head_short"
            echo "    Path: $path"
            echo ""
            ;;
    esac
done
