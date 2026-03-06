---
name: aio-codebase-viz
description: |
  This skill should be used when the user asks to "visualize codebase", "codebase visualization", "interactive architecture", "architecture playground", "explore architecture visually", "codebase viz", or wants to turn documentation into interactive HTML. Interactive codebase visualization from CodeWiki and codebase-oracle docs with LLM-generated module documentation, diagrams, examples, and best practices.
---

# Codebase Viz

Turns documentation into a multi-tab interactive viewer. **Now integrates both CodeWiki and codebase-oracle output** - leveraging CodeWiki's rich LLM-generated module docs alongside Oracle's structural analysis.

## Input Sources (priority order)

1. **CodeWiki module docs** — `{module}.md` files with LLM-generated content: architecture diagrams, sequence diagrams, usage examples, best practices
2. **CodeWiki structure** — `module_tree.json` for hierarchy (NOTE: `metadata.json` and `overview.md` may not exist)
3. **codebase-oracle docs** — `CODEBASE_MAP.md`, `c4-architecture.md`, `dependency-graph.md`, etc. for structural analysis
4. **Direct analysis** — Fallback if no docs exist

**IMPORTANT:** CodeWiki outputs to `docs/`, NOT `.codewiki-cache/`. See actual structure below.

## Output

Single interactive HTML file with **6 tabs** for comprehensive exploration:

```
+-------------------------------------------------------------------+
|  ProjectName  50 files · CodeWiki+Oracle                          |
|  [Overview] [Architecture] [Modules] [Dependencies] [Flows] [Docs] |
+-------------------------------------------------------------------+
```

## NEW: CodeWiki Integration

### What CodeWiki ACTUALLY Provides

**NOTE:** CodeWiki outputs to `docs/`, NOT `.codewiki-cache/`. The following files may or may not exist:

```
docs/
├── {module_name}.md         # Per-module docs with:
│   ├── Architecture diagrams (Mermaid graph TB)
│   ├── Sequence diagrams (Mermaid sequenceDiagram)
│   ├── State diagrams (Mermaid stateDiagram)
│   ├── Component interactions
│   ├── Usage examples (code blocks)
│   ├── Configuration tables
│   ├── Best practices
│   └── Cross-references
├── module_tree.json         # Module hierarchy (ALWAYS present)
├── first_module_tree.json   # Initial clustering (ALWAYS present)
│
├── overview.md              # May NOT exist (module name used instead)
├── metadata.json            # May NOT exist
│
└── temp/                    # Optional, may be deleted
    └── dependency_graphs/
        └── {repo}_dependency_graph.json
```

**NOT available (do not look for):**
- ❌ `.codewiki-cache/` directory
- ❌ `call_graph.json` in output

### Data Extraction from CodeWiki

**From `overview.md`** → Overview tab (repo summary, tech stack)

**From `{module}.md` files** →
- Overview tab: Module summaries
- Modules tab: Detailed module cards with CodeWiki links
- Docs tab: Full module documentation with all diagrams
- Architecture tab: Extract Mermaid diagrams
- Flows tab: Extract sequence diagrams

**From `module_tree.json`** →
- Overview tab: Module count, component count
- Architecture tab: Node structure, hierarchy
- Modules tab: Module organization

**From `metadata.json`** →
- Overview tab: Generation timestamp, model used

## Tab Structure (6 Tabs)

### Tab 1: Overview

**Sources**: CodeWiki `overview.md`, `metadata.json`, Oracle `CODEBASE_MAP.md`

Scrollable page with sections:

1. **Project Header** — Name, file count, analysis method badge (CodeWiki+Oracle or Oracle-only)
2. **Tech Stack** — Badge row from CodeWiki overview
3. **Key Metrics** — Grid: Modules, Components, Hub Files, Flows, Test Coverage
4. **Module Summary Cards** — Grid of cards, one per module from module_tree.json:
   - Module name with link to Docs tab
   - Component count
   - Brief description from CodeWiki module doc
   - Layer badge
5. **Hub Files** — Table from Oracle dependency-graph
6. **Conventions** — From Oracle CODEBASE_MAP
7. **Gotchas** — From Oracle CODEBASE_MAP

### Tab 2: Architecture (Interactive Graph)

**Sources**: Oracle `c4-architecture.md`, CodeWiki `{module}.md` architecture sections

Same D3 force-directed graph as before, but:
- **Add "View in Docs" button** on node hover → links to Docs tab for that module
- **Extract nodes from CodeWiki** module_tree.json as additional data source
- **Show CodeWiki diagrams** in sidebar when node selected

### Tab 3: Modules

**Sources**: CodeWiki `module_tree.json` + `{module}.md`, Oracle `CODEBASE_MAP.md`

**THIS TAB NOW SHOWS CODEWIKI CONTENT:**

1. **Module Directory Tree** — From module_tree.json with links to Docs tab

2. **Module Cards Grid** — One card per module:
   ```
   +------------------------------------------+
   | Module Name                    [View Doc]|
   | Path: codewiki/src/be                     |
   | 15 components · Core layer                |
   |                                           |
   | Brief description from CodeWiki...        |
   |                                           |
   | Key Components:                           |
   | • DocumentationGenerator                  |
   | • AgentOrchestrator                       |
   | • LLMService                              |
   +------------------------------------------+
   ```

3. **Navigation Guide** — From Oracle CODEBASE_MAP

4. **Environment Variables** — From CodeWiki/Oracle infrastructure

### Tab 4: Dependencies

**Sources**: Oracle `dependency-graph.md`, CodeWiki `module_tree.json`

Same as before with:
- D3 force-directed graph
- Change Impact Analysis table
- Hub detection with links to CodeWiki module docs
- Coupling analysis

### Tab 5: Flows

**Sources**: CodeWiki `{module}.md` sequence diagrams, Oracle `key-flows.md`

**NOW PRIORITIZES CODEWIKI SEQUENCE DIAGRAMS:**

1. **CodeWiki Sequence Diagrams** — Extract from module docs:
   ```html
   <div class="flow-section">
     <div class="flow-header">
       <span class="flow-title">Documentation Generation Flow</span>
       <span class="flow-source">From: adapters.md</span>
     </div>
     <div class="flow-gherkin">
       <span class="gherkin-label gherkin-given">GIVEN</span> Repository path provided
       <span class="gherkin-label gherkin-when">WHEN</span> generate() called
       <span class="gherkin-label gherkin-then">THEN</span> Documentation created
     </div>
     <pre class="mermaid-flow">
     sequenceDiagram
         participant User
         participant CLI
         participant Backend
         ...
     </pre>
   </div>
   ```

2. **Oracle Key Flows** — As fallback/supplement

### Tab 6: Docs (NEW - CodeWiki Module Documentation)

**Sources**: CodeWiki `{module}.md` files

**THIS IS THE KEY NEW TAB** - Shows full CodeWiki module documentation:

```
+-------------------------------------------------------------------+
| Module: [Dropdown: CLI Application ▾]                             |
+-------------------------------------------------------------------+
|                                                                   |
| # CLI Application Module                                          |
|                                                                   |
| ## Overview                                                       |
| The CLI Application module serves as...                           |
|                                                                   |
| ## Architecture                                                   |
| [Mermaid diagram rendered inline]                                 |
|                                                                   |
| ## Core Components                                                |
| ### CLIDocumentationGenerator                                     |
| The centerpiece...                                                |
|                                                                   |
| ## Generation Workflow                                            |
| [Sequence diagram rendered inline]                                |
|                                                                   |
| ## Usage Examples                                                 |
| ```python                                                         |
| generator = CLIDocumentationGenerator(...)                        |
| ```                                                               |
|                                                                   |
| ## Best Practices                                                 |
| 1. Use verbose mode for debugging                                 |
|                                                                   |
| ## Related Modules                                                |
| → [job_management](#) → [utilities](#)                            |
+-------------------------------------------------------------------+
```

**Features:**
- Module dropdown selector (populated from module_tree.json)
- Full markdown rendering with syntax highlighting
- Mermaid diagrams rendered inline (architecture, sequence, state)
- Code blocks with copy button
- Cross-reference links to related modules
- "Edit in CodeWiki" note (shows source file)

## Rendering CodeWiki Content

### Mermaid Diagram Rendering

CodeWiki modules contain Mermaid diagrams that should be rendered:

```javascript
// Initialize Mermaid for Docs tab
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#0c0c0c',
    primaryColor: '#1c1528',
    primaryTextColor: '#e5e5e5',
    primaryBorderColor: '#a78bfa',
    lineColor: '#525252',
    secondaryColor: '#131c2e',
    tertiaryColor: '#132013'
  }
});

// Render all mermaid blocks in module docs
document.querySelectorAll('#docs-content pre code.language-mermaid').forEach(block => {
  mermaid.render('mermaid-' + id++, block.textContent, (svg) => {
    const div = document.createElement('div');
    div.innerHTML = svg;
    block.parentElement.replaceWith(div);
  });
});
```

### Markdown Rendering

Use marked.js for markdown:

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
  // Render module doc
  const content = marked.parse(moduleMarkdown, {
    highlight: function(code, lang) {
      if (lang === 'mermaid') return code; // Handled separately
      return hljs.highlight(code, {language: lang}).value;
    }
  });
</script>
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Input Sources                                │
├─────────────────────────────────────────────────────────────────┤
│ CodeWiki:                                                        │
│   overview.md          → Overview tab (repo summary)            │
│   {module}.md          → Docs tab (full content)                │
│                         → Flows tab (sequence diagrams)         │
│                         → Modules tab (descriptions)           │
│   module_tree.json     → All tabs (structure, navigation)      │
│   metadata.json        → Overview tab (stats)                   │
├─────────────────────────────────────────────────────────────────┤
│ Oracle:                                                          │
│   CODEBASE_MAP.md      → Overview, Modules (conventions, hubs) │
│   c4-architecture.md   → Architecture tab (C4 diagrams)        │
│   dependency-graph.md  → Dependencies tab (analysis)           │
│   key-flows.md         → Flows tab (supplement)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Output HTML                                  │
│  6 tabs: Overview | Architecture | Modules | Dependencies |    │
│         Flows | Docs                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow

### Step 1: Check for documentation

```bash
# Check for CodeWiki docs
ls docs/overview.md docs/module_tree.json docs/*.md 2>/dev/null

# Check for Oracle docs
ls docs/CODEBASE_MAP.md docs/c4-architecture.md 2>/dev/null
```

### Step 2: Load all available data

```bash
# CodeWiki data
cat docs/module_tree.json  # Module structure
cat docs/metadata.json     # Generation stats
cat docs/overview.md       # Repository overview

# List all module docs
ls docs/*.md | grep -v CODEBASE_MAP | grep -v c4 | grep -v dependency | grep -v key-flows

# Read each module doc
for f in docs/*.md; do
  echo "=== $f ==="
  head -50 "$f"
done

# Oracle data (if exists)
cat docs/CODEBASE_MAP.md
cat docs/dependency-graph.md
```

### Step 3: Extract and map data

For each tab, extract from appropriate sources:

| Tab | Primary Source | Secondary Source |
|-----|---------------|------------------|
| Overview | CodeWiki overview.md | Oracle CODEBASE_MAP |
| Architecture | Oracle c4-architecture | CodeWiki module diagrams |
| Modules | CodeWiki module_tree + {module}.md | Oracle CODEBASE_MAP |
| Dependencies | Oracle dependency-graph | CodeWiki module_tree |
| Flows | CodeWiki sequence diagrams | Oracle key-flows |
| Docs | CodeWiki {module}.md | — |

### Step 4: Generate HTML

1. Build module selector dropdown from module_tree.json
2. Include all CodeWiki module markdown in hidden divs
3. Include Mermaid.js and marked.js CDNs
4. Generate all 6 tabs with extracted data
5. Add navigation between tabs and modules
6. Open in browser

## CSS Updates for CodeWiki Content

```css
/* Docs tab specific */
.docs-module-select {
  padding: 8px 12px;
  background: #161616;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #e5e5e5;
  font-size: 13px;
  margin-bottom: 20px;
}

.docs-content {
  line-height: 1.7;
}

.docs-content h1 { font-size: 24px; margin-bottom: 16px; }
.docs-content h2 { font-size: 18px; margin: 24px 0 12px; color: #a78bfa; }
.docs-content h3 { font-size: 15px; margin: 20px 0 10px; color: #60a5fa; }
.docs-content p { margin-bottom: 16px; color: #b5b5b5; }
.docs-content ul, .docs-content ol { margin: 12px 0; padding-left: 24px; }
.docs-content li { margin-bottom: 8px; }
.docs-content code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.docs-content pre { background: #0c0c0c; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
.docs-content pre code { background: none; padding: 0; }
.docs-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
.docs-content th, .docs-content td { padding: 10px 12px; border: 1px solid #2a2a2a; text-align: left; }
.docs-content th { background: #1a1a1a; font-weight: 600; }

/* Mermaid in docs */
.docs-content .mermaid { background: #0c0c0c; padding: 20px; border-radius: 8px; margin: 16px 0; }

/* Module cross-references */
.module-ref {
  color: #60a5fa;
  text-decoration: none;
  cursor: pointer;
}
.module-ref:hover { text-decoration: underline; }

/* Related modules section */
.related-modules {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #2a2a2a;
}
.related-module-badge {
  background: #1a1a1a;
  border: 1px solid #3b82f6;
  color: #60a5fa;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
}
```

## Rules

ALWAYS:
- Check for BOTH CodeWiki and Oracle docs
- Use CodeWiki `{module}.md` as primary source for module documentation
- Create the Docs tab with full CodeWiki content
- Render Mermaid diagrams from CodeWiki inline
- Link between tabs (Architecture → Docs, Modules → Docs)
- Include CodeWiki sequence diagrams in Flows tab
- Show CodeWiki metadata (model used, timestamp) in Overview
- Provide module selector dropdown in Docs tab
- Extract and show usage examples from CodeWiki
- Include best practices and performance notes

NEVER:
- Ignore CodeWiki module docs when they exist
- Only show Oracle docs - always include CodeWiki content
- Strip out Mermaid diagrams - render them inline
- Skip the Docs tab - it's essential for CodeWiki integration
- Duplicate content between tabs - link instead
- Lose CodeWiki's LLM-generated insights

## Example Output Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>ProjectName — Codebase Documentation</title>
  <!-- Mermaid.js for diagrams -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <!-- Marked.js for markdown -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <!-- Highlight.js for code -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github-dark.min.css">
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/highlight.min.js"></script>
  <!-- D3.js for graphs -->
  <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
  <!-- Top bar with tabs -->
  <div class="topbar">
    <div class="topbar-brand">ProjectName <span>CodeWiki+Oracle</span></div>
    <div class="tab-nav">
      <button class="tab-btn active" data-tab="overview">Overview</button>
      <button class="tab-btn" data-tab="architecture">Architecture</button>
      <button class="tab-btn" data-tab="modules">Modules</button>
      <button class="tab-btn" data-tab="dependencies">Dependencies</button>
      <button class="tab-btn" data-tab="flows">Flows</button>
      <button class="tab-btn" data-tab="docs">Docs</button>
    </div>
  </div>

  <!-- Tab panels -->
  <div class="main">
    <div id="panel-overview" class="tab-panel active">...</div>
    <div id="panel-architecture" class="tab-panel">...</div>
    <div id="panel-modules" class="tab-panel">...</div>
    <div id="panel-dependencies" class="tab-panel">...</div>
    <div id="panel-flows" class="tab-panel">...</div>

    <!-- NEW: Docs panel with CodeWiki content -->
    <div id="panel-docs" class="tab-panel">
      <select class="docs-module-select" id="module-selector">
        <option value="cli-application">CLI Application</option>
        <option value="dependency-analyzer">Dependency Analyzer</option>
        <option value="agent-backend">Agent Backend</option>
        ...
      </select>
      <div class="docs-content scroll-content" id="docs-content">
        <!-- Rendered from CodeWiki {module}.md -->
      </div>
    </div>
  </div>

  <!-- Hidden module content -->
  <script type="text/template" id="module-cli-application">
    # CLI Application Module
    ... (full CodeWiki markdown)
  </script>

  <script>
    // Module selector handler
    document.getElementById('module-selector').onchange = function() {
      const content = document.getElementById('module-' + this.value).innerHTML;
      document.getElementById('docs-content').innerHTML = marked.parse(content);
      // Re-render Mermaid
      mermaid.init(undefined, '#docs-content .language-mermaid');
    };
  </script>
</body>
</html>
```
