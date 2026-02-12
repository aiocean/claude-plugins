---
name: codebase-oracle
description: |
  Deep codebase analysis combining CodeWiki LLM-powered documentation, parallel agent team mapping, dependency/hub analysis, and evidence-based investigation. Use when "analyze codebase", "map architecture", "understand this project", "codebase oracle", "document architecture", "explore codebase", "what does this codebase do", "map this codebase", "codebase map", or exploring unfamiliar code. Automatically detects existing maps and updates incrementally.
---

# Codebase Oracle

Comprehensive architecture documentation: CodeWiki-enhanced analysis with specialized analyst teams.

**CodeWiki Integration:** When CodeWiki has already generated documentation, Oracle uses those LLM-powered module docs as the foundation, then synthesizes architecture views, adds hub analysis, blast radius, and confidence tracking. This creates a powerful combination: CodeWiki's deep module docs + Oracle's structural analysis.

## CodeWiki + Oracle Collaboration

### Complementary Roles

| Aspect | CodeWiki | Oracle |
|--------|----------|--------|
| **Module Docs** | Deep LLM-generated per-module documentation | Uses CodeWiki docs as source |
| **Diagrams** | Architecture, sequence, state diagrams per module | C4 system-level views, dependency graphs |
| **Analysis** | Code understanding, clustering | Hub detection, layer violations, blast radius |
| **Confidence** | LLM assertions | Evidence-based confidence tracking |
| **Output** | `{module}.md` files | `CODEBASE_MAP.md` index + structured views |

### What CodeWiki Provides

```
docs/
├── overview.md              # Repository overview (LLM-generated)
├── {module_name}.md         # Per-module docs with:
│   ├── Architecture diagrams (Mermaid)
│   ├── Sequence diagrams
│   ├── State diagrams
│   ├── Component interactions
│   ├── Usage examples
│   ├── Best practices
│   └── Cross-references
├── module_tree.json         # Hierarchical module structure
├── first_module_tree.json   # Initial clustering
└── metadata.json            # Generation info
```

### What Oracle Adds

```
docs/
├── CODEBASE_MAP.md          # Index with hub analysis, navigation
├── c4-architecture.md       # System-level C4 views (context, containers)
├── dependency-graph.md      # Hub detection, layer violations, blast radius
├── key-flows.md             # Cross-module execution flows
├── api-surface.md           # (if applicable) API surface map
├── data-model.md            # (if applicable) Entity relationships
└── infrastructure.md        # (if applicable) Deployment docs
```

### Integration Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CodeWiki Generation                          │
│  codewiki generate --output docs/                               │
│  ↓                                                               │
│  Produces: overview.md, {module}.md files, module_tree.json     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Oracle Enhancement                           │
│  /codebase-oracle                                               │
│  ↓                                                               │
│  1. Detects CodeWiki docs in docs/                              │
│  2. Reads module_tree.json for structure                        │
│  3. Analysts read CodeWiki's {module}.md files as source        │
│  4. Synthesizes CODEBASE_MAP.md index                           │
│  5. Adds: hub detection, layer violations, blast radius         │
│  6. Creates: C4 views, dependency graphs, key flows             │
└─────────────────────────────────────────────────────────────────┘
```

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
├── infrastructure.md            # Deployment, CI/CD, env config
│
│  # CodeWiki outputs (if available, used as source):
├── overview.md                  # CodeWiki repository overview
├── {module}.md                  # CodeWiki module documentation
├── module_tree.json             # CodeWiki module structure
└── metadata.json                # CodeWiki generation info
```

Not every doc is generated. See [Detection Rules](#detection-rules) for when each is produced.

## Templates

Templates live in `${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/templates/`. Each template contains:
- The final document structure (headers, tables, Mermaid code blocks)
- `<!-- ORACLE:SECTION_NAME ... -->` comment blocks with per-section instructions:
  - **What to fill** in this section
  - **Which tools** to use (Grep, Glob, LSP, Read, CodeWiki data)
  - **Specific patterns** to search for
  - **Mermaid syntax** examples for diagram sections
- `REPLACE` placeholders where values must be filled

**Template workflow:**
1. Analyst reads the template as a format guide and analysis checklist
2. Analyst analyzes the codebase following each `<!-- ORACLE: -->` instruction
3. **If CodeWiki docs exist, use them as primary source** (higher confidence)
4. Analyst writes a **new file** to `docs/` with the completed content
5. The template is never copied to `docs/` — analysts always write fresh output files

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

| Teammate | Focus | Templates Filled | CodeWiki Sources |
|----------|-------|-----------------|------------------|
| **structure-analyst** | Code architecture, layers, modules, dependencies | `c4-architecture.md`, `dependency-graph.md` | `module_tree.json`, `{module}.md` files |
| **data-analyst** | Data model, schemas, storage | `data-model.md` | Entity sections from CodeWiki docs |
| **flow-analyst** | Execution paths, APIs, events | `key-flows.md`, `api-surface.md` | Sequence diagrams from CodeWiki |
| **product-analyst** | User-facing behavior, features | `product-requirements.md` | `overview.md`, usage examples |
| **infra-analyst** | Deployment, CI/CD, config | `infrastructure.md` | Config sections from CodeWiki |

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

**CodeWiki docs provide +1 confidence boost** when available due to LLM-powered semantic understanding.

Start honest. Clear codebase + focused question → level 2–3. Vague or complex → level 0–1.

At level 4: "High confidence in findings. One more angle would reach full certainty. Continue or deliver now?"

Below level 5: include `△ Caveats` section.

## Evidence Methodology

**Evidence over assumption** — investigate when you can, guess only when you must.

### Source Priority

1. **CodeWiki LLM documentation** — Module docs, architecture diagrams, sequence diagrams
2. **CodeWiki module_tree.json** — Structured module hierarchy with components
3. **Direct observation** — read code, run searches, examine files
4. **Documentation** — official docs, inline comments, ADRs
5. **Tests** — reveal intended behavior and edge cases
6. **History** — git log, commit messages, PR discussions
7. **External research** — library docs, RFCs
8. **Inference** — logical deduction from available evidence
9. **Assumption** — clearly flagged when other sources unavailable

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

### Phase 0: Check for CodeWiki Documentation

**Step 0a: Detect CodeWiki output**

```bash
# Check if CodeWiki has generated docs
ls -la docs/*.md docs/module_tree.json docs/metadata.json 2>/dev/null

# If found, CodeWiki docs are available
```

**Step 0b: If CodeWiki docs exist, load them**

```bash
# Read module tree for structure
cat docs/module_tree.json | python3 -c "
import json, sys
def print_tree(tree, indent=0):
    for name, data in tree.items():
        print('  ' * indent + f'{name}/ ({len(data.get(\"components\", []))} components)')
        if 'children' in data and data['children']:
            print_tree(data['children'], indent + 1)
print_tree(json.load(sys.stdin))
"

# List available module docs
ls -la docs/*.md | grep -v CODEBASE_MAP
```

**Step 0c: If no CodeWiki docs, optionally run CodeWiki**

```bash
# Check if codewiki is available
which codewiki && codewiki --version

# Optionally generate CodeWiki docs first
codewiki generate --output docs/ --no-cache
```

**If CodeWiki is not available**, proceed to Phase 1 with direct code analysis.

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

**Step 3: Static Analysis**

**If CodeWiki module_tree.json exists:**
- Use it as the authoritative module structure
- No need to run Tree-sitter for basic structure
- Tree-sitter still useful for: hub detection, call graph, layer analysis

**If no CodeWiki data, run Tree-sitter:**

```bash
uv run ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/tree-sitter-analyze.py . --format json > docs/.tree-sitter-results.json
```

**Step 4: Detect applicable docs**

Analyze scan output using [Detection Rules](#detection-rules):

1. Check for data model evidence (models, migrations, schemas, ORM imports)
2. Check for API surface evidence (route handlers, GraphQL, gRPC, CLI)
3. Check for infrastructure evidence (Docker, CI, k8s, cloud configs)
4. Check for product evidence (README, UI components, user-facing routes)
5. Build the list of templates to fill (always includes: CODEBASE_MAP, c4-architecture, key-flows, dependency-graph)

### Phase 2: Prepare Output Directory

**Step 5: Create docs/ if needed**

```bash
mkdir -p docs
```

Determine which templates analysts should use based on detection results.

### Phase 3: Analyze and Fill

**Step 5: Create agent team**

1. Create an agent team using `TeamCreate` (e.g., `codebase-oracle-map`)
2. Based on codebase size and detected docs, decide analyst team composition
3. Create tasks using `TaskCreate` — one task per analyst
4. Switch to **delegate mode** — lead coordinates only, does not read code

**Step 6: Spawn analysts to fill templates**

Each analyst:
1. Reads their assigned template as format guide
2. **If CodeWiki docs exist, reads relevant `{module}.md` files as primary source**
3. Extracts structure, diagrams, and insights from CodeWiki
4. Adds Oracle-specific analysis: hub detection, layer violations, confidence
5. Writes completed document to `docs/`

**Analyst prompt template (with CodeWiki):**

```
You are the [ROLE]-analyst for codebase analysis.

Your job:
1. Read the template at ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/templates/[TEMPLATE].md
2. CHECK FOR CODEWIKI DOCS FIRST:
   - Read docs/module_tree.json for module structure
   - Read docs/overview.md for repository overview
   - Read relevant docs/{module}.md files for module documentation
   - Extract architecture diagrams, sequence diagrams, component info from these files
3. For sections not covered by CodeWiki, use:
   - Grep, Glob, LSP, Read tools
   - Tree-sitter results from docs/.tree-sitter-results.json (if exists)
4. Write the COMPLETED document to docs/[TEMPLATE].md

Codebase root: [PROJECT_ROOT]
CodeWiki docs available: [YES/NO]

If CodeWiki docs exist:
- Use them as PRIMARY SOURCE (higher confidence)
- Extract existing Mermaid diagrams and adapt them
- Preserve valuable LLM-generated insights
- Add Oracle-specific analysis: hub detection, confidence tracking

If no CodeWiki docs:
- Use direct code analysis with Grep, Glob, LSP, Read
- Use Tree-sitter results for structure

Important:
- Do NOT duplicate CodeWiki content - synthesize and reference
- Add value through: hub analysis, layer violations, confidence tracking
- Cite sources: "From CodeWiki: ..." or "Analysis: ..."
- Flag uncertainties with △
```

**Using CodeWiki module docs as source:**

```bash
# Read a module's documentation
cat docs/adapters.md  # Contains: architecture, sequence diagrams, usage

# Extract structure from module_tree.json
cat docs/module_tree.json | python3 -c "
import json, sys
tree = json.load(sys.stdin)
for name, data in tree.items():
    print(f'{name}:')
    print(f'  Path: {data.get(\"path\")}')
    print(f'  Components: {len(data.get(\"components\", []))}')
    if data.get('children'):
        for child_name in data['children']:
            print(f'  - {child_name}')
"
```

**Step 7: Lead reviews and synthesizes**

Once all analysts complete:

1. Read each filled template in `docs/`
2. Read CodeWiki's `overview.md` and module docs
3. Verify all `<!-- ORACLE: -->` comments have been removed
4. Cross-reference findings with CodeWiki docs for consistency
5. Fill `CODEBASE_MAP.md`:
   - System Overview from CodeWiki overview.md
   - Hub Files from dependency-graph analysis
   - Module Guide from module_tree.json + CodeWiki module docs
   - Doc links table (link to both Oracle and CodeWiki docs)
6. Set timestamp and update frontmatter
7. Assess overall confidence (+1 if CodeWiki available)

**Step 8: Update CLAUDE.md**

Add or update the codebase summary in CLAUDE.md:

```markdown
## Codebase Overview

[2-3 sentence summary from CodeWiki overview.md or analysis]

**Stack**: [key technologies]
**Structure**: [high-level layout]
**Analysis**: CodeWiki + Oracle (or Oracle only)

For detailed architecture:
- [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) - Oracle architecture map
- [docs/overview.md](docs/overview.md) - CodeWiki repository overview (if available)
```

### Phase 4: Update Mode (Incremental)

When updating an existing map:

1. Check if CodeWiki docs need regeneration (new files added)
2. If yes, run: `codewiki generate --output docs/` (it caches intelligently)
3. Identify changed files from git or scanner diff
4. Determine which docs are affected
5. Spawn analysts only for affected domains
6. Preserve unchanged docs

## Workflow: Investigate Mode

For targeted questions ("how does auth work?", "where is X configured?").

### Steps

0. **Check for CodeWiki docs** — read relevant `{module}.md` files first
1. **Check CODEBASE_MAP.md** — if exists, read for architectural context
2. **Calibrate starting confidence** — what do we already know?
3. **Identify evidence sources** — where can we look?
4. **Create agent team and spawn teammates**
5. **Cross-reference findings** — verify patterns hold across sources
6. **Flag uncertainties** — mark gaps with △
7. **Synthesize conclusions** — connect evidence to insights
8. **Deliver with confidence level**

## Workflow: Impact Mode

For assessing change blast radius ("what breaks if I change X?", "impact of refactoring Y").

### Steps

0. **Check for existing map and CodeWiki docs**
1. **Identify the target** — file, function, type, or module being changed
2. **Trace forward dependencies** — what does the target import/use?
3. **Trace reverse dependencies** — what imports/uses the target?
4. **Detect hub status** — is this a hub file? How many dependents?
5. **Assess blast radius**:
   - **Direct impact**: files that import the target
   - **Indirect impact**: files that import direct dependents
   - **Test coverage**: which tests exercise this code?
6. **Rate risk level**: LOW / MEDIUM / HIGH / CRITICAL
7. **Recommend approach** — safe refactoring strategy

## Hub Detection

Hubs are files imported by many others — they're architectural linchpins.

**Detection methods:**
1. **CodeWiki module_tree.json**: Count component references across modules
2. **Tree-sitter import graph**: Files with 5+ importers
3. **Grep import counting**: Count import statements
4. **LSP findReferences**: Verify hub status

**Hub thresholds:**
- 5+ importers = hub
- 10+ importers = critical hub

## Validation Checklist

Before concluding at confidence level 4+:

**Evidence quality:**
- ✓ CodeWiki docs used when available?
- ✓ Multiple sources confirm pattern?
- ✓ Direct observation vs inference clearly marked?
- ✓ Assumptions explicitly flagged?

**Completeness:**
- ✓ Original question fully addressed?
- ✓ Edge cases explored?
- ✓ Alternative explanations ruled out?

**Deliverable:**
- ✓ All `<!-- ORACLE: -->` comments removed?
- ✓ All `REPLACE` placeholders filled?
- ✓ CodeWiki content referenced, not duplicated?
- ✓ Confidence calibrated honestly?
- ✓ Analysis method noted in frontmatter?

## Rules

ALWAYS:
- Create an agent team (TeamCreate) for analysis work
- Use delegate mode — lead coordinates, teammates analyze
- Check for CodeWiki docs first — use them as primary source when available
- Read CodeWiki `{module}.md` files before analyzing code directly
- Extract and adapt CodeWiki's Mermaid diagrams
- Preserve CodeWiki's LLM-generated insights
- Add Oracle-specific value: hub detection, confidence tracking, layer violations
- Cite sources: "From CodeWiki: ..." or "Analysis: ..."
- Remove all `<!-- ORACLE: -->` comments from final output
- Fill all `REPLACE` placeholders
- Note analysis method in frontmatter (codewiki+oracle, oracle-only)
- Clean up the team (TeamDelete) after work is done

NEVER:
- Duplicate CodeWiki content — synthesize and reference instead
- Ignore CodeWiki docs when available
- Have the lead read codebase files directly
- Copy templates to docs/ — write fresh output
- Leave `<!-- ORACLE: -->` comments in final output
- Leave `REPLACE` placeholders unfilled
- Guess when you can investigate
- State assumptions as facts
- Hide uncertainty or gaps
- Deliver without confidence assessment

## Troubleshooting

**CodeWiki not found:**
- Install: `pip install git+https://github.com/FSoft-AI4Code/CodeWiki.git`
- Configure: `codewiki config set --api-key YOUR_KEY`
- CodeWiki is optional — Oracle works without it

**CodeWiki docs outdated:**
- Regenerate: `codewiki generate --output docs/ --no-cache`
- Or continue with existing docs and note in confidence

**No module_tree.json but .md files exist:**
- CodeWiki may have been run without JSON output
- Continue with .md files as source
- Note reduced confidence in structure

**Scanner fails with dependency error:**
Use `uv run` (handles dependencies automatically), or: `pip install tiktoken`

**Tree-sitter analyzer fails:**
- Install UV: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Or install manually: `pip install tree-sitter tree-sitter-python ...`
- Tree-sitter is optional

**Mermaid diagram not rendering:**
- Ensure triple-backtick mermaid syntax
- C4 diagrams may not render in all viewers — use flowchart fallback
