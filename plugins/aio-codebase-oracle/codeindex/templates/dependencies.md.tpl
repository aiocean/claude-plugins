# Dependencies: {{project_name}}

> Dependency graph, metrics, and relationship analysis

## Dependency Graph

<!-- Full dependency graph visualization -->

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

## Hub Components

<!-- Components with fan_in >= threshold that serve as central coordination points -->

| Component | Fan-in | Fan-out | Is Stable? | Module |
|-----------|--------|---------|------------|--------|
{{#each hubs}}
| {{name}} | {{fan_in}} | {{fan_out}} | {{is_stable}} | {{module}} |
{{/each}}

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
