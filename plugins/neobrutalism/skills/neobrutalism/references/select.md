# Select & Dropdown Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 3px solid #000;
--radius: 0px;
```

## Select Content Classes

```
relative z-50 max-h-96 min-w-[8rem] overflow-hidden
rounded-base border-3 border-border bg-main text-main-foreground
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
data-[side=bottom]:slide-in-from-top-2
data-[side=left]:slide-in-from-right-2
data-[side=right]:slide-in-from-left-2
data-[side=top]:slide-in-from-bottom-2
origin-(--radix-select-content-transform-origin)
```

## Dropdown Menu Content Classes

```
z-50 min-w-[8rem] overflow-hidden
rounded-base border-3 border-border bg-main p-1
font-base text-main-foreground
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
data-[side=bottom]:slide-in-from-top-2
data-[side=left]:slide-in-from-right-2
data-[side=right]:slide-in-from-left-2
data-[side=top]:slide-in-from-bottom-2
```

## Position Offset (Popper)

```
data-[side=bottom]:translate-y-1
data-[side=left]:-translate-x-1
data-[side=right]:translate-x-1
data-[side=top]:-translate-y-1
```

## Animation Patterns

- **Open**: `fade-in-0` + `zoom-in-95` + `slide-in-from-*-2`
- **Close**: `fade-out-0` + `zoom-out-95`

## Vue Implementation

```vue
<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
</script>

<template>
  <Select v-model="value">
    <SelectTrigger class="w-[180px]">
      <SelectValue placeholder="Select option" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Category</SelectLabel>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
```

## Dropdown Menu Implementation

```vue
<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon">
        <MoreVertical class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Edit</DropdownMenuItem>
      <DropdownMenuItem>Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
```

## Key Rules

1. **No shadow on dropdowns**: Unlike cards, floating elements don't have shadows
2. **3px border**: Consistent with other elements
3. **Slide animations**: Direction-aware (slide-in-from-top when appearing below)
4. **Transform origin**: Uses Radix CSS variables for natural animation
5. **Sharp corners**: `rounded-base` = 0px
6. **Z-index 50**: High stacking for overlay behavior
