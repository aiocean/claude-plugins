# Visual Hierarchy

Visual hierarchy is the arrangement of elements so the eye moves through them in a deliberate, intentional order. Without hierarchy, users scan randomly. With hierarchy, you control the reading sequence — what registers first, second, and last. Every design decision either strengthens or undermines this order.

---

## The Core Variables of Hierarchy

Six visual properties establish dominance. Stack them for emphasis; strip them away to recede.

| Property | Dominant | Recessive |
|---|---|---|
| Size | Large | Small |
| Color | Saturated / warm | Muted / cool |
| Contrast | High (dark on light) | Low (gray on gray) |
| Weight | Bold / heavy | Light / thin |
| Space | Surrounded by whitespace | Packed with neighbors |
| Position | Top-left, center | Bottom, right edge |

---

## Size

The single most powerful hierarchy signal. Larger = more important. No other cue needed.

**Scale relationships that work:**
- Display heading: 48–72px
- Page title (H1): 32–40px
- Section heading (H2): 24–28px
- Subsection (H3): 18–20px
- Body text: 16px (minimum 14px for secondary)
- Caption / meta: 12–13px

The ratio between adjacent levels should be at least 1.25x. Below that, the eye fails to distinguish levels.

**CSS Example:**
```css
/* Typographic scale using CSS custom properties */
:root {
  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */
  --text-5xl:  3rem;      /* 48px */
}

.page-title   { font-size: var(--text-4xl); }
.section-head { font-size: var(--text-2xl); }
.card-title   { font-size: var(--text-xl);  }
.body         { font-size: var(--text-base);}
.caption      { font-size: var(--text-sm);  }
```

**Anti-pattern:** Headings only 2–4px larger than body text. At 18px heading / 16px body the distinction vanishes, especially at distance or on mobile. Users read the page as undifferentiated prose.

---

## Color and Saturation

Color draws the eye before shape or position. Saturated colors advance; desaturated colors recede. Warm colors (red, orange) advance more than cool ones (blue, green).

**Hierarchy through color:**
```css
/* Three-tier text hierarchy using color */
.text-primary {
  color: #111827;  /* near-black: maximum contrast, highest importance */
}

.text-secondary {
  color: #6b7280;  /* medium gray: supporting information */
}

.text-tertiary {
  color: #9ca3af;  /* light gray: timestamps, metadata */
}

/* Action hierarchy through saturation */
.btn-primary {
  background: #2563eb;   /* saturated: draws the eye */
  color: white;
}

.btn-secondary {
  background: transparent;
  border: 1.5px solid #d1d5db;
  color: #374151;        /* neutral: recedes appropriately */
}

.btn-ghost {
  background: transparent;
  color: #6b7280;        /* recessive: tertiary action */
}
```

**Anti-pattern:** Using multiple saturated accent colors at equal intensity. Two blue buttons and a red button and an orange badge on the same screen — the eye cannot prioritize. Saturate only what matters most.

---

## Contrast

Contrast is the difference between foreground and background luminance. It simultaneously serves hierarchy and accessibility.

**WCAG contrast ratios:**
- 4.5:1 minimum for body text (< 18pt)
- 3:1 minimum for large text (≥ 18pt / bold ≥ 14pt) and UI components
- 7:1 for enhanced (AAA) compliance

**Using contrast for hierarchy beyond accessibility:**
```css
/* Contrast layers — progressively less important */
.hero-headline {
  color: #0f172a;        /* ~18:1 on white — maximum dominance */
  font-size: 3rem;
  font-weight: 800;
}

.hero-subheadline {
  color: #334155;        /* ~12:1 — clearly secondary */
  font-size: 1.25rem;
  font-weight: 400;
}

.hero-caption {
  color: #64748b;        /* ~5:1 — tertiary, meets WCAG AA */
  font-size: 0.875rem;
}

/* Low-contrast as intentional recessive signal */
.placeholder {
  color: #94a3b8;        /* ~3.5:1 — disappears when content present */
}
```

**Anti-pattern:** Making ALL text maximum contrast. A page where every text element is `#000000` has no hierarchy through contrast — every word is fighting for equal attention.

---

## Typography Weight

Weight is fast to process and layered on top of other signals. Bold text pops within body copy without changing size or color.

```css
:root {
  --font-light:    300;
  --font-regular:  400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
  --font-extrabold: 800;
}

/* Weight-only hierarchy within the same size */
.stat-label {
  font-size: 0.875rem;
  font-weight: var(--font-regular);
  color: #6b7280;
}

.stat-value {
  font-size: 0.875rem;       /* same size */
  font-weight: var(--font-bold); /* weight carries hierarchy */
  color: #111827;
}

/* Scanning aid: bold key terms in body copy */
.body-copy strong {
  font-weight: var(--font-semibold);
  color: #111827;  /* slightly darker than body */
}
```

**Pro tip:** Use weight to differentiate within the same type size. This is especially useful in dense data tables where changing size would break grid alignment.

**Anti-pattern:** Variable fonts set to weight 400 across the board, then using only italic for emphasis. Italic is a weaker hierarchy signal than weight — it distinguishes but doesn't dominate.

---

## Spacing as Hierarchy Signal

Space amplifies importance. An important element surrounded by whitespace demands attention. Crowded elements recede into noise.

```css
/* Section heading gets more breathing room than subsections */
.section-heading {
  margin-top: 64px;   /* large gap above: this is a major section */
  margin-bottom: 24px;
}

.subsection-heading {
  margin-top: 40px;
  margin-bottom: 16px;
}

.paragraph {
  margin-bottom: 16px;
}

/* Highlight box — space makes it a focal point */
.callout {
  padding: 24px 32px;  /* generous internal space */
  margin: 40px 0;      /* generous external space — it matters */
  background: #eff6ff;
  border-left: 4px solid #2563eb;
  border-radius: 0 8px 8px 0;
}
```

---

## F-Pattern Scanning

Research (Nielsen Norman Group eye-tracking studies) shows users reading content-heavy pages (articles, search results, documentation) scan in an F-shape:

1. **First horizontal sweep:** Full width across the top
2. **Second horizontal sweep:** Shorter sweep below the first
3. **Vertical sweep:** Down the left edge

**Design implications:**
- Put your most important information in the top-left zone
- First words of each line carry more weight than endings
- The left edge is prime real estate — use it for labels, key terms, navigation
- Long paragraphs lose readers after the first line — front-load key information
- Bullet points work because they reset the F-pattern with each new left-edge element

```html
<!-- F-pattern optimized list item -->
<li>
  <strong>Key term:</strong> supporting explanation follows after the important
  word is anchored at the left edge.
</li>

<!-- F-pattern optimized card layout -->
<div class="card">
  <!-- Top: full-width scan zone — most important info here -->
  <div class="card-header">
    <h3 class="card-title">Primary Value Proposition</h3>
    <span class="card-badge">New</span>
  </div>
  <!-- Middle: shorter scan — secondary info -->
  <p class="card-desc">Supporting detail that reinforces the title.</p>
  <!-- Bottom-left: vertical scan anchor -->
  <div class="card-footer">
    <span class="card-meta">Timestamp or author</span>
    <a class="card-action">Action →</a>
  </div>
</div>
```

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  /* Left-anchored, first word is key term */
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}
```

---

## Z-Pattern Scanning

Users viewing designed layouts (landing pages, ads, dashboards with visual variety) scan in a Z-shape:

1. **Top-left:** Logo / primary identity
2. **Top-right:** Navigation / secondary action
3. **Diagonal sweep:** Eye crosses the page
4. **Bottom-left:** Supporting information
5. **Bottom-right:** Primary CTA (conversion point)

**Design implications:**
- Place the CTA at the bottom-right or end of the diagonal
- Brand identity always top-left
- The diagonal creates a natural "reading path" — place key messages along it
- Works best for sparse, image-heavy pages (not long-form content)

```css
/* Z-pattern landing page grid */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 80vh;
  padding: 40px;
  gap: 24px;
}

/* Top-left: brand */
.hero-brand {
  grid-column: 1;
  grid-row: 1;
  align-self: start;
}

/* Top-right: navigation */
.hero-nav {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  align-self: start;
}

/* Center: diagonal anchor — the key message */
.hero-headline {
  grid-column: 1 / -1;
  grid-row: 2;
  text-align: center;  /* sits on the Z diagonal */
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 800;
}

/* Bottom-right: CTA — end of Z path */
.hero-cta {
  grid-column: 2;
  grid-row: 3;
  justify-self: end;
}
```

---

## Primary / Secondary / Tertiary Emphasis

Every interface has three tiers of importance. Design each tier distinctly.

```css
/* Complete three-tier system */

/* PRIMARY — one per section/viewport */
.emphasis-primary {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.025em;
  line-height: 1.1;
}

/* SECONDARY — 2-4 per section */
.emphasis-secondary {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
}

/* TERTIARY — supporting, as many as needed */
.emphasis-tertiary {
  font-size: 0.875rem;
  font-weight: 400;
  color: #64748b;
  line-height: 1.6;
}

/* Button tier system */
.action-primary {
  background: #2563eb;
  color: white;
  padding: 10px 24px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
}

.action-secondary {
  background: white;
  color: #374151;
  padding: 10px 24px;
  font-weight: 500;
  border-radius: 6px;
  border: 1.5px solid #d1d5db;
}

.action-tertiary {
  background: transparent;
  color: #6b7280;
  padding: 10px 16px;
  font-weight: 400;
  border: none;
  text-decoration: underline;
}
```

---

## The Squint Test

**Method:** Squint your eyes (or use CSS `filter: blur(8px)`) until you can only see blobs of light and dark. What you see is the hierarchy your design is actually communicating.

**What to look for:**
- One dominant blob per viewport (the focal point)
- Progressive hierarchy from dark/large to light/small
- Clear separation between content zones

**CSS simulation of the squint test:**
```css
/* Add this class to your preview to squint-test */
.squint-test {
  filter: blur(8px);
  /* If hierarchy is invisible now, it isn't strong enough */
}
```

**What you want to see:**
- The primary heading: a dark horizontal bar near the top
- The CTA button: a saturated blob, clearly distinct from text
- Body content: light gray mass (not competing with headings)
- Spacing: visible white zones between sections

**What bad hierarchy looks like squinted:**
- Everything the same shade of gray
- Multiple equally-saturated blobs competing
- No clear zones or separations

---

## Practical Hierarchy Checklist

Before shipping any screen, verify:

- [ ] Can you identify the #1 most important element in under 3 seconds?
- [ ] Do headings have at least 1.25x scale ratio between levels?
- [ ] Is there exactly one high-saturation CTA per viewport?
- [ ] Is supporting text visually quieter than primary text (lighter gray, smaller, thinner)?
- [ ] Does the squint test reveal clear zones and one dominant focal point?
- [ ] Are primary elements surrounded by more whitespace than secondary elements?
- [ ] Does left-edge content lead with key terms (F-pattern optimization)?
- [ ] Does the visual flow match the intended reading order?

---

## Common Hierarchy Failures

**Equal everything:** Five buttons all the same size, color, and weight. Users don't know which action is primary.

**Inverse hierarchy:** The copyright footer in 14px bold and the page headline in 14px light — visual weight inverted from importance.

**Color-only hierarchy:** Red for errors is fine, but if ALL your hierarchy is color-based, colorblind users lose the entire structure. Layer at least two signals (color + weight, color + size).

**Dense hero, sparse detail:** Giant heading, tiny body copy. The size ratio is correct but if the body is only 13px on mobile, it fails at readability before hierarchy matters.

**Hierarchical inconsistency across pages:** H2 on page A is 28px/semibold; H2 on page B is 22px/regular. Users lose their mental model of what heading levels mean. Establish a design token system and enforce it.
