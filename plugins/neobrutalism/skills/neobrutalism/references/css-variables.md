# CSS Variables Reference

Distilled from epub-manager project base.css.

## Spacing & Layout

```css
--spacing-boxShadowX: 4px;
--spacing-boxShadowY: 4px;
--spacing-reverseBoxShadowX: -4px;
--spacing-reverseBoxShadowY: -4px;
```

## Border Radius

```css
--radius-base: 0px;  /* Sharp corners - ALWAYS */
--radius: 10px;  /* For calculated variants */
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

Note: Components use `rounded-base` which maps to `0px`.

## Color Tokens

### Base Colors
```css
--background: oklch(96.22% 0.0569 95.61);  /* Warm cream */
--secondary-background: oklch(100% 0 0);    /* Pure white */
--foreground: oklch(0% 0 0);                /* Pure black */
```

### Main Accent (Vibrant Yellow)
```css
--main: oklch(84.08% 0.1725 84.2);          /* ~#FFD700 equivalent */
--main-foreground: oklch(0% 0 0);           /* Black text on yellow */
```

### Border & Ring
```css
--border: oklch(0% 0 0);                    /* Black */
--ring: oklch(0% 0 0);                      /* Black focus ring */
```

### Overlay
```css
--overlay: oklch(0% 0 0 / 0.8);             /* 80% black */
```

### Shadow
```css
--shadow: 4px 4px 0px 0px var(--border);    /* Uses border color */
```

## Font Weights

```css
--font-weight-base: 500;     /* Body text */
--font-weight-heading: 800;  /* Headings, labels, buttons */
```

## Font Families

```css
--font-sans: 'Public Sans', ui-sans-serif, system-ui, sans-serif;
--font-title: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
```

## Component Color Mappings

```css
--card: oklch(100% 0 0);
--card-foreground: oklch(0% 0 0);
--popover: oklch(100% 0 0);
--popover-foreground: oklch(0% 0 0);
--primary: oklch(84.08% 0.1725 84.2);
--primary-foreground: oklch(0% 0 0);
--secondary: oklch(96.22% 0.0569 95.61);
--secondary-foreground: oklch(0% 0 0);
--muted: oklch(96.22% 0.0569 95.61);
--muted-foreground: oklch(0% 0 0);
--accent: oklch(84.08% 0.1725 84.2);
--accent-foreground: oklch(0% 0 0);
--destructive: oklch(60% 0.2 25);  /* Red */
--destructive-foreground: oklch(100% 0 0);
--input: oklch(100% 0 0);
```

## Chart Colors

```css
--chart-1: #ffbf00;  /* Amber */
--chart-2: #0099ff;  /* Blue */
--chart-3: #ff7a05;  /* Orange */
--chart-4: #00d696;  /* Teal */
--chart-5: #7a83ff;  /* Purple */
--chart-active-dot: #000;
```

## Tailwind Class Mappings

| CSS Variable | Tailwind Class |
|-------------|----------------|
| `--main` | `bg-main`, `text-main-foreground` |
| `--background` | `bg-background` |
| `--secondary-background` | `bg-secondary-background` |
| `--border` | `border-border` |
| `--shadow` | `shadow-shadow` |
| `--foreground` | `text-foreground` |
| `--overlay` | `bg-overlay` |

## Key Patterns

### Press-Down Interaction
```css
hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none
```

### Elevate-Up Interaction
```css
hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow
```

### Focus Ring
```css
focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
```

## OKLCH Color Space

This project uses OKLCH for better color manipulation:
- `oklch(L C H)` where L=lightness, C=chroma, H=hue
- `oklch(0% 0 0)` = black
- `oklch(100% 0 0)` = white
- Higher chroma = more saturated color
