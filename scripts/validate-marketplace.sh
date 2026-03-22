#!/bin/bash
#
# validate-marketplace.sh
# Validates all plugins in the aiocean/claude-plugins marketplace for common issues.
#
# Checks:
#   1. plugin.json has required fields: name, description, version, author
#   2. Plugin folder name matches "name" in plugin.json
#   3. Every SKILL.md has YAML frontmatter with "name" and "description"
#   4. Scripts referenced in skills actually exist
#   5. Plugin is registered in root .claude-plugin/marketplace.json
#   6. Version in marketplace.json matches version in plugin.json
#   7. SKILL.md resolver block uses correct marketplace path pattern when scripts exist

set -euo pipefail

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# --- Counters ---
TOTAL_CHECKS=0
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
PLUGIN_COUNT=0
PLUGIN_PASS=0
PLUGIN_FAIL=0

# --- Paths ---
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"
MARKETPLACE_JSON="$REPO_ROOT/.claude-plugin/marketplace.json"

# --- Helpers ---
pass() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  PASS_COUNT=$((PASS_COUNT + 1))
  echo -e "  ${GREEN}PASS${RESET} $1"
}

fail() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  FAIL_COUNT=$((FAIL_COUNT + 1))
  CURRENT_PLUGIN_OK=false
  echo -e "  ${RED}FAIL${RESET} $1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  echo -e "  ${YELLOW}WARN${RESET} $1"
}

header() {
  echo ""
  echo -e "${BOLD}${CYAN}[$1]${RESET} $2"
}

# --- Pre-flight ---
if [ ! -d "$PLUGINS_DIR" ]; then
  echo -e "${RED}ERROR: plugins/ directory not found at $PLUGINS_DIR${RESET}"
  exit 1
fi

if [ ! -f "$MARKETPLACE_JSON" ]; then
  echo -e "${RED}ERROR: marketplace.json not found at $MARKETPLACE_JSON${RESET}"
  exit 1
fi

if ! jq empty "$MARKETPLACE_JSON" 2>/dev/null; then
  echo -e "${RED}ERROR: marketplace.json is not valid JSON${RESET}"
  exit 1
fi

echo -e "${BOLD}=== Claude Plugins Marketplace Validator ===${RESET}"
echo -e "${DIM}Repo: $REPO_ROOT${RESET}"
echo ""

# Load marketplace plugin names into associative arrays
declare -A MP_VERSIONS
declare -A MP_REGISTERED
while IFS='|' read -r mp_name mp_version; do
  MP_VERSIONS["$mp_name"]="$mp_version"
  MP_REGISTERED["$mp_name"]=1
done < <(jq -r '.plugins[] | "\(.name)|\(.version)"' "$MARKETPLACE_JSON")

# --- Validate each plugin ---
for plugin_dir in "$PLUGINS_DIR"/*/; do
  [ -d "$plugin_dir" ] || continue

  PLUGIN_NAME="$(basename "$plugin_dir")"
  PLUGIN_COUNT=$((PLUGIN_COUNT + 1))
  CURRENT_PLUGIN_OK=true
  PLUGIN_JSON="$plugin_dir/.claude-plugin/plugin.json"

  header "$PLUGIN_NAME" "$plugin_dir"

  # -------------------------------------------------------
  # Check 1: plugin.json exists and has required fields
  # -------------------------------------------------------
  if [ ! -f "$PLUGIN_JSON" ]; then
    fail "plugin.json not found at .claude-plugin/plugin.json"
    if $CURRENT_PLUGIN_OK; then PLUGIN_PASS=$((PLUGIN_PASS + 1)); else PLUGIN_FAIL=$((PLUGIN_FAIL + 1)); fi
    continue
  fi

  if ! jq empty "$PLUGIN_JSON" 2>/dev/null; then
    fail "plugin.json is not valid JSON"
    PLUGIN_FAIL=$((PLUGIN_FAIL + 1))
    continue
  fi

  pj_name="$(jq -r '.name // empty' "$PLUGIN_JSON")"
  pj_desc="$(jq -r '.description // empty' "$PLUGIN_JSON")"
  pj_version="$(jq -r '.version // empty' "$PLUGIN_JSON")"
  # Handle author as either string or object with .name
  pj_author="$(jq -r 'if .author | type == "object" then .author.name // empty elif .author | type == "string" then .author else empty end' "$PLUGIN_JSON")"

  if [ -n "$pj_name" ]; then
    pass "plugin.json has 'name': $pj_name"
  else
    fail "plugin.json missing 'name' field"
  fi

  if [ -n "$pj_desc" ]; then
    pass "plugin.json has 'description'"
  else
    fail "plugin.json missing 'description' field"
  fi

  if [ -n "$pj_version" ]; then
    pass "plugin.json has 'version': $pj_version"
  else
    fail "plugin.json missing 'version' field"
  fi

  if [ -n "$pj_author" ]; then
    pass "plugin.json has 'author': $pj_author"
  else
    fail "plugin.json missing 'author' field"
  fi

  # -------------------------------------------------------
  # Check 2: Plugin folder name matches "name" in plugin.json
  # -------------------------------------------------------
  if [ -n "$pj_name" ]; then
    if [ "$PLUGIN_NAME" = "$pj_name" ]; then
      pass "Folder name matches plugin.json name"
    else
      fail "Folder name '$PLUGIN_NAME' does not match plugin.json name '$pj_name'"
    fi
  fi

  # -------------------------------------------------------
  # Check 5: Plugin is registered in marketplace.json
  # -------------------------------------------------------
  if [ "${MP_REGISTERED[$PLUGIN_NAME]:-}" = "1" ]; then
    pass "Registered in marketplace.json"
  else
    fail "Not registered in marketplace.json"
  fi

  # -------------------------------------------------------
  # Check 6: Version in marketplace.json matches plugin.json
  # -------------------------------------------------------
  if [ "${MP_REGISTERED[$PLUGIN_NAME]:-}" = "1" ] && [ -n "$pj_version" ]; then
    mp_ver="${MP_VERSIONS[$PLUGIN_NAME]:-}"
    if [ "$pj_version" = "$mp_ver" ]; then
      pass "Version matches marketplace.json ($pj_version)"
    else
      fail "Version mismatch: plugin.json=$pj_version, marketplace.json=$mp_ver"
    fi
  fi

  # -------------------------------------------------------
  # Check 3, 4, 7: Validate each SKILL.md
  # -------------------------------------------------------
  skills_dir="$plugin_dir/skills"
  if [ ! -d "$skills_dir" ]; then
    warn "No skills/ directory found"
    if $CURRENT_PLUGIN_OK; then PLUGIN_PASS=$((PLUGIN_PASS + 1)); else PLUGIN_FAIL=$((PLUGIN_FAIL + 1)); fi
    continue
  fi

  skill_count=0
  for skill_dir in "$skills_dir"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name="$(basename "$skill_dir")"
    skill_md="$skill_dir/SKILL.md"

    skill_count=$((skill_count + 1))

    echo -e "  ${DIM}--- skill: $skill_name ---${RESET}"

    # Check 3: SKILL.md exists and has frontmatter
    if [ ! -f "$skill_md" ]; then
      fail "SKILL.md not found for skill '$skill_name'"
      continue
    fi

    # Extract YAML frontmatter (between first --- and second ---)
    frontmatter="$(awk '/^---$/{n++;next} n==1{print} n==2{exit}' "$skill_md")"

    if [ -z "$frontmatter" ]; then
      fail "SKILL.md for '$skill_name' has no YAML frontmatter"
      continue
    fi

    # Check frontmatter has "name" field
    fm_name="$(echo "$frontmatter" | grep -E '^name:\s*' | sed 's/^name:\s*//' | tr -d '[:space:]' || true)"
    if [ -n "$fm_name" ]; then
      pass "SKILL.md '$skill_name' has frontmatter 'name': $fm_name"
    else
      fail "SKILL.md '$skill_name' missing frontmatter 'name' field"
    fi

    # Check frontmatter has "description" field
    fm_desc="$(echo "$frontmatter" | grep -E '^description:\s*' || true)"
    if [ -n "$fm_desc" ]; then
      pass "SKILL.md '$skill_name' has frontmatter 'description'"
    else
      fail "SKILL.md '$skill_name' missing frontmatter 'description' field"
    fi

    # -------------------------------------------------------
    # Check 4: Scripts in the skill directory actually exist
    # -------------------------------------------------------
    has_scripts=false
    all_script_files=""

    # Collect script files from scripts/ subdirectory
    if [ -d "$skill_dir/scripts" ]; then
      # Find scripts by extension OR by executable bit (for extensionless scripts like yt-search)
      subdir_scripts="$(find "$skill_dir/scripts" -type f \( -name '*.sh' -o -name '*.py' -o -name '*.ts' -o -name '*.js' -o -perm +111 \) 2>/dev/null | grep -v '__pycache__' || true)"
      if [ -n "$subdir_scripts" ]; then
        has_scripts=true
        all_script_files="$subdir_scripts"
        script_count="$(echo "$subdir_scripts" | wc -l | tr -d ' ')"
        pass "scripts/ subdirectory has $script_count script file(s)"
      else
        warn "scripts/ subdirectory exists but contains no script files for '$skill_name'"
      fi
    fi

    # Collect script files from skill root (direct .sh/.py/.ts/.js, excluding SKILL.md)
    root_scripts="$(find "$skill_dir" -maxdepth 1 -type f \( -name '*.sh' -o -name '*.py' -o -name '*.ts' -o -name '*.js' \) 2>/dev/null || true)"
    if [ -n "$root_scripts" ]; then
      has_scripts=true
      if [ -n "$all_script_files" ]; then
        all_script_files="$all_script_files"$'\n'"$root_scripts"
      else
        all_script_files="$root_scripts"
      fi
      root_count="$(echo "$root_scripts" | wc -l | tr -d ' ')"
      pass "Skill root has $root_count script file(s)"
    fi

    # Check scripts referenced via $VARIABLE/ patterns in SKILL.md (e.g. $WT/worktree-create.sh)
    # This catches actual script invocations, not example code filenames
    # Match $VAR/script.{sh,py,ts,js} but exclude .json (data files, not scripts)
    var_refs="$(grep -oE '\$[A-Z_]+/[a-zA-Z0-9_.-]+\.(sh|py|ts|js)\b' "$skill_md" 2>/dev/null | grep -v '\.json' | sed 's/^\$[A-Z_]*\///' | sort -u || true)"
    if [ -n "$var_refs" ]; then
      while IFS= read -r ref_script; do
        [ -z "$ref_script" ] && continue
        found="$(find "$skill_dir" -name "$ref_script" -type f 2>/dev/null | head -1 || true)"
        if [ -z "$found" ]; then
          found="$(find "$plugin_dir" -name "$ref_script" -type f 2>/dev/null | head -1 || true)"
        fi
        if [ -n "$found" ]; then
          pass "Referenced script '\$VAR/$ref_script' exists"
        else
          fail "Referenced script '\$VAR/$ref_script' not found in skill or plugin"
        fi
      done <<< "$var_refs"
    fi

    # Also check scripts listed in markdown tables: | `script-name.sh` | ... |
    # Only validate table-listed scripts if this skill actually has a scripts/ directory
    # (to avoid false positives from template/scaffold tables that list project files)
    table_refs=""
    if $has_scripts; then
      table_refs="$(grep -oE '\|\s*`[a-zA-Z0-9_.-]+\.(sh|py|ts|js)`' "$skill_md" 2>/dev/null | grep -oE '[a-zA-Z0-9_.-]+\.(sh|py|ts|js)' | sort -u || true)"
    fi
    if [ -n "$table_refs" ]; then
      while IFS= read -r ref_script; do
        [ -z "$ref_script" ] && continue
        found="$(find "$skill_dir" -name "$ref_script" -type f 2>/dev/null | head -1 || true)"
        if [ -z "$found" ]; then
          found="$(find "$plugin_dir" -name "$ref_script" -type f 2>/dev/null | head -1 || true)"
        fi
        if [ -n "$found" ]; then
          pass "Table-listed script '$ref_script' exists"
        else
          fail "Table-listed script '$ref_script' not found in skill or plugin"
        fi
      done <<< "$table_refs"
    fi

    # -------------------------------------------------------
    # Check 7: Resolver block uses correct marketplace path pattern
    # -------------------------------------------------------
    if $has_scripts; then
      # Look for the resolver pattern in SKILL.md
      # Expected: ~/.claude/plugins/cache/aiocean-plugins/{plugin-name}/*/skills/{skill-name}
      resolver_line="$(grep 'claude/plugins/cache/aiocean-plugins/' "$skill_md" 2>/dev/null | head -1 || true)"

      if [ -n "$resolver_line" ]; then
        # Check it references the correct plugin name
        if echo "$resolver_line" | grep -q "aiocean-plugins/${PLUGIN_NAME}/"; then
          pass "Resolver references correct plugin name"
        else
          fail "Resolver does not reference plugin name '$PLUGIN_NAME'"
        fi

        # Check it references the correct skill name
        if echo "$resolver_line" | grep -q "skills/${skill_name}"; then
          pass "Resolver references correct skill name"
        else
          fail "Resolver does not reference skill name '$skill_name'"
        fi

        # Check it uses the wildcard version pattern /*/
        if echo "$resolver_line" | grep -qE "/${PLUGIN_NAME}/\\\*/skills/|/${PLUGIN_NAME}/\*/skills/"; then
          pass "Resolver uses version wildcard pattern"
        else
          fail "Resolver missing version wildcard (/*/) in path"
        fi
      else
        fail "Has scripts but SKILL.md lacks resolver block (~/.claude/plugins/cache/aiocean-plugins/...)"
      fi
    fi

  done

  if [ "$skill_count" -eq 0 ]; then
    warn "No skill subdirectories found in skills/"
  fi

  if $CURRENT_PLUGIN_OK; then
    PLUGIN_PASS=$((PLUGIN_PASS + 1))
  else
    PLUGIN_FAIL=$((PLUGIN_FAIL + 1))
  fi
done

# -------------------------------------------------------
# Check for marketplace entries with no matching plugin directory
# -------------------------------------------------------
echo ""
echo -e "${BOLD}${CYAN}[Orphaned Marketplace Entries]${RESET}"
orphan_found=false
for mp_name in "${!MP_REGISTERED[@]}"; do
  if [ ! -d "$PLUGINS_DIR/$mp_name" ]; then
    fail "Marketplace entry '$mp_name' has no matching plugin directory"
    orphan_found=true
  fi
done
if ! $orphan_found; then
  pass "All marketplace entries have matching plugin directories"
fi

# -------------------------------------------------------
# Summary
# -------------------------------------------------------
echo ""
echo -e "${BOLD}========================================${RESET}"
echo -e "${BOLD}           VALIDATION SUMMARY           ${RESET}"
echo -e "${BOLD}========================================${RESET}"
echo ""
echo -e "  Plugins scanned:   ${BOLD}$PLUGIN_COUNT${RESET}"
echo -e "  Plugins passing:   ${GREEN}${BOLD}$PLUGIN_PASS${RESET}"
echo -e "  Plugins failing:   ${RED}${BOLD}$PLUGIN_FAIL${RESET}"
echo ""
echo -e "  Total checks:      ${BOLD}$TOTAL_CHECKS${RESET}"
echo -e "  ${GREEN}PASS:  $PASS_COUNT${RESET}"
echo -e "  ${RED}FAIL:  $FAIL_COUNT${RESET}"
echo -e "  ${YELLOW}WARN:  $WARN_COUNT${RESET}"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}All checks passed!${RESET}"
  exit 0
else
  echo -e "  ${RED}${BOLD}$FAIL_COUNT check(s) failed. Please fix the issues above.${RESET}"
  exit 1
fi
