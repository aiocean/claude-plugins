# Reflect

Turn transient learnings into permanent improvements. Learn from Claude Code sessions to build better CLAUDE.md rules and reusable skills.

## What It Does

Reflect analyzes your past Claude Code sessions to find:

- **Corrections**: When you said "no", "not that", or corrected Claude
- **Preferences**: Patterns in how you like to work
- **Friction**: Communication breakdowns and repeated requests
- **Technical knowledge**: Non-obvious solutions worth preserving as skills

Then it helps you codify these learnings into:

- **CLAUDE.md rules**: Behavioral patterns for this user/project
- **New skills**: Reusable technical knowledge

## Installation

```bash
# Clone to user skills directory
git clone https://github.com/anthropics/claude-plugins.git /tmp/claude-plugins
cp -r /tmp/claude-plugins/plugins/reflect ~/.claude/skills/reflect
```

Or add to your project:

```bash
cp -r /tmp/claude-plugins/plugins/reflect .claude/skills/reflect
```

## Usage

Invoke the skill:

```
/reflect
```

Or use natural language:

```
"What did we learn from recent sessions?"
"Review the last 5 sessions for improvements"
"Save this knowledge"
```

### Quick Commands

```bash
# Extract last 5 sessions with diary summary
bun run scripts/extract-session.ts <project-path> --last 5 --diary

# Full extraction with thinking blocks
bun run scripts/extract-session.ts <project-path> --last 5 --verbose

# JSON output
bun run scripts/extract-session.ts <project-path> --last 5 --json
```

## Workflow

1. **Setup**: Load existing rules, check for unprocessed sessions
2. **Extract**: Pull session data with full context
3. **Analyze**: AI identifies patterns (corrections, preferences, knowledge)
4. **Synthesize**: Present findings with evidence
5. **Apply**: Update CLAUDE.md or create skills (with approval)

## Core Principles

- **AI-First Analysis**: Let AI understand context, not regex patterns
- **Rule Violation Priority**: Strengthen violated rules before adding new ones
- **Skill Selectivity**: Only extract knowledge that is reusable, non-trivial, verified
- **Delta Updates**: Incremental changes, never rewrite entire files
- **Processed Tracking**: Avoid re-analyzing the same sessions

## File Structure

```
reflect/
├── SKILL.md              # Main skill definition
├── README.md             # This file
├── docs/
│   ├── RESEARCH.md       # Research & design decisions
│   └── IMPLEMENTATION_PLAN.md
├── scripts/
│   ├── extract-session.ts    # Session extraction
│   ├── get-project-path.ts   # Path utilities
│   └── project-tree.ts       # Project listing
└── memory/
    ├── diary/            # Reflection summaries
    ├── reflections/      # Session notes
    └── processed.json    # Tracking
```

## Research Background

This skill synthesizes ideas from:

- **Reflexion** (Shinn et al., 2023): Verbal reinforcement learning
- **Voyager** (Wang et al., 2023): Skill libraries for agents
- **claude-reflect**: Hook-based capture, semantic validation
- **claude-diary**: Rule violation detection, processed tracking
- **continuous-learning**: Quality gates for skill extraction

See `docs/RESEARCH.md` for detailed research notes.

## Requirements

- [Bun](https://bun.sh) runtime for scripts
- Claude Code with skills support

## License

MIT
