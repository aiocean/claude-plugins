---
name: doc-writer
description: Deep codebase analysis and architecture documentation. Use when user says "analyze codebase", "map architecture", "understand this project", "document architecture", "explore codebase", "what does this codebase do", "codebase map", or "codebase oracle". Combines CodeIndex static analysis with CocoIndex semantic search, Kai semantic graph, and LSP precision tools. Auto-detects available tools and adapts workflow.
---

# Codebase Oracle

Comprehensive architecture documentation: CodeIndex static analysis combined with Oracle direct documentation writing and specialized analyst teams.

**Core Philosophy:** Oracle **writes all documentation from scratch** using CodeIndex's static analysis data (codebase map, dependency graphs, metrics, communities) combined with direct source code reading. CodeIndex provides the quantitative foundation; Oracle provides the qualitative analysis and writes every doc.

**What CodeIndex Provides:** Static analysis output — `codebase_map.json` (components, edges, metrics, communities, hubs), `dependency_graphs/*.json` (detailed dependency data), and `.tpl` templates for doc structure.

**What Oracle Provides:** All written documentation — module docs, architecture analysis, key flows, dependency narratives, failure modes, design rationale, and decision guidance.

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

**Preferred inline evidence format:**

Instead of separate claim tables, add evidence directly in prose:

```markdown
The request path is synchronous and DB-bound (`internal/handler/handler.go:42`,
`internal/repository/mongodb.go:88`), creating high latency risk under load.
```

Use claim tables only in CODEBASE_MAP.md for the cross-module summary, not inside individual module docs.

## Meaningfulness Criteria

Docs are "meaningful" only when they answer:

- **What exists** (structure)
- **Why it is designed this way** (rationale)
- **What can fail** (failure modes, signals, recovery)
- **What changes are risky** (blast radius, test coverage, owner boundary)

If a section only describes structure without decision guidance, it is incomplete.

## Writing Quality Standards

Architecture docs must be **clear, scannable, and decision-useful**. Full guide: [references/writing-quality.md](references/writing-quality.md).

### Prose Rules (apply during documentation writing)

1. **Active voice.** "The handler validates input" not "Input is validated by the handler."
2. **Present tense.** "The service returns JSON" not "The service will return JSON."
3. **Lead with the point.** First sentence = main idea. Support follows.
4. **Short sentences.** Under 25 words. Split at natural breaking points.
5. **Concrete over abstract.** "3 Lambda functions with 30s timeout" not "several serverless functions."
6. **Conditions before instructions.** "To enable caching, set `CACHE_TTL`" not "Set `CACHE_TTL` to enable caching."
7. **Define terms on first use.** "The circuit breaker (stops cascading failures) trips after 5 errors."

### Word Choice

- **Use**: "use" not "utilize", "start" not "initiate", "to" not "in order to"
- **Never**: "simply", "just", "easily", "obviously", "note that", "there is/are" as opener
- **Cut weasel words**: replace "some", "many", "various" with exact numbers
- **Modal precision**: "can" = ability, "should" = recommendation, "must" = requirement
- **Consistency**: one term per concept everywhere — don't alternate "service"/"handler"/"processor"

### Structure Rules

- **One H1 per document**, heading levels increment by one, sentence case
- **Always specify language** in fenced code blocks
- **Descriptive link text** — "See [API surface docs](api-surface.md)" not "click here"
- **No screenshots of text** — use code blocks for CLI output, configs, errors
- **Numbered lists** for sequences, **bullet lists** for non-sequential items

### Anti-pattern Quick Reference

| Anti-pattern | Fix |
|---|---|
| Wall of text without headings | Break into short paragraphs with descriptive headings |
| Describing what without why | Add design rationale and trade-off context |
| Generic ("handles business logic") | Be specific: what inputs, outputs, side effects |
| Burying critical info | Lead with the point — most important fact first |
| Hedging ("might cause issues") | Be direct, or use Unknown protocol if uncertain |
| Inconsistent terminology | Pick one term, use everywhere, define on first use |

## Tool Availability Detection (Run First)

Before starting any phase, detect which analysis tools are available. Oracle adapts its workflow based on what's installed.

```bash
# 1. CodeIndex (REQUIRED — static analysis foundation)
.codeindex/bin/codeindex --version 2>/dev/null && echo "codeindex: YES" || echo "codeindex: NO — run /aio-codebase-oracle:aio-codebase-index to install"

# 2. CocoIndex (OPTIONAL — semantic search)
ls .cocoindex/query.py 2>/dev/null && echo "cocoindex: YES" || echo "cocoindex: NO — run /aio-cocoindex:aio-cocoindex-setup for semantic search"

# 3. Kai (OPTIONAL — semantic graph, symbols, dependencies)
kai_status() 2>/dev/null  # If available as MCP tool
# Check: .kai/ directory exists

# 4. LSP (OPTIONAL — precise type-aware references)
# Available if LSP MCP tools are configured (lsp_servers, lsp_hover, etc.)
```

**Decision matrix:**

| Tool | Status | Impact on Oracle |
|------|--------|-----------------|
| CodeIndex | Required | Static analysis foundation — will not proceed without it |
| CocoIndex | Optional | Adds semantic search for concept discovery, cross-cutting concerns |
| Kai | Optional | Adds symbol inventory, file dependencies, impact analysis, snapshot diffing |
| LSP | Optional | Adds precise type info, caller tracing, diagnostics |

**If tools are missing**, inform the user once at the start:

```
Tools detected:
✓ CodeIndex — static analysis ready
✗ CocoIndex — semantic search unavailable (install: /aio-cocoindex:aio-cocoindex-setup)
✓ Kai — semantic graph available
✗ LSP — no language servers detected
```

Oracle proceeds with whatever is available — more tools = richer documentation.

## Integration Architecture

### Static Analysis + Direct Documentation Model

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 0: CodeIndex (Static Analysis Only)                        │
│                                                                 │
│   .codeindex/bin/codeindex generate --verbose                     │
│   ↓                                                             │
│   Produces:                                                     │
│   - docs/codebase_map.json (components, edges, metrics, hubs) │
│   - (graph.html.tpl lives in skill dir, not CodeIndex)         │
│   - docs/dependency_graphs/*.json (detailed dependency data)   │
│   - docs/templates/*.tpl (doc structure templates)             │
│                                                                 │
│   Does NOT produce:                                             │
│   - ❌ Module .md files (Oracle writes those)                   │
│   - ❌ module_tree.json (not in static-only mode)              │
│   - ❌ LLM-generated documentation                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phases 1-3: Oracle (Analyze + Write)                            │
│                                                                 │
│   /codebase-oracle                                              │
│   ↓                                                             │
│   1. Ingest CodeIndex static analysis data                      │
│   2. Read actual source code for each module/community         │
│   3. Analyze: structure, dependencies, patterns, rationale     │
│   4. Write all documentation from scratch                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Output: Oracle-Written Documentation                            │
│                                                                 │
│   docs/                                                         │
│   ├── CODEBASE_MAP.md          (Oracle-written index)          │
│   ├── {module}.md              (Oracle-written module docs)    │
│   │   ├── Evidence inline (path:line references throughout)    │
│   │   ├── Failure Modes & Recovery                             │
│   │   ├── Blast Radius & Safe Change Plan                      │
│   │   ├── Design Rationale & Trade-offs                        │
│   │   └── <!-- ORACLE-META --> compact footer                  │
│   ├── codebase_map.json        (CodeIndex static analysis)     │
│   ├── graph.html               (AI-generated from skill's graph.html.tpl) │
│   ├── dependency_graphs/       (CodeIndex dependency data)     │
│   └── templates/               (CodeIndex doc templates)       │
└─────────────────────────────────────────────────────────────────┘
```

## CodeIndex Static Analysis Output

```
docs/
├── codebase_map.json            # Components, edges, metrics, communities, hubs
├── dependency_graphs/           # Per-module dependency JSON files
└── templates/                   # Doc structure templates (.tpl)
```

**What CodeIndex does NOT output in static-only mode:**
- ❌ `{module}.md` files - Oracle writes these
- ❌ `module_tree.json` - Not produced without `--use-agent-sdk`
- ❌ `.codeindex-cache/` - Does not exist
- ❌ `metadata.json` - Not produced
- ❌ `overview.md` - Not produced

## Workflow: Documentation Generation

### Quick Decision Tree

**What did the user ask for?**

| User Request | Run These Phases |
|--------------|------------------|
| "Analyze codebase" / "Full analysis" | All phases (0-4) |
| "Find missing docs" / "What's not documented?" | Phase 0, 1 only |
| "Update docs" / "Refresh docs" | Phase 0-4 (full re-run) |
| "Quick check" / "Is this up to date?" | Phase 1 only (review static analysis data) |

### Phase 0: Run CodeIndex Static Analysis (MANDATORY first step)

**You MUST run CodeIndex before any manual analysis.** Do not skip this step. Do not substitute with manual file reading. CodeIndex generates static analysis data that Oracle uses as the quantitative foundation for documentation.

```bash
# Check if CodeIndex static analysis already exists and is recent
ls docs/codebase_map.json docs/dependency_graphs/ 2>/dev/null

# If static analysis doesn't exist OR user requested fresh analysis → run CodeIndex
.codeindex/bin/codeindex generate --verbose --no-cache

# If static analysis exists and user just wants to update → still run with cache
.codeindex/bin/codeindex generate --verbose
```

**Flags explained:**
- `--verbose`: Shows progress so user can track generation
- `--no-cache`: Forces fresh analysis (use when no static analysis exists or code has changed)

**Do NOT use `--use-agent-sdk`** — Oracle writes all documentation directly. CodeIndex runs in static analysis mode only.

**Do NOT use globally installed `codeindex`** — Always use the project-local `.codeindex/bin/codeindex`. This prevents version conflicts between projects.

**When to use `--no-cache`:**
- First run (no existing static analysis)
- User explicitly asks for fresh/full analysis
- Code has changed significantly since last run

**When to skip `--no-cache`:**
- Static analysis exists and codebase hasn't changed
- User says "update docs" and only wants Oracle to re-generate written docs

**If `codeindex` is not installed**, inform the user:
```
CodeIndex is required. Install with: pip install -e codeindex/
```
Do NOT proceed with manual analysis as a substitute — CodeIndex's static analysis provides the dependency graph, metrics, and community detection that Oracle builds on.

### Phase 1: Scope and Static Analysis Ingestion

**Decision: What mode to run?**
- User wants "quick check only" → Run only Phase 1 (review data), report findings
- User wants "find gaps" → Run Phase 1, identify undocumented modules/communities
- User wants "full analysis" → Run all phases (default)

#### 1.1 Ingest CodeIndex Static Analysis

Read and parse CodeIndex's static analysis output:

1. **Parse `codebase_map.json`**: Extract components, edges, metrics, communities, and hubs
2. **Parse `dependency_graphs/*.json`**: Extract detailed per-module dependency data
3. **Note `graph.html.tpl`**: Available in this skill's directory for generating an interactive graph viewer in Phase 3

From `codebase_map.json`, identify:
- **Communities**: Groups of related components (these become module docs)
- **Hubs**: High-connectivity components (these need blast radius analysis)
- **Edges**: Dependency relationships between components
- **Metrics**: File counts, complexity indicators, coupling scores

#### 1.2 Detect Missing Context (Infrastructure, Serverless, Multi-lang)

Scan for patterns that static analysis misses:

**Decision: Infrastructure detected?**
- IF serverless.yml OR *.tf OR k8s/ found → Document in CODEBASE_MAP.md
- IF no infrastructure files → Skip infrastructure sections

**Infrastructure & Runtime Detection:**
```bash
# Find serverless/lambda configs
find . -name "serverless.yml" -o -name "serverless.ts" -o -name "serverless.js" -o -name "template.yml" -o -name "samconfig.toml"

# Find Terraform/K8s
find . -name "*.tf" -o -name "*.tfvars" -o -name "*.yaml" -path "*/k8s/*" -o -name "deployment.yaml"

# Find CI/CD
ls .github/workflows/ 2>/dev/null || ls .gitlab-ci.yml 2>/dev/null

# Find workspace configs (monorepo)
cat package.json | grep -A5 '"workspaces"' 2>/dev/null
cat nx.json 2>/dev/null
cat pnpm-workspace.yaml 2>/dev/null
```

**Cross-language Contracts:**
```bash
# Find protobuf, GraphQL, OpenAPI schemas
find . -name "*.proto" -o -name "*.graphql" -o -name "*.gql" -o -name "openapi*.json" -o -name "openapi*.yaml"
```

Document these findings in `CODEBASE_MAP.md` under "Infrastructure & Runtime Context".

### Phase 2: Analysis Pass (Structure + Meaning)

Oracle reads actual source code and builds its understanding. Run parallel analysis agents per module/community.

#### 2.1 Code Structure Analysis

**Method:** Use all available tools in order of precision, falling back gracefully.

**Tool priority for structure analysis:**

| Priority | Tool | What it provides | Fallback |
|----------|------|-----------------|----------|
| 1st | **Kai** `kai_symbols(file, kind="function", signatures=true)` | Full symbol inventory with signatures — no file reading needed | tree-sitter-analyze.py |
| 2nd | **Kai** `kai_dependencies(file)` / `kai_dependents(file)` | File-level import graph (TS) | Grep for imports |
| 3rd | **LSP** `lsp_document_symbols(file)` | Type-aware symbol list with hierarchy | kai_symbols or tree-sitter |
| 4th | **LSP** `lsp_find_references(file, line, char)` | Precise caller/callee tracing | Grep for function name |
| 5th | **tree-sitter** `scripts/tree-sitter-analyze.py` | Bulk AST analysis | Read + Grep |
| 6th | **Read + Grep** | Direct source reading | Always available |

**When Kai is available** (run in parallel for all module files):

```
# Get symbol inventory for each file — fast overview without reading
kai_symbols(file, kind="function", signatures=true)

# Get file dependency graph
kai_dependencies(file)  → what this file imports
kai_dependents(file)    → what imports this file

# Get full context for hub files (high-connectivity)
kai_context(file, depth=2)  → symbols + deps + dependents + tests
```

**When LSP is available** (use for precision on key components):

```
# Type-aware symbol list with full hierarchy
lsp_document_symbols(file)

# Precise reference tracing for hub functions
lsp_find_references(file, line, character)

# Type information for understanding interfaces
lsp_hover(file, line, character)

# Check for errors/warnings
lsp_diagnostics(file)
```

**Fallback** (always works):

```
You are the structure-analyst for module: {module_name}

Tools to use:
- scripts/tree-sitter-analyze.py for bulk analysis
- Read tool for source file reading
- Grep for quick symbol lookup

Data sources:
- codebase_map.json communities and edges for this module
- dependency_graphs/{module}.json for detailed dependencies
- Actual source files
```

Steps:
1. Read codebase_map.json, extract components in this module's community
2. For each file, get symbols (Kai → LSP → tree-sitter → Read, whichever is available)
3. Map dependencies (Kai → Grep for imports)
4. For hub files, trace references (LSP → Grep for function names)
5. Cross-reference with dependency graph data for accuracy
6. Build a comprehensive module understanding with evidence (path:line)

#### 2.2 Infrastructure & Runtime Analysis

For modules with detected infrastructure context (Lambda, serverless, containers):

```
Analyze infrastructure:
- Does serverless.yml match the handler code?
- What are the Lambda triggers and their configuration?
- What Terraform resources exist and what code paths do they support?
- What is the runtime (Node18, Python3.11, Go1.21)?
```

#### 2.3 Cross-Language Contract Analysis

For monorepos with multiple languages:

```
Analyze contract consistency:
- Does protobuf schema match both Go and TypeScript implementations?
- Are GraphQL resolvers in sync with schema definitions?
- Do OpenAPI specs match the actual endpoint handlers?
```

#### 2.4 Meaning Analysis (Why and Risk)

For each module, build decision-support context:

1. **Design rationale**: infer from code, tests, comments, history.
2. **Trade-offs**: what was optimized, what was sacrificed.
3. **Failure modes**: how it breaks, detection signals, first recovery actions.
4. **Change impact**: blast radius, downstream dependents, relevant tests.
5. **Ownership boundary**: which directory/service boundaries are crossed.
6. **Runtime context** (for serverless/Lambda): cold start implications, timeout risks, concurrency limits
7. **Infrastructure dependencies**: required IAM permissions, VPC config, external service dependencies

**Enhanced blast radius with Kai + LSP** (when available):

For hub files identified by CodeIndex (5+ importers), use Kai and LSP to get precise impact data:

```
# Kai: transitive impact analysis (walks dependency graph)
kai_impact(file, max_depth=3)  → all affected files + tests

# LSP: precise reference count for specific exported functions
lsp_find_references(file, line, char)  → exact call sites with line numbers
```

This produces much richer blast radius documentation than CodeIndex alone:
- CodeIndex: "file X has 12 importers" (static count)
- Kai: "changing file X affects 18 files transitively, including 3 test files"
- LSP: "function `handleAuth` at line 42 is called from 7 specific locations"

**Enhanced pattern discovery with CocoIndex** (when available):

Search for cross-cutting patterns that static analysis misses:

```bash
.venv-cocoindex/bin/python .cocoindex/query.py "error handling strategy" --top-k 5
.venv-cocoindex/bin/python .cocoindex/query.py "retry and resilience pattern" --top-k 5
.venv-cocoindex/bin/python .cocoindex/query.py "authentication authorization flow" --top-k 5
```

Document discovered patterns in module docs under "Design Patterns" section.

### Phase 3: Write Documentation

Oracle writes all documentation from scratch using analysis data from Phase 2.

#### Templates

All 18 templates live in `codeindex/templates/`. Use them as structural guides — Oracle fills with analysis data from `codebase_map.json` and direct source code reading.

**Structure & analysis:**
- `overview.md.tpl` — project overview, health dashboard, module map
- `module.md.tpl` — per-module: components, hubs, deps, quality metrics
- `architecture.md.tpl` — C4 diagrams, layer map, community detection, design decisions
- `component.md.tpl` — per-component: signature, metrics, dependencies
- `dependencies.md.tpl` — dependency graph, hubs, blast radius, circular deps, temporal coupling
- `quality.md.tpl` — complexity hotspots, maintainability index, violations

**Cross-cutting concerns:**
- `key-flows.md.tpl` — cross-module execution paths and sequence diagrams
- `api-surface.md.tpl` — API endpoints, contracts, versioning
- `data-model.md.tpl` — data schemas, relationships, migrations
- `infrastructure.md.tpl` — deployment, runtime, infrastructure-as-code
- `testing.md.tpl` — test architecture, coverage mapping, test-to-component traceability
- `observability.md.tpl` — logging, metrics, tracing, health checks, alerting
- `security.md.tpl` — trust boundaries, auth flows, secrets management, input validation

**Process & navigation:**
- `onboarding.md.tpl` — getting started, dev workflow, common tasks
- `adr.md.tpl` — architecture decision records (explicit + inferred from code)
- `product-requirements.md.tpl` — functional requirements traceability
- `CODEBASE_MAP.md.tpl` — Oracle index document with priorities and unknowns

#### Writing each module doc

For each module/community identified in Phase 1:

**Step 1: Write the module doc from scratch** using:
- `codeindex/templates/module.md.tpl` as structural guide (components table, hub analysis, deps, quality metrics)
- Static analysis data from `codebase_map.json` (metrics, dependencies, communities, hubs)
- Direct source code reading from Phase 2
- Match template to doc type — all 18 templates in `codeindex/templates/` cover: overview, module, architecture (with C4), component, dependencies (with blast radius), quality, key-flows, api-surface, data-model, infrastructure, testing, observability, security, onboarding, adr, product-requirements, CODEBASE_MAP

**Step 2: Add evidence inline.** Sprinkle `path:line` references throughout, not in a separate table. Example:
- "The handler validates the request payload (`internal/handler/create.go:45`)"

**Step 3: Include decision-support sections where they naturally belong:**
- **Design Rationale** near the architecture section
- **Failure Modes & Recovery** after the component/flow descriptions
- **Blast Radius & Safe Change Plan** near the dependency section
- **Infrastructure Context** (Lambda config, IAM, VPC) near deployment/runtime sections
- **Unknowns** at the end — things Oracle couldn't verify with concrete next steps

**Step 4: Writing quality pass.** Apply [Writing Quality Standards](#writing-quality-standards):
1. Active voice, present tense, short sentences (under 25 words)
2. Lead with the point — first sentence of each paragraph states the main idea
3. Replace vague language with specifics: exact counts, concrete names, measured values
4. Cut filler words: "simply", "just", "note that", "there is/are", weasel words
5. Consistent terminology — same concept = same word throughout
6. Each section answers "so what?" for the target audience
7. Heading hierarchy: sentence case, levels increment by one, no trailing punctuation
8. Scrub sensitive data: replace real webhook URLs, bot tokens, API keys, personal names from git config, and `/Users/username/...` paths with generic placeholders

**Step 5: Append compact Oracle metadata footer.**

Only metadata goes at the bottom:

```markdown
<!-- ORACLE-META
Written by codebase-oracle | {timestamp}
Data: CodeIndex static analysis + direct source reading
Audience: {audience} | Confidence: {overall}%
Unknowns: {N} items pending verification
-->
```

**Step 6: Generate interactive graph viewer (`graph.html`).**

The `graph.html.tpl` template lives in this skill's directory (not in codeindex). It produces a self-contained D3 force-directed graph with module clustering, convex hulls, colored links, search, tooltips, minimap, and keyboard shortcuts.

**How to generate:**

1. **Read the template** `graph.html.tpl` from this skill's directory.

2. **Read `docs/codebase_map.json`** — this is the data source.

3. **Copy the template to `docs/graph.html`** and fill in the 4 JavaScript data blocks near the top of `<script>`. All data comes from `codebase_map.json`:

| Data block | Source | Description |
|---|---|---|
| `filesData` | `nodes[]` | Object keyed by file path. Each: `{functions, max_complexity, hub_count, community_ids, function_names}` |
| `edgesData` | `edges[]` | Array of `{source, target, weight}` |
| `summaryData` | `summary_metrics` | `{total_nodes, total_edges, hub_files, circular_dependencies}` |
| `moduleConfig` | Inferred from communities/dirs | `{"Module Name": {color: "#hex", files: [...]}}` per community |

4. **Replace the title** — Change `<title>` and `<h1>` to the actual project name.

5. **Write to `docs/graph.html`**.

Color palette for modules: `#58a6ff, #f78166, #d2a8ff, #7ee787, #f0883e, #79c0ff, #ffa657, #ff7b72, #3fb950, #a5d6ff`

Generate `CODEBASE_MAP.md` as the index of all Oracle-written module docs and include:

- Audience + primary tasks
- **Infrastructure & Runtime Context** (Lambdas, containers, scheduled jobs)
- **Multi-language boundaries** (which modules use which languages, how they communicate)
- **Monorepo structure** (workspaces, shared packages, build order)
- Top risky hubs
- Most critical unknowns
- Priority recommendations for next engineering work

**Multi-diagram architecture section.** Include separate Mermaid diagrams for each concern (see [references/architecture-analysis.md](references/architecture-analysis.md) for templates):

1. **C4 Context** — system boundary, users, external dependencies
2. **Module/domain relationships** — internal component ownership and communication
3. **Infrastructure topology** — where things run (Lambda, containers, databases, queues)
4. **Key data flows** — sequence diagrams for critical request paths
5. **Dependency graph** — hub nodes highlighted, blast radius annotated

Do not flatten everything into a single overview diagram. Each diagram answers a different question.

## Rules

ALWAYS:
- **Write all documentation from scratch** — Oracle is the sole author, not an editor of CodeIndex output
- **Use CodeIndex static analysis as quantitative foundation** (metrics, dependencies, communities, hubs)
- **Read actual source code for all qualitative claims** — never rely solely on static analysis data
- **Add evidence inline** (`path:line`) throughout the content, not in a separate table
- **Insert sections where they belong** — failure modes near flows, blast radius near dependencies
- Produce one coherent document that reads naturally
- Generate single CODEBASE_MAP.md as index
- Start with Documentation Intent Contract (audience, tasks, decision horizon)
- Include rationale, trade-offs, failure modes, and safe-change guidance
- Use `Unknown` + verification steps for things Oracle couldn't verify
- **Scan for infrastructure context** (serverless.yml, terraform, k8s) and document runtime behavior
- **Detect monorepo structure** (workspaces, nx.json) and document package boundaries
- **Trace cross-language contracts** (protobuf, GraphQL, OpenAPI) when multiple languages present

NEVER:
- **Append a "validation report" section** — there is nothing to validate against
- **Duplicate information** — don't repeat content in both the doc body and a footer table
- Create separate validation docs alongside module docs
- Reference `.codeindex-cache/` - does not exist
- Reference `module_tree.json` - not produced in static-only mode
- Use `--use-agent-sdk` flag — CodeIndex runs static analysis only
- Write high-confidence claims without evidence
- Leave generic summaries that do not help decisions
- Hide uncertainty when evidence is incomplete

## Quality Gates (CI-Friendly)

Use these checks to keep docs meaningful over time:

1. **Evidence density**: docs should have `path:line` references throughout the body, not just in a footer.
2. **Placeholder check**: fail if `REPLACE` remains.
3. **Unknown discipline**: fail if uncertainty is implied but no `Unknowns` section exists.
4. **Drift check**: if module files changed, corresponding module docs must be updated.
5. **Writing quality**: no "simply"/"just"/"easily"/"obviously" in docs. No weasel words ("some", "many", "various") without specifics. All code blocks specify language. Headings in sentence case.
6. **Sensitive data**: no webhook URLs, API keys, bot tokens, personal names from git config, internal server names, or file paths containing usernames (`/Users/username/...`, `/home/username/...`). Replace with placeholders like `<YOUR_WEBHOOK_URL>`, `<BOT_TOKEN>`, `your-username`.

Run bundled checker (recommended):

```bash
# from project root
bash scripts/doc-quality-check.sh docs

# fallback when developing in this plugin repo
bash scripts/doc-quality-check.sh docs

# CI/MR mode: compare against target branch
DOC_CHECK_BASE_REF=origin/main \
  bash scripts/doc-quality-check.sh docs
```

Fallback manual checks:

```bash
# 1) No placeholders
! rg -n "REPLACE" docs/*.md

# 2) Evidence references throughout doc body (not just in a footer)
rg -n '`[^`]+:[0-9]+`' docs/*.md

# 3) Must have Unknowns section
rg -n "### Unknowns" docs/*.md

# 4) No filler/weasel words
! rg -wn "simply|obviously|easily" docs/*.md
# Should not find unqualified weasel words
rg -wn "some\b|many\b|various\b|several\b" docs/*.md

# 6) No sensitive data leakage
! rg -in "webhook.*https?://|bot.*token|api[_-]?key" docs/*.md
! rg -n "/Users/[a-zA-Z]|/home/[a-zA-Z]" docs/*.md
```

## Output Structure

```
docs/
├── CODEBASE_MAP.md              # Oracle-written index with priorities and unknowns
├── {module}.md                  # Oracle-written module docs (one per community)
│   ├── Structure from CodeIndex templates
│   ├── Data from codebase_map.json + source code reading
│   ├── Evidence (path:line) throughout
│   ├── Decision-support sections (failure modes, blast radius, rationale)
│   └── <!-- ORACLE-META --> compact footer
├── codebase_map.json            # CodeIndex static analysis (unchanged)
├── graph.html                   # AI-generated interactive viewer (from skill's graph.html.tpl)
├── dependency_graphs/           # CodeIndex dependency data (unchanged)
└── templates/                   # CodeIndex doc templates (unchanged)
```

## External Tools Integration

Oracle's analysis improves with each additional tool available. CodeIndex is required; CocoIndex, Kai, and LSP are optional but each adds a unique dimension.

### Tool Comparison — What Each Adds to Oracle

| Capability | CodeIndex | CocoIndex | Kai | LSP |
|---|---|---|---|---|
| **Community/module detection** | Yes (primary) | — | — | — |
| **Dependency graphs** | Yes (static) | — | Yes (file-level imports) | — |
| **Metrics & complexity** | Yes | — | — | — |
| **Semantic concept search** | — | Yes (best for "how does X work?") | — | — |
| **Symbol inventory** | tree-sitter based | — | Yes (fast, no file read) | Yes (type-aware) |
| **Caller/callee tracing** | — | — | Partial (TS only) | Yes (precise, all languages) |
| **Impact/blast radius** | Fan-in count | — | Transitive graph walk | Reference count per function |
| **Type information** | — | — | Signatures only | Full type resolution |
| **Snapshot diffing** | — | — | Yes (before/after) | — |
| **Cross-cutting patterns** | — | Yes ("retry pattern" across codebase) | — | — |
| **Diagnostics/errors** | — | — | — | Yes (type errors, warnings) |

### CocoIndex — Semantic Search

Best for: discovering related code by concept, finding cross-cutting patterns, tracing design intent when naming is inconsistent.

```bash
# Check availability
ls .cocoindex/query.py 2>/dev/null

# Semantic search
.venv-cocoindex/bin/python .cocoindex/query.py "authentication flow" --top-k 5

# Broader exploration
.venv-cocoindex/bin/python .cocoindex/query.py "error handling strategy" --top-k 10
```

**When to use during Oracle analysis:**

| Task | Use CocoIndex? |
|---|---|
| Find code by concept ("how does auth work?") | Yes |
| Discover undocumented design patterns | Yes — `"retry logic"`, `"caching strategy"` |
| Trace cross-module data flows (naming varies) | Yes |
| Find exact imports of a module | No — use Grep |
| Read a specific file | No — use Read |

**Setup:** If missing, suggest `/aio-cocoindex:aio-cocoindex-setup`. Oracle does not set up CocoIndex itself.

### Kai — Semantic Graph

Best for: fast symbol overview without reading files, file-level dependency tracking, impact analysis, and snapshot-based change tracking.

```
# Check availability
kai_status()  → shows if index exists and is fresh

# Symbol inventory (parallel for all files in a module)
kai_symbols(file, kind="function", signatures=true)

# Dependency tracking
kai_dependencies(file)  → what this file imports
kai_dependents(file)    → what imports this file

# Full context for hub files
kai_context(file, depth=2)  → symbols + deps + dependents + tests

# Blast radius analysis
kai_impact(file, max_depth=3)  → transitive downstream files + tests

# Snapshot for change tracking (before/after documentation updates)
kai_refresh()  → creates snapshot, returns snapshot_id
kai_diff(base="id1", head="id2")  → semantic diff between snapshots
```

**When to use during Oracle analysis:**

| Task | Use Kai? |
|---|---|
| Get all functions in a file without reading it | Yes — `kai_symbols` |
| Check what files import a module | Yes — `kai_dependents` |
| Assess blast radius of hub changes | Yes — `kai_impact` |
| Track what changed after doc updates | Yes — `kai_diff` |
| Precise caller tracing for a specific function | No — use LSP |
| Type information | No — use LSP |

**Setup:** If `.kai/` directory doesn't exist, run `kai_refresh()` to initialize. If Kai MCP server is not configured, inform user to add it to their MCP config.

**Limitations:** Kai's caller/callee tracking may return empty for some language combinations (e.g., Rust modules). Fall back to LSP or Grep.

### LSP — Language Server Protocol

Best for: precise type-aware analysis, exact reference counting, diagnostics, and hover information. The most accurate tool for caller/callee tracing.

```
# Check availability
lsp_servers()  → list running language servers

# Symbol list with hierarchy
lsp_document_symbols(file)

# Precise references (all call sites)
lsp_find_references(file, line, character)

# Type information on hover
lsp_hover(file, line, character)

# Navigate to definition
lsp_goto_definition(file, line, character)

# Errors and warnings
lsp_diagnostics(file)
lsp_diagnostics_directory(directory)
```

**When to use during Oracle analysis:**

| Task | Use LSP? |
|---|---|
| Exact caller count for a hub function | Yes — `lsp_find_references` |
| Type information for interfaces/contracts | Yes — `lsp_hover` |
| Check for type errors across module | Yes — `lsp_diagnostics_directory` |
| Bulk symbol listing for many files | No — use Kai (faster, parallel) |
| Semantic concept search | No — use CocoIndex |

**Setup:** LSP requires language servers to be running. If `lsp_servers()` returns empty, inform user. Common setups:
- TypeScript: `typescript-language-server` (usually auto-started by editors)
- Rust: `rust-analyzer`
- Go: `gopls`
- Python: `pyright` or `pylsp`

### Unified Analysis Workflow (Phase 2)

When all tools are available, Oracle uses them in combination:

```
1. CodeIndex codebase_map.json    → identify communities, hubs, metrics
2. Kai kai_symbols (parallel)     → fast symbol inventory for all files
3. Kai kai_dependencies           → file-level import graph
4. CocoIndex semantic search      → discover cross-cutting patterns
5. LSP lsp_find_references        → precise caller tracing for hubs
6. LSP lsp_diagnostics            → catch type errors and warnings
7. Read + Grep                    → fill gaps, read actual implementations
```

When only CodeIndex is available, Oracle falls back to tree-sitter + Read + Grep (the original workflow). Each additional tool enriches the documentation.

## Troubleshooting

**No CodeIndex static analysis:** Oracle MUST run `.codeindex/bin/codeindex generate --verbose --no-cache` itself in Phase 0. Do not skip to manual analysis.

**`codeindex` not found:** User needs to install into project-local venv. Run `/aio-codebase-oracle:aio-codebase-index` or:
```bash
python3 -m venv .codeindex
PLUGIN_DIR="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-codebase-oracle/*/codeindex 2>/dev/null | sort -V | tail -1)"
.codeindex/bin/pip install -e "$(dirname "$PLUGIN_DIR")"
```

**Stale static analysis:** Code changed since last CodeIndex run. Re-run: `.codeindex/bin/codeindex generate --verbose --no-cache`
