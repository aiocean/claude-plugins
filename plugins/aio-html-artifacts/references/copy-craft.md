# Copy craft — the verdict sentence, headings, paragraphs

**Settles:** the one sentence the artifact defends, every heading in it, the internal shape of
a body paragraph, and which language the reader is addressed in. This is the compose pass.

**Elsewhere, each routed from the SKILL.md that sent you here:** captions for a figure, chart,
diagram, table, code excerpt or screenshot are in `references/captions.md`; button labels,
error text, empty and busy states and export labels are in `references/microcopy.md`; the
draft-tightening pass — nominalization, sentence length, hedging, passive voice, and the
AI-prose tell table — is in `references/copy-delint.md`. Those three load on their own
triggers, so writing a report with no figures and no controls reads this file alone.

**Partial read:** each `##` heading below is self-contained. Reading one section gives you
that rule complete and tells you nothing about the other three.

Everything here is shared across the four genres, because all four write prose. Every word list
and every regex below is compiled into `scripts/lib/checks-copy.mjs`; the list here and the list
there match token for token, so the reference and the gate cannot drift.

Evidence labels travel with each rule. **MEASURED** — a published study backs the number.
**DERIVED** — the finding is measured, the threshold is ours, from n=6 calibration on this
plugin's own examples. **FOLKLORE** — named by a curated community list, counted in no corpus.
A threshold presented as research when it is a guess is the defect this file exists to remove.

Validator ids this file's rules carry: `copy.verdict`, `copy.heading.stock`.

## Contents

- [The verdict sentence](#the-verdict-sentence)
- [The claim heading](#the-claim-heading)
- [Paragraph architecture](#paragraph-architecture)
- [Write it in the reader's language](#write-it-in-the-readers-language)

## The verdict sentence

One sentence, on the first screen, that the whole artifact defends. Validator id: `copy.verdict`.

```
PATTERN
  <specific subject> <verdict verb> <specific object> <because | so> <consequence or driver>.
  [<ICD 203 term> (<lo>-<hi>%).]

VERDICT VERBS — the sentence contains exactly one:
  ship · do not ship · block · merge · revert · adopt · reject · migrate · keep · delete
  · raise · lower · approve · request changes · the root cause is · we will · choose

CONSTRAINTS
  - one clause plus at most one because-clause; <= 30 words
  - the subject is the specific thing, never the category ("payments-api", not "the service")
  - the object carries direction and magnitude ("tripled", "8.4x", "from 12 to 340")
  - it is falsifiable from the evidence directly beneath it
  - it appears ONCE — first screen. Repeating it in a closing summary is the fractal-summary tell.
  - the confidence term is one of the seven ICD 203 words already enforced by ev.conf, and
    the band prints as literal text (ev.band)

FIVE EXAMPLES ACROSS GENRES
  code review  "Do not merge #482: the session token comparison at auth/session.go:141 uses
                == instead of subtle.ConstantTimeCompare, which leaks the token byte by byte."
  incident     "Checkout was down 47 minutes because pricing has no timeout on its call to
                tax-api (client.go:23), so a 30s upstream held all 200 pool connections."
  decision     "We will adopt Temporal for background jobs, because durable multi-day
                workflows are the binding constraint and nothing else provides them without
                us writing a scheduler. Likely (55-80%)."
  status       "The migration will miss the Q3 date by about five weeks unless a second
                engineer joins the session-store rewrite this week."
  explainer    "Every write reaches Postgres through the queue, so a queue outage silently
                degrades the system to read-only."

BANNED AS A VERDICT — these are topic sentences wearing a verdict's name:
  "This review identified several issues…"      "There are a few things worth discussing…"
  "Overall the code is well written, but…"      "This document provides an overview of…"
  "The migration is progressing…"               "It is recommended that consideration be given to…"
```

## The claim heading

```
FORM. Every heading is a sentence a well-informed colleague could reply "that's false" to.
A heading nobody could disagree with carries no information.

FOUR LICENSED SUB-FORMS — pick one per heading:
  STATE   "<subject> <is/was> <property>"          "The retry path is not idempotent"
  CHANGE  "<subject> <verb> <from X to Y>"         "p99 rose from 180 ms to 1.4 s after v4.2"
  CAUSE   "<cause> caused/explains <effect>"       "Redis eviction, not the planner, caused it"
  ACT     "<agent> should <verb> <object> because" "Ship behind a flag; rollback takes 40 min"

HARD CONSTRAINTS
  - one clause; no colon-splice ("Caching: a deep dive" is banned)
  - <= 14 words for a section heading; <= 15 for a figure or table caption title
    (the 14 is DERIVED, our n=6 calibration; the assertion form behind it is MEASURED)
  - the first 11 characters carry the information-bearing subject
  - no terminal period on a heading; terminal period on a caption

BANNED OPENERS — all fail the first-11-characters test:
  Introducing… · Understanding… · A look at… · Exploring… · Deep dive into… · Thoughts on…
  · Notes on… · How we… · Why we… · The importance of… · Everything about…

BEFORE / AFTER
  ## Background            → ## The retry loop was added in 2023 to absorb an upstream that no longer exists
  ## Performance           → ## p99 triples above 200 RPS because every request re-parses the config
  ## Findings              → ## Three blockers, all in the auth middleware
  ## Alternatives          → ## Postgres LISTEN/NOTIFY was rejected: it drops messages with no listener
  ## Conclusion            → ## Ship it behind a flag; remove the flag after one clean week of p99
  ## Next Steps            → ## Alice reverts #4821 today; Bob adds the regression test before Friday
```

**The title-evidence alignment test** — run per heading and per chart, in this order, stopping at
the first failure.

```
1 NAMED FEATURE   Which single feature of the adjacent evidence does the heading name?
                  Nothing nameable → the heading is decoration. Rewrite or delete.
2 PROMINENCE      Is that feature the most visually prominent thing in the evidence?
                  No → fix the EVIDENCE (zoom, crop, re-sort, annotate, change mark type).
                  Do not assert harder. When caption and chart diverge, readers discard the caption.
3 SELECTIVE SLANT Does the evidence show a second side the heading omits?
                  Yes → name it in the heading, or put the counter-evidence in the adjacent sentence.
                  This is the subtlest slant and the most effective one; scrutinise it hardest.
4 MISCUED SLANT   Does the evidence emphasise one thing while the heading asserts another?
                  Yes → re-encode the evidence.
5 CONTRADICTORY   Does the heading assert something the evidence does not contain at all?
                  Yes → BLOCK. Add the evidence or delete the claim. There is no third option.
6 LEVEL CHECK     Is the heading making a causal claim while the evidence supports only a
                  statistic or a trend? Yes → demote the heading and put the causal story in
                  a separate, marked sentence.
7 HEDGING LADDER  When the evidence is thinner than the claim, weaken the HEADING, and leave
                  the evidence alone. Drop exactly as far as the evidence reaches:
                    "X caused Y"                      needs a controlled comparison or a bisect
                    "X is the most likely cause of Y" needs ruled-out alternatives, listed
                    "X coincides with Y"              needs two timestamps
                    "X and Y both changed on <date>"  needs the raw observation

WHY STEP 7 EXISTS. In the one study that measured it, deliberately misaligned titles cost
the TITLE about 0.72 credibility points on a 7-point scale and cost the CHART ITSELF about
0.65 — an overreaching heading damages the evidence standing next to it. And 72–87% of
readers rated the deliberately slanted material as neutral, so the reader will not catch
it. You are the only check. (Kong, Liu & Karahalios, CHI 2019, doi:10.1145/3290605.3300576.
The paper is real and closed-access; these figures could not be re-verified from the PDF —
treat the direction as sound and the magnitudes as unconfirmed.)
```

**The container-heading list.** A heading whose entire text, after trimming a trailing colon,
equals one of these is a container, not a claim. This is the list `copy.heading.stock` compiles;
the list, not the count, is the contract.

```
STOCK LIST (62 entries)

Overview · Introduction · Intro · Background · Context · Motivation · Summary · Conclusion
· Conclusions · Analysis · Details · Detail · Discussion · Results · Findings · Methodology
· Methods · Method · Approach · Architecture · Implementation · Considerations · Consideration
· Next Steps · Recommendations · Recommendation · Appendix · Scope · Goals · Objectives
· Takeaways · Key Takeaways · Notes · Misc · Miscellaneous · Other · About · Purpose
· Problem · Solution · Design · Testing · Performance · Security · Risks · Tradeoffs
· Trade-offs · Options · Data · Metrics · Timeline · Status · Q&A · Questions · Learnings
· Lessons Learned · Future Work · Related Work · Deep Dive · Highlights · The Bottom Line · TL;DR

FALSE-POSITIVE RISK, stated honestly: exact-whole-string matching has near-zero false
positives on English prose headings. Two real exemptions exist and both are declared, not
guessed: (a) a fixed-format spine — DECISION RECORD's "Context and Problem Statement",
RFC-shaped "Security Considerations" — where the section name IS the standard and the claim
moves into the section's first sentence; (b) a Diátaxis REFERENCE block, whose style is
"austere and uncompromising … neutrality, objectivity, factuality", where an assertion
headline over an API table is a category error. Mark both with data-heading="reference", on the
heading itself or on the <section>, <article>, <aside> or <nav> that holds it. The nearest of
those four answers for the heading, so a nested section declares its own and the attribute on
<main> or a wrapper <div> exempts nothing — the hatch marks one block, not the document.

The weaker variant — "heading contains no finite verb" — is refused as a check. It
misfires on imperative headings ("Rotate the key before Friday"), on numeric headings
("47 minutes, 12,400 users"), and on every non-English heading. Use the truth-value
question instead: could a colleague reply "that's false"?
```

## Paragraph architecture

Four executable instructions, each with one real rewrite pair. Ship the qualified wording, not
the folk simplification.

```
(a) TOPIC POSITION — the slot the reader reads as "whose story this is".
    INSTRUCTION: before writing a sentence, decide which already-known entity it continues,
    and put that entity first.
    "Readers expect a unit of discourse to be a story about whoever shows up first."
      BEFORE  "According to client.go:88, the retry budget allows four attempts."
      AFTER   "The retry budget allows four attempts; the fifth request fails without ever
               reaching the server. (client.go:88)"
      WHY     the paragraph is about the retry budget, so the budget takes the topic slot
               and the anchor stops occupying it.

(b) STRESS POSITION — the slot the reader emphasises, which "coincides with the moment of
    syntactic closure", i.e. a period, a colon, or a semicolon.
    INSTRUCTION: end every sentence on the one new thing you want remembered. Keep qualifiers,
    citations, hedges, already-named file paths and prepositional phrases of setting out of
    that slot.
      BEFORE  "The pool was exhausted at 03:14 according to the metrics dashboard."
      AFTER   "By 03:14 the pool was exhausted."
    COROLLARY: a colon or semicolon manufactures an EXTRA stress position mid-sentence, so
    a long sentence is often fixed by punctuation rather than by splitting.

(c) OLD-TO-NEW FLOW — the qualified rule, not the folk one.
    The naive form ("old info first, new info last") is unimplementable — all information is
    either old or new, so the middle of the sentence is also full of both. The executable
    form is: "Put in the topic position the old information that links backward; put in the
    stress position the new information you want the reader to emphasize."
    CHAIN RULE: the stress of sentence N becomes the topic of sentence N+1.
      "The scheduler retries failed jobs up to five times. Those five retries all fire
       within one second, because the backoff constant was left at zero. A zero backoff
       turns a single slow dependency into a synchronized burst. That burst is what
       saturated the connection pool at 03:14."
    TEST: read the sentence openings alone — scheduler / those five retries / a zero backoff
    / that burst. A chain with no gaps. If sentence N+1's opening contains nothing from
    sentence N, you have either omitted a step or changed the subject. Supply the missing
    sentence; "Therefore" and "Additionally" paper over the gap and leave it there.
    (Misplaced old and new information is, in the authors' clinical experience, "the No. 1
     problem in American professional writing today".)

(d) SUBJECT-VERB PROXIMITY.
    "Anything of length that intervenes between subject and verb is read as an interruption,
     and therefore as something of lesser importance."
    INSTRUCTION: count words between the grammatical subject and its verb. Above about eight,
    the intervening material is either important — give it its own clause or its own stress
    position — or it is not; delete it. Leaving it in the gap guarantees the reader discounts it.
      BEFORE  "The token refresh handler, which was introduced in v2.3 to work around the
               upstream provider's 15-minute expiry and which runs on every request
               regardless of cache state, blocks the event loop."
      AFTER   "The token refresh handler blocks the event loop. It was introduced in v2.3 to
               work around the upstream provider's 15-minute expiry, and it runs on every
               request regardless of cache state."

THE PARAGRAPH AUDIT — run on your own draft, four list-extractions:
  TOPIC STRING  first 3-5 words of each sentence. No entity repeating and nothing linking →
                the paragraph tells several stories. Pick one.
  VERB LIST     the main verb of each sentence. Reading is/are/has/was → the actions are
                hidden in nouns; see the next section.
  STRESS STRING last 3-5 words of each sentence. This list must read as the paragraph's
                argument. Reading as citations or hedges → the emphases are misplaced.
  ONE POINT     state the paragraph's point in one sentence. Needing "and" → split.

CAVEAT, stated wherever these appear: their own authors forbid treating them as rules.
"Slavish adherence to them will succeed no better than has slavish adherence to avoiding
split infinitives or to using the active voice instead of the passive." Target compliance
most of the time, and violate deliberately for emphasis — a short, front-loaded verdict
sentence that breaks old-to-new flow because it IS the headline is correct.
```

## Write it in the reader's language

```
When the artifact will be read in Vietnamese, translated, or read by non-native English
speakers, these rules take precedence over the terseness rules above.

SOURCE STRINGS
  - Sentence case only. Title Case does not exist in Vietnamese: "In Vietnamese, only the
    first character in a sentence is capitalized", and Microsoft's Vietnamese style guide
    marks "Chọn Tất Cả" as Don't against "Chọn tất cả" as Do. An English source string in
    Title Case produces wrong Vietnamese when translated literally.
  - Never ALL CAPS. Vietnamese stacks tone marks above and below vowels (ế, ộ, ữ); uppercase
    with tight line-height clips or collides them.
  - Subject-verb-object, present tense, active voice. Avoid -ing forms — a translator cannot
    tell gerund from participle from adjective.
  - KEEP the small words: "then", "a", "the", "to", "that". Repeat the verb, the subject and
    the list marker rather than eliding. Terseness that reads as elegant English becomes
    ambiguous input.
  - Ban words with two meanings: Once → After · Since → Because · right → correct.
  - One concept, one term, one capitalization, everywhere in the document.
  - No contractions, idioms, humour, or culture-bound metaphors. No abbreviations of
    user-facing words ("application", not "app") unless the abbreviation is the term of art.
  - One whole string per message, and no sentence assembled from concatenated fragments.

LAYOUT, driven by measured expansion — the shortest strings expand the MOST:
  ≤10 chars → 200–300% · 11–20 → 180–200% · 21–30 → 160–180% · >70 → 130%.
  So a six-character button label may need three times its box.
  - No fixed-width buttons, tabs, table headers, or badges. No single-line ellipsis on a label.
  - line-height ≥ 1.5 and no `overflow: hidden` on label containers — the diacritics need the
    vertical room. This is consistent with the existing a11y.lineheight floor.
  - Vietnamese words are multi-syllable and space-separated ("đăng nhập", "tải xuống"), so a
    greedy break splits a word. Wrap multi-syllable labels in a nowrap span.
  (The expansion table is measured and length-based; it does not break out Vietnamese. The
   diacritic and word-break points are reasoned from the writing system, not measured.)

VIETNAMESE OUTPUT
  - Errors in declarative form; always "lỗi" for error: "An error occurred" → "Có lỗi."
  - Collapse English synonym families to one Vietnamese phrase: Cannot find / Could not find
    / Unable to find / Unable to locate → "Không tìm thấy…".
  - Drop "bạn" where the sentence still parses: "Nếu bạn vẫn còn sự cố" → "Nếu còn sự cố".
    Second person is heavier in Vietnamese than in English.
  - Use short everyday verbs: cancel → "hủy", enter → "nhập".
  - `<html lang="vi">` — doc.lang already enforces a real BCP-47 tag; use the right one.
```
