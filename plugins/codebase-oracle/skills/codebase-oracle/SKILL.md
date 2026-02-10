---
name: codebase-oracle
description: |
  Deep codebase analysis combining parallel agent team mapping, dependency/hub analysis, and evidence-based investigation. Use when "analyze codebase", "map architecture", "understand this project", "codebase oracle", "document architecture", "explore codebase", "what does this codebase do", "map this codebase", "codebase map", or exploring unfamiliar code. Automatically detects existing maps and updates incrementally.
---

# Codebase Oracle

Universal codebase analysis: parallel agent team mapping + dependency/hub analysis + evidence-based investigation.

**Orchestration model:** Create an agent team. Lead orchestrates in delegate mode, teammates read and analyze. Never have the lead read codebase files directly. Always delegate file reading to teammates — even for small codebases.

## Modes

| Mode | When | Output |
|------|------|--------|
| **Full Map** | New codebase, onboarding, "map this codebase" | `docs/CODEBASE_MAP.md` |
| **Investigate** | Targeted questions, "how does X work?" | Findings with confidence assessment |
| **Impact** | Before changes, "what would break if I change X?" | Dependency graph + blast radius |

Default: **Full Map** unless the user's request clearly fits Investigate or Impact.

## Confidence Tracking

Track certainty throughout analysis. Report confidence with every finding.

| Bar | Lvl | Name | Action |
|-----|-----|------|--------|
| `░░░░░` | 0 | Gathering | Collect initial evidence |
| `▓░░░░` | 1 | Surveying | Broad scan, surface patterns |
| `▓▓░░░` | 2 | Investigating | Deep dive, verify patterns |
| `▓▓▓░░` | 3 | Analyzing | Cross-reference, fill gaps |
| `▓▓▓▓░` | 4 | Synthesizing | Connect findings, high confidence |
| `▓▓▓▓▓` | 5 | Concluded | Deliver findings |

*Calibration: 0=0–19%, 1=20–39%, 2=40–59%, 3=60–74%, 4=75–89%, 5=90–100%*

Start honest. Clear codebase + focused question → level 2–3. Vague or complex → level 0–1.

At level 4: "High confidence in findings. One more angle would reach full certainty. Continue or deliver now?"

Below level 5: include `△ Caveats` section.

## Evidence Methodology

**Evidence over assumption** — investigate when you can, guess only when you must.

### Source Priority

1. **Direct observation** — read code, run searches, examine files
2. **Documentation** — official docs, inline comments, ADRs
3. **Tests** — reveal intended behavior and edge cases
4. **History** — git log, commit messages, PR discussions
5. **External research** — library docs, RFCs
6. **Inference** — logical deduction from available evidence
7. **Assumption** — clearly flagged when other sources unavailable

### Investigation Patterns

**Start broad, then narrow:**
- File tree → identify relevant areas
- Search patterns → locate specific code
- Code structure → understand without full content
- Read targeted files → examine implementation
- Cross-reference → verify understanding

**Layer evidence:**
- What does the code do? (direct observation)
- Why was it written this way? (history, comments)
- How does it fit the system? (architecture, dependencies)
- What are the edge cases? (tests, error handling)

**Follow the trail:**
- Function calls → trace execution paths
- Imports/exports → map dependencies
- Test files → understand usage patterns
- Error messages → reveal assumptions
- Comments → capture historical context

## Workflow: Full Map Mode

### Step 1: Check for Existing Map

Check if `docs/CODEBASE_MAP.md` already exists:

**If it exists:**
1. Read the `last_mapped` timestamp from the map's frontmatter
2. Check for changes since last map:
   - Run `git log --oneline --since="<last_mapped>"` if git available
   - If no git, run the scanner and compare file counts/paths
3. If significant changes detected, proceed to update mode (Step 8)
4. If no changes, inform user the map is current

**If it does not exist:** Proceed to full mapping (Step 2).

### Step 2: Scan the Codebase

Run the scanner script to get an overview of the codebase structure and file sizes:

```bash
# Option 1: UV (preferred - auto-installs dependencies)
uv run ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/scan-codebase.py . --format json

# Option 2: Direct execution
python3 ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/scan-codebase.py . --format json
```

The output provides:
- Complete file tree with size estimates per file
- Total codebase size
- Skipped files (binary, too large)

### Step 3: Create Agent Team and Plan Assignments

1. Create an agent team using `TeamCreate` with a descriptive name (e.g., `codebase-oracle-map`)
2. Analyze the scan output to divide work among teammates
3. Create tasks using `TaskCreate` — one task per file group
4. Switch to **delegate mode** (Shift+Tab) — lead coordinates only, does not read code

**Grouping strategy:**
1. Group files by directory/module (keeps related code together)
2. Balance file counts and sizes across groups
3. Keep each teammate's group manageable — no more than ~50 files or ~500KB of source per teammate

**For small codebases (<50 files):** Still use a single teammate. Lead orchestrates, teammate reads.

### Step 4: Spawn Teammates

Spawn teammates using the Task tool with `team_name` parameter for each group. Each teammate joins the shared team and can communicate findings to other teammates and the lead.

Each teammate prompt MUST include these analysis dimensions:

1. **Purpose** of each file/module
2. **Exports** — key functions, classes, types
3. **Dependencies** — what it imports (forward deps)
4. **Dependents** — what imports it (reverse deps, if discoverable)
5. **Hub detection** — is this file imported by many others? (hub = 5+ dependents)
6. **Patterns** — design patterns, conventions used
7. **Gotchas** — non-obvious behavior, edge cases, warnings
8. **Entry points** — main(), server start, CLI entry, route handlers
9. **Data flow** — how data moves through these files

Example teammate prompt:

```
You are analyzing part of a codebase. Read and analyze these files:
[list files]

For each file, document:
1. **Purpose**: One-line description
2. **Exports**: Key functions, classes, types exported
3. **Imports**: Notable dependencies (both internal and external)
4. **Hub status**: How many other files import this one? (use Grep to search for import statements referencing this file)
5. **Patterns**: Design patterns or conventions used
6. **Gotchas**: Non-obvious behavior, edge cases, warnings

Also identify:
- How these files connect to each other
- Entry points and data flow
- Configuration or environment dependencies
- Layer this code belongs to (presentation/business/data/infrastructure)

Return your analysis as structured markdown with clear headers per file/module.
```

### Step 5: Synthesize Reports

Once all teammates complete their tasks:

1. **Merge** all teammate reports
2. **Deduplicate** overlapping analysis
3. **Identify hubs** — files imported by 5+ others (critical nodes)
4. **Identify cross-cutting concerns** — shared patterns, common gotchas
5. **Build architecture diagram** showing module relationships and layers
6. **Map data flows** for key operations
7. **Validate findings** — cross-reference teammate reports for consistency
8. **Assess confidence** — rate each section's certainty

### Step 6: Write CODEBASE_MAP.md

**Get the actual timestamp first:**
```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

Create `docs/CODEBASE_MAP.md`:

```markdown
---
last_mapped: YYYY-MM-DDTHH:MM:SSZ
total_files: N
total_files_scanned: N
confidence: N/5
---

# Codebase Map

> Auto-generated by Codebase Oracle. Last mapped: [date]

## System Overview

[Mermaid diagram showing high-level architecture]

## Hub Files

Critical files with high fan-in (many dependents). Changes here have wide blast radius.

| File | Dependents | Role |
|------|-----------|------|
| ... | N | ... |

## Directory Structure

[Tree with purpose annotations]

## Module Guide

### [Module Name]

**Purpose**: [description]
**Layer**: [presentation/business/data/infrastructure]
**Entry point**: [file]
**Key files**:
| File | Purpose | Size |
|------|---------|------|
**Exports**: [key APIs]
**Dependencies**: [what it needs]
**Dependents**: [what needs it]

[Repeat for each module]

## Data Flow

[Mermaid sequence diagrams for key flows]

## Conventions

[Naming, patterns, style]

## Gotchas

[Non-obvious behaviors, warnings]

## Navigation Guide

**To add a new [feature type]**: [files to touch]
[etc.]

## Confidence Assessment

Overall: [BAR] [PERCENTAGE]%

High confidence areas:
- [AREA] — [REASON]

Lower confidence areas:
- [AREA] — [REASON]

## △ Caveats

[If confidence < 100%]
```

### Step 7: Update CLAUDE.md

Add or update the codebase summary in CLAUDE.md:

```markdown
## Codebase Overview

[2-3 sentence summary]

**Stack**: [key technologies]
**Structure**: [high-level layout]

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).
```

If `AGENTS.md` exists, update it similarly.

### Step 8: Update Mode (Incremental)

When updating an existing map:

1. Identify changed files from git or scanner diff
2. Spawn teammates only for changed modules
3. Merge new analysis with existing map
4. Re-evaluate hub status (new files may change hub rankings)
5. Update `last_mapped` timestamp
6. Preserve unchanged sections

## Workflow: Investigate Mode

For targeted questions ("how does auth work?", "where is X configured?").

### Steps

0. **Check for existing map** — if `docs/CODEBASE_MAP.md` exists, read it first for architectural context before investigating
1. **Calibrate starting confidence** — what do we already know?
2. **Identify evidence sources** — where can we look?
3. **Create agent team and spawn teammates** — create a team, then spawn teammates to investigate in parallel:
   - One teammate per investigation angle (code, tests, docs, history)
4. **Cross-reference findings** — verify patterns hold across sources
5. **Flag uncertainties** — mark gaps with △
6. **Synthesize conclusions** — connect evidence to insights
7. **Deliver with confidence level** — clear about certainty

### During Investigation

After each evidence-gathering step emit:

- **Confidence:** {BAR} {NAME}
- **Found:** {key discoveries}
- **Patterns:** {emerging themes}
- **Gaps:** {what's still unclear}
- **Next:** {investigation direction}

### At Delivery

```markdown
### Findings

1. {FINDING} — evidence: {SOURCE}
2. {FINDING} — evidence: {SOURCE}

### Patterns

{recurring themes or structures identified}

### Implications

{what findings mean for the question at hand}

### Confidence Assessment

Overall: {BAR} {PERCENTAGE}%

### △ Caveats (if below level 5)

**Assumptions:**
- {ASSUMPTION} — {why necessary, impact if wrong}

**Gaps:**
- {GAP} — {what's missing, how to fill}
```

## Workflow: Impact Mode

For assessing change blast radius ("what breaks if I change X?", "impact of refactoring Y").

### Steps

0. **Check for existing map** — if `docs/CODEBASE_MAP.md` exists, read it first for hub files and dependency context
1. **Identify the target** — file, function, type, or module being changed
2. **Trace forward dependencies** — what does the target import/use?
3. **Trace reverse dependencies** — what imports/uses the target? (use Grep to find all import statements)
4. **Detect hub status** — is this a hub file? How many dependents?
5. **Assess blast radius**:
   - **Direct impact**: files that import the target
   - **Indirect impact**: files that import direct dependents
   - **Test coverage**: which tests exercise this code?
6. **Rate risk level**:
   - `LOW` — few dependents, good test coverage
   - `MEDIUM` — several dependents or partial test coverage
   - `HIGH` — hub file, many dependents, or no tests
   - `CRITICAL` — core infrastructure, everything depends on it
7. **Recommend approach** — safe refactoring strategy

### Output Format

```markdown
## Impact Analysis: [target]

**Risk Level**: [LOW/MEDIUM/HIGH/CRITICAL]
**Direct Dependents**: N files
**Indirect Dependents**: N files
**Test Coverage**: [description]

### Dependency Graph

[Mermaid diagram showing dependencies]

### Affected Files

| File | Relationship | Risk |
|------|-------------|------|
| ... | direct import | ... |

### Recommended Approach

[Safe refactoring strategy with order of changes]

### Confidence: {BAR} {PERCENTAGE}%
```

## Hub Detection

Hubs are files imported by many others — they're architectural linchpins.

**Detection method:**
- Use Grep to count how many files import each module
- Files with 5+ importers = hub
- Files with 10+ importers = critical hub

**Hub analysis includes:**
- What the hub provides (exports)
- Who depends on it (all importers)
- Stability assessment (how often it changes)
- Recommended caution level for modifications

## Validation Checklist

Before concluding at confidence level 4+:

**Evidence quality:**
- ✓ Multiple sources confirm pattern?
- ✓ Direct observation vs inference clearly marked?
- ✓ Assumptions explicitly flagged?
- ✓ Counter-examples considered?

**Completeness:**
- ✓ Original question fully addressed?
- ✓ Edge cases explored?
- ✓ Alternative explanations ruled out?
- ✓ Known unknowns documented?

**Deliverable:**
- ✓ Findings supported by evidence?
- ✓ Confidence calibrated honestly?
- ✓ Caveats section included if <100%?
- ✓ Next steps clear if incomplete?

## Rules

ALWAYS:
- Create an agent team (TeamCreate) for analysis work
- Use delegate mode — lead coordinates, teammates analyze
- Cite evidence sources with file paths
- Use confidence bars to track certainty
- Flag assumptions and gaps with △
- Cross-reference from multiple angles
- Detect and report hub files
- Include caveats below confidence level 5
- Get actual timestamp before writing map (`date -u`)
- Validate findings before concluding
- Clean up the team (TeamDelete) after work is done

NEVER:
- Have the lead read codebase files directly
- Guess when you can investigate
- State assumptions as facts
- Conclude from single source
- Hide uncertainty or gaps
- Skip validation checks
- Deliver without confidence assessment
- Hardcode timestamps
- Ignore hub files in impact analysis

## Architecture Analysis Reference

For deep architecture analysis, load the reference doc:
- [architecture-analysis.md](references/architecture-analysis.md) — dependency mapping, layer identification, coupling analysis, hub detection, pattern recognition

Load this reference when:
- Performing Full Map mode (Step 5: synthesize)
- Investigating architectural questions
- Analyzing component relationships or layer violations

## Troubleshooting

**Scanner fails with dependency error:**
Use `uv run` (preferred — handles dependencies automatically), or install manually: `pip install tiktoken`

**Python not found:**
Try `python3`, `python`, or use `uv run` which handles Python automatically.

**Codebase too large even for teammates:**
- Increase number of teammates
- Focus on src/ directories, skip vendored code

**Git not available:**
- Fall back to file count/path comparison for change detection
- Store file list hash in map frontmatter
