# Contrast and Emphasis

Contrast is the engine of visual hierarchy. Without contrast, every element competes equally for attention — the result is visual noise. With contrast, you guide the eye, communicate importance, and create interfaces that feel intentional.

---

## What Contrast Is

Contrast is perceptible difference between two elements. The eye notices difference before it notices similarity. Every design decision is a contrast decision: you are always choosing how much an element differs from its surroundings.

The six dimensions of contrast:

| Dimension | What Changes | Example |
|-----------|-------------|---------|
| **Size** | Physical scale | 32px heading vs 16px body |
| **Color** | Hue, saturation, or lightness | Blue button on white background |
| **Weight** | Font weight, stroke thickness | Bold label vs regular value |
| **Shape** | Geometric form | Rounded badge vs sharp card |
| **Space** | Whitespace amount | Isolated CTA vs dense navigation |
| **Texture** | Surface, pattern, motion | Flat card vs gradient hero |

A strong design typically employs 2–3 contrast dimensions simultaneously on its primary focal point.

---

## Size Contrast

Size is the most immediate signal of importance. Larger elements read as more important. This is not culturally conditioned — it is perceptual.

**Practical scale ratios:**
- 1:1.2 — barely distinguishable (avoid for hierarchy)
- 1:1.5 — subtle difference, good for secondary hierarchy
- 1:2 — clear relationship, standard heading/body
- 1:3+ — dramatic emphasis, hero titles and stats

```css
/* Weak size contrast — hierarchy unclear */
.label { font-size: 14px; }
.value { font-size: 16px; }

/* Strong size contrast — hierarchy obvious */
.stat-value { font-size: 48px; font-weight: 700; }
.stat-label { font-size: 13px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.08em; }
```

**Avoid same-size competing elements.** If two things are the same size, users assume they are equally important.

---

## Color Contrast

Color contrast operates on three axes:

1. **Lightness contrast** — the difference in perceived brightness. This is the primary contrast axis for readability.
2. **Hue contrast** — the difference in color temperature or wavelength. Blue vs orange has high hue contrast.
3. **Saturation contrast** — vivid vs muted. A fully saturated color next to desaturated grays draws the eye immediately.

### Contrast Ratio

Contrast ratio compares the relative luminance of two colors. The formula is:

```
CR = (L1 + 0.05) / (L2 + 0.05)
```

Where L1 is the lighter luminance and L2 is the darker. Range: 1:1 (no contrast) to 21:1 (black on white).

**WCAG thresholds (see also 03-color-science/06):**
- Normal text: 4.5:1 minimum
- Large text (18pt+ or 14pt bold): 3:1 minimum
- UI components and graphics: 3:1 minimum

```css
/* Check your ratios with a tool like https://webaim.org/resources/contrastchecker/ */

/* Failing: #767676 on #ffffff = 4.48:1 (just under for normal text) */
.body-text { color: #767676; } /* Bad */

/* Passing: #595959 on #ffffff = 7.0:1 */
.body-text { color: #595959; } /* Good */
```

### Using Color for Emphasis (Not Just Decoration)

Color emphasis is most effective when:
1. One element is chromatic and everything else is achromatic
2. One element is saturated and everything else is desaturated
3. Warm colors advance; cool colors recede

```css
/* Primary action stands out because it's the only chromatic element */
.btn-primary { background: #2563eb; color: #ffffff; }
.btn-secondary { background: transparent; color: #374151; border: 1px solid #d1d5db; }
.btn-ghost { background: transparent; color: #6b7280; }
```

---

## Weight Contrast

Font weight is the fastest way to add emphasis without changing layout. The difference between 400 and 700 reads as "this matters more."

```css
/* Creating hierarchy within a single size */
.card-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.card-value {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}
```

**Weight contrast rules:**
- Minimum useful jump: 400 → 600. Going 400 → 500 is often imperceptible at small sizes.
- Never use weight contrast without also using color contrast. Bold gray on light gray fails both.
- Avoid using more than 3 distinct weights in a single view — this fragments hierarchy.

---

## Shape Contrast

Shape creates categorical distinction. Different shapes signal different types of information.

```css
/* Shapes signal meaning through contrast */
.badge-success {
  border-radius: 9999px;   /* Pill: status indicator */
  padding: 2px 8px;
}

.card {
  border-radius: 8px;       /* Rounded: contained content */
}

.data-table td {
  border-radius: 0;         /* Sharp: data, precision */
}

.alert-error {
  border-radius: 4px;
  border-left: 4px solid #ef4444;  /* Asymmetric shape: directional urgency */
}
```

Shape contrast becomes a semantic tool when you apply it consistently. If all interactive elements are rounded and all data elements are sharp, users internalize the pattern.

---

## Spatial Contrast

Isolation amplifies importance. An element surrounded by whitespace becomes prominent through its separation from the crowd.

```css
/* Dense section — everything competes */
.feature-list .item {
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

/* Isolated CTA — separation creates emphasis */
.primary-cta-section {
  padding: 80px 0;          /* Generous vertical space */
  display: flex;
  flex-direction: column;
  align-items: center;      /* Centered in its space */
  gap: 16px;
}
```

**Spatial contrast guidelines:**
- The primary action in a view should have at least 2× the surrounding space of secondary actions
- Dense information areas (tables, lists) use tight spacing — this signals "data" to the user
- Spacious areas signal "important decision" or "landmark moment"

---

## High-Contrast vs Low-Contrast Design

### High-Contrast Design
- Strong differentiation between elements
- Suits data-heavy, task-focused interfaces (dashboards, IDEs, forms)
- Faster visual scanning
- Can feel harsh in emotional contexts

### Low-Contrast Design
- Subtle differences between elements
- Suits editorial, luxury, or ambient interfaces
- Feels calm and sophisticated
- Accessibility risk: must verify all text passes WCAG

```css
/* High-contrast design system */
:root {
  --fg-primary: #0f172a;
  --fg-secondary: #475569;
  --fg-tertiary: #94a3b8;
  --border: #1e293b;
  --surface: #ffffff;
  --emphasis: #2563eb;
}

/* Low-contrast design system (luxury/editorial) */
:root {
  --fg-primary: #1a1a1a;
  --fg-secondary: #5a5a5a;   /* Passes only at large sizes */
  --fg-tertiary: #8a8a8a;    /* Decorative only — never for important content */
  --border: #e8e8e8;
  --surface: #fafafa;
  --emphasis: #c8a96e;       /* Gold — still needs contrast check */
}
```

---

## Creating Visual Interest Through Texture Contrast

Texture contrast prevents visual monotony in layouts with little color variation.

```css
/* Texture through layering */
.hero {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f1f3d 100%);
}

.card {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
}

.code-block {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-family: 'Fira Code', monospace;
}

/* Motion as texture: subtle animation draws attention */
.status-indicator--active {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## Emphasis Hierarchy: The Rule of One

**Every screen should have exactly one primary emphasis point.** More than one primary emphasis means no primary emphasis.

```
Primary (1 element):    Full color, large, bold, isolated
Secondary (2–4):        Subdued color, medium size, regular weight
Tertiary (many):        Muted, small, light weight
```

```css
/* Correct — one primary CTA */
.page-hero .cta-primary {
  background: #2563eb;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  padding: 14px 32px;
  border-radius: 8px;
}

.page-hero .cta-secondary {
  background: transparent;
  color: #2563eb;
  font-size: 16px;
  font-weight: 500;
  padding: 12px 24px;
  border: 1.5px solid #2563eb;
  border-radius: 8px;
}

/* Wrong — two primary CTAs compete */
.page-hero .cta-1 { background: #2563eb; ... }
.page-hero .cta-2 { background: #16a34a; ... }  /* Now what? */
```

---

## Common Contrast Mistakes

**1. Contrast without purpose.** Using high contrast on low-importance elements draws attention to the wrong place.

**2. Same weight, same color, same size everywhere.** Every element identical in visual weight = no hierarchy = user reads in random order.

**3. Low-contrast interactive states.** Hover, focus, and active states must be visibly different from the resting state.

```css
/* Invisible hover state — bad */
.nav-link:hover { color: #3b82f6; }  /* If text is already near blue */

/* Visible hover state — good */
.nav-link { color: #374151; }
.nav-link:hover {
  color: #1d4ed8;
  background: #eff6ff;
  text-decoration: underline;
}
```

**4. Decorative elements with high contrast.** Borders, dividers, and backgrounds should be low-contrast. They structure space — they should not compete with content.

```css
/* Border too heavy — competes with content */
.card { border: 2px solid #374151; }

/* Border at appropriate weight */
.card { border: 1px solid #e5e7eb; }
```

---

## Quick Reference Checklist

- [ ] Is there exactly one primary emphasis point per view?
- [ ] Does the primary action have at least 2 contrast dimensions over secondary actions?
- [ ] Do all text elements meet WCAG contrast minimums?
- [ ] Are interactive state changes (hover, focus, active) visually obvious?
- [ ] Are decorative elements (dividers, backgrounds) low-contrast?
- [ ] Does weight contrast use at least a 200-weight jump?
- [ ] Is isolation (whitespace) used to amplify the most important element?
