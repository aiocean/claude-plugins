# Card Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 3px solid #000;
--shadow: 4px 4px 0px 0px #000;
--radius: 0px;
```

## Base Classes

```
rounded-base flex flex-col shadow-shadow border-3 gap-6 py-6
border-border bg-background text-foreground font-base
```

## Static Card (Non-Interactive)

```vue
<Card class="p-6">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <!-- Content -->
  </CardContent>
</Card>
```

**No hover states** - static cards don't change on interaction.

## Clickable Card Pattern

```vue
<Card
  class="cursor-pointer transition-all duration-200
         hover:translate-x-[2px] hover:translate-y-[2px]
         hover:shadow-[2px_2px_0_#000]"
  @click="handleClick"
>
  <!-- Content -->
</Card>
```

**Interaction**: Shadow reduces, card "presses down" slightly.

## Card Subcomponents

### CardHeader
```
flex flex-col gap-1.5 px-6
```

### CardTitle
```
text-lg font-heading leading-none tracking-tight
```

### CardDescription
```
text-sm text-muted-foreground
```

### CardContent
```
px-6
```

### CardFooter
```
flex items-center px-6 pt-0
```

### CardAction (Custom)
For cards that trigger actions - provides visual click feedback.

## Vue Implementation

```vue
<script setup lang="ts">
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Book Title</CardTitle>
      <CardDescription>Author Name</CardDescription>
    </CardHeader>
    <CardContent>
      <p>Book summary or content preview...</p>
    </CardContent>
    <CardFooter>
      <Button>Read</Button>
    </CardFooter>
  </Card>
</template>
```

## Key Rules

1. **Static vs Interactive**: Only add hover states if card is clickable
2. **3px border**: Standard card border thickness
3. **Full shadow**: `shadow-shadow` = `4px 4px 0 #000`
4. **Vertical spacing**: `gap-6` between card sections
5. **Sharp corners**: `rounded-base` = 0px
6. **No gradients**: Solid `bg-background` only
