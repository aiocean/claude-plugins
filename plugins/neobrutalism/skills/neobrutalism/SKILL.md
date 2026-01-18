---
name: neobrutalism
description: Apply neobrutalism design patterns to web UI. Bold borders, hard shadows, vibrant colors, no gradients. Use when creating buttons, cards, forms, interactive elements with raw high-contrast aesthetic, or user mentions brutalist, bold design, hard shadows.
---

# Neobrutalism Design System

## Quick Setup

### 1. Add Fonts to `index.html`

```html
<head>
  <!-- Neobrutalism fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,100..900;1,100..900&family=Bricolage+Grotesque:wght@200..800&display=swap"
    rel="stylesheet"
  />
</head>
```

### 2. Copy Base CSS

Copy [code/base.css](code/base.css) to your project's `src/style.css`.

### 3. Copy UI Components

Copy components from [code/](code/) directory as needed (button, card, input, etc.).

## The 6 Rules

1. **Thick black borders**: 2-4px solid #000
2. **Hard shadows**: `4px 4px 0 #000` (NEVER blur)
3. **Sharp corners**: 0px border-radius
4. **Vibrant colors**: 2-3 accent colors max, high contrast
5. **Bold typography**: weights 700-900
6. **No gradients**: solid colors only

## Core Tokens

```css
/* Borders */
border: 2px solid #000; /* inputs */
border: 3px solid #000; /* cards, containers */

/* Shadows */
box-shadow: 4px 4px 0 #000; /* standard */
box-shadow: 8px 8px 0 #000; /* modals */

/* Timing */
transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
```

## Two Interaction Patterns

### Press-Down (Buttons)

```css
/* Default: elevated */
box-shadow: 4px 4px 0 #000;

/* Hover: lands where shadow was */
hover {
  transform: translate(4px, 4px);
  box-shadow: none;
  background: #000;
  color: #fff;
}

/* Active: tactile feedback */
active {
  scale: 0.95;
}
```

### Elevate-Up (Navigation)

```css
/* Default: flat */
border: transparent;
box-shadow: none;

/* Hover: lifts up */
hover {
  box-shadow: 4px 4px 0 #000;
  transform: translate(-1px, -1px);
  border-color: #000;
}
```

## Anti-Patterns

- Blurred shadows
- Gradients
- Excessive border-radius (>30px)
- More than 3 accent colors
- Transitions >300ms
- Missing hover states on interactive elements
- Missing `cursor: pointer` on clickable elements

## Component References

### Interactive

- [Button](references/button.md) - variants, sizes, states
- [Input](references/input.md) - form inputs, focus
- [Select](references/select.md) - dropdowns, menus
- [Checkbox](references/checkbox.md) - checkboxes, switches

### Containers

- [Card](references/card.md) - static vs clickable
- [Dialog](references/dialog.md) - modals
- [Sheet](references/sheet.md) - slide-over panels
- [Tabs](references/tabs.md) - tab navigation

### Feedback

- [Badge](references/badge.md) - tags, status
- [Alert](references/alert.md) - inline notifications
- [Toast](references/toast.md) - temporary notifications

### Supporting

- [Popover](references/popover.md) - floating content
- [Table](references/table.md) - data tables
- [Label](references/label.md) - typography

### System

- [Base CSS](code/base.css) - complete stylesheet (copy to project)
- [CSS Variables](references/css-variables.md) - complete tokens
- [Colors](references/colors.md) - palette reference
- [Interaction Patterns](references/interaction-patterns.md) - detailed patterns
- [Affordances](references/affordances.md) - clickable vs static
- [Decorations](references/decorations.md) - sketchy effects

## Resources

- [Research Report](neobrutalism-research-report.md) - comprehensive research
- [Neobrutalism.dev](https://www.neobrutalism.dev/) - ShadCN components
- [NN/G Article](https://www.nngroup.com/articles/neobrutalism/) - definition
