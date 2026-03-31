# Font Pairing

## Why Pairing Matters

A single typeface cannot do everything well. Display headings benefit from personality and presence. Body text demands legibility at small sizes over long stretches. Using two typefaces — one for headings, one for body — gives you both without compromise. The challenge is making two different typefaces feel like they belong together.

Bad pairings create visual noise: the eye notices a conflict between the heading and the paragraph and loses trust in the design. Good pairings are invisible — the reader simply reads.

---

## Pairing Strategies

### 1. Serif + Sans-Serif (Classic Contrast)

The most reliable strategy. Serifs carry traditional authority and warmth; sans-serifs convey modernity and clarity. The contrast is legible and culturally established.

**Patterns:**
- Serif heading + Sans-serif body: editorial, luxury, editorial tech
- Sans-serif heading + Serif body: modern with warmth, long-form reading

**What to look for:**
- Match the x-height as closely as possible. If the serif's x-height is much lower than the sans-serif's, they'll look like different sizes even at the same point size.
- Compare stroke contrast. A high-contrast serif (thin hairlines vs. thick strokes) pairs better with a geometric or humanist sans-serif than with a grotesque.
- Mood alignment. A quirky display serif needs a neutral sans to ground it, not another expressive typeface.

### 2. Superfamily (Safe, Cohesive)

Many type designers release a superfamily: one typeface in both serif and sans-serif variants, designed to work together. The letterforms share proportions, x-height, and stroke weight — so the pairing is guaranteed.

Examples:
- **FF Meta** + **FF Meta Serif** (Erik Spiekermann)
- **Alegreya** + **Alegreya Sans** (Google Fonts)
- **IBM Plex Serif** + **IBM Plex Sans**
- **Merriweather** + **Merriweather Sans**
- **Source Serif** + **Source Sans**
- **PT Serif** + **PT Sans**

When in doubt and no design system exists yet, start here. You get contrast with zero risk.

### 3. Contrast-Based (Two Sans or Two Serifs)

Pairing within the same classification requires contrast elsewhere:
- **Weight contrast**: One light, one bold
- **Width contrast**: One condensed, one regular
- **Historical contrast**: One geometric sans + one humanist sans
- **Scale contrast**: One display (for huge headings only) + one text-optimized

Two typefaces that are too similar create "near miss" tension — the reader can tell they're different but can't tell why. Avoid pairing typefaces that feel like they could be different weights of the same family unless that's intentional.

---

## Evaluating a Pair

### X-Height Matching

X-height is the height of a lowercase 'x' relative to the cap height. High x-heights read larger and feel more modern. If your heading font has a noticeably lower x-height than your body font, paragraphs will look big and headings will look small at the same size.

Test: Set both typefaces at 16px in your browser. The lowercase letters should appear roughly the same height. If they don't, you'll need to compensate with font-size adjustments.

### Stroke Width

Compare the stroke thickness in similar letters (the vertical stroke of 'n', 'h', 'u'). If one font is significantly heavier than the other at the same weight, they'll clash. You may need to use a lighter weight of one or a heavier weight of the other.

### Aperture and Open/Closed Counters

Look at 'c', 'e', 'a', 's'. Geometric typefaces have closed, circular counters. Humanist typefaces have open apertures. Mixing extremes can work (contrast) or clash (incoherence). Neutral grotesques are flexible enough to pair with either.

### Personality / Mood Alignment

Both fonts should fit the same emotional register. A playful, quirky serif heading paired with an ultra-corporate grotesque body creates cognitive dissonance. List the adjectives you'd use to describe each font. If they don't overlap or complement, reconsider.

---

## Classic Proven Pairings

### Editorial / Long-Form Reading

```
Playfair Display (heading) + Source Sans 3 (body)
```
Playfair's high contrast and elegant serifs contrast clearly with Source Sans's neutral utility. Works for magazine-style articles, documentation, personal blogs.

```
Lora (heading) + Lato (body)
```
Lora is a contemporary serif with moderate contrast and calligraphic influence. Lato is warm and humanist. Both have a friendly tone — good for lifestyle content.

### Modern / Tech Product

```
Inter (heading) + Inter (body)
```
The superfamily-of-one approach. Inter's large x-height, wide apertures, and optical sizing make it legible at all sizes. Differentiate heading vs. body with weight and size, not family.

```
Sora (heading) + Inter (body)
```
Sora's geometric, slightly quirky construction gives headings character while Inter handles body text reliably.

### Brand / Marketing

```
Fraunces (heading) + DM Sans (body)
```
Fraunces is an optical-size display serif with strong personality. DM Sans is neutral and geometric. The contrast is dramatic and intentional.

```
Cabinet Grotesk (heading) + Satoshi (body)
```
Both are humanist sans-serifs but Cabinet is wider and more expressive. Works for DTC brands, startups.

### Serious / Corporate

```
IBM Plex Serif (heading) + IBM Plex Sans (body)
```
Designed together for IBM. Rational, technical, trustworthy. Excellent for enterprise software, financial services.

```
Libre Baskerville (heading) + Libre Franklin (body)
```
Classic newspaper pairing translated to web. Professional without being stiff.

### Display / Hero Sections

```
Bebas Neue (display heading) + Nunito (body)
```
Bebas Neue is all-caps condensed — maximum impact. Nunito is rounded and friendly for body. Useful for fitness apps, gaming interfaces, bold marketing pages.

---

## Google Fonts Recommendations

Free, performant, widely used. Filter by category and then narrow by:

**Best for body text (legibility-first):**
- Inter (geometric, large x-height, excellent screen rendering)
- Source Sans 3 (neutral, Adobe-grade quality)
- Noto Sans (multilingual coverage, consistent)
- Lato (warm grotesque, humanist)
- Nunito (rounded, friendly)

**Best for heading serifs:**
- Playfair Display (high contrast, editorial)
- Fraunces (optical sizing, display)
- Lora (calligraphic warmth)
- Libre Baskerville (traditional, readable)
- DM Serif Display (elegant, high contrast)

**Best for heading sans-serifs:**
- Sora (geometric, clean)
- Outfit (modern, variable)
- DM Sans (neutral utility)
- Raleway (elegant, distinctive W/M)

---

## Variable Fonts

Variable fonts contain the entire design space in a single file — you get every weight, width, and optical size from one download. This changes pairing in two ways:

1. **Performance**: One variable font file replaces 4–8 individual weight files. If you only need one family, load one font and use CSS to access the full range.
2. **Fine-tuning**: You can set non-standard weights (font-weight: 550) to dial in exactly the visual weight you need for pairing.

Variable font axes (check what each font supports):
- `wght` — weight (100–900, or beyond)
- `wdth` — width (condensed to expanded)
- `ital` — italic (0 or 1, or intermediate)
- `opsz` — optical size (text vs. display optimization)
- `slnt` — slant (oblique angle)

```css
/* Variable font with all axes */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.woff2') format('woff2 supports variations'),
       url('/fonts/Inter.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

/* Access the full weight range */
.heading-display {
  font-family: 'Inter', sans-serif;
  font-weight: 800;
}

.body-text {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
}

/* Fine-tuned intermediate weight */
.subheading {
  font-family: 'Inter', sans-serif;
  font-weight: 550; /* Between medium and semibold */
}

/* Variable font with optical size axis */
.display-heading {
  font-family: 'Fraunces', serif;
  font-variation-settings: 'opsz' 144, 'wght' 700;
  /* opsz 144 = optimized for 144px display use */
}

.body-text-fraunces {
  font-variation-settings: 'opsz' 14, 'wght' 400;
  /* opsz 14 = optimized for 14px text use */
}
```

---

## CSS Font-Family Stacks

Always include system font fallbacks. Users may have font-loading blocked, be on slow connections, or use browsers that don't support woff2.

### System Font Stack (Zero Loading Time)

```css
:root {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif,
    'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji';

  --font-serif: 'Georgia', 'Times New Roman', Times, serif;

  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono',
    Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
}
```

### Web Font + System Fallback

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+3:wght@300;400;600&display=swap');

:root {
  --font-heading: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-body:    'Source Sans 3', system-ui, -apple-system,
                  'Helvetica Neue', Arial, sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

body, p, li, td, input, textarea {
  font-family: var(--font-body);
}
```

### Self-Hosted Variable Font Stack

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2 supports variations'),
       url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Lora';
  src: url('/fonts/Lora-Variable.woff2') format('woff2 supports variations'),
       url('/fonts/Lora-Variable.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal italic;
  font-display: swap;
}

:root {
  --font-heading: 'Lora', Georgia, serif;
  --font-body:    'Inter', system-ui, sans-serif;
}
```

---

## Quick Pairing Decision Matrix

| Use Case            | Heading Font        | Body Font           | Ratio Recommendation |
|---------------------|---------------------|---------------------|----------------------|
| SaaS Product        | Inter (Bold)        | Inter (Regular)     | 1.2 Minor Third      |
| Marketing Site      | Fraunces            | DM Sans             | 1.333 Perfect Fourth |
| Documentation       | IBM Plex Serif      | IBM Plex Sans       | 1.125 Major Second   |
| Blog / Editorial    | Playfair Display    | Source Sans 3       | 1.25 Major Third     |
| E-Commerce          | Cabinet Grotesk     | Satoshi             | 1.2 Minor Third      |
| Financial / Legal   | Libre Baskerville   | Libre Franklin      | 1.2 Minor Third      |
| Portfolio           | Sora                | Inter               | 1.333 Perfect Fourth |
| Mobile App          | Inter               | Inter               | 1.125 Major Second   |
