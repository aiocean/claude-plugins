# Data Visualization Colors

Color in data visualization is not decoration — it encodes information. A poor color choice makes data harder to read; a good one makes patterns visible that would otherwise be invisible. The goal is always to make the data clearer, never to make the chart prettier.

---

## The Three Palette Types

Every data visualization color need maps to one of three palette types. Choosing the wrong type for your data is the most common data visualization color mistake.

### 1. Sequential Palettes

Use when data has an ordered magnitude — values go from low to high with no natural midpoint.

**Data types:** population density, temperature (absolute), age, sales volume, time elapsed.

**Structure:** Single hue, varying in lightness and saturation from light (low values) to dark (high values). Can use two hues if carefully chosen.

```css
/* Single-hue sequential: blue */
--seq-1: #eff6ff;  /* lowest */
--seq-2: #bfdbfe;
--seq-3: #60a5fa;
--seq-4: #2563eb;
--seq-5: #1e3a8a;  /* highest */

/* Multi-hue sequential: yellow → green → blue (ColorBrewer YlGnBu) */
--seq-1: #ffffd9;
--seq-2: #edf8b1;
--seq-3: #7fcdbb;
--seq-4: #2c7fb8;
--seq-5: #081d58;
```

**Rules:**
- Light = low, dark = high (universal convention — never reverse)
- At least 5 steps for continuous data; 3 steps minimum for categories
- Perceptually uniform lightness steps (test by desaturating — steps should still look even)

### 2. Diverging Palettes

Use when data has a meaningful midpoint and you want to show deviation in two directions.

**Data types:** temperature anomaly (above/below average), profit/loss, survey agreement (strongly disagree → strongly agree), map elevation (above/below sea level).

**Structure:** Two hues that are visually distinct and perceptually opposite, meeting at a neutral midpoint. Light at the extremes, dark at center — or light at center, dark at extremes (choose based on whether you want to emphasize the midpoint or the extremes).

```css
/* Diverging: red → white → blue (RdBu) */
--div-neg-3: #b2182b;   /* strong negative */
--div-neg-2: #ef8a62;
--div-neg-1: #fddbc7;
--div-0:     #f7f7f7;   /* neutral midpoint */
--div-pos-1: #d1e5f0;
--div-pos-2: #67a9cf;
--div-pos-3: #2166ac;   /* strong positive */

/* Diverging: brown → white → teal (BrBG) */
--div-neg-3: #543005;
--div-neg-2: #bf812d;
--div-neg-1: #dfc27d;
--div-0:     #f5f5f5;
--div-pos-1: #80cdc1;
--div-pos-2: #35978f;
--div-pos-3: #003c30;
```

**Rules:**
- The midpoint color must be visually distinct from both ends
- Both hues must have equal perceptual weight at their darkest step
- Avoid red/green — the most common diverging choice is also the worst for color blindness

### 3. Qualitative Palettes

Use when data has no inherent order — categories are distinct but not ranked.

**Data types:** product lines, geographic regions, user segments, chart series labels, pie/donut slices.

**Structure:** Multiple hues, each at similar lightness and saturation so no category appears "more important" than another.

```css
/* Qualitative: 8 distinct hues (ColorBrewer Set2) */
--qual-1: #66c2a5;  /* teal */
--qual-2: #fc8d62;  /* orange */
--qual-3: #8da0cb;  /* blue */
--qual-4: #e78ac3;  /* pink */
--qual-5: #a6d854;  /* green */
--qual-6: #ffd92f;  /* yellow */
--qual-7: #e5c494;  /* tan */
--qual-8: #b3b3b3;  /* gray */

/* Qualitative: high-contrast 6-color (Okabe-Ito — designed for color blindness) */
--okabe-1: #e69f00;  /* orange */
--okabe-2: #56b4e9;  /* sky blue */
--okabe-3: #009e73;  /* bluish green */
--okabe-4: #f0e442;  /* yellow */
--okabe-5: #0072b2;  /* blue */
--okabe-6: #d55e00;  /* vermillion */
--okabe-7: #cc79a7;  /* reddish purple */
```

**Rules:**
- Maximum 8 categories with color alone — beyond that, add labels directly on chart elements
- Each color must be distinguishable when desaturated (test with grayscale)
- Order categories by data magnitude or alphabetically — not by which color looks best

---

## ColorBrewer Principles

ColorBrewer (colorbrewer2.org) was designed by cartographer Cynthia Brewer specifically for data visualization. Its palettes are:

1. **Perceptually ordered** — lightness steps are even to the human eye, not just mathematically
2. **Print-safe** — work in CMYK, not just RGB
3. **Colorblind-safe** — filtered variants avoid red-green conflicts
4. **Photocopier-safe** — remain distinguishable in grayscale

### Selecting ColorBrewer Palettes

```
Sequential:  Blues, Greens, Oranges, Purples, Reds
             OrRd, YlOrRd, YlGnBu, BuPu (multi-hue)

Diverging:   BrBG, PiYG, PRGn, PuOr, RdBu, RdYlBu, RdYlGn, Spectral

Qualitative: Set1, Set2, Set3, Pastel1, Pastel2, Dark2, Accent, Paired
```

**ColorBrewer safe subsets by constraint:**

| Constraint | Recommended |
|-----------|-------------|
| Colorblind safe | Set2 (qual), BrBG (div), Blues (seq) |
| Print safe | Most sequential; avoid Set3 |
| Max 5 categories | Any Set |
| 6–8 categories | Set2, Dark2, Paired |

---

## Accessibility in Charts

### Never Rely on Color Alone (WCAG 1.4.1)

Every data encoding by color must have a secondary encoding:

```html
<!-- Bad: color is the only series differentiator -->
<svg>
  <path class="series-1" d="..." />  <!-- blue line -->
  <path class="series-2" d="..." />  <!-- red line -->
</svg>

<!-- Good: direct labels on the data -->
<svg>
  <path class="series-1" d="..." />
  <text x="..." y="..." class="series-label">Revenue</text>

  <path class="series-2" stroke-dasharray="6 3" d="..." />
  <text x="..." y="..." class="series-label">Cost</text>
</svg>
```

```css
/* Secondary encodings for line charts */
.series-revenue {
  stroke: #2563eb;
  stroke-width: 2;
  /* solid line */
}

.series-cost {
  stroke: #dc2626;
  stroke-width: 2;
  stroke-dasharray: 8 4;  /* dashed — second encoding */
}

.series-profit {
  stroke: #16a34a;
  stroke-width: 2;
  stroke-dasharray: 2 2;  /* dotted — third encoding */
}
```

### Contrast in Charts

Data elements (bars, lines, points) need 3:1 contrast against their background per WCAG 1.4.11.

```css
/* Bar chart: bar fill against white background */
.bar { fill: #2563eb; } /* #2563eb on #fff = 8.6:1 — passes */

/* Scatter plot: point fill against white */
.point { fill: #059669; } /* #059669 on #fff = 4.5:1 — passes */

/* Avoid very light fills on white backgrounds */
.bar-pale { fill: #bfdbfe; } /* #bfdbfe on #fff = 1.4:1 — fails */
```

### Pattern + Color for Bar Charts

```css
/* Using SVG patterns for colorblind safety */
<defs>
  <pattern id="diagonal" patternUnits="userSpaceOnUse" width="6" height="6">
    <path d="M0,6 l6,-6 M-1.5,1.5 l3,-3 M4.5,7.5 l3,-3"
          stroke="#2563eb" stroke-width="1.5"/>
  </pattern>
  <pattern id="dots" patternUnits="userSpaceOnUse" width="6" height="6">
    <circle cx="3" cy="3" r="1.5" fill="#dc2626"/>
  </pattern>
</defs>

<rect fill="url(#diagonal)" />  <!-- Series 1: blue diagonal stripes -->
<rect fill="url(#dots)" />       <!-- Series 2: red dots -->
```

---

## Avoiding the Rainbow Colormap

The rainbow colormap (jet, spectrum, hsv) is the most widely used and most harmful color scale in data visualization. Avoid it.

### Why Rainbow Fails

1. **Not perceptually uniform.** Luminance spikes at yellow and cyan, creating false visual boundaries in the data — patterns that don't exist.

2. **Not colorblind safe.** Red-green pairs appear identical to deuteranopes.

3. **Not grayscale-readable.** Similar data values map to similar grays, destroying the encoding.

4. **Implies false categories.** The abrupt hue shifts suggest discrete groups in continuous data.

```css
/* Bad: rainbow/jet colormap */
/* Hue rotates 0°→360° — perceptually non-monotonic */
--jet-low:  hsl(240, 100%, 50%);  /* blue */
--jet-mid1: hsl(180, 100%, 50%);  /* cyan */
--jet-mid2: hsl(120, 100%, 50%);  /* green */
--jet-mid3: hsl(60,  100%, 50%);  /* yellow */
--jet-high: hsl(0,   100%, 50%);  /* red */

/* Good: viridis (perceptually uniform, colorblind-safe, grayscale-safe) */
--viridis-0: #440154;  /* dark purple */
--viridis-1: #31688e;  /* blue */
--viridis-2: #35b779;  /* green */
--viridis-3: #fde725;  /* yellow */
```

### Recommended Perceptually Uniform Colormaps

| Name | Hue Range | Best For |
|------|-----------|----------|
| **Viridis** | Purple → green → yellow | General purpose, colorblind safe |
| **Plasma** | Purple → orange → yellow | Bright/saturated data |
| **Inferno** | Black → red → yellow | Print, dramatic emphasis |
| **Magma** | Black → purple → white | Dark backgrounds |
| **Cividis** | Blue → yellow | Specifically deuteranopia-optimized |
| **Turbo** | Blue → red | High-detail, not colorblind-safe |

---

## Categorical Color Ordering

When listing categories, order affects what users notice first.

```
1. Most important / highest value → first color slot (most visually prominent)
2. Second most important → second slot
3. Least important / "other" category → last slot (gray — visually recedes)
```

```css
/* "Other" always gets a neutral gray */
.series-other { color: #9ca3af; }

/* Gray recedes — it signals "this is background context, not the story" */
```

---

## Color Encoding Density

The more categories you encode with color, the harder discrimination becomes.

| Category Count | Color Discrimination | Recommendation |
|---------------|---------------------|----------------|
| 1–3 | Easy | Pure color encoding fine |
| 4–6 | Moderate | Add labels on data elements |
| 7–8 | Difficult | Direct labels required; color is secondary |
| 9+ | Impossible | Group into "Top N + Other"; use small multiples |

```javascript
// When you have > 8 categories, group smaller ones
function groupSmallCategories(data, topN = 7) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const other = sorted.slice(topN);
  if (other.length === 0) return top;
  return [
    ...top,
    { label: 'Other', value: other.reduce((s, d) => s + d.value, 0) }
  ];
}
```

---

## Quick Reference

```
Data type → palette:
  Ordered magnitude (0 to N)     → Sequential
  Deviation from midpoint        → Diverging
  Unordered categories           → Qualitative

Safe choices:
  Qualitative, colorblind-safe:  Okabe-Ito, ColorBrewer Set2
  Sequential, colorblind-safe:   Viridis, Blues (ColorBrewer)
  Diverging, colorblind-safe:    BrBG, PuOr (avoid RdGn)

Always:
  - Add non-color secondary encoding (shape, pattern, label, dash)
  - Ensure 3:1 contrast against background for data marks
  - Max 8 color categories; use direct labels beyond that
  - Never use rainbow/jet for continuous data
  - Test in grayscale and with deuteranopia simulation
```
