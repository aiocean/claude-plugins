# Popover & Tooltip Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 3px solid #000;
--radius: 0px;
--side-offset: 4px;
```

## Popover Content Classes

```
z-50 w-72 rounded-base border-3 border-border bg-main p-4 text-foreground outline-none
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
data-[side=bottom]:slide-in-from-top-2
data-[side=left]:slide-in-from-right-2
data-[side=right]:slide-in-from-left-2
data-[side=top]:slide-in-from-bottom-2
origin-(--radix-popover-content-transform-origin)
```

## Tooltip Content Classes

```
z-50 overflow-hidden rounded-base border-3 border-border bg-main
px-3 py-1.5 text-sm font-base text-main-foreground
animate-in fade-in-0 zoom-in-95
data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
data-[side=bottom]:slide-in-from-top-2
data-[side=left]:slide-in-from-right-2
data-[side=right]:slide-in-from-left-2
data-[side=top]:slide-in-from-bottom-2
origin-(--radix-tooltip-content-transform-origin)
```

## Differences: Popover vs Tooltip

| Property | Popover | Tooltip |
|----------|---------|---------|
| Width | `w-72` (288px) | auto (content-based) |
| Padding | `p-4` | `px-3 py-1.5` |
| Purpose | Forms, complex content | Brief hints |
| Trigger | Click | Hover |

## Vue Implementation - Popover

```vue
<script setup lang="ts">
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="ghost">Open</Button>
    </PopoverTrigger>
    <PopoverContent>
      <div class="grid gap-4">
        <div class="grid gap-2">
          <Label for="width">Width</Label>
          <Input id="width" default-value="100%" />
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
```

## Vue Implementation - Tooltip

```vue
<script setup lang="ts">
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="icon">
          <HelpCircle class="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Helpful hint text</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
```

## Key Rules

1. **No shadow**: Floating elements stay flat
2. **3px border**: Same as all neobrutalism elements
3. **Side offset**: 4px gap from trigger
4. **Direction-aware animation**: Slides from opposite direction
5. **Sharp corners**: `rounded-base` = 0px
6. **Z-index 50**: Ensures visibility above content
