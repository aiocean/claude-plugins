# OpenType Features and Variable Fonts

## OpenType Features

OpenType is the font format underlying virtually every modern web font. Beyond the visible glyphs, OpenType fonts contain tables of typographic features — alternate glyph forms, ligatures, figure styles, fractions, and more. These features are off by default in browsers. You activate them with CSS.

### font-feature-settings vs. font-variant-*

Two CSS mechanisms exist:

**`font-variant-*` properties** (high-level, recommended):
```css
font-variant-ligatures: common-ligatures;
font-variant-numeric: oldstyle-nums tabular-nums;
font-variant-caps: small-caps;
```

**`font-feature-settings`** (low-level, four-character OpenType tags):
```css
font-feature-settings: "liga" 1, "onum" 1, "smcp" 1;
```

Use `font-variant-*` when available — it's more readable, more interoperable, and the browser can merge multiple rules. Use `font-feature-settings` when a feature has no `font-variant-*` equivalent (e.g., stylistic sets `ss01`–`ss20`).

**Critical gotcha**: `font-feature-settings` is not additive. Each declaration replaces the previous one entirely:

```css
/* WRONG — second rule erases the first */
h1 { font-feature-settings: "kern" 1; }
h1 { font-feature-settings: "liga" 1; } /* kern is now off */

/* CORRECT — all features in one declaration */
h1 { font-feature-settings: "kern" 1, "liga" 1; }

/* BEST — use custom property to accumulate */
:root { --font-features: "kern" 1; }
.with-ligatures { --font-features: "kern" 1, "liga" 1; }
* { font-feature-settings: var(--font-features); }
```

---

## Key OpenType Features

### Ligatures

Ligatures replace two or more characters with a single combined glyph to prevent collisions (e.g., fi, fl, ff, ffi).

```css
/* Common ligatures — fi, fl, ff, ffi, ffl */
body {
  font-variant-ligatures: common-ligatures;
  /* equivalent: font-feature-settings: "liga" 1, "calt" 1; */
}

/* Discretionary ligatures — ct, st, sp — more stylistic */
.display-heading {
  font-variant-ligatures: common-ligatures discretionary-ligatures;
  /* equivalent: font-feature-settings: "liga" 1, "calt" 1, "dlig" 1; */
}

/* Historical ligatures — rarely used, archaic forms */
.archival {
  font-variant-ligatures: historical-ligatures;
  /* equivalent: font-feature-settings: "hlig" 1; */
}

/* Disable ligatures (e.g., in code, where fi ligature breaks letter-by-letter reading) */
code {
  font-variant-ligatures: no-common-ligatures;
}
```

### Small Caps

Uppercase letterforms at x-height. Properly drawn small caps (not faked by scaling down capital letters — that makes them too thin).

```css
/* True OpenType small caps */
.small-caps {
  font-variant-caps: small-caps;
  /* equivalent: font-feature-settings: "smcp" 1; */
}

/* All-small-caps — lowercases AND digits become small caps */
.all-small-caps {
  font-variant-caps: all-small-caps;
  /* equivalent: font-feature-settings: "c2sc" 1, "smcp" 1; */
}

/* Use case: acronyms inline in body text */
abbr {
  font-variant-caps: all-small-caps;
  letter-spacing: 0.05em;
}
```

### Numeric Figures

Four distinct numeric styles controlled by two axes: proportional vs. tabular, and lining vs. oldstyle.

```
Lining figures:    Same height as capitals — 1234567890
Oldstyle figures:  Ascenders and descenders — like lowercase letters
Proportional:      Each digit has its own width — better in prose
Tabular:           Fixed-width — aligns in columns, essential for data
```

```css
/* Default: proportional lining (most fonts) */
body {
  font-variant-numeric: lining-nums proportional-nums;
}

/* Oldstyle for long-form prose — blends with lowercase */
.article-body {
  font-variant-numeric: oldstyle-nums;
  /* equivalent: font-feature-settings: "onum" 1; */
}

/* Tabular for data, prices, statistics */
.price,
.data-cell,
table td {
  font-variant-numeric: tabular-nums lining-nums;
  /* equivalent: font-feature-settings: "tnum" 1, "lnum" 1; */
}

/* Tabular oldstyle for editorial tables */
.editorial-table td {
  font-variant-numeric: tabular-nums oldstyle-nums;
}
```

### Fractions

```css
/* Proper diagonal fractions: 1/2 → rendered as ½ */
.fraction {
  font-variant-numeric: diagonal-fractions;
  /* equivalent: font-feature-settings: "frac" 1; */
}

/* Stacked (vertical) fractions */
.stacked-fraction {
  font-variant-numeric: stacked-fractions;
  /* equivalent: font-feature-settings: "afrc" 1; */
}

/* Superscript and subscript */
.superscript {
  font-variant-position: super;
  /* equivalent: font-feature-settings: "sups" 1; */
}
.subscript {
  font-variant-position: sub;
  /* equivalent: font-feature-settings: "subs" 1; */
}

/* Ordinals: 1st → 1ˢᵗ */
.ordinal {
  font-variant-numeric: ordinal;
  /* equivalent: font-feature-settings: "ordn" 1; */
}
```

### Stylistic Sets

Stylistic sets (ss01–ss20) are font-specific alternate glyph designs. Check the font's documentation for what each set contains. Common uses: alternate 'a', 'g', 'l' forms; simplified vs. complex glyphs.

```css
/* Activate stylistic set 1 (font-specific) */
.alternate-style {
  font-feature-settings: "ss01" 1;
}

/* Multiple sets */
.custom-style {
  font-feature-settings: "ss01" 1, "ss03" 1;
}

/* Inter's stylistic sets */
.inter-alt-digits {
  font-feature-settings: "cv01" 1; /* alternate 1 */
}
.inter-no-slashed-zero {
  font-feature-settings: "cv08" 0;
}

/* Fira Code ligature sets */
.fira-code {
  font-feature-settings: "calt" 1; /* contextual alternates = code ligatures */
}
```

### Kerning

```css
/* Kerning should always be on */
body {
  font-kerning: normal;
  /* equivalent: font-feature-settings: "kern" 1; */
}

/* Disable in performance-sensitive contexts */
.large-data-table {
  font-kerning: none;
}
```

### Swashes and Contextual Alternates

```css
/* Swash capitals — decorative initial caps */
.swash {
  font-variant-caps: titling-caps;
  font-feature-settings: "swsh" 1;
}

/* Contextual alternates — glyph changes based on neighbors */
.contextual {
  font-feature-settings: "calt" 1;
}
```

---

## Variable Fonts

A variable font encodes the entire design space in a single file. Instead of separate Regular, Medium, Bold, and Italic files, one file contains all of them — plus every point in between.

### Axes

Each axis has a four-character tag, a range, and a default value.

**Registered axes** (standardized across fonts):

| Tag    | Name          | Typical Range | Description                          |
|--------|---------------|---------------|--------------------------------------|
| `wght` | Weight        | 100–900       | Thin to Black                        |
| `wdth` | Width         | 50–200        | Condensed to Expanded (%)            |
| `ital` | Italic        | 0–1           | 0=upright, 1=italic                  |
| `opsz` | Optical size  | 6–144         | Text to display optimization         |
| `slnt` | Slant         | -90 to 90     | Oblique angle in degrees             |
| `GRAD` | Grade         | -200 to 150   | Weight without changing metrics      |

**Custom axes** (font-specific, uppercase tags):

| Font               | Custom Axes                       |
|--------------------|-----------------------------------|
| Fraunces           | `WONK`, `SOFT`, `opsz`           |
| Recursive          | `MONO`, `CASL`, `wght`, `slnt`, `ital` |
| Amstelvar          | `XTRA`, `XOPQ`, `YOPQ`, `YTLC`  |
| Roboto Flex        | `GRAD`, `XTRA`, `YTAS`, `YTDE`  |

### font-variation-settings

```css
/* Single axis */
.bold-text {
  font-weight: 700; /* preferred — maps to wght automatically */
}

/* Multiple axes — use font-variation-settings */
.custom-variant {
  font-variation-settings:
    'wght' 650,
    'wdth' 90,
    'opsz' 32;
}

/* Optical sizing — critical for quality */
.display-heading {
  font-size: 5rem;
  font-variation-settings: 'opsz' 80; /* tell font it's being used large */
}

.body-text {
  font-size: 1rem;
  font-variation-settings: 'opsz' 14; /* tell font it's being used small */
}
```

### The wght Axis in Practice

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.woff2') format('woff2');
  font-weight: 100 900; /* declare the supported range */
  font-display: swap;
}

/* Now any weight from 100–900 is available */
.thin    { font-weight: 100; }
.light   { font-weight: 300; }
.regular { font-weight: 400; }
.medium  { font-weight: 500; }
.semibold { font-weight: 600; }
.bold    { font-weight: 700; }
.extrabold { font-weight: 800; }
.black   { font-weight: 900; }

/* Non-standard weights — only possible with variable fonts */
.custom  { font-weight: 450; } /* between regular and medium */
.heavy   { font-weight: 850; } /* between extrabold and black */
```

### Animating Variable Fonts

Variable font axes are animatable with CSS transitions and animations:

```css
.animated-weight {
  font-weight: 300;
  transition: font-weight 0.3s ease;
}

.animated-weight:hover {
  font-weight: 800;
}

/* Optical size animation on scroll (with JS) */
.dynamic-heading {
  font-variation-settings: 'opsz' 12;
  transition: font-variation-settings 0.4s ease;
}

.dynamic-heading.in-viewport {
  font-variation-settings: 'opsz' 72;
}

/* Keyframe animation with variable font */
@keyframes weight-pulse {
  0%, 100% { font-variation-settings: 'wght' 300; }
  50%       { font-variation-settings: 'wght' 800; }
}

.pulse-text {
  animation: weight-pulse 2s ease-in-out infinite;
}
```

### Grade Axis (GRAD)

Grade adjusts visual weight without changing metrics (no reflow). Ideal for dark mode where you need lighter strokes without shifting layout:

```css
:root {
  --font-grade: 0; /* neutral */
}

@media (prefers-color-scheme: dark) {
  :root {
    --font-grade: -50; /* lighter grade for dark backgrounds */
  }
}

body {
  font-variation-settings: 'GRAD' var(--font-grade);
}
```

---

## Performance Considerations

### One Variable Font vs. Multiple Static Fonts

| Scenario                              | File Size         | Winner        |
|---------------------------------------|-------------------|---------------|
| 1 weight needed                       | VF ~50KB, Static ~15KB | Static  |
| 2 weights needed                      | VF ~50KB, Static ~30KB | Close   |
| 3+ weights needed                     | VF ~50KB, Static ~45KB+| Variable|
| 3+ weights + italic                   | VF ~80KB, Static ~90KB+| Variable|
| Fine-grained weight control needed    | Only VF can do it | Variable      |

### Subsetting Variable Fonts

Variable fonts can be subsetted by Unicode range but not by axis range. Use `pyftsubset` (fonttools) for production:

```bash
# Subset to Latin characters only
pyftsubset Inter.ttf \
  --output-file=Inter-subset.woff2 \
  --flavor=woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
```

### @font-face with Variable Font

```css
/* Full variable font declaration */
@font-face {
  font-family: 'Inter';
  src:
    url('/fonts/Inter-Variable.woff2') format('woff2 supports variations'),
    url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153,
                 U+02BB-02BC, U+02C6, U+02DA, U+02DC,
                 U+2000-206F, U+20AC, U+2122, U+FEFF, U+FFFD;
}

/* Separate italic variable font (if available) */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable-Italic.woff2') format('woff2');
  font-weight: 100 900;
  font-style: italic;
  font-display: swap;
}
```

---

## Browser Support

| Feature                          | Chrome | Firefox | Safari | Edge |
|----------------------------------|--------|---------|--------|------|
| font-feature-settings            | 16+    | 34+     | 9.1+   | 12+  |
| font-variant-ligatures           | 34+    | 34+     | 9.1+   | 79+  |
| font-variant-numeric             | 52+    | 34+     | 9.1+   | 79+  |
| Variable fonts (font-variation)  | 66+    | 62+     | 11+    | 79+  |
| font-optical-sizing              | 79+    | 62+     | 11+    | 79+  |

All features have excellent support in 2024+ targets. For IE11, variable fonts require a static font fallback.

---

## Quick Reference: Feature Tags

```css
/* Paste these as needed */
font-feature-settings:
  "kern" 1,    /* kerning */
  "liga" 1,    /* standard ligatures */
  "calt" 1,    /* contextual alternates */
  "dlig" 0,    /* discretionary ligatures — off by default */
  "smcp" 1,    /* small caps */
  "c2sc" 1,    /* capitals to small caps */
  "onum" 1,    /* oldstyle numerals */
  "lnum" 0,    /* lining numerals */
  "tnum" 1,    /* tabular numerals */
  "pnum" 0,    /* proportional numerals */
  "frac" 1,    /* fractions */
  "ordn" 1,    /* ordinals */
  "sups" 1,    /* superscript */
  "subs" 1,    /* subscript */
  "zero" 1,    /* slashed zero */
  "ss01" 1,    /* stylistic set 1 (font-specific) */
  "swsh" 1,    /* swashes */
  "hist" 0;    /* historical forms — off by default */
```
