# aio-code-review

Ultimate code review with two-layer analytics (GitNexus knowledge graph with hybrid search + blast radius, CodeWiki static analysis), domain-specific skill detection (Go, iOS, React, XState, observability), 5 core + 4 conditional parallel review agents, and a critic meta-review with confidence scoring.

## Install

```bash
/plugin install aio-code-review@aiocean-plugins
```

## Skills

- Multi-phase review pipeline with domain auto-detection
- Parallel specialized agents: security, performance, architecture, tests, style
- Conditional agents activated by detected stack (Go, iOS, React, XState, observability)
- Blast radius analysis via GitNexus knowledge graph
- Adversarial meta-review (critic) with confidence scoring

## Requirements

- GitNexus (required)
- CodeWiki (optional, enhances static analysis)
