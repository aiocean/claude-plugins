# Migration Guide: From Manual Toggle to ToggleButton Component

This guide shows how to migrate existing manual toggle button implementations to use the new `ToggleButton` component.

## Before: Manual Implementation

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'

const autoTranslateAllEnabled = ref(false)

function handleToggleTranslateAll() {
  autoTranslateAllEnabled.value = !autoTranslateAllEnabled.value
}
</script>

<template>
  <Button
    variant="neutral"
    size="sm"
    class="relative sketchy-wiggle"
    :class="
      autoTranslateAllEnabled
        ? 'bg-main text-foreground shadow-none'
        : 'bg-secondary shadow-shadow hover:bg-main/10'
    "
    @click="handleToggleTranslateAll"
  >
    <!-- Active indicator -->
    <div
      v-if="autoTranslateAllEnabled"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground border-2 border-background"
    />

    <span class="text-xs font-medium">Translate All</span>
  </Button>
</template>
```

## After: Using ToggleButton Component

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ToggleButton } from '@/components/ui/toggle-button'

const autoTranslateAllEnabled = ref(false)
</script>

<template>
  <ToggleButton
    v-model="autoTranslateAllEnabled"
    :show-indicator="true"
  >
    <span class="text-xs font-medium">Translate All</span>
  </ToggleButton>
</template>
```

## Benefits of Migration

### 1. Less Code
- **Before**: ~30 lines of template + script
- **After**: ~3 lines of template

### 2. Consistency
- All toggles across the app follow the same pattern
- Design system changes update all toggles automatically

### 3. Better Accessibility
- Built-in ARIA attributes
- Keyboard support (Enter/Space)
- Proper role="switch"

### 4. Easier Maintenance
- No need to remember class combinations
- Centralized component for bug fixes
- TypeScript type safety

## Migration Checklist

When migrating an existing toggle:

- [ ] Import `ToggleButton` instead of `Button`
- [ ] Replace `Button` with `ToggleButton`
- [ ] Convert state variable to use `v-model` instead of manual event handlers
- [ ] Remove manual click handlers
- [ ] Remove manual class bindings for toggle states
- [ ] Add `show-indicator` prop if the old implementation had an indicator dot
- [ ] Remove manual indicator dot markup
- [ ] Add `aria-label` if the toggle needs better screen reader support
- [ ] Test keyboard navigation (Tab, Enter, Space)

## Common Patterns

### Pattern 1: Simple Boolean Toggle

**Before:**
```vue
<Button
  :class="isEnabled ? 'bg-main shadow-none' : 'bg-secondary shadow-shadow'"
  @click="isEnabled = !isEnabled"
>
  Toggle
</Button>
```

**After:**
```vue
<ToggleButton v-model="isEnabled">
  Toggle
</ToggleButton>
```

### Pattern 2: Toggle with Handler Function

**Before:**
```vue
<Button
  :class="/* ... */"
  @click="handleToggle"
>
  Toggle
</Button>

<script>
function handleToggle() {
  isEnabled.value = !isEnabled.value
  // Additional logic here
}
</script>
```

**After:**
```vue
<ToggleButton v-model="isEnabled" @update:model-value="onToggleChange">
  Toggle
</ToggleButton>

<script>
function onToggleChange(newValue: boolean) {
  // Additional logic here
  console.log('Toggle changed to:', newValue)
}
</script>
```

### Pattern 3: Multiple Toggles in a Group

**Before:**
```vue
<div class="flex gap-2">
  <Button
    class="flex-1"
    :class="option1 ? 'bg-main shadow-none' : 'bg-secondary shadow-shadow'"
    @click="option1 = !option1"
  >
    Option 1
  </Button>

  <Button
    class="flex-1"
    :class="option2 ? 'bg-main shadow-none' : 'bg-secondary shadow-shadow'"
    @click="option2 = !option2"
  >
    Option 2
  </Button>
</div>
```

**After:**
```vue
<div class="flex gap-2">
  <ToggleButton v-model="option1" class="flex-1">
    Option 1
  </ToggleButton>

  <ToggleButton v-model="option2" class="flex-1">
    Option 2
  </ToggleButton>
</div>
```

## Testing After Migration

After migrating, verify:

1. **Visual States**: Both active and inactive states look correct
2. **Click Behavior**: Clicking toggles the state
3. **Keyboard**: Tab to focus, Enter/Space to toggle
4. **Screen Readers**: Proper announcements (test with VoiceOver/NVDA)
5. **Hover Effects**: `sketchy-wiggle` animation works
6. **Disabled State**: If using `:disabled`, button is not interactive

## Need Help?

See the [ToggleButton README](./README.md) for complete documentation and examples.
