# Form Design

Forms are the primary mechanism for user input. Poor form design is one of the leading causes of user abandonment. This reference covers every decision point from input types to mobile optimization.

---

## Input Types and When to Use Each

### Text Inputs

```html
<!-- Single-line text -->
<input type="text" />          <!-- Generic text: names, titles, short answers -->
<input type="email" />         <!-- Email: triggers @ keyboard on mobile, built-in validation -->
<input type="password" />      <!-- Passwords: masked input, avoid on low-risk flows -->
<input type="search" />        <!-- Search: shows clear button, magnifier icon on mobile -->
<input type="url" />           <!-- URLs: triggers URL keyboard on mobile -->
<input type="tel" />           <!-- Phone numbers: triggers numeric keyboard on mobile -->
<input type="number" />        <!-- Numeric only: use sparingly (see caveats below) -->

<!-- Multi-line text -->
<textarea rows="4"></textarea>  <!-- Open-ended responses, descriptions, notes -->
```

**`type="number"` caveats**: Scroll wheel increments value accidentally. Screen readers announce "spin button". For phone numbers, zip codes, or credit cards — use `type="text" inputmode="numeric"` instead.

```html
<!-- Better approach for formatted numbers -->
<input type="text" inputmode="numeric" pattern="[0-9]*" />
<input type="text" inputmode="decimal" />   <!-- Allows decimal point -->
<input type="text" inputmode="tel" />       <!-- Phone layout, allows +, -, spaces -->
```

### Date and Time Inputs

```html
<input type="date" />          <!-- Calendar picker: good for known dates (birthday, deadlines) -->
<input type="time" />          <!-- Time picker: appointments, schedules -->
<input type="datetime-local" /> <!-- Combined: use for event creation, logging -->
<input type="month" />         <!-- Month/year only: expiry dates, report periods -->
<input type="week" />          <!-- Week picker: rarely useful, consider a custom solution -->
```

**Decision guide**:
- Known exact date → `type="date"`
- Approximate date (age, era) → use 3 separate selects (month/day/year) or a custom picker
- Date range → two date inputs with validation logic
- Expiry dates on cards → `type="text" pattern="\d{2}/\d{2}"` (mm/yy is convention users know)

### Selection Inputs

```html
<!-- Binary choice -->
<input type="checkbox" />      <!-- On/off toggle state, agree to terms -->
<input type="radio" />         <!-- One of N mutually exclusive options -->

<!-- Multiple from list -->
<select multiple></select>     <!-- Multiple select: avoid on mobile, use checkboxes instead -->
<select></select>              <!-- Dropdown: 5-15 options, known set, not searchable -->

<!-- Range -->
<input type="range" />         <!-- Approximate value, not precise (volume, opacity) -->
<input type="color" />         <!-- Color picker: design tools, settings only -->
```

**Select vs. Radio buttons**:
- Fewer than 5 options → radio buttons (always visible, faster scanning)
- 5–15 options → dropdown select
- More than 15 options → searchable combobox or autocomplete
- Mobile with 3+ options → bottom sheet picker or select (native is better)

### File Inputs

```html
<input type="file" accept="image/*" />
<input type="file" accept=".pdf,.doc,.docx" multiple />

<!-- Drag-and-drop zone (see 07-drag-drop-gestures.md for full implementation) -->
<div role="region" aria-label="File upload area">
  <input type="file" id="file-upload" class="sr-only" />
  <label for="file-upload">Drop files here or click to upload</label>
</div>
```

---

## Label Placement

### Top-Aligned Labels (Recommended Default)

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151; /* gray-700 */
}

.field input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}
```

**When to use**: Default for all forms. Easiest to scan vertically. Labels and inputs share the same column width. Best for translation (label text can expand).

### Left-Aligned Labels

```css
.field {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: baseline;
  gap: 8px 16px;
}
```

**When to use**: Dense data-entry forms where vertical space is expensive (settings panels, admin tables, lookup forms). Requires fixed-width label column — problematic for long labels or translated text.

**Rule**: Labels should be right-aligned when left of input (reduces distance to scan across).

### Inline / Floating Labels

```css
.field {
  position: relative;
}

.field label {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  transition: all 0.2s ease;
  pointer-events: none;
  color: #9ca3af;
}

.field input:focus + label,
.field input:not(:placeholder-shown) + label {
  top: 0;
  transform: translateY(-50%) scale(0.85);
  background: white;
  padding: 0 4px;
  color: #2563eb;
}

.field input {
  padding: 16px 12px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
```

**When to use**: Space-constrained UI (mobile, compact sidebars). Avoid for long labels, required field indicators, or hint text (they compete for space). Known accessibility concern: label is hidden until focus — adds cognitive load.

**Avoid**: Placeholder-only labels (disappear on typing, no way to verify what you typed).

---

## Placeholder Text

### Do

```html
<!-- Show format hints -->
<input type="tel" placeholder="+1 (555) 000-0000" />

<!-- Show example when format is ambiguous -->
<input type="text" placeholder="e.g. Senior Software Engineer" />

<!-- Show range for numeric inputs -->
<input type="number" placeholder="1–100" />
```

### Don't

```html
<!-- WRONG: Using placeholder as a label -->
<input type="email" placeholder="Email address" />

<!-- WRONG: Restating the label -->
<label>First Name</label>
<input type="text" placeholder="Enter your first name" />

<!-- WRONG: Long instructions that disappear on type -->
<input type="password" placeholder="Must be 8+ chars with uppercase and number" />
```

**Rule**: Placeholder text is for format examples only. Instructions, requirements, and labels must exist outside the input. Placeholder color must have 4.5:1 contrast ratio (WCAG AA) — many designs fail this.

---

## Validation Timing

### On Blur (Recommended Default)

```javascript
input.addEventListener('blur', () => {
  validateField(input);
});
```

**When to use**: Most fields. Validates after user leaves the field. Avoids premature errors while typing. Shows error only when user has committed input.

### On Submit Only

```javascript
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const errors = validateAll(form);
  if (errors.length) {
    showErrors(errors);
    focusFirstError(form);
  }
});
```

**When to use**: Short forms (1–3 fields), login forms (security — don't reveal if email exists on blur), payment forms.

### Real-Time (Inline) Validation

```javascript
let hasBlurred = false;

input.addEventListener('blur', () => { hasBlurred = true; });
input.addEventListener('input', () => {
  if (hasBlurred) validateField(input); // Only after first blur
});
```

**When to use**: Password strength meters, username availability (with debounce), character count limits.

**Never**: Real-time validation before user has had a chance to finish typing. "Invalid email" appearing after typing "j" is hostile UX.

### Async Validation (Debounced)

```javascript
let debounceTimer;

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const result = await checkAvailability(input.value);
    showAvailabilityFeedback(result);
  }, 400); // 400ms debounce
});
```

---

## Error Message Patterns

### Inline Field Errors (Primary Pattern)

```html
<div class="field" aria-describedby="email-error">
  <label for="email">Email</label>
  <input
    type="email"
    id="email"
    aria-invalid="true"
    aria-describedby="email-error"
    class="input--error"
  />
  <span id="email-error" role="alert" class="error-message">
    Enter a valid email address (e.g. name@example.com)
  </span>
</div>
```

```css
.input--error {
  border-color: #ef4444; /* red-500 */
  background-color: #fef2f2; /* red-50 */
}

.error-message {
  font-size: 0.8125rem;
  color: #dc2626; /* red-600 */
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-message::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  background: url("data:image/svg+xml,...") no-repeat center;
}
```

### Summary Error Block (for Complex Forms)

```html
<div role="alert" class="error-summary" tabindex="-1">
  <h2>There are 3 errors in this form</h2>
  <ul>
    <li><a href="#email">Email: Enter a valid email address</a></li>
    <li><a href="#phone">Phone: Enter a 10-digit phone number</a></li>
    <li><a href="#dob">Date of birth: You must be 18 or older</a></li>
  </ul>
</div>
```

```javascript
// Focus summary after submit with errors
errorSummary.focus();
```

### Error Message Writing Rules

| Bad | Good |
|-----|------|
| "Invalid input" | "Enter a valid email address (e.g. name@example.com)" |
| "Field required" | "Enter your first name" |
| "Error" | "Password must be at least 8 characters" |
| "Please enter a valid date" | "Enter a date after January 1, 2000" |

- Be specific: what went wrong AND how to fix it
- Use plain language, not technical jargon
- Positive framing: "Enter at least 8 characters" not "Password too short"
- No exclamation points or blame language

---

## Required Field Indicators

### Standard Asterisk Pattern

```html
<label for="name">
  Full name
  <span aria-hidden="true" class="required-mark">*</span>
  <span class="sr-only">(required)</span>
</label>
```

```css
.required-mark {
  color: #dc2626;
  margin-left: 2px;
}
```

**Convention**: Mark required fields with `*`. Include a legend ("* Required fields") at the top of the form.

**Alternative**: If most fields are required, mark optional fields instead:

```html
<label for="middle">
  Middle name
  <span class="optional-tag">Optional</span>
</label>
```

```css
.optional-tag {
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
  margin-left: 6px;
}
```

---

## Multi-Step Forms

### When to Use

- More than 7 fields
- Fields belong to distinct categories (personal info → shipping → payment)
- Progressive disclosure reduces cognitive load
- Completion rate data shows abandonment at specific points

### Step Indicator

```html
<nav aria-label="Form progress">
  <ol class="stepper">
    <li class="stepper__step stepper__step--completed">
      <span class="stepper__number" aria-label="Step 1, completed">1</span>
      <span class="stepper__label">Account</span>
    </li>
    <li class="stepper__step stepper__step--active" aria-current="step">
      <span class="stepper__number" aria-label="Step 2 of 4, current">2</span>
      <span class="stepper__label">Personal Info</span>
    </li>
    <li class="stepper__step">
      <span class="stepper__number" aria-label="Step 3 of 4">3</span>
      <span class="stepper__label">Shipping</span>
    </li>
    <li class="stepper__step">
      <span class="stepper__number" aria-label="Step 4 of 4">4</span>
      <span class="stepper__label">Payment</span>
    </li>
  </ol>
</nav>
```

```css
.stepper {
  display: flex;
  list-style: none;
  padding: 0;
  gap: 0;
}

.stepper__step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* Connecting line between steps */
.stepper__step:not(:first-child)::before {
  content: '';
  position: absolute;
  top: 16px;
  right: 50%;
  width: 100%;
  height: 2px;
  background: #e5e7eb;
}

.stepper__step--completed::before {
  background: #2563eb;
}

.stepper__number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  background: white;
  position: relative;
  z-index: 1;
}

.stepper__step--completed .stepper__number {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.stepper__step--active .stepper__number {
  border-color: #2563eb;
  color: #2563eb;
}
```

### Multi-Step State Management

```javascript
class MultiStepForm {
  constructor(form) {
    this.form = form;
    this.steps = form.querySelectorAll('[data-step]');
    this.currentStep = 0;
    this.data = {}; // Persist data across steps
  }

  goToStep(index) {
    // Validate current step before advancing
    if (index > this.currentStep) {
      const valid = this.validateStep(this.currentStep);
      if (!valid) return;
    }

    this.steps[this.currentStep].hidden = true;
    this.steps[index].hidden = false;
    this.currentStep = index;

    // Update stepper UI
    this.updateStepIndicator();

    // Scroll to top of form
    this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Focus first interactive element
    const firstInput = this.steps[index].querySelector('input, select, textarea');
    firstInput?.focus();
  }

  saveStepData() {
    const inputs = this.steps[this.currentStep].querySelectorAll('[name]');
    inputs.forEach(input => {
      this.data[input.name] = input.value;
    });
  }
}
```

**Rules**:
- Save progress between steps (don't wipe data on back navigation)
- Allow backward navigation freely
- Show a summary page before final submission
- Validate on "Next", not on final submit

---

## Progressive Disclosure in Forms

Show additional fields only when relevant:

```html
<!-- Conditional field reveal -->
<div class="field">
  <label>
    <input type="checkbox" id="has-company" />
    I'm purchasing for a company
  </label>
</div>

<div id="company-fields" hidden aria-hidden="true">
  <div class="field">
    <label for="company-name">Company name <span aria-hidden="true">*</span></label>
    <input type="text" id="company-name" required />
  </div>
  <div class="field">
    <label for="vat">VAT number</label>
    <input type="text" id="vat" />
  </div>
</div>
```

```javascript
document.getElementById('has-company').addEventListener('change', (e) => {
  const companyFields = document.getElementById('company-fields');
  companyFields.hidden = !e.target.checked;
  companyFields.setAttribute('aria-hidden', String(!e.target.checked));

  // Toggle required on revealed fields
  companyFields.querySelectorAll('[required]').forEach(input => {
    input.required = e.target.checked;
  });
});
```

---

## Mobile Form Optimization

### Input Mode for Correct Keyboards

```html
<!-- Numeric PIN -->
<input type="text" inputmode="numeric" pattern="[0-9]{4}" autocomplete="one-time-code" />

<!-- Decimal numbers -->
<input type="text" inputmode="decimal" />

<!-- Phone -->
<input type="tel" inputmode="tel" />

<!-- Search -->
<input type="search" inputmode="search" />
```

### Touch Target Sizing

```css
/* Minimum 44x44px touch targets */
input, select, textarea, button, label {
  min-height: 44px;
}

/* Checkbox/radio with expanded tap area */
input[type="checkbox"],
input[type="radio"] {
  width: 20px;
  height: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
}
```

### Prevent Zoom on Focus (iOS)

```html
<!-- Set base font-size to 16px on inputs — iOS zooms when < 16px -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

```css
input, select, textarea {
  font-size: 16px; /* Prevents iOS auto-zoom */
}
```

### Mobile-Specific Patterns

- **Date inputs**: Use native `type="date"` — native pickers are optimized per OS
- **Long selects**: Consider a bottom sheet modal instead of `<select>` for 5+ options
- **Numeric pads**: Use `inputmode="numeric"` for PIN/OTP fields to get number pad without scroll-spinners
- **Autofill**: Always set `autocomplete` attributes — reduces typing significantly

---

## Autofill and Autocomplete

### Autocomplete Attribute Values

```html
<!-- Name fields -->
<input autocomplete="name" />
<input autocomplete="given-name" />
<input autocomplete="family-name" />

<!-- Contact -->
<input autocomplete="email" />
<input autocomplete="tel" />

<!-- Address -->
<input autocomplete="street-address" />
<input autocomplete="address-line1" />
<input autocomplete="address-line2" />
<input autocomplete="address-level2" />   <!-- City -->
<input autocomplete="address-level1" />   <!-- State/Province -->
<input autocomplete="postal-code" />
<input autocomplete="country" />

<!-- Payment -->
<input autocomplete="cc-name" />
<input autocomplete="cc-number" />
<input autocomplete="cc-exp" />
<input autocomplete="cc-csc" />

<!-- Credentials -->
<input autocomplete="username" />
<input autocomplete="current-password" />
<input autocomplete="new-password" />
<input autocomplete="one-time-code" />   <!-- OTP/2FA codes -->
```

**Critical**: `autocomplete="new-password"` tells password managers to generate AND save. `autocomplete="current-password"` tells them to fill existing.

### Autofill Styling

```css
/* Style autofilled inputs to match your design */
input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px white inset;
  -webkit-text-fill-color: #111827;
  transition: background-color 5000s ease-in-out 0s;
}

input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px white inset, 0 0 0 3px rgba(37, 99, 235, 0.2);
}
```

---

## Complete Form Example

```html
<form id="checkout-form" novalidate>
  <fieldset>
    <legend>Shipping address</legend>

    <div class="field">
      <label for="full-name">
        Full name
        <span aria-hidden="true" class="required">*</span>
      </label>
      <input
        type="text"
        id="full-name"
        name="full-name"
        autocomplete="name"
        required
        aria-required="true"
      />
    </div>

    <div class="field">
      <label for="address">Street address</label>
      <input
        type="text"
        id="address"
        name="address"
        autocomplete="street-address"
      />
    </div>

    <div class="field-row">
      <div class="field">
        <label for="city">City</label>
        <input
          type="text"
          id="city"
          name="city"
          autocomplete="address-level2"
        />
      </div>
      <div class="field field--narrow">
        <label for="zip">ZIP code</label>
        <input
          type="text"
          id="zip"
          name="zip"
          inputmode="numeric"
          autocomplete="postal-code"
          pattern="[0-9]{5}"
          aria-describedby="zip-hint"
        />
        <span id="zip-hint" class="hint">5 digits</span>
      </div>
    </div>
  </fieldset>

  <p class="form-footer">
    <span aria-hidden="true">*</span> Required fields
  </p>

  <button type="submit">Continue to payment</button>
</form>
```

---

## Quick Reference: Form Design Decisions

| Decision | Rule |
|----------|------|
| Label placement | Top-aligned by default |
| Required indicator | Asterisk `*` with legend |
| Error timing | On blur (first time) + on submit |
| Placeholder | Format examples only, never labels |
| Error messages | Specific + actionable, not "Invalid" |
| Mobile font size | 16px minimum to prevent iOS zoom |
| Autocomplete | Always set, especially for payment/address |
| Multi-step threshold | 7+ fields or 3+ distinct categories |
| Optional vs required | Mark the minority set |
| Number inputs | `type="text" inputmode="numeric"` for formatted numbers |
