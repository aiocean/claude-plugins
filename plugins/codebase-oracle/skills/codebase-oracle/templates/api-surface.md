# API Surface

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the flow-analyst.
Only generated when HTTP routes, gRPC services, GraphQL schemas, or CLI commands are found.

Tools to use (prefer Tree-sitter, fallback to Grep):
- Tree-sitter: Use `exports` and `functions` from .tree-sitter-results.json for accurate API discovery
- Tree-sitter: Use `decorators` array to find framework annotations (@Get, @Controller, etc.)
- Grep: find route definitions — "app\.(get|post|put|patch|delete)", "router\.", "@Get|@Post|@Put|@Delete", "HandleFunc", "r\.Method"
- Grep: find middleware — "app\.use", "middleware", "@UseGuards", "@UseInterceptors"
- Grep: find auth patterns — "authenticate", "authorize", "jwt", "bearer", "session"
- Glob: find route files — "**/routes/**", "**/controllers/**", "**/handlers/**"
- Read: each route file to extract endpoints
- LSP documentSymbol: list all exported handlers in route files
- LSP goToDefinition: trace handler → service → data layer

Tree-sitter data for API discovery:
- `files[PATH].exports`: exported functions, classes, constants
- `files[PATH].functions`: all function/method definitions with line numbers
- `files[PATH].decorators`: framework annotations (@Get, @Post, @Controller, etc.)
- `files[PATH].classes`: class definitions (for controller classes)
-->

## Endpoints

<!-- ORACLE:ENDPOINTS
List every API endpoint. For each:
- Method (GET, POST, PUT, PATCH, DELETE)
- Path (with params like :id or {id})
- Handler function name and file
- Auth required? (look for auth middleware on route)
- Brief description of what it does

Group by resource/domain if many endpoints.
Use Read on each route file to get the full list.

Tree-sitter discovery:
- Check `decorators` array for framework route annotations (@Get, @Post, etc.)
- Check `exports` for exported handler functions
- Cross-reference `functions` with route patterns from Grep

Tree-sitter decorator format: [{"name": "Get", "line": 15}, {"name": "Controller", "line": 12}, ...]
-->

### REPLACE: Resource/Domain Group

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |

<!-- ORACLE:MORE_GROUPS
Repeat endpoint table for each resource group.
Delete this comment when done.
-->

## Authentication

<!-- ORACLE:AUTH
How is authentication handled?
- Strategy: JWT, session cookies, API keys, OAuth, basic auth?
- Where: middleware, guard, interceptor?
- Token storage: header, cookie, query param?
- Refresh mechanism if any

Tools:
- Grep for auth middleware/strategy implementations
- Read auth config files
- Grep for token validation logic
-->

REPLACE: authentication description

## Request/Response Schemas

<!-- ORACLE:SCHEMAS
Document key request/response shapes for the most important endpoints.
Focus on:
- Create/Update request bodies (what fields, what validation)
- List response shapes (pagination, envelope pattern)
- Error response format

Tools:
- Read handler/controller files for request body types
- Grep for validation schemas (Zod, Joi, class-validator)
- Grep for response types/interfaces
- LSP hover on request/response parameters for type info
-->

### REPLACE: Endpoint Name

**Request**:
```
REPLACE: request body shape
```

**Response**:
```
REPLACE: response body shape
```

<!-- ORACLE:MORE_SCHEMAS
Add sections for 3-5 most important endpoints.
Delete this comment when done.
-->

## Error Handling

<!-- ORACLE:ERRORS
Document the error handling strategy:
- Error response format (shape of error JSON)
- HTTP status codes used and when
- Custom error classes if any
- Global error handler location and behavior

Tools:
- Grep for "catch", "error handler", "exception filter", "error middleware"
- Read the global error handler file
- Grep for custom error classes
-->

REPLACE: error handling strategy and format
