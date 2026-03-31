# Mobile-First Strategy

## Why Mobile-First Matters

Mobile-first is a design and development strategy where you build for small screens
first, then progressively enhance for larger viewports. It is not merely a CSS
technique — it is a philosophical shift in how you prioritize content and interaction.

**Statistical reality**: Over 60% of global web traffic comes from mobile devices.
Designing desktop-first and scaling down produces compressed, cluttered mobile
experiences. Designing mobile-first produces focused, fast, and intentional UIs.

**Performance gains**: Mobile-first CSS sends minimal styles to all clients. Small
screens receive only what they need. Desktop enhancements layer on top via
`min-width` media queries, keeping the base payload lean.

**Content discipline**: The small screen constraint forces decisions about what
actually matters. Navigation, calls-to-action, and core content must earn their place.
This discipline improves desktop layouts too.

---

## Writing CSS Mobile-First

Use `min-width` media queries exclusively in mobile-first CSS. The base styles
(outside any query) apply to the smallest screens. Queries add complexity upward.

```css
/* Base: mobile styles — no query needed */
.card {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 0.75rem;
}

.card__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 0.5rem;
}

.card__title {
  font-size: 1.125rem;
  line-height: 1.4;
  margin: 0;
}

/* Tablet enhancement */
@media (min-width: 640px) {
  .card {
    flex-direction: row;
    align-items: flex-start;
    padding: 1.25rem;
  }

  .card__image {
    width: 200px;
    flex-shrink: 0;
    aspect-ratio: 4 / 3;
  }

  .card__title {
    font-size: 1.25rem;
  }
}

/* Desktop enhancement */
@media (min-width: 1024px) {
  .card {
    padding: 1.5rem;
    gap: 1.25rem;
  }

  .card__title {
    font-size: 1.5rem;
  }
}
```

**Contrast with desktop-first** (avoid this pattern):

```css
/* Desktop-first — requires overriding at every breakpoint */
.card {
  display: flex;
  flex-direction: row; /* must undo on mobile */
  padding: 1.5rem;
}

@media (max-width: 639px) {
  .card {
    flex-direction: column; /* override */
    padding: 1rem;
  }
}
```

Desktop-first accumulates overrides. Each breakpoint fights the previous styles
rather than building on them.

---

## Standard Mobile-First Breakpoint Pattern

```css
:root {
  --bp-sm:  640px;   /* Large phones, small tablets */
  --bp-md:  768px;   /* Tablets */
  --bp-lg:  1024px;  /* Small laptops */
  --bp-xl:  1280px;  /* Desktops */
  --bp-2xl: 1536px;  /* Wide screens */
}

/* Usage — min-width only */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

---

## Content Priority on Mobile

Mobile users need the core value immediately. Apply a content hierarchy:

1. **Primary action / hero content** — visible without scrolling
2. **Supporting information** — one scroll down
3. **Secondary actions** — accessible but not prominent
4. **Supplementary content** — collapses or moves off-screen

```css
/* Reorder content visually without changing DOM order */
.page-layout {
  display: flex;
  flex-direction: column;
}

/* On mobile: CTA comes first visually */
.page-layout__cta   { order: 1; }
.page-layout__hero  { order: 2; }
.page-layout__body  { order: 3; }
.page-layout__aside { order: 4; }

/* On desktop: natural document order */
@media (min-width: 1024px) {
  .page-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    grid-template-rows: auto 1fr;
  }

  .page-layout__cta   { order: 0; grid-column: 1 / -1; }
  .page-layout__hero  { order: 0; grid-column: 1; }
  .page-layout__body  { order: 0; grid-column: 1; }
  .page-layout__aside { order: 0; grid-column: 2; grid-row: 2 / 4; }
}
```

**Hide low-priority content on mobile** sparingly — hidden content still loads:

```css
.decorative-sidebar-widget {
  display: none;
}

@media (min-width: 1024px) {
  .decorative-sidebar-widget {
    display: block;
  }
}
```

---

## Touch-First Interaction Design

Desktop UIs rely on precise mouse cursors. Mobile requires finger-friendly design.

### Minimum Touch Target Size

```css
/* 44×44px minimum per Apple HIG; 48×48dp per Material Design */
.btn {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1.25rem;
  /* Never shrink below this on mobile */
}

/* Expand tap area without changing visual size */
.icon-btn {
  position: relative;
  width: 24px;
  height: 24px;
}

.icon-btn::after {
  content: '';
  position: absolute;
  inset: -10px; /* Extends tap area to ~44px */
}
```

### Spacing Between Targets

```css
/* Minimum 8px between interactive elements */
.action-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Increase on mobile where finger precision is lower */
@media (max-width: 639px) {
  .action-group {
    gap: 0.75rem;
  }
}
```

### Hover States on Touch

Touch devices fire `:hover` on tap, causing sticky hover states:

```css
/* Only apply hover on devices with a fine pointer (mouse) */
@media (hover: hover) and (pointer: fine) {
  .btn:hover {
    background-color: var(--color-primary-hover);
    transform: translateY(-1px);
  }
}

/* Touch feedback via :active — works everywhere */
.btn:active {
  transform: scale(0.97);
  opacity: 0.85;
}
```

---

## Mobile Viewport Considerations

### The Viewport Meta Tag

Always include this in `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Without it, mobile browsers render at a virtual ~980px width and scale down,
making text tiny and layouts broken.

**Do not use** `maximum-scale=1` or `user-scalable=no` — they prevent users from
zooming for accessibility and violate WCAG 1.4.4.

### 100vh Problem on Mobile

Mobile browser chrome (address bar) shrinks/grows, causing layout shifts with
`height: 100vh`:

```css
/* Old approach — breaks on mobile safari */
.hero {
  height: 100vh; /* Jumps when browser chrome hides */
}

/* Modern approach — CSS environment variables */
.hero {
  height: 100dvh; /* Dynamic viewport height — updates with chrome */
}

/* Fallback for older browsers */
.hero {
  height: 100vh;
  height: 100dvh;
}

/* Fixed header accounting for mobile chrome */
.sticky-header {
  position: sticky;
  top: 0;
  /* Use lvh (large viewport) for initial sizing */
  height: 60px;
}
```

### Safe Area Insets (Notch / Home Indicator)

```css
/* Account for iPhone notch and home indicator */
.app-shell {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Bottom navigation bar */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(60px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## Testing Mobile Designs

### Browser DevTools

Chrome DevTools device emulation covers most cases but misses:
- Real touch events (vs simulated)
- Actual font rendering
- Performance on low-end hardware
- iOS Safari quirks (test on real device or BrowserStack)

### Testing Checklist

```
[ ] Viewport at 320px — oldest small phones (SE 1st gen)
[ ] Viewport at 375px — iPhone standard
[ ] Viewport at 390px — iPhone 14/15
[ ] Viewport at 428px — iPhone Pro Max
[ ] Viewport at 768px — iPad portrait
[ ] Text remains readable at default zoom (no horizontal scroll)
[ ] All interactive elements meet 44px minimum
[ ] Forms work without zoom on input focus (font-size >= 16px)
[ ] Navigation accessible on mobile
[ ] Images load and display correctly
[ ] No content clipped or overflowing
```

### Responsive Design Mode (Firefox)

Firefox's responsive design mode shows both viewport sizes and provides
touch simulation. Useful for checking overflow at exact breakpoints.

---

## When Desktop-First Makes Sense

Mobile-first is the default choice, but desktop-first is appropriate in specific
contexts:

**Internal dashboards and admin tools**: If users exclusively access via desktop
(data-heavy tables, complex multi-panel layouts), starting mobile-first adds
friction. A responsive table that collapses gracefully still works, but the
primary design target is desktop.

**Complex data visualization**: Charts with 12 data series, pivot tables, and
code editors are inherently desktop experiences. Design for desktop first, then
provide a simplified mobile view.

**Progressive web apps with desktop-only features**: Print management, CAD-adjacent
tools, or video editing interfaces where the mobile experience is intentionally
limited.

```css
/* Desktop-first for a data dashboard */
.dashboard-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 60px 1fr;
  height: 100vh;
}

/* Mobile: simplified view, not full dashboard */
@media (max-width: 1023px) {
  .dashboard-grid {
    display: block;
    height: auto;
  }

  .dashboard-sidebar {
    display: none; /* Collapsed into a drawer instead */
  }
}
```

**The rule**: Default to mobile-first. Switch to desktop-first only when the
primary user context is desktop and the mobile experience is a deliberate
simplification, not a core requirement.
