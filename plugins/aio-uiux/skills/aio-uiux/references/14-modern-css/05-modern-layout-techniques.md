# Modern Layout Techniques

## Subgrid

Subgrid lets a grid item inherit its parent's track definitions for its own children.
Without subgrid, a nested grid creates independent tracks. With subgrid, the nested
grid participates in the parent's column and/or row tracks.

### The Alignment Problem Subgrid Solves

```css
/* WITHOUT subgrid — card internals don't align across cards */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  display: flex;
  flex-direction: column;
  /* title heights differ → misaligned body content across row */
}
```

```css
/* WITH subgrid — all card internals align on the same row tracks */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 1.5rem;
}

.card {
  display: grid;
  /* Inherit parent column tracks (span 1 column) */
  /* Define own row tracks */
  grid-template-rows: auto 1fr auto; /* image, body, footer */
  /* Use subgrid for rows across all cards in the same row */
  grid-row: span 3; /* each card spans 3 parent rows */
  grid-template-rows: subgrid;
}

.card__image  { /* row 1 */ }
.card__body   { /* row 2 — grows to fill, aligns across cards */ }
.card__footer { /* row 3 — always at the bottom, aligned */ }
```

### Subgrid for Both Axes

```css
.parent-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, auto);
  gap: 1rem 1.5rem;
}

.child {
  grid-column: span 2;
  grid-row: span 2;
  display: grid;
  /* Inherit BOTH axes from parent */
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
}
```

### Named Grid Lines

Named lines make templates readable and decouple layout from order:

```css
.page-layout {
  display: grid;
  grid-template-columns:
    [full-start]
      [content-start sidebar-start] 280px [sidebar-end]
      1rem
      [main-start] 1fr [main-end]
    [content-end full-end];

  grid-template-rows:
    [header-start] 64px [header-end]
    [main-start] 1fr [main-end]
    [footer-start] auto [footer-end];
}

.site-header  { grid-column: full; grid-row: header; }
.site-sidebar { grid-column: sidebar; grid-row: main; }
.site-main    { grid-column: main; grid-row: main; }
.site-footer  { grid-column: full; grid-row: footer; }
```

### Named Grid Areas

```css
.dashboard {
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  grid-template-rows: 64px 1fr auto;
  grid-template-areas:
    "header  header  header"
    "sidebar content aside"
    "footer  footer  footer";
  min-height: 100dvh;
  gap: 0;
}

.dashboard-header  { grid-area: header; }
.dashboard-sidebar { grid-area: sidebar; }
.dashboard-content { grid-area: content; }
.dashboard-aside   { grid-area: aside; }
.dashboard-footer  { grid-area: footer; }

/* Responsive: collapse to single column */
@media (max-width: 768px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: 64px 1fr auto;
    grid-template-areas:
      "header"
      "content"
      "footer";
  }

  .dashboard-sidebar,
  .dashboard-aside { display: none; }
}
```

---

## CSS Nesting (Native)

CSS nesting is now available natively — no preprocessor needed.
The `&` refers to the parent selector, just like Sass:

```css
/* Native CSS nesting */
.card {
  background: var(--bg-base);
  border-radius: 8px;
  padding: 1.5rem;

  /* Nested descendant */
  .card__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-block-end: 0.5rem;
  }

  /* Nested pseudo-class — & is required */
  &:hover {
    box-shadow: var(--shadow-md);
  }

  /* Nested modifier class */
  &.card--featured {
    border: 2px solid var(--border-brand);
  }

  /* Nested at-rule */
  @media (max-width: 640px) {
    padding: 1rem;
  }

  /* Nested pseudo-element */
  &::before {
    content: "";
    display: block;
  }
}

/* Component with states */
.btn {
  background: var(--btn-bg);
  color: var(--btn-text);
  transition: background 150ms;

  &:hover  { background: var(--btn-bg-hover); }
  &:active { background: var(--btn-bg-active); }
  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  &.btn--sm {
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
  }

  &.btn--lg {
    font-size: 1rem;
    padding: 0.75rem 1.5rem;
  }

  /* Nested container query */
  @container (max-width: 320px) {
    width: 100%;
    justify-content: center;
  }
}
```

---

## Logical Properties

Logical properties use writing-mode-relative directions instead of physical ones.
They enable layouts that work correctly in RTL (Arabic, Hebrew) and vertical
writing modes without any extra code.

| Physical          | Logical            | Meaning                    |
|-------------------|--------------------|----------------------------|
| `margin-top`      | `margin-block-start` | start of block axis      |
| `margin-bottom`   | `margin-block-end`   | end of block axis        |
| `margin-left`     | `margin-inline-start`| start of inline axis     |
| `margin-right`    | `margin-inline-end`  | end of inline axis       |
| `padding-left`    | `padding-inline-start`|                         |
| `width`           | `inline-size`        |                          |
| `height`          | `block-size`         |                          |
| `top`             | `inset-block-start`  |                          |
| `left`            | `inset-inline-start` |                          |
| `border-top`      | `border-block-start` |                          |
| `text-align: left`| `text-align: start`  |                          |

```css
/* Physical — breaks in RTL */
.sidebar {
  margin-left: 1rem;
  padding-left: 1.5rem;
  border-left: 3px solid var(--border-brand);
}

/* Logical — correct in both LTR and RTL */
.sidebar {
  margin-inline-start: 1rem;
  padding-inline-start: 1.5rem;
  border-inline-start: 3px solid var(--border-brand);
}

/* Logical shorthands */
.card {
  padding-block: 1rem;    /* top and bottom */
  padding-inline: 1.5rem; /* left and right */
  margin-block: 0 2rem;   /* top=0, bottom=2rem */
  inset-inline: 0;        /* left=0, right=0 */
}

/* Logical dimensions */
.icon {
  inline-size: 24px;  /* width */
  block-size: 24px;   /* height */
}
```

---

## aspect-ratio, object-fit, object-position

```css
/* Maintain aspect ratios without padding-top hacks */
.video-embed {
  aspect-ratio: 16 / 9;
  width: 100%;
}

.square-thumbnail {
  aspect-ratio: 1;
  width: 80px;
}

.portrait-card {
  aspect-ratio: 3 / 4;
}

/* object-fit controls how replaced content fills its box */
.card__image {
  width: 100%;
  height: 200px;
  object-fit: cover;      /* fill, crop to fit */
  object-position: center top; /* anchor crop to top */
}

.logo {
  width: 120px;
  height: 40px;
  object-fit: contain;    /* scale down, no crop */
  object-position: left center;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center;
}

/* aspect-ratio with object-fit — best practice for image cards */
.product-image-wrap {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 8px;
}

.product-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms ease-out;
}

.product-image-wrap:hover img {
  transform: scale(1.05);
}
```

---

## CSS Math Functions

### clamp()

```css
/* clamp(min, preferred, max) */
.fluid-heading {
  /* Minimum 1.5rem, preferred 4vw, maximum 3rem */
  font-size: clamp(1.5rem, 4vw, 3rem);
}

.fluid-container {
  /* Padding between 1rem and 3rem, scales with viewport */
  padding-inline: clamp(1rem, 5vw, 3rem);
}

.fluid-gap {
  gap: clamp(1rem, 2vw + 0.5rem, 2rem);
}
```

### min() and max()

```css
/* min() — use the smaller value */
.container {
  /* Never wider than 1200px, shrinks on small viewports */
  width: min(100% - 2rem, 1200px);
}

.sidebar {
  /* Sidebar is 280px or 30% of container, whichever is smaller */
  width: min(280px, 30%);
}

/* max() — use the larger value */
.content {
  /* Never narrower than 320px */
  width: max(320px, 60%);
}

.tap-target {
  /* Minimum 44px touch target */
  min-height: max(44px, 2.75rem);
}
```

### round(), mod(), rem()

```css
/* round() — snap values to a grid */
:root {
  --base-unit: 8px;
  --spacing: round(nearest, 1.3rem, var(--base-unit));
}

/* mod() — modulo, like % in math */
.striped:nth-child(n) {
  background: hsl(0 0% calc(mod(var(--index), 2) * 5% + 95%));
}
```

---

## Viewport Units: svh, lvh, dvh

The classic `100vh` includes the browser chrome (address bar) on mobile. The three
new variants handle this correctly:

| Unit  | Meaning                                               |
|-------|-------------------------------------------------------|
| `svh` | Small viewport height — browser chrome fully visible  |
| `lvh` | Large viewport height — browser chrome fully hidden   |
| `dvh` | Dynamic viewport height — tracks current chrome state |

```css
/* Classic problem: 100vh is too tall on mobile with address bar */
.hero {
  height: 100vh; /* wrong on mobile — address bar cuts it off */
}

/* Fix: use svh for hero sections you want fully visible on load */
.hero {
  min-height: 100svh; /* safe — fits within visible area */
}

/* Use dvh for full-screen app shells that should fill visible space */
.app-shell {
  height: 100dvh; /* adjusts as chrome shows/hides */
}

/* use lvh for decorative fullscreen overlays (chrome hidden is OK) */
.fullscreen-modal {
  height: 100lvh;
}

/* Equivalent inline/block variants */
.panel {
  width: 100svw;  /* small viewport width */
  height: 100dvh; /* dynamic viewport height */
}
```

---

## Anchor Positioning

Anchor positioning (Chrome 125+) positions elements relative to an arbitrary anchor
element — not just their nearest positioned parent. It replaces complex JavaScript
tooltip/popover positioning:

```css
/* Mark the anchor element */
.tooltip-trigger {
  anchor-name: --my-tooltip-anchor;
}

/* Position the tooltip relative to the anchor */
.tooltip {
  position: absolute;
  position-anchor: --my-tooltip-anchor;

  /* Place above the anchor, centered horizontally */
  bottom: anchor(top);
  left: anchor(center);
  transform: translateX(-50%);

  /* Fallback if it doesn't fit above: place below */
  position-try-fallbacks: flip-block;
}

/* Dropdown menu anchored to a button */
.menu-trigger {
  anchor-name: --menu-anchor;
}

.dropdown-menu {
  position: fixed; /* fixed to avoid clipping */
  position-anchor: --menu-anchor;

  /* Align left edge to anchor's left edge, top to anchor's bottom */
  top: anchor(bottom);
  left: anchor(left);

  /* Auto-flip if menu extends off-screen */
  position-try-fallbacks:
    flip-block,
    flip-inline,
    flip-block flip-inline;
}

/* Polyfill for browsers without anchor support */
@supports not (anchor-name: --x) {
  .dropdown-menu {
    /* JS-controlled fallback positioning */
  }
}
```

---

## Putting It Together: Modern Card Grid

```css
.card-grid-section {
  container: card-grid / inline-size;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: clamp(1rem, 2cqi, 1.5rem);
}

.card {
  display: grid;
  grid-template-rows: auto 1fr auto;

  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  overflow: hidden;

  &:hover {
    box-shadow: var(--shadow-md);
  }
}

.card__image-wrap {
  aspect-ratio: 16 / 9;

  img {
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
    transition: transform 300ms ease-out;
  }
}

.card:hover .card__image-wrap img {
  transform: scale(1.03);
}

.card__body {
  padding-block: clamp(0.75rem, 3cqi, 1.25rem);
  padding-inline: clamp(0.75rem, 3cqi, 1.25rem);
}

.card__title {
  font-size: clamp(0.9rem, 2.5cqi, 1.125rem);
  font-weight: 600;
  line-height: 1.3;
  margin-block-end: 0.5rem;
}

.card__footer {
  padding-block: 0.75rem;
  padding-inline: clamp(0.75rem, 3cqi, 1.25rem);
  border-block-start: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
