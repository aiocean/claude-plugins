# Sheet (Slide-Over Panel) Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 2px solid #000;
--radius: 0px;
--overlay: oklch(0% 0 0 / 0.8);
```

## Base Classes

```
bg-background
data-[state=open]:animate-in data-[state=closed]:animate-out
fixed z-50 flex flex-col gap-4 border-2 border-border
transition ease-in-out
data-[state=closed]:duration-300 data-[state=open]:duration-500
```

## Side Variants

### Top
```
data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top
inset-x-0 top-0 h-auto border-b
```

### Bottom
```
data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom
inset-x-0 bottom-0 h-auto border-t
```

### Left
```
data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left
inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm
```

### Right (Default)
```
data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right
inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm
```

## Overlay

```
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
fixed inset-0 z-50 bg-overlay
```

## Close Button

```
absolute right-4 top-4 rounded-base
ring-offset-white
focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
disabled:pointer-events-none
```

## Vue Implementation

```vue
<script setup lang="ts">
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
      <Button>Open Settings</Button>
    </SheetTrigger>
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>Settings</SheetTitle>
        <SheetDescription>
          Configure your preferences
        </SheetDescription>
      </SheetHeader>

      <!-- Content here -->

      <SheetFooter>
        <Button>Save Changes</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
```

## Animation Timings

- **Open**: 500ms (slower, deliberate entrance)
- **Close**: 300ms (faster exit)
- **Easing**: `ease-in-out`

## Key Rules

1. **No shadow**: Sheets rely on overlay contrast
2. **2px border**: Thinner than dialogs (3px)
3. **Side-specific borders**: Only border on the edge touching content
4. **Width limits**: `w-3/4` mobile, `sm:max-w-sm` desktop
5. **Dark overlay**: 80% black backdrop
6. **Sharp corners**: `rounded-base` = 0px
7. **Slower open, faster close**: 500ms / 300ms timing
