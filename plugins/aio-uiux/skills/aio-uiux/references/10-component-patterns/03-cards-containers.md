# Cards & Containers

## Card Anatomy

A card is a contained unit of related information. It should represent one coherent entity or action — not a grab-bag of unrelated content.

```
┌─────────────────────────────────┐
│  [Media / Image]                │  ← optional, top or left
├─────────────────────────────────┤
│  [Eyebrow / Category]           │  ← optional
│  Title                          │  ← required
│  Subtitle / Metadata            │  ← optional
├─────────────────────────────────┤
│  Body text / content            │  ← optional
│  Supporting details             │
├─────────────────────────────────┤
│  [Tag] [Tag]        [Action]    │  ← optional footer
└─────────────────────────────────┘
```

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden; /* clips media to border-radius */
  display: flex;
  flex-direction: column;
}

.card-media { aspect-ratio: 16/9; overflow: hidden; }
.card-media img { width: 100%; height: 100%; object-fit: cover; }

.card-body {
  padding: 16px;
  flex: 1; /* pushes footer to bottom */
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
```

---

## Interactive vs Static Cards

### Static Card
Displays information only. No click target. No hover effect.

```html
<div class="card">
  <div class="card-body">
    <h3>Monthly Report</h3>
    <p>Revenue increased 12% this month.</p>
  </div>
</div>
```

### Interactive Card (Clickable)
The entire card is a link or button. One primary action target.

```html
<!-- Entire card is a link -->
<a href="/articles/123" class="card card--interactive">
  <div class="card-media">...</div>
  <div class="card-body">
    <h3>Article Title</h3>
    <p class="card-excerpt">...</p>
  </div>
</a>
```

```css
.card--interactive {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 200ms ease, transform 200ms ease;
}
.card--interactive:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.card--interactive:focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
}
.card--interactive:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
```

### Card with Multiple Actions
When a card has multiple interaction points (primary action + secondary actions), do NOT make the whole card clickable. Use explicit buttons and a stretched link for the primary.

```html
<div class="card">
  <div class="card-body">
    <h3>
      <!-- Stretched link covers the card for the primary action -->
      <a href="/product/42" class="card-primary-link">Product Name</a>
    </h3>
    <p>Product description...</p>
  </div>
  <div class="card-footer">
    <button class="btn btn-ghost btn-sm">
      <svg aria-hidden="true"><!-- heart --></svg>
      Save
    </button>
    <!-- Relative positioning required for stretched link -->
    <button class="btn btn-primary btn-sm">Add to Cart</button>
  </div>
</div>
```

```css
/* Stretched link technique */
.card { position: relative; }
.card-primary-link::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
}
/* Secondary actions must be z-index: 1 to stay clickable above stretched link */
.card-footer .btn { position: relative; z-index: 1; }
```

---

## Card Grid Layouts

### Auto-fill Grid (responsive, no media queries needed)
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
```

### Fixed Column Grid with Breakpoints
```css
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 640px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .card-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 1280px) {
  .card-grid { grid-template-columns: repeat(4, 1fr); }
}
```

### Equal Height Cards in Grid
```css
/* Cards in same row stretch to equal height */
.card-grid { align-items: stretch; }
.card { height: 100%; } /* combined with flex-direction: column + flex: 1 on body */
```

### Masonry Layout
```css
/* CSS masonry (limited browser support as of 2024) */
.card-grid--masonry {
  columns: 3;
  column-gap: 24px;
}
.card { break-inside: avoid; margin-bottom: 24px; }

/* JS alternative: use Masonry.js or CSS grid with JS positioning */
```

---

## Card Hover Effects

### Elevation Lift (most common)
```css
.card--interactive:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}
```

### Border Highlight
```css
.card--interactive:hover {
  border-color: var(--color-brand-400);
}
```

### Image Zoom
```css
.card-media { overflow: hidden; }
.card-media img {
  transition: transform 400ms ease;
}
.card--interactive:hover .card-media img {
  transform: scale(1.05);
}
```

### Overlay Reveal (for media cards)
```css
.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 300ms ease;
  display: flex;
  align-items: flex-end;
  padding: 16px;
}
.card--interactive:hover .card-overlay { opacity: 1; }
```

**Respect motion preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  .card--interactive { transition: box-shadow 150ms; }
  .card--interactive:hover { transform: none; }
}
```

---

## Card Variants

### Horizontal Card
Media on left, content on right. Good for lists/feeds.

```css
.card--horizontal {
  flex-direction: row;
}
.card--horizontal .card-media {
  width: 140px;
  flex-shrink: 0;
  aspect-ratio: auto;
}
/* Stack on small screens */
@media (max-width: 480px) {
  .card--horizontal { flex-direction: column; }
  .card--horizontal .card-media { width: 100%; aspect-ratio: 16/9; }
}
```

### Pricing Card
Common pattern for SaaS pricing pages.

```html
<div class="card card--pricing" aria-label="Pro plan">
  <div class="card-body">
    <p class="pricing-tier">Pro</p>
    <div class="pricing-price">
      <span class="price-amount">$49</span>
      <span class="price-period">/month</span>
    </div>
    <p class="pricing-tagline">For growing teams</p>
    <ul class="feature-list" aria-label="Features included">
      <li><svg aria-hidden="true"><!-- check --></svg> Unlimited projects</li>
      <li><svg aria-hidden="true"><!-- check --></svg> 50GB storage</li>
      <li class="feature-excluded" aria-label="Not included">
        <svg aria-hidden="true"><!-- x --></svg> SSO
      </li>
    </ul>
    <a href="/signup?plan=pro" class="btn btn-primary btn-full">Get started</a>
  </div>
</div>
```

### Profile / Person Card
```html
<div class="card card--profile">
  <div class="card-body" style="text-align: center;">
    <img src="avatar.jpg" alt="Sarah Chen" class="avatar avatar--lg" />
    <h3>Sarah Chen</h3>
    <p class="text-muted">Senior Designer</p>
    <div class="social-links">...</div>
  </div>
</div>
```

### Media / Video Card
```html
<div class="card card--media">
  <div class="card-media card-media--video">
    <img src="thumbnail.jpg" alt="Video: Intro to Design Systems" />
    <button class="play-btn" aria-label="Play Intro to Design Systems">
      <svg aria-hidden="true"><!-- play icon --></svg>
    </button>
    <span class="duration" aria-label="Duration: 12 minutes">12:34</span>
  </div>
  <div class="card-body">
    <h3>Intro to Design Systems</h3>
    <p class="text-muted">12:34 · Design · 4.2k views</p>
  </div>
</div>
```

---

## Skeleton Cards

Show structural placeholder while content loads. Reduces perceived loading time.

```html
<div class="card card--skeleton" aria-busy="true" aria-label="Loading content">
  <div class="skeleton skeleton--media"></div>
  <div class="card-body">
    <div class="skeleton skeleton--text" style="width: 60%; height: 20px;"></div>
    <div class="skeleton skeleton--text" style="width: 90%; height: 14px;"></div>
    <div class="skeleton skeleton--text" style="width: 75%; height: 14px;"></div>
  </div>
</div>
```

```css
.skeleton {
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  100% { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; opacity: 0.5; }
}
```

**Key rules:**
- Match skeleton shape closely to real content shape
- Use `aria-busy="true"` on the loading container
- Add `aria-live="polite"` on the container so screen readers announce when content loads
- Show skeletons for async loads; use spinners for triggered actions

---

## Containers

### Section Container
Wraps a page section. Controls max-width and horizontal padding.

```css
.container {
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: clamp(16px, 5vw, 48px);
}

/* Variants */
.container--sm { max-width: 768px; }
.container--md { max-width: 1024px; }
.container--lg { max-width: 1280px; }
.container--xl { max-width: 1536px; }
.container--full { max-width: 100%; }
```

### Panel
Contained content area with background, border, and padding. Used for settings sections, sidebar content, info blocks.

```css
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
}
.panel--subtle {
  background: var(--color-surface-subtle);
  border: none;
}
.panel--elevated {
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  border: none;
}
```

### Well / Inset
Recessed content area. Commonly used for code blocks, nested content, or emphasized data.

```css
.well {
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
}
```

### Callout / Highlight Box
Draws attention to important information within a content flow.

```css
.callout {
  padding: 16px;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--callout-color, var(--color-brand-500));
  background: var(--callout-bg, var(--color-brand-50));
  display: flex;
  gap: 12px;
}
.callout--info    { --callout-color: var(--color-blue-500);   --callout-bg: var(--color-blue-50); }
.callout--warning { --callout-color: var(--color-amber-500);  --callout-bg: var(--color-amber-50); }
.callout--danger  { --callout-color: var(--color-red-500);    --callout-bg: var(--color-red-50); }
.callout--success { --callout-color: var(--color-green-500);  --callout-bg: var(--color-green-50); }
```

---

## Dividers and Separators

### Horizontal Rule
```css
.divider {
  border: none;
  border-top: 1px solid var(--color-border-subtle);
  margin: 24px 0;
}
/* With label */
.divider--labeled {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-muted);
  font-size: 13px;
}
.divider--labeled::before,
.divider--labeled::after {
  content: '';
  flex: 1;
  border-top: 1px solid var(--color-border-subtle);
}
```

```html
<div class="divider--labeled" role="separator">or</div>
```

### Vertical Divider (in lists/toolbars)
```css
.divider--vertical {
  display: inline-block;
  width: 1px;
  height: 20px;
  background: var(--color-border-subtle);
  margin: 0 8px;
  vertical-align: middle;
}
```

### Section Divider with Spacing
```html
<hr class="divider" aria-hidden="true" />
```
Use `aria-hidden="true"` on decorative dividers. Use `role="separator"` for semantic divisions.

---

## Card Accessibility Checklist

- Interactive cards: use `<a>` for navigation, `<button>` for actions
- Card headings: use proper heading hierarchy (`h2`, `h3`) matching page outline
- Images: descriptive `alt` text; decorative images get `alt=""`
- Multiple actions: avoid making entire card clickable when secondary actions exist
- Skeleton screens: `aria-busy="true"`, `aria-live="polite"` on container
- Status badges on cards: supplement color with text or icon+text
- Card grids: no additional ARIA needed (grid layout is visual only)
- Expandable cards: `aria-expanded` on the toggle button
- Draggable cards (Kanban): full keyboard support required — see 08-complex-components.md

---

## Common Card Pitfalls

1. **Cards within cards** — creates visual confusion; flatten the hierarchy
2. **Too much content in one card** — if a card needs scrolling, it's not a card; use a page
3. **Inconsistent card heights in grid** — use `align-items: stretch` and flex layout
4. **Clickable whole card + nested links** — creates nested interactive elements (invalid HTML, broken UX)
5. **No visual feedback on hover** for interactive cards — users cannot tell it's clickable
6. **Skeleton that doesn't match real layout** — jarring content jump when data loads
7. **Missing heading hierarchy** — card titles should not all be `<p>` or `<div>`
8. **Hard-coded card widths** — always use responsive grid or flex layouts
