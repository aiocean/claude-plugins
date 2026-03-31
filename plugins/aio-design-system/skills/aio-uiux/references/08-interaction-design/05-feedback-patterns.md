# Feedback Patterns

Feedback tells users their actions had an effect. Without it, users repeat actions, lose trust, or assume the system is broken. This reference covers every feedback channel and when to use each.

---

## The Feedback Decision Tree

```
Action taken →
  Immediate result visible in UI?
    YES → No feedback needed (or subtle success state)
    NO  →
      Critical / destructive / irreversible?
        YES → Confirmation dialog first, then feedback after
        NO  →
          Result appears soon (< 3s)?
            YES → Toast / inline feedback
            NO  → Progress indicator + toast on complete
```

---

## Toast / Snackbar

The most versatile feedback pattern. Appears briefly, auto-dismisses, stays out of the way.

### Anatomy

```
[Icon] [Message text]          [Action]  [×]
  ↑          ↑                    ↑       ↑
type     what happened       undo/retry  dismiss
```

### When to Use
- Non-critical action confirmations (saved, deleted, sent)
- Recoverable errors (retry available)
- System notifications (new message, update available)
- Undo opportunities after destructive actions

### When NOT to Use
- Critical errors that block progress (use inline error or page-level alert)
- Confirmations before irreversible actions (use dialog)
- Information the user needs to reference while acting (use persistent banner)
- Multiple simultaneous toasts (causes anxiety — queue them)

### Implementation

```html
<!-- Toast container — append toasts here -->
<div
  id="toast-region"
  class="toast-region"
  role="region"
  aria-label="Notifications"
  aria-live="polite"
  aria-atomic="false"
></div>
```

```javascript
class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-region');
    this.queue = [];
    this.active = 0;
    this.maxVisible = 3;
  }

  show({ message, type = 'info', duration = 4000, action = null }) {
    if (this.active >= this.maxVisible) {
      this.queue.push({ message, type, duration, action });
      return;
    }

    const toast = this.createToast({ message, type, duration, action });
    this.container.appendChild(toast);
    this.active++;

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('toast--visible'));
    });

    // Auto dismiss
    const timer = setTimeout(() => this.dismiss(toast), duration);

    // Pause on hover
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => {
      setTimeout(() => this.dismiss(toast), 1500);
    });

    return toast;
  }

  createToast({ message, type, action }) {
    const icons = {
      success: '✓',
      error: '!',
      warning: '⚠',
      info: 'i'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
      <span class="toast__icon" aria-hidden="true">${icons[type]}</span>
      <span class="toast__message">${message}</span>
      ${action ? `
        <button class="toast__action" type="button">${action.label}</button>
      ` : ''}
      <button class="toast__close" type="button" aria-label="Dismiss">×</button>
    `;

    if (action) {
      toast.querySelector('.toast__action').addEventListener('click', () => {
        action.onClick();
        this.dismiss(toast);
      });
    }

    toast.querySelector('.toast__close').addEventListener('click', () => {
      this.dismiss(toast);
    });

    return toast;
  }

  dismiss(toast) {
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--dismissing');

    toast.addEventListener('transitionend', () => {
      toast.remove();
      this.active--;
      if (this.queue.length) {
        this.show(this.queue.shift());
      }
    }, { once: true });
  }
}

const toast = new ToastManager();
// Usage:
toast.show({ message: 'Changes saved', type: 'success' });
toast.show({ message: '3 items deleted', type: 'info', action: { label: 'Undo', onClick: undoDelete } });
toast.show({ message: 'Failed to save', type: 'error', duration: 0, action: { label: 'Retry', onClick: retry } });
// duration: 0 = sticky (no auto-dismiss) — use for errors that need action
```

```css
.toast-region {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
  max-width: 420px;
  width: calc(100% - 48px);
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #1f2937;
  color: white;
  font-size: 0.9375rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
  pointer-events: auto;
  opacity: 0;
  transform: translateY(8px) scale(0.96);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast--visible {
  opacity: 1;
  transform: none;
}

.toast--dismissing {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}

.toast__message { flex: 1; }

.toast__action {
  background: none;
  border: none;
  color: #60a5fa;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 4px;
  white-space: nowrap;
}

.toast__close {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px;
  font-size: 1.1rem;
  line-height: 1;
}

.toast--success .toast__icon { color: #4ade80; }
.toast--error   .toast__icon { color: #f87171; }
.toast--warning .toast__icon { color: #fbbf24; }
.toast--info    .toast__icon { color: #60a5fa; }

/* Mobile: full width at bottom */
@media (max-width: 480px) {
  .toast-region {
    right: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    padding: 0 0 env(safe-area-inset-bottom);
  }

  .toast {
    border-radius: 0;
  }
}
```

---

## Alert Banners

Persistent, prominent messages. Unlike toasts, they stay until dismissed or resolved.

### Types

| Type | Color | Use case |
|------|-------|---------|
| Info | Blue | Neutral announcements, tips, beta notices |
| Success | Green | Completed onboarding steps, activated features |
| Warning | Yellow/Amber | Expiring trial, degraded service, action needed |
| Error | Red | Billing failure, quota exceeded, critical action required |

### Inline Alert (Within Page Content)

```html
<div class="alert alert--warning" role="alert">
  <svg class="alert__icon" aria-hidden="true"><!-- warning triangle --></svg>
  <div class="alert__content">
    <strong class="alert__title">Your trial expires in 3 days</strong>
    <p class="alert__description">
      Upgrade now to keep access to all features. No data will be lost.
    </p>
  </div>
  <a href="/billing/upgrade" class="btn btn--sm btn--warning">Upgrade</a>
  <button class="alert__close" aria-label="Dismiss warning">×</button>
</div>
```

```css
.alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid;
  font-size: 0.9375rem;
}

.alert--info    { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
.alert--success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
.alert--warning { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.alert--error   { background: #fef2f2; border-color: #fecaca; color: #991b1b; }

.alert__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

.alert__content { flex: 1; }
.alert__title { display: block; font-weight: 600; margin-bottom: 2px; }
.alert__description { margin: 0; opacity: 0.85; }
```

### Top-of-Page System Banner

```html
<!-- Placed above main nav — for system-wide messages -->
<div class="system-banner system-banner--warning" role="status">
  <span>
    <strong>Scheduled maintenance:</strong>
    The system will be unavailable on Dec 15, 2–4 AM UTC.
  </span>
  <button class="system-banner__close" aria-label="Dismiss">×</button>
</div>
```

```css
.system-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 16px;
  font-size: 0.875rem;
  text-align: center;
}

.system-banner--warning { background: #fef3c7; color: #92400e; }
.system-banner--error   { background: #fee2e2; color: #991b1b; }
.system-banner--info    { background: #dbeafe; color: #1e40af; }
```

---

## Progress Indicators

### Determinate Progress Bar (Known Duration/Amount)

```html
<div class="progress" role="progressbar" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100" aria-label="Uploading files: 65%">
  <div class="progress__fill" style="width: 65%"></div>
  <span class="progress__label" aria-hidden="true">65%</span>
</div>
```

```css
.progress {
  position: relative;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: #2563eb;
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Animated stripe for active uploads */
.progress--active .progress__fill {
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255,255,255,0.15) 50%,
    rgba(255,255,255,0.15) 75%,
    transparent 75%
  );
  background-size: 20px 20px;
  animation: progress-stripe 0.8s linear infinite;
}

@keyframes progress-stripe {
  to { background-position: 20px 0; }
}
```

### Indeterminate Progress Bar (Unknown Duration)

```css
.progress--indeterminate .progress__fill {
  width: 30%;
  animation: indeterminate-slide 1.4s ease-in-out infinite;
}

@keyframes indeterminate-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(440%); }
}
```

### Multi-Step Progress (Upload + Process + Save)

```html
<div class="upload-progress">
  <div class="upload-progress__step upload-progress__step--complete">
    <span class="step-dot">✓</span>
    <span>Uploading</span>
    <div class="step-connector"></div>
  </div>
  <div class="upload-progress__step upload-progress__step--active">
    <span class="step-dot step-dot--pulse"></span>
    <span>Processing</span>
    <div class="step-connector"></div>
  </div>
  <div class="upload-progress__step">
    <span class="step-dot step-dot--pending"></span>
    <span>Saving</span>
  </div>
</div>
```

---

## Confirmation Dialogs

Use before irreversible or destructive actions. Not for every action — overuse causes dialog blindness.

### When Required
- Delete (files, accounts, data that can't be recovered)
- Bulk destructive operations
- Account closure
- Sending something that can't be recalled

### When NOT Required
- Archiving (reversible)
- Logging out
- Navigating away with unsaved changes (use `beforeunload` or inline warning instead)
- Saving (just save, don't ask)

```html
<dialog class="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <div class="dialog__header">
    <div class="dialog__icon dialog__icon--danger" aria-hidden="true">
      <svg><!-- trash icon --></svg>
    </div>
    <div>
      <h2 id="dialog-title" class="dialog__title">Delete project?</h2>
      <p id="dialog-desc" class="dialog__description">
        This will permanently delete <strong>Marketing Q4</strong> and all 47 files inside it.
        This cannot be undone.
      </p>
    </div>
  </div>
  <div class="dialog__footer">
    <button class="btn btn--ghost" autofocus>Cancel</button>
    <button class="btn btn--danger">Delete project</button>
  </div>
</dialog>
```

**Rules**:
- `autofocus` on the Cancel button (safe default)
- Describe exactly what will be deleted (name the item)
- "Cannot be undone" only when true — don't cry wolf
- Danger button should be right-aligned and require deliberate selection
- For high-stakes deletions, require typing the item name to confirm

```html
<!-- High-stakes confirmation -->
<div class="confirm-field">
  <label for="confirm-input">
    Type <strong>delete my account</strong> to confirm
  </label>
  <input type="text" id="confirm-input" autocomplete="off" />
</div>
<button class="btn btn--danger" id="confirm-btn" disabled>
  Delete my account
</button>
```

```javascript
document.getElementById('confirm-input').addEventListener('input', (e) => {
  document.getElementById('confirm-btn').disabled =
    e.target.value !== 'delete my account';
});
```

---

## Undo Pattern

Better than confirmation for most destructive actions. Act first, offer undo.

```javascript
async function deleteItem(id) {
  // 1. Remove from UI immediately (optimistic)
  const item = removeFromUI(id);

  // 2. Show undo toast
  const undone = await new Promise((resolve) => {
    toast.show({
      message: `"${item.name}" deleted`,
      type: 'info',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => resolve(true)
      }
    });

    // Auto-resolve false when toast dismisses
    setTimeout(() => resolve(false), 5100);
  });

  if (undone) {
    // 3a. Restore to UI
    restoreToUI(item);
    toast.show({ message: 'Deletion cancelled', type: 'success', duration: 2000 });
  } else {
    // 3b. Actually delete on server
    await api.delete(id);
  }
}
```

**When undo beats confirmation**:
- Email archive/delete
- List item deletion
- Draft discard
- Any action that can be easily buffered server-side

**When confirmation beats undo**:
- Bulk delete (restoring 500 items is painful)
- Account deletion (server-side effects are immediate)
- Payment submission (cannot undo a charge instantly)

---

## Optimistic Updates with Feedback

```javascript
async function archiveThread(threadId) {
  const thread = getThread(threadId);

  // 1. Optimistic update
  setThreadState(threadId, { archived: true });

  // 2. Immediate subtle feedback (not a toast — too minor)
  // The row just disappears from inbox — that IS the feedback

  try {
    await api.archiveThread(threadId);
  } catch (err) {
    // 3. Revert + inform
    setThreadState(threadId, { archived: false });
    toast.show({
      message: 'Could not archive. Please try again.',
      type: 'error',
      action: { label: 'Retry', onClick: () => archiveThread(threadId) }
    });
  }
}
```

---

## Status Indicators

### Connection Status

```html
<div class="status-indicator" aria-live="polite" aria-label="Connection status">
  <span class="status-dot status-dot--online" aria-hidden="true"></span>
  <span class="status-text">Connected</span>
</div>
```

```css
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot--online  { background: #22c55e; }
.status-dot--away    { background: #f59e0b; }
.status-dot--offline { background: #9ca3af; }
.status-dot--error   { background: #ef4444; }

/* Pulse for live/active state */
.status-dot--live {
  background: #22c55e;
  animation: status-pulse 2s ease-in-out infinite;
}

@keyframes status-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  50%       { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
}
```

### Save Status

```html
<!-- Auto-save indicator -->
<div class="save-status" aria-live="polite">
  <!-- Changes -->
  <span class="save-status__state save-status__state--unsaved" aria-label="Unsaved changes">
    <span class="save-dot" aria-hidden="true"></span>
    Unsaved changes
  </span>
  <!-- Saving -->
  <span class="save-status__state save-status__state--saving" hidden>
    Saving...
  </span>
  <!-- Saved -->
  <span class="save-status__state save-status__state--saved" hidden>
    ✓ Saved
  </span>
</div>
```

---

## Notification Systems

### In-App Notification Bell

```html
<div class="notification-menu">
  <button
    class="btn-icon"
    aria-label="Notifications (3 unread)"
    aria-haspopup="true"
    aria-expanded="false"
    aria-controls="notifications-panel"
  >
    <svg aria-hidden="true"><!-- bell --></svg>
    <span class="notification-badge" aria-hidden="true">3</span>
  </button>

  <div id="notifications-panel" class="notifications-panel" hidden>
    <div class="notifications-panel__header">
      <h2>Notifications</h2>
      <button class="link-btn">Mark all as read</button>
    </div>
    <ul class="notifications-list" role="list">
      <li class="notification notification--unread">
        <img src="/avatar.jpg" alt="" class="notification__avatar" />
        <div class="notification__content">
          <p class="notification__text">
            <strong>Sarah</strong> commented on your post
          </p>
          <time class="notification__time" datetime="2024-01-15T10:30">2h ago</time>
        </div>
        <a href="/posts/123#comment-456" class="notification__link" aria-label="View Sarah's comment">
          <span class="sr-only">View</span>
        </a>
      </li>
    </ul>
    <a href="/notifications" class="notifications-panel__footer">View all notifications</a>
  </div>
</div>
```

---

## Pattern Selection Guide

| Situation | Pattern |
|-----------|---------|
| Action completed, no next step needed | Toast (auto-dismiss, 3–4s) |
| Action completed, undo available | Toast with Undo action (5s) |
| Error, user can retry | Toast with Retry action |
| Error, critical, blocks progress | Inline error or page-level alert |
| Destructive action (irreversible) | Confirmation dialog |
| Destructive action (reversible) | Optimistic update + Undo toast |
| System-wide announcement | Top banner (persistent) |
| Trial expiring / quota warning | Inline alert banner |
| Long operation (known %) | Progress bar (determinate) |
| Long operation (unknown time) | Spinner or indeterminate bar |
| Page loading initial data | Skeleton screens |
| Background save | Status indicator (auto-save text) |
| Live connection state | Status dot with pulse |
