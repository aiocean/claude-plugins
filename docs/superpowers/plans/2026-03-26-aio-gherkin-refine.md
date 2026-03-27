# aio-gherkin-refine v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `aio-gherkin-refine` from a basic formatter into a comprehensive BDD field guide with dual WRITE/REVIEW modes, mental models, anti-patterns catalog, and expert frameworks.

**Architecture:** Pure knowledge skill — SKILL.md orchestrates behavior, 4 reference docs hold deep content. No scripts, no build step.

**Tech Stack:** Markdown only. Plugin validated via `bash scripts/validate-marketplace.sh`.

---

### Task 1: Bump version in plugin.json

**Files:**
- Modify: `plugins/aio-gherkin-refine/.claude-plugin/plugin.json`

- [ ] **Step 1: Read current plugin.json**

Read `plugins/aio-gherkin-refine/.claude-plugin/plugin.json` — current version is `1.0.4`.

- [ ] **Step 2: Update to v2.0.0**

Replace the entire file content with:

```json
{
  "name": "aio-gherkin-refine",
  "description": "Comprehensive BDD field guide — writes and reviews Gherkin with expert quality. Includes Example Mapping, 3 Amigos, anti-patterns catalog, and declarative style guide.",
  "version": "2.0.0",
  "author": { "name": "aiocean" },
  "license": "MIT"
}
```

- [ ] **Step 3: Commit**

```bash
git add plugins/aio-gherkin-refine/.claude-plugin/plugin.json
git commit -m "feat(aio-gherkin-refine): v2.0.0 bump version for major rewrite"
```

---

### Task 2: Rewrite SKILL.md — core orchestrator

**Files:**
- Modify: `plugins/aio-gherkin-refine/skills/aio-gherkin-refine/SKILL.md`

- [ ] **Step 1: Write new SKILL.md**

Replace the entire file with:

````markdown
---
name: aio-gherkin-refine
description: Comprehensive BDD field guide for writing and reviewing Gherkin scenarios with expert quality. Triggers: "write gherkin", "refine requirements", "write acceptance criteria", "review gherkin", "improve scenarios", "BDD", "Given/When/Then", "acceptance tests". Use proactively when a request is ambiguous, spans multiple conditions, or edge cases need clarification.
---

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
````

- [ ] **Step 2: Commit**

```bash
git add plugins/aio-gherkin-refine/skills/aio-gherkin-refine/SKILL.md
git commit -m "feat(aio-gherkin-refine): rewrite SKILL.md with dual WRITE/REVIEW modes and Example Mapping"
```

---

### Task 3: Create references/mental-models.md

**Files:**
- Create: `plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/mental-models.md`

- [ ] **Step 1: Create the file**

```markdown
# Mental Models for Better Gherkin

## Example Mapping (Matt Wynne, Cucumber Ltd)

The single most effective technique for discovering scenarios before writing them. Run as a 25-minute workshop with Dev + QA + BA.

### The Four Cards

| Card | Color | Represents |
|------|-------|------------|
| Story | Yellow | The user story being specified |
| Rule | Blue | A business rule that governs the story |
| Example | Green | A concrete example that illustrates a rule |
| Question | Red | An unknown or ambiguity — blocks the story |

### The Process

1. **Write the Story** on a yellow card: "As a customer, I want to reset my password"
2. **Derive Rules** — what business rules govern this? Write each on a blue card:
   - "Link expires after 24 hours"
   - "Link can only be used once"
   - "User must be verified to request reset"
3. **Find Examples** — for each rule, find 2-3 concrete examples (green cards):
   - Rule: "Link expires after 24 hours"
     - Example: Customer clicks link after 25 hours → sees "link expired" message
     - Example: Customer clicks link after 23 hours → can set new password
4. **Capture Questions** (red cards) as they arise:
   - "What happens if the user's email no longer exists?"
   - "Can an admin reset on behalf of a user?"

### When to Stop

- A story is ready when: more green cards than red cards, and all rules have at least one example
- A story is NOT ready when: red question cards outnumber green examples

### Rule of Thumb

> If a single rule has more than 4-5 examples, the rule is too broad. Split it into two rules.

### What This Looks Like in Gherkin

Each green example card becomes a Scenario. Each blue rule card often becomes a Feature (or Background context).

---

## 3 Amigos

A practice of reviewing each scenario from three perspectives before accepting it. Named after the three roles required.

### The Three Perspectives

**Developer** — "How will I build this?"
- Is the behavior specific enough to implement?
- Are there technical constraints not reflected in the scenario?
- Does the Given state reflect a state the system can actually be in?

**QA Engineer** — "How can this break?"
- What edge cases are missing?
- What happens when data is invalid, missing, or malformed?
- Are the Then steps observable and testable?

**BA/Product** — "Does this deliver the intended value?"
- Does this scenario reflect the actual business need?
- Is the domain language correct?
- Would a non-technical stakeholder understand this?

### How to Use It

After drafting a scenario, mentally switch roles and ask each question. If any perspective reveals a gap:
- Developer gap → add technical context to Given, or split scenario
- QA gap → add a failure/edge-case scenario
- BA gap → rewrite using domain language, or clarify the rule

### Quick Check

Read your scenario aloud. If it sounds like instructions for a software system, it needs rewriting. If it sounds like a conversation about business behavior, it's on the right track.

---

## Deliberate Discovery

A mindset: assume you don't know enough yet. The goal of writing Gherkin is not to document what you already know — it's to discover what you don't know.

### The Core Question

> "What would have to be true for this to fail silently — with no error, but also not delivering the expected value?"

### Application

Before finalizing a Feature file, ask:
1. What are all the actors who could trigger this? (Only one documented?)
2. What are all the system states this could execute in? (Only happy path documented?)
3. What external dependencies could fail? (Third-party payment, email service, etc.)
4. What data variations haven't been tested? (Empty strings, very long values, special characters)

### Rule

Red question cards from Example Mapping represent Deliberate Discovery opportunities. Don't discard them — they're signals that the spec isn't ready.

---

## INVEST for Scenarios

Adapted from the INVEST criteria for user stories, applied to Gherkin scenarios:

| Letter | Meaning | Applied to Scenarios |
|--------|---------|----------------------|
| **I** | Independent | Each scenario runs without depending on another scenario's state |
| **N** | Negotiable | Scenarios are conversation starters, not contracts — they can change |
| **V** | Valuable | Each scenario tests something that matters to the business |
| **E** | Estimable | A developer can estimate the effort from reading the scenario |
| **S** | Small | One scenario = one rule. If it tests two rules, split it. |
| **T** | Testable | The Then step produces an observable, verifiable outcome |

If a scenario fails any of these, revise it before implementing.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/mental-models.md
git commit -m "feat(aio-gherkin-refine): add mental-models.md with Example Mapping, 3 Amigos, Deliberate Discovery"
```

---

### Task 4: Create references/writing-guide.md

**Files:**
- Create: `plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/writing-guide.md`

- [ ] **Step 1: Create the file**

```markdown
# Gherkin Writing Guide

## The Core Distinction: Declarative vs Imperative

This is the most important principle in writing good Gherkin.

### Imperative (avoid)

Describes the *mechanics* of interacting with the system. Couples scenarios to UI implementation.

```gherkin
When I click on the "Username" field
And I type "alice@example.com"
And I click on the "Password" field
And I type "hunter2"
And I click the blue "Sign In" button
Then I see the text "Welcome, Alice"
```

Problems: if the UI changes (button color, field labels), the scenario breaks even though the behavior didn't change.

### Declarative (prefer)

Describes the *intent* — what the user is trying to accomplish.

```gherkin
When I sign in as Alice
Then I am on my dashboard
```

Rule: if the step would need to change when the UI is redesigned, it's imperative. Rewrite it at the intent level.

---

## Ubiquitous Language

Scenarios are the intersection of business requirements and executable tests. They must use the language of the domain — not the language of the database, the API, or the UI framework.

### Bad (technical language)

```gherkin
Given a user record exists with role_id=3 and is_active=1
When a POST request is made to /api/v2/orders with valid payload
Then the response status is 201 and order_id is returned
```

### Good (domain language)

```gherkin
Given Alice is a registered customer
When Alice places an order for "Running Shoes"
Then the order is confirmed and Alice receives a confirmation email
```

### How to Find Domain Language

- Ask the BA/Product what they call this concept
- Look at the UI copy — what words do users see?
- Use the Ubiquitous Language from your DDD model if one exists
- When in doubt: how would you explain this to a new employee on their first day?

---

## Feature and Scenario Naming

### Features

Use a **noun phrase** describing the capability:
- ✅ `Feature: Password Reset`
- ✅ `Feature: Shopping Cart Checkout`
- ❌ `Feature: Test password reset functionality`
- ❌ `Feature: US-123`

### Scenarios

Name should complete the sentence: *"It should..."* or describe a business rule:
- ✅ `Scenario: Expired reset link cannot be used`
- ✅ `Scenario: Customer with no items cannot checkout`
- ❌ `Scenario: Test 1`
- ❌ `Scenario: Happy path`
- ❌ `Scenario: When the user clicks the button`

---

## Given / When / Then Semantics

Each keyword has a precise meaning. Using them correctly makes scenarios self-documenting.

### Given — Context

Sets up the initial state of the world. Everything that must be true *before* the action occurs.

- ✅ `Given Alice has 3 items in her cart`
- ✅ `Given the payment service is unavailable`
- ❌ `Given I go to the checkout page` (this is an action — belongs in When)

### When — Action

The single event that triggers the behavior being tested. There should usually be **one** When per scenario.

- ✅ `When Alice submits her order`
- ❌ `When Alice goes to the checkout page and submits her order` (two actions — split or use And carefully)

### Then — Outcome

The observable result. Must be something that can be verified externally.

- ✅ `Then Alice receives an order confirmation email`
- ✅ `Then Alice sees "Payment failed — please try again"`
- ❌ `Then the order is saved in the database` (internal — not observable by user)
- ❌ `Then it works` (not verifiable)

### And / But

Use `And` to continue the same type of step. Use `But` for contrast.

```gherkin
Given Alice is a premium customer
And Alice has items worth $150 in her cart

When she applies the promo code "SAVE20"

Then the discount of $30 is applied
But the discount does not apply to sale items
```

---

## Scenario Outline

Use when the **same behavior** needs to be verified with **multiple data combinations**.

### Good Use

```gherkin
Scenario Outline: Invalid passwords are rejected
  Given I am on the sign-in page
  When I enter the password "<password>"
  Then I see the error "<error>"

  Examples:
    | password | error                          |
    | ""       | Password is required           |
    | "abc"    | Password must be 8+ characters |
    | " " * 8  | Password cannot be only spaces |
```

### Bad Use (each row tells a different story)

```gherkin
# DON'T DO THIS — these are different scenarios, not data variations
Scenario Outline: User actions
  When the user does "<action>"
  Then "<result>" happens

  Examples:
    | action        | result           |
    | signs in      | sees dashboard   |
    | resets pass   | gets email       |
    | deletes acct  | account removed  |
```

Fix: write each as a separate named Scenario.

### Outline Rules

- Minimum 3 rows to justify an Outline (2 rows = write two Scenarios)
- Each column in Examples should represent one variable concept
- Column headers use plain English, not technical names

---

## Background

Provides context shared by **all** scenarios in a Feature file.

### Correct Use

```gherkin
Feature: Order Management

  Background:
    Given Alice is logged in as a store manager
    And the store has 50 products in inventory

  Scenario: Manager views low stock items
    When Alice filters by "low stock"
    Then she sees items with fewer than 10 units

  Scenario: Manager restocks an item
    When Alice adds 100 units to "Running Shoes"
    Then the inventory shows 150 units
```

### When NOT to Use Background

- If only 1 of 3 scenarios needs the shared context → inline the Given in that scenario
- If Background contains more than 3 steps → your scenarios may be too coupled
- If Background sets up data that some scenarios override → split into two Feature files

---

## Scenario Length

| Steps | Verdict |
|-------|---------|
| 3-5   | ✅ Ideal |
| 6-7   | ⚠️ Acceptable — consider extracting Background |
| 8-10  | ⚠️ Probably doing too much — review for split |
| 10+   | ❌ Split required |

---

## Personas vs Generic Users

Use named personas for clarity:

- ✅ `Given Alice is a premium customer` — immediately communicates context
- ❌ `Given I am a premium customer` — "I" is ambiguous in multi-role systems
- ❌ `Given the user is a premium customer` — "the user" is vague

Personas make multi-role scenarios readable:

```gherkin
Scenario: Admin can see all orders, customer can only see their own
  Given Alice is a customer with 2 orders
  And Bob is an admin
  When Bob views the orders list
  Then Bob sees orders from all customers
  When Alice views the orders list
  Then Alice sees only her 2 orders
```
```

- [ ] **Step 2: Commit**

```bash
git add plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/writing-guide.md
git commit -m "feat(aio-gherkin-refine): add writing-guide.md with declarative style, naming, and templates"
```

---

### Task 5: Create references/review-checklist.md

**Files:**
- Create: `plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/review-checklist.md`

- [ ] **Step 1: Create the file**

```markdown
# Gherkin Review Checklist

## How to Rate Scenarios

For each scenario, assign:
- ✅ **Good** — passes all checks, no changes needed
- ⚠️ **Needs Work** — fixable with minor edits, show before/after
- ❌ **Rewrite** — fundamental issues, explain why and provide replacement

Always show the **before** and **after** side-by-side, with a one-sentence explanation of the principle violated.

---

## Anti-Patterns Catalog

### 1. Imperative Steps (UI Coupling)

**Smell:** Steps reference UI elements — buttons, fields, colors, positions, URLs.

**Before:**
```gherkin
When I click the red "Delete" button in the top-right corner
And I click "OK" in the confirmation dialog
```

**After:**
```gherkin
When I delete the account
And I confirm the deletion
```

**Why:** UI changes break scenarios without changing behavior. Gherkin should survive a UI redesign.

---

### 2. Conjunction Smell

**Smell:** A single `When` step (or `Then`) connects two unrelated actions with `And`.

**Before:**
```gherkin
When I submit the form And I check my email inbox
```

**After:**
```gherkin
# Scenario 1: Form submission
When I submit the registration form
Then I see "Registration successful"

# Scenario 2: Confirmation email
When I submit the registration form
Then I receive a confirmation email
```

**Why:** One scenario = one rule. If the `And` connects unrelated behaviors, they test different rules.

---

### 3. Scenario Bloat

**Smell:** More than 8 steps in a single scenario.

**Before:**
```gherkin
Scenario: Complete checkout
  Given I am logged in
  And I have items in my cart
  And I am on the checkout page
  When I enter my shipping address
  And I enter my billing address
  And I select "Standard Shipping"
  And I enter my credit card number
  And I enter the expiry date
  And I enter the CVV
  And I click "Place Order"
  Then I see the order confirmation
  And I receive a confirmation email
  And my cart is empty
```

**After:**
```gherkin
Scenario: Customer completes checkout with valid payment
  Given Alice has 2 items in her cart
  And Alice has a saved shipping address
  When Alice places her order with a valid credit card
  Then Alice receives an order confirmation
  And Alice's cart is empty

Scenario: Customer receives confirmation email after checkout
  Given Alice has just placed an order
  Then Alice receives a confirmation email within 1 minute
```

**Why:** Long scenarios test multiple rules. When one fails, you don't know which rule broke.

---

### 4. Incidental Details

**Smell:** Scenarios include data that doesn't affect the behavior being tested.

**Before:**
```gherkin
Given a user with ID 42, email "alice@example.com", created_at "2024-01-15 09:23:11", role "customer"
```

**After:**
```gherkin
Given Alice is a registered customer
```

**Why:** Incidental details make scenarios brittle (breaks when ID changes) and hard to read. Only include data that directly affects the outcome.

---

### 5. Missing Actor

**Smell:** It's unclear who is performing the action.

**Before:**
```gherkin
When the button is clicked
Then the record is deleted
```

**After:**
```gherkin
When an admin deletes the user account
Then the account is permanently removed
```

**Why:** Without an actor, it's unclear whether this is a customer, admin, or system action — all of which might have different behaviors.

---

### 6. Testing the UI, Not Behavior

**Smell:** Then steps describe visual elements rather than outcomes.

**Before:**
```gherkin
Then a green banner appears at the top of the page saying "Success!"
And the submit button becomes grey and disabled
```

**After:**
```gherkin
Then Alice sees a confirmation that her order was placed
And Alice cannot submit the order again
```

**Why:** Green banners and grey buttons are implementation details. The behavior is "confirmation" and "idempotent submission."

---

### 7. Duplicate Scenarios

**Smell:** Two or more scenarios test the same rule with minor variation.

**Before:**
```gherkin
Scenario: Login with valid email
  Given I enter "alice@example.com" and "password123"
  When I click Sign In
  Then I am logged in

Scenario: Login with valid email uppercase
  Given I enter "ALICE@EXAMPLE.COM" and "password123"
  When I click Sign In
  Then I am logged in
```

**After:**
```gherkin
Scenario Outline: Login succeeds regardless of email case
  Given I sign in with email "<email>" and password "password123"
  Then I am logged in

  Examples:
    | email                |
    | alice@example.com    |
    | ALICE@EXAMPLE.COM    |
    | Alice@Example.Com    |
```

**Why:** Use Scenario Outline when the same rule applies to multiple data variations.

---

### 8. Orphaned Scenario (No Rule)

**Smell:** The scenario exists but doesn't clearly test a business rule — it just "goes through the motions."

**Before:**
```gherkin
Scenario: User visits homepage
  Given I am on the homepage
  When I look at the page
  Then I see the page
```

**After:** Delete it. Or ask: what specific business rule does visiting the homepage need to test? A meaningful scenario would be:

```gherkin
Scenario: Unauthenticated visitor is shown the sign-in prompt
  Given I am not logged in
  When I visit the homepage
  Then I see the sign-in prompt
```

---

### 9. Then Without Observable Outcome

**Smell:** The Then step describes an internal state, not something a user/system can observe.

**Before:**
```gherkin
Then the order is saved to the database
And the inventory count is decremented in the warehouse system
```

**After:**
```gherkin
Then Alice receives an order confirmation
And the product shows as "Out of Stock" on the product page
```

**Why:** Gherkin tests behavior, not implementation. Internal database state is tested at the unit/integration level, not at the acceptance level.

---

## Quality Gates Checklist

Before marking a Feature file as ready:

- [ ] Each scenario tests exactly one business rule
- [ ] No UI references in any step (buttons, colors, URLs, field names)
- [ ] All steps use domain language (not technical/DB/API language)
- [ ] Every scenario has a named actor (Alice, Admin, Customer, System)
- [ ] Scenarios are independent — no scenario depends on a previous scenario's state
- [ ] Happy path is covered
- [ ] At least one failure/alternative scenario per rule that can fail
- [ ] Scenario Outline used only when same rule applies to multiple data sets
- [ ] Background contains only context shared by ALL scenarios
- [ ] No scenario exceeds 8 steps
- [ ] All Example Mapping questions have been answered

---

## Scoring

Count passing gates out of 11:
- **10-11** ✅ Production-ready
- **7-9** ⚠️ Address flagged items before implementing
- **<7** ❌ Rewrite recommended — schedule a 3 Amigos session
```

- [ ] **Step 2: Commit**

```bash
git add plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/review-checklist.md
git commit -m "feat(aio-gherkin-refine): add review-checklist.md with anti-patterns catalog and quality gates"
```

---

### Task 6: Create references/expert-frameworks.md

**Files:**
- Create: `plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/expert-frameworks.md`

- [ ] **Step 1: Create the file**

```markdown
# Expert Frameworks for BDD and Gherkin

## Cucumber School — Five Cardinal Rules

The official Cucumber Ltd guidelines, distilled from their training curriculum:

### Rule 1: Scenarios describe behavior from the user's perspective

Every step should read as something a real user (or stakeholder) would say. Not what a developer would write in code, and not what a QA engineer would write in a test plan.

> Test: read your scenario to a non-technical product stakeholder. Do they understand it without explanation?

### Rule 2: Each scenario is independent

No scenario should depend on state set up by a previous scenario. Each scenario must be able to run in any order, or in isolation, and still produce the same result.

Common violation: Scenario 1 creates a user, Scenario 2 logs in as that user. If Scenario 1 fails or doesn't run, Scenario 2 breaks.

Fix: use Background or step definitions that create state fresh for each scenario.

### Rule 3: Steps describe behavior, not implementation

Steps describe *what* the system should do, not *how* it does it. "The customer's balance is updated" not "a SQL UPDATE is run on the accounts table."

This is the declarative principle in action: if the implementation changes, the Gherkin should not need to change.

### Rule 4: Gherkin is optimized for human readability, not machine parsing

Gherkin files are **living documentation** — they are read by humans first, executed by machines second. Write for clarity. Favor plain English over technical precision.

> "The best Gherkin reads like a conversation about the system, not like code about the system."
> — Cucumber School

### Rule 5: One failing scenario = one failing requirement

Each scenario should test exactly one behavior. If a scenario has multiple `Then` steps that test unrelated outcomes, each should be its own scenario. When a test fails, you want to know *exactly* which requirement broke — not hunt through a 15-step scenario to find the issue.

---

## Specification by Example (Gojko Adzic)

Key principles from *Specification by Example* (2011) — the foundational text for BDD-driven development.

### Collaborative Specification

Specifications should be written collaboratively between business stakeholders and the development team — not handed down from business or generated by developers. The process of writing the spec is where shared understanding is built.

> "The value of specification by example is not in the documentation — it's in the conversations that produce the documentation."

### Key Process Workflow

1. **Deriving scope from goals** — start with business goals, not features. "Increase checkout conversion" → "reduce steps to checkout" → feature specifications.
2. **Specifying collaboratively** — workshops with Dev + QA + Business (the 3 Amigos).
3. **Illustrating using examples** — replace abstract requirements with concrete examples.
4. **Refining the specification** — remove ambiguity, resolve conflicts, clarify edge cases.
5. **Automating validation** — turn examples into automated tests.
6. **Evolving living documentation** — keep specs in sync with the system.

### Living Documentation

When Gherkin files are kept up-to-date and executed as tests, they become **Living Documentation**: documentation that is provably accurate because it's executed against the real system.

The implication: outdated Gherkin is worse than no Gherkin. A failing scenario that was never fixed, or a scenario that no longer reflects actual behavior, actively misleads the team.

---

## BDD in Action (John Smart)

Key principles from *BDD in Action* (2014), focused on layered BDD and sustainable test design.

### Layered Scenarios

BDD scenarios operate at multiple abstraction levels. Match the level to the audience:

**Business Layer** (high abstraction — what the business cares about):
```gherkin
Scenario: Premium customers get free shipping
  Given Alice is a premium customer
  When she places an order
  Then shipping is free
```

**Functional Layer** (mid abstraction — how the feature works):
```gherkin
Scenario: Free shipping threshold for premium tier
  Given Alice's account has premium status
  When she completes checkout with $50 of items
  Then the order total equals the item total with no shipping charge
```

**Technical Layer** (low abstraction — implementation detail, belongs in unit tests, NOT Gherkin):
```gherkin
# DON'T DO THIS IN GHERKIN
Scenario: ShippingCalculator returns 0 for premium tier
  Given a ShippingCalculator with premium rate = 0
  When calculate(50) is called
  Then the result is 0
```

Keep Gherkin at the Business or Functional layer. Technical layer belongs in unit tests.

### Avoid "How" at the Business Level

At the business acceptance level, "how" the system achieves something is irrelevant. A scenario that says "the database is updated" or "an API call is made" has leaked implementation detail into the business spec.

### Scenarios as Communication Tools

Scenarios should be written in a conversation — ideally in a workshop. A scenario written by one person in isolation is usually worse than one written through discussion. The act of discussion reveals assumptions, clarifies edge cases, and produces shared understanding.

---

## ATDD by Example (Markus Gärtner)

Key principles from *ATDD by Example* (2012), focused on the test-first BDD workflow.

### Three-Stage Acceptance

Every feature goes through three stages before it's complete:

1. **Specify** — write the acceptance scenario before writing any code
2. **Implement** — write just enough code to make the scenario pass
3. **Verify** — confirm the scenario passes *and* the business behavior is correct

The specify stage forces clarity before implementation. If you can't write a clear scenario, you don't understand the requirement well enough to build it.

### Test-First BDD

Write the Gherkin scenario as the first artifact of feature development — before writing code, before designing the API, before creating the database schema.

Benefits:
- Forces the team to agree on behavior before getting into implementation details
- Provides a clear definition of done
- Prevents over-engineering (only implement what the scenario requires)

### Scenario Granularity

Gärtner distinguishes between acceptance-level and unit-level granularity:

- **Acceptance level** (Gherkin): coarse-grained, end-to-end business behavior
- **Unit level** (code tests): fine-grained, edge cases, error handling

A common mistake is writing Gherkin at unit-test granularity — testing every possible input combination and every internal state. Gherkin should cover the business rules; unit tests cover the implementation.

> Rule of thumb: if you need 20+ scenarios to describe a single feature, you're probably writing unit tests in Gherkin syntax.

---

## Summary: When to Apply Which Framework

| Situation | Apply |
|-----------|-------|
| Starting a new feature from vague requirements | Example Mapping |
| Reviewing scenarios for completeness | 3 Amigos |
| Discovering unknowns before a sprint | Deliberate Discovery |
| Writing the first scenario for a feature | ATDD Test-First approach |
| Deciding abstraction level for scenarios | BDD in Action — Layered Scenarios |
| Keeping documentation accurate | Specification by Example — Living Documentation |
| Checking overall scenario quality | Cucumber School — Five Cardinal Rules |
```

- [ ] **Step 2: Commit**

```bash
git add plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/expert-frameworks.md
git commit -m "feat(aio-gherkin-refine): add expert-frameworks.md with Cucumber School, Spec by Example, BDD in Action, ATDD"
```

---

### Task 7: Update marketplace.json description

**Files:**
- Modify: `plugins/aio-gherkin-refine/.claude-plugin/plugin.json` (already done in Task 1)
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Read current marketplace.json entry for aio-gherkin-refine**

Search for `aio-gherkin-refine` in `.claude-plugin/marketplace.json` and update its `description` and `version` to match plugin.json v2.0.0:

```json
{
  "name": "aio-gherkin-refine",
  "source": "plugins/aio-gherkin-refine",
  "description": "Comprehensive BDD field guide — writes and reviews Gherkin with expert quality. Includes Example Mapping, 3 Amigos, anti-patterns catalog, and declarative style guide.",
  "version": "2.0.0",
  "author": "aiocean"
}
```

- [ ] **Step 2: Validate**

```bash
bash /Users/firegroup/projects/claude-plugins/scripts/validate-marketplace.sh 2>&1 | grep -A2 "aio-gherkin"
```

Expected: no errors for aio-gherkin-refine.

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat(aio-gherkin-refine): update marketplace.json to v2.0.0"
```

---

### Task 8: Final validation

- [ ] **Step 1: Run full validation**

```bash
bash /Users/firegroup/projects/claude-plugins/scripts/validate-marketplace.sh 2>&1 | tail -20
```

Expected: `✅ All checks passed` with no errors for aio-gherkin-refine.

- [ ] **Step 2: Verify file structure**

```bash
find /Users/firegroup/projects/claude-plugins/plugins/aio-gherkin-refine -type f | sort
```

Expected output:
```
plugins/aio-gherkin-refine/.claude-plugin/plugin.json
plugins/aio-gherkin-refine/skills/aio-gherkin-refine/SKILL.md
plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/expert-frameworks.md
plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/mental-models.md
plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/review-checklist.md
plugins/aio-gherkin-refine/skills/aio-gherkin-refine/references/writing-guide.md
```

- [ ] **Step 3: Final commit if any cleanup needed**

```bash
git add -A
git status  # should be clean after this
```
