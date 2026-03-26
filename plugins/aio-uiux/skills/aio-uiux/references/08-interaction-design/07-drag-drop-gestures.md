# Drag, Drop, and Gesture Interaction Design

Drag-and-drop and touch gestures are powerful interaction patterns that feel natural when done right and confusing when done poorly. This reference covers affordances, implementation patterns, accessibility, and the edge cases that break most implementations.

---

## Affordances and Discoverability

Drag-and-drop is an invisible interaction — there is no visual cue inherent in a draggable element. The affordance must be designed explicitly.

### Signals That Something Is Draggable

**Grab handle icon**: The most explicit signal. A `⠿` (six-dot grid) or `⋮⋮` (two-column dots) icon on the left edge of a list item communicates draggability unambiguously. Show on hover to reduce visual noise.

**Cursor change**: `cursor: grab` on hover, `cursor: grabbing` during drag. This is the minimum required signal.

**Drag preview**: When drag begins, a semi-transparent clone of the element follows the cursor. Seeing the preview confirms the action is possible.

**Hover state**: A subtle background highlight on hover hints at interactivity without committing to drag.

**Instructional text**: For first-time users, "Drag to reorder" near list items surfaces the affordance. Dismiss after first use.

### What Not to Rely On

- Color alone — colorblind users will miss it
- Cursor change alone — cursor is invisible until hover
- Structural position — being in a list does not communicate sortability

---

## Drop Zones

Drop zones must communicate three states: available, active (hover), and rejected.

### Visual States

```
Available (no drag in progress):
  Dashed border, muted fill
  "Drop files here" label (for file upload)

Active (item dragged over valid zone):
  Solid accent-color border
  Slightly deeper background fill
  Scale up 2–4px (subtle growth signals acceptance)
  "Release to drop" label or check icon

Rejected (item dragged over invalid zone):
  Red border or X icon
  Slightly shrunken or unresponsive appearance
  "Can't drop here" tooltip
```

### Drop Zone Sizing

Extend the hit area with padding while keeping the visual boundary smaller. This reduces mis-drops without visual clutter. For file upload zones: make the entire panel a drop target, not just a small dashed box.

---

## Sortable Lists

Reorderable lists (task lists, playlist items, priority queues) are the most common drag-drop pattern.

### Interaction Sequence

1. Mouse down on handle → show `grabbing` cursor
2. Drag begins (threshold: 4–8px movement) → lift item with shadow and slight scale (1.02–1.05)
3. Item moves → other items shift to make room with spring animation (150–200ms)
4. Drop → item snaps into place, shadow dissolves, scale returns to 1.0

### Placeholder Behavior

Show a placeholder (ghost element) in the position where the item will land.

**Shift approach**: Items below shift up as the dragged item enters the gap. The placeholder fills the space. Most intuitive for linear lists.

**Swap approach**: Dragged item and hovered item exchange positions. Better for grid layouts.

### Touch Sortable Lists

Touch drag requires a long-press activation (300–500ms hold) before drag begins — this prevents accidental drags during scroll. Provide haptic feedback (vibration) or a visual pulse at activation to confirm drag mode is active.

---

## Kanban Boards

Kanban (multi-column drag) adds column targeting to list sorting.

### Column Drop Zones

Each column must become a clearly active drop target when an item is dragged over it:

- Column background tints to accent color
- Column header shows a drop indicator
- Items in the column shift to show where the dragged card will land

### Card Lifting

When a card is being dragged:
- Lift with box shadow (`0 8px 24px rgba(0,0,0,0.2)`)
- Rotate slightly (1–2 degrees) to suggest physical movement
- Reduce opacity of other cards in the source column (0.5–0.7) to emphasize the dragged card

### Empty Column States

An empty column must still be a viable drop target. Show a dashed border or "Drop here" placeholder that fills the column height during a drag.

---

## File Upload

### Zone Design

```
┌─────────────────────────────────┐
│                                 │
│   ↑  Drag files here            │
│      or  [Browse files]         │
│                                 │
│   Accepts: PDF, PNG, JPG        │
│   Max size: 10MB                │
└─────────────────────────────────┘
```

- Make the entire box clickable (activates file picker)
- Accept dragover on the entire window, not just the box
- Show file type and size restrictions clearly before upload

### During and After Drop

- Show full-page overlay or highlight the drop zone when files enter the window
- Show file count ("Drop 3 files") when multiple files are dragged
- Show rejection state immediately if file types are invalid
- Show thumbnail preview before upload begins
- Show individual progress bars per file
- Allow removal of individual files from the queue
- Show success/error state per file independently

---

## Touch Gestures

### Swipe to Dismiss / Archive

Common in mobile list items (email, notifications, tasks):

```
Swipe right →  Green background + Archive/Complete icon
Swipe left  →  Red background + Delete icon
Release at threshold (40–50% of width) → action executes
Release before threshold → item snaps back
```

Design requirements:
- Reveal the action icon behind the item as it slides (not before swipe begins)
- Use rubber-band resistance near the threshold to telegraph the snap point
- Animate the dismiss (item slides off screen, list closes the gap)
- Offer undo for destructive swipe actions

### Pull to Refresh

- Trigger after 60–80px of overscroll
- Show a spinner or custom animation in the overscroll area
- Release above threshold: list refreshes
- Release below threshold: rubber-band back, no action

### Pinch to Zoom

For images, maps, and zoomable content:
- Maintain the focal point between the two fingers as the anchor
- Show current zoom level indicator (fades after 1s)
- Constrain zoom range (min/max) with resistance at boundaries
- Double-tap to zoom-in/reset is expected alongside pinch

---

## Accessibility for Drag Operations

Drag-and-drop is entirely inaccessible to keyboard and screen reader users unless an alternative is provided. WCAG 2.1 SC 2.1.1 requires keyboard accessibility for all functionality.

### Keyboard Alternative for Sortable Lists

```
Tab to item → Space/Enter to "pick up"
Arrow keys  → Move up/down in list
Space/Enter → Drop at current position
Escape      → Cancel, return to original position
```

Announce via ARIA live region:
- "Item grabbed. Use arrow keys to move, Space to drop, Escape to cancel."
- "Item moved to position 3 of 7."
- "Item dropped."

### ARIA Pattern

```html
<ul role="listbox" aria-label="Priority queue">
  <li
    role="option"
    draggable="true"
    aria-roledescription="sortable item"
    tabindex="0"
  >
    Task name
  </li>
</ul>
```

Use `aria-live="assertive"` for drop confirmation. Announce source position, destination position, and success.

---

## Common Mistakes

**No visual feedback during drag**: Always show a drag preview and cursor change.

**Drop zone too small**: Precision dropping is frustrating. Expand hit areas generously beyond visual bounds.

**No keyboard alternative**: Fails WCAG 2.1 SC 2.1.1 and excludes keyboard-only users entirely.

**Immediate deletion without undo**: Any drag-to-delete action needs undo within 5–10 seconds.

**Long-press conflict with scroll**: On mobile, require a visible grab handle to initiate drag, not free-area long-press.

**Jittery auto-scroll**: When dragging near scrollable container edges, auto-scroll should be smooth and proportional to proximity.

---

## Quick Reference

- Grab handles + cursor change = minimum draggable affordance
- Drop zones: three states required — available, active, rejected
- Sortable lists: lift with shadow, shift neighbors with animation, show placeholder
- Kanban: column becomes active drop zone on hover; show insert position
- File upload: entire zone is clickable + droppable; preview before upload; per-file progress
- Touch: long-press to activate, swipe needs threshold + snap-back + undo
- Accessibility: keyboard alternative mandatory; ARIA live announcements at pick-up and drop
