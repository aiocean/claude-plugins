# Checkbox & Switch Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 2px solid #000;  /* Outline style */
--radius: 0px;
```

## Checkbox Classes

```
peer size-4 shrink-0 outline-2 outline-border ring-offset-white
focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
data-[state=checked]:bg-main data-[state=checked]:text-white
```

## Checkbox Indicator

```
flex items-center justify-center text-current
```

Check icon: `size-4 text-main-foreground`

## Vue Implementation - Checkbox

```vue
<script setup lang="ts">
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
</script>

<template>
  <div class="flex items-center gap-2">
    <Checkbox id="terms" v-model:checked="accepted" />
    <Label for="terms">Accept terms and conditions</Label>
  </div>
</template>
```

## Checkbox Group Pattern

```vue
<template>
  <div class="grid gap-3">
    <div class="flex items-center gap-2" v-for="option in options" :key="option.id">
      <Checkbox
        :id="option.id"
        :checked="selected.includes(option.id)"
        @update:checked="toggleOption(option.id)"
      />
      <Label :for="option.id">{{ option.label }}</Label>
    </div>
  </div>
</template>
```

## Switch (Alternative)

Switches follow similar patterns but with a sliding thumb indicator.

## States

### Unchecked
```
outline-2 outline-border bg-transparent
```

### Checked
```
data-[state=checked]:bg-main data-[state=checked]:text-white
```

### Disabled
```
disabled:cursor-not-allowed disabled:opacity-50
```

### Focus
```
focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
```

## Key Rules

1. **No shadow**: Checkboxes stay flat
2. **Outline style**: Uses `outline-2` instead of `border`
3. **Small size**: `size-4` (16px)
4. **Sharp corners**: No border-radius
5. **Checked state inverted**: `bg-main` with white check
6. **Peer class**: For styling adjacent labels
