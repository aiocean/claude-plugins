# WCAG 2.2 Essential Guide

WCAG 2.2 (Web Content Accessibility Guidelines) is organized around 4 principles: Perceivable, Operable, Understandable, Conformant. This guide focuses on **Level AA** requirements — the legal and practical standard for most products.

---

## 1. Text Alternatives (Principle 1.1)

### What it means
Every non-text content item needs a text alternative that serves the equivalent purpose. This covers images, icons, charts, audio, video, and CAPTCHA.

### AA Requirements
- **1.1.1 Non-text Content (A)** — All images, icons, inputs, and media need text alternatives.

### How to test
```bash
# Automated: axe-core flags missing alt attributes
# Manual: Turn off images in browser, check if content still makes sense
# Screen reader: Tab through page, listen for meaningful descriptions
```

### Common violations
- `<img>` with no `alt` attribute
- `alt="image"` or `alt="photo"` — decorative but not empty
- Icon buttons with no accessible name
- Complex charts described only visually

### Fix examples

```html
<!-- BAD: Missing alt -->
<img src="hero.jpg">

<!-- BAD: Meaningless alt -->
<img src="chart.png" alt="chart">

<!-- GOOD: Informative alt -->
<img src="revenue-chart.png" alt="Revenue grew 42% from Q1 to Q4 2024, reaching $2.4M">

<!-- GOOD: Decorative image — empty alt tells screen readers to skip -->
<img src="divider.svg" alt="" role="presentation">

<!-- GOOD: Icon button with accessible name -->
<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- GOOD: Icon with visible label — no aria-label needed -->
<button>
  <svg aria-hidden="true" focusable="false">...</svg>
  Save
</button>
```

---

## 2. Adaptable Content (Principle 1.3)

### What it means
Content must be presentable in different ways (e.g., simpler layout) without losing information or structure. Structure must be programmatically determinable.

### AA Requirements
- **1.3.1 Info and Relationships (A)** — Structure conveyed visually is also conveyed programmatically
- **1.3.2 Meaningful Sequence (A)** — Reading order makes sense when linearized
- **1.3.3 Sensory Characteristics (A)** — Instructions don't rely solely on shape, color, size, or position
- **1.3.4 Orientation (AA)** — Content doesn't restrict to portrait/landscape
- **1.3.5 Identify Input Purpose (AA)** — Input fields for personal data use autocomplete attributes

### How to test
```bash
# 1.3.1: Inspect DOM — use headings, lists, tables properly
# 1.3.4: Rotate device, check if content reflows
# 1.3.5: Check autocomplete attributes on name/email/phone inputs
```

### Common violations
- Using bold/italic for headings instead of `<h1>`–`<h6>`
- Data tables without `<th>` elements and `scope` attributes
- "Click the green button on the right" — relies on color and position

### Fix examples

```html
<!-- BAD: Visual-only structure -->
<div class="big-bold">Section Title</div>
<div class="list-item">• Item one</div>

<!-- GOOD: Semantic structure -->
<h2>Section Title</h2>
<ul>
  <li>Item one</li>
</ul>

<!-- BAD: Table with no headers -->
<table>
  <tr><td>Name</td><td>Age</td></tr>
  <tr><td>Alice</td><td>30</td></tr>
</table>

<!-- GOOD: Accessible table -->
<table>
  <caption>User List</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Age</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alice</td>
      <td>30</td>
    </tr>
  </tbody>
</table>

<!-- GOOD: Input purpose via autocomplete -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" autocomplete="email">

<label for="name">Full name</label>
<input type="text" id="name" name="name" autocomplete="name">
```

---

## 3. Distinguishable (Principle 1.4)

### What it means
Make it easy for users to see and hear content. Foreground must be separable from background.

### AA Requirements
- **1.4.1 Use of Color (A)** — Color not used as sole conveyor of info
- **1.4.2 Audio Control (A)** — Auto-playing audio can be paused/stopped
- **1.4.3 Contrast (Minimum) (AA)** — 4.5:1 for normal text, 3:1 for large text (18pt/14pt bold)
- **1.4.4 Resize Text (AA)** — Text resizable to 200% without loss of content
- **1.4.5 Images of Text (AA)** — Use actual text instead of images of text
- **1.4.10 Reflow (AA)** — Content reflows at 320px width without horizontal scroll
- **1.4.11 Non-text Contrast (AA)** — UI components and graphics: 3:1 against adjacent colors
- **1.4.12 Text Spacing (AA)** — No loss of content when line-height/spacing overridden
- **1.4.13 Content on Hover/Focus (AA)** — Hoverable, dismissible, persistent tooltip content

### How to test
```bash
# Contrast: Use browser DevTools Color Picker, or WebAIM Contrast Checker
# Reflow: Set viewport to 320px, check for horizontal scrollbar
# Text spacing: Apply bookmarklet that overrides spacing to WCAG test values
```

### Common violations
- Red/green status indicators with no icon or text difference
- Input borders at 1.5:1 against white background
- Fixed-size containers that clip text at large font sizes
- Tooltips that vanish when moving mouse to read them

### Fix examples

```css
/* BAD: Error shown only by color */
.input-error { border-color: red; }

/* GOOD: Error shown by color + icon + text */
.input-error {
  border-color: #d32f2f;
  border-width: 2px;
}
.input-error::before {
  content: "⚠ ";  /* icon */
}

/* GOOD: Contrast-safe color palette */
:root {
  --text-primary: #1a1a1a;      /* on white: 16.75:1 */
  --text-secondary: #595959;    /* on white: 7.0:1 */
  --text-disabled: #767676;     /* on white: 4.54:1 — minimum AA */
  --link-color: #0056b3;        /* on white: 7.0:1 */
  --error-color: #d32f2f;       /* on white: 5.9:1 */
}

/* GOOD: Reflow — no fixed widths that cause overflow */
.container {
  max-width: 100%;
  overflow-wrap: break-word;
}

/* GOOD: Text spacing override survival */
* {
  line-height: normal; /* let user override */
  letter-spacing: normal;
}
/* Don't use: line-height: 1 !important — blocks user stylesheets */

/* GOOD: Persistent hoverable tooltip (1.4.13) */
.tooltip {
  /* Tooltip stays open while hovering tooltip itself */
  pointer-events: auto;
}
[data-tooltip]:hover .tooltip,
[data-tooltip]:focus-within .tooltip {
  display: block;
}
```

---

## 4. Keyboard (Principle 2.1)

### What it means
All functionality must be operable via keyboard. Users must not get trapped.

### AA Requirements
- **2.1.1 Keyboard (A)** — All functionality available via keyboard
- **2.1.2 No Keyboard Trap (A)** — Focus can always move away from a component
- **2.1.4 Character Key Shortcuts (A)** — Single-character shortcuts can be remapped or disabled

### How to test
```bash
# Tab through entire page using only keyboard
# Verify every interactive element is reachable and operable
# Check focus is never stuck (modal traps intentionally — must have escape route)
```

### Common violations
- Custom dropdowns/menus only operable by mouse
- Focus enters a widget but Tab cycles through the whole page instead of using arrow keys
- iframes that absorb focus with no way out

### Fix examples

```html
<!-- BAD: div click handler — keyboard users excluded -->
<div onclick="openMenu()" class="menu-button">Menu</div>

<!-- GOOD: Button is keyboard-operable by default -->
<button type="button" onclick="openMenu()">Menu</button>

<!-- GOOD: Roving tabindex for composite widget (only one tab stop) -->
<ul role="listbox" aria-label="Options">
  <li role="option" tabindex="0" aria-selected="true">Option 1</li>
  <li role="option" tabindex="-1" aria-selected="false">Option 2</li>
  <li role="option" tabindex="-1" aria-selected="false">Option 3</li>
</ul>
```

```javascript
// GOOD: Arrow key navigation within listbox
listbox.addEventListener('keydown', (e) => {
  const options = [...listbox.querySelectorAll('[role="option"]')];
  const current = options.findIndex(o => o.tabIndex === 0);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = (current + 1) % options.length;
    options[current].tabIndex = -1;
    options[next].tabIndex = 0;
    options[next].focus();
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = (current - 1 + options.length) % options.length;
    options[current].tabIndex = -1;
    options[prev].tabIndex = 0;
    options[prev].focus();
  }
});
```

---

## 5. Enough Time (Principle 2.2)

### What it means
Users need enough time to read and use content. Timeouts must be adjustable or warn users.

### AA Requirements
- **2.2.1 Timing Adjustable (A)** — Sessions with time limits allow user to turn off/extend (except real-time limits)
- **2.2.2 Pause, Stop, Hide (A)** — Moving/blinking content can be paused

### Fix examples

```html
<!-- GOOD: Session timeout warning -->
<div role="alertdialog" aria-labelledby="timeout-title" aria-describedby="timeout-desc">
  <h2 id="timeout-title">Session Expiring</h2>
  <p id="timeout-desc">Your session will expire in 2 minutes. Do you need more time?</p>
  <button onclick="extendSession()">Yes, extend my session</button>
  <button onclick="logout()">Log out now</button>
</div>

<!-- GOOD: Pausing auto-rotating carousel -->
<div class="carousel" aria-label="Featured products">
  <button aria-label="Pause carousel rotation" aria-pressed="false" onclick="togglePause()">
    ⏸
  </button>
  <!-- slides -->
</div>
```

---

## 6. Navigable (Principle 2.4)

### What it means
Help users navigate, find content, and know where they are.

### AA Requirements
- **2.4.1 Bypass Blocks (A)** — Skip navigation links available
- **2.4.2 Page Titled (A)** — Pages have descriptive titles
- **2.4.3 Focus Order (A)** — Focus follows logical reading order
- **2.4.4 Link Purpose (A)** — Link text describes destination (in context or alone)
- **2.4.5 Multiple Ways (AA)** — Multiple paths to find content (search, sitemap, nav)
- **2.4.6 Headings and Labels (AA)** — Headings and labels are descriptive
- **2.4.7 Focus Visible (AA)** — Keyboard focus is always visible
- **2.4.11 Focus Not Obscured (Minimum) (AA)** — NEW in 2.2: Focused element not fully hidden by sticky headers

### Common violations
- Links all labeled "Click here" or "Read more"
- `outline: none` on focused elements without replacement style
- Sticky header covers focused element completely (2.4.11)

### Fix examples

```html
<!-- GOOD: Skip navigation -->
<a href="#main-content" class="skip-link">Skip to main content</a>
<nav>...</nav>
<main id="main-content">...</main>

<!-- CSS for skip link: visible on focus only -->
<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
  text-decoration: none;
}
.skip-link:focus {
  top: 0;
}
</style>

<!-- BAD: Ambiguous links -->
<a href="/report.pdf">Click here</a>
<a href="/report-2.pdf">Click here</a>

<!-- GOOD: Descriptive links -->
<a href="/report.pdf">2024 Annual Report (PDF)</a>
<a href="/report-2.pdf">2023 Annual Report (PDF)</a>

<!-- GOOD: Descriptive page title -->
<title>Checkout — Step 2 of 3: Payment | Acme Store</title>
```

```css
/* GOOD: Focus style that works everywhere */
:focus-visible {
  outline: 3px solid #0056b3;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Prevent sticky header from fully obscuring focus (2.4.11) */
html {
  scroll-padding-top: 80px; /* height of sticky header */
}
```

---

## 7. Input Modalities (Principle 2.5)

### What it means
Users can operate functionality through various inputs beyond keyboard.

### AA Requirements
- **2.5.1 Pointer Gestures (A)** — Multi-point/path-based gestures have single-pointer alternative
- **2.5.2 Pointer Cancellation (A)** — Accidental clicks can be cancelled (use mouseup, not mousedown)
- **2.5.3 Label in Name (A)** — Accessible name contains visible label text
- **2.5.4 Motion Actuation (A)** — Device motion functions have UI alternatives
- **2.5.7 Dragging Movements (AA)** — NEW in 2.2: Drag operations have single-pointer alternative
- **2.5.8 Target Size (Minimum) (AA)** — NEW in 2.2: Touch targets at least 24×24 CSS pixels

### Fix examples

```html
<!-- BAD: Drag-only reordering (2.5.7) -->
<ul class="drag-list">...</ul>

<!-- GOOD: Drag + button alternative -->
<ul>
  <li>
    Item 1
    <button aria-label="Move Item 1 up">↑</button>
    <button aria-label="Move Item 1 down">↓</button>
  </li>
</ul>

<!-- GOOD: Label in Name — accessible name includes visible text -->
<!-- BAD: aria-label replaces visible text -->
<button aria-label="Submit form">Send</button>
<!-- Screen reader says "Submit form" but visible says "Send" — mismatch confuses speech users -->

<!-- GOOD: aria-label contains visible text -->
<button aria-label="Send message">Send</button>
```

```css
/* GOOD: Touch target minimum size */
button, a, [role="button"] {
  min-height: 44px;   /* iOS HIG recommendation, exceeds WCAG 2.5.8 */
  min-width: 44px;
  padding: 10px;
}

/* WCAG 2.5.8 minimum: 24×24px */
/* Apple/Google recommend: 44×44px */
```

---

## 8. Readable (Principle 3.1)

### What it means
Make text readable and understandable.

### AA Requirements
- **3.1.1 Language of Page (A)** — `lang` attribute on `<html>`
- **3.1.2 Language of Parts (AA)** — Language changes within page marked with `lang`

### Fix examples

```html
<!-- GOOD: Page language -->
<html lang="en">

<!-- GOOD: Language change -->
<p>The French phrase <span lang="fr">carte blanche</span> means unconditional authority.</p>
```

---

## 9. Predictable (Principle 3.2)

### What it means
Web pages appear and operate in predictable ways.

### AA Requirements
- **3.2.1 On Focus (A)** — Focus alone doesn't trigger context change
- **3.2.2 On Input (A)** — Changing setting doesn't automatically change context (unless warned)
- **3.2.3 Consistent Navigation (AA)** — Navigation repeated across pages is in same relative order
- **3.2.4 Consistent Identification (AA)** — Same functionality identified consistently

### Common violations
- Select/dropdown that navigates on change without submit button
- Clicking a checkbox immediately submits a form

### Fix examples

```html
<!-- BAD: Auto-submit on change -->
<select onchange="this.form.submit()">
  <option>English</option>
  <option>French</option>
</select>

<!-- GOOD: Explicit submit -->
<form>
  <label for="lang">Language</label>
  <select id="lang" name="lang">
    <option>English</option>
    <option>French</option>
  </select>
  <button type="submit">Apply</button>
</form>
```

---

## 10. Input Assistance (Principle 3.3)

### What it means
Help users avoid and correct mistakes.

### AA Requirements
- **3.3.1 Error Identification (A)** — Errors described in text
- **3.3.2 Labels or Instructions (A)** — Instructions provided before/with inputs
- **3.3.3 Error Suggestion (AA)** — Suggest corrections when known
- **3.3.4 Error Prevention (AA)** — For legal/financial submissions: reversible, checkable, or confirmable

### Fix examples

```html
<!-- GOOD: Error identification and suggestion -->
<div>
  <label for="email">Email address</label>
  <input
    type="email"
    id="email"
    name="email"
    aria-describedby="email-error"
    aria-invalid="true"
    value="user@"
  >
  <p id="email-error" role="alert">
    Error: Email address is incomplete. Example format: name@example.com
  </p>
</div>

<!-- GOOD: Error prevention — review before submit -->
<div role="region" aria-label="Order summary">
  <h2>Review your order</h2>
  <dl>
    <dt>Product</dt><dd>Widget Pro</dd>
    <dt>Total</dt><dd>$99.00</dd>
  </dl>
  <button type="submit">Confirm and pay</button>
  <button type="button" onclick="history.back()">Go back and edit</button>
</div>
```

---

## 11. Compatible (Principle 4.1)

### What it means
Maximize compatibility with current and future user agents, including assistive technologies.

### AA Requirements
- **4.1.1 Parsing (A)** — Valid HTML (no duplicate IDs, properly nested elements)
- **4.1.2 Name, Role, Value (A)** — All UI components have accessible name, role, and state
- **4.1.3 Status Messages (AA)** — Status messages programmatically determinable without focus

### Fix examples

```html
<!-- GOOD: Status message without focus shift -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="status">
  <!-- JS injects: "Your changes have been saved." -->
</div>

<!-- GOOD: Shopping cart update -->
<div role="status" aria-live="polite">
  <!-- Dynamically updated: "3 items in cart" -->
</div>

<!-- BAD: Duplicate IDs break AT parsing -->
<label for="email">Email</label>
<input id="email">
<label for="email">Phone</label>  <!-- duplicate id="email" -->
<input id="email">

<!-- GOOD: Unique IDs -->
<label for="user-email">Email</label>
<input id="user-email">
<label for="user-phone">Phone</label>
<input id="user-phone">
```

---

## Quick Reference: WCAG 2.2 AA Checklist

| # | Criterion | Level | New in 2.2 |
|---|-----------|-------|------------|
| 1.1.1 | Non-text Content | A | |
| 1.3.1 | Info and Relationships | A | |
| 1.3.4 | Orientation | AA | |
| 1.3.5 | Identify Input Purpose | AA | |
| 1.4.3 | Contrast (Minimum) | AA | |
| 1.4.4 | Resize Text | AA | |
| 1.4.10 | Reflow | AA | |
| 1.4.11 | Non-text Contrast | AA | |
| 1.4.12 | Text Spacing | AA | |
| 1.4.13 | Content on Hover/Focus | AA | |
| 2.1.1 | Keyboard | A | |
| 2.1.2 | No Keyboard Trap | A | |
| 2.4.3 | Focus Order | A | |
| 2.4.7 | Focus Visible | AA | |
| 2.4.11 | Focus Not Obscured (Min) | AA | Yes |
| 2.5.7 | Dragging Movements | AA | Yes |
| 2.5.8 | Target Size (Minimum) | AA | Yes |
| 3.2.1 | On Focus | A | |
| 3.3.1 | Error Identification | A | |
| 3.3.2 | Labels or Instructions | A | |
| 4.1.2 | Name, Role, Value | A | |
| 4.1.3 | Status Messages | AA | |
