# Deck grammar

## The scene budget: 25-90 words

Each scene body carries 25-90 words. Below 25 it is a billboard — merge it into its neighbour. Above 90 it is two claims — split it.

The range resolves two real constraints that pull opposite ways.

- **The density floor (Tufte).** PowerPoint's median is ~40 words per slide, about 8 seconds of silent reading, while speech runs 100-160 wpm — so a slide holding fewer words than the presenter says about it is carrying nothing. The same critique measures template graphics at a median of 12 data values against 120 for the NYT, 112 for the WSJ, 53 for the NEJM, 32 for the Economist. Thin scenes are the disease, not the cure.
- **The segmenting ceiling (Rey et al. meta-analysis).** A learner-paced segment runs about 75 seconds, which is 90-130 words of on-screen text before the segment stops being one idea.

Both are satisfied inside 25-90, so this range is the whole rule. **The guard against a scene that overflows is the type-size floor below, not a smaller word count** — shrinking type to fit more words converts a legibility problem into a silent one.

The validator reads both ends. Below the floor it errors: a scene with no heading and under 40 characters is a billboard. Above 90 words of body prose it warns as `k.deck.words`, printing the measured count of the worst scene beside the budget — a warning, because a quote scene and an appendix scene are long on purpose. Body prose there is the scene text minus its heading, minus the speaker notes, and minus `<pre>`, `<code>`, `<blockquote>`, `<samp>` and `<kbd>`, so a log excerpt and a pasted quote cost a scene nothing. The 90 is this plugin's own n = 6 calibration on its own examples and not a published number, which is why the count prints: read it and judge.

## The type-size floor

| Context | Floor |
|---|---|
| Body text at 1440px viewport | 20px |
| Body text at 390px viewport | 16px |
| Scene titles, any viewport | 32px |

Content that does not fit gets edited or split; the type size stays where it is. A scene read from the back of a room, or on a phone on a train, is the delivered artifact — a scene that fits only because it shrank was never delivered.

```css
.slide h2{ font-size:clamp(2rem, 4vw, 3.5rem); }      /* 32px floor, 56px ceiling */
.slide p { font-size:clamp(1rem, 1.4vw, 1.25rem); }   /* 16px at 390, 20px at 1440 */
```

The validator errors on any `font-size` resolving below `1rem` outside the print block.

## Scroll-snap architecture

Slides stay in normal document flow and the browser snaps between them.

```css
body { scroll-snap-type: y mandatory; overflow-x: hidden; }
.slide { width:100vw; min-height:100svh; scroll-snap-align:start; scroll-snap-stop:always;
         display:flex; flex-direction:column; justify-content:center; padding:6vh 6vw; }
```

Four reasons this is the architecture:

1. It is fewer lines than a transform-and-index deck — the browser owns the paging.
2. It reads with every `<script>` deleted, so the deck is a document before it is a controller.
3. It is touch and trackpad native: swipe and two-finger scroll already do the right thing.
4. It is the only deck architecture that prints correctly, because slides in normal flow paginate; hidden slides print as one page.

A deck built on `.slide { display:none }` plus a class toggle hides its own content from print, from search, and from anyone whose JavaScript did not load. The validator errors on `.slide{display:none}` that has no `js-`, `:target`, or `@media` escape hatch.

Narrow screens reflow the 16:9 canvas into vertical reading order at the type floor:

```css
@media (max-width:40rem){ .slide { min-height:auto; justify-content:flex-start; padding:8vh 6vw; } }
```

## Handout mode

The deck is the talk; the handout is the record. The talk carries one claim per scene at speaking tempo; the record carries the words, numbers, and data graphics a reader consults afterward without the presenter in the room.

Print is that record, and it comes from the same file:

```css
@page { size: 1280px 720px; margin: 0; }
@media print {
  html, body { background:#fff; color:#000; scroll-snap-type:none; overflow:visible; height:auto; }
  .deck-hud { display:none !important; }
  .slide { width:1280px; height:720px; min-height:0; page-break-after:always; break-inside:avoid; }
  .slide:last-child { break-after: auto; }
}
```

Verified: `chrome --headless --print-to-pdf` on a 4-slide deck produces exactly 4 pages with `/MediaBox [0 0 960 540]` — exact 16:9, no blank pages, and no `?print-pdf` mode switch to remember.

Speaker notes live in a printable `<aside>` per scene, revealed on screen by the controller's notes toggle and expanded in the print block, so one file serves the talk and the record.

## Beat sheets

The default arc: **promise → reality → tension → evidence (2-4 scenes) → turn → resolution → ask.**

An update deck runs trajectory → change → consequence → risk → ask. A technical walkthrough runs mental model → request path → failure path → observability → gotchas → verification.

## Scene types

- **Statement** — one claim with a small proof line.
- **Contrast** — before/after, or option A against B on a shared baseline.
- **Diagram** — a relationship revealed.
- **Evidence** — one chart, code excerpt, quote, or screenshot, with its takeaway written out.
- **Sequence** — three to five steps at readable size.
- **Decision** — recommendation, accepted tradeoff, and the ask.

Density alternates across scenes to make rhythm audible: a dense evidence scene lands harder after a one-line statement scene, and a deck of identical title-plus-three-cards compositions has no rhythm to land against.

## The briefing skeleton

The executive technical briefing — a migration, a spend, a decision someone else signs — runs six scenes:

```
S0  intent tag: ACTION | DECISION | REQUEST | INFO
S1  <the thesis, one clause, as the scene title>
S2  <the situation fact that makes it urgent>
S3  <the evidence>  + a chart whose title repeats the claim
S4  <the counter-evidence, and why it does not overturn the thesis>
S5  <the ask>: <who> <does what> <by when>
```

Three questions decide whether the file is a briefing:

```
GATE — it is not a deck until it answers all three, in the first screen:
Q1 "What do you want from me, and by when?"   (owner + verb + date)
Q2 "What does it cost, and what does it buy?" (number + unit + what it buys)
Q3 "What happens if we do nothing?"
SECOND-ORDER GATE: read ONLY the scene titles top to bottom. If they do not form a coherent
argument, the deck has topic headings rather than assertions.
```

**Ask first.** S0's intent tag and S1's thesis put the request on the opening screen; S5 spells that same request as owner, verb and date. A reader who sees only S0 and S1 leaves knowing what is wanted from them and by when, and S2-S4 argue for a request that reader is already holding. A deck that builds toward its ask across six scenes spends the attention of everyone who stopped at scene two.

*Density basis: assertion-evidence slides averaged 21.2 words per slide against 41.5 for the common-practice condition, and beat them on comprehension (d = 0.81 immediately, d = 0.89 at one week, n = 110). In the headline-only experiment, changing nothing but the headline moved exam scores from 69% to 79% (p < .001), with item-level jumps from 23% → 57%; control questions on body content showed no significant difference. Caveat: all of this measured PRESENTED slides with narration, not a scrolling read.*
