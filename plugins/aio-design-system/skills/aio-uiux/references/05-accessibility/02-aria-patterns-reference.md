# ARIA Patterns Reference

ARIA (Accessible Rich Internet Applications) provides roles, states, and properties that fill semantic gaps in HTML. Use native HTML elements first — ARIA only when native semantics are insufficient.

**The first rule of ARIA**: Don't use ARIA if a native HTML element already provides the semantics.

---

## ARIA Fundamentals

```html
<!-- Three things every interactive element needs: -->
<!-- 1. Role: what kind of widget is it? -->
<!-- 2. Name: what is it called? (visible label, aria-label, aria-labelledby) -->
<!-- 3. State/Value: what is its current condition? -->

<button                          <!-- role="button" is implicit -->
  aria-pressed="false"           <!-- state -->
  aria-label="Toggle dark mode"  <!-- name (overrides "🌙" text) -->
>
  🌙
</button>
```

---

## 1. Button (Toggle)

Native `<button>` elements are keyboard-accessible by default. Use `aria-pressed` for toggle state.

### Markup

```html
<!-- Simple button -->
<button type="button">Save</button>

<!-- Toggle button -->
<button type="button" aria-pressed="false" id="mute-btn">
  <svg aria-hidden="true" focusable="false"><!-- icon --></svg>
  Mute
</button>

<!-- Icon-only toggle button -->
<button
  type="button"
  aria-pressed="false"
  aria-label="Bookmark this article"
>
  <svg aria-hidden="true" focusable="false" width="20" height="20">
    <use href="#icon-bookmark"/>
  </svg>
</button>
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Activate button |
| `Tab` | Move focus to next element |
| `Shift+Tab` | Move focus to previous element |

### JavaScript

```javascript
const btn = document.getElementById('mute-btn');
btn.addEventListener('click', () => {
  const pressed = btn.getAttribute('aria-pressed') === 'true';
  btn.setAttribute('aria-pressed', String(!pressed));
  toggleMute(!pressed);
});
```

---

## 2. Checkbox

Use native `<input type="checkbox">` whenever possible. Custom checkboxes require full ARIA + keyboard handling.

### Markup

```html
<!-- Native (preferred) -->
<div class="checkbox-group">
  <input type="checkbox" id="agree" name="agree">
  <label for="agree">I agree to the terms</label>
</div>

<!-- Custom checkbox (only when native styling is impossible) -->
<div
  role="checkbox"
  aria-checked="false"
  aria-labelledby="custom-cb-label"
  tabindex="0"
  id="custom-cb"
>
  <svg aria-hidden="true"><!-- checkmark --></svg>
</div>
<span id="custom-cb-label">Subscribe to newsletter</span>

<!-- Indeterminate state (select all) -->
<input type="checkbox" id="select-all" aria-label="Select all items">
```

```javascript
// Set indeterminate via JS (no HTML attribute)
document.getElementById('select-all').indeterminate = true;

// Custom checkbox keyboard handler
document.getElementById('custom-cb').addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    const checked = e.currentTarget.getAttribute('aria-checked') === 'true';
    e.currentTarget.setAttribute('aria-checked', String(!checked));
  }
});
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Space` | Toggle checkbox |

---

## 3. Combobox / Autocomplete

Combobox is a text input that controls a popup list. This is the most complex ARIA pattern.

### Markup

```html
<!-- Combobox container -->
<div class="combobox-wrapper">
  <label for="city-input" id="city-label">City</label>
  <div class="combobox" role="combobox"
    aria-expanded="false"
    aria-haspopup="listbox"
    aria-owns="city-listbox"
  >
    <input
      type="text"
      id="city-input"
      aria-labelledby="city-label"
      aria-autocomplete="list"
      aria-controls="city-listbox"
      aria-activedescendant=""
      autocomplete="off"
    >
    <button type="button" aria-label="Show city suggestions" tabindex="-1">▼</button>
  </div>

  <ul
    id="city-listbox"
    role="listbox"
    aria-labelledby="city-label"
    hidden
  >
    <li role="option" id="opt-1" aria-selected="false">Austin</li>
    <li role="option" id="opt-2" aria-selected="false">Boston</li>
    <li role="option" id="opt-3" aria-selected="false">Chicago</li>
  </ul>
</div>
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Down Arrow` | Open popup / move to next option |
| `Up Arrow` | Move to previous option |
| `Enter` | Select focused option |
| `Escape` | Close popup, restore input value |
| `Home` | Move to first option |
| `End` | Move to last option |
| `Alt+Down Arrow` | Open popup without moving focus |
| `Alt+Up Arrow` | Select option and close, or close without selecting |

```javascript
input.addEventListener('input', (e) => {
  const value = e.target.value;
  const matches = filterOptions(value);
  renderOptions(matches);
  combobox.setAttribute('aria-expanded', matches.length > 0 ? 'true' : 'false');
});

function focusOption(optionEl) {
  // Visually highlight
  document.querySelectorAll('[role="option"]').forEach(o => o.classList.remove('focused'));
  optionEl.classList.add('focused');
  // Tell screen reader which option is active (without moving DOM focus)
  input.setAttribute('aria-activedescendant', optionEl.id);
}
```

---

## 4. Dialog (Modal)

### Markup

```html
<!-- Trigger -->
<button type="button" id="open-dialog-btn" onclick="openDialog()">
  Open Settings
</button>

<!-- Dialog -->
<div
  role="dialog"
  id="settings-dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
  aria-modal="true"
  hidden
>
  <h2 id="dialog-title">Settings</h2>
  <p id="dialog-desc">Customize your experience. Changes are saved automatically.</p>

  <div class="dialog-content">
    <!-- dialog form fields -->
  </div>

  <div class="dialog-actions">
    <button type="button" onclick="closeDialog()">Cancel</button>
    <button type="button" onclick="saveSettings()">Save</button>
  </div>
</div>

<!-- Backdrop -->
<div id="dialog-backdrop" hidden onclick="closeDialog()"></div>
```

### JavaScript (focus trap + return focus)

```javascript
let previouslyFocused;

function openDialog() {
  const dialog = document.getElementById('settings-dialog');
  const backdrop = document.getElementById('dialog-backdrop');

  previouslyFocused = document.activeElement;

  dialog.removeAttribute('hidden');
  backdrop.removeAttribute('hidden');

  // Move focus to first focusable element or dialog itself
  const firstFocusable = dialog.querySelector(
    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  (firstFocusable || dialog).focus();

  // Trap focus inside dialog
  dialog.addEventListener('keydown', trapFocus);
  document.addEventListener('keydown', handleEscape);
}

function closeDialog() {
  const dialog = document.getElementById('settings-dialog');
  const backdrop = document.getElementById('dialog-backdrop');

  dialog.setAttribute('hidden', '');
  backdrop.setAttribute('hidden', '');

  dialog.removeEventListener('keydown', trapFocus);
  document.removeEventListener('keydown', handleEscape);

  // Return focus to trigger
  previouslyFocused?.focus();
}

function trapFocus(e) {
  if (e.key !== 'Tab') return;

  const focusable = [...this.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  )];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function handleEscape(e) {
  if (e.key === 'Escape') closeDialog();
}
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable (wraps at end) |
| `Shift+Tab` | Move to previous focusable (wraps at start) |
| `Escape` | Close dialog, return focus to trigger |

---

## 5. Disclosure (Show/Hide)

```html
<!-- Button controls visibility of section below -->
<button
  type="button"
  aria-expanded="false"
  aria-controls="faq-answer-1"
  id="faq-btn-1"
>
  What is your return policy?
</button>
<div id="faq-answer-1" hidden>
  <p>We offer a 30-day return policy on all items.</p>
</div>
```

```javascript
document.getElementById('faq-btn-1').addEventListener('click', function() {
  const expanded = this.getAttribute('aria-expanded') === 'true';
  this.setAttribute('aria-expanded', String(!expanded));
  const panel = document.getElementById(this.getAttribute('aria-controls'));
  panel.hidden = expanded;
});
```

---

## 6. Listbox

Use for custom select lists. For simple selection, use native `<select>`.

```html
<label id="listbox-label">Choose a fruit</label>
<ul
  role="listbox"
  aria-labelledby="listbox-label"
  aria-activedescendant="opt-apple"
  tabindex="0"
>
  <li role="option" id="opt-apple" aria-selected="true">Apple</li>
  <li role="option" id="opt-banana" aria-selected="false">Banana</li>
  <li role="option" id="opt-cherry" aria-selected="false">Cherry</li>
</ul>

<!-- Multi-select listbox -->
<ul
  role="listbox"
  aria-multiselectable="true"
  aria-labelledby="multi-label"
  tabindex="0"
>
  <li role="option" aria-selected="true">Option A</li>
  <li role="option" aria-selected="false">Option B</li>
</ul>
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Up/Down Arrow` | Move between options |
| `Home` / `End` | First / last option |
| `Enter` / `Space` | Select option |
| `Shift+Arrow` | Extend selection (multiselect) |
| `Ctrl+A` | Select all (multiselect) |
| Type character | Jump to first matching option |

---

## 7. Menu / Menubar

Use only for application-style menus (like a desktop app menubar). Not for site navigation.

```html
<nav aria-label="Main navigation">
  <!-- This is a nav, not a menu -->
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<!-- Application menu (e.g., text editor toolbar) -->
<ul role="menubar" aria-label="Text editor actions">
  <li role="none">
    <button
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded="false"
      tabindex="0"
    >
      File
    </button>
    <ul role="menu" hidden>
      <li role="none">
        <button type="button" role="menuitem" tabindex="-1">New</button>
      </li>
      <li role="none">
        <button type="button" role="menuitem" tabindex="-1">Open</button>
      </li>
      <li role="separator"></li>
      <li role="none">
        <button type="button" role="menuitem" tabindex="-1">Save</button>
      </li>
    </ul>
  </li>
</ul>
```

### Keyboard interaction (menubar)

| Key | Action |
|-----|--------|
| `Left/Right Arrow` | Move between menu items in menubar |
| `Down Arrow` | Open submenu / move down in menu |
| `Up Arrow` | Move up in menu |
| `Enter` / `Space` | Open submenu or activate item |
| `Escape` | Close menu, return focus to parent |
| `Home` / `End` | First / last item |
| Type character | Jump to matching item |

---

## 8. Radio Group

Native `<input type="radio">` preferred. Custom only when native styling is insufficient.

```html
<!-- Native (preferred) -->
<fieldset>
  <legend>Preferred contact method</legend>
  <label><input type="radio" name="contact" value="email"> Email</label>
  <label><input type="radio" name="contact" value="phone"> Phone</label>
  <label><input type="radio" name="contact" value="text"> Text message</label>
</fieldset>

<!-- Custom radio group -->
<div role="radiogroup" aria-labelledby="contact-legend">
  <p id="contact-legend">Preferred contact method</p>
  <div role="radio" aria-checked="true"  tabindex="0"  id="radio-email">Email</div>
  <div role="radio" aria-checked="false" tabindex="-1" id="radio-phone">Phone</div>
  <div role="radio" aria-checked="false" tabindex="-1" id="radio-text">Text</div>
</div>
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Tab` | Enter/exit group (one tab stop) |
| `Arrow keys` | Move between options and select |
| `Space` | Select focused option |

---

## 9. Slider

```html
<label id="volume-label" for="volume-slider">Volume</label>
<div class="slider-container">
  <span aria-hidden="true">0</span>
  <div
    role="slider"
    id="volume-slider"
    aria-labelledby="volume-label"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow="50"
    aria-valuetext="50%"
    tabindex="0"
  >
    <div class="slider-thumb"></div>
  </div>
  <span aria-hidden="true">100</span>
</div>
```

```javascript
slider.addEventListener('keydown', (e) => {
  let value = parseInt(slider.getAttribute('aria-valuenow'));
  const min = parseInt(slider.getAttribute('aria-valuemin'));
  const max = parseInt(slider.getAttribute('aria-valuemax'));

  const changes = {
    ArrowRight: 1, ArrowUp: 1,
    ArrowLeft: -1, ArrowDown: -1,
    PageUp: 10, PageDown: -10,
    Home: min - value,
    End: max - value,
  };

  if (e.key in changes) {
    e.preventDefault();
    value = Math.min(max, Math.max(min, value + changes[e.key]));
    slider.setAttribute('aria-valuenow', value);
    slider.setAttribute('aria-valuetext', `${value}%`);
    updateSliderVisual(value);
  }
});
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Right/Up Arrow` | Increase by one step |
| `Left/Down Arrow` | Decrease by one step |
| `Page Up` | Increase by large step |
| `Page Down` | Decrease by large step |
| `Home` | Set to minimum |
| `End` | Set to maximum |

---

## 10. Switch

A switch is an on/off control — semantically different from checkbox (binary toggle with immediate effect).

```html
<!-- Using button with aria-pressed -->
<button
  type="button"
  role="switch"
  aria-checked="false"
  id="notifications-switch"
>
  <span class="switch-track" aria-hidden="true">
    <span class="switch-thumb"></span>
  </span>
  Enable notifications
</button>
```

```css
[role="switch"] {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  background: none;
  border: none;
}

[role="switch"] .switch-track {
  width: 44px;
  height: 24px;
  background: #767676;
  border-radius: 12px;
  position: relative;
  transition: background 200ms;
}

[role="switch"][aria-checked="true"] .switch-track {
  background: #0056b3;
}

[role="switch"] .switch-thumb {
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: left 200ms;
}

[role="switch"][aria-checked="true"] .switch-thumb {
  left: 22px;
}
```

---

## 11. Tabs

```html
<div class="tabs">
  <!-- Tab list -->
  <div role="tablist" aria-label="Account sections">
    <button
      role="tab"
      id="tab-profile"
      aria-controls="panel-profile"
      aria-selected="true"
      tabindex="0"
    >
      Profile
    </button>
    <button
      role="tab"
      id="tab-security"
      aria-controls="panel-security"
      aria-selected="false"
      tabindex="-1"
    >
      Security
    </button>
    <button
      role="tab"
      id="tab-billing"
      aria-controls="panel-billing"
      aria-selected="false"
      tabindex="-1"
    >
      Billing
    </button>
  </div>

  <!-- Tab panels -->
  <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
    <h3>Profile settings</h3>
    <!-- content -->
  </div>
  <div role="tabpanel" id="panel-security" aria-labelledby="tab-security" hidden>
    <!-- content -->
  </div>
  <div role="tabpanel" id="panel-billing" aria-labelledby="tab-billing" hidden>
    <!-- content -->
  </div>
</div>
```

```javascript
const tabs = document.querySelectorAll('[role="tab"]');

tabs.forEach(tab => {
  tab.addEventListener('click', activateTab);
  tab.addEventListener('keydown', (e) => {
    const list = [...tabs];
    const index = list.indexOf(e.currentTarget);

    if (e.key === 'ArrowRight') {
      list[(index + 1) % list.length].focus();
    }
    if (e.key === 'ArrowLeft') {
      list[(index - 1 + list.length) % list.length].focus();
    }
    if (e.key === 'Home') list[0].focus();
    if (e.key === 'End') list[list.length - 1].focus();
  });
});

function activateTab(e) {
  const tab = e.currentTarget;
  tabs.forEach(t => {
    t.setAttribute('aria-selected', 'false');
    t.tabIndex = -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = true;
  });
  tab.setAttribute('aria-selected', 'true');
  tab.tabIndex = 0;
  document.getElementById(tab.getAttribute('aria-controls')).hidden = false;
}
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Tab` | Enter tablist, then move to active panel |
| `Left/Right Arrow` | Move between tabs (automatic or manual activation) |
| `Home` / `End` | First / last tab |
| `Space` / `Enter` | Activate tab (manual activation pattern) |

---

## 12. Tooltip

Tooltips provide supplementary info triggered by hover/focus. Not for critical information.

```html
<div class="tooltip-wrapper">
  <button
    type="button"
    aria-describedby="tooltip-1"
    id="info-btn"
  >
    <svg aria-hidden="true"><!-- icon --></svg>
    Info
  </button>

  <div
    role="tooltip"
    id="tooltip-1"
  >
    This action cannot be undone. Make sure you want to continue.
  </div>
</div>
```

```css
[role="tooltip"] {
  position: absolute;
  background: #1a1a1a;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.875rem;
  max-width: 250px;
  white-space: normal;
  pointer-events: none;  /* Prevent tooltip from interfering with hover */
  opacity: 0;
  transition: opacity 150ms;
}

/* Show on hover or focus (1.4.13 — must be hoverable) */
.tooltip-wrapper:hover [role="tooltip"],
.tooltip-wrapper:focus-within [role="tooltip"] {
  opacity: 1;
  pointer-events: auto;  /* Allow user to hover into tooltip */
}

/* Dismiss with Escape (1.4.13) */
```

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('[role="tooltip"]').forEach(t => {
      t.style.opacity = '0';
    });
  }
});
```

---

## 13. Tree View

```html
<ul role="tree" aria-labelledby="tree-label">
  <li role="treeitem" aria-expanded="true" tabindex="0">
    <span>Documents</span>
    <ul role="group">
      <li role="treeitem" tabindex="-1">Resume.pdf</li>
      <li role="treeitem" aria-expanded="false" tabindex="-1">
        <span>Projects</span>
        <ul role="group" hidden>
          <li role="treeitem" tabindex="-1">Project A</li>
          <li role="treeitem" tabindex="-1">Project B</li>
        </ul>
      </li>
    </ul>
  </li>
  <li role="treeitem" tabindex="-1">Downloads</li>
</ul>
```

### Keyboard interaction

| Key | Action |
|-----|--------|
| `Down Arrow` | Next visible node |
| `Up Arrow` | Previous visible node |
| `Right Arrow` | Expand node (if collapsed) / move to first child |
| `Left Arrow` | Collapse node (if expanded) / move to parent |
| `Home` | First node |
| `End` | Last visible node |
| `Enter` | Activate node |
| Type character | Jump to next matching node |

---

## ARIA States Quick Reference

| State | Values | Use when |
|-------|--------|----------|
| `aria-expanded` | `true/false` | Disclosure, combobox, treeitem, menu |
| `aria-selected` | `true/false/undefined` | Options, tabs, treeitems |
| `aria-checked` | `true/false/mixed` | Checkbox, radio, switch, menuitemcheckbox |
| `aria-pressed` | `true/false/mixed` | Toggle buttons |
| `aria-disabled` | `true/false` | Any interactive element (keep focusable) |
| `aria-hidden` | `true/false` | Remove from AT tree (icons, decorative) |
| `aria-invalid` | `true/false/grammar/spelling` | Form inputs with errors |
| `aria-busy` | `true/false` | Loading regions |
| `aria-current` | `page/step/location/date/time/true` | Current item in set |
