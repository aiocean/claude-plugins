# Micro-Interactions

Micro-interactions are the small, contained moments in a UI that accomplish a single task. They are the difference between an interface that feels mechanical and one that feels alive. Dan Saffer's model: Trigger → Rules → Feedback → Loops & Modes.

---

## The Four Components

### 1. Trigger
What initiates the micro-interaction.
- **User-initiated**: click, tap, hover, swipe, key press, voice command
- **System-initiated**: notification arrives, upload completes, session expires, threshold crossed

### 2. Rules
What happens when triggered. The logic.
- What changes?
- In what sequence?
- What are the constraints?

### 3. Feedback
How the user knows the rules are executing. Visual, auditory, haptic.
- Animation
- Color change
- Sound
- Vibration (mobile)
- Text change

### 4. Loops and Modes
- **Loop**: does the micro-interaction repeat? How long does it last?
- **Mode**: does the interaction change the way the system behaves going forward?

---

## Button Press Feedback

The click must feel like a physical press. Three layers: visual, timing, state.

```css
/* Layer 1: Scale depression */
.btn {
  transition: transform 0.1s ease, background 0.15s;
  transform-origin: center;
}

.btn:active {
  transform: scale(0.97);
}

/* Layer 2: Ripple effect */
.btn {
  position: relative;
  overflow: hidden;
}

.btn::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  transform: scale(0);
  opacity: 0;
  transition: transform 0s, opacity 0s;
}

.btn:active::after {
  transform: scale(2);
  opacity: 1;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}
```

```javascript
// Programmatic ripple at click origin
function addRipple(button, event) {
  const rect = button.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `left:${x}px; top:${y}px`;
  button.appendChild(ripple);

  ripple.addEventListener('animationend', () => ripple.remove());
}
```

```css
.ripple {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  transform: translate(-50%, -50%) scale(0);
  animation: ripple-expand 0.5s ease-out forwards;
  pointer-events: none;
}

@keyframes ripple-expand {
  to {
    transform: translate(-50%, -50%) scale(60);
    opacity: 0;
  }
}
```

---

## Toggle Animations

A toggle should communicate state change through motion — not just color.

```html
<label class="toggle" aria-label="Enable notifications">
  <input type="checkbox" class="toggle__input" role="switch" aria-checked="false" />
  <span class="toggle__track" aria-hidden="true">
    <span class="toggle__thumb"></span>
  </span>
</label>
```

```css
.toggle__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle__track {
  display: flex;
  align-items: center;
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: #d1d5db;
  padding: 2px;
  cursor: pointer;
  transition: background 0.25s ease;
  position: relative;
}

.toggle__thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.12);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  /* cubic-bezier with overshoot = "springy" feel */
}

.toggle__input:checked + .toggle__track {
  background: #2563eb;
}

.toggle__input:checked + .toggle__track .toggle__thumb {
  transform: translateX(20px);
}

/* Focus ring on the track (not the hidden input) */
.toggle__input:focus-visible + .toggle__track {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

**The spring**: `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots slightly — the thumb travels slightly past its endpoint then settles back. This matches how physical toggles feel.

---

## Like / Heart Animation

The delight moment. Three phases: scale down, pop up with color, settle.

```html
<button class="like-btn" aria-label="Like this post" aria-pressed="false">
  <svg class="like-btn__icon" viewBox="0 0 24 24">
    <path class="like-btn__path" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
</button>
```

```css
.like-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.like-btn__icon {
  width: 24px;
  height: 24px;
  transition: transform 0.1s;
}

.like-btn__path {
  fill: none;
  stroke: #9ca3af;
  stroke-width: 2;
  transition: fill 0.15s, stroke 0.15s;
}

/* Liked state */
.like-btn[aria-pressed="true"] .like-btn__path {
  fill: #ef4444;
  stroke: #ef4444;
}

/* Animation on click */
.like-btn.is-animating .like-btn__icon {
  animation: like-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes like-pop {
  0%   { transform: scale(1); }
  30%  { transform: scale(0.8); }
  60%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}
```

```javascript
likeBtn.addEventListener('click', () => {
  const isLiked = likeBtn.getAttribute('aria-pressed') === 'true';
  likeBtn.setAttribute('aria-pressed', String(!isLiked));

  // Trigger animation
  likeBtn.classList.remove('is-animating');
  void likeBtn.offsetWidth; // Force reflow to restart animation
  likeBtn.classList.add('is-animating');

  likeBtn.addEventListener('animationend', () => {
    likeBtn.classList.remove('is-animating');
  }, { once: true });
});
```

**Particle burst variant** (more elaborate):

```javascript
function burstParticles(button) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#ec4899'];
  const count = 8;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    particle.className = 'like-particle';
    particle.style.cssText = `
      --angle: ${(360 / count) * i}deg;
      --color: ${colors[i % colors.length]};
    `;
    button.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }
}
```

```css
.like-particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: particle-burst 0.5s ease-out forwards;
}

@keyframes particle-burst {
  to {
    transform: translate(
      calc(-50% + cos(var(--angle)) * 28px),
      calc(-50% + sin(var(--angle)) * 28px)
    ) scale(0);
    opacity: 0;
  }
}
```

---

## Pull-to-Refresh

Mobile pattern. Drag content down past a threshold to trigger a reload.

```javascript
class PullToRefresh {
  constructor(container, onRefresh) {
    this.container = container;
    this.onRefresh = onRefresh;
    this.startY = 0;
    this.pulling = false;
    this.threshold = 80;

    this.indicator = document.createElement('div');
    this.indicator.className = 'ptr-indicator';
    container.prepend(this.indicator);

    container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    container.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  onTouchStart(e) {
    if (this.container.scrollTop === 0) {
      this.startY = e.touches[0].clientY;
      this.pulling = true;
    }
  }

  onTouchMove(e) {
    if (!this.pulling) return;
    const deltaY = e.touches[0].clientY - this.startY;
    if (deltaY < 0) return;

    e.preventDefault(); // Prevent native scroll
    const progress = Math.min(deltaY / this.threshold, 1);
    const translateY = Math.min(deltaY * 0.5, this.threshold); // Resistance

    this.container.style.transform = `translateY(${translateY}px)`;
    this.indicator.style.opacity = String(progress);
    this.indicator.style.transform = `rotate(${progress * 180}deg)`;
  }

  async onTouchEnd() {
    if (!this.pulling) return;
    this.pulling = false;

    const pulled = parseFloat(this.container.style.transform.replace(/[^\d.]/g, ''));

    if (pulled >= this.threshold * 0.5) {
      this.indicator.classList.add('ptr-indicator--loading');
      await this.onRefresh();
      this.indicator.classList.remove('ptr-indicator--loading');
    }

    this.container.style.transition = 'transform 0.3s ease';
    this.container.style.transform = '';
    this.indicator.style.opacity = '0';
    setTimeout(() => { this.container.style.transition = ''; }, 300);
  }
}
```

---

## Swipe Actions

Reveal actions by swiping a list item left or right (iOS Mail pattern).

```css
.swipe-item {
  position: relative;
  overflow: hidden;
  background: white;
}

.swipe-item__content {
  position: relative;
  z-index: 1;
  background: white;
  padding: 16px;
  will-change: transform;
  transition: transform 0.2s ease;
}

.swipe-item__actions {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
}

.swipe-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  flex-direction: column;
  gap: 4px;
}

.swipe-action--delete { background: #ef4444; }
.swipe-action--archive { background: #f59e0b; }
```

```javascript
class SwipeAction {
  constructor(item) {
    this.item = item;
    this.content = item.querySelector('.swipe-item__content');
    this.startX = 0;
    this.currentX = 0;
    this.actionsWidth = 144; // 2 actions × 72px

    this.content.addEventListener('touchstart', this.start.bind(this), { passive: true });
    this.content.addEventListener('touchmove', this.move.bind(this), { passive: false });
    this.content.addEventListener('touchend', this.end.bind(this));
  }

  move(e) {
    const dx = e.touches[0].clientX - this.startX;
    if (dx > 0) return; // Only left swipe
    e.preventDefault();

    const x = Math.max(dx, -this.actionsWidth - 20);
    this.content.style.transition = 'none';
    this.content.style.transform = `translateX(${x}px)`;
  }

  end() {
    const x = parseFloat(this.content.style.transform.replace(/[^\d.-]/g, '') || '0');
    this.content.style.transition = 'transform 0.25s ease';

    if (x < -this.actionsWidth / 2) {
      this.content.style.transform = `translateX(-${this.actionsWidth}px)`;
    } else {
      this.content.style.transform = '';
    }
  }
}
```

---

## Long-Press

Hold for secondary action. Common in mobile apps (hold to select, hold for context menu).

```javascript
class LongPress {
  constructor(element, callback, delay = 500) {
    this.timer = null;
    this.element = element;
    this.callback = callback;
    this.delay = delay;
    this.moved = false;

    element.addEventListener('touchstart', this.start.bind(this), { passive: true });
    element.addEventListener('touchmove', () => { this.moved = true; }, { passive: true });
    element.addEventListener('touchend', this.cancel.bind(this));
    element.addEventListener('touchcancel', this.cancel.bind(this));
  }

  start(e) {
    this.moved = false;
    this.timer = setTimeout(() => {
      if (!this.moved) {
        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(10);
        this.callback(e);
      }
    }, this.delay);
  }

  cancel() {
    clearTimeout(this.timer);
  }
}
```

**Visual indicator** — shrinking ring that completes at threshold:

```css
.long-press-indicator {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 2px solid rgba(37, 99, 235, 0);
  animation: none;
}

.long-press-indicator.pressing {
  animation: long-press-ring 0.5s linear forwards;
}

@keyframes long-press-ring {
  0%   { border-color: rgba(37, 99, 235, 0); transform: scale(1); }
  50%  { border-color: rgba(37, 99, 235, 0.6); }
  100% { border-color: rgba(37, 99, 235, 0); transform: scale(0.94); }
}
```

---

## Scroll-Triggered Micro-Interactions

### Fade-in on Enter Viewport

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // Only animate once
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -64px 0px' // Trigger slightly before fully in view
});

document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
```

```css
[data-animate] {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

[data-animate].is-visible {
  opacity: 1;
  transform: none;
}

/* Staggered children */
[data-animate-stagger] > * {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

[data-animate-stagger].is-visible > *:nth-child(1) { transition-delay: 0ms; }
[data-animate-stagger].is-visible > *:nth-child(2) { transition-delay: 80ms; }
[data-animate-stagger].is-visible > *:nth-child(3) { transition-delay: 160ms; }
[data-animate-stagger].is-visible > * { opacity: 1; transform: none; }
```

### Sticky Header Reveal on Scroll Up

```javascript
let lastScrollY = 0;
let headerVisible = true;

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  const scrollingDown = currentScrollY > lastScrollY;

  if (scrollingDown && currentScrollY > 100) {
    if (headerVisible) {
      header.style.transform = 'translateY(-100%)';
      headerVisible = false;
    }
  } else {
    if (!headerVisible) {
      header.style.transform = '';
      headerVisible = true;
    }
  }

  lastScrollY = currentScrollY;
}, { passive: true });
```

---

## Hover Reveals

Progressive disclosure through hover. Show additional actions or info when hovering a card.

```css
.card {
  position: relative;
  overflow: hidden;
}

.card__actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.card:hover .card__actions,
.card:focus-within .card__actions {
  opacity: 1;
  transform: none;
}

/* Keyboard users: show actions when card is focused */
.card:focus-within .card__actions {
  opacity: 1;
  transform: none;
}
```

**Rule**: Always also show on `focus-within` — keyboard users need the same affordances.

---

## Timing Reference

| Interaction | Duration | Easing |
|-------------|---------|--------|
| Button press / tap feedback | 100–150ms | ease-out |
| Color/background transition | 150–200ms | ease |
| Toggle slide | 200–250ms | spring (cubic-bezier overshoot) |
| Modal open | 200–300ms | ease-out |
| Modal close | 150–200ms | ease-in (faster than open) |
| Dropdown open | 150–200ms | ease-out |
| Like/heart animation | 300–400ms | spring |
| Page transition | 250–400ms | ease-in-out |
| Scroll-triggered fade | 400–600ms | ease |
| Skeleton shimmer loop | 1500ms | linear |
| Toast appear | 250ms | ease-out |
| Toast dismiss | 200ms | ease-in |

**Rules**:
- Close/dismiss = faster than open/appear (users waiting to dismiss want speed)
- Hover reveals = 150–200ms (snappy, no waiting)
- Anything over 500ms = add a loading state
- Anything under 100ms = imperceptible (skip the animation)
- Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
