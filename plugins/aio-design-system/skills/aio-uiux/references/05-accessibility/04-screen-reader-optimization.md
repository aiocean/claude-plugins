# Screen Reader Optimization

Screen readers convert visual UI into audio (speech) or tactile output (braille). Understanding how they parse HTML lets you build interfaces that work for the ~7% of users who rely on them — and improves SEO and machine-readability as a side effect.

---

## How Screen Readers Parse HTML

Screen readers build an **accessibility tree** — a parallel structure to the DOM that contains only perceivable elements with their roles, names, states, and values. Elements with `display:none`, `visibility:hidden`, `aria-hidden="true"`, or `hidden` attribute are excluded.

```
DOM Tree                    Accessibility Tree
────────────────────        ────────────────────────────────
<body>                      document
  <header>                    banner (landmark)
    <nav>                       navigation "Main"
      <a href="/">                link "Home"
      <a href="/about">           link "About"
  <main>                      main (landmark)
    <h1>Products</h1>           heading level 1 "Products"
    <button disabled>           button "Add to cart" (dimmed)
    <img alt="Red shoes">       image "Red shoes"
  <footer>                    contentinfo (landmark)
```

### Browsing modes

Screen readers have two modes:
- **Browse/Read mode**: Arrow keys read content line by line. Links, headings, form fields become navigable by type.
- **Forms/Application mode**: Keypresses go directly to the widget. Triggered when focus enters a form field or `role="application"`.

Most screen reader confusion comes from unexpected mode switches or content that behaves differently in each mode.

---

## Semantic HTML Elements and Their Roles

Native HTML gives you roles for free. Always prefer native elements over ARIA role overrides.

```html
<!-- Landmark roles — navigation pane shortcuts -->
<header>       <!-- role="banner" (when top-level) -->
<nav>          <!-- role="navigation" -->
<main>         <!-- role="main" -->
<aside>        <!-- role="complementary" -->
<footer>       <!-- role="contentinfo" (when top-level) -->
<section>      <!-- role="region" (needs accessible name to be landmark) -->
<form>         <!-- role="form" (needs accessible name to be landmark) -->
<search>       <!-- role="search" (HTML 5.2+) -->

<!-- Interactive roles -->
<a href="">    <!-- role="link" -->
<button>       <!-- role="button" -->
<input type="checkbox">   <!-- role="checkbox" -->
<input type="radio">      <!-- role="radio" -->
<select>       <!-- role="listbox" / "combobox" -->
<input type="range">      <!-- role="slider" -->

<!-- Structure roles -->
<h1>–<h6>     <!-- role="heading" level 1–6 -->
<ul>, <ol>    <!-- role="list" -->
<li>          <!-- role="listitem" -->
<table>       <!-- role="table" -->
<tr>          <!-- role="row" -->
<th>          <!-- role="columnheader" or "rowheader" -->
<td>          <!-- role="cell" -->
<dl>          <!-- role="definition list" (AT varies) -->
```

### Sections need names to be useful landmarks

```html
<!-- NOT a landmark — no accessible name -->
<section>
  <h2>Featured products</h2>
</section>

<!-- IS a landmark — screen reader can jump to it -->
<section aria-labelledby="featured-heading">
  <h2 id="featured-heading">Featured products</h2>
</section>

<!-- Multiple navs need distinction -->
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Breadcrumb">...</nav>
<nav aria-label="Footer links">...</nav>
```

---

## aria-label vs aria-labelledby vs aria-describedby

This is the most misused part of ARIA. Each serves a distinct purpose.

### Decision guide

```
Q: Is there visible text already?
  YES → use aria-labelledby pointing to that text
  NO  → use aria-label for a short name

Q: Is this extra explanatory info (not the name)?
  YES → use aria-describedby
  NO  → use aria-label or aria-labelledby
```

### aria-label

Provides an accessible name directly. Overrides any text content for AT.

```html
<!-- Icon-only button: no visible text -->
<button type="button" aria-label="Close">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- Input with no adjacent label (avoid if possible) -->
<input type="search" aria-label="Search products" placeholder="Search...">

<!-- When there are multiple similar controls -->
<button aria-label="Delete item: Blue Widget">Delete</button>
<button aria-label="Delete item: Red Gadget">Delete</button>

<!-- WRONG: aria-label on non-interactive element (meaningless) -->
<p aria-label="Intro text">Welcome to our site.</p>

<!-- WRONG: aria-label that doesn't contain visible text (2.5.3 violation) -->
<button aria-label="Submit the form">Send</button>
<!-- Screen reader says "Submit the form", button says "Send" — speech mismatch -->
<!-- FIX: -->
<button aria-label="Send message">Send</button>
```

### aria-labelledby

References another element's text as the accessible name. Can reference multiple elements.

```html
<!-- Reference a heading -->
<section aria-labelledby="billing-heading">
  <h2 id="billing-heading">Billing address</h2>
  <form>...</form>
</section>

<!-- Combine multiple text elements into one name -->
<button aria-labelledby="action-verb item-name">
  <span id="action-verb">Delete</span>
</button>
<!-- elsewhere: -->
<h3 id="item-name">Blue Widget Pro</h3>
<!-- Screen reader announces: "Delete Blue Widget Pro, button" -->

<!-- Dialog labeled by its title -->
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm deletion</h2>
  ...
</div>

<!-- Fieldset alternative (when fieldset/legend not possible) -->
<div role="group" aria-labelledby="address-group-label">
  <p id="address-group-label">Shipping address</p>
  <input type="text" aria-label="Street">
  <input type="text" aria-label="City">
</div>
```

### aria-describedby

Provides supplementary description — announced after the name and role, often with a pause.

```html
<!-- Password requirements -->
<label for="password">Password</label>
<input
  type="password"
  id="password"
  aria-describedby="pw-requirements"
>
<p id="pw-requirements">
  Must be at least 8 characters and include a number.
</p>

<!-- Error message (in addition to aria-invalid) -->
<input
  type="email"
  id="email"
  aria-invalid="true"
  aria-describedby="email-error"
>
<p id="email-error" role="alert">
  Enter a valid email address, like name@example.com
</p>

<!-- Tooltip description -->
<button
  aria-describedby="save-tooltip"
>
  Save
</button>
<div role="tooltip" id="save-tooltip">
  Saves all changes and returns to dashboard
</div>

<!-- Multiple descriptions -->
<input
  type="text"
  id="username"
  aria-describedby="username-hint username-error"
>
<p id="username-hint">3–20 characters, letters and numbers only</p>
<p id="username-error" hidden>Username is already taken</p>
```

### Precedence rules

When multiple naming mechanisms conflict:
1. `aria-labelledby` (highest priority)
2. `aria-label`
3. Native HTML label (`<label>`, `<legend>`, `<caption>`, `alt`, `title`)
4. Element text content (lowest)

---

## Visually Hidden Text (sr-only)

The sr-only pattern hides text visually while keeping it in the accessibility tree. Use for supplementary context that sighted users get from layout but AT users cannot infer.

```css
/* The canonical sr-only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* sr-only that can be revealed on focus (for skip links) */
.sr-only-focusable:not(:focus):not(:focus-within) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

```html
<!-- Extra context for "Edit" links in a table -->
<table>
  <tr>
    <td>Alice</td>
    <td>
      <a href="/users/1/edit">
        Edit
        <span class="sr-only">Alice's profile</span>
      </a>
    </td>
  </tr>
</table>
<!-- Screen reader: "Edit Alice's profile, link" -->

<!-- Icon button context -->
<button>
  <svg aria-hidden="true"><!-- trash icon --></svg>
  <span class="sr-only">Delete Blue Widget from cart</span>
</button>

<!-- "Loading..." that appears visually as a spinner -->
<div aria-live="polite">
  <svg class="spinner" aria-hidden="true">...</svg>
  <span class="sr-only">Loading results, please wait.</span>
</div>
```

---

## Live Regions

Live regions tell screen readers to announce content changes without the user navigating to them. Use sparingly — too many announcements become noise.

### aria-live values

```html
<!-- polite: waits for user to finish current action before announcing -->
<div aria-live="polite" id="cart-status">
  <!-- "3 items in cart" — announced after current speech finishes -->
</div>

<!-- assertive: interrupts immediately — only for urgent errors -->
<div aria-live="assertive" id="error-banner">
  <!-- "Connection lost. Please check your internet." -->
</div>

<!-- off: no announcements (default) -->
<div aria-live="off">...</div>
```

### aria-atomic

Controls whether the whole region or only changed part is announced.

```html
<!-- atomic="true": announce entire region content as a unit -->
<div aria-live="polite" aria-atomic="true" id="timer">
  <span>Time remaining: </span>
  <span id="countdown">4:59</span>
</div>
<!-- When countdown changes: "Time remaining: 4:58" (full context) -->
<!-- Without atomic: only "4:58" (confusing) -->

<!-- atomic="false" (default): only changed nodes announced -->
<ul aria-live="polite" aria-atomic="false" id="notification-list">
  <!-- New <li> appended: only that <li>'s text announced -->
</ul>
```

### aria-relevant

Controls which DOM changes trigger announcements (default: `additions text`).

```html
<!-- Announce both additions and removals -->
<div aria-live="polite" aria-relevant="additions removals" id="chat">
  <!-- "Alice left the room" when element removed -->
  <!-- "Bob: Hello!" when element added -->
</div>

<!-- All changes including text modifications -->
<div aria-live="polite" aria-relevant="all">...</div>
```

### Announcing dynamic changes — patterns

```javascript
// Pattern 1: Simple status message
function showStatus(message, urgency = 'polite') {
  const region = document.getElementById('live-region');
  region.setAttribute('aria-live', urgency);
  // Double rAF ensures AT picks up the change
  requestAnimationFrame(() => requestAnimationFrame(() => {
    region.textContent = message;
  }));
}

// Pattern 2: Clear then set (for repeated messages)
function announce(message) {
  const region = document.getElementById('announcer');
  region.textContent = '';
  setTimeout(() => { region.textContent = message; }, 100);
}

// Pattern 3: Pre-built live regions for common scenarios
// (Add to your layout HTML — hidden from visual users)
```

```html
<!-- Live regions in layout — always present, updated by JS -->
<div class="sr-only">
  <div id="polite-announcer" aria-live="polite" aria-atomic="true"></div>
  <div id="assertive-announcer" aria-live="assertive" aria-atomic="true"></div>
</div>
```

---

## Image Alt Text Guidelines

The alt attribute is the single most impactful AT improvement. Every image needs a decision.

### Decision tree

```
Is the image purely decorative?
  YES → alt="" (empty alt, not missing alt)

Does the image convey information?
  Is it a chart/graph/diagram?
    YES → describe data in alt + provide full description in <figcaption> or <details>
  Is it a photo?
    YES → describe what's relevant to context, not every detail
  Is it an icon with adjacent text?
    YES → alt="" (text already provides the label)
  Is it a logo?
    YES → alt="[CompanyName] logo"
  Is it a button/link?
    YES → alt describes the destination/action, not the image appearance

Does the image contain text?
  YES → alt must include the exact text in the image
```

```html
<!-- Decorative image -->
<img src="wavy-divider.svg" alt="">

<!-- Informative photo -->
<img
  src="office.jpg"
  alt="Open-plan office with standing desks, natural light, and a coffee station"
>

<!-- Chart with summary alt + full description -->
<figure>
  <img
    src="revenue-q4.png"
    alt="Bar chart: Q4 revenue by region. North America led at $2.1M."
    aria-describedby="chart-full-desc"
  >
  <figcaption id="chart-full-desc">
    Q4 2024 revenue by region: North America $2.1M (42%), Europe $1.4M (28%),
    Asia-Pacific $0.9M (18%), Other $0.6M (12%). Total: $5.0M.
  </figcaption>
</figure>

<!-- Icon with adjacent visible text — empty alt -->
<button>
  <img src="save-icon.svg" alt=""> Save
</button>

<!-- Image as only content of link -->
<a href="/home">
  <img src="logo.svg" alt="Acme Inc. — Go to homepage">
</a>

<!-- Image containing text -->
<img src="promo-banner.png" alt="50% off all orders this weekend. Use code SUMMER50.">

<!-- Complex diagram — link to full description -->
<figure>
  <img src="architecture-diagram.svg" alt="System architecture diagram">
  <figcaption>
    <a href="/docs/architecture">Full description of the architecture diagram</a>
  </figcaption>
</figure>
```

---

## SVG Accessibility

SVGs are increasingly used for icons, charts, and illustrations. They need different treatment than `<img>`.

```html
<!-- Decorative SVG icon — hide from AT entirely -->
<svg aria-hidden="true" focusable="false" width="20" height="20">
  <use href="#icon-check"/>
</svg>

<!-- Standalone informative SVG -->
<svg
  role="img"
  aria-labelledby="svg-title svg-desc"
  viewBox="0 0 100 100"
>
  <title id="svg-title">Monthly revenue</title>
  <desc id="svg-desc">
    Line chart showing revenue growth from $1.2M in January to $2.4M in December 2024.
  </desc>
  <!-- chart paths -->
</svg>

<!-- SVG as img (external file) -->
<img src="diagram.svg" alt="Database schema showing Users, Posts, and Comments tables">

<!-- Inline SVG icon button (most common pattern) -->
<button type="button" aria-label="Add to favorites">
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5..."/>
  </svg>
</button>

<!-- SVG with text inside (logos, banners) -->
<svg role="img" aria-label="Acme Inc." viewBox="0 0 200 50">
  <!-- visual text in SVG — aria-label provides the AT text -->
  <text>Acme Inc.</text>
</svg>
```

---

## Screen Reader Quirks to Know

### `<div>` and `<span>` are invisible to AT

```html
<!-- This has NO role in the accessibility tree -->
<div class="error">Please fix the errors above</div>

<!-- Add role to make it visible -->
<div role="alert" class="error">Please fix the errors above</div>
```

### Hiding content correctly

```html
<!-- Hidden from everyone (visual + AT) -->
<div hidden>Not visible to anyone</div>
<div style="display: none">Not visible to anyone</div>
<div style="visibility: hidden">Not visible to anyone</div>

<!-- Hidden from AT only (visual users see it) -->
<div aria-hidden="true">Decorative or redundant content</div>

<!-- Hidden from visual users only (AT reads it) -->
<span class="sr-only">Additional context for screen readers</span>
```

### Lists with removed bullets — context issue

```css
/* Some screen readers (Safari + VoiceOver) remove list semantics when list-style: none */
ul {
  list-style: none; /* loses role="list" in VoiceOver */
}
```

```html
<!-- Fix: explicit role -->
<ul role="list" style="list-style: none">
  <li>Item</li>
</ul>
```

### Interactive elements inside interactive elements

```html
<!-- BAD: button inside button — invalid HTML, breaks AT -->
<button>
  <button>Inner</button>
  Outer
</button>

<!-- BAD: link inside button -->
<button><a href="/page">Go</a></button>

<!-- GOOD: flat structure -->
<div class="card">
  <a href="/product">Product name</a>
  <button>Add to cart</button>
</div>
```

### Focus order vs reading order

Screen readers in browse mode follow DOM order, not visual order. Ensure DOM order is logical even when CSS repositions elements visually.

```html
<!-- BAD: CSS grid places sidebar before main visually but main is first in DOM -->
<main>Main content...</main>
<aside>Sidebar...</aside>
<!-- CSS: aside { order: -1; } -->
<!-- Tab order: main → sidebar (matches DOM) -->
<!-- Visual order: sidebar → main (matches CSS) -->
<!-- MISMATCH confuses keyboard and screen reader users -->

<!-- GOOD: DOM order matches intended reading order -->
<aside>Sidebar...</aside>
<main>Main content...</main>
```
