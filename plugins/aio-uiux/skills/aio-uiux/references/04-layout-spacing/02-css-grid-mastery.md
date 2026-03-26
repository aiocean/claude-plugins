# CSS Grid Mastery: Deep Patterns and Layouts

## Grid Fundamentals Recap

CSS Grid is a two-dimensional layout system. Use it when you need to control both rows and columns simultaneously.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 16px;
}
```

This reference covers patterns beyond the basics.

---

## Grid Template: Named Areas

Named grid areas let you define layout semantically. The grid-template-areas string is a visual map of your layout.

```css
/* Holy Grail Layout */
.page {
  display: grid;
  grid-template-areas:
    "header  header  header"
    "sidebar main    aside"
    "footer  footer  footer";
  grid-template-columns: 240px 1fr 200px;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  gap: 0;
}

.page-header  { grid-area: header;  }
.page-sidebar { grid-area: sidebar; }
.page-main    { grid-area: main;    }
.page-aside   { grid-area: aside;   }
.page-footer  { grid-area: footer;  }
```

### Responsive Named Areas

Redefine grid-template-areas at breakpoints to completely restructure layout:

```css
.app {
  display: grid;
  grid-template-areas:
    "nav"
    "main"
    "sidebar"
    "footer";
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .app {
    grid-template-areas:
      "nav     nav"
      "sidebar main"
      "footer  footer";
    grid-template-columns: 240px 1fr;
  }
}

@media (min-width: 1200px) {
  .app {
    grid-template-areas:
      "nav     nav     nav"
      "sidebar main    aside"
      "footer  footer  footer";
    grid-template-columns: 240px 1fr 300px;
  }
}
```

### Dot Notation for Empty Cells

Use `.` (or `...`) to leave a cell empty:

```css
.dashboard {
  display: grid;
  grid-template-areas:
    "stats  stats  chart"
    "table  table  ."
    "footer footer footer";
  grid-template-columns: 1fr 1fr 300px;
}
```

---

## auto-fill vs auto-fit

Both work with `repeat()` to create as many tracks as fit. The difference matters when items don't fill the row.

### auto-fill

Creates as many tracks as possible, even if empty. Empty tracks take up space.

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
/* With 3 items on a 900px container: creates 4 columns, 3 filled, 1 empty ghost column */
```

Use auto-fill when: items should start at the left and you want consistent column widths even with few items.

### auto-fit

Creates tracks, then collapses empty ones to 0. Items stretch to fill available space.

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
/* With 3 items on a 900px container: creates 3 columns, all equal width, no empty ghost */
```

Use auto-fit when: items should expand to fill the row.

### The Responsive Grid Pattern (No Media Queries)

```css
/* Items auto-wrap when container is too small */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: clamp(16px, 2vw, 32px);
}

/* The min(280px, 100%) prevents overflow on very narrow containers */
```

---

## minmax() Patterns

`minmax(min, max)` sets a track's size range.

```css
/* Common patterns */

/* Fixed minimum, grow to fill */
grid-template-columns: minmax(200px, 1fr);

/* Shrink to content, max out at 1fr */
grid-template-columns: minmax(auto, 1fr);

/* Never smaller than content, cap at 400px */
grid-template-columns: minmax(min-content, 400px);

/* Fluid sidebar: always visible, cap at 300px */
grid-template-columns: minmax(200px, 300px) 1fr;
```

### Content-Aware Sizing

```css
.data-table-grid {
  display: grid;
  grid-template-columns:
    minmax(40px, auto)      /* checkbox: as small as needed */
    minmax(120px, 2fr)      /* name: prefers 2x space */
    minmax(80px, 1fr)       /* status: baseline */
    minmax(100px, auto)     /* date: content-sized */
    minmax(120px, auto);    /* actions: content-sized */
}
```

---

## Subgrid

Subgrid allows nested grids to participate in the parent grid's track sizing. This solves the "misaligned cards" problem.

### Problem Without Subgrid

```css
/* Cards have inconsistent heights because content varies */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.card {
  display: flex;
  flex-direction: column;
  /* Footer is NOT aligned across cards */
}
```

### Solution With Subgrid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto; /* rows defined implicitly */
  gap: 24px;
}

.card {
  display: grid;
  grid-row: span 3;              /* Each card spans 3 rows */
  grid-template-rows: subgrid;   /* Align to parent grid rows */
}

/* Now all card images, titles, and footers align across the row */
.card-image  { /* row 1 */ }
.card-body   { /* row 2 */ }
.card-footer { /* row 3 — aligned across all cards */ }
```

### Subgrid for Form Alignment

```css
.form-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 16px;
}

/* Each field row inherits the parent's column definitions */
.form-field {
  display: grid;
  grid-column: span 2;
  grid-template-columns: subgrid;
}

.form-label { grid-column: 1; text-align: right; padding-top: 8px; }
.form-input { grid-column: 2; }
```

---

## Grid Alignment

### Align the Grid Items (Content Inside Cells)

```css
.grid {
  /* Applies to ALL items */
  justify-items: start | end | center | stretch; /* horizontal */
  align-items:   start | end | center | stretch; /* vertical */

  /* Shorthand */
  place-items: center;           /* both centered */
  place-items: start end;        /* align-items start, justify-items end */
}
```

### Align the Grid Itself (When Grid is Smaller Than Container)

```css
.grid-container {
  height: 600px;
  display: grid;
  grid-template-columns: repeat(3, 200px); /* Fixed-size columns — may not fill container */

  justify-content: start | end | center | stretch | space-between | space-around | space-evenly;
  align-content:   start | end | center | stretch | space-between | space-around | space-evenly;

  place-content: center; /* Centers the entire grid in the container */
}
```

### Override Per Item

```css
.grid-item {
  justify-self: start | end | center | stretch;
  align-self:   start | end | center | stretch;
  place-self:   center; /* shorthand */
}

/* Common use: full-width item in multi-column grid */
.featured-card {
  grid-column: 1 / -1; /* Span all columns */
  justify-self: stretch;
}
```

---

## Common Layout Patterns

### Holy Grail Layout

```css
.holy-grail {
  display: grid;
  grid-template:
    "header"  60px
    "nav"     48px
    "body"    1fr
    "footer"  48px
    / 1fr;
  min-height: 100dvh;
}

@media (min-width: 768px) {
  .holy-grail {
    grid-template:
      "header header  header" 60px
      "nav    main    aside"  1fr
      "footer footer  footer" 48px
      / 220px 1fr     200px;
  }
}

header { grid-area: header; }
nav    { grid-area: nav;    }
main   { grid-area: main;   }
aside  { grid-area: aside;  }
footer { grid-area: footer; }
```

### Sidebar Layout (Collapsible)

```css
.sidebar-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width, 260px) 1fr;
  grid-template-rows: 1fr;
  height: 100vh;
}

/* Sidebar collapsed via CSS variable */
.sidebar-layout[data-collapsed="true"] {
  --sidebar-width: 64px;
}

/* Smooth transition */
.sidebar {
  width: var(--sidebar-width, 260px);
  transition: width 0.2s ease;
  overflow: hidden;
}
```

### Dashboard Grid

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: 16px;
  padding: 24px;
}

/* Stat cards: 3 columns each on 12-col grid */
.stat-card    { grid-column: span 3; }

/* Main chart: 8 columns */
.main-chart   { grid-column: span 8; }

/* Side panel: 4 columns */
.side-panel   { grid-column: span 4; }

/* Full-width table */
.data-table   { grid-column: 1 / -1; }

/* Responsive: stack to 6-col on tablet */
@media (max-width: 1024px) {
  .dashboard  { grid-template-columns: repeat(6, 1fr); }
  .stat-card  { grid-column: span 3; }
  .main-chart { grid-column: 1 / -1; }
  .side-panel { grid-column: 1 / -1; }
}

@media (max-width: 640px) {
  .dashboard  { grid-template-columns: 1fr; }
  .stat-card  { grid-column: 1; }
}
```

### Magazine / Editorial Layout

```css
.magazine {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 200px;
  gap: 8px;
}

/* Hero: large, spans multiple rows and cols */
.article--hero {
  grid-column: span 4;
  grid-row: span 2;
}

/* Secondary: half width, one row */
.article--secondary {
  grid-column: span 2;
  grid-row: span 1;
}

/* Small: 2 columns, 1 row */
.article--small {
  grid-column: span 2;
}

/* Full bleed ad/banner */
.banner {
  grid-column: 1 / -1;
  grid-row: span 1;
}
```

### Masonry-Like Grid (Pure CSS)

```css
/* CSS Grid masonry (Chrome experimental / Safari supported) */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-template-rows: masonry; /* Experimental */
  align-tracks: start;
  gap: 16px;
}

/* Fallback: CSS columns for masonry effect */
.masonry-fallback {
  columns: 3 250px;
  column-gap: 16px;
}

.masonry-fallback > * {
  break-inside: avoid;
  margin-bottom: 16px;
}
```

---

## Responsive Grid Without Media Queries

### Self-Adjusting Column Count

```css
/* Minimum 280px per card, auto-fills columns */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
/* 320px viewport: 1 column. 640px: 2 columns. 960px: 3 columns. No breakpoints. */
```

### The RAM Pattern (Repeat, Auto-fit, Minmax)

```css
/* Named after Kevin Powell — most useful responsive grid pattern */
.ram-grid {
  --min-col-width: 200px;

  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(var(--min-col-width), 100%), 1fr));
  gap: var(--gap, 16px);
}
```

The `min(var(--min-col-width), 100%)` prevents overflow on containers narrower than `--min-col-width`.

### Fluid Sidebar (No Media Query)

```css
/* Sidebar wraps below main when container < 600px */
.with-sidebar {
  display: grid;
  grid-template-columns: fit-content(300px) 1fr;
  flex-wrap: wrap; /* Fallback */
  gap: 24px;
}

/* When sidebar can't fit, it wraps to full width automatically with: */
.with-sidebar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
}
```

---

## Grid Placement: Explicit and Implicit

```css
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;       /* Height of implicit rows */
  grid-auto-flow: row dense;   /* Fill gaps with smaller items */
}

/* Explicit placement */
.item-featured {
  grid-column: 1 / 3;   /* Columns 1 to 3 */
  grid-row: 1 / 3;      /* Rows 1 to 3 */
}

/* Shorthand */
.item-full-row {
  grid-column: 1 / -1;  /* Span full width */
}

.item-last-col {
  grid-column: -2 / -1; /* Second to last column */
}
```

### grid-auto-flow: dense

Fills in holes left by larger items. Good for image galleries, not for ordered content (breaks DOM order).

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-auto-rows: 150px;
  grid-auto-flow: dense; /* Pack items tightly */
  gap: 8px;
}

.gallery-item--wide  { grid-column: span 2; }
.gallery-item--tall  { grid-row: span 2;    }
.gallery-item--large { grid-column: span 2; grid-row: span 2; }
```

---

## Performance Notes

- `display: grid` is hardware-accelerated in modern browsers.
- Avoid animating `grid-template-columns` — not all browsers handle it smoothly. Animate the child's `width` or use CSS variables with transitions instead.
- `grid-auto-flow: dense` reorders visual presentation from DOM order — accessibility concern. Screen readers follow DOM, not visual order.
- Deeply nested grids (>3 levels) impact layout recalculation. Flatten where possible.
