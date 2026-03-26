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

### 10. Generic "I" Instead of Named Actor

**Smell:** Using first-person "I" in multi-actor scenarios — ambiguous when multiple roles exist.

**Before:**
```gherkin
When I tweet a message
Then I see it in my feed
```

**After:**
```gherkin
When Aslak tweets a message
And Steve follows Aslak
Then Steve sees the message in his feed
But Matt (who does not follow Aslak) does not see it
```

**Why:** "I" is fine for single-actor features but breaks down instantly when multiple roles need to be distinguished. Named personas (Alice, Bob, Admin) make multi-role scenarios unambiguous and readable. *Source: Cucumber anti-patterns, part 2.*

---

### 11. Vague / High-Level Scenarios

**Smell:** Steps use indefinite quantities or abstract descriptions that cannot be verified.

**Before:**
```gherkin
Given I have some money in my account
When I withdraw some money
Then the balance should be the original balance minus the amount withdrawn
```

**After:**
```gherkin
Given my account balance is $500
When I withdraw $150
Then my new balance should be $350
```

**Why:** Abstract values ("some", "original", "the amount") are un-automatable and un-verifiable. Every scenario needs concrete, specific values that a test can assert against. *Source: Cucumber anti-patterns, part 1.*

---

## Quality Gates Checklist

Before marking a Feature file as ready:

- [ ] Each scenario tests exactly one business rule
- [ ] No UI references in any step (buttons, colors, URLs, field names)
- [ ] All steps use domain language (not technical/DB/API language)
- [ ] Named actors used (Alice, Admin, Bob) — no generic "I" in multi-actor scenarios
- [ ] All quantities and values are concrete (no "some", "a few", "the amount")
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
