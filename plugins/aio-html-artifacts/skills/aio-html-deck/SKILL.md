---
name: aio-html-deck
description: |
  A paced HTML deck — one self-contained file a presenter advances scene by scene while
  speaking. Reach for it when a human sits through the material at the author's tempo and
  leaves with one decision: executive briefing, proposal, demo walkthrough, narrative status
  review, conference talk. A human who reads and audits at their own pace wants
  aio-html-report; a human holding options side by side wants aio-html-explorer.
when_to_use: |
  slides, slide deck, side deck, presentation, exec briefing, demo walkthrough,
  print to pdf slides, làm slide, bài thuyết trình, trình chiếu,
  slide titles are too vague, make the titles assertive, tighten the deck copy
argument-hint: "subject + audience + speaking time"
effort: medium
---

# Narrative HTML deck

A deck is paced communication: the audience meets one claim at a time, at the presenter's tempo, and leaves holding one decision.

## Reference routing

Six rows load every time. Every other row states a condition you can answer no to — from the request text, the beat sheet, the material in hand, or the validator's output. **A row whose condition does not match is a row not read**, and leaving it unread is the design. Measured on a plain exec-deck request against the files on disk, 2026-08-13: 174 KB if every row fires, 116 KB with these conditions applied, of which 81 KB is the always set. The `references/data-story.md` row postdates that measurement and carries its own cost: 12 KB for a scene judged against a threshold or an event, 15 KB when consecutive scenes also move the same measure, measured 2026-08-13. Paths are relative to `${CLAUDE_PLUGIN_ROOT}`.

| Read | When |
|---|---|
| `references/base-layer.html` + `references/layout-primitives.css` | Always, first. Paste the skeleton and the primitives you use — doctype, `lang`, viewport, title, `<main>`, contract comment and `:focus-visible` arrive by construction. |
| `references/voices.css` | Always. The rules every voice obeys, and the five-row chooser you pick from. |
| `references/voices/<the voice you picked>.css` | Always, exactly one file. The token block for the name in the contract's `voice=`. |
| `references/interaction-budget.md` | Always. Holds the scroll-snap CSS, the `@page` print block, and the deck controller you paste. |
| `skills/aio-html-deck/references/deck-grammar.md` + `references/artifact-grammar.md` | Always, before the beat sheet. Scene budget, type floor, scroll-snap, handout mode; job→form, detail ladder, spine and parallelism, self-containment. |
| `references/copy-craft.md` | Always, with the beat sheet. Every scene carries a title, and a deck of topic phrases is the failure this genre falls into. |
| `references/diagrams-css.md` | A scene shows a named shape — an architecture flow, a timeline, a phase strip, or a sequence between participants. |
| `references/diagrams.md` | A scene draws a structure whose medium is still open, or an inline `<svg>` you are about to hand-write. |
| `references/encoding-and-charts.md` | A scene plots three or more numeric values. |
| `references/data-story.md` | A scene plots a series against a threshold, a target, a dated event, or a window; or two consecutive scenes show the same measure at a different granularity, window, or chart form. Read `Annotate the point` for the six marks and the ledger, about 12 KB, and `Sequence the views` for the one-slot transition check, about 2 KB, of the file's 27 KB. |
| `references/captions.md` | A scene carries a `<figure>`, a chart, a diagram, a table with a header row, or a screenshot. Read the one `###` block for that evidence type plus `The alt / figcaption / prose partition`, about 4 KB of the file's 13 KB. |
| `references/evidence-and-confidence.md` | A scene asserts a number you did not compute yourself, a code conclusion, or a forecast. |
| `references/typography-and-voice.md` | The request names a brand, a company style, or a look to match; or you change a value inside the voice block. |
| `references/microcopy.md` | The deck ships a control past next/previous — a filter, a toggle, a mode switch, an export. |
| `references/copy-delint.md` | The validator printed a finding whose id starts `copy.`, or the request says the writing reads like AI. |
| `references/worked-examples.md` | A drafted scene that would have come out the same for any topic. |
| `references/revising.md` | A deck already exists at the target path. |
| `references/live-collaboration.md` | The request names live Q&A, audience comments, or decision capture. |

## The artifact contract

```
GATE — it is not a deck until it answers all three, in the first screen:
Q1 "What do you want from me, and by when?"   (owner + verb + date)
Q2 "What does it cost, and what does it buy?" (number + unit + what it buys)
Q3 "What happens if we do nothing?"
SECOND-ORDER GATE: read ONLY the scene titles top to bottom. If they do not form a coherent
argument, the deck has topic headings rather than assertions.
```

Emit this to the user before any HTML exists, then write it into the file head as the comment the validator reads, every key the tier asks for non-empty. In the file the keys take the `key= value` form of the comment already in `references/base-layer.html` — the parser reads `=`, so a pasted `Key:` line registers as empty. A spine written after 400 lines of HTML is back-filled around whatever got typed.

```
ARTIFACT CONTRACT
Tier:          <brief when the deck runs under 600 body words and its spine is neither
                incident nor decision record; the keys marked (full) then go unwritten>
Reader:        <who, and what they already know>
Question:      <the one question this page answers>
Verdict:       <the literal sentence that appears in the first screen, not a paraphrase of it, with a calibrated confidence word + band when the answer is inferred>
Consequence:   (full) <what changes because of the verdict>
Challenge:     (full) <the strongest objection a skeptical reader would raise>
Structure:     (full) <which spine, and why this one>
Spine:         <3-6 scene titles, each a claim a colleague could answer "that's false" to — the validator reads this key against the stock-heading list, so Overview / Background / Analysis fails here, before any HTML exists>
Transition:    (full) <the ONE dominant transition type repeated in every section>
Evidence:      <per section: the exact artifact — file:line, log excerpt, metric>
Visuals:       (full) <relationship -> form, e.g. "deploy sequence -> CSS timeline">
Voice:         (full) <one of the five, or a declared reason for a sixth>
Generic-check: (full) <name one thing in this plan you would have produced for ANY artifact
                on this topic, and what you replaced it with>
```

**What `tier= brief` trades.** A five-scene standup deck under 600 body words takes five keys — Reader, Question, Verdict, Spine, Evidence — each answered in 24 characters or more, because five one-word answers decide as little as twelve do. Brief tier stands down the seven keys marked `(full)`, the `data-confidence` word and its band on an inferred claim, and the `[data-falsifier]` block. It holds everything that makes an artifact correct at any size: self-containment, the accessibility set, the print block, the reduced-motion fallback, one `h1`, `<html data-voice="…">` where the voice is now declared once, a claim carrying its `data-src` or `data-basis`, the 80% coverage floor, the scene budget, the type floor, and the claim heading. Above 600 body words, and on an incident or decision-record spine, the validator refuses the tier and asks for twelve keys, because those two spines are the ones an audience acts on. The routing shrinks with it: `references/base-layer.html`, `references/layout-primitives.css`, `references/voices.css`, the one voice file, `references/interaction-budget.md` for the controller you paste, and `references/copy-craft.md` §*The claim heading*.

## Building the deck

**Yours to invent. Many right answers here.**

1. Name the audience, speaking time, wanted decision, and the sentence they repeat afterward — the contract's `Reader`, `Question`, `Consequence`, `Verdict`.
2. Beat sheet: setup → tension → evidence → resolution → ask. A beat earns a scene by changing what the audience believes; beats that change nothing merge, because a scene they already agreed with spends speaking time and buys nothing.
3. One claim per scene, stated as a sentence in the scene title, with detail in the visual, the notes, or the handout so the claim stays legible from the back of the room. Scene body runs 25-90 words: below 25 it is a billboard and merges, above 90 it splits. The validator reads both ends — an error under the floor, a `k.deck.words` warning above 90 that prints the worst scene's measured count beside the budget, since a quote scene and an appendix scene are long on purpose. `skills/aio-html-deck/references/deck-grammar.md` carries the reasoning at both ends and the n = 6 provenance of the 90.
4. Scene form follows what it encodes: sequence → timeline, causality → flow, comparison → aligned columns on one baseline, magnitude → chart with units. Every scene as a title over three cards encodes nothing, because one container for unlike relationships tells the eye they are alike.
5. The closing scene states the decision, ask, or next move, in the words the audience repeats to someone who missed it; one decisive artifact rides each scene and the audit trail lives in a companion report.

**Fixed mechanics. Paste these, then diverge inside them.**

6. Architecture is scroll-snap, from `references/interaction-budget.md`. Slides stay in normal flow, so the deck reads with JavaScript deleted, is touch and trackpad native, and prints correctly.
7. Navigation is the deck controller from `references/interaction-budget.md`: both directions, `Home`, `End`, `location.hash` sync, modifier keys passed through so `Cmd+P` still prints.
8. Type floor: 20px at 1440, 16px at 390, titles at least 32px. Content that does not fit gets edited or split; type size stays. The validator errors on `font-size` below `1rem` outside the print block.
9. Exactly one `<h1>`, the deck title on the opening slide; every later slide title is `<h2>`. One self-contained `.html` file, zero remote `src`, `href`, `url()`, fonts included — the validator hard-fails on any `https?://` asset reference, so type comes from a system stack in `font-family`.
10. Narrow screens reflow the 16:9 canvas to a vertical reading order at the type floor — the pair below is the exact transform. Meaning lives in text and motion carries orientation, so an audience with `prefers-reduced-motion: reduce` gets the same claims; the reduce block holds at least one declaration.
11. `@page { size: 1280px 720px; margin: 0 }` plus the print block yields exact 16:9 pages. Then ship the handout: the deck is the talk, the handout is the record.

## Worked pair — the mobile reflow

<example>
Before — one fixed canvas scaled to fit, so type shrinks with the viewport:

```html
<section class="slide" style="width:1280px;height:720px;transform:scale(var(--fit))">
  <h2 style="font-size:2.5vw">Retries hide the real failure</h2>
  <p style="font-size:1.1vw">The gateway retried four times before the client timed out.</p>
</section>
```

After — the canvas reflows, the type sits on its floor:

```html
<section class="slide" id="s3">
  <h2>Retries hide the real failure</h2>
  <p>The gateway retried four times before the client timed out.</p>
</section>
```
```css
.slide   { width:100vw; min-height:100svh; scroll-snap-align:start; scroll-snap-stop:always;
           display:flex; flex-direction:column; justify-content:center; padding:6vh 6vw; }
.slide h2{ font-size:clamp(2rem, 4vw, 3.5rem); }      /* 32px floor, 56px ceiling */
.slide p { font-size:clamp(1rem, 1.4vw, 1.25rem); }   /* 16px at 390, 20px at 1440 */
@media (max-width:40rem){ .slide { min-height:auto; justify-content:flex-start; padding:8vh 6vw; } }
```

Why: 16:9 is a projector constraint, not a reading constraint — at 390px the `scale()` version renders body text near 4px, while the reflow holds every scene at or above the floor and lets a scene run taller than the phone.
</example>

Five more pairs — card soup, container headings, paraphrased code, unitless bars, colour-only status — in `${CLAUDE_PLUGIN_ROOT}/references/worked-examples.md`. `${CLAUDE_PLUGIN_ROOT}/examples/migration-briefing-deck.html` is one valid answer, not the answer. Reuse from it: the scroll-snap layer placement, claim-to-evidence adjacency inside a scene, the observed/inferred tagging, the mobile reflow transform. Regenerate for your subject: palette, type pairing, masthead treatment, scene rhythm, signature layout device. The test: if your `:root` token values or grid skeleton match the example's, it was recolored — start the visual pass over. To see how one mechanic is implemented — print CSS, keyboard nav, hash routing, notes mode — grep the example for that mechanic. Reading it end to end installs its visual style as your default.

## Handoff gate

Preflight: `node --version`, then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind deck ./artifacts/deck-<slug>-<YYYYMMDD>.html` on the written file. Answer each question below in text; any NO gets fixed and re-answered, and lowering the bar is not one of the options.

```
- [ ] Validator exited 0, and every remaining warning is either fixed or carried verbatim
      into the handoff's `Warnings:` line with one clause saying why it stands? Bending the
      prose to silence a warning is the failure this line exists to prevent.
- [ ] Does the opening scene contain the contract's Verdict sentence, verbatim in meaning?
- [ ] Does the closing scene state the decision, ask, or next move?
- [ ] Does every heading make a claim a colleague could disagree with?
- [ ] Does every figure and table caption open with the finding, and state nothing the alt text states?
- [ ] Delete the last paragraph: does anything the reader needs disappear?
- [ ] Does every numeric claim carry a source anchor on the same scene?
- [ ] Does every code conclusion show the code, with repo@sha path:lines?
- [ ] Does every confidence word carry its numeric band as literal text?
- [ ] Does every chart show units, baseline, source, a takeaway sentence, and a data island?
- [ ] Delete every <script> and reload: does every scene still read in order with its conclusion?
- [ ] Do at least three scenes use visually different forms from each other?
- [ ] Is there any status conveyed by colour alone?
- [ ] Zero horizontal overflow at 1280px, 390px, and 320px — the WCAG SC 1.4.10 reflow width —
      with body type at 16px or above there? (or: not visually verified — declare it)
- [ ] Print preview: one scene per 16:9 page, nothing clipped, no collapsed <details>, no dark flood? (or: not visually verified — declare it)
- [ ] Zero remote URLs in the file?
- [ ] Open ${CLAUDE_PLUGIN_ROOT}/examples/slop.fixture.html — the shipped negative fixture — beside this file: name three properties that differ.
```

Truth and evidence-proximity are scored by a separate verifier pass, not by the composing turn. The list above is the model checking observable properties of its own output; grading its own reasoning is a different act, and holistic self-scoring is the form the self-correction literature says fails. If the validator cannot run, say so in the handoff and mark the artifact UNVALIDATED rather than claiming the gate passed.

## Output and handoff

Default path `./artifacts/deck-<slug>-<YYYYMMDD>.html`, creating `artifacts/` if absent. Add `artifacts/` to `.gitignore` or write outside the repo, unless the user asked for a committed deliverable. Open with `open` on macOS, `xdg-open` on Linux. Close out with:

```
Artifact: <absolute path>
Verdict:  <the contract's verdict sentence>   Ask: <the decision the closing scene requests>
Gate:     <the validator's PASS line, pasted verbatim>
Warnings: <each remaining warning verbatim, or "none">
Coverage: <the validator's evidence-coverage line, verbatim>
```

With a browser automation tool available (chrome-devtools, playwright), load the file at 1440×900 and 390×844 and attach screenshots. With none available, hand off with: "Not visually verified: no renderer available. Please check first screen, 320px reflow, print preview, and each export."

Revising an existing deck: read the file first, then make the smallest edit with Edit rather than Write. Preserve the token block, slide IDs, and structure choice — regenerating from scratch destroys the shared anchors people linked to and every hand edit made since. Procedure, `data-revision` stamp, and change summary: `${CLAUDE_PLUGIN_ROOT}/references/revising.md`.

## Optional: live briefing surface

When the deck must support questions anchored to the current slide, audience comments on a claim, live decision capture, or a chat rail with slide context, pair it with the separately installed `aio-html-interactive` skill from `aio-message-bridge` (`/plugin install aio-message-bridge@aiocean-plugins`). The paced deck stays primary and the live layer stays a rail beside it, because a deck whose every scene is a chat dashboard has stopped pacing anything. Pass stable slide IDs, the current claim and evidence context, and explicit events such as `chat.submit` or `decision.submit` to the companion skill. It owns transport, turn-taking, connection state, and cleanup; its runtime stays in its own plugin. Read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` when live collaboration is requested.
