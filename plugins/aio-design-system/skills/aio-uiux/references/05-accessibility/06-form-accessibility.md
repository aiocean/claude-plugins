# Form Accessibility

Forms are the most interaction-dense part of any web application and the highest-failure-rate area in accessibility audits. Every form input needs a label, every error needs text, and every validation decision has timing implications.

---

## Label Association

Labels are mandatory for all form controls. Without a label, screen readers announce only the input type — useless to the user.

### Method 1: Explicit association (for/id)

The most reliable method. Works across all browsers and AT combinations.

```html
<label for="first-name">First name</label>
<input type="text" id="first-name" name="first_name" autocomplete="given-name">

<!-- The for attribute value must exactly match the input's id -->
<!-- Both are case-sensitive -->
```

### Method 2: Implicit association (wrapping label)

Wrapping the input inside the label creates an implicit association. Reliable but slightly less supported in edge cases.

```html
<label>
  First name
  <input type="text" name="first_name" autocomplete="given-name">
</label>

<!-- Works, but explicit for/id is preferred for complex layouts -->
<!-- where label and input are not adjacent in DOM -->
```

### Method 3: aria-labelledby

Use when the visible label text is not a `<label>` element, or when you need to compose a name from multiple text nodes.

```html
<!-- Table-based form where column header is the label -->
<table>
  <thead>
    <tr>
      <th id="col-qty">Quantity</th>
      <th id="col-price">Unit price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><input type="number" aria-labelledby="col-qty" min="1"></td>
      <td><input type="number" aria-labelledby="col-price" min="0" step="0.01"></td>
    </tr>
  </tbody>
</table>

<!-- Composed label from multiple elements -->
<p id="delivery-label">Delivery address</p>
<input type="text" aria-labelledby="delivery-label" aria-label="Street address">
<!-- "Street address" overrides — aria-label wins over aria-labelledby -->
<!-- To compose: list multiple IDs space-separated -->
<span id="item-name">Blue Widget</span>
<input type="number" aria-labelledby="qty-label item-name" id="qty-1">
<span id="qty-label" class="sr-only">Quantity for</span>
<!-- Announces: "Quantity for Blue Widget, spin button" -->
```

### Method 4: aria-label (last resort)

Use only when no visible label exists and cannot be added.

```html
<!-- Standalone search with no space for visible label -->
<input
  type="search"
  aria-label="Search products"
  placeholder="Search by name or SKU..."
>

<!-- RULE: aria-label must contain visible text if any visible text is present (WCAG 2.5.3) -->
```

### Fieldset and Legend for groups

Use `<fieldset>` + `<legend>` to group related inputs (radio groups, checkbox groups, related fields).

```html
<!-- Radio group -->
<fieldset>
  <legend>Preferred contact method</legend>
  <label><input type="radio" name="contact" value="email"> Email</label>
  <label><input type="radio" name="contact" value="phone"> Phone</label>
  <label><input type="radio" name="contact" value="post"> Post</label>
</fieldset>

<!-- Checkbox group -->
<fieldset>
  <legend>Notification preferences</legend>
  <label>
    <input type="checkbox" name="notify" value="email"> Email notifications
  </label>
  <label>
    <input type="checkbox" name="notify" value="sms"> SMS notifications
  </label>
</fieldset>

<!-- Address group (not radio/checkbox, but semantically a group) -->
<fieldset>
  <legend>Shipping address</legend>
  <div>
    <label for="addr-street">Street address</label>
    <input type="text" id="addr-street" autocomplete="shipping street-address">
  </div>
  <div>
    <label for="addr-city">City</label>
    <input type="text" id="addr-city" autocomplete="shipping address-level2">
  </div>
  <div>
    <label for="addr-zip">Postcode</label>
    <input type="text" id="addr-zip" autocomplete="shipping postal-code">
  </div>
</fieldset>
```

---

## Error Message Association

Error messages must be programmatically linked to their input. Simply placing text near the input visually is not sufficient — screen readers won't know it relates to the field.

### aria-describedby for error messages

```html
<div class="field">
  <label for="email">Email address</label>
  <input
    type="email"
    id="email"
    name="email"
    aria-describedby="email-hint email-error"
    aria-invalid="true"
    value="notanemail"
  >
  <p id="email-hint" class="hint">We'll never share your email.</p>
  <p id="email-error" class="error" role="alert">
    Enter a valid email address — for example, name@example.com
  </p>
</div>
```

### aria-errormessage (WCAG 2.2 / ARIA 1.1)

`aria-errormessage` is newer and more specific than `aria-describedby` for errors. Use alongside `aria-invalid`.

```html
<input
  type="text"
  id="username"
  aria-invalid="true"
  aria-errormessage="username-error"
>
<p id="username-error" role="alert">
  Username must be between 3 and 20 characters.
</p>
```

**Note**: `aria-errormessage` has uneven AT support as of 2024. Use `aria-describedby` as the primary approach and add `aria-errormessage` as enhancement.

```html
<!-- Belt-and-suspenders approach: both attributes -->
<input
  type="email"
  id="email"
  aria-invalid="true"
  aria-describedby="email-error"
  aria-errormessage="email-error"
>
<p id="email-error" role="alert">Enter a valid email address.</p>
```

### Dynamically showing errors

```javascript
function showFieldError(inputId, errorMessage) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);

  input.setAttribute('aria-invalid', 'true');
  errorEl.textContent = errorMessage;
  errorEl.removeAttribute('hidden');

  // role="alert" causes immediate announcement
  // For polite announcement, use aria-live="polite" instead
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);

  input.removeAttribute('aria-invalid');
  errorEl.setAttribute('hidden', '');
  errorEl.textContent = '';
}
```

---

## Required Fields

Never rely solely on visual asterisks to communicate required status.

```html
<!-- Method 1: aria-required (works in all AT) -->
<label for="full-name">
  Full name
  <span aria-hidden="true"> *</span>
</label>
<input type="text" id="full-name" aria-required="true">

<!-- Method 2: HTML required attribute (implicit aria-required) -->
<input type="text" id="full-name" required>
<!-- Screen reader announces "required" automatically -->

<!-- Method 3: Text in label (most explicit, most reliable) -->
<label for="full-name">Full name (required)</label>
<input type="text" id="full-name" required>

<!-- Explain asterisk meaning at form start -->
<p>Fields marked with <span aria-hidden="true">*</span>
  <span class="sr-only">an asterisk</span> are required.
</p>

<!-- If most fields are required, mark optional ones instead -->
<label for="company">Company name (optional)</label>
<input type="text" id="company">
```

---

## Validation Patterns

### When to validate

| Trigger | Pattern | Notes |
|---|---|---|
| On blur (field exit) | Validate after user leaves field | Don't validate empty field on first blur |
| On submit | Validate all fields | Always do server-side validation too |
| On input (live) | Only for character count, password strength | Not for format checks — too aggressive |

```javascript
// Good: Validate on blur, but only if user has interacted
const fields = document.querySelectorAll('input, select, textarea');

fields.forEach(field => {
  let hasBlurred = false;

  field.addEventListener('blur', () => {
    hasBlurred = true;
    validateField(field);
  });

  // Live validation: only re-validate after first blur (as user corrects)
  field.addEventListener('input', () => {
    if (hasBlurred) validateField(field);
  });
});

function validateField(field) {
  const value = field.value.trim();
  const errorEl = document.getElementById(`${field.id}-error`);

  if (!errorEl) return;

  // Don't validate empty optional fields
  if (!field.required && value === '') {
    clearError(field, errorEl);
    return;
  }

  const error = getValidationError(field, value);

  if (error) {
    showError(field, errorEl, error);
  } else {
    clearError(field, errorEl);
  }
}
```

### Inline validation timing

```javascript
// DON'T: Validate email while user is still typing
// "inv@" → error: "Invalid email" — premature, annoying

// DO: Validate email on blur
// User types "invalid", clicks away → error shown

// DON'T: Clear error on blur (user may be tabbing through)
// DO: Clear error as soon as field becomes valid (on input event)

// Password strength: live feedback is acceptable here
passwordInput.addEventListener('input', updatePasswordStrength);
```

---

## Error Summary Pattern

When a form is submitted with multiple errors, an error summary at the top provides:
1. Announcement via focus shift (screen reader alert)
2. Overview of all errors
3. Links to jump directly to each error field

```html
<div
  id="error-summary"
  role="alert"
  aria-labelledby="error-summary-title"
  class="error-summary"
  hidden
  tabindex="-1"
>
  <h2 id="error-summary-title">There are 3 errors in this form</h2>
  <p>Fix the following errors before continuing:</p>
  <ul>
    <li><a href="#email">Email address: Enter a valid email address</a></li>
    <li><a href="#password">Password: Must be at least 8 characters</a></li>
    <li><a href="#terms">Terms: You must accept the terms to continue</a></li>
  </ul>
</div>

<form id="signup-form" novalidate>
  <!-- form fields with their error messages -->
</form>
```

```javascript
function handleSubmit(e) {
  e.preventDefault();

  const errors = validateAll();

  if (errors.length > 0) {
    // 1. Show and populate summary
    const summary = document.getElementById('error-summary');
    const list = summary.querySelector('ul');

    list.innerHTML = errors.map(err =>
      `<li><a href="#${err.fieldId}">${err.label}: ${err.message}</a></li>`
    ).join('');

    summary.removeAttribute('hidden');

    // 2. Move focus to summary — triggers role="alert" announcement
    summary.focus();

    // 3. Show individual field errors
    errors.forEach(err => showFieldError(err.fieldId, err.message));

  } else {
    // Submit
    e.target.submit();
  }
}

document.getElementById('signup-form').addEventListener('submit', handleSubmit);
```

---

## Multi-Step Form Accessibility

```html
<!-- Step indicator -->
<nav aria-label="Form progress">
  <ol>
    <li aria-current="step">
      <span class="sr-only">Current step: </span>
      Personal details
    </li>
    <li>
      <span class="sr-only">Next step: </span>
      Payment
    </li>
    <li>
      <span class="sr-only">Final step: </span>
      Review
    </li>
  </ol>
</nav>

<!-- Step content region -->
<div
  role="region"
  aria-labelledby="step-heading"
  aria-live="polite"
>
  <h2 id="step-heading">Step 1 of 3: Personal details</h2>
  <!-- step fields -->
</div>
```

```javascript
function goToNextStep(nextStepEl, nextHeadingEl) {
  // 1. Validate current step
  const errors = validateCurrentStep();
  if (errors.length > 0) {
    showErrorSummary(errors);
    return;
  }

  // 2. Show next step
  currentStep.setAttribute('hidden', '');
  nextStepEl.removeAttribute('hidden');

  // 3. Update progress indicator
  updateProgressIndicator();

  // 4. Move focus to step heading for announcement
  nextHeadingEl.setAttribute('tabindex', '-1');
  nextHeadingEl.focus();

  // 5. Scroll to top of form
  nextHeadingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

---

## Autocomplete Attribute

The `autocomplete` attribute enables browser autofill and is required by WCAG 1.3.5 for personal data fields.

```html
<!-- Full name -->
<input type="text" autocomplete="name" name="name">

<!-- Name parts -->
<input type="text" autocomplete="given-name" name="first_name">   <!-- First -->
<input type="text" autocomplete="family-name" name="last_name">   <!-- Last -->
<input type="text" autocomplete="honorific-prefix" name="title">  <!-- Mr, Dr, etc. -->

<!-- Contact -->
<input type="email"  autocomplete="email"     name="email">
<input type="tel"    autocomplete="tel"       name="phone">
<input type="url"    autocomplete="url"       name="website">

<!-- Address — use section- prefix for multiple addresses -->
<input type="text" autocomplete="shipping street-address"  name="ship_street">
<input type="text" autocomplete="shipping address-level2"  name="ship_city">
<input type="text" autocomplete="shipping address-level1"  name="ship_state">
<input type="text" autocomplete="shipping postal-code"     name="ship_zip">
<input type="text" autocomplete="shipping country-name"    name="ship_country">

<input type="text" autocomplete="billing street-address"   name="bill_street">

<!-- Credentials -->
<input type="text"     autocomplete="username"         name="username">
<input type="password" autocomplete="current-password" name="password">
<input type="password" autocomplete="new-password"     name="new_password">

<!-- Credit card -->
<input type="text"   autocomplete="cc-name"       name="cc_name">
<input type="text"   autocomplete="cc-number"     name="cc_number">
<input type="text"   autocomplete="cc-exp"        name="cc_exp">
<input type="text"   autocomplete="cc-csc"        name="cc_csc">

<!-- One-time code (SMS verification) -->
<input type="text" autocomplete="one-time-code" inputmode="numeric" name="otp">

<!-- Turn off for fields that shouldn't be autofilled -->
<input type="text" autocomplete="off" name="captcha_answer">
```

---

## Input Purpose and inputmode

`inputmode` controls the mobile keyboard type without changing the input semantics.

```html
<!-- Numeric keyboard (no decimal point) -->
<input type="text" inputmode="numeric" pattern="[0-9]*"
  autocomplete="one-time-code"
  aria-label="6-digit verification code">

<!-- Numeric with decimal (prices) -->
<input type="text" inputmode="decimal" name="amount"
  aria-label="Amount in USD">

<!-- Phone keyboard -->
<input type="tel" inputmode="tel" autocomplete="tel">

<!-- Email keyboard (shows @ key) -->
<input type="email" inputmode="email" autocomplete="email">

<!-- URL keyboard (shows .com key) -->
<input type="url" inputmode="url" autocomplete="url">

<!-- Search keyboard (shows search/go key) -->
<input type="search" inputmode="search">

<!-- No keyboard (use when providing custom input) -->
<div role="spinbutton" inputmode="none" tabindex="0">...</div>
```

---

## Complete Accessible Form Example

```html
<form id="checkout-form" novalidate aria-labelledby="form-title">
  <h1 id="form-title">Checkout — Your details</h1>

  <!-- Error summary (hidden until submit with errors) -->
  <div
    id="error-summary"
    role="alert"
    aria-labelledby="error-summary-heading"
    hidden
    tabindex="-1"
    class="error-summary"
  >
    <h2 id="error-summary-heading">There are errors in this form</h2>
    <ul id="error-list"></ul>
  </div>

  <!-- Required fields note -->
  <p class="required-note">
    Fields marked <span aria-hidden="true">*</span>
    <span class="sr-only">with an asterisk</span> are required.
  </p>

  <!-- Personal details group -->
  <fieldset>
    <legend>Personal details</legend>

    <div class="field">
      <label for="full-name">
        Full name
        <span aria-hidden="true">*</span>
      </label>
      <input
        type="text"
        id="full-name"
        name="full_name"
        autocomplete="name"
        required
        aria-required="true"
        aria-describedby="full-name-error"
      >
      <p id="full-name-error" class="field-error" hidden role="alert"></p>
    </div>

    <div class="field">
      <label for="email">
        Email address
        <span aria-hidden="true">*</span>
      </label>
      <p id="email-hint" class="field-hint">
        Your order confirmation will be sent here.
      </p>
      <input
        type="email"
        id="email"
        name="email"
        autocomplete="email"
        required
        aria-required="true"
        aria-describedby="email-hint email-error"
        inputmode="email"
      >
      <p id="email-error" class="field-error" hidden role="alert"></p>
    </div>
  </fieldset>

  <!-- Shipping address group -->
  <fieldset>
    <legend>Shipping address</legend>

    <div class="field">
      <label for="street">Street address <span aria-hidden="true">*</span></label>
      <input
        type="text"
        id="street"
        name="street"
        autocomplete="shipping street-address"
        required
        aria-required="true"
        aria-describedby="street-error"
      >
      <p id="street-error" class="field-error" hidden role="alert"></p>
    </div>

    <div class="field-row">
      <div class="field">
        <label for="city">City <span aria-hidden="true">*</span></label>
        <input
          type="text"
          id="city"
          name="city"
          autocomplete="shipping address-level2"
          required
          aria-required="true"
          aria-describedby="city-error"
        >
        <p id="city-error" class="field-error" hidden role="alert"></p>
      </div>

      <div class="field">
        <label for="postcode">Postcode <span aria-hidden="true">*</span></label>
        <input
          type="text"
          id="postcode"
          name="postcode"
          autocomplete="shipping postal-code"
          required
          aria-required="true"
          aria-describedby="postcode-error"
          inputmode="numeric"
          pattern="[0-9]{5}(-[0-9]{4})?"
        >
        <p id="postcode-error" class="field-error" hidden role="alert"></p>
      </div>
    </div>
  </fieldset>

  <!-- Terms -->
  <div class="field">
    <label>
      <input
        type="checkbox"
        id="terms"
        name="terms"
        required
        aria-required="true"
        aria-describedby="terms-error"
      >
      I agree to the <a href="/terms">Terms and Conditions</a>
      <span aria-hidden="true">*</span>
    </label>
    <p id="terms-error" class="field-error" hidden role="alert"></p>
  </div>

  <button type="submit">Place order</button>
</form>
```

---

## Form Accessibility Checklist

```
Labels
[ ] Every input has an associated label (for/id, implicit, or aria-labelledby)
[ ] Groups of related inputs use fieldset + legend
[ ] Placeholder text is not the only label
[ ] aria-label contains visible label text (WCAG 2.5.3)

Required fields
[ ] Required fields marked visually (asterisk) AND programmatically (required or aria-required)
[ ] Asterisk meaning explained to users
[ ] Optional fields labeled as (optional) if most fields are required

Error messages
[ ] Errors are text (not just color)
[ ] Error messages linked to input via aria-describedby
[ ] aria-invalid="true" set on fields with errors
[ ] Errors have role="alert" or are in aria-live region
[ ] On submit failure: focus moves to error summary
[ ] Error summary links to each error field
[ ] Errors persist until corrected (not auto-cleared on blur)

Input assistance
[ ] autocomplete attribute on personal data fields
[ ] inputmode set for mobile-appropriate keyboard
[ ] Format hints provided before input (not only in error)
[ ] Validation triggers on blur, not on input (except real-time feedback)
[ ] Success confirmation announced after successful submission

Multi-step forms
[ ] Current step indicated with aria-current="step"
[ ] Step heading receives focus after navigation
[ ] Back button preserves entered data
[ ] Progress bar/indicator has accessible text
```
