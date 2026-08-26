# Diagram recipes in HTML and CSS

**Settles:** the paste-ready markup and CSS for the five structures that size themselves to their
own text — a flow with labelled edges, annotated code with line callouts, Tufte sidenotes, a
timeline, a phase strip, and a sequence between participants. Each carries its responsive block,
so one set of markup serves wide and narrow.

**When this file loads:** the artifact shows a pipeline, an architecture with labelled boxes, an
incident or changelog sequence, a phase or state progression, a message exchange, or code with
numbered callouts. Geometry-as-content — a chart, a sparkline, a ratio bar — takes inline SVG
instead, and its rules are in `references/diagrams.md`.

**Partial read:** each `##` below is one complete recipe, markup plus CSS plus breakpoint. The
timeline block does not depend on the flow block.

## Contents
- [CSS flow with labelled edges](#css-flow-with-labelled-edges)
- [Annotated code with line callouts](#annotated-code-with-line-callouts)
- [Tufte sidenotes](#tufte-sidenotes)
- [Timeline, phase strip, sequence](#timeline-phase-strip-sequence)

---

## CSS flow with labelled edges

`grid-auto-columns` cycles its two values across the implicit columns — box, link, box, link — so a node track and an edge track alternate forever and no width is ever computed by hand. Markup alternates `<li class="node">` and `<li class="link"><i></i></li>`; each box sizes to its own text.

```css
.flow{list-style:none;margin:0;padding:0;display:grid;grid-auto-flow:column;
      grid-auto-columns:minmax(7.5rem,1fr) minmax(4.5rem,auto);align-items:stretch}
.flow .link i{display:block;width:100%;min-width:2rem;height:2px;background:var(--rail);position:relative}
.flow .link i::after{content:"";position:absolute;right:0;top:50%;translate:0 -50%;
  border:.32rem solid transparent;border-right:0;border-left-color:var(--rail)}
@media (max-width:44rem){
  .flow{grid-auto-flow:row;grid-auto-columns:auto}
  .flow .link i{width:2px;min-width:0;height:1.6rem;justify-self:start;margin-left:1.25rem}
  .flow .link i::after{right:auto;top:auto;bottom:0;left:50%;translate:-50% 0;
    border:.32rem solid transparent;border-bottom:0;border-top-color:var(--rail)}
}
```
The arrowhead is a CSS border triangle — four borders, three transparent — so swapping which border carries the colour rotates it with the layout at the breakpoint. The responsive block flips flow to rows, turns the rail from a horizontal 2px bar into a vertical one, and re-points the head from right-facing to down-facing. Same markup, no second diagram.

---

## Annotated code with line callouts

```css
.code{counter-reset:ln;tab-size:2;overflow-x:auto}
.code .l{display:block;counter-increment:ln;border-left:3px solid transparent}
.code .l::before{content:counter(ln);display:inline-block;width:3ch;margin-right:1.25ch;
  text-align:right;color:var(--muted);opacity:.65;user-select:none}
.code .l.mark{background:var(--accent-soft);border-left-color:var(--accent)}
.cn{display:inline-block;min-width:1.35em;height:1.35em;margin-left:.75ch;border-radius:999px;
  background:var(--accent);color:#fff;font:600 .7rem/1.35em var(--sans);text-align:center;text-decoration:none}
.notes li:target{background:var(--accent-soft)}
```

Three properties carry it:
- Line numbers come from a CSS counter in `::before`, so they are not part of the text and a reader who selects the block copies runnable code.
- The callout `<a class="cn" href="#n3">3</a>` is a real anchor to a real `<li id="n3">` in the notes list: it works with `<script>` deleted, it is keyboard reachable, `:target` highlights the landed note, and the note text is findable with the browser's own search.
- There are zero coordinates anywhere, so the annotation stays attached at any width and at any font size the reader chooses.

---

## Tufte sidenotes

Zero JS, and one mechanism satisfies both "annotation adjacent to its referent" and "collapsible for expert readers".

```css
:root { --prose:42rem; --aside:15rem; --gutter:2rem; --aside-total:17rem; }
body { counter-reset: sidenote; }
.sidenote,.marginnote{ float:right; clear:right; width:var(--aside);
  margin-right:calc(-1 * var(--aside-total)); margin-top:.3rem; font-size:.82em; line-height:1.4; }
.sidenote-number{ counter-increment: sidenote; }
.sidenote-number::after{ content:counter(sidenote); font-size:.7em; vertical-align:super; line-height:0; }
.sidenote::before{ content:counter(sidenote) " "; font-size:.7em; vertical-align:super; line-height:0; }
input.margin-toggle{ display:none; }
/* INVARIANT: breakpoint == --prose + --aside-total + 3rem. Change --prose, recompute this. */
@media (max-width:62rem){
  label.margin-toggle:not(.sidenote-number){ display:inline; cursor:pointer; }
  .sidenote,.marginnote{ display:none; }
  .margin-toggle:checked + .sidenote{ display:block; float:none; width:100%; margin:.8rem 0;
    padding:.6rem .9rem; border-left:3px solid currentColor; }
}
@media print{ .sidenote,.marginnote{ display:block !important; float:right !important; } }
```

Markup order is load-bearing — `label`, then `input`, then `span`:

```html
<label for="sn-1" class="margin-toggle sidenote-number"></label>
<input type="checkbox" id="sn-1" class="margin-toggle">
<span class="sidenote">Measured on the 2026-03-04 canary, n=1,204 requests.</span>
```
The mobile reveal is `.margin-toggle:checked + .sidenote`, an adjacent-sibling combinator. Any wrapper placed between the input and the span silently breaks the mobile reveal while the desktop float still looks fine — so the three elements stay siblings, in that order.

---

## Timeline, phase strip, sequence

**Timeline** — three columns: time, rail, body. `<time datetime>` keeps the instant machine-readable; the rail is a 2px div with a dot, and the last item's rail stops short so the line has an end.

```html
<ol class="timeline">
  <li>
    <time datetime="2026-03-04T09:12Z">04 Mar 09:12</time>
    <i class="rail" aria-hidden="true"></i>
    <div class="body"><h3>Deploy 4f21a9 reaches canary</h3><p>Error rate flat at 0.4%.</p></div>
  </li>
  <li>
    <time datetime="2026-03-04T09:41Z">04 Mar 09:41</time>
    <i class="rail" aria-hidden="true"></i>
    <div class="body"><h3>p95 crosses 300 ms</h3><p>First page fires 29 minutes after the deploy.</p></div>
  </li>
</ol>
```
```css
.timeline{list-style:none;margin:0;padding:0}
.timeline>li{display:grid;grid-template-columns:auto 1.25rem minmax(0,1fr);gap:0 .75rem;align-items:stretch}
.timeline time{font-variant-numeric:tabular-nums;color:var(--muted);white-space:nowrap;padding-top:.15rem}
.timeline .rail{position:relative;justify-self:center;width:2px;background:var(--rail)}
.timeline .rail::before{content:"";position:absolute;top:.35rem;left:50%;translate:-50% 0;
  width:.55rem;height:.55rem;border-radius:50%;background:var(--rail)}
.timeline>li:last-child .rail{background:linear-gradient(var(--rail) 1.1rem,transparent 0)}
.timeline .body{padding:0 0 1.4rem}
.timeline h3{margin:0 0 .2rem;font-size:1rem}
@media (max-width:34rem){
  .timeline>li{grid-template-columns:1.25rem minmax(0,1fr)}
  .timeline .rail{grid-column:1;grid-row:1/3}
  .timeline time{grid-column:2;grid-row:1}
  .timeline .body{grid-column:2;grid-row:2}
}
```

**Phase / state strip** — `aria-current="step"` carries the state, and the current step also says so in text, so the status survives greyscale, print, and forced-colors.

```html
<nav aria-label="Rollout progress">
  <ol class="phases">
    <li>Design</li>
    <li>Canary</li>
    <li aria-current="step">Fleet 10%</li>
    <li>Fleet 100%</li>
  </ol>
</nav>
```
```css
.phases{display:flex;flex-wrap:wrap;gap:.25rem;list-style:none;margin:0;padding:0}
.phases li{flex:1 1 8rem;padding:.5rem .8rem .5rem 1.6rem;background:var(--surface);
  clip-path:polygon(0 0,calc(100% - .75rem) 0,100% 50%,calc(100% - .75rem) 100%,0 100%,.75rem 50%)}
.phases li[aria-current="step"]{background:var(--accent);color:var(--on-accent);font-weight:600}
.phases li[aria-current="step"]::after{content:" — now";font-weight:400}
@media (max-width:34rem){
  .phases{flex-direction:column}
  .phases li{flex:0 0 auto;clip-path:none;padding-left:.8rem;border-left:3px solid var(--rail)}
  .phases li[aria-current="step"]{border-left-color:var(--accent)}
}
```

**Sequence** — participants are columns, messages are rows. Each message spans from its sender's grid line to its receiver's, so the arrow is one CSS glyph on a border and there is no endpoint math. The message text names both participants, which is what makes the one-column mobile form lossless.

```html
<figure>
  <div class="seq" style="--cols:3">
    <b class="who" style="--c:1">client</b>
    <b class="who" style="--c:2">api</b>
    <b class="who" style="--c:3">queue</b>
    <p class="msg" style="--a:1;--b:3">client → api: POST /orders (201, 38 ms)</p>
    <p class="msg" style="--a:2;--b:4">api → queue: enqueue order.created</p>
    <p class="msg back" style="--a:2;--b:4">queue → api: ack at offset 91,204</p>
  </div>
  <figcaption>The API answers 201 before the queue acknowledges, so a dropped enqueue is invisible to the client.</figcaption>
</figure>
```
```css
.seq{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:.55rem 0}
.seq .who{grid-row:1;grid-column:var(--c);text-align:center;padding:.35rem;
  border-bottom:2px solid var(--rail)}
.seq .msg{grid-column:var(--a)/var(--b);margin:0;position:relative;font-size:.9rem;
  padding:.35rem .6rem .45rem;border-top:2px solid var(--rail)}
.seq .msg::after{content:"▶";position:absolute;top:-.78em;right:-.15em;color:var(--rail);font-size:.8em}
.seq .msg.back::after{content:"◀";right:auto;left:-.15em}
@media (max-width:44rem){
  .seq{grid-template-columns:minmax(0,1fr)}
  .seq .who{display:none}
  .seq .msg{grid-column:1;border-top:0;border-left:2px solid var(--rail)}
  .seq .msg::after,.seq .msg.back::after{content:none}
}
```
