# Tables & Data Display

## Table Design Fundamentals

Tables communicate structured relationships between data points. Good table design prioritizes scanability, comparability, and actionability.

### Anatomy of a Table

```
┌──────────────────────────────────────────────────────────┐
│  Name ↑        Status      Revenue      Actions          │  ← Header row
├──────────────────────────────────────────────────────────┤
│  Acme Corp     Active       $12,400     [Edit] [Delete]  │  ← Data row
│  Beta LLC      Pending       $8,200     [Edit] [Delete]  │
│  Gamma Inc     Inactive      $3,100     [Edit] [Delete]  │
├──────────────────────────────────────────────────────────┤
│  Page 1 of 12     [< Prev]  [1][2][3]  [Next >]          │  ← Pagination
└──────────────────────────────────────────────────────────┘
```

### Alignment Rules

- **Text columns**: left-aligned
- **Numeric columns**: right-aligned (decimals align, magnitudes compare)
- **Status/badge columns**: center-aligned
- **Action columns**: right-aligned
- **Header alignment**: match the column data alignment

Consistent alignment is the single highest-impact table design decision. Misaligned numbers are unreadable at a glance.

### Row Density

Offer density controls when users vary in preference:

| Density | Row height | Padding | Best for |
|---|---|---|---|
| Compact | 32px | 4px 8px | Power users, dense data |
| Default | 48px | 8px 16px | General use |
| Comfortable | 64px | 12px 16px | Less data, reading focus |

### Zebra Striping vs. Row Dividers

**Zebra striping** (alternating row background): effective for very wide tables where the eye loses track of which row it is on. Use a subtle tint (2–4% opacity difference, not full alternating colors).

**Row dividers only**: cleaner appearance, sufficient for narrow tables. `border-bottom: 1px solid` on each row.

**No stripes, no dividers**: only works with very generous row spacing and short rows. Risks visual row blurring.

---

## Sortable Columns

### Header Design

Indicate sortable columns with a sort icon in the header:

```
Name ↑     ← Currently sorted ascending (filled arrow)
Revenue ↕  ← Sortable but not currently sorted (neutral icon)
Status     ← Not sortable (no icon)
```

On hover of a sortable header: show the directional arrow it will sort to on click.

Click behavior:
1. First click: sort ascending
2. Second click: sort descending
3. Third click (optional): clear sort, return to default order

### Visual Feedback

- Highlight the active sort column header (bold, accent color, or background tint)
- Apply subtle column highlight to all cells in the sorted column
- Animate row reordering with a 150ms transition when sort changes

### Multi-Column Sort

For power user tables: support Shift+Click to add a secondary sort column. Show sort order indicators (1, 2) on active sort columns.

---

## Filterable Tables

### Filter Placement

**Above the table**: for prominent, frequently-used filters. Visible at all times.

**Column header filters**: dropdown or popover per-column, triggered by a filter icon. Keeps UI clean but less discoverable.

**Sidebar filter panel**: for complex filter combinations with many options. Collapsible.

### Active Filter State

Always show which filters are active:

```
Filters: Status = Active ×    Revenue > $5,000 ×    [Clear all]
```

- Show each active filter as a removable chip
- Provide "Clear all" to reset
- Show result count: "Showing 24 of 156 results"

### Search within Table

An inline search input that filters rows in real-time (debounced at 150ms) handles the majority of find-in-table use cases. Do not require a submit/enter for table search.

---

## Pagination

### When to Use

Use pagination when:
- Total rows exceed 50–100 (depending on row height)
- Users need to navigate to a specific page (known position in dataset)
- Server-side data loading is required

Use infinite scroll when:
- Content is feed-like (social, activity logs)
- Users browse rather than navigate to specific positions
- Mobile-first context

### Pagination Controls

```
Showing 41–60 of 234 results

[< Prev]  [1] [2] [3] [4] ... [12]  [Next >]

Rows per page: [25 ▾]
```

- Always show total count and current range
- Show page numbers with ellipsis for large page counts
- Provide rows-per-page selector (10, 25, 50, 100)
- Persist rows-per-page preference in localStorage

---

## Expandable Rows

Expandable rows reveal detail without navigation, ideal for hierarchical data or row-level detail panels.

### Interaction Pattern

- Click anywhere on the row (or a dedicated expand chevron) to expand
- Show a `>` chevron that rotates to `v` on expand
- Expansion reveals a sub-row panel that spans the full table width
- Sub-panel can contain forms, nested tables, additional fields, or actions

### Nested Tables

For hierarchical data (parent/child relationships):

```
▼ Acme Corp          Active    $12,400
  └ Project Alpha    Active     $8,200
  └ Project Beta     Active     $4,200
► Beta LLC           Pending    $8,200
```

Indent child rows with 24–32px. Use a different background tint for child rows to establish hierarchy.

---

## Selectable Rows and Bulk Actions

### Selection Pattern

```
☑  Name           Status      Revenue
☐  Acme Corp      Active       $12,400   ← Row checked
☑  Beta LLC       Pending       $8,200   ← Row checked
☐  Gamma Inc      Inactive      $3,100
```

- Checkbox in first column
- Header checkbox selects/deselects all visible rows
- Selected rows show a tinted background
- Selection count shown: "3 rows selected"

### Bulk Action Bar

Appear above (or replace) the table header when 1+ rows are selected:

```
3 rows selected   [Export]  [Archive]  [Delete]   [× Clear selection]
```

- Contextually relevant actions only (not all possible actions)
- Destructive actions (Delete) should require confirmation
- "Clear selection" always available

---

## Responsive Table Patterns

Tables are inherently non-responsive. These patterns handle narrow viewports:

### Horizontal Scroll

Simplest approach. Wrap the table in `overflow-x: auto`. Pros: data integrity preserved. Cons: users must discover and use horizontal scroll.

Add visual affordance: subtle gradient fade on the right edge when overflow exists.

### Priority Columns

Hide lower-priority columns at narrower breakpoints. Define column priority:
- Priority 1 (always visible): primary identifier, status, primary action
- Priority 2 (≥768px): secondary metrics
- Priority 3 (≥1024px): tertiary details

Show a "+" icon on mobile rows to reveal hidden column data inline.

### Card Layout (Mobile)

Transform each row into a card at mobile breakpoints:

```css
@media (max-width: 640px) {
  table, thead, tbody, tr, td { display: block; }
  td::before { content: attr(data-label); font-weight: bold; }
}
```

Each card shows all fields vertically. Loss of comparability is acceptable when browsing individual records on mobile.

### Sticky Columns

For wide tables: freeze the first column (identifier) and/or last column (actions) while other columns scroll horizontally.

```css
td:first-child, th:first-child {
  position: sticky;
  left: 0;
  background: var(--bg-color);
  z-index: 1;
  box-shadow: 2px 0 4px rgba(0,0,0,0.08);
}
```

---

## Virtual Scrolling

For tables with 1,000+ rows, render only visible rows plus a small buffer. The DOM contains ~30–50 rows while the scrollbar reflects the full dataset.

### When to Use

- Row count exceeds 500
- Row rendering is expensive (complex cells, images)
- Smooth scroll performance is required

### Libraries

- `@tanstack/react-virtual` (React)
- `vue-virtual-scroller` (Vue)
- `cdk/scrolling` VirtualScrollViewport (Angular)

### Considerations

- Fixed row height is required for simple virtual scrolling; variable height requires measurement
- Keyboard navigation becomes complex (Tab order skips offscreen rows)
- Text search (Ctrl+F) won't find content in non-rendered rows — provide in-table search

---

## Empty States

A table with no data needs an empty state, not blank rows.

```
┌─────────────────────────────────────┐
│                                     │
│    [icon: inbox or search]          │
│    No results found                 │
│    Try adjusting your filters       │
│    or [Clear filters]               │
│                                     │
└─────────────────────────────────────┘
```

- Differentiate "no data exists" vs "no results match filters"
- Provide a clear action to recover (clear filters, add first item)
- Keep the table header visible even when empty — it anchors the layout

---

## Quick Reference

- Align text left, numbers right, status center — always
- Sortable column headers: filled arrow (active), neutral icon (sortable), no icon (not sortable)
- Active filters: show as removable chips with result count
- Pagination: show range and total; include rows-per-page selector
- Expandable rows: full-width sub-panel with animated chevron
- Bulk actions: appear when rows selected; destructive actions need confirmation
- Responsive: horizontal scroll (simplest), priority columns, or card layout
- Virtual scroll for 500+ rows; requires fixed row height for simplicity
- Always design the empty state — no data is a common, real condition
