# Toast Reference

Distilled from epub-manager project implementation using vue-sonner.

## Design Tokens

```css
--border: 2.5px solid #000;
--shadow: 4px 4px 0 #000;
--radius: 0px;
```

## Base Toast Styles

```css
[data-sonner-toast] {
  border: 2.5px solid #000 !important;
  border-radius: 0 !important;
  box-shadow: 4px 4px 0 #000 !important;
  background-color: #fff !important;
  color: #000 !important;
  padding: 16px !important;
  font-weight: 500 !important;
}
```

## Toast Variants

### Success
```css
[data-sonner-toast][data-type='success'] {
  border-color: #000 !important;
}
```

### Error
```css
[data-sonner-toast][data-type='error'] {
  border-color: #000 !important;
  background-color: #fee !important;  /* Light red */
}
```

### Warning
```css
[data-sonner-toast][data-type='warning'] {
  border-color: #000 !important;
  background-color: #ffc !important;  /* Light yellow */
}
```

## Toast Content

```css
[data-sonner-toast] [data-title] {
  color: #000 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}

[data-sonner-toast] [data-description] {
  color: #000 !important;
  font-size: 13px !important;
}

[data-sonner-toast] [data-icon] {
  color: #000 !important;
}
```

## Close Button (Neobrutalism Style)

```css
[data-sonner-toast] [data-close-button] {
  border: 2px solid #000 !important;
  border-radius: 0 !important;
  background-color: #fff !important;
  color: #000 !important;
  box-shadow: 2px 2px 0 #000 !important;
  transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1) !important;
}

[data-sonner-toast] [data-close-button]:hover {
  transform: translate(2px, 2px) !important;
  box-shadow: none !important;
  background-color: #000 !important;
  color: #fff !important;
}
```

## Vue Implementation

```vue
<!-- Sonner.vue component -->
<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import { Toaster as Sonner } from 'vue-sonner'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    class="toaster group"
    v-bind="props"
    :style="{
      '--normal-bg': '#fff',
      '--normal-text': '#000',
      '--normal-border': '#000',
      '--success-bg': '#fff',
      '--success-text': '#000',
      '--success-border': '#000',
      '--error-bg': '#fff',
      '--error-text': '#000',
      '--error-border': '#000',
    }"
  />
</template>
```

## Usage

```ts
import { toast } from 'vue-sonner'

// Success
toast.success('Book saved successfully')

// Error
toast.error('Failed to save changes')

// Warning
toast.warning('Large file detected')

// With description
toast('Title', {
  description: 'More details here'
})
```

## Key Rules

1. **Has shadow**: Full `4px 4px 0 #000` shadow
2. **2.5px border**: Slightly thinner than cards
3. **Sharp corners**: `border-radius: 0` (not using CSS variable)
4. **Close button animates**: Press-down pattern on hover
5. **No animations on mount/unmount**: Instant appearance for brutalist feel
6. **Black & white base**: Variants only change background slightly
