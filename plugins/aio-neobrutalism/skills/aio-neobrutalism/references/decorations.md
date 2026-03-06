# Decorative Utilities Reference

Distilled from epub-manager project base.css.

## Sketchy Effects

CSS utilities that add hand-drawn, brutalist decorative elements.

### Sketchy Underline

Adds a wavy hand-drawn underline effect.

```css
.sketchy-underline {
  position: relative;
}

.sketchy-underline::after {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  bottom: -4px;
  height: 8px;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,4 Q5,2 10,4 T20,4 T30,4 T40,4 T50,4 T60,4 T70,4 T80,4 T90,4 T100,4' stroke='%23000' stroke-width='2' fill='none' /%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 100px 8px;
  opacity: 0.8;
}
```

**Use when**: Emphasizing headings, highlighted text.

### Sketchy Circle

Adds a dashed circle around an element.

```css
.sketchy-circle {
  position: relative;
}

.sketchy-circle::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% + 16px);
  height: calc(100% + 16px);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='45' stroke='%23000' stroke-width='2' fill='none' stroke-dasharray='2,3' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  pointer-events: none;
  opacity: 0.5;
  z-index: -1;
}
```

**Use when**: Drawing attention to key elements, badges.

### Sketchy Arrow

Adds a hand-drawn arrow after content.

```css
.sketchy-arrow-right::after {
  content: '';
  display: inline-block;
  width: 24px;
  height: 12px;
  margin-left: 8px;
  background-image: url("data:image/svg+xml,%3Csvg width='24' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,6 L18,6 M15,2 L20,6 L15,10' stroke='%23000' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
}
```

**Use when**: Call-to-action buttons, navigation hints.

### Sketchy Border

Replaces standard border with slightly rotated "imperfect" border.

```css
.sketchy-border {
  position: relative;
  border: none !important;
}

.sketchy-border::before {
  content: '';
  position: absolute;
  inset: -3px;
  border: 3px solid var(--border);
  pointer-events: none;
  transform: rotate(-0.5deg);  /* Slight tilt for hand-drawn effect */
}
```

**Use when**: Cards, containers where you want a playful feel.

### Sketchy Highlight

Adds a tilted highlight behind text.

```css
.sketchy-highlight {
  position: relative;
  z-index: 1;
}

.sketchy-highlight::before {
  content: '';
  position: absolute;
  left: -4px;
  right: -4px;
  top: 20%;
  bottom: 20%;
  background-color: var(--main);
  opacity: 0.3;
  z-index: -1;
  transform: rotate(-1deg);
  border-radius: 2px;
}
```

**Use when**: Highlighting key phrases, important text.

## Background Patterns

### Doodle Stars

Subtle star-shaped decorations.

```css
.doodle-stars {
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20,20 L22,18 L24,20 L22,22 Z M80,80 L82,78 L84,80 L82,82 Z M50,10 L52,8 L54,10 L52,12 Z' fill='%23000' opacity='0.1' /%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 100px 100px;
}
```

### Doodle Dots

Scattered dot pattern.

```css
.doodle-dots {
  background-image: url("data:image/svg+xml,%3Csvg width='50' height='50' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='2' fill='%23000' opacity='0.15' /%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%23000' opacity='0.15' /%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 50px 50px;
}
```

### Doodle Scribble

Wavy scribble lines.

```css
.doodle-scribble {
  background-image: url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10,60 Q20,50 30,60 T50,60 M70,40 Q80,30 90,40 T110,40' stroke='%23000' stroke-width='1.5' fill='none' opacity='0.08' /%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 120px 120px;
}
```

### Doodle Dust

Fine dust/grain texture - great for paper-like backgrounds.

```css
.doodle-dust {
  background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='40' height='40' fill='none'/%3E%3Ccircle cx='6' cy='4' r='0.6' fill='%23000' opacity='0.55' /%3E%3Ccircle cx='18' cy='8' r='0.4' fill='%23000' opacity='0.48' /%3E%3Ccircle cx='29' cy='6' r='0.5' fill='%23000' opacity='0.52' /%3E%3Ccircle cx='11' cy='18' r='0.35' fill='%23000' opacity='0.46' /%3E%3Ccircle cx='22' cy='21' r='0.55' fill='%23000' opacity='0.54' /%3E%3Ccircle cx='33' cy='19' r='0.3' fill='%23000' opacity='0.44' /%3E%3Ccircle cx='4' cy='29' r='0.45' fill='%23000' opacity='0.5' /%3E%3Ccircle cx='19' cy='33' r='0.65' fill='%23000' opacity='0.56' /%3E%3Ccircle cx='36' cy='31' r='0.4' fill='%23000' opacity='0.48' /%3E%3Ccircle cx='8' cy='14' r='0.5' fill='%23000' opacity='0.51' /%3E%3Ccircle cx='25' cy='11' r='0.35' fill='%23000' opacity='0.45' /%3E%3Ccircle cx='15' cy='24' r='0.4' fill='%23000' opacity='0.52' /%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 40px 40px;
  background-attachment: local;
}
```

**Use when**: Background textures for sections, cards with personality.

## Animation

### Sketchy Wiggle

Playful wiggle on hover.

```css
@keyframes sketchy-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-1deg); }
  75% { transform: rotate(1deg); }
}

.sketchy-wiggle:hover {
  animation: sketchy-wiggle 0.3s ease-in-out;
}
```

**Use when**: Interactive elements that should feel playful.

## Usage Guidelines

1. **Use sparingly**: These effects add personality but can overwhelm
2. **Combine intentionally**: Don't stack multiple effects on one element
3. **Consider accessibility**: Ensure content remains readable
4. **Performance**: SVG backgrounds are efficient but avoid overuse
5. **Context**: Best for landing pages, hero sections, playful UI areas

## Quick Reference

| Class | Effect | Best For |
|-------|--------|----------|
| `.sketchy-underline` | Wavy underline | Headings, emphasis |
| `.sketchy-circle` | Dashed circle | Badges, callouts |
| `.sketchy-arrow-right` | Hand-drawn arrow | CTAs, links |
| `.sketchy-border` | Tilted border | Cards, playful containers |
| `.sketchy-highlight` | Background highlight | Key phrases |
| `.sketchy-wiggle` | Wiggle on hover | Interactive playful elements |
| `.doodle-stars` | Star pattern | Decorative backgrounds |
| `.doodle-dots` | Dot pattern | Subtle texture |
| `.doodle-scribble` | Scribble lines | Artistic backgrounds |
| `.doodle-dust` | Grain texture | Paper-like feel |
