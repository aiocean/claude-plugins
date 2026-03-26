# Forms & Inputs

## Form Design Principles

Forms are the primary way users provide data. Every field added has a cost — completion rates drop with each additional field. Question every field: is this data required now, or can it be collected later?

**Label placement:** Top-aligned labels (above input) outperform side-aligned in completion speed. Exception: compact horizontal forms where vertical space is constrained.

**Field width communicates expected input length.** A zip code field should be narrow; a bio textarea wide. Width is a visual hint.

---

## Text Input

The foundation of all form controls.

### Anatomy
```
[Label]         ← always visible, never placeholder-only
[Helper text]   ← optional, appears below label
┌─────────────────────────────┐
│  Placeholder / value        │  ← input field
└─────────────────────────────┘
[Error message]  ← replaces helper text on error
[Character count] ← right-aligned, below field
```

### States

```css
.input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

/* Default */
.input { border-color: var(--color-border-default); }

/* Hover */
.input:hover:not(:disabled):not(:focus) {
  border-color: var(--color-border-hover);
}

/* Focus */
.input:focus {
  outline: none;
  border-color: var(--color-brand-500);
  box-shadow: 0 0 0 3px var(--color-brand-100);
}

/* Error */
.input--error {
  border-color: var(--color-red-500);
}
.input--error:focus {
  box-shadow: 0 0 0 3px var(--color-red-100);
}

/* Success */
.input--success { border-color: var(--color-green-500); }

/* Disabled */
.input:disabled {
  background: var(--color-surface-disabled);
  color: var(--color-text-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Read-only */
.input[readonly] {
  background: var(--color-surface-subtle);
  cursor: default;
}
```

### Sizing

| Size | Height | Padding H | Font |
|------|--------|-----------|------|
| sm   | 32px   | 10px      | 13px |
| md   | 40px   | 12px      | 14px |
| lg   | 48px   | 16px      | 16px |

### Accessibility
```html
<div class="field">
  <label for="email" class="label">
    Email address
    <span class="required" aria-hidden="true">*</span>
  </label>
  <input
    id="email"
    type="email"
    name="email"
    class="input"
    autocomplete="email"
    inputmode="email"
    aria-required="true"
    aria-describedby="email-hint email-error"
    aria-invalid="false"
  />
  <p id="email-hint" class="field-hint">We'll send a confirmation link here.</p>
  <p id="email-error" class="field-error" role="alert" hidden>
    Please enter a valid email address.
  </p>
</div>
```

**Rules:**
- Every input must have a `<label>` with matching `for`/`id`
- Never use placeholder as the only label — it disappears on type
- `aria-describedby` links hint + error text to the input
- `aria-invalid="true"` set programmatically on error
- `role="alert"` on error message ensures screen readers announce it

---

## Textarea

For multi-line text. Resizable by default but often constrained.

```css
.textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  resize: vertical; /* allow vertical resize only */
  line-height: 1.5;
  font-family: inherit; /* fix monospace default */
}

/* Auto-resize variant (JS required) */
.textarea--auto {
  resize: none;
  overflow: hidden;
}
```

```js
// Auto-resize script
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
textarea.addEventListener('input', () => autoResize(textarea));
```

**Min/max rows:** Set `rows` attribute as initial hint. Add CSS `min-height` and `max-height` with `overflow-y: auto` to prevent infinite growth.

---

## Select / Dropdown

Native `<select>` is accessible by default but styling is limited. Custom dropdowns add complexity — evaluate the trade-off.

### Native Select
```html
<select id="country" name="country" aria-label="Country">
  <option value="">Select a country</option>
  <option value="us">United States</option>
  <option value="gb">United Kingdom</option>
</select>
```

```css
/* Style the container, not the select directly */
.select-wrapper {
  position: relative;
}
.select-wrapper select {
  appearance: none;
  width: 100%;
  padding-right: 36px; /* room for chevron */
  background: transparent;
  cursor: pointer;
}
.select-wrapper::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  /* chevron icon via mask-image or SVG */
}
```

### When to Use Custom Select
- Need icons or rich content in options
- Need search/filter within options (use Combobox instead)
- Need grouping with visual hierarchy
- More than ~15 options (native mobile scroll is fine; desktop can feel archaic)

---

## Checkbox

For multi-select, boolean values (agree/disagree), or toggleable items.

```html
<label class="checkbox-label">
  <input type="checkbox" name="terms" id="terms" aria-describedby="terms-hint" />
  <span class="checkbox-custom" aria-hidden="true"></span>
  <span class="checkbox-text">
    I agree to the <a href="/terms">Terms of Service</a>
  </span>
</label>
<p id="terms-hint" class="field-hint">Required to create an account.</p>
```

```css
/* Hide native, style custom */
.checkbox-label input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  flex-shrink: 0;
  transition: background 150ms, border-color 150ms;
}
input[type="checkbox"]:checked + .checkbox-custom {
  background: var(--color-brand-500);
  border-color: var(--color-brand-500);
  /* checkmark via pseudo-element or SVG background */
}
input[type="checkbox"]:focus-visible + .checkbox-custom {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
}
/* Indeterminate state (partial selection in tree/table) */
input[type="checkbox"]:indeterminate + .checkbox-custom {
  background: var(--color-brand-500);
  /* dash icon instead of checkmark */
}
```

**Checkbox vs Toggle:** Use checkbox for forms and lists. Use toggle for immediate on/off settings (no submit needed).

---

## Radio Button

For mutually exclusive options where all choices should be visible simultaneously.

```html
<fieldset>
  <legend class="label">Notification frequency</legend>
  <div class="radio-group">
    <label class="radio-label">
      <input type="radio" name="frequency" value="realtime" />
      <span class="radio-custom" aria-hidden="true"></span>
      Real-time
    </label>
    <label class="radio-label">
      <input type="radio" name="frequency" value="daily" />
      <span class="radio-custom" aria-hidden="true"></span>
      Daily digest
    </label>
    <label class="radio-label">
      <input type="radio" name="frequency" value="weekly" />
      <span class="radio-custom" aria-hidden="true"></span>
      Weekly summary
    </label>
  </div>
</fieldset>
```

**Key rules:**
- Always use `<fieldset>` + `<legend>` for radio groups — groups them semantically
- All options in a group share the same `name`
- If options > 5–7, consider a `<select>` instead
- Arrow keys navigate within a radio group (browser native)

---

## Toggle / Switch

Immediate boolean setting. No form submit required — change takes effect instantly.

```html
<label class="toggle" for="dark-mode">
  <span class="toggle-label">Dark mode</span>
  <input type="checkbox" role="switch" id="dark-mode" aria-checked="false" />
  <span class="toggle-track" aria-hidden="true">
    <span class="toggle-thumb"></span>
  </span>
</label>
```

```css
.toggle-track {
  width: 44px;
  height: 24px;
  background: var(--color-surface-muted);
  border-radius: 12px;
  transition: background 200ms ease;
  position: relative;
}
input[type="checkbox"]:checked ~ .toggle-track {
  background: var(--color-brand-500);
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 200ms ease;
}
input[type="checkbox"]:checked ~ .toggle-track .toggle-thumb {
  transform: translateX(20px);
}
```

**Accessibility:** `role="switch"` + `aria-checked` communicates state to screen readers. Label must describe the SETTING, not the state (say "Dark mode", not "Enable dark mode").

**Toggle vs Checkbox in forms:** If the option requires form submit to take effect, use checkbox. If it applies instantly (like a theme switch), use toggle.

---

## Slider / Range

For selecting a value within a range where approximate values are acceptable.

```html
<div class="slider-field">
  <label for="volume" class="label">Volume</label>
  <div class="slider-wrapper">
    <input
      type="range"
      id="volume"
      name="volume"
      min="0"
      max="100"
      step="1"
      value="70"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="70"
      aria-valuetext="70 percent"
    />
    <output for="volume" class="slider-output">70</output>
  </div>
</div>
```

```css
input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--color-brand-500) 0%,
    var(--color-brand-500) var(--value-percent, 70%),
    var(--color-border) var(--value-percent, 70%),
    var(--color-border) 100%
  );
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-brand-500);
  cursor: grab;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
input[type="range"]:focus-visible::-webkit-slider-thumb {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
}
```

**When to use:** Volume, price range, opacity, zoom level. Not for precise values (use number input instead). Not for selecting non-linear values.

---

## Date Picker

One of the most complex input types. Native `<input type="date">` covers most cases.

```html
<!-- Native — sufficient for most forms -->
<input
  type="date"
  id="birthdate"
  name="birthdate"
  min="1900-01-01"
  max="2025-12-31"
  autocomplete="bday"
/>

<!-- Native datetime-local -->
<input type="datetime-local" id="appointment" name="appointment" />
```

### When to Build a Custom Date Picker
- Need range selection (start/end dates)
- Need to block specific dates/ranges
- Need calendar view with availability indicators
- Native picker UX is insufficient on desktop

### Custom Date Picker Accessibility
```html
<div role="dialog" aria-label="Date picker" aria-modal="true">
  <div role="grid" aria-label="November 2024">
    <div role="row">
      <span role="columnheader" abbr="Sunday">Su</span>
      <!-- ... -->
    </div>
    <div role="row">
      <button role="gridcell" aria-label="November 3, 2024"
              aria-selected="false" tabindex="-1">3</button>
      <!-- ... -->
    </div>
  </div>
</div>
```

Arrow keys navigate the calendar grid. Enter/Space selects. ESC closes.

---

## File Upload

### Simple Upload
```html
<label class="file-upload-label" for="avatar">
  <span class="btn btn-secondary">Choose file</span>
  <span class="file-name" aria-live="polite">No file chosen</span>
  <input type="file" id="avatar" name="avatar" accept="image/*" class="sr-only" />
</label>
```

### Drag-and-Drop Zone
```html
<div
  class="dropzone"
  role="button"
  tabindex="0"
  aria-label="Upload files. Drag and drop or click to browse."
  aria-describedby="dropzone-hint"
>
  <svg aria-hidden="true"><!-- upload icon --></svg>
  <p>Drag files here or <span class="link">browse</span></p>
  <p id="dropzone-hint" class="hint">PNG, JPG, PDF up to 10MB</p>
</div>
```

**States:** Default, drag-over (highlighted border + bg), uploading (progress bar), success (file list), error (rejection reason).

**Always validate client-side and server-side:** file type, file size, virus scan.

---

## Password Field

```html
<div class="field">
  <label for="password">Password</label>
  <div class="input-wrapper">
    <input
      type="password"
      id="password"
      name="password"
      autocomplete="new-password"
      aria-describedby="password-hint"
    />
    <button
      type="button"
      class="input-addon-btn"
      aria-label="Show password"
      aria-pressed="false"
    >
      <svg aria-hidden="true"><!-- eye icon --></svg>
    </button>
  </div>
  <p id="password-hint" class="field-hint">
    At least 8 characters with a number and symbol.
  </p>
</div>
```

**Strength indicator:**
```html
<div class="password-strength" aria-live="polite">
  <div class="strength-bar" data-strength="2"><!-- 4 segments --></div>
  <span class="strength-label">Fair</span>
</div>
```

`aria-live="polite"` announces strength changes without interrupting typing.

---

## Combobox (Searchable Select)

Combines text input with filtered dropdown. More powerful than `<select>` but significantly more complex.

```html
<div class="combobox" role="combobox" aria-expanded="false"
     aria-haspopup="listbox" aria-owns="framework-list">
  <input
    type="text"
    id="framework"
    aria-autocomplete="list"
    aria-controls="framework-list"
    aria-activedescendant=""
    placeholder="Search frameworks..."
  />
  <ul id="framework-list" role="listbox" aria-label="Frameworks" hidden>
    <li role="option" id="opt-react" aria-selected="false">React</li>
    <li role="option" id="opt-vue" aria-selected="false">Vue</li>
    <li role="option" id="opt-angular" aria-selected="false">Angular</li>
  </ul>
</div>
```

**Keyboard behavior:**
- Type to filter options
- Down arrow: open dropdown, move focus to first option
- Up/Down: navigate options
- Enter: select focused option
- Escape: close without selecting
- `aria-activedescendant` tracks focused option ID (focus stays on input)

---

## Validation Display

### Timing: When to Show Errors
| Strategy | Trigger | Best For |
|----------|---------|----------|
| On submit | Form submit | Short forms |
| On blur | Field loses focus | Long/multi-step forms |
| On change | Each keystroke | Password strength, character count |
| Hybrid | Blur first, then live | Most forms (industry standard) |

### Error Message Rules
1. Specific: "Password must be at least 8 characters" not "Invalid password"
2. Actionable: Tell user what to do, not just what went wrong
3. Positive framing when possible: "Enter a valid email" not "Wrong email"
4. Position: Below the field (not top of form only)
5. Icon + color + text: never rely on color alone

```html
<div class="field field--error">
  <label for="email">Email</label>
  <div class="input-wrapper">
    <input type="email" id="email" aria-invalid="true"
           aria-describedby="email-error" />
    <svg class="input-icon-error" aria-hidden="true"><!-- alert icon --></svg>
  </div>
  <p id="email-error" class="error-message" role="alert">
    <svg aria-hidden="true"><!-- alert icon --></svg>
    Enter a valid email address (e.g., name@example.com)
  </p>
</div>
```

---

## Character Counter

```html
<div class="field">
  <label for="bio">Bio</label>
  <textarea id="bio" maxlength="160" aria-describedby="bio-count"></textarea>
  <div class="field-footer">
    <span id="bio-count" aria-live="polite" aria-atomic="true">
      <span class="current">0</span>/160
    </span>
  </div>
</div>
```

**Visual threshold:** neutral → warning (at 80%) → danger (at 95%) → over-limit (red, prevent submit).

`aria-live="polite"` announces count changes. `aria-atomic="true"` reads the whole span, not just changed portion.

---

## Mobile-Optimized Input Attributes

These attributes dramatically improve mobile keyboard UX:

| `inputmode` | Shows keyboard | Use for |
|-------------|---------------|---------|
| `text` | Default QWERTY | General text |
| `email` | @ and . prominent | Email fields |
| `tel` | Number pad + symbols | Phone numbers |
| `numeric` | Number pad | PINs, quantities |
| `decimal` | Number pad + decimal | Prices, measurements |
| `url` | / and . prominent | URL fields |
| `search` | Search/return button | Search boxes |

```html
<!-- Price field -->
<input type="text" inputmode="decimal" pattern="[0-9]*\.?[0-9]+" />

<!-- Phone field -->
<input type="tel" inputmode="tel" autocomplete="tel" />

<!-- PIN field -->
<input type="text" inputmode="numeric" pattern="\d{4,6}" autocomplete="one-time-code" />
```

### Common `autocomplete` Values
```html
autocomplete="name"           <!-- full name -->
autocomplete="given-name"     <!-- first name -->
autocomplete="family-name"    <!-- last name -->
autocomplete="email"
autocomplete="username"
autocomplete="new-password"   <!-- prevents autofill of current password -->
autocomplete="current-password"
autocomplete="one-time-code"  <!-- OTP from SMS -->
autocomplete="tel"
autocomplete="street-address"
autocomplete="postal-code"
autocomplete="cc-number"      <!-- credit card -->
autocomplete="cc-exp"
autocomplete="cc-csc"
```

---

## Form Layout Patterns

### Single Column (recommended for most forms)
Fastest to complete. Users scan top-to-bottom. Exception: logically paired fields (first/last name, city/state/zip).

### Two-Column Exception
```css
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
/* Stack on mobile */
@media (max-width: 480px) {
  .form-row { grid-template-columns: 1fr; }
}
```

Only use two columns for:
- Short paired fields (first / last name)
- Min/max ranges
- City, State, Zip (3-column variation)

### Field Grouping
```html
<fieldset class="form-section">
  <legend>Shipping address</legend>
  <!-- fields -->
</fieldset>
```

`<fieldset>` + `<legend>` creates logical groups. Screen readers announce the legend when entering the group.

---

## Common Form Pitfalls

1. **Placeholder as label** — placeholder disappears on type; fails accessibility
2. **No error recovery path** — user clears form on submit error; preserve valid values
3. **Validating too eagerly** — showing error before user finishes typing (use blur + change hybrid)
4. **Vague error messages** — "Invalid input" helps no one
5. **Disabling submit until form valid** — frustrates users; better to show errors on submit attempt
6. **Not autofocusing first field** on modal/page forms (improves speed)
7. **Missing `autocomplete`** — forces re-typing of known data
8. **Phone/date without format hint** — tell users `(555) 555-5555` vs `555-5555`
9. **Requiring format compliance before showing error** — validate on blur, not submit only
10. **Not preserving form state on navigation** — use browser history or session storage
