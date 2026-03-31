# Core Web Vitals

Core Web Vitals (CWV) are Google's standardized metrics for real-user experience quality. They directly affect Search ranking (via Page Experience signal) and are the most actionable performance targets available.

---

## The Three Core Metrics

| Metric | Measures | Good | Needs Improvement | Poor |
|--------|----------|------|-------------------|------|
| **LCP** | Loading performance | ≤ 2.5s | 2.5s – 4.0s | > 4.0s |
| **INP** | Interactivity | ≤ 200ms | 200ms – 500ms | > 500ms |
| **CLS** | Visual stability | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |

**Pass threshold**: 75th percentile of all page loads must be in the "Good" range.

---

## LCP — Largest Contentful Paint

### What LCP Measures

Time from navigation start until the largest visible content element renders in the viewport.

### What Elements Count as LCP Candidates

- `<img>` elements
- `<image>` inside `<svg>`
- `<video>` poster images
- Elements with `background-image` loaded via CSS
- Block-level elements containing text (p, h1, div, etc.)

**Does NOT count**: SVG elements, `<canvas>`, `<video>` frames after poster

### LCP Breakdown

```
Navigation start
    │
    ├── TTFB (Time to First Byte)          ← server response speed
    ├── Resource load delay                 ← when browser discovers LCP resource
    ├── Resource load duration              ← time to download LCP resource
    └── Element render delay               ← time to paint after download
```

Optimize the largest chunk first.

### LCP Optimization Strategies

**1. Eliminate render-blocking resources**
```html
<!-- BAD: blocks rendering -->
<link rel="stylesheet" href="/everything.css">
<script src="/bundle.js"></script>

<!-- GOOD: non-render-blocking -->
<link rel="stylesheet" href="/critical.css">              <!-- inline critical -->
<link rel="stylesheet" href="/app.css" media="print"
      onload="this.media='all'">                          <!-- async non-critical CSS -->
<script src="/bundle.js" defer></script>                  <!-- defer scripts -->
```

**2. Preload the LCP image**
```html
<!-- Tell browser about hero image in <head>, before it parses <body> -->
<link rel="preload"
      as="image"
      href="/hero.webp"
      imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
      imagesizes="100vw"
      fetchpriority="high">
```

**3. Set fetchpriority="high" on LCP image**
```html
<img src="/hero.webp"
     fetchpriority="high"
     loading="eager"
     decoding="async"
     width="1200"
     height="600"
     alt="Hero">
```

**4. Optimize TTFB**
- Use a CDN for static assets
- Enable HTTP/2 or HTTP/3
- Cache HTML at edge (for static/SSG pages)
- Reduce server processing time

**5. Use modern image formats**
```html
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="Hero" width="1200" height="600" fetchpriority="high">
</picture>
```

**6. Remove `loading="lazy"` from LCP image**
Lazy loading delays LCP. Only use it on below-fold images.

---

## INP — Interaction to Next Paint

### What INP Measures

The longest interaction latency across the entire page visit (excluding outliers), covering:
- Click / tap events
- Keyboard events
- Pointer events (pointerdown, pointerup)

Does NOT include: scroll, hover, pinch-zoom.

### INP Breakdown

```
User input
    │
    ├── Input delay        ← main thread busy (blocked by long tasks)
    ├── Processing time    ← event handler execution time
    └── Presentation delay ← rendering after handler completes
```

### Event Handling Optimization

**1. Keep event handlers fast (< 50ms of processing)**
```javascript
// BAD: heavy synchronous work in handler
button.addEventListener('click', () => {
  const result = expensiveComputation(largeDataset); // 300ms
  updateDOM(result);
});

// GOOD: yield to browser, do heavy work async
button.addEventListener('click', async () => {
  updateDOM({ loading: true }); // instant feedback
  await scheduler.yield();       // yield to browser paint
  const result = await runInWorker(largeDataset);
  updateDOM(result);
});
```

**2. Yield to Main Thread**

The browser cannot paint while JavaScript is running. Break long tasks.

```javascript
// scheduler.yield() — modern (Chrome 115+)
async function processItems(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    // Yield every 50 items to let browser paint/respond
    if (i % 50 === 0) {
      await scheduler.yield();
    }
  }
}

// setTimeout(0) fallback for older browsers
function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function processItemsCompat(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    if (i % 50 === 0) await yieldToMain();
  }
}
```

**3. Move heavy work to Web Workers**
```javascript
// worker.js
self.onmessage = ({ data }) => {
  const result = heavyComputation(data);
  self.postMessage(result);
};

// main.js
const worker = new Worker('/worker.js');

button.addEventListener('click', () => {
  updateUI({ loading: true });
  worker.postMessage(inputData);
});

worker.onmessage = ({ data }) => {
  updateUI({ loading: false, result: data });
};
```

**4. Debounce non-critical handlers**
```javascript
// Typing in search — don't run on every keystroke
const debouncedSearch = debounce(async (query) => {
  const results = await api.search(query);
  renderResults(results);
}, 300);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

**5. Use `isInputPending` to avoid unnecessary yields**
```javascript
async function processQueue(queue) {
  for (const task of queue) {
    process(task);
    // Only yield if user is trying to interact
    if (navigator.scheduling?.isInputPending()) {
      await yieldToMain();
    }
  }
}
```

---

## CLS — Cumulative Layout Shift

### What CLS Measures

Sum of all unexpected layout shifts during page lifetime, weighted by impact fraction × distance fraction. A layout shift occurs when a visible element changes position without user interaction.

### Common CLS Causes and Fixes

**1. Images without dimensions**
```html
<!-- BAD: browser doesn't know aspect ratio, layout shifts when image loads -->
<img src="/photo.jpg" alt="Photo">

<!-- GOOD: explicit dimensions allow browser to reserve space -->
<img src="/photo.jpg" alt="Photo" width="800" height="600">
```

```css
/* Also use aspect-ratio as CSS fallback */
img {
  max-width: 100%;
  height: auto;
  aspect-ratio: attr(width) / attr(height); /* future CSS */
}

/* Or use the padding-hack for responsive containers */
.img-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  overflow: hidden;
}
.img-container img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**2. Ads and embeds without reserved space**
```css
/* Reserve space for ad slots */
.ad-slot {
  min-height: 250px;   /* standard banner height */
  width: 300px;
  background: #f5f5f5; /* placeholder color */
}
```

**3. Dynamically injected content above existing content**
```javascript
// BAD: prepending pushes existing content down
list.prepend(newItem);

// GOOD: append (below fold) or animate in with fixed height
function insertNotification(msg) {
  const el = document.createElement('div');
  el.className = 'notification';
  el.textContent = msg;
  // Fixed position = no layout shift
  el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:1000';
  document.body.appendChild(el);
}
```

**4. Web fonts causing FOUT/FOIT layout shift**
```css
/* Use font-display: optional to never shift layout */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: optional; /* don't swap if not ready */
}

/* Or use size-adjust to match fallback metrics */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
  size-adjust: 98%;            /* tweak to match system font */
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

**5. Animations that move elements**
```css
/* BAD: animating top/left causes layout shift */
.slide-in {
  animation: slide 0.3s ease;
}
@keyframes slide {
  from { margin-left: -100px; }  /* causes layout recalc */
  to   { margin-left: 0; }
}

/* GOOD: use transform — compositor only, no layout */
.slide-in {
  animation: slide 0.3s ease;
}
@keyframes slide {
  from { transform: translateX(-100px); }
  to   { transform: translateX(0); }
}
```

---

## Measurement Tools

### 1. Web Vitals JavaScript Library (real-user)

```javascript
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, rating, delta, id }) {
  // rating: 'good' | 'needs-improvement' | 'poor'
  console.log(`${name}: ${value}ms (${rating})`);

  // Send to your analytics
  fetch('/analytics', {
    method: 'POST',
    body: JSON.stringify({ metric: name, value, rating, url: location.href }),
  });
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### 2. Lighthouse (lab data)

```bash
# CLI
npx lighthouse https://example.com --output=html --view

# With specific form factor
npx lighthouse https://example.com \
  --preset=desktop \
  --throttling-method=simulate \
  --output=json > report.json
```

### 3. Chrome DevTools

- **Performance panel**: Record page load, see LCP/CLS annotations on timeline
- **Performance Insights**: Dedicated CWV breakdown panel
- **Rendering tab**: Enable "Layout Shift Regions" to highlight shifting elements

### 4. Chrome User Experience Report (CrUX)

Real-user data from Chrome users. Access via:
- PageSpeed Insights (UI): `pagespeed.web.dev`
- CrUX API: `https://chromeuxreport.googleapis.com/v1/records:queryRecord`
- BigQuery: `chrome-ux-report.country_us.202501`

```javascript
// CrUX API quick check
const response = await fetch(
  'https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=YOUR_KEY',
  {
    method: 'POST',
    body: JSON.stringify({
      url: 'https://example.com/',
      metrics: ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift']
    })
  }
);
const data = await response.json();
```

---

## Priority Optimization Order

Work on the issue with the biggest user impact first. Use this sequence:

```
1. Fix CLS first
   └── Cheapest to fix, no network involved, instant wins

2. Fix LCP next
   └── Biggest perceived-speed impact
   └── Start with: image preload → format → size → TTFB

3. Fix INP last
   └── Most complex, requires profiling actual interactions
   └── Start with: long task audit in DevTools Performance

Within LCP:
  a. Eliminate render-blocking CSS/JS (biggest gains)
  b. Preload LCP resource
  c. Convert to AVIF/WebP
  d. Optimize TTFB (CDN, caching)
  e. Reduce image byte size
```

### Quick Win Checklist

- [ ] All images have explicit `width` and `height`
- [ ] LCP image has `fetchpriority="high"` and NO `loading="lazy"`
- [ ] LCP image is preloaded with `<link rel="preload">`
- [ ] Hero/LCP image is AVIF or WebP
- [ ] Non-critical CSS loads async (media="print" trick)
- [ ] Scripts use `defer` or `async`
- [ ] Fonts use `font-display: swap` or `optional`
- [ ] No content injected above the fold after initial render
- [ ] Ad slots and embeds have reserved dimensions
- [ ] Event handlers complete in < 50ms or yield to main thread
