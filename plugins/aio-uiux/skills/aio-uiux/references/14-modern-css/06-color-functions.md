# CSS Color Functions

## Why Modern Color Functions Matter

CSS now has first-class support for wide-gamut color spaces, perceptually uniform color manipulation, and dynamic color mixing — capabilities that previously required JavaScript or Sass. `oklch()`, `color-mix()`, and relative color syntax enable design systems that are mathematically coherent, perceptually consistent, and dynamically adaptable.

---

## oklch() — Perceptually Uniform Color

OKLCH is a perceptually uniform color space built on top of the OKLAB color space. It defines colors with three parameters:

```css
oklch(L C H)
/*
  L = Lightness  0–1 (or 0%–100%)
  C = Chroma     0–0.4+ (saturation/colorfulness)
  H = Hue        0–360 (degrees)
*/

oklch(0.65 0.2 250)  /* A medium blue */
oklch(50% 0.15 145)  /* A medium green */
```

### Why oklch Over hsl

**HSL is not perceptually uniform.** A yellow at `hsl(60, 100%, 50%)` appears much brighter than a blue at `hsl(240, 100%, 50%)` even though both have `L: 50%`. This makes building accessible, harmonious palettes in HSL unreliable.

**OKLCH is perceptually uniform.** Two colors at `oklch(0.6 0.2 60)` and `oklch(0.6 0.2 240)` appear equally bright to the human eye. Adjusting L by a fixed amount produces predictable brightness changes regardless of hue.

### Building a Color Scale in oklch

```css
:root {
  /* Brand blue scale — same L steps, same C, only H differs slightly */
  --blue-50:  oklch(0.97 0.01 250);
  --blue-100: oklch(0.93 0.03 250);
  --blue-200: oklch(0.86 0.07 250);
  --blue-300: oklch(0.76 0.12 250);
  --blue-400: oklch(0.65 0.17 250);
  --blue-500: oklch(0.55 0.22 250);  /* Primary */
  --blue-600: oklch(0.46 0.20 250);
  --blue-700: oklch(0.38 0.17 250);
  --blue-800: oklch(0.30 0.13 250);
  --blue-900: oklch(0.22 0.09 250);
  --blue-950: oklch(0.15 0.05 250);
}
```

Equal L steps produce visually equal brightness steps — something HSL cannot guarantee.

### oklch and Wide Gamut Displays

oklch can address colors outside the sRGB gamut (P3 and beyond). Colors in the P3 space are more vivid than anything representable in sRGB:

```css
.vivid-accent {
  /* This chroma value (0.3) is outside sRGB on most displays */
  color: oklch(0.6 0.3 250);
}
```

Browsers gracefully fall back to the nearest sRGB equivalent on non-wide-gamut displays. No explicit fallback needed for basic use.

---

## color-mix()

`color-mix()` mixes two colors in a specified color space and returns the result.

```css
color-mix(in <color-space>, <color1> [<percentage>], <color2> [<percentage>])
```

### Basic Usage

```css
/* 50/50 mix of blue and red in oklch */
color: color-mix(in oklch, blue, red);

/* 30% red, 70% blue */
color: color-mix(in oklch, red 30%, blue);

/* Mix with transparent for alpha */
background: color-mix(in oklch, var(--brand-500) 15%, transparent);
```

### Generating Tints and Shades

```css
:root {
  --brand: oklch(0.55 0.22 250);
}

.tint-light {
  background: color-mix(in oklch, var(--brand) 10%, white);
}
.tint-medium {
  background: color-mix(in oklch, var(--brand) 30%, white);
}
.shade-dark {
  background: color-mix(in oklch, var(--brand) 80%, black);
}
```

This enables a single `--brand` token to generate an entire scale dynamically.

### Hover and Focus States Without Explicit Tokens

```css
.button {
  background: var(--brand-500);
}
.button:hover {
  background: color-mix(in oklch, var(--brand-500) 85%, black);
}
.button:active {
  background: color-mix(in oklch, var(--brand-500) 70%, black);
}
```

No need to define `--brand-600` and `--brand-700` explicitly — derive them at runtime.

### Color Space Matters in color-mix

Different color spaces produce different mix results:

```css
/* sRGB mix: can produce muddy intermediate colors */
color-mix(in srgb, oklch(0.6 0.2 30), oklch(0.6 0.2 270))

/* oklch mix: travels through the hue wheel naturally */
color-mix(in oklch, oklch(0.6 0.2 30), oklch(0.6 0.2 270))

/* oklch shorter hue: takes shortest arc around hue wheel */
color-mix(in oklch shorter hue, oklch(0.6 0.2 30), oklch(0.6 0.2 270))
```

For UI colors, `oklch` or `oklch shorter hue` produces the most visually natural mixes.

---

## Relative Color Syntax

Relative colors let you derive a new color from an existing one by modifying specific channels.

```css
/* Syntax: from <origin-color> <space> <channel-expressions> */
color: oklch(from var(--brand) L C calc(H + 30));
```

### Channel Manipulation

```css
:root { --brand: oklch(0.55 0.22 250); }

/* Lighter version: increase L */
.light { color: oklch(from var(--brand) calc(L + 0.2) C H); }

/* Desaturated: reduce C */
.muted { color: oklch(from var(--brand) L calc(C * 0.4) H); }

/* Complementary: opposite hue */
.complement { color: oklch(from var(--brand) L C calc(H + 180)); }

/* Semi-transparent: add alpha */
.ghost { color: oklch(from var(--brand) L C H / 0.15); }

/* Analogous: adjacent hue */
.analogous { color: oklch(from var(--brand) L C calc(H + 30)); }
```

### Deriving a Full Scale from One Token

```css
:root {
  --brand: oklch(0.55 0.22 250);

  --brand-50:  oklch(from var(--brand) 0.97 calc(C * 0.05) H);
  --brand-100: oklch(from var(--brand) 0.93 calc(C * 0.15) H);
  --brand-200: oklch(from var(--brand) 0.86 calc(C * 0.35) H);
  --brand-300: oklch(from var(--brand) 0.76 calc(C * 0.55) H);
  --brand-400: oklch(from var(--brand) 0.65 calc(C * 0.75) H);
  --brand-500: var(--brand);
  --brand-600: oklch(from var(--brand) calc(L - 0.09) C H);
  --brand-700: oklch(from var(--brand) calc(L - 0.17) C H);
  --brand-800: oklch(from var(--brand) calc(L - 0.25) C H);
  --brand-900: oklch(from var(--brand) calc(L - 0.33) C H);
}
```

Change `--brand` and the entire scale recalculates. Theme switching becomes a one-line change.

---

## light-dark()

`light-dark()` is a CSS function that returns one of two values depending on the user's color scheme preference. It requires `color-scheme` to be declared.

```css
:root {
  color-scheme: light dark;
}

.element {
  /* Returns first value in light mode, second in dark mode */
  background: light-dark(#ffffff, #0f172a);
  color: light-dark(#0f172a, #f8fafc);
  border-color: light-dark(#e2e8f0, #334155);
}
```

### With oklch tokens

```css
:root {
  color-scheme: light dark;
  --bg: light-dark(oklch(0.99 0 0), oklch(0.13 0.01 250));
  --text: light-dark(oklch(0.15 0.01 250), oklch(0.95 0.01 250));
  --muted: light-dark(oklch(0.96 0.005 250), oklch(0.20 0.015 250));
}
```

This is cleaner than duplicating all tokens in a `.dark` class selector.

### Combining light-dark with color-mix

```css
:root {
  color-scheme: light dark;
  --brand: oklch(0.55 0.22 250);
  --brand-surface: light-dark(
    color-mix(in oklch, var(--brand) 10%, white),
    color-mix(in oklch, var(--brand) 20%, black)
  );
}
```

---

## Dynamic Color Systems

Combining oklch, color-mix, relative colors, and CSS custom properties enables a complete dynamic color system:

```css
:root {
  color-scheme: light dark;

  /* Single source of truth */
  --brand-hue: 250;
  --brand-chroma: 0.22;
  --brand: oklch(0.55 var(--brand-chroma) var(--brand-hue));

  /* Semantic tokens derived from brand */
  --color-primary:          var(--brand);
  --color-primary-hover:    color-mix(in oklch, var(--brand) 85%, black);
  --color-primary-surface:  light-dark(
    color-mix(in oklch, var(--brand) 8%, white),
    color-mix(in oklch, var(--brand) 15%, black)
  );

  /* Neutrals harmonized with brand hue */
  --color-bg:       light-dark(oklch(0.99 0.003 var(--brand-hue)), oklch(0.13 0.005 var(--brand-hue)));
  --color-surface:  light-dark(oklch(0.97 0.004 var(--brand-hue)), oklch(0.17 0.008 var(--brand-hue)));
  --color-border:   light-dark(oklch(0.88 0.005 var(--brand-hue)), oklch(0.28 0.010 var(--brand-hue)));
  --color-text:     light-dark(oklch(0.15 0.010 var(--brand-hue)), oklch(0.93 0.005 var(--brand-hue)));
}
```

To re-theme: change `--brand-hue` and `--brand-chroma`. Everything else adapts.

---

## Browser Support

| Feature | Chrome | Firefox | Safari |
|---|---|---|---|
| `oklch()` | 111+ | 113+ | 15.4+ |
| `color-mix()` | 111+ | 113+ | 16.2+ |
| Relative color syntax | 119+ | 128+ | 16.4+ |
| `light-dark()` | 123+ | 120+ | 17.5+ |

For production: all features have sufficient coverage for 2025+ projects targeting modern browsers. Provide `hsl` fallbacks for legacy support if required:

```css
.button {
  background: hsl(210, 90%, 45%);  /* fallback */
  background: oklch(0.55 0.22 250); /* modern */
}
```

---

## Quick Reference

- **oklch()**: perceptually uniform; equal L steps = equal brightness; enables wide gamut; use instead of hsl for design systems
- **color-mix()**: mix two colors at runtime; derive hover/active states; generate tints/shades from one token
- **Relative colors**: mutate specific channels of an existing color; derive full scales from one `--brand` token
- **light-dark()**: inline light/dark values without a `.dark` class; requires `color-scheme` declaration
- **Color space in color-mix**: use `oklch` or `oklch shorter hue` for natural-looking mixes
- **Dynamic theming**: combine oklch + relative colors + CSS custom properties for a single-token theme system
- **Fallbacks**: provide `hsl` or hex fallback before `oklch` for pre-111 Chrome support
