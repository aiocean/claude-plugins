# Codebase Viz

Interactive visualization layer for codebase-oracle. Turns architecture documentation into explorable HTML playgrounds and shareable Mermaid diagram URLs.

## How It Works

```
codebase-oracle (analyze) → docs/ (Mermaid + markdown) → codebase-viz (visualize)
```

1. Run `codebase-oracle` to analyze and document a codebase
2. Run `codebase-viz` to make those docs interactive and shareable

Also works standalone by scanning the codebase directly.

## Output Modes

| Mode | Output | Trigger |
|------|--------|---------|
| **Playground** | Single interactive HTML file | Default |
| **Shareable** | Mimaid URLs for each diagram | "share", "link", "URL" |
| **Both** | HTML + URLs | "everything", "all", "both" |

## Playground Features

- SVG canvas with architecture nodes and connections
- Layer toggles (External, Client, API, Core, Data, Infrastructure)
- Connection type filters (data-flow, dependency, event, calls)
- Zoom, pan, and search
- Click-to-comment on any component
- Prompt output with copy button
- View presets (Full System, Data Flow, Dependencies)
- Dark theme, zero external dependencies

## Shareable Diagrams

Extracts every Mermaid diagram from `docs/` and generates shareable URLs via [mimaid](https://mimaid.aiocean.dev/).

## Install

```bash
/plugin install codebase-viz@aiocean-plugins
```
