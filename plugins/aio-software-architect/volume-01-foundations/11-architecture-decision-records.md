# Architecture Decision Records

> "The most important decisions are the ones we make when we're not sure they're important." — Michael Nygard

## The Problem

A new engineer joins a team and is assigned to migrate the order processing service from synchronous HTTP calls to an event-driven model. While exploring the codebase, she notices that the inventory service is already event-driven — it publishes domain events to Kafka. Excellent. She assumes the team prefers event-driven patterns and begins designing the migration.

Three weeks into the design, a senior engineer asks why the order service is not using the message broker they already have for batch jobs — RabbitMQ. The new engineer had not known about RabbitMQ. She asks why the inventory service uses Kafka when RabbitMQ is already available. The senior engineer says something vague about Kafka being chosen "for reasons" by a developer who left the company last year. She asks if there is documentation. There is not.

Now the team must decide between Kafka, RabbitMQ, and potentially other options, without knowing why either was chosen originally, without knowing what constraints the original decisions were made under, and without knowing what the team considered and rejected. They will spend two weeks relitigating a decision that was already made, probably arrive at the same answer, and have no more documentation of their reasoning than the previous team did.

This is the architectural amnesia problem. It is not caused by negligence. Every team that has lost architectural context lost it the same way: the people who made the decision knew why, and when they left, the reasoning left with them. Code survives. Reasoning does not. And reasoning matters more than code — code can be read, but the question "why was this code written this way rather than some other way?" cannot be answered by reading the code.

Michael Nygard introduced Architecture Decision Records in 2011 as a solution to this problem. An ADR is a short, structured document that captures a single significant architectural decision: the context in which it was made, the decision itself, and the consequences it produces. ADRs live in the repository alongside the code they describe. They are immutable — you do not edit old ADRs; you write new ones that supersede them. Over time, the ADR directory becomes a navigable history of the system's architectural evolution.

## Core Concept

An ADR answers four questions about a decision:

**What was the situation?** The context section describes the forces at play when the decision was made. Technical constraints, business requirements, team capabilities, time pressures, regulatory requirements — anything that shaped the decision space belongs here. Context is the section that decays fastest; the constraints of six months ago may not be the constraints of today. But knowing what the constraints were explains why the decision made sense at the time, even if it would not be made the same way today.

**What did we decide?** The decision section states the choice clearly and unambiguously. Not "we will evaluate options for messaging" but "we will use Apache Kafka as the event streaming platform for the order domain." Specific, concrete, attributable.

**What are we accepting?** The consequences section documents both positive and negative consequences. Choosing Kafka means access to durable, replayable event streams with consumer group semantics. It also means operational complexity, JVM-based infrastructure, and a learning curve for engineers unfamiliar with Kafka's consumer model. Documenting both sides of the trade-off is critical — an ADR that only records positive consequences is marketing, not engineering.

**What did we consider and reject?** Many ADR formats add a section for alternatives considered. This is often the most valuable section for future engineers. Knowing what was evaluated and why it was rejected allows the next engineer who revisits the decision to quickly assess whether the reasons for rejection still apply.

### Nygard's Original Format

Michael Nygard's original ADR format is deliberately minimal:

```markdown
# ADR-[number]: [Short title]

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-NNN]

## Context

[Describe the forces at play. What is the situation that calls for this decision?]

## Decision

[Describe the response to the forces. State the decision clearly.]

## Consequences

[Describe the resulting context after the decision is applied. All consequences, positive and negative, should be listed here.]
```

The minimalism is intentional. A format that requires extensive documentation is a format that does not get used. Nygard designed ADRs to be low-friction — something a developer can write in twenty minutes while the context is fresh, not something that requires a two-hour writing session days after the decision.

### MADR: Markdown Architectural Decision Records

For teams that want more structure, MADR (Markdown Architectural Decision Records, by Oliver Kopp) extends the basic format:

```markdown
# [Number]. [Short title]

## Status

[Status]

## Context and Problem Statement

[Describe the context and problem statement in 2-3 sentences.]

## Decision Drivers

* [driver 1]
* [driver 2]

## Considered Options

* [Option 1]
* [Option 2]

## Decision Outcome

Chosen option: "[option 1]", because [justification].

### Positive Consequences

* [consequence 1]

### Negative Consequences

* [consequence 1]

## Pros and Cons of the Options

### [Option 1]

* Good, because [argument a]
* Bad, because [argument b]

### [Option 2]

* Good, because [argument a]
* Bad, because [argument b]
```

MADR's more structured format is useful for consequential decisions where exhaustive option analysis is warranted. The trade-off is that it takes longer to write and may be overkill for smaller decisions.

### Immutability and Supersession

A critical property of ADRs is immutability. Once accepted, an ADR is never edited. If a decision changes, a new ADR is written that supersedes the old one. The old ADR is updated only to add a "Superseded by ADR-NNN" status marker.

This immutability preserves the archaeological record. If an ADR is edited as decisions change, the history of the decision-making process is lost. With immutable ADRs and supersession, you can trace the complete history: "we decided A, then we discovered B, which changed our context, so we decided C." That narrative is far more valuable than simply knowing the current state.

The status field — Proposed, Accepted, Deprecated, Superseded — communicates the current standing of each ADR without altering its content. A Deprecated ADR documents a decision that was valid when made but has been explicitly abandoned. A Superseded ADR documents a decision that has been replaced by a subsequent decision.

### What Belongs in an ADR

Not every technical decision needs an ADR. The signal for when an ADR is warranted:

- The decision will be difficult or expensive to reverse
- Multiple reasonable options exist and the choice between them is non-obvious
- Future engineers will reasonably ask "why was this done this way?"
- The decision has significant consequences for the system's evolution
- The decision involves trade-offs that need to be explicitly understood and accepted

Decisions that do not need ADRs: implementation details within a bounded component, choices between options where the trade-offs are obvious and universally understood, style decisions covered by a style guide, decisions that can be trivially reversed.

### ADR + Fitness Function = Governance

Architecture Decision Records document the intent behind constraints. Fitness functions (see article 06) enforce those constraints automatically. Together, they form a complete governance system.

An ADR that says "we will use the hexagonal architecture pattern, with no infrastructure dependencies in the domain layer" paired with a fitness function that fails the build when domain code imports infrastructure packages creates a governance system where:

- The reasoning for the constraint is documented and accessible
- The constraint is automatically enforced on every change
- Future engineers who want to change the constraint know to update the ADR with new reasoning, not just bypass the fitness function

This is meaningfully better than either approach alone. Fitness functions without ADRs produce mysterious rules that developers cannot evaluate or intelligently update. ADRs without fitness functions produce aspirational constraints that erode under deadline pressure.

## Deep Dive

Architecture Decision Records are a recent formalization of a practice that engineering organizations have developed in various forms for decades. The richest sources for understanding how decision documentation works in practice — and what it achieves — come from Google's design document culture, Amazon's writing culture, and Microsoft's public RFC processes, each of which implements the core ADR insight through different mechanisms.

### The "Software Engineering at Google" Perspective: Design Documents as Decision Artifacts

"Software Engineering at Google" does not describe ADRs by name, but it documents an equivalent practice that serves the same purpose and is more deeply embedded in the engineering culture than formal ADR adoption in most organizations. Every significant engineering decision at Google begins with a design document — a structured prose artifact that captures context, the problem being solved, options considered, the chosen approach, and the consequences accepted.

The timing is the key property: design documents are written before implementation begins, when the context is clear and options are actively under consideration. This is the same discipline that ADR best practice recommends, and for the same reason: decisions documented after implementation tend to be rationalizations rather than honest accounts of the decision process. The alternatives that were considered and rejected are fresh before implementation and forgotten afterward.

Google's design review process enforces the multi-stakeholder dimension that gives design documents their value beyond individual decision-making. Documents are reviewed by relevant engineers and technical leads before implementation begins. This review is not primarily a quality gate — it is a mechanism for surfacing the perspectives and context that the document's author does not have. An engineer designing a service in isolation may not know about a relevant constraint that a reviewer who has seen a similar problem will immediately recognize. The review process makes the document a vehicle for organizational knowledge transfer, not just a record of individual reasoning.

The SRE book's post-mortem culture represents a complementary form of decision documentation: retrospective rather than prospective. Post-mortems document what happened during an incident, what decisions were made during the response, and — critically — what prior architectural decisions created the conditions for the incident to occur. This retrospective documentation creates an organizational memory of failure modes that informs future architectural decisions. A team that reads its post-mortem history before making a significant architectural decision has access to evidence that no amount of prospective analysis can generate.

The Google SRE book's treatment of post-mortems is particularly instructive on blamelessness: the goal is to understand what decisions and conditions produced the outcome, not to assign fault to individuals. This blameless orientation is exactly what makes post-mortems useful as decision documentation — engineers are willing to document honestly when the documentation is used to learn rather than to punish.

### The AWS Builder's Library Perspective: Writing Culture as Governance Infrastructure

Amazon's approach to decision documentation is distinctive in that it is embedded in a broader writing culture that treats written reasoning as the primary medium for consequential decisions. The six-pager format — a structured six-page narrative that must precede any significant meeting or decision — forces decision-makers to articulate context, options, and rationale in prose before discussion begins.

The epistemic discipline this imposes is important. A slide presentation can obscure reasoning behind visual appeal. A six-pager cannot: the reasoning is explicit in prose, the alternatives are enumerated, the rationale is stated. Meeting participants read the document before discussion, which means discussion can focus on the reasoning rather than on re-establishing context. The document is not a summary of what was decided — it is the vehicle through which the decision is made, with the reasoning embedded.

For architectural decisions specifically, the "working backwards" document format serves an ADR-equivalent function. Working backwards documents begin from the desired customer experience — what will customers be able to do? how will they experience it? — and reason backward to the technical approach required. This framing forces clarity about why a technical decision is being made: it must be justified by the customer experience it enables, not by technical elegance or engineering preference. Working backwards documents are decision artifacts that capture not just what was decided but why it was the right choice relative to customer value.

AWS's published architecture papers — the DynamoDB paper, the Aurora paper, the S3 consistency model documentation — function as public ADRs at product level. They document why specific architectural choices were made, what alternatives were considered, what trade-offs were accepted, and what constraints shaped the decisions. The DynamoDB paper is particularly valuable as an ADR model: it explains the availability/consistency trade-off decision with sufficient specificity that readers can evaluate whether the reasoning applies to their context, and it documents the constraints (Amazon's specific usage patterns) that made the chosen trade-off appropriate.

### The Microsoft .NET Architecture Perspective: Public RFC Processes as Open ADRs

Microsoft's most instructive contribution to ADR practice is the public RFC process used for significant .NET platform changes. The .NET Runtime repository on GitHub contains hundreds of design proposals — each of which functions as an ADR with a public comment period. These documents are valuable models because they are publicly accessible and because they document the complete decision process, including community feedback that shaped the final decision.

A .NET RFC captures: the problem statement, the proposed solution, the alternatives considered, the reasons for rejecting alternatives, the expected impact, and the implementation plan. The public comment period makes visible the range of perspectives and constraints that informed the decision. Comments frequently identify edge cases, alternative approaches, and consequences that the original proposal did not anticipate. The final decision document incorporates this input, creating a record not just of what was decided but of the considerations that shaped it.

The value of this as a model for internal ADR practice is significant. The RFC process demonstrates that the most useful decision documentation is not a tidy justification of a foregone conclusion — it is an honest account of the considerations, constraints, and perspectives that shaped a decision that was genuinely uncertain when the process began. ADRs written in this spirit are the ones that help future engineers understand the decision context; ADRs written as post-hoc justifications are the ones that mislead.

Microsoft's Azure Architecture Center guidance on ADR practice reflects the same principle. The guidance emphasizes capturing the alternatives considered — not just the chosen option — because the rejected alternatives are often more informative than the chosen one. A future engineer who asks "why are we using this approach?" needs to know what was rejected and why, not just what was chosen. The "road not taken" section of an ADR is the section that prevents future teams from reinvestigating the same question from scratch.

### The Convergent Insight: Documentation Preserves Reasoning, Not Just Decisions

The finding shared across Google's design document culture, Amazon's writing culture, and Microsoft's RFC process is that the value of decision documentation is not in recording what was decided — that information is already embedded in the code. The value is in recording why: the context, the constraints, the alternatives, and the reasoning that made one choice better than others given the circumstances at the time.

This distinction matters for how ADRs age. A decision that seemed obviously correct in the original context may seem obviously wrong in a different context. Without the "why" — without the documented constraints and reasoning — future engineers cannot evaluate whether the decision is still appropriate. With the "why," they can quickly assess whether the original constraints still apply and whether the trade-offs still favor the original choice.

The SRE book's error budget concept captures this in a different domain: when you have documented the trade-off explicitly — we accept this level of unreliability in exchange for this level of development velocity — you have the information needed to revisit the trade-off when conditions change. Undocumented trade-offs cannot be revisited because they were never consciously made. This is why documentation is a prerequisite to architectural adaptability, not a bureaucratic overhead imposed on top of it.

## Implementation Guide

**Start with a template and a directory.** Create a `docs/decisions/` directory in your repository and add a template file. The template should require only the four core sections: status, context, decision, consequences. Make writing an ADR the path of least resistance.

**Write ADRs before implementation, not after.** The most valuable ADRs are written when the decision is being made — when the context is clear, the alternatives are actively being considered, and the trade-offs are understood. ADRs written after implementation tend to rationalize rather than explain. The discipline of writing the ADR before coding forces clearer thinking about the decision.

**Number ADRs sequentially.** Use a simple sequential numbering scheme: `001-use-postgresql.md`, `002-use-kafka-for-events.md`. Sequential numbers make it easy to reference ADRs from code, documentation, and conversation. "See ADR-023" is a meaningful citation.

**Write to a future stranger.** The audience for an ADR is not your current team — it is an engineer who will join the team two years from now with no context. Write with that reader in mind. Explain abbreviations. Provide context that seems obvious today but will not be obvious in the future. Name the specific date and the specific constraints that apply at the time of writing.

**Link ADRs from code.** In code that implements a significant architectural decision, add a comment linking to the relevant ADR: `// See ADR-015 for why we use Kafka rather than RabbitMQ here`. This creates bidirectional navigation: from the ADR you can find code, and from code you can find the ADR. Code comments linking to ADRs are one of the highest-value forms of code documentation because they answer "why" rather than "what."

**Review ADRs during onboarding.** New engineers should read the ADR directory as part of onboarding. The ADR history is the fastest way to understand the system's architectural evolution and the constraints under which it was built. A well-maintained ADR directory tells the team's story in a way that code cannot.

**Use the ADR status to communicate architectural health.** Regularly reviewing which ADRs are Superseded or Deprecated tells you which parts of the architecture have evolved and which are stable. A cluster of Superseded ADRs around a particular component indicates architectural volatility. A set of ADRs that have been Accepted and never reconsidered indicates stable decisions that are likely worth preserving.

## When to Use

Write an ADR for every decision that meets the threshold described above: significant consequences, multiple reasonable options, non-obvious choice, difficult to reverse. In practice, this means approximately two to five ADRs per significant feature and more for architectural-level decisions.

Also write ADRs for decisions not to do something. "We evaluated GraphQL for the public API but decided to remain REST-based" is valuable to record. The next engineer who asks "why aren't we using GraphQL?" deserves an answer that does not require resurrecting the original evaluation.

## When NOT to Use

Do not write ADRs for every code-level decision. The overhead of formal ADR documentation is appropriate for architectural-level decisions with lasting consequences, not for implementation details within bounded components.

Do not use ADRs as a bureaucratic gate. If ADR writing becomes a bottleneck that delays decisions or creates overhead that consumes more time than the documentation saves, the practice has become counterproductive. ADRs should be lightweight documents, not heavyweight approval processes.

## Common Mistakes

**Mistake 1: Writing ADRs after the fact.** Retrospective ADRs are better than no ADRs, but they are less valuable than contemporaneous ones. After-the-fact ADRs tend to be rationalizations that document the decision made rather than honest records of the decision process. Alternatives that were considered and rejected often get omitted because they are no longer fresh.

**Mistake 2: Editing old ADRs.** The temptation to "update" an old ADR when circumstances change is understandable but misguided. Edit the ADR and the historical record is distorted — future engineers cannot tell what was originally decided and why the change was made. Write a new ADR that supersedes the old one. Preserve the original text.

**Mistake 3: Writing ADRs in isolation.** ADRs document team decisions, not individual decisions. A significant architectural decision made by one engineer without team discussion should not be documented only as an ADR — the ADR documents that a decision was made, but the process requires broader input for consequential choices. Use ADRs to formalize decisions made through appropriate processes, not to make consequential decisions unilaterally.

**Mistake 4: Failing to document the alternatives considered.** An ADR that says "we chose X because X is good" is half an ADR. An ADR that says "we chose X over Y and Z because X provides property P that our context requires, while Y has problem Q and Z has problem R" is a complete ADR. The alternatives and rejections are often more valuable than the chosen option.

**Mistake 5: Not linking ADRs to code and fitness functions.** An ADR that exists only in the docs directory and is never referenced from code or enforcement mechanisms will be forgotten. Link ADRs from relevant code comments. Associate fitness functions with the ADRs that motivate them. Create navigation between the governance record and its implementation.

## Connections

- **Fitness Functions** — The enforcement mechanism for constraints documented in ADRs; together they create complete architecture governance. See article 06.
- **Everything Is a Trade-Off** — ADRs are the formal record of trade-off analysis; the consequences section is where trade-offs are explicitly acknowledged. See article 02.
- **Evolutionary Architecture** — ADRs enable guided evolution by preserving the intent and context of past decisions, allowing future changes to be evaluated against the original reasoning. See article 05.
- **Conway's Law** — ADRs should document the organizational context of architectural decisions, since Conway's Law makes organization a material constraint. See article 10.
- **Design for Failure** — Failure design decisions — error budgets, blast radius choices, redundancy levels — are among the most important ADR subjects because they involve significant trade-offs with lasting consequences. See article 04.

## Key Insights

1. Code documents what was built. ADRs document why. Both are necessary for a maintainable system; most teams have only the first.

2. The most valuable content in an ADR is often the alternatives considered and rejected section. Knowing why X was chosen tells you the decision was made; knowing why Y and Z were rejected tells you the decision was understood.

3. ADR immutability is a feature, not a constraint. The complete history of architectural evolution — including decisions that turned out to be wrong — is more valuable than a cleaned-up narrative of only the correct decisions.

4. Write ADRs before implementation. The act of writing forces clarity about context and trade-offs that implementation pressure tends to suppress. If you cannot write the ADR before implementing, you may not understand the decision well enough to implement it correctly.

5. An ADR paired with a fitness function is more powerful than either alone. The ADR documents intent; the fitness function enforces it. Neither without the other is sufficient for durable architectural governance.

6. The ADR directory is a new engineer's fastest path to understanding a system's architecture. A well-maintained directory lets a new team member understand not just what decisions were made, but what options were considered, what constraints shaped the choices, and how the system has evolved. It compresses years of context into readable documents.

7. Linking ADRs from code creates a two-way navigation that transforms static documentation into a living reference. A comment that says "// See ADR-042 for context on this design" tells future maintainers exactly where to look when they wonder why the code is structured the way it is.
