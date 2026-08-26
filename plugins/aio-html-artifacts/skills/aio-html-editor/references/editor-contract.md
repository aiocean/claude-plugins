# Editor contract

Fill these keys in the same turn as the `ARTIFACT CONTRACT`, before markup:

```text
Source:        where the initial data came from, and its revision
Schema:        fields, types, stable ids, ordering rules
Operations:    what the user may change
Invariants:    what stays true after every change
Derived state: which previews, counts, scores, and warnings are recomputed
Dirty state:   how the loaded value and the current value are shown side by side
Export:        exact format, key order, and inclusion rules
Failure paths: invalid value, empty set, reset, clipboard refused
```

## State: the controls are the store

Read the DOM the same way everywhere, freeze the loaded values once, and recompute every derived surface from that one read. A second store makes two writers for one value, and the loser is the one the user is looking at.

```js
const form = document.querySelector('#editor');

const read = () => Object.fromEntries(
  [...form.elements].filter(el => el.name)
    .map(el => [el.name, el.type === 'checkbox' ? el.checked : el.value]));

const INITIAL = Object.freeze(read());        // loaded values, frozen at first paint

const diff = (a, b) => Object.fromEntries(
  Object.keys(b).sort().filter(k => a[k] !== b[k]).map(k => [k, { from: a[k], to: b[k] }]));

function update() {                            // idempotent: same DOM in, same surfaces out
  const now = read(), changes = diff(INITIAL, now), n = Object.keys(changes).length;
  form.querySelectorAll('[data-was]').forEach(el => {
    el.textContent = INITIAL[el.dataset.was];
    el.closest('[data-row]').dataset.dirty = String(now[el.dataset.was] !== INITIAL[el.dataset.was]);
  });
  document.querySelector('#preview').textContent = JSON.stringify(changes, null, 2) + '\n';
  document.querySelector('#status').textContent =
    n === 0 ? 'No changes from the loaded configuration.'
            : `${n} field${n > 1 ? 's' : ''} changed: ${Object.keys(changes).join(', ')}.`;
}

form.addEventListener('input', update);        // one delegated listener per container
form.addEventListener('click', e => {
  const act = e.target.closest('[data-act]'); if (!act) return;
  if (act.dataset.act === 'restore') form.elements[act.dataset.field].value = INITIAL[act.dataset.field];
  if (act.dataset.act === 'reset-all') for (const k in INITIAL) form.elements[k].value = INITIAL[k];
  update();
});

update();                                      // first paint shows the real state
```

`#status` is the single `aria-live="polite"` region: `<p id="status" aria-live="polite" role="status"></p>`.

## Accessible names across repeated rows

Each row's controls carry that row's identity, so eight flags produce eight distinct names. The validator errors on two controls sharing an accessible name inside a repeated block.

```html
<fieldset data-row="checkout-v2">
  <legend>checkout-v2</legend>
  <label for="pct-checkout-v2">Rollout percent — checkout-v2</label>
  <input id="pct-checkout-v2" name="checkout-v2.percent" type="number" min="0" max="100" value="25">
  <p class="was">loaded: <span data-was="checkout-v2.percent"></span></p>
</fieldset>
```

## Export is a diff, and it is deterministic

The exported text is the change set against `INITIAL`, sorted by key, with explicit indentation and a trailing newline, so two exports of the same state are byte-identical and paste without cleanup.

- **Copy diff** — changed keys with `from` and `to`, which is what a reviewer reads.
- **Copy JSON** — the complete current state, for a machine that replaces the file.
- **Copy prompt** — the change set plus the context, constraints, and unresolved warnings, for a hand-off back to an agent.
- **Download** — `URL.createObjectURL(new Blob([text], {type:'application/json'}))`, revoked after the click.

The clipboard is refused on `file://` in several browsers, so every copy control resolves into visible text:

```js
async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
  catch { const ta = document.querySelector('#fallback');
          ta.hidden = false; ta.value = text; ta.focus(); ta.select();
          btn.textContent = 'Select all and copy from the box'; }
}
```

## Rules that hold across every editor

- Ids stay stable and independent of visual order, so a reordered list still exports the same keys.
- Impossible actions stay disabled with the reason in text beside the control.
- A destructive reset asks for confirmation once meaningful work exists — `Object.keys(diff(INITIAL, read())).length > 0`.
- The page states where the result goes: an export the user pastes, downloads, or hands back. A value that lives only in browser memory is a value that is not saved, and the page says so in those words.

## The configuration-editor skeleton

A rollout or feature-flag configuration, this genre's most common request, lays out as:

```
h1  <What this editor decides>, and what a wrong value costs
h2  <Panel>: "Above 200, connection setup dominates"   ← the heading states the effect, not the field name
      field labels: {noun} or {question}, sentence case, unique accessible names
      recommended value carries a data-basis and, if inferred, a confidence term + band
h2  Preview: <what the current state produces>          ← updates on change, never on keystroke validation
h2  Changed from loaded state (<n>)                     ← the diff, always visible, never behind <details>
h2  Export: "Copy as review comment" / "Download JSON (12 filtered rules)"
```

```
GATE — it is not an editor until it answers all three:
Q1 "What am I looking at, and what happens if I change it?"  (each label names the effect)
Q2 "What did I change?"                                      (a visible diff from the loaded state)
Q3 "What do I do with the result?"                           (an export naming artifact and scope)
```

Q1 lands in panel headings, Q2 in the `#status` region and `data-was` rows above, Q3 in the export labels. Every string those three name has a pattern in `${CLAUDE_PLUGIN_ROOT}/references/microcopy.md`, routed from the SKILL.md:

| string | pattern |
|---|---|
| control label | `{verb} {noun}` primary, bare verb on Save · Cancel · Retry, `{verb} {named object}` destructive ("Delete 3 rules"), state-neutral noun phrase for a toggle |
| error message | three parts — what happened, which value broke it, what to do next |
| empty state | three slots — status, cause or scope, next action — three empties: nothing yet, nothing matches the filter, nothing left |
| busy state | under a second nothing, 1-10s an indeterminate indicator using the trigger's verb ("Exporting…"), past 10s a count or ETA plus an escape |
| export label | `{verb} {format}`, scope in the label when the export is partial: "Download JSON (12 filtered rules)" |

§3.8 also carries the banned-microcopy replacements, the destructive-confirmation dialog, the `<details>` summary test, and sentence case throughout.
