# Claude Code Plugin Marketplace

A curated collection of 34 plugins for Claude Code — from codebase analysis to iOS debugging to ebook translation.

## Quick Start

```bash
# Install any plugin
npx skills add aiocean/claude-plugins -s <plugin-name>

# Or browse and pick plugins interactively
# https://aiocean.github.io/claude-plugins/
```

## Plugins

### Codebase & Architecture

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-codebase-oracle** | 5.1.2 | Deep codebase analysis powered by GitNexus knowledge graph and LSP. Generates architecture docs (C4 diagrams, dependency graphs), module docs, and interactive HTML viewers.<br>`npx skills add aiocean/claude-plugins -s aio-codebase-oracle` |
| **aio-deep-plan** | 3.3.0 | PROACTIVE planning — understand codebase structure before writing code. Five skills: discover, map, snapshot, plan (with re-anchoring), review. GitNexus + LSP powered.<br>`npx skills add aiocean/claude-plugins -s aio-deep-plan` |
| **aio-debug** | 2.3.0 | REACTIVE debugging — four-phase pipeline: codebase context → root cause investigation → minimal fix → code review validation. Circuit breaker after 3 failed attempts.<br>`npx skills add aiocean/claude-plugins -s aio-debug` |
| **aio-code-review** | 3.1.1 | Multi-agent code review: GitNexus analytics, domain-specific skill detection (Go, iOS, React, XState, observability), 5 core + 4 conditional agents, critic meta-review with confidence scoring.<br>`npx skills add aiocean/claude-plugins -s aio-code-review` |

### Development Tools

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-worktree** | 1.1.0 | Git worktree management for parallel development. Create isolated workspaces, sync changes, merge branches, cleanup.<br>`npx skills add aiocean/claude-plugins -s aio-worktree` |
| **aio-bun-fullstack-setup** | 1.1.0 | Scaffold Bun fullstack apps. **Scaffold mode** detects existing files and generates only what's missing: single-port server, Vite proxy, PM2 config, Docker build.<br>`npx skills add aiocean/claude-plugins -s aio-bun-fullstack-setup` |
| **aio-claude-manager** | 1.1.0 | Enable/disable skills by project context. Switch presets (frontend, backend, ai) to reduce skill clutter.<br>`npx skills add aiocean/claude-plugins -s aio-claude-manager` |
| **aio-reflect** | 2.2.0 | Analyze past Claude Code sessions to extract patterns, corrections, and preferences. Turns insights into CLAUDE.md rules or new skills.<br>`npx skills add aiocean/claude-plugins -s aio-reflect` |
| **aio-feedback** | 1.1.0 | Submit bug reports, feature requests, and plugin ideas directly from Claude Code via GitHub Issues.<br>`npx skills add aiocean/claude-plugins -s aio-feedback` |
| **aio-install** | 1.1.0 | Browse, install, enable/disable aiocean plugins for the current project.<br>`npx skills add aiocean/claude-plugins -s aio-install` |

### Language & Framework

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-golang-mastery** | 1.1.0 | Complete Go development with **lint mode**: 7-step tooling chain (build → vet → golangci-lint → govulncheck → nilaway → deadcode → race detection). Based on Google/Uber style guides. Go 1.25.<br>`npx skills add aiocean/claude-plugins -s aio-golang-mastery` |
| **aio-react-minimal-effects** | 3.1.0 | Minimize `useEffect` in React 19. **Scan mode** finds and classifies problematic effects in existing code with file:line references. Covers React Compiler, `useActionState`, `useOptimistic`.<br>`npx skills add aiocean/claude-plugins -s aio-react-minimal-effects` |
| **aio-xstate** | 1.0.4 | XState v5 strict ruleset: `setup().createMachine()` patterns, design-first workflow, actor types, invoke vs spawnChild, React integration.<br>`npx skills add aiocean/claude-plugins -s aio-xstate` |
| **aio-tui** | 1.0.2 | Go Bubbletea TUI guide: TEA architecture, lipgloss styling, production patterns (column alignment, parallel fetch, auto-refresh, tabs, scroll).<br>`npx skills add aiocean/claude-plugins -s aio-tui` |

### iOS

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-ios-device-debug** | 1.1.1 | Debug iOS apps on physical devices from terminal. Build, install, launch, capture logs, pull crash reports, take screenshots (iOS 17+). 6 automation scripts.<br>`npx skills add aiocean/claude-plugins -s aio-ios-device-debug` |

### Design & Visualization

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-neobrutalism** | 2.0.0 | Neobrutalism **design system bootstrapper**. Detects tech stack, generates CSS tokens, and transforms existing UI components. Bold borders, hard shadows, vibrant colors.<br>`npx skills add aiocean/claude-plugins -s aio-neobrutalism` |
| **aio-mermaid** | 1.2.0 | Generate shareable MinimalMermaid diagram URLs from mermaid code.<br>`npx skills add aiocean/claude-plugins -s aio-mermaid` |
| **aio-grafana-diagram** | 2.0.0 | **Dashboard diagram generator**. Analyzes codebase to auto-generate Mermaid diagrams with metric binding for Grafana.<br>`npx skills add aiocean/claude-plugins -s aio-grafana-diagram` |

### Observability

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-monitoring-observability** | 1.0.4 | Full monitoring stack: Golden Signals, RED/USE, OpenTelemetry tracing, SLOs, dashboards, alerting. 7 automation scripts + production-ready templates.<br>`npx skills add aiocean/claude-plugins -s aio-monitoring-observability` |

### Content & Knowledge

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-mental-models** | 2.0.0 | **Decision advisor** using 50+ mental models. Guides you through model selection, application, synthesis, and stress-testing — not just a reference.<br>`npx skills add aiocean/claude-plugins -s aio-mental-models` |
| **aio-youtube** | 1.1.0 | Search YouTube and extract video transcripts using yt-dlp. 7 scripts.<br>`npx skills add aiocean/claude-plugins -s aio-youtube` |
| **aio-epub-packing** | 1.1.0 | Convert Markdown to professional EPUB ebooks with auto-generated neo-brutalism covers.<br>`npx skills add aiocean/claude-plugins -s aio-epub-packing` |
| **aio-epub-translate** | 2.5.0 | AI-driven EPUB translation pipeline. Five skills: setup → research (terminology, web search) → translate → editor review → package.<br>`npx skills add aiocean/claude-plugins -s aio-epub-translate` |
| **aio-gherkin-refine** | 1.0.3 | Convert vague requirements into structured Given/When/Then scenarios before writing code.<br>`npx skills add aiocean/claude-plugins -s aio-gherkin-refine` |
| **aio-research-kit** | 1.2.0 | Structured 10-phase research framework. Initialize projects, validate structure, and execute systematic research.<br>`npx skills add aiocean/claude-plugins -s aio-research-kit` |

### Integrations

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-jira** | 2.1.0 | Jira via MCP: issue management, sprint tracking, workflow transitions, JQL search. Auto-installs jira-mcp.<br>`npx skills add aiocean/claude-plugins -s aio-jira` |
| **aio-github** | 1.1.0 | GitHub via MCP: repos, PRs, issues, code review, file operations.<br>`npx skills add aiocean/claude-plugins -s aio-github` |
| **aio-gitlab** | 1.1.0 | GitLab via MCP: merge requests, pipelines, jobs, branch protection, git flow.<br>`npx skills add aiocean/claude-plugins -s aio-gitlab` |
| **aio-confluence** | 1.1.0 | Confluence via MCP: page management, CQL search, comments, space listing.<br>`npx skills add aiocean/claude-plugins -s aio-confluence` |
| **aio-google-workspace** | 1.1.0 | Google Workspace via MCP: Drive, Gmail, Calendar, Sheets, Docs, Tasks, Slides, Chat + cross-service workflows.<br>`npx skills add aiocean/claude-plugins -s aio-google-workspace` |
| **aio-x** | 1.1.0 | X/Twitter via MCP: tweets, threads, search, engagement, moderation, lists.<br>`npx skills add aiocean/claude-plugins -s aio-x` |
| **aio-tanca** | 1.1.0 | Tanca via MCP: employee timekeeping, shifts, check-in/check-out, clock logs.<br>`npx skills add aiocean/claude-plugins -s aio-tanca` |
| **aio-rag-kit** | 1.1.0 | RAG Kit via MCP: Qdrant vector database — create collections, index content, semantic search.<br>`npx skills add aiocean/claude-plugins -s aio-rag-kit` |
| **aio-browser-cookie** | 2.0.0 | Extract browser cookies with rookiepy. Export Netscape files, replay authenticated requests. Supports Chrome, Firefox, Safari, Brave, Edge, and more.<br>`npx skills add aiocean/claude-plugins -s aio-browser-cookie` |

### Deprecated

| Plugin | Version | Note |
|--------|---------|------|
| ~~aio-remove-bg~~ | 1.1.1 | Use ImageMagick or `rembg` CLI directly. |

## Workflows

Plugins compose into multi-step workflows:

**Feature Development** — clarify → understand → implement → review → track:
```
gherkin-refine → deep-plan → [xstate / react-minimal-effects] → code-review → jira
```

**Debugging** — investigate → fix → observe → visualize:
```
debug → ios-device-debug → monitoring-observability → grafana-diagram
```

**Content Pipeline** — research → think → document → publish:
```
youtube → mental-models → codebase-oracle → epub-packing
```

**Project Bootstrap** — scaffold → design → parallelize → observe → learn:
```
bun-fullstack-setup → neobrutalism → worktree → monitoring-observability → reflect
```

**Translation Pipeline** — setup → research → translate → review → export:
```
epub-setup → epub-research → epub-translate → editor-review → epub-package
```

## Validation

Run the marketplace validator to check all plugins:

```bash
bash scripts/validate-marketplace.sh
```

Checks: plugin.json fields, folder naming, SKILL.md frontmatter, script references, resolver blocks, marketplace.json version sync.

## License

MIT
