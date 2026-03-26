# Systematic Palette Generation

## Why Systematic Palettes Matter

Ad-hoc color choices create inconsistency at scale. A systematic palette:
- Ensures predictable contrast across all shade pairs
- Enables reliable dark mode through palette mirroring
- Gives designers and developers a shared vocabulary
- Allows programmatic generation from a single brand color

---

## The 50–950 Shade Scale

The Tailwind-style scale uses 11 stops: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.

**Convention**:
- 50 = near white (barely tinted)
- 500 = the "pure" or most saturated hue value
- 950 = near black (deeply tinted)

**Lightness targets in oklch** (approximate):

| Stop | oklch L | Use |
|------|---------|-----|
| 50   | 97%     | Tinted backgrounds, hover surfaces |
| 100  | 93%     | Light backgrounds, tags, badges |
| 200  | 86%     | Borders on light backgrounds, dividers |
| 300  | 75%     | Placeholder text, decorative borders |
| 400  | 63%     | Disabled text (check contrast) |
| 500  | 53%     | Primary brand color, icons on white |
| 600  | 44%     | Hover states for 500 |
| 700  | 36%     | Text on light backgrounds, pressed states |
| 800  | 27%     | Heavy text, active states |
| 900  | 20%     | Near-black text with hue tint |
| 950  | 13%     | Darkest tint, deep backgrounds |

```css
/* Full blue palette — oklch systematic */
:root {
  --blue-50:  oklch(97% 0.03 255);
  --blue-100: oklch(93% 0.06 255);
  --blue-200: oklch(86% 0.11 255);
  --blue-300: oklch(75% 0.16 255);
  --blue-400: oklch(63% 0.20 255);
  --blue-500: oklch(53% 0.22 255);
  --blue-600: oklch(44% 0.20 255);
  --blue-700: oklch(36% 0.17 255);
  --blue-800: oklch(27% 0.13 255);
  --blue-900: oklch(20% 0.09 255);
  --blue-950: oklch(13% 0.05 255);
}
```

---

## Hue Rotation for Visual Interest

Pure hue rotation (keeping H constant across all stops) produces palettes that feel flat. Natural colors in the real world rotate hue slightly as they lighten or darken — yellows shift toward green at dark end, blues shift slightly purple at dark end.

**Technique**: Shift hue by 5–15° across the scale. Lighter stops rotate toward warmer/lighter-perceived hues; darker stops rotate toward cooler/richer hues.

```css
/* Blue with hue rotation — more natural, visually richer */
:root {
  --blue-50:  oklch(97% 0.03 265);  /* slightly more cyan-blue when light */
  --blue-100: oklch(93% 0.06 263);
  --blue-200: oklch(86% 0.11 261);
  --blue-300: oklch(75% 0.16 259);
  --blue-400: oklch(63% 0.20 257);
  --blue-500: oklch(53% 0.22 255);  /* anchor point */
  --blue-600: oklch(44% 0.20 252);
  --blue-700: oklch(36% 0.17 249);
  --blue-800: oklch(27% 0.13 246);
  --blue-900: oklch(20% 0.09 244);
  --blue-950: oklch(13% 0.05 242);  /* slightly more indigo when dark */
}

/* Green with hue rotation — lighter stops lean yellow-green, darker lean teal */
:root {
  --green-50:  oklch(97% 0.03 145);
  --green-100: oklch(93% 0.06 147);
  --green-200: oklch(86% 0.11 149);
  --green-300: oklch(75% 0.15 151);
  --green-400: oklch(63% 0.18 153);
  --green-500: oklch(55% 0.20 155);  /* anchor */
  --green-600: oklch(46% 0.19 157);
  --green-700: oklch(37% 0.16 159);
  --green-800: oklch(28% 0.12 161);
  --green-900: oklch(21% 0.08 163);
  --green-950: oklch(14% 0.05 165);
}
```

---

## Saturation (Chroma) Adjustments per Stop

Chroma should not stay constant across all stops. At very light and very dark stops, full chroma looks garish or muddy. A natural bell curve peaking around 500–600 produces better results.

**Chroma curve pattern**:
```
Stop:   50   100  200  300  400  500  600  700  800  900  950
Chroma: 0.03 0.06 0.11 0.16 0.20 0.22 0.20 0.17 0.13 0.09 0.05
```

This gives:
- Light stops: just a hint of color tint
- Mid stops: full vibrancy
- Dark stops: rich hue without muddiness

```css
/* Amber with natural chroma curve */
:root {
  --amber-50:  oklch(97% 0.03 85);
  --amber-100: oklch(93% 0.06 83);
  --amber-200: oklch(87% 0.11 81);
  --amber-300: oklch(80% 0.16 79);
  --amber-400: oklch(73% 0.20 77);
  --amber-500: oklch(68% 0.22 75);   /* peak chroma */
  --amber-600: oklch(58% 0.20 72);
  --amber-700: oklch(47% 0.17 70);
  --amber-800: oklch(35% 0.13 68);
  --amber-900: oklch(26% 0.09 66);
  --amber-950: oklch(17% 0.05 64);
}
```

---

## Generating from a Single Brand Color

Given a single hex or oklch brand color, derive a full 11-stop palette.

### Algorithm

1. Extract L, C, H from the brand color
2. Decide which stop it anchors (usually 500 or 600)
3. Generate stops above by increasing L and decreasing C
4. Generate stops below by decreasing L and decreasing C
5. Apply hue rotation (optional)

```css
/*
  Brand color: #0ea5e9 → oklch(63% 0.21 234)
  This maps well to a 400-stop (light to mid range)
  Anchor at 400, build up and down from there
*/

/* Generated palette */
:root {
  --sky-50:  oklch(97% 0.03 236);
  --sky-100: oklch(93% 0.06 236);
  --sky-200: oklch(87% 0.11 236);
  --sky-300: oklch(78% 0.16 235);
  --sky-400: oklch(63% 0.21 234);  /* brand anchor */
  --sky-500: oklch(53% 0.22 233);
  --sky-600: oklch(45% 0.20 232);
  --sky-700: oklch(37% 0.17 231);
  --sky-800: oklch(28% 0.13 230);
  --sky-900: oklch(21% 0.09 229);
  --sky-950: oklch(14% 0.05 228);
}
```

### CSS Custom Property System

Define the palette once, reference everywhere via semantic tokens:

```css
/* 1. Primitive palette (raw color values) */
:root {
  --primitive-blue-500: oklch(53% 0.22 255);
  --primitive-blue-600: oklch(44% 0.20 255);
  --primitive-blue-700: oklch(36% 0.17 255);
  /* ... all stops ... */

  --primitive-orange-400: oklch(68% 0.21 55);
  --primitive-orange-500: oklch(62% 0.22 52);
  /* ... */

  --primitive-neutral-50:  oklch(98% 0.005 255);
  --primitive-neutral-500: oklch(55% 0.01 255);
  --primitive-neutral-900: oklch(15% 0.01 255);
  /* ... */
}

/* 2. Semantic tokens (role-based) */
:root {
  --color-primary:        var(--primitive-blue-500);
  --color-primary-hover:  var(--primitive-blue-600);
  --color-primary-active: var(--primitive-blue-700);
  --color-on-primary:     white;

  --color-accent:         var(--primitive-orange-400);
  --color-accent-hover:   var(--primitive-orange-500);

  --color-bg:             var(--primitive-neutral-50);
  --color-surface:        white;
  --color-text:           var(--primitive-neutral-900);
  --color-text-muted:     var(--primitive-neutral-500);
}

/* 3. Component tokens (component-scoped) */
.btn-primary {
  --btn-bg:           var(--color-primary);
  --btn-bg-hover:     var(--color-primary-hover);
  --btn-text:         var(--color-on-primary);

  background: var(--btn-bg);
  color: var(--btn-text);
}

.btn-primary:hover {
  background: var(--btn-bg-hover);
}
```

---

## Tailwind-Style Palette Creation

Tailwind CSS 3+ uses OKLCH internally for its palette. Here's how to create a Tailwind-compatible custom color:

```js
// tailwind.config.js
const colors = {
  brand: {
    50:  'oklch(97% 0.03 255)',
    100: 'oklch(93% 0.06 255)',
    200: 'oklch(86% 0.11 255)',
    300: 'oklch(75% 0.16 255)',
    400: 'oklch(63% 0.20 255)',
    500: 'oklch(53% 0.22 255)',
    600: 'oklch(44% 0.20 255)',
    700: 'oklch(36% 0.17 255)',
    800: 'oklch(27% 0.13 255)',
    900: 'oklch(20% 0.09 255)',
    950: 'oklch(13% 0.05 255)',
  }
}

module.exports = {
  theme: {
    extend: {
      colors
    }
  }
}
```

```css
/* In CSS (Tailwind v4 approach) */
@theme {
  --color-brand-50:  oklch(97% 0.03 255);
  --color-brand-100: oklch(93% 0.06 255);
  --color-brand-200: oklch(86% 0.11 255);
  --color-brand-300: oklch(75% 0.16 255);
  --color-brand-400: oklch(63% 0.20 255);
  --color-brand-500: oklch(53% 0.22 255);
  --color-brand-600: oklch(44% 0.20 255);
  --color-brand-700: oklch(36% 0.17 255);
  --color-brand-800: oklch(27% 0.13 255);
  --color-brand-900: oklch(20% 0.09 255);
  --color-brand-950: oklch(13% 0.05 255);
}
```

---

## Dark Mode Palette Inversion

### The Simple (Wrong) Approach
Swapping 50 ↔ 950, 100 ↔ 900, etc. is tempting but produces dark mode colors that look different from light mode equivalents. Dark mode surfaces are not simply "inverted" light surfaces — they need independent treatment.

### The Correct Approach
Dark mode has different lightness targets and usually slightly reduced saturation:

```css
/* Light mode semantic tokens */
:root {
  --bg:              oklch(98% 0.005 255);   /* near-white */
  --surface:         oklch(100% 0 0);        /* white */
  --surface-raised:  oklch(97% 0.01 255);    /* slightly elevated */
  --border:          oklch(88% 0.03 255);
  --text-primary:    oklch(15% 0.01 255);
  --text-secondary:  oklch(42% 0.01 255);
  --text-muted:      oklch(60% 0.01 255);
  --brand:           oklch(53% 0.22 255);
  --brand-subtle:    oklch(93% 0.07 255);
}

/* Dark mode semantic tokens */
@media (prefers-color-scheme: dark) {
  :root {
    --bg:              oklch(14% 0.02 255);   /* very dark blue-gray */
    --surface:         oklch(18% 0.02 255);   /* slightly lighter than bg */
    --surface-raised:  oklch(22% 0.02 255);   /* cards, modals */
    --border:          oklch(28% 0.03 255);
    --text-primary:    oklch(93% 0.01 255);
    --text-secondary:  oklch(72% 0.01 255);
    --text-muted:      oklch(50% 0.01 255);
    --brand:           oklch(65% 0.22 255);   /* LIGHTER in dark mode for accessibility */
    --brand-subtle:    oklch(22% 0.08 255);
  }
}

/* Class-based dark mode (for manual toggle) */
.dark {
  --bg:              oklch(14% 0.02 255);
  --surface:         oklch(18% 0.02 255);
  --surface-raised:  oklch(22% 0.02 255);
  --border:          oklch(28% 0.03 255);
  --text-primary:    oklch(93% 0.01 255);
  --text-secondary:  oklch(72% 0.01 255);
  --text-muted:      oklch(50% 0.01 255);
  --brand:           oklch(65% 0.22 255);
  --brand-subtle:    oklch(22% 0.08 255);
}
```

### Dark Mode Key Rules

1. **Dark mode brand color is lighter**: In dark mode, use a lighter stop of your brand (400 instead of 500) so it meets contrast requirements against dark surfaces.
2. **Dark mode surfaces stack upward**: bg (darkest) → surface → surface-raised → surface-overlay. Each elevation adds ~4% lightness.
3. **Reduce chroma slightly in dark mode**: High saturation on dark backgrounds can feel harsh. Reduce brand chroma by ~10% in dark mode.
4. **Never use pure black or pure white**: Both feel harsh. Use `oklch(14% 0.02 H)` and `oklch(97% 0.005 H)` instead.

```css
/* Elevation layers in dark mode */
:root {
  --elevation-0: oklch(12% 0.02 255);   /* page background */
  --elevation-1: oklch(16% 0.02 255);   /* cards */
  --elevation-2: oklch(20% 0.02 255);   /* modals, drawers */
  --elevation-3: oklch(24% 0.02 255);   /* tooltips, dropdowns */
  --elevation-4: oklch(28% 0.02 255);   /* top layer elements */
}
```

---

## Full Multi-Color System Example

A complete design system palette for a SaaS product:

```css
:root {
  /* === PRIMITIVE PALETTE === */

  /* Blue — primary brand */
  --blue-50:  oklch(97% 0.03 255); --blue-100: oklch(93% 0.06 255);
  --blue-200: oklch(86% 0.11 255); --blue-300: oklch(75% 0.16 255);
  --blue-400: oklch(63% 0.20 255); --blue-500: oklch(53% 0.22 255);
  --blue-600: oklch(44% 0.20 255); --blue-700: oklch(36% 0.17 255);
  --blue-800: oklch(27% 0.13 255); --blue-900: oklch(20% 0.09 255);
  --blue-950: oklch(13% 0.05 255);

  /* Green — success */
  --green-50:  oklch(97% 0.03 155); --green-500: oklch(55% 0.20 155);
  --green-600: oklch(46% 0.18 155); --green-700: oklch(37% 0.15 155);
  --green-900: oklch(20% 0.08 155);

  /* Amber — warning */
  --amber-50:  oklch(97% 0.03 85); --amber-400: oklch(73% 0.20 77);
  --amber-500: oklch(68% 0.22 75); --amber-700: oklch(47% 0.17 70);
  --amber-900: oklch(26% 0.09 66);

  /* Red — error */
  --red-50:  oklch(97% 0.03 25); --red-500: oklch(55% 0.22 25);
  --red-600: oklch(47% 0.20 25); --red-700: oklch(39% 0.17 25);
  --red-900: oklch(23% 0.09 25);

  /* Neutral — structure */
  --neutral-0:   oklch(100% 0 0);
  --neutral-50:  oklch(98% 0.005 255);
  --neutral-100: oklch(94% 0.01 255);
  --neutral-200: oklch(88% 0.015 255);
  --neutral-300: oklch(79% 0.015 255);
  --neutral-400: oklch(66% 0.01 255);
  --neutral-500: oklch(53% 0.01 255);
  --neutral-600: oklch(43% 0.01 255);
  --neutral-700: oklch(34% 0.01 255);
  --neutral-800: oklch(25% 0.01 255);
  --neutral-900: oklch(17% 0.01 255);
  --neutral-950: oklch(11% 0.01 255);

  /* === SEMANTIC TOKENS (light mode) === */
  --color-bg:              var(--neutral-50);
  --color-surface:         var(--neutral-0);
  --color-surface-subtle:  var(--neutral-100);
  --color-border:          var(--neutral-200);
  --color-border-strong:   var(--neutral-300);
  --color-text:            var(--neutral-900);
  --color-text-secondary:  var(--neutral-600);
  --color-text-muted:      var(--neutral-400);
  --color-text-disabled:   var(--neutral-300);

  --color-primary:         var(--blue-500);
  --color-primary-hover:   var(--blue-600);
  --color-primary-text:    white;
  --color-primary-subtle:  var(--blue-50);
  --color-primary-border:  var(--blue-200);

  --color-success:         var(--green-500);
  --color-success-subtle:  var(--green-50);
  --color-success-text:    var(--green-700);

  --color-warning:         var(--amber-500);
  --color-warning-subtle:  var(--amber-50);
  --color-warning-text:    var(--amber-700);

  --color-error:           var(--red-500);
  --color-error-subtle:    var(--red-50);
  --color-error-text:      var(--red-700);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:              var(--neutral-950);
    --color-surface:         var(--neutral-900);
    --color-surface-subtle:  var(--neutral-800);
    --color-border:          var(--neutral-700);
    --color-border-strong:   var(--neutral-600);
    --color-text:            var(--neutral-50);
    --color-text-secondary:  var(--neutral-400);
    --color-text-muted:      var(--neutral-600);
    --color-text-disabled:   var(--neutral-700);

    --color-primary:         var(--blue-400);   /* lighter for dark bg */
    --color-primary-hover:   var(--blue-300);
    --color-primary-text:    var(--blue-950);
    --color-primary-subtle:  var(--blue-950);
    --color-primary-border:  var(--blue-800);
  }
}
```
