::install-command
/plugin install aio-codeflow@aiocean-plugins
::

# aio-codeflow

**A complete code-development workflow for Claude Code — from first exploration to merged PR.**

Most AI coding tools are reactive: you describe a problem, they attempt a fix, you iterate in the dark. aio-codeflow is structured differently. It treats software development as a sequence of distinct phases — discover, map, plan, snapshot, implement, review, debug, document — where each phase produces a precise output that feeds the next. The result is a workflow where Claude understands your codebase before touching it, plans before coding, and validates before claiming done.

## Why this plugin?

Four problems motivated this plugin.

**Understanding precedes correctness.** Changes made without knowing the codebase tend to break callers, duplicate existing logic, or fight the framework. Every skill in this plugin that touches code first runs semantic search and symbol analysis via GitNexus. Discovery is not optional — it is built into the workflow.

**Planning and implementation are different cognitive modes.** aio-plan produces a written, scope-bounded plan before a single file is edited. That plan names the exact files, the exact functions, and the explicit non-goals. This separation prevents the most common failure mode: gradual scope creep where each small drift compounds until the final change doesn't match the original intent.

**Review should be adversarial, not ceremonial.** aio-review-deep dispatches a fleet of specialized agents in parallel — security reviewer, verifier, quality analyst, architect — each seeing the same GitNexus blast-radius data, then a critic meta-reviewer challenges every finding for false positives and missed blind spots. This is structurally different from asking Claude to "review this file."

**Root cause before patch.** aio-debug enforces a circuit-breaker: three failed fix attempts without a new strategy triggers an explicit pause, a re-read of all evidence, and an architectural question before any fourth attempt. Debugging by guessing is not allowed.

## Installation

```bash
# Add the marketplace (one-time)
/plugin marketplace add aiocean/claude-plugins

# Install the plugin
/plugin install aio-codeflow@aiocean-plugins
```

## Workflow

The 10 skills form two primary pipelines that share infrastructure (GitNexus for semantic search, LSP for type-precise analysis):

```
FEATURE DEVELOPMENT PIPELINE
─────────────────────────────
aio-gitnexus  ──► aio-discover ──► aio-map ──► aio-plan ──► aio-snapshot
(index once)      (find code)   (structure)   (write plan)  (baseline)
                                                                  │
                                                            [ implement ]
                                                                  │
                                             aio-review-quick ◄──┘
                                                  │
                                          aio-review-deep  ──► merge


BUG / STUCK PIPELINE
──────────────────────
aio-rubber-duck ──► aio-debug ──► aio-review-deep ──► merge
(articulate)       (4-phase fix)    (validate)


DOCUMENTATION PIPELINE
───────────────────────
aio-gitnexus ──► aio-doc-writer
(index)          (write all docs from knowledge graph)
```

## Skills

### aio-gitnexus

> "setup gitnexus", "index codebase", "gitnexus status", "rebuild index"

The foundation skill. GitNexus turns your codebase into a knowledge graph — nodes (functions, classes, interfaces), edges (imports, calls, inheritance), functional clusters, and execution flows — via a six-phase pipeline using tree-sitter parsing, Leiden clustering, and hybrid BM25 + semantic search. Run this once per project before any other skill; it is what gives aio-discover, aio-map, aio-plan, and aio-review-* their structural intelligence.

Covers install, MCP server setup (`claude mcp add gitnexus`), full re-index, status check, and local git hooks for automatic index refresh on merge to master.

### aio-discover

> "discover", "find code", "how does X work", "where is", "what handles", "explore code"

Step 1 of the discover -> map -> plan trio. Runs 3-5 parallel semantic searches against the GitNexus knowledge graph to locate all relevant files before any implementation begins. Returns a scored discovery map: highly relevant files (similarity >0.65), related context (0.55-0.65), and a key insight summarizing what the codebase reveals about the area. Always ends with a prompt to continue to aio-map.

### aio-map

> "map dependencies", "blast radius", "who calls this", "trace references", "call graph"

Step 2. Takes the files from aio-discover and builds a full structural picture: symbol inventory, import graph, dependent files, and blast radius. Uses GitNexus `context` and `impact` for fast file-level analysis, then LSP `lsp_find_references` and `lsp_hover` for function-level precision. LSP is authoritative when the two sources disagree. Output is a dependency graph and explicit blast radius — which files break if you change this function.

### aio-plan

> "plan implementation", "how should I implement", "approach", "plan feature", "task breakdown"

Step 3. Synthesizes discovery and mapping into a scope-bounded implementation plan. Before writing anything, it checks GitNexus for existing implementations (to prevent duplication) and existing conventions (to match patterns). The plan names exact files, exact functions, explicit risks, and an explicit NOT Doing section. After approval, it hands off to subagent-driven execution for multi-file changes or inline execution for simpler ones. Includes a re-anchoring protocol: before each task, re-read the plan and verify scope has not drifted.

### aio-snapshot

> "create snapshot", "baseline", "before I start coding", "save state"

A lightweight prerequisite for aio-review-quick. Runs `npx gitnexus analyze` to record the current codebase state as a baseline. After implementation, aio-review-quick uses `detect_changes()` against this baseline to enumerate exactly what was added and modified — which functions, which files — rather than relying on git diff alone.

### aio-review-quick

> "check my changes", "before I commit", "validate changes", "post-implementation review", "pre-commit check"

A fast post-implementation sanity check, calibrated for single-developer review before committing. Runs GitNexus change detection against the snapshot baseline, duplication search for any new code blocks (flagging similarity >0.75), convention check, and LSP type diagnostics. Output is a structured checklist: logic in correct layer, no duplicated business logic, proper fix not a workaround, easy to change tomorrow. For deeper review before merging, escalate to aio-review-deep.

### aio-review-deep

> "deep review", "before merge", "multi-agent review", "security + architecture review", "fleet review"

A full pre-merge gate. Dispatches parallel specialized agents — security reviewer (OWASP Top 10, secrets scan), verifier (fresh test and type-check output), quality analyst (logic, coupling, SOLID), architect (when changes cross 3+ modules). Each agent receives the full GitNexus context: symbol inventory, dependency graph, blast radius, and pattern consistency analysis for the changed files. A critic meta-reviewer runs last: it receives all findings, eliminates false positives, calibrates severity, and produces a final APPROVE / REQUEST CHANGES / COMMENT verdict with a confidence score. Domain-specific skills (golang-mastery, react-minimal-effects, xstate) are auto-invoked when their languages or frameworks are detected.

### aio-debug

> "debug", "fix bug", "investigate error", "not working", "failing test", "root cause"

A four-phase debugging orchestrator: Understand Context (aio-discover + deep-dive) -> Investigate Root Cause (systematic-debugging + trace) -> Implement Fix (TDD: red-green-refactor) -> Verify and Review (verification-before-completion + aio-review-deep). The iron law: no code changes before root cause is confirmed with evidence. The circuit breaker: after three failed fix attempts, execution stops, all attempts are summarized, the architecture is questioned, and the user chooses a fundamentally different approach before any fourth attempt. A table in the skill maps bug complexity to which phases to use at full depth.

### aio-rubber-duck

> "rubber duck", "be my rubber duck", "let me explain", "I'm stuck", "help me think", "talk me through"

Role inversion: Claude becomes the duck, not the solver. The user narrates their problem step by step; Claude asks one probe at a time to surface the assumption that is hiding the bug. It does not read files, run tools, or propose hypotheses unless the walk-through and five probes produce no insight — at which point it breaks character explicitly and offers a handoff to aio-debug. Useful when you already have more context than any tool but need to externalize your reasoning. When rubber duck succeeds, handoffs are precise: clear small fix -> write it; large or risky fix -> aio-debug; architectural doubt -> aio-plan; needs validation -> aio-review-quick.

### aio-doc-writer

> "analyze codebase", "document architecture", "generate docs", "what does this codebase do", "module docs"

Architecture documentation powered by the GitNexus knowledge graph and LSP. Oracle (Claude acting as sole author) reads the graph — clusters, hubs, execution flows, dependency edges — enriches with LSP type information and direct source reading, then writes all documentation from scratch. Output includes per-module docs with design rationale, failure modes, blast radius, and safe-change guidance; a CODEBASE_MAP.md index; and an interactive D3 graph viewer (graph.html). Every non-trivial claim carries an inline `path:line` evidence citation and a confidence rating. Unknown things are written as Unknown with a concrete verification step — never as confident assertions.

## Example end-to-end scenarios

### Adding a new feature

```
You: /aio-gitnexus analyze
     → indexes codebase, builds knowledge graph

You: /aio-discover "how does authentication work"
     → finds auth files, scores by relevance, outputs map

You: /aio-map src/auth/session.ts src/middleware/auth.ts
     → dependency graph, blast radius per function

You: /aio-plan "add OAuth2 provider support"
     → scoped plan with file list, risks, NOT Doing section

You: /aio-snapshot
     → baseline recorded before implementation

    [ implement the plan ]

You: /aio-review-quick
     → change detection vs baseline, duplication check, type diagnostics

You: /aio-review-deep
     → fleet review before merge, security + architecture + critic
```

### Debugging a regression

```
You: /aio-rubber-duck "payments fail intermittently but I can't find why"
     → Claude prompts narration, one probe at a time
     → you realize the currency converter is called before locale is set

You: /aio-debug "currency converter called before locale initialization"
     → discovers root cause with trace, writes failing test, applies fix,
       runs verification, triggers deep review, returns clean report
```

### Onboarding to a new codebase

```
You: /aio-gitnexus analyze --embeddings
     → indexes 13-language codebase, generates cluster files

You: /aio-doc-writer
     → writes CODEBASE_MAP.md, per-module docs, graph.html
     → every claim has path:line evidence and confidence score
```

## Prerequisites

- **Node.js >= 18** — required by GitNexus
- **GitNexus** — installed automatically via `npx gitnexus analyze` on first use; MCP server configured via `npx gitnexus setup`
- **LSP servers** — configure language servers for your project's language stack for aio-map, aio-review-quick, and aio-doc-writer to use LSP-precision analysis
- **oh-my-claudecode** — aio-debug and aio-review-deep dispatch OMC agents (explorer, planner, debugger, critic, security-reviewer, verifier); install OMC to unlock the full parallel pipelines
