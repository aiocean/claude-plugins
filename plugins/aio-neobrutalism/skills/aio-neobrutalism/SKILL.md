---
name: aio-neobrutalism
description: Use when applying neobrutalism design to a web project. Detects tech stack, generates CSS tokens, and transforms existing UI components. Triggers: "apply neobrutalism", "create brutalist design", "add bold borders", "use hard shadows", neobrutalism, brutalist, bold design, high-contrast aesthetic.
---

# Neobrutalism Design System Bootstrapper

## Objective Workflow

### Phase 1: DETECT — Identify Project Tech Stack

Scan the project root to determine the web framework and styling approach:

```bash
# Check for package.json, framework config files, CSS preprocessors
ls package.json tsconfig.json vite.config.* next.config.* nuxt.config.* tailwind.config.* postcss.config.* 2>/dev/null
```

Identify:
- **Framework**: React, Vue, Svelte, Next.js, Nuxt, Astro, plain HTML
- **Styling**: Tailwind CSS, CSS Modules, styled-components, Sass/Less, plain CSS
- **Component library**: shadcn/ui, Radix, MUI, Vuetify, or none
- **Entry points**: main CSS file, layout files, global styles location

### Phase 2: GENERATE — Create CSS Tokens and Base Styles

Based on detected stack, generate the appropriate token format:

- **Tailwind**: Extend `theme` in tailwind config with neobrutalism tokens (borders, shadows, colors)
- **CSS Variables**: Generate `:root` block with all design tokens
- **styled-components/CSS-in-JS**: Generate a theme object
- **Plain CSS**: Copy [code/base.css](code/base.css) directly

Always include the neobrutalism fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,100..900;1,100..900&family=Bricolage+Grotesque:wght@200..800&display=swap" rel="stylesheet" />
```

### Phase 3: APPLY — Transform Existing UI Components

1. List all UI component files in the project (buttons, cards, inputs, modals, nav)
2. For each component, apply the 6 Rules (see reference below):
   - Add thick black borders (2-4px solid #000)
   - Replace soft shadows with hard shadows (4px 4px 0 #000)
   - Remove border-radius or reduce to 0px
   - Replace gradients with solid vibrant colors
   - Increase font weights to 700-900
   - Add press-down or elevate-up interaction patterns
3. Prioritize: buttons first, then cards, then inputs, then navigation

### Phase 4: REVIEW — Show Before/After

For each transformed component:
- Show the **before** state (existing styles)
- Show the **after** state (neobrutalism styles)
- Flag any anti-patterns found (blurred shadows, gradients, excessive radius)
- Verify hover states and `cursor: pointer` on all interactive elements

---

## Reference Material

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
