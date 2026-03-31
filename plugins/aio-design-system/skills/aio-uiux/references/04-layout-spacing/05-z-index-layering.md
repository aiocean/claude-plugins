# Z-Index and Layering Systems

## The Core Problem

Z-index without a system creates an arms race. One developer uses `z-index: 100`, another uses `z-index: 9999` to beat it, someone else adds `z-index: 99999`. The result: unmaintainable, fragile layering that breaks whenever a new component is added.

The solution: a named layer scale defined once, used everywhere.

---

## Understanding Stacking Contexts

A **stacking context** is a three-dimensional rendering scope. Elements inside a stacking context are stacked relative to each other — they cannot interleave with elements outside the context.

### What Creates a Stacking Context

Any of these on an element creates a new stacking context:

```css
/* Position with z-index */
position: relative | absolute | fixed | sticky;
z-index: <any integer>; /* Not auto */

/* Transforms */
transform: <any value>;
translate: <any value>;
rotate: <any value>;
scale: <any value>;

/* Opacity */
opacity: <less than 1>;

/* Filters */
filter: <any value>;
backdrop-filter: <any value>;

/* Flex/Grid items */
/* A flex or grid item with z-index != auto creates a stacking context */
/* even without position: relative */

/* Isolation */
isolation: isolate; /* Explicit stacking context */

/* Mix-blend-mode */
mix-blend-mode: <anything except normal>;

/* will-change */
will-change: transform | opacity | filter; /* May create context */

/* Masking */
clip-path: <any value>;
mask: <any value>;
```

### Why This Matters

```css
/* Parent has stacking context */
.modal {
  position: fixed;
  z-index: 1000;
  opacity: 0.99; /* CREATES NEW STACKING CONTEXT */
}

/* This tooltip is INSIDE modal's stacking context */
/* z-index: 9999 only competes within .modal, NOT the whole page */
.modal .tooltip {
  position: absolute;
  z-index: 9999; /* Meaningless against elements outside .modal */
}
```

This is the most common z-index bug: a child tries to appear above a sibling of its parent, but can't because both are trapped in separate stacking contexts.

---

## Layer Token System

Define named z-index values as CSS custom properties. Never use magic numbers.

### Standard Layer Scale

```css
:root {
  /* Base content layer */
  --z-below:    -1;     /* Behind normal flow (decorative backgrounds) */
  --z-base:      0;     /* Normal flow — default */
  --z-raised:    1;     /* Slightly elevated (hover cards, active states) */

  /* Interactive UI layers */
  --z-dropdown:  100;   /* Dropdowns, select menus, comboboxes */
  --z-sticky:    200;   /* Sticky headers, sticky sidebars */
  --z-fixed:     300;   /* Fixed navigation bars */
  --z-drawer:    400;   /* Off-canvas sidebars, drawers */
  --z-overlay:   500;   /* Backdrop/overlay behind modals */
  --z-modal:     600;   /* Modal dialogs */
  --z-toast:     700;   /* Toast notifications */
  --z-tooltip:   800;   /* Tooltips (appear above modals) */
  --z-popover:   850;   /* Popovers (above modals, below tooltips) */
  --z-top:       900;   /* System-level elements */
  --z-debug:     9999;  /* Dev tools, debug overlays — remove before ship */
}
```

### Usage in Components

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.dropdown-menu {
  position: absolute;
  z-index: var(--z-dropdown);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
}

.modal-dialog {
  position: fixed;
  z-index: var(--z-modal);
}

.toast-container {
  position: fixed;
  inset-block-end: 24px;
  inset-inline-end: 24px;
  z-index: var(--z-toast);
}

[role="tooltip"] {
  position: absolute;
  z-index: var(--z-tooltip);
}
```

### Scale Spacing Rationale

Values are spaced 100 apart deliberately. This allows inserting intermediate values (e.g., `--z-sticky-submenu: 250`) without renaming anything. At 10-apart spacing, you run out of room. At 1000-apart spacing, numbers feel arbitrary.

---

## The isolation Property

`isolation: isolate` creates a stacking context WITHOUT changing any visual properties. It's the clean way to contain stacking contexts in components.

### Problem Without Isolation

```css
/* A card component */
.card {
  position: relative; /* Makes stacking context... maybe */
}

/* The card's image accidentally overlaps the site header */
.card .badge {
  position: absolute;
  z-index: 200; /* Leaks out and competes with the sticky header */
}
```

### Solution With Isolation

```css
/* Contain the card's stacking context */
.card {
  isolation: isolate; /* Creates stacking context, no other side effects */
}

/* Now .badge's z-index is scoped to .card */
.card .badge {
  position: absolute;
  z-index: 10; /* Only competes within .card */
}
```

### When to Use isolation: isolate

- Any component that uses `position: absolute` internally
- Cards, panels, or widgets with internal z-index usage
- Anything using `mix-blend-mode` that should be contained
- CSS-in-JS components to prevent z-index bleed

```css
/* Apply defensively to all card-like components */
.card,
.panel,
.widget,
.popover-trigger {
  isolation: isolate;
}
```

---

## Common Z-Index Bugs and Fixes

### Bug 1: Tooltip Behind Modal

```css
/* PROBLEM */
.modal {
  z-index: 1000;
  transform: translateY(0); /* Creates stacking context! */
}

.tooltip {
  z-index: 1100; /* Can't beat modal because tooltip is inside modal's context */
}

/* FIX: Remove transform from modal, or use portal rendering */
.modal {
  z-index: var(--z-modal);
  /* No transform on the modal container */
}

/* Or: render tooltip in body, not inside modal */
```

### Bug 2: Sticky Header Behind Dropdown

```css
/* PROBLEM */
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
}

.hero-section {
  transform: scale(1); /* Innocuous? Creates stacking context! */
  /* The hero section is now at z-index: auto but in its own context */
  /* If .hero-section comes after .site-header in DOM... */
}

/* FIX: Don't put transforms on section-level wrappers */
/* If you must animate sections, use a child element */
.hero-section .hero-content {
  transform: scale(1); /* Only the content, not the wrapper */
}
```

### Bug 3: z-index Has No Effect

```css
/* PROBLEM */
.element {
  z-index: 999; /* Does nothing */
}

/* z-index only works on POSITIONED elements */
/* position: static (default) ignores z-index */

/* FIX */
.element {
  position: relative; /* Now z-index works */
  z-index: 999;
}
```

Exception: flex and grid children respect z-index without `position`.

### Bug 4: Fixed Element Behind Another Fixed Element

```css
/* PROBLEM: Two fixed elements, unclear ordering */
.site-header { position: fixed; top: 0; z-index: 100; }
.side-drawer  { position: fixed; top: 0; z-index: 100; } /* Same z-index! */
/* Which is on top? DOM order: side-drawer (later in DOM) wins */

/* FIX: Different z-index values */
.site-header { z-index: var(--z-fixed);  } /* 300 */
.side-drawer { z-index: var(--z-drawer); } /* 400 */
```

### Bug 5: opacity Creates Unwanted Stacking Context

```css
/* Fading out a container: creates stacking context while animating */
.fade-container {
  opacity: 0; /* Creates stacking context! */
  transition: opacity 0.3s;
}

/* Child modals/tooltips now trapped inside fade-container's context */

/* FIX: Animate visibility instead, or restructure so modals are portals */
.fade-container {
  visibility: hidden; /* Doesn't create stacking context */
  transition: visibility 0.3s;
}
```

---

## Complete Layering System Implementation

### CSS Layer Approach (Modern)

CSS `@layer` is separate from z-index but solves CSS specificity ordering:

```css
/* Define layer order (lower = lower priority) */
@layer base, components, utilities, overrides;

@layer base {
  /* Reset, variables, base element styles */
}

@layer components {
  /* Component styles */
}

@layer utilities {
  /* Utility classes */
}

@layer overrides {
  /* One-off overrides — wins over components without !important */
}
```

### Full Z-Index Architecture

```css
/* ============================================
   STACKING LAYER SYSTEM
   All z-index values in one place.
   Never hardcode z-index outside this file.
   ============================================ */

:root {
  /* Subzero: decorative backgrounds */
  --z-underlay: -1;

  /* Ground level */
  --z-base: 0;

  /* Hover states, in-page emphasis */
  --z-raised: 1;
  --z-raised-high: 10;

  /* Floating UI elements */
  --z-dropdown:     100;
  --z-date-picker:  150;
  --z-sticky:       200;
  --z-fixed:        300;

  /* Overlay patterns */
  --z-drawer:       400;
  --z-overlay:      500;
  --z-modal:        600;
  --z-modal-nested: 650;

  /* Notifications */
  --z-toast:        700;
  --z-alert-banner: 750;

  /* Floating helpers */
  --z-popover:      800;
  --z-tooltip:      850;

  /* System level */
  --z-command-palette: 900;
  --z-global-loader:   950;

  /* Dev only (strip in production) */
  --z-debug: 9999;
}

/* Apply isolation to all components with internal positioning */
.card,
.panel,
.dropdown-trigger,
.popover-trigger,
.tooltip-wrapper {
  isolation: isolate;
}
```

### Portal Pattern for Escaped Stacking

For components that MUST appear above everything (modals, toasts, tooltips), render them at the document body level — outside any stacking context.

```js
// React portal example
import { createPortal } from 'react-dom';

function Modal({ children, isOpen }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-dialog" role="dialog">
        {children}
      </div>
    </div>,
    document.body // Renders directly in body, outside all stacking contexts
  );
}
```

```css
/* With portal, z-index fights are eliminated */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
}

.modal-dialog {
  position: fixed;
  /* Portal parent (body) has no stacking context */
  /* z-index only competes with other top-level elements */
  z-index: var(--z-modal);
}
```

---

## Debugging Stacking Contexts

### Find All Stacking Contexts in DevTools

In Chrome DevTools:
1. Open Elements panel
2. Find the element
3. Look for "stacking context" indicator in Computed styles

### CSS Debug Overlay

```css
/* Temporarily highlight elements creating stacking contexts */
*:not(html):not(body) {
  --sc-filter: none;
  --sc-opacity: 1;
  --sc-transform: none;
  --sc-isolation: auto;
}

/* Mark stacking context creators */
*[style*="transform"],
*[style*="opacity"],
*[style*="filter"] {
  outline: 2px solid red;
}
```

### JavaScript: Find All Stacking Contexts

```js
// Paste in DevTools console to find all stacking contexts
function isStackingContext(el) {
  const s = window.getComputedStyle(el);
  return (
    s.isolation === 'isolate' ||
    s.zIndex !== 'auto' && s.position !== 'static' ||
    parseFloat(s.opacity) < 1 ||
    s.transform !== 'none' ||
    s.filter !== 'none' ||
    s.backdropFilter !== 'none' ||
    s.mixBlendMode !== 'normal'
  );
}

document.querySelectorAll('*').forEach(el => {
  if (isStackingContext(el)) {
    console.log(el, window.getComputedStyle(el).zIndex);
  }
});
```

---

## Checklist: Z-Index Hygiene

- [ ] All z-index values reference named tokens from `:root`
- [ ] No magic numbers anywhere in CSS
- [ ] `isolation: isolate` applied to all components with internal z-index
- [ ] Modals, toasts, and tooltips rendered via portals (at body level)
- [ ] No `transform` or `opacity` on sticky/fixed container wrappers
- [ ] Stacking context audit run after adding new animated components
- [ ] `--z-debug` removed before production build
