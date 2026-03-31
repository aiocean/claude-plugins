# {{project_name}}

> Auto-generated codebase documentation by [Codebase Oracle](https://github.com/aiocean/claude-plugins) | {{generated_at}}
> Commit: `{{commit_sha}}`

## What This Project Does

<!-- 2-3 sentences describing the project's purpose, extracted from README or inferred from code structure -->

{{project_description}}

## Architecture Overview

<!-- High-level architecture diagram showing the main layers/modules and their relationships -->

```mermaid
graph TD
{{architecture_diagram}}
```

**Architecture Pattern**: {{architecture_pattern}}
<!-- One of: layered, modular, microservices, monolith, hexagonal, event-driven, mvc, unknown -->

**Primary Language**: {{primary_language}} | **Languages**: {{languages}}

## Project Structure

<!-- Directory tree showing top-level organization with purpose annotations -->

```
{{directory_tree}}
```

| Directory | Purpose | File Count |
|-----------|---------|------------|
{{#each top_directories}}
| `{{path}}` | {{purpose}} | {{file_count}} |
{{/each}}

## Key Entry Points

<!-- Files that serve as entry points: main, index, app, server, cli -->

| Entry Point | Type | Path |
|-------------|------|------|
{{#each entry_points}}
| {{name}} | {{type}} | `{{path}}` |
{{/each}}

## Summary Metrics

| Metric | Value |
|--------|-------|
| Total Components | {{total_components}} |
| Total Relationships | {{total_edges}} |
| Communities/Modules | {{community_count}} |
| Avg Maintainability Index | {{avg_maintainability}} |
| Circular Dependencies | {{circular_dep_count}} |
| Architectural Violations | {{violation_count}} |

## Detected Frameworks & Libraries

<!-- Auto-detected from imports, config files, and dependency manifests -->

| Framework/Library | Category | Detected From |
|-------------------|----------|---------------|
{{#each frameworks}}
| {{name}} | {{category}} | `{{detected_from}}` |
{{/each}}

## Module Map

<!-- Overview of all detected modules/domains with brief description -->

```mermaid
graph LR
{{module_map_diagram}}
```

| Module | Components | Hubs | Cohesion | Coupling | Keywords |
|--------|------------|------|----------|----------|----------|
{{#each modules}}
| {{name}} | {{node_count}} | {{hub_count}} | {{cohesion}} | {{coupling}} | {{keywords}} |
{{/each}}

## Health Dashboard

<!-- Traffic-light summary of codebase health -->

| Aspect | Status | Detail |
|--------|--------|--------|
| Maintainability | {{maintainability_status}} | Avg MI: {{avg_maintainability}} |
| Complexity | {{complexity_status}} | {{high_complexity_count}} high-complexity components |
| Coupling | {{coupling_status}} | {{circular_dep_count}} circular deps, {{bottleneck_count}} bottlenecks |
| Architecture | {{architecture_status}} | {{violation_count}} violations detected |

## Next Steps

<!-- Links to deeper documentation pages -->

- [Architecture Deep Dive](./architecture.md) - Design patterns and decisions
- [Dependency Analysis](./dependencies.md) - Full dependency graph and metrics
- [Code Quality Report](./quality.md) - Violations, complexity hotspots
- [API Surface](./api-surface.md) - Public interfaces and endpoints
- [Data Model](./data-model.md) - Data structures and schemas
- [Key Flows](./key-flows.md) - Cross-module execution paths
- [Infrastructure](./infrastructure.md) - Deployment and infrastructure
- [Product Requirements](./product-requirements.md) - Inferred product requirements
- [Codebase Map](./CODEBASE_MAP.md) - Full codebase index and navigation
{{#each modules}}
- [Module: {{name}}](./modules/{{slug}}.md) - {{description}}
{{/each}}
