# The HTML artifact grammar

A content system, not a visual theme — the shared spine every artifact skill routes into.

**Settles:** the eleven decisions shared by all four genres — the human job, the reading ladder,
which visual form each relationship takes, spine and parallelism, proof placement, interaction
tier and budget, the hard constraints, the completion gate, output, and revising.

**Routing lives in the SKILL.md that sent you here**, in one table, and that table is the only
router. This file names no reference to open next, because two routing tables drift apart and
the model then reads the union of both.

## Contents

1 human job · 2 reading ladder · 3 encoding · 4 spine and parallelism · 5 proof · 6 interaction tier · 7 interaction budget · 8 constraints · 9 completion · 10 output and handoff · 11 revising

## 1. Start with the human job

Name the job in one verb. The form follows that verb.

| Human job | Primary form | Not |
|---|---|---|
| Understand | explainer/report with annotated evidence | dashboard of disconnected facts |
| Decide | aligned alternatives and explicit tradeoffs | prose that makes comparison memory-dependent |
| Present | paced deck with one claim per scene | a report cut into slides |
| Manipulate | purpose-built editor with preview and export | a generic form with no feedback loop |
| Audit | traceable claims, source anchors, raw appendix | conclusions detached from evidence |

**Genre tiebreaker.** When a request could be two genres, ask what the human does next: read and audit → report; sit through a pace → deck; hold options side by side → explorer; change something and hand it back → editor. Choose one and make the second a supporting mode.

## 2. The reading ladder

Five depths on one pass of content. The ladder is reverse-traversable: every claim carries a one-action jump to its evidence anchor, so a reader who starts at a conclusion reaches its proof without hunting.

1. **Glance — overview.** Truthful title, verdict, the single most important consequence.
2. **Scan — overview.** The map: key numbers, phases, options, findings. The reader learns where to look next.
3. **Understand — relate.** Causal explanation, sequence, comparison, annotated diagram. The narrative spine.
4. **Audit — details-on-demand.** Exact code, diffs, logs, citations, assumptions, methods, raw data, each inside the section that asserts the claim it supports.
5. **Act — extract.** A decision, checklist, owner/date, copy/export action, or next prompt.

Word budgets, as authoring heuristics: glance ≤40 words · scan ≤150 words of headings, numbers and labels · understand ≤900 words of prose · audit unlimited, collapsed, chunked ≤40 lines per excerpt · act ≤60 words.

**Two conditional rungs.** Above 20 evidence items, zoom and filter are part of the artifact and the page opens with search plus local context in place of a global overview — a global overview of 200 rows orients nobody. For editors, history is part of the artifact: the reader sees what changed from the loaded state.

Place the ladder spatially: headline top, overview near it, explanation in the main flow, evidence beside its claim, action at the decision point.

## 3. Choose a visual sentence for each relationship

| Relationship in the information | Visual sentence |
|---|---|
| Sequence / change over time | timeline, steps, before → after |
| Causality / data movement | directed flow with annotated edges |
| Comparison | aligned columns, shared baselines, matrix |
| Hierarchy / containment | nested regions or tree |
| Magnitude / trend | proportionate chart with units and baseline |
| State / lifecycle | state machine or phase strip |
| Spatial relationship | map, canvas, positioned diagram |
| Source evidence | code/diff/log block with line anchors and callouts |
| Uncertainty | confidence marker plus what would change the conclusion |

Tables are for exact lookup. Charts are for shape. Diagrams are for relationships. Prose is for reasoning. Code is for proof. Use the smallest truthful representation.

The markup for each form is routed from the SKILL.md, under these names: magnitude, trend, ratio and chart markup in `encoding-and-charts.md`; the medium chooser and the SVG rules in `diagrams.md`; flows, timelines, phases, sequences and annotated code in `diagrams-css.md`.

## 4. Spine, then page — with parallelism

Write a one-line spine before HTML:

> Context → tension/question → evidence → meaning → resolution/action.

Section headings make claims ("Retries hide the real failure") rather than label containers ("Analysis").

**Bookend.** The tension/question the opening raises gets resolved, not restated, at the point the artifact ends. A closing that repeats the verdict is the fractal-summary tell; a closing that states what changes now that the tension is resolved earns its place. State it in the words the reader repeats to someone who missed it.

**Titles-only coherence gate.** Extract every section or scene heading, in order, with no body text. Read that list alone — it must read as a rising argument, not a table of contents. A flat topic list at this test means the spine is organized by subject, not by claim; recut it before writing more prose.

**Parallelism.** Pick ONE dominant transition type and repeat the identical internal skeleton in every section:

```
<h2>claim as a sentence>  →  verdict line + confidence  →  same chart form
  →  <details> exact excerpt with file:line  →  impact line
```

Deviating for "visual variety" is a defect, not a feature. Defaults by genre: general→specific for reports and audits; chronological for incidents; dimension-walk for comparisons. State the chosen transition type in the contract comment under `transition-type=`.

Width, density and visual form still vary with what a section encodes — sequence gets a timeline, comparison gets aligned columns, code gets annotated code. That is the encoding from §3 doing its job; the section skeleton stays identical underneath it.

Long artifacts orient with a sticky or compact table of contents, a progress marker, or section numbering. The reading order stays valid without CSS or JavaScript.

## 5. Put proof next to the claim

Show the actual relevant lines, annotate the exact line that carries the argument, and distinguish what you observed from what you inferred, assumed, and recommend. A visible gap is a finding; a filled-in guess is a defect.

The claim enum, the seven calibrated confidence words with their numeric bands, the three source-anchor shapes (code, web, command), the falsifier block, and the coverage line live in `${CLAUDE_PLUGIN_ROOT}/references/evidence-and-confidence.md`. Use those anchor shapes as-is — they are the format the validator reads and the format a reader can re-fetch from.

For sensitive material, redact secrets and personal data before embedding.

## 6. Name the interaction tier

Name the tier in the artifact contract so "interactive" carries one meaning.

1. **Readable artifact:** navigation and disclosure only; the document stays a shareable file.
2. **Local instrument:** filters, simulation, editing and export run entirely in the browser; no agent is listening.
3. **Live agent surface:** selection, contextual comments, explanation requests or chat travel to the active agent and answers return into the page. This runs on the separately installable `aio-html-interactive` / `aio-message-bridge` runtime — read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` and reference that skill in place of copying its scaffold here.

## 7. Interaction budget

Interaction is a cost center. The ideal artifact answers the reader's question at zero interactions. Static is the default.

Resolve every parameter in this order, falling through only when the step above is impossible: infer it from context you already have and hard-code the answer → show all of it as small multiples → add a control and run the gate in `${CLAUDE_PLUGIN_ROOT}/references/interaction-budget.md`, which carries the gate, the 3-interaction ceiling, the JS-deletion test, the deck controller, the editor state pattern, and the rules for large data sets.

## 8. Constraints

- Emit exactly one self-contained `.html` file. Zero remote `src`, `href`, or `url()` — the validator hard-fails on any `https?://` asset reference, including fonts. Everything the page needs is inline: CSS, SVG, JS, data.
- Structural invariants: exactly one `<style>`, at most one `<script>`, zero external references. No build step.
- A restrained token set: canvas, ink, muted ink, rule, accent, semantic danger/warn/success, a type scale, a spacing rhythm. Every colour traces to a token.
- Cap prose with `max-inline-size: var(--measure)` — `34em` prose (≈68 characters), `45em` tables/code/reference, `88ch` inside `<pre>`. `ch` is the advance of the `0` glyph and equals one character only in monospace.
- Exactly one `<h1>` in the document. In a deck, the `<h1>` is the deck title on the opening slide; every subsequent slide title is `<h2>`.
- Semantic landmarks, ordered heading levels, real buttons, `:focus-visible` with a visible outline, sufficient contrast, text alternatives for meaningful SVG.
- Reflow at 320 CSS pixels. Honour `prefers-reduced-motion`. Touch targets ≥24×24 CSS px.
- Print CSS that hides controls, expands essential detail, avoids awkward breaks, and expands link URLs. A file containing `<details>` also ships the `beforeprint` listener from `references/base-layer.html`, because a closed `<details>` is never printed and CSS cannot override it.
- Style this subject. A report, deck, explorer and editor from the same session read as four different documents.

## 9. Completion

**What you can do, mechanically:**

1. Run the validator:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind <report|deck|explorer|editor> ./artifacts/<kind>-<slug>-<YYYYMMDD>.html`
2. If a browser automation tool is available (chrome-devtools, playwright), load the file at 1440×900 and 390×844 and attach the screenshots.

**What you declare instead.** If no renderer is available, do not claim visual verification. Hand off with this sentence:

> Not visually verified: no renderer available. Please check first screen, 320px reflow, print preview, and each export.

If the validator itself cannot run, say so in the handoff and mark the artifact UNVALIDATED, in place of claiming the quality gate passed.

## 10. Output and handoff

Default path `./artifacts/<kind>-<slug>-<YYYYMMDD>.html`, creating `./artifacts/` when absent. Add `artifacts/` to `.gitignore`, or write outside the repo, when the user asked for a deliverable rather than a committed file.

Open it with `open <path>` (macOS) or `xdg-open <path>` (Linux). Where neither exists, give the absolute path and say the file is ready to open in a browser, in place of reporting that it opened.

Close out with this block. It is the one close-out block in this plugin: report, deck, explorer and editor paste these five labels, spelled and ordered exactly as below, and change only what fills the angle brackets.

```
Artifact: /absolute/path/to/artifacts/report-queue-saturation-20260813.html
Verdict:  <the contract's verdict sentence>   Ask: <the decision or action wanted from the reader>
Gate:     PASS artifacts/report-queue-saturation-20260813.html as report (0 error, 0 warn)
Warnings: <each remaining warning verbatim, or "none">
Coverage: evidence coverage: 9/12 claims carry a basis (75%) — uncited: #c4 #c7 #c9
```

The `Gate:` line is the validator's own output line, pasted verbatim. `Ask:` names what the reader does next, which is what turns a delivered file into a decision. One label set across four genres is what lets a reader skim five artifacts from five sessions and find the verdict on the same line every time.

## 11. Revising an existing artifact

Read the file first, then make the smallest edit that satisfies the request with the Edit tool, preserving the token block, the section ids and anchors, and the structure choice.

Update the visible `data-revision` stamp, re-run the validator for the same `--kind`, and report a change summary.

Regenerating from scratch to satisfy a revision request is a defect — it destroys shared anchors and hand edits. The full procedure is in `${CLAUDE_PLUGIN_ROOT}/references/revising.md`.
