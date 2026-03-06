# C4 Architecture

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the structure-analyst.
Generate all three diagram levels. Each diagram uses Mermaid syntax.
If the codebase is simple (single container), the Component diagram IS the Container diagram — merge them.

Primary data sources:
1. **CodeWiki module docs**: docs/{module}.md often have architecture diagrams
2. CodeWiki: docs/module_tree.json for module structure
3. Tree-sitter: docs/.tree-sitter-results.json (fallback)
4. Grep/LSP for additional discovery

IMPORTANT:
- CodeWiki outputs to docs/, NOT .codewiki-cache/
- Module tree: docs/module_tree.json
- Module docs: docs/{module_name}.md

CodeWiki module_tree.json format:
{
  "ModuleName": {
    "path": "path/to/module",
    "components": ["fully.qualified.ComponentName", ...],
    "children": { "SubModule": { ... } }
  }
}
-->

## Context Diagram

<!-- ORACLE:C4_CONTEXT
Shows the system in its ecosystem — users, external systems.

**FIRST: Check CodeWiki module docs for existing diagrams:**
```bash
grep -l "C4Context\|graph TB" docs/*.md
```

Tools:
- Read README.md, package.json for system description
- Grep for external API calls (fetch, axios, http.get) to find external systems
- Read env files / config for external service URLs
- Use docs/module_tree.json for module structure

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

**Use CodeWiki module_tree.json (in docs/, NOT .codewiki-cache/):**
```bash
cat docs/module_tree.json | python3 -c "
import json, sys
tree = json.load(sys.stdin)
for name, data in tree.items():
    components = data.get('components', [])
    children = data.get('children', {})
    print(f'{name}: {len(components)} components, {len(children)} sub-modules')
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

**Use CodeWiki module_tree.json (in docs/):**
```bash
cat docs/module_tree.json | python3 -c "
import json, sys
def print_components(tree, indent=0):
    for name, data in tree.items():
        comps = data.get('components', [])
        print('  ' * indent + f'{name}/ ({len(comps)} components)')
        if data.get('children'):
            print_components(data['children'], indent + 1)
print_components(json.load(sys.stdin))
"
```

**Also check CodeWiki module docs for component diagrams:**
```bash
grep -l "graph TB\|flowchart" docs/*.md
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

Use docs/module_tree.json to identify modules with rich internal structure.
Delete this comment if only one container needs a component diagram.
-->
