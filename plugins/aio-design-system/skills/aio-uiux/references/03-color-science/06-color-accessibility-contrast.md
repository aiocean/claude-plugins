# Color Accessibility and Contrast

Color contrast is the single most impactful accessibility improvement you can make. It affects everyone — users in bright sunlight, on low-quality displays, with aging eyes, or with permanent vision differences. Getting it right is non-negotiable.

---

## WCAG 2.2 Contrast Requirements

WCAG (Web Content Accessibility Guidelines) defines contrast ratios using relative luminance. The formula compares the brightness of the foreground against the background.

### Contrast Ratio Thresholds

| Context | AA Minimum | AAA Enhanced |
|---------|-----------|--------------|
| Normal text (< 18pt / < 14pt bold) | **4.5:1** | 7:1 |
| Large text (≥ 18pt / ≥ 14pt bold) | **3:1** | 4.5:1 |
| UI components (borders, icons, focus rings) | **3:1** | — |
| Decorative elements | No requirement | — |
| Disabled/inactive elements | No requirement | — |
| Logotypes | No requirement | — |

**18pt = 24px. 14pt bold = approximately 18.67px bold.**

### What "Large Text" Actually Means

```css
/* Large text — 3:1 minimum applies */
h1, h2 { font-size: 24px; }                    /* 18pt — large */
.stat-value { font-size: 20px; font-weight: 700; } /* 14pt bold — large */

/* Normal text — 4.5:1 minimum applies */
p, li, td { font-size: 16px; }                 /* 12pt — normal */
.caption { font-size: 13px; }                  /* 10pt — normal */
.btn-label { font-size: 14px; font-weight: 600; } /* Just under 14pt bold threshold */
```

### UI Component Contrast

The 3:1 threshold applies to the visual boundary of interactive components — not their fill or label, but the edge that defines them.

```css
/* Input border must be 3:1 against its background */
.input {
  border: 1.5px solid #767676; /* #767676 on #fff = 4.48:1 — passes 3:1 */
  background: #ffffff;
  color: #111827; /* 4.5:1+ for the typed text */
}

/* Focus ring must be 3:1 against adjacent colors */
.input:focus {
  outline: 3px solid #2563eb; /* Blue on white = 8.6:1 — clear */
  outline-offset: 2px;
}

/* Icon-only button: the icon itself must be 3:1 */
.icon-btn svg {
  color: #595959; /* 7.0:1 on white — passes */
}
```

---

## Calculating Contrast Ratio

The WCAG formula:

```
Relative Luminance (L) = 0.2126 × R + 0.7152 × G + 0.0722 × B
(where R, G, B are linearized: c/12.92 if c ≤ 0.04045, else ((c+0.055)/1.055)^2.4)

Contrast Ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

In practice, use tools:
- **webaim.org/resources/contrastchecker** — paste hex values
- **whocanuse.com** — shows pass/fail across user types
- **browser DevTools** — hover a color in the CSS panel to see its contrast ratio
- **Figma** — contrast plugin or built-in accessibility check

```javascript
// Programmatic check (useful in design tokens validation)
function getLuminance(hex) {
  const rgb = parseInt(hex.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;
  const toLinear = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

contrastRatio('#2563eb', '#ffffff'); // → 8.59 — passes all thresholds
contrastRatio('#9ca3af', '#ffffff'); // → 2.85 — fails everything
```

---

## APCA: The Next Standard

APCA (Advanced Perceptual Contrast Algorithm) is the contrast model developed for WCAG 3.0. It is more nuanced than the WCAG 2.x formula — it accounts for font size, weight, and the direction of contrast (light-on-dark differs from dark-on-light).

### Key Differences from WCAG 2.x

| Aspect | WCAG 2.x | APCA |
|--------|----------|------|
| Metric | Contrast ratio (1:1 to 21:1) | Lc value (-108 to +106) |
| Font weight | Not considered | Central to the model |
| Polarity | Symmetric | Asymmetric (light-on-dark ≠ dark-on-light) |
| Status | Current standard | Draft / future standard |

### APCA Minimum Lc Values (Approximate)

| Use Case | Minimum Lc |
|----------|-----------|
| Body text (16px, 400 weight) | Lc 75 |
| Large text (24px, 400) | Lc 60 |
| Bold body (16px, 700) | Lc 60 |
| UI labels / secondary (14px, 600) | Lc 60 |
| Placeholder / decorative | Lc 30 |

```
APCA tool: https://www.myndex.com/APCA/
Bridgepca for WCAG2 bridge: https://www.myndex.com/BPCA/
```

**Current recommendation:** Meet WCAG 2.2 for compliance. Use APCA as an additional design tool for nuanced decisions about type size and weight.

---

## Color Blindness Types and Accommodation

Approximately 8% of males and 0.5% of females have some form of color vision deficiency.

| Type | Prevalence | What's Affected |
|------|-----------|-----------------|
| Deuteranopia / Deuteranomaly | ~5% males | Red-green (green receptor) |
| Protanopia / Protanomaly | ~2% males | Red-green (red receptor) |
| Tritanopia | <0.01% | Blue-yellow |
| Achromatopsia | Rare | All color (sees only luminance) |

### What Red-Green Color Blindness Looks Like

Red and green appear as similar shades of brown/yellow. This breaks:
- Success (green) vs error (red) states
- "Red for bad, green for good" dashboards
- Traffic-light status indicators
- Charts using red and green as opposing categories

### Accommodation Strategies

**1. Never use color alone as the sole differentiator.**

```html
<!-- Bad: color is the only difference -->
<span class="status-dot status-success"></span>
<span class="status-dot status-error"></span>

<!-- Good: color + icon + text -->
<span class="status success">
  <svg aria-hidden="true"><!-- checkmark icon --></svg>
  <span>Active</span>
</span>
<span class="status error">
  <svg aria-hidden="true"><!-- x icon --></svg>
  <span>Failed</span>
</span>
```

**2. Use shape, pattern, and texture in addition to color.**

```css
/* Chart bars: color + pattern */
.bar-series-1 { fill: #2563eb; }
.bar-series-2 {
  fill: #16a34a;
  /* Pattern overlay for deuteranopia users */
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    rgba(255,255,255,0.3) 2px,
    rgba(255,255,255,0.3) 4px
  );
}
```

**3. Ensure sufficient luminance contrast between adjacent colors.**

Even if two colors look different to full-color vision, if their luminance is similar, deuteranopia collapses them to the same shade.

```css
/* Bad: red and green at similar luminance */
.success { color: #22c55e; } /* luminance: 0.445 */
.error   { color: #ef4444; } /* luminance: 0.215 */
/* Similar enough to be confused */

/* Better: separate luminance more deliberately */
.success { color: #15803d; } /* darker green — luminance: 0.107 */
.error   { color: #ef4444; } /* luminance: 0.215 */
/* Or use icon + text labels as primary differentiators */
```

**4. Test with simulation tools.**
- Figma: View > Color Blindness Simulation
- Chrome DevTools: Rendering tab > Emulate vision deficiencies
- macOS: Accessibility Inspector

---

## Never Rely on Color Alone

WCAG 1.4.1 (Level A) states: "Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element."

### Common Violations

```html
<!-- Violation: required field marked only by red asterisk color -->
<label>Email <span style="color: red">*</span></label>

<!-- Fix: text explains it -->
<label>Email <span class="required" aria-label="required">*</span></label>
<p class="form-note">Fields marked with * are required</p>
```

```css
/* Violation: link distinguished from body text only by color */
p a { color: #2563eb; } /* No underline — fails if user can't see blue */

/* Fix: underline (or other non-color indicator) */
p a {
  color: #2563eb;
  text-decoration: underline; /* Passes 1.4.1 */
}
/* Or: bold + color */
p a {
  color: #1d4ed8;
  font-weight: 600;
}
```

```html
<!-- Violation: chart legend with color swatches only -->
<li><span class="swatch" style="background:#2563eb"></span> Revenue</li>

<!-- Fix: pattern or label on the chart element itself -->
<li>
  <span class="swatch pattern-solid" style="background:#2563eb"></span>
  Revenue
</li>
```

---

## High Contrast Mode

Windows High Contrast Mode (now called "Forced Colors") overrides your CSS colors with system colors. The browser fires the `forced-colors: active` media query.

### Forced Colors Behavior

When forced colors is active:
- Background and text colors are replaced with system values
- CSS `background-image` gradients are removed
- Box shadows are removed
- Borders on interactive elements are preserved (if they existed)
- `color: transparent` becomes visible black

### Writing Forced-Colors-Resilient CSS

```css
/* Ensure interactive elements have borders so they remain visible */
.btn {
  border: 2px solid transparent; /* Transparent normally, preserved in forced-colors */
  background: #2563eb;
  color: #fff;
}

/* Use forced-colors media query for overrides */
@media (forced-colors: active) {
  .btn {
    border-color: ButtonText; /* System color — always visible */
    background: ButtonFace;
    color: ButtonText;
  }

  .custom-checkbox {
    forced-color-adjust: none; /* Opt out of forced colors for this element */
    /* Then provide explicit colors that pass contrast in all themes */
  }
}

/* SVG icons in forced colors mode */
.icon {
  fill: currentColor; /* Inherits the forced color — works automatically */
}

/* Background-image icons become invisible — provide a fallback */
.icon-search {
  /* background-image icon would disappear */
  /* Use inline SVG or mask-image instead */
  mask-image: url('search.svg');
  background-color: currentColor; /* Mask approach survives forced colors */
  -webkit-mask-image: url('search.svg');
}
```

### CSS System Colors for Forced Colors

```css
/* These map to the user's forced colors scheme */
ButtonFace        /* Button background */
ButtonText        /* Button text */
Canvas            /* Page background */
CanvasText        /* Page text */
GrayText          /* Disabled text */
Highlight         /* Selected background */
HighlightText     /* Selected text */
LinkText          /* Link color */
VisitedText       /* Visited link */
```

---

## Practical Accessibility Checklist

**Text contrast:**
- [ ] All body text ≥ 4.5:1 against its background
- [ ] All headings and large text ≥ 3:1
- [ ] Placeholder text ≥ 4.5:1 (placeholders are not "decorative")
- [ ] Text on images/gradients — check the worst-case area

**UI component contrast:**
- [ ] Input borders ≥ 3:1 against background
- [ ] Focus indicators ≥ 3:1 against adjacent colors
- [ ] Icons that convey meaning ≥ 3:1
- [ ] Chart data elements ≥ 3:1 against adjacent data

**Color independence:**
- [ ] Status indicators use icon + text, not color alone
- [ ] Form errors use text description, not just red color
- [ ] Links are underlined or otherwise non-color distinguished
- [ ] Chart legends have non-color differentiation

**Simulation testing:**
- [ ] Checked deuteranopia simulation
- [ ] Checked forced-colors / Windows High Contrast
- [ ] Interactive elements have visible borders in forced colors
- [ ] SVG icons use `currentColor` or mask approach

**Dark mode:**
- [ ] All contrast ratios verified in dark theme separately
- [ ] Don't just invert — dark mode requires independent color tuning
