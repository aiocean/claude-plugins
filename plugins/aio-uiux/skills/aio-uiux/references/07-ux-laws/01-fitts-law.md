# Fitts's Law: Target Size and Distance

## Definition

Fitts's Law predicts the time required to move to a target based on the distance to that target and the target's size. It is one of the most empirically validated laws in human-computer interaction.

**Formula:** `T = a + b × log2(D/W + 1)`

- **T** = Time to acquire the target (milliseconds)
- **a** = Start/stop time of the device (intercept constant, empirically derived)
- **b** = Inherent speed of the device (slope constant, empirically derived)
- **D** = Distance from starting point to center of target
- **W** = Width of the target (along the axis of movement)
- **log2(D/W + 1)** = Index of Difficulty (ID), measured in bits

The Index of Difficulty increases when targets are small or far away. A target twice as wide is approximately one bit easier to acquire. A target twice as far is approximately one bit harder.

---

## The Science Behind It

Paul Fitts published this model in 1954 studying human motor control. The law emerged from information theory — Fitts observed that pointing movements behave like information transmission, with accuracy trading off against speed.

**Key insights from the research:**

- The relationship is logarithmic, not linear. Doubling target size has diminishing returns; going from 8px to 16px helps far more than going from 64px to 128px.
- The law applies across input modalities: mouse, touch, stylus, trackpad, eye-gaze, even foot-operated controls.
- It holds across ages and physical abilities, though constants (a, b) differ per person and device.
- Shannon's formulation (`ID = log2(D/W + 1)`) is preferred over the original because it avoids negative IDs for very wide targets.

**Throughput (TP):** Modern HCI uses Movement Time / Index of Difficulty to characterize device speed. A standard mouse averages 4–5 bits/second; touchscreens average 3–4 bits/second (higher error rates at small sizes).

---

## UI/UX Applications

### 1. Target Size

Make interactive elements large enough to be acquired quickly with low error. Small targets disproportionately increase acquisition time and frustration.

**Minimum touch target guidelines:**
- Apple Human Interface Guidelines: **44 × 44 pt** (logical pixels)
- Google Material Design: **48 × 48 dp** minimum tap target
- WCAG 2.5.5 (AAA): **44 × 44 CSS pixels**
- WCAG 2.5.8 (AA, WCAG 2.2): **24 × 24 CSS pixels** minimum
- Nielsen Norman Group recommendation: **1cm × 1cm** physical size on screen

The visual size of an element can be smaller than its touch target. Use padding to expand the interactive area without affecting layout.

```css
/* Visual button is 32px, but touch target is 44px */
.icon-button {
  width: 32px;
  height: 32px;
  padding: 6px;          /* Expands touch target to 44px */
  /* OR use negative margin with equivalent positive padding */
}

/* Expanding touch target without affecting layout flow */
.small-link {
  position: relative;
  display: inline-block;
}
.small-link::after {
  content: '';
  position: absolute;
  top: -8px;
  right: -8px;
  bottom: -8px;
  left: -8px;
}
```

### 2. Edges and Corners (Infinite Targets)

Screen edges and corners are effectively infinite in one or two dimensions — a cursor cannot overshoot them. This makes them the fastest possible targets.

**Fitts's practical implication:**
- **macOS menu bar** (top edge): menus are infinitely tall from above, so users can slam the cursor up and immediately click
- **macOS Dock** (bottom edge): same principle — push cursor down and select
- **Windows Start button** (corner): two infinite edges compound the advantage
- **Pie/radial menus**: equidistant targets minimize average acquisition time

**Design decisions guided by this:**
- Place primary actions at screen edges when possible (sidebars, toolbars)
- Sticky navigation that stays at viewport edges as user scrolls
- Avoid placing critical actions in the center of a large space far from where users typically are
- Floating action buttons (FABs) in corners leverage both proximity and edge benefits

### 3. Proximity of Related Actions

Items that are used together should be close together. Every pixel of distance adds to acquisition time across the entire user base, summed over all interactions.

```css
/* Bad: Related actions far apart */
.form-actions {
  display: flex;
  justify-content: space-between; /* Submit at far right, Cancel at far left */
}

/* Better: Related actions grouped, near where user just was */
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end; /* Both near the form's natural endpoint */
}
```

**Dialog button placement:** Place the primary action button adjacent to the last input field, not in a distant corner. Users finish typing and then need to submit — the distance from input to submit matters.

### 4. Contextual Menus and Right-Click

Context menus appear at cursor position, making all items equally near (distance ≈ 0). This is why radial menus are theoretically optimal — all options are equidistant. Linear context menus sacrifice this by making lower items farther away.

**Implication:** Put the most common contextual actions at the top of context menus. Users scan top-down, and top items have lower distance.

### 5. Hover Interactions and Submenu Tunnels

Submenus that appear on hover create "tunnels" — the user must move the cursor into a narrow area without leaving the parent menu item. This is the infamous "diagonal movement problem."

```
Parent Menu
├── Item 1
├── Item with submenu →  [Submenu appears here]
│                         ├── Sub-item 1
│                         └── Sub-item 2
└── Item 3
```

If the user moves diagonally toward the submenu and crosses Item 3's hover area, the submenu collapses. Solutions:
- Use a brief hover delay before collapsing (100–150ms)
- Detect movement direction and delay collapse if cursor is moving toward submenu
- Amazon's "predictive intent" algorithm for mega-menus (triangular safe zone)

---

## Concrete Examples

### Good: GitHub's large repository action buttons
GitHub's "Code", "Issues", "Pull Requests" tabs are wide full-width bars on mobile — easy to tap despite being navigation items.

### Good: iOS bottom navigation bar
Placed at the thumb's natural resting position, with generous touch targets and spacing between items.

### Good: macOS spotlight (Cmd+Space)
Opens at cursor position (often center of screen) — not ideal for Fitts, but the keyboard shortcut bypasses pointing entirely.

### Bad: Small inline "Edit" text links
A 3-character text link "Edit" at 14px font is approximately 24×18px — well below minimum touch target size. Users on touch devices frequently mis-tap.

### Bad: Close button in top-right of modal with content at bottom
User fills out a long form (cursor near Submit at bottom), decides to cancel, but Close X is at the opposite corner of the modal — maximum distance.

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Tiny icon buttons (16×16px) | Low W means high ID, high error rate | Pad to 44×44px minimum |
| Placing Undo far from the action it undoes | High D increases acquisition time | Show inline undo near the trigger |
| Spread-out related actions | Forces excessive cursor travel | Group related controls spatially |
| Hover submenus with no delay | Diagonal movement breaks submenu focus | Add 150ms hover-out delay |
| Centering a single CTA in a large canvas | High D from any starting position | Pin to viewport edge or near content |

---

## CSS Patterns

```css
/* Accessible minimum tap target with visual-only size */
.btn-icon {
  /* Visual size */
  width: 24px;
  height: 24px;

  /* Touch target expansion */
  padding: 10px;          /* Makes it 44×44px interactive */
  margin: -10px;          /* Compensates layout shift */

  /* Helpful debug indicator */
  /* outline: 1px dashed red; */
}

/* Edge-anchored primary action (mobile) */
.primary-fab {
  position: fixed;
  bottom: 24px;           /* Near edge, accounts for home indicator */
  right: 24px;            /* Near corner — two near-infinite edges */
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

/* Grouped form actions — minimize D from last field */
.form-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  /* Actions appear just below the last input, low D */
}

/* Expanded hit area on small links */
.action-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;       /* Vertical expansion for touch */
  padding: 0 4px;
}
```

---

## Key Takeaways

1. **Size matters more for small targets.** Going from 8px to 16px saves more time than going from 48px to 96px.
2. **Edges and corners are free real estate.** Use them for frequent actions.
3. **Distance compounds across a user session.** Every extra pixel traveled, multiplied by thousands of interactions, adds up to real friction.
4. **Touch is less precise than mouse.** Apply more generous sizing on mobile.
5. **Proximity encodes relationship.** Things close together feel related — spatial grouping communicates semantics, not just reduces travel time.
