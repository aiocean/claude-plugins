# Design Token Architecture

Design tokens are the atomic values of a design system — the single source of truth for visual decisions. A three-tier architecture transforms raw values into meaningful, context-aware constants that scale across platforms, themes, and components.

## The Three-Tier Model

```
Primitive → Semantic → Component
blue-500  → color-primary → button-bg
```

### Tier 1: Primitive Tokens

Raw values with no semantic meaning. They describe WHAT a value is, not HOW it is used.

```json
{
  "color": {
    "blue": {
      "50":  "#eff6ff",
      "100": "#dbeafe",
      "200": "#bfdbfe",
      "300": "#93c5fd",
      "400": "#60a5fa",
      "500": "#3b82f6",
      "600": "#2563eb",
      "700": "#1d4ed8",
      "800": "#1e40af",
      "900": "#1e3a8a",
      "950": "#172554"
    },
    "gray": {
      "50":  "#f9fafb",
      "100": "#f3f4f6",
      "200": "#e5e7eb",
      "300": "#d1d5db",
      "400": "#9ca3af",
      "500": "#6b7280",
      "600": "#4b5563",
      "700": "#374151",
      "800": "#1f2937",
      "900": "#111827",
      "950": "#030712"
    },
    "red":    { "500": "#ef4444", "600": "#dc2626", "700": "#b91c1c" },
    "green":  { "500": "#22c55e", "600": "#16a34a", "700": "#15803d" },
    "yellow": { "400": "#facc15", "500": "#eab308", "600": "#ca8a04" },
    "white": "#ffffff",
    "black": "#000000",
    "transparent": "transparent"
  },
  "spacing": {
    "0":   "0px",
    "1":   "4px",
    "2":   "8px",
    "3":   "12px",
    "4":   "16px",
    "5":   "20px",
    "6":   "24px",
    "8":   "32px",
    "10":  "40px",
    "12":  "48px",
    "16":  "64px",
    "20":  "80px",
    "24":  "96px"
  },
  "font-size": {
    "xs":  "12px",
    "sm":  "14px",
    "md":  "16px",
    "lg":  "18px",
    "xl":  "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
    "5xl": "48px"
  },
  "font-weight": {
    "regular":   400,
    "medium":    500,
    "semibold":  600,
    "bold":      700
  },
  "line-height": {
    "tight":   1.25,
    "snug":    1.375,
    "normal":  1.5,
    "relaxed": 1.625,
    "loose":   2
  },
  "border-radius": {
    "none": "0px",
    "sm":   "2px",
    "md":   "4px",
    "lg":   "8px",
    "xl":   "12px",
    "2xl":  "16px",
    "full": "9999px"
  },
  "shadow": {
    "sm":  "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "md":  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    "lg":  "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    "xl":  "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)"
  }
}
```

### Tier 2: Semantic Tokens

Map primitives to meaning. They describe HOW values are used, not what they are.

```json
{
  "color": {
    "primary":          "{color.blue.600}",
    "primary-hover":    "{color.blue.700}",
    "primary-active":   "{color.blue.800}",
    "primary-subtle":   "{color.blue.50}",
    "primary-muted":    "{color.blue.100}",

    "secondary":        "{color.gray.600}",
    "secondary-hover":  "{color.gray.700}",
    "secondary-subtle": "{color.gray.50}",

    "danger":           "{color.red.600}",
    "danger-hover":     "{color.red.700}",
    "danger-subtle":    "{color.red.50}",

    "success":          "{color.green.600}",
    "warning":          "{color.yellow.500}",

    "surface":          "{color.white}",
    "surface-raised":   "{color.gray.50}",
    "surface-overlay":  "{color.white}",

    "border":           "{color.gray.200}",
    "border-strong":    "{color.gray.300}",
    "border-focus":     "{color.blue.500}",

    "text-primary":     "{color.gray.900}",
    "text-secondary":   "{color.gray.600}",
    "text-disabled":    "{color.gray.400}",
    "text-inverse":     "{color.white}",
    "text-link":        "{color.blue.600}",
    "text-danger":      "{color.red.600}"
  },
  "spacing": {
    "component-padding-x-sm":  "{spacing.3}",
    "component-padding-x-md":  "{spacing.4}",
    "component-padding-x-lg":  "{spacing.6}",
    "component-padding-y-sm":  "{spacing.1}",
    "component-padding-y-md":  "{spacing.2}",
    "component-padding-y-lg":  "{spacing.3}",
    "layout-gap":               "{spacing.6}",
    "layout-padding":           "{spacing.8}"
  },
  "typography": {
    "heading-1": { "size": "{font-size.4xl}", "weight": "{font-weight.bold}",     "line-height": "{line-height.tight}" },
    "heading-2": { "size": "{font-size.3xl}", "weight": "{font-weight.bold}",     "line-height": "{line-height.tight}" },
    "heading-3": { "size": "{font-size.2xl}", "weight": "{font-weight.semibold}", "line-height": "{line-height.snug}" },
    "heading-4": { "size": "{font-size.xl}",  "weight": "{font-weight.semibold}", "line-height": "{line-height.snug}" },
    "body-lg":   { "size": "{font-size.lg}",  "weight": "{font-weight.regular}", "line-height": "{line-height.relaxed}" },
    "body-md":   { "size": "{font-size.md}",  "weight": "{font-weight.regular}", "line-height": "{line-height.normal}" },
    "body-sm":   { "size": "{font-size.sm}",  "weight": "{font-weight.regular}", "line-height": "{line-height.normal}" },
    "label":     { "size": "{font-size.sm}",  "weight": "{font-weight.medium}",   "line-height": "{line-height.normal}" },
    "caption":   { "size": "{font-size.xs}",  "weight": "{font-weight.regular}", "line-height": "{line-height.normal}" }
  }
}
```

### Tier 3: Component Tokens

Scope semantic tokens to specific components. Enable per-component theming without touching global semantics.

```json
{
  "button": {
    "primary": {
      "bg":           "{color.primary}",
      "bg-hover":     "{color.primary-hover}",
      "bg-active":    "{color.primary-active}",
      "bg-disabled":  "{color.gray.100}",
      "text":         "{color.text-inverse}",
      "text-disabled":"{color.text-disabled}",
      "border":       "transparent",
      "radius":       "{border-radius.md}",
      "padding-x":    "{spacing.component-padding-x-md}",
      "padding-y":    "{spacing.component-padding-y-md}"
    },
    "ghost": {
      "bg":           "transparent",
      "bg-hover":     "{color.primary-subtle}",
      "text":         "{color.primary}",
      "text-hover":   "{color.primary-hover}",
      "border":       "transparent"
    }
  },
  "input": {
    "bg":             "{color.surface}",
    "border":         "{color.border}",
    "border-focus":   "{color.border-focus}",
    "border-error":   "{color.danger}",
    "text":           "{color.text-primary}",
    "placeholder":    "{color.text-secondary}",
    "radius":         "{border-radius.md}",
    "padding-x":      "{spacing.3}",
    "padding-y":      "{spacing.2}"
  },
  "card": {
    "bg":             "{color.surface}",
    "border":         "{color.border}",
    "radius":         "{border-radius.xl}",
    "shadow":         "{shadow.sm}",
    "padding":        "{spacing.6}"
  }
}
```

## Token Naming Convention

Pattern: `{category}-{type}-{item}-{subitem}-{state}`

```
color-text-primary           ✓ category-type-item
color-text-primary-hover     ✓ category-type-item-state
color-button-primary-bg      ✓ category-component-variant-property
spacing-component-padding-x  ✓ category-scope-property-axis
font-size-body-lg            ✓ category-type-variant

button-primary-bg-hover      ✓ component-variant-property-state (component token)
```

Rules:
- Lowercase, hyphen-separated
- No abbreviations except well-known ones (bg, px, py, sm, md, lg, xl)
- State suffixes: `hover`, `active`, `focus`, `disabled`, `selected`, `error`
- Size scale: `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (not `small`, `large`)
- Avoid generic names: `color-1`, `spacing-big` — always encode meaning

## Token Formats

### CSS Custom Properties (Web)

```css
/* primitives.css */
:root {
  /* Color primitives */
  --color-blue-50: #eff6ff;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-gray-50: #f9fafb;
  --color-gray-200: #e5e7eb;
  --color-gray-600: #4b5563;
  --color-gray-900: #111827;

  /* Spacing primitives */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;

  /* Radius primitives */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}

/* semantic.css */
:root {
  --color-primary:        var(--color-blue-600);
  --color-primary-hover:  var(--color-blue-700);
  --color-surface:        #ffffff;
  --color-border:         var(--color-gray-200);
  --color-text-primary:   var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);

  --spacing-layout-gap:   var(--spacing-6);
}

/* components.css */
:root {
  --button-primary-bg:       var(--color-primary);
  --button-primary-bg-hover: var(--color-primary-hover);
  --button-primary-text:     #ffffff;
  --button-radius:           var(--radius-md);
}

/* Usage */
.button-primary {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-radius: var(--button-radius);
}
.button-primary:hover {
  background-color: var(--button-primary-bg-hover);
}
```

### W3C Design Token Community Group (DTCG) Format

The emerging standard for design tool interoperability (Figma, Style Dictionary, Token Studio):

```json
{
  "$schema": "https://tr.designtokens.org/format/",
  "color": {
    "$type": "color",
    "blue": {
      "500": { "$value": "#3b82f6", "$description": "Brand blue, primary actions" },
      "600": { "$value": "#2563eb" },
      "700": { "$value": "#1d4ed8" }
    }
  },
  "spacing": {
    "$type": "dimension",
    "4":  { "$value": "16px" },
    "6":  { "$value": "24px" }
  },
  "shadow": {
    "$type": "shadow",
    "md": {
      "$value": {
        "color":     "rgb(0 0 0 / 0.1)",
        "offsetX":   "0",
        "offsetY":   "4px",
        "blur":      "6px",
        "spread":    "-1px"
      }
    }
  },
  "semantic": {
    "color": {
      "primary": {
        "$value":      "{color.blue.600}",
        "$type":       "color",
        "$description": "Primary brand color for interactive elements"
      }
    }
  }
}
```

### Style Dictionary Configuration

```javascript
// style-dictionary.config.js
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'ds',
      buildPath: 'dist/css/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables',
        options: { selector: ':root' }
      }]
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/js/',
      files: [{
        destination: 'tokens.js',
        format: 'javascript/es6'
      }]
    },
    ios: {
      transformGroup: 'ios-swift',
      buildPath: 'dist/ios/',
      files: [{
        destination: 'StyleDictionary.swift',
        format: 'ios-swift/class.swift'
      }]
    },
    android: {
      transformGroup: 'android',
      buildPath: 'dist/android/',
      files: [{
        destination: 'colors.xml',
        format: 'android/colors'
      }]
    }
  }
};
```

## Complete Token System

### Motion Tokens

```css
:root {
  /* Duration primitives */
  --duration-instant:  0ms;
  --duration-fast:     100ms;
  --duration-normal:   200ms;
  --duration-slow:     300ms;
  --duration-slower:   500ms;

  /* Easing primitives */
  --ease-linear:       linear;
  --ease-in:           cubic-bezier(0.4, 0, 1, 1);
  --ease-out:          cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out:       cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:       cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Semantic motion */
  --motion-fade:       opacity var(--duration-normal) var(--ease-out);
  --motion-slide:      transform var(--duration-normal) var(--ease-out);
  --motion-scale:      transform var(--duration-fast) var(--ease-spring);
  --motion-default:    all var(--duration-normal) var(--ease-in-out);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast:   0ms;
    --duration-normal: 0ms;
    --duration-slow:   0ms;
    --duration-slower: 0ms;
  }
}
```

### Elevation / Z-Index Tokens

```css
:root {
  /* Z-index scale */
  --z-below:    -1;
  --z-base:      0;
  --z-raised:    1;
  --z-dropdown:  100;
  --z-sticky:    200;
  --z-overlay:   300;
  --z-modal:     400;
  --z-popover:   500;
  --z-toast:     600;
  --z-tooltip:   700;

  /* Shadow (elevation) scale */
  --elevation-0: none;
  --elevation-1: 0 1px 2px rgb(0 0 0 / 0.05);
  --elevation-2: 0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px rgb(0 0 0 / 0.06);
  --elevation-3: 0 4px 6px rgb(0 0 0 / 0.07), 0 2px 4px rgb(0 0 0 / 0.06);
  --elevation-4: 0 10px 15px rgb(0 0 0 / 0.1), 0 4px 6px rgb(0 0 0 / 0.05);
  --elevation-5: 0 20px 25px rgb(0 0 0 / 0.1), 0 10px 10px rgb(0 0 0 / 0.04);
}
```

### Breakpoint Tokens

```css
/* Use with JS/TS — not available as CSS custom properties directly */

/* tokens/breakpoints.json */
{
  "breakpoint": {
    "xs":  "320px",
    "sm":  "640px",
    "md":  "768px",
    "lg":  "1024px",
    "xl":  "1280px",
    "2xl": "1536px"
  }
}

/* In CSS, use as media queries */
@custom-media --bp-sm  (min-width: 640px);
@custom-media --bp-md  (min-width: 768px);
@custom-media --bp-lg  (min-width: 1024px);
@custom-media --bp-xl  (min-width: 1280px);

/* In JS/TS */
export const breakpoints = {
  xs:  320,
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const;
```

## Dark Mode Token Switching

### Strategy 1: Semantic Token Inversion via CSS Class

```css
/* Light mode (default) */
:root {
  --color-primary:        #2563eb;
  --color-surface:        #ffffff;
  --color-surface-raised: #f9fafb;
  --color-border:         #e5e7eb;
  --color-text-primary:   #111827;
  --color-text-secondary: #6b7280;
  --color-text-inverse:   #ffffff;
}

/* Dark mode via class on <html> */
:root.dark,
[data-theme="dark"] {
  --color-primary:        #60a5fa;   /* blue-400 — lighter for dark bg */
  --color-surface:        #111827;   /* gray-900 */
  --color-surface-raised: #1f2937;   /* gray-800 */
  --color-border:         #374151;   /* gray-700 */
  --color-text-primary:   #f9fafb;   /* gray-50 */
  --color-text-secondary: #9ca3af;   /* gray-400 */
  --color-text-inverse:   #111827;
}
```

### Strategy 2: prefers-color-scheme + Manual Override

```css
/* Respect OS preference by default */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-surface:      #111827;
    --color-text-primary: #f9fafb;
    /* ... all dark values */
  }
}

/* Explicit light override (user chose light despite OS dark) */
[data-theme="light"] {
  --color-surface:      #ffffff;
  --color-text-primary: #111827;
}

/* Explicit dark override (user chose dark despite OS light) */
[data-theme="dark"] {
  --color-surface:      #111827;
  --color-text-primary: #f9fafb;
}
```

### Theme Switcher Implementation

```typescript
type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ui-theme';

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (theme === 'system' && prefersDark)) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
  }
}

function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const theme = saved ?? 'system';
  applyTheme(theme);

  // React to OS preference changes when system mode
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (localStorage.getItem(STORAGE_KEY) === 'system') {
        applyTheme('system');
      }
    });
}

function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

// Run before first paint to avoid flash
// Place inline in <head> or in a blocking script
initTheme();
```

### Token File Structure

```
tokens/
├── primitives/
│   ├── color.json          # All color ramps
│   ├── spacing.json        # All spacing values
│   ├── typography.json     # Font sizes, weights, line-heights
│   ├── border-radius.json
│   ├── shadow.json
│   └── motion.json
├── semantic/
│   ├── color.light.json    # Semantic colors for light mode
│   ├── color.dark.json     # Semantic colors for dark mode
│   ├── spacing.json        # Semantic spacing (layout, component)
│   └── typography.json     # Type styles (heading-1, body-md, etc.)
└── components/
    ├── button.json
    ├── input.json
    ├── card.json
    └── badge.json
```

## Key Principles

1. **Components consume semantic tokens, never primitives.** If a component references `blue-600` directly, it breaks when a theme overrides the primary color to purple.

2. **Primitives are immutable.** Never swap `blue-500` to a different hex. Add a new ramp instead.

3. **Semantic tokens are the theme boundary.** Swap all semantic tokens between light/dark/brand themes. Components auto-update.

4. **Component tokens enable micro-theming.** A client can override `--button-primary-bg` without touching global primary color.

5. **Token count discipline.** Each new token needs justification. Redundant tokens create maintenance debt. If two tokens always have the same value and meaning, they should be one token.
