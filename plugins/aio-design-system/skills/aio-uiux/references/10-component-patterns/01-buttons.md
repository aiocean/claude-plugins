# Buttons

## Button Hierarchy

The visual weight of a button communicates its importance. Use hierarchy deliberately — every screen should have at most one primary action.

### Primary Button
The single most important action on a surface. Filled with brand/accent color. One per view or section.

```css
.btn-primary {
  background: var(--color-brand-500);
  color: white;
  border: 2px solid transparent;
  font-weight: 600;
}
.btn-primary:hover { background: var(--color-brand-600); }
.btn-primary:active { background: var(--color-brand-700); transform: translateY(1px); }
.btn-primary:focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
}
```

**When to use:** Form submit, confirm dialog, primary CTA (Sign Up, Save, Continue).
**When NOT to use:** More than once per view at the same level. If two actions are equally important, reconsider the UX flow.

### Secondary Button
Outlined or lightly filled. Supports the primary action without competing.

```css
.btn-secondary {
  background: transparent;
  color: var(--color-brand-600);
  border: 2px solid var(--color-brand-400);
  font-weight: 500;
}
.btn-secondary:hover {
  background: var(--color-brand-50);
  border-color: var(--color-brand-600);
}
```

**When to use:** Cancel/back alongside a primary, alternative actions (Save Draft vs Publish), filter/sort controls.

### Tertiary / Ghost Button
Text-only or very subtle background. Lowest visual weight.

```css
.btn-ghost {
  background: transparent;
  color: var(--color-brand-600);
  border: 2px solid transparent;
}
.btn-ghost:hover { background: var(--color-brand-50); }
```

**When to use:** Secondary navigation actions, "Learn more" links that behave as buttons, inline contextual actions in cards/tables. Never use as primary CTA.

### Destructive Button
Signals danger — typically red-filled (primary destructive) or red-outlined (secondary destructive).

```css
.btn-destructive {
  background: var(--color-red-600);
  color: white;
  border: 2px solid transparent;
}
.btn-destructive:hover { background: var(--color-red-700); }
/* Always pair with a confirmation dialog for irreversible actions */
```

**When to use:** Delete, Remove, Archive permanently, Disconnect. Always confirm before executing. Use red-outlined (secondary destructive) when the action is part of a form flow, not a standalone danger point.

**Anti-pattern:** Red "Submit" on a normal form. Red is reserved for destructive semantic meaning only.

### Icon Button
Square button containing only an icon. Requires a visible label or tooltip.

```css
.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}
/* Always provide: */
/* aria-label="Close dialog" — NOT aria-label="X" */
```

**When to use:** Toolbars, compact action menus, close buttons, toggle actions. Always add a tooltip on hover for discoverability.

### Floating Action Button (FAB)
Persistent, elevated button for the primary action in a mobile view. Appears above content.

```css
.btn-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  box-shadow: var(--shadow-lg);
  background: var(--color-brand-500);
  color: white;
  z-index: var(--z-fab);
}
/* Extended FAB: */
.btn-fab-extended {
  width: auto;
  padding: 0 20px;
  border-radius: 28px;
  gap: 8px;
}
```

**When to use:** Mobile-first apps, one dominant global action (Compose, Add, Create). Avoid on desktop where toolbar space is available. Avoid if multiple FABs would be needed — use a menu instead.

---

## Button States

Every interactive button needs all six states designed and implemented.

### Default
The resting state. Establishes baseline visual identity.

### Hover
Signal interactivity. Darken/lighten background 10–15%, or add subtle shadow.
- Cursor: `pointer`
- Transition: `background-color 150ms ease, box-shadow 150ms ease`
- Do NOT change size or layout on hover (causes layout shift)

### Active / Pressed
Provides tactile feedback. Slightly darker than hover + micro-translate.
```css
:active {
  transform: translateY(1px);
  box-shadow: none; /* removes elevation — pressed into surface */
}
```

### Focus (Keyboard)
Critical for accessibility. Use `:focus-visible` to show only for keyboard navigation, not mouse clicks.
```css
:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
  border-radius: inherit; /* match button shape */
}
/* NEVER: outline: none without an alternative */
```

### Disabled
Communicates unavailability without implying error.
```css
:disabled,
[aria-disabled="true"] {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none; /* optional — prevents tooltip too */
}
```
**Do not** use `disabled` attribute for async-state unavailability (use `aria-disabled` instead to keep focusable for screen readers). Add a tooltip explaining WHY it is disabled when the reason is not obvious.

### Loading
Shows async operation in progress. Prevents double-submit.
```css
.btn-loading {
  cursor: wait;
  position: relative;
}
.btn-loading .btn-text { opacity: 0; }
.btn-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```
```html
<!-- Accessibility: announce state change -->
<button aria-busy="true" aria-label="Saving...">
  <span class="spinner" aria-hidden="true"></span>
  <span>Save</span>
</button>
```
**Key rule:** Disable the button during loading to prevent re-submission. Restore after completion.

---

## Sizing System

Consistent sizing grid. Base unit typically 8px.

| Size  | Height | Padding H | Font  | Icon  | Use Case |
|-------|--------|-----------|-------|-------|----------|
| xs    | 28px   | 10px      | 12px  | 14px  | Compact tables, badges |
| sm    | 32px   | 12px      | 13px  | 16px  | Inline actions, toolbars |
| md    | 40px   | 16px      | 14px  | 18px  | Default — most UIs |
| lg    | 48px   | 20px      | 16px  | 20px  | Hero CTAs, landing pages |
| xl    | 56px   | 24px      | 18px  | 24px  | Marketing, fullscreen |

```css
.btn { height: 40px; padding: 0 16px; font-size: 14px; } /* md default */
.btn-sm { height: 32px; padding: 0 12px; font-size: 13px; }
.btn-lg { height: 48px; padding: 0 20px; font-size: 16px; }

/* Full-width variant */
.btn-full { width: 100%; justify-content: center; }
```

**Minimum touch target:** 44x44px (Apple HIG), 48x48dp (Material). Pad small visual buttons with invisible hit area.
```css
.btn-icon-sm {
  width: 28px;
  height: 28px;
  /* invisible padding expands hit area */
  padding: 10px;
  margin: -10px;
}
```

---

## Icon + Text Patterns

Icons reinforce meaning but do not replace labels (except in well-established toolbars).

### Leading Icon (most common)
```html
<button class="btn btn-primary">
  <svg aria-hidden="true" class="btn-icon">...</svg>
  <span>Save Changes</span>
</button>
```
Gap between icon and text: 6–8px. Icon size: 16–20px for md buttons.

### Trailing Icon (directional)
Used for navigation (arrows), dropdowns (chevron). Signals "this leads somewhere."
```html
<button class="btn btn-secondary">
  Continue
  <svg aria-hidden="true"><!-- chevron-right --></svg>
</button>
```

### Icon-only
```html
<button class="btn-icon" aria-label="Delete item">
  <svg aria-hidden="true"><!-- trash icon --></svg>
</button>
```
Always add `aria-label`. Add `title` attribute for native tooltip fallback (though custom tooltip is better).

---

## Button Groups

Group related actions with shared borders to reduce visual noise.

```css
.btn-group {
  display: inline-flex;
  gap: 0;
}
.btn-group .btn {
  border-radius: 0;
  border-right-width: 0; /* remove double borders */
}
.btn-group .btn:first-child { border-radius: var(--radius) 0 0 var(--radius); }
.btn-group .btn:last-child {
  border-radius: 0 var(--radius) var(--radius) 0;
  border-right-width: 2px;
}
.btn-group .btn:focus-visible {
  position: relative;
  z-index: 1; /* bring focus ring above adjacent */
}
```

**When to use:** View toggles (List/Grid), Bold/Italic/Underline in editors, segmented controls. Keep to 2–5 options. For more, use dropdown or radio group.

---

## Split Buttons

Primary action + dropdown for related secondary actions.

```html
<div class="split-btn" role="group" aria-label="Save options">
  <button class="btn btn-primary">Save</button>
  <button class="btn btn-primary split-btn-toggle"
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="More save options">
    <svg aria-hidden="true"><!-- chevron-down --></svg>
  </button>
</div>
```

```css
.split-btn { display: inline-flex; }
.split-btn .btn-primary:first-child {
  border-right: 1px solid rgba(255,255,255,0.3);
  border-radius: var(--radius) 0 0 var(--radius);
}
.split-btn-toggle {
  padding: 0 10px;
  border-radius: 0 var(--radius) var(--radius) 0;
  min-width: unset;
}
```

**When to use:** Save / Save as Draft / Save and Publish. Avoid overuse — if dropdown has >5 items, reconsider UX.

---

## Accessibility Rules

### Button vs Link
This is the most common semantic error in UI development.

| Element | Use When |
|---------|----------|
| `<button>` | Triggers an action (submit, open modal, toggle, delete) |
| `<a href>` | Navigates to a URL (same page anchor or new page) |

```html
<!-- WRONG: link styled as button for an action -->
<a href="#" class="btn">Delete</a>

<!-- RIGHT: button for action -->
<button class="btn btn-destructive">Delete</button>

<!-- RIGHT: link that looks like button, navigates -->
<a href="/dashboard" class="btn btn-secondary">Go to Dashboard</a>
```

For `<a>` styled as button: add `role="button"` only if it truly has no href and triggers JS — then handle both `click` and `keydown` (Enter + Space).

### aria-busy for Loading State
```html
<!-- Before click: normal -->
<button>Submit Form</button>

<!-- During async operation -->
<button aria-busy="true" disabled>
  <span aria-hidden="true" class="spinner"></span>
  Submitting...
</button>

<!-- Screen reader announces: "Submitting... button, dimmed" -->
```

### Additional Accessibility Checklist
- All buttons reachable via Tab
- Enter and Space activate buttons (browser default for `<button>`)
- Visible focus ring (never `outline: none` without replacement)
- Color is not the only differentiator between button types — also use shape/border/text
- Disabled buttons: use `disabled` attribute (removes from tab order) for truly unavailable actions; use `aria-disabled="true"` when you want it in tab order with explanation
- Icon-only buttons: `aria-label` required, matching the visible tooltip text
- Destructive actions: add `aria-describedby` linking to confirmation text when available

### Color Contrast Minimums (WCAG AA)
- Normal text on button: 4.5:1
- Large text (18px+ or 14px bold): 3:1
- Focus indicator against adjacent colors: 3:1

---

## CSS Custom Properties Pattern

```css
:root {
  /* Button tokens */
  --btn-radius: 6px;
  --btn-font-weight: 500;
  --btn-transition: background-color 150ms ease,
                    border-color 150ms ease,
                    box-shadow 150ms ease,
                    transform 100ms ease;

  /* Size tokens */
  --btn-height-sm: 32px;
  --btn-height-md: 40px;
  --btn-height-lg: 48px;
  --btn-padding-sm: 0 12px;
  --btn-padding-md: 0 16px;
  --btn-padding-lg: 0 20px;
}

/* Base button reset */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: var(--btn-radius);
  font-weight: var(--btn-font-weight);
  transition: var(--btn-transition);
  text-decoration: none; /* for <a> tags */
  user-select: none;
  vertical-align: middle;
  /* Default size: md */
  height: var(--btn-height-md);
  padding: var(--btn-padding-md);
  font-size: 14px;
}
```

---

## Common Pitfalls

1. **Multiple primary buttons** in one view — defeats hierarchy, confuses users
2. **Loading without feedback** — users assume click did not register and click again
3. **Disabled without explanation** — user cannot figure out how to enable
4. **`pointer-events: none` on disabled** — breaks tooltip that explains why disabled
5. **Icon-only without label** — fails accessibility and international users
6. **Hover color change that affects size/layout** — causes jitter/reflow
7. **Submit button outside `<form>`** — breaks Enter-to-submit and screen readers (use `form` attribute to associate)
8. **Using `<div>` or `<span>` as button** — loses keyboard support, role, state. Always use `<button>`
