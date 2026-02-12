---
name: codebase-oracle
description: |
  Deep codebase analysis combining CodeWiki LLM-powered documentation, parallel agent team mapping, dependency/hub analysis, and evidence-based investigation. Use when "analyze codebase", "map architecture", "understand this project", "codebase oracle", "document architecture", "explore codebase", "what does this codebase do", "map this codebase", "codebase map", or exploring unfamiliar code. Automatically detects existing maps and updates incrementally.
---

# Codebase Oracle

Comprehensive architecture documentation: CodeWiki-enhanced analysis with specialized analyst teams.

**Core Philosophy:** Oracle doesn't create duplicate documentation - it **enhances and validates** CodeWiki's AI-generated docs with structural analysis, hub detection, and cross-validation.

## Documentation Intent Contract

Before writing or updating any docs, declare this contract:

- **Audience**: Who will use this doc (`new engineer`, `oncall`, `feature owner`, `refactor owner`).
- **Primary tasks**: Top 2-3 questions the reader should answer quickly.
- **Decision horizon**: What decisions this doc supports (incident, refactor, onboarding, architecture review).
- **Out of scope**: What this doc intentionally does not cover.

If user does not specify, infer from context and state assumptions explicitly in `CODEBASE_MAP.md`.

## Evidence and Confidence Protocol

Every non-trivial claim must be represented as:

1. `Claim` - factual statement.
2. `Evidence` - one or more `path:line` references.
3. `Confidence` - `▓░░░░` to `▓▓▓▓▓`.
4. `Impact` - why this matters to decisions.

Unknowns must be written as `Unknown` with a concrete verification step. Never present assumptions as facts.

**Required claim table format for Oracle sections:**

```markdown
| Claim | Evidence | Confidence | Impact |
|------|----------|------------|--------|
| Request path is sync and DB-bound | `internal/handler/handler.go:42`, `internal/repository/mongodb.go:88` | ▓▓▓▓░ | High latency risk under load |
```

## Meaningfulness Criteria

Docs are "meaningful" only when they answer:

- **What exists** (structure)
- **Why it is designed this way** (rationale)
- **What can fail** (failure modes, signals, recovery)
- **What changes are risky** (blast radius, test coverage, owner boundary)

If a section only describes structure without decision guidance, it is incomplete.

## Integration Architecture

### Consolidated + Cross-Validation Model

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: CodeWiki (AI-generated documentation)                  │
│                                                                 │
│   codewiki generate --output docs/                              │
│   ↓                                                             │
│   Produces:                                                     │
│   - docs/{module}.md (LLM-written with diagrams, examples)     │
│   - docs/module_tree.json (structure)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: Oracle (Validation + Enhancement)                      │
│                                                                 │
│   /codebase-oracle                                              │
│   ↓                                                             │
│   For EACH CodeWiki module doc:                                 │
│   1. Read CodeWiki's claims about the module                   │
│   2. Oracle agents analyze the actual code independently        │
│   3. Compare findings → Cross-validation                       │
│   4. ENHANCE the SAME module.md file with:                     │
│      - ✓ Validated sections (both AI systems agree)            │
│      - ⚠ Review needed sections (discrepancies found)          │
│      - Hub analysis & blast radius                             │
│      - Confidence badges                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Output: Single Enhanced Documentation                           │
│                                                                 │
│   docs/{module}.md (CodeWiki + Oracle combined)                │
│   ├── Original CodeWiki content (architecture, flows, etc.)    │
│   ├── <!-- ORACLE-ENHANCED --> section added at end            │
│   │   ├── ✓ Validation Status                                  │
│   │   ├── Hub Analysis                                         │
│   │   ├── Blast Radius                                         │
│   │   └── Confidence Assessment                                │
│   └── Cross-reference links to other enhanced modules          │
└─────────────────────────────────────────────────────────────────┘
```

### Validation Badges

| Badge | Meaning | Action |
|-------|---------|--------|
| ✓ Validated | CodeWiki + Oracle agree | High confidence, trust it |
| ⚠ Review | Discrepancy found | Human review recommended |
| ? Unknown | Oracle couldn't verify | Needs investigation |
| + Enhanced | Oracle added new info | Cross-validated addition |

## CodeWiki ACTUAL Output Structure

```
docs/
├── {module_name}.md         # Per-module LLM documentation
├── module_tree.json         # Module hierarchy
├── first_module_tree.json   # Initial clustering
└── temp/dependency_graphs/  # JSON for dependency graphs
```

**What CodeWiki does NOT output:**
- ❌ `call_graph.json` - Not persisted
- ❌ `.codewiki-cache/` - Does not exist

## Workflow: Enhanced Documentation Mode

### Phase 0: Run CodeWiki (if not done)

```bash
# Check if CodeWiki docs exist
ls docs/*.md docs/module_tree.json 2>/dev/null

# If not, run CodeWiki first
codewiki generate --output docs/
```

### Phase 1: Scope and Claim Inventory

For each module doc:

1. Read `docs/{module}.md`.
2. Extract claims from CodeWiki (`components`, `dependencies`, `architecture`, `flows`).
3. Convert to a claim inventory table.
4. Prioritize claims by decision impact (`incident`, `refactor`, `ownership`, `performance`).

### Phase 2: Structure Pass (Facts)

Run parallel validation agents per module to verify what exists in code.

```
You are the structure-analyst for module: {module_name}

1. Read docs/{module_name}.md and extract all structural claims.
2. Validate each claim against code with path:line evidence.
3. Produce a claim table:
   - Claim
   - Evidence (path:line)
   - Confidence
   - Impact
4. Mark unverifiable claims as Unknown with exact next verification step.
5. Report discrepancies between CodeWiki and code as ⚠ Review.
```

### Phase 3: Meaning Pass (Why and Risk)

For each module, add decision-support context:

1. **Design rationale**: infer from code, tests, comments, history.
2. **Trade-offs**: what was optimized, what was sacrificed.
3. **Failure modes**: how it breaks, detection signals, first recovery actions.
4. **Change impact**: blast radius, downstream dependents, relevant tests.
5. **Ownership boundary**: which directory/service boundaries are crossed.

### Phase 4: Editorial Pass (Quality)

Before writing final docs:

1. Remove duplicated statements.
2. Remove generic language without evidence.
3. Ensure each section answers "so what?" for the target audience.
4. Ensure every high-confidence claim has concrete evidence.
5. Keep unresolved gaps explicit under `Unknowns and Verification`.

### Phase 5: Enhance Module Docs and Generate CODEBASE_MAP.md

Append Oracle section to each module doc with this required structure:

```markdown
<!-- ORACLE-ENHANCED
Generated by codebase-oracle to validate and enhance CodeWiki output.
Validation timestamp: {timestamp}
Audience: {audience}
Primary tasks: {task_1}, {task_2}
-->

## Oracle Validation

### Validation Status

| Section | Status | Notes |
|---------|--------|-------|
| Components | ✓ Validated | 12 components verified |
| Dependencies | ⚠ Review | 3 imports not documented |
| Architecture | ✓ Validated | Layer assignment consistent |

### Claim Ledger

| Claim | Evidence | Confidence | Impact |
|------|----------|------------|--------|
| REPLACE | `path/to/file.go:42` | ▓▓▓▓░ | REPLACE |

### Design Rationale and Trade-offs

- Why this module is shaped this way.
- Trade-offs explicitly observed in code.

### Failure Modes and Recovery

- Failure mode
- Detection signal
- First-response action

### Blast Radius and Safe Change Plan

- Direct dependents
- Indirect dependents
- Tests to run first

### Unknowns and Verification

- Unknown item + exact step to verify.

### Confidence Assessment

Overall: ▓▓▓▓░ 85%
```

Generate `CODEBASE_MAP.md` as the index of all enhanced module docs and include:

- Audience + primary tasks
- Top risky hubs
- Most critical unknowns
- Priority recommendations for next engineering work

## Cross-Validation Logic

### When Both AI Systems Agree → High Confidence

```python
if codewiki_claim == oracle_finding:
    confidence = "✓ Validated"
    badge = "▓▓▓▓▓ 95%"
```

### When They Disagree → Flag for Review

```python
if codewiki_claim != oracle_finding:
    confidence = "⚠ Review"
    note = f"CodeWiki: {codewiki_claim}, Oracle: {oracle_finding}"
    # Human review needed
```

### Example Discrepancy Detection

```markdown
### ⚠ Discrepancy Found: Dependencies

**CodeWiki says:**
> This module depends on: config, utils, logger

**Oracle found:**
> This module also imports: database, cache

**Recommendation:** Review if database/cache imports are intentional.
```

## Rules

ALWAYS:
- Enhance CodeWiki module.md files, don't create separate Oracle docs
- Add validation badges showing CodeWiki vs Oracle agreement
- Flag discrepancies for human review
- Include hub analysis and blast radius in enhancement section
- Generate single CODEBASE_MAP.md as index
- Cross-validate: compare CodeWiki claims with Oracle findings
- Start with Documentation Intent Contract (audience, tasks, decision horizon)
- Use claim tables with path:line evidence and confidence bars
- Include rationale, trade-offs, failure modes, and safe-change guidance
- Use `Unknown` + verification steps for unresolved gaps

NEVER:
- Create duplicate documentation
- Overwrite CodeWiki content - only APPEND Oracle section
- Skip validation step
- Ignore discrepancies - always flag them
- Reference `.codewiki-cache/` - does not exist
- Write high-confidence claims without evidence
- Leave generic summaries that do not help decisions
- Hide uncertainty when evidence is incomplete

## Quality Gates (CI-Friendly)

Use these checks to keep docs meaningful over time:

1. **Evidence completeness**: fail if Oracle section has claims without `path:line`.
2. **Placeholder check**: fail if `REPLACE` remains.
3. **Unknown discipline**: fail if uncertainty is implied but no `Unknowns and Verification` section exists.
4. **Drift check**: if module files changed, corresponding module docs must be updated.

Run bundled checker (recommended):

```bash
# from project root
bash ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/doc-quality-check.sh docs

# fallback when developing in this plugin repo
bash plugins/codebase-oracle/skills/codebase-oracle/scripts/doc-quality-check.sh docs

# CI/MR mode: compare against target branch
DOC_CHECK_BASE_REF=origin/main \
  bash ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/doc-quality-check.sh docs
```

Fallback manual checks:

```bash
# 1) No placeholders
! rg -n "REPLACE" docs/*.md

# 2) Oracle section must include claim ledger and unknowns
rg -n "### Claim Ledger" docs/*.md
rg -n "### Unknowns and Verification" docs/*.md

# 3) Basic evidence pattern in claim rows
rg -n '`[^`]+:[0-9]+`' docs/*.md
```

## Output Structure After Enhancement

```
docs/
├── CODEBASE_MAP.md              # Oracle index with validation summary
├── {module1}.md                 # CodeWiki + Oracle enhancement
│   ├── (original CodeWiki content)
│   └── <!-- ORACLE-ENHANCED --> section
├── {module2}.md                 # CodeWiki + Oracle enhancement
├── module_tree.json             # Unchanged
└── temp/                        # Unchanged
```

## Troubleshooting

**No CodeWiki docs:** Run `codewiki generate --output docs/` first

**Validation failures:** Check if code changed since CodeWiki run

**Many discrepancies:** Re-run CodeWiki with `--no-cache`
