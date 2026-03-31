# :has() Selector Patterns

## What :has() Actually Is

`:has()` is a relational pseudo-class. It matches an element **if** any of the
selectors passed as arguments match relative to that element. The common shorthand
"parent selector" is accurate but incomplete — `:has()` can express any relational
condition, not just parent-child.

```css
/* Matches <a> that contains an <img> */
a:has(img) { }

/* Matches <form> that contains an :invalid input */
form:has(:invalid) { }

/* Matches <li> that is immediately followed by another <li> */
li:has(+ li) { }

/* Matches <section> that does NOT have an <h2> */
section:not(:has(h2)) { }
```

Browser support: Chrome 105+, Safari 15.4+, Firefox 121+. Excellent coverage today.

---

## Form Validation Styling

Style entire form sections based on input validity state — no JavaScript needed:

```css
/* Field wrapper reacts to input state */
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.field__input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 150ms, box-shadow 150ms;
}

.field__hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.field__error {
  font-size: 0.75rem;
  color: var(--text-danger);
  display: none;
}

/* Field has a focused input */
.field:has(:focus) .field__label {
  color: var(--text-brand);
}

.field:has(:focus) .field__input {
  border-color: var(--border-brand);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  outline: none;
}

/* Field has an invalid input (only show after user interaction) */
.field:has(:invalid:not(:placeholder-shown)) .field__input {
  border-color: var(--border-danger);
}

.field:has(:invalid:not(:placeholder-shown)) .field__label {
  color: var(--text-danger);
}

.field:has(:invalid:not(:placeholder-shown)) .field__error {
  display: block;
}

.field:has(:invalid:not(:placeholder-shown)) .field__hint {
  display: none;
}

/* Field has a valid, filled input */
.field:has(:valid:not(:placeholder-shown)) .field__input {
  border-color: var(--color-green-500);
}

/* Field has a disabled input */
.field:has(:disabled) {
  opacity: 0.5;
  pointer-events: none;
}

/* Field has a required input */
.field:has(:required) .field__label::after {
  content: " *";
  color: var(--text-danger);
}

/* Form submit button disabled state based on form validity */
form:has(:invalid) .submit-btn {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## State-Based Layouts

Adjust page layout based on the presence or absence of structural elements:

```css
/* Two-column layout only when sidebar is present */
.app-layout {
  display: grid;
  grid-template-columns: 1fr;
}

.app-layout:has(.sidebar) {
  grid-template-columns: 280px 1fr;
}

.app-layout:has(.sidebar.sidebar--collapsed) {
  grid-template-columns: 64px 1fr;
}

/* Hero section with background image gets different text treatment */
.hero:has(.hero__bg-image) .hero__title {
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.hero:has(.hero__bg-image) {
  position: relative;
  isolation: isolate;
}

.hero:has(.hero__bg-image)::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
  z-index: -1;
}

/* Navigation adapts when user menu is expanded */
.nav:has(.user-menu[aria-expanded="true"]) {
  z-index: 100;
}

/* Table row highlights when any cell is focused */
tr:has(:focus) {
  background: var(--bg-brand-subtle);
}

/* Section gets top margin only when preceded by another section */
section + section:has(h2) {
  margin-block-start: 3rem;
}
```

---

## Quantity Queries

Style elements differently based on how many siblings exist — the CSS-only sibling
count technique, dramatically simplified by `:has()`:

```css
/* Style all items when there are exactly 1 */
.grid:has(> .item:only-child) .item {
  max-width: 600px;
  margin-inline: auto;
}

/* Style items when there are 2 */
.grid:has(> .item:nth-child(2)):not(:has(> .item:nth-child(3))) {
  grid-template-columns: repeat(2, 1fr);
}

/* Style items when there are 3 or more */
.grid:has(> .item:nth-child(3)) {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

/* Cleaner pattern: at least N children */
/* At least 4 items → use 4-column grid */
.grid:has(> .item:nth-child(4)) {
  grid-template-columns: repeat(4, 1fr);
}

/* At least 7 items → hide excerpt text to fit more */
.card-grid:has(> .card:nth-child(7)) .card__excerpt {
  display: none;
}

/* Navigation: if more than 5 items, switch to overflow scroll */
.nav:has(> .nav__item:nth-child(6)) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  flex-wrap: nowrap;
}
```

---

## Interactive Hover Effects

Create hover effects that affect adjacent siblings or parent context:

```css
/* Gallery: dim all images except the hovered one */
.gallery:has(.gallery__item:hover) .gallery__item {
  opacity: 0.5;
  filter: grayscale(0.3);
  transition: opacity 200ms, filter 200ms;
}

.gallery:has(.gallery__item:hover) .gallery__item:hover {
  opacity: 1;
  filter: none;
  transform: scale(1.02);
}

/* List: highlight row and show actions on hover */
.table-row:has(:hover) {
  background: var(--bg-subtle);
}

.table-row .row-actions {
  opacity: 0;
  transition: opacity 150ms;
}

.table-row:has(:hover) .row-actions {
  opacity: 1;
}

/* Accordion: style header based on content panel state */
.accordion-item:has(.accordion-panel[aria-hidden="false"]) .accordion-header {
  background: var(--bg-brand-subtle);
  color: var(--text-brand);
  border-bottom-color: var(--border-brand);
}

.accordion-item:has(.accordion-panel[aria-hidden="false"]) .accordion-icon {
  transform: rotate(180deg);
}

/* Card: reveal overlay when image is hovered */
.card:has(.card__image:hover) .card__overlay {
  opacity: 1;
}

/* Tab panel: style tab based on its panel visibility */
.tabs:has(#panel-1:not([hidden])) [aria-controls="panel-1"] {
  border-bottom-color: var(--border-brand);
  color: var(--text-brand);
  font-weight: 600;
}
```

---

## Conditional Styling Without JavaScript

Replace JS-toggled classes with CSS state queries:

```css
/* Checkbox-driven toggle (no JS) */
.toggle-card {
  border: 2px solid var(--border-default);
  border-radius: 8px;
  padding: 1rem;
  transition: border-color 150ms, background 150ms;
}

.toggle-card:has(input[type="checkbox"]:checked) {
  border-color: var(--border-brand);
  background: var(--bg-brand-subtle);
}

.toggle-card:has(input[type="checkbox"]:checked) .toggle-card__icon {
  color: var(--text-brand);
}

/* Plan selector */
.plan-option {
  cursor: pointer;
  border: 2px solid var(--border-default);
  border-radius: 12px;
  padding: 1.5rem;
}

.plan-option:has(input:checked) {
  border-color: var(--border-brand);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.plan-option:has(input:checked) .plan-badge {
  background: var(--bg-brand);
  color: var(--text-inverse);
}

/* File upload: style dropzone when file is selected */
.file-input-wrapper:has(input[type="file"]:not([value=""])) .dropzone {
  border-color: var(--border-brand);
  background: var(--bg-brand-subtle);
}

/* Rating stars: fill stars up to hovered/selected */
.star-rating {
  display: flex;
  flex-direction: row-reverse;
  gap: 4px;
}

.star-rating:has(.star:hover) .star {
  color: var(--border-default);
}

.star-rating:has(.star:hover) .star:hover,
.star-rating:has(.star:hover) .star:hover ~ .star {
  color: var(--color-yellow-400);
}

.star-rating:has(.star input:checked) .star {
  color: var(--border-default);
}

.star-rating .star:has(input:checked),
.star-rating .star:has(input:checked) ~ .star {
  color: var(--color-yellow-400);
}
```

---

## Real-World Patterns

### Modal/Dialog State

```css
/* Body scroll lock when modal is open — no JS class toggle */
body:has(dialog[open]) {
  overflow: hidden;
}

/* Page content blur when dialog is open */
body:has(dialog[open]) .page-content {
  filter: blur(2px);
  pointer-events: none;
}
```

### Empty State Detection

```css
/* Show empty state when list has no items */
.item-list:not(:has(.item)) .empty-state {
  display: flex;
}

.item-list:has(.item) .empty-state {
  display: none;
}

/* Show "clear all" button only when filters are active */
.filter-bar:not(:has(input:checked)) .clear-all {
  display: none;
}
```

### Media Type Adaptation

```css
/* Article: show sidebar only when there's content for it */
.article-layout {
  display: grid;
  grid-template-columns: 1fr;
}

.article-layout:has(.toc-items > li) {
  grid-template-columns: 1fr 240px;
}

/* Code block: show copy button on hover */
.code-block .copy-btn {
  opacity: 0;
  transition: opacity 150ms;
}

.code-block:has(:hover) .copy-btn,
.code-block:has(:focus-within) .copy-btn {
  opacity: 1;
}
```

### Loading States

```css
/* Skeleton vs content */
.data-section:has(.skeleton) {
  pointer-events: none;
}

.data-section:has(.skeleton) .data-section__header {
  opacity: 0.4;
}

/* Button loading state */
.btn:has(.spinner) {
  pointer-events: none;
  opacity: 0.7;
}

.btn:has(.spinner) .btn__text {
  opacity: 0;
}
```

---

## Performance Considerations

`:has()` was historically avoided for performance reasons (requires scanning descendants
before computing style). Modern browsers have heavily optimized this.

Practical rules:
- Avoid `:has()` in tight animation loops (60fps scroll handlers, requestAnimationFrame)
- Do not write overly broad selectors: `*:has(span)` scans everything — scope it
- Prefer class-scoped `:has()`: `.card:has(.badge)` is faster than `:has(.badge)`
- `:has()` in large static content is effectively free — the cost appears on DOM mutations

```css
/* Good: scoped, specific */
.form-field:has(:invalid:not(:placeholder-shown)) { }
.nav:has(.nav__item:hover) { }

/* Avoid: very broad scope */
body:has(div) { }
*:has(p) { }

/* If you need to watch for a class toggle, still prefer a class on the parent */
/* JS: el.classList.toggle('has-error') is faster than :has() for frequent updates */
```

For static state (ARIA attributes, checkbox state, presence of elements), `:has()` has
negligible cost and should be preferred over JavaScript class juggling.
