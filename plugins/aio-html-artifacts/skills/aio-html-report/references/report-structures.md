# Report structures — pick the spine, open it, test it

**Settles:** which of the seven spines this report takes, the four-line SCQA opener that every
spine starts from, where the verdict sentence sits, and the two tests a finished outline passes
— MECE and "so what".

**Elsewhere:** the seven spines themselves — each one's numbered sections, what each section
contains, how each section fails, and the evidence backing per spine — are in
`skills/aio-html-report/references/report-spines.md`, routed from the SKILL.md. The selector
below names one spine; that is the one section of that file to read. A report uses one spine, so
loading all seven costs 16.6 KB to use 2.4 KB of it.

**Partial read:** the selector is the first block below and is self-contained. Running it needs
nothing else on this page.

Evidence class is marked per rule: [MEASURED] a published study backs the shape,
[DOCTRINE] an institution mandates it in a retrievable standard, [CONVENTION] widely used,
no measurement. Nothing here is marked [MEASURED] on the strength of a blog post.

## Contents

- [Pick the spine — first rule that fires wins](#pick-the-spine--first-rule-that-fires-wins)
- [The SCQA opener](#the-scqa-opener)
- [The SCQA closer](#the-scqa-closer)
- [Answer-first placement](#answer-first-placement)
- [The MECE test, six pass/fail operations](#the-mece-test-six-passfail-operations)
- [The "so what" test, six operations](#the-so-what-test-six-operations)
- [Composition patterns](#composition-patterns)

## Pick the spine — first rule that fires wins

Read top-down and stop at the first rule whose text matches the request.

```
1. The request names a decision already made, or asks to record why a choice was made
   → DECISION RECORD.
2. The request asks to judge existing work — "review", "audit", "is this safe to merge",
   "check my diff", "look over my PR"
   → VERDICT.
3. The request names an outage, a regression, a failure with a start and end time
   → INCIDENT.
4. The request asks how something works, or names a reader who is new to it
   → EXPLAINER.
5. The request asks what happened over a period — "weekly", "sprint", "status", "progress"
   → STATUS.
6. The request asks what is known about a subject, across sources
   → SYNTHESIS.
7. After the evidence is in hand, the answer is still not known, or the evidence is
   contested
   → OPEN QUESTION. This overrides 1–6, and the evidence in hand at the end of the
   investigation is what decides it — "why did the deploy fail" is unanswered at the
   moment it is asked, so a rule read against the request text sends every
   investigation here. The spine matches the state of the answer: an unresolved
   question ships as OPEN QUESTION, a resolved one ships as the verdict it reached.

Comparing options interactively, side by side on shared criteria → this is not a report.
Route to `aio-html-explorer`. A decision already taken and being recorded stays here.
```

When two rules fire, the lower number wins and the losing shape becomes one section inside the winner: one report carries one spine, so a reader who learns the shape of §1 knows where §4 is.

An implementation plan lands on rule 1: the plan is a choice about what gets built and in what order, so it takes DECISION RECORD, and the milestone sequence is §6's `We will …` written as dated steps. Calling it a plan changes the title, not the spine.

## The SCQA opener

Every spine opens with these four, filled in.

```
S: "As of <DATE>, <SYSTEM> <STABLE FACT THE READER ALREADY ACCEPTS>."
C: "<But | However | Since <EVENT> | After <CHANGE>>, <WHAT BROKE THE STABLE STATE>."
Q: "<Is X safe to merge? | Why did X happen? | Which of A or B ship? | What changed this week?>"
A: "<THE VERDICT SENTENCE — its pattern is in references/copy-craft.md, §The verdict sentence>"

Entry orders (Minto, as summarised at adrian.idv.hk/2017-12-20-minto):
  Standard   S C Q A    reader is neutral
  Direct     A S C      the answer is the headline          ← default for every spine here
  Concerned  C S Q A    urgency is the point (incidents)
  Aggressive Q S C A    the question is the hook (open question)

SELF-CHECK. If S is something the reader would dispute, it is not a Situation — it is part
of A and you have leaked the answer upward. If C creates no tension with S, you have two
Situations and no reason to write the document.
```

## The SCQA closer

The opener's C (Complication) is a debt; the artifact's last beat repays it. State, in one
sentence, how C no longer holds — not by repeating A, but by naming what changes now that A is
known: the decision now possible, the risk now closed, the question now answered. See
`artifact-grammar.md` §4, the bookend rule.

```
SELF-CHECK. Delete the closing beat. If C still reads as unresolved — the reader has the
verdict but not its consequence — the closing has not done its job. A closing that would be
true regardless of which A the report reached has not engaged with C at all.

OVERLAP WARNING. copy.closer warns at >=60% content-word overlap with the opening block. A
resolution beat that reuses S/C's own words to "wrap up" will trip it and IS the fractal-summary
tell the check exists to catch. State the consequence in new words — what the reader can now do,
not what the reader was already told.
```

## Answer-first placement

```
ANSWER-FIRST [DOCTRINE, not experiment]. The verdict sentence appears within the first
240 characters of body text. Source: AR 25-50 (10 Oct 2020, admin revision 4 Oct 2024)
para 1-38b — "putting the main point at the beginning of the correspondence (bottom line
up front)". This is a military writing regulation, not a controlled trial. The nearest
experimental support is adjacent, not direct: NN/g 1997 (n=51, a tourism website) measured
+124% usability for concise + scannable + objective rewriting combined, and NN/g's
232-user eyetracking found the first two paragraphs carry the load. Say "standard
practice with adjacent evidence", never "proven".

THE ONE EXCEPTION. Minto's indirect method — "remind, rather than inform" (verbatim,
attributed to Minto at strategyu.co/pyramid-principle-partone) — moves the answer after
the reasons when the reader will resist. Gate it narrowly: use it only when the request
literally signals contested ground ("convince them", "they disagree", "push back",
"we already argued this"). The rationale usually attached to this rule — lead with the
answer when the reader agrees or is time-pressed — is NOT in any source retrieved for
this plugin. Treat the exception as convention and declare it in `Structure=` when used.
```

## The MECE test, six pass/fail operations

Run this on every sibling set — sections, bullets, table rows.

```
S1…Sn under parent P.

1. NAME. One plural noun names the whole set — reasons, steps, options, risks, blockers,
   failures. Needing two nouns ("reasons and next steps") means two groups. Split.
2. AXIS. Every sibling is cut on ONE axis: by layer, by lifecycle stage, by severity, by
   actor, by subsystem. Write the axis down. "frontend, performance, and Q3" is three axes
   and guarantees overlap.
3. OVERLAP. For each pair (Si, Sj), name one real instance and ask whether it could be
   filed under both. If yes → merge, or recut on a different axis.
4. EXHAUSTION. Finish the sentence "A real case that falls under NONE of these is ____."
   Completing it means adding a sibling or narrowing P. Failing to complete it after 30
   seconds of genuine effort is a pass.
5. COUNT. 2 ≤ n ≤ 5. n = 1 → collapse the level. n > 5 → an intermediate level is missing.
   (The cap tracks working-memory chunking at about four, not Miller's seven — that number
   is commonly misremembered; the modern consensus is roughly four chunks.)
6. ORDER. Declare it: deductive, chronological, structural, or comparative. Ordering by
   "whatever I thought of first" is the default failure.
```

## The "so what" test, six operations

```
For parent P with children S1…Sn:

1. Cover P. Read only the children.
2. Write the closing sentence yourself:
     deductive group → "Therefore, ______."
     inductive group → "These are all <plural noun> showing that ______."
3. Compare it to P. Differ → P is wrong. Replace P with your sentence.
4. BLANKNESS. Delete one child at random. If P still reads as correct and unchanged, P
   summarises nothing and would survive any children at all. Rewrite until deleting a
   child visibly weakens P.
5. FALSIFIABILITY. "If S2 were false, P would be weaker" must be TRUE.
6. VERB. P contains a finite verb making a claim. "Performance considerations" fails.
   "Cache misses triple p99 above 200 RPS" passes.

THEN, on the whole document: extract every heading in order into a flat list. That list
alone must read as the complete argument with no body text. If it reads as a table of
contents, the document is organised by topic rather than by claim.
```

## Composition patterns

- Use a narrow reading column for reasoning and a wider breakout for diagrams, tables, and code.
- Use a rail for metadata, legend, or navigation only when it stays useful across several sections.
- Use margin callouts to connect findings to exact lines.
- Use a visual seam—rule, large whitespace, or contrast shift—when the story changes phase.
- End with action at the same specificity as the evidence: owner, condition, due date, command, or decision.
