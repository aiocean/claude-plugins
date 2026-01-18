# Reflect Skill - Research & Design Decisions

Document này lưu trữ research và design decisions để hỗ trợ việc cải tiến skill trong tương lai.

## Research Sources

### Academic Papers

**1. Reflexion (Shinn et al., 2023)**

- Paper: https://arxiv.org/abs/2303.11366
- Key insight: Verbal reinforcement learning - agent tự phản ánh qua ngôn ngữ thay vì gradient updates
- Episodic memory buffer lưu trữ self-reflections
- Agent học từ trial-and-error trong môi trường
- **Áp dụng**: AI-first analysis thay vì programmatic pattern detection

**2. Voyager (Wang et al., 2023)**

- Paper: https://arxiv.org/abs/2305.16291
- Key insight: Skill library giúp agent tránh re-learning
- Game-playing agents xây dựng reusable skills theo thời gian
- **Áp dụng**: Skill extraction selectivity - chỉ extract knowledge có giá trị

**3. CASCADE (2024)**

- Paper: https://arxiv.org/abs/2512.23880
- Key insight: "Meta-skills" - skills for acquiring skills
- **Áp dụng**: Reflect skill itself là một meta-skill

**4. SEAgent (2025)**

- Paper: https://arxiv.org/abs/2508.04700
- Key insight: Agents học environments qua trial-and-error
- `/retrospective` command để review session
- **Áp dụng**: Retrospective workflow trong skill

**5. Generative Agents (Park et al., 2023)**

- Paper referenced by claude-diary
- Key insight: Memory retrieval based on recency, importance, relevance
- **Áp dụng**: Processed tracking để tránh re-analysis

### GitHub Projects

**1. claude-reflect**

- Repo: https://github.com/fyodorio/claude-reflect
- Cloned to: `/tmp/reflect-research/claude-reflect/`

Key features:

- Hook-based real-time capture (PostToolUse, UserPromptSubmit)
- Semantic validation với AI trước khi save
- Skill routing cho corrections
- Deduplication
- `/reflect-skills` command

Code structure:

```
claude-reflect/
├── SKILL.md           # Main skill với validation workflow
├── scripts/
│   └── reflection-hook.sh  # Hook script
└── reflections/       # Storage for reflections
```

Key learnings:

- Dùng hooks để capture real-time thay vì post-session analysis
- AI validation quan trọng: "Is this meaningful?"
- Semantic matching trong description rất quan trọng cho skill discovery

**2. claude-diary**

- Repo: https://github.com/anthropics/claude-diary (hoặc tương tự)
- Cloned to: `/tmp/reflect-research/claude-diary/`

Key features:

- Structured diary entries với format cố định
- Rule violation detection: check existing rules trước
- Processed tracking trong JSON file
- Delta updates: chỉ thay đổi incremental

Design principle quan trọng:

> "If an existing rule was violated, strengthen that rule instead of adding a new one"

Điều này dẫn đến: fewer, stronger rules > many weak rules

**3. claude-code-continuous-learning-skill**

- Repo: https://github.com/blader/claude-code-continuous-learning-skill
- Cloned to: `/tmp/reflect-research/claude-code-continuous-learning-skill/`

Key features:

- Automatic skill extraction
- Quality gates trước khi create skill
- Web research integration
- Hook-based activation (`UserPromptSubmit`)
- Skill template với semantic description

Quality gates:

1. Reusable? (not one-time fix)
2. Non-trivial? (required discovery)
3. Specific? (has trigger conditions)
4. Verified? (solution actually worked)

Skill description importance:

> "Helps with database problems" won't match anything useful.
> "Fix for PrismaClientKnownRequestError in serverless" will match when someone hits that error.

**4. Agent-Memory-Paper-List**

- Repo: https://github.com/nuster1128/Agent-Memory-Paper-List
- Cloned to: `/tmp/reflect-research/Agent-Memory-Paper-List/`

Comprehensive taxonomy of agent memory:

- Forms: Token-level, Parametric, Latent
- Functions: Factual, Experiential, Working
- Dynamics: Formation, Evolution, Retrieval

200+ papers về agent memory research.

## Design Decisions

### 1. AI-First Analysis

**Decision**: Không programmatically detect patterns, để AI analyze

**Reasoning**:

- Ban đầu tạo `analyze-patterns.ts` với regex-based detection
- User feedback: "analyze-patterns.ts is not a good idea because we can't programmatically analyze well, better to let AI analyze"
- AI hiểu context, nuance, multiple languages
- Programmatic analysis bị giới hạn bởi predefined patterns

**Implementation**:

- Deleted `analyze-patterns.ts`
- SKILL.md workflow relies on AI reading extracted sessions

### 2. Rule Violation Priority

**Decision**: Strengthen violated rules before adding new ones

**Reasoning**:

- From claude-diary: "fewer, stronger rules > many weak rules"
- If a rule was violated, it wasn't strong enough
- Adding new rule khi existing rule failed = rule proliferation

**Implementation**:

- Phase 3A in workflow: Check Rule Violations first
- Strengthen options: move higher, add emphasis, add examples

### 3. Skill Extraction Selectivity

**Decision**: Strict quality gates before creating skills

**Reasoning**:

- From continuous-learning: not every task deserves a skill
- Skill library should be high-signal
- Low-quality skills = noise in semantic matching

**Quality gates**:

- Required >10 minutes investigation
- Solution was non-obvious
- Has specific trigger conditions
- Solution was verified to work
- Would help future sessions

### 4. Delta Updates

**Decision**: Incremental changes, never rewrite entire files

**Reasoning**:

- Preserve existing structure
- Minimize disruption
- Easier to review changes
- Easier to rollback if needed

**Implementation**:

- Show diff before applying
- Edit specific sections, not whole file

### 5. Processed Tracking

**Decision**: Track analyzed sessions to avoid re-analysis

**Reasoning**:

- From claude-diary: processed tracking prevents duplicate work
- Efficiency: don't analyze same session twice
- Memory management: know what's been learned

**Implementation**:

- `memory/processed.json` tracks session IDs
- Check before analysis in Phase 1

### 6. Diary Format

**Decision**: Auto-generate diary summary from session

**Reasoning**:

- Quick overview before full analysis
- Track files modified, work items
- Useful for `--diary` quick scan

**Implementation**:

- `DiaryEntry` interface in extract-session.ts
- `generateDiary()` function extracts key info

## File Structure Evolution

Before research:

```
reflect/
├── SKILL.md
└── scripts/
    ├── extract-session.ts
    ├── get-project-path.ts
    └── project-tree.ts
```

After research:

```
reflect/
├── SKILL.md                    # Rewritten with 5-phase workflow
├── IMPLEMENTATION_PLAN.md      # Synthesis of all research
├── docs/
│   └── RESEARCH.md             # This file
├── scripts/
│   ├── extract-session.ts      # Enhanced with diary
│   ├── get-project-path.ts
│   └── project-tree.ts
└── memory/
    ├── diary/                  # Reflection summaries
    ├── reflections/            # Session notes
    └── processed.json          # Tracking
```

## Key Quotes from Research

### From continuous-learning SKILL.md:

> "Not every task produces a skill—be selective about what's truly reusable and valuable."

### From claude-diary:

> "Strengthen existing rule if it was violated, don't add new one"

### From Reflexion paper:

> "Verbal reinforcement learning where an agent verbally reflects on task feedback signals"

### From Voyager paper:

> "Skill library helps agent avoid re-learning things they already figured out"

## Future Improvement Ideas

1. **Hook-based capture**: Add hooks cho real-time learning (like claude-reflect)
2. **Semantic validation**: AI validate trước khi save reflection
3. **Web research integration**: Auto-search best practices cho tech-specific skills
4. **Skill versioning**: Track skill evolution over time
5. **Cross-project learning**: Share skills between projects
6. **Reflection scheduling**: Auto-remind to reflect after N sessions

## References

- Reflexion: https://arxiv.org/abs/2303.11366
- Voyager: https://arxiv.org/abs/2305.16291
- CASCADE: https://arxiv.org/abs/2512.23880
- SEAgent: https://arxiv.org/abs/2508.04700
- Agent Memory Survey: https://github.com/nuster1128/Agent-Memory-Paper-List
- Claude Code Skills: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

## Session Context

Research được thực hiện trong session ngày 2026-01-18, project `/Users/username/.claude/skills/reflect`.

Cloned repos vẫn còn tại `/tmp/reflect-research/` (có thể bị xóa sau reboot).
