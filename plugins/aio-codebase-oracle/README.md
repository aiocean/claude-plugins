# Codebase Oracle

Comprehensive codebase analysis and visualization using specialized analyst teams.

**Two skills included:**

1. **codebase-oracle** — Produces a full `docs/` directory with multi-document architecture docs (C4 diagrams, ERD, API maps, sequence diagrams, dependency graphs, and more)

2. **codebase-viz** — Turns architecture docs into interactive HTML playgrounds with 5 tabs: Overview, Architecture, Dependencies, Flows, and Modules

All diagrams use Mermaid for native markdown rendering.

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
| **Visualize** | Explore architecture interactively | Interactive HTML playground |

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

**Analyze codebase:**
- "map this codebase"
- "analyze the architecture"
- "document this project"
- "what would break if I change X?"
- "how does authentication work?"

**Visualize architecture:**
- "visualize this codebase"
- "show me an interactive architecture view"
- "create an architecture playground"

## Static Analysis with Tree-sitter

The skill uses Tree-sitter for precise AST-based static analysis:

- **Accurate import extraction** — distinguishes imports from strings/comments
- **Function/class discovery** — with exact line numbers
- **Call graph construction** — for dependency analysis
- **Export identification** — for API surface mapping

**Supported languages:** Python, JavaScript, TypeScript/TSX, Go, Rust, Java, Ruby

Tree-sitter analysis runs automatically when UV is available (auto-installs all dependencies).
