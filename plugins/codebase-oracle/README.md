# Codebase Oracle

Comprehensive architecture documentation generator using specialized analyst teams.

Produces a full `docs/` directory with multi-document architecture docs — C4 diagrams, ERD, API maps, sequence diagrams, dependency graphs, and more. All diagrams use Mermaid for native markdown rendering.

## Output

| Document | Content | Generated When |
|----------|---------|---------------|
| `CODEBASE_MAP.md` | Index + system overview + hub files + module guide | Always |
| `c4-architecture.md` | C4 Context, Container, Component diagrams | Always |
| `data-model.md` | ERD, database schema, entity relationships | Models/schemas/migrations found |
| `api-surface.md` | Routes, endpoints, schemas, auth | HTTP/gRPC/GraphQL/CLI found |
| `key-flows.md` | Sequence diagrams for critical paths | Always |
| `dependency-graph.md` | Module dependencies, hub analysis, blast radius | Always |
| `product-requirements.md` | Reverse-engineered features, mindmap | README or user-facing code found |
| `infrastructure.md` | Deployment topology, CI/CD, env config | Docker/CI/k8s config found |

## Modes

| Mode | Use When | Output |
|------|----------|--------|
| **Full Map** | New codebase, onboarding | `docs/` directory with architecture docs |
| **Investigate** | Targeted questions | Findings with confidence assessment |
| **Impact** | Before changes | Dependency graph + blast radius |

## Specialized Analysts

Uses 5 domain-specific analysts working in parallel:

- **structure-analyst** — code architecture, layers, modules, C4 diagrams
- **data-analyst** — data models, schemas, ERD
- **flow-analyst** — execution paths, APIs, sequence diagrams
- **product-analyst** — user-facing features, requirements
- **infra-analyst** — deployment, CI/CD, infrastructure

For small codebases (<30 files), analysts are combined. For large codebases, extra analysts are spawned.

## Installation

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install codebase-oracle@aiocean-plugins
```

## Usage

Just ask Claude to analyze your codebase:

- "map this codebase"
- "analyze the architecture"
- "document this project"
- "what would break if I change X?"
- "how does authentication work?"

## Requirements

- Python 3.9+ (for the scanner script)
- UV recommended (auto-installs dependencies)
