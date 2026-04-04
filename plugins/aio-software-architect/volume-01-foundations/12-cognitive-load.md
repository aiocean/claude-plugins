# Cognitive Load Is What Matters

> "Complexity is anything that makes software hard to understand or to modify." — John Ousterhout

> "We should be trying to reduce the cognitive load for the person reading the code, not for the person writing it." — Artem Zakirullin

## The Problem

A team inherits a microservices platform built by a previous contractor. The services are small, each under five hundred lines. The naming follows conventions. The tests have good coverage. On paper, this codebase should be easy to work with.

In practice, every feature takes three times as long as estimated. Engineers need two weeks of orientation before they can make their first change with confidence. The on-call rotation is miserable because alert titles reference service names and metric IDs that nobody has memorized. When someone finally traces a latency regression to its root cause, they have navigated eleven service boundaries, read six different config formats, and mentally tracked context switches between four programming languages.

The codebase is not poorly written. It is cognitively expensive. The mental effort required to understand it, modify it, and operate it exceeds the capacity of the people working with it. This manifests as slow delivery, high error rates, engineer burnout, and reluctance to take on-call shifts. The codebase's technical correctness does not compensate for its cognitive cost.

Artem Zakirullin's influential essay "Cognitive Load is What Matters" argues that cognitive load — not correctness, not performance, not elegance — is the primary property that determines whether software is actually good to work with. Code that is technically correct but cognitively expensive is bad code. Code that is simple enough to understand quickly, modify safely, and operate confidently is good code, even if it is slightly less elegant or efficient.

This is not a new observation. Dijkstra, Ousterhout, Knuth — every major figure in software engineering has acknowledged the centrality of human comprehension. But Zakirullin's framing is particularly useful because it grounds the principle in cognitive science, connecting software design to how human minds actually work, and because it produces actionable design guidance that complements and extends the related work on complexity and simplicity.

## Core Concept

Cognitive science distinguishes three types of cognitive load that apply directly to software comprehension:

**Intrinsic cognitive load** is the inherent complexity of the subject matter — the essential difficulty of the problem being solved. A distributed transaction coordinator is inherently more complex than a hello world program. This complexity cannot be designed away; it exists in the problem itself. Good software design does not eliminate intrinsic complexity; it ensures the code is no more complex than the problem requires.

**Extraneous cognitive load** is complexity introduced by the presentation — the way the information is organized and communicated — rather than by the content itself. Poor naming, inconsistent structure, unnecessary indirection, scattered related information, and misleading abstractions all increase extraneous cognitive load without adding any value. This is the complexity that software design should eliminate.

**Germane cognitive load** is the mental effort required to build understanding — to construct the mental model that allows a reader to reason about the system. Some cognitive effort is productive: understanding a well-designed abstraction builds a mental model that pays dividends when working with the abstraction later. Germane cognitive load is an investment; extraneous cognitive load is pure waste.

The design principle follows directly: **minimize extraneous cognitive load for the reader, not the writer**. Code that is concise for the writer but requires extensive context knowledge to read has traded writer convenience for reader burden. Code that is slightly more verbose but self-explanatory has transferred cognitive work from reader to writer, which is the correct direction — readers vastly outnumber writers over a codebase's lifetime.

### Intrinsic vs Extraneous: Telling Them Apart

The practical challenge is distinguishing intrinsic complexity from extraneous complexity. Both make code harder to understand, but only extraneous complexity can be removed.

A payment processing service that handles currency conversion, tax calculation across jurisdictions, fraud detection, and settlement timing is complex. That complexity is intrinsic — it mirrors the complexity of the domain. Simplifying it means simplifying the domain, which is not possible.

The same service with function names like `proc1`, `proc2`, `doThing`, and `handleStuff` is more complex. That complexity is extraneous — it mirrors nothing about the domain, it is a presentational choice that makes the domain complexity harder to access. Renaming functions adds no features and costs almost nothing; it reduces cognitive load substantially.

The same service organized with its currency conversion logic spread across seven files in four packages is more complex than if it were organized with currency conversion logic in one place. Again, this is extraneous — the organizational structure does not mirror domain structure, it mirrors some historical accident of how the code was added over time. Reorganizing reduces cognitive load without changing behavior.

Intrinsic complexity appears in tests: if a test for the payment service requires domain knowledge to understand what it is testing, that reflects intrinsic complexity. If a test requires understanding implementation details that could be hidden, that reflects extraneous complexity.

### Locality of Behavior

One of the most practical cognitive load reduction techniques is locality of behavior: code that is used together should be defined together. The cognitive cost of scattered related information is high — readers must hold multiple locations in memory simultaneously, navigate back and forth between files, and mentally assemble a picture from fragments.

Kent C. Dodds' writing on "Colocation" and Dan Abramov's related concept "Locality of Behavior" both articulate this principle from different angles. The core insight: the closest related thing to any piece of code is the code that works with it. Co-locating related code reduces the navigation required to understand it.

Vue 3's Composition API is a canonical example. The Options API organizes code by technical category: all reactive data in `data()`, all computed properties in `computed`, all methods in `methods`, all lifecycle hooks in `mounted`, `created`, etc. Understanding one feature requires reading across all these categories simultaneously. The Composition API allows code to be organized by feature: all reactive state, computed properties, methods, and lifecycle hooks for the user authentication feature together, followed by all state and logic for the notification feature. Related code is local; understanding one feature requires reading one section.

React Hooks demonstrate the same principle in a different framework. Before hooks, component logic was split between lifecycle methods (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`) and class properties. A single logical concern — fetching data for a resource and cleaning up the subscription — was spread across three lifecycle methods. Hooks allow the entire concern to be expressed in one `useEffect` call. The logic is local to the concern.

### Flat Packages over Deep Nesting

Deep hierarchies impose navigational cognitive load. When code is organized in deeply nested directories — `src/features/commerce/orders/domain/aggregates/OrderAggregate.ts` — every navigation requires traversing the hierarchy. Understanding the hierarchy's structure is a prerequisite to finding anything. The hierarchy imposes a mental tax before any domain knowledge is accessed.

Go's standard library is a reference model for flat, coherent packages. `net/http` handles HTTP. `encoding/json` handles JSON. `database/sql` handles database access. Each package has a clear, single purpose expressed in its name. There is no `com.company.domain.order.service.repository.impl` chain. The depth is shallow; the packages are focused. Finding code requires knowing what concern it belongs to, not knowing the hierarchy.

This is not an argument against any nesting. Some nesting is appropriate — separating `internal` from `public` APIs, separating `cmd` from library code, separating platform-specific implementations. The argument is against nesting that adds hierarchy without adding clarity; against the Java Enterprise pattern where the path to a class encodes the entire organizational chart of the project.

Zakirullin specifically identifies deep nesting within functions as a cognitive load problem. Each level of nesting — each `if` inside a `for` inside an `if` — requires the reader to maintain an additional piece of context. Deep nesting produces functions where the reader must mentally track five conditions simultaneously to understand what a single statement does. Flattening with early returns, guard clauses, and extracted conditions reduces this cognitive stack depth.

### Naming as Cognitive Load Reduction

Naming is the most direct and most undervalued lever for cognitive load reduction. Good names externalize knowledge — they make implicit information explicit without requiring the reader to derive it. Bad names force the reader to derive information that the code's author already knows.

A function named `process` forces the reader to read the implementation to understand what it processes, how, and what it returns. A function named `validatePaymentMethodAndChargeCustomer` externalizes that knowledge completely — the reader knows exactly what the function does before reading a single line. The longer name is more cognitive load to type; it is less cognitive load to read, and code is read vastly more than it is written.

Variable names that encode type information (`userObj`, `configDict`, `resultList`) use the name slot for information that the type system already provides in a typed language, or that is obvious from context in a dynamic one. Variable names that encode meaning (`authenticatedUser`, `serviceConfiguration`, `paymentResults`) use the name slot to externalize information that is otherwise implicit.

The rule Zakirullin articulates: names should externalize knowledge that the reader would otherwise need to derive or hold in working memory. Every name is an opportunity to reduce the cognitive cost of reading adjacent code.

### Consistency as Cognitive Load Infrastructure

Consistency is a meta-principle that amplifies the effectiveness of all other cognitive load reduction techniques. A codebase that consistently applies the same patterns in the same situations allows engineers to build and apply a mental model that works everywhere. A codebase that applies different patterns in different places — or, worse, applies the same pattern in slightly different ways — forces engineers to maintain multiple mental models and to constantly verify which model applies in the current context.

When database access always follows the repository pattern, an engineer who understands the pattern can work with any repository. When database access follows the repository pattern in some services, uses active record in others, and uses raw SQL in a third set, engineers must learn three models and navigate between them constantly. The inconsistency is extraneous cognitive load.

The same applies to error handling, logging, testing structure, API design, configuration format, and every other recurring pattern. Consistency allows cognitive load to be paid once (learning the pattern) rather than repeatedly (recognizing and relearning the pattern's variations).

## Deep Dive

Cognitive load reduction has become a recognized engineering discipline through the convergence of software design thinking, operational experience, and organizational research. Three bodies of literature illuminate how the principle operates at different scales — from individual code design to team structure to platform design — and why each scale matters independently.

### The "Software Engineering at Google" Perspective: Cognitive Load as Organizational Infrastructure

"Software Engineering at Google" approaches cognitive load reduction as an organizational investment rather than as individual engineering practice. The readability certification process is the clearest expression of this: before an engineer can approve code reviews in a language, they must demonstrate that code they write meets a standard that any engineer familiar with the language can understand without requiring author-specific context.

The important property here is the target audience for the readability standard: not the author, not domain experts, but any engineer familiar with the language. This is a direct operationalization of Zakirullin's principle — optimize for the reader, not the writer. Code that is clear to an expert who already knows the context may impose substantial cognitive load on a new team member or an engineer from a different part of the organization. Google's readability standard is calibrated to the reader with the most relevant background knowledge but least project-specific context.

Google's style guides function as cognitive load infrastructure. When all Go code in a large organization is formatted by `gofmt` and follows consistent naming conventions, engineers moving between codebases encounter familiar patterns. The cognitive cost of orientation — learning where things are, understanding naming conventions, parsing unfamiliar formatting — is paid once when joining the organization, not repeatedly when encountering each new codebase. Consistency makes the cognitive investment transferable.

The Go language itself reflects deliberate cognitive load reduction decisions made at the language design level. The absence of method overloading means function names must be explicit and distinct — `MarshalJSON` rather than `Marshal` when the type matters — which externalizes information that would otherwise need to be derived from context. The `gofmt` formatter eliminates style variability entirely: there is no cognitive overhead in deciding how to format code, and no cognitive overhead in parsing unfamiliar formatting. Explicit error handling at call sites makes failure modes visible rather than hidden in exception propagation paths. Each of these choices trades some writing convenience for reading clarity, which is the correct trade-off given the reading-to-writing ratio over a codebase's lifetime.

The SRE book contributes an operational dimension to cognitive load that is underemphasized in code-focused discussions. Incident response is a domain where cognitive load has directly measurable consequences: high cognitive load during incidents leads to errors, slower diagnosis, and longer outage durations. Google's SRE practice addresses operational cognitive load through runbooks that externalize diagnostic procedures, SLO-based alerting that provides immediate context about the severity and scope of an issue, and monitoring dashboards designed to surface relevant information without requiring engineers to mentally construct the system state from raw metrics.

### The AWS Builder's Library Perspective: Reducing Cognitive Load as a Service

Amazon's contribution to cognitive load thinking operates at multiple levels simultaneously. The concept of "undifferentiated heavy lifting" is a cognitive load framework applied to service design: the engineering work that every team must do but that does not differentiate their product imposes extraneous cognitive load. Managing servers, configuring networks, planning capacity — these are problems that have known solutions, and solving them again for each team is cognitive overhead that produces no unique value.

AWS's cloud services are cognitive load reduction products in this sense. Each service absorbs a domain of extraneous cognitive load so that customer engineering teams can focus their cognitive capacity on what differentiates their product. The engineering team building a financial application does not need to develop expertise in distributed storage reliability — they can depend on storage services that have absorbed that complexity. The cognitive load reduction is concrete and measurable: teams that previously needed distributed systems expertise to operate storage can redirect that cognitive capacity to their domain.

The Builder's Library essays on operational practices document cognitive load management in incident response. Runbooks, operational readiness reviews, and observability requirements are all mechanisms for reducing the cognitive work required to diagnose and resolve production issues. An on-call engineer facing an incident at 2am under stress should not need to reconstruct system behavior from first principles — the relevant diagnostic procedures should be documented, the system state should be observable through well-designed dashboards, and the blast radius of the incident should be bounded by architectural design. Each of these reduces the cognitive demand of the most cognitively expensive situation an engineer faces.

Amazon's writing culture — the six-pager format, the working-backwards document — is a cognitive load transfer practice in the organizational domain. A slide presentation that summarizes conclusions imposes cognitive load on the audience to construct the underlying reasoning. A six-pager that presents the reasoning in full prose transfers the cognitive work of comprehension from the audience to the author. The author, who is closest to the material, bears the cognitive cost of writing clearly; the audience, who needs to evaluate and decide, is spared the cognitive cost of reconstructing arguments from abbreviated slides.

### The Microsoft Team Topologies Perspective: Cognitive Load as an Organizational Design Constraint

Microsoft's engineering culture has been significantly influenced by the Team Topologies framework (Skelton and Pais, 2019), which is the most explicit connection in the literature between cognitive load principles and organizational design. The framework's central argument is that team structures should be designed with cognitive load as the primary constraint, and that the most common organizational failure mode is giving teams more cognitive territory than human beings can effectively manage.

Skelton and Pais map the three cognitive load types from cognitive science — intrinsic, extraneous, and germane — onto software team domains. A team's intrinsic cognitive load is the domain knowledge required to do their work: understanding the business domain, the technical systems they maintain, and the interactions between them. This load cannot be reduced without narrowing the team's scope. A team's extraneous cognitive load is the accidental overhead: unclear processes, excessive tooling friction, ambiguous responsibilities, and the cognitive overhead of maintaining communication with too many other teams. This load can and should be reduced. A team's germane cognitive load is productive learning — building understanding that pays dividends in future work. Well-designed team structures maximize the fraction of cognitive capacity available for germane load by minimizing extraneous load.

The practical implication for architecture is significant: a team whose cognitive territory exceeds what it can effectively manage will make poor architectural decisions. Not because the engineers are incompetent, but because cognitive overload degrades the quality of complex reasoning. Teams responsible for too many services, too many domains, or too many external dependencies will inevitably cut corners — not from negligence but from cognitive capacity constraints. The architectural consequence of organizational cognitive overload is accumulated complexity, because cognitive shortcuts under overload consistently trade long-term simplicity for short-term convenience.

Microsoft's Azure developer experience work reflects this understanding at the platform level. Consistent API design patterns across Azure services reduce the cognitive cost of adopting new services — an engineer who understands one Azure API has a foundation for understanding others. Comprehensive error messages that explain what went wrong and how to fix it externalize diagnostic knowledge rather than requiring engineers to search documentation. These investments reduce extraneous cognitive load for Azure customers, enabling them to direct more cognitive capacity toward building their applications.

### The Convergent Insight: Cognitive Load Is the Right Metric for Software Quality

The finding that connects Zakirullin's essay, Google's readability practice, Amazon's operational culture, and the Team Topologies framework is that cognitive load — not elegance, not test coverage, not performance — is the right primary metric for software system quality, because it determines whether the system can be effectively understood, modified, and operated by the humans who must work with it.

A system that performs correctly but imposes crushing cognitive load is not a good system: it will be modified incorrectly as engineers misunderstand its behavior, it will be operated poorly as on-call engineers fail to diagnose incidents quickly, and it will accumulate complexity as each engineer who touches it makes locally reasonable decisions that globally increase the cognitive cost of the system.

The goal — stated explicitly by Zakirullin and implicit in Google's readability investment and Amazon's operational discipline — is systems that a competent engineer unfamiliar with them can understand quickly, modify safely, and operate confidently. This is a higher bar than correctness, and it is the right bar, because software that meets it actually delivers its value over its operational lifetime. Software that does not meet it eventually becomes too expensive to maintain regardless of how correct it is.

## Implementation Guide

**Audit your codebase for extraneous complexity.** Walk through the codebase from the perspective of a new engineer. What requires knowledge that is not encoded in the code itself? What requires navigating to multiple files to understand one concept? What names force you to read implementations to understand purpose? Each of these is an extraneous cognitive load source and a candidate for improvement.

**Co-locate related code.** Review where related logic lives. If adding a feature requires touching more than three files, ask whether those files could be reorganized so related concerns are closer together. Locality of behavior is the single highest-leverage cognitive load reduction technique for most codebases.

**Establish and enforce naming conventions.** Write down the naming conventions for your codebase: how are files named, how are functions named, what do suffixes like `Service`, `Repository`, `Handler`, `Manager` mean in your context? Enforce these conventions in code review and through linters. Naming consistency is cognitive load infrastructure.

**Flatten hierarchies.** Review your directory structure and package organization. Remove hierarchy levels that add depth without adding clarity. Aim for a flat structure where finding code requires knowing what concern it addresses, not navigating a multi-level organizational chart.

**Use early returns and guard clauses to reduce nesting depth.** Functions with more than three levels of nesting impose high cognitive stack depth on readers. Identify deeply nested functions and refactor using early returns, extracted functions for complex conditions, and guard clauses at function entry. Each level of nesting removed reduces the working memory required to read the function.

**Measure cognitive load empirically.** Ask new team members to keep a log of what was confusing during their first month. These logs are direct measurements of extraneous cognitive load — places where the codebase imposes cost that new engineers (who do not yet have the tribal knowledge) cannot absorb without explicit effort. Treat these logs as a roadmap for cognitive load reduction.

## When to Use

Cognitive load reduction is universally applicable and should be a continuous practice, not a one-time effort. Every code review, every naming decision, every structural choice is an opportunity to reduce or increase the cognitive load of future readers.

Cognitive load considerations are especially important when:
- Onboarding new team members (high cognitive load is measured empirically through confusion and slow ramp-up)
- Building systems that will be operated under stress (high cognitive load during incidents leads to errors and slower resolution)
- Working in domains with high intrinsic complexity (reducing extraneous load is the only available lever)
- Maintaining legacy systems with accumulated extraneous complexity

## When NOT to Use

Not every cognitive load reduction technique applies everywhere. Sometimes the local naming convention is wrong for the domain. Sometimes co-location would create a file too large to navigate. Sometimes a hierarchy is genuinely informative. The principle is to reduce extraneous cognitive load, not to apply specific techniques uniformly.

Also, cognitive load optimization for one audience can increase it for another. Code optimized for readers unfamiliar with a domain may be verbose and over-explained for domain experts. Know your audience and optimize accordingly.

## Common Mistakes

**Mistake 1: Optimizing for the writer, not the reader.** Clever one-liners, implicit conventions, and "obvious" abbreviations all reduce the cognitive load of writing while increasing the cognitive load of reading. The asymmetry is always wrong: reading happens far more than writing. When writer convenience and reader clarity conflict, choose reader clarity.

**Mistake 2: Confusing brevity with clarity.** Short code is not clearer than long code. A ten-line function that requires a reader to mentally expand three levels of abstraction may be less clear than a thirty-line function that is directly readable. Clarity is about cognitive effort, not character count.

**Mistake 3: Adding abstraction to reduce duplication without checking whether the abstraction is clear.** DRY (Don't Repeat Yourself) can increase cognitive load when the abstraction introduced to eliminate duplication is harder to understand than the duplication it replaces. Some duplication is cognitively cheaper than some abstraction. When in doubt, ask: is the abstraction clearer than the code it replaces?

**Mistake 4: Inconsistent application of patterns.** A pattern applied inconsistently is almost worse than no pattern at all. Inconsistency forces engineers to constantly verify which variant they are dealing with, negating the cognitive load benefit that consistency provides. When adopting a pattern, either apply it everywhere the pattern applies or document clearly where and why it does not apply.

**Mistake 5: Ignoring the cognitive load of operations.** Much cognitive load discussion focuses on development-time code reading. Equally important is operational cognitive load: the mental effort required to understand what a system is doing in production, diagnose failures, and intervene correctly. Alert messages that reference internal metric IDs, logs that require knowledge of undocumented internal states, and dashboards that require expert knowledge to interpret all impose operational cognitive load that directly affects incident resolution time and on-call burnout.

## Connections

- **Complexity Is What Matters** — Ousterhout's three forms of complexity (change amplification, cognitive load, unknown unknowns) map directly onto cognitive science's intrinsic and extraneous load; cognitive load is the central concern of complexity management. See article 01.
- **Deep Modules vs Shallow Modules** — Deep modules reduce cognitive load for callers by absorbing complexity inward; shallow modules transfer complexity outward to callers. See article 07.
- **Separation of Concerns** — Properly separated concerns reduce cognitive load by allowing engineers to focus on one concern at a time; mixed concerns force simultaneous comprehension of multiple concerns. See article 08.
- **Conway's Law** — Team Topologies connects cognitive load explicitly to team structure; teams should be sized and scoped to match human cognitive capacity. See article 10.
- **Boundaries Are the Architecture** — Clear boundaries reduce cognitive load by making the scope of each component explicit; unclear boundaries force engineers to reason about the entire system to understand any part. See article 03.

## Key Insights

1. The primary audience for code is the next engineer who reads it, not the current engineer who writes it. Optimize for the reader. The writer's convenience is secondary.

2. Extraneous cognitive load is the only kind you can design away. Intrinsic complexity is the problem itself; extraneous complexity is how you're presenting the problem. Remove extraneous complexity relentlessly.

3. Locality of behavior is the highest-leverage cognitive load reduction technique for most codebases. Code that is used together should live together. Scattered related code forces engineers to maintain a mental map rather than a mental picture.

4. Naming is free and enormously valuable. Every bad name is a tax on every future reader. Every good name is a gift. Invest in names.

5. Consistency multiplies the value of every other cognitive load reduction technique. A good pattern applied consistently trains engineers to recognize it automatically. A good pattern applied inconsistently forces engineers to verify it every time.

6. Team Topologies is Conway's Law applied to cognitive load. Team structures should be designed so that each team's cognitive load matches human capacity. Teams responsible for too much cognitive territory make poor architectural decisions under the weight of it.

7. The ultimate measure of a software system's quality is how quickly a competent engineer unfamiliar with it can understand it, modify it safely, and operate it confidently. Everything else — test coverage, performance, feature completeness — is in service of this. A system that scores well on all other metrics but imposes crushing cognitive load is not a good system.
