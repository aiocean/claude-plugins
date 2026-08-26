# Microcopy — the strings on things the reader operates

**Settles:** the label on every control, the wording of an error, an empty state, a busy state,
a destructive confirmation, an export label, and the visible words of a link.

**When this file loads:** the artifact contains a `<button>`, a form field, a `<summary>`, an
export action, a status region, or a link whose words a reader clicks. A report or a deck that
ships zero controls ships zero microcopy and skips this file; the editor genre reads it every
time, because an editor is controls.

**Partial read:** the file is one block of patterns keyed by control type. Reading the rows for
the control in hand gives you that pattern and leaves the rest unread.

Every word list and every regex below is compiled into `scripts/lib/checks-copy.mjs`; the list
here and the list there match token for token, so the reference and the gate cannot drift.

Evidence labels travel with each rule. **MEASURED** — a published study backs the number.
**DERIVED** — the finding is measured, the threshold is ours, from n=6 calibration on this
plugin's own examples. **FOLKLORE** — named by a curated community list, counted in no corpus.
A threshold presented as research when it is a guess is the defect this file exists to remove.

Validator ids whose fix lives here: `copy.microcopy.banned`, `copy.linktext`.

## Microcopy

```
LABEL PATTERN PER CONTROL TYPE — sentence case in every row.
  primary action button   {verb} {noun}              "Export findings"  "Copy diff"  "Run check"
  common action button    {bare verb}                Save · Cancel · Close · Continue · Retry
  state-changing button   {verb} and {verb}          "Save and continue"  "Confirm and send"
  destructive button      {verb} {named object}      "Delete 3 rules"  "Discard changes"
  toggle / switch         {state-neutral noun phrase} "Show resolved comments"  (never "Toggle")
  tab                     {noun}, <=2 words, unique  Findings · Evidence · Diff · Timeline
  link                    {distinguishing words first} "auth.ts:142"  "Postgres advisory-lock docs"
  filter / select label   {question or noun}         "Severity"  "What changed?"
  checkbox                {positive statement}       "Include passing tests"
  disclosure summary      {noun phrase + count}      "Full stack trace (42 lines)"
  export / download       {verb} {format}            "Copy as Markdown"  "Download JSON"
  empty-state action      {verb} {first thing}       "Add your first rule"
  busy button             {verb}ing…                 "Exporting…"  — the same verb as idle

HARD CONSTRAINTS
  - the first two words carry the meaning; people mostly look at the first two words of a link
  - no two links or buttons in one artifact share the same text unless they do the same thing
  - no articles inside link text: "Read the design doc" — link only "design doc"
  - never "click" in instructions; use "select"
  - the label tells the truth about state: "Continue" vs "Save and continue"; a partial export
    says so — "Copy 12 filtered findings", never bare "Copy"

THREE-PART ERROR TEMPLATE — [1 WHAT] + [2 WHY / which value] + [3 HOW TO FIX]
  Part 1 is a fact, never an accusation. A sentence starting "You" gets rewritten.
  Part 2 names the offending value, limit, or scope. Generic is broken.
  Part 3 is an imperative, or two concrete options. Omitting it means the message failed.
  Missing value → imperative ("Enter…"). Broken constraint → declarative ("… must be …").
  One message per known cause.

  ✗ "Something went wrong."
  ✓ "Couldn't save the review. The draft is still in your browser. Retry, or copy the
     Markdown export as a backup."
  ✗ "You have entered the wrong password."      ✓ "Wrong password."
  ✗ "You didn't enter a name."                  ✓ "Enter a name."
  ✗ "You specified a printer that's offline."   ✓ "The specified printer is offline."
  ✗ "Unable to establish connection to the SQL database."  ✓ "Can't connect to the SQL database."
  ✗ "An error occurred while parsing."
  ✓ "Line 42 of report.json isn't valid JSON: unexpected ']'. Fix the file, or paste the raw
     text instead."
  READ-ALOUD TEST: say it out loud. Sounding like a form robot or a scolding → rewrite.

SUMMARY-STANDS-ALONE TEST — for every <details><summary>:
  1. Extract every summary, link and button label into one flat alphabetised list, with no
     surrounding context.
  2. From that line alone, can a reader say what is inside and decide whether to open it?
       ✗ "Details"  "More"  "Click to expand"  "Show"  "Additional information"
       ✓ "Full stack trace (42 lines)"  "Why we rejected the Redis approach"
  3. No two summaries share text.
  4. If the hidden content is required to accept the verdict, unhide it — research finds
     some users avoid opening disclosures because they expect to be navigated away.
  5. If the hidden content is a list, put the count in the summary.
  6. The summary text does not change when opened. Never "Show more" ⇄ "Show less" as the
     only label; the marker rotates, the label stays.
  BASIS: "The contents of the <summary> element are used as the label for the disclosure
  widget", so it is announced exactly as isolated as WCAG assumes for link text.

DESTRUCTIVE CONFIRMATION
  TITLE     "{Verb} {named object with a count}?"   "Delete 3 saved filters?"
  BODY 1    what disappears, concretely, by name
  BODY 2    reversibility, plainly — "You can't undo this."
  BUTTON A  the destructive outcome, named — "Delete filters"
  BUTTON B  the safe outcome, named — "Keep filters"
  Never OK/Cancel, never Yes/No. If the action IS reversible, skip the dialog and offer undo;
  a confirmation the user always accepts trains them to accept the one that matters.

EMPTY STATES — three slots, and three different empties:
  status (never mistakable for loading or an error) · cause/scope · the single next action
  a) nothing yet       "No findings yet." / "Run a review to populate this table." [Run review]
  b) nothing matches   "No findings above medium severity." / "31 findings are hidden by the
                        current filter." [Clear filters]
  c) nothing left      "All 12 findings resolved." / "Nothing left to review in this diff."
  An empty state is styled as a state, never as an error. Empty ≠ wrong.

BUSY STATES, keyed on measured response-time limits:
  <0.1s   nothing        0.1–1.0s  nothing — a spinner here reads as a glitch
  1–10s   indeterminate indicator + present participle using the trigger's verb
  >10s    determinate progress + a count or an ETA + an escape
            "Parsing 412 of 1,204 files"   "Rendering diff — about 20 seconds left"
  Put busy text in role="status" / aria-live="polite" and announce completion too.
  Never bare "Loading…" past 10 seconds; never a percentage that isn't real.

BANNED MICROCOPY → REPLACEMENT
  Click here / here / More            → the destination named. WCAG F84 names these failures.
  Learn more                          → "Learn more about rate limits", or link the heading
  Read more                           → the headline itself, linked
  Submit                              → "Send review" / "Save changes" / "Run analysis"
  OK / Okay / Yes / No on a destructive → the two outcomes, named
  Oops / Whoops / Uh oh               → the fact: "Export failed."
  Something went wrong                → what failed + which value + what to do
  An error occurred                   → same
  This field is required              → "Enter your email address"
  Please / Sorry                      → delete. "Please" makes a required action read optional.
  Invalid / valid                     → state the rule: "must be 8 digits"
  You forgot / You failed             → the imperative
  Illegal / forbidden / prohibited    → the rule itself
  Toggle                              → what it shows
  Loading… (>10s)                     → "Parsing 412 of 1,204 files"
  No data                             → "No findings above medium severity. Lower the filter
                                        to see all 31."
  above / below / on the right        → "in Findings", "in the step that follows"
  Halt/Terminate/Execute/Obtain/Utilize/Locate/Modify/Perform/Purchase/Subsequent/Refer to
                                      → Stop / End / Run / Get / Use / Find / Change / Do /
                                        Buy / Next / See

EXACT-MATCH LINK LABELS the validator rejects (copy.linktext, error tier) — whole-string
equality only, so "more" inside a longer label is untouched:
  click here · here · more · read more · learn more · more info · more information · details
  · show more · see more · view · link · this · download · go

SENTENCE CASE — every string: buttons, tabs, headings, table headers, legends, checkbox
labels, summary text, empty states, tooltips. Capitalise only the first word plus proper
nouns, product names, acronyms (JSON, HTTP, CI), and code identifiers copied verbatim
(`useEffect`, `order_items`, `--no-verify`). Never ALL CAPS; never all-lowercase-as-design.
FOUR REASONS, so this is not asserted:
  1. Legibility — capitals used for whole phrases "can be difficult to read" (RNIB, cited in
     GOV.UK's content-principles research background); word shape is destroyed when every
     letter is the same height.
  2. Screen readers — capitalised words are prone to being announced as acronyms or
     mis-stressed, and a reader with a language impairment cannot repair the misread.
  3. Consistency has one cheap answer. Title case requires arbitrating articles,
     prepositions and conjunctions; sentence case has one rule, so a model applies it
     identically across 200 strings.
  4. Translation — see the last section of this file.
```
