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
    | "        "| Password cannot be only spaces |
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
