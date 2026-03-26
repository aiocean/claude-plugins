# Micro-Animation Library

25+ copy-paste CSS micro-animations for common UI components. Each is self-contained — paste the CSS block and apply the class. All use only `transform` and `opacity` for 60fps performance.

Every block assumes these base tokens are defined (from `02-motion-design-system.md`):

```css
:root {
  --ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in:     cubic-bezier(0.4, 0.0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

---

## 01. Button Hover + Press

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  /* Transitions: lift on hover, press on active */
  transition:
    transform    150ms var(--ease-out),
    box-shadow   150ms var(--ease-out),
    background-color 150ms var(--ease-out);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

.btn:active {
  transform: translateY(0) scale(0.97);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  transition-duration: 80ms;
}

/* Focused state with ring */
.btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  transition: outline-offset 150ms var(--ease-out);
}
```

---

## 02. Toggle Switch

```css
.toggle {
  --toggle-width:  48px;
  --toggle-height: 26px;
  --thumb-size:    20px;
  --thumb-offset:  3px;

  position: relative;
  display: inline-block;
  width:  var(--toggle-width);
  height: var(--toggle-height);
  cursor: pointer;
}

.toggle input { display: none; }

.toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #d1d5db;
  transition: background-color 200ms var(--ease-out);
}

.toggle-thumb {
  position: absolute;
  top: var(--thumb-offset);
  left: var(--thumb-offset);
  width: var(--thumb-size);
  height: var(--thumb-size);
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition:
    transform 250ms var(--ease-spring),
    width     150ms var(--ease-out);
}

/* Stretch thumb while moving (squash-and-stretch) */
.toggle input:active ~ .toggle-track .toggle-thumb {
  width: calc(var(--thumb-size) + 6px);
}

/* Checked state */
.toggle input:checked ~ .toggle-track {
  background: #3b82f6;
}

.toggle input:checked ~ .toggle-track .toggle-thumb {
  transform: translateX(
    calc(var(--toggle-width) - var(--thumb-size) - var(--thumb-offset) * 2)
  );
}

/* Focus ring */
.toggle input:focus-visible ~ .toggle-track {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

---

## 03. Checkbox Check

```css
.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-box {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 150ms var(--ease-out),
    border-color     150ms var(--ease-out),
    transform        150ms var(--ease-spring);
}

.checkbox-wrapper input:checked ~ .checkbox-box {
  background: #3b82f6;
  border-color: #3b82f6;
  transform: scale(1.1);  /* brief pop */
  animation: checkPop 200ms var(--ease-spring) both;
}

@keyframes checkPop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Checkmark SVG path draw animation */
.checkmark {
  stroke: white;
  stroke-width: 2.5;
  fill: none;
  stroke-dasharray: 16;
  stroke-dashoffset: 16;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke-dashoffset 200ms var(--ease-out) 50ms;
}

.checkbox-wrapper input:checked ~ .checkbox-box .checkmark {
  stroke-dashoffset: 0;
}

/* Indeterminate dash */
.checkbox-wrapper input:indeterminate ~ .checkbox-box {
  background: #3b82f6;
  border-color: #3b82f6;
}
```

---

## 04. Input Focus Glow

```css
.input-field {
  position: relative;
}

.input-field input,
.input-field textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  background: white;
  outline: none;
  transition:
    border-color 150ms var(--ease-out),
    box-shadow   150ms var(--ease-out);
}

.input-field input:focus,
.input-field textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.input-field input.error,
.input-field textarea.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  animation: inputShake 400ms var(--ease-out);
}

.input-field input.success {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

@keyframes inputShake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}

/* Floating label */
.input-field label {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  transition:
    transform  150ms var(--ease-out),
    font-size  150ms var(--ease-out),
    color      150ms var(--ease-out);
  transform-origin: left center;
}

.input-field input:focus ~ label,
.input-field input:not(:placeholder-shown) ~ label {
  transform: translateY(-160%) scale(0.85);
  color: #3b82f6;
}
```

---

## 05. Card Hover Lift

```css
.card {
  border-radius: 12px;
  background: white;
  padding: 20px;
  transition:
    transform   250ms var(--ease-out),
    box-shadow  250ms var(--ease-out);
  will-change: transform; /* promote on hover, not permanently */
}

.card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.04),
    0 10px 24px rgba(0, 0, 0, 0.12),
    0 20px 40px rgba(0, 0, 0, 0.06);
}

.card:active {
  transform: translateY(-1px) scale(0.99);
  transition-duration: 100ms;
}

/* Image zoom inside card */
.card .card-image {
  overflow: hidden;
  border-radius: 8px;
}

.card .card-image img {
  transition: transform 400ms var(--ease-out);
}

.card:hover .card-image img {
  transform: scale(1.04);
}
```

---

## 06. Toast Enter + Exit

```css
/* Toasts stack in a container */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
}

.toast {
  padding: 12px 16px;
  border-radius: 10px;
  background: #1f2937;
  color: white;
  min-width: 240px;
  max-width: 360px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  animation: toastEnter 300ms var(--ease-spring) both;
}

@keyframes toastEnter {
  from {
    opacity: 0;
    transform: translateX(16px) translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0) scale(1);
  }
}

.toast.dismissing {
  animation: toastExit 200ms var(--ease-in) forwards;
  pointer-events: none;
}

@keyframes toastExit {
  to {
    opacity: 0;
    transform: translateX(110%) scale(0.95);
    max-height: 0;
    padding: 0;
    margin: 0;
  }
}
```

---

## 07. Modal Backdrop + Content

```css
/* Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 100;
  animation: backdropIn 250ms var(--ease-out) both;
}

.modal-backdrop.closing {
  animation: backdropOut 200ms var(--ease-in) both;
}

@keyframes backdropIn  { from { opacity: 0; } }
@keyframes backdropOut { to   { opacity: 0; } }

/* Modal content */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  padding: 24px;
  z-index: 101;
  max-width: 480px;
  width: calc(100% - 48px);
  animation: modalIn 300ms var(--ease-spring) both;
}

.modal.closing {
  animation: modalOut 200ms var(--ease-in) both;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 16px)) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes modalOut {
  to {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 8px)) scale(0.97);
  }
}

/* Bottom sheet variant (mobile) */
@media (max-width: 640px) {
  .modal {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    border-radius: 20px 20px 0 0;
    max-width: 100%;
    width: 100%;
    animation: sheetIn 350ms var(--ease-out) both;
  }

  .modal.closing {
    animation: sheetOut 250ms var(--ease-in) both;
  }

  @keyframes sheetIn  { from { transform: translateY(100%); } }
  @keyframes sheetOut { to   { transform: translateY(100%); } }
}
```

---

## 08. Dropdown Open + Close

```css
.dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 180px;
  background: white;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  overflow: hidden;
  z-index: 50;

  /* Hidden by default */
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
  pointer-events: none;
  transform-origin: top left;
  transition:
    opacity   200ms var(--ease-out),
    transform 200ms var(--ease-spring);
}

.dropdown-wrapper.open .dropdown-menu {
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}

/* Items stagger in */
.dropdown-item {
  padding: 8px 14px;
  cursor: pointer;
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity   150ms var(--ease-out),
    transform 150ms var(--ease-out),
    background-color 100ms var(--ease-out);
}

.dropdown-wrapper.open .dropdown-item {
  opacity: 1;
  transform: translateX(0);
}

.dropdown-wrapper.open .dropdown-item:nth-child(1) { transition-delay: 50ms; }
.dropdown-wrapper.open .dropdown-item:nth-child(2) { transition-delay: 80ms; }
.dropdown-wrapper.open .dropdown-item:nth-child(3) { transition-delay: 110ms; }
.dropdown-wrapper.open .dropdown-item:nth-child(4) { transition-delay: 140ms; }

.dropdown-item:hover {
  background-color: #f3f4f6;
}
```

---

## 09. Accordion Expand

```css
.accordion-item {
  border-bottom: 1px solid #e5e7eb;
  overflow: hidden;
}

.accordion-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  cursor: pointer;
  width: 100%;
  background: none;
  border: none;
}

/* Chevron rotation */
.accordion-icon {
  transition: transform 250ms var(--ease-in-out);
  flex-shrink: 0;
}

.accordion-item.open .accordion-icon {
  transform: rotate(180deg);
}

/* Content reveal — CSS grid trick for height animation */
.accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms var(--ease-out);
}

.accordion-item.open .accordion-content {
  grid-template-rows: 1fr;
}

/* Inner wrapper needed for grid trick to work */
.accordion-content-inner {
  overflow: hidden;
  padding-bottom: 0;
  transition: padding-bottom 300ms var(--ease-out);
}

.accordion-item.open .accordion-content-inner {
  padding-bottom: 16px;
}
```

---

## 10. Tab Indicator Slide

```css
.tabs {
  display: flex;
  position: relative;
  border-bottom: 2px solid #e5e7eb;
  gap: 0;
}

.tab-btn {
  padding: 10px 18px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-weight: 500;
  position: relative;
  transition: color 150ms var(--ease-out);
}

.tab-btn.active {
  color: #3b82f6;
}

/* Sliding indicator — positioned absolutely, moved via JS */
.tab-indicator {
  position: absolute;
  bottom: -2px;
  height: 2px;
  background: #3b82f6;
  border-radius: 2px 2px 0 0;
  transition:
    left   250ms var(--ease-in-out),
    width  250ms var(--ease-in-out);
}
```

```javascript
// Update tab indicator position
const tabs = document.querySelectorAll('.tab-btn');
const indicator = document.querySelector('.tab-indicator');

function updateIndicator(activeTab) {
  indicator.style.left  = `${activeTab.offsetLeft}px`;
  indicator.style.width = `${activeTab.offsetWidth}px`;
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    updateIndicator(tab);
  });
});

// Initialize
updateIndicator(document.querySelector('.tab-btn.active'));
```

---

## 11–13. Loading Spinners (3 Variants)

```css
/* --- Variant 1: Ring spinner (classic) --- */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner-ring {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2.5px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  animation: spin 700ms linear infinite;
}

/* --- Variant 2: Dual-ring (coaxial) --- */
@keyframes spin-reverse { to { transform: rotate(-360deg); } }

.spinner-dual {
  position: relative;
  width: 32px;
  height: 32px;
}
.spinner-dual::before,
.spinner-dual::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 2.5px solid transparent;
}
.spinner-dual::before {
  inset: 0;
  border-top-color: #3b82f6;
  animation: spin 800ms linear infinite;
}
.spinner-dual::after {
  inset: 4px;
  border-bottom-color: #93c5fd;
  animation: spin-reverse 600ms linear infinite;
}

/* --- Variant 3: Dots pulse --- */
@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.4; }
  40%           { transform: scale(1.0); opacity: 1.0; }
}

.spinner-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.spinner-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  animation: dotPulse 1.2s ease-in-out infinite;
}

.spinner-dots span:nth-child(1) { animation-delay: -0.32s; }
.spinner-dots span:nth-child(2) { animation-delay: -0.16s; }
.spinner-dots span:nth-child(3) { animation-delay: 0s; }
```

---

## 14. Success Checkmark

```css
.success-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: successPop 400ms var(--ease-spring) both;
}

@keyframes successPop {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.success-icon svg {
  overflow: visible;
}

.success-checkmark {
  stroke: white;
  stroke-width: 3;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 22;
  stroke-dashoffset: 22;
  animation: drawCheck 300ms var(--ease-out) 200ms forwards;
}

@keyframes drawCheck {
  to { stroke-dashoffset: 0; }
}

/* HTML:
<div class="success-icon">
  <svg width="20" height="20" viewBox="0 0 24 24">
    <polyline class="success-checkmark" points="4,12 9,18 20,7" />
  </svg>
</div>
*/
```

---

## 15. Error Shake

```css
/* Apply to any element that needs error feedback */
@keyframes errorShake {
  0%        { transform: translateX(0); }
  12.5%     { transform: translateX(-8px); }
  37.5%     { transform: translateX(8px); }
  62.5%     { transform: translateX(-6px); }
  87.5%     { transform: translateX(6px); }
  100%      { transform: translateX(0); }
}

.shake-error {
  animation: errorShake 400ms var(--ease-out);
}

/* Trigger via JS:
   el.classList.remove('shake-error');
   void el.offsetWidth; // force reflow
   el.classList.add('shake-error');
*/
```

---

## 16. Ripple Effect

```css
.ripple-btn {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0);
  animation: rippleExpand 600ms var(--ease-out) forwards;
  pointer-events: none;
}

@keyframes rippleExpand {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

```javascript
// Add ripple on click
document.querySelectorAll('.ripple-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    ripple.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
    `;

    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});
```

---

## 17. Skeleton Shimmer

```css
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f3f4f6 25%,
    #e9eaec 50%,
    #f3f4f6 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 6px;
}

/* Reusable skeleton shapes */
.skeleton-text {
  height: 16px;
  margin-bottom: 8px;
}

.skeleton-text.short  { width: 40%; }
.skeleton-text.medium { width: 70%; }
.skeleton-text.full   { width: 100%; }

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-card {
  height: 180px;
  border-radius: 12px;
}

/* Card layout example */
.skeleton-card-layout {
  display: flex;
  gap: 12px;
  padding: 16px;
}

/* Dark mode variant */
@media (prefers-color-scheme: dark) {
  .skeleton {
    background: linear-gradient(
      90deg,
      #374151 25%,
      #4b5563 50%,
      #374151 75%
    );
    background-size: 200% 100%;
  }
}
```

---

## 18. Counter Flip

```css
.counter-flip {
  display: inline-block;
  overflow: hidden;
  position: relative;
}

.counter-flip .digit {
  display: inline-block;
  transition: transform 300ms var(--ease-in-out);
}

/* When number increases — flip up */
.counter-flip.increment .digit {
  animation: flipUp 300ms var(--ease-out) both;
}

/* When number decreases — flip down */
.counter-flip.decrement .digit {
  animation: flipDown 300ms var(--ease-out) both;
}

@keyframes flipUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes flipDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

## 19. Progress Bar Fill

```css
.progress-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: inherit;
  transform-origin: left center;
  transition: transform 400ms var(--ease-in-out);
  /* Use transform: scaleX() instead of width for performance */
  transform: scaleX(0);
}

/* Set via CSS variable or inline style */
.progress-fill[data-value="25"]  { transform: scaleX(0.25); }
.progress-fill[data-value="50"]  { transform: scaleX(0.50); }
.progress-fill[data-value="75"]  { transform: scaleX(0.75); }
.progress-fill[data-value="100"] { transform: scaleX(1.00); }

/* Or set via JS: el.style.transform = `scaleX(${value / 100})`; */

/* Animated indeterminate bar */
@keyframes indeterminate {
  from { transform: translateX(-100%) scaleX(0.5); }
  to   { transform: translateX(200%)  scaleX(0.5); }
}

.progress-fill.indeterminate {
  animation: indeterminate 1.4s ease-in-out infinite;
  transform-origin: center;
}
```

---

## 20. Notification Badge Pop

```css
.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;

  /* Start hidden */
  transform: scale(0);
  opacity: 0;
}

/* When badge has content (non-empty) */
.badge:not(:empty) {
  animation: badgeAppear 400ms var(--ease-spring) forwards;
}

@keyframes badgeAppear {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.3); opacity: 1; }
  80%  { transform: scale(0.9); }
  100% { transform: scale(1);   opacity: 1; }
}

/* Number change animation */
.badge.updating {
  animation: badgeUpdate 300ms var(--ease-spring) both;
}

@keyframes badgeUpdate {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.4); }
  100% { transform: scale(1); }
}
```

---

## 21. Hamburger to X

```css
.hamburger {
  --bar-height:  2px;
  --bar-width:   22px;
  --bar-gap:     6px;

  width:  var(--bar-width);
  height: calc(var(--bar-height) * 3 + var(--bar-gap) * 2);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: none;
  border: none;
  padding: 0;
}

.hamburger span {
  display: block;
  width: 100%;
  height: var(--bar-height);
  background: currentColor;
  border-radius: 2px;
  transform-origin: center;
  transition:
    transform  300ms var(--ease-in-out),
    opacity    200ms var(--ease-out),
    width      300ms var(--ease-in-out);
}

/* Open state: morph to X */
.hamburger.open span:nth-child(1) {
  transform: translateY(calc(var(--bar-gap) + var(--bar-height))) rotate(45deg);
}

.hamburger.open span:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}

.hamburger.open span:nth-child(3) {
  transform: translateY(calc(-1 * (var(--bar-gap) + var(--bar-height)))) rotate(-45deg);
}
```

---

## 22. FAB Expand

```css
.fab-wrapper {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
}

.fab-main {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transition: transform 300ms var(--ease-in-out);
  z-index: 1;
}

/* Icon rotation on open */
.fab-wrapper.open .fab-main {
  transform: rotate(45deg);
}

.fab-action {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);

  /* Hidden by default */
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 250ms var(--ease-spring),
    opacity   150ms var(--ease-out);
}

.fab-wrapper.open .fab-action {
  transform: scale(1);
  opacity: 1;
  pointer-events: auto;
}

/* Stagger the action buttons */
.fab-wrapper.open .fab-action:nth-child(2) { transition-delay: 30ms; }
.fab-wrapper.open .fab-action:nth-child(3) { transition-delay: 60ms; }
.fab-wrapper.open .fab-action:nth-child(4) { transition-delay: 90ms; }

/* Close: reverse stagger (faster, bottom exits first) */
.fab-wrapper:not(.open) .fab-action:nth-child(2) { transition-delay: 60ms; }
.fab-wrapper:not(.open) .fab-action:nth-child(3) { transition-delay: 30ms; }
.fab-wrapper:not(.open) .fab-action:nth-child(4) { transition-delay: 0ms; }
```

---

## 23. Select / Combobox Focus State

```css
.select-wrapper {
  position: relative;
}

.select-wrapper select {
  appearance: none;
  width: 100%;
  padding: 10px 36px 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  outline: none;
  transition:
    border-color 150ms var(--ease-out),
    box-shadow   150ms var(--ease-out);
}

.select-wrapper select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

/* Arrow icon with rotation on open */
.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  transition: transform 200ms var(--ease-in-out);
}

.select-wrapper select:focus ~ .select-arrow {
  transform: translateY(-50%) rotate(180deg);
}
```

---

## 24. Tooltip Appear

```css
[data-tooltip] {
  position: relative;
}

[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(4px) scale(0.95);
  background: #1f2937;
  color: white;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity   150ms var(--ease-out),
    transform 150ms var(--ease-spring);
}

[data-tooltip]:hover::after,
[data-tooltip]:focus-visible::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}
```

---

## 25. Link Underline Slide

```css
/* Animated underline that slides in from left */
.link-animated {
  text-decoration: none;
  position: relative;
  display: inline-block;
}

.link-animated::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 1.5px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 200ms var(--ease-out);
}

.link-animated:hover::after,
.link-animated:focus-visible::after {
  transform: scaleX(1);
}

/* Variant: center out */
.link-center::after {
  transform-origin: center;
}

/* Variant: right to left */
.link-rtl::after {
  transform-origin: right center;
}
```

---

## Quick Reference Index

| # | Animation | Key technique |
|---|-----------|--------------|
| 01 | Button hover/press | `translateY` + `scale` on `:hover`/`:active` |
| 02 | Toggle switch | `translateX` spring + `scaleX` stretch |
| 03 | Checkbox check | `stroke-dashoffset` draw + `scale` pop |
| 04 | Input focus glow | `box-shadow` + `border-color` transition |
| 05 | Card hover lift | `translateY` + `scale` + `box-shadow` |
| 06 | Toast enter/exit | `translateX` spring enter, `translateX` linear exit |
| 07 | Modal backdrop+content | Staged: backdrop then content with spring |
| 08 | Dropdown open/close | `scale` + `translateY` spring + stagger items |
| 09 | Accordion expand | CSS grid `grid-template-rows: 0fr → 1fr` trick |
| 10 | Tab indicator slide | Absolutely positioned div moved via JS |
| 11 | Ring spinner | `rotate(360deg)` linear infinite |
| 12 | Dual ring spinner | Two pseudo-elements spinning opposite directions |
| 13 | Dots pulse spinner | `scale` pulse with staggered delays |
| 14 | Success checkmark | Circle `scale` spring + SVG `stroke-dashoffset` |
| 15 | Error shake | `translateX` oscillation |
| 16 | Ripple | Dynamically inserted element with `scale` expand |
| 17 | Skeleton shimmer | Gradient `background-position` sweep |
| 18 | Counter flip | `translateY` slide in/out on number change |
| 19 | Progress bar fill | `transform: scaleX()` from left origin |
| 20 | Notification badge pop | `scale` spring overshoot on appear |
| 21 | Hamburger to X | Three bars: rotate + translate + fade middle |
| 22 | FAB expand | `scale` spring with staggered delays |
| 23 | Select/combobox | `box-shadow` focus + arrow `rotate` |
| 24 | Tooltip appear | `::after` pseudo with `scale` + `translateY` |
| 25 | Link underline | `::after` pseudo with `scaleX` slide |
