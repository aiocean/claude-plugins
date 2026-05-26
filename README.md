# Claude Code Plugin Marketplace

A curated collection of 20 plugins for Claude Code — from codebase analysis to iOS debugging to ebook translation.

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
| **aio-codeflow** | 2.0.0 | 10 | Coordinated coding workflow — discover/map/snapshot (codebase intel), plan (implementation planning), debug (4-phase root-cause pipeline), rubber-duck (articulation companion), review-quick (pre-commit sanity check) + review-deep (parallel multi-agent gate), doc-writer (GitNexus-powered architecture docs), gitnexus (engine setup).<br>`npx skills add aiocean/claude-plugins -s aio-codeflow` |
| **aio-claude-toolkit** | 1.0.0 | 6 | Claude Code management — claude-manager, install, reflect, dream, skillify, feedback.<br>`npx skills add aiocean/claude-plugins -s aio-claude-toolkit` |
| **aio-devops** | 1.0.0 | 3 | DevOps — github (repos, PRs, issues), gitlab (MRs, pipelines), worktree (parallel development).<br>`npx skills add aiocean/claude-plugins -s aio-devops` |
| **aio-design-system** | 1.2.0 | 3 | UI/UX design — uiux (design knowledge), neobrutalism (design system bootstrapper), dashboard-design (SaaS analytics dashboards: chart selection, anti-patterns, a11y, storytelling).<br>`npx skills add aiocean/claude-plugins -s aio-design-system` |
| **aio-saas-tools** | 1.0.0 | 4 | SaaS integrations — atlassian (Jira + Confluence), google-workspace, tanca (HR), x (Twitter).<br>`npx skills add aiocean/claude-plugins -s aio-saas-tools` |
| **aio-research** | 1.0.0 | 2 | Research — research-kit (10-phase framework), rag-kit (Qdrant vector search).<br>`npx skills add aiocean/claude-plugins -s aio-research` |
| **aio-diagramming** | 1.0.0 | 2 | Diagrams — mermaid (shareable URLs), grafana-diagram (dashboard diagrams from code).<br>`npx skills add aiocean/claude-plugins -s aio-diagramming` |

## Standalone Plugins

### Content & Translation

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-epub-translate** | 3.5.1 | EPUB translation via ConnectRPC API — 9 skills: analyze, translate, review, quality, manage, upload, export, setup, vn-style.<br>`npx skills add aiocean/claude-plugins -s aio-epub-translate` |
| **aio-mental-models** | 2.1.3 | Decision advisor using 50+ mental models.<br>`npx skills add aiocean/claude-plugins -s aio-mental-models` |
| **aio-threat-models** | 1.0.0 | Threat modeling knowledge advisor with semantic search across 27 frameworks — STRIDE, LINDDUN, PASTA, OCTAVE, Attack Trees, MITRE ATT&CK/ATLAS, Kill Chain, NIST AI RMF, OWASP LLM Top 10, Kubernetes Threat Matrix.<br>`npx skills add aiocean/claude-plugins -s aio-threat-models` |
| **aio-youtube** | 1.1.3 | YouTube search and transcript extraction via yt-dlp.<br>`npx skills add aiocean/claude-plugins -s aio-youtube` |
| **aio-gherkin-refine** | 2.0.2 | BDD field guide — Gherkin with Example Mapping, 3 Amigos, anti-patterns.<br>`npx skills add aiocean/claude-plugins -s aio-gherkin-refine` |

### Language & Framework

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-golang-mastery** | 1.1.1 | Go development with 7-step lint chain. Google/Uber style guides.<br>`npx skills add aiocean/claude-plugins -s aio-golang-mastery` |
| **aio-xstate** | 1.0.6 | XState v5 strict ruleset for TypeScript state machines.<br>`npx skills add aiocean/claude-plugins -s aio-xstate` |
| **aio-tui** | 1.0.5 | Go Bubbletea TUI guide: TEA pattern, lipgloss, production patterns.<br>`npx skills add aiocean/claude-plugins -s aio-tui` |
| **aio-bun-fullstack-setup** | 1.1.1 | Scaffold Bun fullstack apps with smart detection.<br>`npx skills add aiocean/claude-plugins -s aio-bun-fullstack-setup` |

### Platform & Browser

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-ios-device-debug** | 1.1.4 | Debug iOS apps on physical devices from terminal.<br>`npx skills add aiocean/claude-plugins -s aio-ios-device-debug` |
| **aio-browser-cookie** | 2.0.3 | Extract browser cookies with rookiepy for authenticated requests.<br>`npx skills add aiocean/claude-plugins -s aio-browser-cookie` |
| **aio-visual-diff** | 0.1.0 | Verify AI-built UI against design via measurement-driven diff — `getComputedStyle` + `getBoundingClientRect` via Chrome DevTools MCP, diff against Figma reference or frozen baseline, numerical delta feedback. No screenshot eyeballing.<br>`npx skills add aiocean/claude-plugins -s aio-visual-diff` |
| **aio-html-interactive** | 1.0.1 | Bridge Claude to a browser UI in real time — solves the AI-event-loop gap. Frozen Bun + Vue3 + Tailwind scaffold: browser events become Monitor-tool notifications (`MSG::` stdout lines), Claude pushes broadcast over WebSocket. Claude only edits the APP REGION; runtime, protocol, and vendor blocks stay frozen.<br>`npx skills add aiocean/claude-plugins -s aio-html-interactive` |

### Database

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-starrocks** | 1.0.0 | StarRocks best practices and query tuning — 2 skills: best-practices (partitioning, bucketing, sort keys, PK tuning, auth, resource groups) and query-tuning (EXPLAIN plans, Query Profile, operator metrics, tuning recipes, hints).<br>`npx skills add aiocean/claude-plugins -s aio-starrocks` |

### Engineering Practices

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-code-review** | 1.0.0 | Google's engineering code-review playbook — the LGTM threshold ("improves code health, not perfection"), 8-point reviewer checklist (design/functionality/complexity/tests/naming/comments/style/docs), severity-labeled comments (Nit/Optional/FYI), pushback handling, and CL-author guidance (good descriptions, small CLs, handling reviews). Distilled verbatim from [google/eng-practices](https://github.com/google/eng-practices) (CC-BY 3.0).<br>`npx skills add aiocean/claude-plugins -s aio-code-review` |

### Observability & Utilities

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-monitoring-observability** | 1.0.7 | Full monitoring stack: Golden Signals, RED/USE, OpenTelemetry, SLOs.<br>`npx skills add aiocean/claude-plugins -s aio-monitoring-observability` |
| **aio-image** | 1.0.0 | Remove image backgrounds with RMBG-2.0 alpha matting + despill. Engine-agnostic; pairs with flat-magenta chroma-key prompts.<br>`npx skills add aiocean/claude-plugins -s aio-image` |

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
