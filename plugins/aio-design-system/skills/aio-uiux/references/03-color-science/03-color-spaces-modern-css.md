# Color Spaces and Modern CSS

## What Is a Color Space?

A color space defines how colors are encoded as numbers — which dimensions are used, how they map to human perception, and what range of colors (gamut) can be represented. Choosing the right color space affects design predictability, accessibility accuracy, and visual quality on modern displays.

---

## sRGB

**Full name**: Standard Red Green Blue
**Introduced**: 1996 (HP + Microsoft)
**Gamut**: ~35% of human-visible colors
**CSS syntax**: `rgb()`, `hsl()`, hex values

The historical default for web and screen design. All CSS colors without a color space declaration are in sRGB.

**Limitations**:
- Limited gamut — cannot express vivid colors reproducible on modern displays
- HSL is perceptually non-uniform (equal numeric steps do not look equal)
- Mixing in sRGB produces muddy mid-points (e.g., blue + yellow gradient goes through gray)

```css
/* All sRGB */
color: #3b82f6;
color: rgb(59 130 246);
color: hsl(220 80% 60%);
```

---

## Display P3

**Full name**: DCI-P3 (adapted for displays)
**Introduced**: Cinema standard, adopted by Apple ~2016
**Gamut**: ~50% of human-visible colors — ~25% wider than sRGB
**CSS syntax**: `color(display-p3 r g b)`

Supported on iPhone (since iPhone 7), iPad, MacBook Pro (since 2016), and modern wide-gamut monitors. Colors outside sRGB but inside P3 are vivid reds, greens, and cyans that look noticeably more saturated on capable displays.

```css
/* Vivid colors only expressible in P3 */
.hero {
  /* sRGB fallback first */
  background: oklch(65% 0.22 150);
  /* P3 version — more vivid green on wide-gamut screens */
  background: color(display-p3 0.15 0.80 0.35);
}

/* Progressive enhancement pattern */
@supports (color: color(display-p3 0 0 0)) {
  .accent {
    color: color(display-p3 1 0.2 0.1);   /* vivid P3 red, richer than sRGB max */
  }
}
```

**Practical guidance**: Use oklch with high chroma values — the browser automatically gamut-maps to sRGB on non-P3 displays and shows P3 vibrancy on capable ones. This is usually better than manually specifying `color(display-p3)`.

---

## oklab

**Full name**: Oklab (created by Björn Ottosson, 2020)
**Type**: Perceptually uniform lightness-based space
**CSS syntax**: `oklab(L a b)`

oklab is designed so that equal numeric distances correspond to equal perceptual differences. It excels at color mixing and interpolation — gradients through oklab do not pass through muddy gray areas.

**Axes**:
- `L`: lightness (0 = black, 1 = white)
- `a`: green (−) to red (+)
- `b`: blue (−) to yellow (+)

```css
/* Direct usage */
color: oklab(0.55 -0.05 -0.18);  /* a medium blue */

/* Gradient through oklab — stays vivid throughout */
.gradient-vivid {
  background: linear-gradient(
    in oklab,
    oklch(65% 0.22 150),   /* vivid green */
    oklch(65% 0.22 30)     /* vivid orange */
  );
  /* Without 'in oklab', gradient would pass through gray; with it, stays saturated */
}

/* color-mix in oklab space */
.midpoint {
  background: color-mix(in oklab, oklch(65% 0.22 150) 50%, oklch(65% 0.22 30));
}
```

**When to use oklab**: Primarily for programmatic color mixing, gradients, and interpolation. For direct color authoring, oklch is more intuitive (because it uses Hue as a wheel angle rather than a/b Cartesian coordinates).

---

## oklch — The Superior Choice for Design

**Full name**: Oklab Cylindrical (polar form of oklab)
**CSS syntax**: `oklch(L C H)`

oklch shares oklab's perceptual uniformity but uses intuitive polar coordinates:
- `L`: lightness (0–1, or 0%–100%)
- `C`: chroma (colorfulness, 0–0.4+ typically)
- `H`: hue (0–360°, same wheel positions as HSL)

### Why oklch is Superior to HSL

| Property | HSL | oklch |
|----------|-----|-------|
| Perceptually uniform lightness | No | Yes |
| Consistent perceived saturation | No | Yes |
| Intuitive hue angle | Yes | Yes |
| Accurate for WCAG contrast calculations | No | Yes |
| Works for palette generation | Poor | Excellent |
| Wide-gamut support | No | Yes |

**The key problem with HSL**: `hsl(60, 100%, 50%)` (yellow) looks far lighter than `hsl(240, 100%, 50%)` (blue), even though both have "50% lightness". In oklch, equal L values look equal to the eye.

```css
/* HSL — lightness is visually inconsistent */
hsl(60, 100%, 50%)   /* VERY bright yellow */
hsl(240, 100%, 50%)  /* Medium dark blue */
/* These do not look the same brightness */

/* oklch — L is perceptually consistent */
oklch(80% 0.20 90)   /* light yellow */
oklch(80% 0.20 255)  /* light blue */
/* These look the same brightness to human eyes */
```

### oklch Chroma Range

Unlike HSL saturation (always 0-100%), oklch chroma varies by hue — some hues can only reach ~0.15 chroma before clipping:

```css
/* Safe chroma values that work across hues */
oklch(55% 0.10 H)   /* muted / pastel */
oklch(55% 0.15 H)   /* moderate saturation */
oklch(55% 0.20 H)   /* vivid (some hues may clip) */
oklch(55% 0.25 H)   /* highly saturated (clips in many hues) */
oklch(55% 0.32 H)   /* max P3 range for some hues */

/* Greens and teals can handle higher chroma */
oklch(55% 0.28 155)  /* vivid teal, within P3 */

/* Yellows clip at lower chroma */
oklch(85% 0.18 90)   /* near-max for yellow without clipping */
```

### Practical oklch Usage

```css
:root {
  /* Brand palette in oklch */
  --brand-50:  oklch(97% 0.03 255);
  --brand-100: oklch(93% 0.07 255);
  --brand-200: oklch(86% 0.12 255);
  --brand-300: oklch(76% 0.16 255);
  --brand-400: oklch(65% 0.20 255);
  --brand-500: oklch(55% 0.22 255);   /* base */
  --brand-600: oklch(46% 0.20 255);
  --brand-700: oklch(37% 0.17 255);
  --brand-800: oklch(28% 0.12 255);
  --brand-900: oklch(20% 0.08 255);
  --brand-950: oklch(13% 0.05 255);
}
```

---

## CSS `color()` Function

The `color()` function explicitly specifies a color space:

```css
/* Syntax: color(space r g b) or color(space r g b / alpha) */
color: color(srgb 0.23 0.51 0.96);
color: color(srgb 0.23 0.51 0.96 / 0.8);
color: color(display-p3 0.15 0.80 0.35);
color: color(a98-rgb 0.23 0.51 0.96);     /* Adobe RGB */
color: color(prophoto-rgb 0.23 0.51 0.96);
color: color(rec2020 0.23 0.51 0.96);     /* HDR displays */
color: color(xyz-d65 0.20 0.17 0.70);     /* device-independent */
```

**When to use `color()`**:
- When you have specific P3 values from design tools (Figma exports P3 values)
- When targeting HDR displays (rec2020)
- When you need device-independent colors (xyz)

---

## `color-mix()`

Mix two colors in any color space:

```css
/* Syntax: color-mix(in space, color1 pct%, color2) */
.mixed {
  /* 30% blue + 70% white in oklch space */
  background: color-mix(in oklch, oklch(55% 0.22 255) 30%, white);

  /* Equal mix in different spaces — different results */
  background: color-mix(in srgb, blue, yellow);    /* gray-ish */
  background: color-mix(in oklch, blue, yellow);   /* green (perceptually correct) */
  background: color-mix(in oklab, blue, yellow);   /* green (same as oklch here) */
}

/* Practical use: tinting a surface */
:root {
  --surface-tint: color-mix(in oklch, var(--brand-500) 8%, white);
  --surface-elevated: color-mix(in oklch, var(--brand-500) 12%, white);
}

/* Opacity via color-mix */
.overlay {
  background: color-mix(in srgb, var(--brand-500) 15%, transparent);
  /* Equivalent to: background: oklch(55% 0.22 255 / 15%); */
}
```

---

## Relative Color Syntax

Derive new colors from existing ones by modifying individual channels:

```css
/* Syntax: oklch(from <color> l c h) with optional modifications */
:root {
  --brand: oklch(55% 0.22 255);

  /* Lighter version (+20% lightness) */
  --brand-light: oklch(from var(--brand) calc(l + 0.20) c h);

  /* Darker version */
  --brand-dark: oklch(from var(--brand) calc(l - 0.20) c h);

  /* Less saturated (for disabled states) */
  --brand-muted: oklch(from var(--brand) l calc(c * 0.4) h);

  /* Complementary hue */
  --brand-complement: oklch(from var(--brand) l c calc(h + 180));

  /* Hue-shifted warm variant */
  --brand-warm: oklch(from var(--brand) l c calc(h - 40));
}

/* Interactive state colors derived automatically */
.btn {
  background: var(--brand);
  color: white;
}

.btn:hover {
  background: oklch(from var(--brand) calc(l - 0.08) c h);
}

.btn:active {
  background: oklch(from var(--brand) calc(l - 0.15) c h);
}

.btn:disabled {
  background: oklch(from var(--brand) 0.75 calc(c * 0.3) h);
  color: oklch(0.55 0.01 h);
}
```

**Browser support**: Chrome 119+, Safari 16.4+, Firefox 128+. Use `@supports` for fallback.

---

## Gamut Mapping

When a color is specified outside the display's gamut (e.g., high-chroma oklch on an sRGB display), the browser must map it to the nearest in-gamut color. CSS Color Level 4 defines this as reducing chroma at constant hue and lightness — which preserves visual intent better than clipping.

```css
/* Force gamut mapping check */
@media (color-gamut: srgb) {
  /* Only standard gamut available */
  .vivid-accent {
    color: oklch(60% 0.20 150);  /* may appear slightly less vivid */
  }
}

@media (color-gamut: p3) {
  /* Wide gamut available */
  .vivid-accent {
    color: oklch(60% 0.25 150);  /* full P3 vibrancy */
  }
}

@media (color-gamut: rec2020) {
  /* HDR display */
  .vivid-accent {
    color: oklch(60% 0.30 150);
  }
}
```

---

## Browser Support Summary (2024)

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| oklch / oklab | 111+ | 113+ | 15.4+ |
| color() function | 111+ | 113+ | 15+ |
| color-mix() | 111+ | 113+ | 16.2+ |
| Relative color syntax | 119+ | 128+ | 16.4+ |
| Display P3 | 111+ | 113+ | 10+ |

**Safe approach**: Write oklch as primary values. All major browsers support it. Use `@supports` or duplicate declarations only when targeting very old browsers.

```css
/* Progressive enhancement pattern */
.element {
  /* Fallback for ancient browsers */
  color: #3b82f6;
  /* Modern browsers use this */
  color: oklch(55% 0.22 255);
}
```

---

## Migration Guide: Hex to oklch

### Step 1: Identify your current palette
Collect all hex/rgb values currently used.

### Step 2: Convert using a tool
- CSS Color Picker: `oklch.com`
- VS Code extension: "Color Highlight" with oklch support
- Figma: copy as oklch from color picker

### Step 3: Replace systematically
```css
/* Before */
:root {
  --brand: #3b82f6;
  --brand-dark: #1d4ed8;
  --brand-light: #bfdbfe;
  --accent: #f97316;
  --success: #22c55e;
  --error: #ef4444;
}

/* After — perceptually systematic */
:root {
  --brand: oklch(55% 0.22 255);
  --brand-dark: oklch(38% 0.20 255);
  --brand-light: oklch(88% 0.10 255);
  --accent: oklch(68% 0.20 50);
  --success: oklch(60% 0.20 155);
  --error: oklch(55% 0.22 25);
}
```

### Step 4: Rebuild shade scales in oklch
Instead of converting each hex to oklch individually, regenerate your scales with consistent lightness steps:

```css
/* Systematic oklch scale — equal perceptual steps */
--brand-50:  oklch(97% 0.03 255);   /* +7% per major step */
--brand-100: oklch(93% 0.06 255);
--brand-200: oklch(86% 0.11 255);
--brand-300: oklch(76% 0.16 255);
--brand-400: oklch(65% 0.20 255);
--brand-500: oklch(55% 0.22 255);   /* base */
--brand-600: oklch(46% 0.20 255);
--brand-700: oklch(37% 0.17 255);
--brand-800: oklch(28% 0.12 255);
--brand-900: oklch(20% 0.08 255);
--brand-950: oklch(13% 0.04 255);
```

### Step 5: Verify contrast ratios
After migrating to oklch, re-check WCAG contrast ratios. The conversion may slightly shift perceived lightness from what you had in hex. Use tools that understand oklch (e.g., `oklch.com` contrast checker).
