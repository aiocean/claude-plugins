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

- A story is **ready** when: more green cards than red cards, and all rules have at least one example
- A story is **NOT ready** when: red question cards outnumber green examples

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
