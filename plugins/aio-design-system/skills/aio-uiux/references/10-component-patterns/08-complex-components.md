# Complex Components

## What Makes a Component "Complex"

Complex components have significant internal state, non-trivial keyboard interaction models, accessibility requirements beyond simple ARIA roles, and behavior that varies across device types. They typically take 10–40 hours to implement correctly from scratch — which is why reaching for a well-tested library (Radix UI, Headless UI, Ariakit) is usually the right decision.

This reference covers design patterns, behavior expectations, and implementation considerations.

---

## Command Palette

A command palette is a keyboard-first search interface for navigating and executing actions across an application. Made popular by VS Code (Ctrl+K/Cmd+K).

### When to Use

- Apps with many features that don't all fit in navigation
- Power user tools where keyboard efficiency matters
- Any app where navigation depth exceeds 3 levels

### Interaction Model

```
Cmd+K → Palette opens (full-screen overlay or centered modal)

┌────────────────────────────────────────┐
│  🔍  Search commands...                │
├────────────────────────────────────────┤
│  Recent                                │
│  > New project                         │
│  > Open settings                       │
│  ─────────────────────────────────────│
│  Navigation                            │
│  > Dashboard                           │
│  > Analytics                     ⌘ 2  │
└────────────────────────────────────────┘
```

- Opens instantly (no animation delay) on keyboard shortcut
- Auto-focuses the input
- Shows recent/suggested items before typing
- Filters in real-time as user types (fuzzy search)
- Arrow keys navigate the list; Enter executes; Escape closes
- Items can show keyboard shortcut hints on the right

### Fuzzy Search Behavior

Match characters in sequence, not as a substring:
- "np" should match "New Project" (N...P)
- Highlight matched characters in the result label
- Sort by: recent usage > frequency > alphabetical

### Groups and Sections

Organize results into labeled sections: "Recent", "Navigation", "Actions", "Settings". Use dividers and section headers. Don't show empty sections.

### Accessibility

- `role="dialog"` on the overlay, `aria-modal="true"`
- `role="combobox"` on the input, `aria-expanded`, `aria-controls` pointing to the listbox
- `role="listbox"` on the results list, `role="option"` on items
- Focus trap within the palette while open
- `aria-activedescendant` tracks the highlighted item

---

## Autocomplete / Combobox

A text input that suggests completions as the user types, allowing selection from suggestions or free-form entry.

### Variants

**Autocomplete**: suggestions only, free text allowed if no match
**Select with search**: restricted to options in the list (no free text)
**Multi-select combobox**: select multiple items, displayed as chips in the input

### Interaction Model

```
User types "rea" →

[rea________________]
┌─────────────────────┐
│  React              │  ← highlighted
│  React Native       │
│  Reason             │
└─────────────────────┘
```

- Open dropdown on focus or first keystroke
- Filter options in real-time (debounce 100–150ms for remote fetch)
- Arrow keys navigate; Enter selects; Escape closes and clears/restores
- Click outside closes dropdown
- Show "No results" state, not empty dropdown

### Loading State for Async Options

```
[User typ...__________]
┌─────────────────────┐
│   ⟳ Loading...      │
└─────────────────────┘
```

Show spinner in dropdown while fetching. Don't show stale results while loading.

### Accessibility (ARIA 1.2 combobox pattern)

```html
<div role="combobox" aria-expanded="true" aria-haspopup="listbox">
  <input aria-autocomplete="list" aria-controls="suggestions" />
</div>
<ul id="suggestions" role="listbox">
  <li role="option" aria-selected="false">React</li>
</ul>
```

---

## Tree View

A hierarchical data structure displayed as an expandable/collapsible tree. Used for file systems, org charts, nested categories, and navigation.

### Visual Structure

```
▼ src/
  ▼ components/
    ▶ Button/
    ▶ Input/
    ► Modal/
  ► utils/
► public/
► package.json
```

- `▶` / `►`: collapsed node (has children)
- `▼`: expanded node
- No icon: leaf node (no children)
- Indent each level 16–20px
- Show connecting lines (optional) to make hierarchy legible

### Interaction Model

- Click on expand icon: toggle expand/collapse
- Click on node label: select the node
- Keyboard: Arrow Right (expand or move to first child), Arrow Left (collapse or move to parent), Arrow Up/Down (previous/next visible node), Enter (select)

### Selection Types

- **Single select**: one node at a time, common in file explorers
- **Multi-select**: Shift+Click for range, Ctrl/Cmd+Click for individual selection
- **Checkbox tree**: explicit checkboxes, indeterminate state for partially-selected parents

### Lazy Loading

For deep trees: load children only on expand. Show a spinner in the expanded node while loading. Cache loaded children to avoid re-fetching on re-expand.

### Accessibility

- `role="tree"` on container, `role="treeitem"` on each node, `role="group"` on child containers
- `aria-expanded="true/false"` on expandable items
- `aria-level`, `aria-setsize`, `aria-posinset` for screen reader navigation context

---

## Timeline Component

Displays events in chronological order.

### Vertical Timeline

```
2024-03        ●────  Order placed
               │
2024-03-15     ●────  Payment confirmed
               │
2024-03-18     ●────  Shipped
               │
2024-03-22     ○────  Estimated delivery  (pending)
```

- Solid line connects past events; dashed line for future/pending
- Filled dot for completed; hollow/outline dot for pending
- Timestamp on the left or above the event label
- Event detail (description, actor, metadata) below the label

### Horizontal Timeline

Used for roadmaps, project phases, milestones. Challenges: overflow on narrow screens. Solutions:
- Horizontal scroll on mobile
- Collapse to vertical at breakpoint
- Show fewer milestones at narrow widths with "Show all" toggle

---

## Calendar Component

Date picker extended with event display and navigation.

### Calendar Grid

```
      March 2025
Mo Tu We Th Fr Sa Su
                1  2
 3  4  5  6  7  8  9
10 11 12 [13]14 15 16  ← [13] = today
17 18 19 20 21 22 23
24 25 26 27 28 29 30
31
```

- Today highlighted with accent background
- Selected date: filled accent circle
- Date range selection: accent fill between start and end
- Events: dots or colored bands below date numbers

### Variants

- **Date picker**: single date selection for forms
- **Date range picker**: start and end date (two calendars side-by-side on desktop)
- **Month/week/day view**: full event calendar (Google Calendar style)

### Keyboard Navigation

- Arrow keys: move between days
- Page Up/Down: previous/next month
- Enter: select focused date
- Escape: close if in popover mode

### Accessibility

```html
<table role="grid" aria-labelledby="calendar-title">
  <caption id="calendar-title">March 2025</caption>
  <td role="gridcell" aria-selected="false" tabindex="-1">13</td>
</table>
```

---

## Kanban Board

A drag-and-drop board with columns representing workflow states.

### Structure

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Backlog  │  │   In     │  │   Done   │
│           │  │ Progress │  │          │
│  [Card]   │  │  [Card]  │  │  [Card]  │
│  [Card]   │  │          │  │  [Card]  │
│  [+ Add]  │  │  [+ Add] │  │  [+ Add] │
└──────────┘  └──────────┘  └──────────┘
```

- Column header with name and card count
- Cards are draggable between columns
- "Add card" at bottom of each column
- Column actions: rename, add, delete (via overflow menu)

### Card Design

- Title (required)
- Assignee avatar
- Due date (color-coded: red if overdue)
- Label/tag chips
- Comment count, attachment count
- Drag handle on hover

See `08-interaction-design/07-drag-drop-gestures.md` for full drag-drop implementation patterns.

---

## Virtualized Lists

For lists with thousands of items, render only visible rows plus a small buffer.

### Core Concept

```
Total items: 10,000
Viewport shows: 10 items
Buffer: 5 items above + below
DOM nodes rendered: ~20 (not 10,000)
```

The scroll container maintains its full height (using a spacer element). Only items within the visible range plus buffer are rendered.

### Implementation

```jsx
// @tanstack/react-virtual
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // row height in px
  overscan: 5,            // items to render beyond viewport
})
```

### Variable Height Rows

More complex — requires measuring each row after render and caching heights. Use `measureElement` with `@tanstack/react-virtual` or `react-window`'s `VariableSizeList`.

### Pitfalls

- **Keyboard navigation**: Tab order skips offscreen items — provide explicit keyboard navigation
- **Ctrl+F**: browser find won't locate unrendered content — provide in-list search
- **Scroll restoration**: save and restore scroll offset on navigation
- **Accessibility**: screen readers struggle with virtual lists — announce item count and current position via live regions

---

## Quick Reference

| Component | Key Library | Core Complexity |
|---|---|---|
| Command palette | cmdk, kbar | Fuzzy search, keyboard nav, ARIA combobox |
| Autocomplete | Radix Combobox, Downshift | ARIA combobox pattern, async loading |
| Tree view | Ariakit, react-arborist | Recursive structure, keyboard nav, lazy load |
| Timeline | Custom (simple) | Visual design, pending states |
| Calendar | react-day-picker, @internationalized/date | Grid keyboard nav, range selection, i18n |
| Kanban | @dnd-kit | Drag-drop, column targeting, optimistic updates |
| Virtualized list | @tanstack/react-virtual | Row measurement, scroll restoration, a11y |

**General rule**: Never build these from scratch in production. Use a headless component library (Radix UI, Ariakit, Headless UI) for behavior and accessibility; own the styling layer.
