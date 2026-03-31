# Alert Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 2px solid #000;  /* Note: thinner than cards */
--shadow: 4px 4px 0px 0px #000;
--radius: 0px;
```

## Base Classes

```
relative w-full rounded-base border-2 border-border px-4 py-3 text-sm
grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr]
has-[>svg]:gap-x-3 gap-y-0.5 items-start
[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current
shadow-shadow
```

## Variants

### Default
```
bg-main text-main-foreground
```

Use when: Information, success messages, general notifications.

### Destructive
```
bg-black text-white
```

Use when: Errors, warnings, critical alerts.

## Alert Subcomponents

### AlertTitle
```
col-start-2 mb-1 font-heading leading-none tracking-tight
```

### AlertDescription
```
col-start-2 text-sm [&_p]:leading-relaxed
```

## Vue Implementation

```vue
<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Info } from "lucide-vue-next";
</script>

<template>
  <!-- Info alert -->
  <Alert>
    <Info class="size-4" />
    <AlertTitle>Note</AlertTitle>
    <AlertDescription>
      This is an informational message.
    </AlertDescription>
  </Alert>

  <!-- Success alert -->
  <Alert>
    <CheckCircle class="size-4" />
    <AlertTitle>Success</AlertTitle>
    <AlertDescription>
      Your changes have been saved.
    </AlertDescription>
  </Alert>

  <!-- Error alert -->
  <Alert variant="destructive">
    <AlertCircle class="size-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      Something went wrong. Please try again.
    </AlertDescription>
  </Alert>
</template>
```

## Grid Layout

Alerts use CSS Grid for icon + content alignment:
- With icon: `grid-cols-[calc(var(--spacing)*4)_1fr]`
- Without icon: `grid-cols-[0_1fr]`

The `:has([>svg])` selector automatically adjusts.

## Key Rules

1. **Has shadow**: Unlike badges, alerts have the full shadow
2. **2px border**: Thinner than cards/dialogs (3px)
3. **Grid layout**: Icon aligns with title, description spans full width
4. **Sharp corners**: `rounded-base` = 0px
5. **Full width**: `w-full` by default
6. **Destructive is inverted**: Black background, white text
