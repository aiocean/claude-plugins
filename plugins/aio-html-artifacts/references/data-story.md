# Data story — structure, sequence, annotation, and the number

**Settles:** which of four narrative structures the artifact takes, what changes between two
consecutive views, what the annotation layer on a chart asserts, and the framing every headline
number carries.

**Boundary:** `encoding-and-charts.md` owns the encoding, the chart-or-table thresholds, the
`<figure class="chart">` shape and the significant-digit ceiling; `captions.md` the four-level
description model; `evidence-and-confidence.md` claim types and bands; `research-foundations.md`
every source, sample size, p-value and full quoted passage behind the labels below.

**When this file loads:** the artifact holds two or more views a reader moves between, or a chart
whose point is a threshold, a window, an event, or one series among many, or a number in a heading.

**Partial read:** the five `##` sections are independent. `Pick the structure` runs before markup;
`Annotate the point` is the markup and is self-contained.

Labels travel with each rule. **[MEASURED]** a published study backs the number. **[DOCTRINE]** an
institution mandates it in a retrievable standard. **[CONVENTION]** widely practised, counted in no
study. **[DERIVED]** the finding is published, the threshold is this plugin's, computed during
authoring. A finding whose source text stayed behind a blocked host is stated without quotation marks
and labelled.

## Contents

- [Pick the structure](#pick-the-structure)
- [Sequence the views](#sequence-the-views)
- [Annotate the point](#annotate-the-point)
- [Frame the number](#frame-the-number)
- [The annotation asserts a reading](#the-annotation-asserts-a-reading)

## Pick the structure

Runs after the spine selector, before markup. Writes `structure=` and `ordering=`, the latter one of
`linear`, `random access`, `user-directed` — Segel & Heer's enum (§4.1). Rules 2-4 are their three
hybrids, in the authors' own order of who holds control (§4.4).

```
Read top-down, stop at the first rule that fires.

1. `spine=` is incident, postmortem, decision record, or audit
   → LINEAR.  ordering= linear.  Interaction budget 0.
     One verdict reaches every reader, so no reader picks a path that omits it.
2. A row the reader will look for cannot be enumerated today — "what about my service,
   my region, my tenant" — and one finding lands before they look
   → MARTINI GLASS.  ordering= linear, then random access.
     Stem 3-5 sections, bowl exactly 1, the boundary between them named on the page.
3. Between 2 and 3 claims are believed only after the reader moves one parameter
   themselves (3 is this plugin's interaction ceiling; 1 such claim is a widget → rule 1)
   → INTERACTIVE SLIDESHOW.  ordering= linear.
4. The material is a set of peer instances under one theme, and any subset in any order
   is a complete read
   → DRILL-DOWN.  ordering= user-directed.
```

**Drill-down is the wrong structure for an incident report**, by its authors' own definition: it
"puts more emphasis on the reader-driven approach, letting the user dictate what stories are told and
when" (§4.4.3). An incident has one verdict and a timeline whose order *is* the argument.

**Everything the reader acts on lives in the martini glass stem**, because introductory stories added
to exploratory visualizations did not raise engagement with exploration [MEASURED, Boy et al.;
abstract only — the full text sits behind blocked hosts, so this carries no quotation and no
magnitude]. The bowl adds rows, not conclusions [DERIVED].

```html
<!-- MARTINI GLASS — stem is author-driven and needs no script; bowl is one surface. -->
<section id="verdict"><h2>p95 checkout latency breached the 300 ms SLO for 78 minutes</h2>…</section>
<section id="cause"><h2>The breach starts 18 minutes after the v2.7.1 deploy</h2>…</section>
<section id="fix"><h2>Rollback cleared it; the retry cap is the durable fix</h2>…</section>

<hr class="stem-end">
<section id="all-services" aria-labelledby="all-h">
  <h2 id="all-h">Every service, all 47 rows</h2>
  <p>The three sections above carry the finding. This table carries the rest of the data.</p>
  <table class="cmp"><caption>p95 by service, 14:00-16:00 UTC, sorted descending.</caption>
    <!-- all 47 rows rendered, no filter, no script --></table>
</section>
```

```html
<!-- INTERACTIVE SLIDESHOW — interaction lives "within the confines of each slide" (§4.4.2): it
     changes what is visible inside its own <section> and never changes which section is next.
     <details> supplies that at zero script and prints open via the base-layer listener. -->
<section class="scene">
  <h2>Retries triple the load the pool already cannot clear</h2>
  <figure class="chart">…</figure>
  <details><summary>Predict: what happens to queue depth when retry volume triples?</summary>
    <p>Depth goes 40 → 1,900 in 90 seconds; the pool clears 32 at a time.</p></details>
  <p class="takeaway">The retry budget, not the pool size, is the binding constraint.</p>
</section>
<section class="scene"><h2>…</h2>…</section>   <!-- identical internal skeleton -->
```

```html
<!-- DRILL-DOWN — one theme, peer instances on <details> + anchor links. The index table carries
     every instance's number, so the theme reads complete with nothing opened; each summary repeats
     its number, so a closed panel still answers the index question. -->
<h2 id="theme">Nine services missed their SLO in Q3</h2>
<table class="cmp"><caption>Q3 SLO misses, sorted by minutes over. Source: INC register.</caption>
  <tbody>
    <tr><th scope="row"><a href="#svc-checkout">checkout</a></th><td>344 ms</td><td>78 min</td></tr>
    <tr><th scope="row"><a href="#svc-search">search</a></th><td>210 ms</td><td>12 min</td></tr>
  </tbody>
</table>

<details id="svc-checkout"><summary>checkout — 78 minutes over, peak 344 ms, one incident</summary>
  <figure class="chart">…</figure></details>
<details id="svc-search"><summary>search — 12 minutes over, peak 210 ms, no incident</summary>
  <figure class="chart">…</figure></details>
```

## Sequence the views

The transition type is the name of the one thing that changes between view N and view N+1 — each
"represents a single change in one dimension of a data representation from one slide (visualization)
to the next". Hullman et al. coded twelve across 42 narrative visualizations; the three this plugin's
`transition-type=` key uses are starred.

```
Temporal      simple chronological * · reverse chronological · future chronological
Granularity   general→specific * · specific→general
Comparison    dimension walk * · measure walk        (Spatial proximity is a subset of these)
Causal        explicit cause · alternative reality
Dialogue      question & answer · who/what/when/where/why/how
```

```
THE CHECK, run between every consecutive pair of views.

Write five slots for view N and for view N+1, then diff them:

  independent variable · dependent variable · time window · granularity · chart form

Exactly one slot differs, and the name of that slot is the transition type, recorded once for
the whole artifact in `transition-type=`.

Two slots differ → insert the intermediate view that changes one of them, giving two
transitions of cost 1. The paper's own failure case: a bubble chart of GDP for North African
countries in 2000 followed by a bubble chart of GDP *per capita* in 2010 changes measure and
time together, so the reader carries two unknowns across one gap.
```

Cost 1 is a threshold rather than a gradient: readers were much less likely to take a cost-2 or
cost-3 transition over a cost-1 one, with no observable difference between 2 and 3 [MEASURED, n=143].
When several are legal the same study ranks them `Temporal > (Dimension | Measure) > Granularity`, so
material with a time axis takes the temporal walk and general→specific is the audit and review
default.

**Parallelism buys recall.** Repeating one pattern of transition types across section groups, in the
same internal order, buys memory for the sequence — reversed variants worst — while question accuracy
moved not at all [MEASURED, n=73 of 82]. Claim recall for it and nothing more.

## Annotate the point

**A chart carries its finding in the annotation layer, so a reader who looks only at the chart
reaches the same conclusion as one who reads the prose.** Annotation is "textual or graphical elements
that form an author-supplied communicative layer over the underlying encodings" (Rahman, Lange,
Quadri & Rosen, arXiv:2604.07691) — the same mark is annotation in one chart, encoding in another.

**Annotate more, not less**, Stokes et al.'s first guideline verbatim: "Rather than aiming for
maximally minimalist design, annotate charts with relevant text" [MEASURED, n=302, univariate line
charts]. Their Guideline 3 gives each level a position; `captions.md` defines the levels.

```
L1  elemental / encoded       → by the relevant axis.   Measured takeaway effect: almost none.
L2  statistical / relational  → by the relevant point.  1.6x vs L1 [1.06,2.40] p<.05
                                · 2.0x vs L3 [1.29,2.95] p<.01 · 1.8x vs L4 [1.44,2.22] p<.01.
                                This is the callout.
L3  perceptual / cognitive    → in the title.           2.2x for an L3 takeaway against an L4.
L4  external context          → by the relevant point.  Ties with L2 as most influential.
                                Event marker, period band.

Corollary: a chart whose only text is L1 — axis titles and a legend — has an annotation layer
of zero. Trend claims go in the caption; number claims go on the mark.
```

**Budget.** One primary annotation takes the strongest placement and emphasis so it is read first, by
one channel step rather than three. Text sits next to its target, a short connector serves when
proximity is infeasible, a key only when direct attachment would clutter (Rahman et al.); this
plugin's proximity figure is 140px. Total marks 3 typical, 5 the count at which the figure answers
more than one question [DERIVED from one practitioner's habit, named there "local guidance rather
than universal limits"].

**The chassis, all six primitives on one lattice.** Every `x`/`y` is a multiple of the 10px step
except the values the scale sets, which the line-1 comment names; every `<text>` carries `textLength
= ceil(chars × 0.6 × fontSize)`, which holds the layout without measuring a font. Verified during
authoring: XML parses, all seven `textLength` values fit the formula.

```html
<!-- grid: 640x240 viewBox, 10px step, margin 20; plot 60,40 -> 600,200. Scale-derived and
     declared: polyline points, the callout ring centre 340,64, the y of each series label. -->
<svg aria-hidden="true" focusable="false" viewBox="0 0 640 240">
  <!-- 1. period band, closed window: tint plus a dashed edge on both sides -->
  <rect class="band" data-annot="band" x="260" y="40" width="120" height="160"/>
  <line class="band-edge" x1="260" y1="40" x2="260" y2="200"/>
  <line class="band-edge" x1="380" y1="40" x2="380" y2="200"/>
  <text class="a-label" x="320" y="20" font-size="11" textLength="132"
        lengthAdjust="spacingAndGlyphs" text-anchor="middle">incident 14:02-15:40</text>

  <!-- 2. reference line with end label; the line stops at 520 so it never runs under the pill -->
  <line class="slo" data-annot="reference" x1="60" y1="80" x2="520" y2="80"/>
  <rect class="slo-pill" x="520" y="70" width="90" height="20" rx="4"/>
  <text class="slo-text" x="530" y="80" font-size="12" textLength="72"
        lengthAdjust="spacingAndGlyphs" dominant-baseline="middle">SLO 300 ms</text>

  <!-- 3. vertical event marker, label offset above -->
  <line class="event" data-annot="event" x1="440" y1="40" x2="440" y2="200"/>
  <text class="a-label" x="440" y="20" font-size="11" textLength="86"
        lengthAdjust="spacingAndGlyphs" text-anchor="middle">deploy v2.7.1</text>

  <!-- 4. one highlighted series against ghosted context: colour and weight, solid throughout -->
  <polyline class="ghost" points="60,170 140,168 220,164 300,162 380,160 460,166 540,164"/>
  <polyline class="ghost" points="60,186 140,184 220,182 300,180 380,178 460,182 540,180"/>
  <polyline class="focus" data-annot="highlight" points="60,150 140,146 220,120 300,88 340,64 380,72 460,110 540,132"/>

  <!-- 5. callout at one datum: ring plus elbow leader, no marker def, no arrowhead -->
  <circle class="ring" data-annot="callout" cx="340" cy="64" r="7"/>
  <path class="leader" d="M240 30 L300 30 L330 60"/>
  <text class="a-label" x="240" y="30" font-size="11" textLength="126"
        lengthAdjust="spacingAndGlyphs" text-anchor="end">p95 344 ms at 15:10</text>

  <!-- 6. direct end-of-line labels in the reserved gutter, in place of a legend -->
  <text class="s-label" data-annot="direct-label" x="550" y="132" font-size="12" textLength="58"
        lengthAdjust="spacingAndGlyphs" dominant-baseline="middle">checkout</text>
  <text class="s-label ghost-t" x="550" y="164" font-size="12" textLength="22"
        lengthAdjust="spacingAndGlyphs" dominant-baseline="middle">api</text>
  <text class="s-label ghost-t" x="550" y="180" font-size="12" textLength="44"
        lengthAdjust="spacingAndGlyphs" dominant-baseline="middle">search</text>
</svg>
```

**`data-annot` is the hook, the class is the paint**, since `slo` is one chart's word for a reference
line and `focus` one chart's word for the highlighted series. `q.annot` reads the attribute inside a
`<figure>` holding an `<svg>` and a JSON island and warns when it finds none. The same six names are
the island's `kind` values and the ledger's Kind column, so one mark is findable in picture, data and
text.

```
GEOMETRY THAT HOLDS WITHOUT MEASURING TEXT.

slo pill  "SLO 300 ms" is 10 chars at font-size 12 → textLength 72, label right edge 530+72=602,
          pill 520+90=610, an 8px inset. Each added character costs 7.2px, so a twelfth needs a
          100-wide pill. The label matches its ledger row character for character.
gutter    ceil(chars × 0.6 × font_size) + 10 = 68, so the plot ends at 540 and labels start at
          550. Two labels closer than font_size + 4 in y push the lower to the next lattice step
          with a 1px connector, at the same type size.
callout   text-anchor="end" at x=240 grows the label leftward to 240−126=114, clear of 0. The
          leader stops at (330,60), ≥r short of the ring centre (340,64); ring is fill:none at
          r=7, clearing a 2.25px line.
bands     a 132px label over a 120px band is fine — it sits above the plot, not inside a shape.
          Colliding labels take numbers 1, 2 and full text in the ledger. An open window adds
          class="band--open" on a wrapping <g>: half fill, trailing edge 1 5, because an
          unterminated window has no end time to draw. [CONVENTION]
collision three or more colliding event markers rotate about an explicit lattice point —
          transform="rotate(-90 440 200)" — and take a ledger row as well.
```

**Two contrast floors, so a ghost line and a ghost label are two tokens:** 3:1 for chart elements
against their neighbours (WCAG 1.4.11), 4.5:1 for text (1.4.3). Every ratio below was computed
against these grounds [DERIVED].

```css
/* Annotation tokens live in the voice block. The validator harvests custom properties from :root,
   html, and the active [data-voice="…"] selector only, so a token declared on .annot grades as
   UNKNOWN. light-dark(a, b) is graded as two contexts: a against the light tokens and b against
   the dark ones, each reported on its own, so a dual-mode token is checked in both renderings. */
[data-voice="editorial-swiss"]{
  --focus:#1a1a1a;       /* 17.40:1 on #ffffff */
  --ghost:#949494;       /*  3.03:1 — lightest grey clearing 3:1; #959595 is 2.995:1 */
  --ghost-ink:#5b5b5b;   /*  6.79:1 — a ghost label is text, so 4.5:1 is its floor */
  --warn:#b3261e;        /*  6.54:1 */   --event:#5b5b5b;   /* 6.79:1 */
  --band:#fde7d7;        /*  1.19:1 — a tint, not a legible surface, so it carries an edge */
  --band-edge:#c2410c;   /*  5.18:1 on white, 4.34:1 on the band fill */
}
@media (prefers-color-scheme:dark){
  [data-voice="editorial-swiss"]{
    --focus:#f2f2f2;     /* 16.87:1 on #111111 */
    --ghost:#606060;     /*  3.00:1 — darkest grey clearing 3:1 on #111111 */
    --ghost-ink:#a8a8a8; /*  7.94:1 */
    --band:#3a2418; --band-edge:#f0803c;   /* 7.07:1 on ground, 5.44:1 on the band */ }
}

.annot svg{width:100%;max-width:640px;height:auto;display:block}
.annot text{font-family:inherit;fill:var(--focus)}
.annot .a-label,.annot .s-label{font-weight:600}
.annot .ghost-t{fill:var(--ghost-ink);font-weight:400}
.annot .focus{fill:none;stroke:var(--focus);stroke-width:2.25;vector-effect:non-scaling-stroke}
.annot .ghost{fill:none;stroke:var(--ghost);stroke-width:1.25;vector-effect:non-scaling-stroke}
.annot .slo{stroke:var(--warn);stroke-width:1.5;stroke-dasharray:6 4;vector-effect:non-scaling-stroke}
.annot .slo-pill{fill:var(--canvas);stroke:var(--warn);stroke-width:1}
.annot .slo-text{fill:var(--warn);font-weight:600}
.annot .band{fill:var(--band)}
.annot .band-edge{stroke:var(--band-edge);stroke-width:1;stroke-dasharray:2 3}
.annot .band--open .band{fill-opacity:.5}
.annot .band--open .band-edge:last-of-type{stroke-dasharray:1 5}
.annot .event{stroke:var(--event);stroke-width:1;stroke-dasharray:3 3}
.annot .ring{fill:none;stroke:var(--focus);stroke-width:1.5}
.annot .leader{fill:none;stroke:var(--event);stroke-width:1}

@media print{
  .annot .band{fill:none}                          /* a 1.19:1 tint greyscales to nothing */
  .annot .band-edge{stroke-dasharray:none;stroke-width:1.25}
  .annot .ghost{stroke:#606060;stroke-width:1}     /* darker and thinner survives dot gain */
  .annot .slo{stroke:#000;stroke-dasharray:5 3}
  .annot .slo-pill{fill:#fff;stroke:#000}
  .annot .slo-text,.annot .a-label,.annot .s-label{fill:#000}
  .annot svg{break-inside:avoid}
}
```

**Ghost by swapping the stroke colour.** `.ghost{opacity:.2}` puts the context series near 1.4:1 and
fails 1.4.11 while it is still data. Dashes belong to furniture alone, because a dashed data line
reads as lower contrast. Past four series, small multiples take over, one focus per panel.

**The ledger makes the annotation layer reachable as text.** Under `role="img"`, "any child DOM
structure is ignored except for plain text" (W3C SVG Accessibility Task Force), so the marks reach a
screen reader through the table. Two additions go into the `<figure class="chart">` of
`encoding-and-charts.md`: a ledger table beside the values table, and an `annotations` array in the
JSON island. Each annotation carries a `basis`, and a band an `edge_rule`, because whether the
breaching sample sits inside the window is a judgement the picture cannot show.

```html
<!-- Added to the <figure class="chart"> of encoding-and-charts.md: this figcaption, this table
     inside the existing <details>, and this array inside the existing JSON island. -->
<figcaption id="c9-cap">p95 checkout latency breached the 300&nbsp;ms SLO for 78 minutes, peaking
  at 344&nbsp;ms at 15:10; the breach began 18 minutes after the v2.7.1 deploy and cleared on
  rollback at 15:40. Scope: checkout only; api and search stayed under SLO.</figcaption>

<table>
  <caption>Annotation ledger — every mark drawn on the chart appears here as text.</caption>
  <thead><tr><th scope="col">Annotation</th><th scope="col">Kind</th><th scope="col">Value</th>
    <th scope="col">Asserts</th></tr></thead>
  <tbody>
    <tr data-claim="observed" data-src="src-slo"><th scope="row">SLO 300 ms</th>
      <td>reference line</td><td>300 ms</td><td>threshold, slo.yaml:12</td></tr>
    <tr data-claim="observed" data-src="src-inc"><th scope="row">incident 14:02–15:40</th>
      <td>period band</td><td>98 min, closed</td><td>PagerDuty INC-4471 open/ack</td></tr>
    <tr data-claim="observed" data-src="src-dep"><th scope="row">deploy v2.7.1</th>
      <td>event marker</td><td>14:20</td><td>deploy log</td></tr>
    <tr data-claim="observed" data-src="src-p95"><th scope="row">p95 344 ms at 15:10</th>
      <td>callout</td><td>344 ms</td><td>maximum of the series</td></tr>
  </tbody>
</table>

"annotations":[
  {"kind":"reference","label":"SLO 300 ms","y":300,"unit":"ms","basis":"slo.yaml#L12"},
  {"kind":"band","label":"incident 14:02-15:40","x0":"14:02","x1":"15:40","open":false,
   "edge_rule":"inclusive of the breaching sample","basis":"INC-4471"},
  {"kind":"event","label":"deploy v2.7.1","x":"14:20","basis":"deploy.log"},
  {"kind":"callout","label":"p95 344 ms at 15:10","x":"15:10","y":344,"basis":"series max"}]
```

The caption fills one slot per drawn mark: trend claim (L3) · peak value with its moment (L2) ·
external event with its offset (L4) · scope. The test: delete the SVG, and the caption still states
every mark that was drawn.

## Frame the number

```
Run on every number in a heading, a tile, a verdict sentence, or a chart annotation.

1. DENOMINATOR.  Print what the number is out of, in the same sentence: errors per 1,000
   requests rather than an error count, incidents per deploy rather than incidents per month.
2. COMPARISON.   Attach prior value, target, budget, or peer. "At the heart of quantitative
   reasoning is a single question: Compared to what?" (Tufte, Envisioning Information p.67,
   read via a reader's quote notes rather than the book).
3. BOTH FORMS.   Absolute and relative in one sentence, in the pattern below.
4. SCALE.        Linear by default; the truncation and log rules below.
5. FIGURES.      Three significant digits in the text — `encoding-and-charts.md` sets that
                 ceiling and when a figure drops below it — and whole numbers on an axis range.
```

**The sentence pattern**, in the form Gigerenzer et al. give verbatim — "Drug X lowered the risk of
heart attack by 10 in 100: from 20 in 100 to 10 in 100 over 10 years":

```
<subject> <verb> <measure> by <absolute change, with its denominator>:
from <before> to <after> over <window> — a <relative> <direction>.

"The retry cap cut checkout 500s by 12 in 1,000 requests: from 19 in 1,000 to 7 in 1,000
 over the 14 days after the change — a 63% drop."
```

Both forms ship because the relative form alone moves decisions — 80% of 306 people accepted a test
described as a relative risk reduction, against 53% and 43% for the same benefit stated absolutely
[MEASURED, Sarfati et al. via Gigerenzer et al.] — and because absolute risks yield the relative ones
and never the reverse. Benefit and harm take the same format in the same sentence, the opposite being
*mismatched framing*; CONSORT 2010 item 17b puts that in a reporting standard [DOCTRINE].

**Truncated axis.** Bars start at zero, because bar length *is* the quantity: "In bar charts you
perceive the bars being proportional to each other" (UK Government Analysis Function) [DOCTRINE]. A
line chart may break, since line charts "are not read in the same way as bar charts".

Truncation moves the reader, and marking it does not undo the move: wording shifted perceived
severity by 0.07 on a 1-5 scale against 0.36 for starting the y-axis at 25% rather than 0%, and
marking the break "may not be sufficient to 'de-bias' viewers" [MEASURED, Correll et al.,
arXiv:1907.02035].

A non-zero baseline therefore ships with all four Analysis Function elements — break symbol on the
axis, axis and symbol "thicker and darker than the gridlines and x-axis", a rounded range ("50% to
90% rather than 54.3% to 93.5%"), and the break named in the text below. A target on the scale is
drawn rather than described, and when *above or below the reference* is the reader's whole question
the reference becomes the baseline and the chart a deviation chart.

```html
<!-- "y axis starts at 200 ms" = 23 chars @11 -> ceil(23 * 0.6 * 11) = 152 -->
<text class="axis-note" x="60" y="216" font-size="11" textLength="152"
      lengthAdjust="spacingAndGlyphs">y axis starts at 200 ms</text>
```
```
figcaption: "The y axis starts at 200 ms rather than 0, so the 78-minute rise fills more of the
             plot than it fills of the SLO budget; the break symbol on the axis marks it."
```

**Log axis.** A linear axis carries any artifact whose reader was not named as one who reads log axes
daily, because correct interpretation ran 93% linear against 56% log [MEASURED, Menge et al.] and a
linear group chose 17.4 more days before reopening businesses [MEASURED, Romano et al., N=2,074]. A
log axis names its reader and states in the caption what a straight line on it means.

| Defensible | Not defensible |
|---|---|
| line chart on a broken axis, symbol on the axis, break named in the caption | bar chart on a broken axis |
| rounded axis range: 50% to 90% | 54.3% to 93.5% as an axis range |
| log axis for a named specialist reader, with what a straight line means | log axis for a general reader |
| benefit and harm in the same format | benefit relative, harm absolute |
| "from 19 in 1,000 to 7 in 1,000 — a 63% drop" | "cut by nearly two thirds" |
| rate whose denominator is printed beside it | rate whose numerator and denominator both move with one cause |

That last row is the survival-statistics trap in engineering dress: across the 20 most common solid
tumors over 50 years "changes in 5-year survival were completely uncorrelated with changes in
mortality" (Welch et al. via Gigerenzer et al.). "Percent of incidents auto-detected" behaves the same
way — adding detection raises it while reliability holds still.

## The annotation asserts a reading

An annotation is a claim, so it takes the claim rules of `evidence-and-confidence.md` unchanged: the
ledger row carries `data-claim` plus `data-src` or `data-basis`, and one reading a cause off a
co-occurrence is `inferred` and carries a calibrated confidence word with its band.

The gate below is mechanical rather than tasteful because the reader does not catch the overstatement:
recall "more frequently aligned with the titles than the visualization", and "visualizations were
persistently perceived as impartial by the majority" even when a title contradicted the chart (Kong,
Liu & Karahalios, CHI 2019, quoting the published abstract) [MEASURED, direction only — closed-access,
so no magnitude from it appears here].

```
ENTAILMENT: an annotation restates, aggregates, or locates a value that is in the JSON island.
Run each annotation string against the island before the figure ships.

CONTRADICTORY  Every number in the annotation appears in `values` or `annotations` in the
               island. A number in neither is removed, or measured and added.
MISCUED        The figcaption's subject is the series carrying class="focus" and the datum the
               callout rings. Emphasis and claim name the same thing.
SELECTIVE      The figcaption carries the denominator and the scope — "checkout only; api and
               search stayed under SLO" — which closes the true-but-partial reading.
CAUSAL         A causal verb in an annotation ("caused by", "because of", "due to") makes its
               row `data-claim="inferred"` with a confidence word and band, because the chart
               shows co-occurrence and the author supplies the arrow. "began 18 minutes after
               the deploy" is a measured interval and stays `observed`.
```

Scope lives inside the figure because the figure travels without the report: charts "can circulate
stripped of provenance", and emphasis is an ethics issue "even when encodings are correct" (Rahman et
al.). One educator there questioned "defensive labels all over the place" for the maintenance burden,
so the shipped form is one scope clause in the figcaption.

Two closing tests. Render the figure with hue removed: the focus series is still found first. And the
text-only variant, Stokes et al.'s fourth guideline, is met by the figcaption plus the ledger.