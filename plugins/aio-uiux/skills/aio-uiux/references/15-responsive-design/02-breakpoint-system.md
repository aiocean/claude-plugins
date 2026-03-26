# Breakpoint System

## Common Breakpoint Values

Breakpoints correspond to common device viewport widths. These values are not
arbitrary — they map to real device categories that cluster at certain sizes.

| Breakpoint | Value  | Targets                              |
|------------|--------|--------------------------------------|
| xs         | 320px  | Small phones (SE 1st gen, Moto G)    |
| sm         | 640px  | Large phones, landscape small phones |
| md         | 768px  | Tablets portrait (iPad mini/Air)     |
| lg         | 1024px | Tablets landscape, small laptops     |
| xl         | 1280px | Laptops, small desktops              |
| 2xl        | 1536px | Large desktops, wide monitors        |

**375px** is worth noting separately — it is the most common phone viewport width
(iPhone 6 through iPhone 14). Designs tested at 375px cover the largest slice of
mobile traffic.

```css
/* The canonical set — matches Tailwind CSS defaults */
/* sm  */ @media (min-width: 640px)  { }
/* md  */ @media (min-width: 768px)  { }
/* lg  */ @media (min-width: 1024px) { }
/* xl  */ @media (min-width: 1280px) { }
/* 2xl */ @media (min-width: 1536px) { }
```

---

## Content-Based vs Device-Based Breakpoints

**Device-based breakpoints** target specific hardware (iPhone, iPad, etc.).
They require constant maintenance as new devices ship. Avoid them.

**Content-based breakpoints** are set where the layout breaks, not where a device
starts. A paragraph becomes too wide, a grid column becomes too narrow, a card
row looks squeezed — these are the signals to add a breakpoint.

```css
/* Content-based approach: add a breakpoint when the layout needs it */
.article-body {
  max-width: 65ch;   /* Optimal reading width */
  margin-inline: auto;
  padding-inline: 1rem;
}

/* At 640px the side padding can increase */
@media (min-width: 640px) {
  .article-body {
    padding-inline: 2rem;
  }
}

/* At 1024px a sidebar becomes viable */
@media (min-width: 1024px) {
  .article-layout {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 2rem;
  }
}
```

**Component-level breakpoints**: Some components need their own breakpoints
independent of the page layout. Container queries (see below) solve this properly.

---

## Breakpoint Tokens as CSS Custom Properties

Store breakpoints as custom properties for a single source of truth.
Note: custom properties cannot be used inside media query conditions directly,
but they work for everything else.

```css
:root {
  /* Breakpoint scale */
  --bp-xs:  320px;
  --bp-sm:  640px;
  --bp-md:  768px;
  --bp-lg:  1024px;
  --bp-xl:  1280px;
  --bp-2xl: 1536px;

  /* Semantic aliases */
  --bp-mobile:  var(--bp-sm);
  --bp-tablet:  var(--bp-md);
  --bp-desktop: var(--bp-lg);
}

/* Use SCSS/PostCSS variables for actual media queries */
/* In vanilla CSS, hardcode the value and reference the token in comments */

/* sm (640px) */
@media (min-width: 640px) {
  :root {
    /* Token active: --bp-sm */
    --container-padding: 2rem;
    --grid-columns: 2;
  }
}

/* lg (1024px) */
@media (min-width: 1024px) {
  :root {
    --container-padding: 3rem;
    --grid-columns: 3;
  }
}
```

### SCSS Breakpoint Map

```scss
// _breakpoints.scss
$breakpoints: (
  'sm':  640px,
  'md':  768px,
  'lg':  1024px,
  'xl':  1280px,
  '2xl': 1536px,
);

@mixin respond-to($bp) {
  @if map-has-key($breakpoints, $bp) {
    @media (min-width: map-get($breakpoints, $bp)) {
      @content;
    }
  } @else {
    @warn "Breakpoint `#{$bp}` not found.";
  }
}

// Usage
.card {
  padding: 1rem;

  @include respond-to('md') {
    padding: 1.5rem;
  }

  @include respond-to('xl') {
    padding: 2rem;
  }
}
```

---

## Tailwind CSS Breakpoints

Tailwind uses a mobile-first prefix system. No prefix = mobile (base).
Prefixes apply `min-width` media queries:

```
sm:   min-width: 640px
md:   min-width: 768px
lg:   min-width: 1024px
xl:   min-width: 1280px
2xl:  min-width: 1536px
```

```html
<!-- Stack on mobile, row on sm+, 3-col grid on lg+ -->
<div class="flex flex-col sm:flex-row lg:grid lg:grid-cols-3 gap-4">
  <div class="p-4 sm:p-6 lg:p-8">Card</div>
  <div class="p-4 sm:p-6 lg:p-8">Card</div>
  <div class="p-4 sm:p-6 lg:p-8">Card</div>
</div>

<!-- Hidden on mobile, visible on lg+ -->
<aside class="hidden lg:block w-64">Sidebar</aside>

<!-- Text sizing: base on mobile, scale up -->
<h1 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">
  Heading
</h1>
```

**Customizing Tailwind breakpoints** in `tailwind.config.js`:

```js
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      // Replace defaults
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    // Or extend to add without removing defaults
    extend: {
      screens: {
        'xs': '375px',
        '3xl': '1920px',
      },
    },
  },
}
```

---

## Container Queries as Component Breakpoints

The core problem with media queries for components: a sidebar card at 300px wide
and a main-content card at 700px wide are at the same viewport width. Media
queries cannot distinguish them. Container queries solve this.

```css
/* Define a containment context */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* The card responds to its container's width, not the viewport */
.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

/* When the container is at least 400px wide */
@container card (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
    gap: 1.25rem;
  }

  .card__image {
    width: 180px;
    flex-shrink: 0;
  }
}

@container card (min-width: 600px) {
  .card {
    padding: 1.5rem;
    gap: 2rem;
  }

  .card__image {
    width: 240px;
  }
}
```

```html
<!-- Same component, different container contexts -->
<aside class="sidebar">
  <!-- card-wrapper is ~280px wide — single column layout -->
  <div class="card-wrapper">
    <article class="card">...</article>
  </div>
</aside>

<main class="main-content">
  <!-- card-wrapper is ~700px wide — row layout -->
  <div class="card-wrapper">
    <article class="card">...</article>
  </div>
</main>
```

### Container Query Units

```css
/* cqi — container inline size (width for horizontal writing)
   cqb — container block size (height for horizontal writing)
   cqw — container width
   cqh — container height
   cqmin — smaller of cqw or cqh
   cqmax — larger of cqw or cqh */

@container (min-width: 400px) {
  .card__title {
    font-size: clamp(1rem, 3cqi, 1.5rem); /* Scales with container */
  }
}
```

---

## Avoiding Breakpoint Proliferation

Too many breakpoints create maintenance debt and contradictory styles.

**Signs of breakpoint proliferation**:
- More than 5-6 distinct breakpoints in a project
- Breakpoints at irregular values (537px, 812px, 1100px, 1200px, 1260px)
- Component-specific breakpoints duplicated across files
- Overrides stacked three levels deep

**Prevention strategies**:

### 1. Use Fluid CSS Instead of More Breakpoints

```css
/* Instead of 3 breakpoints for padding */
.section {
  padding: 1rem;
}
@media (min-width: 640px)  { .section { padding: 2rem; } }
@media (min-width: 1024px) { .section { padding: 3rem; } }
@media (min-width: 1280px) { .section { padding: 4rem; } }

/* One fluid declaration */
.section {
  padding: clamp(1rem, 3vw, 4rem);
}
```

### 2. Use Container Queries for Components

Components that vary by available space should use container queries rather than
adding viewport-level breakpoints.

### 3. Use Auto-Flowing Grids

```css
/* Instead of breakpoints to change column count */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
/* This naturally goes 1→2→3→4 columns without any breakpoints */
```

### 4. Limit to the Standard Five

```css
/* Pick these five. Use content-based additions sparingly. */
@media (min-width: 640px)  { /* sm  */ }
@media (min-width: 768px)  { /* md  */ }
@media (min-width: 1024px) { /* lg  */ }
@media (min-width: 1280px) { /* xl  */ }
@media (min-width: 1536px) { /* 2xl */ }
```

If you need a sixth, question whether a fluid technique eliminates the need.

### 5. Document Exceptions

When you must add a non-standard breakpoint, document why:

```css
/* Non-standard: 900px — navigation collapses to hamburger at this exact
   point because the nav items at 5×140px overflow at viewport < 900px.
   Tracked in issue #342. */
@media (min-width: 900px) {
  .main-nav {
    display: flex;
  }
  .hamburger-btn {
    display: none;
  }
}
```
