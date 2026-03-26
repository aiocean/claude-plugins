# Touch Targets & Mobile UX

## Minimum Touch Target Size

Human fingers are imprecise pointing devices. A fingertip contact area is
roughly 10mm × 10mm, but varies widely. Design guidelines converge on minimums:

- **Apple HIG**: 44×44pt minimum (logical pixels on Retina = 88×88 physical)
- **Material Design**: 48×48dp minimum
- **WCAG 2.5.5 (AAA)**: 44×44 CSS pixels
- **WCAG 2.5.8 (AA, Level 2.2)**: 24×24 CSS pixels minimum (with spacing exceptions)

**Practical rule**: Use 44px minimum for all interactive elements. 48px is better.
Never go below 44px on mobile.

```css
/* All interactive elements meet minimum */
button,
[role="button"],
a,
input,
select,
textarea,
label[for] {
  min-height: 44px;
}

/* Button with internal padding */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding-inline: 1rem;
  font-size: 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* Icon button — visually small, tap area large */
.icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

/* Extend tap area without changing visual size */
.icon-btn::before {
  content: '';
  position: absolute;
  inset: -10px; /* Extends 10px in all directions → ~44px total */
}

/* Checkbox / radio with full label tap area */
.form-check {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  cursor: pointer;
}

.form-check input[type="checkbox"],
.form-check input[type="radio"] {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
}
```

### Target Spacing

Closely packed targets cause accidental taps. Maintain at least 8px between
interactive elements, ideally 12px+ on mobile.

```css
/* Button group with adequate spacing */
.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem; /* 12px — safe for adjacent targets */
}

/* List of interactive items */
.action-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.action-list__item {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding-inline: 1rem;
  border-bottom: 1px solid var(--color-border);
  gap: 0.75rem;
}
```

---

## Thumb Zone Mapping

The thumb naturally reaches different screen areas with varying ease. Design
primary actions for the comfortable zone.

```
  Portrait phone layout (right-hand grip):

  ┌─────────────────┐
  │ ░░░░░░░░░░░░░░░ │  ← Hard to reach (top corners)
  │ ░░░░░░░░░░░░░░░ │
  │░░░░░░░░░░░░░░░░░│
  │ ░░░░░░░░░░░░░░░ │  ← Stretch zone (upper-middle)
  │░░░░░░░░░░░░░░░░░│
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Natural zone (middle)
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Easy zone (lower-middle)
  │████████████████│
  │████████████████│  ← Primary zone (bottom)
  │████████████████│
  └─────────────────┘

  ░ = Difficult   ▓ = Comfortable   █ = Easiest
```

**CSS implications**:

```css
/* Bottom navigation — primary actions in thumb zone */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 60px;
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 100;
}

/* Floating action button — bottom-right thumb zone */
.fab {
  position: fixed;
  bottom: calc(1.5rem + env(safe-area-inset-bottom));
  right: 1.5rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

/* Push content above bottom nav */
.page-content {
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
}
```

---

## Bottom-of-Screen Actions

Prefer bottom placement for primary mobile actions. Modals, sheets, and CTAs
perform better when reachable with one hand.

```css
/* Bottom sheet — slides up from bottom */
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border-radius: 1rem 1rem 0 0;
  padding: 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 300;
  max-height: 90dvh;
  overflow-y: auto;
}

.bottom-sheet.is-open {
  transform: translateY(0);
}

/* Drag handle */
.bottom-sheet__handle {
  width: 36px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  margin: 0 auto 1.5rem;
}
```

---

## Pull-to-Refresh

Native pull-to-refresh behavior. CSS handles the visual indicator; JS handles
the data fetch.

```css
/* Container must be scrollable */
.pull-refresh-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain; /* Prevents page scroll during pull */
}

/* Refresh indicator */
.pull-refresh-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  margin-top: -60px; /* Hidden above scroll top */
  transition: margin-top 0.2s;
}

/* JS adds this class during pull */
.pull-refresh-container.is-pulling .pull-refresh-indicator {
  margin-top: 0;
}

/* Spinner animation */
.pull-refresh-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Swipe Gestures

CSS supports horizontal scroll snapping for swipe-like interactions.

```css
/* Horizontal swipe carousel */
.swipe-container {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  gap: 1rem;
  padding-inline: 1rem;

  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
}

.swipe-container::-webkit-scrollbar {
  display: none;
}

.swipe-item {
  scroll-snap-align: start;
  flex-shrink: 0;
  width: calc(100vw - 3rem); /* Peek next item */
}

/* Swipe tabs */
.tab-panels {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.tab-panel {
  scroll-snap-align: start;
  flex-shrink: 0;
  width: 100%;
}
```

---

## Safe Area Handling

Modern phones have notches, dynamic islands, and home indicators that overlap
content. CSS environment variables provide the inset values.

```css
/* Core safe area variables */
/* env(safe-area-inset-top)    — notch / status bar */
/* env(safe-area-inset-right)  — right side (landscape) */
/* env(safe-area-inset-bottom) — home indicator */
/* env(safe-area-inset-left)   — left side (landscape) */

/* Require viewport-fit=cover for these to have non-zero values */
/* <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> */

/* Full app shell */
.app {
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}

/* Fixed header — push below notch */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(60px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
}

/* Fixed bottom nav — push above home indicator */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom);
  height: calc(60px + env(safe-area-inset-bottom));
}

/* Combining with calc() */
.sticky-cta {
  position: sticky;
  bottom: max(1rem, env(safe-area-inset-bottom));
}
```

---

## Input Modes

The `inputmode` attribute controls which keyboard appears on mobile without
changing input validation behavior.

```html
<!-- Numeric keypad (PIN, quantity) -->
<input type="text" inputmode="numeric" pattern="[0-9]*">

<!-- Decimal numbers (price, measurement) -->
<input type="text" inputmode="decimal">

<!-- Phone number keyboard -->
<input type="tel" inputmode="tel">

<!-- Email keyboard (@ key prominent) -->
<input type="email" inputmode="email">

<!-- URL keyboard (. and / keys) -->
<input type="url" inputmode="url">

<!-- Search keyboard (search/go button) -->
<input type="search" inputmode="search">

<!-- No keyboard (custom input widget) -->
<input type="text" inputmode="none">
```

```css
/* Style inputs for mobile: large enough, clear, no decoration */
.mobile-input {
  width: 100%;
  height: 48px;
  padding: 0 1rem;
  font-size: 1rem; /* Critical: below 16px triggers zoom on iOS */
  border: 1.5px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  -webkit-appearance: none;
  appearance: none;
}

.mobile-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha);
}
```

---

## Preventing Zoom on Input Focus

iOS Safari zooms in when an input's font-size is below 16px. This disrupts UX.

```css
/* All form inputs: minimum 16px font-size */
input,
textarea,
select {
  font-size: max(16px, 1rem);
}

/* Alternatively, prevent zoom via viewport meta (NOT recommended for a11y) */
/* <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"> */
/* This prevents ALL zooming — breaks accessibility. Never use it. */

/* Correct approach: use font-size >= 16px on all inputs */
.input-sm {
  font-size: 16px; /* Override any small size on mobile */
  padding: 0.5rem 0.75rem;
}

@media (min-width: 768px) {
  .input-sm {
    font-size: 0.875rem; /* Can use smaller on desktop */
  }
}
```

---

## Viewport Meta Tag

The complete recommended viewport meta tag:

```html
<!-- Standard — use this for most sites -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- With safe-area support for notched phones -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

**Properties explained**:
- `width=device-width` — match CSS pixel width to device width
- `initial-scale=1` — no initial zoom
- `viewport-fit=cover` — extend to fill notch/corners (required for safe-area-inset-*)

**Never use**:
- `maximum-scale=1` — prevents user zoom (accessibility violation)
- `user-scalable=no` — same problem, deprecated in iOS 10+

---

## Mobile Keyboard Optimization

When the virtual keyboard appears, it resizes the viewport on many browsers.
Handle this gracefully.

```css
/* Prevent layout shift when keyboard opens */
/* Use dvh (dynamic viewport height) which updates with keyboard */
.chat-layout {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.chat-input-bar {
  flex-shrink: 0;
  padding: 0.75rem;
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

/* iOS: keyboard pushes bottom content — use position sticky on input bar */
.sticky-input-bar {
  position: sticky;
  bottom: 0;
  background: var(--color-surface);
}

/* Scroll to input on focus (handled by browser) */
/* Ensure padding so focused input isn't behind keyboard */
.form-container {
  padding-bottom: 40vh; /* Rough keyboard height on mobile */
}

@media (min-width: 768px) {
  .form-container {
    padding-bottom: 0;
  }
}
```

### autocomplete Attributes

Help mobile users fill forms faster:

```html
<input autocomplete="name">
<input autocomplete="given-name">
<input autocomplete="family-name">
<input autocomplete="email" type="email">
<input autocomplete="tel" type="tel">
<input autocomplete="street-address">
<input autocomplete="postal-code">
<input autocomplete="cc-number" inputmode="numeric">
<input autocomplete="cc-exp" inputmode="numeric">
<input autocomplete="new-password" type="password">
<input autocomplete="one-time-code" inputmode="numeric">
```
