# Responsive Layout Patterns

Common layout problems appear repeatedly across web projects. These are the
battle-tested CSS patterns that solve each one cleanly.

---

## 1. Stack Pattern (Column on Mobile, Row on Desktop)

The most fundamental responsive pattern. Content stacks vertically on small
screens and arranges horizontally on larger ones.

```css
/* Flexbox stack → row */
.stack-to-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 640px) {
  .stack-to-row {
    flex-direction: row;
    align-items: center;
  }
}

/* Variant: stack with equal columns on desktop */
.equal-columns {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .equal-columns {
    flex-direction: row;
  }

  .equal-columns > * {
    flex: 1;
  }
}

/* Variant: stack with specific column ratio (2:1) */
.featured-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .featured-layout {
    flex-direction: row;
  }

  .featured-layout__main  { flex: 2; }
  .featured-layout__aside { flex: 1; }
}
```

---

## 2. Sidebar Pattern (Collapse on Mobile)

A persistent sidebar on desktop that either stacks above/below content or
collapses into a drawer on mobile.

```css
/* Intrinsic sidebar — collapses automatically when space is tight */
.sidebar-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.sidebar-layout__content {
  flex: 1 1 min(500px, 100%);
  min-width: 0; /* Prevents flex blowout */
}

.sidebar-layout__sidebar {
  flex: 0 0 clamp(200px, 25%, 300px);
}

/* Explicit breakpoint sidebar */
.page-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .page-layout {
    grid-template-columns: 260px 1fr;
  }
}

/* Sidebar that hides on mobile and shows via JS toggle */
.drawer-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 280px;
  background: var(--color-surface);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 200;
}

.drawer-sidebar[aria-hidden="false"] {
  transform: translateX(0);
}

@media (min-width: 1024px) {
  .drawer-sidebar {
    position: sticky;
    top: 0;
    height: 100dvh;
    transform: none;
    overflow-y: auto;
  }
}
```

---

## 3. Responsive Grid (auto-fill)

A grid where column count adjusts automatically based on available space.
No breakpoints required.

```css
/* Auto-fill grid: as many columns as fit at minimum width */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 1.5rem;
}

/* Tighter grid for smaller items */
.tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

/* Grid with controlled max columns */
/* max-cols trick: prevent more than N columns */
/* At 4 cols max: min-width = (100% - 3 gaps) / 4 */
.capped-grid {
  --min-col-width: 200px;
  --gap: 1.5rem;
  --max-cols: 4;

  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(
      max(
        var(--min-col-width),
        calc((100% - (var(--max-cols) - 1) * var(--gap)) / var(--max-cols))
      ),
      1fr
    )
  );
  gap: var(--gap);
}
```

---

## 4. Table to Cards (Data Table Responsiveness)

Wide data tables overflow on mobile. The card pattern transforms each row into
a self-contained card using data attributes for labels.

```css
/* Wide table — visible on desktop */
.responsive-table {
  width: 100%;
  border-collapse: collapse;
}

.responsive-table th,
.responsive-table td {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.responsive-table th {
  font-weight: 600;
  background: var(--color-surface-alt);
}

/* Mobile: transform to card layout */
@media (max-width: 767px) {
  .responsive-table thead {
    display: none; /* Hide column headers */
  }

  .responsive-table tr {
    display: block;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .responsive-table td {
    display: flex;
    justify-content: space-between;
    padding: 0.375rem 0;
    border-bottom: 1px solid var(--color-border-subtle);
    font-size: 0.875rem;
  }

  .responsive-table td:last-child {
    border-bottom: none;
  }

  /* Show label from data-label attribute */
  .responsive-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--color-text-muted);
    flex-shrink: 0;
    margin-right: 1rem;
  }
}
```

```html
<!-- HTML: each td has data-label for mobile -->
<table class="responsive-table">
  <thead>
    <tr>
      <th>Name</th><th>Status</th><th>Date</th><th>Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Name">John Doe</td>
      <td data-label="Status">Active</td>
      <td data-label="Date">2024-01-15</td>
      <td data-label="Amount">$120.00</td>
    </tr>
  </tbody>
</table>
```

---

## 5. Navigation Collapse (Hamburger Pattern)

Desktop navigation as a horizontal bar collapses to a hamburger menu on mobile.

```css
/* Navigation container */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 60px;
}

/* Desktop: links visible in a row */
.nav__links {
  display: none;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0.25rem;
}

@media (min-width: 768px) {
  .nav__links {
    display: flex;
  }
}

.nav__link {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  text-decoration: none;
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
}

.nav__link:hover {
  background: var(--color-surface-hover);
}

/* Hamburger button — mobile only */
.nav__hamburger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 44px;
  height: 44px;
  padding: 10px;
  background: none;
  border: none;
  cursor: pointer;
}

.nav__hamburger-bar {
  display: block;
  height: 2px;
  background: currentColor;
  border-radius: 1px;
  transition: transform 0.2s, opacity 0.2s;
}

/* Animated X on open */
.nav__hamburger[aria-expanded="true"] .bar-1 {
  transform: translateY(7px) rotate(45deg);
}
.nav__hamburger[aria-expanded="true"] .bar-2 {
  opacity: 0;
}
.nav__hamburger[aria-expanded="true"] .bar-3 {
  transform: translateY(-7px) rotate(-45deg);
}

@media (min-width: 768px) {
  .nav__hamburger {
    display: none;
  }
}

/* Mobile menu panel */
.nav__mobile-panel {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem;
  display: none;
}

.nav__mobile-panel.is-open {
  display: block;
}

@media (min-width: 768px) {
  .nav__mobile-panel {
    display: none !important;
  }
}
```

---

## 6. Dashboard Reflow

Complex dashboards with multiple panels reflow from a multi-column grid to
a single prioritized column on mobile.

```css
/* Desktop: complex grid */
.dashboard {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto;
  grid-template-areas:
    "stats  stats  activity"
    "chart  chart  activity"
    "table  table  table";
}

.dashboard__stats    { grid-area: stats; }
.dashboard__chart    { grid-area: chart; }
.dashboard__activity { grid-area: activity; }
.dashboard__table    { grid-area: table; }

/* Tablet: 2 columns */
@media (max-width: 1023px) {
  .dashboard {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "stats    stats"
      "chart    activity"
      "table    table";
  }
}

/* Mobile: single column, prioritized order */
@media (max-width: 767px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-areas:
      "stats"
      "chart"
      "table"
      "activity";
  }
}
```

---

## 7. Image Gallery (Masonry to Grid)

Gallery layouts that use CSS masonry on large screens and standard grid on mobile.

```css
/* Base: uniform grid on mobile */
.gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.gallery__item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

/* Medium: 3 columns */
@media (min-width: 640px) {
  .gallery {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Large: CSS masonry (experimental — enable in Firefox with flag) */
@media (min-width: 1024px) {
  .gallery {
    grid-template-columns: repeat(4, 1fr);
    /* Native masonry (behind flag in Firefox) */
    grid-template-rows: masonry;
    /* Fallback: auto-rows with varied aspect ratios */
  }

  /* Remove forced aspect ratio to allow natural heights */
  .gallery__item img {
    aspect-ratio: auto;
    height: auto;
  }
}

/* Multi-row span pattern for featured items (masonry fallback) */
@media (min-width: 1024px) {
  .gallery__item--tall {
    grid-row: span 2;
  }

  .gallery__item--wide {
    grid-column: span 2;
  }
}
```

---

## 8. Responsive Typography Scale

Typography that shifts scale at breakpoints, complementing fluid sizing.

```css
/* System: base scale shifts at breakpoints */
:root {
  /* Mobile scale (base) */
  --font-scale-ratio: 1.2; /* Minor third */

  --text-xs:   0.694rem;
  --text-sm:   0.833rem;
  --text-base: 1rem;
  --text-lg:   1.2rem;
  --text-xl:   1.44rem;
  --text-2xl:  1.728rem;
  --text-3xl:  2.074rem;
  --text-4xl:  2.488rem;
}

@media (min-width: 768px) {
  :root {
    /* Tablet scale — slightly larger ratio */
    --font-scale-ratio: 1.25; /* Major third */

    --text-xs:   0.64rem;
    --text-sm:   0.8rem;
    --text-base: 1rem;
    --text-lg:   1.25rem;
    --text-xl:   1.563rem;
    --text-2xl:  1.953rem;
    --text-3xl:  2.441rem;
    --text-4xl:  3.052rem;
  }
}

@media (min-width: 1280px) {
  :root {
    /* Desktop scale — augmented fourth */
    --font-scale-ratio: 1.414;

    --text-xs:   0.5rem;
    --text-sm:   0.707rem;
    --text-base: 1rem;
    --text-lg:   1.414rem;
    --text-xl:   2rem;
    --text-2xl:  2.828rem;
    --text-3xl:  4rem;
    --text-4xl:  5.657rem;
  }
}

/* Apply scale */
body  { font-size: var(--text-base); }
h1    { font-size: var(--text-4xl); line-height: 1.1; font-weight: 800; }
h2    { font-size: var(--text-3xl); line-height: 1.2; font-weight: 700; }
h3    { font-size: var(--text-2xl); line-height: 1.3; font-weight: 600; }
h4    { font-size: var(--text-xl);  line-height: 1.4; font-weight: 600; }
h5    { font-size: var(--text-lg);  line-height: 1.5; font-weight: 600; }
small { font-size: var(--text-sm); }

/* Responsive line length */
p, li, blockquote {
  max-width: 70ch;
}

/* Tighter line-height on large headings */
h1, h2 {
  text-wrap: balance; /* Prevents awkward single-word last lines */
}
```
