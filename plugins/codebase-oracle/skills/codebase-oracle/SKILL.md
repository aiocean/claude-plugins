---
name: codebase-oracle
description: |
  Deep codebase analysis combining parallel agent team mapping, dependency/hub analysis, and evidence-based investigation. Use when "analyze codebase", "map architecture", "understand this project", "codebase oracle", "document architecture", "explore codebase", "what does this codebase do", "map this codebase", "codebase map", or exploring unfamiliar code. Automatically detects existing maps and updates incrementally.
---

# Codebase Oracle

Comprehensive architecture documentation: template-driven analysis with specialized analyst teams.

**Orchestration model:** Create an agent team. Lead orchestrates in delegate mode, teammates read and analyze. Never have the lead read codebase files directly. Always delegate file reading to teammates — even for small codebases.

**Template-driven approach:** Templates with embedded `<!-- ORACLE: -->` instructions are copied to `docs/`, then analysts fill each section following the inline guidance. This ensures consistent output, correct tool usage, and complete coverage.

## Modes

| Mode | When | Output |
|------|------|--------|
| **Full Map** | New codebase, onboarding, "map this codebase" | `docs/` directory with architecture docs |
| **Investigate** | Targeted questions, "how does X work?" | Findings with confidence assessment |
| **Impact** | Before changes, "what would break if I change X?" | Dependency graph + blast radius |

Default: **Full Map** unless the user's request clearly fits Investigate or Impact.

## Output Structure

Full Map mode produces a `docs/` directory with focused documents. Each uses Mermaid diagrams for native markdown rendering.

```
docs/
├── CODEBASE_MAP.md              # Index/overview — links to all other docs
├── c4-architecture.md           # C4 Context + Container + Component
├── data-model.md                # ERD + database schema + relationships
├── api-surface.md               # Routes, endpoints, schemas, auth
├── key-flows.md                 # Sequence diagrams for critical paths
├── dependency-graph.md          # Module deps + hub analysis + blast radius
├── product-requirements.md      # Reverse-engineered from code behavior
└── infrastructure.md            # Deployment, CI/CD, env config
```

Not every doc is generated. See [Detection Rules](#detection-rules) for when each is produced.

## Templates

Templates live in `~/.claude/skills/codebase-oracle/templates/`. Each template contains:
- The final document structure (headers, tables, Mermaid code blocks)
- `<!-- ORACLE:SECTION_NAME ... -->` comment blocks with per-section instructions:
  - **What to fill** in this section
  - **Which tools** to use (Grep, Glob, LSP, Read)
  - **Specific patterns** to search for
  - **Mermaid syntax** examples for diagram sections
- `REPLACE` placeholders where values must be filled

**Template workflow:**
1. Analyst reads the template from `~/.claude/skills/codebase-oracle/templates/` as a format guide and analysis checklist
2. Analyst analyzes the codebase following each `<!-- ORACLE: -->` instruction
3. Analyst writes a **new file** to `docs/` with the completed content — no ORACLE comments, no REPLACE placeholders
4. The template is never copied to `docs/` — analysts always write fresh output files

Available templates:

| Template | Analyst | Always Generated |
|----------|---------|-----------------|
| `CODEBASE_MAP.md` | structure-analyst (lead synthesizes) | Yes |
| `c4-architecture.md` | structure-analyst | Yes |
| `key-flows.md` | flow-analyst | Yes |
| `dependency-graph.md` | structure-analyst | Yes |
| `data-model.md` | data-analyst | No — needs models/schemas |
| `api-surface.md` | flow-analyst | No — needs routes/endpoints |
| `product-requirements.md` | product-analyst | No — needs README or UI |
| `infrastructure.md` | infra-analyst | No — needs Docker/CI/k8s |

## Detection Rules

The skill detects what's present and only generates relevant docs.

| Document | Generate When |
|----------|--------------|
| `CODEBASE_MAP.md` | Always |
| `c4-architecture.md` | Always (every codebase has context + containers) |
| `data-model.md` | Models/schemas/migrations/ORM found, or types with entity relationships |
| `api-surface.md` | HTTP routes, gRPC services, GraphQL schemas, or CLI commands found |
| `key-flows.md` | Always (every codebase has key execution flows) |
| `dependency-graph.md` | Always (every codebase has module dependencies) |
| `product-requirements.md` | README exists, or user-facing routes/components found |
| `infrastructure.md` | Dockerfile, docker-compose, CI config, k8s manifests, or cloud config found |

**How to detect:**
- **Data model**: Look for directories named `models/`, `entities/`, `schemas/`, `migrations/`, `prisma/`. Look for files matching `*.model.*`, `*.entity.*`, `*.schema.*`. Look for ORM imports (Prisma, TypeORM, Sequelize, Drizzle, SQLAlchemy, GORM).
- **API surface**: Look for route definitions (`app.get`, `router.post`, `@Get()`, `@Controller`), GraphQL schema files (`.graphql`, `typeDefs`), gRPC proto files (`.proto`), CLI command definitions (`commander`, `yargs`, `cobra`).
- **Infrastructure**: Look for `Dockerfile`, `docker-compose.*`, `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `k8s/`, `terraform/`, `pulumi/`, `fly.toml`, `vercel.json`, `netlify.toml`.
- **Product requirements**: Check if `README.md` exists. Look for UI components, page routes, CLI entry points.

## Specialized Analyst Team

Instead of generic file-group teammates, use **domain-specific analysts**:

| Teammate | Focus | Templates Filled |
|----------|-------|-----------------|
| **structure-analyst** | Code architecture, layers, modules, dependencies | `c4-architecture.md`, `dependency-graph.md` |
| **data-analyst** | Data model, schemas, storage | `data-model.md` |
| **flow-analyst** | Execution paths, APIs, events | `key-flows.md`, `api-surface.md` |
| **product-analyst** | User-facing behavior, features | `product-requirements.md` |
| **infra-analyst** | Deployment, CI/CD, config | `infrastructure.md` |

**Lead** synthesizes all analyst work into `CODEBASE_MAP.md` (the index doc).

**Scaling rules:**
- **Small codebases (<30 files):** Use 2-3 teammates with combined responsibilities (e.g., structure+data, flow+product+infra)
- **Medium codebases (30-200 files):** All 5 analysts
- **Large codebases (200+ files):** All 5, plus extra structure-analysts for large modules

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

### Phase 1: Scan and Detect

**Step 1: Check for existing map**

Check if `docs/CODEBASE_MAP.md` already exists:

**If it exists:**
1. Read the `last_mapped` timestamp from the map's frontmatter
2. Check for changes since last map:
   - Run `git log --oneline --since="<last_mapped>"` if git available
   - If no git, run the scanner and compare file counts/paths
3. If significant changes detected, proceed to update mode (Phase 4)
4. If no changes, inform user the map is current

**If it does not exist:** Proceed to Step 2.

**Step 2: Scan the codebase**

Run the scanner script to get an overview:

```bash
# Option 1: UV (preferred - auto-installs dependencies)
uv run ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/scan-codebase.py . --format json

# Option 2: Direct execution
python3 ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/scan-codebase.py . --format json
```

**Step 3: Static Analysis (Tree-sitter)**

For enhanced accuracy, run the Tree-sitter analyzer on supported languages:

```bash
# Option 1: UV (preferred - auto-installs dependencies)
uv run ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/tree-sitter-analyze.py . --format json > docs/.tree-sitter-results.json

# Option 2: Direct execution (requires manual dependency install)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/tree-sitter-analyze.py . --format json > docs/.tree-sitter-results.json
```

**What Tree-sitter provides:**
- Precise import/dependency extraction (distinguishes imports from strings/comments)
- Function/class/method discovery with exact line numbers
- Call graph for dependency analysis
- Export identification for API surface mapping

**Supported languages:** Python, JavaScript, TypeScript, Go, Rust, Java, Ruby

**Fallback:** If Tree-sitter fails or languages are unsupported, continue with regex-based analysis from the scanner output.

**Step 4: Detect applicable docs**

Analyze scan output using [Detection Rules](#detection-rules):

1. Check for data model evidence (models, migrations, schemas, ORM imports)
2. Check for API surface evidence (route handlers, GraphQL, gRPC, CLI)
3. Check for infrastructure evidence (Docker, CI, k8s, cloud configs)
4. Check for product evidence (README, UI components, user-facing routes)
5. Build the list of templates to copy (always includes: CODEBASE_MAP, c4-architecture, key-flows, dependency-graph)

### Phase 2: Prepare Output Directory

**Step 5: Create docs/ and determine template list**

```bash
mkdir -p docs
```

Determine which templates analysts should use as guides based on detection results from Step 4:

- **Always**: `CODEBASE_MAP.md`, `c4-architecture.md`, `key-flows.md`, `dependency-graph.md`
- **Conditional**: `data-model.md` (if data model found), `api-surface.md` (if API found), `product-requirements.md` (if product evidence), `infrastructure.md` (if infra found)

Templates are at `~/.claude/skills/codebase-oracle/templates/` — analysts read them as reference guides, then write completed docs directly to `docs/`. No copying needed.

### Phase 3: Analyze and Fill

**Step 5: Create agent team**

1. Create an agent team using `TeamCreate` (e.g., `codebase-oracle-map`)
2. Based on codebase size and detected docs, decide analyst team composition
3. Create tasks using `TaskCreate` — one task per analyst
4. Switch to **delegate mode** — lead coordinates only, does not read code

**Step 6: Spawn analysts to fill templates**

Each analyst reads their assigned template(s) from `~/.claude/skills/codebase-oracle/templates/` as a format guide and analysis checklist, then writes the completed document directly to `docs/`.

**Analyst prompt template:**

```
You are the [ROLE]-analyst for codebase analysis.

Your job:
1. Read the template at ~/.claude/skills/codebase-oracle/templates/[TEMPLATE].md — this is your FORMAT GUIDE and ANALYSIS CHECKLIST
2. For each <!-- ORACLE: --> comment block in the template, follow the instructions:
   - Use the specified tools (Grep, Glob, LSP, Read)
   - Search for the specified patterns
   - Collect your findings for that section
3. Generate Mermaid diagrams where indicated (syntax is in the template comments)
4. Write the COMPLETED document to docs/[TEMPLATE].md — no ORACLE comments, no REPLACE placeholders
5. If a section has no evidence, write "No evidence found." and keep the section

Codebase root: [PROJECT_ROOT]
Files to focus on: [RELEVANT_FILES_FROM_SCAN]

Important:
- The template is a REFERENCE — read it, follow it, but write a fresh completed file to docs/
- Follow the tool guidance in each ORACLE comment exactly
- Use LSP (goToDefinition, findReferences, hover) for precise analysis
- Use Grep for pattern-based discovery
- Cite file paths as evidence
- Do NOT invent information — if uncertain, flag with △
```

**Analyst-to-template mapping:**

| Analyst | Templates to Fill | Key Tools |
|---------|------------------|-----------|
| structure-analyst | `c4-architecture.md`, `dependency-graph.md` | Tree-sitter imports, Grep (imports), LSP (references), Glob (file structure) |
| data-analyst | `data-model.md` | Tree-sitter class definitions, Glob (model files), Read (schemas), LSP (hover for types) |
| flow-analyst | `key-flows.md`, `api-surface.md` | Tree-sitter exports/functions, Grep (routes), LSP (outgoingCalls, goToDefinition), Read (handlers) |
| product-analyst | `product-requirements.md` | Read (README, tests), Grep (roles, permissions), Glob (UI files) |
| infra-analyst | `infrastructure.md` | Read (Dockerfiles, CI configs), Grep (env vars, ports) |

**Using Tree-sitter output:**

If `docs/.tree-sitter-results.json` exists from Phase 1 Step 3, analysts should reference it for:
- **structure-analyst**: Use `import_graph` and `hubs` for dependency analysis (more accurate than regex)
- **flow-analyst**: Use `exports` and `functions` for API surface mapping
- **data-analyst**: Use `classes` and `types` for entity discovery

To load Tree-sitter results:
```bash
cat docs/.tree-sitter-results.json | python3 -c "import json,sys; data=json.load(sys.stdin); print(json.dumps(data['summary'], indent=2))"
```

**Step 7: Lead reviews and synthesizes**

Once all analysts complete:

1. Read each filled template in `docs/`
2. Verify all `<!-- ORACLE: -->` comments have been removed
3. Verify all `REPLACE` placeholders have been filled
4. Cross-reference findings across docs for consistency
5. Fill `CODEBASE_MAP.md` — the index doc — using data from all other docs:
   - System Overview from c4-architecture context
   - Hub Files from dependency-graph analysis
   - Module Guide from structure-analyst findings
   - Doc links table (only link to docs that were generated)
6. Set the timestamp:
   ```bash
   date -u +"%Y-%m-%dT%H:%M:%SZ"
   ```
7. Update frontmatter in CODEBASE_MAP.md (last_mapped, total_files, confidence, generated_docs list)
8. Assess overall confidence

**Step 8: Update CLAUDE.md**

Add or update the codebase summary in CLAUDE.md:

```markdown
## Codebase Overview

[2-3 sentence summary]

**Stack**: [key technologies]
**Structure**: [high-level layout]

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).
```

If `AGENTS.md` exists, update it similarly.

### Phase 4: Update Mode (Incremental)

When updating an existing map:

1. Identify changed files from git or scanner diff
2. Determine which docs are affected by the changes
3. Spawn analysts only for affected domains (e.g., if only API routes changed, only spawn flow-analyst to re-write `api-surface.md` and `key-flows.md`)
4. Analysts re-read templates as guides and write updated docs to `docs/`
5. Lead re-reviews affected docs and updates `CODEBASE_MAP.md`
6. Update `last_mapped` timestamp
7. Preserve unchanged docs

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

**Detection methods (in order of accuracy):**
1. **Tree-sitter import graph** (most accurate): Use `hubs` array from `.tree-sitter-results.json` - these are files with 3+ dependents based on AST-parsed imports
2. **Grep import counting** (fallback): Count how many files import each module using regex patterns
3. **LSP findReferences** (verification): Verify hub status by finding actual references

**Hub thresholds:**
- 5+ importers = hub
- 10+ importers = critical hub

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
- ✓ All `<!-- ORACLE: -->` comments removed from output docs?
- ✓ All `REPLACE` placeholders filled?
- ✓ Findings supported by evidence?
- ✓ Confidence calibrated honestly?
- ✓ Caveats section included if <100%?
- ✓ Mermaid diagrams syntactically valid?

## Rules

ALWAYS:
- Create an agent team (TeamCreate) for analysis work
- Use delegate mode — lead coordinates, teammates analyze
- Analysts read templates as format guides, then write fresh completed files to `docs/`
- Use specialized analysts (structure, data, flow, product, infra) not generic file groups
- Run detection rules before spawning analysts — only assign templates for docs that should be generated
- Analysts must follow `<!-- ORACLE: -->` instructions in each template section
- Analysts must use the tools specified in each ORACLE comment (Grep, Glob, LSP, Read)
- Remove all `<!-- ORACLE: -->` comments from final output
- Fill all `REPLACE` placeholders — no unfilled templates in output
- Cite evidence sources with file paths
- Use confidence bars to track certainty
- Flag assumptions and gaps with △
- Cross-reference from multiple angles
- Detect and report hub files
- Get actual timestamp before writing map (`date -u`)
- Clean up the team (TeamDelete) after work is done

NEVER:
- Have the lead read codebase files directly
- Write docs without reading the template first — always use templates as format guides
- Copy templates to docs/ — analysts write fresh files, templates stay in templates/
- Leave `<!-- ORACLE: -->` comments in final output
- Leave `REPLACE` placeholders unfilled
- Guess when you can investigate
- State assumptions as facts
- Conclude from single source
- Hide uncertainty or gaps
- Skip validation checks
- Deliver without confidence assessment
- Hardcode timestamps
- Ignore hub files in impact analysis
- Generate docs without evidence (skip docs where detection rules fail)

## Architecture Analysis Reference

For deep architecture analysis, load the reference doc:
- [architecture-analysis.md](references/architecture-analysis.md) — dependency mapping, layer identification, coupling analysis, hub detection, pattern recognition, Mermaid diagram templates

Load this reference when:
- Analysts need additional guidance beyond what's in the template ORACLE comments
- Investigating architectural questions
- Analyzing component relationships or layer violations

## Troubleshooting

**Scanner fails with dependency error:**
Use `uv run` (preferred — handles dependencies automatically), or install manually: `pip install tiktoken`

**Tree-sitter analyzer fails:**
- Ensure UV is installed (handles all dependencies automatically): `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Or install dependencies manually: `pip install tree-sitter tree-sitter-python tree-sitter-javascript tree-sitter-typescript tree-sitter-go tree-sitter-rust tree-sitter-java tree-sitter-ruby`
- If a specific language fails, the analyzer continues with remaining languages
- Tree-sitter is optional — if it fails, the skill falls back to regex-based analysis

**Python not found:**
Try `python3`, `python`, or use `uv run` which handles Python automatically.

**Codebase too large even for teammates:**
- Increase number of teammates
- Focus on src/ directories, skip vendored code

**Git not available:**
- Fall back to file count/path comparison for change detection
- Store file list hash in map frontmatter

**Template not found:**
- Templates are at `~/.claude/skills/codebase-oracle/templates/`
- Verify the skill is installed correctly
- Templates can also be accessed via the plugin root path

**Mermaid diagram not rendering:**
- Ensure code blocks use triple-backtick mermaid syntax
- C4 diagrams require C4Context/C4Container/C4Component/C4Deployment — not all renderers support these
- Fall back to flowchart syntax if C4 is not supported
