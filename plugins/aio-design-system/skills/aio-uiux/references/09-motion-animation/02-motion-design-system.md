# Motion Design System

A motion design system defines reusable tokens for duration, easing, and choreography. Without it, every developer picks arbitrary values and the UI feels inconsistent. With it, motion becomes a design language.

---

## Duration Tokens

Duration communicates the weight and importance of a change. Small, quick interactions feel nimble. Large transitions feel deliberate.

```css
:root {
  /* --- Duration scale --- */
  --duration-instant:  0ms;    /* State swaps, icon changes, no perceivable animation */
  --duration-micro:    100ms;  /* Hover states, focus rings, color changes */
  --duration-fast:     150ms;  /* Tooltips, chips, small component enter/exit */
  --duration-normal:   250ms;  /* Dropdowns, popovers, medium components */
  --duration-slow:     400ms;  /* Sheets, panels, large component transitions */
  --duration-slower:   600ms;  /* Page transitions, onboarding, hero animations */
  --duration-crawl:    1000ms; /* Ambient loops, progress bars, deliberate reveals */
}
```

### When to use each tier

| Token | Use case | Never use for |
|-------|----------|---------------|
| `instant` | Checkbox checked state, icon swap | Anything that needs to communicate change |
| `micro` | Hover background color, focus ring | Anything that moves position |
| `fast` | Tooltip appear, badge pop, chip enter | Large panels, page-level changes |
| `normal` | Dropdown open, popover, dialog | Full-screen overlays, sheets |
| `slow` | Sidebar, bottom sheet, drawer | Hover states (way too slow) |
| `slower` | Page route transitions, onboarding modals | Anything interactive/responsive |
| `crawl` | Loading progress, ambient shimmer | Any interactive response |

---

## Easing Tokens

Easing is the most important motion variable. Wrong easing makes animation feel unnatural regardless of duration.

```css
:root {
  /* --- Directional easing --- */

  /* Ease out: enters fast, slows to rest. Use for ENTERING elements.
     Objects enter the scene with energy and settle into position. */
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);

  /* Ease in: starts slow, exits fast. Use for EXITING elements.
     Objects build momentum to leave the scene. */
  --ease-in: cubic-bezier(0.4, 0.0, 1, 1);

  /* Ease in-out: symmetric acceleration. Use for MOVING elements
     that stay in the scene (e.g., sliding a panel, repositioning). */
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);

  /* --- Expressive easing --- */

  /* Standard: Material Design's standard curve. Slightly more
     aggressive than ease-in-out. Good default for most transitions. */
  --ease-standard: cubic-bezier(0.2, 0.0, 0, 1.0);

  /* Spring: overshoots target then settles. Adds life to entrances.
     Use for badges, notifications, confirmations. */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Bounce: larger overshoot. Use sparingly — branded moments only. */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

  /* Linear: use ONLY for continuous loops (spinners, progress).
     Never use for enter/exit/move transitions. */
  --ease-linear: linear;

  /* --- Apple HIG-inspired curves --- */
  /* Apple uses a single "ease" that's more aggressive than CSS ease */
  --ease-apple-enter: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-apple-exit:  cubic-bezier(0.55, 0.055, 0.675, 0.19);
}
```

### Easing decision tree

```
Is the element entering the viewport?  → --ease-out
Is the element leaving the viewport?   → --ease-in
Is the element repositioning?          → --ease-in-out
Should it feel springy/lively?         → --ease-spring
Is it a continuous loop?               → --ease-linear
Is it a branded hero moment?           → --ease-bounce
```

---

## CSS Custom Properties — Full Motion Token System

```css
/* ============================================
   MOTION DESIGN TOKENS
   Copy this block into your design system's
   global CSS or :root stylesheet
   ============================================ */

:root {
  /* Duration */
  --motion-instant:  0ms;
  --motion-micro:    100ms;
  --motion-fast:     150ms;
  --motion-normal:   250ms;
  --motion-slow:     400ms;
  --motion-slower:   600ms;
  --motion-crawl:    1000ms;

  /* Easing */
  --motion-ease-out:      cubic-bezier(0.0, 0.0, 0.2, 1);
  --motion-ease-in:       cubic-bezier(0.4, 0.0, 1, 1);
  --motion-ease-in-out:   cubic-bezier(0.4, 0.0, 0.2, 1);
  --motion-ease-standard: cubic-bezier(0.2, 0.0, 0, 1.0);
  --motion-ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
  --motion-ease-bounce:   cubic-bezier(0.68, -0.55, 0.265, 1.55);

  /* Composite shorthand tokens (duration + easing pairs) */
  --motion-enter:  var(--motion-normal) var(--motion-ease-out);
  --motion-exit:   var(--motion-fast) var(--motion-ease-in);
  --motion-move:   var(--motion-normal) var(--motion-ease-in-out);
  --motion-pop:    var(--motion-fast) var(--motion-ease-spring);
  --motion-page:   var(--motion-slow) var(--motion-ease-standard);

  /* Stagger delay unit (multiply by index for stagger effects) */
  --motion-stagger-unit: 40ms;

  /* Scale tokens for enter/exit animations */
  --motion-scale-enter: 0.95;
  --motion-scale-exit:  0.95;

  /* Translate tokens */
  --motion-slide-sm: 8px;
  --motion-slide-md: 16px;
  --motion-slide-lg: 24px;
}

/* Reduced motion: collapse all durations */
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-micro:   0.01ms;
    --motion-fast:    0.01ms;
    --motion-normal:  0.01ms;
    --motion-slow:    0.01ms;
    --motion-slower:  0.01ms;
    --motion-crawl:   0.01ms;
    /* Composites update automatically */
  }
}
```

---

## Using Motion Tokens in Components

```css
/* Button transitions — uses composite tokens */
.btn {
  transition:
    background-color var(--motion-micro) var(--motion-ease-out),
    transform        var(--motion-fast)  var(--motion-ease-out),
    box-shadow       var(--motion-fast)  var(--motion-ease-out);
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn:active {
  transform: translateY(0) scale(0.98);
  transition-duration: 80ms; /* override: faster on press */
}

/* Modal — uses semantic enter/exit tokens */
.modal-overlay {
  animation: fadeIn var(--motion-enter) forwards;
}

.modal-panel {
  animation: slideUp var(--motion-enter) forwards;
}

.modal-panel.closing {
  animation: slideDown var(--motion-exit) forwards;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(var(--motion-slide-md)) scale(var(--motion-scale-enter));
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideDown {
  to {
    opacity: 0;
    transform: translateY(var(--motion-slide-md)) scale(var(--motion-scale-exit));
  }
}

/* Stagger pattern using CSS counter and calc() */
.list-item {
  animation: fadeSlideIn var(--motion-normal) var(--motion-ease-out)
    calc(var(--item-index, 0) * var(--motion-stagger-unit)) both;
}

/* Set --item-index via inline style or JS */
/* <li class="list-item" style="--item-index: 0"> */
/* <li class="list-item" style="--item-index: 1"> */
```

---

## Spring Curves — When and How

Spring animations don't have a fixed duration — they simulate physics. CSS `cubic-bezier` can approximate springs but true springs require JS (Framer Motion, React Spring, Motion One).

```css
/* CSS spring approximation — works for most UI needs */
:root {
  /* Tight spring: quick overshoot, fast settle. Good for buttons, chips. */
  --spring-tight: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Loose spring: more overshoot, longer settle. Good for panels, drawers. */
  --spring-loose: cubic-bezier(0.25, 1.8, 0.5, 1);

  /* No overshoot: eases past target without bouncing. Professional/subtle. */
  --spring-none: cubic-bezier(0.2, 0, 0, 1);
}

/* Badge pop with spring */
.badge {
  transform: scale(0);
  transition: transform var(--motion-fast) var(--spring-tight);
}

.badge.visible {
  transform: scale(1);
}

/* Drawer with loose spring */
.drawer {
  transform: translateX(-100%);
  transition: transform var(--motion-slow) var(--spring-loose);
}

.drawer.open {
  transform: translateX(0);
}

/* Tooltip with tight spring */
.tooltip {
  transform: scale(0.9) translateY(4px);
  opacity: 0;
  transition:
    transform var(--motion-fast) var(--spring-tight),
    opacity   var(--motion-micro) var(--motion-ease-out);
}

.tooltip.visible {
  transform: scale(1) translateY(0);
  opacity: 1;
}
```

---

## Material Design Motion Reference

Material Design 3 defines two motion categories:

### Emphasized (for large, important transitions)
```css
:root {
  /* M3 Emphasized */
  --m3-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0);
  --m3-emphasized-accelerate: cubic-bezier(0.3, 0.0, 0.8, 0.15);

  /* M3 Standard */
  --m3-standard: cubic-bezier(0.2, 0.0, 0, 1.0);
  --m3-standard-decelerate: cubic-bezier(0, 0, 0, 1);
  --m3-standard-accelerate: cubic-bezier(0.3, 0, 1, 1);

  /* M3 Duration */
  --m3-short1: 50ms;
  --m3-short2: 100ms;
  --m3-short3: 150ms;
  --m3-short4: 200ms;
  --m3-medium1: 250ms;
  --m3-medium2: 300ms;
  --m3-medium3: 350ms;
  --m3-medium4: 400ms;
  --m3-long1: 450ms;
  --m3-long2: 500ms;
  --m3-long3: 550ms;
  --m3-long4: 600ms;
  --m3-extra-long1: 700ms;
  --m3-extra-long2: 800ms;
  --m3-extra-long3: 900ms;
  --m3-extra-long4: 1000ms;
}

/* M3 FAB expand — emphasized pattern */
.fab-expand {
  transition: all var(--m3-long4) var(--m3-emphasized-decelerate);
}
```

---

## Apple HIG Motion Reference

Apple's Human Interface Guidelines emphasize "fluidity and continuity." Key principles:
- Animations reinforce spatial metaphor (sheets slide up from bottom, popovers appear near trigger)
- Duration typically 200–350ms — faster than Material for most interactions
- Uses spring physics everywhere (UISpringTimingParameters)

```css
/* Apple-inspired tokens */
:root {
  /* Apple typically uses ~0.35s for most UI animations */
  --apple-quick: 200ms;
  --apple-standard: 300ms;
  --apple-deliberate: 500ms;

  /* Apple spring approximation */
  --apple-spring: cubic-bezier(0.4, 0, 0.2, 1.4);

  /* iOS sheet — slides up from bottom */
  --apple-sheet-enter: var(--apple-standard) cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --apple-sheet-exit:  200ms cubic-bezier(0.55, 0.055, 0.675, 0.19);
}

/* iOS-style sheet */
.ios-sheet {
  transform: translateY(100%);
  transition: transform var(--apple-sheet-enter);
}

.ios-sheet.open {
  transform: translateY(0);
}

/* iOS-style popover — appears from source element */
.ios-popover {
  transform-origin: top center;
  transform: scale(0.95) translateY(-8px);
  opacity: 0;
  transition:
    transform var(--apple-quick) var(--apple-spring),
    opacity   var(--apple-quick) ease-out;
}

.ios-popover.visible {
  transform: scale(1) translateY(0);
  opacity: 1;
}
```

---

## Composing a Motion System: Step by Step

### Step 1: Define tokens in CSS custom properties
```css
/* tokens/motion.css */
:root {
  /* ... paste the full token block from above ... */
}
```

### Step 2: Create semantic utility classes
```css
/* utilities/motion.css */

/* Enter animations */
.animate-fade-in    { animation: fadeIn    var(--motion-enter) both; }
.animate-slide-up   { animation: slideUp   var(--motion-enter) both; }
.animate-slide-down { animation: slideDown var(--motion-enter) both; }
.animate-scale-in   { animation: scaleIn   var(--motion-enter) both; }
.animate-pop        { animation: pop       var(--motion-pop)   both; }

/* Exit animations */
.animate-fade-out    { animation: fadeOut    var(--motion-exit) both; }
.animate-slide-up-out { animation: slideUpOut var(--motion-exit) both; }

/* Stagger modifier */
.stagger-children > * {
  animation-delay: calc(var(--stagger-index, 0) * var(--motion-stagger-unit));
}

@keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOut   { to   { opacity: 0; } }
@keyframes slideUp   { from { opacity: 0; transform: translateY(var(--motion-slide-md)); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUpOut { to  { opacity: 0; transform: translateY(calc(-1 * var(--motion-slide-md))); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(calc(-1 * var(--motion-slide-md))); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn   { from { opacity: 0; transform: scale(var(--motion-scale-enter)); } to { opacity: 1; transform: scale(1); } }
@keyframes pop       { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
```

### Step 3: Apply via component CSS (not inline styles)
```css
/* components/modal.css */
.modal[data-state="open"]  { animation: slideUp  var(--motion-enter) both; }
.modal[data-state="closed"] { animation: slideDown var(--motion-exit) both; }
```

### Step 4: Test with reduced motion
```bash
# Chrome DevTools: Rendering panel → Emulate CSS media feature: prefers-reduced-motion: reduce
# Verify all animations are disabled or replaced with opacity-only fades
```

---

## Motion Token Audit Checklist

Before shipping, verify:
- [ ] All transition/animation durations use `--motion-*` tokens, not hard-coded ms values
- [ ] All easing uses `--motion-ease-*` tokens, not `ease`, `ease-in`, `ease-out` keywords
- [ ] `prefers-reduced-motion` collapses all durations
- [ ] No `linear` easing on non-looping animations
- [ ] No transitions on `width`, `height`, `margin`, `padding` (use `transform` + `max-height` with caution)
- [ ] Entering elements use `ease-out`, exiting elements use `ease-in`
- [ ] Large elements use longer durations than small elements
