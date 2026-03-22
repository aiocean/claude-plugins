---
name: aio-code-review
description: Multi-phase code review pipeline with domain-specific analysis via GitNexus and parallel specialized agents. Triggers: "review code", "code review", "review PR", "ultra review". Use after aio-deep-plan or before merging.
context: fork
agent: oh-my-claudecode:critic
---

# Code Review Ultra

Ultimate code review: deep codebase understanding via GitNexus + CodeWiki, domain detection, parallel specialized agents, and adversarial meta-review.

## Environment
- GitNexus: !`npx gitnexus status 2>/dev/null && echo "AVAILABLE" || echo "NOT INSTALLED"`
- CodeWiki: !`which codewiki 2>/dev/null || echo "NOT INSTALLED"`

## When to Use

- User requests "review code", "code review", "review this PR"
- Before merging a pull request
- After implementing a major feature
- User wants quality assessment grounded in codebase structure

## Workflow

### Phase 0: Detect Tools and Language/Domain

#### 0.1 Tool Availability

Tools are pre-detected in the Environment section above. Adapt the review based on availability:

| Tool | Status | Impact on Review |
|------|--------|-----------------|
| GitNexus | Available | Hybrid search, symbol context, dependency tracking, blast radius via `impact` |
| GitNexus | Missing | Fall back to CodeWiki dependency graphs + manual grep for impact |
| CodeWiki | Available | Module clustering, metrics, dependency graphs |
| CodeWiki | Missing | Skip module mapping — use GitNexus context or file-path grouping |

Proceed with whatever tools are available. Both together give the richest review; either subset still works.

#### 0.2 Detect Language/Domain and Invoke Specialist Skills

Scan the project and changed files to invoke domain-specific static analysis **before** the general review agents run. Each skill brings specialized linters and pattern checks that general agents cannot replicate.

```
# Language detection — invoke matching skills
if go.mod or *.go exists:
  → invoke /golang-mastery (go vet, golangci-lint, govulncheck, nilaway, deadcode, race detection)

if *.xcodeproj or Package.swift exists:
  → invoke /ios-mastery (SwiftUI patterns, iOS conventions, Liquid Glass compliance)

# Framework detection — scan changed files for imports
if changed files import "react" or "next":
  → invoke /react-minimal-effects (useEffect anti-patterns, React 19 hooks, React Compiler readiness)

if changed files import "xstate":
  → invoke /xstate (v5 strict patterns, setup().createMachine(), actor patterns)

# Domain detection — based on file paths
if changed files touch infra/, deploy/, monitoring/, or include logging/metrics/tracing code:
  → invoke /monitoring-observability (Golden Signals, OpenTelemetry, SLO compliance)
```

**Why:** Domain skills have specialized static analysis tools and pattern knowledge that catch language/framework-specific issues before general review agents run.

### Phase 1: Determine Review Scope

Identify what to review:

```bash
# For PR/branch review
git diff main...HEAD --name-only

# For staged changes
git diff --cached --name-only

# For recent changes
git diff HEAD~1 --name-only
```

Store the list of changed files — all subsequent phases operate on these files.

### Phase 2: Two-Layer Analytics

Run analytics tools in order of depth. Each layer enriches the context that review agents receive.

#### Layer 1: GitNexus — Knowledge Graph (run first)

GitNexus provides deep structural understanding via hybrid search (BM25 + semantic), symbol context, and blast radius analysis.

**For each changed file, run in parallel using GitNexus MCP tools:**

```
# Symbol context — understand what's in each changed file and its relationships
context(symbol=<primary symbol in file>, depth=2)

# Blast radius — what breaks if this file changes?
impact(file=<changed file>)

# Detect changes — map git-diff to affected symbols
detect_changes(diff=<git diff output>)
```

**For files with 3+ dependents (hub files), additionally run:**

```
# Deeper impact — how far do changes ripple?
impact(file=<hub file>, max_depth=3)
```

**Semantic pattern search — identify cross-cutting concerns:**

```
# Analyze changed code to identify key concepts, then search for related patterns
# Example queries based on what the changed code does:

# If changes touch error handling:
query("error handling strategy", top_k=5)

# If changes touch API endpoints:
query("request validation pattern", top_k=5)

# If changes touch data access:
query("database query pattern", top_k=5)

# If changes touch authentication/authorization:
query("authentication authorization flow", top_k=5)

# Always: search for similar patterns to detect inconsistency
query("<primary concept from changed code>", top_k=5)
```

**How to generate queries:** Read the changed files, identify the 2-3 primary concerns (e.g., "retry logic", "input validation", "state management"), and search for each. The goal is to find existing patterns in the codebase that the changes should be consistent with.

**Collect into structured data:**

```
gitnexus_analytics = {
  symbols: { file → [function signatures from context()] },
  dependencies: { file → [imports from context()] },
  dependents: { file → [importers from context()] },
  hub_files: [files with 3+ dependents],
  impact: { hub_file → { affected_files, affected_tests, depth } },
  patterns_found: [
    { query: "error handling", matches: [file:chunk pairs], consistency: "consistent|divergent" },
    ...
  ],
  consistency_issues: [cases where changed code diverges from existing patterns]
}
```

**If GitNexus is unavailable**, skip this layer and note in report: "GitNexus unavailable — blast radius analysis is approximate, pattern consistency analysis skipped."

#### Layer 2: CodeWiki — Static Analysis (run second)

CodeWiki provides module structure, metrics, and dependency graphs for organizational context.

```bash
codewiki generate --no-cache --analysis-only --output docs/
```

**What this produces in `docs/`:**

| File | Content | How agents use it |
|------|---------|-------------------|
| `module_tree.json` | Module hierarchy and clustering | Understand code organization, map changed files to modules |
| `first_module_tree.json` | Initial module clustering | See how code is grouped before refinement |
| `temp/dependency_graphs/*.json` | Import/dependency graphs per module | Supplement GitNexus with module-level dependency view |

**If CodeWiki is unavailable**, group files by directory path as a fallback module mapping.

**If docs/ already has fresh analytics** (modified within last hour), reuse them.

#### Map changed files to modules

Using the best available source:
1. `module_tree.json` from CodeWiki (preferred)
2. GitNexus `context` grouping (fallback)
3. Directory-path grouping (last resort)

### Phase 3: Parallel Review Agents

Spawn specialized review agents in parallel. Each agent receives the enriched analytics context from all available tools.

#### Agent Lineup

**Core agents (always run):**

Agents from installed plugins (OMC + Superpowers). Spawned in parallel.

| Agent | Source | Model | Focus | Uses analytics for |
|-------|--------|-------|-------|-------------------|
| `oh-my-claudecode:security-reviewer` | OMC | opus | OWASP Top 10, secrets scanning, dependency audit, exploitability scoring | GitNexus impact paths to trace untrusted input; GitNexus auth patterns for consistency |
| `oh-my-claudecode:verifier` | OMC | sonnet | Evidence-based completion validation — runs tests, type-check, build | Fresh command output, not cached results |
| `oh-my-claudecode:code-reviewer` | OMC | sonnet | Logic defects, complexity, anti-patterns, performance, SOLID | GitNexus dependents for coupling; GitNexus patterns for consistency; CodeWiki metrics |
| `superpowers:code-reviewer` | Superpowers | sonnet | Comprehensive review, verification before completion | Module boundaries and dependency graphs for contract violations |

**Conditional agents (spawn based on scope and content):**

| Agent | Model | When to spawn | Focus |
|-------|-------|---------------|-------|
| `oh-my-claudecode:architect` | opus | Changes touch 3+ modules or cross module boundaries | Architectural impact, system boundaries, coupling assessment |
| `oh-my-claudecode:test-engineer` | sonnet | Changes touch core logic or public APIs | Test coverage gaps, missing edge cases, test quality |
| `oh-my-claudecode:designer` | sonnet | Changes touch UI components, CSS, or templates | Accessibility (WCAG), interaction patterns, responsive design, UX consistency |
| `oh-my-claudecode:writer` | haiku | Changes touch README, docs/, JSDoc, or API descriptions | Documentation accuracy, clarity, completeness, broken links |

**Meta-review agent (runs after all others complete):**

| Agent | Model | When to spawn | Focus |
|-------|-------|---------------|-------|
| `oh-my-claudecode:critic` | opus | Always, after Phase 3 agents finish | Pre-commitment prediction, multi-perspective analysis, false positive elimination, escalation protocol, confidence scoring |

#### Agent Prompt Template

Each agent gets this context block prepended to their review task:

```
CODEBASE ANALYTICS CONTEXT
============================

You have access to multi-layer analytics data for this review.

1. GITNEXUS KNOWLEDGE GRAPH (if available):
   Symbols in changed files (from context()):
   {gitnexus_symbols_summary}

   Dependencies (what changed files import):
   {gitnexus_dependencies_summary}

   Dependents (what imports changed files — blast radius):
   {gitnexus_dependents_summary}

   Hub files (3+ dependents) with transitive impact (from impact()):
   {gitnexus_impact_summary}

   USE THIS DATA TO:
   - Assess blast radius: how many files are affected by each change
   - Trace data flow: follow dependency chains to find impact paths
   - Identify hub files: changes to these are highest risk
   - Check function signatures: do changes break callers?

2. GITNEXUS PATTERN ANALYSIS (if available):
   Existing patterns in codebase related to changes (from query()):
   {gitnexus_patterns_summary}

   Consistency issues detected:
   {gitnexus_consistency_issues}

   USE THIS DATA TO:
   - Check if changes follow existing codebase patterns
   - Flag divergent implementations (e.g., different error handling strategy)
   - Identify missing patterns (e.g., no retry logic where similar code has it)

3. CODEWIKI MODULE STRUCTURE (if available):
   Module mapping for changed files:
   {changed_files_by_module}

   Dependency graphs available in docs/temp/dependency_graphs/

   USE THIS DATA TO:
   - Understand where changed files sit in the architecture
   - Check if changes cross module boundaries (higher risk)
   - Assess coupling and cohesion at the module level

4. CHANGED FILES:
   {changed_files_list}

HOW TO USE THIS DATA:
- Start with GitNexus impact() to understand blast radius BEFORE reviewing code
- Check GitNexus query() patterns to assess consistency with existing code
- Reference module structure when flagging architectural concerns
- Include blast radius assessment (low/medium/high) with each finding
- Ground every finding in analytics data — don't just flag issues,
  show their structural impact
```

#### Spawning Pattern

```
# Spawn core agents in parallel (always — from installed plugins)

Task(subagent_type="oh-my-claudecode:security-reviewer", model="opus",
  prompt="<analytics context>\n\nSecurity review these files. OWASP Top 10, secrets scan, dependency audit: {files}")

Task(subagent_type="oh-my-claudecode:verifier", model="sonnet",
  prompt="<analytics context>\n\nVerify all changes with fresh test/type-check/build output: {files}")

Task(subagent_type="oh-my-claudecode:code-reviewer", model="sonnet",
  prompt="<analytics context>\n\nReview these files for quality, logic, and performance: {files}")

@superpowers:code-reviewer — Comprehensive review with verification, API contracts, backward compatibility:
  <analytics context>
  Files: {files}

# Conditional agents (spawn only when criteria met)
if crosses_module_boundaries or affected_modules >= 3:
  Task(subagent_type="oh-my-claudecode:architect", model="opus",
    prompt="<analytics context>\n\nAssess architectural impact of these changes. Focus on module boundary violations, coupling changes, and system design implications: {files}")

if touches_core_logic or touches_public_api:
  Task(subagent_type="oh-my-claudecode:test-engineer", model="sonnet",
    prompt="<analytics context>\n\nAnalyze test coverage for these changes. Identify missing test cases, edge cases, and suggest test improvements: {files}")

if touches_ui_components or touches_css or touches_templates:
  Task(subagent_type="oh-my-claudecode:designer", model="sonnet",
    prompt="<analytics context>\n\nReview UI changes for accessibility (WCAG 2.1 AA), interaction patterns, responsive design, and UX consistency: {files}")

if touches_docs or touches_readme or touches_jsdoc:
  Task(subagent_type="oh-my-claudecode:writer", model="haiku",
    prompt="Review documentation changes for accuracy, clarity, completeness, and broken links: {files}")
```

### Phase 3.5: Meta-Review (Critic)

After all Phase 3 agents complete, spawn `oh-my-claudecode:critic` that receives ALL findings from every agent. The critic's job is to:

1. **Pre-commitment prediction** — predict verdict before reading findings (reduces bias)
2. **Multi-perspective analysis** — security engineer, new-hire, ops engineer lenses
3. **Eliminate false positives** — flag findings that are incorrect or don't apply
4. **Identify blind spots** — what did all agents miss?
3. **Challenge severity ratings** — are CRITICALs really critical? Are LOWs actually HIGH?
4. **Cross-reference findings** — do multiple agents flag the same root cause differently?
5. **Final confidence score** — rate overall review quality (0-100%)

```
# Wait for all Phase 3 agents to complete, collect their findings
all_findings = collect_all_agent_findings()

Task(subagent_type="oh-my-claudecode:critic", model="opus",
  prompt="You are the adversarial meta-reviewer. All review agents have completed.\n\nFindings:\n{all_findings}\n\nYour job:\n1. Pre-commitment prediction (predict verdict before reading)\n2. Multi-perspective analysis (security engineer, new-hire, ops engineer)\n3. Verify every CRITICAL/HIGH against actual code\n4. Hunt for blind spots (what is ABSENT)\n5. Escalation protocol (adversarial mode if critical found)\n6. Severity calibration self-audit\n7. Strongest counterargument for opposite verdict\n8. Final verdict: REJECT/REVISE/ACCEPT-WITH-RESERVATIONS/ACCEPT\n9. Confidence score with breakdown")
```

### Phase 4: Synthesize Report

Collect all agent findings and produce a unified report:

```
CODE REVIEW REPORT (Analytics-Backed)
======================================

Scope: {N} files across {M} modules
Tools: {GitNexus ✓/✗} | {CodeWiki ✓/✗}

ARCHITECTURE IMPACT
-------------------
Modules affected: [list from module mapping]
Cross-module changes: [yes/no — higher risk if yes]
Blast radius: [low/medium/high — from GitNexus impact() or CodeWiki fan-out]
Hub files touched: [list with dependent counts from GitNexus]

PATTERN CONSISTENCY (from GitNexus query())
--------------------------------------------
Patterns analyzed: [list of queries run]
Consistent with codebase: [list]
Divergent from codebase: [list — these need justification or alignment]

FINDINGS BY SEVERITY
--------------------

CRITICAL (must fix before merge)
  1. {file}:{line} — {issue}
     Blast radius: {high/medium/low} — {N} downstream dependents (GitNexus)
     Pattern context: {consistent/divergent with existing code} (GitNexus)
     Fix: {recommendation}

HIGH (should fix before merge)
  ...

MEDIUM (fix when possible)
  ...

LOW (suggestions)
  ...

DEPENDENCY CONCERNS
-------------------
- Circular dependencies detected: [list]
- High fan-out files (hub files): [list with GitNexus impact data]
- Cross-boundary violations: [list]

ARCHITECTURE REVIEW (if architect agent ran)
--------------------------------------------
- Module boundary violations: [list]
- Coupling changes: [increased/decreased/unchanged]
- Design recommendations: [list]

TEST COVERAGE (if test-engineer agent ran)
------------------------------------------
- Missing test cases: [list]
- Edge cases not covered: [list]
- Test quality issues: [list]

UI/UX REVIEW (if designer agent ran)
-------------------------------------
- Accessibility issues (WCAG): [list]
- Interaction pattern concerns: [list]
- Responsive design issues: [list]

DOCUMENTATION REVIEW (if writer agent ran)
------------------------------------------
- Inaccurate docs: [list]
- Missing documentation: [list]
- Broken links: [list]

META-REVIEW (critic)
--------------------
- False positives identified: [list with reasoning]
- Blind spots found: [list]
- Severity adjustments: [list of upgrades/downgrades]
- Duplicate findings consolidated: [list]
- Review confidence: {score}%

RECOMMENDATION: {APPROVE | REQUEST CHANGES | COMMENT}
```

## Severity Rating

- **CRITICAL** — Security vulnerability, data loss risk (must fix before merge)
- **HIGH** — Bug, major code smell, architectural violation (should fix before merge)
- **MEDIUM** — Minor issue, suboptimal pattern (fix when possible)
- **LOW** — Style, naming, suggestion (consider fixing)

## Approval Criteria

| Verdict | Condition |
|---------|-----------|
| **APPROVE** | No CRITICAL or HIGH issues |
| **REQUEST CHANGES** | Any CRITICAL or HIGH issues present |
| **COMMENT** | Only MEDIUM/LOW issues, no blocking concerns |

## Rules

ALWAYS:
- Run Phase 0.1 tool detection — report which tools are available
- Run Phase 0.2 domain detection — invoke matching specialist skills (golang-mastery, ios-mastery, react-minimal-effects, xstate, monitoring-observability)
- Run GitNexus analytics first (context, impact, query) when available
- Run CodeWiki static analysis second (module structure) when available
- Include all available analytics in every agent prompt
- Show blast radius for CRITICAL and HIGH findings (prefer GitNexus `impact` data)
- Show pattern consistency for findings where GitNexus query found related patterns
- Spawn core review agents in parallel for speed
- Spawn conditional agents when their criteria are met
- Run the critic meta-review after all other agents complete
- Produce a single unified report with all sections
- Include review confidence score from critic
- Gracefully degrade when tools are missing — proceed with available tools

NEVER:
- Skip tool detection in Phase 0.1
- Skip Phase 0.2 domain detection
- Skip GitNexus analytics when GitNexus is available
- Review without knowing which modules are affected (use best available source)
- Report findings without blast radius context (use GitNexus, CodeWiki, or manual grep)
- Run agents sequentially when they can run in parallel
- Let one agent's failure block the entire review
- Present findings without critic validation
- Skip conditional agents when their trigger criteria are clearly met
- Require both tools — the review works with any subset

## Skill Graph — What to invoke next

| After review result | Next skill |
|--------------------|-----------|
| APPROVE — ready to merge | `/superpowers:finishing-a-development-branch` — finalize branch |
| REQUEST CHANGES — needs fixes | Fix issues → re-run `/aio-code-review` |
| Want to extract learnings | `/aio-reflect` — capture session knowledge |
| Before review, need verification | `/superpowers:verification-before-completion` — evidence-based check |
