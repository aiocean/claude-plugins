# Design System Checklist

A comprehensive checklist for auditing or building a design system. Use this to identify gaps, prioritize work, and define "done" for each layer.

## Foundations

### Color
- [ ] Primitive color ramps defined (5–11 steps per hue)
- [ ] Semantic tokens mapped from primitives (primary, secondary, danger, success, warning, info)
- [ ] Surface tokens (page, raised, sunken, overlay, hover, active)
- [ ] Text tokens (primary, secondary, disabled, inverse, link, danger)
- [ ] Border tokens (default, strong, muted, focus)
- [ ] Dark mode counterparts for all semantic tokens
- [ ] Contrast ratios verified: 4.5:1 body text, 3:1 large text (WCAG AA)
- [ ] Color not used as the sole differentiator (icons, labels, patterns also present)

### Typography
- [ ] Type scale defined (min 5 sizes: xs, sm, md, lg, xl plus 2–3 display sizes)
- [ ] Font weights mapped (regular, medium, semibold, bold)
- [ ] Line-height scale (tight, normal, relaxed)
- [ ] Letter-spacing tokens (tight for headings, normal for body)
- [ ] Named text styles: heading-1 through heading-4, body-lg, body-md, body-sm, label, caption, code
- [ ] Font loading strategy defined (font-display, fallback stack)
- [ ] Minimum 16px body text on mobile
- [ ] Responsive typography (fluid scaling or breakpoint steps)
- [ ] Monospace/code font defined

### Spacing
- [ ] Base unit defined (4px or 8px)
- [ ] Spacing scale covers: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
- [ ] Semantic spacing tokens (component-padding-sm/md/lg, layout-gap, section-gap)
- [ ] Consistent inner padding per component size (sm: 8×12, md: 8×16, lg: 12×20)

### Elevation / Shadow
- [ ] Shadow scale: 0 (none), 1 (subtle), 2 (card), 3 (dropdown), 4 (modal), 5 (toast)
- [ ] Dark mode shadow adjustments (higher opacity)
- [ ] Elevation mapped to z-index scale

### Border
- [ ] Border-radius scale: none, sm, md, lg, xl, 2xl, full
- [ ] Border-width tokens: thin (1px), medium (2px), thick (4px)
- [ ] Border color tokens (default, muted, strong, focus, error)

### Motion
- [ ] Duration scale: instant (0ms), fast (100ms), normal (200ms), slow (300ms), slower (500ms)
- [ ] Easing functions: ease-in, ease-out, ease-in-out, spring
- [ ] Named transitions: fade, slide, scale, collapse
- [ ] `prefers-reduced-motion` respected — durations collapse to 0ms

### Iconography
- [ ] Icon library selected and documented
- [ ] Icon size scale: xs (12), sm (16), md (20), lg (24), xl (32)
- [ ] Icon weight matches text weight in context
- [ ] Icon color inherits via `currentColor`
- [ ] Touch targets padded to 44×44px minimum
- [ ] All icons have `aria-label` or `aria-hidden` + sibling text

### Grid and Layout
- [ ] Column grid defined (12 or 16 columns)
- [ ] Gutter width per breakpoint
- [ ] Page max-width defined (1280px or 1440px typical)
- [ ] Page horizontal padding per breakpoint
- [ ] Named layout regions: sidebar width, header height, content max-width

### Z-Index
- [ ] Named z-index scale: base, raised, dropdown, sticky, overlay, modal, popover, toast, tooltip
- [ ] Stacking context documented to avoid z-index wars

### Breakpoints
- [ ] Breakpoint scale defined: xs (320), sm (640), md (768), lg (1024), xl (1280), 2xl (1536)
- [ ] Mobile-first approach confirmed
- [ ] Container query consideration documented for isolated components

---

## Components

### Form Controls
- [ ] **Button** — variants (primary, secondary, ghost, outline, danger), sizes (sm, md, lg), states (hover, active, focus, disabled, loading), left/right icon support
- [ ] **Input** (text) — states (default, focus, error, disabled, read-only), sizes, placeholder styling
- [ ] **Textarea** — auto-resize option, character count
- [ ] **Select** — single select, searchable option, grouped options
- [ ] **Checkbox** — indeterminate state, checked, unchecked, disabled
- [ ] **Radio** — group behavior, disabled state
- [ ] **Toggle / Switch** — on/off, disabled, label alignment
- [ ] **Slider / Range** — min/max/step, disabled
- [ ] **File Upload** — drag-and-drop zone, file list, size limit feedback
- [ ] **Form Field wrapper** — label + input + helper text + error message
- [ ] **Form** — field validation, submit loading state, error summary

### Data Display
- [ ] **Table** — sortable headers, row hover, row selection, sticky header, empty state
- [ ] **Data Grid** — virtualization consideration for large datasets
- [ ] **List** — ordered/unordered, interactive (selectable rows)
- [ ] **Card** — header/body/footer slots, clickable variant, loading skeleton
- [ ] **Stat / KPI card** — label + value + trend + icon
- [ ] **Badge / Tag** — semantic variants (success, warning, error, info), dismissible
- [ ] **Avatar** — image, initials fallback, sizes, group (overlap stack), status indicator
- [ ] **Progress bar** — determinate/indeterminate, color variants
- [ ] **Timeline** — vertical/horizontal, icon nodes

### Feedback and Status
- [ ] **Alert** — info/success/warning/error, dismissible, with/without icon
- [ ] **Toast / Snackbar** — position options (top-right, bottom-center), auto-dismiss, action button, queue management
- [ ] **Skeleton** — text skeleton, image skeleton, card skeleton
- [ ] **Spinner / Loader** — sizes, color variants, full-page overlay variant
- [ ] **Empty State** — illustration + title + description + CTA
- [ ] **Error State** — 404, 500, offline variants
- [ ] **Tooltip** — delay, placement (top/right/bottom/left), max-width
- [ ] **Popover** — richer content than tooltip, close on outside click

### Navigation
- [ ] **Navigation Bar** (top) — logo, links, search, user menu, mobile hamburger
- [ ] **Sidebar** — collapsible, nested items, active state, icon-only mode
- [ ] **Breadcrumb** — separator style, truncation for long paths
- [ ] **Tabs** — horizontal/vertical, overflow scroll, keyboard navigation
- [ ] **Pagination** — page numbers, prev/next, first/last, page size selector
- [ ] **Stepper** — linear steps, step status (complete, current, upcoming, error)
- [ ] **Link** — external link indicator, underline strategy

### Overlay and Dialog
- [ ] **Modal / Dialog** — focus trap, scroll lock, backdrop click-to-close, escape key, sizes (sm/md/lg/xl/full)
- [ ] **Drawer / Sheet** — side-anchored (right/left/bottom), sizes
- [ ] **Dropdown Menu** — keyboard navigation, nested menus, dividers, icons
- [ ] **Context Menu** — right-click trigger
- [ ] **Command Palette** — search + keyboard shortcut trigger, grouped results
- [ ] **Confirm Dialog** — yes/no pattern, danger variant

### Layout Primitives
- [ ] **Container** — max-width, horizontal padding
- [ ] **Stack** (Flex column) — gap, align, justify props
- [ ] **Inline** (Flex row) — gap, wrap, align props
- [ ] **Grid** — columns, gap, responsive variants
- [ ] **Divider** — horizontal/vertical, label in middle
- [ ] **Spacer** — explicit whitespace component

---

## Patterns

### Error Handling
- [ ] Form field inline validation (on blur, on submit)
- [ ] Form-level error summary (banner above form)
- [ ] API error states: empty list, failed load, partial failure
- [ ] Field-level error message format: specific, actionable ("Enter a valid email" not "Invalid")
- [ ] Error recovery actions defined (retry button, contact support link)

### Loading States
- [ ] Skeleton screens for initial page load (preferred over spinners)
- [ ] Inline spinners for button actions
- [ ] Full-page loading for route transitions
- [ ] Optimistic UI for instant feedback on mutations
- [ ] Minimum spinner duration (250ms) to prevent flash

### Empty States
- [ ] First-time empty (no data yet) — onboarding CTA
- [ ] Search/filter empty (no results) — clear filter CTA
- [ ] Error empty (failed to load) — retry CTA
- [ ] Each empty state: illustration + headline + description + action

### Permissions and Gating
- [ ] Disabled UI for missing permissions (not hidden — show why it's disabled)
- [ ] Upgrade prompt pattern for paywalled features
- [ ] Permission-denied page vs permission-denied inline component

### Notifications
- [ ] Read/unread state management
- [ ] Notification grouping strategy
- [ ] In-app notification center vs toast-only

---

## Documentation

### For Each Component
- [ ] Component purpose and when to use it
- [ ] When NOT to use it (alternatives)
- [ ] All props documented with types, defaults, descriptions
- [ ] Live interactive example (Storybook or equivalent)
- [ ] Variant showcase (all visual states)
- [ ] Accessibility notes (keyboard, screen reader behavior)
- [ ] Do/Don't visual examples (at least 2 pairs)
- [ ] Related components linked

### System-Level Docs
- [ ] Getting started guide (installation, setup, first component)
- [ ] Design principles documented
- [ ] Token reference page (searchable)
- [ ] Figma ↔ code token mapping
- [ ] Browser support matrix
- [ ] Performance guidelines (bundle size, code splitting)
- [ ] Changelog with migration notes for breaking changes

---

## Governance

### Contribution Process
- [ ] Component proposal template (problem, use cases, API sketch)
- [ ] Review criteria defined (accessibility, API consistency, test coverage)
- [ ] Contribution guide: how to submit a new component
- [ ] RFC (request for comments) process for breaking changes

### Versioning and Deprecation
- [ ] Semantic versioning (MAJOR.MINOR.PATCH)
- [ ] Breaking change policy: what qualifies as breaking
- [ ] Deprecation path: deprecated → legacy → removed (min 2 major versions)
- [ ] `@deprecated` JSDoc on deprecated exports
- [ ] Migration guide for each breaking change

### Quality Gates
- [ ] TypeScript strict mode
- [ ] Unit tests for all component logic (variants, states, keyboard)
- [ ] Accessibility audit (axe-core) integrated in CI
- [ ] Visual regression tests (Chromatic, Percy, or similar)
- [ ] Bundle size budget enforced in CI
- [ ] Storybook build required to pass before merge

---

## Minimum Viable Design System

If you're starting from scratch, this is the 80/20 set — covers the vast majority of UI needs:

**Foundations (must have):**
- Color tokens (primitive + semantic light + semantic dark)
- Spacing scale (4px base, 0–24 steps)
- Typography scale (5 sizes, 4 weights, named styles)
- Border-radius scale (none, sm, md, lg, full)

**Components (must have):**
- Button (3 variants: primary, secondary, ghost)
- Input + FormField
- Select
- Checkbox + Radio
- Badge
- Card
- Modal
- Table
- Alert
- Toast
- Skeleton
- Spinner
- Empty State
- Navigation Bar
- Tabs
- Dropdown Menu

**That's 16 components + 4 foundation categories = a functional design system that can ship real products.**

Defer until proven needed:
- Slider, File Upload, Timeline, Command Palette, Data Grid
- Animation library
- Illustration system
- Component theming (per-brand customization)
