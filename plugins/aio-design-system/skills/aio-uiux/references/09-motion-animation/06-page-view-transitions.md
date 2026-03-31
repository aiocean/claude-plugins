# Page & View Transitions

The View Transitions API lets you animate between UI states — route changes, page navigations, content updates — with smooth morphing and cross-fade effects. It works for both same-document (SPA) and cross-document (MPA) transitions.

---

## How the View Transitions API Works

When `document.startViewTransition()` is called:

1. Browser captures a **screenshot** of the current state
2. Your callback runs (DOM update, route change, etc.)
3. Browser captures the **new state**
4. Browser animates between the two captures using `::view-transition` pseudo-elements
5. Default: cross-fade. Customizable via CSS.

```
Old state screenshot  ──┐
                         ├── CSS animation ──> New live DOM
New state live render ──┘
```

---

## Basic Same-Document Transition (SPA)

```javascript
// ============================================
// Minimal SPA route transition
// ============================================

async function navigateTo(url) {
  // Check for API support
  if (!document.startViewTransition) {
    // Fallback: instant swap
    await renderPage(url);
    return;
  }

  // Start transition — the callback is the DOM update
  const transition = document.startViewTransition(async () => {
    await renderPage(url); // update the DOM
  });

  // Optional: wait for completion
  try {
    await transition.finished;
  } catch (e) {
    // Transition was skipped or interrupted
  }
}

// The transition object exposes three promises:
// transition.ready   — pseudo-elements created, CSS animation about to start
// transition.updateCallbackDone — callback resolved
// transition.finished — animation fully complete

// ============================================
// React Router integration example
// ============================================

// In your router setup:
function navigate(to) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      // Trigger React re-render / router update
      router.push(to);
    });
  } else {
    router.push(to);
  }
}
```

---

## Default Cross-Fade Customization

Without any CSS, View Transitions produces a simple cross-fade. Override `::view-transition-*` pseudo-elements to change the animation.

```css
/* ============================================
   View Transition pseudo-element tree:

   ::view-transition
   └── ::view-transition-group(root)
       └── ::view-transition-image-pair(root)
           ├── ::view-transition-old(root)   ← screenshot of old state
           └── ::view-transition-new(root)   ← new live state
   ============================================ */

/* Override default cross-fade with slide */
@keyframes slide-from-right {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

@keyframes slide-to-left {
  from { transform: translateX(0); }
  to   { transform: translateX(-100%); }
}

/* New page slides in from right */
::view-transition-new(root) {
  animation: slide-from-right 300ms cubic-bezier(0.0, 0.0, 0.2, 1) both;
}

/* Old page slides out to left */
::view-transition-old(root) {
  animation: slide-to-left 300ms cubic-bezier(0.4, 0.0, 1, 1) both;
}

/* ---- Fade + scale variant ---- */
@keyframes vt-fade-in {
  from { opacity: 0; transform: scale(0.97); }
}

@keyframes vt-fade-out {
  to   { opacity: 0; transform: scale(1.02); }
}

::view-transition-new(root) {
  animation: vt-fade-in 250ms ease-out both;
}
::view-transition-old(root) {
  animation: vt-fade-out 200ms ease-in both;
}

/* ---- Direction-aware transitions via data attributes ---- */
/* Set data-direction on <html> before transition */
[data-direction="forward"] ::view-transition-new(root) {
  animation: slide-from-right 300ms ease-out both;
}
[data-direction="forward"] ::view-transition-old(root) {
  animation: slide-to-left 250ms ease-in both;
}
[data-direction="back"] ::view-transition-new(root) {
  animation: slide-from-left 300ms ease-out both;
}
[data-direction="back"] ::view-transition-old(root) {
  animation: slide-to-right 250ms ease-in both;
}

@keyframes slide-from-left  { from { transform: translateX(-100%); } }
@keyframes slide-to-right   { to   { transform: translateX(100%); } }
```

```javascript
// Set direction before transition
function navigate(to, direction = 'forward') {
  document.documentElement.dataset.direction = direction;

  document.startViewTransition(async () => {
    await renderPage(to);
    // Clean up after transition
    delete document.documentElement.dataset.direction;
  });
}
```

---

## Shared Element Transitions (view-transition-name)

The most powerful feature: elements with matching `view-transition-name` values morph between their old and new positions/sizes.

```css
/* ============================================
   Shared element: same name in old and new state
   Browser morphs position, size, and content
   ============================================ */

/* List page: each card has a unique name */
.product-card[data-id="42"] {
  view-transition-name: product-42;
  /* contain: layout; — helps browser capture correctly */
  contain: layout;
}

/* Detail page: hero element has the SAME name */
.product-hero[data-id="42"] {
  view-transition-name: product-42;
  contain: layout;
}

/* Browser automatically morphs .product-card → .product-hero */
/* No explicit animation needed for the shared element */

/* ---- Setting names dynamically via JS ---- */
/*
  // Before transition
  clickedCard.style.viewTransitionName = 'selected-card';

  document.startViewTransition(() => {
    renderDetailPage();
    // In new DOM, the hero must also have the name
    detailHero.style.viewTransitionName = 'selected-card';
  });

  // After transition, clean up
  transition.finished.then(() => {
    clickedCard.style.viewTransitionName = '';
    // detail hero can keep its name for back transition
  });
*/

/* ---- Customizing shared element animation ---- */

/* Target specific named elements */
::view-transition-old(product-hero) {
  animation: none; /* skip old state animation — morphing handles it */
}
::view-transition-new(product-hero) {
  animation: none; /* morphing handles position/size transition */
}

/* Override morphing duration */
::view-transition-group(product-hero) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Cross-Document Transitions (MPA)

For multi-page apps (full page navigations), add `@view-transition` to opt in. Chrome 126+.

```css
/* ============================================
   Enable cross-document transitions
   Add to BOTH the old and new page's CSS
   ============================================ */
@view-transition {
  navigation: auto; /* enables for same-origin navigations */
}

/* Now customize exactly like same-document transitions */
::view-transition-old(root) {
  animation: slide-to-left 250ms ease-in both;
}

::view-transition-new(root) {
  animation: slide-from-right 300ms ease-out both;
}

/* Shared elements work cross-document too */
.page-header {
  view-transition-name: page-header;
}
```

```javascript
// pageswap event fires on the OLD page just before navigation
window.addEventListener('pageswap', (event) => {
  if (event.viewTransition) {
    // Access transition object on old page
    // Useful for: setting direction based on navigation type
    const navType = event.activation?.navigationType; // 'push', 'reload', 'back_forward'
    document.documentElement.dataset.navType = navType;
  }
});

// pagereveal event fires on the NEW page when it's about to be shown
window.addEventListener('pagereveal', (event) => {
  if (event.viewTransition) {
    // New page is about to animate in
    const navType = navigation?.activation?.navigationType;

    if (navType === 'back_forward') {
      // Reverse the animation direction for back navigation
      document.documentElement.dataset.direction = 'back';
    }
  }
});
```

---

## ::view-transition Pseudo-Elements Reference

```css
/* Full pseudo-element hierarchy and what you can style */

/* Root overlay — covers entire page during transition */
::view-transition {
  /* Usually don't touch this */
  pointer-events: none;
}

/* Group: positions and sizes the old/new pair
   Animates: transform (position/size morphing) */
::view-transition-group(root) {
  animation-duration: 300ms;
  animation-timing-function: ease-out;
}

/* Image pair: wraps old and new, handles blending */
::view-transition-image-pair(root) {
  /* isolation: isolate is applied automatically for correct blending */
}

/* Old state capture — animates out */
::view-transition-old(root) {
  animation: /* your exit animation */;
  /* mix-blend-mode: normal is default */
}

/* New state — animates in */
::view-transition-new(root) {
  animation: /* your enter animation */;
}

/* Wildcard: applies to ALL named transitions */
::view-transition-old(*) {
  animation-duration: 200ms;
}

/* Disable animation for a specific element */
::view-transition-old(sidebar),
::view-transition-new(sidebar) {
  animation: none;
}
```

---

## Morphing Animations

Creating smooth morphs between different shapes/sizes of the same element.

```css
/* ============================================
   Card → Modal morph
   ============================================ */

/* The card in the list */
.article-card {
  view-transition-name: article-detail;
  border-radius: 12px;
  /* The group animation handles position/size morphing */
}

/* The expanded modal version */
.article-modal {
  view-transition-name: article-detail;
  border-radius: 0; /* or 0px for full-screen */
}

/* The morph handles: position, size, border-radius all transition smoothly */

/* Customize morph easing */
::view-transition-group(article-detail) {
  animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
  animation-duration: 400ms;
}

/* Fade the content (text changes between card and modal) */
::view-transition-old(article-detail) {
  animation: vt-fade-out 200ms ease-in both;
}
::view-transition-new(article-detail) {
  animation: vt-fade-in 250ms ease-out 100ms both;
}

@keyframes vt-fade-out {
  to { opacity: 0; }
}
@keyframes vt-fade-in {
  from { opacity: 0; }
}

/* ============================================
   Image gallery: thumbnail → full-size
   ============================================ */

.gallery-thumb {
  cursor: pointer;
  border-radius: 8px;
}

.gallery-full {
  border-radius: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Set view-transition-name dynamically on click */
```

```javascript
// Gallery morph implementation
document.querySelectorAll('.gallery-thumb').forEach(thumb => {
  thumb.addEventListener('click', async () => {
    const id = thumb.dataset.imageId;

    // Set the name on the clicked thumbnail
    thumb.style.viewTransitionName = `gallery-image-${id}`;

    const transition = document.startViewTransition(() => {
      // Show full-size image
      showFullImage(id);
      // The full-size element must get the same name
      document.querySelector('.gallery-full').style.viewTransitionName =
        `gallery-image-${id}`;
    });

    await transition.finished;

    // Clean up the thumbnail name (it's hidden now anyway)
    thumb.style.viewTransitionName = '';
  });
});
```

---

## Browser Support and Fallbacks

```javascript
// ============================================
// Graceful fallback pattern
// ============================================

const supportsViewTransitions = 'startViewTransition' in document;

async function transitionTo(updateFn) {
  if (supportsViewTransitions) {
    await document.startViewTransition(updateFn).finished;
  } else {
    // Instant update without animation
    await updateFn();
  }
}

// Usage
transitionTo(() => {
  renderNewPage();
});

// ============================================
// Feature detection with reduced motion
// ============================================

// Respect prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none !important;
  }

  /* Allow instant cross-fade but no movement */
  ::view-transition-old(root) {
    animation: vt-fade-out 150ms ease-out both !important;
  }
  ::view-transition-new(root) {
    animation: vt-fade-in 150ms ease-out both !important;
  }
}
```

```
Browser support (as of 2025):
┌─────────────────────────────────┬──────────────────┐
│ Feature                         │ Support          │
├─────────────────────────────────┼──────────────────┤
│ Same-document transitions       │ Chrome 111+, ✓   │
│                                 │ Safari 18+, ✓    │
│                                 │ Firefox (flag)   │
│ Cross-document transitions      │ Chrome 126+      │
│                                 │ Safari 18.2+     │
│ Shared element morphing         │ Chrome 111+      │
│                                 │ Safari 18+       │
│ @view-transition rule           │ Chrome 126+      │
└─────────────────────────────────┴──────────────────┘
```

---

## Complete SPA Route Transition Example

```javascript
// router.js — full implementation with direction detection

class AnimatedRouter {
  constructor() {
    this.history = [window.location.pathname];

    // Intercept all <a> clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      if (link.hostname !== window.location.hostname) return;
      if (link.getAttribute('href').startsWith('#')) return;

      e.preventDefault();
      this.navigate(link.href);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const direction = this.history.includes(window.location.pathname)
        ? 'back' : 'forward';
      this.render(window.location.pathname, direction);
    });
  }

  async navigate(url) {
    const path = new URL(url).pathname;
    window.history.pushState({}, '', url);
    this.history.push(path);
    await this.render(path, 'forward');
  }

  async render(path, direction = 'forward') {
    // Set direction for CSS to consume
    document.documentElement.dataset.navDirection = direction;

    const updateDOM = async () => {
      const html = await fetch(path).then(r => r.text());
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, 'text/html');
      document.getElementById('main').innerHTML =
        newDoc.getElementById('main').innerHTML;
      document.title = newDoc.title;
    };

    if (document.startViewTransition) {
      const t = document.startViewTransition(updateDOM);
      await t.finished;
    } else {
      await updateDOM();
    }

    delete document.documentElement.dataset.navDirection;
  }
}
```

```css
/* router.css — transitions tied to data-nav-direction */

@keyframes enter-from-right { from { transform: translateX(6%); opacity: 0; } }
@keyframes enter-from-left  { from { transform: translateX(-6%); opacity: 0; } }
@keyframes exit-to-left     { to   { transform: translateX(-6%); opacity: 0; } }
@keyframes exit-to-right    { to   { transform: translateX(6%);  opacity: 0; } }

[data-nav-direction="forward"] ::view-transition-new(root) {
  animation: enter-from-right 300ms cubic-bezier(0.0, 0.0, 0.2, 1) both;
}
[data-nav-direction="forward"] ::view-transition-old(root) {
  animation: exit-to-left 250ms cubic-bezier(0.4, 0.0, 1, 1) both;
}

[data-nav-direction="back"] ::view-transition-new(root) {
  animation: enter-from-left  300ms cubic-bezier(0.0, 0.0, 0.2, 1) both;
}
[data-nav-direction="back"] ::view-transition-old(root) {
  animation: exit-to-right 250ms cubic-bezier(0.4, 0.0, 1, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none !important;
  }
}
```
