# Dependency Graph

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the structure-analyst.
Maps module-level dependencies, identifies hubs, detects layer violations.

Primary data sources (in order of preference):
1. CodeWiki: docs/temp/dependency_graphs/*.json (if exists)
2. CodeWiki: docs/module_tree.json for module structure
3. Tree-sitter: docs/.tree-sitter-results.json (if exists)
4. Grep: fallback for import statements

IMPORTANT PATHS:
- CodeWiki output is in docs/, NOT .codewiki-cache/
- Dependency graph: docs/temp/dependency_graphs/{repo}_dependency_graph.json
- Module tree: docs/module_tree.json
- call_graph.json does NOT exist - use Tree-sitter or LSP instead

CodeWiki dependency_graph format (ACTUAL):
{
  "component.id": {
    "id": "...",
    "name": "...",
    "depends_on": ["other.component.id", ...],
    "file_path": "...",
    ...
  }
}
It's a flat dict keyed by component ID, NOT a graph with nodes/edges arrays.

CodeWiki module_tree.json format:
{
  "ModuleName": {
    "path": "path/to/module",
    "components": ["fully.qualified.ComponentName", ...],
    "children": { ... }
  }
}
-->

## Module Dependencies

<!-- ORACLE:DEP_GRAPH
Build a Mermaid flowchart showing how modules depend on each other.

**If CodeWiki module_tree.json exists:**
```bash
cat docs/module_tree.json | python3 -c "
import json, sys
tree = json.load(sys.stdin)
for name, data in tree.items():
    print(f'{name}:')
    print(f'  Path: {data.get(\"path\")}')
    print(f'  Components: {len(data.get(\"components\", []))}')
"
```

**If CodeWiki dependency_graph exists:**
```bash
cat docs/temp/dependency_graphs/*.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
# Format: {component_id: {depends_on: [...]}}
for comp_id, comp_data in list(data.items())[:10]:
    deps = comp_data.get('depends_on', [])
    print(f'{comp_id}: depends on {len(deps)} others')
"
```

**If Tree-sitter exists:**
```bash
cat docs/.tree-sitter-results.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for edge in data.get('import_graph', {}).get('edges', [])[:10]:
    print(f\"{edge['from']} -> {edge['to']}\")
"
```

Flowchart syntax:
```
flowchart TD
    subgraph LayerName["Display Name"]
        ModuleId[Module Name]
    end
    ModuleA --> ModuleB
    HubModule[Hub Name]:::hub
    classDef hub fill:#ff6b6b,stroke:#c92a2a,color:#fff
```
-->

```mermaid
flowchart TD
    REPLACE_SUBGRAPHS
    REPLACE_EDGES
    classDef hub fill:#ff6b6b,stroke:#c92a2a,color:#fff
```

## Hub Analysis

<!-- ORACLE:HUB_ANALYSIS
For each hub file (5+ dependents), document:
- Dependents: how many files import it
- Stability: how frequently it changes
- Risk: Low/Medium/High/Critical

**From CodeWiki module_tree.json (count component references):**
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

**From CodeWiki dependency_graph (if exists):**
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

**From Tree-sitter:** Use `hubs` array from `.tree-sitter-results.json`

**Check stability:** `git log --oneline --since="6 months ago" <file> | wc -l`
-->

| File | Dependents | Recent Changes (6mo) | Stability | Risk |
|------|-----------|---------------------|-----------|------|
| REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |

## Layer Violations

<!-- ORACLE:VIOLATIONS
A layer violation occurs when a lower layer imports a higher layer.
From the dependency graph, check each edge direction.
If none found, write "No layer violations detected."
-->

REPLACE: violations found, or "No layer violations detected."

## Blast Radius

<!-- ORACLE:BLAST_RADIUS
For each hub, describe what would break if it changed.
Trace 2 levels deep:
1. Direct dependents (files that import the hub)
2. Indirect dependents (files that import direct dependents)

Use CodeWiki module_tree.json or dependency_graph to trace.
NOTE: call_graph.json does NOT exist in CodeWiki output.

Present as a list per hub:
### hub-file.ts
- Direct: 8 files (list key ones)
- Indirect: ~15 files
- Risk: Changing exports would break all direct dependents
- Recommendation: Add tests before modifying
-->

REPLACE: blast radius analysis per hub
