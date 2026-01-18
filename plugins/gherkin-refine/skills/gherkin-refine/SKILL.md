---
name: gherkin-refine
description: Refines ambiguous user requests into structured Gherkin format (Given/When/Then) before implementation. Use when requests are unclear, have multiple interpretations, need requirement confirmation, or user mentions gherkin, BDD, acceptance criteria.
---

# gherkin-refine

Transforms vague or complex user requests into clear Gherkin scenarios to ensure mutual understanding before taking action.

## When to use

- User request is ambiguous or could be interpreted multiple ways
- Requirements span multiple steps or conditions
- Edge cases need clarification
- You want to confirm understanding before implementing

## Process

1. Parse user request for intent
2. Identify ambiguities, assumptions, edge cases
3. Write Gherkin scenario(s) capturing your understanding
4. Present to user for confirmation
5. Proceed only after user confirms or refines

## Format

```gherkin
Feature: [What user wants to achieve]

  Scenario: [Main flow]
    Given [initial context/state]
    And [additional context if needed]
    When [user action or trigger]
    And [additional actions if needed]
    Then [expected outcome]
    And [additional outcomes if needed]

  Scenario: [Edge case or alternative flow]
    Given [different context]
    When [action]
    Then [different outcome]
```

## Examples

**User says:** "Add a button to delete users"

**Refine as:**

```gherkin
Feature: User deletion

  Scenario: Admin deletes a user
    Given I am logged in as an admin
    And I am on the user management page
    When I click the delete button for a user
    Then a confirmation dialog appears
    When I confirm the deletion
    Then the user is removed from the system
    And I see a success message

  Scenario: Non-admin cannot delete users
    Given I am logged in as a regular user
    When I view the user list
    Then I do not see delete buttons
```

Then ask: "Does this match what you need? Any scenarios I should add or modify?"

**User says:** "Make the search faster"

**Refine as:**

```gherkin
Feature: Search performance improvement

  Scenario: Search returns results quickly
    Given the database has 100,000 records
    When I search for "keyword"
    Then results appear within 500ms

  Scenario: Search with filters
    Given I apply category and date filters
    When I search for "keyword"
    Then filtered results appear within 500ms
```

Then ask: "What's your current search time? What's your target? Should I focus on indexing, caching, or query optimization?"

## Keep it simple

- 1-3 scenarios usually enough
- Skip obvious Given/When/Then if context is clear
- Focus on clarifying ambiguities, not documenting everything
- Use natural language, not technical jargon
