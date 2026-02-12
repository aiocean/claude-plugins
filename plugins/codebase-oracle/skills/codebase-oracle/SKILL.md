---
name: codebase-oracle
description: |
  Deep codebase analysis combining CodeWiki LLM-powered documentation, parallel agent team mapping, dependency/hub analysis, and evidence-based investigation. Use when "analyze codebase", "map architecture", "understand this project", "codebase oracle", "document architecture", "explore codebase", "what does this codebase do", "map this codebase", "codebase map", or exploring unfamiliar code. Automatically detects existing maps and updates incrementally.
---

# Codebase Oracle

Comprehensive architecture documentation: CodeWiki-enhanced analysis with specialized analyst teams.

**Core Philosophy:** Oracle collaborates with CodeWiki - it **supplements missing pieces, validates claims, and enhances** with runtime/infrastructure knowledge that static analysis cannot detect.

**What CodeWiki Misses:** See [references/codewiki-gaps.md](references/codewiki-gaps.md) for full details on infrastructure, serverless, multi-language, and monorepo patterns that require Oracle supplementation.

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

### Quick Decision Tree

**What did the user ask for?**

| User Request | Run These Phases |
|--------------|------------------|
| "Analyze codebase" / "Full analysis" | All phases (0-5) |
| "Validate docs" / "Check accuracy" | Phase 0, 2, 4 only |
| "Find missing docs" / "What's not documented?" | Phase 0, 1.2 only |
| "Add Oracle section" / "Enhance existing docs" | Phase 2-5 only |
| "Quick check" / "Is this up to date?" | Phase 2 only |

### Phase 0: Run CodeWiki (if not done)

```bash
# Check if CodeWiki docs exist
ls docs/*.md docs/module_tree.json 2>/dev/null

# If not, run CodeWiki first
codewiki generate --output docs/
```

### Phase 1: Scope and Claim Inventory

**Decision: What mode to run?**
- User wants "quick check only" → Run only Phase 2 (validation), skip enhancement
- User wants "find gaps" → Run only Phase 1.2 (missing modules)
- User wants "full analysis" → Run all phases (default)

#### 1.1 Detect Missing Context (Infrastructure, Serverless, Multi-lang)

Before reading CodeWiki output, scan for patterns that static analysis misses:

**Decision: Infrastructure detected?**
- IF serverless.yml OR *.tf OR k8s/ found → Document in CODEBASE_MAP.md + validate in Phase 2.2
- IF no infrastructure files → Skip Phase 2.2

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

#### 1.2 Check for Missing Child Modules

**⚠️ IMPORTANT:** Only generate missing modules AFTER validating existing docs (Phase 2).
This prevents propagating CodeWiki errors to new docs.

CodeWiki may not generate docs for all child modules in `module_tree.json`, especially in monorepos:

**Step 1: Find missing modules**
```bash
# Note: CLAUDE_PLUGIN_ROOT is automatically set by Claude Code
# If running standalone, use relative path: ./scripts/find-missing-modules.py
uv run "${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/find-missing-modules.py" docs --format compact
```

**Step 2: Generate docs for missing children**

For each missing module:
1. Extract component list from `module_tree.json`
2. **Also scan for infrastructure context** (Is it a Lambda? Has serverless.yml? Part of which workspace?)
3. Generate `{Parent}_{Child}.md` with:
   - Module purpose and scope
   - **Runtime context** (Lambda handler, container, cron job)
   - **Infrastructure links** (serverless config, terraform resources)
   - Component list with brief descriptions
   - Architecture overview (Mermaid diagram)
   - Dependencies on parent/sibling modules

**Example workflow:**
```bash
# Check what's missing
uv run find-missing-modules.py docs --format compact
# Output shows: "shipping-partner_sync-ship-hero.md" missing

# Generate the missing doc with infrastructure context:
# 1. Read module_tree.json components
# 2. Check for serverless.yml in that module's path
# 3. Check if it's a Lambda handler (main.go with lambda.Start)
# 4. Document runtime + static analysis together
```

**Filename convention:**
- Child modules: `{Parent}_{Child}.md` (e.g., `Dependency Analyzer_Data Models.md`)
- Top-level: `{Module}.md` (e.g., `CLI Application.md`)

#### 1.3 Claim Inventory

For each module doc (existing + newly generated):

1. Read `docs/{module}.md`.
2. Extract claims from CodeWiki (`components`, `dependencies`, `architecture`, `flows`).
3. Convert to a claim inventory table.
4. Prioritize claims by decision impact (`incident`, `refactor`, `ownership`, `performance`).

### Phase 2: Structure Pass (Facts)

Run parallel validation agents per module to verify what exists in code.

#### 2.1 Code Structure Validation

**Method:** Use tree-sitter analysis + targeted file reads

```
You are the structure-analyst for module: {module_name}

Tools to use:
- scripts/tree-sitter-analyze.py for bulk analysis
- Read tool for specific file validation
- Grep for quick symbol lookup

Steps:
1. Read docs/{module_name}.md, extract claims about:
   - Component names and locations
   - Import/dependency relationships
   - Architecture patterns mentioned

2. For each claim, verify using:
   - Read the claimed file at the specific location
   - Run tree-sitter-analyze.py on the module directory
   - Compare findings with CodeWiki claims

3. Output claim table with actual evidence from code

4. If CodeWiki claims X but code shows Y → flag ⚠ Review
```

#### 2.2 Infrastructure & Runtime Validation

For modules with detected infrastructure context (Lambda, serverless, containers):

```
Validate infrastructure claims:
- Does serverless.yml match the handler code?
- Are Lambda triggers documented correctly?
- Do Terraform resources reference the right code paths?
- Is the runtime (Node18, Python3.11) documented?
```

#### 2.3 Cross-Language Contract Validation

For monorepos with multiple languages:

```
Validate contract consistency:
- Does protobuf schema match both Go and TypeScript implementations?
- Are GraphQL resolvers in sync with schema definitions?
- Do OpenAPI specs match the actual endpoint handlers?
```

### Phase 3: Meaning Pass (Why and Risk)

For each module, add decision-support context:

1. **Design rationale**: infer from code, tests, comments, history.
2. **Trade-offs**: what was optimized, what was sacrificed.
3. **Failure modes**: how it breaks, detection signals, first recovery actions.
4. **Change impact**: blast radius, downstream dependents, relevant tests.
5. **Ownership boundary**: which directory/service boundaries are crossed.
6. **Runtime context** (for serverless/Lambda): cold start implications, timeout risks, concurrency limits
7. **Infrastructure dependencies**: required IAM permissions, VPC config, external service dependencies

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
| {ACTUAL_CLAIM_FROM_DOC} | `{file}:{line}` | ▓▓▓▓░ | {WHY_THIS_MATTERS} |

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

### Infrastructure Context (if applicable)

| Resource Type | Configuration | Link to Code |
|---------------|---------------|--------------|
| Lambda | Runtime: Node18, Memory: 512MB | `serverless.yml:42` |
| API Gateway | Route: /api/v1/orders | `template.yml:88` |
| DynamoDB | Table: orders, GSI: status-index | `terraform/table.tf:12` |

### Confidence Assessment

Overall: ▓▓▓▓░ 85%
```

Generate `CODEBASE_MAP.md` as the index of all enhanced module docs and include:

- Audience + primary tasks
- **Infrastructure & Runtime Context** (Lambdas, containers, scheduled jobs)
- **Multi-language boundaries** (which modules use which languages, how they communicate)
- **Monorepo structure** (workspaces, shared packages, build order)
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
- **Scan for infrastructure context** (serverless.yml, terraform, k8s) and document runtime behavior
- **Detect monorepo structure** (workspaces, nx.json) and document package boundaries
- **Trace cross-language contracts** (protobuf, GraphQL, OpenAPI) when multiple languages present
- **Supplement missing child modules** from CodeWiki's module_tree.json

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
