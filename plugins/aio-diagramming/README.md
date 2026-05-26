# aio-diagramming

**Mermaid diagrams for sharing, and for live system monitoring.**

Diagrams in software projects serve two different purposes. The first is communication: sharing a flowchart, sequence diagram, or architecture overview with your team. The second is observation: a live view of your system where nodes light up based on real metric data. These are different problems that need different tools.

This plugin provides both — a lightweight URL generator for shareable diagrams, and a Grafana panel generator that binds Mermaid nodes to Prometheus or database metrics.

## Installation

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-diagramming@aiocean-plugins
```

## Skills

### aio-mermaid — Generate shareable diagram URLs

Creates shareable links to `mimaid.aiocean.dev` using LZ-String compression. Write or describe a diagram, get a URL back. No account, no upload, no server storage — the diagram lives entirely in the URL hash.

> "share diagram", "generate diagram URL", "mermaid", "flowchart", "sequence diagram", "class diagram", "ER diagram", "state diagram", "gantt chart", "shareable diagram link"

All standard Mermaid v11 diagram types are supported: `flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`, `erDiagram`, `gantt`, `pie`, `mindmap`, `timeline`, `gitgraph`.

The skill enforces correct Mermaid syntax — no markdown inside labels (`**bold**`, `_italic_`, backticks all break rendering), and `flowchart` instead of the deprecated `graph` keyword. Collaboration and view-only modes are available via URL parameters.

URL generation uses JavaScript and the `lz-string` library:

```bash
bun -e "
const LZString = require('lz-string');
const code = \`flowchart LR
    A[API] --> B[(Database)]
    A --> C[Cache]\`;
console.log('https://mimaid.aiocean.dev/#' + LZString.compressToEncodedURIComponent(code));
"
```

---

### aio-grafana-diagram — Data-driven architecture diagrams in Grafana

Static architecture diagrams go stale. This skill generates Mermaid diagrams that are embedded in Grafana as live panels: each node's color reflects the current health of that component based on metric thresholds.

> "create grafana diagram", "mermaid in grafana", "data-driven diagram", "dynamic diagram", "metric binding", "system visualization", "grafana dashboard"

The skill follows a four-phase workflow:

**Discover** — scans the codebase (Dockerfiles, docker-compose files, k8s manifests, route handlers, DB connection strings) to produce a component inventory: services, APIs, data flows, infrastructure.

**Generate** — produces Mermaid syntax with meaningful node IDs that match metric naming conventions. Subgraphs group related services. Edge labels show protocol types.

**Bind** — maps each node to a Prometheus query or SQL time-series query. The binding requires `format: "time_series"` — nodes without a time field are silently skipped by the `jdbranham-diagram-panel` plugin. Thresholds determine green/yellow/red coloring.

**Output** — a complete Grafana panel JSON block ready to paste into a dashboard, plus the raw Mermaid code for validation at `mermaid.live`.

A typical bound query (MySQL / OpenTelemetry):

```sql
SELECT
  FLOOR(UNIX_TIMESTAMP(Timestamp) / 60) * 60 * 1000 as time,
  ROUND(SUM(CASE WHEN StatusCode = 'Error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as api_error_rate
FROM otel.otel_traces
WHERE $__timeFilter(Timestamp)
GROUP BY time
ORDER BY time
```

The alias `api_error_rate` matches the Mermaid node ID `api_error_rate`, and the panel colors that node based on the configured thresholds.

## Which skill for which situation

| Situation | Skill |
|---|---|
| Document an architecture for a PR or RFC | aio-mermaid |
| Share a sequence diagram with your team | aio-mermaid |
| Monitor live service health in Grafana | aio-grafana-diagram |
| Generate a dashboard panel from a codebase scan | aio-grafana-diagram |
| Collaborate on a diagram in real time | aio-mermaid (room parameter) |
| Bind metric thresholds to topology nodes | aio-grafana-diagram |
