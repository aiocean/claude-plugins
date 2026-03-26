# Memory and Learning in UX

Interfaces that respect how human memory works reduce cognitive load, accelerate learning, and prevent errors. Interfaces that ignore memory constraints create frustration and abandonment. Understanding the mechanics of memory is not an academic exercise — it directly determines which design patterns work and which fail.

---

## Working Memory Limits

Working memory (short-term memory) is the mental workspace where active processing happens. It is the bottleneck of cognition.

### Capacity: Miller's Law

George Miller's 1956 paper established that working memory holds approximately **7 ± 2 chunks** of information. More recent research (Cowan, 2001) suggests the true limit is closer to **4 chunks** without active rehearsal.

A "chunk" is a meaningful unit — a single digit and a familiar word are both one chunk, but the word carries far more information.

**Design implication:** Never require users to hold more than 4 independent pieces of information in mind simultaneously.

```html
<!-- Bad: requires holding all 5 steps in working memory -->
<p>To reset your password: go to Settings, click Security, select Password,
   enter your current password, then enter and confirm your new password.</p>

<!-- Good: chunked into sequential steps — each step is one chunk -->
<ol class="step-list">
  <li>Go to <strong>Settings → Security</strong></li>
  <li>Select <strong>Change password</strong></li>
  <li>Enter your current password, then your new password twice</li>
</ol>
```

### Duration: ~20 Seconds Without Rehearsal

Working memory decays rapidly. If users are interrupted or distracted, they lose context.

```javascript
// Protect users from losing work due to memory decay
// Auto-save frequently — don't rely on users remembering to save
const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

let autosaveTimer = setInterval(async () => {
  if (hasUnsavedChanges()) {
    await autosave();
    showSavedIndicator(); // Confirms state — removes memory burden
  }
}, AUTOSAVE_INTERVAL);

// Preserve form state across navigation
function preserveFormState(formId) {
  const form = document.getElementById(formId);
  const data = new FormData(form);
  sessionStorage.setItem(`form-${formId}`, JSON.stringify(Object.fromEntries(data)));
}
```

### Reducing Working Memory Load in UI

```css
/* Visual chunking reduces perceived complexity */
.form-section {
  margin-bottom: 40px;        /* Clear separation between groups */
  padding: 24px;
  background: #f9fafb;
  border-radius: 10px;
}
/* Each section is one chunk — not 10 individual fields */
```

```html
<!-- Inline context eliminates memory dependency -->
<!-- Bad: user must remember what the field expects -->
<label for="phone">Phone</label>
<input type="tel" id="phone" />

<!-- Good: format hint eliminates memory requirement -->
<label for="phone">Phone</label>
<input type="tel" id="phone" placeholder="(555) 555-5555"
       aria-describedby="phone-format" />
<p id="phone-format" class="hint">Include area code. US numbers only.</p>
```

---

## Recognition vs Recall

**Recall** requires producing information from memory with no external cue. **Recognition** requires only identifying correct information when presented with it. Recognition is far easier — it offloads memory work to the interface.

> Nielsen Heuristic #6: "Recognition rather than recall — minimize the user's memory load by making objects, actions, and options visible."

### Designing for Recognition

```html
<!-- Bad: recall — user must remember all available commands -->
<input type="text" placeholder="Enter a command..." />

<!-- Good: recognition — commands are visible and selectable -->
<div class="command-palette">
  <input type="search" placeholder="Search commands..." aria-label="Command search" />
  <ul role="listbox" aria-label="Available commands">
    <li role="option"><kbd>Cmd K</kbd> <span>Open command palette</span></li>
    <li role="option"><kbd>Cmd S</kbd> <span>Save document</span></li>
    <li role="option"><kbd>Cmd Z</kbd> <span>Undo last action</span></li>
  </ul>
</div>
```

```html
<!-- Bad: recall — user must know status codes -->
<select name="status">
  <option value="1">1</option>
  <option value="2">2</option>
  <option value="3">3</option>
</select>

<!-- Good: recognition — meaningful labels -->
<select name="status">
  <option value="draft">Draft — not visible to customers</option>
  <option value="active">Active — live in store</option>
  <option value="archived">Archived — hidden from store</option>
</select>
```

### Navigation: Recognition Over Recall

Breadcrumbs, persistent navigation, and visible current state all reduce recall demands.

```html
<!-- Breadcrumb: shows where you are without remembering how you got there -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/settings">Settings</a></li>
    <li><a href="/settings/team">Team</a></li>
    <li aria-current="page">Permissions</li>
  </ol>
</nav>

<!-- Active state: recognition of current location -->
<nav>
  <a href="/dashboard" aria-current="page" class="nav-link active">Dashboard</a>
  <a href="/reports" class="nav-link">Reports</a>
  <a href="/settings" class="nav-link">Settings</a>
</nav>
```

---

## Serial Position Effect

In a list, people best remember items at the **beginning** (primacy effect) and the **end** (recency effect). Items in the middle are recalled least reliably.

### Navigation Design

```html
<!-- Put the most important items first and last -->
<nav>
  <!-- Primacy position: most visited / most important -->
  <a href="/dashboard">Dashboard</a>
  <a href="/projects">Projects</a>

  <!-- Middle: frequently used but not critical -->
  <a href="/calendar">Calendar</a>
  <a href="/messages">Messages</a>
  <a href="/files">Files</a>

  <!-- Recency position: high-value but infrequent -->
  <a href="/settings">Settings</a>
</nav>
```

### Menu and Option Lists

```html
<!-- Most important action first; destructive action last -->
<ul role="menu" aria-label="Post actions">
  <li role="menuitem">Edit post</li>         <!-- Primacy: most common -->
  <li role="menuitem">Duplicate</li>
  <li role="menuitem">Move to folder</li>
  <li role="menuitem">Share</li>
  <li role="separator" aria-hidden="true"></li>
  <li role="menuitem" class="destructive">Delete post</li>  <!-- Recency: memorable -->
</ul>
```

### Form Field Order

Place the most important or most frequently completed fields first. Users who abandon forms tend to do so in the middle — fields completed first are more likely to be retained in a partial save.

```html
<!-- Registration form: highest-value fields first -->
<form>
  <input type="email" placeholder="Email" />       <!-- First: high value, easy -->
  <input type="password" placeholder="Password" /> <!-- Second: required -->
  <!-- Optional fields in the middle -->
  <input type="text" placeholder="Company (optional)" />
  <input type="text" placeholder="Job title (optional)" />
  <!-- CTA last: recency — final impression -->
  <button type="submit">Create account</button>
</form>
```

---

## Von Restorff Isolation Effect

An item that is visually distinct from its surroundings is significantly more likely to be remembered. Also called the isolation effect.

First described by Hedwig von Restorff in 1933: in a list of similar items, the one that differs is recalled far better than the rest.

### Applications

```css
/* Pricing: isolate the recommended plan */
.plan-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px;
}

.plan-card--featured {
  background: #1e3a8a;       /* Different background */
  border-color: #1e3a8a;
  color: #ffffff;
  transform: scale(1.04);    /* Slightly larger */
  box-shadow: 0 20px 60px rgba(30, 58, 138, 0.3);
  position: relative;
  z-index: 1;
}
/* One isolated element — not two or three */
```

```html
<!-- Highlight the single most important item in a list -->
<ul class="feature-list">
  <li>Unlimited projects</li>
  <li>5 team members</li>
  <li class="featured-item">
    <strong>Priority support — response within 2 hours</strong>
  </li>
  <li>Custom domain</li>
  <li>Advanced analytics</li>
</ul>
```

```css
.featured-item {
  background: #eff6ff;
  border-left: 3px solid #2563eb;
  padding: 8px 12px;
  border-radius: 0 6px 6px 0;
  font-weight: 600;
  color: #1d4ed8;
}
```

**Rule:** The isolation effect only works if one item is isolated. Isolating three items isolates none of them.

---

## Mental Models

A mental model is the user's internal representation of how a system works. Users apply existing mental models to new interfaces — when the interface matches the model, interaction feels intuitive; when it conflicts, confusion and errors result.

### Matching Mental Models

```html
<!-- Shopping cart mental model: match familiar e-commerce patterns -->
<!-- Users expect: add to cart → cart icon updates → checkout flow -->
<!-- Don't invent new patterns when existing ones work -->

<button class="add-to-cart" aria-label="Add Blue Widget to cart">
  Add to cart
</button>

<!-- Cart update matches expectation -->
<a href="/cart" class="cart-icon" aria-label="Cart, 3 items">
  <svg aria-hidden="true"><!-- cart icon --></svg>
  <span class="cart-count" aria-live="polite">3</span>
</a>
```

### When Mental Models Conflict

When you must deviate from convention, provide explicit education at first encounter:

```html
<!-- Non-standard interaction: explain it once -->
<div class="tutorial-tooltip" role="tooltip" id="swipe-hint">
  <p>Swipe left on any item to reveal quick actions</p>
  <button onclick="dismissTip('swipe-hint')">Got it</button>
</div>
```

```javascript
// Show model-building hint only until the user demonstrates understanding
function trackGestureUsage() {
  const swipeCount = parseInt(localStorage.getItem('swipe-uses') || '0');

  if (swipeCount === 0) {
    showTooltip('swipe-hint'); // First visit: explain
  } else if (swipeCount >= 3) {
    hideTooltip('swipe-hint'); // Model established: stop explaining
    localStorage.setItem('swipe-hint-dismissed', 'true');
  }

  localStorage.setItem('swipe-uses', swipeCount + 1);
}
```

---

## Progressive Onboarding

Progressive onboarding teaches users through use, not through front-loaded tutorials. It respects working memory limits by introducing concepts when they are relevant and actionable — not before.

### Principles

1. **Just-in-time:** introduce a concept at the moment the user first needs it
2. **Contextual:** show tips in context, not in a separate tutorial mode
3. **Dismissible:** never block the user's task
4. **Non-repeating:** remember what has been shown; never show indefinitely

```javascript
// Progressive disclosure system
const onboardingTips = {
  'first-project': {
    trigger: () => getProjectCount() === 1,
    message: 'Invite your team to collaborate on this project.',
    action: { label: 'Invite team', href: '/settings/team' },
    position: 'below-project-header'
  },
  'first-export': {
    trigger: () => user.role === 'admin' && !hasExported(),
    message: 'Export all your data as CSV from the Reports page.',
    position: 'below-reports-link'
  }
};

function checkOnboardingTips() {
  Object.entries(onboardingTips).forEach(([key, tip]) => {
    const dismissed = localStorage.getItem(`tip-${key}-dismissed`);
    if (!dismissed && tip.trigger()) {
      showContextualTip(key, tip);
    }
  });
}
```

```css
/* Contextual tip: unobtrusive, clearly dismissible */
.contextual-tip {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 360px;
  font-size: 14px;
  line-height: 1.5;
}

.contextual-tip .tip-icon {
  color: #2563eb;
  flex-shrink: 0;
  margin-top: 1px;
}

.contextual-tip .dismiss-btn {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 0;
}

.contextual-tip .dismiss-btn:hover {
  color: #374151;
}
```

---

## Tooltips

Tooltips provide recognition support for icons, abbreviations, and non-obvious controls. They surface information on demand without cluttering the interface.

### When to Use Tooltips

- Icon-only buttons that lack adjacent labels
- Abbreviations and technical terms
- Truncated text (show full content on hover)
- Keyboard shortcuts as secondary information
- **Never** for critical information — tooltips are invisible to touch users and inaccessible without pointer/keyboard focus

### Accessible Tooltip Pattern

```html
<!-- Icon button with tooltip -->
<button
  type="button"
  class="icon-btn"
  aria-label="Download as PDF"
  aria-describedby="tooltip-download"
>
  <svg aria-hidden="true"><!-- download icon --></svg>
</button>
<div role="tooltip" id="tooltip-download" class="tooltip">
  Download as PDF
  <kbd class="shortcut">Cmd D</kbd>
</div>
```

```css
.tooltip {
  position: absolute;
  background: #1f2937;
  color: #f9fafb;
  font-size: 12px;
  line-height: 1.4;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;

  /* Hidden by default */
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 150ms ease, transform 150ms ease;
}

/* Show on parent hover/focus — delay prevents flash on cursor pass-through */
.icon-btn:hover + .tooltip,
.icon-btn:focus-visible + .tooltip {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 400ms;
}

/* Arrow */
.tooltip::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: #1f2937;
  border-top: none;
}

.shortcut {
  display: inline-block;
  margin-left: 8px;
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: monospace;
  font-size: 11px;
}
```

---

## Quick Reference

```
Working memory:
  Capacity:  4 chunks max — chunk related information visually
  Duration:  ~20 seconds — auto-save; preserve form state
  Reduce by: visible context, format hints, inline help

Recognition vs recall:
  Make options visible — menus, autocomplete, breadcrumbs
  Label meaningfully — status names not codes
  Show current location — active states, breadcrumbs

Serial position:
  Best recalled: first and last items in a list
  Least recalled: middle items
  Apply to: navigation, option lists, form field order

Von Restorff:
  One isolated element is recalled; three isolated elements are not
  Use for: recommended pricing tier, featured list item, primary CTA

Mental models:
  Match conventions unless there is a compelling reason to deviate
  When deviating: explain once, contextually, at first encounter

Progressive onboarding:
  Just-in-time: show when relevant, not all upfront
  Non-repeating: track and stop after dismissal or demonstrated use

Tooltips:
  Use for: icon-only buttons, abbreviations, truncated text, shortcuts
  Avoid for: critical information (invisible to touch users)
  Delay showing by 400ms to prevent hover-flash
```
