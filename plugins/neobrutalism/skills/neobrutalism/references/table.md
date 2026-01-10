# Table Reference

Distilled from epub-manager project implementation.

## Design Tokens

```css
--border: 3px solid #000;  /* Table wrapper */
--border-row: 2px solid #000;  /* Row borders */
```

## Table Wrapper

```
relative w-full overflow-auto
```

## Table Element

```
w-full caption-bottom text-sm border-3 border-border
```

## TableRow

```
border-b-2 border-border transition-colors
text-main-foreground bg-main font-base
data-[state=selected]:bg-secondary-background
data-[state=selected]:text-main-foreground
```

## TableHead (Header Cell)

```
h-12 px-4 text-left align-middle font-heading text-main-foreground
[&:has([role=checkbox])]:pr-0
```

## TableCell (Data Cell)

```
p-4 align-middle [&:has([role=checkbox])]:pr-0
```

## Vue Implementation

```vue
<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
</script>

<template>
  <Table>
    <TableCaption>List of books</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Title</TableHead>
        <TableHead>Author</TableHead>
        <TableHead class="text-right">Pages</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="book in books" :key="book.id">
        <TableCell class="font-medium">{{ book.title }}</TableCell>
        <TableCell>{{ book.author }}</TableCell>
        <TableCell class="text-right">{{ book.pages }}</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
```

## Selection State

When rows are selectable:
```
data-[state=selected]:bg-secondary-background
data-[state=selected]:text-main-foreground
```

## Key Rules

1. **3px outer border**: Table wrapper has thick border
2. **2px row borders**: Rows have thinner `border-b-2`
3. **No column borders**: Only horizontal dividers
4. **Header weight**: `font-heading` (800 weight)
5. **Consistent padding**: `p-4` for cells, `px-4` for headers
6. **Sharp corners**: No border-radius on table
7. **Checkbox accommodation**: `[&:has([role=checkbox])]:pr-0`
