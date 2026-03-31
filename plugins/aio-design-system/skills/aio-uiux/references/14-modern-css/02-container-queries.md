# Container Queries

## The Problem with Media Queries for Components

Media queries measure the viewport. A card component at 400px wide viewport behaves
differently from the same card placed in a 400px sidebar on a 1400px viewport.
Container queries measure the **containing element** — the component responds to
its actual available space, not the screen size.

This makes components genuinely portable. Drop a card into a sidebar, a main column,
or a full-width hero and it adapts automatically without any changes to the component.

---

## Syntax Overview

Two steps:
1. Declare a **containment context** on the parent
2. Write `@container` rules on the children

```css
/* Step 1: establish containment on the parent */
.card-grid {
  container-type: inline-size;
}

/* Step 2: query the container from inside it */
.card {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
    padding: 1.5rem;
  }
}
```

---

## Container Types

### `inline-size`

The most common type. Enables queries on the **inline axis** (horizontal in LTR).
Does NOT enable block-axis queries. Has no rendering side-effects.

```css
.wrapper {
  container-type: inline-size;
}

@container (min-width: 600px) { /* queries .wrapper's width */ }
@container (max-width: 599px) { /* also valid */ }
```

### `size`

Enables queries on **both axes** (inline and block). Requires the element to have
a defined block size — use cautiously as it can cause layout issues if the element
normally grows with content.

```css
.fixed-panel {
  container-type: size;
  height: 300px; /* block size must be established */
}

@container (min-height: 200px) { /* queries .fixed-panel's height */ }
@container (min-width: 400px) and (min-height: 200px) { }
```

### `normal` (default)

No size containment. Allows style queries (not covered here) but not size queries.

---

## Container Names

When containers are nested, name them to query a specific ancestor:

```css
.layout {
  container-type: inline-size;
  container-name: layout;
}

.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

/* Shorthand */
.layout  { container: layout  / inline-size; }
.sidebar { container: sidebar / inline-size; }

/* Target by name — queries the nearest ancestor named "layout" */
@container layout (min-width: 900px) {
  .nav {
    display: flex;
    flex-direction: row;
  }
}

/* Queries the nearest ancestor named "sidebar" */
@container sidebar (max-width: 200px) {
  .nav-item span {
    display: none; /* hide labels, show icons only */
  }
}
```

Without a name, `@container` queries the **nearest containment ancestor**.

---

## Container Query Units

Container queries introduce a set of units relative to the query container:

| Unit  | Relative to                          |
|-------|--------------------------------------|
| `cqw` | 1% of container's inline size (width)|
| `cqh` | 1% of container's block size (height)|
| `cqi` | 1% of container's inline size        |
| `cqb` | 1% of container's block size         |
| `cqmin`| smaller of `cqi` and `cqb`         |
| `cqmax`| larger of `cqi` and `cqb`          |

`cqi` and `cqw` are equivalent for horizontal writing modes (most common case).

```css
.card-grid {
  container-type: inline-size;
}

.card__title {
  /* Font scales with container width, not viewport */
  font-size: clamp(1rem, 4cqi, 1.5rem);
}

.card__image {
  /* Image always 40% of its container */
  width: 40cqi;
}

.card__hero {
  /* Hero height proportional to container width */
  height: 56.25cqi; /* 16:9 aspect ratio */
}
```

---

## Real-World Pattern: Responsive Card

A card that stacks vertically in narrow contexts and goes horizontal in wide ones:

```css
.card-container {
  container: card / inline-size;
}

.card {
  display: grid;
  grid-template-areas:
    "image"
    "body";
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-default);
}

.card__image {
  aspect-ratio: 16 / 9;
  object-fit: cover;
  width: 100%;
}

.card__body {
  padding: 1rem;
}

.card__title {
  font-size: clamp(0.875rem, 3cqi, 1.25rem);
  font-weight: 600;
  margin-block-end: 0.5rem;
}

.card__excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Wide card: horizontal layout */
@container card (min-width: 480px) {
  .card {
    grid-template-areas: "image body";
    grid-template-columns: 200px 1fr;
  }

  .card__image {
    aspect-ratio: 1;
    height: 100%;
  }

  .card__body {
    padding: 1.5rem;
  }

  .card__excerpt {
    -webkit-line-clamp: 5;
  }
}

/* Very wide card: larger image */
@container card (min-width: 640px) {
  .card {
    grid-template-columns: 280px 1fr;
  }

  .card__body {
    padding: 2rem;
  }
}
```

---

## Real-World Pattern: Sidebar Layout

Navigation that collapses to icon-only when its container is narrow:

```css
.sidebar-container {
  container: sidebar / inline-size;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--text-secondary);
  transition: background 150ms, color 150ms;
}

.nav-item:hover {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.nav-item__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-item__label {
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Narrow sidebar: icons only */
@container sidebar (max-width: 72px) {
  .sidebar-nav {
    align-items: center;
    padding: 8px 4px;
  }

  .nav-item {
    padding: 10px;
    justify-content: center;
  }

  .nav-item__label {
    display: none;
  }
}

/* Medium sidebar: icons + labels */
@container sidebar (min-width: 73px) and (max-width: 180px) {
  .nav-item__label {
    font-size: 0.75rem;
  }
}
```

---

## Real-World Pattern: Adaptive Product Grid

Product grid that shifts from 1 → 2 → 3 → 4 columns based on container:

```css
.product-grid-wrapper {
  container: product-grid / inline-size;
}

.product-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@container product-grid (min-width: 480px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container product-grid (min-width: 720px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}

@container product-grid (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Product card adapts based on how many columns it's in */
.product-card {
  container: product-card / inline-size;
}

.product-card__name {
  font-size: clamp(0.875rem, 3cqi, 1rem);
}

@container product-card (min-width: 200px) {
  .product-card__actions {
    display: flex;
    gap: 8px;
  }
}
```

---

## Real-World Pattern: Article with Sidebar

Same article component works in full-width and sidebar contexts:

```css
/* Full-width usage */
.article-wrapper {
  container: article / inline-size;
}

.article {
  max-width: 65ch;
}

.article__figure {
  float: none;
  margin-block: 1.5rem;
}

.article__figure img {
  width: 100%;
  border-radius: 8px;
}

.article__pullquote {
  border-left: 4px solid var(--border-brand);
  padding-left: 1.5rem;
  font-size: 1.25rem;
  font-style: italic;
}

/* Wide article: float figures */
@container article (min-width: 600px) {
  .article__figure--right {
    float: right;
    width: 40%;
    margin-left: 2rem;
    margin-bottom: 1rem;
    margin-top: 0.25rem;
  }

  .article__figure--left {
    float: left;
    width: 40%;
    margin-right: 2rem;
  }
}

/* Narrow: pullquote becomes a simple callout */
@container article (max-width: 400px) {
  .article__pullquote {
    font-size: 1rem;
    background: var(--bg-brand-subtle);
    padding: 1rem;
    border-left: none;
    border-radius: 6px;
  }
}
```

---

## Replacing Media Queries: Migration Strategy

Don't replace ALL media queries — only use container queries for **component-level**
responsiveness. Keep media queries for **page-level** layout shifts.

```css
/* KEEP: page-level layout — media query is correct here */
@media (min-width: 1024px) {
  .app-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
  }
}

/* REPLACE: component responding to its slot — container query is better */
/* Before: */
@media (min-width: 768px) {
  .widget {
    flex-direction: row;
  }
}

/* After: */
.widget-slot {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .widget {
    flex-direction: row;
  }
}
```

---

## Browser Support and Progressive Enhancement

Container queries are supported in all modern browsers (Chrome 105+, Firefox 110+,
Safari 16+). For older browsers, provide a reasonable default:

```css
/* Default: works everywhere, no container query needed */
.card {
  display: flex;
  flex-direction: column;
}

/* Enhancement: horizontal layout when container is wide enough */
@supports (container-type: inline-size) {
  .card-wrapper {
    container-type: inline-size;
  }

  @container (min-width: 400px) {
    .card {
      flex-direction: row;
    }
  }
}
```

In practice, `@supports (container-type: inline-size)` is rarely needed today —
the browsers that don't support it are negligible for most production apps.
The vertical stack fallback is usually acceptable enough without the guard.

---

## Performance Notes

- `container-type: inline-size` applies **containment** to the element, which
  creates a new stacking context and formatting context. This is generally beneficial
  for performance (browser can skip subtree layout recalculations).
- Avoid `container-type: size` on elements that grow with content — it forces
  the element to establish a fixed block size, breaking natural document flow.
- Container queries do not cause extra layout passes. The browser resolves
  containment during the same layout phase.
- Deeply nested container queries (4+ levels) can be hard to reason about.
  Name your containers when nesting beyond 2 levels.
