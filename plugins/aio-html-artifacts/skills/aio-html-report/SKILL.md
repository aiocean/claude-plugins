---
name: aio-html-report
description: |
  One self-contained HTML file carrying an evidence-led verdict — or, when nothing is being
  decided, an evidence-led answer — that a skeptical reader can audit offline and print. Reach
  for it when the deliverable is long-form, every claim needs its proof attached, and Markdown
  would flatten the hierarchy or leave a claim on a different screen from the evidence for it.
  A human who sits through the material at a presenter's tempo wants aio-html-deck; a human
  holding two or more live options side by side wants aio-html-explorer.
when_to_use: |
  code review writeup, PR explainer, incident report, postmortem, RCA, root cause writeup,
  implementation plan doc, technical explainer, research synthesis, weekly status, audit,
  "write this up", "make a report", "document the investigation", báo cáo, viết báo cáo,
  rewrite this report, make the headings assertive, the writing sounds like AI,
  deslop this doc, viết lại cho gọn
argument-hint: "subject + evidence sources"
effort: high
---

# Evidence-led HTML report

A report is one page whose first screen states the answer and whose deeper layers let a reader who distrusts you check it.

## Reference routing

Seven rows load every time. Every other row states a condition you can answer no to — from the request text, the contract keys, the material in hand, or the validator's output. **A row whose condition does not match is a row not read**, and leaving it unread is the design. Measured on a plain incident-report request against the files on disk, 2026-08-13: 198 KB if every row fires, 112 KB with these conditions applied, of which 89 KB is the always set. The `references/data-story.md` row postdates that measurement and carries its own cost: 15 KB when a chart is judged against a threshold or an event, 21 KB when the page also holds two or more views, measured 2026-08-13. Paths are relative to `${CLAUDE_PLUGIN_ROOT}`.

**A short artifact takes `tier= brief` and six rows.** Under 600 body words and outside the incident and decision-record spines — a weekly status, a standup note, a one-question explainer — read `references/base-layer.html`, `references/layout-primitives.css`, `references/voices.css`, the one voice file, the `## Pick the spine` block at the top of `skills/aio-html-report/references/report-structures.md`, and `references/copy-craft.md` §*The verdict sentence* + §*The claim heading*; add `references/captions.md` § for the evidence type when a figure or table ships. Measured on the weekly-status request against the files on disk, 2026-08-13: 49,956 B, against 94,468 B for the same request at full tier — a 47% cut, and the two files it drops whole are `references/artifact-grammar.md` and `references/evidence-and-confidence.md`, whose load-bearing halves at this size are the claim markup listed below and the constraints already inside the base layer. `${CLAUDE_PLUGIN_ROOT}/examples/weekly-status-brief.html` is the shipped one: 282 body words, 0 error 0 warn.

| Open | When |
|---|---|
| `references/base-layer.html` | always — paste it as the document skeleton, then diverge |
| `references/layout-primitives.css` | always — paste into `<style>`, compose with the primitives |
| `references/voices.css` | always — the rules every voice obeys, and the five-row chooser you pick from |
| `references/voices/<the voice you picked>.css` | always, exactly one file — the token block for the name in the contract's `voice=` |
| `references/artifact-grammar.md` | always — job, reading ladder, encoding, spine, proof placement, interaction tier, constraints, completion |
| `skills/aio-html-report/references/report-structures.md` | always, before `structure=` and `spine=` go in the contract — the selector, the SCQA opener, answer-first placement, the MECE and "so what" tests |
| `references/copy-craft.md` | always — the verdict sentence, the claim headings, and the paragraph shape are what this genre is |
| `skills/aio-html-report/references/report-spines.md` | the selector returned a spine name — read that one `###` section, which is about 2.4 KB of the file's 33 KB. A subject that is latency, an experiment, a rollout, or a benchmark opens one more `###` from `Four data-narrative skeletons` at the end of the same file, 2.6 to 4.3 KB, which supplies that subject's evidence sections inside the spine already chosen |
| `references/evidence-and-confidence.md` | a claim you did not run a command to establish, a forecast, or a number quoted from someone else |
| `references/captions.md` | a `<figure>`, a `<table>` with a header row, a chart, a diagram, or a screenshot goes in the page — read the one `###` block for that evidence type plus `The alt / figcaption / prose partition`, about 4 KB of the file's 13 KB |
| `references/encoding-and-charts.md` | three or more numeric values across time or category get plotted |
| `references/data-story.md` | a plotted series is judged against a threshold, a target, a dated event, or a named window, or the page holds two or more views of the same measure the reader moves between — read `Annotate the point` plus `The annotation asserts a reading` for the six marks, the ledger and the entailment run, about 15 KB of the file's 27 KB; the second case adds `Pick the structure` and `Sequence the views`, about 6 KB more |
| `references/diagrams-css.md` | the shape is already named — a flow, a timeline, a phase strip, a sequence, or code with numbered callouts |
| `references/diagrams.md` | a structure to draw whose medium is still open, or an inline `<svg>` you are about to hand-write |
| `references/microcopy.md` | the page ships a `<button>`, a form field, or an export action. A `<summary>` on its own takes one rule and no file: it names what is behind it — "Full stack trace (42 lines)", "Why we rejected the Redis approach" — because a disclosure label is announced in isolation, the way link text is |
| `references/interaction-budget.md` | a `<script>` that does more than hold a JSON data island. The `beforeprint` listener pasted from `references/base-layer.html` does not count — it is mandatory whenever the page holds a `<details>`, so counting it would make this row unconditional |
| `references/typography-and-voice.md` | the request names a brand, a company style, or a look to match; or you change a value inside the voice block |
| `references/copy-delint.md` | the validator printed a finding whose id starts `copy.`, or the request says the writing reads like AI |
| `references/worked-examples.md` | a drafted section that would have come out the same for any subject in this genre |
| `references/revising.md` | a file already exists at the target path |
| `references/live-collaboration.md` | the request names commenting, asking, or chatting inside the page |

## Artifact contract

```
GATE — it is not a report until it answers all three:
Q1 "What is the answer, and what did you not look at?"  (verdict token + declared coverage)
Q2 "Which specific lines or observations support it?"    (every claim anchored, evidence adjacent)
Q3 "What would change this answer?"                      (the falsifier)
Answering only Q1 → a summary. Only Q2 → a linter dump. Missing Q3 → a preference.
```

Emit this block to the user before writing markup, then write it into the file head as the `ARTIFACT CONTRACT` comment the validator reads, every key the tier asks for non-empty. In the file the keys take the `key= value` form of the comment already in `references/base-layer.html` — the parser reads `=`, so a pasted `Key:` line registers as empty.

```
ARTIFACT CONTRACT
Tier:          <brief when the artifact runs under 600 body words and its spine is neither
                incident nor decision record; the seven keys marked (full) then go unwritten>
Reader:        <who, and what they already know>
Question:      <the one question this page answers>
Verdict:       <the literal sentence that appears in the first screen, not a paraphrase of it, with a calibrated confidence word + band when the answer is inferred>
Consequence:   (full) <what changes because of the verdict>
Challenge:     (full) <the strongest objection a skeptical reader would raise>
Structure:     (full) <which spine, and why this one>
Spine:         <3-6 section titles, each a claim a colleague could answer "that's false" to — the validator reads this key against the stock-heading list, so Overview / Background / Analysis fails here, before any HTML exists>
Transition:    (full) <the ONE dominant transition type repeated in every section>
Evidence:      <per section: the exact artifact — file:line, log excerpt, metric>
Visuals:       (full) <relationship -> form, e.g. "deploy sequence -> CSS timeline">
Voice:         (full) <one of the five, or a declared reason for a sixth>
Generic-check: (full) <name one thing in this plan you would have produced for ANY artifact
                on this topic, and what you replaced it with>
```

**What `tier= brief` trades.** Five keys carry a short artifact — Reader, Question, Verdict, Spine, Evidence — each answered in 24 characters or more, because five one-word answers decide as little as twelve do. Brief tier stands down four rules: the seven keys marked `(full)`, the `data-confidence` word and its band on an inferred claim, the `[data-falsifier]` block, and the rule placing a `<pre>`, `<table>` or `<figure>` inside the first two sections. It holds everything that makes an artifact correct at any size — self-containment, the accessibility set, the print block, the reduced-motion fallback, one `h1`, `<html data-voice="…">` where the voice is now declared once, a claim carrying its `data-src` or `data-basis`, the 80% coverage floor, and the claim heading. The validator refuses the tier above 600 body words and on an incident or decision-record spine, because those two spines are the ones a reader acts on at 3am, and it prints the tier and the four stood-down rules on every run, so the trade is visible in the output rather than only in the file.

**When the request is an explainer** — how a thing works, with nothing being decided and possibly no numbers at all — the three answer keys take their explainer reading, and at full tier the validator requires all three filled (a one-question explainer under 600 body words takes `tier= brief` and writes `Verdict` alone): `Verdict` is the one-sentence answer the reader repeats back ("every request passes one gate that swaps a session cookie for a `User` on the context"), carrying no confidence word when you read it off the code; `Consequence` is what the reader can do afterward that they could not before; `Challenge` is the misreading a newcomer most often arrives with. Take the `EXPLAINER` spine from `skills/aio-html-report/references/report-spines.md`. With no numeric series in the material, `Visuals` names the diagram or the annotated code that carries the relationship — a page with nothing to plot ships no chart, and inventing a metric to fill a tile is the failure this paragraph exists to prevent. The validator's `copy.verdict` warning fires here by design: an explanation carries no verdict verb, so record the warning verbatim in the handoff rather than bolting `we will` or `keep` onto a sentence that decides nothing.

## How the report is built

- **Ground the evidence first**, capturing exact identifiers, revisions, line ranges, quotes, and timestamps while inspecting, because a claim recorded without its anchor is unrecoverable an hour later. Every code claim then shows the decisive lines inline, anchored `org/repo@<short sha> · path:<start>-<end> · inspected <ISO 8601>` — the full 40-hex SHA fills `data-sha` and the permalink URL, and those four fields are what make the claim re-fetchable by someone who was not in the session. *(low freedom — exact form)*
- **Every claim element carries `data-claim` valued `observed`, `inferred`, `assumed`, or `recommended`**: `observed` adds `data-src`, `inferred` adds `data-basis` + `data-confidence`, `recommended` adds `data-basis`. Each confidence word prints its numeric band as literal text beside it: a bare word matches reader intent 32% of the time, a banded word 66% (PLOS ONE 2019, N=924). *(low freedom)*
- **The first screen is: verdict sentence, confidence with its numeric band, consequence, then the single strongest piece of evidence** — a reader who closes the tab after eight seconds leaves with the right conclusion. A metric earns a tile there when that metric is part of the answer to the stated question; every other number lives inline in the sentence that uses it. *(high freedom on the tiles)*
- **Each section body is: one claim sentence, the exact evidence beneath it, then what follows from it.** Evidence sits inside the section that asserts it, so a reader never holds a claim in memory while scrolling to find proof. That same internal skeleton repeats in every section; the variety lives in the forms the evidence takes. *(high freedom)*
- **`<details>` carries audit depth: the long excerpt, the full table, the raw log.** Conclusions and their basis stay in the open document, so deleting every `<script>` and reloading still reads as a complete argument. *(low freedom)*
- **Sections vary in width, density, and visual form according to what they encode** — sequence gets a timeline, causality gets a flow, comparison gets aligned columns, code gets annotated code. A page where every section is the same rounded card at the same size has encoded nothing. *(high freedom — the genre lives here)*

## Worked pair

<example>
Before — topic-shaped, evidence detached:

```html
<h1>Checkout Deploy Incident Report</h1>
<div class="kpi-grid"><div class="kpi">4h 12m<span>Duration</span></div>…</div>
<h2>Background</h2><h2>Timeline</h2><h2>Analysis</h2><h2>Appendix: Logs</h2>
```

After — verdict-shaped, evidence adjacent:

```html
<h1>The deploy failed because the migration ran before the feature flag flipped.</h1>
<p class="lede" data-claim="inferred" data-basis="deploy-yml" data-confidence="likely">
  Likely (55-80%). 12,400 users hit 500s for 4h12m.
  One ordering change in <code>deploy.yml</code> prevents a repeat.</p>
<pre id="deploy-yml"><code>// deploy.yml:34-37 — migrate runs at step 2, flag flips at step 5 …</code></pre>
<h2>The 500s start 90 seconds after step 2, not after step 5</h2>
```

Why: the headline is the finding, not the topic; the tiles are gone because duration and user count are consequences, not the answer; the decisive four lines sit above the section reasoning about them.
</example>

Five more pairs — container headings to claim headings, paraphrased code to annotated diff, unitless bar to SVG chart, colour-only status to glyph + text + colour, scaled slide to vertical reflow — are in `${CLAUDE_PLUGIN_ROOT}/references/worked-examples.md`. `${CLAUDE_PLUGIN_ROOT}/examples/engineering-investigation-report.html` is partitioned, not copied. Reuse: the five-layer placement, the claim-to-evidence adjacency pattern, the observed/inferred tagging, the mobile table-to-list transform. Regenerate for your subject: palette, type pairing, masthead treatment, section rhythm, signature layout device. The test: output whose `:root` token values or grid skeleton match the example's was recolored — start the visual pass over. To see how one mechanic is implemented — print CSS, anchor markup, the data island, the annotation layer under `data-annot` — grep the example for that mechanic. Reading it end-to-end teaches its visual style, which is one valid answer rather than the answer.

## Handoff gate

Preflight: `node --version`, then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind report ./artifacts/report-<slug>-<YYYYMMDD>.html` on the written file. Answer each question below in text; any NO gets fixed and re-answered, and lowering the bar is not one of the options.

```
- [ ] Validator exited 0, and every remaining warning is either fixed or carried verbatim
      into the handoff's `Warnings:` line with one clause saying why it stands? Bending the
      prose to silence a warning is the failure this line exists to prevent.
- [ ] Does the first screen contain the contract's Verdict sentence, verbatim in meaning?
- [ ] Does every heading make a claim a colleague could disagree with?
- [ ] Does every figure and table caption open with the finding, and state nothing the alt text states?
- [ ] Delete the last paragraph: does anything the reader needs disappear?
- [ ] Does the closing beat state how the opening's Complication no longer holds — in the
      words the reader repeats to someone who missed it — rather than restating the verdict?
- [ ] Does every numeric claim above the fold have a source anchor within one screen of it?
- [ ] Does every code conclusion show the code, with repo@sha path:lines?
- [ ] Does every confidence word carry its numeric band as literal text?
- [ ] Does every chart show units, baseline, source, a takeaway sentence, and a data island?
- [ ] Delete every <script> and reload: does every load-bearing conclusion still read?
- [ ] Do at least three sections use visually different forms from each other?
- [ ] Is there any status conveyed by colour alone?
- [ ] Zero horizontal overflow at 1280px, 390px, and 320px — the WCAG SC 1.4.10 reflow width? (or: not visually verified — declare it)
- [ ] Print preview: no clipped content, no collapsed <details>, no dark flood? (or: not visually verified — declare it)
- [ ] Zero remote URLs in the file?
- [ ] Open ${CLAUDE_PLUGIN_ROOT}/examples/slop.fixture.html — the shipped negative fixture — beside this file: name three properties that differ.
```

At `tier= brief` the gate is these five. They are the ones answered by reading the validator's output and the file itself, and a sixteen-check gate on a 300-word status costs more attention than the status does.

```
- [ ] Validator exited 0, and every remaining warning carried verbatim into `Warnings:` with one clause saying why it stands?
- [ ] Does the first screen carry the contract's Verdict sentence, verbatim in meaning?
- [ ] Does every heading state a claim a colleague could answer "that's false" to?
- [ ] Does every figure and table carry a caption whose first sentence states the finding?
- [ ] Zero remote URLs, and zero horizontal overflow at 320px? (or: not visually verified — declare it)
```

Truth and evidence-proximity are scored by a separate verifier pass, not by the composing turn. The list above is the model checking observable properties of its own output, which is a different act from grading its own reasoning — and holistic self-scoring is the form the self-correction literature says fails. If the validator cannot run, say so in the handoff and mark the artifact UNVALIDATED rather than claiming the gate passed.

## Output and handoff

Default path `./artifacts/report-<slug>-<YYYYMMDD>.html`, creating `artifacts/` when absent. Add `artifacts/` to `.gitignore`, or write outside the repo, unless a committed deliverable was requested. Open it with `open <path>` on macOS or `xdg-open <path>` on Linux.

```
Artifact: <absolute path>
Verdict:  <the contract's verdict sentence>   Ask: <the decision or action wanted from the reader>
Gate:     <the validator's PASS line, pasted verbatim>
Warnings: <each remaining warning verbatim, or "none">
Coverage: <the validator's evidence-coverage line, verbatim>
```

With a browser automation tool available (chrome-devtools, playwright), load the file at 1440×900 and 390×844 and attach the screenshots. With none available, hand off with: "Not visually verified: no renderer available. Please check first screen, 320px reflow, print preview, and each export."

Revising an existing report: read the file first, then make the smallest edit that satisfies the request, keeping the token block, section ids, anchors, and structure choice intact. Update the visible `data-revision` stamp and re-run the validator at `--kind report`. Regenerating from scratch destroys the shared anchors people have linked to and the hand edits made since; `${CLAUDE_PLUGIN_ROOT}/references/revising.md` carries the full procedure.

## Optional: live reading room

When the user wants to read a report or plan and **select unclear text/code, leave an anchored comment, request an explanation, or chat inside the HTML with section context**, pair this skill with the separately installed `aio-html-interactive` skill from `aio-message-bridge` — install it with `/plugin install aio-message-bridge@aiocean-plugins`. This skill stays responsible for the report spine and evidence. Hand the live layer stable section/source anchors plus a small event contract such as `explain.request`, `comment.submit`, and `chat.submit`; the companion skill owns its scaffold, relay, Monitor loop, busy state, and cleanup. Read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` when this live tier is requested; it carries the handoff contract.
