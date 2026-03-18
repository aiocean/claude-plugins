# Module: {{module_name}}

> Part of [{{project_name}}](./CODEBASE_MAP.md) | Community ID: {{community_id}}

## Purpose

<!-- 2-3 sentences describing what this module/domain does, inferred from file names, keywords, and code structure -->

{{module_description}}

## Architecture

<!-- How this module is structured internally -->

```mermaid
graph TD
{{module_architecture_diagram}}
```

**Layer**: {{layer}}
<!-- One of: presentation, business, data, infrastructure, shared -->

**Cohesion**: {{cohesion}} | **Coupling**: {{coupling}}

## Components

<!-- All components in this module, sorted by importance (PageRank) -->

| Component | Type | File | PageRank | Fan-in | Fan-out | Complexity |
|-----------|------|------|----------|--------|---------|------------|
{{#each components}}
| [{{name}}](./components/{{slug}}.md) | {{type}} | `{{file_path}}:{{start_line}}` | {{pagerank}} | {{fan_in}} | {{fan_out}} | {{complexity}} |
{{/each}}

## Hub Components

<!-- Components with high fan-in that serve as central coordination points -->

{{#each hubs}}
### {{name}}

- **File**: `{{file_path}}:{{start_line}}`
- **Fan-in**: {{fan_in}} | **Fan-out**: {{fan_out}}
- **Why it's a hub**: {{hub_reason}}
- **Depends on**: {{depends_on}}
- **Depended by**: {{depended_by}}

{{/each}}

## Internal Dependencies

<!-- How components within this module depend on each other -->

```mermaid
graph LR
{{internal_deps_diagram}}
```

## External Dependencies

<!-- Dependencies on other modules -->

| Depends On | Components Using | Relationship |
|------------|------------------|--------------|
{{#each external_deps}}
| {{target_module}} | {{components}} | {{relationship_type}} |
{{/each}}

## Who Depends On This Module

<!-- Other modules that import from this module -->

| Module | Components Importing | Purpose |
|--------|----------------------|---------|
{{#each reverse_deps}}
| {{source_module}} | {{components}} | {{purpose}} |
{{/each}}

## Keywords

<!-- TF-IDF extracted keywords representing this module's semantic domain -->

{{#each keywords}}
`{{keyword}}` ({{score}})
{{/each}}

## Quality Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Avg Maintainability | {{avg_maintainability}} | {{maintainability_status}} |
| Avg Complexity | {{avg_complexity}} | {{complexity_status}} |
| Components with violations | {{violation_count}} | {{violation_status}} |
| Test coverage (if available) | {{test_coverage}} | {{coverage_status}} |

## Violations

{{#each violations}}
- **{{severity}}**: {{description}} — `{{file_path}}:{{line}}`
{{/each}}

{{#if no_violations}}
No architectural violations detected in this module.
{{/if}}
