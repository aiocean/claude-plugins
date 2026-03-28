# aio-grafana-diagram

Dashboard diagram generator. Analyzes codebase to auto-generate Mermaid diagrams with metric binding for Grafana dashboards.

## Install

```bash
/plugin install aio-grafana-diagram@aiocean-plugins
```

## What It Does

- Analyzes codebase structure to identify services, dependencies, and data flows
- Generates Mermaid diagrams (architecture, sequence, flowchart)
- Binds diagrams to Grafana metric panels with panel IDs and datasource references
- Produces dashboard JSON ready for Grafana import

## Requirements

- grafana-cli (optional, for direct dashboard push)
