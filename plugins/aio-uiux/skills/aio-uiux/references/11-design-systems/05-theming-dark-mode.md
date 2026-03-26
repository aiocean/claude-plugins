# Theming and Dark Mode

Dark mode is not simply inverting light mode colors. It requires rethinking contrast, surface layering, saturation, and shadow. A systematic approach using CSS custom properties makes theming maintainable and correct.

## CSS Custom Properties Theming Architecture

### The Three-Layer Approach

```css
/* Layer 1: Primitive values — never used directly in components */
:root {
  --primitive-blue-400: #60a5fa;
  --primitive-blue-600: #2563eb;
  --primitive-blue-700: #1d4ed8;

  --primitive-gray-50:  #f9fafb;
  --primitive-gray-100: #f3f4f6;
  --primitive-gray-200: #e5e7eb;
  --primitive-gray-700: #374151;
  --primitive-gray-800: #1f2937;
  --primitive-gray-900: #111827;
  --primitive-gray-950: #030712;

  --primitive-red-400:  #f87171;
  --primitive-red-600:  #dc2626;
  --primitive-green-400: #4ade80;
  --primitive-green-600: #16a34a;
}

/* Layer 2: Semantic tokens — theme boundary */
/* Light theme (default) */
:root,
[data-theme="light"] {
  --color-primary:           var(--primitive-blue-600);
  --color-primary-hover:     var(--primitive-blue-700);
  --color-primary-subtle:    #eff6ff;

  --color-surface:           #ffffff;
  --color-surface-raised:    var(--primitive-gray-50);
  --color-surface-sunken:    var(--primitive-gray-100);
  --color-surface-overlay:   #ffffff;

  --color-border:            var(--primitive-gray-200);
  --color-border-strong:     #d1d5db;
  --color-border-focus:      var(--primitive-blue-600);

  --color-text-primary:      var(--primitive-gray-900);
  --color-text-secondary:    #6b7280;
  --color-text-disabled:     #9ca3af;
  --color-text-inverse:      #ffffff;
  --color-text-link:         var(--primitive-blue-600);

  --color-danger:            var(--primitive-red-600);
  --color-danger-subtle:     #fef2f2;
  --color-danger-text:       var(--primitive-red-600);

  --color-success:           var(--primitive-green-600);
  --color-success-subtle:    #f0fdf4;

  --color-warning:           #d97706;
  --color-warning-subtle:    #fffbeb;

  --shadow-sm:  0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* Dark theme */
[data-theme="dark"] {
  --color-primary:           var(--primitive-blue-400);   /* lighter on dark bg */
  --color-primary-hover:     #93c5fd;                     /* blue-300 */
  --color-primary-subtle:    #1e3a5f;                     /* dark blue tint */

  --color-surface:           var(--primitive-gray-900);
  --color-surface-raised:    var(--primitive-gray-800);
  --color-surface-sunken:    var(--primitive-gray-950);
  --color-surface-overlay:   var(--primitive-gray-800);

  --color-border:            var(--primitive-gray-700);
  --color-border-strong:     #4b5563;
  --color-border-focus:      var(--primitive-blue-400);

  --color-text-primary:      var(--primitive-gray-50);
  --color-text-secondary:    #9ca3af;                     /* gray-400 */
  --color-text-disabled:     #6b7280;                     /* gray-500 */
  --color-text-inverse:      var(--primitive-gray-900);
  --color-text-link:         var(--primitive-blue-400);

  --color-danger:            var(--primitive-red-400);
  --color-danger-subtle:     #450a0a;
  --color-danger-text:       var(--primitive-red-400);

  --color-success:           var(--primitive-green-400);
  --color-success-subtle:    #052e16;

  --color-warning:           #fbbf24;                     /* amber-400 */
  --color-warning-subtle:    #422006;

  /* Shadows are less visible on dark — increase opacity */
  --shadow-sm:  0 1px 2px rgb(0 0 0 / 0.3);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5);
}
```

## Theme Switching Mechanism

### Initialization (no flash of wrong theme)

```html
<!-- In <head> — blocking script runs before first paint -->
<script>
  (function() {
    const STORAGE_KEY = 'theme';
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let theme;
    if (saved === 'dark' || saved === 'light') {
      theme = saved;
    } else {
      theme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

### React Theme Context

```tsx
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as ThemeMode) ?? 'system';
  });

  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const resolvedTheme = useMemo<'light' | 'dark'>(() => {
    if (mode === 'system') return prefersDark ? 'dark' : 'light';
    return mode;
  }, [mode, prefersDark]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setMode = useCallback((newMode: ThemeMode) => {
    localStorage.setItem('theme', newMode);
    setModeState(newMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

// Theme toggle button
export function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {(['light', 'system', 'dark'] as ThemeMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
            mode === m
              ? 'bg-white shadow-sm dark:bg-gray-700'
              : 'text-gray-500 hover:text-gray-900'
          )}
          aria-pressed={mode === m}
        >
          {m === 'system' ? <ComputerDesktopIcon className="h-4 w-4" /> : m}
        </button>
      ))}
    </div>
  );
}
```

## Dark Mode Implementation Strategies

### Strategy 1: Semantic Token Inversion (Recommended)

All component styles reference semantic tokens. Swap token values per theme. Components require zero dark-mode-specific code.

```css
/* Component never knows about dark mode */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-sm);
}

/* Token layer handles everything */
[data-theme="dark"] {
  --color-surface: #111827;
  --color-border: #374151;
  --color-text-primary: #f9fafb;
}
```

### Strategy 2: Tailwind dark: Modifier

When using Tailwind without CSS custom properties. Verbose but explicit.

```tsx
// Every dark-mode variant must be written manually
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-700
      text-gray-900 dark:text-gray-50
      shadow-sm dark:shadow-md
      rounded-xl p-6
    ">
      {children}
    </div>
  );
}
```

Configure Tailwind to use class strategy:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',  // uses .dark class on <html>
  // or: ['class', '[data-theme="dark"]'] for custom attribute
};
```

### Strategy 3: OKLCH Lightness Adjustment

Generate dark variants programmatically using oklch — flip lightness while preserving hue and chroma.

```css
/* Light palette: L values 40-95 */
:root {
  --blue-500: oklch(55% 0.2 250);   /* L=55 */
  --blue-600: oklch(48% 0.22 250);  /* L=48 */
  --blue-700: oklch(42% 0.22 250);  /* L=42 */
}

/* Dark variants: invert lightness (100 - L) */
:root.dark {
  --blue-500: oklch(75% 0.15 250);  /* L=75, reduced chroma for dark */
  --blue-600: oklch(68% 0.16 250);
  --blue-700: oklch(80% 0.13 250);
}
```

```javascript
// Programmatic dark palette generation
function invertLightness(oklchColor: string): string {
  // Parse oklch(L% C H) and invert L
  const match = oklchColor.match(/oklch\((\d+\.?\d*)%\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return oklchColor;

  const [, L, C, H] = match;
  const darkL = 100 - parseFloat(L);
  // Reduce chroma slightly on dark (saturated colors look harsh on dark)
  const darkC = parseFloat(C) * 0.85;

  return `oklch(${darkL}% ${darkC.toFixed(3)} ${H})`;
}
```

## Background Layering in Dark Mode

Dark UI uses multiple surface tones to convey elevation. Unlike light mode (shadows), dark mode uses lighter fills for raised elements.

```css
/* Dark mode elevation via lightness — not shadows */
[data-theme="dark"] {
  /* Base canvas */
  --surface-0: #0f1117;       /* Page background — deepest */

  /* Cards, panels at rest */
  --surface-1: #161b22;       /* +1 level */

  /* Hovered cards, focused inputs */
  --surface-2: #1c2128;       /* +2 levels */

  /* Dropdowns, tooltips, popovers */
  --surface-3: #22272e;       /* +3 levels */

  /* Modal overlays */
  --surface-4: #2d333b;       /* +4 levels */
}

/* Light mode uses shadows instead */
:root {
  --surface-0: #f6f8fa;
  --surface-1: #ffffff;
  --surface-2: #ffffff;        /* shadow distinguishes, not fill */
  --surface-3: #ffffff;
  --surface-4: #ffffff;

  --shadow-1: 0 1px 3px rgb(0 0 0 / 0.1);
  --shadow-2: 0 4px 6px rgb(0 0 0 / 0.1);
  --shadow-3: 0 10px 15px rgb(0 0 0 / 0.1);
}
```

```tsx
// Elevation-aware card
function Card({
  elevation = 1,
  children,
}: {
  elevation?: 0 | 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: `var(--surface-${elevation})`,
        boxShadow: `var(--shadow-${elevation}, none)`,
      }}
      className="rounded-xl border border-[var(--color-border)] p-6"
    >
      {children}
    </div>
  );
}
```

## Contrast Maintenance in Dark Mode

WCAG AA requires 4.5:1 for body text, 3:1 for large text. Dark mode fails silently — test contrast explicitly.

```typescript
// Contrast checking utility
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.04045
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Test your dark mode token pairs
const darkModeContrasts = {
  'text-primary on surface':    getContrastRatio('#f9fafb', '#111827'), // should be > 4.5
  'text-secondary on surface':  getContrastRatio('#9ca3af', '#111827'), // should be > 4.5
  'primary on surface':         getContrastRatio('#60a5fa', '#111827'), // links
  'danger on danger-subtle':    getContrastRatio('#f87171', '#450a0a'),
};
```

### Common Dark Mode Contrast Pitfalls

```css
/* Problem: Direct light-to-dark inversion makes saturated colors too vibrant */
/* Light: blue-600 #2563eb on white — contrast 4.7:1 ✓ */
/* Dark (wrong): blue-600 #2563eb on gray-900 — contrast 2.8:1 ✗ */
/* Dark (correct): blue-400 #60a5fa on gray-900 — contrast 5.2:1 ✓ */

/* Problem: Gray text fails on dark surfaces */
/* Light: gray-500 #6b7280 on white — 4.6:1 ✓ */
/* Dark (wrong): gray-500 #6b7280 on gray-900 — 3.0:1 ✗ */
/* Dark (correct): gray-400 #9ca3af on gray-900 — 4.7:1 ✓ */
```

## Image and Media Handling in Dark Mode

```css
/* Reduce brightness of bright images in dark mode */
[data-theme="dark"] img:not([data-no-dim]) {
  filter: brightness(0.85) contrast(1.05);
}

/* Invert black logos/icons to white */
[data-theme="dark"] .logo-dark-invert {
  filter: invert(1);
}

/* SVG icons that need theme-aware colors */
.icon-themed {
  color: var(--color-text-secondary);
  /* SVG currentColor inherits this */
}

/* Dark mode border on images (avoids bleeding into dark bg) */
[data-theme="dark"] img {
  border-color: var(--color-border);
}
```

```tsx
// Theme-aware image component
function ThemedImage({
  light,
  dark,
  alt,
  ...props
}: {
  light: string;
  dark: string;
  alt: string;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const { resolvedTheme } = useTheme();

  return (
    <img
      src={resolvedTheme === 'dark' ? dark : light}
      alt={alt}
      {...props}
    />
  );
}

// Usage: brand logo that differs per theme
<ThemedImage
  light="/logo-black.svg"
  dark="/logo-white.svg"
  alt="Acme Inc."
  className="h-8"
/>
```

## prefers-color-scheme Integration

```css
/* Base: respect OS preference without JavaScript */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-surface:       #111827;
    --color-surface-raised: #1f2937;
    --color-text-primary:  #f9fafb;
    --color-text-secondary: #9ca3af;
    --color-border:        #374151;
    --color-primary:       #60a5fa;
  }
}

/* Explicit override always wins (user manually chose theme) */
[data-theme="light"] {
  --color-surface:        #ffffff;
  --color-text-primary:   #111827;
  /* etc. */
}

[data-theme="dark"] {
  --color-surface:        #111827;
  --color-text-primary:   #f9fafb;
  /* etc. */
}
```

## User Preference Persistence

```typescript
// useTheme hook with localStorage + system sync
export function useThemePersistence() {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as any) ?? 'system';
  });

  // Persist to localStorage
  const setTheme = useCallback((newTheme: typeof theme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);

    const root = document.documentElement;
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', newTheme);
    }
  }, []);

  // Sync with OS changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme };
}
```

## Complete Dark Mode Token Reference

```css
/* Full token set — copy and extend for your design system */
[data-theme="dark"] {
  /* Surfaces (elevation order: darkest to lightest) */
  --surface-page:      #0d1117;
  --surface-default:   #161b22;
  --surface-raised:    #1c2128;
  --surface-overlay:   #22272e;

  /* Interactive surfaces */
  --surface-hover:     #2d333b;
  --surface-active:    #373e47;
  --surface-selected:  #1f3a5f;

  /* Brand */
  --color-primary:         #58a6ff;
  --color-primary-hover:   #79c0ff;
  --color-primary-subtle:  #0d1f38;
  --color-primary-muted:   #162033;

  /* Text */
  --text-primary:    #e6edf3;
  --text-secondary:  #8b949e;
  --text-tertiary:   #6e7681;
  --text-disabled:   #484f58;
  --text-inverse:    #0d1117;
  --text-link:       #58a6ff;
  --text-link-hover: #79c0ff;

  /* Borders */
  --border-default:  #30363d;
  --border-muted:    #21262d;
  --border-strong:   #8b949e;
  --border-focus:    #58a6ff;

  /* Semantic status */
  --color-danger:         #f85149;
  --color-danger-subtle:  #3d0a08;
  --color-success:        #3fb950;
  --color-success-subtle: #0a2a12;
  --color-warning:        #d29922;
  --color-warning-subtle: #2a1d02;
  --color-info:           #58a6ff;
  --color-info-subtle:    #0d1f38;

  /* Shadows (heavier opacity on dark) */
  --shadow-sm: 0 1px 3px rgb(1 4 9 / 0.4);
  --shadow-md: 0 3px 6px rgb(1 4 9 / 0.4), 0 8px 24px rgb(1 4 9 / 0.4);
  --shadow-lg: 0 8px 24px rgb(1 4 9 / 0.6), 0 16px 48px rgb(1 4 9 / 0.6);
  --shadow-xl: 0 24px 48px -12px rgb(1 4 9 / 0.7);
}
```
