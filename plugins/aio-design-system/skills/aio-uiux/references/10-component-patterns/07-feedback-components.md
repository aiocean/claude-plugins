# Feedback Components

## Feedback Design Principles

Feedback components communicate system state to users — confirming actions, surfacing errors, showing progress, and indicating loading. They must be timely, appropriately prominent, and dismissible when no longer relevant.

**Key principle**: Match the persistence of the feedback to the urgency of the information. Ephemeral feedback for transient states; persistent feedback for states requiring user action.

---

## Toast / Snackbar

Toasts (also called snackbars in Material Design) are brief, non-blocking notifications that appear temporarily to confirm an action or communicate a low-urgency message.

### Anatomy

```
┌────────────────────────────────────────┐
│  ✓  Changes saved successfully   [Undo]│
└────────────────────────────────────────┘
```

- Icon (semantic color): success ✓, error ✕, warning ⚠, info ℹ
- Message (concise, < 80 characters)
- Optional action (Undo, View, Retry)
- Auto-dismiss timer
- Close button (optional for accessibility)

### Timing

| Type | Auto-dismiss delay |
|---|---|
| Success (no action needed) | 3–4 seconds |
| Info | 4–5 seconds |
| Warning | 5–7 seconds |
| Error | 7–10 seconds or persistent |
| Toast with action | Pause on hover; dismiss only on action or close |

Pause the timer on hover — users may need time to read and act.

### Positioning

- **Bottom center** (mobile): natural thumb-reach area; avoids content obscuration
- **Bottom right** (desktop): peripheral vision; doesn't interrupt reading flow
- **Top center**: highest visibility; use for errors requiring immediate attention
- **Top right**: common in admin/SaaS interfaces

Stack multiple toasts with newest on top (or bottom, consistently). Limit to 3 simultaneous toasts — queue the rest.

### Accessibility

- `role="status"` for non-urgent toasts (polite announcement)
- `role="alert"` for errors (assertive, interrupts screen reader)
- Focus management: do not move focus to the toast unless it requires action
- Keyboard dismissal: Escape key closes active toast

---

## Alert / Banner

Alerts are persistent, inline messages that communicate important status relevant to the current context. Unlike toasts, they are not self-dismissing.

### Types

| Type | Color | Icon | Use When |
|---|---|---|---|
| Success | Green | ✓ check | Action completed, state confirmed |
| Warning | Amber | ⚠ triangle | Non-blocking issue requiring attention |
| Error | Red | ✕ circle | Action failed, blocking issue |
| Info | Blue | ℹ circle | Contextual guidance, neutral notice |

### Inline Alert (Form Validation)

```
┌────────────────────────────────────┐
│  ✕  Payment failed                 │
│     Your card was declined. Check  │
│     your card number and try again.│
│                             [Retry]│
└────────────────────────────────────┘
```

Place inline alerts immediately above (or below) the section they describe — not at the top of a long page.

### Page-Level Banner

For critical system-wide notices (maintenance mode, trial expiration, security warning):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠  Your trial ends in 3 days.  [Upgrade now]  [×]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- Full-width, directly below the navigation
- Dismissible with × unless action is required
- Persist across pages until resolved or dismissed
- Use semantic background colors with sufficient contrast

### ARIA

- `role="alert"` for errors and critical warnings (live region, assertive)
- `role="status"` for success and informational alerts (polite)
- `aria-live="polite"` or `aria-live="assertive"` on the container

---

## Badge / Tag / Chip

These three components share visual similarity but serve different semantic roles.

### Badge

Small numeric or dot indicator overlaid on another element (usually an icon).

```
  🔔
   ●  ← dot badge (binary: has notifications)
  🔔
  12  ← count badge (quantified)
```

- Dot badge: 6–8px circle, accent or semantic color
- Count badge: 16–20px pill, show "99+" for large counts
- Position: top-right corner of the parent element
- Remove immediately when the state clears
- Use `aria-label` on the parent: `aria-label="Notifications, 12 unread"`

### Tag

Static label that categorizes content. Not interactive by default.

```
[Design]  [Frontend]  [React]
```

- Fixed content, read-only
- Smaller than a chip (padding: 2px 8px, font-size: 12px)
- Use for content taxonomy, metadata, categories
- Color-coded variants: default (gray), semantic (green/red/amber/blue), custom

### Chip

Interactive, selectable, or dismissible label. Chips are active UI elements.

```
Filter chips (toggleable):
  [All ×]  [Active ✓]  [Archived]  [Pending]

Input chips (removable, e.g. email recipients):
  [Alice Chen ×]  [Bob Smith ×]  [+ Add recipient]
```

**Filter chips**: Toggle on/off. Selected state: filled background, checkmark.
**Input chips**: Created by user input. Dismissible with × button. Common in tag inputs, recipient fields.
**Action chips**: Trigger an action. Styled like a secondary button.

Chip sizing: 28–32px height, 8–12px horizontal padding, 12–14px font size.

---

## Progress Bar

Communicates the completion status of an operation.

### Determinate Progress Bar

Use when total duration or steps are known:

```
Uploading...  ████████████░░░░░░░░  60%
```

- Show percentage label alongside the bar
- Animate fill smoothly (CSS transition on width)
- Never regress (go backward) — if the estimate is wrong, hold position
- Color: accent for active, green for complete

### Indeterminate Progress Bar

Use when duration is unknown:

```
Loading...   ░░░░████░░░░████░░░░   (animated shimmer)
```

- Animate a moving gradient or pulsing fill
- No percentage shown (unknown duration means unknown percentage)
- Switch to determinate when progress becomes measurable

### Segmented / Step Progress

For multi-step flows:

```
Step 1  ──────────  Step 2  ──────────  Step 3
  ●                    ●                    ○
Complete             Current              Pending
```

---

## Spinner / Loader

Used for operations with unknown duration where a progress bar would be misleading.

### Variants

| Variant | Use Case |
|---|---|
| Inline spinner | Button loading state (replaces label) |
| Overlay spinner | Full-section loading (prevents interaction) |
| Page spinner | Initial page load, full-screen |
| Skeleton screen | Content loading (preferred over spinner for layout-filling content) |

### Sizing

- Inline (button): 16px
- Content area: 24–32px
- Full page: 40–48px

### Button Loading State

```
[Save changes]  →  [⟳ Saving...]  →  [✓ Saved]
```

- Disable the button immediately on click (prevent double-submit)
- Replace label with spinner + "Saving..." label
- Show success state for 1.5–2 seconds, then return to normal
- On error: return to original label, show toast or inline error

---

## Skeleton Screens

Skeleton screens are layout placeholders that mimic the shape of content while it loads. They outperform spinners for perceived performance because they communicate layout structure rather than a void.

### Design Rules

- Match the approximate shape of real content (not exact — that causes jarring layout shifts)
- Use muted gray tones (gray-200 / gray-300 in light mode)
- Animate with a left-to-right shimmer gradient
- Display for operations expected to take 300ms–3s

### Shimmer Animation

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #e0e0e0 25%,
    #f0f0f0 50%,
    #e0e0e0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### When to Use vs. Spinner

- **Skeleton**: loading a page, feed, card list, table, profile — any content with a predictable shape
- **Spinner**: operations that don't map to a layout (form submission, file processing, calculations)

---

## Empty States

Empty states are feedback components — they communicate "this area has no content yet" and guide the user toward populating it.

### Anatomy

```
        [Illustration]

    No projects yet

    Create your first project to get
    started with your workspace.

         [+ New project]
```

- Illustration or icon (optional but increases engagement)
- Clear headline: what is empty, stated plainly
- Short explanatory sentence (optional)
- Primary CTA: the action that resolves the empty state

### Empty State Variants

| Context | Message Framing |
|---|---|
| First-time user (no data) | "Let's get started" — aspirational, onboarding tone |
| Search/filter with no results | "No results for X" — explain and provide a clear action (clear filters) |
| Error caused the empty state | Surface the error, provide retry action |
| Feature not available on plan | Explain limitation and show upgrade CTA |

---

## Quick Reference

- **Toast**: ephemeral, 3–10s auto-dismiss, bottom-right desktop / bottom-center mobile; `role="alert"` for errors
- **Alert/Banner**: persistent, inline or page-level, four semantic types (success/warning/error/info)
- **Badge**: numeric/dot overlay on icons; `aria-label` on parent for screen readers
- **Tag**: static category label; read-only
- **Chip**: interactive — filter (toggle), input (removable), action (triggers behavior)
- **Progress bar**: determinate (known %) or indeterminate (shimmer); never regress
- **Spinner**: unknown-duration operations; inline for buttons, overlay for sections
- **Skeleton**: preferred over spinner for content-shaped loading; shimmer animation
- **Empty state**: headline + CTA; differentiate first-time vs. search-no-results vs. error
