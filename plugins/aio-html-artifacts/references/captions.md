# Captions per evidence type

**Settles:** what the caption says under a chart, a diagram, a table, a code excerpt or a
screenshot; the four-level chart-description model; and the partition that keeps the same fact
out of `alt`, `<figcaption>` and the prose at once.

**When this file loads:** the artifact holds a `<figure>`, a `<table>` with a header row, a
chart, a diagram, a screenshot, or an annotated code block — a caption is about to be written.
An artifact whose evidence is all inline code and prose ships no captions and skips this file,
which is why the caption rules sit here instead of in `references/copy-craft.md`.

**Partial read:** the five `###` blocks are one per evidence type and are independent of each
other. Read the one matching the evidence in hand, plus `The alt / figcaption / prose partition`
whenever the figure carries an `alt` string.

Every word list and every regex below is compiled into `scripts/lib/checks-copy.mjs`; the list
here and the list there match token for token, so the reference and the gate cannot drift.

Evidence labels travel with each rule. **MEASURED** — a published study backs the number.
**DERIVED** — the finding is measured, the threshold is ours, from n=6 calibration on this
plugin's own examples. **FOLKLORE** — named by a curated community list, counted in no corpus.
A threshold presented as research when it is a guess is the defect this file exists to remove.

Validator ids whose fix lives here: `copy.caption.missing`, `copy.caption.axis`, `copy.dup.alt`.

## Contents

- [Chart or figure with data](#chart-or-figure-with-data)
- [Diagram](#diagram)
- [Table](#table)
- [Code excerpt or diff](#code-excerpt-or-diff)
- [Screenshot](#screenshot)
- [The four-level chart-description model](#the-four-level-chart-description-model)
- [The alt / figcaption / prose partition](#the-alt--figcaption--prose-partition)

## Captions per evidence type

### Chart or figure with data

```
<figcaption>
  <b>Figure N. {DECLARATIVE FINDING — a complete sentence naming the claim}.</b>
  {Reading key: what each encoding channel means, units, scale, n.}
  {Optional: method or conditions, one clause.}
  Source: {provenance}.
</figcaption>

RULE, verbatim from the source: the opening statement "should not simply repeat the labels
on figure axes" — it must be "a summary statement that highlights the key finding".

  BEFORE  "Figure 2. p99 latency over time."
  AFTER   "Figure 2. p99 latency tripled within 4 minutes of the 14:02 deploy and did not
           recover. Latency in ms (y) against wall clock UTC (x); solid = p99, dashed = p50;
           shaded band is the pre-deploy 7-day range. n = 1.2M requests.
           Source: Grafana dashboard `api-latency`, 2026-08-11."

WHY THE DESCRIPTIVE FORM IS A NULL OPTION RATHER THAN A LESSER ONE: in a study of 2,168
participants across 43 line charts, purely descriptive "basic" captions naming the axes
produced no significant difference from the NO-CAPTION condition
(synthetic χ²(4)=1.564, p=.815; real-world χ²(4)=7.168, p=.127). Adding external context
significantly increased uptake (Z=2.273, p=.011). A caption that names the axes is
measurably worth nothing. The base rate you are correcting: 35% of captions written by
professionals misalign with the chart's emphasis (26% describe non-prominent features, 9%
describe only the encoding), and 93% of tool-default descriptions are basic captions.
```

### Diagram

```
<figcaption>
  <b>{ASSERTION — one complete sentence stating what the diagram claims}.</b>
  {Legend: what boxes are, what arrows mean, what is deliberately omitted.}
</figcaption>

PATTERN BANK
  "{A} reaches {B} only through {C}, so {consequence}."
  "Every {request|write|event} crosses {N} trust boundaries before {X}."
  "{Component} is the only writer to {store}; everything else reads a replica."

ARROW/BOX LEGEND — always state it; diagrams silently overload arrows:
  "Solid arrows are synchronous calls; dashed are async publishes; boxes are deployable
   units, not classes. Auth and observability are omitted."

DELETABILITY TEST. Delete the <svg>. Read the caption alone.
  PASS → the reader still learns the point; the diagram was evidence.
  FAIL → the caption was a label. Also FAIL if the caption merely lists the visible boxes.

  BEFORE  "Figure 4. System architecture."
  AFTER   "Figure 4. Every write reaches Postgres through the queue, so a queue outage
           silently degrades writes to read-only. Solid arrows are synchronous calls,
           dashed are async publishes; boxes are deployable units. Auth omitted."
```

### Table

```
caption  = WHAT this table is. A heading. Findable. <= 12 words.
summary  = HOW it is organised. Navigation. Only for complex tables.
NON-DUPLICATION, verbatim from W3C: "if both caption and summary are provided for one table,
the summary should not duplicate information present in the caption."

ADD A SUMMARY only if any is true: more than one header row, or headers on both axes;
merged or spanned cells; more than about six data columns; a column whose meaning is not
inferable from its header.

  simple  <caption>Endpoints changed in this PR</caption>
  complex <caption>Query latency before and after the index change. Column one is the query
           name; the next three columns are p50/p95/p99 before, the final three the same
           percentiles after.</caption>

THE TAKEAWAY GOES ABOVE THE TABLE AS PROSE, and stays out of the caption — a heading that
argues stops being a findable heading.
  BEFORE  <caption>This table shows that the new index made queries much faster,
           especially the slowest ones.</caption>
  AFTER   prose:   "The index removed the tail: p99 fell 8.4x while p50 barely moved."
           caption: <caption>Query latency before and after the index change. …</caption>
```

### Code excerpt or diff

```
ABOVE the block, one sentence stating the claim the code is evidence for:
  "{file}:{line-range} — {what this code does wrong | what the fix does}."

ANNOTATIONS — write one ONLY if it passes one of these:
  [ ] explains unidiomatic code — "this looks wrong but isn't, because X"
  [ ] marks the bug — "this line is the fix for <issue>"
  [ ] marks incompletion — "TODO(owner): <what remains and why>"
  [ ] links the external authority — "<RFC/spec> requires <behaviour>, hence <X>"
  [ ] states a non-local consequence — "<caller> depends on this returning nil"
None pass → DELETE the annotation. "Comments should not duplicate the code."
BANNED anti-example: `i = i + 1;  // Add one to i`

LABEL GRAMMAR (Conventional Comments): <label> [decorations]: <subject>
  labels      praise · nitpick · suggestion · issue · todo · question · thought · chore · note
  decorations (blocking) · (non-blocking) · (if-minor)
  e.g. "issue (blocking): `err` is discarded here, so a failed write reports success."

  BEFORE  // increment the retry counter
          retries++
  AFTER   // Counted before the sleep so the 5th failure is reported rather than swallowed
          // by the backoff path. See issue #4412.
          retries++

ORDER annotations in comprehension order, not file order: "concepts have been introduced in
an order that is best for human understanding."
BUDGET <= 1 annotation per 5 shown lines (DERIVED, our n=6 calibration). More than that means
the excerpt is too long — shorten the excerpt, not the prose.
```

### Screenshot

*Derived from the W3C two-part model plus WebAIM's prefix ban. No retrieved source covers
software-UI screenshots directly; this formula is extrapolation, not measurement.*

```
<figcaption>
  <b>{What the screenshot proves — one checkable sentence}.</b>
  {Where to look: the specific region, control, or value carrying the proof.}
  {Capture context: build or commit, environment, timestamp.}
</figcaption>
alt="Screenshot of {surface}. {The one visible fact that matters}."

  caption "Figure 6. The retry banner now names the failing service. Top-right toast reads
           'payments-api unreachable — retry 3 of 5'. Commit a3f91c, staging,
           2026-08-12 09:14 UTC."
Without build + environment + timestamp, a screenshot proves nothing about current code.
```

### The four-level chart-description model

```
L1 Elemental / encoded      chart type, encoding channels, axis ranges, labels, colours
L2 Statistical / relational extrema, means, counts, deltas, correlations
L3 Perceptual / cognitive   overall shape, trend, pattern, and the exception to it,
                            in plain non-statistician words
L4 Contextual / domain      cause, consequence, recommendation, current events

REQUIRED: L2 and L3. L3 is the only level BOTH blind and sighted readers rank most useful
(blind readers rank L2+L3 most useful and L1+L4 least; sighted readers rank L3+L4 most and
L1+L2 least; Friedman p < 0.001 both groups, n = 30 blind / 90 sighted, 3,600 rankings).
L1 IS A PREFIX and it never stands as a whole description. One blind reader: descriptions
that "*only* elaborated on x/y and color-coding are almost useless." L1 is not useless — it
was ranked most useful in 101 instances by blind readers, always in combination.
L4 IS OPTIONAL, and it lives in its own sentence. 63% (n=19) of blind readers rejected
subjective interpretation and editorialising in descriptions: "I just prefer it to be
straight facts, not presumptions or guesstimates." Meanwhile 41% (n=37) of sighted readers
wanted descriptions that "told a story". Separation serves both; fusion serves neither.
Mark it: "Why this matters: …" — so a reader can stop before it.

FILL-IN
  L1 "<Chart type> of <y> by <x><, split by <series>>, <units/range>."   ONE clause
  L2 "<Max> is highest at <value>; <min> lowest at <value>; the gap is <delta>."
  L3 "Overall <rises|falls|flattens|clusters> across <range>, except <exception>."
  L4 "Why this matters: <cause | consequence | recommendation>."

BANNED inside an L2 or L3 sentence (these are L4 and move to their own sentence):
  because · due to · caused by · suggests that · indicates that · clearly · unfortunately
  · as expected · worryingly · this proves

SCOPE CAVEAT, print it: the four-level model was validated on CHARTS. Applying it to
architecture diagrams, screenshots, tables or code excerpts is analogy, not evidence.
```

### The alt / figcaption / prose partition

The anti-triple-stating rule. Validator id: `copy.dup.alt`.

```
alt        = what the image COMMUNICATES when the image is absent. Short. REPLACES the image.
figcaption = what the image IS and what ROLE it plays here. Visible. SUPPORTS the image.
prose      = the argument the figure serves; the full data; the causal claim.
MNEMONIC: one replaces the image, the other supports it. They are never the same string.

PROCEDURE, in this order — the order is what mechanically prevents triple-stating:
  1. Write the PROSE first: the claim, and the numbers you will cite.
  2. Write the FIGCAPTION: the declarative finding + the reading key (encodings, units, n,
     source). This is the ONLY place the reading key goes.
  3. Write the ALT last, and only for what is still missing:
       prose already states the image's content in real text
         → alt=""  (W3C decision tree: "shows content that is redundant to real text nearby.
                    Use an empty alt attribute.")
       chart or diagram
         → alt = short identify + pointer; the data itself goes on the page
                 ("Include the information contained in the image elsewhere on the page.")
       otherwise
         → alt = "{chart type} of {type of data} where {reason for including the chart}"
                 (Cesal's formula as quoted by data.europa.eu. Cesal's own article adds a
                  fourth component — a link to the data or source — which lives OUTSIDE the
                  alt attribute. There is NO 125-character cap; that claim carries a
                  published correction and was withdrawn. Cap by content, not by count.)

COLLISION CHECK before shipping — no fact appears twice:
  [ ] alt string ≠ figcaption string, not even normalized-equal
  [ ] the exact number in the prose is not repeated in BOTH alt and figcaption
  [ ] the takeaway sentence appears exactly once across {title, alt, figcaption, prose}
  [ ] the encoding key appears ONLY in the figcaption
  [ ] the source appears ONLY in the figcaption or a source line, and stays out of alt

COST OF VIOLATION, so this is not read as an accessibility checkbox: repetition of the same
content across integrated materials raises extraneous cognitive load — it harms the sighted
reader too. (Redundancy effect; primary literature not retrieved for this plugin, so no
effect size is claimed.)

BANNED IN alt — the screen reader already announces the element type:
  "Image of" · "Picture of" · "Photo of" · "Graphic of" · "Graphic showing" · "An image that
  shows" · "This image depicts" · "Icon of"
ALLOWED IN alt — naming the artifact type carries real information:
  "Bar chart of" · "Line chart of" · "Scatter plot of" · "Flow diagram of" ·
  "Sequence diagram of" · "Screenshot of" · "Terminal output showing"

SCOPE NOTE: embed tools such as Datawrapper announce their own title and footer, so their
guidance says not to worry about repeating. In a hand-authored HTML figure — which is every
figure this plugin emits — the W3C non-duplication rule governs instead.
```
