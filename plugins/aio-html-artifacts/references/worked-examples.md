# Worked examples — six before→after pairs

Each pair shows markup a model actually emits, the markup that replaces it, and one line naming the
mechanism. Reuse the mechanism; regenerate the subject, the palette, and the type pairing.

**Settles:** what the replacement markup looks like for six specific defects — card soup, container
headings, paraphrased code, unitless bars, colour-only status, and a scaled-down slide.

**When this file loads:** a drafted block would have come out the same for any subject in the genre,
or a validator finding names one of the six defects above. Composing a first draft that already
carries its evidence inline reads the genre grammar instead.

**Partial read:** the six pairs are numbered and independent. One drafted defect reads as one pair,
about 2 KB of the 16 KB here.

## Contents

1. [Card-soup findings → severity-ordered list with evidence inline](#1-card-soup-findings--severity-ordered-list-with-evidence-inline)
2. [Container headings → claim headings](#2-container-headings--claim-headings)
3. [Paraphrased code conclusion → annotated code with a full anchor](#3-paraphrased-code-conclusion--annotated-code-with-a-full-anchor)
4. [Unitless div-bar → SVG chart with units, baseline, source, takeaway, table](#4-unitless-div-bar--svg-chart-with-units-baseline-source-takeaway-table)
5. [Colour-only status → glyph + text + colour](#5-colour-only-status--glyph--text--colour)
6. [16:9 slide scaled down → vertical reflow at the type-size floor](#6-169-slide-scaled-down--vertical-reflow-at-the-type-size-floor)

---

## 1. Card-soup findings → severity-ordered list with evidence inline

<example>

Before — three identical rounded boxes, severity as a badge hue, no evidence:

```html
<div class="findings-grid">
  <div class="finding-card">
    <div class="card-icon">🔒</div>
    <h3>Authentication</h3>
    <p>The authentication module has some issues that should be addressed. Session
       handling could be improved to follow security best practices.</p>
    <span class="badge badge-red">High</span>
  </div>
  <div class="finding-card">
    <div class="card-icon">⚡</div>
    <h3>Performance</h3>
    <p>Several queries appear to be inefficient and may cause slowdowns under load.</p>
    <span class="badge badge-yellow">Medium</span>
  </div>
  <div class="finding-card">
    <div class="card-icon">📦</div>
    <h3>Dependencies</h3>
    <p>A few packages are outdated. Consider upgrading them.</p>
    <span class="badge badge-gray">Low</span>
  </div>
</div>
<style>
.findings-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.finding-card{border-radius:12px;border-left:4px solid #6366f1;padding:24px;background:#fff;
  box-shadow:0 4px 6px -1px rgba(0,0,0,.1)}
</style>
```

After — position encodes severity, each claim carries its own proof, the unmeasured cell is visible:

```html
<ol class="findings stack">
  <li class="finding" id="f1" data-severity="critical">
    <h3>A stolen session token survives a password reset</h3>
    <p data-claim="observed" data-src="src-reset"><code>resetPassword()</code> writes the new
      hash and returns; it calls <code>sessions.revokeAll(userId)</code> nowhere in the file.</p>
    <figure class="src" id="src-reset" data-kind="code"
      data-repo="atlas/web" data-sha="9f1c2b7a4d5e6f708192a3b4c5d6e7f809a1b2c3"
      data-path="app/auth/reset.ts" data-lines="88-94" data-retrieved="2026-08-13T09:12Z">
      <figcaption><a href="https://github.com/atlas/web/blob/9f1c2b7a4d5e6f708192a3b4c5d6e7f809a1b2c3/app/auth/reset.ts#L88-L94">
        atlas/web@9f1c2b7 · app/auth/reset.ts:88-94 · inspected 2026-08-13T09:12Z</a></figcaption>
      <pre><code>await users.update(id, { hash: await argon2.hash(next) });
await audit.write("password.reset", { id });
return { ok: true };</code></pre>
    </figure>
    <p data-claim="inferred" data-confidence="likely" data-basis="src-reset">A token captured
      before the reset keeps working until its 30-day TTL expires
      <b class="conf">likely (55-80%)</b>.</p>
    <p class="impact">Call <code>sessions.revokeAll(id)</code> above the return in
      <code>reset.ts:93</code>.</p>
  </li>

  <li class="finding" id="f2" data-severity="medium">
    <h3>The disputes list issues one query per row</h3>
    <figure class="src" id="src-disputes" data-kind="code"
      data-repo="atlas/web" data-sha="9f1c2b7a4d5e6f708192a3b4c5d6e7f809a1b2c3"
      data-path="app/disputes/list.ts" data-lines="49-51" data-retrieved="2026-08-13T09:12Z">
      <figcaption><a href="https://github.com/atlas/web/blob/9f1c2b7a4d5e6f708192a3b4c5d6e7f809a1b2c3/app/disputes/list.ts#L49-L51">
        atlas/web@9f1c2b7 · app/disputes/list.ts:49-51 · inspected 2026-08-13T09:12Z</a></figcaption>
      <pre><code>for (const d of rows) { d.shop = await shops.byId(d.shop_id); }</code></pre>
    </figure>
    <p data-claim="observed" data-src="src-disputes">One round trip per row, 200 rows per page.</p>
    <div class="fact gap"><span>Production p95</span><strong>Not measured</strong>
      <small>would need LT-204 rerun</small></div>
  </li>
</ol>
```

Why: a card grid encodes magnitude with no channel at all — Cleveland & McGill rank 0 — so
"High" and "Medium" are two hues of the same box, while an ordered list encodes severity by
position and puts each proof inside the item that asserts it.

</example>

---

## 2. Container headings → claim headings

<example>

Before — topic-shaped, evidence detached:

```html
<h1>Checkout Deploy Incident Report</h1>
<div class="kpi-grid">
  <div class="kpi"><span class="kpi-num">4h 12m</span><span class="kpi-label">Duration</span></div>
  <div class="kpi"><span class="kpi-num">12,400</span><span class="kpi-label">Users affected</span></div>
  <div class="kpi"><span class="kpi-num">3</span><span class="kpi-label">Services</span></div>
  <div class="kpi"><span class="kpi-num">P1</span><span class="kpi-label">Severity</span></div>
</div>
<h2>Background</h2>
<h2>Timeline</h2>
<h2>Analysis</h2>
<h2>Appendix: Logs</h2>
```

After — verdict-shaped, evidence adjacent:

```html
<h1>The deploy failed because the migration ran before the feature flag flipped.</h1>
<p class="lede">Likely (55-80%). 12,400 users hit 500s for 4h12m.
  One ordering change in <code>deploy.yml</code> prevents a repeat.</p>
<pre><code>// deploy.yml:34-37 — migrate runs at step 2, flag flips at step 5
- run: ./bin/migrate up          # step 2
- run: ./bin/flags set checkout_v2=on   # step 5</code></pre>

<h2>The 500s start 90 seconds after step 2, not after step 5</h2>
<h2>The migration drops the column the old code path still reads</h2>
<h2>Reordering to flag-then-migrate makes the window empty</h2>
```

Why: the headline is the finding, not the topic; the tiles are gone because duration and user
count are consequences, not the answer; the decisive four lines sit above the section reasoning
about them.

</example>

---

## 3. Paraphrased code conclusion → annotated code with a full anchor

<example>

Before — the conclusion is about code the reader cannot see:

```html
<h2>Analysis</h2>
<p>After reviewing the worker pool implementation, it appears that the concurrency limit
   is set relatively low, which is probably the main reason for the latency we are seeing
   under load. Increasing this value should help significantly.</p>
```

After — the code, a numbered callout to a real note, and an anchor that re-fetches:

```html
<h2>A hard-coded cap of 32 workers is what pins p99 at 840&nbsp;ms</h2>
<figure class="src" id="src-pool" data-kind="code"
  data-repo="atlas/api" data-sha="4d5e6f708192a3b4c5d6e7f809a1b2c39f1c2b7a"
  data-path="internal/pool/pool.go" data-lines="41-46" data-retrieved="2026-08-13T09:12Z">
  <figcaption><a href="https://github.com/atlas/api/blob/4d5e6f708192a3b4c5d6e7f809a1b2c39f1c2b7a/internal/pool/pool.go#L41-L46">
    atlas/api@4d5e6f7 · internal/pool/pool.go:41-46 · inspected 2026-08-13T09:12Z</a></figcaption>
  <pre class="code"><code><span class="l">func New(cfg Config) *Pool {</span>
<span class="l mark">  maxWorkers := 32<a class="cn" href="#n1">1</a></span>
<span class="l mark">  sem := make(chan struct{}, maxWorkers)<a class="cn" href="#n2">2</a></span>
<span class="l">  return &amp;Pool{sem: sem}</span>
<span class="l">}</span></code></pre>
  <ol class="notes">
    <li id="n1"><code>cfg.MaxWorkers</code> is read nowhere in this file — the config field is dead.</li>
    <li id="n2">Every <code>Submit</code> blocks on this channel, so 32 is the ceiling on in-flight work.</li>
  </ol>
</figure>
<p data-claim="inferred" data-confidence="likely" data-basis="src-pool">Raising the cap moves
  p99 below the 500&nbsp;ms target <b class="conf">likely (55-80%)</b>.</p>
<p data-claim="assumed">I assumed request mix stays at the current 9:1 read/write ratio;
  I did not verify this against production traffic.</p>
```

Why: "it appears" and "probably" carry no band and no bytes, while the anchor's four fields —
repo, 40-hex SHA, `path:lines`, inspection time — make the claim re-fetchable, and the callout
is a plain `<a>` to a real `<li>`, so it works with no JS and the note text stays searchable.

</example>

---

## 4. Unitless div-bar → SVG chart with units, baseline, source, takeaway, table

<example>

Before — heights in percent of nothing:

```html
<div class="chart">
  <div class="bar" style="height:14%"><span>Critical</span></div>
  <div class="bar" style="height:59%"><span>High</span></div>
  <div class="bar" style="height:100%"><span>Medium</span></div>
  <div class="bar" style="height:41%"><span>Low</span></div>
</div>
<style>
.chart{display:flex;align-items:flex-end;gap:12px;height:200px}
.bar{flex:1;border-radius:8px 8px 0 0;background:linear-gradient(180deg,#818cf8,#6366f1)}
</style>
```

After — one node carrying the marks, the values, and the provenance:

```html
<figure class="chart" role="group" aria-labelledby="c1-cap">
  <figcaption id="c1-cap">Open findings by severity — 62 total, 12 of 50 modules scanned.</figcaption>
  <p class="takeaway">Medium findings outnumber critical ones 7:1, so this queue is a triage
    problem rather than a firefight.</p>
  <!-- grid: 640x200 viewBox, 40px step, margin 20. y: 0 at 180, 30 at 44 (4.533 px per finding).
       label widths: chars * 0.6 * font-size -->
  <svg aria-hidden="true" focusable="false" viewBox="0 0 640 200">
    <text x="52" y="48" text-anchor="end" font-size="12" fill="currentColor">30</text>
    <text x="52" y="184" text-anchor="end" font-size="12" fill="currentColor">0</text>
    <line x1="60" y1="180" x2="620" y2="180" stroke="currentColor" stroke-width="1"/>
    <rect x="80"  y="162" width="80" height="18"  fill="var(--bar)"/>
    <rect x="200" y="103" width="80" height="77"  fill="var(--bar)"/>
    <rect x="320" y="49"  width="80" height="131" fill="var(--bar)"/>
    <rect x="440" y="126" width="80" height="54"  fill="var(--bar)"/>
    <text x="80"  y="196" font-size="12" textLength="72" lengthAdjust="spacingAndGlyphs" fill="currentColor">critical 4</text>
    <text x="200" y="196" font-size="12" textLength="50" lengthAdjust="spacingAndGlyphs" fill="currentColor">high 17</text>
    <text x="320" y="196" font-size="12" textLength="65" lengthAdjust="spacingAndGlyphs" fill="currentColor">medium 29</text>
    <text x="440" y="196" font-size="12" textLength="43" lengthAdjust="spacingAndGlyphs" fill="currentColor">low 12</text>
  </svg>
  <details class="chart-data">
    <summary>Values behind this chart</summary>
    <table><thead><tr><th scope="col">Severity</th><th scope="col">Count (open findings)</th></tr></thead>
      <tbody><tr><td>critical</td><td>4</td></tr><tr><td>high</td><td>17</td></tr>
             <tr><td>medium</td><td>29</td></tr><tr><td>low</td><td>12</td></tr></tbody></table>
  </details>
  <script type="application/json" class="chart-src">
  {"source":"go test ./... 2>&1 | tee run.log","ran_at":"2026-08-13T09:14:02Z",
   "scope":{"scanned":12,"total":50,"skipped_reason":"no test target"},
   "values":[["critical",4],["high",17],["medium",29],["low",12]]}
  </script>
</figure>
```
```css
@media print { .chart-data[open], .chart-data { display: block } .chart-data > * { display: block !important } }
```

Why: a percentage height names no unit, no baseline, and no number a reader can copy, whereas
the SVG draws from a zero baseline on a declared lattice, the caption states the scope, the
takeaway states the point in words, and the `<details>` table plus the JSON island keep the
values readable when the picture is not.

</example>

---

## 5. Colour-only status → glyph + text + colour

<example>

Before — the status is a hue and nothing else:

```html
<table class="status">
  <tr><td>auth</td><td><span class="dot red"></span></td></tr>
  <tr><td>billing</td><td><span class="dot green"></span></td></tr>
  <tr><td>search</td><td><span class="dot gray"></span></td></tr>
</table>
<style>
.dot{display:inline-block;width:10px;height:10px;border-radius:50%}
.dot.red{background:#ef4444}.dot.green{background:#22c55e}.dot.gray{background:#9ca3af}
</style>
```

After — the word carries the status, the glyph carries the shape, colour is the third channel:

```html
<table class="status cmp">
  <caption>Build status by module — <code>go test ./...</code> at 2026-08-13T09:14:02Z.</caption>
  <thead><tr><th scope="col">Module</th><th scope="col">Status</th><th scope="col">Failing tests</th></tr></thead>
  <tbody>
    <tr><th scope="row">auth</th>
        <td class="st st-fail"><span aria-hidden="true">✕ </span>Failing</td>
        <td class="num">47</td></tr>
    <tr><th scope="row">billing</th>
        <td class="st st-pass"><span aria-hidden="true">✓ </span>Passing</td>
        <td class="num">0</td></tr>
    <tr><th scope="row">search</th>
        <td class="st st-unknown">Not measured <small>needs: LT-204 rerun</small></td>
        <td class="num">—</td></tr>
  </tbody>
</table>
```
```css
.st { font-weight: 600 }
.st-fail { color: var(--danger) } .st-pass { color: var(--ok) } .st-unknown { color: var(--muted) }
@media (forced-colors: active) { .st { color: CanvasText } }
```

Why: colour is the only channel a red/green dot uses, so the status is gone in forced-colors
mode, in greyscale print, and in the greyscale render test — the text label survives all three,
and the unmeasured module reads as a finding instead of a third colour.

</example>

---

## 6. 16:9 slide scaled down → vertical reflow at the type-size floor

<example>

Before — a fixed 1280×720 box hidden by JS and shrunk on phones:

```html
<div class="slide active"><h2>Migration cutover</h2><ul><li>…</li></ul></div>
<style>
.slide{width:1280px;height:720px;display:none;padding:64px}
.slide.active{display:flex;flex-direction:column;justify-content:center}
@media (max-width:768px){
  .slide{transform:scale(.3);transform-origin:top left;font-size:11px}
}
</style>
```

After — slides in normal flow, snapped on scroll, reflowing at the floor, printing as 16:9:

```html
<section class="slide" id="s3" aria-labelledby="s3-t">
  <h2 id="s3-t">Cutover fails closed: traffic stays on v1 until the checksum matches</h2>
  <p>Both stores take writes for 20 minutes. The read path flips only when
    <code>verify-checksums</code> exits 0, so a mismatch leaves users on v1.</p>
</section>
```
```css
body { scroll-snap-type: y mandatory; overflow-x: hidden; }
.slide { width:100vw; min-height:100svh; scroll-snap-align:start; scroll-snap-stop:always;
         display:flex; flex-direction:column; justify-content:center; padding:6vh 6vw; }
.slide h2      { font-size: clamp(2rem, 4vw, 3.25rem); }      /* 32px at 390px, 58px at 1440px */
.slide p,
.slide li      { font-size: clamp(1rem, 1.6vw, 1.25rem); }    /* 16px at 390px, 20px at 1440px */
@media (max-width: 30rem) {
  body   { scroll-snap-type: none; }
  .slide { min-height: 0; justify-content: flex-start; padding: 4vh 6vw; }
}
@page { size: 1280px 720px; margin: 0; }
@media print {
  html, body { background:#fff; color:#000; scroll-snap-type:none; overflow:visible; height:auto; }
  .deck-hud { display:none !important; }
  .slide { width:1280px; height:720px; min-height:0; page-break-after:always; break-inside:avoid; }
  .slide:last-child { break-after: auto; }
}
```

Why: scaling a 1280×720 box to a phone drives every glyph under the reading floor and
`display:none` deletes the deck for a reader with JS off and for the printer, while slides in
normal flow hold 16px body / 32px titles at 390px, reflow to a vertical read below 30rem, and
print as exact 16:9 pages.

</example>
