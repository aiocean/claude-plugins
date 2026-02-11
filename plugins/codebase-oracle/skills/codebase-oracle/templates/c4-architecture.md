# C4 Architecture

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the structure-analyst.
Generate all three diagram levels. Each diagram uses Mermaid syntax.
If the codebase is simple (single container), the Component diagram IS the Container diagram — merge them.
-->

## Context Diagram

<!-- ORACLE:C4_CONTEXT
Shows the system in its ecosystem — users, external systems.
Tools:
- Read README.md, package.json for system description
- Grep for external API calls (fetch, axios, http.get, grpc) to find external systems
- Grep for auth providers (OAuth, SAML, LDAP) to find identity systems
- Read env files / config for external service URLs

Identify:
1. Primary users (who uses this system?)
2. Admin users (who manages it?)
3. External systems it calls (APIs, databases, message queues)
4. External systems that call it (webhooks, callbacks)

Generate a C4Context Mermaid diagram:
```
C4Context
    title System Context — [System Name]
    Person(user, "User Role", "Description")
    System(system, "This System", "What it does")
    System_Ext(ext, "External System", "What it provides")
    Rel(user, system, "Uses", "Protocol")
    Rel(system, ext, "Calls", "Protocol")
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
Tools:
- Glob for docker-compose.yml, Dockerfile, package.json (monorepo packages)
- Read entry points to identify separate processes
- Grep for database connection strings to identify DB type
- Grep for queue/worker patterns (bull, bee-queue, celery, sidekiq)

Identify containers:
1. Web applications (frontend builds, SSR servers)
2. API servers (REST, GraphQL, gRPC)
3. Databases (SQL, NoSQL, search engines)
4. Message queues / workers
5. Caches (Redis, Memcached)
6. File storage (S3, local)

Generate a C4Container Mermaid diagram:
```
C4Container
    title Container Diagram — [System Name]
    Container_Boundary(system, "System") {
        Container(id, "Name", "Tech", "Description")
        ContainerDb(id, "Name", "Tech", "Description")
        ContainerQueue(id, "Name", "Tech", "Description")
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
Shows key components within the main container (usually the API/backend).
Tools:
- Read source directory structure to identify modules
- Grep for export/class/interface definitions in each module
- LSP documentSymbol on key files to list exported symbols
- LSP findReferences to trace component relationships

For each major container, identify:
1. Entry/routing layer (controllers, route handlers)
2. Business logic (services, use cases)
3. Data access (repositories, DAOs, ORM models)
4. Cross-cutting (auth, logging, validation)

Generate a C4Component Mermaid diagram per container:
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
Delete this comment if only one container needs a component diagram.
-->
