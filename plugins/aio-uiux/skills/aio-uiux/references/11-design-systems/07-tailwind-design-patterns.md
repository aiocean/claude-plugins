# Tailwind CSS Design Patterns

Tailwind is a utility-first CSS framework that functions as a design system substrate. Used correctly, it enforces consistent spacing, color, and typography through constrained utility classes. Used poorly, it becomes a mess of arbitrary values and conflicting overrides.

---

## Tailwind as a Design System

Tailwind's default configuration ships with a complete design token set: a spacing scale, a color palette, a type scale, breakpoints, and shadow values. These defaults are the foundation of the design system. Customizing them in `tailwind.config` extends or replaces that foundation.

### The Config as Single Source of Truth

```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9ff',
          500: '#0284c7',
          900: '#0c4a6e',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#f8fafc',
          subtle:  '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        lg: '0.75rem',
        xl: '1rem',
      },
    },
  },
}
```

All design decisions live here. Components consume tokens, never arbitrary values.

---

## cva (Class Variance Authority) for Variants

`cva` solves the problem of managing variant-based class combinations without string concatenation chaos.

### Without cva (fragile)

```tsx
const buttonClass = `
  px-4 py-2 rounded font-medium
  ${variant === 'primary' ? 'bg-brand-500 text-white' : ''}
  ${variant === 'secondary' ? 'bg-surface text-gray-900 border' : ''}
  ${size === 'sm' ? 'text-sm px-3 py-1.5' : ''}
  ${size === 'lg' ? 'text-lg px-6 py-3' : ''}
  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
`
```

### With cva (structured)

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

const button = cva(
  // Base classes applied always
  'inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
  {
    variants: {
      variant: {
        primary:   'bg-brand-500 text-white hover:bg-brand-600',
        secondary: 'bg-surface border border-gray-200 text-gray-900 hover:bg-surface-muted',
        ghost:     'text-gray-700 hover:bg-surface-muted',
        danger:    'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm:  'text-sm px-3 py-1.5 h-8',
        md:  'text-sm px-4 py-2 h-10',
        lg:  'text-base px-6 py-3 h-12',
      },
    },
    compoundVariants: [
      // Applies when both variant=primary AND size=sm
      { variant: 'primary', size: 'sm', class: 'font-semibold' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

// Usage
type ButtonProps = VariantProps<typeof button> & React.ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={button({ variant, size, className })} {...props} />
}
```

Benefits:
- All variants explicitly declared — no hidden states
- TypeScript types generated automatically from variant keys
- Easy to audit, extend, and review
- Compound variants handle cross-variant combinations cleanly

---

## tailwind-merge

`tailwind-merge` (twMerge) resolves conflicts when two Tailwind classes target the same CSS property.

### The Problem

```tsx
// Without twMerge: both classes apply, last one wins in the cascade
// But Tailwind doesn't guarantee declaration order!
<Button className="bg-red-500" />
// Button internally has bg-brand-500 — which wins?
```

### The Solution

```tsx
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

// Canonical helper (used everywhere in the codebase)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage: cn resolves conflicts intelligently
cn('px-4 py-2', 'px-6')     // → 'py-2 px-6' (px-6 wins)
cn('bg-blue-500', 'bg-red-500') // → 'bg-red-500'
cn('text-sm font-bold', 'text-lg') // → 'font-bold text-lg'
```

### Always Use cn() for Class Merging

Every component that accepts a `className` prop should pass it through `cn()`:

```tsx
export function Card({ className, ...props }) {
  return (
    <div className={cn('rounded-lg border bg-surface p-6', className)} {...props} />
  )
}
```

---

## Dark Mode

Tailwind's `dark:` variant enables dark mode styling. Two strategies:

### Strategy 1: Media Query (system preference)

```js
// tailwind.config.ts
export default {
  darkMode: 'media', // uses prefers-color-scheme
}
```

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### Strategy 2: Class-Based (user toggle)

```js
// tailwind.config.ts
export default {
  darkMode: 'class', // .dark class on <html>
}
```

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark')
```

Class-based is preferred for apps with a manual dark/light toggle.

### Design Token Approach (recommended)

Rather than sprinkling `dark:` everywhere, define semantic color tokens that switch automatically:

```js
// tailwind.config.ts
colors: {
  background: 'var(--color-background)',
  foreground: 'var(--color-foreground)',
  muted:      'var(--color-muted)',
}
```

```css
/* globals.css */
:root {
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted:      #f1f5f9;
}

.dark {
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
  --color-muted:      #1e293b;
}
```

```html
<div class="bg-background text-foreground">
  <!-- No dark: variants needed — tokens switch automatically -->
</div>
```

This approach means your components contain zero dark mode–specific classes.

---

## Custom Tokens and Extending the Theme

### When to Extend vs. Override

`theme.extend` adds to existing scales. `theme` (without extend) replaces them.

```js
// GOOD: extend adds brand colors alongside Tailwind defaults
theme: {
  extend: {
    colors: { brand: { ... } }
  }
}

// RISKY: replaces entire color palette with only your colors
theme: {
  colors: { brand: { ... } }
}
```

Generally extend; only replace when you want to enforce strict design token usage and prevent access to default colors.

### Semantic Color Naming

```js
colors: {
  // Semantic names, not visual names
  primary:     { DEFAULT: '#0284c7', hover: '#0369a1', ... },
  destructive: { DEFAULT: '#dc2626', hover: '#b91c1c', ... },
  success:     { DEFAULT: '#16a34a' },
  warning:     { DEFAULT: '#d97706' },
}
```

Using semantic names (`bg-primary` instead of `bg-blue-500`) means changing the brand color requires one config change, not a global find-and-replace.

---

## The @apply Debate

`@apply` lets you extract utility combinations into CSS classes:

```css
.btn-primary {
  @apply px-4 py-2 bg-brand-500 text-white rounded font-medium hover:bg-brand-600;
}
```

### When @apply Is Acceptable

- Component libraries where class strings would be consumed by external users
- Markdown-rendered content (blog posts, docs) where you can't add classes to HTML
- Base element styles in `@layer base`

### Why @apply Is Usually a Mistake

- Defeats the purpose of utility-first (you're back to writing custom CSS)
- Creates hidden dependencies (the CSS file now couples to the config)
- Can't use variants like `dark:`, `hover:`, `focus:` reliably in @apply
- Makes the class string invisible in component source — harder to audit

**Preferred approach**: Use `cva` + `cn()` in component files. Keep styling logic in the JavaScript layer where it's visible, typed, and tree-shakeable.

---

## Practical Patterns

### Responsive Variants

```html
<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col md:flex-row gap-4">

<!-- Hide on mobile, show on desktop -->
<nav class="hidden md:flex">

<!-- Full-width on mobile, fixed width on desktop -->
<div class="w-full lg:w-80">
```

### Focus Visible (Accessibility)

```html
<button class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
```

Always use `focus-visible:` not `focus:` — `focus-visible` only shows the ring for keyboard navigation, not mouse clicks.

### Peer and Group Modifiers

```html
<!-- Group: parent hover affects child -->
<div class="group">
  <img class="grayscale group-hover:grayscale-0 transition" />
  <p class="opacity-0 group-hover:opacity-100 transition">Caption</p>
</div>

<!-- Peer: sibling state affects another sibling -->
<input type="checkbox" class="peer" />
<label class="hidden peer-checked:block">Checked!</label>
```

### Container Queries (Tailwind v4 / plugin)

```html
<div class="@container">
  <div class="grid @md:grid-cols-2 @lg:grid-cols-3">
```

Prefer container queries over breakpoints for reusable components that appear in different layout contexts.

---

## Quick Reference

- **Config is the design system**: define all tokens in `tailwind.config.ts`, never use arbitrary `[values]` for design decisions
- **cva for variants**: structured, typed, auditable component variant management
- **tailwind-merge**: always merge with `cn()` when accepting external `className` props
- **Dark mode**: class-based strategy + CSS custom properties approach eliminates all `dark:` from components
- **Semantic tokens**: name by intent (`primary`, `destructive`) not appearance (`blue-500`)
- **Avoid @apply**: use cva and cn() instead; keep styling in JS where it's typed and visible
- **focus-visible not focus**: keyboard ring only, no mouse-click ring
- **group/peer modifiers**: powerful for hover-reveal patterns without JavaScript
