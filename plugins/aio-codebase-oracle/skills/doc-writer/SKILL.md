---
name: aio-doc-writer
description: Generate comprehensive architecture documentation powered by GitNexus knowledge graph and LSP analysis. Triggers: "analyze codebase", "map architecture", "document architecture", "what does this codebase do", "codebase oracle".
context: fork
agent: oh-my-claudecode:architect
---

```bash
SCRIPTS="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-codebase-oracle/*/skills/doc-writer/scripts 2>/dev/null | sort -V | tail -1)"
```

## Environment
- GitNexus: !`npx gitnexus status 2>/dev/null && echo "AVAILABLE" || echo "NOT INSTALLED"`

# Codebase Oracle

Comprehensive architecture documentation powered by GitNexus knowledge graph combined with Oracle direct documentation writing and LSP precision analysis.

**Core Philosophy:** Oracle **writes all documentation from scratch** using GitNexus's knowledge graph (structure, dependencies, clusters, flows, hybrid search) combined with LSP type-aware analysis and direct source code reading.

**What GitNexus Provides:** A precomputed knowledge graph — nodes (functions, classes, modules), edges (imports, calls, inheritance), clusters (functional communities with cohesion scores), execution flows from entry points, and hybrid search (BM25 + semantic). All from a single `npx gitnexus analyze`.

**What LSP Provides:** Type-aware precision — hover info, exact reference counts, caller tracing, diagnostics, rename safety.

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
3. `Confidence` - `░░░░░` to `▓▓▓▓▓`.
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

**Key rules:** Active voice, present tense, short sentences (<25 words), lead with the point, concrete over abstract, no filler words ("simply", "just", "easily"). One term per concept throughout.

## Tool Availability Detection (Run First)

Before starting any phase, detect which analysis tools are available. Oracle adapts its workflow based on what's installed.

**Decision matrix:**

| Tool | Status | Impact on Oracle |
|------|--------|-----------------|
| GitNexus | Required | Knowledge graph foundation — structure, deps, clusters, flows, search |
| GitNexus MCP | Recommended | Enables graph queries directly; fallback: read JSON output |
| LSP | Required | Precise type info, caller tracing, diagnostics |

**If GitNexus is missing**, stop and inform the user:

```
Tools detected:
✗ GitNexus — MISSING (install: npm install -g gitnexus)
✓ LSP — language servers available

ERROR: GitNexus is required. Install it before proceeding.
```

Oracle will NOT proceed until GitNexus is available.

## Integration Architecture

GitNexus builds knowledge graph (Phase 0) → Oracle reads graph + analyzes with LSP (Phases 1-2) → Oracle writes all docs (Phase 3). See [references/architecture-analysis.md](references/architecture-analysis.md) for detailed architecture diagrams.

**Key principle:** GitNexus provides the knowledge graph (structure, dependencies, clusters, flows). Oracle provides qualitative analysis and writes every doc.

## GitNexus Knowledge Graph Output

After running `npx gitnexus analyze`, GitNexus produces a knowledge graph with:

```
Nodes:    Functions, classes, methods, interfaces (with file:line locations)
Edges:    Import references, function calls, class inheritance, type usage
Clusters: Functional communities with cohesion scores
Flows:    Execution paths from entry points
Search:   Hybrid BM25 + semantic search across the graph
```

**MCP Integration:** When GitNexus MCP server is configured, Oracle queries the graph directly using MCP tools. When not available, Oracle reads the JSON output from `npx gitnexus analyze`.

## Workflow: Documentation Generation

### Quick Decision Tree

**What did the user ask for?**

| User Request | Run These Phases |
|--------------|------------------|
| "Analyze codebase" / "Full analysis" | All phases (0-3) |
| "Find missing docs" / "What's not documented?" | Phase 0, 1 only |
| "Update docs" / "Refresh docs" | Phase 0-3 (full re-run) |
| "Quick check" / "Is this up to date?" | Phase 1 only (review graph data) |

### Phase 0: Build GitNexus Knowledge Graph (MANDATORY first step)

**You MUST run GitNexus before any manual analysis.** Do not skip this step. Do not substitute with manual file reading. GitNexus generates the knowledge graph that Oracle uses as the foundation for documentation.

```bash
# Run GitNexus analysis from the project root
npx gitnexus analyze

# If GitNexus MCP server is configured, the graph is queryable via MCP tools
# Otherwise, read the output JSON directly
```

**Do NOT skip GitNexus and fall back to manual file reading** — GitNexus provides dependency resolution, clustering, and flow tracing that manual analysis cannot replicate efficiently.

**If `gitnexus` is not installed**, inform the user:
```
GitNexus is required. Install with: npm install -g gitnexus
```

### Phase 1: Scope and Knowledge Graph Ingestion

**Decision: What mode to run?**
- User wants "quick check only" → Run only Phase 1 (review data), report findings
- User wants "find gaps" → Run Phase 1, identify undocumented modules/clusters
- User wants "full analysis" → Run all phases (default)

#### 1.1 Ingest GitNexus Knowledge Graph

Read and parse GitNexus's knowledge graph output:

1. **Extract nodes**: Functions, classes, methods with file:line locations
2. **Extract edges**: Import references, function calls, inheritance, type usage
3. **Extract clusters**: Functional communities with cohesion scores (these become module docs)
4. **Extract flows**: Execution paths from entry points
5. **Identify hubs**: High-connectivity nodes (these need blast radius analysis)

From the knowledge graph, identify:
- **Clusters/Communities**: Groups of related components (these become module docs)
- **Hubs**: High fan-in nodes (these need blast radius analysis)
- **Entry points**: Where execution flows begin
- **Edges**: All relationship types between components

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

Oracle reads actual source code and builds its understanding. Run parallel analysis agents per module/cluster.

#### 2.1 Code Structure Analysis

**Method:** Use GitNexus graph + LSP in order of precision.

| Priority | Tool | Purpose |
|----------|------|---------|
| 1st | **GitNexus** graph queries | Node inventory, edges, clusters, flows, hub detection |
| 2nd | **GitNexus** hybrid search | Cross-cutting patterns, semantic concept discovery |
| 3rd | **LSP** `lsp_document_symbols` / `lsp_find_references` | Type-aware symbols + precise caller tracing |
| 4th | **Read + Grep** | Fill gaps, read implementations |

For detailed tool commands and usage patterns, see [references/tools-integration.md](references/tools-integration.md).

Steps for each cluster:
1. Query GitNexus graph for nodes in this cluster (functions, classes, deps)
2. Enrich with LSP (`lsp_document_symbols`) for type-aware hierarchy
3. Map dependencies from GitNexus edges (imports, calls, inheritance)
4. For hub nodes: GitNexus flow tracing + LSP `lsp_find_references` for blast radius
5. GitNexus hybrid search for cross-cutting patterns ("error handling", "retry logic")
6. Read + Grep to fill gaps
7. Build comprehensive module understanding with evidence (path:line)

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

**Enhanced blast radius:** For hub nodes (5+ dependents), use GitNexus flow tracing for transitive impact and `lsp_find_references` for exact call sites. See [references/tools-integration.md](references/tools-integration.md) for commands and interpretation.

**Pattern discovery:** Use GitNexus hybrid search to find cross-cutting patterns ("error handling strategy", "retry and resilience pattern"). Document discovered patterns in module docs under "Design Patterns".

### Phase 3: Write Documentation

Oracle writes all documentation from scratch using analysis data from Phase 2.

#### Templates

All 17 doc templates live in this skill's `templates/` directory. Use them as structural guides — Oracle fills with analysis data from GitNexus graph and direct source code reading.

**Structure & analysis:**
- `overview.md.tpl` — project overview, health dashboard, module map
- `module.md.tpl` — per-module: components, hubs, deps, quality metrics
- `architecture.md.tpl` — C4 diagrams, layer map, community detection, design decisions
- `component.md.tpl` — per-component: signature, metrics, dependencies
- `dependencies.md.tpl` — dependency graph, hubs, blast radius, circular deps
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

For each module/cluster identified in Phase 1:

**Step 1: Write the module doc from scratch** using:
- Templates from `templates/` directory as structural guides
- GitNexus cluster data (nodes, edges, cohesion scores, flows)
- LSP type information and reference counts
- Direct source code reading from Phase 2

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
Data: GitNexus knowledge graph + LSP + direct source reading
Audience: {audience} | Confidence: {overall}%
Unknowns: {N} items pending verification
-->
```

**Step 6: Generate interactive graph viewer (`graph.html`).**

The `graph.html.tpl` template lives in this skill's directory. It produces a self-contained D3 force-directed graph with module clustering, convex hulls, colored links, search, tooltips, minimap, and keyboard shortcuts.

**How to generate:**

1. **Read the template** `graph.html.tpl` from this skill's directory.

2. **Read GitNexus graph data** — nodes, edges, clusters.

3. **Copy the template to `docs/graph.html`** and fill in the JavaScript data blocks near the top of `<script>`. Map GitNexus graph data to:

| Data block | Source | Description |
|---|---|---|
| `filesData` | GitNexus nodes | Object keyed by file path. Each: `{functions, max_complexity, hub_count, community_ids, function_names}` |
| `edgesData` | GitNexus edges | Array of `{source, target, weight}` |
| `summaryData` | Graph metrics | `{total_nodes, total_edges, hub_files, circular_dependencies}` |
| `moduleConfig` | GitNexus clusters | `{"Module Name": {color: "#hex", files: [...]}}` per cluster |

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
- **Write all documentation from scratch** — Oracle is the sole author
- **Use GitNexus knowledge graph as the foundation** (structure, dependencies, clusters, flows, search)
- **Read actual source code for all qualitative claims** — never rely solely on graph data
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
- Reference `.codeindex-cache/`, `module_tree.json`, `codebase_map.json` — these are from the old CodeIndex system
- Write high-confidence claims without evidence
- Leave generic summaries that do not help decisions
- Hide uncertainty when evidence is incomplete

## Quality Gates

Run the bundled quality checker after writing docs:

```bash
bash $SCRIPTS/doc-quality-check.sh docs
```

Key gates: evidence density (path:line refs), no placeholders, unknowns section required, no filler words, no sensitive data leakage.

For full gate definitions and manual check commands, see [references/quality-gates.md](references/quality-gates.md).

## Output Structure

```
docs/
├── CODEBASE_MAP.md              # Oracle-written index with priorities and unknowns
├── {module}.md                  # Oracle-written module docs (one per cluster)
│   ├── Data from GitNexus graph + LSP + source code reading
│   ├── Evidence (path:line) throughout
│   ├── Decision-support sections (failure modes, blast radius, rationale)
│   └── <!-- ORACLE-META --> compact footer
└── graph.html                   # Interactive D3 viewer (from skill's graph.html.tpl)
```

## External Tools Integration

Oracle requires GitNexus + LSP for comprehensive analysis. Each provides a unique dimension.

| Tool | Primary Use |
|------|------------|
| GitNexus | Knowledge graph: structure, dependencies, clusters, flows, hybrid search |
| LSP | Precise type info, caller tracing, diagnostics |

For detailed tool commands, comparison matrix, setup instructions, and usage guidelines, see [references/tools-integration.md](references/tools-integration.md).

## Troubleshooting

**GitNexus not installed:** Install with `npm install -g gitnexus` or use `npx gitnexus analyze`.

**GitNexus MCP not configured:** Oracle can still work by reading GitNexus JSON output directly. MCP integration is recommended for interactive graph queries.

**LSP not available:** Configure language servers for your project's languages. Without LSP, Oracle loses type-aware analysis but can still produce docs from GitNexus graph + source reading.
