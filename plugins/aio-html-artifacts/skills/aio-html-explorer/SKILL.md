---
name: aio-html-explorer
description: |
  One self-contained HTML file holding genuinely different options side by side on a shared set
  of criteria, so the choice gets made from the page instead of from memory. Reach for it when
  two or more real alternatives are live and someone has to pick one and record why.
when_to_use: |
  compare options, architecture alternatives, vendor selection, build vs buy, tradeoff matrix,
  decision record, ADR, scenario planning, option map, shortlist, "which approach should we
  pick", "weigh these up", so sánh phương án, chọn phương án nào,
  label the criteria, write the recommendation sentence
argument-hint: "the decision + the options + evidence sources"
effort: high
---

# Side-by-side HTML explorer

An explorer is one page that puts the alternatives on a shared baseline and ends with a recommendation a reader can act on now and audit later.

## Reference routing

Seven rows load every time. Every other row states a condition you can answer no to — from the request text, the contract keys, the material in hand, or the validator's output. **A row whose condition does not match is a row not read**, and leaving it unread is the design. Measured on a plain architecture-options request against the files on disk, 2026-08-13: 190 KB if every row fires, 118 KB with these conditions applied, of which 87 KB is the always set. The `references/data-story.md` row postdates that measurement and carries its own cost: 12 KB when an option is plotted against a threshold or a budget, 17 KB when a criterion cell also holds a rate, measured 2026-08-13. Paths are relative to `${CLAUDE_PLUGIN_ROOT}`.

| Open | When |
|---|---|
| `references/base-layer.html` + `references/layout-primitives.css` | always — paste the skeleton, paste the primitives into `<style>`, then diverge |
| `references/voices.css` | always — the rules every voice obeys, and the five-row chooser you pick from |
| `references/voices/<the voice you picked>.css` | always, exactly one file — the token block for the name in the contract's `voice=` |
| `references/artifact-grammar.md` | always — job, reading ladder, encoding, spine, proof placement, interaction tier, constraints, completion |
| `skills/aio-html-explorer/references/explorer-grammar.md` | always — options aligned on criteria, the unmeasured cell, the matrix reflow |
| `references/copy-craft.md` | always — the recommendation sentence and the criterion labels are what a reader compares on |
| `references/evidence-and-confidence.md` | always — an explorer that recommends is asserting something it did not run a command to establish |
| `references/encoding-and-charts.md` | three or more numeric values across time, load, or cost get plotted |
| `references/data-story.md` | an option's numbers are plotted against a threshold, a budget, a target, or a window the options are being judged on — read `Annotate the point` for the marks that put that criterion on the chart, about 12 KB of the file's 27 KB, and `Frame the number` when a criterion cell holds a rate, a percentage, or a projection, about 5 KB more |
| `references/diagrams-css.md` | an option is drawn as a named shape — a flow, a timeline, a phase strip, or a sequence |
| `references/diagrams.md` | an option whose shape is a topology with the medium still open, or an inline `<svg>` you are about to hand-write |
| `references/captions.md` | a `<figure>`, the criteria `<table>`, a chart, a diagram, or a screenshot goes in the page — read the one `###` block for that evidence type plus `The alt / figcaption / prose partition`, about 4 KB of the file's 13 KB |
| `references/interaction-budget.md` | weights, filters, a scenario switcher, or any `<script>` past a JSON data island. The `beforeprint` listener pasted from `references/base-layer.html` does not count — it is mandatory whenever the page holds a `<details>`, so counting it would make this row unconditional |
| `references/microcopy.md` | the page ships a `<button>`, a form field, or an export action. A `<summary>` on its own takes one rule and no file: it names what is behind it — "Full stack trace (42 lines)", "Why we rejected the Redis approach" — because a disclosure label is announced in isolation, the way link text is |
| `references/typography-and-voice.md` | the request names a brand, a company style, or a look to match; or you change a value inside the voice block |
| `references/copy-delint.md` | the validator printed a finding whose id starts `copy.`, or the request says the writing reads like AI |
| `references/worked-examples.md` | a drafted option block that would have come out the same for any comparison |
| `references/revising.md` | a file already exists at the target path |
| `references/live-collaboration.md` | the request names commenting, questioning, or deciding inside the page |

## Artifact contract

```
GATE — it is not an explorer until it answers all three:
Q1 "What would make each option win?"   (every option carries the condition under which it is right)
Q2 "What does the recommendation cost?" (≥1 concrete negative consequence for the CHOSEN option)
Q3 "What do we not know?"               (every unmeasured cell says so and names the evidence that would fill it — genreChecks already errors here)
Answering only Q1 → a survey. Missing Q2 → a rationalization of a decision already made.
```

Emit this block to the user before writing markup, then write it into the file head as the `ARTIFACT CONTRACT` comment the validator reads, every key the tier asks for non-empty. In the file the keys take the `key= value` form of the comment already in `references/base-layer.html` — the parser reads `=`, so a pasted `Key:` line registers as empty.

```
ARTIFACT CONTRACT
Tier:          <brief when the page runs under 600 body words and its spine is neither
                incident nor decision record; the keys marked (full) then go unwritten>
Reader:        <who, and what they already know>
Question:      <the one question this page answers>
Verdict:       <the literal recommendation sentence that appears in the first screen, not a paraphrase of it, with a calibrated confidence word + band>
Consequence:   (full) <what changes because of the verdict>
Challenge:     (full) <the strongest objection a skeptical reader would raise>
Structure:     (full) <which spine, and why this one>
Spine:         <3-6 section titles, each a claim a colleague could answer "that's false" to — the validator reads this key against the stock-heading list, so Overview / Background / Analysis fails here, before any HTML exists>
Transition:    (full) <the ONE dominant transition type repeated in every section>
Evidence:      <per section: the exact artifact — file:line, log excerpt, metric>
Visuals:       (full) <relationship -> form, e.g. "cost under load -> SVG chart, zero baseline">
Voice:         (full) <one of the five, or a declared reason for a sixth>
Generic-check: (full) <name one thing in this plan you would have produced for ANY artifact
                on this topic, and what you replaced it with>
```

**What `tier= brief` trades.** A two-option page under 600 body words takes five keys — Reader, Question, Verdict, Spine, Evidence — each answered in 24 characters or more, because five one-word answers decide as little as twelve do. Brief tier stands down the seven keys marked `(full)`, the `data-confidence` word and its band on an inferred claim, and the `[data-falsifier]` block. It holds everything that makes an artifact correct at any size: self-containment, the accessibility set, the print block, the reduced-motion fallback, one `h1`, `<html data-voice="…">` where the voice is now declared once, a claim carrying its `data-src` or `data-basis`, the 80% coverage floor, the two-option and three-criteria floors, the unmeasured cell, and the claim heading. Above 600 body words, and on an incident or decision-record spine, the validator refuses the tier and asks for twelve keys, because those two spines are the ones a reader acts on. The routing shrinks with it: `references/base-layer.html`, `references/layout-primitives.css`, `references/voices.css`, the one voice file, `skills/aio-html-explorer/references/explorer-grammar.md`, and `references/copy-craft.md` §*The claim heading*.

## How the explorer is built

**The comparison surface is one aligned table: criteria down the left as `<th scope="row">`, one column per option, every cell in a row carrying the same unit, each alternative marked `data-option` and exactly one element marked `data-recommendation`.** Comparison on shared criteria is a table because it is one, and eyes beat memory — so nothing being compared sits behind tabs, accordions, or slides. *(low freedom — the validator reads `th[scope=row]` ≥ 3, `data-option` ≥ 2, `data-recommendation` = 1)*

**Four options stand side by side at most, differing in mechanism rather than in wording.** Three cosmetic variants of one idea make a matrix whose rows all read alike, which is a decision already taken; a longer field arrives as a shortlist whose elimination rule is printed on the page, because working memory holds 3 to 5 meaningful chunks (Cowan 2010) and a fifth column gets compared against memory instead of against the page. *(high freedom — which options are real is the judgement this genre exists for)*

**The first screen is: the decision question, the recommendation sentence with its confidence word and numeric band, the consequence of choosing it, and the constraint that eliminated the closest runner-up.** A reader who closes the tab after eight seconds leaves with the decision and with the reason it went that way.

**Constraints and criteria occupy two separate blocks, and anything that eliminates an option stands in the open document — in that option's column and again in the recommendation paragraph.** A constraint is pass/fail and removes an option from the table; a criterion trades off and gets compared across the row; a preference written as a constraint eliminates an option nobody agreed to eliminate. `<details>` carries depth behind a cell — the full benchmark table, the vendor quote, the raw log — so deleting every `<script>` and reloading still shows which options are out and why. *(low freedom)*

**Every claim element carries `data-claim` valued `observed`, `inferred`, `assumed`, or `recommended`** — `observed` adds `data-src`, `inferred` adds `data-basis` + `data-confidence`, `recommended` adds `data-basis` — and each confidence word prints its numeric band as literal text beside it, because a bare word matches reader intent 32% of the time and a banded word 66% (PLOS ONE 2019, N=924). **A cell with no measurement is written as a named gap:** *(low freedom — the validator errors on a comparison cell left empty or filled with a placeholder: a dash, `n/a`, `TBD`, `?`, `TODO`. A matrix where every criterion was measured passes; a cell that names what is missing passes; a `data-gap` attribute of 12 characters or more naming the observation that would fill it passes.)*

```html
<td class="unknown">Not measured <small>needs: LT-204 rerun</small></td>
```

A visible gap is a finding; a filled-in guess is a defect. Every unknown names the evidence that would fill it. Past a third of the matrix as gaps, change the layout rather than the numbers.

**The recommendation and every inferred claim ship with a falsifier section carrying `data-falsifier`,** each entry a runnable command or a specific observation plus the direction that refutes it. **A weighted score ships with its weights visible as numbers, the raw evidence beside each score, and a sensitivity line naming the weight change that flips the answer** — the score is a model of the decision, so the model sits on the page beside its output, and inline JS above 2 KB warns in the validator, which is the size at which the interaction has begun deciding for the reader. The recommendation itself takes this shape, naming where the winner loses, because a recommendation carrying only strengths reads as advocacy:

```
Choose <X> for <context/horizon> because <decisive evidence>. Accept <specific downside>.
Do <experiment or mitigation> before <commit point>. Reconsider if <falsifier> occurs.
```

**Sections vary in width, density, and visual form according to what they encode** — the matrix is aligned columns, a rollout order is a timeline, a topology is a diagram, a cost curve is a chart with units and a stated baseline. A page where every section is the same rounded card at the same size has encoded nothing. *(high freedom — the genre lives here)*

## Worked pair

<example>
Before — status carried by colour alone:

```html
<tr><th scope="row">Ops burden</th>
  <td style="background:#16a34a"></td><td style="background:#eab308"></td><td style="background:#dc2626"></td></tr>
```

After — glyph, then text, then colour:

```html
<tr><th scope="row">Ops burden</th>
  <td class="good"><span aria-hidden="true">●</span> Low — one existing on-call rotation
    <small data-claim="observed" data-src="sre-rota">SRE rota, 2026-07</small></td>
  <td class="mixed"><span aria-hidden="true">◐</span> Medium — one more broker on the rota</td>
  <td class="unknown">Not measured <small>needs: LT-204 rerun</small></td></tr>
```

Why: the swatches vanish in greyscale print, in forced-colors mode, and for a red-green reader, taking the row's whole meaning with them; the glyph and the word carry the status while colour reinforces it, and the third cell stops passing an absence off as a middling score.
</example>

Five more pairs — card soup to severity-ordered findings, container headings to claim headings, paraphrased code to annotated diff, unitless bar to SVG chart, scaled slide to vertical reflow — are in `${CLAUDE_PLUGIN_ROOT}/references/worked-examples.md`. `${CLAUDE_PLUGIN_ROOT}/examples/queue-architecture-explorer.html` is partitioned, not copied. Reuse: the layer placement, the claim-to-evidence adjacency pattern, the observed/inferred tagging, and the mobile column-to-band transform. Regenerate for your subject: palette, type pairing, masthead treatment, section rhythm, signature layout device. The test: output whose `:root` token values or grid skeleton match the example's was recolored — start the visual pass over. To see how one mechanic is implemented — the unknown cell, the falsifier block, the criterion-band reflow — grep the example for that mechanic; reading it end-to-end teaches its visual style, which is one valid answer rather than the answer.

## Handoff gate

Preflight: `node --version`, then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind explorer ./artifacts/explorer-<slug>-<YYYYMMDD>.html` on the written file. Answer each question below in text; any NO gets fixed and re-answered, and lowering the bar is not one of the options.

```
- [ ] Validator exited 0, and every remaining warning is either fixed or carried verbatim
      into the handoff's `Warnings:` line with one clause saying why it stands? Bending the
      prose to silence a warning is the failure this line exists to prevent.
- [ ] Does the first screen contain the contract's Verdict sentence, verbatim in meaning?
- [ ] data-option on every option, one data-recommendation, 3+ criteria on a shared axis?
- [ ] Does every heading make a claim a colleague could disagree with?
- [ ] Does every figure and table caption open with the finding, and state nothing the alt text states?
- [ ] Delete the last paragraph: does anything the reader needs disappear?
- [ ] Does the recommendation name the accepted downside and the falsifier that would reverse
      it — not just why the winner wins?
- [ ] Does every numeric cell have a source anchor within one screen of it?
- [ ] Does every code or config conclusion show the code, with repo@sha path:lines?
- [ ] Does every confidence word carry its numeric band as literal text?
- [ ] Does every unmeasured cell say so and name the evidence that would fill it?
- [ ] Does every chart show units, baseline, source, a takeaway sentence, and a data island?
- [ ] Delete every <script> and reload: matrix, recommendation, disqualifiers still read?
- [ ] Do at least three sections use visually different forms from each other?
- [ ] Is there any status conveyed by colour alone?
- [ ] Zero overflow at 1280px, 390px, and 320px — the WCAG SC 1.4.10 reflow width — with the
      labels intact in each criterion band? (or: not visually verified — declare it)
- [ ] Print preview: no clipped content, no collapsed <details>, no dark flood? (or: not visually verified — declare it)
- [ ] Zero remote URLs in the file?
- [ ] Placed beside a generic dark/violet AI-report template, would a reader tell them apart?
```

Truth and evidence-proximity are scored by a separate verifier pass, not by the composing turn. The list above is the model checking observable properties of its own output, which is a different act from grading its own reasoning — and holistic self-scoring is the form the self-correction literature says fails. If the validator cannot run, say so in the handoff and mark the artifact UNVALIDATED rather than claiming the gate passed.

## Output and handoff

Default path `./artifacts/explorer-<slug>-<YYYYMMDD>.html`, creating `artifacts/` when absent. Add `artifacts/` to `.gitignore`, or write outside the repo, unless a committed deliverable was requested. Open it with `open <path>` on macOS or `xdg-open <path>` on Linux.

```
Artifact: <absolute path>
Verdict:  <the recommendation, one sentence>   Ask: <the decision wanted from the reader>
Gate:     <the validator's PASS line, pasted verbatim>
Warnings: <each remaining warning verbatim, or "none">
Coverage: <the validator's evidence-coverage line, verbatim>
```

With a browser automation tool available (chrome-devtools, playwright), load the file at 1440×900 and 390×844 and attach the screenshots. With none available, hand off with: "Not visually verified: no renderer available. Please check first screen, 320px reflow, print preview, and each export."

Revising an existing explorer: read the file first, then make the smallest edit that satisfies the request, keeping the token block, option ids, criterion anchors, and structure choice intact. Update the visible `data-revision` stamp and re-run the validator at `--kind explorer`. Regenerating from scratch destroys the shared anchors people have linked to and the hand edits made since; `${CLAUDE_PLUGIN_ROOT}/references/revising.md` carries the full procedure.

## Optional: deliberate with the agent in place

When the user wants to **select an option claim and ask why, comment on evidence, propose a new constraint, chat about a scenario, or have the agent update the comparison live**, pair this skill with the separately installed `aio-html-interactive` skill from `aio-message-bridge` — install it with `/plugin install aio-message-bridge@aiocean-plugins`. This skill stays responsible for comparable criteria, evidence, and recommendation logic. Hand the live layer stable option and criterion anchors plus a small event contract such as `comment.submit`, `chat.submit`, and `decision.submit`; the companion skill owns its scaffold, relay, Monitor loop, busy state, and cleanup. `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` carries the handoff contract.
