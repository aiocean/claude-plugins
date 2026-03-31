# ToggleButton V-Model Fix

## Problem

After migrating to `ToggleButton`, the toggle states couldn't be updated when clicking the buttons.

## Root Cause

The issue was caused by trying to use `v-model` with **readonly computed properties** that didn't have setters.

### Readonly Computed Properties

1. **Auto-translate toggles:**
   ```typescript
   // From useTranslationModes composable (lines 17-18)
   const autoTranslateAllEnabled = computed(() => isAutoTranslateAllEnabled.value)
   const onSelectEnabled = computed(() => isOnSelectEnabled.value)
   ```
   These are readonly - they only have a getter, no setter.

2. **Context include toggles:**
   ```typescript
   const includeAbove = computed(() => bookSettings.settings.value.includeAbove)
   const includeBelow = computed(() => bookSettings.settings.value.includeBelow)
   const includeTranslation = computed(() => bookSettings.settings.value.includeTranslation)
   ```
   Also readonly - no setters.

3. **Style preset toggles:**
   Used `:model-value` with a computed expression and `.value` accessor, which prevented proper binding.

## Solution

Created **writable computed refs** with both getters and setters for all toggle v-models.

### 1. Auto-Translate Toggles

**Before (broken):**
```typescript
const { autoTranslateAllEnabled, onSelectEnabled } = useTranslationModes()
```

**After (working):**
```typescript
const translationModes = useTranslationModes()

const autoTranslateAllEnabled = computed({
  get: () => translationModes.autoTranslateAllEnabled.value,
  set: (value: boolean) => {
    translationModes.setAutoTranslateAll(value)
  },
})

const onSelectEnabled = computed({
  get: () => translationModes.onSelectEnabled.value,
  set: (value: boolean) => {
    translationModes.setOnSelect(value)
  },
})
```

**Why this works:**
- Uses the composable's `setAutoTranslateAll()` and `setOnSelect()` functions
- These functions emit events that other parts of the app depend on
- Maintains proper event-driven architecture

---

### 2. Context Include Toggles

**Before (broken):**
```typescript
const includeAbove = computed(() => bookSettings.settings.value.includeAbove)
const includeBelow = computed(() => bookSettings.settings.value.includeBelow)
const includeTranslation = computed(() => bookSettings.settings.value.includeTranslation)
```

**After (working):**
```typescript
const includeAbove = computed({
  get: () => bookSettings.settings.value.includeAbove,
  set: (value: boolean) => {
    bookSettings.settings.value.includeAbove = value
  },
})

const includeBelow = computed({
  get: () => bookSettings.settings.value.includeBelow,
  set: (value: boolean) => {
    bookSettings.settings.value.includeBelow = value
  },
})

const includeTranslation = computed({
  get: () => bookSettings.settings.value.includeTranslation,
  set: (value: boolean) => {
    bookSettings.settings.value.includeTranslation = value
  },
})
```

**Why this works:**
- Directly updates the underlying reactive settings object
- The `@update:model-value` handler still calls `saveSettings()` to persist
- Two-way binding works correctly

---

### 3. Style Preset Toggles

**Before (broken):**
```vue
<ToggleButton
  v-model="createPresetModel(p.key).value"
  ...
>
```

**After (working):**
```vue
<ToggleButton
  :model-value="selectedPresets.includes(p.key)"
  @update:model-value="(value: boolean) => {
    if (value) {
      if (!selectedPresets.includes(p.key)) {
        selectedPresets.push(p.key)
      }
    } else {
      const index = selectedPresets.indexOf(p.key)
      if (index >= 0) {
        selectedPresets.splice(index, 1)
      }
    }
  }"
  ...
>
```

**Why this works:**
- Uses explicit `:model-value` binding instead of `v-model`
- Inline handler directly modifies the `selectedPresets` array
- Simpler and more straightforward than creating computed refs for each preset
- Avoids creating new computed refs on every render

---

## Key Learnings

### 1. V-Model Requires Writable Values

When using `v-model` on a component, Vue needs to be able to:
- **Read** the current value (getter)
- **Write** the new value when the component emits `update:modelValue` (setter)

If you only have a getter (readonly computed), the write operation fails silently.

### 2. Computed Refs with Get/Set

The pattern for writable computed properties:
```typescript
const myToggle = computed({
  get: () => /* return current value */,
  set: (value) => { /* update the underlying data */ }
})
```

This creates a computed ref that can be used with `v-model`.

### 3. Alternative: Explicit Binding

For complex cases (like multi-select), you can use:
```vue
:model-value="expression"
@update:model-value="handler"
```

This is equivalent to `v-model` but gives you more control.

### 4. Composable Integration

When using composables that provide readonly state:
- Don't destructure directly if you need writable refs
- Create writable computed refs that use the composable's setter functions
- This preserves event emission and side effects from the composable

---

## Testing Checklist

✅ All toggles now update their state when clicked:
- [x] Auto-translate All toggle
- [x] On Select toggle
- [x] Include Above toggle
- [x] Include Below toggle
- [x] Include Translation toggle
- [x] Style preset toggles (multi-select)

✅ Settings persist correctly:
- [x] Context include settings save to server
- [x] Translation modes emit proper events
- [x] Style presets maintain array state

✅ UI feedback works:
- [x] Indicator dots appear/disappear
- [x] Background colors change (yellow when active)
- [x] Hover effects work
- [x] Keyboard navigation works

---

## Files Modified

- `webapp/src/translation/components/TranslationSidebar.vue`
  - Added writable computed refs for auto-translate toggles
  - Added writable computed refs for context include toggles
  - Changed style preset toggles to use explicit binding
  - Removed unused `createPresetModel()` function

---

**Fix Date:** 2025-10-18
**Status:** ✅ Complete and Tested
