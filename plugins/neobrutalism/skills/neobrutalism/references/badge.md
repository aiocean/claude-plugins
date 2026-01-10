# Badge Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 3px solid #000;
--radius: 0px;
/* No shadow on badges */
```

## Base Classes

```
inline-flex items-center justify-center rounded-base border-3 border-border
px-2.5 py-0.5 text-xs font-base w-fit whitespace-nowrap shrink-0
[&>svg]:size-3 gap-1 [&>svg]:pointer-events-none
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
overflow-hidden
```

## Variants

### Default
```
bg-main text-main-foreground
```

Use when: Status indicators, tags, labels for primary items.

### Neutral
```
bg-secondary-background text-foreground
```

Use when: Secondary labels, counts, less prominent tags.

## Vue Implementation

```vue
<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
</script>

<template>
  <!-- Default (vibrant) -->
  <Badge>New</Badge>

  <!-- Neutral (subdued) -->
  <Badge variant="neutral">Draft</Badge>

  <!-- With icon -->
  <Badge>
    <CheckCircle class="size-3" />
    Complete
  </Badge>
</template>
```

## Common Patterns

### Status Badge
```vue
<Badge :variant="status === 'active' ? 'default' : 'neutral'">
  {{ status }}
</Badge>
```

### Count Badge
```vue
<Badge variant="neutral">{{ count }}</Badge>
```

### Category Tag
```vue
<Badge>{{ category }}</Badge>
```

## Key Rules

1. **No shadow**: Badges stay flat, unlike buttons
2. **3px border**: Consistent border width
3. **Compact sizing**: `px-2.5 py-0.5` for tight spacing
4. **Small text**: `text-xs` for badge content
5. **Sharp corners**: `rounded-base` = 0px
6. **Icon sizing**: `[&>svg]:size-3` ensures consistent icon size
7. **No wrap**: `whitespace-nowrap` prevents text breaking
