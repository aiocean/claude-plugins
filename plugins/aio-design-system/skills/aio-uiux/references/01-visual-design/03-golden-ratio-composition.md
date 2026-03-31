# Golden Ratio and Composition

Composition is the intentional arrangement of visual elements to create balance, movement, and meaning. The golden ratio is mathematics made visible in natural forms — and it provides a principled foundation for layout decisions that feel intrinsically "right" without the designer being able to articulate why.

---

## The Golden Ratio (φ = 1.618...)

The golden ratio is the proportion where the ratio of the whole to the larger part equals the ratio of the larger part to the smaller part:

```
a/b = (a+b)/a = φ ≈ 1.618
```

**Deriving proportions from φ:**
- If content area = 1 unit, sidebar = 1/1.618 = 0.618 units
- If a card = 300px wide, golden height = 300 × 0.618 = 185px (or 300 × 1.618 = 485px for landscape)
- If heading = 32px, subheading = 32 / 1.618 ≈ 20px
- If container = 1200px, content = 1200 / 1.618 ≈ 741px (with 459px margins total)

**The Fibonacci sequence approximates φ:**
3, 5, 8, 13, 21, 34, 55, 89, 144...

Each number / previous ≈ 1.618. Use Fibonacci numbers directly as spacing tokens:

```css
:root {
  /* Fibonacci-based spacing scale */
  --space-1:  3px;
  --space-2:  5px;
  --space-3:  8px;
  --space-4:  13px;
  --space-5:  21px;
  --space-6:  34px;
  --space-7:  55px;
  --space-8:  89px;
  --space-9:  144px;
}
```

This produces spacing relationships that feel proportionally harmonious because the ratios mirror natural growth patterns.

---

## Golden Ratio in Typography

Apply φ to create a type scale where every level is proportionally related:

```css
:root {
  --type-base: 16px;       /* base */
  --type-lg:   25.8px;     /* 16 × φ */
  --type-xl:   41.7px;     /* 16 × φ² */
  --type-sm:   9.9px;      /* 16 / φ */
  --type-xs:   6.1px;      /* 16 / φ² */
}

/* Practical implementation with clamp for responsiveness */
:root {
  --text-sm:   clamp(0.75rem, 1.5vw, 0.875rem);
  --text-base: clamp(1rem, 2vw, 1rem);
  --text-lg:   clamp(1.125rem, 2.5vw, 1.25rem);   /* base × ~1.25 (minor third) */
  --text-2xl:  clamp(1.5rem, 3vw, 2rem);           /* base × ~1.618 (golden) */
  --text-4xl:  clamp(2rem, 5vw, 3rem);             /* base × φ² */
  --text-6xl:  clamp(3rem, 8vw, 5rem);             /* base × φ³ */
}
```

**Line height by golden ratio:**
- Body text line-height: 1.618 (the golden ratio itself — widely recognized as the optimal line height for readability)
- Headings: 1.2–1.3 (tighter — large text needs less leading)
- UI labels: 1.4 (moderate)

```css
.body-text {
  font-size: 1rem;
  line-height: 1.618;  /* golden ratio line height */
}

.heading {
  font-size: 2.5rem;
  line-height: 1.2;    /* tighter for display text */
}
```

---

## Rule of Thirds

Divide any composition into a 3×3 grid. Place key elements along the grid lines or at their intersections (called "power points" or "crash points"). The four intersections are the strongest positions.

```
┌─────────┬─────────┬─────────┐
│         │         │         │
│         ●         ●         │
│                             │
├─────────┼─────────┼─────────┤
│                             │
│         ●         ●         │
│                             │
├─────────┼─────────┼─────────┤
│                             │
│                             │
└─────────┴─────────┴─────────┘
         ● = power points
```

**CSS implementation:**

```css
/* Rule-of-thirds hero layout */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  min-height: 100vh;
}

/* Place headline at top-left power point */
.hero-headline {
  grid-column: 1 / 3;      /* spans first 2/3 */
  grid-row: 1 / 2;
  align-self: end;          /* sits ON the first horizontal line */
  padding: 0 0 8px 40px;
}

/* CTA at right-side power points */
.hero-cta {
  grid-column: 2 / 4;
  grid-row: 2;
  align-self: center;       /* sits ON the middle horizontal line */
  justify-self: end;
  padding-right: 40px;
}

/* Image filling the remaining grid area */
.hero-image {
  grid-column: 2 / 4;
  grid-row: 1 / 3;
  object-fit: cover;
}
```

**Dashboard widget placement:**
```css
/* Rule of thirds for dashboard focal areas */
.dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, auto);
  gap: 24px;
}

/* Primary metric: top-left power point area */
.metric-primary {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
}

/* Large chart: spans to occupy center of gravity */
.chart-main {
  grid-column: 1 / 3;
  grid-row: 2 / 4;
}
```

---

## Divine Proportion in Layout

The golden ratio appears naturally in several layout paradigms:

**Golden ratio two-column layout:**
```css
/* 61.8% / 38.2% split (φ proportions) */
.golden-layout {
  display: grid;
  grid-template-columns: 61.8fr 38.2fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Reversed: sidebar left, content right */
.golden-layout--reversed {
  grid-template-columns: 38.2fr 61.8fr;
}

/* Responsive: collapse at mobile */
@media (max-width: 768px) {
  .golden-layout,
  .golden-layout--reversed {
    grid-template-columns: 1fr;
  }
}
```

**Golden rectangle cards:**
```css
/* Card with golden ratio height */
.card-golden {
  width: 300px;
  height: 185px;  /* 300 / φ ≈ 185px — golden landscape */
  border-radius: 8px;
  overflow: hidden;
}

.card-golden-portrait {
  width: 300px;
  height: 485px;  /* 300 × φ ≈ 485px — golden portrait */
}

/* Using aspect-ratio for responsiveness */
.card-golden-responsive {
  width: 100%;
  aspect-ratio: 1.618 / 1;  /* golden ratio maintained at any width */
  border-radius: 8px;
  overflow: hidden;
}
```

---

## Grid Composition Systems

### 12-Column Grid

The industry standard: 12 columns divides evenly into halves, thirds, quarters, and sixths.

```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;  /* gutter */
}

/* Common grid placements */
.col-full    { grid-column: span 12; }
.col-half    { grid-column: span 6; }
.col-third   { grid-column: span 4; }
.col-quarter { grid-column: span 3; }
.col-two-thirds { grid-column: span 8; }
.col-golden-main { grid-column: span 7; }  /* ~58% ≈ golden */
.col-golden-side { grid-column: span 5; }  /* ~42% */

/* Responsive adjustments */
@media (max-width: 1024px) {
  .col-third   { grid-column: span 6; }
  .col-quarter { grid-column: span 6; }
}

@media (max-width: 640px) {
  .col-half,
  .col-third,
  .col-quarter,
  .col-two-thirds,
  .col-golden-main,
  .col-golden-side {
    grid-column: span 12;
  }
}
```

### 8-Point Grid System

All spacing, sizing, and positioning values are multiples of 8px. Produces pixel-perfect alignment across different screen densities.

```css
:root {
  /* 8-point grid tokens */
  --grid-1:  8px;
  --grid-2:  16px;
  --grid-3:  24px;
  --grid-4:  32px;
  --grid-5:  40px;
  --grid-6:  48px;
  --grid-8:  64px;
  --grid-10: 80px;
  --grid-12: 96px;
  --grid-16: 128px;
  --grid-20: 160px;
  --grid-24: 192px;

  /* 4-point for fine adjustments */
  --grid-half: 4px;
}

/* Example component using 8-point grid */
.card {
  padding: var(--grid-3);          /* 24px */
  border-radius: var(--grid-1);    /* 8px */
  margin-bottom: var(--grid-4);    /* 32px */
}

.card-title {
  margin-bottom: var(--grid-1);    /* 8px */
  font-size: var(--grid-3);        /* 24px = 3 units */
}

.card-body {
  margin-bottom: var(--grid-2);    /* 16px */
}

.card-actions {
  gap: var(--grid-1);              /* 8px between buttons */
  padding-top: var(--grid-2);      /* 16px above actions */
}
```

---

## Visual Weight and Balance

Visual weight is the perceived heaviness of an element. Larger, darker, more complex, and more saturated elements carry more weight. Balance means the visual weight is distributed so the composition feels stable.

**Types of balance:**

### Symmetrical (Formal) Balance
Equal weight on both sides of a central axis. Conveys stability, authority, trust.
```css
/* Centered content: bilateral symmetry */
.centered-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}
```

### Asymmetrical (Informal) Balance
Unequal elements that balance through the see-saw principle: a heavy element close to center can be balanced by a lighter element far from center.

```css
/* Asymmetric layout with visual balance */
.feature-row {
  display: grid;
  grid-template-columns: 2fr 1fr;  /* large image vs small text block */
  gap: 48px;
  align-items: center;
}

/* The smaller text block is balanced by its whitespace,
   bold typography, and saturated CTA button */
.feature-text {
  padding: 40px;  /* extra space adds visual weight */
}

.feature-text h2 {
  font-size: 2.5rem;
  font-weight: 800;  /* heavy weight compensates for smaller area */
}
```

### Radial Balance
Elements radiate from a central point. Used in circular navigation, dials, and clock-like interfaces.

```css
/* Radial balance: items around a center */
.radial-nav {
  position: relative;
  width: 200px;
  height: 200px;
}

.radial-nav-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #2563eb;
}

/* Items placed at equal angular intervals */
.radial-item {
  position: absolute;
  top: 50%;
  left: 50%;
  /* Each item offset by (index × 60deg) rotation, then translated outward */
  /* CSS custom property --angle set per item */
  transform:
    translate(-50%, -50%)
    rotate(var(--angle))
    translateY(-80px)
    rotate(calc(-1 * var(--angle)));
}
```

---

## Asymmetric vs Symmetric Layouts

**When to use symmetry:**
- Dialog boxes and modals (stability, focus)
- Empty states (centered illustration, centered message)
- Marketing hero sections (gravitas)
- Feature showcases (equal comparison)
- Error pages (calming, stable)

**When to use asymmetry:**
- Content-heavy pages (hierarchy, flow)
- Dashboard layouts (prioritized information)
- Feature pages with text + image (visual dynamism)
- Landing pages with scroll (movement and progression)
- Cards in a grid (each asymmetric internally = rich, not chaotic)

```css
/* Symmetric: dialog */
.dialog {
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  padding: 48px 40px;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* Asymmetric: feature section */
.feature-section {
  display: grid;
  grid-template-columns: 5fr 7fr;  /* ~42%/58% — golden-ish */
  gap: 80px;
  align-items: center;
}

/* Alternate direction for visual rhythm */
.feature-section:nth-child(even) {
  direction: rtl;
}

.feature-section:nth-child(even) > * {
  direction: ltr;
}
```

---

## Practical CSS Grid Composition Examples

### Holy Grail Layout with Proportional Columns

```css
.app-layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "nav    main   aside"
    "footer footer footer";
  grid-template-columns: 200px 1fr 300px;  /* sidebar/content/aside */
  grid-template-rows: 64px 1fr auto;
  min-height: 100vh;
}

.app-header { grid-area: header; }
.app-nav    { grid-area: nav; }
.app-main   { grid-area: main; }
.app-aside  { grid-area: aside; }
.app-footer { grid-area: footer; }
```

### Magazine-Style Composition

```css
.magazine-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(6, 120px);
  gap: 16px;
}

/* Large feature story — occupies golden-ratio area */
.story-hero {
  grid-column: 1 / 8;
  grid-row: 1 / 4;
}

/* Secondary stories — rule of thirds positioning */
.story-secondary-1 {
  grid-column: 8 / 13;
  grid-row: 1 / 3;
}

.story-secondary-2 {
  grid-column: 8 / 13;
  grid-row: 3 / 5;
}

/* Tertiary stories below fold */
.story-tertiary {
  grid-column: span 4;
  grid-row: 4 / 6;
}
```

### Component Spacing by Golden Ratio

```css
/* When spacing within and between components,
   use φ as the ratio between container padding
   and inter-element gap */

.component {
  --internal-gap: 16px;
  --section-gap: calc(16px * 1.618);  /* ≈ 26px */
  --page-gap: calc(16px * 2.618);     /* ≈ 42px — φ² */

  padding: var(--section-gap);
  gap: var(--internal-gap);
}
```

---

## Composition Audit Questions

Before finalizing any layout:

1. **Rule of thirds:** Are the most important elements at or near the power points?
2. **Visual balance:** Does the design feel stable from a distance (squint test)?
3. **Golden ratio:** Are your most prominent ratios (2-column, hero height, type scale) near φ = 1.618?
4. **Hierarchy:** Is there one clear dominant element, with progressively recessive elements?
5. **Movement:** Does the eye naturally travel from most to least important?
6. **Asymmetry intention:** If asymmetric, is the imbalance purposeful and compensated?
7. **Consistency:** Do spacing values follow a grid system (8-point or Fibonacci)?
