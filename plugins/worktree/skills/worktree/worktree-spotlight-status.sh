#!/bin/bash
# Check spotlight status for a repo
# Usage: worktree-spotlight-status.sh [repo_path]

REPO_PATH="${1:-.}"
REPO_PATH=$(cd "$REPO_PATH" && pwd)

PID_FILE="/tmp/spotlight-$(echo "$REPO_PATH" | md5 | cut -c1-8).pid"

echo "Repo: $REPO_PATH"
echo ""

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Spotlight: RUNNING (PID: $PID)"
        echo ""
        echo "To stop: kill $PID"
    else
        echo "Spotlight: STALE (process $PID not found)"
        echo ""
        echo "Stale PID file exists. Run cleanup:"
        echo "  worktree-cleanup.sh $REPO_PATH"
    fi
else
    echo "Spotlight: NOT RUNNING"
fi

echo ""
echo "Repo status:"
if [ -n "$(git -C "$REPO_PATH" status --porcelain)" ]; then
    echo "  [dirty] - has uncommitted changes"
    git -C "$REPO_PATH" status --short | head -10
else
    echo "  [clean]"
fi
