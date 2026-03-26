# Fluid Responsive Typography

## The Problem with Breakpoint-Based Type

Traditional responsive typography uses media queries to switch between fixed sizes:

```css
/* Old approach — abrupt jumps */
h1 { font-size: 2rem; }

@media (min-width: 768px) { h1 { font-size: 2.5rem; } }
@media (min-width: 1200px) { h1 { font-size: 3rem; } }
```

This creates hard jumps at each breakpoint. At 767px the heading is 32px; at 768px it instantly becomes 40px. Between breakpoints, the size is fixed regardless of the actual viewport.

Fluid typography solves this by scaling continuously between a minimum size (at a minimum viewport) and a maximum size (at a maximum viewport), with no breakpoints required.

---

## CSS clamp() — The Core Tool

`clamp(minimum, preferred, maximum)` constrains a value between a floor and a ceiling.

```css
font-size: clamp(1rem, 2.5vw, 2rem);
/*               min   preferred  max */
```

- Below the breakeven viewport: `minimum` is used
- Above the breakeven viewport: `maximum` is used
- Between them: `preferred` scales linearly

The `preferred` value is typically a viewport-relative expression (`vw` or `vi`) combined with a rem offset to control the slope and intercept of the linear scale.

---

## The Fluid Type Formula

Given a minimum font size, maximum font size, minimum viewport, and maximum viewport, the formula produces a `preferred` value that creates a perfectly linear scale.

```
Variables:
  minSize  (rem)  — font size at small viewport
  maxSize  (rem)  — font size at large viewport
  minVW    (px)   — viewport where minimum applies
  maxVW    (px)   — viewport where maximum applies

Step 1: Convert viewport widths to rem
  minVW_rem = minVW / 16
  maxVW_rem = maxVW / 16

Step 2: Calculate slope
  slope = (maxSize - minSize) / (maxVW_rem - minVW_rem)

Step 3: Calculate intercept
  intercept = minSize - slope * minVW_rem

Step 4: Assemble clamp()
  font-size: clamp(minSize * 1rem,  slope * 100vw + intercept * 1rem,  maxSize * 1rem)
```

### Worked Example

Scale h1 from 2rem (32px) at 320px viewport to 4rem (64px) at 1280px:

```
minSize  = 2
maxSize  = 4
minVW    = 320   → minVW_rem = 20
maxVW    = 1280  → maxVW_rem = 80

slope     = (4 - 2) / (80 - 20)
          = 2 / 60
          = 0.03333

intercept = 2 - 0.03333 * 20
          = 2 - 0.6667
          = 1.3333

Result:
  font-size: clamp(2rem, 3.333vw + 1.333rem, 4rem);
```

Verification:
- At 320px: `3.333vw + 1.333rem` = `3.333% × 320 + 21.33` = `10.67 + 21.33` = `32px` = `2rem` ✓
- At 1280px: `3.333% × 1280 + 21.33` = `42.67 + 21.33` = `64px` = `4rem` ✓

---

## Complete Fluid Type System

Using minimum viewport 375px, maximum viewport 1440px:

```css
/* =============================================
   FLUID TYPE SCALE
   Min: 375px viewport → Max: 1440px viewport
   Ratio: ~Minor Third (1.2) at max
   ============================================= */

:root {
  /*
    Formula reminder:
    slope     = (maxRem - minRem) / ((maxVW - minVW) / 16)
    intercept = minRem - slope * (minVW / 16)
    result    = clamp(minRem rem, slope*100vw + intercept*1rem, maxRem rem)
  */

  /* xs: 11px → 13px */
  --text-xs: clamp(0.6875rem, 0.6388rem + 0.2081vw, 0.8125rem);

  /* sm: 13px → 15px */
  --text-sm: clamp(0.8125rem, 0.7638rem + 0.2081vw, 0.9375rem);

  /* base: 16px → 18px */
  --text-base: clamp(1rem, 0.9513rem + 0.2081vw, 1.125rem);

  /* lg: 18px → 22px */
  --text-lg: clamp(1.125rem, 1.0277rem + 0.4162vw, 1.375rem);

  /* xl: 20px → 28px */
  --text-xl: clamp(1.25rem, 1.0555rem + 0.8325vw, 1.75rem);

  /* 2xl: 24px → 36px */
  --text-2xl: clamp(1.5rem, 1.2083rem + 1.2487vw, 2.25rem);

  /* 3xl: 28px → 48px */
  --text-3xl: clamp(1.75rem, 1.2638rem + 2.0812vw, 3rem);

  /* 4xl: 32px → 60px */
  --text-4xl: clamp(2rem, 1.3194rem + 2.9137vw, 3.75rem);

  /* 5xl: 40px → 80px */
  --text-5xl: clamp(2.5rem, 1.5277rem + 4.1624vw, 5rem);

  /* 6xl: 48px → 96px */
  --text-6xl: clamp(3rem, 1.8333rem + 4.9949vw, 6rem);

  /* display: 56px → 120px */
  --text-display: clamp(3.5rem, 1.9444rem + 6.6598vw, 7.5rem);
}
```

---

## Viewport-Based vs. Container-Based

### Viewport-Based (vw)

The traditional approach. Type scales with the viewport width.

```css
h1 { font-size: clamp(2rem, 4vw + 1rem, 5rem); }
```

**Limitation**: In a sidebar that's 300px wide inside a 1400px viewport, the font still uses 4vw of the 1400px viewport — too large for the container.

### Container-Based (cqi / cqb)

CSS Container Queries (supported since 2023) let type scale with its container, not the viewport.

```css
/* Define a container */
.card {
  container-type: inline-size;
  container-name: card;
}

/* Scale type within the container */
@container card (min-width: 400px) {
  .card-title { font-size: 1.5rem; }
}

/* Fluid within a container using cqi (container query inline-size) */
.card-title {
  font-size: clamp(1rem, 3cqi + 0.5rem, 2rem);
  /* Scales with container width, not viewport */
}
```

**When to use container queries for type:**
- Card-based UIs where cards resize in grid layouts
- Sidebar widgets with variable widths
- Reusable components that must work at any width
- Design systems where components are viewport-agnostic

### Hybrid Approach

Use viewport-based fluid type for page-level headings and container-based for component-level type:

```css
/* Page-level: scales with viewport */
.page-hero h1 {
  font-size: clamp(2.5rem, 5vw + 1rem, 6rem);
}

/* Component-level: scales with container */
.card {
  container-type: inline-size;
}
.card-title {
  font-size: clamp(1rem, 4cqi, 1.5rem);
}
```

---

## Minimum and Maximum Constraints

The min and max in clamp() are hard stops. Common mistakes:

### Minimum Too Small

```css
/* Bad: 12px heading is unreadable */
h2 { font-size: clamp(0.75rem, 3vw, 2.5rem); }

/* Good: never below comfortable reading size */
h2 { font-size: clamp(1.25rem, 3vw, 2.5rem); }
```

### Maximum Too Large for Context

```css
/* Bad: 96px h1 is fine for hero, terrible inside a card */
.card h1 { font-size: clamp(1.5rem, 8vw, 6rem); }

/* Good: constrained to card context */
.card { container-type: inline-size; }
.card h1 { font-size: clamp(1.125rem, 5cqi, 1.75rem); }
```

### Preferred Overrides Min at Small Viewports

If the preferred expression evaluates below the minimum at your target small viewport, verify the clamp is actually clamping:

```css
/* Check: at 320px viewport, what is 2vw + 0.5rem? */
/* 2% × 320 = 6.4px + 8px = 14.4px = 0.9rem */
/* clamp(1rem, ..., 2rem) → min wins → 1rem ✓ */
font-size: clamp(1rem, 2vw + 0.5rem, 2rem);
```

---

## Fluid Type Calculator Formulas

### Utopia-style formula (recommended)

Utopia (utopia.fyi) uses a slightly different formulation that accounts for viewport in rem:

```
f(vw) = minSize + (maxSize - minSize) × (vw - minVW) / (maxVW - minVW)

In CSS:
  slope     = (maxSize - minSize) / ((maxVW / 16) - (minVW / 16))
  y-axis    = -1 × (minVW / 16) × slope + minSize
  preferred = slope * 100vi + y-axis * 1rem
```

Using `vi` (viewport inline-size) instead of `vw` is more correct for internationalization — it respects writing mode.

### JavaScript Calculator

```javascript
function fluidType(minSizePx, maxSizePx, minVW = 375, maxVW = 1440) {
  const minSize  = minSizePx / 16;
  const maxSize  = maxSizePx / 16;
  const minVWrem = minVW / 16;
  const maxVWrem = maxVW / 16;

  const slope     = (maxSize - minSize) / (maxVWrem - minVWrem);
  const intercept = minSize - slope * minVWrem;

  const slopeVW   = (slope * 100).toFixed(4);
  const intRem    = intercept.toFixed(4);
  const sign      = intercept >= 0 ? '+' : '-';
  const absInt    = Math.abs(intercept).toFixed(4);

  return `clamp(${minSize}rem, ${slopeVW}vw ${sign} ${absInt}rem, ${maxSize}rem)`;
}

// Usage:
fluidType(16, 20);   // body text
// → "clamp(1rem, 0.3756vw + 0.8592rem, 1.25rem)"

fluidType(32, 64);   // h1
// → "clamp(2rem, 3.0047vw + 0.8780rem, 4rem)"
```

---

## Responsive Type Without clamp() (Fallback)

For browsers that don't support clamp() (IE 11, very old Safari):

```css
/* Mobile first base */
h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }
p  { font-size: 1rem; }

/* Tablet */
@media (min-width: 640px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.5rem; }
}

/* Desktop */
@media (min-width: 1024px) {
  h1 { font-size: 3rem; }
  h2 { font-size: 2rem; }
  h3 { font-size: 1.75rem; }
  p  { font-size: 1.0625rem; }
}

/* Large desktop */
@media (min-width: 1400px) {
  h1 { font-size: 4rem; }
  h2 { font-size: 2.5rem; }
}

/* Progressive enhancement: override with clamp() */
@supports (font-size: clamp(1rem, 2vw, 3rem)) {
  h1 { font-size: clamp(2rem, 3vw + 1rem, 4rem); }
  h2 { font-size: clamp(1.5rem, 2.5vw + 0.5rem, 2.5rem); }
  h3 { font-size: clamp(1.25rem, 2vw + 0.25rem, 1.75rem); }
  p  { font-size: clamp(1rem, 0.5vw + 0.875rem, 1.125rem); }
}
```

---

## Complete Production-Ready Fluid System

A self-contained fluid type system for immediate use:

```css
/* =============================================
   PRODUCTION FLUID TYPE SYSTEM
   Viewport range: 375px – 1440px
   ============================================= */

:root {
  /* === Type Scale === */
  --fluid-xs:      clamp(0.6875rem, 0.6596rem + 0.1174vw,  0.75rem);
  --fluid-sm:      clamp(0.8125rem, 0.7847rem + 0.1174vw,  0.875rem);
  --fluid-base:    clamp(1rem,      0.9627rem + 0.1565vw,  1.125rem);
  --fluid-lg:      clamp(1.125rem,  1.0598rem + 0.2738vw,  1.375rem);
  --fluid-xl:      clamp(1.25rem,   1.1015rem + 0.6255vw,  1.75rem);
  --fluid-2xl:     clamp(1.5rem,    1.2718rem + 0.9602vw,  2.25rem);
  --fluid-3xl:     clamp(1.875rem,  1.5053rem + 1.5571vw,  3rem);
  --fluid-4xl:     clamp(2.25rem,   1.7108rem + 2.2731vw,  4rem);
  --fluid-5xl:     clamp(2.75rem,   1.9664rem + 3.3232vw,  5.25rem);
  --fluid-6xl:     clamp(3.5rem,    2.3985rem + 4.6598vw,  7rem);
  --fluid-display: clamp(4rem,      2.4359rem + 6.6106vw,  9rem);

  /* === Leading (line-height) === */
  --leading-display: 1.05;
  --leading-heading: 1.2;
  --leading-subhead: 1.35;
  --leading-body:    1.6;
  --leading-tight:   1.25;
  --leading-loose:   1.75;

  /* === Tracking (letter-spacing) === */
  --tracking-display: -0.03em;
  --tracking-heading: -0.02em;
  --tracking-body:     0em;
  --tracking-caps:     0.08em;
  --tracking-wide:     0.04em;
}

/* Base styles */
html { font-size: 100%; }
body {
  font-size: var(--fluid-base);
  line-height: var(--leading-body);
}

/* Heading defaults */
h1 {
  font-size: var(--fluid-5xl);
  line-height: var(--leading-display);
  letter-spacing: var(--tracking-display);
}
h2 {
  font-size: var(--fluid-4xl);
  line-height: var(--leading-heading);
  letter-spacing: var(--tracking-heading);
}
h3 {
  font-size: var(--fluid-3xl);
  line-height: var(--leading-heading);
  letter-spacing: var(--tracking-heading);
}
h4 { font-size: var(--fluid-2xl); line-height: var(--leading-subhead); }
h5 { font-size: var(--fluid-xl);  line-height: var(--leading-subhead); }
h6 { font-size: var(--fluid-lg);  line-height: var(--leading-body); }

/* Text utilities */
.text-display {
  font-size: var(--fluid-display);
  line-height: var(--leading-display);
  letter-spacing: var(--tracking-display);
}
.text-lead {
  font-size: var(--fluid-xl);
  line-height: var(--leading-loose);
  font-weight: 300;
}
.text-overline {
  font-size: var(--fluid-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  font-weight: 600;
}
```
