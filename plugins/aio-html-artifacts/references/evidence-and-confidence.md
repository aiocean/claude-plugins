# Evidence and confidence

**Settles:** which of four labels a claim carries, what a confidence word means in numbers, the exact anchor shape for code, web and command evidence, how an unknown is rendered, the falsifier block, and the coverage line.

**When this file loads:** the artifact asserts something you did not run a command to establish — a cause, a forecast, a number quoted from someone else, a recommendation. An artifact whose every claim is a command you ran and pasted needs the anchor shapes here and nothing else.

**Partial read:** `Claim types`, `Calibrated confidence` and `Source anchors` are the three that carry the markup; each is self-contained. The sections after them are per-situation and independent of each other.

## Contents

- [Claim types](#claim-types)
- [Calibrated confidence](#calibrated-confidence)
- [Claim markup](#claim-markup)
- [Source anchors: code, web, command](#source-anchors-code-web-command)
- [Rendering the gap](#rendering-the-gap)
- [Uncertainty decision procedure](#uncertainty-decision-procedure)
- [Falsifier block](#falsifier-block)
- [First-person uncertainty voice](#first-person-uncertainty-voice)
- [Counterfactual lint](#counterfactual-lint)
- [Incident and investigation sections](#incident-and-investigation-sections)
- [Rhetoric self-audit](#rhetoric-self-audit)
- [Provenance footer and coverage line](#provenance-footer-and-coverage-line)

## Claim types

Four values, closed set. Apply the decision rule in order and stop at the first match:

1. Can you paste the exact bytes or output? → `observed`
2. Did you not verify it, and would the argument collapse if it were false? → `assumed` — a linchpin, rendered visibly, outside any `<details>`, because a hidden linchpin reads as a fact.
3. Does it contain a causal, predictive, or evaluative verb? → `inferred`
4. Is it an imperative? → `recommended`

One sentence carries one claim type. A sentence that wants two is two sentences, so each half can be sourced or refuted on its own.

## Calibrated confidence

These seven strings are the confidence vocabulary. Copy them verbatim with their bands:

```
almost no chance    01-05%
very unlikely       05-20%
unlikely            20-45%
roughly even chance 45-55%
likely              55-80%
very likely         80-95%
almost certain      95-99%
```

Replaced by the seven above: *probably, possibly, may, might, could, seems, appears, I think, arguably, fairly confident, high/medium/low confidence.*

The numeric band appears as literal HTML text next to the word — `<b class="conf">likely (55-80%)</b>` — and CSS `::before`/`::after` generated content stays out of it, because generated content is absent from the DOM and the accessibility tree and is not copied to the clipboard, which destroys the exact benefit the band exists for: reader-intent overlap rises from 32% to 66% when the band travels with the word (PLOS ONE 2019, N=924).

One sentence carries either a confidence level or a likelihood term. Positive phrasing carries the estimate — negative terms carry roughly 25% more interpretive variance (SD 44.9 vs 36.0).

## Claim markup

```html
<p data-claim="observed" data-src="src-pool"><code>maxWorkers</code> is set to 32 in the pool constructor.</p>

<p data-claim="inferred" data-confidence="likely" data-basis="src-pool src-p99">
  The cap is what pins p99 latency at 840&nbsp;ms <b class="conf">likely (55-80%)</b>.</p>

<p data-claim="assumed">I assumed request mix stays at the current 9:1 read/write ratio;
  I did not verify this against production traffic.</p>

<p data-claim="recommended" data-basis="claim-p99">Raise <code>maxWorkers</code> to 64 and re-measure.</p>
```

## Source anchors: code, web, command

**Code.**

```html
<figure class="src" id="src-pool" data-kind="code"
  data-repo="atlas/web" data-sha="9f1c2b7a4d5e6f708192a3b4c5d6e7f809a1b2c3"
  data-path="app/disputes/banner.ts" data-lines="41-46" data-retrieved="2026-08-13T09:12Z">
  <figcaption id="cap-pool"><a href="https://github.com/atlas/web/blob/9f1c2b7a4d5e6f708192a3b4c5d6e7f809a1b2c3/app/disputes/banner.ts#L41-L46">
    atlas/web@9f1c2b7 · app/disputes/banner.ts:41-46 · inspected 2026-08-13T09:12Z</a></figcaption>
  <pre tabindex="0" role="region" aria-labelledby="cap-pool"><code>const granted = new Set(shop.scopes.split(","));</code></pre>
</figure>
```

The three attributes on `<pre>` ship with the anchor, because code wider than its column gets `overflow-x: auto` and a mouse-only scroller strands a keyboard (WCAG 2.1.1 / ACT 0ssw9k). The validator hard-errors `a11y.scroll` on a scrollable block whose contents hold nothing focusable, which is every plain `<pre><code>` excerpt.

A 40-hex SHA fills `data-sha` and the URL path. `/blob/main/`, `/blob/master/`, `/blob/HEAD/`, and any branch name are rejected, because file contents at the head of a branch change and the line anchor then points at different code than the one you read. For `.md`, `.ipynb`, `.csv`, and `.svg`, append `?plain=1` before the `#L` anchor so the line anchor resolves. The visible label restates `org/repo@short-sha path:start-end` so the anchor survives copy-paste as plain text.

**Web.** `data-url` + `data-retrieved` (required — 8% of pages die within their first year, and 38% of 2013 pages were gone by 2023) + `data-archive` (required for anything load-bearing to an inferred claim) + `data-locator` (page, section, or timestamp). Both the live link and the archive link are visible.

**Command.** `data-cmd`, `data-cwd`, `data-exit`, `data-host`, `data-retrieved`, and the verbatim output in a `<pre>`. The command re-runs verbatim from `data-cwd`. A command that cannot be re-run supports an `assumed` claim, not an `observed` one.

## Rendering the gap

```html
<div class="fact gap"><span>p95 recovery</span><strong>Not measured</strong>
  <small>would need LT-204 rerun</small></div>
<td class="unknown">Not measured <small>needs: LT-204 rerun</small></td>
```

A visible gap is a finding; a filled-in guess is a defect. Every unknown names the evidence that would fill it, so the reader knows what to go get. Past a third of a layout's slots being gaps, change the layout rather than the numbers — a grid of "Not measured" is a signal that the grid was the wrong form for what you know.

## Uncertainty decision procedure

Run this for every headline number:

| Class | What it means | What you print |
|---|---|---|
| EXACT | complete enumeration you ran | the number as-is |
| PARTIAL | you scanned a subset | coverage inline: "47 failures across 12 of 50 modules scanned; 38 skipped: no test target" |
| ESTIMATED | derived, no measured interval | a range; with no real interval, the textual form "~3 days (rough; assumes no migration rework)", marking where data stops and extrapolation begins |
| INFERRED | not executed | the label plus the falsifier: "LOW confidence — inferred from imports, not executed. Run `go test ./auth/...` to confirm" |

Error bars appear only when you computed them from data.

Suppressing an uncertainty is admissible for three reasons, and the artifact states which one applies: (a) the reader cannot act on it, (b) you could not compute it, (c) you did not have access. "It would confuse the reader" is not one of the three.

## Falsifier block

Ships whenever the artifact carries an `inferred` or a `recommended` claim.

```html
<section class="falsifier" data-falsifier="claim-p99">
  <h3>What would show this is wrong</h3>
  <ul>
    <li data-test="go test -run TestSaturation ./pool -workers=64">
      Raise the cap to 64 and re-run. If p95 stays above 800&nbsp;ms, the cap is not the
      binding constraint and this conclusion fails.</li>
    <li data-observation="queue depth during the 09:05 spike">
      If queue depth was near zero while p95 was high, the bottleneck is downstream.</li>
  </ul>
  <p>Assumption that would break it: request mix stays 9:1 (<a href="#claim-mix">assumed, unverified</a>).</p>
</section>
```

Each entry names a runnable check or a specific observation, and states the direction that refutes. "More investigation needed" names neither, so it is not an entry.

## First-person uncertainty voice

```
good: "I could not verify the production request mix; I assumed 9:1."
bad : "It is unclear what the production request mix is."
```

Pre-registered study, N=404: first-person uncertainty lowered agreement and raised user accuracy; the impersonal form's effects were weaker and not statistically significant.

## Counterfactual lint

Flag these in prose: *should have, shouldn't have, could have, would have, failed to, neglected to, forgot to, obviously, clearly, simply, just needed to, everyone knows, it was known that.* The check ignores text inside `<pre>`, `<code>`, `<script>`, `<style>`, and direct quotes.

Rewrite pattern — replace the counterfactual with the conditions the person worked under:

> "The on-call engineer failed to check the saturation dashboard"
> → "The saturation dashboard was on a second screen not included in the alert runbook; the on-call engineer worked from the runbook."

## Incident and investigation sections

Use these literal names in this order; readers already know them:

Date · Authors · Status (Draft / In Review / Reviewed / Closed) · Summary → **Verdict** → **Impact** → **Detection** → **Timeline** → **Contributing factors** (plural, and a factor is a condition, not a person) → **Alternatives considered** → **Assumptions** → **What would show this is wrong** → **What went well / What went wrong / Where we got lucky** → **Action items** (owner, condition, due date, exact command) → **Evidence register**.

The Timeline carries `observed` claims only, every row carries a source, it starts before the incident and runs forward, and it separates "known at the time" from "known now". Row schema — Allspaw's four-part account as literal columns:

| Time (UTC) | Action taken | Effect observed | Expectation/assumption held | Source |
|---|---|---|---|---|

## Rhetoric self-audit

Run before handoff. Every YES gets disclosed in the artifact, in the place where it applies.

**Layer 1 — DATA.** Did you scan everything or a subset (print scanned/total plus why)? Did you drop rows, files, tests, or time ranges? Are you substituting a part for the whole?

**Layer 2 — REPRESENTATION.** Any axis not starting at zero (label it at the axis)? Any dual axis (remove it)? Any 3D, gradient, drop shadow, or decorative motion? Does a size difference imply an unverified magnitude? Are you implying cause where you observed correlation?

**Layer 3 — ANNOTATION.** Is every headline defensible with an excerpt inside this document? Is a loaded adjective doing argumentative work? Does emphasis match importance, or narrative?

**Layer 4 — INTERACTIVITY.** What is the default view, and why that one? What is the fixed comparison baseline? Does the default sort hide anything that contradicts the verdict?

## Provenance footer and coverage line

The footer is emitted in every artifact, with six fields: scope scanned · scope skipped + reason · commands actually run · what was inferred vs verified · generation timestamp · model/version.

The coverage line is emitted with it, in this form:

```
Evidence coverage: 9/12 claims carry a source (75%). 3 uncited: #c4, #c7, #c9.
Scanned 12 of 47 files in scope; 35 skipped (not reachable from the failing path).
```
