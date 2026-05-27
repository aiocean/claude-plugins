#!/usr/bin/env bash
# Tests for walk-up.sh — must locate sentinel file from any subdir.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WALKUP="$SCRIPT_DIR/../scripts/walk-up.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { echo "FAIL: $1" >&2; exit 1; }
pass() { echo "PASS: $1"; }

# Setup fake project structure
mkdir -p "$TMP/proj/tools/pipeline"
touch "$TMP/proj/tools/pipeline/patch_cli.py"
mkdir -p "$TMP/proj/some/deep/sub/dir"

# Test 1: from project root
out="$(cd "$TMP/proj" && bash "$WALKUP")" || fail "test 1: exit non-zero from project root"
[[ "$out" == "$TMP/proj" ]] || fail "test 1: got '$out', expected '$TMP/proj'"
pass "from project root"

# Test 2: from deep subdir
out="$(cd "$TMP/proj/some/deep/sub/dir" && bash "$WALKUP")" || fail "test 2: exit non-zero from subdir"
[[ "$out" == "$TMP/proj" ]] || fail "test 2: got '$out', expected '$TMP/proj'"
pass "from deep subdir"

# Test 3: outside any project should exit non-zero
if (cd "$TMP" && bash "$WALKUP" 2>/dev/null); then
  fail "test 3: should have exited non-zero outside project"
fi
pass "exits non-zero outside project"

# Test 4: exactly 10 levels deep — at the cap, should be found
mkdir -p "$TMP/cap/l1/l2/l3/l4/l5/l6/l7/l8/l9/l10"
mkdir -p "$TMP/cap/tools/pipeline" && touch "$TMP/cap/tools/pipeline/patch_cli.py"
out="$(cd "$TMP/cap/l1/l2/l3/l4/l5/l6/l7/l8/l9/l10" && bash "$WALKUP")" || fail "test 4: should find project at exactly 10 levels up"
[[ "$out" == "$TMP/cap" ]] || fail "test 4: got '$out', expected '$TMP/cap'"
pass "finds at exactly 10 levels (cap)"

# Test 5: 11 levels deep — just past the cap, should NOT be found
mkdir -p "$TMP/deep/l1/l2/l3/l4/l5/l6/l7/l8/l9/l10/l11"
mkdir -p "$TMP/deep/tools/pipeline" && touch "$TMP/deep/tools/pipeline/patch_cli.py"
if (cd "$TMP/deep/l1/l2/l3/l4/l5/l6/l7/l8/l9/l10/l11" && bash "$WALKUP" 2>/dev/null); then
  fail "test 5: should NOT find project at 11 levels up (just past cap)"
fi
pass "does NOT find at 11 levels (past cap)"

echo "ALL TESTS PASSED"
