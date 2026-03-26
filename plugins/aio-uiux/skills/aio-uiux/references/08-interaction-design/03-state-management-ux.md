# State Management UX

Every interactive component exists in multiple states. Designing only the "default" state is designing half the product. This reference covers every state every component must handle, and how to design them well.

---

## The Complete State Inventory

Every interactive element must account for ALL of these:

| State | Trigger | Visual Signal |
|-------|---------|--------------|
| Default | Component rendered, no interaction | Base styling |
| Hover | Mouse over | Subtle background/border change |
| Active | Mouse/touch pressed down | Depressed appearance |
| Focus | Keyboard focus | Visible focus ring |
| Disabled | Blocked by logic | Muted color, cursor: not-allowed |
| Loading | Async operation in progress | Spinner or skeleton |
| Empty | No content to show | Empty state illustration + CTA |
| Error | Operation failed or invalid input | Red color, error icon, message |
| Success | Operation completed | Green color, check icon |
| Partial | Indeterminate state | Dash (e.g., tri-state checkbox) |
| Skeleton | Initial data load | Pulsing placeholder shapes |

---

## Button States

```css
/* Complete button state system */
.btn {
  /* Default */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 600;
  background: #2563eb;
  color: white;
  border: none;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
  position: relative;
  overflow: hidden;
  user-select: none;
}

/* Hover */
.btn:hover:not(:disabled) {
  background: #1d4ed8;
}

/* Active / Pressed */
.btn:active:not(:disabled) {
  background: #1e40af;
  transform: scale(0.98);
}

/* Focus */
.btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25);
}

/* Disabled */
.btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
  pointer-events: none;
}

/* Loading */
.btn[aria-busy="true"] {
  color: transparent; /* Hide text */
  cursor: wait;
  pointer-events: none;
}

.btn[aria-busy="true"]::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: btn-spin 0.7s linear infinite;
}

@keyframes btn-spin {
  to { transform: rotate(360deg); }
}
```

```html
<!-- Button in each state -->
<button class="btn">Default</button>
<button class="btn" disabled>Disabled</button>
<button class="btn" aria-busy="true" aria-label="Saving...">Save</button>
```

**Critical**: Never remove a button during loading — this causes layout shift. Use `aria-busy` and disable pointer events instead.

---

## Input States

```css
.input {
  /* Default */
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  color: #111827;
  background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
}

/* Hover */
.input:hover:not(:disabled):not(:focus) {
  border-color: #9ca3af;
}

/* Focus */
.input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

/* Disabled */
.input:disabled {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Read-only */
.input:read-only {
  background: #f9fafb;
  border-style: dashed;
}

/* Error */
.input[aria-invalid="true"] {
  border-color: #ef4444;
  background: #fef2f2;
}

.input[aria-invalid="true"]:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

/* Success */
.input.input--success {
  border-color: #22c55e;
}

.input.input--success:focus {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}
```

---

## Loading Patterns

### 1. Spinner (Short Uncertain Duration)

Use for: button submit, inline refresh, small async actions.
Avoid for: page loads, large data fetches (use skeleton instead).

```html
<div role="status" aria-label="Loading">
  <svg class="spinner" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"
      stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round" />
  </svg>
</div>
```

```css
.spinner {
  width: 24px;
  height: 24px;
  color: #2563eb;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Rule**: Show spinner only after 300ms delay — instant operations don't need loading UI (it causes flicker).

```javascript
let spinnerTimer;

async function submitForm() {
  spinnerTimer = setTimeout(() => showSpinner(), 300);
  try {
    await saveData();
  } finally {
    clearTimeout(spinnerTimer);
    hideSpinner();
  }
}
```

### 2. Skeleton Screens (Page/Section Load)

Replaces content with shaped placeholders. Reduces perceived load time because the layout is already in place.

```html
<div class="card skeleton-card" aria-busy="true" aria-label="Loading content">
  <div class="skeleton skeleton--avatar"></div>
  <div class="skeleton-content">
    <div class="skeleton skeleton--line skeleton--line-wide"></div>
    <div class="skeleton skeleton--line skeleton--line-medium"></div>
    <div class="skeleton skeleton--line skeleton--line-narrow"></div>
  </div>
</div>
```

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #f3f4f6 25%,
    #e5e7eb 50%,
    #f3f4f6 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton--avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton--line {
  height: 16px;
  margin-bottom: 8px;
}

.skeleton--line-wide { width: 85%; }
.skeleton--line-medium { width: 65%; }
.skeleton--line-narrow { width: 40%; }
```

**Rules**:
- Match skeleton shapes to actual content shapes — wrong shapes cause jarring layout shift when content loads
- Animate shimmer in one direction (left to right mimics scanning)
- Don't use skeleton for less than ~400ms loads — it's disorienting
- Add `aria-busy="true"` and `aria-label` for screen readers

### 3. Progressive Loading

Show partial content as it arrives:

```javascript
// Render first page of results immediately, append more as they load
async function loadFeed() {
  const firstBatch = await fetchItems({ limit: 10 });
  renderItems(firstBatch);

  const moreBatches = await fetchItems({ limit: 90, offset: 10 });
  appendItems(moreBatches);
}
```

### 4. Optimistic Updates

Update UI immediately, revert if server fails:

```javascript
async function toggleLike(postId) {
  // 1. Update UI immediately
  const post = getPost(postId);
  const wasLiked = post.liked;
  updatePost(postId, { liked: !wasLiked, likes: post.likes + (wasLiked ? -1 : 1) });

  // 2. Send to server
  try {
    await api.toggleLike(postId);
  } catch (err) {
    // 3. Revert on failure
    updatePost(postId, { liked: wasLiked, likes: post.likes });
    showToast('Could not update. Please try again.', { type: 'error' });
  }
}
```

---

## Empty States

The most overlooked state. A blank screen with no explanation is a dead end.

### Types of Empty States

| Type | Context | Response |
|------|---------|---------|
| First-use | User has never created data | Welcome message + primary CTA |
| Cleared | User deleted everything | Confirmation + "Create new" CTA |
| No results | Search/filter returned nothing | Clear search + suggestions |
| Error | Failed to load | Error message + retry button |
| No permission | User can't access this data | Explain why + upgrade/request access CTA |

### First-Use Empty State

```html
<div class="empty-state">
  <div class="empty-state__illustration">
    <img src="/illustrations/empty-projects.svg" alt="" role="presentation" />
  </div>
  <h2 class="empty-state__title">No projects yet</h2>
  <p class="empty-state__description">
    Create your first project to start organizing your work.
  </p>
  <a href="/projects/new" class="btn btn--primary">
    <svg aria-hidden="true"><!-- plus --></svg>
    Create project
  </a>
</div>
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 24px;
  min-height: 400px;
}

.empty-state__illustration {
  width: 160px;
  height: 160px;
  margin-bottom: 24px;
}

.empty-state__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px;
}

.empty-state__description {
  font-size: 0.9375rem;
  color: #6b7280;
  max-width: 360px;
  margin: 0 0 24px;
  line-height: 1.6;
}
```

### No Search Results

```html
<div class="empty-state empty-state--search">
  <svg class="empty-state__icon" aria-hidden="true"><!-- search --></svg>
  <h2>No results for "<strong>{{ query }}</strong>"</h2>
  <ul class="empty-state__suggestions">
    <li>Check your spelling</li>
    <li>Try more general terms</li>
    <li>Search in a different category</li>
  </ul>
  <button class="btn btn--ghost" onclick="clearSearch()">Clear search</button>
</div>
```

---

## Error States

### Inline Field Error

See `01-form-design.md` for full implementation.

### Toast Error

```javascript
showToast('Failed to save changes. Try again.', {
  type: 'error',
  action: { label: 'Retry', onClick: retryAction }
});
```

### Page-Level Error

```html
<div role="alert" class="page-error">
  <svg aria-hidden="true" class="page-error__icon"><!-- warning --></svg>
  <div class="page-error__content">
    <h2>Something went wrong</h2>
    <p>We couldn't load your dashboard. This might be a temporary issue.</p>
    <div class="page-error__actions">
      <button class="btn btn--primary" onclick="window.location.reload()">
        Try again
      </button>
      <a href="/status" class="btn btn--ghost">Check system status</a>
    </div>
  </div>
</div>
```

### Error Boundary Pattern (React)

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## Success States

### Inline Success

```html
<div class="field field--success">
  <label for="username">Username</label>
  <div class="input-wrap">
    <input type="text" id="username" value="jdoe" class="input input--success" />
    <svg class="input-icon input-icon--success" aria-label="Available"><!-- check --></svg>
  </div>
  <span class="success-message">
    <svg aria-hidden="true"><!-- check --></svg>
    Username is available
  </span>
</div>
```

### Form Submit Success

```html
<!-- Replace form with confirmation -->
<div class="success-state" role="status">
  <div class="success-state__icon">
    <svg viewBox="0 0 24 24" aria-hidden="true"><!-- animated check --></svg>
  </div>
  <h2>You're all set!</h2>
  <p>Your order has been placed. Check your email for a confirmation.</p>
  <a href="/orders" class="btn btn--primary">View order</a>
</div>
```

```css
/* Animated check circle */
.success-state__icon svg circle {
  stroke: #22c55e;
  stroke-dasharray: 66;
  stroke-dashoffset: 66;
  animation: draw-circle 0.4s ease forwards;
}

.success-state__icon svg path {
  stroke: #22c55e;
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: draw-check 0.3s ease 0.3s forwards;
}

@keyframes draw-circle {
  to { stroke-dashoffset: 0; }
}

@keyframes draw-check {
  to { stroke-dashoffset: 0; }
}
```

---

## Disabled vs. Read-Only vs. Hidden

| Approach | When to Use | Accessibility |
|----------|-------------|--------------|
| `disabled` | User can't interact AND shouldn't be able to | Skipped by keyboard, ignored by screen readers |
| `readonly` | User can read/copy but not change | Focusable, readable by screen reader |
| Hidden (opacity 0, visibility hidden) | Temporarily unavailable, will appear | Not focusable or readable |
| `display: none` / `hidden` | Conditionally irrelevant | Completely removed from accessibility tree |

**Common mistake**: Using `disabled` on form fields when the intent is "show but don't allow edit." Use `readonly` instead so screen readers can announce the value.

---

## Partial / Indeterminate States

### Tri-State Checkbox

```html
<input type="checkbox" id="select-all" class="checkbox--indeterminate" />
<label for="select-all">Select all</label>
```

```javascript
const checkbox = document.getElementById('select-all');

function updateSelectAll(checkedCount, totalCount) {
  if (checkedCount === 0) {
    checkbox.checked = false;
    checkbox.indeterminate = false;
  } else if (checkedCount === totalCount) {
    checkbox.checked = true;
    checkbox.indeterminate = false;
  } else {
    checkbox.indeterminate = true; // Shows dash, not check
  }
}
```

### Partial Progress

```html
<div role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" aria-label="Upload progress">
  <div class="progress-bar__fill" style="width: 45%"></div>
  <span class="progress-bar__label" aria-hidden="true">45%</span>
</div>
```

---

## State Transition Rules

1. **Never leave the user in a dead state** — every error needs a path forward
2. **Disabled buttons need a tooltip explaining why** — "Save (complete all required fields first)"
3. **Loading states must have a maximum** — after 30 seconds, switch to error state
4. **Empty states need a CTA** — never a blank space with just "No items"
5. **Success states need a next action** — don't leave users stranded after completion
6. **Optimistic updates need rollback** — always handle the failure case
7. **Skeleton screens must match actual content layout** — or they increase perceived load time

---

## Component State Reference Card

| Component | States to design |
|-----------|----------------|
| Button | default, hover, active, focus, disabled, loading |
| Input | default, hover, focus, disabled, readonly, error, success |
| Checkbox/Radio | default, hover, focus, checked, disabled, indeterminate |
| Select | default, hover, focus, open, disabled |
| Card | default, hover, selected, loading (skeleton) |
| Table row | default, hover, selected, loading |
| List | default, loading (skeleton), empty, error |
| Page section | default, loading, empty, error |
| Form | default, submitting, error (summary), success |
