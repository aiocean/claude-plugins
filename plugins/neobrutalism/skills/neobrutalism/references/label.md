# Label & Typography Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--font-weight-base: 500;
--font-weight-heading: 800;
--font-sans: 'Public Sans', ui-sans-serif, system-ui, sans-serif;
--font-title: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
```

## Label Classes

```
text-sm font-heading leading-none
peer-disabled:cursor-not-allowed peer-disabled:opacity-70
```

## Typography Hierarchy

### Headings (h1-h6)
```css
font-family: var(--font-title);  /* Bricolage Grotesque */
font-weight: var(--font-weight-heading);  /* 800 */
```

### Body Text
```css
font-family: var(--font-sans);  /* Public Sans */
font-weight: var(--font-weight-base);  /* 500 */
```

## Tailwind Font Classes

```
font-base     /* 500 weight - body text */
font-heading  /* 800 weight - headings, labels, emphasis */
```

## Vue Implementation

```vue
<script setup lang="ts">
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
</script>

<template>
  <div class="grid gap-2">
    <Label for="email">Email address</Label>
    <Input id="email" type="email" />
  </div>
</template>
```

## Form Field Pattern

```vue
<template>
  <div class="grid gap-4">
    <!-- Text field -->
    <div class="grid gap-2">
      <Label for="name">Name</Label>
      <Input id="name" />
    </div>

    <!-- Checkbox field -->
    <div class="flex items-center gap-2">
      <Checkbox id="newsletter" />
      <Label for="newsletter">Subscribe to newsletter</Label>
    </div>
  </div>
</template>
```

## Sketchy Typography Utilities

From base.css - decorative text effects:

### Sketchy Underline
```css
.sketchy-underline {
  position: relative;
}
.sketchy-underline::after {
  /* SVG hand-drawn underline */
}
```

### Sketchy Highlight
```css
.sketchy-highlight {
  position: relative;
  z-index: 1;
}
.sketchy-highlight::before {
  background-color: var(--main);
  opacity: 0.3;
  transform: rotate(-1deg);
}
```

## Key Rules

1. **Labels use heading font**: `font-heading` (800 weight)
2. **Small size**: `text-sm` for form labels
3. **No wrap**: `leading-none` keeps labels tight
4. **Peer integration**: Reacts to input disabled state
5. **Sharp font**: Grotesque/geometric sans-serif
6. **No decorative fonts**: Keep it readable
