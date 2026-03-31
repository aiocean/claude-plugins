# Loading Patterns Library

Complete, copy-paste CSS/HTML implementations for every common loading state. Each pattern is self-contained and production-ready.

---

## 1. Skeleton Screen with Shimmer Effect

The gold standard for content loading. Mimics layout before data arrives.

```html
<div class="skeleton-card" aria-busy="true" aria-label="Loading article">
  <div class="skeleton-card__image skeleton"></div>
  <div class="skeleton-card__body">
    <div class="skeleton-card__meta">
      <div class="skeleton skeleton--circle skeleton--sm"></div>
      <div class="skeleton-card__meta-lines">
        <div class="skeleton skeleton--line skeleton--w60"></div>
        <div class="skeleton skeleton--line skeleton--w40 skeleton--sm-h"></div>
      </div>
    </div>
    <div class="skeleton skeleton--line skeleton--full"></div>
    <div class="skeleton skeleton--line skeleton--w80"></div>
    <div class="skeleton skeleton--line skeleton--w90"></div>
    <div class="skeleton skeleton--line skeleton--w50"></div>
  </div>
</div>
```

```css
/* ─── Skeleton base ─────────────────────────────────────── */
.skeleton {
  background-color: #e2e8f0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent          0%,
    rgba(255,255,255,.6) 50%,
    transparent         100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
}

@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

/* ─── Skeleton variants ──────────────────────────────────── */
.skeleton--line   { height: 1em; margin-bottom: .5em; border-radius: 3px; }
.skeleton--sm-h   { height: .75em; }
.skeleton--circle { border-radius: 50%; }

.skeleton--full { width: 100%; }
.skeleton--w90  { width: 90%; }
.skeleton--w80  { width: 80%; }
.skeleton--w60  { width: 60%; }
.skeleton--w40  { width: 40%; }
.skeleton--sm   { width: 32px; height: 32px; }

/* ─── Card layout ────────────────────────────────────────── */
.skeleton-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
  max-width: 380px;
}

.skeleton-card__image.skeleton {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0;
}

.skeleton-card__body { padding: 16px; }

.skeleton-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.skeleton-card__meta-lines { flex: 1; }

/* ─── Dark mode ──────────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
  .skeleton { background-color: #2d3748; }
  .skeleton::after {
    background: linear-gradient(
      90deg,
      transparent           0%,
      rgba(255,255,255,.07) 50%,
      transparent          100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.4s ease infinite;
  }
}
```

---

## 2. Spinner Variants

### Ring Spinner

```html
<div class="spinner spinner--ring" role="status" aria-label="Loading">
  <span class="sr-only">Loading...</span>
</div>
```

```css
.spinner--ring {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, .2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Sizes */
.spinner--sm { width: 20px; height: 20px; border-width: 2px; }
.spinner--lg { width: 64px; height: 64px; border-width: 4px; }
```

### Dot Pulse Spinner

```html
<div class="spinner spinner--dots" role="status" aria-label="Loading">
  <span></span><span></span><span></span>
  <span class="sr-only">Loading...</span>
</div>
```

```css
.spinner--dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.spinner--dots span {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  animation: dot-pulse 1.2s ease-in-out infinite;
}

.spinner--dots span:nth-child(2) { animation-delay: .2s; }
.spinner--dots span:nth-child(3) { animation-delay: .4s; }

@keyframes dot-pulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: .4; }
  40%           { transform: scale(1);   opacity: 1;  }
}
```

### Bounce Spinner

```html
<div class="spinner spinner--bounce" role="status" aria-label="Loading">
  <span></span><span></span><span></span>
</div>
```

```css
.spinner--bounce {
  display: inline-flex;
  align-items: flex-end;
  gap: 4px;
  height: 32px;
}

.spinner--bounce span {
  width: 6px;
  background: #3b82f6;
  border-radius: 3px;
  animation: bounce-bar .9s ease-in-out infinite;
}

.spinner--bounce span:nth-child(2) { animation-delay: .15s; }
.spinner--bounce span:nth-child(3) { animation-delay: .30s; }

@keyframes bounce-bar {
  0%, 100% { height: 8px;  }
  50%      { height: 28px; }
}
```

---

## 3. Progress Bar (Determinate & Indeterminate)

```html
<!-- Determinate -->
<div class="progress" role="progressbar"
     aria-valuenow="65" aria-valuemin="0" aria-valuemax="100"
     aria-label="Upload progress">
  <div class="progress__fill" style="--pct: 65%"></div>
</div>

<!-- Indeterminate -->
<div class="progress progress--indeterminate"
     role="progressbar" aria-label="Loading">
  <div class="progress__fill"></div>
</div>
```

```css
.progress {
  height: 6px;
  background: #e2e8f0;
  border-radius: 9999px;
  overflow: hidden;
  width: 100%;
}

/* Determinate */
.progress__fill {
  height: 100%;
  width: var(--pct, 0%);
  background: #3b82f6;
  border-radius: 9999px;
  transition: width .3s ease;
}

/* Indeterminate */
.progress--indeterminate .progress__fill {
  width: 40%;
  animation: progress-slide 1.4s ease-in-out infinite;
}

@keyframes progress-slide {
  0%   { transform: translateX(-150%); }
  100% { transform: translateX(350%); }
}

/* Striped variant */
.progress--striped .progress__fill {
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,.15) 25%, transparent 25%,
    transparent 50%, rgba(255,255,255,.15) 50%,
    rgba(255,255,255,.15) 75%, transparent 75%
  );
  background-size: 16px 16px;
  animation: progress-stripes .6s linear infinite;
}

@keyframes progress-stripes {
  from { background-position: 0 0; }
  to   { background-position: 16px 0; }
}
```

```javascript
// Update determinate progress
function setProgress(bar, percent) {
  bar.style.setProperty('--pct', `${percent}%`);
  bar.closest('[role=progressbar]').setAttribute('aria-valuenow', percent);
}
```

---

## 4. Content Placeholder

Generic block placeholder for unknown content structure.

```html
<div class="placeholder-block" aria-hidden="true">
  <div class="placeholder-block__header">
    <div class="skeleton skeleton--circle" style="width:48px;height:48px"></div>
    <div style="flex:1">
      <div class="skeleton skeleton--line skeleton--w60"></div>
      <div class="skeleton skeleton--line skeleton--w40 skeleton--sm-h"></div>
    </div>
  </div>
  <div class="placeholder-block__body">
    <div class="skeleton skeleton--line skeleton--full"></div>
    <div class="skeleton skeleton--line skeleton--w90"></div>
    <div class="skeleton skeleton--line skeleton--w80"></div>
  </div>
  <div class="placeholder-block__footer">
    <div class="skeleton skeleton--button"></div>
    <div class="skeleton skeleton--button skeleton--button-sm"></div>
  </div>
</div>
```

```css
.placeholder-block {
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.placeholder-block__header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.placeholder-block__footer {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.skeleton--button {
  height: 36px;
  width: 100px;
  border-radius: 6px;
}

.skeleton--button-sm {
  width: 80px;
}
```

---

## 5. Image Placeholder with Blur-Up

```html
<figure class="img-figure">
  <div class="img-blur-wrap" style="aspect-ratio: 16/9">
    <img
      class="img-blur-placeholder"
      src="data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoEAAMAAUAmJYgCdAEO/gHOAAA="
      data-src="/full-image.webp"
      alt="Mountain landscape at sunset"
      width="800"
      height="450"
    >
  </div>
  <figcaption>Mountain landscape</figcaption>
</figure>
```

```css
.img-figure { margin: 0; }

.img-blur-wrap {
  position: relative;
  overflow: hidden;
  background: #cbd5e1;
  border-radius: 8px;
}

.img-blur-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px);
  transform: scale(1.08); /* hide blur edge artifacts */
  transition: filter .5s ease, transform .5s ease, opacity .5s ease;
}

.img-blur-placeholder.loaded {
  filter: blur(0);
  transform: scale(1);
}
```

```javascript
(function initBlurUp() {
  document.querySelectorAll('.img-blur-placeholder[data-src]').forEach(img => {
    const full = new Image();
    full.onload = () => {
      img.src = img.dataset.src;
      // Force reflow to ensure transition fires
      img.getBoundingClientRect();
      img.classList.add('loaded');
    };
    full.src = img.dataset.src;
  });
})();
```

---

## 6. Inline Loading Button

```html
<button class="btn-load" data-loading="false" onclick="handleSubmit(this)">
  <span class="btn-load__spinner" aria-hidden="true"></span>
  <span class="btn-load__label">Save Changes</span>
  <span class="btn-load__label-loading">Saving...</span>
</button>
```

```css
.btn-load {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, opacity .15s;
  min-width: 140px;
  justify-content: center;
}

.btn-load:hover { background: #2563eb; }
.btn-load:active { background: #1d4ed8; }

/* Spinner (hidden by default) */
.btn-load__spinner {
  display: none;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  flex-shrink: 0;
}

/* Loading label (hidden by default) */
.btn-load__label-loading { display: none; }

/* Loading state */
.btn-load[data-loading="true"] {
  opacity: .85;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-load[data-loading="true"] .btn-load__spinner       { display: block; }
.btn-load[data-loading="true"] .btn-load__label         { display: none; }
.btn-load[data-loading="true"] .btn-load__label-loading { display: inline; }

/* Success state */
.btn-load[data-state="success"] { background: #10b981; }
.btn-load[data-state="error"]   { background: #ef4444; }
```

```javascript
async function handleSubmit(btn) {
  btn.dataset.loading = 'true';
  try {
    await api.save(getData());
    btn.dataset.loading = 'false';
    btn.dataset.state = 'success';
    btn.querySelector('.btn-load__label').textContent = 'Saved!';
    setTimeout(() => {
      btn.dataset.state = '';
      btn.querySelector('.btn-load__label').textContent = 'Save Changes';
    }, 2000);
  } catch {
    btn.dataset.loading = 'false';
    btn.dataset.state = 'error';
    setTimeout(() => { btn.dataset.state = ''; }, 2000);
  }
}
```

---

## 7. Page Transition Loader

Top-of-page progress bar for route changes (NProgress style).

```html
<!-- Place once in root layout, before </body> -->
<div class="page-loader" id="page-loader" aria-hidden="true">
  <div class="page-loader__bar"></div>
</div>
```

```css
.page-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity .2s;
}

.page-loader.active { opacity: 1; }

.page-loader__bar {
  height: 3px;
  background: #3b82f6;
  width: 0%;
  transition: width .3s ease;
  box-shadow: 0 0 10px rgba(59, 130, 246, .7);
}
```

```javascript
const PageLoader = {
  el: document.getElementById('page-loader'),
  bar: document.querySelector('.page-loader__bar'),
  timer: null,
  pct: 0,

  start() {
    this.pct = 10;
    this.el.classList.add('active');
    this._update();
    this._tick();
  },

  _tick() {
    this.timer = setInterval(() => {
      // Slow down as we approach 90%
      const increment = (90 - this.pct) * 0.1;
      this.pct = Math.min(this.pct + increment, 90);
      this._update();
    }, 400);
  },

  _update() {
    this.bar.style.width = `${this.pct}%`;
  },

  finish() {
    clearInterval(this.timer);
    this.pct = 100;
    this._update();
    setTimeout(() => {
      this.el.classList.remove('active');
      this.pct = 0;
      this.bar.style.width = '0%';
    }, 300);
  }
};

// Hook into SPA router
router.beforeEach(() => PageLoader.start());
router.afterEach(() => PageLoader.finish());
```

---

## 8. Pull-to-Refresh Indicator

```html
<div class="ptr-container" id="ptr">
  <div class="ptr-indicator" aria-live="polite" aria-atomic="true">
    <svg class="ptr-arrow" viewBox="0 0 24 24" width="24" height="24"
         fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 5v14M5 12l7 7 7-7"/>
    </svg>
    <div class="ptr-spinner spinner spinner--ring" style="display:none"></div>
    <span class="ptr-text">Pull to refresh</span>
  </div>
  <div class="ptr-content" id="ptr-content">
    <!-- Page content -->
  </div>
</div>
```

```css
.ptr-container {
  overflow-y: auto;
  overscroll-behavior-y: contain;
  position: relative;
}

.ptr-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  transform: translateY(-100%);
  transition: transform .2s ease, opacity .2s;
  opacity: 0;
  color: #64748b;
  font-size: 13px;
}

.ptr-container.ptr-pulling   .ptr-indicator { opacity: 1; }
.ptr-container.ptr-triggered .ptr-indicator { opacity: 1; transform: translateY(0); }

.ptr-arrow {
  transition: transform .2s;
  color: #94a3b8;
}

.ptr-container.ptr-ready .ptr-arrow {
  transform: rotate(180deg);
}

.ptr-content {
  transition: transform .2s ease;
}

.ptr-container.ptr-triggered .ptr-content {
  transform: translateY(64px);
}
```

```javascript
let startY = 0, currentY = 0, pulling = false;
const ptr = document.getElementById('ptr');

ptr.addEventListener('touchstart', e => {
  if (ptr.scrollTop > 0) return;
  startY = e.touches[0].clientY;
  pulling = true;
}, { passive: true });

ptr.addEventListener('touchmove', e => {
  if (!pulling) return;
  currentY = e.touches[0].clientY;
  const delta = Math.max(0, currentY - startY);
  if (delta > 0)   ptr.classList.add('ptr-pulling');
  if (delta > 60)  ptr.classList.add('ptr-ready');
  else             ptr.classList.remove('ptr-ready');
}, { passive: true });

ptr.addEventListener('touchend', async () => {
  if (!pulling) return;
  pulling = false;
  const delta = currentY - startY;
  if (delta > 60) {
    ptr.classList.add('ptr-triggered');
    ptr.classList.remove('ptr-pulling', 'ptr-ready');
    await refreshContent();
    ptr.classList.remove('ptr-triggered');
  } else {
    ptr.classList.remove('ptr-pulling', 'ptr-ready');
  }
});
```

---

## 9. Infinite Scroll Trigger

```html
<ul id="feed" class="feed">
  <!-- Items rendered here -->
</ul>
<div class="feed-sentinel" id="feed-sentinel" aria-hidden="true">
  <div class="spinner spinner--dots"></div>
</div>
<div class="feed-end" id="feed-end" hidden>
  <p>You've reached the end</p>
</div>
```

```css
.feed-sentinel {
  display: flex;
  justify-content: center;
  padding: 32px 0;
  min-height: 80px;
}

.feed-end {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 14px;
}
```

```javascript
let page = 1, loading = false, exhausted = false;

const sentinel = document.getElementById('feed-sentinel');
const feedEnd  = document.getElementById('feed-end');
const feed     = document.getElementById('feed');

const observer = new IntersectionObserver(async (entries) => {
  if (!entries[0].isIntersecting || loading || exhausted) return;

  loading = true;
  try {
    const items = await api.getPage(++page);

    if (items.length === 0) {
      exhausted = true;
      sentinel.hidden = true;
      feedEnd.hidden = false;
      observer.disconnect();
      return;
    }

    items.forEach(item => feed.appendChild(renderItem(item)));
  } finally {
    loading = false;
  }
}, {
  rootMargin: '0px 0px 300px 0px' // trigger 300px before sentinel is visible
});

observer.observe(sentinel);
```

---

## 10. Lazy Component Placeholder

Placeholder shown while a dynamic component chunk is being downloaded.

```html
<!-- Shown while JS chunk loads -->
<div class="lazy-placeholder" aria-busy="true" aria-label="Loading component">
  <div class="lazy-placeholder__inner">
    <div class="spinner spinner--ring"></div>
    <p class="lazy-placeholder__text">Loading...</p>
  </div>
</div>
```

```css
.lazy-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
}

.lazy-placeholder__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.lazy-placeholder__text {
  font-size: 14px;
  color: #94a3b8;
}
```

```jsx
// React: Suspense fallback
import { Suspense, lazy } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<LazyPlaceholder />}>
      <HeavyChart data={chartData} />
    </Suspense>
  );
}

function LazyPlaceholder() {
  return (
    <div className="lazy-placeholder" aria-busy="true">
      <div className="lazy-placeholder__inner">
        <div className="spinner spinner--ring" aria-label="Loading component" />
        <p className="lazy-placeholder__text">Loading chart...</p>
      </div>
    </div>
  );
}
```

```javascript
// Vue: defineAsyncComponent
import { defineAsyncComponent, h } from 'vue';

const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart.vue'),
  loadingComponent: { render: () => h('div', { class: 'lazy-placeholder' }, '...') },
  delay: 200,        // show placeholder only if load takes > 200ms
  timeout: 10000,    // error after 10s
});
```

---

## Accessibility Boilerplate

Apply to all loading states.

```css
/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

```html
<!-- Announce loading completion -->
<div id="load-status"
     role="status"
     aria-live="polite"
     aria-atomic="true"
     class="sr-only">
  <!-- Set textContent dynamically -->
</div>
```

```javascript
const status = document.getElementById('load-status');

async function loadData() {
  status.textContent = 'Loading...';
  const data = await fetch('/api/data').then(r => r.json());
  renderData(data);
  status.textContent = `${data.length} items loaded`;
}
```

---

## Pattern Quick Reference

| Pattern | Use Case | Key CSS |
|---------|----------|---------|
| Skeleton shimmer | Content with known structure | `@keyframes shimmer`, `::after` overlay |
| Ring spinner | Short atomic actions | `border` + `rotate` |
| Dot pulse | Inline / chat-style loading | `scale` + `opacity` |
| Determinate bar | File upload, multi-step | `--pct` CSS variable |
| Indeterminate bar | Unknown duration | `translateX` animation |
| Blur-up image | Images with LQIP placeholder | `filter: blur` + transition |
| Inline button loader | Form submit feedback | `data-loading` attribute |
| Page transition bar | SPA route changes | Fixed top bar + JS API |
| Pull-to-refresh | Mobile list refresh | Touch events + `translateY` |
| Infinite scroll | Pagination replacement | `IntersectionObserver` |
| Lazy component | Code-split chunk loading | Suspense / async component |
