#!/bin/bash
# aio-rust-lints.sh — make clippy refuse panicking Rust.
#
#   bash aio-rust-lints.sh setup [crate-dir]   write the lint profile into Cargo.toml + clippy.toml
#   bash aio-rust-lints.sh check [crate-dir]   the gate: profile-enforced clippy, no lint escapes, tests
#
# check passes the profile on the clippy command line, so it holds for every crate of a
# workspace whatever its Cargo.toml says. setup makes the same profile visible to editors,
# plain `cargo clippy` and CI. Exit codes: 0 ok, 1 action needed (message says what), 2 usage.
set -euo pipefail

mode="${1:-}"
dir="${2:-.}"
manifest="$dir/Cargo.toml"

# Panic sites and silent-truncation sites clippy can refuse.
CLIPPY_LINTS=(
  unwrap_used expect_used panic todo unimplemented unreachable
  indexing_slicing string_slice arithmetic_side_effects cast_possible_truncation
)
# Tests may unwrap, panic and index: a failing test is the point.
CLIPPY_TOML_KEYS=(
  allow-unwrap-in-tests allow-expect-in-tests allow-panic-in-tests allow-indexing-slicing-in-tests
)

die() { echo "aio-rust-lints: $*" >&2; exit 2; }

[ -f "$manifest" ] || die "no Cargo.toml in $dir"

# Lint levels are deny, not forbid: #[tokio::main], #[derive(clap::Parser)] and similar
# macros emit #[allow(clippy::...)] into user code, which forbid turns into error E0453.
setup_manifest() {
  # A member with `[lints] workspace = true` takes its profile from the workspace root.
  if awk '/^\[/{t=$0} t=="[lints]" && /^[[:space:]]*workspace[[:space:]]*=[[:space:]]*true/{f=1} END{exit !f}' "$manifest"; then
    local up
    up=$(cd "$dir/.." && pwd)
    while [ "$up" != "/" ] && ! grep -qs '^\[workspace\]' "$up/Cargo.toml"; do up=$(dirname "$up"); done
    [ "$up" != "/" ] || die "$manifest inherits workspace lints but no parent [workspace] Cargo.toml was found"
    echo "Cargo.toml inherits [workspace.lints]; applying the profile to $up"
    # clippy.toml is found by searching up from each crate, so the root copy covers members.
    dir="$up"
    manifest="$up/Cargo.toml"
  fi
  local has_package=0 has_workspace=0 prefix="lints"
  grep -q '^\[package\]' "$manifest" && has_package=1
  grep -q '^\[workspace\]' "$manifest" && has_workspace=1
  [ "$has_workspace" = 1 ] && prefix="workspace.lints"

  # A lints table in any TOML spelling: [lints], [lints.clippy], [workspace.lints.x], or
  # dotted keys such as `lints.clippy.x = ...` inside [workspace].
  if grep -qE '^[[:space:]]*\[?(workspace\.)?lints([.[:space:]=]|\])' "$manifest"; then
    local missing=()
    grep -qE '^[[:space:]]*unsafe_code[[:space:]]*=.*"forbid"' "$manifest" || missing+=('unsafe_code = "forbid"   (rust table)')
    for lint in "${CLIPPY_LINTS[@]}"; do
      grep -qE "^[[:space:]]*${lint}[[:space:]]*=.*\"(deny|forbid)\"" "$manifest" || missing+=("$lint = \"deny\"   (clippy table)")
    done
    if [ "${#missing[@]}" -gt 0 ]; then
      echo "Cargo.toml already has lint settings; add or raise these in its existing tables (keep one entry per key):"
      printf '  %s\n' "${missing[@]}"
      exit 1
    fi
    echo "Cargo.toml: lint profile present"
    return
  fi

  {
    printf '\n[%s.rust]\nunsafe_code = "forbid"\n\n[%s.clippy]\n' "$prefix" "$prefix"
    printf '%s = "deny"\n' "${CLIPPY_LINTS[@]}"
    # A root package in a workspace manifest inherits nothing unless it opts in.
    [ "$has_workspace" = 1 ] && [ "$has_package" = 1 ] && printf '\n[lints]\nworkspace = true\n'
  } >>"$manifest"
  echo "Cargo.toml: added [$prefix.rust] and [$prefix.clippy]"
  if [ "$has_workspace" = 1 ]; then
    echo "Add to each member crate's Cargo.toml:  [lints]  workspace = true"
  fi
}

setup_clippy_toml() {
  local file="$dir/clippy.toml"
  [ -f "$dir/.clippy.toml" ] && file="$dir/.clippy.toml"
  touch "$file"
  # Appending to a file without a final newline would glue two keys onto one line.
  [ -s "$file" ] && [ -n "$(tail -c1 "$file")" ] && echo >>"$file"
  local wrong=()
  for key in "${CLIPPY_TOML_KEYS[@]}"; do
    if grep -qE "^[[:space:]]*${key}[[:space:]]*=[[:space:]]*true\b" "$file"; then continue; fi
    if grep -qE "^[[:space:]]*${key}[[:space:]]*=" "$file"; then wrong+=("$key = true"); continue; fi
    echo "$key = true" >>"$file"
  done
  if [ "${#wrong[@]}" -gt 0 ]; then
    echo "$(basename "$file") sets these keys to another value; change them to:"
    printf '  %s\n' "${wrong[@]}"
    exit 1
  fi
  echo "$(basename "$file"): test exemptions present"
}

check() {
  local flags=(-D warnings)
  for lint in "${CLIPPY_LINTS[@]}"; do flags+=(-D "clippy::$lint"); done
  (cd "$dir" && cargo clippy --all-targets --all-features -- "${flags[@]}")

  # deny can be overridden in source; the gate refuses that instead.
  local names
  names=$(IFS='|'; echo "${CLIPPY_LINTS[*]}|restriction")
  local escapes
  escapes=$(grep -rnE --include='*.rs' --exclude-dir=target \
    "#!?\[(allow|expect)\([^]]*clippy::($names)\b" "$dir" || true)
  if [ -n "$escapes" ]; then
    echo "Lint escapes in source (rewrite the code instead):"
    echo "$escapes"
    exit 1
  fi

  (cd "$dir" && cargo test --all-features)
}

case "$mode" in
  setup) setup_manifest; setup_clippy_toml ;;
  check) check ;;
  *) die "usage: aio-rust-lints.sh setup|check [crate-dir]" ;;
esac
