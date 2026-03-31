# ToggleButton Component

A reusable toggle button component following the neobrutalism design system.

## Features

- ✅ Full neobrutalism styling with shadows and bold states
- ✅ V-model support for two-way binding
- ✅ Optional indicator dot
- ✅ Keyboard accessible (Enter and Space)
- ✅ ARIA attributes for screen readers
- ✅ Playful `sketchy-wiggle` hover animation
- ✅ Disabled state support

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ToggleButton } from '@/components/ui/toggle-button'

const isEnabled = ref(false)
</script>

<template>
  <ToggleButton v-model="isEnabled">
    <span class="text-xs font-medium">Enable Feature</span>
  </ToggleButton>
</template>
```

## With Indicator Dot

```vue
<template>
  <ToggleButton
    v-model="autoTranslateAllEnabled"
    :show-indicator="true"
  >
    <span class="text-xs font-medium">Translate All</span>
  </ToggleButton>
</template>
```

## With Accessibility Label

```vue
<template>
  <ToggleButton
    v-model="darkModeEnabled"
    aria-label="Dark mode toggle"
  >
    <span class="text-xs font-medium">Dark Mode</span>
  </ToggleButton>
</template>
```

## Toggle Group

```vue
<template>
  <div class="flex gap-2 p-4">
    <ToggleButton
      v-model="option1Enabled"
      :show-indicator="true"
      class="flex-1"
    >
      <span class="text-xs font-medium">Option 1</span>
    </ToggleButton>

    <ToggleButton
      v-model="option2Enabled"
      :show-indicator="true"
      class="flex-1"
    >
      <span class="text-xs font-medium">Option 2</span>
    </ToggleButton>
  </div>
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | The toggle state (use with v-model) |
| `showIndicator` | `boolean` | `false` | Show indicator dot when active |
| `class` | `string` | `undefined` | Additional CSS classes |
| `ariaLabel` | `string` | `undefined` | Accessible label for screen readers |
| `disabled` | `boolean` | `false` | Disable the toggle button |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `boolean` | Emitted when toggle state changes |

## Styling

The component automatically applies neobrutalism styling:

- **Active State**: Yellow background (`bg-main`), no shadow (pressed appearance)
- **Inactive State**: Off-white background (`bg-secondary`), with shadow
- **Hover**: Light yellow tint on inactive state (`hover:bg-main/10`)
- **Animation**: Playful wiggle on hover (`sketchy-wiggle`)

## Accessibility

- Proper ARIA role (`switch`)
- Dynamic `aria-checked` attribute
- Keyboard support (Enter and Space keys)
- Optional accessible label via `aria-label` prop
- Focus visible states from Button component

## Design Rationale

See [Toggle UI Guide](../../../docs/toggle-ui.md) for complete design principles and rationale.
