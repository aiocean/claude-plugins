# Navigation Patterns

Navigation is the skeleton of your UI. The wrong pattern creates confusion; the right one becomes invisible. This reference covers every major pattern with decision criteria.

---

## Top Navigation Bar

The horizontal bar at the top of the page. The most common pattern for desktop web apps.

### When to Use
- Primary navigation with 3–7 items
- Marketing/content sites
- Apps where horizontal space is plentiful
- When brand logo needs prominent placement

### When to Avoid
- More than 7 top-level items (use mega menu or restructure IA)
- Deep navigation hierarchies (more than 2 levels)
- Mobile-primary apps (bottom nav is better)

### Implementation

```html
<header class="topnav">
  <a href="/" class="topnav__logo" aria-label="Company home">
    <img src="/logo.svg" alt="Company" />
  </a>

  <nav aria-label="Main navigation">
    <ul class="topnav__links" role="list">
      <li><a href="/dashboard" aria-current="page">Dashboard</a></li>
      <li><a href="/projects">Projects</a></li>
      <li><a href="/team">Team</a></li>
      <li>
        <!-- Dropdown trigger -->
        <button
          class="topnav__dropdown-trigger"
          aria-expanded="false"
          aria-haspopup="true"
          aria-controls="settings-menu"
        >
          Settings
          <svg aria-hidden="true"><!-- chevron --></svg>
        </button>
        <ul id="settings-menu" class="topnav__dropdown" role="menu" hidden>
          <li role="menuitem"><a href="/settings/profile">Profile</a></li>
          <li role="menuitem"><a href="/settings/billing">Billing</a></li>
        </ul>
      </li>
    </ul>
  </nav>

  <div class="topnav__actions">
    <button class="btn-icon" aria-label="Notifications (3 unread)">
      <svg aria-hidden="true"><!-- bell --></svg>
      <span class="badge" aria-hidden="true">3</span>
    </button>
    <button class="avatar-button" aria-label="User menu" aria-haspopup="true">
      <img src="/avatar.jpg" alt="Jane Doe" class="avatar" />
    </button>
  </div>
</header>
```

```css
.topnav {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
}

.topnav__links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 4px;
  margin-left: 32px;
}

.topnav__links a,
.topnav__dropdown-trigger {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 0.9375rem;
  color: #374151;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.15s;
}

.topnav__links a:hover,
.topnav__dropdown-trigger:hover {
  background: #f3f4f6;
}

.topnav__links a[aria-current="page"] {
  background: #eff6ff;
  color: #2563eb;
}
```

---

## Side Navigation

Vertical navigation panel, usually persistent on the left. Dominant in web applications.

### Collapsible Sidebar

```html
<nav class="sidenav" aria-label="Application navigation">
  <button
    class="sidenav__toggle"
    aria-expanded="true"
    aria-controls="sidenav-content"
    aria-label="Collapse sidebar"
  >
    <svg aria-hidden="true"><!-- hamburger/arrow --></svg>
  </button>

  <div id="sidenav-content" class="sidenav__content">
    <!-- Section with group label -->
    <section aria-labelledby="nav-main-label">
      <h2 id="nav-main-label" class="sidenav__section-label">Main</h2>
      <ul role="list">
        <li>
          <a href="/dashboard" class="sidenav__item" aria-current="page">
            <svg class="sidenav__icon" aria-hidden="true"><!-- icon --></svg>
            <span class="sidenav__label">Dashboard</span>
          </a>
        </li>
        <li>
          <!-- Expandable nav group -->
          <button
            class="sidenav__item sidenav__item--group"
            aria-expanded="false"
            aria-controls="nav-projects"
          >
            <svg class="sidenav__icon" aria-hidden="true"><!-- icon --></svg>
            <span class="sidenav__label">Projects</span>
            <svg class="sidenav__chevron" aria-hidden="true"><!-- chevron --></svg>
          </button>
          <ul id="nav-projects" class="sidenav__subnav" hidden>
            <li><a href="/projects/active" class="sidenav__subitem">Active</a></li>
            <li><a href="/projects/archived" class="sidenav__subitem">Archived</a></li>
          </ul>
        </li>
      </ul>
    </section>
  </div>

  <div class="sidenav__footer">
    <a href="/settings" class="sidenav__item">
      <svg class="sidenav__icon" aria-hidden="true"><!-- settings --></svg>
      <span class="sidenav__label">Settings</span>
    </a>
  </div>
</nav>
```

```css
.sidenav {
  width: 240px;
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  background: #111827;
  color: #d1d5db;
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidenav.collapsed {
  width: 64px;
}

.sidenav.collapsed .sidenav__label {
  display: none;
}

.sidenav__item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 16px;
  border-radius: 6px;
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.sidenav__item:hover {
  background: rgba(255,255,255,0.06);
  color: #f9fafb;
}

.sidenav__item[aria-current="page"] {
  background: rgba(37, 99, 235, 0.2);
  color: #60a5fa;
}

.sidenav__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
```

### Responsive Sidebar (Drawer on Mobile)

```css
/* Desktop: always visible */
@media (min-width: 1024px) {
  .sidenav {
    position: sticky;
    transform: none;
  }
  .sidenav-overlay { display: none; }
}

/* Mobile: drawer */
@media (max-width: 1023px) {
  .sidenav {
    position: fixed;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidenav.open {
    transform: translateX(0);
  }

  .sidenav-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 199;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }

  .sidenav.open ~ .sidenav-overlay {
    opacity: 1;
    pointer-events: auto;
  }
}
```

---

## Tabs

For switching between related views at the same level of hierarchy.

### When to Use Tabs
- 2–7 sibling views with equivalent importance
- Content sections of the same entity (user profile: Overview / Activity / Settings)
- Filtering a view into distinct buckets (All / Active / Archived)

### When NOT to Use Tabs
- Navigation between different sections of an app (use nav bar or sidebar)
- More than 7 items (they overflow or get hard to scan)
- Content that needs to be compared side-by-side

### Horizontal Tabs

```html
<div class="tabs">
  <div role="tablist" aria-label="Account sections">
    <button
      role="tab"
      id="tab-overview"
      aria-controls="panel-overview"
      aria-selected="true"
      class="tab"
    >
      Overview
    </button>
    <button
      role="tab"
      id="tab-activity"
      aria-controls="panel-activity"
      aria-selected="false"
      class="tab"
      tabindex="-1"
    >
      Activity
    </button>
    <button
      role="tab"
      id="tab-settings"
      aria-controls="panel-settings"
      aria-selected="false"
      class="tab"
      tabindex="-1"
    >
      Settings
    </button>
  </div>

  <div
    role="tabpanel"
    id="panel-overview"
    aria-labelledby="tab-overview"
    tabindex="0"
  >
    <!-- Overview content -->
  </div>
  <div
    role="tabpanel"
    id="panel-activity"
    aria-labelledby="tab-activity"
    tabindex="0"
    hidden
  >
    <!-- Activity content -->
  </div>
</div>
```

```css
[role="tablist"] {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  gap: 0;
}

[role="tab"] {
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}

[role="tab"]:hover {
  color: #111827;
}

[role="tab"][aria-selected="true"] {
  color: #2563eb;
  border-bottom-color: #2563eb;
}
```

```javascript
// Keyboard navigation for tabs (required for accessibility)
tablist.addEventListener('keydown', (e) => {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(document.activeElement);

  if (e.key === 'ArrowRight') {
    const next = (current + 1) % tabs.length;
    tabs[next].focus();
    activateTab(tabs[next]);
  }
  if (e.key === 'ArrowLeft') {
    const prev = (current - 1 + tabs.length) % tabs.length;
    tabs[prev].focus();
    activateTab(tabs[prev]);
  }
  if (e.key === 'Home') { tabs[0].focus(); activateTab(tabs[0]); }
  if (e.key === 'End') { tabs[tabs.length-1].focus(); activateTab(tabs[tabs.length-1]); }
});
```

---

## Breadcrumbs

Show location within a hierarchy. Critical for deep content structures.

### When to Use
- More than 2 levels of hierarchy
- Users arrive via search/external links (need context)
- E-commerce category trees
- File system navigation
- Documentation with nested sections

```html
<nav aria-label="Breadcrumb">
  <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a href="/" itemprop="item">
        <span itemprop="name">Home</span>
      </a>
      <meta itemprop="position" content="1" />
    </li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a href="/products" itemprop="item">
        <span itemprop="name">Products</span>
      </a>
      <meta itemprop="position" content="2" />
    </li>
    <li aria-current="page" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <span itemprop="name">MacBook Pro 16"</span>
      <meta itemprop="position" content="3" />
    </li>
  </ol>
</nav>
```

```css
.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 0;
  font-size: 0.875rem;
}

.breadcrumb li + li::before {
  content: '/';
  margin: 0 8px;
  color: #9ca3af;
}

.breadcrumb a {
  color: #6b7280;
  text-decoration: none;
}

.breadcrumb a:hover {
  color: #111827;
  text-decoration: underline;
}

.breadcrumb [aria-current="page"] {
  color: #111827;
  font-weight: 500;
}
```

---

## Pagination

For breaking large datasets into pages.

### When to Use
- Tables and lists with more than ~25 rows
- When users need to know total count and position
- When users frequently navigate to specific pages

### When to Prefer Infinite Scroll / Load More
- Social feeds, activity logs (no need to jump to page 47)
- Mobile experiences
- When "position" doesn't matter to the user

```html
<nav aria-label="Search results pagination">
  <ul class="pagination" role="list">
    <li>
      <a href="?page=4" class="pagination__btn" aria-label="Previous page" rel="prev">
        <svg aria-hidden="true"><!-- chevron-left --></svg>
        Prev
      </a>
    </li>
    <li><a href="?page=1" class="pagination__btn" aria-label="Page 1">1</a></li>
    <li><a href="?page=2" class="pagination__btn" aria-label="Page 2">2</a></li>
    <li><span class="pagination__ellipsis" aria-hidden="true">…</span></li>
    <li><a href="?page=4" class="pagination__btn" aria-label="Page 4">4</a></li>
    <li>
      <a
        href="?page=5"
        class="pagination__btn pagination__btn--current"
        aria-label="Page 5, current page"
        aria-current="page"
      >5</a>
    </li>
    <li><a href="?page=6" class="pagination__btn" aria-label="Page 6">6</a></li>
    <li><span class="pagination__ellipsis" aria-hidden="true">…</span></li>
    <li><a href="?page=20" class="pagination__btn" aria-label="Page 20">20</a></li>
    <li>
      <a href="?page=6" class="pagination__btn" aria-label="Next page" rel="next">
        Next
        <svg aria-hidden="true"><!-- chevron-right --></svg>
      </a>
    </li>
  </ul>
</nav>
```

---

## Stepper / Wizard Navigation

Linear multi-step flow. Covered extensively in `01-form-design.md`. Additional notes here:

- Steps should be completable in order (enforce validation before advancing)
- Allow free backward movement
- Label steps with nouns, not numbers: "Account", not "Step 1"
- Show estimated time or step count: "3 of 5"
- On mobile, show only current step label + progress bar — full stepper doesn't fit

---

## Command Palette (⌘K)

Power-user feature for keyboard-first navigation. Popularized by Linear, VS Code, Vercel.

### When to Use
- Apps with many actions or destinations (10+)
- Power users who prefer keyboard over mouse
- When actions are spread across deep navigation hierarchies

```html
<!-- Trigger button in top nav -->
<button class="cmd-palette-trigger" aria-label="Open command palette" aria-keyshortcuts="Meta+K">
  <svg aria-hidden="true"><!-- search --></svg>
  <span>Search...</span>
  <kbd aria-hidden="true">⌘K</kbd>
</button>

<!-- Modal overlay -->
<dialog class="cmd-palette" aria-label="Command palette" aria-modal="true">
  <div class="cmd-palette__input-wrap">
    <svg class="cmd-palette__search-icon" aria-hidden="true"><!-- search --></svg>
    <input
      type="text"
      class="cmd-palette__input"
      placeholder="Search commands, pages, people..."
      role="combobox"
      aria-expanded="true"
      aria-autocomplete="list"
      aria-controls="cmd-results"
      aria-activedescendant=""
      autocomplete="off"
    />
  </div>

  <ul
    id="cmd-results"
    class="cmd-palette__results"
    role="listbox"
    aria-label="Suggestions"
  >
    <li role="group" aria-label="Recent">
      <ul>
        <li
          role="option"
          aria-selected="true"
          class="cmd-palette__item cmd-palette__item--selected"
          id="cmd-item-0"
        >
          <svg aria-hidden="true"><!-- clock --></svg>
          <span>Dashboard</span>
        </li>
      </ul>
    </li>
    <li role="group" aria-label="Actions">
      <ul>
        <li role="option" class="cmd-palette__item" id="cmd-item-1">
          <svg aria-hidden="true"><!-- plus --></svg>
          <span>New Project</span>
          <kbd aria-hidden="true">⌘N</kbd>
        </li>
      </ul>
    </li>
  </ul>

  <div class="cmd-palette__footer" aria-hidden="true">
    <span><kbd>↑↓</kbd> Navigate</span>
    <span><kbd>↵</kbd> Open</span>
    <span><kbd>Esc</kbd> Close</span>
  </div>
</dialog>
```

```javascript
// Command palette keyboard handler
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openCommandPalette();
  }
});

function openCommandPalette() {
  const dialog = document.querySelector('.cmd-palette');
  dialog.showModal();
  dialog.querySelector('input').focus();
}

// Arrow key navigation within results
paletteInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { selectNext(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { selectPrev(); e.preventDefault(); }
  if (e.key === 'Enter') { executeSelected(); }
  if (e.key === 'Escape') { closePalette(); }
});
```

---

## Contextual Menus

Right-click or long-press menus. Surface relevant actions for the item in focus.

```html
<div
  class="context-menu"
  role="menu"
  aria-label="File options"
  tabindex="-1"
  style="position: fixed; top: var(--y); left: var(--x);"
>
  <ul role="list">
    <li role="menuitem">
      <button>
        <svg aria-hidden="true"><!-- open --></svg>
        Open
      </button>
    </li>
    <li role="menuitem">
      <button>
        <svg aria-hidden="true"><!-- copy --></svg>
        Duplicate
        <kbd aria-hidden="true">⌘D</kbd>
      </button>
    </li>
    <li role="separator" aria-hidden="true"></li>
    <li role="menuitem">
      <button class="context-menu__item--danger">
        <svg aria-hidden="true"><!-- trash --></svg>
        Delete
        <kbd aria-hidden="true">⌫</kbd>
      </button>
    </li>
  </ul>
</div>
```

```javascript
document.addEventListener('contextmenu', (e) => {
  const target = e.target.closest('[data-context-menu]');
  if (!target) return;

  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, target.dataset.contextMenu);
});

// Close on outside click or Escape
document.addEventListener('click', closeContextMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContextMenu();
});
```

---

## Bottom Navigation (Mobile)

Fixed bar at bottom of screen with 3–5 top-level destinations. The mobile equivalent of top nav.

### When to Use
- Mobile apps with 3–5 primary destinations
- Destinations that users switch between frequently
- When thumb-reachability matters (bottom > top on tall phones)

### When to Avoid
- More than 5 destinations (use a hamburger + drawer instead)
- Desktop (bottom nav looks odd and wastes vertical space)
- When one section dominates usage (just show it, skip the nav)

```html
<nav class="bottom-nav" aria-label="Main navigation">
  <a href="/home" class="bottom-nav__item" aria-current="page">
    <svg class="bottom-nav__icon" aria-hidden="true"><!-- home --></svg>
    <span class="bottom-nav__label">Home</span>
  </a>
  <a href="/search" class="bottom-nav__item">
    <svg class="bottom-nav__icon" aria-hidden="true"><!-- search --></svg>
    <span class="bottom-nav__label">Search</span>
  </a>
  <a href="/notifications" class="bottom-nav__item">
    <span class="bottom-nav__icon-wrap">
      <svg class="bottom-nav__icon" aria-hidden="true"><!-- bell --></svg>
      <span class="badge" aria-label="5 unread notifications">5</span>
    </span>
    <span class="bottom-nav__label">Alerts</span>
  </a>
  <a href="/profile" class="bottom-nav__item">
    <svg class="bottom-nav__icon" aria-hidden="true"><!-- person --></svg>
    <span class="bottom-nav__label">Profile</span>
  </a>
</nav>
```

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  display: flex;
  background: white;
  border-top: 1px solid #e5e7eb;
  padding-bottom: env(safe-area-inset-bottom); /* iPhone home bar */
  z-index: 100;
}

.bottom-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: #6b7280;
  font-size: 0.6875rem;
  transition: color 0.15s;
}

.bottom-nav__item[aria-current="page"] {
  color: #2563eb;
}

.bottom-nav__icon {
  width: 24px;
  height: 24px;
}
```

---

## Mega Menus

Full-width dropdown with organized columns. For sites with deep content structures.

### When to Use
- E-commerce with many categories
- Enterprise software with many product areas
- News/media sites with many sections

```html
<nav class="mega-nav">
  <ul role="list">
    <li class="mega-nav__item">
      <button
        class="mega-nav__trigger"
        aria-expanded="false"
        aria-haspopup="true"
        aria-controls="mega-products"
      >
        Products
      </button>
      <div id="mega-products" class="mega-menu" hidden>
        <div class="mega-menu__inner">
          <div class="mega-menu__column">
            <h3 class="mega-menu__heading">By Category</h3>
            <ul role="list">
              <li><a href="/laptops">Laptops</a></li>
              <li><a href="/phones">Phones</a></li>
              <li><a href="/tablets">Tablets</a></li>
            </ul>
          </div>
          <div class="mega-menu__column">
            <h3 class="mega-menu__heading">Popular</h3>
            <!-- Featured items with images -->
          </div>
          <div class="mega-menu__promo">
            <!-- Promotional content -->
          </div>
        </div>
      </div>
    </li>
  </ul>
</nav>
```

```css
.mega-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-top: 2px solid #2563eb;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 200;
}

.mega-menu__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr) 280px;
  gap: 32px;
  padding: 32px 24px;
}
```

---

## Search as Navigation

When search replaces traditional navigation. Works when content is extensive and unpredictable.

### When to Use
- Documentation sites (docs.something.com)
- Knowledge bases
- E-commerce with massive catalogs
- Admin tools where users know what they want

See `06-search-filter-sort.md` for full search input implementation.

---

## Pattern Selection Guide

| Pattern | Best For | Avoid When |
|---------|----------|-----------|
| Top nav | 3–7 items, desktop, marketing sites | Mobile primary, deep hierarchies |
| Side nav | Apps, complex hierarchies, many items | Simple sites, 3 or fewer sections |
| Tabs | Sibling views of same entity | Cross-app navigation, 7+ items |
| Breadcrumbs | Deep hierarchies, direct-landing pages | Flat structures, single-level sites |
| Pagination | Tables, known position matters | Feeds, mobile, discovery |
| Stepper | Sequential multi-step flows | Non-linear workflows |
| Command palette | Power users, many actions, keyboard-first | Simple apps, low-power users |
| Bottom nav | Mobile, 3–5 destinations, frequent switching | Desktop, 6+ destinations |
| Mega menu | E-commerce, many categories | Simple sites, <10 nav items |

---

## Accessibility Checklist for Navigation

- All nav landmarks have unique `aria-label`
- Current page/section marked with `aria-current="page"` or `aria-current="step"`
- Dropdowns use `aria-expanded`, `aria-haspopup`, `aria-controls`
- Tab panels use `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Arrow key navigation implemented for tab lists and menu items
- Skip-to-main link present for keyboard users
- Focus never gets trapped (modals excepted — they should trap focus)
- Command palette implements full keyboard control (arrows, Enter, Escape)
