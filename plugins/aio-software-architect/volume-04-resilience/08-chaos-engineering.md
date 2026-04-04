# Chaos Engineering — Break Things on Purpose

> "The best way to avoid failure is to fail constantly." — Netflix Engineering Blog

## The Problem

Every distributed system has failure modes its designers did not anticipate. Hardware fails in unexpected combinations. Network partitions occur at inconvenient moments. Dependencies degrade in ways that expose race conditions in retry logic. Backup procedures that were documented and assumed to work have not been tested in 18 months and will fail when needed. The gap between how engineers believe their system behaves under failure and how it actually behaves is, in most organizations, enormous.

The traditional response to this gap is to write more runbooks, conduct more code reviews, and add more monitoring. These practices help, but they address the design and documentation of failure handling rather than its execution. You can document a perfectly correct failover procedure and still discover, during your first real failover, that it takes 45 minutes instead of the 5 minutes documented, that three of the steps require credentials that have expired, and that one step assumes a dependency that no longer exists in the current architecture.

The only way to know how your system actually behaves under failure is to cause failures — deliberately, in controlled ways, with the team watching, before a real failure causes them in uncontrolled ways. This is the premise of chaos engineering.

The secondary problem is cultural. In most engineering organizations, causing failures in production is a fireable offense or at least a source of shame. Engineers hide failures, avoid discussing weaknesses in their systems, and resist operational changes that might reveal problems. This culture guarantees that when real failures occur, they're surprises. Chaos engineering inverts the culture: failure becomes expected, planned, measured, and learning-generating rather than shameful.

The third problem is confidence. Teams operating complex distributed systems often cannot answer basic questions: "What happens if the Redis cluster loses a node during peak traffic?" "How long does it take to fail over to the secondary database?" "If the payment service is slow, does it affect the browse experience?" Chaos engineering converts these questions from hypothetical to empirical. You run the experiment, measure the result, and know the answer rather than guessing.

## Core Concept

Chaos engineering is the discipline of experimenting on a system to build confidence in its ability to withstand turbulent conditions in production. It involves deliberately injecting failures into a running system, observing the system's response, and using the observations to improve resilience.

The Netflix definition (from the Principles of Chaos Engineering document): "Chaos Engineering is the discipline of experimenting on a system in order to build confidence in the system's capability to withstand turbulent conditions in production."

Key elements distinguish chaos engineering from simply breaking things randomly:

**Hypothesis-driven**: Before running an experiment, form a specific hypothesis. "If we kill one Kafka broker, consumer lag should remain below 10,000 messages and resolve within 5 minutes." This is different from "let's see what happens." The hypothesis makes the experiment falsifiable and gives success criteria.

**Controlled blast radius**: Start with experiments that affect the smallest possible scope (a single process, a single node) and escalate only after establishing the system handles small failures correctly. Never start with "kill the primary database in production."

**Monitoring during experiments**: The experiment is only valuable if you're observing the right metrics during it. Prepare dashboards, alerts, and specific metrics to watch before starting. The observation is as important as the injection.

**Stop conditions**: Define conditions that trigger immediate abort. If latency exceeds 5x normal or error rate exceeds 10%, stop the experiment and restore normal conditions. Don't let an experiment become a real outage.

**Learning orientation**: The goal is to learn, not to prove the system is resilient. A failed experiment (one where the system doesn't behave as hypothesized) is more valuable than a successful one, because it reveals a real gap that can be fixed.

### The Escalation Ladder

Chaos experiments should escalate from least to most impactful:

**Level 1 — Process failures**: Kill a single process (not the host). A single application instance dies; the load balancer routes to others. This is the least impactful experiment and should be the baseline.

**Level 2 — Resource starvation**: CPU spike, memory pressure, disk fill, network bandwidth limit on a single instance. Tests resource exhaustion handling.

**Level 3 — Network faults**: Latency injection (add 200ms to calls from service A to service B), packet loss injection (5% packet loss), bandwidth throttling. Tests timeout handling and graceful degradation under slow dependencies.

**Level 4 — Node failure**: Kill an entire host/VM. Tests load balancing, replication lag, connection pool recovery.

**Level 5 — AZ failure**: Take down an entire availability zone (block all traffic to/from the zone, or kill all instances in the zone). Tests multi-AZ failover.

**Level 6 — Region failure**: Simulate complete regional failure. Tests cross-region failover. This should only be run by mature chaos engineering programs with extensive automation.

The escalation principle: only move to the next level after verifying the system handles the current level correctly. If your system can't handle a single process death without user-visible impact, running an AZ failure experiment will only confirm that your system is broken.

## Deep Dive

The intellectual lineage of chaos engineering runs through a specific insight that Netflix's engineering blog articulated after their 2008 database corruption incident: the gap between "how we believe our system behaves under failure" and "how it actually behaves" is always larger than engineers think, and the only way to close it is to cause failures on purpose. This is not a novel observation — aerospace and military engineering have practiced deliberate failure testing for decades — but its application to production software services was genuinely new. The Netflix team's contribution was recognizing that the organizational resistance to production failure testing is itself a symptom of the same problem: in organizations where failure is shameful, failure modes are hidden rather than examined.

The Principles of Chaos Engineering document, published by Netflix in 2018 as a community specification, formalizes chaos engineering in a way that distinguishes it from simply breaking things. The distinction hinges on four elements: steady-state hypothesis, real-world events, production experimentation, and continuous automation. Of these, the steady-state hypothesis is the most conceptually important. A hypothesis must specify a measurable quantity ("95th percentile latency remains below 200ms") and a threshold ("during the experiment and for 5 minutes after"). Without this, there is no experiment — only destruction. The hypothesis converts chaos engineering from a stress test (how badly can we break it?) into a scientific experiment (does our system maintain this property under this perturbation?).

The escalation ladder — process failure → resource starvation → network faults → node failure → AZ failure → region failure — encodes a specific theory about how reliability knowledge accumulates. Each level reveals a distinct class of failure modes. Process-level experiments reveal whether load balancers detect failures quickly enough and whether connection pools drain correctly. Network fault injection (latency, packet loss) reveals timeout misconfiguration and retry amplification that process-level experiments cannot trigger. AZ-level failure reveals whether failover capacity is pre-provisioned and whether control plane dependencies block automated recovery. The ladder principle is that you cannot learn what higher levels reveal until you have mastered lower levels — a service that cannot handle single-process failure will fail catastrophically at the AZ level, and the catastrophic failure will obscure the specific lessons the AZ-level experiment was meant to teach.

The SRE Book's treatment of chaos engineering is embedded in its chapter on testing for reliability and its discussion of GameDays. The book's specific contribution is the observation that testing reliability is qualitatively different from testing correctness. Correctness tests verify that the system does what it is supposed to do under specified conditions. Reliability tests verify that the system degrades gracefully under conditions that the specification did not anticipate. The SRE Book argues that correctness testing is necessary but not sufficient for reliability — a system can pass all correctness tests and still fail catastrophically under novel failure combinations. GameDays introduce the novel combinations that correctness tests miss by design.

Nygard's *Release It!* identifies the specific failure modes that chaos engineering is most effective at catching: the integration point failures, the resource pool exhaustion scenarios, the chain reaction cascades. Nygard observes that these failure modes are almost never exercised in normal testing because the test environment does not replicate the dependency failure conditions that trigger them. A service that handles database errors correctly in unit tests may handle them incorrectly in production because the unit test used a synchronous mock that fails instantly, while the production database fails by becoming slow and unresponsive. Chaos engineering injects the realistic failure mode — slow, not instant — and reveals the timeout and connection pool behavior that unit tests cannot test.

The pre-mortem technique documented in the Builder's Library represents chaos engineering applied prospectively rather than retrospectively. A pre-mortem asks the team to imagine it is six months in the future and a major outage has just occurred — then to work backward to identify the most plausible failure chains that could lead to it. This technique surfaces the failure modes that engineers know about but haven't yet addressed, the implicit dependencies that haven't been acknowledged, and the runbook gaps that would slow incident response. Combined with retrospective chaos experiments (testing failure modes that have already occurred), pre-mortems create a continuous cycle of failure mode discovery and mitigation. The SRE Book recommends documenting the results of both pre-mortems and chaos experiments in the same place — the failure mode library — so that the organization accumulates institutional knowledge about its systems' failure behavior rather than rediscovering the same modes repeatedly.

## Implementation Guide

### Step 1: Start with Observability

You cannot run chaos experiments without measuring the system's response. Before injecting any faults, ensure you have:

- **Request error rate**: Percentage of requests returning 5xx
- **Latency percentiles**: p50, p95, p99 for key endpoints
- **Dependency health**: Error rate and latency for each dependency your service calls
- **Resource utilization**: CPU, memory, network, disk for each instance
- **Business metrics**: The metrics that actually matter (orders per minute, active users, revenue)

Set up a dedicated chaos experiment dashboard before running your first experiment. During the experiment, this dashboard is your primary information source.

### Step 2: Write Hypotheses

For each experiment, write a specific, measurable hypothesis:

```
Experiment: Kill one application server instance during normal traffic

Hypothesis: The load balancer detects the failure within 30 seconds.
User-visible error rate does not exceed 0.1%. 
P99 latency remains below 500ms throughout.
Healthy capacity is restored within 60 seconds via auto-scaling.

Stop conditions:
- Error rate exceeds 5%
- P99 latency exceeds 2000ms
- Experiment runs longer than 10 minutes without recovery
```

Writing hypotheses forces precision about what "correct behavior" means. Without them, it's impossible to determine whether the experiment succeeded.

### Step 3: Start in Non-Production

Run your first experiments in a staging or pre-production environment that mirrors production closely. This builds familiarity with the chaos tooling and experiment process before running in production.

However: non-production environments often have different load patterns, different infrastructure configurations, and different failure modes than production. Experiments in non-production validate tooling and process, not production resilience. Eventually, experiments must run in production to be meaningful.

### Step 4: Use AWS Fault Injection Service or Equivalent

For AWS environments:

```json
{
  "description": "Kill one ECS task and verify service continues",
  "targets": {
    "ecs-tasks": {
      "resourceType": "aws:ecs:task",
      "resourceTags": {"Environment": "production", "Service": "api"},
      "selectionMode": "RANDOM(1)"
    }
  },
  "actions": {
    "stop-task": {
      "actionId": "aws:ecs:stop-task",
      "parameters": {},
      "targets": {"Tasks": "ecs-tasks"}
    }
  },
  "stopConditions": [
    {
      "source": "aws:cloudwatch:alarm",
      "value": "arn:aws:cloudwatch:...:alarm:HighErrorRate"
    }
  ],
  "roleArn": "arn:aws:iam::...:role/FISExperimentRole"
}
```

For Kubernetes environments, Chaos Mesh and Litmus Chaos provide equivalent functionality. For network-level fault injection, tc (Linux traffic control) or tools like Toxiproxy can inject latency and packet loss.

### Step 5: Automate and Schedule

Manual chaos experiments run rarely and have high setup cost. Automate experiments and schedule them to run regularly:

```python
# Run the "random instance termination" experiment every weekday
# Abort if business hours error rate is already elevated
def run_scheduled_chaos():
    if current_error_rate() > 0.5:
        log.info("Error rate already elevated, skipping chaos experiment")
        return
    
    if not is_business_hours():
        return
    
    experiment = build_instance_termination_experiment()
    run_with_monitoring(experiment, duration_minutes=30)
    record_results()
```

Start with low-frequency automation (weekly) and increase frequency as your systems demonstrate resilience. Netflix's end state (daily automated chaos) is the goal, not the starting point.

### Step 6: Fix Issues and Rerun

Every failed experiment (where the system didn't behave as hypothesized) generates bugs. Assign those bugs to owning teams with priority proportional to the blast radius of the failure. After fixes are deployed, rerun the same experiment to verify the fix worked.

Track experiment results over time: the number of "failed" (hypothesis not met) experiments should decrease as the system matures. If it's not decreasing, either the fixes aren't working or the experiments aren't targeting the right failure modes.

## When to Use / When NOT to Use

**Chaos engineering is valuable when:**
- Your service handles production traffic and has real users
- You have sufficient observability to detect failures during experiments
- Your team has on-call coverage during experiment windows
- You have a basic incident response process established

**Chaos engineering is premature when:**
- You don't have monitoring that would detect a failure during the experiment
- Your team doesn't have on-call coverage (you can't monitor and respond during experiments)
- Your service is new and hasn't been hardened through normal operational experience first
- Your system is already too fragile — fix obvious reliability issues before chaos experiments

**Run chaos experiments in production when:**
- Non-production experiments have been successful for several weeks
- You have clear stop conditions and automated abort triggers
- Stakeholders are informed that controlled experiments will run
- You have a rollback plan for every experiment

## Common Mistakes

**Starting too large**: Killing an AZ before testing single-instance failure is backwards. Start with the smallest scope and escalate. Every level reveals issues; fix them before escalating.

**Not having stop conditions**: An experiment without stop conditions can become a real outage. Define conditions that trigger immediate abort before running anything.

**Running without observation**: Chaos injection without monitoring is destruction, not experimentation. If you're not watching metrics during the experiment, you're not learning anything.

**Treating failed experiments as failures**: When an experiment reveals a gap (the system doesn't behave as hypothesized), that's a success — you found a real problem before users found it. Celebrate the finding, don't hide it.

**Not fixing the findings**: Running chaos experiments, finding issues, and not fixing them is worse than not running experiments at all. You now know about problems but haven't addressed them. Every experiment must generate action items with owners and deadlines.

**Only running during business hours forever**: Starting chaos during business hours is correct. Eventually, failures happen at all hours. Mature programs run some experiments at off-hours specifically to validate on-call procedures and alert routing.

## Connections

**Error budgets (Article 01)**: Chaos experiments deliberately consume error budget. Schedule experiments during periods when budget is healthy. The budget state should influence experiment frequency and scope.

**Graceful degradation (Article 09)**: Chaos experiments validate graceful degradation — does the system correctly reduce functionality when dependencies fail, or does it fail completely?

**Static stability (Article 06)**: Control plane failures are excellent chaos targets. Does the data plane continue operating when the control plane is unavailable?

**Cell-based architecture (Article 07)**: "Kill an entire cell" is a natural chaos experiment for cell-based systems. Verify that the router correctly handles the failure and other cells are unaffected.

**Safe deployments (Article 14)**: Rollback procedures should be chaos-tested. Does an automated rollback work correctly? How quickly?

## Key Insights

The deepest insight of chaos engineering is that the gap between "how we think the system works" and "how it actually works" is always larger than engineers believe. Distributed systems have emergent failure behaviors that appear only under specific combinations of failures and load. The only way to discover these behaviors is to cause failures deliberately.

Netflix's cultural contribution — making failure an everyday occurrence rather than an emergency — is as important as the technical tooling. In an organization where failures are shameful, failure modes are hidden and unexamined. In an organization where failures are expected and planned, failure modes are discovered, documented, and fixed as a normal part of engineering work.

The escalation ladder deserves emphasis: chaos engineering done wrong is just outages with extra steps. The discipline is in starting small, forming hypotheses, maintaining stop conditions, and escalating only after verifying resilience at each level. A team that skips to AZ failure experiments before their services can handle single-process failures is not doing chaos engineering — they're doing chaos.

The long-term objective is not to run periodic GameDays forever. It's to build systems that are so well understood and so demonstrably resilient that the chaos experiments are boring — they always confirm that the system handles failures correctly. That boredom is a measure of engineering maturity.
