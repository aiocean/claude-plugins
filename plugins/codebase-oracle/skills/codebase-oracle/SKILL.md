---
name: codebase-oracle
description: |
  Deep codebase analysis combining CodeWiki LLM-powered documentation, parallel agent team mapping, dependency/hub analysis, and evidence-based investigation. Use when "analyze codebase", "map architecture", "understand this project", "codebase oracle", "document architecture", "explore codebase", "what does this codebase do", "map this codebase", "codebase map", or exploring unfamiliar code. Automatically detects existing maps and updates incrementally.
---

# Codebase Oracle

Comprehensive architecture documentation: CodeWiki-enhanced analysis with specialized analyst teams.

**Core Philosophy:** Oracle doesn't create duplicate documentation - it **enhances and validates** CodeWiki's AI-generated docs with structural analysis, hub detection, and cross-validation.

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
└── temp/dependency_graphs/  # (optional) Component dependencies
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

### Phase 1: Read CodeWiki Output

For each module doc, extract CodeWiki's claims:

```bash
# List all CodeWiki module docs
ls docs/*.md | grep -v CODEBASE_MAP

# For each module, read and extract:
# - Module purpose/description
# - Listed components
# - Stated dependencies
# - Architecture claims
# - Sequence diagrams
```

### Phase 2: Oracle Validation (Parallel Agents)

Spawn validation agents for each module:

```
You are the validation-analyst for module: {module_name}

1. READ CodeWiki's doc at docs/{module_name}.md
2. EXTRACT CodeWiki's claims:
   - Claims about components
   - Claims about dependencies
   - Claims about architecture
3. VALIDATE by analyzing actual code:
   - Are the listed components real?
   - Are dependencies accurate?
   - Is the architecture description correct?
4. ENHANCE with Oracle-specific analysis:
   - Hub detection: Is this module a hub?
   - Blast radius: What breaks if this changes?
   - Layer: What layer is this really?
5. OUTPUT validation report with:
   - ✓ items where CodeWiki and Oracle agree
   - ⚠ items with discrepancies
   - + items Oracle adds
```

### Phase 3: Enhance Module Docs

Append Oracle enhancement section to each module.md:

```markdown
<!-- ORACLE-ENHANCED
Generated by codebase-oracle to validate and enhance CodeWiki output.
Validation timestamp: {timestamp}
-->

## Oracle Validation

### Validation Status

| Section | Status | Notes |
|---------|--------|-------|
| Components | ✓ Validated | All 12 components verified |
| Dependencies | ⚠ Review | CodeWiki missed 3 imports |
| Architecture | ✓ Validated | Layer assignment correct |

### Hub Analysis

This module is a **HUB** - imported by 8 other modules.

**Dependents:**
- Module A (direct)
- Module B (direct)
- Module C (indirect via A)

**Blast Radius:** Changing exports would affect 8+ modules.

**Recommendation:** Add deprecation warnings before removing exports.

### Confidence Assessment

Overall: ▓▓▓▓▓ 95%

- CodeWiki claims: High quality LLM analysis
- Oracle validation: All major claims verified
- Discrepancies: 1 minor (missing import)
```

### Phase 4: Generate CODEBASE_MAP.md

Single index linking to all enhanced module docs:

```markdown
# Codebase Map

> Enhanced documentation: CodeWiki (AI-generated) + Oracle (validated)

## Validation Summary

| Module | CodeWiki | Oracle | Status |
|--------|----------|--------|--------|
| [CLI Application](CLI%20Application.md) | ✓ | ✓ | Validated |
| [Dependency Analyzer](dependency-analyzer.md) | ✓ | ⚠ | Review needed |

## Hub Modules

These modules are imported by 5+ other modules:

| Module | Dependents | Risk |
|--------|-----------|------|
| [Config](config.md) | 12 | High |
```

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

NEVER:
- Create duplicate documentation
- Overwrite CodeWiki content - only APPEND Oracle section
- Skip validation step
- Ignore discrepancies - always flag them
- Reference `.codewiki-cache/` - does not exist

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
