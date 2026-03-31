# Perceived Performance

Perceived performance is not how fast your app is — it is how fast users *feel* it is. A 2-second load that feels instant beats a 1-second load that feels sluggish. Psychology, not milliseconds, governs user satisfaction.

---

## The Psychology of Waiting

### Why Waiting Feels Worse Than It Is

Human perception of time is non-linear. Research on wait psychology (Maister, 1985; Nielsen, 1993) identifies these principles:

- **Occupied time feels shorter**: A progress indicator makes waiting feel 38% shorter than a blank screen
- **Anxiety lengthens perceived time**: Uncertainty ("is it broken?") amplifies wait perception 2–4×
- **Beginnings and endings dominate memory**: Fast start + slow middle beats slow start + fast end
- **Uncertain waits feel longer than known waits**: Even an inaccurate estimate beats no estimate
- **Unpleasant waits feel longer**: Error states during loading compound perceived time

### The 3 Time Thresholds (Nielsen)

| Threshold | Duration | User Expectation |
|-----------|----------|-----------------|
| Immediate response | < 100ms | Action feels instantaneous |
| Flow maintained | 100ms – 1s | User notices delay but stays focused |
| Attention span limit | 1s – 10s | User starts thinking about other things |
| Context lost | > 10s | User abandons or multitasks |

**Rule**: Provide feedback within 100ms of any user action. Always.

---

## Skeleton Screens

Skeleton screens show the *shape* of incoming content before it arrives. They reduce perceived load time by 20–30% compared to spinners because the user's brain starts parsing layout immediately.

### When to Use Skeletons vs Spinners vs Progress Bars

| Pattern | Use When |
|---------|----------|
| **Skeleton** | Content structure is predictable (cards, lists, profiles) |
| **Spinner** | Duration is short (< 2s), structure is unknown, or action is atomic |
| **Progress bar** | Duration is long (> 3s), progress is measurable, file upload/download |
| **Nothing** | Duration is < 100ms; adding feedback would flash and annoy |

### Skeleton Design Principles

1. Match the real layout closely — wrong shape breaks the illusion
2. Use muted colors (gray tones), never brand colors
3. Animate with a shimmer/wave, not a pulse — shimmer signals "loading" more clearly
4. Remove skeletons as content arrives, not all at once if possible
5. Don't show skeleton for cached/instant data

### CSS Skeleton Implementation

```css
/* Base skeleton styles */
.skeleton {
  background: #e2e8f0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

/* Shimmer animation */
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.6) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

/* Skeleton variants */
.skeleton-text {
  height: 1em;
  margin-bottom: 0.5em;
  border-radius: 3px;
}

.skeleton-text.short  { width: 60%; }
.skeleton-text.medium { width: 80%; }
.skeleton-text.full   { width: 100%; }

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-thumbnail {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
}

.skeleton-button {
  height: 36px;
  width: 120px;
  border-radius: 6px;
}
```

### Card Skeleton Layout

```html
<div class="card-skeleton" aria-busy="true" aria-label="Loading content">
  <div class="skeleton skeleton-thumbnail"></div>
  <div class="card-body">
    <div class="skeleton skeleton-avatar"></div>
    <div class="card-text">
      <div class="skeleton skeleton-text full"></div>
      <div class="skeleton skeleton-text medium"></div>
      <div class="skeleton skeleton-text short"></div>
    </div>
  </div>
</div>
```

```css
.card-skeleton {
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.card-body {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  align-items: flex-start;
}

.card-text {
  flex: 1;
}
```

### Dark Mode Skeletons

```css
@media (prefers-color-scheme: dark) {
  .skeleton {
    background: #2d3748;
  }

  .skeleton::after {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.08) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
}
```

---

## Progressive Loading

Load the most important content first. Defer everything else.

### Priority Tiers

```
Tier 1 (immediate):   HTML structure, critical CSS, above-fold text
Tier 2 (fast):        Hero images, primary navigation, first-screen data
Tier 3 (deferred):    Below-fold images, secondary data, analytics
Tier 4 (lazy):        Comments, related content, social embeds
```

### Implementation Pattern

```html
<!-- Tier 1: inline critical CSS in <head> -->
<style>/* critical.css inlined */</style>

<!-- Tier 2: preload hero image -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

<!-- Tier 3: load non-critical CSS async -->
<link rel="stylesheet" href="/app.css" media="print" onload="this.media='all'">

<!-- Tier 4: lazy load below-fold content -->
<img loading="lazy" src="/article-image.webp" alt="...">
```

---

## Optimistic UI Updates

Update the UI *before* the server confirms the action. Roll back only on failure.

### When to Use Optimistic Updates

- Like/bookmark/follow toggle (high success rate, low stakes)
- Form submissions with validation already done client-side
- Reorder operations (drag-and-drop)
- Delete operations (with undo affordance)

### When NOT to Use

- Financial transactions (payment confirmation)
- Irreversible actions without undo
- Operations with high failure rates

### Pattern

```javascript
// Optimistic update pattern
async function toggleLike(postId) {
  // 1. Capture current state for rollback
  const previousState = store.getLiked(postId);

  // 2. Update UI immediately
  store.setLiked(postId, !previousState);
  updateLikeButton(postId, !previousState);

  try {
    // 3. Fire server request
    await api.toggleLike(postId);
  } catch (error) {
    // 4. Rollback on failure
    store.setLiked(postId, previousState);
    updateLikeButton(postId, previousState);
    showToast('Failed to update. Please try again.');
  }
}
```

### Optimistic Delete with Undo

```javascript
function deleteItem(id) {
  // Remove from UI immediately
  const item = list.removeItem(id);

  // Show undo toast
  const toast = showToast('Item deleted', {
    action: { label: 'Undo', handler: () => {
      list.restoreItem(item);
      clearTimeout(deleteTimer);
    }}
  });

  // Delay actual deletion to allow undo
  const deleteTimer = setTimeout(async () => {
    try {
      await api.delete(id);
    } catch {
      list.restoreItem(item);
      showToast('Could not delete item');
    }
  }, 5000);
}
```

---

## Blur-Up Image Loading (LQIP / SQIP)

Show a blurred placeholder immediately, then transition to the full image.

### LQIP (Low Quality Image Placeholder)

Generate a tiny version (20–40px wide) of the image, encode as base64, inline in HTML. Zero network request for the placeholder.

```html
<!-- img with LQIP base64 placeholder -->
<div class="img-wrapper">
  <img
    src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/..."
    data-src="/full-image.webp"
    class="lqip-img"
    alt="Mountain landscape"
    width="800"
    height="450"
  >
</div>
```

```css
.img-wrapper {
  position: relative;
  overflow: hidden;
  background: #f0f0f0;
  aspect-ratio: 16 / 9;
}

.lqip-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px);
  transform: scale(1.1); /* hide blur edge artifacts */
  transition: filter 0.4s ease, transform 0.4s ease;
}

.lqip-img.loaded {
  filter: blur(0);
  transform: scale(1);
}
```

```javascript
document.querySelectorAll('.lqip-img[data-src]').forEach(img => {
  const full = new Image();
  full.src = img.dataset.src;
  full.onload = () => {
    img.src = img.dataset.src;
    img.classList.add('loaded');
  };
});
```

### SQIP (SVG Quality Image Placeholder)

SQIP uses primitive shapes (SVG) instead of a blurred bitmap. Produces smaller placeholders with sharper perceived quality.

```html
<!-- SVG placeholder inline -->
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img
    src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'...>"
    data-src="/hero.jpg"
    class="sqip-img"
    alt="Hero image"
    width="1200"
    height="600"
  >
</picture>
```

---

## Instant Feedback on User Action

Every interactive element must respond within 100ms. If the real action takes longer, fake the response.

### Tap/Click Ripple

```css
.btn {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.btn .ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0);
  animation: ripple-out 0.6s ease-out forwards;
  pointer-events: none;
}

@keyframes ripple-out {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

```javascript
function addRipple(btn) {
  btn.addEventListener('pointerdown', (e) => {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}
```

### Loading State on Submit Button

```css
.btn-submit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  transition: opacity 0.2s;
}

.btn-submit[aria-busy="true"] {
  opacity: 0.8;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-submit .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: none;
}

.btn-submit[aria-busy="true"] .spinner {
  display: block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Preloading and Prefetching Strategies

### Resource Hints Cheat Sheet

```html
<!-- dns-prefetch: resolve DNS for external domain early -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">

<!-- preconnect: DNS + TCP + TLS handshake for critical origins -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- preload: fetch critical resource for THIS page NOW -->
<link rel="preload" as="font"   href="/fonts/Inter.woff2" crossorigin>
<link rel="preload" as="image"  href="/hero.webp" fetchpriority="high">
<link rel="preload" as="script" href="/critical.js">
<link rel="preload" as="style"  href="/above-fold.css">

<!-- prefetch: low-priority fetch for NEXT page -->
<link rel="prefetch" href="/dashboard.js">
<link rel="prefetch" href="/product-detail.html">

<!-- prerender: full render of likely-next page (Chrome only, heavy) -->
<link rel="prerender" href="/checkout">
```

### Route-Based Prefetching (SPA Pattern)

```javascript
// Prefetch on hover with debounce
const prefetchCache = new Set();

function prefetchRoute(href) {
  if (prefetchCache.has(href)) return;
  prefetchCache.add(href);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

document.querySelectorAll('a[data-prefetch]').forEach(a => {
  let timer;
  a.addEventListener('mouseenter', () => {
    timer = setTimeout(() => prefetchRoute(a.href), 100);
  });
  a.addEventListener('mouseleave', () => clearTimeout(timer));
  a.addEventListener('touchstart', () => prefetchRoute(a.href), { passive: true });
});
```

### Intersection Observer Prefetch

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const href = entry.target.getAttribute('href');
      if (href) prefetchRoute(href);
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: '0px 0px 200px 0px' }); // 200px before visible

document.querySelectorAll('nav a, .card a').forEach(a => observer.observe(a));
```

---

## Progress Indicators: Decision Guide

```
User action
    │
    ├─ Response < 100ms ──────────────────── No indicator needed
    │
    ├─ Response 100ms – 1s ───────────────── Disable button only (no spinner)
    │                                         or inline micro-spinner
    ├─ Response 1s – 3s
    │       ├─ Known structure? ──────────── Skeleton screen
    │       └─ Unknown structure? ─────────── Spinner (centered)
    │
    └─ Response > 3s
            ├─ Measurable progress? ────────── Progress bar (determinate)
            └─ Not measurable? ─────────────── Progress bar (indeterminate)
                                               + descriptive status text
```

### Accessibility Notes

- Always set `aria-busy="true"` on loading containers
- Set `aria-label="Loading..."` on spinners (they have no text)
- Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for progress bars
- Announce completion with `aria-live="polite"` region

```html
<div role="progressbar"
     aria-valuenow="65"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Upload progress">
  <div class="progress-fill" style="width: 65%"></div>
</div>

<div aria-live="polite" aria-atomic="true" class="sr-only" id="status">
  <!-- Updated dynamically: "Upload complete" -->
</div>
```
