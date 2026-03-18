# {{component_name}}

> {{component_type}} in [{{module_name}}](../modules/{{module_slug}}.md) | `{{file_path}}:{{start_line}}-{{end_line}}`

## Signature

```{{language}}
{{signature}}
```

{{#if docstring}}
## Documentation

{{docstring}}
{{/if}}

{{#if parameters}}
## Parameters

| Name | Type | Description |
|------|------|-------------|
{{#each parameters}}
| `{{name}}` | `{{type}}` | {{description}} |
{{/each}}
{{/if}}

{{#if base_classes}}
## Inheritance

```mermaid
graph BT
{{inheritance_diagram}}
```

**Extends**: {{base_classes}}
{{/if}}

{{#if implements_interfaces}}
## Implements

{{#each implements_interfaces}}
- `{{interface_name}}`
{{/each}}
{{/if}}

## Metrics

| Metric | Value | Interpretation |
|--------|-------|----------------|
| PageRank | {{pagerank}} | {{pagerank_interpretation}} |
| Fan-in | {{fan_in}} | {{fan_in_interpretation}} |
| Fan-out | {{fan_out}} | {{fan_out_interpretation}} |
| Instability | {{instability}} | {{instability_interpretation}} |
| Cyclomatic Complexity | {{cyclomatic_complexity}} | {{cc_interpretation}} |
| Cognitive Complexity | {{cognitive_complexity}} | {{cog_interpretation}} |
| Maintainability Index | {{maintainability_index}} | {{mi_interpretation}} |
| Lines of Code | {{nloc}} | — |
| Betweenness Centrality | {{betweenness}} | {{betweenness_interpretation}} |

## Dependencies

### Calls (Outgoing)

<!-- Components this component depends on -->

```mermaid
graph LR
    {{component_id}}[{{component_name}}]
{{#each outgoing}}
    {{component_id}} --> {{target_id}}[{{target_name}}]
{{/each}}
```

| Target | Type | File | Relationship |
|--------|------|------|--------------|
{{#each outgoing}}
| {{target_name}} | {{target_type}} | `{{target_file}}` | {{relationship_type}} |
{{/each}}

### Called By (Incoming)

<!-- Components that depend on this component -->

| Caller | Type | File |
|--------|------|------|
{{#each incoming}}
| {{caller_name}} | {{caller_type}} | `{{caller_file}}` |
{{/each}}

{{#if temporal_coupling}}
## Temporal Coupling

<!-- Files that frequently change together with this component (from git history) -->

| Co-changed With | Coupling Score | Shared Commits |
|-----------------|----------------|----------------|
{{#each temporal_coupling}}
| `{{file}}` | {{score}} | {{shared_commits}} |
{{/each}}

> Components with coupling > 0.7 without direct code dependency may indicate hidden coupling.
{{/if}}

{{#if analysis}}
## Advanced Analysis

<!-- Language-specific analysis data -->

| Property | Value |
|----------|-------|
{{#if analysis.spawns_goroutines}}| Spawns Goroutines | Yes |{{/if}}
{{#if analysis.uses_channels}}| Uses Channels | Yes |{{/if}}
{{#if analysis.uses_select}}| Uses Select | Yes |{{/if}}
{{#if analysis.returns_error}}| Returns Error | Yes |{{/if}}
{{#if analysis.has_defers}}| Has Defers | Yes |{{/if}}
{{#if analysis.has_panic}}| Has Panic | Yes |{{/if}}
{{#if analysis.is_exported}}| Exported | Yes |{{/if}}
{{/if}}

{{#if violations}}
## Violations

{{#each violations}}
- **{{rule}}**: {{description}}
{{/each}}
{{/if}}

## Source

> [`{{file_path}}:{{start_line}}-{{end_line}}`]({{source_url}})
