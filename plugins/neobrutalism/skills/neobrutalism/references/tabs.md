# Tabs Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 3px solid #000;
--radius: 0px;
```

## TabsList (Container)

```
inline-flex h-12 items-center justify-center
rounded-base border-3 border-border bg-background p-1 text-foreground
```

## TabsTrigger (Individual Tab)

```
inline-flex items-center justify-center whitespace-nowrap
rounded-base border-3 border-transparent px-2 py-1 gap-1.5
text-sm font-heading ring-offset-white transition-all
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:pointer-events-none disabled:opacity-50
data-[state=active]:bg-main data-[state=active]:text-main-foreground data-[state=active]:border-border
```

## State Classes

### Inactive Tab
```
border-transparent bg-transparent text-foreground
```

### Active Tab
```
data-[state=active]:bg-main
data-[state=active]:text-main-foreground
data-[state=active]:border-border
```

## Vue Implementation

```vue
<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
</script>

<template>
  <Tabs default-value="overview" class="w-full">
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="details">Details</TabsTrigger>
      <TabsTrigger value="settings">Settings</TabsTrigger>
    </TabsList>
    <TabsContent value="overview">
      <p>Overview content...</p>
    </TabsContent>
    <TabsContent value="details">
      <p>Details content...</p>
    </TabsContent>
    <TabsContent value="settings">
      <p>Settings content...</p>
    </TabsContent>
  </Tabs>
</template>
```

## With Icons

```vue
<TabsTrigger value="books">
  <BookOpen class="size-4" />
  Books
</TabsTrigger>
```

Icons sized at `size-4` with `gap-1.5` spacing.

## Key Rules

1. **Container has border**: TabsList has full `border-3`
2. **Inactive tabs transparent**: Only active tab shows border + background
3. **Active tab highlighted**: Uses `--main` color (vibrant yellow)
4. **Sharp corners**: `rounded-base` = 0px
5. **Heading font**: `font-heading` (800 weight) for tab text
6. **Transition on all**: Smooth state changes
