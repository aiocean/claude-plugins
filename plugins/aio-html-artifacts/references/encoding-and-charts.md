# Encoding and charts

**Settles:** which visual channel encodes a given quantity, the thresholds that decide chart against table against sentence, the mandatory shape every chart in this plugin takes, and the paste-ready comparison row and inline sparkline.

**When this file loads:** two or more numbers get read against each other in the output. A single number in a sentence takes no chart, and a page with nothing to plot ships none — inventing a metric to fill a tile is the failure the thresholds below exist to prevent.

**Partial read:** `Encoding ladder` plus `Numeric thresholds` answer "chart or not" on their own. `Mandatory chart shape` is the markup contract and is self-contained.

## Contents

- [Encoding ladder](#encoding-ladder)
- [The card-grid test](#the-card-grid-test)
- [Numeric thresholds](#numeric-thresholds)
- [Small multiples vs overlay](#small-multiples-vs-overlay)
- [Comparators](#comparators)
- [Amar task to required component](#amar-task-to-required-component)
- [Mandatory chart shape](#mandatory-chart-shape)
- [Comparison row](#comparison-row)
- [Inline sparkline](#inline-sparkline)
- [Numerals and highlighting](#numerals-and-highlighting)
- [Chart honesty](#chart-honesty)

## Encoding ladder

| Rank | Magnitude channel (ordered/quantitative) | Identity channel (categorical) | HTML realisation |
|---|---|---|---|
| 1 | Position on a common scale | Spatial region | aligned bars in a table column; dot plot; shared axis |
| 2 | Position on an unaligned scale | Colour hue | small multiples, identical y-domain |
| 3 | Length (1D size) | Motion (avoid) | `<div>` width in a shared-width track |
| 4 | Tilt / angle | Shape | slope line between two aligned points |
| 5 | Area (2D size) | — | bubble — requires justification |
| 6 | Depth (3D position) | — | **BANNED** |
| 7 | Colour luminance | — | heat cell, ordinal only |
| 8 | Colour saturation | — | last resort |
| 9-10 | Curvature, volume | — | **BANNED** |

**Hard legality** (invalid, not merely weak): quantities are carried by **position and size only**; ordinal data (severity, priority, confidence) by position, length, or lightness — never hue alone; nominal data (status, owner, service) by spatial region, hue, or shape — never size or length; when the data spans zero, position on a common scale replaces size, because a bar cannot be shorter than nothing. Treemaps stay out of review, incident, and comparison artifacts: rectangles at 1:1 aspect ratio measured *worst*, which removes their main defence.

## The card-grid test

If two numbers are meant to be compared and they sit in separate cards, the artifact encodes their difference with **nothing** — a card grid is Cleveland & McGill rank 0, not a taste preference. Move them into one aligned track before styling anything.

## Numeric thresholds

```
chart_min_height_px: 80        # 40px is significantly worse, p<0.001
chart_height_ceiling_px: 320   # no accuracy gain above ~80px on a 0-100 scale
gridline_min_spacing_px: 8
sparkline_height_px: 14-20     # word-sized exception; inline only, no axes
categorical_colors_max: 10
histogram_bins: 8-12           # outside this fires a Draco soft violation
series_per_chart_max: 4        # >4 overlaid -> small multiples          [convention]
small_multiples_max: 24                                                   [convention]
non_positional_channels_max: 2
precision_significant_digits: 3
table_rows_before_sort_control: 12
table_rows_before_pagination: 200                                         [convention]
options_visible_side_by_side_max: 4    # working memory is 3-5 chunks, NOT 7±2
kpi_tiles_in_a_glance_row_max: 4
```

## Small multiples vs overlay

Pick by N, the number of series:

- **N = 1** — a single chart.
- **N ≤ 4, lines rarely cross** — overlay, direct-label each line at its right end, no legend.
- **N in 5..24** — small multiples: identical mark, scale, and size; sorted by the value the reader cares about; the full set ghosted grey behind each panel.
- **N > 24** — aggregate, or a sorted table with a sparkline column.

Every comparandum stays on one screen at once, in one static layout: eyes beat memory, so a difference the reader has to hold across an animation, a tab, an accordion, or a slide is a difference they cannot see.

## Comparators

Every headline number carries a comparator on the same scale — prior value, target, budget, or peer. A bare number is a defect: alone it states a magnitude the reader has no way to judge as good or bad.

## Amar task to required component

Name the 1-3 tasks the reader performs before generating HTML; each named task brings its component.

| Task | Required component |
|---|---|
| Retrieve Value | definition list, or table with a filter box |
| Filter | client-side filter control with a live result count |
| Compute Derived Value | a precomputed summary row |
| Find Extremum | table sorted DESC by default + top-N callout |
| Sort | clickable column headers, sort state visible in the DOM |
| Determine Range | min/max/median printed, or an axis with a domain label |
| Characterize Distribution | histogram (8-12 bins) or strip plot — never a mean alone |
| Find Anomalies | outliers pre-highlighted + the violated expectation stated |
| Cluster | grouped/faceted layout with a named grouping key |
| Correlate | scatter with both axes labelled + the confound named in prose |

If the only task is Retrieve Value, a table beats every chart. Say so and ship the table.

## Mandatory chart shape

```html
<figure class="chart" role="group" aria-labelledby="c1-cap">
  <figcaption id="c1-cap">Open findings by severity — 62 total, 12 of 50 modules scanned.</figcaption>
  <svg aria-hidden="true" focusable="false" viewBox="0 0 640 200"><!-- marks --></svg>
  <details class="chart-data">
    <summary>Values behind this chart</summary>
    <table><thead><tr><th>Severity</th><th>Count</th></tr></thead>
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

One node satisfies accessibility, machine readers, and provenance at once: the `<figcaption>` carries takeaway and scope, the `aria-hidden` svg keeps unreadable marks out of the accessibility tree so the `<details>` table is what a screen reader and a print preview get, and the JSON island records the command, the time it ran, and what was skipped — so a reader re-fetches the values instead of trusting the picture.

## Comparison row

The literal card-grid replacement — two numbers in one aligned track, on a shared scale.

```html
<table class="cmp">
  <caption>Test failures by module — sorted descending. Baseline: last green build (2026-08-06).</caption>
  <thead><tr><th scope="col">Module</th><th scope="col">Failures</th><th scope="col">vs baseline</th></tr></thead>
  <tbody>
    <tr><th scope="row">auth</th>
        <td class="num"><span class="bar" style="--v:.94"></span><b>47</b></td>
        <td class="delta up">+41</td></tr>
    <tr><th scope="row">billing</th>
        <td class="num"><span class="bar" style="--v:.24"></span><b>12</b></td>
        <td class="delta up">+2</td></tr>
  </tbody>
</table>
```
```css
.cmp{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums lining-nums;
     font-feature-settings:"tnum" 1,"lnum" 1}
.cmp caption{text-align:left;color:var(--muted);font-size:.875rem;padding-bottom:.5rem}
.cmp th,.cmp td{border:0;border-bottom:1px solid var(--rule);padding:.35rem .5rem;text-align:left}
.cmp td.num{position:relative;width:60%}
.cmp .bar{position:absolute;inset:.35rem auto .35rem 0;width:calc(var(--v)*100%);
          background:var(--bar-bg);border-left:3px solid var(--bar);z-index:0}
.cmp .num b{position:relative;z-index:1;font-weight:600}
.cmp .delta.up::before{content:"▲ "} .cmp .delta.down::before{content:"▼ "}  /* redundant shape, not hue alone */
@media print{.cmp .bar{border-left-width:4px;background:none}}
```

## Inline sparkline

The dataword rule: a trend mentioned in a sentence gets a sparkline **in** that sentence, at the point the sentence makes its claim, so the shape and the number are read in one fixation.

```html
<p>p95 latency on <code>checkout</code> has been climbing for six days
  <span class="spark" role="img" aria-label="sparkline: 210, 214, 228, 251, 290, 344 ms; rising">
    <svg viewBox="0 0 60 16" preserveAspectRatio="none" focusable="false">
      <polyline points="0,13 12,12.6 24,11.4 36,9 48,5.2 60,1"/><circle cx="60" cy="1" r="1.6"/>
    </svg></span>
  <b>344&nbsp;ms</b> <span class="spark-band">(90-day band 190–260&nbsp;ms)</span>.</p>
```
```css
.spark{display:inline-block;width:4.5em;height:1em;vertical-align:-0.15em;margin:0 .15em}
.spark svg{width:100%;height:100%;overflow:visible}
.spark polyline{fill:none;stroke:var(--ink);stroke-width:1.25;vector-effect:non-scaling-stroke}
```

## Numerals and highlighting

**Numerals, belt-and-braces.** Every table of numbers carries all three: `font-variant-numeric: tabular-nums lining-nums`, `font-feature-settings:"tnum" 1,"lnum" 1`, and right-aligned numeric columns — right-alignment is the only part that survives a system font lacking `tnum`. Any inline figure that changes (timer, counter, live metric) carries `tabular-nums` too, so the surrounding text holds still instead of jittering on each update.

**Highlighting.** One pop-out channel is active per view — hue, weight, size, or position offset — and everything else sits at base ink, because conjunctions of two channels do not pop out. A hue used for pop-out carries no category at the same time. Render the view in greyscale as a test: if the verdict is still findable, the highlighting is sound.

## Chart honesty

**A latency chart plots percentiles, and an average is not one of them.** Draw p50 and p99 (or p95) as separate series and keep the maximum, because a mean is a value no request experienced and it absorbs the tail the reader came for: "averaging request latencies may seem attractive, but obscures an important detail", while a high-order percentile "shows you a plausible worst-case value, [and] the 50th percentile (also known as the median) emphasizes the typical case" — Google SRE book, *Service Level Objectives* [DOCTRINE]. Each series label carries its aggregation window in that book's own form — `p99, averaged over 1 minute`, `p50, every 10 seconds` — since a percentile with no window is unreproducible. Merged percentiles come from recomputing over merged histograms: Hartmann measured ~300% error from averaging an hour of per-minute percentiles against the true hourly percentile, on production data [MEASURED, time-aggregation case].

**The coordinated-omission sentence.** Any latency figure the artifact did not itself measure with a constant-rate harness carries this line, as text, inside the figure:

```html
<p class="caveat">Latencies are reported as the harness recorded them. A harness that waits for a
slow response stops issuing the requests that would have arrived during the stall, so those
requests are absent from the tail instead of in it, and the percentiles above read as a floor.
wrk2's own example puts an uncorrected p99 at 6.04&nbsp;ms against a corrected 1.27&nbsp;s for the
same 1.4&nbsp;s stall — about 210&times;.</p>
```

**A benchmark number travels with its disclosure.** Four `<dt>`s, inside the same `<figure>` as the chart, so they survive the figure being screenshotted out of the report:

```html
<dl class="bench-env">
  <dt>Environment</dt><dd>c7g.4xlarge, 16 vCPU, Linux 6.8.0, Go 1.25.1, corpus a4f19c2, cgroup cpu.max unset</dd>
  <dt>Runs</dt><dd>10 per arm, arms interleaved — median 412 MB/s, min 398, max 421, IQR 9</dd>
  <dt>Baseline</dt><dd>v2.6.4, same host, same session, same corpus — median 349 MB/s</dd>
  <dt>Out of scope</dt><dd>This measures encode throughput on one 4 MB JSON corpus on one host. It
    carries no claim about end-to-end request latency, about other payload shapes, or about hosts
    with a different core count.</dd>
</dl>
```

**Rendered digits are measured digits.** Three significant figures is the ceiling (`precision_significant_digits: 3`), and a figure drops below that ceiling when its measurement is coarser: a p99 over 200 samples renders `344 ms`, not `344.27 ms`, because the sampling error is wider than the hundredths place. A percentage whose denominator is under 100 renders as the fraction — `12 of 50`, not `24.0%` — so the reader sees how much evidence produced it. A derived ratio carries the significant figures of its least precise input. A spread that exists appears beside the central value; a lone median implies a precision the runs did not have.
