# Architecture Decision Records

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the architecture-analyst.
Captures both explicit ADRs found in the codebase and decisions inferred from code patterns.

Tools to use:
- Glob: find existing ADRs — "**/adr/**", "**/decisions/**", "**/ADR-*", "**/adr-*"
- Read: existing ADR documents
- Grep: find decision comments — "DECISION", "ARCHITECTURAL", "WHY:", "RATIONALE"
- Grep: find significant patterns — "TODO", "HACK", "WORKAROUND", "FIXME"
- Read: codebase_map.json for architectural patterns
- Read: README.md, ARCHITECTURE.md for documented decisions

Discovery commands:
```bash
# Find existing ADRs
find . -path "*/adr/*" -o -path "*/decisions/*" -o -name "ADR-*" -o -name "adr-*" 2>/dev/null
# Find significant architectural patterns that imply decisions
grep -r "TODO\|HACK\|FIXME\|WORKAROUND\|DECISION" --include="*.go" --include="*.py" --include="*.ts" -l
```
-->

## ADR Index

<!-- ORACLE:INDEX
Build an index table of all architecture decisions — both explicit (found in docs) and inferred (detected from code patterns).

For explicit ADRs:
- Read each ADR file found via Glob
- Extract title, status, date

For inferred decisions, look for:
- Framework/language choices (why Go? why React? why this ORM?)
- Architectural patterns (monolith, microservices, monorepo, event-driven)
- Data storage choices (SQL vs NoSQL, which database, caching layer)
- API style choices (REST vs gRPC vs GraphQL)
- Build/deploy choices (Docker, serverless, PaaS)

```bash
# Detect major technology choices
cat package.json go.mod requirements.txt Cargo.toml 2>/dev/null | head -50
# Detect architectural patterns
ls -d */  2>/dev/null
grep -r "grpc\|graphql\|rest\|websocket" --include="*.go" --include="*.py" --include="*.ts" -l 2>/dev/null | head -10
# Detect data storage
grep -r "postgres\|mysql\|mongo\|redis\|sqlite\|dynamodb\|firestore" -l 2>/dev/null | head -10
```
-->

| ID | Title | Status | Type | Date |
|----|-------|--------|------|------|
| REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |

<!-- ORACLE:INDEX_NOTES
Type column values: "explicit" (found as written ADR) or "inferred" (detected from code).
Status values: proposed, accepted, deprecated, superseded.
For inferred decisions, use "accepted" as status and estimate date from git log.
Delete this comment when done.
-->

## Explicit Decisions

<!-- ORACLE:EXPLICIT
For each ADR document found in the repository, extract and present it in the standard format below.
If no explicit ADRs exist, write: "No explicit ADR documents found in the repository."

Tools:
- Read each ADR file found via Glob
- Preserve the original decision content

```bash
# Read existing ADRs
find . -path "*/adr/*" -o -path "*/decisions/*" -o -name "ADR-*" -o -name "adr-*" 2>/dev/null | while read f; do
  echo "=== $f ==="
  head -50 "$f"
  echo
done
```
-->

### REPLACE: ADR-NNN — Decision Title

- **Status**: REPLACE (proposed | accepted | deprecated | superseded)
- **Date**: REPLACE
- **Context**: REPLACE: what is the issue that motivates this decision
- **Decision**: REPLACE: what we decided to do
- **Consequences**: REPLACE: what becomes easier or harder as a result
- **Evidence**: `REPLACE: path:line` references to implementation

<!-- ORACLE:MORE_EXPLICIT
Repeat the decision template above for each explicit ADR found.
Delete this comment when done.
-->

## Inferred Decisions

<!-- ORACLE:INFERRED
Document decisions that Oracle detected from code patterns but are not explicitly documented.
These are architectural choices evident in the codebase that should be captured for future reference.

Look for:
1. **Language/Framework choice**: Why this language? Why this framework?
   - Evidence: go.mod, package.json, Cargo.toml, requirements.txt
2. **Architecture style**: Monolith, microservices, modular monolith, serverless?
   - Evidence: directory structure, deployment config, service boundaries
3. **Data layer choices**: Which database? ORM or raw queries? Caching strategy?
   - Evidence: connection strings, schema files, migration directories
4. **API protocol**: REST, gRPC, GraphQL, WebSocket?
   - Evidence: route definitions, proto files, schema files
5. **State management**: Where is state stored? How is it shared?
   - Evidence: session stores, cache layers, shared databases
6. **Error handling strategy**: Error types, propagation, recovery
   - Evidence: error packages, middleware, retry logic
7. **Code organization**: Package structure, module boundaries, layering
   - Evidence: directory layout, import patterns, dependency direction

```bash
# Detect dependency direction (what imports what)
cat docs/codebase_map.json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
deps = data.get('dependencies', [])
for d in deps[:20]:
    print(f\"{d.get('from', '?')} -> {d.get('to', '?')}\")
"
# Find significant code comments about decisions
grep -rn "DECISION\|RATIONALE\|WHY:\|chose.*because\|decided to\|trade.off" --include="*.go" --include="*.py" --include="*.ts" --include="*.md" | head -20
```
-->

### REPLACE: INF-NNN — Inferred Decision Title

- **Status**: accepted
- **Detected from**: REPLACE: what code pattern revealed this decision
- **Context**: REPLACE: the problem this decision addresses
- **Decision**: REPLACE: what was chosen
- **Consequences**: REPLACE: trade-offs of this choice
- **Evidence**: `REPLACE: path:line` references

<!-- ORACLE:MORE_INFERRED
Repeat the inferred decision template for each significant architectural decision detected.
Aim for 3-7 inferred decisions covering the most impactful choices.
Delete this comment when done.
-->
