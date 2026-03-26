# Fluid Design

## What Fluid Design Means

Fluid design eliminates hard breakpoints by making values scale continuously
with the viewport. Instead of jumping from 16px to 20px to 24px at fixed
breakpoints, a fluid value interpolates smoothly across the entire range.

The primary tool is `clamp(min, preferred, max)`:
- `min` — the smallest the value can be (applies on small viewports)
- `preferred` — a viewport-relative expression that scales the value
- `max` — the largest the value can be (applies on large viewports)

---

## Fluid Typography with clamp()

The goal: text that is comfortably readable on a 320px phone and a 1440px monitor
without requiring multiple `font-size` breakpoints.

```css
/* clamp(minimum, fluid-value, maximum) */
/* fluid-value = viewport-width interpolation */

/* Formula:
   preferred = min + (max - min) * ((100vw - min-vp) / (max-vp - min-vp))

   For 16px at 320px viewport → 24px at 1280px:
   slope = (24 - 16) / (1280 - 320) = 8 / 960 = 0.00833
   intercept = 16 - 0.00833 * 320 = 16 - 2.667 = 13.333px

   preferred = 13.333px + 0.00833 * 100vw
             ≈ 0.833rem + 0.833vw
*/

:root {
  /* Body text: 16px at 320px → 18px at 1280px */
  --text-base: clamp(1rem, 0.917rem + 0.417vw, 1.125rem);

  /* Small text: 14px at 320px → 16px at 1280px */
  --text-sm: clamp(0.875rem, 0.792rem + 0.417vw, 1rem);

  /* H3: 20px at 320px → 28px at 1280px */
  --text-h3: clamp(1.25rem, 0.917rem + 1.667vw, 1.75rem);

  /* H2: 24px at 320px → 36px at 1280px */
  --text-h2: clamp(1.5rem, 1rem + 2.5vw, 2.25rem);

  /* H1: 28px at 320px → 52px at 1280px */
  --text-h1: clamp(1.75rem, 0.75rem + 5vw, 3.25rem);

  /* Display: 32px at 320px → 72px at 1280px */
  --text-display: clamp(2rem, 0.333rem + 8.333vw, 4.5rem);
}

body        { font-size: var(--text-base); }
h1          { font-size: var(--text-h1); }
h2          { font-size: var(--text-h2); }
h3          { font-size: var(--text-h3); }
small, .sm  { font-size: var(--text-sm); }
```

### Using a Fluid Type Scale Tool

The Utopia calculator (utopia.fyi) generates complete fluid type scales.
A typical Utopia-generated scale from 320px to 1240px:

```css
/* @link https://utopia.fyi/type/calculator */
:root {
  --step--2: clamp(0.6944rem, 0.6856rem + 0.0444vw, 0.72rem);
  --step--1: clamp(0.8331rem, 0.8101rem + 0.1149vw, 0.9rem);
  --step-0:  clamp(1rem,      0.9565rem + 0.2174vw, 1.125rem);
  --step-1:  clamp(1.2rem,    1.1283rem + 0.3587vw, 1.4063rem);
  --step-2:  clamp(1.44rem,   1.3295rem + 0.5527vw, 1.7578rem);
  --step-3:  clamp(1.728rem,  1.5648rem + 0.8161vw, 2.1973rem);
  --step-4:  clamp(2.0736rem, 1.8395rem + 1.1704vw, 2.7466rem);
  --step-5:  clamp(2.4883rem, 2.1597rem + 1.6432vw, 3.4332rem);
}
```

---

## Fluid Spacing with clamp()

Apply the same technique to padding, margins, and gaps:

```css
:root {
  /* Space scale: from xs to 2xl */
  --space-xs:  clamp(0.25rem, 0.208rem + 0.208vw, 0.375rem);
  --space-sm:  clamp(0.5rem,  0.417rem + 0.417vw, 0.75rem);
  --space-md:  clamp(1rem,    0.833rem + 0.833vw, 1.5rem);
  --space-lg:  clamp(1.5rem,  1.25rem  + 1.25vw,  2.25rem);
  --space-xl:  clamp(2rem,    1.667rem + 1.667vw, 3rem);
  --space-2xl: clamp(3rem,    2.5rem   + 2.5vw,   4.5rem);
  --space-3xl: clamp(4rem,    3.333rem + 3.333vw, 6rem);

  /* Section vertical rhythm */
  --section-padding: clamp(3rem, 2rem + 5vw, 8rem);
}

.section {
  padding-block: var(--section-padding);
  padding-inline: var(--space-md);
}

.card {
  padding: var(--space-md);
  gap: var(--space-sm);
}

.stack > * + * {
  margin-top: var(--space-md);
}
```

---

## No-Breakpoint Layouts

Many layouts that previously required multiple breakpoints can be achieved
with a single fluid rule.

### Fluid Column Layout

```css
/* Text content: comfortable reading width that adapts */
.prose {
  max-width: min(65ch, 100%);
  margin-inline: auto;
  padding-inline: clamp(1rem, 5vw, 3rem);
}
```

### Fluid Sidebar Layout

```css
/* Sidebar switches to stacked when it gets below a threshold */
.sidebar-layout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.sidebar-layout__main {
  flex: 1 1 min(600px, 100%); /* Main grows, minimum before wrap */
}

.sidebar-layout__aside {
  flex: 1 1 280px; /* Sidebar minimum; wraps below this */
}
```

### Fluid Holy Grail

```css
.holy-grail {
  display: grid;
  grid-template:
    "header" auto
    "main"   1fr
    "footer" auto
    / 1fr;
  min-height: 100dvh;
}

@media (min-width: 768px) {
  .holy-grail {
    grid-template:
      "header header  header" auto
      "nav    main    aside"  1fr
      "footer footer  footer" auto
      / clamp(160px, 20%, 240px) 1fr clamp(200px, 25%, 320px);
  }
}
```

---

## CSS Grid Fluid Patterns

### auto-fill with minmax

The most powerful fluid layout pattern: columns appear and disappear as space allows.

```css
/* Cards: as many columns as fit at minimum 250px each */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-md);
}

/* Tighter grid: minimum 180px */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
}

/* Fixed max: never more than 4 columns, never less than 200px */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(max(200px, 25% - 1rem), 1fr));
  gap: 1.5rem;
}
```

### auto-fit vs auto-fill

```css
/* auto-fill: empty tracks remain (useful for alignment) */
.grid-fill {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* auto-fit: empty tracks collapse (items stretch to fill) */
.grid-fit {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
/* With 2 items and 3 columns available:
   auto-fill: items take 2 of 3 columns; third column is empty space
   auto-fit: items stretch to fill all 3 column widths */
```

### RAM Pattern (Repeat, Auto, Minmax)

```css
/* Fluid grid that prevents orphan single-column rows */
.ram-grid {
  --min-col: 260px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(var(--min-col), 100%), 1fr));
  gap: 1.5rem;
}
```

---

## Flexible Images

Images must be responsive by default. Opt into fixed sizes explicitly.

```css
/* Global reset — all images are responsive */
img,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
  height: auto; /* Maintains aspect ratio */
}

/* Hero image — full bleed */
.hero-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: center top; /* Keep faces in frame when cropping */
}

/* Avatar — fixed size, responsive source */
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

/* Card thumbnail — aspect-ratio prevents layout shift */
.card__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 0.375rem;
}
```

---

## Fluid Aspect Ratios

```css
/* Modern: native aspect-ratio property */
.video-embed {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.square-card {
  aspect-ratio: 1;
}

.portrait-card {
  aspect-ratio: 3 / 4;
}

/* Dynamic: override aspect-ratio at breakpoints */
.adaptive-ratio {
  aspect-ratio: 1;
}

@media (min-width: 768px) {
  .adaptive-ratio {
    aspect-ratio: 16 / 9;
  }
}

/* Fluid golden ratio */
.golden {
  aspect-ratio: 1.618 / 1;
}
```

---

## calc() for Proportional Sizing

`calc()` enables arithmetic on mixed units, unlocking proportional relationships.

```css
/* Column that is always sidebar-width less than full */
:root {
  --sidebar-width: 280px;
  --gap: 2rem;
}

.main-content {
  width: calc(100% - var(--sidebar-width) - var(--gap));
}

/* Responsive typography based on container */
.hero-text {
  font-size: calc(1rem + 2vw);
  /* At 320px: 1rem + 6.4px ≈ 22.4px */
  /* At 1440px: 1rem + 28.8px ≈ 44.8px */
}

/* Equal-width columns minus gap */
.three-col > * {
  width: calc((100% - 2 * 1.5rem) / 3);
}

/* Percentage + fixed offset */
.offset-panel {
  margin-left: calc(50% + 1rem);
  width: calc(50% - 2rem);
}

/* Viewport-based padding that never goes below 1rem */
.container {
  padding-inline: max(1rem, calc((100vw - 1200px) / 2));
}
```

---

## Complete Fluid Design System Example

A production-ready fluid system covering type, space, and layout:

```css
/* ============================================
   FLUID DESIGN SYSTEM
   Range: 320px (xs) → 1280px (xl)
   ============================================ */

:root {
  /* --- Fluid Type Scale --- */
  --text-xs:   clamp(0.75rem,  0.708rem + 0.208vw, 0.875rem);
  --text-sm:   clamp(0.875rem, 0.813rem + 0.313vw, 1rem);
  --text-base: clamp(1rem,     0.917rem + 0.417vw, 1.125rem);
  --text-lg:   clamp(1.125rem, 1rem     + 0.625vw, 1.375rem);
  --text-xl:   clamp(1.25rem,  1.083rem + 0.833vw, 1.5rem);
  --text-2xl:  clamp(1.5rem,   1.25rem  + 1.25vw,  2rem);
  --text-3xl:  clamp(1.875rem, 1.5rem   + 1.875vw, 2.625rem);
  --text-4xl:  clamp(2.25rem,  1.75rem  + 2.5vw,   3.5rem);
  --text-5xl:  clamp(3rem,     2.25rem  + 3.75vw,  4.5rem);

  /* --- Fluid Space Scale --- */
  --space-1: clamp(0.25rem,  0.208rem + 0.208vw, 0.375rem);
  --space-2: clamp(0.5rem,   0.417rem + 0.417vw, 0.75rem);
  --space-3: clamp(0.75rem,  0.625rem + 0.625vw, 1.125rem);
  --space-4: clamp(1rem,     0.833rem + 0.833vw, 1.5rem);
  --space-6: clamp(1.5rem,   1.25rem  + 1.25vw,  2.25rem);
  --space-8: clamp(2rem,     1.667rem + 1.667vw, 3rem);
  --space-12: clamp(3rem,    2.5rem   + 2.5vw,   4.5rem);
  --space-16: clamp(4rem,    3.333rem + 3.333vw, 6rem);
  --space-24: clamp(6rem,    5rem     + 5vw,     9rem);

  /* --- Layout --- */
  --container-max: 1200px;
  --container-padding: clamp(1rem, 5vw, 3rem);
  --section-gap: clamp(3rem, 2rem + 5vw, 8rem);
  --card-gap: clamp(1rem, 2vw, 1.5rem);
}

/* Base elements */
body {
  font-size: var(--text-base);
  line-height: 1.6;
}

h1 { font-size: var(--text-5xl); line-height: 1.1; }
h2 { font-size: var(--text-4xl); line-height: 1.2; }
h3 { font-size: var(--text-3xl); line-height: 1.25; }
h4 { font-size: var(--text-2xl); line-height: 1.3; }
h5 { font-size: var(--text-xl);  line-height: 1.4; }
h6 { font-size: var(--text-lg);  line-height: 1.5; }

/* Layout primitives */
.container {
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-padding);
}

.section {
  padding-block: var(--section-gap);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: var(--card-gap);
}

/* Stack: vertical rhythm */
.stack {
  display: flex;
  flex-direction: column;
}

.stack-sm > * + * { margin-top: var(--space-2); }
.stack-md > * + * { margin-top: var(--space-4); }
.stack-lg > * + * { margin-top: var(--space-8); }

/* Cluster: horizontal wrapping group */
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}
```
