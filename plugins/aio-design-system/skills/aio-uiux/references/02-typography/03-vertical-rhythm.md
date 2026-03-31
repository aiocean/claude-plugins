# Vertical Rhythm

## The Concept

Vertical rhythm is the practice of spacing text elements so their baselines fall on a consistent invisible grid. When you read a page with good vertical rhythm, text in adjacent columns aligns, spacing between elements feels proportional, and the page has a settled, calm quality. When rhythm breaks, the eye notices gaps that feel too large or too small.

The baseline grid is derived from the body text line-height. If your body text is 16px with a line-height of 1.5, the grid unit is 24px (16 × 1.5). Every spacing value — margins, paddings, gaps — should be a multiple of this unit: 24px, 48px, 72px, 12px (half unit).

This is more achievable in print than on the web, but a web approximation produces noticeable improvement in visual coherence.

---

## Line-Height as the Foundation

### Choosing Line-Height

Line-height is relative to font-size. A unitless value (1.5) is the most robust because it scales with the font.

| Context              | Recommended Line-Height |
|----------------------|------------------------|
| Display / Hero text  | 1.0 – 1.2              |
| Headings             | 1.2 – 1.35             |
| Subheadings          | 1.3 – 1.45             |
| Body text            | 1.5 – 1.65             |
| Small text / captions| 1.4 – 1.5              |
| Code blocks          | 1.6 – 1.8              |

Larger fonts need tighter line-height; smaller fonts need looser line-height. This is why setting a single line-height value for all elements breaks rhythm — a 48px heading with line-height 1.5 has 72px of line height, which is almost certainly too spacious.

### Computing the Grid Unit

```
base-font-size  = 16px
line-height     = 1.5
grid-unit       = 16px × 1.5 = 24px
```

All vertical spacing in the system should be multiples of 24px:
- Half unit:    12px
- 1 unit:       24px
- 1.5 units:    36px
- 2 units:      48px
- 3 units:      72px
- 4 units:      96px

---

## CSS Implementation

### Step 1: Define the Grid Unit as a Custom Property

```css
:root {
  --font-size-base: 1rem;       /* 16px */
  --line-height-base: 1.5;
  --rhythm-unit: 1.5rem;        /* 16px × 1.5 = 24px */

  /* Derived spacers — multiples of the rhythm unit */
  --space-half:   calc(var(--rhythm-unit) * 0.5);   /* 12px */
  --space-1:      var(--rhythm-unit);                /* 24px */
  --space-1-5:    calc(var(--rhythm-unit) * 1.5);   /* 36px */
  --space-2:      calc(var(--rhythm-unit) * 2);     /* 48px */
  --space-3:      calc(var(--rhythm-unit) * 3);     /* 72px */
  --space-4:      calc(var(--rhythm-unit) * 4);     /* 96px */
  --space-6:      calc(var(--rhythm-unit) * 6);     /* 144px */
}
```

### Step 2: Set Body Text Line-Height

```css
body {
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}
```

### Step 3: Heading Line-Heights Must Return to Grid

A heading's total height (font-size × line-height) should equal a whole number of grid units. This is where it gets mathematical.

```
Heading font-size: 28px (1.75rem)
Grid unit: 24px

Nearest multiple of 24 that fits 28px: 48px (2 units)
Required line-height: 48 / 28 = 1.714
```

In practice, you won't hit exact integers always. Aim for the nearest clean multiple and accept minor drift on complex layouts.

```css
h1 {
  font-size: 2.5rem;      /* 40px */
  line-height: 1.2;       /* 48px = 2 grid units. ✓ */
  margin-bottom: var(--space-1);
}

h2 {
  font-size: 2rem;        /* 32px */
  line-height: 1.5;       /* 48px = 2 grid units. ✓ */
  margin-bottom: var(--space-1);
}

h3 {
  font-size: 1.5rem;      /* 24px */
  line-height: 1.5;       /* 36px = 1.5 grid units. ✓ */
  margin-bottom: var(--space-half);
}

h4 {
  font-size: 1.25rem;     /* 20px */
  line-height: 1.4;       /* 28px — not a clean multiple, acceptable */
  margin-bottom: var(--space-half);
}

p {
  font-size: 1rem;        /* 16px */
  line-height: 1.5;       /* 24px = 1 grid unit. ✓ */
  margin-bottom: var(--space-1);
}
```

### Step 4: Spacing All Other Elements on the Grid

```css
/* Block elements */
blockquote {
  padding: var(--space-1) var(--space-1-5);
  margin: var(--space-2) 0;
  border-left: 4px solid currentColor;
}

pre {
  padding: var(--space-1);
  margin: var(--space-2) 0;
  line-height: 1.75; /* code needs generous spacing */
}

ul, ol {
  margin-bottom: var(--space-1);
  padding-left: var(--space-1-5);
}

li {
  margin-bottom: var(--space-half);
  line-height: var(--line-height-base);
}

/* Horizontal rules */
hr {
  margin: var(--space-3) 0;
  border: none;
  border-top: 1px solid;
}

/* Images and figures */
figure {
  margin: var(--space-2) 0;
}

figcaption {
  margin-top: var(--space-half);
  font-size: 0.875rem;
  line-height: 1.5;
}
```

---

## Modular Scale for Spacing

The same ratio used for type can be applied to spacing, creating a coherent spatial rhythm that ties together typography and layout.

Using Minor Third (1.2) with a 4px base:

```css
:root {
  /* Spatial scale — Minor Third from 4px */
  --space-1:  4px;    /* 4 * 1.2^0 */
  --space-2:  5px;    /* 4 * 1.2^1 */
  --space-3:  6px;    /* 4 * 1.2^2 */
  --space-4:  7px;    /* 4 * 1.2^3 */
  --space-5:  8px;    /* 4 * 1.2^4 — approximately */
  --space-6:  10px;   /* 4 * 1.2^5 */
  --space-7:  12px;   /* 4 * 1.2^6 */
  --space-8:  14px;   /* 4 * 1.2^7 */
  --space-9:  17px;   /* 4 * 1.2^8 */
  --space-10: 20px;   /* 4 * 1.2^9 */
  --space-11: 24px;   /* = 1 rhythm unit */
  --space-12: 29px;
  --space-13: 35px;
  --space-14: 42px;
  --space-15: 50px;
  --space-16: 60px;
  --space-17: 72px;   /* = 3 rhythm units */
}
```

**Practical 8px grid alternative** (simpler, widely used):

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-7:  32px;
  --space-8:  40px;
  --space-9:  48px;
  --space-10: 64px;
  --space-11: 80px;
  --space-12: 96px;
}
```

The 8px grid aligns with most device pixel ratios and maps cleanly to the 24px rhythm unit (3 × 8px).

---

## Maintaining Rhythm Across Elements

### The "lobotomized owl" selector

Apply consistent top margin to every element that follows another element, rather than setting margins individually on every type of element:

```css
/* Every element that follows another element gets top margin */
* + * {
  margin-top: var(--space-1);
}

/* Override for specific cases */
* + h2 { margin-top: var(--space-3); }
* + h3 { margin-top: var(--space-2); }
* + p  { margin-top: var(--space-1); }

li + li { margin-top: var(--space-half); }
```

This technique (by Heydon Pickering) keeps default spacing consistent without needing to set `margin-bottom` on every element.

### Collapsing Margins

CSS collapses vertical margins between block elements. The space between a paragraph and the next paragraph is the larger of the two margins, not the sum. This is usually what you want for rhythm, but be aware:

```css
/* These two rules produce 24px gap between paragraphs, not 48px */
p { margin-bottom: var(--space-1); } /* 24px */
p { margin-top: var(--space-1); }    /* 24px — collapses with above */

/* To prevent collapse (e.g., inside flex/grid containers): */
.flex-column > * + * {
  margin-top: var(--space-1);
  /* Flex items don't collapse margins */
}
```

### Padding vs. Margin for Rhythm

Use margin for spacing between sibling elements (subject to collapse). Use padding for internal spacing within a component. Never mix the two to create the same visual space — it makes rhythm calculation unpredictable.

---

## Debug Grid Overlay

Add this overlay to visualize your baseline grid during development. Press a key or toggle a class on `<body>`.

```css
/* Baseline grid overlay — add class="debug-grid" to body */
body.debug-grid {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent calc(var(--rhythm-unit) - 1px),
    rgba(255, 0, 0, 0.15) calc(var(--rhythm-unit) - 1px),
    rgba(255, 0, 0, 0.15) var(--rhythm-unit)
  );
}

/* Half-unit grid (more precise) */
body.debug-grid-half {
  --half: calc(var(--rhythm-unit) / 2);
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent,
      transparent calc(var(--half) - 1px),
      rgba(0, 0, 255, 0.08) calc(var(--half) - 1px),
      rgba(0, 0, 255, 0.08) var(--half)
    ),
    repeating-linear-gradient(
      to bottom,
      transparent,
      transparent calc(var(--rhythm-unit) - 1px),
      rgba(255, 0, 0, 0.2) calc(var(--rhythm-unit) - 1px),
      rgba(255, 0, 0, 0.2) var(--rhythm-unit)
    );
}
```

```javascript
// Toggle with keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'g' && e.altKey) {
    document.body.classList.toggle('debug-grid');
  }
});
```

### What to Look for in the Debug Grid

1. Paragraph baselines should land on red lines
2. Heading baselines should land on red lines (they may sit on every 2nd or 3rd line)
3. Spacing between sections should be whole-number multiples of the grid
4. If a heading baseline drifts from the grid, adjust its `line-height` by a small amount

### Bookmarklet Version

```javascript
javascript:(function(){
  var s = document.createElement('style');
  var u = getComputedStyle(document.documentElement).getPropertyValue('--rhythm-unit') || '24px';
  s.textContent = 'body{background-image:repeating-linear-gradient(to bottom,transparent,transparent calc('+u+' - 1px),rgba(255,0,0,0.2) calc('+u+' - 1px),rgba(255,0,0,0.2) '+u+')}';
  document.head.appendChild(s);
})();
```

---

## Complete Vertical Rhythm System

```css
/* =============================================
   VERTICAL RHYTHM SYSTEM
   Base: 16px / 1.5 line-height = 24px grid
   ============================================= */

:root {
  /* Foundation */
  --font-size-base:   1rem;
  --line-height-base: 1.5;
  --rhythm-unit:      1.5rem; /* 24px */

  /* Spacing scale (multiples of 24px) */
  --space-xs:  calc(var(--rhythm-unit) * 0.25);  /* 6px  */
  --space-sm:  calc(var(--rhythm-unit) * 0.5);   /* 12px */
  --space-md:  var(--rhythm-unit);                /* 24px */
  --space-lg:  calc(var(--rhythm-unit) * 1.5);   /* 36px */
  --space-xl:  calc(var(--rhythm-unit) * 2);     /* 48px */
  --space-2xl: calc(var(--rhythm-unit) * 3);     /* 72px */
  --space-3xl: calc(var(--rhythm-unit) * 4);     /* 96px */
  --space-4xl: calc(var(--rhythm-unit) * 6);     /* 144px */
}

/* Base rhythm */
html { font-size: 100%; }
body {
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

/* Headings — line-height computed to sit on grid */
h1 { font-size: 2.5rem;  line-height: 1.2;   margin-bottom: var(--space-md); }
h2 { font-size: 2rem;    line-height: 1.25;  margin-bottom: var(--space-md); }
h3 { font-size: 1.5rem;  line-height: 1.333; margin-bottom: var(--space-sm); }
h4 { font-size: 1.25rem; line-height: 1.4;   margin-bottom: var(--space-sm); }
h5 { font-size: 1.125rem;line-height: 1.5;   margin-bottom: var(--space-sm); }
h6 { font-size: 1rem;    line-height: 1.5;   margin-bottom: var(--space-sm); }

/* Block elements */
p, ul, ol, dl, blockquote, pre, table, figure {
  margin-bottom: var(--space-md);
}

/* Tight siblings */
li { margin-bottom: var(--space-xs); }

/* Section spacing */
section + section,
article + article {
  margin-top: var(--space-2xl);
}

/* Component spacing */
.card { padding: var(--space-lg); }
.card + .card { margin-top: var(--space-md); }

/* Form rhythm */
.form-group { margin-bottom: var(--space-md); }
label { margin-bottom: var(--space-xs); display: block; }
```
