::install-command
/plugin install aio-watermill-kit@aiocean-plugins
::

# aio-watermill-kit

**Production-grade reference for building event-driven Go applications with Watermill.**

Most teams reach for message brokers when they need async processing, then spend weeks rediscovering the same decisions: how to wire handlers, which middleware to stack, when CQRS pays off, and what actually differs between Kafka and Redis Streams under real load. This plugin is that knowledge distilled — a complete, opinionated reference that gets you to correct, production-ready Watermill code without detours.

## Why this plugin?

Watermill's API is clean. Its documentation is scattered. The critical decisions — middleware ordering, Ack/Nack semantics, CQRS wiring, broker trade-offs — are spread across multiple pages with no clear hierarchy. Beginners routinely conflate the three tiers and end up using the wrong abstraction for their problem.

This plugin imposes a mental model first:

- **Publisher/Subscriber** — raw control, simple produce/consume
- **Router** — where real applications live: middleware chains, handler lifecycle, multi-topic fan-out
- **CQRS** — typed commands and events when you want Go structs instead of raw `[]byte`

Every reference is written at production level. "Use `Recoverer` first" is not a hint — it is a requirement. "Design idempotent handlers" is not advice — it is the contract that at-least-once delivery imposes on every Watermill application ever written.

## Install

```bash
/plugin install aio-watermill-kit@aiocean-plugins
```

## What is covered

The skill covers the full Watermill surface in a single, navigable session:

- The three-tier architecture and when to choose each tier
- Router setup: global middleware, handler types (full vs consumer), dynamic handler registration after `Run()`
- The essential middleware stack for production — Recoverer, CorrelationID, Retry, PoisonQueue — and why that ordering is not arbitrary
- Publisher/Subscriber decorators for injecting cross-cutting metadata
- Broker selection: a decision table comparing GoChannel, Kafka, NATS JetStream, Redis Streams, AMQP, SQL, and Google Cloud Pub/Sub by throughput, ordering guarantees, and exactly-once semantics
- CQRS wiring: CommandBus, EventBus, CommandProcessor, EventProcessorGroup, and Marshalers
- Testing patterns using GoChannel — the only correct test double for Watermill
- Five common pitfalls with root causes and fixes: messages disappearing, handlers running forever, duplicate processing, graceful shutdown failures, middleware silently not applying

Four deep-dive reference files ship with the skill:

| File | Contents |
|------|----------|
| `middleware.md` | Full middleware catalog with configuration examples — Deduplicator, CircuitBreaker, Throttle, Timeout, DelayOnError, Duplicator, RandomFail, RandomPanic |
| `cqrs.md` | Complete CQRS setup: CommandBus, EventBus, EventProcessorGroup, Marshalers, topic-naming strategies |
| `pubsub.md` | Per-broker configuration and trade-off analysis — connection options, consumer group semantics, partition strategies |
| `patterns.md` | Advanced patterns: Outbox via Forwarder, Saga, Fan-in, Requeuer, RequestReply, Prometheus metrics |

## The core contract

Watermill is built on one guarantee: **at-least-once delivery**. Every design decision follows from this. Handlers must be idempotent. Errors trigger Nack and retry, not silent swallowing. The Router owns Ack/Nack — handlers that call these manually break the contract. The Recoverer middleware must always be first in the chain, because a panicking handler without it crashes the Router entirely.

These are not preferences. They are the constraints of the model.

## Requirements

- Go 1.21+ (for `slog` logger integration)
- [ThreeDotsLabs/watermill](https://github.com/ThreeDotsLabs/watermill)
