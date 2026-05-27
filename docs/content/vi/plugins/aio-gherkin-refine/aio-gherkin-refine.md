---
title: "aio-gherkin-refine"
description: "Comprehensive BDD field guide for writing and reviewing Gherkin scenarios with expert quality. Use proactively when a request is ambiguous, spans multiple conditions, or edge cases need clarification."
document_type: "skill"
plugin: "aio-gherkin-refine"
install: "/plugin install aio-gherkin-refine@aiocean-plugins"
---

> From plugin [**aio-gherkin-refine**](/vi/plugins/aio-gherkin-refine) · `v2.0.3` · **Install:** `/plugin install aio-gherkin-refine@aiocean-plugins`

# aio-gherkin-refine

Transforms vague requests into clear Gherkin scenarios and reviews existing Gherkin for quality. Serves developers, BA/QA/Product, and Claude agents.

## Mode Detection

**REVIEW mode** — when user pastes existing Gherkin, says "review", "improve", "check my scenarios":
1. Load `references/review-checklist.md`
2. Rate each scenario: ✅ Good / ⚠️ Needs Work / ❌ Rewrite
3. Show before/after for each issue with explanation
4. End with quality score and top 3 improvements

**WRITE mode** — when request is new, ambiguous, or user says "write", "create", "draft":
1. Load `references/mental-models.md` — use Example Mapping to extract rules/examples/questions
2. Load `references/writing-guide.md` — apply declarative style and naming conventions
3. Draft Feature file with happy path + at least one failure scenario
4. Present to user for confirmation before implementing

**When in doubt:** default to WRITE mode, offer REVIEW as an option.

## Example Mapping Quick-Start (WRITE mode)

Before writing any Gherkin, run a mini Example Mapping session:

```
Story: [what the user wants]
  Rule 1: [business rule derived from story]
    Example: [concrete example that tests this rule]
    Example: [edge case]
  Rule 2: [another rule]
    Example: [...]
  Questions: [anything unclear — ask user before proceeding]
```

If you have more than 4 examples for a single rule, the rule is too broad — split it.

## Output Format

Always use fenced code blocks with `gherkin` syntax:

```gherkin
Feature: [noun phrase — what capability this describes]

  Background:  # only if ALL scenarios share this context
    Given [shared precondition]

  Scenario: [complete sentence describing the rule being tested]
    Given [initial context — who, what state]
    When [the action that triggers behavior]
    Then [the observable outcome]

  Scenario: [failure or alternative case]
    Given [different context]
    When [same or different action]
    Then [different outcome]
```

After presenting Gherkin, always ask: "Does this capture what you need? Any scenarios to add or modify?"

## Key Principles

- **Declarative over imperative**: `When I submit the order` not `When I click the Submit button`
- **One rule per scenario**: if you need `And` to link unrelated actions, split the scenario
- **Domain language**: use business terms, not UI or technical terms
- **Independent scenarios**: each scenario must stand alone — no shared state between scenarios
- **3 Amigos check**: would a developer, QA engineer, and BA all understand this scenario?

## Deep References

Load these when needed:
- `references/mental-models.md` — Example Mapping, 3 Amigos, Deliberate Discovery
- `references/writing-guide.md` — Declarative style, naming, Scenario Outline, Background, Ubiquitous Language
- `references/review-checklist.md` — Anti-patterns catalog, quality gates, before/after examples
- `references/expert-frameworks.md` — Cucumber School rules, Specification by Example, BDD in Action, ATDD by Example
