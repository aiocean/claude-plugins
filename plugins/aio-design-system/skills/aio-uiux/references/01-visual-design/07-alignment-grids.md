# Alignment and Grid Systems

Alignment is the invisible structure behind clean design. Grids are how you enforce alignment at scale. Together they create visual coherence — elements feel like they belong together, not scattered.

---

## What Alignment Does

Alignment creates implied lines that connect elements across a layout. The eye follows these invisible lines and perceives the layout as organized. When elements are misaligned, even by a few pixels, users perceive the design as amateur — often without being able to articulate why.

**Four alignment modes:**

| Mode | Description | When to Use |
|------|-------------|-------------|
| **Edge (left/right)** | Elements share a common edge | Body text, lists, form fields |
| **Center** | Elements share a central axis | Headings, CTAs, hero content |
| **Baseline** | Text baselines align across columns | Multi-column text, inline elements |
| **Distributed** | Space is divided equally | Navigation, tab bars, icon sets |

---

## Edge Alignment

Edge alignment is the most common and most readable. All elements align to a shared left (or right) edge. This creates a strong vertical line the eye can follow.

```css
/* Left-edge alignment via consistent horizontal padding */
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* All children share the same left edge */
.page-title,
.page-subtitle,
.page-body {
  /* No additional horizontal offset — they align to the container */
}

/* Consistent form field alignment */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label,
.form-group input,
.form-group .hint-text {
  /* All left-edge aligned — clean vertical line */
  align-self: stretch;
}
```

---

## Center Alignment

Center alignment works for short, self-contained content blocks. It creates symmetry and formality. Avoid centering long body text — it creates ragged, hard-to-follow edges.

```css
/* Good: centered hero section */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
  padding: 80px 24px;
}

/* Good: centered modal */
.modal-header {
  text-align: center;
  padding: 24px;
}

/* Bad: centered long-form content */
.article-body {
  text-align: center; /* Never do this — unreadable at > 3 lines */
}
```

---

## Baseline Alignment

Baseline alignment is critical when mixing different font sizes in a single horizontal row. Without it, text feels misaligned even when the bounding boxes touch.

```css
/* Stat card with label and value at different sizes */
.stat-row {
  display: flex;
  align-items: baseline; /* Aligns text baselines, not box edges */
  gap: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat-unit {
  font-size: 16px;
  font-weight: 400;
}

/* Navigation with icon + label */
.nav-item {
  display: flex;
  align-items: center; /* Icons use center — not baseline */
  gap: 8px;
}
```

**Rule:** Use `align-items: baseline` for mixed-size text. Use `align-items: center` for text mixed with icons or non-text elements.

---

## Grid Systems

### The 12-Column Grid

12 columns is the standard because 12 is divisible by 2, 3, 4, and 6 — giving maximum layout flexibility.

```css
/* 12-column grid with CSS Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px; /* column gap */
}

/* Spanning patterns */
.col-12 { grid-column: span 12; } /* Full width */
.col-8  { grid-column: span 8;  } /* Two-thirds */
.col-6  { grid-column: span 6;  } /* Half */
.col-4  { grid-column: span 4;  } /* One-third */
.col-3  { grid-column: span 3;  } /* One-quarter */

/* Common two-column layout: content + sidebar */
.content-area { grid-column: span 8; }
.sidebar      { grid-column: span 4; }

/* Three equal columns */
.feature-card { grid-column: span 4; }
```

### Responsive 12-Column Grid

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

@media (max-width: 1024px) {
  .content-area { grid-column: span 8; }
  .sidebar      { grid-column: span 12; } /* Sidebar drops to full width */
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(4, 1fr); /* 4-column mobile grid */
    gap: 16px;
  }
  .feature-card { grid-column: span 4; } /* Full width on mobile */
}
```

---

## Flexible Grid with CSS Grid Auto-Placement

For card layouts where item count varies, use auto-placement:

```css
/* Auto-fill grid: columns as wide as possible, minimum 280px */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

/* Auto-fit: collapses empty columns (useful for centering small sets) */
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 16px;
}
```

**`auto-fill` vs `auto-fit`:**
- `auto-fill` — keeps empty column tracks (content stays left-aligned)
- `auto-fit` — collapses empty tracks (content stretches to fill, centering small sets)

---

## Flexbox Alignment Patterns

Flexbox handles one-dimensional alignment. Use it for rows and columns of items, not full page layouts.

```css
/* Horizontal distribution patterns */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Push one item to the far end */
.toolbar .spacer { flex: 1; }
.toolbar .action-btn { /* naturally pushed to right */ }

/* Evenly distribute items */
.tab-bar {
  display: flex;
  justify-content: space-evenly; /* or space-between, space-around */
}

/* Vertical centering in a fixed-height container */
.card {
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.card-footer {
  margin-top: auto; /* Pushes footer to bottom regardless of content height */
}
```

---

## Optical vs Mathematical Alignment

Mathematical alignment places elements at geometrically equal distances. Optical alignment adjusts for how the eye perceives space — which is often not equal.

### The Icon-in-Circle Problem

```css
/* Mathematical center — looks slightly off */
.icon-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Optical correction for icons with visual weight at bottom */
.icon-button {
  padding-bottom: 1px; /* Shifts icon up by 1px — feels centered */
}
```

### Text in Buttons

```css
/* All-caps text looks too low — optical lift needed */
.btn-uppercase {
  letter-spacing: 0.08em;
  padding-top: 13px;    /* 1px more than bottom for optical center */
  padding-bottom: 12px;
}
```

### Equal Spacing That Isn't Equal

```css
/* Card grid with visual equal weight */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* The gap between cards feels wider than the gap between card edge and content */
/* Solution: use padding inside cards to create equal visual breathing room */
.stat-card {
  padding: 24px; /* Inner padding creates balanced visual margin */
}
```

---

## Common Grid Mistakes

**1. Gutters too large relative to column width.** If your gutters are as wide as your columns, the grid loses coherence.

```css
/* Bad: gutter = column width on small screens */
.grid { gap: 24px; grid-template-columns: repeat(4, 1fr); }
/* On 320px screen: columns ≈ 56px, gaps = 72px total — inverted */

/* Better: scale gap with screen width */
.grid {
  gap: clamp(12px, 2vw, 24px);
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
```

**2. Inconsistent horizontal padding.** The page container has 24px padding but a hero section bleeds edge-to-edge. The body text inside the hero is also 24px from the edge — but now you have two different 24px measurements that don't share a reference line.

```css
/* Consistent: all sections share the same horizontal rhythm */
.container { padding: 0 24px; max-width: 1200px; margin: 0 auto; }
.hero-content { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
/* Hero background bleeds, content aligns with the page grid */
```

**3. Mixing grid and absolute positioning carelessly.** Absolutely positioned elements opt out of the grid and require manual alignment. Use them for overlays and tooltips — not for layout.

---

## Breaking Alignment Intentionally

Deliberate misalignment creates emphasis and energy. The key word is *deliberate* — it only works when the surrounding layout is visibly orderly.

```css
/* Controlled break: pull-quote extends beyond text column */
.pull-quote {
  grid-column: 2 / 10; /* Normal text uses columns 3–9 */
  margin-left: -48px;  /* Deliberate intrusion into left margin */
  font-size: 24px;
  font-style: italic;
  border-left: 4px solid #2563eb;
  padding-left: 24px;
}

/* Controlled break: hero image bleeds past content container */
.hero-image {
  width: calc(100% + 48px); /* Extends beyond 24px padding on each side */
  margin-left: -24px;
  margin-right: -24px;
}

/* Controlled break: accent element rotated out of grid */
.section-label {
  position: absolute;
  left: -80px;
  top: 0;
  transform: rotate(-90deg);
  transform-origin: right top;
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #9ca3af;
}
```

**Rules for breaking alignment:**
1. The break must be intentional and consistent (not random per element)
2. The surrounding layout must be visibly gridded for the break to register
3. Only break alignment for emphasis — hero images, pull-quotes, decorative accents
4. Never break alignment for body text or interactive elements

---

## Alignment Quick Reference

```
Left-edge align:   body text, forms, cards, lists
Center align:      heroes, modals, empty states, CTAs
Baseline align:    mixed-size text in a single row
Distributed:       navigation, tab bars, footers

Grid systems:
  12-col fixed:    traditional layouts, marketing pages
  auto-fill/fit:   card galleries, dynamic content
  flexbox:         toolbars, nav items, inline groups

Optical corrections:
  Icon in circle:  +1px bottom padding
  All-caps text:   asymmetric vertical padding
  Round buttons:   verify baseline at multiple sizes
```
