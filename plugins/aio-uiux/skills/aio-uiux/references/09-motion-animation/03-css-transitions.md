# CSS Transitions

The `transition` property is the workhorse of UI animation. Understanding it deeply — which properties to animate, how to compose multi-property transitions, and how GPU compositing works — separates smooth 60fps UIs from janky ones.

---

## The transition Shorthand

```css
/* Full syntax */
transition: <property> <duration> <timing-function> <delay>;

/* Multiple properties */
transition:
  transform  250ms cubic-bezier(0.0, 0.0, 0.2, 1) 0ms,
  opacity    200ms cubic-bezier(0.0, 0.0, 0.2, 1) 0ms,
  box-shadow 200ms cubic-bezier(0.4, 0.0, 0.2, 1) 0ms;

/* Individual longhand properties */
transition-property:        transform, opacity;
transition-duration:        250ms, 200ms;
transition-timing-function: ease-out, ease-out;
transition-delay:           0ms, 50ms;
```

### Property: `transition-property`

```css
/* Animate everything — AVOID. Forces browser to check all properties. */
transition: all 250ms ease-out;

/* Animate specific properties — PREFERRED */
transition: transform 250ms ease-out, opacity 200ms ease-out;

/* "none" disables transitions — useful for instant state resets */
.no-transition { transition: none; }

/* Common mistake: 'width' listed but 'transform: scaleX()' not used */
/* This causes layout recalculation on every frame */
.bad  { transition: width 300ms ease-out; }     /* triggers layout */
.good { transition: transform 300ms ease-out; } /* compositor only */
```

---

## The Golden Rule: Only Animate transform and opacity

The browser rendering pipeline has four stages:
1. **Style** — compute styles
2. **Layout** — calculate positions and sizes (expensive)
3. **Paint** — fill pixels (expensive)
4. **Composite** — combine layers on GPU (cheap)

Only `transform` and `opacity` skip Layout and Paint entirely — they live entirely in the Composite stage, handled by the GPU.

```css
/* ============================================
   PROPERTIES SAFE TO ANIMATE (GPU composited)
   ============================================ */

/* transform: translate, rotate, scale, skew */
.safe-move    { transition: transform 250ms ease-out; }

/* opacity: 0 to 1 */
.safe-fade    { transition: opacity 200ms ease-out; }

/* filter: blur, brightness, etc. — composited in most browsers */
.safe-filter  { transition: filter 200ms ease-out; }

/* clip-path: composited in Chrome/Firefox */
.safe-clip    { transition: clip-path 300ms ease-out; }

/* ============================================
   PROPERTIES THAT TRIGGER LAYOUT (AVOID)
   ============================================ */

/* These force recalculation of the entire document layout */
.layout-props {
  /* BAD — all trigger layout: */
  transition:
    width 300ms ease,
    height 300ms ease,
    margin 300ms ease,
    padding 300ms ease,
    top 300ms ease,
    left 300ms ease,
    right 300ms ease,
    bottom 300ms ease,
    font-size 300ms ease,
    line-height 300ms ease;
}

/* ============================================
   PROPERTIES THAT TRIGGER PAINT (AVOID)
   ============================================ */

/* These skip layout but still repaint pixels */
.paint-props {
  /* BAD — trigger paint: */
  transition:
    background-color 300ms ease,  /* use transform+overlay instead */
    border-color 300ms ease,      /* acceptable if rare */
    color 300ms ease,             /* acceptable for text */
    box-shadow 300ms ease;        /* acceptable but avoid on scroll */
}

/* Exception: background-color and color transitions are acceptable
   for hover states and theme changes — they trigger paint but are
   not on critical animation paths */
.btn {
  transition:
    background-color 150ms ease-out, /* paint, but acceptable for hover */
    transform        150ms ease-out, /* compositor — for press state */
    box-shadow       150ms ease-out; /* paint, acceptable for lift effect */
}
```

---

## will-change: Promoting Elements to Compositor Layers

`will-change` hints to the browser that an element will be animated, so it can be promoted to its own GPU layer in advance.

```css
/* Tell browser to promote before animation starts */
.animated-element {
  will-change: transform, opacity;
}

/* Correct usage: apply BEFORE animation, remove AFTER */
.menu {
  will-change: auto; /* default — no promotion */
}

.menu:hover,
.menu:focus-within {
  will-change: transform; /* promote when about to animate */
}

/* WRONG: blanket will-change on everything */
* { will-change: transform; } /* destroys memory — creates hundreds of layers */

/* WRONG: permanent will-change on static elements */
.static-card {
  will-change: transform; /* wastes GPU memory — this never animates */
}

/* RIGHT: temporary promotion via JS */
/*
  element.addEventListener('mouseenter', () => {
    element.style.willChange = 'transform';
  });
  element.addEventListener('animationend', () => {
    element.style.willChange = 'auto';
  });
*/

/* Alternative: force GPU layer without will-change */
.force-layer {
  transform: translateZ(0);  /* creates compositing layer */
  /* OR */
  transform: translate3d(0, 0, 0); /* older fallback */
}
```

### When to use `will-change`
- Fixed headers/sidebars that translate on scroll
- Elements that animate on every page load (hero animations)
- High-frequency animations (carousel, parallax)
- Never: static elements, elements that animate once on rare interactions

---

## Transition Choreography with Delays

Delays create staggered sequences without JavaScript. The key: each element uses the same base animation but with increasing `transition-delay`.

```css
/* Staggered navigation menu */
.nav-menu {
  /* Container: no delay */
}

.nav-item {
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity   200ms ease-out,
    transform 200ms ease-out;
}

/* Each item staggers 40ms apart */
.nav-item:nth-child(1) { transition-delay: 0ms; }
.nav-item:nth-child(2) { transition-delay: 40ms; }
.nav-item:nth-child(3) { transition-delay: 80ms; }
.nav-item:nth-child(4) { transition-delay: 120ms; }
.nav-item:nth-child(5) { transition-delay: 160ms; }

/* When parent gets open class, items transition in */
.nav-menu.open .nav-item {
  opacity: 1;
  transform: translateY(0);
}

/* On close, reverse stagger (last item exits first) */
.nav-menu:not(.open) .nav-item {
  transition-delay: 0ms; /* all close together, or reverse the order */
}

/* Reverse stagger on close */
.nav-menu:not(.open) .nav-item:nth-child(1) { transition-delay: 160ms; }
.nav-menu:not(.open) .nav-item:nth-child(2) { transition-delay: 120ms; }
.nav-menu:not(.open) .nav-item:nth-child(3) { transition-delay: 80ms; }
.nav-menu:not(.open) .nav-item:nth-child(4) { transition-delay: 40ms; }
.nav-menu:not(.open) .nav-item:nth-child(5) { transition-delay: 0ms; }
```

### Delay for enter vs exit states

```css
/* Pattern: enter delay = stagger position, exit delay = 0 (close fast) */
.card-grid .card {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 250ms ease-out, transform 250ms ease-out;
}

/* Enter: cards stagger in from top */
.card-grid.loaded .card:nth-child(1) { transition-delay: 0ms;   opacity: 1; transform: translateY(0); }
.card-grid.loaded .card:nth-child(2) { transition-delay: 60ms;  opacity: 1; transform: translateY(0); }
.card-grid.loaded .card:nth-child(3) { transition-delay: 120ms; opacity: 1; transform: translateY(0); }
.card-grid.loaded .card:nth-child(4) { transition-delay: 180ms; opacity: 1; transform: translateY(0); }
.card-grid.loaded .card:nth-child(5) { transition-delay: 240ms; opacity: 1; transform: translateY(0); }
.card-grid.loaded .card:nth-child(6) { transition-delay: 300ms; opacity: 1; transform: translateY(0); }
```

---

## Multi-Property Transitions

```css
/* Card with multiple simultaneous transitions */
.card {
  transition:
    transform   250ms cubic-bezier(0.0, 0.0, 0.2, 1),
    box-shadow  250ms cubic-bezier(0.4, 0.0, 0.2, 1),
    opacity     200ms cubic-bezier(0.0, 0.0, 0.2, 1);
}

.card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

/* Interactive form field */
.input {
  border-color: #d1d5db;
  box-shadow: 0 0 0 0 transparent;
  transition:
    border-color 150ms ease-out,
    box-shadow   150ms ease-out,
    outline      150ms ease-out;
}

.input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  outline: none;
}

.input.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

/* Different durations for different properties */
.dropdown-trigger {
  /* Background color changes instantly, transform is animated */
  transition:
    background-color 100ms ease-out,  /* fast: feedback */
    transform        200ms ease-out;  /* slower: movement */
}

/* Asymmetric in/out durations */
.tooltip {
  transition:
    opacity   150ms ease-out,   /* fade in: normal */
    transform 150ms ease-out;
}

.tooltip.hiding {
  transition:
    opacity   100ms ease-in,    /* fade out: faster */
    transform 100ms ease-in;
}
```

---

## Transition Events

```javascript
// transitionend: fires when a transition completes
element.addEventListener('transitionend', (event) => {
  // event.propertyName: which CSS property finished
  // event.elapsedTime: duration in seconds
  // event.pseudoElement: empty string or "::before"/"::after"

  console.log(`${event.propertyName} finished in ${event.elapsedTime}s`);
});

// Common pattern: remove class after transition completes
function removeAfterTransition(element, className) {
  element.classList.add('exiting');

  element.addEventListener('transitionend', function handler(e) {
    // Only respond to the main property (e.g., opacity), not sub-properties
    if (e.propertyName !== 'opacity') return;

    element.classList.remove(className, 'exiting');
    element.removeEventListener('transitionend', handler);
  });
}

// transitioncancel: fires if transition is interrupted
element.addEventListener('transitioncancel', (event) => {
  console.log(`${event.propertyName} transition was cancelled`);
});

// transitionrun: fires when transition is created (before delay)
// transitionstart: fires when transition actually begins (after delay)
element.addEventListener('transitionstart', (event) => {
  console.log(`${event.propertyName} transition started`);
});

// Handle cleanup after modal animation
const modal = document.querySelector('.modal');

function closeModal() {
  modal.classList.add('closing');

  modal.addEventListener('transitionend', function cleanup(e) {
    if (e.propertyName !== 'transform') return;
    modal.classList.remove('open', 'closing');
    modal.removeEventListener('transitionend', cleanup);
  }, { once: true }); // { once: true } auto-removes listener
}
```

---

## GPU Compositing Layer Creation

Understanding when the browser creates compositor layers helps diagnose performance issues.

```css
/* Layer-promoting properties (creates own compositor layer) */
.creates-layer-explicit {
  will-change: transform; /* explicit hint */
}

.creates-layer-implicit {
  /* Any of these implicitly create a layer: */
  transform: translateZ(0);           /* 3D transform */
  transform: translate3d(0, 0, 0);    /* 3D transform */
  opacity: 0.99;                      /* non-1 opacity (in some browsers) */
  position: fixed;                    /* fixed positioning */
  filter: blur(0px);                  /* filter (even null) */
  isolation: isolate;                 /* stacking context */
  mix-blend-mode: multiply;          /* blend mode */
}

/* Too many layers = memory problem */
/* Check in Chrome DevTools → Layers panel */

/* Anti-pattern: layer explosion */
.card-list .card {
  will-change: transform; /* WRONG: 100 cards = 100 GPU layers */
}

/* Better: promote only on interaction */
.card-list .card:hover {
  will-change: transform; /* Only the hovered card gets a layer */
}

/* Or: use contain to limit repaint scope */
.card {
  contain: layout style paint; /* limits layout/paint to this element */
}
```

### Diagnosing compositing issues in Chrome DevTools

1. **Open DevTools** → Performance tab → Record
2. **Look for**: "Recalculate Style", "Layout", "Update Layer Tree", "Paint"
3. **Green = Composite** (fast), **Purple = Paint** (medium), **Yellow = Layout** (slow)
4. **Layers panel**: View → Show Layers panel → see all compositor layers

---

## Common Transition Patterns

```css
/* ---- Fade ---- */
.fade {
  opacity: 1;
  transition: opacity 200ms ease-out;
}
.fade.hidden { opacity: 0; pointer-events: none; }

/* ---- Slide from right ---- */
.slide-panel {
  transform: translateX(100%);
  transition: transform 300ms cubic-bezier(0.0, 0.0, 0.2, 1);
}
.slide-panel.open { transform: translateX(0); }

/* ---- Collapse height (tricky — use max-height) ---- */
.collapsible {
  max-height: 500px; /* must be >= actual content height */
  overflow: hidden;
  transition: max-height 300ms ease-out;
}
.collapsible.collapsed {
  max-height: 0;
  transition: max-height 300ms ease-in; /* ease-in on collapse */
}
/* Limitation: jerky if content < max-height. Use JS height animation for precision. */

/* ---- Scale in from center ---- */
.popover {
  transform: scale(0.9);
  opacity: 0;
  transition:
    transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), /* spring */
    opacity   150ms ease-out;
  transform-origin: top center;
}
.popover.open {
  transform: scale(1);
  opacity: 1;
}

/* ---- Slide + fade combo ---- */
.toast {
  transform: translateY(16px);
  opacity: 0;
  transition:
    transform 250ms ease-out,
    opacity   200ms ease-out;
}
.toast.visible {
  transform: translateY(0);
  opacity: 1;
}
.toast.dismissed {
  transform: translateX(110%);
  opacity: 0;
  transition:
    transform 200ms ease-in,
    opacity   150ms ease-in;
}

/* ---- Color theme transition ---- */
/* Smooth dark/light mode switch */
:root {
  transition:
    background-color 300ms ease-out,
    color 300ms ease-out;
}
/* Note: this transitions EVERYTHING. Be selective in production. */
```

---

## Performance Checklist

Before shipping any transition:

- [ ] Only `transform` and `opacity` on critical animations
- [ ] `will-change` added only to elements that animate frequently
- [ ] No `all` in `transition-property`
- [ ] Transitions tested at 60fps in DevTools Performance tab
- [ ] No layout-triggering properties (`width`, `height`, `top`, `left`, etc.)
- [ ] `prefers-reduced-motion` handled
- [ ] `transitionend` listeners cleaned up after firing
- [ ] `contain: layout style paint` on isolated animated components
