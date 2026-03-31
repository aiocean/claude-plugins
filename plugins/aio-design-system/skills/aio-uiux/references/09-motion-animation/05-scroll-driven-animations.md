# Scroll-Driven Animations

Scroll-driven animations tie visual changes to scroll position. Done well they orient users, add depth, and reward exploration. Done poorly they delay content and trigger vestibular issues. This document covers all major techniques from simplest to most powerful.

---

## CSS Scroll Progress Indicator (No JavaScript)

The reading progress bar is the canonical example — pure CSS with the new scroll-driven animations API.

```css
/* ============================================
   CSS-ONLY scroll progress bar
   Chrome 115+, Firefox 110+ (with flag)
   ============================================ */

@keyframes grow-progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: #3b82f6;
  transform-origin: left center;
  transform: scaleX(0);

  /* Link animation to document scroll */
  animation: grow-progress linear;
  animation-timeline: scroll(root block);
  /* scroll(scroller axis)
     scroller: root | self | nearest | <element>
     axis: block | inline | x | y */
}

/* Fallback for unsupported browsers */
@supports not (animation-timeline: scroll()) {
  .scroll-progress {
    display: none; /* hide entirely, or use JS fallback */
  }
}
```

---

## IntersectionObserver — Reveal on Scroll

The most widely supported and performant technique for scroll-triggered animations. Elements animate in when they enter the viewport.

```css
/* Base state: elements start invisible/offset */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity   400ms cubic-bezier(0.0, 0.0, 0.2, 1),
    transform 400ms cubic-bezier(0.0, 0.0, 0.2, 1);
}

/* Revealed state: triggered by JS adding .is-visible */
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered children — CSS handles the delay */
.reveal-group .reveal:nth-child(1) { transition-delay: 0ms; }
.reveal-group .reveal:nth-child(2) { transition-delay: 80ms; }
.reveal-group .reveal:nth-child(3) { transition-delay: 160ms; }
.reveal-group .reveal:nth-child(4) { transition-delay: 240ms; }
.reveal-group .reveal:nth-child(5) { transition-delay: 320ms; }

/* Variants */
.reveal-left {
  opacity: 0;
  transform: translateX(-24px);
  transition: opacity 400ms ease-out, transform 400ms ease-out;
}
.reveal-left.is-visible { opacity: 1; transform: translateX(0); }

.reveal-scale {
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 350ms ease-out, transform 350ms ease-out;
}
.reveal-scale.is-visible { opacity: 1; transform: scale(1); }

/* Reduced motion: skip transform, fade only */
@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal-left, .reveal-scale {
    transform: none;
    transition: opacity 200ms ease-out;
  }
}
```

```javascript
// ============================================
// IntersectionObserver setup
// ============================================

// Basic observer: reveals once
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Unobserve after reveal (one-shot)
        observer.unobserve(entry.target);
      }
    });
  },
  {
    root: null,        // viewport
    rootMargin: '0px', // trigger exactly at edge
    threshold: 0.1     // 10% visible triggers
  }
);

// Observe all elements with .reveal class
document.querySelectorAll('.reveal, .reveal-left, .reveal-scale')
  .forEach(el => observer.observe(el));

// ============================================
// Advanced: different thresholds per element
// ============================================

const createRevealObserver = (options = {}) => {
  const defaults = { threshold: 0.15, rootMargin: '-50px 0px' };
  const config = { ...defaults, ...options };

  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');

        // Apply stagger from data attribute
        const delay = entry.target.dataset.delay || 0;
        entry.target.style.transitionDelay = `${delay}ms`;

        observer.unobserve(entry.target);
      }
    });
  }, config);
};

// Usage with data attributes:
// <div class="reveal" data-delay="100">...</div>
// <div class="reveal" data-delay="200">...</div>

// ============================================
// Repeat animation on scroll out + back in
// ============================================

const repeatObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    entry.target.classList.toggle('is-visible', entry.isIntersecting);
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal-repeat')
  .forEach(el => repeatObserver.observe(el));
```

---

## CSS Scroll-Driven Animations API

Chrome 115+. Ties `@keyframes` directly to scroll position — no JavaScript needed for the animation itself.

### animation-timeline: scroll()

Links animation progress to a scroll container's scroll position.

```css
/* ---- Parallax header image ---- */
@keyframes parallax-header {
  from { transform: translateY(0); }
  to   { transform: translateY(30%); }
}

.hero-image {
  animation: parallax-header linear both;
  animation-timeline: scroll(root block);
  /* Plays from translateY(0) at top to translateY(30%) at bottom */
}

/* ---- Fade out on scroll ---- */
@keyframes fade-on-scroll {
  0%   { opacity: 1; }
  30%  { opacity: 1; }   /* stays visible for first 30% of scroll */
  60%  { opacity: 0; }   /* fades out between 30-60% */
  100% { opacity: 0; }
}

.fade-header {
  animation: fade-on-scroll linear both;
  animation-timeline: scroll(root block);
}

/* ---- Sticky header: appears on scroll ---- */
@keyframes sticky-appear {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}

.sticky-nav {
  position: fixed;
  top: 0;
  animation: sticky-appear linear both;
  animation-timeline: scroll(root block);
  /* Appears as soon as user scrolls */
  animation-range: 0px 200px; /* only during first 200px of scroll */
}
```

### animation-timeline: view()

Links animation to an element's position within the viewport — the element's "view progress".

```css
/* ---- Reveal as element enters viewport ---- */
@keyframes reveal-from-below {
  entry 0%   { opacity: 0; transform: translateY(40px); }
  entry 100% { opacity: 1; transform: translateY(0); }
  /* entry: element entering viewport
     exit: element leaving viewport
     cover: element covering full viewport
     contain: element fully contained in viewport */
}

.scroll-reveal {
  animation: reveal-from-below linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

/* ---- Scale in and out as element passes through ---- */
@keyframes card-journey {
  entry 0%    { opacity: 0; transform: scale(0.8); }
  entry 50%   { opacity: 1; transform: scale(1); }
  exit  50%   { opacity: 1; transform: scale(1); }
  exit  100%  { opacity: 0; transform: scale(0.8); }
}

.journey-card {
  animation: card-journey linear both;
  animation-timeline: view();
}

/* ---- animation-range: fine-tune the trigger window ---- */
.late-reveal {
  animation: reveal-from-below linear both;
  animation-timeline: view();
  /* Only animate when element is 20%-80% through the viewport */
  animation-range: entry 20% entry 80%;
}

/* Named timeline ranges */
.timed-reveal {
  animation-range-start: entry 0%;
  animation-range-end: cover 30%;
}
```

### Named scroll timelines

```css
/* Define a named timeline on a scroll container */
.scroll-container {
  overflow-y: scroll;
  scroll-timeline-name: --my-timeline;
  scroll-timeline-axis: block;
  /* shorthand: scroll-timeline: --my-timeline block; */
}

/* Child uses the named timeline */
.progress-indicator {
  animation: grow-progress linear;
  animation-timeline: --my-timeline;
}

/* Named view timeline */
.animated-section {
  view-timeline-name: --section-reveal;
  view-timeline-axis: block;
}

.section-content {
  animation: fadeInUp linear both;
  animation-timeline: --section-reveal;
  animation-range: entry 0% entry 60%;
}
```

---

## Scroll-Snap with Smooth Transitions

```css
/* Scroll-snap container */
.snap-container {
  scroll-snap-type: y mandatory;
  overflow-y: scroll;
  height: 100vh;
  scroll-behavior: smooth;
}

/* Snap sections */
.snap-section {
  scroll-snap-align: start;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Content within each section animates on scroll */
.snap-section .content {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 400ms ease-out, transform 400ms ease-out;
}

/* Content becomes visible when section is the snap target */
/* Use IntersectionObserver with threshold:0.9 for snap sections */
.snap-section.in-view .content {
  opacity: 1;
  transform: translateY(0);
}

/* Scroll-snap with CSS scroll-driven (Chrome 115+) */
.snap-section .animated-heading {
  animation: slideUp linear both;
  animation-timeline: view();
  animation-range: entry 40% entry 80%;
}
```

---

## Parallax

### CSS-only parallax (modern, performant)

```css
/* Method 1: scroll-driven animations (Chrome 115+) */
@keyframes parallax-slow {
  from { transform: translateY(0); }
  to   { transform: translateY(-20%); }
}

@keyframes parallax-fast {
  from { transform: translateY(0); }
  to   { transform: translateY(-50%); }
}

.parallax-bg {
  animation: parallax-slow linear both;
  animation-timeline: scroll(root);
}

.parallax-fg {
  animation: parallax-fast linear both;
  animation-timeline: scroll(root);
}

/* Method 2: CSS 3D transform hack (old but widely supported) */
.parallax-section {
  perspective: 1px;
  overflow-x: hidden;
  overflow-y: auto;
  height: 100vh;
}

.parallax-layer-back {
  transform: translateZ(-1px) scale(2);
  /* scale(2) compensates for perspective shrink */
}

.parallax-layer-front {
  transform: translateZ(0);
}
```

### JavaScript parallax (full control)

```javascript
// Performant JS parallax using requestAnimationFrame
// Only reads scrollY on RAF, never on scroll event directly

let ticking = false;
let scrollY = 0;

// Capture scroll position (cheap operation)
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  if (!ticking) {
    requestAnimationFrame(updateParallax);
    ticking = true;
  }
}, { passive: true }); // passive: true = never calls preventDefault

function updateParallax() {
  const elements = document.querySelectorAll('[data-parallax]');

  elements.forEach(el => {
    const speed = parseFloat(el.dataset.parallax) || 0.3;
    const offset = scrollY * speed;
    // Use transform, NOT top/left — stays on compositor
    el.style.transform = `translateY(${offset}px)`;
  });

  ticking = false;
}

// Usage:
// <div data-parallax="0.2">slow layer</div>
// <div data-parallax="0.5">fast layer</div>
// <div data-parallax="-0.1">reverse layer</div>
```

---

## Performance Considerations

```css
/* ---- Only animate compositor properties ---- */
/* GOOD: transform and opacity stay on GPU */
.scroll-animated {
  animation: fadeInUp linear both;
  animation-timeline: view();
}

/* BAD: animating layout properties via scroll */
@keyframes bad-width-grow {
  from { width: 0; }      /* triggers layout on every scroll event */
  to   { width: 100%; }
}

/* FIX: use transform: scaleX() instead */
@keyframes good-grow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
.progress-bar {
  transform-origin: left center;
  animation: good-grow linear both;
  animation-timeline: scroll(root);
}

/* ---- will-change for scroll-heavy animations ---- */
.parallax-element {
  will-change: transform;
  /* Promote to compositor layer before animation starts */
}

/* ---- contain property to limit repaint area ---- */
.scroll-card {
  contain: layout style paint;
  /* Changes inside don't affect outside layout */
}
```

### IntersectionObserver vs scroll event

```javascript
// WRONG: reading scroll position on every scroll event
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY; // forces layout recalculation
  elements.forEach(el => {
    if (isInView(el)) el.classList.add('visible');
  });
});

// RIGHT: IntersectionObserver — browser handles it efficiently
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    entry.target.classList.toggle('visible', entry.isIntersecting);
  });
});
// Zero scroll event handlers, fully browser-managed

// RIGHT: when you DO need scroll values, use passive + RAF
window.addEventListener('scroll', onScroll, { passive: true });
function onScroll() {
  if (!rafPending) {
    requestAnimationFrame(readAndUpdate);
    rafPending = true;
  }
}
```

---

## Progressive Enhancement Pattern

```css
/* Base experience: no animation (works everywhere) */
.reveal-item {
  /* Visible by default — JS will hide and reveal */
}

/* Enhanced: JavaScript adds this class when IO is supported */
.js-scroll-animations .reveal-item {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 400ms ease-out, transform 400ms ease-out;
}

.js-scroll-animations .reveal-item.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Further enhanced: CSS scroll-driven where supported */
@supports (animation-timeline: scroll()) {
  .reveal-item {
    animation: reveal-from-scroll linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 60%;
    /* Override the JS-driven approach */
    opacity: initial;
    transform: initial;
    transition: none;
  }

  @keyframes reveal-from-scroll {
    entry 0%  { opacity: 0; transform: translateY(16px); }
    entry 60% { opacity: 1; transform: translateY(0); }
  }
}

/* Always: respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .reveal-item,
  .js-scroll-animations .reveal-item {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
}
```

```javascript
// Feature detection for progressive enhancement
const supportsScrollTimeline = CSS.supports('animation-timeline', 'scroll()');
const supportsIO = 'IntersectionObserver' in window;

if (!supportsScrollTimeline && supportsIO) {
  // Fall back to IntersectionObserver
  document.documentElement.classList.add('js-scroll-animations');
  // ... set up observer
} else if (!supportsScrollTimeline && !supportsIO) {
  // No animation support: show everything immediately
  document.querySelectorAll('.reveal-item')
    .forEach(el => el.classList.add('is-visible'));
}
```
