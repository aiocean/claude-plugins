# Responsive Images

## Why Responsive Images Matter

A 2400px wide hero image served to a 375px phone wastes 90%+ of its bytes.
Responsive images solve three distinct problems:

1. **Resolution switching** — serve smaller files to smaller screens
2. **Art direction** — serve differently cropped images at different sizes
3. **Format selection** — serve modern formats (WebP, AVIF) with fallbacks

---

## srcset and sizes Attributes

`srcset` provides the browser a menu of image options. `sizes` tells the browser
how wide the image will render at each viewport width. The browser chooses the
optimal file based on viewport size, pixel density, and network conditions.

```html
<!-- Resolution switching: same image, different sizes -->
<img
  src="hero-800.jpg"
  srcset="
    hero-400.jpg  400w,
    hero-800.jpg  800w,
    hero-1200.jpg 1200w,
    hero-1600.jpg 1600w,
    hero-2400.jpg 2400w
  "
  sizes="
    (max-width: 640px)  100vw,
    (max-width: 1024px) 100vw,
    1200px
  "
  alt="Hero image description"
  width="1200"
  height="675"
>
```

**How `sizes` works**: Each condition is evaluated left to right. The first match
wins. The final value (no condition) is the default.

```html
<!-- Card image: takes up 100% of card, card is 1/3 of viewport on desktop -->
<img
  src="card-600.jpg"
  srcset="
    card-300.jpg  300w,
    card-600.jpg  600w,
    card-900.jpg  900w,
    card-1200.jpg 1200w
  "
  sizes="
    (max-width: 640px)  calc(100vw - 2rem),
    (max-width: 1024px) calc(50vw - 2rem),
    calc(33vw - 2rem)
  "
  alt="Card title"
  width="600"
  height="400"
>
```

### Pixel Density Descriptor (x)

For fixed-size images (icons, avatars, logos):

```html
<!-- Serve 2x image on Retina, 1x on standard screens -->
<img
  src="logo.png"
  srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"
  alt="Company logo"
  width="120"
  height="40"
>
```

---

## picture Element for Art Direction

Use `<picture>` when you need different crops or aspect ratios, not just
different sizes of the same image.

```html
<!-- Art direction: portrait crop on mobile, landscape on desktop -->
<picture>
  <!-- Mobile: portrait crop -->
  <source
    media="(max-width: 639px)"
    srcset="
      hero-portrait-400.webp  400w,
      hero-portrait-800.webp  800w
    "
    sizes="100vw"
    type="image/webp"
  >
  <!-- Tablet: square crop -->
  <source
    media="(max-width: 1023px)"
    srcset="
      hero-square-600.webp  600w,
      hero-square-1200.webp 1200w
    "
    sizes="100vw"
    type="image/webp"
  >
  <!-- Desktop: wide landscape crop -->
  <source
    srcset="
      hero-wide-800.webp  800w,
      hero-wide-1600.webp 1600w,
      hero-wide-2400.webp 2400w
    "
    sizes="100vw"
    type="image/webp"
  >
  <!-- Fallback img — always required -->
  <img
    src="hero-wide-800.jpg"
    alt="Team working in a modern office"
    width="1600"
    height="900"
  >
</picture>
```

---

## WebP/AVIF with Fallback

Modern formats offer 25-50% smaller file sizes. Use `<picture>` to serve
modern formats with JPEG/PNG fallback.

```html
<!-- AVIF → WebP → JPEG fallback chain -->
<picture>
  <source
    srcset="photo-800.avif 800w, photo-1600.avif 1600w"
    sizes="(max-width: 800px) 100vw, 800px"
    type="image/avif"
  >
  <source
    srcset="photo-800.webp 800w, photo-1600.webp 1600w"
    sizes="(max-width: 800px) 100vw, 800px"
    type="image/webp"
  >
  <img
    src="photo-800.jpg"
    srcset="photo-800.jpg 800w, photo-1600.jpg 1600w"
    sizes="(max-width: 800px) 100vw, 800px"
    alt="Photo description"
    width="800"
    height="533"
  >
</picture>
```

**Browser support** (2024):
- AVIF: Chrome 85+, Firefox 93+, Safari 16+
- WebP: All modern browsers (97%+ support)
- JPEG/PNG: Universal fallback

---

## Responsive Background Images

CSS background images require media queries for responsive serving.

```css
/* Mobile-first: start with small image */
.hero {
  background-image: url('hero-small.jpg');
  background-size: cover;
  background-position: center;
  aspect-ratio: 4 / 3;
}

/* Tablet */
@media (min-width: 768px) {
  .hero {
    background-image: url('hero-medium.jpg');
    aspect-ratio: 16 / 9;
  }
}

/* Desktop */
@media (min-width: 1280px) {
  .hero {
    background-image: url('hero-large.jpg');
  }
}

/* HiDPI / Retina */
@media (-webkit-min-device-pixel-ratio: 2),
       (min-resolution: 192dpi) {
  .hero {
    background-image: url('hero-large@2x.jpg');
  }
}

/* WebP support (use .webp extension check via JS or server) */
.webp .hero {
  background-image: url('hero-medium.webp');
}

/* Modern: image-set() for background images */
.hero-modern {
  background-image: image-set(
    url('hero.avif') type('image/avif'),
    url('hero.webp') type('image/webp'),
    url('hero.jpg')  type('image/jpeg')
  );
  background-size: cover;
}
```

---

## CSS aspect-ratio for Placeholder

Prevents Cumulative Layout Shift (CLS) by reserving space before the image loads.

```css
/* Reserve space with aspect-ratio — no layout shift */
.img-wrapper {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: var(--color-surface-alt); /* Loading placeholder color */
  border-radius: 0.5rem;
}

.img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Common ratios */
.ratio-square     { aspect-ratio: 1; }
.ratio-video      { aspect-ratio: 16 / 9; }
.ratio-photo      { aspect-ratio: 4 / 3; }
.ratio-portrait   { aspect-ratio: 3 / 4; }
.ratio-wide       { aspect-ratio: 21 / 9; }
.ratio-cinema     { aspect-ratio: 2.35 / 1; }

/* Responsive: change ratio at breakpoints */
.adaptive-ratio {
  aspect-ratio: 1;
}

@media (min-width: 768px) {
  .adaptive-ratio {
    aspect-ratio: 16 / 9;
  }
}
```

Always include `width` and `height` attributes on `<img>` — browsers use them
to calculate aspect ratio before CSS loads, preventing layout shift:

```html
<!-- Browser computes 16:9 ratio from width/height, reserves space -->
<img src="photo.jpg" width="1600" height="900" alt="...">
```

---

## loading="lazy"

Defer off-screen images until the user scrolls near them.

```html
<!-- Lazy load everything below the fold -->
<img src="photo.jpg" loading="lazy" alt="..." width="800" height="600">

<!-- Never lazy-load LCP (hero) images -->
<img src="hero.jpg" loading="eager" alt="..." width="1600" height="900">

<!-- Default is "eager" — explicit is clearer -->
<img src="above-fold.jpg" loading="eager" alt="...">
```

**Rules**:
- Use `loading="lazy"` for all images below the fold
- Use `loading="eager"` (or omit) for LCP candidates (first hero image)
- Native lazy loading has a ~1200px threshold — images start loading before visible

```css
/* Fade in lazy images when they load */
img[loading="lazy"] {
  opacity: 0;
  transition: opacity 0.3s;
}

img[loading="lazy"].loaded {
  opacity: 1;
}
```

```js
// JavaScript to add .loaded class
document.querySelectorAll('img[loading="lazy"]').forEach(img => {
  if (img.complete) {
    img.classList.add('loaded');
  } else {
    img.addEventListener('load', () => img.classList.add('loaded'));
  }
});
```

---

## fetchpriority="high" for Hero Images

The browser's resource scheduler de-prioritizes images by default.
Signal that the LCP image is critical:

```html
<!-- Hero / LCP image: high priority, eager loading -->
<img
  src="hero.jpg"
  srcset="hero-800.jpg 800w, hero-1600.jpg 1600w"
  sizes="100vw"
  alt="Hero description"
  width="1600"
  height="900"
  fetchpriority="high"
  loading="eager"
  decoding="async"
>

<!-- Preload in <head> for critical images -->
<link
  rel="preload"
  as="image"
  href="hero-1600.jpg"
  imagesrcset="hero-800.jpg 800w, hero-1600.jpg 1600w"
  imagesizes="100vw"
  fetchpriority="high"
>
```

**`decoding="async"`**: Allows browser to continue rendering while decoding the image.
Use on all non-critical images.

---

## Responsive SVGs

SVGs scale infinitely and need different treatment than raster images.

```html
<!-- Inline SVG: scales with container, styleable with CSS -->
<div class="icon-wrapper">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="..."/>
  </svg>
</div>
```

```css
/* SVG as img: constrain with CSS */
.logo-img {
  width: clamp(80px, 15vw, 160px);
  height: auto;
}

/* Inline SVG: inherits color, scales with text */
.icon {
  width: 1em;
  height: 1em;
  fill: currentColor;
  flex-shrink: 0;
}

/* Icon sizing scale */
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 20px; height: 20px; }
.icon-lg { width: 24px; height: 24px; }
.icon-xl { width: 32px; height: 32px; }

/* SVG background that scales */
.pattern-bg {
  background-image: url('pattern.svg');
  background-size: 40px 40px; /* Tile size, not image size */
}

@media (min-width: 1024px) {
  .pattern-bg {
    background-size: 60px 60px;
  }
}
```

---

## Image CDN URL-Based Resizing

Image CDNs (Cloudflare Images, Imgix, Cloudinary, Fastly) transform images
on-the-fly via URL parameters, eliminating manual resizing.

```html
<!-- Cloudinary: auto format, auto quality, width resize -->
<img
  src="https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/sample.jpg"
  srcset="
    https://res.cloudinary.com/demo/image/upload/w_400,f_auto,q_auto/sample.jpg  400w,
    https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/sample.jpg  800w,
    https://res.cloudinary.com/demo/image/upload/w_1200,f_auto,q_auto/sample.jpg 1200w
  "
  sizes="(max-width: 640px) 100vw, 800px"
  alt="Sample image"
  width="800"
  height="533"
>

<!-- Imgix: auto format, fit crop, width -->
<img
  srcset="
    https://demo.imgix.net/sample.jpg?w=400&auto=format&fit=crop  400w,
    https://demo.imgix.net/sample.jpg?w=800&auto=format&fit=crop  800w,
    https://demo.imgix.net/sample.jpg?w=1600&auto=format&fit=crop 1600w
  "
  sizes="100vw"
  src="https://demo.imgix.net/sample.jpg?w=800&auto=format"
  alt="Sample"
>

<!-- Next.js Image component (handles everything automatically) -->
<!-- <Image src="/hero.jpg" width={1600} height={900} alt="Hero" priority /> -->
```

### JavaScript Helper for CDN srcsets

```js
// Generate srcset string for any CDN
function cloudinarySrcset(publicId, widths = [400, 800, 1200, 1600]) {
  return widths
    .map(w => `https://res.cloudinary.com/YOUR_CLOUD/image/upload/w_${w},f_auto,q_auto/${publicId}.jpg ${w}w`)
    .join(', ');
}

// Usage
const img = document.querySelector('#hero');
img.srcset = cloudinarySrcset('hero-photo');
img.sizes = '(max-width: 640px) 100vw, 1200px';
```
