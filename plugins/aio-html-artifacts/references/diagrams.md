# Diagrams — pick the medium, and the SVG contract

**Settles:** which medium draws this structure — CSS grid, `<table>`, `<pre>`, inline SVG, or a
Graphviz build step — plus the rules that hold once the answer is SVG, and the two spacing
distances that decide whether an annotation reads as attached.

**Elsewhere:** the HTML and CSS recipes the decision table points at — flow with labelled edges,
annotated code with line callouts, Tufte sidenotes, timeline, phase strip, sequence — are in
`references/diagrams-css.md`, routed from the SKILL.md. Read this file to choose; read that one
to paste. A request that already names its shape ("draw the incident timeline") can go straight
to the recipe file, because the medium row for a timeline is settled.

**Partial read:** the decision table is the first block below and answers the medium question on
its own.

## Contents
- [Pick the medium first](#pick-the-medium-first)
- [The hard rule](#the-hard-rule)
- [Seven SVG rules](#seven-svg-rules)
- [The two legal SVG shapes](#the-two-legal-svg-shapes)
- [Proximity is two-sided](#proximity-is-two-sided)

---

## Pick the medium first

One question decides it: **does this diagram contain text I would have to measure?**

| Intent | Medium | Why |
|---|---|---|
| Pipeline / flow / architecture with labelled boxes | HTML + CSS Grid | boxes size themselves to their text; zero measurement; reflows to one column |
| Timeline, changelog, incident sequence | HTML + CSS Grid (time / rail / body) | `<time datetime>` stays machine-readable; the rail is a 2px div |
| Phase / state progression | HTML + flex + `clip-path` chevrons | `aria-current="step"` carries state semantically |
| Sequence between N participants | HTML + CSS Grid (participants = columns, messages = rows) | message text is real text in a cell; no arrow-endpoint math |
| Comparison on shared criteria | `<table>` | it IS a table |
| Tree, directory, packet layout, memory map | `<pre role="img" aria-label>` | monospace = 1ch/char = the only exactly computable case |
| Chart, sparkline, ratio bar, proportional geometry | inline SVG | geometry is the content; text is short and clampable |
| Graph with >6 nodes or non-linear routing | authoring-time Graphviz WASM → inline the SVG | a real layout engine with real font metrics does the measuring |
| Not confident in the layout math | `<pre>` box-drawing fallback | an honest ASCII diagram beats a broken SVG |

**The Graphviz-WASM row is an escape hatch, not a default.** `dot`, `neato`, `d2`, `mmdc` and `plantuml` are frequently absent — all five were absent on the authoring machine, where `command -v dot d2` exits 1. Probe first; when the probe fails, take the last row instead:

```bash
command -v dot >/dev/null 2>&1 && dot -Tsvg graph.dot   # inline the result; the binary never ships
```

```html
<pre role="img" aria-label="auth module map: handler calls verifier, verifier calls key cache and clock">
  handler ──▶ verifier ──▶ key-cache
                  └──────▶ clock
</pre>
```
Monospace is the one case where `1ch == 1 character` exactly, so `<pre>` is the only layout computable at authoring time. W3C WAI technique H86 licenses `role="img"` + `aria-label` on ASCII art as an accessible form.

---

## The hard rule

**An SVG never contains a text label that must fit inside a shape whose size you also chose.** That combination is the single failure mode. When a label needs a box, the box is a CSS box and it sizes itself.

---

## Seven SVG rules

Apply these when geometry is the content and SVG is unavoidable.

1. Never rely on measuring text — there is no `getBBox()` at authoring time.
2. Fixed lattice only, declared as a comment on line 1 — `<!-- grid: 640x200 viewBox, 40px step, margin 20 -->` — and every x/y is a multiple of the step.
3. Clamp every `<text>`: **`textLength = ceil(chars × 0.6 × fontSize)` with `lengthAdjust="spacingAndGlyphs"`**. Overflow becomes impossible and a bad estimate only stretches. Verified counter-example: `textLength=80` on the 3-char label "API" at font-size 15 renders grotesquely stretched; `3 × 0.6 × 15 = 27` renders clean.
4. Monospace is the exception — width = chars × 1ch exactly.
5. One `<marker orient="auto-start-reverse">` def serves all edges, in place of hand-drawn triangles.
6. Labels ride in `<text>` with the clamp from rule 3, never in `<foreignObject>` — Safari needs fixed px width/height there, ignores percentages, often drops external CSS, and fails silently on invalid HTML.
7. The viewBox hugs the content and `svg { width:100%; max-width:<viewBox width>px; height:auto; }` — without the cap the SVG upscales and its text renders out of scale with the surrounding UI.

```svg
<!-- grid: 640x200 viewBox, 40px step, margin 20 -->
<text x="40" y="120" font-size="15" textLength="27" lengthAdjust="spacingAndGlyphs">API</text>
```

---

## The two legal SVG shapes

Every SVG in the artifact is exactly one of these two.

```html
<!-- decorative -->
<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">…</svg>

<!-- informative -->
<figure>
  <svg role="img" aria-labelledby="t1 d1" viewBox="0 0 640 200" style="width:100%;max-width:640px;height:auto">
    <title id="t1">p95 latency by week</title>
    <desc id="d1">Rises from 210 ms in week 1 to 344 ms in week 6.</desc>
    …
  </svg>
  <figcaption>p95 latency grew 64% over six weeks; the step is at the week-4 deploy.</figcaption>
</figure>
```
The `<figcaption>` states the diagram's claim in prose, so the diagram is deletable without losing the point. Cross-screen-reader testing (Deque) found `role="img"` + `<title>` + `<desc>` + `aria-labelledby` on both was the only extended pattern with nothing ignored. Icon-only buttons put the name on the button and hide the svg.

---

## Proximity is two-sided

Related annotation stays within **~140px** of the line it annotates. Unrelated blocks stay **≥220px** apart, or separated by a container boundary. Jamming unrelated content to ~59px increases micro-switches between unrelated representations — which is precisely what a dense uniform card grid does.

---
