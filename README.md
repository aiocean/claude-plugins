# Claude Code Plugin Marketplace

A collection of Claude Code plugins by aiocean.

```bash
/plugin marketplace add aiocean/claude-plugins
```

## worktree

Work on multiple features at the same time without constant branch switching. Create isolated workspaces where each AI agent operates on its own copy of the codebase. Perfect for parallel development - let one agent build the frontend while another handles the backend. Changes sync seamlessly when you're ready to merge. No more "please wait, I'm on another branch" interruptions.

```bash
/plugin install aio-worktree@aiocean-plugins
```

## mental-models

Think better with 50+ mental models from The Great Mental Models series. When you're stuck on a complex decision, facing a tricky debugging session, or designing system architecture, this skill helps you pick the right thinking tool. First principles breaks problems down to fundamentals. Inversion helps you avoid failure by thinking backwards. Second-order thinking reveals hidden consequences. Feedback loops explain why systems behave unexpectedly. Stop relying on gut feeling - use proven frameworks that the world's best thinkers use.

```bash
/plugin install aio-mental-models@aiocean-plugins
```

## reflect

Every Claude Code session teaches you something, but most learnings disappear when the conversation ends. Reflect changes that. It analyzes your past sessions to find patterns - corrections you made, preferences you expressed, techniques that worked. Then it turns those insights into permanent CLAUDE.md rules or new skills. Your AI gets smarter over time, remembering that you prefer bun over npm, that you hate over-engineering, that you want Vietnamese comments. Stop repeating yourself session after session.

```bash
/plugin install aio-reflect@aiocean-plugins
```

## remove-bg

Remove backgrounds from any image in seconds. Drop in a logo and get a clean transparent PNG. Process product photos for e-commerce. Create cutouts for presentations. Works with simple mono images using fast threshold detection, or handles complex photos with AI-powered removal. Automatically trims transparent edges so your output is perfectly sized. No more wrestling with Photoshop or online tools with watermarks.

```bash
/plugin install aio-remove-bg@aiocean-plugins
```

## epub-packing

Turn your Markdown files into professional EPUB ebooks. Write documentation, articles, or entire books in Markdown and get beautiful e-reader files with auto-generated neo-brutalism covers. Support for multi-chapter books, embedded images, code blocks with syntax highlighting, and tables. Choose from 7 color schemes or let it pick randomly. Your readers can enjoy your content on Kindle, Apple Books, or any e-reader - offline, distraction-free.

```bash
/plugin install aio-epub-packing@aiocean-plugins
```

## youtube

Research YouTube without actually watching videos. Search for topics and get relevant videos instantly. Extract full transcripts in any available language. Summarize hour-long tutorials into key points. Compare multiple videos on the same topic to find consensus and disagreements. Pull out code snippets from programming tutorials. Get chapter timestamps and linked resources. Perfect for learning quickly or gathering research without spending hours watching.

```bash
/plugin install aio-youtube@aiocean-plugins
```

## gherkin-refine

Stop building the wrong thing. When requirements are vague or ambiguous, this skill converts them into clear Given/When/Then scenarios before you write a single line of code. "Add a delete button" becomes explicit scenarios covering admin permissions, confirmation dialogs, error handling, and edge cases. You and your AI align on exactly what needs to be built. Catch misunderstandings early, not after hours of wasted development.

```bash
/plugin install aio-gherkin-refine@aiocean-plugins
```

## claude-manager

Too many skills slow you down. When you're working on a frontend project, you don't need backend skills cluttering your context. Claude Manager lets you enable only what's relevant. Switch to `frontend` preset and focus on UI work. Switch to `backend` for API development. Switch to `ai` for prompt engineering projects. Analyze which skills you actually use and disable the rest. Faster responses, less noise, more focus.

```bash
/plugin install aio-claude-manager@aiocean-plugins
```

## neobrutalism

Build web interfaces that stand out. While everyone else uses the same boring rounded corners and subtle shadows, neobrutalism gives you bold black borders, hard drop shadows, and vibrant colors. Complete design system with buttons, cards, forms, dialogs, and more. Copy the base CSS and components directly into your project. Your UI will look confident, modern, and memorable - not like another Bootstrap clone.

```bash
/plugin install aio-neobrutalism@aiocean-plugins
```

## bun-fullstack-setup

Ship fullstack applications with Bun the right way. Single port serves both your API and static frontend in production - no nginx configuration needed. Vite proxy handles development with hot reload. Environment validation catches missing config at startup, not runtime. PM2 config for local development. Multi-stage Docker build for lean production images. Stop copy-pasting boilerplate from Stack Overflow - get a proven setup that just works.

```bash
/plugin install aio-bun-fullstack-setup@aiocean-plugins
```

## monitoring-observability

Build reliable systems that tell you when something is wrong before your users do. Comprehensive monitoring and observability skill covering metrics design (Golden Signals, RED/USE methods), distributed tracing with OpenTelemetry, alerting best practices, SLOs/SLIs/error budgets, dashboard design, log aggregation, and tool selection. Includes 7 automation scripts for metrics analysis, alert quality checking, SLO calculation, log analysis, dashboard generation, health check validation, and Datadog cost analysis. Production-ready templates for Prometheus alerts, OpenTelemetry collector config, and incident runbooks.

```bash
/plugin install aio-monitoring-observability@aiocean-plugins
```

## ios-device-debug

Debug iOS apps on real hardware from your terminal. Build, install, and launch apps on physical devices. Capture live device logs filtered by your app. Pull crash reports and analyze symbolicated stack traces. Take screenshots on iOS 17+ devices. No more hunting through Xcode's device organizer - everything you need is one command away.

```bash
/plugin install aio-ios-device-debug@aiocean-plugins
```

## codebase-oracle

Deep codebase analysis using specialized agent teams. Instead of one AI reading everything serially, codebase-oracle creates parallel analyst teammates - each focusing on their domain: structure analysts map architecture and dependencies, data analysts document models and schemas, flow analysts trace execution paths and APIs, product analysts capture user-facing behavior, and infra analysts map deployment and configuration. Tree-sitter static analysis provides accurate import graphs and function extraction. Three modes: Full Map generates complete architecture docs (C4 diagrams, data models, API surfaces, dependency graphs), Investigate answers targeted questions with evidence-based confidence tracking, and Impact analysis tells you exactly what breaks before you change something. Includes interactive visualization to explore your architecture as an HTML playground.

```bash
/plugin install aio-codebase-oracle@aiocean-plugins
```

## aio-debug

Systematic debug & fix orchestrator. Four-phase pipeline: understand codebase context, investigate root cause (no guessing), implement the minimal fix, then validate with code review. Enforces evidence-based debugging — no fixes without confirmed root cause.

```bash
/plugin install aio-debug@aiocean-plugins
```

## cocoindex

Index your codebase documents for fast semantic search with CocoIndex. Two skills work together: `cocoindex-setup` scaffolds a project-specific `.cocoindex/` directory with configuration, embedding pipeline, and search functions tailored to your stack. Once set up, `cocoindex` lets you search across indexed documents and maintain the index with incremental processing — only changed files get re-embedded. Perfect for large codebases where grep isn't enough and you need meaning-aware search across documentation, comments, and code.

```bash
/plugin install aio-cocoindex@aiocean-plugins
```

## Workflows

Plugins are designed to work independently, but they compose naturally into multi-step workflows.

### Feature Development
Clarify requirements → understand the codebase → apply correct patterns → review before merge → update tickets.

```
gherkin-refine → codebase-oracle → [xstate / react-minimal-effects] → code-review-ultra → jira
```

```bash
/plugin install aio-gherkin-refine@aiocean-plugins
/plugin install aio-codebase-oracle@aiocean-plugins
/plugin install aio-xstate@aiocean-plugins
/plugin install aio-code-review-ultra@aiocean-plugins
/plugin install aio-jira@aiocean-plugins
```

### Debugging
Investigate root cause → lint changed code → add observability → visualize metrics.

```
aio-debug → ios-device-debug → monitoring-observability → grafana-diagram
```

```bash
/plugin install aio-debug@aiocean-plugins
/plugin install aio-ios-device-debug@aiocean-plugins
/plugin install aio-monitoring-observability@aiocean-plugins
/plugin install aio-grafana-diagram@aiocean-plugins
```

### Content & Documentation
Research external sources → apply thinking frameworks → document the codebase → publish.

```
youtube → mental-models → codebase-oracle → epub-packing / mermaid
```

```bash
/plugin install aio-youtube@aiocean-plugins
/plugin install aio-mental-models@aiocean-plugins
/plugin install aio-codebase-oracle@aiocean-plugins
/plugin install aio-epub-packing@aiocean-plugins
```

### Project Bootstrap
Scaffold the project → apply design system → set up parallel dev environments → add observability → learn from sessions.

```
bun-fullstack-setup → neobrutalism → worktree → monitoring-observability → reflect
```

```bash
/plugin install aio-bun-fullstack-setup@aiocean-plugins
/plugin install aio-neobrutalism@aiocean-plugins
/plugin install aio-worktree@aiocean-plugins
/plugin install aio-monitoring-observability@aiocean-plugins
/plugin install aio-reflect@aiocean-plugins
```

## License

MIT
