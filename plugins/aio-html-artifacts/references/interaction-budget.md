# Interaction budget

Interaction is a cost center. The ideal artifact answers the reader's question at zero interactions. Static is the default.

**Settles:** whether a proposed control ships at all, the ceiling on how many, the deck controller and its scroll-snap and print CSS, the editor state pattern, and the scale rules.

**When this file loads:** a `<script>` goes in the file that does more than hold a JSON data island, or the artifact is a deck or an editor. `<details>`/`<summary>` disclosure and `:target` anchors need no script and no budget, so a report built from those alone skips this file.

**Partial read:** `The earn-its-place gate` decides yes-or-no on its own. `Deck controller and deck architecture` and `Editor state pattern` are the two paste blocks and are independent of each other.

Field instrumentation of published interactive articles (>50,000 sessions) found the median number of uses of an accessory slider or button was **zero**, while controls that *were* the subject of their section got medians of 22–42. Decorative interaction is not neutral: it measurably lowers recall (η²p = 0.074) and transfer.

## Contents

- [Resolution order](#resolution-order)
- [The earn-its-place gate](#the-earn-its-place-gate)
- [Ceiling and declaration](#ceiling-and-declaration)
- [Predict-then-reveal](#predict-then-reveal)
- [Deck controller and deck architecture](#deck-controller-and-deck-architecture)
- [Editor state pattern](#editor-state-pattern)
- [Scale rules](#scale-rules)

## Resolution order

Resolve every parameter in this order, falling through only when the step above is impossible:

1. **Infer it** from context you already have — repo, diff, timestamps, stated role — and hard-code the answer.
2. **Show all of it** — render every state at once as small multiples.
3. **Only then add a control**, and run the gate.

## The earn-its-place gate

Any FAIL deletes the control and renders the static form.

- [ ] **G0 medium routing.** Classify what this section conveys: abstract concept → use text (FAIL); relationship at a glance → static graph (FAIL); change over time → scroll-triggered animation honouring reduced-motion (FAIL for controls); **process/system/model with coupled parameters → pass to G1.**
- [ ] **G1** Write the reader's question verbatim, ending in "?". Can a static image or table answer it? YES → FAIL.
- [ ] **G2 step-up first.** N = distinct states the reader needs. N ≤ 3 → render all N as small multiples, FAIL. N ≥ 4 or continuous/coupled → pass. *You must have actually attempted the all-states-at-once image and found it unreadable; "I didn't try" is a FAIL.*
- [ ] **G3 core, not accessory.** Is this control the subject of its section or an accessory? Accessory → FAIL.
- [ ] **G4 spectacle.** Does one reader action update **≥2 different representations of the same quantity** (a sentence AND a diagram)? NO → FAIL. Scroll is the trigger; click, tab, and stepper are the fallback when scroll cannot carry the state.
- [ ] **G5 nothing hidden.** Assume nobody ever sees a tooltip. Any content reachable only by hover → FAIL.
- [ ] **G6 JS-deletion gate.** Delete every `<script>`, reload. Does the artifact still state every load-bearing conclusion in plain prose with sensible defaults rendered? NO → FAIL. Corollary: restate the takeaways as static prose **after** the interactive block.
- [ ] **G7 no seductive detail.** Decorates rather than teaches → FAIL. If you keep something purely playful, label it non-load-bearing.
- [ ] **G8 confidence honesty.** Does the control let the reader *falsify* a number you asserted, or only feel they explored? Only-feel → FAIL.
- [ ] **G9 affordance contract.** Visible **signifier** (Norman explicitly retired "affordance" for this), keyboard path, `:focus-visible`, initial state already useful, **live state shown as text not just position**, touch target ≥24×24 CSS px, reflows at 320px, export for user-authored state.

## Ceiling and declaration

**Hard ceiling: 3 distinct interactions per artifact.** Beyond that the artifact has more than one job.

Each script block names, in an HTML comment, the specific reader question it answers and why the answer cannot be pre-rendered:

```html
<!-- Q: "How does p95 move as cache hit rate rises?" — 40 coupled states, unrenderable as stills -->
<script> /* ... */ </script>
```

Delete any interaction whose initial state already shows the conclusion.

## Predict-then-reveal

Highest comprehension per line of code, zero JS, and the one interaction with independent learning-science support.

```html
<aside class="predict">
  <p><b>Before you scroll:</b> p95 after adding the cache was 340ms. What was it before?</p>
  <details><summary>Show the answer</summary>
    <p>410ms — a 17% improvement, not the 3x expected. Cache hit rate was 22%, because the key
       included a request-scoped UUID. <a href="#trace-991">trace</a></p></details>
</aside>
```

```css
@media print{.predict details{display:block}.predict details>*{display:block!important}}
```

## Deck controller and deck architecture

The controller fills the three gaps measured in both the reference corpus and the leading competitor — no print CSS, no hash routing, forward-only keys.

```js
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;              // never steal Cmd+P / Cmd+F
  var t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  switch (e.key) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'n':
      e.preventDefault(); go(current + 1, true); break;
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'p':
      e.preventDefault(); go(current - 1, true); break;
    case 'Home': e.preventDefault(); go(0, true); break;
    case 'End':  e.preventDefault(); go(slides.length - 1, true); break;
    case 's': document.body.classList.toggle('notes-on'); break;
  }
});
window.addEventListener('hashchange', function () { go(fromHash(), false); });
```

Deck architecture is **scroll-snap, not transform slides** — it is fewer lines, works with JS disabled, is touch/trackpad native, and is the only deck architecture that prints correctly because slides stay in normal flow:

```css
body { scroll-snap-type: y mandatory; overflow-x: hidden; }
.slide { width:100vw; min-height:100svh; scroll-snap-align:start; scroll-snap-stop:always;
         display:flex; flex-direction:column; justify-content:center; padding:6vh 6vw; }
@page { size: 1280px 720px; margin: 0; }
@media print {
  html, body { background:#fff; color:#000; scroll-snap-type:none; overflow:visible; height:auto; }
  .deck-hud { display:none !important; }
  .slide { width:1280px; height:720px; min-height:0; page-break-after:always; break-inside:avoid; }
  .slide:last-child { break-after: auto; }
}
```

Verified: `chrome --headless --print-to-pdf` on a 4-slide deck produces exactly 4 pages with `/MediaBox [0 0 960 540]` — exact 16:9, no blank pages, no `?print-pdf` mode switch. Every deck also ships a **handout mode**: the deck is the talk; the handout is the record.

## Editor state pattern

Why 10 KB of vanilla JS is enough and Alpine/React are unnecessary:

- The DOM inputs **are** the state — the inputs are the single store.
- Freeze an `INITIAL` snapshot at load, so "what changed" is always computable and displayable.
- One idempotent `update()` recomputes every derived surface from the DOM.
- One delegated listener per container.
- Export = `diff(INITIAL, now)`, a change set rather than a raw dump.

## Scale rules

- Soft file-size budget ~1 MB, past which you link a companion CSV/JSON beside the HTML rather than inlining it.
- Large tables get a sticky header.
- Client-side sort/filter keeps the unfiltered count visible at all times, so a reader always knows the size of the set the view came from.
- A row cap ships with its disclosure as literal text: **"showing N of M — full data in `<linked file>`"**.

**Silent truncation is an auto-reject.**
