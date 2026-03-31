# Animation Principles for UI Design

Disney's 12 principles of animation, adapted for interface design. These principles distinguish animation that feels natural and purposeful from animation that feels mechanical or arbitrary.

---

## Why Animation Matters in UI

Animation serves three functional roles:

1. **Orientation** — tells users where they came from and where they're going
2. **Feedback** — confirms that actions had an effect
3. **Guidance** — directs attention to what matters next

Animation hurts UX when it delays tasks, adds motion without meaning, or triggers vestibular disorders. The rule: animate to communicate, not to decorate.

---

## Principle 1: Slow In, Slow Out (Easing)

### Concept
Objects in the real world don't start or stop instantaneously. They accelerate and decelerate. A ball rolling to a stop slows gradually; a door opening accelerates then decelerates as it reaches the open position.

### UI Application
- **Entering elements** should ease out (fast start, slow end) — they arrive with energy and settle
- **Exiting elements** should ease in (slow start, fast end) — they build momentum to leave
- **Moving between states** uses ease-in-out — symmetrical acceleration curve
- Linear motion looks mechanical and robotic; never use `linear` for UI movement

### When it hurts
Linear easing on modals, tooltips, or any element that moves across the screen feels like a PowerPoint slide. Always apply easing.

```css
/* Easing tokens — the foundation of a motion system */
:root {
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);     /* enter: decelerate */
  --ease-in: cubic-bezier(0.4, 0.0, 1, 1);          /* exit: accelerate */
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);   /* move: both */
  --ease-standard: cubic-bezier(0.2, 0.0, 0, 1.0); /* Material's standard */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* overshoot spring */
}

/* Entering modal — ease-out */
.modal-enter {
  animation: modalEnter 250ms var(--ease-out) forwards;
}

/* Exiting modal — ease-in */
.modal-exit {
  animation: modalExit 200ms var(--ease-in) forwards;
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalExit {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
}

/* Demonstrating linear vs eased — always prefer eased */
.bad-linear-move {
  transition: transform 300ms linear; /* robotic */
}

.good-eased-move {
  transition: transform 300ms var(--ease-in-out); /* natural */
}
```

---

## Principle 2: Anticipation

### Concept
Before a major action, a small preparatory motion in the opposite direction. Think of a baseball pitcher winding up before throwing. It signals intent and makes the action feel more powerful.

### UI Application
- Button press: slight scale-down before confirming action
- Drag-and-drop: element "lifts" before moving
- Navigation: slight pull-back before slide transition
- Delete action: item shrinks slightly before expanding and removing

### When it hurts
Anticipation adds ~50-100ms to perceived response time. Only use on significant, intentional actions (destructive actions, primary CTAs). Never on hover states or passive interactions.

```css
/* Button with anticipation on press */
.btn-primary {
  transform: scale(1);
  transition: transform 150ms var(--ease-out);
}

/* Hover: subtle lift (no anticipation needed) */
.btn-primary:hover {
  transform: scale(1.02);
}

/* Active: dip down first (anticipation), then snap up on release */
.btn-primary:active {
  transform: scale(0.96);
  transition: transform 80ms var(--ease-in);
}

/* Drag handle — lifts with anticipation */
.draggable-item {
  transition: transform 200ms var(--ease-out),
              box-shadow 200ms var(--ease-out);
}

.draggable-item.is-dragging {
  transform: scale(1.03) rotate(1.5deg);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2);
  cursor: grabbing;
}

/* List item delete: anticipation (expand) then remove */
@keyframes anticipateDelete {
  0%   { transform: scaleX(1); }
  20%  { transform: scaleX(1.02); }   /* anticipation: slight expand */
  100% { transform: scaleX(0); opacity: 0; } /* then shrink away */
}

.list-item.deleting {
  animation: anticipateDelete 300ms var(--ease-in) forwards;
  transform-origin: left center;
}
```

---

## Principle 3: Follow-Through and Overlapping Action

### Concept
Not all parts of an object stop at the same time. A character's hair keeps moving after they stop. Parts decelerate at different rates, creating organic, layered motion.

### UI Application
- Dropdown menu: items stagger-delay their entrance (each item overlaps the previous)
- Sidebar: icon and label animate with slight offset
- Form validation: error icon appears then message fades in
- Navigation menu: background closes first, then items fade out

### When it hurts
Overlapping action that adds >100ms total delay to a task completion is friction, not delight. Keep stagger delays tight (20-40ms between items).

```css
/* Staggered list entrance — overlapping action */
.menu-item {
  opacity: 0;
  transform: translateX(-12px);
  animation: slideInItem 200ms var(--ease-out) forwards;
}

/* Each item delayed slightly more than the previous */
.menu-item:nth-child(1) { animation-delay: 0ms; }
.menu-item:nth-child(2) { animation-delay: 30ms; }
.menu-item:nth-child(3) { animation-delay: 60ms; }
.menu-item:nth-child(4) { animation-delay: 90ms; }
.menu-item:nth-child(5) { animation-delay: 120ms; }

@keyframes slideInItem {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Follow-through: notification badge pops then settles */
@keyframes badgePop {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.3); }  /* overshoot — follow through */
  80%  { transform: scale(0.9); }  /* bounce back */
  100% { transform: scale(1); }
}

.notification-badge.new {
  animation: badgePop 400ms var(--ease-out) forwards;
}

/* Header and content with overlapping stagger */
.panel-header {
  animation: fadeSlideDown 250ms var(--ease-out) forwards;
}

.panel-content {
  animation: fadeSlideDown 250ms var(--ease-out) 80ms forwards; /* 80ms delay */
  opacity: 0;
}

@keyframes fadeSlideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## Principle 4: Staging

### Concept
Present one idea at a time. Frame the scene so the viewer knows where to look. In film, this is camera angle and blocking. In UI, it's z-order, motion direction, and timing.

### UI Application
- When a modal opens, background dims first to direct focus to the modal
- Toast notifications enter from a consistent edge so users learn where to look
- Onboarding steps: one panel at a time, previous panel exits before next enters
- Error state: highlight the field first, then show the message

### When it hurts
Simultaneous animations competing for attention. If two things animate at once, neither is staged. Rule: one primary animation, secondary animations only as supporting cast.

```css
/* Staged modal: backdrop first, then content */
.modal-backdrop {
  animation: fadeIn 150ms var(--ease-out) forwards;
}

.modal-content {
  /* Content waits for backdrop to establish context */
  animation: scaleIn 200ms var(--ease-out) 100ms forwards;
  opacity: 0;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(16px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Staged toast: slides in from bottom-right, commands attention */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  animation: toastEnter 250ms var(--ease-out) forwards;
}

@keyframes toastEnter {
  from {
    opacity: 0;
    transform: translateX(16px) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

/* Page transition staging: old page exits, then new page enters */
.page-exit {
  animation: pageExit 200ms var(--ease-in) forwards;
}

.page-enter {
  animation: pageEnter 250ms var(--ease-out) 150ms forwards; /* wait for exit */
  opacity: 0;
}

@keyframes pageExit {
  to { opacity: 0; transform: translateX(-24px); }
}

@keyframes pageEnter {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

---

## Principle 5: Timing

### Concept
The number of frames (duration) determines the weight and scale of an action. Heavy, large objects move slowly; small, light objects move quickly.

### UI Duration Guidelines

| Element size / weight | Duration | Example |
|----------------------|----------|---------|
| Micro feedback (icon swap) | 80–100ms | Checkbox tick |
| Small components | 100–150ms | Tooltip, chip |
| Medium components | 200–300ms | Dropdown, popover |
| Large panels | 300–400ms | Sheet, sidebar |
| Full-screen transitions | 400–600ms | Page transitions |
| Looping / ambient | 1000ms+ | Loading spinner |

### When it hurts
Slow UI = frustrated users. 300ms feels instant; 600ms feels sluggish. Users waiting for a UI element to finish animating before they can interact is a UX failure.

```css
/* Duration tokens */
:root {
  --duration-instant:  0ms;
  --duration-micro:    100ms;
  --duration-fast:     150ms;
  --duration-normal:   250ms;
  --duration-slow:     400ms;
  --duration-slower:   600ms;
}

/* Small = fast */
.tooltip {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

/* Medium = normal */
.dropdown-menu {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

/* Large = slow */
.side-panel {
  transition: transform var(--duration-slow) var(--ease-out);
}

/* Demonstrate weight: heavy element moves slower */
.card-small {
  transition: transform var(--duration-fast) var(--ease-out);
}

.card-large {
  transition: transform var(--duration-normal) var(--ease-out);
}
```

---

## Principle 6: Secondary Action

### Concept
Smaller motions that support and reinforce the primary action. When a character walks, their arms swing. The walk is primary; the arm swing is secondary.

### UI Application
- When a form submits: button becomes spinner (primary), label fades out (secondary)
- When a row deletes: row collapses (primary), sibling rows shift up (secondary)
- When a panel opens: content slides in (primary), scrollbar appears (secondary)
- When an image loads: fade in (primary), subtle scale (secondary)

### When it hurts
Secondary actions that draw more attention than primary actions break staging. Keep secondary animations subtle (scale 0.01–0.03, opacity 0.1–0.3 change).

```css
/* Submit button: primary (spinner) + secondary (label fade) */
.btn-submit {
  position: relative;
  overflow: hidden;
}

.btn-submit .btn-label {
  transition: opacity var(--duration-fast) var(--ease-in),
              transform var(--duration-fast) var(--ease-in);
}

.btn-submit .btn-spinner {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

/* When loading state begins */
.btn-submit.is-loading .btn-label {
  opacity: 0;
  transform: translateY(-4px); /* secondary: label exits up */
}

.btn-submit.is-loading .btn-spinner {
  opacity: 1; /* primary: spinner appears */
}

/* List reorder: rows shift (secondary) when item deletes (primary) */
.list-item {
  /* Height transition enables smooth collapse */
  transition: height var(--duration-normal) var(--ease-in-out),
              opacity var(--duration-fast) var(--ease-in),
              margin var(--duration-normal) var(--ease-in-out); /* secondary */
}

.list-item.is-removing {
  height: 0;
  opacity: 0;
  margin: 0;
  overflow: hidden;
}
```

---

## Principle 7: Squash and Stretch

### Concept
Deformation that implies physical mass and flexibility. A rubber ball squashes on impact and stretches when moving quickly. Rigid objects (a bowling ball) show no squash/stretch.

### UI Application
UI elements are mostly rigid, but soft squash/stretch adds life to:
- Button press confirmation (very subtle)
- Notification badge appearance
- Loading indicators (bouncing dots)
- Switch/toggle sliding

Avoid obvious distortion — UI elements should not look like cartoon characters.

```css
/* Subtle squash on button press */
.btn {
  transition: transform 80ms var(--ease-in);
}

.btn:active {
  /* Squash: slightly shorter and wider */
  transform: scaleX(1.04) scaleY(0.96);
}

/* Bouncing dot loader — squash at ground, stretch in air */
@keyframes bounceDot {
  0%, 100% {
    transform: translateY(0) scaleX(1) scaleY(1);
    animation-timing-function: var(--ease-in);
  }
  45% {
    /* Stretch while rising */
    transform: translateY(-16px) scaleX(0.85) scaleY(1.15);
    animation-timing-function: var(--ease-out);
  }
  90% {
    /* Squash on landing */
    transform: translateY(2px) scaleX(1.2) scaleY(0.85);
  }
}

.loader-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
  animation: bounceDot 600ms infinite;
}

.loader-dot:nth-child(2) { animation-delay: 100ms; }
.loader-dot:nth-child(3) { animation-delay: 200ms; }

/* Toggle switch with stretch */
@keyframes toggleThumb {
  0%   { width: 20px; }
  30%  { width: 26px; } /* stretch as it starts moving */
  100% { width: 20px; }
}

.toggle-thumb.sliding {
  animation: toggleThumb 200ms var(--ease-out);
}
```

---

## Principle 8: Arcs

### Concept
Natural motion follows curved paths, not straight lines. A thrown ball arcs. A hand reaching for something curves outward then inward.

### UI Application
- Floating action button expanding into options: arc outward
- Cursor-following tooltips: subtle arc into position
- Card flips: should feel like physical rotation, not a flat scale
- Notification sliding in from corner: slight arc on entry

### When it hurts
Arcs are expensive to implement precisely in CSS (requires offsetPath or JS). For most UI, easing on a straight-line translation approximates arc well enough. Only use actual curved paths for hero animations or branded moments.

```css
/* Arc using offset-path — FAB expanding to action buttons */
.fab-action-btn {
  position: absolute;
  offset-path: path('M 0 0 Q 40 -20 0 -64'); /* curved path */
  offset-distance: 0%;
  transition: offset-distance 300ms var(--ease-spring);
}

.fab-open .fab-action-btn {
  offset-distance: 100%;
}

/* Simulated arc via compound transforms */
/* Movement with slight overshoot simulates arc feel */
@keyframes arcIn {
  0% {
    transform: translate(40px, 40px) scale(0.8);
    opacity: 0;
  }
  60% {
    transform: translate(-4px, -4px) scale(1.02); /* slight overshoot */
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}

.floating-element {
  animation: arcIn 350ms var(--ease-out) forwards;
}

/* Dropdown that arcs from trigger point */
.dropdown {
  transform-origin: top left;
  animation: dropdownArc 200ms var(--ease-spring) forwards;
}

@keyframes dropdownArc {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

---

## When Animation Helps vs Hurts

### Helps
- **State transitions**: show relationship between before/after states
- **Spatial orientation**: slide direction communicates hierarchy (child slides from right, parent from left)
- **Causal feedback**: confirms button tap, form submit, toggle change
- **Loading/progress**: transforms waiting from anxiety to expectation
- **Attention guidance**: pulse/glow on new items draws eye without being disruptive

### Hurts
- **Delays task completion**: any animation blocking interaction for >200ms is friction
- **Decorative only**: animation that adds no information is noise
- **Vestibular triggers**: large-scale movement, parallax, and spinning cause motion sickness for ~35% of users
- **Performance degradation**: animating layout properties (width, height, margin, padding) causes reflow and jank
- **Inconsistency**: mixing duration/easing tokens creates visual noise

### The `prefers-reduced-motion` rule — always implement

```css
/* Always include this. It's not optional. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Or: provide reduced-motion alternatives instead of removing entirely */
@media (prefers-reduced-motion: reduce) {
  .modal-enter {
    /* Fade only — no movement */
    animation: fadeIn 150ms var(--ease-out) forwards;
  }

  .page-transition {
    /* Skip transition entirely */
    animation: none;
  }
}

/* Respect preference in JS too */
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const duration = prefersReducedMotion ? 0 : 250;
```

---

## Quick Reference: Principle to CSS Property Mapping

| Principle | Primary CSS Properties |
|-----------|----------------------|
| Slow in/out | `cubic-bezier()`, `transition-timing-function` |
| Anticipation | `:active` pseudo-class, `scale()` |
| Follow-through | `animation-delay`, stagger patterns |
| Staging | `animation-delay` sequencing, z-index |
| Timing | `transition-duration`, `animation-duration` |
| Secondary action | Multiple `transition` properties, `animation-delay` |
| Squash & stretch | `scaleX()`, `scaleY()` independent transforms |
| Arcs | `offset-path`, compound `transform` sequences |
