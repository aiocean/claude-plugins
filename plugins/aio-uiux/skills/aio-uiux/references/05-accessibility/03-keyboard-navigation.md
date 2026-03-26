# Keyboard Navigation

Keyboard accessibility is the foundation of all assistive technology support. Screen readers, switch devices, and voice control all build on keyboard semantics. Every interactive element must be reachable and operable without a mouse.

---

## Tab Order Management

### The Natural Tab Order

Tab order follows DOM order by default. Elements with `tabindex="0"` join the natural order. Elements with `tabindex="-1"` are reachable by script but not Tab key.

```html
<!-- Tab order follows DOM top-to-bottom -->
<header>
  <a href="/">Logo</a>          <!-- Tab 1 -->
  <nav>
    <a href="/about">About</a>  <!-- Tab 2 -->
    <a href="/blog">Blog</a>    <!-- Tab 3 -->
  </nav>
</header>
<main>
  <h1>Welcome</h1>              <!-- not focusable -->
  <button>Sign up</button>      <!-- Tab 4 -->
  <a href="/login">Log in</a>   <!-- Tab 5 -->
</main>
```

### tabindex Values

```html
<!-- tabindex="0": adds element to natural tab order -->
<div role="button" tabindex="0" onclick="doThing()">Custom button</div>

<!-- tabindex="-1": focusable by script only, removed from tab order -->
<div id="modal-content" tabindex="-1">
  <!-- Receives programmatic focus when modal opens -->
</div>

<!-- tabindex="1+" : AVOID — creates parallel tab order, nightmare to maintain -->
<!-- This is an anti-pattern -->
<input tabindex="3">  <!-- BAD -->
<input tabindex="1">  <!-- BAD -->
<input tabindex="2">  <!-- BAD -->
```

### Fixing Visual vs DOM Order Mismatch

CSS can reorder elements visually without changing DOM order. This breaks keyboard navigation.

```css
/* BAD: Visual order differs from DOM order */
.container {
  display: flex;
  flex-direction: row-reverse; /* visually reversed, but Tab still goes DOM order */
}

/* GOOD: Reorder DOM to match visual order */
/* Or accept that Tab order matches DOM, not visual position */

/* SAFE: Flexbox/Grid order property mismatch warning */
/* If visual order differs from DOM by more than cosmetic, reorder the HTML */
```

---

## Focus Management Strategies

### When to Move Focus Programmatically

Move focus when:
1. A dialog opens — move to first focusable element inside
2. A dialog closes — return to the trigger element
3. An error occurs on submit — move to error summary or first error field
4. A page section loads dynamically — announce via live region (not focus move)
5. After delete/remove — move to next item or container

```javascript
// Pattern: focus manager utility
const FocusManager = {
  // Store reference to trigger for return-focus
  _trigger: null,

  open(container, triggerEl) {
    this._trigger = triggerEl || document.activeElement;
    container.removeAttribute('hidden');
    this.focusFirst(container);
  },

  close(container) {
    container.setAttribute('hidden', '');
    this._trigger?.focus();
    this._trigger = null;
  },

  focusFirst(container) {
    const focusable = this.getFocusable(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      // Fall back to container itself
      container.setAttribute('tabindex', '-1');
      container.focus();
    }
  },

  getFocusable(container) {
    return [...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"]), details > summary'
    )].filter(el => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]'));
  }
};
```

### Announcing Dynamic Content Without Moving Focus

```html
<!-- Live region: screen reader announces without focus move -->
<div aria-live="polite" id="status-region" class="sr-only"></div>

<script>
function announce(message) {
  const region = document.getElementById('status-region');
  // Clear then set — ensures re-announcement if same message
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

// After AJAX save:
announce('Draft saved successfully.');

// After filter applied:
announce('Showing 24 of 156 results.');
</script>
```

---

## Roving tabindex for Composite Widgets

Composite widgets (toolbars, tab lists, menus, listboxes, radio groups) should behave as a single tab stop. Users Tab into the widget, then use arrow keys to navigate within it.

### Implementation

```javascript
class RovingTabindex {
  constructor(container, selector = '[role]') {
    this.container = container;
    this.selector = selector;
    this.items = [];
    this.currentIndex = 0;

    this.init();
  }

  init() {
    this.items = [...this.container.querySelectorAll(this.selector)];

    // Only first item is in tab order
    this.items.forEach((item, i) => {
      item.tabIndex = i === 0 ? 0 : -1;
    });

    this.container.addEventListener('keydown', this.handleKey.bind(this));
    this.container.addEventListener('focus', this.handleFocus.bind(this), true);
  }

  handleFocus(e) {
    const item = e.target.closest(this.selector);
    if (item) {
      this.currentIndex = this.items.indexOf(item);
    }
  }

  handleKey(e) {
    const { key } = e;
    let next = this.currentIndex;

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      e.preventDefault();
      next = (this.currentIndex + 1) % this.items.length;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      e.preventDefault();
      next = (this.currentIndex - 1 + this.items.length) % this.items.length;
    } else if (key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (key === 'End') {
      e.preventDefault();
      next = this.items.length - 1;
    } else {
      return;
    }

    this.moveTo(next);
  }

  moveTo(index) {
    this.items[this.currentIndex].tabIndex = -1;
    this.currentIndex = index;
    this.items[this.currentIndex].tabIndex = 0;
    this.items[this.currentIndex].focus();
  }
}

// Usage
const toolbar = document.querySelector('[role="toolbar"]');
new RovingTabindex(toolbar, '[role="button"]');

const tablist = document.querySelector('[role="tablist"]');
new RovingTabindex(tablist, '[role="tab"]');
```

### HTML for toolbar

```html
<div role="toolbar" aria-label="Text formatting">
  <button type="button" role="button" tabindex="0" aria-pressed="false" aria-label="Bold">B</button>
  <button type="button" role="button" tabindex="-1" aria-pressed="false" aria-label="Italic">I</button>
  <button type="button" role="button" tabindex="-1" aria-pressed="false" aria-label="Underline">U</button>
  <div role="separator" aria-orientation="vertical"></div>
  <button type="button" role="button" tabindex="-1" aria-label="Align left">⬅</button>
  <button type="button" role="button" tabindex="-1" aria-label="Align center">⬛</button>
  <button type="button" role="button" tabindex="-1" aria-label="Align right">➡</button>
</div>
```

---

## Focus Trapping for Modals

When a modal dialog is open, Tab must stay inside it. Pressing Tab at the last focusable element wraps to the first, and Shift+Tab at the first wraps to the last.

```javascript
function createFocusTrap(container) {
  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'details > summary',
  ].join(', ');

  function getFocusable() {
    return [...container.querySelectorAll(FOCUSABLE)]
      .filter(el => !el.hasAttribute('hidden') &&
                    !el.closest('[hidden]') &&
                    getComputedStyle(el).display !== 'none');
  }

  function trap(e) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusable();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return {
    activate() { document.addEventListener('keydown', trap); },
    deactivate() { document.removeEventListener('keydown', trap); }
  };
}

// Usage
const trap = createFocusTrap(document.getElementById('modal'));
trap.activate();
// on close:
trap.deactivate();
```

### The `inert` Attribute (Modern Approach)

The `inert` attribute makes everything inside it non-focusable and hidden from AT — the browser-native focus trap.

```html
<header inert>...</header>      <!-- blocked when modal open -->
<main inert>...</main>          <!-- blocked when modal open -->
<div role="dialog" id="modal">  <!-- only this is focusable -->
  ...
</div>
```

```javascript
function openModal(modal) {
  // Make everything outside the modal inert
  document.querySelectorAll('body > *:not(#modal-container)').forEach(el => {
    el.inert = true;
  });
  modal.removeAttribute('hidden');
  FocusManager.focusFirst(modal);
}

function closeModal(modal) {
  document.querySelectorAll('[inert]').forEach(el => {
    el.inert = false;
  });
  modal.setAttribute('hidden', '');
  previousFocus?.focus();
}
```

---

## Skip Links

Skip links allow keyboard users to bypass repeated navigation and jump to main content.

```html
<!-- Place as FIRST element in <body> -->
<a href="#main-content" class="skip-link">Skip to main content</a>
<a href="#main-nav" class="skip-link">Skip to navigation</a>

<!-- ... header, nav ... -->

<main id="main-content" tabindex="-1">  <!-- tabindex="-1" to receive programmatic focus -->
  <h1>Page title</h1>
  ...
</main>
```

```css
.skip-link {
  /* Visually hidden until focused */
  position: absolute;
  top: -100%;
  left: 0;
  z-index: 9999;
  padding: 12px 24px;
  background: #000;
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  /* Transition for smooth reveal */
  transition: top 200ms;
}

.skip-link:focus {
  top: 0;
}

/* Alternative: clip-based visually hidden (doesn't animate) */
.skip-link-clip {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.skip-link-clip:focus {
  clip: auto;
  clip-path: none;
  height: auto;
  overflow: visible;
  position: static;
  white-space: normal;
  width: auto;
}
```

---

## :focus-visible vs :focus

`:focus` applies on any focus event. `:focus-visible` applies only when the browser determines a focus indicator is appropriate (keyboard navigation, not mouse click).

```css
/* WRONG: Remove focus entirely */
*:focus { outline: none; }  /* NEVER do this */

/* WRONG: Only hide for mouse users imprecisely */
*:focus:not(:focus-visible) { outline: none; }
/* This is acceptable but :focus-visible alone is cleaner */

/* RIGHT: Custom style for keyboard focus only */
:focus {
  outline: none; /* Remove default */
}

:focus-visible {
  outline: 3px solid #0056b3;
  outline-offset: 3px;
  border-radius: 4px;
}

/* ALSO RIGHT: Style all focus for components that always need it */
input:focus,
textarea:focus,
select:focus {
  outline: 3px solid #0056b3;
  outline-offset: 0;
  box-shadow: 0 0 0 4px rgba(0, 86, 179, 0.2);
}

/* High contrast mode compatible */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid ButtonText;
    outline-offset: 3px;
  }
}
```

### Focus style requirements (WCAG 2.4.11 / 2.4.12)

```css
/* Minimum: focus indicator must be visible */
/* Best practice: */
:focus-visible {
  /* Option 1: 3px solid outline — high visibility */
  outline: 3px solid #0056b3;
  outline-offset: 2px;

  /* Option 2: Double ring for any background */
  outline: 3px solid #fff;
  box-shadow: 0 0 0 5px #0056b3;

  /* Option 3: Inverted for dark UIs */
  outline: 3px solid currentColor;
  outline-offset: 3px;
}

/* Ensure sticky header doesn't cover focused element */
:target, :focus-visible {
  scroll-margin-top: 80px; /* height of sticky header */
}
```

---

## Arrow Key Navigation Patterns

Different widgets use different arrow key models. Consistency matters.

### Horizontal navigation (tabs, menubar)
- `Left/Right Arrow` moves between items
- `Tab` exits the widget

### Vertical navigation (menu, listbox, tree)
- `Up/Down Arrow` moves between items
- `Tab` exits the widget

### Grid navigation (calendar, spreadsheet, data grid)
- All four arrow keys move between cells
- `Tab` moves to next focusable element outside grid

```javascript
// Grid navigation example (calendar)
function handleGridKeydown(e) {
  const cell = e.target;
  const grid = cell.closest('[role="grid"]');
  const rows = [...grid.querySelectorAll('[role="row"]')];
  const allCells = rows.map(r => [...r.querySelectorAll('[role="gridcell"], [role="columnheader"]')]);

  let rowIndex = rows.findIndex(r => r.contains(cell));
  let colIndex = allCells[rowIndex]?.indexOf(cell) ?? 0;

  const moves = {
    ArrowRight: [0, 1],
    ArrowLeft:  [0, -1],
    ArrowDown:  [1, 0],
    ArrowUp:    [-1, 0],
  };

  if (e.key in moves) {
    e.preventDefault();
    const [dr, dc] = moves[e.key];
    const newRow = rowIndex + dr;
    const newCol = colIndex + dc;

    if (newRow >= 0 && newRow < rows.length &&
        newCol >= 0 && newCol < (allCells[newRow]?.length ?? 0)) {
      const target = allCells[newRow][newCol];
      target.tabIndex = 0;
      cell.tabIndex = -1;
      target.focus();
    }
  }
}
```

---

## Escape Key Conventions

Escape should always close or cancel — it is the universal "get me out" key.

```javascript
// Standard Escape handling
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  // Check from innermost to outermost

  // 1. Close tooltip
  const tooltip = document.querySelector('[role="tooltip"]:not([hidden])');
  if (tooltip) {
    tooltip.setAttribute('hidden', '');
    return;
  }

  // 2. Close menu
  const openMenu = document.querySelector('[role="menu"]:not([hidden])');
  if (openMenu) {
    const trigger = document.querySelector(`[aria-controls="${openMenu.id}"]`);
    openMenu.setAttribute('hidden', '');
    trigger?.focus();
    return;
  }

  // 3. Close dialog (innermost)
  const openDialog = document.querySelector('[role="dialog"]:not([hidden])');
  if (openDialog) {
    closeDialog(openDialog);
    return;
  }
});
```

---

## Return Focus After Dialog Close

Always return focus to the element that triggered the dialog. This preserves the user's position in the page.

```javascript
class DialogManager {
  constructor() {
    this.stack = []; // Support nested dialogs
  }

  open(dialog, trigger = document.activeElement) {
    this.stack.push({ dialog, trigger });
    dialog.removeAttribute('hidden');
    dialog.removeAttribute('aria-hidden');

    // Inert background
    this._setInert(true, dialog);

    // Move focus
    const autofocus = dialog.querySelector('[autofocus]');
    const firstFocusable = dialog.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (autofocus || firstFocusable || dialog).focus();
  }

  close(dialog) {
    const entry = this.stack.findLast(e => e.dialog === dialog);
    if (!entry) return;

    this.stack = this.stack.filter(e => e !== entry);
    dialog.setAttribute('hidden', '');
    dialog.setAttribute('aria-hidden', 'true');

    this._setInert(false, dialog);

    // Return focus to trigger
    entry.trigger?.focus();

    // If there's a parent dialog, re-activate its trap
    if (this.stack.length > 0) {
      this._setInert(true, this.stack[this.stack.length - 1].dialog);
    }
  }

  _setInert(inert, exceptDialog) {
    document.querySelectorAll('body > *').forEach(el => {
      if (!el.contains(exceptDialog)) {
        el.inert = inert;
      }
    });
  }
}
```

---

## Common Arrow Key Patterns Summary

| Widget | Left/Right | Up/Down | Home/End | Enter/Space |
|--------|-----------|---------|----------|-------------|
| Tabs | Previous/Next tab | — | First/Last tab | Activate (manual) |
| Menubar | Previous/Next menu | Open/close submenu | First/Last | Open/activate |
| Menu | — | Previous/Next item | First/Last | Activate |
| Listbox | — | Previous/Next option | First/Last | Select |
| Radio group | Previous/Next | Previous/Next | First/Last | — (auto-select) |
| Slider | Decrease/Increase | Decrease/Increase | Min/Max | — |
| Tree | Collapse/Expand | Previous/Next | First/Last visible | Activate |
| Grid | Previous/Next cell | Previous/Next row | First/Last in row | Activate |
| Combobox | — | Open/navigate | — | Select |
