---
name: aio-reflect
description: Evaluate past Claude Code sessions and extract reusable knowledge as CLAUDE.md updates or new skills. Triggers: "reflect on sessions", "what did we learn", "save this knowledge", "extract learnings", after completing significant tasks.
context: fork
---

# Reflect

## Environment
- bun: !`which bun 2>/dev/null || echo "NOT INSTALLED"`
- Scripts: !`ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-reflect/*/skills/aio-reflect/scripts 2>/dev/null | sort -V | tail -1 || echo "NOT FOUND"`
- Memory dir: !`[ -d "$HOME/.claude/aio-reflect/memory" ] && echo "$HOME/.claude/aio-reflect/memory" || echo "NOT CREATED (will be created on first run)"`

**Purpose**: Turn transient learnings into permanent improvements. What separates growth from stagnation is the ability to learn from experience.

## Core Principles

1. **AI-First Analysis**: Don't programmatically detect patterns - let AI understand context, nuance, and intent
2. **Rule Violation Priority**: Strengthen violated rules before adding new ones (fewer, stronger rules > many weak rules)
3. **Skill Extraction Selectivity**: Only extract knowledge that is reusable, non-trivial, and verified
4. **Delta Updates**: Make incremental, targeted changes - never rewrite entire files
5. **Processed Tracking**: Track analyzed sessions to avoid re-analysis

## Quick Start

```bash
RF="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-reflect/*/skills/aio-reflect/scripts 2>/dev/null | sort -V | tail -1)"
MEMORY="$HOME/.claude/aio-reflect/memory"
mkdir -p "$MEMORY/diary" "$MEMORY/reflections"
```

Then call scripts as `bun run $RF/script-name`:

```bash
# Extract last 5 sessions with diary summary
bun run $RF/extract-session.ts <project-path> --last 5 --diary

# Full extraction with thinking blocks
bun run $RF/extract-session.ts <project-path> --last 5 --verbose

# Deep extraction with subagent conversations
bun run $RF/extract-session.ts <project-path> --last 5 --full --verbose

# JSON output for further processing
bun run $RF/extract-session.ts <project-path> --last 5 --json

# Stats only (cost, tokens, work mode, tasks)
bun run $RF/extract-session.ts <project-path> --last 10 --stats-only
```

## Data Extracted

The extractor deeply understands Claude Code's JSONL format and storage:

**Per session:**
- Full conversation (noise-filtered: isSidechain skipped, system tags stripped, internal messages removed)
- Token usage & estimated cost (model-specific pricing with long-context tiers, cache multipliers)
- Work mode classification: Exploration (Read/Grep/Glob) vs Building (Write/Edit) vs Testing (Bash/Agent)
- Subagent transcripts from `{uuid}/subagents/agent-*.jsonl`
- Task reconstruction from TaskCreate/TaskUpdate tool calls + `~/.claude/tasks/{uuid}/`
- Compaction events (auto/manual trigger, pre-compaction token count)
- Session chaining (resumed sessions via leaf_uuid/slug)
- File operations (reads, writes, edits with file paths)
- Model distribution (Opus/Sonnet/Haiku usage counts)
- Cache hit rates
- Session titles (from summary messages, correctly distinguished from compaction)
- Skills and agents invoked

**Aggregate (multiple sessions):**
- Total cost, tokens, duration, tool calls, subagents
- Aggregate work mode distribution
- Model distribution across sessions

## Workflow

### Phase 1: Setup

1. Create todo list for tracking progress
2. Get target project path (or use current directory)
3. Verify sessions exist:
   ```bash
   bun run $RF/get-project-path.ts <path> --check
   ```
3.5. (Optional) List all projects with sessions:
   ```bash
   bun run $RF/project-tree.ts --stats
   ```
4. Check for unprocessed sessions:
   ```bash
   # List sessions with stats to identify unprocessed ones
   bun run $RF/extract-session.ts <project-path> --stats-only
   # Then compare session IDs against $MEMORY/processed.json
   ```
5. Load existing CLAUDE.md rules (for violation detection)
6. Ask user how many sessions to analyze (default: 5)

### Phase 2: Extract Sessions

```bash
bun run $RF/extract-session.ts <project-folder> --last N --verbose
```

Output includes:

- Session metadata (date, duration, branch)
- Diary summary (task, files modified, work items)
- Full conversation with tool calls and results
- Thinking blocks (with --verbose)
- Skills and agents used
- Session statistics

### Phase 3: Analyze (AI does this)

Read the extracted sessions holistically. Let AI identify what matters - don't use keyword detection or bias towards "corrections".

**Core Question**: What knowledge from these sessions is **reusable** and can **evolve**?

**A. Check Rule Violations**

Compare session with existing CLAUDE.md rules:

- Was any existing rule violated?
- If yes → **Strengthen the rule first** (don't add new)

**B. Find Friction Points**

Detect patterns where user repeatedly has to:

- Remind AI of something every session
- Manually do something AI should handle
- Correct the same type of mistake
- Explain the same context again

Ask: What would make this friction disappear?

**C. Discover Preferences**

Patterns the user consistently shows across sessions:

- Tools/skills they always use or request
- Approaches they consistently prefer
- Implicit expectations made explicit through repetition

Only worth capturing if it appears **multiple times** across sessions.

**D. Extract Reusable Knowledge**

AI should freely identify knowledge that:

- **Repeats across sessions** - patterns, not one-off incidents
- **Can evolve** - builds upon existing knowledge
- **Is generalizable** - applies beyond this specific context

Skip:

- Context-specific corrections (already handled in the moment)
- One-time fixes (no reuse value)
- Things already obvious or in docs

**E. Evaluate Skill Candidates (Selective)**

Criteria for extracting a skill:

- [ ] Required >10 minutes investigation
- [ ] Solution was non-obvious (not just docs lookup)
- [ ] Has specific trigger conditions (error messages, symptoms)
- [ ] Solution was verified to work
- [ ] Would help someone facing same problem in future
- [ ] Doesn't duplicate existing skills/docs

Types of extractable knowledge:

- Non-obvious debugging techniques
- Error patterns where message was misleading
- Workarounds discovered through trial-and-error
- Configuration insights not in official docs
- Patterns specific to codebase or tech stack

### Phase 4: Synthesize

Present findings in structured format:

```markdown
## Reflection: [Project Name]

Analyzed [N] sessions from [date range]

### Rule Violations (if any)

- **Rule**: [existing rule text]
- **What happened**: [brief description]
- **Action**: Strengthen → [proposed new text]

### Friction Points

1. **Pattern**: [what user repeatedly has to do]
   **Frequency**: [how often across sessions]
   **Solution**: [what would eliminate this friction]

### Preferences

1. **Preference**: [what user consistently does/requests]
   **Evidence**: [sessions where this appeared]

### Reusable Knowledge

1. **Knowledge**: [what was learned]
   **Why reusable**: [how it applies beyond this session]

### Skill Candidates

1. **Problem**: [what problem this solves]
   **Trigger**: [when to use]
   **Worth creating?**: [Yes/No + reasoning]

### Proposed Changes

#### CLAUDE.md Updates

**Change**: [add/modify/strengthen]
**Text**: [exact text]
**Rationale**: [why this helps future sessions]

#### New Skills

[For each proposed skill]

**Name**: [kebab-case-name]
**Problem**: [one-line description]
**Trigger**: [error messages, symptoms]
**Evidence**: [session quote]
```

### Phase 5: Apply (with approval)

**IMPORTANT: Never create or modify files without explicit user approval.**

**Step 1: Ask which changes to apply**

Present all proposed changes and ask:
"Which of these should I apply?"

Options:

- "all" - apply everything
- "1, 3, 5" - apply specific items by number
- "none" - cancel
- "just CLAUDE.md" / "just skills" - filter by type

**Step 2: Apply CLAUDE.md updates**

For rule violations (strengthen existing):

1. Read current CLAUDE.md
2. Find the violated rule
3. Strengthen it (don't add new rule)
4. Show diff for confirmation

For new rules:

1. Read current CLAUDE.md
2. Add new rules at appropriate location
3. Show diff for confirmation

**Step 3: Create skills (if approved)**

1. Research best practices (web search) if technology-specific
2. Use skill template (below)
3. Show full skill content for review
4. Ask: "Confirm creation?"
5. Create file only after confirmation

**Step 4: Mark sessions as processed**

Update `$MEMORY/processed.json`:

```json
{
  "sessions": {
    "session-id": {
      "project": "/path/to/project",
      "processedAt": "2026-01-18T12:00:00Z",
      "learningsApplied": 3
    }
  }
}
```

**Step 5: Write diary entry (optional)**

If user wants, save reflection to `$MEMORY/diary/YYYY-MM-DD-reflection.md`

## Skill Template

```markdown
---
name: [kebab-case-name]
description: |
  [Problem + exact trigger conditions + what it solves.
  Include specific error messages, symptoms, or scenarios.
  Use phrases like "Use when:", "Helps with:", "Solves:"]
author: Claude Code
version: 1.0.0
date: [YYYY-MM-DD]
---

# [Skill Name]

## Problem

[What problem this addresses - be specific]

## Trigger Conditions

- [Exact error message 1]
- [Exact error message 2]
- [Observable symptom or behavior]
- [Environmental condition]

## Solution

### Step 1: [First Action]

[Detailed instructions]

### Step 2: [Second Action]

[Continue with clear steps]

## Verification

1. [How to verify step 1]
2. [Expected outcome]

## Example

**Scenario**: [When this applies]

**Before**:
[Error or problematic state]

**After**:
[Fixed state]

## Notes

- [Caveats]
- [Edge cases]
- [When NOT to use]

## References

- [Official docs if consulted]
- [Articles or resources]
```

**Save locations:**

- Project-specific: `.claude/skills/[name]/SKILL.md`
- User-wide: `~/.claude/skills/[name]/SKILL.md`

## Scripts Reference

| Script                                                                                          | Purpose                               |
| ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| `extract-session.ts <target> [--last N] [--json] [--verbose] [--stats-only] [--diary] [--full]` | Extract sessions with full context    |
| `get-project-path.ts <path> [--check]`                                                          | Convert path & check sessions exist   |
| `project-tree.ts [--stats] [--json]`                                                            | List all projects with session counts |

### extract-session.ts Options

| Flag           | Purpose                                                      |
| -------------- | ------------------------------------------------------------ |
| `--last N`     | Only process last N sessions (by date)                       |
| `--json`       | Output as JSON (for piping to other tools)                   |
| `--verbose`    | Include thinking blocks and compaction details               |
| `--stats-only` | Only show statistics, not full conversation                  |
| `--diary`      | Only show diary summary (task, files, cost, work mode)       |
| `--full`       | Include subagent conversations and longer tool results       |

## Memory Directory

Located at `~/.claude/aio-reflect/memory/` (stable across upgrades, not inside versioned cache):

```
~/.claude/aio-reflect/memory/
├── diary/              # Reflection summaries
├── reflections/        # Session-specific notes
└── processed.json      # Tracking analyzed sessions
```

## Quality Criteria

**Before strengthening a rule:**

- [ ] Rule was actually violated (has evidence)
- [ ] Strengthening makes it clearer/more prominent
- [ ] Won't conflict with other rules

**Before adding a new CLAUDE.md rule:**

- [ ] Based on actual evidence from sessions (has quote)
- [ ] Not already covered by existing rules
- [ ] Specific enough to be actionable
- [ ] Prevents a real problem that occurred
- [ ] Won't add unnecessary friction

**Before creating a new Skill:**

- [ ] Knowledge is reusable (not one-time fix)
- [ ] Solution required discovery (not just docs lookup)
- [ ] Has specific trigger conditions (error messages, symptoms)
- [ ] Solution has been verified to work
- [ ] Doesn't duplicate existing skills or official docs
- [ ] Would help future sessions facing same problem

## Anti-Patterns to Avoid

1. **Over-extraction**: Not every session deserves a skill
2. **Vague rules**: "Be more careful" doesn't help
3. **Duplicate rules**: Check existing rules first
4. **Unverified solutions**: Only extract what actually worked
5. **Re-analyzing**: Check processed.json before analyzing
6. **Batch changes**: Apply changes incrementally, confirm each

## Tips

1. **Start small**: Analyze 3-5 sessions first
2. **Read thinking blocks**: They reveal assumptions
3. **Focus on reusability**: Knowledge that applies beyond this session
4. **Be specific**: "Always use bun instead of npm" > "Be flexible with tools"
5. **Strengthen first**: Violated rule? Make it stronger, don't add new
6. **Delta updates**: Change only what's needed, preserve structure
7. **Track progress**: Use todo list throughout
8. **Verify before extract**: Only extract skills that were proven to work
