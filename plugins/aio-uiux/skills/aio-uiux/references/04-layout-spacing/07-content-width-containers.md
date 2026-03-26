# Content Width and Container Patterns

## Why Max-Width Matters

Without max-width constraints, content becomes unreadable on wide screens. A paragraph stretching 1600px forces eyes to travel too far across the line — users lose their place and reading slows dramatically. Containers impose intentional limits to maintain readability and visual hierarchy.

---

## Readability: The 65ch Rule

**For body text: max-width between 55ch and 75ch. Optimal: 65ch.**

The `ch` unit equals the width of the `0` character in the current font. It approximates character count per line, which directly correlates with reading comfort.

```css
/* Prose / article body */
.prose {
  max-width: 65ch;
}

/* Tighter, more comfortable */
.prose--narrow {
  max-width: 55ch;
}

/* Acceptable maximum */
.prose--wide {
  max-width: 75ch;
}
```

### Why ch over px?

`ch` is font-size aware. A `max-width: 65ch` at 16px and 20px produces the same approximate line length in characters. A `max-width: 600px` at different font sizes produces very different reading experiences.

```css
/* FRAGILE: breaks when font-size changes */
.article { max-width: 640px; }

/* ROBUST: adapts to any font-size */
.article { max-width: 65ch; }
```

### Different Content, Different Widths

```css
/* Headings: wider than body text is fine */
.page-heading {
  max-width: 20ch; /* Force line breaks in large display headings */
}

/* Short taglines */
.tagline {
  max-width: 45ch;
}

/* Standard prose */
.article-body {
  max-width: 65ch;
}

/* Rich text with sidebars: wider to accommodate images */
.rich-content {
  max-width: 75ch;
}
```

---

## Layout Container Widths

### Standard Breakpoints for Layout Containers

```css
:root {
  --container-sm:   640px;   /* Narrow: forms, dialogs */
  --container-md:   768px;   /* Medium: settings pages */
  --container-lg:  1024px;   /* Standard content width */
  --container-xl:  1280px;   /* Wide: most page layouts */
  --container-2xl: 1440px;   /* Extra wide: dashboards */
  --container-max: 1920px;   /* Maximum: ultra-wide monitors */
}
```

### The Core Container Pattern

```css
.container {
  width: 100%;
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 48px);
}
```

Breaking this down:
- `width: 100%` — fills available space
- `max-width` — caps at comfortable reading/layout width
- `margin-inline: auto` — centers horizontally
- `padding-inline: clamp(...)` — fluid gutters that grow with viewport

### Gutter Sizes by Viewport

```css
/* Fixed gutters */
.container {
  padding-inline: 16px; /* Mobile */
}

@media (min-width: 640px) {
  .container { padding-inline: 24px; } /* Tablet */
}

@media (min-width: 1024px) {
  .container { padding-inline: 32px; } /* Desktop */
}

@media (min-width: 1280px) {
  .container { padding-inline: 48px; } /* Wide */
}

/* Or fluid with clamp */
.container {
  padding-inline: clamp(16px, 4vw, 48px);
  /* 16px at 400px viewport, 48px at 1200px viewport */
}
```

---

## Container Hierarchy: Full-Bleed, Constrained, Breakout

Modern layouts need three zones:

1. **Constrained** — normal content width (default)
2. **Full-bleed** — edge to edge (backgrounds, images)
3. **Breakout** — wider than constrained but not full-bleed (feature sections, pull quotes)

### The Wrapper Approach (Traditional)

```css
.full-bleed {
  width: 100%;
  /* No max-width constraint */
}

.constrained {
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 48px);
}

.breakout {
  max-width: 1600px;
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 48px);
}
```

```html
<section class="full-bleed" style="background: navy;">
  <div class="constrained">
    <h2>Constrained content on full-bleed background</h2>
  </div>
</section>
```

### The CSS Grid Method (Advanced — No Wrapper Divs)

This technique lets content control its own width without wrapper elements.

```css
/* Define column layout once on a container */
.page-content {
  display: grid;
  grid-template-columns:
    [full-start]
      minmax(var(--space-gutter, 24px), 1fr)
      [breakout-start]
        minmax(0, var(--container-breakout-width, 1600px))
        [content-start]
          min(var(--container-width, 1280px), 100%)
        [content-end]
      [breakout-end]
      minmax(var(--space-gutter, 24px), 1fr)
    [full-end];
}

/* Default: content column */
.page-content > * {
  grid-column: content;
}

/* Breakout: wider section */
.page-content > .breakout {
  grid-column: breakout;
}

/* Full bleed: edge to edge */
.page-content > .full-bleed {
  grid-column: full;
}
```

Simplified version (easier to read):

```css
.page {
  --content-width: 1280px;
  --gap: clamp(1rem, 4vw, 3rem);

  display: grid;
  grid-template-columns:
    minmax(var(--gap), 1fr)
    min(var(--content-width), 100% - (var(--gap) * 2))
    minmax(var(--gap), 1fr);
}

.page > * {
  grid-column: 2; /* Default: center column */
}

.page > .full-bleed {
  grid-column: 1 / -1; /* All three columns */
  display: grid;
  grid-template-columns: inherit; /* Inherit parent grid for nested content */
}
```

---

## The "Wrapper" Pattern

The most common container implementation: a single `.wrapper` (or `.container`) class applied to every page section.

```css
/* Base wrapper */
.wrapper {
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 48px);
}

/* Modifier: narrow (forms, articles) */
.wrapper--narrow {
  max-width: 800px;
}

/* Modifier: wide (dashboards) */
.wrapper--wide {
  max-width: 1600px;
}

/* Modifier: prose (reading content) */
.wrapper--prose {
  max-width: 65ch;
}
```

```html
<header>
  <div class="wrapper">
    <nav>...</nav>
  </div>
</header>

<main>
  <!-- Full-bleed hero with constrained content -->
  <section class="hero-section"> <!-- No wrapper here — full bleed bg -->
    <div class="wrapper">
      <h1>Headline</h1>
    </div>
  </section>

  <!-- Standard page content -->
  <section>
    <div class="wrapper">
      <div class="wrapper wrapper--prose">
        <article>...</article>
      </div>
    </div>
  </section>
</main>
```

---

## Edge-to-Edge Backgrounds With Centered Content

A frequent pattern: section spans full viewport width, content is centered.

```css
/* Method 1: Section full width, inner constrained */
.hero {
  background: var(--color-brand);
  padding-block: 80px;
  /* Full viewport width */
}

.hero .hero-inner {
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 48px);
}

/* Method 2: Negative margins (use sparingly) */
.full-bleed-image {
  margin-inline: calc(var(--page-gutter) * -1);
  /* Breaks out of parent's padding */
}

/* Method 3: 100vw width */
.full-width-section {
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  /* Centers and expands to viewport width */
  /* Warning: causes horizontal scroll if body has overflow: auto */
}
```

The 100vw method is popular in CSS Grid articles but causes horizontal scrollbar issues when the page has a scrollbar. Safer alternative:

```css
.full-width-section {
  width: 100%;
  margin-inline: calc((100% - 100vw) / 2);
  /* Only works reliably inside a constrained container */
}
```

---

## CSS Container Utilities

### Utility Class System

```css
/* containers.css — utility classes */

.container {
  width: 100%;
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 48px);
}

.container-sm  { max-width: 640px;  }
.container-md  { max-width: 768px;  }
.container-lg  { max-width: 1024px; }
.container-xl  { max-width: 1280px; }
.container-2xl { max-width: 1536px; }

/* No max-width: inherits from .container's 100% */
.container-fluid { max-width: none; }

/* Prose: reading width */
.container-prose { max-width: 65ch; }
```

### Tailwind-Compatible Approach

```css
:root {
  --container-padding: clamp(1rem, 4vw, 3rem);
}

.container {
  width: 100%;
  margin-right: auto;
  margin-left: auto;
  padding-right: var(--container-padding);
  padding-left: var(--container-padding);
}

@media (min-width: 640px)  { .container { max-width: 640px;  } }
@media (min-width: 768px)  { .container { max-width: 768px;  } }
@media (min-width: 1024px) { .container { max-width: 1024px; } }
@media (min-width: 1280px) { .container { max-width: 1280px; } }
@media (min-width: 1536px) { .container { max-width: 1536px; } }
```

---

## Responsive Padding: The Edge Problem

Content touching screen edges feels broken. Gutters must adapt.

### Minimum Gutter Standards

| Viewport | Minimum Gutter |
|---|---|
| < 480px | 16px |
| 480–768px | 20–24px |
| 768–1024px | 24–32px |
| > 1024px | 32–48px |

```css
/* Safe area aware gutters (notched phones) */
.container {
  padding-inline: max(
    clamp(16px, 4vw, 48px),
    env(safe-area-inset-left)
  );
}
```

### The Minimum Padding Pattern

Ensures content never touches edges, even on very small screens:

```css
.container {
  /* Never less than 16px from edge, never more than 48px */
  padding-inline: clamp(16px, 4vw, 48px);

  /* Alternative: calculated to ensure minimum */
  padding-inline: max(16px, (100vw - 1280px) / 2);
  /* At 1280px and below: 16px padding. Above: equal auto margins */
}
```

---

## Nested Containers

Avoid nesting containers inside containers — padding compounds and content becomes too narrow.

```css
/* BAD: Double padding */
<div class="container">       /* 48px padding each side */
  <div class="container">     /* Another 48px — now 96px from edge! */
    <p>This text is very narrow.</p>
  </div>
</div>

/* BETTER: Inner element constrains width, not container padding */
<div class="container">
  <div class="inner-narrow">   /* max-width: 65ch, no additional padding */
    <p>Properly constrained prose.</p>
  </div>
</div>
```

```css
.inner-narrow {
  max-width: 65ch;
  /* No padding — inherits from parent .container */
}
```

---

## Complete Page Container System

A full implementation combining all patterns:

```css
/* ============================================
   CONTAINER SYSTEM
   ============================================ */

:root {
  /* Widths */
  --w-prose:  65ch;
  --w-sm:     640px;
  --w-md:     768px;
  --w-lg:     1024px;
  --w-xl:     1280px;
  --w-2xl:    1440px;

  /* Gutters */
  --gutter: clamp(1rem, 4vw, 3rem);
}

/* Base container */
.container {
  width: 100%;
  max-width: var(--w-xl);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

/* Size variants */
.container[data-size="sm"]    { max-width: var(--w-sm);    }
.container[data-size="md"]    { max-width: var(--w-md);    }
.container[data-size="lg"]    { max-width: var(--w-lg);    }
.container[data-size="xl"]    { max-width: var(--w-xl);    }
.container[data-size="2xl"]   { max-width: var(--w-2xl);   }
.container[data-size="prose"] { max-width: var(--w-prose); }
.container[data-size="full"]  { max-width: none;            }

/* Page layout: handles full-bleed sections cleanly */
.page-layout {
  display: grid;
  grid-template-columns:
    [full-start] var(--gutter)
    [content-start] min(calc(var(--w-xl) - var(--gutter) * 2), 100%)
    [content-end] var(--gutter)
    [full-end];
}

.page-layout > * {
  grid-column: content;
}

.page-layout > [data-bleed="true"] {
  grid-column: full;
  padding-inline: var(--gutter); /* Re-add gutters inside */
}

/* Usage in HTML:
  <div class="page-layout">
    <section>Standard content</section>
    <section data-bleed="true" style="background: navy">
      Full-bleed with centered content
    </section>
    <section>Back to standard</section>
  </div>
*/
```

---

## Checklist: Container Hygiene

- [ ] All content has a max-width constraint — nothing stretches to full viewport on large screens
- [ ] Body text uses ch-based max-width (55–75ch)
- [ ] Minimum gutter of 16px on mobile — no content touches screen edge
- [ ] Gutters use `clamp()` or responsive values, not fixed px
- [ ] Containers are not nested inside containers (avoid compounding padding)
- [ ] Full-bleed sections have an inner constrained div or use grid method
- [ ] Safe-area insets applied where needed (fixed/sticky elements)
- [ ] Container system uses CSS custom properties — widths defined once
