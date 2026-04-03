# Architecture: {{project_name}}

> Design patterns, decisions, and structural analysis

## Architecture Pattern

**Detected Pattern**: {{architecture_pattern}}

<!-- Explanation of why this pattern was detected, based on directory structure and code organization -->

{{pattern_explanation}}

## C4 Context Diagram

<!-- ORACLE:C4_CONTEXT
Shows the system in its ecosystem — users, external systems.

Tools:
- Read README.md, package.json for system description
- Grep for external API calls (fetch, axios, http.get) to find external systems
- Read env files / config for external service URLs
- Use GitNexus clusters for module structure

Identify:
1. Primary users
2. Admin users
3. External systems it calls
4. External systems that call it

C4Context syntax:
```
C4Context
    title System Context — [System Name]
    Person(user, "User Role", "Description")
    System(system, "This System", "What it does")
    System_Ext(ext, "External System", "What it provides")
    Rel(user, system, "Uses", "Protocol")
```
-->

```mermaid
C4Context
    title System Context — REPLACE_SYSTEM_NAME
    REPLACE_PERSONS
    REPLACE_SYSTEMS
    REPLACE_RELATIONSHIPS
```

## C4 Container Diagram

<!-- ORACLE:C4_CONTAINER
Shows major deployable units and how they communicate.

**Use GitNexus clusters to identify containers:**
- Each cluster represents a functional community
- Map clusters to deployable containers

Tools:
- Glob for docker-compose.yml, Dockerfile
- Read entry points to identify separate processes
- Grep for database connection strings
- Grep for queue/worker patterns

Identify containers:
1. Web applications (frontend, SSR)
2. API servers (REST, GraphQL)
3. Databases
4. Message queues / workers
5. Caches
6. File storage

C4Container syntax:
```
C4Container
    title Container Diagram — [System Name]
    Container_Boundary(system, "System") {
        Container(id, "Name", "Tech", "Description")
        ContainerDb(id, "Name", "Tech", "Description")
    }
    Rel(from, to, "Label", "Protocol")
```
-->

```mermaid
C4Container
    title Container Diagram — REPLACE_SYSTEM_NAME
    REPLACE_BOUNDARY_AND_CONTAINERS
    REPLACE_RELATIONSHIPS
```

## C4 Component Diagram

<!-- ORACLE:C4_COMPONENT
Shows key components within the main container.

**Use GitNexus graph nodes ranked by connectivity:**
- Hub nodes (high fan-in) are the most important components
- Cluster membership shows which components belong together

For each major container, identify:
1. Entry/routing layer (controllers, route handlers)
2. Business logic (services, use cases)
3. Data access (repositories, DAOs, ORM models)
4. Cross-cutting (auth, logging, validation)

C4Component syntax:
```
C4Component
    title Component Diagram — [Container Name]
    Container_Boundary(id, "Container") {
        Component(id, "Name", "Tech", "Description")
    }
    Rel(from, to, "Label")
```
-->

```mermaid
C4Component
    title Component Diagram — REPLACE_CONTAINER_NAME
    REPLACE_BOUNDARY_AND_COMPONENTS
    REPLACE_RELATIONSHIPS
```

<!-- ORACLE:ADDITIONAL_CONTAINERS
If multiple containers have significant internal structure,
add another Component diagram section for each.

Use GitNexus clusters to identify modules with rich internal structure.
Delete this comment if only one container needs a component diagram.
-->

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

<!-- GitNexus clustering results with cohesion scores -->

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

<!-- Rules that were violated based on analysis -->

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
