#!/usr/bin/env bash
set -Eeuo pipefail

# doc-quality-check.sh
#
# Validates documentation quality gates for codebase-oracle outputs.
#
# Usage:
#   scripts/doc-quality-check.sh [docs_dir]
#
# Environment:
#   DOC_CHECK_BASE_REF
#     Optional git base ref for drift check (recommended in CI).
#     Example: origin/main
#
# Exit codes:
#   0 if all checks pass
#   1 if any check fails

DOCS_DIR="${1:-docs}"

if [[ ! -d "${DOCS_DIR}" ]]; then
  echo "FAIL: docs directory not found: ${DOCS_DIR}" >&2
  exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "FAIL: ripgrep (rg) is required but not installed." >&2
  exit 1
fi

ERRORS=0
ORACLE_FILES=()

pass() {
  echo "PASS: $*"
}

fail() {
  echo "FAIL: $*" >&2
  ERRORS=$((ERRORS + 1))
}

collect_markdown_files() {
  local -a files=()
  while IFS= read -r line; do
    files+=("${line}")
  done < <(find "${DOCS_DIR}" -maxdepth 1 -type f -name '*.md' | sort)

  if [[ ${#files[@]} -eq 0 ]]; then
    fail "no markdown files found in ${DOCS_DIR}"
    return 1
  fi

  pass "found ${#files[@]} markdown file(s) in ${DOCS_DIR}"
  return 0
}

check_placeholders() {
  if rg -n --no-heading 'REPLACE' "${DOCS_DIR}"/*.md >/tmp/doc-quality-placeholders.out 2>/dev/null; then
    fail "placeholder values found (REPLACE)."
    cat /tmp/doc-quality-placeholders.out >&2
    return 1
  fi

  pass "no REPLACE placeholders found"
  return 0
}

collect_oracle_files() {
  ORACLE_FILES=()
  while IFS= read -r file; do
    ORACLE_FILES+=("${file}")
  done < <(rg -l '^## Oracle Validation' "${DOCS_DIR}"/*.md 2>/dev/null || true)

  if [[ ${#ORACLE_FILES[@]} -eq 0 ]]; then
    pass "no Oracle-enhanced files detected (skipping Oracle-specific checks)"
    return 0
  fi

  pass "detected ${#ORACLE_FILES[@]} Oracle-enhanced file(s)"
  return 0
}

check_required_oracle_sections() {
  local file
  local bad=0

  for file in "${ORACLE_FILES[@]}"; do
    if ! rg -q '^### Claim Ledger' "${file}"; then
      fail "${file}: missing section '### Claim Ledger'"
      bad=1
    fi

    if ! rg -q '^### Unknowns and Verification' "${file}"; then
      fail "${file}: missing section '### Unknowns and Verification'"
      bad=1
    fi
  done

  if [[ ${bad} -eq 0 ]]; then
    pass "required Oracle sections are present"
    return 0
  fi

  return 1
}

check_claim_evidence() {
  local file
  local bad=0

  for file in "${ORACLE_FILES[@]}"; do
    if ! awk '
      BEGIN { in_ledger = 0; bad = 0 }
      /^### Claim Ledger$/ { in_ledger = 1; next }
      in_ledger && /^### / { in_ledger = 0 }
      in_ledger && /^\|/ {
        if ($0 ~ /^\|[[:space:]]*Claim[[:space:]]*\|/) next
        if ($0 ~ /^\|[-[:space:]\|]+\|$/) next
        if ($0 !~ /`[^`]+:[0-9]+`/) {
          printf "%s:%d: claim row missing path:line evidence: %s\n", FILENAME, NR, $0
          bad = 1
        }
      }
      END { exit bad }
    ' "${file}" >/tmp/doc-quality-claim-evidence.out 2>&1; then
      fail "${file}: one or more claim rows are missing path:line evidence"
      cat /tmp/doc-quality-claim-evidence.out >&2
      bad=1
    fi
  done

  if [[ ${bad} -eq 0 ]]; then
    pass "claim ledger rows include path:line evidence"
    return 0
  fi

  return 1
}

check_unknown_discipline() {
  local file
  local bad=0

  for file in "${ORACLE_FILES[@]}"; do
    if rg -q '⚠ Review|\? Unknown|Unknown|uncertain|assumption|TBD|TODO' "${file}"; then
      if ! rg -q '^### Unknowns and Verification' "${file}"; then
        fail "${file}: uncertainty markers found but missing Unknowns section"
        bad=1
      fi
    fi
  done

  if [[ ${bad} -eq 0 ]]; then
    pass "uncertainty handling is explicit"
    return 0
  fi

  return 1
}

collect_changed_files() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return 0
  fi

  if [[ -n "${DOC_CHECK_BASE_REF:-}" ]]; then
    git diff --name-only "${DOC_CHECK_BASE_REF}...HEAD"
    return 0
  fi

  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    git diff --name-only HEAD~1..HEAD
    return 0
  fi

  git diff --name-only HEAD
}

is_code_like_path() {
  local path="${1}"
  case "${path}" in
    "${DOCS_DIR}"/*) return 1 ;;
  esac

  case "${path}" in
    *.go|*.py|*.js|*.jsx|*.ts|*.tsx|*.java|*.rb|*.rs|*.php|*.cs|*.swift|*.kt|*.sql|*.proto|*.graphql|*.yaml|*.yml|*.toml|*.json)
      return 0
      ;;
    */Dockerfile|*/Containerfile|*/Makefile|*/Jenkinsfile|Dockerfile|Containerfile|Makefile|Jenkinsfile)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

check_drift() {
  local -a changed=()
  local -a code_changed=()
  local -a docs_changed=()
  local path

  while IFS= read -r path; do
    [[ -z "${path}" ]] && continue
    changed+=("${path}")
  done < <(collect_changed_files)

  if [[ ${#changed[@]} -eq 0 ]]; then
    pass "drift check skipped: no git changes detected in comparison range"
    return 0
  fi

  for path in "${changed[@]}"; do
    if [[ "${path}" == "${DOCS_DIR}/"* ]] && [[ "${path}" == *.md ]]; then
      docs_changed+=("${path}")
    fi

    if is_code_like_path "${path}"; then
      code_changed+=("${path}")
    fi
  done

  if [[ ${#code_changed[@]} -gt 0 && ${#docs_changed[@]} -eq 0 ]]; then
    fail "drift detected: code-like files changed but no markdown files changed under ${DOCS_DIR}/"
    echo "Changed code-like files:" >&2
    printf '  - %s\n' "${code_changed[@]}" >&2
    return 1
  fi

  if [[ ${#code_changed[@]} -gt 0 ]]; then
    pass "drift check passed: code-like changes have accompanying docs changes"
    return 0
  fi

  pass "drift check passed: no code-like changes in comparison range"
  return 0
}

main() {
  collect_markdown_files || true
  check_placeholders || true
  collect_oracle_files || true

  if [[ ${#ORACLE_FILES[@]} -gt 0 ]]; then
    check_required_oracle_sections || true
    check_claim_evidence || true
    check_unknown_discipline || true
  fi

  check_drift || true

  if [[ ${ERRORS} -gt 0 ]]; then
    echo "doc-quality-check: ${ERRORS} check(s) failed." >&2
    exit 1
  fi

  echo "doc-quality-check: all checks passed."
  exit 0
}

main "$@"
