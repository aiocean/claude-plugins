# Dialog / Modal Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 3px solid #000;
--shadow: 4px 4px 0px 0px #000;
--radius: 0px;
--overlay: oklch(0% 0 0 / 0.8);  /* 80% black overlay */
```

## Dialog Content Classes

```
bg-background
fixed top-[50%] left-[50%] z-50
translate-x-[-50%] translate-y-[-50%]
w-full max-w-[calc(100%-2rem)] sm:max-w-lg
grid gap-4 p-6
rounded-base border-3 border-border shadow-shadow
duration-200
```

## Overlay Classes

```
fixed inset-0 z-50 bg-overlay
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
```

## Animation Classes

```
data-[state=open]:animate-in
data-[state=closed]:animate-out
data-[state=closed]:fade-out-0
data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-95
data-[state=open]:zoom-in-95
```

## Close Button

```
absolute right-4 top-3
rounded-base opacity-100
ring-offset-white
focus:outline-hidden focus:ring-2 focus:ring-black focus:ring-offset-2
disabled:pointer-events-none
[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4
```

## Vue Implementation

```vue
<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description text</DialogDescription>
      </DialogHeader>

      <!-- Content here -->

      <DialogFooter>
        <Button variant="neutral" @click="isOpen = false">Cancel</Button>
        <Button @click="confirm">Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

## Key Rules

1. **Heavy shadow**: Dialogs use the full `shadow-shadow` (4px 4px)
2. **Dark overlay**: 80% black for strong contrast
3. **3px border**: Thicker than inputs (2px) for prominence
4. **Centered positioning**: Always `top-[50%] left-[50%]` with transform
5. **No scroll on body**: Handled by portal/overlay system
6. **Sharp corners**: `rounded-base` = 0px
