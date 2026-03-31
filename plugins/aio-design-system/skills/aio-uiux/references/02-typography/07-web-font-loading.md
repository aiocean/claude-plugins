# Web Font Loading

## The Core Problem

Web fonts are render-blocking resources. The browser must download a font file before it can render text that uses it. During the download, the browser faces a choice: show nothing (invisible text) or show text in a fallback font (unstyled text). Both degrade user experience. The goal of font loading strategy is to make this transition invisible or at least graceful.

Three phenomena to understand:

- **FOIT** (Flash of Invisible Text): browser hides text while font loads. No layout shift, but content is inaccessible.
- **FOUT** (Flash of Unstyled Text): browser shows fallback font, then swaps to web font when ready. Content visible immediately, but layout shifts on swap.
- **FOFT** (Flash of Faux Text): a subset of the web font (typically roman weight only) loads first, then the full family loads. Two-stage swap, smoother than FOUT.

Modern best practice is controlled FOUT: show fallback text immediately, swap to web font, but minimize the visual shift using `size-adjust` and font metric overrides.

---

## font-display

The `font-display` descriptor in `@font-face` controls the FOIT/FOUT behavior. This is the single most impactful font loading decision.

### Values

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.woff2') format('woff2');
  font-display: swap; /* recommended for most cases */
}
```

| Value      | Block Period | Swap Period  | Behavior |
|------------|-------------|--------------|----------|
| `auto`     | Browser decides | Browser decides | Default; usually FOIT |
| `block`    | ~3 seconds  | Infinite     | Long invisible text, then swaps forever |
| `swap`     | ~0ms (tiny) | Infinite     | Immediate fallback, swaps when ready |
| `fallback` | ~100ms      | ~3 seconds   | Short invisible window, brief swap window, then stays on fallback |
| `optional` | ~100ms      | 0            | Shows fallback if font not cached; never swaps mid-session |

### When to Use Each

**`swap`** — Use for body text, UI labels, any text critical to content consumption. Content is visible immediately. Layout shift on swap is acceptable if you've minimized it with `size-adjust`.

**`fallback`** — Use for decorative display fonts where FOUT would be jarring. If the font loads within ~100ms (cached), it shows. If slow, the fallback is permanent for that page load.

**`optional`** — Use for supplementary typefaces (icons, special glyphs) or when you want zero CLS. Browser may not use the font at all on slow connections. Font will be cached and used on subsequent loads.

**`block`** — Avoid. Hides text for up to 3 seconds. The only valid use case is icon fonts where fallback characters would be meaningless symbols.

**`auto`** — Avoid. Unpredictable across browsers.

---

## Preloading Fonts

`<link rel="preload">` tells the browser to fetch the font at the highest priority, before it would normally discover it in the CSS. This is the most effective way to reduce FOUT.

```html
<!-- In <head>, before your stylesheet -->
<link
  rel="preload"
  href="/fonts/Inter-Variable.woff2"
  as="font"
  type="font/woff2"
  crossorigin
>

<!-- Multiple fonts -->
<link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Lora-Variable.woff2" as="font" type="font/woff2" crossorigin>
```

**Rules:**
- `crossorigin` is required even for same-origin fonts — font requests use CORS
- Only preload fonts that appear above the fold on initial load
- Do not preload more than 2–3 fonts — each preload competes for bandwidth
- Only preload the weight/style used for initial render (usually 400 regular)

### Preload with Google Fonts

Google Fonts uses multiple CDN domains. Preconnect to the CDN:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
```

`preconnect` establishes the TCP connection early. It's faster than nothing but less powerful than preload.

---

## Font Subsetting

Subsetting removes glyphs you don't need, dramatically reducing file size.

### Unicode Range in @font-face

Split a font into subsets loaded only when characters in that range are used:

```css
/* Latin basic — loaded for most Western content */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-latin.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153,
                 U+02BB-02BC, U+02C6, U+02DA, U+02DC,
                 U+2000-206F, U+20AC, U+2122, U+2191,
                 U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Latin extended — only loaded if those characters appear on page */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-latin-ext.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF,
                 U+2020, U+20A0-20AB, U+20AD-20CF,
                 U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* Vietnamese */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-vietnamese.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129,
                 U+0168-0169, U+01A0-01A1, U+01AF-01B0,
                 U+1EA0-1EF9, U+20AB;
}
```

Google Fonts does this automatically — it generates per-script subsets and only sends what the page needs.

### Build-Time Subsetting

For self-hosted fonts, use `pyftsubset` from fonttools:

```bash
# Install
pip install fonttools brotli

# Subset to Latin only, output woff2
pyftsubset Inter.ttf \
  --output-file=Inter-latin.woff2 \
  --flavor=woff2 \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0100-017E,U+2000-206F,U+20AC,U+2122,U+FEFF,U+FFFD"

# Subset with specific features retained
pyftsubset Inter.ttf \
  --output-file=Inter-latin.woff2 \
  --flavor=woff2 \
  --unicodes="U+0020-007E,U+00A0-017E" \
  --layout-features="kern,liga,calt,tnum,onum"
```

Typical results:
- Full Inter variable font: ~330KB
- Latin-only subset: ~65KB
- Latin + common symbols: ~80KB

---

## size-adjust and Font Metric Overrides

The biggest source of CLS (Cumulative Layout Shift) from font swaps is metric differences between the web font and the fallback. Letters have different widths, ascenders, and descenders — so when the font swaps, the text reflows.

CSS font metric override descriptors let you adjust the fallback font's metrics to match the web font, minimizing reflow.

```css
/* Step 1: Load your web font */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.woff2') format('woff2');
  font-display: swap;
}

/* Step 2: Create an adjusted fallback that matches Inter's metrics */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');             /* use system Arial as base */
  size-adjust: 107%;               /* scale Arial to match Inter's width */
  ascent-override: 90%;            /* match Inter's ascent */
  descent-override: 22%;           /* match Inter's descent */
  line-gap-override: 0%;           /* match Inter's line gap */
}

/* Step 3: Use the adjusted fallback in the stack */
body {
  font-family: 'Inter', 'Inter Fallback', system-ui, sans-serif;
}
```

### Finding the Right Adjustment Values

Use the **Fallback Font Generator** (screenspan.io/blog/font-overrides) or calculate manually:

```javascript
// Measure both fonts at the same size and compute ratio
// Load this in browser console with both fonts available

function measureFont(fontFamily, text = 'The quick brown fox') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `16px ${fontFamily}`;
  return ctx.measureText(text).width;
}

const webFontWidth = measureFont('Inter');
const fallbackWidth = measureFont('Arial');
const sizeAdjust = (webFontWidth / fallbackWidth * 100).toFixed(2) + '%';
console.log('size-adjust:', sizeAdjust);
```

### Common Adjusted Fallbacks

```css
/* Inter → Arial fallback */
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

/* Roboto → Arial fallback */
@font-face {
  font-family: 'Roboto-fallback';
  src: local('Arial');
  size-adjust: 100.3%;
  ascent-override: 92.67%;
  descent-override: 24.41%;
  line-gap-override: 0%;
}

/* Lato → Arial fallback */
@font-face {
  font-family: 'Lato-fallback';
  src: local('Arial');
  size-adjust: 97.86%;
  ascent-override: 101.03%;
  descent-override: 21.15%;
  line-gap-override: 0%;
}
```

---

## Self-Hosting vs. CDN

### Google Fonts CDN

**Pros:**
- Zero configuration
- Global CDN, fast delivery
- Automatic subsetting
- Automatic woff2/woff selection

**Cons:**
- Third-party request (privacy implications — GDPR concerns in EU)
- Extra DNS lookup + connection
- No control over cache headers
- Fonts not available offline

```html
<!-- Standard Google Fonts embed -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Lora:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
```

### Self-Hosting

**Pros:**
- Full control over cache headers (set long `Cache-Control: max-age=31536000, immutable`)
- No third-party privacy issues
- Works offline / in restricted environments
- Can preload with confidence

**Cons:**
- Must manage font files
- Must handle subsetting manually
- No automatic format negotiation (must specify woff2 + fallback)

```css
/* Self-hosted @font-face */
@font-face {
  font-family: 'Inter';
  src:
    url('/fonts/Inter-Variable.woff2') format('woff2 supports variations'),
    url('/fonts/Inter-Variable.woff2') format('woff2'),
    url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

### Download Google Fonts for Self-Hosting

```bash
# Use google-webfonts-helper (gwfh.mranftl.com) or the CLI
npx google-fonts-helper \
  --family "Inter" \
  --subset "latin" \
  --weights "400,600,700" \
  --output ./public/fonts
```

---

## Performance Budgets

### File Size Targets

| Font type          | Target size | Maximum |
|--------------------|-------------|---------|
| Variable font (Latin subset) | 50–80KB | 120KB |
| Static weight (single, Latin) | 12–20KB | 30KB |
| Icon font | 10–30KB | 50KB |
| Total font budget (page) | 80–150KB | 250KB |

### Loading Priority Strategy

```
Critical path fonts (preload):
  - Body text font, regular weight
  - Primary heading font, bold weight

Secondary (load normally):
  - Italic variants
  - Additional weights
  - Display/decorative fonts

Deferred (load after interaction):
  - Fonts only used in modals, drawers, rarely-visited sections
```

### Checking Font Impact

```javascript
// Log font loading performance
document.fonts.ready.then(() => {
  const entries = performance.getEntriesByType('resource')
    .filter(e => e.initiatorType === 'css' || e.name.includes('font'));

  entries.forEach(e => {
    console.log(`${e.name}: ${Math.round(e.duration)}ms, ${Math.round(e.transferSize/1024)}KB`);
  });
});

// Check which fonts loaded successfully
document.fonts.forEach(font => {
  console.log(`${font.family} ${font.weight} ${font.style}: ${font.status}`);
});
```

---

## Complete Production Font Loading Setup

```html
<!-- index.html — in <head> -->

<!-- 1. Preconnect for Google Fonts (if using CDN) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- 2. Preload critical fonts (self-hosted) -->
<link
  rel="preload"
  href="/fonts/Inter-Variable.woff2"
  as="font"
  type="font/woff2"
  crossorigin
>

<!-- 3. Non-critical fonts: preload with low priority or just include in CSS -->
```

```css
/* fonts.css — loaded in <head> */

/* Critical body font — preloaded, swap immediately */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2 supports variations'),
       url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153,
                 U+02BB-02BC, U+02C6, U+02DA, U+02DC,
                 U+2000-206F, U+20AC, U+2122, U+FEFF, U+FFFD;
}

/* Adjusted fallback — minimizes CLS on swap */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

/* Secondary heading font — fallback after 100ms, prevents jarring FOUT */
@font-face {
  font-family: 'Lora';
  src: url('/fonts/Lora-Variable.woff2') format('woff2 supports variations'),
       url('/fonts/Lora-Variable.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: fallback; /* not swap — heading FOUT is more visible */
  unicode-range: U+0000-00FF, U+0131, U+0152-0153,
                 U+02BB-02BC, U+02C6, U+02DA, U+02DC,
                 U+2000-206F, U+20AC, U+2122, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Lora';
  src: url('/fonts/Lora-Variable-Italic.woff2') format('woff2');
  font-weight: 400 700;
  font-style: italic;
  font-display: fallback;
}

/* Adjusted Lora fallback */
@font-face {
  font-family: 'Lora Fallback';
  src: local('Georgia');
  size-adjust: 98.5%;
  ascent-override: 95%;
  descent-override: 24%;
  line-gap-override: 0%;
}

/* Font stacks */
:root {
  --font-body:    'Inter', 'Inter Fallback', system-ui, -apple-system, sans-serif;
  --font-heading: 'Lora', 'Lora Fallback', Georgia, serif;
  --font-mono:    ui-monospace, 'JetBrains Mono', 'Fira Code', monospace;
}

body {
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

code, pre, kbd {
  font-family: var(--font-mono);
}
```

---

## Diagnosing Font Loading Issues

```javascript
// Check font load status
document.fonts.forEach(font => {
  console.log(font.family, font.weight, font.style, '→', font.status);
  // status: "unloaded" | "loading" | "loaded" | "error"
});

// Wait for specific font
document.fonts.load('700 1em Inter').then(fonts => {
  if (fonts.length === 0) {
    console.warn('Inter 700 not available');
  } else {
    console.log('Inter 700 loaded');
  }
});

// Detect FOUT
const observer = new PerformanceObserver(list => {
  list.getEntries().forEach(entry => {
    if (entry.entryType === 'layout-shift') {
      console.log('Layout shift:', entry.value, entry.sources);
    }
  });
});
observer.observe({ type: 'layout-shift', buffered: true });
```

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Font never loads | Missing `crossorigin` on preload | Add `crossorigin` attribute |
| FOIT even with `swap` | Preload missing, font discovered late | Add `<link rel="preload">` |
| Large CLS on swap | Fallback metrics don't match | Add `size-adjust` and metric overrides |
| 404 on font file | Wrong path in `@font-face` | Verify path; check for case sensitivity |
| Only bold loads | Missing italic `@font-face` | Add separate rule for `font-style: italic` |
| Font loads but wrong | Cache serving old file | Use content-hash in filename |
