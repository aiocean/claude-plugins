# Cascade Layers

## The Specificity Problem

Before cascade layers, managing specificity across a large codebase was painful.
A utility class `.mt-4` with specificity (0,1,0) loses to a component rule
`.card .title` with specificity (0,2,0), forcing you to either add `!important`,
increase specificity artificially, or restructure your HTML.

Third-party CSS compounds this. Bootstrap, Normalize, or any design system you
import competes with your own styles by specificity alone. You have no control over
load order effects without hacks.

`@layer` solves this by introducing a new axis: **layer order**. Styles in a
later-declared layer always win over styles in an earlier layer, **regardless of
specificity**. This makes specificity relevant only within a layer, not across layers.

---

## Syntax

### Declaring Layers

```css
/* Declare layer order upfront — recommended practice */
@layer reset, base, tokens, components, utilities, overrides;

/* Later, fill each layer */
@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; }
  /* ... */
}

@layer base {
  body { font-family: system-ui, sans-serif; line-height: 1.5; }
  h1, h2, h3 { line-height: 1.2; }
}

@layer components {
  .btn { /* ... */ }
  .card { /* ... */ }
}

@layer utilities {
  .sr-only { /* ... */ }
  .truncate { /* ... */ }
}
```

### Inline Layer Declaration

Layers can be declared and populated in a single block:

```css
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 150ms, color 150ms, border-color 150ms;
  }
}
```

### Adding to a Layer Later

You can add rules to a layer in multiple places — they all merge into one layer:

```css
@layer components {
  .btn { /* base button */ }
}

/* ... elsewhere in the file or another file ... */

@layer components {
  .card { /* added later, still in components layer */ }
}
```

---

## Layer Order and Specificity

**Layer order wins over specificity.** A low-specificity rule in a later layer
beats a high-specificity rule in an earlier layer:

```css
@layer base, utilities;

@layer base {
  /* specificity: (0,2,0) — but in an earlier layer */
  .card .title {
    font-size: 1.25rem;
    color: black;
  }
}

@layer utilities {
  /* specificity: (0,1,0) — but in a LATER layer → this wins */
  .text-red {
    color: red;
  }
}
```

```html
<!-- .text-red wins even though .card .title has higher specificity -->
<div class="card">
  <h2 class="title text-red">Red heading</h2>
</div>
```

This is the entire point: **utilities always win over components, components always
win over base, regardless of how the selectors are written**.

---

## The Standard Layer Stack

```css
/* Recommended layer order for a design-system-driven project */
@layer reset, base, tokens, layout, components, patterns, utilities, overrides;
```

| Layer       | Purpose                                                          |
|-------------|------------------------------------------------------------------|
| `reset`     | Box-sizing, margin removal, UA style normalization               |
| `base`      | Element defaults: typography, links, headings, form elements     |
| `tokens`    | Custom property declarations (no selectors that conflict)        |
| `layout`    | Page-level grid/flex structures, app shell                       |
| `components`| Individual UI components: button, card, modal, input             |
| `patterns`  | Composed patterns from multiple components: hero, feature section|
| `utilities` | Single-purpose utility classes (spacing, color, display)         |
| `overrides` | Emergency escapes, per-page tweaks, A/B test styles              |

---

## Complete Example

```css
/* ─── Layer order declaration ─── */
@layer reset, base, tokens, components, utilities, overrides;

/* ─── Reset ─── */
@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
  }

  * {
    margin: 0;
    padding: 0;
  }

  html {
    -webkit-text-size-adjust: 100%;
    hanging-punctuation: first last;
  }

  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
  }

  input, button, textarea, select {
    font: inherit;
  }

  p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
  }
}

/* ─── Base ─── */
@layer base {
  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--text-primary);
    background: var(--bg-base);
  }

  h1 { font-size: 2.25rem; line-height: 1.2; font-weight: 700; }
  h2 { font-size: 1.875rem; line-height: 1.25; font-weight: 700; }
  h3 { font-size: 1.5rem; line-height: 1.3; font-weight: 600; }
  h4 { font-size: 1.25rem; line-height: 1.35; font-weight: 600; }

  a {
    color: var(--text-brand);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  a:hover {
    text-decoration: none;
  }

  :focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}

/* ─── Tokens ─── */
@layer tokens {
  :root {
    --bg-base: #ffffff;
    --text-primary: #0f172a;
    --text-brand: #2563eb;
    --border-focus: #3b82f6;
    /* ... full token system ... */
  }
}

/* ─── Components ─── */
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    border: 1px solid transparent;
    background: var(--bg-brand, #2563eb);
    color: white;
    transition: background 150ms;
  }

  .btn:hover {
    background: var(--bg-brand-hover, #1d4ed8);
  }

  .card {
    background: var(--bg-base);
    border: 1px solid var(--border-default, #e2e8f0);
    border-radius: 8px;
    padding: 1.5rem;
  }
}

/* ─── Utilities ─── */
@layer utilities {
  .flex   { display: flex; }
  .hidden { display: none; }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border-width: 0;
  }

  .mt-0 { margin-top: 0; }
  .mt-1 { margin-top: 0.25rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-4 { margin-top: 1rem; }
  .mt-8 { margin-top: 2rem; }

  .text-center { text-align: center; }
  .font-bold   { font-weight: 700; }
  .text-sm     { font-size: 0.875rem; }
  .text-red    { color: #ef4444; }
}

/* ─── Overrides ─── */
@layer overrides {
  /* Per-page tweaks that must win everything */
  .landing-hero .btn {
    font-size: 1.125rem;
    padding: 0.875rem 2rem;
  }
}
```

---

## Third-Party CSS Management

This is where layers shine. Wrap any third-party stylesheet in a layer to give
your own styles automatic precedence:

```css
/* Your own layer order — all declared BEFORE the imports */
@layer reset, base, tokens, vendor, components, utilities;

/* Import third-party CSS into the vendor layer */
@import url("https://cdn.example.com/bootstrap.min.css") layer(vendor);
@import "normalize.css" layer(reset);
@import "some-component-lib.css" layer(vendor);

/* Your components layer is declared AFTER vendor → always wins */
@layer components {
  /* This overrides Bootstrap's .btn without specificity fights */
  .btn {
    border-radius: var(--radius-button);
    font-family: inherit;
  }
}
```

Without layers, overriding Bootstrap required matching or exceeding its specificity.
With layers, your `components` layer beats `vendor` unconditionally.

---

## Unlayered Styles

Styles **not in any layer** are treated as belonging to an implicit layer that is
**higher priority than all named layers**. This is important for migration:

```css
@layer base, components;

/* In a layer — lower priority than unlayered styles */
@layer components {
  .btn { color: blue; }
}

/* Unlayered — wins over everything in a named layer */
.btn { color: red; } /* This wins */
```

Use this to your advantage when migrating incrementally: wrap only the old code in
layers, and new code without layers automatically wins.

---

## Nested Layers

Layers can be nested for sub-system organization:

```css
@layer components {
  @layer forms {
    .input { /* ... */ }
    .label { /* ... */ }
  }

  @layer navigation {
    .nav { /* ... */ }
    .nav-item { /* ... */ }
  }

  @layer feedback {
    .toast { /* ... */ }
    .modal { /* ... */ }
  }
}

/* Reference nested layers with dot notation */
@layer components.forms {
  .textarea { /* added to components.forms layer */ }
}
```

Nested layer order within `components`:
`forms` < `navigation` < `feedback` (first declared = lowest priority)

---

## Practical Migration Strategy

### Step 1: Identify your current style categories

Look at your existing CSS and group it mentally: resets, base element styles,
component classes, utility classes, third-party, page overrides.

### Step 2: Declare layer order (new file or top of main CSS)

```css
/* styles/layers.css — import this first */
@layer reset, base, components, utilities, overrides;
```

### Step 3: Wrap existing files progressively

```css
/* Wrap reset in its layer */
@import "reset.css" layer(reset);

/* Wrap base styles */
@import "base.css" layer(base);

/* Leave components unlayered during migration — they win automatically */
@import "components.css"; /* no layer yet */

/* Utilities are already unlayered → highest priority */
@import "utilities.css";
```

### Step 4: Move components into their layer once stable

```css
@import "components.css" layer(components);
/* Now utilities layer beats components as intended */
```

### Step 5: Validate specificity assumptions

After layering, low-specificity utilities should beat high-specificity components.
Test any selectors that relied on specificity games to override component styles.

---

## Key Rules to Remember

1. **Layer order is set by the first declaration** of a layer name, not where styles are added
2. **Later layers win** over earlier layers regardless of specificity
3. **Unlayered styles win** over all named layers
4. **`!important` reverses layer order** — `!important` in an earlier layer beats `!important` in a later layer (this is intentional for resets)
5. **`@import layer()`** is the idiomatic way to layer third-party CSS

```css
/* !important reversal — useful for forced accessibility overrides in reset */
@layer reset, components;

@layer reset {
  /* This !important wins over components layer's !important */
  * { box-sizing: border-box !important; }
}

@layer components {
  .box { box-sizing: content-box !important; } /* loses to reset's !important */
}
```
