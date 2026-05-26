# aio-gherkin-refine

Requirements that look clear on the surface almost always contain hidden ambiguity: edge cases no one considered, business rules that conflict, terminology that means different things to different team members. Gherkin is the discipline of making that ambiguity visible before it reaches production. Writing it well forces a conversation that shallow acceptance criteria never do.

This plugin brings that discipline to Claude. It acts as a BDD practitioner who can sit down with a vague requirement and work it into unambiguous, executable scenarios — or review existing Gherkin and flag where scenarios are too broad, too imperative, or testing the wrong thing.

## Two modes

**Write mode** takes a requirement (as vague as "users should be able to reset their password") and applies Example Mapping to extract the business rules, derive concrete examples for each rule, and surface the open questions that need answers before implementation can start. The output is a Feature file structured around rules, not UI steps.

**Review mode** takes existing Gherkin and audits it against a catalog of anti-patterns: scenarios that test implementation details instead of behavior, imperative step sequences that should be single declarative steps, Background blocks that contain state relevant to only some scenarios, Scenario Outlines used where separate named scenarios would be clearer.

The guiding question throughout is the 3 Amigos test: would a developer, a QA engineer, and a product owner each read this scenario and come away with the same understanding?

## Core principles the skill enforces

Declarative over imperative. `When I submit the order` is a behavior. `When I click the Submit button and wait for the confirmation modal` is a UI script — fragile and divorced from meaning.

One rule per scenario. If a scenario requires two `And` steps that address different concerns, it is testing two things. Split it.

Domain language throughout. Scenarios written in business terms survive UI redesigns. Scenarios written in UI terms do not.

Independent scenarios. Each must stand alone. Shared state between scenarios creates ordering dependencies that make suites unreliable.

## Install

```bash
/plugin install aio-gherkin-refine@aiocean-plugins
```

Trigger phrases: "write gherkin", "refine requirements", "write acceptance criteria", "review gherkin", "improve scenarios", "BDD", "Given When Then", "feature file", "cucumber", "specification by example", "edge cases", "example mapping".

## Reference material bundled with the skill

The skill includes four reference documents loaded on demand:

- **mental-models.md** — Example Mapping, 3 Amigos facilitation, Deliberate Discovery
- **writing-guide.md** — Declarative style, Scenario Outline vs named scenarios, Ubiquitous Language, Background rules
- **review-checklist.md** — Anti-patterns catalog with before/after rewrites, quality gates
- **expert-frameworks.md** — Cucumber School rules, Specification by Example, BDD in Action, ATDD by Example synthesis
