# Font Performance

Fonts are the most common cause of invisible text flash (FOIT), unstyled text flash (FOUT), and layout shift (CLS) during page load. Getting font loading right dramatically improves perceived performance.

---

## The Font Loading Problem

### What Happens Without Optimization

```
1. Browser parses HTML, finds font-family in CSS
2. Browser fetches CSS file (blocking)
3. Browser parses CSS, discovers @font-face
4. Browser queues font file download
5. Text renders invisible (FOIT) or with fallback (FOUT)
6. Font arrives, text re-renders → layout shift
```

Total delay before branded text: easily 500ms–3s on slow connections.

---

## font-display Values and Behavior

`font-display` controls what happens between "font requested" and "font available".

| Value | Block Period | Swap Period | Best For |
|-------|-------------|-------------|---------|
| `auto` | Browser decides (usually = block) | Varies | Avoid |
| `block` | Short (~3s) | Infinite | Font icons only |
| `swap` | Extremely short (~0ms) | Infinite | Body text, headings |
| `fallback` | Very short (~100ms) | Short (~3s) | Body text (preferred) |
| `optional` | Very short (~100ms) | None | Non-essential decoration |

### Recommended Values by Use Case

```css
/* Body text: swap to avoid invisible text, accept FOUT */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* Headings: fallback — brief invisible, then lock to fallback if slow */
@font-face {
  font-family: 'Playfair Display';
  src: url('/fonts/playfair-bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: fallback;
}

/* Decorative / non-critical: optional — only use if instantly available */
@font-face {
  font-family: 'DancingScript';
  src: url('/fonts/dancing-script.woff2') format('woff2');
  font-display: optional;
}

/* Icon fonts: block — invisible is better than wrong icon glyphs */
@font-face {
  font-family: 'MaterialIcons';
  src: url('/fonts/material-icons.woff2') format('woff2');
  font-display: block;
}
```

### Visual Timeline

```
font-display: block
  [===INVISIBLE===][TEXT SWAPS IN ANYTIME→→→→→→→→→→→→→→→]

font-display: swap
  [FALLBACK][TEXT SWAPS IN ANYTIME→→→→→→→→→→→→→→→→→→→→→]

font-display: fallback
  [INV][FALLBACK — swap window][no more swaps, keep fallback]

font-display: optional
  [INV][either render custom or stay fallback — NO SWAP EVER]
```

---

## Preloading Critical Fonts

Preloading tells the browser to fetch the font before it discovers the `@font-face` rule, eliminating the cascade delay.

```html
<head>
  <!-- Preload ONLY the fonts used above the fold -->
  <!-- Must match the exact URL in @font-face src -->
  <link rel="preload"
        href="/fonts/inter-400.woff2"
        as="font"
        type="font/woff2"
        crossorigin>

  <link rel="preload"
        href="/fonts/inter-700.woff2"
        as="font"
        type="font/woff2"
        crossorigin>

  <!-- crossorigin is REQUIRED even for same-origin fonts -->
  <!-- (fonts are always fetched with CORS) -->
</head>
```

**Rules for preloading fonts:**
- Preload maximum 2–3 fonts — each preload competes for bandwidth
- Only preload fonts used in the critical path (above fold)
- The `href` must exactly match the `src` URL in your `@font-face`
- Always include `crossorigin` (required for font fetches)
- Only preload WOFF2 (the format browsers actually use)

### Preconnect for Google Fonts

```html
<!-- Step 1: preconnect to both Google Fonts domains -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Step 2: load the stylesheet -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
      rel="stylesheet">
```

Without preconnect, Google Fonts adds ~150–300ms of DNS+TCP+TLS overhead before the font even starts downloading.

---

## Font Subsetting

Remove unused glyphs to reduce file size. A full Latin font might have 300+ glyphs; you may only need 95 ASCII characters.

### unicode-range for Selective Loading

```css
/* Only load this file when page contains Latin characters */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC,
                 U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074,
                 U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215,
                 U+FEFF, U+FFFD;
}

/* Separate file for Vietnamese characters (only downloaded if needed) */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-vietnamese.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169,
                 U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;
}
```

Google Fonts does this automatically. When self-hosting, use `pyftsubset` (fonttools) or `glyphhanger` to create subsets.

```bash
# Install fonttools
pip install fonttools brotli

# Subset to Latin + common punctuation
pyftsubset Inter-Regular.ttf \
  --unicodes="U+0000-00FF,U+2000-206F" \
  --flavor=woff2 \
  --output-file=inter-latin.woff2
```

---

## System Font Stacks

The fastest font is one already on the user's device. System fonts are zero-cost, high-quality, and perfectly legible.

```css
/* Modern system UI stack — matches OS default sans-serif */
body {
  font-family:
    system-ui,
    -apple-system,        /* Safari, older iOS */
    BlinkMacSystemFont,   /* Chrome on macOS */
    'Segoe UI',           /* Windows 10/11 */
    Roboto,               /* Android */
    Oxygen,               /* KDE */
    Ubuntu,               /* Ubuntu */
    Cantarell,            /* GNOME */
    'Helvetica Neue',
    Arial,
    sans-serif;
}

/* Monospace stack for code */
code, pre, kbd {
  font-family:
    'Cascadia Code',
    'Fira Code',
    'JetBrains Mono',
    'SF Mono',
    Consolas,
    'Courier New',
    monospace;
}

/* Serif stack */
.prose {
  font-family:
    'Iowan Old Style',
    'Apple Garamond',
    Baskerville,
    'Times New Roman',
    'Droid Serif',
    Times,
    serif;
}
```

**When to use system fonts**: dashboards, admin interfaces, developer tools, apps where brand fonts are not critical. Users trust familiar system fonts.

---

## size-adjust and Override Descriptors for CLS Prevention

When using `font-display: swap`, the fallback font occupies different space than the custom font, causing layout shift on swap. Override descriptors let you make the fallback font match the custom font's metrics.

```css
/* Step 1: measure your custom font's metrics */
/* Use https://screenspan.net/fallback or FontForge */

/* Step 2: define an adjusted fallback */
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');           /* use a system font */
  size-adjust: 107%;             /* scale to match Inter's x-height */
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

/* Step 3: list adjusted fallback before generic */
body {
  font-family: 'Inter', 'Inter-fallback', sans-serif;
}

/* Step 4: define the real font */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
}
```

When done correctly, the swap from `Inter-fallback` to `Inter` causes zero layout shift because both fonts occupy the same space.

### Automated Fallback Generation

```javascript
// Next.js does this automatically with next/font
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  // Next.js automatically generates size-adjust fallback
});

export default function Layout({ children }) {
  return <html className={inter.className}>{children}</html>;
}
```

---

## Variable Fonts

A single variable font file replaces multiple weight/style files, reducing HTTP requests and often total byte size.

```css
/* Old approach: 5 separate files */
@font-face { font-family: 'Inter'; src: url('inter-300.woff2'); font-weight: 300; }
@font-face { font-family: 'Inter'; src: url('inter-400.woff2'); font-weight: 400; }
@font-face { font-family: 'Inter'; src: url('inter-500.woff2'); font-weight: 500; }
@font-face { font-family: 'Inter'; src: url('inter-700.woff2'); font-weight: 700; }
@font-face { font-family: 'Inter'; src: url('inter-900.woff2'); font-weight: 900; }

/* New approach: 1 variable font file covers all weights */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-variable.woff2') format('woff2-variations');
  font-weight: 100 900;   /* declares the supported range */
  font-style: normal;
  font-display: swap;
}

/* Use any weight, no extra download */
h1 { font-weight: 750; }  /* arbitrary weight on the axis */
p  { font-weight: 420; }  /* fine-tuned body weight */
```

### Variable Font Axes

```css
/* font-variation-settings for non-standard axes */
.text-optical {
  font-family: 'Inter';
  font-variation-settings:
    'wght' 400,    /* weight */
    'slnt' -10,   /* slant */
    'opsz' 14;    /* optical size */
}

/* Standard axes use standard CSS properties */
.text-standard {
  font-family: 'Inter';
  font-weight: 400;         /* maps to wght axis */
  font-style: oblique 10deg; /* maps to slnt axis */
}
```

### Variable Font File Size

Variable fonts are not always smaller than static fonts. Check before switching:

| Scenario | Static | Variable | Winner |
|----------|--------|----------|--------|
| Need 1 weight | 20KB | 80KB | Static |
| Need 3+ weights | 60KB | 80KB | Variable |
| Need full range | 200KB | 80KB | Variable |

---

## Self-Hosting vs Google Fonts

### Google Fonts Tradeoffs

| Aspect | Google Fonts | Self-hosted |
|--------|-------------|-------------|
| Performance | Extra DNS + connection | Same origin, preloadable |
| Privacy | Logs user IPs | No third-party tracking |
| Caching | Shared cache (Chrome removed this) | Your CDN |
| Maintenance | Zero | Manage updates |
| Subsetting | Automatic | Manual (pyftsubset) |

**Recommendation**: Self-host for best performance. Use `google-webfonts-helper.herokuapp.com` to download optimized subsets.

### Self-Hosting Setup

```
/public/fonts/
  inter-latin-400.woff2
  inter-latin-700.woff2
  inter-variable.woff2
```

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF;
}
```

```nginx
# Serve with long cache + immutable
location ~* \.(woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
  add_header Access-Control-Allow-Origin "*";
}
```

---

## Font Loading API

Fine-grained control over font loading state via JavaScript.

```javascript
// Check if font is loaded
document.fonts.ready.then(() => {
  console.log('All fonts loaded');
  document.body.classList.add('fonts-loaded');
});

// Check specific font
async function checkFont() {
  const loaded = await document.fonts.load('700 16px Inter');
  console.log('Inter 700 loaded:', loaded.length > 0);
}

// Add class when font loads (for FOUT control)
document.fonts.load('400 1em Inter').then(() => {
  document.documentElement.classList.add('font-inter-loaded');
});
```

```css
/* Adjust layout only after font loads */
body {
  font-family: Arial, sans-serif; /* fallback */
  letter-spacing: 0;
}

.font-inter-loaded body {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.01em; /* Inter-specific tracking */
}
```

---

## Quick Reference Checklist

- [ ] Critical fonts preloaded with `<link rel="preload" as="font" crossorigin>`
- [ ] `font-display: swap` or `fallback` on all `@font-face` rules (never `auto` or `block` for text)
- [ ] WOFF2 format only (drop WOFF, TTF, EOT)
- [ ] `unicode-range` for multi-language sites (separate files per script)
- [ ] Variable font if using 3+ weights of the same family
- [ ] System font stack as fallback (matches actual OS fonts)
- [ ] `size-adjust` + override descriptors for CLS-free font swap
- [ ] Fonts served with `Cache-Control: immutable` and versioned filenames
- [ ] Google Fonts: `preconnect` to both googleapis.com and gstatic.com
- [ ] Self-hosted fonts served from same origin as page (avoids extra connection)
- [ ] Maximum 2 custom font families per page (each adds latency)
