# Codebase Oracle

Universal codebase analysis combining the best of three approaches:

- **Parallel subagent mapping** (from Cartographer) — orchestrates multiple AI subagents to scan and document codebases of any size
- **Dependency and hub analysis** (from Codemap) — identifies critical hub files, traces dependency chains, assesses change blast radius
- **Evidence-based investigation** (from Codebase-recon) — confidence-tracked methodology with validation checklists

## Modes

| Mode | Use When | Output |
|------|----------|--------|
| **Full Map** | New codebase, onboarding | `docs/CODEBASE_MAP.md` |
| **Investigate** | Targeted questions | Findings with confidence |
| **Impact** | Before changes | Dependency graph + blast radius |

## Installation

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install codebase-oracle@aiocean-plugins
```

## Usage

Just ask Claude to analyze your codebase:

- "map this codebase"
- "analyze the architecture"
- "what would break if I change X?"
- "how does authentication work?"

## Requirements

- Python 3.9+ (for the scanner script)
- UV recommended (auto-installs dependencies)
