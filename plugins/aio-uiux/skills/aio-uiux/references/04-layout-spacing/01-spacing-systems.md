# Spacing Systems: 4pt/8pt Grid and Token-Based Scale

## Why a Spacing System Exists

Ad-hoc spacing creates visual noise. When every component uses different margins and paddings, nothing aligns, hierarchy breaks down, and the UI feels "off" without users being able to articulate why. A spacing system solves this by constraining all spacing to a deliberate scale derived from a single base unit.

The goal: every gap, padding, margin, and offset in the UI is a value from the scale — nothing else.

---

## The Base Unit: 4px or 8px

### 4pt Grid

All spacing values are multiples of 4px.

```
4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 128
```

Best for: dense UIs, data-heavy applications, small component libraries where fine control matters (spreadsheets, IDEs, analytics dashboards).

### 8pt Grid

All spacing values are multiples of 8px (which are also multiples of 4px).

```
8, 16, 24, 32, 40, 48, 64, 80, 96, 128, 160
```

Best for: consumer products, marketing sites, design systems with fewer spacing decisions needed. Easier for designers to reason about.

### Why 4 and 8?

Most display densities render pixels in groups of 2 or 4. Multiples of 4 always land on clean pixel boundaries, avoiding sub-pixel rendering blurriness. 8pt is a subset of 4pt — they are compatible.

---

## The Standard Spacing Scale

This is the scale used by Tailwind, Material Design, and most mature design systems:

```css
:root {
  --space-1:   4px;    /* xs: icon gaps, tight inline spacing */
  --space-2:   8px;    /* sm: compact padding, list item gaps */
  --space-3:  12px;    /* md-sm: input padding, tag padding */
  --space-4:  16px;    /* md: base unit — default padding, card gaps */
  --space-6:  24px;    /* md-lg: section spacing within a card */
  --space-8:  32px;    /* lg: between components */
  --space-12: 48px;    /* xl: major section dividers */
  --space-16: 64px;    /* 2xl: page-level vertical rhythm */
  --space-24: 96px;    /* 3xl: hero sections, between page sections */
  --space-32: 128px;   /* 4xl: maximum spacing, hero vertical padding */
}
```

### Naming Strategies

**T-shirt sizes** (most common in component libraries):

```css
--space-xs:  4px;
--space-sm:  8px;
--space-md:  16px;
--space-lg:  24px;
--space-xl:  32px;
--space-2xl: 48px;
--space-3xl: 64px;
--space-4xl: 96px;
```

**Numeric scale** (more flexible, preferred for design tokens):

```css
--space-100: 4px;
--space-200: 8px;
--space-300: 12px;
--space-400: 16px;
--space-500: 24px;
--space-600: 32px;
--space-700: 48px;
--space-800: 64px;
--space-900: 96px;
```

Numeric naming allows inserting values (--space-150: 6px) without renaming the whole scale.

---

## Geometric vs Arithmetic Progression

### Arithmetic Progression

Values grow by a fixed amount: 4, 8, 12, 16, 20, 24, 28, 32...

```css
/* Arithmetic: constant delta of 4px */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
```

**Pros:** Predictable, dense, works well for small spacings (under 32px). Good for data-dense UIs.
**Cons:** At larger values, differences become proportionally smaller — 96px and 100px look the same.

### Geometric (Modular) Progression

Values grow by a fixed ratio (typically 1.5x or 2x):

```css
/* Geometric: 1.5x ratio from base 4px */
--space-1:  4px;   /* 4 × 1.5^0 */
--space-2:  6px;   /* 4 × 1.5^1 */
--space-3:  9px;   /* rounded to 8px for 8pt grid */
--space-4:  14px;  /* rounded to 16px */
--space-5:  20px;  /* or 24px */
--space-6:  32px;
--space-7:  48px;
--space-8:  72px;  /* or 64px */
--space-9:  96px;
--space-10: 128px;
```

**Pros:** Visually harmonious at all scales. Large values feel proportionally different from medium values. Mirrors how humans perceive size differences (logarithmic).
**Cons:** Values don't land cleanly on 8pt grid without rounding. Harder to memorize.

### Hybrid Approach (Recommended)

Small spacings use arithmetic (precise control), large spacings use geometric (visual harmony):

```css
:root {
  /* Arithmetic below 24px */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;

  /* Geometric above 24px (roughly 1.5x) */
  --space-8:  32px;
  --space-10: 48px;
  --space-12: 64px;
  --space-16: 96px;
  --space-20: 128px;
}
```

---

## When to Use Which Spacing Value

### The Decision Framework

Ask: what is the relationship between these two elements?

| Relationship | Spacing | Example |
|---|---|---|
| Tightly bound (same element) | 4px | Icon + label in a button |
| Related (same component) | 8px | List item internal padding |
| Grouped (same component) | 12–16px | Card internal padding |
| Sibling components | 24px | Cards in a grid |
| Sections within a page area | 32–48px | Form field groups |
| Major page sections | 64–96px | Hero to features section |
| Page-level vertical rhythm | 96–128px | Between full-width sections |

### Rule of Proximity

Elements that are more related should be closer together. Spacing communicates grouping:

```css
/* Poor: uniform spacing breaks hierarchy */
.form-section { margin-bottom: 16px; }
.form-label   { margin-bottom: 16px; }
.form-input   { margin-bottom: 16px; }

/* Better: spacing expresses structure */
.form-section { margin-bottom: 32px; } /* section-to-section */
.form-label   { margin-bottom: 4px;  } /* label belongs to input */
.form-input   { margin-bottom: 16px; } /* field-to-field */
```

### Specific Use Cases

**Touch targets:** Minimum 44×44px (Apple HIG) / 48×48dp (Material). Use padding to expand clickable area without affecting visual size.

```css
.icon-button {
  padding: 12px; /* Expands touch target to ~44px from a 20px icon */
}
```

**Input fields:** Consistent internal padding across all form elements creates visual rhythm.

```css
.input,
.select,
.textarea {
  padding: 8px 12px; /* vertical / horizontal */
}
```

**Card padding:** Should match the card's visual weight. Compact: 12px. Standard: 16px. Spacious: 24px.

**Navigation items:** Horizontal padding 12–16px, vertical padding 8–12px. Gap between items: 4–8px.

---

## Spacing and Visual Hierarchy

Spacing is one of the most powerful hierarchy signals — more powerful than color alone.

### More Space = More Important

Section titles get more space above them than below:

```css
/* More space above = "this starts something new" */
h2 {
  margin-top: 48px;
  margin-bottom: 16px;
}

h3 {
  margin-top: 32px;
  margin-bottom: 12px;
}

p {
  margin-bottom: 16px;
}
```

### Tighter Spacing = Stronger Relationship

```css
/* Label and input are tightly bound */
.field-label {
  margin-bottom: 4px; /* Nearly touching = belongs together */
}

/* Fields are related but separate */
.form-field {
  margin-bottom: 20px;
}
```

### White Space as Content

Empty space tells users "this is a distinct area." Don't fill every pixel.

```css
.page-section {
  padding-block: 80px; /* Generous padding creates distinct sections */
}

.card {
  padding: 24px; /* Card breathes, content feels premium */
}
```

---

## CSS Custom Properties: Full Token System

### Base Tokens (Primitive Values)

```css
/* primitives.css */
:root {
  /* Raw scale — don't use these directly in components */
  --primitive-space-0:   0px;
  --primitive-space-25:  2px;
  --primitive-space-50:  4px;
  --primitive-space-100: 8px;
  --primitive-space-150: 12px;
  --primitive-space-200: 16px;
  --primitive-space-250: 20px;
  --primitive-space-300: 24px;
  --primitive-space-400: 32px;
  --primitive-space-500: 40px;
  --primitive-space-600: 48px;
  --primitive-space-800: 64px;
  --primitive-space-1000: 80px;
  --primitive-space-1200: 96px;
  --primitive-space-1600: 128px;
}
```

### Semantic Tokens (Intent-Based)

```css
/* semantic-spacing.css */
:root {
  /* Component internal spacing */
  --space-component-xs:  var(--primitive-space-50);   /* 4px */
  --space-component-sm:  var(--primitive-space-100);  /* 8px */
  --space-component-md:  var(--primitive-space-150);  /* 12px */
  --space-component-lg:  var(--primitive-space-200);  /* 16px */
  --space-component-xl:  var(--primitive-space-300);  /* 24px */

  /* Layout spacing */
  --space-layout-xs:     var(--primitive-space-200);  /* 16px */
  --space-layout-sm:     var(--primitive-space-300);  /* 24px */
  --space-layout-md:     var(--primitive-space-400);  /* 32px */
  --space-layout-lg:     var(--primitive-space-600);  /* 48px */
  --space-layout-xl:     var(--primitive-space-800);  /* 64px */
  --space-layout-2xl:    var(--primitive-space-1200); /* 96px */

  /* Inline spacing (between inline elements) */
  --space-inline-xs:     var(--primitive-space-25);   /* 2px */
  --space-inline-sm:     var(--primitive-space-50);   /* 4px */
  --space-inline-md:     var(--primitive-space-100);  /* 8px */
  --space-inline-lg:     var(--primitive-space-150);  /* 12px */
}
```

### Component-Level Tokens

```css
/* components/button.css */
.button {
  padding-block:  var(--space-component-sm);   /* 8px  */
  padding-inline: var(--space-component-lg);   /* 16px */
  gap:            var(--space-inline-md);      /* 8px between icon and label */
}

.button--sm {
  padding-block:  var(--space-component-xs);   /* 4px  */
  padding-inline: var(--space-component-md);   /* 12px */
}

.button--lg {
  padding-block:  var(--space-component-md);   /* 12px */
  padding-inline: var(--space-component-xl);   /* 24px */
}
```

---

## Practical Examples: Applying the Scale

### Form Layout

```css
.form { display: flex; flex-direction: column; gap: var(--space-layout-xs); } /* 16px between fields */

.form-field { display: flex; flex-direction: column; gap: var(--space-component-xs); } /* 4px label-to-input */

.form-section { display: flex; flex-direction: column; gap: var(--space-layout-sm); } /* 24px */
.form-section + .form-section { padding-top: var(--space-layout-md); border-top: 1px solid var(--color-border); } /* 32px */
```

### Card Component

```css
.card {
  padding: var(--space-component-xl); /* 24px all sides */
  display: flex;
  flex-direction: column;
  gap: var(--space-component-lg); /* 16px between sections */
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-component-sm); /* 8px between icon and title */
}

.card-footer {
  padding-top: var(--space-component-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: var(--space-component-sm); /* 8px between action buttons */
}
```

### Page Sections

```css
.page-hero       { padding-block: var(--space-layout-2xl); } /* 96px */
.page-section    { padding-block: var(--space-layout-xl);  } /* 64px */
.page-subsection { padding-block: var(--space-layout-lg);  } /* 48px */
```

---

## Spacing Audit Checklist

Before shipping, verify:
- [ ] No magic numbers — every spacing value is a token
- [ ] Labels are closer to their inputs than to the previous field
- [ ] Section headers have more space above than below
- [ ] Touch targets are at least 44px in height
- [ ] Card padding is consistent across all card variants
- [ ] Related items group visually through proximity
- [ ] Generous white space around major content areas
