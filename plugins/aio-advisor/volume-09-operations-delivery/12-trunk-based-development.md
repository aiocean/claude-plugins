# Trunk-Based Development & Monorepo

> "Long-lived feature branches are where code goes to die slowly. Trunk-based development is the practice of not letting that happen." — Paul Hammant, trunkbaseddevelopment.com

## The Problem

Feature branches seem like a reasonable idea. Give each developer a branch, let them work independently, merge when done. The problem reveals itself at scale: the longer a branch lives, the more the codebase changes underneath it, the more conflicts accumulate, and the more divergent the branch becomes from reality. Merging a two-week-old branch into a fast-moving main branch is not integration — it is a prolonged negotiation between two independently evolved codebases, one of which (the branch) the team has been ignoring for two weeks.

The term "integration hell" was coined to describe exactly this experience: the last two days of a sprint consumed not by writing new features but by reconciling diverged branches, resolving conflicts, discovering that two engineers made incompatible assumptions about the same data model, and debugging test failures that result from the accumulated mismatch between what was written on the branch and what the rest of the system became while the branch was alive.

The second problem is that long-lived branches create a false sense of progress. A branch with a week of commits looks like a week of work. It is actually a week of work that has not been integrated, not been reviewed in the context of the whole system, not been tested against current main, and may conflict with any of the other feature branches also in flight. The work is not done until it is in main and tested. Everything else is work in progress.

The third problem is feedback latency. In a long-lived branch model, developers writing code on Monday do not know until the branch is merged — perhaps Friday, perhaps next Tuesday — whether their code integrates correctly with changes their colleagues are making simultaneously. This feedback delay means that mistakes made on Monday compound through the week, are discovered later, and are harder to fix. The fix for a broken assumption made Monday is more expensive if you find it Friday.

## Core Concept

Trunk-based development (TBD) is a branching strategy where all developers integrate their work into a single shared branch — "trunk" or "main" — multiple times per day. Long-lived branches are prohibited. All code changes are small, integrated frequently, and tested against the current state of the trunk.

The mechanics are simple: check out the latest main, make a small change, test it, push it, and repeat. The discipline is what separates TBD from the chaos that some teams imagine it would create.

### The Core Practices

**No long-lived branches**: Feature branches exist for hours, not days. The target lifespan of any branch is less than a day. If a feature requires more than a day of work, it is decomposed into sub-tasks that can each be completed and merged in under a day.

**Feature flags for work in progress**: Incomplete features are hidden behind feature flags, not on branches. The code for the new payment processor is in main from day one; it is inactive because the flag is off. This allows continuous integration of the code while decoupling the release.

**Continuous integration**: Every commit to main triggers a build and test suite. The build must stay green. A failing build is a blocking priority for the entire team — not a "I'll fix it later" item.

**Small, frequent commits**: A day's work should consist of multiple small, self-contained commits rather than one large commit. Small commits are easier to review, easier to revert, and easier to reason about in isolation.

### Short-Lived Feature Branches

TBD does not require everyone to commit directly to main. Short-lived feature branches — branches that exist for less than one day, often just a few hours — are compatible with TBD when they are used for code review workflow rather than as isolation from the main branch.

The distinction from Gitflow or standard feature branching is entirely about lifespan and commit frequency. A branch that you create at 9am, implement a small feature on, and merge by 3pm is a short-lived feature branch — TBD-compatible. A branch that you create on Monday and merge the following Wednesday is a long-lived feature branch — TBD-incompatible.

```
TBD-compatible workflow:
  09:00 - git checkout -b feature/add-payment-timeout
  10:30 - Open PR (CI passes, code review requested)
  13:00 - PR reviewed, approved, merged to main
  13:05 - Branch deleted

TBD-incompatible workflow:
  Monday - git checkout -b feature/new-payment-processor
  Tuesday through Friday - commits accumulate
  Friday 16:00 - PR opened with 2,000-line diff
  Next Monday - 3 rounds of review, 50 conflict resolutions
  Next Wednesday - merged
```

### Feature Flags as the Integration Mechanism

Feature flags are what make TBD viable for large features. Without feature flags, "all development at HEAD" would mean that half-built features are visible to users as soon as they land in main. Feature flags allow code to be merged continuously while features are released on a separate schedule.

The discipline of "merge code early, release later via flags" requires:

1. Every significant new feature has a flag from day one
2. The flag defaults to off in all environments
3. Engineers on the feature enable the flag in their development environment
4. The flag is toggled for staging validation before production release
5. Production release is a flag change, not a deployment

This pattern is described in Article 05 (Feature Flags) and is the essential complement to TBD.

### Continuous Integration as Infrastructure

TBD only works if the CI system is fast, reliable, and automatically triggered. A CI pipeline that takes 45 minutes to run cannot provide the feedback loop that TBD requires — developers need to know within minutes whether their commit broke anything.

The CI requirements for TBD:
- **Fast**: Unit tests run in < 2 minutes. Integration tests in < 10 minutes. The full suite in < 20 minutes.
- **Reliable**: Flakiness rate < 0.1%. Flaky tests block TBD because developers cannot distinguish "I broke something" from "flaky test."
- **Comprehensive**: Every commit to main runs all tests. No shortcuts.
- **Automated**: No manual steps. Every push triggers the pipeline without human intervention.

## Google's Monorepo: The Extreme Case

If TBD is the branching strategy, a monorepo is the repository structure that takes it to its logical conclusion. All of Google's production code — estimated at over 80 terabytes of source files, approximately 2 billion lines of code — lives in a single repository called Piper.

Every Google developer works in this single repository. Every change is a CL (changelist) in Piper. Every CL must be tested and reviewed before landing. The entire build graph — every dependency relationship between every component — is expressed in BUILD files that Blaze (open-sourced as Bazel) evaluates to determine what needs to be rebuilt and retested when any file changes.

### Why Google Uses a Monorepo

Google's monorepo, documented in the 2016 paper "Why Google Stores Billions of Lines of Code in a Single Repository," was not a deliberate architectural choice — it was an emergent property of how Google worked in the early 2000s and became self-reinforcing as the organization grew. The reasons to stay in a monorepo:

**Atomic cross-project changes**: When a library API changes, the change, all callers' updates, and all tests can land in a single atomic commit. In a polyrepo, the same change requires coordinated releases across multiple repositories, with potentially long periods where old and new API versions coexist.

**Unified dependency versioning**: Every component uses the same version of every dependency. There is no "Service A uses React 17 while Service B uses React 18" problem. Dependency upgrades are applied once, everywhere.

**Code discovery and reuse**: Engineers can find any code in the organization with a single search. Reusing code from another team requires no package publishing or versioning — just a BUILD file reference.

**Unified tooling and standards**: One CI system, one build tool, one lint configuration, one code review tool. The infrastructure investment is made once and benefits everyone.

**Large-scale refactoring**: A rename or restructuring that affects 10,000 files across 50 projects is a single commit in a monorepo. In a polyrepo, it is 50 coordinated PRs with 50 separate CI runs and 50 separate deployments.

### The Scale Challenges

Managing 80 terabytes of source in a single repository requires solving problems that do not exist at smaller scales:

**Virtual file system**: A developer cannot clone 80TB of source to their laptop. Google uses CitC (Clients in the Cloud) — a virtual file system that presents the entire monorepo to the developer's machine, fetching files on demand. Only the files actually accessed are transferred.

**Distributed build system**: Blaze/Bazel computes the minimal set of build and test targets affected by each change using the dependency graph. Only affected targets rebuild. A change to a utility library rebuilds only the targets that depend on it, not all 2 billion lines.

**Incremental indexing**: Code search, go-to-definition, and find-references across 2 billion lines requires precomputed indices that update incrementally as code changes.

**Code review at scale**: Google's internal Critique code review tool is built to handle the volume — thousands of CLs per day, each reviewed with the full context of the surrounding codebase.

### Facebook/Meta's Approach

Meta uses a monorepo for most of their codebase, with a different implementation than Google. Where Google uses a cloud-based virtual file system (CitC), Meta uses EdenFS — a virtual file system that runs locally and virtualizes the Mercurial-backed monorepo.

Meta's choice of Mercurial over Git was deliberate: Mercurial's extensibility (through "extensions") made it easier to add the custom behaviors their monorepo required than Git's architecture would have allowed. Sapling (open-sourced in 2022) is Meta's Mercurial fork with monorepo-optimized features including sparse checkouts, virtual file system integration, and improved large-repository performance.

Meta's "bttf" (back to the future) integration testing approach runs end-to-end tests that test the interaction between frontend (JavaScript) and backend (Hack/PHP) code in the same CI pipeline — possible only because both live in the same repository.

## Monorepo Tools

For organizations not at Google or Meta scale but wanting monorepo benefits, several tools have emerged:

### Bazel

Google's open-source build system, the public version of Blaze. Language-agnostic, hermetic builds, distributed caching, incremental builds via dependency graph analysis.

```python
# BUILD file: Bazel build definition
py_library(
    name = "payment_processor",
    srcs = ["payment_processor.py"],
    deps = [
        "//common/validation:validators",
        "//third_party/stripe:stripe_client",
    ],
)

py_test(
    name = "payment_processor_test",
    srcs = ["payment_processor_test.py"],
    deps = [":payment_processor"],
)
```

Bazel is powerful but has a steep learning curve. The BUILD file system and Starlark (Bazel's Python dialect) require investment to learn effectively. Best suited for polyglot monorepos at scale (50+ engineers).

### Nx (JavaScript/TypeScript)

Nx is the most widely used monorepo tool for JavaScript/TypeScript projects. It understands the JavaScript ecosystem natively, providing incremental builds, test caching, and dependency graph visualization.

```json
// nx.json: workspace configuration
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    }
  }
}
```

```bash
# Run only tests affected by changes since main
nx affected --target=test

# Build only packages affected by changes
nx affected --target=build
```

Nx's "affected" commands are the key productivity feature: instead of running all tests in the monorepo (which might take hours), Nx computes which packages are affected by the current changes and runs only their tests. This makes monorepo CI times comparable to polyrepo CI times.

### Turborepo (JavaScript)

Vercel's monorepo build system, optimized for JavaScript/TypeScript workspaces. Simpler than Nx, focused specifically on build and test pipelines.

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

Turborepo's remote caching (hosted by Vercel or self-hosted) allows cache hits across CI runners — if another developer or CI run already built the same code, the cache is reused rather than rebuilding.

### Lerna (JavaScript, legacy)

The original JavaScript monorepo tool, predating both Nx and Turborepo. Still widely used but generally superseded by Nx or Turborepo for new projects.

## Monorepo vs. Polyrepo Trade-offs

The monorepo vs. polyrepo debate is one of the most contested in modern software engineering. Both approaches have genuine advantages; the right choice depends on team size, organizational structure, and build tooling investment capacity.

| Dimension | Monorepo | Polyrepo |
|-----------|----------|---------|
| Atomic cross-project changes | Native | Requires coordination |
| Dependency version management | Unified (simpler or harder) | Per-repo (independent) |
| Code discoverability | Excellent | Poor without tooling |
| CI complexity | High (must handle scale) | Low per repo, high in aggregate |
| Access control granularity | Coarse (file/directory level) | Per-repository (natural) |
| Team autonomy | Lower | Higher |
| Tooling investment required | High | Low initially |
| Large-scale refactoring | Easy | Very hard |
| Repository size | Grows unbounded | Bounded per repo |
| Build time (naive) | Slow (more code) | Fast per repo |
| Build time (with tools) | Fast (incremental) | Faster per repo |

**Monorepo wins when**: You have multiple related packages or services that frequently change together. You want unified tooling and standards. You do large-scale refactoring regularly. You have the investment capacity for proper build tooling.

**Polyrepo wins when**: Your services are genuinely independent (different teams, different languages, different deployment cycles). Team autonomy is paramount. Your access control requirements do not fit monorepo tooling. You cannot invest in build tooling.

**The hybrid approach**: Many organizations settle on a per-domain or per-team monorepo rather than a true organization-wide monorepo. The payments team has one repository containing all their services and libraries. The platform team has one repository. The teams coordinate through published APIs, not through shared code. This gives the benefits of monorepo within a domain without the tooling challenges of a global monorepo.

## Deep Dive

### "Software Engineering at Google" on the Monorepo and One-Version Policy

The 2016 paper "Why Google Stores Billions of Lines of Code in a Single Repository" (Potvin and Levenberg, Communications of the ACM) provides the most data-rich public justification for monorepo-at-scale. The paper documents 25,000 engineers, 45,000 commits per day, and 2 billion lines of code — but its more important contribution is explaining *why* Google chose this model and what organizational properties it enables.

The paper's central argument is the "one version" policy: in a monorepo, every team uses the same version of every dependency. When library X is updated from v1.2 to v1.3, all callers are updated in the same commit. This is only feasible because the CI system can run tests for all affected targets simultaneously and identify breakages before the change lands. The alternative — each team deciding independently when to upgrade — produces the "dependency diamond" problem: team A uses library X v1.2, team B uses X v1.3, and team C depends on both A and B, requiring two versions of X in the same binary. The monorepo eliminates this class of problem at the cost of requiring that all upgrades be non-breaking for all callers simultaneously.

The paper also documents the "large-scale change" (LSC) infrastructure: tooling that allows a single engineer to make a consistent change across millions of lines of code (renaming a function, updating an API call pattern) and validate it atomically. In a polyrepo model, this would require hundreds of pull requests across hundreds of repositories, with coordination overhead that makes the change practically infeasible. The monorepo makes cross-cutting refactoring routine rather than heroic.

### Trunk-Based Development: The DORA Research Evidence

The DORA research (Forsgren, Humble, Kim — "Accelerate", 2018) identifies trunk-based development as a key capability of high-performing engineering organizations. The research found that elite performers use short-lived feature branches (less than a day before merging) or commit directly to trunk. Low performers use long-lived feature branches (days to weeks before merging) with complex merge workflows.

The mechanism is well-understood: long-lived branches accumulate divergence from trunk. A branch that is two weeks old must reconcile two weeks of parallel changes by other engineers when it merges. This merge tax grows super-linearly with branch age — the longer the branch lives, the more painful the merge. Trunk-based development eliminates the merge tax by keeping branches short enough that the divergence is trivial to resolve.

The "Accelerate" research is explicit that trunk-based development requires feature flags as a prerequisite for most teams. Without feature flags, merging incomplete work to trunk means shipping it to users. With feature flags, the code can live in trunk in a disabled state, merging continuously and integrating with other changes, while the feature remains invisible to users until it is ready. The combination of TBD and feature flags is what makes continuous integration genuinely continuous — every engineer's work integrates with everyone else's multiple times per day, catching integration conflicts when they are small and cheap to fix rather than when they have grown into multi-day merge conflicts.

## Implementation Guide

### Starting TBD in an Existing Repository

Transitioning from a long-lived branch model to TBD is a cultural change as much as a technical one.

**Step 1: Fix CI first**. TBD requires a CI pipeline that is fast and reliable. If your CI takes 45 minutes and has 10% flakiness, fix that before changing your branching strategy.

**Step 2: Introduce feature flags**. Deploy a feature flag system (LaunchDarkly, Unleash, or similar). Train engineers to use flags for work in progress. This makes TBD safe for large features.

**Step 3: Set maximum branch lifespan**. Start with a 3-day maximum. After one month, reduce to 2 days. After another month, reduce to 1 day. Each reduction is less jarring than jumping directly to "merge today."

**Step 4: Make small PRs a team value**. Code review speed correlates strongly with PR size. Large PRs sit in review for days. Small PRs (< 400 lines) get reviewed in hours. Celebrate small PRs; provide guidance on how to decompose large features into small PRs.

### Monorepo Migration

**Step 1: Start with a new monorepo, migrate incrementally**. Do not try to merge all existing repositories into a monorepo at once. Create a new monorepo, migrate two or three closely-related services as a pilot.

**Step 2: Invest in build tooling before migrating**. Set up Nx, Bazel, or Turborepo in the pilot. Ensure incremental builds and affected-test computation work before adding more code.

**Step 3: Migrate by domain**. Move services that frequently change together into the monorepo first. Leave genuinely independent services in separate repositories.

**Step 4: Establish monorepo conventions early**. Directory structure, BUILD file patterns, dependency rules, and code ownership models must be established before the monorepo grows large. Retrofitting conventions into a large monorepo is painful.

## When to Use / When NOT to Use

**TBD is right when:**
- Your team practices continuous integration and deployment
- Your CI pipeline is fast and reliable
- You have feature flag infrastructure
- Your team is willing to invest in the discipline of small commits and frequent integration

**TBD is premature when:**
- Your CI pipeline takes > 30 minutes or has > 1% flakiness — fix CI first
- Your team has no feature flag infrastructure for work-in-progress
- Your team is distributed across time zones with no overlapping hours — coordinating "do not break main" requires some synchronous availability

**Monorepo is right when:**
- You have multiple packages or services that frequently change together
- You want unified tooling and standards across teams
- You have engineering investment capacity for build tooling
- You regularly make cross-cutting changes

**Monorepo is wrong when:**
- Your services are genuinely independent with different teams, languages, and deployment cycles
- You cannot invest in proper build tooling — a monorepo without incremental builds becomes slower than polyrepo
- Fine-grained access control is required (monorepo access control is coarser than per-repository)
- Your organization is growing very fast — a monorepo with poor tooling becomes a bottleneck

## Common Mistakes

**TBD without feature flags**: Merging incomplete code to main without flags exposes users to half-built features. Feature flags are not optional for TBD.

**TBD without CI**: Merging frequently to main without automated testing is just a faster way to break production. CI is the safety net that makes TBD safe.

**Monorepo without incremental builds**: A monorepo where every CI run builds and tests everything takes hours. Teams stop running CI or accept hour-long wait times. Incremental builds (Nx affected, Bazel, Turborepo) are required infrastructure, not optional optimization.

**Forcing unrelated services into a monorepo**: A payments service and an HR system have no reason to share a repository. Monorepos provide value when services share code or change together. Unrelated services in a monorepo create coordination overhead without benefit.

**Treating monorepo migration as a technical project**: Monorepo adoption changes how teams coordinate, how code review works, and how CI is structured. It is a sociotechnical change. The engineering team must be involved in the decision and the migration plan.

**Not enforcing branch lifespan**: TBD's benefits disappear if some engineers maintain long-lived branches "just for this large feature." Enforce branch lifespan limits in your GitHub/GitLab settings: require branches to be up to date with main before merge, or use a merge bot that enforces freshness.

## Connections

**Feature Flags (Article 05)**: Feature flags are the essential complement to TBD. Without flags, TBD requires that all code merged to main be user-ready. With flags, code can be merged continuously while features are released independently.

**Testing Strategies (Article 11)**: TBD requires fast, reliable tests. The testing pyramid's emphasis on unit tests (fast, deterministic) over E2E tests (slow, fragile) is partly a response to the TBD requirement for tests that can run on every commit.

**Deployment Strategies (Article 04)**: TBD enables continuous deployment — main is always releasable, so you can deploy from main at any time. The combination of TBD + feature flags + continuous deployment is the full continuous delivery model.

**Platform Engineering (Article 07)**: Monorepo tooling (Bazel, Nx, build caching) and TBD CI infrastructure are platform engineering concerns. The platform team builds and maintains the build system, test runners, and caching infrastructure that makes TBD and monorepos viable at scale.

## Key Insights

The core insight of TBD is that integration is not a phase at the end of development — it is a continuous activity throughout development. Moving integration from "at the end, all at once" to "continuously, in small increments" does not eliminate integration work — it distributes it throughout the development process in smaller, more manageable pieces. The total integration work may actually increase, but the peak integration work (which is what causes "integration hell") decreases dramatically.

Feature flags are what make TBD honest. Without flags, "merge early" means "release early," which is often not acceptable. With flags, code can be in main weeks before it is visible to users, allowing continuous integration without premature release. The flag is the mechanism that separates the technical timeline (when code lands in main) from the business timeline (when users see the feature).

The monorepo vs. polyrepo debate is not resolvable in the abstract — it depends entirely on the specific organization's size, tooling investment capacity, and coordination patterns. What is resolvable: a monorepo without proper incremental build tooling is worse than polyrepo. A monorepo with excellent tooling (Bazel, Nx, remote caching) is a force multiplier for developer productivity that polyrepo cannot match for tightly-coupled services.

Google's experience with monorepo at 25,000 engineers provides proof of what is technically possible. It does not prove that monorepo is right for every organization. What it proves is that the scaling challenges of monorepo are solvable with sufficient engineering investment. The question every organization must answer is whether that investment is justified by their coordination requirements and growth trajectory. For most organizations with more than 50 engineers building related services, the answer is yes — but the investment in tooling must come first.

The DORA research consistently shows that high-performing engineering organizations use trunk-based development. The correlation is strong: the practices that enable TBD (fast CI, feature flags, small commits, continuous integration) are exactly the practices that distinguish high-performing from low-performing engineering organizations. TBD is not just a branching strategy — it is a signal of the organizational discipline that correlates with engineering effectiveness.
