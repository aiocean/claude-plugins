---
name: codebase-viz
description: |
  Interactive codebase visualization from architecture docs. Use when "visualize codebase", "codebase visualization", "interactive architecture", "architecture playground", "explore architecture visually", "shareable diagram", "codebase viz", "code map playground", or user wants to turn docs/ architecture output into interactive HTML or shareable Mermaid URLs. Works with codebase-oracle output or standalone.
---

# Codebase Viz

Turns architecture documentation into a multi-tab interactive documentation viewer. Designed to work with codebase-oracle's `docs/` output, but also works standalone by analyzing the codebase directly.

## When to Use

- User has `docs/` from codebase-oracle and wants to **explore it visually**
- User asks to **visualize** architecture, dependencies, data flow, or component relationships
- User wants **shareable diagram links** for architecture documentation
- User wants an **interactive playground** to explore and annotate codebase structure

## Input Sources (priority order)

1. **codebase-oracle docs** — Read ALL docs: `docs/CODEBASE_MAP.md`, `docs/c4-architecture.md`, `docs/dependency-graph.md`, `docs/key-flows.md`, `docs/infrastructure.md`, `docs/product-requirements.md`, etc. Extract Mermaid diagrams, tables, structured data.
2. **Direct analysis** — If no `docs/` exists, suggest running codebase-oracle first. If user wants to skip, do a lightweight scan: file tree, imports, key modules.

## Output Modes

| Mode | Output | When |
|------|--------|------|
| **Playground** | Single interactive HTML file with 5 tabs | Default — full interactive exploration |
| **Shareable** | Mimaid URLs for each diagram | User wants to share or embed diagrams |
| **Both** | HTML + URLs | User asks for both, or "visualize everything" |

Default: **Playground** unless user explicitly asks for shareable links.

## Mode 1: Interactive Playground (Multi-Tab Documentation Viewer)

**Template**: Use `~/.claude/skills/codebase-viz/references/template.html` as the base template. Copy the HTML structure, CSS, and JS patterns — then replace the data (nodes, edges, tab content) with data extracted from the target project's `docs/`.

Generate a self-contained HTML file with **5 tabs**, each presenting a different perspective of the codebase. The key insight: codebase-oracle generates multiple doc files with different perspectives — the playground should reflect ALL of them, not just one graph view.

### Top Bar Layout

```
+-------------------------------------------------------------------+
|  ProjectName  50 files · SPA                                       |
|  [Overview] [Architecture] [Dependencies] [Flows] [Modules]       |
+-------------------------------------------------------------------+
|                                                                    |
|  Tab content fills remaining viewport height                       |
|                                                                    |
+-------------------------------------------------------------------+
```

### Tab 1: Overview

**Source**: `CODEBASE_MAP.md`, `infrastructure.md`, `product-requirements.md`

Scrollable page with sections:

1. **Tech Stack** — Badge row showing all technologies. Use colored badges matching layer colors (blue for client, green for core, violet for external, etc.)
2. **Key Metrics** — Grid of metric cards (file count, hub count, layer count, provider count, flow count, violations). Large numbers with small labels.
3. **Hub Files** — Table with columns: File, Dependents, Stability, Risk (color-coded: green/amber/red), Role
4. **Conventions** — Bullet list with blue dot + description. Extract from CODEBASE_MAP.md conventions section.
5. **Gotchas** — Warning cards with amber border. Extract from CODEBASE_MAP.md gotchas section.

### Tab 2: Architecture (Interactive Graph)

**Source**: `c4-architecture.md`, `CODEBASE_MAP.md`

This is the interactive SVG graph view with sidebar controls:

```
+-------------------+----------------------------------+
|                   |                                  |
|  Controls:        |  SVG Canvas                      |
|  • View presets   |  (nodes + connections)           |
|  • Layer toggles  |  with zoom/pan controls          |
|  • Connection     |                                  |
|    type filters   |  Legend (bottom-right)            |
|  • Search         |                                  |
|  Annotations (n): +----------------------------------+
|  • Click any node |  Prompt output                   |
|    to annotate    |  [ Copy ]                        |
|                   |                                  |
+-------------------+----------------------------------+
```

See "Architecture Tab Specifications" section below for full details.

### Tab 3: Dependencies

**Source**: `dependency-graph.md`

**CRITICAL**: The Dependencies tab MUST provide **actionable insights**, not decorative charts. Focus on what developers need to know: "What happens if I change this file?"

Sections (in order):

1. **Dependency Diagram** — D3 force-directed graph at top (450px height):
   - Shows only internal modules (no external APIs)
   - Arrow markers on edges show direction (who imports whom)
   - Hub nodes larger with "HUB" badge
   - Edges: opacity 60%, color #888 (gray) with arrowheads
   - Lazy-initialized on first tab switch

2. **Change Impact Analysis** — Table with insights:
   - Columns: Module, Affected Files If Changed, Risk Level, Recommendation
   - For each module: list EXACTLY which files are affected
   - Risk levels: Low (green), Medium (amber), High (red)
   - Recommendations: what to do when modifying each file

3. **Coupling Analysis** — 3-column card grid:
   - Main Entry Point (✓) - shows import count, notes if acceptable
   - Feature Modules (✓) - ai-handler.ts, collaboration.ts - shows isolation status
   - Hub Coupling (!) - files with many dependents, warnings

4. **Dependency Health** — Single grade + breakdown:
   - Overall grade (A/B/C/D/F) with large circular badge
   - Breakdown: Acyclic, Layered, Hubs, Coupling
   - "What This Means" section with actionable:
     - Safe to modify: [list]
     - Plan changes for: [list]
     - Test thoroughly: [list]

**NEVER include**: Decorative charts without actionable insights (heatmaps, scatter plots, circular dependency rings with no context).

### Tab 4: Flows

**Source**: `key-flows.md`

**CRITICAL**: Flows MUST be visualized as **Mermaid flow diagrams** with Gherkin-style labels (GIVEN/WHEN/THEN), NOT text-based cards.

Each flow is a `.flow-section` containing:

1. **Header** — Flow name + file reference (e.g., `main.ts:85-102`)
2. **Gherkin Labels Bar** — One-line bar with colored labels:
   - `<span class="gherkin-label gherkin-given">GIVEN</span>` — Violet border, describes preconditions
   - `<span class="gherkin-label gherkin-when">WHEN</span>` — Blue border, describes trigger
   - `<span class="gherkin-label gherkin-then">THEN</span>` — Green border, describes outcome
3. **Mermaid Flowchart** — Embedded `<pre class="mermaid-flow">` block with Mermaid flowchart syntax

**Mermaid Flowchart Requirements**:
- Use `flowchart LR` or `flowchart TD` for left-to-right or top-down flows
- Nodes: Use descriptive labels, not generic "Step 1", "Step 2"
- Subgraphs: Group related steps (e.g., `subgraph INIT ["Initialization Sequence"]`)
- Styling: Use dark colors matching theme (`#161616`, `#1c1528`, `#131c2e`, `#132013`)
- Edge labels: Use arrow labels for data flow (`-->"Chunk"|`)

**CSS Classes Required**:
```css
.flow-section { background:#161616; border:1px solid #2a2a2a; border-radius:10px; padding:20px; margin-bottom:16px }
.flow-gherkin { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:16px; padding:12px; background:#0c0c0c; border-radius:6px; border:1px solid #1a1a1a }
.gherkin-label { padding:4px 10px; font-size:10px; font-weight:600; border-radius:4px; text-transform:uppercase; letter-spacing:1px }
.gherkin-label.gherkin-given { background:#1c1528; color:#a78bfa; border:1px solid #5b21b6 }
.gherkin-label.gherkin-when { background:#131c2e; color:#60a5fa; border:1px solid #1e40af }
.gherkin-label.gherkin-then { background:#132013; color:#4ade80; border:1px solid #166534 }
.mermaid-flow { background:#0c0c0c; border:1px solid #1a1a1a; border-radius:8px; padding:16px; display:block }
```

**JavaScript Required**:
- Add Mermaid.js v11 CDN: `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`
- Initialize mermaid with dark theme config when flows tab is first opened
- Render all `.mermaid-flow` blocks using `mermaid.render()`

**Example Flow Structure**:
```
<div class="flow-section">
    <div class="flow-header">
        <div class="flow-title">Application Initialization</div>
        <div class="flow-meta">main.ts:85-102</div>
    </div>
    <div class="flow-gherkin">
        <span class="gherkin-label gherkin-given">GIVEN</span> Browser loads index.html
    </div>
    <pre class="mermaid-flow">flowchart LR
    User[("User")] --> Load[("Browser loads main.ts")]
    Load --> DOM["initializeDOM() - Cache element refs"]
    ...
    style Load fill:#1c1528,stroke:#a78bfa,stroke-width:2px
    style Done fill:#132013,stroke:#4ade80,stroke-width:2px</pre>
</div>
```

Extract flows from sequence diagrams and flow descriptions in `key-flows.md`. Typically 4-8 flows.

### Tab 5: Modules

**Source**: `CODEBASE_MAP.md`, `dependency-graph.md`, `infrastructure.md`

Scrollable page with sections:

1. **Directory Structure** — Monospace tree view with color coding:
   - Directories in blue (`#60a5fa`)
   - Hub files in violet+bold (`#a78bfa`)
   - Regular files in gray (`#888`)
   - **CSS requirement**: `.dir-tree { white-space: pre; }` — CRITICAL for tree character alignment (├──, │, └──)
2. **Module Guide** — Card grid with each module. Each card has: name, layer badge (colored), file path, description, dependencies list
3. **Navigation Guide** — 2-column grid of task cards. Each shows a common task ("Add new AI provider", "Fix rendering bug") and which files to start with
4. **Environment Variables** — Table from `infrastructure.md` with columns: Variable, Required, Description

## Graph Layout — D3.js Force Simulation

**CRITICAL**: Use D3.js (`d3.v7.min.js` from CDN) for ALL graph layouts. NEVER manually position nodes with hardcoded x,y coordinates — this doesn't scale and looks bad.

Add CDN: `<script src="https://d3js.org/d3.v7.min.js"></script>`

### D3 Force Configuration

Both Architecture and Dependencies graphs use `d3.forceSimulation()`:

```javascript
const sim = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).id(d => d.id).distance(120).strength(0.3))
  .force('charge', d3.forceManyBody().strength(-400))
  .force('center', d3.forceCenter(width/2, height/2))
  .force('y', d3.forceY(d => LAYERS[d.layer].y).strength(0.3))  // layer gravity
  .force('collide', d3.forceCollide(90));
```

Key forces:
- **forceLink**: connects edges, distance ~120, strength 0.3
- **forceManyBody**: repulsion, charge -400 (arch) / -300 (deps)
- **forceCenter**: keeps graph centered
- **forceY**: pushes nodes toward their layer's y position (strength 0.3) — preserves layered structure without hardcoding
- **forceCollide**: prevents overlap, radius 90 (arch) / 70 (deps)

### D3 Drag & Zoom

Use D3's built-in behaviors instead of custom implementations:

```javascript
// Zoom
const zoom = d3.zoom().scaleExtent([0.3, 4]).on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);

// Drag
const drag = d3.drag()
  .on('start', (e,d) => { if(!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
  .on('drag', (e,d) => { d.fx=e.x; d.fy=e.y; })
  .on('end', (e,d) => { if(!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; });
```

### On Tick

Update node positions and edge paths on each simulation tick:

```javascript
sim.on('tick', () => {
  edgePaths.attr('d', d => curvePath(d.source, d.target));
  nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
});
```

## Architecture Tab Specifications

### Visual Design

**Theme**: Near-black background (`#0c0c0c`), subtle panels (`#161616`), thin borders (`#2a2a2a`).

**Node Design** — Dark fills with colored borders:
- Regular: 140x40, border-radius 8px, 1px stroke
- Hub: 160x48, 2px stroke, "HUB" badge
- Label color: layer accent color (NOT black/white)
- Sublabel: accent at 40% opacity, monospace 9px

**Layer Colors**:

| Layer | Accent | Dark BG | Contains |
|-------|--------|---------|----------|
| External | `#a78bfa` | `#1c1528` | APIs, services, users |
| Client/UI | `#60a5fa` | `#131c2e` | Frontend, pages, hooks |
| API/Server | `#fbbf24` | `#1f1a0f` | Routes, middleware |
| Core/Logic | `#4ade80` | `#132013` | Business logic, services |
| Data | `#f472b6` | `#1f1320` | Database, cache, models |
| Infrastructure | `#94a3b8` | `#181818` | Config, CI/CD |

Reuse these colors across ALL tabs.

**NEVER use pastel fills on dark backgrounds.**

### Interaction

- **Hover**: hovered + connected nodes stay visible, others dim to 8%, connected edges brighten to 90%, labels appear on highlighted edges only. Must properly reset on mouseout.
- **Drag**: D3 drag with force simulation restart
- **Zoom/Pan**: D3 zoom behavior

### Connection Types

| Type | Color | Dash | Width |
|------|-------|------|-------|
| `data-flow` | `#3b82f6` | Solid | 2px |
| `dependency` | `#525252` | `6,4` | 1.5px |
| `event` | `#ef4444` | `3,4` | 1.5px |
| `calls` | `#10b981` | `8,4` | 1.5px |

Default edge opacity: 35%.

### Sidebar Controls

Width: 260px. Presets, layer toggles, connection toggles, search, annotations. When filters change, rebuild the simulation with only visible nodes/edges.

### Prompt Output

Bottom panel (140px) with copyable architecture description.

## Dependencies Tab — Dependency Graph

The Dependencies tab shows a **D3 force-directed dependency diagram** at the top (450px height), followed by actionable insight sections below.

### Dependency Graph Specifications

- **Arrow markers**: Use `marker-end="url(#arrow)"` on paths, arrow points FROM importer TO imported
- **Arrow visibility**: Full opacity (1.0), color #888, size 8x6px
- **Edge opacity**: 60% (NOT 40% - arrows need to be visible)
- **Hub nodes**: Larger with "HUB" badge, violet border
- **Hover effect**: Highlight connected nodes/edges, dim others to 15%
- **Layer legend**: Bottom-right corner with layer colors

### Arrow Marker Setup

```javascript
defs.append('marker')
    .attr('id', 'arrow')
    .attr('markerWidth', 8)
    .attr('markerHeight', 6)
    .attr('refX', 7)
    .attr('refY', 3)
    .attr('orient', 'auto')
    .append('polygon')
    .attr('points', '0 0,8 3,0 6')
    .attr('fill', '#888')
    .attr('opacity', 1);

// Usage on edges:
path.attr('marker-end', 'url(#arrow)');
```

**CRITICAL**: Arrows MUST be visible. If arrows aren't showing direction clearly, increase opacity and contrast.

## Global CSS Design System

All tabs share these styles. Build the CSS once and reuse across tabs:

```
Theme:     #0c0c0c body, #161616 panels/cards, #2a2a2a borders
Text:      #e5e5e5 titles, #999 body, #888 secondary, #666 muted, #555 labels
Font:      system-ui sans-serif for UI, 'SF Mono' monospace for code/paths
Cards:     #161616 bg, 1px #2a2a2a border, 10px radius, 16px padding
Tables:    10px uppercase headers in #555, #1a1a1a row borders, hover row bg
Badges:    #1a1a1a bg, colored border+text matching layer colors, 20px radius
Metrics:   22px bold number, 11px muted label below
Sections:  11px uppercase #555 title, 14px bottom margin, 36px section gap
Scrollbar: 6px width, #2a2a2a thumb, transparent track
```

## Data Extraction from codebase-oracle docs

Read ALL doc files in `docs/` and extract data for each tab:

**From `CODEBASE_MAP.md`** → Overview (tech stack, metrics, hub files, conventions, gotchas) + Modules (module guide, nav guide)

**From `c4-architecture.md`** → Architecture (nodes, layers, relationships from C4 diagrams)

**From `dependency-graph.md`** → Dependencies (layer cards, hub analysis, blast radius, import graph) + Architecture (connection data)

**From `key-flows.md`** → Flows (all flow cards with trigger, outcome, participants, steps) + Architecture (preset views)

**From `infrastructure.md`** → Overview (deployment info) + Modules (env variables, CI/CD)

**From `product-requirements.md`** → Overview (feature count) + Flows (business rules context)

**From `data-model.md`** (if exists) → Dependencies (entity relationships) + Architecture (data layer nodes)

### State Management

```javascript
const state = {
  activeTab: 'overview',
  // Architecture tab state
  layers: { external: true, client: true, core: true, infra: true, data: true },
  conns: { 'data-flow': true, dependency: true, event: true, calls: true },
  zoom: 1, panX: 0, panY: 0,
  comments: [],
  search: '',
  hoveredNode: null,
  dragging: false, dragNode: null
};
```

### Tab Switching

```javascript
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  };
});
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

- **If exists**: Read ALL docs in `docs/`, extract data for all 5 tabs, proceed to visualization
- **If not**: Tell user: "No architecture docs found. Run codebase-oracle first for best results, or I can do a lightweight scan." If user wants to proceed without oracle, do a quick file tree + import scan.

### Step 2: Determine output mode

- Default: Playground
- If user mentions "share", "link", "URL", "embed": Shareable
- If user mentions "everything", "all", "both": Both

### Step 3: Extract architecture data

Read EVERY doc file and parse for ALL tabs:

1. Mermaid code blocks → Architecture tab nodes/edges
2. Tables → Dependencies tab data, Overview hub files
3. Headers + bullet points → Module descriptions, conventions
4. Hub files → emphasized nodes + hub analysis table
5. File paths → node subtitles, directory tree
6. Sequence diagrams → Flow cards
7. Infrastructure tables → Environment variables, CI/CD info

### Step 4: Generate output

**Playground mode:**
1. Map extracted data to ALL 5 tabs
2. Generate single HTML file with tab navigation, architecture graph, and content sections
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
- codebase-viz owns **visualization**: multi-tab HTML viewer, shareable URLs, explorable diagrams
- The `docs/` directory is the **contract** between them

Each codebase-oracle doc maps to specific tabs:

| Doc File | Primary Tab | Secondary Tabs |
|----------|------------|----------------|
| `CODEBASE_MAP.md` | Overview | Modules, Architecture |
| `c4-architecture.md` | Architecture | — |
| `dependency-graph.md` | Dependencies | Architecture |
| `key-flows.md` | Flows | Architecture (presets) |
| `infrastructure.md` | Modules | Overview |
| `product-requirements.md` | Overview | Flows |
| `data-model.md` | Dependencies | Architecture |

## Rules

ALWAYS:
- Check for existing `docs/` before doing any analysis
- Extract real data from docs — never invent components
- Generate **all 5 tabs** populated with data from the corresponding doc files
- Generate single-file HTML with zero external dependencies
- Follow the visual design spec exactly (dark fills, colored borders, hover highlights, dragging)
- Use consistent layer colors across ALL tabs (badges, borders, labels)
- Use 60% opacity for dependency graph edges with arrows (arrows must be visible)
- Include hover interactions that highlight connected nodes and dim everything else
- Support node dragging for layout adjustment
- Use viewBox for zoom (NOT CSS transform)
- Include zoom, pan, layer toggles, and search in the Architecture tab
- Use click-to-comment for user annotations
- Generate prompt output that's useful as a standalone description
- Open HTML files in browser after creation
- Use Mermaid v11 syntax for shareable diagrams
- Use LZ-String compression for mimaid URLs
- Provide **actionable insights** in Dependencies tab: what changes are safe, what needs planning
- Use `white-space: pre` for `.dir-tree` CSS (tree character alignment)
- Ensure arrow markers in dependency graphs use `opacity: 1` and fill color `#888`

NEVER:
- Generate only a single graph view — always create the full 5-tab documentation viewer
- Use pastel/light fills on dark backgrounds — this creates unreadable nodes
- Use CSS transform for zoom — it makes text blurry
- Show all edge labels at once — only show on hover
- Include decorative charts without actionable insights (heatmaps, scatter plots with no context, circular dependency rings that just say "none found")
- Set dependency graph edge opacity below 60% — arrows become invisible
- Generate visualizations with fake/placeholder data
- Use external CDN dependencies in playground HTML (except D3.js, Mermaid.js which are documented)
- Skip extracting from codebase-oracle docs when they exist
- Use markdown syntax inside Mermaid code blocks
- Generate URLs without testing the Mermaid syntax validity
- Leave tabs empty — if a doc file is missing, skip that tab or show a helpful message
- Leave tabs empty — if a doc file is missing, skip that tab or show a helpful message
