# Critical Rendering Path

The critical rendering path (CRP) is the sequence of steps the browser takes to convert HTML, CSS, and JavaScript into pixels on screen. Optimizing it means the browser reaches first paint faster.

---

## How the Browser Renders a Page

```
1. Parse HTML → DOM (Document Object Model)
2. Parse CSS → CSSOM (CSS Object Model)
3. Combine DOM + CSSOM → Render Tree (only visible nodes)
4. Layout (Reflow) → compute geometry of every node
5. Paint → fill pixels (colors, text, images, shadows)
6. Composite → layer planes assembled by GPU, sent to screen
```

**Render-blocking resources** prevent step 3 from starting:
- `<link rel="stylesheet">` in `<head>` — browser won't render until CSS is parsed
- `<script>` without `defer`/`async` — parser stops until script executes

---

## Above-the-Fold Optimization

The browser only needs the CSS and HTML for the **first viewport** to paint the first frame. Everything else can be deferred.

### Identify Above-the-Fold Content

```
Viewport height: ~800px on desktop, ~600px on mobile
Above fold:   navigation, hero, first card row
Below fold:   footer, related content, secondary sections
```

### Inline Critical CSS

Extract and inline the CSS needed for above-fold content directly in `<head>`. This eliminates the render-blocking stylesheet request entirely for first paint.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page Title</title>

  <!-- Critical CSS: inlined, zero network request -->
  <style>
    /* Reset + base */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; line-height: 1.5; }

    /* Navigation */
    .nav { display: flex; align-items: center; padding: 16px 24px; background: #fff; }
    .nav-logo { font-weight: 700; font-size: 1.25rem; }
    .nav-links { display: flex; gap: 24px; margin-left: auto; }

    /* Hero */
    .hero { padding: 80px 24px; text-align: center; background: #f8fafc; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; }
    .hero p { font-size: 1.125rem; color: #64748b; margin-top: 16px; }
    .btn-primary { display: inline-flex; padding: 12px 28px; background: #3b82f6;
                   color: #fff; border-radius: 8px; font-weight: 600;
                   text-decoration: none; margin-top: 24px; }
  </style>

  <!-- Non-critical CSS: async load -->
  <link rel="stylesheet" href="/app.css" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="/app.css"></noscript>
</head>
```

### Async CSS Loading Pattern

```html
<!-- The media="print" trick: browser fetches but doesn't block rendering -->
<link rel="stylesheet"
      href="/app.css"
      media="print"
      onload="this.media='all'">

<!-- noscript fallback for JS-disabled browsers -->
<noscript>
  <link rel="stylesheet" href="/app.css">
</noscript>
```

**How it works**: `media="print"` makes the browser fetch the stylesheet at low priority (non-blocking), then `onload` switches it to `all` so styles apply after load.

### loadCSS Polyfill Pattern

```javascript
// Programmatic async CSS loading
function loadCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = function() { this.media = 'all'; };
  document.head.appendChild(link);
}

// Load non-critical CSS after page paint
requestIdleCallback(() => {
  loadCSS('/components/modal.css');
  loadCSS('/components/carousel.css');
  loadCSS('/pages/checkout.css');
});
```

---

## Code Splitting for CSS

Ship only the CSS each page actually needs.

### CSS Modules (Webpack / Vite)

```javascript
// component.module.css is bundled only with this component
import styles from './Button.module.css';

function Button({ children }) {
  return <button className={styles.btn}>{children}</button>;
}
```

### Per-Route CSS Splitting

```javascript
// Vite / Rollup: dynamic imports create separate CSS chunks
const HomePage = lazy(() => import('./pages/Home')); // home.css included
const Dashboard = lazy(() => import('./pages/Dashboard')); // dashboard.css included
```

### Critical CSS Automation Tools

- **Penthouse**: Extract above-fold CSS from live page
- **Critical** (npm): Inline critical CSS, async-load rest
- **critters** (Google): Webpack plugin, same approach

```bash
# Using 'critical' npm package
npx critical https://example.com \
  --base dist/ \
  --inline \
  --width 1300 \
  --height 900 \
  --css dist/app.css \
  --html dist/index.html \
  --out dist/index-critical.html
```

---

## CSS Containment

The `contain` property tells the browser that a subtree is independent from the rest of the document, allowing it to skip layout/paint work for unaffected areas.

```css
/* contain: layout — element's layout does not affect elements outside it */
.widget {
  contain: layout;
}

/* contain: paint — element's descendants don't paint outside its bounds */
.card {
  contain: paint;  /* implies overflow: hidden */
}

/* contain: style — counter/quote scope is isolated */
.isolated {
  contain: style;
}

/* contain: size — element size independent of children */
.fixed-size {
  contain: size;
  width: 300px;
  height: 200px;
}

/* contain: strict — all of the above */
.widget-strict {
  contain: strict;
  width: 300px;
  height: 200px;
}

/* contain: content — layout + paint + style (no size) */
/* Most commonly useful value for components */
.component {
  contain: content;
}
```

**Best use cases for `contain`**:
- Widget feeds / dashboards with many independent tiles
- Off-screen panels (sidebars, modals)
- Virtualized list items
- Third-party embeds

---

## content-visibility: auto

Skips rendering work (layout + paint) for off-screen content entirely. The most impactful single CSS property for long-page performance.

```css
/* Skip render for off-screen sections */
.article-section {
  content-visibility: auto;
  /* REQUIRED: hint browser about element size to prevent CLS */
  contain-intrinsic-size: auto 500px; /* estimated height */
}

/* For cards in a long list */
.product-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 280px;
}
```

**How it works**: Browser skips layout and paint for elements outside the viewport. As user scrolls near an element, it renders it just before it enters view.

**Performance impact**: On a page with 100 off-screen sections, `content-visibility: auto` can reduce initial rendering time by 5–10×.

**Caveats**:
- `contain-intrinsic-size` is essential — without it browser assumes 0 height, causing scrollbar jitter
- Don't use on elements that need to participate in document flow measurements
- Search-in-page (Ctrl+F) still works — browser reveals content when searched

```css
/* Pattern for long article pages */
.prose section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}

/* Pattern for virtualized-looking product grids without JS */
.product-grid .product-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 320px;
}
```

---

## will-change: Use Sparingly

`will-change` promotes an element to its own compositor layer, which can make animations smoother but uses GPU memory.

```css
/* GOOD: applied just before animation, removed after */
.panel {
  transition: transform 0.3s ease;
}
.panel.animating {
  will-change: transform;
}

/* BAD: permanent will-change on many elements */
.card {
  will-change: transform; /* wastes GPU memory, gains nothing at rest */
}

/* BAD: will-change: all — useless, tells browser nothing */
.element {
  will-change: all;
}
```

```javascript
// Correct pattern: add before, remove after
function openPanel(panel) {
  panel.classList.add('animating');
  panel.addEventListener('transitionend', () => {
    panel.classList.remove('animating');
  }, { once: true });
  panel.classList.add('open');
}
```

### Alternatives to will-change

For smooth animations, prefer:
1. Use `transform` and `opacity` (already compositor-friendly)
2. Use `@keyframes` (browser can optimize ahead of time)
3. Only reach for `will-change` when profiling shows jank

---

## GPU Layer Promotion

Some CSS properties automatically promote an element to a compositor layer (no JavaScript needed):

```css
/* These trigger GPU layer promotion */
.layer-promoted {
  transform: translateZ(0);     /* classic hack, still works */
  transform: translate3d(0,0,0); /* same effect */
  will-change: transform;
  opacity: 0.999;               /* tiny opacity forces layer (don't use) */
}
```

**Automatic layer promotion** happens for:
- Elements with CSS animations or transitions on `transform`/`opacity`
- Elements with `position: fixed`
- Elements with `will-change`
- `<video>`, `<canvas>`, WebGL elements
- Elements with 3D transforms

**Do not manually promote everything** — each layer consumes GPU memory. Too many layers ("layer explosion") is worse than no layers.

---

## Paint and Composite-Only Animations

Only `transform` and `opacity` can be animated without triggering layout or paint. Everything else forces the browser back to an expensive layout/paint cycle.

### The Rendering Stages

```
Layout (most expensive)  → Paint (expensive)  → Composite (cheap)
     ↓                          ↓                     ↓
width, height            color, background      transform
margin, padding          border-color           opacity
font-size                box-shadow             filter (GPU)
top, left, right, bottom text-shadow
display, position        background-image
```

### Composite-Only Animation Examples

```css
/* Slide in (translate only) */
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

/* Fade in */
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Scale pop */
@keyframes pop-in {
  0%   { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}

/* Loading spinner (rotate only) */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Shimmer (translate only) */
@keyframes shimmer {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}
```

```css
/* BAD: animating layout properties */
.bad-animation {
  animation: bad-slide 0.3s ease;
}
@keyframes bad-slide {
  from { left: -100px; }   /* triggers layout on every frame */
  to   { left: 0; }
}

/* GOOD: same visual result, composite only */
.good-animation {
  animation: good-slide 0.3s ease;
}
@keyframes good-slide {
  from { transform: translateX(-100px); }  /* compositor only */
  to   { transform: translateX(0); }
}
```

### Avoid Animating These Properties

- `width`, `height`, `max-height`
- `margin`, `padding`
- `top`, `right`, `bottom`, `left` (use `transform: translate` instead)
- `font-size` (use `transform: scale` instead)
- `border-width`
- `background-position` (use `transform` on child instead)

---

## Script Loading Strategies

```html
<!-- BLOCKING: stops HTML parsing until script executes -->
<script src="/app.js"></script>

<!-- DEFER: downloads in parallel, executes after HTML parsed, in order -->
<script src="/app.js" defer></script>

<!-- ASYNC: downloads in parallel, executes immediately when ready (out of order) -->
<script src="/analytics.js" async></script>

<!-- MODULE: always deferred, supports import/export -->
<script type="module" src="/app.js"></script>

<!-- Inline + module: deferred automatically -->
<script type="module">
  import { init } from '/app.js';
  init();
</script>
```

**Use `defer` for**: app scripts that depend on DOM or each other (order matters)
**Use `async` for**: independent scripts (analytics, ads, chat widgets)
**Never use neither**: almost never — it blocks rendering

---

## Critical Rendering Path Checklist

- [ ] Critical CSS extracted and inlined in `<head>`
- [ ] Non-critical CSS loaded async (`media="print"` trick or JS)
- [ ] All `<script>` tags use `defer` or `async` (or `type="module"`)
- [ ] No `@import` inside CSS files (creates sequential requests)
- [ ] `content-visibility: auto` on long-page off-screen sections
- [ ] Animations use only `transform` and `opacity`
- [ ] `will-change` applied only during active animations, removed after
- [ ] `contain: content` on independent widget components
- [ ] No layout-triggering reads inside animation loops (forced reflow)
- [ ] DevTools Rendering tab: check for green overlays, not red paint flashes
