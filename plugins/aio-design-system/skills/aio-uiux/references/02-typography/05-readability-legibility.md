# Readability and Legibility

## The Distinction

**Legibility** is about individual character recognition — can you identify each letter? It depends on typeface design, size, and contrast.

**Readability** is about sustained reading — can you read a full paragraph without fatigue? It depends on line length, line-height, spacing, and rendering.

A font can be legible (clear individual letters) but unreadable (poor line length or spacing makes sustained reading exhausting). Both must be addressed.

---

## Optimal Line Length

The most impactful readability variable after font size. Long lines force the eye to travel far across the page and lose its place returning. Short lines create choppy reading rhythm and excessive hyphenation.

### The Research

- **Ideal**: 45–75 characters per line for body text
- **Sweet spot**: ~66 characters (Robert Bringhurst, "Elements of Typographic Style")
- **Comfortable range**: 50–85 characters
- **Never exceed**: 100+ characters without increasing line-height significantly
- **Minimum**: Below 35 characters feels too narrow; the reader's eye jumps lines too frequently

### Measuring in CSS

The `ch` unit equals the width of the `0` glyph in the current font — a good proxy for average character width.

```css
/* Constrain body text to optimal line length */
article p,
.prose p {
  max-width: 65ch;
}

/* Wider for larger type (relative character width changes) */
h1, h2 {
  max-width: 30ch; /* fewer chars needed at large sizes */
}

/* Narrow column (sidebar, callout) */
.callout {
  max-width: 45ch;
}

/* Wide layout with increased line-height compensation */
.wide-prose {
  max-width: 90ch;
  line-height: 1.75; /* compensate for long lines */
}
```

### Responsive Line Length

On mobile, the viewport enforces narrow columns naturally. On desktop, constrain with max-width. The danger zone is medium viewports (768px–1024px) where the container can be wide but not wide enough to warrant multi-column.

```css
.article-body {
  /* Content flows to container width on mobile */
  width: 100%;

  /* Constrain on larger screens */
  max-width: 70ch;
  margin-inline: auto;
}

@media (min-width: 1200px) {
  .article-body {
    max-width: 75ch; /* slightly wider at large type sizes */
  }
}
```

---

## Line-Height Guidelines

### Body Text

```css
/* Minimum acceptable */
p { line-height: 1.4; }

/* Recommended for most body text */
p { line-height: 1.5; }

/* Comfortable for long-form reading */
.article p { line-height: 1.6; }

/* Wide lines need more leading */
.wide-column p { line-height: 1.75; }

/* Small text needs relatively more leading */
small, .caption { line-height: 1.5; } /* same ratio, larger absolute gap */
```

### Headings

```css
h1 { line-height: 1.1; }  /* 60px+ — very tight */
h2 { line-height: 1.2; }  /* 40–60px */
h3 { line-height: 1.25; } /* 28–40px */
h4 { line-height: 1.3; }  /* 22–28px */
h5 { line-height: 1.4; }  /* 18–22px */
h6 { line-height: 1.5; }  /* 16–18px — same as body */
```

### The Line-Height / Line-Length Relationship

As line length increases, line-height should increase proportionally:

| Line Length    | Line-Height |
|----------------|-------------|
| < 45ch         | 1.4         |
| 45–65ch        | 1.5         |
| 65–80ch        | 1.6         |
| 80–100ch       | 1.7–1.75    |
| > 100ch        | 1.8+        |

---

## Letter-Spacing Adjustments

### Display and Heading Type

Large type (24px+) has too much default spacing. Tighten it:

```css
h1 { letter-spacing: -0.03em; }   /* very large display */
h2 { letter-spacing: -0.02em; }
h3 { letter-spacing: -0.015em; }
h4 { letter-spacing: -0.01em; }
```

### Body Text

Body text is designed for its default spacing. Do not adjust unless fixing a specific rendering issue.

```css
p { letter-spacing: 0; }    /* never add to body text */
```

### Small Text and Caps

Small text and all-caps benefit from increased spacing:

```css
small, .caption { letter-spacing: 0.01em; }

.all-caps,
.overline {
  text-transform: uppercase;
  letter-spacing: 0.08em; /* critical — uppercase without tracking is cramped */
}

/* Button labels */
.btn {
  letter-spacing: 0.03em;
}
```

### Word Spacing

Rarely needed, but useful for very tight or very open typefaces:

```css
/* Tight typeface at small size */
.tight-font-body { word-spacing: 0.05em; }

/* Loosened for dyslexia accessibility */
.dyslexia-friendly {
  word-spacing: 0.16em;
  letter-spacing: 0.12em;
}
```

---

## Paragraph Spacing

The spacing between paragraphs is as important as the spacing within them.

### Options

**1. Margin-based (most common):**
```css
p + p {
  margin-top: 1em; /* equals the current font-size */
}
/* OR */
p {
  margin-bottom: 1em;
}
```

**2. Text indent (no margin — classic book style):**
```css
p { margin-bottom: 0; }
p + p { text-indent: 1.5em; }
```

**3. Hybrid (indent + small margin):**
```css
p { margin-bottom: 0.5em; }
p + p { text-indent: 1em; }
```

### Spacing Ratios

Paragraph spacing should be larger than line spacing but smaller than section spacing:

```css
:root {
  --line-height: 1.6;         /* 25.6px at 16px base */
  --paragraph-gap: 1em;       /* 16px — smaller than one line of leading */
  --section-gap: 3em;         /* clear visual break */
}

p { line-height: var(--line-height); }
p + p { margin-top: var(--paragraph-gap); }
section + section { margin-top: var(--section-gap); }
```

---

## Text Rendering Optimization

### font-smoothing

Controls antialiasing on macOS and iOS:

```css
/* Recommended for body text on light backgrounds */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**What it does**: Switches from subpixel rendering (which can look heavier/blurry on Retina) to grayscale antialiasing (thinner, crisper on Retina displays).

**When NOT to use it**: On dark backgrounds, antialiased text can become too thin. Test both modes.

```css
/* Dark backgrounds — revert to auto for bolder rendering */
.dark-section {
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
}
```

### text-rendering

```css
body {
  text-rendering: optimizeLegibility;
}
```

Enables kerning and ligatures. Minor performance cost at large font counts — avoid on paragraphs with thousands of words rendered simultaneously (large data tables, infinite scrolls).

```css
/* For performance-sensitive contexts */
.data-table td {
  text-rendering: optimizeSpeed;
}
```

### font-kerning

```css
/* Enable kerning (usually on by default in modern browsers) */
body {
  font-kerning: normal;
}

/* Disable for performance in dense data contexts */
.matrix-display {
  font-kerning: none;
}
```

### text-size-adjust

Prevents mobile browsers from inflating font sizes when switching to landscape:

```css
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
```

---

## Dark Mode Typography Adjustments

Dark mode is not a color inversion. Text on dark backgrounds needs different treatment.

### The Core Problem

White text on black has more perceived contrast than black text on white at the same measured contrast ratio. Thin strokes disappear; the overall weight feels heavier then thinner depending on background luminance. Subpixel rendering does not work on dark backgrounds.

### Recommendations

```css
/* Light mode — default */
:root {
  --text-primary: #111827;     /* near-black */
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;
  --bg-primary: #FFFFFF;
  --font-weight-body: 400;
  --font-smoothing: antialiased;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #F3F4F6;    /* not pure white — too harsh */
    --text-secondary: #D1D5DB;
    --text-muted: #6B7280;
    --bg-primary: #111827;      /* not pure black — too harsh */
    --font-weight-body: 300;    /* lighter weight — dark bg makes text appear heavier */
    --font-smoothing: auto;     /* subpixel off on dark */
  }
}

body {
  color: var(--text-primary);
  background-color: var(--bg-primary);
  font-weight: var(--font-weight-body);
  -webkit-font-smoothing: var(--font-smoothing);
}
```

### Dark Mode Letter-Spacing

Slightly increased letter-spacing helps legibility on dark backgrounds where halation (light bleeding into surrounding dark) can make letters appear to touch:

```css
@media (prefers-color-scheme: dark) {
  body {
    letter-spacing: 0.01em;
  }

  h1, h2, h3 {
    letter-spacing: -0.01em; /* still tighten headings, but less than light mode */
  }
}
```

### Contrast Ratios

WCAG requirements:
- **AA**: 4.5:1 for normal text, 3:1 for large text (18px+ regular or 14px+ bold)
- **AAA**: 7:1 for normal text, 4.5:1 for large text

```css
/* Good dark mode text colors with proper contrast */
.on-dark-bg {
  /* #F3F4F6 on #111827 = ~13.7:1 — exceeds AAA */
  color: #F3F4F6;
  background: #111827;
}

/* Avoid pure white on pure black — too harsh */
.too-harsh {
  color: #FFFFFF;    /* uncomfortable for sustained reading */
  background: #000000;
}

/* Better: slightly off-white on dark gray */
.comfortable-dark {
  color: #E5E7EB;    /* ~12.6:1 on #1F2937 */
  background: #1F2937;
}
```

---

## Hyphenation

```css
/* Enable automatic hyphenation */
.prose {
  hyphens: auto;
  -webkit-hyphens: auto;
  hyphenate-limit-chars: 6 3 3; /* min word, before break, after break */
}

/* Prevent hyphenation in headings */
h1, h2, h3, h4, h5, h6 {
  hyphens: none;
  -webkit-hyphens: none;
}

/* Prevent hyphenation on short lines where it looks bad */
@media (max-width: 480px) {
  .prose { hyphens: none; }
}
```

---

## Complete Readability CSS

```css
/* =============================================
   READABILITY-OPTIMIZED PROSE STYLES
   ============================================= */

.prose {
  /* Measure */
  max-width: 70ch;

  /* Type */
  font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  line-height: 1.65;
  font-weight: 400;

  /* Rendering */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;

  /* Hyphenation */
  hyphens: auto;
  -webkit-hyphens: auto;
}

.prose p {
  margin-bottom: 1.25em;
  orphans: 3;
  widows: 3;
}

.prose h2 {
  font-size: 1.75em;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-top: 2.5em;
  margin-bottom: 0.75em;
}

.prose h3 {
  font-size: 1.375em;
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin-top: 2em;
  margin-bottom: 0.5em;
}

.prose a {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px; /* space between baseline and underline */
}

.prose blockquote {
  font-size: 1.125em;
  line-height: 1.7;
  font-style: italic;
  padding-left: 1.5em;
  border-left: 3px solid currentColor;
  margin: 2em 0;
  opacity: 0.85;
}

.prose code {
  font-size: 0.875em;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  background: rgba(0, 0, 0, 0.06);
  padding: 0.15em 0.35em;
  border-radius: 3px;
}

@media (prefers-color-scheme: dark) {
  .prose {
    -webkit-font-smoothing: auto;
    font-weight: 300;
    letter-spacing: 0.01em;
  }

  .prose code {
    background: rgba(255, 255, 255, 0.08);
  }
}
```
