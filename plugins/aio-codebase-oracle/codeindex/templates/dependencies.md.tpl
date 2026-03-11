# Dependencies: {{project_name}}

> Dependency graph, metrics, and relationship analysis

## Dependency Graph

<!-- Full dependency graph visualization -->

<!-- ORACLE:DEP_GRAPH
Build a Mermaid flowchart showing how modules depend on each other.

**From codebase_map.json communities:**
```bash
cat docs/codebase_map.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for comm in data.get('communities', []):
    print(f'{comm[\"name\"]}:')
    print(f'  Components: {comm.get(\"node_count\", 0)}')
    print(f'  Keywords: {comm.get(\"keywords\", [])}')
"
```

**From dependency_graphs/*.json:**
```bash
cat docs/dependency_graphs/*.json | python3 -c "
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
graph LR
{{dependency_graph}}
```

> Showing top {{visible_node_count}} of {{total_nodes}} nodes by PageRank. Full graph available in `graph.html`.

## Graph Statistics

| Metric | Value |
|--------|-------|
| Total Nodes | {{total_nodes}} |
| Total Edges | {{total_edges}} |
| Graph Density | {{graph_density}} |
| Avg Degree | {{avg_degree}} |
| Max Fan-in | {{max_fan_in}} ({{max_fan_in_component}}) |
| Max Fan-out | {{max_fan_out}} ({{max_fan_out_component}}) |
| Connected Components | {{connected_components}} |

## Most Important Components (by PageRank)

<!-- Components with highest influence in the dependency graph -->

| Rank | Component | PageRank | Fan-in | Fan-out | Module | File |
|------|-----------|----------|--------|---------|--------|------|
{{#each top_pagerank}}
| {{rank}} | {{name}} | {{pagerank}} | {{fan_in}} | {{fan_out}} | {{module}} | `{{file_path}}` |
{{/each}}

## Hub Analysis

<!-- ORACLE:HUB_ANALYSIS
For each hub file (5+ dependents), document:
- Dependents: how many files import it
- Stability: how frequently it changes
- Risk: Low/Medium/High/Critical

**From codebase_map.json nodes (find high fan-in components):**
```bash
cat docs/codebase_map.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
nodes = data.get('nodes', [])
hubs = sorted(
    [n for n in nodes if n.get('fan_in', 0) >= 5],
    key=lambda n: n.get('fan_in', 0),
    reverse=True
)[:10]
for h in hubs:
    print(f'{h[\"name\"]}: fan_in={h.get(\"fan_in\",0)}, fan_out={h.get(\"fan_out\",0)}')
"
```

**From dependency_graphs/*.json (if exists):**
```bash
cat docs/dependency_graphs/*.json | python3 -c "
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

<!-- Components with fan_in >= threshold that serve as central coordination points -->

| Component | Fan-in | Fan-out | Is Stable? | Module |
|-----------|--------|---------|------------|--------|
{{#each hubs}}
| {{name}} | {{fan_in}} | {{fan_out}} | {{is_stable}} | {{module}} |
{{/each}}

## Bottleneck Components (by Betweenness Centrality)

<!-- Components that act as bridges between different parts of the codebase -->

| Component | Betweenness | Fan-in | Module | Risk |
|-----------|-------------|--------|--------|------|
{{#each bottlenecks}}
| {{name}} | {{betweenness}} | {{fan_in}} | {{module}} | {{risk_level}} |
{{/each}}

> Components with high betweenness are critical bridges. Changes to these affect many parts of the codebase.

## Instability Analysis

<!-- Robert C. Martin's instability metric: fan_out / (fan_in + fan_out) -->

### Most Unstable (close to 1.0 — depends on many, depended by few)

| Component | Instability | Fan-in | Fan-out | Assessment |
|-----------|-------------|--------|---------|------------|
{{#each most_unstable}}
| {{name}} | {{instability}} | {{fan_in}} | {{fan_out}} | {{assessment}} |
{{/each}}

### Most Stable (close to 0.0 — depended by many, depends on few)

| Component | Instability | Fan-in | Fan-out | Assessment |
|-----------|-------------|--------|---------|------------|
{{#each most_stable}}
| {{name}} | {{instability}} | {{fan_in}} | {{fan_out}} | {{assessment}} |
{{/each}}

## Circular Dependencies

{{#if circular_deps}}
**{{circular_dep_count}} circular dependency chains detected.**

{{#each circular_deps}}
### Cycle {{index}}

```mermaid
graph LR
{{cycle_diagram}}
```

| Component | File |
|-----------|------|
{{#each components}}
| {{name}} | `{{file_path}}` |
{{/each}}

**Impact**: {{impact}}
**Suggested fix**: {{suggestion}}

{{/each}}
{{/if}}

{{#if no_circular_deps}}
No circular dependencies detected.
{{/if}}

## Temporal Coupling

<!-- Components that change together frequently based on git history -->

{{#if temporal_couplings}}
| File A | File B | Coupling Score | Shared Commits | Has Code Dep? |
|--------|--------|----------------|----------------|---------------|
{{#each temporal_couplings}}
| `{{file_a}}` | `{{file_b}}` | {{score}} | {{shared_commits}} | {{has_code_dep}} |
{{/each}}

> Temporal coupling > 0.7 without code dependency = **hidden coupling** (architectural smell).
{{/if}}

{{#if no_temporal_coupling}}
No significant temporal coupling detected (or git history unavailable).
{{/if}}

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

Use codebase_map.json edges and dependency_graphs/*.json to trace.

Present as a list per hub:
### hub-file.ts
- Direct: 8 files (list key ones)
- Indirect: ~15 files
- Risk: Changing exports would break all direct dependents
- Recommendation: Add tests before modifying
-->

REPLACE: blast radius analysis per hub

## Orphan Components

<!-- Components with no incoming or outgoing dependencies -->

{{#if orphans}}
| Component | File | Possible Reason |
|-----------|------|-----------------|
{{#each orphans}}
| {{name}} | `{{file_path}}` | {{reason}} |
{{/each}}
{{/if}}

{{#if no_orphans}}
No orphan components detected.
{{/if}}
