#!/bin/bash
# Submit feedback to aiocean/claude-plugins via GitHub Issues
# Usage: feedback-submit.sh <type> <title> <body>
#   type: bug | feature | plugin-request
#   title: issue title
#   body: issue body (markdown)

set -euo pipefail

REPO="aiocean/claude-plugins"

TYPE="${1:-}"
TITLE="${2:-}"
BODY="${3:-}"

if [ -z "$TYPE" ] || [ -z "$TITLE" ] || [ -z "$BODY" ]; then
  echo "Error: Missing required arguments"
  echo "Usage: feedback-submit.sh <type> <title> <body>"
  echo "  type: bug | feature | plugin-request"
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI (gh) is not installed."
  echo "Install it: https://cli.github.com/"
  exit 1
fi

if ! gh auth status &> /dev/null 2>&1; then
  echo "Error: Not authenticated with GitHub CLI."
  echo "Run: gh auth login"
  exit 1
fi

# Map type to label
case "$TYPE" in
  bug)
    LABEL="bug"
    ;;
  feature)
    LABEL="enhancement"
    ;;
  plugin-request)
    LABEL="plugin-request"
    ;;
  *)
    echo "Error: Invalid type '$TYPE'. Use: bug, feature, or plugin-request"
    exit 1
    ;;
esac

# Create the issue
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "$TITLE" \
  --body "$BODY" \
  --label "$LABEL" \
  2>&1)

echo "$ISSUE_URL"
