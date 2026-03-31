# Scroll Snap and Popover API

## CSS Scroll Snap

Scroll snap makes scroll containers snap to defined alignment points after the user
stops scrolling. It's the CSS-native replacement for JavaScript carousel libraries.

### Core Properties

**On the scroll container:**

| Property                   | Values                              | Purpose                              |
|----------------------------|-------------------------------------|--------------------------------------|
| `scroll-snap-type`         | `x`, `y`, `both` + `mandatory`/`proximity` | Enable snapping on an axis  |
| `scroll-padding`           | length values                       | Inset snap area (accounts for sticky headers) |
| `overflow`                 | `scroll`, `auto`                    | Must be set for snapping to work     |
| `scroll-behavior`          | `smooth`, `auto`                    | Animated scrolling                   |

**On snap targets (children):**

| Property                   | Values                              | Purpose                              |
|----------------------------|-------------------------------------|--------------------------------------|
| `scroll-snap-align`        | `start`, `center`, `end`, `none`    | Where child snaps within container   |
| `scroll-snap-stop`         | `normal`, `always`                  | Force stop at every snap point       |

---

### mandatory vs proximity

```css
/* mandatory: ALWAYS snaps to the nearest snap point after scroll ends.
   User cannot rest between snap points. Best for full-screen slides. */
.slides-container {
  scroll-snap-type: x mandatory;
  overflow-x: scroll;
  display: flex;
}

.slide {
  scroll-snap-align: start;
  flex: 0 0 100%;
  min-width: 0;
}

/* proximity: snaps only if the scroll position is close to a snap point.
   User can scroll freely and rest between points. Better for card lists. */
.card-scroll {
  scroll-snap-type: x proximity;
  overflow-x: auto;
}
```

---

### Full-Screen Slide Deck

```css
.slides {
  scroll-snap-type: y mandatory;
  overflow-y: scroll;
  height: 100dvh;
  /* Hide scrollbar visually, keep functionality */
  scrollbar-width: none;
}

.slides::-webkit-scrollbar {
  display: none;
}

.slide {
  scroll-snap-align: start;
  scroll-snap-stop: always; /* prevents swipe from skipping slides */
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
```

### Horizontal Card Carousel

```css
.carousel {
  scroll-snap-type: x mandatory;
  overflow-x: auto;
  display: flex;
  gap: 1rem;
  padding-inline: 1.5rem;

  /* Smooth inertia scrolling on iOS */
  -webkit-overflow-scrolling: touch;

  /* Hide scrollbar */
  scrollbar-width: none;

  /* Overscroll containment — don't trigger page scroll */
  overscroll-behavior-x: contain;
}

.carousel::-webkit-scrollbar {
  display: none;
}

.carousel__item {
  scroll-snap-align: start;
  flex: 0 0 280px;
  min-width: 0;
}

/* Center-snap variant — items snap to center of viewport */
.carousel--centered .carousel__item {
  scroll-snap-align: center;
}

/* Partial peek: show edge of next card */
.carousel {
  padding-inline: 1.5rem;
}

.carousel__item {
  flex: 0 0 calc(100% - 3rem - 40px); /* leave 40px for peek */
}
```

### Scroll Padding for Sticky Headers

When you have a sticky header, snapped elements appear behind it.
`scroll-padding-top` offsets the snap target:

```css
html {
  scroll-padding-top: 80px; /* height of sticky header */
}

/* Or on the scroll container */
.section-scroll {
  scroll-snap-type: y mandatory;
  scroll-padding-top: 64px;
}

/* Works with anchor links too */
#section-about {
  scroll-margin-top: 80px; /* alternative: set on target, not container */
}
```

### Smooth Scrolling

```css
/* Apply globally — respects prefers-reduced-motion */
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

/* Programmatic smooth scroll */
```

```javascript
// Smooth scroll to element
document.querySelector('#section').scrollIntoView({
  behavior: 'smooth',
  block: 'start'
});

// Or via scrollTo on a container
container.scrollTo({
  left: targetOffset,
  behavior: 'smooth'
});
```

### Vertical Scrolling FAQ/Sections

```css
.faq-list {
  scroll-snap-type: y proximity;
  overflow-y: auto;
  max-height: 600px;
  /* Don't use mandatory for content of varying heights */
}

.faq-item {
  scroll-snap-align: start;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-default);
}
```

---

## Popover API

The Popover API is a native HTML/CSS mechanism for tooltips, dropdowns, toasts,
and overlay panels — without JavaScript state management for open/close behavior.

### Core Concepts

- `popover` attribute on any element marks it as a popover
- `popovertarget` attribute on a button connects it to a popover by ID
- Popovers are in the **top layer** — they render above everything, no z-index needed
- Light dismiss: clicking outside closes the popover automatically

### Basic Popover

```html
<!-- Trigger -->
<button popovertarget="my-popover">Open menu</button>

<!-- Popover panel -->
<div id="my-popover" popover>
  <p>Popover content</p>
  <button popovertarget="my-popover" popovertargetaction="hide">Close</button>
</div>
```

```css
/* Default popover styles — browser resets most styling */
[popover] {
  /* Reset browser default margin */
  margin: 0;
  padding: 1rem 1.5rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--bg-base);
  box-shadow: var(--shadow-lg);
  max-width: min(400px, 90vw);
  /* Popover is in top layer — no z-index needed */
}

/* Animate the popover */
[popover] {
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity 150ms,
    transform 150ms,
    display 150ms allow-discrete,
    overlay 150ms allow-discrete;
}

[popover]:popover-open {
  opacity: 1;
  transform: translateY(0);
}

/* Entry animation — @starting-style for the opening transition */
@starting-style {
  [popover]:popover-open {
    opacity: 0;
    transform: translateY(-8px);
  }
}
```

### Popover Types

```html
<!-- auto (default): light-dismiss, only one open at a time -->
<div id="dropdown" popover>...</div>

<!-- manual: no light-dismiss, must be closed programmatically or via button -->
<div id="toast" popover="manual">...</div>

<!-- hint: like auto but doesn't close other auto popovers (tooltips) -->
<div id="tooltip" popover="hint">...</div>
```

```css
/* Toast notifications — manual popover, positioned top-right */
#toast-container {
  position: fixed;
  inset-block-start: 1rem;
  inset-inline-end: 1rem;
  /* In top layer, so position: fixed works relative to viewport */
}

[popover="manual"] {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--color-neutral-800);
  color: white;
  font-size: 0.875rem;
  border: none;
  box-shadow: var(--shadow-lg);
}
```

### Popover JavaScript API

```javascript
const popover = document.getElementById('my-popover');

// Open programmatically
popover.showPopover();

// Close programmatically
popover.hidePopover();

// Toggle
popover.togglePopover();

// Check state
if (popover.matches(':popover-open')) { /* is open */ }

// Listen for toggle events
popover.addEventListener('toggle', (e) => {
  if (e.newState === 'open')  { /* opened */ }
  if (e.newState === 'closed') { /* closed */ }
});
```

---

## dialog Element

The `<dialog>` element is the native solution for modal and non-modal dialogs.
Unlike popover, it's specifically designed for dialogs that require user action.

### Modal vs Non-Modal

```html
<!-- Non-modal: other content is still interactive -->
<dialog id="side-panel">
  <h2>Settings</h2>
  <form method="dialog">
    <button>Close</button>
  </form>
</dialog>

<!-- Modal: backdrop shown, rest of page inert -->
<dialog id="confirm-dialog">
  <h2>Confirm deletion</h2>
  <p>This cannot be undone.</p>
  <form method="dialog">
    <button value="cancel">Cancel</button>
    <button value="confirm">Delete</button>
  </form>
</dialog>
```

```javascript
const modal = document.getElementById('confirm-dialog');
const panel = document.getElementById('side-panel');

// Open modal (with backdrop)
modal.showModal();

// Open non-modal (no backdrop)
panel.show();

// Close (also triggered by form[method="dialog"] submit)
modal.close();
modal.close('confirm'); // pass return value

// Get return value after close
modal.addEventListener('close', () => {
  if (modal.returnValue === 'confirm') {
    performDeletion();
  }
});

// Close on backdrop click
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close('cancel');
});
```

### Styling dialog

```css
/* Style the dialog element */
dialog {
  padding: 0;
  border: none;
  border-radius: 12px;
  box-shadow: var(--shadow-xl);
  background: var(--bg-base);
  max-width: min(560px, 90vw);
  max-height: 90dvh;
  overflow: hidden;
  /* No z-index needed — dialog is in top layer */
}

/* Style the backdrop (modal only) */
dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
  backdrop-filter: blur(4px);
}

/* Dialog internal layout */
.dialog-header {
  padding: 1.5rem 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-body {
  padding: 1rem 1.5rem;
  overflow-y: auto;
}

.dialog-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  border-top: 1px solid var(--border-subtle);
}

/* Animate dialog open/close */
dialog {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out,
    display 200ms allow-discrete,
    overlay 200ms allow-discrete;
}

dialog[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
}

dialog::backdrop {
  opacity: 0;
  transition:
    opacity 200ms ease-out,
    display 200ms allow-discrete,
    overlay 200ms allow-discrete;
}

dialog[open]::backdrop {
  opacity: 1;
}

@starting-style {
  dialog[open]::backdrop {
    opacity: 0;
  }
}
```

---

## Combining Popover with Anchor Positioning

```css
/* Anchor a dropdown popover to its trigger */
.dropdown-trigger {
  anchor-name: --dropdown-anchor;
}

#dropdown-menu {
  popover: auto;
  position: fixed;
  position-anchor: --dropdown-anchor;
  top: anchor(bottom);
  left: anchor(left);
  margin-top: 4px;
  min-width: anchor-size(width); /* match trigger width */

  padding: 0.5rem;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-base);
  box-shadow: var(--shadow-lg);

  /* Auto-flip if off-screen */
  position-try-fallbacks: flip-block;
}

#dropdown-menu [role="menuitem"] {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-primary);
  text-decoration: none;
  transition: background 100ms;
}

#dropdown-menu [role="menuitem"]:hover {
  background: var(--bg-muted);
}
```

---

## Popover vs dialog: When to Use Which

| Need                              | Use              |
|-----------------------------------|------------------|
| Dropdown menu                     | `popover="auto"` |
| Tooltip                           | `popover="hint"` |
| Toast notification                | `popover="manual"` |
| Confirmation modal (blocks interaction) | `dialog.showModal()` |
| Side panel / non-blocking overlay | `dialog.show()` or `popover="manual"` |
| Command palette                   | `dialog.showModal()` |
| Context menu                      | `popover="auto"` |
| Cookie banner                     | `popover="manual"` |

Key rule: if the user **must** respond before continuing (confirmation, form), use
`dialog.showModal()`. If the UI is supplemental and can be dismissed freely,
use `popover`.
