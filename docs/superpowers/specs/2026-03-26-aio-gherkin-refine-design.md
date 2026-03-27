# Design: aio-gherkin-refine v2.0

**Date:** 2026-03-26
**Status:** Draft — pending user review
**Plugin:** `plugins/aio-gherkin-refine`

---

## Overview

Upgrade `aio-gherkin-refine` from a basic Gherkin formatter into a comprehensive BDD field guide. The skill will serve developers, BA/QA/Product, and Claude agents automatically. It supports two modes: **WRITE** (draft Gherkin from requirements) and **REVIEW** (improve existing Gherkin).

---

## Architecture

### File Structure

```
plugins/aio-gherkin-refine/
├── .claude-plugin/
│   └── plugin.json                   # bump to v2.0.0
├── skills/aio-gherkin-refine/
│   ├── SKILL.md                      # Core orchestrator — mode detection, behavior
│   └── references/
│       ├── mental-models.md          # Example Mapping, 3 Amigos, Deliberate Discovery
│       ├── writing-guide.md          # Declarative style, naming, templates, Ubiquitous Language
│       ├── review-checklist.md       # Anti-patterns catalog, quality gates, before/after
│       └── expert-frameworks.md     # Distilled from Cucumber School, BDD in Action, Spec by Example, ATDD by Example
└── README.md
```

No scripts. Pure knowledge/reference skill.

---

## SKILL.md Design

### Trigger Patterns

Proactive (Claude auto-invokes):
- Request is ambiguous or spans multiple conditions
- Task involves user-facing behavior with unclear edge cases
- User says "implement X" where X has multiple interpretations

Explicit:
- "refine requirements", "write acceptance criteria", "write gherkin", "BDD", "Given/When/Then"
- User pastes Gherkin for review
- "review gherkin", "improve scenarios", "check my acceptance tests"

### Mode Detection

```
Has user pasted existing Gherkin?
  YES → REVIEW mode
  NO  → WRITE mode

WRITE mode:
  1. Run Example Mapping (load mental-models.md)
  2. Identify: happy path, alternatives, edge cases, failures
  3. Draft Feature file (load writing-guide.md)
  4. Present → confirm → proceed

REVIEW mode:
  1. Scan for anti-patterns (load review-checklist.md)
  2. Rate each scenario: Good / Needs Work / Rewrite
  3. Show before/after for each issue
  4. Explain "why" using principles from writing-guide.md
```

### Output Format

Always:
- Wrap Gherkin in fenced code blocks with `gherkin` syntax
- Include Feature + Scenario names that read as English sentences
- End with a confirmation question before implementing

---

## References Design

### mental-models.md

**Example Mapping** (Matt Wynne, Cucumber Ltd):
- 4 card types: Story (yellow), Rule (blue), Example (green), Question (red)
- Process: start with Story → derive Rules → find Examples per Rule → capture Questions
- Rule of thumb: too many examples for one rule = rule needs splitting
- Red questions = blocked work, must resolve before sprint

**3 Amigos**:
- Developer: "How will I build this?"
- QA: "How can this break?"
- BA/Product: "Does this deliver the intended value?"
- Each scenario should survive all three perspectives

**Deliberate Discovery**:
- Assume you don't know everything — find the unknowns
- Ask: "What would have to be true for this to fail silently?"
- Better to discover edge cases in mapping than in production

### writing-guide.md

**Declarative vs Imperative** (core principle):
- Imperative: `When I click the "Submit" button` — describes mechanics
- Declarative: `When I submit the order` — describes intent
- Rule: if the step could change when the UI changes, it's imperative

**Ubiquitous Language**:
- Use domain terms, not tech terms
- "Customer" not "user record", "places an order" not "POSTs to /api/orders"
- Scenarios serve as executable documentation — they must be readable by non-technical stakeholders

**Single-concept scenarios**:
- One scenario = one business rule being validated
- If you need `And` to connect two unrelated actions, split the scenario

**Scenario Outline**:
- Use when: same behavior, multiple data combinations (>3 examples)
- Avoid when: each row tells a different story (those are separate scenarios)

**Background**:
- Use for: context that applies to ALL scenarios in the file
- Avoid when: only some scenarios need it (inline the Given instead)

**Naming**:
- Features: noun phrase — "User Authentication", "Order Checkout"
- Scenarios: should complete the sentence "It should..." or describe the rule

### review-checklist.md

**Anti-patterns catalog:**

1. **Conjunction smell** — `And` connecting unrelated steps
   - Bad: `When I submit the form And I check my email`
   - Fix: split into two scenarios

2. **UI coupling** — steps reference UI elements
   - Bad: `When I click the blue "Submit" button in the top-right corner`
   - Fix: `When I submit the registration form`

3. **Scenario bloat** — more than 7-8 steps
   - Fix: extract Background, or split into multiple scenarios

4. **Incidental details** — irrelevant data in scenarios
   - Bad: `Given a user with ID 42 and email "test@example.com" created on 2024-01-15`
   - Fix: `Given a registered user`

5. **Missing actor** — unclear who is doing the action
   - Bad: `When the button is clicked`
   - Fix: `When the customer clicks checkout`

6. **Testing the UI, not the behavior** — scenarios describe screens, not outcomes
   - Bad: `Then a green banner appears at the top`
   - Fix: `Then the customer sees a confirmation`

7. **Duplicate scenarios** — same rule tested multiple times
   - Fix: consolidate into Scenario Outline

**Quality gates:**
- [ ] Each scenario tests exactly one rule
- [ ] No UI references in steps
- [ ] Steps use domain language
- [ ] Scenarios are independent (no shared state)
- [ ] Happy path + at least one failure scenario per feature
- [ ] All questions from Example Mapping are resolved

### expert-frameworks.md

Distilled from authoritative sources:

**Cucumber School — 5 Cardinal Rules:**
1. Scenarios are written from the user's perspective
2. Each scenario is independent
3. Steps describe behavior, not implementation
4. Gherkin is not a programming language — optimize for readability
5. One failing scenario = one failing test (no multi-assert scenarios)

**Specification by Example (Gojko Adzic):**
- Key insight: specs that can be executed eliminate "telephone game" between requirements and tests
- Living Documentation: Gherkin files ARE the spec — keep them in sync with the system
- Deriving scope from goals: start with business goal → derive features → derive examples

**BDD in Action (John Smart):**
- Layered scenarios: business rule level → functional level → technical level
- Avoid "how" at the business level — focus on "what" and "why"
- Scenario as communication tool: written in a conversation, not by one person

**ATDD by Example (Markus Gärtner):**
- Test-First BDD: write scenario before writing code
- Three-stage acceptance: specify → implement → verify
- Scenario granularity: coarse for acceptance (feature level), fine for unit tests

---

## Version Bump

`plugin.json`: `1.0.4` → `2.0.0` (major — complete rewrite of skill content + new reference architecture)

---

## Out of Scope

- No scripts (this remains a pure knowledge skill)
- No integration with test runners (Cucumber, Pytest-BDD, etc.) — that's a separate plugin concern
- No auto-generation from code — skill guides writing, doesn't reverse-engineer

---

## Success Criteria

1. Claude invoked on an ambiguous request produces a Feature file with 2-3 scenarios in declarative style
2. Claude invoked on existing Gherkin identifies at least the most common anti-patterns and proposes fixes
3. Reference docs are dense enough that a BA with no BDD experience can learn from them
4. A developer can use the skill as a checklist before raising a PR
