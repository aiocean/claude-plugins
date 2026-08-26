# Explorer grammar

The mechanics of holding options side by side: one shared axis, honest gaps, a ceiling on visible columns, and a reflow that keeps the labels.

## Criteria on a shared axis

One criterion per row, one option per column, the unit stated once in the row header so every cell in that row is directly comparable. `data-option` on each option column, `<th scope="row">` on each criterion — three or more of those row headers is what the validator reads as a shared axis.

```html
<table class="matrix">
  <caption id="matrix-cap">Queue options against the four criteria that decide this</caption>
  <thead>
    <tr><td></td>
      <th scope="col" data-option="kafka">Kafka</th>
      <th scope="col" data-option="sqs">SQS</th>
      <th scope="col" data-option="pg-queue">Postgres queue</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">p95 enqueue at 5k msg/s</th>
      <td data-claim="observed" data-src="lt-201">6&nbsp;ms</td>
      <td data-claim="observed" data-src="lt-202">22&nbsp;ms</td>
      <td class="unknown">Not measured <small>needs: LT-204 rerun</small></td></tr>
    <tr><th scope="row">Ops burden</th>
      <td><span aria-hidden="true">●</span> Low — one existing rotation</td>
      <td><span aria-hidden="true">●</span> Low — managed</td>
      <td><span aria-hidden="true">◐</span> Medium — vacuum tuning</td></tr>
  </tbody>
</table>
```

```css
.matrix { border-collapse: collapse; inline-size: 100%; font-variant-numeric: tabular-nums; }
.matrix th[scope="col"] { border-block-end: 2px solid var(--ink); text-align: start; }
.matrix tbody tr + tr th, .matrix tbody tr + tr td { border-block-start: 1px solid var(--border); }
.matrix th[scope="row"] { text-align: start; inline-size: 16rem; }
.matrix td, .matrix th { padding: var(--s-1) var(--s0); vertical-align: baseline; }
```

Two numbers meant to be compared and sitting in separate cards are encoded with nothing. Move them into one aligned track before styling anything.

## The unknown cell

```html
<div class="fact gap"><span>p95 recovery</span><strong>Not measured</strong>
  <small>would need LT-204 rerun</small></div>
<td class="unknown">Not measured <small>needs: LT-204 rerun</small></td>
```

Every unknown names the evidence that would fill it. A visible gap is a finding; a filled-in guess is a defect. Past a third of the matrix as gaps, change the layout rather than the numbers.

A comparison cell left empty, or filled with a placeholder — a dash, `n/a`, `TBD`, `?`, `TODO` — is a validator error, because a blank hides which criterion went unmeasured and a dash reads as "measured, and the answer is nothing". Three cells clear it: one holding a measurement, one saying what is missing (`Not measured <small>needs: LT-204 rerun</small>`), and one carrying `data-gap="p95 recovery has no run above 4k msg/s; LT-204 rerun settles it"` — 12 characters or more, since the evidence that settles a criterion does not fit in `tbd` spelled one layer down. A matrix where every criterion was measured is correct work and passes.

## Four options visible at once

Four columns side by side, and a longer field arrives as a shortlist whose elimination rule is printed on the page. Working memory is a store of 3 to 5 meaningful items (Cowan 2010), not 7±2, so a fifth column gets compared against memory rather than against the page.

The ceiling sits on *columns visible at once*, not on candidates considered: assortment size on its own has no reliable effect — with none of the four moderating conditions present the effect is nonsignificant, t(20) = −.10, p = .48 (Chernev, Böckenholt & Goodman 2015). What loads the reader is holding cells in memory, which is why the shortlist step and the aligned axis both live in the page instead of the count alone.

## Reflow to criterion bands

Below the band breakpoint the columns stack into one band per criterion, and each option label rides inside its own cell as real text, so the labels survive the collapse. `references/layout-primitives.css` already carries this collapse — `.band > * { grid-column: 1 / -1 !important; }` inside `@container (inline-size < 34rem)` — so the band composition reflows with no additional CSS:

```html
<div class="region gridfield">
  <section class="band" aria-labelledby="c-p95">
    <h3 id="c-p95" style="grid-column: 1/4">p95 enqueue at 5k msg/s</h3>
    <p style="grid-column: 4/7"><b>Kafka</b> 6&nbsp;ms</p>
    <p style="grid-column: 7/10"><b>SQS</b> 22&nbsp;ms</p>
    <p class="unknown" style="grid-column: 10/13"><b>Postgres queue</b> Not measured
      <small>needs: LT-204 rerun</small></p>
  </section>
</div>
```

Labels written as `<b>Kafka</b>` in the cell rather than as `::before` content: generated content is absent from the DOM and the accessibility tree and is not copied to the clipboard, and an option label in a stacked band is load-bearing text.

A matrix too dense to band goes into a labelled scroll region, which keeps the alignment and stays keyboard-reachable (WCAG 2.1.1 / ACT 0ssw9k):

```html
<div class="scroll-x" role="region" aria-labelledby="matrix-cap" tabindex="0"> … </div>
```

```css
main > *, main section > * { min-width: 0; }   /* grid/flex children default to min-width:auto */
.scroll-x { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); }
.scroll-x:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

## Compositions that hold options apart

**Option lanes** — aligned columns for 2-4 alternatives, criteria down the left. **Criterion bands** — one band per criterion, options inside it, labels in the cells. **Tradeoff frontier** — two competing dimensions, both axes labelled, for a decision with no universal winner. **Scenario switcher** — the same options under different demand, cost, or risk scenarios, with the default scenario named and justified. **Reversibility map** — one-way doors separated from reversible experiments. **Evidence ledger** — claim, source, confidence with its band, falsifier.

## The options skeleton

Ten sections in order — MADR 4.0.0 §1-§8 plus Rust RFC §9-§10:

```
1  Title + status — <problem> and <solution>; proposed|accepted|superseded
2  Context — the forces, value-neutral, scope explicit
3  Decision drivers — criteria, named before any option
4  Considered options — two or more, plus do-nothing
5  Pros and cons — `Good, because …` / `Neutral, because …` / `Bad, because …`
6  Outcome — `Chosen option: "<title>", because <driver from §3>.` then `We will …`
7  Consequences — positive, negative, neutral
8  Confirmation — the test, lint rule, or metric and threshold
9  Drawbacks — the case against the recommendation
10 Unresolved questions — what stays open, and when each settles
```

Three questions decide it: what makes each option win, what the recommendation costs, what we do not know. First alone is a survey; second missing is a rationalization of a decision already taken. Four counts find it:

1. Drivers in §3 against the reasons in §6-§7 — a reason absent from §3 was retrofitted.
2. `Good, because` lines per option — zero is a strawman that inflates the winner.
3. Words per option in §4-§5 — a winner at four times the shortest is advocacy.
4. §2 read cold — a reader guessing §6 from it dates §2 after the decision.

*Sections are doctrine; counts and thresholds are ours.*
