---
name: reflect
description: |
  Evaluate and learn from Claude Code sessions to extract reusable knowledge.
  Use when: (1) reviewing past sessions for mistakes/preferences, (2) after completing
  significant tasks with non-obvious solutions, (3) discovering debugging techniques
  or workarounds, (4) user says "reflect", "what did we learn", or "save this knowledge".
  Outputs: CLAUDE.md updates (behavioral patterns) or new SKILL.md files (technical knowledge).
  Always confirms with user before creating or modifying any files.
---

# Reflect

**Purpose**: Turn transient learnings into permanent improvements. What separates growth from stagnation is the ability to learn from experience.

## Core Principles

1. **AI-First Analysis**: Don't programmatically detect patterns - let AI understand context, nuance, and intent
2. **Rule Violation Priority**: Strengthen violated rules before adding new ones (fewer, stronger rules > many weak rules)
3. **Skill Extraction Selectivity**: Only extract knowledge that is reusable, non-trivial, and verified
4. **Delta Updates**: Make incremental, targeted changes - never rewrite entire files
5. **Processed Tracking**: Track analyzed sessions to avoid re-analysis

## Quick Start

```bash
# Extract last 5 sessions with diary summary
bun run scripts/extract-session.ts <project-path> --last 5 --diary

# Full extraction with thinking blocks
bun run scripts/extract-session.ts <project-path> --last 5 --verbose

# JSON output for further processing
bun run scripts/extract-session.ts <project-path> --last 5 --json
```

## Workflow

### Phase 1: Setup

1. Create todo list for tracking progress
2. Get target project path (or use current directory)
3. Verify sessions exist:
   ```bash
   bun run scripts/get-project-path.ts <path> --check
   ```
4. Check for unprocessed sessions:
   ```bash
   # Compare sessions in project folder with memory/processed.json
   ```
5. Load existing CLAUDE.md rules (for violation detection)
6. Ask user how many sessions to analyze (default: 5)

### Phase 2: Extract Sessions

```bash
bun run scripts/extract-session.ts <project-folder> --last N --verbose
```

Output includes:

- Session metadata (date, duration, branch)
- Diary summary (task, files modified, work items)
- Full conversation with tool calls and results
- Thinking blocks (with --verbose)
- Skills and agents used
- Session statistics

### Phase 3: Analyze (AI does this)

Read the extracted sessions. For each session:

**A. Check Rule Violations (Critical)**

Compare session with existing CLAUDE.md rules:

- Was any existing rule violated?
- If yes → **Strengthen the rule first** (don't add new)
  - Move rule higher in priority
  - Add emphasis (bold, IMPORTANT)
  - Make it more explicit
  - Add specific examples

**B. Identify Corrections (High Value)**

Look for user saying:

- "no", "not that", "I meant"
- Rephrasing or contradicting Claude
- In thinking blocks: wrong assumptions

Extract:

- What Claude assumed → What user wanted
- Why the assumption was wrong
- How to prevent it

**C. Find Friction Points (Medium Value)**

Signs of communication breakdown:

- Repeated requests
- User having to explain multiple times
- Frustration signals
- Clarification loops

Ask: Why did this happen? How to prevent?

**D. Discover Preferences (High Value)**

Consistent patterns the user shows:

- Language preferences (Vietnamese/English)
- Tool preferences (bun over npm)
- Code style preferences
- Level of detail wanted
- Implicit rules made explicit

**E. Note Successes (Reference Value)**

What worked smoothly:

- Tasks completed without corrections
- Patterns that should be reinforced
- Effective use of skills/agents

**F. Evaluate Skill Candidates (Selective)**

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

### Critical: Rule Violations

[If any existing rules were violated]

- **Rule**: [existing rule text]
- **Violation**: [what happened]
- **Action**: Strengthen rule → [proposed new text]

### Corrections Found

1. **Assumption**: Claude thought X
   **Reality**: User wanted Y
   **Evidence**: "[quote from session]"
   **Proposed rule**: [specific, actionable rule]

### Friction Points

1. **Issue**: [description]
   **Evidence**: "[quote]"
   **Cause**: [why it happened]

### Preferences Discovered

1. **Preference**: [what user prefers]
   **Evidence**: "[quote showing pattern]"
   **Frequency**: [how often observed]

### Skill Candidates

1. **Discovery**: [what was learned]
   **Problem solved**: [description]
   **Worth creating skill?**: [Yes/No + reasoning]
   **Trigger conditions**: [error messages, symptoms]

### Proposed Changes

#### CLAUDE.md Updates

[For each proposed change]

**Change**: [add/modify/strengthen] rule
**Text**: [exact rule text to add]
**Evidence**: [session quote]
**Prevents**: [what problem]

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

Update `memory/processed.json`:

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

If user wants, save reflection to `memory/diary/YYYY-MM-DD-reflection.md`

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

| Script                                                                                 | Purpose                               |
| -------------------------------------------------------------------------------------- | ------------------------------------- |
| `extract-session.ts <target> [--last N] [--json] [--verbose] [--stats-only] [--diary]` | Extract sessions with full context    |
| `get-project-path.ts <path> [--check]`                                                 | Convert path & check sessions exist   |
| `project-tree.ts [--stats] [--json]`                                                   | List all projects with session counts |

## Memory Directory

```
~/.claude/skills/reflect/memory/
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
3. **Focus on corrections**: Highest learning value
4. **Be specific**: "Use Vietnamese for this user" > "Be flexible with language"
5. **Strengthen first**: Violated rule? Make it stronger, don't add new
6. **Delta updates**: Change only what's needed, preserve structure
7. **Track progress**: Use todo list throughout
8. **Verify before extract**: Only extract skills that were proven to work
