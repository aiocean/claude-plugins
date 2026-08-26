# Claude Code Plugin Marketplace

A curated collection of 29 plugins for Claude Code — from codebase analysis to iOS debugging to rich HTML communication artifacts.

## Quick Start

```bash
# 1. Add the marketplace (one-time)
claude plugin marketplace add aiocean/claude-plugins

# 2. Install any plugin
claude plugin install <plugin-name>@aiocean-plugins

# Or browse and pick plugins interactively
# https://claude-plugins.aiocean.dev/
```

## Toolkits

Grouped plugins bundling multiple related skills into a single install.

| Plugin | Version | Skills | Description |
|--------|---------|--------|-------------|
| **aio-codeflow** | 2.0.2 | 10 | Coordinated coding workflow — discover/map/snapshot (codebase intel), plan (implementation planning), debug (4-phase root-cause pipeline), rubber-duck (articulation companion), review-quick (pre-commit sanity check) + review-deep (parallel multi-agent gate), doc-writer (GitNexus-powered architecture docs), gitnexus (engine setup).<br>`npx skills add aiocean/claude-plugins -s aio-codeflow` |
| **aio-claude-toolkit** | 3.0.2 | 9 | Sharpen Claude Code — **aio-patch-{setup,extract,compile,run,anchor,control}** (extract + patch + recompile Claude's binary for custom use cases, e.g. control channels, agent-as-a-service), **aio-skillify** (capture workflow as reusable skill), **aio-dream** (memory consolidation), **aio-feedback** (ship feedback to marketplace).<br>`npx skills add aiocean/claude-plugins -s aio-claude-toolkit` |
| **aio-devops** | 1.0.5 | 3 | DevOps — github (repos, PRs, issues), gitlab (MRs, pipelines), worktree (parallel development).<br>`npx skills add aiocean/claude-plugins -s aio-devops` |
| **aio-design-system** | 1.2.3 | 3 | UI/UX design — uiux (design knowledge), neobrutalism (design system bootstrapper), dashboard-design (SaaS analytics dashboards: chart selection, anti-patterns, a11y, storytelling).<br>`npx skills add aiocean/claude-plugins -s aio-design-system` |
| **aio-saas-tools** | 1.0.5 | 4 | SaaS integrations — atlassian (Jira + Confluence), google-workspace, tanca (HR), x (Twitter).<br>`npx skills add aiocean/claude-plugins -s aio-saas-tools` |
| **aio-research** | 1.0.5 | 2 | Research — research-kit (10-phase framework), rag-kit (Qdrant vector search).<br>`npx skills add aiocean/claude-plugins -s aio-research` |
| **aio-diagramming** | 1.0.5 | 2 | Diagrams — mermaid (shareable URLs), grafana-diagram (dashboard diagrams from code).<br>`npx skills add aiocean/claude-plugins -s aio-diagramming` |
| **aio-html-artifacts** | 2.4.1 | 4 | Create self-contained HTML artifacts in four genres — report, deck, explorer, editor — routed by what the human does next: read and audit, present, decide, or edit and hand values back. Every artifact is offline (one file, zero remote references), printable (a print stylesheet in every genre), and auditable (claims carry repository, revision, and line anchors, confidence words carry numeric bands, and a parsing validator gates the structure).<br>`npx skills add aiocean/claude-plugins -s aio-html-artifacts` |

## Standalone Plugins

### Content & Translation

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-epub-translate** | 4.0.3 | EPUB translation via ConnectRPC API — 9 skills: analyze, translate, review, quality, manage, upload, export, setup, vn-style.<br>`npx skills add aiocean/claude-plugins -s aio-epub-translate` |
| **aio-youtube** | 1.1.7 | YouTube search and transcript extraction via yt-dlp.<br>`npx skills add aiocean/claude-plugins -s aio-youtube` |
| **aio-gherkin-refine** | 2.0.6 | BDD field guide — Gherkin with Example Mapping, 3 Amigos, anti-patterns.<br>`npx skills add aiocean/claude-plugins -s aio-gherkin-refine` |
| **aio-anti-slop** | 1.1.0 | Remove AI slop from prose and code — grep-able tell catalog (English + Vietnamese), false-positive triage, re-scan loop, diff-scoped code pass.<br>`npx skills add aiocean/claude-plugins -s aio-anti-slop` |

### Knowledge & Advisory

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-advisor** | 1.0.0 | Curated decision-support reference with semantic search across three domains — 54 general-reasoning mental models, 27 threat-modeling frameworks (STRIDE, LINDDUN, PASTA, MITRE ATT&CK/ATLAS, Kill Chain, NIST AI RMF, OWASP LLM Top 10, K8s Threat Matrix), and 137 software-architecture patterns (cloud design, resilience, data, DDD, distributed systems). Each domain routes a problem to the relevant entries, applies each, synthesizes, and stress-tests with a counter-frame. 4 skills: aio-mental-models, aio-threat-models, aio-architect-advisor, aio-architect-reference.<br>`npx skills add aiocean/claude-plugins -s aio-advisor` |

### Language & Framework

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-golang-mastery** | 1.2.3 | Go development with 7-step lint chain. Google/Uber style guides.<br>`npx skills add aiocean/claude-plugins -s aio-golang-mastery` |
| **aio-xstate** | 1.0.11 | XState v5 strict ruleset for TypeScript state machines.<br>`npx skills add aiocean/claude-plugins -s aio-xstate` |
| **aio-tui** | 1.1.1 | Go TUI guide on the charmbracelet v2 stack (bubbletea/v2 + lipgloss/v2): Elm architecture, restrained styling, async rendering, layout geometry, mouse hit-testing.<br>`npx skills add aiocean/claude-plugins -s aio-tui` |
| **aio-bun-fullstack-setup** | 1.1.6 | Scaffold Bun fullstack apps with smart detection.<br>`npx skills add aiocean/claude-plugins -s aio-bun-fullstack-setup` |

### Platform & Browser

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-ios-device-debug** | 1.1.8 | Debug iOS apps on physical devices from terminal.<br>`npx skills add aiocean/claude-plugins -s aio-ios-device-debug` |
| **aio-browser-cookie** | 2.0.8 | Extract browser cookies with rookiepy for authenticated requests.<br>`npx skills add aiocean/claude-plugins -s aio-browser-cookie` |
| **aio-boox** | 1.0.1 | Push books/docs to an Onyx BOOX e-reader and manage its cloud account (push list, library, notes) API-direct via a zero-dependency Node CLI.<br>`npx skills add aiocean/claude-plugins -s aio-boox` |
| **aio-visual-diff** | 0.1.3 | Verify AI-built UI against design via measurement-driven diff — `getComputedStyle` + `getBoundingClientRect` via Chrome DevTools MCP, diff against Figma reference or frozen baseline, numerical delta feedback. No screenshot eyeballing.<br>`npx skills add aiocean/claude-plugins -s aio-visual-diff` |
| **aio-message-bridge** | 1.1.0 | Give Claude Code an event loop — a generic, language-agnostic HTTP + WebSocket relay plus an optional frozen Bun + Vue3 + Tailwind browser-UI scaffold (the `aio-html-interactive` skill). The Monitor tool lets anything outside Claude (CLI, mobile app, webhook, another program, web page, or the bundled UI) talk to it mid-task both ways. Inbound: client POSTs an event → relay prints `MSG::` to stdout → Monitor notification. Outbound: Claude POSTs a push → relay broadcasts over WebSocket. Ready-to-run reference relay + vanilla client; localhost by default, optional token-gated exposure over Cloudflare Tunnel / Tailscale / LAN. 2 skills: aio-message-bridge, aio-html-interactive.<br>`npx skills add aiocean/claude-plugins -s aio-message-bridge` |

### Database

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-starrocks** | 1.0.5 | StarRocks best practices and query tuning — 2 skills: best-practices (partitioning, bucketing, sort keys, PK tuning, auth, resource groups) and query-tuning (EXPLAIN plans, Query Profile, operator metrics, tuning recipes, hints).<br>`npx skills add aiocean/claude-plugins -s aio-starrocks` |

### Engineering Practices

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-code-review** | 1.0.3 | Google's engineering code-review playbook — the LGTM threshold ("improves code health, not perfection"), 8-point reviewer checklist (design/functionality/complexity/tests/naming/comments/style/docs), severity-labeled comments (Nit/Optional/FYI), pushback handling, and CL-author guidance (good descriptions, small CLs, handling reviews). Distilled verbatim from [google/eng-practices](https://github.com/google/eng-practices) (CC-BY 3.0).<br>`npx skills add aiocean/claude-plugins -s aio-code-review` |
| **aio-workflow** | 1.1.1 | Author Workflow-tool scripts that spend effort like it's free and waste none of it — a maximal-effort playbook for multi-agent orchestration. Pick an effort tier (quick check → thorough audit → maximize), then scale fan-out width, verify votes, and discovery rounds; compose named amplifiers (multi-modal sweep, adversarial + perspective-diverse verify, loop-until-dry, completeness critic, synthesis) into one canonical harness, with the correctness rules (literal meta, determinism ban, pipeline-by-default, budget guard, caps) that keep it runnable and resumable. 1 skill: aio-workflow-creator.<br>`npx skills add aiocean/claude-plugins -s aio-workflow` |
| **aio-catch-me-up** | 2.0.0 | Don't let the AI leave you behind — turns Claude into a wise, mastery-gated teacher that makes sure YOU deeply understand the work an AI agent just did before you merge it. Grounds in the real `git diff`, builds a running checklist across three pillars (the Problem & why it existed, the Solution & why it beat the alternatives + edge cases, the Broader impact), elicits your restatement *first*, explains the gap at your depth (eli5 / eli14 / intern), and quizzes you with `AskUserQuestion` — answers never leaked, correct option never telegraphed — refusing to conclude until you've demonstrated mastery and survived the *why* follow-ups. 1 skill: aio-catch-me-up.<br>`npx skills add aiocean/claude-plugins -s aio-catch-me-up` |

### Observability & Utilities

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-monitoring-observability** | 1.0.11 | Full monitoring stack: Golden Signals, RED/USE, OpenTelemetry, SLOs.<br>`npx skills add aiocean/claude-plugins -s aio-monitoring-observability` |
| **aio-image** | 1.0.3 | Remove image backgrounds with RMBG-2.0 alpha matting + despill. Engine-agnostic; pairs with flat-magenta chroma-key prompts.<br>`npx skills add aiocean/claude-plugins -s aio-image` |

## Workflows

**Feature Development** — clarify → understand → implement → review:
```
gherkin-refine → aio-codeflow (discover → plan) → [xstate / design-system] → aio-codeflow (review-deep)
```

**Debugging** — investigate → fix → observe → visualize:
```
aio-codeflow (debug) → ios-device-debug → monitoring-observability → aio-diagramming
```

**Content Pipeline** — research → think → document → publish:
```
youtube → mental-models → aio-codeflow (doc-writer) → epub-translate
```

**Project Bootstrap** — scaffold → design → parallelize → learn:
```
bun-fullstack-setup → aio-design-system → aio-devops (worktree) → aio-claude-toolkit (reflect)
```

## Validation

```bash
bash scripts/validate-marketplace.sh
```

Checks: plugin.json fields, folder naming, SKILL.md frontmatter, script references, resolver blocks, marketplace.json version sync.

## License

MIT
