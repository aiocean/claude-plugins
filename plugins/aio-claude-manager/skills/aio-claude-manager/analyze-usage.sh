#!/usr/bin/env bash
# Claude Manager - Usage Report
# Analyzes usage of skills, agents, and slash commands from history

HISTORY_FILE="$HOME/.claude/history.jsonl"
TRANSCRIPTS_DIR="$HOME/.claude/transcripts"
SKILLS_DIR="$HOME/.claude/skills"
AGENTS_DIR="$HOME/.claude/agents"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              CLAUDE CODE USAGE REPORT                        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============ SKILLS ============
echo -e "${BLUE}═══ SKILLS USAGE ═══${NC}"
echo ""

ACTIVE_SKILLS=$(ls "$SKILLS_DIR" 2>/dev/null | grep -v '_inactive' | grep -v '\.sh$' | grep -v '\.md$' | tr '\n' ' ')
INACTIVE_SKILLS=$(ls "$SKILLS_DIR/_inactive" 2>/dev/null | tr '\n' ' ')

TEMP_SKILLS=$(mktemp)

for skill in $ACTIVE_SKILLS $INACTIVE_SKILLS; do
    count=$(grep -c "\"display\":\"/$skill" "$HISTORY_FILE" 2>/dev/null | tr -d '\n' || echo "0")
    [[ -z "$count" ]] && count=0

    if echo "$ACTIVE_SKILLS" | grep -qw "$skill"; then
        status="active"
    else
        status="inactive"
    fi

    echo "$count|$skill|$status" >> "$TEMP_SKILLS"
done

printf "| %-30s | %11s | %-8s |\n" "Skill" "Invocations" "Status"
printf "|%-32s|%13s|%-10s|\n" "--------------------------------" "-------------" "----------"

sort -t'|' -k1 -rn "$TEMP_SKILLS" | while IFS='|' read -r count skill status; do
    if [ "$count" -gt 0 ]; then
        color=$GREEN
    elif [ "$status" = "active" ]; then
        color=$YELLOW
    else
        color=$NC
    fi
    printf "| %-30s | %11s | ${color}%-8s${NC} |\n" "$skill" "$count" "$status"
done

rm "$TEMP_SKILLS"
echo ""

# ============ AGENTS ============
echo -e "${BLUE}═══ AGENTS USAGE ═══${NC}"
echo ""

ACTIVE_AGENTS=$(ls "$AGENTS_DIR"/*.md 2>/dev/null | xargs -I{} basename {} .md | tr '\n' ' ')
INACTIVE_AGENTS=$(ls "$AGENTS_DIR/_inactive"/*.md 2>/dev/null | xargs -I{} basename {} .md | tr '\n' ' ')

TEMP_AGENTS=$(mktemp)

for agent in $ACTIVE_AGENTS $INACTIVE_AGENTS; do
    # Search for agent invocations in transcripts (Task tool with subagent_type)
    count=$(grep -l "\"subagent_type\":\"$agent\"" "$TRANSCRIPTS_DIR"/*.jsonl 2>/dev/null | wc -l | tr -d ' \n')
    [[ -z "$count" ]] && count=0

    if echo "$ACTIVE_AGENTS" | grep -qw "$agent"; then
        status="active"
    else
        status="inactive"
    fi

    echo "$count|$agent|$status" >> "$TEMP_AGENTS"
done

printf "| %-30s | %11s | %-8s |\n" "Agent" "Sessions" "Status"
printf "|%-32s|%13s|%-10s|\n" "--------------------------------" "-------------" "----------"

sort -t'|' -k1 -rn "$TEMP_AGENTS" | while IFS='|' read -r count agent status; do
    if [ "$count" -gt 0 ]; then
        color=$GREEN
    elif [ "$status" = "active" ]; then
        color=$YELLOW
    else
        color=$NC
    fi
    printf "| %-30s | %11s | ${color}%-8s${NC} |\n" "$agent" "$count" "$status"
done

rm "$TEMP_AGENTS"
echo ""

# ============ SLASH COMMANDS ============
echo -e "${BLUE}═══ TOP SLASH COMMANDS (from history) ═══${NC}"
echo ""

printf "| %-30s | %11s |\n" "Command" "Count"
printf "|%-32s|%13s|\n" "--------------------------------" "-------------"

# Extract slash commands from history
grep -oE '"display":"/[a-zA-Z_-]+' "$HISTORY_FILE" 2>/dev/null | \
    grep -oE '/[a-zA-Z_-]+' | \
    sort | uniq -c | sort -rn | head -15 | \
    while read -r count cmd; do
        printf "| %-30s | %11s |\n" "$cmd" "$count"
    done

echo ""

# ============ SUMMARY ============
echo -e "${BLUE}═══ SUMMARY ═══${NC}"
echo ""

total_active_skills=$(echo "$ACTIVE_SKILLS" | wc -w | tr -d ' ')
total_inactive_skills=$(echo "$INACTIVE_SKILLS" | wc -w | tr -d ' ')
total_active_agents=$(echo "$ACTIVE_AGENTS" | wc -w | tr -d ' ')
total_inactive_agents=$(echo "$INACTIVE_AGENTS" | wc -w | tr -d ' ')

echo "Skills:  $total_active_skills active, $total_inactive_skills inactive"
echo "Agents:  $total_active_agents active, $total_inactive_agents inactive"
echo ""

# ============ RECOMMENDATIONS ============
echo -e "${BLUE}═══ RECOMMENDATIONS ═══${NC}"
echo ""

# Find active skills with 0 usage
unused_skills=""
for skill in $ACTIVE_SKILLS; do
    count=$(grep -c "\"display\":\"/$skill" "$HISTORY_FILE" 2>/dev/null | tr -d '\n' || echo "0")
    [[ -z "$count" ]] && count=0
    if [ "$count" -eq 0 ]; then
        unused_skills="$unused_skills $skill"
    fi
done

# Find active agents with 0 usage
unused_agents=""
for agent in $ACTIVE_AGENTS; do
    count=$(grep -l "\"subagent_type\":\"$agent\"" "$TRANSCRIPTS_DIR"/*.jsonl 2>/dev/null | wc -l | tr -d ' \n')
    [[ -z "$count" ]] && count=0
    if [ "$count" -eq 0 ]; then
        unused_agents="$unused_agents $agent"
    fi
done

if [ -n "$unused_skills" ]; then
    echo -e "${YELLOW}Unused active skills:${NC}"
    echo "$unused_skills" | tr ' ' '\n' | grep -v '^$' | sed 's/^/  - /'
    echo ""
    echo -e "Disable: ${CYAN}manage.sh disable$unused_skills${NC}"
    echo ""
fi

if [ -n "$unused_agents" ]; then
    echo -e "${YELLOW}Unused active agents:${NC}"
    echo "$unused_agents" | tr ' ' '\n' | grep -v '^$' | sed 's/^/  - /'
    echo ""
    echo -e "Disable: ${CYAN}manage.sh agents disable$unused_agents${NC}"
    echo ""
fi

echo ""
echo -e "Legend: ${GREEN}used${NC} | ${YELLOW}active/unused${NC} | inactive"
