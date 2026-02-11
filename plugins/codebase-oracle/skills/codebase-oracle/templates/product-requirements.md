# Product Requirements

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the product-analyst.
Only generated when README exists or user-facing routes/components are found.
Reverse-engineers product requirements from code — what the system does for users.

Tools to use:
- Read: README.md for product description and usage examples
- Glob: find UI components — "**/*.vue", "**/*.tsx", "**/*.jsx", "**/pages/**", "**/views/**"
- Grep: find route definitions for page/view inventory
- Grep: find CLI commands — "command(", "program.command", "cobra.Command", "@Command"
- Read: test files for behavior descriptions (describe/it/test blocks)
- Grep: find role/permission checks — "role", "permission", "isAdmin", "canAccess"
-->

## Feature Map

<!-- ORACLE:FEATURE_MAP
Generate a Mermaid mindmap showing features organized by domain.

Steps:
1. Read README for feature overview
2. Scan route/page definitions for user-facing features
3. Group related features into domains
4. Check test descriptions for additional feature details

Mindmap syntax:
```
mindmap
    root((System Name))
        Domain 1
            Feature A
            Feature B
        Domain 2
            Feature C
```
-->

```mermaid
mindmap
    root((REPLACE_SYSTEM_NAME))
        REPLACE_DOMAINS_AND_FEATURES
```

## User Roles

<!-- ORACLE:USER_ROLES
Identify user types from:
- Auth/permission code (Grep for role enums, permission checks)
- Database models (User model with role field)
- Route guards (different access levels)
- README documentation

If no explicit roles found, document "Single role: authenticated user" or similar.
-->

| Role | Description | Key Capabilities |
|------|-------------|-----------------|
| REPLACE | REPLACE | REPLACE |

## Features

<!-- ORACLE:FEATURES
For each domain/feature group, list individual features with descriptions.
Derive from:
- Route handlers (each endpoint = a capability)
- UI components/pages (each page = a feature)
- CLI commands (each command = a feature)
- Test descriptions (each test suite = a feature area)

Describe what users CAN DO, not implementation details.
-->

### REPLACE: Feature Domain

- **REPLACE: Feature name**: REPLACE: what the user can do
- **REPLACE: Feature name**: REPLACE: what the user can do

<!-- ORACLE:MORE_DOMAINS
Repeat for each feature domain.
Delete this comment when done.
-->

## Business Rules

<!-- ORACLE:BUSINESS_RULES
Extract domain logic encoded in the code:
- Validation rules (min/max, required fields, formats)
- State machine transitions (order status flow, etc.)
- Calculation formulas (pricing, scoring, etc.)
- Limits and quotas (rate limits, storage limits)
- Access control rules beyond basic roles

Tools:
- Grep for validation logic (min, max, required, pattern)
- Read service/domain files for business logic
- Grep for state transitions (status, state, workflow)
-->

REPLACE: key business rules extracted from code
