# Dialog / Modal Components

Modal dialogs for user interactions, confirmations, and forms.

## Available Components

| Component | Purpose |
|-----------|---------|
| `Dialog` | Root wrapper, controls open state |
| `DialogContent` | Main container with neobrutalism styling |
| `DialogHeader` | Container for title and description |
| `DialogTitle` | Modal title |
| `DialogDescription` | Optional description text |
| `DialogFooter` | Action buttons container |
| `DialogClose` | Built-in close button (auto-included) |

## Standard Structure

```vue
<template>
  <Dialog :open="isOpen" @update:open="emit('update:isOpen', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Modal Title</DialogTitle>
        <DialogDescription>Optional description</DialogDescription>
      </DialogHeader>

      <!-- Content -->
      <div class="space-y-4 py-4">
        <!-- Form fields, content, etc. -->
      </div>

      <DialogFooter>
        <Button variant="neutral" @click="handleCancel">Cancel</Button>
        <Button @click="handleConfirm">Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

## Width Classes

Use these classes on `DialogContent` to set modal width:

| Width | Class | Use Case |
|-------|-------|----------|
| Small | `sm:max-w-[425px]` | Simple confirmations, login |
| Medium | `!w-[95vw] !max-w-[28rem]` | Forms with few fields |
| Large | `!w-[95vw] !max-w-[42rem]` | Forms with more content |
| XL | `!w-[95vw] !max-w-[48rem]` | Multi-section forms |
| 2XL | `!w-[95vw] !max-w-[56rem]` | Two-column layouts |
| Full | `!w-[95vw] !max-w-[72rem]` | Large editors, complex UIs |

## Examples

### Simple Confirmation Modal

```vue
<Dialog :open="isOpen" @update:open="emit('update:isOpen', $event)">
  <DialogContent class="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>

    <DialogFooter>
      <Button variant="neutral" @click="handleCancel">Cancel</Button>
      <Button @click="handleConfirm">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Modal

```vue
<Dialog :open="isOpen" @update:open="handleOpenChange">
  <DialogContent class="!w-[95vw] !max-w-[42rem]">
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
    </DialogHeader>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="name">Name</Label>
        <Input id="name" v-model="name" />
      </div>
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input id="email" v-model="email" type="email" />
      </div>
    </div>

    <DialogFooter>
      <Button variant="neutral" :disabled="loading" @click="handleCancel">
        Cancel
      </Button>
      <Button :disabled="loading" @click="handleSave">
        {{ loading ? 'Saving...' : 'Save' }}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Two-Column Layout Modal

```vue
<Dialog :open="isOpen" @update:open="emit('update:isOpen', $event)">
  <DialogContent class="!w-[95vw] !max-w-[56rem]">
    <DialogHeader>
      <DialogTitle>Select Option</DialogTitle>
    </DialogHeader>

    <div class="flex gap-6 min-h-[400px]">
      <!-- Left: Options list -->
      <div class="w-44 shrink-0 space-y-3 overflow-y-auto">
        <!-- Options -->
      </div>

      <!-- Right: Preview area -->
      <div class="flex-1 bg-muted/30 rounded-lg">
        <!-- Preview content -->
      </div>
    </div>
  </DialogContent>
</Dialog>
```

## Props Pattern

```typescript
interface Props {
  isOpen: boolean
  // ... other props
}

interface Emits {
  (e: 'update:isOpen', value: boolean): void
  // ... other emits
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function handleOpenChange(open: boolean) {
  emit('update:isOpen', open)
}
```

## Preventing Close During Operations

```vue
<DialogContent
  @escape-key-down="(e) => loading && e.preventDefault()"
  @pointer-down-outside="(e) => loading && e.preventDefault()"
>
```

## Loading States

```vue
<Button :disabled="loading" @click="handleSubmit">
  <span v-if="loading" class="inline-flex items-center gap-2">
    <span class="w-4 h-4 border-3 border-current border-t-transparent rounded-full animate-spin" />
    Processing...
  </span>
  <span v-else>Submit</span>
</Button>
```

## Don't

- Don't use `p-0 gap-0 overflow-hidden` on DialogContent
- Don't use custom `sm:rounded-xl` - default neobrutalism styling applies
- Don't add custom header borders - DialogHeader handles spacing
- Don't use `h-[85vh]` or fixed heights - let content determine height
- Don't nest excessive divs - keep structure flat

## Do

- Use standard DialogHeader, DialogFooter components
- Use width classes consistently across similar modals
- Handle loading states to prevent premature closing
- Reset form state when modal closes
- Use `space-y-4 py-4` for content padding
