# Semantic Color Systems

## Why Semantic Tokens?

Raw palette values (`--blue-500`) scattered across components create maintenance nightmares. When your brand color changes, you update hundreds of references. When dark mode is added, you duplicate every component. Semantic tokens solve this by naming colors by their **role**, not their value.

**Three-tier architecture**:
1. **Primitive tokens** — the raw palette (every shade of every hue)
2. **Semantic tokens** — role-based aliases (`--color-primary`, `--color-surface`)
3. **Component tokens** — component-scoped overrides (`--btn-bg`, `--card-border`)

Components reference only semantic tokens. Semantic tokens reference primitives. Theming changes primitives only — everything cascades automatically.

---

## Tier 1: Primitive Tokens

The complete numerical color palette. Never used directly in components.

```css
:root {
  /* Blue */
  --primitive-blue-50:  oklch(97% 0.03 255);
  --primitive-blue-100: oklch(93% 0.06 255);
  --primitive-blue-200: oklch(86% 0.11 255);
  --primitive-blue-300: oklch(75% 0.16 255);
  --primitive-blue-400: oklch(63% 0.20 255);
  --primitive-blue-500: oklch(53% 0.22 255);
  --primitive-blue-600: oklch(44% 0.20 255);
  --primitive-blue-700: oklch(36% 0.17 255);
  --primitive-blue-800: oklch(27% 0.13 255);
  --primitive-blue-900: oklch(20% 0.09 255);
  --primitive-blue-950: oklch(13% 0.05 255);

  /* Neutral */
  --primitive-neutral-0:   oklch(100% 0 0);
  --primitive-neutral-50:  oklch(98% 0.005 255);
  --primitive-neutral-100: oklch(94% 0.01 255);
  --primitive-neutral-200: oklch(88% 0.015 255);
  --primitive-neutral-300: oklch(79% 0.015 255);
  --primitive-neutral-400: oklch(66% 0.01 255);
  --primitive-neutral-500: oklch(53% 0.01 255);
  --primitive-neutral-600: oklch(43% 0.01 255);
  --primitive-neutral-700: oklch(34% 0.01 255);
  --primitive-neutral-800: oklch(25% 0.01 255);
  --primitive-neutral-900: oklch(17% 0.01 255);
  --primitive-neutral-950: oklch(11% 0.01 255);

  /* Green */
  --primitive-green-50:  oklch(97% 0.03 155);
  --primitive-green-100: oklch(93% 0.06 155);
  --primitive-green-500: oklch(55% 0.20 155);
  --primitive-green-600: oklch(46% 0.18 155);
  --primitive-green-700: oklch(37% 0.15 155);
  --primitive-green-800: oklch(28% 0.11 155);
  --primitive-green-900: oklch(20% 0.08 155);

  /* Amber */
  --primitive-amber-50:  oklch(97% 0.03 85);
  --primitive-amber-100: oklch(93% 0.06 83);
  --primitive-amber-400: oklch(73% 0.20 77);
  --primitive-amber-500: oklch(68% 0.22 75);
  --primitive-amber-600: oklch(58% 0.20 72);
  --primitive-amber-700: oklch(47% 0.17 70);
  --primitive-amber-800: oklch(35% 0.13 68);
  --primitive-amber-900: oklch(26% 0.09 66);

  /* Red */
  --primitive-red-50:  oklch(97% 0.03 25);
  --primitive-red-100: oklch(93% 0.06 25);
  --primitive-red-400: oklch(63% 0.22 25);
  --primitive-red-500: oklch(55% 0.22 25);
  --primitive-red-600: oklch(47% 0.20 25);
  --primitive-red-700: oklch(39% 0.17 25);
  --primitive-red-800: oklch(29% 0.13 25);
  --primitive-red-900: oklch(22% 0.09 25);
}
```

---

## Tier 2: Semantic Tokens

### Color Roles Overview

| Role | Purpose |
|------|---------|
| `primary` | Brand color, main interactive element |
| `secondary` | Supporting brand color, secondary actions |
| `accent` | High-energy highlights, promotional elements |
| `neutral` | Text, borders, structural UI |
| `success` | Positive outcomes, confirmations |
| `warning` | Caution, requires attention |
| `error` | Failures, destructive actions |
| `info` | Informational, non-urgent notices |

### Complete Semantic Token Set

```css
/* Light mode (default) */
:root {
  /* --- Backgrounds & Surfaces --- */
  --color-bg:                 var(--primitive-neutral-50);
  --color-bg-subtle:          var(--primitive-neutral-100);
  --color-surface:            var(--primitive-neutral-0);     /* cards, panels */
  --color-surface-raised:     var(--primitive-neutral-0);     /* modals (+ shadow) */
  --color-surface-overlay:    var(--primitive-neutral-0);     /* tooltips, popovers */
  --color-surface-sunken:     var(--primitive-neutral-100);   /* inputs, wells */
  --color-surface-inverse:    var(--primitive-neutral-900);   /* dark surfaces */

  /* --- Borders --- */
  --color-border:             var(--primitive-neutral-200);   /* default border */
  --color-border-strong:      var(--primitive-neutral-300);   /* emphasized border */
  --color-border-muted:       var(--primitive-neutral-100);   /* subtle dividers */
  --color-border-inverse:     var(--primitive-neutral-700);   /* on dark surfaces */

  /* --- Text --- */
  --color-text:               var(--primitive-neutral-900);   /* primary body text */
  --color-text-secondary:     var(--primitive-neutral-600);   /* supporting text */
  --color-text-muted:         var(--primitive-neutral-400);   /* placeholders, captions */
  --color-text-disabled:      var(--primitive-neutral-300);   /* disabled state */
  --color-text-inverse:       var(--primitive-neutral-0);     /* text on dark bg */
  --color-text-on-primary:    oklch(100% 0 0);                /* text on primary bg */

  /* --- Primary --- */
  --color-primary:            var(--primitive-blue-500);
  --color-primary-hover:      var(--primitive-blue-600);
  --color-primary-active:     var(--primitive-blue-700);
  --color-primary-subtle:     var(--primitive-blue-50);
  --color-primary-subtle-hover: var(--primitive-blue-100);
  --color-primary-border:     var(--primitive-blue-200);
  --color-primary-border-strong: var(--primitive-blue-400);
  --color-primary-text:       var(--primitive-blue-700);      /* text on subtle bg */
  --color-on-primary:         oklch(100% 0 0);                /* text on filled primary */

  /* --- Success --- */
  --color-success:            var(--primitive-green-500);
  --color-success-hover:      var(--primitive-green-600);
  --color-success-subtle:     var(--primitive-green-50);
  --color-success-border:     var(--primitive-green-200);
  --color-success-text:       var(--primitive-green-700);
  --color-on-success:         oklch(100% 0 0);

  /* --- Warning --- */
  --color-warning:            var(--primitive-amber-500);
  --color-warning-hover:      var(--primitive-amber-600);
  --color-warning-subtle:     var(--primitive-amber-50);
  --color-warning-border:     oklch(88% 0.10 80);
  --color-warning-text:       var(--primitive-amber-800);     /* dark for contrast on yellow */
  --color-on-warning:         var(--primitive-amber-900);     /* never white on yellow */

  /* --- Error --- */
  --color-error:              var(--primitive-red-500);
  --color-error-hover:        var(--primitive-red-600);
  --color-error-subtle:       var(--primitive-red-50);
  --color-error-border:       oklch(88% 0.08 25);
  --color-error-text:         var(--primitive-red-700);
  --color-on-error:           oklch(100% 0 0);

  /* --- Info --- */
  --color-info:               var(--primitive-blue-400);
  --color-info-subtle:        var(--primitive-blue-50);
  --color-info-border:        var(--primitive-blue-200);
  --color-info-text:          var(--primitive-blue-700);
  --color-on-info:            oklch(100% 0 0);
}
```

---

## Dark Mode Semantic Tokens

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Backgrounds & Surfaces */
    --color-bg:                 var(--primitive-neutral-950);
    --color-bg-subtle:          oklch(12% 0.015 255);
    --color-surface:            var(--primitive-neutral-900);
    --color-surface-raised:     var(--primitive-neutral-800);
    --color-surface-overlay:    var(--primitive-neutral-700);
    --color-surface-sunken:     oklch(9% 0.01 255);
    --color-surface-inverse:    var(--primitive-neutral-50);

    /* Borders */
    --color-border:             var(--primitive-neutral-700);
    --color-border-strong:      var(--primitive-neutral-600);
    --color-border-muted:       var(--primitive-neutral-800);
    --color-border-inverse:     var(--primitive-neutral-200);

    /* Text */
    --color-text:               var(--primitive-neutral-50);
    --color-text-secondary:     var(--primitive-neutral-400);
    --color-text-muted:         var(--primitive-neutral-600);
    --color-text-disabled:      var(--primitive-neutral-700);
    --color-text-inverse:       var(--primitive-neutral-900);

    /* Primary — use lighter stop in dark mode */
    --color-primary:            var(--primitive-blue-400);
    --color-primary-hover:      var(--primitive-blue-300);
    --color-primary-active:     var(--primitive-blue-200);
    --color-primary-subtle:     var(--primitive-blue-950);
    --color-primary-subtle-hover: var(--primitive-blue-900);
    --color-primary-border:     var(--primitive-blue-800);
    --color-primary-border-strong: var(--primitive-blue-600);
    --color-primary-text:       var(--primitive-blue-300);
    --color-on-primary:         var(--primitive-blue-950);

    /* Success */
    --color-success:            oklch(62% 0.19 155);    /* lighter for dark bg */
    --color-success-subtle:     var(--primitive-green-900);
    --color-success-border:     var(--primitive-green-800);
    --color-success-text:       oklch(72% 0.16 155);

    /* Warning */
    --color-warning:            var(--primitive-amber-400);
    --color-warning-subtle:     var(--primitive-amber-900);
    --color-warning-border:     var(--primitive-amber-800);
    --color-warning-text:       var(--primitive-amber-300);
    --color-on-warning:         var(--primitive-amber-950);

    /* Error */
    --color-error:              var(--primitive-red-400);
    --color-error-subtle:       var(--primitive-red-900);
    --color-error-border:       var(--primitive-red-800);
    --color-error-text:         oklch(68% 0.19 25);
  }
}
```

---

## Surface / On-Surface Pattern

For any filled surface, you need a corresponding "on" color that guarantees readable contrast. This pattern scales to any number of surface variants.

```css
:root {
  /* Surface pairs */
  --surface-default:     var(--color-surface);
  --on-surface-default:  var(--color-text);

  --surface-primary:     var(--color-primary);
  --on-surface-primary:  var(--color-on-primary);

  --surface-success:     var(--color-success);
  --on-surface-success:  var(--color-on-success);

  --surface-error:       var(--color-error);
  --on-surface-error:    var(--color-on-error);

  --surface-warning:     var(--color-warning);
  --on-surface-warning:  var(--color-on-warning);

  --surface-inverse:     var(--color-surface-inverse);
  --on-surface-inverse:  var(--color-text-inverse);
}

/* Usage in components */
.badge {
  background: var(--surface-success);
  color: var(--on-surface-success);
}

.alert--error {
  background: var(--color-error-subtle);
  color: var(--color-error-text);
  border: 1px solid var(--color-error-border);
}
```

---

## Background Layering

Multiple layered surfaces should have a clear visual hierarchy through subtle lightness differences:

```css
/* Light mode layering — lightest = most elevated */
:root {
  --layer-base:     oklch(96% 0.008 255);   /* page background */
  --layer-1:        oklch(98% 0.005 255);   /* card / panel */
  --layer-2:        oklch(100% 0 0);        /* nested card, modal */
  --layer-3:        oklch(100% 0 0);        /* tooltip (uses shadow to differentiate) */
}

/* Dark mode layering — lightest = most elevated */
@media (prefers-color-scheme: dark) {
  :root {
    --layer-base:   oklch(11% 0.015 255);   /* page background */
    --layer-1:      oklch(15% 0.015 255);   /* card / panel */
    --layer-2:      oklch(19% 0.015 255);   /* nested card, modal */
    --layer-3:      oklch(23% 0.015 255);   /* tooltip */
  }
}

/* In practice */
body           { background: var(--layer-base); }
.card          { background: var(--layer-1); }
.card__header  { background: var(--layer-base); }  /* sunken header */
.modal         { background: var(--layer-2); }
.tooltip       { background: var(--layer-3); }
```

---

## Interactive State Colors

Every interactive element needs 5 states: default, hover, active (pressed), focus, disabled.

```css
/* Button state tokens */
.btn-primary {
  /* Default */
  --btn-bg:       var(--color-primary);
  --btn-text:     var(--color-on-primary);
  --btn-border:   transparent;

  background: var(--btn-bg);
  color: var(--btn-text);
  border: 1px solid var(--btn-border);
  transition: background 120ms ease, box-shadow 120ms ease;
}

/* Hover — slightly darker background */
.btn-primary:hover {
  --btn-bg: var(--color-primary-hover);
}

/* Active / Pressed — noticeably darker, slightly smaller */
.btn-primary:active {
  --btn-bg: var(--color-primary-active);
  transform: scale(0.98);
}

/* Focus — visible outline, offset from element */
.btn-primary:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Disabled — muted, no interaction feedback */
.btn-primary:disabled,
.btn-primary[aria-disabled="true"] {
  --btn-bg:   var(--color-surface-sunken);
  --btn-text: var(--color-text-disabled);
  cursor: not-allowed;
  pointer-events: none;
}
```

### Ghost / Outline Variant States
```css
.btn-ghost {
  --btn-bg:          transparent;
  --btn-text:        var(--color-primary);
  --btn-border:      var(--color-primary-border);

  background: var(--btn-bg);
  color: var(--btn-text);
  border: 1px solid var(--btn-border);
}

.btn-ghost:hover {
  --btn-bg:     var(--color-primary-subtle);
  --btn-border: var(--color-primary-border-strong);
}

.btn-ghost:active {
  --btn-bg:     var(--color-primary-subtle-hover);
}
```

### Input State Tokens
```css
.input {
  background:    var(--color-surface-sunken);
  color:         var(--color-text);
  border:        1px solid var(--color-border);
  border-radius: 6px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.input::placeholder { color: var(--color-text-muted); }

.input:hover:not(:focus):not(:disabled) {
  border-color: var(--color-border-strong);
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px oklch(from var(--color-primary) l c h / 20%);
  outline: none;
}

.input--error {
  border-color: var(--color-error);
}

.input--error:focus {
  box-shadow: 0 0 0 3px oklch(from var(--color-error) l c h / 20%);
}

.input:disabled {
  background: var(--color-bg-subtle);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}
```

---

## Complete CSS Token Example

A working system ready to drop into a project:

```css
/* ==========================================================================
   COLOR SYSTEM — Semantic Token Layer
   Requires primitive palette variables (see 04-systematic-palette-generation)
   ========================================================================== */

/* Light mode */
:root {
  /* Page structure */
  --c-bg:               oklch(97% 0.008 255);
  --c-bg-subtle:        oklch(94% 0.012 255);
  --c-surface:          oklch(100% 0 0);
  --c-surface-raised:   oklch(100% 0 0);  /* differentiated by shadow */
  --c-surface-sunken:   oklch(95% 0.010 255);

  /* Borders */
  --c-border:           oklch(88% 0.015 255);
  --c-border-strong:    oklch(78% 0.018 255);

  /* Text */
  --c-text:             oklch(15% 0.012 255);
  --c-text-2:           oklch(42% 0.010 255);
  --c-text-3:           oklch(62% 0.008 255);
  --c-text-dis:         oklch(75% 0.006 255);
  --c-text-inv:         oklch(98% 0.005 255);

  /* Interactive — primary */
  --c-brand:            oklch(53% 0.22 255);
  --c-brand-h:          oklch(44% 0.20 255);   /* hover */
  --c-brand-a:          oklch(36% 0.17 255);   /* active */
  --c-brand-sub:        oklch(96% 0.05 255);   /* subtle bg */
  --c-brand-sub-h:      oklch(92% 0.08 255);
  --c-on-brand:         oklch(100% 0 0);

  /* Feedback */
  --c-ok:               oklch(55% 0.20 155);
  --c-ok-sub:           oklch(96% 0.04 155);
  --c-ok-t:             oklch(37% 0.15 155);   /* text */
  --c-ok-b:             oklch(88% 0.08 155);   /* border */

  --c-warn:             oklch(68% 0.22 75);
  --c-warn-sub:         oklch(97% 0.04 85);
  --c-warn-t:           oklch(35% 0.13 68);
  --c-warn-b:           oklch(88% 0.10 80);

  --c-err:              oklch(55% 0.22 25);
  --c-err-sub:          oklch(97% 0.04 25);
  --c-err-t:            oklch(39% 0.17 25);
  --c-err-b:            oklch(88% 0.08 25);

  --c-info:             oklch(53% 0.22 230);
  --c-info-sub:         oklch(96% 0.05 230);
  --c-info-t:           oklch(36% 0.17 230);
  --c-info-b:           oklch(88% 0.09 230);
}

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --c-bg:               oklch(11% 0.015 255);
    --c-bg-subtle:        oklch(9% 0.012 255);
    --c-surface:          oklch(15% 0.015 255);
    --c-surface-raised:   oklch(20% 0.015 255);
    --c-surface-sunken:   oklch(9% 0.010 255);

    --c-border:           oklch(28% 0.018 255);
    --c-border-strong:    oklch(38% 0.015 255);

    --c-text:             oklch(93% 0.010 255);
    --c-text-2:           oklch(68% 0.008 255);
    --c-text-3:           oklch(48% 0.008 255);
    --c-text-dis:         oklch(32% 0.006 255);
    --c-text-inv:         oklch(15% 0.012 255);

    --c-brand:            oklch(65% 0.22 255);   /* lighter on dark bg */
    --c-brand-h:          oklch(73% 0.20 255);
    --c-brand-a:          oklch(80% 0.17 255);
    --c-brand-sub:        oklch(18% 0.08 255);
    --c-brand-sub-h:      oklch(22% 0.10 255);
    --c-on-brand:         oklch(10% 0.03 255);

    --c-ok:               oklch(62% 0.19 155);
    --c-ok-sub:           oklch(16% 0.06 155);
    --c-ok-t:             oklch(72% 0.16 155);
    --c-ok-b:             oklch(28% 0.10 155);

    --c-warn:             oklch(73% 0.20 77);
    --c-warn-sub:         oklch(18% 0.06 78);
    --c-warn-t:           oklch(80% 0.16 80);
    --c-warn-b:           oklch(30% 0.10 75);

    --c-err:              oklch(62% 0.22 25);
    --c-err-sub:          oklch(18% 0.06 25);
    --c-err-t:            oklch(72% 0.18 25);
    --c-err-b:            oklch(28% 0.10 25);

    --c-info:             oklch(65% 0.20 230);
    --c-info-sub:         oklch(18% 0.07 230);
    --c-info-t:           oklch(74% 0.16 230);
    --c-info-b:           oklch(28% 0.10 230);
  }
}
```
