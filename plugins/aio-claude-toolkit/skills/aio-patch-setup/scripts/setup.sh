#!/usr/bin/env bash
# setup.sh — scaffold a new patching project from templates/.
#
# Usage:
#   setup.sh [target_dir]   # default: $PWD
#   FORCE=1 setup.sh ...    # overwrite generic scripts (preserves user content)
#
# Behavior: copies templates/tools, templates/docs, .gitignore, CLAUDE.md.template,
# README.md.template, VERSION into target. Excludes templates/control (owned by aio-patch-control).
# User content excluded from FORCE=1 overwrite: tools/pipeline/patches.json, sources/*.js (non-.example).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES="$SCRIPT_DIR/../templates"
TARGET="${1:-$PWD}"
mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"
FORCE="${FORCE:-}"

# Invariant check: templates/sources/ MUST NOT ship non-.example .js files.
# If it did, FORCE=1 refresh would clobber user patch bodies BEFORE the snapshot
# in the FORCE preservation block below could save them. Fail fast to force a
# maintainer fix if this invariant is ever broken upstream.
if find "$TEMPLATES/tools/pipeline/sources" -maxdepth 1 -type f -name '*.js' ! -name '*.example' 2>/dev/null | grep -q .; then
  echo "ERROR: templates/sources/ contains non-.example .js files. This would clobber user content on FORCE." >&2
  echo "Template invariant violated — investigate templates/." >&2
  exit 2
fi

echo "[setup] target: $TARGET"

if [[ -d "$TARGET/tools/pipeline" && -z "$FORCE" ]]; then
  cat >&2 <<EOF
ERROR: $TARGET already has tools/pipeline/. Refusing to overwrite.

Run with FORCE=1 to refresh generic scripts (your patches.json and sources/*.js stay).
EOF
  exit 1
fi

# 1. Generic infrastructure (always copy, FORCE may overwrite)
mkdir -p "$TARGET"

if [[ -n "$FORCE" && -d "$TARGET/tools/pipeline" ]]; then
  # Preserve user content during FORCE refresh
  USER_PATCHES="$(mktemp -d)"
  # Trap ensures snapshot dir is cleaned up even if cp -R below fails under set -e
  trap 'rm -rf "${USER_PATCHES:-}"' EXIT
  [[ -f "$TARGET/tools/pipeline/patches.json" ]] && \
    cp "$TARGET/tools/pipeline/patches.json" "$USER_PATCHES/patches.json"
  if [[ -d "$TARGET/tools/pipeline/sources" ]]; then
    # Only preserve non-.example .js files (those are user content)
    find "$TARGET/tools/pipeline/sources" -maxdepth 1 -type f -name '*.js' ! -name '*.example' \
      -exec cp {} "$USER_PATCHES/" \;
  fi
fi

# Use cp -R (preserves attributes; macOS-compatible) — fall back gracefully
cp -R "$TEMPLATES/tools" "$TARGET/" 2>/dev/null || cp -r "$TEMPLATES/tools" "$TARGET/"
cp -R "$TEMPLATES/docs"  "$TARGET/" 2>/dev/null || cp -r "$TEMPLATES/docs"  "$TARGET/"

# Restore user content after force overwrite
if [[ -n "$FORCE" && -d "${USER_PATCHES:-}" ]]; then
  if [[ -f "$USER_PATCHES/patches.json" ]]; then
    cp "$USER_PATCHES/patches.json" "$TARGET/tools/pipeline/patches.json"
    echo "[setup] preserved user patches.json"
  fi
  for f in "$USER_PATCHES"/*.js; do
    [[ -f "$f" ]] && cp "$f" "$TARGET/tools/pipeline/sources/" && \
      echo "[setup] preserved user $(basename "$f")"
  done
  # Cleanup handled by EXIT trap registered at snapshot time.
fi

# 2. Ancillary files (skip if user already has them, even without FORCE)
[[ -f "$TEMPLATES/.gitignore" && ! -f "$TARGET/.gitignore" ]] && \
  cp "$TEMPLATES/.gitignore" "$TARGET/.gitignore"
[[ -f "$TEMPLATES/CLAUDE.md.template" && ! -f "$TARGET/CLAUDE.md.example" ]] && \
  cp "$TEMPLATES/CLAUDE.md.template" "$TARGET/CLAUDE.md.example"
[[ -f "$TEMPLATES/README.md.template" && ! -f "$TARGET/README.md.example" ]] && \
  cp "$TEMPLATES/README.md.template" "$TARGET/README.md.example"

# 3. VERSION → hidden sentinel
[[ -f "$TEMPLATES/VERSION" ]] && cp "$TEMPLATES/VERSION" "$TARGET/.aio-patch-setup"

# 4. Dependency check (warn-only)
echo ""
echo "[setup] dependency check:"
bash "$SCRIPT_DIR/check-deps.sh" || true

# 5. Next steps hint
cat <<EOF

[setup] ✓ Scaffold complete at $TARGET

Next steps:
  1. cd $TARGET
  2. Edit tools/pipeline/patches.json (it is EMPTY — see tools/pipeline/patches.json.example for a reference)
  3. /aio-claude-toolkit:aio-patch-extract       # extract cli.js from your installed claude
  4. /aio-claude-toolkit:aio-patch-compile       # apply patches + bun build
  5. /aio-claude-toolkit:aio-patch-run [args]    # exec the patched binary

Optional:
  /aio-claude-toolkit:aio-patch-control scaffold   # install HTTP control-channel reference sample
  /aio-claude-toolkit:aio-patch-anchor find <pattern>  # find anchors in extracted cli.js

Reference sync info: cat $TARGET/.aio-patch-setup
EOF
