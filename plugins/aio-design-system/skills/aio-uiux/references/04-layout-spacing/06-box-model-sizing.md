# Box Model and Sizing

## box-sizing: border-box Everywhere

The single most important CSS reset. Apply it globally.

### The Problem with content-box (Browser Default)

```css
/* content-box: width applies to content only */
.box {
  width: 200px;
  padding: 20px;
  border: 2px solid;
  /* ACTUAL rendered width: 200 + 20 + 20 + 2 + 2 = 244px */
}
```

You set 200px. The browser renders 244px. Math becomes a constant calculation burden.

### border-box: Width Includes Everything

```css
/* border-box: width applies to content + padding + border */
.box {
  box-sizing: border-box;
  width: 200px;
  padding: 20px;
  border: 2px solid;
  /* ACTUAL rendered width: 200px */
  /* content area: 200 - 20 - 20 - 2 - 2 = 156px */
}
```

### The Universal Reset

```css
/* Apply to everything, inherit so components can override */
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

The `*::before` and `*::after` selectors are critical — pseudo-elements are not covered by `*` alone.

Alternative using inheritance (preferred for component isolation):

```css
html {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: inherit;
}

/* Now a component can opt out cleanly */
.third-party-widget {
  box-sizing: content-box; /* Reverts for this subtree */
}
```

---

## Margin Collapsing: Rules and Gotchas

Margin collapsing only applies to **vertical margins** (top and bottom) in **normal flow** (not flex or grid children).

### Rule 1: Adjacent Siblings

When two block elements are adjacent, their vertical margins collapse to the larger of the two.

```css
.paragraph { margin-bottom: 16px; }
.heading    { margin-top: 24px; }
/* Gap between them: 24px (NOT 40px) */
```

```html
<p>Paragraph text.</p>   <!-- margin-bottom: 16px -->
<h2>Heading</h2>         <!-- margin-top: 24px -->
<!-- Actual gap: max(16, 24) = 24px -->
```

### Rule 2: Parent and First/Last Child

If a parent has no border, padding, or content separating it from its first child's top margin — the child's margin collapses into the parent.

```css
.parent { margin-top: 0; }      /* No border, no padding-top */
.child  { margin-top: 32px; }   /* This 32px moves to the parent */
/* Result: parent appears to have 32px top margin */
```

**Fixes:**

```css
/* Option 1: Add padding to parent */
.parent { padding-top: 1px; } /* Terrible hack, avoid */

/* Option 2: Add border to parent */
.parent { border-top: 1px solid transparent; }

/* Option 3: Use overflow (creates BFC) */
.parent { overflow: hidden; } /* Creates Block Formatting Context */

/* Option 4 (best): Use padding instead of child's margin */
.parent { padding-top: 32px; }
.child  { margin-top: 0; }

/* Option 5 (best for modern): Use flex/grid which disables collapsing */
.parent { display: flex; flex-direction: column; }
```

### Rule 3: Empty Blocks

An empty block's top and bottom margins collapse into each other.

```css
.spacer {
  margin-top: 40px;
  margin-bottom: 20px;
  /* Effective height: 40px, not 60px */
}
```

### Contexts Where Collapsing Does NOT Occur

Margins never collapse when either element is:

```css
display: flex | grid;    /* Flex/grid items */
position: absolute | fixed; /* Out-of-flow elements */
float: left | right;     /* Floated elements */
overflow: hidden | auto | scroll; /* Creates BFC */
display: inline-block;   /* Inline formatting context */
```

**Practical advice:** Use flex or grid for your main layout. Margin collapsing becomes a non-issue.

---

## Padding vs Margin: Decision Guide

| Scenario | Use | Reason |
|---|---|---|
| Space between components | Margin | Spacing is about layout, not the element itself |
| Space inside a component | Padding | Part of the element's visual size |
| Expanding clickable area | Padding | Touch target grows with padding |
| Background color extends | Padding | Padding is inside the background |
| Collapsible spacing | Margin | Flexbox gap, not margin |
| Centering with auto | Margin | `margin: 0 auto` (margin: auto centers block) |
| Pushing sibling away | Margin | Margin affects relationships between elements |
| "Breathing room" inside button | Padding | Button's internal space |

### The Clearest Rule

**Padding is for the element.** **Margin is for the relationship.**

```css
/* Padding: the button's internal space */
.button {
  padding: 8px 16px; /* Part of the button */
}

/* Margin: the button's relationship to its siblings */
.button + .button {
  margin-left: 8px; /* Or use gap on parent */
}
```

### auto Margins for Alignment

```css
/* Center a block element horizontally */
.container {
  width: 800px;
  margin-inline: auto; /* Left and right auto margins split remaining space */
}

/* Push element to right edge in flex container */
.nav-user-menu {
  margin-left: auto; /* Consumes all available space to the left */
}

/* Center vertically and horizontally with flex */
.parent {
  display: flex;
}
.child {
  margin: auto; /* Auto on all sides in flex context */
}
```

---

## Logical Properties

Physical properties (left, right, top, bottom) break in RTL (right-to-left) languages and vertical writing modes. Logical properties adapt automatically.

### Physical vs Logical Mapping

| Physical | Logical | Meaning |
|---|---|---|
| `margin-left` | `margin-inline-start` | Start of the inline axis |
| `margin-right` | `margin-inline-end` | End of the inline axis |
| `margin-top` | `margin-block-start` | Start of the block axis |
| `margin-bottom` | `margin-block-end` | End of the block axis |
| `padding-left` | `padding-inline-start` | — |
| `padding-right` | `padding-inline-end` | — |
| `padding-top` | `padding-block-start` | — |
| `padding-bottom` | `padding-block-end` | — |
| `width` | `inline-size` | Size on inline axis |
| `height` | `block-size` | Size on block axis |
| `top` | `inset-block-start` | — |
| `left` | `inset-inline-start` | — |
| `border-left` | `border-inline-start` | — |

### Shorthand Logical Properties

```css
/* Inline: left+right (horizontal in LTR) */
margin-inline: 16px;           /* Both left and right */
margin-inline: 8px 16px;       /* Start then end */
padding-inline: 24px;

/* Block: top+bottom (vertical in LTR) */
margin-block: 32px;            /* Both top and bottom */
margin-block: 16px 32px;       /* Start then end */
padding-block: 48px;

/* Inset shorthand */
inset: 0;                      /* top, right, bottom, left = 0 */
inset-inline: 0;               /* left + right = 0 */
inset-block: 0;                /* top + bottom = 0 */
```

### Practical Example

```css
/* Button that works in LTR and RTL */
.button {
  /* Physical (breaks in RTL) */
  padding-left: 16px;
  padding-right: 16px;
  text-align: left;

  /* Logical (adapts automatically) */
  padding-inline: 16px;
  text-align: start;
}

/* Navigation icon positioning */
.nav-item .icon {
  /* Physical */
  margin-right: 8px;

  /* Logical: icon always on the start side */
  margin-inline-end: 8px;
}

/* Card with start/end border accent */
.card {
  border-inline-start: 4px solid var(--color-accent);
  padding-inline-start: 16px;
}
/* In LTR: left border. In RTL: right border. Automatically. */
```

### When Physical Properties Are Still OK

Use physical properties when the direction is intentionally physical:
- Absolute/fixed positioned elements relative to the viewport
- Specific UI elements that don't change in RTL (e.g., a drag handle always on the right by design)
- CSS transforms and animations

---

## Writing Mode Considerations

`writing-mode` changes whether text flows horizontally or vertically. Logical properties handle this correctly.

```css
/* Vertical text (Japanese, rotated labels) */
.vertical-label {
  writing-mode: vertical-rl; /* Right to left vertical */
  writing-mode: vertical-lr; /* Left to right vertical */
}

/* Logical properties work correctly */
.vertical-label {
  padding-block: 8px;   /* Now becomes left/right padding */
  padding-inline: 4px;  /* Now becomes top/bottom padding */
  inline-size: 24px;    /* Now becomes height */
  block-size: 120px;    /* Now becomes width */
}
```

---

## Overflow Management

### overflow-x vs overflow-y

```css
/* Common mistake: hiding overflow in one axis unexpectedly clips the other */
.container {
  overflow-x: hidden; /* Also sets overflow-y to auto! */
}

/* Safe: explicit both values */
.container {
  overflow-x: hidden;
  overflow-y: visible;
}
```

### overflow: clip vs hidden

```css
/* overflow: hidden creates a scroll container (affects scroll anchoring) */
.card { overflow: hidden; } /* Can accept scroll with JS */

/* overflow: clip clips content without creating scroll container */
.card { overflow: clip; } /* Truly just clips — no scroll behavior */
```

### Overflow and Stacking Contexts

`overflow: hidden` creates a Block Formatting Context (BFC). This:
- Prevents margin collapsing with parent
- Contains floats
- Does NOT clip position: fixed or position: absolute children above the element

```css
/* Fixed child escapes overflow: hidden */
.clipped-container {
  overflow: hidden;
  height: 100px;
}

.clipped-container .tooltip {
  position: fixed; /* ESCAPES the overflow: hidden clipping */
  z-index: 100;
}
```

### Overflow: Text Truncation

```css
/* Single line truncation */
.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Multi-line truncation (WebKit) */
.text-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;

  /* CSS standard (limited support) */
  /* overflow: hidden; */
  /* display: -webkit-box; always needed for now */
}

/* Fade truncation (better than ellipsis for some designs) */
.text-fade {
  position: relative;
  overflow: hidden;
  max-height: 4.5em; /* 3 lines at 1.5 line-height */
}

.text-fade::after {
  content: '';
  position: absolute;
  bottom: 0;
  inset-inline: 0;
  height: 1.5em;
  background: linear-gradient(transparent, var(--color-surface));
}
```

---

## Intrinsic Sizing Keywords

```css
.element {
  /* Content-based sizes */
  width: min-content;   /* Smallest size without overflow (break at spaces) */
  width: max-content;   /* Full content width without wrapping */
  width: fit-content;   /* min(max-content, available space) — "shrink-wrap" */

  /* Practical uses */
  width: fit-content(400px); /* Like fit-content but capped at 400px */
}
```

### Practical Applications

```css
/* Button that doesn't stretch to full width but also doesn't shrink */
.button {
  width: fit-content;
  min-width: 120px; /* Minimum usable size */
}

/* Tooltip that's exactly as wide as its content */
.tooltip {
  width: max-content;
  max-width: min(300px, 90vw); /* Cap for readability */
}

/* Centered container that shrinks with content */
.dialog {
  width: fit-content;
  max-width: min(560px, 100% - 48px);
  margin-inline: auto;
}
```

---

## min(), max(), clamp() for Sizing

```css
/* Container that's at most 1280px but never overflows */
.page-container {
  width: min(1280px, 100% - 48px);
  /* 100% - 48px = full width minus 24px padding each side */
  margin-inline: auto;
}

/* Element that's at least 200px but grows with content */
.tag {
  min-width: max(120px, min-content);
}

/* Fluid size: 200px on mobile, 400px on desktop, scales in between */
.sidebar {
  width: clamp(200px, 25%, 400px);
}

/* Font size clamped for readability */
.heading {
  font-size: clamp(1.5rem, 4vw, 3rem);
}
```

---

## The Complete Box Model Cheat Sheet

```css
/* Ideal CSS reset for box model */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Sensible defaults */
html {
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
}

body {
  min-height: 100dvh;
}

img, video, canvas, audio, iframe, embed, object {
  display: block;
  max-width: 100%;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
  hyphens: auto;
}
```
