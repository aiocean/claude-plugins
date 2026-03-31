# Flexbox Patterns: Component-Level Layout

## When to Use Flexbox vs Grid

Flexbox is **one-dimensional**: either a row or a column, not both at once. This makes it ideal for components, not page-level layout.

| Situation | Use |
|---|---|
| Row of buttons, icons, or tags | Flexbox |
| Navigation bar | Flexbox |
| Card internal layout | Flexbox |
| Centering a single item | Flexbox |
| Multi-column page layout | Grid |
| Dashboard / magazine layout | Grid |
| Align items across rows AND columns | Grid |
| Responsive wrapping without breakpoints | Either (auto-fit for Grid, flex-wrap for Flex) |

**Quick rule:** If you're thinking in one direction, use Flexbox. If you're thinking in two dimensions, use Grid.

---

## flex-grow, flex-shrink, flex-basis: The Real Explanation

The `flex` shorthand is `flex: grow shrink basis`.

### flex-basis

The initial size of an item BEFORE space is distributed. Think of it as "the size I want to be."

```css
.item { flex-basis: 200px; }  /* Start at 200px, then adjust */
.item { flex-basis: auto; }   /* Use content size (default) */
.item { flex-basis: 0; }      /* Start from 0 — let flex-grow distribute all space */
```

**Critical:** When `flex-basis: 0`, flex-grow distributes the *entire* container width. When `flex-basis: auto`, flex-grow distributes only the *remaining* (free) space.

### flex-grow

How much extra space an item takes relative to siblings.

```css
/* Three items; item 2 gets twice the extra space as items 1 and 3 */
.item-1 { flex-grow: 1; } /* 1/(1+2+1) = 25% of extra space */
.item-2 { flex-grow: 2; } /* 2/(1+2+1) = 50% of extra space */
.item-3 { flex-grow: 1; } /* 1/(1+2+1) = 25% of extra space */
```

`flex-grow: 0` (default): Item doesn't grow beyond its flex-basis.
`flex-grow: 1`: Item takes its equal share of remaining space.

### flex-shrink

How much an item shrinks when the container is too small.

```css
.rigid   { flex-shrink: 0; } /* Never shrinks — can overflow container */
.normal  { flex-shrink: 1; } /* Shrinks proportionally (default) */
.greedy  { flex-shrink: 3; } /* Shrinks 3x faster than normal items */
```

Use `flex-shrink: 0` on logos, icons, and fixed-width elements you don't want squished.

### The Three Common Shorthands

```css
.item { flex: 1; }       /* flex: 1 1 0     — grow, shrink, start from 0 */
.item { flex: auto; }    /* flex: 1 1 auto  — grow, shrink, start from content */
.item { flex: none; }    /* flex: 0 0 auto  — rigid, no grow or shrink */
.item { flex: 0 auto; }  /* flex: 0 1 auto  — default browser behavior */
```

**Most common:** `flex: 1` makes an item fill available space equally with its siblings.

---

## Centering Patterns

### Perfect Center (Both Axes)

```css
/* Method 1: margin auto (simple, works for single item) */
.container {
  display: flex;
}
.centered {
  margin: auto;
}

/* Method 2: justify + align (explicit, works for multiple items) */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Method 3: place-items shorthand (align then justify) */
.container {
  display: flex;
  place-content: center; /* shorthand for justify-content + align-content */
  place-items: center;   /* shorthand for align-items + justify-items */
}
```

### Center in Viewport

```css
.page-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
}
```

### Horizontal Center Only

```css
.container {
  display: flex;
  justify-content: center;
}
```

### Vertical Center in Fixed-Height Container

```css
.card-header {
  display: flex;
  align-items: center;
  height: 64px;
  padding-inline: 16px;
}
```

---

## Navigation Bar Pattern

### Standard Top Nav

```css
.navbar {
  display: flex;
  align-items: center;
  height: 60px;
  padding-inline: 24px;
  gap: 8px;
}

.navbar-logo {
  flex-shrink: 0; /* Never compress the logo */
  margin-right: auto; /* Push everything else to the right */
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto; /* Could also use on logo instead */
}
```

### `margin-left: auto` — The Flexbox Spacer

This is flexbox's most powerful spacing trick. Auto margins absorb all available space.

```css
/* Push the last item to the far right */
.nav-items {
  display: flex;
  gap: 8px;
}

.nav-item--last {
  margin-left: auto;
}

/* Push logo left, actions right */
.toolbar {
  display: flex;
}

.toolbar-logo   { flex: 0 0 auto; }
.toolbar-search { flex: 1; }           /* Search fills middle */
.toolbar-user   { margin-left: auto; } /* User pushed right */
```

---

## Card Row / Component Layout

### Horizontal Card

```css
.card-horizontal {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.card-horizontal .card-image {
  flex: 0 0 120px; /* Fixed-width image, doesn't grow or shrink */
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}

.card-horizontal .card-content {
  flex: 1;          /* Content fills remaining space */
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-horizontal .card-footer {
  margin-top: auto; /* Push footer to bottom regardless of content height */
}
```

### Card Grid Row

```css
.card-row {
  display: flex;
  gap: 16px;
  overflow-x: auto;                  /* Horizontal scroll on small screens */
  scroll-snap-type: x mandatory;     /* Snap to cards */
  scrollbar-width: none;             /* Hide scrollbar */
  -webkit-overflow-scrolling: touch;
}

.card-row::-webkit-scrollbar {
  display: none;
}

.card-row > * {
  flex: 0 0 280px;           /* Cards don't shrink */
  scroll-snap-align: start;
}

/* On wider screens, allow wrapping */
@media (min-width: 768px) {
  .card-row {
    flex-wrap: wrap;
    overflow-x: visible;
    scroll-snap-type: none;
  }

  .card-row > * {
    flex: 1 1 280px;         /* Grow and shrink, minimum 280px */
  }
}
```

---

## Sticky Footer Pattern

A footer that stays at the bottom of the viewport on short pages, but scrolls naturally on long pages.

```css
/* Method 1: flex on body */
body {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  margin: 0;
}

main {
  flex: 1; /* Main content grows to push footer down */
}

footer {
  flex-shrink: 0;
}
```

```css
/* Method 2: flex on layout wrapper */
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.page-content {
  flex: 1 0 auto;
}

.page-footer {
  flex-shrink: 0;
}
```

---

## Holy Grail with Flexbox

Three-column layout with header and footer:

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.page-header,
.page-footer {
  flex-shrink: 0;
}

.page-body {
  display: flex;
  flex: 1;
}

.page-sidebar-left {
  flex: 0 0 220px;   /* Fixed width, doesn't grow or shrink */
  order: -1;         /* First visually, can be second in DOM for skip-nav */
}

.page-main {
  flex: 1;           /* Fill remaining space */
  order: 0;
}

.page-sidebar-right {
  flex: 0 0 200px;
  order: 1;
}

/* Mobile: stack vertically */
@media (max-width: 768px) {
  .page-body {
    flex-direction: column;
  }

  .page-sidebar-left,
  .page-sidebar-right {
    flex-basis: auto;
    order: 0; /* Reset order for stacked layout */
  }
}
```

---

## Gap Property

`gap` is the modern replacement for margin-based spacing in flex/grid layouts.

```css
/* Row and column gap */
.flex-container {
  display: flex;
  gap: 16px;           /* Same for row and column */
  gap: 8px 16px;       /* row-gap column-gap */
  row-gap: 8px;        /* Between rows (when wrapping) */
  column-gap: 16px;    /* Between items in a row */
}
```

**Advantages over margins:**
- No double margins between items
- No need to remove margin from first/last item
- Works correctly with flex-wrap
- Supported in all modern browsers

```css
/* Old pattern (avoid) */
.item + .item {
  margin-left: 16px;
}

/* Modern pattern */
.container {
  display: flex;
  gap: 16px;
}
```

---

## flex-wrap for Responsive Layouts

`flex-wrap: wrap` allows items to flow to the next line when they don't fit.

```css
/* Tag cloud / chip group */
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  flex: 0 0 auto; /* Don't stretch tags */
  white-space: nowrap;
}
```

### Responsive Card Grid Without Media Queries

```css
.card-flex-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.card-flex-grid > .card {
  flex: 1 1 280px;  /* Grow, shrink, minimum 280px */
  /* Cards wrap when container < 280px per card */
}
```

### Controlling Wrap Breakpoint

```css
/* Force wrap at specific point using flex-basis */
.responsive-pair {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.responsive-pair > * {
  flex: 1 1 300px;  /* Wraps when container < 600px (2 × 300px) */
}
```

---

## Alignment Deep Dive

### justify-content (Main Axis)

```css
.row {
  display: flex;
  justify-content: flex-start;    /* Default: items at start */
  justify-content: flex-end;      /* Items at end */
  justify-content: center;        /* Items centered */
  justify-content: space-between; /* Equal gaps between items, no outside gaps */
  justify-content: space-around;  /* Equal gaps around each item (half at edges) */
  justify-content: space-evenly;  /* Equal gaps everywhere including edges */
}
```

**When to use space-between vs space-evenly:**
- `space-between`: Navigation links, toolbar buttons — item-to-item spacing matters
- `space-evenly`: Centered groups where edge breathing room equals internal spacing

### align-items (Cross Axis)

```css
.row {
  display: flex;
  align-items: stretch;     /* Default: items stretch to full height */
  align-items: flex-start;  /* Align to top of container */
  align-items: flex-end;    /* Align to bottom */
  align-items: center;      /* Vertical center */
  align-items: baseline;    /* Align text baselines across different font sizes */
}
```

**baseline** is underused but critical for mixed-size typography:

```css
/* Logo text (24px) and nav links (14px) align on text baseline */
.navbar {
  display: flex;
  align-items: baseline;
}
```

### align-self (Per-Item Override)

```css
.flex-container {
  display: flex;
  align-items: center;
}

/* This item breaks out of the center alignment */
.stretch-item {
  align-self: stretch;
}

.bottom-item {
  align-self: flex-end;
}
```

---

## Flexbox Decision Tree

```
Need to lay out elements?
│
├─ One direction only (row OR column)?
│  └─ YES → Use Flexbox
│     │
│     ├─ Distributing space between items?
│     │  └─ Use flex-grow / justify-content: space-between
│     │
│     ├─ Fixed-width sidebar + flexible content?
│     │  └─ Use flex: 0 0 <width> on sidebar, flex: 1 on content
│     │
│     ├─ Items wrap at natural breakpoints?
│     │  └─ Use flex-wrap: wrap with flex: 1 1 <min-size>
│     │
│     └─ Centering a single item?
│        └─ Use margin: auto on item or place-items: center on container
│
└─ Two directions (rows AND columns)?
   └─ Use CSS Grid
      │
      ├─ Known column count? → repeat(N, 1fr)
      ├─ Auto-sizing columns? → repeat(auto-fit, minmax(...))
      └─ Named areas? → grid-template-areas
```

---

## Common Mistakes

### Mistake 1: Flexbox for Two-Dimensional Layouts

```css
/* WRONG: Flexbox can't align items in two dimensions */
.card-grid {
  display: flex;
  flex-wrap: wrap;
  /* Items in row 2 don't align with row 1 columns */
}

/* RIGHT: Use Grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
```

### Mistake 2: Missing flex-shrink: 0 on Fixed Elements

```css
/* WRONG: Logo gets squished on small screens */
.navbar {
  display: flex;
}
.logo { width: 120px; } /* Will shrink! */

/* RIGHT */
.logo {
  flex: 0 0 120px; /* or flex-shrink: 0 */
}
```

### Mistake 3: Height on Flex Container With Column Direction

```css
/* WRONG: Flex column doesn't stretch children by default in height */
.sidebar {
  display: flex;
  flex-direction: column;
  /* height: auto — children don't fill sidebar height */
}

/* RIGHT: Give flex container a defined height */
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;   /* or min-height: 100vh */
}
```

### Mistake 4: Relying on order Property for Accessibility

```css
/* Visual reordering breaks keyboard nav and screen readers */
.item--primary { order: -1; } /* Visually first, still last in DOM */
```

Only use `order` for cosmetic reordering where DOM order is already correct for accessibility, or with careful `tabindex` management.
