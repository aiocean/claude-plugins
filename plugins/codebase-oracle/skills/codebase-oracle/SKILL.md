---
name: codebase-oracle
description: |
  Deep codebase analysis combining CodeWiki LLM-powered documentation, parallel agent team mapping, dependency/hub analysis, and evidence-based investigation. Use when "analyze codebase", "map architecture", "understand this project", "codebase oracle", "document architecture", "explore codebase", "what does this codebase do", "map this codebase", "codebase map", or exploring unfamiliar code. Automatically detects existing maps and updates incrementally.
---

# Codebase Oracle

Comprehensive architecture documentation: CodeWiki-enhanced analysis with specialized analyst teams.

**CodeWiki Integration:** When CodeWiki has generated documentation, Oracle uses those LLM-powered module docs as the foundation, then synthesizes architecture views, adds hub analysis, blast radius, and confidence tracking.

## CodeWiki ACTUAL Output Structure

**CRITICAL:** CodeWiki outputs to `docs/` (or configured output dir). There is **NO** `.codewiki-cache/` directory.

```
docs/
├── {module_name}.md         # Per-module LLM-generated documentation:
│   │                        #   - Overview, Architecture (Mermaid diagrams)
│   │                        #   - Sequence diagrams, State diagrams
│   │                        #   - Usage examples, Configuration tables
│   │                        #   - Best practices, Performance notes
│   │                        #   - Cross-references to related modules
│   │
├── module_tree.json         # Module hierarchy: {module_name: {path, components[], children{}}}
├── first_module_tree.json   # Initial clustering result (same format)
│
└── temp/                    # (optional - may be deleted)
    └── dependency_graphs/
        └── {repo}_dependency_graph.json  # Component-level dependencies
```

**What CodeWiki does NOT output to docs/:**
- ❌ `call_graph.json` - Not persisted, only used internally
- ❌ `metadata.json` - Not always generated
- ❌ `overview.md` - May not exist (module name used instead)
- ❌ `.codewiki-cache/` - This directory does NOT exist

**Fallback data sources:**
- Tree-sitter: `docs/.tree-sitter-results.json`
- Direct analysis: Grep, Glob, LSP, Read

## CodeWiki + Oracle Collaboration

| Aspect | CodeWiki | Oracle |
|--------|----------|--------|
| **Module Docs** | Deep LLM-generated per-module docs | Uses as primary source |
| **Diagrams** | Architecture, sequence, state diagrams | C4 system-level views |
| **Analysis** | Code understanding, clustering | Hub detection, blast radius |
| **Output** | `{module}.md` files | `CODEBASE_MAP.md` + structured views |

## Modes

| Mode | When | Output |
|------|------|--------|
| **Full Map** | New codebase, "map this codebase" | `docs/` with architecture docs |
| **Investigate** | Targeted questions | Findings with confidence |
| **Impact** | Before changes, "what breaks?" | Dependency graph + blast radius |

## Output Structure

```
docs/
├── CODEBASE_MAP.md              # Index — links to all docs
├── c4-architecture.md           # C4 Context + Container + Component
├── key-flows.md                 # Sequence diagrams
├── dependency-graph.md          # Hub analysis, blast radius
├── data-model.md                # (if applicable) ERD, schemas
├── api-surface.md               # (if applicable) Routes, endpoints
├── infrastructure.md            # (if applicable) Deployment, CI/CD
│
│  # CodeWiki outputs (used as source):
├── {module}.md                  # Module documentation
├── module_tree.json             # Module structure
└── temp/dependency_graphs/      # (optional) Dependency analysis
```

## Templates

Templates in `${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/templates/`.

| Template | Analyst | Always Generated |
|----------|---------|-----------------|
| `CODEBASE_MAP.md` | structure-analyst | Yes |
| `c4-architecture.md` | structure-analyst | Yes |
| `key-flows.md` | flow-analyst | Yes |
| `dependency-graph.md` | structure-analyst | Yes |
| `data-model.md` | data-analyst | No |
| `api-surface.md` | flow-analyst | No |
| `infrastructure.md` | infra-analyst | No |

## Detection Rules

| Document | Generate When |
|----------|--------------|
| `CODEBASE_MAP.md` | Always |
| `c4-architecture.md` | Always |
| `key-flows.md` | Always |
| `dependency-graph.md` | Always |
| `data-model.md` | Models/schemas/ORM found |
| `api-surface.md` | Routes/APIs/CLI found |
| `infrastructure.md` | Docker/CI/k8s found |

## Analyst Team

| Teammate | Focus | CodeWiki Sources |
|----------|-------|------------------|
| **structure-analyst** | Architecture, deps | `module_tree.json`, `{module}.md` |
| **data-analyst** | Data models | Entity sections in module docs |
| **flow-analyst** | Execution paths | Sequence diagrams in module docs |
| **infra-analyst** | Deployment | Config sections in module docs |

**Scaling:**
- Small (<30 files): 2-3 teammates
- Medium (30-200): All 4
- Large (200+): 4+ with extra structure-analysts

## Confidence Tracking

| Bar | Lvl | Confidence |
|-----|-----|------------|
| `░░░░░` | 0 | 0-19% |
| `▓░░░░` | 1 | 20-39% |
| `▓▓░░░` | 2 | 40-59% |
| `▓▓▓░░` | 3 | 60-74% |
| `▓▓▓▓░` | 4 | 75-89% |
| `▓▓▓▓▓` | 5 | 90-100% |

**CodeWiki docs = +1 confidence boost**

## Evidence Priority

1. **CodeWiki module docs** — `{module}.md` with LLM content
2. **CodeWiki module_tree.json** — Module hierarchy
3. **Direct observation** — Code analysis
4. **Tests** — Behavior verification
5. **History** — Git history
6. **Inference** — Logical deduction

## Workflow: Full Map Mode

### Phase 0: Check CodeWiki

```bash
# Check for CodeWiki output (in docs/, NOT .codewiki-cache/)
ls docs/*.md docs/module_tree.json 2>/dev/null

# Read module tree
cat docs/module_tree.json | python3 -c "
import json, sys
def print_tree(tree, indent=0):
    for name, data in tree.items():
        comps = data.get('components', [])
        print('  ' * indent + f'{name}/ ({len(comps)} components)')
        if data.get('children'):
            print_tree(data['children'], indent + 1)
print_tree(json.load(sys.stdin))
"

# Check for dependency graph (optional, in temp/)
ls docs/temp/dependency_graphs/*.json 2>/dev/null
```

**If no CodeWiki, optionally run:**

```bash
codewiki generate --output docs/
```

### Phase 1: Scan

```bash
# Check existing map
ls docs/CODEBASE_MAP.md 2>/dev/null

# Scan codebase
uv run ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/scan-codebase.py . --format json

# If no CodeWiki, run Tree-sitter
uv run ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/scripts/tree-sitter-analyze.py . --format json > docs/.tree-sitter-results.json
```

### Phase 2: Analyze

1. `TeamCreate` with analyst team
2. `TaskCreate` for each analyst
3. **Delegate mode** - lead coordinates only

**Analyst prompt:**

```
You are the [ROLE]-analyst.

1. Read template at ${CLAUDE_PLUGIN_ROOT}/skills/codebase-oracle/templates/[TEMPLATE].md
2. CHECK CODEWIKI DOCS FIRST (in docs/, NOT .codewiki-cache/):
   - docs/module_tree.json for structure
   - docs/{module}.md for module documentation
   - docs/temp/dependency_graphs/*.json for dependencies (may not exist)
3. Extract diagrams from CodeWiki module docs
4. For missing data, use Grep/Glob/LSP/Read
5. Write to docs/[TEMPLATE].md

CodeWiki ACTUAL locations:
- Module docs: docs/{module_name}.md
- Module tree: docs/module_tree.json
- Dependency graph: docs/temp/dependency_graphs/ (may not exist)

NOT AVAILABLE (do not look for):
- .codewiki-cache/ (does not exist)
- call_graph.json (not output)
- metadata.json (not always generated)

Cite sources: "From CodeWiki: ..." or "Analysis: ..."
Flag uncertainties with △
```

### Phase 3: Synthesize

1. Read filled templates
2. Read CodeWiki module docs
3. Fill `CODEBASE_MAP.md`:
   - Overview from module docs
   - Module Guide from module_tree.json
   - Hub analysis from dependency data
4. Set timestamp and analysis method

## Hub Detection

**From module_tree.json:**

```bash
cat docs/module_tree.json | python3 -c "
import json, sys
from collections import Counter
tree = json.load(sys.stdin)
component_refs = Counter()

def count_refs(node):
    for name, data in node.items():
        for comp in data.get('components', []):
            component_refs[comp] += 1
        if data.get('children'):
            count_refs(data['children'])

count_refs(tree)
print('Hub components (2+ modules):')
for comp, count in component_refs.most_common(10):
    if count >= 2:
        print(f'  {comp}: {count} modules')
"
```

**From dependency_graph (if exists):**

```bash
cat docs/temp/dependency_graphs/*.json | python3 -c "
import json, sys
from collections import Counter
data = json.load(sys.stdin)
dependents = Counter()

# Format: {component_id: {depends_on: [...]}}
for comp_id, comp_data in data.items():
    for dep in comp_data.get('depends_on', []):
        dependents[dep] += 1

print('Hub files (5+ dependents):')
for comp, count in dependents.most_common(10):
    if count >= 5:
        print(f'  {comp}: {count} dependents')
"
```

## Rules

ALWAYS:
- Check `docs/` for CodeWiki output
- Read `docs/{module}.md` as primary source
- Use `docs/module_tree.json` for structure
- Check `docs/temp/dependency_graphs/` (may not exist)
- Cite sources
- Clean up team

NEVER:
- Reference `.codewiki-cache/` - does not exist
- Expect `call_graph.json` - not output
- Expect `metadata.json` - not always generated
- Duplicate CodeWiki content
- Leave ORACLE comments in output

## Troubleshooting

**No module_tree.json:** Run `codewiki generate --output docs/`

**No dependency graph:** Use Tree-sitter or Grep fallback

**CodeWiki not found:** `pip install git+https://github.com/FSoft-AI4Code/CodeWiki.git`
