---
name: aio-codebase-oracle
description: |
  This skill should be used when the user asks to "analyze codebase", "map architecture", "understand this project", "document architecture", "explore codebase", "what does this codebase do", "map this codebase", "codebase map", or mentions "codebase oracle". Deep codebase analysis combining CodeWiki LLM-powered documentation, parallel agent team mapping, dependency/hub analysis, and evidence-based investigation. Automatically detects existing maps and updates incrementally.
---

# Codebase Oracle

Comprehensive architecture documentation: CodeWiki-enhanced analysis with specialized analyst teams.

**Core Philosophy:** Oracle is an **active editor**, not a passive auditor. It reads CodeWiki output, validates against actual code, then **rewrites incorrect content directly** and **adds missing knowledge** (runtime, infrastructure, failure modes). The final doc should read as one coherent document — not CodeWiki content with a validation report stapled to the end.

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

### Prose Rules (apply during Phase 4 rewrite)

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
│ Phase 2: Oracle (Correct + Enhance)                             │
│                                                                 │
│   /codebase-oracle                                              │
│   ↓                                                             │
│   For EACH CodeWiki module doc:                                 │
│   1. Read CodeWiki's claims about the module                   │
│   2. Oracle agents analyze the actual code independently        │
│   3. Compare findings → Cross-validation                       │
│   4. REWRITE incorrect sections inline (fix errors in place)   │
│   5. ADD missing sections (failure modes, blast radius, etc.)  │
│   6. ADD evidence (path:line) to existing claims               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Output: Single Corrected + Enhanced Documentation               │
│                                                                 │
│   docs/{module}.md (rewritten as one coherent doc)             │
│   ├── Corrected content (errors fixed inline)                  │
│   ├── Evidence added (path:line references throughout)         │
│   ├── New sections added inline where they belong:             │
│   │   ├── Failure Modes & Recovery                             │
│   │   ├── Blast Radius & Safe Change Plan                      │
│   │   └── Design Rationale & Trade-offs                        │
│   └── <!-- ORACLE-META --> compact footer (confidence + stamp) │
└─────────────────────────────────────────────────────────────────┘
```

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
| "Validate docs" / "Check accuracy" | Phase 0, 2 only (report findings, don't rewrite) |
| "Find missing docs" / "What's not documented?" | Phase 0, 1.2 only |
| "Enhance existing docs" / "Fix docs" | Phase 2-5 (validate then rewrite) |
| "Quick check" / "Is this up to date?" | Phase 2 only |

### Phase 0: Run CodeWiki (MANDATORY first step)

**You MUST run CodeWiki before any manual analysis.** Do not skip this step. Do not substitute with manual file reading. CodeWiki generates LLM-powered module documentation that Oracle then corrects and enhances.

```bash
# Check if CodeWiki docs already exist and are recent
ls docs/*.md docs/module_tree.json 2>/dev/null

# If docs don't exist OR user requested fresh analysis → run CodeWiki
codewiki generate --use-agent-sdk --verbose --no-cache

# If docs exist and user just wants to update/enhance → still run with cache
codewiki generate --use-agent-sdk --verbose
```

**Flags explained:**
- `--use-agent-sdk`: Uses Claude agent SDK for higher-quality module docs
- `--verbose`: Shows progress so user can track generation
- `--no-cache`: Forces fresh analysis (use when no docs exist or docs are stale)

**When to use `--no-cache`:**
- First run (no existing docs)
- User explicitly asks for fresh/full analysis
- Code has changed significantly since last run

**When to skip `--no-cache`:**
- Docs exist and user wants incremental update
- User says "enhance docs" or "fix docs" (existing CodeWiki output is fine)

**If `codewiki` is not installed**, inform the user:
```
CodeWiki is required. Install with: pip install codewiki
```
Do NOT proceed with manual analysis as a substitute — CodeWiki's LLM-generated docs are the foundation Oracle builds on.

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
uv run scripts/find-missing-modules.py docs --format compact
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
uv run scripts/find-missing-modules.py docs --format compact
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

3. Build a corrections list:
   - CORRECT: CodeWiki claims X but code shows Y → record the fix
   - ADD: Code has Z but CodeWiki doesn't mention it → record the addition
   - EVIDENCE: Claim is correct but lacks path:line → record the reference

4. Output the corrections list (not just a validation table)
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

### Phase 4: Rewrite Module Docs (Correct + Enhance)

This is the core phase. For each module doc, **rewrite the file** to produce one coherent document:

**Step 1: Fix errors inline.** Don't flag — fix. Examples:
- CodeWiki says "5 Lambda functions" but code has 3 → rewrite to say 3
- CodeWiki says "Go 1.x" but go.mod says 1.21 → rewrite to say 1.21
- CodeWiki describes a component that doesn't exist → remove it
- CodeWiki misses a component that does exist → add it

**Step 2: Add evidence inline.** Sprinkle `path:line` references throughout the existing content, not in a separate table. Example:
- Before: "The handler validates the request payload"
- After: "The handler validates the request payload (`internal/handler/create.go:45`)"

**Step 3: Add missing sections inline where they naturally belong.** Don't dump everything at the bottom. Insert:
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
7. One coherent document — no "CodeWiki section" vs "Oracle section" split
8. Heading hierarchy: sentence case, levels increment by one, no trailing punctuation
9. Scrub sensitive data: replace real webhook URLs, bot tokens, API keys, personal names from git config, and `/Users/username/...` paths with generic placeholders

**Step 5: Append compact Oracle metadata footer.**

Only metadata goes at the bottom — not a second copy of the analysis:

```markdown
<!-- ORACLE-META
Enhanced by codebase-oracle | {timestamp}
Audience: {audience} | Confidence: {overall}%
Corrections: {N} errors fixed | Additions: {N} sections added
Unknowns: {N} items pending verification
-->
```

### Phase 5: Generate CODEBASE_MAP.md

Generate `CODEBASE_MAP.md` as the index of all enhanced module docs and include:

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

## Cross-Validation Logic

### When Both AI Systems Agree → Keep + Add Evidence

```python
if codewiki_claim == oracle_finding:
    # Keep the content, add path:line evidence inline
    action = "add evidence references"
```

### When They Disagree → Fix the Content

```python
if codewiki_claim != oracle_finding:
    if oracle_has_strong_evidence:
        # Rewrite the section with correct information
        action = "fix inline with evidence"
    else:
        # Add as Unknown with verification step
        action = "add to Unknowns section"
```

### Example: Before and After Correction

**Before (CodeWiki error):**
```markdown
## Dependencies
This module depends on: config, utils, logger
```

**After (Oracle correction):**
```markdown
## Dependencies
This module depends on: config, utils, logger, database, cache (`internal/service/export.go:12-16`).
The database and cache imports are used for export job persistence and result caching.
```

## Rules

ALWAYS:
- **Fix errors directly in the doc** — don't just flag them in a separate section
- **Add evidence inline** (`path:line`) throughout the content, not in a separate table
- **Insert new sections where they belong** — failure modes near flows, blast radius near dependencies
- Produce one coherent document that reads naturally, not "CodeWiki part" + "Oracle part"
- Generate single CODEBASE_MAP.md as index
- Cross-validate: compare CodeWiki claims with Oracle findings
- Start with Documentation Intent Contract (audience, tasks, decision horizon)
- Include rationale, trade-offs, failure modes, and safe-change guidance
- Use `Unknown` + verification steps for things Oracle couldn't verify
- **Scan for infrastructure context** (serverless.yml, terraform, k8s) and document runtime behavior
- **Detect monorepo structure** (workspaces, nx.json) and document package boundaries
- **Trace cross-language contracts** (protobuf, GraphQL, OpenAPI) when multiple languages present
- **Supplement missing child modules** from CodeWiki's module_tree.json

NEVER:
- **Append a "validation report" section** — Oracle is an editor, not an auditor
- **Leave CodeWiki errors untouched** — if you found it's wrong, fix it
- **Duplicate information** — don't repeat content in both the doc body and a footer table
- Create separate Oracle docs alongside CodeWiki docs
- Skip validation step
- Reference `.codewiki-cache/` - does not exist
- Write high-confidence claims without evidence
- Leave generic summaries that do not help decisions
- Hide uncertainty when evidence is incomplete

## Quality Gates (CI-Friendly)

Use these checks to keep docs meaningful over time:

1. **Evidence density**: docs should have `path:line` references throughout the body, not just in a footer.
2. **Placeholder check**: fail if `REPLACE` remains.
3. **Unknown discipline**: fail if uncertainty is implied but no `Unknowns` section exists.
4. **Drift check**: if module files changed, corresponding module docs must be updated.
5. **No validation report anti-pattern**: fail if doc has a large `## Oracle Validation` section with claim tables — content should be integrated inline.
6. **Writing quality**: no "simply"/"just"/"easily"/"obviously" in docs. No weasel words ("some", "many", "various") without specifics. All code blocks specify language. Headings in sentence case.
7. **Sensitive data**: no webhook URLs, API keys, bot tokens, personal names from git config, internal server names, or file paths containing usernames (`/Users/username/...`, `/home/username/...`). Replace with placeholders like `<YOUR_WEBHOOK_URL>`, `<BOT_TOKEN>`, `your-username`.

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

# 4) Should NOT have the old "Oracle Validation" report pattern
! rg -n "## Oracle Validation" docs/*.md

# 5) No filler/weasel words
! rg -wn "simply|obviously|easily" docs/*.md
# Should not find unqualified weasel words
rg -wn "some\b|many\b|various\b|several\b" docs/*.md

# 6) No sensitive data leakage
! rg -in "webhook.*https?://|bot.*token|api[_-]?key" docs/*.md
! rg -n "/Users/[a-zA-Z]|/home/[a-zA-Z]" docs/*.md
```

## Output Structure After Enhancement

```
docs/
├── CODEBASE_MAP.md              # Oracle index with priorities and unknowns
├── {module1}.md                 # Corrected + enhanced (one coherent doc)
│   ├── Content with errors fixed inline
│   ├── Evidence (path:line) throughout
│   ├── New sections added where they belong
│   └── <!-- ORACLE-META --> compact footer
├── {module2}.md                 # Corrected + enhanced
├── module_tree.json             # Unchanged
└── temp/                        # Unchanged
```

## Troubleshooting

**No CodeWiki docs:** Oracle MUST run `codewiki generate --use-agent-sdk --verbose --no-cache` itself in Phase 0. Do not skip to manual analysis.

**`codewiki` not found:** User needs to install: `pip install codewiki`

**Validation failures:** Code likely changed since CodeWiki run. Re-run: `codewiki generate --use-agent-sdk --verbose --no-cache`

**Many discrepancies:** Re-run CodeWiki with `--no-cache` to get fresh LLM analysis, then Oracle corrects remaining issues.
