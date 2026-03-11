# C4 Architecture

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the structure-analyst.
Generate all three diagram levels. Each diagram uses Mermaid syntax.
If the codebase is simple (single container), the Component diagram IS the Container diagram — merge them.

Primary data sources:
1. **CodeIndex static analysis**: docs/codebase_map.json for components, edges, communities
2. **CodeIndex dependency graphs**: docs/dependency_graphs/*.json for detailed dependency data
3. **CodeIndex architecture template**: docs/templates/architecture.md.tpl for structure guidance
4. **Direct source code reading** for verification and detail
5. Grep/LSP for additional discovery

IMPORTANT:
- CodeIndex outputs to docs/, NOT .codeindex-cache/
- Static analysis: docs/codebase_map.json
- Dependency data: docs/dependency_graphs/

codebase_map.json contains:
- nodes: components with metrics (PageRank, fan-in, fan-out, complexity)
- edges: dependency relationships between components
- communities: detected module groupings with keywords
-->

## Context Diagram

<!-- ORACLE:C4_CONTEXT
Shows the system in its ecosystem — users, external systems.

Tools:
- Read README.md, package.json for system description
- Grep for external API calls (fetch, axios, http.get) to find external systems
- Read env files / config for external service URLs
- Use docs/codebase_map.json communities for module structure

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

## Container Diagram

<!-- ORACLE:C4_CONTAINER
Shows major deployable units and how they communicate.

**Use CodeIndex codebase_map.json communities:**
```bash
cat docs/codebase_map.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for comm in data.get('communities', []):
    print(f'{comm[\"name\"]}: {comm.get(\"node_count\", 0)} components')
"
```

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

## Component Diagram

<!-- ORACLE:C4_COMPONENT
Shows key components within the main container.

**Use CodeIndex codebase_map.json nodes:**
```bash
cat docs/codebase_map.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for node in sorted(data.get('nodes', []), key=lambda n: n.get('pagerank', 0), reverse=True)[:20]:
    print(f'{node[\"name\"]}: pagerank={node.get(\"pagerank\",0):.4f}, fan_in={node.get(\"fan_in\",0)}')
"
```

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

Use codebase_map.json communities to identify modules with rich internal structure.
Delete this comment if only one container needs a component diagram.
-->
