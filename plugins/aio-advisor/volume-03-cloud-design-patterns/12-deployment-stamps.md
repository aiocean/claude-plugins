# Deployment Stamps Pattern

> "The deployment stamps pattern deploys multiple independent copies of application components, including data stores. Each copy is called a stamp, or sometimes a service unit or scale unit." — Azure Architecture Center, Microsoft

## The Problem

Your SaaS application serves 50,000 customers. It runs on a single cluster in a single AWS region with a single PostgreSQL database. Life is simple. You deploy once, everyone benefits. Then you win a contract with a European healthcare company that requires all patient data to be stored in the EU under GDPR. You win a contract with a Japanese financial institution that requires data residency in Japan. You win a US Department of Defense contract that requires an air-gapped deployment with no shared infrastructure with commercial customers.

Suddenly, "one deployment serving everyone" is incompatible with your customer requirements. Data sovereignty, regulatory compliance, network latency for geographically distributed users, and tenant isolation requirements all push in the same direction: some customers need their own independent deployment.

Even without regulatory requirements, scale creates problems. Your single database is approaching its write throughput limit. You could scale vertically (bigger RDS instance), but you're already on the largest instance size. You could shard, but sharding a live database is one of the hardest operations in engineering. Your deployment pipeline for the single cluster takes 90 minutes and touches everything — a bad deployment can take down all 50,000 customers simultaneously.

The Deployment Stamps pattern addresses all of these. You deploy multiple independent copies — stamps — of your entire application stack, each with its own data stores, each serving a subset of customers. Regulatory requirements are met by placing certain stamps in specific regions. Scale is met by adding more stamps. Blast radius is reduced because a bad deployment or infrastructure failure affects only one stamp's customers, not everyone.

## Core Concept

A deployment stamp is a complete, independent copy of all the application components needed to serve a group of customers. It includes the application tier, all backing data stores (databases, caches, queues), and all supporting infrastructure. Stamps are self-contained — they share no state with other stamps.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Global Layer                                │
│                                                                 │
│  ┌─────────────────┐   ┌──────────────────────────────────────┐ │
│  │  DNS / Traffic  │   │  Stamp Router                        │ │
│  │  Manager        │   │  (maps customer → stamp)             │ │
│  └────────┬────────┘   └──────────────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────────┘
            │
    ┌───────┼───────────────────────────────────────┐
    │       │                                       │
    ▼       ▼                                       ▼
┌───────┐ ┌─────────────┐                  ┌─────────────┐
│Stamp 1│ │   Stamp 2   │                  │   Stamp 3   │
│(US)   │ │   (EU)      │                  │   (JP)      │
│       │ │             │                  │             │
│ App   │ │  App        │                  │  App        │
│ Cache │ │  Cache      │                  │  Cache      │
│ DB    │ │  DB         │                  │  DB         │
│       │ │             │                  │             │
│Tenants│ │Tenants      │                  │Tenants      │
│A,B,C  │ │D,E (EU req.)│                  │F (JP req.)  │
└───────┘ └─────────────┘                  └─────────────┘
```

The stamp is the unit of:
- **Deployment**: You deploy to one stamp without affecting others
- **Scaling**: You add a new stamp when existing stamps approach capacity
- **Isolation**: A failure in one stamp affects only that stamp's tenants
- **Compliance**: You place stamps in specific regions to meet data residency requirements

### Stamp sizing

A critical design decision: how large should a stamp be? This is "stamp sizing."

Small stamps (few tenants per stamp) provide better isolation but more operational overhead — more deployments to manage, more databases to monitor, more infrastructure to provision. Large stamps (many tenants per stamp) are more efficient but reduce isolation benefit.

The right stamp size depends on:
- Tenant count: how many tenants does a stamp support before it needs splitting?
- Blast radius tolerance: what is the acceptable impact of a single stamp failure?
- Operational overhead tolerance: how many stamps can your team manage?
- Regulatory partitioning: some tenants must be on specific stamps by compliance requirement

Azure's guidance: start with enough capacity for 10-20% of your total tenant base per stamp, then measure and adjust.

### Relationship to cell-based architecture

Cell-based architecture (popularized by AWS's internal architecture and described in their Builder's Library) is essentially the Deployment Stamps pattern with a specific operational philosophy:

- Each "cell" is a stamp
- Cells are sized by a "cell unit" — a fixed amount of capacity (e.g., each cell handles 10,000 users)
- Cells are added as needed (provisioning a new cell when user count approaches a cell's capacity)
- Cells never share state
- Traffic routing uses consistent hashing to assign users to cells

The terminology differs ("cell" vs "stamp") but the pattern is identical.

## Deep Dive

**Cell-based architecture and blast radius reduction.** The AWS Builder's Library article "Avoiding insurmountable queue backlogs" by David Yanacek and the related talks by Colm MacCarthaigh on cell-based architectures provide the foundational analysis for the Deployment Stamps pattern's value proposition. MacCarthaigh's argument is quantitative: in a fleet-based architecture, a pathological request pattern from one customer can consume resources across the entire fleet, affecting all customers simultaneously. Cell-based deployment bounds this to a cell. With N cells of equal size, the worst-case blast radius for a single customer's impact is 1/N of total capacity. A bug in a newly deployed version affects only the cell it was deployed to while canary evaluation runs. A database corruption affects only that cell's data. The stamp is the unit of failure containment at the infrastructure level.

**The shuffle sharding insight.** MacCarthaigh's AWS re:Invent talk on shuffle sharding extends the Deployment Stamps concept in a mathematically precise direction. Standard stamp assignment is deterministic: customer A is on stamp 1, customer B is on stamp 2. A noisy customer on stamp 1 affects all other stamp-1 customers. Shuffle sharding assigns each customer to a random subset of nodes (not a single node), with the subset size chosen so the probability of two customers sharing all nodes in their subset is vanishingly small. With 8 nodes and subsets of 2, the probability that any two customers share their complete subset is (2/8) × (1/7) ≈ 3.6%. This means a noisy customer's blast radius is bounded to their 2-node subset, and the probability that another customer shares that exact subset is low. The mathematical argument makes this a strictly stronger isolation guarantee than single-stamp assignment.

**Data residency and regulatory partitioning.** The Google SRE Book's treatment of multi-region deployment addresses a dimension of the Deployment Stamps pattern that is often the primary business driver: regulatory compliance. GDPR requires that EU citizen data remain in EU-controlled infrastructure. HIPAA requires that health data meet specific security standards. Financial regulations in many jurisdictions require that data not leave the country. A single global deployment violates these requirements by design — data may flow across region boundaries during processing, replication, or failover. Stamps provide the isolation boundary that enables compliance: a stamp dedicated to EU customers processes and stores data exclusively within EU infrastructure. The stamp boundary is the compliance boundary. This is not a performance optimization — it is a legal requirement for many enterprise SaaS products, and the Deployment Stamps pattern is the architectural mechanism that satisfies it.

**Stamp provisioning and infrastructure drift.** Sam Newman's *Building Microservices* addresses the operational challenge that emerges at scale with multiple independent deployments: infrastructure drift. If stamp 1 was provisioned 18 months ago and stamp 5 was provisioned last month, they are likely running different versions of infrastructure components, different OS patches, different dependency versions. Over time, the stamps diverge, and a fix applied to stamp 5 may not apply cleanly to stamp 1. Newman's guidance on service consistency applies: stamps must be treated as cattle, not pets. Every stamp is provisioned from the same infrastructure-as-code template; configuration differences between stamps are parameterized (region, capacity tier, customer assignment), not organic. Stamp updates are applied uniformly, with canary rollout — update one stamp, validate, then proceed to the remaining stamps.

**Tenant assignment and rebalancing.** Martin Kleppmann's *Designing Data-Intensive Applications* analysis of partitioning and rebalancing applies directly to the stamp assignment problem. Once a tenant is assigned to a stamp, moving them requires migrating their data — a complex, risky operation that must be done without service interruption. This creates a tension: early assignment decisions constrain future flexibility. A tenant assigned to stamp 1 because it had capacity at signup time may become the largest tenant in the system, now dominating stamp 1's resources. Kleppmann's treatment of rebalancing strategies (fixed number of partitions, dynamic splitting, consistent hashing) provides the vocabulary for thinking about this problem. Most stamp-based systems choose simplicity over flexibility: assignment is permanent, and capacity planning must ensure no single stamp becomes a bottleneck. The alternative — dynamic rebalancing with live data migration — is significantly more complex and is only justified when tenant size variance is extreme and unpredictable.

## Implementation Guide

### Step 1: Define the stamp template

The stamp is defined as infrastructure-as-code. Every stamp is provisioned from the same template:

```hcl
# Terraform module: stamp
module "stamp" {
  source = "./modules/stamp"

  stamp_id     = "stamp-eu-west-1-001"
  region       = "eu-west-1"
  environment  = "production"
  
  # Capacity configuration per stamp
  app_instance_count    = 4
  db_instance_class     = "db.r6g.2xlarge"
  cache_node_type       = "cache.r6g.large"
  cache_num_nodes       = 3
  
  # Compliance tags for data sovereignty
  data_residency = "eu"
  compliance     = ["gdpr", "iso27001"]
}

# Stamp module creates:
# - ECS cluster with app containers
# - RDS PostgreSQL instance
# - ElastiCache Redis cluster  
# - SQS queues for async processing
# - ALB for load balancing
# - CloudWatch alarms and dashboards
```

Every new stamp is provisioned by adding a new module invocation with a new stamp ID.

### Step 2: Implement the stamp router

Customers are assigned to stamps. The router maps customer → stamp at request time:

```typescript
class StampRouter {
  private readonly routingTable: Map<string, StampConfig>;
  
  constructor(private readonly configStore: ConfigStore) {
    // Load routing table at startup, refresh periodically
    this.refreshRoutingTable();
    setInterval(() => this.refreshRoutingTable(), 60_000);
  }
  
  async resolveStamp(customerId: string): Promise<StampConfig> {
    const config = this.routingTable.get(customerId);
    if (!config) throw new NoStampAssignedError(customerId);
    return config;
  }
  
  private async refreshRoutingTable(): Promise<void> {
    const assignments = await this.configStore.getAllStampAssignments();
    this.routingTable = new Map(
      assignments.map(a => [a.customerId, a.stamp]),
    );
  }
}

// In your API gateway or load balancer
async function routeRequest(req: Request, res: Response, next: NextFunction) {
  const customerId = extractCustomerId(req);
  const stamp = await stampRouter.resolveStamp(customerId);
  
  // Proxy to the correct stamp
  req.headers['X-Stamp-Target'] = stamp.endpoint;
  next();
}
```

### Step 3: Assign customers to stamps

Customers are assigned to stamps at onboarding:

```typescript
class CustomerOnboardingService {
  async onboardCustomer(
    customerId: string,
    requirements: CustomerRequirements,
  ): Promise<void> {
    // Select stamp based on requirements
    const stamp = await this.selectStamp(requirements);
    
    // Assign customer to stamp
    await this.stampAssignmentStore.assign(customerId, stamp.id);
    
    // Provision customer resources on the stamp
    await this.stampClient(stamp).provisionTenant(customerId, requirements);
  }
  
  private async selectStamp(requirements: CustomerRequirements): Promise<Stamp> {
    const candidates = await this.stampRegistry.getStamps({
      region: requirements.dataResidencyRegion,
      compliance: requirements.complianceRequirements,
      hasCapacity: true,
    });
    
    if (candidates.length === 0) {
      // No stamp with capacity in the required region — provision a new one
      return this.provisionNewStamp(requirements.dataResidencyRegion);
    }
    
    // Choose least-loaded stamp with capacity
    return candidates.sort((a, b) => a.tenantCount - b.tenantCount)[0];
  }
}
```

### Step 4: Progressive deployment across stamps

The stamp model enables safe, incremental deployment:

```typescript
class StampDeploymentOrchestrator {
  async deployNewVersion(version: string, stampIds: string[]): Promise<void> {
    // Deploy to stamps one at a time (or in small batches)
    for (const stampId of stampIds) {
      console.log(`Deploying ${version} to stamp ${stampId}`);
      
      await this.deployToStamp(stampId, version);
      
      // Wait and observe
      await this.waitForHealthy(stampId, { timeoutMs: 300_000 });
      
      const metrics = await this.collectMetrics(stampId, { durationMs: 120_000 });
      
      if (metrics.errorRate > 0.01) { // >1% error rate
        console.error(`Deployment to ${stampId} degraded — halting rollout`);
        await this.rollback(stampId, this.currentVersion);
        throw new DeploymentHaltedError(stampId, metrics);
      }
      
      console.log(`Stamp ${stampId} healthy — proceeding`);
    }
  }
}
```

A bad deployment is caught after affecting one stamp's customers. Other stamps continue running the previous version.

### Step 5: Handle cross-stamp concerns

Some data is global (doesn't belong to a specific stamp): authentication/identity, billing, stamp routing table. Keep this minimal:

```typescript
// Global services (not per-stamp):
// - Identity provider (single sign-on, OAuth)
// - Billing system
// - Stamp routing table / customer registry
// - Usage metrics aggregation

// Per-stamp services (everything else):
// - Application data
// - Customer-specific config
// - Transaction history
// - Application logic

// The global layer must be highly available and have its own isolation
// If the global routing table is unavailable, ALL stamps are affected
// Cache the routing table aggressively in each stamp
```

### Step 6: Monitor at the stamp level and fleet level

```typescript
// Per-stamp dashboards: error rate, latency, queue depth, db connections
// Fleet-level dashboards: aggregate across stamps, stamp health matrix

// Alert when a stamp is degraded (affects its tenant set)
// Alert when too many stamps are degraded (fleet-level issue)

// Stamp health matrix:
// Stamp          | Status  | Tenants | Error Rate | P99 Latency
// stamp-us-001   | HEALTHY | 4,200   | 0.01%      | 145ms
// stamp-us-002   | HEALTHY | 3,900   | 0.02%      | 151ms
// stamp-eu-001   | DEGRADED| 2,100   | 2.1%       | 890ms  <-- alert
// stamp-jp-001   | HEALTHY | 800     | 0.01%      | 178ms
```

## When to Use

**Multi-tenant SaaS with data residency requirements.** Regulatory compliance (GDPR, HIPAA, financial data sovereignty) is the clearest trigger. Certain customers must have their data in specific geographic regions. Stamps in those regions satisfy this requirement cleanly.

**Blast radius reduction for large customer bases.** When a single deployment serves 100,000 customers, a bad deployment or infrastructure failure affects all 100,000. Stamps limit the impact to one stamp's subset of customers.

**Progressive deployment and canary releases.** Deploy to one stamp, observe, proceed to the next. A broken deployment is caught early, affecting a small number of tenants while the rest continue normally.

**Premium tier isolation.** Offer dedicated stamp deployment as a premium product tier. High-value enterprise customers get their own stamp — no resource sharing with other tenants.

**Geographic performance.** Customers in Japan experience lower latency when served from a stamp in Tokyo rather than one in Virginia. Stamps in local regions reduce latency for geographically dispersed customer bases.

## When NOT to Use

**When you have few tenants or no isolation requirements.** If you have 50 customers and no regulatory requirements, a single deployment is simpler. Stamps multiply operational complexity — every management task (deploy, monitor, alert, backup) multiplies by the number of stamps.

**When tenants need to interact directly with each other.** If tenant A needs to share a document with tenant B, and they're on different stamps, you need cross-stamp communication. This is possible but adds complexity. Stamps work best when tenants are fully isolated from each other.

**When your team can't manage the operational overhead.** Each stamp is a deployment to manage. Five stamps means five independent deployments, five independent databases, five independent monitoring setups. If your operations team is small, stamps may create more overhead than they're worth.

**As a substitute for proper multi-tenancy within a single deployment.** Many multi-tenant isolation requirements can be met with proper row-level security, tenant-scoped encryption, and access control within a single deployment. Exhaust these options before adding stamp complexity.

## Common Mistakes

**Mistake 1: Stamps that share state.** If stamps share a database, a cache, a queue, or any other stateful component, they're not actually independent. Failures and performance issues in the shared component affect all stamps. True stamps share no state.

**Mistake 2: Manual stamp provisioning.** If provisioning a new stamp requires manual steps, you won't add stamps often enough (because it's too painful), and the stamps you have will drift in configuration from each other. Infrastructure-as-code for stamp provisioning is non-negotiable.

**Mistake 3: Not thinking about the global layer.** The stamp routing table and identity service are global components. If they go down, all stamps are affected. The global layer needs high availability design, aggressive caching at each stamp, and its own isolation — it becomes your highest-criticality infrastructure.

**Mistake 4: Ignoring cross-stamp migration.** Customers sometimes need to move between stamps (regulatory requirements change, premium tier upgrade, stamp decommission). Cross-stamp migration is complex: you must move data, update routing, handle in-flight transactions, and ensure no data loss. Design for this from the start.

**Mistake 5: Incorrect stamp sizing.** Too large (few stamps, many tenants each) reduces blast radius benefit. Too small (many stamps, few tenants each) creates unmanageable operational overhead. Right-size based on your blast radius tolerance and operational capacity.

## Connections

**Bulkhead Pattern** (Volume 03, article 04): Deployment Stamps are bulkheads at the infrastructure level. Each stamp is an isolated compartment — failure in one stamp doesn't propagate to others.

**Circuit Breaker Pattern** (Volume 03, article 07): Within a stamp, circuit breakers protect individual service dependencies. At the fleet level, the stamp router can implement circuit breaking for stamps: if a stamp is degraded, stop routing new customers to it.

**Competing Consumers** (Volume 03, article 09): Each stamp has its own consumer pools. Message processing is isolated per stamp, preventing a queue backup in one stamp from affecting processing in others.

**CQRS** (Volume 03, article 11): Within a stamp, CQRS separates read and write models. Stamps provide the isolation boundary; CQRS provides the read/write optimization within each stamp.

**Anti-Corruption Layer** (Volume 03, article 02): When stamps need to communicate (cross-stamp data access for shared features), ACLs prevent the data model of one stamp from leaking into another.

## Key Insights

1. **The stamp is the unit of everything: deploy, scale, fail, comply.** Every operational concern — deployment, scaling decision, failure impact, compliance scoping — is answered at the stamp level. This clarity is one of the pattern's greatest benefits.

2. **Infrastructure-as-code is a prerequisite, not an option.** Manual stamp management doesn't scale beyond two or three stamps. Every stamp must be provisionable from a template in minutes. Without this, the operational overhead of the pattern is too high.

3. **The global layer is your Achilles heel.** The stamp router and identity service are the shared components that, if they fail, take down the entire fleet. Invest heavily in making the global layer resilient, and design stamps to degrade gracefully when the global layer is unavailable.

4. **Progressive deployment is the operational payoff.** Deploying to stamps one at a time, with health checks between each, transforms deployment risk. A bad deployment affects one stamp's tenants rather than everyone. This alone often justifies the pattern for large customer bases.

5. **Cell-based architecture and deployment stamps are the same idea.** AWS calls them cells; Azure calls them stamps. The concept is identical. The terminology shouldn't confuse you — the pattern is: multiple independent copies, each serving a subset of users, with no shared state.

6. **Tenant assignment to stamps should be durable.** Frequently moving tenants between stamps is operationally expensive and risky. Assign tenants to stamps at onboarding and change assignments only when necessary (compliance requirement change, stamp decommission).

7. **Start with fewer, larger stamps.** Operational overhead scales with stamp count. Start with the minimum number of stamps required by your compliance and blast radius requirements. Split stamps as you grow and as the need becomes clear, not speculatively.
