# Color and Motion Accessibility

Color and motion are powerful design tools that create serious barriers when used without care. This reference covers contrast requirements, media query implementations, and forced-color support.

---

## Color Contrast Requirements

### WCAG 2.2 Contrast Ratios

Contrast ratio is calculated from relative luminance of foreground and background colors, ranging from 1:1 (same color) to 21:1 (black on white).

| Content type | AA minimum | AAA target |
|---|---|---|
| Normal text (< 18pt / < 14pt bold) | 4.5:1 | 7:1 |
| Large text (≥ 18pt or ≥ 14pt bold) | 3:1 | 4.5:1 |
| UI components (borders, icons) | 3:1 | — |
| Graphical objects (chart lines, data points) | 3:1 | — |
| Disabled UI components | exempt | — |
| Decorative text / logos | exempt | — |
| Placeholder text | 4.5:1 (same as text) | — |

### Quick contrast reference

```css
/* These pairs meet WCAG AA for normal text (≥4.5:1) */
:root {
  /* Dark text on light background */
  --text-on-white:   #595959; /* 7.0:1 on #fff */
  --text-on-gray:    #1a1a1a; /* 16.7:1 on #fff, 8.8:1 on #f5f5f5 */
  --link-on-white:   #0057b8; /* 7.0:1 on #fff */
  --error-on-white:  #c0392b; /* 5.1:1 on #fff */

  /* Light text on dark background */
  --text-on-black:   #e8e8e8; /* 14.7:1 on #121212 */
  --link-on-dark:    #70b8ff; /* 4.6:1 on #121212 */
  --error-on-dark:   #ff8a80; /* 5.4:1 on #121212 */

  /* UI component borders (≥3:1) */
  --input-border:    #767676; /* 4.5:1 on #fff */
  --focus-ring:      #0057b8; /* 7.0:1 on #fff */
}

/* Fails AA — common mistakes */
/* #999 on #fff = 2.85:1 (too low for text) */
/* #ccc border on #fff = 1.6:1 (fails 3:1 for UI) */
/* #767676 placeholder on #fff = 4.5:1 (borderline — passes AA) */
```

### Checking contrast in code

```javascript
// Calculate relative luminance (WCAG formula)
function relativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.04045
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(color1, color2) {
  const l1 = relativeLuminance(...color1);
  const l2 = relativeLuminance(...color2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Example
const ratio = contrastRatio([0, 87, 184], [255, 255, 255]);
// contrastRatio([0,87,184], [255,255,255]) ≈ 7.0 — passes AA and AAA
```

### APCA (Advanced Perceptual Contrast Algorithm)

WCAG 3.0 will use APCA, which accounts for font size and weight. APCA Lc values replace ratio:

| Use case | Minimum Lc |
|---|---|
| Body text | 75 |
| Large text (24px+) | 60 |
| UI controls | 45 |
| Large UI labels | 30 |
| Decorative only | 15 |

APCA tools: [https://apcacontrast.com](https://apcacontrast.com), `@csstools/css-color-level-4`

---

## Never Rely on Color Alone

WCAG 1.4.1 prohibits using color as the sole visual means of conveying information.

### Common violations and fixes

```html
<!-- BAD: Error state shown only with red color -->
<input class="input-error" type="email">
<style>
.input-error { border-color: red; }
</style>

<!-- GOOD: Error shown with color + icon + text -->
<div class="field-wrapper">
  <label for="email">Email address</label>
  <div class="input-wrapper">
    <input
      type="email"
      id="email"
      class="input-error"
      aria-invalid="true"
      aria-describedby="email-error"
    >
    <svg class="error-icon" aria-hidden="true"><!-- ! icon --></svg>
  </div>
  <p id="email-error" class="error-message">
    <!-- Text label + icon — not just color -->
    Enter a valid email address
  </p>
</div>
```

```css
/* BAD: Status dots — color only */
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-dot.active   { background: green; }
.status-dot.inactive { background: red; }

/* GOOD: Color + shape/pattern + text */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.status-badge::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-badge.active::before  { background: #2e7d32; }
.status-badge.inactive::before {
  background: #c62828;
  border-radius: 2px; /* square for inactive — shape difference too */
}
/* Visible label text always present */
```

```html
<!-- BAD: Chart with color-only differentiation -->
<canvas id="chart"></canvas>
<!-- If two lines are only differentiated by color, colorblind users can't distinguish -->

<!-- GOOD: Chart with color + pattern + direct labels -->
<!-- Use dashed/dotted lines, different markers, or direct data labels -->
<!-- Provide a data table as an alternative -->
<figure>
  <canvas id="chart" aria-labelledby="chart-title"></canvas>
  <figcaption id="chart-title">Sales comparison 2023 vs 2024</figcaption>
  <details>
    <summary>View data as table</summary>
    <table>
      <caption>Monthly sales: 2023 (solid line) vs 2024 (dashed line)</caption>
      <!-- data table -->
    </table>
  </details>
</figure>
```

---

## prefers-reduced-motion

Some users experience vestibular disorders, epilepsy, or motion sensitivity. The `prefers-reduced-motion` media query lets them opt out of animations.

### The pattern

```css
/* Default: animations enabled */
.card {
  transition: transform 300ms ease, box-shadow 300ms ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Reduced motion: disable or slow down */
@media (prefers-reduced-motion: reduce) {
  /* Option 1: Remove animation entirely */
  .card {
    transition: none;
  }
  .card:hover {
    transform: none;
  }

  /* Option 2: Keep feedback but remove motion */
  .card:hover {
    box-shadow: 0 0 0 3px #0056b3; /* highlight without movement */
  }

  /* Option 3: Slow down to near-static */
  .spinner {
    animation-duration: 10s;
  }

  /* Remove all transitions and animations globally */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Prefer the "no-preference" approach

Rather than removing motion for reduced-motion users, add it only for users who are OK with it:

```css
/* Better pattern: motion-safe instead of motion-reduce */

/* Base: no animation (safe default) */
.hero-image {
  opacity: 1;
}

/* Add motion only when user hasn't requested reduction */
@media (prefers-reduced-motion: no-preference) {
  .hero-image {
    animation: fadeIn 600ms ease both;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

### JavaScript: respect prefers-reduced-motion

```javascript
// Check preference in JS for programmatic animations (GSAP, etc.)
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  // Run GSAP/Three.js animations
  gsap.from('.hero', { y: 40, opacity: 0, duration: 0.6 });
} else {
  // Skip or use instant equivalent
  document.querySelector('.hero').style.opacity = '1';
}

// React to setting changes at runtime
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  if (e.matches) {
    stopAllAnimations();
  } else {
    startAnimations();
  }
});
```

### What to always remove in reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  /* These specific patterns are triggers for vestibular disorders */

  /* 1. Parallax scrolling */
  .parallax { background-attachment: scroll !important; }

  /* 2. Auto-playing carousels */
  .carousel { animation-play-state: paused !important; }

  /* 3. Looping videos */
  /* Handle in HTML: <video autoplay muted loop playsinline> */
  /* Check preference and remove autoplay */

  /* 4. Scroll-triggered animations */
  [data-animate] { opacity: 1 !important; transform: none !important; }

  /* 5. Page transitions */
  .page-transition { animation: none !important; }
}
```

---

## prefers-reduced-transparency

Users with cognitive disabilities or light sensitivity may need reduced transparency.

```css
/* Default: frosted glass effect */
.sidebar {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
}

/* Reduced transparency: solid background */
@media (prefers-reduced-transparency: reduce) {
  .sidebar {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: none;
  }
}
```

---

## prefers-contrast

Some users need higher contrast than standard designs provide.

```css
/* Standard contrast */
.card {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #495057;
}

/* More contrast: increase contrast when user requests it */
@media (prefers-contrast: more) {
  .card {
    background: #fff;
    border: 2px solid #000;
    color: #000;
  }

  /* Increase focus visibility */
  :focus-visible {
    outline-width: 4px;
    outline-color: #000;
  }
}

/* Less contrast: soften for users who find high contrast painful */
@media (prefers-contrast: less) {
  .card {
    background: #fafafa;
    border-color: #e8e8e8;
    color: #666;
  }
}
```

---

## forced-colors Mode (Windows High Contrast)

Windows High Contrast Mode replaces all colors with a limited system palette. CSS colors are overridden by the OS. You must design for this explicitly.

### System color keywords

```css
/* These keywords map to OS-defined colors in forced-colors mode */
/* Use them to maintain intended relationships */

:root {
  /* Always use these in forced-colors blocks */
  /* ButtonText    — text on buttons */
  /* ButtonFace    — button background */
  /* CanvasText    — body text color */
  /* Canvas        — body background */
  /* Highlight     — selected item background */
  /* HighlightText — selected item text */
  /* LinkText      — link color */
  /* GrayText      — disabled text */
  /* Mark          — highlighted/marked text background */
  /* MarkText      — highlighted/marked text */
}

/* Adapting a custom button for forced-colors */
.btn-primary {
  background: #0056b3;
  color: #fff;
  border: 2px solid transparent;
}

@media (forced-colors: active) {
  .btn-primary {
    background: ButtonFace;
    color: ButtonText;
    border-color: ButtonText;
    forced-color-adjust: none; /* opt out of auto-adjustment for this element */
  }

  .btn-primary:hover {
    background: Highlight;
    color: HighlightText;
    border-color: HighlightText;
  }
}
```

### Common forced-colors pitfalls

```css
/* Problem: SVG icons become invisible (same color as background) */
svg { fill: currentColor; } /* GOOD — inherits forced color */
svg { fill: #0056b3; }      /* BAD  — overridden to Canvas in forced mode */

/* Problem: Focus ring disappears (outline: none) */
:focus { outline: none; } /* Forced-colors restores outlines, but don't rely on it */
:focus-visible { outline: 2px solid transparent; } /* visible in forced mode */

/* Problem: Background images used for content disappear */
.icon { background-image: url(icon.png); } /* invisible in forced mode */
/* FIX: Use <img> or inline SVG instead of background images for meaningful content */

/* Problem: Box shadows (used as borders) disappear */
.card { box-shadow: 0 0 0 1px #ccc; } /* invisible in forced mode */
/* FIX: Use actual border */
@media (forced-colors: active) {
  .card { border: 1px solid ButtonText; }
}

/* Problem: Gradient backgrounds override text readability */
.hero {
  background: linear-gradient(135deg, #0056b3, #003d82);
  color: white;
}
@media (forced-colors: active) {
  .hero {
    background: Canvas;
    color: CanvasText;
  }
}
```

### Testing forced-colors

```
Chrome DevTools:
  Rendering panel → Emulate CSS media feature → forced-colors: active

Windows High Contrast:
  Settings → Accessibility → High contrast → Turn on
```

---

## Dark Mode Accessibility

Dark mode reduces eye strain but introduces its own accessibility challenges.

```css
/* System preference detection */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary:    #121212;
    --bg-surface:    #1e1e1e;
    --bg-elevated:   #2a2a2a;
    --text-primary:  #e8e8e8;   /* not pure white — reduces glare */
    --text-secondary:#a8a8a8;
    --text-disabled: #636363;   /* ≥3:1 against #121212 */
    --link-color:    #70b8ff;   /* ≥4.5:1 against #121212 */
    --error-color:   #ff8a80;   /* ≥4.5:1 against #121212 */
    --border-subtle: #3a3a3a;
    --focus-ring:    #70b8ff;
  }
}

/* Dark mode contrast trap: pure white on pure black creates halation */
/* Bad: */
body { background: #000; color: #fff; } /* 21:1 — too harsh */
/* Good: */
body { background: #121212; color: #e8e8e8; } /* 14.7:1 — comfortable */

/* Images in dark mode — prevent blindingly bright images */
@media (prefers-color-scheme: dark) {
  img, video {
    filter: brightness(0.9); /* Slightly dim images */
  }
}

/* Shadows need adjustment — light shadows invisible on dark backgrounds */
@media (prefers-color-scheme: dark) {
  .card {
    /* Replace drop shadow with border */
    box-shadow: none;
    border: 1px solid var(--border-subtle);
  }
}
```

### Dark mode color-on-color contrast

Always verify dark mode color pairs separately — a color safe on white may fail on dark backgrounds.

```css
/* Check BOTH modes */
:root {
  --accent: #0056b3;        /* 7.0:1 on white — passes */
}

@media (prefers-color-scheme: dark) {
  :root {
    --accent: #70b8ff;      /* DIFFERENT value — 4.6:1 on #121212 — passes */
    /* Never just use #0056b3 in dark mode: it's ~2.8:1 on #121212 — fails */
  }
}
```

---

## Animation Accessibility Summary

```css
/* Complete motion accessibility setup */

/* 1. Declare animations only for users who accept motion */
@media (prefers-reduced-motion: no-preference) {
  .fade-in    { animation: fadeIn 300ms ease both; }
  .slide-up   { animation: slideUp 400ms ease both; }
  .spin       { animation: spin 1s linear infinite; }
}

/* 2. For loading states that need to communicate activity, use non-motion alternative */
@media (prefers-reduced-motion: reduce) {
  .loading-indicator::after {
    content: 'Loading…';  /* Text instead of spinner */
    animation: none;
  }
}

/* 3. Respect all preferences together */
@media (prefers-reduced-motion: reduce),
       (prefers-contrast: more) {
  /* High contrast + reduced motion users */
  .animated-background {
    animation: none;
    background: Canvas;
  }
}

/* Keyframes — defined regardless, only applied via media query */
@keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes spin    { to   { transform: rotate(360deg) } }
```

### Epilepsy / photosensitivity

WCAG 2.3.1 (Level A): No content flashes more than 3 times per second, or the flash is below the general and red flash thresholds.

```javascript
// Never intentionally flash content. If you have video or animation:
// - Avoid strobing effects entirely
// - Warn users before flashing content begins
// - Provide a way to disable it

// Tool to check: Photosensitive Epilepsy Analysis Tool (PEAT)
// https://trace.umd.edu/peat
```
