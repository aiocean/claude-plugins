# Security Boundaries

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the security-analyst.
Only generated when authentication, authorization, or security-sensitive patterns are found.

Tools to use:
- Grep: find auth code — "auth", "jwt", "token", "session", "oauth", "apikey", "bearer"
- Grep: find secrets handling — "os.Getenv", "process.env", "os.environ", "secret", "credential"
- Grep: find input validation — "validate", "sanitize", "escape", "csrf", "xss", "inject"
- Grep: find crypto usage — "crypto", "hash", "bcrypt", "argon", "encrypt", "decrypt"
- Glob: find security config — "**/*auth*", "**/*security*", "**/*policy*"
- Read: auth middleware, guards, interceptors

Discovery commands:
```bash
# Find auth-related code
grep -r "auth\|jwt\|token\|session\|oauth\|apikey" --include="*.go" --include="*.py" --include="*.ts" -l
# Find secrets/env usage
grep -r "os\.Getenv\|process\.env\|os\.environ" -l
# Find input validation
grep -r "validate\|sanitize\|escape\|csrf" -l
```
-->

## Trust Boundaries

<!-- ORACLE:TRUST_BOUNDARIES
Map the system's trust boundaries — where does trust level change?
Draw a Mermaid diagram showing:
- External (untrusted): user browsers, third-party APIs, webhooks
- DMZ / edge: load balancer, API gateway, reverse proxy
- Internal (trusted): service-to-service communication
- Privileged: admin endpoints, database access, secrets store

Tools:
- Read infrastructure config (docker-compose, k8s manifests) for network boundaries
- Grep for middleware chains to identify where auth is enforced
- Read API route definitions to find public vs protected endpoints

```bash
# Find middleware/guard chains
grep -rn "middleware\|guard\|interceptor\|UseGuards\|before_request\|HandlerFunc" --include="*.go" --include="*.py" --include="*.ts" | head -20
# Find public vs protected routes
grep -rn "public\|anonymous\|noauth\|skip.*auth\|AllowAnonymous" --include="*.go" --include="*.py" --include="*.ts"
```
-->

```mermaid
flowchart LR
    subgraph External["Untrusted"]
        REPLACE_EXTERNAL_ACTORS
    end
    subgraph Edge["DMZ / Edge"]
        REPLACE_EDGE_COMPONENTS
    end
    subgraph Internal["Trusted"]
        REPLACE_INTERNAL_SERVICES
    end
    subgraph Privileged["Privileged"]
        REPLACE_PRIVILEGED_RESOURCES
    end
    REPLACE_CONNECTIONS
```

## Authentication Flows

<!-- ORACLE:AUTHN
Document how users and services authenticate:
- Authentication strategy (JWT, session cookies, API keys, OAuth2, mTLS)
- Token lifecycle (issuance, validation, refresh, revocation)
- Identity provider (self-managed, Auth0, Firebase Auth, Cognito, etc.)
- Service-to-service auth (API keys, mTLS, shared secrets)
- Session management (storage, expiration, invalidation)

Tools:
- Read auth middleware / strategy files
- Grep for token generation — "sign", "jwt.sign", "generate.*token", "encode"
- Grep for token validation — "verify", "jwt.verify", "decode", "validate.*token"
- Read auth config (passport config, auth0 config, firebase config)

```bash
# Find auth strategy implementations
grep -rn "passport\|strategy\|auth0\|firebase.*auth\|cognito\|jwt\.sign\|jwt\.verify" --include="*.go" --include="*.py" --include="*.ts" -l
# Find session management
grep -rn "session\|cookie\|Set-Cookie\|express-session\|cookie-session" --include="*.go" --include="*.py" --include="*.ts" -l
```
-->

REPLACE: authentication flow description

## Authorization Model

<!-- ORACLE:AUTHZ
Document how access control is enforced:
- Model type: RBAC (Role-Based), ABAC (Attribute-Based), ACL, policy-based (OPA, Casbin)
- Roles/permissions defined
- Policy enforcement points (where in the code are authz checks made)
- Resource-level access control (can user X access resource Y?)
- Admin/superuser bypass patterns

Tools:
- Grep for role/permission definitions — "role", "permission", "policy", "can\(", "ability", "authorize"
- Read authorization middleware or guard files
- Grep for admin checks — "admin", "superuser", "isAdmin", "role.*admin"

```bash
# Find authorization logic
grep -rn "role\|permission\|authorize\|can(\|ability\|policy\|isAdmin\|hasRole\|hasPermission" --include="*.go" --include="*.py" --include="*.ts" | head -20
# Find RBAC/ABAC definitions
grep -rn "enum.*Role\|type.*Role\|ROLES\|PERMISSIONS" --include="*.go" --include="*.py" --include="*.ts"
```
-->

REPLACE: authorization model description

## Secrets Management

<!-- ORACLE:SECRETS
Document how secrets are stored and accessed:
- Secret storage (env vars, vault, cloud secrets manager, config files)
- Secret types (API keys, DB credentials, encryption keys, OAuth secrets)
- Secret rotation strategy if any
- Risks: hardcoded secrets, secrets in version control, secrets in logs

IMPORTANT: Do NOT include actual secret values. Only document patterns and locations.

Tools:
- Grep for env var access patterns
- Read .env.example for secret variable names
- Grep for vault/secrets manager SDK usage
- Grep for potential hardcoded secrets (but do NOT output values)

```bash
# Find secret access patterns
grep -rn "os\.Getenv\|process\.env\|os\.environ\|viper\.Get\|config\." --include="*.go" --include="*.py" --include="*.ts" | grep -i "secret\|key\|password\|token\|credential" | head -20
# Find secrets manager usage
grep -r "vault\|secretmanager\|ssm\|kms\|keyring" --include="*.go" --include="*.py" --include="*.ts" -l
# Check for .env.example
cat .env.example 2>/dev/null | grep -v "^#" | sed 's/=.*/=<REDACTED>/'
```
-->

REPLACE: secrets management description

## Input Validation Boundaries

<!-- ORACLE:INPUT_VALIDATION
Document where external input enters the system and how it's validated:
- API request bodies (validation library, schema enforcement)
- URL parameters and query strings
- File uploads (type checking, size limits, malware scanning)
- Webhook payloads (signature verification)
- Database query parameters (SQL injection prevention)
- HTML output (XSS prevention, output encoding)

Tools:
- Grep for validation libraries — "zod", "joi", "class-validator", "pydantic", "validator"
- Grep for sanitization — "sanitize", "escape", "encode", "DOMPurify"
- Grep for SQL injection prevention — "parameterized", "prepared", "placeholder", "$1"
- Read validation middleware/schemas

```bash
# Find validation libraries in use
grep -r "zod\|joi\|class-validator\|pydantic\|validator\|ajv\|yup" --include="*.go" --include="*.py" --include="*.ts" -l
# Find sanitization
grep -rn "sanitize\|escape\|encode\|DOMPurify\|bleach\|html\.EscapeString" --include="*.go" --include="*.py" --include="*.ts"
# Find parameterized queries
grep -rn "parameterized\|prepared\|Prepare(\|\$[0-9]\|placeholder\|bind" --include="*.go" --include="*.py" --include="*.ts" | head -10
```
-->

| Entry Point | Validation | Sanitization | Notes |
|-------------|-----------|--------------|-------|
| REPLACE | REPLACE | REPLACE | REPLACE |

## Known Security Considerations

<!-- ORACLE:KNOWN_ISSUES
Document security-relevant patterns found in code:
- TODO/FIXME/HACK comments related to security
- Disabled security features (CORS *, CSRF disabled, auth bypassed)
- Known insecure patterns (eval, exec, innerHTML, raw SQL)
- Dependency security (known vulnerable packages)

Tools:
- Grep for security TODOs — "TODO.*security\|FIXME.*auth\|HACK.*token\|INSECURE\|UNSAFE"
- Grep for insecure patterns — "eval(\|exec(\|innerHTML\|dangerouslySetInnerHTML\|raw.*sql"
- Grep for permissive CORS — "cors.*\*\|Access-Control-Allow-Origin.*\*"

```bash
# Find security-related TODOs
grep -rn "TODO\|FIXME\|HACK\|INSECURE\|UNSAFE" --include="*.go" --include="*.py" --include="*.ts" | grep -i "security\|auth\|token\|secret\|password\|inject\|xss\|csrf"
# Find insecure patterns
grep -rn "eval(\|exec(\|innerHTML\|dangerouslySetInnerHTML\|raw.*query\|nosec" --include="*.go" --include="*.py" --include="*.ts" | head -10
```
-->

REPLACE: known security considerations

## Security Recommendations

<!-- ORACLE:RECOMMENDATIONS
Based on the analysis above, provide actionable security recommendations:
- Critical gaps (missing auth, missing input validation, hardcoded secrets)
- Improvement opportunities (add rate limiting, add CSRF protection, enable security headers)
- Audit priorities (which areas need deeper security review)

Prioritize by exploitability and impact.
Delete this comment when done.
-->

REPLACE: prioritized security recommendations
