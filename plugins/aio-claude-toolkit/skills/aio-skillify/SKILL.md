---
name: aio-skillify
description: Capture this session's repeatable process into a reusable SKILL.md file via guided interview. Triggers: "skillify", "capture this workflow", "save this as a skill", "turn this into a skill", "make a skill from this session".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - Bash(mkdir:*)
argument-hint: "[optional description of the process to capture]"
---

# Skillify - Capture Session Workflows as Reusable Skills

Turn what you just did into a skill that works every time.

## Goal

Analyze the current session, interview the user about their intent, and produce a well-structured SKILL.md file that captures the repeatable process.

## Steps

### 1. Load Session Memory

Session memory is stored at `~/.claude/projects/{sanitized-cwd}/{sessionId}/session-memory/summary.md` where sanitized-cwd replaces all non-alphanumeric characters with `-`.

Use Glob to find and Read the most recent session memory for the current project. This gives you a compact summary of the entire session including compacted context. If no session memory exists, skip this step and rely on the current conversation context.

### 2. Analyze the Session

Combine the session memory with the current conversation to identify:

- What repeatable process was performed
- What the inputs/parameters were
- The distinct steps (in order)
- The success artifacts/criteria for each step (e.g. not just "writing code" but "an open PR with CI fully passing")
- Where the user corrected or steered you - these are gold for capturing preferences
- What tools and permissions were needed
- What agents were used (if any)

### 3. Interview the User

Use AskUserQuestion for ALL questions. Never ask via plain text. For each round, iterate until the user is happy. Always include a freeform "Other" option - do NOT add your own "Needs tweaking" option.

**Round 1: High-level confirmation**
- Suggest a name and description for the skill based on your analysis
- Suggest high-level goal(s) and specific success criteria

**Round 2: Details**
- Present the high-level steps as a numbered list. Tell the user you will dig into details next round.
- If the skill needs arguments, suggest them based on what you observed.
- Ask if this skill should run `inline` (in current conversation, user can steer mid-process) or `fork` (sub-agent with own context, better for self-contained tasks).
- Ask where to save. Suggest a default based on context:
  - **This repo** (`.claude/skills/<name>/SKILL.md`) - for workflows specific to this project
  - **Personal** (`~/.claude/skills/<name>/SKILL.md`) - follows you across all repos
  - **Plugin** (`<plugin-path>/skills/<name>/SKILL.md`) - if part of a plugin

**Round 3: Breaking down each step**
For each major step, if not glaringly obvious, ask:
- What does this step produce that later steps need? (data, artifacts, IDs)
- What proves this step succeeded, and that we can move on?
- Should the user confirm before proceeding? (especially irreversible actions: merging, sending messages, destructive ops)
- Are any steps independent and could run in parallel?
- How should the skill execute? (direct, Task agent, agent team for concurrent steps)
- What are hard constraints or preferences? Things that must or must not happen?

Do multiple rounds here if needed - one per step for complex workflows. Iterate as much as needed.

**IMPORTANT**: Pay special attention to places where the user corrected you during the session.

**Round 4: Final questions**
- Confirm when this skill should be invoked, and suggest/confirm trigger phrases (e.g. "cherry-pick to release", "CP this PR", "hotfix")
- Ask for any gotchas or things to watch out for

Stop interviewing once you have enough information. Don't over-ask for simple processes!

### 4. Write the SKILL.md

Use this format:

```markdown
---
name: {{skill-name}}
description: {{one-line description including trigger phrases}}
allowed-tools:
  {{list of tool permission patterns observed during session}}
when_to_use: {{detailed description of when to auto-invoke, starting with "Use when..."}}
argument-hint: "{{hint showing argument placeholders}}"
arguments:
  {{list of argument names}}
context: {{inline or fork -- omit for inline}}
---

# {{Skill Title}}

Description of skill

## Inputs
- `$arg_name`: Description of this input

## Goal
Clearly stated goal for this workflow. Best if you have clearly defined artifacts or criteria for completion.

## Steps

### 1. Step Name
What to do in this step. Be specific and actionable. Include commands when appropriate.

**Success criteria**: ALWAYS include this! Shows the step is done and we can move on.

...
```

**Per-step annotations** (use where helpful):
- **Success criteria** - REQUIRED on every step
- **Execution**: `Direct` (default), `Task agent`, `Teammate` (parallel + inter-agent), or `[human]`
- **Artifacts**: Data this step produces that later steps need
- **Human checkpoint**: When to pause for user confirmation (irreversible actions, error judgment, output review)
- **Rules**: Hard rules for the workflow. User corrections during the session are especially useful here.

**Step structure tips:**
- Steps that can run concurrently use sub-numbers: 3a, 3b
- Steps requiring the user to act get `[human]` in the title
- Keep simple skills simple -- a 2-step skill doesn't need annotations on every step

**Frontmatter rules:**
- `allowed-tools`: Minimum permissions needed. Use patterns like `Bash(gh:*)` not `Bash`
- `context`: Only set `fork` for self-contained skills that don't need mid-process user input
- `when_to_use` is CRITICAL - tells the model when to auto-invoke. Start with "Use when..." and include trigger phrases
- `arguments` and `argument-hint`: Only include if the skill takes parameters. Use `$name` in the body for substitution

### 5. Review and Save

Before writing the file:
1. Output the complete SKILL.md content as a yaml code block so the user can review it with syntax highlighting
2. Ask for confirmation using AskUserQuestion: "Does this SKILL.md look good to save?"
3. Only write the file after user confirms

After writing, tell the user:
- Where the skill was saved
- How to invoke it: `/{{skill-name}} [arguments]`
- That they can edit the SKILL.md directly to refine it
