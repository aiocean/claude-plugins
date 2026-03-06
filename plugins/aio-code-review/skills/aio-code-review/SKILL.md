---
name: aio-code-review
description: |
  Ultimate code review with multi-phase pipeline. Triggers when user says "review code", "code review", "review this", "review changes", "review PR", "ultra review", or mentions "comprehensive review". Runs domain-specific skills (Go, iOS, React, XState, observability), CodeWiki static analytics, 4 core + 4 conditional parallel review agents, and a critic meta-review with confidence scoring.
---

# Code Review Ultra

Ultimate code review: domain detection, static analytics, parallel specialized agents, and adversarial meta-review.

## When to Use

- User requests "review code", "code review", "review this PR"
- Before merging a pull request
- After implementing a major feature
- User wants quality assessment grounded in codebase structure

## Workflow

### Phase 0: Detect Language/Domain and Invoke Specialist Skills

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

**Why:** Domain skills have specialized static analysis tools and pattern knowledge that catch language/framework-specific issues before general review agents run. This grounds the review in domain-specific best practices.

### Phase 1: Generate Static Analytics

Run CodeWiki in analysis-only mode to produce dependency graphs, metrics, and module structure without LLM calls. This is fast and gives agents concrete data to work with.

```bash
codewiki generate --no-cache --analysis-only --output docs/
```

**What this produces in `docs/`:**

| File | Content | How agents use it |
|------|---------|-------------------|
| `module_tree.json` | Module hierarchy and clustering | Understand code organization, identify which modules changed files belong to |
| `first_module_tree.json` | Initial module clustering | See how code is grouped before refinement |
| `temp/dependency_graphs/*.json` | Import/dependency graphs per module | Identify blast radius of changes, find circular dependencies, trace impact paths |

**If codewiki is not installed**, skip Phase 1 and proceed to Phase 2 without analytics context. The review still works, just without structural grounding.

**If docs/ already has fresh analytics** (modified within last hour), reuse them — no need to regenerate.

### Phase 2: Determine Review Scope

Identify what to review:

```bash
# For PR/branch review
git diff main...HEAD --name-only

# For staged changes
git diff --cached --name-only

# For recent changes
git diff HEAD~1 --name-only
```

Map changed files to modules using `module_tree.json`:
1. Read `docs/module_tree.json`
2. For each changed file, find its parent module
3. Group changes by module — this tells agents which dependency graphs to consult

### Phase 3: Parallel Review Agents

Spawn specialized review agents in parallel. Each agent receives:
- The changed files relevant to their domain
- The module mapping from `module_tree.json`
- The dependency graphs from `docs/temp/dependency_graphs/` for affected modules

#### Agent Lineup

**Core agents (always run):**

OMC internal agents are spawned via `Task(subagent_type=...)`. External agents are invoked via `@agent-name`.

| Agent | Type | Model | Focus | Uses analytics for |
|-------|------|-------|-------|-------------------|
| `oh-my-claudecode:security-reviewer` | OMC | sonnet | OWASP Top 10, secrets, auth, injection | Dependency graphs to trace untrusted input paths |
| `oh-my-claudecode:quality-reviewer` | OMC | sonnet | Logic defects, complexity, anti-patterns, performance, SOLID | Module structure to assess coupling and cohesion |
| `@feature-dev:code-reviewer` | External | sonnet | Feature-level review: requirement completeness, implementation correctness, edge case coverage | Changed files mapped to feature scope |
| `@superpowers:code-reviewer` | External | sonnet | Superpowers-based comprehensive review, verification before completion | Module boundaries and dependency graphs for contract violations |
| `@code-simplifier:code-simplifier` | External | opus | Clarity, consistency, maintainability, simplification | Module structure to identify over-engineered areas |

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
| `oh-my-claudecode:critic` | opus | Always, after Phase 3 agents finish | Challenge findings, eliminate false positives, identify blind spots, ensure no groupthink |

#### Agent Prompt Template

Each agent gets this context block prepended to their review task:

```
STATIC ANALYTICS CONTEXT
=========================

You have access to CodeWiki static analysis data in docs/:

1. MODULE STRUCTURE (docs/module_tree.json):
   - Shows how the codebase is organized into modules
   - Use this to understand where changed files sit in the architecture
   - Check if changes cross module boundaries (higher risk)

2. DEPENDENCY GRAPHS (docs/temp/dependency_graphs/):
   - JSON files showing import relationships per module
   - Use this to assess blast radius: what depends on changed code?
   - Look for circular dependencies involving changed files
   - Trace data flow paths through the dependency chain

3. CHANGED FILES MAPPED TO MODULES:
   {changed_files_by_module}

HOW TO USE THIS DATA:
- Read the dependency graph for each affected module BEFORE reviewing its files
- When you find an issue, check the dependency graph to assess its blast radius
- Reference module boundaries when flagging coupling concerns
- Use dependency chains to identify downstream impact of bugs
- Include blast radius assessment (low/medium/high) with each finding

Your review should be GROUNDED in this data. Don't just flag issues —
show their structural impact using the dependency and module information.
```

#### Spawning Pattern

```
# Spawn core agents in parallel (always)

# OMC internal agents via Task()
Task(subagent_type="oh-my-claudecode:security-reviewer", model="sonnet",
  prompt="<analytics context>\n\nReview these files for security: {files}")

Task(subagent_type="oh-my-claudecode:quality-reviewer", model="sonnet",
  prompt="<analytics context>\n\nReview these files for quality and performance: {files}")

# External agents via @ invocation — trigger alongside OMC agents
@feature-dev:code-reviewer — Review these files for feature completeness and implementation correctness:
  <analytics context>
  Files: {files}

@superpowers:code-reviewer — Comprehensive review with verification, API contracts, backward compatibility:
  <analytics context>
  Files: {files}

@code-simplifier:code-simplifier — Review these files for clarity, consistency, and simplification opportunities:
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

After all Phase 3 agents complete, spawn a critic agent that receives ALL findings from every agent. The critic's job is to:

1. **Eliminate false positives** — flag findings that are incorrect or don't apply
2. **Identify blind spots** — what did all agents miss?
3. **Challenge severity ratings** — are CRITICALs really critical? Are LOWs actually HIGH?
4. **Cross-reference findings** — do multiple agents flag the same root cause differently?
5. **Final confidence score** — rate overall review quality (0-100%)

```
# Wait for all Phase 3 agents to complete, collect their findings
all_findings = collect_all_agent_findings()

Task(subagent_type="oh-my-claudecode:critic", model="opus",
  prompt="You are the meta-reviewer. All review agents have completed. Here are their combined findings:\n\n{all_findings}\n\nYour job:\n1. Identify false positives and mark them\n2. Flag blind spots — what did reviewers miss?\n3. Challenge severity ratings — upgrade or downgrade as needed\n4. Cross-reference duplicate findings from different agents\n5. Provide a confidence score (0-100%) for this review\n\nBe adversarial. Assume reviewers made mistakes.")
```

### Phase 4: Synthesize Report

Collect all agent findings and produce a unified report:

```
CODE REVIEW REPORT (Analytics-Backed)
======================================

Scope: {N} files across {M} modules
Analytics: CodeWiki static analysis (dependency graphs, module map)

ARCHITECTURE IMPACT
-------------------
Modules affected: [list from module_tree.json]
Cross-module changes: [yes/no — higher risk if yes]
Blast radius: [low/medium/high based on dependency graph fan-out]

FINDINGS BY SEVERITY
--------------------

CRITICAL (must fix before merge)
  1. {file}:{line} — {issue}
     Blast radius: {high/medium/low} — {N} downstream dependents
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
- High fan-out modules affected: [list]
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
- Run Phase 0 domain detection — invoke matching specialist skills (golang-mastery, ios-mastery, react-minimal-effects, xstate, monitoring-observability)
- Run `codewiki generate --no-cache --analysis-only` before spawning review agents
- Map changed files to modules using `module_tree.json`
- Include dependency graph context in every agent prompt
- Show blast radius for CRITICAL and HIGH findings
- Spawn core review agents in parallel for speed
- Spawn conditional agents when their criteria are met
- Run the critic meta-review after all other agents complete
- Produce a single unified report with all sections
- Include review confidence score from critic

NEVER:
- Skip the static analysis phase (unless codewiki unavailable)
- Skip Phase 0 domain detection
- Review without knowing which modules are affected
- Report findings without blast radius context
- Run agents sequentially when they can run in parallel
- Let one agent's failure block the entire review
- Present findings without critic validation
- Skip conditional agents when their trigger criteria are clearly met
