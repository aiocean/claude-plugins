#!/usr/bin/env bash
# control.sh — scaffold control/ from templates OR print protocol docs.
set -euo pipefail

WALKUP="${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-setup/scripts/walk-up.sh"
PROJECT_ROOT="$(bash "$WALKUP")" || exit 1
cd "$PROJECT_ROOT"

SUB="${1:-scaffold}"
TEMPLATES="${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-control/templates/control"

case "$SUB" in
  scaffold)
    if [[ -d "$PROJECT_ROOT/control" && -z "${FORCE:-}" ]]; then
      echo "ERROR: $PROJECT_ROOT/control already exists. Use FORCE=1 to overwrite." >&2
      exit 1
    fi
    mkdir -p "$PROJECT_ROOT/control"
    cp -R "$TEMPLATES/." "$PROJECT_ROOT/control/" 2>/dev/null || cp -r "$TEMPLATES/." "$PROJECT_ROOT/control/"
    chmod +x "$PROJECT_ROOT/control/"*.sh 2>/dev/null || true
    echo "[control] Scaffolded $(ls "$PROJECT_ROOT/control/" | wc -l | tr -d ' ') files into $PROJECT_ROOT/control/"
    echo "[control] See $PROJECT_ROOT/control/README.md for usage."
    echo "[control] Note: clients only work if your patches.json injects an HTTP control-channel (see docs/control-channel.md for the dirty-claude reference pattern)."
    ;;
  docs)
    DOCS="$PROJECT_ROOT/docs/control-channel.md"
    if [[ -f "$DOCS" ]]; then
      cat "$DOCS"
    else
      echo "ERROR: $DOCS not found. Re-run /aio-claude-toolkit:aio-patch-setup with FORCE=1 to refresh docs/." >&2
      exit 1
    fi
    ;;
  *)
    cat >&2 <<EOF
Usage: /aio-claude-toolkit:aio-patch-control [scaffold|docs]

  scaffold   Copy sample control/*.sh + client.ts into ./control/ (default)
  docs       Print docs/control-channel.md

Env: FORCE=1   Overwrite existing ./control/ on scaffold
EOF
    exit 1
    ;;
esac
