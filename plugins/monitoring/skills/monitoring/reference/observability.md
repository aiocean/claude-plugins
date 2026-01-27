# Monitoring vs Observability

## The Fundamental Distinction

Term "observability" borrowed from control theory: **the ability to infer internal states from external outputs**.

**Monitoring** = **Known unknowns**
- Problems you can predict and set up alerts for in advance
- Asks predefined questions: Is CPU over 80%? Are we getting 500 errors?

**Observability** = **Unknown unknowns**
- The ability to understand novel system states without anticipating them
- Defining capability: ask new questions without shipping new code or collecting new data

> "Monitoring tools are effective for systems with a stable set of known-unknowns. For systems with predominantly unknown-unknowns, monitoring tools are all but useless." — Charity Majors

## When Monitoring Suffices

Monitoring remains appropriate for:
- Monolithic applications with few moving parts
- Simple architectures where most failure modes are predictable
- Systems where you can step through code with a debugger
- Environments where a small set of dashboards covers meaningful states

> "If you can get away with a monolith and a LAMP stack and a handful of monitoring checks, you should absolutely do that." — Charity Majors

## When You Need Observability

Observability becomes essential for:
- Distributed systems with microservices
- Containerized, ephemeral infrastructure
- Multi-tenant systems with unpredictable interactions
- High deployment velocity with frequent code changes
- Complex user journeys spanning many services
- The "hairball" problem where "everything gets slow when anything gets slow"

## The Three Pillars: Useful or Marketing?

Peter Bourgon (2018) proposed observability has "three pillars": **metrics, logs, and traces**.

| Pillar | Strengths | Limitations |
|--------|-----------|-------------|
| **Metrics** | Efficient storage, great for trends, mature tooling | Pre-aggregation locks you into predefined questions; high cardinality = cost explosion |
| **Logs** | Granular detail, supports high cardinality, compliance | Often unstructured, noisy, storage scales with volume |
| **Traces** | Essential for distributed request flow | Requires instrumentation everywhere, sampling challenges |

**The critique:** Metrics, logs, and traces are just data types—having all three doesn't guarantee observability.

> "Big Monitoring vendors actively try to define observability down to 'metrics, logs and traces' because they have metrics, logs and tracing tools to sell." — Charity Majors

The real value comes from **correlation and exploration**—connecting data across types to follow unknown trails.

## Cardinality: The Hidden Constraint

**Cardinality** = number of unique values in a data dimension.

User IDs, request IDs, session IDs are high-cardinality—and exactly what's needed for debugging specific problems.

**The tension:** High-cardinality data is most valuable for debugging, but traditional metrics tools can't handle it at scale.

When you add dimensions, storage multiplies exponentially:
`100,000 users × 50 endpoints × 5 regions × 100 builds = 2.5 billion unique time series for one metric`

**The choice:**
- Limit questions you can ask (traditional metrics)
- Adopt architectures for high-cardinality exploration (columnar databases, event-oriented models)

The latter enables true observability—asking questions you didn't anticipate.

## Event-Oriented vs Metrics-Oriented

**Metrics-oriented approach:**
- Pre-aggregate data at collection time
- Storage efficient
- Fast queries for known questions
- Struggles with ad-hoc exploration

**Event-oriented approach:**
- Store raw events with full context
- Higher storage cost
- Slower for simple aggregations
- Enables arbitrary slicing and dicing

## Building Observability

### Structured Events
Instead of separate metrics/logs/traces, emit structured events with:
- Request ID (correlation)
- User/tenant ID
- Service/endpoint
- Duration
- Result (success/failure)
- Error details if any
- Custom business context

### Wide Events
A single event captures everything about a request:
- Who made it
- What they asked for
- How long it took
- What happened internally
- What the result was

This enables: "Show me all requests from user X that hit service Y, took >2s, and failed with error Z"—without having predicted that question.

### The Analysis Loop

1. Notice something strange
2. Slice by one dimension
3. Notice a pattern
4. Slice by another dimension
5. Follow the breadcrumbs
6. Find root cause

This loop requires:
- Arbitrary dimensional slicing
- High cardinality support
- Fast exploration
- Connected data (not siloed pillars)

## Organizational Implications

**Traditional monitoring:**
- Central ops team manages
- Developers "throw over the wall"
- Dashboards created by SRE

**Observability culture:**
- Developers instrument their code
- "You build it, you run it"
- Everyone can explore production data
- Debugging is data exploration, not tribal knowledge
