# Input & Textarea Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 3px solid #000;
--radius: 0px;
/* Note: Inputs do NOT have shadow by default */
```

## Input Base Classes

```
flex h-10 w-full rounded-base border-3 border-border
bg-main px-3 py-2 text-sm font-base text-foreground
file:border-0 file:bg-transparent file:text-sm file:font-heading
placeholder:text-foreground/50
focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
```

## Textarea Classes

```
flex w-full rounded-base border-3 border-border
bg-main px-3 py-2 text-sm font-base text-foreground
placeholder:text-foreground/50
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
```

## Text Selection

**Do NOT use custom selection styling in inputs.**

The `selection:bg-main selection:text-main-foreground` classes cause invisible text when `--main` is yellow (yellow text on yellow background).

Let the browser handle text selection with its default styling, which ensures proper contrast.

## Focus State

```css
/* Ring-based focus for accessibility */
focus-visible:outline-hidden
focus-visible:ring-2
focus-visible:ring-black
focus-visible:ring-offset-2
```

## Vue Implementation

```vue
<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
</script>

<template>
  <!-- Input with label -->
  <div class="grid gap-2">
    <Label for="email">Email</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
  </div>

  <!-- Textarea -->
  <div class="grid gap-2">
    <Label for="message">Message</Label>
    <Textarea id="message" placeholder="Type here..." />
  </div>
</template>
```

## File Input

Inputs handle file inputs with special styling:
```
file:border-0 file:bg-transparent file:text-sm file:font-heading
```

## Key Rules

1. **No shadow**: Unlike buttons/cards, inputs are flat
2. **3px border**: Consistent with other elements
3. **Ring focus**: 2px black ring with 2px offset
4. **Cursor states**: `text` for inputs, `not-allowed` when disabled
5. **Sharp corners**: `rounded-base` = 0px
6. **Placeholder opacity**: `text-foreground/50` (50% opacity)
7. **No custom selection**: Let browser handle text selection (avoids yellow-on-yellow invisibility)
