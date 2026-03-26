# Search, Filter, and Sort

Search and filter are the primary tools for navigating large datasets. Poor implementation is a leading cause of users failing tasks. This reference covers every pattern from input design to zero-results states.

---

## Search Input Design

### Anatomy of a Search Input

```html
<div class="search-field" role="search">
  <label for="main-search" class="sr-only">Search projects</label>
  <div class="search-field__inner">
    <svg class="search-field__icon" aria-hidden="true"><!-- magnifier --></svg>
    <input
      type="search"
      id="main-search"
      class="search-field__input"
      placeholder="Search projects..."
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Search projects"
      aria-autocomplete="list"
      aria-controls="search-results"
      aria-expanded="false"
    />
    <button
      class="search-field__clear"
      type="button"
      aria-label="Clear search"
      hidden
    >
      <svg aria-hidden="true"><!-- × --></svg>
    </button>
    <kbd class="search-field__shortcut" aria-hidden="true">⌘K</kbd>
  </div>
</div>
```

```css
.search-field__inner {
  display: flex;
  align-items: center;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  gap: 8px;
  background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-field__inner:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.search-field__icon {
  width: 18px;
  height: 18px;
  color: #9ca3af;
  flex-shrink: 0;
}

.search-field__input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9375rem;
  color: #111827;
  background: transparent;
  min-width: 0;
}

.search-field__input::-webkit-search-cancel-button {
  display: none; /* Hide native clear button, use custom one */
}

.search-field__shortcut {
  font-size: 0.75rem;
  color: #9ca3af;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 2px 5px;
  font-family: inherit;
}

/* Hide shortcut hint when focused (user is typing) */
.search-field__inner:focus-within .search-field__shortcut {
  display: none;
}
```

```javascript
const input = document.querySelector('.search-field__input');
const clearBtn = document.querySelector('.search-field__clear');

input.addEventListener('input', () => {
  clearBtn.hidden = input.value === '';
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  clearBtn.hidden = true;
  input.focus();
  triggerSearch('');
});
```

### Search Sizes

```css
/* Compact — inline within a panel or card header */
.search-field--sm .search-field__inner { height: 32px; font-size: 0.875rem; }

/* Default — page-level search */
.search-field--md .search-field__inner { height: 40px; font-size: 0.9375rem; }

/* Hero — main site search, spotlight */
.search-field--lg .search-field__inner {
  height: 56px;
  font-size: 1.125rem;
  border-radius: 12px;
  padding: 0 20px;
}
```

---

## Autocomplete / Typeahead

Suggests completions as the user types. Reduces effort and prevents zero-result searches.

```html
<div class="search-field" role="search">
  <label for="search-input" class="sr-only">Search</label>
  <input
    type="search"
    id="search-input"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded="false"
    aria-controls="search-listbox"
    aria-activedescendant=""
    autocomplete="off"
  />
  <ul
    id="search-listbox"
    role="listbox"
    class="autocomplete-dropdown"
    aria-label="Search suggestions"
    hidden
  >
    <!-- Populated dynamically -->
  </ul>
</div>
```

```javascript
class Autocomplete {
  constructor(input, { fetchSuggestions, onSelect }) {
    this.input = input;
    this.listbox = document.getElementById(input.getAttribute('aria-controls'));
    this.fetchSuggestions = fetchSuggestions;
    this.onSelect = onSelect;
    this.selectedIndex = -1;
    this.debounceTimer = null;

    input.addEventListener('input', () => this.onInput());
    input.addEventListener('keydown', (e) => this.onKeydown(e));
    input.addEventListener('blur', () => this.close());
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target)) this.close();
    });
  }

  async onInput() {
    const query = this.input.value.trim();
    clearTimeout(this.debounceTimer);

    if (query.length < 2) {
      this.close();
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      const suggestions = await this.fetchSuggestions(query);
      this.render(suggestions, query);
    }, 200);
  }

  render(suggestions, query) {
    if (!suggestions.length) { this.close(); return; }

    this.listbox.innerHTML = suggestions.map((item, i) => `
      <li
        role="option"
        id="option-${i}"
        aria-selected="false"
        class="autocomplete-option"
        data-value="${item.value}"
      >
        ${this.highlight(item.label, query)}
        ${item.category ? `<span class="autocomplete-option__category">${item.category}</span>` : ''}
      </li>
    `).join('');

    this.listbox.querySelectorAll('[role="option"]').forEach((opt, i) => {
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent input blur before click registers
        this.select(suggestions[i]);
      });
    });

    this.listbox.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this.selectedIndex = -1;
  }

  highlight(text, query) {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  onKeydown(e) {
    const options = [...this.listbox.querySelectorAll('[role="option"]')];
    if (!options.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, options.length - 1);
      this.updateSelection(options);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
      this.updateSelection(options);
    } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
      e.preventDefault();
      options[this.selectedIndex].dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  updateSelection(options) {
    options.forEach((opt, i) => {
      const selected = i === this.selectedIndex;
      opt.setAttribute('aria-selected', String(selected));
      if (selected) {
        this.input.setAttribute('aria-activedescendant', opt.id);
        opt.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  select(item) {
    this.input.value = item.label;
    this.close();
    this.onSelect(item);
  }

  close() {
    this.listbox.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.selectedIndex = -1;
  }
}
```

```css
.autocomplete-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  list-style: none;
  padding: 4px;
  margin: 0;
  max-height: 320px;
  overflow-y: auto;
  z-index: 100;
}

.autocomplete-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9375rem;
  color: #111827;
}

.autocomplete-option:hover,
.autocomplete-option[aria-selected="true"] {
  background: #f3f4f6;
}

.autocomplete-option mark {
  background: #fef9c3;
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.autocomplete-option__category {
  font-size: 0.75rem;
  color: #9ca3af;
}
```

---

## Search Results Display

### Results Header

```html
<div class="results-header">
  <p class="results-count" aria-live="polite" aria-atomic="true">
    <!-- Dynamically updated -->
    <strong>147 results</strong> for "<em>design system</em>"
  </p>
  <div class="results-controls">
    <div class="sort-control"><!-- See Sort section --></div>
    <div class="view-toggle">
      <button aria-label="Grid view" aria-pressed="false"><!-- grid icon --></button>
      <button aria-label="List view" aria-pressed="true"><!-- list icon --></button>
    </div>
  </div>
</div>
```

**Rules**:
- Always announce result count with `aria-live="polite"` so screen readers update
- Show query echoed back: "Results for X" confirms what was searched
- Show result count before results (above, not below)

### Search Result Item

```html
<article class="search-result">
  <a href="/docs/design-system/intro" class="search-result__link">
    <div class="search-result__breadcrumb" aria-hidden="true">
      Docs › Design System
    </div>
    <h3 class="search-result__title">
      <!-- Highlight matching terms -->
      Introduction to the <mark>Design System</mark>
    </h3>
    <p class="search-result__excerpt">
      The <mark>design system</mark> is a collection of reusable components
      governed by clear standards...
    </p>
    <div class="search-result__meta">
      <time datetime="2024-01-10">Jan 10, 2024</time>
      <span>5 min read</span>
    </div>
  </a>
</article>
```

---

## Filter Patterns

### Sidebar Filters (Faceted Search)

Best for: e-commerce, job boards, any dataset with many filterable dimensions.

```html
<aside class="filter-sidebar" aria-label="Filter results">
  <div class="filter-sidebar__header">
    <h2>Filters</h2>
    <button class="link-btn" id="clear-all-filters">Clear all</button>
  </div>

  <!-- Active filter chips -->
  <div class="active-filters" aria-label="Active filters" aria-live="polite">
    <span class="filter-chip">
      Category: Design
      <button aria-label="Remove category filter">×</button>
    </span>
    <span class="filter-chip">
      Price: Under $50
      <button aria-label="Remove price filter">×</button>
    </span>
  </div>

  <!-- Filter group -->
  <fieldset class="filter-group">
    <legend class="filter-group__label">
      <button
        class="filter-group__toggle"
        aria-expanded="true"
        aria-controls="filter-category"
      >
        Category
        <svg aria-hidden="true"><!-- chevron --></svg>
      </button>
    </legend>
    <div id="filter-category">
      <label class="filter-option">
        <input type="checkbox" name="category" value="design" />
        <span>Design</span>
        <span class="filter-option__count" aria-label="23 results">23</span>
      </label>
      <label class="filter-option">
        <input type="checkbox" name="category" value="development" />
        <span>Development</span>
        <span class="filter-option__count" aria-label="41 results">41</span>
      </label>
    </div>
  </fieldset>

  <!-- Price range filter -->
  <fieldset class="filter-group">
    <legend class="filter-group__label">Price</legend>
    <div class="price-range">
      <label class="sr-only" for="price-min">Minimum price</label>
      <input type="number" id="price-min" placeholder="Min" min="0" />
      <span aria-hidden="true">–</span>
      <label class="sr-only" for="price-max">Maximum price</label>
      <input type="number" id="price-max" placeholder="Max" min="0" />
    </div>
  </fieldset>
</aside>
```

### Filter Chips (Horizontal, Compact)

Best for: mobile, simple filtering, fewer than 8 options per dimension.

```html
<div class="filter-chips" role="group" aria-label="Filter by status">
  <button class="filter-chip filter-chip--active" aria-pressed="true">
    All
    <span class="sr-only">(selected)</span>
  </button>
  <button class="filter-chip" aria-pressed="false">Active</button>
  <button class="filter-chip" aria-pressed="false">Archived</button>
  <button class="filter-chip" aria-pressed="false">Draft</button>
</div>
```

```css
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.filter-chip:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.filter-chip--active,
.filter-chip[aria-pressed="true"] {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
  font-weight: 500;
}
```

### Filter Dropdown

Best for: single-dimension filter with many options.

```html
<div class="filter-dropdown">
  <button
    class="filter-dropdown__trigger"
    aria-haspopup="listbox"
    aria-expanded="false"
  >
    <svg aria-hidden="true"><!-- filter icon --></svg>
    Status
    <span class="filter-dropdown__badge" aria-label="2 filters active">2</span>
    <svg aria-hidden="true"><!-- chevron --></svg>
  </button>
  <!-- Dropdown listbox with checkboxes -->
</div>
```

---

## Sort Controls

```html
<div class="sort-control">
  <label for="sort-select" class="sort-control__label">Sort by</label>
  <select id="sort-select" class="sort-control__select">
    <option value="relevance">Most relevant</option>
    <option value="date-desc">Newest first</option>
    <option value="date-asc">Oldest first</option>
    <option value="name-asc">Name A–Z</option>
    <option value="name-desc">Name Z–A</option>
    <option value="popular">Most popular</option>
  </select>
</div>
```

### Column Header Sort (Tables)

```html
<th scope="col">
  <button
    class="sort-header"
    aria-sort="ascending"
    data-sort="name"
  >
    Name
    <span class="sort-icon" aria-hidden="true">↑</span>
  </button>
</th>
<th scope="col">
  <button
    class="sort-header"
    aria-sort="none"
    data-sort="date"
  >
    Date
    <span class="sort-icon" aria-hidden="true">↕</span>
  </button>
</th>
```

```css
.sort-header {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-weight: 600;
  font-size: inherit;
  cursor: pointer;
  color: #374151;
  padding: 0;
}

.sort-header:hover { color: #111827; }

.sort-header[aria-sort="ascending"] .sort-icon,
.sort-header[aria-sort="descending"] .sort-icon {
  color: #2563eb;
}
```

```javascript
sortHeaders.forEach(btn => {
  btn.addEventListener('click', () => {
    const field = btn.dataset.sort;
    const current = btn.getAttribute('aria-sort');
    const next = current === 'ascending' ? 'descending' : 'ascending';

    // Reset all headers
    sortHeaders.forEach(b => b.setAttribute('aria-sort', 'none'));

    // Set this header
    btn.setAttribute('aria-sort', next);

    // Sort data
    sortData(field, next);
  });
});
```

---

## Zero Results State

The most critical state in search. Never show a blank page.

```html
<div class="empty-search" role="status">
  <svg class="empty-search__icon" aria-hidden="true"><!-- search with X --></svg>
  <h2 class="empty-search__title">
    No results for "<strong>{{ query }}</strong>"
  </h2>
  <div class="empty-search__tips">
    <p>Try:</p>
    <ul>
      <li>Checking for typos or misspellings</li>
      <li>Using fewer or more general keywords</li>
      <li>Removing some filters</li>
    </ul>
  </div>
  <div class="empty-search__actions">
    <button class="btn btn--ghost" onclick="clearFilters()">
      Clear all filters
    </button>
    <button class="btn btn--ghost" onclick="clearSearch()">
      Clear search
    </button>
  </div>

  <!-- Related/popular searches -->
  <div class="empty-search__suggestions">
    <p>Popular searches:</p>
    <div class="suggestion-chips">
      <button class="filter-chip">Getting started</button>
      <button class="filter-chip">API reference</button>
      <button class="filter-chip">Pricing</button>
    </div>
  </div>
</div>
```

---

## Recent Searches

```javascript
class RecentSearches {
  constructor(key = 'recent-searches', max = 8) {
    this.key = key;
    this.max = max;
  }

  get() {
    return JSON.parse(localStorage.getItem(this.key) || '[]');
  }

  add(query) {
    if (!query.trim()) return;
    const recents = this.get().filter(q => q !== query);
    recents.unshift(query);
    localStorage.setItem(this.key, JSON.stringify(recents.slice(0, this.max)));
  }

  remove(query) {
    const recents = this.get().filter(q => q !== query);
    localStorage.setItem(this.key, JSON.stringify(recents));
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}
```

```html
<!-- Rendered in dropdown before user types -->
<div class="search-recents" aria-label="Recent searches">
  <div class="search-recents__header">
    <span>Recent</span>
    <button class="link-btn" onclick="recentSearches.clear()">Clear</button>
  </div>
  <ul role="list">
    <li class="search-recent-item">
      <svg aria-hidden="true"><!-- clock --></svg>
      <button onclick="search('design system')">design system</button>
      <button aria-label="Remove 'design system' from history" onclick="recentSearches.remove('design system')">×</button>
    </li>
  </ul>
</div>
```

---

## Keyboard Shortcuts for Search

```javascript
// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Open search: / or Cmd+K
  if (e.key === '/' && !isInputFocused()) {
    e.preventDefault();
    searchInput.focus();
  }

  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openSearchModal();
  }

  // Clear search: Escape
  if (e.key === 'Escape' && document.activeElement === searchInput) {
    if (searchInput.value) {
      searchInput.value = '';
      triggerSearch('');
    } else {
      searchInput.blur();
      closeSearchModal();
    }
  }
});

function isInputFocused() {
  const tag = document.activeElement.tagName;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ||
    document.activeElement.contentEditable === 'true';
}
```

Show keyboard shortcuts in the UI:

```html
<div class="search-hints" aria-hidden="true">
  <span><kbd>/</kbd> to search</span>
  <span><kbd>↵</kbd> to open</span>
  <span><kbd>Esc</kbd> to close</span>
</div>
```

---

## Search UX Rules

1. **Instant feedback** — show results as user types (debounced 200–300ms), don't wait for Enter
2. **Highlight matches** — bold or mark the matching substring in results
3. **Echo the query** — "X results for Y" confirms the search was understood
4. **Preserve filters across searches** — don't reset category filters when user refines query
5. **URL-persist search state** — `?q=design+system&category=docs` enables sharing and back-button
6. **Live region for result count** — screen readers must announce count changes
7. **Clear affordance** — × button visible whenever there's a query
8. **Recent searches** — return visits are faster when history is available
9. **Zero results always has a path forward** — suggestions, clear filters, contact support
10. **Loading state** — show skeleton or spinner after 300ms while fetching results
