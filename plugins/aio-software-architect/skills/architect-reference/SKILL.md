---
name: architect-reference
description: |
  Software architecture encyclopedia with 137 in-depth articles. Look up any architecture
  pattern, principle, or concept. Search semantically, browse by category, or compare
  patterns side-by-side. Covers cloud design patterns, resilience, data architecture,
  DDD, distributed systems, API design, operations, and modern paradigms.
  Triggers: what is, explain, look up, search pattern, compare patterns, list patterns,
  architecture reference, tell me about, define, describe, how does X work
when_to_use: what is CQRS, explain circuit breaker, compare saga vs 2PC, list resilience patterns, search for caching, look up DDD, tell me about event sourcing, browse architecture patterns, define bounded context, describe hexagonal, how does consistent hashing work
effort: medium
---

# Software Architecture Reference

An encyclopedia of 137 in-depth architecture articles. Each article is 3,000-5,000 words covering the problem, core concept, real-world practices (Google, AWS, Microsoft), implementation guidance, trade-offs, common mistakes, and connections to other patterns.

## Scripts

```bash
SA="${CLAUDE_PLUGIN_ROOT}/scripts"
```

## Commands

### Search — Find patterns by meaning

```bash
npx tsx "$SA/search-patterns.ts" "<natural language query>" --top 5 --json
```

Examples:
- `"how to handle database failures gracefully"`
- `"scaling read-heavy workloads"`
- `"breaking apart a legacy system"`
- `"ensuring data consistency across services"`

The search uses semantic embeddings — it understands meaning, not just keywords.

### List — Browse the catalog

```bash
bash "$SA/list-patterns.sh"                      # All 137 patterns by volume
bash "$SA/list-patterns.sh" --volume 4           # Volume 4: Resilience
bash "$SA/list-patterns.sh" --search "event"     # Keyword filter
bash "$SA/list-patterns.sh" --count              # Quick count
```

### Read — Full article

After finding a pattern via search or list, read the full article:

```
${CLAUDE_PLUGIN_ROOT}/volume-NN-name/pattern-name.md
```

**Always read the full article.** These are not summaries — they are comprehensive guides with real-world examples, implementation details, and trade-off analysis.

### Compare — Side by side

```bash
bash "$SA/compare-patterns.sh" "circuit-breaker" "bulkhead"
bash "$SA/compare-patterns.sh" "microservices" "modular-monolith" "service-based"
```

### Related — Find connected patterns

After reading an article, check its "Connections" section for related patterns. Then read those for a complete picture.

Common pattern clusters:
- **Resilience stack**: circuit-breaker + bulkhead + timeout-patterns + retry + load-shedding
- **Event-driven stack**: event-driven + event-sourcing + cqrs + publisher-subscriber + saga
- **DDD stack**: bounded-context + aggregates + domain-events + context-mapping + ubiquitous-language
- **API stack**: resource-oriented-design + api-versioning + api-idempotency + consumer-driven-contracts
- **Scale stack**: sharding + partitioning + cache-aside + competing-consumers + materialized-view
- **Operations stack**: sre-principles + slo-sli-sla + observability + safe-deployments + chaos-engineering
- **Modern stack**: modular-monolith + hexagonal + vertical-slice + architecture-decision-records + fitness-functions

## Volumes

| # | Volume | Articles | Topics |
|---|--------|----------|--------|
| 01 | Foundations | 12 | Complexity, trade-offs, boundaries, deep modules, cognitive load, fitness functions, ADRs |
| 02 | Architecture Styles | 10 | Layered, modular monolith, microservices, event-driven, service-based, hexagonal, vertical slice |
| 03 | Cloud Design Patterns | 25 | Ambassador, bulkhead, CQRS, circuit breaker, saga, sidecar, strangler fig, and 18 more |
| 04 | Resilience & Reliability | 15 | Error budgets, timeouts, backoff, load shedding, shuffle sharding, cell-based, chaos engineering |
| 05 | Data Architecture | 15 | Replication, partitioning, consistency models, CAP, consensus, streaming, CDC, transactions |
| 06 | Domain-Driven Design | 12 | Ubiquitous language, bounded context, aggregates, domain events, context mapping, repositories |
| 07 | API & Integration | 10 | REST, gRPC, versioning, pagination, idempotency, contracts, gateway, service mesh |
| 08 | Distributed Systems | 12 | Fallacies, consistent hashing, quorum, CRDT, gossip, clocks, split brain, exactly-once |
| 09 | Operations & Delivery | 12 | SRE, SLOs, observability, deployment strategies, feature flags, platform engineering, GitOps |
| 10 | Modern Paradigms | 14 | Data mesh, AI-native, edge computing, zero trust, serverless, actor model, WebAssembly |

## Usage Guidelines

- **For quick lookups**: Search → Read the specific section you need
- **For learning a topic**: List a volume → Read articles in order (they build on each other)
- **For decision-making**: Use the `architect-advisor` skill instead — it provides a guided workflow
- **For comparing options**: Use the compare command or read both articles and cross-reference their trade-off sections
