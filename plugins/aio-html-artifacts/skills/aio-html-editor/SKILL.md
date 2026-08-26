---
name: aio-html-editor
description: |
  One self-contained HTML instrument for changing a specific set of real values and handing
  the change back — flags, config, prompts, priorities, annotations. Reach for it when the
  work is a set of concrete edits to structured data and describing those edits in chat costs
  more than making them. When the human reads and audits instead, that is aio-html-report;
  when they hold options side by side, aio-html-explorer.
when_to_use: |
  feature flag editor, config editor, prompt tuner, ticket triage UI, annotation tool,
  parameter tuning, export json diff, công cụ chỉnh sửa, sửa cấu hình, chỉnh tham số,
  button labels, error messages, empty state, microcopy, nhãn nút, thông báo lỗi
argument-hint: "the data to edit + where the result goes"
effort: medium
---

# Purpose-built HTML editor

An editor is a disposable instrument for one dataset: it opens with the real values loaded, and it hands back exactly what changed.

## Reference routing

Eight rows load every time. Every other row states a condition you can answer no to — from the request text, the contract keys, the material in hand, or the validator's output. **A row whose condition does not match is a row not read**, and leaving it unread is the design. Measured on a plain feature-flag-editor request against the files on disk, 2026-08-13: 190 KB if every row fires, 114 KB with these conditions applied, of which 74 KB is the always set. The `references/data-story.md` row postdates that measurement and carries its own cost: 12 KB when the preview plots a value against a limit it is being tuned toward, measured 2026-08-13. Paths are relative to `${CLAUDE_PLUGIN_ROOT}`.

| Open | When |
|---|---|
| `references/base-layer.html` | always — paste it as the document skeleton, then diverge |
| `references/layout-primitives.css` | always — paste into `<style>`, compose with the primitives |
| `references/voices.css` | always — the rules every voice obeys, and the five-row chooser you pick from |
| `references/voices/<the voice you picked>.css` | always, exactly one file — the token block for the name in the contract's `voice=` |
| `skills/aio-html-editor/references/editor-contract.md` | always — state, `INITIAL`, `update()`, diff export, accessible names |
| `references/artifact-grammar.md` | always — job, reading ladder, encoding, spine, proof placement, interaction tier, constraints, completion |
| `references/microcopy.md` | always — an editor is controls, and every one carries a label, an error, an empty state and a busy state |
| `references/interaction-budget.md` | always — an editor runs a script, so the earn-its-place gate and the state pattern apply to every control on it |
| `references/copy-craft.md` | the page carries a verdict sentence, panel headings, or a paragraph of explanation above the fields |
| `references/evidence-and-confidence.md` | a recommended value, a prior finding, or a number beside a field that you did not run a command to establish |
| `references/encoding-and-charts.md` | the preview plots three or more numeric values |
| `references/data-story.md` | the preview plots a value against a limit, a budget, a target, or a window the reader is tuning toward — read `Annotate the point` for the reference line and the direct label that put that limit in the preview instead of in a note beside it, about 12 KB of the file's 27 KB |
| `references/diagrams-css.md` | a named shape sits beside the fields — a flow, a timeline, a phase strip, or a sequence |
| `references/diagrams.md` | a topology or dependency whose medium is still open, or an inline `<svg>` you are about to hand-write |
| `references/captions.md` | a `<figure>`, a `<table>` with a header row, a chart, a diagram, or a screenshot goes in the page — read the one `###` block for that evidence type plus `The alt / figcaption / prose partition`, about 4 KB of the file's 13 KB |
| `references/typography-and-voice.md` | the request names a brand, a company style, or a look to match; or you change a value inside the voice block |
| `references/copy-delint.md` | the validator printed a finding whose id starts `copy.`, or the request says the writing reads like AI |
| `references/worked-examples.md` | a drafted panel that would have come out the same for any editor |
| `references/revising.md` | a file already exists at the target path |
| `references/live-collaboration.md` | the agent explains a warning or proposes a value mid-session |

## Artifact contract

```
GATE — it is not an editor until it answers all three:
Q1 "What am I looking at, and what happens if I change it?"  (every control's label names the effect)
Q2 "What did I change?"                                       (a visible diff from the loaded state)
Q3 "What do I do with the result?"                            (an export whose label names the
                                                               artifact and its scope)
```

Emit this block to the user before writing markup, then write it into the file head as the `ARTIFACT CONTRACT` comment the validator reads, every key the tier asks for non-empty. In the file the keys take the `key= value` form of the comment already in `references/base-layer.html` — the parser reads `=`, so a pasted `Key:` line registers as empty.

```
ARTIFACT CONTRACT
Tier:          <brief when the page runs under 600 body words and its spine is neither
                incident nor decision record; the keys marked (full) then go unwritten>
Reader:        <who, and what they already know>
Question:      <the one question this page answers>
Verdict:       <the literal sentence that appears in the first screen — what this editor decides and what a wrong value costs — with a calibrated confidence word + band>
Consequence:   (full) <what changes because of the verdict>
Challenge:     (full) <the strongest objection a skeptical reader would raise>
Structure:     (full) <which spine, and why this one>
Spine:         <3-6 panel headings, each stating the effect a colleague could answer "that's false" to — the validator reads this key against the stock-heading list, so Overview / Background / Analysis fails here, before any HTML exists>
Transition:    (full) <the ONE dominant transition type repeated in every section>
Evidence:      <per section: the exact artifact — file:line, log excerpt, metric>
Visuals:       (full) <relationship -> form, e.g. "deploy sequence -> CSS timeline">
Voice:         (full) <one of the five, or a declared reason for a sixth>
Generic-check: (full) <name one thing in this plan you would have produced for ANY artifact
                on this topic, and what you replaced it with>
```

**What `tier= brief` trades.** A one-panel instrument under 600 body words takes five keys — Reader, Question, Verdict, Spine, Evidence — each answered in 24 characters or more, because five one-word answers decide as little as twelve do. Brief tier stands down the seven keys marked `(full)`, the `data-confidence` word and its band on an inferred claim, and the `[data-falsifier]` block. It holds everything that makes an artifact correct at any size: self-containment, the accessibility set, the print block, the reduced-motion fallback, one `h1`, `<html data-voice="…">` where the voice is now declared once, a claim carrying its `data-src` or `data-basis`, the 80% coverage floor, the live region, the export that reads live state, and the claim heading. Above 600 body words, and on an incident or decision-record spine, the validator refuses the tier and asks for twelve keys, because those two spines are the ones a reader acts on. The routing shrinks with it: `references/base-layer.html`, `references/layout-primitives.css`, `references/voices.css`, the one voice file, `skills/aio-html-editor/references/editor-contract.md`, and `references/microcopy.md`.

The second contract block — source, schema, operations, invariants, derived state, dirty state, export, failure paths — is in `${CLAUDE_PLUGIN_ROOT}/skills/aio-html-editor/references/editor-contract.md` and is filled in the same turn, before markup.

## How the editor is built

**The file opens with the real initial data already in the controls and every derived surface already computed** — preview, counts, warnings, dirty state. First paint is the useful state, so the instrument is worth opening offline with no click. *(low freedom)*

**The DOM inputs are the state.** Freeze an `INITIAL` snapshot at load, run one idempotent `update()` that recomputes every derived surface from the DOM, attach one delegated listener per container, and export `diff(INITIAL, now)` rather than a raw dump. A parallel JS store puts two writers on the same value, and the one that loses is always the one the user was looking at. Those four constructs fit in roughly 10-12 KB of vanilla JS, and the validator warns above 14 KB of inline JS for this kind — that ceiling is what keeps a framework out. *(low freedom — exact constructs)*

**Every control carries a unique accessible name across repeated blocks**, built from the row's own identity: `aria-label="rollout percent — checkout-v2"`, not eight fields all named "percent". The validator errors on duplicate accessible names in a repeated block, and a screen-reader user hears eight identical labels for eight different flags. *(low freedom)*

**Each warning sits beside the control that caused it and names the value, the rule it broke, and the action that restores a valid state.** A message that names only "invalid" hands the reader a search problem on top of an edit problem. *(low freedom — the three parts)*

**Every drag, lane move, or canvas gesture ships with a button or keyboard path that performs the same operation**, because pointer-only manipulation removes the operation entirely for keyboard and touch-assist users rather than making it harder. *(low freedom)*

**Editing history is part of the artifact: the loaded value stays visible beside the current one**, a reset restores it, and every state change writes one sentence into a single `aria-live="polite"` region naming what changed and its new value. An editor whose old value is gone cannot answer the question its user actually has, which is "what am I about to change?", and live state shown as text rather than only as a position is what makes a slider or a lane readable without sight of the pixels. *(low freedom)*

**Export is a primary control in the first screen, with a visible preview of the exact text it produces**, a stable key order, explicit indentation, a trailing newline for files, and a textarea fallback that selects the full text when the clipboard call is refused on `file://`. *(low freedom)*

**The artifact carries values that are safe to hand around, and it holds them only for the session** — no secrets in the file, no browser storage by default. When the user asks for persistence, the file names the storage it uses and shows a reset control beside it, because a shareable file is a file that travels further than the session that made it. *(low freedom)*

**Controls are grouped by the decision they serve, and the group that carries the decision gets the space** — a rollout editor for eight flags, a prompt tuner with a live preview, and a triage queue read as three different instruments. Uniform rounded cards at uniform size encode that every field matters equally, which is rarely true. *(high freedom — the genre lives here)*

## Worked pair

<example>
Before — the conclusion is about a rule the reader cannot see:

```html
<input id="pct" value="140">
<span class="error">Invalid configuration. Please check your input.</span>
```

After — the value, the rule, the anchor, and the way back:

```html
<label for="pct-checkout-v2">Rollout percent — checkout-v2</label>
<input id="pct-checkout-v2" name="checkout-v2.percent" type="number" value="140"
       aria-describedby="err-checkout-v2" aria-invalid="true">
<p class="error" id="err-checkout-v2" role="alert">
  <b>140</b> is above the cap of <b>100</b> in
  <code>config/rollout.schema.json:22</code> (<code>"maximum": 100</code>).
  Loaded value was 25.
  <button type="button" data-act="restore" data-field="checkout-v2.percent">Restore 25</button>
</p>
```

Why: the accessible name carries the flag it belongs to, so eight rows are eight names; the message names the value, the rule with its file:line, and the loaded value it can return to; and the way back is a control, not an instruction to retype.
</example>

Five more pairs — card-soup findings to severity-ordered list, container headings to claim headings, unitless bar to SVG chart, colour-only status to glyph + text + colour, scaled slide to vertical reflow — are in `${CLAUDE_PLUGIN_ROOT}/references/worked-examples.md`. `${CLAUDE_PLUGIN_ROOT}/examples/rollout-editor.html` is partitioned, not copied. Reuse: the layer placement, the claim-to-evidence adjacency pattern, the observed/inferred tagging, the mobile table-to-list transform. Regenerate for your subject: palette, type pairing, masthead treatment, section rhythm, signature layout device. The test: output whose `:root` token values or grid skeleton match the example's was recolored — start the visual pass over. To see how one mechanic is implemented — clipboard fallback, the diff serializer, print-as-record — grep the example for that mechanic. Reading it end-to-end teaches its visual style, which is one valid answer rather than the answer.

## Handoff gate

Preflight: `node --version`. Trace each branch in the file once — valid edit, invalid value, empty set, reset, export, clipboard refused — since every one of them is a path a user reaches and none of them is exercised by the validator. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind editor ./artifacts/editor-<slug>-<YYYYMMDD>.html` on the written file, then answer each question below in text; any NO gets fixed and re-answered, and lowering the bar is not one of the options.

```
- [ ] Validator exited 0, and every remaining warning is either fixed or carried verbatim
      into the handoff's `Warnings:` line with one clause saying why it stands? Bending the
      prose to silence a warning is the failure this line exists to prevent.
- [ ] Does first paint show the real loaded data with every derived surface computed, before any click?
- [ ] Does every heading make a claim a colleague could disagree with?
- [ ] Does every figure and table caption open with the finding, and state nothing the alt text states?
- [ ] Delete the last paragraph: does anything the reader needs disappear?
- [ ] Where a verdict sentence or framing paragraph opens the page, does the export close
      that promise — not leave it as an open loop?
- [ ] Is every control's accessible name unique within its repeated block?
- [ ] Does every changed field show its loaded value beside its current one?
- [ ] Does export contain the diff against INITIAL, and does running it twice produce identical text?
- [ ] Does every warning name the value, the rule, and the action that restores a valid state?
- [ ] Does every state change write a sentence into the aria-live region?
- [ ] Does every drag or gesture have a button or keyboard path doing the same operation?
- [ ] Delete every <script> and reload: does the file still show the loaded data and what it is for?
- [ ] Is there any status conveyed by colour alone?
- [ ] Zero horizontal overflow at 1280px, 390px, and 320px — the WCAG SC 1.4.10 reflow width? (or: not visually verified — declare it)
- [ ] Print preview: no clipped content, no collapsed <details>, no dark flood? (or: not visually verified — declare it)
- [ ] Zero remote URLs in the file?
```

Truth and evidence-proximity are scored by a separate verifier pass, not by the composing turn. The list above is the model checking observable properties of its own output, which is a different act from grading its own reasoning — and holistic self-scoring is the form the self-correction literature says fails. If the validator cannot run, say so in the handoff and mark the artifact UNVALIDATED rather than claiming the gate passed.

## Output and handoff

Default path `./artifacts/editor-<slug>-<YYYYMMDD>.html`, creating `artifacts/` when absent. Add `artifacts/` to `.gitignore`, or write outside the repo, unless a committed deliverable was requested. Open it with `open <path>` on macOS or `xdg-open <path>` on Linux.

```
Artifact: <absolute path>
Verdict:  <what this editor decides, one sentence>   Ask: <the export or decision wanted back>
Gate:     <the validator's PASS line, pasted verbatim>
Warnings: <each remaining warning verbatim, or "none">
Coverage: <the validator's evidence-coverage line, verbatim>
```

With a browser automation tool available (chrome-devtools, playwright), load the file at 1440×900 and 390×844 and attach the screenshots. With none available, hand off with: "Not visually verified: no renderer available. Please check first screen, 320px reflow, print preview, and each export."

Revising an existing editor: read the file first, then make the smallest edit that satisfies the request, keeping the token block, field ids, `INITIAL` snapshot shape, and structure choice intact. Update the visible `data-revision` stamp and re-run the validator at `--kind editor`. Regenerating from scratch destroys the shared anchors people have linked to and the hand edits made since; `${CLAUDE_PLUGIN_ROOT}/references/revising.md` carries the full procedure.

## Optional: agent-assisted editing

When the user wants the editor to **ask the agent to explain a warning, comment on a field or selection, propose a valid value, validate a draft, or chat with the current editor state as context**, pair this skill with the separately installed `aio-html-interactive` skill from `aio-message-bridge` — install it with `/plugin install aio-message-bridge@aiocean-plugins`. This skill stays responsible for the schema, invariants, preview, and export. Hand the live layer stable field ids plus a small event contract such as `field.explain`, `value.propose`, and `draft.validate`; the companion skill owns its scaffold, relay, Monitor loop, busy state, and cleanup. Each key stays authoritative on one side — browser-authoritative fields stay local unless the event contract makes the agent authoritative for that key. Read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` when this live tier is requested; it carries the handoff contract.
