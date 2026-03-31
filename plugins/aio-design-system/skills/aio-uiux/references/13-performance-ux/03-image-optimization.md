# Image Optimization

Images are typically 50–70% of a page's total byte weight. Optimizing them is the single highest-ROI performance task for most sites.

---

## Format Selection

### Decision Tree

```
Is it a photo or complex graphic?
    ├── Yes → Use AVIF (primary) + WebP (fallback) + JPEG (legacy)
    └── No → Is it a logo, icon, or simple illustration?
              ├── Can it be SVG? → YES → Use inline SVG or external .svg
              └── No (raster required) → PNG with WebP fallback
```

### Format Comparison

| Format | Best For | Compression | Browser Support | Notes |
|--------|----------|-------------|-----------------|-------|
| **AVIF** | Photos, illustrations | ~50% smaller than JPEG | Chrome 85+, Firefox 93+, Safari 16.4+ | Best quality/size ratio |
| **WebP** | Photos, screenshots | ~30% smaller than JPEG | 95%+ (all modern) | Safe universal modern format |
| **JPEG** | Photos | Baseline | Universal | Fallback only |
| **PNG** | Screenshots, transparency | Lossless | Universal | Use WebP instead when possible |
| **SVG** | Icons, logos, illustrations | Vector (infinitely scalable) | Universal | Best for anything that can be drawn |
| **GIF** | Simple animations | Poor | Universal | Replace with WebM/MP4 video |
| **WebM/MP4** | Animated content | Excellent | 95%+ | Replace GIF with autoplay video |

### Replace GIF with Video

```html
<!-- BAD: GIF at 2MB -->
<img src="/animation.gif" alt="Loading animation">

<!-- GOOD: Video at 200KB -->
<video autoplay loop muted playsinline>
  <source src="/animation.webm" type="video/webm">
  <source src="/animation.mp4"  type="video/mp4">
</video>
```

---

## Responsive Images

### srcset with Pixel Density (DPR)

Use for fixed-size images (icons, avatars, logos).

```html
<img
  src="/avatar-48.jpg"
  srcset="/avatar-48.jpg 1x, /avatar-96.jpg 2x, /avatar-144.jpg 3x"
  alt="User avatar"
  width="48"
  height="48"
>
```

### srcset with Width Descriptors + sizes

Use for fluid/responsive images that change size with viewport.

```html
<img
  src="/photo-800.webp"
  srcset="
    /photo-400.webp  400w,
    /photo-800.webp  800w,
    /photo-1200.webp 1200w,
    /photo-1600.webp 1600w
  "
  sizes="
    (max-width: 480px)  100vw,
    (max-width: 768px)  calc(100vw - 32px),
    (max-width: 1200px) 50vw,
    800px
  "
  alt="Landscape photo"
  width="800"
  height="533"
>
```

**sizes attribute**: tells browser how wide the image will render BEFORE downloading.
- `100vw` = full viewport width
- `calc(100vw - 32px)` = viewport minus padding
- `50vw` = half viewport
- `800px` = fixed 800px (for large screens where it stops growing)

### picture Element: Format Selection + Art Direction

```html
<!-- Format selection: modern formats with fallback -->
<picture>
  <source
    type="image/avif"
    srcset="/photo-400.avif 400w, /photo-800.avif 800w, /photo-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  <source
    type="image/webp"
    srcset="/photo-400.webp 400w, /photo-800.webp 800w, /photo-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  <img
    src="/photo-800.jpg"
    alt="Mountain landscape"
    width="800"
    height="533"
    loading="lazy"
    decoding="async"
  >
</picture>
```

```html
<!-- Art direction: different crops at different breakpoints -->
<picture>
  <!-- Mobile: square crop, close-up -->
  <source
    media="(max-width: 480px)"
    srcset="/hero-mobile.avif 480w"
    type="image/avif"
  >
  <!-- Tablet: wider crop -->
  <source
    media="(max-width: 1024px)"
    srcset="/hero-tablet.avif 1024w"
    type="image/avif"
  >
  <!-- Desktop: full panoramic -->
  <source
    srcset="/hero-desktop.avif 1600w"
    type="image/avif"
  >
  <img src="/hero-desktop.jpg" alt="Hero" width="1600" height="600">
</picture>
```

---

## Lazy Loading

### Native Lazy Loading

```html
<!-- Add to all below-fold images -->
<img
  src="/article-photo.webp"
  loading="lazy"
  decoding="async"
  alt="Article photo"
  width="600"
  height="400"
>

<!-- NEVER lazy-load LCP image (hero, first visible image) -->
<img
  src="/hero.webp"
  loading="eager"
  fetchpriority="high"
  alt="Hero"
  width="1200"
  height="600"
>
```

`loading="lazy"` is supported in all modern browsers (94%+). Use it on every image except:
- The LCP image
- Images in the first viewport
- Images in `<picture>` elements where a source is immediately visible

### IntersectionObserver Lazy Loading (JS fallback / custom)

```javascript
// For browsers without native lazy loading or for custom behavior
const lazyImages = document.querySelectorAll('img[data-src]');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const img = entry.target;
    img.src = img.dataset.src;

    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
    }

    img.removeAttribute('data-src');
    img.removeAttribute('data-srcset');
    observer.unobserve(img);
  });
}, {
  rootMargin: '200px 0px', // start loading 200px before visible
  threshold: 0
});

lazyImages.forEach(img => observer.observe(img));
```

```html
<!-- HTML for JS lazy loading -->
<img
  src="/placeholder-1x1.gif"
  data-src="/actual-photo.webp"
  data-srcset="/actual-photo-400.webp 400w, /actual-photo-800.webp 800w"
  alt="Article photo"
  width="600"
  height="400"
  class="lazy"
>
```

---

## Image Dimensions: Preventing CLS

Always specify `width` and `height` attributes. Modern browsers use them to compute aspect ratio before the image loads, reserving the correct space.

```html
<!-- This prevents layout shift -->
<img src="/photo.webp" width="800" height="533" alt="...">
```

```css
/* Make it responsive while preserving aspect ratio */
img {
  max-width: 100%;
  height: auto; /* overrides the HTML height attribute for fluid layout */
}
```

### CSS aspect-ratio

```css
/* Explicit aspect ratio container */
.img-hero {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
}

.img-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Avatar always square */
.avatar {
  aspect-ratio: 1;
  width: 48px;
  border-radius: 50%;
  overflow: hidden;
}
```

---

## Blur-Up Placeholder Technique

Inline a tiny base64-encoded placeholder, then swap to full image on load.

```html
<div class="img-blur-wrap">
  <img
    class="img-blur"
    src="data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoEAAMAAUAmJYgCdAEO/gHOAAA="
    data-src="/full-photo.webp"
    alt="Product photo"
    width="600"
    height="400"
  >
</div>
```

```css
.img-blur-wrap {
  overflow: hidden;
  background: #f0f0f0;
}

.img-blur {
  width: 100%;
  height: auto;
  filter: blur(20px);
  transform: scale(1.05);
  transition: filter 0.4s ease, transform 0.4s ease;
  will-change: filter, transform;
}

.img-blur.loaded {
  filter: blur(0);
  transform: scale(1);
}
```

```javascript
document.querySelectorAll('.img-blur[data-src]').forEach(img => {
  const loader = new Image();
  loader.src = img.dataset.src;
  loader.onload = () => {
    img.src = img.dataset.src;
    img.classList.add('loaded');
  };
});
```

---

## Image CDN Patterns

Image CDNs (Cloudinary, Imgix, Cloudflare Images) transform images on-the-fly via URL parameters. This eliminates manual multi-format/multi-size generation.

### Cloudinary URL Pattern

```
https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}

Transformations:
  w_800          → width 800px
  h_600          → height 600px
  c_fill         → crop mode fill
  f_auto         → auto format (AVIF/WebP/JPEG based on browser)
  q_auto         → auto quality
  dpr_auto       → device pixel ratio aware
```

```html
<!-- Cloudinary responsive image -->
<img
  src="https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/sample.jpg"
  srcset="
    https://res.cloudinary.com/demo/image/upload/w_400,f_auto,q_auto/sample.jpg  400w,
    https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/sample.jpg  800w,
    https://res.cloudinary.com/demo/image/upload/w_1200,f_auto,q_auto/sample.jpg 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Sample"
  width="800"
  height="533"
>
```

### Next.js Image Component (built-in CDN behavior)

```jsx
import Image from 'next/image';

// Automatically: lazy loading, WebP/AVIF, srcset, prevents CLS
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority          // equivalent to fetchpriority="high" + eager loading
  quality={85}
/>

// Fill mode (parent defines dimensions)
<div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
  <Image src="/banner.jpg" alt="Banner" fill style={{ objectFit: 'cover' }} />
</div>
```

---

## Background Image Optimization

```css
/* BAD: no size control, no format selection */
.hero {
  background-image: url('/hero.jpg');
  background-size: cover;
}

/* GOOD: responsive background with media queries */
.hero {
  background-image: url('/hero-mobile.webp');
  background-size: cover;
  background-position: center;
}

@media (min-width: 768px) {
  .hero {
    background-image: url('/hero-tablet.webp');
  }
}

@media (min-width: 1200px) {
  .hero {
    background-image: url('/hero-desktop.webp');
  }
}

/* BEST: use <picture> or CSS image-set() */
.hero {
  background-image: image-set(
    url('/hero.avif') type('image/avif'),
    url('/hero.webp') type('image/webp'),
    url('/hero.jpg')  type('image/jpeg')
  );
  background-size: cover;
}
```

---

## Icon Systems

### Option Comparison

| System | Performance | Flexibility | DX | Best For |
|--------|-------------|-------------|-----|---------|
| **SVG inline** | Best (no request, styleable) | Full CSS control | More HTML | Individual icons, themeable |
| **SVG sprite** | Good (1 request for all) | Full CSS control | Easy reuse | Icon libraries |
| **CSS background SVG** | Good | Limited | Simple | Decorative icons |
| **Icon font** | Poor (blocks render) | Color only | Easy | Avoid in new projects |
| **Image sprite** | Fair | None | Complex | Legacy only |

### SVG Sprite Pattern

```html
<!-- sprites.svg (hidden, in <body>) -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-search" viewBox="0 0 24 24">
    <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          stroke="currentColor" stroke-width="2" fill="none"
          stroke-linecap="round"/>
  </symbol>
  <symbol id="icon-close" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12"
          stroke="currentColor" stroke-width="2" fill="none"
          stroke-linecap="round"/>
  </symbol>
</svg>

<!-- Usage anywhere in document -->
<button aria-label="Search">
  <svg width="20" height="20" aria-hidden="true" focusable="false">
    <use href="#icon-search"/>
  </svg>
</button>
```

```css
/* SVG icons inherit color from text */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
```

### Inline SVG for Critical Icons

```html
<!-- Inline for zero-request, fully styleable, accessible -->
<button class="btn-search" aria-label="Search">
  <svg width="20" height="20" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2"
       aria-hidden="true" focusable="false">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
  Search
</button>
```

---

## Quick Reference Checklist

- [ ] Hero/LCP image: AVIF+WebP `<picture>`, `fetchpriority="high"`, no `loading="lazy"`
- [ ] All below-fold images: `loading="lazy"` + `decoding="async"`
- [ ] All images have explicit `width` and `height` attributes
- [ ] Use `srcset` + `sizes` for fluid images (not fixed icons)
- [ ] Use `image-set()` or `<picture>` for background images needing modern formats
- [ ] GIF replaced with `<video autoplay loop muted playsinline>`
- [ ] Icons use SVG sprite or inline SVG (not icon fonts)
- [ ] Image CDN handles format/quality/resize automatically where available
- [ ] LQIP or skeleton placeholder for images that take > 1s to load
- [ ] `aspect-ratio` CSS set on image containers to prevent CLS
