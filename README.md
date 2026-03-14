# Claude Code Plugin Marketplace

A curated collection of 22 plugins for Claude Code — from codebase analysis to iOS debugging to ebook publishing.

## Quick Start

```bash
# Add the marketplace
/plugin marketplace add aiocean/claude-plugins

# Install any plugin
/plugin install <plugin-name>@aiocean-plugins
```

## Plugins

### Codebase & Architecture

| Plugin | Description |
|--------|-------------|
| **aio-codebase-oracle** | Deep codebase analysis with parallel agent teams. Generates C4 diagrams, data models, API surfaces, dependency graphs. Three modes: Full Map, Investigate, Impact Analysis. Includes interactive HTML visualization. |
| **aio-deep-plan** | Pre-coding analysis combining CocoIndex semantic search, Kai semantic graph, and LSP. Five skills: discover, map, snapshot, plan, review. |
| **aio-debug** | Four-phase debug pipeline: understand context, investigate root cause, implement minimal fix, validate with code review. No guessing — evidence-based only. |
| **aio-code-review** | Multi-phase code review: domain-specific skill detection, CodeWiki analytics, 4 core + 4 conditional parallel review agents, critic meta-review with confidence scoring. |

### Development Tools

| Plugin | Description |
|--------|-------------|
| **aio-worktree** | Git worktree management for parallel development. Create isolated workspaces, sync changes, merge branches, cleanup — no more branch switching. |
| **aio-bun-fullstack-setup** | Scaffold Bun fullstack apps: single-port API + static frontend, Vite proxy for dev, env validation, PM2 config, multi-stage Docker build. |
| **aio-claude-manager** | Enable/disable skills by project context. Switch presets (frontend, backend, ai) to reduce skill clutter and speed up responses. |
| **aio-reflect** | Analyze past Claude Code sessions to extract patterns, corrections, and preferences. Turns insights into CLAUDE.md rules or new skills. |
| **aio-feedback** | Submit bug reports, feature requests, and plugin ideas directly from Claude Code via GitHub Issues. Requires `gh` CLI. |

### Language & Framework

| Plugin | Description |
|--------|-------------|
| **aio-golang-mastery** | Complete Go development: idiomatic patterns, concurrency, generics, testing (TDD, fuzzing, benchmarks), gRPC. Based on Google/Uber style guides. Go 1.25. |
| **aio-xstate** | XState v5 strict ruleset: `setup().createMachine()` patterns, params-first typing, actor patterns, invoke vs spawnChild, React integration. |
| **aio-react-minimal-effects** | Minimize `useEffect` in React 19. Covers React Compiler, `useActionState`, `useOptimistic`, ref as prop, and proper patterns. |
| **aio-tui** | Go Bubbletea TUI guide: TEA architecture, lipgloss styling, production patterns (column alignment, parallel fetch, auto-refresh, tabs, scroll). |

### iOS

| Plugin | Description |
|--------|-------------|
| **aio-ios-device-debug** | Debug iOS apps on physical devices from terminal. Build, install, launch, capture logs, pull crash reports, take screenshots (iOS 17+). |

### Design & UI

| Plugin | Description |
|--------|-------------|
| **aio-neobrutalism** | Neobrutalism design system: bold borders, hard shadows, vibrant colors. Complete component library — buttons, cards, forms, dialogs. |
| **aio-mermaid** | Generate shareable MinimalMermaid diagram URLs from mermaid code. |
| **aio-grafana-diagram** | Mermaid diagrams with data binding in Grafana dashboards. Flowcharts, sequence diagrams, state diagrams with metric-driven coloring. |

### Observability

| Plugin | Description |
|--------|-------------|
| **aio-monitoring-observability** | Full monitoring stack: Golden Signals, RED/USE, OpenTelemetry tracing, SLOs, dashboards, alerting. 7 automation scripts + production-ready templates. |

### Content & Knowledge

| Plugin | Description |
|--------|-------------|
| **aio-mental-models** | 50+ mental models from The Great Mental Models series. First principles, inversion, second-order thinking, feedback loops, and more. |
| **aio-youtube** | Search YouTube, extract transcripts, summarize videos, compare sources, pull code snippets from tutorials. Uses yt-dlp. |
| **aio-epub-packing** | Convert Markdown to professional EPUB ebooks with auto-generated neo-brutalism covers. Multi-chapter, images, code highlighting, 7 color schemes. |
| **aio-gherkin-refine** | Convert vague requirements into structured Given/When/Then scenarios before writing code. Catch misunderstandings early. |

### Integrations

| Plugin | Description |
|--------|-------------|
| **aio-jira** | Jira via MCP: issue management, sprint tracking, workflow transitions, JQL search, dev info. Auto-installs jira-mcp server. |
| **aio-remove-bg** | Remove image backgrounds — threshold-based (fast) or AI-powered (rembg). Auto-trims transparent edges. |

## Workflows

Plugins compose into multi-step workflows:

**Feature Development** — clarify requirements, understand codebase, apply patterns, review, update tickets:
```
gherkin-refine → codebase-oracle → [xstate / react-minimal-effects] → code-review → jira
```

**Debugging** — investigate, lint, add observability, visualize:
```
aio-debug → ios-device-debug → monitoring-observability → grafana-diagram
```

**Content & Docs** — research, think, document, publish:
```
youtube → mental-models → codebase-oracle → epub-packing
```

**Project Bootstrap** — scaffold, design, parallelize, observe, learn:
```
bun-fullstack-setup → neobrutalism → worktree → monitoring-observability → reflect
```

## License

MIT
