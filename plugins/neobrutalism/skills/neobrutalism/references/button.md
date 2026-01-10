# Button Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
/* Core visual tokens */
--border: 3px solid #000;
--shadow: 4px 4px 0px 0px #000;
--radius: 0px;  /* Sharp corners */
--transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
```

## Base Classes (Tailwind)

```
inline-flex items-center justify-center whitespace-nowrap rounded-base text-sm font-base
ring-offset-white transition-all gap-2
[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
disabled:pointer-events-none disabled:opacity-50
active:scale-95
```

## Variants

### Default (Primary Action)
```
text-main-foreground bg-main border-3 border-border shadow-shadow
hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none
```

**Interaction Pattern**: Press-down - button moves to where shadow was.

### No Shadow
```
text-main-foreground bg-main border-3 border-border hover:text-main-foreground
```

Use when: Multiple buttons in a row, reduced visual weight needed.

### Neutral
```
bg-secondary-background text-foreground border-3 border-border shadow-shadow
hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none
```

Use when: Secondary actions, cancel buttons.

### Reverse (Elevate-up)
```
text-main-foreground bg-main border-3 border-border
hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow
```

**Interaction Pattern**: Starts flat, gains shadow on hover.

### Ghost
```
text-foreground hover:text-foreground hover:bg-secondary
```

Use when: Toolbar icons, minimal UI.

## Sizes

| Size | Classes |
|------|---------|
| default | `h-10 px-4 py-2` |
| sm | `h-9 px-3` |
| lg | `h-11 px-8` |
| icon | `size-10` |

## Interaction CSS

```css
/* Shadow offset variables */
--spacing-boxShadowX: 4px;
--spacing-boxShadowY: 4px;
--spacing-reverseBoxShadowX: -4px;
--spacing-reverseBoxShadowY: -4px;

/* Active state always */
active:scale-95
```

## Vue Implementation

```vue
<script setup lang="ts">
import { Button } from "@/components/ui/button";
</script>

<template>
  <Button variant="default">Primary Action</Button>
  <Button variant="neutral">Cancel</Button>
  <Button variant="ghost" size="icon">
    <Icon />
  </Button>
</template>
```

## Key Rules

1. **Shadow matches translation**: `4px 4px` shadow + `translate(4px, 4px)` hover
2. **Always include active:scale-95**: Provides tactile feedback
3. **Sharp corners**: `rounded-base` maps to `0px` border-radius
4. **Black border only**: Never use colored borders
5. **No gradients**: Solid colors only
