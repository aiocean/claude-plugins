# Claude Code Plugin Marketplace

A curated collection of 34 plugins for Claude Code — from codebase analysis to iOS debugging to ebook translation.

## Quick Start

```bash
# Add the marketplace
/plugin marketplace add aiocean/claude-plugins

# Browse available plugins
/plugin install aio-install@aiocean-plugins
/aio-install

# Install any plugin directly
/plugin install <plugin-name>@aiocean-plugins
```

## Plugins

### Codebase & Architecture

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-codebase-oracle** | 5.1.2 | Deep codebase analysis powered by GitNexus knowledge graph and LSP. Generates architecture docs (C4 diagrams, dependency graphs), module docs, and interactive HTML viewers.<br>`/plugin install aio-codebase-oracle@aiocean-plugins` |
| **aio-deep-plan** | 3.3.0 | PROACTIVE planning — understand codebase structure before writing code. Five skills: discover, map, snapshot, plan (with re-anchoring), review. GitNexus + LSP powered.<br>`/plugin install aio-deep-plan@aiocean-plugins` |
| **aio-debug** | 2.3.0 | REACTIVE debugging — four-phase pipeline: codebase context → root cause investigation → minimal fix → code review validation. Circuit breaker after 3 failed attempts.<br>`/plugin install aio-debug@aiocean-plugins` |
| **aio-code-review** | 3.1.1 | Multi-agent code review: GitNexus analytics, domain-specific skill detection (Go, iOS, React, XState, observability), 5 core + 4 conditional agents, critic meta-review with confidence scoring.<br>`/plugin install aio-code-review@aiocean-plugins` |

### Development Tools

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-worktree** | 1.1.0 | Git worktree management for parallel development. Create isolated workspaces, sync changes, merge branches, cleanup.<br>`/plugin install aio-worktree@aiocean-plugins` |
| **aio-bun-fullstack-setup** | 1.1.0 | Scaffold Bun fullstack apps. **Scaffold mode** detects existing files and generates only what's missing: single-port server, Vite proxy, PM2 config, Docker build.<br>`/plugin install aio-bun-fullstack-setup@aiocean-plugins` |
| **aio-claude-manager** | 1.1.0 | Enable/disable skills by project context. Switch presets (frontend, backend, ai) to reduce skill clutter.<br>`/plugin install aio-claude-manager@aiocean-plugins` |
| **aio-reflect** | 2.2.0 | Analyze past Claude Code sessions to extract patterns, corrections, and preferences. Turns insights into CLAUDE.md rules or new skills.<br>`/plugin install aio-reflect@aiocean-plugins` |
| **aio-feedback** | 1.1.0 | Submit bug reports, feature requests, and plugin ideas directly from Claude Code via GitHub Issues.<br>`/plugin install aio-feedback@aiocean-plugins` |
| **aio-install** | 1.1.0 | Browse, install, enable/disable aiocean plugins for the current project.<br>`/plugin install aio-install@aiocean-plugins` |

### Language & Framework

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-golang-mastery** | 1.1.0 | Complete Go development with **lint mode**: 7-step tooling chain (build → vet → golangci-lint → govulncheck → nilaway → deadcode → race detection). Based on Google/Uber style guides. Go 1.25.<br>`/plugin install aio-golang-mastery@aiocean-plugins` |
| **aio-react-minimal-effects** | 3.1.0 | Minimize `useEffect` in React 19. **Scan mode** finds and classifies problematic effects in existing code with file:line references. Covers React Compiler, `useActionState`, `useOptimistic`.<br>`/plugin install aio-react-minimal-effects@aiocean-plugins` |
| **aio-xstate** | 1.0.4 | XState v5 strict ruleset: `setup().createMachine()` patterns, design-first workflow, actor types, invoke vs spawnChild, React integration.<br>`/plugin install aio-xstate@aiocean-plugins` |
| **aio-tui** | 1.0.2 | Go Bubbletea TUI guide: TEA architecture, lipgloss styling, production patterns (column alignment, parallel fetch, auto-refresh, tabs, scroll).<br>`/plugin install aio-tui@aiocean-plugins` |

### iOS

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-ios-device-debug** | 1.1.1 | Debug iOS apps on physical devices from terminal. Build, install, launch, capture logs, pull crash reports, take screenshots (iOS 17+). 6 automation scripts.<br>`/plugin install aio-ios-device-debug@aiocean-plugins` |

### Design & Visualization

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-neobrutalism** | 2.0.0 | Neobrutalism **design system bootstrapper**. Detects tech stack, generates CSS tokens, and transforms existing UI components. Bold borders, hard shadows, vibrant colors.<br>`/plugin install aio-neobrutalism@aiocean-plugins` |
| **aio-mermaid** | 1.2.0 | Generate shareable MinimalMermaid diagram URLs from mermaid code.<br>`/plugin install aio-mermaid@aiocean-plugins` |
| **aio-grafana-diagram** | 2.0.0 | **Dashboard diagram generator**. Analyzes codebase to auto-generate Mermaid diagrams with metric binding for Grafana.<br>`/plugin install aio-grafana-diagram@aiocean-plugins` |

### Observability

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-monitoring-observability** | 1.0.4 | Full monitoring stack: Golden Signals, RED/USE, OpenTelemetry tracing, SLOs, dashboards, alerting. 7 automation scripts + production-ready templates.<br>`/plugin install aio-monitoring-observability@aiocean-plugins` |

### Content & Knowledge

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-mental-models** | 2.0.0 | **Decision advisor** using 50+ mental models. Guides you through model selection, application, synthesis, and stress-testing — not just a reference.<br>`/plugin install aio-mental-models@aiocean-plugins` |
| **aio-youtube** | 1.1.0 | Search YouTube and extract video transcripts using yt-dlp. 7 scripts.<br>`/plugin install aio-youtube@aiocean-plugins` |
| **aio-epub-packing** | 1.1.0 | Convert Markdown to professional EPUB ebooks with auto-generated neo-brutalism covers.<br>`/plugin install aio-epub-packing@aiocean-plugins` |
| **aio-epub-translate** | 2.5.0 | AI-driven EPUB translation pipeline. Five skills: setup → research (terminology, web search) → translate → editor review → package.<br>`/plugin install aio-epub-translate@aiocean-plugins` |
| **aio-gherkin-refine** | 1.0.3 | Convert vague requirements into structured Given/When/Then scenarios before writing code.<br>`/plugin install aio-gherkin-refine@aiocean-plugins` |
| **aio-research-kit** | 1.2.0 | Structured 10-phase research framework. Initialize projects, validate structure, and execute systematic research.<br>`/plugin install aio-research-kit@aiocean-plugins` |

### Integrations

| Plugin | Version | Description |
|--------|---------|-------------|
| **aio-jira** | 2.1.0 | Jira via MCP: issue management, sprint tracking, workflow transitions, JQL search. Auto-installs jira-mcp.<br>`/plugin install aio-jira@aiocean-plugins` |
| **aio-github** | 1.1.0 | GitHub via MCP: repos, PRs, issues, code review, file operations.<br>`/plugin install aio-github@aiocean-plugins` |
| **aio-gitlab** | 1.1.0 | GitLab via MCP: merge requests, pipelines, jobs, branch protection, git flow.<br>`/plugin install aio-gitlab@aiocean-plugins` |
| **aio-confluence** | 1.1.0 | Confluence via MCP: page management, CQL search, comments, space listing.<br>`/plugin install aio-confluence@aiocean-plugins` |
| **aio-google-workspace** | 1.1.0 | Google Workspace via MCP: Drive, Gmail, Calendar, Sheets, Docs, Tasks, Slides, Chat + cross-service workflows.<br>`/plugin install aio-google-workspace@aiocean-plugins` |
| **aio-x** | 1.1.0 | X/Twitter via MCP: tweets, threads, search, engagement, moderation, lists.<br>`/plugin install aio-x@aiocean-plugins` |
| **aio-tanca** | 1.1.0 | Tanca via MCP: employee timekeeping, shifts, check-in/check-out, clock logs.<br>`/plugin install aio-tanca@aiocean-plugins` |
| **aio-rag-kit** | 1.1.0 | RAG Kit via MCP: Qdrant vector database — create collections, index content, semantic search.<br>`/plugin install aio-rag-kit@aiocean-plugins` |
| **aio-browser-cookie** | 2.0.0 | Extract browser cookies with rookiepy. Export Netscape files, replay authenticated requests. Supports Chrome, Firefox, Safari, Brave, Edge, and more.<br>`/plugin install aio-browser-cookie@aiocean-plugins` |

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
