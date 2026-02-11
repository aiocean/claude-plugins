---
name: codebase-viz
description: |
  Interactive codebase visualization from architecture docs. Use when "visualize codebase", "codebase visualization", "interactive architecture", "architecture playground", "explore architecture visually", "shareable diagram", "codebase viz", "code map playground", or user wants to turn docs/ architecture output into interactive HTML or shareable Mermaid URLs. Works with codebase-oracle output or standalone.
---

# Codebase Viz

Turns architecture documentation into interactive, explorable visualizations. Designed to work with codebase-oracle's `docs/` output, but also works standalone by analyzing the codebase directly.

## When to Use

- User has `docs/` from codebase-oracle and wants to **explore it visually**
- User asks to **visualize** architecture, dependencies, data flow, or component relationships
- User wants **shareable diagram links** for architecture documentation
- User wants an **interactive playground** to explore and annotate codebase structure

## Input Sources (priority order)

1. **codebase-oracle docs** — Read `docs/CODEBASE_MAP.md`, `docs/c4-architecture.md`, `docs/dependency-graph.md`, `docs/key-flows.md`, etc. Extract Mermaid diagrams and structured data.
2. **Direct analysis** — If no `docs/` exists, suggest running codebase-oracle first. If user wants to skip, do a lightweight scan: file tree, imports, key modules.

## Output Modes

| Mode | Output | When |
|------|--------|------|
| **Playground** | Single interactive HTML file | Default — full interactive exploration |
| **Shareable** | Mimaid URLs for each diagram | User wants to share or embed diagrams |
| **Both** | HTML + URLs | User asks for both, or "visualize everything" |

Default: **Playground** unless user explicitly asks for shareable links.

## Mode 1: Interactive Playground

Generate a self-contained HTML file with:

### Layout

```
+-------------------+----------------------------------+
|                   |                                  |
|  Controls:        |  SVG Canvas                      |
|  • View presets   |  (nodes + connections)           |
|  • Layer toggles  |  with zoom/pan controls          |
|  • Connection     |                                  |
|    type filters   |  Legend (bottom-left)            |
|  • Search         |                                  |
|  Comments (n):    +----------------------------------+
|  • Click any node |  Prompt output                   |
|    to annotate    |  [ Copy Prompt ]                 |
|                   |                                  |
+-------------------+----------------------------------+
```

### Requirements

- **Single HTML file** — inline all CSS and JS, no external dependencies
- **Live preview** — updates instantly on every control change
- **Dark theme** — system font for UI, monospace for code/paths
- **Click-to-comment** — click any node to add annotation, comments become part of prompt output
- **Prompt output** — natural language description of visible architecture + user annotations, with copy button

### Data Extraction from codebase-oracle docs

Read the `docs/` directory and extract:

**From `c4-architecture.md`:**
- System context (external actors, systems)
- Container-level components (services, apps, databases)
- Component relationships and data flows

**From `dependency-graph.md`:**
- Module dependencies and import relationships
- Hub files (high fan-in)
- Dependency clusters

**From `key-flows.md`:**
- Sequence diagram participants and message flows
- Critical execution paths

**From `data-model.md`** (if exists):
- Entities and relationships
- Database tables and foreign keys

**From `CODEBASE_MAP.md`:**
- Module guide (high-level groupings)
- Hub files list
- Technology stack

### Node and Layer Organization

Organize extracted data into layers:

| Layer | Color | Contains |
|-------|-------|----------|
| External | `#fbcfe8` (pink-200) | Third-party services, APIs, users |
| Client/UI | `#dbeafe` (blue-100) | Frontend components, pages, hooks |
| API/Server | `#fef3c7` (amber-100) | Routes, middleware, handlers |
| Core/Logic | `#dcfce7` (green-100) | Business logic, services, processors |
| Data | `#fce7f3` (pink-100) | Database, cache, models, schemas |
| Infrastructure | `#e5e7eb` (gray-200) | Config, CI/CD, deployment |

### Connection Types

| Type | Color | Style | Represents |
|------|-------|-------|------------|
| `data-flow` | `#3b82f6` (blue) | Solid | Request/response, data passing |
| `dependency` | `#6b7280` (gray) | Dotted | Import/require relationships |
| `event` | `#ef4444` (red) | Short dash | Async events, pub/sub, webhooks |
| `calls` | `#10b981` (green) | Dashed | Function/API calls |

### SVG Canvas

Use `<svg>` with dynamic nodes and paths:

- **Nodes**: Rounded rectangles with label + subtitle (file path)
- **Connections**: Curved bezier paths with arrow markers, styled by type
- **Layers**: Nodes grouped by Y-position bands
- **Zoom**: +/−/reset buttons, mouse wheel zoom
- **Pan**: Click-drag on canvas background
- **Click-to-comment**: Click node → modal with textarea → saves annotation

### View Presets

Generate 3-5 presets based on what's in the docs:

- **Full System** — all layers visible (always)
- **Data Flow** — highlight data-flow connections, dim others
- **Dependencies** — show dependency connections, hub files emphasized
- **[Custom]** — based on key-flows (e.g., "Auth Flow", "API Pipeline")

### Prompt Output

Generates a natural language description:

```
Architecture view of [PROJECT]: showing [visible layers].

Components:
- [Node Label] (path) — [role from docs]

Key relationships:
- [Node A] → [Node B]: [description]

[If user added comments:]
Annotations:
- **[Component]** (path): [user comment]
```

### State Management

```javascript
const state = {
  layers: { external: true, client: true, api: true, core: true, data: true, infra: false },
  connectionTypes: { 'data-flow': true, dependency: true, event: true, calls: true },
  zoom: 1,
  panX: 0, panY: 0,
  comments: [],
  searchQuery: '',
  activePreset: 'full-system'
};

function updateAll() {
  renderDiagram();
  updatePrompt();
}
```

### After Writing

Open the HTML file in the browser:

```bash
open <filename>.html
```

## Mode 2: Shareable Mermaid URLs

Extract each Mermaid diagram from the `docs/` files and generate a shareable mimaid URL.

### Steps

1. Read all `docs/*.md` files
2. Extract every mermaid code block (between ` ```mermaid ` and ` ``` `)
3. For each diagram, generate a mimaid URL:

```bash
bun -e "
const LZString = require('lz-string');
const code = \`<MERMAID_CODE>\`;
console.log('https://mimaid.aiocean.dev/#' + LZString.compressToEncodedURIComponent(code));
"
```

4. Present results as a table:

```markdown
| Document | Diagram | URL |
|----------|---------|-----|
| c4-architecture.md | System Context | [View](https://mimaid.aiocean.dev/#...) |
| c4-architecture.md | Container | [View](https://mimaid.aiocean.dev/#...) |
| dependency-graph.md | Module Dependencies | [View](https://mimaid.aiocean.dev/#...) |
| key-flows.md | Auth Flow | [View](https://mimaid.aiocean.dev/#...) |
| data-model.md | ERD | [View](https://mimaid.aiocean.dev/#...) |
```

### Mermaid Syntax Rules

Follow Mermaid v11 syntax:

- Use `flowchart` not `graph`
- NO markdown in Mermaid: no `**bold**`, `*italic*`, `[links](url)`, `` `code` ``
- Use v11 shape syntax: `A@{ shape: stadium, label: "Terminal" }`
- Use `style` for emphasis: `style A fill:#ff6b6b,stroke:#c92a2a,color:#fff`
- Available shapes: `rect`, `rounded`, `stadium`, `diamond`, `hex`, `cyl`, `doc`, `docs`, `delay`, `trap-t`, `trap-b`, `fork`, `cloud`, `odd`

## Workflow

### Step 1: Check for codebase-oracle output

```bash
ls docs/CODEBASE_MAP.md 2>/dev/null
```

- **If exists**: Read docs, extract data, proceed to visualization
- **If not**: Tell user: "No architecture docs found. Run codebase-oracle first for best results, or I can do a lightweight scan." If user wants to proceed without oracle, do a quick file tree + import scan.

### Step 2: Determine output mode

- Default: Playground
- If user mentions "share", "link", "URL", "embed": Shareable
- If user mentions "everything", "all", "both": Both

### Step 3: Extract architecture data

Read each doc file and parse:

1. Mermaid code blocks → diagram data
2. Tables → structured relationships
3. Headers + bullet points → component descriptions
4. Hub files → emphasized nodes
5. File paths → node subtitles

### Step 4: Generate output

**Playground mode:**
1. Map extracted data to nodes, connections, layers
2. Generate the HTML file following the layout and requirements above
3. Open in browser

**Shareable mode:**
1. Extract all Mermaid blocks
2. Generate mimaid URLs for each
3. Present the URL table

**Both mode:**
1. Do both of the above

## Collaboration with codebase-oracle

This skill is designed as the **visualization layer** for codebase-oracle's analysis:

```
codebase-oracle (analyze) → docs/ (Mermaid + markdown) → codebase-viz (visualize)
```

- codebase-oracle owns **analysis**: scanning, detection, evidence gathering, template filling
- codebase-viz owns **visualization**: interactive HTML, shareable URLs, explorable diagrams
- The `docs/` directory is the **contract** between them

When both are installed, the recommended workflow is:
1. Run codebase-oracle to analyze and document the codebase
2. Run codebase-viz to make those docs interactive and shareable

## Rules

ALWAYS:
- Check for existing `docs/` before doing any analysis
- Extract real data from docs — never invent components
- Generate single-file HTML with zero external dependencies
- Include zoom, pan, layer toggles, and search in playgrounds
- Use click-to-comment for user annotations
- Generate prompt output that's useful as a standalone description
- Open HTML files in browser after creation
- Use Mermaid v11 syntax for shareable diagrams
- Use LZ-String compression for mimaid URLs

NEVER:
- Generate visualizations with fake/placeholder data
- Use external CDN dependencies in playground HTML
- Skip extracting from codebase-oracle docs when they exist
- Use markdown syntax inside Mermaid code blocks
- Generate URLs without testing the Mermaid syntax validity
- Create visualizations without understanding what the codebase actually contains
