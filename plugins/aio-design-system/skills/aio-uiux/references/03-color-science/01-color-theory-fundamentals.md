# Color Theory Fundamentals

## The Color Wheel

The color wheel is the foundational model for understanding color relationships. It organizes hues in a circular arrangement that mirrors how human vision perceives color transitions.

### Primary Colors (Traditional RYB Model)
Used in traditional painting and pigment mixing:
- **Red** — pure, strong, warm
- **Yellow** — light, energetic, warm
- **Blue** — cool, deep, calm

### Primary Colors (Light/Digital RGB Model)
Used in screens, digital design, and CSS:
- **Red** (0°)
- **Green** (120°)
- **Blue** (240°)

### Secondary Colors
Formed by mixing two primaries:
- **Orange** = Red + Yellow (30° in HSL)
- **Violet/Purple** = Red + Blue (270° in HSL)
- **Green** = Yellow + Blue (120° in HSL)

### Tertiary Colors
Formed by mixing a primary with an adjacent secondary:
- Red-Orange, Yellow-Orange, Yellow-Green
- Blue-Green (Teal/Cyan), Blue-Violet (Indigo), Red-Violet (Magenta)

```css
/* Hue positions on HSL wheel */
--red:         hsl(0, 100%, 50%);
--orange:      hsl(30, 100%, 50%);
--yellow:      hsl(60, 100%, 50%);
--yellow-green:hsl(90, 100%, 50%);
--green:       hsl(120, 100%, 50%);
--teal:        hsl(150, 100%, 50%);
--cyan:        hsl(180, 100%, 50%);
--sky:         hsl(210, 100%, 50%);
--blue:        hsl(240, 100%, 50%);
--indigo:      hsl(270, 100%, 50%);
--violet:      hsl(300, 100%, 50%);
--magenta:     hsl(330, 100%, 50%);
```

---

## Warm vs. Cool Colors

### Warm Colors (0°–60° and 300°–360°)
Reds, oranges, yellows, and red-violets. Associated with:
- Fire, sun, warmth, energy
- Advance visually (appear closer/larger)
- Higher perceived arousal and urgency
- Better for CTAs, alerts, promotions

### Cool Colors (150°–270°)
Blues, greens, cyans, and blue-violets. Associated with:
- Water, sky, nature, calm
- Recede visually (appear farther/smaller)
- Lower perceived arousal, trustworthy, stable
- Better for backgrounds, corporate, healthcare

### Neutral Colors
Blacks, whites, grays, beiges, and browns. They:
- Do not compete with hued colors
- Provide visual breathing room
- Allow other colors to dominate
- Create sophistication when used exclusively

```css
/* Warm palette */
:root {
  --warm-50:  oklch(97% 0.02 60);
  --warm-500: oklch(65% 0.18 40);
  --warm-900: oklch(25% 0.08 30);
}

/* Cool palette */
:root {
  --cool-50:  oklch(97% 0.02 240);
  --cool-500: oklch(55% 0.18 240);
  --cool-900: oklch(20% 0.06 240);
}
```

---

## Color Temperature

Color temperature (measured in Kelvin) describes the warmth/coolness of light sources. This bleeds into UI perception:

| Temperature | Description | Hex Range |
|-------------|-------------|-----------|
| 1700K | Candlelight | Deep amber |
| 3000K | Warm white (incandescent) | Warm white |
| 4000K | Cool white (fluorescent) | Neutral white |
| 5500K | Daylight | Near-white |
| 7000K+ | Overcast sky | Cool blue-white |

**In UI design**, warm-tinted backgrounds (#faf8f5, warm gray) feel cozy and editorial. Cool-tinted backgrounds (#f5f8fa, cool gray) feel clinical and technical. Pure white (#ffffff) feels sterile; pure black (#000000) feels harsh — both should be avoided in body areas.

```css
/* Warm-tinted neutrals (feels editorial, human) */
--surface-warm: oklch(98% 0.008 80);   /* warm white */
--text-warm:    oklch(15% 0.015 70);   /* warm near-black */

/* Cool-tinted neutrals (feels technical, modern) */
--surface-cool: oklch(98% 0.008 240);  /* cool white */
--text-cool:    oklch(15% 0.015 250);  /* cool near-black */
```

---

## Hue, Saturation, and Lightness (HSL)

The three dimensions that define any color:

### Hue (H)
The "what color" — angle on the color wheel (0–360°).
- 0° / 360° = Red
- 120° = Green
- 240° = Blue

### Saturation (S)
The "how colorful" — intensity from gray to pure hue (0%–100%).
- 0% = grayscale
- 100% = fully saturated, vivid

### Lightness (L)
The "how bright" — scale from black to white (0%–100%).
- 0% = black
- 50% = pure hue
- 100% = white

```css
/* HSL examples */
hsl(220, 80%, 55%)  /* vivid blue */
hsl(220, 30%, 55%)  /* muted steel blue */
hsl(220, 80%, 85%)  /* light vivid blue */
hsl(220, 80%, 25%)  /* dark vivid blue */
hsl(0, 0%, 50%)     /* pure medium gray */
```

### The HSL Limitation
HSL is not perceptually uniform — a yellow at 50% lightness looks much brighter than a blue at 50% lightness. This is why oklch is preferred for systematic design work (see file 03).

---

## Color Meaning and Emotion

Color associations are partly universal (tied to natural phenomena) and partly cultural. Core emotional associations:

### Red
- **Universal**: blood, fire, danger, stop
- **Emotions**: urgency, passion, excitement, anger, love
- **UI use**: errors, alerts, destructive actions, sale badges, CTAs for urgency
- **Avoid**: overuse causes alarm fatigue; too much red in calm contexts (healthcare, finance) feels inappropriate

```css
--color-error:   oklch(55% 0.22 25);   /* accessible red */
--color-urgent:  oklch(50% 0.20 30);   /* alert red */
--color-love:    oklch(60% 0.18 10);   /* warm romantic red */
```

### Orange
- **Universal**: fire, sunset, harvest
- **Emotions**: energy, warmth, enthusiasm, creativity, friendliness
- **UI use**: CTAs (high-energy without alarm), food brands, creative tools, onboarding highlights

### Yellow
- **Universal**: sun, warmth, caution (in Western signage)
- **Emotions**: optimism, happiness, attention, warmth
- **UI use**: warnings (WCAG: yellow requires dark text), highlights, constructive notices
- **Caution**: pure yellow on white is nearly invisible — always pair with dark text

```css
--color-warning: oklch(75% 0.18 85);   /* golden yellow — readable with dark text */
--color-warning-text: oklch(20% 0.05 80);
```

### Green
- **Universal**: nature, growth, go (traffic light)
- **Emotions**: success, health, safety, growth, envy
- **UI use**: success states, confirmations, health/wellness, environmental brands, financial gains

```css
--color-success: oklch(55% 0.18 150);  /* balanced green */
```

### Blue
- **Universal**: sky, water, depth
- **Emotions**: trust, calm, stability, competence, sadness
- **UI use**: primary brand color for tech/finance/healthcare, links (convention), informational states
- **Most universally liked color** — safe default for B2B, enterprise, government

```css
--color-info:    oklch(55% 0.18 240);  /* clear blue */
--color-primary: oklch(50% 0.20 255);  /* brand blue */
```

### Purple
- **Universal**: historically rare pigment → luxury
- **Emotions**: creativity, royalty, mystery, spirituality, wisdom
- **UI use**: creative tools (Figma, Twitch), luxury brands, beauty/wellness, adult learning

### Pink
- **Emotions**: playfulness, romance, nurturing, softness
- **UI use**: fashion, beauty, food, children's products, feminine-coded brands
- **Hot pink**: energy, boldness — used in Neo-brutalism

### Black
- **Emotions**: sophistication, power, elegance, mystery, authority
- **UI use**: luxury brands, fashion, editorial, developer tools (dark mode)

### White
- **Emotions**: cleanliness, simplicity, minimalism, space
- **UI use**: dominant background in light mode, negative space, breathing room

### Gray
- **Emotions**: neutrality, balance, professionalism
- **UI use**: body text (not pure black), disabled states, borders, secondary elements

---

## Cultural Color Associations

Color meaning varies significantly across cultures. Key differences:

| Color | Western | East Asian | Middle Eastern | South Asian |
|-------|---------|------------|----------------|-------------|
| White | Purity, wedding | Mourning, death | Purity | Mourning |
| Red | Danger, love | Luck, celebration | Danger, caution | Celebration |
| Green | Nature, go | Future, youth | Islam, sacred | Prosperity |
| Yellow | Caution, happiness | Imperial, sacred | Happiness | Sacred |
| Blue | Trust, calm | Immortality | Protection, heaven | Divinity |
| Black | Death, luxury | Evil, guilt | Death | Evil |
| Purple | Royalty, luxury | Wealth | Royalty | Sorrow |

**Design implication**: for global products, research target markets. For ambiguous contexts, test with users from different cultures before committing to a color-coded meaning.

---

## CSS Color Functions

### Legacy Functions (still widely used)
```css
/* RGB — red, green, blue values 0-255 or 0-100% */
color: rgb(59, 130, 246);
color: rgb(23% 51% 96%);

/* RGBA — with alpha channel 0-1 */
color: rgba(59, 130, 246, 0.8);

/* HSL — hue degrees, saturation %, lightness % */
color: hsl(220, 80%, 55%);
color: hsl(220deg 80% 55%);

/* HSLA — with alpha */
color: hsla(220, 80%, 55%, 0.5);
```

### Modern Functions (CSS Color Level 4+)
```css
/* Space-separated syntax (preferred) */
color: rgb(59 130 246);
color: rgb(59 130 246 / 80%);   /* alpha as percentage */
color: hsl(220 80% 55%);
color: hsl(220 80% 55% / 0.5);

/* oklch — perceptually uniform (recommended) */
color: oklch(60% 0.20 255);
color: oklch(60% 0.20 255 / 80%);

/* oklab — for color mixing */
color: oklab(0.60 -0.05 -0.15);

/* Display P3 — wider gamut on supported screens */
color: color(display-p3 0.2 0.5 0.9);

/* Relative color syntax (CSS Color Level 5) */
color: oklch(from var(--brand-color) calc(l - 0.1) c h);
```

### Color Keywords
```css
/* Named colors (CSS Level 1-4) */
color: rebeccapurple;
color: hotpink;
color: cornflowerblue;

/* System colors — respect OS preferences */
color: Canvas;           /* background */
color: CanvasText;       /* text on background */
color: ButtonFace;       /* button background */
color: ButtonText;       /* button text */
color: Highlight;        /* selected items */
color: HighlightText;    /* text in selected items */
color: LinkText;         /* unvisited links */
color: VisitedText;      /* visited links */
```

### currentColor Keyword
```css
/* Inherits color property value */
.icon {
  color: var(--text-primary);
  fill: currentColor;   /* SVG fills match text color */
  border-color: currentColor;
}
```

---

## Practical Quick Reference

**Choosing a hue for intent:**
- CTA / action: orange-red (warm, energetic)
- Trust / primary brand: blue 220-250°
- Success confirmation: green 140-160°
- Warning: yellow 70-90° (always dark text)
- Error / danger: red 15-30°
- Info / neutral: blue-cyan 200-220°
- Premium / creative: purple 270-310°

**Rule of 60-30-10:**
- 60% dominant neutral (background, surfaces)
- 30% secondary color (structural elements, cards)
- 10% accent/brand (CTAs, highlights, key moments)

**Rule of simultaneous contrast:**
Colors appear differently depending on their surroundings. A gray square on a blue background looks orange-tinted; the same gray on an orange background looks blue-tinted. Account for this when placing colors adjacent to each other.
