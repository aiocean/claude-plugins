# CSS Custom Properties Architecture

## Why Custom Properties Over Preprocessor Variables

CSS custom properties (CSS variables) live in the cascade. They inherit, they can be
overridden at any scope, and they resolve at runtime — not compile time. A Sass variable
baked into a build cannot change when the user toggles dark mode or when a component
renders inside a themed container. Custom properties can.

Core differences:
- Custom properties are **inherited** by default (like `color`, unlike `border`)
- Custom properties can be **read and written from JavaScript**
- Custom properties respect the **cascade** — more specific selectors win
- Custom properties support **fallback values** inline
- Custom properties can be **registered** with `@property` for type safety and animation

---

## The Three-Tier Token Architecture

The most maintainable system uses three layers of abstraction:

```
Primitive tokens  →  raw values, no semantic meaning
Semantic tokens   →  map primitives to roles/intent
Component tokens  →  scope semantic tokens to specific components
```

### Tier 1: Primitive Tokens

Define the full palette and scale with no meaning attached:

```css
:root {
  /* Color primitives — full palette */
  --color-blue-100: #dbeafe;
  --color-blue-200: #bfdbfe;
  --color-blue-300: #93c5fd;
  --color-blue-400: #60a5fa;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-blue-800: #1e40af;
  --color-blue-900: #1e3a8a;

  --color-neutral-0:   #ffffff;
  --color-neutral-50:  #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;
  --color-neutral-1000: #000000;

  --color-red-500: #ef4444;
  --color-red-700: #b91c1c;
  --color-green-500: #22c55e;
  --color-green-700: #15803d;
  --color-yellow-400: #facc15;
  --color-yellow-600: #ca8a04;

  /* Spacing primitives — 4px base scale */
  --space-0:  0px;
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Typography primitives */
  --font-size-xs:   0.75rem;   /* 12px */
  --font-size-sm:   0.875rem;  /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg:   1.125rem;  /* 18px */
  --font-size-xl:   1.25rem;   /* 20px */
  --font-size-2xl:  1.5rem;    /* 24px */
  --font-size-3xl:  1.875rem;  /* 30px */
  --font-size-4xl:  2.25rem;   /* 36px */

  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  --line-height-tight:  1.25;
  --line-height-snug:   1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;

  /* Border radius primitives */
  --radius-none: 0px;
  --radius-sm:   2px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-2xl:  16px;
  --radius-full: 9999px;

  /* Shadow primitives */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Duration primitives */
  --duration-instant:  0ms;
  --duration-fast:     100ms;
  --duration-normal:   200ms;
  --duration-slow:     300ms;
  --duration-slower:   500ms;

  /* Easing primitives */
  --ease-linear:    linear;
  --ease-in:        cubic-bezier(0.4, 0, 1, 1);
  --ease-out:       cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Tier 2: Semantic Tokens

Map primitives to roles. This layer is what you override for theming:

```css
:root {
  /* Background roles */
  --bg-base:       var(--color-neutral-0);
  --bg-subtle:     var(--color-neutral-50);
  --bg-muted:      var(--color-neutral-100);
  --bg-emphasized: var(--color-neutral-200);
  --bg-inverse:    var(--color-neutral-900);
  --bg-brand:      var(--color-blue-600);
  --bg-brand-subtle: var(--color-blue-100);
  --bg-danger:     var(--color-red-500);
  --bg-danger-subtle: #fee2e2;
  --bg-success:    var(--color-green-500);
  --bg-warning:    var(--color-yellow-400);

  /* Text roles */
  --text-primary:   var(--color-neutral-900);
  --text-secondary: var(--color-neutral-600);
  --text-tertiary:  var(--color-neutral-400);
  --text-disabled:  var(--color-neutral-300);
  --text-inverse:   var(--color-neutral-0);
  --text-brand:     var(--color-blue-600);
  --text-danger:    var(--color-red-700);
  --text-success:   var(--color-green-700);

  /* Border roles */
  --border-subtle:    var(--color-neutral-100);
  --border-default:   var(--color-neutral-200);
  --border-strong:    var(--color-neutral-400);
  --border-brand:     var(--color-blue-500);
  --border-danger:    var(--color-red-500);
  --border-focus:     var(--color-blue-500);

  /* Interactive roles */
  --interactive-primary:        var(--color-blue-600);
  --interactive-primary-hover:  var(--color-blue-700);
  --interactive-primary-active: var(--color-blue-800);
  --interactive-secondary:       var(--color-neutral-100);
  --interactive-secondary-hover: var(--color-neutral-200);

  /* Spacing roles */
  --spacing-xs:  var(--space-1);
  --spacing-sm:  var(--space-2);
  --spacing-md:  var(--space-4);
  --spacing-lg:  var(--space-6);
  --spacing-xl:  var(--space-8);
  --spacing-2xl: var(--space-12);

  /* Typography roles */
  --font-body:    var(--font-size-base);
  --font-caption: var(--font-size-sm);
  --font-label:   var(--font-size-sm);
  --font-heading-sm: var(--font-size-lg);
  --font-heading-md: var(--font-size-xl);
  --font-heading-lg: var(--font-size-2xl);
  --font-heading-xl: var(--font-size-3xl);

  /* Elevation */
  --elevation-1: var(--shadow-xs);
  --elevation-2: var(--shadow-sm);
  --elevation-3: var(--shadow-md);
  --elevation-4: var(--shadow-lg);

  /* Motion roles */
  --transition-fast:   var(--duration-fast) var(--ease-out);
  --transition-normal: var(--duration-normal) var(--ease-out);
  --transition-slow:   var(--duration-slow) var(--ease-out);

  /* Radius roles */
  --radius-button:  var(--radius-md);
  --radius-card:    var(--radius-lg);
  --radius-input:   var(--radius-md);
  --radius-badge:   var(--radius-full);
  --radius-tooltip: var(--radius-sm);
}
```

### Tier 3: Component Tokens

Scoped to specific components. Consume semantic tokens, not primitives:

```css
.btn {
  /* Component-scoped tokens */
  --btn-bg:         var(--interactive-primary);
  --btn-bg-hover:   var(--interactive-primary-hover);
  --btn-bg-active:  var(--interactive-primary-active);
  --btn-text:       var(--text-inverse);
  --btn-border:     transparent;
  --btn-radius:     var(--radius-button);
  --btn-padding-x:  var(--spacing-md);
  --btn-padding-y:  var(--spacing-sm);
  --btn-font-size:  var(--font-label);
  --btn-font-weight: var(--font-weight-medium);
  --btn-shadow:     var(--elevation-1);
  --btn-transition: var(--transition-fast);

  /* Apply component tokens */
  background-color: var(--btn-bg);
  color:            var(--btn-text);
  border:           1px solid var(--btn-border);
  border-radius:    var(--btn-radius);
  padding:          var(--btn-padding-y) var(--btn-padding-x);
  font-size:        var(--btn-font-size);
  font-weight:      var(--btn-font-weight);
  box-shadow:       var(--btn-shadow);
  transition:       background-color var(--btn-transition),
                    box-shadow var(--btn-transition);
}

.btn:hover {
  --btn-bg: var(--btn-bg-hover);
  --btn-shadow: var(--elevation-2);
}

.btn:active {
  --btn-bg: var(--btn-bg-active);
  --btn-shadow: var(--elevation-1);
}

/* Variant override — only change what differs */
.btn--secondary {
  --btn-bg:        var(--interactive-secondary);
  --btn-bg-hover:  var(--interactive-secondary-hover);
  --btn-text:      var(--text-primary);
  --btn-border:    var(--border-default);
}

.btn--danger {
  --btn-bg:       var(--bg-danger);
  --btn-bg-hover: var(--color-red-700);
}

.btn--sm {
  --btn-padding-x: var(--spacing-sm);
  --btn-padding-y: var(--spacing-xs);
  --btn-font-size: var(--font-caption);
}
```

---

## Dark Mode with Custom Properties

Override semantic tokens at the `[data-theme="dark"]` selector. Primitives stay unchanged:

```css
[data-theme="dark"] {
  --bg-base:       var(--color-neutral-900);
  --bg-subtle:     var(--color-neutral-800);
  --bg-muted:      var(--color-neutral-700);
  --bg-emphasized: var(--color-neutral-600);
  --bg-inverse:    var(--color-neutral-0);
  --bg-brand:      var(--color-blue-500);
  --bg-brand-subtle: rgba(59, 130, 246, 0.15);

  --text-primary:   var(--color-neutral-50);
  --text-secondary: var(--color-neutral-300);
  --text-tertiary:  var(--color-neutral-500);
  --text-disabled:  var(--color-neutral-600);
  --text-inverse:   var(--color-neutral-900);
  --text-brand:     var(--color-blue-400);
  --text-danger:    #fca5a5;
  --text-success:   #86efac;

  --border-subtle:  rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.12);
  --border-strong:  rgba(255, 255, 255, 0.24);

  --interactive-primary:       var(--color-blue-500);
  --interactive-primary-hover: var(--color-blue-400);

  --elevation-1: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --elevation-2: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4);
  --elevation-3: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4);
}

/* System preference fallback */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-base:     var(--color-neutral-900);
    /* ... same overrides ... */
  }
}
```

Toggle with JavaScript — zero FOUC when set on `<html>` before first paint:

```javascript
// Apply theme before first render (in <head>)
const saved = localStorage.getItem('theme') ?? 'system';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = saved === 'system' ? (prefersDark ? 'dark' : 'light') : saved;
document.documentElement.setAttribute('data-theme', theme);
```

---

## Scoping Custom Properties

### Component Scope

Limit tokens to component subtrees:

```css
.card {
  /* Only applies inside .card */
  --card-padding: var(--spacing-lg);
  --card-radius: var(--radius-card);
  --card-bg: var(--bg-base);
  --card-border: var(--border-default);

  background: var(--card-bg);
  border-radius: var(--card-radius);
  padding: var(--card-padding);
  border: 1px solid var(--card-border);
}

/* Elevated variant — no class change needed on children */
.card--elevated {
  --card-bg: var(--bg-subtle);
  --card-border: transparent;
  box-shadow: var(--elevation-3);
}
```

### Contextual Scope

Change behavior based on containing context:

```css
/* Default link appearance */
a {
  color: var(--link-color, var(--text-brand));
}

/* Inside hero section, links are white */
.hero {
  --link-color: var(--text-inverse);
}

/* Inside card footer, links are smaller and muted */
.card__footer {
  --link-color: var(--text-secondary);
}
```

---

## Fallback Values

Fallback is the second argument to `var()`. Falls back if the property is not defined:

```css
.button {
  /* Fallback to semantic token if component token absent */
  background: var(--btn-bg, var(--interactive-primary));

  /* Nested fallback chain */
  color: var(--btn-text, var(--text-inverse, white));

  /* Fallback to a raw value */
  border-radius: var(--btn-radius, 6px);
}
```

Fallbacks do NOT fire when the property is defined but set to an invalid value.
They only fire when the property is **not set at all** in the current scope.

---

## calc() with Custom Properties

Custom properties work seamlessly in `calc()`:

```css
:root {
  --base-unit: 4px;
  --columns: 12;
  --gutter: var(--space-4);
  --sidebar-width: 280px;
  --header-height: 64px;
}

.grid {
  /* Compute column width dynamically */
  --col-width: calc((100% - (var(--columns) - 1) * var(--gutter)) / var(--columns));
  display: grid;
  grid-template-columns: repeat(var(--columns), var(--col-width));
  gap: var(--gutter);
}

.layout {
  /* Content area shrinks when sidebar is present */
  --content-width: calc(100vw - var(--sidebar-width) - var(--gutter) * 2);
  width: var(--content-width);
}

.sticky-offset {
  /* Dynamic scroll offset accounts for sticky header */
  scroll-margin-top: calc(var(--header-height) + var(--space-4));
}

/* Fluid typography with custom property pivot */
:root {
  --fluid-min-size: 16;
  --fluid-max-size: 20;
  --fluid-min-vw: 320;
  --fluid-max-vw: 1280;

  --fluid-font-size: clamp(
    calc(var(--fluid-min-size) * 1px),
    calc(
      var(--fluid-min-size) * 1px +
      (var(--fluid-max-size) - var(--fluid-min-size)) *
      ((100vw - calc(var(--fluid-min-vw) * 1px)) /
      (var(--fluid-max-vw) - var(--fluid-min-vw)))
    ),
    calc(var(--fluid-max-size) * 1px)
  );
}
```

---

## @property for Type Safety and Animation

`@property` registers custom properties with a type, inheritance flag, and initial value.
This enables CSS transitions/animations on custom properties (normally impossible):

```css
/* Register a color property */
@property --btn-bg-color {
  syntax: '<color>';
  inherits: false;
  initial-value: #3b82f6;
}

/* Now this transition actually interpolates the color */
.btn {
  --btn-bg-color: var(--color-blue-600);
  background-color: var(--btn-bg-color);
  transition: --btn-bg-color 200ms ease-out;
}

.btn:hover {
  --btn-bg-color: var(--color-blue-700);
}

/* Register a number for animation */
@property --progress {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}

.progress-ring {
  --progress: 0;
  stroke-dashoffset: calc(251.2px * (1 - var(--progress)));
  transition: --progress 600ms var(--ease-out);
}

.progress-ring[data-complete="true"] {
  --progress: 1;
}

/* Register a length for animated gradients */
@property --gradient-stop {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

.shimmer {
  --gradient-stop: 0%;
  background: linear-gradient(
    90deg,
    transparent var(--gradient-stop),
    rgba(255,255,255,0.4) calc(var(--gradient-stop) + 20%),
    transparent calc(var(--gradient-stop) + 40%)
  );
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  to { --gradient-stop: 100%; }
}

/* Type checking — syntax errors are caught */
@property --font-scale {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

:root { --font-scale: 1; }
.large-text { --font-scale: 1.25; }

h1 { font-size: calc(2rem * var(--font-scale)); }
p  { font-size: calc(1rem * var(--font-scale)); }
```

---

## Runtime Theming from JavaScript

Read and write custom properties at runtime for dynamic theming:

```javascript
const root = document.documentElement;

// Read a custom property
const primary = getComputedStyle(root).getPropertyValue('--interactive-primary').trim();

// Write a custom property
root.style.setProperty('--interactive-primary', '#7c3aed');

// Scoped to a component
const card = document.querySelector('.card');
card.style.setProperty('--card-bg', '#f0fdf4');

// Theme switcher — swap full semantic layer
function applyTheme(tokens) {
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

// User-customizable brand color
function setBrandColor(hex) {
  root.style.setProperty('--color-brand', hex);
  // Semantic tokens that reference --color-brand update automatically
}
```

---

## Naming Convention Reference

```
--{tier}-{category}-{variant}-{state}

Tier:       (omitted for primitives) | color | space | font | radius | shadow
Category:   bg | text | border | interactive | elevation | transition
Variant:    primary | secondary | brand | danger | success | warning | muted | subtle
State:      hover | active | focus | disabled | selected | pressed

Examples:
--color-blue-500            Primitive
--bg-brand                  Semantic — background brand role
--bg-brand-subtle           Semantic — muted brand background
--text-secondary            Semantic — secondary text role
--border-focus              Semantic — focus ring border color
--btn-bg                    Component — button background
--btn-bg-hover              Component — button hover background
--card-padding              Component — card internal spacing
```

Keep names predictable. Someone reading `var(--text-secondary)` should immediately
understand it's a text color with lower visual weight. Avoid abbreviations that need
a glossary (`--txt-2nd` helps no one).
