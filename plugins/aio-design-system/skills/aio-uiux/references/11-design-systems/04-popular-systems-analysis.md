# Popular Design Systems Analysis

Each major design system solved specific problems for its organization. Understanding what each one got right — and where it struggled — lets you extract best-of-breed patterns without inheriting their constraints.

## Material Design 3 (Google)

**Core philosophy:** Expressive, adaptive, and personal. MD3 introduced dynamic color derived from the user's wallpaper.

### Systematic Color: The Tonal Palette

MD3 generates a complete color system from a single seed color using HCT (Hue, Chroma, Tone) color space.

```
Seed color → Tonal Palette → Color Roles → Components

Primary (40)       → button bg, FAB
On Primary (100)   → text on primary
Primary Container (90) → chip bg, selected state
On Primary Container (10) → text in container
Surface (98)       → card bg, page bg
Surface Variant (90) → input bg, chip outline
On Surface (10)    → body text
On Surface Variant (30) → secondary text, icons
Outline (50)       → border, divider
```

**What to steal:** Role-based color naming. Instead of naming by hue (`blue-600`), name by role (`primary`, `on-primary`, `primary-container`). Roles survive theme changes; hues don't.

```css
/* MD3-style semantic tokens */
:root {
  --md-sys-color-primary: #6750a4;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #eaddff;
  --md-sys-color-on-primary-container: #21005d;
  --md-sys-color-surface: #fef7ff;
  --md-sys-color-on-surface: #1c1b1f;
  --md-sys-color-surface-variant: #e7e0ec;
  --md-sys-color-on-surface-variant: #49454f;
  --md-sys-color-outline: #79747e;
}
```

### Motion: The Emphasis System

MD3 defines motion by emphasis level — not arbitrary durations.

```
Spatial (enter/exit): Emphasized decelerate / Emphasized accelerate
  Duration: 400ms / 200ms
  Easing: cubic-bezier(0.05, 0.7, 0.1, 1.0) / cubic-bezier(0.3, 0, 0.8, 0.15)

Transitions (state changes): Standard / Standard decelerate / Standard accelerate
  Duration: 300ms
  Easing: cubic-bezier(0.2, 0, 0, 1.0)

Short (icon morphing, check states): 100–200ms
```

### Adaptive Layout: Canonical Layouts

MD3 provides canonical layout patterns for phone/tablet/desktop breakpoints:

- **List-Detail:** List panel collapses on phone, side-by-side on tablet+
- **Supporting Panel:** Sheet on phone becomes persistent panel on desktop
- **Feed:** Single-column phone → multi-column grid on larger screens

---

## Apple Human Interface Guidelines

**Core philosophy:** Three principles — Clarity, Deference, Depth.

- **Clarity:** Text is legible, icons precise, adornment subtle. UI calls attention to content.
- **Deference:** UI serves content. Fluid motion and crisp interface help people understand without competing with content.
- **Depth:** Distinct visual layers establish hierarchy and communicate context.

### What to Steal: SF Symbols System

Apple's SF Symbols (~6000 icons) are designed to optically match SF Pro text at all weights. The lesson: **icons and typography should share a weight system.**

```tsx
// Apply this principle: icon weight matches text weight
function MenuItem({ icon: Icon, label, active }: MenuItemProps) {
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2 rounded-lg', active && 'bg-gray-100')}>
      {/* Icon weight (stroke-width) matches text weight */}
      <Icon className={cn('h-5 w-5', active ? 'stroke-[2.5]' : 'stroke-2')} />
      <span className={cn('text-sm', active ? 'font-semibold' : 'font-normal')}>{label}</span>
    </div>
  );
}
```

### What to Steal: Vibrancy and Materials

iOS layering system — content behind blurred glass maintains context:

```css
/* Frosted glass — the Apple material */
.glass-surface {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.glass-surface-dark {
  background: rgba(30, 30, 30, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### What to Steal: Generous Touch Targets

Minimum 44×44pt touch target even when visual size is smaller. Apply gap/padding to achieve this without visual bulk.

```css
.icon-button {
  /* Visual size: 20px icon */
  width: 20px;
  height: 20px;
  /* Touch target: 44px */
  padding: 12px;
  margin: -12px;
}
```

---

## Microsoft Fluent Design System

**Core philosophy:** Coherent, familiar, inclusive across Windows, web, and Microsoft 365.

### What to Steal: Acrylic (Layered Depth)

Fluent's depth model uses layered canvases. Background → Base → Overlay → Flyout — each layer has a defined color and blur.

```css
/* Fluent depth layers */
.fluent-background { background: #f3f3f3; }
.fluent-base       { background: #ffffff; }
.fluent-overlay    { background: rgba(255,255,255,0.7); backdrop-filter: blur(40px); }
.fluent-flyout     { background: #ffffff; box-shadow: 0 8px 16px rgba(0,0,0,0.14); }
```

### What to Steal: Focus Visible System

Fluent's high-contrast mode support is exceptional. Double-ring focus indicator works on any background:

```css
/* Fluent-style focus: inner white ring + outer brand ring */
:focus-visible {
  outline: 2px solid transparent;
  box-shadow:
    0 0 0 2px #ffffff,
    0 0 0 4px #0078d4;
}

/* High contrast mode support */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid ButtonText;
    outline-offset: 2px;
  }
}
```

### What to Steal: Adaptive Color Tokens

Fluent maps semantic tokens to system colors in high-contrast mode, enabling automatic accessibility:

```css
.button-primary {
  background: var(--colorBrandBackground);
  color: var(--colorNeutralForegroundOnBrand);
}

@media (forced-colors: active) {
  .button-primary {
    background: ButtonFace;
    color: ButtonText;
    border: 1px solid ButtonText;
    forced-color-adjust: none;
  }
}
```

---

## IBM Carbon Design System

**Core philosophy:** Open, modular, consistent. Built for complex enterprise software (data dashboards, admin tools, dev tools).

### What to Steal: The 2x Grid

Carbon's grid is built on a base unit of 8px with a 2x column grid that snaps to 16px gutters. Content regions are always multiples of 16px wide.

```css
.carbon-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);  /* 16 columns on large screens */
  gap: 1rem;                                /* 16px gutter */
  padding: 0 1rem;
}

/* Spans */
.col-span-4  { grid-column: span 4; }   /* 25% */
.col-span-8  { grid-column: span 8; }   /* 50% */
.col-span-12 { grid-column: span 12; }  /* 75% */
.col-span-16 { grid-column: span 16; }  /* 100% */
```

### What to Steal: Type Scale with Expressive vs Productive

Carbon splits typography into two modes:
- **Productive:** Tight leading, smaller sizes — for UI chrome, data tables, forms
- **Expressive:** Looser leading, larger sizes — for marketing, hero sections, editorial

```css
/* Productive styles — UI work */
.productive-heading-01 { font-size: 0.875rem; line-height: 1.25rem; font-weight: 600; }
.productive-heading-02 { font-size: 1rem;     line-height: 1.375rem; font-weight: 600; }
.body-compact-01       { font-size: 0.875rem; line-height: 1.125rem; }

/* Expressive styles — content/marketing */
.expressive-heading-03 { font-size: 1.25rem;  line-height: 1.625rem; font-weight: 400; }
.expressive-heading-05 { font-size: 2rem;     line-height: 2.5rem;   font-weight: 300; }
```

---

## Primer (GitHub)

**Core philosophy:** Practical, minimal, opinionated. Solves GitHub's specific UI problems.

### What to Steal: Functional Color Tokens

Primer's color system is explicitly functional — tokens encode their exact use case:

```css
/* Primer-style functional tokens */
:root {
  --color-fg-default:       #1F2328;
  --color-fg-muted:         #656d76;
  --color-fg-subtle:        #6e7781;
  --color-fg-on-emphasis:   #ffffff;

  --color-canvas-default:   #ffffff;
  --color-canvas-subtle:    #f6f8fa;
  --color-canvas-inset:     #f0f6fc;   /* code blocks, recessed areas */
  --color-canvas-overlay:   #ffffff;   /* dropdowns, modals */

  --color-border-default:   #d0d7de;
  --color-border-muted:     #d8dee4;
  --color-border-subtle:    rgba(27,31,36,0.15);

  --color-accent-fg:        #0969da;   /* links, selected state */
  --color-accent-emphasis:  #0969da;   /* badges, labels */
  --color-accent-muted:     rgba(84,174,255,0.4);
  --color-accent-subtle:    #ddf4ff;   /* bg for accent content */
}
```

### What to Steal: ActionList Pattern

GitHub's `ActionList` is their universal list primitive — used in dropdowns, command palette, sidebar nav, context menus. One component, many contexts:

```tsx
// Reusable list pattern for all menu/dropdown contexts
function ActionList({ children }: { children: React.ReactNode }) {
  return <ul role="listbox" className="py-1">{children}</ul>;
}

function ActionListItem({
  leadingIcon: Icon,
  trailingIcon: TrailingIcon,
  description,
  selected,
  variant = 'default',
  onSelect,
  children,
}: ActionListItemProps) {
  return (
    <li
      role="option"
      aria-selected={selected}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer rounded-md mx-1',
        variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'hover:bg-gray-100',
        selected && 'bg-blue-50 font-medium'
      )}
      onClick={onSelect}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-gray-500" />}
      <div className="flex-1 min-w-0">
        <span className="truncate">{children}</span>
        {description && <p className="text-xs text-gray-500 truncate">{description}</p>}
      </div>
      {TrailingIcon && <TrailingIcon className="h-4 w-4 shrink-0 text-gray-400" />}
      {selected && <CheckIcon className="h-4 w-4 shrink-0 text-blue-600" />}
    </li>
  );
}
```

---

## shadcn/ui

**Core philosophy:** Not a component library — a collection of reusable components you copy into your codebase and own. Built on Radix + Tailwind.

### What to Steal: The Copy-Paste Model

shadcn's key insight: instead of installing a black-box npm package, you own the source. No version conflicts, no breaking change anxiety, full customization freedom.

```bash
# Add a component — copies source into your project
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add data-table
```

### What to Steal: cn() Utility

The `cn` utility merges Tailwind classes intelligently (tailwind-merge) with conditional class logic (clsx):

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Resolves conflicts: later class wins
cn('px-4 py-2', 'px-6')     // → 'py-2 px-6' (not 'px-4 py-2 px-6')
cn('text-red-500', condition && 'text-blue-500')  // conditional
```

### What to Steal: Component File Structure

```typescript
// Each component in one file: variants + types + component
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary text-primary-foreground',
        secondary:   'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline:     'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

---

## Radix UI

**Core philosophy:** Headless, accessible, unstyled primitives. WAI-ARIA compliant out of the box.

### What to Steal: Accessibility by Default

Radix handles the hardest parts of component accessibility so you don't have to:
- Focus trapping in modals/dialogs
- Roving tabindex in menus/radio groups
- aria-expanded, aria-selected, aria-controls wiring
- Keyboard navigation (arrow keys, escape, enter)
- Screen reader announcements

```tsx
// You get all of this for free:
import * as Dialog from '@radix-ui/react-dialog';

function ConfirmDialog({ onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="danger">Delete</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl w-full max-w-md"
          // Focus trapped inside, escape closes, aria-modal set automatically
        >
          <Dialog.Title className="text-lg font-semibold">Confirm deletion</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-600">
            This action cannot be undone.
          </Dialog.Description>
          <div className="mt-6 flex gap-3 justify-end">
            <Dialog.Close asChild>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </Dialog.Close>
            <Button variant="danger" onClick={onConfirm}>Delete</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Chakra UI

**Core philosophy:** Prop-driven styling with a built-in theme. Style props directly on components.

### What to Steal: Responsive Prop Arrays

Chakra's responsive shorthand is elegant — array values map to breakpoints:

```tsx
// [mobile, tablet, desktop] — concise responsive values
<Box
  fontSize={['sm', 'md', 'lg']}
  px={[4, 6, 8]}
  columns={[1, 2, 3]}
/>
```

Implement this pattern with Tailwind:

```tsx
// Utility to generate responsive classes from array
function responsive(
  values: string[],
  prefix: string,
  breakpoints = ['', 'sm:', 'md:', 'lg:']
): string {
  return values
    .map((v, i) => `${breakpoints[i]}${prefix}-${v}`)
    .join(' ');
}

// Usage
<div className={cn(
  responsive(['text-sm', 'text-base', 'text-lg'], 'text'),
  responsive(['px-4', 'px-6', 'px-8'], 'px')
)} />
```

---

## Best-of-Breed Summary

| System | Steal This |
|---|---|
| Material Design 3 | Role-based color tokens, motion emphasis levels |
| Apple HIG | Icon-text weight alignment, generous touch targets, glass materials |
| Fluent | Double-ring focus, forced-colors media query support |
| Carbon / IBM | 2x8px grid, productive vs expressive typography split |
| Primer / GitHub | Functional token naming, ActionList universal list pattern |
| shadcn/ui | Copy-paste ownership model, cn() utility, cva-based variants |
| Radix UI | Headless accessibility primitives, keyboard/aria handled for free |
| Chakra UI | Responsive prop arrays, prop-driven styling philosophy |

## Anti-Patterns to Avoid from Each

- **MD3:** Don't blindly adopt dynamic color — it requires full HCT toolchain and breaks brand guidelines
- **Apple HIG:** Don't translate iOS patterns directly to web (bottom sheets, back-swipe gestures feel wrong on desktop)
- **Fluent:** Don't carry over Windows-specific metaphors (ribbons, mica) into web contexts
- **Carbon:** Grid complexity is designed for enterprise dashboards — overkill for marketing sites
- **Primer:** Token naming is too GitHub-specific (`canvas-inset`, `accent-emphasis`) for general use without renaming
- **shadcn:** Copy-paste means you own updates — pin Radix versions carefully to avoid divergence
- **Radix:** Zero styles means every component needs styling work — factor this into estimates
- **Chakra:** Style props leak styling concerns into JSX, making large codebases hard to audit visually
