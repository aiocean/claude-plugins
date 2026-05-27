#!/usr/bin/env bash
# walk-up.sh — find the scaffolded project root by walking up from CWD.
#
# Looks for sentinel file `tools/pipeline/patch_cli.py` (created by aio-patch-setup).
# Walks up at most 10 levels (cap to avoid runaway when /, /usr, etc. lack a sentinel).
#
# Output: absolute path of project root on stdout (exit 0)
# Failure: prints hint to stderr, exits 1.
#
# Used by extract/compile/run/anchor/control skills as a first-run check.

set -euo pipefail

SENTINEL="tools/pipeline/patch_cli.py"
DIR="$PWD"

for _ in 1 2 3 4 5 6 7 8 9 10 11; do
  if [[ -f "$DIR/$SENTINEL" ]]; then
    echo "$DIR"
    exit 0
  fi
  PARENT="$(cd "$DIR" && cd .. && pwd)"
  if [[ "$PARENT" == "$DIR" ]]; then
    break  # hit filesystem root
  fi
  DIR="$PARENT"
done

cat >&2 <<EOF
ERROR: not in a scaffolded patch-claude project (no $SENTINEL found walking up from $PWD).

Run /aio-claude-toolkit:aio-patch-setup first to scaffold a project,
or cd into a directory under an existing scaffold.
EOF
exit 1
