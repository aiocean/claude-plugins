#!/bin/bash
# Claude Manager - Manage Claude Code skills, agents, and more
# Usage: manage.sh [command] [args...]

SKILLS_DIR="$HOME/.claude/skills"
SKILLS_INACTIVE="$HOME/.claude/skills_inactive"
AGENTS_DIR="$HOME/.claude/agents"
AGENTS_INACTIVE="$HOME/.claude/agents_inactive"

# Core skills that should never be disabled
CORE_SKILLS="claude-manager generate-skill code-review conventional-commit"

# ============ SKILLS ============

skills_status() {
    echo "=== SKILLS: ACTIVE ==="
    for d in "$SKILLS_DIR"/*/; do
        [ -d "$d" ] || continue
        name=$(basename "$d")
        [[ "$name" == _* || "$name" == .* ]] && continue
        if echo "$CORE_SKILLS" | grep -qw "$name"; then
            echo "  ✓ $name (core)"
        else
            echo "  ✓ $name"
        fi
    done

    echo -e "\n=== SKILLS: INACTIVE ==="
    if [ -d "$SKILLS_INACTIVE" ] && [ "$(ls -A "$SKILLS_INACTIVE" 2>/dev/null)" ]; then
        for d in "$SKILLS_INACTIVE"/*/; do
            [ -d "$d" ] || continue
            echo "  ○ $(basename "$d")"
        done
    else
        echo "  (none)"
    fi
}

skill_enable() {
    local name="$1"
    if [ -d "$SKILLS_INACTIVE/$name" ]; then
        mv "$SKILLS_INACTIVE/$name" "$SKILLS_DIR/"
        echo "✓ Enabled skill: $name"
    else
        echo "! Not found in inactive: $name"
    fi
}

skill_disable() {
    local name="$1"
    if echo "$CORE_SKILLS" | grep -qw "$name"; then
        echo "! Cannot disable core skill: $name"
        return 1
    fi
    if [ -d "$SKILLS_DIR/$name" ]; then
        mkdir -p "$SKILLS_INACTIVE"
        mv "$SKILLS_DIR/$name" "$SKILLS_INACTIVE/"
        echo "✓ Disabled skill: $name"
    else
        echo "! Not found: $name"
    fi
}

# ============ AGENTS ============

agents_status() {
    echo "=== AGENTS: ACTIVE ==="
    for f in "$AGENTS_DIR"/*.md; do
        [ -f "$f" ] || continue
        name=$(basename "$f" .md)
        echo "  ✓ $name"
    done

    echo -e "\n=== AGENTS: INACTIVE ==="
    if [ -d "$AGENTS_INACTIVE" ] && [ "$(ls -A "$AGENTS_INACTIVE" 2>/dev/null)" ]; then
        for f in "$AGENTS_INACTIVE"/*.md; do
            [ -f "$f" ] || continue
            echo "  ○ $(basename "$f" .md)"
        done
    else
        echo "  (none)"
    fi
}

agent_enable() {
    local name="$1"
    if [ -f "$AGENTS_INACTIVE/$name.md" ]; then
        mv "$AGENTS_INACTIVE/$name.md" "$AGENTS_DIR/"
        echo "✓ Enabled agent: $name"
    else
        echo "! Not found in inactive: $name"
    fi
}

agent_disable() {
    local name="$1"
    if [ -f "$AGENTS_DIR/$name.md" ]; then
        mkdir -p "$AGENTS_INACTIVE"
        mv "$AGENTS_DIR/$name.md" "$AGENTS_INACTIVE/"
        echo "✓ Disabled agent: $name"
    else
        echo "! Not found: $name"
    fi
}

# ============ PRESETS ============

preset() {
    local preset_name="$1"
    mkdir -p "$SKILLS_INACTIVE"

    case "$preset_name" in
        minimal)
            for d in "$SKILLS_DIR"/*/; do
                name=$(basename "$d")
                [[ "$name" == _* || "$name" == .* ]] && continue
                echo "$CORE_SKILLS" | grep -qw "$name" || skill_disable "$name"
            done
            ;;
        all|reset)
            [ -d "$SKILLS_INACTIVE" ] && mv "$SKILLS_INACTIVE"/* "$SKILLS_DIR/" 2>/dev/null
            [ -d "$AGENTS_INACTIVE" ] && mv "$AGENTS_INACTIVE"/* "$AGENTS_DIR/" 2>/dev/null
            echo "✓ All skills and agents enabled"
            ;;
        frontend)
            preset minimal
            for s in frontend-design neobrutalism; do skill_enable "$s" 2>/dev/null; done
            ;;
        backend)
            preset minimal
            for s in pm2-dev bun-fullstack-setup cloudflare socket-rpc; do skill_enable "$s" 2>/dev/null; done
            ;;
        ai)
            preset minimal
            for s in agent-sdk-session-management agent-sdk-structured-outputs collaborating-with-codex collaborating-with-gemini triumvirate prompt-engineering mental-models; do skill_enable "$s" 2>/dev/null; done
            ;;
        data)
            preset minimal
            for s in dagster-graphql notebooklm; do skill_enable "$s" 2>/dev/null; done
            ;;
        *)
            echo "Unknown preset: $preset_name"
            echo "Available: minimal, all, frontend, backend, ai, data"
            ;;
    esac
}

# ============ UTILITIES ============

detect() {
    local suggestions=""
    if [ -f "package.json" ]; then
        if grep -qE "vite|next|nuxt|vue|react" package.json 2>/dev/null; then
            suggestions="frontend"
        else
            suggestions="backend"
        fi
    fi
    [ -d "src-tauri" ] && suggestions="frontend"
    [ -f "dagster.yaml" ] || [ -f "prefect.yaml" ] && suggestions="data"
    [ -f "Cargo.toml" ] && suggestions="backend"

    if [ -n "$suggestions" ]; then
        echo "Detected: $suggestions project"
        echo "Suggested preset: $suggestions"
    else
        echo "No specific project type detected"
    fi
}

usage_analysis() {
    local script_dir="$(dirname "$0")"
    bash "$script_dir/analyze-usage.sh"
}

full_status() {
    skills_status
    echo ""
    agents_status
}

# ============ MAIN ============

case "$1" in
    # Full status
    status|s)
        full_status
        ;;

    # Skills
    skills)
        case "$2" in
            status|s) skills_status ;;
            enable|e) shift 2; for s in "$@"; do skill_enable "$s"; done ;;
            disable|d) shift 2; for s in "$@"; do skill_disable "$s"; done ;;
            *) skills_status ;;
        esac
        ;;

    # Agents
    agents)
        case "$2" in
            status|s) agents_status ;;
            enable|e) shift 2; for a in "$@"; do agent_enable "$a"; done ;;
            disable|d) shift 2; for a in "$@"; do agent_disable "$a"; done ;;
            *) agents_status ;;
        esac
        ;;

    # Quick skill commands (backwards compatible)
    enable|e) shift; for s in "$@"; do skill_enable "$s"; done ;;
    disable|d) shift; for s in "$@"; do skill_disable "$s"; done ;;

    # Other
    preset|p) preset "$2" ;;
    detect) detect ;;
    usage|u) usage_analysis ;;

    *)
        echo "Claude Manager - Manage skills, agents, and more"
        echo ""
        echo "Usage: manage.sh [command] [args...]"
        echo ""
        echo "Commands:"
        echo "  status              Show all skills and agents"
        echo "  skills [status|enable|disable] [names...]"
        echo "  agents [status|enable|disable] [names...]"
        echo "  enable <names...>   Enable skills (shortcut)"
        echo "  disable <names...>  Disable skills (shortcut)"
        echo "  preset <name>       Apply preset (minimal|all|frontend|backend|ai|data)"
        echo "  detect              Detect project type"
        echo "  usage               Analyze skill usage from history"
        ;;
esac
