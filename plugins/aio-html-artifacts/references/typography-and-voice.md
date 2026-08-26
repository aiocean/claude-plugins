# Typography and voice

**Settles:** the numeric values behind type, measure, spacing rhythm, separation, shadow and colour, the 18-row anti-slop tell table, and the design detail of the five voices.

**When this file loads:** the request names a brand, a company style, a mood, or a look to match; or you change a value inside a voice block instead of pasting it whole. Picking a voice needs the five-row chooser at the top of `references/voices.css` and nothing here, which is why this file carries a condition rather than loading every time.

**Partial read:** `Numerics`, `Measure`, `Asymmetric spacing rhythm`, `Shadows` and `Colour` are one decision each and self-contained. The tell table is row-addressable.

> **Reviewed 2026-08. Next review 2027-02 (six-month interval).**
> Ban-by-literal-value is a lagging indicator by construction. The purple gradient was the 2024 tell; the warm-cream / serif / terracotta cluster is the 2026 tell; there will be a 2027 one, and the five voices below are a plausible candidate for it. Two things in this file do not go stale: the **rotation rule** (two artifacts in one session carry different voices) and the contract comment's **`generic-check=` key**, which is model-driven and asks what you would have produced for any artifact on this topic and what you replaced it with. When the literal table below and `generic-check=` disagree, `generic-check=` is the live signal.

## Contents

- [Numerics](#numerics) — sizes, leading, measure, scale, weight, tracking, hierarchy cues
- [Measure: em for prose, ch for monospace](#measure-em-for-prose-ch-for-monospace)
- [Asymmetric spacing rhythm](#asymmetric-spacing-rhythm)
- [Gestalt separation](#gestalt-separation)
- [Shadows](#shadows)
- [Colour](#colour)
- [Anti-slop tell table (18 rows)](#anti-slop-tell-table-18-rows)
- [The five voices](#the-five-voices)

## Numerics

Butterick / Bringhurst-via-Rutter / WCAG:

```
body font-size:        16-20px  (Butterick: 15-25px web). Floor 16px at 320px viewport.
line-height (body):    1.5-1.55 unitless   (WCAG 1.4.12 floor is 1.5; Butterick 120-145%)
line-height (h1/h2):   1.1-1.2  ·  small/caption 1.5  ·  display 1.08
measure:               34em prose / 45em wide / 40em if claiming AAA.  1 char ~= 0.5em.
type steps used:       body + at most THREE others.  Ratio >= 1.25 between adjacent used steps.
display jump:          3x+ at the display end, not 1.5x.
weight contrast:       100/200 vs 800/900, not 400 vs 600.
letter-spacing:        body 0.  headings 0 below 2rem, at most -0.01em above.
                       ALL CAPS / small caps: +0.05 to 0.12em, single line only.
heading levels:        max 3.  Never centred, underlined, or all-caps.
emphasis:              exactly ONE signal. Serif body -> <em> italic, <strong> bold, never both.
                       Sans body -> bold or small-caps, never italic.
hierarchy cue ceiling: THREE cues per level (size, weight, space, colour, case, rule, position).
                       Priority order: SPACE > SIZE > WEIGHT.  Colour/case/rules are tertiary.
WCAG 1.4.12 survival:  never set fixed height/max-height on a text container.
```

## Measure: em for prose, ch for monospace

Prose measure is set in `em`: `--measure: 34em` (≈68 characters), `--measure-wide: 45em` (≈90 characters) for tables, code, and reference material, `--measure-aaa: 40em` for the WCAG 1.4.8 ceiling. `<pre>` uses `88ch`. The conversion constant is **1 character ≈ 0.5em**.

The reason: `ch` is the advance width of the `0` glyph, which runs 20-30% wider than the average proportional glyph — so `max-width: 65ch` renders about **85 characters**, not 65. In monospace `1ch == 1 character` exactly, which is why `ch` is correct on `<pre>` and correct only there. Say this plainly when it comes up: `max-width: 65ch` is the single most-copied AI snippet for measure and it is wrong, and shipping the em form is a visible differentiator.

## Asymmetric spacing rhythm

Uniform gaps are themselves a slop tell — an even rhythm encodes no grouping, so a reader gets no structure from spacing and every relationship has to be carried by borders instead. Paste this and tune the multipliers:

```css
:root {
  --line: 1.75rem;                              /* body size x line-height */
  --sp-tight:   calc(var(--line) * 0.5);        /* heading -> its own text */
  --sp-para:    calc(var(--line) * 0.75);       /* paragraph -> paragraph  */
  --sp-block:   calc(var(--line) * 1);          /* figure, table, code     */
  --sp-section: calc(var(--line) * 2);          /* text -> next heading    */
  --sp-major:   calc(var(--line) * 3);
}
* + * { margin-block-start: var(--sp-para); }
h1,h2,h3            { margin-block-start: var(--sp-section); }
h1 + *, h2 + *, h3 + * { margin-block-start: var(--sp-tight); }
```

## Gestalt separation

- Inter-group gap ≥ 2× intra-group gap.
- ONE separator per hierarchy level — a 1px rule OR a background step OR whitespace OR one shadow elevation, never three.
- Whitespace first, shadow last.
- A region already separated by `--sp-section` carries no border.

## Shadows

- Exactly **three** elevations (`--shadow-1|2|3`); a fourth is a failure.
- One light source: vertical offset = 2× horizontal, page-wide.
- Layered, never a single blur — minimum 3 layers, offsets/blur doubling, identical low alpha, negative spread outward.
- Shadow hue = surface hue, never grey.
- As elevation rises: offsets scale on the ratio, blur grows, alpha drops.
- Dark voices ship `--shadow-*: none`. Depth on dark comes from surface-lightness steps.

## Colour

- Untoned `#ffffff` + `#000000` belongs to the brutalist voice alone, paired there with 2px rules + radius 0 + hard offset shadows + monospace. Every other voice tones both ends.
- 3-5 hues plus tints. ≥8 distinct hues means colours were invented inline.
- One dominant + one accent occupying <5% of pixels.
- Zero raw hex below the token block.
- Build scales in `oklch()`.
- De-emphasise by moving text toward the background colour, never toward grey.
- Colour carries a second signal alongside it — glyph, label, or position — so status survives without it.
- `:root { color-scheme: light dark }` + `light-dark(a,b)` per token, or a committed single-mode voice.

## Anti-slop tell table (18 rows)

The validator greps these exact strings (`q.slop`, error per row). A deliberate exception is declared in the contract comment as `allow: <rule-id>` — one line naming the row, e.g. `allow: q.slop-3`, next to the editorial reason for it.

| # | Literal tell | Replacement |
|---|---|---|
| 1 | `linear-gradient(135deg,#6366f1,#a855f7)` · `oklch(58.5% 0.233 277.117)` · `#6366f1` `#818cf8` `#4f46e5` `#a855f7` `#8b5cf6` | Flat `var(--accent)`. Gradients banned on heroes; elsewhere ≤2 stops, ≤30° hue apart, ≤15% lightness apart, surface ≤240px. |
| 2 | `font-family: Inter\|Roboto\|Arial\|Open Sans\|Lato\|system-ui\|Space Grotesk` as primary | A named face from the chosen voice. (Anthropic flags Space Grotesk by name as a *converged escape hatch*.) |
| 3 | cream `#F4F1EA`/`#faf8f5`/`#fdf6ec` bg **+** serif display **+** terracotta accent **+** italic headline word-accent | Auto-reject as a combination on report/explorer/editor/deck. Legal only with a one-sentence declared editorial reason. |
| 4 | `border-radius:.5rem` **+** `border:1px solid` **+** `box-shadow:0 1px 3px 0 rgb(0 0 0/.1)` on one element | Triple separator. Pick one. |
| 5 | `border-radius: 12px` + `border-left: 4px solid` as the default card | Reserve `border-inline-start: 3px solid` for semantic callouts only. |
| 6 | `grid-template-columns: repeat(3,1fr)` with 3 identical icon+h3+2-line-p cards | Run the card-grid ladder. |
| 7 | `background:#ffffff; color:#000000` | Tone both: neutral `#FAFAFA`/`#1A1A1A`, cool `#F5F7FA`/`#1F2937`, warm `#FFFAF0`/`#2D2118`. |
| 8 | `padding: 7px 15px` · `gap: 13px` · `margin: 18px` | Snap to `--s*` or a 4/8px scale. |
| 9 | 5+ near-identical blues as raw literals | Every colour traces to a token. |
| 10 | `border-radius: 0.5rem\|0.75rem\|8px\|10px\|12px` | The voice's single `--radius`. 8/10/12px are the training-data defaults. |
| 11 | Emoji prefixing `<h1..h6>` or `<button>` (`🚀 Get Started`) | Delete, or a mono kicker in caps at `letter-spacing:.12em`. |
| 12 | `transition: all .3s` + `:hover{transform:translateY(-4px)}` on every card | Name the properties. One motion mode. `transition: background-color 150ms ease, border-color 150ms ease` on state changes only. |
| 13 | `backdrop-filter: blur(...)` + coloured glow | Surface-lightness steps (dark) or hairline + background step (light). |
| 14 | `font-weight:600` headings + `400` body + 1.25× size steps | 100/200 vs 800/900; 3×+ display jump. |
| 15 | `max-width:1280px` with no measure cap on prose | `max-inline-size: var(--measure)`. |
| 16 | `text-align:center` on hero + subhead + CTA + every card | Flush-left ragged-right. At most one centred element, deliberately. |
| 17 | Generic thin-line icons atop every card | Delete, or replace with the actual datum (large numeral, status glyph, sparkline). |
| 18 | Blob/people SVG illustrations | Honest placeholder: striped background + monospace label `product shot (1200×800)`. |

## The five voices

Each row abbreviates to its distinguishing decisions. The complete `[data-voice="…"]` token block lives one per file at `references/voices/<voice>.css` — paste the whole of the one file whose name matches the row you took into the artifact's `<style>`. The rules every voice obeys are the comment at the top of `references/voices.css`.

| Voice | Type | Palette | Radius / shadow | Default for |
|---|---|---|---|---|
| `editorial-swiss` | Archivo + IBM Plex Mono | `#ffffff` paper, `#111111` ink, ONE accent `#e4002b` | 0 / none — hairline rules only | report: audits, research synthesis, status |
| `technical-manual` | IBM Plex Sans + Serif + Mono | `light-dark(#f4f4f4,#161616)` / `light-dark(#161616,#f4f4f4)`, accent `light-dark(#0f62fe,#78a9ff)` | 0 / none; CSS-counter numbered sections | report: specs, runbooks, PR writeups |
| `console` | JetBrains Mono throughout | Tokyo Night verified: bg `#1a1b26`, panel `#1f2335`, raised `#24283b`, fg `#c0caf5`, comment `#565f89`, blue `#7aa2f7`, green `#9ece6a`, amber `#e0af68`, red `#f7768e` | 2px / none — depth from surface steps; every status carries a glyph prefix | incidents, traces, diffs, editors |
| `blueprint` | IBM Plex Sans Condensed + Mono | navy `#0b2340`, chalk `#dce9f7`, cyan `#57c7ff`; ruled 8px/64px field background; **dashed rule = provisional, solid = committed** | 0 / none | explorer: architecture options, scenario planning |
| `brutalist-doc` | monospace only, uppercase headings at `-0.02em` | `#ffffff`/`#000000` (legal *only here*), link `#0000ee`, visited `#551a8b`, flat `#ffe600` highlight | 0 / hard offset `2px 2px 0`, `4px 4px 0`, `8px 8px 0` | editors, decision records, changelogs |

**Rotation rule:** two artifacts in the same session carry different voices, unless they are explicitly a set. Repetition across a session is how a house style becomes the next tell.

**Declaration rule:** the `voice=` and `generic-check=` keys of the contract comment are filled in before markup exists; the validator fails an artifact with no declared voice.

**Brutalist voice** enforces the seven-rule manifesto verbatim: content readable on all reasonable screens; only hyperlinks and buttons respond to clicks; hyperlinks underlined and buttons look like buttons; the back button works; view content by scrolling; decoration only when needed; performance is a feature.
