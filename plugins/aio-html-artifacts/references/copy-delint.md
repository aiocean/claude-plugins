# Copy delint — the pass over a draft that already exists

**Settles:** what to change in prose that is already written — nominalizations back into verbs,
sentence length back into variation, bare hedges into banded ones, the passive-voice ruling with
its four legitimate uses, and the 40-row AI-prose tell table with its replacements.

**When this file loads:** the validator printed a finding whose id starts `copy.`, or the request
says the draft reads like AI — "deslop", "sounds like ChatGPT", "viết lại cho gọn", "make it
sound human". Composing a first draft uses `references/copy-craft.md` instead; that file holds
the verdict sentence, the headings, and paragraph shape. Splitting them this way is what keeps
20 KB of delint rules out of the budget of a request that has produced no prose yet.

**Partial read:** each `##` heading below is self-contained, and the tell table is row-addressable
— a validator finding names its row, so one flagged tell reads as one row.

Every word list and every regex below is compiled into `scripts/lib/checks-copy.mjs`; the list
here and the list there match token for token, so the reference and the gate cannot drift.

Evidence labels travel with each rule. **MEASURED** — a published study backs the number.
**DERIVED** — the finding is measured, the threshold is ours, from n=6 calibration on this
plugin's own examples. **FOLKLORE** — named by a curated community list, counted in no corpus.
A threshold presented as research when it is a guess is the defect this file exists to remove.

Validator ids whose fix lives here: `copy.nominalization`, `copy.hedge.unbanded`,
`copy.opener`, `copy.closer`, `copy.slop.t1`, `copy.slop.repeat`, `copy.slop.cluster`,
`copy.uniform`, `copy.tricolon`, `copy.emdash`.

## Contents

- [Nominalization and clutter](#nominalization-and-clutter)
- [Sentence length and hedging](#sentence-length-and-hedging)
- [The passive-voice ruling](#the-passive-voice-ruling)
- [The AI-prose tell table](#the-ai-prose-tell-table)

## Nominalization and clutter

Validator id: `copy.nominalization`, warn at 3 or more matches of pattern 1.

```
DETECTION — three patterns, in order of precision:
  1. A hidden verb sits between the words "the" and "of":
       /\bthe\s+\w+(tion|sion|ment|ance|ence|ity)\s+of\b/i
  2. A light verb plus a nominalization. The closed set is: achieve, effect, give, have,
     make, reach, take — plus the technical additions perform, conduct, carry out, undertake,
     provide:
       /\b(make|makes|made|take|takes|took|give|gives|have|has|had|reach|achieve|effect|
          perform|conduct|carry out|undertake|provide)s?\s+(a|an|the)?\s*\w+(tion|sion|ment|ance|ence|ysis)\b/i
  3. A nominalization as the sentence subject.

REWRITE PAIRS — the first three are verbatim from a government standard:
  "we need to carry out a review of the Agency's accounts so we can gain an understanding of
   the reason the error occurred"
    → "we need to review the Agency's accounts so we understand the reason the error occurred"
  "If you cannot make the payment of the $100 fee, you must make an application in writing"
    → "If you cannot pay the $100 fee, you must apply in writing"
  "This means we must undertake the calculation of new figures"
    → "This means we must calculate new figures"
  "Verification of the token occurs prior to the invalidation of the session cache."
    → "The middleware verifies the token before it invalidates the session cache."
  "There was a failure in the propagation of the configuration change to the edge nodes."
    → "The configuration change never reached the edge nodes."

CLUTTER — delete outright unless load-bearing:
  absolutely · actually · basically · completely · essentially · fairly · quite · really
  · simply · somewhat · totally · very
  "It should be noted that" · "It is important to note that" · "It is worth mentioning that"
  "In terms of" · "With respect to" · "As far as X is concerned"

REPLACE (sourced pairs, plus a labelled technical extension):
  in order to → to              due to the fact that → because     on the ground that → because
  at this point in time → now   a number of → several / a few      a sufficient number of → enough
  is able to → can              be responsible for → must          on a monthly basis → monthly
  in the event that → if        prior to → before                  subsequent to → after
  has the ability to → can      make a determination → decide      perform an analysis of → analyze
  leverage → use                utilize → use                      facilitate → let / help

FLIP negatives to affirmatives: not different → similar · not often → rarely · did not
succeed → failed · not able to → cannot

EXPECTED COMPRESSION. The government worked example cuts "a 54 word sentence down to 22
words, with no loss of meaning" — about 60%. Expect similar on a first draft.

  BEFORE (54 words) "If the State Secretary finds that an individual has received a payment
  to which the individual was not entitled, whether or not the payment was due to the
  individual's fault or misrepresentation, the individual shall be liable to repay to State
  the total sum of the payment to which the individual was not entitled."
  AFTER (22 words)  "If the State Secretary finds that you received a payment that you
  weren't entitled to, you must pay the entire sum back."
```

## Sentence length and hedging

```
SENTENCE LENGTH — 25 words is a TRIGGER, and it is not a limit.
  At >= 25 words, run the structural test rather than shortening on reflex:
    count the pieces of information in the sentence that deserve emphasis;
    count the stress positions available (one per period, colon, semicolon);
    emphasis-worthy items > stress positions → the sentence is too long.
    Fix by ADDING stress positions (semicolon or colon after a complete main clause) or by
    removing items — whichever preserves the argument.
  CALIBRATION: a single English clause averages 12–15 words; scientific prose averages
  26–29 words per sentence, so the average technical sentence is already two clauses.
  CAVEAT, print it wherever the number appears: "We have seen 10-word sentences that are
  virtually impenetrable and … 100-word sentences that flow effortlessly." The operative
  definition is structural, not numeric. Set no Flesch-Kincaid or Gunning Fog target: those
  formulas take word length as a proxy for semantic difficulty and sentence length as a proxy
  for syntactic complexity, so the two inputs are exactly the two things a writer games.
  The validator emits the distribution as a number and nothing else —
  "sentences: n=214, mean 19.3, p90 31 words" — because no threshold on it is defensible.

  THE // DIAGNOSTIC, for any multi-clause sentence:
    1. Insert // at every point where a period could legally go.
    2. Every // that is not a real period, colon or semicolon marks a main clause that ended
       with no stress position; the reader discharged attention onto whatever sat there.
    3. Make it a period, a semicolon (two halves of one thought), or a colon (the second
       restates or exemplifies the first) — or move the stranded material.
    4. What precedes a colon or semicolon must stand alone as a complete sentence. That is
       what manufactures the mid-sentence stress position.

  PLACEMENT RULE, from the same source: a main clause says "stress something in me"; a
  qualifying clause and a phrase both say "do not stress me". So the finding, the root
  cause, the verdict, and the number that matters live in a MAIN clause, at its close.
  Burying "this drops writes under load" in a trailing "which…" clause is a structural error.

HEDGING — <= 1 hedge per 150 words, and one hedge per sentence at most.
  Validator id: copy.hedge.unbanded, warn tier, counted only outside [data-confidence].
  Basis: MEASURED — LLM output carries performed-hesitancy markers at about twice human
  density (0.114 vs 0.057, d = 0.72) and about 7.3 vs 4.6 complexity tokens per document.
  BANNED STACKS: "may potentially" · "could possibly" · "might arguably" · "it seems likely
  that" · "this could potentially suggest" · "generally tends to"
  CAVEAT — the distinction that keeps the cap from producing false confidence:
    performed: "This could potentially introduce some degree of latency in certain scenarios."
    genuine:   "I did not run this under load. At the 3k rps we saw in March I expect the
                lock to serialize writes, but that is untested."
  A genuine hedge names what was not checked and what would settle it. In this plugin the
  genuine form already has a home: the seven ICD 203 terms with printed bands, enforced by
  ev.conf and ev.band. The cap applies only to hedges OUTSIDE that markup.
```

## The passive-voice ruling

```
Do not ask "is this passive?" Ask "whose story is this sentence?"

USE ACTIVE when the actor is known, relevant, and is the entity the paragraph is about —
especially for responsibility and for actions your team took:
  "We rolled back the deploy at 03:22."   not "The deploy was rolled back at 03:22."
  "The retry loop swallows the 429."      not "The 429 is swallowed by the retry loop."

USE PASSIVE — it is CORRECT, not a lapse — when any of these hold:
  (a) The actor is unknown.
      "The row was deleted some time before 02:00; we have not identified the caller."
  (b) The actor is irrelevant to the point.
      "One hundred votes are required to pass the bill."
  (c) The affected thing is the paragraph's topic and must hold the topic slot.
      Q: "What happened to the data files?"  A: "They were uploaded to the server and then
      deleted." — the given information precedes the new information, which is exactly the
      constraint that governs topic position above.
  (d) One action follows another as a matter of law or policy, with no human actor.
      "If you do not pay the royalty, your lease will be terminated."

INCIDENT-WRITING NOTE. Before root cause is established, (a) and (c) are the normal case.
"The connection pool was exhausted at 03:14" is correct. Inventing an agent to satisfy an
active-voice rule fabricates a claim you cannot support — and in this plugin that fabricated
agent will be tagged data-claim="observed" and will pass ev.basis.

DO NOT BULK-CONVERT, AND THIS PLUGIN SHIPS NO PASSIVE DETECTOR. The common heuristic looks
for "to be" + past participle + "by", but "none of the elements of the heuristic is necessary
and all of them are jointly insufficient to reliably identify passives." It misfires on
locatives ("The participants were seated by the entrance"), on "to be" as main verb
("Python is a programming language"), on active perfect progressives ("The program had been
running all afternoon"), and it misses get-passives ("The assistant got fired by the lab PI").

AUTHORITY NOTE. Cite Ferreira (American Psychologist 2020, doi:10.1037/amp0000620),
the Federal Plain Language Guidelines, and the UNC Writing Center. Leave The Elements
of Style out of any argument against the passive: its showcase example is refuted in the
peer-reviewed literature (Pullum 2014, relayed by Ferreira), and Pullum identifies liberal
passive use in authors famed for style — including Strunk, White, and Orwell.
```

## The AI-prose tell table

Three parts. The EVIDENCE STATUS column is the point: it is what stops the plugin from shipping
folklore as fact.

**Part A — vocabulary.** Ratio = 2024 vs 2022 frequency in 15M PubMed abstracts, restricted to
the 407 words the authors annotated as STYLE (not content). Recomputed from the published
`yearly-counts.csv.gz` against a 2022 baseline; this reproduces the paper's own r=13.8 for
"underscores" and diverges for "delves" (47.8 here vs 28.0 published), because the authors use a
different counterfactual. Cite as "recomputed, 2022 baseline".

TIER 1 — MEASURED ≥5x. Hard ban. Each row ships its replacement.

| word (ratio) | evidence status | write instead |
|---|---|---|
| delves 47.8 · delved 18.5 · delving 10.3 · delve 9.7 | MEASURED | name the action: examines, measures, traces — or delete and state the finding |
| underscores 13.8 · underscoring 8.7 · underscore 6.8 · underscored 5.8 | MEASURED | delete; if it carried meaning, state the consequence: "X breaks Y", "this costs 40 ms" |
| showcasing 13.8 · showcases 4.8 · showcased 4.4 | MEASURED | shows, contains, or delete |
| meticulously 10.5 | MEASURED | delete, or give the actual procedure |
| surpassing 8.4 · surpasses 4.6 | MEASURED | beats, is faster than — with the number |
| commendable 8.3 | MEASURED | delete; say what is good and why |
| excels 7.7 | MEASURED | is faster at, handles X correctly |
| intricacies 7.6 · intricate 7.4 · intricately 5.7 | MEASURED | "complex" only if you then say complex in what way |
| garnered 6.1 | MEASURED | got, received, has |
| comprehending 5.7 | MEASURED | understanding |
| groundbreaking 5.7 | MEASURED | delete |
| encompassed 5.5 · encompassing 4.4 | MEASURED | includes, covers |
| emphasizing 5.4 | MEASURED | delete the participle tail entirely (Part B) |
| realm 5.0 | MEASURED | area, part of the system, or name it |
| renowned 4.9 · grappling 4.9 · necessitating 4.9 | MEASURED | delete · struggling with · so we had to |

TIER 2 — MEASURED 2x–5x. At most ONE occurrence per document, and two in a paragraph is over
budget by itself:

```
crucial 2.4 · insights 2.4 · notably 2.9 · additionally 2.1 · comprehensive 2.0 ·
exhibited 2.0 · enhance 2.0 · offering 4.7 · bolstering 4.6 · revolutioniz* 4.2 ·
advancements 4.1 · endeavors 4.1 · aligning/aligns 4.0 · fostering 3.9 · leveraging 3.9 ·
formidable 3.9 · aiding 3.9 · pivotal · robust · seamless · nuanced · multifaceted ·
tapestry · testament · landscape · interplay · streamline · harness · elucidate · unveil
```

```
REPEAT-COUNT CAP, cheaper and less damaging than a ban: the proportion of papers using
"underscore" six or more times rose by over 10,000% between 2022 and 2025. Repetition is a
stronger signal than presence. Cap ANY Tier-1 or Tier-2 word at one use per document.
Validator id: copy.slop.repeat, warn tier.

CLUSTER THRESHOLD — the real detector. Co-occurrence of "underscore" with "pivotal" rose
from r = 0.032 (2022) to r = 0.449 (2024); with "delve", 0.018 → 0.311. One "pivotal" is a
coin flip; four of these together is a signature. Validator id: copy.slop.cluster.
  0–2 distinct Tier-1+2 words → ship
  3–5 distinct                → rewrite the three highest-ratio occurrences
  6+ distinct                 → rewrite the opening and closing paragraphs from scratch
```

**Part B — sentence-level constructions.**

| construction | evidence status | replacement |
|---|---|---|
| "It's not X, it's Y" / "not just X but Y" / "Not A. Not B. Just C." | MEASURED — 6.3x human rate in some models | state the ranking as a claim with its evidence and drop the negated half |
| participle tail: ", underscoring/highlighting/emphasizing/showcasing/reflecting/demonstrating/ensuring/fostering/enabling/further …ing" | FOLKLORE (named by a community guideline; unmeasured) but 66% of measured 2024 excess style words were VERBS, which makes the -ing layer the right place to look | delete from the comma onward; if it held information, promote it to its own sentence with a number or a file:line |
| "serves as" / "stands as" / "is a testament to" / "plays a crucial role" / "underscores the importance of" / "marks a turning point" | FOLKLORE | "serves as" → "is". If "is" feels weak, the sentence had no content — replace it with a measurement, a path, or a count |
| "The result? Devastating." — two-to-four-word fragment answer | FOLKLORE, and it conflicts with measurement: see the do-not-ban list | keep the question, answer it in a full sentence |
| banned openers: "In today's fast-paced world" · "In an era of" · "In the ever-evolving landscape of" · "As organizations increasingly" · "With the rise of" · "This document provides a comprehensive overview of" · "Let's dive in" · "Let's break this down" · restating the request | FOLKLORE as strings, MEASURED as a zone — the AI-likeness shift is most pronounced in the first and fifth quintiles of a document, i.e. the introduction and the conclusion | the verdict sentence, with a number or a location (validator id `copy.opener`, error tier, position-anchored prefix match) |
| banned closers: "In conclusion," · "To sum up," · "Overall," · "Ultimately," · "Taken together," · "Despite these challenges," · "The path forward" · "I hope this helps!" | same | DELETE the final paragraph by default, then re-read. A closing block is permitted only if it contains a decision with an owner, an ordered action list with names, a risk not discussed above, an explicit open question, or a resolution beat that names what the SCQA Complication no longer costs the reader now that the verdict is known (see `report-structures.md` §The SCQA closer) — restating the verdict itself does not qualify (validator id `copy.closer`) |
| fractal summary: a summary at the top, per section, AND at the bottom | FOLKLORE | pick ONE level. In this plugin that level is the first screen; sections end on their last piece of evidence |
| bold-first bullets: `**Security**: …` repeated | FOLKLORE for the pattern; MEASURED that markdown structure is fully suppressible by instruction, unlike em dashes | either a real sentence per item, or a two-column table where the label column is a genuine category |

**Part C — structural tells, as budgets.**

| tell | budget | evidence status |
|---|---|---|
| em dash (U+2014) in prose | ≤ 4 per 1,000 words; two in one paragraph is over budget | MEASURED as a population signal, and refused as a detector. Human published essays: mean 3.23/1k, median 3.83/1k, range 0.33–17.12. Twain sits at 10.13/1k, above GPT-4.1 under suppression at 9.10/1k. Pre-registered medRxiv analysis (n=69,632): Discussion-section prevalence rose 4.23% → 11.58% (+7.35pp, 95% CI 6.94–7.77), and its authors state plainly it "is a population-level indicator, not a per-paper detector". Apply the budget to narrative prose only; exempt code, table cells, captions, ranges, quotations |
| tricolon | ≤ 4 per document | MEASURED — human expert 3.73, human non-expert 4.87, LLM 7.13, d = 0.95 |
| lists with exactly three items | ≤ 50% of all lists | DERIVED from the tricolon finding; the 50% is ours |
| hedges outside data-confidence markup | ≤ 1 per 150 words | MEASURED at 2x human density (0.114 vs 0.057, d = 0.72) |
| section length | longest ≥ 2x shortest | DERIVED from the uniformity finding; the 2.0 is ours |
| paragraph length | coefficient of variation ≥ 0.45; at least one paragraph under 25 words and one over 90 | DERIVED; the 0.45 is ours |
| device spacing | never the same rhetorical device in two consecutive paragraphs; at least two paragraphs carry no device at all | DERIVED from the measured finding that rhetorical devices are distributed significantly MORE uniformly in LLM documents (normalized entropy 0.753 LLM vs 0.666 human expert, d = 0.74) |
| heading grammar | vary the grammatical shape across headings | DERIVED |

**The do-not-ban list — ten items, with reasons.** This is what stops the correction from
producing stilted output.

```
1. EM DASHES. Budget them; a ban is the wrong instrument. Human range 0.33–17.12/1k; Twain 10.13
   exceeds GPT-4.1 under suppression at 9.10. And note: a generic "no markdown" instruction
   does NOT remove them (Claude Opus 4.6 drops 9.09 → 0.19 but GPT-4.1 only 10.62 → 9.10),
   which is exactly why a countable budget beats a stylistic wish.
2. THE RULE OF THREE. Human experts use 3.73 tricolons per document. Cap at 4; ban only the
   equal-length, identically-punctuated adjective stack.
3. RHETORICAL QUESTIONS AND SELF-CORRECTION. Humans use erotema at 2.4x the LLM rate
   (5.55 vs 2.28, d = 0.73) and correctio at 2.4x (0.40 vs 0.17). Banning them moves prose
   FURTHER from human writing on a measured axis. Permit 1–3 genuine questions followed by
   real answers. Ban only the staccato fragment answer.
4. HIGH-FREQUENCY "EXCESS" WORDS WITH LOW RATIO. Ban on RATIO, never on absolute gap. By
   gap, the top excess words are: potential (+5.6pp, ratio 1.3x), this (1.1x), findings
   (1.4x), these (1.1x), research (1.3x), while (1.2x), through (1.2x), into (1.2x), various
   (1.4x), conducted (1.3x), analysis, approach, impact. These are ordinary English. A
   plugin that bans them produces stilted output for zero detection benefit.
5. PLAIN OR SIMPLE VOCABULARY IS NOT THE FIX. Prompting human essays to "simplify word
   choices as if written by a non-native speaker" raised AI-misclassification from 5.19% to
   56.65%. Low perplexity — restricted lexical variety — is the machine signature, not fancy
   words. The instruction is "be specific and varied", NOT "use short common words".
6. TECHNICAL TERMS OF ART. "robust" about error tolerance, "comprehensive" about test
   coverage, "critical path", "delve" in a database context, "landscape" in ML loss-landscape,
   "realm" in Kerberos, "leverage" in finance. Domain meaning outranks the blocklist, and
   `allow: copy.slop.t1` in the contract comment is where a deliberate one is declared.
7. TRANSITIONS PER SE. "However", "Additionally", "Moreover" are not defects; opening every
   third paragraph with one is. Enforce variety, not abstinence — zero transitions reads as
   choppy, which is its own tell.
8. BULLET LISTS AND HEADINGS. Structure is correct for a review or a comparison. The defect
   is symmetric structure, not structure.
9. DO NOT SHIP A BARE BLOCKLIST. Instructing a model to avoid a vocabulary list "has limited
   efficacy and may induce a backfire effect due to the Pink elephant problem". Every banned
   item in this file ships with the positive pattern to write instead. That is a hard
   requirement on anyone extending these tables.
10. FRAMING. The goal is a document a colleague trusts, not one that beats a detector.
    Detectors carry a 61.22% false-positive rate against non-native English writers, all
    seven tested flagged 89 of 91 TOEFL essays at least once, and a single self-edit prompt
    dropped detection of genuinely AI-written text from 100% to 13%. Never state a rule in
    this plugin as "so it won't be detected as AI".
```
