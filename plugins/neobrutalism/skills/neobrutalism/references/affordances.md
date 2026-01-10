# Visual Affordances Reference

Clear visual differentiation between interactive and static elements.

## Quick Decision Matrix

| Element Type | Shadow | Hover Changes? | Cursor | Background |
|--------------|--------|----------------|--------|------------|
| **Primary Button** | 4-5px | Yes, disappears | pointer | Vibrant color |
| **Secondary Button** | 0-2px | Yes, appears/inverts | pointer | Transparent |
| **Clickable Card** | 6-8px | Yes, reduces | pointer | White/color |
| **Static Card** | 3-4px | No | default | White/color |
| **Nav Link** | 0px | Yes, appears | pointer | Transparent |
| **Input Field** | 3px | Yes, reduces on focus | text | White |
| **Label/Text** | 0px | No | default | None |
| **Disabled Button** | 2px | No | not-allowed | Gray |

## Shadow Hierarchy

```
8px shadow  → High importance clickable (modals, primary cards)
6px shadow  → Medium importance clickable (cards, active states)
4px shadow  → Standard clickable (buttons, links)
3px shadow  → Low emphasis (inputs, small elements)
2px shadow  → Minimal elevation (hover states)
0px shadow  → Flat/static or pressed state
```

## Color Meanings

```
Vibrant color (yellow, pink, blue) → Primary action
White/transparent background       → Secondary action
Gray background                    → Disabled
Black background (hover)           → Currently hovering
```

## Cursor States

```css
cursor: pointer;     /* Buttons, links, clickable cards */
cursor: text;        /* Text inputs, textareas */
cursor: grab;        /* Draggable elements */
cursor: not-allowed; /* Disabled buttons */
cursor: default;     /* Static elements */
```

## Common Mistakes

1. **Static cards with large shadows** look clickable → Use smaller shadows (3-4px)
2. **Interactive elements without hover** → Always add hover transition
3. **Mixing patterns randomly** → Buttons = press-down, Navigation = elevate-up
4. **Missing cursor states** → cursor: pointer is mandatory for interactive elements

## Testing Checklist

- [ ] All clickable elements have `cursor: pointer`
- [ ] All clickable elements have hover states
- [ ] Static cards have smaller shadows than clickable cards
- [ ] Buttons have vibrant colors or clear affordances
- [ ] Disabled states use `cursor: not-allowed` and gray colors
- [ ] No static elements look more "elevated" than interactive ones
