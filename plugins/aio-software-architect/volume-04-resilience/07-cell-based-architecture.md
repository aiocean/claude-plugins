# Cell-Based Architecture — Blast Radius Containment

> "The best way to limit the damage from a failure is to limit the size of the thing that can fail." — Werner Vogels, AWS CTO

## The Problem

At a certain scale, global deployments become their own risk. A single bug deployed globally affects every user simultaneously. A database migration that takes down the primary affects all reads and writes. A configuration change that causes latency spikes degrades the entire product. The very practices that provide scale — global replication, centralized data stores, uniform deployments — also create global blast radius when they go wrong.

The scale problem compounds with complexity. As systems grow, the number of ways they can fail grows faster than linearly. More services, more dependencies, more configuration surfaces, more operational decisions to make correctly. The statistical probability of a failure of some kind increases. The question shifts from "how do we prevent all failures?" (impossible) to "how do we ensure that any given failure affects only a bounded portion of users?"

Traditional availability approaches don't solve this. Multi-AZ deployments protect against hardware failures but don't protect against software bugs that affect all AZs simultaneously. Multi-region deployments add geographic resilience but a single code deployment typically targets all regions. Blue-green deployments reduce deployment risk but don't bound the blast radius of data issues or configuration changes that span both environments.

The second problem is that large services are hard to operate. When a global service has an incident, the operational cognitive load is immense: every engineer in every region is working the same incident, communication is chaotic, and the pressure to make rapid changes (that might make things worse) is intense. A smaller blast radius doesn't just protect users — it reduces the operational intensity of incident response.

The third problem is progressive deployment. How do you validate a change affecting a billion users? You can't test at full scale before deploying. You can deploy to a small percentage of users first, but if you have a single global service, "deploying to 1% of users" means running two versions of your service simultaneously with complex traffic splitting logic. Cell-based architecture makes progressive deployment natural: deploy to one cell, validate, deploy to the next.

## Core Concept

Cell-based architecture partitions a service into independent, self-contained deployment units called cells. Each cell is a complete stack of all the services needed to serve a subset of the overall user population. Cells share nothing with each other — no databases, no message queues, no configuration systems, no deployment pipelines. A failure in one cell is completely isolated from all other cells.

The defining properties of a cell:

**Autonomy**: Each cell can serve its user population completely independently. No cross-cell calls for normal operation. No shared state that would create cross-cell dependencies.

**Uniform size**: All cells are the same size (handle the same load). This makes capacity planning, deployment, and operations predictable.

**Complete stack**: Each cell contains all the layers needed to serve its users — application servers, databases, caches, queues. Nothing is shared between cells.

**Bounded blast radius**: A failure, bug, or bad deployment in one cell affects only that cell's user population and nothing else.

### Cell Sizing

The most important architectural decision in cell-based design is cell size. Too large, and the blast radius benefit is reduced — one cell failure still affects many users. Too small, and the operational overhead becomes prohibitive — hundreds of cells each needing independent monitoring, scaling, and maintenance.

Common sizing approaches:

**By user count**: Each cell serves a fixed maximum number of users (e.g., 1 million users per cell). New cells are added as the user base grows.

**By request rate**: Each cell handles up to X requests per second. This aligns cell size with infrastructure capacity rather than user count.

**By organization**: In B2B products, each enterprise customer gets a dedicated cell. Cell size varies by customer size.

**By geography**: Each cell covers a geographic region. Users are routed to their regional cell for data locality and latency reasons.

AWS's guidance suggests starting with 1/10th of your total expected capacity per cell, giving you 10 cells. This bounds any single cell failure to 10% of users, while keeping the cell count manageable.

### The Cell Router

Traffic must be directed to the correct cell. The cell router (sometimes called a partition router or cell gateway) is the component that maps each request to a cell based on a partition key.

The partition key is usually:
- User ID or account ID (most common)
- Customer/tenant ID (for B2B services)
- Geographic region (for latency-sensitive services)
- Hash of device ID (for unauthenticated users)

The cell router must be:
- Highly available (it's in the critical path of all traffic)
- Simple (complex routing logic is a failure surface)
- Fast (sub-millisecond routing decisions)
- Stateless with respect to cell content (the router knows which cell to use, not what's in it)

The routing table — the mapping from partition key range to cell — should be stored in a highly available, geographically distributed store. Route 53, a global database, or a configuration file baked into the router binary are all options depending on the frequency of changes needed.

### Poison Pill Isolation

One of the most valuable properties of cells is poison pill isolation. A "poison pill" is a request that causes the handling service to crash, enter an infinite loop, or corrupt its state. In a non-cell architecture, a single poison pill request can propagate to all servers as load balancers retry it across the fleet. Each server that receives it goes down; eventually the entire fleet is down from one bad request.

In a cell architecture, a poison pill request goes to one cell (determined by the routing key) and stays there. If it crashes every instance in that cell, only that cell is affected. The 90% of users on other cells are unaffected. The operator can identify the poison pill, take the affected cell offline, fix the issue, and bring it back — all without affecting other cells.

This isolation makes poison pills manageable rather than catastrophic. The blast radius of a worst-case request is bounded by design.

## Deep Dive

The AWS Cell-based Architecture whitepaper is one of the more candid pieces of engineering documentation that a major cloud provider has published, because it describes not just the target architecture but the failure modes that motivated it. The early Amazon retail architecture — a set of large shared services — had a property that seems obvious in retrospect but was not widely appreciated at the time: the blast radius of any failure was bounded only by the size of the shared service. A bug in the checkout service took down checkout for all users. A bad database migration affected all users' data simultaneously. The cell-based redesign did not eliminate these failure modes — it bounded them. A bad deployment to one cell affects at most one cell's user population and can be rolled back while other cells continue serving normally. The blast radius transformation — from "all users" to "bounded fraction of users" — is the architectural achievement that justifies the operational complexity.

The SRE Book's treatment of cascading failures provides the theoretical backing for why cell isolation is so valuable. Cascade failures in distributed systems propagate through shared resources: a slow service causes connection pool exhaustion at its callers, which causes those callers to slow down, which causes their callers' connection pools to exhaust, and so on. The SRE Book identifies the key property that determines cascade propagation: shared dependencies. Two services that share no resources — no databases, no queues, no connection pools — cannot cascade failures to each other regardless of how one of them fails. Cell isolation is the architectural expression of eliminating shared dependencies: each cell is a complete stack with no inter-cell resource sharing, so failures in one cell literally cannot propagate to another through any technical mechanism.

The poison pill isolation property of cell-based architecture is analyzed in the Builder's Library with a specificity that reveals its operational importance. A poison pill request — one that causes the handling service to crash, loop indefinitely, or corrupt local state — is particularly dangerous in shared architectures because retry logic and load balancing will distribute it across the entire fleet as each instance attempts to process it and fails. In a cell-based architecture, the routing layer ensures the poison pill consistently routes to the same cell (because the routing key maps to a specific cell). The blast radius of the worst possible request is bounded to that cell's user population. The critical operational consequence: the team can identify, isolate, and fix the poison pill without interrupting service for the 90% of users on unaffected cells. Without cell isolation, the same incident requires fleet-wide emergency response.

Kleppmann's analysis of partitioning in *DDIA* illuminates the data architecture choices that cell-based designs require. DDIA distinguishes between systems where cross-partition queries are impossible (each partition is fully self-contained) and systems where cross-partition operations are needed but expensive (requiring coordination across partitions). Cell-based architecture works best when the partition key — usually user ID or account ID — cleanly separates the data model. Social graphs, where users interact with each other's data across cell boundaries, are hard to partition cleanly. E-commerce, where most operations involve a single user's session and order history, partitions naturally. DDIA's concept of "hotspots" — partitions receiving disproportionate load — applies to cells: a large enterprise customer assigned to one cell may generate orders of magnitude more load than typical users, requiring either oversized cells or special handling for high-volume tenants.

The progressive deployment property of cell-based architecture is underappreciated in most discussions of the pattern. The SRE Book devotes significant attention to the question of how to validate changes at scale: you cannot load-test a change for a billion users before deploying it to a billion users. Cell-based architecture resolves this by making progressive deployment natural rather than a special case. Deploy to Cell 1 (the canary cell, typically serving internal users), measure for 30 minutes, deploy to Cell 2 (a small fraction of external users), measure, expand. Each cell is an independent validation cohort. The rollback scope is a single cell. The blast radius of a bad deployment is bounded by the number of cells deployed before the validation gate catches the problem. This is qualitatively different from the alternative — deploying to a percentage of instances globally — which provides statistical blast radius reduction but not the hard isolation that prevents cascade propagation across the full fleet.

## Implementation Guide

### Step 1: Choose Your Partition Key

The partition key determines how users are assigned to cells. It must be:
- Available at routing time (before the request is processed)
- Stable (shouldn't change frequently — user ID is good; IP address is bad)
- Well-distributed (roughly equal number of users per cell)

For most applications, user ID or account ID is the right choice. Hash the ID to an integer, then map integer ranges to cells.

```python
def get_cell_for_user(user_id: str, num_cells: int) -> int:
    # Consistent hash to cell number
    h = hashlib.sha256(user_id.encode()).digest()
    cell_num = int.from_bytes(h[:4], 'big') % num_cells
    return cell_num
```

### Step 2: Design the Cell Stack

Define what goes in each cell. A typical web service cell includes:

```
Cell N:
├── Application servers (2-N instances for HA)
├── Primary database (1 instance + read replicas)
├── Cache layer (Redis cluster)
├── Message queue (for async work)
├── Internal service discovery (cell-local only)
└── Monitoring and alerting (cell-specific dashboards)
```

Critically: cells must share nothing except:
- The cell router (which routes to cells but has no cell state)
- Shared external dependencies like email providers, SMS gateways (with appropriate isolation)
- Global read-only reference data (product catalog, static config) — if this data is updated, update all cells independently

### Step 3: Build the Cell Router

```go
type CellRouter struct {
    routingTable map[CellID]CellEndpoint
    numCells     int
}

func (cr *CellRouter) Route(userID string) CellEndpoint {
    cellID := cr.computeCell(userID)
    endpoint, ok := cr.routingTable[cellID]
    if !ok {
        // Cell not found — route to default cell or error
        return cr.defaultCell()
    }
    return endpoint
}

func (cr *CellRouter) computeCell(userID string) CellID {
    h := fnv.New32a()
    h.Write([]byte(userID))
    return CellID(h.Sum32() % uint32(cr.numCells))
}
```

The router's routing table can be stored in:
- Route 53 with weighted routing policies (one record per cell)
- A config file baked into the router binary (updated via deployment)
- A database with aggressive local caching
- Kubernetes ConfigMap or similar

### Step 4: Deploy Cells Independently

Each cell gets its own deployment pipeline. Deployment sequence:
1. Deploy to cell 1 (typically your internal/dogfood cell)
2. Run automated validation (smoke tests, key metrics)
3. Deploy to cell 2 (small percentage of users — e.g., 10%)
4. Monitor for 15-30 minutes
5. Continue rolling out cells with increasing traffic percentages
6. Any alert triggers a stop; automated rollback of the last deployed cell

```yaml
# Example GitOps deployment sequence
cells:
  - name: cell-internal
    users: internal_employees
    deploy_order: 1
  - name: cell-01
    users: 0-9% of user IDs
    deploy_order: 2
    bake_time: 30m
  - name: cell-02
    users: 10-19% of user IDs
    deploy_order: 3
    bake_time: 20m
  # ... remaining cells deploy in parallel after cell-02 validates
```

### Step 5: Implement Cell Health Monitoring

Monitor each cell independently. Key metrics per cell:
- Error rate (requests returning 5xx)
- Latency percentiles (p50, p95, p99)
- Capacity utilization (CPU, memory, DB connections)
- Deployment status (version, last deploy time)

A cell that deviates significantly from fleet-wide metrics is a signal to investigate. Automated deployment gates should compare the newly deployed cell's metrics against the fleet baseline before continuing the rollout.

### Step 6: Handle Cross-Cell User Migration

Occasionally users need to move between cells (rebalancing, customer tier changes). Cross-cell migration is the hardest operational challenge in cell-based architecture because it requires:
1. Copying the user's data from old cell to new cell
2. Freezing writes during the migration window (or implementing dual-write)
3. Updating the routing table to point to the new cell
4. Verifying migration success
5. Cleaning up data from the old cell

Keep migration logic simple and explicit. A migration tool that can move one user at a time is more reliable than a bulk migration system. Run migrations during low-traffic windows. Have a rollback path for every migration step.

## When to Use / When NOT to Use

**Cell-based architecture is justified when:**
- A single deployment failure would affect more users than is acceptable
- You need to validate deployments progressively before full rollout
- You have clear partition keys that can route users to cells consistently
- Operational scale is sufficient to manage multiple independent deployments
- You need to accommodate customers with different isolation requirements (dedicated cells for enterprise)

**Cell-based architecture is premature when:**
- Your service handles fewer than 1 million users (the blast radius of a global deployment is acceptable)
- Your team is small (fewer than 10 engineers) — operational overhead of multiple cells is significant
- Your data model has too many cross-user dependencies to partition cleanly
- You're still iterating rapidly on the product (cell boundaries constrain architectural flexibility)

**Warning signs that cells are too complex:**
- Your "cells" share a database (they're not cells — they're replicas)
- Cross-cell calls are common in normal operation (the partition key is wrong)
- Cell count exceeds team size by more than 10:1 (operational overhead is unsustainable)

## Common Mistakes

**Shared state between cells**: If two cells share a database, message queue, or configuration system, they're not independent — they're just labeled separately. A failure in the shared component affects both "cells" simultaneously. Audit every dependency for cross-cell sharing.

**Wrong partition key**: Choosing a partition key that doesn't cleanly partition the data model (e.g., partitioning by user ID when users frequently query each other's data) creates constant cross-cell calls. Design the partition key to minimize cross-cell data access.

**Cell router as single point of failure**: The router handles all traffic. Make it stateless, horizontally scalable, and deploy it with higher redundancy than the cells themselves.

**Not automating deployment validation**: Cell-by-cell deployment is only safer than global deployment if you actually validate each cell before continuing. Manual validation is too slow and too error-prone. Automate the validation gates.

**Too many cells too soon**: Start with 2-3 cells. Learn the operational model. Scale to more cells as your team and tooling mature. Starting with 50 cells before you have experience is overwhelming.

**Ignoring cell rebalancing**: As your user base grows unevenly, some cells become larger than others. Plan for cell rebalancing from the beginning, even if you don't implement it immediately.

## Connections

**Shuffle sharding (Article 05)**: Shuffle sharding operates within a shared pool; cell-based architecture creates completely separate pools. They solve related problems at different scales.

**Static stability (Article 06)**: Cells should be statically stable — each cell operates independently of the cell router and other cells. If the router is unavailable, in-progress requests complete using cached routing.

**Safe deployments (Article 14)**: Cell-based architecture is the enabling technology for progressive deployments. Deploy one cell, validate, expand.

**Chaos engineering (Article 08)**: Chaos experiments in cell-based systems should include "take down an entire cell" as a standard scenario, verifying that the router correctly handles the failure and other cells are unaffected.

**Correlated failures (Article 13)**: Cells are the primary mechanism for preventing correlated failures across the user base. A bad deployment, poison pill request, or data corruption that hits one cell cannot propagate to others.

## Key Insights

Cell-based architecture is an organizational and operational pattern as much as a technical one. The technical implementation — separate deployments, independent databases, partition-key routing — is straightforward. The discipline of maintaining true independence between cells, resisting the temptation to create shared services for convenience, is where most implementations struggle.

The blast radius math is compelling: with 10 equal cells, any single cell failure affects at most 10% of users. This transforms "global outage" events into "10% degradation" events. For a service with millions of users, the difference between these outcomes is enormous — both in user impact and in the operational intensity of the incident response.

Progressive deployment is the killer feature that justifies the operational overhead for most teams. The ability to deploy to 10% of users, monitor for 30 minutes, and continue or rollback based on real metrics is qualitatively different from "deploy and hope." Cell-based architecture makes this workflow natural rather than a special case.

The irreducible cost is operational overhead. Every cell needs monitoring, has its own databases to maintain, and receives its own deployments. A team that manages 10 cells has roughly 10x the operational surface area of a team managing a single deployment. This cost is real, and it's the main reason to resist adopting cells until scale genuinely requires them.
