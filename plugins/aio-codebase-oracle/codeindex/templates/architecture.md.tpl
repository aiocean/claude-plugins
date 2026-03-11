# Architecture: {{project_name}}

> Design patterns, decisions, and structural analysis

## Architecture Pattern

**Detected Pattern**: {{architecture_pattern}}

<!-- Explanation of why this pattern was detected, based on directory structure and code organization -->

{{pattern_explanation}}

```mermaid
graph TD
{{architecture_diagram}}
```

## Layer Map

<!-- How the codebase is organized into architectural layers -->

```mermaid
graph TB
    subgraph Presentation
{{#each presentation_modules}}
        {{id}}[{{name}}]
{{/each}}
    end
    subgraph Business Logic
{{#each business_modules}}
        {{id}}[{{name}}]
{{/each}}
    end
    subgraph Data Layer
{{#each data_modules}}
        {{id}}[{{name}}]
{{/each}}
    end
    subgraph Infrastructure
{{#each infra_modules}}
        {{id}}[{{name}}]
{{/each}}
    end

{{layer_connections}}
```

| Layer | Modules | Component Count | Purpose |
|-------|---------|-----------------|---------|
{{#each layers}}
| {{name}} | {{module_count}} | {{component_count}} | {{purpose}} |
{{/each}}

## Module Boundaries

<!-- How well-defined are the boundaries between modules -->

| Module A | Module B | Cross-boundary Edges | Direction | Assessment |
|----------|----------|----------------------|-----------|------------|
{{#each boundary_crossings}}
| {{module_a}} | {{module_b}} | {{edge_count}} | {{direction}} | {{assessment}} |
{{/each}}

## Community Detection

<!-- Louvain algorithm community detection results -->

**Modularity Score**: {{modularity_score}}

```mermaid
graph TD
{{community_diagram}}
```

| Community | Size | Hubs | Keywords | Suggested Domain |
|-----------|------|------|----------|------------------|
{{#each communities}}
| {{id}} | {{node_count}} | {{hub_count}} | {{keywords}} | {{suggested_name}} |
{{/each}}

## Data Flow

<!-- How data flows through the system, from entry points to persistence -->

```mermaid
flowchart LR
{{data_flow_diagram}}
```

{{data_flow_description}}

## Key Design Decisions

<!-- Inferred from code patterns, framework choices, and structural organization -->

| Decision | Evidence | Implication |
|----------|----------|-------------|
{{#each design_decisions}}
| {{decision}} | {{evidence}} | {{implication}} |
{{/each}}

## Architectural Violations

<!-- Rules that were violated based on static analysis -->

{{#each violations}}
### {{rule_name}}

- **Severity**: {{severity}}
- **Components**: {{component_count}} affected
- **Description**: {{description}}

| Component | File | Detail |
|-----------|------|--------|
{{#each affected_components}}
| {{name}} | `{{file_path}}` | {{detail}} |
{{/each}}

{{/each}}

{{#if no_violations}}
No architectural violations detected. The codebase appears well-structured.
{{/if}}

## Recommendations

<!-- Auto-generated improvement suggestions based on analysis -->

{{#each recommendations}}
{{index}}. **{{title}}** — {{description}}
   - Impact: {{impact}}
   - Effort: {{effort}}
{{/each}}
