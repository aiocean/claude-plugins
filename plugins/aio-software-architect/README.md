# aio-software-architect

Architecture decisions made badly tend to compound. A choice that felt expedient at 10 engineers becomes a migration project at 100. A pattern that works at current load fails visibly at 10x. This plugin exists to slow that process down: before committing to a direction, understand the full trade-off space.

The plugin is built on 137 deeply researched articles across 10 volumes — cloud design patterns, resilience, data architecture, DDD, distributed systems, operations, and more. Each article runs 3,000-5,000 words, synthesizing knowledge from Google SRE, the AWS Builder's Library, Microsoft Azure Architecture Center, and 13 foundational books. The skills do not summarize this material; they read it in full and apply it to your specific context.

The guiding principle: there are no best practices, only trade-offs. Every pattern has costs. Context determines everything. A 5-person startup and a 500-person enterprise solving the same scaling problem need different architectures.

## Installation

```bash
/plugin install aio-software-architect@aiocean-plugins
```

## Skills

### aio-architect-advisor

> "architecture decision", "system design", "which pattern should I use", "microservices vs monolith", "how do I scale this", "design review", "migration strategy", "database choice", "CQRS", "resilience patterns", "trade-off analysis"

A structured 5-step decision workflow:

1. **Understand** — Before recommending anything, the advisor asks about your context: what you're building or changing, team size, scale (users, requests/sec, data volume), constraints (budget, timeline, existing stack, regulatory), quality attributes (availability, consistency, latency, cost), and current pain. Questions come one at a time.

2. **Search** — Finds the 3-5 most relevant patterns using semantic search across all 137 articles. The search understands meaning, not just keywords: "how do I handle database failures gracefully" finds circuit-breaker, bulkhead, and retry — not just articles with those words in the title.

3. **Apply** — Reads the full article for each candidate pattern and applies it concretely to your context. Not generic benefits — the specific trade-offs given your constraints. Cites real-world usage from Google, AWS, and Microsoft.

4. **Synthesize** — Builds a trade-off matrix across the candidate patterns (complexity, scalability, team fit, migration cost, operational burden), states a recommendation with reasoning, identifies which patterns combine well, and proposes an evolution path — what to start with, what to add later.

5. **Stress-test** — Challenges the recommendation: what happens at 10x scale? If the team doubles? What is the failure mode? Surfaces hidden assumptions. If weaknesses exist, names them and explains the mitigation.

### aio-architect-reference

> "what is CQRS", "explain circuit breaker", "compare patterns", "list patterns", "DDD bounded context", "hexagonal architecture", "event sourcing", "consistent hashing", "saga pattern", "2PC", "look up a pattern"

An encyclopedia mode for when you want to look something up rather than make a decision. Browse the full catalog by volume, search by natural-language description, read any article in full, or compare two patterns side by side.

Useful pattern clusters in the reference:

| Cluster | Patterns |
|---------|----------|
| Resilience | circuit-breaker, bulkhead, timeout-patterns, retry, load-shedding |
| Event-driven | event-driven, event-sourcing, CQRS, publisher-subscriber, saga |
| DDD | bounded-context, aggregates, domain-events, context-mapping, ubiquitous-language |
| Scale | sharding, partitioning, cache-aside, competing-consumers, materialized-view |
| Operations | sre-principles, slo-sli-sla, observability, safe-deployments, chaos-engineering |
| Modern | modular-monolith, hexagonal, vertical-slice, ADRs, fitness-functions |

When you need a decision rather than a lookup, use `aio-architect-advisor` instead — it provides the guided workflow.

## Volume catalog

| Vol | Focus | Articles |
|-----|-------|----------|
| 01 | Foundations | Complexity, trade-offs, boundaries, cognitive load, fitness functions, ADRs |
| 02 | Architecture Styles | Layered, modular monolith, microservices, event-driven, hexagonal, vertical slice |
| 03 | Cloud Design Patterns | Ambassador, bulkhead, CQRS, circuit breaker, saga, sidecar, strangler fig, +18 more |
| 04 | Resilience & Reliability | Error budgets, timeouts, backoff, load shedding, cell-based, chaos engineering |
| 05 | Data Architecture | Replication, partitioning, consistency models, CAP, consensus, streaming, CDC |
| 06 | Domain-Driven Design | Ubiquitous language, bounded context, aggregates, domain events, context mapping |
| 07 | API & Integration | REST, gRPC, versioning, idempotency, contracts, gateway, service mesh |
| 08 | Distributed Systems | Consistent hashing, quorum, CRDT, gossip, clocks, split brain, exactly-once |
| 09 | Operations & Delivery | SRE, SLOs, observability, deployment strategies, feature flags, platform engineering |
| 10 | Modern Paradigms | Data mesh, AI-native, edge computing, zero trust, serverless, actor model |
