# Navigation Components

## Navigation Design Principles

Navigation is infrastructure. Users should never have to think about it. Good navigation is invisible — it just gets people where they need to go. Bad navigation is the primary reason users give up on apps.

**The three questions users ask:** Where am I? Where can I go? How do I get back?

Every navigation pattern must answer all three.

---

## Navbar Anatomy

The top navigation bar. Most common navigation pattern for web apps.

```html
<header class="navbar" role="banner">
  <nav class="navbar-inner" aria-label="Main navigation">
    <!-- Logo / Brand -->
    <a href="/" class="navbar-brand" aria-label="Acme — Home">
      <img src="logo.svg" alt="" aria-hidden="true" height="32" />
      <span class="brand-name">Acme</span>
    </a>

    <!-- Primary links -->
    <ul class="navbar-nav" role="list">
      <li>
        <a href="/dashboard"
           class="nav-link"
           aria-current="page">  <!-- only on active page -->
          Dashboard
        </a>
      </li>
      <li>
        <a href="/projects" class="nav-link">Projects</a>
      </li>
      <!-- Dropdown nav item -->
      <li class="nav-dropdown">
        <button
          class="nav-link nav-dropdown-trigger"
          aria-haspopup="true"
          aria-expanded="false"
        >
          Products
          <svg aria-hidden="true" class="nav-chevron"><!-- chevron-down --></svg>
        </button>
        <ul class="dropdown-menu" role="list" hidden>
          <li><a href="/products/analytics">Analytics</a></li>
          <li><a href="/products/forms">Forms</a></li>
        </ul>
      </li>
    </ul>

    <!-- Right-side actions -->
    <div class="navbar-actions">
      <button class="btn btn-ghost btn-sm">Sign in</button>
      <a href="/signup" class="btn btn-primary btn-sm">Get started</a>
    </div>

    <!-- Mobile hamburger -->
    <button
      class="navbar-toggle"
      aria-label="Open navigation menu"
      aria-expanded="false"
      aria-controls="mobile-menu"
    >
      <svg aria-hidden="true"><!-- menu --></svg>
    </button>
  </nav>
</header>
```

```css
.navbar {
  height: 60px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}
.navbar-inner {
  height: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-padding);
  display: flex;
  align-items: center;
  gap: 24px;
}
.navbar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 0;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 150ms, background 150ms;
}
.nav-link:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
}
.nav-link[aria-current="page"] {
  color: var(--color-brand-600);
  background: var(--color-brand-50);
}
```

---

## Sidebar Navigation

### Persistent Sidebar (desktop apps)
Always visible. Best for apps with many sections or frequent switching.

```html
<aside class="sidebar" aria-label="Application navigation">
  <nav>
    <!-- Logo -->
    <div class="sidebar-header">
      <a href="/" class="sidebar-brand">Acme</a>
    </div>

    <!-- Nav sections -->
    <div class="sidebar-section">
      <p class="sidebar-section-label" aria-hidden="true">Main</p>
      <ul role="list">
        <li>
          <a href="/dashboard" class="sidebar-link" aria-current="page">
            <svg aria-hidden="true" class="sidebar-icon"><!-- home --></svg>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="/projects" class="sidebar-link">
            <svg aria-hidden="true" class="sidebar-icon"><!-- folder --></svg>
            <span>Projects</span>
            <span class="badge" aria-label="3 active">3</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Bottom section -->
    <div class="sidebar-footer">
      <a href="/settings" class="sidebar-link">
        <svg aria-hidden="true"><!-- settings --></svg>
        <span>Settings</span>
      </a>
    </div>
  </nav>
</aside>
```

```css
.sidebar {
  width: 240px;
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}
.sidebar-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  padding: 16px 12px 4px;
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  margin: 1px 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background 150ms, color 150ms;
}
.sidebar-link:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
.sidebar-link[aria-current="page"] {
  background: var(--color-brand-50);
  color: var(--color-brand-700);
}
.sidebar-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
```

### Collapsible Sidebar
```css
.sidebar {
  width: 240px;
  transition: width 250ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.sidebar.is-collapsed { width: 56px; }

/* Hide text when collapsed */
.sidebar.is-collapsed .sidebar-link span,
.sidebar.is-collapsed .sidebar-section-label {
  opacity: 0;
  width: 0;
  overflow: hidden;
}
/* Center icons when collapsed */
.sidebar.is-collapsed .sidebar-link {
  justify-content: center;
  padding: 8px;
}
```

```html
<button
  class="sidebar-collapse-btn"
  aria-expanded="true"
  aria-controls="sidebar"
  aria-label="Collapse sidebar"
>
  <svg aria-hidden="true"><!-- panel-left-close --></svg>
</button>
```

### Mini / Icon Sidebar
Collapsed by default. Icons only, expand on hover or toggle.

```css
.sidebar--mini {
  width: 56px;
}
.sidebar--mini:hover,
.sidebar--mini:focus-within {
  width: 240px;
}
/* Or use a toggle button approach rather than hover (hover is less discoverable) */
```

**Active state in mini mode:** Use a left border accent to indicate active item when text is hidden.
```css
.sidebar--mini .sidebar-link[aria-current="page"] {
  border-left: 3px solid var(--color-brand-500);
  padding-left: calc(12px - 3px);
}
```

---

## Tabs

### Underline Tabs (most common)
```html
<div class="tabs">
  <div class="tab-list" role="tablist" aria-label="Account settings">
    <button
      role="tab"
      id="tab-profile"
      aria-controls="panel-profile"
      aria-selected="true"
      class="tab"
    >
      Profile
    </button>
    <button
      role="tab"
      id="tab-security"
      aria-controls="panel-security"
      aria-selected="false"
      class="tab"
      tabindex="-1"
    >
      Security
    </button>
    <button
      role="tab"
      id="tab-billing"
      aria-controls="panel-billing"
      aria-selected="false"
      class="tab"
      tabindex="-1"
    >
      Billing
    </button>
  </div>

  <div
    id="panel-profile"
    role="tabpanel"
    aria-labelledby="tab-profile"
    tabindex="0"
  >
    <!-- Profile content -->
  </div>
  <div
    id="panel-security"
    role="tabpanel"
    aria-labelledby="tab-security"
    hidden
  >
    <!-- Security content -->
  </div>
</div>
```

```css
.tab-list {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  gap: 0;
}
.tab {
  padding: 10px 16px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  position: relative;
  transition: color 150ms;
  white-space: nowrap;
}
.tab:hover { color: var(--color-text-primary); }
.tab[aria-selected="true"] {
  color: var(--color-brand-600);
}
.tab[aria-selected="true"]::after {
  content: '';
  position: absolute;
  bottom: -1px; /* overlap border-bottom */
  left: 0; right: 0;
  height: 2px;
  background: var(--color-brand-500);
  border-radius: 1px 1px 0 0;
}
.tab:focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: -2px;
  border-radius: 4px 4px 0 0;
}
```

**Keyboard navigation (ARIA pattern):**
```js
tabList.addEventListener('keydown', (e) => {
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(document.activeElement);

  let next;
  if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
  if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
  if (e.key === 'Home') next = 0;
  if (e.key === 'End') next = tabs.length - 1;

  if (next !== undefined) {
    e.preventDefault();
    tabs[next].focus();
    // Activate tab on arrow key (automatic activation pattern)
    activateTab(tabs[next]);
  }
});
```

### Pill Tabs
```css
.tabs--pill .tab-list {
  border-bottom: none;
  background: var(--color-surface-subtle);
  border-radius: var(--radius-lg);
  padding: 4px;
  gap: 2px;
}
.tabs--pill .tab {
  border-radius: var(--radius-md);
  padding: 6px 14px;
}
.tabs--pill .tab[aria-selected="true"] {
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-primary);
}
.tabs--pill .tab[aria-selected="true"]::after { display: none; }
```

### Card Tabs (elevated)
```css
.tabs--card .tab {
  border: 1px solid var(--color-border);
  border-bottom: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: var(--color-surface-subtle);
  margin-right: 2px;
}
.tabs--card .tab[aria-selected="true"] {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-surface); /* hides bottom border */
}
```

---

## Breadcrumbs

Shows location in hierarchy. Essential for deep navigation trees.

```html
<nav aria-label="Breadcrumb">
  <ol class="breadcrumbs" role="list">
    <li>
      <a href="/">
        <svg aria-hidden="true"><!-- home --></svg>
        <span class="sr-only">Home</span>
      </a>
    </li>
    <li aria-hidden="true" class="breadcrumb-separator">
      <svg><!-- chevron-right --></svg>
    </li>
    <li>
      <a href="/projects">Projects</a>
    </li>
    <li aria-hidden="true" class="breadcrumb-separator">
      <svg><!-- chevron-right --></svg>
    </li>
    <li>
      <a href="/projects/acme">Acme Corp</a>
    </li>
    <li aria-hidden="true" class="breadcrumb-separator">
      <svg><!-- chevron-right --></svg>
    </li>
    <li aria-current="page">Settings</li>
  </ol>
</nav>
```

```css
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 14px;
  flex-wrap: wrap;
}
.breadcrumbs a {
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 150ms;
}
.breadcrumbs a:hover { color: var(--color-text-primary); }
.breadcrumbs [aria-current="page"] {
  color: var(--color-text-primary);
  font-weight: 500;
}
.breadcrumb-separator {
  color: var(--color-border);
  flex-shrink: 0;
}
```

**Truncation for long paths:**
```html
<!-- When more than 3 levels: show first + ellipsis + last 2 -->
<li>
  <a href="/">Home</a>
</li>
<li aria-hidden="true">›</li>
<li>
  <button class="breadcrumb-expand" aria-label="Show full path">…</button>
</li>
<li aria-hidden="true">›</li>
<li><a href="/projects/acme">Acme Corp</a></li>
<li aria-hidden="true">›</li>
<li aria-current="page">Settings</li>
```

---

## Pagination

### Numbered Pagination
See 05-tables-data-display.md for the full pattern. Key points:
- Show max 7 page numbers (first, last, current ±2, ellipsis)
- `aria-current="page"` on active page button
- `aria-label="Page N"` on each page button
- Previous/Next buttons always visible, disabled at boundaries

### Load More
```html
<button
  class="btn btn-secondary"
  aria-label="Load more articles"
  aria-describedby="load-more-status"
>
  Load more
</button>
<p id="load-more-status" aria-live="polite" class="sr-only">
  Showing 20 of 147 articles
</p>
```

**Advantage over infinite scroll:** User controls when content loads. Back button preserves scroll position. Better for SEO.

### Infinite Scroll
```js
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && !isLoading && hasMore) {
      loadNextPage();
    }
  },
  { rootMargin: '200px' } // preload 200px before visible
);
// Observe a sentinel element at bottom of list
observer.observe(document.querySelector('.scroll-sentinel'));
```

**Accessibility requirement:** Infinite scroll must have a "Load more" button fallback — scroll events don't fire for keyboard users.

---

## Stepper / Wizard

Multi-step flow progress indicator.

```html
<nav aria-label="Checkout steps">
  <ol class="stepper" role="list">
    <li class="step step--completed" aria-label="Step 1: Cart — Completed">
      <span class="step-indicator">
        <svg aria-hidden="true"><!-- check --></svg>
      </span>
      <span class="step-label">Cart</span>
    </li>
    <li class="step step--active" aria-current="step"
        aria-label="Step 2: Shipping — Current">
      <span class="step-indicator">2</span>
      <span class="step-label">Shipping</span>
    </li>
    <li class="step" aria-label="Step 3: Payment — Not yet reached">
      <span class="step-indicator">3</span>
      <span class="step-label">Payment</span>
    </li>
    <li class="step" aria-label="Step 4: Review — Not yet reached">
      <span class="step-indicator">4</span>
      <span class="step-label">Review</span>
    </li>
  </ol>
</nav>
```

```css
.stepper {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
}
.step {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
}
/* Connector line between steps */
.step:not(:last-child)::after {
  content: '';
  flex: 1;
  height: 2px;
  background: var(--color-border);
  margin: 0 8px;
}
.step--completed::after { background: var(--color-brand-500); }

.step-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  background: var(--color-surface);
}
.step--completed .step-indicator {
  background: var(--color-brand-500);
  border-color: var(--color-brand-500);
  color: white;
}
.step--active .step-indicator {
  border-color: var(--color-brand-500);
  color: var(--color-brand-600);
}
.step-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
}
.step--active .step-label { color: var(--color-text-primary); font-weight: 600; }
.step--completed .step-label { color: var(--color-text-muted); }
```

---

## Bottom Navigation (Mobile)

Primary navigation for mobile apps. Persistent, always visible.

```html
<nav class="bottom-nav" aria-label="Main navigation">
  <a href="/" class="bottom-nav-item" aria-current="page">
    <svg aria-hidden="true" class="bottom-nav-icon"><!-- home --></svg>
    <span class="bottom-nav-label">Home</span>
  </a>
  <a href="/search" class="bottom-nav-item">
    <svg aria-hidden="true" class="bottom-nav-icon"><!-- search --></svg>
    <span class="bottom-nav-label">Search</span>
  </a>
  <a href="/notifications" class="bottom-nav-item">
    <span class="bottom-nav-icon-wrapper">
      <svg aria-hidden="true" class="bottom-nav-icon"><!-- bell --></svg>
      <span class="nav-badge" aria-label="3 unread notifications">3</span>
    </span>
    <span class="bottom-nav-label">Notifications</span>
  </a>
  <a href="/profile" class="bottom-nav-item">
    <svg aria-hidden="true" class="bottom-nav-icon"><!-- person --></svg>
    <span class="bottom-nav-label">Profile</span>
  </a>
</nav>
```

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  z-index: var(--z-sticky);
  /* iOS safe area */
  padding-bottom: env(safe-area-inset-bottom);
  height: calc(60px + env(safe-area-inset-bottom));
}
.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 11px;
  padding: 8px 4px;
  transition: color 150ms;
}
.bottom-nav-item[aria-current="page"] {
  color: var(--color-brand-500);
}
.bottom-nav-icon { width: 24px; height: 24px; }

/* Badge */
.bottom-nav-icon-wrapper { position: relative; }
.nav-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: var(--color-red-500);
  color: white;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Rules:**
- 3–5 items maximum
- Always show label (no icon-only bottom nav)
- Active item uses color + possibly filled icon variant
- Account for iOS safe area inset (`env(safe-area-inset-bottom)`)
- Do not use on desktop — use sidebar or top nav

---

## App Shell Patterns

### Classic App Shell
```
┌─ Navbar (sticky) ───────────────────────────┐
│                                              │
├─ Sidebar ─┬─ Main Content ─────────────────┤
│           │                                  │
│  Nav      │  Page content                   │
│  items    │                                  │
│           │                                  │
└───────────┴──────────────────────────────────┘
```

```css
.app-shell {
  display: grid;
  grid-template-rows: var(--navbar-height) 1fr;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-areas:
    "navbar navbar"
    "sidebar main";
  height: 100vh;
  overflow: hidden;
}
.app-navbar  { grid-area: navbar; }
.app-sidebar { grid-area: sidebar; overflow-y: auto; }
.app-main    { grid-area: main; overflow-y: auto; }
```

### Responsive: Sidebar → Drawer on Mobile
```css
@media (max-width: 768px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-areas:
      "navbar"
      "main";
  }
  .app-sidebar {
    position: fixed;
    left: 0;
    top: var(--navbar-height);
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 300ms ease;
    z-index: var(--z-drawer);
  }
  .app-sidebar.is-open { transform: translateX(0); }
}
```

---

## Active State Indicators

Consistent active state = clear location awareness.

```css
/* Underline (tabs, navbar) */
[aria-current="page"].nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0; right: 0;
  height: 2px;
  background: var(--color-brand-500);
}

/* Background (sidebar) */
[aria-current="page"].sidebar-link {
  background: var(--color-brand-50);
  color: var(--color-brand-700);
}

/* Left accent (sidebar mini) */
[aria-current="page"].sidebar-link--mini {
  border-left: 3px solid var(--color-brand-500);
}

/* Filled icon (bottom nav) */
/* Use two icon variants: outline (default), filled (active) */
[aria-current="page"] .icon-outline { display: none; }
.icon-filled { display: none; }
[aria-current="page"] .icon-filled { display: block; }
```

**`aria-current="page"`** is the correct attribute for navigation active state. Use it on the `<a>` element, not a parent. Screen readers announce "current page" when this is present.

---

## Navigation Accessibility Checklist

- `<nav>` element with `aria-label` distinguishes multiple navs on the page
- `aria-current="page"` on the active link
- Skip navigation link at the top of page:
  ```html
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ```
  ```css
  .skip-link {
    position: absolute;
    top: -100%;
    left: 0;
  }
  .skip-link:focus { top: 0; }
  ```
- Mobile menu: `aria-expanded` on hamburger button
- Dropdown menus: `aria-haspopup="true"` + `aria-expanded` on trigger
- Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`, arrow key navigation
- Breadcrumbs: `<nav aria-label="Breadcrumb">` + `<ol>` + `aria-current="page"` on last item
- Stepper: `aria-current="step"` on active step
- All nav links: visible focus styles

---

## Common Navigation Pitfalls

1. **No skip link** — keyboard users tab through entire nav on every page
2. **Active state is color-only** — fails color-blind users; use background/underline/icon too
3. **Mobile nav not keyboard accessible** — must open/close via Enter/Space, dismiss via ESC
4. **Nested dropdowns on mobile** — impractical on touch; flatten or use accordion
5. **Too many top-level nav items** — 5–7 max; group into dropdowns beyond that
6. **Bottom nav with 6+ items** — gets cramped; use a "More" overflow menu
7. **Tabs that behave like links** — tabs show/hide content on the same page; links navigate. Choose one.
8. **Breadcrumbs that duplicate page title** — breadcrumbs show PATH, not the current page description
9. **Sidebar that disappears on mobile without alternative** — always provide a mobile access pattern
10. **No visual connection between active nav item and page heading** — users get disoriented
