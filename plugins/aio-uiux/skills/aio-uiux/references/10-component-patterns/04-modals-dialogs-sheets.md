# Modals, Dialogs & Sheets

## Decision Guide: Modal vs Sheet vs New Page

Before building any overlay, ask: does this need to interrupt the user?

| Signal | Use |
|--------|-----|
| Simple confirmation (2 choices, <3 sentences) | Modal dialog |
| Short form (2–5 fields, no navigation) | Modal form |
| Long form, multi-step, or needs back button | New page |
| Settings panel, filters, detail view | Drawer/side sheet |
| Mobile-first contextual action | Bottom sheet |
| Quick info without blocking interaction | Popover |
| Brief label for an element | Tooltip |
| Complex workflow the user can return to | New page |
| Action requires full context of current page | Modal |

**The core rule:** If the user needs to scroll, navigate, or reference the page behind it, use a new page or drawer. Modals that scroll are almost always the wrong choice.

---

## Modal Dialog

A blocking overlay that demands user attention before they can continue.

### Anatomy
```
┌─ backdrop (scrim) ──────────────────────────┐
│                                             │
│   ┌─ dialog ──────────────────────────┐    │
│   │  [Close ×]                        │    │
│   │  Title                            │    │
│   │  ─────────────────────────────    │    │
│   │  Body content                     │    │
│   │                                   │    │
│   │  ─────────────────────────────    │    │
│   │  [Cancel]              [Confirm]  │    │
│   └───────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### HTML Structure
```html
<!-- Trigger -->
<button class="btn btn-primary"
        aria-haspopup="dialog"
        aria-controls="confirm-dialog">
  Delete account
</button>

<!-- Dialog -->
<div
  id="confirm-dialog"
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
  class="dialog"
  hidden
>
  <div class="dialog-backdrop" data-close></div>
  <div class="dialog-panel">
    <div class="dialog-header">
      <h2 id="dialog-title" class="dialog-title">Delete account?</h2>
      <button
        class="btn-icon dialog-close"
        aria-label="Close dialog"
        data-close
      >
        <svg aria-hidden="true"><!-- x --></svg>
      </button>
    </div>
    <div class="dialog-body">
      <p id="dialog-desc">
        This will permanently delete your account and all associated data.
        This action cannot be undone.
      </p>
    </div>
    <div class="dialog-footer">
      <button class="btn btn-secondary" data-close>Cancel</button>
      <button class="btn btn-destructive" id="confirm-delete">Delete account</button>
    </div>
  </div>
</div>
```

### CSS
```css
.dialog {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog[hidden] { display: none; }

.dialog-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.dialog-panel {
  position: relative;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 20px 20px 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.dialog-body { padding: 16px 20px; flex: 1; }
.dialog-footer {
  padding: 0 20px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Entry animation */
@media (prefers-reduced-motion: no-preference) {
  .dialog-panel {
    animation: dialog-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes dialog-in {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
}
```

### Focus Trapping (Critical)
```js
function trapFocus(dialog) {
  const focusable = dialog.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Focus first focusable element on open
  first?.focus();
}

function openDialog(dialog, returnFocus) {
  dialog.removeAttribute('hidden');
  document.body.style.overflow = 'hidden'; // scroll lock
  trapFocus(dialog);
  // store trigger to restore focus on close
  dialog._returnFocus = returnFocus;
}

function closeDialog(dialog) {
  dialog.setAttribute('hidden', '');
  document.body.style.overflow = '';
  dialog._returnFocus?.focus(); // return focus to trigger
}
```

### Using Native `<dialog>` Element (Recommended)
```html
<dialog
  id="confirm-dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <!-- content -->
  <button autofocus>Cancel</button>
  <button>Confirm</button>
</dialog>
```

```js
const dialog = document.getElementById('confirm-dialog');
dialog.showModal(); // opens with backdrop, focus trap, ESC key — all native
dialog.close();     // closes
// Polyfill: dialog-polyfill for older browsers
```

Native `<dialog>` handles focus trapping, ESC key, backdrop, scroll lock automatically. Use it when browser support allows.

---

## Scroll Locking

When a modal opens, prevent background scrolling:

```js
// Simple approach
document.body.style.overflow = 'hidden';

// Better: preserve scroll position and handle scrollbar width
function lockScroll() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = `${scrollbarWidth}px`; // prevent layout shift
  document.body.style.overflow = 'hidden';
}
function unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}
```

---

## Confirmation Dialog

The most common modal. Two-choice decision with clear consequence.

**Rules:**
- Title is a question: "Delete project?" not "Confirm"
- Body explains consequences specifically: "All 47 files will be deleted."
- Destructive action button is red and on the RIGHT
- Cancel is always available (secondary button or ghost)
- Do not use "OK" / "Yes" as button labels — be specific: "Delete", "Archive", "Disconnect"

```html
<!-- Danger confirmation -->
<div class="dialog-footer">
  <button class="btn btn-secondary" data-close>Keep project</button>
  <button class="btn btn-destructive">Delete forever</button>
</div>
```

---

## Alert Dialog

Non-interactive announcement. Differs from confirmation in that no decision is required — only acknowledgment.

```html
<div role="alertdialog"
     aria-modal="true"
     aria-labelledby="alert-title"
     aria-describedby="alert-body">
  <h2 id="alert-title">Session expired</h2>
  <p id="alert-body">You've been signed out due to inactivity.</p>
  <button autofocus>Sign in again</button>
</div>
```

`role="alertdialog"` (vs `role="dialog"`) signals to screen readers that this requires immediate attention.

---

## Drawer / Side Sheet

A panel that slides in from an edge. Non-blocking alternative to modals.

```css
.drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0; /* or left: 0 */
  width: min(480px, 90vw);
  background: var(--color-surface);
  box-shadow: var(--shadow-2xl);
  z-index: var(--z-drawer);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer[aria-hidden="false"],
.drawer.is-open {
  transform: translateX(0);
}

.drawer-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.drawer-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
```

**When to use drawer over modal:**
- Settings panels
- Filter/sort panels in data views
- Detail views (user profile, order details)
- Edit forms where user may reference the page content
- Content that benefits from full height

**Left vs right:** Right drawer for detail/context. Left drawer for navigation (nav menu on mobile).

---

## Bottom Sheet

A drawer anchored to the bottom of the viewport. Primary pattern for mobile action menus and contextual panels.

```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
  z-index: var(--z-sheet);
  transform: translateY(100%);
  transition: transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.bottom-sheet.is-open { transform: translateY(0); }

/* Drag handle */
.bottom-sheet::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  margin: 12px auto 0;
  flex-shrink: 0;
}
```

**Snap points:** A bottom sheet can have multiple heights.
- Peek (handle + title only): ~80px
- Half: 50vh
- Full: 90vh

Users drag between snap points. Implement with pointer events + CSS transitions.

**When to use:** Mobile action menus (share, options), quick filters, mini-player controls, contextual detail. On desktop, prefer side drawer.

---

## Full-Screen Overlay

Takes over the entire screen. Used for immersive experiences.

```css
.overlay-fullscreen {
  position: fixed;
  inset: 0;
  z-index: var(--z-fullscreen);
  background: var(--color-surface);
  overflow-y: auto;
}
```

**When to use:** Image/video lightbox, onboarding flows, mobile search, wizard that spans multiple steps.

**Always provide:** Clear exit mechanism (ESC, X button, back button on mobile), scroll restoration on close.

---

## Popover

Anchored to a trigger element. Non-modal — background remains interactive.

```html
<!-- Native Popover API (modern browsers) -->
<button popovertarget="settings-pop" popovertargetaction="toggle">
  Settings
</button>
<div id="settings-pop" popover class="popover-panel">
  <p>Popover content here.</p>
</div>
```

```css
.popover-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 12px;
  max-width: 320px;
}
/* Native popover positions relative to anchor — use CSS anchor positioning */
```

**Custom JS popover positioning:**
```js
function positionPopover(trigger, popover) {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow >= popover.offsetHeight || spaceBelow >= spaceAbove) {
    // position below
    popover.style.top = `${rect.bottom + 8}px`;
  } else {
    // position above
    popover.style.top = `${rect.top - popover.offsetHeight - 8}px`;
  }
  popover.style.left = `${Math.max(8, rect.left)}px`;
}
```

**Popover vs Tooltip:** Popovers contain interactive content (buttons, links, forms). Tooltips are text-only and non-interactive. Popovers are dismissible (ESC, click outside); tooltips follow hover/focus.

---

## Tooltip

Non-interactive text label. Appears on hover or focus.

```html
<button
  aria-describedby="copy-tooltip"
  class="btn-icon"
  aria-label="Copy to clipboard"
>
  <svg aria-hidden="true"><!-- copy icon --></svg>
</button>
<div id="copy-tooltip" role="tooltip">Copy to clipboard</div>
```

```css
[role="tooltip"] {
  position: absolute;
  background: var(--color-gray-900);
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  pointer-events: none;
  z-index: var(--z-tooltip);
  /* shown/hidden via JS positioning + opacity */
}
```

**Rules:**
- Never put essential information only in tooltips (they're not accessible on touch)
- Max length: ~60 characters — anything longer should be a popover
- Do not repeat the button's visible label (tooltip adds, not duplicates)
- Tooltips on disabled elements: wrap in a `<span>` since pointer events are disabled on the element itself
- Show delay: 300–500ms on hover (prevent tooltip flash on mouse movement)
- Never include interactive content (links, buttons) — use popover

---

## ESC Key Handling

Every overlay must close on ESC. Layer them correctly when nested.

```js
// Global ESC handler with stack
const overlayStack = [];

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlayStack.length > 0) {
    e.preventDefault();
    const topOverlay = overlayStack[overlayStack.length - 1];
    topOverlay.close();
  }
});

function openOverlay(overlay) {
  overlayStack.push(overlay);
  // ... open logic
}

function closeOverlay(overlay) {
  const idx = overlayStack.indexOf(overlay);
  if (idx > -1) overlayStack.splice(idx, 1);
  // ... close logic, restore focus
}
```

---

## Accessibility Checklist

- `role="dialog"` + `aria-modal="true"` on dialog container
- `aria-labelledby` pointing to dialog title
- `aria-describedby` pointing to dialog description (if applicable)
- Focus moves INTO dialog on open (first focusable element or element with `autofocus`)
- Focus TRAPPED inside dialog (Tab and Shift+Tab cycle within)
- ESC closes dialog
- Background content has `aria-hidden="true"` while dialog is open (or use `inert` attribute)
- Focus RETURNS to trigger element on close
- Scroll lock on body when modal is open
- Backdrop click closes (modal dialogs); configurable for important confirmations
- `role="alertdialog"` for dialogs that require immediate user response
- Bottom sheets: drag handle has accessible label; snap points navigable by keyboard

```js
// Mark background inert when dialog is open
function openDialog(dialog) {
  document.querySelector('main').setAttribute('inert', '');
  dialog.removeAttribute('hidden');
  // focus management...
}
function closeDialog(dialog) {
  document.querySelector('main').removeAttribute('inert');
  dialog.setAttribute('hidden', '');
  // restore focus...
}
```

---

## Z-Index Scale

Maintain a predictable layering system:

```css
:root {
  --z-base: 0;
  --z-raised: 10;       /* cards, dropdowns */
  --z-sticky: 100;      /* sticky headers */
  --z-drawer: 200;      /* side sheets */
  --z-fab: 300;         /* floating action button */
  --z-modal: 400;       /* dialogs */
  --z-toast: 500;       /* notifications */
  --z-tooltip: 600;     /* tooltips */
  --z-fullscreen: 700;  /* full-screen overlays */
}
```

---

## Common Pitfalls

1. **Modal for complex workflows** — user loses context; use page navigation
2. **No focus management** — screen reader user is lost in background content
3. **Closing modal on backdrop click for destructive actions** — user may accidentally dismiss
4. **Tooltip on touch devices** — hover doesn't exist; use long-press or info icon with popover
5. **Nested modals** — almost always wrong; redesign the flow
6. **Modal without scroll lock** — background scrolls while modal is open (distracting/confusing)
7. **Bottom sheet on desktop** — use drawer instead; bottom sheet is a mobile pattern
8. **ESC not working** — every overlay must respond to ESC
9. **Focus not returning to trigger** — keyboard/screen reader user loses their place on close
10. **Animation on prefers-reduced-motion** — always wrap transitions in motion media query
