# Data Model

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the data-analyst.
Only generated when models/schemas/migrations/ORM or typed entity relationships are found.

Tools to use:
- Glob: find model files — "**/*.model.*", "**/*.entity.*", "**/*.schema.*", "**/models/**", "**/entities/**", "**/prisma/schema.prisma", "**/migrations/**", "**/drizzle/**"
- Read: read each model/schema file to extract fields, types, relationships
- Grep: search for relationship decorators (@OneToMany, @BelongsTo, hasMany, references, $ref)
- Grep: search for migration files to understand schema evolution
- LSP hover: get type info on model fields
- LSP findReferences: trace where each entity is used (to verify relationships)
-->

## Entity Relationship Diagram

<!-- ORACLE:ERD
Generate a Mermaid erDiagram from discovered entities.

Syntax:
```
erDiagram
    ENTITY_NAME {
        type field_name PK "optional comment"
        type field_name FK
        type field_name UK
        type field_name
    }
    ENTITY_A ||--o{ ENTITY_B : "relationship label"
```

Relationship cardinality:
- ||--|| : one to one
- ||--o{ : one to many
- o{--o{ : many to many (usually via join table)
- ||--o| : one to zero-or-one

Steps:
1. Read each model file, extract entity name and fields
2. Map field types to simple types (string, int, uuid, timestamp, etc.)
3. Mark PK, FK, UK constraints
4. Read relationship decorators/definitions to draw edges
5. If join tables exist, show them as separate entities
-->

```mermaid
erDiagram
    REPLACE_ENTITIES_AND_RELATIONSHIPS
```

## Entities

<!-- ORACLE:ENTITY_DETAILS
For each entity, create a subsection with:
- Field table (name, type, constraints, description)
- Source file path
- Notable validations or defaults

Read the actual model/schema file for each entity.
Use LSP hover on fields for type details if available.
-->

### REPLACE: Entity Name

**Source**: `REPLACE: file path`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| REPLACE | REPLACE | REPLACE | REPLACE |

<!-- ORACLE:MORE_ENTITIES
Repeat the entity subsection for each entity found.
Order: most important/central entities first.
Delete this comment when done.
-->

## Relationships

<!-- ORACLE:RELATIONSHIPS
Describe each relationship in plain language:
- "A User has many Orders (one-to-many via user_id FK on Order)"
- "Products and Categories have many-to-many relationship (via ProductCategory join table)"

Include:
- Cascade behavior if defined (ON DELETE CASCADE, etc.)
- Soft delete patterns if found
- Polymorphic relationships if any
-->

REPLACE: relationship descriptions

## Schema Source

<!-- ORACLE:SCHEMA_SOURCE
Document where schemas are defined:
- ORM models (which files, which ORM)
- Migration files (directory, naming convention)
- Prisma schema / Drizzle config / TypeORM entities
- Raw SQL files if any
- Validation schemas (Zod, Joi, Yup) if separate from models
-->

| Source Type | Location | Technology |
|-------------|----------|-----------|
| REPLACE | REPLACE | REPLACE |
