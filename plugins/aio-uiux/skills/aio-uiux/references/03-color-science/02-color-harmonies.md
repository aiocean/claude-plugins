# Color Harmonies

Color harmonies are systematic relationships between hues on the color wheel that produce aesthetically pleasing combinations. Each harmony creates a distinct mood and serves different design purposes.

---

## Monochromatic

**Definition**: Single hue, varied in saturation and lightness.

**Mood**: Cohesive, sophisticated, calm, focused, unified.

**Best for**: Minimal UIs, hero sections, brand moments, photography contexts where the image provides color variety.

**Risk**: Can feel flat or monotonous without enough contrast variation.

**How to use**: Choose a base hue. Create 8-12 stops varying lightness from near-white to near-black. Vary saturation slightly (higher saturation at mid-tones, lower at extremes for naturalism).

```css
/* Monochromatic blue system */
:root {
  --blue-50:  oklch(97% 0.03 255);  /* near white, cool tint */
  --blue-100: oklch(93% 0.06 255);
  --blue-200: oklch(86% 0.10 255);
  --blue-300: oklch(76% 0.14 255);
  --blue-400: oklch(65% 0.18 255);
  --blue-500: oklch(55% 0.22 255);  /* base brand blue */
  --blue-600: oklch(46% 0.20 255);
  --blue-700: oklch(38% 0.17 255);
  --blue-800: oklch(28% 0.12 255);
  --blue-900: oklch(20% 0.08 255);
  --blue-950: oklch(14% 0.05 255);
}

/* Usage in a monochromatic hero */
.hero {
  background: var(--blue-50);
  border-bottom: 1px solid var(--blue-200);
}

.hero__heading {
  color: var(--blue-900);
}

.hero__body {
  color: var(--blue-700);
}

.hero__cta {
  background: var(--blue-600);
  color: var(--blue-50);
}

.hero__cta:hover {
  background: var(--blue-700);
}
```

---

## Analogous

**Definition**: 2-4 hues adjacent on the color wheel (within 30-90° of each other).

**Mood**: Harmonious, natural, peaceful, organic. Appears in nature frequently.

**Best for**: Background gradients, brand palettes with warmth or coolness as a consistent tone, landing pages, editorial design.

**Risk**: Lacks contrast — needs one hue to dominate (60%), one to support (30%), and one as accent (10%).

**How to use**: Pick a primary hue, then select 1-2 neighbors. Use the primary for dominant surfaces, the adjacent hue for structural elements, and the furthest for accents.

```css
/* Analogous: green-teal-blue */
:root {
  --green:  oklch(60% 0.18 155);   /* 155° */
  --teal:   oklch(58% 0.18 185);   /* 185° */
  --blue:   oklch(55% 0.18 215);   /* 215° */
}

/* Analogous: warm orange-yellow */
:root {
  --amber:  oklch(70% 0.18 75);    /* 75° */
  --orange: oklch(65% 0.20 50);    /* 50° */
  --red-orange: oklch(58% 0.22 30);/* 30° */
}

/* Gradient from analogous palette */
.gradient-hero {
  background: linear-gradient(
    135deg,
    oklch(70% 0.15 155),  /* green */
    oklch(65% 0.18 185),  /* teal */
    oklch(58% 0.20 215)   /* blue */
  );
}

/* Analogous card system */
.card--primary   { background: oklch(95% 0.06 155); border-color: oklch(85% 0.10 155); }
.card--secondary { background: oklch(95% 0.06 185); border-color: oklch(85% 0.10 185); }
.card--tertiary  { background: oklch(95% 0.06 215); border-color: oklch(85% 0.10 215); }
```

---

## Complementary

**Definition**: Two hues directly opposite on the color wheel (180° apart).

**Mood**: High contrast, vibrant, energetic, bold. Can feel jarring if both are fully saturated.

**Best for**: CTAs that must stand out from the brand color, emphasis moments, sports/gaming UI, sale/promotion highlights.

**Risk**: Harsh when both colors are at full saturation. Use one as dominant (desaturated) and the other as a vibrant accent.

**Classic pairings**:
- Blue / Orange (most popular — corporate + energetic)
- Red / Green (holiday, but also problematic for color blindness)
- Purple / Yellow
- Teal / Coral

```css
/* Blue-Orange complementary system */
:root {
  /* Dominant: blue tones (cool, calm backgrounds) */
  --brand-blue:       oklch(50% 0.22 255);
  --brand-blue-light: oklch(93% 0.06 255);
  --brand-blue-dark:  oklch(28% 0.14 255);

  /* Accent: orange (warm, energetic CTAs) */
  --accent-orange:        oklch(68% 0.20 50);
  --accent-orange-hover:  oklch(60% 0.22 50);
  --accent-orange-light:  oklch(93% 0.06 50);
}

/* CTA button using complementary accent */
.btn-primary {
  background: var(--accent-orange);
  color: oklch(15% 0.03 50);   /* dark warm text */
  border: none;
}

.btn-primary:hover {
  background: var(--accent-orange-hover);
}

/* Page using blue domain with orange accents */
body {
  background: var(--brand-blue-light);
  color: var(--brand-blue-dark);
}

.highlight {
  background: oklch(95% 0.06 50);
  border-left: 3px solid var(--accent-orange);
}
```

---

## Split-Complementary

**Definition**: A base hue plus two hues adjacent to its complement (the complement's two neighbors, roughly 150° and 210° from the base).

**Mood**: High contrast but more nuanced than pure complementary. Retains visual interest without the tension of direct opposites.

**Best for**: When complementary feels too harsh but you still want contrast. Product UIs, dashboards, applications with multiple interaction states.

**Advantage over complementary**: Three hues give more variety while one of the non-base colors still provides strong contrast.

```css
/* Base: blue (240°) → Complement: orange (60°) → Split: yellow-green (90°) + red-orange (30°) */
:root {
  --base:         oklch(52% 0.22 240);   /* blue */
  --split-warm:   oklch(70% 0.18 30);    /* red-orange */
  --split-warm-2: oklch(72% 0.16 90);    /* yellow-green */
}

/* Base: purple (285°) → Complement: yellow (105°) → Split: lime (135°) + gold (75°) */
:root {
  --base:     oklch(50% 0.22 285);
  --split-a:  oklch(70% 0.18 135);   /* lime */
  --split-b:  oklch(72% 0.18 75);    /* gold */
}

/* Usage: multi-state dashboard */
.metric--primary   { color: var(--base); }
.metric--secondary { color: var(--split-a); }
.metric--tertiary  { color: var(--split-b); }

.badge--type-a { background: oklch(94% 0.06 240); color: var(--base); }
.badge--type-b { background: oklch(94% 0.06 30);  color: oklch(35% 0.15 30); }
.badge--type-c { background: oklch(94% 0.06 90);  color: oklch(35% 0.12 90); }
```

---

## Triadic

**Definition**: Three hues evenly spaced around the wheel (120° apart).

**Mood**: Vibrant, playful, balanced. The three-way tension creates dynamic energy.

**Best for**: Children's products, creative tools, social platforms, anything needing vibrancy with balance. Avoid in contexts requiring calm or seriousness.

**Classic triads**:
- Red / Yellow / Blue (primary)
- Orange / Green / Violet (secondary)
- Any rotation of these principles

**How to use**: Use one color for 60%, one for 30%, one for 10%. Desaturate two and keep the third vivid to prevent overwhelming the eye.

```css
/* Secondary triad: orange / green / violet */
:root {
  --triad-orange: oklch(68% 0.20 50);
  --triad-green:  oklch(60% 0.18 155);
  --triad-violet: oklch(55% 0.22 285);
}

/* Balanced usage: green dominant, orange secondary, violet accent */
.layout {
  --dominant:  var(--triad-green);
  --secondary: var(--triad-orange);
  --accent:    var(--triad-violet);
}

/* Playful card grid */
.card:nth-child(3n+1) .card__icon { color: var(--triad-orange); }
.card:nth-child(3n+2) .card__icon { color: var(--triad-green); }
.card:nth-child(3n+3) .card__icon { color: var(--triad-violet); }

/* Toned-down version — desaturated backgrounds with vivid icon only */
.feature-card {
  background: oklch(97% 0.02 155);  /* very light green tint */
}

.feature-card__icon {
  color: var(--triad-violet);        /* vivid accent on neutral */
}
```

---

## Tetradic (Square / Rectangle)

**Definition**: Four hues evenly spaced (90° apart for square) or as two complementary pairs (rectangle).

**Mood**: Rich, complex, versatile. Most challenging harmony to balance.

**Best for**: Complex design systems needing four distinct color roles (primary, secondary, accent, warning), data visualization, brand systems with multiple product lines.

**Risk**: Overwhelming if all four are used at equal weight. One must dominate, the others support.

```css
/* Square tetradic: 0° 90° 180° 270° */
:root {
  --tet-red:    oklch(55% 0.22 15);    /* 0-15° */
  --tet-yellow: oklch(72% 0.18 90);    /* 90° */
  --tet-teal:   oklch(58% 0.18 195);   /* 180-195° */
  --tet-purple: oklch(52% 0.22 285);   /* 270-285° */
}

/* Rectangle tetradic: two complementary pairs offset by 60° */
:root {
  --rect-blue:   oklch(52% 0.22 240);  /* primary */
  --rect-orange: oklch(68% 0.20 60);   /* complement */
  --rect-violet: oklch(52% 0.20 300);  /* secondary */
  --rect-gold:   oklch(70% 0.18 120);  /* its complement */
}

/* System tokens using tetradic roles */
:root {
  --color-primary:   var(--tet-teal);    /* 60% — dominant */
  --color-secondary: var(--tet-purple);  /* 30% — structural */
  --color-warning:   var(--tet-yellow);  /* 5% — alerts */
  --color-error:     var(--tet-red);     /* 5% — errors */
}
```

---

## Building Palettes from Harmonies

### Step 1: Choose a base hue
Start with brand requirements, industry conventions, or emotional intent.

### Step 2: Select a harmony type
| Goal | Harmony |
|------|---------|
| Calm, focused, premium | Monochromatic |
| Natural, warm/cool consistency | Analogous |
| Strong contrast, clear CTA | Complementary |
| Contrast with nuance | Split-complementary |
| Playful, vibrant | Triadic |
| Complex system, many roles | Tetradic |

### Step 3: Generate full shade scales for each hue
For each hue in your harmony, generate 9-12 lightness steps (50 to 950).

### Step 4: Map to semantic tokens
Don't use raw palette values in components. Create semantic tokens (see file 05).

```css
/* Complete palette generation from complementary harmony */
:root {
  /* Brand blue — primary */
  --blue-50:  oklch(97% 0.03 255);
  --blue-500: oklch(55% 0.22 255);
  --blue-900: oklch(18% 0.08 255);

  /* Complementary orange — accent */
  --orange-50:  oklch(97% 0.03 55);
  --orange-500: oklch(68% 0.20 55);
  --orange-900: oklch(25% 0.08 55);

  /* Neutral (desaturated, slight blue lean for cohesion) */
  --neutral-50:  oklch(98% 0.005 255);
  --neutral-500: oklch(55% 0.01 255);
  --neutral-900: oklch(15% 0.01 255);
}

/* Semantic layer */
:root {
  --color-bg:       var(--neutral-50);
  --color-text:     var(--neutral-900);
  --color-primary:  var(--blue-500);
  --color-accent:   var(--orange-500);
}
```

---

## Harmony Quick-Selection Guide

**E-commerce**: Complementary (brand + high-contrast CTA)
**SaaS dashboard**: Monochromatic + one accent for actions
**Social/community app**: Triadic (vibrant, lively)
**Healthcare/finance**: Analogous cool tones (calm, trustworthy)
**Creative tools**: Split-complementary or tetradic
**Editorial/news**: Near-monochromatic with one vivid accent
**Children's app**: Triadic at high saturation
**Luxury brand**: Monochromatic dark/gold with minimal accents
**Developer tools**: Cool monochromatic dark mode, orange/green accents

---

## Color Harmony in oklch()

oklch is ideal for harmony work because hue spacing is perceptually uniform — 30° apart in oklch looks 30° apart to human eyes (unlike HSL, where the same rotation produces different perceptual steps).

```css
/* All complementary pairs in oklch (180° hue difference) */
oklch(55% 0.20 240) and oklch(55% 0.20 60)   /* blue + orange */
oklch(55% 0.20 280) and oklch(55% 0.20 100)  /* violet + yellow-green */
oklch(55% 0.20 160) and oklch(55% 0.20 340)  /* teal + pink */

/* Triadic spacing (120° apart) */
oklch(55% 0.20 0)   /* red */
oklch(55% 0.20 120) /* green */
oklch(55% 0.20 240) /* blue */

/* Calculate harmonies with relative color syntax */
:root {
  --brand: oklch(55% 0.20 240);

  /* Complementary: add 180° to hue */
  --complement: oklch(from var(--brand) l c calc(h + 180));

  /* Triadic partners */
  --triadic-1: oklch(from var(--brand) l c calc(h + 120));
  --triadic-2: oklch(from var(--brand) l c calc(h + 240));

  /* Split complementary */
  --split-1: oklch(from var(--brand) l c calc(h + 150));
  --split-2: oklch(from var(--brand) l c calc(h + 210));

  /* Analogous neighbors */
  --analogous-1: oklch(from var(--brand) l c calc(h + 30));
  --analogous-2: oklch(from var(--brand) l c calc(h - 30));
}
```

Note: The relative color `calc(h + 180)` approach requires CSS Color Level 5 support. As of 2024, supported in Chrome 119+, Safari 16.4+, Firefox 128+. Use with `@supports` for progressive enhancement.
