---
name: code-review
description: |
  Comprehensive code review using static analytics and multiple specialized agents in parallel. Triggers when user says "review code", "code review", "review this", "review changes", "review PR", or mentions "comprehensive review". Runs CodeWiki static analysis first to generate dependency graphs, metrics, and module maps, then feeds this data to parallel review agents for evidence-backed findings.
---

# Code Review with Static Analytics

Evidence-backed code review: static analysis first, then parallel specialized agents grounded in real codebase data.

## When to Use

- User requests "review code", "code review", "review this PR"
- Before merging a pull request
- After implementing a major feature
- User wants quality assessment grounded in codebase structure

## Workflow

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

| Agent | Model | Focus | Uses analytics for |
|-------|-------|-------|-------------------|
| `security-reviewer` | sonnet | OWASP Top 10, secrets, auth, injection | Dependency graphs to trace untrusted input paths |
| `quality-reviewer` | sonnet | Logic defects, complexity, anti-patterns, SOLID | Module structure to assess coupling and cohesion |
| `performance-reviewer` | sonnet | Hotspots, N+1, memory, latency | Dependency graphs to find hot paths and bottlenecks |
| `api-reviewer` | sonnet | API contracts, versioning, breaking changes | Module boundaries to check contract violations |

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
# Spawn all 4 agents in parallel
Task(subagent_type="oh-my-claudecode:security-reviewer", model="sonnet",
  prompt="<analytics context>\n\nReview these files for security: {files}")

Task(subagent_type="oh-my-claudecode:quality-reviewer", model="sonnet",
  prompt="<analytics context>\n\nReview these files for quality: {files}")

Task(subagent_type="oh-my-claudecode:performance-reviewer", model="sonnet",
  prompt="<analytics context>\n\nReview these files for performance: {files}")

Task(subagent_type="oh-my-claudecode:api-reviewer", model="sonnet",
  prompt="<analytics context>\n\nReview these files for API contracts: {files}")
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
- Run `codewiki generate --no-cache --analysis-only` before spawning review agents
- Map changed files to modules using `module_tree.json`
- Include dependency graph context in every agent prompt
- Show blast radius for CRITICAL and HIGH findings
- Spawn review agents in parallel for speed
- Produce a single unified report with architecture impact section

NEVER:
- Skip the static analysis phase (unless codewiki unavailable)
- Review without knowing which modules are affected
- Report findings without blast radius context
- Run agents sequentially when they can run in parallel
- Let one agent's failure block the entire review
