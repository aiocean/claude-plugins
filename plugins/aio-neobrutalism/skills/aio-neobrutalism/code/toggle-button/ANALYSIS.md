# Toggle Pattern Analysis & Migration Opportunities

## Files Analyzed
- `webapp/src/shared/components/ModelSelectorDialog.vue`
- `webapp/src/translation/components/TranslationSidebar.vue`

---

## TranslationSidebar.vue - Migration Opportunities

### 🎯 Opportunity 1: Auto Translation Mode Toggles (Lines 989-1024)

**Current Implementation:**
```vue
<div class="flex gap-2 p-4">
  <Button
    variant="neutral"
    size="sm"
    class="flex-1 relative sketchy-wiggle"
    :class="
      autoTranslateAllEnabled
        ? 'bg-main text-foreground shadow-none'
        : 'bg-secondary shadow-shadow hover:bg-main/10'
    "
    @click="handleToggleTranslateAll"
  >
    <div
      v-if="autoTranslateAllEnabled"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground border-2 border-background"
    />
    <span class="text-xs font-medium">Translate All</span>
  </Button>

  <Button
    variant="neutral"
    size="sm"
    class="flex-1 relative sketchy-wiggle"
    :class="
      onSelectEnabled
        ? 'bg-main text-foreground shadow-none'
        : 'bg-secondary shadow-shadow hover:bg-main/10'
    "
    @click="handleToggleOnSelect"
  >
    <div
      v-if="onSelectEnabled"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground border-2 border-background"
    />
    <span class="text-xs font-medium">On Select</span>
  </Button>
</div>
```

**Challenge:**
- Uses handler functions (`handleToggleTranslateAll`, `handleToggleOnSelect`) instead of direct v-model
- These functions call composable methods that may have side effects

**Current Handler Functions (Lines 782-788):**
```typescript
function handleToggleTranslateAll() {
  toggleAutoTranslateAll()
}

function handleToggleOnSelect() {
  toggleOnSelect()
}
```

**Solution:** Refactor to use v-model with watcher for side effects

**Proposed Migration:**
```vue
<script setup lang="ts">
import { ToggleButton } from '@/components/ui/toggle-button'

// Watch for changes and trigger side effects if needed
watch(autoTranslateAllEnabled, (newValue) => {
  // Any side effects when toggling
  // Currently toggleAutoTranslateAll() just toggles the ref
})

watch(onSelectEnabled, (newValue) => {
  // Any side effects when toggling
  // Currently toggleOnSelect() just toggles the ref
})
</script>

<template>
  <div class="flex gap-2 p-4">
    <ToggleButton
      v-model="autoTranslateAllEnabled"
      :show-indicator="true"
      class="flex-1"
      aria-label="Auto-translate all content"
    >
      <span class="text-xs font-medium">Translate All</span>
    </ToggleButton>

    <ToggleButton
      v-model="onSelectEnabled"
      :show-indicator="true"
      class="flex-1"
      aria-label="Translate on content selection"
    >
      <span class="text-xs font-medium">On Select</span>
    </ToggleButton>
  </div>
</template>
```

**Simplification:**
Since the handler functions just call the composable toggle methods, we can likely remove the handlers entirely and use v-model directly.

**Lines Saved:** ~35 lines of template code
**Complexity Reduced:** Eliminates manual class bindings, indicator positioning

---

### 🎯 Opportunity 2: Context Include Toggles (Lines 1192-1273)

**Current Implementation:**
```vue
<!-- Include Above Button -->
<Tooltip>
  <TooltipTrigger as-child>
    <Button
      variant="neutral"
      size="sm"
      class="w-full h-auto text-xs px-2 py-1.5 relative text-left justify-start min-h-[2.25rem] sketchy-wiggle"
      :class="
        includeAbove
          ? 'bg-main text-foreground shadow-none'
          : 'bg-secondary shadow-shadow hover:bg-main/10'
      "
      @click="handleIncludeAboveChange"
    >
      <!-- Selected indicator -->
      <div
        v-if="includeAbove"
        class="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-foreground"
      />
      Above
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    Include the paragraph above the selected text as context for translation
  </TooltipContent>
</Tooltip>

<!-- Similar for Below and Translation -->
```

**Challenge:**
- Handlers are async and save settings to the server
- Uses tooltips for descriptions
- Smaller indicator dots (1.5px instead of 2px)
- Custom class overrides for text alignment

**Current Handler Functions (Lines 654-667):**
```typescript
async function handleIncludeAboveChange() {
  bookSettings.settings.value.includeAbove = !bookSettings.settings.value.includeAbove
  await bookSettings.saveSettings()
}

async function handleIncludeBelowChange() {
  bookSettings.settings.value.includeBelow = !bookSettings.settings.value.includeBelow
  await bookSettings.saveSettings()
}

async function handleIncludeTranslationChange() {
  bookSettings.settings.value.includeTranslation = !bookSettings.settings.value.includeTranslation
  await bookSettings.saveSettings()
}
```

**Solution:** Use v-model with @update:model-value for async save

**Proposed Migration:**
```vue
<script setup lang="ts">
import { ToggleButton } from '@/components/ui/toggle-button'

async function handleIncludeAboveChange(newValue: boolean) {
  await bookSettings.saveSettings()
}

async function handleIncludeBelowChange(newValue: boolean) {
  await bookSettings.saveSettings()
}

async function handleIncludeTranslationChange(newValue: boolean) {
  await bookSettings.saveSettings()
}
</script>

<template>
  <TooltipProvider>
    <div class="grid grid-cols-3 gap-1">
      <!-- Include Above -->
      <Tooltip>
        <TooltipTrigger as-child>
          <ToggleButton
            v-model="includeAbove"
            :show-indicator="true"
            class="w-full h-auto text-xs px-2 py-1.5 text-left justify-start min-h-[2.25rem]"
            aria-label="Include above paragraph"
            @update:model-value="handleIncludeAboveChange"
          >
            Above
          </ToggleButton>
        </TooltipTrigger>
        <TooltipContent>
          Include the paragraph above the selected text as context for translation
        </TooltipContent>
      </Tooltip>

      <!-- Include Below -->
      <Tooltip>
        <TooltipTrigger as-child>
          <ToggleButton
            v-model="includeBelow"
            :show-indicator="true"
            class="w-full h-auto text-xs px-2 py-1.5 text-left justify-start min-h-[2.25rem]"
            aria-label="Include below paragraph"
            @update:model-value="handleIncludeBelowChange"
          >
            Below
          </ToggleButton>
        </TooltipTrigger>
        <TooltipContent>
          Include the paragraph below the selected text as context for translation
        </TooltipContent>
      </Tooltip>

      <!-- Include Translation -->
      <Tooltip>
        <TooltipTrigger as-child>
          <ToggleButton
            v-model="includeTranslation"
            :show-indicator="true"
            class="w-full h-auto text-xs px-2 py-1.5 text-left justify-start min-h-[2.25rem]"
            aria-label="Include translation context"
            @update:model-value="handleIncludeTranslationChange"
          >
            Translation
          </ToggleButton>
        </TooltipTrigger>
        <TooltipContent>
          Include existing translations of nearby paragraphs as context for better consistency
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</template>
```

**Note:** The indicator dot size difference (1.5px vs 2px) is a minor visual detail. We can either:
1. Accept the slightly larger dots from ToggleButton (consistent design)
2. Override with custom CSS if the smaller size is critical
3. Add a size prop to ToggleButton for indicator customization

**Lines Saved:** ~60 lines of template code
**Complexity Reduced:** Eliminates manual class bindings, indicator positioning

---

### 🎯 Opportunity 3: Style Preset Toggles (Lines 1289-1310)

**Current Implementation:**
```vue
<div class="grid grid-cols-3 gap-1 mt-2">
  <div v-for="p in allPresets" :key="p.key" class="relative">
    <Button
      variant="neutral"
      size="sm"
      class="w-full h-auto text-xs px-2 py-1.5 relative text-left justify-start min-h-[2.25rem] sketchy-wiggle"
      :class="
        selectedPresets.includes(p.key)
          ? 'bg-main text-foreground shadow-none'
          : 'bg-secondary shadow-shadow hover:bg-main/10'
      "
      :title="p.instruction"
      @click="togglePreset(p.key)"
    >
      <div
        v-if="selectedPresets.includes(p.key)"
        class="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-foreground"
      />
      {{ p.label }}
    </Button>
  </div>
</div>
```

**Challenge:**
- Multi-select pattern (array of selected presets, not boolean)
- Click handler toggles items in array

**Current Handler Function (Lines 197-205):**
```typescript
function togglePreset(key: string) {
  const index = selectedPresets.value.indexOf(key)
  if (index >= 0) {
    selectedPresets.value.splice(index, 1)
  }
  else {
    selectedPresets.value.push(key)
  }
}
```

**Problem:** ToggleButton currently only supports boolean v-model, not computed boolean from array membership.

**Solution Options:**

**Option A: Use computed boolean for each preset**
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { ToggleButton } from '@/components/ui/toggle-button'

function createPresetModel(key: string) {
  return computed({
    get: () => selectedPresets.value.includes(key),
    set: (value: boolean) => {
      if (value) {
        if (!selectedPresets.value.includes(key)) {
          selectedPresets.value.push(key)
        }
      } else {
        const index = selectedPresets.value.indexOf(key)
        if (index >= 0) {
          selectedPresets.value.splice(index, 1)
        }
      }
    }
  })
}
</script>

<template>
  <div class="grid grid-cols-3 gap-1 mt-2">
    <ToggleButton
      v-for="p in allPresets"
      :key="p.key"
      v-model="createPresetModel(p.key).value"
      :show-indicator="true"
      class="w-full h-auto text-xs px-2 py-1.5 text-left justify-start min-h-[2.25rem]"
      :title="p.instruction"
    >
      {{ p.label }}
    </ToggleButton>
  </div>
</template>
```

**Option B: Keep current pattern (NOT recommended for this case)**
The multi-select pattern is complex enough that using ToggleButton might not provide much benefit here. The current implementation is clear and straightforward.

**Recommendation:** Keep the current implementation for style presets. The pattern is sufficiently different from simple boolean toggles that forcing it into ToggleButton would add complexity rather than reduce it.

---

## ModelSelectorDialog.vue - Analysis

### Lines 84-100: Model Selection Buttons

**Current Implementation:**
```vue
<Button
  variant="neutral"
  size="sm"
  class="h-auto flex flex-col items-center justify-center p-3 text-center w-full sketchy-wiggle"
  :class="[
    selectedModelId === model.id
      ? 'bg-main text-foreground shadow-none'
      : 'bg-secondary shadow-shadow hover:bg-main/10',
  ]"
  @click="emit('selectModel', model.id)"
>
  <div class="font-medium text-xs leading-tight break-words w-full line-clamp-2" :title="model.name">
    {{ model.name }}
  </div>
</Button>
```

**Pattern Type:** Radio button group (select one from many), not toggle

**Recommendation:** **DO NOT migrate to ToggleButton**

**Reasoning:**
1. This is a radio button pattern, not a toggle pattern
2. Selecting one item doesn't toggle its own state - it sets global state
3. The semantic meaning is "select this model" not "enable/disable this feature"
4. The UI pattern is correct as-is for radio button groups
5. ToggleButton is designed for independent on/off states, not mutually exclusive selections

**Alternative:** If we wanted a specialized component, we'd create a `RadioButton` or `SelectButton` component, not use ToggleButton.

---

## Summary

### ✅ Recommended Migrations

| Location | Component | Lines Saved | Complexity Reduced |
|----------|-----------|-------------|-------------------|
| TranslationSidebar.vue (989-1024) | Auto-translate toggles | ~35 | High - eliminates manual class bindings |
| TranslationSidebar.vue (1192-1273) | Context include toggles | ~60 | High - eliminates manual class bindings |

**Total:** ~95 lines of template code removed, significant complexity reduction

### ❌ Not Recommended

| Location | Component | Reason |
|----------|-----------|--------|
| TranslationSidebar.vue (1289-1310) | Style presets | Multi-select pattern doesn't fit boolean toggle model |
| ModelSelectorDialog.vue (84-100) | Model selection | Radio button pattern, not toggle pattern |

---

## Next Steps

1. ✅ Migrate the two main toggle groups in TranslationSidebar.vue
2. ⚠️ Consider adding indicator size customization to ToggleButton (optional)
3. ⚠️ Test async handlers with @update:model-value pattern
4. ✅ Remove now-unused handler functions after migration

---

## Additional Improvements

### Potential ToggleButton Enhancement

To better support the "include context" use case, we could add an indicator size prop:

```typescript
interface Props {
  // ... existing props
  indicatorSize?: 'sm' | 'md' // sm = 1.5px, md = 2px (default)
}
```

This would allow:
```vue
<ToggleButton
  v-model="includeAbove"
  :show-indicator="true"
  indicator-size="sm"
>
  Above
</ToggleButton>
```

But this is optional - the current 2px indicator works well and maintains consistency.
