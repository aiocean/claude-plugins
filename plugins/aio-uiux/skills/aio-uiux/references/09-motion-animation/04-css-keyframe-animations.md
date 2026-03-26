# CSS Keyframe Animations

`@keyframes` and the `animation` property give you precise multi-step control over animations — things that transitions cannot express. Use transitions for state changes between two points; use keyframes for sequences, loops, and complex choreography.

---

## @keyframes Syntax

```css
/* Keyword syntax: from/to */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Percentage syntax: full control over timeline */
@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Mixed: both at once */
@keyframes bounceIn {
  from, 20%, 40%, 60%, 80%, to {
    animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
  }
  0%  { opacity: 0; transform: scale3d(.3, .3, .3); }
  20% { transform: scale3d(1.1, 1.1, 1.1); }
  40% { transform: scale3d(.9, .9, .9); }
  60% { opacity: 1; transform: scale3d(1.03, 1.03, 1.03); }
  80% { transform: scale3d(.97, .97, .97); }
  to  { opacity: 1; transform: scale3d(1, 1, 1); }
}

/* Per-keyframe timing functions */
@keyframes easePerStep {
  0%  { transform: translateX(0);    animation-timing-function: ease-in; }
  50% { transform: translateX(100px); animation-timing-function: ease-out; }
  100% { transform: translateX(200px); }
}
```

---

## animation Properties Deep Dive

```css
.element {
  /* Shorthand: name duration timing-function delay
                iteration-count direction fill-mode play-state */
  animation: fadeIn 250ms ease-out 0ms 1 normal forwards running;

  /* Longhand equivalents */
  animation-name:             fadeIn;
  animation-duration:         250ms;
  animation-timing-function:  ease-out;
  animation-delay:            0ms;
  animation-iteration-count:  1;          /* or: infinite, 2.5 */
  animation-direction:        normal;     /* normal, reverse, alternate, alternate-reverse */
  animation-fill-mode:        forwards;   /* none, forwards, backwards, both */
  animation-play-state:       running;    /* running, paused */

  /* Multiple animations comma-separated */
  animation:
    slideIn  250ms ease-out forwards,
    fadeIn   200ms ease-out forwards;
}
```

### animation-fill-mode — the most misunderstood property

```css
/* none (default): element returns to original state after animation */
.no-fill {
  animation: slideUp 300ms ease-out none;
  /* After 300ms: jumps back to original position */
}

/* forwards: element keeps the end-state values */
.fill-forwards {
  animation: slideUp 300ms ease-out forwards;
  /* After 300ms: stays at final position */
  /* Use this for enter animations */
}

/* backwards: element applies start-state DURING the delay period */
.fill-backwards {
  opacity: 1; /* original opacity */
  animation: fadeIn 300ms ease-out 500ms backwards;
  /* During the 500ms delay: opacity is 0 (from keyframe start) */
  /* Without backwards: element flashes at opacity:1 during delay */
}

/* both: applies backwards during delay AND forwards after completion */
.fill-both {
  animation: slideUp 300ms ease-out 100ms both;
  /* The safest default for staggered entrance animations */
}

/* Practical rule: almost always use "both" for entrance animations */
.animate-in {
  animation: myEnter 250ms ease-out both;
  /* "both" = invisible during delay + stays at final state after */
}
```

### animation-direction

```css
/* normal: 0% → 100% (default) */
.spin { animation: rotate 1s linear infinite normal; }

/* reverse: 100% → 0% */
.spin-back { animation: rotate 1s linear infinite reverse; }

/* alternate: 0%→100% then 100%→0%, ping-pong */
.breathe {
  animation: scale 2s ease-in-out infinite alternate;
}

/* alternate-reverse: 100%→0% then 0%→100% */
.breathe-in {
  animation: scale 2s ease-in-out infinite alternate-reverse;
}

@keyframes scale {
  from { transform: scale(1); }
  to   { transform: scale(1.1); }
}
```

### animation-play-state — pause/resume control

```css
.animated-element {
  animation: float 3s ease-in-out infinite;
  animation-play-state: running;
}

/* Pause on hover (useful for carousel, video-like elements) */
.animated-element:hover {
  animation-play-state: paused;
}

/* JS control */
/*
  element.style.animationPlayState = 'paused';
  element.style.animationPlayState = 'running';
*/
```

---

## Essential Keyframe Library

### Fade variants

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Scale variants

```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

@keyframes scaleInSpring {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  80%  { transform: scale(0.97); }
  100% { transform: scale(1); }
}

@keyframes popIn {
  0%   { transform: scale(0.5); opacity: 0; }
  70%  { transform: scale(1.1); }
  100% { transform: scale(1);   opacity: 1; }
}
```

### Rotation variants

```css
@keyframes rotateIn {
  from {
    opacity: 0;
    transform: rotate(-90deg) scale(0.9);
  }
  to {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes spinReverse {
  from { transform: rotate(360deg); }
  to   { transform: rotate(0deg); }
}

/* Usage: loading spinner */
.spinner {
  animation: spin 800ms linear infinite;
}
```

### Attention seekers

```css
/* Shake: error state, invalid input */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 50%, 90% { transform: translateX(-6px); }
  30%, 70%      { transform: translateX(6px); }
}

/* More dramatic shake */
@keyframes shakeHard {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  15%      { transform: translateX(-8px) rotate(-1deg); }
  30%      { transform: translateX(8px) rotate(1deg); }
  45%      { transform: translateX(-6px) rotate(-0.5deg); }
  60%      { transform: translateX(6px) rotate(0.5deg); }
  75%      { transform: translateX(-4px); }
  90%      { transform: translateX(4px); }
}

/* Pulse: draw attention, "new item" indicator */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

/* Ping: notification ripple */
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.ping-indicator {
  position: relative;
}
.ping-indicator::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor;
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* Bounce: playful confirmation */
@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
  }
  40%, 43% {
    transform: translateY(-20px);
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
  }
  70% {
    transform: translateY(-10px);
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
  }
  90% {
    transform: translateY(-4px);
  }
}

/* Wiggle: subtle attention (less aggressive than shake) */
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-4deg); }
  75% { transform: rotate(4deg); }
}
```

### Loading animations

```css
/* Spinner: classic rotating ring */
@keyframes spinRing {
  to { transform: rotate(360deg); }
}

.spinner-ring {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spinRing 700ms linear infinite;
}

/* Dots: three bouncing dots */
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%           { transform: scale(1.0); opacity: 1; }
}

.dots-loader span {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: dotBounce 1.2s ease-in-out infinite;
}
.dots-loader span:nth-child(1) { animation-delay: -0.32s; }
.dots-loader span:nth-child(2) { animation-delay: -0.16s; }
.dots-loader span:nth-child(3) { animation-delay: 0s; }

/* Skeleton shimmer */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}
```

---

## Multi-Step Animations

```css
/* Progress bar fill — multi-step with pauses */
@keyframes progressFill {
  0%   { width: 0%; }
  10%  { width: 15%; }   /* fast initial start */
  30%  { width: 40%; }   /* slows down (simulates work) */
  60%  { width: 65%; }   /* slower still */
  80%  { width: 80%; }   /* almost stalls */
  100% { width: 100%; }  /* completes on done event */
}

/* Typing cursor blink */
@keyframes blink {
  0%, 49%  { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.cursor::after {
  content: '|';
  animation: blink 1s step-start infinite;
}

/* Number counter flip */
@keyframes flipUp {
  0%   { transform: rotateX(90deg) translateY(-50%); opacity: 0; }
  100% { transform: rotateX(0deg)  translateY(0);    opacity: 1; }
}

@keyframes flipDown {
  0%   { transform: rotateX(0deg) translateY(0);    opacity: 1; }
  100% { transform: rotateX(-90deg) translateY(50%); opacity: 0; }
}

/* Success checkmark draw */
@keyframes drawCheck {
  from { stroke-dashoffset: 100; }
  to   { stroke-dashoffset: 0; }
}

.checkmark-path {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: drawCheck 400ms ease-out 200ms forwards;
}
```

---

## Orchestrating Animation Sequences

### Method 1: Chained delays

```css
/* Each element delays to start after the previous finishes */
.step-1 { animation: fadeInUp 300ms ease-out 0ms   both; }
.step-2 { animation: fadeInUp 300ms ease-out 200ms both; } /* starts as step-1 finishes */
.step-3 { animation: fadeInUp 300ms ease-out 400ms both; }
.step-4 { animation: fadeInUp 300ms ease-out 600ms both; }
```

### Method 2: Single element, multi-phase keyframe

```css
/* One element, multiple phases in one animation */
@keyframes onboarding-highlight {
  0%   { transform: scale(1);    box-shadow: none; }
  15%  { transform: scale(1.05); box-shadow: 0 0 0 4px rgba(59,130,246,0.4); }
  30%  { transform: scale(1.05); box-shadow: 0 0 0 4px rgba(59,130,246,0.4); } /* hold */
  45%  { transform: scale(1);    box-shadow: none; }
  100% { transform: scale(1);    box-shadow: none; } /* idle rest */
}

.highlight-element {
  animation: onboarding-highlight 2s ease-in-out 1s both;
}
```

### Method 3: JS-driven class toggling

```javascript
// Add classes in sequence, each triggers CSS animation
async function runSequence(elements) {
  for (const [index, el] of elements.entries()) {
    el.classList.add('animate-in');

    // Wait for animation to complete before next
    await new Promise(resolve => {
      el.addEventListener('animationend', resolve, { once: true });
    });
  }
}

// Or with fixed timing via Promise chains
function sequenceWithDelay(elements, stagger = 100) {
  elements.forEach((el, i) => {
    setTimeout(() => el.classList.add('animate-in'), i * stagger);
  });
}
```

---

## animation-composition

The `animation-composition` property (2023+) controls how multiple animations combine when they affect the same property.

```css
/* replace (default): last animation wins entirely */
.element {
  animation:
    moveRight 500ms ease-out,
    moveDown  500ms ease-out;
  animation-composition: replace; /* only moveDown's transform applies */
}

/* add: animations stack additively */
.element {
  animation:
    moveRight 500ms ease-out,
    moveDown  500ms ease-out;
  animation-composition: add;
  /* Result: element moves diagonally (both translateX and translateY) */
}

/* accumulate: combines values where it makes sense */
.element {
  animation-composition: accumulate;
}

/* Per-animation composition */
.element {
  animation:
    slideIn 300ms ease-out,
    wobble  500ms ease-in-out;
  /* Different composition per animation via individual properties */
}
```

---

## Animation Utility Classes (Copy-Paste)

```css
/* ---- Utility classes using the keyframes defined above ---- */

/* Entrance */
.anim-fade-in    { animation: fadeIn    250ms ease-out both; }
.anim-fade-up    { animation: fadeInUp  250ms ease-out both; }
.anim-fade-down  { animation: fadeInDown 250ms ease-out both; }
.anim-fade-left  { animation: fadeInLeft 250ms ease-out both; }
.anim-fade-right { animation: fadeInRight 250ms ease-out both; }
.anim-scale-in   { animation: scaleIn   250ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.anim-pop        { animation: popIn     350ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }

/* Attention */
.anim-shake      { animation: shake     400ms ease-out; }
.anim-bounce     { animation: bounce    800ms ease-out; }
.anim-pulse      { animation: pulse     1.5s ease-in-out infinite; }
.anim-wiggle     { animation: wiggle    500ms ease-in-out; }

/* Loading */
.anim-spin       { animation: spin      700ms linear infinite; }

/* Delay modifiers */
.anim-delay-100  { animation-delay: 100ms; }
.anim-delay-200  { animation-delay: 200ms; }
.anim-delay-300  { animation-delay: 300ms; }
.anim-delay-400  { animation-delay: 400ms; }
.anim-delay-500  { animation-delay: 500ms; }

/* Duration modifiers */
.anim-fast    { animation-duration: 150ms; }
.anim-normal  { animation-duration: 250ms; }
.anim-slow    { animation-duration: 400ms; }
.anim-slower  { animation-duration: 600ms; }

/* Reduced motion: collapse all */
@media (prefers-reduced-motion: reduce) {
  [class*="anim-"] {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```
