# Responsive Layout Strategies

## Mobile-First: The Right Default

Mobile-first means writing base styles for the smallest viewport, then layering enhancements for larger screens with `min-width` queries.

```css
/* WRONG: Desktop-first (overriding down) */
.card {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 600px) {
  .card {
    grid-template-columns: 1fr; /* Override — fighting previous rule */
  }
}

/* RIGHT: Mobile-first (enhancing up) */
.card {
  display: grid;
  grid-template-columns: 1fr; /* Base: single column */
}

@media (min-width: 600px) {
  .card {
    grid-template-columns: 1fr 1fr; /* Enhancement */
  }
}
```

**Why mobile-first wins:**
- Base styles cascade naturally — no specificity battles
- Mobile users load only the base CSS (no overrides to parse)
- Forces content priority decisions up front
- Browsers and prefers-reduced-data apply min-width more efficiently
- Progressive enhancement philosophy: start with working content, add layout

---

## Breakpoint Tokens

Hard-coding breakpoint values creates maintenance debt. Use CSS custom properties and/or a design token layer.

### Standard Breakpoint Scale

```css
/* breakpoints.css */
:root {
  --bp-xs:  320px;   /* Minimum supported */
  --bp-sm:  480px;   /* Large mobile */
  --bp-md:  768px;   /* Tablet portrait */
  --bp-lg:  1024px;  /* Tablet landscape / small desktop */
  --bp-xl:  1280px;  /* Desktop */
  --bp-2xl: 1536px;  /* Large desktop */
}
```

Note: CSS custom properties don't work directly inside `@media` queries. Use them via PostCSS, CSS preprocessors, or reference them consistently as raw values.

```scss
/* SCSS with tokens */
$breakpoints: (
  'sm':  480px,
  'md':  768px,
  'lg':  1024px,
  'xl':  1280px,
  '2xl': 1536px,
);

@mixin up($bp) {
  @media (min-width: map-get($breakpoints, $bp)) { @content; }
}

.container {
  padding: 16px;

  @include up('md') { padding: 24px; }
  @include up('xl') { padding: 32px; }
}
```

### Content-Based Breakpoints (Better Approach)

Don't break at device sizes. Break where the content breaks.

```css
/* BAD: Breaking at arbitrary device widths */
@media (max-width: 768px) { ... }

/* GOOD: Breaking when the content stops looking right */
/* "This paragraph becomes hard to read past ~65ch" */
.article {
  max-width: 65ch;
}

/* "This card grid needs a second column once we have 480px" */
@media (min-width: 480px) {
  .card-grid {
    grid-template-columns: 1fr 1fr;
  }
}
```

**Process:** Design each component in isolation. Resize the viewport until it breaks. Set the breakpoint there — not at an assumed device width.

---

## Container Queries: Component-Level Responsiveness

Media queries respond to the viewport. Container queries respond to the component's container. This enables truly reusable components.

```css
/* Define a containment context */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* Style the card based on its container's width */
.card {
  display: grid;
  grid-template-columns: 1fr; /* Mobile-style by default */
}

@container card (min-width: 400px) {
  .card {
    grid-template-columns: 120px 1fr; /* Horizontal layout when space allows */
  }
}

@container card (min-width: 600px) {
  .card {
    grid-template-columns: 180px 1fr;
    gap: 24px;
  }
}
```

### Why Container Queries Beat Media Queries for Components

The same card component in a 3-column layout vs a full-width hero area:

```html
<!-- Sidebar: narrow container -->
<aside class="sidebar">
  <div class="card-wrapper">
    <article class="card">...</article> <!-- Stacks vertically -->
  </div>
</aside>

<!-- Main area: wide container -->
<main class="content">
  <div class="card-wrapper">
    <article class="card">...</article> <!-- Goes horizontal -->
  </div>
</main>
```

Both use the same CSS. The container determines the layout — not an arbitrary viewport width.

### Container Query Units

```css
@container (min-width: 400px) {
  .card-title {
    font-size: 2cqi;  /* 2% of container inline size */
    padding: 5cqb;    /* 5% of container block size */
  }
}

/* Container query units */
/* cqw  = 1% of container width */
/* cqh  = 1% of container height */
/* cqi  = 1% of container inline size */
/* cqb  = 1% of container block size */
/* cqmin = smaller of cqi/cqb */
/* cqmax = larger of cqi/cqb */
```

### Container Query Size Queries

```css
.widget {
  container-type: size; /* Track both width and height */
}

@container (aspect-ratio > 1) {
  .widget-content {
    flex-direction: row; /* Landscape-oriented layout */
  }
}

@container (height < 200px) {
  .widget-details {
    display: none; /* Hide details in compact mode */
  }
}
```

---

## Fluid Layouts with clamp()

`clamp(min, preferred, max)` creates fluid values that scale with the viewport — eliminating many breakpoints entirely.

```css
/* Font size that scales between 16px (mobile) and 24px (desktop) */
.body-text {
  font-size: clamp(1rem, 2vw + 0.5rem, 1.5rem);
}

/* Padding that scales with viewport */
.section {
  padding-block: clamp(48px, 8vw, 96px);
}

/* Container width */
.container {
  width: min(100% - 48px, 1280px);
  margin-inline: auto;
}
```

### Calculating clamp() Values

The middle value should pass through `min` at the smallest viewport and `max` at the largest:

```
Desired: 16px at 320px viewport, 24px at 1280px viewport

Slope = (max - min) / (max-vw - min-vw)
      = (24 - 16) / (1280 - 320)
      = 8 / 960
      = 0.00833...
      ≈ 0.833vw

Intercept = min - (slope × min-vw)
          = 16 - (0.00833 × 320)
          = 16 - 2.67
          = 13.33px

clamp(16px, 0.833vw + 13.33px, 24px)
```

Or use the simplified form: `clamp(1rem, 1vw + 0.75rem, 1.5rem)` and test empirically.

### Fluid Spacing Scale

```css
:root {
  --space-sm:  clamp(0.5rem,  1vw,    1rem);
  --space-md:  clamp(1rem,    2vw,    1.5rem);
  --space-lg:  clamp(1.5rem,  3vw,    3rem);
  --space-xl:  clamp(2rem,    5vw,    5rem);
  --space-2xl: clamp(3rem,    8vw,    8rem);
}

.hero {
  padding-block: var(--space-2xl);
}

.section {
  padding-block: var(--space-xl);
}
```

---

## Responsive Patterns

### Stack to Grid

The most common responsive pattern: items stack on mobile, grid on desktop.

```css
.feature-grid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: stack */
  gap: 24px;
}

@media (min-width: 640px) {
  .feature-grid {
    grid-template-columns: 1fr 1fr; /* Tablet: 2 columns */
  }
}

@media (min-width: 1024px) {
  .feature-grid {
    grid-template-columns: repeat(3, 1fr); /* Desktop: 3 columns */
  }
}

/* Or without media queries */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
```

### Sidebar Collapse

Sidebar alongside content on desktop, hidden/drawer on mobile.

```css
.app-layout {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: no sidebar */
  grid-template-areas: "main";
}

@media (min-width: 1024px) {
  .app-layout {
    grid-template-columns: 260px 1fr;
    grid-template-areas: "sidebar main";
  }
}

/* Mobile sidebar as drawer */
.sidebar {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  width: 280px;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  z-index: var(--z-drawer, 200);
}

.sidebar[data-open="true"] {
  transform: translateX(0);
}

@media (min-width: 1024px) {
  .sidebar {
    position: static;
    transform: none;
    width: auto;
  }
}
```

### Table to Cards

Data tables become card stacks on mobile.

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
}

/* On mobile: hide table, show cards */
@media (max-width: 640px) {
  .data-table thead {
    display: none; /* Hide column headers */
  }

  .data-table tr {
    display: block;
    margin-bottom: 16px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 12px;
  }

  .data-table td {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border: none;
  }

  /* Add labels from data attribute */
  .data-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--color-text-subtle);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}
```

HTML needs `data-label` attributes:

```html
<td data-label="Name">John Doe</td>
<td data-label="Status">Active</td>
```

### Navigation Collapse

Top nav to hamburger/bottom bar on mobile.

```css
/* Desktop nav */
.site-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Mobile: off-canvas drawer */
@media (max-width: 768px) {
  .site-nav {
    position: fixed;
    inset: 0;
    flex-direction: column;
    background: var(--color-surface);
    padding: 80px 24px 24px;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    z-index: var(--z-modal, 300);
  }

  .site-nav[aria-expanded="true"] {
    transform: translateX(0);
  }
}

/* Alternative: Bottom tab bar on mobile */
@media (max-width: 768px) {
  .site-nav {
    position: fixed;
    bottom: 0;
    inset-inline: 0;
    justify-content: space-around;
    padding: 8px;
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }
}
```

---

## No-Breakpoint Layouts

Layouts that adapt without any media queries, using intrinsic sizing.

### The Switcher (Flexbox)

Items sit in a row until the container is too narrow, then ALL switch to column at once.

```css
.switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.switcher > * {
  flex-grow: 1;
  flex-basis: calc((480px - 100%) * 999); /* Negative or huge — forces wrap at 480px */
}
```

Explanation: When container > 480px, the `flex-basis` is negative (clipped to 0), so items share space. When container < 480px, flex-basis becomes huge, forcing each to its own row.

### The Cluster (Tag Cloud)

Items wrap naturally at any container width:

```css
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start; /* or center for centered clusters */
}
```

### The Reel (Horizontal Scroll)

Fixed-size items scroll horizontally — no breakpoints needed:

```css
.reel {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 16px; /* Room for scrollbar */
  -webkit-overflow-scrolling: touch;
}

.reel > * {
  flex-shrink: 0;
  scroll-snap-align: start;
}
```

### The Sidebar (Intrinsic)

Sidebar and content side-by-side until sidebar can't maintain minimum width:

```css
.with-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

/* Sidebar: fixed width on desktop, full width on mobile */
.sidebar {
  flex-basis: 300px;
  flex-grow: 1;
}

/* Content: fills remaining space, minimum 50% to trigger wrap */
.main-content {
  flex-basis: 0;
  flex-grow: 999;
  min-width: min(50%, 400px);
}
/* When container < 700px, content can't hold 50% → wraps to new row */
```

---

## Safe Areas and Viewport Units

### Modern Viewport Units

```css
/* Old: problematic with browser chrome on mobile */
.hero { height: 100vh; }

/* New: dynamic viewport (updates as browser chrome shows/hides) */
.hero { height: 100dvh; }

/* Small viewport (browser chrome visible) */
.hero { height: 100svh; }

/* Large viewport (browser chrome hidden) */
.hero { height: 100lvh; }
```

**Use `100dvh`** for anything that should fill the visible screen. Use `100svh` for conservative sizing.

### Safe Area Insets (Notch / Home Bar)

```css
.bottom-nav {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}

.app-header {
  padding-top: max(16px, env(safe-area-inset-top));
}

.full-screen-modal {
  padding:
    env(safe-area-inset-top)
    env(safe-area-inset-right)
    env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}
```

Requires the viewport meta tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

---

## Responsive Image Patterns

```css
/* Basic responsive image */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Aspect ratio preservation */
.image-wrapper {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

/* Art direction: different crops at different sizes */
/* Use <picture> element in HTML, not CSS */
```

```html
<picture>
  <source media="(min-width: 1024px)" srcset="hero-wide.jpg">
  <source media="(min-width: 640px)"  srcset="hero-medium.jpg">
  <img src="hero-mobile.jpg" alt="Hero image">
</picture>
```
