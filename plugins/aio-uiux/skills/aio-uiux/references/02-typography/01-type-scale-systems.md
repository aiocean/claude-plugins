# Type Scale Systems

## What Is a Type Scale?

A type scale is a set of font sizes derived from a single base size and a ratio. Instead of picking arbitrary sizes (16px, 18px, 24px, 32px, 48px), you multiply the base size by the ratio repeatedly. The result is a harmonious progression where every size relates mathematically to every other.

The base is almost always 16px (1rem) — the browser default. The ratio determines how dramatically sizes grow.

---

## The Standard Ratios

### Minor Second — 1.067
Extremely subtle. Each step is barely larger than the previous. Works for dense, data-heavy UIs where you need hierarchy without visual drama. Rarely used on its own for headings — you end up needing many steps to get meaningful differentiation.

```
Step -2:  14px  (0.878rem)
Step -1:  15px  (0.936rem)
Step  0:  16px  (1rem)      ← base
Step  1:  17px  (1.067rem)
Step  2:  18px  (1.138rem)
Step  3:  19px  (1.215rem)
Step  4:  21px  (1.296rem)
Step  5:  22px  (1.383rem)
Step  6:  24px  (1.476rem)
```

### Major Second — 1.125
Gentle, readable progression. Popular for body-text-heavy interfaces like documentation or blog platforms. Differences are clear without being aggressive. Works well for multilingual UIs where long translations need to fit.

```
Step -2:  13px  (0.790rem)
Step -1:  14px  (0.889rem)
Step  0:  16px  (1rem)
Step  1:  18px  (1.125rem)
Step  2:  20px  (1.266rem)
Step  3:  23px  (1.424rem)
Step  4:  26px  (1.602rem)
Step  5:  29px  (1.802rem)
Step  6:  32px  (2.027rem)
```

### Minor Third — 1.2
The workhorse ratio. Clear hierarchy, not too loud. Excellent for marketing sites, product UIs, dashboards. The jump from body to h3 to h2 to h1 feels natural and readable across viewports.

```
Step -2:  11px  (0.694rem)
Step -1:  13px  (0.833rem)
Step  0:  16px  (1rem)
Step  1:  19px  (1.2rem)
Step  2:  23px  (1.44rem)
Step  3:  28px  (1.728rem)
Step  4:  33px  (2.074rem)
Step  5:  40px  (2.488rem)
Step  6:  48px  (2.986rem)
```

### Major Third — 1.25
Confident, punchy hierarchy. Good for landing pages, editorial layouts, portfolios. The scale moves fast enough that h1 commands real presence. Can feel too dramatic for dense apps.

```
Step -2:  10px  (0.640rem)
Step -1:  13px  (0.800rem)
Step  0:  16px  (1rem)
Step  1:  20px  (1.25rem)
Step  2:  25px  (1.563rem)
Step  3:  31px  (1.953rem)
Step  4:  39px  (2.441rem)
Step  5:  49px  (3.052rem)
Step  6:  61px  (3.815rem)
```

### Perfect Fourth — 1.333
Strong, dramatic jumps. Classic editorial and portfolio scale. h1 becomes truly large (51px+ at step 5). Works beautifully for single-column long-form reading or hero-driven marketing pages. Too aggressive for apps with many heading levels.

```
Step -2:   9px  (0.563rem)
Step -1:  12px  (0.750rem)
Step  0:  16px  (1rem)
Step  1:  21px  (1.333rem)
Step  2:  28px  (1.777rem)
Step  3:  38px  (2.369rem)
Step  4:  51px  (3.157rem)
Step  5:  68px  (4.209rem)
Step  6:  90px  (5.610rem)
```

### Augmented Fourth — 1.414 (√2)
The tritone. Geometrically elegant — two steps up equals double the size. Strong visual contrast. Best for display typography and hero sections where you have only 2–3 heading levels. Almost too much for full-stack UIs.

```
Step -2:   8px  (0.500rem)
Step -1:  11px  (0.707rem)
Step  0:  16px  (1rem)
Step  1:  23px  (1.414rem)
Step  2:  32px  (2.000rem)
Step  3:  45px  (2.828rem)
Step  4:  64px  (4.000rem)
Step  5:  91px  (5.657rem)
```

### Perfect Fifth — 1.5
Extremely dramatic. Used almost exclusively for display/hero use cases where you want massive scale differences. Body text at 16px, h1 at ~81px (step 4). Not practical for UIs with more than 2-3 heading levels.

```
Step  0:  16px  (1rem)
Step  1:  24px  (1.5rem)
Step  2:  36px  (2.25rem)
Step  3:  54px  (3.375rem)
Step  4:  81px  (5.063rem)
```

### Golden Ratio — 1.618 (φ)
The most extreme standard ratio. The jump from step 0 to step 1 is already 10px. By step 3 you're at 67px. Practically only useful for 2-level hierarchies (body + single heading). Despite the mystique, it rarely produces better results than simpler ratios for real UIs.

```
Step  0:  16px  (1rem)
Step  1:  26px  (1.618rem)
Step  2:  42px  (2.618rem)
Step  3:  67px  (4.236rem)
Step  4: 108px  (6.854rem)
```

---

## How to Choose a Ratio

Ask three questions:

**1. How many heading levels do you need?**
- 2 levels (body + title): any ratio works, go dramatic
- 3–4 levels: Major Third (1.25) or Perfect Fourth (1.333)
- 5–6 levels: Minor Third (1.2) or Major Second (1.125)
- 6+ levels or dense data: Major Second (1.125) or Minor Second (1.067)

**2. What is the tone of the interface?**
- Corporate, formal, dense: smaller ratios (1.125–1.2)
- Balanced product UI: 1.2–1.25
- Marketing, editorial, portfolio: 1.25–1.333
- Display, brand-heavy: 1.414+

**3. What viewports matter?**
Larger ratios are harder to manage on small screens — a 68px h1 at Perfect Fourth needs aggressive clamping for mobile. Smaller ratios are more viewport-forgiving.

**Practical recommendation**: Start with Minor Third (1.2) for apps, Perfect Fourth (1.333) for marketing. Adjust from there.

---

## Implementing with CSS Custom Properties

### Static Scale (rem values)

```css
:root {
  /* Minor Third scale — ratio 1.2 */
  --text-xs:   0.694rem;  /* ~11px */
  --text-sm:   0.833rem;  /* ~13px */
  --text-base: 1rem;      /* 16px  */
  --text-lg:   1.2rem;    /* ~19px */
  --text-xl:   1.44rem;   /* ~23px */
  --text-2xl:  1.728rem;  /* ~28px */
  --text-3xl:  2.074rem;  /* ~33px */
  --text-4xl:  2.488rem;  /* ~40px */
  --text-5xl:  2.986rem;  /* ~48px */
}

h1 { font-size: var(--text-4xl); }
h2 { font-size: var(--text-3xl); }
h3 { font-size: var(--text-2xl); }
h4 { font-size: var(--text-xl); }
h5 { font-size: var(--text-lg); }
p  { font-size: var(--text-base); }
small { font-size: var(--text-sm); }
```

### Fluid Scale with clamp()

The formula for a fluid size that scales linearly between two viewport widths:

```
clamp(min, preferred, max)

preferred = min + (max - min) * (100vw - min-viewport) / (max-viewport - min-viewport)
```

In practice, use the `vi` unit (inline axis) for better container awareness, or stick with `vw`.

```css
:root {
  /* Fluid Minor Third scale */
  /* Scales from 320px viewport (min) to 1280px viewport (max) */

  --text-sm:   clamp(0.75rem,  0.716rem + 0.170vw, 0.875rem);
  --text-base: clamp(1rem,     0.952rem + 0.238vw, 1.125rem);
  --text-lg:   clamp(1.2rem,   1.134rem + 0.331vw, 1.375rem);
  --text-xl:   clamp(1.44rem,  1.348rem + 0.460vw, 1.75rem);
  --text-2xl:  clamp(1.728rem, 1.592rem + 0.680vw, 2.25rem);
  --text-3xl:  clamp(2.074rem, 1.871rem + 1.013vw, 2.875rem);
  --text-4xl:  clamp(2.488rem, 2.181rem + 1.538vw, 3.75rem);
  --text-5xl:  clamp(2.986rem, 2.523rem + 2.315vw, 4.75rem);
}
```

### CSS Fluid Type Calculator Formula

To compute the `preferred` value in clamp manually:

```
Given:
  minSize  = minimum font size in rem
  maxSize  = maximum font size in rem
  minVW    = minimum viewport in px (e.g., 320)
  maxVW    = maximum viewport in px (e.g., 1280)

slope     = (maxSize - minSize) / ((maxVW - minVW) / 16)
intercept = minSize - slope * (minVW / 16)

preferred = slope * 100vw + intercept * 1rem

Result:
  clamp(minSize rem, slope*100vw + intercept*1rem, maxSize rem)
```

Example for h1 scaling from 2.488rem at 320px to 3.75rem at 1280px:

```
slope     = (3.75 - 2.488) / ((1280 - 320) / 16)
          = 1.262 / 60
          = 0.02103

intercept = 2.488 - 0.02103 * (320 / 16)
          = 2.488 - 0.02103 * 20
          = 2.488 - 0.421
          = 2.067

preferred = 2.103vw + 2.067rem

Result: clamp(2.488rem, 2.103vw + 2.067rem, 3.75rem)
```

---

## Complete Type System Example

A production-ready system using Minor Third ratio with fluid scaling:

```css
/* =============================================
   TYPE SCALE — Minor Third (1.2) + Fluid
   Min viewport: 375px | Max viewport: 1440px
   ============================================= */

:root {
  /* Font families */
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
               'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-serif: 'Lora', Georgia, 'Times New Roman', serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code',
               Consolas, 'Courier New', monospace;

  /* Fluid type scale */
  --text-xs:   clamp(0.694rem, 0.673rem + 0.111vw, 0.75rem);
  --text-sm:   clamp(0.833rem, 0.808rem + 0.133vw, 0.875rem);
  --text-base: clamp(1rem,     0.957rem + 0.227vw, 1.125rem);
  --text-lg:   clamp(1.2rem,   1.142rem + 0.307vw, 1.375rem);
  --text-xl:   clamp(1.44rem,  1.361rem + 0.416vw, 1.75rem);
  --text-2xl:  clamp(1.728rem, 1.621rem + 0.569vw, 2.188rem);
  --text-3xl:  clamp(2.074rem, 1.937rem + 0.724vw, 2.75rem);
  --text-4xl:  clamp(2.488rem, 2.303rem + 0.978vw, 3.438rem);
  --text-5xl:  clamp(2.986rem, 2.735rem + 1.329vw, 4.25rem);
  --text-6xl:  clamp(3.583rem, 3.262rem + 1.698vw, 5.25rem);

  /* Line heights */
  --leading-none:   1;
  --leading-tight:  1.25;
  --leading-snug:   1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose:  2;

  /* Letter spacing */
  --tracking-tighter: -0.05em;
  --tracking-tight:   -0.025em;
  --tracking-normal:   0em;
  --tracking-wide:     0.025em;
  --tracking-wider:    0.05em;
  --tracking-widest:   0.1em;

  /* Font weights */
  --weight-light:    300;
  --weight-normal:   400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;
  --weight-extrabold: 800;
}

/* ---- Element defaults ---- */

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  font-weight: var(--weight-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1 {
  font-size: var(--text-5xl);
  line-height: var(--leading-tight);
  font-weight: var(--weight-extrabold);
  letter-spacing: var(--tracking-tight);
}

h2 {
  font-size: var(--text-4xl);
  line-height: var(--leading-tight);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
}

h3 {
  font-size: var(--text-3xl);
  line-height: var(--leading-snug);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
}

h4 {
  font-size: var(--text-2xl);
  line-height: var(--leading-snug);
  font-weight: var(--weight-semibold);
}

h5 {
  font-size: var(--text-xl);
  line-height: var(--leading-normal);
  font-weight: var(--weight-semibold);
}

h6 {
  font-size: var(--text-lg);
  line-height: var(--leading-normal);
  font-weight: var(--weight-semibold);
}

p {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
}

small, .text-sm {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.caption {
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  letter-spacing: var(--tracking-wide);
}

code, pre, .mono {
  font-family: var(--font-mono);
  font-size: calc(var(--text-sm) * 0.95);
}

/* ---- Utility classes ---- */

.display { font-size: var(--text-6xl); line-height: var(--leading-none); }
.overline {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}
.lead {
  font-size: var(--text-xl);
  font-weight: var(--weight-light);
  line-height: var(--leading-relaxed);
}
```

---

## Modular Scale Calculation Table

For quick reference — all ratios applied to 16px base, 6 steps up:

| Step | 1.067 | 1.125 | 1.200 | 1.250 | 1.333 | 1.414 | 1.500 | 1.618 |
|------|-------|-------|-------|-------|-------|-------|-------|-------|
| 0    | 16px  | 16px  | 16px  | 16px  | 16px  | 16px  | 16px  | 16px  |
| 1    | 17px  | 18px  | 19px  | 20px  | 21px  | 23px  | 24px  | 26px  |
| 2    | 18px  | 20px  | 23px  | 25px  | 28px  | 32px  | 36px  | 42px  |
| 3    | 19px  | 23px  | 28px  | 31px  | 38px  | 45px  | 54px  | 67px  |
| 4    | 21px  | 26px  | 33px  | 39px  | 51px  | 64px  | 81px  | 108px |
| 5    | 22px  | 29px  | 40px  | 49px  | 68px  | 91px  | 122px | 175px |
| 6    | 24px  | 32px  | 48px  | 61px  | 90px  | 128px | 182px | 283px |

---

## Tools and References

- **modularscale.com** — interactive ratio explorer
- **utopia.fyi** — fluid type + space generator, outputs ready-to-use CSS clamp values
- **type-scale.com** — visual preview of scales
- **fluid-typography calculator**: https://royalfig.github.io/fluid-typography-calculator/
